// Acceptance tests for the Technical Communication, Documentation & Interview Readiness module.
// Run: node tests/validate-comms.mjs
import { COMMS_SCENARIOS, COMMS_MAP, startComms, FIRST_ROBOTS, HYP_LABELS } from '../js/comms/scenarios.js';
import { QUESTIONS, askQuestion, respondEscalation, respondHandoff, respondInstruction, respondOps, strugglingRobots } from '../js/comms/personas.js';
import { validateDoc, draftDoc, technicianRun } from '../js/comms/docs.js';
import { scoreAttempt, modelAnswers, coachFor, HINTS, STRUCTURE_EXAMPLES, canClose, canSubmit, benchmarkStatus, msgCtx, activeItems, unlocks } from '../js/comms/score.js';
import { DIAGNOSTICS, CHECKS } from '../js/sim/catalog.js';
import * as R from '../js/comms/rules.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
const blankAtt = (sc, sim, variant, extra = {}) => ({ id: 'a', scenarioId: sc.id, variant, mode: 'assessment', reportedAt: sim.s.t, evidence: [], timeline: [], asked: [], hyps: [], assessment: null, assessmentHistory: [], messages: [], commitments: [], actions: [], escalations: [], instructions: [], checks: {}, docs: {}, handoff: { versions: [], rounds: [], accepted: false }, closed: null, submitted: false, issues: null, ...extra });
const ev = (id, source, outcome, summary = 'x', t = 0) => ({ id, source, outcome, summary, t, label: source });

// ------------------------------------------------------------ 0. every scenario/variant sets up
console.log('Scenario setup & first-exercise consistency');
for (const sc of COMMS_SCENARIOS) for (const v of sc.variants) { try { startComms(sc.id, 9, v); pass++; } catch (e) { fail++; console.log(`  ✗ ${sc.id}/${v} setup: ${e.message}`); } }
for (const v of ['ap', 'firmware', 'inventory']) {
  const { sim } = startComms('CX-first', 21, v);
  ok(sim.clockStr().startsWith('06:45'), `first/${v}: clock is 06:45 (got ${sim.clockStr()})`);
  const top = strugglingRobots(sim).slice(0, 3).sort().join(',');
  ok(top === FIRST_ROBOTS.slice().sort().join(','), `first/${v}: Dana's “three robots” are ${FIRST_ROBOTS} (got ${top})`);
  ok(sim.oldestOpenAge() > 300, `first/${v}: oldest order is delayed (${Math.round(sim.oldestOpenAge())} s)`);
  ok(sim.activeAlarms().some((a) => a.key === 'QUEUE_AGE'), `first/${v}: queue-age alarm active`);
}

// ------------------------------------------------------------ 1. documents cannot cite uncollected evidence
console.log('Citations');
{
  const { sim } = startComms('CX-first', 5, 'ap'); const sc = COMMS_MAP['CX-first'];
  const att = blankAtt(sc, sim, 'ap', { evidence: [ev('E1', 'queue_metrics', 'high'), ev('E2', 'network_zone', 'degraded')], incidentId: 'INC-00005' });
  const ctx = { evidenceIds: ['E1', 'E2'], knownIds: sim.s.robots.map((r) => r.id), recovered: false };
  const v = validateDoc('notes', { evidence: 'Disconnects [E2] and [E9]', impact: '12 tasks waiting' }, ctx);
  ok(v.critical.some((c) => c.code === 'fabricated_evidence'), 'document citing never-collected [E9] is a critical failure');
  const m = R.checkOpsUpdate('About 12 tasks waiting [E7]. Investigating. Next update 06:55.', { evidenceIds: ['E1'], maxSentences: 3 });
  ok(m.critical.some((c) => c.code === 'fabricated_evidence'), 'message citing never-collected evidence is a critical failure');
  ok(!R.claimsRestored('R-07 recovered but the queue is still growing.') && R.claimsRestored('Service is fully restored.'), 'restored-claim rule ignores honest contrast sentences but flags real claims');
  ok(!R.specificRequest('Please investigate and repair the component our evidence points to.') && R.specificRequest('Please check AP-3 radio health and repair it if degraded.'), 'vague escalation requests are not counted as specific');
  const d = draftDoc('ticket', att, sim);
  ok(R.citations(d.evidence).every((c) => ['E1', 'E2'].includes(c)), 'drafts only cite collected evidence');
}

