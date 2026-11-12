// Small shared helpers. Pure module (no DOM, no three.js) - safe to import from Node tests.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, clamp01(invLerp(a, b, v)));
export const smoothstep = (a, b, v) => { const t = clamp01(invLerp(a, b, v)); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Frame-rate independent exponential smoothing: move `a` toward `b`; larger lambda = faster. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

// ---- Angles / headings -------------------------------------------------------------------------
// CONVENTION (whole project): `yaw` is the three.js rotation.y of an object whose model faces -Z.
//   yaw = 0        -> facing north (-Z)
//   yaw = +PI/2    -> facing west  (-X)
//   yaw = PI       -> facing south (+Z)
//   yaw = -PI/2    -> facing east  (+X)
// forward(yaw) = (-sin yaw, 0, -cos yaw);  right(yaw) = (cos yaw, 0, -sin yaw)
export const FACE = Object.freeze({ N: 0, W: Math.PI / 2, S: Math.PI, E: -Math.PI / 2 });
export const TAU = Math.PI * 2;
export const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
export const angleDiff = (from, to) => wrapAngle(to - from);
export const lerpAngle = (a, b, t) => a + angleDiff(a, b) * t;
export const dampAngle = (a, b, lambda, dt) => a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
export const yawToForward = (yaw) => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) });
export const yawToRight = (yaw) => ({ x: Math.cos(yaw), z: -Math.sin(yaw) });
/** Yaw that faces the direction (dx, dz). */
export const forwardToYaw = (dx, dz) => Math.atan2(-dx, -dz);
/** Yaw that makes something at (x0,z0) face (x1,z1). */
export const yawBetween = (x0, z0, x1, z1) => forwardToYaw(x1 - x0, z1 - z0);

export const dist2D = (x0, z0, x1, z1) => Math.hypot(x1 - x0, z1 - z0);

// ---- Misc ---------------------------------------------------------------------------------------
let _uid = 0;
export const uid = (prefix = 'id') => `${prefix}_${(++_uid).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

export function deepClone(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

export function debounce(fn, ms) {
  let t = null;
  const d = (...a) => { if (t) clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, ms); };
  d.flush = (...a) => { if (t) { clearTimeout(t); t = null; } fn(...a); };
  d.cancel = () => { if (t) { clearTimeout(t); t = null; } };
  return d;
}

/** mm:ss (or h:mm:ss) from milliseconds. */
export function formatClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Local calendar day key "YYYY-MM-DD" for a timestamp (ms). */
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days between two day keys (b - a). */
export function daysBetween(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  const da = Date.UTC(pa[0], pa[1] - 1, pa[2]), db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((db - da) / 86400000);
}

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/** Rect helpers for layout data: rect = {x0, x1, z0, z1}. */
export const rectContains = (r, x, z, pad = 0) => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
export const rectCenter = (r) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
export const rectSize = (r) => ({ w: r.x1 - r.x0, d: r.z1 - r.z0 });
