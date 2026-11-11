/* FIRST SHIFT — diagram definitions (structured data).
 * Reference labels are identical in every lesson: PS1, F1, S1, S2, PL1, PL2,
 * CR1, CR2, PB1, PB2, OL1, M1, MTR1, DS1, PEC1, PLC1, SS2, SOL1, V1, CYL1. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  var sym = FS.sym;

  function W(pts, els, o) { var w = { pts: pts, els: els || [] }; for (var k in (o || {})) w[k] = o[k]; return w; }
  function P(id, s, x, y, o) { var q = { id: id, sym: s, x: x, y: y, ref: id }; for (var k in (o || {})) q[k] = o[k]; return q; }
  function T(x, y, t, cls) { return { x: x, y: y, t: t, cls: cls || '' }; }
  function TP(n, x, y, lp) { return { n: n, x: x, y: y, lp: lp || 'b' }; }

  var STYLE = 'Schematic · simplified North American ladder style';
  var RAIL_T = function (xl, xr, y) {
    return [T(xl, y - 8, 'L+', 'railt'), T(xl, y + 4, '24 VDC', 'small'), T(xr, y - 8, '0V', 'railt'), T(xr, y + 4, 'DC common', 'small')];
  };

  var LEG = {
    PS1: ['PS1', '24 VDC power supply'],
    F1: ['F1', 'Fuse (control circuit)'],
    S1: ['S1', 'Maintained switch'],
    S2: ['S2', 'Maintained switch'],
    W2: ['2', 'Wire number 2 (test points 2a and 2b are its two ends)'],
    PL1: ['PL1', 'Pilot light'],
    PL2: ['PL2', 'Pilot light, BOX PRESENT'],
    CR1: ['CR1', 'Control relay: coil and its contacts share this label'],
    CR2: ['CR2', 'Interposing relay: coil and its contacts share this label'],
    PB1: ['PB1', 'STOP pushbutton, normally closed (NC)'],
    PB2: ['PB2', 'START pushbutton, normally open (NO)'],
    OL1: ['OL1', 'Motor overload relay: thermal elements (power) and NC contact 95-96 (control)'],
    M1: ['M1', 'Motor contactor: coil A1-A2, auxiliary contact 13-14, main contacts'],
    DS1: ['DS1', 'Disconnect switch'],
    FU: ['FU1–FU3', 'Power fuses (short-circuit protection)'],
    MTR1: ['MTR1', 'Three-phase conveyor motor'],
    PE: ['PE', 'Protective earth (safety ground). Not a current return'],
    PEC1: ['PEC1', 'Photoelectric sensor, diffuse type, 3-wire'],
    PLC1: ['PLC1', 'Programmable logic controller'],
    I0: ['I0', 'PLC input terminal'],
    Q0: ['Q0', 'PLC output terminal'],
    TB1: ['TB1', 'Terminal block'],
    SS2: ['SS2', 'Selector switch RETRACT / EXTEND'],
    SOL1: ['SOL1', 'Solenoid coil on valve V1'],
    V1: ['V1', '5/2 directional control valve, solenoid operated, spring return'],
    CYL1: ['CYL1', 'Double-acting pneumatic cylinder'],
    SRC: ['▷', 'Compressed-air source'],
    SV1: ['SV1', 'Manual shutoff valve'],
    FRL1: ['FRL1', 'Filter / regulator'],
    PG1: ['PG1', 'Pressure gauge'],
    FC: ['FC1, FC2', 'Flow-control valves (speed adjustment)'],
    TPS: ['□', 'Numbered square = meter test point / wire number'],
    DOT: ['●', 'Dot = wires connected. Lines crossing without a dot are not connected']
  };
  function legend(keys) { return keys.map(function (k) { return LEG[k]; }); }

  var D = {};

  /* ------------------------------------------------------------ lamp */
  D.lamp = {
    title: 'Lamp circuit', circuit: 'lamp', vb: [0, 0, 760, 330], style: 'Schematic · simplified North American style',
    what: 'A one-loop circuit: a 24 VDC power supply (PS1), a fuse (F1), a switch (S1) and a pilot light (PL1).',
    how: 'Current can only flow when there is a complete path from L+ through every device and back to 0V. F1 protects the wiring, S1 is the control device, PL1 is the load that does the work.',
    wires: [
      W([[90, 125], [90, 80], [170, 80]], ['PL1']),
      W([[230, 80], [310, 80]], ['PL1']),
      W([[370, 80], [390, 80]], ['PL1']),
      W([[450, 80], [470, 80]], ['PL1']),
      W([[530, 80], [650, 80], [650, 260], [90, 260], [90, 215]], ['PL1'])
    ],
    parts: [
      P('PS1', 'box', 90, 170, { o: { w: 76, h: 90, t: 'PS1', t2: '24 VDC' }, comp: 'psu', noRef: true, st: function (c) { return c.S.supply ? 'OUTPUT ON' : 'OUTPUT OFF'; }, sx: 0, sy: 32 }),
      P('F1', 'fuse', 200, 80, { comp: 'fuse', el: 'F1', sub: 'fuse', stw: ['INTACT', 'OPEN'] }),
      P('S1', 'sw', 340, 80, { comp: 'selector', el: 'S1', sub: 'switch' }),
      P('W2', 'wire', 420, 80, { comp: 'wire', el: 'W2', sub: 'wire 2', noRef: true }),
      P('PL1', 'lamp', 500, 80, { comp: 'pilot', el: 'PL1', sub: 'lamp', o: { t: 'R' } })
    ],
    tps: [TP('L+', 130, 80), TP('1', 270, 80), TP('2a', 380, 80), TP('2b', 460, 80), TP('0V', 370, 260, 't')],
    texts: [T(104, 118, '+', 'pm'), T(104, 232, '−', 'pm'), T(560, 250, 'return to 0V (DC common)', 'small')],
    faults: [{ key: 'wireOpen', x: 420, y: 80, label: 'OPEN WIRE' }, { key: 'fuseOpen', part: 'F1', x: 200, y: 80, label: 'OPEN FUSE' }],
    legend: legend(['PS1', 'F1', 'S1', 'PL1', 'W2', 'TPS'])
  };

  /* ------------------------------------------------------------ ladders A–D */
  function rails(h, loads) {
    return [W([[70, 56], [70, h]], loads, { cls: 'rail' }), W([[690, 56], [690, h]], loads, { cls: 'rail', rev: true })];
  }
  D.ladA = {
    title: 'Ladder A: one switch, one lamp', circuit: 'ladA', vb: [0, 0, 760, 220], style: STYLE,
    what: 'A ladder drawing with one rung. The two vertical lines are the supply rails; the horizontal line is the rung.',
    how: 'Read a rung from left to right: if every device on the route from the L+ rail to the load is closed, the load is energized.',
    wires: rails(180, ['PL1']).concat([W([[70, 120], [190, 120]], ['PL1']), W([[250, 120], [470, 120]], ['PL1']), W([[530, 120], [690, 120]], ['PL1'])]),
    parts: [P('S1', 'sw', 220, 120, { comp: 'selector', el: 'S1' }), P('PL1', 'lamp', 500, 120, { comp: 'pilot', el: 'PL1', o: { t: 'R' } })],
    tps: [TP('L+', 70, 86, 'l'), TP('1', 360, 120), TP('0V', 690, 86, 'r')],
    texts: RAIL_T(70, 690, 40).concat([T(36, 124, 'rung 1', 'small')]),
    legend: legend(['S1', 'PL1', 'TPS'])
  };
  D.ladB = {
    title: 'Ladder B: two switches in series', circuit: 'ladB', vb: [0, 0, 760, 220], style: STYLE,
    what: 'One rung with two switches one after the other (in series) feeding a lamp.',
    how: 'Series devices form an AND condition: S1 AND S2 must both be closed to complete the path.',
    wires: rails(180, ['PL1']).concat([W([[70, 120], [170, 120]], ['PL1']), W([[230, 120], [310, 120]], ['PL1']), W([[370, 120], [490, 120]], ['PL1']), W([[550, 120], [690, 120]], ['PL1'])]),
    parts: [P('S1', 'sw', 200, 120, { comp: 'selector', el: 'S1' }), P('S2', 'sw', 340, 120, { comp: 'selector', el: 'S2' }), P('PL1', 'lamp', 520, 120, { comp: 'pilot', el: 'PL1', o: { t: 'R' } })],
    tps: [TP('L+', 70, 86, 'l'), TP('1', 270, 120), TP('2', 430, 120), TP('0V', 690, 86, 'r')],
    texts: RAIL_T(70, 690, 40).concat([T(36, 124, 'rung 1', 'small')]),
    legend: legend(['S1', 'S2', 'PL1', 'TPS'])
  };
  D.ladC = {
    title: 'Ladder C: two switches in parallel', circuit: 'ladC', vb: [0, 0, 760, 270], style: STYLE,
    what: 'One rung with two switches side by side (in parallel). Either branch can feed the lamp.',
    how: 'Parallel branches form an OR condition: S1 OR S2 closed completes a path. The dots show where the branches are connected.',
    wires: rails(230, ['PL1']).concat([
      W([[70, 120], [150, 120]], ['PL1']),
      W([[150, 120], [230, 120]], ['S1']), W([[290, 120], [370, 120]], ['S1']),
      W([[150, 120], [150, 200], [230, 200]], ['S2']), W([[290, 200], [370, 200], [370, 120]], ['S2']),
      W([[370, 120], [490, 120]], ['PL1']), W([[550, 120], [690, 120]], ['PL1'])
    ]),
    parts: [P('S1', 'sw', 260, 120, { comp: 'selector', el: 'S1' }), P('S2', 'sw', 260, 200, { comp: 'selector', el: 'S2' }), P('PL1', 'lamp', 520, 120, { comp: 'pilot', el: 'PL1', o: { t: 'R' } })],
    dots: [[150, 120], [370, 120]],
    tps: [TP('L+', 70, 86, 'l'), TP('1', 430, 120), TP('0V', 690, 86, 'r')],
    texts: RAIL_T(70, 690, 40).concat([T(36, 124, 'rung 1', 'small')]),
    legend: legend(['S1', 'S2', 'PL1', 'DOT', 'TPS'])
  };
  D.ladD = {
    title: 'Ladder D: relay coil and its contact', circuit: 'ladD', vb: [0, 0, 760, 310], style: STYLE,
    what: 'Two rungs. Rung 1 energizes relay coil CR1. Rung 2 uses a CR1 contact to switch the lamp.',
    how: 'The coil and the contact carry the same label, CR1, because they are parts of one relay. They are linked mechanically inside the relay, not by a wire on the drawing.',
    wires: rails(270, ['PL1', 'CR1']).concat([
      W([[70, 120], [190, 120]], ['CR1']), W([[250, 120], [490, 120]], ['CR1']), W([[550, 120], [690, 120]], ['CR1']),
      W([[70, 220], [190, 220]], ['PL1']), W([[250, 220], [490, 220]], ['PL1']), W([[550, 220], [690, 220]], ['PL1'])
    ]),
    parts: [
      P('S1', 'sw', 220, 120, { comp: 'selector', el: 'S1' }),
      P('CR1', 'coil', 520, 120, { comp: 'relay_coil', el: 'CR1', o: { t: 'CR1' }, noRef: true, sub: 'coil' }),
      P('CR1-1', 'no', 220, 220, { ref: 'CR1', comp: 'contact_no', el: 'CR1-1', sub: 'NO contact' }),
      P('PL1', 'lamp', 520, 220, { comp: 'pilot', el: 'PL1', o: { t: 'R' } })
    ],
    tps: [TP('L+', 70, 86, 'l'), TP('1', 370, 120), TP('2', 370, 220), TP('0V', 690, 86, 'r')],
    texts: RAIL_T(70, 690, 40).concat([T(36, 124, 'rung 1', 'small'), T(36, 224, 'rung 2', 'small'), T(520, 176, 'CR1 contact: rung 2', 'xref'), T(220, 278, '(CR1 coil: rung 1)', 'xref')]),
    legend: legend(['S1', 'CR1', 'PL1', 'TPS'])
  };

  /* ------------------------------------------------------------ start/stop starter */
  var PWR = ['L1', 'L2', 'L3'], PY = [330, 370, 410];
  var starterWires = rails(246, ['M1']).concat([
    W([[70, 120], [120, 120]], ['M1']),
    W([[180, 120], [240, 120]], ['M1']),
    W([[300, 120], [360, 120]], ['M1']),
    W([[360, 120], [390, 120]], ['PB2']), W([[450, 120], [490, 120]], ['PB2']),
    W([[360, 120], [360, 214], [390, 214]], ['M1-AUX']), W([[450, 214], [490, 214], [490, 120]], ['M1-AUX']),
    W([[490, 120], [560, 120]], ['M1']), W([[620, 120], [690, 120]], ['M1'])
  ]);
  PY.forEach(function (y, i) {
    starterWires.push(W([[70, y], [110, y]], [], { live: 'motor', cls: 'pwr' }));
    starterWires.push(W([[170, y], [220, y]], [], { live: 'motor', cls: 'pwr' }));
    starterWires.push(W([[280, y], [340, y]], [], { live: 'motor', cls: 'pwr' }));
    starterWires.push(W([[400, y], [460, y]], [], { live: 'motor', cls: 'pwr' }));
    starterWires.push(W([[520, y], [580, y]].concat(i === 1 ? [[603, y]] : [[612, i ? 388 : 352]]), [], { live: 'motor', cls: 'pwr' }));
  });
  starterWires.push(W([[634, 402], [634, 428]], [], { cls: 'pe' }));
  var starterParts = [
    P('PB1', 'pb_nc', 150, 120, { comp: 'pb_nc', el: 'PB1', sub: 'STOP' }),
    P('OL1c', 'nc', 270, 120, { ref: 'OL1', comp: 'overload', el: 'OL1', sub: '95-96' }),
    P('PB2', 'pb_no', 420, 120, { comp: 'pb_no', el: 'PB2', sub: 'START' }),
    P('M1aux', 'no', 420, 214, { ref: 'M1', comp: 'aux_contact', el: 'M1-AUX', sub: '13-14 holding' }),
    P('M1coil', 'coil', 590, 120, { ref: 'M1', comp: 'contactor_coil', el: 'M1', o: { t: 'M1' }, noRef: true, sub: 'coil A1-A2' })
  ];
  PY.forEach(function (y, i) {
    starterParts.push(P('DS1' + i, 'disc', 140, y, { ref: 'DS1', comp: 'disconnect', noRef: true, hit: [60, 36], plain: true, tag: i === 0, live: 'motor',
      st: i === 2 ? function (c) { return c.S.mains ? 'CLOSED' : 'OPEN'; } : null }));
    starterParts.push(P('FU' + i, 'fuse', 250, y, { ref: 'FU', comp: 'fuse', noRef: true, hit: [60, 36], plain: true, tag: i === 0, live: 'motor' }));
    starterParts.push(P('M1m' + i, 'no', 370, y, { ref: 'M1', comp: 'main_contacts', noRef: true, hit: [60, 36], plain: true, tag: i === 0, live: 'motor',
      st: i === 2 ? function (c) { return c.S.relay.M1 ? 'CLOSED' : 'OPEN'; } : null }));
    starterParts.push(P('OL1h' + i, 'heater', 490, y, { ref: 'OL1', comp: 'overload', noRef: true, hit: [60, 36], plain: true, tag: i === 0, live: 'motor' }));
  });
  starterParts.push(P('MTR1', 'box', 634, 370, { comp: 'motor', noRef: true, o: { w: 1, h: 1 }, hit: [72, 72], custom: 'motor', live: 'motor',
    st: function (c) { return c.flags.motor ? 'RUNNING' : 'STOPPED'; }, sx: 68, sy: 4 }));
  starterParts.push(P('PE', 'pe', 634, 446, { comp: 'earth', noRef: true, hit: [44, 40], sx: 30, sy: 4, name: 'PE' }));
  D.starter = {
    title: 'Three-wire START/STOP motor starter', circuit: 'starter', vb: [0, 0, 760, 480], style: STYLE,
    what: 'Two linked drawings. Top: the 24 VDC control circuit that decides whether contactor M1 pulls in. Bottom: the three-phase power circuit that M1 switches to run motor MTR1.',
    how: 'STOP (PB1) and the overload contact (OL1) are in series with the M1 coil. START (PB2) and the M1 auxiliary contact are in parallel. Press START: the coil energizes, the auxiliary contact closes and keeps the coil energized after START is released.',
    wires: starterWires, parts: starterParts,
    dots: [[360, 120], [490, 120]],
    tps: [TP('L+', 70, 86, 'l'), TP('1', 210, 120), TP('2', 330, 120), TP('3', 525, 120), TP('0V', 690, 86, 'r')],
    texts: RAIL_T(70, 690, 40).concat([
      T(380, 24, 'CONTROL CIRCUIT · 24 VDC', 'sect'),
      T(36, 124, 'rung 1', 'small'),
      T(590, 182, 'M1 contacts:', 'xref'), T(590, 194, 'aux 13-14 (rung 1)', 'xref'), T(590, 206, 'mains (power circuit)', 'xref'),
      T(380, 274, 'MOTOR POWER CIRCUIT · 3-PHASE · diagram only, no measurements here', 'sect'),
      T(52, 334, 'L1', 'small'), T(52, 374, 'L2', 'small'), T(52, 414, 'L3', 'small'),
      T(140, 294, 'DS1', 'ref'), T(250, 294, 'FU1–FU3', 'ref'), T(370, 294, 'M1', 'ref'), T(490, 294, 'OL1', 'ref'),
      T(370, 456, 'main contacts', 'small'), T(490, 456, 'thermal elements', 'small'), T(250, 456, 'power fuses', 'small'), T(140, 456, 'disconnect', 'small')
    ]),
    faults: [
      { key: 'stopOpen', part: 'PB1', x: 150, y: 120, label: 'CONTACT OPEN' },
      { key: 'holdOpen', part: 'M1aux', x: 478, y: 214, label: 'OPEN BRANCH' },
      { key: 'coilOpen', part: 'M1coil', x: 590, y: 120, label: 'OPEN COIL' }
    ],
    extra: function (c) {
      var run = c.flags.motor;
      return '<g class="' + (run ? 'live' : '') + '"><circle class="sy syw" cx="634" cy="370" r="32"/><text class="syt" x="634" y="368">MTR1</text><text class="syt sm" x="634" y="382">3~ motor</text></g>' +
        '<path class="mech" d="M142 322V402"/>' +
        '<text class="small" x="570" y="346">T1</text><text class="small" x="570" y="366">T2</text><text class="small" x="570" y="424">T3</text>';
    },
    legend: legend(['PB1', 'PB2', 'OL1', 'M1', 'DS1', 'FU', 'MTR1', 'PE', 'DOT', 'TPS'])
  };

  /* ------------------------------------------------------------ PLC */
  D.plc = {
    title: 'Sensor to PLC to output', circuit: 'plc', vb: [0, 0, 880, 470], style: 'Schematic · simplified North American style',
    what: 'A photoelectric sensor (PEC1) wired to PLC input I0. The PLC program turns on output Q0, which energizes interposing relay CR2. A CR2 contact switches pilot light PL2.',
    how: 'Follow the chain: field device, input, logic, output, interface device, load. Each link is a separate checkpoint when troubleshooting.',
    wires: [
      W([[40, 50], [840, 50]], ['PL2', 'CR2', 'I0'], { cls: 'rail' }),
      W([[840, 420], [40, 420]], ['PL2', 'CR2', 'I0'], { cls: 'rail' }),
      W([[155, 50], [155, 209]], [], { live: 'supply' }), W([[185, 261], [185, 420]], [], { live: 'supply' }),
      W([[204, 235], [300, 235]], ['I0']),
      W([[410, 50], [410, 120]], [], { live: 'supply' }), W([[410, 350], [410, 420]], [], { live: 'supply' }),
      W([[520, 235], [580, 235]], ['CR2']), W([[640, 235], [700, 235], [700, 420]], ['CR2']),
      W([[790, 50], [790, 120]], ['PL2']), W([[790, 180], [790, 270]], ['PL2']), W([[790, 330], [790, 420]], ['PL2'])
    ],
    parts: [
      P('PEC1', 'sensor3', 170, 235, { comp: 'photo', el: 'PEC1', o: { t: 'PEC1' }, noRef: true, hit: [76, 60], sx: -26, sy: 42, stw: ['OUTPUT ON', 'OUTPUT OFF'] }),
      P('PLC1', 'box', 410, 142, { comp: 'plc_in', o: { w: 120, h: 30, t: 'PLC1' }, noRef: true, hit: [124, 34], noSt: true, name: 'PLC1' }),
      P('I0', 'plc_in', 330, 235, { phys: 'PLC1', comp: 'plc_in', el: 'I0', o: { t: 'I0' }, noRef: true, sub: 'input', sx: 12 }),
      P('Q0', 'plc_out', 490, 235, { phys: 'PLC1', comp: 'plc_out', el: 'Q0', o: { t: 'Q0' }, noRef: true, sub: 'output', sx: -12, stw: ['ON', 'OFF'] }),
      P('CR2', 'coil', 610, 235, { comp: 'relay_coil', el: 'CR2', o: { t: 'CR2' }, noRef: true, sub: 'coil' }),
      P('CR2-1', 'no', 790, 150, { ref: 'CR2', comp: 'contact_no', el: 'CR2-1', rot: 90, sub: 'NO contact' }),
      P('PL2', 'lamp', 790, 300, { comp: 'pilot', el: 'PL2', rot: 90, o: { t: 'G' }, sub: 'BOX PRESENT' })
    ],
    tps: [TP('L+', 70, 50, 't'), TP('I0', 252, 235), TP('Q0', 550, 235), TP('5', 790, 225, 'l'), TP('0V', 70, 420, 'b')],
    texts: [
      T(100, 40, 'L+  24 VDC', 'railt'), T(118, 440, '0V  DC common', 'railt'),
      T(143, 140, 'BN +', 'small'), T(203, 340, 'BU −', 'small'), T(252, 222, 'BK signal', 'small'),
      T(120, 290, '1 · FIELD DEVICE', 'chk'), T(334, 290, '2 · INPUT', 'chk'), T(410, 290, '3 · LOGIC', 'chk'), T(484, 290, '4 · OUTPUT', 'chk'),
      T(610, 290, '5 · INTERFACE', 'chk'), T(838, 340, '6 · LOAD', 'chk'),
      T(410, 320, 'Program instructions are evaluated by the PLC.', 'xref'), T(410, 332, 'They are not physical contacts.', 'xref')
    ],
    faults: [{ key: 'misaligned', part: 'PEC1', x: 120, y: 200, label: 'MISALIGNED' }],
    extra: function (c) {
      var S = c.S, mis = S.faults.misaligned && c.reveal, on = S.plc.I0, q = S.plc.Q0;
      var beamY = mis ? 196 : 235;
      var s = '<rect class="plcbox" x="300" y="120" width="220" height="230" rx="4"/>';
      s += '<path class="conv" d="M40 262H126"/>';
      if (S.box) s += '<rect class="boxg" x="52" y="216" width="40" height="44"/><text class="small" x="72" y="242">box</text>';
      else s += '<text class="small" x="76" y="250">no box</text>';
      s += '<path class="beam' + (c.el('PEC1').closed ? ' hit' : '') + '" d="M136 235 L' + (S.box && !mis ? 92 : 44) + ' ' + beamY + '"/>';
      // logic rung inside the PLC
      s += '<g class="logic' + (on ? ' live' : '') + '"><path class="sy" d="M362 235H388 M400 235H428 M388 225V245 M400 225V245 M428 235 M452 235H458"/>' +
        '<path class="sy" d="M432 225 Q426 235 432 245 M448 225 Q454 235 448 245"/>' +
        '<text class="syt sm" x="394" y="218">I0</text><text class="syt sm" x="440" y="218">Q0</text>' +
        '<text class="small" x="410" y="262">' + (on ? 'TRUE' : 'FALSE') + '</text></g>';
      s += '<rect class="led' + (on ? ' on' : '') + '" x="324" y="196" width="10" height="10"/><text class="small" x="352" y="205">' + (on ? 'LED on' : 'LED off') + '</text>';
      s += '<rect class="led' + (q ? ' on' : '') + '" x="486" y="196" width="10" height="10"/><text class="small" x="466" y="205">' + (q ? 'LED on' : 'LED off') + '</text>';
      s += '<rect class="led' + (S.supply ? ' on' : '') + '" x="142" y="191" width="8" height="8"/><text class="small" x="174" y="199">' + (S.supply ? 'power' : 'no power') + '</text>';
      return s;
    },
    legend: legend(['PEC1', 'PLC1', 'I0', 'Q0', 'CR2', 'PL2', 'TPS'])
  };

  /* ------------------------------------------------------------ pneumatic */
  D.pneu = {
    title: 'Pneumatic cylinder circuit', circuit: 'pneu', vb: [0, 0, 880, 480], style: 'Fluid power · simplified ISO 1219 style  +  electrical rung (North American style)',
    what: 'Left: a pneumatic circuit. Air goes through shutoff SV1 and filter/regulator FRL1 to valve V1, which steers it to one end of cylinder CYL1. Right: the small electrical rung that energizes solenoid SOL1.',
    how: 'The valve symbol has two boxes, one per position. The spring holds the right-hand box in line with the ports (rest position): air goes 1 to 2 and the cylinder stays retracted. When SOL1 energizes, the left-hand box slides into line: air goes 1 to 4 and the cylinder extends.',
    wires: [
      W([[76, 400], [100, 400]], [], { cls: 'fluid', live: 'p0' }),
      W([[160, 400], [180, 400]], [], { cls: 'fluid', live: 'p' }),
      W([[240, 400], [335, 400], [335, 310]], [], { cls: 'fluid', live: 'p' }),
      W([[280, 400], [280, 386]], [], { cls: 'fluid', live: 'p' }),
      W([[317, 250], [317, 190], [246, 190]], [], { cls: 'fluid', live: 'pA' }), W([[186, 190], [115, 190], [115, 110]], [], { cls: 'fluid', live: 'pA' }),
      W([[353, 250], [353, 210]], [], { cls: 'fluid', live: 'pB' }), W([[353, 150], [353, 110]], [], { cls: 'fluid', live: 'pB' }),
      W([[670, 96], [670, 200]], ['SOL1'], { cls: 'rail' }), W([[850, 96], [850, 200]], ['SOL1'], { cls: 'rail', rev: true }),
      W([[670, 150], [690, 150]], ['SOL1']), W([[750, 150], [770, 150]], ['SOL1']), W([[830, 150], [850, 150]], ['SOL1'])
    ],
    parts: [
      P('SRC', 'air_src', 60, 400, { comp: 'air_src', noRef: true, sub: 'air supply', hit: [44, 40], noSt: true, name: 'Air source' }),
      P('SV1', 'shutoff', 130, 400, { comp: 'shutoff', sub: 'shutoff', st: function (c) { return c.S.air ? 'OPEN' : 'CLOSED'; } }),
      P('FRL1', 'frl', 210, 400, { comp: 'frl', sub: 'filter/regulator', noSt: true }),
      P('PG1', 'gauge', 280, 374, { comp: 'gauge', noRef: true, hit: [40, 44], sx: 28, sy: -10, st: function (c) { return c.flags.bar + ' bar'; }, name: 'PG1' }),
      P('FC1', 'flow', 216, 190, { comp: 'flow_ctrl', hit: [60, 40], noSt: true, phys: 'FC' }),
      P('FC2', 'flow', 353, 180, { comp: 'flow_ctrl', hit: [60, 40], noSt: true, rot: 90, phys: 'FC' }),
      P('V1', 'box', 335, 280, { comp: 'dcv', o: { w: 1, h: 1 }, noRef: true, hit: [150, 70], custom: 'valve', noSt: true, name: 'V1' }),
      P('CYL1', 'box', 240, 90, { comp: 'cyl_da', o: { w: 1, h: 1 }, noRef: true, hit: [292, 50], custom: 'cyl', noSt: true, name: 'CYL1' }),
      P('SS2', 'sel', 720, 150, { comp: 'selector', el: 'SS2', sub: 'EXTEND' }),
      P('SOL1', 'sol', 800, 150, { comp: 'solenoid', el: 'SOL1', sub: 'solenoid' })
    ],
    dots: [[280, 400]],
    tps: [TP('L+', 670, 116, 'l'), TP('1', 760, 150), TP('0V', 850, 116, 'r')],
    texts: [
      T(300, 30, 'PNEUMATIC CIRCUIT · compressed air', 'sect'), T(760, 30, 'ELECTRICAL · 24 VDC', 'sect'),
      T(670, 82, 'L+', 'railt'), T(850, 82, '0V', 'railt'),
      T(760, 230, 'SOL1 is the solenoid drawn', 'xref'), T(760, 242, 'on valve V1 (same device).', 'xref'),
      T(308, 244, '4', 'port'), T(362, 244, '2', 'port'), T(300, 323, '5', 'port'), T(344, 323, '1', 'port'), T(370, 323, '3', 'port'),
      T(120, 60, 'CYL1', 'ref'), T(420, 240, 'V1', 'ref'), T(250, 366, 'PG1', 'ref')
    ],
    faults: [{ key: 'airOff', x: 76, y: 372, label: 'NO AIR SUPPLY' }],
    extra: function (c) {
      var f = c.flags, pos = c.S.cyl, px = 125 + pos * 190, dx = f.act ? 70 : 0, s = '';
      s += '<path class="divider" d="M640 20V460"/>';
      // cylinder
      s += '<rect class="sy fl syw" x="100" y="70" width="280" height="40"/>';
      s += '<rect class="chamber' + (f.pA ? ' press' : '') + '" x="101" y="71" width="' + Math.max(0, px - 106) + '" height="38"/>';
      s += '<rect class="chamber' + (f.pB ? ' press' : '') + '" x="' + (px + 5) + '" y="71" width="' + Math.max(0, 379 - px - 5) + '" height="38"/>';
      s += '<rect class="piston" x="' + (px - 5) + '" y="71" width="10" height="38"/><rect class="rod" x="' + (px + 5) + '" y="86" width="265" height="8"/>';
      s += '<text class="small" x="240" y="128">' + (pos > 0.97 ? 'EXTENDED' : pos < 0.03 ? 'RETRACTED' : 'MOVING') + '</text>';
      // valve: boxes slide, ports stay
      s += '<g transform="translate(' + dx + ',0)" class="valve">' +
        '<rect class="sy fl syw' + (f.act ? ' act' : '') + '" x="230" y="250" width="70" height="60"/><rect class="sy fl syw' + (f.act ? '' : ' act') + '" x="300" y="250" width="70" height="60"/>' +
        '<path class="sy fl" d="M265 310 L247 250 M247 250 l-2 9 M247 250 l7 6 M283 250 L288 310 M288 310 l-6 -7 M288 310 l4 -8 M242 310v-10 M236 300h12"/>' +
        '<path class="sy fl" d="M335 310 L353 250 M353 250 l2 9 M353 250 l-7 6 M317 250 L312 310 M312 310 l6 -7 M312 310 l-4 -8 M358 310v-10 M352 300h12"/>' +
        '<rect class="sy fl syw solbox' + (f.act ? ' live' : '') + '" x="200" y="266" width="30" height="28"/><path class="sy fl" d="M200 294 L230 266"/>' +
        '<text class="small" x="215" y="258">SOL1</text></g>';
      s += '<path class="sy fl" d="' + FS.sym.zig(370 + dx, 470, 280, 8, f.act ? 2 : 4) + ' M470 262V298"/>';
      s += '<text class="small" x="446" y="322">spring</text>';
      s += '<g transform="translate(312,310)">' + sym.draw('exhaust') + '</g><g transform="translate(358,310)">' + sym.draw('exhaust') + '</g>';
      s += '<text class="small" x="500" y="350">' + (f.act ? 'V1 position: actuated (1→4, 2→3)' : 'V1 position: rest (1→2, 4→5)') + '</text>';
      return s;
    },
    legend: legend(['SRC', 'SV1', 'FRL1', 'PG1', 'V1', 'FC', 'CYL1', 'SS2', 'SOL1', 'TPS'])
  };

  /* ------------------------------------------------------------ four views of the lamp system */
  D.view_wiring = {
    title: 'Wiring diagram: lamp system', circuit: 'lamp', vb: [0, 0, 760, 360], style: 'Wiring (connection) diagram · terminal-to-terminal',
    what: 'A wiring diagram shows each device roughly as it is built, with numbered terminals, and every wire drawn from terminal to terminal.',
    how: 'Use it to find or check a physical connection: for example, wire 1 runs from F1 terminal 2 to S1 terminal 13.',
    wires: [
      W([[166, 100], [249, 100]], ['PL1']), W([[331, 100], [427, 100]], ['PL1']), W([[513, 100], [607, 100]], ['PL1']),
      W([[693, 100], [724, 100], [724, 220], [440, 220], [440, 277]], ['PL1']),
      W([[360, 277], [360, 220], [200, 220], [200, 140], [166, 140]], ['PL1'])
    ],
    parts: [
      P('PS1', 'box', 110, 120, { o: { w: 110, h: 90, t: 'PS1', t2: '24 VDC supply' }, comp: 'psu', noRef: true, noSt: true }),
      P('F1', 'box', 290, 100, { o: { w: 80, h: 46, t: 'F1', t2: 'fuse holder' }, comp: 'fuse', noRef: true, noSt: true }),
      P('S1', 'box', 470, 100, { o: { w: 84, h: 50, t: 'S1', t2: 'switch' }, comp: 'selector', noRef: true, noSt: true }),
      P('PL1', 'box', 650, 100, { o: { w: 84, h: 50, t: 'PL1', t2: 'pilot light' }, comp: 'pilot', noRef: true, noSt: true }),
      P('TB1', 'box', 400, 300, { o: { w: 220, h: 44, t: 'TB1', t2: 'terminal block' }, comp: 'terminal', noRef: true, noSt: true })
    ],
    texts: [
      T(207, 92, 'L+', 'wnum'), T(379, 92, '1', 'wnum'), T(560, 92, '2', 'wnum'), T(600, 212, '0V', 'wnum'), T(280, 212, '0V', 'wnum'),
      T(180, 92, '+V', 'term'), T(180, 156, '−V', 'term'), T(240, 118, '1', 'term'), T(340, 118, '2', 'term'),
      T(418, 118, '13', 'term'), T(522, 118, '14', 'term'), T(598, 118, 'X1', 'term'), T(703, 118, 'X2', 'term'),
      T(360, 270, '1', 'term'), T(440, 270, '2', 'term'), T(400, 340, 'terminals 1 and 2 are linked by a jumper bar', 'small')
    ],
    extra: function () {
      var s = '';
      [[166, 100], [166, 140], [249, 100], [331, 100], [427, 100], [513, 100], [607, 100], [693, 100], [360, 277], [440, 277]].forEach(function (q) {
        s += '<circle class="sy syw" cx="' + q[0] + '" cy="' + q[1] + '" r="4"/>';
      });
      return s + '<path class="sy" d="M360 286H440" style="stroke-width:5"/>';
    },
    legend: legend(['PS1', 'F1', 'S1', 'PL1', 'TB1'])
  };
  D.view_layout = {
    title: 'Physical layout: lamp system', circuit: 'lamp', vb: [0, 0, 760, 360], style: 'Physical layout drawing · where things are mounted',
    what: 'A layout drawing shows where each component is mounted. It tells you nothing about how the devices are connected.',
    how: 'Use it to find a device on the real machine: PS1 and F1 are on the rail inside the enclosure, S1 and PL1 are on the door.',
    wires: [],
    parts: [
      P('PS1', 'box', 140, 115, { o: { w: 110, h: 80, t: 'PS1' }, comp: 'psu', noRef: true, noSt: true }),
      P('F1', 'box', 240, 115, { o: { w: 44, h: 60, t: 'F1' }, comp: 'fuse', noRef: true, noSt: true }),
      P('TB1', 'box', 250, 285, { o: { w: 260, h: 40, t: 'TB1' }, comp: 'terminal', noRef: true, noSt: true }),
      P('S1', 'box', 620, 140, { o: { w: 64, h: 64, t: 'S1' }, comp: 'selector', noRef: true, noSt: true }),
      P('PL1', 'box', 620, 250, { o: { w: 64, h: 64, t: 'PL1' }, comp: 'pilot', noRef: true, noSt: true })
    ],
    texts: [T(250, 30, 'ENCLOSURE · back panel', 'sect'), T(620, 30, 'DOOR · front', 'sect'), T(250, 205, 'wire duct', 'small'), T(400, 160, 'DIN rail', 'small')],
    extra: function () {
      return '<rect class="outline" x="40" y="44" width="430" height="290" rx="4"/><rect class="outline" x="520" y="44" width="200" height="290" rx="4"/>' +
        '<path class="mech" d="M60 150H450"/><rect class="duct" x="60" y="190" width="390" height="24"/>';
    },
    legend: legend(['PS1', 'F1', 'S1', 'PL1', 'TB1'])
  };
  D.view_block = {
    title: 'Block diagram: lamp system', circuit: 'lamp', vb: [0, 0, 760, 240], style: 'Block diagram · major functional sections',
    what: 'A block diagram shows the big functional sections and the direction things flow. It leaves out individual wires and terminals.',
    how: 'Use it to get the overview first: supply, protection, control, load.',
    wires: [],
    parts: [
      P('PS1', 'box', 110, 120, { o: { w: 130, h: 64, t: 'PS1', t2: 'Power supply' }, comp: 'psu', noRef: true, noSt: true }),
      P('F1', 'box', 290, 120, { o: { w: 130, h: 64, t: 'F1', t2: 'Protection' }, comp: 'fuse', noRef: true, noSt: true }),
      P('S1', 'box', 470, 120, { o: { w: 130, h: 64, t: 'S1', t2: 'Control' }, comp: 'selector', noRef: true, noSt: true }),
      P('PL1', 'box', 650, 120, { o: { w: 130, h: 64, t: 'PL1', t2: 'Load' }, comp: 'pilot', noRef: true, noSt: true })
    ],
    texts: [],
    extra: function () {
      return [175, 355, 535].map(function (x) { return '<path class="arrow" d="M' + x + ' 120H' + (x + 46) + ' M' + (x + 38) + ' 113 l9 7 l-9 7"/>'; }).join('');
    },
    legend: legend(['PS1', 'F1', 'S1', 'PL1'])
  };

  FS.diagrams = D;
  FS.LEG = LEG;
})(typeof window !== 'undefined' ? window : globalThis);
