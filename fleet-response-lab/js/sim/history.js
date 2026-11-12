// SIMULATED historical datasets (deterministic). Used by Walkthrough 3 (view builder, alert designer)
// and Walkthrough 5 (prioritization). All values are invented for training.
import { makeRng } from '../util.js';

const ROBOTS = Array.from({ length: 12 }, (_, i) => `R-${String(i + 1).padStart(2, '0')}`);
const ZONES = ['A', 'B', 'C', 'D'];

// ------------------------------------------------------------------ 14 days of task outcomes (hourly buckets)
export const TASK_INCIDENTS = [
  { id: 'H-1', label: 'R-09 encoder degrading (robot follows it into several zones)', day: 2, h0: 9, h1: 12, robots: ['R-09'], zones: null, code: 'WHEEL_FEEDBACK_FAULT', kind: 'robot' },
  { id: 'H-2', label: 'AP-3 outage: many robots fail in zone C', day: 5, h0: 14, h1: 16, robots: null, zones: ['C'], code: 'COMMS_LOSS', kind: 'zone' },
  { id: 'H-3', label: 'B-14 inventory mismatch: various robots fail in zone B', day: 8, h0: 7, h1: 10, robots: null, zones: ['B'], code: 'ITEM_NOT_FOUND', kind: 'zone' },
  { id: 'H-4', label: 'R-05 stale assignment (single robot, one zone)', day: 11, h0: 10, h1: 12, robots: ['R-05'], zones: ['A'], code: 'ACK_TIMEOUT', kind: 'robot' },
];
let _tasks = null;
export function taskHistory() {
  if (_tasks) return _tasks;
  const rng = makeRng(424242);
  const failures = []; const counts = [];
  for (let d = 0; d < 14; d++) for (let h = 6; h < 22; h++) for (const r of ROBOTS) {
    // where the robot worked this hour
    const zw = ZONES.map(() => rng() + 0.2); const tot = zw.reduce((a, b) => a + b, 0);
    for (const [zi, z] of ZONES.entries()) {
      const n = Math.round((zw[zi] / tot) * (24 + rng() * 8));
      counts.push({ d, h, robot: r, zone: z, tasks: n });
      let fails = 0;
      for (let k = 0; k < n; k++) if (rng() < 0.0035) fails++;
      for (const inc of TASK_INCIDENTS) {
        if (d !== inc.day || h < inc.h0 || h >= inc.h1) continue;
        const robotHit = inc.robots ? inc.robots.includes(r) : true;
        const zoneHit = inc.zones ? inc.zones.includes(z) : true;
        if (robotHit && zoneHit) fails += inc.kind === 'robot' ? (inc.robots.length === 1 ? (inc.zones ? 3 + Math.floor(rng() * 2) : (rng() < 0.5 ? 1 : 2)) : 1) : (rng() < 0.55 ? 1 + Math.floor(rng() * 2) : 0);
      }
      for (let k = 0; k < fails; k++) failures.push({ d, h, robot: r, zone: z, code: (TASK_INCIDENTS.find((i) => d === i.day && h >= i.h0 && h < i.h1 && (!i.robots || i.robots.includes(r)) && (!i.zones || i.zones.includes(z)))?.code) || ['OBSTACLE_TIMEOUT', 'ITEM_NOT_FOUND', 'ACK_TIMEOUT', 'PICK_RETRY_EXHAUSTED'][Math.floor(rng() * 4)] });
    }
  }
  // two random noise "bursts" (no incident): a robot with 2 failures in one hour
  failures.push({ d: 3, h: 15, robot: 'R-11', zone: 'D', code: 'OBSTACLE_TIMEOUT' }, { d: 3, h: 15, robot: 'R-11', zone: 'D', code: 'OBSTACLE_TIMEOUT' });
  failures.push({ d: 9, h: 18, robot: 'R-03', zone: 'A', code: 'PICK_RETRY_EXHAUSTED' }, { d: 9, h: 18, robot: 'R-03', zone: 'A', code: 'ACK_TIMEOUT' });
  _tasks = { failures, counts, incidents: TASK_INCIDENTS, days: 14 };
  return _tasks;
}

