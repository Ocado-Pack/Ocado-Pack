// SIMULATED incident scenarios. Each attempt picks ONE hidden variant (cause) with a seeded RNG.
// The variant only changes which fault is injected into the shared engine; all evidence is
// computed by the engine, so the scene, logs, metrics and task records always agree.
import { Sim, AISLES, ROAD_Z, locPos } from './engine.js';

function orderAt(sim, loc, station) {
  const sku = sim.s.inventory[loc].sku;
  return sim.createOrder([sku], { loc, station });
}
const ALL_CHECKS = ['target_healthy', 'full_task', 'records_consistent', 'no_dup_stranded', 'safety_valid', 'queue_recovered', 'alarms_clear', 'neighbors_healthy'];

const H = {
  obstruction: { id: 'obstruction', label: 'Physical obstruction in the aisle' },
  localization: { id: 'localization', label: 'Localization problem (robot cannot tell where it is)' },
  network: { id: 'network', label: 'Wireless/network problem' },
  taskstate: { id: 'taskstate', label: 'Software / task-state problem (records disagree)' },
  battery: { id: 'battery', label: 'Battery or charging problem' },
  drive: { id: 'drive', label: 'Drive motor / wheel problem' },
};

export const SCENARIOS = [
  // ------------------------------------------------------------------ FIRST INCIDENT
  {
    id: 'r07', walkthrough: 'first', title: 'R-07 stopped completing tasks near Aisle C', minutes: 20, pack: 'mobile',
    brief: 'Operations (fictional shift lead "Dana"): "Robot R-07 stopped completing tasks near Aisle C. Can you take a look?"',
    target: { robot: 'R-07', zone: 'C', aisle: 'C' },
    variants: ['obstruction', 'localization', 'network', 'taskstate'],
    setup(sim, v) {
      sim.run(480);
      const r = sim.robot('R-07');
      sim.freeRobot('R-07'); r.battery = 78; sim.teleport('R-07', AISLES.C, ROAD_Z);
      const o = orderAt(sim, 'C-13', 'P-3');
      if (v === 'obstruction') sim.inject('obstruction', { aisle: 'C', z: 3.6 });
      if (v === 'localization') sim.inject('markerDamage', { aisle: 'C', zMin: 3.2, zMax: 9.5 });
      if (v === 'network') sim.inject('apDegraded', { ap: 'AP-3', lossProb: 0.32 });
      if (v === 'taskstate') sim.inject('staleLease', { robot: 'R-07' });
      sim.forceAssign(o.tasks[0], 'R-07');
      if (v === 'taskstate') {
        sim.run(12);
        sim.rlog(r, 'ERROR', 'WATCHDOG_RESET', 'Controller watchdog expired (navigation thread unresponsive 2.1 s); rebooting');
        sim._reboot(r, 28);
      }
      sim.run(300);
      return { order: o.id, task: o.tasks[0] };
    },
    hypotheses: [H.obstruction, H.localization, H.network, H.taskstate, H.battery, H.drive],
    diagnostics: ['robot_status', 'robot_logs', 'comp_obstacle', 'comp_localization', 'comp_wireless', 'comp_battery', 'comp_controller', 'camera_view', 'queue_metrics', 'alarm_list'],
    tests: ['compare_zone', 'task_record', 'network_zone', 'sandbox_restart'],
    operations: [['preserve_evidence', { robot: 'R-07' }], ['request_aisle_clear', { aisle: 'C' }], ['restrict_zone', { aisle: 'C' }], ['unrestrict_zone', { aisle: 'C' }], ['request_marker_repair', { aisle: 'C' }], ['request_ap_repair', { ap: 'AP-3' }], ['release_task_lease', { robot: 'R-07' }], ['isolate_robot', { robot: 'R-07' }], ['return_to_service', { robot: 'R-07' }], ['relocalize', { robot: 'R-07' }], ['restart_robot', { robot: 'R-07' }]],
    checks: ALL_CHECKS,
    fleetImpact: {
      question: 'Before you isolate R-07 or reroute work: predict the fleet impact of isolating R-07 right now.',
      options: [['same_problem', 'Capacity drops ≈8% (1 of 12 robots). R-07\'s task is requeued — and if the cause is in the aisle or zone, the next robot will meet the same problem.'], ['fixed', 'Capacity drops ≈8%; the requeued task completes normally and the order recovers.'], ['no_change', 'No effect on capacity or the waiting order.']],
      sandbox: ['isolate_robot', { robot: 'R-07' }],
    },
    truth: {
      obstruction: { cause: 'obstruction', scope: 'shared (place-based)', discriminators: ['comp_obstacle', 'camera_view', 'robot_logs', 'compare_zone'], explanation: 'A fallen tote lay across Aisle C at z≈3.6. R-07\'s forward obstacle sensor detected it at <1 m, so the robot performed a controlled stop and retried every 8 s (OBSTACLE_DETECTED). Localization and the wireless link were normal. Any robot sent to the upper half of Aisle C met the same object.', mitigation: 'Floor team inspection/clearing under aisle lockout (or restricting Aisle C until it can be cleared).', permanent: 'Find out why the tote fell (damaged tote, overfilled shelf) and add an obstruction alert that groups OBSTACLE_DETECTED by location.' },
      localization: { cause: 'localization', scope: 'shared (place-based)', discriminators: ['comp_localization', 'comp_obstacle', 'compare_zone', 'camera_view'], explanation: 'Floor localization markers in Aisle C between z≈3 and z≈9 were damaged. Robots entering that stretch matched too few markers; confidence fell below 0.50 and they performed a controlled stop (LOC_CONFIDENCE_LOW). Automatic and remote relocalization failed there. The obstacle sensor read clear.', mitigation: 'Restrict Aisle C (picks use alternate locations) and isolate the stranded robot, then have facilities replace markers.', permanent: 'Marker inspection schedule and an alert for localization failures clustered by location.' },
      network: { cause: 'network', scope: 'shared (zone/AP-based)', discriminators: ['comp_wireless', 'network_zone', 'compare_zone', 'robot_logs'], explanation: 'Access point AP-3 serving zone C was degraded (high retry rate). Robots in zone C repeatedly lost their link for several seconds, performed comms-loss safe stops, and acknowledgments were lost, causing redeliveries. Other zones were healthy.', mitigation: 'Restrict Aisle C to keep work out of the degraded zone, and request network team repair of AP-3.', permanent: 'AP health monitoring with disconnects-by-zone alerting; capacity/coverage review.' },
      taskstate: { cause: 'taskstate', scope: 'individual robot + software defect', discriminators: ['task_record', 'robot_status', 'comp_controller', 'sandbox_restart'], explanation: 'R-07\'s controller had a watchdog reset while starting task to C-13. After reboot it had a new session and no task, but the (simulated) fleet manager kept the old assignment and cleared its ack timer. The fleet manager therefore treated R-07 as busy: no new work, and the order waited forever. R-07 looked healthy (idle, sensors normal). Restarting R-07 again would not help — the stale record is in the fleet manager.', mitigation: 'Release the stale assignment (robot confirmed no active task) so the task is requeued with the same idempotency key. Isolation also releases it, at a capacity cost.', permanent: 'Engineering fix: reconcile assignments on session change; alert on assignments with no ack timer; investigate the watchdog reset.' },
    },
    resolved(sim, v) {
      const s = sim.s; const r = sim.robot('R-07');
      if (v === 'obstruction') return { fixed: !s.faults.obstruction, mitigated: !!s.restricted.C };
      if (v === 'localization') return { fixed: !s.faults.markerDamage, mitigated: !!s.restricted.C && (r.state !== 'loc_lost' || r.isolated) };
      if (v === 'network') return { fixed: !s.faults.apDegraded, mitigated: !!s.restricted.C };
      return { fixed: false, mitigated: !(s.fm.assignments['R-07'] && s.fm.assignments['R-07'].deadline == null && !r.taskId) };
    },
    checkCtx: (sim) => ({ robot: 'R-07', isolationOk: sim.robot('R-07').isolated, zone: sim.s.restricted.C ? null : 'C' }),
    relatedAlarms: ['ROBOT_STOPPED', 'QUEUE_AGE', 'AP_DISCONNECTS:C'],
    hints: {
      inspect: ['Start with R-07\'s own view: its state, then the sensors that can make a robot stop — obstacle range, localization confidence, wireless link.', 'Each candidate cause predicts a different sensor reading. A robot can also look healthy while the software thinks it is busy — compare what the robot says with what the fleet manager says.', 'Demonstration: run "View robot status". If the robot is STOPPED, the stop reason points at a subsystem. If it is IDLE while a task waits, compare the fleet-manager record with the robot-side task next.'],
      test: ['Ask: does the symptom follow the robot, the place, or the record?', 'Comparing with other robots in the same zone separates an individual fault from a shared one. Network and localization problems in a place affect every robot there.', 'Demonstration: "Compare with other robots in the same zone" lists events from OTHER robots only. If several show the same stop code, the robot is probably not the cause.'],
    },
  },

  // ------------------------------------------------------------------ WALKTHROUGH 1 (hardware & fleet)
  {
    id: 'w1-obstruction', walkthrough: 'W1', title: 'R-03 repeatedly stopping in Aisle B', minutes: 15, pack: 'mobile',
    brief: 'Operations: "R-03 keeps stopping and starting in Aisle B. It has done it three times."',
    target: { robot: 'R-03', zone: 'B', aisle: 'B' }, variants: ['obstruction'],
    setup(sim) { sim.run(420); const r = sim.robot('R-03'); sim.freeRobot('R-03'); r.battery = 80; sim.teleport('R-03', AISLES.B, ROAD_Z); const o = orderAt(sim, 'B-11', 'P-2'); sim.inject('obstruction', { aisle: 'B', z: 3.4 }); sim.forceAssign(o.tasks[0], 'R-03'); sim.run(100); orderAt(sim, 'B-15', 'P-1'); sim.run(140); return { order: o.id }; },
    hypotheses: [H.obstruction, H.localization, H.drive, H.network], diagnostics: ['robot_status', 'robot_logs', 'comp_obstacle', 'comp_localization', 'comp_drive', 'camera_view'], tests: ['compare_zone', 'network_zone'],
    operations: [['preserve_evidence', { robot: 'R-03' }], ['request_aisle_clear', { aisle: 'B' }], ['restrict_zone', { aisle: 'B' }], ['unrestrict_zone', { aisle: 'B' }], ['restart_robot', { robot: 'R-03' }], ['isolate_robot', { robot: 'R-03' }], ['return_to_service', { robot: 'R-03' }]],
    checks: ALL_CHECKS,
    fleetImpact: { question: 'Predict the fleet impact of restricting Aisle B (rerouting picks to alternate locations).', options: [['some_wait', 'Most picks move to alternate locations in other aisles; travel gets longer, some SKUs stored only in B wait.'], ['none', 'No impact at all.'], ['stop_all', 'The whole fleet stops.']], answer: 'some_wait' },
    truth: { obstruction: { cause: 'obstruction', scope: 'shared (place-based)', discriminators: ['comp_obstacle', 'camera_view'], explanation: 'A fallen tote in Aisle B at z≈−2.4 triggered repeated controlled stops (OBSTACLE_DETECTED with retries). The robot was behaving correctly — stopping is the safety function working.', mitigation: 'Floor team clears it under aisle lockout.', permanent: 'Investigate why totes fall; group obstacle stops by location in monitoring.' } },
    resolved: (sim) => ({ fixed: !sim.s.faults.obstruction, mitigated: !!sim.s.restricted.B }),
    checkCtx: () => ({ robot: 'R-03' }), relatedAlarms: ['ROBOT_STOPPED'],
    hints: { inspect: ['Which sensor makes a robot stop and retry in place?', 'Stopping is often correct safety behaviour. The question is what the robot is reacting to.', 'Demonstration: "Check obstacle sensor range" — a value under 1 m means something is physically detected ahead.'], test: ['Confirm visually before sending people.', 'Sensor + camera agreeing is stronger evidence than either alone.', 'Demonstration: the camera snapshot confirms what the range sensor detects.'] },
  },
  {
    id: 'w1-localization', walkthrough: 'W1', title: 'R-10 lost localization in Aisle D', minutes: 18, pack: 'mobile',
    brief: 'Operations: "R-10 stopped in Aisle D with a localization error."',
    target: { robot: 'R-10', zone: 'D', aisle: 'D' }, variants: ['zone_markers', 'robot_sensor'],
    setup(sim, v) { sim.run(420); const r = sim.robot('R-10'); sim.freeRobot('R-10'); r.battery = 82; sim.teleport('R-10', AISLES.D, ROAD_Z); const o = orderAt(sim, 'D-11', 'P-4');
      if (v === 'zone_markers') sim.inject('markerDamage', { aisle: 'D', zMin: 0, zMax: 6 }); else sim.inject('locSensor', { robot: 'R-10' });
      sim.forceAssign(o.tasks[0], 'R-10'); sim.run(60); orderAt(sim, 'D-10', 'P-4'); sim.run(60); orderAt(sim, 'D-12', 'P-3'); sim.run(240); return { order: o.id }; },
    hypotheses: [{ id: 'zone_markers', label: 'Environment: markers/map in Aisle D (shared)' }, { id: 'robot_sensor', label: 'R-10\'s own localization sensor (individual)' }, H.obstruction, H.network],
    diagnostics: ['robot_status', 'robot_logs', 'comp_localization', 'comp_obstacle', 'camera_view'], tests: ['compare_zone', 'fleet_overview'],
    operations: [['preserve_evidence', { robot: 'R-10' }], ['relocalize', { robot: 'R-10' }], ['restrict_zone', { aisle: 'D' }], ['unrestrict_zone', { aisle: 'D' }], ['request_marker_repair', { aisle: 'D' }], ['isolate_robot', { robot: 'R-10' }], ['send_to_maintenance', { robot: 'R-10' }], ['repair', { robot: 'R-10', part: 'clean_loc_sensor' }], ['return_to_service', { robot: 'R-10' }]],
    checks: ALL_CHECKS,
    fleetImpact: { question: 'Predict the fleet impact of restricting Aisle D versus isolating only R-10.', options: [['depends', 'Restricting D costs travel for every D pick; isolating R-10 costs ≈8% capacity. Which is right depends on whether other robots fail in D.'], ['same', 'Both have the same impact.'], ['none', 'Neither affects operations.']], answer: 'depends' },
    truth: {
      zone_markers: { cause: 'zone_markers', scope: 'shared (place-based)', discriminators: ['compare_zone', 'camera_view', 'comp_localization'], explanation: 'Damaged markers in Aisle D (z 0–6). Several robots lost localization at the same place; camera shows scuffed markers. R-10 was a victim, not the cause.', mitigation: 'Restrict Aisle D, isolate stranded robots, facilities repairs markers.', permanent: 'Marker inspection and clustered-location alerting.' },
      robot_sensor: { cause: 'robot_sensor', scope: 'individual robot', discriminators: ['compare_zone', 'camera_view', 'comp_localization'], explanation: 'Only R-10 had low confidence; other robots passed through Aisle D normally and markers looked intact. R-10\'s localization sensor window was contaminated (simulated).', mitigation: 'Isolate R-10; technician recovers it; bench clean/inspect sensor; verify with a full task.', permanent: 'Add sensor-cleaning to preventive maintenance; alert on per-robot confidence trend.' },
    },
    resolved(sim, v) { const r = sim.robot('R-10'); if (v === 'zone_markers') return { fixed: !sim.s.faults.markerDamage, mitigated: !!sim.s.restricted.D && (r.state !== 'loc_lost' || r.isolated) }; return { fixed: !sim.s.faults.locSensor, mitigated: r.isolated }; },
    checkCtx: (sim) => ({ robot: 'R-10', isolationOk: sim.robot('R-10').isolated }), relatedAlarms: ['ROBOT_STOPPED'],
    hints: { inspect: ['Localization confidence tells you the robot is lost, not why.', 'Two families of cause: the environment at that place, or this robot\'s sensor. They predict different things about OTHER robots.', 'Demonstration: compare_zone lists other robots\' localization stops in the same zone. Note also how many robots passed through without trouble.'], test: ['What would you expect from a robot that passes through the same spot?', 'A place-based cause affects every visitor; a robot-based cause follows that robot everywhere.', 'Demonstration: the camera snapshot shows the marker condition ahead of the robot.'] },
  },
  {
    id: 'w1-charging', walkthrough: 'W1', title: 'R-04 is not charging', minutes: 15, pack: 'charging',
    brief: 'Operations: "R-04 has been docked for a while and its battery is not going up."',
    target: { robot: 'R-04', zone: 'S' }, variants: ['contacts', 'charger'],
    setup(sim, v) { sim.run(300); for (const c of Object.values(sim.s.chargers)) { if (c.occupiedBy) { const rr = sim.robot(c.occupiedBy); rr.charger = null; rr.state = 'idle'; rr.battery = Math.max(rr.battery, 60); c.occupiedBy = null; } } for (const rr of sim.s.robots) if (rr.battery < 30) rr.battery = 55;
      const r = sim.robot('R-04'); sim.freeRobot('R-04'); sim.teleport('R-04', 30, ROAD_Z); r.battery = 24;
      if (v === 'contacts') sim.inject('chargeContacts', { robot: 'R-04' }); else sim.inject('chargerFault', { charger: 'C-1' });
      sim.run(240); return {}; },
    hypotheses: [{ id: 'contacts', label: 'R-04\'s charging contacts (robot side)' }, { id: 'charger', label: 'Charger C-1 output (infrastructure side)' }, H.network],
    diagnostics: ['robot_status', 'comp_battery', 'charger_status', 'robot_logs'], tests: ['redock_test'],
    operations: [['preserve_evidence', { robot: 'R-04' }], ['redock', { robot: 'R-04', charger: 'C-2' }], ['request_charger_repair', { charger: 'C-1' }], ['isolate_robot', { robot: 'R-04' }], ['send_to_maintenance', { robot: 'R-04' }], ['repair', { robot: 'R-04', part: 'replace_charge_contacts' }], ['return_to_service', { robot: 'R-04' }]],
    checks: ['target_healthy', 'full_task', 'no_dup_stranded', 'safety_valid', 'alarms_clear', 'neighbors_healthy'],
    fleetImpact: { question: 'If the charger is at fault and you do nothing, what is the fleet impact over the next hour?', options: [['capacity', 'Every robot that docks at that charger fails to charge; effective charging capacity drops by 25% and more robots go unavailable over time.'], ['one', 'Only R-04 is affected, ever.'], ['none', 'No impact; robots charge elsewhere automatically.']], answer: 'capacity' },
    truth: {
      contacts: { cause: 'contacts', scope: 'individual robot', discriminators: ['redock_test', 'comp_battery'], explanation: 'R-04 received 0 A at C-1 and also at a different charger; contact voltage measured 2.1 V (low). Other robots charge normally at C-1. Worn robot contacts.', mitigation: 'Isolate R-04 and have a technician replace contacts on the bench (de-energized).', permanent: 'Contact wear inspection interval; alert on 0 A docking sessions per robot.' },
      charger: { cause: 'charger', scope: 'infrastructure (charger)', discriminators: ['redock_test', 'charger_status'], explanation: 'Charger C-1 delivered 0 A to any robot; R-04 charged normally on C-2. C-1 output fuse had failed (simulated).', mitigation: 'Move R-04 to a good charger; take C-1 out for repair.', permanent: 'Charger output monitoring per dock.' },
    },
    resolved(sim, v) { const r = sim.robot('R-04'); if (v === 'contacts') return { fixed: !sim.s.faults.chargeContacts, mitigated: r.isolated }; return { fixed: !sim.s.faults.chargerFault, mitigated: r.charger && r.charger !== 'C-1' && r.chargeA > 0 }; },
    checkCtx: (sim) => ({ robot: 'R-04', isolationOk: sim.robot('R-04').isolated }), relatedAlarms: ['CHARGE_FAULT'],
    hints: { inspect: ['Energy has to flow from charger to robot. Which end is failing?', 'The relationship that matters: is the failure common to the robot (any charger) or to the charger (any robot)?', 'Demonstration: "Charger status" shows which robot is on which charger and the current each receives.'], test: ['Swap one variable at a time.', 'Moving the robot to a known-good charger separates the two causes.', 'Demonstration: the "Re-dock test" moves R-04 to C-2 and reports its current there.'] },
  },
  {
    id: 'w1-wheel', walkthrough: 'W1', title: 'R-09 slow, then wheel feedback fault', minutes: 18, pack: 'mobile',
    brief: 'Operations: "R-09 was crawling and now shows a drive fault."',
    target: { robot: 'R-09' }, variants: ['encoder', 'drag'],
    setup(sim, v) { sim.run(240); if (v === 'encoder') sim.inject('encoder', { robot: 'R-09', ratio: 0.6 }); else sim.inject('motorDrag', { robot: 'R-09' }); const r = sim.robot('R-09'); r.battery = Math.max(r.battery, 70); for (let i = 0; i < 80 && r.state !== 'fault'; i++) sim.run(15); sim.run(20); return {}; },
    hypotheses: [{ id: 'encoder', label: 'Encoder feedback fault (sensor under-counting)' }, { id: 'drag', label: 'Mechanical drag on drive wheel/motor' }, H.localization, H.taskstate],
    diagnostics: ['robot_status', 'robot_logs', 'comp_drive', 'comp_encoders', 'comp_controller'], tests: ['sandbox_restart'],
    operations: [['preserve_evidence', { robot: 'R-09' }], ['restart_robot', { robot: 'R-09' }], ['isolate_robot', { robot: 'R-09' }], ['recover_payload', { robot: 'R-09' }], ['send_to_maintenance', { robot: 'R-09' }], ['repair', { robot: 'R-09', part: 'replace_encoder' }], ['repair', { robot: 'R-09', part: 'replace_wheel_module' }], ['return_to_service', { robot: 'R-09' }]],
    checks: ALL_CHECKS, extraTests: ['sandbox_stop_test'],
    fleetImpact: { question: 'Predict the fleet impact of isolating R-09.', options: [['minor', 'About −8% capacity; its task is requeued if it carries no tote, or becomes PAYLOAD_HOLD if it does.'], ['major', 'The aisle it is in is unusable for the rest of the shift.'], ['none', 'None.']], answer: 'minor' },
    truth: {
      encoder: { cause: 'encoder', scope: 'individual robot', discriminators: ['comp_encoders', 'robot_logs'], explanation: 'Left encoder under-counted (~60% of right while driving straight). Motor currents were balanced, so the wheel was turning normally — the feedback was wrong. Odometry disagreed with localization (ODOM_MISMATCH), speed was reduced, then WHEEL_FEEDBACK_FAULT. A restart resets the residual and hides the fault for a while.', mitigation: 'Isolate, recover payload if any, technician bench-replaces encoder.', permanent: 'Track odometry residual trend per robot to catch degradation early.' },
      drag: { cause: 'drag', scope: 'individual robot', discriminators: ['comp_drive', 'robot_logs'], explanation: 'Left motor current ≈3.9 A vs ≈1.2 A right: mechanical drag (debris/bearing). Encoders agreed with each other. MOTOR_OVERCURRENT warnings then DRIVE_OVERCURRENT fault.', mitigation: 'Isolate; technician replaces wheel module (de-energized).', permanent: 'Wheel cleaning PM and motor-current trend alert.' },
    },
    resolved(sim, v) { const r = sim.robot('R-09'); return { fixed: v === 'encoder' ? !sim.s.faults.encoder : !sim.s.faults.motorDrag, mitigated: r.isolated }; },
    checkCtx: (sim) => ({ robot: 'R-09', isolationOk: sim.robot('R-09').isolated }), relatedAlarms: ['ROBOT_STOPPED'],
    hints: { inspect: ['Look at the drive system telemetry and the warnings that preceded the fault.', 'Motor current tells you about mechanical load; encoders tell you what the wheel feedback reports. Which one is abnormal?', 'Demonstration: "Check wheel encoders" — a left/right ratio far from 1.00 while driving straight means the two sides disagree.'], test: ['What would a restart prove — and what would it erase?', 'A fault that disappears after restart has not been fixed.', 'Demonstration: the sandbox restart shows whether the fault returns after driving.'] },
  },
  {
    id: 'w1-network', walkthrough: 'W1', title: 'Several robots dropping offline around Aisle C', minutes: 22, pack: 'network',
    brief: 'Operations: "Robots keep going offline for a few seconds, mostly around Aisle C."',
    target: { zone: 'C', aisle: 'C' }, variants: ['ap', 'firmware'],
    setup(sim, v) { sim.run(300); for (const id of ['R-02', 'R-06', 'R-07', 'R-10']) sim.robot(id).firmware = v === 'firmware' ? 'rc-4.3.0' : 'rc-4.2.1'; for (const id of (v === 'ap' ? ['R-01', 'R-05'] : [])) sim.robot(id).firmware = 'rc-4.3.0';
      sim.s.releases.push({ id: 'FW-044', t: sim.s.t - 3600, service: 'robot firmware', from: 'rc-4.2.1', to: 'rc-4.3.0', changes: [`Staged to ${v === 'ap' ? 'R-01, R-05' : 'R-02, R-06, R-07, R-10'}`, 'Wi-Fi driver update; roaming threshold change'], by: 'fleet ops (simulated)' });
      if (v === 'ap') sim.inject('apDegraded', { ap: 'AP-3', lossProb: 0.25 }); else { sim.inject('firmwareWifi', { firmware: 'rc-4.3.0', lossProb: 0.2 }); for (const [i, id] of ['R-02', 'R-06', 'R-07'].entries()) { const r = sim.robot(id); if (r.state === 'idle' && !r.taskId) sim.teleport(id, AISLES.C, ROAD_Z + i * 0.01); } for (let i = 0; i < 3; i++) { const o = orderAt(sim, `C-0${3 + i * 2}`, 'P-3'); } }
      for (let i = 0; i < 8; i++) { orderAt(sim, `C-${String(3 + i * 2).padStart(2, '0')}`, 'P-3'); sim.run(75); } return {}; },
    hypotheses: [{ id: 'ap', label: 'Access point AP-3 / zone C network (shared infrastructure)' }, { id: 'firmware', label: 'Robot-side Wi-Fi problem on some robots (firmware)' }, H.taskstate, H.localization],
    diagnostics: ['fleet_overview', 'alarm_list', 'network_zone', 'release_diff'], tests: ['firmware_breakdown'],
    operations: [['preserve_evidence', {}], ['restrict_zone', { aisle: 'C' }], ['unrestrict_zone', { aisle: 'C' }], ['request_ap_repair', { ap: 'AP-3' }], ['isolate_robot', { robot: 'R-02' }], ['isolate_robot', { robot: 'R-06' }], ['isolate_robot', { robot: 'R-07' }], ['isolate_robot', { robot: 'R-10' }]],
    checks: ['full_task', 'no_dup_stranded', 'safety_valid', 'queue_recovered', 'alarms_clear', 'neighbors_healthy'],
    fleetImpact: { question: 'Predict the fleet impact of isolating every robot that disconnected in the last 15 min.', options: [['large', 'Large capacity loss (several robots), and if the cause is the AP, new robots entering zone C will start disconnecting too.'], ['small', 'Small impact, problem solved.'], ['none', 'None.']], answer: 'large' },
    truth: {
      ap: { cause: 'ap', scope: 'shared infrastructure', discriminators: ['firmware_breakdown', 'network_zone'], explanation: 'Disconnects were concentrated by ZONE (C) across both firmware versions, and AP-3 showed high retries. The firmware rollout was on robots in other zones and was not correlated.', mitigation: 'Restrict Aisle C and request network team AP-3 repair.', permanent: 'Per-AP health alerting; disconnects-by-zone dashboard; exporter for zone D (currently no data).' },
      firmware: { cause: 'firmware', scope: 'robot-side (subset of fleet)', discriminators: ['firmware_breakdown', 'release_diff'], explanation: 'Disconnects followed the robots on firmware rc-4.3.0 into every zone they visited; robots on rc-4.2.1 in zone C were fine; AP-3 retries were normal. Correlation with zone C was because those robots happened to work there first.', mitigation: 'Isolate rc-4.3.0 robots (or escalate for a firmware rollback) and verify.', permanent: 'Staged rollout with automatic health gates; group connectivity metrics by firmware.' },
    },
    resolved(sim, v) { if (v === 'ap') return { fixed: !sim.s.faults.apDegraded, mitigated: !!sim.s.restricted.C }; const fw = sim.s.robots.filter((r) => r.firmware === 'rc-4.3.0'); return { fixed: false, mitigated: fw.every((r) => r.isolated) }; },
    checkCtx: () => ({}), relatedAlarms: ['AP_DISCONNECTS', 'ROBOT_STOPPED'],
    hints: { inspect: ['Scope first: which robots, which zones, since when?', 'Group the same events two different ways. A place-based cause concentrates by zone; a robot-based cause concentrates by robot attribute (firmware, model).', 'Demonstration: "Network health" shows each AP\'s retries and disconnects. Zone D shows NO DATA — that is missing instrumentation, not a healthy zero.'], test: ['Correlation with a zone can be accidental if the same robots work there.', 'The discriminating test is a grouping that separates robot attributes from places.', 'Demonstration: "Group disconnects by firmware vs by zone" — look at which grouping concentrates the events.'] },
  },

  // ------------------------------------------------------------------ WALKTHROUGH 2 (software)
  {
    id: 'w2-ack', walkthrough: 'W2', title: 'Task stuck waiting for acknowledgment (R-05)', minutes: 18, pack: 'mobile',
    brief: 'Support: "Order is 6+ minutes old. Its task shows ASSIGNED to R-05, but R-05 looks idle."',
    target: { robot: 'R-05' }, variants: ['stale_lease'],
    setup(sim) { sim.run(360); const r = sim.robot('R-05'); sim.freeRobot('R-05'); r.battery = 70; r.skew = 2.2; sim.teleport('R-05', AISLES.A, ROAD_Z); const o = orderAt(sim, 'A-07', 'P-1'); sim.inject('staleLease', { robot: 'R-05' }); sim.forceAssign(o.tasks[0], 'R-05'); sim.run(6); sim.rlog(r, 'ERROR', 'WATCHDOG_RESET', 'Controller watchdog expired; rebooting'); sim._reboot(r, 28); sim.run(380); return { order: o.id, task: o.tasks[0] }; },
    hypotheses: [H.taskstate, H.network, { id: 'robot_hw', label: 'R-05 hardware fault' }, { id: 'scheduler', label: 'Task scheduler did not dispatch' }],
    diagnostics: ['robot_status', 'robot_logs', 'trace_oldest', 'comp_controller', 'comp_wireless'], tests: ['task_record', 'sandbox_restart'],
    operations: [['preserve_evidence', { robot: 'R-05' }], ['restart_robot', { robot: 'R-05' }], ['release_task_lease', { robot: 'R-05' }], ['restart_service', { service: 'fleet-manager' }], ['isolate_robot', { robot: 'R-05' }], ['return_to_service', { robot: 'R-05' }]],
    checks: ALL_CHECKS,
    truth: { stale_lease: { cause: 'taskstate', scope: 'software defect', discriminators: ['task_record', 'robot_logs', 'sandbox_restart'], explanation: 'After R-05\'s watchdog reboot (new session), the simulated fleet manager retained the old assignment and cleared its ack timer (ASSIGNMENT_RETAINED). The robot had no task; the fleet manager thought it was busy. Note R-05\'s clock is 2.2 s fast: its CONTROLLER_BOOT line appears to precede fleet-manager events that really happened first — align by ingest time or apply the offset.', mitigation: 'Preserve the assignment table, then release the stale assignment (same idempotency key).', permanent: 'Engineering: reconcile on session change; alert on assignments without ack timers.' } },
    resolved: (sim) => ({ fixed: false, mitigated: !(sim.s.fm.assignments['R-05'] && !sim.robot('R-05').taskId && sim.s.fm.assignments['R-05'].deadline == null) }),
    checkCtx: (sim) => ({ robot: 'R-05', isolationOk: sim.robot('R-05').isolated }), relatedAlarms: ['QUEUE_AGE'],
    hints: { inspect: ['Follow the task, not the robot: where in its lifecycle did it stop?', 'Two systems each hold a record of the same task. Do they agree?', 'Demonstration: "Trace the oldest open task" lists its state history with timestamps.'], test: ['Would restarting the robot change the record that is wrong?', 'Find which component holds the wrong state before choosing an action.', 'Demonstration: the sandbox restart shows the fleet manager still holding the task afterwards.'] },
  },
  {
    id: 'w2-duplicate', walkthrough: 'W2', title: 'Duplicate task deliveries — are robots picking twice?', minutes: 16, pack: 'network',
    brief: 'Support: "Dashboard shows lots of duplicate task deliveries in the last 15 minutes. Are robots picking items twice?"',
    target: { zone: 'S' }, variants: ['intermittent_ap'],
    setup(sim) { sim.run(300); sim.inject('apDegraded', { ap: 'AP-5', lossProb: 0.07 }); sim.run(900); return {}; },
    hypotheses: [{ id: 'double_pick', label: 'Robots physically picking twice (data integrity problem)' }, { id: 'scheduler_bug', label: 'Scheduler creating duplicate tasks' }, { id: 'intermittent_ap', label: 'Intermittent network loss causing redeliveries (safeguard working)' }],
    diagnostics: ['robot_logs_zone', 'service_health', 'network_zone', 'inventory_record'], tests: ['firmware_breakdown', 'records_probe'],
    operations: [['preserve_evidence', {}], ['request_ap_repair', { ap: 'AP-5' }], ['restart_service', { service: 'fleet-manager' }]],
    checks: ['records_consistent', 'no_dup_stranded', 'full_task', 'queue_recovered', 'alarms_clear', 'neighbors_healthy'],
    truth: { intermittent_ap: { cause: 'intermittent_ap', scope: 'shared infrastructure', discriminators: ['records_probe', 'network_zone', 'firmware_breakdown'], explanation: 'AP-5 (station/road area, zone S — where most assignments are delivered) dropped links intermittently. Lost acknowledgments made the fleet manager redeliver assignments with the same idempotency key; robots ignored duplicates (DUPLICATE_TASK_IGNORED) and the inventory duplicate-pick guard recorded no double picks. Inventory records stayed consistent. The safeguard worked; the network did not.', mitigation: 'Network team repairs AP-5.', permanent: 'Alert on redelivery rate by zone; AP monitoring.' } },
    resolved: (sim) => ({ fixed: !sim.s.faults.apDegraded, mitigated: false }),
    checkCtx: () => ({ zone: null }), relatedAlarms: ['AP_DISCONNECTS'],
    hints: { inspect: ['A "duplicate delivery" is a message event, not necessarily duplicate physical work.', 'Check whether duplicates had effects: did inventory or task records change twice?', 'Demonstration: "Inventory record" shows whether any location has unexplained discrepancies.'], test: ['Why would a sender send the same message again?', 'Retries happen when acknowledgments do not arrive in time. What can stop acks arriving?', 'Demonstration: "Network health" by zone.'] },
  },
  {
    id: 'w2-station', walkthrough: 'W2', title: 'Robots queuing at station P-3', minutes: 16, pack: 'stations',
    brief: 'Operations: "Robots are lining up at P-3 and just sitting there. They look fine."',
    target: { station: 'P-3' }, variants: ['scanner', 'heartbeat'],
    setup(sim, v) { sim.run(300); sim.inject('stationDown', { station: 'P-3', kind: v }); sim.run(420); return {}; },
    hypotheses: [{ id: 'scanner', label: 'Station hardware fault (scanner)' }, { id: 'heartbeat', label: 'Station software status wrong (station-service)' }, { id: 'robots', label: 'Robot fault' }],
    diagnostics: ['fleet_overview', 'station_status', 'queue_metrics', 'service_health'], tests: ['station_local'],
    operations: [['preserve_evidence', { service: 'station-service' }], ['reroute_station', { station: 'P-3' }], ['restore_station', { station: 'P-3' }], ['request_station_repair', { station: 'P-3' }], ['restart_service', { service: 'station-service' }]],
    checks: ['target_healthy', 'full_task', 'no_dup_stranded', 'queue_recovered', 'alarms_clear', 'neighbors_healthy'],
    truth: {
      scanner: { cause: 'scanner', scope: 'station hardware', discriminators: ['station_local', 'station_status'], explanation: 'P-3\'s barcode scanner stopped responding; the local HMI showed SCANNER FAULT and station-service correctly reported P-3 unavailable. Robots waiting were healthy — the workflow was broken at the station. The scheduler kept planning tasks to P-3 because it does not check station readiness.', mitigation: 'Reroute P-3 tasks to other stations; technician repairs scanner; return P-3 to rotation after verifying.', permanent: 'Scheduler should consume station availability.' },
      heartbeat: { cause: 'heartbeat', scope: 'software status', discriminators: ['station_local', 'station_status'], explanation: 'P-3 hardware was fine (HMI READY) but station-service stopped receiving its heartbeat and marked it unavailable. Software state, not hardware.', mitigation: 'Reroute; restart station-service connector (with logs preserved) or escalate; verify P-3 receives and completes a task.', permanent: 'Engineering fix for heartbeat connector; alert when software status and local HMI disagree.' },
    },
    resolved(sim, v) { const down = sim.s.faults.stationDown; return { fixed: !down, mitigated: !sim.s.config.stationRotation['P-3'] && !sim.s.robots.some((r) => r.state === 'waiting_station' && sim.s.tasks[r.taskId]?.station === 'P-3') }; },
    checkCtx: (sim) => (sim.s.config.stationRotation['P-3'] ? { station: 'P-3' } : {}), relatedAlarms: ['STATION_UNAVAILABLE', 'QUEUE_AGE'],
    hints: { inspect: ['Robots can be healthy while the workflow is broken downstream of them.', 'Compare the software view of the station with the physical station.', 'Demonstration: "Station status" shows station-service\'s view.'], test: ['Who can tell you what the station itself shows?', 'If the local HMI and the software disagree, the problem is in between.', 'Demonstration: ask the operator to read the HMI.'] },
  },
  {
    id: 'w2-inventory', walkthrough: 'W2', title: 'Short picks: ITEM_NOT_FOUND at one location', minutes: 15, pack: 'mobile',
    brief: 'Operations: "Some orders are going to exception for short picks."',
    target: { loc: 'B-14' }, variants: ['mismatch'],
    setup(sim) { sim.run(240); sim.inject('inventoryMismatch', { loc: 'B-14' }); const sku = sim.s.inventory['B-14'].sku; for (let i = 0; i < 3; i++) sim.createOrder([sku], { loc: 'B-14' }); sim.run(420); return {}; },
    hypotheses: [{ id: 'mismatch', label: 'Inventory record wrong at a location' }, { id: 'handling', label: 'Robot handling mechanism fault' }, H.localization],
    diagnostics: ['inventory_record', 'queue_metrics', 'alarm_list'], tests: ['compare_robots_pick'],
    operations: [['inventory_hold', { loc: 'B-14' }], ['request_cycle_count', { loc: 'B-14' }], ['release_hold', { loc: 'B-14' }]],
    checks: ['records_consistent', 'full_task', 'no_dup_stranded', 'queue_recovered'],
    truth: { mismatch: { cause: 'mismatch', scope: 'data (inventory record)', discriminators: ['inventory_record', 'compare_robots_pick'], explanation: 'B-14 showed stock in the system but was physically empty; DIFFERENT robots all failed there with ITEM_NOT_FOUND, and the scheduler kept retrying the same location. The cycle count showed items mis-slotted into the adjacent location at putaway.', mitigation: 'Inventory hold on B-14 (alternate location used), then cycle count corrects the record.', permanent: 'Putaway scan verification; alert on repeated ITEM_NOT_FOUND per location.' } },
    resolved: (sim) => ({ fixed: !sim.s.faults.inventoryMismatch, mitigated: sim.s.inventory['B-14'].hold }),
    checkCtx: () => ({}), relatedAlarms: [],
    hints: { inspect: ['Is the failure tied to robots or to a location?', 'If different robots fail at the same place, the place (or its record) is the common factor.', 'Demonstration: "Inventory record" groups pick failures by location.'], test: ['What would confirm the record is wrong?', 'Only a physical count confirms quantity.', 'Demonstration: compare which robots failed there.'] },
  },
  {
    id: 'w2-timeout', walkthrough: 'W2', title: 'Robots idle while orders wait (timeouts)', minutes: 20, pack: 'mobile',
    brief: 'Operations: "Orders are slow and lots of robots are idle."',
    target: { service: 'inventory-service' }, variants: ['pool'],
    setup(sim) { sim.run(300); sim.inject('slowService', { ago: 60 }); sim.run(600); return {}; },
    hypotheses: [{ id: 'pool', label: 'Slow downstream service (inventory) causing timeouts' }, { id: 'robots', label: 'Robots faulted' }, H.network, { id: 'demand', label: 'Simply more orders than capacity' }],
    diagnostics: ['fleet_overview', 'queue_metrics', 'service_health', 'trace_oldest'], tests: ['release_diff', 'sandbox_concurrency'],
    operations: [['preserve_evidence', { service: 'inventory-service' }], ['restart_service', { service: 'inventory-service' }], ['revert_config', { change: 'CHG-2291' }], ['set_concurrency', { value: 12 }], ['set_concurrency', { value: 4 }]],
    checks: ['target_healthy', 'full_task', 'no_dup_stranded', 'queue_recovered', 'alarms_clear'],
    truth: { pool: { cause: 'pool', scope: 'software configuration', discriminators: ['service_health', 'trace_oldest', 'release_diff'], explanation: 'Config change CHG-2291 reduced inventory-service DB pool 50 → 5. Reservations slowed beyond the scheduler\'s 3000 ms timeout, so tasks retried with exponential backoff and never reached robots — robots were idle and healthy. Restarting gave ~2.5 min of relief then symptoms returned. Raising concurrency added load and made latency worse.', mitigation: 'Revert CHG-2291 (with owner approval).', permanent: 'Config change review and a latency-SLO alert on reservations.' } },
    resolved: (sim) => ({ fixed: !sim.s.faults.slowService, mitigated: false }),
    checkCtx: () => ({ service: 'inventory-service', baselineTph: 300 }), relatedAlarms: ['SVC_ERRORS:inventory-service', 'QUEUE_AGE'],
    hints: { inspect: ['Idle robots plus waiting work means work is not reaching them. Where does it stop?', 'Follow the request path: order → scheduler → inventory reservation → fleet manager → robot.', 'Demonstration: trace the oldest task to see which stage holds it.'], test: ['When did it start, and what changed then?', 'Timing alignment is a clue (correlation); a test confirms it.', 'Demonstration: compare releases & configuration changes.'] },
  },
  {
    id: 'w2-regression', walkthrough: 'W2', title: 'Throughput dropped after a release', minutes: 20, pack: 'mobile',
    brief: 'Operations: "Since about 06:10 throughput is way down and robots keep starting and abandoning tasks."',
    target: { service: 'fleet-manager' }, variants: ['ack_timeout'],
    setup(sim) { sim.run(600); sim.inject('regression', { ago: 30 }); sim.run(600); return {}; },
    hypotheses: [{ id: 'ack_timeout', label: 'Software regression in the latest fleet-manager release' }, H.network, { id: 'robots', label: 'Robot firmware' }],
    diagnostics: ['queue_metrics', 'service_health', 'robot_logs_zone', 'network_zone'], tests: ['release_diff', 'sandbox_rollback'],
    operations: [['preserve_evidence', { service: 'fleet-manager' }], ['restart_service', { service: 'fleet-manager' }], ['rollback_release', { service: 'fleet-manager' }]],
    checks: ['target_healthy', 'full_task', 'no_dup_stranded', 'queue_recovered', 'alarms_clear'],
    truth: { ack_timeout: { cause: 'ack_timeout', scope: 'software release', discriminators: ['release_diff', 'sandbox_rollback', 'robot_logs_zone'], explanation: 'fleet-manager 5.2.0 changed ack_timeout_ms 5000 → 800 (intended 8000). Robots normally ack in 0.4–1.4 s, so many deliveries timed out, were redelivered (duplicates ignored via idempotency), and after 4 attempts abandoned and requeued. Network was healthy in every zone.', mitigation: 'Roll back fleet-manager to 5.1.0 after preserving logs.', permanent: 'Config validation in CI; canary with ack-timeout-rate gate.' } },
    resolved: (sim) => ({ fixed: !sim.s.faults.regression, mitigated: false }),
    checkCtx: () => ({ service: 'fleet-manager' }), relatedAlarms: ['QUEUE_AGE'],
    hints: { inspect: ['Many robots and all zones → think shared components.', 'Ask what changed at the time the symptom began.', 'Demonstration: look at the dominant log codes across robots.'], test: ['A change close in time is a suspect, not a conviction.', 'Test the rollback somewhere safe first.', 'Demonstration: the sandbox rollback runs the previous version against current state.'] },
  },
  // ------------------------------------------------------------------ WALKTHROUGH 4: recovery without confirmed cause
  {
    id: 'w4-unknown', walkthrough: 'W4', title: 'Intermittent disconnects in zone B — cause not found', minutes: 15, pack: 'network',
    brief: 'Operations: "Robots in Aisle B keep dropping offline."',
    target: { zone: 'B', aisle: 'B' }, variants: ['unknown'],
    setup(sim) { sim.run(300); sim.inject('apDegraded', { ap: 'AP-2', lossProb: 0.22, unknownCause: true }); sim.run(480); return {}; },
    hypotheses: [{ id: 'unknown', label: 'AP-2 / zone B network' }, { id: 'firmware', label: 'Robot firmware' }, H.taskstate],
    diagnostics: ['fleet_overview', 'network_zone', 'alarm_list'], tests: ['firmware_breakdown'],
    operations: [['preserve_evidence', {}], ['restrict_zone', { aisle: 'B' }], ['unrestrict_zone', { aisle: 'B' }], ['request_ap_repair', { ap: 'AP-2' }]],
    checks: ['full_task', 'no_dup_stranded', 'safety_valid', 'queue_recovered', 'alarms_clear', 'neighbors_healthy'],
    truth: { unknown: { cause: 'unknown', scope: 'infrastructure (zone B)', discriminators: ['network_zone', 'firmware_breakdown'], explanation: 'Disconnects concentrated in zone B. The network team rebooted AP-2 and service recovered, but AP logs from before the reboot were not retained. Root cause: NOT DETERMINED. Correct documentation says "service restored by AP-2 reboot; cause unknown; monitoring in place".', mitigation: 'AP-2 reboot by network team.', permanent: 'Unknown — follow-up: retain AP logs, watch for recurrence, vendor ticket.' } },
    resolved: (sim) => ({ fixed: !sim.s.faults.apDegraded, mitigated: !!sim.s.restricted.B }),
    checkCtx: () => ({}), relatedAlarms: ['AP_DISCONNECTS'], unknownRootCause: true,
    hints: { inspect: ['Scope by zone first.', 'Is the AP the common factor?', 'Demonstration: network health by zone.'], test: ['Robot attribute vs place.', 'Grouping by firmware separates the two.', 'Demonstration: firmware vs zone grouping.'] },
  },
];

