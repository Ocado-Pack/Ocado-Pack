// Voltage Lab simulation engine.
// Pure logic, no DOM and no 3D: circuits are solved by nodal analysis and the
// meter reading is derived from the actual equipment state. Nothing is random.

export const R_METER = 10e6; // input resistance of the simulated voltmeter (ohms)
const GMIN = 1e-12; // tiny leak to reference so floating nodes stay solvable

export const DIAL = ['OFF', 'VDC', 'VAC', 'OHM', 'A'];
export const JACKS = ['A', 'mA', 'COM', 'V'];
export const RANGES = ['AUTO', 2, 20, 200];
export const RANGE_INFO = {
  2: { max: 1.999, dec: 3, res: 0.001 },
  20: { max: 19.99, dec: 2, res: 0.01 },
  200: { max: 199.9, dec: 1, res: 0.1 },
};
export const CHECK_ITEMS = ['inspect', 'jacks', 'func', 'range', 'points', 'guards', 'bridge'];

// Element types: v = ideal voltage source (a is +), w = wire, s = switch, r = resistor.
// `fault` names a fault that opens the element. `alt` gives a source a different
// voltage while a fault is active. `wireUnless` marks a series resistance that
// exists only while a fault is active (otherwise the element is a plain wire).
export const CIRCUITS = {
  aa: { kind: 'dc', ref: 'n', el: [{ t: 'v', a: 'p', b: 'n', v: 1.58, alt: { fault: 'aa_low', v: 1.08 } }] },
  b9: { kind: 'dc', ref: 'n', el: [{ t: 'v', a: 'p', b: 'n', v: 9.36, alt: { fault: 'b9_low', v: 6.85 } }] },
  lamp9: {
    kind: 'dc', ref: 'bn', el: [
      { t: 'v', a: 'bi', b: 'bn', v: 9, alt: { fault: 'l9_bat', v: 7.2 } },
      { t: 'r', a: 'bi', b: 'bp', r: 400, wireUnless: 'l9_bat' },
      { t: 'w', a: 'bp', b: 's1' },
      { t: 's', a: 's1', b: 's2', sw: 'lamp9', fault: 'l9_sw' },
      { t: 'w', a: 's2', b: 'lp', fault: 'l9_w2' },
      { t: 'r', a: 'lp', b: 'ln', r: 90, lamp: 'lamp9', nominal: 9, fault: 'l9_lamp' },
      { t: 'w', a: 'ln', b: 'bn', fault: 'l9_w3' },
    ],
  },
  panel24: {
    kind: 'dc', ref: 'vn', el: [
      { t: 'v', a: 'vp', b: 'vn', v: 24, alt: { fault: 'p_sup', v: 0 } },
      { t: 'w', a: 'vp', b: 's1' },
      { t: 's', a: 's1', b: 's2', sw: 'panel24', fault: 'p_sw' },
      { t: 'w', a: 's2', b: 'lp', fault: 'w2open' },
      { t: 'r', a: 'lp', b: 'ln', r: 1200, lamp: 'panel24', nominal: 24, fault: 'p_lamp' },
      { t: 'w', a: 'ln', b: 'vn', fault: 'p_w3' },
    ],
  },
  ac12: { kind: 'ac', ref: 'b', freq: 60, el: [{ t: 'v', a: 'a', b: 'b', v: 12, alt: { fault: 'ac_off', v: 0 } }] },
};

