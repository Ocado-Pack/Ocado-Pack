// ctx.weather - rain streaks, ground splashes and pooled particle emitters (docs/ARCHITECTURE.md section 5).
// Drives itself from ctx.env (rain amount, wind, light colours, fog) and ctx.zones.indoor; three draw calls in total.
//
//   const weather = createWeather(ctx);
//   const steam = weather.addEmitter({ type: 'steam', position: [x, y, z] });   steam.setEnabled(false);  steam.remove();
//   weather.setLights([{ position, color, intensity, distance }, ...]);   // lamps that light the rain (4 nearest are used)
//
// Rain: a box of instanced streaks that wraps around the camera and is animated entirely in the vertex shader, so the
// drops stay put in the world while the camera moves. Splashes and particles are simulated on the CPU in typed arrays
// (no per-frame allocation). Without a renderer every method is a safe no-op.
import * as THREE from 'three';
import { clamp01 } from '../core/util.js';

const MAX_STREAKS = 12000, BASE_STREAKS = 9000;       // streaks at rainDensity 1 and rain 1
const MAX_SPLASHES = 700, BASE_SPLASHES = 520, SPLASH_LIFE = 0.34;
const MAX_PARTICLES = 560, BASE_PARTICLES = 420;
const BOX = [30, 22, 30];                              // metres of rain volume around the camera
const MAX_LIGHTS = 4;

/** Defaults per emitter type. size / life are [start, end] and [min, max]; rise in m/s; rate in particles per second. */
const TYPES = {
  steam: { life: [1.8, 3.0], size: [0.3, 1.5], alpha: 0.2, rise: 0.9, spread: 0.22, windK: 0.35, gravity: 0, color: 0xdfe6ee, rate: 9, radius: 0.2 },
  smoke: { life: [3.5, 6.0], size: [0.6, 3.2], alpha: 0.34, rise: 1.5, spread: 0.3, windK: 0.9, gravity: 0, color: 0x3a3c40, rate: 6, radius: 0.3 },
  dust: { life: [4.0, 8.0], size: [0.025, 0.04], alpha: 0.6, rise: 0.02, spread: 0.07, windK: 0.04, gravity: 0, color: 0xffe9c4, rate: 14, radius: 3 },
  spray: { life: [0.5, 0.9], size: [0.12, 0.5], alpha: 0.3, rise: 2.4, spread: 1.2, windK: 0.3, gravity: 6, color: 0xcfe0ee, rate: 30, radius: 0.15 },
};

const LIGHTS_GLSL = /* glsl */`
  uniform vec3 uLightPos[ ${MAX_LIGHTS} ];
  uniform vec4 uLightCol[ ${MAX_LIGHTS} ];              // rgb x intensity, w = cut-off distance
  vec3 lampLight( vec3 wp ) {
    vec3 sum = vec3( 0.0 );
    for ( int i = 0; i < ${MAX_LIGHTS}; i ++ ) {
      vec3 l = uLightPos[ i ] - wp;
      float d2 = dot( l, l ), r = uLightCol[ i ].w;
      float cut = clamp( 1.0 - ( d2 * d2 ) / ( r * r * r * r ), 0.0, 1.0 );
      sum += uLightCol[ i ].rgb * cut * cut / ( 1.0 + d2 );
    }
    return sum;
  }`;