/** Run a view-builder query over the task history. */
export function runView(q) {
  const { failures, counts } = taskHistory();
  const win = q.window; // hours: 1, 4, 24
  const key = (x) => q.group === 'robot' ? x.robot : q.group === 'zone' ? x.zone : `${x.zone} / ${x.robot}`;
  const bucket = (x) => Math.floor((x.d * 24 + x.h) / win);
  const fl = failures.filter((f) => (!q.code || q.code === 'any' || f.code === q.code) && (!q.zone || q.zone === 'any' || f.zone === q.zone));
  const agg = new Map();
  for (const f of fl) { const k = `${bucket(f)}|${key(f)}`; const a = agg.get(k) || { b: bucket(f), g: key(f), fails: 0, robots: new Set(), zones: {}, codes: {} }; a.fails++; a.robots.add(f.robot); a.zones[f.zone] = (a.zones[f.zone] || 0) + 1; a.codes[f.code] = (a.codes[f.code] || 0) + 1; agg.set(k, a); }
  if (q.agg === 'rate') { const tc = new Map(); for (const c of counts) { const k = `${bucket(c)}|${key(c)}`; tc.set(k, (tc.get(k) || 0) + c.tasks); } for (const [k, a] of agg) a.tasks = tc.get(k) || 0; }
  const rows = [];
  for (const a of agg.values()) {
    const value = q.agg === 'count' ? a.fails : q.agg === 'distinct' ? a.robots.size : (a.tasks ? a.fails / a.tasks : null);
    const minN = q.minSample || 0;
    if (q.agg === 'rate' && (a.tasks || 0) < minN) continue;
    if (value != null && value >= q.threshold) { const startH = a.b * win; rows.push({ group: a.g, day: Math.floor(startH / 24), hour: startH % 24, value, fails: a.fails, robots: [...a.robots].join(', '), robotsList: [...a.robots], zonesList: Object.keys(a.zones), zones: Object.entries(a.zones).map(([z, n]) => `${z}×${n}`).join(' '), codes: Object.entries(a.codes).map(([c, n]) => `${c}×${n}`).join(' '), tasks: a.tasks }); }
  }
  rows.sort((x, y) => x.day - y.day || x.hour - y.hour);
  // compare with labelled incidents
  const hitInc = new Set(); let falseHits = 0;
  for (const r of rows) {
    const inc = TASK_INCIDENTS.find((i) => i.day === r.day && r.hour + win > i.h0 && r.hour < i.h1 && (!i.robots || i.robots.some((x) => r.robotsList.includes(x))) && (!i.zones || i.zones.some((z) => r.zonesList.includes(z))));
    if (inc) { hitInc.add(inc.id); r.incident = inc.id; } else falseHits++;
  }
  return { rows, detected: [...hitInc], missed: TASK_INCIDENTS.filter((i) => !hitInc.has(i.id)).map((i) => i.id), falseHits };
}