// ------------------------------------------------------------ 2. characters react to missing or incorrect information
console.log('Character reactions');
{
  const { sim } = startComms('CX-first', 5, 'ap'); const sc = COMMS_MAP['CX-first'];
  const att = blankAtt(sc, sim, 'ap', { evidence: [ev('E1', 'queue_metrics', 'high'), ev('E2', 'network_zone', 'healthy', 'All APs up'), ev('E3', 'firmware_breakdown', 'by_zone', 'Disconnects by zone C:30'), ev('E4', 'network_zone', 'degraded', 'AP-3 degraded')] });
  const ctx = msgCtx(att, sc, sim, { evidence: att.evidence });
  const base = { team: 'network team', summary: 'About 12 tasks waiting; three robots failing.', repro: 'Since 06:35 in aisle C only, every few minutes.', ruledOut: 'Inventory record normal; other zones healthy.', request: 'Please check AP-3 radio health and repair it if degraded.' };
  ok(/evidence/i.test(respondEscalation({ ...base, cites: [] }, ctx).text), 'engineer asks for evidence when none attached');
  ok(/contradicts/i.test(respondEscalation({ ...base, summary: 'The cause is a Wi-Fi network problem.', cites: ['E2'] }, ctx).text), 'engineer flags evidence that contradicts the claim');
  ok(!respondEscalation({ ...base, team: 'fleet software engineering', cites: ['E3', 'E4'] }, ctx).useful, 'wrong team bounces the escalation');
  ok(respondEscalation({ ...base, cites: ['E3', 'E4'] }, ctx).useful, 'specific, evidence-backed escalation to the owning team is accepted');
  ok(/how many/i.test(respondOps('ops', 'Robots are failing, we are looking. Next update 06:55.', { recovered: false })), 'operations asks for numbers when impact is missing');
  ok(/tell the floor/i.test(respondOps('ops', 'It will be fixed by 07:00 with 12 tasks waiting.', { recovered: false, causeKnown: false })), 'operations acts on an invented ETA (consequence)');
  const i1 = respondInstruction({ to: 'marco', action: 'Read a charger display', equipment: 'C-1', text: 'Marco, please check the charger.' }, { evidenceIds: [] });
  ok(i1.needsMore, 'technician asks for missing equipment/timing');
  const i2 = respondInstruction({ to: 'marco', action: 'Read a charger display', equipment: 'C-1', text: 'Marco, please read the display on charger C-1 now, read that back, and radio me when done.' }, { evidenceIds: [] });
  ok(i2.readBack && i2.willConfirm && !i2.needsMore, 'complete closed-loop instruction gets a read-back and completion promise');
}

