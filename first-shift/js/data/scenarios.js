/* FIRST SHIFT — troubleshooting missions (local structured data).
 * One validated fault per mission; faults are never combined at random.
 * Every observation comes from the circuit model: a check is a function that
 * reads the simulation under its stated conditions. Whether a result supports
 * or weakens a suspected cause is derived by running the same check on the
 * model with that cause applied, so the feedback cannot disagree with the
 * circuit. A diagnosis is accepted only once the gathered evidence rules out
 * every other listed cause. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  function sim() { return FS.sim; }

  /* ------------------------------------------------ possible causes */
  var CAUSES = {
    fuseOpen: { t: 'Fuse F1 is open.', set: { 'faults.fuseOpen': true } },
    wireOpen: { t: 'Wire 2 is open between S1 and PL1 (a broken wire or loose connection).', set: { 'faults.wireOpen': true } },
    lampOpen: { t: 'Lamp PL1 is burnt out.', set: { 'faults.lampOpen': true } },
    s1Open: { t: 'Switch S1 has failed open.', set: { 'faults.s1Open': true } },
    noSupply: { t: 'There is no control supply at the L+ rail (control fuse F1 has opened).', set: { 'faults.noSupply': true } },
    stopOpen: { t: 'The STOP (PB1) path is open even though the button is released.', set: { 'faults.stopOpen': true } },
    olTrip: { t: 'Overload relay OL1 has tripped, so its control contact is open.', set: { olTripped: true } },
    startOpen: { t: 'The START (PB2) path does not close when the button is pressed.', set: { 'faults.startOpen': true } },
    coilOpen: { t: 'The M1 contactor coil is open.', set: { 'faults.coilOpen': true } },
    holdOpen: { t: 'The holding branch is open: the M1 auxiliary contact or its wiring.', set: { 'faults.holdOpen': true } },
    misaligned: { t: 'Sensor PEC1 is misaligned and does not see the boxes.', set: { 'faults.misaligned': true } },
    cr2Open: { t: 'The CR2 relay coil is open.', set: { 'faults.cr2Open': true } },
    pl2Open: { t: 'Lamp PL2 is burnt out.', set: { 'faults.pl2Open': true } },
    airOff: { t: 'The plant compressed-air supply to the machine is unavailable.', set: { 'faults.airOff': true } },
    sv1Closed: { t: 'Shutoff valve SV1 is closed.', set: { air: false } },
    ss2Open: { t: 'Selector SS2 is not passing the signal to SOL1.', set: { 'faults.ss2Open': true } }
  };

  /* ------------------------------------------------ checks */
  var OV = [['hi', 'About 24 V'], ['lo', 'About 0 V']];
  var OR = [['low', 'Continuity (near 0 Ω)'], ['open', 'Open circuit (OL)'], ['res', 'A steady resistance (a coil or lamp)']];
  var OIND = [['on', 'On'], ['off', 'Off']];
  function V(cid, a, b, set) {
    return function (S) {
      var r = sim().probe(cid, S, { mode: 'V', a: a, b: b, set: set });
      return { text: r.na ? 'Not modeled in this exercise (floating point).' : r.text + ' from ' + a + ' to ' + b + '.', cat: r.na ? 'na' : (r.value > 12 ? 'hi' : 'lo') };
    };
  }
  function R(cid, a, b, set) {
    return function (S) {
      var r = sim().probe(cid, S, { mode: 'R', a: a, b: b, set: set });
      return { text: 'With power isolated and absence of voltage verified: ' + r.text + ' between ' + a + ' and ' + b + '.', cat: r.value === Infinity ? 'open' : (r.value < 1 ? 'low' : 'res') };
    };
  }
  function after(cid, S, set) { var c = sim().clone(S); sim().patch(c, set); var r = sim().settle(cid, c); return { S: c, R: r }; }
  function look(fn, opts) { return { kind: 'look', read: fn, opts: opts }; }

  var CHK = {
    /* lamp circuit */
    l_vL: { t: 'Measure DC volts from L+ to 0V', kind: 'V', read: V('lamp', 'L+', '0V'), opts: OV },
    l_v1: { t: 'With S1 closed, measure DC volts from test point 1 (after F1) to 0V', kind: 'V', read: V('lamp', '1', '0V', { 'sw.S1': true }), opts: OV },
    l_v2a: { t: 'With S1 closed, measure DC volts from 2a (switch end of wire 2) to 0V', kind: 'V', read: V('lamp', '2a', '0V', { 'sw.S1': true }), opts: OV },
    l_v2b: { t: 'With S1 closed, measure DC volts from 2b (lamp end of wire 2) to 0V', kind: 'V', read: V('lamp', '2b', '0V', { 'sw.S1': true }), opts: OV },
    l_cF1: { t: 'Isolate control power, verify 0 V, then check continuity across F1 (L+ to 1)', kind: 'R', read: R('lamp', 'L+', '1'), opts: OR },
    l_cW2: { t: 'Isolate control power, verify 0 V, then check continuity along wire 2 (2a to 2b)', kind: 'R', read: R('lamp', '2a', '2b'), opts: OR },
    l_newLamp: { t: 'Fit a new lamp', bad: 'Swapping parts without evidence costs time, hides the real cause and is not troubleshooting. Find out whether voltage reaches the lamp first.' },
    l_newFuse: { t: 'Fit a new fuse', bad: 'Measure before replacing. If 24 V is present after F1, a new fuse changes nothing. If it is open, something caused it.' },
    l_bridge: { t: 'Bridge the fuse holder with a piece of wire to see if the lamp lights', bad: 'Never bypass a protective device. A fuse that has opened may be protecting against a fault that is still there.' },
    /* motor starter */
    m_obs: { t: 'Hold START and watch contactor M1', kind: 'look', opts: [['in', 'M1 pulls in'], ['out', 'M1 does not pull in']],
      read: function (S) { var h = after('starter', S, { 'pb.PB2': true }); return h.S.relay.M1 ? { text: 'With START held, M1 pulls in.', cat: 'in' } : { text: 'With START held, M1 does not pull in. No click.', cat: 'out' }; } },
    m_hold: { t: 'Hold START, then release it, and watch M1', kind: 'look', opts: [['holds', 'Pulls in and stays in'], ['drops', 'Pulls in, then drops out on release'], ['never', 'Never pulls in']],
      read: function (S) {
        var h = after('starter', S, { 'pb.PB2': true }), r = after('starter', h.S, { 'pb.PB2': false });
        if (!h.S.relay.M1) return { text: 'M1 never pulls in.', cat: 'never' };
        return r.S.relay.M1 ? { text: 'M1 pulls in and stays in after START is released.', cat: 'holds' } : { text: 'M1 pulls in while START is held and drops out the moment it is released.', cat: 'drops' };
      } },
    m_vL: { t: 'Measure DC volts from L+ to 0V', kind: 'V', read: V('starter', 'L+', '0V'), opts: OV },
    m_v1: { t: 'With START held, measure DC volts from wire 1 (after STOP) to 0V', kind: 'V', read: V('starter', '1', '0V', { 'pb.PB2': true }), opts: OV },
    m_v2: { t: 'With START held, measure DC volts from wire 2 (after OL1) to 0V', kind: 'V', read: V('starter', '2', '0V', { 'pb.PB2': true }), opts: OV },
    m_v3: { t: 'With START held, measure DC volts from wire 3 (coil terminal A1) to 0V', kind: 'V', read: V('starter', '3', '0V', { 'pb.PB2': true }), opts: OV },
    m_ol: { t: 'Look at the overload relay OL1 trip indicator', kind: 'look', opts: [['on', 'Tripped'], ['off', 'Not tripped']],
      read: function (S) { return S.olTripped ? { text: 'OL1 shows TRIPPED.', cat: 'on' } : { text: 'OL1 is not tripped.', cat: 'off' }; } },
    m_ps: { t: 'Look at power supply PS1 (DC OK light) and control fuse F1', kind: 'look', opts: [['ok', 'Both normal'], ['bad', 'Something abnormal']],
      read: function (S) { return S.faults.noSupply ? { text: 'PS1 shows DC OK, but the blown-fuse indicator on F1 is showing.', cat: 'bad' } : { text: 'PS1 shows DC OK and F1 looks intact.', cat: 'ok' }; } },
    m_cPB1: { t: 'Isolate control power, verify 0 V, then check continuity across PB1 (L+ to wire 1) with STOP released', kind: 'R', read: R('starter', 'L+', '1'), opts: OR },
    m_cPB2: { t: 'Isolate control power, verify 0 V, then hold START and check continuity across PB2 (wire 2 to wire 3)', kind: 'R', read: R('starter', '2', '3', { 'pb.PB2': true }), opts: OR },
    m_cCoil: { t: 'Isolate control power, verify 0 V, then check continuity across the M1 coil (wire 3 to 0V)', kind: 'R', read: R('starter', '3', '0V'), opts: OR },
    m_aux: { t: 'With power isolated and verified, have the holding branch inspected: M1 auxiliary contact 13-14 and its two wires', kind: 'look', opts: [['ok', 'Connections sound'], ['bad', 'A fault in the branch']],
      read: function (S) { return S.faults.holdOpen ? { text: 'The wire on M1 terminal 14 is loose in its clamp and not making contact.', cat: 'bad' } : { text: 'The connections on M1 13-14 are sound.', cat: 'ok' }; } },
    m_replace: { t: 'Replace contactor M1', bad: 'There is no evidence the contactor is faulty. Replacing parts without evidence is guessing.' },
    m_push: { t: 'Push the contactor in by hand to get the conveyor moving', bad: 'Never. That bypasses STOP and the overload, starts the machine without control and puts hands in a live panel.' },
    m_jumper: { t: 'Fit a jumper across OL1 terminals 95-96', bad: 'Never bypass an overload. It is what protects the motor from burning out.' },
    m_reset: { t: 'Reset the overload and press START again without looking for a cause', bad: 'If the overload has tripped, the trip is evidence that the motor drew too much current. Resetting blind risks a repeat trip or motor damage.' },
    m_newStart: { t: 'Replace the START button', bad: 'Check whether voltage gets past START first. Replacing it on a hunch is guessing.' },
    m_tape: { t: 'Tape the START button down so the conveyor keeps running', bad: 'Never. That defeats the control circuit: the machine would restart by itself after a stop or a power dip.' },
    /* sensor and PLC */
    s_pwr: { t: 'Look at the PEC1 power indicator', kind: 'look', opts: OIND,
      read: function (S) { return sim().powered(S) ? { text: 'PEC1 power LED is on. The sensor has its supply.', cat: 'on' } : { text: 'PEC1 power LED is off.', cat: 'off' }; } },
    s_out: { t: 'Look at the PEC1 output indicator with a box in position', kind: 'look', opts: OIND,
      read: function (S) { var r = after('plc', S, { box: true }); return r.R.el.PEC1.closed ? { text: 'PEC1 output LED is on with a box in position.', cat: 'on' } : { text: 'PEC1 output LED is off with a box in position.', cat: 'off' }; } },
    s_i0: { t: 'Look at the PLC input I0 LED with a box in position', kind: 'look', opts: OIND,
      read: function (S) { var r = after('plc', S, { box: true }); return r.S.plc.I0 ? { text: 'I0 LED is on.', cat: 'on' } : { text: 'I0 LED is off.', cat: 'off' }; } },
    s_vI0: { t: 'Measure DC volts from I0 to 0V with a box in position', kind: 'V', read: V('plc', 'I0', '0V', { box: true }), opts: OV },
    s_q0: { t: 'Look at the PLC output Q0 LED with a box in position', kind: 'look', opts: OIND,
      read: function (S) { var r = after('plc', S, { box: true }); return r.S.plc.Q0 ? { text: 'Q0 LED is on.', cat: 'on' } : { text: 'Q0 LED is off.', cat: 'off' }; } },
    s_cr2: { t: 'Look at relay CR2 with a box in position', kind: 'look', opts: [['on', 'Pulled in'], ['off', 'Not pulled in']],
      read: function (S) { var r = after('plc', S, { box: true }); return r.S.relay.CR2 ? { text: 'CR2 is pulled in.', cat: 'on' } : { text: 'CR2 is not pulled in.', cat: 'off' }; } },
    s_aim: { t: 'Check where PEC1 is aimed, and its distance, against the path of the boxes', kind: 'look', opts: [['ok', 'Aimed correctly'], ['bad', 'Not aimed at the boxes']],
      read: function (S) { return S.faults.misaligned ? { text: 'The sensor bracket has been knocked: PEC1 points above the boxes, so no light reflects back from them.', cat: 'bad' } : { text: 'PEC1 is aimed correctly at the box path.', cat: 'ok' }; } },
    s_prog: { t: 'Change the PLC program', bad: 'Changing software to mask a field problem creates a second problem. Find out whether the input is even arriving.' },
    s_plc: { t: 'Replace the PLC', bad: 'Nothing points at the PLC. Use the indicators along the chain before replacing anything.' },
    /* pneumatics */
    a_sol: { t: 'Look at the SOL1 indicator with SS2 at EXTEND', kind: 'look', opts: OIND,
      read: function (S) { var r = after('pneu', S, { 'sw.SS2': true }); return r.R.el.SOL1.on ? { text: 'SOL1 indicator is on.', cat: 'on' } : { text: 'SOL1 indicator is off.', cat: 'off' }; } },
    a_v1: { t: 'Measure DC volts from wire 1 to 0V with SS2 at EXTEND', kind: 'V', read: V('pneu', '1', '0V', { 'sw.SS2': true }), opts: OV },
    a_pg: { t: 'Read pressure gauge PG1', kind: 'look', opts: [['ok', 'Normal pressure'], ['zero', '0 bar']],
      read: function (S) { var b = sim().fluid(S, false).bar; return { text: 'PG1 reads ' + b + ' bar.', cat: b ? 'ok' : 'zero' }; } },
    a_sv: { t: 'Check the position of shutoff valve SV1', kind: 'look', opts: [['open', 'Open'], ['closed', 'Closed']],
      read: function (S) { return S.air ? { text: 'SV1 handle is in the OPEN position.', cat: 'open' } : { text: 'SV1 handle is in the CLOSED position.', cat: 'closed' }; } },
    a_plant: { t: 'Ask about the plant air supply upstream of the machine', kind: 'look', opts: [['ok', 'Air available'], ['none', 'No air']],
      read: function (S) { return S.faults.airOff ? { text: 'The plant air to this line is off: no pressure at the machine\'s air drop.', cat: 'none' } : { text: 'Plant air is available at the drop.', cat: 'ok' }; } },
    a_override: { t: 'Press the manual override on valve V1 while reaching past the cylinder', bad: 'Unsafe. If air returns, the cylinder moves with you in its path. Overrides are for authorized people under controlled conditions.' },
    a_valve: { t: 'Replace valve V1', bad: 'No evidence points at the valve. Find out whether it has a command and air first.' }
  };

  /* ------------------------------------------------ shared questions */
  var SAFE_ELEC = {
    q: 'Before you check anything, what are the right working conditions for you here?',
    choices: [
      { t: 'Stay within what I am authorized to do: observe, use the drawing, and measure only on the 24 VDC control circuit. Anything needing isolation follows the site procedure.', ok: true, fb: 'Right. Know your limits and say them out loud. That is what a supervisor wants to hear.' },
      { t: 'It is only a small circuit, so no particular precautions are needed.', fb: 'Every job starts with knowing what you are allowed to do and what energy is present. Habit matters more than the voltage.' },
      { t: 'Open the panel and start moving wires until something changes.', fb: 'Disturbing wiring without a plan creates new faults and can be unsafe. Decide what you are permitted to do first, then make deliberate checks.' }
    ]
  };
  var SAFE_MOTOR = {
    q: 'Before you check anything, what are the right working conditions for you here?',
    choices: [
      { t: 'Work within my authorization: observe, use the schematic, measure only on the 24 VDC control circuit. The three-phase power circuit and any isolation are handled by qualified people following site lockout procedure.', ok: true, fb: 'Right. The power circuit is not yours to probe, and saying so is a strength in an interview.' },
      { t: 'Press STOP, then it is safe to put hands inside the panel.', fb: 'A STOP button only opens the control circuit. It is not energy isolation: the power circuit is still live.' },
      { t: 'Hold the contactor in by hand to see whether the motor turns.', fb: 'Never operate a contactor by hand or bypass a protective function to make a machine run.' }
    ]
  };
  var NOSTART_CAUSES = ['noSupply', 'stopOpen', 'olTrip', 'startOpen', 'coilOpen'];
  var NOSTART_CHECKS = ['m_obs', 'm_vL', 'm_v1', 'm_v2', 'm_v3', 'm_ol', 'm_ps', 'm_cPB1', 'm_cPB2', 'm_cCoil', 'm_replace', 'm_push', 'm_jumper', 'm_reset'];
  function noStart(id, letter, cause, why, repair) {
    return { id: id, fam: 'nostart', title: 'Motor will not start · case ' + letter, diagram: 'starter', station: 'panel', cause: cause, controls: ['pb.PB2', 'pb.PB1', 'supply'],
      symptom: 'Operator report: "I press START and nothing happens. The conveyor does not move."',
      note: 'Five different cases share this exact symptom. The symptom alone does not identify the failed component.',
      observe: { text: 'Press <b>START</b> and watch contactor M1 and the motor.', goal: function (S, R, ui) { return ui.log.indexOf('pb.PB2:true') >= 0; }, seen: 'Confirmed: with START pressed, M1 does not pull in and MTR1 does not run.' },
      safe: SAFE_MOTOR,
      expected: { q: 'What should normally happen when START is pressed?',
        choices: [
          { t: 'Current flows from L+ through STOP, the overload contact and START to the M1 coil and back to 0V. M1 pulls in, its main contacts run the motor and its auxiliary contact holds the coil in.', ok: true, fb: 'Right. That sentence is the whole circuit, and every device in it is a possible cause.' },
          { t: 'START connects three-phase power straight to the motor.', fb: 'START is a small control device. The motor current goes through the contactor\'s main contacts.' },
          { t: 'The PLC decides whether the motor may start.', fb: 'There is no PLC in this starter circuit. It is a hard-wired rung.' } ] },
      section: { q: 'M1 does not pull in at all. Which section of the drawing set do you concentrate on?',
        choices: [
          { t: 'The control circuit (page 3): control supply, PB1, OL1 contact, PB2 and the M1 coil.', ok: true, fb: 'Right. The contactor is not being energized, so the problem is in the circuit that energizes it.' },
          { t: 'The motor power circuit (page 2): the motor and its cable.', fb: 'If the contactor never closes, the motor has not even been asked to run. Start with the control circuit.' },
          { t: 'The power fuses FU1–FU3.', fb: 'Power fuses affect the motor, but they have nothing to do with whether the contactor coil pulls in.' } ] },
      causes: NOSTART_CAUSES, checks: NOSTART_CHECKS, why: why, repair: repair };
  }

  var M = [
    { id: 'M1', title: 'The lamp that stays dark · case A', diagram: 'lamp', station: 'panel', cause: 'fuseOpen', controls: ['sw.S1', 'supply'],
      symptom: 'Operator report: "Indicator PL1 does not come on when I switch S1 on."',
      note: 'Two cases share this symptom. Do not assume they share a cause.',
      observe: { text: 'See it for yourself. Switch <b>S1</b> on and watch PL1.', goal: function (S) { return S.sw.S1; }, seen: 'Confirmed: S1 is closed and PL1 stays off.' },
      safe: SAFE_ELEC,
      expected: { q: 'What should normally happen when S1 is closed?',
        choices: [
          { t: 'A complete path forms from L+ through F1, S1, wire 2 and PL1 to 0V, and the lamp lights.', ok: true, fb: 'Right. Knowing the expected path tells you which devices could be responsible.' },
          { t: 'The lamp lights only if the fuse is removed.', fb: 'The fuse is in series. It must be installed and intact for current to flow.' },
          { t: 'S1 sends a signal to a PLC, which lights the lamp.', fb: 'There is no PLC in this circuit. It is a single series loop.' } ] },
      section: { q: 'Which part of the drawing is relevant?',
        choices: [
          { t: 'The whole series loop: PS1, F1, S1, wire 2, PL1 and the return to 0V.', ok: true, fb: 'Right. In a series loop any device or connection could be the open point.' },
          { t: 'Only the lamp, because the lamp is what is not working.', fb: 'The lamp is where the symptom shows. The cause can be anywhere in its path.' },
          { t: 'Only the switch, because that is what the operator touched.', fb: 'The switch is one candidate among several in the loop.' } ] },
      causes: ['fuseOpen', 'wireOpen', 'lampOpen', 's1Open'],
      checks: ['l_vL', 'l_v1', 'l_v2a', 'l_v2b', 'l_cF1', 'l_cW2', 'l_newLamp', 'l_bridge'],
      why: 'Supply voltage is present at L+ but missing at test point 1 with S1 closed, so the voltage is lost across F1.',
      repair: 'A qualified person isolates the circuit, finds out why the fuse opened (short circuit, damaged wire, wrong rating), corrects that, fits a fuse of the same type and rating, restores power and confirms PL1 follows S1. If the new fuse opens again, the real cause is still present.' },
    { id: 'M2', title: 'The lamp that stays dark · case B', diagram: 'lamp', station: 'panel', cause: 'wireOpen', controls: ['sw.S1', 'supply'],
      symptom: 'Operator report: "Indicator PL1 does not come on when I switch S1 on."',
      note: 'Same symptom as case A. Let the measurements decide, not memory.',
      observe: { text: 'Switch <b>S1</b> on and confirm the symptom.', goal: function (S) { return S.sw.S1; }, seen: 'Confirmed: S1 is closed and PL1 stays off.' },
      safe: SAFE_ELEC,
      expected: { q: 'What should normally happen when S1 is closed?',
        choices: [
          { t: 'A complete path from L+ through F1, S1, wire 2 and PL1 to 0V, so the lamp lights.', ok: true, fb: 'Right.' },
          { t: 'The lamp flashes.', fb: 'Nothing in this circuit would make it flash. It should light steadily.' } ] },
      section: { q: 'Last time it was the fuse. What is the right approach now?',
        choices: [
          { t: 'Treat every device and connection in the loop as a candidate again and let the measurements decide.', ok: true, fb: 'Right. The same symptom can have several causes.' },
          { t: 'Replace the fuse straight away, since that fixed it last time.', fb: 'That is guessing. Measure first.' } ] },
      causes: ['fuseOpen', 'wireOpen', 'lampOpen', 's1Open'],
      checks: ['l_vL', 'l_v1', 'l_v2a', 'l_v2b', 'l_cF1', 'l_cW2', 'l_newFuse', 'l_newLamp'],
      why: 'Voltage is present at 2a and missing at 2b. Those are two ends of the same conductor, so the break is between them.',
      repair: 'A qualified person isolates the circuit, finds the break or loose termination on wire 2, remakes the connection properly, restores power and confirms the lamp follows S1.' },
    noStart('M4', 'A', 'olTrip',
      'Voltage is present up to the overload contact and missing after it, and the relay shows tripped.',
      'The trip is a symptom. An authorized person looks for the reason: a jammed conveyor, a seized bearing, too much load, a wrong overload setting or a supply problem. Only when that is corrected is the overload reset, the motor restarted with START, and its running checked.'),
    noStart('M9', 'B', 'noSupply',
      'There is no voltage between L+ and 0V at the rung even though PS1 shows DC OK, and control fuse F1 shows open. Nothing downstream can work without the supply.',
      'A qualified person isolates the circuit, finds out why F1 opened (a short on the control wiring, a failed device, wrong rating), corrects that, fits the same type and rating of fuse, restores power, confirms 24 V at L+ and verifies a normal start and stop.'),
    noStart('M3', 'C', 'stopOpen',
      'Control power is present at L+, but with START held there is no voltage at wire 1, the first point after the STOP contact. A released normally closed STOP contact should pass it.',
      'A qualified person isolates and locks out following site procedure, inspects PB1 and its terminations, repairs or replaces the contact block, restores power and verifies a normal start, run and stop.'),
    noStart('M10', 'D', 'startOpen',
      'With START held, voltage reaches wire 2 at the START button but does not appear at wire 3. STOP and the overload contact are passing it; the START path is not.',
      'A qualified person isolates and locks out, inspects PB2, its contact block and terminations, repairs or replaces as needed, restores power and verifies start, hold and stop.'),
    noStart('M6', 'E', 'coilOpen',
      'With START held, 24 V reaches wire 3, so PB1, OL1 and PB2 are all conducting. The coil has voltage at its terminal but does not operate, and isolated it reads open instead of a normal coil resistance.',
      'A qualified person isolates and locks out, confirms the coil is open at terminals A1-A2, replaces the coil or contactor with the correct voltage rating, restores power and verifies start, hold and stop.'),
    { id: 'M5', title: 'Runs only while START is held', diagram: 'starter', station: 'panel', cause: 'holdOpen', controls: ['pb.PB2', 'pb.PB1', 'supply'],
      symptom: 'Operator report: "The conveyor runs while I keep my finger on START. As soon as I let go, it stops."',
      observe: { text: 'Press and hold <b>START</b>, then release it. Watch M1 both times.', goal: function (S, R, ui) { var i = ui.log.indexOf('pb.PB2:true'); return i >= 0 && ui.log.indexOf('pb.PB2:false', i) >= 0; }, seen: 'Confirmed: M1 pulls in while START is held and drops out the moment it is released.' },
      safe: SAFE_MOTOR,
      expected: { q: 'What should keep the coil energized after START is released?',
        choices: [
          { t: 'The M1 auxiliary contact, in parallel with START, which closes when the contactor pulls in.', ok: true, fb: 'Right. That is the holding circuit.' },
          { t: 'The START button latches mechanically.', fb: 'START is a momentary button. It springs back.' },
          { t: 'The overload relay holds it in.', fb: 'The overload contact only permits or blocks the circuit. It does not hold anything in.' } ] },
      section: { q: 'The motor does run while START is held. What does that tell you about where to look?',
        choices: [
          { t: 'The series path and the coil are working. Look at the parallel holding branch: the M1 auxiliary contact and its wires.', ok: true, fb: 'Right. The symptom itself rules out most of the rung.' },
          { t: 'Look at the STOP button.', fb: 'If STOP were open the motor would not run at all.' },
          { t: 'Look at the power circuit.', fb: 'The motor runs, so the power circuit is delivering.' } ] },
      causes: ['holdOpen', 'startOpen', 'coilOpen', 'stopOpen'],
      checks: ['m_hold', 'm_v3', 'm_aux', 'm_newStart', 'm_tape'],
      why: 'The motor runs with START held, so every series device and the coil are proven good. The only part of the rung not doing its job is the parallel path around START.',
      repair: 'A qualified person isolates and locks out, remakes the termination on M1 terminal 14 (or replaces the auxiliary contact block if it is faulty), restores power and verifies that the motor keeps running after START is released and stops on STOP.' },
    { id: 'M7', title: 'The sensor that sees nothing', diagram: 'plc', station: 'conveyor', cause: 'misaligned', controls: ['box', 'supply'],
      symptom: 'Operator report: "Boxes go past the photo-eye but the BOX PRESENT light never comes on."',
      observe: { text: 'Put a <b>box at the sensor</b> and watch PL2.', goal: function (S) { return S.box; }, seen: 'Confirmed: a box is in position and PL2 stays off.' },
      safe: { q: 'Before you check anything, what are the right working conditions for you here?',
        choices: [
          { t: 'Work within my authorization, stay clear of the moving conveyor, and never reach into the machine to test the sensor while it can move.', ok: true, fb: 'Right. A running conveyor is mechanical energy. Sensors are often next to moving parts.' },
          { t: 'Wave a hand in front of the sensor while the conveyor is running.', fb: 'Do not put hands near moving equipment. Use an approved method and follow site procedure.' },
          { t: 'Force the PLC output on from a laptop to see whether the lamp works.', fb: 'Forcing outputs can start equipment unexpectedly and needs specific authorization and training.' } ] },
      expected: { q: 'What is the normal chain of events when a box arrives?',
        choices: [
          { t: 'PEC1 detects the box, input I0 turns on, the logic turns on Q0, CR2 pulls in and its contact lights PL2.', ok: true, fb: 'Right. Six links, each one a checkpoint.' },
          { t: 'PEC1 powers the lamp directly.', fb: 'The sensor only sends a small signal to the PLC input.' } ] },
      section: { q: 'PL2 is at the end of a chain. How do you decide where in the chain to look?',
        choices: [
          { t: 'Check the indicators in signal order and find the first link that is not doing its job.', ok: true, fb: 'Right. Everything after the first wrong link is only following.' },
          { t: 'Start at the lamp and replace parts working backwards.', fb: 'That is part-swapping. Use the indicators along the chain instead.' },
          { t: 'Go straight to the PLC program.', fb: 'The program can only react to its inputs. Check whether the input is even arriving.' } ] },
      causes: ['misaligned', 'cr2Open', 'pl2Open'],
      checks: ['s_pwr', 's_out', 's_i0', 's_vI0', 's_q0', 's_cr2', 's_aim', 's_prog', 's_plc'],
      why: 'The sensor is powered but does not switch with a box present, and the missing signal shows at I0. The chain stops at the field device, so everything after it is only following.',
      repair: 'With the conveyor made safe following site procedure, an authorized person realigns and secures the bracket, checks the lens is clean, then verifies with real boxes that the sensor LED, I0, Q0, CR2 and PL2 all respond.' },
    { id: 'M8', title: 'The cylinder that will not move (optional)', diagram: 'pneu', station: 'pneu', cause: 'airOff', controls: ['sw.SS2', 'supply'],
      symptom: 'Operator report: "The pusher cylinder does not come out when I select EXTEND."',
      observe: { text: 'Turn <b>SS2</b> to EXTEND and watch CYL1.', goal: function (S) { return S.sw.SS2; }, seen: 'Confirmed: SS2 is at EXTEND and CYL1 has not moved.' },
      safe: { q: 'Before you check anything, what are the right working conditions for you here?',
        choices: [
          { t: 'Keep clear of the cylinder\'s travel. Treat the air circuit as a separate energy source that may hold or regain pressure, and follow site procedure before anyone works on it.', ok: true, fb: 'Right. A cylinder that is "not moving" can move suddenly when air returns.' },
          { t: 'Lean in and pull on the rod to see if it is stuck.', fb: 'Never put yourself in the path of an actuator that could move.' },
          { t: 'Switching SS2 off makes the cylinder safe.', fb: 'A selector switch is a control command, not energy isolation. Air pressure is a separate energy source.' } ] },
      expected: { q: 'What should normally happen when SS2 is turned to EXTEND?',
        choices: [
          { t: 'SOL1 energizes, valve V1 shifts, air flows from port 1 to port 4 into the cap end, and CYL1 extends.', ok: true, fb: 'Right. An electrical step, a valve step and an air step.' },
          { t: 'SOL1 pushes the cylinder out directly.', fb: 'The solenoid only shifts the valve. Air pressure does the work.' } ] },
      section: { q: 'This machine function uses two drawings. How do you divide the problem?',
        choices: [
          { t: 'Check whether the electrical command reaches SOL1, then whether air pressure is available to the valve.', ok: true, fb: 'Right. Splitting electrical from pneumatic halves the search.' },
          { t: 'Only the electrical rung matters.', fb: 'The solenoid only shifts the valve. Without air nothing moves.' },
          { t: 'Only the cylinder matters.', fb: 'The cylinder is the last link. Check that it is being given a command and air first.' } ] },
      causes: ['airOff', 'sv1Closed', 'ss2Open'],
      checks: ['a_sol', 'a_v1', 'a_pg', 'a_sv', 'a_plant', 'a_override', 'a_valve'],
      why: 'The electrical command is proven at SOL1. The gauge reads 0 bar with SV1 open, and the plant air drop has no pressure.',
      repair: 'The air supply is restored by the responsible person. Because the cylinder will move when pressure returns, the area is kept clear first. Afterwards, check PG1 shows normal pressure and verify extend and retract.' }
  ];

  /* ------------------------------------------------ model-derived reasoning */
  function stateFor(m, causeId) {
    var s = sim().defaultState();
    sim().patch(s, CAUSES[causeId].set);
    sim().settle(FS.diagrams[m.diagram].circuit, s);
    return s;
  }
  function readCheck(m, chkId, causeId) { return CHK[chkId].read(stateFor(m, causeId || m.cause)); }
  /* Which listed causes does the evidence gathered so far rule out? */
  function ruledOut(m, doneIds) {
    var out = {};
    m.causes.forEach(function (c) {
      if (c === m.cause) return;
      out[c] = doneIds.some(function (id) { return !CHK[id].bad && readCheck(m, id, c).cat !== readCheck(m, id).cat; });
    });
    return out;
  }
  /* Does the observed result of a check support, weaken or not separate a suspected cause? */
  function verdict(m, chkId, suspect) {
    var obs = readCheck(m, chkId).cat;
    if (readCheck(m, chkId, suspect).cat !== obs) return 'weakens';
    return m.causes.some(function (c) { return readCheck(m, chkId, c).cat !== obs; }) ? 'supports' : 'neutral';
  }
  function optLabel(chkId, cat) { var o = (CHK[chkId].opts || []).filter(function (q) { return q[0] === cat; })[0]; return o ? o[1] : (cat === 'na' ? 'Not modeled' : cat); }

  FS.missions = M; FS.CAUSES = CAUSES; FS.CHK = CHK;
  FS.mission = function (id) { return M.filter(function (m) { return m.id === id; })[0]; };
  FS.mstate = stateFor; FS.mread = readCheck; FS.mruled = ruledOut; FS.mverdict = verdict; FS.moptLabel = optLabel;
})(typeof window !== 'undefined' ? window : globalThis);
