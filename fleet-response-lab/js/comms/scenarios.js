// Technical Communication module — SIMULATED incidents built on the shared engine.
// Every incident: hidden consistent cause (variant), observable symptoms, relevant + irrelevant
// evidence, information that must be requested, an operational consequence, ≥2 plausible
// hypotheses, mitigation/recovery criteria (engine checks) and a documented escalation boundary.
import { Sim, AISLES, ROAD_Z } from '../sim/engine.js';
import { makeRng } from '../util.js';
import '../sim/scenarios.js'; // registers shared diagnostics (re-dock test, fleet-wide log codes, …)

export const TEAMS = ['fleet software engineering', 'network team', 'inventory/WMS team', 'robot maintenance', 'station technician', 'facilities'];
export const HYP_LABELS = {
  network: 'Wi-Fi / access-point problem in an area', firmware: 'Robot-side software (firmware) on some robots', inventory: 'Inventory record wrong at a location',
  service: 'Fleet software / service-side problem', robot: 'Individual robot hardware fault', obstruction: 'Physical obstruction', localization: 'Localization (robots cannot tell where they are)',
  taskstate: 'Task-state problem (records disagree)', station: 'Station hardware fault', heartbeat: 'Station status wrong in software', timeout: 'Slow downstream service (timeouts)',
  regression: 'Software regression after a release', contacts: 'Robot charging contacts', charger: 'Charger output fault', encoder: 'Wheel encoder feedback fault', drag: 'Mechanical drag on a wheel',
  zone: 'Network problem in the area where the robot works', estop: 'E-stop / safety stop', unknown: 'Network / access point (cause may stay unknown)',
};
export const BOUNDARY = {
  may: 'Read-only diagnostics; preserve evidence; isolate or return robots; restrict aisles; inventory holds; reroute stations; dispatch test tasks; request floor, facilities, network, station or maintenance work; escalate.',
  approval: 'Needs engineering approval (they perform it): service restarts, release rollbacks, configuration changes, fleet-manager assignment edits, firmware changes.',
  never: 'Never: reset an E-stop remotely, bypass or mute safety devices, enter an active robot area, work on energized equipment.',
};
export const OP_AUTH = { release_task_lease: 'eng', restart_service: 'eng', rollback_release: 'eng', revert_config: 'eng', set_concurrency: 'eng', repair: 'maint' };

const orderAt = (sim, loc, station) => sim.createOrder([sim.s.inventory[loc].sku], { loc, station });
export function setClock(sim, hhmm) { const [h, m] = hhmm.split(':').map(Number); sim.s.clock0 = h * 3600 + m * 60 - sim.s.t; }
function delayPending(sim, kind, extra) { for (const e of sim.s.events) if (e.type === 'op' && e.data.kind === kind) e.at += extra; sim.s.events.sort((a, b) => a.at - b.at); for (const p of sim.s.pendingOps) if (p.kind === kind) p.due += extra; }
const fw = (sim, ids, ver) => { for (const id of ids) sim.robot(id).firmware = ver; };
const BASE_CHECKS = ['full_task', 'records_consistent', 'no_dup_stranded', 'safety_valid', 'queue_recovered', 'alarms_clear', 'neighbors_healthy'];
const DIAG_FLEET = ['fleet_overview', 'queue_metrics', 'alarm_list', 'trace_oldest', 'robot_logs_zone', 'service_health', 'network_zone', 'firmware_breakdown', 'release_diff', 'inventory_record', 'compare_robots_pick', 'station_status'];
const DIAG_ROBOT = ['robot_status', 'robot_logs', 'comp_wireless', 'comp_controller', 'task_record', 'compare_zone', 'comp_obstacle', 'comp_localization', 'comp_battery', 'comp_encoders', 'comp_drive', 'camera_view'];

function seededPriorRelease(sim, ids, ver = 'rc-4.3.0', id = 'FW-044') { sim.s.releases.push({ id, t: sim.s.t - 3200, service: 'robot firmware', from: 'rc-4.2.1', to: ver, changes: [`Staged to ${ids.join(', ')}`, 'Wi-Fi driver update; roaming threshold change'], by: 'fleet ops (simulated)' }); }

export const FIRST_ROBOTS = ['R-02', 'R-06', 'R-09'];
function firstSetup(sim, v) {
  sim.run(300);
  const R = FIRST_ROBOTS;
  const others = sim.s.robots.map((r) => r.id).filter((id) => !R.includes(id));
  const fwRobots = v === 'firmware' ? R : ['R-01', 'R-05'];
  fw(sim, fwRobots, 'rc-4.3.0'); seededPriorRelease(sim, fwRobots);
  if (v === 'ap') sim.inject('apDegraded', { ap: 'AP-3', lossProb: 0.6, zMin: 3, dropMax: 11 });
  if (v === 'firmware') sim.inject('firmwareWifi', { firmware: 'rc-4.3.0', lossProb: 0.32, dropMax: 10 });
  if (v === 'inventory') { sim.inject('inventoryMismatch', { loc: 'C-14' }); sim.s.config.maxPickFailures = 20; }
  const probLoc = v === 'inventory' ? 'C-14' : v === 'ap' ? 'C-15' : 'B-09';
  // pre-history: the struggling robots keep getting work; the oldest order's line keeps landing on them
  const old = sim.createOrder([sim.s.inventory[probLoc].sku, sim.s.inventory['A-03'].sku], { station: 'P-3' });
  const oldTask = sim.s.tasks[old.tasks[0]]; oldTask.loc = probLoc;
  const pinned = [oldTask];
  const pin = (tk) => { for (const id of others) tk.excluded[id] = 1e9; };
  pin(oldTask);
  const locs = v === 'inventory' ? ['C-14'] : v === 'ap' ? ['C-11', 'C-13', 'C-15', 'C-17'] : ['B-05', 'B-09', 'C-05', 'D-07'];
  for (let round = 0; round < 9; round++) {
    for (const [i, id] of R.entries()) {
      if (!sim.fmAvailable(sim.robot(id))) continue;
      const loc = locs[(round + i) % locs.length];
      const o = sim.createOrder([sim.s.inventory[loc].sku], { loc });
      const tk = sim.s.tasks[o.tasks[0]]; pin(tk); pinned.push(tk);
      sim.forceAssign(o.tasks[0], id);
    }
    sim.run(65);
  }
  for (const tk of pinned) tk.excluded = {};
  sim.inject('misleadingAlarm', { ap: 'AP-1' });
  return { oldOrder: old.id };
}
const FIRST_TRUTH = {
  ap: { cause: 'network', team: 'network team', discriminators: ['firmware_breakdown', 'network_zone', 'compare_zone'], explanation: 'Access point AP-3 (zone C) was degraded. Robots working in zone C lost their link for seconds at a time; acknowledgments were lost, assignments were redelivered and some abandoned and requeued, so tasks failed intermittently for whichever robots worked in zone C and the oldest order kept being requeued. The AP-1 channel-utilization alarm was unrelated.', mitigation: 'Restrict Aisle C (within your authority) and escalate to the network team with disconnects grouped by zone.', permanent: 'Network team repairs AP-3; add per-AP alerting.', approve: [['request_ap_repair', { ap: 'AP-3' }]], secrets: ['antenna', 'cable', 'congested channel'] },
  firmware: { cause: 'firmware', team: 'robot maintenance', discriminators: ['firmware_breakdown', 'release_diff', 'compare_zone'], explanation: 'R-02, R-06 and R-09 ran firmware rc-4.3.0 (staged an hour earlier). Its Wi-Fi driver dropped links in every zone those robots visited; other robots in the same zones were fine. The AP-1 alarm was unrelated.', mitigation: 'Isolate the three robots (within your authority) and escalate to robot maintenance for a firmware rollback.', permanent: 'Firmware rollback and staged rollouts with health gates.', approve: [['repair', { robot: 'R-02', part: 'firmware_rollback' }], ['repair', { robot: 'R-06', part: 'firmware_rollback' }], ['repair', { robot: 'R-09', part: 'firmware_rollback' }]], secrets: ['driver bug', 'roaming threshold regression'] },
  inventory: { cause: 'inventory', team: 'inventory/WMS team', discriminators: ['inventory_record', 'compare_robots_pick'], explanation: 'Location C-14 showed stock in the system but was physically empty. Different robots were sent there, each failed with ITEM_NOT_FOUND, and the scheduler retried the same location — so three robots looked "faulty" and the oldest order kept failing. Network and robots were healthy.', mitigation: 'Put C-14 on inventory hold (picks use the alternate location) and escalate to the inventory team for a cycle count.', permanent: 'Cycle count and putaway scan verification.', approve: [['request_cycle_count', { loc: 'C-14' }]], secrets: ['mis-slotted', 'adjacent location'] },
};

