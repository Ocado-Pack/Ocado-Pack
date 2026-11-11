/* FIRST SHIFT — validation of circuit rules and content consistency.
 * Run with:  node tests/sim.test.js   (no dependencies) */
'use strict';
var assert = require('assert');
var path = require('path');
var base = path.join(__dirname, '..', 'js');
['sim.js', 'symbols.js', 'diagrams.js', 'schematic.js', 'data/components.js', 'data/lessons.js', 'data/scenarios.js', 'data/quiz.js']
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
FS.missions.forEach(function (m) {
  test('Mission ' + m.id + ': symptom reproduces, evidence comes from the model, one supported diagnosis', function () {
    var cid = FS.diagrams[m.diagram].circuit, s = fresh(m.preset);
    Object.keys(m.faults).forEach(function (k) { s.faults[k] = m.faults[k]; });
    sim.settle(cid, s);
    m.checks.forEach(function (c) {
      if (c.type === 'bad') assert(c.fb && !c.ev, 'bad checks explain themselves and give no evidence');
      else assert(typeof c.ev(s) === 'string' && !/undefined|NaN/.test(c.ev(s)));
    });
    assert(m.checks.filter(function (c) { return c.type === 'key'; }).length >= 2);
    ['safe', 'expected', 'section', 'interpret', 'diagnose'].forEach(function (k) {
      assert.strictEqual(m[k].choices.filter(function (c) { return c.ok; }).length, 1, k);
    });
    assert(m.others.length >= 3 && m.repair && m.why);
  });
});
test('Mission evidence matches the fault (spot checks)', function () {
  function ev(id, cid) { var m = FS.mission(id), s = fresh(m.preset); Object.keys(m.faults).forEach(function (k) { s.faults[k] = true; }); sim.settle(FS.diagrams[m.diagram].circuit, s); return m.checks.find(function (c) { return c.id === cid; }).ev(s); }
  assert(/^0\.0 V/.test(ev('M1', 'b')) && /OL/.test(ev('M1', 'd')));
  assert(/^24\.0 V/.test(ev('M2', 'c')) && /^0\.0 V/.test(ev('M2', 'd')));
  assert(/^0\.0 V/.test(ev('M3', 'b')) && /OL/.test(ev('M3', 'd')));
  assert(/^24\.0 V/.test(ev('M4', 'a')) && /^0\.0 V/.test(ev('M4', 'b')) && /TRIPPED/.test(ev('M4', 'c')));
  assert(/pulls in.*drops out/.test(ev('M5', 'a')) && /^24\.0 V/.test(ev('M5', 'b')));
  assert(/^24\.0 V/.test(ev('M6', 'c')) && /OL/.test(ev('M6', 'd')));
  assert(/LED is off/.test(ev('M7', 'b')) && /^0\.0 V/.test(ev('M7', 'd')));
  assert(/indicator is on/.test(ev('M8', 'a')) && /0 bar/.test(ev('M8', 'c')));
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
