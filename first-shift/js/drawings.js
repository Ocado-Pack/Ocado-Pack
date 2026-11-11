/* FIRST SHIFT — training drawing set TS-100 (four sheets, one small machine).
 * Sheet 1 legend and device list, sheet 2 motor power circuit, sheet 3 control
 * circuit, sheet 4 terminal connections. Sheets 2 and 3 are the same circuit
 * data as the lesson starter drawing, so they stay live with the simulation.
 * Titles, revision letters, tags, wire and terminal identifiers follow the
 * documented convention of this training set only. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  var D = FS.diagrams, st = D.starter, PN = FS.panel;
  function P(id, s, x, y, o) { var q = { id: id, sym: s, x: x, y: y, ref: id }; for (var k in (o || {})) q[k] = o[k]; return q; }
  function T(x, y, t, cls) { return { x: x, y: y, t: t, cls: cls || '' }; }
  function maxY(w) { return Math.max.apply(null, w.pts.map(function (p) { return p[1]; })); }
  var SHEETS = ['', 'DEVICE LIST', 'POWER CIRCUIT', 'CONTROL CIRCUIT', 'TERMINALS'];
  function titleBlock(x, y, n) {
    return '<g class="tblock"><rect class="outline" x="' + x + '" y="' + y + '" width="318" height="48"/>' +
      '<path class="mech" style="stroke-dasharray:none" d="M' + x + ' ' + (y + 17) + 'h318M' + (x + 96) + ' ' + (y + 17) + 'v31M' + (x + 196) + ' ' + (y + 17) + 'v31M' + (x + 262) + ' ' + (y + 17) + 'v31"/>' +
      '<text class="small" style="text-anchor:start" x="' + (x + 6) + '" y="' + (y + 12) + '">FIRST SHIFT TRAINING SET · CONVEYOR 1 MOTOR STARTER</text>' +
      '<text class="small" style="text-anchor:start" x="' + (x + 6) + '" y="' + (y + 29) + '">Drawing no.</text><text class="railt" style="text-anchor:start" x="' + (x + 6) + '" y="' + (y + 43) + '">TS-100</text>' +
      '<text class="small" style="text-anchor:start" x="' + (x + 102) + '" y="' + (y + 29) + '">Sheet title</text><text class="xref" style="text-anchor:start;font-style:normal;font-weight:700" x="' + (x + 102) + '" y="' + (y + 43) + '">' + SHEETS[n].slice(0, 15) + '</text>' +
      '<text class="small" style="text-anchor:start" x="' + (x + 202) + '" y="' + (y + 29) + '">Sheet</text><text class="railt" style="text-anchor:start" x="' + (x + 202) + '" y="' + (y + 43) + '">' + n + ' of 4</text>' +
      '<text class="small" style="text-anchor:start" x="' + (x + 268) + '" y="' + (y + 29) + '">Revision</text><text class="railt" style="text-anchor:start" x="' + (x + 268) + '" y="' + (y + 43) + '">B</text></g>';
  }
  var STYLE = 'Training drawing set TS-100 · simplified North American style';
  function leg(keys) { return keys.map(function (k) { return FS.LEG[k]; }); }

  /* ---------------------------------------------------------------- sheet 3: control circuit */
  D.dwg3 = {
    title: 'TS-100 sheet 3 of 4 · Control circuit · Rev B', circuit: 'starter', vb: [0, 0, 760, 330], style: STYLE, sheet: 3,
    what: 'Sheet 3 of the training drawing set: the 24 VDC control circuit that energizes contactor coil M1.',
    how: 'Read the title block first (sheet title, sheet number, revision). Then read the rung left to right. The note beside coil M1 is a cross-reference: it tells you on which sheets the M1 contacts appear.',
    wires: st.wires.filter(function (w) { return maxY(w) < 252; }),
    parts: st.parts.filter(function (p) { return p.y < 252; }),
    dots: st.dots, tps: st.tps,
    texts: st.texts.filter(function (t) { return t.y < 252 && t.cls !== 'xref' && t.cls !== 'sect'; }).concat([
      T(380, 24, 'CONTROL CIRCUIT · 24 VDC', 'sect'),
      T(126, 112, '11', 'term'), T(174, 112, '12', 'term'), T(396, 112, '13', 'term'), T(444, 112, '14', 'term'), T(566, 112, 'A1', 'term'), T(614, 112, 'A2', 'term'),
      T(590, 182, 'M1 contacts:', 'xref'), T(590, 194, '13-14 NO: this sheet, rung 1', 'xref'), T(590, 206, 'L1-T1 … L3-T3: sheet 2', 'xref'),
      T(190, 262, 'L+ is fused 24 VDC from PS1 through F1. Terminals: sheet 4.', 'xref')
    ]),
    faults: st.faults,
    extra: function () { return titleBlock(434, 274, 3); },
    legend: leg(['PB1', 'PB2', 'OL1', 'M1', 'DOT', 'TPS'])
  };

  /* ---------------------------------------------------------------- sheet 2: power circuit */
  D.dwg2 = {
    title: 'TS-100 sheet 2 of 4 · Motor power circuit · Rev B', circuit: 'starter', vb: [0, 252, 760, 290], style: STYLE, sheet: 2,
    what: 'Sheet 2 of the training drawing set: the three-phase power circuit from the supply to motor MTR1. Diagram only: there are no measurement points here.',
    how: 'Power flows left to right: disconnect DS1, fuses FU1–FU3, the M1 main contacts, the OL1 thermal elements, then the motor. The notes under M1 and OL1 point to the sheet where their control parts are drawn.',
    wires: st.wires.filter(function (w) { return maxY(w) > 252; }),
    parts: st.parts.filter(function (p) { return p.y > 252; }),
    texts: st.texts.filter(function (t) { return t.y > 252; }).concat([
      T(370, 470, 'coil M1: sheet 3, rung 1', 'xref'), T(490, 484, 'contact OL1 95-96: sheet 3, rung 1', 'xref')
    ]),
    extra: function (c) { return st.extra(c) + titleBlock(434, 488, 2); },
    legend: leg(['DS1', 'FU', 'M1', 'OL1', 'MTR1', 'PE'])
  };

  /* ---------------------------------------------------------------- sheet 1: legend and device list */
  var LIST = [
    ['PS1', '24 VDC control power supply (+V, −V)', '4', 'Panel, top rail', 'psu'],
    ['F1', 'Control circuit fuse (1, 2)', '4', 'Panel, top rail', 'fuse'],
    ['PB1', 'STOP pushbutton, NC (11-12)', '3, 4', 'Door', 'pb_nc'],
    ['PB2', 'START pushbutton, NO (13-14)', '3, 4', 'Door', 'pb_no'],
    ['M1', 'Motor contactor: coil A1-A2, aux 13-14, mains', '2, 3, 4', 'Panel, middle rail', 'contactor_coil'],
    ['OL1', 'Overload relay: elements, contact 95-96', '2, 3, 4', 'Panel, under M1', 'overload'],
    ['DS1', 'Disconnect switch', '2', 'Door', 'disconnect'],
    ['FU', 'Power fuses FU1–FU3', '2', 'Panel', 'fuse'],
    ['MTR1', 'Conveyor motor, three-phase', '2', 'Conveyor', 'motor'],
    ['TB1', 'Terminal strip, terminals 1–8', '4', 'Panel, bottom rail', 'terminal'],
    ['PEC1', 'Photoelectric sensor (BN, BK, BU)', '4', 'Conveyor', 'photo'],
    ['PLC1', 'PLC: input I0, output Q0', '4', 'Panel, top rail', 'plc_in'],
    ['CR2', 'Interposing relay, coil A1-A2', '4', 'Panel, top rail', 'relay_coil']
  ];
  D.dwg1 = {
    title: 'TS-100 sheet 1 of 4 · Legend and device list · Rev B', circuit: 'starter', vb: [0, 0, 760, 440], style: STYLE, sheet: 1,
    what: 'Sheet 1 of the training drawing set: every device tag used in the set, what it is, which sheets show it and where it is mounted.',
    how: 'Start here when you meet an unfamiliar tag. Find the tag, read the description, then go to the sheet listed. The revision table tells you what changed between issues.',
    wires: [],
    parts: LIST.map(function (r, i) { return P('L_' + r[0], 'row', 380, 62 + i * 22, { ref: r[0], comp: r[4], hit: [724, 20], noRef: true, noSt: true, name: r[0] }); }),
    texts: [T(380, 24, 'DEVICE LIST', 'sect')],
    extra: function () {
      var s = '<path class="mech" style="stroke-dasharray:none" d="M18 48H742"/>', a = 'style="text-anchor:start"';
      s += '<text class="chk" ' + a + ' x="26" y="42">TAG</text><text class="chk" ' + a + ' x="100" y="42">DEVICE</text><text class="chk" ' + a + ' x="450" y="42">SHOWN ON SHEET</text><text class="chk" ' + a + ' x="580" y="42">LOCATION</text>';
      LIST.forEach(function (r, i) {
        var y = 66 + i * 22;
        s += '<text class="ref" ' + a + ' x="26" y="' + y + '">' + (r[0] === 'FU' ? 'FU1–3' : r[0]) + '</text><text class="small" ' + a + ' x="100" y="' + y + '">' + r[1] + '</text><text class="small" ' + a + ' x="450" y="' + y + '">' + r[2] + '</text><text class="small" ' + a + ' x="580" y="' + y + '">' + r[3] + '</text>';
      });
      s += '<text class="chk" ' + a + ' x="26" y="372">REVISIONS</text><text class="small" ' + a + ' x="26" y="388">Rev A · first issue (starter only).</text><text class="small" ' + a + ' x="26" y="402">Rev B · sensor PEC1, PLC1 and TB1 terminals 6–8 added. Current issue.</text>' +
        '<text class="xref" ' + a + ' x="26" y="422">Always work from the latest issued revision. Tags and numbering apply to this training set only.</text>';
      return s + titleBlock(434, 364, 1);
    },
    legend: [['TAG', 'Device reference tag: the same tag marks the device on every sheet and on the panel'], ['Rev', 'Revision letter: a later letter replaces earlier issues']]
  };

  /* ---------------------------------------------------------------- sheet 4: terminal connections */
  var FIELD = { PB1: ['pb_nc', 'STOP · door', [0, 1]], PB2: ['pb_no', 'START · door', [2, 3]], PEC1: ['photo', 'sensor · conveyor', [5, 6, 7]] };
  function rowY(i) { return 78 + i * 34; }
  var parts4 = PN.TB.map(function (t, i) { return P('TB1:' + t.n, 'box', 380, rowY(i), { ref: 'TB1', comp: 'terminal', o: { w: 52, h: 26, t: String(t.n) }, noRef: true, noSt: true, name: 'TB1 terminal ' + t.n }); });
  Object.keys(FIELD).forEach(function (k) {
    var f = FIELD[k], y0 = rowY(f[2][0]), y1 = rowY(f[2][f[2].length - 1]);
    parts4.push(P(k, 'box', 668, (y0 + y1) / 2, { comp: f[0], o: { w: 120, h: y1 - y0 + 28, t: k, t2: f[1] }, noRef: true, noSt: true }));
  });
  D.dwg4 = {
    title: 'TS-100 sheet 4 of 4 · Terminal connections · Rev B', circuit: 'starter', vb: [0, 0, 760, 420], style: 'Training drawing set TS-100 · terminal connection diagram', sheet: 4,
    what: 'Sheet 4 of the training drawing set: terminal strip TB1. Each row shows which panel terminals, which wire number and which door or field device meet at one TB1 terminal.',
    how: 'Read one row at a time. Example, row 3: wire 2 joins OL1:96 and M1:13 on the panel side, lands on TB1 terminal 3, and continues to START button terminal 13. Always quote device tag and terminal together, because terminal numbers repeat on different devices.',
    wires: [], parts: parts4,
    texts: [T(170, 44, 'PANEL SIDE (device : terminal)', 'chk'), T(304, 44, 'WIRE', 'chk'), T(380, 44, 'TB1', 'chk'), T(456, 44, 'WIRE', 'chk'), T(600, 44, 'DOOR / FIELD SIDE', 'chk'),
      T(216, 380, 'Terminal numbers repeat between devices:', 'xref'), T(216, 393, 'M1:13 and PB2:13 are different points.', 'xref')],
    extra: function () {
      var s = '';
      PN.TB.forEach(function (t, i) {
        var y = rowY(i);
        s += '<text class="small" style="text-anchor:end" x="250" y="' + (y + 3) + '">' + t.panel.map(PN.show).join('  ·  ') + '</text>' +
          '<path class="sy" d="M258 ' + y + 'H354"/><text class="wnum" x="304" y="' + (y - 5) + '">' + t.wire + '</text>';
        if (t.field) s += '<path class="sy" d="M406 ' + y + 'H608"/><text class="wnum" x="456" y="' + (y - 5) + '">' + t.wire + '</text><text class="term" x="590" y="' + (y - 5) + '">' + t.field.split(':')[1] + '</text>';
        else s += '<text class="small" style="text-anchor:start" x="414" y="' + (y + 3) + '">no field connection (panel 0V link)</text>';
      });
      return s + titleBlock(434, 364, 4);
    },
    legend: leg(['TB1', 'PB1', 'PB2', 'PEC1']).concat([['wire', 'Wire identifier: the same number on every end of one conductor']])
  };
})(typeof window !== 'undefined' ? window : globalThis);
