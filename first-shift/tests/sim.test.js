/* FIRST SHIFT — validation of circuit rules and content consistency.
 * Run with:  node tests/sim.test.js   (no dependencies) */
'use strict';
var assert = require('assert');
var path = require('path');
var base = path.join(__dirname, '..', 'js');
['sim.js', 'symbols.js', 'diagrams.js', 'schematic.js', 'data/components.js', 'panel.js', 'drawings.js', 'data/lessons.js', 'data/assess.js', 'data/scenarios.js', 'data/quiz.js']
  .forEach(function (f) { require(path.join(base, f)); });
var FS = globalThis.FS, sim = FS.sim;
var passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { console.error('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}
function fresh(p) { var s = sim.defaultState(); sim.patch(s, p); return s; }
function applyPreset(cid, s, p) {
  p = p || {};
  var q = {}; Object.keys(p).forEach(function (k) { if (k !== 'run') q[k] = p[k]; });
  sim.patch(s, q); sim.settle(cid, s);
  if (p.run) sim.run(cid, s, [{ 'pb.PB2': true }, { 'pb.PB2': false }]);
  return s;
}

console.log('Required behaviors');
test('1. START energizes a healthy starter circuit', function () {
  var s = fresh(); var r = sim.run('starter', s, [{ 'pb.PB2': true }]);
  assert(s.relay.M1 && r.el.M1.on && r.el['M1-AUX'].closed);
});
test('2. Releasing START leaves the healthy circuit energized', function () {
  var s = fresh(); var r = sim.run('starter', s, [{ 'pb.PB2': true }, { 'pb.PB2': false }]);
  assert(s.relay.M1 && r.el['M1-AUX'].flow && !r.el.PB2.flow);
});
test('3. STOP de-energizes the coil, and releasing STOP does not restart', function () {
  var s = fresh(); sim.run('starter', s, [{ 'pb.PB2': true }, { 'pb.PB2': false }, { 'pb.PB1': true }]);
  assert(!s.relay.M1);
  sim.run('starter', s, [{ 'pb.PB1': false }]); assert(!s.relay.M1);
});
test('4. Overload trip stops the motor', function () {
  var s = fresh(); sim.run('starter', s, [{ 'pb.PB2': true }, { 'pb.PB2': false }, { olTripped: true }]);
  assert(!s.relay.M1);
});
test('5. Overload reset alone does not restart it', function () {
  var s = fresh(); sim.run('starter', s, [{ 'pb.PB2': true }, { 'pb.PB2': false }, { olTripped: true }, { olTripped: false }]);
  assert(!s.relay.M1);
  sim.run('starter', s, [{ 'pb.PB2': true }, { 'pb.PB2': false }]); assert(s.relay.M1, 'restarts with START');
});
test('6. Control power restoration alone does not restart it', function () {
  var s = fresh(); sim.run('starter', s, [{ 'pb.PB2': true }, { 'pb.PB2': false }, { supply: false }]);
  assert(!s.relay.M1);
  sim.run('starter', s, [{ supply: true }]); assert(!s.relay.M1);
});
test('7. An open holding branch makes the motor stop when START is released', function () {
  var s = fresh({ 'faults.holdOpen': true }); sim.run('starter', s, [{ 'pb.PB2': true }]);
  assert(s.relay.M1, 'runs while held');
  sim.run('starter', s, [{ 'pb.PB2': false }]); assert(!s.relay.M1, 'drops on release');
});
test('8. An open coil prevents contactor operation', function () {
  var s = fresh({ 'faults.coilOpen': true }); sim.run('starter', s, [{ 'pb.PB2': true }]);
  assert(!s.relay.M1);
  assert.strictEqual(sim.meter('starter', s, 'V', '3', '0V').value, 24, 'voltage still arrives at the coil');
});
test('10. Reset returns a clean state', function () {
  var s = fresh({ 'faults.coilOpen': true, olTripped: true, 'sw.S1': true, supply: false });
  s = sim.defaultState();
  assert.deepStrictEqual(s, sim.defaultState());
  assert(!s.faults.coilOpen && !s.olTripped && s.supply && !s.zeroVerified);
});

console.log('Other circuits');
test('Lamp: closed path lights, any gap does not', function () {
  var s = fresh({ 'sw.S1': true }); assert(sim.settle('lamp', s).el.PL1.on);
  ['fuseIn:false', 'faults.fuseOpen:true', 'faults.wireOpen:true', 'sw.S1:false', 'supply:false'].forEach(function (kv) {
    var k = kv.split(':'), t = fresh({ 'sw.S1': true }); sim.setPath(t, k[0], k[1] === 'true');
    assert(!sim.settle('lamp', t).el.PL1.on, kv);
  });
});
test('Ladder: series is AND, parallel is OR, relay contact follows coil', function () {
  assert(!sim.settle('ladB', fresh({ 'sw.S1': true })).el.PL1.on);
  assert(sim.settle('ladB', fresh({ 'sw.S1': true, 'sw.S2': true })).el.PL1.on);
  assert(sim.settle('ladC', fresh({ 'sw.S2': true })).el.PL1.on);
  assert(!sim.settle('ladC', fresh()).el.PL1.on);
  var s = fresh({ 'sw.S1': true }); var r = sim.settle('ladD', s);
  assert(s.relay.CR1 && r.el.PL1.on);
});
test('PLC chain: box → I0 → Q0 → CR2 → PL2, and misalignment breaks it at the sensor', function () {
  var s = fresh({ box: true }); var r = sim.settle('plc', s);
  assert(s.plc.I0 && s.plc.Q0 && s.relay.CR2 && r.el.PL2.on);
  s = fresh({ box: true, 'faults.misaligned': true }); r = sim.settle('plc', s);
  assert(!s.plc.I0 && !s.plc.Q0 && !r.el.PL2.on);
});
test('Pneumatics: cylinder needs solenoid AND air; no air means no movement', function () {
  var s = fresh({ 'sw.SS2': true }); var r = sim.settle('pneu', s);
  for (var i = 0; i < 40; i++) sim.tickCylinder(s, r.el.SOL1.on, 0.1);
  assert.strictEqual(s.cyl, 1);
  s = fresh({ 'sw.SS2': true, 'faults.airOff': true }); r = sim.settle('pneu', s);
  for (i = 0; i < 40; i++) sim.tickCylinder(s, r.el.SOL1.on, 0.1);
  assert.strictEqual(s.cyl, 0); assert(r.el.SOL1.on, 'solenoid still energized');
});

console.log('Virtual meter');
test('Voltage follows the circuit state and the two probe points', function () {
  var s = fresh(); sim.settle('starter', s);
  assert.strictEqual(sim.meter('starter', s, 'V', '2', '0V').value, 24);
  assert.strictEqual(sim.meter('starter', s, 'V', '3', '0V').value, 0);
  assert.strictEqual(sim.meter('starter', s, 'V', '2', '3').value, 24, 'full voltage across the open START');
  assert.strictEqual(sim.meter('starter', s, 'V', '0V', 'L+').value, -24, 'reversed probes read negative');
});
test('Continuity is blocked until isolated AND absence of voltage is verified', function () {
  var s = fresh(); sim.settle('starter', s);
  assert(sim.meter('starter', s, 'R', 'L+', '1').blocked, 'blocked when energized');
  sim.run('starter', s, [{ supply: false }]);
  assert(sim.meter('starter', s, 'R', 'L+', '1').blocked, 'blocked until verified');
  sim.meter('starter', s, 'V', 'L+', '0V');
  var m = sim.meter('starter', s, 'R', 'L+', '1'); assert(m.ok && m.value < 1);
  assert.strictEqual(sim.meter('starter', s, 'R', '2', '3').value, Infinity, 'open START reads OL');
  sim.run('starter', s, [{ supply: true }]);
  assert(sim.meter('starter', s, 'R', 'L+', '1').blocked, 'blocked again after re-energizing');
});

console.log('Content consistency (quiz and lesson feedback must match the circuit rules)');
FS.lessons.forEach(function (L) {
  L.steps.forEach(function (st, i) {
    if (st.kind === 'ask') test(L.id + ' step ' + (i + 1) + ': one correct choice, feedback on every choice' + (st.verify ? ', verified by simulation' : ''), function () {
      assert.strictEqual(st.choices.filter(function (c) { return c.ok; }).length, 1);
      st.choices.forEach(function (c) { assert(c.fb, 'missing feedback'); });
      if (st.verify) {
        var cid = FS.diagrams[st.diagram].circuit, s = applyPreset(cid, fresh(), st.preset);
        var r = sim.run(cid, s, st.run);
        assert(st.verify(s, r), 'simulation disagrees with the stated answer');
      }
    });
    if (st.kind !== 'ask') test(L.id + ' step ' + (i + 1) + ': has three hint levels or is a no-hint check', function () {
      assert(st.noHint || st.kind === 'demo' || (st.hints && st.hints.length === 3));
    });
    if (st.kind === 'trace') test(L.id + ' step ' + (i + 1) + ': a conducting path exists to trace', function () {
      var cid = FS.diagrams[st.diagram].circuit, s = applyPreset(cid, fresh(), st.preset);
      assert(sim.paths(cid).some(function (p) { return !sim.firstOpen(p, s) && (!st.need || p.indexOf(st.need) >= 0); }));
    });
    if (st.kind === 'pick') test(L.id + ' step ' + (i + 1) + ': pick target exists in its pool', function () {
      assert(FS.comp(st.target) && st.pool.indexOf(st.target) >= 0);
      st.pool.forEach(function (id) { assert(FS.comp(id), 'unknown component ' + id); });
    });
  });
});
FS.quiz.forEach(function (q) {
  test('Quiz ' + q.id + ' is well formed' + (q.verify ? ' and verified by simulation' : ''), function () {
    assert(FS.quizCats[q.cat]);
    if (q.type === 'choice') assert.strictEqual(q.choices.filter(function (c) { return c.ok; }).length, 1);
    if (q.type === 'aloud') assert(q.model);
    if (q.type === 'pick') q.parts.forEach(function (id) { assert(FS.diagrams[q.diagram].parts.some(function (p) { return p.id === id; }), id); });
    if (q.verify) {
      var cid = FS.diagrams[q.diagram].circuit, s = applyPreset(cid, fresh(), q.preset);
      sim.run(cid, s, q.run); assert(q.verify(s), 'simulation disagrees with the stated answer');
    }
  });
});
test('Quiz has 20 questions: 8 symbol, 4 circuit, 4 troubleshooting, 2 diagram, 2 safety', function () {
  var n = {}; FS.quiz.forEach(function (q) { n[q.cat] = (n[q.cat] || 0) + 1; });
  assert.deepStrictEqual(n, { symbol: 8, circuit: 4, trouble: 4, diagram: 2, safety: 2 });
});
console.log('Missions: one validated fault each, evidence derived from the model');
FS.missions.forEach(function (m) {
  test('Mission ' + m.id + ' (' + m.cause + '): evidence separates every listed cause; no diagnosis without evidence', function () {
    var good = m.checks.filter(function (c) { return !FS.CHK[c].bad; });
    assert(m.causes.indexOf(m.cause) >= 0 && m.causes.length >= 3);
    m.causes.forEach(function (c) { assert(FS.CAUSES[c] && FS.CAUSES[c].t, c); });
    good.forEach(function (c) { var r = FS.mread(m, c); assert(typeof r.text === 'string' && r.cat !== 'na' && !/undefined|NaN/.test(r.text), c); assert(FS.CHK[c].opts.some(function (o) { return o[0] === r.cat; }), c + ' category ' + r.cat + ' has a label'); });
    m.checks.filter(function (c) { return FS.CHK[c].bad; }).forEach(function (c) { assert(!FS.CHK[c].read, 'unsafe or guessing actions give no evidence'); });
    var none = FS.mruled(m, []); assert(Object.keys(none).every(function (k) { return !none[k]; }), 'nothing is ruled out before any check');
    var all = FS.mruled(m, good); assert(Object.keys(all).every(function (k) { return all[k]; }), 'the available checks can rule out every other cause');
    good.forEach(function (c) { assert.notStrictEqual(FS.mverdict(m, c, m.cause), 'weakens', 'no check contradicts the true cause'); });
    ['safe', 'expected', 'section'].forEach(function (k) { assert.strictEqual(m[k].choices.filter(function (c) { return c.ok; }).length, 1, k); });
    assert(m.why && m.repair && FS.diagrams[m.diagram].circuit);
  });
});
test('Five "motor will not start" cases share one symptom and cover supply, STOP, overload, START and coil', function () {
  var fam = FS.missions.filter(function (m) { return m.fam === 'nostart'; });
  assert.deepStrictEqual(fam.map(function (m) { return m.cause; }).sort(), ['coilOpen', 'noSupply', 'olTrip', 'startOpen', 'stopOpen']);
  fam.forEach(function (m) {
    assert.strictEqual(m.symptom, fam[0].symptom);
    assert.strictEqual(FS.mread(m, 'm_obs').cat, 'out', m.id + ' does not start');
  });
  var healthy = sim.defaultState(); sim.run('starter', healthy, [{ 'pb.PB2': true }]); assert(healthy.relay.M1, 'a healthy circuit does start');
});
test('Support / weaken verdicts follow the model', function () {
  var m = FS.mission('M3');   // STOP path open
  assert.strictEqual(FS.mverdict(m, 'm_v1', 'stopOpen'), 'supports');
  assert.strictEqual(FS.mverdict(m, 'm_v1', 'coilOpen'), 'weakens');
  assert.strictEqual(FS.mverdict(m, 'm_obs', 'stopOpen'), 'neutral', 'every cause gives "does not pull in"');
  assert.strictEqual(FS.mruled(m, ['m_vL']).noSupply, true);
  assert.strictEqual(FS.mruled(m, ['m_vL']).coilOpen, false);
});

console.log('Model accuracy');
test('A floating point is reported as not modeled, never as an invented number', function () {
  var s = fresh({ 'pb.PB1': true }); sim.settle('starter', s);
  var r = sim.meter('starter', s, 'V', '1', '0V'); assert(r.na && r.text === 'Not modeled' && r.value === undefined);
  s = fresh({ fuseIn: false }); sim.settle('lamp', s); assert(sim.meter('lamp', s, 'V', '1', '0V').na);
});
test('Potential, current and device state are separate facts', function () {
  var s = fresh(), r = sim.settle('starter', s);
  assert(Math.abs(r.V['2'] - 24) < 0.01 && r.tied['2'], 'wire 2 is at supply potential with the motor stopped');
  assert(!r.el.PB1.flow && !r.el.M1.flow, 'but no current flows anywhere in the rung');
  assert(r.el.PB1.closed && !r.el.PB2.closed, 'and device states are known independently');
  s = fresh({ 'faults.coilOpen': true, 'pb.PB2': true }); r = sim.settle('starter', s);
  assert(Math.abs(r.V['3'] - 24) < 0.01 && !r.el.M1.on && !s.relay.M1, 'potential at the coil terminal alone does not operate it');
});
test('Missing control supply: nothing energizes and L+ reads 0 V', function () {
  var s = fresh({ 'faults.noSupply': true, 'pb.PB2': true }); sim.settle('starter', s);
  assert(!s.relay.M1); assert.strictEqual(sim.meter('starter', s, 'V', 'L+', '0V').value, 0);
});
test('Continuity warns when more than one conducting route joins the probes', function () {
  var s = fresh({ 'sw.S1': true, 'sw.S2': true }); sim.run('ladC', s, [{ supply: false }]); sim.meter('ladC', s, 'V', 'L+', '0V');
  assert(/More than one conducting route/.test(sim.meter('ladC', s, 'R', 'L+', '1').note));
  s = fresh({ 'sw.S1': true }); sim.run('ladC', s, [{ supply: false }]); sim.meter('ladC', s, 'V', 'L+', '0V');
  assert(!/More than one/.test(sim.meter('ladC', s, 'R', 'L+', '1').note));
});

console.log('Drawing set, panel and assessment data');
test('Wiring dataset is consistent between the panel view, sheet 4 and the tasks', function () {
  var PN = FS.panel;
  Object.keys(PN.WIRES).forEach(function (w) { assert(PN.WIRES[w].length >= 2, 'wire ' + w); PN.WIRES[w].forEach(function (t) { assert(PN.T[t], t + ' has a position'); assert.strictEqual(PN.wireOf(t), w); }); });
  PN.TB.forEach(function (t) { if (t.field) assert(PN.T[t.field], t.field); });
  assert.deepStrictEqual(PN.WIRES['2'].slice().sort(), ['M1:13', 'OL1:96', 'TB1:3'], 'wire 2 matches the control schematic');
  assert.deepStrictEqual(PN.WIRES['3'].slice().sort(), ['M1:14', 'M1:A1', 'TB1:4']);
  PN.tasks.forEach(function (t) {
    t.ok.forEach(function (k) { var id = k.replace(/:$/, ''); assert(PN.DEV[id] || PN.T[id], t.id + ' target ' + k); });
    assert(FS.diagrams[t.show[0]] && (!t.show[1] || FS.diagrams[t.show[0]].parts.some(function (p) { return p.id === t.show[1]; })), t.id + ' drawing reference');
    assert(PN.accepts(t, t.ok[0].replace(/:$/, '')), t.id + ' accepts its own answer');
    assert(!PN.accepts(t, 'CR2:A2'), t.id + ' rejects an unrelated terminal');
  });
  assert(!/NaN|undefined/.test(PN.render({ wire: '0V', hide: true, names: true })));
});
test('Baseline has six questions, each with one right answer; every concept has different-example retests', function () {
  assert.strictEqual(FS.baseline.length, 6);
  FS.baseline.forEach(function (q) { assert.strictEqual(q.choices.filter(function (c) { return c.ok; }).length, 1); assert(FS.concepts[q.concept] && FS.lesson(q.lesson)); });
  Object.keys(FS.concepts).forEach(function (c) {
    assert(FS.retests[c].length >= 2, c); FS.retests[c].forEach(function (q) { assert.strictEqual(q.choices.filter(function (x) { return x.ok; }).length, 1); assert(q.explain); });
    assert(FS.lesson(FS.concepts[c].lesson));
  });
  FS.quiz.forEach(function (q) { assert(FS.concepts[FS.quizConcept[q.id]], q.id); });
  assert.strictEqual(FS.caps.length, 8); FS.caps.forEach(function (c) { assert(FS.lesson(c[2])); });
});
test('Lesson order puts the electrical core first and fluid power last', function () {
  assert.deepStrictEqual(FS.lessons.map(function (l) { return l.id; }), ['L1', 'L2', 'L3', 'L4', 'L5', 'LD', 'LP', 'L6', 'L8', 'L9', 'L7']);
  FS.paths.forEach(function (p) { p.items.forEach(function (it) { if (it.l && it.l !== 'review') assert(FS.lesson(it.l), it.l); }); });
  FS.lessons.forEach(function (L) { L.steps.forEach(function (st) { if (st.kind === 'find') st.parts.forEach(function (id) { assert(FS.diagrams[st.diagram].parts.some(function (p) { return p.id === id; }), L.id + ' ' + id); }); }); });
});
test('Every component has all eight teaching fields, and every diagram part maps to one', function () {
  FS.components.forEach(function (c) {
    ['name', 'sym', 'purpose', 'looks', 'normal', 'where', 'myth', 'q', 'a', 'shape'].forEach(function (k) { assert(c[k], c.id + ' missing ' + k); });
    assert(FS.sym.has(c.sym), c.id + ' symbol');
  });
  assert.strictEqual(FS.components.filter(function (c) { return c.group === 'core'; }).length, 28);
  Object.keys(FS.diagrams).forEach(function (id) {
    FS.diagrams[id].parts.forEach(function (p) { assert(FS.comp(p.comp), id + '/' + p.id + ' → ' + p.comp); });
    assert(FS.diagrams[id].legend.length, id + ' has a legend');
  });
  FS.essentials.forEach(function (id) { assert(FS.comp(id)); });
  assert.strictEqual(FS.essentials.length, 15);
});
test('Every diagram renders without bad numbers', function () {
  Object.keys(FS.diagrams).forEach(function (id) {
    var d = FS.diagrams[id], s = fresh(), r = sim.settle(d.circuit, s);
    var svg = FS.schem.render(d, { S: s, res: r, flags: { bar: 6 }, reveal: true });
    assert(!/NaN|undefined/.test(svg), id);
  });
});

console.log('\n' + passed + ' checks passed' + (process.exitCode ? ', with failures' : ''));
