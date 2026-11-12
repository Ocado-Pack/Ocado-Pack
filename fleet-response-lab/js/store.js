// Local progress storage (browser localStorage). Nothing is sent anywhere.
import { uid } from './util.js';

const KEY = 'rfrl.v1';
const DAY = 86400000;
export const SKILLS = {
  diagnosis: 'Evidence-based diagnosis',
  system: 'System understanding',
  software: 'Software investigation',
  observability: 'Observability',
  verification: 'Recovery verification',
  documentation: 'Documentation',
  communication: 'Operations communication',
};
const BOX_INTERVALS = [0, 1, 3, 7, 14]; // days

const DEFAULTS = () => ({
  version: 1,
  settings: { quality: 'auto', reducedMotion: matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false, captions: true, narration: false, mode: 'guided', textScale: 1, highContrast: false, packs: { mobile: true, stations: true, charging: true, network: true, conveyors: false, plc: false } },
  onboarding: { step: 0, done: false },
  seenTerms: {},
  attempts: [],
  current: null,
  review: [],
  runbooks: [],
  dashboard: { widgets: ['availability', 'tasksPerHour', 'successRate', 'oldestAge'] },
  alerts: [],
  views: [],
  priorities: null,
  ops: [],
  interview: [],
  exercises: {},
  realExperience: '',
  walkthroughs: {},
});

let state = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return DEFAULTS(); const d = JSON.parse(raw); const def = DEFAULTS(); return { ...def, ...d, settings: { ...def.settings, ...(d.settings || {}), packs: { ...def.settings.packs, ...(d.settings?.packs || {}) } } }; }
  catch { return DEFAULTS(); }
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) {
    // quota: drop large in-progress snapshot and retry once
    if (state.current?.snapshot) { state.current.snapshot = null; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }
  }
  for (const fn of subs) fn(state);
}
export const store = {
  get: () => state,
  subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  update(fn) { fn(state); save(); },
  reset(part) {
    if (!part || part === 'all') { const keepSettings = state.settings; state = DEFAULTS(); state.settings = keepSettings; }
    else if (part === 'review') state.review = [];
    else if (part === 'attempts') { state.attempts = []; state.current = null; }
    else if (part === 'onboarding') state.onboarding = { step: 0, done: false };
    save();
  },
  exportJSON: () => JSON.stringify(state, null, 2),
  importJSON(text) { const d = JSON.parse(text); if (!d || d.version !== 1) throw new Error('Not a Robotics Fleet Response Lab progress file'); state = { ...DEFAULTS(), ...d }; save(); },
};

// ---------------------------------------------------------------- review queue (Leitner boxes)
export function addReview(item) {
  // de-duplicate by signature
  const sig = item.sig || `${item.kind}:${item.prompt}`;
  if (state.review.some((r) => r.sig === sig && r.box < 3)) return;
  state.review.push({ id: uid('rv'), sig, box: 0, due: Date.now(), created: Date.now(), history: [], ...item });
  save();
}
export function dueReviews(now = Date.now()) { return state.review.filter((r) => r.due <= now).sort((a, b) => a.due - b.due); }
export function answerReview(id, correct) {
  const r = state.review.find((x) => x.id === id); if (!r) return;
  r.history.push({ t: Date.now(), correct });
  r.box = correct ? Math.min(4, r.box + 1) : 0;
  r.due = Date.now() + BOX_INTERVALS[r.box] * DAY + (correct ? 0 : 60000);
  save();
}

// ---------------------------------------------------------------- skills
export function skillSummary() {
  const out = {};
  for (const k of Object.keys(SKILLS)) out[k] = { n: 0, avg: null, last: [] };
  for (const a of state.attempts) {
    for (const [k, v] of Object.entries(a.skills || {})) { if (!out[k] || v == null) continue; out[k].n++; out[k].last.push(v); }
  }
  for (const k of Object.keys(out)) { const L = out[k].last.slice(-5); out[k].avg = L.length ? Math.round(L.reduce((a, b) => a + b, 0) / L.length) : null; out[k].last = L; }
  return out;
}
export function seenTerm(t) { if (state.seenTerms[t]) return true; state.seenTerms[t] = Date.now(); return false; }