// ------------------------------------------------------------------ alert designer series (oldest open task age, 5-min samples, 7 days)
export const ALERT_INCIDENTS = [
  { id: 'A-1', label: 'Station outage (sustained)', start: 1 * 288 + 120, end: 1 * 288 + 128 },
  { id: 'A-2', label: 'Moderate slowdown (service timeouts)', start: 3 * 288 + 172, end: 3 * 288 + 176 },
  { id: 'A-3', label: 'Slow creep (stale assignments accumulating)', start: 5 * 288 + 96, end: 5 * 288 + 114 },
  { id: 'A-4', label: 'Short real incident', start: 6 * 288 + 132, end: 6 * 288 + 135 },
];
let _series = null;
export function alertSeries() {
  if (_series) return _series;
  const rng = makeRng(777);
  const v = [];
  for (let i = 0; i < 7 * 288; i++) {
    const hod = (i % 288) / 12;
    let x = hod < 6 || hod > 22 ? 40 + rng() * 30 : 80 + rng() * 70;
    if (rng() < 0.012) x = 260 + rng() * 120; // brief bursts (one sample) — not incidents
    v.push(Math.round(x));
  }
  const ramp = (inc, peak) => { for (let i = inc.start; i <= inc.end; i++) { const f = (i - inc.start) / Math.max(1, inc.end - inc.start); v[i] = Math.round(260 + f * (peak - 260) + rng() * 30); } };
  ramp(ALERT_INCIDENTS[0], 720); ramp(ALERT_INCIDENTS[1], 420); ramp(ALERT_INCIDENTS[2], 540); ramp(ALERT_INCIDENTS[3], 470);
  for (let i = 4 * 288 + 24; i < 4 * 288 + 48; i++) v[i] = null; // exporter gap: unavailable, NOT zero
  _series = { values: v, step: 5, incidents: ALERT_INCIDENTS };
  return _series;
}
/** Evaluate an alert rule over the series. */
export function evalAlert(rule) {
  const { values, incidents } = alertSeries();
  const need = Math.max(1, Math.round(rule.duration / 5)); const recNeed = Math.max(1, Math.round((rule.recoverFor || 10) / 5));
  const episodes = []; let run = 0, firing = null, recRun = 0, gapSeen = 0;
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    if (x == null) { gapSeen++; if (!firing) run = 0; continue; }
    const over = x > rule.threshold;
    if (!firing) { run = over ? run + 1 : 0; const samplesOk = run >= Math.max(need, rule.minSamples || 1); if (samplesOk) { firing = { start: i - run + 1, fired: i }; recRun = 0; } }
    else { recRun = x < (rule.recover ?? rule.threshold) ? recRun + 1 : 0; if (recRun >= recNeed) { firing.end = i; episodes.push(firing); firing = null; run = 0; } }
  }
  if (firing) { firing.end = values.length - 1; episodes.push(firing); }
  const tp = new Set(); let fp = 0; const delays = [];
  for (const e of episodes) { const inc = incidents.find((n) => e.fired >= n.start - 1 && e.fired <= n.end + 6); if (inc) { if (!tp.has(inc.id)) delays.push((e.fired - inc.start) * 5); tp.add(inc.id); e.inc = inc.id; } else fp++; }
  return { episodes, tp: [...tp], missed: incidents.filter((n) => !tp.has(n.id)).map((n) => n.id), fp, perDay: episodes.length / 7, meanDelay: delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null, gapSamples: gapSeen };
}