const RAIN_VERT = /* glsl */`
  attribute vec4 aSeed;
  uniform vec3 uCenter, uBox, uAmbient;
  uniform vec2 uWind, uDrift;
  uniform float uFall, uLength, uWidth, uPixel, uOpacity, uLampGain;
  varying vec2 vUv; varying vec3 vCol; varying float vAlpha;
  ${LIGHTS_GLSL}
  void main() {
    float speed = 8.0 + floor( aSeed.w * 9.0 ) * 0.5;              // 8 .. 12 m/s in half steps: every fall repeats within uFall's period
    vec3 vel = vec3( uWind.x, - speed, uWind.y );
    vec3 fallen = vec3( uDrift.x, - speed * uFall, uDrift.y );     // wind drift is accumulated on the CPU, so gusts never make the rain jump
    vec3 rel = mod( aSeed.xyz * uBox + fallen - uCenter + 0.5 * uBox, uBox ) - 0.5 * uBox;   // wrap around the camera
    vec3 head = uCenter + rel, dir = normalize( vel );
    vec3 p = head - dir * uLength * ( 0.7 + 0.6 * fract( aSeed.w * 7.31 ) ) * ( 1.0 - position.y );
    vec3 toCam = cameraPosition - p;
    float dist = length( toCam );
    float width = max( uWidth, uPixel * dist * 0.75 );             // never thinner than about 1.5 pixels ...
    p += normalize( cross( dir, toCam ) ) * position.x * width;
    vec2 e = abs( rel.xz ) / ( 0.5 * uBox.xz );
    vAlpha = uOpacity * ( uWidth / width )                         // ... and dimmer instead, so far rain does not turn to noise
      * ( 1.0 - smoothstep( 0.72, 1.0, max( e.x, e.y ) ) ) * smoothstep( 0.8, 3.0, dist );
    vCol = uAmbient + lampLight( head ) * uLampGain;
    vUv = position.xy;
    gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
  }`;
