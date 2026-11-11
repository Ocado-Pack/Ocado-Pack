// Headless validation for the SIMULATED engine and scenarios.
// Run:  node tests/validate.mjs
// Checks that (1) injected faults produce consistent symptoms across robot state, visual status,
// logs, metrics/alarms and task records; (2) recovery requires correcting the cause or a valid
// mitigation; (3) wrong actions do not "fix" the system; (4) variants differ between attempts.
import { Sim } from '../js/sim/engine.js';
import { SCENARIOS, SCENARIO_MAP, startAttempt } from '../js/sim/scenarios.js';
import { DIAGNOSTICS, SANDBOX_TESTS, CHECKS } from '../js/sim/catalog.js';
import { robotVisual } from '../js/sim/visual.js';
import { scoreDocument } from '../js/docs-rules.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  ✗ ' + msg); } };
const logCodes = (sim, robot, win = 900) => new Set(sim.s.logs.filter((e) => e.t > sim.s.t - win && (!robot || e.robot === robot)).map((e) => e.code));
const allChecks = (sim, sc, since) => { const ctx = { ...sc.checkCtx(sim), since, relatedKeys: sc.relatedAlarms }; return Object.fromEntries(sc.checks.map((id) => [id, CHECKS[id].run(sim, ctx)])); };

// ----------------------------------------------------------- 1. healthy baseline
{
  console.log('Healthy baseline');
  const sim = new Sim({ seed: 3 }); sim.run(1200);
  ok(sim.activeAlarms().length === 0, 'healthy run has no active alarms: ' + sim.activeAlarms().map((a) => a.key));
  ok(sim.metric('tasksPerHour', 900) > 250, 'healthy throughput > 250/h');
  ok(sim.metric('successRate', 900) === 1, 'healthy success rate 100%');
  ok(sim.metric('disconnects', 900, { zone: 'D' }) === null, 'zone D disconnect metric is unavailable (null), not zero');
  ok(sim.metric('disconnects', 900, { zone: 'A' }) === 0, 'zone A disconnects is a true zero');
  ok(sim.s.robots.every((r) => robotVisual(sim, r).key !== 'stopped'), 'no robot shows STOPPED in a healthy run');
}