// ------------------------------------------------------------------ 90-day incident history (Walkthrough 5)
export const CATEGORIES = [
  { id: 'obstruction', label: 'Aisle obstruction', n: 18, down: [6, 18], orders: [2, 9], rec: [8, 20] },
  { id: 'localization', label: 'Localization / floor markers', n: 6, down: [25, 60], orders: [15, 40], rec: [30, 70] },
  { id: 'network', label: 'Wi-Fi / access point', n: 9, down: [20, 80], orders: [30, 110], rec: [25, 90] },
  { id: 'charging', label: 'Charging contacts / chargers', n: 7, down: [10, 35], orders: [1, 6], rec: [20, 50] },
  { id: 'drive', label: 'Drive motor / encoder', n: 8, down: [30, 110], orders: [4, 14], rec: [40, 150] },
  { id: 'station', label: 'Station hardware', n: 5, down: [20, 45], orders: [25, 60], rec: [20, 50] },
  { id: 'inventory', label: 'Inventory record mismatch', n: 10, down: [8, 22], orders: [6, 18], rec: [15, 40] },
  { id: 'release', label: 'Software release regression', n: 2, down: [70, 170], orders: [180, 420], rec: [60, 180] },
  { id: 'timeout', label: 'Service timeout (configuration)', n: 3, down: [30, 70], orders: [60, 150], rec: [35, 80] },
  { id: 'stale', label: 'Stale task assignment', n: 4, down: [15, 40], orders: [2, 9], rec: [20, 45] },
];
export const CANDIDATES = [
  { id: 'c1', label: 'Obstruction alert grouped by location + tote inspection routine', covers: 'obstruction', effort: 5, reduction: 50 },
  { id: 'c2', label: 'AP health monitoring + replace failing AP-3 cabling', covers: 'network', effort: 8, reduction: 60 },
  { id: 'c3', label: 'Canary releases with ack-timeout-rate gate', covers: 'release', effort: 15, reduction: 70 },
  { id: 'c4', label: 'Configuration change review for service settings', covers: 'timeout', effort: 4, reduction: 60 },
  { id: 'c5', label: 'Fleet-manager session reconciliation fix', covers: 'stale', effort: 10, reduction: 90 },
  { id: 'c6', label: 'Putaway scan verification', covers: 'inventory', effort: 12, reduction: 50 },
  { id: 'c7', label: 'Preventive wheel/encoder inspection', covers: 'drive', effort: 6, reduction: 40 },
  { id: 'c8', label: 'Charger contact cleaning in preventive maintenance', covers: 'charging', effort: 3, reduction: 50 },
];
let _inc = null;
export function incidentHistory() {
  if (_inc) return _inc;
  const rng = makeRng(90210);
  const rows = []; let id = 1;
  const r = ([a, b]) => Math.round(a + rng() * (b - a));
  for (const c of CATEGORIES) {
    for (let k = 0; k < c.n; k++) {
      const day = Math.floor(rng() * 90);
      let zone = ['A', 'B', 'C', 'D', 'S'][Math.floor(rng() * 5)];
      if (c.id === 'network' && zone === 'D' && day < 40) zone = 'C'; // zone D had no exporter before day 40 → under-reported
      const down = r(c.down);
      const row = { id: `I-${String(id++).padStart(3, '0')}`, day, category: c.id, label: c.label, downtime: down, orders: r(c.orders), lostTasks: Math.round(down * (5 + rng() * 2)), recovery: r(c.rec), repeat: false, confidence: rng() < 0.6 ? 'high' : rng() < 0.75 ? 'medium' : 'low', parent: null, source: rng() < 0.5 ? 'alarm' : 'ops report', zone };
      if (c.id === 'inventory' && rng() < 0.5) row.confidence = 'low';
      rows.push(row);
      // the same network event was ALSO logged as "robot offline" tickets per robot (symptom counted multiple times)
      if (c.id === 'network') { const dups = 1 + Math.floor(rng() * 2); for (let j = 0; j < dups; j++) rows.push({ ...row, id: `I-${String(id++).padStart(3, '0')}`, label: 'Robot offline (symptom ticket)', category: 'network', parent: row.id, downtime: Math.round(down * 0.8), orders: Math.round(row.orders * 0.6), lostTasks: Math.round(row.lostTasks * 0.8), source: 'ops report', confidence: 'medium' }); }
    }
  }
  rows.sort((a, b) => a.day - b.day);
  // repeats: same category + zone within 14 days
  for (const x of rows) x.repeat = rows.some((y) => y !== x && !y.parent && !x.parent && y.category === x.category && y.zone === x.zone && y.day < x.day && x.day - y.day <= 14);
  _inc = rows;
  return rows;
}
export function followUp(candidateId) {
  // Simulated: baseline = last 30 days, follow-up = next 30 days with ~11% more orders (different workload!)
  const rng = makeRng(candidateId.charCodeAt(1) * 97);
  const base = incidentHistory().filter((x) => x.day >= 60 && !x.parent);
  const cand = CANDIDATES.find((c) => c.id === candidateId);
  const orders = { baseline: 126000, followup: 139800 };
  const byCat = (rows) => { const o = {}; for (const x of rows) o[x.category] = (o[x.category] || 0) + 1; return o; };
  const b = byCat(base); const f = {};
  for (const c of CATEGORIES) { const n = b[c.id] || 0; let m = n * (orders.followup / orders.baseline) * (0.75 + rng() * 0.5); if (c.id === cand.covers) m = m * (1 - (cand.reduction / 100) * (0.5 + rng() * 0.5)); f[c.id] = Math.max(0, Math.round(m)); }
  return { orders, baseline: b, followup: f, covers: cand.covers };
}
