/* FIRST SHIFT — 3D training laboratory (three.js r159, procedural geometry and
 * canvas-generated textures only). One compact room: control panel enclosure,
 * component workbench, short conveyor, schematic wall display and a small
 * pneumatic stand. Every moving or lit part is driven by the `view` object the
 * app derives from the simulation state; nothing here decides circuit behavior. */
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  var THREE = root.THREE;
  var sc = {};

  /* ---------------------------------------------------------------- module state */
  var el, renderer, scene, camera, ray, mouse;
  var objs = {}, stationOf = {}, inside = {}, tags = [], labelsOn = true;
  var pickCb = function () {}, hoverCb = function () {}, pressCb = function () {};
  var rm = false, view = {}, dirty = true, shadowDirty = true, selDirty = false;
  var benchRoot, benchItems = [], inspectState = null;
  var display = null, beltTex = null, drums = [], boxMesh = null, boxState = { x: -2.7, phase: 'away' }, zone = null;
  var door = null, doorA = 0, doorT = 0, DOOR_OPEN = 1.83;
  var selRef = null, selBox = null, selMarker = null, hovRef = null, hovBox = null;
  var key = null, quality = 'balanced', adaptive = false, adaptK = 1, pxScale = 1, cssW = 300, cssH = 200, aspect = 1.5;
  var fps = 0, fpsAcc = 0, fpsN = 0, slowT = 0, lastInfo = { calls: 0, triangles: 0 };
  var cam = { t: null, theta: 0, phi: 1.15, r: 11, hh: 0.49, g: null, home: null, mode: 'overview', rmin: 0.6, rmax: 15 };
  var locked = false, clock = 0;
  var GEO = {}, MATS = {}, TEX = {}, M = {};
  var UP = null, V1 = null, BB = null;

  var QUALITY = {
    low: { ratio: function () { return 0.6; }, budget: 1.6e6, shadow: 0 },
    balanced: { ratio: function (d) { return Math.min(d, 1.25); }, budget: 3.2e6, shadow: 1024 },
    high: { ratio: function (d) { return Math.min(d, 2); }, budget: 6.0e6, shadow: 2048 },
    ultra: { ratio: function (d) { return d; }, budget: 3840 * 2160, shadow: 4096 }
  };

  /* ---------------------------------------------------------------- textures (all generated locally) */
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctex(cv, repeat) {
    var t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s & 0xffff) / 0xffff; }; }
  function makeTextures() {
    var cv, c, i, r = rnd(7);
    // fine neutral noise: bump map for painted steel
    cv = canvas(128, 128); c = cv.getContext('2d'); c.fillStyle = '#808080'; c.fillRect(0, 0, 128, 128);
    for (i = 0; i < 2600; i++) { var g = 116 + Math.floor(r() * 24); c.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')'; c.fillRect(r() * 128, r() * 128, 1.5, 1.5); }
    TEX.noise = ctex(cv, [3, 3]); TEX.noise.colorSpace = THREE.NoColorSpace;
    // brushed metal: horizontal streaks
    cv = canvas(256, 256); c = cv.getContext('2d'); c.fillStyle = '#e9e9e9'; c.fillRect(0, 0, 256, 256);
    for (i = 0; i < 900; i++) { var b = 205 + Math.floor(r() * 50); c.fillStyle = 'rgba(' + b + ',' + b + ',' + b + ',0.55)'; c.fillRect(r() * 256 - 40, r() * 256, 40 + r() * 160, 1); }
    TEX.brushed = ctex(cv, [1, 1]);
    // floor: sealed concrete with faint joints
    cv = canvas(512, 512); c = cv.getContext('2d'); c.fillStyle = '#a9a69f'; c.fillRect(0, 0, 512, 512);
    for (i = 0; i < 5200; i++) { var f = 152 + Math.floor(r() * 36); c.fillStyle = 'rgba(' + f + ',' + (f - 2) + ',' + (f - 7) + ',0.35)'; c.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2 + r() * 3); }
    c.strokeStyle = 'rgba(70,68,64,0.5)'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, 509, 509);
    TEX.floor = ctex(cv, [7, 9]);
    // conveyor belt: dark rubber with faint transverse lacing so motion is visible
    cv = canvas(256, 64); c = cv.getContext('2d'); c.fillStyle = '#26282b'; c.fillRect(0, 0, 256, 64);
    for (i = 0; i < 8; i++) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(i * 32, 0, 3, 64); }
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, 4, 256, 2); c.fillRect(0, 58, 256, 2);
    beltTex = TEX.belt = ctex(cv, [9, 1]);
    // soft contact shadow blob (stands in for ambient occlusion under equipment)
    cv = canvas(128, 128); c = cv.getContext('2d');
    var gr = c.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    TEX.blob = ctex(cv);
    // electrical hazard label
    cv = canvas(256, 256); c = cv.getContext('2d'); c.fillStyle = '#f3c300'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#141414'; c.lineWidth = 14; c.lineJoin = 'round'; c.beginPath(); c.moveTo(128, 34); c.lineTo(226, 212); c.lineTo(30, 212); c.closePath(); c.stroke();
    c.fillStyle = '#141414'; c.beginPath(); c.moveTo(140, 82); c.lineTo(104, 150); c.lineTo(128, 150); c.lineTo(112, 198); c.lineTo(156, 126); c.lineTo(132, 126); c.closePath(); c.fill();
    TEX.hazard = ctex(cv);
  }

  /* ---------------------------------------------------------------- materials (shared unless marked own) */
  function std(k, o) { if (!MATS[k]) MATS[k] = new THREE.MeshStandardMaterial(o); return MATS[k]; }
  function PL(c, rough) { return std('pl' + c + (rough || ''), { color: c, roughness: rough || 0.6, metalness: 0 }); }          // molded plastic
  function ST(c) { return std('st' + c, { color: c, roughness: 0.78, metalness: 0.06, bumpMap: TEX.noise, bumpScale: 0.3 }); }  // painted steel
  function BM(c, rough) { return std('bm' + c + (rough || ''), { color: c, roughness: rough || 0.42, metalness: 0.85, map: TEX.brushed, envMapIntensity: 0.75 }); } // brushed metal
  function GL(c, op) { return std('gl' + c + op, { color: c, roughness: 0.25, metalness: 0, transparent: true, opacity: op, depthWrite: false }); }  // clear housings
  function own(o) { var m = new THREE.MeshStandardMaterial(o); m.userData.own = true; return m; }
  function ledMat(c) { return own({ color: c, roughness: 0.4, metalness: 0, emissive: 0x000000 }); }
  function lensMat(c) { return own({ color: c, roughness: 0.22, metalness: 0, transparent: true, opacity: 0.92, emissive: 0x000000 }); }
  function glow(mesh, on, color, k) { if (!mesh) return; mesh.material.emissive.setHex(on ? color : 0x000000); mesh.material.emissiveIntensity = on ? (k || 1.6) : 1; }
  function namedMaterials() {
    M.screw = BM(0xc2c6cb, 0.36); M.zinc = BM(0xc9cccf, 0.5); M.steel = BM(0x9ea4aa, 0.45); M.darkSteel = BM(0x4a4f55, 0.5);
    M.dark = PL(0x22262b, 0.7); M.seam = PL(0x8b8f93); M.label = PL(0xf3f3ee, 0.5); M.rubber = PL(0x1b1c1e, 0.95);
    M.char = ST(0x2c2f34); M.blue = ST(0x58768f); M.enc = ST(0xc6cac6); M.wall = ST(0xd0ccc4); M.yellow = ST(0xe6b700);
    M.brass = std('brass', { color: 0xc8a13a, roughness: 0.4, metalness: 0.9, envMapIntensity: 0.7 });
    M.copper = std('copper', { color: 0xb87333, roughness: 0.34, metalness: 1, envMapIntensity: 0.8 });
    M.wire = PL(0x33475c, 0.7); M.duct = PL(0xb9bfc4, 0.7); M.cream = PL(0xe3dfd2); M.white = PL(0xf0f0ec, 0.5);
  }

  /* ---------------------------------------------------------------- geometry helpers (cached) */
  function boxG(w, h, d) { var k = 'b' + w + '|' + h + '|' + d; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); }
  function cylG(r1, r2, h, seg) { var k = 'c' + r1 + '|' + r2 + '|' + h + '|' + seg; return GEO[k] || (GEO[k] = new THREE.CylinderGeometry(r1, r2, h, seg)); }
  function sphG(r) { var k = 's' + r; return GEO[k] || (GEO[k] = new THREE.SphereGeometry(r, 12, 8)); }
  function G(parent, x, y, z) { var o = new THREE.Group(); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
  function B(p, w, h, d, m, x, y, z) { var o = new THREE.Mesh(boxG(w, h, d), m); o.position.set(x || 0, y || 0, z || 0); p.add(o); return o; }
  function C(p, r, h, m, x, y, z, axis, r2, seg) {
    var o = new THREE.Mesh(cylG(r, r2 == null ? r : r2, h, seg || (r > 0.025 ? 32 : 16)), m);
    if (axis === 'x') o.rotation.z = Math.PI / 2; else if (axis === 'z') o.rotation.x = Math.PI / 2;
    o.position.set(x || 0, y || 0, z || 0); p.add(o); return o;
  }
  function shade(o, cast, recv) { o.castShadow = !!cast; o.receiveShadow = !!recv; return o; }
  function pipe(p, pts, r, m) {
    for (var i = 0; i < pts.length - 1; i++) {
      var a = new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2]), b = new THREE.Vector3(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);
      var d = b.clone().sub(a), len = d.length(), o = new THREE.Mesh(cylG(r, r, 1, 12), m);
      o.scale.y = len; o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(UP, d.normalize()); p.add(o);
      var j = new THREE.Mesh(sphG(r * 1.12), m); j.position.copy(b); p.add(j);
    }
  }
  function inst(p, geo, m, list) {   // list of [x, y, z, sx, sy, sz]
    var im = new THREE.InstancedMesh(geo, m, list.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3();
    list.forEach(function (e, i) { t.set(e[0], e[1], e[2]); s.set(e[3] == null ? 1 : e[3], e[4] == null ? 1 : e[4], e[5] == null ? 1 : e[5]); mt.compose(t, q, s); im.setMatrixAt(i, mt); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingBox(); im.computeBoundingSphere(); p.add(im); return im;
  }
  function screwZ() { return GEO.scz || (GEO.scz = new THREE.CylinderGeometry(0.007, 0.007, 0.006, 12).rotateX(Math.PI / 2)); }

  /* ---------------------------------------------------------------- labels */
  function label(text, h, o) {
    o = o || {};
    var fs = 84, H = 120, font = '700 ' + fs + 'px ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
    var cv = canvas(8, H), c = cv.getContext('2d');
    c.font = font; var w = Math.ceil(c.measureText(text).width) + 48; cv.width = w; c = cv.getContext('2d');
    var rr = 16;
    c.fillStyle = o.bg || 'rgba(22,27,34,0.9)';
    c.beginPath(); c.moveTo(rr, 0); c.lineTo(w - rr, 0); c.quadraticCurveTo(w, 0, w, rr); c.lineTo(w, H - rr); c.quadraticCurveTo(w, H, w - rr, H); c.lineTo(rr, H); c.quadraticCurveTo(0, H, 0, H - rr); c.lineTo(0, rr); c.quadraticCurveTo(0, 0, rr, 0); c.fill();
    c.font = font; c.fillStyle = o.fg || '#ffffff'; c.textBaseline = 'middle'; c.fillText(text, 24, H / 2 + 4);
    var t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.own = true;
    var mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: !o.onTop, depthWrite: false, toneMapped: false }); mat.userData.own = true;
    var sp = new THREE.Sprite(mat); sp.scale.set(h * w / H, h, 1); sp.renderOrder = o.onTop ? 20 : 5; sp.userData.noPick = true;
    return sp;
  }
  /* A physical engraved plate (part of the equipment, not an overlay). */
  function plate(text, w, h, bg, fg) {
    var cv = canvas(1024, Math.max(32, Math.round(1024 * h / w))), c = cv.getContext('2d');
    c.fillStyle = bg || '#e9e9e4'; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = fg || '#16181b'; c.textAlign = 'center'; c.textBaseline = 'middle';
    var fsz = Math.floor(cv.height * 0.7); c.font = '700 ' + fsz + 'px Arial, Helvetica, sans-serif';
    while (c.measureText(text).width > cv.width * 0.9 && fsz > 8) { fsz -= 2; c.font = '700 ' + fsz + 'px Arial, Helvetica, sans-serif'; }
    c.fillText(text, cv.width / 2, cv.height / 2 + 2);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: ctex(cv), roughness: 0.55, metalness: 0.05 }));
  }
  function reg(ref, obj, station, tag, tagPos, isIn) {
    obj.userData.ref = ref; objs[ref] = obj; stationOf[ref] = station; if (isIn) inside[ref] = true;
    if (tag !== false && obj.parent) {   // tag sits beside the device, outside its bounds
      var l = label(tag || ref, 0.058), q = tagPos || [0, 0.17, 0.05];
      l.position.copy(obj.position); l.position.x += q[0]; l.position.y += q[1]; l.position.z += q[2];
      obj.parent.add(l); tags.push(l); l.visible = labelsOn;
    }
    return obj;
  }

  /* ---------------------------------------------------------------- small shared details */
  function screws(g, pts, z, r) { pts.forEach(function (q) { C(g, r || 0.0095, 0.006, M.screw, q[0], q[1], z, 'z'); }); }
  function termRow(g, n, x0, dx, y, z, w, h) {
    for (var i = 0; i < n; i++) { B(g, w || 0.026, h || 0.03, 0.006, M.dark, x0 + i * dx, y, z); C(g, 0.009, 0.006, M.screw, x0 + i * dx, y, z + 0.003, 'z'); }
  }
  function seam(g, w, h, x, y, z) { return B(g, w, h, 0.002, M.seam, x, y, z); }
  function tagPlate(g, w, h, x, y, z) { return B(g, w, h, 0.003, M.label, x, y, z); }
  function clip(g, w, y, z) { return B(g, w, 0.022, 0.016, M.zinc, 0, y, z); }
  function contactBlock(g, color) {   // the part of a pilot device that sits behind the panel door
    C(g, 0.03, 0.05, M.dark, 0, 0, -0.03, 'z');
    C(g, 0.04, 0.012, PL(0x3b4046), 0, 0, -0.012, 'z', null, 6);
    B(g, 0.05, 0.07, 0.05, PL(color), 0, 0, -0.08);
    seam(g, 0.05, 0.002, 0, 0, -0.054);
    screws(g, [[-0.014, 0.022], [0.014, 0.022]], -0.106, 0.008);
  }
  function bezel(g) { C(g, 0.047, 0.012, BM(0xbfc4c9, 0.38), 0, 0, 0.006, 'z'); C(g, 0.04, 0.016, BM(0xa9afb5, 0.38), 0, 0, 0.012, 'z'); }

  /* ---------------------------------------------------------------- reusable device models
   * Each builder returns a group roughly 0.1–0.45 m across, facing +z, origin at its centre.
   * `userData.terms` lists terminal identifiers used by this training drawing set only. */
  var build = {
    psu: function () {
      var g = G(), i;
      B(g, 0.3, 0.24, 0.12, BM(0xb7bcc1, 0.5));
      B(g, 0.3, 0.075, 0.124, PL(0x3a4048), 0, -0.0825, 0);
      termRow(g, 6, -0.11, 0.044, -0.085, 0.062, 0.03, 0.036);
      for (i = 0; i < 7; i++) B(g, 0.012, 0.075, 0.003, M.dark, -0.115 + i * 0.022, 0.055, 0.0605);
      tagPlate(g, 0.085, 0.055, 0.085, 0.06, 0.061); seam(g, 0.3, 0.002, 0, -0.044, 0.0615);
      g.userData.led = C(g, 0.008, 0.006, ledMat(0x2a3a2a), 0.125, -0.02, 0.062, 'z');
      clip(g, 0.1, -0.11, -0.066);
      g.userData.terms = [['+V', 0.066, -0.04, 0.075], ['−V', 0.11, -0.13, 0.075]];
      return g;
    },
    fuse: function () {
      var g = G();
      B(g, 0.07, 0.18, 0.085, M.cream); B(g, 0.056, 0.1, 0.02, PL(0xd2cdbd), 0, 0, 0.05);
      seam(g, 0.07, 0.002, 0, 0.052, 0.0435); seam(g, 0.07, 0.002, 0, -0.052, 0.0435);
      var ct = g.userData.cart = G(g, 0, 0, 0.066);
      C(ct, 0.015, 0.075, PL(0xf2efe6, 0.35), 0, 0, 0, 'y'); C(ct, 0.0165, 0.016, M.screw, 0, 0.042, 0, 'y'); C(ct, 0.0165, 0.016, M.screw, 0, -0.042, 0, 'y');
      B(g, 0.03, 0.022, 0.006, M.dark, 0, 0.072, 0.043); B(g, 0.03, 0.022, 0.006, M.dark, 0, -0.072, 0.043);
      screws(g, [[0, 0.072], [0, -0.072]], 0.046, 0.008); clip(g, 0.05, -0.08, -0.048);
      g.userData.terms = [['1', 0, 0.108, 0.05], ['2', 0, -0.108, 0.05]];
      return g;
    },
    fuse3: function () { var g = G(); for (var i = -1; i <= 1; i++) { var f = build.fuse(); f.position.x = i * 0.076; g.add(f); } return g; },
    breaker: function () {
      var g = G();
      B(g, 0.09, 0.2, 0.09, M.white); B(g, 0.09, 0.09, 0.03, PL(0xe6e6e1, 0.5), 0, 0, 0.055);
      B(g, 0.03, 0.05, 0.03, M.dark, 0, 0.018, 0.08).rotation.x = -0.45;
      B(g, 0.02, 0.012, 0.004, PL(0x2e9d48), 0, -0.025, 0.0705);
      B(g, 0.05, 0.026, 0.006, M.dark, 0, 0.082, 0.045); B(g, 0.05, 0.026, 0.006, M.dark, 0, -0.082, 0.045);
      screws(g, [[0, 0.082], [0, -0.082]], 0.048, 0.009); clip(g, 0.06, -0.09, -0.05);
      return g;
    },
    disconnect: function () {
      var g = G();
      B(g, 0.2, 0.24, 0.06, PL(0x30343a)); B(g, 0.17, 0.17, 0.012, M.yellow, 0, 0, 0.036);
      C(g, 0.058, 0.014, PL(0x8f1f1f), 0, 0, 0.048, 'z');
      var h = g.userData.handle = G(g, 0, 0, 0.07);
      B(h, 0.036, 0.15, 0.036, PL(0xc0282a, 0.5)); B(h, 0.03, 0.03, 0.01, PL(0x9a1c1e), 0, 0.055, 0.02);
      screws(g, [[-0.085, 0.105], [0.085, 0.105], [-0.085, -0.105], [0.085, -0.105]], 0.031, 0.008);
      return g;
    },
    button: function (color, nc) {
      var g = G(); bezel(g);
      g.userData.cap = C(g, 0.034, 0.03, PL(color, 0.5), 0, 0, 0.035, 'z');
      contactBlock(g, nc ? 0xb5332c : 0x2f8f48);
      g.userData.terms = nc ? [['11', -0.05, 0.03, -0.1], ['12', 0.05, 0.03, -0.1]] : [['13', -0.05, 0.03, -0.1], ['14', 0.05, 0.03, -0.1]];
      return g;
    },
    button_green: function () { return build.button(0x2e9d48, false); },
    button_red: function () { return build.button(0xd03030, true); },
    selector: function () {
      var g = G(); bezel(g);
      var k = g.userData.knob = G(g, 0, 0, 0.034);
      C(k, 0.03, 0.03, PL(0x20242a, 0.5), 0, 0, 0, 'z'); B(k, 0.016, 0.07, 0.024, PL(0x2a2f36, 0.5), 0, 0.006, 0.014); B(k, 0.006, 0.03, 0.002, M.white, 0, 0.024, 0.0265);
      contactBlock(g, 0x2f8f48);
      return g;
    },
    pilot: function (color) {
      var g = G(); bezel(g);
      g.userData.lens = C(g, 0.033, 0.026, lensMat(color || 0x8a2a2a), 0, 0, 0.033, 'z');
      contactBlock(g, 0x3b4046);
      return g;
    },
    relay: function () {
      var g = G();
      B(g, 0.09, 0.055, 0.1, PL(0x24282d), 0, -0.085, 0);
      termRow(g, 2, -0.02, 0.04, -0.095, 0.051, 0.024, 0.024); termRow(g, 2, -0.02, 0.04, -0.07, 0.051, 0.024, 0.016);
      B(g, 0.04, 0.05, 0.04, PL(0x7a4b22), 0, -0.03, -0.012); B(g, 0.05, 0.008, 0.05, M.steel, 0, 0.002, -0.012); B(g, 0.01, 0.07, 0.03, M.steel, 0.022, 0.03, 0.01);
      B(g, 0.078, 0.13, 0.085, GL(0xbcd7ee, 0.38), 0, 0.006, 0);
      g.userData.flag = B(g, 0.03, 0.012, 0.004, ledMat(0x3a3f45), 0, 0.052, 0.0445);
      clip(g, 0.06, -0.105, -0.055);
      g.userData.terms = [['A1', -0.035, -0.135, 0.05], ['A2', 0.035, -0.135, 0.05], ['11', -0.075, -0.07, 0.05], ['14', 0.075, -0.07, 0.05]];
      return g;
    },
    contactor: function () {
      var g = G(), i;
      B(g, 0.2, 0.22, 0.13, M.cream);
      B(g, 0.2, 0.05, 0.136, PL(0xcfcabb), 0, 0.085, 0); B(g, 0.2, 0.05, 0.136, PL(0xcfcabb), 0, -0.085, 0);
      termRow(g, 3, -0.06, 0.06, 0.085, 0.068, 0.036, 0.034); termRow(g, 3, -0.06, 0.06, -0.085, 0.068, 0.036, 0.034);
      seam(g, 0.2, 0.002, 0, 0.058, 0.066); seam(g, 0.2, 0.002, 0, -0.058, 0.066);
      B(g, 0.1, 0.07, 0.012, M.dark, -0.02, 0, 0.068);
      g.userData.arm = B(g, 0.05, 0.034, 0.026, own({ color: 0x3f7fd0, roughness: 0.5, emissive: 0x000000 }), -0.02, 0, 0.09);
      g.userData.ind = [];
      for (i = 0; i < 3; i++) g.userData.ind.push(B(g, 0.014, 0.008, 0.003, ledMat(0x55595e), -0.045 + i * 0.025, -0.045, 0.0665));   // main-contact position indicators
      tagPlate(g, 0.05, 0.022, 0.06, 0.03, 0.066);
      C(g, 0.008, 0.008, M.screw, -0.088, 0.045, 0.066, 'z'); C(g, 0.008, 0.008, M.screw, 0.088, 0.045, 0.066, 'z');                    // coil terminals A1 / A2
      B(g, 0.036, 0.11, 0.08, PL(0xe9c44a), 0.118, 0, 0.02); screws(g, [[0.118, 0.035], [0.118, -0.035]], 0.062, 0.008);                // auxiliary contact block
      clip(g, 0.12, -0.1, -0.072);
      g.userData.terms = [['L1', -0.06, 0.14, 0.07], ['L2', 0, 0.14, 0.07], ['L3', 0.06, 0.14, 0.07], ['T1', -0.06, -0.14, 0.07], ['T2', 0, -0.14, 0.07], ['T3', 0.06, -0.14, 0.07],
        ['A1', -0.135, 0.045, 0.07], ['A2', 0.088, 0.02, 0.09], ['13', 0.175, 0.035, 0.065], ['14', 0.175, -0.035, 0.065]];
      return g;
    },
    /* Simplified functional illustration of a contactor: coil, armature with contact carrier,
     * three main contact bridges and one auxiliary bridge on the same carrier. Internal
     * construction of real devices varies. */
    contactorCut: function () {
      var g = G(), i, y;
      B(g, 0.3, 0.36, 0.12, GL(0xcfd6dc, 0.14));
      B(g, 0.3, 0.012, 0.12, M.cream, 0, -0.18, 0); B(g, 0.012, 0.36, 0.12, M.cream, -0.15, 0, 0); B(g, 0.012, 0.36, 0.12, M.cream, 0.15, 0, 0); B(g, 0.3, 0.36, 0.008, M.cream, 0, 0, -0.06);
      B(g, 0.16, 0.03, 0.07, M.darkSteel, 0, -0.158, 0);                                            // fixed core
      g.userData.coil = C(g, 0.05, 0.07, own({ color: 0xb87333, roughness: 0.4, metalness: 0.9, emissive: 0x000000 }), 0, -0.108, 0, 'y');
      C(g, 0.056, 0.008, M.dark, 0, -0.07, 0, 'y'); C(g, 0.056, 0.008, M.dark, 0, -0.146, 0, 'y');
      var cr = g.userData.carrier = G(g, 0, 0, 0);
      B(cr, 0.13, 0.018, 0.07, M.steel, 0, -0.04, 0);                                               // armature
      B(cr, 0.022, 0.2, 0.03, PL(0x3f7fd0), 0, 0.055, 0);                                           // contact carrier
      for (i = 0; i < 3; i++) {
        y = 0.01 + i * 0.045;
        B(cr, 0.12, 0.01, 0.022, M.copper, 0, y, 0.012);                                            // main bridge
        B(g, 0.03, 0.01, 0.022, M.copper, -0.05, y - 0.026, 0.012); B(g, 0.03, 0.01, 0.022, M.copper, 0.05, y - 0.026, 0.012);   // fixed contacts
        B(g, 0.08, 0.006, 0.01, M.copper, -0.105, y - 0.026, 0.012); B(g, 0.08, 0.006, 0.01, M.copper, 0.105, y - 0.026, 0.012);
      }
      B(cr, 0.07, 0.008, 0.016, M.copper, 0, 0.148, 0.012);                                         // auxiliary bridge
      B(g, 0.02, 0.008, 0.016, M.copper, -0.028, 0.124, 0.012); B(g, 0.02, 0.008, 0.016, M.copper, 0.028, 0.124, 0.012);
      B(g, 0.1, 0.005, 0.008, M.copper, -0.088, 0.124, 0.012); B(g, 0.1, 0.005, 0.008, M.copper, 0.088, 0.124, 0.012);
      g.userData.notes = [['COIL', -0.22, -0.108, 0.05], ['ARMATURE + CARRIER', 0.31, -0.04, 0.05], ['MAIN CONTACTS', 0.29, 0.03, 0.05], ['AUX 13-14', 0.25, 0.126, 0.05], ['L1 L2 L3', -0.25, 0.03, 0.05], ['T1 T2 T3', 0.25, -0.115, 0.05]];
      g.userData.cut = true; g.userData.travel = 0.016;
      return g;
    },
    aux: function () {
      var g = G();
      B(g, 0.2, 0.22, 0.1, GL(0xd9d6cb, 0.3), 0, 0, -0.03);
      B(g, 0.07, 0.11, 0.07, PL(0xe9c44a), 0, 0, 0.05); seam(g, 0.07, 0.002, 0, 0, 0.086);
      B(g, 0.03, 0.024, 0.006, M.dark, 0, 0.035, 0.086); B(g, 0.03, 0.024, 0.006, M.dark, 0, -0.035, 0.086);
      screws(g, [[0, 0.035], [0, -0.035]], 0.089, 0.009);
      g.userData.terms = [['13', 0.07, 0.035, 0.09], ['14', 0.07, -0.035, 0.09]];
      return g;
    },
    overload: function () {
      var g = G(), i;
      B(g, 0.2, 0.12, 0.12, PL(0xd8d4c8));
      for (i = -1; i <= 1; i++) B(g, 0.014, 0.03, 0.008, M.zinc, i * 0.06, 0.072, 0.02);              // pins up into the contactor
      termRow(g, 3, -0.06, 0.06, -0.04, 0.062, 0.034, 0.03);
      C(g, 0.022, 0.012, M.white, 0.025, 0.028, 0.064, 'z'); B(g, 0.004, 0.018, 0.003, M.dark, 0.025, 0.034, 0.071);   // current dial
      C(g, 0.014, 0.018, PL(0x2f6fd0, 0.5), -0.055, 0.028, 0.066, 'z');                              // reset
      C(g, 0.008, 0.012, PL(0xc0282a, 0.5), -0.022, 0.028, 0.064, 'z');                              // test / stop
      B(g, 0.03, 0.03, 0.004, M.dark, 0.075, 0.028, 0.061);
      g.userData.flag = B(g, 0.026, 0.026, 0.014, PL(0xd03030, 0.5), 0.075, 0.028, 0.066); g.userData.flag.visible = false;
      screws(g, [[-0.088, 0.03], [0.092, -0.012]], 0.062, 0.007);
      g.userData.terms = [['95', -0.135, 0.03, 0.065], ['96', 0.14, -0.012, 0.065]];
      return g;
    },
    motor: function () {
      var g = G(), i, body = M.blue, dk = ST(0x41607a);
      C(g, 0.16, 0.34, body, 0, 0, 0, 'x', null, 32);
      for (i = -4; i <= 4; i++) C(g, 0.171, 0.01, dk, i * 0.034, 0, 0, 'x', null, 32);
      C(g, 0.15, 0.05, dk, 0.195, 0, 0, 'x', null, 32); C(g, 0.06, 0.03, M.darkSteel, 0.225, 0, 0, 'x');
      C(g, 0.165, 0.09, M.char, -0.215, 0, 0, 'x', null, 32); C(g, 0.11, 0.004, M.dark, -0.262, 0, 0, 'x');   // fan cowl
      var sh = g.userData.shaft = G(g, 0.275, 0, 0);
      C(sh, 0.028, 0.1, M.screw, 0, 0, 0, 'x'); B(sh, 0.06, 0.008, 0.012, M.darkSteel, 0.01, 0.028, 0);
      B(g, 0.3, 0.024, 0.34, dk, 0, -0.168, 0); B(g, 0.06, 0.05, 0.3, dk, -0.1, -0.14, 0); B(g, 0.06, 0.05, 0.3, dk, 0.1, -0.14, 0);
      B(g, 0.12, 0.07, 0.12, dk, -0.02, 0.185, 0); C(g, 0.02, 0.05, M.dark, -0.02, 0.185, 0.08, 'z');
      tagPlate(g, 0.09, 0.05, 0.06, 0.03, 0.158);
      return g;
    },
    terminal: function (n) {
      n = n || 8; var g = G(), i, p = 0.036, x0 = -(n - 1) * p / 2, blocks = [], sc1 = [], rec = [];
      for (i = 0; i < n; i++) { blocks.push([x0 + i * p, 0, 0]); sc1.push([x0 + i * p, 0.03, 0.037], [x0 + i * p, -0.03, 0.037]); rec.push([x0 + i * p, 0.03, 0.0345], [x0 + i * p, -0.03, 0.0345]); }
      inst(g, boxG(p - 0.003, 0.1, 0.07), PL(0xcbc5b2), blocks);
      inst(g, boxG(0.022, 0.022, 0.004), M.dark, rec);
      inst(g, screwZ(), M.screw, sc1);
      B(g, n * p, 0.014, 0.003, M.label, 0, 0, 0.0365);
      B(g, 0.012, 0.11, 0.075, PL(0x8a8f95), x0 - p / 2 - 0.008, 0, 0); B(g, 0.012, 0.11, 0.075, PL(0x8a8f95), -x0 + p / 2 + 0.008, 0, 0);
      g.userData.terms = []; for (i = 0; i < n; i++) g.userData.terms.push([String(i + 1), x0 + i * p, 0.078, 0.04]);
      return g;
    },
    earth: function () {
      var g = G(), i;
      B(g, 0.3, 0.03, 0.03, M.brass); for (i = -2; i <= 2; i++) C(g, 0.009, 0.012, M.screw, i * 0.055, 0, 0.018, 'z');
      B(g, 0.03, 0.02, 0.03, PL(0x3a8f4a), -0.14, -0.022, 0); B(g, 0.03, 0.02, 0.03, PL(0x3a8f4a), 0.14, -0.022, 0);
      C(g, 0.01, 0.14, PL(0x3fa34d), 0.11, -0.085, 0.02, 'y'); C(g, 0.0105, 0.02, PL(0xe9d21a), 0.11, -0.06, 0.02, 'y'); C(g, 0.0105, 0.02, PL(0xe9d21a), 0.11, -0.11, 0.02, 'y');
      return g;
    },
    transformer: function () {
      var g = G(), i;
      B(g, 0.24, 0.18, 0.09, M.darkSteel); for (i = -3; i <= 3; i++) seam(g, 0.24, 0.0015, 0, i * 0.024, 0.046);
      B(g, 0.085, 0.125, 0.15, PL(0x8a5a2b), -0.05, 0, 0); B(g, 0.085, 0.125, 0.15, PL(0x9a6a36), 0.05, 0, 0);
      B(g, 0.24, 0.03, 0.06, M.cream, 0, 0.105, 0.03); termRow(g, 4, -0.075, 0.05, 0.105, 0.061, 0.03, 0.022);
      B(g, 0.28, 0.012, 0.11, M.zinc, 0, -0.096, 0);
      return g;
    },
    solenoid: function () {
      var g = G();
      B(g, 0.2, 0.06, 0.07, BM(0xb9bfc6), 0.03, -0.03, 0); B(g, 0.07, 0.08, 0.075, M.dark, -0.06, 0.04, 0);
      B(g, 0.05, 0.03, 0.04, PL(0x3a4048), -0.06, 0.095, 0);
      g.userData.led = B(g, 0.02, 0.012, 0.006, ledMat(0x3a3020), -0.06, 0.06, 0.04);
      C(g, 0.012, 0.03, M.brass, 0.07, 0.01, 0, 'y'); C(g, 0.012, 0.03, M.brass, 0.11, 0.01, 0, 'y');
      return g;
    },
    limit: function () {
      var g = G();
      B(g, 0.08, 0.13, 0.05, ST(0xcdb53f)); B(g, 0.06, 0.03, 0.052, M.dark, 0, -0.05, 0);
      B(g, 0.014, 0.1, 0.014, M.steel, 0.02, 0.1, 0.02); C(g, 0.024, 0.02, M.rubber, 0.02, 0.155, 0.02, 'z'); screws(g, [[-0.025, 0.04], [0.025, 0.04]], 0.026, 0.007);
      return g;
    },
    prox: function () {
      var g = G(), i;
      C(g, 0.03, 0.15, BM(0xbfc5cb), 0, 0, 0, 'x'); for (i = -3; i <= 3; i++) C(g, 0.0312, 0.004, M.steel, i * 0.016, 0, 0, 'x');
      C(g, 0.031, 0.02, PL(0x2f6fd0), 0.08, 0, 0, 'x'); C(g, 0.04, 0.014, M.steel, -0.03, 0, 0, 'x', null, 6); C(g, 0.04, 0.014, M.steel, 0.03, 0, 0, 'x', null, 6);
      C(g, 0.01, 0.12, M.rubber, -0.13, 0, 0, 'x');
      return g;
    },
    photo: function () {
      var g = G();
      B(g, 0.06, 0.09, 0.045, PL(0x24292f)); B(g, 0.062, 0.02, 0.047, PL(0xe6b700), 0, 0.03, 0);
      C(g, 0.018, 0.008, own({ color: 0x6aa9e0, roughness: 0.15, metalness: 0.1 }), 0, -0.012, 0.024, 'z'); C(g, 0.021, 0.004, M.dark, 0, -0.012, 0.022, 'z');
      g.userData.led = B(g, 0.014, 0.008, 0.01, ledMat(0x3a3020), 0.012, 0.047, 0);
      g.userData.pwr = B(g, 0.014, 0.008, 0.01, ledMat(0x203020), -0.012, 0.047, 0);
      C(g, 0.008, 0.06, M.rubber, 0, -0.07, -0.01, 'y');
      return g;
    },
    plc: function () {
      var g = G(), i;
      B(g, 0.46, 0.26, 0.11, PL(0x30363e));
      B(g, 0.44, 0.045, 0.03, PL(0xc9cfd5), 0, 0.1, 0.055); B(g, 0.44, 0.045, 0.03, PL(0xc9cfd5), 0, -0.1, 0.055);
      termRow(g, 10, -0.19, 0.0422, 0.1, 0.071, 0.028, 0.026); termRow(g, 10, -0.19, 0.0422, -0.1, 0.071, 0.028, 0.026);
      B(g, 0.16, 0.085, 0.006, PL(0x8fa3b5, 0.4), -0.115, 0, 0.057); seam(g, 0.46, 0.002, 0, 0.066, 0.056); seam(g, 0.46, 0.002, 0, -0.066, 0.056);
      B(g, 0.15, 0.085, 0.004, M.dark, 0.085, 0, 0.056);
      g.userData.leds = [];
      for (i = 0; i < 6; i++) g.userData.leds.push(B(g, 0.014, 0.014, 0.006, ledMat(0x39424c), 0.04 + (i % 3) * 0.034, i < 3 ? 0.022 : -0.022, 0.059));
      g.userData.pwr = B(g, 0.014, 0.014, 0.006, ledMat(0x203020), 0.185, 0.022, 0.059);
      tagPlate(g, 0.05, 0.02, 0.2, -0.022, 0.057); clip(g, 0.2, -0.12, -0.062);
      g.userData.terms = [['I0', -0.19, 0.155, 0.07], ['L+', 0.19, 0.155, 0.07], ['Q0', -0.19, -0.155, 0.07], ['0V', 0.19, -0.155, 0.07]];
      return g;
    },
    resistor: function () {
      var g = G(); C(g, 0.03, 0.14, PL(0xd7c49a), 0, 0, 0, 'x');
      [0x8b4513, 0x111111, 0xd03030, 0xc9a23a].forEach(function (c, i) { C(g, 0.0315, 0.012, PL(c), -0.04 + i * 0.027, 0, 0, 'x'); });
      C(g, 0.006, 0.3, M.screw, 0, 0, 0, 'x'); return g;
    },
    capacitor: function () {
      var g = G(); C(g, 0.05, 0.14, PL(0x26436e, 0.45), 0, 0.02, 0, 'y'); C(g, 0.051, 0.02, BM(0xc9cdd2), 0, 0.085, 0, 'y');
      B(g, 0.02, 0.1, 0.002, M.label, 0, 0.02, 0.0505); C(g, 0.006, 0.08, M.screw, -0.02, -0.09, 0, 'y'); C(g, 0.006, 0.08, M.screw, 0.02, -0.09, 0, 'y'); return g;
    },
    diode: function () { var g = G(); C(g, 0.028, 0.11, M.dark, 0, 0, 0, 'x'); C(g, 0.029, 0.016, PL(0xd9dde2), 0.035, 0, 0, 'x'); C(g, 0.006, 0.28, M.screw, 0, 0, 0, 'x'); return g; },
    rectifier: function () {
      var g = G(); B(g, 0.14, 0.14, 0.05, M.dark);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { C(g, 0.008, 0.08, M.screw, q[0] * 0.045, q[1] * 0.045, 0.05, 'z'); });
      C(g, 0.016, 0.052, M.steel, 0, 0, 0, 'z'); return g;
    },
    vfd: function () {
      var g = G(), i;
      B(g, 0.17, 0.32, 0.15, PL(0x4a525c)); B(g, 0.11, 0.05, 0.006, own({ color: 0x9fe0c0, roughness: 0.3, emissive: 0x1b4a3a }), 0, 0.09, 0.077);
      for (i = 0; i < 6; i++) B(g, 0.025, 0.02, 0.008, PL(0xd9dde2), -0.035 + (i % 3) * 0.035, 0.03 - Math.floor(i / 3) * 0.03, 0.077);
      B(g, 0.15, 0.04, 0.03, M.dark, 0, -0.13, 0.07); for (i = 0; i < 6; i++) B(g, 0.15, 0.004, 0.002, M.dark, 0, -0.04 - i * 0.01, 0.0755);
      return g;
    },
    wire: function () {
      var g = G(); C(g, 0.014, 0.34, PL(0xc0392b, 0.5), 0, 0, 0, 'x'); C(g, 0.008, 0.05, M.copper, 0.19, 0, 0, 'x'); C(g, 0.008, 0.05, M.copper, -0.19, 0, 0, 'x');
      C(g, 0.019, 0.04, M.white, 0.12, 0, 0, 'x'); C(g, 0.019, 0.04, M.white, -0.12, 0, 0, 'x'); return g;
    },
    junction: function () {
      var g = G(); B(g, 0.05, 0.07, 0.06, PL(0xcbc5b2)); C(g, 0.012, 0.16, PL(0xc0392b, 0.5), -0.1, 0, 0, 'x'); C(g, 0.012, 0.16, PL(0xc0392b, 0.5), 0.1, 0, 0, 'x');
      C(g, 0.012, 0.14, PL(0xc0392b, 0.5), 0, -0.1, 0, 'y'); C(g, 0.01, 0.01, M.screw, 0, 0, 0.032, 'z'); return g;
    },
    crossing: function () { var g = G(); C(g, 0.012, 0.34, PL(0xc0392b, 0.5), 0, 0, 0, 'x'); C(g, 0.012, 0.3, PL(0x2f6fd0, 0.5), 0, 0, 0.04, 'y'); return g; },
    compressor: function () { var g = G(); C(g, 0.025, 0.3, PL(0x2f6fd0, 0.5), 0, 0.05, 0, 'y'); C(g, 0.035, 0.05, M.brass, 0, -0.1, 0, 'y'); C(g, 0.02, 0.06, M.screw, 0, -0.15, 0, 'y'); return g; },
    shutoff: function () {
      var g = G(); B(g, 0.09, 0.07, 0.07, M.brass); C(g, 0.02, 0.16, M.screw, 0, 0, 0, 'x');
      var l = g.userData.lever = G(g, 0, 0.045, 0); B(l, 0.14, 0.02, 0.03, PL(0xc0282a, 0.5), 0.05, 0, 0); return g;
    },
    frl: function () {
      var g = G(); B(g, 0.11, 0.06, 0.08, M.steel, 0, 0.03, 0); C(g, 0.04, 0.12, GL(0xbfe0ee, 0.5), 0, -0.06, 0, 'y');
      C(g, 0.03, 0.05, M.dark, 0, 0.085, 0, 'y'); C(g, 0.016, 0.2, M.screw, 0, 0.03, 0, 'x'); return g;
    },
    gauge: function () {
      var g = G(); C(g, 0.062, 0.03, M.dark, 0, 0, 0, 'z', null, 32); C(g, 0.054, 0.032, M.white, 0, 0, 0.002, 'z', null, 32);
      var n = g.userData.needle = G(g, 0, 0, 0.02); B(n, 0.006, 0.045, 0.004, PL(0xc0282a), 0, 0.02, 0); C(g, 0.012, 0.06, M.brass, 0, -0.085, 0, 'y'); return g;
    },
    valve: function () {
      var g = G(); B(g, 0.22, 0.07, 0.08, BM(0xb9bfc6)); B(g, 0.07, 0.085, 0.085, M.dark, -0.145, 0.005, 0);
      g.userData.led = B(g, 0.024, 0.014, 0.006, ledMat(0x3a3020), -0.145, 0.03, 0.045); C(g, 0.03, 0.05, M.steel, 0.135, 0, 0, 'x');
      [-0.05, 0.05].forEach(function (x) { C(g, 0.013, 0.04, M.brass, x, 0.05, 0, 'y'); }); [-0.07, 0, 0.07].forEach(function (x) { C(g, 0.013, 0.04, M.brass, x, -0.05, 0, 'y'); });
      return g;
    },
    cylinder: function () {
      var g = G(); C(g, 0.055, 0.5, BM(0xc9cdd2), 0, 0, 0, 'x', null, 28); B(g, 0.03, 0.13, 0.13, M.darkSteel, -0.25, 0, 0); B(g, 0.03, 0.13, 0.13, M.darkSteel, 0.25, 0, 0);
      var r = g.userData.rod = G(g, 0.03, 0, 0); C(r, 0.02, 0.5, M.screw, 0, 0, 0, 'x'); B(r, 0.03, 0.16, 0.2, M.yellow, 0.26, 0, 0); return g;
    },
    fitting: function () { var g = G(); C(g, 0.028, 0.07, M.brass, 0, 0, 0, 'x'); C(g, 0.02, 0.07, M.brass, 0, -0.05, 0, 'y'); C(g, 0.016, 0.05, M.dark, 0, 0.05, 0, 'y'); C(g, 0.03, 0.02, PL(0x2f6fd0), 0.045, 0, 0, 'x'); return g; },
    pump: function () { var g = G(); C(g, 0.09, 0.2, M.blue, -0.08, 0, 0, 'x'); B(g, 0.12, 0.14, 0.14, M.darkSteel, 0.09, 0, 0); C(g, 0.02, 0.08, M.dark, 0.09, 0.1, 0, 'y'); B(g, 0.34, 0.02, 0.18, M.char, 0, -0.1, 0); return g; },
    tank: function () { var g = G(); B(g, 0.3, 0.18, 0.2, ST(0x586472)); C(g, 0.03, 0.04, PL(0xc0282a), -0.08, 0.11, 0, 'y'); B(g, 0.02, 0.1, 0.006, GL(0xbfe0ee, 0.6), 0.1, 0, 0.102); return g; }
  };
  sc.build = build;

  /* ---------------------------------------------------------------- room */
  function blob(x, z, w, d, op) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: TEX.blob, transparent: true, opacity: op || 0.7, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); m.renderOrder = 1; m.userData.noPick = true; scene.add(m);
  }
  function title(text, x, y, z) { var l = label(text, 0.12, { bg: 'rgba(34,38,44,0.88)' }); l.position.set(x, y, z); scene.add(l); }

  function buildRoom() {
    // a closed room (floor, four walls, ceiling) so no camera position ever looks out into empty space
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), std('floor', { color: 0xffffff, map: TEX.floor, roughness: 0.62, metalness: 0.02 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0.2, 0, 4.2); floor.receiveShadow = true; scene.add(floor);
    var ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), new THREE.MeshBasicMaterial({ color: 0xd9d5cc })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0.2, 4.5, 4.2); scene.add(ceil);
    shade(B(scene, 14, 4.5, 0.2, M.wall, 0.2, 2.25, -4.85), false, true); B(scene, 14, 4.5, 0.2, M.wall, 0.2, 2.25, 13.25);
    shade(B(scene, 0.2, 4.5, 18, M.wall, -6.7, 2.25, 4.2), false, true); shade(B(scene, 0.2, 4.5, 18, M.wall, 7.1, 2.25, 4.2), false, true);
    B(scene, 14, 0.14, 0.03, M.char, 0.2, 0.07, -4.74); B(scene, 0.03, 0.14, 18, M.char, -6.59, 0.07, 4.2); B(scene, 0.03, 0.14, 18, M.char, 6.99, 0.07, 4.2);
    B(scene, 14, 0.05, 0.014, M.blue, 0.2, 3.62, -4.745);
    // overhead luminaires (drawn bright; the actual light comes from the lights below)
    var lum = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    [-1.8, 3.2].forEach(function (z) { [-3.6, 0.4, 4.4].forEach(function (x) { B(scene, 2.2, 0.05, 0.45, M.char, x, 4.46, z); B(scene, 2.1, 0.02, 0.36, lum, x, 4.43, z).userData.noPick = true; }); });
    // working clearance marking in front of the electrical panel (functional safety marking)
    [[-3.4, -3.05, 2.1, 0.07], [-3.4, -4.2, 2.1, 0.07], [-4.45, -3.62, 0.07, 1.22], [-2.35, -3.62, 0.07, 1.22]].forEach(function (q) { B(scene, q[2], 0.004, q[3], M.yellow, q[0], 0.004, q[1]); });
    blob(-3.4, -4.45, 2.6, 1.0, 0.55); blob(0.6, -1.3, 5.4, 1.9); blob(4.2, -3.9, 3.2, 1.7); blob(6.5, -0.6, 1.5, 2.9, 0.6);
  }

  /* Control panel: wall-mounted enclosure, door with operator devices, mounting plate inside. */
  function buildPanel() {
    var enc = G(scene, -3.4, 1.52, -4.53), i;
    // shell
    shade(B(enc, 1.7, 1.8, 0.02, M.enc, 0, 0, -0.2), true, false);
    shade(B(enc, 0.02, 1.8, 0.42, M.enc, -0.84, 0, 0), true, false); shade(B(enc, 0.02, 1.8, 0.42, M.enc, 0.84, 0, 0), true, false);
    shade(B(enc, 1.7, 0.02, 0.42, M.enc, 0, 0.89, 0), true, false); B(enc, 1.7, 0.02, 0.42, M.enc, 0, -0.89, 0);
    B(enc, 0.28, 1.8, 0.02, M.enc, 0.71, 0, 0.2); B(enc, 0.02, 1.76, 0.4, M.enc, 0.57, 0, 0);                 // disconnect flange and its inner wall
    B(enc, 1.74, 0.03, 0.46, M.enc, 0, 0.915, 0.01);                                                          // rain lip
    B(enc, 1.4, 0.012, 0.012, M.rubber, -0.14, 0.87, 0.2); B(enc, 1.4, 0.012, 0.012, M.rubber, -0.14, -0.87, 0.2);   // door gasket
    [[-0.78, 0.96], [0.78, 0.96], [-0.78, -0.96], [0.78, -0.96]].forEach(function (q) { B(enc, 0.1, 0.12, 0.012, M.zinc, q[0], q[1], -0.2); C(enc, 0.014, 0.012, M.screw, q[0], q[1] + (q[1] > 0 ? 0.02 : -0.02), -0.19, 'z'); });
    [0.62, 0, -0.62].forEach(function (y) { C(enc, 0.02, 0.13, M.zinc, -0.862, y, 0.222, 'y'); C(enc, 0.008, 0.15, M.darkSteel, -0.862, y, 0.222, 'y'); });   // hinges
    // cable entry at the bottom, conduits down to the floor tray
    [-0.6, -0.36, -0.12].forEach(function (x) { C(enc, 0.036, 0.05, PL(0x8f959b), x, -0.925, 0.02, 'y'); C(enc, 0.045, 0.014, PL(0x7a8086), x, -0.905, 0.02, 'y', null, 6); });
    pipe(scene, [[-4.0, 0.58, -4.51], [-4.0, 0.1, -4.51]], 0.026, M.zinc); pipe(scene, [[-3.76, 0.58, -4.51], [-3.76, 0.1, -4.51]], 0.026, M.zinc); pipe(scene, [[-3.52, 0.58, -4.51], [-3.52, 0.1, -4.51]], 0.026, M.zinc);
    pipe(scene, [[-2.69, 2.44, -4.6], [-2.69, 4.2, -4.6]], 0.034, M.zinc);                                    // incoming supply from above
    // mounting plate with DIN rails and slotted duct
    var mp = G(enc, -0.14, 0, -0.17);
    B(mp, 1.3, 1.7, 0.012, BM(0xd0d3d5, 0.6));
    [0.6, 0.13, -0.46].forEach(function (y) { B(mp, 1.12, 0.035, 0.008, M.zinc, 0, y, 0.011); B(mp, 1.12, 0.008, 0.014, M.zinc, 0, y + 0.0175, 0.016); B(mp, 1.12, 0.008, 0.014, M.zinc, 0, y - 0.0175, 0.016); });
    var slots = [];
    [[0, 0.385, 1.2, true], [0, -0.215, 1.2, true], [0, -0.69, 1.2, true], [-0.625, -0.15, 1.12, false], [0.625, -0.15, 1.12, false]].forEach(function (d) {
      var len = d[2], hz = d[3];
      B(mp, hz ? len : 0.055, hz ? 0.06 : len, 0.06, M.duct, d[0], d[1], 0.036); B(mp, hz ? len : 0.059, hz ? 0.064 : len, 0.004, PL(0xaab0b6, 0.7), d[0], d[1], 0.068);
      for (var k = 0, n = Math.floor(len / 0.03); k < n; k++) {
        var u = -len / 2 + 0.02 + k * 0.03;
        if (hz) { slots.push([d[0] + u, d[1] + 0.031, 0.04, 1, 1, 1]); slots.push([d[0] + u, d[1] - 0.031, 0.04, 1, 1, 1]); }
        else { slots.push([d[0] + 0.0285, d[1] + u, 0.04, 0.33, 3, 1]); slots.push([d[0] - 0.0285, d[1] + u, 0.04, 0.33, 3, 1]); }
      }
    });
    inst(mp, boxG(0.012, 0.004, 0.044), M.dark, slots);
    // devices (reference tags match the drawings)
    function put(ref, kind, x, y, dz, tag, tp, arg) { var d = build[kind](arg); d.position.set(x, y, 0.022 + dz); mp.add(d); return reg(ref, d, 'panel', tag, tp, true); }
    put('PS1', 'psu', -0.44, 0.6, 0.066, 'PS1', [0, 0.155, 0.05]);
    put('CB1', 'breaker', -0.2, 0.6, 0.05, 'CB1', [0, 0.135, 0.05]);
    put('F1', 'fuse', -0.085, 0.6, 0.048, 'F1', [0, 0.125, 0.05]);
    put('FU', 'fuse3', 0.16, 0.6, 0.048, 'FU1–3', [0, 0.125, 0.05]);
    put('M1', 'contactor', -0.44, 0.14, 0.072, 'M1', [-0.155, 0.04, 0.05]);
    put('OL1', 'overload', -0.44, -0.035, 0.066, 'OL1', [-0.165, 0, 0.05]);
    put('CR1', 'relay', -0.19, 0.155, 0.055, 'CR1', [0, 0.105, 0.05]);
    put('CR2', 'relay', -0.06, 0.155, 0.055, 'CR2', [0, 0.105, 0.05]);
    put('PLC1', 'plc', 0.33, 0.13, 0.062, 'PLC1', [0, 0.165, 0.05]);
    put('TB1', 'terminal', -0.2, -0.46, 0.04, 'TB1', [-0.3, 0, 0.05], 12);
    put('PE', 'earth', 0.38, -0.46, 0.03, 'PE', [0, 0.06, 0.05]);
    // tidy, quiet wire stubs from device terminals into the nearest duct
    var stubs = [];
    function stub(x, y1, y2) { stubs.push([x, (y1 + y2) / 2, 0.05, 1, Math.abs(y1 - y2), 1]); }
    [-0.55, -0.5, -0.38, -0.33, -0.2, -0.085, 0.085, 0.16, 0.235].forEach(function (x) { stub(x, 0.415, 0.5); });
    [-0.5, -0.44, -0.38].forEach(function (x) { stub(x, 0.25, 0.355); stub(x, -0.185, -0.095); });
    [-0.21, -0.17, -0.08, -0.04].forEach(function (x) { stub(x, -0.185, 0.045); });
    for (i = 0; i < 9; i++) { stub(0.14 + i * 0.0422, 0.245, 0.355); stub(0.14 + i * 0.0422, -0.185, 0.015); }
    for (i = 0; i < 12; i++) { stub(-0.398 + i * 0.036, -0.41, -0.245); stub(-0.398 + i * 0.036, -0.66, -0.51); }
    [0.27, 0.32, 0.38, 0.44].forEach(function (x) { stub(x, -0.66, -0.475); });
    inst(mp, cylG(0.0045, 0.0045, 1, 8), M.wire, stubs);
    // flange-mounted disconnect (selectable with the door closed)
    var ds = build.disconnect(); ds.position.set(0.71, 0.5, 0.24); enc.add(ds); reg('DS1', ds, 'panel', 'DS1', [0, 0.17, 0.04]);
    B(enc, 0.18, 0.26, 0.2, PL(0x30343a), 0.71, 0.5, 0.08);
    var hz = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13), new THREE.MeshStandardMaterial({ map: TEX.hazard, roughness: 0.6 })); hz.position.set(0.71, 0.16, 0.2105); enc.add(hz);
    // door (hinged on the left) with operator devices
    door = G(enc, -0.85, 0, 0.225);
    shade(B(door, 1.42, 1.78, 0.03, M.enc, 0.71, 0, 0), true, false);
    B(door, 1.34, 1.7, 0.012, ST(0xc9ccc7), 0.71, 0, -0.02); B(door, 1.3, 0.04, 0.03, M.enc, 0.71, 0.56, -0.03); B(door, 1.3, 0.04, 0.03, M.enc, 0.71, -0.5, -0.03);
    B(door, 0.07, 0.2, 0.012, BM(0xb7bcc1, 0.36), 1.33, 0, 0.02); B(door, 0.03, 0.15, 0.03, BM(0xd6d9dc, 0.28), 1.33, -0.03, 0.045); C(door, 0.02, 0.03, BM(0xd6d9dc, 0.28), 1.33, 0.06, 0.035, 'z');
    C(door, 0.012, 0.006, M.dark, 1.33, 0.06, 0.052, 'z');
    var np = plate('TRAINING PANEL TP-1  ·  24 VDC CONTROL', 0.7, 0.07, '#22262b', '#f1f1ec'); np.position.set(0.71, 0.76, 0.0156); door.add(np);
    var hz2 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), hz.material); hz2.position.set(0.2, 0.6, 0.0156); door.add(hz2);
    function op(ref, kind, x, y, arg, tag, txt) {
      var o = build[kind](arg); o.position.set(x, y, 0.016); o.scale.setScalar(1.25); door.add(o); reg(ref, o, 'panel', tag, [0, 0.115, 0.05]);
      if (txt) { var p = plate(txt, 0.14, 0.044, '#f0f0eb', '#101214'); p.position.set(x, y - 0.092, 0.0158); door.add(p); }
      else B(door, 0.1, 0.03, 0.002, M.label, x, y - 0.088, 0.0155);
      return o;
    }
    op('PL1', 'pilot', 0.53, 0.36, 0x8a2020, 'PL1'); op('PL2', 'pilot', 0.89, 0.36, 0x1f6a30, 'PL2');
    op('PB2', 'button_green', 0.53, 0.08, null, 'PB2', 'START'); op('PB1', 'button_red', 0.89, 0.08, null, 'PB1', 'STOP');
    op('S1', 'selector', 0.53, -0.2, null, 'S1'); op('S2', 'selector', 0.89, -0.2, null, 'S2');
    title('CONTROL PANEL', -3.4, 2.6, -4.4);
  }

  function buildDisplay() {
    B(scene, 3.24, 1.9, 0.07, M.char, 0.6, 2.42, -4.71); B(scene, 0.5, 0.05, 0.05, M.char, 0.6, 1.44, -4.71);
    var cv = canvas(2048, 1152), tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = renderer.capabilities.getMaxAnisotropy();
    var m = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.744), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }));
    m.position.set(0.6, 2.42, -4.672); scene.add(m);
    var c = cv.getContext('2d'); c.fillStyle = '#f7f8f9'; c.fillRect(0, 0, 2048, 1152);
    display = { cv: cv, tex: tx, mesh: m };
    title('SCHEMATIC DISPLAY', 0.6, 3.5, -4.6);
  }

  function buildBench() {
    var b = G(scene, 4.2, 0, -3.9);
    shade(B(b, 2.3, 0.05, 0.95, PL(0xe3e1da, 0.5), 0, 0.92, 0), true, true); B(b, 2.32, 0.03, 0.97, M.blue, 0, 0.885, 0);
    [[-1.08, -0.42], [1.08, -0.42], [-1.08, 0.42], [1.08, 0.42]].forEach(function (q) { shade(B(b, 0.06, 0.87, 0.06, M.char, q[0], 0.435, q[1]), true); B(b, 0.09, 0.02, 0.09, M.rubber, q[0], 0.01, q[1]); });
    B(b, 2.16, 0.04, 0.04, M.char, 0, 0.2, -0.42); B(b, 0.04, 0.04, 0.84, M.char, -1.08, 0.2, 0); B(b, 0.04, 0.04, 0.84, M.char, 1.08, 0.2, 0);
    shade(B(b, 2.3, 0.62, 0.03, ST(0xcfd2cd), 0, 1.26, -0.46), true, false); B(b, 2.3, 0.04, 0.05, M.blue, 0, 1.59, -0.45);
    C(b, 0.4, 0.016, M.char, 0, 0.953, 0.05, 'y', null, 40); C(b, 0.41, 0.006, BM(0xb9bec4, 0.36), 0, 0.948, 0.05, 'y', null, 40);   // inspection stand
    benchRoot = G(b, 0, 0.962, 0.05);
    title('COMPONENT WORKBENCH', 4.2, 1.86, -4.2);
  }

  function buildConveyor() {
    var c = G(scene, 0.6, 0, -1.3), i, idl = [];
    shade(B(c, 4.2, 0.03, 0.56, std('belt', { color: 0xffffff, map: TEX.belt, roughness: 0.92, metalness: 0 }), 0, 0.855, 0), true, true);
    shade(B(c, 4.3, 0.15, 0.04, M.blue, 0, 0.8, 0.31), true); shade(B(c, 4.3, 0.15, 0.04, M.blue, 0, 0.8, -0.31), true);
    B(c, 4.3, 0.02, 0.07, M.blue, 0, 0.885, 0.325); B(c, 4.3, 0.02, 0.07, M.blue, 0, 0.885, -0.325);
    [-2.1, 2.1].forEach(function (x) { var d = C(c, 0.075, 0.56, BM(0xaab0b6, 0.4), x, 0.795, 0, 'z', null, 24); B(d, 0.02, 0.57, 0.1, M.darkSteel, 0, 0, 0); drums.push(d); });
    for (i = 0; i < 9; i++) idl.push([-1.6 + i * 0.4, 0.8, 0]);
    inst(c, GEO.idler || (GEO.idler = new THREE.CylinderGeometry(0.03, 0.03, 0.56, 12).rotateX(Math.PI / 2)), M.steel, idl);
    [[-1.9, 0.3], [1.9, 0.3], [-1.9, -0.3], [1.9, -0.3], [0, 0.3], [0, -0.3]].forEach(function (q) { shade(B(c, 0.06, 0.74, 0.06, M.char, q[0], 0.37, q[1]), true); B(c, 0.12, 0.02, 0.12, M.char, q[0], 0.01, q[1]); });
    [-1.9, 0, 1.9].forEach(function (x) { B(c, 0.04, 0.04, 0.6, M.char, x, 0.22, 0); });
    B(c, 3.8, 0.04, 0.04, M.char, 0, 0.22, -0.3);
    // drive: motor below the frame at the panel end, guarded drive to the drum
    var m = build.motor(); m.position.set(-1.72, 0.47, 0.56); m.rotation.y = Math.PI; m.scale.setScalar(0.95); c.add(m); shade(m.children[0], true); reg('MTR1', m, 'conveyor', 'MTR1', [0, 0.36, 0]);
    B(c, 0.42, 0.03, 0.34, M.char, -1.72, 0.3, 0.56); B(c, 0.05, 0.3, 0.05, M.char, -1.9, 0.15, 0.56); B(c, 0.05, 0.3, 0.05, M.char, -1.55, 0.15, 0.56);
    shade(B(c, 0.2, 0.52, 0.09, M.yellow, -2.08, 0.62, 0.4), true);                                             // drive guard
    // photoelectric sensor on a bracket, small junction box, conduit
    B(c, 0.04, 0.3, 0.04, M.zinc, 0.9, 1.0, 0.37); B(c, 0.09, 0.012, 0.08, M.zinc, 0.9, 1.15, 0.345);
    var pe = build.photo(); pe.position.set(0.9, 1.07, 0.3); pe.rotation.y = Math.PI; pe.scale.setScalar(1.5); c.add(pe); reg('PEC1', pe, 'conveyor', 'PEC1', [0, 0.16, 0.02]);
    zone = B(c, 0.07, 0.14, 0.5, new THREE.MeshBasicMaterial({ color: 0xff9a1f, transparent: true, opacity: 0.3, depthWrite: false, depthTest: false, toneMapped: false }), 0.9, 1.02, 0.02); zone.renderOrder = 12; zone.visible = false; zone.userData.noPick = true;
    B(c, 0.14, 0.14, 0.07, PL(0x8f959b), 0.9, 0.6, 0.36); screws(c, [[0.85, 0.65], [0.95, 0.65], [0.85, 0.55], [0.95, 0.55]], 0.396, 0.007);
    pipe(c, [[0.9, 0.86, 0.39], [0.9, 0.67, 0.39]], 0.012, M.rubber); pipe(c, [[0.9, 0.53, 0.36], [0.9, 0.06, 0.36]], 0.02, M.zinc);
    // carton
    boxMesh = B(c, 0.42, 0.32, 0.4, PL(0xb98d58, 0.85), -2.7, 1.03, 0); shade(boxMesh, true); B(boxMesh, 0.424, 0.01, 0.08, PL(0xd6c08f, 0.5), 0, 0.157, 0); B(boxMesh, 0.08, 0.2, 0.404, PL(0xd6c08f, 0.5), 0, 0.06, 0);
    // conduit on the floor: the visible link between the panel and the conveyor devices
    pipe(scene, [[-4.1, 0.06, -4.51], [-3.3, 0.06, -4.51], [-2.6, 0.06, -4.51], [-2.6, 0.06, -0.72], [-1.12, 0.06, -0.72]], 0.03, M.zinc);
    pipe(scene, [[-1.12, 0.06, -0.72], [-1.12, 0.62, -0.72]], 0.02, M.zinc);
    pipe(scene, [[-1.12, 0.06, -0.72], [1.5, 0.06, -0.72], [1.5, 0.06, -0.94]], 0.022, M.zinc);
    [[-2.6, -3.6], [-2.6, -2.4], [-2.6, -1.3]].forEach(function (q) { B(scene, 0.12, 0.012, 0.05, M.zinc, q[0], 0.094, q[1]); });
    title('CONVEYOR', 0.6, 1.72, -1.62);
  }

  function buildPneu() {
    var p = G(scene, 6.55, 0, -0.6); p.rotation.y = -Math.PI / 2;
    shade(B(p, 2.1, 0.05, 0.8, PL(0xe3e1da, 0.5), 0, 0.88, 0), true, true); B(p, 2.12, 0.03, 0.82, M.blue, 0, 0.845, 0);
    [[-0.98, -0.34], [0.98, -0.34], [-0.98, 0.34], [0.98, 0.34]].forEach(function (q) { shade(B(p, 0.05, 0.83, 0.05, M.char, q[0], 0.415, q[1]), true); });
    shade(B(p, 2.1, 0.8, 0.03, ST(0xcfd2cd), 0, 1.3, -0.38), true, false);
    function put(ref, kind, x, y, z, s, tag, tp) { var d = build[kind](); d.position.set(x, y, z); d.scale.setScalar(s || 1); p.add(d); return reg(ref, d, 'pneu', tag, tp); }
    put('SRC', 'compressor', -0.9, 1.38, -0.32, 1.1, 'AIR', [0, 0.25, 0.05]);
    put('SV1', 'shutoff', -0.66, 1.28, -0.32, 1.1, 'SV1', [0, 0.13, 0.05]);
    put('FRL1', 'frl', -0.38, 1.3, -0.32, 1.2, 'FRL1', [0, 0.17, 0.05]);
    put('PG1', 'gauge', -0.1, 1.36, -0.33, 1.2, 'PG1', [0, 0.12, 0.05]);
    put('V1', 'valve', 0.34, 1.3, -0.32, 1.2, 'V1 + SOL1', [0, 0.15, 0.05]);
    objs.SOL1 = objs.V1; stationOf.SOL1 = 'pneu';
    put('CYL1', 'cylinder', -0.32, 1.0, 0.06, 1.2, 'CYL1', [0, 0.14, 0.08]);
    put('FC', 'fitting', -0.6, 1.09, 0.06, 0.9, false);
    B(p, 0.18, 0.18, 0.05, ST(0xd3d6d1), 0.8, 1.3, -0.36);
    var ss = build.selector(); ss.position.set(0.8, 1.3, -0.334); p.add(ss); reg('SS2', ss, 'pneu', 'SS2', [0, 0.13, 0.06]);
    [[-0.78, 1.3, 0.12], [-0.52, 1.31, 0.14], [0.1, 1.31, 0.26]].forEach(function (q) { C(p, 0.012, q[2], PL(0x2f8fb8, 0.5), q[0], q[1], -0.32, 'x'); });   // air tube, not wire
    title('PNEUMATIC STATION', 6.6, 1.9, -0.6);
  }

  /* ---------------------------------------------------------------- lighting and environment */
  function buildLights() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb4afa5, 0.55)); scene.add(new THREE.AmbientLight(0xfff9f0, 0.32));
    key = new THREE.DirectionalLight(0xfff6ea, 2.3); key.position.set(-2.5, 9, 5.5); key.target.position.set(0.3, 0.6, -2.4);
    var s = key.shadow; s.camera.left = -7; s.camera.right = 7; s.camera.top = 6; s.camera.bottom = -5; s.camera.near = 2; s.camera.far = 20; s.bias = -0.0006; s.normalBias = 0.03; s.radius = 3;
    scene.add(key); scene.add(key.target);
    var fill = new THREE.DirectionalLight(0xeef3ff, 0.75); fill.position.set(1.5, 2.4, 8); fill.target.position.set(-1, 1.4, -4.5); scene.add(fill); scene.add(fill.target);   // keeps the enclosure interior readable
    try {
      var es = new THREE.Scene(), bright = new THREE.MeshBasicMaterial({ color: 0xffffff }), g = new THREE.BoxGeometry(1, 1, 1);
      bright.color.setRGB(7, 7, 7);
      var shell = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8f8c86, side: THREE.BackSide })); shell.scale.set(16, 9, 14); shell.position.y = 3.5; es.add(shell);
      [[-4, 7.9, -1], [0, 7.9, -1], [4, 7.9, -1], [0, 7.9, 3]].forEach(function (q) { var m = new THREE.Mesh(g, bright); m.scale.set(2.6, 0.05, 1.2); m.position.set(q[0], q[1], q[2]); es.add(m); });
      var fm = new THREE.MeshBasicMaterial({ color: 0xffffff }); fm.color.setRGB(1.6, 1.6, 1.7);
      var front = new THREE.Mesh(g, fm); front.scale.set(10, 4, 0.05); front.position.set(0, 3.5, 6.9); es.add(front);
      var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose(); g.dispose();
    } catch (err) { scene.environment = null; }
  }

  /* ---------------------------------------------------------------- camera */
  function tanV() { return Math.min(Math.tan(cam.hh) / aspect, 1.19); }
  function setProj() { camera.aspect = aspect; camera.fov = 2 * Math.atan(tanV()) * 180 / Math.PI; camera.updateProjectionMatrix(); }
  function applyCam() {
    var s = Math.sin(cam.phi), t = cam.t, p = camera.position;
    p.set(t.x + cam.r * s * Math.sin(cam.theta), t.y + cam.r * Math.cos(cam.phi), t.z + cam.r * s * Math.cos(cam.theta));
    p.x = Math.max(-6.3, Math.min(6.7, p.x)); p.y = Math.max(0.3, Math.min(4.3, p.y)); p.z = Math.max(-4.3, Math.min(12.6, p.z));   // stay inside the room
    camera.lookAt(t); setProj();
  }
  function box3(x1, y1, z1, x2, y2, z2) { return new THREE.Box3(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)); }
  function frame(bb, theta, phi, hh, margin, minR) {
    var s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    var ct = Math.abs(Math.cos(theta)), st = Math.abs(Math.sin(theta));
    var w = s.x * ct + s.z * st, dep = s.z * ct + s.x * st, h = s.y * Math.sin(phi) + dep * Math.cos(phi);
    var tv = Math.min(Math.tan(hh) / aspect, 1.19), th = Math.min(Math.tan(hh), tv * aspect);
    var r = Math.max(w / 2 / th, h / 2 / tv) * (margin || 1.15) + dep / 2;
    return { t: c, r: Math.max(minR || 0, r), theta: theta, phi: phi, hh: hh, rmin: Math.max(0.45, Math.max(s.x, s.y, s.z) * 0.7 + 0.25) };
  }
  var TMPB = null;
  function addBox(bb, o) {   // union of solid meshes only: label sprites and overlays do not count
    o.updateWorldMatrix(true, true);
    o.traverse(function (n) {
      if (!n.isMesh || n.userData.noPick) return;
      var gb = n.isInstancedMesh ? n.boundingBox : (n.geometry.boundingBox || (n.geometry.computeBoundingBox(), n.geometry.boundingBox));
      if (!gb) return;
      TMPB.copy(gb).applyMatrix4(n.matrixWorld); bb.union(TMPB);
    });
    return bb;
  }
  function refBox(refs) {
    var bb = new THREE.Box3(), n = 0;
    (refs || []).forEach(function (r) { var o = r === '__bench' ? (benchItems.length ? benchRoot : null) : objs[r]; if (o) { addBox(bb, o); n++; } });
    if (!n && refs && refs[0] === '__bench') return box3(3.95, 0.96, -4.05, 4.45, 1.42, -3.65);
    return (!n || bb.isEmpty()) ? null : bb;
  }
  var STATION = {
    overview: function () { return aspect < 0.9 ? frame(box3(-4.6, 0, -4.7, 5.4, 3.0, -0.6), 0, 1.02, 0.49, 0.96) : frame(box3(-4.7, 0, -4.7, 6.6, 3.2, 0.6), 0, 1.2, 0.49, 0.9); },
    hero: function () { return frame(box3(-4.5, 0.1, -4.7, 2.9, 2.75, -0.8), 0.34, 1.36, 0.4, aspect < 0.9 ? 0.98 : 0.9); },
    panel: function () { return frame(box3(-4.3, 0.5, -4.75, -2.5, 2.7, -4.25), 0, 1.5, 0.2, 1.06); },
    display: function () { return frame(box3(-1.0, 1.45, -4.75, 2.2, 3.4, -4.6), 0, 1.45, 0.4, 1.12); },
    bench: function () { return frame(box3(3.4, 0.9, -4.3, 5.0, 1.65, -3.45), -0.08, 1.2, 0.45, 1.25); },
    conveyor: function () { return frame(box3(-1.6, 0.1, -1.65, 2.8, 1.35, -0.7), 0.22, 1.12, 0.45, 1.08); },
    pneu: function () { return frame(box3(6.1, 0.8, -1.65, 6.95, 1.8, 0.45), -1.3, 1.2, 0.45, 1.12); }
  };
  function goTo(goal, opts, mode) {
    if (!renderer || !goal) return false;
    if (locked && !(opts && opts.user)) return false;
    goal.rmin = goal.rmin || 0.6; cam.home = goal; cam.mode = mode || cam.mode; cam.rmin = goal.rmin; cam.rmax = Math.max(15, goal.r * 1.6);
    if (rm) { cam.t.copy(goal.t); cam.r = goal.r; cam.theta = goal.theta; cam.phi = goal.phi; cam.hh = goal.hh; cam.g = null; applyCam(); }
    else cam.g = { t: goal.t.clone(), r: goal.r, theta: goal.theta, phi: goal.phi, hh: goal.hh };
    dirty = true; return true;
  }
  function thetaFor(station) { return station === 'conveyor' ? 0.22 : station === 'pneu' ? -1.3 : station === 'bench' ? -0.08 : 0; }

  sc.focus = function (name, opts) { return goTo((STATION[name] || STATION.overview)(), opts, STATION[name] ? name : 'overview'); };
  /* Close-up of one part (or the bench subject) so its label is readable. */
  sc.focusOn = function (ref, opts) {
    if (!renderer) return false;
    if (locked && !(opts && opts.user)) return false;
    if (inside[ref]) sc.setDoor(true);
    var bb = refBox([ref]); if (!bb) return false;
    var st = ref === '__bench' ? 'bench' : stationOf[ref], pnl = st === 'panel';
    return goTo(frame(bb, thetaFor(st), pnl ? 1.42 : 1.28, pnl ? 0.3 : 0.42, ref === '__bench' ? 1.5 : 3.0, ref === '__bench' ? 1.1 : 0.9), opts, 'inspect');
  };
  sc.setCamera = function (mode, refs, opts) {
    if (refs && !Array.isArray(refs) && typeof refs === 'object') { opts = refs; refs = null; }
    if (mode === 'overview') return sc.focus('overview', opts);
    if (mode === 'panel') return sc.focus('panel', opts);
    if (mode === 'inspect') return sc.focusOn((refs && refs[0]) || (selRef && (objs[selRef] ? selRef : '__bench')) || '__bench', opts);
    if (mode === 'trace') {
      if (locked && !(opts && opts.user)) return false;
      var list = (refs || []).filter(function (r) { return !!objs[r]; });
      if (!list.length) return sc.focus('panel', opts);
      var allPanel = list.every(function (r) { return stationOf[r] === 'panel'; });
      var anyIn = list.some(function (r) { return inside[r]; }), anyDoor = list.some(function (r) { return stationOf[r] === 'panel' && !inside[r]; });
      if (anyIn) sc.setDoor(true);
      // devices on the open door and on the mounting plate together: show the whole opened enclosure
      if (allPanel && anyIn && anyDoor) return goTo(frame(box3(-5.0, 0.55, -4.75, -2.5, 2.5, -3.5), 0, 1.45, 0.28, 1.04), opts, 'trace');
      var bb = refBox(list); if (!bb) return sc.focus('panel', opts);
      return goTo(frame(bb, allPanel ? 0 : 0.2, allPanel ? 1.45 : 1.15, allPanel ? 0.28 : 0.45, 1.45, 1.4), opts, 'trace');
    }
    return sc.focus(mode, opts);
  };
  sc.zoom = function (f) {
    if (!renderer) return;
    var base = cam.g ? cam.g.r : cam.r, r = Math.max(cam.rmin, Math.min(cam.rmax, base * (f || 1)));
    if (rm) { cam.r = r; cam.g = null; applyCam(); }
    else if (cam.g) cam.g.r = r; else cam.g = { t: cam.t.clone(), r: r, theta: cam.theta, phi: cam.phi, hh: cam.hh };
    dirty = true;
  };
  sc.resetView = function () { var h = cam.home; if (h) goTo({ t: h.t.clone(), r: h.r, theta: h.theta, phi: h.phi, hh: h.hh, rmin: h.rmin }, { user: true }); };
  sc.setLock = function (v) { locked = !!v; };
  sc.hero = function (on) {
    if (!renderer) return;
    if (on) { sc.setDoor(false); goTo(STATION.hero(), { user: true }, 'hero'); } else sc.focus('overview', { user: true });
  };
  sc.getMode = function () { return cam.mode; };

  /* ---------------------------------------------------------------- pointer, keyboard, picking */
  function shown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function hitAt(e) {
    var r = el.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    var hits = ray.intersectObjects(scene.children, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (o.isSprite || o.isLineSegments || o.userData.noPick || !shown(o)) continue;
      while (o) {
        if (o.userData.noPick) break;
        if (o.userData.bench != null) return { bench: o.userData.bench };
        if (o.userData.ref) return { ref: o.userData.ref };
        o = o.parent;
      }
      if (o) continue;
      return null;   // something solid without a tag (door, table, wall) is in front
    }
    return null;
  }
  function setHover(ref) {
    if (ref === hovRef) return;
    hovRef = ref; el.style.cursor = ref ? 'pointer' : 'grab';
    placeOutline(hovBox, ref && objs[ref] && ref !== selRef ? objs[ref] : null, 0.012);
    dirty = true; hoverCb(ref);
  }
  function bindControls() {
    var ptrs = {}, down = null, moved = 0, pressing = null, lastHover = 0, pinch = 0;
    function count() { return Object.keys(ptrs).length; }
    el.style.cursor = 'grab';
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    el.addEventListener('pointerdown', function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (count() === 2) { var k = Object.keys(ptrs); pinch = Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y); down = null; return; }
      var h = e.button === 0 ? hitAt(e) : null;
      if (h && (h.ref === 'PB1' || h.ref === 'PB2')) { pressing = h.ref; pressCb(pressing, true); }
      else { down = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; moved = 0; }
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
      if (count() === 2 && pinch) {
        var k = Object.keys(ptrs), d = Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y);
        if (d > 0) { cam.g = null; cam.r = Math.max(cam.rmin, Math.min(cam.rmax, cam.r * pinch / d)); pinch = d; dirty = true; }
        return;
      }
      if (pressing) return;
      if (down) {
        var dx = e.clientX - down.x, dy = e.clientY - down.y; moved += Math.abs(dx) + Math.abs(dy);
        down.x = e.clientX; down.y = e.clientY; cam.g = null;
        if (down.pan) {
          var k2 = cam.r * 2 * Math.tan(cam.hh) / Math.max(1, cssW);
          V1.set(Math.cos(cam.theta), 0, -Math.sin(cam.theta)); cam.t.addScaledVector(V1, -dx * k2); cam.t.y += dy * k2;
          cam.t.x = Math.max(-5.2, Math.min(5.8, cam.t.x)); cam.t.y = Math.max(0.2, Math.min(3.6, cam.t.y)); cam.t.z = Math.max(-4.7, Math.min(3, cam.t.z));
        } else {
          cam.theta = Math.max(-1.45, Math.min(1.45, cam.theta - dx * 0.006)); cam.phi = Math.max(0.55, Math.min(1.53, cam.phi - dy * 0.005));
        }
        dirty = true; return;
      }
      var now = performance.now();
      if (now - lastHover > 45 && e.pointerType !== 'touch') { lastHover = now; var h = hitAt(e); setHover(h && h.ref ? h.ref : null); }
    });
    function up(e) {
      delete ptrs[e.pointerId]; pinch = 0;
      if (pressing) { var r = pressing; pressing = null; pressCb(r, false); if (e.type === 'pointerup') pickCb({ ref: r }); return; }
      if (down && moved < 6 && e.type === 'pointerup') { var h = hitAt(e); if (h) pickCb(h); }
      down = null;
    }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', function () { if (!down && !pressing) setHover(null); });
    el.addEventListener('wheel', function (e) { e.preventDefault(); sc.zoom(e.deltaY > 0 ? 1.12 : 0.89); }, { passive: false });
    el.addEventListener('keydown', function (e) {
      var k = e.key, used = true;
      if (k === 'ArrowLeft') cam.theta = Math.max(-1.45, cam.theta - 0.12); else if (k === 'ArrowRight') cam.theta = Math.min(1.45, cam.theta + 0.12);
      else if (k === 'ArrowUp') cam.phi = Math.max(0.55, cam.phi - 0.08); else if (k === 'ArrowDown') cam.phi = Math.min(1.53, cam.phi + 0.08);
      else if (k === '+' || k === '=') { sc.zoom(0.89); e.preventDefault(); e.stopPropagation(); return; }
      else if (k === '-') { sc.zoom(1.12); e.preventDefault(); e.stopPropagation(); return; }
      else if (k === '0') { sc.resetView(); e.preventDefault(); e.stopPropagation(); return; }
      else used = false;
      if (used) { cam.g = null; dirty = true; e.preventDefault(); e.stopPropagation(); }
    });
  }

  /* ---------------------------------------------------------------- selection and hover outlines */
  function makeOutline(color, fill) {
    var g = new THREE.Group(), geo = GEO.unit || (GEO.unit = new THREE.BoxGeometry(1, 1, 1));
    var ln = new THREE.LineSegments(GEO.unitE || (GEO.unitE = new THREE.EdgesGeometry(geo)), new THREE.LineBasicMaterial({ color: color, depthTest: false, transparent: true, toneMapped: false }));
    ln.renderOrder = 15; g.add(ln);
    if (fill) { var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: fill, depthWrite: false, toneMapped: false })); m.userData.noPick = true; m.renderOrder = 14; g.add(m); }
    g.visible = false; g.userData.noPick = true; scene.add(g); return g;
  }
  function placeOutline(g, o, pad) {
    if (!g) return;
    if (!o) { g.visible = false; return; }
    BB.makeEmpty(); addBox(BB, o); if (BB.isEmpty()) { g.visible = false; return; }
    BB.getCenter(g.position); BB.getSize(g.scale); g.scale.addScalar(pad || 0.02); g.visible = true;
  }
  function selObj() { return selRef === '__bench' ? (benchItems[0] ? benchItems[0].userData.model : null) : (selRef ? objs[selRef] : null); }
  function refreshSel() {
    var o = selObj(); placeOutline(selBox, o, 0.024);
    if (selMarker) { selMarker.visible = !!o; if (o) sizeMarker(); }
    selDirty = false; dirty = true;
  }
  function sizeMarker() {   // constant on-screen size (about 22 px tall), just above the selection box
    if (!selMarker || !selMarker.visible) return;
    var top = selBox.position.y + selBox.scale.y / 2, z = selBox.position.z + selBox.scale.z / 2;
    V1.set(selBox.position.x, top, z);
    var h = 2 * camera.position.distanceTo(V1) * tanV() * 22 / Math.max(1, cssH);
    selMarker.scale.set(h * selMarker.userData.ar, h, 1); selMarker.position.set(selBox.position.x, top + h * 0.75 + (selRef === '__bench' ? selBox.scale.y * 0.22 : (labelsOn ? 0.085 : 0)), z);   // clears the part's own tag
  }
  sc.select = function (ref) {
    if (!renderer) return;
    selRef = ref || null;
    if (hovRef && hovRef === selRef) placeOutline(hovBox, null);
    refreshSel();
  };

  /* ---------------------------------------------------------------- workbench */
  function disposeTree(o) {
    o.traverse(function (n) {
      if (n.isInstancedMesh) n.dispose();
      var m = n.material; if (m && m.userData && m.userData.own) { if (m.map && m.map.userData.own) m.map.dispose(); m.dispose(); }
    });
  }
  function clearBench() { benchItems.forEach(function (b) { benchRoot.remove(b); disposeTree(b); }); benchItems = []; inspectState = null; }
  function seat(m, x, size, tag, i, lift) {
    var wrap = G(benchRoot, x, 0, 0);
    BB.makeEmpty(); addBox(BB, m); var s = BB.getSize(V1), k = size / Math.max(s.x, s.y, s.z);
    m.scale.setScalar(k); m.position.set(-(BB.min.x + BB.max.x) / 2 * k, -BB.min.y * k + 0.025 + (lift || 0), -(BB.min.z + BB.max.z) / 2 * k);
    wrap.add(m); wrap.userData.model = m; C(wrap, 0.2, 0.02, M.char, 0, 0.011, 0, 'y', null, 32).scale.set(size * 2.1, 1, size * 2.1);
    if (lift) C(wrap, 0.03, lift, M.darkSteel, 0, 0.02 + lift / 2, 0, 'y');
    if (tag) { var l = label(tag, 0.09, { bg: '#161b22' }); l.position.set(0, s.y * k + 0.14, 0); wrap.add(l); wrap.userData.bench = i; }
    benchItems.push(wrap); return m;
  }
  /* Show one or several catalog models on the workbench. */
  sc.bench = function (shapes, tagList) {
    if (!renderer) return;
    clearBench();
    (shapes || []).forEach(function (shape, i) { var n = shapes.length; seat((build[shape] || build.terminal)(), n === 1 ? 0 : (i - (n - 1) / 2) * 0.52, n === 1 ? 0.46 : 0.32, tagList && tagList[i], i); });
    if (selRef === '__bench') refreshSel(); dirty = true; shadowDirty = true;
  };
  /* Inspection subject: assembled model, optional terminal labels, optional simplified cutaway. */
  sc.inspect = function (shape, opts) {
    if (!renderer) return;
    opts = opts || {}; clearBench();
    if (shape) {
      var cut = !!opts.cutaway && (shape === 'contactor' || shape === 'relay' || shape === 'aux');
      var m = seat(cut ? build.contactorCut() : (build[shape] || build.terminal)(), 0, cut ? 0.5 : 0.44, null, 0, opts.terminals && !cut ? 0.09 : 0);
      if (cut) m.userData.notes.forEach(function (t) { var l = label(t[0], 0.026); l.position.set(t[1], t[2], t[3]); m.add(l); });
      else if (opts.terminals && m.userData.terms) m.userData.terms.forEach(function (t) { var l = label(t[0], 0.026, { bg: 'rgba(31,111,235,0.95)' }); l.position.set(t[1], t[2], t[3]); m.add(l); });
      inspectState = { m: m, cut: cut, slow: !!opts.slow, p: view.M1 ? 1 : 0, shape: shape };
      applyInspect();
    }
    if (selRef === '__bench') refreshSel(); dirty = true; shadowDirty = true;
  };
  function applyInspect() {
    var s = inspectState; if (!s) return;
    var u = s.m.userData;
    if (s.cut) { u.carrier.position.y = -u.travel * s.p; glow(u.coil, s.p > 0.02, 0xff7a1a, 0.5); }
    else if (s.shape === 'contactor') { u.arm.position.z = view.M1 ? 0.078 : 0.09; u.ind.forEach(function (i) { glow(i, view.M1, 0xff9f1a); }); }
  }

  /* ---------------------------------------------------------------- display, door, toggles */
  sc.setDisplay = function (svg, vb) {
    if (!display) return;
    try {
      var img = new Image();
      img.onload = function () {
        var c = display.cv.getContext('2d'), W = 2048, H = 1152;
        c.fillStyle = '#f7f8f9'; c.fillRect(0, 0, W, H);
        var k = Math.min((W - 48) / vb[2], (H - 48) / vb[3]), w = vb[2] * k, h = vb[3] * k;
        c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        display.tex.needsUpdate = true; dirty = true;
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch (err) { /* the wall display mirrors the centre schematic; it is never the only copy */ }
  };
  sc.setDoor = function (open) {
    if (!renderer) return;
    doorT = open ? DOOR_OPEN : 0;
    if (rm) { doorA = doorT; door.rotation.y = -doorA; selDirty = true; }
    dirty = true; shadowDirty = true;
  };
  sc.isDoorOpen = function () { return doorT > 0; };
  sc.isInside = function (ref) { return !!inside[ref]; };
  sc.setLabels = function (v) { labelsOn = !!v; tags.forEach(function (t) { t.visible = labelsOn; }); selDirty = true; dirty = true; };
  sc.showSensorZone = function (v) { if (zone) { zone.visible = !!v; dirty = true; } };
  sc.onPick = function (fn) { pickCb = fn || function () {}; };
  sc.onHover = function (fn) { hoverCb = fn || function () {}; };
  sc.onPress = function (fn) { pressCb = fn || function () {}; };
  sc.setRM = function (v) { rm = !!v; dirty = true; };
  sc.has = function (ref) { return !!objs[ref]; };
  sc.stationOf = function (ref) { return stationOf[ref]; };

  /* ---------------------------------------------------------------- quality and diagnostics */
  function applySize() {
    if (!renderer) return;
    cssW = Math.max(1, el.clientWidth || 300); cssH = Math.max(1, el.clientHeight || 200); aspect = cssW / cssH;
    var dpr = root.devicePixelRatio || 1, q = QUALITY[quality], s = q.ratio(dpr);
    s = Math.min(s, Math.sqrt(q.budget / (cssW * cssH)));          // pixel budget
    if (quality !== 'low') s = Math.min(s, dpr);                    // never beyond the display's physical pixels
    s = Math.max(0.5, s * adaptK);
    pxScale = s; renderer.setPixelRatio(s); renderer.setSize(cssW, cssH, false);
    setProj(); dirty = true;
  }
  sc.resize = function () { if (renderer) { applySize(); applyCam(); } };
  sc.setQuality = function (preset, o) {
    if (QUALITY[preset]) quality = preset;
    if (o && o.adaptive != null) adaptive = !!o.adaptive;
    adaptK = 1; slowT = 0;
    if (!renderer) return;
    var q = QUALITY[quality], size = Math.min(q.shadow, renderer.capabilities.maxTextureSize);
    key.castShadow = size > 0;
    if (size > 0 && key.shadow.mapSize.x !== size) { key.shadow.mapSize.set(size, size); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
    key.shadow.radius = quality === 'balanced' ? 2.5 : 3.5;
    var an = quality === 'low' ? 1 : renderer.capabilities.getMaxAnisotropy();
    [TEX.floor, TEX.brushed, TEX.belt].forEach(function (t) { if (t.anisotropy !== an) { t.anisotropy = an; t.needsUpdate = true; } });
    shadowDirty = true; applySize();
  };
  sc.getDiagnostics = function () {
    if (!renderer) return null;
    var v = renderer.getDrawingBufferSize(new THREE.Vector2()), name = 'WebGL';
    try { var gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); name = (ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || name; } catch (e) {}
    return { quality: quality, cssW: cssW, cssH: cssH, dpr: root.devicePixelRatio || 1, scale: Math.round(pxScale * 1000) / 1000, bufferW: v.x, bufferH: v.y,
      fps: Math.round(fps), calls: lastInfo.calls, triangles: lastInfo.triangles, shadows: !!key.castShadow, renderer: String(name), adaptive: adaptive, adaptiveFactor: Math.round(adaptK * 100) / 100 };
  };

  /* ---------------------------------------------------------------- state → model */
  sc.update = function (v) { view = v || {}; if (renderer) { applyView(); dirty = true; shadowDirty = true; selDirty = true; } };
  function applyView() {
    var v = view, u;
    function ud(ref) { return objs[ref] ? objs[ref].userData : {}; }
    glow(ud('PS1').led, v.supply, 0x35d06a);
    if (ud('F1').cart) ud('F1').cart.visible = v.fuseIn !== false;
    if (ud('DS1').handle) ud('DS1').handle.rotation.z = v.mains === false ? Math.PI / 2 : 0;
    ['PB1', 'PB2'].forEach(function (b) {   // momentary: in while pressed, back out when released
      var cap = ud(b).cap; if (!cap) return;
      cap.position.z = v[b] ? 0.022 : 0.035; cap.scale.set(v[b] ? 0.9 : 1, 1, v[b] ? 0.9 : 1);
    });
    if (ud('S1').knob) ud('S1').knob.rotation.z = v.S1 ? -0.75 : 0.75;
    if (ud('S2').knob) ud('S2').knob.rotation.z = v.S2 ? -0.75 : 0.75;
    if (ud('SS2').knob) ud('SS2').knob.rotation.z = v.SS2 ? -0.75 : 0.75;
    glow(ud('PL1').lens, v.PL1, 0xff3524, 2.2); glow(ud('PL2').lens, v.PL2, 0x2be05a, 2.2);
    glow(ud('CR1').flag, v.CR1, 0xff9f1a); glow(ud('CR2').flag, v.CR2, 0xff9f1a);
    u = ud('M1');
    if (u.arm) { u.arm.position.z = v.M1 ? 0.078 : 0.09; glow(u.arm, v.M1, 0x2f6fd0, 0.5); u.ind.forEach(function (i) { glow(i, v.M1, 0xff9f1a); }); }
    if (ud('OL1').flag) ud('OL1').flag.visible = !!v.ol;
    u = ud('PLC1'); if (u.leds) { glow(u.leds[0], v.I0, 0x35d06a); glow(u.leds[3], v.Q0, 0xff9f1a); glow(u.pwr, v.supply, 0x35d06a); }
    u = ud('PEC1'); if (u.led) { glow(u.led, v.sensor, 0xff9f1a); glow(u.pwr, v.supply, 0x35d06a); }
    glow(ud('V1').led, v.sol, 0xff9f1a);
    if (ud('SV1').lever) ud('SV1').lever.rotation.y = v.air === false ? Math.PI / 2 : 0;
    if (ud('PG1').needle) ud('PG1').needle.rotation.z = 2.1 - (v.bar || 0) * 0.55;
    if (ud('CYL1').rod) ud('CYL1').rod.position.x = 0.03 + (v.cyl || 0) * 0.42;
    if (inspectState && !(inspectState.slow && inspectState.cut && !rm)) { inspectState.p = v.M1 ? 1 : 0; applyInspect(); }
  }

  /* ---------------------------------------------------------------- animation (no allocation per frame) */
  function step(dt) {
    var active = false, k;
    clock += dt;
    if (cam.g) {
      k = 1 - Math.exp(-dt * 6.5);
      cam.t.lerp(cam.g.t, k); cam.r += (cam.g.r - cam.r) * k; cam.theta += (cam.g.theta - cam.theta) * k; cam.phi += (cam.g.phi - cam.phi) * k; cam.hh += (cam.g.hh - cam.hh) * k;
      if (Math.abs(cam.r - cam.g.r) < 0.004 && cam.t.distanceToSquared(cam.g.t) < 1e-5 && Math.abs(cam.theta - cam.g.theta) < 0.002 && Math.abs(cam.phi - cam.g.phi) < 0.002 && Math.abs(cam.hh - cam.g.hh) < 0.002) {
        cam.t.copy(cam.g.t); cam.r = cam.g.r; cam.theta = cam.g.theta; cam.phi = cam.g.phi; cam.hh = cam.g.hh; cam.g = null;
      }
      active = true;
    }
    if (doorA !== doorT) {
      var d = doorT - doorA, st = dt * 2.6;
      doorA = Math.abs(d) <= st ? doorT : doorA + Math.sign(d) * st;
      door.rotation.y = -doorA; active = true; shadowDirty = true; selDirty = true;
    }
    if (view.motor && !rm) {
      beltTex.offset.x -= dt * 1.9; drums[0].rotation.y -= dt * 8; drums[1].rotation.y -= dt * 8;
      if (objs.MTR1) objs.MTR1.userData.shaft.rotation.x += dt * 14;
      active = true;
    }
    // carton: arrives at the sensor when view.box is true, leaves when it goes false
    var target = view.box ? 0.9 : (boxState.phase === 'leaving' ? 2.75 : -2.7);
    if (view.box) boxState.phase = 'at'; else if (boxState.phase === 'at') { boxState.phase = 'leaving'; target = 2.75; }
    if (rm) { var want = view.box ? 0.9 : -2.7; if (boxState.x !== want) { boxState.x = want; boxState.phase = view.box ? 'at' : 'away'; shadowDirty = true; } }
    else if (Math.abs(boxState.x - target) > 0.005) { boxState.x += Math.sign(target - boxState.x) * Math.min(Math.abs(target - boxState.x), dt * 3); active = true; shadowDirty = true; }
    else if (boxState.phase === 'leaving') { boxState.phase = 'away'; boxState.x = -2.7; shadowDirty = true; }
    boxMesh.position.x = boxState.x; boxMesh.visible = boxState.x > -2.3 && boxState.x < 2.45;
    if (inspectState && inspectState.cut && inspectState.slow && !rm) {
      var ph = (clock % 5) / 5;                                   // slow in, hold, slow out, hold
      inspectState.p = ph < 0.3 ? ph / 0.3 : ph < 0.5 ? 1 : ph < 0.8 ? 1 - (ph - 0.5) / 0.3 : 0;
      applyInspect(); active = true;
    }
    return active;
  }

  /* ---------------------------------------------------------------- init */
  sc.init = function (container, opts) {
    el = container; opts = opts || {};
    if (!THREE || !el) return false;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch (err) { renderer = null; return false; }
    try {
      UP = new THREE.Vector3(0, 1, 0); V1 = new THREE.Vector3(); BB = new THREE.Box3(); TMPB = new THREE.Box3();
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.98;
      el.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xbdb8ae);
      camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
      ray = new THREE.Raycaster(); mouse = new THREE.Vector2(); cam.t = new THREE.Vector3(0.4, 1.4, -2.4);
      makeTextures(); namedMaterials();
      buildLights(); buildRoom(); buildPanel(); buildDisplay(); buildBench(); buildConveyor(); buildPneu();
      hovBox = makeOutline(0xffffff, 0); selBox = makeOutline(0x1f6feb, 0.14);
      selMarker = label('▼ SELECTED', 0.075, { bg: '#1f6feb', onTop: true }); selMarker.userData.ar = selMarker.scale.x / selMarker.scale.y; selMarker.visible = false; scene.add(selMarker);
      bindControls();
      quality = QUALITY[opts.quality] ? opts.quality : 'balanced'; adaptive = !!opts.adaptive;
      cssW = el.clientWidth || 300; cssH = el.clientHeight || 200; aspect = cssW / cssH;
      sc.setQuality(quality);
      var g0 = STATION.overview(); cam.t.copy(g0.t); cam.r = g0.r; cam.theta = g0.theta; cam.phi = g0.phi; cam.hh = g0.hh; cam.home = g0; cam.rmin = 0.6; cam.rmax = Math.max(15, g0.r * 1.6);
      applyCam(); applyView();
      if (root.ResizeObserver) new ResizeObserver(function () { sc.resize(); }).observe(el); else root.addEventListener('resize', sc.resize);
      document.addEventListener('visibilitychange', function () { dirty = true; });
    } catch (err2) {
      try { if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); renderer.dispose(); } catch (e3) {}
      renderer = null; if (root.console) root.console.error('3D view unavailable:', err2); return false;
    }
    var last = performance.now(), streak = 0;
    (function loop(now) {
      requestAnimationFrame(loop);
      var raw = (now - last) / 1000, dt = Math.min(0.1, raw); last = now;
      if (document.hidden) { streak = 0; return; }
      var active = step(dt);
      if (!active && !dirty) { streak = 0; fpsAcc = 0; fpsN = 0; slowT = 0; return; }   // render on demand
      if (selDirty) refreshSel();
      applyCam(); sizeMarker();
      if (shadowDirty && key.castShadow) renderer.shadowMap.needsUpdate = true;
      shadowDirty = false; dirty = false;
      renderer.render(scene, camera);
      lastInfo.calls = renderer.info.render.calls; lastInfo.triangles = renderer.info.render.triangles;
      streak++;
      if (streak > 2 && raw > 0) {                                 // measure only while frames are consecutive
        fpsAcc += raw; fpsN++;
        if (fpsAcc >= 0.5) {
          fps = fpsN / fpsAcc;
          if (adaptive && fps < 28) { slowT += fpsAcc; if (slowT >= 3 && adaptK > 0.5) { adaptK = Math.max(0.5, adaptK * 0.85); slowT = 0; applySize(); } } else slowT = 0;
          fpsAcc = 0; fpsN = 0;
        }
      }
    })(last);
    return true;
  };

  FS.scene3d = sc;
})(typeof window !== 'undefined' ? window : globalThis);