// ----------------------------------------------------------- 2. per-scenario symptom consistency + recovery
const EXPECT = {
  'r07/obstruction': { robot: 'R-07', state: 'blocked', visual: 'stopped', code: 'OBSTACLE_DETECTED', diag: { comp_obstacle: 'blocked', comp_localization: 'normal', camera_view: 'object' }, alarm: 'ROBOT_STOPPED:R-07' },
  'r07/localization': { robot: 'R-07', state: 'loc_lost', visual: 'stopped', code: 'LOC_CONFIDENCE_LOW', diag: { comp_localization: 'low', comp_obstacle: 'clear' }, alarm: 'ROBOT_STOPPED:R-07' },
  'r07/network': { robot: 'R-07', code: 'COMMS_LOSS_SAFE_STOP', diag: { comp_wireless: 'unstable', network_zone: 'degraded', comp_obstacle: 'clear' }, alarm: 'AP_DISCONNECTS:C' },
  'r07/taskstate': { robot: 'R-07', state: 'idle', visual: 'idle', code: 'ASSIGNMENT_RETAINED', diag: { task_record: 'mismatch', comp_controller: 'recent_reboot', sandbox_restart: 'persists' }, alarm: 'QUEUE_AGE' },
  'w1-obstruction/obstruction': { robot: 'R-03', state: 'blocked', code: 'OBSTACLE_DETECTED', diag: { camera_view: 'object' } },
  'w1-localization/zone_markers': { robot: 'R-10', state: 'loc_lost', diag: { compare_zone: 'others_affected' } },
  'w1-localization/robot_sensor': { robot: 'R-10', state: 'loc_lost', diag: { compare_zone: 'only_target' } },
  'w1-charging/contacts': { robot: 'R-04', visual: 'charge_fault', code: 'CHARGE_CURRENT_ZERO', diag: { redock_test: 'robot_bad' }, alarm: 'CHARGE_FAULT:R-04' },
  'w1-charging/charger': { robot: 'R-04', visual: 'charge_fault', code: 'CHARGE_CURRENT_ZERO', diag: { redock_test: 'charger_bad' }, alarm: 'CHARGE_FAULT:R-04' },
  'w1-wheel/encoder': { robot: 'R-09', state: 'fault', code: 'WHEEL_FEEDBACK_FAULT', diag: { comp_encoders: 'mismatch' } },
  'w1-wheel/drag': { robot: 'R-09', state: 'fault', code: 'DRIVE_OVERCURRENT', diag: { comp_encoders: 'consistent' } },
  'w1-network/ap': { diag: { firmware_breakdown: 'by_zone', network_zone: 'degraded' } },
  'w1-network/firmware': { diag: { firmware_breakdown: 'by_firmware' } },
  'w2-ack/stale_lease': { robot: 'R-05', state: 'idle', diag: { task_record: 'mismatch', trace_oldest: 'ack' }, alarm: 'QUEUE_AGE' },
  'w2-duplicate/intermittent_ap': { code: 'DUPLICATE_TASK_IGNORED', diag: { records_probe: 'none', network_zone: 'degraded' } },
  'w2-station/scanner': { diag: { station_status: 'unavailable', station_local: 'scanner_fault' }, alarm: 'STATION_UNAVAILABLE:P-3' },
  'w2-station/heartbeat': { diag: { station_status: 'unavailable', station_local: 'hmi_ready' }, alarm: 'STATION_UNAVAILABLE:P-3' },
  'w2-inventory/mismatch': { code: 'ITEM_NOT_FOUND', diag: { inventory_record: 'mismatch', compare_robots_pick: 'several' } },
  'w2-timeout/pool': { code: 'RESERVE_TIMEOUT', diag: { service_health: 'degraded', release_diff: 'relevant', sandbox_concurrency: 'worse' }, alarm: 'SVC_ERRORS:inventory-service' },
  'w2-regression/ack_timeout': { code: 'ACK_TIMEOUT_REDELIVER', diag: { release_diff: 'relevant', sandbox_rollback: 'better', network_zone: 'healthy' }, alarm: 'QUEUE_AGE' },
  'w4-unknown/unknown': { diag: { network_zone: 'degraded' } },
};
// correct mitigation/fix per variant; and a plausible-but-wrong action
const FIX = {
  'r07/obstruction': [['request_aisle_clear', { aisle: 'C' }]],
  'r07/localization': [['restrict_zone', { aisle: 'C' }], ['isolate_robot', { robot: 'R-07' }], ['request_marker_repair', { aisle: 'C' }], ['@wait', 260], ['unrestrict_zone', { aisle: 'C' }], ['return_to_service', { robot: 'R-07' }]],
  'r07/network': [['request_ap_repair', { ap: 'AP-3' }]],
  'r07/taskstate': [['preserve_evidence', { robot: 'R-07' }], ['release_task_lease', { robot: 'R-07' }]],
  'w1-obstruction/obstruction': [['request_aisle_clear', { aisle: 'B' }]],
  'w1-localization/zone_markers': [['request_marker_repair', { aisle: 'D' }]],
  'w1-localization/robot_sensor': [['isolate_robot', { robot: 'R-10' }], ['send_to_maintenance', { robot: 'R-10' }], ['@wait', 90], ['repair', { robot: 'R-10', part: 'clean_loc_sensor' }], ['@wait', 100], ['return_to_service', { robot: 'R-10' }]],
  'w1-charging/contacts': [['isolate_robot', { robot: 'R-04' }], ['send_to_maintenance', { robot: 'R-04' }], ['@wait', 120], ['repair', { robot: 'R-04', part: 'replace_charge_contacts' }], ['@wait', 100], ['return_to_service', { robot: 'R-04' }]],
  'w1-charging/charger': [['redock', { robot: 'R-04', charger: 'C-2' }], ['request_charger_repair', { charger: 'C-1' }]],
  'w1-wheel/encoder': [['isolate_robot', { robot: 'R-09' }], ['@payload', 'R-09'], ['send_to_maintenance', { robot: 'R-09' }], ['@wait', 120], ['repair', { robot: 'R-09', part: 'replace_encoder' }], ['@wait', 100], ['return_to_service', { robot: 'R-09' }]],
  'w1-wheel/drag': [['isolate_robot', { robot: 'R-09' }], ['@payload', 'R-09'], ['send_to_maintenance', { robot: 'R-09' }], ['@wait', 120], ['repair', { robot: 'R-09', part: 'replace_wheel_module' }], ['@wait', 100], ['return_to_service', { robot: 'R-09' }]],
  'w1-network/ap': [['request_ap_repair', { ap: 'AP-3' }]],
  'w1-network/firmware': [['isolate_robot', { robot: 'R-02' }], ['isolate_robot', { robot: 'R-06' }], ['isolate_robot', { robot: 'R-07' }], ['isolate_robot', { robot: 'R-10' }], ['@payloadAll'], ['@wait', 150]],
  'w2-ack/stale_lease': [['preserve_evidence', { robot: 'R-05' }], ['release_task_lease', { robot: 'R-05' }]],
  'w2-duplicate/intermittent_ap': [['request_ap_repair', { ap: 'AP-5' }]],
  'w2-station/scanner': [['reroute_station', { station: 'P-3' }], ['request_station_repair', { station: 'P-3' }], ['@wait', 210], ['restore_station', { station: 'P-3' }]],
  'w2-station/heartbeat': [['reroute_station', { station: 'P-3' }], ['preserve_evidence', { service: 'station-service' }], ['restart_service', { service: 'station-service' }], ['@wait', 60], ['restore_station', { station: 'P-3' }]],
  'w2-inventory/mismatch': [['inventory_hold', { loc: 'B-14' }], ['request_cycle_count', { loc: 'B-14' }], ['@wait', 130], ['release_hold', { loc: 'B-14' }]],
  'w2-timeout/pool': [['preserve_evidence', { service: 'inventory-service' }], ['revert_config', { change: 'CHG-2291' }]],
  'w2-regression/ack_timeout': [['preserve_evidence', { service: 'fleet-manager' }], ['rollback_release', { service: 'fleet-manager' }]],
  'w4-unknown/unknown': [['request_ap_repair', { ap: 'AP-2' }]],
};
const WRONG = {
  'r07/obstruction': ['restart_robot', { robot: 'R-07' }], 'r07/localization': ['relocalize', { robot: 'R-07' }], 'r07/network': ['restart_robot', { robot: 'R-07' }], 'r07/taskstate': ['restart_robot', { robot: 'R-07' }],
  'w1-wheel/encoder': ['restart_robot', { robot: 'R-09' }], 'w2-ack/stale_lease': ['restart_robot', { robot: 'R-05' }], 'w2-timeout/pool': ['restart_service', { service: 'inventory-service' }], 'w2-regression/ack_timeout': ['restart_service', { service: 'fleet-manager' }],
  'w2-station/scanner': ['restart_service', { service: 'station-service' }], 'w1-charging/contacts': ['request_charger_repair', { charger: 'C-1' }],
};

