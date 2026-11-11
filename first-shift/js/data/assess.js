/* FIRST SHIFT — assessment data (local structured data): concepts tracked for
 * error-based review, the six-question baseline, a bank of different-example
 * retest questions per concept, and the capability checklist used by the
 * final readiness check. Scoring is deliberately simple and shown to the
 * learner: a question is right or wrong; confidence never changes a score, it
 * only decides how urgently a missed concept comes back. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};

  FS.concepts = {
    sym: { name: 'Symbol recognition', lesson: 'L3' },
    nonc: { name: 'Contact reference state (NO / NC)', lesson: 'L3' },
    logic: { name: 'Series and parallel logic', lesson: 'L4' },
    coil: { name: 'Coil and contact relationship', lesson: 'L4' },
    hold: { name: 'Holding circuit', lesson: 'L5' },
    nav: { name: 'Drawing navigation', lesson: 'LD' },
    diag: { name: 'Diagnostic reasoning', lesson: 'L8' },
    safe: { name: 'Safety boundaries', lesson: 'L5' }
  };
  FS.CONF = [['guess', 'Guessing'], ['some', 'Somewhat sure'], ['conf', 'Confident']];
  FS.IDK = 'I don\'t know yet';

  /* Mock-interview question → concept. */
  FS.quizConcept = { q1: 'sym', q2: 'coil', q3: 'nonc', q4: 'nonc', q5: 'sym', q6: 'sym', q7: 'sym', q8: 'sym', q9: 'hold', q10: 'hold', q11: 'hold', q12: 'diag',
    q13: 'diag', q14: 'diag', q15: 'diag', q16: 'hold', q17: 'nav', q18: 'nav', q19: 'safe', q20: 'safe' };

  /* ---------------------------------------------------------------- baseline (six questions) */
  FS.baseline = [
    { concept: 'sym', topic: 'Component recognition', lesson: 'L3', symbol: { sym: 'coil', o: { t: 'M1' } },
      q: 'On a motor control drawing, what does a circle on the rung labelled M1 usually represent?',
      choices: [{ t: 'The motor itself' }, { t: 'The coil of a contactor or relay', ok: true }, { t: 'A pilot light' }] },
    { concept: 'nonc', topic: 'Normally open versus normally closed', lesson: 'L3', symbol: { sym: 'nc' },
      q: 'This contact is drawn "normally closed". What does "normally" refer to?',
      choices: [{ t: 'What the contact is doing most of the time while the machine runs' }, { t: 'The contact\'s reference state: not actuated, coil de-energized, as the drawing shows it', ok: true }, { t: 'The contact has failed closed' }] },
    { concept: 'nav', topic: 'Schematic versus wiring diagram', lesson: 'L1',
      q: 'You need to know which terminal a wire lands on. Which drawing shows that most directly?',
      choices: [{ t: 'The schematic' }, { t: 'The wiring (terminal connection) diagram', ok: true }, { t: 'The block diagram' }] },
    { concept: 'logic', topic: 'Series versus parallel paths', lesson: 'L4',
      q: 'Two contacts are in series with a lamp. One of them is open. What does the lamp do?',
      choices: [{ t: 'It stays off: a series path needs every device closed', ok: true }, { t: 'It lights through the closed contact' }, { t: 'It lights dimly' }] },
    { concept: 'hold', topic: 'Holding circuit behavior', lesson: 'L5',
      q: 'In a three-wire START/STOP circuit, why does the motor keep running after START is released?',
      choices: [{ t: 'The START button latches mechanically' }, { t: 'An auxiliary contact of the contactor, in parallel with START, keeps the coil energized', ok: true }, { t: 'The overload relay holds the contactor in' }] },
    { concept: 'safe', topic: 'Safe troubleshooting boundaries', lesson: 'L5',
      q: 'A machine has been stopped with its STOP button. Is it isolated and safe to work on?',
      choices: [{ t: 'Yes, STOP removes the power' }, { t: 'No. STOP is a control function, not energy isolation. Isolation follows the site lockout procedure for every energy source', ok: true }, { t: 'Yes, if the run light is off' }] }
  ];

  /* ---------------------------------------------------------------- retest bank: different examples of each concept */
  FS.retests = {
    sym: [
      { symbol: { sym: 'fuse' }, q: 'What is this symbol?', choices: [{ t: 'Fuse', ok: true }, { t: 'Resistor' }, { t: 'Overload element' }], explain: 'An S-shaped element between two leads is a fuse in this drawing style.' },
      { symbol: { sym: 'lamp', o: { t: 'G' } }, q: 'What is this symbol?', choices: [{ t: 'Motor' }, { t: 'Pilot light with a green lens', ok: true }, { t: 'Relay coil' }], explain: 'A circle with short rays is a pilot light. The letter gives the lens color.' },
      { symbol: { sym: 'junction' }, q: 'What does the dot mean?', choices: [{ t: 'The wires are connected', ok: true }, { t: 'A test point' }, { t: 'A fuse' }], explain: 'A dot marks a connected junction. Crossing lines without a dot are not connected.' }
    ],
    nonc: [
      { symbol: { sym: 'pb_nc' }, q: 'Nobody is touching this pushbutton. Is its contact open or closed?', choices: [{ t: 'Closed', ok: true }, { t: 'Open' }], explain: 'The bar bridges both terminals: normally closed. Pressing it opens the contact.' },
      { symbol: { sym: 'no' }, q: 'This contact belongs to relay CR1. CR1 is de-energized. Is the contact open or closed?', choices: [{ t: 'Open', ok: true }, { t: 'Closed' }], explain: 'Two bars with no slash: normally open. De-energized is the reference state, so it is open.' },
      { symbol: { sym: 'nc' }, q: 'This contact belongs to OL1. The overload has tripped. Is the contact open or closed?', choices: [{ t: 'Closed' }, { t: 'Open', ok: true }], explain: 'It is drawn normally closed. A trip actuates the relay, so the contact changes to open.' }
    ],
    logic: [
      { q: 'A lamp is fed through three contacts in series. Two are closed and one is open. The lamp is…', choices: [{ t: 'Off', ok: true }, { t: 'On' }], explain: 'Series is AND: every device in the single path must be closed.' },
      { q: 'A coil is fed by two contacts in parallel. One is open and one is closed. The coil is…', choices: [{ t: 'De-energized' }, { t: 'Energized', ok: true }], explain: 'Parallel is OR: one closed branch completes a path.' },
      { q: 'On a ladder rung, which arrangement gives "A AND B"?', choices: [{ t: 'A and B side by side on separate branches' }, { t: 'A and B one after the other on the same line', ok: true }], explain: 'One after the other is series: both must be closed.' }
    ],
    coil: [
      { q: 'A drawing shows coil CR3 on one sheet and a contact labelled CR3 on another. How are they related?', choices: [{ t: 'They are unrelated devices that share a name' }, { t: 'They are parts of one relay: energizing the coil operates the contact', ok: true }, { t: 'They are joined by a wire that is not drawn' }], explain: 'A coil operates every contact that carries its tag. The link is mechanical, inside the device.' },
      { q: 'Coil M1 energizes. What happens to a normally closed contact tagged M1?', choices: [{ t: 'It opens', ok: true }, { t: 'It closes' }, { t: 'Nothing' }], explain: 'Energizing the coil changes every contact of that device to the opposite of its reference state.' },
      { q: 'A coil has 24 V on terminal A1 and its A2 return wire is disconnected. Does it operate?', choices: [{ t: 'Yes, 24 V is present at the coil' }, { t: 'No. A coil needs the voltage across its two terminals; potential at one terminal alone does nothing', ok: true }], explain: 'With no return path there is no voltage across the coil and no current through it.' }
    ],
    hold: [
      { q: 'In a START/STOP circuit, where is the holding (seal-in) contact connected?', choices: [{ t: 'In series with STOP' }, { t: 'In parallel with START', ok: true }, { t: 'In the motor power circuit' }], explain: 'It provides an alternative path around the START button once the contactor is in.' },
      { q: 'The motor is running. Control power drops out for a second and returns. The motor…', choices: [{ t: 'Restarts by itself' }, { t: 'Stays stopped until START is pressed', ok: true }], explain: 'The coil dropped out, so the holding contact opened. Nothing can re-energize the coil until START is pressed.' },
      { q: 'A motor starts, but stops as soon as START is released. Which part of the rung is not doing its job?', choices: [{ t: 'The STOP contact' }, { t: 'The holding branch', ok: true }, { t: 'The coil' }], explain: 'Running while START is held proves the series path and the coil. The parallel holding branch is not carrying current.' }
    ],
    nav: [
      { q: 'A coil on sheet 3 has a note "contacts: sheet 2". What is the note for?', choices: [{ t: 'It is a cross-reference telling you where that coil\'s contacts are drawn', ok: true }, { t: 'It is the wire number' }, { t: 'It is the revision' }], explain: 'Cross-references connect a coil to its contacts across sheets.' },
      { q: 'Two copies of a drawing disagree. One is Rev A, the other Rev C. Which do you work from?', choices: [{ t: 'Whichever is nearer' }, { t: 'The latest issued revision, after confirming it is the current one', ok: true }, { t: 'Rev A, because it is the original' }], explain: 'A later revision replaces earlier ones. Confirm which issue is current before trusting it.' },
      { q: 'You see "13" on a contactor and "13" on a pushbutton. How do you refer to one of them unambiguously?', choices: [{ t: 'By device tag and terminal together, such as M1:13', ok: true }, { t: 'By the terminal number alone' }, { t: 'By the wire color' }], explain: 'Terminal numbers repeat on different devices. Tag plus terminal is unique.' }
    ],
    diag: [
      { q: 'A motor will not start. Which first check separates the most possible causes?', choices: [{ t: 'Replace the contactor' }, { t: 'See whether the contactor pulls in when START is pressed, and whether control voltage is present', ok: true }, { t: 'Reset everything and try again' }], explain: 'A check is useful when its result rules causes in or out. Swapping parts tells you nothing.' },
      { q: 'With START held you read 24 V before a contact and 0 V after it. What does that tell you?', choices: [{ t: 'That contact is not passing the voltage: the open is there', ok: true }, { t: 'The supply is weak' }, { t: 'The coil is open' }], explain: 'The open lies between the last point with voltage and the first point without it.' },
      { q: 'A measurement comes out exactly as your suspected cause predicts, but every other possible cause predicts the same reading. What has it proved?', choices: [{ t: 'That your suspected cause is right' }, { t: 'Nothing yet: it does not separate the causes', ok: true }], explain: 'A result only supports one cause if it would have been different for the others.' }
    ],
    safe: [
      { q: 'An overload keeps tripping and production is waiting. What do you do?', choices: [{ t: 'Fit a jumper across the overload contact for now' }, { t: 'Leave it protected and report it: the cause of the overload has to be found', ok: true }], explain: 'Never bypass a protective function to make a machine run.' },
      { q: 'A panel\'s RUN light is off. Does that prove the panel is safe to touch inside?', choices: [{ t: 'Yes' }, { t: 'No. Indicators can fail and show only one circuit. Isolation and verification follow site procedure', ok: true }], explain: 'An indicator light alone never proves absence of voltage.' },
      { q: 'You are asked to do a task you have not been trained or authorized for. What is the right answer?', choices: [{ t: 'Have a go carefully' }, { t: 'Say so, and ask for the procedure or for someone qualified', ok: true }], explain: 'Working within training and authorization is a strength, not a weakness.' }
    ]
  };

  /* ---------------------------------------------------------------- readiness: capabilities */
  FS.caps = [
    ['symbols', 'Identify the essential symbols', 'L3'],
    ['nonc', 'Explain NO and NC reference states', 'L3'],
    ['locate', 'Locate a component from its drawing tag', 'LP'],
    ['trace', 'Trace a complete control path', 'L4'],
    ['holding', 'Explain the holding circuit', 'L5'],
    ['predict', 'Predict the effect of STOP and overload operation', 'L5'],
    ['check', 'Choose a check that distinguishes possible causes', 'L8'],
    ['aloud', 'Explain my reasoning aloud', 'L9']
  ];
  FS.CAPLVL = { ind: 'Demonstrated independently', help: 'Demonstrated with help', none: 'Needs practice' };
  /* The spoken-response frame offered after practical challenges. */
  FS.FRAME = 'I expect ___ because ___. The observed result is ___. That suggests ___, but I would verify ___ before concluding.';
})(typeof window !== 'undefined' ? window : globalThis);
