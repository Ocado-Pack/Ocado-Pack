import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, precheck, runTests, createRuntime, cloneDesign, canPlace, fitting, replay, CHECKS, SCENARIOS_V } from '../src/ctl.js';

const codes = (d, ex) => precheck(d, ex).map((i) => i.code);
const allPass = (d, ex) => runTests(d, ex).every((r) => r.pass);

for (const ex of Object.values(EXERCISES)) {
  test(`exercise ${ex.id}: worked solution passes the checks and every behavior test`, () => {
    assert.deepEqual(codes(ex.solution, ex), []);
    assert.ok(allPass(ex.solution, ex), JSON.stringify(runTests(ex.solution, ex).filter((r) => !r.pass)));
    ex.solution.comps.forEach((c) => assert.ok(canPlace(ex.solution, c), c.id));
  });
}

test('series and parallel are told apart by behavior, not by layout', () => {
  // series wiring offered for exercise C (OR) fails the behavior tests
  assert.ok(!allPass(EXERCISES.B.solution, EXERCISES.C));
  assert.ok(!allPass(EXERCISES.C.solution, EXERCISES.B));
  // a different but equivalent layout for B: lamp first, switches after it
  const d = { ex: 'B', comps: [{ id: 'H1', kind: 'lamp', x: 1, y: 2, rot: 0 }, { id: 'SB', kind: 'sw', x: 5, y: 2, rot: 0 }, { id: 'SA', kind: 'sw', x: 9, y: 2, rot: 0 }],
    wires: [['L@4', 'H1.a'], ['H1.b', 'SB.a'], ['SB.b', 'SA.a'], ['SA.b', 'N@0']] };
  assert.deepEqual(codes(d, EXERCISES.B), []);
  assert.ok(allPass(d, EXERCISES.B));
});

test('starter: equivalent arrangements are accepted', () => {
  const ex = EXERCISES.D;
  // overload contact on the 0 V side of the coil, STOP after the START branch
  const d = { ex: 'D', comps: [{ id: 'START', kind: 'pb_no', x: 1, y: 1, rot: 0 }, { id: 'KA', kind: 'k_no', x: 1, y: 3, rot: 0, ref: 'K1' }, { id: 'STOP', kind: 'pb_nc', x: 4, y: 1, rot: 0 },
    { id: 'K1', kind: 'coil', x: 7, y: 1, rot: 0 }, { id: 'F1', kind: 'ol_nc', x: 10, y: 1, rot: 0 }],
    wires: [['L@1', 'START.a'], ['L@3', 'KA.a'], ['START.b', 'STOP.a'], ['KA.b', 'STOP.a'], ['STOP.b', 'K1.a'], ['K1.b', 'F1.a'], ['F1.b', 'N@1']] };
  assert.deepEqual(codes(d, ex), []);
  assert.ok(allPass(d, ex), JSON.stringify(runTests(d, ex).filter((r) => !r.pass)));
});

test('starter: wiring mistakes are caught before simulation', () => {
  const ex = EXERCISES.D; const sol = ex.solution;
  const without = (pair) => { const d = cloneDesign(sol); d.wires = d.wires.filter((w) => w.join() !== pair.join()); return d; };
  assert.ok(codes(without(['K1.b', 'N@1']), ex).includes('open_terminal'));
  // holding contact wired around STOP and the overload as well
  const byp = without(['F1.b', 'KA.a']); byp.wires.push(['L@3', 'KA.a']);
  assert.ok(codes(byp, ex).includes('bypass'));
  // coil left out of the path: START straight to 0 V
  const sh = cloneDesign(sol); sh.wires.push(['START.b', 'N@3']);
  assert.ok(codes(sh, ex).includes('short'));
  const un = cloneDesign(sol); delete un.comps.find((c) => c.id === 'KA').ref;
  assert.ok(codes(un, ex).includes('unassigned'));
  const wr = cloneDesign(sol); wr.comps.find((c) => c.id === 'KA').ref = 'F1';
  assert.ok(codes(wr, ex).includes('wrong_assoc'));
  const miss = cloneDesign(sol); miss.comps = miss.comps.filter((c) => c.id !== 'F1'); miss.wires = miss.wires.filter((w) => !w.join().includes('F1'));
  assert.ok(codes(miss, ex).includes('missing_part'));
  // load connected at one end only through another load
  const np = { ex: 'A', comps: [{ id: 'SA', kind: 'sw', x: 3, y: 1, rot: 0 }, { id: 'H1', kind: 'lamp', x: 8, y: 1, rot: 0 }], wires: [['L@1', 'SA.a'], ['SA.b', 'H1.a'], ['H1.b', 'L@3']] };
  assert.ok(codes(np, EXERCISES.A).includes('no_path'));
});

test('starter without a holding contact fails the "START released" test', () => {
  const ex = EXERCISES.D; const d = cloneDesign(ex.solution);
  d.wires = d.wires.filter((w) => !w.join().includes('KA'));
  d.wires.push(['L@3', 'KA.a'], ['KA.b', 'L@4']); // contact parked on the rail: wired, but holds nothing
  const res = runTests(d, ex);
  assert.equal(res[1].pass, true);
  assert.equal(res[2].pass, false);
});

test('runtime: power loss drops the coil and it stays out when power returns', () => {
  const rt = createRuntime(EXERCISES.D.solution);
  rt.act('press', 'START'); rt.act('release', 'START');
  assert.equal(rt.loadOn('K1'), true);
  rt.act('powerOff'); assert.equal(rt.loadOn('K1'), false);
  assert.equal(rt.act('lock'), true);
  assert.equal(rt.act('powerOn'), false, 'locked isolator cannot be closed');
  rt.act('unlock'); rt.act('powerOn');
  assert.equal(rt.loadOn('K1'), false);
  assert.ok(Math.abs(rt.volts('L') - 24) < 0.01 && Math.abs(rt.volts('REF') - 24) < 0.01);
});

test('repair evidence: observations narrow the causes, a measurement isolates one', () => {
  const d = EXERCISES.D.solution;
  for (const s of SCENARIOS_V) {
    const rt = createRuntime(d, { [s.fault]: true });
    const log = [];
    const act = (...a) => { rt.act(...a); log.push({ t: 'act', a, run: rt.loadOn('K1') }); };
    const meas = (term) => log.push({ t: 'meas', term, v: rt.volts(term) });
    assert.equal(fitting(d, log).length, 5, 'no evidence fits everything');
    act('press', 'START');
    if (s.id === 'hold') {
      act('release', 'START');
      assert.deepEqual(fitting(d, log), ['KA']);
    } else {
      assert.ok(fitting(d, log).length > 1, 'will-not-start alone is ambiguous');
      meas('STOP.b'); meas('F1.b');
      assert.deepEqual(fitting(d, log), ['F1']);
    }
    assert.equal(replay(d, s.fault, log).length, log.length);
  }
  assert.equal(CHECKS.length, 9);
});

test('a failed-open contact still reads as closed on the drawing (nominal state)', () => {
  const rt = createRuntime(EXERCISES.D.solution, { F1: true });
  assert.equal(rt.closed('F1'), false);
  assert.equal(rt.nominalClosed('F1'), true);
  rt.act('press', 'START');
  assert.equal(rt.loadOn('K1'), false);
});