// Test points. `bridge` marks a gap between two adjacent terminals: a probe tip
// placed there would touch both at once, so contact is always blocked.
export const TERMINALS = {
  'aa+': { c: 'aa', n: 'p', label: 'AA +' },
  'aa-': { c: 'aa', n: 'n', label: 'AA −' },
  'b9+': { c: 'b9', n: 'p', label: '9V +' },
  'b9-': { c: 'b9', n: 'n', label: '9V −' },
  b9x: { c: 'b9', bridge: ['b9+', 'b9-'] },
  tp1: { c: 'lamp9', n: 'bp', label: 'TP1' },
  tp2: { c: 'lamp9', n: 's1', label: 'TP2' },
  tp3: { c: 'lamp9', n: 's2', label: 'TP3' },
  tp4: { c: 'lamp9', n: 'lp', label: 'TP4' },
  tp5: { c: 'lamp9', n: 'ln', label: 'TP5' },
  tp6: { c: 'lamp9', n: 'bn', label: 'TP6' },
  x1: { c: 'panel24', n: 'vp', label: 'X1 +24V' },
  x2: { c: 'panel24', n: 'vn', label: 'X2 0V' },
  x12: { c: 'panel24', bridge: ['x1', 'x2'] },
  x3: { c: 'panel24', n: 's1', label: 'X3' },
  x4: { c: 'panel24', n: 's2', label: 'X4' },
  x5: { c: 'panel24', n: 'lp', label: 'X5' },
  x6: { c: 'panel24', n: 'ln', label: 'X6' },
  ac1: { c: 'ac12', n: 'a', label: 'AC 1' },
  ac2: { c: 'ac12', n: 'b', label: 'AC 2' },
};

function solveLinear(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-18) continue;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      if (!f) continue;
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = Math.abs(A[i][i]) < 1e-18 ? 0 : s / A[i][i];
  }
  return x;
}

// Modified nodal analysis. Closed switches and intact wires merge nodes;
// `meter` (a pair of node names) adds the voltmeter's input resistance.
export function solveCircuit(cid, switches = {}, faults = {}, meter = null) {
  const c = typeof cid === 'string' ? CIRCUITS[cid] : cid; // a circuit id or a circuit description
  const parent = {};
  const find = (n) => {
    if (!(n in parent)) parent[n] = n;
    while (parent[n] !== n) n = parent[n];
    return n;
  };
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (const e of c.el) {
    find(e.a); find(e.b);
    const open = e.fault && faults[e.fault];
    if (e.t === 'w' && !open) union(e.a, e.b);
    if (e.t === 's' && switches[e.sw] && !open) union(e.a, e.b);
    if (e.t === 'r' && e.wireUnless && !faults[e.wireUnless]) union(e.a, e.b);
  }
  const ref = find(c.ref);
  const roots = [...new Set(Object.keys(parent).map(find))].filter((r) => r !== ref);
  const idx = new Map(roots.map((r, i) => [r, i]));
  const sources = c.el.filter((e) => e.t === 'v' && find(e.a) !== find(e.b));
  const n = roots.length;
  const N = n + sources.length;
  const A = Array.from({ length: N }, () => new Array(N).fill(0));
  const z = new Array(N).fill(0);
  const stamp = (a, b, g) => {
    const ia = idx.get(find(a));
    const ib = idx.get(find(b));
    if (ia === ib) return;
    if (ia !== undefined) A[ia][ia] += g;
    if (ib !== undefined) A[ib][ib] += g;
    if (ia !== undefined && ib !== undefined) { A[ia][ib] -= g; A[ib][ia] -= g; }
  };
  for (let i = 0; i < n; i++) A[i][i] += GMIN;
  for (const e of c.el) if (e.t === 'r' && !(e.fault && faults[e.fault])) stamp(e.a, e.b, 1 / e.r);
  if (meter) stamp(meter[0], meter[1], 1 / R_METER);
  sources.forEach((e, k) => {
    const ia = idx.get(find(e.a));
    const ib = idx.get(find(e.b));
    if (ia !== undefined) { A[n + k][ia] = 1; A[ia][n + k] = 1; }
    if (ib !== undefined) { A[n + k][ib] = -1; A[ib][n + k] = -1; }
    z[n + k] = e.alt && faults[e.alt.fault] ? e.alt.v : e.v;
  });
  const x = solveLinear(A, z);
  const v = (node) => {
    const r = find(node);
    return r === ref ? 0 : x[idx.get(r)];
  };
  return { v, same: (a, b) => find(a) === find(b) };
}

const clone = (o) => JSON.parse(JSON.stringify(o));

