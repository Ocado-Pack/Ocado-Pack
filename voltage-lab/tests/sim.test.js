import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/sim.js';

function ready(sim, { dial = 'VDC', range = 'AUTO', points = [] } = {}) {
  ['meter', 'red', 'black'].forEach((i) => sim.inspect(i));
  sim.plug('black', 'COM');
  sim.plug('red', 'V');
  sim.setDial(dial);
  sim.setRange(range);
  ['jacks', 'func', 'range', 'guards', 'bridge'].forEach((i) => assert.equal(sim.confirm(i).ok, true));
  sim.setIntended(points);
}
function measure(sim, red, black) {
  sim.setIntended([red, black]);
  assert.equal(sim.touch('black', black).ok, true);
  assert.equal(sim.touch('red', red).ok, true);
  sim.settle();
  return sim.displayText();
}
const text = (sim) => sim.displayText();

test('AA battery: red − black, reversed, same node, open probe', () => {
  const sim = new Sim();
  ready(sim);
  assert.equal(measure(sim, 'aa+', 'aa-'), '1.580 V');
  assert.equal(sim.settled, true);
  sim.lift('red'); sim.lift('black');
  assert.equal(measure(sim, 'aa-', 'aa+'), '−1.580 V');
  sim.lift('red'); sim.lift('black');
  assert.equal(measure(sim, 'aa+', 'aa+'), '0.000 V');
  assert.equal(sim.reading().sameNode, true);
  sim.lift('black');
  sim.settle();
  const r = sim.reading();
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'open');
  assert.equal(sim.settled, false);
});

test('floating input drifts instead of sitting at exactly zero', () => {
  const sim = new Sim();
  ready(sim);
  const seen = new Set();
  for (let i = 0; i < 100; i++) { sim.tick(0.1); seen.add(text(sim)); }
  assert.ok(seen.size > 2, 'expected several different floating values');
});

test('9 V lamp circuit follows switch position', () => {
  const sim = new Sim();
  ready(sim);
  sim.toggleSwitch('lamp9', true);
  assert.equal(sim.lampOn('lamp9'), true);
  assert.equal(measure(sim, 'tp1', 'tp6'), '9.00 V');
  sim.lift('red'); sim.lift('black');
  assert.equal(measure(sim, 'tp4', 'tp5'), '9.00 V');
  sim.lift('red'); sim.lift('black');
  assert.equal(measure(sim, 'tp2', 'tp3'), '0.000 V');
  sim.toggleSwitch('lamp9', false);
  sim.settle();
  assert.equal(text(sim), '9.00 V');
  assert.equal(sim.lampOn('lamp9'), false);
  sim.lift('red'); sim.lift('black');
  assert.equal(measure(sim, 'tp4', 'tp5'), '0.000 V');
  sim.lift('red'); sim.lift('black');
  assert.equal(measure(sim, 'tp1', 'tp6'), '9.00 V');
});

test('24 V panel: healthy and open-wire fault', () => {
  const sim = new Sim();
  ready(sim);
  sim.toggleSwitch('panel24', true);
  const m = (a, b) => { sim.lift('red'); sim.lift('black'); return measure(sim, a, b); };
  assert.equal(m('x1', 'x2'), '24.0 V');
  assert.equal(m('x4', 'x2'), '24.0 V');
  assert.equal(m('x5', 'x6'), '24.0 V');
  assert.equal(sim.lampOn('panel24'), true);
  sim.lift('red'); sim.lift('black');
  sim.setup({ faults: { w2open: true } });
  assert.equal(sim.lampOn('panel24'), false);
  assert.equal(m('x1', 'x2'), '24.0 V');
  assert.equal(m('x4', 'x2'), '24.0 V');
  assert.equal(m('x5', 'x6'), '0.000 V');
  assert.equal(m('x5', 'x2'), '0.000 V');
  assert.equal(m('x4', 'x5'), '24.0 V');
});