const RAIN_FRAG = /* glsl */`
  varying vec2 vUv; varying vec3 vCol; varying float vAlpha;
  void main() {
    float across = 1.0 - abs( vUv.x );
    float along = smoothstep( 0.0, 0.3, vUv.y ) * ( 1.0 - smoothstep( 0.8, 1.0, vUv.y ) );
    gl_FragColor = vec4( vCol, across * across * along * vAlpha );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const SPLASH_VERT = /* glsl */`
  attribute vec4 aSplash;                                // xyz position, w birth time
  attribute float aRnd;
  uniform vec3 uAmbient;
  uniform float uTime, uLife, uOpacity, uLampGain;
  varying vec2 vUv; varying vec3 vCol; varying float vAlpha, vAge;
  ${LIGHTS_GLSL}
  void main() {
    float age = ( uTime - aSplash.w ) / uLife;
    float live = step( 0.0, age ) * step( age, 1.0 );
    float size = mix( 0.025, 0.12, age ) * ( 0.6 + 0.8 * aRnd );
    vec3 p = aSplash.xyz + vec3( position.x * size, 0.0, position.y * size );
    float dist = distance( cameraPosition, aSplash.xyz );
    vAge = age; vUv = position.xy;
    vCol = uAmbient + lampLight( aSplash.xyz + vec3( 0.0, 0.05, 0.0 ) ) * uLampGain;
    vAlpha = live * ( 1.0 - age ) * uOpacity * ( 1.0 - smoothstep( 12.0, 17.0, dist ) );
    gl_Position = live > 0.5 ? projectionMatrix * viewMatrix * vec4( p, 1.0 ) : vec4( 2.0, 2.0, 2.0, 1.0 );
  }`;
const SPLASH_FRAG = /* glsl */`
  varying vec2 vUv; varying vec3 vCol; varying float vAlpha, vAge;
  void main() {
    float r = length( vUv );
    float ring = smoothstep( 0.26, 0.0, abs( r - 0.72 ) );
    float crown = ( 1.0 - smoothstep( 0.0, 0.3, vAge ) ) * smoothstep( 0.5, 0.0, r ) * 1.6;
    gl_FragColor = vec4( vCol, ( ring * 0.75 + crown ) * vAlpha );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const PART_VERT = /* glsl */`
  attribute vec4 aPos;                                   // xyz position, w size
  attribute vec4 aCol;                                   // rgb, alpha
  attribute float aRot;
  uniform vec3 uLight;                                   // ambient light on a white puff
  uniform float uLampGain, uFogDensity;
  varying vec2 vUv; varying vec3 vCol; varying float vAlpha, vFog, vSeed;
  ${LIGHTS_GLSL}
  void main() {
    vec4 mv = viewMatrix * vec4( aPos.xyz, 1.0 );
    float c = cos( aRot ), s = sin( aRot );
    mv.xy += vec2( position.x * c - position.y * s, position.x * s + position.y * c ) * aPos.w;
    vUv = position.xy; vSeed = aRot;
    vCol = aCol.rgb * ( uLight + lampLight( aPos.xyz ) * uLampGain );
    vAlpha = aCol.a;
    float fd = - mv.z * uFogDensity;
    vFog = 1.0 - exp( - fd * fd );
    gl_Position = projectionMatrix * mv;
  }`;
const PART_FRAG = /* glsl */`
  uniform vec3 uFogColor;
  varying vec2 vUv; varying vec3 vCol; varying float vAlpha, vFog, vSeed;
  float hash12( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
  float vnoise( vec2 p ) {
    vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( hash12( i ), hash12( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hash12( i + vec2( 0.0, 1.0 ) ), hash12( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
  }
  void main() {
    float r = length( vUv );
    float a = smoothstep( 1.0, 0.1, r );
    a *= a * ( 0.6 + 0.6 * vnoise( vUv * 2.2 + vSeed * 3.0 ) );       // a blotchy puff, not a clean disc
    gl_FragColor = vec4( mix( vCol, uFogColor, vFog ), a * vAlpha );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const QUAD = new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]);          // streak: x across, y along
const QUAD_C = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);      // centred quad
const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** @param {object} ctx */
export function createWeather(ctx) {
  const settings = ctx.settings;
  const gfx = ctx.has('gfx') && !ctx.gfx.unavailable ? ctx.gfx : null;
  const rng = ctx.rng.fork('weather');
  const emitters = [];
  const lights = [];                                    // what the caller gave us; the four nearest go to the shaders
  const stats = { streaks: 0, splashes: 0, particles: 0, emitters: 0 };

  // ---- particle pool (CPU) -----------------------------------------------------------------------------------------
  // per particle: 0-2 position, 3-5 velocity, 6 age, 7 life, 8 size0, 9 size1, 10 alpha, 11-13 colour, 14 rot, 15 spin, 16 windK, 17 gravity
  const S = 18, pool = new Float32Array(MAX_PARTICLES * S);
  let live = 0, splashNext = 0, splashAcc = 0;

  function spawn(e) {
    const cap = Math.min(MAX_PARTICLES, Math.round(BASE_PARTICLES * num(settings.get('particles'), 1)));
    if (live >= cap) return;
    const t = e.def, o = live * S, a = rng.float(0, Math.PI * 2), r = Math.sqrt(rng.next()) * e.radius;
    const dusty = e.type === 'dust';
    pool[o] = e.position.x + Math.cos(a) * r; pool[o + 1] = e.position.y + (dusty ? rng.float(-0.4, 1) * e.radius : 0); pool[o + 2] = e.position.z + Math.sin(a) * r;
    pool[o + 3] = rng.float(-1, 1) * t.spread; pool[o + 4] = e.rise * rng.float(0.7, 1.3); pool[o + 5] = rng.float(-1, 1) * t.spread;
    pool[o + 6] = 0; pool[o + 7] = rng.float(t.life[0], t.life[1]);
    pool[o + 8] = t.size[0] * e.size * rng.float(0.8, 1.2); pool[o + 9] = t.size[1] * e.size * rng.float(0.8, 1.25);
    pool[o + 10] = t.alpha * e.alpha; pool[o + 11] = e.color.r; pool[o + 12] = e.color.g; pool[o + 13] = e.color.b;
    pool[o + 14] = rng.float(0, Math.PI * 2); pool[o + 15] = rng.float(-0.5, 0.5); pool[o + 16] = t.windK; pool[o + 17] = t.gravity;
    live++;
  }

  /** @returns emitter handle {position, enabled, setEnabled(b), setRate(r), remove()} */
  function addEmitter(o = {}) {
    const def = TYPES[o.type] || TYPES.steam;
    const e = {
      type: TYPES[o.type] ? o.type : 'steam', def, enabled: o.enabled !== false, acc: 0,
      position: new THREE.Vector3(), color: new THREE.Color(o.color === undefined ? def.color : o.color),
      rate: num(o.rate, def.rate), size: num(o.size, 1), rise: num(o.rise, def.rise), radius: num(o.radius, def.radius), alpha: num(o.alpha, 1),
    };
    if (Array.isArray(o.position)) e.position.fromArray(o.position); else if (o.position) e.position.copy(o.position);
    emitters.push(e);
    const handle = {
      position: e.position,
      get enabled() { return e.enabled; },
      setEnabled(b) { e.enabled = !!b; },
      setRate(r) { e.rate = Math.max(0, num(r, e.rate)); },
      remove() { const i = emitters.indexOf(e); if (i >= 0) emitters.splice(i, 1); },
    };
    return handle;
  }

  /** Lamps that should light the rain and the particles. Any number; the four with the most effect near the camera are used. */
  function setLights(list) {
    lights.length = 0;
    for (const l of list || []) if (l && l.position) lights.push(l);
  }

  if (!gfx) {
    const weather = { addEmitter, setLights, stats: () => ({ ...stats, emitters: emitters.length }), update() {}, dispose() {}, rain: null, splashes: null, particles: null };
    ctx.register('weather', weather, { order: 55, runWhenPaused: true });
    return weather;
  }

  // ---- GPU objects -------------------------------------------------------------------------------------------------
  const { scene, camera } = gfx;
  const lightPos = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3());
  const lightCol = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4(0, 0, 0, 1));
  const shared = { uLightPos: { value: lightPos }, uLightCol: { value: lightCol }, uTime: { value: 0 }, uAmbient: { value: new THREE.Color() } };
  const material = (name, vertexShader, fragmentShader, uniforms, blending) => new THREE.ShaderMaterial({
    name, vertexShader, fragmentShader, uniforms: { ...shared, ...uniforms }, blending, transparent: true, depthWrite: false, depthTest: true, fog: false, side: THREE.DoubleSide,
  });
  const instanced = (quad, attrs) => {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(quad, 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    for (const [name, array, size] of attrs) { const a = new THREE.InstancedBufferAttribute(array, size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); }
    g.instanceCount = 0;
    return g;
  };
  const mesh = (name, geo, mat, order) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.frustumCulled = false; m.renderOrder = order; m.matrixAutoUpdate = false; scene.add(m); return m; };

  const seeds = new Float32Array(MAX_STREAKS * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rng.next();
  const rainU = {
    uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3().fromArray(BOX) }, uWind: { value: new THREE.Vector2() },
    uDrift: { value: new THREE.Vector2() }, uFall: { value: 0 },
    uLength: { value: 0.5 }, uWidth: { value: 0.011 }, uPixel: { value: 0.001 }, uOpacity: { value: 0.6 }, uLampGain: { value: 0.11 },
  };
  const rainGeo = instanced(QUAD, [['aSeed', seeds, 4]]);
  rainGeo.getAttribute('aSeed').setUsage(THREE.StaticDrawUsage);
  const rain = mesh('weather.rain', rainGeo, material('weather.rain', RAIN_VERT, RAIN_FRAG, rainU, THREE.AdditiveBlending), 20);

  const splashData = new Float32Array(MAX_SPLASHES * 4).fill(-1e6), splashRnd = new Float32Array(MAX_SPLASHES);
  for (let i = 0; i < MAX_SPLASHES; i++) splashRnd[i] = rng.next();
  const splashU = { uLife: { value: SPLASH_LIFE }, uOpacity: { value: 0.5 }, uLampGain: { value: 0.16 } };
  const splashGeo = instanced(QUAD_C, [['aSplash', splashData, 4], ['aRnd', splashRnd, 1]]);
  const splashes = mesh('weather.splashes', splashGeo, material('weather.splashes', SPLASH_VERT, SPLASH_FRAG, splashU, THREE.AdditiveBlending), 21);

  const partPos = new Float32Array(MAX_PARTICLES * 4), partCol = new Float32Array(MAX_PARTICLES * 4), partRot = new Float32Array(MAX_PARTICLES);
  const partU = { uLight: { value: new THREE.Color() }, uLampGain: { value: 0.3 }, uFogDensity: { value: 0 }, uFogColor: { value: new THREE.Color() } };
  const partGeo = instanced(QUAD_C, [['aPos', partPos, 4], ['aCol', partCol, 4], ['aRot', partRot, 1]]);
  const particles = mesh('weather.particles', partGeo, material('weather.particles', PART_VERT, PART_FRAG, partU, THREE.NormalBlending), 22);

  const _fwd = new THREE.Vector3(), _c = new THREE.Color();
  const FALL_PERIOD = 2 * BOX[1];                        // speeds are multiples of 0.5 m/s, so speed x period is a whole number of boxes
  let fall = 0, driftX = 0, driftZ = 0;

  function pickLights() {
    // score = intensity / (1 + distance^2 to the camera); keep the best four (insertion into a tiny sorted list)
    const best = [-1, -1, -1, -1], bestScore = [0, 0, 0, 0];
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i], I = num(l.intensity, 0);
      if (!(I > 0)) continue;
      const s = I / (1 + camera.position.distanceToSquared(l.position));
      for (let k = 0; k < MAX_LIGHTS; k++) if (s > bestScore[k]) {
        for (let j = MAX_LIGHTS - 1; j > k; j--) { best[j] = best[j - 1]; bestScore[j] = bestScore[j - 1]; }
        best[k] = i; bestScore[k] = s; break;
      }
    }
    for (let k = 0; k < MAX_LIGHTS; k++) {
      const l = best[k] >= 0 ? lights[best[k]] : null;
      if (!l) { lightCol[k].set(0, 0, 0, 1); continue; }
      const I = num(l.intensity, 0);
      if (l.color && l.color.isColor) _c.copy(l.color); else _c.set(l.color === undefined ? 0xffffff : l.color);
      lightPos[k].copy(l.position);
      lightCol[k].set(_c.r * I, _c.g * I, _c.b * I, Math.max(1, num(l.distance, 30)));
    }
  }

  function update(dt) {
    const env = ctx.has('env') ? ctx.env : null, st = env ? env.state : null;
    const outdoors = 1 - clamp01(num(ctx.zones.indoor, 0));
    const amount = (env ? num(env.rain, 0) : 0) * outdoors, flash = env ? num(env.flash, 0) : 0;
    const time = ctx.time.real;
    shared.uTime.value = time;
    pickLights();

    // light on the rain: the haze colour it is seen against, plus a little of the key light and any lightning
    if (st) {
      const k = 1.5, ki = st.keyIntensity * 0.035;
      shared.uAmbient.value.setRGB(st.fogColor[0] * k + st.keyColor[0] * ki + flash * 0.55, st.fogColor[1] * k + st.keyColor[1] * ki + flash * 0.62, st.fogColor[2] * k + st.keyColor[2] * ki + flash * 0.8);
      const hi = st.hemiIntensity / Math.PI, kd = (st.keyIntensity * 0.35) / Math.PI;
      partU.uLight.value.setRGB(st.hemiSky[0] * hi + st.keyColor[0] * kd + flash, st.hemiSky[1] * hi + st.keyColor[1] * kd + flash, st.hemiSky[2] * hi + st.keyColor[2] * kd + flash);
      partU.uFogColor.value.setRGB(st.fogColor[0], st.fogColor[1], st.fogColor[2]);
      partU.uFogDensity.value = env.fog ? env.fog.density : st.fogDensity;
    } else { shared.uAmbient.value.setRGB(0.05, 0.055, 0.065); partU.uLight.value.setRGB(0.3, 0.3, 0.32); }

    // rain streaks
    const density = num(settings.get('rainDensity'), 1);
    const streaks = Math.min(MAX_STREAKS, Math.round(BASE_STREAKS * density * Math.min(1.3, amount)));
    rain.visible = streaks > 0;
    rainGeo.instanceCount = streaks;
    stats.streaks = streaks;
    camera.getWorldDirection(_fwd); _fwd.y = 0;
    if (_fwd.lengthSq() > 1e-6) _fwd.normalize();
    rainU.uCenter.value.copy(camera.position).addScaledVector(_fwd, 8);           // most of the volume in front of the camera
    const wx = env ? num(env.wind.x, 0) : 0, wz = env ? num(env.wind.z, 0) : 0;
    const sdt = Math.min(dt, 0.1);
    fall = (fall + sdt) % FALL_PERIOD; driftX = (driftX + wx * 0.55 * sdt) % BOX[0]; driftZ = (driftZ + wz * 0.55 * sdt) % BOX[2];
    rainU.uFall.value = fall; rainU.uDrift.value.set(driftX, driftZ);
    rainU.uWind.value.set(wx * 0.55, wz * 0.55);
    rainU.uLength.value = 0.42 + 0.12 * Math.min(1.3, amount);
    rainU.uPixel.value = (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, gfx.canvas.height);   // world size of one pixel at 1 m

    // splashes: respawn the oldest slots around the point in front of the camera
    const wantSplashes = Math.min(MAX_SPLASHES, Math.round(BASE_SPLASHES * density * Math.min(1.3, amount)));
    splashes.visible = wantSplashes > 0;
    splashGeo.instanceCount = wantSplashes ? MAX_SPLASHES : 0;
    stats.splashes = wantSplashes;
    if (wantSplashes) {
      splashAcc += (wantSplashes / SPLASH_LIFE) * Math.min(dt, 0.1);
      const cx = camera.position.x + _fwd.x * 6, cz = camera.position.z + _fwd.z * 6, hasGround = ctx.has('collision');
      let n = Math.min(MAX_SPLASHES, Math.floor(splashAcc));
      splashAcc -= n;
      for (; n > 0; n--) {
        const a = rng.float(0, Math.PI * 2), r = Math.sqrt(rng.next()) * 15, o = splashNext * 4;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        splashData[o] = x; splashData[o + 1] = (hasGround ? num(ctx.collision.groundY(x, z, 80, 0), 0) : 0) + 0.02; splashData[o + 2] = z;
        splashData[o + 3] = time - rng.next() * Math.min(dt, 0.1);
        splashNext = (splashNext + 1) % MAX_SPLASHES;
      }
      splashGeo.getAttribute('aSplash').needsUpdate = true;
    }

    // particles: emit, integrate, compact
    const step = Math.min(dt, 0.1), scale = num(settings.get('particles'), 1);
    for (const e of emitters) {
      if (!e.enabled) continue;
      e.acc += e.rate * scale * step;
      while (e.acc >= 1) { e.acc -= 1; spawn(e); }
    }
    for (let i = 0; i < live;) {
      const o = i * S;
      pool[o + 6] += step;
      if (pool[o + 6] >= pool[o + 7]) { live--; pool.copyWithin(o, live * S, live * S + S); continue; }
      const k = Math.min(1, step * 1.5) * pool[o + 16];
      pool[o + 3] += (wx - pool[o + 3]) * k; pool[o + 5] += (wz - pool[o + 5]) * k;
      pool[o + 4] -= pool[o + 17] * step;
      pool[o] += pool[o + 3] * step; pool[o + 1] += pool[o + 4] * step; pool[o + 2] += pool[o + 5] * step;
      pool[o + 14] += pool[o + 15] * step;
      const t = pool[o + 6] / pool[o + 7], q = i * 4, fade = Math.min(1, t / 0.15) * (1 - t) * (1 - t) * 1.6;
      partPos[q] = pool[o]; partPos[q + 1] = pool[o + 1]; partPos[q + 2] = pool[o + 2]; partPos[q + 3] = pool[o + 8] + (pool[o + 9] - pool[o + 8]) * Math.sqrt(t);
      partCol[q] = pool[o + 11]; partCol[q + 1] = pool[o + 12]; partCol[q + 2] = pool[o + 13]; partCol[q + 3] = pool[o + 10] * Math.min(1, fade);
      partRot[i] = pool[o + 14];
      i++;
    }
    particles.visible = live > 0;
    partGeo.instanceCount = live;
    stats.particles = live;
    if (live) { partGeo.getAttribute('aPos').needsUpdate = true; partGeo.getAttribute('aCol').needsUpdate = true; partGeo.getAttribute('aRot').needsUpdate = true; }
  }

  const weather = {
    addEmitter, setLights, update,
    /** {streaks, splashes, particles, emitters} drawn right now */
    stats: () => ({ ...stats, emitters: emitters.length }),
    rain, splashes, particles,
    dispose() {
      for (const m of [rain, splashes, particles]) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
      emitters.length = 0; lights.length = 0; live = 0;
    },
  };
  ctx.register('weather', weather, { order: 55, runWhenPaused: true });
  ctx.debug.weatherStats = weather.stats;
  return weather;
}