export const COMMS_SCENARIOS = [
  // ---------------------------------------------------------------- FIRST EXERCISE
  {
    id: 'CX-first', letter: '★', title: 'Shift-end incident: three robots with intermittent task failures', tier: 1, minutes: 20, start: '06:45', shiftEndMin: 15, endState: 'handoff',
    skills: ['ack', 'audience', 'escalation', 'handoff', 'uncertainty'],
    brief: { from: 'dana', channel: 'radio', text: 'It’s 06:45. Three robots keep failing tasks on and off, and our oldest order is getting later and later. Can you give me an update?' },
    consequence: 'Outbound wave cutoff at 07:30. Delayed orders miss the truck.',
    extraOpening: [{ from: 'priya', channel: 'chat', text: 'Saw the alert in the ops channel. If you think it’s on our side, send me evidence — timestamps, robot and task IDs, and what you’ve already ruled out.', delay: 20 }, { from: 'jordan', channel: 'chat', text: 'Morning! I’m on at 07:00. I’ll need a handoff on whatever is open.', delay: 45 }],
    variants: ['ap', 'firmware', 'inventory'],
    setup: firstSetup,
    hypotheses: ['network', 'firmware', 'inventory', 'service', 'robot'],
    diagnostics: [...DIAG_FLEET, ...DIAG_ROBOT.slice(0, 6)], irrelevant: ['station_status', 'comp_battery'],
    questions: ['dana.ids', 'dana.onset', 'dana.impact', 'dana.see', 'dana.changes', 'priya.changes', 'marco.walk', 'sam.loc', 'lee.ap', 'x.restart', 'x.bad'], required: ['dana.ids'],
    deliverables: ['ack', 'ops3', 'escalation', 'notes', 'handoff', 'reflection'],
    ops: [['preserve_evidence', {}], ['restrict_zone', { aisle: 'C' }], ['unrestrict_zone', { aisle: 'C' }], ['isolate_robot', { robot: 'R-02' }], ['isolate_robot', { robot: 'R-06' }], ['isolate_robot', { robot: 'R-09' }], ['inventory_hold', { loc: 'C-14' }], ['restart_robot', { robot: 'R-02' }], ['restart_service', { service: 'fleet-manager' }], ['dispatch_test_task', { robot: 'R-03' }]],
    checks: BASE_CHECKS, relatedAlarms: ['QUEUE_AGE', 'AP_DISCONNECTS', 'ROBOT_STOPPED'],
    truth: FIRST_TRUTH, discKw: ['zone', 'firmware', 'location', 'compare', 'group'],
    resolved(sim, v) { const s = sim.s; if (v === 'ap') return { fixed: !s.faults.apDegraded, mitigated: !!s.restricted.C }; if (v === 'firmware') return { fixed: false, mitigated: ['R-02', 'R-06', 'R-09'].every((id) => sim.robot(id).isolated) }; return { fixed: !s.faults.inventoryMismatch, mitigated: s.inventory['C-14'].hold }; },
  },
  // ---------------------------------------------------------------- A. Vague report
  {
    id: 'CX-A', letter: 'A', title: 'Vague report: “Robots are not working.”', tier: 1, minutes: 15, start: '07:10', endState: 'either', skills: ['ack', 'questions', 'documentation'],
    brief: { from: 'dana', channel: 'radio', text: 'Robots are not working.' },
    consequence: 'Unknown until you scope it — could be one station or the whole floor.',
    variants: ['station', 'zone', 'timeout'],
    setup(sim, v) { sim.run(360); if (v === 'station') sim.inject('stationDown', { station: 'P-1', kind: 'scanner' }); if (v === 'zone') { sim.inject('apDegraded', { ap: 'AP-2', lossProb: 0.3 }); for (let i = 0; i < 6; i++) { orderAt(sim, `B-${String(3 + i * 2).padStart(2, '0')}`, 'P-2'); sim.run(70); } } if (v === 'timeout') sim.inject('slowService', { ago: 90 }); sim.run(v === 'zone' ? 60 : 480); },
    hypotheses: ['station', 'network', 'timeout', 'robot'],
    diagnostics: DIAG_FLEET, irrelevant: ['inventory_record', 'compare_robots_pick'],
    questions: ['dana.scope', 'dana.onset', 'dana.ids', 'dana.impact', 'dana.see', 'dana.changes', 'marco.hmi', 'lee.ap', 'priya.changes', 'x.restart', 'x.bad'], required: ['dana.scope', 'dana.onset', 'dana.ids'],
    deliverables: ['ack', 'statement', 'ops', 'notes'],
    ops: [['preserve_evidence', {}], ['reroute_station', { station: 'P-1' }], ['restore_station', { station: 'P-1' }], ['request_station_repair', { station: 'P-1' }], ['restrict_zone', { aisle: 'B' }], ['unrestrict_zone', { aisle: 'B' }], ['request_ap_repair', { ap: 'AP-2' }], ['revert_config', { change: 'CHG-2291' }], ['restart_service', { service: 'inventory-service' }]],
    checks: BASE_CHECKS, relatedAlarms: ['QUEUE_AGE', 'STATION_UNAVAILABLE', 'AP_DISCONNECTS', 'SVC_ERRORS'],
    truth: {
      station: { cause: 'station', team: 'station technician', discriminators: ['station_status', 'station_local'], explanation: 'P-1’s scanner failed; robots waited at P-1 looking healthy. “Robots not working” really meant “robots waiting at one station”.', mitigation: 'Reroute P-1 work; station technician repairs scanner.', permanent: 'Scheduler should consume station availability.', approve: [['request_station_repair', { station: 'P-1' }]], secrets: ['cable'] },
      zone: { cause: 'network', team: 'network team', discriminators: ['network_zone', 'firmware_breakdown'], explanation: 'AP-2 (zone B) was degraded; robots in zone B stopped intermittently.', mitigation: 'Restrict Aisle B; network team repairs AP-2.', permanent: 'AP monitoring.', approve: [['request_ap_repair', { ap: 'AP-2' }]], secrets: ['antenna', 'cable'] },
      timeout: { cause: 'timeout', team: 'inventory/WMS team', discriminators: ['service_health', 'trace_oldest', 'release_diff'], explanation: 'An inventory-service configuration change made stock reservations time out; robots sat idle with no work.', mitigation: 'Escalate to the inventory/WMS owners to revert the change.', permanent: 'Config review.', approve: [['revert_config', { change: 'CHG-2291' }]], secrets: ['connection pool exhausted'] },
    },
    resolved(sim, v) { const s = sim.s; if (v === 'station') return { fixed: !s.faults.stationDown, mitigated: !s.config.stationRotation['P-1'] }; if (v === 'zone') return { fixed: !s.faults.apDegraded, mitigated: !!s.restricted.B }; return { fixed: !s.faults.slowService, mitigated: false }; },
  },
  // ---------------------------------------------------------------- B. Pressure for an ETA
  {
    id: 'CX-B', letter: 'B', title: 'Pressure for an ETA before the cause is known', tier: 1, minutes: 18, start: '07:20', endState: 'either', skills: ['commitments', 'uncertainty', 'audience'],
    brief: { from: 'dana', channel: 'radio', text: 'Orders are crawling. I need to know when this will be fixed — give me a time.' },
    consequence: '07:30 wave cutoff; the operations manager must decide whether to hold the wave or call overtime.',
    pressure: true,
    variants: ['regression', 'heartbeat', 'timeout'],
    setup(sim, v) { sim.run(480); if (v === 'regression') sim.inject('regression', { ago: 120 }); if (v === 'heartbeat') sim.inject('stationDown', { station: 'P-4', kind: 'heartbeat' }); if (v === 'timeout') sim.inject('slowService', { ago: 120 }); sim.run(420); },
    hypotheses: ['regression', 'heartbeat', 'timeout', 'network'],
    diagnostics: [...DIAG_FLEET, 'station_local'], irrelevant: ['inventory_record'],
    questions: ['dana.onset', 'dana.impact', 'dana.scope', 'priya.changes', 'marco.hmi', 'avery.decision', 'x.restart'], required: ['dana.impact'],
    deliverables: ['ack', 'ops', 'mgmt', 'uncertainty', 'notes'],
    ops: [['preserve_evidence', {}], ['reroute_station', { station: 'P-4' }], ['restore_station', { station: 'P-4' }], ['rollback_release', { service: 'fleet-manager' }], ['restart_service', { service: 'station-service' }], ['revert_config', { change: 'CHG-2291' }], ['restart_service', { service: 'fleet-manager' }]],
    checks: BASE_CHECKS, relatedAlarms: ['QUEUE_AGE', 'STATION_UNAVAILABLE', 'SVC_ERRORS'],
    truth: {
      regression: { cause: 'regression', team: 'fleet software engineering', discriminators: ['release_diff', 'robot_logs_zone'], explanation: 'fleet-manager 5.2.0 shortened the acknowledgment timeout; many assignments timed out and were abandoned.', mitigation: 'Escalate with evidence; engineering rolls back.', permanent: 'Config validation and canary gates.', approve: [['rollback_release', { service: 'fleet-manager' }]], secrets: ['intended 8000'] },
      heartbeat: { cause: 'heartbeat', team: 'fleet software engineering', discriminators: ['station_status', 'station_local'], explanation: 'station-service lost P-4’s heartbeat and marked it unavailable although the station hardware was fine.', mitigation: 'Reroute P-4 work; engineering resets the station-service connector.', permanent: 'Fix connector; alert on HMI/software mismatch.', approve: [['restart_service', { service: 'station-service' }]], secrets: ['connector'] },
      timeout: { cause: 'timeout', team: 'inventory/WMS team', discriminators: ['service_health', 'trace_oldest', 'release_diff'], explanation: 'An inventory-service config change caused reservation timeouts.', mitigation: 'Inventory/WMS owners revert the change.', permanent: 'Config review.', approve: [['revert_config', { change: 'CHG-2291' }]], secrets: ['connection pool exhausted'] },
    },
    resolved(sim, v) { const s = sim.s; if (v === 'regression') return { fixed: !s.faults.regression, mitigated: false }; if (v === 'heartbeat') return { fixed: !s.faults.stationDown, mitigated: !s.config.stationRotation['P-4'] }; return { fixed: !s.faults.slowService, mitigated: false }; },
  },
  // ---------------------------------------------------------------- C. Incomplete escalation
  {
    id: 'CX-C', letter: 'C', title: 'Incomplete escalation: engineering cannot act on the ticket', tier: 2, minutes: 18, start: '06:10', endState: 'either', skills: ['escalation', 'audience', 'documentation'],
    brief: { from: 'priya', channel: 'chat', text: 'Re TKT-2207 “R-05 broken, pls fix”: I can’t act on this. Which tasks? Since when? What did you check? What do you need from us — and is it even ours?' },
    seededTicket: { id: 'TKT-2207', at: '05:58', by: 'night shift (fictional)', text: 'R-05 broken, not doing tasks. Pls fix.', team: 'fleet software engineering' },
    consequence: 'One robot out of 12 (≈8% capacity) and its stuck order waits until someone can act.',
    variants: ['stale', 'encoder'],
    setup(sim, v) { sim.run(300); const r = sim.robot('R-05'); sim.freeRobot('R-05'); r.battery = 75; if (v === 'stale') { sim.teleport('R-05', AISLES.A, ROAD_Z); const o = orderAt(sim, 'A-07', 'P-1'); sim.inject('staleLease', { robot: 'R-05' }); sim.forceAssign(o.tasks[0], 'R-05'); sim.run(6); sim.rlog(r, 'ERROR', 'WATCHDOG_RESET', 'Controller watchdog expired; rebooting'); sim._reboot(r, 28); sim.run(420); } else { sim.inject('encoder', { robot: 'R-05', ratio: 0.6 }); for (let i = 0; i < 80 && r.state !== 'fault'; i++) sim.run(15); sim.run(240); } },
    hypotheses: ['taskstate', 'encoder', 'network', 'service'],
    diagnostics: ['robot_status', 'robot_logs', 'task_record', 'comp_controller', 'comp_encoders', 'comp_drive', 'comp_wireless', 'trace_oldest', 'queue_metrics', 'release_diff'], irrelevant: ['network_zone'],
    questions: ['dana.see', 'dana.onset', 'marco.robot', 'priya.changes', 'x.restart'], required: [],
    deliverables: ['escalation', 'eng', 'ticket'],
    ops: [['preserve_evidence', { robot: 'R-05' }], ['isolate_robot', { robot: 'R-05' }], ['restart_robot', { robot: 'R-05' }], ['release_task_lease', { robot: 'R-05' }], ['send_to_maintenance', { robot: 'R-05' }], ['recover_payload', { robot: 'R-05' }], ['return_to_service', { robot: 'R-05' }]],
    checks: BASE_CHECKS, relatedAlarms: ['QUEUE_AGE', 'ROBOT_STOPPED'],
    truth: {
      stale: { cause: 'taskstate', team: 'fleet software engineering', discriminators: ['task_record', 'robot_logs', 'comp_controller'], explanation: 'After a watchdog reboot (new session) the fleet manager kept R-05’s old assignment without an ack timer; R-05 was idle but considered busy.', mitigation: 'Engineering releases the stale assignment (same idempotency key).', permanent: 'Session reconciliation fix.', approve: [['release_task_lease', { robot: 'R-05' }]], secrets: ['reconcile'] },
      encoder: { cause: 'encoder', team: 'robot maintenance', discriminators: ['comp_encoders', 'robot_logs', 'comp_drive'], explanation: 'R-05’s left encoder under-counted; odometry disagreed with localization until a wheel-feedback fault disabled the drive. Not a software ticket.', mitigation: 'Isolate R-05; maintenance replaces the encoder (de-energized).', permanent: 'Track odometry residual trend.', approve: [['repair', { robot: 'R-05', part: 'replace_encoder' }]], secrets: ['60%'] },
    },
    resolved(sim, v) { const r = sim.robot('R-05'); if (v === 'stale') return { fixed: false, mitigated: !(sim.s.fm.assignments['R-05'] && !r.taskId && sim.s.fm.assignments['R-05'].deadline == null) }; return { fixed: !sim.s.faults.encoder, mitigated: r.isolated }; },
  },
  // ---------------------------------------------------------------- D. Shift transition
  {
    id: 'CX-D', letter: 'D', title: 'Shift transition with an active incident', tier: 2, minutes: 15, start: '06:50', shiftEndMin: 10, endState: 'handoff', skills: ['handoff', 'ownership', 'documentation'],
    brief: { from: 'jordan', channel: 'chat', text: 'I’m in at 07:00. What am I taking over?' },
    consequence: 'If the next shift does not know what is open, work is duplicated or forgotten and the incident recurs.',
    variants: ['charger', 'markers', 'contacts'],
    setup(sim, v) {
      sim.run(300);
      if (v === 'charger' || v === 'contacts') { for (const c of Object.values(sim.s.chargers)) if (c.occupiedBy) { const rr = sim.robot(c.occupiedBy); rr.charger = null; rr.state = 'idle'; rr.battery = Math.max(rr.battery, 60); c.occupiedBy = null; } for (const rr of sim.s.robots) if (rr.battery < 30) rr.battery = 55; const r = sim.robot('R-04'); sim.freeRobot('R-04'); sim.teleport('R-04', 30, ROAD_Z); r.battery = 24; sim.inject(v === 'charger' ? 'chargerFault' : 'chargeContacts', v === 'charger' ? { charger: 'C-1' } : { robot: 'R-04' }); sim.run(200); }
      if (v === 'charger') { sim.operate('redock', { robot: 'R-04', charger: 'C-2' }); sim.run(30); sim.operate('request_charger_repair', { charger: 'C-1' }); delayPending(sim, 'charger_repaired', 2400); sim.run(120); }
      if (v === 'contacts') { sim.operate('redock', { robot: 'R-04', charger: 'C-2' }); sim.run(90); sim.operate('isolate_robot', { robot: 'R-04' }); sim.run(30); }
      if (v === 'markers') { const r = sim.robot('R-10'); sim.freeRobot('R-10'); sim.teleport('R-10', AISLES.D, ROAD_Z); const o = orderAt(sim, 'D-11', 'P-4'); sim.inject('markerDamage', { aisle: 'D', zMin: 0, zMax: 6 }); sim.forceAssign(o.tasks[0], 'R-10'); sim.run(120); sim.operate('restrict_zone', { aisle: 'D' }); sim.operate('isolate_robot', { robot: 'R-10' }); sim.operate('request_marker_repair', { aisle: 'D' }); delayPending(sim, 'markers_repaired', 2400); sim.run(240); void r; }
    },
    priorActions: true,
    hypotheses: ['charger', 'contacts', 'localization', 'robot'],
    diagnostics: ['fleet_overview', 'alarm_list', 'queue_metrics', 'charger_status', 'comp_battery', 'redock_test', 'robot_status', 'comp_localization', 'compare_zone', 'camera_view'], irrelevant: ['release_diff'],
    questions: ['dana.see', 'marco.charger', 'marco.walk', 'jordan.avail', 'x.bad'], required: [],
    deliverables: ['ops', 'handoff', 'notes'],
    ops: [['preserve_evidence', {}], ['request_charger_repair', { charger: 'C-1' }], ['send_to_maintenance', { robot: 'R-04' }], ['dispatch_test_task', { robot: 'R-04' }], ['request_marker_repair', { aisle: 'D' }], ['return_to_service', { robot: 'R-10' }]],
    checks: ['target_healthy', 'full_task', 'no_dup_stranded', 'safety_valid', 'neighbors_healthy'], relatedAlarms: ['CHARGE_FAULT', 'ROBOT_STOPPED'],
    truth: {
      charger: { cause: 'charger', team: 'station technician', discriminators: ['redock_test', 'charger_status'], explanation: 'Charger C-1 delivered 0 A; R-04 charged on C-2. C-1 awaits a technician.', mitigation: 'Keep C-1 out of service; R-04 on C-2.', permanent: 'Repair C-1; per-dock output monitoring.', approve: [], secrets: ['fuse'] },
      markers: { cause: 'localization', team: 'facilities', discriminators: ['compare_zone', 'comp_localization', 'camera_view'], explanation: 'Damaged floor markers in Aisle D; aisle restricted and R-10 isolated while facilities repairs markers.', mitigation: 'Aisle D restricted; R-10 isolated.', permanent: 'Marker repair; inspection schedule.', approve: [], secrets: [] },
      contacts: { cause: 'contacts', team: 'robot maintenance', discriminators: ['redock_test', 'comp_battery'], explanation: 'R-04’s charging contacts were worn; it failed on two chargers. R-04 isolated pending maintenance.', mitigation: 'R-04 isolated.', permanent: 'Replace contacts; contact-wear inspection.', approve: [['repair', { robot: 'R-04', part: 'replace_charge_contacts' }]], secrets: ['worn'] },
    },
    resolved(sim, v) { if (v === 'charger') return { fixed: !sim.s.faults.chargerFault, mitigated: sim.robot('R-04').charger !== 'C-1' }; if (v === 'markers') return { fixed: !sim.s.faults.markerDamage, mitigated: !!sim.s.restricted.D }; return { fixed: !sim.s.faults.chargeContacts, mitigated: sim.robot('R-04').isolated }; },
  },
  // ---------------------------------------------------------------- E. Recovery without confirmed cause
  {
    id: 'CX-E', letter: 'E', title: 'Service restored — cause not confirmed', tier: 1, minutes: 18, start: '08:05', endState: 'close', skills: ['uncertainty', 'documentation'], unknownRootCause: true,
    brief: { from: 'dana', channel: 'radio', text: 'Robots around Aisle B keep dropping out. Can someone look?' },
    consequence: 'Zone B picks slow down; if it recurs during the 10:00 wave it will hurt.',
    variants: ['ap_unknown', 'heartbeat_unknown'],
    setup(sim, v) { sim.run(300); if (v === 'ap_unknown') { sim.inject('apDegraded', { ap: 'AP-2', lossProb: 0.25, unknownCause: true }); for (let i = 0; i < 6; i++) { orderAt(sim, `B-${String(4 + i * 2).padStart(2, '0')}`, 'P-2'); sim.run(75); } } else { sim.inject('stationDown', { station: 'P-3', kind: 'heartbeat' }); sim.run(420); } },
    hypotheses: ['unknown', 'heartbeat', 'firmware', 'station'],
    diagnostics: [...DIAG_FLEET, 'station_local'], irrelevant: ['inventory_record'],
    questions: ['dana.scope', 'dana.onset', 'lee.ap', 'marco.hmi', 'priya.changes'], required: [],
    deliverables: ['ops', 'pir'],
    ops: [['preserve_evidence', {}], ['restrict_zone', { aisle: 'B' }], ['unrestrict_zone', { aisle: 'B' }], ['request_ap_repair', { ap: 'AP-2' }], ['reroute_station', { station: 'P-3' }], ['restore_station', { station: 'P-3' }], ['restart_service', { service: 'station-service' }]],
    checks: BASE_CHECKS, relatedAlarms: ['AP_DISCONNECTS', 'STATION_UNAVAILABLE', 'QUEUE_AGE'],
    truth: {
      ap_unknown: { cause: 'unknown', team: 'network team', discriminators: ['network_zone', 'firmware_breakdown'], explanation: 'Disconnects concentrated in zone B; the network team rebooted AP-2 and it recovered, but pre-reboot AP logs were not retained. Root cause NOT determined.', mitigation: 'AP-2 reboot by network team.', permanent: 'Unknown — log retention, monitoring, vendor ticket.', approve: [['request_ap_repair', { ap: 'AP-2' }]], secrets: [] },
      heartbeat_unknown: { cause: 'heartbeat', team: 'fleet software engineering', discriminators: ['station_status', 'station_local'], explanation: 'station-service marked P-3 unavailable while its HMI showed READY. A connector restart restored it; connector logs were lost in the restart, so why the heartbeat stopped is NOT determined.', mitigation: 'Reroute, then engineering restarts station-service.', permanent: 'Unknown — keep connector logs, add HMI/software mismatch alert.', approve: [['restart_service', { service: 'station-service' }]], secrets: [] },
    },
    resolved(sim, v) { if (v === 'ap_unknown') return { fixed: !sim.s.faults.apDegraded, mitigated: !!sim.s.restricted.B }; return { fixed: !sim.s.faults.stationDown, mitigated: !sim.s.config.stationRotation['P-3'] }; },
  },
  // ---------------------------------------------------------------- F. Conflicting explanations
  {
    id: 'CX-F', letter: 'F', title: 'Conflicting explanations: robot fault or service issue?', tier: 2, minutes: 20, start: '09:15', endState: 'either', skills: ['disagreement', 'escalation', 'audience'],
    brief: { from: 'dana', channel: 'radio', text: 'R-08 keeps dropping its tasks. It’s broken — pull it out.' },
    extraOpening: [{ from: 'priya', channel: 'chat', text: 'fleet-manager logs show ACK timeouts on R-08’s tasks. My guess is service-side, not the robot. Don’t pull it yet.', delay: 25 }],
    consequence: 'Pulling a healthy robot costs ≈8% capacity; ignoring a real robot fault keeps failing work.',
    variants: ['service', 'robot', 'zone'],
    setup(sim, v) {
      sim.run(360); const r = sim.robot('R-08'); r.firmware = 'rc-4.3.1-trial'; sim.s.releases.push({ id: 'FW-046', t: sim.s.t - 5400, service: 'robot firmware', from: 'rc-4.2.1', to: 'rc-4.3.1-trial', changes: ['Trial build on R-08 only'], by: 'fleet ops (simulated)' });
      if (v === 'robot') sim.inject('firmwareWifi', { firmware: 'rc-4.3.1-trial', lossProb: 0.32 });
      if (v === 'zone') { sim.inject('apDegraded', { ap: 'AP-4', lossProb: 0.32 }); }
      for (let i = 0; i < 6; i++) { if (v === 'service' && i === 4) sim.inject('regression', { ago: 30 }); sim.freeRobot('R-08', 60); const o = orderAt(sim, `${v === 'zone' ? 'D' : 'B'}-${String(3 + i * 2).padStart(2, '0')}`, 'P-4'); sim.forceAssign(o.tasks[0], 'R-08'); sim.run(80); }
    },
    hypotheses: ['robot', 'service', 'firmware', 'zone'],
    diagnostics: ['robot_status', 'robot_logs', 'comp_wireless', 'robot_logs_zone', 'network_zone', 'firmware_breakdown', 'release_diff', 'service_health', 'queue_metrics', 'compare_zone', 'comp_drive'], irrelevant: ['comp_battery'],
    questions: ['dana.see', 'dana.onset', 'priya.changes', 'lee.ap', 'x.bad'], required: [],
    deliverables: ['disagreement', 'eng', 'notes'],
    ops: [['preserve_evidence', {}], ['isolate_robot', { robot: 'R-08' }], ['return_to_service', { robot: 'R-08' }], ['restrict_zone', { aisle: 'D' }], ['unrestrict_zone', { aisle: 'D' }], ['rollback_release', { service: 'fleet-manager' }], ['restart_robot', { robot: 'R-08' }]],
    checks: BASE_CHECKS, relatedAlarms: ['QUEUE_AGE', 'AP_DISCONNECTS', 'ROBOT_STOPPED'],
    truth: {
      service: { cause: 'service', team: 'fleet software engineering', discriminators: ['robot_logs_zone', 'release_diff'], explanation: 'A fleet-manager release shortened the ack timeout; ACK timeouts happened across the whole fleet. R-08 was simply the most visible.', mitigation: 'Engineering rolls back.', permanent: 'Config validation.', approve: [['rollback_release', { service: 'fleet-manager' }]], secrets: [] },
      robot: { cause: 'firmware', team: 'robot maintenance', discriminators: ['firmware_breakdown', 'comp_wireless', 'robot_logs_zone'], explanation: 'R-08’s trial firmware dropped Wi-Fi links wherever it went; other robots (and the service) were fine. Operations was right that it was robot-specific.', mitigation: 'Isolate R-08; maintenance rolls back firmware.', permanent: 'Trial builds need health gates.', approve: [['repair', { robot: 'R-08', part: 'firmware_rollback' }]], secrets: [] },
      zone: { cause: 'zone', team: 'network team', discriminators: ['network_zone', 'firmware_breakdown'], explanation: 'AP-4 (zone D) was degraded and R-08 happened to work mostly in Aisle D. Neither view was right: it was the place, not the robot or the service. Zone D has no disconnect exporter, so the dashboard showed NO DATA rather than a spike.', mitigation: 'Restrict Aisle D; network team repairs AP-4.', permanent: 'Deploy the zone D exporter; AP monitoring.', approve: [['request_ap_repair', { ap: 'AP-4' }]], secrets: [] },
    },
    resolved(sim, v) { if (v === 'service') return { fixed: !sim.s.faults.regression, mitigated: false }; if (v === 'robot') return { fixed: false, mitigated: sim.robot('R-08').isolated }; return { fixed: !sim.s.faults.apDegraded, mitigated: !!sim.s.restricted.D }; },
  },
  // ---------------------------------------------------------------- G. Incorrect earlier update
  {
    id: 'CX-G', letter: 'G', title: 'Your earlier update was wrong', tier: 3, minutes: 18, start: '06:34', endState: 'either', skills: ['correction', 'uncertainty', 'documentation'],
    brief: { from: 'marco', channel: 'radio', text: 'Walked Aisle C for your obstruction call — there’s nothing on the floor. Aisle is clear.' },
    priorUpdate: { at: '06:20', to: 'dana', text: 'R-07 is stopped by an obstruction in Aisle C. Floor team will clear it; R-07 should be back in about 10 minutes.', hyp: 'obstruction' },
    consequence: 'Operations planned around your 06:30 ETA. The order behind R-07 is still waiting.',
    variants: ['localization', 'taskstate', 'network'],
    setup(sim, v) {
      sim.run(420); const r = sim.robot('R-07'); sim.freeRobot('R-07'); r.battery = 78; sim.teleport('R-07', AISLES.C, ROAD_Z);
      const o = orderAt(sim, 'C-13', 'P-3');
      if (v === 'localization') sim.inject('markerDamage', { aisle: 'C', zMin: 3.2, zMax: 9.5 });
      if (v === 'network') sim.inject('apDegraded', { ap: 'AP-3', lossProb: 0.32 });
      if (v === 'taskstate') sim.inject('staleLease', { robot: 'R-07' });
      sim.forceAssign(o.tasks[0], 'R-07');
      if (v === 'taskstate') { sim.run(12); sim.rlog(r, 'ERROR', 'WATCHDOG_RESET', 'Controller watchdog expired; rebooting'); sim._reboot(r, 28); }
      sim.run(420);
    },
    hypotheses: ['obstruction', 'localization', 'taskstate', 'network'],
    diagnostics: ['robot_status', 'robot_logs', 'comp_obstacle', 'comp_localization', 'comp_wireless', 'comp_controller', 'task_record', 'compare_zone', 'camera_view', 'network_zone', 'queue_metrics'], irrelevant: ['comp_battery'],
    questions: ['dana.see', 'dana.impact', 'marco.walk', 'x.restart'], required: [],
    deliverables: ['correction', 'notes'],
    ops: [['preserve_evidence', { robot: 'R-07' }], ['restrict_zone', { aisle: 'C' }], ['unrestrict_zone', { aisle: 'C' }], ['request_marker_repair', { aisle: 'C' }], ['request_ap_repair', { ap: 'AP-3' }], ['isolate_robot', { robot: 'R-07' }], ['return_to_service', { robot: 'R-07' }], ['release_task_lease', { robot: 'R-07' }], ['restart_robot', { robot: 'R-07' }]],
    checks: BASE_CHECKS, relatedAlarms: ['ROBOT_STOPPED', 'QUEUE_AGE', 'AP_DISCONNECTS'],
    truth: {
      localization: { cause: 'localization', team: 'facilities', discriminators: ['comp_localization', 'comp_obstacle', 'camera_view'], explanation: 'Damaged floor markers in Aisle C made robots lose localization; the obstacle sensor was clear.', mitigation: 'Restrict Aisle C, isolate R-07, facilities repairs markers.', permanent: 'Marker inspections.', approve: [], secrets: [] },
      taskstate: { cause: 'taskstate', team: 'fleet software engineering', discriminators: ['task_record', 'comp_controller'], explanation: 'R-07 was idle after a watchdog reboot; the fleet manager still held a stale assignment.', mitigation: 'Engineering releases the stale assignment.', permanent: 'Session reconciliation fix.', approve: [['release_task_lease', { robot: 'R-07' }]], secrets: [] },
      network: { cause: 'network', team: 'network team', discriminators: ['comp_wireless', 'network_zone', 'compare_zone'], explanation: 'AP-3 was degraded; R-07 kept losing its link in zone C.', mitigation: 'Restrict Aisle C; network team repairs AP-3.', permanent: 'AP monitoring.', approve: [['request_ap_repair', { ap: 'AP-3' }]], secrets: [] },
    },
    resolved(sim, v) { const s = sim.s, r = sim.robot('R-07'); if (v === 'localization') return { fixed: !s.faults.markerDamage, mitigated: !!s.restricted.C && (r.state !== 'loc_lost' || r.isolated) }; if (v === 'network') return { fixed: !s.faults.apDegraded, mitigated: !!s.restricted.C }; return { fixed: false, mitigated: !(s.fm.assignments['R-07'] && s.fm.assignments['R-07'].deadline == null && !r.taskId) }; },
  },
  // ---------------------------------------------------------------- H. Recurring failure → runbook
  {
    id: 'CX-H', letter: 'H', title: 'Recurring failure: build and validate a runbook', tier: 2, minutes: 22, start: '10:40', endState: 'either', skills: ['runbook', 'documentation'],
    brief: { from: 'dana', channel: 'radio', text: 'R-04 isn’t charging again. That’s the third time this week.' },
    history: [{ id: 'TKT-1187', when: 'Nov 6', text: 'R-04 not charging. Reseated at dock, worked. Closed.' }, { id: 'TKT-1203', when: 'Nov 9', text: 'R-04 not charging. Moved to another dock, OK. Closed.' }],
    consequence: 'A robot that cannot charge goes unavailable; repeat failures waste technician time without a reusable procedure.',
    variants: ['contacts', 'charger'],
    setup(sim, v) { sim.run(300); for (const c of Object.values(sim.s.chargers)) if (c.occupiedBy) { const rr = sim.robot(c.occupiedBy); rr.charger = null; rr.state = 'idle'; rr.battery = Math.max(rr.battery, 60); c.occupiedBy = null; } for (const rr of sim.s.robots) if (rr.battery < 30) rr.battery = 55; const r = sim.robot('R-04'); sim.freeRobot('R-04'); sim.teleport('R-04', 30, ROAD_Z); r.battery = 24; sim.inject(v === 'contacts' ? 'chargeContacts' : 'chargerFault', v === 'contacts' ? { robot: 'R-04' } : { charger: 'C-1' }); sim.run(240); },
    hypotheses: ['contacts', 'charger', 'robot'],
    diagnostics: ['robot_status', 'comp_battery', 'charger_status', 'robot_logs', 'redock_test', 'alarm_list'], irrelevant: ['release_diff', 'network_zone'],
    questions: ['marco.charger', 'dana.see', 'kai.history'], required: [],
    deliverables: ['runbook', 'kb', 'notes'],
    ops: [['preserve_evidence', { robot: 'R-04' }], ['redock', { robot: 'R-04', charger: 'C-2' }], ['request_charger_repair', { charger: 'C-1' }], ['isolate_robot', { robot: 'R-04' }], ['send_to_maintenance', { robot: 'R-04' }], ['return_to_service', { robot: 'R-04' }]],
    checks: ['target_healthy', 'full_task', 'no_dup_stranded', 'safety_valid', 'alarms_clear', 'neighbors_healthy'], relatedAlarms: ['CHARGE_FAULT'],
    truth: {
      contacts: { cause: 'contacts', team: 'robot maintenance', discriminators: ['redock_test', 'comp_battery'], explanation: 'R-04’s contacts were worn — it failed on any charger. Earlier "fixes" (reseating, moving docks) only helped by chance.', mitigation: 'Isolate; maintenance replaces contacts.', permanent: 'Contact-wear inspection.', approve: [['repair', { robot: 'R-04', part: 'replace_charge_contacts' }]], secrets: ['worn'] },
      charger: { cause: 'charger', team: 'station technician', discriminators: ['redock_test', 'charger_status'], explanation: 'Charger C-1 output had failed; R-04 kept being assigned C-1 first. Moving docks "fixed" it last time.', mitigation: 'Move R-04 to a good charger; take C-1 out for repair.', permanent: 'Per-dock output monitoring.', approve: [], secrets: ['fuse'] },
    },
    resolved(sim, v) { const r = sim.robot('R-04'); if (v === 'contacts') return { fixed: !sim.s.faults.chargeContacts, mitigated: r.isolated }; return { fixed: !sim.s.faults.chargerFault, mitigated: r.charger && r.charger !== 'C-1' && r.chargeA > 0 }; },
  },
  // ---------------------------------------------------------------- I. Partial recovery
  {
    id: 'CX-I', letter: 'I', title: 'Partial recovery: robot healthy, queue still growing', tier: 1, minutes: 18, start: '06:42', endState: 'either', skills: ['verification', 'instruction', 'uncertainty'],
    brief: { from: 'dana', channel: 'radio', text: 'R-07 is moving again — nice work. Can we close this one?' },
    priorActions: true,
    consequence: 'Closing now would leave a growing backlog unowned.',
    variants: ['station', 'timeout', 'regression'],
    setup(sim, v) {
      sim.run(420); const r = sim.robot('R-07'); sim.freeRobot('R-07'); r.battery = 80; sim.teleport('R-07', AISLES.A, ROAD_Z);
      const o = orderAt(sim, 'A-05', 'P-1'); sim.inject('staleLease', { robot: 'R-07' }); sim.forceAssign(o.tasks[0], 'R-07'); sim.run(6); sim._reboot(r, 28); sim.run(200);
      sim.operate('preserve_evidence', { robot: 'R-07' }); sim.operate('release_task_lease', { robot: 'R-07' }); delete sim.s.faults.staleLease;
      if (v === 'station') sim.inject('stationDown', { station: 'P-4', kind: 'scanner' }); if (v === 'timeout') sim.inject('slowService', { ago: 60 }); if (v === 'regression') sim.inject('regression', { ago: 60 });
      sim.run(420);
    },
    hypotheses: ['station', 'timeout', 'regression', 'taskstate'],
    diagnostics: [...DIAG_FLEET, 'station_local', 'robot_status', 'task_record'], irrelevant: ['inventory_record'],
    questions: ['dana.impact', 'dana.scope', 'marco.hmi', 'priya.changes', 'x.bad'], required: [],
    deliverables: ['ops', 'instruction', 'notes'],
    ops: [['preserve_evidence', {}], ['reroute_station', { station: 'P-4' }], ['restore_station', { station: 'P-4' }], ['request_station_repair', { station: 'P-4' }], ['revert_config', { change: 'CHG-2291' }], ['rollback_release', { service: 'fleet-manager' }], ['restart_service', { service: 'fleet-manager' }]],
    checks: BASE_CHECKS, relatedAlarms: ['QUEUE_AGE', 'STATION_UNAVAILABLE', 'SVC_ERRORS'],
    truth: {
      station: { cause: 'station', team: 'station technician', discriminators: ['station_status', 'station_local'], explanation: 'R-07 was fixed, but P-4’s scanner failed; robots queued at P-4 and the backlog kept growing.', mitigation: 'Reroute P-4; technician repairs it.', permanent: 'Station availability in scheduler.', approve: [['request_station_repair', { station: 'P-4' }]], secrets: [] },
      timeout: { cause: 'timeout', team: 'inventory/WMS team', discriminators: ['service_health', 'trace_oldest', 'release_diff'], explanation: 'R-07 was fixed, but an inventory-service config change made reservations time out.', mitigation: 'Owners revert the change.', permanent: 'Config review.', approve: [['revert_config', { change: 'CHG-2291' }]], secrets: ['connection pool exhausted'] },
      regression: { cause: 'regression', team: 'fleet software engineering', discriminators: ['release_diff', 'robot_logs_zone'], explanation: 'R-07 was fixed, but a fleet-manager release caused ack timeouts fleet-wide.', mitigation: 'Engineering rolls back.', permanent: 'Canary gates.', approve: [['rollback_release', { service: 'fleet-manager' }]], secrets: [] },
    },
    resolved(sim, v) { const s = sim.s; if (v === 'station') return { fixed: !s.faults.stationDown, mitigated: !s.config.stationRotation['P-4'] }; if (v === 'timeout') return { fixed: !s.faults.slowService, mitigated: false }; return { fixed: !s.faults.regression, mitigated: false }; },
  },
  // ---------------------------------------------------------------- J. Concurrent incidents
  {
    id: 'CX-J', letter: 'J', title: 'Two incidents at once: prioritize', tier: 3, minutes: 22, start: '11:05', endState: 'either', skills: ['prioritization', 'instruction', 'audience'],
    brief: { from: 'dana', channel: 'radio', text: 'Two things: [I1] — and also [I2]. Which do you want first?' },
    support: 'Available: Marco (floor technician). Network team unavailable until 13:00. Fleet software on-call (Priya) answers within ~10 min. Robot maintenance has one person on a break until 11:30.',
    consequence: 'Picking the wrong first issue can leave a safety risk open or a fleet-wide slowdown running.',
    variants: ['station_charger', 'person_timeout', 'regression_obstruction'],
    issues: {
      station_charger: [{ id: 'I1', label: 'Orders slowing; several robots waiting near P-2' }, { id: 'I2', label: 'R-04 docked but its battery is not rising' }],
      person_timeout: [{ id: 'I1', label: 'R-11 stopped in Aisle D showing E-STOP — a cleaner may still be in the aisle' }, { id: 'I2', label: 'Orders slow and many robots idle' }],
      regression_obstruction: [{ id: 'I1', label: 'Throughput down across the fleet; many tasks abandoned' }, { id: 'I2', label: 'Robots stopping and retrying in Aisle B' }],
    },
    firstPriority: { station_charger: 'I1', person_timeout: 'I1', regression_obstruction: 'I1' },
    firstWhy: { station_charger: 'P-2 blocks a quarter of station capacity (high impact); R-04 is one robot with spare chargers available.', person_timeout: 'A possible person in an aisle is a safety issue — confirm the area and keep robots out before anything else.', regression_obstruction: 'The fleet-wide slowdown has the largest impact; the aisle B obstruction can be handled in parallel by the available floor technician.' },
    setup(sim, v) {
      sim.run(360);
      if (v === 'station_charger') { sim.inject('stationDown', { station: 'P-2', kind: 'scanner' }); const r = sim.robot('R-04'); sim.freeRobot('R-04'); sim.teleport('R-04', 30, ROAD_Z); r.battery = 24; sim.inject('chargeContacts', { robot: 'R-04' }); }
      if (v === 'person_timeout') { sim.freeRobot('R-11'); sim.teleport('R-11', AISLES.D, -4); sim.inject('estop', { robot: 'R-11' }); sim.inject('slowService', { ago: 60 }); }
      if (v === 'regression_obstruction') { sim.inject('regression', { ago: 60 }); sim.inject('obstruction', { aisle: 'B', z: 3.4 }); }
      sim.run(420);
    },
    hypotheses: ['station', 'contacts', 'estop', 'timeout', 'regression', 'obstruction'],
    diagnostics: [...DIAG_FLEET, 'station_local', 'charger_status', 'comp_battery'], irrelevant: ['inventory_record'],
    questions: ['dana.impact', 'dana.people', 'marco.estop', 'marco.hmi', 'marco.walk', 'priya.changes', 'lee.ap'], required: ['dana.impact'],
    deliverables: ['prioritization', 'instruction', 'mgmt'],
    ops: [['preserve_evidence', {}], ['reroute_station', { station: 'P-2' }], ['request_station_repair', { station: 'P-2' }], ['restore_station', { station: 'P-2' }], ['isolate_robot', { robot: 'R-04' }], ['restrict_zone', { aisle: 'D' }], ['unrestrict_zone', { aisle: 'D' }], ['request_estop_inspection', { robot: 'R-11' }], ['revert_config', { change: 'CHG-2291' }], ['rollback_release', { service: 'fleet-manager' }], ['request_aisle_clear', { aisle: 'B' }]],
    checks: ['full_task', 'no_dup_stranded', 'safety_valid', 'queue_recovered', 'neighbors_healthy'], relatedAlarms: ['QUEUE_AGE', 'STATION_UNAVAILABLE', 'ROBOT_STOPPED', 'SVC_ERRORS'],
    truth: {
      station_charger: { cause: 'station', team: 'station technician', discriminators: ['station_status', 'station_local', 'comp_battery'], explanation: 'P-2 scanner down (high impact) and R-04 contacts worn (low impact).', mitigation: 'Reroute P-2 + technician; isolate R-04.', permanent: 'Repair scanner; replace contacts.', approve: [['request_station_repair', { station: 'P-2' }]], secrets: [] },
      person_timeout: { cause: 'estop', team: 'inventory/WMS team', discriminators: ['comp_estop', 'service_health'], explanation: 'R-11’s E-stop was pressed by a cleaner (safety first: confirm area clear); separately, an inventory-service config change caused fleet-wide slowness.', mitigation: 'Restrict Aisle D and request shift-lead inspection; escalate the slowdown.', permanent: 'Cleaning crew procedure; config review.', approve: [['revert_config', { change: 'CHG-2291' }]], secrets: [] },
      regression_obstruction: { cause: 'regression', team: 'fleet software engineering', discriminators: ['release_diff', 'robot_logs_zone', 'comp_obstacle'], explanation: 'A fleet-manager release caused fleet-wide ack timeouts; separately a fallen tote blocked Aisle B.', mitigation: 'Escalate for rollback; Marco clears Aisle B under lockout in parallel.', permanent: 'Canary gates; tote inspection.', approve: [['rollback_release', { service: 'fleet-manager' }]], secrets: [] },
    },
    resolved(sim, v) { const s = sim.s; if (v === 'station_charger') return { fixed: !s.faults.stationDown, mitigated: !s.config.stationRotation['P-2'] }; if (v === 'person_timeout') return { fixed: !s.faults.estop && !s.faults.slowService, mitigated: !!s.restricted.D }; return { fixed: !s.faults.regression && !s.faults.obstruction, mitigated: false }; },
  },
  // ---------------------------------------------------------------- CAPSTONE (≈40 min)
  {
    id: 'CX-CAP', letter: 'C+', title: 'Capstone: correction, concurrency and shift handoff (≈40 min)', tier: 3, minutes: 40, start: '06:30', shiftEndMin: 30, endState: 'handoff', capstone: true,
    skills: ['ack', 'questions', 'audience', 'uncertainty', 'commitments', 'instruction', 'disagreement', 'correction', 'escalation', 'handoff'],
    brief: { from: 'dana', channel: 'radio', text: 'Robots are failing tasks again and the oldest order is way behind. What’s going on?' },
    priorUpdate: { at: '06:12', to: 'dana', text: 'R-02 has a hardware fault; maintenance will look at it. Everything else is fine.', hyp: 'robot' },
    secondIncident: { atMin: 8, inject: ['stationDown', { station: 'P-1', kind: 'scanner' }], text: 'New one: robots are lining up at P-1 and not moving on.' },
    consequence: '07:30 wave cutoff, a second issue arriving, and a shift change at 07:00.',
    variants: ['ap', 'firmware', 'inventory'],
    setup: firstSetup,
    hypotheses: ['network', 'firmware', 'inventory', 'robot', 'station', 'service'],
    diagnostics: [...DIAG_FLEET, ...DIAG_ROBOT.slice(0, 6), 'station_local'], irrelevant: ['comp_battery'],
    questions: ['dana.ids', 'dana.onset', 'dana.impact', 'dana.see', 'dana.changes', 'priya.changes', 'marco.walk', 'marco.hmi', 'sam.loc', 'lee.ap', 'x.restart'], required: ['dana.ids'],
    deliverables: ['ack', 'correction', 'ops', 'prioritization', 'escalation', 'instruction', 'mgmt', 'handoff', 'pir', 'reflection'],
    issues: { ap: [{ id: 'I1', label: 'Intermittent task failures on several robots' }, { id: 'I2', label: 'Robots queuing at P-1' }], firmware: [{ id: 'I1', label: 'Intermittent task failures on several robots' }, { id: 'I2', label: 'Robots queuing at P-1' }], inventory: [{ id: 'I1', label: 'Intermittent task failures on several robots' }, { id: 'I2', label: 'Robots queuing at P-1' }] },
    firstPriority: { ap: 'I2', firmware: 'I2', inventory: 'I2' }, firstWhy: { ap: 'A whole station down blocks a quarter of capacity and has a quick mitigation (reroute); the intermittent failures are slower to diagnose.', firmware: 'A whole station down blocks a quarter of capacity and has a quick mitigation (reroute).', inventory: 'A whole station down blocks a quarter of capacity and has a quick mitigation (reroute).' },
    ops: [['preserve_evidence', {}], ['restrict_zone', { aisle: 'C' }], ['unrestrict_zone', { aisle: 'C' }], ['isolate_robot', { robot: 'R-02' }], ['isolate_robot', { robot: 'R-06' }], ['isolate_robot', { robot: 'R-09' }], ['inventory_hold', { loc: 'C-14' }], ['reroute_station', { station: 'P-1' }], ['request_station_repair', { station: 'P-1' }], ['restore_station', { station: 'P-1' }], ['restart_service', { service: 'fleet-manager' }]],
    checks: BASE_CHECKS, relatedAlarms: ['QUEUE_AGE', 'AP_DISCONNECTS', 'ROBOT_STOPPED', 'STATION_UNAVAILABLE'],
    truth: FIRST_TRUTH, discKw: ['zone', 'firmware', 'location', 'compare', 'group'],
    resolved(sim, v) { return COMMS_SCENARIOS[0].resolved(sim, v); },
  },
  // ---------------------------------------------------------------- WORKED EXAMPLE (stage 1)
  {
    id: 'CX-WORKED', letter: 'W', title: 'Worked example: robots waiting at P-3', tier: 0, minutes: 12, start: '05:40', endState: 'close', worked: true, skills: [],
    brief: { from: 'dana', channel: 'radio', text: 'Robots are piling up at P-3 and not leaving.' },
    consequence: 'P-3 is a quarter of station capacity.',
    variants: ['scanner'],
    setup(sim) { sim.run(300); sim.inject('stationDown', { station: 'P-3', kind: 'scanner' }); sim.run(360); },
    hypotheses: ['station', 'heartbeat', 'robot'], diagnostics: ['fleet_overview', 'queue_metrics', 'station_status', 'station_local'], irrelevant: [], questions: ['dana.onset', 'dana.impact', 'marco.hmi'], required: [],
    deliverables: [], ops: [['reroute_station', { station: 'P-3' }], ['request_station_repair', { station: 'P-3' }], ['restore_station', { station: 'P-3' }]],
    checks: ['target_healthy', 'full_task', 'no_dup_stranded', 'queue_recovered', 'neighbors_healthy'], relatedAlarms: ['STATION_UNAVAILABLE', 'QUEUE_AGE'],
    truth: { scanner: { cause: 'station', team: 'station technician', discriminators: ['station_local', 'station_status'], explanation: 'P-3’s scanner stopped responding.', mitigation: 'Reroute P-3; technician repairs scanner.', permanent: 'Scheduler should consume station availability.', approve: [['request_station_repair', { station: 'P-3' }]], secrets: [] } },
    resolved(sim) { return { fixed: !sim.s.faults.stationDown, mitigated: !sim.s.config.stationRotation['P-3'] }; },
  },
];
export const COMMS_MAP = Object.fromEntries(COMMS_SCENARIOS.map((s) => [s.id, s]));

