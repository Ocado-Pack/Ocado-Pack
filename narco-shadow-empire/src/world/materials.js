// ctx.mats - the PBR material library (docs/ARCHITECTURE.md section 5). All textures are procedural (texgen.js).
//
//   const mats = createMaterials(ctx);
//   mats.get('asphalt')   mats.get('stucco', { color: 0x7fa0b0 })   mats.get('metalCorrugated', { rust: 0.8 })
//   mats.paint(0x2c3136, { roughness: 0.6, metalness: 0.7 })   mats.neon(0xff2d95)   mats.glass()
//   mats.facade('brick', { seed: 3 })   mats.sign('FARMACIA', { color: '#7dffb0' })
//
// - material.userData.meters = real-world size of one texture repeat: builders divide their UVs (in metres) by it.
// - Wettable materials follow ctx.env.wetness through one shared uniform: darker, glossier, and on flat ground
//   mirror-like puddles appear (world-space noise, so they never repeat with the texture).
// - Night-only emissives (lit windows, lit signs) follow ctx.env.nightFactor.
import * as THREE from 'three';
import { createTextures } from './textures.js';

const WET_PARS = /* glsl */`
  varying vec3 vWetPos; varying float vWetUp; uniform float uWet;
  float wetHash( vec2 q ) { vec3 q3 = fract( vec3( q.xyx ) * 0.1031 ); q3 += dot( q3, q3.yzx + 33.33 ); return fract( ( q3.x + q3.y ) * q3.z ); }
  float wetNoise( vec2 q ) { vec2 i = floor( q ), f = fract( q ); f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( wetHash( i ), wetHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( wetHash( i + vec2( 0.0, 1.0 ) ), wetHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }`;

/** name -> [texgen kind, texgen options, {wet: [puddles 0-1, darken], ...material parameters}] */
const NAMES = {
  asphalt: ['asphalt', {}, { wet: [1, 0.58] }],
  sidewalk: ['sidewalk', {}, { wet: [0.45, 0.68] }],
  curb: ['concrete', { color: 0xa8a59e, stains: 0.3 }, { wet: [0.2, 0.7] }],
  concrete: ['concrete', {}, { wet: [0.3, 0.7] }],
  concreteStained: ['concrete', { stains: 1, color: 0x85837d }, { wet: [0.3, 0.7] }],
  concreteFloor: ['concrete', { color: 0x6f716f, stains: 0.2 }, { roughness: 0.55 }],
  brick: ['brick', { palette: 'red' }, { wet: [0, 0.75] }],
  brickDark: ['brick', { palette: 'dark' }, { wet: [0, 0.75] }],
  brickPainted: ['brick', { palette: 'painted' }, { wet: [0, 0.8] }],
  stucco: ['stucco', {}, { wet: [0, 0.8] }],
  metalCorrugated: ['corrugated', {}, { wet: [0, 0.85] }],
  metalCorrugatedRust: ['corrugated', { rust: 0.9, color: 0x6b6f6a }, { wet: [0, 0.85] }],
  woodCrate: ['wood', { boards: 5 }, {}],
  woodPlank: ['wood', { boards: 3, color: 0x7a5c3c }, { wet: [0.15, 0.7] }],
  chainlink: ['chainlink', {}, { alphaTest: 0.5, side: THREE.DoubleSide }],
};
const PLAIN = {   // untextured: [colour, roughness, metalness]
  steel: [0x9aa0a6, 0.35, 0.9], metalDark: [0x2c3136, 0.55, 0.8], chrome: [0xffffff, 0.06, 1], rubber: [0x141414, 0.95, 0], plastic: [0x30343a, 0.5, 0], paper: [0xe9e4d6, 0.9, 0],
};

