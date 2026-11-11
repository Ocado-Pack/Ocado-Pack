// Voltage Lab — application controller and side panel.
import { Sim, TERMINALS, DIAL, RANGES, JACKS, CHECK_ITEMS, RANGE_INFO } from './sim.js';
import { T, tr, h, esc, spoken, setLang, getLang, UI, PARTS, GLOSSARY, COACH, DIAL_NAMES, DIAL_SHORT, JACK_NAMES } from './i18n.js';
import { LESSONS } from './lessons.js';
import { TASKS, ERROR_LESSON } from './assessment.js';
import { renderDiagram, diagramTerms, drawWave } from './diagrams.js';
import { createScene } from './scene.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, window.__voltageLabFast ? Math.min(ms, 25) : ms));
const REST_OF = { l0: 'home', l1: 'center', l2: 'center', l3: 'center', l4: 'center', l5: 'center', l6: 'right', l7: 'right' };
const SILENT = ['predict_first', 'jack_taken', 'range_na', 'meter_off_btn', 'floating', 'damaged_lead'];
const CK_LABEL = { inspect: UI.ckInspect, jacks: UI.ckJacks, func: UI.ckFunc, range: UI.ckRange, points: UI.ckPoints, guards: UI.ckGuards, bridge: UI.ckBridge };

const sim = new Sim();
const store = (() => { try { return JSON.parse(localStorage.getItem('voltage-lab') || '{}'); } catch (e) { return {}; } })();
const save = () => { try { localStorage.setItem('voltage-lab', JSON.stringify({ lang: getLang(), mode: app.mode, narration: app.narration, captions: app.captions, completed: app.completed })); } catch (e) { /* storage unavailable */ } };

