/* FIRST SHIFT — schematic renderer. Draws a diagram definition as SVG from the
 * solved circuit state. The drawing always shows symbols in their reference
 * state; live state is added as line weight, a dash pattern and a text tag. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};

  var CSS = [
    '.schem-svg{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}',
    '.schem-svg .paper{fill:var(--paper)}',
    '.schem-svg text{fill:var(--ink);font-size:11px;text-anchor:middle;stroke:none}',
    '.schem-svg .sy{fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.schem-svg .sy.syw{fill:var(--paper)}',
    '.schem-svg .sy.thin{stroke-width:1.2}',
    '.schem-svg .sy.dash{stroke-dasharray:4 3}',
    '.schem-svg .syf{fill:var(--ink);stroke:var(--ink);stroke-width:1.5;stroke-linejoin:round}',
    '.schem-svg .syt{font-size:11px;font-weight:700}',
    '.schem-svg .syt.sm{font-size:8px;font-weight:400}',
    '.schem-svg .w{fill:none;stroke:var(--idle);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}',
    '.schem-svg .w.rail{stroke-width:4.5}',
    '.schem-svg .w.pwr{stroke-width:3}',
    '.schem-svg .w.pe{stroke:var(--pe);stroke-dasharray:7 3}',
    '.schem-svg .w.live{stroke:var(--live);stroke-width:4.5}',
    '.schem-svg .w.fluid{stroke:var(--idle);stroke-width:6;stroke-linecap:butt;stroke-dasharray:10 3}',
    '.schem-svg .w.fluid.live{stroke:var(--fluid);stroke-width:7;stroke-dasharray:none}',
    '.schem-svg .flowdash{fill:none;stroke:var(--paper);stroke-width:1.7;stroke-dasharray:3 9;stroke-linecap:round;animation:fsflow .7s linear infinite}',
    '.schem-svg .flowdash.rev{animation-direction:reverse}',
    '.schem-svg.rm .flowdash{animation:none}',
    '@keyframes fsflow{to{stroke-dashoffset:-12}}',
    '.schem-svg .pot{fill:none;stroke:var(--pot);stroke-width:12;stroke-linecap:round;stroke-linejoin:round}',
    '.schem-svg .dot{fill:var(--ink)}',
    '.schem-svg .tblock text{fill:var(--ink)}',
    '.schem-svg .part{cursor:pointer;outline:none}',
    '.schem-svg .part .hit{fill:transparent;stroke:transparent;stroke-width:2}',
    '.schem-svg .part:hover .hit{stroke:var(--idle);stroke-dasharray:3 3}',
    '.schem-svg .part:focus-visible .hit{stroke:var(--sel);stroke-width:2;stroke-dasharray:none}',
    '.schem-svg .part.sel .hit{stroke:var(--sel);stroke-width:3;fill:var(--selbg);stroke-dasharray:none}',
    '.schem-svg .part.link .hit{stroke:var(--sel);stroke-width:2.5;stroke-dasharray:7 4;fill:var(--selbg)}',
    '.schem-svg .part.traced .hit{stroke:var(--sel);stroke-width:3;stroke-dasharray:2 4;fill:var(--selbg)}',
    '.schem-svg .part.live .sy{stroke:var(--live)}',
    '.schem-svg .part.live .syf{fill:var(--live);stroke:var(--live)}',
    '.schem-svg .part.on .sy.syw{fill:var(--glow)}',
    '.schem-svg .part.fault .sy{stroke:var(--fault)}',
    '.schem-svg .part.removed .symg{opacity:.28}',
    '.schem-svg .ref{font-size:13px;font-weight:700}',
    '.schem-svg .sub{font-size:10px;fill:var(--ink2)}',
    '.schem-svg .st{font-size:9.5px;font-weight:700;letter-spacing:.05em;fill:var(--ink2)}',
    '.schem-svg .st.hot{fill:var(--livetext)}',
    '.schem-svg .seltag{font-size:9px;font-weight:700;fill:var(--sel)}',
    '.schem-svg .tp{cursor:crosshair;outline:none}',
    '.schem-svg .tp rect{fill:var(--paper);stroke:var(--ink);stroke-width:1.4}',
    '.schem-svg .tp text{font-size:9.5px;font-weight:700}',
    '.schem-svg .tp:hover rect,.schem-svg .tp:focus-visible rect{stroke:var(--sel);stroke-width:2.5}',
    '.schem-svg .probe path{stroke-width:1.5;stroke:var(--paper)}',
    '.schem-svg .probe text{font-size:8px;font-weight:700}',
    '.schem-svg .probe.red path{fill:var(--probe)}',
    '.schem-svg .probe.red text{fill:var(--probe)}',
    '.schem-svg .probe.black path{fill:var(--ink)}',
    '.schem-svg .faultmark path{stroke:var(--fault);stroke-width:4;stroke-linecap:round;fill:none}',
    '.schem-svg .faultmark text{fill:var(--fault);font-size:10px;font-weight:700}',
    '.schem-svg .faultmark rect{fill:var(--paper);stroke:var(--fault);stroke-width:1.5}',
    '.schem-svg .railt{font-size:12px;font-weight:700}',
    '.schem-svg .small{font-size:10px;fill:var(--ink2)}',
    '.schem-svg .sect{font-size:11.5px;font-weight:700;letter-spacing:.08em;fill:var(--ink2)}',
    '.schem-svg .xref{font-size:9.5px;font-style:italic;fill:var(--ink2)}',
    '.schem-svg .pm{font-size:16px;font-weight:700}',
    '.schem-svg .chk{font-size:9.5px;font-weight:700;letter-spacing:.06em;fill:var(--ink2)}',
    '.schem-svg .port{font-size:10px;font-weight:700}',
    '.schem-svg .wnum{font-size:10px;font-weight:700}',
    '.schem-svg .term{font-size:9.5px;fill:var(--ink2)}',
    '.schem-svg .plcbox{fill:var(--panelfill);stroke:var(--ink);stroke-width:2}',
    '.schem-svg .conv{stroke:var(--ink);stroke-width:4;fill:none}',
    '.schem-svg .boxg{fill:var(--boxfill);stroke:var(--ink);stroke-width:1.5}',
    '.schem-svg .beam{stroke:var(--idle);stroke-width:2;stroke-dasharray:4 4;fill:none}',
    '.schem-svg .beam.hit{stroke:var(--live);stroke-width:3;stroke-dasharray:none}',
    '.schem-svg .logic.live .sy{stroke:var(--live)}',
    '.schem-svg .led{fill:var(--paper);stroke:var(--ink);stroke-width:1.4}',
    '.schem-svg .led.on{fill:var(--live)}',
    '.schem-svg .divider{stroke:var(--idle);stroke-width:1.5;stroke-dasharray:2 6;fill:none}',
    '.schem-svg .chamber{fill:var(--paper)}',
    '.schem-svg .chamber.press{fill:var(--fluidbg)}',
    '.schem-svg .piston{fill:var(--ink)}',
    '.schem-svg .rod{fill:var(--idle);stroke:var(--ink);stroke-width:1}',
    '.schem-svg .valve .act{fill:var(--selbg)}',
    '.schem-svg .solbox.live{fill:var(--glow)}',
    '.schem-svg .outline{fill:none;stroke:var(--ink);stroke-width:2.5}',
    '.schem-svg .duct{fill:var(--panelfill);stroke:var(--idle);stroke-width:1.5}',
    '.schem-svg .mech{stroke:var(--ink2);stroke-width:1.5;stroke-dasharray:5 4;fill:none}',
    '.schem-svg .arrow{stroke:var(--ink);stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}'
  ].join('\n');

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function pts(a) { return a.map(function (q) { return q[0] + ',' + q[1]; }).join(' '); }

  /* While a mission's fault is still hidden, tags show only what a person could observe. */
  var OBSERVED = {
    F1: function (s) { return s.fuseIn ? 'INSTALLED' : 'REMOVED'; },
    W2: function () { return ''; },
    PB1: function (s) { return s.pb.PB1 ? 'PRESSED' : 'RELEASED'; },
    'M1-AUX': function () { return ''; },
    OL1: function () { return ''; },
    PB2: function (s) { return s.pb.PB2 ? 'PRESSED' : 'RELEASED'; },
    S1: function (s) { return s.sw.S1 ? 'SWITCHED ON' : 'SWITCHED OFF'; },
    SS2: function (s) { return s.sw.SS2 ? 'AT EXTEND' : 'AT RETRACT'; }
  };
  /* Which circuit node each drawn wire belongs to, inferred once from the device terminals it touches. */
  function onSeg(q, a, b) {
    if (a[0] === b[0]) return q[0] === a[0] && q[1] >= Math.min(a[1], b[1]) && q[1] <= Math.max(a[1], b[1]);
    if (a[1] === b[1]) return q[1] === a[1] && q[0] >= Math.min(a[0], b[0]) && q[0] <= Math.max(a[0], b[0]);
    return false;
  }
  function onWire(q, w) { for (var i = 0; i < w.pts.length - 1; i++) if (onSeg(q, w.pts[i], w.pts[i + 1])) return true; return false; }
  function wireNodes(d) {
    if (d._wn) return d._wn;
    var els = {}, seeds = [], W = d.wires || [], par = W.map(function (w, i) { return i; }), node = {};
    ((FS.sim.CIRCUITS[d.circuit] || {}).els || []).forEach(function (e) { els[e[0]] = e; });
    (d.parts || []).forEach(function (p) {
      var e = p.el && els[p.el]; if (!e || p.custom || p.sym === 'box') return;
      if (p.sym === 'sensor3') seeds.push([p.x + 34, p.y, e[2]]);
      else if (p.rot) { seeds.push([p.x, p.y - 30, e[1]]); seeds.push([p.x, p.y + 30, e[2]]); }
      else { seeds.push([p.x - 30, p.y, e[1]]); seeds.push([p.x + 30, p.y, e[2]]); }
    });
    function find(i) { while (par[i] !== i) i = par[i]; return i; }
    function elec(w) { return !/pwr|fluid|pe/.test(w.cls || ''); }
    W.forEach(function (a, i) {
      if (!elec(a)) return;
      W.forEach(function (b, j) {
        if (j <= i || !elec(b)) return;
        var touch = [a.pts[0], a.pts[a.pts.length - 1]].some(function (q) { return onWire(q, b); }) || [b.pts[0], b.pts[b.pts.length - 1]].some(function (q) { return onWire(q, a); });
        if (touch) par[find(i)] = find(j);
      });
    });
    W.forEach(function (w, i) { if (elec(w)) seeds.forEach(function (sd) { if (onWire(sd, w)) node[find(i)] = sd[2]; }); });
    return (d._wn = W.map(function (w, i) { return elec(w) ? (node[find(i)] || null) : null; }));
  }
  function boxOf(p, st) {
    var w, h;
    if (p.hit || p.sym === 'box') {
      w = p.hit ? p.hit[0] : p.o.w + 10; h = p.hit ? p.hit[1] : p.o.h + 10;
      if (p.rot) { var tmp = w; w = h; h = tmp; }
      return [p.x - w / 2, p.y - h / 2, w, h];
    }
    if (p.rot) return [p.x - 20, p.y - 34, 122, 68];
    var top = p.noRef ? 22 : 39, bot = (st && p.sy == null && p.sx == null) ? (p.sub ? 45 : 35) : (p.sub ? 34 : 22);
    return [p.x - 35, p.y - top, 70, top + bot];
  }

  function stateOf(p, c) {
    if (p.noSt || c.labels === false || (c.layers && !c.layers.st)) return '';
    if (!c.reveal && c.hideFaults && p.el && OBSERVED[p.el]) return OBSERVED[p.el](c.S);
    if (p.el === 'F1' && !c.S.fuseIn) return 'REMOVED';
    if (p.st) return p.st(c);
    if (p.plain || !p.el) return '';
    var e = c.el(p.el);
    if (p.stw) return e.closed ? p.stw[0] : p.stw[1];
    if (FS.sim.DEV[p.el].load) return FS.sim.DEV[p.el].relay ? (e.on ? 'ENERGIZED' : 'DE-ENERGIZED') : (e.on ? 'ON' : 'OFF');
    return e.closed ? '● CLOSED' : '○ OPEN';
  }

  function drawPart(p, d, c) {
    var e = p.el ? c.el(p.el) : null;
    var showCur = !c.layers || c.layers.cur;
    var live = showCur && (p.live ? !!c.flags[p.live] : !!(e && e.flow));
    var on = !!(e && e.on) && (!c.layers || c.layers.st);
    var sel = c.selPart === p.id;
    var link = !sel && c.link !== false && c.selRef && c.selRef === p.ref;
    var fault = c.reveal && (d.faults || []).some(function (f) { return f.part === p.id && c.S.faults[f.key]; });
    var removed = p.el === 'F1' && !c.S.fuseIn;
    var traced = c.trace && p.el && c.trace.indexOf(p.el) >= 0;
    var st = stateOf(p, c), bx = boxOf(p, st), desc = (FS.LEG[p.ref] || [])[1] || p.sub || '';
    var cls = 'part' + (sel ? ' sel' : '') + (link ? ' link' : '') + (live ? ' live' : '') + (on ? ' on' : '') + (fault ? ' fault' : '') + (removed ? ' removed' : '') + (traced ? ' traced' : '');
    var s = '<g class="' + cls + '" data-part="' + esc(p.id) + '" tabindex="0" role="button" aria-label="' + esc((p.name || p.ref) + (desc ? ', ' + desc : '') + (st ? ', ' + st.toLowerCase() : '') + (sel ? ', selected' : '')) + '">';
    s += '<rect class="hit" x="' + bx[0] + '" y="' + bx[1] + '" width="' + bx[2] + '" height="' + bx[3] + '" rx="6"/>';
    var so = p.o;
    if (p.rot && so) { so = {}; for (var k in p.o) so[k] = p.o[k]; so.tr = -p.rot; }
    if (!p.custom) s += '<g class="symg" transform="translate(' + p.x + ',' + p.y + ')' + (p.rot ? ' rotate(' + p.rot + ')' : '') + '">' + FS.sym.draw(p.sym, so) + '</g>';
    var hot = (live || on) ? ' hot' : '';
    if (p.rot) {
      if (!p.noRef) s += '<text class="ref" style="text-anchor:start" x="' + (p.x + 22) + '" y="' + (p.y - 8) + '">' + esc(p.ref) + '</text>';
      if (p.sub && c.labels !== false) s += '<text class="sub" style="text-anchor:start" x="' + (p.x + 22) + '" y="' + (p.y + 4) + '">' + esc(p.sub) + '</text>';
      if (st) s += '<text class="st' + hot + '" style="text-anchor:start" x="' + (p.x + 22) + '" y="' + (p.y + 16) + '">' + esc(st) + '</text>';
    } else {
      if (!p.noRef) s += '<text class="ref" x="' + p.x + '" y="' + (p.y - 24) + '">' + esc(p.ref) + '</text>';
      if (p.sub && !p.plain && c.labels !== false) s += '<text class="sub" x="' + p.x + '" y="' + (p.y + 27) + '">' + esc(p.sub) + '</text>';
      if (st) s += '<text class="st' + hot + '" x="' + (p.x + (p.sx || 0)) + '" y="' + (p.y + (p.sy != null ? p.sy : (p.sub && !p.plain ? 38 : 28))) + '">' + esc(st) + '</text>';
    }
    if ((sel || link) && (!p.plain || p.tag)) s += '<text class="seltag" x="' + (bx[0] + bx[2] / 2) + '" y="' + (bx[1] - 4) + '">' + (sel ? 'SELECTED' : 'SAME DEVICE') + '</text>';
    return s + '</g>';
  }

  function drawTP(tp, c) {
    var wd = Math.max(16, tp.n.length * 7 + 8), red = c.probes && c.probes.red === tp.n, blk = c.probes && c.probes.black === tp.n;
    var s = '<g class="tp" data-tp="' + esc(tp.n) + '" tabindex="0" role="button" aria-label="Test point ' + esc(tp.n) + (red ? ', red probe here' : '') + (blk ? ', black probe here' : '') + '">';
    s += '<rect x="' + (tp.x - wd / 2) + '" y="' + (tp.y - 8) + '" width="' + wd + '" height="16" rx="3"/><text x="' + tp.x + '" y="' + (tp.y + 3.5) + '">' + esc(tp.n) + '</text>';
    if (red) s += '<g class="probe red"><path d="M' + (tp.x - 6) + ' ' + (tp.y - 21) + 'h12l-6 11z"/><text x="' + tp.x + '" y="' + (tp.y - 24) + '">RED +</text></g>';
    if (blk) s += '<g class="probe black"><path d="M' + (tp.x - 6) + ' ' + (tp.y + 21) + 'h12l-6 -11z"/><text x="' + tp.x + '" y="' + (tp.y + 31) + '">BLK −</text></g>';
    return s + '</g>';
  }

  function render(d, c) {
    c.el = function (id) { return (c.res && c.res.el[id]) || { closed: false, flow: false, on: false }; };
    c.flags = c.flags || {};
    var vb = c.vb || d.vb, out = [], wn = wireNodes(d), showCur = !c.layers || c.layers.cur, showPot = c.layers && c.layers.pot && c.res && c.res.tied;
    out.push('<svg class="schem-svg' + (c.rm ? ' rm' : '') + '" xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ') + '" role="group" aria-label="' + esc(d.title) + '">');
    if (c.embedCss) out.push('<style>' + c.embedCss + '</style>');
    out.push('<rect class="paper" x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '"/>');
    if (showPot) (d.wires || []).forEach(function (w, i) {
      var n = wn[i];
      if (n && c.res.tied[n] && c.res.V[n] > 0.8 * FS.sim.VS) out.push('<polyline class="pot" points="' + pts(w.pts) + '"/>');
    });
    (d.wires || []).forEach(function (w) {
      var live = showCur && (w.live ? !!c.flags[w.live] : w.els.some(function (id) { return c.el(id).flow; }));
      out.push('<polyline class="w ' + (w.cls || '') + (live ? ' live' : '') + '" points="' + pts(w.pts) + '"/>');
      if (live) out.push('<polyline class="flowdash' + (w.rev ? ' rev' : '') + '" points="' + pts(w.pts) + '"/>');
    });
    if (d.extra) out.push(d.extra(c));
    (d.dots || []).forEach(function (q) { out.push('<circle class="dot" cx="' + q[0] + '" cy="' + q[1] + '" r="4.5"/>'); });
    (d.texts || []).forEach(function (t) { out.push('<text class="' + t.cls + '" x="' + t.x + '" y="' + t.y + '">' + esc(t.t) + '</text>'); });
    (d.parts || []).forEach(function (p) { out.push(drawPart(p, d, c)); });
    if (c.reveal) (d.faults || []).forEach(function (f) {
      if (!c.S.faults[f.key]) return;
      var tw = f.label.length * 6.4 + 12;
      out.push('<g class="faultmark"><path d="M' + (f.x - 9) + ' ' + (f.y - 9) + 'l18 18M' + (f.x - 9) + ' ' + (f.y + 9) + 'l18 -18"/>' +
        '<rect x="' + (f.x - tw / 2) + '" y="' + (f.y - 34) + '" width="' + tw + '" height="15" rx="3"/><text x="' + f.x + '" y="' + (f.y - 23) + '">' + esc(f.label) + '</text></g>');
    });
    if (c.showTps !== false) (d.tps || []).forEach(function (tp) { out.push(drawTP(tp, c)); });
    out.push('</svg>');
    return out.join('');
  }

  /* Stand-alone SVG (for the wall display texture and the printable review). */
  function standalone(d, c, vars) {
    var css = CSS.replace(/var\((--[a-z0-9]+)\)/g, function (m, name) { return vars[name] || '#888'; });
    var cc = {}; for (var k in c) cc[k] = c[k];
    cc.embedCss = css; cc.rm = true; cc.showTps = false; cc.selPart = null; cc.selRef = null; cc.trace = null; cc.vb = null;
    return render(d, cc);
  }

  FS.schem = { CSS: CSS, render: render, standalone: standalone, esc: esc, wireNodes: wireNodes };
})(typeof window !== 'undefined' ? window : globalThis);
