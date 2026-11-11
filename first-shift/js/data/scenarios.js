/* FIRST SHIFT — troubleshooting missions (local structured data).
 * Evidence is produced by functions that read the simulation, so every reading
 * shown to the learner comes from the circuit model with the fault applied.
 * Check types: key (needed before a diagnosis is accepted), useful, bad
 * (guessing, part-swapping or unsafe: never rewarded). */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  function sim() { return FS.sim; }
  function volts(cid, S, a, b, set) { return sim().probe(cid, S, { mode: 'V', a: a, b: b, set: set }).text; }
  function ohms(cid, S, a, b, set) { return sim().probe(cid, S, { mode: 'R', a: a, b: b, set: set }).text; }
  function after(cid, S, set) { var c = sim().clone(S); sim().patch(c, set); var r = sim().settle(cid, c); return { S: c, R: r }; }

  var SAFE_ELEC = {
    q: 'Before you check anything, what are the right working conditions for you here?',
    choices: [
      { t: 'Stay within what I am authorized to do: observe, use the drawing, and measure only on the 24 VDC control circuit. Anything needing isolation follows the site procedure.', ok: true, fb: 'Right. Know your limits and say them out loud. That is what a supervisor wants to hear.' },
      { t: 'It is only a small circuit, so no particular precautions are needed.', fb: 'Every job starts with knowing what you are allowed to do and what energy is present, even small ones. Habit matters more than the voltage.' },
      { t: 'Open the panel and start moving wires until something changes.', fb: 'Disturbing wiring without a plan creates new faults and can be unsafe. Decide what you are permitted to do first, then make deliberate checks.' }
    ]
  };
  var SAFE_MOTOR = {
    q: 'Before you check anything, what are the right working conditions for you here?',
    choices: [
      { t: 'Work within my authorization: observe, use the schematic, measure only on the 24 VDC control circuit. The three-phase power circuit and any isolation are handled by qualified people following site lockout procedure.', ok: true, fb: 'Right. The power circuit is not yours to probe, and saying so is a strength in an interview.' },
      { t: 'Press STOP, then it is safe to put hands inside the panel.', fb: 'A STOP button only opens the control circuit. It is not energy isolation: the power circuit is still live.' },
      { t: 'Hold the contactor in by hand to see whether the motor turns.', fb: 'Never operate a contactor by hand or bypass a protective function to make a machine run. It is unsafe and proves nothing about the control circuit.' }
    ]
  };

  var M = [
    /* ------------------------------------------------ 1 */
    { id: 'M1', title: 'The lamp that stays dark (A)', diagram: 'lamp', station: 'panel', faults: { fuseOpen: true }, controls: ['sw.S1', 'supply'],
      symptom: 'Operator report: "Indicator PL1 does not come on when I switch S1 on."',
      observe: { text: 'See it for yourself. Switch <b>S1</b> on and watch PL1.', goal: function (S) { return S.sw.S1; }, seen: 'Confirmed: S1 is closed and PL1 stays off.' },
      safe: SAFE_ELEC,
      expected: { q: 'What should normally happen when S1 is closed?',
        choices: [
          { t: 'A complete path forms from L+ through F1, S1 and PL1 to 0V, and the lamp lights.', ok: true, fb: 'Right. Knowing the expected path tells you which devices could be responsible.' },
          { t: 'The lamp lights only if the fuse is removed.', fb: 'The fuse is in series. It must be installed and intact for current to flow.' },
          { t: 'S1 sends a signal to a PLC, which lights the lamp.', fb: 'There is no PLC in this circuit. It is a single series loop.' } ] },
      section: { q: 'Which part of the drawing is relevant?',
        choices: [
          { t: 'The whole series loop: PS1, F1, S1, wire 2, PL1 and the return to 0V.', ok: true, fb: 'Right. In a series loop any device or connection could be the open point, so they are all candidates.' },
          { t: 'Only the lamp, because the lamp is what is not working.', fb: 'The lamp is where the symptom shows. The cause can be anywhere in its path.' },
          { t: 'Only the switch, because that is what the operator touched.', fb: 'The switch is one candidate among several in the loop.' } ] },
      checks: [
        { id: 'a', type: 'useful', t: 'Measure DC volts from L+ to 0V', ev: function (S) { return volts('lamp', S, 'L+', '0V') + ' between L+ and 0V. The supply is present.'; } },
        { id: 'b', type: 'key', t: 'Measure DC volts from test point 1 (after F1) to 0V', ev: function (S) { return volts('lamp', S, '1', '0V') + ' at test point 1.'; } },
        { id: 'c', type: 'useful', t: 'With S1 closed, measure DC volts from 2b (lamp terminal) to 0V', ev: function (S) { return volts('lamp', S, '2b', '0V', { 'sw.S1': true }) + ' at the lamp. Consistent with voltage being lost somewhere before it.'; } },
        { id: 'd', type: 'key', t: 'Isolate control power, verify 0 V, then check continuity across F1 (L+ to 1)', ev: function (S) { return 'With power isolated and absence of voltage verified: ' + ohms('lamp', S, 'L+', '1') + ' across F1.'; } },
        { id: 'e', type: 'bad', t: 'Fit a new lamp', fb: 'Nothing so far points at the lamp. Swapping parts without evidence costs time, hides the real cause and is not troubleshooting.' },
        { id: 'f', type: 'bad', t: 'Bridge the fuse holder with a piece of wire to see if the lamp lights', fb: 'Never bypass a protective device. A fuse that has opened may be protecting against a fault that is still there.' }
      ],
      interpret: { q: 'You read 24 V at L+ and 0 V at test point 1, with S1 closed. What does that tell you?',
        choices: [
          { t: 'The voltage is lost between L+ and point 1, so the open is at F1 or its connections.', ok: true, fb: 'Right. Supply voltage on one side of a device and none on the other side means that device is not passing it.' },
          { t: 'The lamp has failed.', fb: 'A failed lamp would still have 24 V arriving at its terminal. Here the voltage never gets past F1.' },
          { t: 'The power supply is faulty.', fb: 'The supply measured 24 V at its terminals. It is doing its job.' } ] },
      diagnose: { q: 'What is the most likely fault?',
        choices: [
          { t: 'Fuse F1 is open.', ok: true },
          { t: 'Switch S1 has failed open.', fb: 'The voltage is already missing at test point 1, before S1.' },
          { t: 'Wire 2 is open.', fb: 'The voltage is lost before it ever reaches wire 2.' },
          { t: 'Lamp PL1 is burnt out.', fb: 'A burnt-out lamp would still have 24 V at its terminal 2b.' } ] },
      why: 'Supply voltage is present at L+ but absent at test point 1, and with the circuit isolated F1 shows no continuity. Both results point at the same device.',
      others: ['An open lamp filament', 'A failed switch contact', 'A broken wire or loose terminal anywhere in the loop', 'No output from the power supply'],
      repair: 'A qualified person isolates the circuit, finds out why the fuse opened (short circuit, damaged wire, wrong rating), corrects that, fits a fuse of the same type and rating, restores power and confirms PL1 follows S1. If the new fuse opens again, the real cause is still present.' },

    /* ------------------------------------------------ 2 */
    { id: 'M2', title: 'The lamp that stays dark (B)', diagram: 'lamp', station: 'panel', faults: { wireOpen: true }, controls: ['sw.S1', 'supply'],
      symptom: 'Operator report: "PL1 does not light with S1 on. It was working yesterday."',
      observe: { text: 'Same symptom as before. Switch <b>S1</b> on and confirm it.', goal: function (S) { return S.sw.S1; }, seen: 'Confirmed: S1 is closed and PL1 stays off. Same symptom as Mission 1. Do not assume the same cause.' },
      safe: SAFE_ELEC,
      expected: { q: 'What should normally happen when S1 is closed?',
        choices: [
          { t: 'A complete path from L+ through F1, S1, wire 2 and PL1 to 0V, so the lamp lights.', ok: true, fb: 'Right.' },
          { t: 'The lamp flashes.', fb: 'Nothing in this circuit would make it flash. It should light steadily.' } ] },
      section: { q: 'Last time it was the fuse. What is the right approach now?',
        choices: [
          { t: 'Treat every device and connection in the loop as a candidate again and let the measurements decide.', ok: true, fb: 'Right. The same symptom can have several causes. Evidence decides, not memory.' },
          { t: 'Replace the fuse straight away, since that fixed it last time.', fb: 'That is guessing. Measure first.' } ] },
      checks: [
        { id: 'a', type: 'useful', t: 'Measure DC volts from L+ to 0V', ev: function (S) { return volts('lamp', S, 'L+', '0V') + '. Supply present.'; } },
        { id: 'b', type: 'useful', t: 'Measure DC volts from test point 1 (after F1) to 0V', ev: function (S) { return volts('lamp', S, '1', '0V') + ' after the fuse. F1 is passing voltage.'; } },
        { id: 'c', type: 'key', t: 'With S1 closed, measure DC volts from 2a (switch end of wire 2) to 0V', ev: function (S) { return volts('lamp', S, '2a', '0V', { 'sw.S1': true }) + ' at 2a.'; } },
        { id: 'd', type: 'key', t: 'With S1 closed, measure DC volts from 2b (lamp end of wire 2) to 0V', ev: function (S) { return volts('lamp', S, '2b', '0V', { 'sw.S1': true }) + ' at 2b.'; } },
        { id: 'e', type: 'useful', t: 'Isolate control power, verify 0 V, then check continuity from 2a to 2b', ev: function (S) { return 'With power isolated and verified: ' + ohms('lamp', S, '2a', '2b') + ' between the two ends of wire 2.'; } },
        { id: 'f', type: 'bad', t: 'Replace fuse F1', fb: 'Measure before replacing. If 24 V is present after F1, the fuse is fine and a new one changes nothing.' },
        { id: 'g', type: 'bad', t: 'Replace lamp PL1', fb: 'No evidence points at the lamp yet. Check whether voltage actually arrives at it.' }
      ],
      interpret: { q: 'You read 24 V at 2a and 0 V at 2b. They are the two ends of the same wire. What does that tell you?',
        choices: [
          { t: 'Both ends of one wire should read the same. They do not, so the wire or one of its terminations is open.', ok: true, fb: 'Right. One wire number is one electrical point. A difference between its ends means a break.' },
          { t: 'The lamp is using up the voltage.', fb: 'The lamp is after 2b. With no current flowing, nothing is being used.' },
          { t: 'S1 is open.', fb: '24 V at 2a means the voltage has already passed through S1.' } ] },
      diagnose: { q: 'What is the most likely fault?',
        choices: [
          { t: 'Wire 2 is open between S1 and PL1 (a broken wire or loose connection).', ok: true },
          { t: 'Fuse F1 is open.', fb: '24 V was measured after the fuse.' },
          { t: 'Lamp PL1 is burnt out.', fb: 'With a burnt-out lamp, 24 V would still reach 2b.' },
          { t: 'Switch S1 has failed.', fb: '24 V was measured at 2a, after the switch.' } ] },
      why: 'Voltage is present at 2a and missing at 2b. Those are two ends of the same conductor, so the break is between them. The continuity check with power isolated agrees.',
      others: ['An open fuse', 'A failed lamp', 'A failed switch contact', 'No supply'],
      repair: 'A qualified person isolates the circuit, finds the break or loose termination on wire 2, remakes the connection properly, restores power and confirms the lamp follows S1.' },

    /* ------------------------------------------------ 3 */
    { id: 'M3', title: 'Conveyor will not start (A)', diagram: 'starter', station: 'conveyor', faults: { stopOpen: true }, controls: ['pb.PB2', 'pb.PB1', 'supply'],
      symptom: 'Operator report: "I press START and nothing happens. No noise from the panel, conveyor does not move."',
      observe: { text: 'Press <b>START</b> and watch contactor M1 and the motor.', goal: function (S, R, ui) { return ui.log.indexOf('pb.PB2:true') >= 0; }, seen: 'Confirmed: with START pressed, M1 does not pull in and MTR1 does not run.' },
      safe: SAFE_MOTOR,
      expected: { q: 'What should normally happen when START is pressed?',
        choices: [
          { t: 'Current flows through STOP, the overload contact and START to the M1 coil. M1 pulls in, its main contacts run the motor and its auxiliary contact holds the coil in.', ok: true, fb: 'Right. That sentence is the whole circuit.' },
          { t: 'START connects three-phase power straight to the motor.', fb: 'START is a small control device. The motor current goes through the contactor\'s main contacts.' } ] },
      section: { q: 'M1 does not pull in at all. Which section of the drawing do you concentrate on?',
        choices: [
          { t: 'The control rung: control power, PB1, OL1 contact, PB2 and the M1 coil.', ok: true, fb: 'Right. The contactor is not being energized, so the problem is in the circuit that energizes it.' },
          { t: 'The motor and its cable.', fb: 'If the contactor never closes, the motor has not even been asked to run. Start with the control circuit.' },
          { t: 'The power fuses FU1–FU3.', fb: 'Power fuses affect the motor, but they have nothing to do with whether the contactor coil pulls in.' } ] },
      checks: [
        { id: 'a', type: 'useful', t: 'Measure DC volts from L+ to 0V', ev: function (S) { return volts('starter', S, 'L+', '0V') + '. Control power is present.'; } },
        { id: 'b', type: 'key', t: 'Measure DC volts from wire 1 (after STOP) to 0V', ev: function (S) { return volts('starter', S, '1', '0V') + ' at wire 1, with STOP not pressed.'; } },
        { id: 'c', type: 'useful', t: 'Look at the overload relay OL1 trip indicator', ev: function (S) { return S.olTripped ? 'OL1 shows TRIPPED.' : 'OL1 is not tripped.'; } },
        { id: 'd', type: 'key', t: 'Isolate control power, verify 0 V, then check continuity across PB1 (L+ to 1) with STOP released', ev: function (S) { return 'With power isolated and verified: ' + ohms('starter', S, 'L+', '1') + ' across the STOP contact. A released NC contact should show continuity.'; } },
        { id: 'e', type: 'bad', t: 'Replace contactor M1', fb: 'There is no evidence the contactor is faulty. It has not been given voltage yet, so it has not had the chance to work.' },
        { id: 'f', type: 'bad', t: 'Push the contactor in by hand to get the conveyor moving', fb: 'Never. That bypasses STOP and the overload, starts the machine without control, and puts hands in a live panel.' }
      ],
      interpret: { q: 'You read 24 V on L+ and 0 V on wire 1, and nobody is pressing STOP. What does that tell you?',
        choices: [
          { t: 'The voltage is lost across PB1. Its normally closed contact, or the wiring to it, is open.', ok: true, fb: 'Right. A released NC STOP contact should pass voltage. This one is not.' },
          { t: 'The overload has tripped.', fb: 'The overload contact is after wire 1. The voltage is already missing before it.' },
          { t: 'The M1 coil is open.', fb: 'An open coil would still show 24 V arriving on wires 1 and 2.' } ] },
      diagnose: { q: 'What is the most likely fault?',
        choices: [
          { t: 'The STOP (PB1) contact circuit is open even though the button is released.', ok: true },
          { t: 'The overload relay is tripped.', fb: 'OL1 was checked and is not tripped, and voltage is lost before it.' },
          { t: 'The M1 coil is open.', fb: 'Voltage never reaches the coil, so the coil has not been tested by the circuit.' },
          { t: 'The START button is faulty.', fb: 'Voltage does not even reach the START button: wire 1 is already at 0 V.' } ] },
      why: 'Control power is present, but it disappears across PB1 with the button released, and the isolated continuity check across PB1 reads open. A normally closed STOP contact that is stuck open, or a wire off its terminal, prevents any start.',
      others: ['No control power', 'A tripped overload', 'A faulty START button', 'An open contactor coil', 'A broken wire anywhere in the rung'],
      repair: 'A qualified person isolates and locks out following site procedure, inspects PB1 and its terminations, repairs or replaces the contact block, restores power and verifies a normal start, run and stop.' },

    /* ------------------------------------------------ 4 */
    { id: 'M4', title: 'Conveyor will not start (B)', diagram: 'starter', station: 'conveyor', faults: {}, preset: { olTripped: true }, controls: ['pb.PB2', 'pb.PB1', 'supply'],
      symptom: 'Operator report: "The conveyor stopped by itself with boxes on it. Now START does nothing."',
      observe: { text: 'Press <b>START</b> and watch M1.', goal: function (S, R, ui) { return ui.log.indexOf('pb.PB2:true') >= 0; }, seen: 'Confirmed: M1 does not pull in. Note what the operator said: it stopped by itself, under load.' },
      safe: SAFE_MOTOR,
      expected: { q: 'Which devices must be closed for START to energize the M1 coil?',
        choices: [
          { t: 'STOP (PB1) and the overload contact (OL1), both in series with the coil.', ok: true, fb: 'Right. Either one open and START can do nothing.' },
          { t: 'Only the START button.', fb: 'START is in series with STOP and the overload contact. All three must conduct.' },
          { t: 'The M1 auxiliary contact.', fb: 'The auxiliary contact holds the circuit after starting. It is not needed for the initial start.' } ] },
      section: { q: 'Which section of the drawing do you concentrate on?',
        choices: [
          { t: 'The control rung, especially the series devices before the coil.', ok: true, fb: 'Right. And the operator\'s words, "stopped by itself under load", are a clue worth keeping in mind.' },
          { t: 'The pneumatic circuit.', fb: 'Nothing in the symptom involves air.' } ] },
      checks: [
        { id: 'a', type: 'key', t: 'Measure DC volts from wire 1 (after STOP) to 0V', ev: function (S) { return volts('starter', S, '1', '0V') + ' at wire 1. Voltage is passing STOP.'; } },
        { id: 'b', type: 'key', t: 'Measure DC volts from wire 2 (after OL1) to 0V', ev: function (S) { return volts('starter', S, '2', '0V') + ' at wire 2.'; } },
        { id: 'c', type: 'key', t: 'Look at the overload relay OL1 trip indicator', ev: function (S) { return S.olTripped ? 'OL1 shows TRIPPED.' : 'OL1 is not tripped.'; } },
        { id: 'd', type: 'bad', t: 'Reset the overload and restart straight away', fb: 'A trip is evidence that the motor drew too much current. Resetting without finding out why risks a repeat trip or motor damage. Establish the cause first.' },
        { id: 'e', type: 'bad', t: 'Fit a jumper across OL1 terminals 95-96', fb: 'Never bypass an overload. It is the only thing protecting the motor from burning out.' },
        { id: 'f', type: 'bad', t: 'Replace the START button', fb: 'Voltage does not reach the START button. Nothing points at it.' }
      ],
      interpret: { q: '24 V on wire 1, 0 V on wire 2, and the OL1 indicator shows tripped. What does that tell you?',
        choices: [
          { t: 'The overload has tripped and opened its control contact, which blocks the coil circuit.', ok: true, fb: 'Right. Three pieces of evidence agree.' },
          { t: 'The overload relay is faulty and should be bypassed.', fb: 'It has done exactly what it is for. Never bypass it.' },
          { t: 'The STOP button is stuck.', fb: 'Voltage is present after STOP on wire 1.' } ] },
      diagnose: { q: 'What is the most likely reason the motor will not start?',
        choices: [
          { t: 'The overload relay OL1 has tripped, so its contact is open. The cause of the overload still needs finding.', ok: true },
          { t: 'The STOP contact is open.', fb: '24 V was measured after STOP.' },
          { t: 'The M1 coil is open.', fb: 'Voltage does not reach the coil while OL1 is open, so the coil is untested.' },
          { t: 'The holding circuit is open.', fb: 'A holding fault lets the motor run while START is held. Here it does not start at all.' } ] },
      why: 'Voltage is present up to the overload contact and missing after it, and the relay shows tripped. Together with "it stopped by itself under load", that fits an overload trip.',
      others: ['An open STOP contact', 'No control power', 'A faulty START button', 'An open coil'],
      repair: 'The trip is a symptom. An authorized person looks for the reason: a jammed conveyor, a seized bearing, too much load, a wrong overload setting or a supply problem. Only when that is corrected is the overload reset, the motor restarted with START, and its running checked.' },

    /* ------------------------------------------------ 5 */
    { id: 'M5', title: 'Runs only while START is held', diagram: 'starter', station: 'panel', faults: { holdOpen: true }, controls: ['pb.PB2', 'pb.PB1', 'supply'],
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
      checks: [
        { id: 'a', type: 'key', t: 'Hold START and watch M1, then release', ev: function (S) { var h = after('starter', S, { 'pb.PB2': true }); var r = after('starter', h.S, { 'pb.PB2': false }); return 'Held: M1 ' + (h.S.relay.M1 ? 'pulls in' : 'does not pull in') + '. Released: M1 ' + (r.S.relay.M1 ? 'stays in' : 'drops out') + '.'; } },
        { id: 'b', type: 'useful', t: 'With START held, measure DC volts from wire 3 to 0V', ev: function (S) { return volts('starter', S, '3', '0V', { 'pb.PB2': true }) + ' at the coil while START is held.'; } },
        { id: 'c', type: 'useful', t: 'With START released, measure DC volts from wire 2 to 0V', ev: function (S) { return volts('starter', S, '2', '0V') + ' at wire 2. Voltage is available at the start of both parallel branches.'; } },
        { id: 'd', type: 'key', t: 'With power isolated and verified, have the holding branch inspected: M1 auxiliary contact 13-14 and its two wires', ev: function (S) { return S.faults.holdOpen ? 'The wire on M1 terminal 14 is loose in its clamp and not making contact.' : 'Connections on 13-14 are sound.'; } },
        { id: 'e', type: 'bad', t: 'Replace the START button', fb: 'START is doing its job: the coil energizes every time it is pressed.' },
        { id: 'f', type: 'bad', t: 'Tape the START button down so the conveyor keeps running', fb: 'Never. That defeats the control circuit: the machine would restart by itself after a stop or a power dip.' }
      ],
      interpret: { q: 'M1 pulls in whenever START is held and drops out on release. What does that prove?',
        choices: [
          { t: 'Control power, STOP, the overload contact, START and the coil are all working. The holding branch is not carrying current.', ok: true, fb: 'Right. One observation has cleared most of the circuit.' },
          { t: 'The coil is weak.', fb: 'The coil pulls in reliably every time it gets voltage.' },
          { t: 'The overload is about to trip.', fb: 'Nothing here suggests an overload; the motor stops exactly when START is released.' } ] },
      diagnose: { q: 'What is the most likely fault?',
        choices: [
          { t: 'The holding branch is open: the M1 auxiliary contact or its wiring is not completing the circuit.', ok: true },
          { t: 'The START button is faulty.', fb: 'The coil energizes every time START is pressed.' },
          { t: 'The M1 coil is open.', fb: 'An open coil would never pull in.' },
          { t: 'The STOP contact is open.', fb: 'Then the motor would not run even with START held.' } ] },
      why: 'The motor runs with START held, so every series device and the coil are proven good. The only part of the rung not doing its job is the parallel path around START, and inspection found the wire at terminal 14 not making contact.',
      others: ['A failed auxiliary contact block', 'A broken wire in the holding branch', 'A contactor that does not close fully'],
      repair: 'A qualified person isolates and locks out, remakes the termination on M1 terminal 14 (or replaces the auxiliary contact block if it is faulty), restores power and verifies that the motor keeps running after START is released and stops on STOP.' },

    /* ------------------------------------------------ 6 */
    { id: 'M6', title: 'Conveyor will not start (C)', diagram: 'starter', station: 'panel', faults: { coilOpen: true }, controls: ['pb.PB2', 'pb.PB1', 'supply'],
      symptom: 'Operator report: "START does nothing. No click from the contactor."',
      observe: { text: 'Press <b>START</b> and watch M1.', goal: function (S, R, ui) { return ui.log.indexOf('pb.PB2:true') >= 0; }, seen: 'Confirmed: M1 does not pull in. Third time you have seen this symptom. Let the evidence choose the cause.' },
      safe: SAFE_MOTOR,
      expected: { q: 'With START held, where should you find 24 V?',
        choices: [
          { t: 'On wires 1, 2 and 3: all the way to the coil.', ok: true, fb: 'Right. With every series device closed, supply voltage reaches the coil terminal.' },
          { t: 'Only on L+.', fb: 'Closed contacts pass the voltage along. It should reach the coil.' },
          { t: 'On the 0V rail.', fb: '0V is the return. It stays at 0 V.' } ] },
      section: { q: 'Which section of the drawing do you concentrate on?',
        choices: [
          { t: 'The control rung, measuring along it in order to find where things stop being normal.', ok: true, fb: 'Right. Work along the rung and let each reading split the possibilities.' },
          { t: 'The motor terminal box.', fb: 'The contactor is not pulling in. The motor has not been asked to run.' } ] },
      checks: [
        { id: 'a', type: 'useful', t: 'Measure DC volts from wire 1 to 0V', ev: function (S) { return volts('starter', S, '1', '0V') + ' at wire 1. STOP is passing voltage.'; } },
        { id: 'b', type: 'useful', t: 'Measure DC volts from wire 2 to 0V', ev: function (S) { return volts('starter', S, '2', '0V') + ' at wire 2. The overload contact is passing voltage.'; } },
        { id: 'c', type: 'key', t: 'Hold START and measure DC volts from wire 3 to 0V', ev: function (S) { return volts('starter', S, '3', '0V', { 'pb.PB2': true }) + ' at wire 3 with START held.'; } },
        { id: 'd', type: 'key', t: 'Isolate control power, verify 0 V, then check continuity across the M1 coil (wire 3 to 0V)', ev: function (S) { return 'With power isolated and verified: ' + ohms('starter', S, '3', '0V') + ' across the coil. A healthy coil shows a steady resistance, not an open circuit.'; } },
        { id: 'e', type: 'bad', t: 'Replace the START button', fb: 'Check whether voltage gets past START first. If it does, the button is fine.' },
        { id: 'f', type: 'bad', t: 'Push the contactor in by hand', fb: 'Never operate a contactor manually. It bypasses every control and protective device.' }
      ],
      interpret: { q: 'With START held you read 24 V at wire 3, yet M1 does not pull in. What does that tell you?',
        choices: [
          { t: 'Everything up to the coil is working. Voltage is arriving at the coil but no current flows, so the coil or its return connection is open.', ok: true, fb: 'Right. Voltage present at a load that does not operate points at the load or its return.' },
          { t: 'The START button is not making contact.', fb: 'If START were open, wire 3 would read 0 V.' },
          { t: 'The overload is tripped.', fb: 'A tripped overload would leave wire 2 and wire 3 at 0 V.' } ] },
      diagnose: { q: 'What is the most likely fault?',
        choices: [
          { t: 'The M1 contactor coil is open.', ok: true },
          { t: 'The STOP contact is open.', fb: 'Wire 1 has 24 V.' },
          { t: 'The overload has tripped.', fb: 'Wire 2 has 24 V.' },
          { t: 'The START button is faulty.', fb: 'Wire 3 has 24 V when START is held.' } ] },
      why: '24 V reaches wire 3 with START held, so PB1, OL1 and PB2 are all conducting. The coil has its voltage but does not operate, and with power isolated it reads open instead of a normal coil resistance.',
      others: ['An open STOP contact', 'A tripped overload', 'A faulty START button', 'No control power', 'An open return wire from the coil to 0V'],
      repair: 'A qualified person isolates and locks out, confirms the coil is open at its terminals A1-A2, replaces the coil or contactor with the correct voltage rating, restores power and verifies start, hold and stop.' },

    /* ------------------------------------------------ 7 */
    { id: 'M7', title: 'The sensor that sees nothing', diagram: 'plc', station: 'conveyor', faults: { misaligned: true }, controls: ['box', 'supply'],
      symptom: 'Operator report: "Boxes go past the photo-eye but the BOX PRESENT light never comes on."',
      observe: { text: 'Put a <b>box at the sensor</b> and watch PL2.', goal: function (S) { return S.box; }, seen: 'Confirmed: a box is in position and PL2 stays off.' },
      safe: { q: 'Before you check anything, what are the right working conditions for you here?',
        choices: [
          { t: 'Work within my authorization, stay clear of the moving conveyor, and never reach into the machine to test the sensor while it can move.', ok: true, fb: 'Right. A running conveyor is mechanical energy. Sensors are often next to moving parts.' },
          { t: 'Wave a hand in front of the sensor while the conveyor is running.', fb: 'Do not put hands near moving equipment. Use an approved method and follow site procedure.' },
          { t: 'Force the PLC output on from a laptop to see whether the lamp works.', fb: 'Forcing outputs can start equipment unexpectedly and is not something to do without specific authorization and training.' } ] },
      expected: { q: 'What is the normal chain of events when a box arrives?',
        choices: [
          { t: 'PEC1 detects the box, input I0 turns on, the logic turns on Q0, CR2 pulls in and its contact lights PL2.', ok: true, fb: 'Right. Six links, each one a checkpoint.' },
          { t: 'PEC1 powers the lamp directly.', fb: 'The sensor only sends a small signal to the PLC input.' } ] },
      section: { q: 'PL2 is at the end of a chain. How do you decide where in the chain to look?',
        choices: [
          { t: 'Check the indicators in signal order and find the first link that is not doing its job.', ok: true, fb: 'Right. The first link that is wrong is where the problem is; everything after it is only following.' },
          { t: 'Start at the lamp and replace parts working backwards.', fb: 'That is part-swapping. Use the indicators along the chain instead.' },
          { t: 'Go straight to the PLC program.', fb: 'The program can only react to its inputs. Check whether the input is even arriving.' } ] },
      checks: [
        { id: 'a', type: 'useful', t: 'Look at the PEC1 power indicator', ev: function (S) { return S.supply ? 'PEC1 power LED is on. The sensor has its supply.' : 'PEC1 power LED is off.'; } },
        { id: 'b', type: 'key', t: 'Look at the PEC1 output indicator with a box in position', ev: function (S) { var r = after('plc', S, { box: true }); return 'PEC1 output LED is ' + (r.R.el.PEC1.closed ? 'on' : 'off') + ' with a box in position.'; } },
        { id: 'c', type: 'useful', t: 'Look at the PLC input I0 LED with a box in position', ev: function (S) { var r = after('plc', S, { box: true }); return 'I0 LED is ' + (r.S.plc.I0 ? 'on' : 'off') + '.'; } },
        { id: 'd', type: 'useful', t: 'Measure DC volts from I0 to 0V with a box in position', ev: function (S) { return volts('plc', S, 'I0', '0V', { box: true }) + ' at input I0.'; } },
        { id: 'e', type: 'key', t: 'Check where PEC1 is aimed, and its distance, against the path of the boxes', ev: function (S) { return S.faults.misaligned ? 'The sensor bracket has been knocked: PEC1 points above the boxes, so no light reflects back from them.' : 'PEC1 is aimed correctly at the box path.'; } },
        { id: 'f', type: 'bad', t: 'Change the PLC program', fb: 'The program is not the problem if its input never turns on. Changing software to mask a field fault creates a second problem.' },
        { id: 'g', type: 'bad', t: 'Replace the PLC', fb: 'Nothing points at the PLC. Its input is correctly reporting that no signal is arriving.' }
      ],
      interpret: { q: 'PEC1 has power, but its output LED stays off with a box present, and I0 is off. Where is the problem?',
        choices: [
          { t: 'At the field device: the sensor is powered but is not detecting the box. The PLC is correctly reporting no signal.', ok: true, fb: 'Right. The first link that is wrong is detection at the sensor.' },
          { t: 'In the PLC output Q0.', fb: 'Q0 is off because I0 is off. It is following its input correctly.' },
          { t: 'In relay CR2.', fb: 'CR2 has not been asked to energize.' } ] },
      diagnose: { q: 'What is the most likely fault?',
        choices: [
          { t: 'PEC1 is misaligned and does not see the boxes.', ok: true },
          { t: 'PLC output Q0 has failed.', fb: 'The input is not on, so the output has not been asked to turn on.' },
          { t: 'The CR2 coil is open.', fb: 'CR2 is never commanded while I0 is off.' },
          { t: 'Lamp PL2 is burnt out.', fb: 'A burnt-out lamp would not explain the sensor LED and I0 being off.' } ] },
      why: 'The sensor is powered but does not switch with a box present, and the missing signal is confirmed at I0. Inspection shows the sensor pointing above the boxes.',
      others: ['A dirty lens', 'Wrong sensing distance or sensitivity setting', 'A broken signal wire', 'A failed sensor', 'A failed lamp, relay or output (ruled out here because the chain stops at the sensor)'],
      repair: 'With the conveyor made safe following site procedure, an authorized person realigns and secures the bracket, checks the lens is clean, then verifies with real boxes that the sensor LED, I0, Q0, CR2 and PL2 all respond.' },

    /* ------------------------------------------------ 8 */
    { id: 'M8', title: 'The cylinder that will not move', diagram: 'pneu', station: 'pneu', faults: { airOff: true }, controls: ['sw.SS2', 'supply'],
      symptom: 'Operator report: "The pusher cylinder does not come out when I select EXTEND."',
      observe: { text: 'Turn <b>SS2</b> to EXTEND and watch CYL1.', goal: function (S) { return S.sw.SS2; }, seen: 'Confirmed: SS2 is at EXTEND and CYL1 has not moved.' },
      safe: { q: 'Before you check anything, what are the right working conditions for you here?',
        choices: [
          { t: 'Keep clear of the cylinder\'s travel. Treat the air circuit as a separate energy source that may hold or regain pressure, and follow site procedure before anyone works on it.', ok: true, fb: 'Right. A cylinder that is "not moving" can move suddenly when air returns.' },
          { t: 'Lean in and pull on the rod to see if it is stuck.', fb: 'Never put yourself in the path of an actuator that could move. If air returns it will move without warning.' },
          { t: 'Switching SS2 off makes the cylinder safe.', fb: 'A selector switch is a control command, not energy isolation. Air pressure is a separate energy source.' } ] },
      expected: { q: 'What should normally happen when SS2 is turned to EXTEND?',
        choices: [
          { t: 'SOL1 energizes, valve V1 shifts, air flows from port 1 to port 4 into the cap end, and CYL1 extends.', ok: true, fb: 'Right. An electrical step, a valve step and an air step.' },
          { t: 'SOL1 pushes the cylinder out directly.', fb: 'The solenoid only shifts the valve. Air pressure does the work.' } ] },
      section: { q: 'This machine function uses two drawings. How do you divide the problem?',
        choices: [
          { t: 'Check whether the electrical command reaches SOL1, then whether air pressure is available to the valve.', ok: true, fb: 'Right. Splitting electrical from pneumatic halves the search straight away.' },
          { t: 'Only the electrical rung matters.', fb: 'The solenoid only shifts the valve. Without air nothing moves.' },
          { t: 'Only the cylinder matters.', fb: 'The cylinder is the last link. Check that it is being given a command and air first.' } ] },
      checks: [
        { id: 'a', type: 'useful', t: 'Look at the SOL1 indicator with SS2 at EXTEND', ev: function (S) { var r = after('pneu', S, { 'sw.SS2': true }); return 'SOL1 indicator is ' + (r.R.el.SOL1.on ? 'on' : 'off') + '.'; } },
        { id: 'b', type: 'useful', t: 'Measure DC volts from wire 1 to 0V with SS2 at EXTEND', ev: function (S) { return volts('pneu', S, '1', '0V', { 'sw.SS2': true }) + ' at the solenoid. The electrical command is arriving.'; } },
        { id: 'c', type: 'key', t: 'Read pressure gauge PG1', ev: function (S) { return 'PG1 reads ' + sim().fluid(S, false).bar + ' bar.'; } },
        { id: 'd', type: 'useful', t: 'Check the position of shutoff valve SV1', ev: function (S) { return 'SV1 handle is in the ' + (S.air ? 'OPEN' : 'CLOSED') + ' position.'; } },
        { id: 'e', type: 'key', t: 'Ask about the plant air supply upstream of the machine', ev: function (S) { return S.faults.airOff ? 'The plant air to this line is off: no pressure at the machine\'s air drop.' : 'Plant air is available at the drop.'; } },
        { id: 'f', type: 'bad', t: 'Press the manual override on valve V1 while reaching past the cylinder', fb: 'Unsafe. If air returns, the cylinder moves with you in its path. Overrides are for authorized people under controlled conditions.' },
        { id: 'g', type: 'bad', t: 'Replace valve V1', fb: 'No evidence points at the valve. It has no air to switch.' }
      ],
      interpret: { q: 'SOL1 is energized and has 24 V, but PG1 reads 0 bar. What does that tell you?',
        choices: [
          { t: 'The electrical side is working. There is no air pressure for the valve to direct, so the problem is in the air supply.', ok: true, fb: 'Right. Command present, energy to move absent.' },
          { t: 'The solenoid has failed.', fb: 'It is energized with correct voltage. Without air, even a perfect valve moves nothing.' },
          { t: 'The cylinder is seized.', fb: 'Possible in general, but with 0 bar the cylinder has not been given any force to test that.' } ] },
      diagnose: { q: 'What is the most likely fault?',
        choices: [
          { t: 'The compressed-air supply to the machine is unavailable.', ok: true },
          { t: 'The SOL1 coil is open.', fb: 'SOL1 is energized: indicator on and 24 V present.' },
          { t: 'Selector SS2 is faulty.', fb: 'Voltage arrives at the solenoid, so SS2 is conducting.' },
          { t: 'Cylinder CYL1 is seized.', fb: 'With no air pressure the cylinder has had nothing pushing it.' } ] },
      why: 'The electrical command is proven by the SOL1 indicator and the 24 V reading. The gauge reads 0 bar with SV1 open, and the plant air drop has no pressure.',
      others: ['A closed shutoff valve', 'A regulator set to zero or a blocked filter', 'An open solenoid coil or no electrical command', 'A valve that does not shift', 'A mechanically jammed cylinder or load'],
      repair: 'The air supply is restored by the responsible person. Because the cylinder will move when pressure returns, the area is kept clear first. Afterwards, check PG1 shows normal pressure and verify extend and retract.' }
  ];

  FS.missions = M;
  FS.mission = function (id) { return M.filter(function (m) { return m.id === id; })[0]; };
})(typeof window !== 'undefined' ? window : globalThis);