const app = {
  mode: ['guided', 'practice', 'assess'].includes(store.mode) ? store.mode : 'guided',
  narration: !!store.narration,
  captions: store.captions !== false,
  completed: store.completed || {},
  lessonIdx: 0, stepIdx: 0, finished: false,
  ctx: null, snapshots: {}, log: [], started: 0,
  ui: { selected: null, hoverTerm: null, highlights: [], rest: 'home' },
  coach: null, info: null, inspMsg: null, demo: false, caption: null, flash: null,
  errors: {},
  as: { started: false, idx: 0, results: {}, submitted: false, feedback: null, notes: new Set(), report: false },
};
setLang(store.lang || ((navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en'));

const newCtx = () => ({ events: [], clicked: new Set(), form: {} });
const lesson = () => LESSONS[app.lessonIdx];
const curStep = () => (app.mode === 'assess' ? null : lesson().steps[app.stepIdx]);
const curTask = () => (app.mode === 'assess' && app.as.started && !app.as.report ? TASKS[app.as.idx] : null);
const termLabel = (id) => (id && TERMINALS[id] && TERMINALS[id].label) || '—';
const colorName = (lead) => tr(lead === 'red' ? UI.red : UI.black);
const itemName = (i) => tr(i === 'meter' ? UI.meterBody : i === 'red' ? UI.redLead : UI.blackLead);

// ---------------------------------------------------------------------------
// Narration and captions
// ---------------------------------------------------------------------------
const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
function speak(text) {
  if (!app.narration || !canSpeak) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const lg = getLang();
    u.lang = lg === 'es' ? 'es-ES' : 'en-US';
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith(lg));
    if (v) u.voice = v;
    u.rate = 0.96;
    speechSynthesis.speak(u);
  } catch (e) { /* narration is optional */ }
}
function narrateStep() {
  const s = curStep();
  if (!s) return;
  speak([s.title, s.goal, s.why, s.action].filter(Boolean).map((x) => spoken(x)).join('. '));
}
function setCaption(text, ms) {
  app.caption = text ? { text, until: ms ? performance.now() + ms : Infinity } : null;
}

// ---------------------------------------------------------------------------
// Coaching
// ---------------------------------------------------------------------------
const stateResolve = {
  unsafe_jack: () => sim.jacksOK(),
  wrong_jack: () => !sim.currentJackUsed(),
  swapped_jacks: () => sim.jacksOK(),
  lead_unplugged: () => sim.jacksOK(),
  precheck: () => sim.checklistComplete(),
  func_not_voltage: () => sim.isVMode(),
  meter_off: () => sim.state.dial !== 'OFF',
  mode_mismatch: () => { const r = sim.reading(); return r.valid && !r.mismatch && sim.settled; },
  range_low: () => !sim.cond.range_low,
  hold_stale: () => !sim.state.hold,
  no_contact: () => sim.reading().valid,
  reversed: () => !sim.cond.reversed,
  same_node: () => !sim.cond.same_node,
  remove_order: () => !sim.anyContact() && !(app.ctx && app.ctx.badOrder),
  damaged_lead: () => !sim.state.damaged.red && !sim.state.damaged.black,
  predict_first: () => app.ctx && app.ctx.predicted !== undefined,
  range_na: () => sim.isVMode(),
  meter_off_btn: () => sim.state.dial !== 'OFF',
};
const eventResolve = {
  change_connected: (ev) => ['dial', 'plug', 'replace'].includes(ev.type),
  bridge: (ev) => ev.type === 'contact',
  tip_grip: (ev) => ev.type === 'grip' && ev.part === 'handle',
  unplanned_point: (ev) => ev.type === 'contact',
  func_block: (ev) => ev.type === 'contact',
  jack_taken: (ev) => ev.type === 'plug',
};
const COACH_HI = {
  unsafe_jack: ['plug:red', 'jack:V'], wrong_jack: ['jack:COM', 'jack:V'], swapped_jacks: ['jack:COM', 'jack:V'],
  change_connected: ['probe:red', 'probe:black'], tip_grip: ['probe:red', 'probe:black'], func_block: ['dialpos:VDC', 'dialpos:VAC'],
  meter_off: ['dialpos:VDC'], lead_unplugged: ['plug:black', 'plug:red'], range_low: ['btn:range'], hold_stale: ['btn:hold'],
  range_na: ['dialpos:VDC'], func_not_voltage: ['dialpos:VDC', 'dialpos:VAC'],
};

function coachVars(code, ev) {
  const s = sim.state;
  if (code === 'precheck') return { missing: (ev.missing || sim.missingChecklist()).map((i) => tr(CK_LABEL[i])).join('; ') };
  if (code === 'unplanned_point') return { term: termLabel(ev.term), intended: s.intended.map(termLabel).join(', ') || tr(UI.none) };
  if (code === 'mode_mismatch') {
    const r = sim.reading();
    const ac = r.kind === 'ac';
    return { have: DIAL_SHORT[s.dial], kind: ac ? (getLang() === 'es' ? 'CA' : 'AC') : (getLang() === 'es' ? 'CC' : 'DC'), want: ac ? 'V~' : 'V⎓' };
  }
  if (code === 'range_low') return { range: s.range };
  if (code === 'no_contact') return { lead: colorName(ev.lead) };
  return {};
}

function raise(code, ev = {}) {
  const def = COACH[code];
  if (!def) return;
  const step = curStep();
  const expected = app.mode !== 'assess' && !!(step && step.expect && step.expect.includes(code));
  if (code === 'floating') return;
  const task = curTask();
  if (task && task.expect && task.expect.includes(code)) return; // part of the task's own scenario
  if (!expected && !SILENT.includes(code) && !app.demo) {
    const e = app.errors[code] || (app.errors[code] = { count: 0, corrected: false });
    e.count += 1; e.corrected = false;
  }
  if (app.mode === 'assess' && ev.type === 'detect' && !app.as.submitted) { app.as.notes.add(code); return; }
  app.coach = { code, vars: coachVars(code, ev), expected, level: def.level };
  app.info = null;
  speak(`${spoken(def.title)}. ${spoken(def.fix, app.coach.vars)}`);
  if (def.level === 'block') setCaption(tr(def.title), 5000);
}

function resolveErrors(ev) {
  Object.keys(app.errors).forEach((code) => {
    const e = app.errors[code];
    if (e.corrected) return;
    if (eventResolve[code]) { if (ev && eventResolve[code](ev)) e.corrected = true; } else if (stateResolve[code] && stateResolve[code]()) e.corrected = true;
  });
  if (app.coach) {
    const c = app.coach.code;
    const done = (ev && eventResolve[c] && eventResolve[c](ev)) || (stateResolve[c] && stateResolve[c]());
    if (done && performance.now() - (app.coach.t || 0) > 600) app.coach = null;
  }
}

function retryCoach() {
  const c = app.coach;
  if (!c) return;
  const def = COACH[c.code];
  if (c.code === 'remove_order') restoreStep();
  else if (def.level !== 'block' && def.level !== 'note') {
    if (sim.state.hold && c.code === 'hold_stale') sim.toggleHold();
    else if (c.code === 'wrong_jack') ['red', 'black'].forEach((l) => { if (['A', 'mA'].includes(sim.state.plugs[l])) sim.plug(l, null); });
    else if (c.code !== 'range_low' && c.code !== 'damaged_lead') { sim.lift('red'); sim.lift('black'); }
  }
  app.flash = { keys: COACH_HI[c.code] || [], until: performance.now() + 4000 };
  app.coach = null;
}

// ---------------------------------------------------------------------------
// Controller: every learner action (3D, diagram or panel buttons) comes here
// ---------------------------------------------------------------------------
function note(key) { if (app.ctx) app.ctx.clicked.add(key); }
function showInfo(key) { app.info = { key }; if (app.coach && COACH[app.coach.code].level !== 'block') app.coach = null; note(key); }

function inspect(item) {
  const r = sim.inspect(item);
  app.inspMsg = { item, damaged: r.damaged };
  if (r.damaged) raise('damaged_lead');
}
function replaceLead(lead) {
  if (sim.replaceLead(lead).ok) app.inspMsg = { item: lead, replaced: true };
}
function pickUp(lead) {
  const sel = app.ui.selected;
  if (sel && sel.kind === 'probe' && sel.lead === lead) { app.ui.selected = null; sim.lift(lead); return; }
  sim.grip(lead, 'handle');
  if (sim.state.probes[lead] || sim.state.near[lead]) sim.lift(lead);
  app.ui.selected = { kind: 'probe', lead };
}
function chooseTerm(id) {
  const sel = app.ui.selected;
  if (sel && sel.kind === 'probe') {
    if (sim.touch(sel.lead, id).ok) app.ui.selected = null;
  } else if (!sel) sim.identify(id);
}
function plugTo(lead, jack) {
  sim.plug(lead, jack);
  app.ui.selected = null;
}

function clickPart(part, fromDemo) {
  if (app.demo && !fromDemo) return;
  const sel = app.ui.selected;
  switch (part.type) {
    case 'none': case 'bench':
      if (sel) app.ui.selected = null;
      break;
    case 'meter': showInfo('meter'); inspect('meter'); break;
    case 'display': showInfo('display'); break;
    case 'dialknob': showInfo('dial'); break;
    case 'dialpos': note('dial'); sim.setDial(part.id); break;
    case 'btn': if (part.id === 'range') sim.cycleRange(); else sim.toggleHold(); note(`btn:${part.id}`); break;
    case 'jack':
      if (sel && sel.kind === 'plug') plugTo(sel.lead, part.id);
      else showInfo(`jack:${part.id}`);
      break;
    case 'plug':
      app.ui.selected = sel && sel.kind === 'plug' && sel.lead === part.lead ? null : { kind: 'plug', lead: part.lead };
      break;
    case 'lead': inspect(part.lead); break;
    case 'probe':
      if (part.part === 'tip') { showInfo('probe:tip'); sim.grip(part.lead, 'tip'); }
      else if (part.part === 'guard') { showInfo('probe:guard'); sim.grip(part.lead, 'guard'); }
      else { note('probe:handle'); pickUp(part.lead); }
      break;
    case 'term': chooseTerm(part.id); break;
    case 'switch': sim.toggleSwitch(part.id); break;
    default:
  }
  dirty = true;
}

const ctl = {
  ui: app.ui,
  clickPart: (p) => clickPart(p),
  setDial: (pos) => { if (!app.demo) { note('dial'); sim.setDial(pos); } },
  beginDrag: (kind, lead) => {
    if (app.demo) return false;
    app.ui.selected = null;
    if (kind === 'probe') {
      note('probe:handle');
      sim.grip(lead, 'handle');
      if (sim.state.probes[lead] || sim.state.near[lead]) sim.lift(lead);
      return true;
    }
    if (sim.anyContact()) { sim.fail('change_connected', { what: 'jack' }); return false; }
    return true;
  },
  endDrag: (kind, lead, snap, near) => {
    if (kind === 'probe') {
      if (snap) sim.touch(lead, snap);
      else if (near) sim.nearMiss(lead, near);
      else sim.lift(lead);
    } else sim.plug(lead, snap || null);
    dirty = true;
  },
  hover: (part, e) => {
    const id = part && part.type === 'term' && !TERMINALS[part.id].bridge ? part.id : null;
    if (app.ui.hoverTerm !== id) { app.ui.hoverTerm = id; dirty = true; }
    const tip = $('tip');
    const text = part && e ? hoverText(part) : '';
    if (!text) { tip.hidden = true; return; }
    const r = $('stage').getBoundingClientRect();
    tip.hidden = false; tip.textContent = text;
    tip.style.left = `${Math.min(r.width - 160, e.clientX - r.left)}px`;
    tip.style.top = `${e.clientY - r.top}px`;
  },
};

function hoverText(p) {
  switch (p.type) {
    case 'term': return TERMINALS[p.id].bridge ? '' : termLabel(p.id);
    case 'jack': return tr(PARTS[`jack:${p.id}`].name);
    case 'display': return tr(PARTS.display.name);
    case 'dialknob': return tr(PARTS.dial.name);
    case 'dialpos': return tr(DIAL_NAMES[p.id]);
    case 'btn': return tr(PARTS[`btn:${p.id}`].name);
    case 'meter': return tr(PARTS.meter.name);
    case 'plug': return `${tr(PARTS.plug.name)} (${colorName(p.lead)})`;
    case 'lead': return itemName(p.lead);
    case 'probe': return `${tr(PARTS[`probe:${p.part}`].name)} (${colorName(p.lead)})`;
    case 'switch': return tr(p.id === 'lamp9' ? UI.swLamp9 : UI.swPanel);
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Lesson runner
// ---------------------------------------------------------------------------
function startLesson(i) {
  app.lessonIdx = i; app.finished = false; app.snapshots = {}; app.log = []; app.started = performance.now();
  app.ui.rest = REST_OF[lesson().id];
  lesson().init(sim);
  enterStep(0);
}

function enterStep(i, back) {
  const steps = lesson().steps;
  app.stepIdx = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[app.stepIdx];
  app.ctx = newCtx();
  app.coach = null; app.info = null; app.flash = null; app.ui.selected = null;
  if (back && app.snapshots[app.stepIdx]) sim.restore(app.snapshots[app.stepIdx]);
  else {
    if (s.setup) s.setup(sim);
    app.snapshots[app.stepIdx] = sim.snapshot();
  }
  setCaption(null);
  if (scene && s.focus) scene.focus(s.focus);
  narrateStep();
  dirty = true;
  const p = $('panel'); if (p) p.scrollTop = 0;
}

function restoreStep() {
  const snap = app.snapshots[app.stepIdx];
  if (snap) sim.restore(snap);
  const keep = app.ctx && app.ctx.again;
  app.ctx = newCtx();
  if (keep) app.ctx.again = true;
  app.coach = null; app.ui.selected = null;
  dirty = true;
}

function stepSubs(s) { return (s.subs || []).map((x) => ({ label: x.label, ok: !!x.ok(sim, app.ctx) })); }

function computePassed(s) {
  const c = app.ctx;
  if (s.kind === 'ack') return !!c.acked;
  if (s.kind === 'quiz') return !!c.quizOK;
  if (s.kind === 'entry') return !!c.entryOK;
  if (s.kind === 'summary') return true;
  if (s.predict && c.predicted === undefined) return false;
  if (s.check) return !!s.check(sim, c);
  return stepSubs(s).every((x) => x.ok);
}

function evaluate() {
  const s = curStep();
  if (!s || app.finished) return;
  const c = app.ctx;
  if (!c.passed && computePassed(s)) {
    c.passed = true;
    (s.confirms || []).forEach((k) => { sim.state.checklist[k] = true; });
    if (s.record) app.log.push({ label: s.record, value: sim.displayText() });
    if (s.kind === 'do' && !s.independent) speak(spoken(s.meaning));
    dirty = true;
    if (s.independent && !c.advancing) { c.advancing = true; setTimeout(() => { if (curStep() === s) next(); }, 900); }
  }
}

function next() {
  const steps = lesson().steps;
  if (app.stepIdx >= steps.length - 1) {
    app.finished = true;
    app.completed[lesson().id] = true;
    app.coach = null; app.ui.highlights = [];
    save();
    dirty = true;
    return;
  }
  enterStep(app.stepIdx + 1);
}

const DEMO_PART = {
  meter: { type: 'meter' }, display: { type: 'display' }, dial: { type: 'dialknob' },
  'probe:handle': { type: 'probe', lead: 'red', part: 'handle' }, 'probe:guard': { type: 'probe', lead: 'red', part: 'guard' }, 'probe:tip': { type: 'probe', lead: 'red', part: 'tip' },
};
function demoCaption(a) {
  const es = getLang() === 'es';
  const c = (l) => colorName(l);
  switch (a[0]) {
    case 'inspect': return `${tr(UI.inspect)}: ${itemName(a[1])}`;
    case 'replace': return tr(UI.replaceLead);
    case 'plug': return es ? `Cable ${c(a[1])} al borne ${JACK_NAMES[a[2]]}` : `${c(a[1])} lead into the ${JACK_NAMES[a[2]]} jack`;
    case 'dial': return es ? `Selector a ${DIAL_SHORT[a[1]]}` : `Selector to ${DIAL_SHORT[a[1]]}`;
    case 'range': return `${tr(UI.range)}: ${a[1] === 'AUTO' ? 'AUTO' : `${a[1]} V`}`;
    case 'hold': return es ? 'Pulsar HOLD' : 'Press HOLD';
    case 'identify': return `${tr(UI.ckPoints)}: ${a[1].map(termLabel).join(', ')}`;
    case 'grip': return es ? `Tomar la punta ${c(a[1])} por el mango` : `Grip the ${c(a[1])} probe by its handle`;
    case 'touch': return es ? `Punta ${c(a[1])} sobre ${termLabel(a[2])}` : `${c(a[1])} probe onto ${termLabel(a[2])}`;
    case 'lift': return es ? `Retirar la punta ${c(a[1])}` : `Lift the ${c(a[1])} probe`;
    case 'switch': return `${tr(UI.swLabel)}: ${tr(a[2] ? UI.closed : UI.open)}`;
    case 'confirm': return `${tr(UI.confirm)}: ${tr(CK_LABEL[a[1]])}`;
    case 'predict': return tr(UI.yourPrediction);
    case 'click': return tr((PARTS[a[1]] || PARTS.meter).name);
    case 'entry': return tr(UI.check);
    default: return tr(UI.stSettling);
  }
}
async function perform(a) {
  const c = app.ctx; const s = curStep();
  switch (a[0]) {
    case 'inspect': inspect(a[1]); break;
    case 'replace': if (sim.state.damaged[a[1]]) replaceLead(a[1]); else return false; break;
    case 'plug': sim.plug(a[1], a[2]); break;
    case 'dial': sim.setDial(a[1]); break;
    case 'range': sim.setRange(a[1]); break;
    case 'hold': sim.toggleHold(); break;
    case 'identify': sim.setIntended(a[1]); break;
    case 'grip': pickUp(a[1]); break;
    case 'touch': app.ui.selected = null; sim.touch(a[1], a[2]); break;
    case 'lift': app.ui.selected = null; sim.lift(a[1]); break;
    case 'switch': sim.toggleSwitch(a[1], a[2]); break;
    case 'confirm': sim.confirm(a[1]); break;
    case 'predict': c.predicted = s.predict.correct; break;
    case 'click': clickPart(DEMO_PART[a[1]] || { type: 'jack', id: a[1].split(':')[1] }, true); break;
    case 'entry':
      if (s.entry.type === 'reading') c.form = { sign: sim.display.neg ? '-' : '+', num: sim.display.digits, unit: 'V' };
      else c.form = { num: String(s.entry.answer) };
      submitEntry();
      break;
    case 'wait': {
      // wait for the reading to settle (or for the given time when nothing can settle)
      const t0 = performance.now();
      while (performance.now() - t0 < a[1] && !(window.__voltageLabFast && sim.settled && performance.now() - t0 > 250)) await new Promise((r) => setTimeout(r, 60));
      break;
    }
    default:
  }
  return true;
}
async function runDemo() {
  const s = curStep();
  if (!s || app.demo) return;
  if (s.kind === 'quiz') { answerQuiz(s.quiz.correct); return; }
  if (s.kind === 'ack') { app.ctx.acked = true; dirty = true; return; }
  if (!s.demo) return;
  restoreStep();
  app.demo = true; dirty = true;
  const mine = app.ctx;
  for (const a of s.demo) {
    if (app.ctx !== mine) break;
    setCaption(demoCaption(a));
    dirty = true;
    await sleep(a[0] === 'wait' ? 0 : 420);
    const did = await perform(a);
    dirty = true;
    if (did !== false) await sleep(a[0] === 'wait' ? 0 : 620);
  }
  if (app.ctx === mine) { mine.demoDone = true; app.ui.selected = null; }
  app.demo = false;
  setCaption(null);
  dirty = true;
}

function answerQuiz(i) {
  const s = curStep(); const c = app.ctx;
  c.quizPick = i;
  if (i === s.quiz.correct) {
    c.quizOK = true;
    if (s.quiz.onCorrect) s.quiz.onCorrect(sim);
    speak(spoken(s.quiz.explain));
  }
  dirty = true;
}

function checkReading(form, pre) {
  const d = sim.display; const r = sim.reading();
  if (pre && !pre(sim)) return { ok: false, msg: T('The probes are not where this step needs them, or the reading is not steady yet.', 'Las puntas no están donde este paso las necesita, o la lectura aún no es estable.') };
  if (sim.state.hold) return { ok: false, msg: T('HOLD is on, so the display is not a live reading.', 'HOLD está activo, así que la pantalla no es una lectura en vivo.') };
  if (!r.valid || !sim.settled) return { ok: false, msg: T('There is no steady two-point reading on the display yet.', 'Aún no hay una lectura estable entre dos puntos en la pantalla.') };
  if (d.ol) return { ok: false, msg: T('The display shows overrange (OL), not a number. Choose a higher range.', 'La pantalla muestra sobrerrango (OL), no un número. Elige un rango mayor.') };
  const n = parseFloat(String(form.num || '').replace(',', '.').replace('−', '-'));
  if (Number.isNaN(n)) return { ok: false, msg: T('Type the number you see on the display.', 'Escribe el número que ves en la pantalla.') };
  if (!form.sign) return { ok: false, msg: T('Choose the sign: is there a minus sign on the display or not?', 'Elige el signo: ¿hay un signo menos en la pantalla o no?') };
  if (!form.unit) return { ok: false, msg: T('Choose the unit shown on the display.', 'Elige la unidad que muestra la pantalla.') };
  const val = parseFloat(d.digits); const res = RANGE_INFO[d.rangeActive].res;
  if (Math.abs(Math.abs(n) - val) > res * 1.5 + 1e-9) return { ok: false, msg: T('The number does not match the display. Read the digits again.', 'El número no coincide con la pantalla. Lee los dígitos otra vez.') };
  if ((form.sign === '-' || n < 0) !== d.neg) return { ok: false, msg: T('The sign does not match the display.', 'El signo no coincide con la pantalla.') };
  if (form.unit !== 'V') return { ok: false, msg: T('The unit does not match: the display shows V.', 'La unidad no coincide: la pantalla muestra V.') };
  return { ok: true };
}
function submitEntry() {
  const s = curStep(); const c = app.ctx;
  let res;
  if (s.entry.type === 'reading') res = checkReading(c.form, s.pre);
  else {
    const n = parseFloat(String(c.form.num || '').replace(/[\s,.](?=\d{3}\b)/g, '').replace(',', '.'));
    res = Math.abs(n - s.entry.answer) < 1e-6 ? { ok: true } : { ok: false, msg: T('Not yet. To go from V to mV, multiply by 1,000.', 'Aún no. Para pasar de V a mV, multiplica por 1000.') };
  }
  c.entryOK = res.ok; c.entryMsg = res.ok ? null : res.msg;
  dirty = true;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------
function startAssessment() {
  app.as = { started: true, idx: 0, results: {}, submitted: false, feedback: null, notes: new Set(), report: false };
  app.errors = {};
  enterTask(0);
}
function enterTask(i) {
  app.as.idx = i; app.as.submitted = false; app.as.feedback = null; app.as.notes = new Set();
  const t = TASKS[i];
  app.ctx = newCtx(); app.coach = null; app.info = null; app.ui.selected = null; app.ui.highlights = [];
  app.ui.rest = ['aa', 'b9', 'lamp9'].includes(t.diagram) ? 'center' : 'home';
  t.setup(sim);
  if (scene) scene.focus(t.focus);
  speak(`${spoken(t.title)}. ${spoken(t.prompt)}`);
  dirty = true;
  const p = $('panel'); if (p) p.scrollTop = 0;
}
function submitTask() {
  const t = curTask(); const c = app.ctx; const a = app.as;
  const msgs = [];
  if (t.quiz && c.quizPick === undefined) { c.needAnswer = true; dirty = true; return; }
  if (t.quiz && c.quizPick !== t.quiz.correct) msgs.push(T('Your answer to the question is not the best one.', 'Tu respuesta a la pregunta no es la mejor.'));
  (t.fails || []).forEach((f) => { if (!f.ok(sim)) msgs.push(f.msg); });
  if (t.entry && !msgs.length) { const r = checkReading(c.form); if (!r.ok) msgs.push(r.msg); }
  const pass = msgs.length === 0;
  const res = a.results[t.id] || (a.results[t.id] = { attempts: 0, first: null, passed: false });
  res.attempts += 1;
  if (res.first === null) res.first = pass;
  if (pass) res.passed = true;
  a.submitted = true;
  a.feedback = { pass, msgs, notes: [...a.notes] };
  dirty = true;
}
const openCritical = () => Object.keys(app.errors).filter((c) => COACH[c].critical && !app.errors[c].corrected);

function recommendation() {
  const a = app.as;
  const never = TASKS.filter((t) => !(a.results[t.id] && a.results[t.id].passed));
  const failed = TASKS.filter((t) => !(a.results[t.id] && a.results[t.id].first));
  const errs = Object.keys(app.errors).sort((x, y) => app.errors[y].count - app.errors[x].count);
  const topics = [];
  [...never, ...failed].forEach((t) => { if (!topics.includes(t.lesson)) topics.push(t.lesson); });
  errs.forEach((c) => { const l = ERROR_LESSON[c]; if (l && !topics.includes(l)) topics.push(l); });
  return { topics, first: topics[0] || null };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
let dirty = true;
const cache = {};
function keyOf(el) {
  if (!el || !el.dataset) return null;
  if (el.id) return `#${el.id}`;
  const d = el.dataset;
  if (d.act) return `${d.act}|${[d.i, d.item, d.term, d.lead, d.pos, d.r, d.id, d.key, d.v].join('|')}`;
  if (d.term) return `term|${d.term}`;
  return null;
}
function setRegion(id, html) {
  if (cache[id] === html) return;
  cache[id] = html;
  const el = $(id);
  const act = document.activeElement;
  const inside = act && el.contains(act);
  const key = inside ? keyOf(act) : null;
  const selPos = inside && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
  el.innerHTML = html;
  if (key) {
    const cand = [...el.querySelectorAll('[data-act],[data-term],input,select')].find((x) => keyOf(x) === key);
    if (cand) {
      cand.focus({ preventScroll: true });
      if (selPos && cand.setSelectionRange) { try { cand.setSelectionRange(selPos[0], selPos[1]); } catch (e) { /* not a text field */ } }
    }
  }
}
const btn = (act, label, attrs = '', cls = '') => `<button type="button" data-act="${act}" ${attrs} class="${cls}">${label}</button>`;
const mark = (ok) => `<span class="mark${ok ? ' ok' : ''}">${ok ? '✔ ' : '○ '}${tr(ok ? UI.done : UI.todo)}</span>`;

function paintChrome() {
  document.documentElement.lang = getLang();
  $('t-title').textContent = tr(UI.appTitle);
  $('t-sub').textContent = tr(UI.appSub);
  $('t-badge').textContent = tr(UI.simBadge);
  document.title = tr(UI.appTitle);
  $('l-mode').textContent = tr(UI.mode);
  $('l-lang').textContent = tr(UI.language);
  const sm = $('sel-mode');
  sm.options[0].textContent = tr(UI.guided); sm.options[1].textContent = tr(UI.practice); sm.options[2].textContent = tr(UI.assessment);
  sm.value = app.mode;
  $('sel-lang').value = getLang();
  const nb = $('btn-narr');
  nb.textContent = `${tr(UI.narration)}: ${tr(app.narration ? UI.on : UI.off)}`;
  nb.setAttribute('aria-pressed', String(app.narration));
  nb.disabled = !canSpeak; nb.title = canSpeak ? '' : tr(UI.narrationNA);
  const cb = $('btn-cap');
  cb.textContent = `${tr(UI.captions)}: ${tr(app.captions ? UI.on : UI.off)}`;
  cb.setAttribute('aria-pressed', String(app.captions));
  $('btn-help').textContent = tr(UI.help);
  $('help-title').textContent = tr(UI.helpTitle);
  $('help-body').innerHTML = tr(UI.helpBody);
  $('help-ok').textContent = tr(UI.helpStart);
  $('stage-help').textContent = tr(UI.stageHelp);
  $('stage-bar').innerHTML = `${btn('view', tr(UI.frontView), 'data-v="front"')}<span class="sep"></span><span class="lbl">${tr(UI.closeups)}</span>`
    + [['display', UI.vDisplay], ['dial', UI.vDial], ['jacks', UI.vJacks], ['tips', UI.vTips], ['bench', UI.vBench]].map(([v, l]) => btn('view', tr(l), `data-v="${v}"`)).join('')
    + `<span class="sep"></span>${btn('zoom', '+', `data-f="0.72" aria-label="${tr(UI.zoomIn)}"`)}${btn('zoom', '−', `data-f="1.38" aria-label="${tr(UI.zoomOut)}"`)}`;
  if (!scene) { $('nogl').hidden = false; $('nogl').textContent = getLang() === 'es' ? 'La vista 3D no está disponible en este navegador (WebGL). Puedes usar el diagrama y los controles del panel.' : 'The 3D view is not available in this browser (WebGL). You can still use the diagram and the panel controls.'; }
}

function navHTML() {
  if (app.mode === 'assess') {
    const a = app.as;
    const n = a.report ? TASKS.length : a.started ? a.idx + (a.submitted ? 1 : 0) : 0;
    return `<div class="card nav"><h2>${tr(UI.asTitle)}</h2><div class="bar"><i style="width:${(n / TASKS.length) * 100}%"></i></div>
      <div class="meta"><span>${a.started && !a.report ? `${tr(UI.asTask)} ${a.idx + 1} ${tr(UI.of)} ${TASKS.length}` : ''}</span></div></div>`;
  }
  const L = lesson();
  const opts = LESSONS.map((l, i) => `<option value="${i}"${i === app.lessonIdx ? ' selected' : ''}>${i}. ${esc(tr(l.title))}${app.completed[l.id] ? ' ✔' : ''}</option>`).join('');
  const n = L.steps.length;
  const pos = app.finished ? n : app.stepIdx + (app.ctx && app.ctx.passed ? 1 : 0);
  return `<div class="card nav"><div class="nav-row"><select id="sel-lesson" aria-label="${tr(UI.lesson)}">${opts}</select>${btn('restart', tr(UI.restartLesson))}</div>
    <small>${esc(tr(L.blurb))}</small>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${pos}"><i style="width:${(pos / n) * 100}%"></i></div>
    <div class="meta"><span>${tr(UI.step)} ${Math.min(n, app.stepIdx + 1)} ${tr(UI.of)} ${n}</span><span>${tr(UI.estTime, { n: L.minutes })} · <span id="timer"></span> ${tr(UI.elapsed)}</span></div></div>`;
}

function coachHTML() {
  const c = app.coach;
  if (c) {
    const d = COACH[c.code];
    const cls = c.expected ? 'expected' : d.level;
    const kind = c.expected ? (getLang() === 'es' ? 'Esperado en este paso' : 'Expected in this step') : d.level === 'block' ? (d.critical ? (getLang() === 'es' ? 'Bloqueo de seguridad' : 'Safety block') : (getLang() === 'es' ? 'Aún no' : 'Not yet')) : d.level === 'note' ? (getLang() === 'es' ? 'Nota' : 'Note') : (getLang() === 'es' ? 'Corrección' : 'Coaching');
    const es = getLang() === 'es';
    return `<div class="card coach ${cls}" role="alert"><h2><span class="kind">${kind}</span><span>${h(d.title)}</span></h2><dl>
      <div><dt>${es ? 'Qué pasó' : 'What happened'}</dt><dd>${h(d.what, c.vars)}</dd></div>
      <div><dt>${es ? 'Por qué importa' : 'Why it matters'}</dt><dd>${h(d.why, c.vars)}</dd></div>
      <div><dt>${es ? 'Cómo corregirlo' : 'How to fix it'}</dt><dd>${h(d.fix, c.vars)}</dd></div></dl>
      <div class="btns">${btn('coach-retry', tr(UI.retry), '', 'primary')}${btn('coach-close', tr(UI.dismiss))}</div></div>`;
  }
  if (app.info && PARTS[app.info.key]) {
    const p = PARTS[app.info.key];
    return `<div class="card coach info"><h2><span class="kind">${getLang() === 'es' ? 'Parte' : 'Part'}</span><span>${h(p.name)}</span></h2><p style="margin:0">${h(p.info)}</p>
      <div class="btns">${btn('coach-close', tr(UI.dismiss))}</div></div>`;
  }
  return '';
}

function quizHTML(q, c, locked) {
  const picked = c.quizPick;
  const ok = c.quizOK;
  return `<div class="box"><p class="q">${h(q.q)}</p><div class="opts">${q.opts.map((o, i) => {
    let cls = '';
    if (locked) cls = i === picked ? 'picked' : '';
    else if (ok && i === q.correct) cls = 'right'; else if (i === picked && !ok) cls = 'wrong';
    return btn('quiz', h(o), `data-i="${i}" ${ok && !locked ? 'disabled' : ''} aria-pressed="${i === picked}"`, cls);
  }).join('')}</div>
  ${!locked && ok ? `<p class="fb"><b>${tr(UI.correct)}</b> ${h(q.explain)}</p>` : ''}
  ${!locked && picked !== undefined && !ok ? `<p class="fb"><b>${tr(UI.notQuite)}</b> ${tr(UI.tryAgain)}.</p>` : ''}</div>`;
}
function predictHTML(s, c) {
  const p = s.predict;
  const done = c.predicted !== undefined;
  const judged = c.passed;
  return `<div class="box"><p class="q">${tr(UI.predictFirst)}: ${h(p.q)}</p><div class="opts">${p.opts.map((o, i) => btn('predict', h(o), `data-i="${i}" aria-pressed="${c.predicted === i}" ${judged ? 'disabled' : ''}`, c.predicted === i ? 'picked' : '')).join('')}</div>
    ${judged ? `<p class="fb">${tr(c.predicted === p.correct ? UI.predRight : UI.predWrong)}</p>` : done ? '' : ''}</div>`;
}
function readingForm(c) {
  const f = c.form; const es = getLang() === 'es';
  const opt = (v, cur, label) => `<option value="${v}"${cur === v ? ' selected' : ''}>${label}</option>`;
  return `<div class="form">
    <label>${es ? 'Signo' : 'Sign'}<select id="f-sign">${opt('', f.sign || '', '…')}${opt('+', f.sign, es ? 'positivo (sin signo)' : 'positive (no sign)')}${opt('-', f.sign, es ? 'negativo (−)' : 'negative (−)')}</select></label>
    <label>${es ? 'Número' : 'Number'}<input type="text" id="f-num" inputmode="decimal" autocomplete="off" value="${esc(f.num || '')}"></label>
    <label>${es ? 'Unidad' : 'Unit'}<select id="f-unit">${opt('', f.unit || '', '…')}${opt('V', f.unit, 'V')}${opt('mV', f.unit, 'mV')}</select></label>`;
}
function entryHTML(s, c) {
  let form;
  if (s.entry.type === 'reading') form = `${readingForm(c)}${btn('entry-submit', tr(UI.check), '', 'primary')}</div>`;
  else form = `<p class="q">${h(s.entry.q)}</p><div class="form"><label>${s.entry.unit}<input type="text" id="f-num" inputmode="decimal" autocomplete="off" value="${esc(c.form.num || '')}"></label>${btn('entry-submit', tr(UI.check), '', 'primary')}</div>`;
  return `<div class="box">${form}${c.entryOK ? `<p class="fb"><b>${tr(UI.correct)}</b></p>` : c.entryMsg ? `<p class="fb"><b>${tr(UI.notQuite)}</b> ${h(c.entryMsg)}</p>` : ''}</div>`;
}
function subsHTML(s) {
  const subs = stepSubs(s);
  if (!subs.length) return '';
  return `<ul class="subs">${subs.map((x) => `<li>${mark(x.ok)}<span>${h(x.label)}</span></li>`).join('')}</ul>`;
}
function wrongPairHTML(s) {
  const c = app.ctx;
  if (!s.pair || c.passed || !sim.reading().valid || !sim.settled) return '';
  const p = sim.state.probes;
  const now = [p.red, p.black];
  if (s.pair.includes(now[0]) && s.pair.includes(now[1]) && now[0] !== now[1]) return '';
  const want = s.wantText ? tr(s.wantText) : s.pair.map(termLabel).join(' + ');
  return `<p class="state info">${tr(UI.wrongPair, { a: termLabel(p.red), b: termLabel(p.black), want })}</p>`;
}
function logHTML() {
  if (!app.log.length) return '';
  return `<div class="box"><h3>${tr(UI.results)}</h3><table class="log">${app.log.map((r) => `<tr><td>${h(r.label)}</td><td>${esc(r.value)}</td></tr>`).join('')}</table></div>`;
}
const SEQ = () => tr(UI.sequence).replace(/\.$/, '').split(' → ');

function stepHTML() {
  if (app.mode === 'assess') return assessHTML();
  const L = lesson(); const s = curStep(); const c = app.ctx;
  if (app.finished) {
    const last = app.lessonIdx === LESSONS.length - 1;
    return `<div class="card"><h2>✔ ${tr(UI.lessonComplete)}: ${esc(tr(L.title))}</h2>
      <h3>${tr(UI.sequenceTitle)}</h3><ol class="seq">${SEQ().map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <div class="btns">${last ? btn('go-assess', tr(UI.assessment), '', 'primary') : btn('next-lesson', tr(UI.nextLesson), '', 'primary')}${btn('restart', tr(UI.restartLesson))}</div></div>`;
  }
  const guided = app.mode === 'guided' && !s.independent;
  const showAction = guided || c.hint || c.passed || s.kind !== 'do';
  const showRest = guided || c.explain || c.passed;
  const row = (cls, label, text) => (text ? `<div class="${cls}"><dt>${tr(label)}</dt><dd>${h(text)}</dd></div>` : '');
  let body = '';
  if (s.kind === 'summary') {
    body = `<p style="margin:0 0 4px">${tr(UI.sequenceTitle)}:</p><ol class="seq">${SEQ().map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <h3 style="margin-top:10px">${tr(UI.takeaways)}</h3><ul class="points">${s.points.map((p) => `<li>${h(p)}</li>`).join('')}</ul>${logHTML()}`;
  } else {
    if (s.independent) {
      const proc = L.steps.filter((x) => x.independent);
      const at = proc.indexOf(s);
      body += `<p class="state info" style="margin-top:0">${tr(UI.yourTurn)}</p><ol class="proc">${proc.map((x, i) => `<li class="${i < at || (i === at && c.passed) ? 'done' : i === at ? 'cur' : ''}"><span>${h(x.title)}</span>${i < at || (i === at && c.passed) ? '<span>✔</span>' : i === at ? '<span>◀</span>' : '<span></span>'}</li>`).join('')}</ol>`;
    }
    body += `<dl class="five">${row('', UI.goal, s.goal)}${row('', UI.why, s.why)}${showAction ? row('act', UI.action, s.action) : ''}${showRest ? row('', UI.observe, s.observe) + row('', UI.meaning, s.meaning) : ''}</dl>`;
    if (s.predict) body += predictHTML(s, c);
    body += subsHTML(s);
    if (s.kind === 'quiz') body += quizHTML(s.quiz, c);
    if (s.kind === 'entry') body += entryHTML(s, c);
    if (s.kind === 'ack') body += `<div class="btns">${btn('ack', tr(UI.cont), c.acked ? 'disabled' : '', 'primary')}</div>`;
    body += wrongPairHTML(s);
    if (c.again) {
      body += `<div class="again"><b>${tr(UI.inShort)}:</b> ${h(s.again || s.action)}${s.observe ? `<br><b>${tr(UI.youShouldSee)}:</b> ${h(s.observe)}` : ''}</div>`;
    }
    if (s.kind === 'do' || s.kind === 'entry') {
      body += `<p class="state${c.passed ? ' ok' : ''}" role="status">${app.demo ? tr(UI.demoRunning) : c.passed ? (c.demoDone ? tr(UI.demoDone) : `✔ ${tr(UI.stepDone)}`) : tr(UI.stepWaiting)}</p>`;
    }
    if (!s.record && s.kind !== 'summary' && app.log.length && (L.id === 'l5' || L.id === 'l7')) body += logHTML();
  }
  const canDemo = !s.independent && s.kind !== 'summary' && (s.demo || s.kind === 'quiz' || s.kind === 'ack');
  const tools = s.kind === 'summary' ? '' : `<div class="btns">
    ${canDemo ? btn('showme', tr(UI.showMe), app.demo ? 'disabled' : '') : ''}
    ${!s.independent ? btn('tryit', tr(UI.letMeTry), app.demo ? 'disabled' : '') : ''}
    ${!guided && s.kind === 'do' && !c.hint ? btn('hint', tr(UI.hint)) : ''}
    ${!guided && !c.explain && !c.passed ? btn('explain', tr(UI.explain)) : ''}
    ${btn('again', tr(UI.explainAgain))}${btn('reset', tr(UI.reset), app.demo ? 'disabled' : '')}</div>`;
  const isLast = app.stepIdx === L.steps.length - 1;
  const nav = `<div class="btns navb">${btn('back', `← ${tr(UI.back)}`, app.stepIdx === 0 || app.demo ? 'disabled' : '')}${btn('next', `${tr(isLast ? UI.finish : UI.next)} →`, c.passed && !app.demo ? '' : 'disabled', 'primary')}</div>`;
  return `<div class="card"><h2>${h(s.title)}</h2>${body}${tools}${nav}</div>`;
}

function assessHTML() {
  const a = app.as;
  if (!a.started) {
    return `<div class="card"><h2>${tr(UI.asTitle)}</h2><p>${tr(UI.asIntro)}</p><ol class="points">${TASKS.map((t) => `<li>${h(t.title)}</li>`).join('')}</ol>
      <div class="btns">${btn('as-start', tr(UI.asStart), '', 'primary')}</div></div>`;
  }
  if (a.report) return reportHTML();
  const t = curTask(); const c = app.ctx;
  let body = `<p>${h(t.prompt)}</p>`;
  if (t.quiz) body += quizHTML(t.quiz, { quizPick: c.quizPick }, true);
  if (t.entry) body += `<div class="box">${readingForm(c)}</div></div>`;
  if (c.needAnswer && c.quizPick === undefined) body += `<p class="state info">${getLang() === 'es' ? 'Elige una respuesta antes de enviar.' : 'Choose an answer before you submit.'}</p>`;
  if (!a.submitted) body += `<div class="btns">${btn('as-submit', tr(UI.submit), '', 'primary')}</div>`;
  else {
    const f = a.feedback;
    body += `<p class="state ${f.pass ? 'ok' : 'bad'}" role="status">${f.pass ? `✔ ${tr(UI.asPass)}` : `✘ ${tr(UI.asFail)}`}</p>`;
    if (f.msgs.length) body += `<ul class="points">${f.msgs.map((m) => `<li>${h(m)}</li>`).join('')}</ul>`;
    if (f.notes.length) body += `<ul class="points">${f.notes.map((n) => `<li><b>${h(COACH[n].title)}:</b> ${h(COACH[n].why, coachVars(n, {}))}</li>`).join('')}</ul>`;
    body += `<div class="again">${h(t.explain)}</div>`;
    const last = a.idx === TASKS.length - 1;
    body += `<div class="btns">${f.pass ? '' : btn('as-retry', tr(UI.asRetryTask))}${btn(last ? 'as-report' : 'as-next', tr(last ? UI.asReport : UI.asNextTask), '', 'primary')}</div>`;
  }
  return `<div class="card"><h3>${tr(UI.asTask)} ${a.idx + 1} ${tr(UI.of)} ${TASKS.length}</h3><h2>${h(t.title)}</h2>${body}</div>`;
}

function reportHTML() {
  const a = app.as;
  const open = openCritical();
  if (open.length) {
    return `<div class="card rep"><h2>${tr(UI.repBlocked)}</h2><p>${tr(UI.repBlockedHelp)}</p>
      <ul>${open.map((c) => `<li><span><b>${h(COACH[c].title)}</b><br>${h(COACH[c].fix, coachVars(c, {}))}</span><span class="mark">${tr(UI.repOpen)}</span></li>`).join('')}</ul></div>`;
  }
  const rec = recommendation();
  const lessonName = (id) => { const i = LESSONS.findIndex((l) => l.id === id); return `${tr(UI.lesson)} ${i}: ${tr(LESSONS[i].title)}`; };
  const skills = TASKS.map((t) => {
    const r = a.results[t.id];
    const st = r && r.first ? UI.asFirstTry : r && r.passed ? UI.asAfterRetry : UI.asNotPassed;
    return `<li><span>${h(t.title)}</span><span class="mark${r && r.passed ? ' ok' : ''}">${r && r.passed ? '✔ ' : '○ '}${tr(st)}</span></li>`;
  }).join('');
  const codes = Object.keys(app.errors);
  const errs = codes.length ? codes.map((c) => `<li><span>${h(COACH[c].title)} ${tr(UI.repTimes, { n: app.errors[c].count })}</span><span class="mark${app.errors[c].corrected ? ' ok' : ''}">${app.errors[c].corrected ? `✔ ${tr(UI.repCorrected)}` : `○ ${tr(UI.repOpen)}`}</span></li>`).join('') : `<li><span>${tr(UI.repNoErrors)}</span><span></span></li>`;
  const topics = rec.topics.length ? rec.topics.map((id) => `<li><span>${esc(lessonName(id))}</span><span></span></li>`).join('') : `<li><span>${tr(UI.repNothing)}</span><span></span></li>`;
  const passed = TASKS.filter((t) => a.results[t.id] && a.results[t.id].passed).length;
  return `<div class="card rep"><h2>${tr(UI.repTitle)}</h2>
    <p><b>${passed} / ${TASKS.length}</b> — ${tr(UI.repSkills).toLowerCase()}</p>
    <h3>${tr(UI.repSkills)}</h3><ul>${skills}</ul>
    <h3>${tr(UI.repErrors)}</h3><ul>${errs}</ul>
    <h3>${tr(UI.repRepeat)}</h3><ul>${topics}</ul>
    <h3>${tr(UI.repNext)}</h3><p class="rec">${rec.first ? esc(tr(UI.repPracticeLesson, { lesson: lessonName(rec.first) })) : tr(UI.repAllGood)}</p>
    <h3>${tr(UI.sequenceTitle)}</h3><ol class="seq">${SEQ().map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    <p class="small">${tr(UI.repDisclaimer)}</p>
    <div class="btns">${btn('as-practice', tr(UI.repGoPractice), `data-i="${rec.first ? LESSONS.findIndex((l) => l.id === rec.first) : 7}"`, 'primary')}${btn('as-start', tr(UI.repAgain))}</div></div>`;
}

function statusParts() {
  const s = sim.state; const r = sim.reading();
  const flags = [];
  let main;
  if (!r.power) main = tr(UI.stOff);
  else if (r.reason === 'not_voltage') main = tr(UI.stNotV);
  else if (r.reason === 'leads') main = tr(UI.stLeads);
  else if (r.reason === 'open') main = r.openLeads.length === 2 ? tr(UI.stOpenBoth) : tr(UI.stOpenOne, { lead: colorName(r.openLeads[0]) });
  else if (r.reason === 'separate') main = tr(UI.stSeparate);
  else {
    main = `${tr(UI.stValid, { r: termLabel(s.probes.red), b: termLabel(s.probes.black) })} ${tr(sim.settled ? UI.stSettled : UI.stSettling)}`;
    const quiet = app.mode === 'assess' && !app.as.submitted;
    if (!quiet) {
      if (r.mismatch) flags.push(tr(UI.stMismatch));
      if (r.sameNode) flags.push(tr(UI.stSameNode));
    }
    if (sim.live.ol) flags.push(tr(UI.stOver));
  }
  if (sim.holdStale() && !(app.mode === 'assess' && !app.as.submitted)) flags.unshift(tr(UI.stHoldStale));
  return { main, flags };
}
function meterHTML() {
  const d = sim.display;
  const st = statusParts();
  const range = d.unit === 'V' ? (d.rangeSel === 'AUTO' ? `AUTO (${d.rangeActive} V)` : `${tr(UI.rangeManual)} ${d.rangeSel} V`) : '';
  const aria = d.on ? `${d.mode} ${d.neg ? '−' : ''}${d.digits} ${d.unit}${d.hold ? ' HOLD' : ''}` : tr(UI.meterOff);
  return `<div class="card"><h3>${tr(UI.meterTitle)}</h3>
    <div class="lcd${d.on ? '' : ' off'}" aria-label="${esc(aria)}">
      <div class="row"><span>${d.on ? (d.mode === 'DC' ? h('DC ⎓') : d.mode === 'AC' ? 'AC ~' : d.mode === 'OHM' ? 'Ω' : 'A') : tr(UI.meterOff)}</span>${d.hold ? `<span class="holdflag">${tr(UI.holdOn)}</span>` : ''}<span>${range}</span></div>
      <div class="big"><span>${d.on ? `${d.neg ? '−' : ''}${d.digits}` : ''}</span><span class="unit">${d.on ? d.unit : ''}</span></div>
    </div>
    <p class="status"><b>${tr(UI.statusTitle)}</b>${esc(st.main)}${st.flags.map((f) => `<span class="flag">⚠ ${esc(f)}</span>`).join('')}</p></div>`;
}

function diagramKind() {
  if (app.mode === 'assess') { const t = curTask(); return t ? t.diagram : 'none'; }
  const s = curStep();
  return (s && s.diagram) || lesson().diagram;
}
function diagramHTML() {
  const kind = diagramKind();
  const html = renderDiagram(kind, sim, app.ui);
  if (!html) return '';
  const sw = kind === 'lamp9' || kind === 'panel24' ? `<div class="btns">${btn('switch', `${tr(kind === 'lamp9' ? UI.swLamp9 : UI.swPanel)}: ${tr(sim.state.switches[kind] ? UI.closed : UI.open)}`, `data-id="${kind}" aria-pressed="${sim.state.switches[kind]}"`)}</div>` : '';
  const clickable = diagramTerms(kind).length > 0;
  const open = app.diagramOpen !== false;
  return `<div class="card dg"><div class="dg-head"><h3>${tr(UI.diagram)}</h3>${btn('dg-toggle', open ? '–' : '+', `aria-expanded="${open}" aria-label="${tr(UI.diagram)}"`)}</div>${open ? `${html}${sw}${clickable ? `<p class="small">${tr(UI.diagramHelp)}</p>` : ''}` : ''}</div>`;
}

function checkHTML() {
  const s = sim.state;
  const insp = app.inspMsg;
  let msg = '';
  if (insp) msg = `<div class="s">${tr(insp.replaced ? UI.inspReplaced : insp.damaged ? UI.inspBad : UI.inspOK, { item: itemName(insp.item) })}</div>`;
  const dmg = ['red', 'black'].filter((l) => s.damaged[l] && s.inspected[l]);
  const rows = [
    ['inspect', `${['meter', 'red', 'black'].map((i) => btn('inspect', `${s.inspected[i] ? '✔ ' : ''}${itemName(i)}`, `data-item="${i}"`)).join('')}${dmg.map((l) => btn('replace', tr(UI.replaceLead), `data-lead="${l}"`, 'primary')).join('')}`, msg],
    ['jacks', btn('confirm', tr(UI.confirm), 'data-item="jacks"'), `<div class="s">${tr(UI.nowIs)}: ${tr(UI.black)} → ${s.plugs.black ? JACK_NAMES[s.plugs.black] : tr(UI.unplugged)}, ${tr(UI.red)} → ${s.plugs.red ? JACK_NAMES[s.plugs.red] : tr(UI.unplugged)}</div>`],
    ['func', btn('confirm', tr(UI.confirm), 'data-item="func"'), `<div class="s">${tr(UI.nowIs)}: ${h(DIAL_NAMES[s.dial])}</div>`],
    ['range', btn('confirm', tr(UI.confirm), 'data-item="range"'), `<div class="s">${tr(UI.nowIs)}: ${sim.isVMode() ? (s.range === 'AUTO' ? 'AUTO' : `${tr(UI.rangeManual)} ${s.range} V`) : '—'}</div>`],
    ['points', s.intended.length ? btn('clear-points', tr(UI.clear)) : '', `<div class="s">${tr(UI.intended)}: ${s.intended.length ? s.intended.map(termLabel).join(', ') : tr(UI.none)}</div>`],
    ['guards', btn('confirm', tr(UI.confirm), 'data-item="guards"'), ''],
    ['bridge', btn('confirm', tr(UI.confirm), 'data-item="bridge"'), ''],
  ];
  return `<div class="card"><h3>${tr(UI.checklist)}</h3><p class="small" style="margin:0 0 6px">${tr(UI.checklistNote)}</p><ul class="ck">${rows.map(([k, b, extra]) => {
    const ok = sim.checkItem(k);
    return `<li>${mark(ok)}<div><div class="t">${tr(CK_LABEL[k])}</div>${extra}${b && !(ok && ['jacks', 'func', 'range', 'guards', 'bridge'].includes(k)) ? `<div class="row">${b}</div>` : ''}</div></li>`;
  }).join('')}</ul></div>`;
}

function controlsHTML() {
  const s = sim.state; const sel = app.ui.selected;
  const kind = diagramKind();
  let ids = diagramTerms(kind);
  if (!ids.length) ids = Object.keys(TERMINALS).filter((k) => !TERMINALS[k].bridge);
  const plugSel = (lead) => `<label>${itemName(lead)} <select data-plug="${lead}" id="plug-${lead}"><option value="">${tr(UI.unplugged)}</option>${JACKS.map((j) => `<option value="${j}"${s.plugs[lead] === j ? ' selected' : ''}>${JACK_NAMES[j]}</option>`).join('')}</select></label>`;
  const probeBtn = (lead) => {
    const inHand = sel && sel.kind === 'probe' && sel.lead === lead;
    const where = s.probes[lead] ? termLabel(s.probes[lead]) : tr(UI.parked);
    return btn('pick', `${tr(inHand ? UI.park : UI.pickUp, { c: colorName(lead) })} · ${where}`, `data-lead="${lead}" aria-pressed="${!!inHand}"`);
  };
  const parts = ['meter', 'display', 'dial', 'jack:COM', 'jack:V', 'jack:A', 'jack:mA', 'probe:handle', 'probe:guard', 'probe:tip'];
  return `<details class="card" ${app.controlsOpen ? 'open' : ''} id="controls"><summary>${tr(UI.controls)}</summary><div class="ctl">
    <div><h4>${tr(UI.dial)}</h4><div class="row">${DIAL.map((p) => btn('dial', h(DIAL_SHORT[p]), `data-pos="${p}" aria-pressed="${s.dial === p}" aria-label="${esc(tr(DIAL_NAMES[p]))}"`)).join('')}</div></div>
    <div><h4>${tr(UI.range)} / ${tr(UI.hold)}</h4><div class="row">${RANGES.map((r) => btn('range', r === 'AUTO' ? 'AUTO' : `${r} V`, `data-r="${r}" aria-pressed="${s.range === r}"`)).join('')}${btn('hold', 'HOLD', `aria-pressed="${s.hold}"`)}</div></div>
    <div><h4>${tr(UI.leadsJacks)}</h4><div class="row">${plugSel('black')}${plugSel('red')}</div></div>
    <div><h4>${tr(UI.probes)}</h4><div class="row">${probeBtn('black')}${probeBtn('red')}</div></div>
    <div><h4>${tr(UI.testPoints)}</h4><div class="row">${ids.map((id) => btn('term', `${s.intended.includes(id) ? '✔ ' : ''}${termLabel(id)}`, `data-term="${id}"`)).join('')}</div><p class="small">${tr(UI.tpHelp)}</p></div>
    <div><h4>${tr(UI.switches)}</h4><div class="row">${['lamp9', 'panel24'].map((id) => btn('switch', `${tr(id === 'lamp9' ? UI.swLamp9 : UI.swPanel)}: ${tr(s.switches[id] ? UI.closed : UI.open)}`, `data-id="${id}" aria-pressed="${s.switches[id]}"`)).join('')}</div></div>
    <div><h4>${getLang() === 'es' ? '¿Qué es esto?' : 'What is this?'}</h4><div class="row">${parts.map((k) => btn('part', h(PARTS[k].name), `data-key="${k}"`)).join('')}</div></div>
  </div></details>`;
}
function glossHTML() {
  return `<details class="card" ${app.glossOpen ? 'open' : ''} id="gloss"><summary>${tr(UI.glossary)}</summary><dl class="gloss">${GLOSSARY.map(([a, b]) => `<div><dt>${h(a)}</dt><dd>${h(b)}</dd></div>`).join('')}</dl></details>`;
}

function highlights() {
  if (app.flash && performance.now() < app.flash.until) return app.flash.keys;
  if (app.mode === 'assess' || app.finished) return [];
  const s = curStep(); const c = app.ctx;
  if (!s || c.passed || c.tryMode || app.demo) return [];
  if (app.mode === 'practice' && !c.hint) return [];
  if (s.independent && !c.hint) return [];
  return stepHi(s);
}
function stepHi(s) { return (typeof s.hi === 'function' ? s.hi(sim) : s.hi) || []; }

function paint() {
  app.ui.highlights = highlights();
  setRegion('r-nav', navHTML());
  setRegion('r-coach', coachHTML());
  setRegion('r-step', stepHTML());
  setRegion('r-meter', meterHTML());
  const dg = diagramHTML();
  setRegion('r-diagram', dg);
  setRegion('s-diagram', dg);
  setRegion('r-check', checkHTML());
  setRegion('r-controls', controlsHTML());
  setRegion('r-gloss', glossHTML());
  const timer = $('timer');
  if (timer) {
    const sec = Math.floor((performance.now() - app.started) / 1000);
    const txt = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    if (timer.textContent !== txt) timer.textContent = txt;
  }
  // caption strip
  const cap = $('caption');
  let text = '';
  if (app.captions) {
    if (app.caption && performance.now() < app.caption.until) text = app.caption.text;
    else if (app.mode === 'assess') { const t = curTask(); text = t ? tr(t.title) : ''; } else if (!app.finished) {
      const s = curStep(); const guided = app.mode === 'guided' && !s.independent;
      text = guided || app.ctx.hint ? spokenPlain(s.action) : spokenPlain(s.goal);
    }
  }
  if (cap.textContent !== text) cap.textContent = text;
  cap.hidden = !text;
  // in-hand chip
  const chip = $('chip'); const sel = app.ui.selected;
  const ct = sel ? `${tr(UI.selected)}: ${sel.kind === 'probe' ? tr(UI.holding, { c: colorName(sel.lead) }) : `${tr(PARTS.plug.name)} (${colorName(sel.lead)})`}` : '';
  if (chip.textContent !== ct) chip.textContent = ct;
  chip.hidden = !ct;
}
const spokenPlain = (o) => tr(o).replace(/<[^>]+>/g, '');

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
sim.on((ev) => {
  if (app.ctx) app.ctx.events.push(ev);
  if (ev.type === 'error' || ev.type === 'detect') {
    raise(ev.code, ev);
    if (app.coach && app.coach.code === ev.code) app.coach.t = performance.now();
  }
  const s = curStep();
  if (s && s.onEvent && app.ctx && !app.ctx.passed) {
    const code = s.onEvent(ev, app.ctx, sim);
    if (code) { raise(code, ev); if (app.coach) app.coach.t = performance.now(); }
  }
  resolveErrors(ev);
  dirty = true;
});
sim.guards.push((action) => {
  const s = curStep();
  if (action === 'touch' && s && s.predict && app.ctx && app.ctx.predicted === undefined && !app.finished) return 'predict_first';
  return null;
});

const ACTIONS = {
  next: () => next(),
  back: () => enterStep(app.stepIdx - 1, true),
  showme: () => runDemo(),
  tryit: () => { restoreStep(); app.ctx.tryMode = true; },
  again: () => { app.ctx.again = true; const s = curStep(); if (scene && s.focus) scene.focus(s.focus); app.flash = { keys: stepHi(s), until: performance.now() + 5000 }; speak([s.again || s.action, s.observe].filter(Boolean).map((x) => spoken(x)).join('. ')); },
  reset: () => restoreStep(),
  restart: () => startLesson(app.lessonIdx),
  hint: () => { app.ctx.hint = true; },
  'dg-toggle': () => { app.diagramOpen = app.diagramOpen === false; },
  explain: () => { app.ctx.explain = true; },
  ack: () => { app.ctx.acked = true; evaluate(); if (app.ctx.passed) next(); },
  quiz: (d) => {
    if (app.mode === 'assess') { if (!app.as.submitted) app.ctx.quizPick = Number(d.i); } else answerQuiz(Number(d.i));
  },
  predict: (d) => { app.ctx.predicted = Number(d.i); },
  'entry-submit': () => submitEntry(),
  'coach-retry': () => retryCoach(),
  'coach-close': () => { app.coach = null; app.info = null; },
  confirm: (d) => sim.confirm(d.item),
  inspect: (d) => inspect(d.item),
  replace: (d) => replaceLead(d.lead),
  'clear-points': () => sim.setIntended([]),
  dial: (d) => { note('dial'); sim.setDial(d.pos); },
  range: (d) => sim.setRange(d.r === 'AUTO' ? 'AUTO' : Number(d.r)),
  hold: () => sim.toggleHold(),
  pick: (d) => { note('probe:handle'); pickUp(d.lead); },
  term: (d) => chooseTerm(d.term),
  switch: (d) => sim.toggleSwitch(d.id),
  part: (d) => {
    const k = d.key;
    if (k === 'probe:tip') { showInfo(k); sim.grip('red', 'tip'); } else if (k === 'meter') { showInfo(k); inspect('meter'); } else showInfo(k);
  },
  'next-lesson': () => startLesson(Math.min(LESSONS.length - 1, app.lessonIdx + 1)),
  'go-assess': () => setMode('assess'),
  'as-start': () => startAssessment(),
  'as-submit': () => submitTask(),
  'as-retry': () => enterTask(app.as.idx),
  'as-next': () => enterTask(app.as.idx + 1),
  'as-report': () => { app.as.report = true; app.coach = null; app.ui.highlights = []; },
  'as-practice': (d) => { app.mode = 'practice'; save(); paintChrome(); startLesson(Number(d.i)); },
  view: (d) => {
    if (!scene) return;
    if (d.v === 'bench') { const s = curStep(); const t = curTask(); const k = diagramKind(); scene.focus(k && k !== 'none' && k !== 'analogy' && k !== 'wave' ? k : (s && s.focus) || (t && t.focus) || 'front'); } else scene.focus(d.v);
  },
  zoom: (d) => scene && scene.zoom(Number(d.f)),
};

function setMode(m) {
  app.mode = m; save(); paintChrome();
  app.coach = null; app.info = null;
  if (m === 'assess') { app.as = { started: false, idx: 0, results: {}, submitted: false, feedback: null, notes: new Set(), report: false }; app.ctx = newCtx(); sim.reset(); app.ui.rest = 'home'; if (scene) scene.focus('front'); } else startLesson(app.lessonIdx);
  dirty = true;
}

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (el) {
    if (el.disabled) return;
    const blocked = app.demo && !['again', 'view', 'zoom', 'coach-close', 'dg-toggle'].includes(el.dataset.act);
    if (!blocked && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el.dataset);
    dirty = true;
    return;
  }
  const tp = e.target.closest('[data-term]');
  if (tp && !app.demo) { chooseTerm(tp.dataset.term); dirty = true; }
}
document.addEventListener('click', onClick);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && app.ui.selected) { app.ui.selected = null; dirty = true; }
  const tp = e.target.closest && e.target.closest('svg [data-term]');
  if (tp && (e.key === 'Enter' || e.key === ' ') && !app.demo) { e.preventDefault(); chooseTerm(tp.dataset.term); dirty = true; }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'sel-lesson') startLesson(Number(t.value));
  else if (t.id === 'sel-mode') setMode(t.value);
  else if (t.id === 'sel-lang') { setLang(t.value); save(); paintChrome(); if (scene) scene.refreshLabels(); narrateStep(); } else if (t.dataset.plug && !app.demo) plugTo(t.dataset.plug, t.value || null);
  else if (t.id === 'f-sign') app.ctx.form.sign = t.value;
  else if (t.id === 'f-unit') app.ctx.form.unit = t.value;
  dirty = true;
});
document.addEventListener('input', (e) => { if (e.target.id === 'f-num' && app.ctx) app.ctx.form.num = e.target.value; });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'f-num') { if (app.mode === 'assess') { if (!app.as.submitted) submitTask(); } else submitEntry(); dirty = true; }
});
document.addEventListener('toggle', (e) => {
  if (e.target.id === 'controls') app.controlsOpen = e.target.open;
  if (e.target.id === 'gloss') app.glossOpen = e.target.open;
}, true);
$('btn-narr').addEventListener('click', () => { app.narration = !app.narration; if (!app.narration && canSpeak) speechSynthesis.cancel(); save(); paintChrome(); if (app.narration) narrateStep(); });
$('btn-cap').addEventListener('click', () => { app.captions = !app.captions; save(); paintChrome(); dirty = true; });
$('btn-help').addEventListener('click', () => $('help').showModal());

// ---------------------------------------------------------------------------
// Boot and main loop
// ---------------------------------------------------------------------------
const scene = createScene($('stage'), sim, ctl);
paintChrome();
if (app.mode === 'assess') setMode('assess'); else startLesson(0);
if (!store.lang) { try { $('help').showModal(); } catch (e) { /* dialog unsupported */ } }

let last = performance.now();
let paintT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  sim.tick(dt);
  if (app.mode !== 'assess') evaluate();
  resolveErrors(null);
  paintT += dt;
  if (dirty || paintT > 0.12) { dirty = false; paintT = 0; paint(); }
  if (scene) scene.update(dt);
  document.querySelectorAll('canvas.wave').forEach((c) => drawWave(c, now / 1000));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__voltageLab = { sim, app, scene, LESSONS, TASKS, actions: ACTIONS, clickPart, pickUp, chooseTerm, perform };
