/* FIRST SHIFT — application: lesson engine, assistance modes, baseline,
 * drawing-to-panel challenge, missions with evidence notebook, mock interview,
 * concept review, readiness check, meter, help, study paths, local progress.
 * Teaching content comes from js/data/*.js; circuit behavior from js/sim.js. */
(function () {
  'use strict';
  var FS = window.FS, sim = FS.sim, esc = FS.schem.esc;
  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------------ progress (local only) */
  var KEY = 'firstShift.v1', storageOk = true;
  function defaults() {
    return { started: false, lesson: 'L1', step: {}, stepsDone: {}, done: {}, missions: {}, quiz: null, path: null, pathDone: {}, rm: null, simple: false, viewed: [],
      mode: 'learn', baseline: null, rev: {}, qn: 0, caps: {}, notes: {}, quality: 'balanced', adaptive: true, uiScale: 1, sound: false, panel: null };
  }
  function loadProgress() {
    var d = defaults();
    try { var raw = window.localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) d[k] = o[k]; } } catch (e) { storageOk = false; }
    return d;
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(P)); storageOk = true; } catch (e) { storageOk = false; } }
  var P = loadProgress();

  /* ------------------------------------------------------------------ state */
  var S = sim.defaultState(), R = null, F = {};
  var ui = {
    center: 'diagram', diagram: 'lamp', sheet: 'core', specimen: null, pool: null, vb: null,
    selPart: null, selRef: null, selComp: null,
    meter: { mode: 'V', red: null, black: null, next: 'red' }, lastMeter: null, meterLog: [], log: [],
    viewed: P.viewed.length, trace: null, hint: 0, tries: 0, ans: null, done: false, reveal: true, fb: '',
    mission: null, quiz: null, ptask: null, retest: null, base: null, pred: null,
    eq: '3d', pwire: null, phide: false, labelsOn: false, layers: { cur: true, pot: false, st: true },
    insp: { terminals: false, cutaway: false, slow: false }, door: false, tab: 'mentor', zone: false
  };
  var scene = null, timers = [], cylTimer = null, dispTimer = null, overlayKind = null, diagTimer = null, prevM1 = false, audio = null;
  var REFCOMP = { PS1: 'psu', F1: 'fuse', CB1: 'breaker', DS1: 'disconnect', PB1: 'pb_nc', PB2: 'pb_no', S1: 'selector', S2: 'selector', SS2: 'selector', CR1: 'relay_coil', CR2: 'relay_coil',
    M1: 'contactor_coil', OL1: 'overload', MTR1: 'motor', PL1: 'pilot', PL2: 'pilot', TB1: 'terminal', PE: 'earth', PLC1: 'plc_in', PEC1: 'photo', FU: 'fuse',
    SRC: 'air_src', SV1: 'shutoff', FRL1: 'frl', PG1: 'gauge', V1: 'dcv', SOL1: 'solenoid', CYL1: 'cyl_da', FC: 'flow_ctrl' };
  var STATIONS = [['overview', 'Overview'], ['panel', 'Panel'], ['bench', 'Workbench'], ['conveyor', 'Conveyor'], ['display', 'Display'], ['pneu', 'Pneumatics']];
  var MODES = [['learn', 'Learn', 'Labels, explanations and highlighting are on.'], ['practice', 'Practice', 'Labels are hidden until you ask for them. Hints are available.'], ['interview', 'Interview', 'No automatic highlighting and no hints. Feedback comes after you submit.']];

  function rm() { return P.rm == null ? !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) : !!P.rm; }
  function LES() { return FS.lesson(P.lesson); }
  function idx() { return P.step[P.lesson] || 0; }
  function STEP() { return LES().steps[idx()]; }
  function D() { return FS.diagrams[ui.diagram]; }
  function cid() { return D().circuit; }
  function partById(id) { return D().parts.filter(function (p) { return p.id === id; })[0]; }
  function physOf(p) { return p.phys || (/^FC/.test(p.ref) ? 'FC' : p.ref); }
  function stopTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function lessonNo(id) { return FS.lessons.map(function (l) { return l.id; }).indexOf(id) + 1; }
  function sc(name) { if (scene && typeof scene[name] === 'function') return scene[name].apply(scene, Array.prototype.slice.call(arguments, 1)); }
  function inLesson() { return !ui.mission && !ui.quiz && !ui.ptask && !ui.retest && !LES().kind; }
  function curStep() { return inLesson() ? STEP() : null; }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* ------------------------------------------------------------------ assistance modes */
  function mode() { return ui.quiz && ui.quiz.state !== 'results' ? 'interview' : P.mode; }
  /* A question is waiting for an answer: no answer-revealing help or automatic camera moves. */
  function pending() {
    if (ui.retest) return !ui.retest.done;
    if (ui.quiz) return ui.quiz.state === 'q';
    if (ui.ptask) return ui.ptask.state === 'q';
    var st = curStep();
    return !!st && !ui.done && /^(ask|pick|find|match|trace)$/.test(st.kind);
  }
  function showLabels() { return mode() === 'learn' || ui.labelsOn; }
  function quizOn() { return !!ui.quiz && ui.quiz.state !== 'results'; }
  function curLayer() { return ui.layers.cur && !(mode() === 'interview' && pending()) && !quizOn(); }
  function potLayer() { return ui.layers.pot && !(ui.mission && !ui.reveal) && !quizOn() && !(mode() !== 'learn' && pending()); }
  function crossHl() { return !(mode() === 'interview' && pending()); }
  function applyMode() {
    sc('setLabels', showLabels()); sc('setLock', pending());
    document.body.setAttribute('data-mode', mode());
    Array.prototype.forEach.call(document.querySelectorAll('#modes [data-mode]'), function (b) { b.setAttribute('aria-pressed', b.dataset.mode === P.mode); });
    var lb = $('btnLabels');
    lb.hidden = mode() === 'learn'; lb.disabled = mode() === 'interview' && pending();
    lb.setAttribute('aria-pressed', ui.labelsOn); lb.textContent = ui.labelsOn ? 'Hide labels' : 'Show labels';
  }

  /* ------------------------------------------------------------------ concept review and readiness */
  function revOf(c) { return (P.rev[c] = P.rev[c] || { seen: 0, wrong: 0, confWrong: 0, due: null, i: 0 }); }
  function record(concept, ok, conf, cap, wasAssisted, isRetest) {
    if (concept) {
      var r = revOf(concept); P.qn++; r.seen++;
      if (!ok) { r.wrong++; if (conf === 'conf') r.confWrong++; r.due = P.qn + 3; }
      else if (isRetest) r.due = null;
    }
    if (cap && ok) credit(cap, !wasAssisted);
    save();
  }
  function credit(cap, independent) { if (independent) P.caps[cap] = 'ind'; else if (P.caps[cap] !== 'ind') P.caps[cap] = 'help'; }
  function assisted(st) { return (P.mode === 'learn' && !(st && st.noHint)) || ui.hint > 0 || ui.tries > 0 || (P.mode === 'practice' && ui.labelsOn); }
  function dueConcept() {
    var best = null;
    Object.keys(P.rev).forEach(function (c) {
      var r = P.rev[c]; if (r.due == null || r.due > P.qn || !FS.retests[c]) return;
      if (!best || r.confWrong > P.rev[best].confWrong || (r.confWrong === P.rev[best].confWrong && r.wrong > P.rev[best].wrong)) best = c;
    });
    return best;
  }
  function confHtml(sel, act) {
    return '<div class="conf" role="group" aria-label="How sure are you?"><span>How sure are you?</span>' + FS.CONF.map(function (c) {
      return '<button class="btn small" data-act="' + act + '" data-c="' + c[0] + '" aria-pressed="' + (sel === c[0]) + '">' + c[1] + '</button>';
    }).join('') + '</div>';
  }
  function sayAloud(model) {
    return '<details class="aloud2"><summary>Say it aloud (optional, 30–60 seconds)</summary><p class="frame">“' + esc(FS.FRAME) + '”</p><p class="note">Say it to the room first. Nothing is recorded.</p>' +
      '<details><summary>Show a model answer</summary><p><span class="tagm">Model answer</span> ' + esc(model) + '</p></details></details>';
  }

  /* ------------------------------------------------------------------ simulation plumbing */
  function resetSim() {
    S = sim.defaultState(); ui.log = []; ui.meterLog = []; ui.lastMeter = null;
    ui.meter.red = null; ui.meter.black = null; ui.meter.next = 'red'; ui.meter.mode = 'V';
  }
  function applyPreset(p) {
    if (!p) return;
    var q = {}; Object.keys(p).forEach(function (k) { if (k !== 'run') q[k] = p[k]; });
    sim.patch(S, q); sim.settle(cid(), S);
    if (p.run) sim.run(cid(), S, [{ 'pb.PB2': true }, { 'pb.PB2': false }]);
  }
  function setKey(key, val) {
    sim.setPath(S, key, val); ui.log.push(key + ':' + val);
    if (/^pb\./.test(key)) click(val ? 880 : 620, 0.03);
    refresh();
  }
  function ctx() {
    return { S: S, res: R, flags: F, selPart: ui.selPart, selRef: ui.selRef, reveal: ui.reveal, hideFaults: !!ui.mission, trace: ui.trace, probes: ui.meter, rm: rm(),
      labels: showLabels(), link: showLabels() && crossHl(), layers: { cur: curLayer(), pot: potLayer(), st: ui.layers.st }, vb: ui.vb };
  }
  function refresh() {
    var d = D();
    R = sim.settle(d.circuit, S);
    var fl = sim.fluid(S, R.el.SOL1 ? R.el.SOL1.on : false);
    F = { motor: d.circuit === 'starter' && S.mains && S.relay.M1, supply: sim.powered(S), p0: fl.p0, p: fl.p, pA: fl.pA, pB: fl.pB, act: fl.act, bar: fl.bar };
    var m1 = d.circuit === 'starter' && S.relay.M1; if (m1 !== prevM1) { prevM1 = m1; click(m1 ? 150 : 110, 0.07); }
    drawCenter(); syncControls(); drawMeter(); updateScene(); checkGoal(); scheduleDisplay(); drawPanel(); drawLayerBar(); applyMode();
  }
  function viewObj() {
    function on(id) { return !!(R.el[id] && R.el[id].on); }
    var c = cid();
    return { supply: sim.powered(S), fuseIn: S.fuseIn, mains: S.mains, PB1: S.pb.PB1, PB2: S.pb.PB2, S1: S.sw.S1, S2: S.sw.S2, SS2: S.sw.SS2,
      PL1: on('PL1'), PL2: on('PL2'), CR1: c === 'ladD' && S.relay.CR1, CR2: c === 'plc' && S.relay.CR2, M1: c === 'starter' && S.relay.M1, motor: F.motor,
      ol: S.olTripped, I0: c === 'plc' && S.plc.I0, Q0: c === 'plc' && S.plc.Q0, sensor: c === 'plc' && sim.powered(S) && R.el.PEC1.closed,
      sol: on('SOL1'), air: S.air, bar: c === 'pneu' ? F.bar : 0, cyl: S.cyl, box: c === 'plc' && S.box };
  }
  function updateScene() { if (scene && R) scene.update(viewObj()); }
  function scheduleDisplay() {
    if (!scene) return;
    clearTimeout(dispTimer);
    dispTimer = setTimeout(function () {
      if (ui.center !== 'diagram') return;
      var cs = getComputedStyle(document.documentElement), vars = {};
      (FS.schem.CSS.match(/--[a-z0-9]+/g) || []).forEach(function (n) { vars[n] = cs.getPropertyValue(n).trim(); });
      scene.setDisplay(FS.schem.standalone(D(), ctx(), vars), D().vb, D().title);
    }, 350);
  }
  /* Optional sound: short synthesized clicks. Never the only feedback. */
  function click(freq, dur) {
    if (!P.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
    } catch (e) { /* sound is optional */ }
  }

  /* ------------------------------------------------------------------ centre: diagram / symbol sheet / specimen */
  function setDiagram(id) {
    var changed = ui.diagram !== id || ui.center !== 'diagram';
    ui.center = 'diagram'; ui.diagram = id;
    var names = (D().tps || []).map(function (t) { return t.n; });
    if (names.indexOf(ui.meter.red) < 0) ui.meter.red = null;
    if (names.indexOf(ui.meter.black) < 0) ui.meter.black = null;
    clearInterval(cylTimer); cylTimer = null;
    if (D().circuit === 'pneu') {
      cylTimer = setInterval(function () {
        if (ui.center !== 'diagram' || D().circuit !== 'pneu' || !R || !R.el.SOL1) return;
        if (sim.tickCylinder(S, R.el.SOL1.on, 0.05, rm())) refresh();
      }, 50);
    }
    if (changed) { ui.vb = null; buildControls(); drawSchemHeader(); }
  }
  function setSheet(group, pool) { ui.center = 'sheet'; ui.sheet = group; ui.pool = pool || null; buildControls(); drawSchemHeader(); }
  function setSpecimen(sp) { ui.center = 'specimen'; ui.specimen = sp; buildControls(); drawSchemHeader(); }
  function setBlank() { ui.center = 'blank'; buildControls(); drawSchemHeader(); }

  function drawSchemHeader() {
    var L = LES(), tabs = '', title, conv;
    if (ui.center === 'diagram') { title = D().title; conv = D().style; }
    else if (ui.center === 'sheet') { title = { core: 'Core symbols', optional: 'Optional recognition symbols', fluid: 'Fluid power symbols' }[ui.sheet]; conv = ui.sheet === 'fluid' ? 'Simplified ISO 1219 style' : 'Simplified North American ladder style'; }
    else { title = ui.center === 'blank' ? 'Question' : 'Symbol'; conv = 'Simplified North American ladder style'; }
    $('schemTitle').textContent = title;
    $('convention').innerHTML = '<span class="badge">' + esc(conv) + '</span><span class="conv-note">IEC and other conventions differ. Always read the legend.</span>';
    if (inLesson() && L.tabs) {
      tabs = L.tabs.map(function (t) {
        var cur = t[0].indexOf('sheet:') === 0 ? (ui.center === 'sheet' && ui.sheet === t[0].slice(6)) : (ui.center === 'diagram' && ui.diagram === t[0]);
        return '<button class="tab" role="tab" aria-selected="' + cur + '" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>';
      }).join('');
    }
    $('tabs').innerHTML = tabs;
    drawLegend(); drawLayerBar();
  }
  function drawLayerBar() {
    var isD = ui.center === 'diagram', potOk = isD && !(ui.mission && !ui.reveal) && !quizOn();
    function b(k, label, on, dis, title) { return '<button class="lay" data-lay="' + k + '" aria-pressed="' + on + '"' + (dis ? ' disabled' : '') + ' title="' + title + '"><i class="k k-' + k + '"></i>' + label + '</button>'; }
    $('layers').innerHTML = !isD ? '' : '<span class="lay-l">Show</span>' +
      b('cur', 'Current path', ui.layers.cur, false, 'Current through a complete conducting path') +
      b('pot', 'Potential vs 0V', ui.layers.pot && potOk, !potOk, potOk ? 'Points at supply potential relative to the 0V reference. Potential is not current.' : 'Not available while a fault is hidden or during a question: use the meter') +
      b('st', 'Device state', ui.layers.st, false, 'Mechanical or logical state of each device');
    $('zoomBar').hidden = !isD;
  }
  function drawLegend() {
    var o = '<div class="lg-keys">' +
      '<span><i class="k k-cur"></i>Orange, thick, dashed: <b>current</b> through a complete path</span>' +
      '<span><i class="k k-pot"></i>Violet band: point at <b>supply potential</b> relative to 0V (voltage present, not necessarily current)</span>' +
      '<span><i class="k k-st"></i>Text tag (● CLOSED, ○ OPEN, ENERGIZED) and filled coil or lamp: <b>device state</b></span>' +
      '<span><i class="k k-idle"></i>Gray, thin: no current</span>' +
      '<span><i class="k k-sel"></i>Blue box + “SELECTED”: selected (dashed + “SAME DEVICE”: its other parts)</span>' +
      '<span><i class="k k-fault"></i>Red ✕ + label: revealed fault</span>' +
      (ui.center === 'diagram' && D().circuit === 'pneu' ? '<span><i class="k k-fluid"></i>Teal, very thick: pressurized air line (not a wire)</span>' : '') + '</div>';
    if (ui.center === 'diagram') {
      o += '<dl class="lg-list">' + D().legend.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<p class="lg-note">Symbols are drawn in their reference state (not pressed, de-energized). A coil operates only with the right voltage across its two terminals; potential at one terminal alone does not operate it. Reference labels and terminal numbers belong to this training set: other drawings use others.</p>';
    } else {
      o += '<p class="lg-note">Each card is one symbol in its reference state. Labels such as CR1 or M1 are examples used in this application, not universal standards.</p>';
    }
    $('legendBody').innerHTML = o;
  }
  function drawCenter() {
    var box = $('diagram');
    if (ui.center === 'diagram') {
      var a = document.activeElement, keep = null;
      if (a && box.contains(a)) keep = a.dataset.part ? '[data-part="' + a.dataset.part + '"]' : (a.dataset.tp ? '[data-tp="' + a.dataset.tp + '"]' : null);
      box.className = 'diagram';
      box.innerHTML = FS.schem.render(D(), ctx());
      if (keep) { var n = box.querySelector(keep); if (n) n.focus(); }
    } else if (ui.center === 'sheet') {
      drawSheet(box);
    } else if (ui.center === 'blank') {
      box.className = 'diagram specimen';
      box.innerHTML = '<div class="spec"><span>No drawing for this question. Answer in the explanation panel.</span></div>';
    } else {
      box.className = 'diagram specimen';
      box.innerHTML = '<div class="spec">' + FS.sym.card(ui.specimen.sym, ui.specimen.o, 'Symbol to identify') + '<span>Symbol shown in its reference state</span></div>';
    }
  }
  function drawSheet(box) {
    var st = curStep(), picking = st && st.kind === 'pick' && !ui.done, hide = picking || !showLabels();
    var list = FS.components.filter(function (c) { return ui.pool ? ui.pool.indexOf(c.id) >= 0 : c.group === ui.sheet; });
    if (ui.pool) list.sort(function (a, b) { return ui.pool.indexOf(a.id) - ui.pool.indexOf(b.id); });
    box.className = 'diagram sheet';
    box.innerHTML = '<div class="cards">' + list.map(function (c, i) {
      var seen = P.viewed.indexOf(c.id) >= 0, isSel = ui.selComp === c.id, anon = hide && !(isSel && !picking);
      return '<button class="card' + (isSel ? ' sel' : '') + '" data-comp="' + c.id + '" aria-pressed="' + isSel + '">' +
        FS.sym.card(c.sym, c.o, anon ? 'Symbol ' + (i + 1) : c.name) +
        '<span class="card-n">' + (anon ? 'Symbol ' + (i + 1) : esc(c.name)) + '</span>' +
        (anon ? '' : '<span class="card-r">' + esc(c.ref) + (seen ? ' · viewed' : '') + '</span>') + '</button>';
    }).join('') + '</div>';
  }
  /* zoom and pan of the vector drawing (viewBox only: lines and text stay sharp) */
  function clampVb(v) { var b = D().vb; v[0] = Math.max(b[0], Math.min(b[0] + b[2] - v[2], v[0])); v[1] = Math.max(b[1], Math.min(b[1] + b[3] - v[3], v[1])); return v; }
  function zoomBy(f, fx, fy) {
    if (ui.center !== 'diagram') return;
    var b = D().vb, v = ui.vb || b.slice(), nw = Math.max(b[2] / 8, Math.min(b[2], v[2] * f)), nh = nw * b[3] / b[2];
    fx = fx == null ? 0.5 : fx; fy = fy == null ? 0.5 : fy;
    ui.vb = nw >= b[2] - 0.5 ? null : clampVb([v[0] + (v[2] - nw) * fx, v[1] + (v[3] - nh) * fy, nw, nh]);
    drawCenter();
  }

  /* ------------------------------------------------------------------ selection (drawing ↔ equipment) */
  function clearSel() { ui.selPart = null; ui.selRef = null; ui.selComp = null; if (scene) { scene.select(null); scene.bench(null, null, null); } sc('inspect', null); drawInspect(); }
  function showOnBench(compId) {
    var c = FS.comp(compId); if (!scene || !c) return;
    if (scene.inspect) { scene.bench(null, null, null); scene.inspect(c.shape, ui.insp); } else scene.bench([c.shape], null, [compId]);
    scene.select('__bench'); scene.focusOn('__bench');
  }
  function setDoor(open) {
    ui.door = !!open; sc('setDoor', ui.door);
    var b = $('btnDoor'); if (b) { b.textContent = ui.door ? 'Close door' : 'Open panel (simulated)'; b.setAttribute('aria-pressed', ui.door); }
  }
  function afterSelect(phys, quiet) {
    if (scene && crossHl()) {
      if (phys && scene.has(phys)) {
        scene.bench(null, null, null); sc('inspect', null);
        if (scene.isInside) setDoor(!!scene.isInside(phys));
        scene.select(phys); if (!quiet) scene.focusOn(phys);
      } else if (ui.selComp) showOnBench(ui.selComp);
    }
    drawCompCard(); drawCenter(); drawChips(); drawPanel(); drawInspect(); checkGoal(); scheduleDisplay();
  }
  function selectPart(id, quiet) {
    var p = partById(id); if (!p) return;
    ui.selPart = id; ui.selRef = p.ref; ui.selComp = p.comp;
    afterSelect(physOf(p), quiet);
  }
  function selectRef(ref) {
    if (ui.center === 'diagram') {
      var cands = D().parts.filter(function (q) { return physOf(q) === ref; });
      var p = cands.filter(function (q) { return q.comp === REFCOMP[ref]; })[0] || cands[0];
      if (p) return onPart(p.id);
    }
    if (ui.quiz) return;
    ui.selPart = null; ui.selRef = ref; ui.selComp = REFCOMP[ref] || null;
    afterSelect(ref);
  }
  function selectComp(compId) {
    ui.selComp = compId; ui.selPart = null; ui.selRef = null;
    if (P.viewed.indexOf(compId) < 0) { P.viewed.push(compId); ui.viewed = P.viewed.length; save(); }
    showOnBench(compId);
    drawCompCard(); drawCenter(); drawChips(); drawInspect(); checkGoal();
  }
  function onPart(id) {
    var p = partById(id); if (!p) return;
    if (ui.quiz) return quizPick(id);
    var st = curStep();
    if (st && st.kind === 'find' && !ui.done) return findAnswer(id);
    if (ui.trace) {
      if (!p.el) { setFb('note', esc(p.name || p.ref) + ' is not part of the control path. Click the devices on the rung.'); return; }
      var i = ui.trace.indexOf(p.el);
      if (i >= 0) ui.trace.splice(i, 1); else ui.trace.push(p.el);
      drawCenter(); drawTraceList(); return;
    }
    selectPart(id);
  }
  function onTP(n) {
    var m = ui.meter;
    m[m.next] = n; m.next = m.next === 'red' ? 'black' : 'red';
    refresh(); logMeter();
  }
  function logMeter() {
    var m = ui.meter;
    if (m.red && m.black && ui.lastMeter) { ui.meterLog.push({ mode: m.mode, a: m.red, b: m.black, value: ui.lastMeter.value }); checkGoal(); }
  }

  function drawChips() {
    var o = '';
    if (ui.eq === 'panel') o = '<span class="chips-l">Simulated panel view. Click a device or a terminal. This is a learning view, not an instruction to open or test real energized equipment.</span>';
    else if (ui.center === 'diagram') {
      var seen = {};
      D().parts.forEach(function (p) {
        var ph = physOf(p); if (seen[ph]) return; seen[ph] = 1;
        var cur = crossHl() && ui.selRef && (ui.selRef === p.ref);
        o += '<button class="chip' + (cur ? ' sel' : '') + '" data-ref="' + esc(ph) + '" aria-pressed="' + !!cur + '">' + esc(p.name && p.name.length < 9 ? p.name : (ph === 'FU' ? 'FU1–3' : ph === 'FC' ? 'FC1–2' : ph === 'SRC' ? 'Air' : ph)) + '</button>';
      });
      o = '<span class="chips-l">Parts on this drawing</span>' + o;
    } else if (ui.center === 'sheet') o = '<span class="chips-l">Select a symbol card. The part appears on the workbench.</span>';
    else o = '<span class="chips-l">Answer in the explanation panel.</span>';
    $('chips').innerHTML = o;
  }
  /* Component inspection tools (terminals, simplified cutaway). */
  function drawInspect() {
    var box = $('inspect'), c = ui.selComp && FS.comp(ui.selComp);
    if (!c || !scene || !scene.inspect || ui.eq !== '3d' || ui.quiz || pending()) { box.hidden = true; box.innerHTML = ''; return; }
    var cut = /^(contactor|relay|aux)$/.test(c.shape);
    box.hidden = false;
    box.innerHTML = '<span class="chips-l">Inspect: ' + esc(c.name) + '</span>' +
      '<button class="btn small" data-insp="bench">On the bench</button>' +
      '<button class="btn small" data-insp="terminals" aria-pressed="' + ui.insp.terminals + '">Show terminals</button>' +
      (cut ? '<button class="btn small" data-insp="cutaway" aria-pressed="' + ui.insp.cutaway + '">Cutaway</button><button class="btn small" data-insp="slow" aria-pressed="' + ui.insp.slow + '"' + (ui.insp.cutaway ? '' : ' disabled') + '>Slow motion</button>' +
        (ui.insp.cutaway ? '<button class="btn small" data-insp="reassemble">Reassemble</button>' : '') : '') +
      (ui.insp.cutaway && cut ? '<p class="note">Simplified functional illustration — internal construction varies. The coil moves the contact carrier mechanically; the coil and the contacts are not electrically connected inside the device.</p>' : '');
  }
  function drawCompCard() {
    var box = $('compCard'), c = ui.selComp && FS.comp(ui.selComp), st = curStep();
    var hidden = !c || ui.quiz || ui.retest || (ui.ptask && ui.ptask.state === 'q') || (st && (st.kind === 'pick' || st.kind === 'match' || st.kind === 'find') && !ui.done) || (mode() === 'interview' && pending());
    if (hidden) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    var same = '';
    if (ui.center === 'diagram' && ui.selRef) {
      var mates = D().parts.filter(function (p) { return p.ref === ui.selRef; }), names = {};
      mates.forEach(function (p) { names[FS.comp(p.comp).name + (p.sub && !p.plain ? ' (' + p.sub + ')' : '')] = 1; });
      if (Object.keys(names).length > 1) {
        same = '<div class="same"><b>' + esc(ui.selRef) + ' appears ' + Object.keys(names).length + ' times on this drawing.</b> They are parts of one device, linked mechanically and by the shared tag, not necessarily by a wire:<ul>' +
          Object.keys(names).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
      }
    }
    var body = '<dl class="cc">' +
      '<dt>Purpose</dt><dd>' + esc(c.purpose) + '</dd><dt>What it looks like</dt><dd>' + esc(c.looks) + '</dd><dt>Normal state</dt><dd>' + esc(c.normal) + '</dd>' +
      '<dt>Where you find it</dt><dd>' + esc(c.where) + '</dd><dt>Common misunderstanding</dt><dd>' + esc(c.myth) + '</dd>' +
      (c.note ? '<dt>Note</dt><dd>' + esc(c.note) + '</dd>' : '') + (c.iec ? '<dt>Other conventions</dt><dd>' + esc(c.iec) + '</dd>' : '') +
      '</dl><details class="iq"><summary>Interview question: ' + esc(c.q) + '</summary><p>' + esc(c.a) + '</p></details>';
    box.innerHTML = '<div class="cc-h"><div class="cc-sym">' + FS.sym.card(c.sym, c.o, c.name) + '</div><div><h4>' + (showLabels() || ui.done ? esc(c.name) : 'Selected part') + '</h4><div class="cc-ref">Tag in this application: <b>' + esc(c.ref) + '</b></div></div></div>' +
      (showLabels() ? same + body : '<details class="iq"><summary>Explain this part</summary><p><b>' + esc(c.name) + '</b></p>' + same + body + '</details>');
  }

  /* ------------------------------------------------------------------ panel inspection view (2D, simulated) */
  function setEq(v) {
    ui.eq = v; $('app').setAttribute('data-eq', v);
    $('view3d').hidden = v !== '3d'; $('panelView').hidden = v !== 'panel'; $('camBar').hidden = v !== '3d'; $('viewNote').hidden = v !== '3d';
    Array.prototype.forEach.call(document.querySelectorAll('#eqTabs [data-eq]'), function (b) { b.setAttribute('aria-selected', b.dataset.eq === v); });
    if (v === '3d') sc('resize');
    drawPanel(); drawChips(); drawInspect();
  }
  function drawPanel() {
    if (ui.eq !== 'panel') return;
    var t = ui.ptask, task = t && FS.panel.tasks[t.i], o = { names: showLabels(), view: R ? viewObj() : null };
    var free = !t || t.state !== 'q';
    if (t && t.state === 'q') o.pick = t.pick;
    else if (t && t.state === 'done') { if (t.ok) o.right = [t.pick]; else { o.wrong = t.pick; o.right = task.ok.map(function (k) { return k.replace(/:$/, ''); }); } }
    if (free && crossHl() && !(t && t.state === 'done')) o.sel = ui.selRef;
    if (free && ui.pwire) { o.wire = ui.pwire; o.hide = ui.phide; }
    $('panelSvg').innerHTML = FS.panel.render(o);
    $('panelTools').innerHTML = '<span class="chips-l">Trace a wire by its identifier' + (free ? '' : ' (available after you answer)') + '</span>' + FS.panel.WIRE_ORDER.map(function (w) {
      return '<button class="chip" data-wire="' + esc(w) + '" aria-pressed="' + (ui.pwire === w) + '"' + (free ? '' : ' disabled') + '>' + esc(w) + '</button>';
    }).join('') + '<button class="btn small" data-wire="~hide" aria-pressed="' + ui.phide + '"' + (free && ui.pwire ? '' : ' disabled') + '>Hide unrelated</button><button class="btn small" data-wire="~all"' + (ui.pwire ? '' : ' disabled') + '>Restore complete view</button>' +
      (free && ui.pwire ? '<p class="note">Wire ' + esc(ui.pwire) + ' joins: ' + FS.panel.routeOf(ui.pwire).ends.map(FS.panel.show).join(', ') + '. The dashed part is an instructional overlay of its route inside the duct, where the real wire is not visible. Use the wire identifier, never wire color alone.</p>' : '');
  }
  function onHot(hot) {
    var t = ui.ptask;
    if (t && t.state === 'q') { t.pick = hot; drawPanel(); renderPanelTask(); return; }
    if (t && t.state === 'done') return;
    selectRef(hot.split(':')[0]); drawPanel();
    $('helpOut').innerHTML = '<div class="helpbox"><h4>On the panel</h4><div>You selected ' + esc(FS.panel.describe(hot)) + '. Sheet 4 of the drawing set lists every terminal connection.</div></div>';
  }

  /* ------------------------------------------------------------------ simulation controls */
  var POW = { t: 'tog', key: 'supply', l: 'Control power', v: ['ON', 'OFF'] };
  var SW1 = { t: 'tog', key: 'sw.S1', l: 'S1 switch', v: ['ON', 'OFF'] }, SW2 = { t: 'tog', key: 'sw.S2', l: 'S2 switch', v: ['ON', 'OFF'] };
  var CTL = {
    lamp: [SW1, { t: 'tog', key: 'fuseIn', l: 'F1 fuse', v: ['INSTALLED', 'REMOVED'] }, { t: 'tog', key: 'faults.wireOpen', l: 'Wire 2', v: ['OPEN', 'INTACT'] }, POW],
    ladA: [SW1, POW], ladB: [SW1, SW2, POW], ladC: [SW1, SW2, POW], ladD: [SW1, POW],
    starter: [{ t: 'hold', key: 'pb.PB2', l: 'START · PB2', cls: 'go', kb: 'S' }, { t: 'hold', key: 'pb.PB1', l: 'STOP · PB1', cls: 'stop', kb: 'X' },
      { t: 'act', key: 'olTripped', val: true, l: 'Trip overload' }, { t: 'act', key: 'olTripped', val: false, l: 'Reset overload' }, POW,
      { t: 'tog', key: 'mains', l: 'DS1 disconnect', v: ['CLOSED', 'OPEN'] }],
    plc: [{ t: 'tog', key: 'box', l: 'Box at sensor', v: ['PRESENT', 'AWAY'] }, POW],
    pneu: [{ t: 'tog', key: 'sw.SS2', l: 'SS2 selector', v: ['EXTEND', 'RETRACT'] }, { t: 'tog', key: 'air', l: 'SV1 air shutoff', v: ['OPEN', 'CLOSED'] }, POW]
  };
  function currentControls() {
    if (ui.center !== 'diagram' || ui.quiz || ui.ptask || ui.retest) return [];
    if (D().sheet === 1 || D().sheet === 4) return [];
    var list = CTL[cid()] || [];
    if (ui.mission) { var allow = FS.mission(ui.mission.id).controls; list = list.filter(function (c) { return c.t !== 'act' && allow.indexOf(c.key) >= 0; }); }
    return list;
  }
  function buildControls() {
    var list = currentControls(), o = '';
    list.forEach(function (c, i) {
      if (c.t === 'tog') o += '<button class="ctl tog" data-i="' + i + '"><span class="ctl-l">' + esc(c.l) + '</span><span class="ctl-v"></span></button>';
      else if (c.t === 'hold') o += '<button class="ctl hold ' + c.cls + '" data-i="' + i + '" aria-pressed="false"><span class="ctl-l">' + esc(c.l) + '</span><span class="ctl-v">momentary: hold' + (c.kb ? ' · key ' + c.kb : '') + '</span></button>';
      else o += '<button class="ctl act" data-i="' + i + '"><span class="ctl-l">' + esc(c.l) + '</span><span class="ctl-v">press once</span></button>';
    });
    $('controls').innerHTML = o || '<span class="ctl-none">No simulation controls on this view.</span>';
    if (R) syncControls();
  }
  function syncControls() {
    var list = currentControls();
    Array.prototype.forEach.call($('controls').querySelectorAll('.ctl'), function (b) {
      var c = list[+b.dataset.i]; if (!c) return;
      var v = sim.getPath(S, c.key);
      if (c.t === 'tog') { b.querySelector('.ctl-v').textContent = v ? c.v[0] : c.v[1]; b.setAttribute('aria-pressed', !!v); }
      else if (c.t === 'hold') { b.setAttribute('aria-pressed', !!v); b.classList.toggle('down', !!v); }
      else b.disabled = (v === c.val);
    });
  }
  function bindControls() {
    var box = $('controls');
    function ctlOf(e) { var b = e.target.closest('.ctl'); return b ? { b: b, c: currentControls()[+b.dataset.i] } : null; }
    box.addEventListener('click', function (e) {
      var q = ctlOf(e); if (!q || !q.c) return;
      if (q.c.t === 'tog') setKey(q.c.key, !sim.getPath(S, q.c.key));
      else if (q.c.t === 'act') setKey(q.c.key, q.c.val);
    });
    function press(e, down) {
      var q = ctlOf(e); if (!q || !q.c || q.c.t !== 'hold') return;
      if (sim.getPath(S, q.c.key) !== down) setKey(q.c.key, down);
    }
    box.addEventListener('pointerdown', function (e) { var q = ctlOf(e); if (q && q.c && q.c.t === 'hold') { e.preventDefault(); q.b.focus(); if (q.b.setPointerCapture) try { q.b.setPointerCapture(e.pointerId); } catch (x) {} press(e, true); } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { box.addEventListener(n, function (e) { press(e, false); }); });
    box.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { var q = ctlOf(e); if (q && q.c && q.c.t === 'hold') { e.preventDefault(); press(e, true); } } });
    box.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') press(e, false); });
    box.addEventListener('focusout', function (e) { press(e, false); });
  }

  /* ------------------------------------------------------------------ virtual meter */
  function drawMeter() {
    var box = $('meter'), m = ui.meter, has = ui.center === 'diagram' && (D().tps || []).length && !ui.quiz && !ui.ptask && !ui.retest && !(D().sheet === 1 || D().sheet === 4);
    if (!has) { box.innerHTML = '<div class="m-h">Meter</div><p class="m-note">No test points on this view.</p>'; ui.lastMeter = null; return; }
    var r = sim.meter(cid(), S, m.mode, m.red, m.black);
    ui.lastMeter = (m.red && m.black) ? { mode: m.mode, a: m.red, b: m.black, value: r.value, ok: !!r.ok, blocked: !!r.blocked, na: !!r.na } : null;
    var lcd = box.querySelector('.m-lcd');
    if (!lcd) {
      box.innerHTML = '<div class="m-h">Meter <span>simulated 24 VDC control circuit only · needs two points</span></div>' +
        '<div class="m-row"><div class="m-modes" role="group" aria-label="Meter function"><button data-mode="V">DC volts</button><button data-mode="R">Continuity Ω</button></div>' +
        '<div class="m-lcd" role="status" aria-live="polite"></div></div>' +
        '<div class="m-row"><button class="m-probe red" data-probe="red"></button><button class="m-probe black" data-probe="black"></button><button class="m-clear" data-probe="clear">Clear</button></div>' +
        '<p class="m-note"></p>';
      lcd = box.querySelector('.m-lcd');
    }
    Array.prototype.forEach.call(box.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m.mode); });
    if (lcd.textContent !== r.text) lcd.textContent = r.text;
    lcd.classList.toggle('blocked', !!r.blocked || !!r.na);
    var pr = box.querySelector('[data-probe="red"]'), pb = box.querySelector('[data-probe="black"]');
    pr.textContent = 'Red +: ' + (m.red || 'click a test point'); pb.textContent = 'Black − (reference): ' + (m.black || 'click a test point');
    pr.classList.toggle('next', m.next === 'red'); pb.classList.toggle('next', m.next === 'black');
    box.querySelector('.m-note').textContent = r.note || '';
  }
  function bindMeter() {
    $('meter').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mode) { ui.meter.mode = b.dataset.mode; refresh(); logMeter(); }
      else if (b.dataset.probe === 'clear') { ui.meter.red = ui.meter.black = null; ui.meter.next = 'red'; refresh(); }
      else if (b.dataset.probe) { ui.meter.next = b.dataset.probe; drawMeter(); }
    });
  }

  /* ------------------------------------------------------------------ mentor panel: lessons */
  function alexHead(phase, where) {
    return '<div class="alex"><div class="avatar" aria-hidden="true">A</div><div><div class="who">Alex · your mentor</div><div class="where">' + esc(where) + '</div></div><span class="phase">' + esc(phase) + '</span></div>';
  }
  function phaseOf(st) {
    if (st.noHint) return 'No-hint check';
    return { say: 'Explain', demo: 'Demonstrate', 'try': 'Try it', ask: st.predict ? 'Predict' : 'Check', pick: 'Try it', match: 'Try it', trace: 'Trace the path', find: 'Try it' }[st.kind];
  }
  function cardsHtml(cards) {
    return (cards || []).map(function (c) {
      return '<div class="lcard"><h4>' + esc(c.h) + '</h4>' +
        (c.syms ? '<div class="lsyms">' + c.syms.map(function (s) { return '<figure>' + FS.sym.card(s[0], null, s[1]) + '<figcaption>' + esc(s[1]) + '</figcaption></figure>'; }).join('') + '</div>' : '') +
        '<ul>' + c.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }
  /* ans: submitted index (marks shown) · sel: chosen but not yet submitted */
  function choicesHtml(choices, ans, act, sel) {
    return '<div class="choices">' + choices.map(function (c, i) {
      var cls = 'choice', mark = '';
      if (ans != null) { if (c.ok) { cls += ' right'; mark = '<span class="mk">✓ correct</span>'; } else if (i === ans) { cls += ' wrong'; mark = '<span class="mk">✗ your answer</span>'; } }
      else if (sel === i) { cls += ' chosen'; mark = '<span class="mk">selected</span>'; }
      return '<button class="' + cls + '" data-act="' + act + '" data-i="' + i + '"' + (ans != null ? ' disabled' : '') + ' aria-pressed="' + (sel === i) + '"><span>' + c.t + '</span>' + mark + '</button>';
    }).join('') + '</div>';
  }
  function setFb(kind, html) { ui.fb = html ? '<div class="fbx ' + kind + '">' + html + '</div>' : ''; var n = $('fb'); if (n) n.innerHTML = ui.fb; }
  function noteBox(key, label) {
    return '<label class="notes"><span>' + esc(label) + '</span><textarea id="note-' + esc(key) + '" data-note="' + esc(key) + '" rows="2" placeholder="Optional. Saved on this device only.">' + esc(P.notes[key] || '') + '</textarea></label>';
  }

  function renderMentor() {
    if (ui.retest) return renderRetest();
    if (ui.mission) return renderMission();
    if (ui.quiz) return renderQuiz();
    if (ui.ptask) return renderPanelTask();
    var L = LES(), st = STEP(), o = '';
    if (L.kind === 'missions') return renderMissionHome();
    if (L.kind === 'quiz') return renderQuizHome();
    if (L.kind === 'panel') return renderPanelHome();
    o += alexHead(phaseOf(st), 'Lesson ' + lessonNo(L.id) + ' · step ' + (idx() + 1) + ' of ' + L.steps.length);
    o += '<h3>' + esc(st.title) + '</h3>';
    if (st.text) o += '<p class="say">' + st.text + '</p>';
    o += cardsHtml(st.card);
    if (st.safety) o += '<div class="safety"><b>Safety</b> ' + esc(st.safety) + '</div>';
    if (st.kind === 'demo') {
      if (st.expect) {
        o += '<p class="q">' + esc(st.expect.q) + '</p><div class="choices">' + st.expect.choices.concat([FS.IDK]).map(function (c, i) {
          return '<button class="choice' + (ui.pred === i ? ' chosen' : '') + '" data-act="expect" data-i="' + i + '" aria-pressed="' + (ui.pred === i) + '"><span>' + esc(c) + '</span>' + (ui.pred === i ? '<span class="mk">your prediction</span>' : '') + '</button>';
        }).join('') + '</div>';
      }
      var ready = !st.expect || ui.pred != null;
      o += '<div class="row"><button class="btn primary" data-act="demo"' + (ready ? '' : ' disabled') + '>▶ Play demonstration</button><button class="btn" data-act="demoSlow"' + (ready ? '' : ' disabled') + '>Replay slowly</button><button class="btn" data-act="demoQuiet"' + (ready ? '' : ' disabled') + '>Show without hints</button></div>' +
        (ready ? '' : '<p class="note">Predict first. Then I\'ll run it.</p>') + '<p class="note" id="demoNote" role="status" aria-live="polite"></p><div id="demoCmp"></div>';
    } else if (st.kind === 'try') {
      o += '<div class="goal" id="goal"></div>';
    } else if (st.kind === 'ask') {
      o += '<p class="q">' + st.q + '</p>' + (st.predict && ui.ans == null ? '<p class="note">What do you expect to happen, and why? Commit to an answer, then I\'ll run it.</p>' : '') + choicesHtml(st.choices, ui.ans, 'answer');
      if (st.predict) o += noteBox(L.id + '.' + idx(), 'Why? (your own note)');
    } else if (st.kind === 'pick') {
      o += '<p class="q">' + st.q + '</p><p class="note">Names are hidden for this exercise. Click a symbol card.</p>';
    } else if (st.kind === 'find') {
      o += '<p class="q">' + st.q + '</p><p class="note">Click it on the drawing.</p>';
    } else if (st.kind === 'match') {
      o += '<p class="q">' + st.q + '</p><div class="choices">' + st.bench.map(function (id, i) {
        var c = FS.comp(id), cls = 'choice', mark = '';
        if (ui.ans != null) { if (id === st.answer && ui.done) { cls += ' right'; mark = '<span class="mk">✓ correct</span>'; } else if (i === ui.ans) { cls += ' wrong'; mark = '<span class="mk">✗ your answer</span>'; } }
        return '<button class="' + cls + '" data-act="match" data-i="' + i + '"' + (ui.done ? ' disabled' : '') + '><span><b>' + 'ABCD'[i] + '</b> · ' + esc(st.opts ? st.opts[i] : c.looks) + '</span>' + mark + '</button>';
      }).join('') + '</div><p class="note">The four parts are on the workbench, labelled A to D. You can also click one there.</p>';
    } else if (st.kind === 'trace') {
      o += '<div class="trace"><div>Your path: <b id="traceList"></b></div><div class="row"><button class="btn primary" data-act="traceCheck">Check answer</button><button class="btn" data-act="traceClear">Clear</button></div></div>';
    }
    o += '<div id="fb" role="status" aria-live="polite">' + ui.fb + '</div>';
    $('mentor').innerHTML = o;
    if (st.kind === 'try') drawGoal();
    if (st.kind === 'trace') drawTraceList();
  }
  function drawGoal() {
    var n = $('goal'), st = STEP(); if (!n) return;
    var extra = P.lesson === 'L3' && idx() === 1 ? ' Viewed so far: ' + ui.viewed + ' parts.' : '';
    n.className = 'goal' + (ui.done ? ' ok' : '');
    n.innerHTML = ui.done ? '<b>✓ Done.</b> ' + st.done : '<b>○ Not done yet.</b> Use the controls, the drawing or the equipment view.' + extra;
  }
  function drawTraceList() {
    var n = $('traceList'); if (!n) return;
    n.textContent = ui.trace && ui.trace.length ? ui.trace.map(function (id) { return sim.DEV[id].label; }).join(', ') : 'nothing selected yet';
  }
  function markStep(score) {
    var m = P.stepsDone[P.lesson] = P.stepsDone[P.lesson] || {};
    m[idx()] = Math.max(m[idx()] || 0, score);
    var L = LES();
    if (L.steps.length && L.steps.every(function (s, i) { return m[i]; })) P.done[L.id] = true;
    save(); drawProgress();
  }
  function scoreStep(ok, st) {
    record(st.concept || LES().concept, ok, null, st.cap, assisted(st));
    markStep(ok ? 2 : 1);
  }
  function miss(st) { ui.tries++; record(st.concept || LES().concept, false, null); markStep(1); }
  function checkGoal() {
    if (ui.mission) return missionObserve();
    var st = curStep(); if (!st) return;
    if (st.kind === 'try' && !ui.done && R && st.goal(S, R, ui)) { ui.done = true; markStep(2); drawGoal(); }
    else if (st.kind === 'try' && P.lesson === 'L3') drawGoal();
  }

  function playPatches(list, gap, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) { refresh(); if (done) done(); return; }
      later(i === 0 ? 350 : gap, function () { sim.patch(S, list[i]); Object.keys(list[i]).forEach(function (k) { ui.log.push(k + ':' + list[i][k]); }); i++; refresh(); next(); });
    })();
  }
  function answer(i) {
    var st = STEP(); if (ui.ans != null) return;
    ui.ans = i; ui.done = true;
    var c = st.choices[i], right = st.choices.filter(function (x) { return x.ok; })[0];
    scoreStep(!!c.ok, st);
    ui.fb = '<div class="fbx ' + (c.ok ? 'ok' : 'no') + '"><b>' + (c.ok ? 'Correct.' : 'Not quite.') + '</b> ' + c.fb +
      (st.run ? '<div class="note" id="runNote">' + (st.run.length ? 'Running the simulation…' : 'Look at the drawing: the simulation shows this state.') + '</div>' : '') + '</div>' +
      (st.predict ? sayAloud('I expect: ' + lower(right.t.replace(/<[^>]+>/g, '')) + '. ' + right.fb.replace(/<[^>]+>/g, '') + ' I would confirm that on the drawing and by observing the circuit before relying on it.') : '');
    renderMentor();
    if (st.probes) { ui.meter.mode = 'V'; ui.meter.red = st.probes[0]; ui.meter.black = st.probes[1]; }
    if (st.run && st.run.length) playPatches(st.run, 900, function () { var n = $('runNote'); if (n) n.textContent = c.ok ? 'Observed result matches your prediction.' : 'Compare the observed result on the drawing with what you predicted.'; });
    else refresh();
  }
  function pickCard(compId) {
    var st = STEP();
    if (ui.done) return selectComp(compId);
    if (compId === st.target) { ui.done = true; scoreStep(true, st); setFb('ok', '<b>Correct.</b> ' + st.fbOk); selectComp(compId); applyMode(); }
    else { miss(st); setFb('no', '<b>Not that one.</b> ' + st.fbNo); }
  }
  function findAnswer(id) {
    var st = STEP(), p = partById(id);
    if (st.parts.indexOf(id) >= 0) { ui.done = true; scoreStep(true, st); setFb('ok', '<b>Correct.</b> ' + st.fbOk); selectPart(id); applyMode(); }
    else { miss(st); setFb('no', '<b>That is ' + esc(p.name || p.ref) + '.</b> ' + st.fbNo); }
  }
  function matchAnswer(i) {
    var st = STEP(); if (ui.done) return;
    ui.ans = i;
    if (st.bench[i] === st.answer) { ui.done = true; scoreStep(true, st); ui.fb = '<div class="fbx ok"><b>Correct.</b> ' + st.fbOk + '</div>'; }
    else { miss(st); ui.fb = '<div class="fbx no"><b>Not that one.</b> ' + st.fbNo + ' Try again.</div>'; }
    renderMentor(); applyMode();
  }
  function traceCheck() {
    var st = STEP(), r = sim.checkTrace(cid(), S, ui.trace);
    if (r.ok && st.need && r.path.indexOf(st.need) < 0) { ui.tries++; setFb('no', 'That path is complete, but it is not the one I asked for. Trace the path that goes through ' + esc(st.need) + '.'); return; }
    if (r.ok) { ui.done = true; scoreStep(true, st); setFb('ok', '<b>✓</b> ' + esc(r.msg)); refresh(); }
    else {
      miss(st); setFb('no', esc(r.msg));
      if (r.stop) { var p = D().parts.filter(function (q) { return q.el === r.stop; })[0]; if (p) { ui.selPart = p.id; ui.selRef = p.ref; drawCenter(); } }
    }
  }
  function playDemo(slow, quiet) {
    var st = STEP(), list = st.script, i = 0, k = slow ? 2.4 : 1;
    stopTimers(); resetSim(); if (st.diagram) setDiagram(st.diagram); applyPreset(st.preset); clearSel();
    var keepMode = P.mode; if (quiet) P.mode = 'practice';
    refresh();
    var note = $('demoNote'); if (note) note.textContent = quiet ? 'Running without labels or commentary. Watch the drawing and the equipment.' : '';
    (function next() {
      if (i >= list.length) {
        ui.done = true; markStep(2); P.mode = keepMode; refresh();
        var cmp = $('demoCmp');
        if (cmp && st.expect && ui.pred != null) {
          var ok = ui.pred === st.expect.ok, idk = ui.pred === st.expect.choices.length;
          cmp.innerHTML = '<div class="fbx ' + (ok ? 'ok' : 'note') + '"><b>' + (ok ? 'Your prediction matched what happened.' : idk ? 'You were not sure, and that is fine. Now you have seen it.' : 'What happened differs from your prediction.') + '</b> ' +
            (ok ? '' : 'What the circuit did: ' + esc(lower(st.expect.choices[st.expect.ok])) + '.') + '</div>';
        }
        return;
      }
      var it = list[i++];
      later(it.ms * k, function () {
        if (it.diagram) setDiagram(it.diagram);
        if (it.set) sim.patch(S, it.set);
        refresh();
        if (it.sel && !quiet) selectPart(it.sel, false);
        if (note && it.note && !quiet) note.textContent = it.note;
        next();
      });
    })();
  }

  /* ------------------------------------------------------------------ retest of a missed concept (different example) */
  function startRetest(concept) {
    var r = revOf(concept), bank = FS.retests[concept], q = bank[r.i % bank.length]; r.i++;
    ui.retest = { c: concept, q: q, sel: null, conf: null, done: false, ok: false };
    stopTimers(); clearSel();
    if (q.symbol) setSpecimen(q.symbol); else setBlank();
    refresh(); renderMentor(); drawChips(); drawCompCard(); drawProgress();
  }
  function renderRetest() {
    var t = ui.retest, q = t.q, r = revOf(t.c), o = '';
    o += alexHead('Review', 'Earlier miss: ' + FS.concepts[t.c].name);
    o += '<h3>Quick review, different example</h3><p class="note">You missed this concept earlier' + (r.confWrong ? ' while confident, so it comes back first' : '') + '. Same idea, new question.</p>';
    o += '<p class="q">' + esc(q.q) + '</p>' + choicesHtml(q.choices.map(function (c) { return { t: esc(c.t), ok: c.ok }; }), t.done ? t.sel : null, 'rsel', t.sel);
    if (!t.done) o += confHtml(t.conf, 'rconf') + '<button class="btn primary" data-act="rcheck"' + (t.sel == null || !t.conf ? ' disabled' : '') + '>Check answer</button>';
    else o += '<div class="fbx ' + (t.ok ? 'ok' : 'no') + '"><b>' + (t.ok ? 'Correct.' : 'Not correct.') + '</b> ' + esc(q.explain) + (t.ok ? '' : ' This concept will come back again later.') + '</div><button class="btn primary" data-act="rnext">Continue</button>';
    o += '<div id="fb"></div>';
    $('mentor').innerHTML = o;
  }
  function retestAct(a, t) {
    var r = ui.retest; if (!r) return;
    if (a === 'rsel' && !r.done) { r.sel = +t.dataset.i; renderRetest(); }
    else if (a === 'rconf' && !r.done) { r.conf = t.dataset.c; renderRetest(); }
    else if (a === 'rcheck') { r.done = true; r.ok = !!r.q.choices[r.sel].ok; record(r.c, r.ok, r.conf, null, false, true); renderRetest(); }
    else if (a === 'rnext') { ui.retest = null; stepNext(true); }
  }

  /* ------------------------------------------------------------------ navigation */
  function leaveHero() { if ($('app').classList.contains('hero')) { $('app').classList.remove('hero'); sc('hero', false); setTimeout(function () { sc('resize'); }, 30); } }
  function enterStep() {
    var st = STEP();
    stopTimers(); resetSim();
    ui.hint = 0; ui.tries = 0; ui.ans = null; ui.done = false; ui.fb = ''; ui.reveal = true; ui.pred = null; ui.labelsOn = false;
    ui.trace = st.kind === 'trace' ? [] : null; ui.mission = null; ui.quiz = null; ui.ptask = null; ui.retest = null;
    clearSel(); $('helpOut').innerHTML = '';
    if (ui.eq === 'panel') setEq('3d');
    if (st.kind === 'pick') setSheet(st.sheet, st.pool);
    else if (st.symbol) setSpecimen(st.symbol);
    else if (st.sheet) setSheet(st.sheet);
    else setDiagram(st.diagram);
    buildControls();
    if (ui.center === 'diagram') applyPreset(st.preset);
    if (st.kind === 'say') markStep(2);
    renderMentor(); refresh(); drawCompCard(); drawChips(); drawProgress(); drawSchemHeader();
    if (st.kind === 'match' && scene) { sc('inspect', null); scene.bench(st.bench.map(function (id) { return FS.comp(id).shape; }), ['A', 'B', 'C', 'D'], st.bench); scene.select(null); scene.focus('bench', { user: true }); }
    else if (st.sel && ui.center === 'diagram' && crossHl()) selectPart(st.sel, false);
    else if (scene) { setDoor(false); scene.focus(ui.center === 'sheet' || ui.center === 'specimen' ? 'bench' : (LES().station || 'overview'), { user: true }); }
    applyMode();
  }
  function go(lessonId, i) {
    stopTimers(); leaveHero(); closeOverlay();
    P.lesson = lessonId;
    var L = LES();
    ui.mission = null; ui.quiz = null; ui.ptask = null; ui.retest = null; ui.fb = ''; ui.labelsOn = false; $('helpOut').innerHTML = '';
    if (L.kind) {
      resetSim(); clearSel(); ui.reveal = true; ui.trace = null; ui.done = false; ui.pwire = null;
      setDiagram(L.kind === 'panel' ? 'dwg3' : 'starter'); setEq(L.kind === 'panel' ? 'panel' : '3d'); buildControls();
      refresh(); renderMentor(); drawCompCard(); drawChips(); drawProgress(); drawSchemHeader();
      if (scene) { setDoor(false); scene.focus(L.kind === 'panel' ? 'panel' : 'overview', { user: true }); }
    } else {
      P.step[lessonId] = Math.max(0, Math.min(L.steps.length - 1, i == null ? (P.step[lessonId] || 0) : i));
      enterStep();
    }
    $('lessonTitle').textContent = 'Lesson ' + lessonNo(L.id) + ' · ' + L.title;
    save();
  }
  function nextLessonId() {
    if (P.path) {
      var path = FS.paths.filter(function (p) { return p.id === P.path; })[0], items = path.items.filter(function (it) { return it.l; });
      var pos = items.map(function (it) { return it.l; }).indexOf(P.lesson);
      if (pos >= 0 && pos < items.length - 1) return items[pos + 1].l;
      if (pos === items.length - 1) return null;
    }
    var n = lessonNo(P.lesson);
    return n < FS.lessons.length ? FS.lessons[n].id : 'review';
  }
  function stepNext(skipReview) {
    var L = LES();
    if (!skipReview && !ui.mission && !ui.quiz && !ui.ptask) { var due = dueConcept(); if (due) return startRetest(due); }
    if (!L.kind && idx() < L.steps.length - 1) return go(L.id, idx() + 1);
    P.done[L.id] = P.done[L.id] || !L.kind; markPath(L.id); save();
    var nx = nextLessonId();
    if (nx === 'review' || nx === null) return openReview();
    go(nx, 0);
  }
  function stepPrev() {
    var L = LES();
    if (!L.kind && idx() > 0) return go(L.id, idx() - 1);
    var n = lessonNo(P.lesson);
    if (n > 1) { var pl = FS.lessons[n - 2]; go(pl.id, pl.kind ? 0 : pl.steps.length - 1); }
  }
  function markPath(lessonId) {
    if (!P.path) return;
    var path = FS.paths.filter(function (p) { return p.id === P.path; })[0], m = P.pathDone[P.path] = P.pathDone[P.path] || {};
    path.items.forEach(function (it, i) { if (it.l === lessonId) m[i] = true; });
  }
  function drawProgress() {
    var L = LES(), o = '', done = P.stepsDone[L.id] || {};
    o += '<div class="pg-top"><span class="pg-l">Lesson ' + lessonNo(L.id) + ' of ' + FS.lessons.length + '</span><span class="pg-save">' + (storageOk ? 'Progress saved on this device' : 'Progress cannot be saved in this browser') + '</span></div>';
    if (!L.kind) {
      o += '<div class="dots" role="list" aria-label="Lesson steps">' + L.steps.map(function (s, i) {
        var d = done[i] || 0;
        return '<button role="listitem" class="dot' + (i === idx() ? ' cur' : '') + (d === 2 ? ' ok' : d === 1 ? ' part' : '') + '" data-step="' + i + '" title="Step ' + (i + 1) + ': ' + esc(s.title) + '" aria-label="Step ' + (i + 1) + ', ' + esc(s.title) + (d === 2 ? ', done' : d === 1 ? ', attempted' : '') + (i === idx() ? ', current' : '') + '">' + (d === 2 ? '✓' : d === 1 ? '!' : (i + 1)) + '</button>';
      }).join('') + '</div>';
    } else if (L.kind === 'missions') {
      o += '<div class="pg-info">' + FS.missions.filter(function (m) { return P.missions[m.id] && P.missions[m.id].done; }).length + ' of ' + FS.missions.length + ' missions complete</div>';
    } else if (L.kind === 'panel') {
      o += '<div class="pg-info">' + (P.panel ? 'Best panel challenge: ' + P.panel.best + ' of ' + FS.panel.tasks.length : 'Panel challenge not taken yet') + '</div>';
    } else {
      o += '<div class="pg-info">' + (P.quiz ? 'Best mock interview score: ' + P.quiz.best + '%' : 'Mock interview not taken yet') + '</div>';
    }
    var last = L.kind || idx() === L.steps.length - 1, nx = nextLessonId();
    o += '<div class="pg-nav"><button class="btn" data-nav="prev"' + (lessonNo(L.id) === 1 && idx() === 0 ? ' disabled' : '') + '>← Back</button>' +
      '<button class="btn primary" data-nav="next">' + (ui.retest ? 'Skip review →' : last ? (nx && nx !== 'review' ? 'Continue: next lesson →' : 'Continue: before the interview →') : 'Continue →') + '</button></div>';
    $('progress').innerHTML = o;
  }

  /* ------------------------------------------------------------------ drawing-to-panel challenge */
  function renderPanelHome() {
    var o = alexHead('Challenge', 'Lesson ' + lessonNo('LP') + ' · drawing to panel');
    o += '<h3>From the drawing to the hardware</h3><p class="say">An interviewer will point at a drawing and say "show me". Ten tasks. Each names something on the drawing set; you find it on the panel.<br><br>The panel on the left is a <b>simulated inspection view</b> of the mounting plate. Click a device or one of its terminals, say how sure you are, then check your answer. Nothing highlights until you submit.</p>';
    o += '<div class="safety"><b>Safety</b> Finding a part on this simulated panel does not authorize touching or testing real energized equipment. Real panels are opened and tested only by authorized people following site isolation procedures.</div>';
    if (P.panel) o += '<div class="lcard"><h4>Last result</h4><p>' + P.panel.last + ' of ' + FS.panel.tasks.length + ' (best ' + P.panel.best + ').</p></div>';
    o += '<p class="note">Terminal numbers and wire identifiers follow this training set only. Explore first if you like: click parts, or trace a wire with the buttons under the panel.</p>';
    o += '<button class="btn primary" data-act="pstart">Start the challenge</button><div id="fb"></div>';
    $('mentor').innerHTML = o;
  }
  function panelShow() {
    var t = ui.ptask, task = FS.panel.tasks[t.i];
    t.state = 'q'; t.pick = null; t.conf = null; t.ok = false;
    ui.pwire = null; ui.phide = false; ui.labelsOn = false; ui.hint = 0;
    clearSel(); setDiagram(task.show[0]); setEq('panel'); buildControls();
    if (task.show[1]) ui.selPart = task.show[1];
    refresh(); renderMentor(); drawChips(); drawCompCard(); drawProgress(); drawSchemHeader();
  }
  function renderPanelTask() {
    var t = ui.ptask;
    if (t.state === 'results') return renderPanelResults();
    var task = FS.panel.tasks[t.i], o = '';
    o += alexHead('Panel task', 'Task ' + (t.i + 1) + ' of ' + FS.panel.tasks.length);
    o += '<div class="qbar"><i style="width:' + Math.round(t.i / FS.panel.tasks.length * 100) + '%"></i></div>';
    o += '<p class="q big">' + esc(task.q) + '</p>';
    if (t.state === 'q') {
      o += '<div class="goal' + (t.pick ? ' ok' : '') + '">' + (t.pick ? '<b>Your choice:</b> ' + esc(FS.panel.describe(t.pick).replace(/, wire .*/, '').replace(/ \(.*\)/, '')) + '. You can change it until you check.' : '<b>○</b> Click a device or a terminal on the panel view.') + '</div>';
      o += confHtml(t.conf, 'pconf') + '<button class="btn primary" data-act="pcheck"' + (!t.pick || !t.conf ? ' disabled' : '') + '>Check answer</button>';
    } else {
      o += '<div class="fbx ' + (t.ok ? 'ok' : 'no') + '"><b>' + (t.ok ? 'Correct.' : 'Not correct.') + '</b> You chose ' + esc(FS.panel.describe(t.pick)) + '. ' + esc(task.explain) + '</div>';
      o += sayAloud('I expect to find it by its tag, because the tag on the drawing matches the label on the device. ' + task.explain + ' On a real panel I would confirm against the current drawing revision before relying on it, and I would not touch anything without authorization.');
      o += '<button class="btn primary" data-act="pnext">' + (t.i === FS.panel.tasks.length - 1 ? 'See my result' : 'Next task') + '</button>';
    }
    o += '<div id="fb"></div>';
    $('mentor').innerHTML = o;
  }
  function renderPanelResults() {
    var t = ui.ptask, n = t.res.filter(function (r) { return r && r.ok; }).length, tot = FS.panel.tasks.length, o = '';
    o += alexHead('Result', 'Drawing-to-panel challenge');
    o += '<div class="score ' + (n >= 8 ? 'pass' : 'fail') + '"><div class="score-n">' + n + '/' + tot + '</div><div><b>' + (n >= 8 ? 'You can find parts from the drawing.' : 'Worth another run.') + '</b><br>Locate a component from its drawing tag: ' + FS.CAPLVL[P.caps.locate || 'none'].toLowerCase() + '.</div></div>';
    var missed = FS.panel.tasks.filter(function (x, i) { return !t.res[i] || !t.res[i].ok; });
    o += '<div class="lcard"><h4>To review (' + missed.length + ')</h4>' + (missed.length ? '<ol class="miss">' + missed.map(function (x) { return '<li><b>' + esc(x.q) + '</b><br>' + esc(x.explain) + '</li>'; }).join('') + '</ol>' : '<p>None.</p>') + '</div>';
    o += '<p class="note">Scoring: one point per task answered correctly on the first submission. Confidence does not change the score; a confident wrong answer moves that concept to the top of your review list.</p>';
    o += '<div class="row"><button class="btn primary" data-act="pstart">Run it again</button></div><div id="fb"></div>';
    $('mentor').innerHTML = o; drawProgress();
  }
  function panelAct(a, el) {
    var t = ui.ptask;
    if (a === 'pstart') { stopTimers(); resetSim(); ui.ptask = { i: 0, res: [], state: 'q' }; ui.mission = null; ui.quiz = null; panelShow(); return; }
    if (!t) return;
    if (a === 'pconf') { t.conf = el.dataset.c; renderPanelTask(); return; }
    if (a === 'pcheck') {
      var task = FS.panel.tasks[t.i];
      t.ok = FS.panel.accepts(task, t.pick); t.state = 'done'; t.res[t.i] = { ok: t.ok, help: P.mode === 'learn' };
      record('nav', t.ok, t.conf);
      drawPanel(); renderPanelTask(); drawCompCard(); applyMode(); return;
    }
    if (a === 'pnext') {
      if (t.i < FS.panel.tasks.length - 1) { t.i++; panelShow(); }
      else {
        var n = t.res.filter(function (r) { return r && r.ok; }).length, help = t.res.some(function (r) { return r && r.help; });
        if (n >= 8) credit('locate', !help); else if (n >= 5) credit('locate', false);
        P.panel = { last: n, best: Math.max(n, P.panel ? P.panel.best : 0) }; P.done.LP = true; save();
        t.state = 'results'; ui.pwire = null; clearSel(); buildControls(); refresh(); renderMentor();
      }
    }
  }

  /* ------------------------------------------------------------------ missions with evidence notebook */
  var STAGES = ['observe', 'safe', 'expected', 'section', 'checks', 'diagnose', 'repair'];
  var STAGE_NO = { observe: 1, safe: 2, expected: 3, section: 4, checks: 5, diagnose: 7, repair: 8 };
  var TELL = {
    V: { hi: 'This point is at supply potential relative to 0V, so every device between L+ and it is passing the voltage.', lo: 'This point is not at supply potential: there is no supply, or something between L+ and this point is open.', na: 'This point was floating, so the reading is not modeled.' },
    R: { low: 'There is a low-resistance path between these two points. It does not prove the device works under load.', open: 'There is no conducting path between these two points.', res: 'A steady resistance: the meter is reading through a winding or lamp that is electrically continuous.' }
  };
  function renderMissionHome() {
    var o = alexHead('Missions', 'Lesson ' + lessonNo('L8') + ' · troubleshooting');
    o += '<h3>One method, ten faults</h3><p class="say">Each mission has <b>one</b> fault. Several missions share exactly the same symptom, because that is how it is on the floor: the symptom alone does not identify the failed component.<br><br>Before every check I\'ll ask what you expect and why. Your evidence goes into a notebook, and I only accept a diagnosis your evidence supports. Speed earns nothing here.</p>';
    o += '<ol class="method">' + FS.METHOD.map(function (m) { return '<li><b>' + esc(m[0]) + '.</b> ' + esc(m[1]) + '</li>'; }).join('') + '</ol>';
    o += '<div class="mlist">' + FS.missions.map(function (m, i) {
      var pr = P.missions[m.id];
      return '<button class="mitem" data-act="mission" data-id="' + m.id + '"><span class="mn">' + (i + 1) + '</span><span class="mt">' + esc(m.title) + '<small>' + esc(m.symptom.replace(/^Operator report: /, '')) + '</small></span><span class="ms">' + (pr && pr.done ? (pr.clean ? '✓ evidence-based' : '✓ done, with unsupported steps') : 'not started') + '</span></button>';
    }).join('') + '</div><div id="fb" role="status" aria-live="polite"></div>';
    $('mentor').innerHTML = o;
  }
  function startMission(id) {
    var m = FS.mission(id);
    stopTimers(); resetSim(); clearSel(); $('helpOut').innerHTML = '';
    ui.mission = { id: id, stage: 0, seen: false, q: {}, bad: 0, badDone: {}, unsupported: 0, susp: '', sub: 'pick', cur: null, rows: [], done: {}, fb: '', concl: '', interp: { ok: 0, no: 0 } };
    ui.quiz = null; ui.ptask = null; ui.retest = null; ui.reveal = false; ui.trace = null; ui.hint = 0; ui.fb = ''; ui.labelsOn = false;
    ui.center = 'x'; setDiagram(m.diagram); setEq('3d');
    sim.patch(S, FS.CAUSES[m.cause].set);
    refresh(); renderMission(); drawCompCard(); drawChips(); drawSchemHeader(); drawProgress();
    if (scene) { setDoor(false); scene.focus(m.station, { user: true }); }
  }
  function missionObserve() {
    var ms = ui.mission, m = FS.mission(ms.id);
    if (STAGES[ms.stage] === 'observe' && !ms.seen && R && m.observe.goal(S, R, ui)) { ms.seen = true; renderMission(); }
  }
  function ruledCount(ms, m) { var r = FS.mruled(m, Object.keys(ms.done)); return Object.keys(r).filter(function (k) { return r[k]; }).length; }
  function narrows(m, row) { return m.causes.some(function (c) { return FS.mread(m, row.id, c).cat !== row.obs.cat; }); }
  function notebookHtml(ms, m) {
    var exp = (ms.q.expected && ms.q.expected.right) ? m.expected.choices.filter(function (c) { return c.ok; })[0].t : 'not stated yet';
    var o = '<details class="nb" open><summary>Evidence notebook</summary><dl class="nbh">' +
      '<div><dt>Observed symptom</dt><dd>' + esc(m.symptom.replace(/^Operator report: /, '')) + '</dd></div>' +
      '<div><dt>Expected operation</dt><dd>' + esc(exp) + '</dd></div>' +
      '<div><dt>Possible cause (my current suspect)</dt><dd>' + (ms.susp ? esc(FS.CAUSES[ms.susp].t) : FS.IDK) + '</dd></div></dl>';
    if (ms.rows.length) {
      o += '<div class="nbt"><table><thead><tr><th>Selected check</th><th>Expected result</th><th>Observed result</th><th>What that tells me</th></tr></thead><tbody>' + ms.rows.map(function (r) {
        return '<tr><td>' + esc(FS.CHK[r.id].t) + '</td><td>' + esc(r.pred === 'idk' ? FS.IDK : FS.moptLabel(r.id, r.pred)) + '</td><td>' + esc(r.obs.text) + '</td><td>' + esc(r.tells || '—') + (r.said ? '<br><i>My view: ' + esc({ supports: 'supports my suspect', weakens: 'weakens my suspect', neutral: 'does not separate the causes' }[r.said]) + '</i>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    } else o += '<p class="note">No checks recorded yet. Observations are filled in from the simulation.</p>';
    o += '<label class="notes"><span>Next step / my conclusion</span><textarea id="mconcl" data-mconcl="1" rows="2" placeholder="Optional. In your own words.">' + esc(ms.concl) + '</textarea></label></details>';
    return o;
  }
  function modelExplanation(ms, m) {
    var ruled = FS.mruled(m, Object.keys(ms.done)), useful = ms.rows.filter(function (r) { return narrows(m, r); });
    var s = 'The symptom was: ' + m.symptom.replace(/^Operator report: /, '').replace(/"/g, '') + ' Normally, ' + lower(m.expected.choices.filter(function (c) { return c.ok; })[0].t) + ' ';
    useful.slice(0, 3).forEach(function (r) { s += 'I chose this check: ' + lower(FS.CHK[r.id].t) + '. I expected ' + (r.pred === 'idk' ? 'to learn something, because I was not sure' : lower(FS.moptLabel(r.id, r.pred))) + '. The observed result was: ' + r.obs.text + ' '; });
    var out = Object.keys(ruled).filter(function (k) { return ruled[k]; }).map(function (k) { return lower(FS.CAUSES[k].t.replace(/\.$/, '')); });
    s += 'That evidence ' + (out.length ? 'rules out these other causes: ' + out.join('; ') + '. It ' : '') + 'suggests this cause: ' + lower(FS.CAUSES[m.cause].t) + ' ' + m.why + ' Before concluding I would have it verified under proper isolation, and after the repair I would confirm normal operation. I would follow site isolation procedures and work within my training and authorization.';
    return s;
  }
  function missionCredit(ms, m) {
    var firstTry = function (k) { var a = ms.q[k]; return !!a && a.right && !Object.keys(a.tried).length; };
    var n = ms.rows.filter(function (r) { return narrows(m, r); }).length;
    var items = [
      ['Used the drawing to pick the relevant section first time', firstTry('section')],
      ['Stated an expectation, or said "I don\'t know yet", before every check', ms.rows.length > 0],
      ['Chose checks that narrowed the causes (' + n + ' of ' + ms.rows.length + ' did)', n > 0 && n >= ms.rows.length - 1],
      ['Interpreted results correctly (' + ms.interp.ok + ' right, ' + ms.interp.no + ' wrong)', ms.interp.no === 0],
      ['Named the cause only once the evidence supported it, first time', ms.unsupported === 0],
      ['Stayed inside safety boundaries: no bypass, no part-swapping, safe-work question right first time', ms.bad === 0 && firstTry('safe')]
    ];
    return { items: items, clean: items.every(function (x) { return x[1]; }) };
  }
  function renderMission() {
    var ms = ui.mission, m = FS.mission(ms.id), k = STAGES[ms.stage], n = FS.missions.indexOf(m) + 1, no = STAGE_NO[k], o = '';
    o += alexHead('Mission ' + n, m.title);
    o += '<div class="stagebar" aria-label="Troubleshooting step ' + no + ' of 8">' + FS.METHOD.map(function (x, i) { var a = i + 1; return '<span class="' + (a < no ? 'ok' : (a === no || (k === 'checks' && a === 6)) ? 'cur' : '') + '">' + a + '</span>'; }).join('') + '</div>';
    o += '<h3>Step ' + (k === 'checks' ? '5–6' : no) + ' of 8 · ' + esc(k === 'checks' ? 'Choose a check, then interpret the result' : FS.METHOD[no - 1][0]) + '</h3>';
    o += '<div class="symptom"><b>Symptom</b> ' + esc(m.symptom) + (m.note ? '<br><span class="note">' + esc(m.note) + '</span>' : '') + '</div>';
    if (k === 'observe') {
      o += '<p class="say">' + m.observe.text + '</p>';
      o += ms.seen ? '<div class="goal ok"><b>✓</b> ' + esc(m.observe.seen) + '</div><button class="btn primary" data-act="mnext">Continue</button>' : '<div class="goal"><b>○</b> Operate the equipment with the controls at the bottom to confirm the symptom yourself.</div>';
    } else if (k === 'checks') {
      if (ms.sub === 'pick') {
        o += '<p class="say">Choose a check that <b>separates</b> the possible causes. Before you see the result I\'ll ask what you expect.</p>';
        o += '<label class="sel"><span>Possible cause I suspect right now</span><select id="msusp" data-msusp="1"><option value="">' + FS.IDK + '</option>' + m.causes.map(function (c) { return '<option value="' + c + '"' + (ms.susp === c ? ' selected' : '') + '>' + esc(FS.CAUSES[c].t) + '</option>'; }).join('') + '</select></label>';
        o += '<div class="choices">' + m.checks.map(function (id) {
          var c = FS.CHK[id], used = ms.done[id] || ms.badDone[id];
          return '<button class="choice' + (used ? (c.bad ? ' wrong' : ' used') : '') + '" data-act="mcheck" data-id="' + id + '"' + (used ? ' disabled' : '') + '><span>' + esc(c.t) + '</span>' + (used ? '<span class="mk">' + (c.bad ? '✗ not done' : '✓ checked') + '</span>' : '') + '</button>';
        }).join('') + '</div>';
        o += '<button class="btn primary" data-act="mdiag"' + (ms.rows.length ? '' : ' disabled') + '>I have enough evidence: name the cause</button>' + (ms.rows.length ? '' : '<p class="note">Gather evidence first. A diagnosis with no evidence is a guess.</p>');
      } else if (ms.sub === 'predict') {
        var ck = FS.CHK[ms.cur];
        o += '<div class="lcard"><h4>Selected check</h4><p>' + esc(ck.t) + '</p></div><p class="q">What do you expect to happen, and why?</p><div class="choices">' + ck.opts.concat([['idk', FS.IDK]]).map(function (q) {
          return '<button class="choice" data-act="mpred" data-c="' + q[0] + '"><span>' + esc(q[1]) + '</span></button>';
        }).join('') + '</div>' + noteBox('m.' + ms.id + '.' + ms.cur, 'Why? (your own note)');
      } else {
        var row = ms.rows[ms.rows.length - 1], c2 = FS.CHK[row.id], match = row.pred === row.obs.cat;
        o += '<div class="lcard"><h4>Selected check</h4><p>' + esc(c2.t) + '</p></div>';
        o += '<div class="fbx ' + (match ? 'ok' : 'note') + '"><b>Observed result.</b> ' + esc(row.obs.text) + '<br>' +
          (row.pred === 'idk' ? 'You said you did not know yet. Now you have an observation.' : match ? 'That matches your prediction (' + esc(lower(FS.moptLabel(row.id, row.pred))) + ').' : 'You expected ' + esc(lower(FS.moptLabel(row.id, row.pred))) + '. The difference between prediction and observation is information: something in your picture of the circuit needs updating.') +
          (row.tells ? '<br><b>Circuit condition.</b> ' + esc(row.tells) : '') + '</div>';
        if (row.susp && !row.said) {
          o += '<p class="q">Does this result support or weaken your suspected cause?<br><span class="note">' + esc(FS.CAUSES[row.susp].t) + '</span></p><div class="choices">' +
            [['supports', 'It supports it'], ['weakens', 'It weakens it'], ['neutral', 'It does not separate it from the other causes']].map(function (q) { return '<button class="choice" data-act="msaid" data-v="' + q[0] + '"><span>' + q[1] + '</span></button>'; }).join('') + '</div>';
        } else {
          if (!row.susp) o += '<p class="note">You had no suspected cause for this check. Pick one on the next screen whenever the evidence starts to point somewhere.</p>';
          o += '<p class="note">Causes ruled out by your evidence so far: ' + ruledCount(ms, m) + ' of ' + (m.causes.length - 1) + '.</p><div class="row"><button class="btn primary" data-act="mmore">Choose another check</button><button class="btn" data-act="mdiag">I have enough evidence: name the cause</button></div>';
        }
      }
    } else if (k === 'diagnose') {
      o += '<p class="q">What is the most likely cause?</p><div class="choices">' + m.causes.map(function (c) {
        var tried = ms.q.diag && ms.q.diag[c];
        return '<button class="choice' + (tried ? ' wrong' : '') + '" data-act="mcause" data-c="' + c + '"' + (tried ? ' disabled' : '') + '><span>' + esc(FS.CAUSES[c].t) + '</span>' + (tried ? '<span class="mk">✗</span>' : '') + '</button>';
      }).join('') + '</div><button class="btn" data-act="mmore">Back to the checks</button>';
    } else if (k === 'repair') {
      var cr = missionCredit(ms, m);
      o += '<div class="fbx ok"><b>Supported by your evidence.</b> ' + esc(FS.CAUSES[m.cause].t) + ' ' + esc(m.why) + ' The fault is marked in red on the drawing.</div>';
      o += '<div class="lcard"><h4>The symptom alone had several possible causes</h4><ul>' + m.causes.filter(function (c) { return c !== m.cause; }).map(function (c) { return '<li>' + esc(FS.CAUSES[c].t) + '</li>'; }).join('') + '</ul><p class="note">Each of these would have produced the same report from the operator. Your checks are what separated them.</p></div>';
      o += '<div class="lcard"><h4>Explanation to practice aloud</h4><p><span class="tagm">Model explanation, generated from your notebook</span> ' + esc(modelExplanation(ms, m)) + '</p>' + (ms.concl ? '<p><span class="tagm">Your own conclusion</span> ' + esc(ms.concl) + '</p>' : '') + '<p class="frame">Frame: “' + esc(FS.FRAME) + '”</p></div>';
      o += '<div class="lcard"><h4>Proper repair and verification</h4><p>' + esc(m.repair) + '</p></div>';
      o += '<div class="lcard"><h4>What earned credit</h4><ul class="credit">' + cr.items.map(function (x) { return '<li class="' + (x[1] ? 'y' : 'n') + '">' + (x[1] ? '✓' : '○') + ' ' + esc(x[0]) + '</li>'; }).join('') + '</ul><p class="note">Speed is not scored. Unsupported certainty and part-swapping earn nothing.</p></div>';
      o += '<div class="row"><button class="btn primary" data-act="mdone">Complete mission</button><button class="btn" data-act="mission" data-id="' + m.id + '">Repeat</button></div>';
    } else {
      var q = m[k];
      o += '<p class="q">' + esc(q.q) + '</p>' + '<div class="choices">' + q.choices.map(function (c, i) {
        var a = ms.q[k], cls = 'choice', mark = '';
        if (a && a.right && c.ok) { cls += ' right'; mark = '<span class="mk">✓ correct</span>'; }
        else if (a && a.tried[i]) { cls += ' wrong'; mark = '<span class="mk">✗</span>'; }
        return '<button class="' + cls + '" data-act="mans" data-i="' + i + '"' + ((a && (a.right || a.tried[i])) ? ' disabled' : '') + '><span>' + esc(c.t) + '</span>' + mark + '</button>';
      }).join('') + '</div>';
      if (ms.q[k] && ms.q[k].right) o += '<button class="btn primary" data-act="mnext">Continue</button>';
    }
    o += '<div id="fb" role="status" aria-live="polite">' + (ms.fb || '') + '</div>';
    if (ms.stage >= STAGES.indexOf('checks')) o += notebookHtml(ms, m);
    o += '<p class="row"><button class="btn small" data-act="mhome">← All missions</button></p>';
    $('mentor').innerHTML = o;
  }
  function missionAct(act, t) {
    var ms = ui.mission, m = ms && FS.mission(ms.id), k = ms && STAGES[ms.stage];
    if (act === 'mhome') { go('L8'); return; }
    if (!ms) return;
    if (act === 'mnext') { ms.stage++; ms.fb = ''; ui.hint = 0; renderMission(); $('mentor').parentNode.scrollTop = 0; return; }
    if (act === 'mmore') { ms.stage = STAGES.indexOf('checks'); ms.sub = 'pick'; ms.fb = ''; renderMission(); return; }
    if (act === 'mcheck') {
      var id = t.dataset.id, c = FS.CHK[id];
      if (c.bad) { ms.bad++; ms.badDone[id] = 1; ms.fb = '<div class="fbx no"><b>Not done.</b> ' + esc(c.bad) + '</div>'; record('safe', false, null); }
      else { ms.cur = id; ms.sub = 'predict'; ms.fb = ''; }
      renderMission(); return;
    }
    if (act === 'mpred') {
      var obs = FS.mread(m, ms.cur), kind = FS.CHK[ms.cur].kind;
      ms.done[ms.cur] = 1;
      ms.rows.push({ id: ms.cur, pred: t.dataset.c, obs: obs, susp: ms.susp, tells: (TELL[kind] || {})[obs.cat] || '', said: null });
      ms.sub = 'result'; ms.fb = ''; renderMission(); return;
    }
    if (act === 'msaid') {
      var row = ms.rows[ms.rows.length - 1], truth = FS.mverdict(m, row.id, row.susp), said = t.dataset.v;
      row.said = said;
      var would = FS.moptLabel(row.id, FS.mread(m, row.id, row.susp).cat), okv = said === truth;
      if (okv) ms.interp.ok++; else ms.interp.no++;
      record('diag', okv, null);
      ms.fb = '<div class="fbx ' + (okv ? 'ok' : 'no') + '"><b>' + (okv ? 'Agreed.' : 'Look again.') + '</b> If the cause were "' + esc(lower(FS.CAUSES[row.susp].t.replace(/\.$/, ''))) + '", this check would read: ' + esc(lower(would)) + '. You observed: ' + esc(lower(FS.moptLabel(row.id, row.obs.cat))) + '. ' +
        esc(truth === 'weakens' ? 'So the result weakens that cause. Update your suspect.' : truth === 'supports' ? 'So it is consistent with your suspect, and it would have read differently for at least one other cause.' : 'Every listed cause would give this same result here, so it does not separate them.') + '</div>';
      renderMission(); return;
    }
    if (act === 'mdiag') { ms.stage = STAGES.indexOf('diagnose'); ms.fb = ''; renderMission(); return; }
    if (act === 'mcause') {
      var cz = t.dataset.c, ruled = FS.mruled(m, Object.keys(ms.done)), left = Object.keys(ruled).filter(function (x) { return !ruled[x]; });
      if (left.length) {
        ms.unsupported++; record('diag', false, null);
        ms.fb = '<div class="fbx no"><b>Not yet supported.</b> Your evidence has not ruled out ' + left.length + ' other possible cause' + (left.length > 1 ? 's' : '') + ' that would produce the same readings so far. Naming a cause now would be a guess. Choose a check whose result would differ between them.</div>';
        ms.stage = STAGES.indexOf('checks'); ms.sub = 'pick'; renderMission(); return;
      }
      if (cz === m.cause) {
        ui.reveal = true; ms.fb = ''; ms.stage = STAGES.indexOf('repair'); record('diag', true, null);
        refresh(); renderMission(); $('mentor').parentNode.scrollTop = 0; return;
      }
      ms.unsupported++; (ms.q.diag = ms.q.diag || {})[cz] = 1; record('diag', false, null);
      var contra = ms.rows.filter(function (r) { return FS.mread(m, r.id, cz).cat !== r.obs.cat; })[0];
      ms.fb = '<div class="fbx no"><b>Your own evidence contradicts that.</b> ' + (contra ? 'For that cause, this check would read ' + esc(lower(FS.moptLabel(contra.id, FS.mread(m, contra.id, cz).cat))) + ': "' + esc(FS.CHK[contra.id].t) + '". You observed ' + esc(lower(FS.moptLabel(contra.id, contra.obs.cat))) + '.' : '') + '</div>';
      renderMission(); return;
    }
    if (act === 'mans') {
      var q = m[k], i = +t.dataset.i, ch = q.choices[i], a = ms.q[k] = ms.q[k] || { tried: {}, right: false };
      if (ch.ok) { a.right = true; ms.fb = '<div class="fbx ok"><b>Correct.</b> ' + esc(ch.fb || '') + '</div>'; if (k === 'safe') record('safe', !Object.keys(a.tried).length, null); }
      else { a.tried[i] = true; ms.fb = '<div class="fbx no"><b>Not quite.</b> ' + esc(ch.fb || '') + '</div>'; }
      renderMission(); return;
    }
    if (act === 'mdone') {
      var cr = missionCredit(ms, m), prev = P.missions[m.id];
      P.missions[m.id] = { done: true, clean: cr.clean || !!(prev && prev.clean) };
      credit('check', cr.clean && P.mode !== 'learn');
      if (FS.missions.every(function (x) { return P.missions[x.id] && P.missions[x.id].done; })) P.done.L8 = true;
      save(); go('L8');
    }
  }

  /* ------------------------------------------------------------------ mock interview */
  function renderQuizHome() {
    var o = alexHead('Mock interview', 'Lesson ' + lessonNo('L9') + ' · assessment');
    o += '<h3>Mock hands-on interview</h3><p class="say">Twenty questions, the way a supervisor might walk you round a panel: 8 on symbols, 4 on circuit behavior, 4 on troubleshooting, 2 on drawing types, 2 on safety.<br><br>This always runs in <b>Interview</b> mode: no hints, no highlighting. Choose an answer, say how sure you are, then check it. Some questions ask you to <b>point</b> at the drawing, some to <b>explain out loud</b> and rate yourself against a model answer. Nothing is recorded.</p>';
    if (P.quiz) o += '<div class="lcard"><h4>Last result</h4><p>' + P.quiz.last + '% (best ' + P.quiz.best + '%).</p></div>';
    o += '<p class="note">Scoring: 1 point per correct answer; explain-out-loud answers are self-rated (confident 1, partial ½, needs practice 0). Confidence never changes a score. A score here reflects performance in this practice application only. It is not a professional qualification.</p>';
    o += '<div class="row"><button class="btn primary" data-act="qstart">Start the mock interview</button><button class="btn" data-act="ready">Readiness check</button></div><div id="fb"></div>';
    $('mentor').innerHTML = o;
  }
  function quizStart() {
    stopTimers(); resetSim(); clearSel(); $('helpOut').innerHTML = '';
    ui.quiz = { i: 0, res: [], state: 'q', shown: false, sel: null, conf: null }; ui.mission = null; ui.ptask = null; ui.retest = null; ui.reveal = false; ui.trace = null;
    setEq('3d'); quizShow();
  }
  function quizShow() {
    var qz = ui.quiz, q = FS.quiz[qz.i];
    resetSim(); clearSel(); qz.state = 'q'; qz.shown = false; qz.sel = null; qz.conf = null;
    ui.center = 'x';
    if (q.diagram) setDiagram(q.diagram); else if (q.symbol) setSpecimen(q.symbol); else setBlank();
    refresh(); renderQuiz(); drawChips(); drawCompCard(); drawSchemHeader();
    if (scene) { setDoor(false); scene.focus(q.diagram === 'plc' ? 'conveyor' : q.diagram ? 'panel' : 'overview', { user: true }); }
  }
  function quizScore(score, extra) {
    var qz = ui.quiz, q = FS.quiz[qz.i];
    qz.res[qz.i] = { id: q.id, cat: q.cat, score: score, extra: extra || '', chosen: qz.sel, conf: qz.conf }; qz.state = 'answered';
    record(FS.quizConcept[q.id], score === 1, qz.conf);
    if (q.type === 'pick') { ui.selPart = q.parts[0]; ui.selRef = partById(ui.selPart).ref; }
    refresh(); renderQuiz();
  }
  function quizPick(id) {
    var qz = ui.quiz, q = FS.quiz[qz.i];
    if (q.type !== 'pick' || qz.state !== 'q') return;
    qz.sel = id; ui.selPart = id; ui.selRef = null; drawCenter(); renderQuiz();
  }
  function renderQuiz() {
    var qz = ui.quiz; if (qz.state === 'results') return renderResults();
    var q = FS.quiz[qz.i], r = qz.res[qz.i], o = '';
    o += alexHead(FS.quizCats[q.cat].name, 'Question ' + (qz.i + 1) + ' of ' + FS.quiz.length);
    o += '<div class="qbar"><i style="width:' + Math.round(qz.i / FS.quiz.length * 100) + '%"></i></div>';
    o += '<p class="q big">' + esc(q.q) + '</p>';
    if (q.type === 'choice') {
      o += choicesHtml(q.choices.map(function (c) { return { t: esc(c.t), ok: c.ok }; }), r ? r.chosen : null, 'qsel', qz.sel);
    } else if (q.type === 'pick') {
      if (!r) o += '<div class="goal' + (qz.sel ? ' ok' : '') + '">' + (qz.sel ? '<b>You are pointing at a part.</b> You can change it until you check.' : '<b>○</b> Click the part on the drawing.') + '</div>';
    } else {
      if (!qz.shown) o += '<div class="aloud"><p><b>Explain out loud.</b> Take 30 to 60 seconds and say your answer as you would to the interviewer. Nothing is recorded.</p><p class="frame">A frame, if you want one: “' + esc(FS.FRAME) + '”</p><button class="btn primary" data-act="qshow">I\'ve said my answer. Show the model answer</button></div>';
      else {
        o += '<div class="lcard"><h4>Model answer</h4><p>' + esc(q.model) + '</p></div>';
        if (!r) o += '<p class="note">How close was what you said?</p><div class="row rate"><button class="btn" data-act="qrate" data-s="1">Confident</button><button class="btn" data-act="qrate" data-s="0.5">Partial</button><button class="btn" data-act="qrate" data-s="0">Needs practice</button></div>';
      }
    }
    if (!r && q.type !== 'aloud') o += confHtml(qz.conf, 'qconf') + '<button class="btn primary" data-act="qcheck"' + (qz.sel == null || !qz.conf ? ' disabled' : '') + '>Check answer</button>';
    if (r) {
      if (q.type !== 'aloud') o += '<div class="fbx ' + (r.score === 1 ? 'ok' : 'no') + '"><b>' + (r.score === 1 ? 'Correct.' : 'Not correct.') + '</b> ' + esc(r.extra ? r.extra + ' ' : '') + esc(q.explain) + (r.score !== 1 && r.conf === 'conf' ? ' <i>You were confident, so this concept goes to the top of your review list.</i>' : '') + '</div>';
      else o += '<div class="fbx note">Recorded as: <b>' + (r.score === 1 ? 'Confident' : r.score === 0.5 ? 'Partial' : 'Needs practice') + '</b>.</div>';
      o += '<button class="btn primary" data-act="qnext">' + (qz.i === FS.quiz.length - 1 ? 'See my results' : 'Next question') + '</button>';
    }
    o += '<div id="fb"></div>';
    $('mentor').innerHTML = o;
  }
  function quizAct(act, t) {
    var qz = ui.quiz, q = qz && FS.quiz[qz.i];
    if (act === 'qstart') return quizStart();
    if (!qz) return;
    if (act === 'qsel') { if (qz.state !== 'q') return; qz.sel = +t.dataset.i; renderQuiz(); return; }
    if (act === 'qconf') { qz.conf = t.dataset.c; renderQuiz(); return; }
    if (act === 'qcheck') {
      if (q.type === 'choice') quizScore(q.choices[qz.sel].ok ? 1 : 0);
      else { var p = partById(qz.sel), ok = q.parts.indexOf(qz.sel) >= 0; quizScore(ok ? 1 : 0, 'You pointed at ' + (p.name || p.ref) + (p.sub ? ' (' + p.sub + ')' : '') + '.'); }
      return;
    }
    if (act === 'qshow') { qz.shown = true; renderQuiz(); return; }
    if (act === 'qrate') { qz.sel = null; qz.conf = null; quizScore(+t.dataset.s); return; }
    if (act === 'qnext') {
      if (qz.i < FS.quiz.length - 1) { qz.i++; quizShow(); }
      else { qz.state = 'results'; ui.reveal = true; clearSel(); setDiagram('starter'); quizCaps(); refresh(); renderResults(); drawSchemHeader(); applyMode(); }
    }
  }
  function quizCaps() {
    var qz = ui.quiz, s = {}; FS.quiz.forEach(function (q, i) { s[q.id] = qz.res[i] ? qz.res[i].score : 0; });
    function sum(ids) { return ids.reduce(function (a, id) { return a + s[id]; }, 0); }
    var sym = sum(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
    if (sym >= 7) credit('symbols', true); else if (sym >= 5) credit('symbols', false);
    if (sum(['q3', 'q4']) === 2) credit('nonc', true); else if (sum(['q3', 'q4']) === 1) credit('nonc', false);
    if (sum(['q1', 'q2', 'q8']) === 3) credit('locate', true); else if (sum(['q1', 'q2', 'q8']) === 2) credit('locate', false);
    if (s.q9 === 1) credit('holding', true); else if (s.q9 === 0.5) credit('holding', false);
    if (sum(['q10', 'q11']) === 2) credit('predict', true); else if (sum(['q10', 'q11']) === 1) credit('predict', false);
    if (sum(['q15', 'q16']) === 2) credit('check', false);
    var al = ['q9', 'q12', 'q13', 'q14'], conf = al.filter(function (id) { return s[id] === 1; }).length;
    if (conf >= 3) credit('aloud', true); else if (sum(al) > 0) credit('aloud', false);
  }
  function capsHtml() {
    return '<table class="caps"><thead><tr><th>Can I independently…</th><th>Status</th><th></th></tr></thead><tbody>' + FS.caps.map(function (c) {
      var lv = P.caps[c[0]] || 'none';
      return '<tr class="lv-' + lv + '"><th>' + esc(c[1]) + '?</th><td>' + (lv === 'ind' ? '● ' : lv === 'help' ? '◐ ' : '○ ') + FS.CAPLVL[lv] + '</td><td>' + (lv === 'ind' ? '' : '<button class="btn small" data-act="golesson" data-ov="lesson" data-id="' + c[2] + '">Practice: Lesson ' + lessonNo(c[2]) + '</button>') + '</td></tr>';
    }).join('') + '</tbody></table><p class="note">"Independently" means first attempt, without hints, outside Learn mode, or in a no-hint check or the mock interview. "With help" means you got there with hints, labels or a second attempt. Explain-aloud items are self-rated. This checklist measures performance in the simulation only.</p>';
  }
  function reviewHtml() {
    var rows = Object.keys(FS.concepts).map(function (c) { return [c, P.rev[c] || { seen: 0, wrong: 0, confWrong: 0, due: null }]; });
    rows.sort(function (a, b) { return (b[1].confWrong - a[1].confWrong) || (b[1].wrong - a[1].wrong); });
    return '<table class="cats"><thead><tr><th>Concept</th><th>Answered</th><th>Missed</th><th>Missed while confident</th><th>Review</th></tr></thead><tbody>' + rows.map(function (r) {
      var v = r[1];
      return '<tr><th>' + esc(FS.concepts[r[0]].name) + '</th><td>' + v.seen + '</td><td>' + v.wrong + '</td><td>' + (v.confWrong ? '<b>' + v.confWrong + ' · high priority</b>' : '0') + '</td><td>' + (v.due != null ? 'retest queued' : v.wrong ? 'retested' : '—') + '</td></tr>';
    }).join('') + '</tbody></table><p class="note">A missed concept comes back as a different question after three other questions. Concepts you missed while confident come back first.</p>';
  }
  function renderResults() {
    var qz = ui.quiz, total = 0, cats = {}, o = '';
    FS.quiz.forEach(function (q, i) {
      var s = qz.res[i] ? qz.res[i].score : 0; total += s;
      var c = cats[q.cat] = cats[q.cat] || { got: 0, of: 0 }; c.got += s; c.of += 1;
    });
    var pct = Math.round(total / FS.quiz.length * 100), pass = pct >= 80;
    P.quiz = { last: pct, best: Math.max(pct, P.quiz ? P.quiz.best : 0) }; P.done.L9 = true; save();
    o += alexHead('Results', 'Mock interview complete');
    o += '<div class="lcard"><h4>Readiness check</h4>' + capsHtml() + '</div>';
    o += '<div class="score ' + (pass ? 'pass' : 'fail') + '"><div class="score-n">' + pct + '%</div><div><b>' + total + ' of ' + FS.quiz.length + ' points</b><br>' + (pass ? 'Practice pass (80% or more).' : 'Below the 80% practice target. That is what today is for.') + '</div></div>';
    o += '<p class="note">This score reflects performance in this practice application only. It is not a professional qualification.</p>';
    o += '<table class="cats"><thead><tr><th>Category</th><th>Score</th><th></th></tr></thead><tbody>' + Object.keys(FS.quizCats).map(function (k) {
      var c = cats[k], p = Math.round(c.got / c.of * 100);
      return '<tr><th>' + esc(FS.quizCats[k].name) + '</th><td>' + c.got + ' / ' + c.of + '</td><td><span class="bar"><i style="width:' + p + '%"></i></span> ' + p + '%</td></tr>';
    }).join('') + '</tbody></table>';
    var weak = Object.keys(FS.quizCats).filter(function (k) { return cats[k].got / cats[k].of < 0.75; }), rec = {};
    weak.forEach(function (k) { FS.quizCats[k].lessons.forEach(function (l) { rec[l] = 1; }); });
    o += '<div class="lcard"><h4>Recommended lessons to repeat</h4>' + (Object.keys(rec).length ? '<div class="row">' + Object.keys(rec).map(function (l) { return '<button class="btn" data-act="golesson" data-id="' + l + '">Lesson ' + lessonNo(l) + ' · ' + esc(FS.lesson(l).title) + '</button>'; }).join('') + '</div>' : '<p>No category is below 75%. Read the Before the Interview sheet and get some rest.</p>') + '</div>';
    var missed = FS.quiz.filter(function (q, i) { return !qz.res[i] || qz.res[i].score < 1; });
    o += '<div class="lcard"><h4>Questions to review (' + missed.length + ')</h4>' + (missed.length ? '<ol class="miss">' + missed.map(function (q) {
      var r = qz.res[FS.quiz.indexOf(q)];
      return '<li><b>' + esc(q.q) + '</b>' + (q.type === 'aloud' ? ' <i>(self-rated: ' + (r && r.score === 0.5 ? 'partial' : 'needs practice') + ')</i>' : (r && r.conf === 'conf' ? ' <i>(answered confidently: high priority)</i>' : '')) + '<br>' + esc(q.explain || q.model) + '</li>';
    }).join('') + '</ol>' : '<p>None. Every answer was correct or rated confident.</p>') + '</div>';
    o += '<div class="lcard"><h4>Errors by concept</h4>' + reviewHtml() + '</div>';
    o += '<div class="row"><button class="btn primary" data-act="qstart">Retake</button><button class="btn" data-act="review">Before the interview</button></div><div id="fb"></div>';
    $('mentor').innerHTML = o; drawProgress();
  }

  /* ------------------------------------------------------------------ built-in help */
  var MHINT = {
    observe: ['Use the simulation controls at the bottom of the screen.', 'Confirming the symptom yourself tells you exactly what does and does not happen.', 'Operate the control named in the instruction and watch the load.'],
    safe: ['Think about what you are authorized to do.', 'A control device such as STOP is not energy isolation, and protective devices are never bypassed.', 'Choose the answer that stays within authorization and site procedure.'],
    expected: ['Look at the drawing and read the path to the load.', 'Expected operation is the complete path with every device in its working state.', 'Choose the answer that describes the whole path from L+ to 0V.'],
    section: ['Which devices are in the path of the thing that is not working?', 'The symptom shows where the problem appears, not where it is caused.', 'Choose the answer that covers the whole relevant path.'],
    checks: ['Start where a result would split the list of causes in two.', 'Voltage present before a device and missing after it means that device is not passing it. A check is useful only if its result would differ between causes.', 'Work along the path in order with the voltage checks while the circuit is being asked to operate, then confirm with an isolated continuity or inspection check.'],
    diagnose: ['Go back to your notebook.', 'Rule out every cause that one of your readings contradicts.', 'Choose the cause that sits between the last good reading and the first bad one.'],
    repair: ['Read how the repair would be verified.', 'A repair is finished only when normal operation has been confirmed.', 'Complete the mission.']
  };
  function help(kind) {
    var out = $('helpOut'), c = ui.selComp && FS.comp(ui.selComp), t = '', title = '';
    var hasCircuit = ui.center === 'diagram', qon = quizOn(), hidden = (ui.mission && !ui.reveal);
    var blocked = qon || !!ui.retest || (ui.ptask && ui.ptask.state === 'q') || (mode() === 'interview' && pending());
    var blockMsg = qon ? 'Help is switched off during the mock interview.' : ui.retest ? 'Answer the review question first: the explanation follows.' : (ui.ptask && ui.ptask.state === 'q') ? 'Choose a device or terminal and check your answer first: the explanation follows.' : 'This is waiting for your answer. In Interview mode, help comes after you submit. Switch to Practice or Learn for help first.';
    if (kind === 'what') {
      title = 'What is this?';
      if (blocked) t = blockMsg;
      else if (c) t = '<b>' + esc(c.name) + '.</b> ' + esc(c.purpose) + ' ' + esc(c.looks);
      else if (hasCircuit) t = esc(D().what) + ' Select any symbol or part for more detail.';
      else t = 'A sheet of schematic symbols, each drawn in its reference state. Select a card to see the part and its explanation.';
    } else if (kind === 'how') {
      title = 'How does it work?';
      if (blocked) t = blockMsg;
      else if (c) t = '<b>' + esc(c.name) + '.</b> ' + esc(c.normal) + ' <i>Found:</i> ' + esc(c.where);
      else if (hasCircuit) t = esc(D().how);
      else t = 'Select a symbol card first, then ask again.';
    } else if (kind === 'why') {
      title = 'Why did that happen?';
      if (blocked) t = blockMsg;
      else if (hidden) t = 'That is the question this mission is asking you. What you can observe: ' + esc(FS.mission(ui.mission.id).symptom.replace(/^Operator report: /, '')) + ' Use a check that separates the possible causes.';
      else if (!hasCircuit) t = 'Nothing is simulated on this view. Open a circuit drawing and operate it, then ask again.';
      else {
        var lines = sim.explain(cid(), S, true);
        if (cid() === 'starter') lines.push(F.motor ? 'MTR1 is RUNNING: M1 is pulled in, so its main contacts connect the motor to the three-phase supply.' : 'MTR1 is STOPPED: ' + (S.relay.M1 ? 'disconnect DS1 is open, so no power reaches the main contacts.' : 'M1 is not pulled in, so its main contacts are open.'));
        if (cid() === 'pneu') lines.push(!F.p ? 'CYL1 is not driven: there is no air pressure at valve V1' + (S.air ? ' (no supply upstream).' : ' (shutoff SV1 is closed).') : F.act ? 'V1 is actuated: air flows 1 → 4 into the cap end, so CYL1 extends.' : 'V1 is at rest (spring): air flows 1 → 2 into the rod end, so CYL1 retracts or stays retracted.');
        t = '<ul><li>' + lines.map(esc).join('</li><li>') + '</li></ul><p class="note">The drawing shows three different things separately: current (orange), potential relative to 0V (violet; switch it on above the drawing) and device state (text tags).</p>';
      }
    } else if (kind === 'path') {
      title = 'Show the path';
      if (blocked) t = blockMsg;
      else if (!hasCircuit) t = 'There is no circuit on this view.';
      else if (hidden) t = 'With everything healthy the paths would be: <ul><li>' + sim.paths(cid()).map(function (p) { return esc(sim.fmtPath(p)); }).join('</li><li>') + '</li></ul>Your job is to find where the real path stops.';
      else {
        var pw = sim.powered(S), live = sim.paths(cid()).filter(function (p) { return pw && !sim.firstOpen(p, S); });
        ui.layers.cur = true;
        if (live.length) t = 'Current is flowing along: <ul><li>' + live.map(function (p) { return esc(sim.fmtPath(p)); }).join('</li><li>') + '</li></ul>It is drawn in orange with moving dashes. The dashes are a simplified picture, not real electron speed.';
        else {
          var stops = sim.paths(cid()).map(function (p) { return { p: p, fo: pw ? sim.firstOpen(p, S) : null }; });
          t = (pw ? 'No complete path right now, so no current flows. Points up to the first open device can still be at supply potential.' : 'Control power is off, so no path can conduct.') + '<ul><li>' + stops.map(function (x) { return esc(sim.fmtPath(x.p)) + (x.fo ? ' — stops at <b>' + esc(sim.DEV[x.fo].label) + '</b>' : ''); }).join('</li><li>') + '</li></ul>';
          var fo = stops[0] && stops[0].fo, part = fo && D().parts.filter(function (q) { return q.el === fo; })[0];
          if (part && !ui.trace) selectPart(part.id, true);
        }
        refresh();
      }
    } else if (kind === 'hint') {
      title = 'Hint';
      var hints = null, st = curStep();
      if (qon) t = 'No hints during the mock interview. Give it your best answer; the explanation follows.';
      else if (ui.retest) t = 'No hints on a review question. The explanation follows your answer.';
      else if (P.mode === 'interview') t = 'No hints in Interview mode. Switch to Practice if you want them.';
      else if (ui.ptask) t = ui.ptask.state === 'q' ? 'Read the tag in the question, then look for the same tag printed on a device. Terminals carry their own small numbers.' : 'Go on to the next task.';
      else if (ui.mission) hints = MHINT[STAGES[ui.mission.stage]];
      else if (st && st.noHint) t = 'This is a no-hint check. Answer from what you know; full feedback follows.';
      else if (st && st.hints) hints = st.hints;
      else if (st && st.kind === 'demo') t = 'Make your prediction, then press “Play demonstration” and watch the drawing and the equipment.';
      else t = 'Choose a mission, a task or start the mock interview.';
      if (hints) {
        ui.hint = Math.min(3, ui.hint + 1);
        t = '<ol class="hints">' + hints.slice(0, ui.hint).map(function (h, i) { return '<li><b>' + ['Where to look', 'The principle', 'Worked answer'][i] + ':</b> ' + esc(h) + '</li>'; }).join('') + '</ol>' + (ui.hint < 3 ? '<span class="note">Press again for the next hint level (' + ui.hint + ' of 3 shown).</span>' : '');
      }
    } else if (kind === 'reset') {
      title = 'Reset';
      if (ui.retest) t = 'Answer the review question, or skip it with Continue.';
      else if (ui.mission) { startMission(ui.mission.id); t = 'Mission restarted from the beginning with its fault in place. The notebook is empty again.'; }
      else if (qon) { ui.quiz.res[ui.quiz.i] = null; quizShow(); t = 'This question has been reset.'; }
      else if (ui.ptask && ui.ptask.state !== 'results') { ui.ptask.res[ui.ptask.i] = null; panelShow(); t = 'This task has been reset.'; }
      else if (LES().kind) { go(P.lesson); t = 'Reset.'; }
      else { enterStep(); t = 'Exercise reset: the simulation, the equipment, your answer and the hint level are back to the start.'; }
    }
    out.innerHTML = '<div class="helpbox"><h4>' + title + '</h4><div>' + t + '</div></div>';
  }

  /* ------------------------------------------------------------------ overlays */
  function openOverlay(kind, html) {
    overlayKind = kind;
    var ov = $('overlay'); ov.className = 'overlay ov-k-' + kind;
    ov.innerHTML = '<div class="ov-card ov-' + kind + '" role="dialog" aria-modal="true" aria-label="' + esc(kind) + '">' + html + '</div>'; ov.hidden = false;
    var f = ov.querySelector('[data-focus]') || ov.querySelector('button'); if (f) f.focus();
  }
  function closeOverlay() {
    clearInterval(diagTimer); diagTimer = null;
    overlayKind = null; $('overlay').hidden = true; $('overlay').innerHTML = '';
    if ($('app').classList.contains('hero')) showStart();   // still on the start screen: return to it
  }
  function showStart() {
    var cont = P.started ? FS.lesson(P.lesson) : null;
    $('app').classList.add('hero'); setEq('3d'); setDoor(false); sc('hero', true); setTimeout(function () { sc('resize'); }, 30);
    openOverlay('start',
      '<div class="start-band"><span class="hazard" aria-hidden="true"></span><p class="eyebrow">Supervised interview · training room 1</p><h1>FIRST SHIFT</h1><p class="sub">Maintenance Interview Bootcamp</p></div>' +
      '<div class="start-body"><p>You are a new maintenance candidate arriving for a hands-on interview. Your mentor, Alex, will walk you through the control panel, the workbench and the conveyor, and teach you to <b>recognize</b>, <b>trace</b>, <b>predict</b> and <b>explain</b>.</p>' +
      '<div class="row start-btns"><button class="btn primary big" data-ov="begin" data-focus>Start My First Shift</button>' +
      (cont ? '<button class="btn big" data-ov="continue">Continue: Lesson ' + lessonNo(cont.id) + '</button>' : '') +
      '<button class="btn big" data-ov="paths">Choose Study Path</button><button class="btn big" data-ov="quality">Graphics Quality</button></div>' +
      '<p class="fine">Interview preparation on a simulated 24 VDC circuit. It does not make you electrically qualified and is not a substitute for site training or lockout procedures.</p></div>');
  }
  /* baseline: six questions, "I don't know yet" allowed */
  function showBaselineIntro() {
    openOverlay('base', '<h2>Six quick questions first</h2><p>So I don\'t make you repeat what you can already demonstrate. Answer what you can. <b>“' + FS.IDK + '”</b> is a perfectly good answer and tells me where to start.</p>' +
      '<div class="row"><button class="btn primary" data-ov="base0" data-focus>Begin the baseline</button><button class="btn" data-ov="baseskip">Skip: start at Lesson 1</button></div>');
  }
  function showBaselineQ() {
    var b = ui.base, q = FS.baseline[b.i];
    openOverlay('base', '<p class="eyebrow dark">Baseline · question ' + (b.i + 1) + ' of ' + FS.baseline.length + ' · ' + esc(q.topic) + '</p>' +
      (q.symbol ? '<div class="base-sym">' + FS.sym.card(q.symbol.sym, q.symbol.o, 'Symbol') + '</div>' : '') +
      '<p class="q big">' + esc(q.q) + '</p><div class="choices">' + q.choices.map(function (c, i) { return '<button class="choice" data-ov="basea" data-i="' + i + '"><span>' + esc(c.t) + '</span></button>'; }).join('') +
      '<button class="choice idk" data-ov="basea" data-i="-1"><span>' + FS.IDK + '</span></button></div>');
  }
  function showBaselineResult() {
    var b = ui.base, missed = {}, okLessons = {};
    FS.baseline.forEach(function (q, i) { var ok = b.ans[i] >= 0 && !!q.choices[b.ans[i]].ok; if (!ok) missed[q.lesson] = 1; else okLessons[q.lesson] = 1; record(q.concept, ok, null); });
    var order = ['L1', 'L3', 'L4', 'L5'], rec = order.filter(function (l) { return missed[l]; })[0] || 'LD', skip = {};
    order.forEach(function (l) { if (!missed[l] && okLessons[l]) skip[l] = true; });
    P.baseline = { ans: b.ans, rec: rec, skip: skip }; save();
    var rows = FS.baseline.map(function (q, i) {
      var a = b.ans[i], ok = a >= 0 && q.choices[a].ok;
      return '<tr><th>' + esc(q.topic) + '</th><td>' + (ok ? '✓ demonstrated' : a < 0 ? '? not yet' : '✗ to learn') + '</td><td>' + (ok ? '' : 'Lesson ' + lessonNo(q.lesson) + ' · ' + esc(FS.lesson(q.lesson).title)) + '</td></tr>';
    }).join('');
    openOverlay('base', '<h2>Where to start</h2><table class="cats"><tbody>' + rows + '</tbody></table>' +
      '<div class="lcard"><h4>Recommended start</h4><p><b>Lesson ' + lessonNo(rec) + ' · ' + esc(FS.lesson(rec).title) + '</b>' + (Object.keys(skip).length ? '<br>Marked optional, because you already demonstrated their baseline topics: ' + Object.keys(skip).map(function (l) { return 'Lesson ' + lessonNo(l); }).join(', ') + '.' : '') + '</p><p class="note">This is a recommendation, not a gate. Nothing is locked, and anything you missed comes back later as a short review question.</p></div>' +
      '<div class="row"><button class="btn primary" data-ov="lesson" data-id="' + rec + '" data-focus>Start at Lesson ' + lessonNo(rec) + '</button><button class="btn" data-ov="lessons">Choose a different lesson</button><button class="btn" data-ov="paths">Choose a study path</button></div>');
  }
  function showLessons() {
    var o = '<div class="ov-h"><h2>Lessons</h2><button class="btn small" data-ov="close">Close</button></div><div class="llist">';
    FS.lessons.forEach(function (L, i) {
      var done = P.stepsDone[L.id] || {}, n = Object.keys(done).length, tot = L.steps.length;
      var st = P.done[L.id] ? '✓ complete' : L.kind === 'missions' ? FS.missions.filter(function (m) { return P.missions[m.id] && P.missions[m.id].done; }).length + ' / ' + FS.missions.length + ' missions' : L.kind === 'quiz' ? (P.quiz ? 'best ' + P.quiz.best + '%' : 'not taken') : L.kind === 'panel' ? (P.panel ? 'best ' + P.panel.best + ' / ' + FS.panel.tasks.length : 'not taken') : n + ' / ' + tot + ' steps';
      var tag = (P.baseline && P.baseline.rec === L.id) ? ' · recommended start' : (P.baseline && P.baseline.skip[L.id]) ? ' · optional: demonstrated in baseline' : L.optional ? ' · optional' : '';
      o += '<button class="litem' + (L.id === P.lesson ? ' cur' : '') + '" data-ov="lesson" data-id="' + L.id + '"><span class="ln">' + (i + 1) + '</span><span class="lt">' + esc(L.title) + '<small>' + esc(L.short) + ' · about ' + L.minutes + ' min' + tag + '</small></span><span class="ls">' + st + '</span></button>';
    });
    o += '<button class="litem" data-ov="review"><span class="ln">★</span><span class="lt">Before the Interview<small>15 symbols, the holding circuit, the checklist, five explanations · printable</small></span><span class="ls"></span></button></div>' +
      '<div class="row"><button class="btn" data-ov="rebase">Retake the baseline</button><button class="btn" data-ov="ready">Readiness check</button></div>';
    openOverlay('lessons', o);
  }
  function showPaths() {
    var o = '<div class="ov-h"><h2>Study paths</h2><button class="btn small" data-ov="close">Close</button></div><p>Electrical symbols, ladder reading, START/STOP control, drawing-to-panel and troubleshooting come first. Fluid power is optional and comes last.</p>';
    FS.paths.forEach(function (p) {
      var dm = P.pathDone[p.id] || {};
      o += '<section class="pathsec' + (P.path === p.id ? ' cur' : '') + '"><div class="ov-h"><h3>' + esc(p.name) + (P.path === p.id ? ' <span class="badge">current</span>' : '') + '</h3><button class="btn small" data-ov="path" data-id="' + p.id + '">' + (P.path === p.id ? 'Restart path' : 'Use this path') + '</button></div><p class="note">' + esc(p.blurb) + '</p><ol class="pitems">' +
        p.items.map(function (it, i) {
          var name = it.brk ? 'Break' : it.l === 'review' ? 'Before the Interview' : 'Lesson ' + lessonNo(it.l) + ' · ' + FS.lesson(it.l).title;
          return '<li class="' + (it.brk ? 'brk' : '') + '"><label><input type="checkbox" id="pd-' + p.id + '-' + i + '" data-pd="' + p.id + ':' + i + '"' + (dm[i] ? ' checked' : '') + '> <span><b>' + esc(name) + '</b> <i>' + it.m + ' min</i><br>' + esc(it.note) + '</span></label>' + (it.l ? '<button class="btn small" data-ov="' + (it.l === 'review' ? 'review' : 'lesson') + '" data-id="' + it.l + '">Open</button>' : '') + '</li>';
        }).join('') + '</ol></section>';
    });
    openOverlay('paths', o);
  }
  function qualityHtml() {
    var Q = [['low', 'Low', 'Reduced 3D resolution, no shadows. Interface and drawings stay at full resolution.'], ['balanced', 'Balanced (default)', 'Moderate 3D resolution, limited soft shadows.'], ['high', 'High', 'Higher 3D resolution and better shadows.'], ['ultra', 'Ultra / 4K', 'Native display resolution within a pixel budget. Performance depends on your hardware.']];
    return '<fieldset class="qual"><legend>3D graphics quality</legend>' + Q.map(function (q) {
      return '<label class="set"><input type="radio" name="quality" id="q-' + q[0] + '" value="' + q[0] + '"' + (P.quality === q[0] ? ' checked' : '') + '> <span><b>' + q[1] + '</b><br>' + q[2] + '</span></label>';
    }).join('') + '<label class="set"><input type="checkbox" id="setAdaptive"' + (P.adaptive ? ' checked' : '') + '> <span><b>Adaptive 3D resolution</b><br>Lowers only the 3D render scale if the frame rate stays low. Drawings and text are never reduced.</span></label></fieldset>' +
      '<details class="iq" id="diagBox" open><summary>Diagnostics (actual render buffer)</summary><pre id="diagOut" class="diag">' + (scene && scene.getDiagnostics ? 'measuring…' : '3D renderer not active (2.5D view in use). Drawings and interface are vector graphics and unaffected.') + '</pre></details>';
  }
  function tickDiag() {
    var n = $('diagOut'), d = sc('getDiagnostics'); if (!n || !d) return;
    n.textContent = 'Quality preset      ' + d.quality + (d.adaptive ? ' (adaptive on)' : '') + '\n3D view (CSS px)    ' + d.cssW + ' × ' + d.cssH + '\nDevice pixel ratio  ' + d.dpr + '\nRender scale        ' + (Math.round(d.scale * 100) / 100) + '\nRender buffer       ' + d.bufferW + ' × ' + d.bufferH + ' px\nFrame rate          ' + (d.fps ? Math.round(d.fps) + ' fps while animating' : 'idle (renders on demand)') +
      '\nDraw calls          ' + d.calls + '\nTriangles           ' + d.triangles + '\nShadows             ' + (d.shadows ? 'on' : 'off') + '\nRenderer            ' + d.renderer + '\nWindow              ' + window.innerWidth + ' × ' + window.innerHeight + ' CSS px\nInterface scale     ' + Math.round(parseFloat(document.documentElement.style.fontSize || '16') / 16 * 100) + '%';
  }
  function showQuality() {
    openOverlay('settings', '<div class="ov-h"><h2>Graphics quality</h2><button class="btn small" data-ov="close">Done</button></div>' + qualityHtml());
    clearInterval(diagTimer); diagTimer = setInterval(tickDiag, 500);
  }
  function showSettings() {
    var o = '<div class="ov-h"><h2>Settings</h2><button class="btn small" data-ov="close">Close</button></div>' + qualityHtml() +
      '<fieldset class="qual"><legend>Audio</legend><label class="set"><input type="checkbox" id="setSound"' + (P.sound ? ' checked' : '') + '> <span><b>Switch and contactor sounds</b><br>Subtle clicks. Off by default. Every sound also has a visible result.</span></label></fieldset>' +
      '<fieldset class="qual"><legend>Accessibility</legend><label class="set"><input type="checkbox" id="setRm"' + (rm() ? ' checked' : '') + '> <span><b>Reduced motion</b><br>Instant camera moves, no moving dashes or conveyor animation.</span></label>' +
      '<label class="set"><span><b>Interface scale</b><br><select id="setScale">' + [0.85, 1, 1.15, 1.3, 1.5].map(function (v) { return '<option value="' + v + '"' + (P.uiScale === v ? ' selected' : '') + '>' + Math.round(v * 100) + '%</option>'; }).join('') + '</select> on top of automatic scaling for large displays</span></label>' +
      '<label class="set"><input type="checkbox" id="setSimple"' + (P.simple ? ' checked' : '') + '> <span><b>Simple 2.5D equipment view</b><br>Replaces the 3D room with a flat labelled view after reloading. Used automatically if 3D is unavailable.</span></label></fieldset>' +
      '<div class="lcard"><h4>Keyboard</h4><ul class="keys"><li><kbd>N</kbd> continue · <kbd>P</kbd> back · <kbd>H</kbd> hint · <kbd>F</kbd> drawing full screen · <kbd>Esc</kbd> close</li><li><kbd>S</kbd> hold START · <kbd>X</kbd> hold STOP (motor starter drawing)</li><li>Tab to any symbol, test point, terminal or part and press <kbd>Enter</kbd></li><li>Equipment view focused: arrow keys orbit, <kbd>+</kbd> <kbd>−</kbd> zoom</li></ul></div>' +
      '<div class="lcard"><h4>Progress</h4><p>' + (storageOk ? 'Progress is saved in this browser only.' : 'This browser is not allowing local storage, so progress lasts only until the page is closed.') + '</p><div id="resetBox"><button class="btn" data-ov="reset1">Reset all progress…</button></div></div>';
    openOverlay('settings', o);
    clearInterval(diagTimer); diagTimer = setInterval(tickDiag, 500);
  }
  function showReady() {
    openOverlay('paths', '<div class="ov-h"><h2>Readiness check</h2><button class="btn small" data-ov="close">Close</button></div><p>A capability checklist, not a percentage. It fills in as you work through lessons, the panel challenge, missions and the mock interview.</p>' + capsHtml() +
      '<h3>Errors by concept</h3>' + reviewHtml());
  }
  function openReview() {
    leaveHero(); closeOverlay();
    var d = FS.diagrams.starter, s0 = sim.defaultState(), r0 = sim.settle('starter', s0);
    var framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
    var o = '<div class="rv"><div class="rv-h"><div><p class="eyebrow">FIRST SHIFT · one-page review</p><h1>Before the Interview</h1></div><div class="rv-btns no-print">' +
      (framed ? '<span class="note">To print, open the stand-alone app file in a browser and use Print there.</span>' : '<button class="btn primary" id="btnPrint">Print this sheet</button>') +
      '<button class="btn" id="btnRvClose">Back to training</button></div></div>';
    o += '<section><h2>1 · Fifteen symbols to know cold</h2><p class="note">Simplified North American ladder style, each in its reference state. Other sites and IEC drawings differ: read the legend.</p><div class="rv-syms">' +
      FS.essentials.map(function (id) { var c = FS.comp(id); return '<figure>' + FS.sym.card(c.sym, c.o, c.name) + '<figcaption><b>' + esc(c.name) + '</b>' + esc(c.normal.split('. ')[0].replace(/\.$/, '')) + '.</figcaption></figure>'; }).join('') + '</div></section>';
    o += '<section><h2>2 · The START/STOP holding circuit</h2><div class="rv-two"><div class="rv-diagram">' + FS.schem.render(d, { S: s0, res: r0, flags: { motor: false }, reveal: false, showTps: true, rm: true }) + '</div><ul>' +
      '<li>STOP (NC) and the overload contact (NC) are in <b>series</b> with the M1 coil.</li><li>START (NO) and the M1 auxiliary contact (NO) are in <b>parallel</b>.</li>' +
      '<li>START energizes the coil. The auxiliary contact closes and <b>holds</b> the coil in after START is released.</li><li>STOP or an overload trip breaks the coil circuit.</li>' +
      '<li>Resetting the overload does <b>not</b> restart the motor.</li><li>After control power is lost and restored, the motor stays stopped until START is pressed.</li>' +
      '<li>The control circuit only energizes the coil. Motor current flows through the M1 <b>main contacts</b> in the separate power circuit.</li>' +
      '<li>A coil needs voltage <b>across</b> its two terminals. Potential at one terminal alone does not operate it.</li></ul></div></section>';
    o += '<section><h2>3 · Troubleshooting checklist</h2><ol class="rv-method">' + FS.METHOD.map(function (m) { return '<li><b>' + esc(m[0]) + '.</b> ' + esc(m[1]) + '</li>'; }).join('') + '</ol><p class="note">Say it this way: “' + esc(FS.FRAME) + '”</p></section>';
    o += '<section><h2>4 · Five explanations to practice aloud</h2><ol class="rv-aloud">' + FS.aloud.map(function (a) { return '<li><b>' + esc(a[0]) + '.</b> ' + esc(a[1]) + '</li>'; }).join('') + '</ol></section>';
    o += '<section><h2>5 · Say this, and mean it</h2><blockquote>“' + esc(FS.HONEST) + '”</blockquote><ul class="rv-safe">' +
      '<li>Follow site procedures and work within your authorization and training.</li><li>Identify every energy source: electrical, pneumatic, hydraulic, mechanical and stored energy can all be present on one machine.</li>' +
      '<li>A STOP button, an emergency stop or a software command is not energy isolation.</li><li>Never bypass an interlock, overload, guard or other protective function to make a machine run.</li>' +
      '<li>An indicator light or status LED alone does not prove equipment is safe to touch.</li></ul></section>';
    o += '<section class="rv-ready"><h2>6 · My readiness in the simulation</h2>' + capsHtml().replace(/<button[^>]*>.*?<\/button>/g, '') + '<p class="fine">Practice material only. Completing this application is not an electrical qualification.</p></section></div>';
    var rv = $('review'); rv.innerHTML = o; rv.hidden = false; rv.scrollTop = 0; document.body.classList.add('reviewing');
    markPath('review'); save();
    var pb = $('btnPrint'); if (pb) { pb.onclick = function () { window.print(); }; pb.focus(); } else $('btnRvClose').focus();
    $('btnRvClose').onclick = closeReview;
  }
  function closeReview() { $('review').hidden = true; $('review').innerHTML = ''; document.body.classList.remove('reviewing'); if (!P.started) showStart(); }
  function choosePath(id) {
    P.path = id; P.pathDone[id] = {}; P.started = true; save();
    go(FS.paths.filter(function (p) { return p.id === id; })[0].items[0].l, 0);
  }
  function applyScale() {
    var w = window.innerWidth, auto = w > 2000 ? Math.min(2.2, w / 1920) : 1;
    document.documentElement.style.fontSize = (16 * auto * (P.uiScale || 1)) + 'px';
    sc('resize');
  }
  function setTab(t) {
    ui.tab = t; $('app').setAttribute('data-tab', t);
    Array.prototype.forEach.call(document.querySelectorAll('#paneTabs [data-pane]'), function (b) { b.setAttribute('aria-selected', b.dataset.pane === t); });
    if (t === 'equip') setTimeout(function () { sc('resize'); }, 30);
  }
  function drawSound() { var b = $('btnSound'); b.textContent = P.sound ? 'Sound: on' : 'Sound: off'; b.setAttribute('aria-pressed', !!P.sound); }
  function toggleExpand() {
    var on = $('app').classList.toggle('expanded');
    $('btnExpand').textContent = on ? 'Exit full screen' : 'Full screen';
    $('btnExpand').setAttribute('aria-pressed', on);
    setTimeout(function () { sc('resize'); }, 50);
  }
  function keepPrefs() { var k = { rm: P.rm, simple: P.simple, quality: P.quality, adaptive: P.adaptive, uiScale: P.uiScale, sound: P.sound, mode: P.mode }; P = defaults(); for (var j in k) P[j] = k[j]; ui.viewed = 0; save(); }

  /* ------------------------------------------------------------------ wiring up */
  function bind() {
    var dg = $('diagram'), down = null;
    function hit(e) {
      var n = document.elementFromPoint(e.clientX, e.clientY); if (!n || !dg.contains(n)) return null;
      var t = n.closest('[data-tp]'); if (t) return { tp: t.dataset.tp };
      t = n.closest('[data-part]'); if (t) return { part: t.dataset.part };
      t = n.closest('[data-comp]'); if (t) return { comp: t.dataset.comp };
      return null;
    }
    function fire(h) {
      if (!h) return;
      if (h.tp) { if (!ui.quiz && !ui.ptask && !ui.retest) onTP(h.tp); }
      else if (h.part) onPart(h.part);
      else if (h.comp) { var st = curStep(); if (st && st.kind === 'pick') pickCard(h.comp); else selectComp(h.comp); }
    }
    dg.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, h: hit(e), pan: false }; });
    dg.addEventListener('pointermove', function (e) {
      if (!down || down.h || !ui.vb || !(e.buttons & 1)) return;
      var svg = dg.querySelector('svg'); if (!svg) return;
      var k = ui.vb[2] / svg.clientWidth; down.pan = true;
      ui.vb = clampVb([ui.vb[0] - (e.clientX - down.x) * k, ui.vb[1] - (e.clientY - down.y) * k, ui.vb[2], ui.vb[3]]);
      down.x = e.clientX; down.y = e.clientY; svg.setAttribute('viewBox', ui.vb.join(' '));
    });
    dg.addEventListener('pointerup', function (e) {
      if (!down) return;
      var h = hit(e), d = down; down = null;
      if (d.pan || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 8 || !h || !d.h) return;
      if (h.tp === d.h.tp && h.part === d.h.part && h.comp === d.h.comp) fire(h);
    });
    dg.addEventListener('wheel', function (e) {
      if (ui.center !== 'diagram' || !(e.ctrlKey || ui.vb || $('app').classList.contains('expanded'))) return;
      e.preventDefault(); var r = dg.getBoundingClientRect();
      zoomBy(e.deltaY > 0 ? 1.2 : 1 / 1.2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    }, { passive: false });
    dg.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target.closest('[data-tp],[data-part],[data-comp]'); if (!t) return;
      e.preventDefault(); fire(t.dataset.tp ? { tp: t.dataset.tp } : t.dataset.part ? { part: t.dataset.part } : { comp: t.dataset.comp });
    });
    $('zoomBar').addEventListener('click', function (e) { var b = e.target.closest('[data-zoom]'); if (!b) return; if (b.dataset.zoom === 'fit') { ui.vb = null; drawCenter(); } else zoomBy(b.dataset.zoom === 'in' ? 1 / 1.4 : 1.4); });
    $('layers').addEventListener('click', function (e) { var b = e.target.closest('[data-lay]'); if (!b || b.disabled) return; ui.layers[b.dataset.lay] = !ui.layers[b.dataset.lay]; refresh(); });
    $('btnLabels').onclick = function () { ui.labelsOn = !ui.labelsOn; refresh(); drawCompCard(); };
    $('modes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode]'); if (!b) return;
      P.mode = b.dataset.mode; ui.labelsOn = false; save(); refresh(); drawCompCard(); drawChips();
      $('helpOut').innerHTML = '<div class="helpbox"><h4>' + esc(b.textContent) + ' mode</h4><div>' + esc(MODES.filter(function (m) { return m[0] === P.mode; })[0][2]) + ' The equipment and the circuit are the same in all three modes.</div></div>';
    });
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return;
      var id = b.dataset.tab; stopTimers();
      if (id.indexOf('sheet:') === 0) { setSheet(id.slice(6)); }
      else { var keep = FS.diagrams[id].circuit === cid() && ui.center === 'diagram'; if (!keep) { resetSim(); } setDiagram(id); if (ui.selRef) { var p = D().parts.filter(function (q) { return q.ref === ui.selRef; })[0]; ui.selPart = p ? p.id : null; if (!p) clearSel(); } else ui.selPart = null; }
      refresh(); drawChips(); drawCompCard(); drawSchemHeader();
    });
    $('chips').addEventListener('click', function (e) { var b = e.target.closest('[data-ref]'); if (b) selectRef(b.dataset.ref); });
    $('eqTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-eq]'); if (b) setEq(b.dataset.eq); });
    $('camBar').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !scene) return;
      if (b.dataset.st) { if (b.dataset.st === 'panel' && scene.setCamera) scene.setCamera('panel', null, { user: true }); else scene.focus(b.dataset.st, { user: true }); }
      else if (b.dataset.cam === 'in') sc('zoom', 0.8); else if (b.dataset.cam === 'out') sc('zoom', 1.25);
      else if (b.dataset.cam === 'reset') sc('resetView');
      else if (b.dataset.cam === 'trace') {
        var refs = ui.center === 'diagram' ? D().parts.map(physOf).filter(function (r, i, a) { return a.indexOf(r) === i && scene.has(r); }) : [];
        if (refs.length && scene.setCamera) { if (scene.isInside && refs.some(function (r) { return scene.isInside(r); })) setDoor(true); scene.setCamera('trace', refs, { user: true }); }
      }
      else if (b.dataset.cam === 'lesson') { setDoor(false); scene.focus(ui.mission ? FS.mission(ui.mission.id).station : (LES().station || 'overview'), { user: true }); }
      else if (b.id === 'btnDoor') { setDoor(!ui.door); if (scene.setCamera) scene.setCamera('panel', null, { user: true }); }
      else if (b.id === 'btnZone') { ui.zone = !ui.zone; sc('showSensorZone', ui.zone); b.setAttribute('aria-pressed', !!ui.zone); if (ui.zone) scene.focus('conveyor', { user: true }); }
    });
    $('inspect').addEventListener('click', function (e) {
      var b = e.target.closest('[data-insp]'); if (!b || b.disabled) return;
      var k = b.dataset.insp, c = FS.comp(ui.selComp); if (!c) return;
      if (k === 'reassemble') { ui.insp.cutaway = false; ui.insp.slow = false; }
      else if (k !== 'bench') { ui.insp[k] = !ui.insp[k]; if (k === 'cutaway' && !ui.insp.cutaway) ui.insp.slow = false; }
      scene.bench(null, null, null); scene.inspect(c.shape, ui.insp); scene.select(ui.insp.cutaway ? null : '__bench');
      if (scene.setCamera) scene.setCamera('inspect', null, { user: true }); else scene.focusOn('__bench');
      drawInspect();
    });
    $('panelView').addEventListener('click', function (e) {
      var w = e.target.closest('[data-wire]');
      if (w) { if (w.disabled) return; var id = w.dataset.wire; if (id === '~hide') ui.phide = !ui.phide; else if (id === '~all') { ui.pwire = null; ui.phide = false; } else ui.pwire = ui.pwire === id ? null : id; drawPanel(); return; }
      var h = e.target.closest('[data-hot]'); if (h) onHot(h.dataset.hot);
    });
    $('panelView').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var h = e.target.closest('[data-hot]'); if (!h) return;
      e.preventDefault(); var id = h.dataset.hot; onHot(id);
      var n = $('panelSvg').querySelector('[data-hot="' + id + '"]'); if (n) n.focus();
    });
    $('mentor').addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
      var a = t.dataset.act;
      if (a === 'demo') playDemo(false, false); else if (a === 'demoSlow') playDemo(true, false); else if (a === 'demoQuiet') playDemo(false, true);
      else if (a === 'expect') { ui.pred = +t.dataset.i; renderMentor(); }
      else if (a === 'answer') answer(+t.dataset.i);
      else if (a === 'match') matchAnswer(+t.dataset.i);
      else if (a === 'traceCheck') traceCheck();
      else if (a === 'traceClear') { ui.trace = []; setFb('', ''); drawCenter(); drawTraceList(); }
      else if (a === 'mission') startMission(t.dataset.id);
      else if (a === 'golesson') go(t.dataset.id, 0);
      else if (a === 'review') openReview();
      else if (a === 'ready') showReady();
      else if (a.charAt(0) === 'r') retestAct(a, t);
      else if (a.charAt(0) === 'p') panelAct(a, t);
      else if (a.charAt(0) === 'm') missionAct(a, t);
      else if (a.charAt(0) === 'q') quizAct(a, t);
    });
    $('mentor').addEventListener('change', function (e) { var t = e.target; if (t.dataset.msusp && ui.mission) { ui.mission.susp = t.value; renderMission(); } });
    $('mentor').addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.note) { P.notes[t.dataset.note] = t.value; save(); }
      else if (t.dataset.mconcl && ui.mission) ui.mission.concl = t.value;
    });
    $('help').addEventListener('click', function (e) { var b = e.target.closest('[data-help]'); if (b) help(b.dataset.help); });
    $('progress').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.step != null) { ui.retest = null; go(P.lesson, +b.dataset.step); }
      else if (b.dataset.nav === 'next') { if (ui.retest) { revOf(ui.retest.c).due = P.qn + 3; ui.retest = null; stepNext(true); } else stepNext(); }
      else if (b.dataset.nav === 'prev') { ui.retest = null; stepPrev(); }
    });
    $('paneTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-pane]'); if (b) setTab(b.dataset.pane); });
    $('btnLessons').onclick = showLessons; $('btnPaths').onclick = showPaths; $('btnReview').onclick = openReview; $('btnSettings').onclick = showSettings; $('btnReady').onclick = showReady;
    $('btnSound').onclick = function () { P.sound = !P.sound; save(); drawSound(); if (P.sound) click(700, 0.03); };
    $('btnExpand').onclick = toggleExpand;
    $('overlay').addEventListener('click', function (e) {
      if (e.target === $('overlay') && overlayKind !== 'start' && overlayKind !== 'base') return closeOverlay();
      var b = e.target.closest('[data-ov]'); if (!b) return;
      var a = b.dataset.ov;
      if (a === 'close') closeOverlay();
      else if (a === 'begin') { keepPrefs(); showBaselineIntro(); }
      else if (a === 'base0' || a === 'rebase') { ui.base = { i: 0, ans: [] }; showBaselineQ(); }
      else if (a === 'basea') { ui.base.ans[ui.base.i] = +b.dataset.i; ui.base.i++; if (ui.base.i < FS.baseline.length) showBaselineQ(); else showBaselineResult(); }
      else if (a === 'baseskip') { P.started = true; go('L1', 0); }
      else if (a === 'continue') { P.started = true; go(P.lesson); }
      else if (a === 'paths') showPaths();
      else if (a === 'lessons') showLessons();
      else if (a === 'ready') showReady();
      else if (a === 'quality') showQuality();
      else if (a === 'path') choosePath(b.dataset.id);
      else if (a === 'lesson') { P.started = true; go(b.dataset.id); }
      else if (a === 'review') openReview();
      else if (a === 'reset1') $('resetBox').innerHTML = '<p><b>Erase all lesson progress, mission results, review history and scores on this device?</b></p><div class="row"><button class="btn danger" data-ov="reset2">Yes, erase</button><button class="btn" data-ov="close">Cancel</button></div>';
      else if (a === 'reset2') { keepPrefs(); go('L1', 0); showStart(); }
    });
    $('overlay').addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'setRm') { P.rm = t.checked; save(); if (scene) scene.setRM(rm()); document.body.classList.toggle('rm', rm()); refresh(); }
      else if (t.id === 'setSimple') { P.simple = t.checked; save(); }
      else if (t.id === 'setSound') { P.sound = t.checked; save(); drawSound(); }
      else if (t.id === 'setScale') { P.uiScale = +t.value; save(); applyScale(); }
      else if (t.name === 'quality') { P.quality = t.value; save(); sc('setQuality', P.quality, { adaptive: P.adaptive }); }
      else if (t.id === 'setAdaptive') { P.adaptive = t.checked; save(); sc('setQuality', P.quality, { adaptive: P.adaptive }); }
      else if (t.dataset.pd) { var q = t.dataset.pd.split(':'); (P.pathDone[q[0]] = P.pathDone[q[0]] || {})[q[1]] = t.checked; save(); }
    });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === 'Escape') { if (!$('review').hidden) closeReview(); else if (overlayKind && overlayKind !== 'start' && overlayKind !== 'base') closeOverlay(); else if ($('app').classList.contains('expanded')) toggleExpand(); return; }
      if (overlayKind || !$('review').hidden || tag === 'input' || tag === 'textarea' || tag === 'select' || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (ui.center === 'diagram' && cid() === 'starter' && currentControls().length && (k === 's' || k === 'x')) { if (!e.repeat) { var key = k === 's' ? 'pb.PB2' : 'pb.PB1'; if (!sim.getPath(S, key)) setKey(key, true); } e.preventDefault(); return; }
      if (tag === 'button' && (e.key === ' ' || e.key === 'Enter')) return;
      if (k === 'n') stepNext(); else if (k === 'p') stepPrev(); else if (k === 'h') help('hint'); else if (k === 'f') toggleExpand();
    });
    document.addEventListener('keyup', function (e) {
      var k = e.key.toLowerCase();
      if ((k === 's' || k === 'x') && ui.center === 'diagram' && cid() === 'starter') { var key = k === 's' ? 'pb.PB2' : 'pb.PB1'; if (sim.getPath(S, key)) setKey(key, false); }
    });
    window.addEventListener('resize', applyScale);
    bindControls(); bindMeter();
  }

  function init() {
    var style = document.createElement('style'); style.id = 'schemCss'; style.textContent = FS.schem.CSS; document.head.appendChild(style);
    document.body.classList.toggle('rm', rm());
    applyScale();
    $('modes').innerHTML = MODES.map(function (m) { return '<button class="modebtn" data-mode="' + m[0] + '" title="' + esc(m[2]) + '">' + m[1] + '</button>'; }).join('');
    $('camBar').innerHTML = '<div class="cam-row" role="group" aria-label="Go to station">' + STATIONS.map(function (s) { return '<button class="stbtn" data-st="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="cam-row" role="group" aria-label="Camera"><button class="stbtn" id="btnDoor" aria-pressed="false">Open panel (simulated)</button><button class="stbtn" data-cam="trace" title="Frame the devices on the current drawing">Trace view</button>' +
      '<button class="stbtn" data-cam="out" aria-label="Zoom out">−</button><button class="stbtn" data-cam="in" aria-label="Zoom in">+</button><button class="stbtn" data-cam="reset">Reset view</button><button class="stbtn" data-cam="lesson">Return to lesson</button><button class="stbtn" id="btnZone" aria-pressed="false" title="Show the sensor detection area">Sensor zone</button></div>';
    var host = $('view3d'), ok = false;
    if (!P.simple && FS.scene3d) { try { ok = FS.scene3d.init(host, { quality: P.quality, adaptive: P.adaptive }); } catch (e) { ok = false; } if (ok) scene = FS.scene3d; }
    if (!ok) { host.innerHTML = ''; FS.scene2d.init(host); scene = FS.scene2d; $('camBar').innerHTML = ''; $('viewNote').textContent = 'Simple 2.5D view. Click a tag to select a part. All lessons work in this view.'; }
    scene.setRM(rm());
    scene.onPick(function (h) {
      if (h.bench != null) { var st = curStep(); if (st && st.kind === 'match') matchAnswer(h.bench); return; }
      selectRef(h.ref);
    });
    sc('onPress', function (ref, down) {
      var key = ref === 'PB2' ? 'pb.PB2' : ref === 'PB1' ? 'pb.PB1' : null;
      if (!key || ui.center !== 'diagram' || cid() !== 'starter') return;
      if (!currentControls().some(function (c) { return c.key === key; })) return;
      if (sim.getPath(S, key) !== down) setKey(key, down);
    });
    bind(); drawSound(); setTab('mentor');
    if (!FS.lesson(P.lesson)) P.lesson = 'L1';
    go(P.lesson);
    showStart();
    FS.app = { state: function () { return S; }, ui: ui, progress: function () { return P; }, go: go, refresh: refresh, selectPart: selectPart, selectRef: selectRef, setKey: setKey, startMission: startMission, is3d: ok,
      setMode: function (m) { P.mode = m; ui.labelsOn = false; refresh(); drawCompCard(); drawChips(); }, enter: function () { P.started = true; leaveHero(); closeOverlay(); } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
