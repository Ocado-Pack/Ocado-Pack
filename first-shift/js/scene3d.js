/* FIRST SHIFT — 3D training room (three.js, procedural geometry only).
 * One room, five stations. Every moving or lit part is driven by the `view`
 * object the app derives from the simulation state. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  var THREE = root.THREE;
  var sc = {};
  var el, renderer, scene, camera, objs = {}, stationOf = {}, dyn = {}, pickCb = function () {}, rm = false;
  var benchRoot, benchItems = [], selHelper = null, selMarker = null, display = null, strips = [], rollers = [], boxMesh, boxState = { x: -2.6, phase: 'away' };
  var view = {}, clock = 0;
  var cam = { t: null, theta: 0, phi: 1.12, r: 11.5, g: null };
  var mats = {};

  var VIEWS = {
    overview: { t: [0, 1.3, -1.6], r: 11.5, theta: 0, phi: 1.12 },
    panel: { t: [-3.9, 1.45, -4.0], r: 4.4, theta: 0.12, phi: 1.36 },
    display: { t: [0, 2.35, -4.4], r: 5.2, theta: 0, phi: 1.42 },
    bench: { t: [4.3, 1.15, -3.7], r: 2.7, theta: -0.08, phi: 1.2 },
    conveyor: { t: [-0.8, 0.95, 0.7], r: 5.6, theta: 0.22, phi: 1.08 },
    pneu: { t: [4.3, 1.15, 0.8], r: 3.3, theta: -0.25, phi: 1.2 }
  };

  /* ---------------------------------------------------------------- helpers */
  function mat(color, o) {
    if (o && (o.unique || o.transparent)) {
      return new THREE.MeshLambertMaterial({ color: color, transparent: !!o.transparent, opacity: o.opacity == null ? 1 : o.opacity, emissive: 0x000000 });
    }
    if (!mats[color]) mats[color] = new THREE.MeshLambertMaterial({ color: color });
    return mats[color];
  }
  function G(parent, x, y, z) { var o = new THREE.Group(); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
  function B(p, w, h, d, c, x, y, z, o) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x || 0, y || 0, z || 0); p.add(m); return m;
  }
  function C(p, r, h, c, x, y, z, axis, o) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, (o && o.r2) || r, h, 20), mat(c, o));
    if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.position.set(x || 0, y || 0, z || 0); p.add(m); return m;
  }
  function label(text, h, opts) {
    opts = opts || {};
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d'), fs = 44;
    ctx.font = '700 ' + fs + 'px ui-monospace, Menlo, Consolas, monospace';
    var w = Math.ceil(ctx.measureText(text).width) + 28;
    cv.width = w; cv.height = 64;
    ctx.fillStyle = opts.bg || 'rgba(18,24,32,.88)';
    ctx.fillRect(0, 0, w, 64);
    if (opts.border) { ctx.strokeStyle = opts.border; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, 58); }
    ctx.font = '700 ' + fs + 'px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle = opts.fg || '#ffffff'; ctx.textBaseline = 'middle'; ctx.fillText(text, 14, 34);
    var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: opts.onTop ? false : true, transparent: true }));
    sp.scale.set(h * w / 64, h, 1); sp.renderOrder = opts.onTop ? 10 : 1;
    return sp;
  }
  function reg(ref, obj, station, tag, tagPos) {
    obj.userData.ref = ref; objs[ref] = obj; stationOf[ref] = station;
    if (tag !== false && obj.parent) {   // tag sits beside the device (not inside it) so selection boxes stay tight
      var l = label(tag || ref, 0.1), q = tagPos || [0, 0.19, 0.06];
      l.position.copy(obj.position); l.position.x += q[0]; l.position.y += q[1]; l.position.z += q[2]; obj.parent.add(l);
    }
    return obj;
  }
  function glow(mesh, on, color) { mesh.material.emissive.setHex(on ? color : 0x000000); }

  /* ---------------------------------------------------------------- reusable device models
   * Each builder returns a group roughly 0.1–0.4 m across, facing +z. */
  var build = {
    psu: function () { var g = G(); B(g, 0.3, 0.24, 0.12, 0x586472); B(g, 0.26, 0.05, 0.02, 0xcfd6dc, 0, -0.08, 0.065); g.userData.led = C(g, 0.012, 0.01, 0x2a3a2a, 0.1, 0.07, 0.062, 'z', { unique: true }); for (var i = -2; i <= 2; i++) B(g, 0.02, 0.012, 0.004, 0x30363c, i * 0.04, 0.02, 0.062); return g; },
    fuse: function () { var g = G(); B(g, 0.07, 0.18, 0.09, 0xe9e2cf); g.userData.cart = C(g, 0.017, 0.11, 0xd8ecf2, 0, 0, 0.055, 'y'); C(g, 0.019, 0.02, 0xb9bec4, 0, 0.055, 0.055, 'y'); C(g, 0.019, 0.02, 0xb9bec4, 0, -0.055, 0.055, 'y'); return g; },
    fuse3: function () { var g = G(); for (var i = -1; i <= 1; i++) { var f = build.fuse(); f.position.x = i * 0.085; g.add(f); } return g; },
    breaker: function () { var g = G(); B(g, 0.09, 0.2, 0.1, 0xf1f1ee); B(g, 0.03, 0.055, 0.04, 0x1e2226, 0, 0.01, 0.06); B(g, 0.07, 0.02, 0.01, 0x8a9199, 0, 0.085, 0.051); return g; },
    disconnect: function () { var g = G(); B(g, 0.22, 0.24, 0.08, 0xd8dbd6); B(g, 0.16, 0.16, 0.012, 0xf2c200, 0, 0, 0.045); g.userData.handle = G(g, 0, 0, 0.06); B(g.userData.handle, 0.04, 0.13, 0.04, 0xc62828); return g; },
    button: function (color) { var g = G(); C(g, 0.047, 0.02, 0xbfc5cb, 0, 0, 0.01, 'z'); g.userData.cap = C(g, 0.036, 0.035, color, 0, 0, 0.035, 'z'); return g; },
    button_green: function () { return build.button(0x2e9d48); },
    button_red: function () { return build.button(0xd03030); },
    selector: function () { var g = G(); C(g, 0.047, 0.02, 0xbfc5cb, 0, 0, 0.01, 'z'); g.userData.knob = G(g, 0, 0, 0.035); C(g.userData.knob, 0.032, 0.035, 0x20252b, 0, 0, 0, 'z'); B(g.userData.knob, 0.014, 0.06, 0.02, 0xf2f2f2, 0, 0.012, 0.012); return g; },
    pilot: function (color) { var g = G(); C(g, 0.047, 0.02, 0xbfc5cb, 0, 0, 0.01, 'z'); g.userData.lens = C(g, 0.036, 0.03, color || 0x8a2a2a, 0, 0, 0.033, 'z', { unique: true }); return g; },
    relay: function () { var g = G(); B(g, 0.09, 0.05, 0.1, 0x22272d, 0, -0.085, 0); B(g, 0.078, 0.13, 0.085, 0x9fc4e8, 0, 0.005, 0, { transparent: true, opacity: 0.6 }); B(g, 0.04, 0.07, 0.04, 0xb87333, 0, -0.01, 0); g.userData.flag = B(g, 0.03, 0.014, 0.004, 0x3a3f45, 0, 0.05, 0.045, { unique: true }); return g; },
    contactor: function () { var g = G(); B(g, 0.2, 0.22, 0.14, 0xe7e2d3); for (var i = -1; i <= 1; i++) { C(g, 0.014, 0.012, 0x8d949b, i * 0.06, 0.085, 0.072, 'z'); C(g, 0.014, 0.012, 0x8d949b, i * 0.06, -0.085, 0.072, 'z'); } B(g, 0.1, 0.07, 0.02, 0x2a2f35, 0, 0, 0.075); g.userData.arm = B(g, 0.05, 0.035, 0.03, 0x3f7fd0, 0, 0, 0.095, { unique: true }); return g; },
    aux: function () { var g = G(); B(g, 0.2, 0.22, 0.1, 0xe7e2d3, 0, 0, -0.03, { transparent: true, opacity: 0.35 }); B(g, 0.07, 0.11, 0.07, 0xf0c33c, 0, 0, 0.05); C(g, 0.012, 0.012, 0x8d949b, 0, 0.035, 0.087, 'z'); C(g, 0.012, 0.012, 0x8d949b, 0, -0.035, 0.087, 'z'); return g; },
    overload: function () { var g = G(); B(g, 0.2, 0.12, 0.12, 0xd9d4c6); C(g, 0.016, 0.02, 0x2f6fd0, -0.06, 0.01, 0.065, 'z'); C(g, 0.022, 0.012, 0xf4f4f4, 0.02, 0.01, 0.063, 'z'); g.userData.flag = B(g, 0.03, 0.03, 0.014, 0xd03030, 0.075, 0.01, 0.066); g.userData.flag.visible = false; return g; },
    motor: function () { var g = G(); C(g, 0.16, 0.36, 0x3d6ea6, 0, 0, 0, 'x'); for (var i = -3; i <= 3; i++) C(g, 0.172, 0.012, 0x345f90, i * 0.045, 0, 0, 'x'); C(g, 0.13, 0.05, 0x2c4f78, 0.2, 0, 0, 'x'); g.userData.shaft = G(g, 0.27, 0, 0); C(g.userData.shaft, 0.03, 0.12, 0xc9cdd2, 0, 0, 0, 'x'); B(g.userData.shaft, 0.03, 0.075, 0.012, 0xe0b020, 0.03, 0, 0); B(g, 0.3, 0.03, 0.3, 0x2c4f78, 0, -0.17, 0); B(g, 0.11, 0.07, 0.1, 0x2c4f78, -0.02, 0.18, 0); return g; },
    terminal: function () { var g = G(); for (var i = 0; i < 9; i++) { B(g, 0.028, 0.09, 0.07, i % 2 ? 0xd9d2bd : 0xcfc8b2, (i - 4) * 0.03, 0, 0); C(g, 0.008, 0.008, 0x80868c, (i - 4) * 0.03, 0.022, 0.037, 'z'); C(g, 0.008, 0.008, 0x80868c, (i - 4) * 0.03, -0.022, 0.037, 'z'); } return g; },
    earth: function () { var g = G(); B(g, 0.3, 0.03, 0.03, 0xc9a23a); for (var i = -2; i <= 2; i++) C(g, 0.009, 0.012, 0x80868c, i * 0.055, 0, 0.018, 'z'); C(g, 0.012, 0.16, 0x4caf50, 0.12, -0.08, 0.02, 'y'); C(g, 0.0125, 0.03, 0xf2d100, 0.12, -0.07, 0.02, 'y'); return g; },
    transformer: function () { var g = G(); B(g, 0.24, 0.18, 0.1, 0x3a3f46); B(g, 0.08, 0.13, 0.15, 0xb87333, -0.05, 0, 0); B(g, 0.08, 0.13, 0.15, 0xc98a3d, 0.05, 0, 0); B(g, 0.24, 0.03, 0.06, 0xd9d2bd, 0, 0.105, 0.03); return g; },
    solenoid: function () { var g = G(); B(g, 0.2, 0.06, 0.07, 0xb9bfc6, 0.03, -0.03, 0); B(g, 0.07, 0.08, 0.075, 0x1e2226, -0.06, 0.04, 0); g.userData.led = B(g, 0.02, 0.012, 0.006, 0x3a3020, -0.06, 0.06, 0.04, { unique: true }); C(g, 0.012, 0.03, 0xc9a23a, 0.07, 0.01, 0, 'y'); C(g, 0.012, 0.03, 0xc9a23a, 0.11, 0.01, 0, 'y'); return g; },
    limit: function () { var g = G(); B(g, 0.08, 0.13, 0.05, 0xd8c24a); B(g, 0.014, 0.1, 0.014, 0x9aa1a8, 0.02, 0.1, 0.02); C(g, 0.024, 0.02, 0x2a2f35, 0.02, 0.155, 0.02, 'z'); return g; },
    prox: function () { var g = G(); C(g, 0.03, 0.15, 0xbfc5cb, 0, 0, 0, 'x'); C(g, 0.031, 0.02, 0x2f6fd0, 0.08, 0, 0, 'x'); C(g, 0.038, 0.014, 0x8d949b, -0.02, 0, 0, 'x'); C(g, 0.038, 0.014, 0x8d949b, 0.02, 0, 0, 'x'); C(g, 0.01, 0.12, 0x1e2226, -0.13, 0, 0, 'x'); return g; },
    photo: function () { var g = G(); B(g, 0.06, 0.09, 0.045, 0x24292f); B(g, 0.062, 0.02, 0.047, 0xf2c200, 0, 0.03, 0); C(g, 0.018, 0.01, 0x6aa9e0, 0, -0.012, 0.024, 'z'); g.userData.led = B(g, 0.014, 0.008, 0.01, 0x3a3020, 0.012, 0.047, 0, { unique: true }); g.userData.pwr = B(g, 0.014, 0.008, 0.01, 0x203020, -0.012, 0.047, 0, { unique: true }); return g; },
    plc: function () { var g = G(); B(g, 0.46, 0.26, 0.12, 0x2f3640); B(g, 0.42, 0.035, 0.03, 0xcfd6dc, 0, 0.1, 0.055); B(g, 0.42, 0.035, 0.03, 0xcfd6dc, 0, -0.1, 0.055); B(g, 0.16, 0.08, 0.01, 0x8fa3b5, -0.11, 0, 0.062); g.userData.leds = []; for (var i = 0; i < 6; i++) { g.userData.leds.push(B(g, 0.016, 0.016, 0.008, 0x39424c, 0.03 + (i % 3) * 0.035, i < 3 ? 0.03 : -0.03, 0.062, { unique: true })); } g.userData.pwr = B(g, 0.016, 0.016, 0.008, 0x203020, 0.18, 0.03, 0.062, { unique: true }); return g; },
    resistor: function () { var g = G(); C(g, 0.03, 0.14, 0xd7c49a, 0, 0, 0, 'x'); [0x8b4513, 0x111111, 0xd03030, 0xc9a23a].forEach(function (c, i) { C(g, 0.0315, 0.012, c, -0.04 + i * 0.027, 0, 0, 'x'); }); C(g, 0.006, 0.3, 0xb9bec4, 0, 0, 0, 'x'); return g; },
    capacitor: function () { var g = G(); C(g, 0.05, 0.14, 0x26436e, 0, 0.02, 0, 'y'); C(g, 0.051, 0.02, 0xc9cdd2, 0, 0.085, 0, 'y'); C(g, 0.006, 0.08, 0xb9bec4, -0.02, -0.09, 0, 'y'); C(g, 0.006, 0.08, 0xb9bec4, 0.02, -0.09, 0, 'y'); return g; },
    diode: function () { var g = G(); C(g, 0.028, 0.11, 0x20252b, 0, 0, 0, 'x'); C(g, 0.029, 0.016, 0xd9dde2, 0.035, 0, 0, 'x'); C(g, 0.006, 0.28, 0xb9bec4, 0, 0, 0, 'x'); return g; },
    rectifier: function () { var g = G(); B(g, 0.14, 0.14, 0.05, 0x20252b); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { C(g, 0.008, 0.08, 0xb9bec4, q[0] * 0.045, q[1] * 0.045, 0.05, 'z'); }); C(g, 0.016, 0.052, 0x8d949b, 0, 0, 0, 'z'); return g; },
    vfd: function () { var g = G(); B(g, 0.17, 0.32, 0.15, 0x4a525c); B(g, 0.11, 0.05, 0.01, 0x9fe0c0, 0, 0.09, 0.077); for (var i = 0; i < 6; i++) B(g, 0.025, 0.02, 0.01, 0xd9dde2, -0.035 + (i % 3) * 0.035, 0.03 - Math.floor(i / 3) * 0.03, 0.077); B(g, 0.15, 0.04, 0.03, 0x2a2f35, 0, -0.13, 0.07); return g; },
    wire: function () { var g = G(); C(g, 0.014, 0.34, 0xd03030, 0, 0, 0, 'x'); C(g, 0.008, 0.05, 0xc98a3d, 0.19, 0, 0, 'x'); C(g, 0.008, 0.05, 0xc98a3d, -0.19, 0, 0, 'x'); C(g, 0.019, 0.04, 0xf2f2f2, 0.12, 0, 0, 'x'); C(g, 0.019, 0.04, 0xf2f2f2, -0.12, 0, 0, 'x'); return g; },
    junction: function () { var g = G(); B(g, 0.05, 0.07, 0.06, 0xd9d2bd); C(g, 0.012, 0.16, 0xd03030, -0.1, 0, 0, 'x'); C(g, 0.012, 0.16, 0xd03030, 0.1, 0, 0, 'x'); C(g, 0.012, 0.14, 0xd03030, 0, -0.1, 0, 'y'); C(g, 0.01, 0.01, 0x80868c, 0, 0, 0.032, 'z'); return g; },
    crossing: function () { var g = G(); C(g, 0.012, 0.34, 0xd03030, 0, 0, 0, 'x'); C(g, 0.012, 0.3, 0x2f6fd0, 0, 0, 0.04, 'y'); return g; },
    compressor: function () { var g = G(); C(g, 0.025, 0.3, 0x2f6fd0, 0, 0.05, 0, 'y'); C(g, 0.035, 0.05, 0xc9a23a, 0, -0.1, 0, 'y'); C(g, 0.02, 0.06, 0xb9bec4, 0, -0.15, 0, 'y'); return g; },
    shutoff: function () { var g = G(); B(g, 0.09, 0.07, 0.07, 0xc9a23a); C(g, 0.02, 0.16, 0xb9bec4, 0, 0, 0, 'x'); g.userData.lever = G(g, 0, 0.045, 0); B(g.userData.lever, 0.14, 0.02, 0.03, 0xd03030, 0.05, 0, 0); return g; },
    frl: function () { var g = G(); B(g, 0.11, 0.06, 0.08, 0x8d949b, 0, 0.03, 0); C(g, 0.04, 0.12, 0xbfe0ee, 0, -0.06, 0, 'y', { transparent: true, opacity: 0.65 }); C(g, 0.03, 0.05, 0x20252b, 0, 0.085, 0, 'y'); C(g, 0.016, 0.2, 0xb9bec4, 0, 0.03, 0, 'x'); return g; },
    gauge: function () { var g = G(); C(g, 0.062, 0.03, 0x20252b, 0, 0, 0, 'z'); C(g, 0.054, 0.032, 0xf6f6f2, 0, 0, 0.002, 'z'); g.userData.needle = G(g, 0, 0, 0.02); B(g.userData.needle, 0.006, 0.045, 0.004, 0xd03030, 0, 0.02, 0); C(g, 0.012, 0.06, 0xc9a23a, 0, -0.085, 0, 'y'); return g; },
    valve: function () { var g = G(); B(g, 0.22, 0.07, 0.08, 0xb9bfc6); B(g, 0.07, 0.085, 0.085, 0x1e2226, -0.145, 0.005, 0); g.userData.led = B(g, 0.024, 0.014, 0.006, 0x3a3020, -0.145, 0.03, 0.045, { unique: true }); C(g, 0.03, 0.05, 0x8d949b, 0.135, 0, 0, 'x'); [-0.05, 0.05].forEach(function (x) { C(g, 0.013, 0.04, 0xc9a23a, x, 0.05, 0, 'y'); }); [-0.07, 0, 0.07].forEach(function (x) { C(g, 0.013, 0.04, 0xc9a23a, x, -0.05, 0, 'y'); }); return g; },
    cylinder: function () { var g = G(); C(g, 0.055, 0.5, 0xc9cdd2, 0, 0, 0, 'x'); B(g, 0.03, 0.13, 0.13, 0x586472, -0.25, 0, 0); B(g, 0.03, 0.13, 0.13, 0x586472, 0.25, 0, 0); g.userData.rod = G(g, 0.27, 0, 0); C(g.userData.rod, 0.02, 0.5, 0xe6e9ec, 0, 0, 0, 'x'); B(g.userData.rod, 0.03, 0.16, 0.2, 0xf2c200, 0.26, 0, 0); return g; },
    fitting: function () { var g = G(); C(g, 0.028, 0.07, 0xc9a23a, 0, 0, 0, 'x'); C(g, 0.02, 0.07, 0xc9a23a, 0, -0.05, 0, 'y'); C(g, 0.016, 0.05, 0x20252b, 0, 0.05, 0, 'y'); C(g, 0.03, 0.02, 0x2f6fd0, 0.045, 0, 0, 'x'); return g; },
    pump: function () { var g = G(); C(g, 0.09, 0.2, 0x3d6ea6, -0.08, 0, 0, 'x'); B(g, 0.12, 0.14, 0.14, 0x586472, 0.09, 0, 0); C(g, 0.02, 0.08, 0x20252b, 0.09, 0.1, 0, 'y'); B(g, 0.34, 0.02, 0.18, 0x2a2f35, 0, -0.1, 0); return g; },
    tank: function () { var g = G(); B(g, 0.3, 0.18, 0.2, 0x586472); C(g, 0.03, 0.04, 0xd03030, -0.08, 0.11, 0, 'y'); B(g, 0.02, 0.1, 0.006, 0xbfe0ee, 0.1, 0, 0.102); return g; }
  };
  sc.build = build;

  /* ---------------------------------------------------------------- room */
  function buildRoom() {
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), mat(0x8e949b)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.2); scene.add(floor);
    B(scene, 16, 5, 0.2, 0xc7ccd1, 0, 2.5, -4.75);
    B(scene, 16, 0.5, 0.21, 0x4b5560, 0, 0.25, -4.74);
    // floor markings around stations (walkway lines)
    [[-3.9, -3.4, 4.4, 0.06], [4.3, -3.2, 3.0, 0.06], [-0.8, 1.6, 6.2, 0.06], [4.3, 1.9, 3.0, 0.06]].forEach(function (q) { B(scene, q[2], 0.01, q[3], 0xf2c200, q[0], 0.006, q[1]); });
  }

  function stationTitle(text, x, y, z) { var l = label(text, 0.17, { bg: 'rgba(242,194,0,.95)', fg: '#161b22' }); l.position.set(x, y, z); scene.add(l); }

  function buildPanel() {
    var p = G(scene, -4.4, 0, -4.2);
    B(p, 1.9, 2.0, 0.06, 0xdfe2e0, 0, 1.4, 0);                 // backplate
    B(p, 0.08, 2.5, 0.08, 0x4b5560, -0.99, 1.25, 0); B(p, 0.08, 2.5, 0.08, 0x4b5560, 0.99, 1.25, 0);
    [2.05, 1.52, 0.86].forEach(function (y) { B(p, 1.7, 0.035, 0.015, 0xaab1b8, 0, y, 0.035); });   // DIN rails
    B(p, 1.7, 0.07, 0.05, 0xb8bec5, 0, 1.22, 0.05);            // wire duct
    function put(ref, kind, x, y, tag, tp) { var d = build[kind](); d.position.set(x, y, 0.06 + (kind === 'psu' ? 0.06 : 0.05)); p.add(d); return reg(ref, d, 'panel', tag, tp); }
    put('PS1', 'psu', -0.68, 2.05);
    put('CB1', 'breaker', -0.36, 2.05);
    put('F1', 'fuse', -0.2, 2.05);
    put('FU', 'fuse3', 0.14, 2.05, 'FU1–3');
    put('DS1', 'disconnect', 0.66, 2.02);
    put('M1', 'contactor', -0.66, 1.56, 'M1', [-0.17, 0.02, 0.1]);
    put('OL1', 'overload', -0.66, 1.37, 'OL1', [-0.19, 0, 0.1]);
    put('CR1', 'relay', -0.3, 1.55);
    put('CR2', 'relay', -0.12, 1.55);
    put('PLC1', 'plc', 0.48, 1.53, 'PLC1', [0, 0.2, 0.06]);
    put('TB1', 'terminal', -0.4, 0.86, 'TB1', [0, 0.12, 0.06]);
    put('PE', 'earth', 0.5, 0.86, 'PE', [0, 0.1, 0.06]);
    // operator door, beside the backplate
    var d = G(scene, -2.9, 0, -4.1);
    B(d, 0.8, 1.3, 0.08, 0xd3d7d4, 0, 1.5, 0); B(d, 0.06, 2.2, 0.06, 0x4b5560, 0, 0.75, -0.06);
    function op(ref, kind, x, y, arg, tag) { var o = build[kind](arg); o.position.set(x, y, 0.04); d.add(o); return reg(ref, o, 'panel', tag, [0, 0.11, 0.05]); }
    op('PB2', 'button', -0.2, 1.92, 0x2e9d48, 'PB2 START');
    op('PB1', 'button', 0.2, 1.92, 0xd03030, 'PB1 STOP');
    op('S1', 'selector', -0.2, 1.55);
    op('S2', 'selector', 0.2, 1.55);
    op('PL1', 'pilot', -0.2, 1.18, 0x7a2222);
    op('PL2', 'pilot', 0.2, 1.18, 0x1f5a2c);
    stationTitle('TRAINING CONTROL PANEL', -3.9, 2.85, -4.1);
  }

  function buildDisplay() {
    B(scene, 3.5, 2.05, 0.08, 0x20252b, 0, 2.35, -4.6);
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 576;
    var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    var m = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.86), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(0, 2.35, -4.55); scene.add(m);
    display = { cv: cv, tex: tex, mesh: m };
    var c = cv.getContext('2d'); c.fillStyle = '#f7f8f9'; c.fillRect(0, 0, 1024, 576);
    stationTitle('SCHEMATIC DISPLAY', 0, 3.58, -4.5);
  }

  function buildBench() {
    var b = G(scene, 4.3, 0, -3.7);
    B(b, 2.4, 0.07, 0.95, 0xb08d5a, 0, 0.92, 0);
    [[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]].forEach(function (q) { B(b, 0.07, 0.9, 0.07, 0x4b5560, q[0], 0.45, q[1]); });
    B(b, 2.4, 0.5, 0.04, 0x596570, 0, 1.25, -0.46);
    benchRoot = G(b, 0, 0.96, 0.05);
    stationTitle('COMPONENT WORKBENCH', 4.3, 1.85, -4.1);
  }

  function buildConveyor() {
    var c = G(scene, -0.8, 0, 0.7);
    B(c, 5.2, 0.06, 0.62, 0x2a2f35, 0, 0.84, 0);                           // belt
    B(c, 5.2, 0.14, 0.05, 0x5b7f9f, 0, 0.82, 0.34); B(c, 5.2, 0.14, 0.05, 0x5b7f9f, 0, 0.82, -0.34);
    [[-2.3, 0.3], [2.3, 0.3], [-2.3, -0.3], [2.3, -0.3], [0, 0.3], [0, -0.3]].forEach(function (q) { B(c, 0.07, 0.78, 0.07, 0x4b5560, q[0], 0.39, q[1]); });
    [-2.6, 2.6].forEach(function (x) { var r = C(c, 0.09, 0.62, 0x9aa1a8, x, 0.8, 0, 'z'); B(r, 0.02, 0.62, 0.2, 0x70777e, 0, 0, 0); rollers.push(r); });
    for (var i = 0; i < 9; i++) { var s = B(c, 0.05, 0.004, 0.56, 0x596570, -2.4 + i * 0.6, 0.872, 0); strips.push(s); }
    var m = build.motor(); m.position.set(-2.25, 0.45, 0.62); m.rotation.y = Math.PI / 2; c.add(m); reg('MTR1', m, 'conveyor', 'MTR1', [0, 0.36, 0]);
    B(c, 0.05, 0.4, 0.05, 0x4b5560, 0.9, 1.0, 0.42);
    var pe = build.photo(); pe.position.set(0.9, 1.12, 0.38); pe.rotation.y = Math.PI; pe.scale.setScalar(1.7); c.add(pe); reg('PEC1', pe, 'conveyor', 'PEC1', [0, 0.14, 0]);
    boxMesh = B(c, 0.42, 0.34, 0.42, 0xb98a4e, -2.6, 1.04, 0); B(boxMesh, 0.43, 0.04, 0.1, 0x8a6535, 0, 0, 0);
    stationTitle('CONVEYOR', -0.8, 1.95, 0.7);
  }

  function buildPneu() {
    var p = G(scene, 4.3, 0, 1.0);
    B(p, 2.3, 0.06, 0.85, 0x9aa1a8, 0, 0.88, 0);
    [[-1.05, -0.35], [1.05, -0.35], [-1.05, 0.35], [1.05, 0.35]].forEach(function (q) { B(p, 0.06, 0.86, 0.06, 0x4b5560, q[0], 0.43, q[1]); });
    B(p, 2.3, 0.85, 0.04, 0xdfe2e0, 0, 1.33, -0.4);
    function put(ref, kind, x, y, z, s, tag, tp) { var d = build[kind](); d.position.set(x, y, z); d.scale.setScalar(s || 1); p.add(d); return reg(ref, d, 'pneu', tag, tp); }
    put('SRC', 'compressor', -0.98, 1.4, -0.33, 1.2, 'AIR', [0, 0.25, 0.05]);
    put('SV1', 'shutoff', -0.72, 1.3, -0.33, 1.2, 'SV1', [0, 0.14, 0.05]);
    put('FRL1', 'frl', -0.42, 1.32, -0.33, 1.3, 'FRL1', [0, 0.16, 0.05]);
    put('PG1', 'gauge', -0.12, 1.36, -0.34, 1.3, 'PG1', [0, 0.11, 0.05]);
    put('V1', 'valve', 0.36, 1.32, -0.33, 1.3, 'V1 + SOL1', [0, 0.13, 0.05]);
    objs.SOL1 = objs.V1; stationOf.SOL1 = 'pneu';
    put('CYL1', 'cylinder', -0.35, 1.0, 0.05, 1.25, 'CYL1', [0, 0.14, 0.08]);
    put('FC', 'fitting', -0.62, 1.1, 0.05, 0.9, false);
    var ss = build.selector(); ss.position.set(0.85, 1.32, -0.36); p.add(ss); B(p, 0.2, 0.2, 0.06, 0xd3d7d4, 0.85, 1.32, -0.38); reg('SS2', ss, 'pneu', 'SS2', [0, 0.14, 0.06]);
    // air lines (kept visually distinct from wires: thick blue tube)
    [[-0.85, 1.3, 0.14], [-0.57, 1.31, 0.14], [0.1, 1.32, 0.3]].forEach(function (q) { C(p, 0.014, q[2], 0x2f8fb8, q[0], q[1], -0.33, 'x'); });
    stationTitle('PNEUMATIC STATION', 4.3, 2.0, 0.6);
  }

  /* ---------------------------------------------------------------- camera */
  function applyCam() {
    var s = Math.sin(cam.phi), t = cam.t;
    camera.position.set(t.x + cam.r * s * Math.sin(cam.theta), t.y + cam.r * Math.cos(cam.phi), t.z + cam.r * s * Math.cos(cam.theta));
    camera.lookAt(t);
  }
  sc.focus = function (name) {
    if (!renderer) return;
    var v = VIEWS[name] || VIEWS.overview;
    cam.g = { t: new THREE.Vector3(v.t[0], v.t[1], v.t[2]), r: v.r, theta: v.theta, phi: v.phi };
    if (rm) { cam.t.copy(cam.g.t); cam.r = cam.g.r; cam.theta = cam.g.theta; cam.phi = cam.g.phi; cam.g = null; applyCam(); }
  };

  /* Glide to a close-up of one part so its label is readable. */
  sc.focusOn = function (ref) {
    if (!renderer) return;
    var o = objs[ref] || (ref === '__bench' ? benchRoot : null);
    if (!o) return;
    var bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3());
    var v = VIEWS[ref === '__bench' ? 'bench' : stationOf[ref]] || VIEWS.overview;
    cam.g = { t: c, r: Math.max(1.5, Math.max(size.x, size.y, size.z) * 2.6 + 1.1), theta: v.theta, phi: 1.3 };
    if (rm) { cam.t.copy(cam.g.t); cam.r = cam.g.r; cam.theta = cam.g.theta; cam.phi = cam.g.phi; cam.g = null; applyCam(); }
  };

  function bindControls() {
    var down = null, moved = 0;
    el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; moved = 0; el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y; moved += Math.abs(dx) + Math.abs(dy);
      down.x = e.clientX; down.y = e.clientY; cam.g = null;
      cam.theta -= dx * 0.006; cam.phi = Math.max(0.35, Math.min(1.5, cam.phi - dy * 0.005));
    });
    el.addEventListener('pointerup', function (e) {
      if (down && moved < 6) pick(e);
      down = null;
    });
    el.addEventListener('pointercancel', function () { down = null; });
    el.addEventListener('wheel', function (e) { e.preventDefault(); cam.g = null; cam.r = Math.max(1.6, Math.min(16, cam.r * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    el.addEventListener('keydown', function (e) {
      var k = e.key, used = true;
      if (k === 'ArrowLeft') cam.theta -= 0.12; else if (k === 'ArrowRight') cam.theta += 0.12;
      else if (k === 'ArrowUp') cam.phi = Math.max(0.35, cam.phi - 0.08); else if (k === 'ArrowDown') cam.phi = Math.min(1.5, cam.phi + 0.08);
      else if (k === '+' || k === '=') cam.r = Math.max(1.6, cam.r * 0.9); else if (k === '-') cam.r = Math.min(16, cam.r * 1.1);
      else used = false;
      if (used) { cam.g = null; e.preventDefault(); e.stopPropagation(); }
    });
  }
  var ray, mouse;
  function pick(e) {
    var r = el.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    var hits = ray.intersectObjects(scene.children, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (o.isSprite && !o.userData.pickable) continue;
      while (o) {
        if (o.userData.bench != null) return pickCb({ bench: o.userData.bench });
        if (o.userData.ref) return pickCb({ ref: o.userData.ref });
        o = o.parent;
      }
      return;
    }
  }

  /* ---------------------------------------------------------------- public API */
  sc.init = function (container) {
    el = container;
    if (!THREE) return false;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (err) { renderer = null; return false; }
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--scene').trim() || '#aeb6be';
    scene.background = new THREE.Color(bg);
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x59616b, 1.9));
    var dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(3, 8, 6); scene.add(dl);
    ray = new THREE.Raycaster(); mouse = new THREE.Vector2();
    cam.t = new THREE.Vector3(0, 1.3, -1.6);
    buildRoom(); buildPanel(); buildDisplay(); buildBench(); buildConveyor(); buildPneu();
    bindControls();
    sc.resize();
    if (root.ResizeObserver) new ResizeObserver(sc.resize).observe(el); else root.addEventListener('resize', sc.resize);
    applyCam();
    var last = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      animate(dt); renderer.render(scene, camera);
    })(last);
    return true;
  };
  sc.resize = function () {
    if (!renderer) return;
    var w = el.clientWidth || 300, h = el.clientHeight || 200;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // keep a constant horizontal field of view so a tall, narrow pane still shows the whole station
    camera.fov = Math.max(30, Math.min(96, 2 * Math.atan(Math.tan(0.49) / camera.aspect) * 180 / Math.PI));
    camera.updateProjectionMatrix();
  };
  sc.onPick = function (fn) { pickCb = fn; };
  sc.setRM = function (v) { rm = !!v; };
  sc.has = function (ref) { return !!objs[ref]; };
  sc.stationOf = function (ref) { return stationOf[ref]; };

  sc.select = function (ref) {
    if (!renderer) return;
    if (selHelper) { scene.remove(selHelper); selHelper.geometry.dispose(); selHelper = null; }
    if (selMarker) { scene.remove(selMarker); selMarker = null; }
    var o = ref && (objs[ref] || (ref === '__bench' && benchItems[0]));
    if (!o) return;
    selHelper = new THREE.BoxHelper(o, 0x1f6feb); selHelper.material.depthTest = false; selHelper.renderOrder = 9; scene.add(selHelper);
    var bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3());
    selMarker = label('▼ SELECTED', 0.09, { bg: '#1f6feb', onTop: true }); selMarker.position.set(c.x, bb.max.y + 0.12, c.z); scene.add(selMarker);
  };

  /* Show one or several catalog models on the workbench. */
  sc.bench = function (shapes, tags) {
    if (!renderer) return;
    benchItems.forEach(function (b) { benchRoot.remove(b); });
    benchItems = [];
    (shapes || []).forEach(function (shape, i) {
      var n = shapes.length, m = (build[shape] || build.terminal)(), wrap = G(benchRoot, n === 1 ? 0 : (i - (n - 1) / 2) * 0.56, 0.2, 0);
      var bb = new THREE.Box3().setFromObject(m), size = bb.getSize(new THREE.Vector3()), k = (n === 1 ? 0.5 : 0.36) / Math.max(size.x, size.y, size.z);
      m.scale.setScalar(k); wrap.add(m);
      C(wrap, n === 1 ? 0.36 : 0.24, 0.02, 0x3d4650, 0, -0.19, 0, 'y');
      if (tags && tags[i]) { var l = label(tags[i], 0.1, { bg: '#161b22' }); l.position.set(0, 0.36, 0); wrap.add(l); wrap.userData.bench = i; }
      benchItems.push(wrap);
    });
  };

  /* Draw an SVG string onto the wall display. */
  sc.setDisplay = function (svg, vb) {
    if (!display) return;
    try {
      var img = new Image();
      img.onload = function () {
        var c = display.cv.getContext('2d'), W = 1024, H = 576;
        c.fillStyle = '#f7f8f9'; c.fillRect(0, 0, W, H);
        var k = Math.min((W - 24) / vb[2], (H - 24) / vb[3]), w = vb[2] * k, h = vb[3] * k;
        c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        display.tex.needsUpdate = true;
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch (err) { /* display is decorative; the centre schematic is the real one */ }
  };

  sc.update = function (v) { view = v || {}; if (renderer) applyView(); };

  function applyView() {
    var v = view, u;
    function ud(ref) { return objs[ref] ? objs[ref].userData : {}; }
    if (ud('PS1').led) glow(ud('PS1').led, v.supply, 0x35d06a);
    if (ud('F1').cart) ud('F1').cart.visible = v.fuseIn !== false;
    if (ud('DS1').handle) ud('DS1').handle.rotation.z = v.mains === false ? Math.PI / 2 : 0;
    if (ud('PB2').cap) ud('PB2').cap.position.z = v.PB2 ? 0.02 : 0.035;
    if (ud('PB1').cap) ud('PB1').cap.position.z = v.PB1 ? 0.02 : 0.035;
    if (ud('S1').knob) ud('S1').knob.rotation.z = v.S1 ? -0.7 : 0.7;
    if (ud('S2').knob) ud('S2').knob.rotation.z = v.S2 ? -0.7 : 0.7;
    if (ud('SS2').knob) ud('SS2').knob.rotation.z = v.SS2 ? -0.7 : 0.7;
    if (ud('PL1').lens) glow(ud('PL1').lens, v.PL1, 0xff3b30);
    if (ud('PL2').lens) glow(ud('PL2').lens, v.PL2, 0x30e060);
    if (ud('CR1').flag) glow(ud('CR1').flag, v.CR1, 0xff9f1a);
    if (ud('CR2').flag) glow(ud('CR2').flag, v.CR2, 0xff9f1a);
    if (ud('M1').arm) { ud('M1').arm.position.z = v.M1 ? 0.08 : 0.095; glow(ud('M1').arm, v.M1, 0xff9f1a); }
    if (ud('OL1').flag) ud('OL1').flag.visible = !!v.ol;
    u = ud('PLC1');
    if (u.leds) { glow(u.leds[0], v.I0, 0x35d06a); glow(u.leds[3], v.Q0, 0xff9f1a); glow(u.pwr, v.supply, 0x35d06a); }
    u = ud('PEC1');
    if (u.led) { glow(u.led, v.sensor, 0xff9f1a); glow(u.pwr, v.supply, 0x35d06a); }
    u = ud('V1'); if (u.led) glow(u.led, v.sol, 0xff9f1a);
    if (ud('SV1').lever) ud('SV1').lever.rotation.y = v.air === false ? Math.PI / 2 : 0;
    if (ud('PG1').needle) ud('PG1').needle.rotation.z = 2.1 - (v.bar || 0) * 0.55;
    if (ud('CYL1').rod) ud('CYL1').rod.position.x = 0.27 + (v.cyl || 0) * 0.42 - 0.24;
  }

  function animate(dt) {
    clock += dt;
    if (cam.g) {
      var k = Math.min(1, dt * 4.5);
      cam.t.lerp(cam.g.t, k); cam.r += (cam.g.r - cam.r) * k; cam.theta += (cam.g.theta - cam.theta) * k; cam.phi += (cam.g.phi - cam.phi) * k;
      if (Math.abs(cam.r - cam.g.r) < 0.01 && cam.t.distanceTo(cam.g.t) < 0.01) cam.g = null;
    }
    applyCam();
    if (view.motor && !rm) {
      strips.forEach(function (s) { s.position.x += dt * 0.9; if (s.position.x > 2.55) s.position.x -= 5.1; });
      rollers.forEach(function (r) { r.rotation.y -= dt * 8; });
      if (objs.MTR1) objs.MTR1.userData.shaft.rotation.x += dt * 14;
    }
    // box: arrives at the sensor when view.box is true, leaves when false
    var target = view.box ? 0.9 : (boxState.phase === 'leaving' ? 3.0 : -2.6);
    if (view.box) boxState.phase = 'at';
    else if (boxState.phase === 'at') { boxState.phase = 'leaving'; target = 3.0; }
    if (rm) boxState.x = view.box ? 0.9 : -2.6;
    else if (Math.abs(boxState.x - target) > 0.01) boxState.x += Math.sign(target - boxState.x) * Math.min(Math.abs(target - boxState.x), dt * 3.2);
    else if (boxState.phase === 'leaving') { boxState.phase = 'away'; boxState.x = -2.6; }
    if (boxMesh) { boxMesh.position.x = boxState.x; boxMesh.visible = boxState.x > -2.55 && boxState.x < 2.95; }
    if (selHelper) selHelper.update();
  }

  FS.scene3d = sc;
})(typeof window !== 'undefined' ? window : globalThis);