function applySeq(sim, seq) {
  for (const [op, p] of seq) {
    if (op === '@wait') { sim.run(p); continue; }
    if (op === '@payload' || op === '@payloadAll') { const ids = op === '@payload' ? [p] : sim.s.robots.filter((r) => r.isolated).map((r) => r.id); let waited = false; for (const id of ids) if (sim.robot(id).payload === 'tote') { sim.operate('recover_payload', { robot: id }); waited = true; } if (waited) sim.run(100); continue; }
    const res = sim.operate(op, p);
    if (!res.ok && !['relocalize'].includes(op)) console.log(`    (op ${op} → ${res.msg})`);
  }
}

for (const sc of SCENARIOS) {
  for (const v of sc.variants) {
    const key = `${sc.id}/${v}`;
    console.log(key);
    const { sim } = startAttempt(sc.id, 101, v);
    const ex = EXPECT[key] || {};
    if (ex.robot) {
      const r = sim.robot(ex.robot);
      if (ex.state) ok(r.state === ex.state, `${key}: robot ${r.id} state ${r.state} expected ${ex.state}`);
      if (ex.visual) ok(robotVisual(sim, r).key === ex.visual, `${key}: visual ${robotVisual(sim, r).key} expected ${ex.visual}`);
      if (ex.state && ['blocked', 'loc_lost', 'fault'].includes(ex.state)) ok(robotVisual(sim, r).key === 'stopped' || robotVisual(sim, r).key === 'nolink', `${key}: stopped robot shows a non-OK visual`);
    }
    if (ex.code) ok(logCodes(sim, null, 1500).has(ex.code), `${key}: log code ${ex.code} present`);
    if (ex.alarm) ok(sim.activeAlarms().some((a) => a.key === ex.alarm), `${key}: alarm ${ex.alarm} active (have ${sim.activeAlarms().map((a) => a.key)})`);
    for (const [d, want] of Object.entries(ex.diag || {})) { const D = DIAGNOSTICS[d] || SANDBOX_TESTS[d]; const out = D.run(sim, { ...sc.target }).outcome; ok(out === want, `${key}: diagnostic ${d} → ${out}, expected ${want}`); }
    // task-state consistency: every robot's taskId refers to an existing task not completed
    for (const r of sim.s.robots) if (r.taskId) ok(!!sim.s.tasks[r.taskId] && sim.s.tasks[r.taskId].state !== 'completed', `${key}: ${r.id} holds valid open task`);
    ok(!sc.resolved(sim, v).fixed, `${key}: not resolved before any action`);

    // wrong action should not satisfy checks
    if (WRONG[key]) {
      const c = sim.clone(); const t0 = c.s.t; c.operate(...WRONG[key]); c.run(360);
      const res = sc.resolved(c, v); const ch = allChecks(c, sc, t0);
      ok(!res.fixed && !Object.values(ch).every((x) => x.pass), `${key}: wrong action ${WRONG[key][0]} does not produce full recovery`);
    }
    // correct fix
    if (FIX[key]) {
      const c = sim.clone();
      applySeq(c, FIX[key]);
      for (let i = 0; i < 60 && c.s.pendingOps.length; i++) c.run(5); // observation starts when requested work completes
      const since = c.s.t;
      if (sc.target.robot && !c.robot(sc.target.robot).isolated) { for (let i = 0; i < 80 && !c.fmAvailable(c.robot(sc.target.robot)); i++) c.run(5); const tt = c.operate('dispatch_test_task', { robot: sc.target.robot }); if (!tt.ok) console.log('    test task: ' + tt.msg); }
      c.run(Math.max(60, 600 - (c.s.t - since)));
      const res = sc.resolved(c, v);
      ok(res.fixed || res.mitigated, `${key}: correct actions resolve/mitigate (${JSON.stringify(res)})`);
      const ch = allChecks(c, sc, since);
      const failed = Object.entries(ch).filter(([, x]) => !x.pass);
      ok(!failed.length, `${key}: recovery checks pass after fix — failing: ${failed.map(([k, x]) => k + ': ' + x.detail).join(' | ')}`);
    }
  }
}