export function startComms(id, seed, forcedVariant = null) {
  const sc = COMMS_MAP[id];
  const sim = new Sim({ seed });
  const variant = forcedVariant || sc.variants[seed % sc.variants.length];
  sc.setup(sim, variant);
  setClock(sim, sc.start);
  const rng = makeRng(seed);
  const issues = sc.issues ? rng.shuffle(sc.issues[variant]) : null;
  return { sim, variant, issues, reportedAt: sim.s.t, shiftEnd: sc.shiftEndMin ? sim.s.t + sc.shiftEndMin * 60 : null };
}

// Which scenarios exercise which skill (for transfer tests and the requirements map)
export const SKILL_LABELS = { ack: 'Initial acknowledgment', questions: 'Focused questions', audience: 'Audience adaptation', uncertainty: 'Uncertainty', commitments: 'Update commitments', instruction: 'Closed-loop instructions', disagreement: 'Professional disagreement', correction: 'Corrections', escalation: 'Ownership & escalation', handoff: 'Shift handoff', documentation: 'Technical documentation', runbook: 'Runbook reproducibility', verification: 'Recovery verification', prioritization: 'Prioritization', ownership: 'Ownership' };
export function scenariosForSkill(skill, exceptId) { return COMMS_SCENARIOS.filter((s) => !s.worked && s.id !== exceptId && (s.skills.includes(skill) || s.deliverables.includes(skill))); }