export function createMaterials(ctx) {
  const tex = createTextures(ctx);
  const cache = new Map(), nightMats = [], wetU = { value: 0 };
  let nightOverride = null, lastNight = -1;

  /** Make a material react to wetness. puddles 0-1 = how readily water pools on it; darken = albedo factor when soaked. */
  function wettable(m, puddles, darken) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWet = wetU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWetPos; varying float vWetUp;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vWetPos = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
        #else
          vWetPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        #endif
        vWetUp = normalize( mat3( modelMatrix ) * objectNormal ).y;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${WET_PARS}`)
        .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= mix( 1.0, ${darken.toFixed(3)}, uWet );`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float wetPuddle = 0.0;
        ${puddles > 0 ? `{
          float wn = wetNoise( vWetPos.xz * 0.21 ) * 0.62 + wetNoise( vWetPos.xz * 0.83 + 7.0 ) * 0.28;
          #ifdef USE_ROUGHNESSMAP
            wn += texture2D( roughnessMap, vRoughnessMapUv ).r * 0.1;
          #endif
          float edge = ${(0.64 - 0.14 * puddles).toFixed(3)};
          wetPuddle = smoothstep( edge, edge + 0.09, wn ) * smoothstep( 0.25, 0.8, uWet ) * smoothstep( 0.85, 0.98, vWetUp );
        }` : ''}
        roughnessFactor = mix( roughnessFactor * mix( 1.0, 0.5, uWet ), 0.03, wetPuddle );`)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize( mix( normal, nonPerturbedNormal, wetPuddle ) );');
    };
    m.customProgramCacheKey = () => `narco-wet-${puddles}-${darken}`;
    m.userData.wettable = true;
    return m;
  }
  const nightOnly = (m, base) => { m.userData.nightBase = base; m.emissiveIntensity = base * Math.max(0, lastNight); nightMats.push(m); return m; };
  const cached = (key, make) => { let m = cache.get(key); if (!m) { m = make(); m.name = m.name || key; cache.set(key, m); } return m; };

  const mats = {
    textures: tex,
    /** @param {string} name see NAMES / PLAIN above  @param {object} [o] texture options (color, palette, rust, seed ...) */
    get(name, o = {}) {
      if (PLAIN[name]) { const [c, r, mt] = PLAIN[name]; return mats.paint(o.color === undefined ? c : o.color, { roughness: r, metalness: mt }); }
      const def = NAMES[name];
      if (!def) { console.warn(`[mats] unknown material "${name}"`); return mats.paint(0xff00ff); }
      return cached(name + JSON.stringify(o), () => {
        const [kind, base, p] = def, maps = tex.maps(kind, { ...base, ...o }), { wet, ...params } = p;
        const m = new THREE.MeshStandardMaterial({ map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.ormMap, metalnessMap: maps.ormMap, roughness: 1, metalness: 1, ...params });
        m.userData.meters = maps.meters;
        return wet ? wettable(m, wet[0], wet[1]) : m;
      });
    },
    /** Plain painted / metal surface without textures. */
    paint(color, o = {}) {
      const r = o.roughness === undefined ? 0.6 : o.roughness, mt = o.metalness || 0;
      return cached(`paint|${color}|${r}|${mt}`, () => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: mt }));
    },
    /** Self-lit surface that feeds the bloom (tubes, lamp heads, screens). nightOnly: fades with the night factor. */
    emissive(color, intensity = 5, o = {}) {
      return cached(`emissive|${color}|${intensity}|${!!o.nightOnly}`, () => {
        const m = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
        return o.nightOnly ? nightOnly(m, intensity) : m;
      });
    },
    neon(color, intensity = 5.5) { return mats.emissive(color, intensity); },
    glass(o = {}) {
      const tint = o.tint === undefined ? 0x8fb0c0 : o.tint, opacity = o.opacity === undefined ? 0.32 : o.opacity;
      return cached(`glass|${tint}|${opacity}`, () => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.06, metalness: 0, transparent: true, opacity, envMapIntensity: 1.6, depthWrite: false }));
    },
    /** A whole building face as one material: wall, window grid, balconies; the lit windows glow at night. */
    facade(style = 'stucco', o = {}) {
      return cached('facade|' + style + JSON.stringify(o), () => {
        const maps = tex.maps('facade', { style, ...o });
        const m = new THREE.MeshStandardMaterial({ map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.ormMap, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: maps.emissiveMap });
        m.userData.meters = maps.meters;
        return nightOnly(wettable(m, 0, 0.82), 2.4);
      });
    },
    /**
     * Sign with text. lit: glows (always, or only at night with nightOnly). Texture options: see textures.text.
     * @param {string|string[]} text @param {{lit?:boolean, nightOnly?:boolean, intensity?:number, [k:string]:any}} [o]
     */
    sign(text, o = {}) {
      const { lit = true, nightOnly: night = false, intensity = 3, ...topts } = o;
      return cached('sign|' + JSON.stringify([text, o]), () => {
        const map = tex.text(text, { background: '#0b0d10', ...topts });
        const m = new THREE.MeshStandardMaterial({ map, roughness: 0.5, emissive: lit ? 0xffffff : 0x000000, emissiveMap: lit ? map : null, emissiveIntensity: lit ? intensity : 0 });
        m.userData.aspect = map.userData.aspect;
        return lit && night ? nightOnly(m, intensity) : m;
      });
    },
    /** Unlit printed label (placards, tags, documents in the world): dark text on a pale card by default. */
    label(text, o = {}) { return mats.sign(text, { lit: false, color: '#1b1d20', background: '#e9e4d6', border: '#1b1d20', ...o }); },

    /** Force the night factor (tests, harness); null follows ctx.env again. */
    setNightFactor(v) { nightOverride = v === null || v === undefined ? null : Math.min(1, Math.max(0, v)); },
    get wetness() { return wetU.value; },
    update() {
      const env = ctx.has('env') ? ctx.env : null;
      wetU.value = env ? env.wetness : 0;
      const n = nightOverride !== null ? nightOverride : env ? env.nightFactor : 1;
      if (Math.abs(n - lastNight) > 0.004) { lastNight = n; for (const m of nightMats) m.emissiveIntensity = m.userData.nightBase * n; }
    },
    stats: () => ({ materials: cache.size, nightOnly: nightMats.length, ...tex.stats() }),
    dispose() { for (const m of cache.values()) m.dispose(); cache.clear(); nightMats.length = 0; tex.dispose(); },
  };
  mats.update();
  ctx.register('mats', mats, { order: 58, runWhenPaused: true });
  return mats;
}