// ------------------------------------------------------------ 3. handoff requires acknowledgment by the receiving role
console.log('Handoff acceptance');
{
  const { sim } = startComms('CX-D', 3, 'markers'); const sc = COMMS_MAP['CX-D'];
  const att = blankAtt(sc, sim, 'markers', { evidence: [ev('E1', 'compare_zone', 'others_affected')] });
  const items = activeItems(sim, sc, att);
  ok(items.some((i) => /R-10 isolated/.test(i.label)) && items.some((i) => /Aisle D restricted/.test(i.label)), 'handoff board lists live unresolved items');
  const ctxH = { ...msgCtx(att, sc, sim), statusHonest: true, activeItems: items, hasPending: true, failing: [], incidentId: 'INC-1', unresolved: true };
  const thin = respondHandoff({ status: 'open', summary: 'Aisle D issue', next: '', owner: '', pending: '', verify: '', risks: '', actions: '', followUp: '', evidence: '' }, ctxH);
  ok(!thin.accepted && thin.questions.length > 0, 'incomplete handoff is not accepted; receiver asks questions');
  const full = respondHandoff({ status: 'OPEN — mitigated', summary: 'Localization failures in aisle D; facilities repairing markers.', actions: 'Restricted aisle D; isolated R-10.', pending: 'Facilities marker repair requested 06:33, pending; alarms for R-05, R-10, R-11 stopped robots.', risks: `Aisle D restricted; R-10 isolated; R-05 and R-11 stopped in aisle D; alarm ROBOT_STOPPED; pending markers request; QUEUE_AGE alarm.`, next: 'At 07:10 Jordan checks with facilities; after repair, unrestrict aisle D and return R-10.', owner: 'Jordan owns INC-1 from 07:00.', verify: 'Verify a full task in aisle D and queue age under 4 min for 5 min.', followUp: 'Escalate to facilities lead if not repaired by 07:30.', evidence: 'See INC-1 [E1].' }, ctxH);
  ok(full.accepted, `complete, honest handoff is accepted by the receiver (questions: ${full.questions.join(' | ')})`);
  const conceal = respondHandoff({ status: 'Resolved', summary: 'All fixed.', next: 'Nothing at 07:00.', owner: 'Jordan', pending: '', verify: 'none', risks: '', actions: '', followUp: '', evidence: '' }, { ...ctxH, statusHonest: false, failing: ['Queue age and throughput recover'] });
  ok(!conceal.accepted && conceal.checklist.critical.some((c) => c.code === 'concealed_unresolved'), 'handoff claiming “resolved” while checks fail is a critical failure and is refused');
  ok(!canSubmit({ ...att, handoff: { accepted: false } }, sc).ok, 'attempt cannot be submitted until the receiving role accepts the handoff');
  ok(canSubmit({ ...att, handoff: { accepted: true } }, sc).ok, 'attempt can be submitted after acceptance');
}

// ------------------------------------------------------------ 4. closure requires relevant recovery checks
console.log('Closure gating');
{
  const sc = COMMS_MAP['CX-E']; const { sim } = startComms('CX-E', 4, 'ap_unknown');
  const att = blankAtt(sc, sim, 'ap_unknown');
  ok(!canClose(att, sc).ok, 'cannot close before checks are run');
  const t0 = sim.s.t; sim.operate('request_ap_repair', { ap: 'AP-2' }); att.actions.push({ t: t0, ok: true, op: 'request_ap_repair', pendingFor: 150 });
  for (const id of sc.checks) att.checks[id] = { ...CHECKS[id].run(sim, { since: t0 + 150 }), t: sim.s.t };
  ok(!canClose(att, sc).ok, 'cannot close when checks were run before the fix took effect / are failing');
  sim.run(150 + 480); for (const id of sc.checks) att.checks[id] = { ...CHECKS[id].run(sim, { since: t0 + 150, relatedKeys: sc.relatedAlarms }), t: sim.s.t };
  const c = canClose(att, sc); ok(c.ok, `can close after the fix and a passing observation period (${c.reason || ''})`);
  ok(!canClose(att, COMMS_MAP['CX-first']).ok, 'handoff-ending incidents cannot be “closed” instead of handed off');
}

// ------------------------------------------------------------ 5. independent assessment does not leak model answers / hidden causes
console.log('No leaks');
{
  const sc = COMMS_MAP['CX-first']; const { sim } = startComms('CX-first', 8, 'firmware');
  const att = blankAtt(sc, sim, 'firmware');
  let threw = false; try { modelAnswers(att, sc, sim); } catch { threw = true; }
  ok(threw, 'model answers throw before submission');
  for (const k of Object.keys(HINTS)) { const c = coachFor('assessment', k, 3); ok(!c.examples && !c.hints.length, `assessment mode gives no examples/hints for ${k}`); }
  const secretsAll = []; for (const s of COMMS_SCENARIOS) for (const v of s.variants) secretsAll.push(...(s.truth[v].secrets || []));
  const coachText = JSON.stringify([HINTS, STRUCTURE_EXAMPLES]).toLowerCase();
  ok(!secretsAll.some((w) => coachText.includes(w.toLowerCase())), 'hints and structure examples contain no hidden-cause details');
  for (const s of COMMS_SCENARIOS.filter((x) => !x.worked)) for (const v of s.variants) {
    const { sim: sm } = startComms(s.id, 13, v); const a = blankAtt(s, sm, v);
    const said = s.questions.map((q) => askQuestion(q, sm, a, s, QUESTIONS[q].param === 'aisle' ? 'C' : QUESTIONS[q].param === 'station' ? 'P-1' : undefined).text).join(' ') + ' ' + s.brief.text + ' ' + (s.extraOpening || []).map((m) => m.text).join(' ');
    const secrets = (s.truth[v].secrets || []).filter((w) => said.toLowerCase().includes(w.toLowerCase()));
    ok(!secrets.length, `${s.id}/${v}: character dialogue reveals no hidden detail (${secrets.join(', ')})`);
    ok(!said.includes(s.truth[v].explanation.slice(0, 60)), `${s.id}/${v}: dialogue does not quote the hidden explanation`);
    const d = JSON.stringify(draftDoc('ticket', a, sm)).toLowerCase();
    ok(!d.includes(HYP_LABELS[s.truth[v].cause].toLowerCase()), `${s.id}/${v}: document autofill does not insert the hidden cause`);
  }
}

