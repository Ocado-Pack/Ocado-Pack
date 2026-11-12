// GPU textures for ctx.mats: wraps texgen.js (pure generator) in three.js textures, plus canvas text for signs.
// Everything is generated lazily on first use and cached; nothing is loaded from anywhere.
import * as THREE from 'three';
import { generate } from './texgen.js';

const FONT = '"Arial Narrow", "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif';

export function createTextures(ctx) {
  const cache = new Map(), texts = new Map();
  let bytes = 0;
  const anisotropy = () => Math.min(8, (ctx.has('gfx') && ctx.gfx.maxAnisotropy) || 1);
  const data = (array, size, srgb) => {
    const t = new THREE.DataTexture(array, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = anisotropy();
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    bytes += array.length * 1.34;                              // with mipmaps
    return t;
  };

  /** Half-resolution copy (2 x 2 box filter) for maps that do not need the full size. */
  const half = (a, size) => {
    const h = size >> 1, out = new a.constructor(h * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) for (let c = 0; c < 4; c++) {
      const i = (2 * y * size + 2 * x) * 4 + c;
      out[(y * h + x) * 4 + c] = (a[i] + a[i + 4] + a[i + size * 4] + a[i + size * 4 + 4]) / 4;
    }
    return out;
  };

  const api = {
    /** Resolution used for a kind: facades get the full settings.textureSize, tiling surfaces half of it. */
    sizeFor(kind) {
      const s = ctx.settings.get('textureSize') || 1024;
      return kind === 'facade' ? Math.min(2048, Math.max(512, s)) : Math.min(1024, Math.max(256, s / 2));
    },
    /**
     * @param {string} kind texgen kind  @param {object} [o] texgen options (seed, color, palette, style ...)
     * @returns {{map, normalMap, ormMap, emissiveMap, meters, size}} ormMap: R puddle mask, G roughness, B metalness
     */
    maps(kind, o = {}) {
      const size = o.size || api.sizeFor(kind), key = kind + '|' + size + '|' + JSON.stringify(o);
      let m = cache.get(key);
      if (!m) {
        const g = generate(kind, { ...o, size });
        // A facade is seen from the street: only its colour needs the full size (10 MB instead of 22 MB at 1024 px).
        const aux = kind === 'facade' && size >= 512 ? (a) => data(half(a, size), size >> 1, a === g.emissive) : (a) => data(a, size, a === g.emissive);
        m = { map: data(g.color, size, true), normalMap: aux(g.normal), ormMap: aux(g.orm), emissiveMap: g.emissive ? aux(g.emissive) : null, meters: g.meters, size };
        cache.set(key, m);
      }
      return m;
    },
    /**
     * Text drawn on a canvas (signs, placards, tags, monitors). Lines are fitted to the width.
     * @param {string|string[]} lines
     * @param {{width?:number, height?:number, color?:string, background?:string|null, border?:string|null, glow?:string|null, weight?:number, align?:'center'|'left', padding?:number, font?:string}} [o]
     */
    text(lines, o = {}) {
      const list = Array.isArray(lines) ? lines.map(String) : String(lines).split('\n');
      const key = JSON.stringify([list, o]);
      let t = texts.get(key);
      if (t) return t;
      const w = o.width || 512, h = o.height || 128, pad = o.padding === undefined ? Math.round(h * 0.12) : o.padding;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      if (o.background) { g.fillStyle = o.background; g.fillRect(0, 0, w, h); }
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(2, h * 0.03); g.strokeRect(g.lineWidth, g.lineWidth, w - 2 * g.lineWidth, h - 2 * g.lineWidth); }
      let px = Math.floor((h - 2 * pad) / list.length / 1.12);
      const font = (size) => `${o.weight || 700} ${size}px ${o.font || FONT}`;
      g.font = font(px);
      const widest = Math.max(1, ...list.map((s) => g.measureText(s).width));
      if (widest > w - 2 * pad) px = Math.max(6, Math.floor((px * (w - 2 * pad)) / widest));
      g.font = font(px); g.textBaseline = 'middle'; g.textAlign = o.align === 'left' ? 'left' : 'center';
      g.fillStyle = o.color || '#ffffff';
      if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = px * 0.35; }
      const x = o.align === 'left' ? pad : w / 2, y0 = h / 2 - ((list.length - 1) * px * 1.12) / 2;
      list.forEach((s, i) => g.fillText(s, x, y0 + i * px * 1.12));
      t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = anisotropy(); t.userData.aspect = w / h;
      bytes += w * h * 4 * 1.34;
      texts.set(key, t);
      return t;
    },
    stats: () => ({ textures: cache.size * 3 + texts.size, bytesEstimate: Math.round(bytes) }),
    dispose() {
      for (const m of cache.values()) for (const k of ['map', 'normalMap', 'ormMap', 'emissiveMap']) if (m[k]) m[k].dispose();
      for (const t of texts.values()) t.dispose();
      cache.clear(); texts.clear(); bytes = 0;
    },
  };
  return api;
}