function defaultState() {
  return {
    dial: 'OFF',
    range: 'AUTO',
    hold: false,
    plugs: { red: null, black: null }, // which jack each lead is plugged into
    probes: { red: null, black: null }, // which terminal each probe tip touches
    near: { red: null, black: null }, // probe hovering beside a terminal (no contact)
    switches: { lamp9: false, panel24: false },
    faults: {},
    faultRevealed: false,
    damaged: { red: false, black: false },
    inspected: { meter: false, red: false, black: false },
    checklist: { jacks: false, func: false, range: false, guards: false, bridge: false },
    intended: [], // terminals the learner identified as the intended test points
  };
}

export class Sim {
  constructor() {
    this.listeners = [];
    this.guards = [];
    this.reset();
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { for (const fn of this.listeners) fn(ev); }

  reset(patch) {
    this.state = defaultState();
    if (patch) this.merge(patch);
    this.time = 0;
    this.filtered = 0;
    this.settleT = 0;
    this.settled = false;
    this.held = null;
    this.holdSig = null;
    this.cond = {};
    this.lastSig = '';
    this.refreshT = 1;
    this.live = this.format(0);
    this.display = this.live;
    this.emit({ type: 'reset' });
  }

  merge(patch) {
    const s = this.state;
    for (const k of Object.keys(patch)) {
      const v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(s[k], v);
      else s[k] = Array.isArray(v) ? [...v] : v;
    }
    if (!s.hold) this.held = null;
  }

  // Instructor/lesson presets (not learner actions).
  setup(patch) { this.merge(patch); this.settleT = 0; this.settled = false; this.emit({ type: 'setup' }); }

  snapshot() { return { state: clone(this.state), held: this.held && clone(this.held), holdSig: this.holdSig }; }
  restore(snap) {
    this.state = clone(snap.state);
    this.held = snap.held && clone(snap.held);
    this.holdSig = snap.holdSig;
    this.settleT = 0; this.settled = false; this.cond = {};
    this.emit({ type: 'restore' });
  }

  fail(code, extra = {}) {
    this.emit({ type: 'error', code, ...extra });
    return { ok: false, code, ...extra };
  }

  anyContact() { return !!(this.state.probes.red || this.state.probes.black); }
  isVMode() { return this.state.dial === 'VDC' || this.state.dial === 'VAC'; }
  jacksOK() { return this.state.plugs.black === 'COM' && this.state.plugs.red === 'V'; }
  currentJackUsed() { return ['red', 'black'].some((l) => ['A', 'mA'].includes(this.state.plugs[l])); }
  inspectDone() {
    const s = this.state;
    return s.inspected.meter && s.inspected.red && s.inspected.black && !s.damaged.red && !s.damaged.black;
  }
  checkItem(item) {
    const s = this.state;
    if (item === 'inspect') return this.inspectDone();
    if (item === 'points') return s.intended.length >= 1;
    return !!s.checklist[item];
  }
  missingChecklist() { return CHECK_ITEMS.filter((i) => !this.checkItem(i)); }
  checklistComplete() { return this.missingChecklist().length === 0; }
  newExercise() {
    const s = this.state;
    s.inspected = { meter: false, red: false, black: false };
    s.checklist = { jacks: false, func: false, range: false, guards: false, bridge: false };
    s.intended = [];
    this.emit({ type: 'checklist' });
  }

  // ---- learner actions ---------------------------------------------------

  inspect(item) {
    const s = this.state;
    s.inspected[item] = true;
    const damaged = item !== 'meter' && s.damaged[item];
    this.emit({ type: 'inspect', item, damaged });
    return { ok: true, damaged };
  }

  replaceLead(lead) {
    if (this.anyContact()) return this.fail('change_connected', { what: 'lead' });
    this.state.damaged[lead] = false;
    this.state.inspected[lead] = true;
    this.emit({ type: 'replace', lead });
    return { ok: true };
  }

  plug(lead, jack) {
    const s = this.state;
    if (s.plugs[lead] === jack) return { ok: true };
    if (this.anyContact()) return this.fail('change_connected', { what: 'jack' });
    const other = lead === 'red' ? 'black' : 'red';
    if (jack && s.plugs[other] === jack) return this.fail('jack_taken', { jack });
    s.plugs[lead] = jack;
    s.checklist.jacks = false;
    this.emit({ type: 'plug', lead, jack });
    if (jack === 'A' || jack === 'mA') this.emit({ type: 'detect', code: 'wrong_jack', lead, jack });
    return { ok: true };
  }

  setDial(pos) {
    const s = this.state;
    if (s.dial === pos) return { ok: true };
    if (this.anyContact()) return this.fail('change_connected', { what: 'function' });
    s.dial = pos;
    s.hold = false; this.held = null;
    s.checklist.func = false;
    this.emit({ type: 'dial', pos });
    return { ok: true };
  }

  setRange(r) {
    const s = this.state;
    if (!this.isVMode()) return this.fail('range_na');
    if (s.range === r) return { ok: true };
    s.range = r;
    s.checklist.range = false;
    this.emit({ type: 'range', range: r });
    return { ok: true };
  }
  cycleRange() {
    const i = RANGES.indexOf(this.state.range);
    return this.setRange(RANGES[(i + 1) % RANGES.length]);
  }

  toggleHold() {
    const s = this.state;
    if (s.dial === 'OFF') return this.fail('meter_off_btn');
    s.hold = !s.hold;
    if (s.hold) { this.held = { ...this.live }; this.holdSig = this.connSig(); } else this.held = null;
    this.emit({ type: 'hold', on: s.hold });
    return { ok: true };
  }

  // Lesson/assessment preset: a frozen value left on the display from earlier.
  presetHold(d) {
    this.state.hold = true;
    this.held = { on: true, neg: false, unit: 'V', mode: 'DC', rangeSel: this.state.range, rangeActive: 20, ol: false, hold: true, ...d };
    this.holdSig = 'preset';
  }

  toggleSwitch(id, value) {
    const s = this.state;
    s.switches[id] = value === undefined ? !s.switches[id] : !!value;
    this.emit({ type: 'switch', id, closed: s.switches[id] });
    return { ok: true };
  }

  identify(term) {
    const s = this.state;
    if (TERMINALS[term].bridge) return { ok: false };
    if (s.intended.includes(term)) s.intended = s.intended.filter((t) => t !== term);
    else if (s.intended.length < 2) s.intended.push(term);
    else s.intended = [term];
    this.emit({ type: 'identify', term, intended: [...s.intended] });
    return { ok: true };
  }
  setIntended(list) { this.state.intended = [...list]; this.emit({ type: 'identify', intended: [...list] }); }

  confirm(item) {
    const s = this.state;
    if (item === 'jacks') {
      if (this.currentJackUsed()) return this.fail('unsafe_jack');
      if (s.plugs.red === 'COM' && s.plugs.black === 'V') return this.fail('swapped_jacks');
      if (!this.jacksOK()) return this.fail('lead_unplugged');
    }
    if ((item === 'func' || item === 'range') && !this.isVMode()) return this.fail('func_not_voltage');
    s.checklist[item] = true;
    this.emit({ type: 'confirm', item });
    return { ok: true };
  }

  grip(lead, part) {
    if (part === 'tip') return this.fail('tip_grip', { lead });
    this.emit({ type: 'grip', lead, part });
    return { ok: part === 'handle' };
  }

  touch(lead, term) {
    const s = this.state;
    for (const g of this.guards) {
      const e = g('touch', { lead, term });
      if (e) return this.fail(e, { lead, term });
    }
    if (this.currentJackUsed()) return this.fail('unsafe_jack', { lead, term });
    const jacks = [s.plugs.red, s.plugs.black];
    if (!jacks.includes('COM') || !jacks.includes('V')) return this.fail('lead_unplugged', { lead, term });
    if (s.dial === 'OFF') return this.fail('meter_off', { lead, term });
    if (!this.isVMode()) return this.fail('func_block', { lead, term });
    const missing = this.missingChecklist();
    if (missing.length) return this.fail('precheck', { lead, term, missing });
    if (TERMINALS[term].bridge) return this.fail('bridge', { lead, term });
    if (!s.intended.includes(term)) return this.fail('unplanned_point', { lead, term });
    s.probes[lead] = term;
    s.near[lead] = null;
    this.emit({ type: 'contact', lead, term });
    return { ok: true };
  }

  lift(lead) {
    const s = this.state;
    const had = s.probes[lead];
    s.probes[lead] = null;
    s.near[lead] = null;
    if (had) this.emit({ type: 'lift', lead, term: had });
    else this.emit({ type: 'park', lead });
    return { ok: true };
  }

  // Probe released close to a terminal but not on it: no electrical contact.
  nearMiss(lead, term) {
    const s = this.state;
    const had = s.probes[lead];
    s.probes[lead] = null;
    s.near[lead] = term;
    if (had) this.emit({ type: 'lift', lead, term: had });
    this.emit({ type: 'detect', code: 'no_contact', lead, term });
    return { ok: false, code: 'no_contact' };
  }

  // ---- measurement -------------------------------------------------------

  // Which lead is in the V jack ("hi") and which is in COM ("lo").
  leadRoles() {
    const p = this.state.plugs;
    const hi = p.red === 'V' ? 'red' : p.black === 'V' ? 'black' : null;
    const lo = p.red === 'COM' ? 'red' : p.black === 'COM' ? 'black' : null;
    return { hi, lo };
  }

  meterNodes(cid) {
    const s = this.state;
    const { hi, lo } = this.leadRoles();
    if (!hi || !lo) return null;
    const tHi = TERMINALS[s.probes[hi]];
    const tLo = TERMINALS[s.probes[lo]];
    if (!tHi || !tLo || tHi.c !== cid || tLo.c !== cid) return null;
    return [tHi.n, tLo.n];
  }

  solve(cid) {
    const s = this.state;
    return solveCircuit(cid, s.switches, s.faults, this.meterNodes(cid));
  }

  lampLevel(id) {
    const cid = id;
    const e = CIRCUITS[cid].el.find((x) => x.lamp === id);
    if (e.fault && this.state.faults[e.fault]) return 0;
    const sol = this.solve(cid);
    return Math.abs(sol.v(e.a) - sol.v(e.b)) / e.nominal;
  }
  lampOn(id) { return this.lampLevel(id) > 0.5; }

  reading() {
    const s = this.state;
    const r = { power: s.dial !== 'OFF', mode: s.dial, valid: false, reason: null, value: 0 };
    if (!r.power) { r.reason = 'off'; return r; }
    if (!this.isVMode()) { r.reason = 'not_voltage'; return r; }
    const { hi, lo } = this.leadRoles();
    if (!hi || !lo) { r.reason = 'leads'; return r; }
    const tHi = TERMINALS[s.probes[hi]];
    const tLo = TERMINALS[s.probes[lo]];
    if (!tHi || !tLo) { r.reason = 'open'; r.openLeads = ['red', 'black'].filter((l) => !s.probes[l]); return r; }
    if (tHi.c !== tLo.c) { r.reason = 'separate'; return r; }
    const c = CIRCUITS[tHi.c];
    const sol = this.solve(tHi.c);
    const diff = sol.v(tHi.n) - sol.v(tLo.n);
    r.valid = true;
    r.circuit = tHi.c;
    r.kind = c.kind;
    r.diff = diff;
    r.swapped = hi === 'black';
    r.sameNode = sol.same(tHi.n, tLo.n);
    if (c.kind === 'dc') {
      // This simulated meter is AC-coupled in V~: steady DC reads about zero.
      r.mismatch = s.dial === 'VAC';
      r.value = r.mismatch ? 0 : diff;
    } else {
      // Sine source: V~ shows RMS; V⎓ shows the average, which is about zero.
      r.mismatch = s.dial === 'VDC';
      r.value = r.mismatch ? 0 : Math.abs(diff);
    }
    return r;
  }

  // Deterministic stand-in for stray pickup on an open, high-impedance input.
  drift() {
    const t = this.time;
    if (this.state.dial === 'VAC') return 0.012 + 0.006 * Math.sin(0.7 * t) + 0.003 * Math.sin(1.9 * t + 0.4);
    return 0.0035 * Math.sin(0.9 * t) + 0.002 * Math.sin(2.3 * t + 1.3) + 0.001 * Math.sin(5.1 * t);
  }

  activeRange(absV) {
    const sel = this.state.range;
    if (sel !== 'AUTO') return sel;
    for (const r of [2, 20, 200]) if (absV <= RANGE_INFO[r].max + RANGE_INFO[r].res / 2) return r;
    return 200;
  }

  format(value) {
    const s = this.state;
    const d = { on: s.dial !== 'OFF', digits: '', neg: false, unit: '', mode: '', rangeSel: s.range, rangeActive: null, hold: false, ol: false };
    if (!d.on) return d;
    if (s.dial === 'OHM') { d.digits = '----'; d.unit = 'Ω'; d.mode = 'OHM'; return d; }
    if (s.dial === 'A') { d.digits = '----'; d.unit = 'A'; d.mode = 'A'; return d; }
    d.mode = s.dial === 'VDC' ? 'DC' : 'AC';
    d.unit = 'V';
    const abs = Math.abs(value);
    const ra = this.activeRange(abs);
    const info = RANGE_INFO[ra];
    d.rangeActive = ra;
    if (abs > info.max + info.res / 2) { d.ol = true; d.digits = 'OL'; return d; }
    d.digits = abs.toFixed(info.dec);
    d.neg = value < -info.res / 2;
    return d;
  }

  connSig() {
    const s = this.state;
    return [s.dial, s.plugs.red, s.plugs.black, s.probes.red, s.probes.black,
      s.switches.lamp9, s.switches.panel24, JSON.stringify(s.faults)].join('|');
  }

  displayText(d = this.display) {
    if (!d.on) return '';
    return `${d.neg ? '−' : ''}${d.digits} ${d.unit}`.trim();
  }

  holdStale() {
    const s = this.state;
    if (!s.hold || !this.held) return false;
    return this.holdSig !== this.connSig() || this.held.digits !== this.live.digits || this.held.neg !== this.live.neg;
  }

  tick(dt) {
    const s = this.state;
    this.time += dt;
    const r = this.reading();
    const sig = this.connSig();
    if (sig !== this.lastSig) { this.lastSig = sig; this.settleT = 0; this.settled = false; }
    let target = 0;
    if (r.valid) {
      target = r.value;
      this.filtered += (target - this.filtered) * (1 - Math.exp(-dt / 0.18));
      const res = RANGE_INFO[this.activeRange(Math.abs(target))].res;
      if (Math.abs(target - this.filtered) < res / 2) { this.filtered = target; this.settleT += dt; } else this.settleT = 0;
      this.settled = this.settleT > 0.3;
    } else {
      this.filtered = this.isVMode() ? this.drift() : 0;
      this.settleT = 0;
      this.settled = false;
    }
    this.refreshT += dt;
    if (this.refreshT >= 0.2 || this.settled) {
      this.refreshT = 0;
      this.live = this.format(this.filtered);
    }
    this.display = s.hold && this.held ? { ...this.held, hold: true } : this.live;

    // Edge-triggered coaching detections.
    const info = RANGE_INFO[this.activeRange(Math.abs(target))];
    const oneOpen = this.isVMode() && !r.valid && r.reason === 'open' && this.anyContact();
    const cond = {
      mode_mismatch: r.valid && r.mismatch && this.settled,
      range_low: r.valid && s.range !== 'AUTO' && Math.abs(target) > info.max + info.res / 2,
      reversed: r.valid && this.settled && r.kind === 'dc' && s.dial === 'VDC' && !r.swapped && r.value < -info.res / 2,
      same_node: r.valid && this.settled && r.sameNode,
      hold_stale: this.holdStale(),
      swapped_jacks: !!r.swapped && r.valid,
      floating: oneOpen,
    };
    for (const k of Object.keys(cond)) if (cond[k] && !this.cond[k]) this.emit({ type: 'detect', code: k });
    this.cond = cond;
    return r;
  }

  // Test helper: run the meter until the reading has settled.
  settle(seconds = 3) {
    for (let t = 0; t < seconds; t += 0.05) this.tick(0.05);
    return this.display;
  }
}
