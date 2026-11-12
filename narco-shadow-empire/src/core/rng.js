// Deterministic seeded RNG (mulberry32). Pure module.
// Every generated question is reproducible from (templateId, seed), which is what makes
// duplicate avoidance, "similar example" and save/resume deterministic.

/** 32-bit string hash (FNV-1a). */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A fresh non-deterministic 32-bit seed. */
export function randomSeed() {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] >>> 0;
    }
  } catch { /* fall through */ }
  return (Math.floor(Math.random() * 0xffffffff) ^ (Date.now() & 0xffffffff)) >>> 0;
}

/**
 * @param {number|string} [seed]
 * @returns {{seed:number, next:()=>number, float:(a?:number,b?:number)=>number, int:(a:number,b:number)=>number,
 *   pick:<T>(arr:T[])=>T, shuffle:<T>(arr:T[])=>T[], chance:(p:number)=>boolean, weighted:<T>(items:T[], weights:number[])=>T,
 *   sample:<T>(arr:T[], n:number)=>T[], fork:(label:string)=>any}}
 */
export function createRng(seed) {
  const seed0 = seed === undefined || seed === null ? randomSeed() : typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  let a = seed0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    seed: seed0,
    /** float in [0,1) */
    next,
    /** float in [a,b) (defaults 0..1) */
    float: (lo = 0, hi = 1) => lo + (hi - lo) * next(),
    /** integer in [lo,hi] inclusive */
    int: (lo, hi) => {
      if (hi < lo) { const t = lo; lo = hi; hi = t; }
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** returns a NEW shuffled array (Fisher-Yates) */
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    },
    chance: (p) => next() < p,
    weighted: (items, weights) => {
      let total = 0;
      for (const w of weights) total += w;
      let r = next() * total;
      for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
      return items[items.length - 1];
    },
    /** n distinct elements */
    sample: (arr, n) => rng.shuffle(arr).slice(0, Math.min(n, arr.length)),
    /** independent child stream derived from this seed and a label */
    fork: (label) => createRng((seed0 ^ hashString(String(label))) >>> 0),
  };
  return rng;
}
