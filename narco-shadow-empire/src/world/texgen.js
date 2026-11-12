// Procedural texture generator. Pure module (typed arrays out; no three.js, no DOM, no canvas): unit-tested in Node.
// textures.js wraps the result in three.js textures; materials.js builds PBR materials from them.
//
//   const maps = generate('brick', { size: 512, seed: 7, palette: 'dark' });
//   maps = { kind, size, meters,            // meters = real-world width of one repeat (builders scale UVs with it)
//            color:    Uint8ClampedArray,   // sRGB RGBA, row 0 = bottom (v = 0); alpha = coverage (chain-link)
//            normal:   Uint8Array,          // tangent-space normal map, RGBA
//            orm:      Uint8Array,          // R = where puddles / dirt collect · G = roughness · B = metalness
//            emissive: Uint8ClampedArray? } // facades: the lit windows
// Every map tiles seamlessly and is fully determined by (kind, size, seed, options).
import { createRng, hashString } from '../core/rng.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
/** stable 0..1 hash of two integers and a seed */
const hash2 = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Tileable fractal value noise, size x size, values 0..1. cx / cy = lattice cells of the first octave per axis. */
export function fbm(size, rng, cx, cy = cx, octaves = 4, gain = 0.5) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves && cx <= size && cy <= size; o++, cx *= 2, cy *= 2, amp *= gain) {
    const g = new Float32Array(cx * cy), kx = cx / size, ky = cy / size;
    for (let i = 0; i < g.length; i++) g[i] = rng.next();
    total += amp;
    for (let y = 0, i = 0; y < size; y++) {
      const fy = y * ky, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty), r0 = y0 * cx, r1 = ((y0 + 1) % cy) * cx;
      for (let x = 0; x < size; x++, i++) {
        const fx = x * kx, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % cx;
        const a = g[r0 + x0], b = g[r0 + x1], c = g[r1 + x0], d = g[r1 + x1];
        out[i] += amp * (a + (b - a) * sx + (c - a + (a - b - c + d) * sx) * sy);
      }
    }
  }
  if (total > 0) for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Tangent-space normal map from a height field (wraps at the edges). `strength` is for a 512 px map. */
export function normalFromHeight(h, size, strength = 4) {
  const out = new Uint8Array(size * size * 4), k = (strength * size) / 512;
  for (let y = 0, o = 0; y < size; y++) {
    const yc = y * size, yu = ((y + 1) % size) * size, yd = ((y - 1 + size) % size) * size;
    for (let x = 0; x < size; x++, o += 4) {
      const dx = (h[yc + ((x + 1) % size)] - h[yc + ((x - 1 + size) % size)]) * k, dy = (h[yu + x] - h[yd + x]) * k;
      const inv = 127.5 / Math.sqrt(dx * dx + dy * dy + 1);
      out[o] = 127.5 - dx * inv; out[o + 1] = 127.5 - dy * inv; out[o + 2] = 127.5 + inv; out[o + 3] = 255;
    }
  }
  return out;
}

/** Working buffers of one texture; kinds fill them, finish() packs them. */
function sheet(size) {
  const n = size * size;
  return { size, n, color: new Uint8ClampedArray(n * 4).fill(255), h: new Float32Array(n).fill(0.5), rough: new Float32Array(n).fill(0.9), metal: new Float32Array(n), mask: new Float32Array(n), emissive: null };
}
const put = (T, i, r, g, b) => { const o = i * 4; T.color[o] = r; T.color[o + 1] = g; T.color[o + 2] = b; };
const shade = (T, i, k) => { const o = i * 4; T.color[o] *= k; T.color[o + 1] *= k; T.color[o + 2] *= k; };
/** dark wandering cracks (wrap around) */
function cracks(T, rng, count, depth = 0.45) {
  const s = T.size;
  for (let c = 0; c < count; c++) {
    let x = rng.next() * s, y = rng.next() * s, a = rng.next() * Math.PI * 2;
    for (let n = (0.25 + rng.next() * 0.5) * s; n > 0; n--) {
      const i = (((y | 0) % s + s) % s) * s + (((x | 0) % s + s) % s);
      shade(T, i, 0.5); T.h[i] -= depth; T.rough[i] = 0.98;
      x += Math.cos(a); y += Math.sin(a); a += (rng.next() - 0.5) * 0.7;
    }
  }
}

