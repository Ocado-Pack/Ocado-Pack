/* FIRST SHIFT — lessons (local structured data).
 * Step kinds: say (explain), demo (brief scripted demonstration), try (interact
 * until a goal is met), ask (predict / check question), pick (select a symbol),
 * match (symbol to physical part), trace (click a conducting path).
 * `verify` functions state what the simulation must show after `run`; the test
 * suite executes them so quiz feedback can never disagree with the circuit. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};

  var HONEST = 'I can explain the basic circuit and my troubleshooting approach. I would follow your isolation procedures and work within my training and authorization.';
  function had(ui, entry) { return ui.log.indexOf(entry) >= 0; }
  function metered(ui, a, b) {
    return ui.meterLog.some(function (m) { return m.mode === 'V' && ((m.a === a && m.b === b) || (m.a === b && m.b === a)); });
  }

  var L = [];

  /* ====================================================== LESSON 1 */
  L.push({
    id: 'L1', concept: 'nav', title: 'What am I looking at?', short: 'Four kinds of drawing', minutes: 10, station: 'display',
    tabs: [['lamp', 'Schematic'], ['view_wiring', 'Wiring'], ['view_layout', 'Layout'], ['view_block', 'Block']],
    steps: [
      { kind: 'say', title: 'Four drawings, one machine', diagram: 'view_block',
        text: 'Morning. I\'m Alex. Before we touch anything, learn which drawing answers which question. Maintenance uses four kinds, and people lose time by opening the wrong one.<br><br>This is a <b>block diagram</b>: the big functional sections and the direction things flow. Supply, protection, control, load. No wires, no terminals. It gives you the overview.',
        hints: ['Look at the four boxes and the arrows between them.', 'A block diagram shows major sections only. It cannot tell you which terminal a wire lands on.', 'Block diagram = overview of functional sections.'] },
      { kind: 'say', title: 'The schematic', diagram: 'lamp',
        text: 'Same system as a <b>schematic</b>. It shows electrical <b>function</b>: which devices are in the circuit and how they are logically connected. It ignores where things are mounted.<br><br>When you need to understand <i>how the circuit works</i> or <i>what sequence it follows</i>, this is the drawing.',
        hints: ['Follow the line from PS1 + around the loop and back to −.', 'A schematic is arranged to be easy to read, not to match the panel.', 'Schematic = how it works electrically.'] },
      { kind: 'say', title: 'The wiring diagram', diagram: 'view_wiring',
        text: 'Now the <b>wiring diagram</b>. Each device is drawn with its real terminal numbers, and every wire runs from terminal to terminal. Wire 1 goes from F1 terminal 2 to S1 terminal 13.<br><br>When you need to <i>find or check an actual connection</i>, this is the drawing.',
        hints: ['Look at the small terminal labels: +V, 13, 14, X1, X2.', 'A wiring diagram is about physical connections, not about making the logic easy to follow.', 'Wiring diagram = which terminal each wire lands on.'] },
      { kind: 'say', title: 'The physical layout', diagram: 'view_layout',
        text: 'Last, the <b>physical layout</b>. It shows <i>where</i> each device is mounted: PS1 and F1 on the rail inside the enclosure, S1 and PL1 on the door. It says nothing about how they are connected.',
        hints: ['Find S1. It is on the door, not inside the enclosure.', 'Layout drawings answer "where is it?"', 'Layout = where things are mounted.'] },
      { kind: 'demo', title: 'One fuse, four drawings', diagram: 'view_block',
        text: 'Watch fuse F1. It is the same part in every drawing; only the question each drawing answers changes.',
        script: [
          { ms: 300, sel: 'F1', note: 'Block diagram: F1 is the "Protection" section.' },
          { ms: 1700, diagram: 'lamp', sel: 'F1', note: 'Schematic: F1 is in series between the supply and the switch.' },
          { ms: 1700, diagram: 'view_wiring', sel: 'F1', note: 'Wiring diagram: F1 has terminals 1 and 2, with wire L+ in and wire 1 out.' },
          { ms: 1700, diagram: 'view_layout', sel: 'F1', note: 'Layout: F1 is on the DIN rail, to the right of PS1.' }
        ] },
      { kind: 'try', title: 'Your turn: find S1', diagram: 'view_wiring',
        text: 'Use the tabs above the drawing to switch views. Open the <b>Wiring</b> view and select <b>S1</b>. Then look at the equipment view: the same part highlights on the training panel.',
        goal: function (S, R, ui) { return ui.diagram === 'view_wiring' && ui.selRef === 'S1'; },
        done: 'That\'s it. On the wiring diagram S1 has terminals 13 and 14. Drawing and hardware stay linked by the label S1.',
        hints: ['The tabs are just above the drawing: Schematic, Wiring, Layout, Block.', 'On the Wiring view, S1 is the box in the middle of the top row.', 'Click the Wiring tab, then click the box marked S1.'] },
      { kind: 'ask', title: 'Predict: control sequence', diagram: 'view_block',
        q: 'Which drawing would help you understand the control sequence?',
        choices: [
          { t: 'Schematic', ok: true, fb: 'Right. The schematic shows electrical function and logical connections, so it is the one for "how does this work and in what order?"' },
          { t: 'Wiring diagram', fb: 'A wiring diagram shows terminal-to-terminal connections. You can work the logic out from it, but it is slow and easy to get wrong. The schematic is drawn for this.' },
          { t: 'Physical layout', fb: 'A layout only shows where devices are mounted. It contains no circuit logic.' },
          { t: 'Block diagram', fb: 'A block diagram gives the overview but not the detail of the sequence. The schematic does.' }
        ],
        hints: ['Sequence is about function, not location.', 'Which drawing is arranged to show how devices work together?', 'The schematic.'] },
      { kind: 'ask', title: 'Predict: terminal connection', diagram: 'view_block',
        q: 'Which drawing would help you find a terminal connection?',
        choices: [
          { t: 'Schematic', fb: 'The schematic may show wire numbers, but it is not arranged around real terminals. The wiring diagram is.' },
          { t: 'Wiring diagram', ok: true, fb: 'Right. The wiring diagram shows the actual terminal-to-terminal connections.' },
          { t: 'Physical layout', fb: 'A layout shows where the device is, not which terminal the wire lands on.' },
          { t: 'Block diagram', fb: 'A block diagram has no terminals at all.' }
        ],
        hints: ['You are looking for a specific screw terminal.', 'Which drawing prints terminal numbers on every device?', 'The wiring diagram.'] },
      { kind: 'ask', noHint: true, title: 'No-hint check', diagram: 'view_block',
        q: 'A sensor needs replacing and you have never seen this machine. Which drawing tells you where the sensor is mounted?',
        choices: [
          { t: 'Schematic', fb: 'The schematic tells you what the sensor does in the circuit, not where it is bolted on.' },
          { t: 'Wiring diagram', fb: 'It tells you which terminals the sensor wires land on, not where the sensor sits on the machine.' },
          { t: 'Physical layout', ok: true, fb: 'Correct. The layout drawing shows where components are located.' },
          { t: 'Block diagram', fb: 'Too high-level. It shows functional sections only.' }
        ] }
    ]
  });

  /* ====================================================== LESSON 2 */
  L.push({
    id: 'L2', concept: 'logic', title: 'Basic electricity through a simple circuit', short: 'Voltage, current, complete paths', minutes: 15, station: 'panel',
    steps: [
      { kind: 'say', title: 'Three words', diagram: 'lamp',
        text: '<b>Voltage</b> is the difference in electrical potential between two points. Think of it as the push available. It is always measured <i>between two points</i>.<br><b>Current</b> is charge actually flowing.<br><b>Resistance</b> is opposition to current.<br><br>Our supply PS1 gives 24 volts DC between its + and − terminals. Nothing flows until there is a path.',
        hints: ['Find PS1 on the left of the drawing.', 'Voltage can be present with no current flowing, like pressure behind a closed tap.', 'Voltage = push between two points. Current = flow. Resistance = opposition.'] },
      { kind: 'say', title: 'A complete path', diagram: 'lamp',
        text: 'Current flows through a load only when there is a <b>complete path</b> from one source terminal, through the load, back to the other terminal. That is a <b>closed circuit</b>. Any gap makes it an <b>open circuit</b> and current stops everywhere in the loop.<br><br>PL1 is the <b>load</b>: it does the work. S1 is a <b>control device</b>: it only decides whether the path is complete. F1 is protection.',
        hints: ['Trace: PS1 +, F1, S1, wire 2, PL1, back to PS1 −.', 'S1 is drawn open. That gap means no complete path yet.', 'Load does the work; control devices open or close the path.'] },
      { kind: 'demo', title: 'Watch the path', diagram: 'lamp',
        expect: { q: 'I am about to close S1. What do you expect to happen, and why?', choices: ['The lamp lights, because the path from L+ to 0V becomes complete', 'Nothing, because the fuse blocks the current', 'The lamp lights only while I hold the switch'], ok: 0 },
        text: 'I\'ll close S1, then open it again. The orange line with moving dashes shows where current is flowing. It is a simplified picture; it does not show how fast electrons really move.',
        script: [
          { ms: 600, set: { 'sw.S1': true }, note: 'S1 closed: the path is complete, current flows, PL1 lights.' },
          { ms: 2200, set: { 'sw.S1': false }, note: 'S1 open: one gap, and current stops in the whole loop.' }
        ] },
      { kind: 'try', title: 'Your turn: light the lamp', diagram: 'lamp',
        text: 'Use the <b>S1</b> control at the bottom of the screen to close the switch and light PL1.',
        goal: function (S, R) { return R.el.PL1.on; },
        done: 'PL1 is on. Complete path, so current flows through the load.',
        hints: ['The simulation controls are in the bar at the bottom.', 'The lamp needs every device in the loop to conduct.', 'Press the "S1" button so it reads CLOSED.'] },
      { kind: 'ask', predict: true, title: 'Predict: pull the fuse', diagram: 'lamp', preset: { 'sw.S1': true },
        q: 'The lamp is lit. You remove fuse F1. What happens?',
        choices: [
          { t: 'The lamp stays on because S1 is still closed', fb: 'S1 closed is necessary but not enough. Removing F1 leaves a gap, and any gap in a series loop stops the current.' },
          { t: 'The lamp goes off because the path is no longer complete', ok: true, fb: 'Right. F1 is in series with everything else. Remove it and the circuit is open.' },
          { t: 'The lamp gets dimmer', fb: 'A gap does not reduce current a little. It stops it. The lamp goes fully off.' }
        ],
        run: [{ fuseIn: false }],
        verify: function (S, R) { return !R.el.PL1.on; },
        hints: ['Look at where F1 sits in the loop.', 'Series means one single path. Every device is part of it.', 'Removing F1 opens the only path, so the lamp goes off.'] },
      { kind: 'try', title: 'Your turn: an open wire', diagram: 'lamp', preset: { 'sw.S1': true },
        text: 'Put the fuse back if it is out. Then use <b>Wire 2</b> to introduce an open wire, with S1 still closed. Watch the lamp.',
        goal: function (S, R) { return S.faults.wireOpen && S.sw.S1 && S.fuseIn; },
        done: 'Lamp off again. An open wire, a removed fuse and an open switch all look the same from the lamp\'s point of view: no complete path.',
        hints: ['You need F1 installed, S1 closed and wire 2 open.', 'An open wire is just another gap in the loop.', 'Press "F1" until it reads INSTALLED, "S1" until CLOSED, then "Wire 2" until it reads OPEN.'] },
      { kind: 'try', title: 'Your turn: the meter', diagram: 'lamp', preset: { 'sw.S1': true, 'faults.wireOpen': true },
        text: 'Meet the meter, bottom of the screen. Voltage is measured <b>between two points</b>, with the meter across (in parallel with) the part of the circuit you are interested in.<br><br>Click the test point <b>L+</b> on the drawing for the red probe, then <b>0V</b> for the black probe.',
        goal: function (S, R, ui) { return metered(ui, 'L+', '0V'); },
        done: 'About 24 V between the source terminals: the supply is present. That is always worth knowing first.',
        hints: ['Test points are the small labelled squares on the drawing.', 'Red probe on the point you are asking about, black probe on your reference (0V).', 'Click the square marked L+, then the square marked 0V.'] },
      { kind: 'ask', predict: true, title: 'Predict: where does the voltage stop?', diagram: 'lamp', preset: { 'sw.S1': true, 'faults.wireOpen': true },
        q: 'S1 is closed and wire 2 is open between 2a and 2b. What will the meter read from 2b (the lamp end) to 0V?',
        choices: [
          { t: 'About 24 V', fb: '24 V is what you would read at 2a, before the break. After the break, 2b is no longer connected to L+.' },
          { t: 'About 12 V', fb: 'Nothing is dividing the voltage here. The point is either connected to L+ or it is not.' },
          { t: '0 V', ok: true, fb: 'Right. Voltage is present up to the break (2a reads 24 V) and missing after it (2b reads 0 V). The place where voltage disappears points at the open.' }
        ],
        run: [],
        probes: ['2b', '0V'],
        verify: function (S) { return FS.sim.meter('lamp', S, 'V', '2b', '0V').value === 0 && FS.sim.meter('lamp', S, 'V', '2a', '0V').value === 24; },
        hints: ['Find 2a and 2b on either side of wire 2.', 'A point only has supply voltage if it is still connected to L+.', '2b is cut off from L+ by the open wire, so it reads 0 V.'] },
      { kind: 'say', title: 'AC and DC, and a word on safety', diagram: 'lamp',
        text: '<b>DC</b> (direct current) pushes in one direction; our 24 VDC control supply is DC. <b>AC</b> (alternating current) reverses direction many times a second; the plant supply and motor power are AC, at much higher voltage.<br><br>That is all you need today.',
        safety: 'In this trainer you measure a simulated 24 VDC circuit only. Real resistance or continuity checks need the circuit isolated and absence of voltage verified first. Work on mains or motor power is for qualified, authorized people.',
        hints: ['DC: one direction. AC: alternates.', 'Control circuits here: 24 VDC. Motor power: three-phase AC.', 'DC = direct, AC = alternating. Higher-voltage AC is not yours to probe.'] },
      { kind: 'ask', noHint: true, title: 'No-hint check', diagram: 'lamp', preset: { 'sw.S1': true },
        q: 'The lamp is lit. You open S1. Which statement is correct?',
        choices: [
          { t: 'Current keeps flowing up to the switch and stops there', fb: 'Current does not pile up at a gap. With the loop open, no current flows anywhere in it. Voltage is still present up to the switch, which is a different thing.' },
          { t: 'The path is broken, so current stops in the whole loop and the lamp goes off', ok: true, fb: 'Correct. One open point stops current everywhere in a series loop.' },
          { t: 'The fuse blows', fb: 'Opening a switch reduces current to zero. Fuses open on too much current, not too little.' }
        ],
        run: [{ 'sw.S1': false }],
        verify: function (S, R) { return !R.el.PL1.on && !R.el.F1.flow; } }
    ]
  });

  /* ====================================================== LESSON 3 */
  L.push({
    id: 'L3', concept: 'sym', title: 'Component and symbol workbench', short: '28 core symbols', minutes: 30, station: 'bench',
    tabs: [['sheet:core', 'Core symbols'], ['sheet:optional', 'Optional']],
    steps: [
      { kind: 'say', title: 'The workbench', sheet: 'core',
        text: 'This is where you learn the alphabet. Each card is a symbol in the simplified North American ladder style we use on this site. Select a card: the part appears on the bench and I\'ll tell you what it is, how it behaves and what people get wrong about it.<br><br>Other sites and IEC-style drawings use different symbols and labels. Always read the legend on the drawing in front of you.',
        hints: ['Click any card in the symbol sheet.', 'The right-hand panel shows the full explanation for the selected part.', 'Pick "Fuse" to start.'] },
      { kind: 'try', title: 'Your turn: look at five parts', sheet: 'core',
        text: 'Select at least <b>five</b> different components. Read the purpose and the common misunderstanding for each. Start with the ones at the top: they are in priority order.',
        goal: function (S, R, ui) { return ui.viewed >= 5; },
        done: 'Good. Come back here whenever a symbol is unfamiliar. The first seventeen cards matter most for tomorrow.',
        hints: ['Each card you select counts once.', 'The counter in the panel shows how many you have viewed.', 'Click five different cards.'] },
      { kind: 'say', title: 'What "normal" means', sheet: 'core',
        text: 'The most important word on a schematic: <b>normally</b>.<br><br>"Normally open" and "normally closed" describe a contact in its <b>reference state</b>: not pressed, not actuated, coil de-energized. That is how the drawing shows it, whatever the machine is doing at the moment.<br><br>NO = open in the reference state, closes when operated.<br>NC = closed in the reference state, opens when operated.',
        hints: ['Compare the two relay contact cards.', 'The slash across a contact means normally closed in this style.', '"Normal" = unactuated / de-energized, as drawn.'] },
      { kind: 'pick', title: 'Select the named symbol (1)', cap: 'symbols', sheet: 'core',
        q: 'Select the <b>normally closed pushbutton</b>.', target: 'pb_nc',
        pool: ['pb_no', 'pb_nc', 'contact_no', 'contact_nc', 'selector', 'limit', 'breaker', 'fuse'],
        fbOk: 'Yes. The bar sits across the two terminals, so the path is closed until you press the button.',
        fbNo: 'Not that one. A pushbutton has a stem and a bar. Normally closed means the bar already bridges the terminals.',
        hints: ['Pushbuttons have a short vertical stem with a cap.', 'Normally closed: the bar touches both terminal circles before anyone presses it.', 'It is the pushbutton whose bar is drawn under and touching the terminals.'] },
      { kind: 'pick', title: 'Select the named symbol (2)', cap: 'symbols', sheet: 'core',
        q: 'Select the <b>normally open relay contact</b>.', target: 'contact_no',
        pool: ['contact_no', 'contact_nc', 'capacitor', 'pb_no', 'fuse', 'relay_coil', 'terminal', 'crossing'],
        fbOk: 'Yes. Two parallel bars with a gap: open until the coil with the same label energizes.',
        fbNo: 'Not that one. Look for two short parallel bars with nothing across them.',
        hints: ['A relay contact is two short parallel bars across the line.', 'Open means nothing bridges the two bars.', 'Two parallel bars, no slash. Careful: the capacitor has one curved plate.'] },
      { kind: 'pick', title: 'Select the named symbol (3)', cap: 'symbols', sheet: 'core',
        q: 'Select the <b>motor overload relay</b>.', target: 'overload',
        pool: ['overload', 'fuse', 'breaker', 'main_contacts', 'transformer', 'contactor_coil', 'motor', 'disconnect'],
        fbOk: 'Yes. A thermal element for the power circuit and a normally closed contact for the control circuit, both labelled OL1.',
        fbNo: 'Not that one. The overload relay shows two parts: a thermal element and a normally closed contact.',
        hints: ['It has two parts drawn side by side.', 'One part senses motor current, the other is a contact that opens on a trip.', 'The card with "element" and "contact" printed under it.'] },
      { kind: 'ask', title: 'Open or closed as drawn? (1)', concept: 'nonc', cap: 'nonc', sheet: 'core', symbol: { sym: 'nc' },
        q: 'This contact is labelled CR1 and CR1\'s coil is de-energized. As drawn, is the contact open or closed?',
        choices: [
          { t: 'Closed', ok: true, fb: 'Right. The slash marks a normally closed contact. With the coil de-energized it is in its reference state: closed.' },
          { t: 'Open', fb: 'The slash across the bars marks it as normally closed. De-energized is the reference state, so it is closed.' }
        ],
        hints: ['Look for a diagonal slash.', 'Slash = normally closed in this style.', 'It is closed.'] },
      { kind: 'ask', title: 'Open or closed as drawn? (2)', concept: 'nonc', cap: 'nonc', sheet: 'core', symbol: { sym: 'pb_no' },
        q: 'Nobody is touching this pushbutton. Is its contact open or closed?',
        choices: [
          { t: 'Closed', fb: 'The bar is drawn above the terminals, not touching them. Unpressed, this contact is open.' },
          { t: 'Open', ok: true, fb: 'Right. The bar is above the terminals with a gap. Pressing the button pushes it down to bridge them.' }
        ],
        hints: ['Is the bar touching the two terminal circles?', 'A gap means open in the reference state.', 'It is open: a normally open pushbutton.'] },
      { kind: 'match', title: 'Match symbol to hardware', concept: 'coil', cap: 'symbols', sheet: 'core', symbol: { sym: 'coil', o: { t: 'M1' } },
        q: 'This symbol is on the control rung. Which part on the bench does it belong to?',
        bench: ['motor', 'contactor_coil', 'pilot', 'fuse'], answer: 'contactor_coil',
        opts: ['A blue finned housing with a shaft and a terminal box: a motor.', 'A beige block with three large screw terminals along the top and the bottom: a contactor.', 'A red lens in a metal collar: a pilot light.', 'A small cartridge clipped into a holder: a fuse.'],
        fbOk: 'Right. The circle labelled M1 is the coil inside the contactor. The motor is MTR1.',
        fbNo: 'Not that one. In this application M1 is the contactor, and its coil is inside the contactor body.',
        hints: ['Read the label inside the circle.', 'M1 is the contactor here; the motor is labelled MTR1.', 'The contactor: the block with three large terminals top and bottom.'] },
      { kind: 'ask', predict: true, title: 'Predict: the coil energizes', concept: 'coil', diagram: 'ladD',
        q: 'On this drawing, S1 is about to close and energize coil CR1. What happens to the CR1 contact on rung 2?',
        choices: [
          { t: 'Nothing: no wire joins the coil to the contact', fb: 'There is no wire because none is needed. The coil moves its contacts mechanically inside the relay. The shared label CR1 is the link.' },
          { t: 'It closes, and PL1 lights', ok: true, fb: 'Right. A relay coil and its contacts are functionally linked. Energize CR1 and every normally open CR1 contact closes.' },
          { t: 'It opens', fb: 'It is drawn normally open. Energizing the coil changes it to the opposite state: closed.' }
        ],
        run: [{ 'sw.S1': true }],
        verify: function (S, R) { return R.el.CR1.on && R.el['CR1-1'].closed && R.el.PL1.on; },
        hints: ['Find both things labelled CR1.', 'A coil operates every contact that carries its label.', 'The NO contact closes and the lamp lights.'] },
      { kind: 'say', title: 'Distinctions that interviewers listen for', sheet: 'core',
        text: 'Say these plainly and you will sound like someone who has thought about it.',
        card: [
          { h: 'Know the difference', items: [
            'A relay coil and its contacts are linked by function and label, not necessarily by a wire.',
            'A contactor switches the load through its main power contacts. The control circuit only energizes its coil.',
            'An overload relay protects a motor from sustained overload. It does not replace short-circuit protection (fuses or a breaker).',
            'For sensors and special devices, behavior depends on the documented type and configuration.' ] },
          { h: 'Safety facts', items: [
            'An indicator light or PLC status LED alone does not prove equipment is safe to touch.',
            'An emergency stop is not a substitute for energy isolation.',
            'Never bypass an overload, interlock or guard to make a machine run.' ] }
        ],
        hints: ['Read the first list twice.', 'Each line is a ready-made interview sentence.', 'Practice saying the overload line aloud.'] },
      { kind: 'say', title: 'Three things that are not the same', sheet: 'core',
        text: 'People say "ground" for all three of these. They are different, and you must not treat them as interchangeable.',
        card: [
          { h: 'Earth, common, neutral', syms: [['pe', 'Protective earth (PE)'], ['com', 'DC common (0V)'], ['neutral', 'AC neutral (N)']], items: [
            '<b>Protective earth (PE)</b>: a safety conductor bonded to metal parts. It should carry current only during a fault.',
            '<b>DC common (0V)</b>: the return side of a DC supply. It carries the circuit\'s current in normal operation.',
            '<b>AC neutral (N)</b>: a current-carrying conductor of an AC supply.' ] },
          { h: 'Joined or just crossing?', syms: [['junction', 'Connected junction'], ['crossing', 'Crossing, not connected']], items: [
            'A dot means the wires are connected.',
            'Lines that cross with no dot are not connected.' ] },
          { h: 'Other conventions (IEC)', items: [
            'IEC-style drawings draw contacts as angled blades and coils as rectangles, and label relays K1, K2 where we use CR1.',
            'Abbreviations and reference labels are not universal. Read the legend of every drawing before trusting a label.' ] }
        ],
        hints: ['Compare the three symbols on the first card.', 'Only protective earth is there purely for safety.', 'PE = safety; 0V = DC return; N = AC conductor.'] },
      { kind: 'pick', noHint: true, title: 'No-hint check (1)', cap: 'symbols', sheet: 'core',
        q: 'Select the <b>protective earth</b> symbol.', target: 'earth',
        pool: ['earth', 'terminal', 'junction', 'pilot', 'transformer', 'solenoid', 'crossing', 'psu'],
        fbOk: 'Correct. A stem with three shrinking bars.',
        fbNo: 'Not that one. Protective earth is the stem with three horizontal bars getting shorter.' },
      { kind: 'ask', noHint: true, title: 'No-hint check (2)', concept: 'nonc', cap: 'nonc', sheet: 'core', symbol: { sym: 'no' },
        q: 'This contact is labelled M1. M1\'s coil has just been energized. The contact is now…',
        choices: [
          { t: 'Closed', ok: true, fb: 'Correct. It is drawn normally open; energizing its coil closes it.' },
          { t: 'Open', fb: 'Open is its reference (de-energized) state. With the coil energized it is closed.' }
        ] }
    ]
  });

  /* ====================================================== LESSON 4 */
  L.push({
    id: 'L4', concept: 'logic', title: 'Reading ladder diagrams', short: 'Rails, rungs, AND, OR', minutes: 25, station: 'display',
    tabs: [['ladA', 'A'], ['ladB', 'B · series'], ['ladC', 'C · parallel'], ['ladD', 'D · relay']],
    steps: [
      { kind: 'say', title: 'Rails and rungs', diagram: 'ladA',
        text: 'A ladder diagram looks like a ladder. The two uprights are the <b>supply rails</b>: L+ (24 VDC) on the left, 0V (DC common) on the right. Each horizontal line is a <b>rung</b>.<br><br>Read each rung <b>left to right</b>, and the rungs <b>top to bottom</b>. Control devices are on the left, the load is on the right, next to the return rail.',
        hints: ['Find the two vertical rails.', 'One rung = one small circuit between the rails.', 'Left rail L+, right rail 0V, rung between them.'] },
      { kind: 'demo', title: 'One switch, one lamp', diagram: 'ladA',
        text: 'Ladder A is the lamp circuit from before, redrawn as a rung.',
        script: [
          { ms: 600, set: { 'sw.S1': true }, note: 'S1 closed: path from L+ through S1 and PL1 to 0V. Lamp on.' },
          { ms: 2000, set: { 'sw.S1': false }, note: 'S1 open: no path. Lamp off.' }
        ] },
      { kind: 'try', title: 'Series: your turn', diagram: 'ladB',
        text: 'Ladder B has two switches one after the other: <b>in series</b>. Light PL1.',
        goal: function (S, R) { return R.el.PL1.on; },
        done: 'Both had to be closed. Series devices are an <b>AND</b> condition: S1 AND S2.',
        hints: ['There are two switch controls at the bottom.', 'The current has to get through both switches.', 'Close S1 and S2.'] },
      { kind: 'ask', predict: true, title: 'Predict: series', diagram: 'ladB', preset: { 'sw.S1': true, 'sw.S2': true },
        q: 'Both switches are closed and the lamp is on. You open S2 only. What happens?',
        choices: [
          { t: 'The lamp stays on through S1', fb: 'S1 only gets current as far as S2. In series there is one path, and S2 is now a gap in it.' },
          { t: 'The lamp goes off', ok: true, fb: 'Right. In series, any one open device breaks the only path.' }
        ],
        run: [{ 'sw.S2': false }],
        verify: function (S, R) { return !R.el.PL1.on; },
        hints: ['Is there any way round S2?', 'Series = AND. Both must be closed.', 'The lamp goes off.'] },
      { kind: 'try', title: 'Parallel: your turn', diagram: 'ladC',
        text: 'Ladder C has the switches side by side: <b>in parallel</b>. The dots are junctions where the branches join. Light PL1 using <b>only S2</b>.',
        goal: function (S, R) { return R.el.PL1.on && !S.sw.S1 && S.sw.S2; },
        done: 'One branch was enough. Parallel branches are an <b>OR</b> condition: S1 OR S2.',
        hints: ['Leave S1 open.', 'Current can take the lower branch.', 'Close S2 only.'] },
      { kind: 'ask', predict: true, title: 'Predict: parallel', diagram: 'ladC', preset: { 'sw.S1': true, 'sw.S2': true },
        q: 'Both switches are closed and the lamp is on. You open S1 only. What happens?',
        choices: [
          { t: 'The lamp stays on', ok: true, fb: 'Right. The S2 branch still completes a path. Hold on to this: it is exactly how a holding contact keeps a motor running.' },
          { t: 'The lamp goes off', fb: 'That would be true in series. In parallel, the other branch still provides a complete path.' }
        ],
        run: [{ 'sw.S1': false }],
        verify: function (S, R) { return R.el.PL1.on; },
        hints: ['Is there another route for the current?', 'Parallel = OR. One closed branch is enough.', 'The lamp stays on through S2.'] },
      { kind: 'say', title: 'Labels, wire numbers and cross-references', diagram: 'ladD',
        text: 'Ladder D has two rungs. Four kinds of label help you navigate:<br>• <b>Device reference labels</b>: S1, CR1, PL1. The same label means the same device.<br>• <b>Wire numbers</b>: the squares marked 1 and 2. One number, one electrical point.<br>• <b>Terminal labels</b>: such as 13-14 or A1-A2 on a device.<br>• <b>Cross-references</b>: the note beside coil CR1 says where its contacts are.<br><br>Select the CR1 coil. Its contact on rung 2 highlights too.',
        sel: 'CR1',
        hints: ['Click the circle marked CR1.', 'Anything marked SAME DEVICE shares the label.', 'CR1 coil is on rung 1; its contact is on rung 2.'] },
      { kind: 'demo', title: 'A relay: one circuit switches another', diagram: 'ladD',
        text: 'Rung 1 energizes the coil. Rung 2 is a separate circuit switched by the coil\'s contact.',
        script: [
          { ms: 600, set: { 'sw.S1': true }, sel: 'CR1', note: 'S1 closes. CR1 coil energizes. Its NO contact on rung 2 closes and PL1 lights.' },
          { ms: 2400, set: { 'sw.S1': false }, note: 'S1 opens. Coil drops out, contact opens, lamp off.' }
        ] },
      { kind: 'trace', title: 'Trace the path (series)', cap: 'trace', diagram: 'ladB', preset: { 'sw.S1': true, 'sw.S2': true },
        text: 'Trace mode. Click each <b>device</b> along the path that is carrying current from L+ to 0V, then press <b>Check path</b>.',
        hints: ['Start at the left rail and move right.', 'In series, the path goes through every device on the rung.', 'Click S1, S2 and PL1, then Check path.'] },
      { kind: 'trace', title: 'Trace the path (parallel)', cap: 'trace', diagram: 'ladC', preset: { 'sw.S1': false, 'sw.S2': true },
        text: 'S1 is open, S2 is closed, and the lamp is on. Trace the path that is actually conducting. If you try the S1 branch I\'ll show you where it stops.',
        hints: ['Check each switch\'s state tag.', 'A path through an open device is interrupted.', 'Click S2 and PL1, then Check path.'] },
      { kind: 'trace', title: 'Trace the path (relay)', concept: 'coil', cap: 'trace', diagram: 'ladD', preset: { 'sw.S1': true },
        text: 'S1 is closed, so CR1 is energized. Trace the path that lights <b>PL1</b>.',
        need: 'PL1',
        hints: ['Which rung is PL1 on?', 'The lamp\'s current does not go through S1 or the coil. It goes through the CR1 contact.', 'Click the CR1 contact and PL1, then Check path.'] },
      { kind: 'say', title: 'Relay ladder versus PLC ladder', diagram: 'ladD',
        text: 'One caution. A <b>relay ladder schematic</b> like this shows real devices and real wires.<br><br><b>PLC ladder programming</b> borrows the same look, but its "contacts" are instructions that test a condition in the PLC\'s memory. A PLC rung is not automatically a literal drawing of field contacts. A normally closed STOP button, for example, is often tested with a normally open instruction.<br><br>When someone hands you a ladder, ask which one it is.',
        hints: ['Hardware drawing or software?', 'PLC instructions evaluate logic; they are not wires.', 'Relay ladder = physical circuit. PLC ladder = program.'] },
      { kind: 'ask', noHint: true, title: 'No-hint check', diagram: 'ladC',
        q: 'Two normally open contacts are drawn in parallel, and together they feed one coil. The coil energizes when…',
        choices: [
          { t: 'Both contacts are closed', fb: 'That would be series (AND). In parallel, each branch is a complete alternative path.' },
          { t: 'Either contact is closed', ok: true, fb: 'Correct. Parallel is OR: either branch completes the path.' },
          { t: 'Neither contact is closed', fb: 'With both open there is no path at all.' }
        ],
        run: [{ 'sw.S2': true }],
        verify: function (S, R) { return R.el.PL1.on && !S.sw.S1; } }
    ]
  });

  /* ====================================================== LESSON 5 */
  L.push({
    id: 'L5', concept: 'hold', title: 'START/STOP motor control', short: 'The three-wire holding circuit', minutes: 30, station: 'panel',
    steps: [
      { kind: 'say', title: 'Two circuits, one starter', diagram: 'starter',
        text: 'This is the circuit interviewers ask about most. There are two drawings.<br><br><b>Top: control circuit</b>, 24 VDC. It decides whether the contactor coil M1 is energized.<br><b>Bottom: power circuit</b>, three-phase. Supply, disconnect DS1, fuses, M1 main contacts, overload elements OL1, motor MTR1.<br><br>They are linked by the contactor: the coil is in the control circuit, the main contacts are in the power circuit.',
        safety: 'The power circuit here is diagram-only. You do not take measurements on it in this trainer, and on a real machine it is work for qualified, authorized people.',
        sel: 'M1coil',
        hints: ['Select the M1 coil and see what else highlights.', 'Everything labelled M1 is one device: coil, auxiliary contact, main contacts.', 'Control circuit on top, power circuit below, joined by M1.'] },
      { kind: 'say', title: 'Read the control rung', diagram: 'starter',
        text: 'Left to right:<br>1. <b>PB1 STOP</b>, normally closed.<br>2. <b>OL1</b> overload contact, normally closed.<br>3. A parallel branch: <b>PB2 START</b> (normally open) on top, the <b>M1 auxiliary contact</b> (normally open) underneath.<br>4. The <b>M1 coil</b>, then the return to 0V.<br><br>In logic: STOP-not-pressed AND overload-not-tripped AND (START OR M1-already-in).',
        hints: ['Series parts first, then the parallel pair, then the coil.', 'Series = AND, parallel = OR.', 'PB1 → OL1 → (PB2 or M1 aux) → M1 coil → 0V.'] },
      { kind: 'demo', title: 'Start, release, stop', diagram: 'starter',
        expect: { q: 'I will press START and then let go. What do you expect the M1 coil to do when I release START, and why?', choices: ['It stays energized, because the M1 auxiliary contact gives the current another path', 'It drops out, because START is a momentary button', 'It stays energized, because START latches mechanically'], ok: 0 },
        text: 'Watch the wire numbers 2 and 3 and the holding branch.',
        script: [
          { ms: 700, set: { 'pb.PB2': true }, note: 'START pressed: the path is complete, the M1 coil energizes, main contacts close, the motor runs. The M1 auxiliary contact closes too.' },
          { ms: 2400, set: { 'pb.PB2': false }, note: 'START released: current now reaches the coil through the M1 auxiliary contact. The coil holds itself in.' },
          { ms: 2600, set: { 'pb.PB1': true }, note: 'STOP pressed: the series path is broken, the coil drops out, the auxiliary contact opens.' },
          { ms: 1400, set: { 'pb.PB1': false }, note: 'STOP released: nothing restarts. START is open and so is the holding contact.' }
        ] },
      { kind: 'try', title: 'Your turn: start the motor', diagram: 'starter',
        text: 'Press and hold <b>START</b> at the bottom of the screen, watch M1 pull in, then let go.',
        goal: function (S, R, ui) { return S.relay.M1 && !S.pb.PB2 && had(ui, 'pb.PB2:true'); },
        done: 'Still running with START released. The motor continues because the M1 auxiliary contact, in parallel with START, keeps the coil circuit complete. That is the holding (seal-in) circuit.',
        hints: ['START is a momentary button: hold it down, then release.', 'Watch the lower branch turn orange when you let go.', 'Hold the START button for a second, then release it.'] },
      { kind: 'ask', predict: true, title: 'Predict: STOP', cap: 'predict', diagram: 'starter', preset: { run: true },
        q: 'The motor is running. You press STOP and let go again. What does the motor do after you release STOP?',
        choices: [
          { t: 'It restarts, because the STOP contact is closed again', fb: 'When the coil dropped out, the holding contact opened. With START also open there is no path, even though STOP has reclosed.' },
          { t: 'It stays stopped until START is pressed', ok: true, fb: 'Right. STOP broke the coil circuit, the holding contact opened, and nothing can re-energize the coil until START is pressed.' }
        ],
        run: [{ 'pb.PB1': true }, { 'pb.PB1': false }],
        verify: function (S, R) { return !S.relay.M1 && R.el.PB1.closed; },
        hints: ['What state is the M1 auxiliary contact in once the coil drops?', 'Both parallel branches are open after a stop.', 'It stays stopped.'] },
      { kind: 'try', title: 'Your turn: overload trip', diagram: 'starter', preset: { run: true },
        text: 'The motor is running. Press <b>Trip overload</b> to simulate the overload relay detecting a sustained overcurrent.',
        goal: function (S) { return S.olTripped && !S.relay.M1; },
        done: 'The OL1 control contact opened, the coil dropped out and the motor stopped. The overload contact is in series with the coil for exactly this reason.',
        hints: ['The control is in the bottom bar.', 'A trip opens the normally closed OL1 contact (95-96).', 'Press "Trip overload".'] },
      { kind: 'ask', predict: true, title: 'Predict: reset the overload', cap: 'predict', diagram: 'starter', preset: { olTripped: true },
        q: 'The overload is tripped and the motor is stopped. Someone resets the overload. What happens?',
        choices: [
          { t: 'The motor restarts by itself', fb: 'Resetting closes the OL1 contact, but START and the holding contact are both still open, so the coil has no path.' },
          { t: 'The motor stays stopped until START is pressed', ok: true, fb: 'Right. Reset only makes starting possible again. And a trip means something caused it, which needs finding.' }
        ],
        run: [{ olTripped: false }],
        verify: function (S, R) { return !S.relay.M1 && R.el.OL1.closed; },
        hints: ['After the reset, look at the parallel branch.', 'A closed OL1 contact is necessary, not sufficient.', 'It stays stopped until START.'] },
      { kind: 'ask', predict: true, title: 'Predict: control power lost', cap: 'predict', diagram: 'starter', preset: { run: true },
        q: 'The motor is running. Control power is lost for a moment, then comes back. What does the motor do?',
        choices: [
          { t: 'It restarts when power returns', fb: 'When power dropped, the coil de-energized and the holding contact opened. Power returning finds both parallel branches open.' },
          { t: 'It stays stopped until START is pressed', ok: true, fb: 'Right. This is a useful property of the three-wire circuit: the machine does not restart by itself after a power dip.' }
        ],
        run: [{ supply: false }, { supply: true }],
        verify: function (S) { return !S.relay.M1 && S.supply; },
        hints: ['What holds the coil in? What happens to it with no power?', 'The holding contact only stays closed while the coil is energized.', 'It stays stopped.'] },
      { kind: 'say', title: 'Four explanations to have ready', diagram: 'starter',
        text: 'Say these out loud until they are comfortable.',
        card: [{ h: 'Why…', items: [
          '<b>…does the motor keep running after START is released?</b> The M1 auxiliary contact closes when the contactor pulls in and carries the coil current in place of the START button.',
          '<b>…is the holding contact in parallel with START?</b> So it offers an alternative path around the START button. Parallel is OR: START or already-running.',
          '<b>…are STOP and the overload contact in series with the coil?</b> So either one opening breaks the coil circuit whichever parallel branch was feeding it.',
          '<b>…can a motor with healthy power still fail to start?</b> Because the power only reaches the motor through M1\'s main contacts, and those close only if the control circuit energizes the coil.' ] }],
        safety: 'This is a simplified teaching circuit, not a complete machine safety design. A STOP button is not energy isolation, and an overload must never be bypassed to keep a machine running.',
        hints: ['Each answer names one device and one reason.', 'Point at the drawing while you say them.', 'Holding contact, parallel = OR, series = AND, control before power.'] },
      { kind: 'try', title: 'Your turn: measure the rung', diagram: 'starter',
        text: 'The motor is stopped. Measure DC volts from wire <b>2</b> to <b>0V</b>, then from wire <b>3</b> to <b>0V</b>. Think about why they differ.',
        goal: function (S, R, ui) { return metered(ui, '2', '0V') && metered(ui, '3', '0V'); },
        done: '24 V at wire 2: STOP and OL1 are closed, so supply voltage reaches the parallel branch. 0 V at wire 3: START and the holding contact are both open. The voltage disappears across the open devices.',
        hints: ['Click test point 2, then 0V. Then click 3, then 0V.', 'The probes alternate: red first, then black.', 'Read 2→0V (24 V), then 3→0V (0 V).'] },
      { kind: 'ask', noHint: true, title: 'No-hint check (1)', cap: 'holding', diagram: 'starter', preset: { run: true },
        q: 'The motor has been running for an hour. Nobody is touching START. Which device is completing the coil circuit around the START button?',
        choices: [
          { t: 'PB1, the STOP button', fb: 'PB1 is in series and must be closed, but it is not what bridges the open START button.' },
          { t: 'The M1 auxiliary (holding) contact', ok: true, fb: 'Correct. It is in parallel with START and is closed because M1 is pulled in.' },
          { t: 'The M1 main contacts', fb: 'The main contacts are in the power circuit. They carry motor current, not coil current.' }
        ],
        run: [],
        verify: function (S, R) { return R.el['M1-AUX'].flow && !R.el.PB2.flow; } },
      { kind: 'ask', noHint: true, title: 'No-hint check (2)', cap: 'predict', diagram: 'starter',
        q: 'Which of these would <b>not</b> interrupt the M1 coil circuit while the motor is running?',
        choices: [
          { t: 'Pressing STOP', fb: 'STOP is in series with the coil. Pressing it interrupts the circuit.' },
          { t: 'The overload tripping', fb: 'The OL1 contact is in series with the coil. A trip interrupts the circuit.' },
          { t: 'Releasing START', ok: true, fb: 'Correct. Once M1 is in, the holding contact carries the coil current, so releasing START changes nothing.' },
          { t: 'Losing control power', fb: 'With no supply there is nothing to energize the coil.' }
        ],
        preset: { run: true },
        run: [{ 'pb.PB2': false }],
        verify: function (S) { return S.relay.M1; } }
    ]
  });

  /* ====================================================== LESSON 6 */
  L.push({
    id: 'L6', concept: 'diag', title: 'Sensors and PLC basics', short: 'Signal chain and checkpoints', minutes: 20, station: 'conveyor',
    steps: [
      { kind: 'say', title: 'The chain', diagram: 'plc',
        text: 'A PLC is a small industrial computer. On this conveyor the chain is:<br><br><b>Field device → input → logic → output → interface device → load</b><br><br>Photoelectric sensor PEC1 sees a box. PLC input I0 receives the signal. The program evaluates it. Output Q0 turns on. Q0 energizes interposing relay CR2. A CR2 contact switches pilot light PL2, "BOX PRESENT".',
        hints: ['Read the numbered labels 1 to 6 across the drawing.', 'Each link hands the signal to the next.', 'PEC1 → I0 → logic → Q0 → CR2 → PL2.'] },
      { kind: 'demo', title: 'A box arrives', diagram: 'plc',
        expect: { q: 'A box is about to reach PEC1. What do you expect to happen first, and why?', choices: ['Lamp PL2 lights first, because it is the load', 'The sensor output switches first, then the input, the logic, the output, the relay and finally the lamp', 'Output Q0 turns on first, because the PLC is in charge'], ok: 1 },
        text: 'Watch the signal move along the chain.',
        script: [
          { ms: 700, set: { box: true }, note: 'Box at the sensor. PEC1 output on, input I0 on, logic true, Q0 on, CR2 pulls in, PL2 lights.' },
          { ms: 2800, set: { box: false }, note: 'Box gone. Every link drops out in turn.' }
        ] },
      { kind: 'try', title: 'Your turn: send a box', diagram: 'plc',
        text: 'Use <b>Box at sensor</b> to put a box in front of PEC1 and light PL2.',
        goal: function (S, R) { return R.el.PL2.on; },
        done: 'Signal all the way through. Notice each stage has its own indicator.',
        hints: ['The control is in the bottom bar.', 'PL2 lights only if every link in the chain works.', 'Press "Box at sensor".'] },
      { kind: 'say', title: 'Inputs report, outputs command', diagram: 'plc',
        text: '<b>Inputs report conditions</b> to the PLC. The PLC only knows whether voltage is present at I0.<br><b>Outputs command devices.</b> Q0 turning on is an instruction, nothing more.<br><br>A PLC generally does <b>not</b> power a conveyor motor directly. Its output drives an interface device, such as a relay, a contactor coil or a drive input, and that device handles the load.<br><br>The rung drawn inside the PLC is a program instruction. It is evaluated by the PLC; it is not a physical contact.',
        sel: 'Q0',
        hints: ['Select Q0 and read what it is.', 'Small output, bigger load: something has to sit between them.', 'Inputs report. Outputs command. Interface devices switch loads.'] },
      { kind: 'ask', predict: true, title: 'Predict: the box leaves', diagram: 'plc', preset: { box: true },
        q: 'A box is at the sensor and PL2 is on. The box moves away. What happens to Q0 and PL2?',
        choices: [
          { t: 'Q0 stays on until someone resets it', fb: 'This program has no holding logic. Q0 simply follows I0.' },
          { t: 'Q0 turns off, CR2 drops out and PL2 goes off', ok: true, fb: 'Right. The logic says Q0 follows I0, so when the sensor signal goes, everything after it follows.' },
          { t: 'Q0 turns off but PL2 stays on', fb: 'PL2 is fed through a CR2 contact, and CR2 is energized by Q0. No Q0, no CR2, no lamp.' }
        ],
        run: [{ box: false }],
        verify: function (S, R) { return !S.plc.Q0 && !S.relay.CR2 && !R.el.PL2.on; },
        hints: ['Follow the chain backwards from PL2.', 'Each link depends on the one before it.', 'Everything turns off.'] },
      { kind: 'say', title: 'Six checkpoints', diagram: 'plc',
        text: 'When this stops working, do not stare at the PLC. Check the links in order, each one separately:',
        card: [{ h: 'Separate checkpoints', items: [
          '<b>Sensor power</b>: does PEC1 have its supply (power LED)?',
          '<b>Sensor signal</b>: does PEC1 switch when a box is present (output LED)?',
          '<b>Input</b>: does the signal arrive at I0 (input LED, voltage at I0)?',
          '<b>Logic</b>: does the program condition become true?',
          '<b>Output</b>: does Q0 turn on?',
          '<b>Interface and load</b>: does CR2 pull in and does PL2 actually light?' ] }],
        safety: 'A commanded output does not prove the physical load operated, and a status LED alone does not prove equipment is safe to touch.',
        hints: ['There are six, in signal order.', 'Find the first link that is not doing its job.', 'Power, signal, input, logic, output, load.'] },
      { kind: 'try', title: 'Your turn: measure the input', diagram: 'plc',
        text: 'Put a box at the sensor, then measure DC volts from <b>I0</b> to <b>0V</b>.',
        goal: function (S, R, ui) { return S.box && ui.lastMeter && ui.lastMeter.mode === 'V' && ui.lastMeter.value > 20 && ((ui.lastMeter.a === 'I0' && ui.lastMeter.b === '0V') || (ui.lastMeter.a === '0V' && ui.lastMeter.b === 'I0')); },
        done: '24 V at I0 with a box present: the sensor is delivering its signal to the input. Take the box away and it reads 0 V.',
        hints: ['Box first, then the two probe clicks.', 'Red probe on I0, black on 0V.', 'Press "Box at sensor", click test point I0, then 0V.'] },
      { kind: 'say', title: 'Sensors depend on type and setup', diagram: 'plc',
        text: 'PEC1 here is a <b>diffuse</b> photoelectric sensor: it switches on when light bounces back from the box. Other photoelectric sensors use a reflector or a separate receiver and may switch on when the beam is <i>blocked</i>.<br><br>Outputs can be sourcing or sinking, normally open or normally closed, light-operate or dark-operate. So "what should I see?" always depends on the documented device type and configuration. Check the drawing and the data sheet before deciding a sensor is faulty.',
        sel: 'PEC1',
        hints: ['Select PEC1 and read the "normal state" line.', 'Two sensors that look alike can behave in opposite ways.', 'Behavior depends on documented type and configuration.'] },
      { kind: 'ask', noHint: true, title: 'No-hint check (1)', diagram: 'plc',
        q: 'The Q0 output LED is on, but pilot light PL2 is dark. Which statement is correct?',
        choices: [
          { t: 'The PLC program must be wrong', fb: 'Q0 is on, so the program has already asked for the lamp. The problem is after the output.' },
          { t: 'The output is commanded, but that does not prove the load operated. Check CR2, its contact, the lamp and the wiring', ok: true, fb: 'Correct. A commanded output is not proof that the load worked. The remaining checkpoints are the interface device and the load.' },
          { t: 'The sensor must be misaligned', fb: 'If the sensor were not detecting, I0 and Q0 would be off. Q0 is on, so the front of the chain is working.' }
        ] },
      { kind: 'ask', noHint: true, title: 'No-hint check (2)', diagram: 'plc',
        q: 'A box is in front of PEC1 but the I0 LED on the PLC is off. Where do you look first?',
        choices: [
          { t: 'At the field device: sensor power, its indicator, alignment, then the signal wire', ok: true, fb: 'Correct. The input is not receiving a signal, so start at the beginning of the chain before suspecting the PLC.' },
          { t: 'At output Q0 and relay CR2', fb: 'They come after the input. With I0 off, they are correctly doing nothing.' },
          { t: 'At the PLC program', fb: 'The program can only act on what the input reports. I0 is off, so the signal is missing before the logic.' }
        ] }
    ]
  });

  /* ====================================================== LESSON 7 */
  L.push({
    id: 'L7', concept: 'sym', optional: true, title: 'Pneumatic and hydraulic recognition (optional)', short: 'Short optional module: fluid power symbols', minutes: 12, station: 'pneu',
    tabs: [['pneu', 'Pneumatic circuit'], ['sheet:fluid', 'Fluid symbols']],
    steps: [
      { kind: 'say', title: 'Air and oil', diagram: 'pneu',
        text: 'Short module, recognition only.<br><br><b>Pneumatics</b> uses compressed gas, usually air. <b>Hydraulics</b> uses liquid, usually oil, at much higher pressure.<br><br>This drawing has two parts kept apart on purpose: the pneumatic circuit on the left (thick lines) and a small electrical rung on the right. Fluid lines are never the same thing as wires.',
        hints: ['Thick lines are air lines; thin lines are wires.', 'The only link between the two sides is the solenoid SOL1.', 'Pneumatics = gas. Hydraulics = liquid.'] },
      { kind: 'say', title: 'Reading the valve', diagram: 'pneu',
        text: 'Valve V1 is drawn as two boxes. They are <b>not</b> two valves. Each box is one <b>position</b> of the same valve and shows the flow paths in that position.<br><br>The port lines (1, 2, 3, 4, 5) connect to the box that is active. The <b>spring</b> on the right holds the right-hand box in line: that is the rest position. The <b>solenoid</b> on the left pushes the left-hand box into line when energized.<br><br>Port connections plus the selected position decide where the air goes.',
        sel: 'V1',
        hints: ['Find the spring: the box next to it is the rest position.', 'Arrows inside a box show flow in that position.', 'Boxes = positions. Spring side = rest.'] },
      { kind: 'demo', title: 'Extend and retract', diagram: 'pneu',
        text: 'Watch the valve boxes slide and the pressure change sides.',
        script: [
          { ms: 700, set: { 'sw.SS2': true }, note: 'SOL1 energized: the left box slides into line. Air goes from port 1 to port 4, into the cap end. The rod end exhausts through 2 to 3. The cylinder extends.' },
          { ms: 3200, set: { 'sw.SS2': false }, note: 'SOL1 de-energized: the spring returns the valve. Air goes 1 to 2, into the rod end; the cap end exhausts through 4 to 5. The cylinder retracts.' }
        ] },
      { kind: 'try', title: 'Your turn: extend the cylinder', diagram: 'pneu',
        text: 'Turn <b>SS2</b> to EXTEND and let CYL1 reach the end of its stroke.',
        goal: function (S) { return S.cyl > 0.97; },
        done: 'Extended. Electrical command, valve shift, air pressure, movement: four separate things had to happen.',
        hints: ['SS2 is in the bottom bar.', 'The cylinder needs both the solenoid and air pressure.', 'Press "SS2" so it reads EXTEND, and check SV1 is open.'] },
      { kind: 'ask', predict: true, title: 'Predict: solenoid off', diagram: 'pneu', preset: { 'sw.SS2': true, cyl: 1 },
        q: 'The cylinder is extended. SOL1 is de-energized while the air is still on. What happens?',
        choices: [
          { t: 'The cylinder stays extended', fb: 'This valve has a spring return. With the solenoid off, the spring shifts it back to the rest position, which pressurizes the rod end.' },
          { t: 'The spring returns the valve and the cylinder retracts', ok: true, fb: 'Right. Spring return defines the rest position: air goes 1 to 2 and the cylinder retracts. Losing the electrical signal causes movement.' }
        ],
        run: [{ 'sw.SS2': false }],
        verify: function (S, R) { return !R.el.SOL1.on && FS.sim.fluid(S, R.el.SOL1.on).pB; },
        hints: ['Which box is next to the spring?', 'Rest position sends air to port 2, the rod end.', 'It retracts.'] },
      { kind: 'say', title: 'Stored energy', diagram: 'pneu',
        text: 'Fluid power stores energy. Switching off the electrics does not empty an air line or lower a raised load.',
        safety: 'Trapped pressure and suspended loads remain hazards after electrical power is removed. Electrical, pneumatic, hydraulic, mechanical and stored energy can all exist on one machine. Identify every source and follow the site isolation procedure for each.',
        hints: ['Electrical off is one source dealt with.', 'Air can stay trapped between a closed valve and a cylinder.', 'Every energy source needs its own isolation.'] },
      { kind: 'pick', title: 'Select the named symbol', sheet: 'fluid',
        q: 'On the fluid symbols sheet, select the <b>pressure-relief valve</b>.', target: 'relief',
        pool: ['relief', 'check', 'flow_ctrl', 'frl', 'gauge', 'dcv', 'cyl_sa', 'hyd_pump'],
        fbOk: 'Yes. A box with an arrow held off the line by a spring, and a dashed pilot line sensing the pressure.',
        fbNo: 'Not that one. Look for a single box with a spring on one side and a dashed pilot line.',
        hints: ['It is a single square, not two boxes.', 'It has a spring and a dashed line.', 'Square + spring + dashed pilot line.'] },
      { kind: 'ask', noHint: true, title: 'No-hint check (1)', diagram: 'pneu',
        q: 'What do the two boxes in the V1 symbol represent?',
        choices: [
          { t: 'Two separate valves bolted together', fb: 'It is one valve. The boxes are its positions.' },
          { t: 'Two possible positions of one valve, each showing its flow paths', ok: true, fb: 'Correct. Only one box is in line with the ports at a time.' },
          { t: 'The inlet side and the outlet side', fb: 'The ports are the numbered lines. The boxes are positions.' }
        ] },
      { kind: 'ask', noHint: true, title: 'No-hint check (2)', concept: 'safe', diagram: 'pneu',
        q: 'The machine\'s electrical supply has been switched off. Is the pneumatic cylinder now safe to reach into?',
        choices: [
          { t: 'Yes, nothing can move without electricity', fb: 'Air pressure, springs and gravity do not need electricity. A spring-return valve can even cause movement when power is removed.' },
          { t: 'Not necessarily: trapped air and suspended loads can still cause movement, so every energy source must be isolated following site procedure', ok: true, fb: 'Correct. Electrical isolation deals with one energy source only.' }
        ] }
    ]
  });

  /* ====================================================== LESSON: DRAWING SET */
  L.push({
    id: 'LD', concept: 'nav', title: 'Navigating a drawing set', short: 'Sheets, revisions, tags, cross-references', minutes: 15, station: 'panel',
    tabs: [['dwg1', '1 · Device list'], ['dwg2', '2 · Power'], ['dwg3', '3 · Control'], ['dwg4', '4 · Terminals']],
    steps: [
      { kind: 'say', title: 'A drawing set, not a single page', diagram: 'dwg1',
        text: 'On the floor nobody hands you one tidy picture. You get a <b>drawing set</b>. This is a small one for the conveyor starter you already know: four sheets.<br><br>Look at the box in the corner: the <b>title block</b>. It tells you the drawing number (TS-100), the <b>sheet title</b>, <b>sheet 1 of 4</b> and the <b>revision</b>, B. Read it before anything else so you know what you are holding and whether it is current.',
        hints: ['The title block is the ruled box at the bottom right.', 'Sheet title, sheet number and revision are in its cells.', 'TS-100, sheet 1 of 4, revision B.'] },
      { kind: 'say', title: 'Device tags', diagram: 'dwg1',
        text: 'Sheet 1 is the <b>device list</b>. Every device has a <b>reference tag</b>: PB1, M1, OL1. The same tag marks that device on every sheet and on a label in the panel.<br><br>The list also says which sheets show the device and where it is mounted. Select a row: the device highlights on the equipment.',
        safety: 'These tags and numbers are the convention of this training set. Other sites use other tags. Read the legend of the set in front of you.',
        hints: ['Each row is one device.', 'The third column lists the sheets that show it.', 'Click the M1 row and look at the equipment view.'] },
      { kind: 'find', title: 'Your turn: find a tag', diagram: 'dwg1', cap: 'locate',
        q: 'On sheet 1, select the row for the <b>overload relay</b>.', parts: ['L_OL1'],
        fbOk: 'Yes: OL1. The list says it appears on sheets 2, 3 and 4 and sits under M1.', fbNo: 'Not that row. Read the Device column for "overload relay".',
        hints: ['Read down the Device column.', 'Overload relays are usually tagged OL.', 'Select the row tagged OL1.'] },
      { kind: 'ask', title: 'Predict: one device, three sheets', diagram: 'dwg1',
        q: 'The device list says M1 is shown on sheets 2, 3 and 4. Why would one device appear on three sheets?',
        choices: [
          { t: 'There are three contactors called M1', fb: 'A tag identifies one device. It appears on several sheets because its parts do different jobs.' },
          { t: 'Its main contacts are in the power circuit, its coil and auxiliary contact are in the control circuit, and its terminals are on the connection sheet', ok: true, fb: 'Right. One device, drawn wherever each of its parts is used.' },
          { t: 'It is a drawing error', fb: 'It is normal. Each part of a device is drawn in the circuit it belongs to.' } ],
        hints: ['Think about what is inside a contactor.', 'Coil, main contacts and auxiliary contact do different jobs.', 'Different parts of M1 belong on different sheets.'] },
      { kind: 'say', title: 'Sheet 3: identifiers and cross-references', diagram: 'dwg3',
        text: 'Sheet 3 is the control circuit, the rung from Lesson 5 with more detail:<br>• <b>Terminal identifiers</b> at each device: 11-12 on STOP, 13-14 on START and on the M1 auxiliary contact, A1-A2 on the coil.<br>• <b>Wire identifiers</b> in the squares: 1, 2, 3.<br>• A <b>cross-reference</b> beside coil M1: its 13-14 contact is on this sheet, its main contacts are on sheet 2.<br><br>Terminal numbers repeat between devices, so always say tag and terminal together: <b>M1:13</b>, <b>PB2:13</b>.',
        sel: 'M1coil',
        hints: ['Look at the small numbers at the ends of each symbol.', 'The italic note under the coil is the cross-reference.', 'Tag + terminal identifies one point.'] },
      { kind: 'find', title: 'Your turn: follow a cross-reference', diagram: 'dwg3', cap: 'locate', concept: 'coil',
        q: 'The note beside coil M1 says its 13-14 contact is on this sheet. Select that contact.', parts: ['M1aux'],
        fbOk: 'Yes. Same tag, M1, with terminals 13-14: the auxiliary (holding) contact.', fbNo: 'Not that one. Look for a contact that carries the tag M1 and the terminals 13-14.',
        hints: ['It carries the same tag as the coil.', 'It is on the branch under START.', 'Select the contact labelled M1, 13-14.'] },
      { kind: 'try', title: 'Your turn: change sheets', diagram: 'dwg3',
        text: 'Now follow the other half of the cross-reference. Use the tabs to open <b>sheet 2</b> and select one of the <b>M1 main contacts</b>.',
        goal: function (S, R, ui) { return ui.diagram === 'dwg2' && /^M1m/.test(ui.selPart || ''); },
        done: 'There they are, in the power circuit, with a note pointing back to the coil on sheet 3. That is how you move through a drawing set: tag, cross-reference, sheet.',
        hints: ['Tabs are above the drawing.', 'Sheet 2 is the motor power circuit.', 'Open "2 · Power" and click a contact under the heading M1.'] },
      { kind: 'say', title: 'Sheet 4: terminal connections', diagram: 'dwg4',
        text: 'Sheet 4 shows terminal strip <b>TB1</b>. Each row is one terminal: on the left, the panel terminals that land there; on the right, the door or field device.<br><br>Row 3 reads: wire <b>2</b> joins <b>OL1:96</b> and <b>M1:13</b>, lands on <b>TB1-3</b>, and carries on to <b>PB2:13</b>, the START button. This is the sheet for finding where a wire physically goes.',
        hints: ['One row, one terminal.', 'The wire number is printed above each line.', 'Left = inside the panel, right = door and field.'] },
      { kind: 'find', title: 'Your turn: find a terminal', diagram: 'dwg4', cap: 'locate',
        q: 'Wire <b>1</b> comes back from the STOP button. Select the TB1 terminal it lands on.', parts: ['TB1:2'],
        fbOk: 'Yes, TB1 terminal 2. From there wire 1 continues to OL1:95.', fbNo: 'Not that terminal. Find the row whose wire number is 1.',
        hints: ['Read the WIRE column.', 'Wire 1 appears on one row only.', 'Select the TB1 box numbered 2.'] },
      { kind: 'ask', title: 'Predict: two revisions', diagram: 'dwg1',
        q: 'The copy in the panel pocket is Rev A. The one you were handed is Rev B, which adds sensor PEC1. Which do you work from?',
        choices: [
          { t: 'Rev A, because it lives in the panel', fb: 'A drawing in the panel can be out of date. Rev A does not show the sensor wiring at all.' },
          { t: 'The latest issued revision, Rev B, after confirming it is the current one', ok: true, fb: 'Right. And if the panel does not match the current drawing, that is something to report, not to guess around.' },
          { t: 'Either: revisions only change the title block', fb: 'Revisions record real changes. Sheet 1 says Rev B added PEC1 and TB1 terminals 6 to 8.' } ],
        hints: ['Read the revision table on sheet 1.', 'A later letter replaces earlier issues.', 'Rev B, once confirmed current.'] },
      { kind: 'ask', noHint: true, title: 'No-hint check (1)', diagram: 'dwg1',
        q: 'You are at the panel looking at the wire on TB1 terminal 4. Which sheet tells you which door device its other end goes to?',
        choices: [
          { t: 'Sheet 2, motor power circuit', fb: 'Sheet 2 shows the three-phase circuit. TB1-4 is a control terminal.' },
          { t: 'Sheet 3, control circuit', fb: 'Sheet 3 shows how the circuit works, but not which terminal each wire lands on.' },
          { t: 'Sheet 4, terminal connections', ok: true, fb: 'Correct. Row 4: wire 3, from M1:14 and M1:A1 to PB2:14.' } ] },
      { kind: 'ask', noHint: true, title: 'No-hint check (2)', diagram: 'dwg1',
        q: 'The motor will not start and you want to understand what has to happen for the contactor to pull in. Which sheet do you open?',
        choices: [
          { t: 'Sheet 3, control circuit', ok: true, fb: 'Correct. The control circuit shows every device that must conduct to energize coil M1.' },
          { t: 'Sheet 4, terminal connections', fb: 'Useful later for finding a terminal, but it does not show the logic.' },
          { t: 'Sheet 1, device list', fb: 'Good for looking up a tag, not for understanding the sequence.' } ] }
    ]
  });
  L.push({ id: 'LP', concept: 'nav', title: 'Drawing-to-panel challenge', short: 'Find it on the panel from the drawing', minutes: 15, station: 'panel', kind: 'panel', steps: [] });

  /* ====================================================== LESSONS 8 and 9 (special screens) */
  L.push({ id: 'L8', title: 'Troubleshooting story missions', short: 'Eight fault scenarios', minutes: 40, station: 'overview', kind: 'missions', steps: [] });
  L.push({ id: 'L9', title: 'Mock hands-on interview', short: '20-question assessment', minutes: 25, station: 'overview', kind: 'quiz', steps: [] });

  /* Core order: schematics, matching, START/STOP, drawing-to-panel, troubleshooting, interview; fluid power last. */
  var ORDER = ['L1', 'L2', 'L3', 'L4', 'L5', 'LD', 'LP', 'L6', 'L8', 'L9', 'L7'];
  L.sort(function (a, b) { return ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });
  FS.lessons = L;
  FS.lesson = function (id) { return L.filter(function (l) { return l.id === id; })[0]; };
  FS.HONEST = HONEST;

  /* Troubleshooting structure used by every mission and by the review sheet. */
  FS.METHOD = [
    ['Confirm the symptom', 'See it for yourself or get an exact description. What does it do, and what does it not do?'],
    ['Establish safe working conditions', 'Follow site procedures. Work within your training and authorization. Identify every energy source.'],
    ['Understand expected operation', 'What should happen, in what order? Use the schematic.'],
    ['Identify the relevant section of the drawing', 'Narrow it down: which circuit, which rung, which devices are in that path?'],
    ['Choose a check that separates possible causes', 'Pick the check whose result rules something in or out. Do not guess or swap parts.'],
    ['Interpret the result', 'What does the reading prove, and what does it rule out?'],
    ['Identify the likely cause', 'State it only when the evidence supports it.'],
    ['Describe proper repair and verification', 'Who repairs it, under what isolation, and how you confirm normal operation afterwards.']
  ];

  /* Study paths. `l` = lesson id, `m` = minutes, `brk` = a break. */
  FS.paths = [
    { id: 'p30', name: '30-minute emergency review', minutes: 30, blurb: 'The night before or the morning of. Only what is most likely to be asked.',
      items: [
        { l: 'L5', m: 9, note: 'START/STOP circuit: do the demo, the three predictions and the four explanations.' },
        { l: 'L3', m: 5, note: 'Workbench: NO versus NC, coil and contacts, overload, the earth/common/neutral card.' },
        { l: 'LP', m: 4, note: 'Drawing-to-panel: the first five tasks.' },
        { l: 'L8', m: 6, note: 'Two "motor will not start" cases: practice saying the eight steps.' },
        { l: 'review', m: 6, note: 'Before the Interview sheet: say the five explanations aloud.' } ] },
    { id: 'p120', name: '2-hour essentials', minutes: 120, blurb: 'Electrical essentials end to end, then a quick look at fluid power.',
      items: [
        { l: 'L1', m: 8, note: 'Which drawing answers which question.' },
        { l: 'L2', m: 12, note: 'Complete paths and the meter.' },
        { l: 'L3', m: 22, note: 'All core symbols.' },
        { l: 'L4', m: 15, note: 'Series, parallel, tracing.' },
        { brk: true, m: 5, note: 'Stand up, drink water.' },
        { l: 'L5', m: 18, note: 'The key circuit. Do every step.' },
        { l: 'LD', m: 8, note: 'Sheets, tags, cross-references.' },
        { l: 'LP', m: 8, note: 'Find devices and terminals on the panel.' },
        { l: 'L8', m: 18, note: 'The five "motor will not start" cases.' },
        { l: 'L6', m: 6, note: 'The signal chain and checkpoints.' },
        { l: 'review', m: 5, note: 'Read once, aloud.' } ] },
    { id: 'p240', name: '4-hour guided preparation', minutes: 240, blurb: 'Everything, in teaching order, with breaks. Finish with the mock interview.',
      items: [
        { l: 'L1', m: 10, note: 'Four kinds of drawing.' },
        { l: 'L2', m: 15, note: 'Basic electricity and the meter.' },
        { l: 'L3', m: 30, note: 'Workbench: every core symbol, then the optional ones.' },
        { brk: true, m: 10, note: 'Break. Away from the screen.' },
        { l: 'L4', m: 25, note: 'Ladder reading and path tracing.' },
        { l: 'L5', m: 30, note: 'START/STOP. Repeat the predictions until they are automatic.' },
        { brk: true, m: 10, note: 'Break. Say the four "why" explanations from memory.' },
        { l: 'LD', m: 12, note: 'The four-sheet drawing set.' },
        { l: 'LP', m: 12, note: 'Drawing-to-panel challenge, all ten tasks.' },
        { l: 'L6', m: 15, note: 'Sensors and PLC basics.' },
        { l: 'L8', m: 40, note: 'All ten missions, with the evidence notebook.' },
        { brk: true, m: 10, note: 'Break.' },
        { l: 'L9', m: 22, note: 'Mock interview. Repeat any lesson it recommends.' },
        { l: 'L7', m: 8, note: 'Optional: fluid power recognition.' },
        { l: 'review', m: 6, note: 'Before the Interview sheet. Print it if you can.' } ] }
  ];

  /* Five short explanations to practice aloud. */
  FS.aloud = [
    ['How a START/STOP circuit works', 'STOP and the overload contact are normally closed and in series with the contactor coil. Pressing START energizes the coil. The contactor pulls in, its main contacts run the motor, and its auxiliary contact, wired in parallel with START, keeps the coil energized when I let go. Pressing STOP or an overload trip breaks the coil circuit, and the motor stays off until START is pressed again.'],
    ['What "normally open" and "normally closed" mean', 'They describe a contact in its reference state: not pressed, not actuated, coil de-energized. That is how the drawing shows it. A normally open contact closes when the device operates; a normally closed contact opens.'],
    ['Fuse versus overload', 'Fuses and breakers protect against short circuits and high fault current and act quickly. An overload relay protects the motor from a smaller overcurrent that lasts long enough to overheat it. A motor circuit needs both, and resetting an overload does not restart the motor.'],
    ['How a sensor signal reaches an output device', 'The sensor detects the part and sends a signal to a PLC input. The program evaluates that input and turns on an output. The output energizes an interface device such as a relay, and the relay switches the load. Each of those is a separate checkpoint, and an output being on does not prove the load operated.'],
    ['My first steps when a conveyor will not start', 'I would confirm the symptom and ask what changed. I would make sure I am working safely, within site procedures and my authorization. Then I would use the schematic to understand what should happen, pick out the control circuit for that motor, and choose checks that split the possibilities: is control power present, is the overload tripped, does the contactor pull in when START is pressed. I would only name a cause once the evidence supports it.']
  ];
})(typeof window !== 'undefined' ? window : globalThis);
