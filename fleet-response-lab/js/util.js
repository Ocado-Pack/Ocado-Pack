// Shared helpers (DOM-free unless noted). Everything in this app is a SIMULATION.

export function rngNext(state) {
  // mulberry32 step; returns [value 0..1, newState]
  let t = (state + 0x6D2B79F5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

export function makeRng(seed) {
  let s = seed >>> 0;
  const f = () => { const [v, n] = rngNext(s); s = n; return v; };
  f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return f;
}

export const pad = (n, w = 2) => String(n).padStart(w, '0');

/** Format seconds-of-day as HH:MM:SS(.mmm) */
export function fmtClock(sec, ms = false) {
  const s = ((sec % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  const base = `${pad(h)}:${pad(m)}:${pad(x)}`;
  return ms ? `${base}.${pad(Math.floor((s % 1) * 1000), 3)}` : base;
}

export function fmtDur(sec) {
  if (sec == null || !isFinite(sec)) return '—';
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return `${m}m ${pad(s)}s`;
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function round(v, d = 1) { const p = 10 ** d; return Math.round(v * p) / p; }
export function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
export function uid(prefix = 'id') { return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`; }

/** Browser-only: download a text file. */
export function download(filename, text, mime = 'text/markdown') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/** Simple keyword check helper used by transparent checklist scoring. */
export function hasAny(text, words) {
  const t = String(text || '').toLowerCase();
  return words.some((w) => t.includes(w));
}