const BRICK = { red: [0x8e4a38, 0x6f3a2e, 0xa7604a], dark: [0x5a3c34, 0x47302b, 0x6a4a40], painted: [0xb9b29c, 0xa9a28e, 0xc6c0ac] };

const KINDS = {
  asphalt: { meters: 4, bump: 5, make(T, rng) {
    const s = T.size, big = fbm(s, rng, 3, 3, 4), mid = fbm(s, rng, 14, 14, 3), fine = fbm(s, rng, 96, 96, 2, 0.6), pud = fbm(s, rng, 4, 4, 3);
    for (let i = 0; i < T.n; i++) {
      const grain = rng.next(), tar = smooth(0.58, 0.68, big[i]);                      // tar = re-surfaced patches: darker, smoother
      let v = 44 + 30 * fine[i] + 16 * (grain - 0.5) + 12 * (mid[i] - 0.5) - 15 * tar;
      if (grain > 0.986) v += 40;                                                      // pale stones in the aggregate
      put(T, i, v * 0.97, v, v * 1.05);
      T.h[i] = 0.5 + ((grain - 0.5) * 0.6 + (fine[i] - 0.5) * 0.5) * (1 - 0.7 * tar);
      T.rough[i] = 0.93 - 0.22 * tar - 0.06 * mid[i];
      T.mask[i] = pud[i];
    }
    cracks(T, rng, 6);
  } },
  sidewalk: { meters: 2, bump: 6, make(T, rng, o) {
    const s = T.size, slabs = o.slabs || 2, mottle = fbm(s, rng, 6, 6, 4), fine = fbm(s, rng, 64, 64, 2), seed = rng.seed, joint = 0.012 * slabs;
    for (let y = 0, i = 0; y < s; y++) for (let x = 0; x < s; x++, i++) {
      const u = (x / s) * slabs, v = (y / s) * slabs, fu = u - Math.floor(u), fv = v - Math.floor(v);
      const edge = Math.min(fu, 1 - fu, fv, 1 - fv), j = 1 - smooth(joint * 0.5, joint * 1.6, edge);      // 1 inside a joint
      const tint = 0.9 + 0.2 * hash2(u | 0, v | 0, seed), g = (150 + 50 * (mottle[i] - 0.5) + 22 * (fine[i] - 0.5) + 10 * (rng.next() - 0.5)) * tint * (1 - 0.55 * j);
      put(T, i, g * 1.02, g, g * 0.95);
      T.h[i] = 0.6 - 0.5 * j + (fine[i] - 0.5) * 0.25;
      T.rough[i] = 0.86 + 0.1 * j; T.mask[i] = Math.max(j, mottle[i] * 0.8);
    }
    for (let k = 0; k < 14; k++) {                                                    // old chewing gum, of course
      const cx = rng.next() * s, cy = rng.next() * s, r = 2 + rng.next() * 3 * (s / 512);
      for (let y = -r | 0; y <= r; y++) for (let x = -r | 0; x <= r; x++) if (x * x + y * y <= r * r) shade(T, (((cy + y) | 0) % s + s) % s * s + (((cx + x) | 0) % s + s) % s, 0.62);
    }
    cracks(T, rng, 2, 0.3);
  } },
  concrete: { meters: 3, bump: 4, make(T, rng, o) {
    const s = T.size, mottle = fbm(s, rng, 4, 4, 5), fine = fbm(s, rng, 80, 80, 2), streak = fbm(s, rng, 40, 2, 2), base = hex(o.color === undefined ? 0x8f8d88 : o.color), stain = o.stains === undefined ? 0.5 : o.stains;
    for (let y = 0, i = 0; y < s; y++) for (let x = 0; x < s; x++, i++) {
      const pin = rng.next() > 0.9965 ? 1 : 0, form = smooth(0, 0.006, Math.abs(((y / s) * 2) % 1 - 0.5) - 0.494);     // formwork lines
      const k = (0.84 + 0.3 * (mottle[i] - 0.5) + 0.12 * (fine[i] - 0.5)) * (1 - stain * 0.3 * smooth(0.5, 0.8, streak[i])) * (1 - 0.35 * pin) * (1 - 0.12 * form);
      put(T, i, base[0] * k, base[1] * k, base[2] * k);
      T.h[i] = 0.5 + (fine[i] - 0.5) * 0.3 - 0.5 * pin - 0.25 * form;
      T.rough[i] = 0.88 - 0.1 * (mottle[i] - 0.5); T.mask[i] = mottle[i];
    }
  } },
  brick: { meters: 1.35, bump: 7, make(T, rng, o) {
    const s = T.size, nx = 6, ny = 18, pal = (BRICK[o.palette] || BRICK.red).map(hex), mortar = hex(o.palette === 'dark' ? 0x6e6a64 : 0x9a968c), fine = fbm(s, rng, 64, 64, 3), big = fbm(s, rng, 4, 4, 3), seed = rng.seed;
    for (let y = 0, i = 0; y < s; y++) for (let x = 0; x < s; x++, i++) {
      const row = Math.floor((y / s) * ny), u = (x / s) * nx + (row & 1) * 0.5, bi = ((Math.floor(u) % nx) + nx) % nx, fu = u - Math.floor(u), fv = (y / s) * ny - row;
      const e = Math.min(Math.min(fu, 1 - fu) / 0.03, Math.min(fv, 1 - fv) / 0.09), m = 1 - smooth(0.6, 1.25, e);          // 1 in the mortar joint
      const r1 = hash2(bi, row, seed), c = pal[r1 < 0.6 ? 0 : r1 < 0.85 ? 1 : 2], k = (0.82 + 0.3 * hash2(bi, row, seed + 9) + 0.3 * (fine[i] - 0.5)) * (0.88 + 0.24 * big[i]);
      const g = 0.9 + 0.25 * (fine[i] - 0.5);
      put(T, i, c[0] * k * (1 - m) + mortar[0] * g * m, c[1] * k * (1 - m) + mortar[1] * g * m, c[2] * k * (1 - m) + mortar[2] * g * m);
      T.h[i] = (1 - m) * (0.72 + 0.2 * (fine[i] - 0.5) + 0.08 * r1) + m * 0.3;
      T.rough[i] = 0.84 + 0.12 * m; T.mask[i] = m;
    }
  } },
  stucco: { meters: 3, bump: 3.5, make(T, rng, o) {
    const s = T.size, base = hex(o.color === undefined ? 0xc9b58f : o.color), mottle = fbm(s, rng, 3, 3, 5), fine = fbm(s, rng, 110, 110, 2, 0.7), streak = fbm(s, rng, 48, 3, 3), patch = fbm(s, rng, 2, 2, 2);
    for (let i = 0; i < T.n; i++) {
      const p = smooth(0.62, 0.64, patch[i]) * 0.1, k = (0.86 + 0.24 * (mottle[i] - 0.5) + 0.1 * (fine[i] - 0.5) + p) * (1 - 0.3 * smooth(0.55, 0.85, streak[i]));
      put(T, i, base[0] * k, base[1] * k, base[2] * k * (1 - 0.06 * smooth(0.55, 0.85, streak[i])));
      T.h[i] = 0.5 + (fine[i] - 0.5) * 0.5 + (mottle[i] - 0.5) * 0.2;
      T.rough[i] = 0.9; T.mask[i] = streak[i];
    }
    cracks(T, rng, 2, 0.25);
  } },
  corrugated: { meters: 1.2, bump: 9, make(T, rng, o) {
    const s = T.size, ridges = 16, base = hex(o.color === undefined ? 0x5f7a80 : o.color), rustC = hex(0x7a4326), amount = o.rust === undefined ? 0.35 : o.rust;
    const blot = fbm(s, rng, 5, 5, 4), run = fbm(s, rng, 40, 3, 3), fine = fbm(s, rng, 90, 90, 2);
    for (let y = 0, i = 0; y < s; y++) for (let x = 0; x < s; x++, i++) {
      const v = y / s, wave = Math.sin((x / s) * ridges * Math.PI * 2), seam = 1 - smooth(0, 0.012, Math.min(v, 1 - v));       // sheets overlap once per repeat
      const low = 1 - smooth(0, 0.3, v), r = clamp01(smooth(0.62 - 0.4 * amount - 0.25 * low * amount, 0.8 - 0.3 * amount, blot[i] * 0.6 + run[i] * 0.4) + seam * amount);
      const k = 0.8 + 0.2 * wave * 0.5 + 0.12 * (fine[i] - 0.5), rk = 0.75 + 0.5 * fine[i];
      put(T, i, base[0] * k * (1 - r) + rustC[0] * rk * r, base[1] * k * (1 - r) + rustC[1] * rk * r, base[2] * k * (1 - r) + rustC[2] * rk * r);
      T.h[i] = 0.5 + 0.45 * wave - 0.25 * seam + 0.06 * r * (fine[i] - 0.5);
      T.rough[i] = 0.5 + 0.45 * r; T.metal[i] = (o.bare ? 0.85 : 0.15) * (1 - r); T.mask[i] = r;
    }
  } },
  wood: { meters: 1, bump: 5, make(T, rng, o) {
    const s = T.size, boards = o.boards || 5, base = hex(o.color === undefined ? 0x9a744a : o.color), grain = fbm(s, rng, 3, 60, 4, 0.6), fine = fbm(s, rng, 8, 128, 2), seed = rng.seed;
    for (let y = 0, i = 0; y < s; y++) for (let x = 0; x < s; x++, i++) {
      const b = Math.floor((y / s) * boards), fv = (y / s) * boards - b, gap = 1 - smooth(0.02, 0.06, Math.min(fv, 1 - fv)), u = x / s;
      const nail = (Math.abs(u - 0.04) < 0.012 || Math.abs(u - 0.96) < 0.012) && Math.abs(fv - 0.5) < 0.012 * boards ? 1 : 0;
      const k = (0.72 + 0.4 * hash2(b, 0, seed) * 0.5 + 0.45 * (grain[i] - 0.5) + 0.2 * (fine[i] - 0.5)) * (1 - 0.75 * gap) * (1 - 0.6 * nail);
      put(T, i, base[0] * k, base[1] * k, base[2] * k);
      T.h[i] = 0.6 - 0.55 * gap + 0.25 * (grain[i] - 0.5) - 0.2 * nail;
      T.rough[i] = 0.8 + 0.1 * gap - 0.3 * nail; T.metal[i] = nail * 0.8; T.mask[i] = gap;
    }
  } },
  chainlink: { meters: 1, bump: 6, make(T, rng) {
    const s = T.size, n = 16, w = 0.09;
    for (let y = 0, i = 0; y < s; y++) for (let x = 0; x < s; x++, i++) {
      const a = ((x + y) / s) * n, b = ((x - y) / s) * n, da = Math.abs(a - Math.floor(a) - 0.5), db = Math.abs(b - Math.floor(b) - 0.5), d = Math.min(da, db);
      const on = d < w, g = 150 + 60 * (1 - d / w) + 20 * (rng.next() - 0.5);
      put(T, i, g * 0.96, g, g * 1.03); T.color[i * 4 + 3] = on ? 255 : 0;
      T.h[i] = on ? 1 - d / w : 0; T.rough[i] = 0.45; T.metal[i] = 0.85;
    }
  } },
  facade: { meters: 12, bump: 8, make(T, rng, o) {
    const st = FACADES[o.style] || FACADES.stucco, s = T.size, floors = st.floors, bays = st.bays, seed = rng.seed, wall = hex(o.color === undefined ? st.wall : o.color), frame = hex(st.frame);
    const mottle = fbm(s, rng, 4, 4, 4), fine = fbm(s, rng, 96, 96, 2), streak = fbm(s, rng, 64, 4, 2), lit = o.lit === undefined ? st.lit : o.lit;
    const [w0, w1, v0, v1] = st.window;
    T.emissive = new Uint8ClampedArray(T.n * 4);
    for (let y = 0, i = 0; y < s; y++) for (let x = 0; x < s; x++, i++) {
      const fx = (x / s) * bays, fy = (y / s) * floors, bi = fx | 0, fi = fy | 0, fu = fx - bi, fv = fy - fi, o4 = i * 4;
      const inW = fu > w0 && fu < w1 && fv > v0 && fv < v1, fr = 0.03, glass = inW && fu > w0 + fr && fu < w1 - fr && fv > v0 + fr * 1.4 && fv < v1 - fr * 1.4;
      const sill = fv > v0 - 0.045 && fv <= v0 && fu > w0 - 0.04 && fu < w1 + 0.04, course = fv < 0.025;
      const below = fv < v0 - 0.045 && fu > w0 && fu < w1 ? smooth(0.5, 0.9, streak[i]) * (0.4 + 0.6 * fv / v0) : 0;      // dirt run-off under the sills
      let r, g, b, hgt = 0.5 + (fine[i] - 0.5) * 0.25, rough = 0.9;
      let k = (0.86 + 0.22 * (mottle[i] - 0.5) + 0.1 * (fine[i] - 0.5)) * (1 - 0.28 * below);
      if (st.bricks) { const row = Math.floor(fy * 38), bu = fx * 11 + (row & 1) * 0.5, e = Math.min((bu - Math.floor(bu)) / 0.05, (fy * 38 - row) / 0.12); if (e < 1) { k *= 0.72; hgt -= 0.2; } else k *= 0.9 + 0.2 * hash2(bu | 0, row, seed); }
      if (st.tiles) { const tu = fx * st.tiles, tv = fy * st.tiles; hgt = 0.5 + (fine[i] - 0.5) * 0.06; if (Math.min(tu - Math.floor(tu), tv - Math.floor(tv)) < 0.06) { k *= 0.78; hgt -= 0.15; } rough = 0.6; }      // glazed, but calm: no glitter
      r = wall[0] * k; g = wall[1] * k; b = wall[2] * k;
      if (course || sill) { const c = sill ? 1.12 : 0.9; r *= c; g *= c; b *= c; hgt += 0.3; }
      if (inW && !glass) { r = frame[0]; g = frame[1]; b = frame[2]; hgt += 0.15; rough = 0.6; }
      if (glass) {
        const h1 = hash2(bi, fi, seed + 3), on = h1 < lit, warm = hash2(bi, fi, seed + 5) < 0.72, gu = (fu - w0) / (w1 - w0), gv = (fv - v0) / (v1 - v0);
        const mull = Math.abs(gu - 0.5) < 0.025 || (st.cross && Math.abs(gv - 0.62) < 0.02);
        r = 22 + 14 * gv; g = 28 + 18 * gv; b = 36 + 24 * gv; hgt = 0.08; rough = 0.07;                          // flat: glass must mirror, not sparkle
        if (mull) { r = frame[0]; g = frame[1]; b = frame[2]; hgt = 0.6; rough = 0.6; }
        else if (on) {
          const blind = hash2(bi, fi, seed + 7), curtain = blind < 0.35 ? (gu < 0.3 || gu > 0.72 ? 0.45 : 1) : blind < 0.6 ? 0.55 + 0.45 * (((gv * 14) | 0) & 1) : 1;      // drapes, slats or bare
          const e = (0.55 + 0.45 * hash2(bi, fi, seed + 11)) * curtain * (0.75 + 0.25 * gv), c = warm ? [255, 196, 120] : [176, 214, 255];
          T.emissive[o4] = c[0] * e; T.emissive[o4 + 1] = c[1] * e; T.emissive[o4 + 2] = c[2] * e; T.emissive[o4 + 3] = 255;
          r = 60 + c[0] * 0.25 * e; g = 55 + c[1] * 0.25 * e; b = 50 + c[2] * 0.25 * e;
        }
      }
      if (st.balcony && fi > 0 && hash2(bi, fi, seed + 13) < st.balcony && fv > 0.04 && fv < v0 - 0.06 && fu > w0 - 0.1 && fu < w1 + 0.1) {
        const bar = ((fu * 34) | 0) & 1, top = fv > v0 - 0.1;                                                          // railing bars and top rail
        if (bar || top) { r = 34; g = 36; b = 40; hgt += 0.35; rough = 0.55; }
      } else if (hash2(bi, fi, seed + 17) < st.ac && fv > 0.06 && fv < 0.2 && fu > w1 - 0.26 && fu < w1 - 0.02) {
        const grille = ((fv * 90) | 0) & 1; r = g = b = 150 - 40 * grille; hgt += 0.5; rough = 0.6;                    // window air conditioner
      }
      T.color[o4] = r; T.color[o4 + 1] = g; T.color[o4 + 2] = b;
      T.h[i] = hgt; T.rough[i] = rough; T.mask[i] = below;
    }
  } },
};

