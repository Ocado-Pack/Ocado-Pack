/* FIRST SHIFT — 2.5D equipment view. Used when WebGL is unavailable or when
 * the learner chooses the simple view. Same stations, same labels, same
 * selection behavior as the 3D room; state is shown as text on each tag. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  var s2 = {}, el, pickCb = function () {}, view = {}, sel = null, bench = null, benchTags = null, title = '';
  var ST = { PS1: 'panel', CB1: 'panel', F1: 'panel', FU: 'panel', DS1: 'panel', M1: 'panel', OL1: 'panel', CR1: 'panel', CR2: 'panel', PLC1: 'panel', TB1: 'panel', PE: 'panel',
    PB2: 'panel', PB1: 'panel', S1: 'panel', S2: 'panel', PL1: 'panel', PL2: 'panel', MTR1: 'conveyor', PEC1: 'conveyor',
    SRC: 'pneu', SV1: 'pneu', FRL1: 'pneu', PG1: 'pneu', V1: 'pneu', SOL1: 'pneu', CYL1: 'pneu', FC: 'pneu', SS2: 'pneu' };
  function grid(refs, y, x0) { var o = {}; refs.forEach(function (r, i) { o[r] = [(x0 || 8) + i * 51, y]; }); return o; }
  var POS = {};
  [grid(['PS1', 'CB1', 'F1', 'FU', 'DS1', 'PLC1'], 90), grid(['M1', 'OL1', 'CR1', 'CR2', 'TB1', 'PE'], 122),
    grid(['PB2', 'PB1', 'S1', 'S2', 'PL1', 'PL2'], 188), { MTR1: [8, 358], PEC1: [240, 296] },
    grid(['SRC', 'SV1', 'FRL1', 'PG1', 'V1', 'SS2'], 416), grid(['CYL1', 'FC'], 448)].forEach(function (g) { for (var k in g) POS[k] = g[k]; });
  function cuboid(x, y, w, h, d, cls) {
    var ox = d * 0.7, oy = -d * 0.45;
    return '<g class="cub ' + (cls || '') + '"><polygon class="top" points="' + [x, y, x + ox, y + oy, x + w + ox, y + oy, x + w, y].join(' ') + '"/>' +
      '<polygon class="side" points="' + [x + w, y, x + w + ox, y + oy, x + w + ox, y + h + oy, x + w, y + h].join(' ') + '"/>' +
      '<rect class="front" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></g>';
  }
  function stateOf(ref) {
    var v = view;
    switch (ref) {
      case 'PS1': return v.supply ? 'ON' : 'OFF';
      case 'F1': return v.fuseIn === false ? 'OUT' : 'IN';
      case 'DS1': return v.mains === false ? 'OPEN' : 'CLSD';
      case 'M1': return v.M1 ? 'IN' : 'OUT';
      case 'OL1': return v.ol ? 'TRIP' : 'OK';
      case 'CR1': return v.CR1 ? 'ON' : 'OFF';
      case 'CR2': return v.CR2 ? 'ON' : 'OFF';
      case 'PLC1': return (v.I0 ? 'I1' : 'I0') + (v.Q0 ? 'Q1' : 'Q0');
      case 'PB2': return v.PB2 ? 'PRSD' : '';
      case 'PB1': return v.PB1 ? 'PRSD' : '';
      case 'S1': return v.S1 ? 'ON' : 'OFF';
      case 'S2': return v.S2 ? 'ON' : 'OFF';
      case 'SS2': return v.SS2 ? 'EXT' : 'RET';
      case 'PL1': return v.PL1 ? 'LIT' : 'OFF';
      case 'PL2': return v.PL2 ? 'LIT' : 'OFF';
      case 'MTR1': return v.motor ? 'RUN' : 'STOP';
      case 'PEC1': return v.sensor ? 'ON' : 'OFF';
      case 'SV1': return v.air === false ? 'SHUT' : 'OPEN';
      case 'PG1': return (v.bar || 0) + 'bar';
      case 'V1': return v.sol ? 'ACT' : 'REST';
      case 'CYL1': return (v.cyl || 0) > 0.97 ? 'EXT' : (v.cyl || 0) < 0.03 ? 'RET' : 'MOV';
    }
    return '';
  }
  function hot(ref) { var v = view; return { PL1: v.PL1, PL2: v.PL2, M1: v.M1, MTR1: v.motor, CR1: v.CR1, CR2: v.CR2, PEC1: v.sensor, V1: v.sol }[ref]; }
  function draw() {
    if (!el) return;
    var o = '<svg class="room2d" viewBox="0 0 320 496" role="group" aria-label="Training room, simple view">';
    o += '<rect class="wall" x="0" y="0" width="320" height="232"/><rect class="floor" x="0" y="232" width="320" height="264"/>';
    o += '<rect class="disp" x="85" y="20" width="150" height="40"/><text class="stt" x="160" y="14">SCHEMATIC DISPLAY</text><text class="dispt" x="160" y="44">' + FS.schem.esc(title).slice(0, 30) + '</text>';
    o += cuboid(4, 84, 306, 72, 6, 'st') + '<text class="stt" x="160" y="78">TRAINING CONTROL PANEL</text>';
    o += cuboid(4, 182, 306, 40, 6, 'st') + '<text class="stt" x="160" y="176">OPERATOR DEVICES (PANEL DOOR)</text>';
    o += cuboid(40, 250, 236, 40, 8, 'st wood') + '<text class="stt" x="160" y="242">COMPONENT WORKBENCH</text>';
    (bench || []).forEach(function (id, i) {
      var c = FS.comp(id), n = bench.length, x = 158 + (i - (n - 1) / 2) * 54;
      o += '<g class="tag bench' + (benchTags ? '' : ' sel') + '" ' + (benchTags ? 'data-bench="' + i + '" tabindex="0" role="button" aria-label="Bench part ' + benchTags[i] + '"' : '') + '><rect x="' + (x - 25) + '" y="256" width="50" height="28" rx="3"/><text x="' + x + '" y="274">' +
        FS.schem.esc(benchTags ? benchTags[i] : (c ? c.name.split(' ').slice(0, 2).join(' ').slice(0, 11) : id)) + '</text></g>';
    });
    o += cuboid(16, 332, 280, 20, 10, 'st belt') + '<text class="stt" x="110" y="312">CONVEYOR' + (view.motor ? ' · RUNNING' : '') + '</text>';
    if (view.box) o += cuboid(200, 304, 30, 24, 8, 'carton');
    o += cuboid(4, 410, 306, 76, 6, 'st') + '<text class="stt" x="160" y="404">PNEUMATIC STATION</text>';
    o += '<rect class="rod" x="118" y="458" width="' + (30 + (view.cyl || 0) * 130) + '" height="8"/><text class="dispt" x="250" y="474">rod of CYL1</text>';
    Object.keys(POS).forEach(function (ref) {
      var q = POS[ref], st = stateOf(ref);
      o += '<g class="tag' + (sel === ref ? ' sel' : '') + (hot(ref) ? ' hot' : '') + '" data-ref="' + ref + '" tabindex="0" role="button" aria-label="' + ref + (st ? ', ' + st : '') + (sel === ref ? ', selected' : '') + '">' +
        '<rect x="' + q[0] + '" y="' + q[1] + '" width="48" height="28" rx="3"/><text x="' + (q[0] + 24) + '" y="' + (q[1] + 12) + '">' + (ref === 'SRC' ? 'AIR' : ref === 'FU' ? 'FU1–3' : ref === 'FC' ? 'FC1–2' : ref) + '</text>' +
        '<text class="s" x="' + (q[0] + 24) + '" y="' + (q[1] + 23) + '">' + st + '</text></g>';
    });
    el.innerHTML = o + '</svg>';
  }
  s2.init = function (container) {
    el = container; el.classList.add('is2d');
    function act(e) {
      var t = e.target.closest ? e.target.closest('[data-ref],[data-bench]') : null; if (!t) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (t.dataset.bench != null) pickCb({ bench: +t.dataset.bench }); else pickCb({ ref: t.dataset.ref });
    }
    el.addEventListener('click', act); el.addEventListener('keydown', act);
    draw(); return true;
  };
  s2.resize = function () {}; s2.setRM = function () {}; s2.focus = function () {}; s2.focusOn = function () {};
  s2.onPick = function (fn) { pickCb = fn; };
  s2.has = function (ref) { return !!POS[ref]; };
  s2.stationOf = function (ref) { return ST[ref]; };
  s2.select = function (ref) { sel = ref; draw(); };
  s2.bench = function (shapes, tags, ids) { bench = ids || null; benchTags = tags || null; draw(); };
  s2.setDisplay = function (svg, vb, t) { title = t || ''; draw(); };
  s2.update = function (v) { view = v || {}; draw(); };
  FS.scene2d = s2;
})(typeof window !== 'undefined' ? window : globalThis);