// ----------------------------------------------------------- 3. variant variation across attempts
{
  const seen = new Set();
  for (let seed = 1; seed <= 12; seed++) seen.add(startAttempt('r07', seed).variant);
  ok(seen.size === 4, `r07 attempts vary hidden cause across seeds (saw ${[...seen]})`);
  const a = startAttempt('r07', 5), b = startAttempt('r07', 5);
  ok(a.variant === b.variant && a.sim.s.logs.length === b.sim.s.logs.length, 'same seed reproduces the same attempt (deterministic)');
}

// ----------------------------------------------------------- 4. safety & duplicate-work safeguards
{
  const { sim } = startAttempt('r07', 4, 'obstruction');
  const r = sim.robot('R-07');
  const res = sim.operate('release_task_lease', { robot: 'R-07' });
  ok(!res.ok && /duplicate/i.test(res.msg), 'releasing an assignment the robot is actively executing is refused (duplicate-work safeguard)');
  ok(!('clear_estop' in {}) && sim.operate('clear_estop', { robot: 'R-07' }).refused, 'no remote E-stop reset operation exists');
  const m = sim.operate('send_to_maintenance', { robot: 'R-07' });
  ok(!m.ok && /Isolate/.test(m.msg), 'technician recovery requires isolation first');
  const n0 = sim.s.evidenceLost.length; sim.operate('restart_robot', { robot: 'R-07' });
  ok(sim.s.evidenceLost.length === n0 + 1, 'restarting without preserving evidence is recorded as evidence loss');
  void r;
}

// ----------------------------------------------------------- 5. documentation rules
{
  const evidence = [{ id: 'E1', text: 'R-07 forward obstacle range 0.4 m' }];
  const d1 = scoreDocument({ rootCause: 'confirmed', body: 'Root cause was a dirty lidar [E9]. Fixed permanently.', cited: ['E9'] }, evidence, { recovered: true, rootCauseKnown: false });
  ok(d1.critical.length > 0, 'document citing never-collected evidence / unsupported claims is flagged critical');
  const d2 = scoreDocument({ rootCause: 'unknown', body: 'Service restored after AP-2 reboot [E1]. Root cause not determined; monitoring for recurrence.', cited: ['E1'] }, evidence, { recovered: true, rootCauseKnown: false });
  ok(d2.critical.length === 0, 'honest "cause unknown" recovery document has no critical flags');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