/** Facade styles: wall colour, window rectangle inside one bay x floor cell [u0, u1, v0, v1], share of lit windows ... */
export const FACADES = Object.freeze({
  stucco: { floors: 4, bays: 4, wall: 0xc9a27e, frame: 0xe6dcc8, window: [0.26, 0.74, 0.3, 0.82], lit: 0.38, balcony: 0.45, ac: 0.3, cross: true },
  brick: { floors: 4, bays: 4, wall: 0x8a4c3a, frame: 0xd8d2c4, window: [0.3, 0.7, 0.28, 0.8], lit: 0.34, balcony: 0, ac: 0.4, cross: true, bricks: true },
  office: { floors: 4, bays: 4, wall: 0x7f858a, frame: 0x3a4046, window: [0.08, 0.92, 0.3, 0.84], lit: 0.5, balcony: 0, ac: 0, cross: false },
  tile: { floors: 4, bays: 4, wall: 0x6fa5a0, frame: 0xf0ead8, window: [0.22, 0.78, 0.34, 0.8], lit: 0.4, balcony: 0.25, ac: 0.25, cross: true, tiles: 14 },
  industrial: { floors: 3, bays: 4, wall: 0x6b7378, frame: 0x2e3338, window: [0.3, 0.7, 0.58, 0.86], lit: 0.2, balcony: 0, ac: 0, cross: true },
});
export const KIND_NAMES = Object.freeze(Object.keys(KINDS));

/**
 * @param {string} kind one of KIND_NAMES
 * @param {{size?:number, seed?:number|string, [option:string]:any}} [o]  options depend on the kind (color, palette, rust, style, lit ...)
 */
export function generate(kind, o = {}) {
  const def = KINDS[kind];
  if (!def) throw new Error(`texgen: unknown kind "${kind}"`);
  const size = Math.max(16, o.size | 0 || 512);
  const T = sheet(size), seed = typeof o.seed === 'string' ? hashString(o.seed) : (o.seed === undefined ? 1 : o.seed) >>> 0;
  def.make(T, createRng((seed ^ hashString(kind)) >>> 0), o);
  const orm = new Uint8Array(T.n * 4);
  for (let i = 0, p = 0; i < T.n; i++, p += 4) { orm[p] = clamp01(T.mask[i]) * 255; orm[p + 1] = clamp01(T.rough[i]) * 255; orm[p + 2] = clamp01(T.metal[i]) * 255; orm[p + 3] = 255; }
  return { kind, size, meters: def.meters, color: T.color, normal: normalFromHeight(T.h, size, def.bump), orm, emissive: T.emissive };
}