test('manual ranges: overrange and resolution', () => {
  const sim = new Sim();
  ready(sim, { range: 20 });
  assert.equal(measure(sim, 'b9+', 'b9-'), '9.36 V');
  const codes = [];
  sim.on((e) => e.type === 'detect' && codes.push(e.code));
  sim.setRange(2); sim.settle();
  assert.equal(text(sim), 'OL V');
  assert.ok(codes.includes('range_low'));
  sim.setRange(200); sim.settle();
  assert.equal(text(sim), '9.4 V');
  sim.setRange('AUTO'); sim.settle();
  assert.equal(text(sim), '9.36 V');
});

test('AC source: RMS in V~, mismatch flagged in V⎓', () => {
  const sim = new Sim();
  ready(sim, { dial: 'VAC' });
  assert.equal(measure(sim, 'ac1', 'ac2'), '12.00 V');
  sim.lift('red'); sim.lift('black');
  assert.equal(measure(sim, 'ac2', 'ac1'), '12.00 V');
  sim.lift('red'); sim.lift('black');
  sim.setDial('VDC'); sim.confirm('func');
  const codes = [];
  sim.on((e) => e.type === 'detect' && codes.push(e.code));
  measure(sim, 'ac1', 'ac2');
  assert.equal(sim.reading().mismatch, true);
  assert.ok(codes.includes('mode_mismatch'));
});

test('safety blocks', () => {
  const sim = new Sim();
  ['meter', 'red', 'black'].forEach((i) => sim.inspect(i));
  sim.plug('black', 'COM');
  sim.plug('red', 'A');
  sim.setDial('VDC');
  assert.equal(sim.confirm('jacks').code, 'unsafe_jack');
  sim.setIntended(['aa+', 'aa-']);
  assert.equal(sim.touch('red', 'aa+').code, 'unsafe_jack');
  sim.plug('red', 'V');
  assert.equal(sim.touch('red', 'aa+').code, 'precheck');
  ['jacks', 'func', 'range', 'guards', 'bridge'].forEach((i) => sim.confirm(i));
  assert.equal(sim.touch('red', 'b9x').code, 'bridge');
  assert.equal(sim.touch('red', 'tp1').code, 'unplanned_point');
  assert.equal(sim.touch('red', 'aa+').ok, true);
  assert.equal(sim.setDial('VAC').code, 'change_connected');
  assert.equal(sim.plug('red', 'COM').code, 'change_connected');
  sim.lift('red');
  sim.setDial('OHM');
  assert.equal(sim.confirm('func').code, 'func_not_voltage');
  sim.state.checklist.func = true;
  assert.equal(sim.touch('red', 'aa+').code, 'func_block');
  assert.equal(sim.grip('red', 'tip').code, 'tip_grip');
});

test('damaged lead must be replaced before the check passes', () => {
  const sim = new Sim();
  sim.setup({ damaged: { red: true } });
  ['meter', 'red', 'black'].forEach((i) => sim.inspect(i));
  assert.equal(sim.checkItem('inspect'), false);
  sim.replaceLead('red');
  assert.equal(sim.checkItem('inspect'), true);
});

test('HOLD freezes the reading and is detected as stale', () => {
  const sim = new Sim();
  ready(sim);
  measure(sim, 'aa+', 'aa-');
  sim.toggleHold();
  sim.lift('red'); sim.lift('black');
  sim.settle();
  assert.equal(text(sim), '1.580 V');
  assert.equal(sim.display.hold, true);
  assert.equal(sim.holdStale(), true);
  sim.toggleHold();
  sim.settle(0.5);
  assert.notEqual(text(sim), '1.580 V');
});

test('leads swapped at the meter invert the sign', () => {
  const sim = new Sim();
  ['meter', 'red', 'black'].forEach((i) => sim.inspect(i));
  sim.plug('black', 'V'); sim.plug('red', 'COM'); sim.setDial('VDC');
  assert.equal(sim.confirm('jacks').code, 'swapped_jacks');
  sim.state.checklist = { jacks: true, func: true, range: true, guards: true, bridge: true };
  assert.equal(measure(sim, 'aa+', 'aa-'), '−1.580 V');
  assert.equal(sim.reading().swapped, true);
});
