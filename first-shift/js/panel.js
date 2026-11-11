/* FIRST SHIFT — training panel: one wiring dataset used by the panel
 * inspection view, the terminal-connection drawing (sheet 4) and the
 * drawing-to-panel tasks. Terminal numbers and wire identifiers here are the
 * documented convention of THIS training drawing set only. Real panels use
 * their own numbering: read their drawings.
 * The panel view is a simulated learning view. Identifying a part here does
 * not authorize touching or testing real energized equipment. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function show(id) { return id.replace('-V', '−V'); }

  /* Terminal strip TB1: wire, panel-side terminals, field-side terminal. */
  var TB = [
    { n: 1, wire: 'L+', panel: ['F1:2'], field: 'PB1:11' },
    { n: 2, wire: '1', panel: ['OL1:95'], field: 'PB1:12' },
    { n: 3, wire: '2', panel: ['OL1:96', 'M1:13'], field: 'PB2:13' },
    { n: 4, wire: '3', panel: ['M1:14', 'M1:A1'], field: 'PB2:14' },
    { n: 5, wire: '0V', panel: ['M1:A2', 'PS1:-V'], field: null },
    { n: 6, wire: 'I0', panel: ['PLC1:I0'], field: 'PEC1:BK' },
    { n: 7, wire: 'L+', panel: ['F1:2'], field: 'PEC1:BN' },
    { n: 8, wire: '0V', panel: ['PS1:-V'], field: 'PEC1:BU' }
  ];
  /* Every wire identifier and the terminals it joins (panel side). */
  var WIRES = { '24V': ['PS1:+V', 'F1:1'], 'Q0': ['PLC1:Q0', 'CR2:A1'], 'L+': ['PLC1:L+'], '0V': ['PLC1:0V', 'CR2:A2'] };
  TB.forEach(function (t) {
    var w = WIRES[t.wire] = WIRES[t.wire] || [];
    t.panel.concat(['TB1:' + t.n]).forEach(function (e) { if (w.indexOf(e) < 0) w.push(e); });
  });
  var WIRE_ORDER = ['24V', 'L+', '1', '2', '3', '0V', 'I0', 'Q0'];
  function wireOf(term) {
    for (var k in WIRES) if (WIRES[k].indexOf(term) >= 0) return k;
    var f = TB.filter(function (t) { return t.field === term; })[0];
    return f ? f.wire : null;
  }

  /* ------------------------------------------------ geometry of the inspection view */
  var DEV = {
    PS1: { x: 28, y: 44, w: 92, h: 58, name: 'Power supply', sub: '24 VDC' },
    F1: { x: 138, y: 44, w: 40, h: 58, name: 'Fuse' },
    CR2: { x: 196, y: 44, w: 56, h: 58, name: 'Relay' },
    PLC1: { x: 270, y: 44, w: 110, h: 58, name: 'PLC', sub: 'I/O' },
    M1: { x: 40, y: 152, w: 110, h: 70, name: 'Contactor' },
    OL1: { x: 40, y: 226, w: 110, h: 44, name: 'Overload relay' },
    TB1: { x: 34, y: 326, w: 332, h: 56, name: 'Terminal strip' },
    PB1: { x: 28, y: 474, w: 84, h: 56, name: 'STOP', field: true },
    PB2: { x: 126, y: 474, w: 84, h: 56, name: 'START', field: true },
    PEC1: { x: 236, y: 474, w: 110, h: 56, name: 'Photoelectric sensor', field: true }
  };
  var DUCT = { A: 125, B: 300 }, SIDE = 22;
  var T = {
    'PS1:+V': { x: 52, y: 102, d: 'A' }, 'PS1:-V': { x: 96, y: 102, d: 'A' },
    'F1:1': { x: 149, y: 102, d: 'A' }, 'F1:2': { x: 167, y: 102, d: 'A' },
    'CR2:A1': { x: 210, y: 102, d: 'A' }, 'CR2:A2': { x: 238, y: 102, d: 'A' },
    'PLC1:L+': { x: 286, y: 102, d: 'A' }, 'PLC1:0V': { x: 310, y: 102, d: 'A' }, 'PLC1:I0': { x: 338, y: 102, d: 'A' }, 'PLC1:Q0': { x: 364, y: 102, d: 'A' },
    'M1:13': { x: 150, y: 166, d: 'A', vx: 168 }, 'M1:14': { x: 150, y: 182, d: 'A', vx: 178 },
    'M1:A1': { x: 150, y: 198, d: 'B', vx: 188 }, 'M1:A2': { x: 150, y: 214, d: 'B', vx: 198 },
    'OL1:95': { x: 150, y: 242, d: 'B', vx: 208 }, 'OL1:96': { x: 150, y: 258, d: 'B', vx: 218 },
    'PB1:11': { x: 52, y: 474, f: 1 }, 'PB1:12': { x: 88, y: 474, f: 1 },
    'PB2:13': { x: 150, y: 474, f: 1 }, 'PB2:14': { x: 186, y: 474, f: 1 },
    'PEC1:BN': { x: 262, y: 474, f: 1 }, 'PEC1:BK': { x: 291, y: 474, f: 1 }, 'PEC1:BU': { x: 320, y: 474, f: 1 }
  };
  TB.forEach(function (t) { T['TB1:' + t.n] = { x: 56 + (t.n - 1) * 41, y: 334, d: 'B' }; });
  var PWR = [['M1', 'L1', 58, 152], ['M1', 'L2', 82, 152], ['M1', 'L3', 106, 152], ['OL1', 'T1', 58, 270], ['OL1', 'T2', 82, 270], ['OL1', 'T3', 106, 270]];

  function routeOf(wire) {
    var ends = WIRES[wire] || [], segs = [], used = {}, minx = {}, maxx = {};
    ends.forEach(function (id) {
      var t = T[id], vx = t.vx || t.x, dy = DUCT[t.d];
      segs.push(t.vx ? [[t.x, t.y], [vx, t.y], [vx, dy]] : [[t.x, t.y], [t.x, dy]]);
      used[t.d] = 1; minx[t.d] = Math.min(minx[t.d] == null ? 1e9 : minx[t.d], vx); maxx[t.d] = Math.max(maxx[t.d] == null ? -1e9 : maxx[t.d], vx);
    });
    var both = used.A && used.B, duct = [];
    ['A', 'B'].forEach(function (d) { if (used[d]) duct.push([[both ? SIDE : minx[d], DUCT[d]], [maxx[d], DUCT[d]]]); });
    if (both) duct.push([[SIDE, DUCT.A], [SIDE, DUCT.B]]);
    var field = [];
    TB.forEach(function (t) {
      if (t.wire !== wire || !t.field) return;
      var a = T['TB1:' + t.n], b = T[t.field], my = 400 + t.n * 5;
      field.push([[a.x, a.y + 40], [a.x, my], [b.x, my], [b.x, b.y]]);
    });
    return { stubs: segs, duct: duct, field: field, ends: ends.concat(TB.filter(function (t) { return t.wire === wire && t.field; }).map(function (t) { return t.field; })) };
  }
  function pl(p, cls) { return '<polyline class="' + cls + '" points="' + p.map(function (q) { return q[0] + ',' + q[1]; }).join(' ') + '"/>'; }

  /* o: { sel: device tag, pick: chosen hotspot, right: [hotspots] (after submission), wrong: hotspot,
   *      wire: wire id to trace, hide: hide unrelated, names: show descriptive names, view: sim view } */
  function render(o) {
    o = o || {};
    var s = '<svg class="panel-svg" viewBox="0 0 400 548" role="group" aria-label="Simulated panel inspection view">';
    s += '<rect class="pn-encl" x="8" y="8" width="384" height="424" rx="4"/><rect class="pn-plate" x="16" y="22" width="368" height="396"/>';
    s += '<text class="pn-cap" x="200" y="18">ENCLOSURE · mounting plate (simulated inspection view)</text>';
    [72, 186, 354].forEach(function (y) { s += '<rect class="pn-rail" x="24" y="' + (y - 5) + '" width="352" height="10"/>'; });
    s += '<rect class="pn-duct" x="16" y="' + (DUCT.A - 9) + '" width="368" height="18"/><rect class="pn-duct" x="16" y="' + (DUCT.B - 9) + '" width="368" height="18"/><rect class="pn-duct" x="16" y="' + (DUCT.A - 9) + '" width="13" height="' + (DUCT.B - DUCT.A + 18) + '"/>';
    s += '<text class="pn-cap" x="300" y="' + (DUCT.A + 3) + '">wiring duct</text><text class="pn-cap" x="300" y="' + (DUCT.B + 3) + '">wiring duct</text>';
    s += '<text class="pn-cap" x="200" y="446">cable entry</text><path class="pn-entry" d="M40 432v8M90 432v8M150 432v8M290 432v8"/>';
    s += '<text class="pn-cap" x="200" y="462">DOOR AND FIELD DEVICES (outside the enclosure)</text>';
    var dim = o.wire && o.hide, r = o.wire ? routeOf(o.wire) : null;
    // quiet permanent stubs and field cables
    if (!dim) {
      Object.keys(T).forEach(function (id) { var t = T[id]; if (t.f) return; var vx = t.vx || t.x; s += pl(t.vx ? [[t.x, t.y], [vx, t.y], [vx, DUCT[t.d] + (t.d === 'A' ? (t.y < DUCT.A ? -9 : 9) : -9)]] : [[t.x, t.y], [t.x, DUCT[t.d] + (t.y < DUCT[t.d] ? -9 : 9)]], 'pn-wire'); });
      TB.forEach(function (t) { if (!t.field) return; var a = T['TB1:' + t.n], b = T[t.field], my = 400 + t.n * 5; s += pl([[a.x, a.y + 40], [a.x, my], [b.x, my], [b.x, b.y]], 'pn-wire'); });
      s += '<path class="pn-wire pwr" d="M58 222V226M82 222V226M106 222V226M58 152V140M82 152V140M106 152V140M58 270V284M82 270V284M106 270V284"/>';
    }
    // devices
    Object.keys(DEV).forEach(function (id) {
      var d = DEV[id], cls = 'pn-dev' + (d.field ? ' field' : '') + (o.sel === id ? ' sel' : '') + (o.pick === id ? ' pick' : '') + ((o.right || []).indexOf(id) >= 0 ? ' right' : '') + (o.wrong === id ? ' wrong' : '');
      var live = o.view && ((id === 'M1' && o.view.M1) || (id === 'CR2' && o.view.CR2));
      s += '<g class="' + cls + (live ? ' live' : '') + '" data-hot="' + id + '" tabindex="0" role="button" aria-label="Device ' + id + (o.names ? ', ' + d.name : '') + '">' +
        '<rect x="' + d.x + '" y="' + d.y + '" width="' + d.w + '" height="' + d.h + '" rx="3"/>' +
        '<text class="pn-tag" x="' + (d.x + (id === 'TB1' ? 16 : (id === 'M1' || id === 'OL1' ? 44 : d.w / 2))) + '" y="' + (d.y + (id === 'TB1' ? 30 : d.field ? 34 : 22)) + '">' + id + '</text>' +
        (o.names ? '<text class="pn-name" x="' + (d.x + (id === 'TB1' ? d.w / 2 : (id === 'M1' || id === 'OL1' ? 44 : d.w / 2))) + '" y="' + (d.y + (id === 'TB1' ? d.h + 10 : d.field ? 46 : 34)) + '">' + esc(d.name) + (d.sub ? ' · ' + d.sub : '') + '</text>' : '') +
        (id === 'M1' ? '<text class="pn-name" x="84" y="208">' + (o.view && o.view.M1 ? 'PULLED IN' : '') + '</text>' : '') + '</g>';
    });
    PWR.forEach(function (q) { s += '<circle class="pn-term pwr" cx="' + q[2] + '" cy="' + q[3] + '" r="4"/><text class="pn-tn" x="' + q[2] + '" y="' + (q[3] + (q[3] < 200 ? -8 : 14)) + '">' + q[1] + '</text>'; });
    // traced wire overlay
    if (r) {
      r.duct.forEach(function (p) { s += pl(p, 'pn-route duct'); });
      r.stubs.forEach(function (p) { s += pl(p, 'pn-route'); });
      r.field.forEach(function (p) { s += pl(p, 'pn-route'); });
      s += '<g class="pn-wid"><rect x="330" y="' + (DUCT.B - 26) + '" width="56" height="14" rx="3"/><text x="358" y="' + (DUCT.B - 16) + '">wire ' + esc(o.wire) + '</text></g>';
    }
    // terminals
    Object.keys(T).forEach(function (id) {
      var t = T[id], lab = show(id.split(':')[1]), end = r && r.ends.indexOf(id) >= 0;
      var cls = 'pn-t' + (o.pick === id ? ' pick' : '') + ((o.right || []).indexOf(id) >= 0 ? ' right' : '') + (o.wrong === id ? ' wrong' : '') + (end ? ' end' : '') + (dim && !end ? ' dim' : '');
      var lx = t.vx ? t.x - 10 : t.x, ly = t.vx ? t.y + 3 : (id.indexOf('TB1') === 0 ? t.y + 24 : (t.f ? t.y + 14 : t.y - 8)), anchor = t.vx ? 'end' : 'middle';
      s += '<g class="' + cls + '" data-hot="' + id + '" tabindex="0" role="button" aria-label="Terminal ' + esc(show(id)) + '">' +
        (id.indexOf('TB1') === 0 ? '<rect class="pn-tbb" x="' + (t.x - 15) + '" y="' + (t.y - 4) + '" width="30" height="48" rx="2"/><circle class="pn-term" cx="' + t.x + '" cy="' + (t.y + 40) + '" r="4.5"/>' : '') +
        '<circle class="pn-hit" cx="' + t.x + '" cy="' + t.y + '" r="10"/><circle class="pn-term" cx="' + t.x + '" cy="' + t.y + '" r="4.5"/>' +
        '<text class="pn-tn" style="text-anchor:' + anchor + '" x="' + lx + '" y="' + ly + '">' + esc(lab) + '</text></g>';
    });
    return s + '</svg>';
  }

  /* Drawing-to-panel tasks. `show` names the drawing sheet and the symbol the question is about.
   * `ok` lists accepted hotspots; a trailing ':' accepts the device or any of its terminals. */
  var TASKS = [
    { id: 'p1', q: 'Sheet 3 shows this coil, tagged M1. Find the physical device it belongs to on the panel.', show: ['dwg3', 'M1coil'], ok: ['M1:'], cap: 'locate',
      explain: 'The coil tagged M1 is inside contactor M1 on the middle rail. The tag is the link between drawing and hardware.' },
    { id: 'p2', q: 'Find the auxiliary contact associated with contactor M1. Click one of its two terminals.', show: ['dwg3', 'M1aux'], ok: ['M1:13', 'M1:14'], cap: 'locate',
      explain: 'The auxiliary contact is on the contactor itself: terminals 13 and 14 on M1. It is not a separate device.' },
    { id: 'p3', q: 'Sheet 3 shows the overload contact with terminals 95 and 96. Locate terminal 96 on the panel.', show: ['dwg3', 'OL1c'], ok: ['OL1:96'], cap: 'locate',
      explain: 'OL1 is mounted under the contactor. Its control contact terminals 95 and 96 are on its right-hand side.' },
    { id: 'p4', q: 'Wire number 2 leaves OL1 terminal 96. Follow it: click another terminal where wire 2 lands.', show: ['dwg4', 'TB1:3'], ok: ['TB1:3', 'M1:13', 'PB2:13'], cap: 'locate',
      explain: 'Wire 2 joins OL1:96, M1:13 and TB1 terminal 3, and continues from TB1-3 to START button terminal 13. One wire number, one electrical point.' },
    { id: 'p5', q: 'Sheet 4 lists a field device on TB1 terminal 6. Click that field device.', show: ['dwg4', 'TB1:6'], ok: ['PEC1:'], cap: 'locate',
      explain: 'TB1-6 carries wire I0 from photoelectric sensor PEC1 (black signal wire) to PLC input I0.' },
    { id: 'p6', q: 'Find the device that supplies 24 VDC control power.', show: ['dwg1', null], ok: ['PS1:'], cap: 'locate',
      explain: 'PS1 is the control power supply, top left of the mounting plate, with output terminals +V and −V.' },
    { id: 'p7', q: 'Find the protective device for the 24 VDC control circuit.', show: ['dwg1', null], ok: ['F1:'], cap: 'locate',
      explain: 'F1 is the control fuse, next to PS1. Wire 24V enters at terminal 1 and the fused supply L+ leaves at terminal 2.' },
    { id: 'p8', q: 'Wire 3 feeds the contactor coil. Click the coil terminal where it lands.', show: ['dwg3', 'M1coil'], ok: ['M1:A1'], cap: 'locate',
      explain: 'The coil terminals are A1 and A2. Wire 3 lands on A1; A2 returns to 0V.' },
    { id: 'p9', q: 'PLC output Q0 commands a relay. Click the relay coil terminal where wire Q0 lands.', show: ['dwg1', null], ok: ['CR2:A1'], cap: 'locate',
      explain: 'Wire Q0 runs from PLC1 terminal Q0 to CR2 coil terminal A1. The output commands the relay; the relay switches the load.' },
    { id: 'p10', q: 'The STOP button returns its signal to the panel on wire 1. Click the TB1 terminal that carries wire 1.', show: ['dwg4', 'TB1:2'], ok: ['TB1:2'], cap: 'locate',
      explain: 'Sheet 4 shows wire 1 from PB1 terminal 12 landing on TB1 terminal 2, then going on to OL1:95.' }
  ];
  function accepts(task, hot) {
    return task.ok.some(function (k) { return k.charAt(k.length - 1) === ':' ? (hot === k.slice(0, -1) || hot.indexOf(k) === 0) : hot === k; });
  }
  function describe(hot) {
    if (hot.indexOf(':') < 0) return 'device ' + hot + ' (' + DEV[hot].name.toLowerCase() + ')';
    var w = wireOf(hot);
    return 'terminal ' + show(hot) + (w ? ', wire ' + w : '');
  }

  FS.panel = { TB: TB, WIRES: WIRES, WIRE_ORDER: WIRE_ORDER, DEV: DEV, T: T, render: render, routeOf: routeOf, wireOf: wireOf, tasks: TASKS, accepts: accepts, describe: describe, show: show };
})(typeof window !== 'undefined' ? window : globalThis);
