/* FIRST SHIFT — circuit simulation (single source of truth).
 * Every diagram, 3D model, explanation and meter reading is derived from the
 * state object created here. Runs in the browser and in Node (for tests). */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  var VS = 24; // simulated control supply, volts DC

  function defaultState() {
    return {
      supply: true,            // 24 VDC control power present
      mains: true,             // disconnect DS1 closed (motor power circuit, diagram only)
      sw: { S1: false, S2: false, SS2: false },   // maintained switches
      pb: { PB1: false, PB2: false },             // momentary buttons: true while pressed
      fuseIn: true,            // F1 installed
      relay: { CR1: false, M1: false, CR2: false }, // armature pulled in
      olTripped: false,        // overload relay OL1 tripped
      box: false,              // box in front of photoelectric sensor PEC1
      plc: { I0: false, Q0: false },
      air: true,               // shutoff valve SV1 open
      cyl: 0,                  // cylinder CYL1 position, 0 = retracted, 1 = extended
      zeroVerified: false,     // absence of voltage verified with the meter after isolation
      faults: {
        fuseOpen: false, wireOpen: false, stopOpen: false, holdOpen: false,
        coilOpen: false, misaligned: false, airOff: false,
        noSupply: false, startOpen: false, lampOpen: false, s1Open: false,
        pl2Open: false, cr2Open: false, sol1Open: false, ss2Open: false
      }
    };
  }

  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  /* Control supply actually present at the L+ rail. */
  function powered(s) { return s.supply && !s.faults.noSupply; }

  /* Devices. `closed` says whether the device conducts. Loads have a resistance `r`. */
  var DEV = {
    F1: { label: 'F1', kind: 'fuse',
      closed: function (s) { return s.fuseIn && !s.faults.fuseOpen; },
      why: function (s, rev) {
        if (!s.fuseIn) return 'fuse F1 has been removed, leaving a gap in the circuit';
        if (s.faults.fuseOpen) return rev ? 'the element inside fuse F1 is open (blown)' : 'no current is passing through F1';
        return 'F1 is installed and intact';
      } },
    S1: { label: 'S1', kind: 'contact',
      closed: function (s) { return s.sw.S1 && !s.faults.s1Open; },
      why: function (s, rev) {
        if (!s.sw.S1) return 'switch S1 is open (switched off)';
        if (s.faults.s1Open) return rev ? 'the S1 contact is open even though the switch is on' : 'voltage is not passing S1';
        return 'S1 is switched on (closed)';
      } },
    S2: { label: 'S2', kind: 'contact',
      closed: function (s) { return s.sw.S2; },
      why: function (s) { return s.sw.S2 ? 'S2 is switched on (closed)' : 'switch S2 is open (switched off)'; } },
    W2: { label: 'wire 2', kind: 'wire',
      closed: function (s) { return !s.faults.wireOpen; },
      why: function (s, rev) {
        if (!s.faults.wireOpen) return 'wire 2 is intact';
        return rev ? 'wire 2 is open between test points 2a and 2b' : 'voltage is not arriving at the load end of wire 2';
      } },
    PL1: { label: 'PL1', kind: 'load', load: true, r: 96,
      open: function (s) { return s.faults.lampOpen; },
      why: function (s, rev) { return rev ? 'the PL1 lamp is open (burnt out), so no current can flow through it' : 'no current is flowing through PL1'; } },
    PL2: { label: 'PL2', kind: 'load', load: true, r: 96,
      open: function (s) { return s.faults.pl2Open; },
      why: function (s, rev) { return rev ? 'the PL2 lamp is open (burnt out)' : 'no current is flowing through PL2'; } },
    CR1: { label: 'CR1 coil', kind: 'load', load: true, r: 480, relay: 'CR1' },
    'CR1-1': { label: 'CR1 contact', kind: 'contact',
      closed: function (s) { return s.relay.CR1; },
      why: function (s) { return s.relay.CR1 ? 'the CR1 coil is energized, so its normally open contact is closed' : 'the CR1 coil is not energized, so its normally open contact stays open'; } },
    PB1: { label: 'PB1 (STOP)', kind: 'contact',
      closed: function (s) { return !s.pb.PB1 && !s.faults.stopOpen; },
      why: function (s, rev) {
        if (s.pb.PB1) return 'STOP (PB1) is being pressed, which opens its normally closed contact';
        if (s.faults.stopOpen) return rev ? 'the STOP (PB1) contact is open even though the button is released' : 'voltage is not passing PB1';
        return 'STOP (PB1) is released, so its normally closed contact is closed';
      } },
    OL1: { label: 'OL1 contact', kind: 'contact',
      closed: function (s) { return !s.olTripped; },
      why: function (s) { return s.olTripped ? 'overload relay OL1 is tripped, so its normally closed control contact is open' : 'OL1 is not tripped, so its normally closed contact is closed'; } },
    PB2: { label: 'PB2 (START)', kind: 'contact',
      closed: function (s) { return s.pb.PB2 && !s.faults.startOpen; },
      why: function (s, rev) {
        if (!s.pb.PB2) return 'START (PB2) is not pressed, so its normally open contact is open';
        if (s.faults.startOpen) return rev ? 'the START (PB2) contact does not close even though the button is pressed' : 'voltage is not passing PB2';
        return 'START (PB2) is being pressed';
      } },
    'M1-AUX': { label: 'M1 auxiliary contact', kind: 'contact',
      closed: function (s) { return s.relay.M1 && !s.faults.holdOpen; },
      why: function (s, rev) {
        if (!s.relay.M1) return 'contactor M1 is not pulled in, so its normally open auxiliary contact is open';
        if (s.faults.holdOpen) return rev ? 'the holding branch through the M1 auxiliary contact is open' : 'the holding branch is not passing current';
        return 'contactor M1 is pulled in, so its auxiliary contact is closed';
      } },
    M1: { label: 'M1 coil', kind: 'load', load: true, r: 240, relay: 'M1',
      open: function (s) { return s.faults.coilOpen; },
      why: function (s, rev) { return rev ? 'the M1 coil winding is open, so no current can flow through it' : 'no current is flowing through the M1 coil'; } },
    PEC1: { label: 'PEC1 output', kind: 'contact',
      closed: function (s) { return s.box && !s.faults.misaligned; },
      why: function (s, rev) {
        if (!s.box) return 'no box is in front of PEC1, so its output is off';
        if (s.faults.misaligned) return rev ? 'PEC1 is misaligned and does not see the box' : 'PEC1 is not switching even though a box is present';
        return 'PEC1 detects the box, so its output is on';
      } },
    I0: { label: 'PLC input I0', kind: 'load', load: true, r: 4700 },
    Q0: { label: 'PLC output Q0', kind: 'contact',
      closed: function (s) { return s.plc.Q0; },
      why: function (s) { return s.plc.Q0 ? 'the PLC logic is true, so output Q0 is on' : 'the PLC logic is false (input I0 is off), so output Q0 is off'; } },
    CR2: { label: 'CR2 coil', kind: 'load', load: true, r: 480, relay: 'CR2',
      open: function (s) { return s.faults.cr2Open; },
      why: function (s, rev) { return rev ? 'the CR2 coil winding is open' : 'no current is flowing through the CR2 coil'; } },
    'CR2-1': { label: 'CR2 contact', kind: 'contact',
      closed: function (s) { return s.relay.CR2; },
      why: function (s) { return s.relay.CR2 ? 'the CR2 coil is energized, so its normally open contact is closed' : 'the CR2 coil is not energized, so its normally open contact is open'; } },
    SS2: { label: 'SS2', kind: 'contact',
      closed: function (s) { return s.sw.SS2 && !s.faults.ss2Open; },
      why: function (s, rev) {
        if (!s.sw.SS2) return 'selector SS2 is in RETRACT (open)';
        if (s.faults.ss2Open) return rev ? 'the SS2 contact is open even though it is turned to EXTEND' : 'voltage is not passing SS2';
        return 'selector SS2 is in EXTEND (closed)';
      } },
    SOL1: { label: 'SOL1', kind: 'load', load: true, r: 120,
      open: function (s) { return s.faults.sol1Open; },
      why: function (s, rev) { return rev ? 'the SOL1 coil winding is open' : 'no current is flowing through SOL1'; } }
  };

  /* Circuits as netlists: [device, node A (supply side), node B (return side)]. */
  var CIRCUITS = {
    lamp: { els: [['F1', 'L+', '1'], ['S1', '1', '2a'], ['W2', '2a', '2b'], ['PL1', '2b', '0V']] },
    ladA: { els: [['S1', 'L+', '1'], ['PL1', '1', '0V']] },
    ladB: { els: [['S1', 'L+', '1'], ['S2', '1', '2'], ['PL1', '2', '0V']] },
    ladC: { els: [['S1', 'L+', '1'], ['S2', 'L+', '1'], ['PL1', '1', '0V']] },
    ladD: { els: [['S1', 'L+', '1'], ['CR1', '1', '0V'], ['CR1-1', 'L+', '2'], ['PL1', '2', '0V']] },
    starter: { els: [['PB1', 'L+', '1'], ['OL1', '1', '2'], ['PB2', '2', '3'], ['M1-AUX', '2', '3'], ['M1', '3', '0V']] },
    plc: { els: [['PEC1', 'L+', 'I0'], ['I0', 'I0', '0V'], ['Q0', 'L+', 'Q0'], ['CR2', 'Q0', '0V'], ['CR2-1', 'L+', '5'], ['PL2', '5', '0V']] },
    pneu: { els: [['SS2', 'L+', '1'], ['SOL1', '1', '0V']] }
  };

  function nodesOf(cid) {
    var seen = {}, out = [];
    CIRCUITS[cid].els.forEach(function (e) {
      [e[1], e[2]].forEach(function (n) { if (!seen[n]) { seen[n] = 1; out.push(n); } });
    });
    if (!seen['L+']) out.push('L+');
    if (!seen['0V']) out.push('0V');
    return out;
  }

  function isClosed(id, s) {
    var d = DEV[id];
    if (d.load) return d.open ? !d.open(s) : true;
    return d.closed(s);
  }

  /* Nodal analysis. `fixed` maps node -> volts; `inject` maps node -> amps. */
  function nodal(cid, s, fixed, inject) {
    var nodes = nodesOf(cid), n = nodes.length, idx = {}, i, j, k;
    nodes.forEach(function (name, p) { idx[name] = p; });
    var G = [], b = [];
    for (i = 0; i < n; i++) { G.push(new Array(n).fill(0)); b.push(0); }
    CIRCUITS[cid].els.forEach(function (e) {
      if (!isClosed(e[0], s)) return;
      var g = 1 / (DEV[e[0]].r || 0.01), a = idx[e[1]], c = idx[e[2]];
      G[a][a] += g; G[c][c] += g; G[a][c] -= g; G[c][a] -= g;
    });
    for (i = 0; i < n; i++) G[i][i] += 1e-9; // tiny leak so floating nodes settle at 0 V
    Object.keys(inject || {}).forEach(function (name) { b[idx[name]] += inject[name]; });
    Object.keys(fixed).forEach(function (name) {
      var p = idx[name];
      for (j = 0; j < n; j++) G[p][j] = 0;
      G[p][p] = 1; b[p] = fixed[name];
    });
    // Gaussian elimination with partial pivoting
    for (i = 0; i < n; i++) {
      var piv = i;
      for (k = i + 1; k < n; k++) if (Math.abs(G[k][i]) > Math.abs(G[piv][i])) piv = k;
      var t = G[i]; G[i] = G[piv]; G[piv] = t;
      var tb = b[i]; b[i] = b[piv]; b[piv] = tb;
      for (k = i + 1; k < n; k++) {
        var f = G[k][i] / G[i][i];
        if (!f) continue;
        for (j = i; j < n; j++) G[k][j] -= f * G[i][j];
        b[k] -= f * b[i];
      }
    }
    var x = new Array(n).fill(0);
    for (i = n - 1; i >= 0; i--) {
      var sum = b[i];
      for (j = i + 1; j < n; j++) sum -= G[i][j] * x[j];
      x[i] = sum / G[i][i];
    }
    var V = {};
    nodes.forEach(function (name, p) { V[name] = x[p]; });
    return V;
  }

  /* Nodes tied to a supply terminal through conducting devices. Anything else is floating. */
  function tied(cid, s) {
    var seen = { 'L+': 1, '0V': 1 }, changed = true;
    while (changed) {
      changed = false;
      CIRCUITS[cid].els.forEach(function (e) {
        if (!isClosed(e[0], s)) return;
        if (seen[e[1]] && !seen[e[2]]) { seen[e[2]] = 1; changed = true; }
        if (seen[e[2]] && !seen[e[1]]) { seen[e[1]] = 1; changed = true; }
      });
    }
    return seen;
  }
  /* Number of separate conducting routes between two nodes (supply treated as open). */
  function routes(cid, s, a, b) {
    var els = CIRCUITS[cid].els, n = 0;
    (function walk(node, used, seen) {
      if (node === b) { n++; return; }
      els.forEach(function (e) {
        if (used[e[0]] || !isClosed(e[0], s)) return;
        var nxt = e[1] === node ? e[2] : (e[2] === node ? e[1] : null);
        if (nxt === null || seen[nxt]) return;
        used[e[0]] = 1; seen[nxt] = 1; walk(nxt, used, seen); delete seen[nxt]; delete used[e[0]];
      });
    })(a, {}, (function () { var o = {}; o[a] = 1; return o; })());
    return n;
  }

  /* Solve node voltages and per-device voltage/current for the present state. */
  function solve(cid, s) {
    var fixed = { '0V': 0 };
    if (powered(s)) fixed['L+'] = VS;
    var V = nodal(cid, s, fixed), el = {};
    CIRCUITS[cid].els.forEach(function (e) {
      var d = DEV[e[0]], closed = isClosed(e[0], s), v = V[e[1]] - V[e[2]];
      var i = closed ? v / (d.r || 0.01) : 0;
      el[e[0]] = { closed: closed, v: v, i: i, flow: Math.abs(i) > 1e-4, on: !!d.load && closed && Math.abs(v) >= 0.8 * VS };
    });
    return { V: V, el: el, tied: tied(cid, s) };
  }

  /* Settle relays and PLC logic to a stable state. Mutates s.relay / s.plc. */
  function settle(cid, s) {
    var res, k;
    for (k = 0; k < 10; k++) {
      res = solve(cid, s);
      var changed = false;
      CIRCUITS[cid].els.forEach(function (e) {
        var d = DEV[e[0]];
        if (d.relay && s.relay[d.relay] !== res.el[e[0]].on) { s.relay[d.relay] = res.el[e[0]].on; changed = true; }
      });
      if (cid === 'plc') {
        var i0 = res.el.I0.on, q0 = i0 && powered(s); // program: Q0 follows I0
        if (s.plc.I0 !== i0 || s.plc.Q0 !== q0) { s.plc.I0 = i0; s.plc.Q0 = q0; changed = true; }
      }
      if (!changed) break;
    }
    return res;
  }

  function setPath(s, path, value) {
    if (path === 'supply') { s.supply = !!value; if (value) s.zeroVerified = false; return; }
    var parts = path.split('.'), o = s;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
  }
  function getPath(s, path) {
    return path.split('.').reduce(function (o, k) { return o[k]; }, s);
  }
  function patch(s, p) { Object.keys(p || {}).forEach(function (k) { setPath(s, k, p[k]); }); return s; }

  /* Run a list of state patches in order, settling after each (used by demos, quizzes, tests). */
  function run(cid, s, steps) {
    var res = settle(cid, s);
    (steps || []).forEach(function (p) { patch(s, p); res = settle(cid, s); });
    return res;
  }

  /* All simple routes from L+ to 0V, each as an ordered list of device ids. */
  function paths(cid) {
    var els = CIRCUITS[cid].els, out = [];
    (function walk(node, used, seq, seen) {
      if (node === '0V') { out.push(seq.slice()); return; }
      els.forEach(function (e) {
        if (used[e[0]]) return;
        var nxt = e[1] === node ? e[2] : (e[2] === node ? e[1] : null);
        if (nxt === null || seen[nxt]) return;
        used[e[0]] = 1; seen[nxt] = 1; seq.push(e[0]);
        walk(nxt, used, seq, seen);
        seq.pop(); delete seen[nxt]; delete used[e[0]];
      });
    })('L+', {}, [], { 'L+': 1 });
    return out;
  }

  function fmtPath(p) { return 'L+ → ' + p.map(function (id) { return DEV[id].label; }).join(' → ') + ' → 0V'; }

  function firstOpen(p, s) {
    for (var i = 0; i < p.length; i++) if (!isClosed(p[i], s)) return p[i];
    return null;
  }

  function whyOf(id, s, reveal) {
    var d = DEV[id];
    if (d.why) return d.why(s, reveal);
    return d.label + ' is a load';
  }

  /* Plain-English cause-and-effect narrative for the current circuit state. */
  function explain(cid, s, reveal) {
    var res = solve(cid, s), lines = [], all = paths(cid);
    var pw = powered(s);
    if (!s.supply) lines.push('Control power (24 VDC) is OFF, so no load in this circuit can be energized.');
    else if (!pw) lines.push(reveal ? 'There is no 24 VDC at the L+ rail: the control supply is missing.' : 'No load in this circuit is being energized.');
    CIRCUITS[cid].els.forEach(function (e) {
      var id = e[0], d = DEV[id];
      if (!d.load) return;
      var mine = all.filter(function (p) { return p.indexOf(id) >= 0; });
      if (res.el[id].on) {
        var good = mine.filter(function (p) { return !firstOpen(p, s); })[0];
        lines.push(d.label + ' is ON: there is a complete path ' + fmtPath(good || mine[0]) + ', and ' + Math.abs(res.el[id].v).toFixed(1) + ' V appears across its two terminals.');
      } else if (pw) {
        mine.forEach(function (p) {
          var fo = firstOpen(p, s);
          if (fo) lines.push(d.label + ' is OFF: the path ' + fmtPath(p) + ' stops at ' + DEV[fo].label + ' — ' + whyOf(fo, s, reveal) + '.');
        });
      } else {
        lines.push(d.label + ' is OFF.');
      }
    });
    return lines;
  }

  /* Check a user-traced path (set of device ids) against the circuit. */
  function checkTrace(cid, s, ids) {
    var all = paths(cid), set = {}, n = 0;
    ids.forEach(function (id) { if (!set[id]) { set[id] = 1; n++; } });
    if (!n) return { ok: false, msg: 'Nothing selected yet. Click each device along one route from L+ to 0V.' };
    var exact = all.filter(function (p) { return p.length === n && p.every(function (id) { return set[id]; }); })[0];
    if (exact) {
      if (!powered(s)) return { ok: false, valid: true, msg: 'That is a valid route on the drawing, but control power is off, so it is not conducting.' };
      var fo = firstOpen(exact, s);
      if (!fo) return { ok: true, valid: true, path: exact, msg: 'Correct. ' + fmtPath(exact) + ' is a complete path, so current flows through the load.' };
      return { ok: false, valid: true, stop: fo, msg: 'That is a real route on the drawing, but it is interrupted at ' + DEV[fo].label + ': ' + whyOf(fo, s, true) + '. Current cannot flow along a path with a gap in it.' };
    }
    var partial = all.filter(function (p) { return ids.every(function (id) { return p.indexOf(id) >= 0; }); })[0];
    if (partial) {
      var missing = partial.filter(function (id) { return !set[id]; }).map(function (id) { return DEV[id].label; });
      return { ok: false, msg: 'You are on a real route, but it is not finished. Still missing: ' + missing.join(', ') + '. A path must run all the way from L+ to 0V.' };
    }
    return { ok: false, msg: 'Those devices do not lie on one single route from L+ to 0V. Devices in parallel branches are alternatives: one path uses only one branch. Clear and try again.' };
  }

  /* Virtual meter. Readings come only from the solved circuit and the two probe nodes. */
  function meter(cid, s, mode, a, b) {
    if (!a || !b) return { text: '– – –', note: 'Place both probes on test points (the numbered squares on the drawing).' };
    if (mode === 'V') {
      var res = solve(cid, s);
      var fl = !res.tied[a] ? a : (!res.tied[b] ? b : null);
      if (fl) {
        return { na: true, text: 'Not modeled', note: 'Not modeled in this exercise. Point ' + fl + ' is not connected to either supply terminal in this state (it is floating), so a real meter reading there would not be dependable. Operate the devices in the path or choose another point.' };
      }
      var v = res.V[a] - res.V[b];
      v = Math.round(v * 10) / 10 || 0;
      var note = 'Red probe on ' + a + ', black probe (reference) on ' + b + ': point ' + a + ' is ' + Math.abs(v).toFixed(1) + ' V ' + (v < 0 ? 'below' : 'above') + ' point ' + b + '.' + (v < 0 ? ' The sign is negative because the probes are reversed relative to the supply polarity.' : '');
      var src = (a === 'L+' && b === '0V') || (a === '0V' && b === 'L+');
      if (src && !s.supply && Math.abs(v) < 0.5) {
        s.zeroVerified = true;
        note = 'Absence of voltage verified between L+ and 0V. Continuity checks are now allowed until power is restored.';
      }
      return { ok: true, value: v, text: v.toFixed(1) + ' V DC', note: note, a: a, b: b };
    }
    if (s.supply) {
      return { blocked: true, text: 'BLOCKED', note: 'This circuit is energized. Resistance and continuity checks need the circuit isolated first. Switch control power OFF, then verify 0 V between L+ and 0V on the DC volts setting, then retry.' };
    }
    if (!s.zeroVerified) {
      return { blocked: true, text: 'BLOCKED', note: 'Control power is switched off, but absence of voltage is not verified yet. Set the meter to DC V, put the probes on L+ and 0V, and confirm 0.0 V. Then retry continuity.' };
    }
    if (a === b) return { ok: true, value: 0, text: '0.0 Ω  ·  beep', note: 'Both probes are on the same point.' };
    var fixed = {}, inj = {};
    fixed[b] = 0; inj[a] = 1;
    var r = nodal(cid, s, fixed, inj)[a], par = routes(cid, s, a, b) > 1 ? ' More than one conducting route joins these two points, so this reading is their combination: it does not test one device on its own.' : '';
    if (r > 1e6) return { ok: true, value: Infinity, text: 'OL (open)', note: 'No continuity between the probes: there is a gap somewhere between these two points.' };
    if (r < 1) return { ok: true, value: r, text: r.toFixed(1) + ' Ω  ·  beep', note: 'Continuity: a low-resistance path exists. A beep does not prove a device is healthy under operating conditions.' + par };
    return { ok: true, value: r, text: Math.round(r) + ' Ω', note: 'The meter is reading through a load (a coil or lamp). Continuity alone does not prove correct operation under load.' + par };
  }

  /* One-off reading on a copy of the state (used for troubleshooting evidence). */
  function probe(cid, s, o) {
    var c = clone(s);
    patch(c, o.set);
    settle(cid, c);
    if (o.mode === 'R') { c.supply = false; settle(cid, c); patch(c, o.setIsolated); c.zeroVerified = true; }
    return meter(cid, c, o.mode || 'V', o.a, o.b);
  }

  /* Fluid power: derived pressure flags and cylinder motion. */
  function fluid(s, solOn) {
    var p0 = !s.faults.airOff, p = p0 && s.air;
    return { p0: p0, p: p, act: !!solOn, pA: p && !!solOn, pB: p && !solOn, bar: p ? 6 : 0 };
  }
  function tickCylinder(s, solOn, dt, instant) {
    var f = fluid(s, solOn);
    if (!f.p) return false; // no supply pressure: the cylinder is not driven
    var target = f.act ? 1 : 0;
    if (s.cyl === target) return false;
    if (instant) { s.cyl = target; return true; }
    var step = dt * 0.9;
    s.cyl = target > s.cyl ? Math.min(target, s.cyl + step) : Math.max(target, s.cyl - step);
    return true;
  }

  FS.sim = {
    VS: VS, DEV: DEV, CIRCUITS: CIRCUITS,
    defaultState: defaultState, clone: clone, solve: solve, settle: settle, run: run,
    patch: patch, setPath: setPath, getPath: getPath, paths: paths, fmtPath: fmtPath,
    isClosed: isClosed, explain: explain, checkTrace: checkTrace, meter: meter, probe: probe,
    fluid: fluid, tickCylinder: tickCylinder, whyOf: whyOf, firstOpen: firstOpen, powered: powered, tied: tied, routes: routes
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FS;
})(typeof window !== 'undefined' ? window : globalThis);