// extra scenario-specific diagnostics referenced above
import { DIAGNOSTICS } from './catalog.js';
import { round } from '../util.js';
Object.assign(DIAGNOSTICS, {
  redock_test: { label: 'Re-dock test: move R-04 to charger C-2 and observe', target: 'robot', skill: 'diagnosis', what: 'Runs in a sandbox clone: sends R-04 to C-2 and, separately, docks a healthy robot at C-1.', when: 'Separate robot-contact faults from charger faults.', evidence: 'Charge current for (R-04 @ C-2) and (other robot @ C-1).', limits: 'Needs a known-good comparison.', ops: 'None in production (sandbox).',
    predict: { question: 'Which pairing will charge?', options: [['robot_bad', 'R-04 fails on C-2 too; other robot charges on C-1 → robot fault'], ['charger_bad', 'R-04 charges on C-2; other robot fails on C-1 → charger fault']] },
    run(sim) { const c = sim.clone(); const r = c.robot('R-04'); c.operate('redock', { robot: 'R-04', charger: 'C-2' }); c.run(60); const a = r.state === 'charging' ? r.chargeA : null; const c2 = sim.clone(); const r4 = c2.robot('R-04'); if (r4.charger) { c2.s.chargers[r4.charger].occupiedBy = null; r4.charger = null; r4.state = 'idle'; } const other = c2.s.robots.find((x) => x.id !== 'R-04' && x.state === 'idle' && !x.taskId) || c2.robot('R-12'); other.taskId = null; delete c2.s.fm.assignments[other.id]; other.state = 'idle'; c2.operate('redock', { robot: other.id, charger: 'C-1' }); c2.run(60); const b = other.state === 'charging' ? other.chargeA : null; const outcome = (a ?? 0) > 1 ? 'charger_bad' : 'robot_bad'; return { outcome, summary: `Sandbox: R-04 @ C-2 → ${a == null ? 'did not dock' : round(a, 1) + ' A'}; ${other.id} @ C-1 → ${b == null ? 'did not dock' : round(b, 1) + ' A'}.`, rows: [['R-04 @ C-2', a == null ? 'not docked' : `${round(a, 1)} A`], [`${other.id} @ C-1`, b == null ? 'not docked' : `${round(b, 1)} A`]], facts: [`Re-dock test (sandbox): R-04 at C-2 ${a == null ? 'n/a' : round(a, 1) + ' A'}; ${other.id} at C-1 ${b == null ? 'n/a' : round(b, 1) + ' A'}`] }; } },
  robot_logs_zone: { label: 'Fleet-wide warning/error codes (15 min)', target: 'none', skill: 'software', what: 'Counts WARN/ERROR/notable INFO codes across all robots and services.', when: 'Many robots affected.', evidence: 'Which message type dominates.', limits: 'Counts do not show causality.', ops: 'None.',
    predict: { question: 'Which code family do you expect to dominate?', options: [['ack', 'Ack timeouts / duplicate deliveries'], ['comms', 'Heartbeat / link loss'], ['other', 'Something else']] },
    run(sim) { const t0 = sim.s.t - 900; const c = {}; for (const e of sim.s.logs) if (e.t > t0 && (e.sev === 'WARN' || e.sev === 'ERROR' || e.code === 'DUPLICATE_TASK_IGNORED')) c[e.code] = (c[e.code] || 0) + 1; const ack = (c.ACK_TIMEOUT_REDELIVER || 0) + (c.ACK_TIMEOUT_GIVEUP || 0) + (c.DUPLICATE_TASK_IGNORED || 0); const comms = (c.ROBOT_HEARTBEAT_MISSED || 0) + (c.COMMS_LOSS_SAFE_STOP || 0); const outcome = ack > comms * 2 && ack > 5 ? 'ack' : comms > 3 ? 'comms' : 'other'; const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8); return { outcome, summary: top.map(([k, v]) => `${k}×${v}`).join(', ') || 'quiet', rows: top, facts: [`Fleet log codes 15 min: ${top.map(([k, v]) => `${k}×${v}`).join(', ') || 'none'}`] }; } },
  records_probe: { label: 'Check for duplicate physical picks (idempotency records)', target: 'none', skill: 'software', what: 'Compares duplicate deliveries with duplicate-pick refusals and inventory consistency.', when: 'Someone asks whether duplicates caused double work.', evidence: 'Whether duplicates had physical effects.', limits: 'Only covers picks recorded through the inventory service.', ops: 'None.',
    predict: { question: 'Will you find duplicate physical picks?', options: [['none', 'No — duplicates were ignored'], ['some', 'Yes — some items picked twice']] },
    run(sim) { const dup = sim.countWin('dup_ignored', 1800); const bad = Object.entries(sim.s.inventory).filter(([, v]) => v.sys !== v.phys && !v.hold).length; return { outcome: bad ? 'some' : 'none', summary: `${dup} duplicate deliveries ignored by robots (30 min); ${sim.s.counters.dupPickPrevented} second picks refused; ${bad} inventory mismatches.`, rows: [['Duplicate deliveries ignored (30 min)', dup], ['Second picks refused by inventory', sim.s.counters.dupPickPrevented], ['Locations with system ≠ physical', bad]], facts: [`Duplicates: ${dup} deliveries ignored, ${sim.s.counters.dupPickPrevented} second picks refused, ${bad} inventory mismatches`] }; } },
  compare_robots_pick: { label: 'Compare which robots failed at the location', target: 'none', skill: 'diagnosis', what: 'Lists robots with ITEM_NOT_FOUND by location.', when: 'Short picks.', evidence: 'Whether failures follow the robot or the location.', limits: '—', ops: 'None.',
    predict: { question: 'Will the failures involve one robot or several?', options: [['several', 'Several different robots, same location'], ['one', 'One robot, various locations']] },
    run(sim) { const by = {}; for (const e of sim.s.winEv) if (e.type === 'task_failed' && e.t > sim.s.t - 1800) { by[e.loc] = by[e.loc] || new Set(); by[e.loc].add(e.robot); } const rows = Object.entries(by).map(([l, s]) => [l, [...s].join(', ')]); const several = Object.values(by).some((s) => s.size > 1); return { outcome: several ? 'several' : 'one', summary: rows.map((r) => `${r[0]}: ${r[1]}`).join('; ') || 'no failures', rows, facts: [`ITEM_NOT_FOUND robots by location: ${rows.map((r) => `${r[0]}→${r[1]}`).join('; ') || 'none'}`] }; } },
  sandbox_concurrency: { label: 'Sandbox: raise scheduler concurrency 4 → 12 for 5 min', target: 'none', skill: 'software', what: 'Clone and test a tuning change.', when: 'Before changing production.', evidence: 'Effect on error rate and queue.', limits: 'Sandbox.', ops: 'None in production.',
    predict: { question: 'What will raising concurrency do?', options: [['worse', 'More attempts but higher latency/errors — worse'], ['better', 'Fixes it']] },
    run(sim) { const c = sim.clone(); const e0 = c.serviceErrorRate('inventory-service', 120); c.operate('set_concurrency', { value: 12 }); c.run(300); const e1 = c.serviceErrorRate('inventory-service', 120); const p95 = c.serviceLatency('inventory-service').p95; return { outcome: (e1 ?? 0) >= (e0 ?? 0) ? 'worse' : 'better', summary: `Sandbox: inventory error/timeout rate ${Math.round((e0 ?? 0) * 100)}% → ${Math.round((e1 ?? 0) * 100)}%, p95 ${Math.round(p95 || 0)} ms; queue ${c.queueDepth()}.`, rows: [], facts: [`Sandbox concurrency 12: inventory timeouts ${Math.round((e0 ?? 0) * 100)}% → ${Math.round((e1 ?? 0) * 100)}%`] }; } },
  sandbox_rollback: { label: 'Sandbox: roll back fleet-manager and observe 5 min', target: 'none', skill: 'software', what: 'Clone and test a rollback.', when: 'Before rolling back in production.', evidence: 'Whether the symptom stops with the previous version.', limits: 'Sandbox.', ops: 'None in production.',
    predict: { question: 'Will the rollback reduce ack timeouts?', options: [['better', 'Yes'], ['same', 'No change']] },
    run(sim) { const c = sim.clone(); const res = c.operate('rollback_release', { service: 'fleet-manager' }); if (!res.ok) return { outcome: 'same', summary: `Sandbox: ${res.msg}`, rows: [], facts: [`Sandbox rollback not possible: ${res.msg}`] }; const n0 = c.s.logs.length; c.run(300); const to = c.s.logs.slice(n0).filter((e) => e.code === 'ACK_TIMEOUT_REDELIVER' && e.t > c.s.t - 200).length; return { outcome: to < 3 ? 'better' : 'same', summary: `Sandbox: after rollback, ${to} ack redeliveries in the last 200 s; ${Math.round(c.metric('tasksPerHour', 200) || 0)} tasks/h.`, rows: [], facts: [`Sandbox rollback of fleet-manager: ${to} ack redeliveries in 200 s afterwards`] }; } },
});

export const SCENARIO_MAP = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

/** Create a fresh simulation for an attempt with a hidden, consistent variant. */
export function startAttempt(scenarioId, seed, forcedVariant = null) {
  const sc = SCENARIO_MAP[scenarioId];
  const sim = new Sim({ seed });
  const variant = forcedVariant || sc.variants[seed % sc.variants.length];
  const info = sc.setup(sim, variant) || {};
  return { sim, variant, info, startedAt: sim.s.t };
}
export { locPos };
