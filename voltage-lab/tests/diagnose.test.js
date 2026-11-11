import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, newSession, recommend, consistent, predictValue, healthyValue, meas, hyp, predictOptions } from '../src/diagnose.js';

// Follow the guide's own recommendations, answering each one with the reading
// the faulted circuit really produces.
function run(scn, caseIdx) {
  const s = newSession(scn, caseIdx);
  const log = [];
  let rec = s.cur;
  let guard = 0;
  while (rec && guard++ < 12) {
    const value = predictValue(scn, s.faults, rec.m);
    s.readings.push({ id: rec.m.id, value });
    log.push(`${rec.m.id}(${rec.reason})=${value.toFixed(2)}`);
    rec = recommend(scn, s.readings);
  }
  return { s, log, live: consistent(scn, s.readings) };
}

for (const scn of Object.values(SCENARIOS)) {
  scn.cases.forEach((c, i) => {
    test(`${scn.id}: case "${c}" is isolated by evidence`, () => {
      const { s, log, live } = run(scn, i);
      assert.equal(s.actual, c);
      assert.deepEqual(live.map((h) => h.id), [c], log.join(' → '));
      // never a conclusion from a single reading when another reading is available
      if (scn.meas.length > 1) assert.ok(s.readings.length >= 2, `only ${s.readings.length} reading(s): ${log.join(' → ')}`);
      assert.ok(s.readings.length <= 4, `too many steps: ${log.join(' → ')}`);
    });
  });
}

test('one ambiguous reading leaves several causes open', () => {
  const scn = SCENARIOS.panel24;
  // 0 V across the lamp fits an open switch section, an open W2 and an open return.
  const m = meas(scn, 'lamp');
  const live = consistent(scn, [{ id: 'lamp', value: 0 }]).map((h) => h.id).sort();
  assert.deepEqual(live, ['src', 'sw', 'w2', 'w3']);
  assert.ok(Math.abs(healthyValue(scn, m) - 24) < 0.1);
  // a burnt-out lamp is NOT among them: it would have full voltage across it
  assert.ok(Math.abs(predictValue(scn, hyp(scn, 'lamp').faults, m) - 24) < 0.1);
});

test('depleted battery collapses under load and recovers with the switch open', () => {
  const scn = SCENARIOS.lamp9;
  const f = hyp(scn, 'src').faults;
  const loaded = predictValue(scn, f, meas(scn, 'src'));
  const open = predictValue(scn, f, meas(scn, 'srcOpen'));
  assert.ok(loaded > 1 && loaded < 2, String(loaded));
  assert.ok(open > 7 && open < 7.3, String(open));
  const { log } = (() => { const s = newSession(scn, 1); const l = []; let r = s.cur; while (r) { const v = predictValue(scn, s.faults, r.m); s.readings.push({ id: r.m.id, value: v }); l.push(r.m.id); r = recommend(scn, s.readings); } return { log: l }; })();
  assert.deepEqual(log, ['src', 'srcOpen']);
});

test('prediction choices point at the healthy value', () => {
  const scn = SCENARIOS.lamp9;
  assert.equal(predictOptions(scn, meas(scn, 'src')).correct, 0);
  assert.equal(predictOptions(scn, meas(scn, 'ret')).correct, 1);
  assert.equal(predictOptions(SCENARIOS.ac12, SCENARIOS.ac12.meas[0]).correct, 0);
});
