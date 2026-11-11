/* FIRST SHIFT — application: lesson engine, missions, mock interview, meter,
 * built-in help, study paths, review sheet and local progress. All teaching
 * content comes from js/data/*.js; all circuit behavior from js/sim.js. */
(function () {
  'use strict';
  var FS = window.FS, sim = FS.sim, esc = FS.schem.esc;
  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------------ progress (local only) */
  var KEY = 'firstShift.v1', storageOk = true;
  function loadProgress() {
    var d = { started: false, lesson: 'L1', step: {}, stepsDone: {}, done: {}, missions: {}, quiz: null, path: null, pathDone: {}, rm: null, simple: false, viewed: [] };
    try { var raw = window.localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) d[k] = o[k]; } } catch (e) { storageOk = false; }
    return d;
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(P)); storageOk = true; } catch (e) { storageOk = false; } }
  var P = loadProgress();

  /* ------------------------------------------------------------------ state */
  var S = sim.defaultState(), R = null, F = {};
  var ui = {
    center: 'diagram', diagram: 'lamp', sheet: 'core', specimen: null, pool: null,
    selPart: null, selRef: null, selComp: null,
    meter: { mode: 'V', red: null, black: null, next: 'red' }, lastMeter: null, meterLog: [], log: [],
    viewed: P.viewed.length, trace: null, hint: 0, ans: null, done: false, reveal: true,
    mission: null, quiz: null, fb: '', benchIds: null
  };
  var scene = null, timers = [], cylTimer = null, dispTimer = null, overlayKind = null;
  var REFCOMP = { PS1: 'psu', F1: 'fuse', CB1: 'breaker', DS1: 'disconnect', PB1: 'pb_nc', PB2: 'pb_no', S1: 'selector', S2: 'selector', SS2: 'selector', CR1: 'relay_coil', CR2: 'relay_coil',
    M1: 'contactor_coil', OL1: 'overload', MTR1: 'motor', PL1: 'pilot', PL2: 'pilot', TB1: 'terminal', PE: 'earth', PLC1: 'plc_in', PEC1: 'photo', FU: 'fuse',
    SRC: 'air_src', SV1: 'shutoff', FRL1: 'frl', PG1: 'gauge', V1: 'dcv', SOL1: 'solenoid', CYL1: 'cyl_da', FC: 'flow_ctrl' };
  var STATIONS = [['overview', 'Overview'], ['panel', 'Panel'], ['display', 'Display'], ['bench', 'Workbench'], ['conveyor', 'Conveyor'], ['pneu', 'Pneumatics']];

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
  function setKey(key, val) { sim.setPath(S, key, val); ui.log.push(key + ':' + val); refresh(); }

  function ctx() {
    return { S: S, res: R, flags: F, selPart: ui.selPart, selRef: ui.selRef, reveal: ui.reveal, hideFaults: !!ui.mission, trace: ui.trace, probes: ui.meter, rm: rm() };
  }
  function refresh() {
    var d = D();
    R = sim.settle(d.circuit, S);
    var fl = sim.fluid(S, R.el.SOL1 ? R.el.SOL1.on : false);
    F = { motor: d.circuit === 'starter' && S.mains && S.relay.M1, supply: S.supply, p0: fl.p0, p: fl.p, pA: fl.pA, pB: fl.pB, act: fl.act, bar: fl.bar };
    drawCenter(); syncControls(); drawMeter(); updateScene(); checkGoal(); scheduleDisplay();
  }
  function updateScene() {
    if (!scene) return;
    function on(id) { return !!(R.el[id] && R.el[id].on); }
    var c = cid();
    scene.update({ supply: S.supply, fuseIn: S.fuseIn, mains: S.mains, PB1: S.pb.PB1, PB2: S.pb.PB2, S1: S.sw.S1, S2: S.sw.S2, SS2: S.sw.SS2,
      PL1: on('PL1'), PL2: on('PL2'), CR1: c === 'ladD' && S.relay.CR1, CR2: c === 'plc' && S.relay.CR2, M1: c === 'starter' && S.relay.M1, motor: F.motor,
      ol: S.olTripped, I0: c === 'plc' && S.plc.I0, Q0: c === 'plc' && S.plc.Q0, sensor: c === 'plc' && S.supply && R.el.PEC1.closed,
      sol: on('SOL1'), air: S.air, bar: c === 'pneu' ? F.bar : 0, cyl: S.cyl, box: c === 'plc' && S.box });
  }
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
    if (changed) { buildControls(); drawSchemHeader(); }
  }
  function setSheet(group, pool) { ui.center = 'sheet'; ui.sheet = group; ui.pool = pool || null; buildControls(); drawSchemHeader(); }
  function setSpecimen(sp) { ui.center = 'specimen'; ui.specimen = sp; buildControls(); drawSchemHeader(); }

  function drawSchemHeader() {
    var L = LES(), tabs = '', title, conv;
    if (ui.center === 'diagram') { title = D().title; conv = D().style; }
    else if (ui.center === 'sheet') { title = { core: 'Core symbols', optional: 'Optional recognition symbols', fluid: 'Fluid power symbols' }[ui.sheet]; conv = ui.sheet === 'fluid' ? 'Simplified ISO 1219 style' : 'Simplified North American ladder style'; }
    else { title = ui.center === 'blank' ? 'Question' : 'Symbol'; conv = 'Simplified North American ladder style'; }
    $('schemTitle').textContent = title;
    $('convention').innerHTML = '<span class="badge">' + esc(conv) + '</span><span class="conv-note">IEC and other conventions differ. Always read the legend.</span>';
    if (!ui.mission && !ui.quiz && L.tabs) {
      tabs = L.tabs.map(function (t) {
        var cur = t[0].indexOf('sheet:') === 0 ? (ui.center === 'sheet' && ui.sheet === t[0].slice(6)) : (ui.center === 'diagram' && ui.diagram === t[0]);
        return '<button class="tab" role="tab" aria-selected="' + cur + '" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>';
      }).join('');
    }
    $('tabs').innerHTML = tabs;
    drawLegend();
  }
  function drawLegend() {
    var o = '<div class="lg-keys">' +
      '<span><i class="k k-live"></i>Orange, thick, dashed: energized path (current flowing)</span>' +
      '<span><i class="k k-idle"></i>Gray, thin: inactive path</span>' +
      '<span><i class="k k-sel"></i>Blue box + “SELECTED”: selected component (dashed + “SAME DEVICE”: its other parts)</span>' +
      '<span><i class="k k-fault"></i>Red ✕ + label: revealed fault</span>' +
      (ui.center === 'diagram' && D().circuit === 'pneu' ? '<span><i class="k k-fluid"></i>Teal, very thick: pressurized air line (not a wire)</span>' : '') + '</div>';
    if (ui.center === 'diagram') {
      o += '<dl class="lg-list">' + D().legend.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<p class="lg-note">Symbols are drawn in their reference state (not pressed, de-energized); the tag under each shows its live state here. These reference labels belong to this application: other drawings use other labels.</p>';
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
      box.innerHTML = '<div class="spec"><span>No drawing for this question. Answer in the mentor panel.</span></div>';
    } else {
      box.className = 'diagram specimen';
      box.innerHTML = '<div class="spec">' + FS.sym.card(ui.specimen.sym, ui.specimen.o, 'Symbol to identify') + '<span>Symbol shown in its reference state</span></div>';
    }
  }
  function drawSheet(box) {
    var st = !ui.mission && !ui.quiz ? STEP() : null, picking = st && st.kind === 'pick' && !ui.done;
    var list = FS.components.filter(function (c) { return ui.pool ? ui.pool.indexOf(c.id) >= 0 : c.group === ui.sheet; });
    if (ui.pool) list.sort(function (a, b) { return ui.pool.indexOf(a.id) - ui.pool.indexOf(b.id); });
    box.className = 'diagram sheet';
    box.innerHTML = '<div class="cards">' + list.map(function (c, i) {
      var seen = P.viewed.indexOf(c.id) >= 0;
      return '<button class="card' + (ui.selComp === c.id ? ' sel' : '') + '" data-comp="' + c.id + '" aria-pressed="' + (ui.selComp === c.id) + '">' +
        FS.sym.card(c.sym, c.o, picking ? 'Symbol ' + (i + 1) : c.name) +
        '<span class="card-n">' + (picking ? 'Symbol ' + (i + 1) : esc(c.name)) + '</span>' +
        (picking ? '' : '<span class="card-r">' + esc(c.ref) + (seen ? ' · viewed' : '') + '</span>') + '</button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ selection (drawing ↔ equipment) */
  function clearSel() { ui.selPart = null; ui.selRef = null; ui.selComp = null; ui.benchIds = null; if (scene) { scene.select(null); scene.bench(null, null, null); } }
  function showOnBench(compId) {
    var c = FS.comp(compId); if (!scene || !c) return;
    scene.bench([c.shape], null, [compId]); scene.select('__bench'); scene.focusOn('__bench');
  }
  function afterSelect(phys, quiet) {
    if (scene) {
      if (phys && scene.has(phys)) { scene.bench(null, null, null); scene.select(phys); if (!quiet) scene.focusOn(phys); }
      else if (ui.selComp) showOnBench(ui.selComp);
    }
    drawCompCard(); drawCenter(); drawChips(); checkGoal(); scheduleDisplay();
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
    drawCompCard(); drawCenter(); drawChips(); checkGoal();
  }
  function onPart(id) {
    var p = partById(id); if (!p) return;
    if (ui.quiz) return quizPick(id);
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
    if (ui.center === 'diagram') {
      var seen = {};
      D().parts.forEach(function (p) {
        var ph = physOf(p); if (seen[ph]) return; seen[ph] = 1;
        var cur = ui.selRef && (ui.selRef === p.ref);
        o += '<button class="chip' + (cur ? ' sel' : '') + '" data-ref="' + esc(ph) + '" aria-pressed="' + !!cur + '">' + esc(p.name || (ph === 'FU' ? 'FU1–3' : ph === 'FC' ? 'FC1–2' : ph === 'SRC' ? 'Air' : p.ref)) + '</button>';
      });
      o = '<span class="chips-l">Parts on this drawing</span>' + o;
    } else if (ui.center === 'sheet') {
      o = '<span class="chips-l">Select a symbol card. The part appears on the workbench.</span>';
    } else {
      o = '<span class="chips-l">Answer in the mentor panel.</span>';
    }
    $('chips').innerHTML = o;
  }

  function drawCompCard() {
    var box = $('compCard'), c = ui.selComp && FS.comp(ui.selComp);
    var st = !ui.mission && !ui.quiz ? STEP() : null;
    if (!c || ui.quiz || (st && (st.kind === 'pick' || st.kind === 'match') && !ui.done)) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    var same = '';
    if (ui.center === 'diagram' && ui.selRef) {
      var mates = D().parts.filter(function (p) { return p.ref === ui.selRef; }), names = {};
      mates.forEach(function (p) { names[FS.comp(p.comp).name + (p.sub && !p.plain ? ' (' + p.sub + ')' : '')] = 1; });
      if (Object.keys(names).length > 1) {
        same = '<div class="same"><b>' + esc(ui.selRef) + ' appears ' + Object.keys(names).length + ' times on this drawing.</b> They are parts of one device, linked by the shared label, not necessarily by a wire:<ul>' +
          Object.keys(names).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
      }
    }
    box.innerHTML = '<div class="cc-h"><div class="cc-sym">' + FS.sym.card(c.sym, c.o, c.name) + '</div><div><h4>' + esc(c.name) + '</h4><div class="cc-ref">Label in this application: <b>' + esc(c.ref) + '</b></div></div></div>' + same +
      '<dl class="cc">' +
      '<dt>Purpose</dt><dd>' + esc(c.purpose) + '</dd>' +
      '<dt>What it looks like</dt><dd>' + esc(c.looks) + '</dd>' +
      '<dt>Normal state</dt><dd>' + esc(c.normal) + '</dd>' +
      '<dt>Where you find it</dt><dd>' + esc(c.where) + '</dd>' +
      '<dt>Common misunderstanding</dt><dd>' + esc(c.myth) + '</dd>' +
      (c.note ? '<dt>Note</dt><dd>' + esc(c.note) + '</dd>' : '') +
      (c.iec ? '<dt>Other conventions</dt><dd>' + esc(c.iec) + '</dd>' : '') +
      '</dl><details class="iq"><summary>Interview question: ' + esc(c.q) + '</summary><p>' + esc(c.a) + '</p></details>';
  }

  /* ------------------------------------------------------------------ simulation controls */
  var POW = { t: 'tog', key: 'supply', l: 'Control power', v: ['ON', 'OFF'] };
  var SW1 = { t: 'tog', key: 'sw.S1', l: 'S1 switch', v: ['CLOSED', 'OPEN'] }, SW2 = { t: 'tog', key: 'sw.S2', l: 'S2 switch', v: ['CLOSED', 'OPEN'] };
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
    if (ui.center !== 'diagram' || ui.quiz) return [];
    var list = CTL[cid()] || [];
    if (ui.mission) { var allow = FS.mission(ui.mission.id).controls; list = list.filter(function (c) { return c.t !== 'act' && allow.indexOf(c.key) >= 0; }); }
    return list;
  }
  function buildControls() {
    var list = currentControls(), o = '';
    list.forEach(function (c, i) {
      if (c.t === 'tog') o += '<button class="ctl tog" data-i="' + i + '"><span class="ctl-l">' + esc(c.l) + '</span><span class="ctl-v"></span></button>';
      else if (c.t === 'hold') o += '<button class="ctl hold ' + c.cls + '" data-i="' + i + '" aria-pressed="false"><span class="ctl-l">' + esc(c.l) + '</span><span class="ctl-v">hold to press' + (c.kb ? ' · key ' + c.kb : '') + '</span></button>';
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
    var box = $('meter'), m = ui.meter, has = ui.center === 'diagram' && (D().tps || []).length && !ui.quiz;
    if (!has) { box.innerHTML = '<div class="m-h">Meter</div><p class="m-note">No test points on this view.</p>'; ui.lastMeter = null; return; }
    var r = sim.meter(cid(), S, m.mode, m.red, m.black);
    ui.lastMeter = (m.red && m.black) ? { mode: m.mode, a: m.red, b: m.black, value: r.value, ok: !!r.ok, blocked: !!r.blocked } : null;
    var lcd = box.querySelector('.m-lcd');
    if (!lcd) {
      box.innerHTML = '<div class="m-h">Meter <span>simulated 24 VDC control circuit only</span></div>' +
        '<div class="m-row"><div class="m-modes" role="group" aria-label="Meter function"><button data-mode="V">DC volts</button><button data-mode="R">Continuity Ω</button></div>' +
        '<div class="m-lcd" role="status" aria-live="polite"></div></div>' +
        '<div class="m-row"><button class="m-probe red" data-probe="red"></button><button class="m-probe black" data-probe="black"></button><button class="m-clear" data-probe="clear">Clear</button></div>' +
        '<p class="m-note"></p>';
      lcd = box.querySelector('.m-lcd');
    }
    Array.prototype.forEach.call(box.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m.mode); });
    if (lcd.textContent !== r.text) lcd.textContent = r.text;
    lcd.classList.toggle('blocked', !!r.blocked);
    var pr = box.querySelector('[data-probe="red"]'), pb = box.querySelector('[data-probe="black"]');
    pr.textContent = 'Red +: ' + (m.red || 'click a test point'); pb.textContent = 'Black −: ' + (m.black || 'click a test point');
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
    return { say: 'Explain', demo: 'Demonstrate', 'try': 'Your turn', ask: st.predict ? 'Predict' : 'Check', pick: 'Your turn', match: 'Your turn', trace: 'Trace the path' }[st.kind];
  }
  function cardsHtml(cards) {
    return (cards || []).map(function (c) {
      return '<div class="lcard"><h4>' + esc(c.h) + '</h4>' +
        (c.syms ? '<div class="lsyms">' + c.syms.map(function (s) { return '<figure>' + FS.sym.card(s[0], null, s[1]) + '<figcaption>' + esc(s[1]) + '</figcaption></figure>'; }).join('') + '</div>' : '') +
        '<ul>' + c.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }
  function choicesHtml(choices, ans, act) {
    return '<div class="choices">' + choices.map(function (c, i) {
      var cls = 'choice', mark = '';
      if (ans != null) { if (c.ok) { cls += ' right'; mark = '<span class="mk">✓ correct</span>'; } else if (i === ans) { cls += ' wrong'; mark = '<span class="mk">✗ your answer</span>'; } }
      return '<button class="' + cls + '" data-act="' + act + '" data-i="' + i + '"' + (ans != null ? ' disabled' : '') + '><span>' + c.t + '</span>' + mark + '</button>';
    }).join('') + '</div>';
  }
  function setFb(kind, html) { ui.fb = html ? '<div class="fbx ' + kind + '">' + html + '</div>' : ''; var n = $('fb'); if (n) n.innerHTML = ui.fb; }

  function renderMentor() {
    if (ui.mission) return renderMission();
    if (ui.quiz) return renderQuiz();
    var L = LES(), st = STEP(), o = '';
    if (L.kind === 'missions') return renderMissionHome();
    if (L.kind === 'quiz') return renderQuizHome();
    o += alexHead(phaseOf(st), 'Lesson ' + lessonNo(L.id) + ' · step ' + (idx() + 1) + ' of ' + L.steps.length);
    o += '<h3>' + esc(st.title) + '</h3>';
    if (st.text) o += '<p class="say">' + st.text + '</p>';
    o += cardsHtml(st.card);
    if (st.safety) o += '<div class="safety"><b>Safety</b> ' + esc(st.safety) + '</div>';
    if (st.kind === 'demo') {
      o += '<button class="btn primary" data-act="demo">▶ Play demonstration</button><p class="note" id="demoNote" role="status" aria-live="polite"></p>';
    } else if (st.kind === 'try') {
      o += '<div class="goal" id="goal"></div>';
    } else if (st.kind === 'ask') {
      o += '<p class="q">' + st.q + '</p>' + (st.predict && ui.ans == null ? '<p class="note">Commit to an answer first. Then I\'ll run it.</p>' : '') + choicesHtml(st.choices, ui.ans, 'answer');
    } else if (st.kind === 'pick') {
      o += '<p class="q">' + st.q + '</p><p class="note">Names are hidden for this exercise. Click a symbol card.</p>';
    } else if (st.kind === 'match') {
      o += '<p class="q">' + st.q + '</p><div class="choices">' + st.bench.map(function (id, i) {
        var c = FS.comp(id), cls = 'choice', mark = '';
        if (ui.ans != null) { if (id === st.answer) { cls += ' right'; mark = '<span class="mk">✓ correct</span>'; } else if (i === ui.ans) { cls += ' wrong'; mark = '<span class="mk">✗ your answer</span>'; } }
        return '<button class="' + cls + '" data-act="match" data-i="' + i + '"' + (ui.done ? ' disabled' : '') + '><span><b>' + 'ABCD'[i] + '</b> · ' + esc(st.opts ? st.opts[i] : c.looks) + '</span>' + mark + '</button>';
      }).join('') + '</div><p class="note">The four parts are on the workbench, labelled A to D. You can also click one there.</p>';
    } else if (st.kind === 'trace') {
      o += '<div class="trace"><div>Your path: <b id="traceList"></b></div><div class="row"><button class="btn primary" data-act="traceCheck">Check path</button><button class="btn" data-act="traceClear">Clear</button></div></div>';
    }
    o += '<div id="fb" role="status" aria-live="polite">' + ui.fb + '</div>';
    $('mentor').innerHTML = o;
    if (st.kind === 'try') drawGoal();
    if (st.kind === 'trace') drawTraceList();
  }
  function drawGoal() {
    var n = $('goal'), st = STEP(); if (!n) return;
    var extra = P.lesson === 'L3' && idx() === 1 ? ' Viewed so far: ' + ui.viewed + ' of 28 core parts.' : '';
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
  function checkGoal() {
    if (ui.mission) return missionObserve();
    if (ui.quiz) return;
    var L = LES(); if (L.kind) return;
    var st = STEP();
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
    var c = st.choices[i];
    markStep(c.ok ? 2 : 1);
    ui.fb = '<div class="fbx ' + (c.ok ? 'ok' : 'no') + '"><b>' + (c.ok ? 'Correct.' : 'Not quite.') + '</b> ' + c.fb + (st.run ? '<div class="note" id="runNote">' + (st.run.length ? 'Running the simulation…' : 'Look at the drawing: the simulation shows this state.') + '</div>' : '') + '</div>';
    renderMentor();
    if (st.probes) { ui.meter.mode = 'V'; ui.meter.red = st.probes[0]; ui.meter.black = st.probes[1]; }
    if (st.run && st.run.length) playPatches(st.run, 900, function () { var n = $('runNote'); if (n) n.textContent = 'Simulation run. Check the drawing against your prediction.'; });
    else refresh();
  }
  function pickCard(compId) {
    var st = STEP();
    if (ui.done) return selectComp(compId);
    if (compId === st.target) {
      ui.done = true; markStep(2); setFb('ok', '<b>Correct.</b> ' + st.fbOk); selectComp(compId); drawSheet($('diagram'));
    } else {
      markStep(1); setFb('no', '<b>Not that one.</b> ' + st.fbNo);
    }
  }
  function matchAnswer(i) {
    var st = STEP(); if (ui.done) return;
    ui.ans = i;
    if (st.bench[i] === st.answer) { ui.done = true; markStep(2); ui.fb = '<div class="fbx ok"><b>Correct.</b> ' + st.fbOk + '</div>'; }
    else { markStep(1); ui.fb = '<div class="fbx no"><b>Not that one.</b> ' + st.fbNo + ' Try again.</div>'; }
    renderMentor();
  }
  function traceCheck() {
    var st = STEP(), r = sim.checkTrace(cid(), S, ui.trace);
    if (r.ok && st.need && r.path.indexOf(st.need) < 0) { setFb('no', 'That path is complete, but it is not the one I asked for. Trace the path that goes through ' + esc(st.need) + '.'); return; }
    if (r.ok) { ui.done = true; markStep(2); setFb('ok', '<b>✓</b> ' + esc(r.msg)); }
    else {
      setFb('no', esc(r.msg));
      if (r.stop) { var p = D().parts.filter(function (q) { return q.el === r.stop; })[0]; if (p) { ui.selPart = p.id; ui.selRef = p.ref; drawCenter(); } }
    }
  }
  function playDemo() {
    var st = STEP(), list = st.script, i = 0;
    stopTimers(); resetSim(); if (st.diagram) setDiagram(st.diagram); applyPreset(st.preset); clearSel(); refresh();
    var note = $('demoNote');
    (function next() {
      if (i >= list.length) { ui.done = true; markStep(2); return; }
      var it = list[i++];
      later(it.ms, function () {
        if (it.diagram) setDiagram(it.diagram);
        if (it.set) sim.patch(S, it.set);
        refresh();
        if (it.sel) selectPart(it.sel, false);
        if (note && it.note) note.textContent = it.note;
        next();
      });
    })();
  }

  /* ------------------------------------------------------------------ navigation */
  function enterStep() {
    var st = STEP();
    stopTimers(); resetSim();
    ui.hint = 0; ui.ans = null; ui.done = false; ui.fb = ''; ui.reveal = true; ui.trace = st.kind === 'trace' ? [] : null; ui.mission = null; ui.quiz = null;
    clearSel(); $('helpOut').innerHTML = '';
    if (st.kind === 'pick') setSheet(st.sheet, st.pool);
    else if (st.symbol) setSpecimen(st.symbol);
    else if (st.sheet) setSheet(st.sheet);
    else setDiagram(st.diagram);
    if (ui.center === 'diagram') applyPreset(st.preset);
    if (st.kind === 'say') markStep(2);
    renderMentor(); refresh(); drawCompCard(); drawChips(); drawProgress(); drawSchemHeader();
    if (st.kind === 'match' && scene) { scene.bench(st.bench.map(function (id) { return FS.comp(id).shape; }), ['A', 'B', 'C', 'D'], st.bench); scene.select(null); scene.focus('bench'); }
    else if (st.sel && ui.center === 'diagram') selectPart(st.sel, false);
    else if (scene) scene.focus(ui.center === 'sheet' || ui.center === 'specimen' ? 'bench' : (LES().station || 'overview'));
  }
  function go(lessonId, i) {
    stopTimers(); closeOverlay();
    P.lesson = lessonId;
    var L = LES();
    ui.mission = null; ui.quiz = null; ui.fb = ''; $('helpOut').innerHTML = '';
    if (L.kind) {
      resetSim(); clearSel(); ui.reveal = true; ui.trace = null;
      setDiagram(L.kind === 'missions' ? 'starter' : 'starter'); refresh(); renderMentor(); drawCompCard(); drawChips(); drawProgress(); drawSchemHeader();
      if (scene) scene.focus('overview');
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
  function stepNext() {
    var L = LES();
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
      var n = FS.missions.filter(function (m) { return P.missions[m.id] && P.missions[m.id].done; }).length;
      o += '<div class="pg-info">' + n + ' of ' + FS.missions.length + ' missions complete</div>';
    } else {
      o += '<div class="pg-info">' + (P.quiz ? 'Best mock interview score: ' + P.quiz.best + '%' : 'Mock interview not taken yet') + '</div>';
    }
    var last = L.kind || idx() === L.steps.length - 1;
    o += '<div class="pg-nav"><button class="btn" data-nav="prev"' + (lessonNo(L.id) === 1 && idx() === 0 ? ' disabled' : '') + '>← Back</button>' +
      '<button class="btn primary" data-nav="next">' + (last ? (nextLessonId() && nextLessonId() !== 'review' ? 'Next lesson →' : 'Before the interview →') : 'Next →') + '</button></div>';
    $('progress').innerHTML = o;
  }

  /* ------------------------------------------------------------------ missions (Lesson 8) */
  var STAGES = ['observe', 'safe', 'expected', 'section', 'checks', 'interpret', 'diagnose', 'repair'];
  function renderMissionHome() {
    var o = alexHead('Missions', 'Lesson 8 · troubleshooting');
    o += '<h3>Eight faults, one method</h3><p class="say">Each mission is a real-looking fault on the equipment you now know. I don\'t care how fast you name the part. I care that you can show <b>why</b>. Guessing and part-swapping score nothing here, same as on the floor.</p>';
    o += '<ol class="method">' + FS.METHOD.map(function (m) { return '<li><b>' + esc(m[0]) + '.</b> ' + esc(m[1]) + '</li>'; }).join('') + '</ol>';
    o += '<div class="mlist">' + FS.missions.map(function (m, i) {
      var pr = P.missions[m.id];
      return '<button class="mitem" data-act="mission" data-id="' + m.id + '"><span class="mn">' + (i + 1) + '</span><span class="mt">' + esc(m.title) + '<small>' + esc(m.symptom.replace(/^Operator report: /, '')) + '</small></span><span class="ms">' + (pr && pr.done ? (pr.clean ? '✓ evidence-based' : '✓ done, with guesses') : 'not started') + '</span></button>';
    }).join('') + '</div><div id="fb" role="status" aria-live="polite"></div>';
    $('mentor').innerHTML = o;
  }
  function startMission(id) {
    var m = FS.mission(id);
    stopTimers(); resetSim(); clearSel(); $('helpOut').innerHTML = '';
    ui.mission = { id: id, stage: 0, seen: false, checks: {}, ev: [], bad: 0, q: {}, fb: '' };
    ui.quiz = null; ui.reveal = false; ui.trace = null; ui.hint = 0; ui.fb = '';
    ui.center = 'x'; setDiagram(m.diagram);
    sim.patch(S, m.preset || {});
    Object.keys(m.faults).forEach(function (k) { S.faults[k] = m.faults[k]; });
    refresh(); renderMission(); drawCompCard(); drawChips(); drawSchemHeader();
    if (scene) scene.focus(m.station);
  }
  function missionObserve() {
    var ms = ui.mission, m = FS.mission(ms.id);
    if (ms.stage === 0 && !ms.seen && R && m.observe.goal(S, R, ui)) { ms.seen = true; renderMission(); }
  }
  function renderMission() {
    var ms = ui.mission, m = FS.mission(ms.id), k = STAGES[ms.stage], n = FS.missions.indexOf(m) + 1, o = '';
    o += alexHead('Mission ' + n, m.title);
    o += '<div class="stagebar" aria-label="Troubleshooting step ' + (ms.stage + 1) + ' of 8">' + FS.METHOD.map(function (x, i) { return '<span class="' + (i < ms.stage ? 'ok' : i === ms.stage ? 'cur' : '') + '">' + (i + 1) + '</span>'; }).join('') + '</div>';
    o += '<h3>Step ' + (ms.stage + 1) + ' of 8 · ' + esc(FS.METHOD[ms.stage][0]) + '</h3>';
    o += '<div class="symptom"><b>Symptom</b> ' + esc(m.symptom) + '</div>';
    if (k === 'observe') {
      o += '<p class="say">' + m.observe.text + '</p>';
      o += ms.seen ? '<div class="goal ok"><b>✓</b> ' + esc(m.observe.seen) + '</div><button class="btn primary" data-act="mnext">Continue</button>' : '<div class="goal"><b>○</b> Operate the equipment with the controls at the bottom to confirm the symptom yourself.</div>';
    } else if (k === 'checks') {
      var keys = m.checks.filter(function (c) { return c.type === 'key'; }), got = keys.filter(function (c) { return ms.checks[c.id]; }).length;
      o += '<p class="say">Choose a check that <b>separates</b> the possible causes. You can also use the meter yourself on the drawing. Each result is added to your evidence.</p>';
      o += '<div class="choices">' + m.checks.map(function (c) {
        return '<button class="choice' + (ms.checks[c.id] ? (c.type === 'bad' ? ' wrong' : ' used') : '') + '" data-act="mcheck" data-id="' + c.id + '"' + (ms.checks[c.id] ? ' disabled' : '') + '><span>' + esc(c.t) + '</span>' + (ms.checks[c.id] ? '<span class="mk">' + (c.type === 'bad' ? '✗ not done' : '✓ checked') + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      o += '<div class="evidence"><h4>Evidence so far</h4>' + (ms.ev.length ? '<ol>' + ms.ev.map(function (e) { return '<li><b>' + esc(e.t) + '</b><br>' + esc(e.r) + '</li>'; }).join('') + '</ol>' : '<p class="note">Nothing yet.</p>') + '</div>';
      o += '<button class="btn primary" data-act="mnext"' + (got < keys.length ? ' disabled' : '') + '>Interpret the evidence</button>' +
        (got < keys.length ? '<p class="note">Not enough evidence to separate the causes yet. A diagnosis now would be a guess.</p>' : '');
    } else if (k === 'repair') {
      o += '<div class="fbx ok"><b>Why the evidence supports it.</b> ' + esc(m.why) + '</div>';
      o += '<div class="lcard"><h4>The symptom alone had several possible causes</h4><ul>' + m.others.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><p class="note">That is why you measured before naming a part.</p></div>';
      o += '<div class="lcard"><h4>Proper repair and verification</h4><p>' + esc(m.repair) + '</p></div>';
      o += '<div class="safety"><b>Safety</b> Follow site procedures and work within your authorization and training. Identify every energy source. A STOP button or a software command is not energy isolation.</div>';
      o += '<p class="note">' + (ms.bad ? 'You chose ' + ms.bad + ' action' + (ms.bad > 1 ? 's' : '') + ' or answer' + (ms.bad > 1 ? 's' : '') + ' that the evidence did not support. Repeat the mission and aim for a clean run.' : 'Clean run: every step was supported by evidence.') + '</p>';
      o += '<div class="row"><button class="btn primary" data-act="mdone">Complete mission</button><button class="btn" data-act="mission" data-id="' + m.id + '">Repeat</button></div>';
    } else {
      var q = m[k];
      o += '<p class="q">' + esc(q.q) + '</p>' + '<div class="choices">' + q.choices.map(function (c, i) {
        var a = ms.q[k], cls = 'choice', mark = '';
        if (a && a.right && c.ok) { cls += ' right'; mark = '<span class="mk">✓ correct</span>'; }
        else if (a && a.tried[i]) { cls += ' wrong'; mark = '<span class="mk">✗</span>'; }
        return '<button class="' + cls + '" data-act="mans" data-i="' + i + '"' + ((a && (a.right || a.tried[i])) ? ' disabled' : '') + '><span>' + esc(c.t) + '</span>' + mark + '</button>';
      }).join('') + '</div>';
      if (k !== 'safe' && k !== 'expected' && ms.ev.length) o += '<div class="evidence"><h4>Your evidence</h4><ol>' + ms.ev.map(function (e) { return '<li><b>' + esc(e.t) + '</b><br>' + esc(e.r) + '</li>'; }).join('') + '</ol></div>';
      if (ms.q[k] && ms.q[k].right) o += '<button class="btn primary" data-act="mnext">Continue</button>';
    }
    o += '<div id="fb" role="status" aria-live="polite">' + (ms.fb || '') + '</div>';
    o += '<p class="row"><button class="btn small" data-act="mhome">← All missions</button></p>';
    $('mentor').innerHTML = o;
  }
  function missionAct(act, t) {
    var ms = ui.mission, m = ms && FS.mission(ms.id), k = ms && STAGES[ms.stage];
    if (act === 'mhome') { go('L8'); return; }
    if (act === 'mnext') { ms.stage++; ms.fb = ''; ui.hint = 0; renderMission(); $('mentor').scrollTop = 0; return; }
    if (act === 'mcheck') {
      var c = m.checks.filter(function (x) { return x.id === t.dataset.id; })[0];
      ms.checks[c.id] = true;
      if (c.type === 'bad') { ms.bad++; ms.fb = '<div class="fbx no"><b>Not done.</b> ' + esc(c.fb) + '</div>'; }
      else { var r = c.ev(S); ms.ev.push({ t: c.t, r: r }); ms.fb = '<div class="fbx ' + (c.type === 'key' ? 'ok' : 'note') + '"><b>Result.</b> ' + esc(r) + (c.type === 'key' ? ' This result helps separate the causes.' : '') + '</div>'; }
      renderMission(); return;
    }
    if (act === 'mans') {
      var q = m[k], i = +t.dataset.i, ch = q.choices[i], a = ms.q[k] = ms.q[k] || { tried: {}, right: false };
      if (ch.ok) {
        a.right = true;
        ms.fb = '<div class="fbx ok"><b>Correct.</b> ' + esc(ch.fb || '') + '</div>';
        if (k === 'diagnose') { ui.reveal = true; ms.fb = '<div class="fbx ok"><b>Supported by your evidence.</b> The fault is now marked in red on the drawing.</div>'; refresh(); }
      } else {
        a.tried[i] = true; ms.bad++;
        ms.fb = '<div class="fbx no"><b>' + (k === 'diagnose' ? 'The evidence does not support that.' : 'Not quite.') + '</b> ' + esc(ch.fb || '') + '</div>';
      }
      renderMission(); return;
    }
    if (act === 'mdone') {
      var prev = P.missions[m.id];
      P.missions[m.id] = { done: true, clean: ms.bad === 0 || !!(prev && prev.clean) };
      if (FS.missions.every(function (x) { return P.missions[x.id] && P.missions[x.id].done; })) P.done.L8 = true;
      save(); go('L8');
    }
  }

  /* ------------------------------------------------------------------ mock interview (Lesson 9) */
  function renderQuizHome() {
    var o = alexHead('Mock interview', 'Lesson 9 · assessment');
    o += '<h3>Mock hands-on interview</h3><p class="say">Twenty questions, the way a supervisor might walk you round a panel: 8 on symbols, 4 on circuit behavior, 4 on troubleshooting, 2 on drawing types, 2 on safety.<br><br>Some ask you to <b>point</b> at the drawing. Some ask you to <b>explain out loud</b>: say your answer to the room, then compare it with a model answer and rate yourself honestly. Nothing is recorded.</p>';
    if (P.quiz) o += '<div class="lcard"><h4>Last result</h4><p>' + P.quiz.last + '% (best ' + P.quiz.best + '%).</p></div>';
    o += '<p class="note">A score here reflects performance in this practice application only. It is not a professional qualification.</p>';
    o += '<button class="btn primary" data-act="qstart">Start the mock interview</button><div id="fb"></div>';
    $('mentor').innerHTML = o;
  }
  function quizStart() {
    stopTimers(); resetSim(); clearSel(); $('helpOut').innerHTML = '';
    ui.quiz = { i: 0, res: [], state: 'q', shown: false }; ui.mission = null; ui.reveal = false; ui.trace = null;
    quizShow();
  }
  function quizShow() {
    var qz = ui.quiz, q = FS.quiz[qz.i];
    resetSim(); clearSel(); qz.state = 'q'; qz.shown = false; qz.pick = null;
    ui.center = 'x';
    if (q.diagram) setDiagram(q.diagram); else if (q.symbol) setSpecimen(q.symbol); else { ui.center = 'blank'; buildControls(); }
    refresh();
    renderQuiz(); drawChips(); drawCompCard(); drawSchemHeader();
    if (scene) scene.focus(q.diagram === 'plc' ? 'conveyor' : q.diagram ? 'panel' : 'overview');
  }
  function quizScore(score, extra) {
    var qz = ui.quiz, q = FS.quiz[qz.i];
    qz.res[qz.i] = { id: q.id, cat: q.cat, score: score, extra: extra || '' }; qz.state = 'answered';
    renderQuiz();
  }
  function quizPick(id) {
    var qz = ui.quiz, q = FS.quiz[qz.i];
    if (q.type !== 'pick' || qz.state !== 'q') return;
    var p = partById(id), ok = q.parts.indexOf(id) >= 0;
    qz.pick = id; ui.selPart = ok ? id : q.parts[0]; ui.selRef = partById(ui.selPart).ref; drawCenter();
    quizScore(ok ? 1 : 0, 'You pointed at ' + (p.name || p.ref) + (p.sub ? ' (' + p.sub + ')' : '') + '.');
  }
  function renderQuiz() {
    var qz = ui.quiz; if (qz.state === 'results') return renderResults();
    var q = FS.quiz[qz.i], r = qz.res[qz.i], o = '';
    o += alexHead(FS.quizCats[q.cat].name, 'Question ' + (qz.i + 1) + ' of ' + FS.quiz.length);
    o += '<div class="qbar"><i style="width:' + Math.round(qz.i / FS.quiz.length * 100) + '%"></i></div>';
    o += '<p class="q big">' + esc(q.q) + '</p>';
    if (q.type === 'choice') {
      o += choicesHtml(q.choices.map(function (c) { return { t: esc(c.t), ok: c.ok }; }), r ? r.chosen : null, 'qans');
    } else if (q.type === 'pick') {
      o += r ? '' : '<p class="note">Click the part on the drawing. Your first click is your answer.</p>';
    } else {
      if (!qz.shown) o += '<div class="aloud"><p><b>Explain out loud.</b> Take up to a minute and say your answer as you would to the interviewer. Nothing is recorded.</p><button class="btn primary" data-act="qshow">I\'ve said my answer. Show the model answer</button></div>';
      else {
        o += '<div class="lcard"><h4>Model answer</h4><p>' + esc(q.model) + '</p></div>';
        if (!r) o += '<p class="note">How close was what you said?</p><div class="row rate"><button class="btn" data-act="qrate" data-s="1">Confident</button><button class="btn" data-act="qrate" data-s="0.5">Partial</button><button class="btn" data-act="qrate" data-s="0">Needs practice</button></div>';
      }
    }
    if (r) {
      if (q.type !== 'aloud') o += '<div class="fbx ' + (r.score === 1 ? 'ok' : 'no') + '"><b>' + (r.score === 1 ? 'Correct.' : 'Not correct.') + '</b> ' + esc(r.extra ? r.extra + ' ' : '') + esc(q.explain) + '</div>';
      else o += '<div class="fbx note">Recorded as: <b>' + (r.score === 1 ? 'Confident' : r.score === 0.5 ? 'Partial' : 'Needs practice') + '</b>.</div>';
      o += '<button class="btn primary" data-act="qnext">' + (qz.i === FS.quiz.length - 1 ? 'See my results' : 'Next question') + '</button>';
    }
    o += '<div id="fb"></div>';
    $('mentor').innerHTML = o;
    var first = $('mentor').querySelector('.btn.primary'); if (r && first) first.focus();
  }
  function quizAct(act, t) {
    var qz = ui.quiz, q = qz && FS.quiz[qz.i];
    if (act === 'qstart') return quizStart();
    if (act === 'qans') { if (qz.res[qz.i]) return; var i = +t.dataset.i; quizScore(q.choices[i].ok ? 1 : 0); qz.res[qz.i].chosen = i; renderQuiz(); return; }
    if (act === 'qshow') { qz.shown = true; renderQuiz(); return; }
    if (act === 'qrate') { quizScore(+t.dataset.s); return; }
    if (act === 'qnext') {
      if (qz.i < FS.quiz.length - 1) { qz.i++; quizShow(); }
      else { qz.state = 'results'; ui.reveal = true; clearSel(); setDiagram('starter'); refresh(); renderResults(); drawSchemHeader(); }
    }
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
    o += '<div class="score ' + (pass ? 'pass' : 'fail') + '"><div class="score-n">' + pct + '%</div><div><b>' + total + ' of ' + FS.quiz.length + ' points</b><br>' + (pass ? 'Practice pass (80% or more).' : 'Below the 80% practice target. That is what today is for.') + '</div></div>';
    o += '<p class="note">This score reflects performance in this practice application only. It is not a professional qualification.</p>';
    o += '<table class="cats"><thead><tr><th>Category</th><th>Score</th><th></th></tr></thead><tbody>' + Object.keys(FS.quizCats).map(function (k) {
      var c = cats[k], p = Math.round(c.got / c.of * 100);
      return '<tr><th>' + esc(FS.quizCats[k].name) + '</th><td>' + c.got + ' / ' + c.of + '</td><td><span class="bar"><i style="width:' + p + '%"></i></span> ' + p + '%</td></tr>';
    }).join('') + '</tbody></table>';
    var weak = Object.keys(FS.quizCats).filter(function (k) { return cats[k].got / cats[k].of < 0.75; }), rec = {};
    weak.forEach(function (k) { FS.quizCats[k].lessons.forEach(function (l) { rec[l] = 1; }); });
    o += '<div class="lcard"><h4>Recommended lessons to repeat</h4>' + (Object.keys(rec).length ? '<div class="row">' + Object.keys(rec).map(function (l) { return '<button class="btn" data-act="golesson" data-id="' + l + '">Lesson ' + lessonNo(l) + ' · ' + esc(FS.lesson(l).title) + '</button>'; }).join('') + '</div>' : '<p>No category is below 75%. Read the Before the Interview sheet and get some rest.</p>') + '</div>';
    var miss = FS.quiz.filter(function (q, i) { return !qz.res[i] || qz.res[i].score < 1; });
    o += '<div class="lcard"><h4>Questions to review (' + miss.length + ')</h4>' + (miss.length ? '<ol class="miss">' + miss.map(function (q) {
      var r = qz.res[FS.quiz.indexOf(q)];
      return '<li><b>' + esc(q.q) + '</b>' + (q.type === 'aloud' ? ' <i>(self-rated: ' + (r && r.score === 0.5 ? 'partial' : 'needs practice') + ')</i>' : '') + '<br>' + esc(q.explain || q.model) + '</li>';
    }).join('') + '</ol>' : '<p>None. Every answer was correct or rated confident.</p>') + '</div>';
    o += '<div class="row"><button class="btn primary" data-act="qstart">Retake</button><button class="btn" data-act="review">Before the interview</button></div><div id="fb"></div>';
    $('mentor').innerHTML = o; drawProgress();
  }

  /* ------------------------------------------------------------------ built-in help */
  var MHINT = {
    observe: ['Use the simulation controls at the bottom of the screen.', 'Confirming the symptom yourself tells you exactly what does and does not happen.', 'Operate the control named in the instruction and watch the load.'],
    safe: ['Think about what you are authorized to do.', 'A control device such as STOP is not energy isolation, and protective devices are never bypassed.', 'Choose the answer that stays within authorization and site procedure.'],
    expected: ['Look at the drawing and read the path to the load.', 'Expected operation is the complete path with every device in its working state.', 'Choose the answer that describes the whole path from L+ to 0V.'],
    section: ['Which devices are in the path of the thing that is not working?', 'The symptom shows where the problem appears, not where it is caused.', 'Choose the answer that covers the whole relevant path.'],
    checks: ['Start where you can split the circuit in two.', 'Voltage present before a device and missing after it means that device is not passing it.', 'Do the voltage measurements along the path in order, then the isolated continuity or inspection check.'],
    interpret: ['Compare the readings on each side of a device.', 'The open is between the last point with voltage and the first point without it.', 'Choose the answer that names the place where the voltage is lost.'],
    diagnose: ['Go back to your evidence list.', 'Rule out every cause that your readings contradict.', 'Choose the cause that sits between the last good reading and the first bad one.'],
    repair: ['Read how the repair would be verified.', 'A repair is finished only when normal operation has been confirmed.', 'Complete the mission.']
  };
  function help(kind) {
    var out = $('helpOut'), c = ui.selComp && FS.comp(ui.selComp), t = '', title = '';
    var hasCircuit = ui.center === 'diagram';
    var hidden = (ui.mission && !ui.reveal) || (ui.quiz && ui.quiz.state !== 'results');
    if (kind === 'what') {
      title = 'What is this?';
      if (ui.quiz && ui.quiz.state !== 'results') t = 'That is what the interviewer is asking you. Help is switched off during the mock interview.';
      else if (c) t = '<b>' + esc(c.name) + '.</b> ' + esc(c.purpose) + ' ' + esc(c.looks);
      else if (hasCircuit) t = esc(D().what) + ' Select any symbol or part for more detail.';
      else t = 'A sheet of schematic symbols, each drawn in its reference state. Select a card to see the part and its explanation.';
    } else if (kind === 'how') {
      title = 'How does it work?';
      if (ui.quiz && ui.quiz.state !== 'results') t = 'Help is switched off during the mock interview.';
      else if (c) t = '<b>' + esc(c.name) + '.</b> ' + esc(c.normal) + ' <i>Found:</i> ' + esc(c.where);
      else if (hasCircuit) t = esc(D().how);
      else t = 'Select a symbol card first, then ask again.';
    } else if (kind === 'why') {
      title = 'Why did that happen?';
      if (hidden && ui.quiz) t = 'Help is switched off during the mock interview.';
      else if (hidden) t = 'That is the question this mission is asking you. What you can observe: ' + esc(FS.mission(ui.mission.id).symptom.replace(/^Operator report: /, '')) + ' Use a check that separates the possible causes.';
      else if (!hasCircuit) t = 'Nothing is simulated on this view. Open a circuit drawing and operate it, then ask again.';
      else {
        var lines = sim.explain(cid(), S, true);
        if (cid() === 'starter') lines.push(F.motor ? 'MTR1 is RUNNING: M1 is pulled in, so its main contacts connect the motor to the three-phase supply.' : 'MTR1 is STOPPED: ' + (S.relay.M1 ? 'disconnect DS1 is open, so no power reaches the main contacts.' : 'M1 is not pulled in, so its main contacts are open.'));
        if (cid() === 'pneu') lines.push(!F.p ? 'CYL1 is not driven: there is no air pressure at valve V1' + (S.air ? ' (no supply upstream).' : ' (shutoff SV1 is closed).') : F.act ? 'V1 is actuated: air flows 1 → 4 into the cap end, so CYL1 extends.' : 'V1 is at rest (spring): air flows 1 → 2 into the rod end, so CYL1 retracts or stays retracted.');
        t = '<ul><li>' + lines.map(esc).join('</li><li>') + '</li></ul>';
      }
    } else if (kind === 'path') {
      title = 'Show the path';
      if (ui.quiz && ui.quiz.state !== 'results') t = 'Help is switched off during the mock interview.';
      else if (!hasCircuit) t = 'There is no circuit on this view.';
      else if (hidden) t = 'With everything healthy the paths would be: <ul><li>' + sim.paths(cid()).map(function (p) { return esc(sim.fmtPath(p)); }).join('</li><li>') + '</li></ul>Your job is to find where the real path stops.';
      else {
        var live = sim.paths(cid()).filter(function (p) { return S.supply && !sim.firstOpen(p, S); });
        if (live.length) t = 'Current is flowing along: <ul><li>' + live.map(function (p) { return esc(sim.fmtPath(p)); }).join('</li><li>') + '</li></ul>It is drawn in orange with moving dashes. The dashes are a simplified picture, not real electron speed.';
        else {
          var stops = sim.paths(cid()).map(function (p) { return { p: p, fo: S.supply ? sim.firstOpen(p, S) : null }; });
          t = (S.supply ? 'No complete path right now.' : 'Control power is off, so no path can conduct.') + '<ul><li>' + stops.map(function (x) { return esc(sim.fmtPath(x.p)) + (x.fo ? ' — stops at <b>' + esc(sim.DEV[x.fo].label) + '</b>' : ''); }).join('</li><li>') + '</li></ul>';
          var fo = stops[0] && stops[0].fo, part = fo && D().parts.filter(function (q) { return q.el === fo; })[0];
          if (part && !ui.trace) selectPart(part.id, true);
        }
      }
    } else if (kind === 'hint') {
      title = 'Hint';
      var hints = null, st = (!ui.mission && !ui.quiz && !LES().kind) ? STEP() : null;
      if (ui.quiz) t = 'No hints during the mock interview. Give it your best answer; the explanation follows.';
      else if (ui.mission) hints = MHINT[STAGES[ui.mission.stage]];
      else if (st && st.noHint) t = 'This is a no-hint check. Answer from what you know; full feedback follows.';
      else if (st && st.hints) hints = st.hints;
      else if (st && st.kind === 'demo') t = 'Press “Play demonstration” and watch the drawing and the equipment.';
      else t = 'Choose a mission or start the mock interview.';
      if (hints) {
        ui.hint = Math.min(3, ui.hint + 1);
        t = '<ol class="hints">' + hints.slice(0, ui.hint).map(function (h, i) { return '<li><b>' + ['Where to look', 'The principle', 'Worked answer'][i] + ':</b> ' + esc(h) + '</li>'; }).join('') + '</ol>' + (ui.hint < 3 ? '<span class="note">Press again for the next hint level (' + ui.hint + ' of 3 shown).</span>' : '');
      }
    } else if (kind === 'reset') {
      title = 'Reset';
      if (ui.mission) { startMission(ui.mission.id); t = 'Mission restarted from the beginning with its fault in place.'; }
      else if (ui.quiz && ui.quiz.state !== 'results') { ui.quiz.res[ui.quiz.i] = null; quizShow(); t = 'This question has been reset.'; }
      else if (LES().kind) { go(P.lesson); t = 'Reset.'; }
      else { enterStep(); t = 'Exercise reset: the simulation, your answer and the hint level are back to the start.'; }
      out = $('helpOut');
    }
    out.innerHTML = '<div class="helpbox"><h4>' + title + '</h4><div>' + t + '</div></div>';
  }

  /* ------------------------------------------------------------------ overlays */
  function openOverlay(kind, html) {
    overlayKind = kind;
    var ov = $('overlay'); ov.innerHTML = '<div class="ov-card ov-' + kind + '" role="dialog" aria-modal="true" aria-label="' + esc(kind) + '">' + html + '</div>'; ov.hidden = false;
    var f = ov.querySelector('[data-focus]') || ov.querySelector('button'); if (f) f.focus();
  }
  function closeOverlay() { overlayKind = null; $('overlay').hidden = true; $('overlay').innerHTML = ''; }
  function showStart() {
    var cont = P.started ? FS.lesson(P.lesson) : null;
    openOverlay('start',
      '<div class="start-band"><span class="hazard" aria-hidden="true"></span><p class="eyebrow">Supervised interview · training room 1</p><h1>FIRST SHIFT</h1><p class="sub">Maintenance Interview Bootcamp</p></div>' +
      '<div class="start-body"><p>You are a new maintenance candidate arriving for a hands-on interview. Your mentor, Alex, will walk you through the training room: a control panel, a conveyor, a workbench, a pneumatic station and the schematic display.</p>' +
      '<ul class="orient"><li><b>Left</b> is the equipment. <b>Centre</b> is the drawing. <b>Right</b> is Alex. <b>Bottom</b> are the simulation controls, a meter and your progress.</li>' +
      '<li>Each lesson explains one idea, demonstrates it, lets you try it, then asks you to predict what happens next.</li>' +
      '<li>Select a part on the drawing and it highlights on the equipment, and the other way round.</li></ul>' +
      '<p class="fine">This is interview preparation with a simulated 24 VDC circuit. It does not make you electrically qualified, and it is not a substitute for site training or lockout procedures.</p>' +
      '<div class="row"><button class="btn primary big" data-ov="begin" data-focus>' + (cont ? 'Start over from Lesson 1' : 'Start My First Shift') + '</button>' +
      (cont ? '<button class="btn big" data-ov="continue">Continue: Lesson ' + lessonNo(cont.id) + ' · ' + esc(cont.title) + '</button>' : '') + '</div></div>');
  }
  function showOrientation() {
    openOverlay('paths',
      '<h2>How much time do you have?</h2><p>Pick a study path. Alex will take you through the lessons in that order. You can switch at any time from “Study path”.</p>' +
      '<div class="pathpick">' + FS.paths.map(function (p) {
        return '<button class="pathbtn" data-ov="path" data-id="' + p.id + '"><b>' + esc(p.name) + '</b><span>' + esc(p.blurb) + '</span><small>' + p.items.filter(function (i) { return i.l; }).map(function (i) { return i.l === 'review' ? 'Review' : 'L' + lessonNo(i.l); }).join(' → ') + '</small></button>';
      }).join('') + '</div><button class="btn" data-ov="nopath">No path: start at Lesson 1 and go in order</button>');
  }
  function showLessons() {
    var o = '<div class="ov-h"><h2>Lessons</h2><button class="btn small" data-ov="close">Close</button></div><div class="llist">';
    FS.lessons.forEach(function (L, i) {
      var done = P.stepsDone[L.id] || {}, n = Object.keys(done).length, tot = L.steps.length;
      var st = P.done[L.id] ? '✓ complete' : L.kind === 'missions' ? FS.missions.filter(function (m) { return P.missions[m.id] && P.missions[m.id].done; }).length + ' / 8 missions' : L.kind === 'quiz' ? (P.quiz ? 'best ' + P.quiz.best + '%' : 'not taken') : n + ' / ' + tot + ' steps';
      o += '<button class="litem' + (L.id === P.lesson ? ' cur' : '') + '" data-ov="lesson" data-id="' + L.id + '"><span class="ln">' + (i + 1) + '</span><span class="lt">' + esc(L.title) + '<small>' + esc(L.short) + ' · about ' + L.minutes + ' min</small></span><span class="ls">' + st + '</span></button>';
    });
    o += '<button class="litem" data-ov="review"><span class="ln">★</span><span class="lt">Before the Interview<small>15 symbols, the holding circuit, the checklist, five explanations · printable</small></span><span class="ls"></span></button></div>';
    openOverlay('lessons', o);
  }
  function showPaths() {
    var o = '<div class="ov-h"><h2>Study paths</h2><button class="btn small" data-ov="close">Close</button></div><p>Electrical symbols, ladder reading, START/STOP control and troubleshooting come first. Fluid power comes after the electrical essentials.</p>';
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
  function showSettings() {
    var o = '<div class="ov-h"><h2>Settings</h2><button class="btn small" data-ov="close">Close</button></div>' +
      '<label class="set"><input type="checkbox" id="setRm"' + (rm() ? ' checked' : '') + '> <span><b>Reduced motion</b><br>Stops moving dashes, camera glides and conveyor animation. State changes are shown instantly.</span></label>' +
      '<label class="set"><input type="checkbox" id="setSimple"' + (P.simple ? ' checked' : '') + '> <span><b>Simple 2.5D equipment view</b><br>Replaces the 3D room with a flat labelled view. Takes effect after reloading the page. Used automatically if 3D is unavailable.</span></label>' +
      '<div class="lcard"><h4>Keyboard</h4><ul class="keys"><li><kbd>N</kbd> next step · <kbd>P</kbd> previous step · <kbd>H</kbd> hint · <kbd>F</kbd> schematic full screen · <kbd>Esc</kbd> close</li><li><kbd>S</kbd> hold START · <kbd>X</kbd> hold STOP (motor starter drawing)</li><li>Tab to any symbol, test point or part and press <kbd>Enter</kbd> to select it</li><li>With the equipment view focused: arrow keys look around, <kbd>+</kbd> <kbd>−</kbd> zoom</li></ul></div>' +
      '<div class="lcard"><h4>Progress</h4><p>' + (storageOk ? 'Progress is saved in this browser only.' : 'This browser is not allowing local storage, so progress lasts only until the page is closed.') + '</p><div id="resetBox"><button class="btn" data-ov="reset1">Reset all progress…</button></div></div>';
    openOverlay('settings', o);
  }
  function openReview() {
    closeOverlay();
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
      '<li>The control circuit only energizes the coil. Motor current flows through the M1 <b>main contacts</b> in the separate power circuit.</li></ul></div></section>';
    o += '<section><h2>3 · Troubleshooting checklist</h2><ol class="rv-method">' + FS.METHOD.map(function (m) { return '<li><b>' + esc(m[0]) + '.</b> ' + esc(m[1]) + '</li>'; }).join('') + '</ol></section>';
    o += '<section><h2>4 · Five explanations to practice aloud</h2><ol class="rv-aloud">' + FS.aloud.map(function (a) { return '<li><b>' + esc(a[0]) + '.</b> ' + esc(a[1]) + '</li>'; }).join('') + '</ol></section>';
    o += '<section><h2>5 · Say this, and mean it</h2><blockquote>“' + esc(FS.HONEST) + '”</blockquote><ul class="rv-safe">' +
      '<li>Follow site procedures and work within your authorization and training.</li><li>Identify every energy source: electrical, pneumatic, hydraulic, mechanical and stored energy can all be present on one machine.</li>' +
      '<li>A STOP button, an emergency stop or a software command is not energy isolation.</li><li>Never bypass an interlock, overload, guard or other protective function to make a machine run.</li>' +
      '<li>An indicator light or status LED alone does not prove equipment is safe to touch.</li></ul>' +
      '<p class="fine">Practice material only. Completing this application is not an electrical qualification.</p></section></div>';
    var rv = $('review'); rv.innerHTML = o; rv.hidden = false; rv.scrollTop = 0; document.body.classList.add('reviewing');
    markPath('review'); save();
    var pb = $('btnPrint'); if (pb) { pb.onclick = function () { window.print(); }; pb.focus(); } else $('btnRvClose').focus();
    $('btnRvClose').onclick = closeReview;
  }
  function closeReview() { $('review').hidden = true; $('review').innerHTML = ''; document.body.classList.remove('reviewing'); if (!P.started) showStart(); }

  function choosePath(id) {
    P.path = id; P.pathDone[id] = {}; P.started = true; save();
    var first = FS.paths.filter(function (p) { return p.id === id; })[0].items[0].l;
    go(first, 0);
  }

  /* ------------------------------------------------------------------ wiring up */
  function bind() {
    // schematic: pointer-robust selection (survives redraws between press and release)
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
      if (h.tp) { if (!ui.quiz) onTP(h.tp); }
      else if (h.part) onPart(h.part);
      else if (h.comp) { var st = !ui.mission && !ui.quiz ? STEP() : null; if (st && st.kind === 'pick') pickCard(h.comp); else selectComp(h.comp); }
    }
    dg.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, h: hit(e) }; });
    dg.addEventListener('pointerup', function (e) {
      if (!down) return;
      var h = hit(e), d = down; down = null;
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 8 || !h || !d.h) return;
      if (h.tp === d.h.tp && h.part === d.h.part && h.comp === d.h.comp) fire(h);
    });
    dg.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target.closest('[data-tp],[data-part],[data-comp]'); if (!t) return;
      e.preventDefault(); fire(t.dataset.tp ? { tp: t.dataset.tp } : t.dataset.part ? { part: t.dataset.part } : { comp: t.dataset.comp });
    });
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return;
      var id = b.dataset.tab; stopTimers();
      if (id.indexOf('sheet:') === 0) { setSheet(id.slice(6)); }
      else { var keep = FS.diagrams[id].circuit === cid() && ui.center === 'diagram'; if (!keep) { resetSim(); } setDiagram(id); if (ui.selRef) { var p = D().parts.filter(function (q) { return q.ref === ui.selRef; })[0]; ui.selPart = p ? p.id : null; if (!p) clearSel(); } }
      refresh(); drawChips(); drawCompCard(); drawSchemHeader();
    });
    $('chips').addEventListener('click', function (e) { var b = e.target.closest('[data-ref]'); if (b) selectRef(b.dataset.ref); });
    $('stations').addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (b && scene) scene.focus(b.dataset.st); });
    $('mentor').addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
      var a = t.dataset.act;
      if (a === 'demo') playDemo();
      else if (a === 'answer') answer(+t.dataset.i);
      else if (a === 'match') matchAnswer(+t.dataset.i);
      else if (a === 'traceCheck') traceCheck();
      else if (a === 'traceClear') { ui.trace = []; setFb('', ''); drawCenter(); drawTraceList(); }
      else if (a === 'mission') startMission(t.dataset.id);
      else if (a === 'golesson') go(t.dataset.id, 0);
      else if (a === 'review') openReview();
      else if (a.charAt(0) === 'm') missionAct(a, t);
      else if (a.charAt(0) === 'q') quizAct(a, t);
    });
    $('help').addEventListener('click', function (e) { var b = e.target.closest('[data-help]'); if (b) help(b.dataset.help); });
    $('progress').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.step != null) go(P.lesson, +b.dataset.step);
      else if (b.dataset.nav === 'next') stepNext(); else if (b.dataset.nav === 'prev') stepPrev();
    });
    $('btnLessons').onclick = showLessons; $('btnPaths').onclick = showPaths; $('btnReview').onclick = openReview; $('btnSettings').onclick = showSettings;
    $('btnExpand').onclick = toggleExpand;
    $('overlay').addEventListener('click', function (e) {
      if (e.target === $('overlay') && overlayKind !== 'start') return closeOverlay();
      var b = e.target.closest('[data-ov]'); if (!b) return;
      var a = b.dataset.ov;
      if (a === 'close') closeOverlay();
      else if (a === 'begin') { var keep = { rm: P.rm, simple: P.simple }; P = loadDefaults(); P.rm = keep.rm; P.simple = keep.simple; ui.viewed = 0; save(); showOrientation(); }
      else if (a === 'continue') { P.started = true; go(P.lesson); }
      else if (a === 'path') choosePath(b.dataset.id);
      else if (a === 'nopath') { P.path = null; P.started = true; go('L1', 0); }
      else if (a === 'lesson') { P.started = true; go(b.dataset.id); }
      else if (a === 'review') openReview();
      else if (a === 'reset1') $('resetBox').innerHTML = '<p><b>Erase all lesson progress, mission results and scores on this device?</b></p><div class="row"><button class="btn danger" data-ov="reset2">Yes, erase</button><button class="btn" data-ov="close">Cancel</button></div>';
      else if (a === 'reset2') { var k = { rm: P.rm, simple: P.simple }; P = loadDefaults(); P.rm = k.rm; P.simple = k.simple; ui.viewed = 0; save(); go('L1', 0); showStart(); }
    });
    $('overlay').addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'setRm') { P.rm = t.checked; save(); if (scene) scene.setRM(rm()); document.body.classList.toggle('rm', rm()); refresh(); }
      else if (t.id === 'setSimple') { P.simple = t.checked; save(); }
      else if (t.dataset.pd) { var q = t.dataset.pd.split(':'); (P.pathDone[q[0]] = P.pathDone[q[0]] || {})[q[1]] = t.checked; save(); }
    });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === 'Escape') { if (!$('review').hidden) closeReview(); else if (overlayKind && overlayKind !== 'start') closeOverlay(); else if ($('app').classList.contains('expanded')) toggleExpand(); return; }
      if (overlayKind || !$('review').hidden || tag === 'input' || tag === 'textarea' || tag === 'select' || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (ui.center === 'diagram' && cid() === 'starter' && !ui.quiz && (k === 's' || k === 'x')) { if (!e.repeat) { var key = k === 's' ? 'pb.PB2' : 'pb.PB1'; if (!sim.getPath(S, key)) setKey(key, true); } e.preventDefault(); return; }
      if (tag === 'button' && (e.key === ' ' || e.key === 'Enter')) return;
      if (k === 'n') stepNext(); else if (k === 'p') stepPrev(); else if (k === 'h') help('hint'); else if (k === 'f') toggleExpand();
    });
    document.addEventListener('keyup', function (e) {
      var k = e.key.toLowerCase();
      if ((k === 's' || k === 'x') && ui.center === 'diagram' && cid() === 'starter') { var key = k === 's' ? 'pb.PB2' : 'pb.PB1'; if (sim.getPath(S, key)) setKey(key, false); }
    });
    bindControls(); bindMeter();
  }
  function loadDefaults() { return { started: false, lesson: 'L1', step: {}, stepsDone: {}, done: {}, missions: {}, quiz: null, path: null, pathDone: {}, rm: null, simple: false, viewed: [] }; }
  function toggleExpand() {
    var on = $('app').classList.toggle('expanded');
    $('btnExpand').textContent = on ? 'Exit full screen' : 'Full screen';
    $('btnExpand').setAttribute('aria-pressed', on);
    if (scene && scene.resize) setTimeout(scene.resize, 50);
  }

  function init() {
    var style = document.createElement('style'); style.id = 'schemCss'; style.textContent = FS.schem.CSS; document.head.appendChild(style);
    document.body.classList.toggle('rm', rm());
    $('stations').innerHTML = STATIONS.map(function (s) { return '<button class="stbtn" data-st="' + s[0] + '">' + s[1] + '</button>'; }).join('');
    var host = $('view3d'), ok = false;
    if (!P.simple && FS.scene3d) { try { ok = FS.scene3d.init(host); } catch (e) { ok = false; } if (ok) scene = FS.scene3d; }
    if (!ok) { host.innerHTML = ''; FS.scene2d.init(host); scene = FS.scene2d; $('stations').hidden = true; $('viewNote').textContent = 'Simple 2.5D view. Click a tag to select a part.'; }
    scene.setRM(rm());
    scene.onPick(function (h) {
      if (h.bench != null) { var st = !ui.mission && !ui.quiz && !LES().kind ? STEP() : null; if (st && st.kind === 'match') matchAnswer(h.bench); return; }
      selectRef(h.ref);
    });
    bind();
    if (!FS.lesson(P.lesson)) P.lesson = 'L1';
    go(P.lesson);
    showStart();
    FS.app = { state: function () { return S; }, ui: ui, progress: function () { return P; }, go: go, refresh: refresh, selectPart: selectPart, selectRef: selectRef, setKey: setKey, startMission: startMission, is3d: ok };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
