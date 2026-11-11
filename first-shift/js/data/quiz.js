/* FIRST SHIFT — mock hands-on interview (local structured data).
 * 20 questions: 8 symbol, 4 circuit behavior, 4 troubleshooting, 2 diagram
 * type, 2 safety. Types: choice, pick (point at the drawing), aloud (explain
 * out loud, then self-rate against a model answer; nothing is recorded). */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};

  FS.quizCats = {
    symbol: { name: 'Symbol recognition', lessons: ['L3'] },
    circuit: { name: 'Circuit behavior', lessons: ['L4', 'L5'] },
    trouble: { name: 'Troubleshooting', lessons: ['L8', 'L6'] },
    diagram: { name: 'Diagram types', lessons: ['L1'] },
    safety: { name: 'Safety and honesty', lessons: ['L5', 'L7'] }
  };

  FS.quiz = [
    /* ---------------- symbol recognition (8) */
    { id: 'q1', cat: 'symbol', type: 'pick', diagram: 'starter',
      q: 'Point to the contactor coil.', parts: ['M1coil'],
      explain: 'The contactor coil is the circle labelled M1 at the right-hand end of the control rung (terminals A1-A2).' },
    { id: 'q2', cat: 'symbol', type: 'pick', diagram: 'starter',
      q: 'Identify the auxiliary contact associated with the contactor coil.', parts: ['M1aux'],
      explain: 'The normally open contact labelled M1 (13-14), drawn in parallel with START. It shares the label M1 with the coil.' },
    { id: 'q3', cat: 'symbol', type: 'choice', symbol: { sym: 'nc' },
      q: 'What is this symbol?',
      choices: [{ t: 'Normally closed contact', ok: true }, { t: 'Normally open contact' }, { t: 'Capacitor' }, { t: 'Fuse' }],
      explain: 'Two bars with a diagonal slash: a normally closed contact. It is closed in its reference (de-energized) state.' },
    { id: 'q4', cat: 'symbol', type: 'choice', symbol: { sym: 'pb_no' },
      q: 'What is this symbol?',
      choices: [{ t: 'Normally closed pushbutton' }, { t: 'Normally open pushbutton', ok: true }, { t: 'Limit switch' }, { t: 'Circuit breaker' }],
      explain: 'A pushbutton whose bar sits above the terminals without touching: normally open. Typically START.' },
    { id: 'q5', cat: 'symbol', type: 'choice', symbol: { sym: 'ol' },
      q: 'This symbol shows two parts of one device labelled OL1. What is it?',
      choices: [{ t: 'Control transformer' }, { t: 'Motor overload relay: thermal element and its control contact', ok: true }, { t: 'Fused disconnect' }, { t: 'Solenoid valve' }],
      explain: 'The overload relay has thermal elements in the power circuit and a normally closed contact in the control circuit.' },
    { id: 'q6', cat: 'symbol', type: 'choice', symbol: { sym: 'crossing' },
      q: 'Are these two wires connected?',
      choices: [{ t: 'Yes, because the lines touch' }, { t: 'No. There is no junction dot, so they only cross on the drawing', ok: true }, { t: 'Only when the circuit is energized' }],
      explain: 'In this drawing style a dot marks a connection. Lines crossing without a dot are not connected.' },
    { id: 'q7', cat: 'symbol', type: 'choice', symbol: { sym: 'pe' },
      q: 'What does this symbol represent?',
      choices: [{ t: 'DC common (0V)' }, { t: 'AC neutral' }, { t: 'Protective earth', ok: true }, { t: 'Battery' }],
      explain: 'Protective earth: a safety connection for metal parts. It is not the same thing as DC common or AC neutral.' },
    { id: 'q8', cat: 'symbol', type: 'pick', diagram: 'starter',
      q: 'Point to the device that protects the motor from sustained overload. Either of its two parts counts.', parts: ['OL1c', 'OL1h0', 'OL1h1', 'OL1h2'],
      explain: 'OL1: thermal elements in the power circuit and the normally closed contact 95-96 in the control rung.' },

    /* ---------------- circuit behavior (4) */
    { id: 'q9', cat: 'circuit', type: 'aloud', diagram: 'starter',
      q: 'Explain why the motor stays on after START is released.',
      model: 'When START is pressed the M1 coil energizes and the contactor pulls in. Its normally open auxiliary contact, wired in parallel with START, closes. When START is released, that contact keeps the coil circuit complete, so the contactor holds itself in until STOP is pressed, the overload trips or control power is lost.' },
    { id: 'q10', cat: 'circuit', type: 'choice', diagram: 'starter',
      q: 'The motor is running. Which of these would interrupt the M1 coil circuit?',
      choices: [{ t: 'Releasing the START button' }, { t: 'Pressing STOP, or the overload contact opening', ok: true }, { t: 'The pilot light failing' }],
      explain: 'STOP and the overload contact are in series with the coil, so either one opening interrupts it. Releasing START does not, because the holding contact bypasses it.',
      preset: { run: true }, run: [{ 'pb.PB1': true }], verify: function (S) { return !S.relay.M1; } },
    { id: 'q11', cat: 'circuit', type: 'choice', diagram: 'starter',
      q: 'The overload has tripped and the motor has stopped. The overload is reset. What happens next?',
      choices: [{ t: 'The motor restarts immediately' }, { t: 'The motor stays stopped until START is pressed', ok: true }, { t: 'The contactor chatters' }],
      explain: 'Resetting closes the overload contact, but START and the holding contact are both open, so the coil stays de-energized until START is pressed.',
      preset: { olTripped: true }, run: [{ olTripped: false }], verify: function (S) { return !S.relay.M1; } },
    { id: 'q12', cat: 'circuit', type: 'aloud',
      q: 'Explain the difference between a fuse and overload protection.',
      model: 'A fuse, or a circuit breaker, protects against short circuits and very high fault currents and acts quickly. An overload relay protects the motor against a moderate overcurrent that continues long enough to overheat it. They do different jobs, a motor circuit needs both, and an overload does not replace short-circuit protection.' },

    /* ---------------- troubleshooting (4) */
    { id: 'q13', cat: 'trouble', type: 'aloud',
      q: 'A conveyor will not start. Explain your first steps.',
      model: 'First I confirm the symptom: what happens when START is pressed, and what changed recently. I make sure I am working safely, following site procedures and within my authorization. Then I use the schematic to understand what should happen and focus on the control circuit: is control power present, is the overload tripped, is a stop circuit open, does the contactor pull in. I pick checks that separate those possibilities and only name a cause when the evidence supports it.' },
    { id: 'q14', cat: 'trouble', type: 'aloud', diagram: 'plc',
      q: 'Trace a sensor signal to an output device.',
      model: 'The photoelectric sensor detects the box and sends a signal to PLC input I0. The program evaluates that input and turns on output Q0. Q0 energizes interposing relay CR2, and a CR2 contact switches the pilot light. Field device, input, logic, output, interface, load: each one is a separate checkpoint.' },
    { id: 'q15', cat: 'trouble', type: 'choice', diagram: 'starter',
      q: 'On the START/STOP rung you measure 24 V from wire 1 to 0V and 0 V from wire 2 to 0V. Nobody is pressing anything. Where is the circuit open?',
      choices: [{ t: 'At the STOP button PB1' }, { t: 'At the overload contact OL1', ok: true }, { t: 'At the M1 coil' }, { t: 'At the START button PB2' }],
      explain: 'Wire 1 is before OL1 and wire 2 is after it. Voltage in, no voltage out: the overload contact is open, most likely tripped.',
      preset: { olTripped: true }, run: [], verify: function (S) { return FS.sim.meter('starter', S, 'V', '1', '0V').value === 24 && FS.sim.meter('starter', S, 'V', '2', '0V').value === 0; } },
    { id: 'q16', cat: 'trouble', type: 'choice', diagram: 'starter',
      q: 'A motor runs while START is held and stops the moment it is released. Which part of the circuit do you suspect?',
      choices: [{ t: 'The STOP button' }, { t: 'The holding branch: the M1 auxiliary contact or its wiring', ok: true }, { t: 'The M1 coil' }, { t: 'The power fuses' }],
      explain: 'Running while START is held proves the series path and the coil. The parallel holding branch is not carrying the coil current.',
      preset: { 'faults.holdOpen': true }, run: [{ 'pb.PB2': true }, { 'pb.PB2': false }], verify: function (S) { return !S.relay.M1; } },

    /* ---------------- diagram types (2) */
    { id: 'q17', cat: 'diagram', type: 'choice',
      q: 'Which drawing would help you understand the control sequence?',
      choices: [{ t: 'Physical layout' }, { t: 'Schematic', ok: true }, { t: 'Wiring diagram' }, { t: 'Block diagram' }],
      explain: 'The schematic shows electrical function and logical connections.' },
    { id: 'q18', cat: 'diagram', type: 'choice',
      q: 'Which drawing would help you find a terminal connection?',
      choices: [{ t: 'Wiring diagram', ok: true }, { t: 'Schematic' }, { t: 'Block diagram' }, { t: 'Physical layout' }],
      explain: 'The wiring diagram shows actual terminal-to-terminal connections.' },

    /* ---------------- safety (2) */
    { id: 'q19', cat: 'safety', type: 'choice',
      q: 'The machine has been stopped with its STOP button and the RUN light is off. Is it isolated and safe to work on?',
      choices: [
        { t: 'Yes: STOP was pressed and the light confirms it' },
        { t: 'No. A STOP button and an indicator light are not energy isolation. Every energy source must be isolated and verified following site procedure', ok: true },
        { t: 'Yes, as long as the emergency stop is also pressed' }],
      explain: 'STOP, emergency stop and software commands are control functions, not isolation. Indicator lights can fail. Electrical, pneumatic, hydraulic, mechanical and stored energy may all be present.' },
    { id: 'q20', cat: 'safety', type: 'choice',
      q: 'The interviewer asks whether you would go ahead and fault-find inside a live motor starter panel on your own. Which answer is best?',
      choices: [
        { t: '"Yes, no problem, I have watched it done."' },
        { t: '"I can explain the basic circuit and my troubleshooting approach. I would follow your isolation procedures and work within my training and authorization."', ok: true },
        { t: '"I would bypass the overload first so the machine keeps running while I look."' }],
      explain: 'Honesty about your limits is a strength. Never offer to bypass a protective device, and never claim qualification you do not have.' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