// ------------------------------------------------------------ 6. repeat attempts vary evidence and cause
console.log('Variation');
{
  const variants = new Set(); const summaries = new Set();
  for (let seed = 1; seed <= 9; seed++) { const { sim, variant } = startComms('CX-first', seed); variants.add(variant); summaries.add(DIAGNOSTICS.firmware_breakdown.run(sim, {}).summary); }
  ok(variants.size === 3, `first exercise varies the hidden cause across attempts (${[...variants]})`);
  ok(summaries.size >= 3, 'evidence differs across attempts');
  for (const s of COMMS_SCENARIOS.filter((x) => !x.worked)) ok(s.variants.length >= 2 || s.id === 'CX-WORKED', `${s.id} has ≥ 2 possible hidden causes`);
}

// ------------------------------------------------------------ 7. accuracy separated from polish
console.log('Accuracy vs polish');
{
  const sc = COMMS_MAP['CX-first']; const { sim } = startComms('CX-first', 30, 'inventory');
  const polished = blankAtt(sc, sim, 'inventory', { assessment: { cause: 'network', confidence: 'confirmed', evidence: [] }, hyps: [{ id: 'network', label: 'n', status: 'supported', history: [] }, { id: 'inventory', label: 'i', status: 'rejected', history: [{ reason: 'looks fine to me', status: 'rejected' }] }], messages: [{ t: sim.s.t, clock: '06:46', kind: 'ops3', text: 'About 14 tasks are waiting and the oldest order is 9 minutes late. The root cause is the Wi-Fi network in zone C, so meanwhile keep robots out of aisle C. Next update at 06:55 facility time.' }], closed: { how: 'handoff' }, handoff: { versions: [], rounds: [], accepted: true } });
  const plain = blankAtt(sc, sim, 'inventory', { evidence: [ev('E1', 'inventory_record', 'mismatch', 'C-14 failures', sim.s.t - 10), ev('E2', 'compare_robots_pick', 'several', 'several robots', sim.s.t - 5)], assessment: { cause: 'inventory', confidence: 'confirmed', evidence: ['E1', 'E2'] }, hyps: [{ id: 'inventory', label: 'i', status: 'supported', history: [] }, { id: 'network', label: 'n', status: 'rejected', history: [{ reason: 'no disconnects at all [E1]', status: 'rejected' }] }], messages: [{ t: sim.s.t, clock: '06:46', kind: 'ops3', text: 'tasks late. location problem maybe. update soon.' }], closed: { how: 'handoff' }, handoff: { versions: [], rounds: [], accepted: true } });
  const a = scoreAttempt(polished, sc, sim), b = scoreAttempt(plain, sc, sim);
  const acc = (s) => s.cats.find((c) => c.id === 'accuracy').got; const com = (s) => s.cats.find((c) => c.id === 'communication').got;
  ok(acc(a) <= 10 && acc(b) >= 20, `confident unsupported diagnosis scores poorly for accuracy (${acc(a)}) vs supported (${acc(b)})`);
  ok(com(a) > com(b), `communication quality scored separately (polished ${com(a)} > plain ${com(b)})`);
  ok(a.metrics.unsupportedClaims >= 1, 'unsupported claim counted in metrics');
}

// ------------------------------------------------------------ 8. runbook technician
console.log('Runbook technician');
{
  const occ = [{ sim: startComms('CX-H', 2, 'contacts').sim, label: 'contacts', robot: 'R-04' }, { sim: startComms('CX-H', 3, 'charger').sim, label: 'charger', robot: 'R-04' }];
  const weak = technicianRun({ intendedUse: 'R-04 not charging', preconditions: 'none', diagnostics: 'Check the charger.', decisions: 'Reseat the robot.', stop: 'call someone', verification: 'looks ok', rollback: 'n/a', author: 'me' }, occ);
  ok(!weak.completed && weak.pauses.length >= 4, `vague runbook makes the technician pause (${weak.pauses.length} pauses)`);
  const good = { intendedUse: 'Use when a robot is docked but its battery does not rise (charge current 0 A). Scope: mobile robots and floor chargers (simulated).', preconditions: 'Read-only access to fleet dashboard and charger status; authority to send robots to chargers and isolate robots. Physical checks only by trained staff per site procedure.', diagnostics: '1. Check battery & charging telemetry for the robot. Expected: charging current 20–26 A when docked.\n2. Check charger status. Expected: the docked robot receives current.\n3. Re-dock test: move the robot to another charger (known-good charger). Expected: it charges normally on the other charger.', decisions: 'If the robot charges normally on the other charger and another robot also fails on the first charger → charger fault: take the charger out of service and request a technician.\nIf the robot fails on both chargers (still 0 A, robot-side) → contacts: isolate the robot and escalate to robot maintenance.\nOtherwise → stop and escalate to the support lead with the readings.', stop: 'Stop and escalate to robot maintenance or the station technician team if no branch matches, if a robot battery falls below 15%, or after 20 min without recovery.', verification: '1. Robot charging current above 20 A for 5 min.\n2. A full task completes after charging.\n3. No CHARGE_FAULT alarm for 5 min of observation.', rollback: 'Return the charger to service only after the technician confirms output; return the robot to service after bench check.', author: 'Learner (simulated)' };
  const g = technicianRun(good, occ);
  ok(g.completed, `complete branching runbook passes on BOTH occurrences (pauses: ${g.pauses.map((p) => p.where + ': ' + p.why).join(' | ')})`);
}

// ------------------------------------------------------------ 9. benchmark & unlocks
console.log('Benchmark & unlocks');
{
  const mk = (id, sid, total, crit = []) => ({ id, scenarioId: sid, mode: 'assessment', first: { total, critical: crit } });
  ok(!benchmarkStatus([mk(1, 'CX-A', 90), mk(2, 'CX-A', 92), mk(3, 'CX-B', 88)]).met, 'benchmark needs three DIFFERENT independent scenarios');
  ok(!benchmarkStatus([mk(1, 'CX-A', 90), mk(2, 'CX-B', 92), mk(3, 'CX-C', 88, [{ code: 'unsafe' }])]).met, 'benchmark excludes attempts with critical failures');
  ok(benchmarkStatus([mk(1, 'CX-A', 90), mk(2, 'CX-B', 92), mk(3, 'CX-C', 88)]).met, 'benchmark met with three varied independent passes');
  ok(benchmarkStatus([mk(1, 'CX-A', 80), mk(2, 'CX-B', 82), mk(3, 'CX-C', 81)], 80).met, 'benchmark threshold is configurable');
  const u0 = unlocks({ attempts: [], worked: { done: false } }); ok(!u0.stage2 && !u0.stage3, 'stages locked at start');
  const u1 = unlocks({ attempts: [], worked: { done: true } }); ok(u1.stage2 && !u1.stage3, 'worked example unlocks stage 2 only');
  const u2 = unlocks({ attempts: [{ mode: 'guided', revisionDone: true, first: { total: 55, critical: [] }, revised: { total: 70, critical: [] } }], worked: { done: true } }); ok(u2.stage3 && !u2.tier2, 'revised guided attempt ≥ 60 unlocks independent tier 1 (not tier 2)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
