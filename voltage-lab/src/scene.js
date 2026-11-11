// 3D training workbench (Three.js). The scene never decides anything about
// electricity: it shows the simulator state and reports pointer gestures to
// the controller.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TERMINALS, DIAL } from './sim.js';
import { UI, tr } from './i18n.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const DIAL_ANGLE = { OFF: -100, VDC: -50, VAC: 0, OHM: 50, A: 100 };
const DIAL_Y = -0.75;
const JACK_X = { A: -1.2, mA: -0.4, COM: 0.4, V: 1.2 };
const JACK_Y = -2.7;
const COLORS = { red: 0xd6312b, black: 0x1d2125 };

const REST = {
  home: { black: V3(-3.45, 0.14, 1.5), red: V3(-2.75, 0.14, 1.5), dir: V3(0, 0.05, 1) },
  center: { black: V3(0.2, 0.14, 1.1), red: V3(0.2, 0.14, 1.9), dir: V3(1, 0.05, 0) },
  right: { black: V3(6.2, 0.14, 1.1), red: V3(6.2, 0.14, 1.9), dir: V3(1, 0.05, 0) },
};
const PLUG_REST = { black: V3(-6.6, 0.17, 4.5), red: V3(-5.2, 0.17, 4.5) };

const VIEWS = {
  meter: { t: [-5.9, 1.7, 1.2], p: [-5.9, 8.6, 10.2] },
  aa: { t: [0.5, 0.3, 2.7], p: [0.5, 6.4, 10.6] },
  b9: { t: [2.5, 0.8, 2.8], p: [2.5, 6.8, 10.8] },
  lamp9: { t: [1.2, 0.2, -0.5], p: [1.2, 10.2, 7.6] },
  panel24: { t: [7.9, 0.2, -0.5], p: [7.9, 10.2, 7.6] },
  ac12: { t: [7.5, 0.5, 2.6], p: [7.5, 6.8, 10.6] },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Draw text where "⎓" is rendered as a drawn DC symbol (no font dependency).
function drawText(ctx, text, x, y, px, align = 'center') {
  const parts = text.split('⎓');
  const symW = px * 0.62;
  let w = 0;
  parts.forEach((p, i) => { w += ctx.measureText(p).width; if (i < parts.length - 1) w += symW; });
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.textAlign = 'left';
  parts.forEach((p, i) => {
    ctx.fillText(p, cx, y);
    cx += ctx.measureText(p).width;
    if (i < parts.length - 1) {
      const lw = Math.max(2, px * 0.09);
      ctx.save(); ctx.lineWidth = lw; ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'butt';
      const top = y - px * 0.5; const bot = y - px * 0.22; const a = cx + px * 0.06; const b = cx + symW - px * 0.06;
      ctx.beginPath(); ctx.moveTo(a, top); ctx.lineTo(b, top); ctx.stroke();
      const seg = (b - a) / 5;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(a + k * 2 * seg, bot); ctx.lineTo(a + k * 2 * seg + seg, bot); ctx.stroke(); }
      ctx.restore();
      cx += symW;
    }
  });
  return w;
}

function textCanvas(text, { px = 56, bg = '#10222c', fg = '#ffffff', pad = 20, radius = 16, border = null, weight = 700 } = {}) {
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  const font = `${weight} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.font = font;
  const parts = text.split('⎓');
  let w = parts.reduce((s, p) => s + ctx.measureText(p).width, 0) + (parts.length - 1) * px * 0.62;
  c.width = Math.ceil(w + pad * 2);
  c.height = Math.ceil(px * 1.45);
  ctx = c.getContext('2d');
  ctx.font = font;
  if (bg) { ctx.fillStyle = bg; roundRect(ctx, 0, 0, c.width, c.height, radius); ctx.fill(); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 6; roundRect(ctx, 3, 3, c.width - 6, c.height - 6, radius); ctx.stroke(); }
  ctx.fillStyle = fg;
  ctx.textBaseline = 'alphabetic';
  drawText(ctx, text, c.width / 2, c.height / 2 + px * 0.34, px);
  return c;
}

function canvasTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeSprite(text, opts = {}) {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.renderOrder = 20;
  s.userData.h = opts.h || 0.42;
  s.userData.set = (txt, o = {}) => {
    const key = txt + JSON.stringify(o);
    if (s.userData.key === key) return;
    s.userData.key = key;
    const c = textCanvas(txt, { ...opts, ...o });
    if (mat.map) mat.map.dispose();
    mat.map = canvasTex(c);
    mat.needsUpdate = true;
    s.scale.set((s.userData.h * c.width) / c.height, s.userData.h, 1);
  };
  s.userData.set(text);
  return s;
}

// Text lying flat on a surface (readable from above), or on the meter face.
function makeFlat(text, h, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.userData.set = (txt) => {
    if (m.userData.key === txt) return;
    m.userData.key = txt;
    const c = textCanvas(txt, { bg: null, fg: '#13242e', pad: 6, ...opts });
    if (mat.map) mat.map.dispose();
    mat.map = canvasTex(c);
    mat.needsUpdate = true;
    m.scale.set((h * c.width) / c.height, h, 1);
  };
  m.userData.set(text);
  return m;
}

export function createScene(container, sim, ctl) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'stage-canvas';
  canvas.setAttribute('aria-label', tr(UI.stageHelp));
  container.prepend(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eef2);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = 3;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.screenSpacePanning = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4cc, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(5, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-8, 6, 10);
  scene.add(fill);

  const pickables = [];
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...o });
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const brass = mat(0xc9a44c, { metalness: 0.7, roughness: 0.35 });
  const steel = mat(0xd9dee3, { metalness: 0.9, roughness: 0.25 });
  const copper = mat(0xb87333, { metalness: 0.5, roughness: 0.45 });
  function mesh(geo, material, parent, pos, part) {
    const m = new THREE.Mesh(geo, material);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (material !== ghost) { m.castShadow = true; m.receiveShadow = true; }
    if (part) { m.userData.part = part; pickables.push(m); }
    parent.add(m);
    return m;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r1, r2, h, seg = 24) => new THREE.CylinderGeometry(r1, r2, h, seg);

  // ---- bench ---------------------------------------------------------------
  mesh(box(22.4, 0.5, 11.6), mat(0xd8c9ae, { roughness: 0.8 }), scene, [1.3, -0.26, 1.2], { type: 'bench' });
  mesh(box(21.6, 0.03, 10.8), mat(0xa9b9c1, { roughness: 0.95 }), scene, [1.3, 0.0, 1.2], { type: 'bench' });

  const anchors = {}; // highlight targets: key -> () => Vector3
  const dynLabels = []; // labels whose text depends on language or state
  const terms = {};

  // ---- multimeter ----------------------------------------------------------
  const meter = new THREE.Group();
  meter.position.set(-5.9, 2.3, 0.6);
  meter.rotation.x = -0.96;
  scene.add(meter);
  mesh(box(3.0, 1.9, 0.5), mat(0x4a5560), scene, [-5.9, 0.95, -1.15]);
  mesh(box(3.7, 6.7, 0.9), mat(0xf0b429, { roughness: 0.5 }), meter, [0, 0, 0], { type: 'meter' });
  mesh(box(3.25, 6.25, 0.06), mat(0x1f2b33), meter, [0, 0, 0.46], { type: 'meter' });
  mesh(box(2.95, 1.5, 0.06), mat(0x0b1013), meter, [0, 2.3, 0.5], { type: 'display' });
  const lcdCanvas = document.createElement('canvas');
  lcdCanvas.width = 660; lcdCanvas.height = 312;
  const lcdTex = canvasTex(lcdCanvas);
  const lcd = mesh(new THREE.PlaneGeometry(2.75, 1.3), new THREE.MeshBasicMaterial({ map: lcdTex }), meter, [0, 2.3, 0.535], { type: 'display' });
  lcd.castShadow = false;
  const faceText = (text, h, x, y, part, opts) => {
    const f = makeFlat(text, h, { fg: '#f4f7f9', ...opts });
    f.position.set(x, y, 0.5);
    if (part) { f.userData.part = part; pickables.push(f); }
    meter.add(f);
    return f;
  };
  [['hold', -0.8, 'HOLD'], ['range', 0.8, 'RANGE']].forEach(([id, x, label]) => {
    mesh(box(1.05, 0.44, 0.14), mat(0x4d5f6b), meter, [x, 1.25, 0.52], { type: 'btn', id });
    const f = faceText(label, 0.24, x, 1.25, { type: 'btn', id });
    f.position.z = 0.6;
    anchors[`btn:${id}`] = () => meter.localToWorld(V3(x, 1.25, 0.6));
  });
  const ring = mesh(cyl(1.02, 1.02, 0.06, 48), mat(0x0d1418), meter, [0, DIAL_Y, 0.5], { type: 'dialknob' });
  ring.rotation.x = Math.PI / 2;
  const knob = new THREE.Group();
  knob.position.set(0, DIAL_Y, 0.53);
  meter.add(knob);
  const knobBody = mesh(cyl(0.72, 0.8, 0.34, 40), mat(0x33424d, { roughness: 0.45 }), knob, [0, 0, 0.17], { type: 'dialknob' });
  knobBody.rotation.x = Math.PI / 2;
  mesh(box(0.16, 0.74, 0.1), mat(0xffffff), knob, [0, 0.4, 0.37], { type: 'dialknob' });
  mesh(box(0.34, 0.2, 0.1), mat(0xffffff), knob, [0, 0.7, 0.37], { type: 'dialknob' });
  const dialText = { OFF: 'OFF', VDC: 'V⎓', VAC: 'V~', OHM: 'Ω', A: 'A' };
  DIAL.forEach((id) => {
    const a = (DIAL_ANGLE[id] * Math.PI) / 180;
    const x = 1.34 * Math.sin(a); const y = DIAL_Y + 1.34 * Math.cos(a);
    faceText(dialText[id], 0.36, x, y, { type: 'dialpos', id }, { bg: '#33424d', pad: 14, radius: 14 });
    anchors[`dialpos:${id}`] = () => meter.localToWorld(V3(x, y, 0.55));
  });
  const jackLabel = { A: 'A', mA: 'mA', COM: 'COM', V: 'V/Ω' };
  Object.keys(JACK_X).forEach((id) => {
    const x = JACK_X[id];
    const r = mesh(cyl(0.27, 0.27, 0.08, 28), mat(id === 'COM' ? 0x15191c : 0xb4322b), meter, [x, JACK_Y, 0.5], { type: 'jack', id });
    r.rotation.x = Math.PI / 2;
    const hole = mesh(cyl(0.14, 0.14, 0.1, 20), mat(0x050607), meter, [x, JACK_Y, 0.51], { type: 'jack', id });
    hole.rotation.x = Math.PI / 2;
    const hit = mesh(cyl(0.38, 0.38, 0.3, 12), ghost, meter, [x, JACK_Y, 0.6], { type: 'jack', id });
    hit.rotation.x = Math.PI / 2;
    faceText(jackLabel[id], 0.27, x, JACK_Y + 0.52, { type: 'jack', id });
    anchors[`jack:${id}`] = () => meter.localToWorld(V3(x, JACK_Y, 0.6));
  });
  anchors.meter = () => meter.localToWorld(V3(0, 1.25, 0.5));
  anchors.display = () => meter.localToWorld(V3(0, 2.3, 0.6));
  anchors.dial = () => meter.localToWorld(V3(0, DIAL_Y, 0.9));
  meter.updateMatrixWorld(true);
  const meterNormal = V3(0, 0, 1).applyQuaternion(meter.quaternion).normalize();
  const jackWorld = {};
  Object.keys(JACK_X).forEach((id) => { jackWorld[id] = meter.localToWorld(V3(JACK_X[id], JACK_Y, 0.5)); });

  function drawLCD() {
    const d = sim.display;
    const sig = JSON.stringify(d);
    if (sig === drawLCD.sig) return;
    drawLCD.sig = sig;
    const c = lcdCanvas.getContext('2d');
    const W = lcdCanvas.width; const H = lcdCanvas.height;
    c.fillStyle = d.on ? '#c9d8b6' : '#8f9c86';
    c.fillRect(0, 0, W, H);
    if (d.on) {
      c.fillStyle = '#10180f';
      c.textBaseline = 'alphabetic';
      c.font = '700 44px system-ui, Arial, sans-serif';
      if (d.mode === 'DC') drawText(c, 'DC ⎓', 22, 54, 44, 'left');
      else if (d.mode === 'AC') { c.textAlign = 'left'; c.fillText('AC ~', 22, 54); }
      else { c.textAlign = 'left'; c.fillText(d.mode === 'OHM' ? 'Ω' : 'A', 22, 54); }
      if (d.unit === 'V') {
        c.textAlign = 'right';
        c.fillText(d.rangeSel === 'AUTO' ? 'AUTO' : `MANUAL ${d.rangeSel} V`, W - 22, 54);
      }
      if (d.hold) {
        c.fillRect(W / 2 - 150, 14, 132, 52);
        c.fillStyle = '#c9d8b6'; c.textAlign = 'center'; c.fillText('HOLD', W / 2 - 84, 56); c.fillStyle = '#10180f';
      }
      c.font = '700 158px ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
      c.textAlign = 'right';
      c.fillText(d.digits, W - 104, 258);
      if (d.neg) c.fillRect(20, 186, 62, 20);
      c.font = '700 96px system-ui, Arial, sans-serif';
      c.fillText(d.unit, W - 18, 258);
    }
    lcdTex.needsUpdate = true;
  }

  // ---- test points ---------------------------------------------------------
  function addTerminal(id, group, x, y, z, label, lx, ly, lz, hitR = 0.34) {
    const T = TERMINALS[id];
    const hit = mesh(new THREE.SphereGeometry(hitR, 12, 8), ghost, group, [x, y, z], { type: 'term', id });
    group.updateMatrixWorld(true);
    const pos = group.localToWorld(V3(x, y, z));
    const t = { id, pos, hit };
    if (!T.bridge) {
      const s = makeSprite(label, { h: 0.4 });
      s.position.copy(group.localToWorld(V3(lx, ly, lz)));
      scene.add(s);
      t.label = s; t.text = label;
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
      ringM.rotation.x = Math.PI / 2;
      ringM.position.copy(pos).add(V3(0, 0.02, 0));
      ringM.renderOrder = 15;
      ringM.visible = false;
      scene.add(ringM);
      t.ring = ringM;
    }
    terms[id] = t;
    anchors[`term:${id}`] = () => pos;
  }
  const post = (group, x, y, z, r = 0.13, h = 0.2) => mesh(cyl(r, r, h, 16), brass, group, [x, y, z]);
  const trace = (group, x1, z1, x2, z2, y = 0.155) => {
    const len = Math.hypot(x2 - x1, z2 - z1) + 0.14;
    const m = mesh(box(len, 0.03, 0.14), copper, group, [(x1 + x2) / 2, y, (z1 + z2) / 2]);
    m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    m.castShadow = false;
    return m;
  };
  const title = (key, x, z, h = 0.4) => {
    const f = makeFlat(tr(UI[key]), h);
    f.rotation.x = -Math.PI / 2;
    f.position.set(x, 0.03, z);
    scene.add(f);
    dynLabels.push(() => f.userData.set(tr(UI[key])));
  };

  // AA battery
  const aa = new THREE.Group(); aa.position.set(0, 0, 3.6); scene.add(aa);
  mesh(box(3.3, 0.25, 1.0), mat(0x3b4852), aa, [0, 0.125, 0]);
  const aaBody = mesh(cyl(0.36, 0.36, 2.0, 28), mat(0x2f5d50, { roughness: 0.4 }), aa, [-0.2, 0.62, 0]); aaBody.rotation.z = Math.PI / 2;
  const aaCap = mesh(cyl(0.365, 0.365, 0.5, 28), mat(0xc9a227, { metalness: 0.5, roughness: 0.4 }), aa, [1.03, 0.62, 0]); aaCap.rotation.z = Math.PI / 2;
  const aaNub = mesh(cyl(0.13, 0.13, 0.14, 16), steel, aa, [1.33, 0.62, 0]); aaNub.rotation.z = Math.PI / 2;
  mesh(box(0.1, 0.95, 0.62), brass, aa, [1.47, 0.5, 0]);
  mesh(box(0.1, 0.95, 0.62), brass, aa, [-1.27, 0.5, 0]);
  const aaText = makeFlat('AA  1.5 V', 0.26, { fg: '#ffffff' }); aaText.position.set(-0.2, 0.62, 0.37); aa.add(aaText);
  addTerminal('aa+', aa, 1.47, 0.98, 0, 'AA +', 1.75, 1.6, 0);
  addTerminal('aa-', aa, -1.27, 0.98, 0, 'AA −', -1.55, 1.6, 0);
  title('stAA', 0, 4.55);

  // 9 V battery
  const b9 = new THREE.Group(); b9.position.set(3.3, 0, 3.6); scene.add(b9);
  mesh(box(1.3, 1.9, 0.85), mat(0x3a3f55, { roughness: 0.45 }), b9, [0, 0.95, 0]);
  mesh(box(1.32, 0.5, 0.87), mat(0xc9a227, { metalness: 0.4 }), b9, [0, 1.55, 0]);
  const b9Text = makeFlat('9 V', 0.4, { fg: '#ffffff' }); b9Text.position.set(0, 0.8, 0.43); b9.add(b9Text);
  mesh(cyl(0.15, 0.15, 0.16, 20), steel, b9, [0.34, 1.98, 0]);
  mesh(cyl(0.2, 0.2, 0.16, 6), steel, b9, [-0.34, 1.98, 0]);
  addTerminal('b9+', b9, 0.36, 2.06, 0, '9V +', 0.95, 2.6, 0, 0.2);
  addTerminal('b9-', b9, -0.36, 2.06, 0, '9V −', -0.95, 2.6, 0, 0.2);
  addTerminal('b9x', b9, 0, 2.06, 0, '', 0, 0, 0, 0.1);
  title('stB9', 3.3, 4.55);

  // Shared builders for the two series circuits
  const switches = {};
  const lamps = {};
  function addSwitch(id, group, xh, xc, z, labelY, labelDx = 0) {
    const len = xc - xh;
    mesh(box(len + 0.5, 0.1, 0.5), mat(0x5f6b75), group, [(xh + xc) / 2, 0.2, z]);
    post(group, xh, 0.36, z, 0.1, 0.3); post(group, xc, 0.3, z, 0.1, 0.2);
    const lever = new THREE.Group(); lever.position.set(xh, 0.47, z); group.add(lever);
    mesh(box(len + 0.1, 0.07, 0.16), brass, lever, [len / 2, 0, 0]);
    mesh(cyl(0.11, 0.11, 0.36, 14), mat(0x15191c), lever, [len + 0.1, 0.16, 0]);
    mesh(box(len * 0.9, 1.1, 0.9), ghost, group, [(xh + xc) / 2, 0.7, z], { type: 'switch', id });
    const s = makeSprite('', { h: 0.36, bg: '#ffffff', fg: '#10222c', border: '#10222c' });
    group.updateMatrixWorld(true);
    s.position.copy(group.localToWorld(V3((xh + xc) / 2 + labelDx, labelY, z + 0.85)));
    scene.add(s);
    const name = id === 'panel24' ? 'S1' : tr(UI.swLabel);
    dynLabels.push(() => s.userData.set(`${id === 'panel24' ? 'S1' : tr(UI.swLabel)}: ${tr(sim.state.switches[id] ? UI.closed : UI.open)}`));
    switches[id] = { lever, name };
    anchors[`switch:${id}`] = () => group.localToWorld(V3((xh + xc) / 2, 0.6, z));
  }
  function addLamp(id, group, x, z, prefix) {
    mesh(cyl(0.42, 0.5, 0.35, 24), mat(0x48525a), group, [x, 0.33, z]);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xffc233, emissiveIntensity: 0, roughness: 0.2, transparent: true, opacity: 0.92 });
    const bulb = mesh(new THREE.SphereGeometry(0.42, 24, 16), bulbMat, group, [x, 0.85, z]);
    bulb.castShadow = false;
    const light = new THREE.PointLight(0xffc860, 0, 7, 1.6);
    light.position.set(x, 1.3, z); group.add(light);
    const s = makeSprite('', { h: 0.36, bg: '#ffffff', fg: '#10222c', border: '#10222c' });
    group.updateMatrixWorld(true);
    s.position.copy(group.localToWorld(V3(x - 1.35, 0.3, z + 0.7)));
    scene.add(s);
    dynLabels.push(() => s.userData.set(`${prefix}${tr(sim.lampOn(id) ? UI.lampOn : UI.lampOff)}`));
    lamps[id] = { bulbMat, light, level: 0 };
  }

  // 9 V lamp circuit
  const lb = new THREE.Group(); lb.position.set(1.2, 0, -1.4); scene.add(lb);
  mesh(box(7.0, 0.14, 3.8), mat(0xf3efe2, { roughness: 0.85 }), lb, [0, 0.07, 0]);
  mesh(box(0.9, 0.6, 1.7), mat(0x3a3f55), lb, [-2.9, 0.44, 0]);
  mesh(box(0.92, 0.61, 0.4), mat(0xc9a227, { metalness: 0.4 }), lb, [-2.9, 0.44, -0.66]);
  const lbBat = makeFlat('+   9 V   −', 0.26, { fg: '#ffffff' }); lbBat.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); lbBat.position.set(-2.9, 0.75, 0); lb.add(lbBat);
  [[-2.9, -1.3, -1.15, -1.3], [-1.15, -1.3, -0.8, -1.3], [0.8, -1.3, 1.15, -1.3], [1.15, -1.3, 2.9, -1.3], [2.9, -1.3, 2.9, -0.5],
    [2.9, 0.5, 2.9, 1.3], [2.9, 1.3, -2.9, 1.3], [-2.9, 1.3, -2.9, 0.85], [-2.9, -0.85, -2.9, -1.3]].forEach((t) => trace(lb, ...t));
  addSwitch('lamp9', lb, -0.8, 0.8, -1.3, 0.45);
  addLamp('lamp9', lb, 2.9, 0, '');
  const lampPts = { tp1: [-2.9, -1.3], tp2: [-1.15, -1.3], tp3: [1.15, -1.3], tp4: [2.9, -1.3], tp5: [2.9, 1.3], tp6: [-2.9, 1.3] };
  Object.entries(lampPts).forEach(([id, [x, z]]) => {
    post(lb, x, 0.25, z);
    addTerminal(id, lb, x, 0.36, z, TERMINALS[id].label, x, z < 0 ? 0.95 : 0.6, z < 0 ? z - 0.5 : z + 0.5);
  });
  title('stLamp9', 1.2, 0.8, 0.36);

  // 24 V DC training panel
  const pn = new THREE.Group(); pn.position.set(7.9, 0, -1.4); scene.add(pn);
  mesh(box(5.8, 0.14, 3.8), mat(0xe3e9ee, { roughness: 0.85 }), pn, [0, 0.07, 0]);
  mesh(box(0.9, 0.7, 1.5), mat(0x2f4858), pn, [-2.4, 0.49, 0]);
  const psu = makeFlat('24 V⎓', 0.3, { fg: '#ffffff' }); psu.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); psu.position.set(-2.4, 0.85, 0); pn.add(psu);
  mesh(box(0.5, 0.16, 1.25), mat(0x7b8a94), pn, [-1.7, 0.22, 0]);
  [[-2.0, -0.34, -1.7, -0.34], [-2.0, 0.34, -1.7, 0.34], [-1.7, -0.34, -1.7, -1.3], [-1.7, -1.3, -0.9, -1.3], [-0.9, -1.3, -0.6, -1.3], [0.2, -1.3, 0.5, -1.3],
    [1.9, -1.3, 1.9, -0.5], [1.9, 0.5, 1.9, 1.3], [1.9, 1.3, -1.7, 1.3], [-1.7, 1.3, -1.7, 0.34]].forEach((t) => trace(pn, ...t));
  addSwitch('panel24', pn, -0.6, 0.2, -1.3, 0.45, -0.45);
  addLamp('panel24', pn, 1.9, 0, 'H1: ');
  const pnPts = { x1: [-1.7, -0.34, 0.5], x2: [-1.7, 0.34, 0.5], x3: [-0.9, -1.3, 0.36], x4: [0.5, -1.3, 0.36], x5: [1.9, -1.3, 0.36], x6: [1.9, 1.3, 0.36] };
  Object.entries(pnPts).forEach(([id, [x, z, y]]) => {
    post(pn, x, y - 0.11, z);
    let l = [x, z < 0 ? 0.95 : 0.6, z < 0 ? z - 0.5 : z + 0.5];
    if (id === 'x1') l = [x - 1.0, 1.35, z - 0.3];
    if (id === 'x2') l = [x - 0.9, 0.75, z + 0.9];
    addTerminal(id, pn, x, y, z, TERMINALS[id].label, ...l, id === 'x1' || id === 'x2' ? 0.2 : 0.34);
  });
  addTerminal('x12', pn, -1.7, 0.5, 0, '', 0, 0, 0, 0.1);
  // jumper wire W2 (X4 → X5), drawn in three pieces so a break can be shown
  const w2curve = new THREE.CatmullRomCurve3([V3(0.5, 0.4, -1.3), V3(0.8, 0.75, -1.3), V3(1.2, 0.85, -1.3), V3(1.6, 0.75, -1.3), V3(1.9, 0.4, -1.3)]);
  const w2mat = mat(0x2d5fa8, { roughness: 0.5 });
  const w2pts = w2curve.getPoints(40);
  const w2seg = (a, b) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(w2pts.slice(a, b + 1)), 16, 0.06, 8), w2mat, pn);
  w2seg(0, 17); const w2mid = w2seg(17, 23); w2seg(23, 40);
  const w2label = makeSprite('W2', { h: 0.3, bg: '#ffffff', fg: '#10222c', border: '#10222c' });
  pn.updateMatrixWorld(true);
  w2label.position.copy(pn.localToWorld(V3(1.2, 1.3, -1.55))); scene.add(w2label);
  const w2fault = makeSprite('', { h: 0.34, bg: '#ffffff', fg: '#8f1d16', border: '#8f1d16' });
  w2fault.position.copy(pn.localToWorld(V3(1.45, 0.3, -0.45))); w2fault.visible = false; scene.add(w2fault);
  dynLabels.push(() => {
    const open = sim.state.faults.w2open && sim.state.faultRevealed;
    w2mid.visible = !open;
    w2fault.visible = open;
    w2fault.userData.set(`✖ W2: ${tr(UI.faultOpen)}`);
  });
  title('stPanel', 7.9, 0.8, 0.3);

  // 12 V AC training source
  const acg = new THREE.Group(); acg.position.set(7.6, 0, 3.7); scene.add(acg);
  mesh(box(2.6, 1.1, 1.5), mat(0xdfe6ea, { roughness: 0.5 }), acg, [0, 0.55, 0]);
  mesh(box(2.4, 0.7, 0.04), mat(0x2f4858), acg, [0, 0.55, 0.76]);
  const acText = makeFlat('12 V~', 0.4, { fg: '#ffffff' }); acText.position.set(0, 0.55, 0.79); acg.add(acText);
  post(acg, -0.6, 1.2, 0.1); post(acg, 0.6, 1.2, 0.1);
  addTerminal('ac1', acg, -0.6, 1.31, 0.1, 'AC 1', -0.95, 1.95, 0.1);
  addTerminal('ac2', acg, 0.6, 1.31, 0.1, 'AC 2', 0.95, 1.95, 0.1);
  title('stAC', 7.6, 4.9, 0.3);

  // ---- test leads ----------------------------------------------------------
  const leads = {};
  ['black', 'red'].forEach((lead) => {
    const color = COLORS[lead];
    const body = mat(color, { roughness: 0.45 });
    const part = (p) => ({ type: 'probe', lead, part: p });
    const probe = new THREE.Group();
    scene.add(probe);
    mesh(cyl(0.02, 0.04, 0.5, 12), steel, probe, [0, 0.25, 0], part('tip'));
    mesh(cyl(0.12, 0.12, 0.52, 8), ghost, probe, [0, 0.26, 0], part('tip'));
    mesh(cyl(0.12, 0.05, 0.25, 16), body, probe, [0, 0.62, 0], part('guard'));
    mesh(cyl(0.28, 0.28, 0.07, 24), body, probe, [0, 0.78, 0], part('guard'));
    mesh(cyl(0.3, 0.3, 0.16, 10), ghost, probe, [0, 0.78, 0], part('guard'));
    mesh(cyl(0.16, 0.14, 1.75, 20), body, probe, [0, 1.7, 0], part('handle'));
    mesh(cyl(0.27, 0.27, 1.75, 10), ghost, probe, [0, 1.72, 0], part('handle'));
    mesh(cyl(0.08, 0.13, 0.2, 12), body, probe, [0, 2.67, 0], part('handle'));
    if (lead === 'red') [1.15, 1.32].forEach((y) => mesh(cyl(0.175, 0.175, 0.06, 20), mat(0xffffff), probe, [0, y, 0], part('handle')));
    const plug = new THREE.Group();
    scene.add(plug);
    mesh(cyl(0.07, 0.07, 0.3, 12), steel, plug, [0, -0.1, 0], { type: 'plug', lead });
    mesh(cyl(0.17, 0.2, 0.75, 16), body, plug, [0, 0.4, 0], { type: 'plug', lead });
    mesh(cyl(0.3, 0.3, 0.95, 10), ghost, plug, [0, 0.4, 0], { type: 'plug', lead });
    const wireMat = mat(color, { roughness: 0.6 });
    const wire = new THREE.Mesh(new THREE.BufferGeometry(), wireMat);
    wire.castShadow = true;
    wire.userData.part = { type: 'lead', lead };
    pickables.push(wire);
    scene.add(wire);
    const nick = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.035, 8, 16), copper);
    nick.visible = false; scene.add(nick);
    const tag = makeSprite('', { h: 0.27, bg: lead === 'red' ? '#b3261e' : '#15191c', border: '#ffffff' });
    scene.add(tag);
    dynLabels.push(() => {
      const dmg = sim.state.damaged[lead] && sim.state.inspected[lead];
      tag.userData.set(`${tr(lead === 'red' ? UI.RED : UI.BLACK)}${lead === 'red' ? ' ▮▮' : ''}${dmg ? ` ⚠ ${tr(UI.damagedTag)}` : ''}`);
    });
    const L = { probe, plug, wire, nick, tag, tip: REST.home[lead].clone(), dir: REST.home.dir.clone().normalize(), plugPos: PLUG_REST[lead].clone(), plugDir: V3(0, 0, 1), wireKey: '' };
    leads[lead] = L;
    anchors[`probe:${lead}`] = () => L.tip.clone().addScaledVector(L.dir, 1.7);
    anchors[`plug:${lead}`] = () => L.plugPos.clone().addScaledVector(L.plugDir, 0.4);
    anchors[`lead:${lead}`] = () => L.mid || L.tip;
  });

  // ---- highlight markers ---------------------------------------------------
  const markerCanvas = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.lineWidth = 12; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 50, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 6; x.strokeStyle = '#0b3d91'; x.setLineDash([14, 10]); x.beginPath(); x.arc(64, 64, 50, 0, Math.PI * 2); x.stroke();
    return c;
  })();
  const arrowCanvas = (() => {
    const c = document.createElement('canvas'); c.width = 96; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#0b3d91'; x.strokeStyle = '#ffffff'; x.lineWidth = 8; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(48, 120); x.lineTo(8, 62); x.lineTo(32, 62); x.lineTo(32, 8); x.lineTo(64, 8); x.lineTo(64, 62); x.lineTo(88, 62); x.closePath();
    x.stroke(); x.fill();
    return c;
  })();
  const ringTex = canvasTex(markerCanvas); const arrowTex = canvasTex(arrowCanvas);
  const markers = [];
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, depthTest: false, transparent: true }));
    const a = new THREE.Sprite(new THREE.SpriteMaterial({ map: arrowTex, depthTest: false, transparent: true }));
    r.renderOrder = 30; a.renderOrder = 31; r.visible = a.visible = false;
    scene.add(r); scene.add(a);
    markers.push({ r, a });
  }

  // ---- camera --------------------------------------------------------------
  let tween = null;
  const fit = () => Math.max(1, 1.45 / camera.aspect);
  function frontPose() {
    const t = V3(1.3, 0.3, 0.9);
    const half = 10.2;
    const hf = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    const dist = Math.max(13, half / Math.tan(hf));
    return { t, p: t.clone().add(V3(0, 0.66, 0.75).normalize().multiplyScalar(dist)) };
  }
  function viewPose(name) {
    if (name === 'front' || !name) return frontPose();
    if (name === 'display' || name === 'dial' || name === 'jacks') {
      const y = name === 'display' ? 2.1 : name === 'dial' ? -0.6 : -2.2;
      const d = (name === 'display' ? 5.4 : name === 'dial' ? 6.4 : 6.6) * fit();
      const t = meter.localToWorld(V3(0, y, 0.5));
      const p = t.clone().addScaledVector(meterNormal, d).add(V3(0, name === 'jacks' ? 1.2 : 0.4, name === 'jacks' ? 2.2 : 0.6));
      return { t, p };
    }
    if (name === 'tips') {
      const ids = ['red', 'black'].map((l) => sim.state.probes[l]).filter(Boolean);
      const c = ids.length ? ids.map((i) => terms[i].pos).reduce((a, b) => a.clone().add(b)).multiplyScalar(1 / ids.length)
        : leads.red.tip.clone().add(leads.black.tip).multiplyScalar(0.5);
      return { t: c, p: c.clone().add(V3(0, 3.6, 4.6).multiplyScalar(fit())) };
    }
    if (name === 'probes') {
      const r = REST[ctl.ui.rest] || REST.home;
      const c = r.red.clone().add(r.black).multiplyScalar(0.5).addScaledVector(r.dir, 1.3);
      return { t: c, p: c.clone().add(V3(0, 4.6, 5.4).multiplyScalar(fit())) };
    }
    const v = VIEWS[name] || VIEWS.meter;
    const t = V3(...v.t);
    return { t, p: t.clone().add(V3(...v.p).sub(t).multiplyScalar(fit())) };
  }
  function focus(name, instant) {
    const { t, p } = viewPose(name);
    if (instant) { camera.position.copy(p); controls.target.copy(t); controls.update(); tween = null; return; }
    tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, k: 0 };
  }
  controls.addEventListener('start', () => { tween = null; });
  function zoom(f) {
    const off = camera.position.clone().sub(controls.target).multiplyScalar(f);
    tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: controls.target.clone().add(off), t1: controls.target.clone(), k: 0.4 };
  }

  function resize() {
    const w = container.clientWidth || 1; const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  focus('front', true);

  // ---- pointer interaction -------------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const setRay = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return r;
  };
  function pick(e) {
    setRay(e);
    const hits = ray.intersectObjects(pickables, false).filter((h) => h.object.visible);
    if (!hits.length) return null;
    const sel = ctl.ui.selected;
    const prefer = sel && sel.kind === 'probe' ? 'term' : sel && sel.kind === 'plug' ? 'jack' : null;
    if (prefer) {
      const h = hits.find((x) => x.object.userData.part.type === prefer);
      if (h) return h;
    }
    const first = hits.find((h) => h.object.userData.part.type !== 'bench') || hits[0];
    const P = (h) => h.object.userData.part;
    const close = hits.filter((h) => h.distance - first.distance < (P(first).type === 'lead' ? 2.2 : 1.2));
    // a plugged-in plug or a probe handle wins over the jack / terminal behind it
    const grab = close.find((h) => P(h).type === 'plug' || (P(h).type === 'probe' && P(h).part === 'handle'));
    if (grab && ['jack', 'term', 'meter', 'lead'].includes(P(first).type)) return grab;
    // a terminal wins over the tip of a probe that is resting on it
    if (P(first).type === 'probe' && P(first).part !== 'handle') {
      const t = close.find((h) => P(h).type === 'term');
      if (t) return t;
    }
    return first;
  }
  const screenPos = (v, rect) => {
    const p = v.clone().project(camera);
    return { x: ((p.x + 1) / 2) * rect.width, y: ((1 - p.y) / 2) * rect.height };
  };
  let down = null;
  let drag = null; // {kind, lead, tip|pos, snap, near}
  const plane = new THREE.Plane();
  const tmp = V3(0, 0, 0);

  function contactDir(lead) { return V3(lead === 'red' ? 0.3 : -0.3, 1, 0.8).normalize(); }

  function updateDrag(e) {
    const rect = setRay(e);
    const px = e.clientX - rect.left; const py = e.clientY - rect.top;
    if (drag.kind === 'probe') {
      const d = contactDir(drag.lead);
      plane.set(UP, -(0.55 + drag.grab * d.y));
      if (!ray.ray.intersectPlane(plane, tmp)) return;
      const tip = tmp.clone().addScaledVector(d, -drag.grab);
      const tp = screenPos(tip, rect);
      let best = null; let bd = 1e9;
      Object.values(terms).forEach((t) => {
        const s = screenPos(t.pos, rect);
        const dist = Math.hypot(s.x - tp.x, s.y - tp.y);
        if (dist < bd) { bd = dist; best = t.id; }
      });
      const scale = Math.max(26, Math.min(46, rect.height / 14));
      if (bd >= scale) {
        // forgiving fallback: the pointer itself is over a test point
        let pb = null; let pd = 1e9;
        Object.values(terms).forEach((t) => {
          const sp = screenPos(t.pos, rect);
          const dist = Math.hypot(sp.x - px, sp.y - py);
          if (dist < pd) { pd = dist; pb = t.id; }
        });
        if (pd < scale * 0.8) { best = pb; bd = pd; }
      }
      drag.snap = bd < scale ? best : null;
      drag.near = !drag.snap && bd < scale * 2.1 && !TERMINALS[best].bridge ? best : null;
      drag.tip = drag.snap ? terms[drag.snap].pos.clone() : tip;
      ctl.hover(drag.snap ? { type: 'term', id: drag.snap } : null);
    } else if (drag.kind === 'plug') {
      plane.setFromNormalAndCoplanarPoint(meterNormal, jackWorld.COM.clone().addScaledVector(meterNormal, 0.7));
      if (!ray.ray.intersectPlane(plane, tmp)) return;
      let best = null; let bd = 1e9;
      Object.keys(jackWorld).forEach((id) => {
        const s = screenPos(jackWorld[id], rect);
        const dist = Math.hypot(s.x - px, s.y - py);
        if (dist < bd) { bd = dist; best = id; }
      });
      drag.snap = bd < Math.max(30, rect.height / 13) ? best : null;
      drag.pos = drag.snap ? jackWorld[drag.snap].clone().addScaledVector(meterNormal, 0.35) : tmp.clone();
    } else if (drag.kind === 'dial') {
      const inv = meter.matrixWorld.clone().invert();
      const o = ray.ray.origin.clone().applyMatrix4(inv);
      const dir = ray.ray.direction.clone().transformDirection(inv);
      const k = (0.5 - o.z) / dir.z;
      const lx = o.x + dir.x * k; const ly = o.y + dir.y * k - DIAL_Y;
      if (Math.hypot(lx, ly) < 0.25) return;
      const ang = (Math.atan2(lx, ly) * 180) / Math.PI;
      let best = null; let bd = 40;
      DIAL.forEach((id) => { const dd = Math.abs(DIAL_ANGLE[id] - ang); if (dd < bd) { bd = dd; best = id; } });
      if (best && best !== drag.last && best !== sim.state.dial) { drag.last = best; ctl.setDial(best); }
      if (best === sim.state.dial) drag.last = best;
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const hit = pick(e);
    const part = hit ? hit.object.userData.part : null;
    down = { x: e.clientX, y: e.clientY, part, cand: null, id: e.pointerId };
    if (part && part.type === 'probe' && part.part === 'handle') {
      const L = leads[part.lead];
      down.cand = { kind: 'probe', lead: part.lead, grab: Math.min(2.5, Math.max(0.9, hit.point.clone().sub(L.tip).dot(L.dir))) };
    } else if (part && part.type === 'plug') down.cand = { kind: 'plug', lead: part.lead };
    else if (part && part.type === 'dialknob') down.cand = { kind: 'dial' };
    if (down.cand) { controls.enabled = false; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (down && down.cand) {
      if (!drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) {
        const c = down.cand;
        if (c.kind === 'dial' || ctl.beginDrag(c.kind, c.lead)) drag = { ...c };
        else { down.cand = null; down.cancelled = true; controls.enabled = true; return; }
      }
      if (drag) updateDrag(e);
      return;
    }
    if (down || e.pointerType !== 'mouse') return;
    const hit = pick(e);
    const part = hit ? hit.object.userData.part : null;
    const active = part && part.type !== 'bench';
    canvas.style.cursor = active ? 'pointer' : 'grab';
    ctl.hover(active ? part : null, e);
  });
  const end = (e) => {
    if (!down) return;
    const d = down; down = null;
    controls.enabled = true;
    if (drag) {
      const g = drag; drag = null;
      ctl.hover(null);
      if (g.kind === 'probe') ctl.endDrag('probe', g.lead, g.snap, g.near);
      if (g.kind === 'plug') ctl.endDrag('plug', g.lead, g.snap);
      return;
    }
    if (d.cancelled || e.type === 'pointercancel') return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 7) ctl.clickPart(d.part || { type: 'none' });
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!down) ctl.hover(null); });

  // ---- per-frame sync ------------------------------------------------------
  const q = new THREE.Quaternion();
  let labelT = 1;
  let time = 0;

  function leadTargets(lead) {
    const s = sim.state;
    const sel = ctl.ui.selected;
    const rest = REST[ctl.ui.rest] || REST.home;
    let tip; let dir;
    if (drag && drag.kind === 'probe' && drag.lead === lead && drag.tip) { tip = drag.tip; dir = contactDir(lead); }
    else if (s.probes[lead]) { tip = terms[s.probes[lead]].pos; dir = contactDir(lead); }
    else if (s.near[lead]) { tip = terms[s.near[lead]].pos.clone().add(V3(lead === 'red' ? 0.42 : -0.42, 0.3, 0.3)); dir = contactDir(lead); }
    else if (sel && sel.kind === 'probe' && sel.lead === lead) { tip = rest[lead].clone().add(V3(0, 0.9, 0)); dir = rest.dir.clone().add(V3(0, 0.55, 0)).normalize(); }
    else { tip = rest[lead]; dir = rest.dir.clone().normalize(); }
    let pp; let pd;
    if (drag && drag.kind === 'plug' && drag.lead === lead && drag.pos) { pp = drag.pos; pd = meterNormal; }
    else if (s.plugs[lead]) { pp = jackWorld[s.plugs[lead]].clone().addScaledVector(meterNormal, 0.12); pd = meterNormal; }
    else if (sel && sel.kind === 'plug' && sel.lead === lead) { pp = PLUG_REST[lead].clone().add(V3(0, 0.6, 0)); pd = V3(0, 0.4, 1).normalize(); }
    else { pp = PLUG_REST[lead]; pd = V3(0, 0, 1); }
    return { tip, dir, pp, pd };
  }

  function updateLead(lead, dt) {
    const L = leads[lead];
    const { tip, dir, pp, pd } = leadTargets(lead);
    const k = 1 - Math.exp(-dt * 12);
    L.tip.lerp(tip, k); L.dir.lerp(dir, k).normalize();
    L.plugPos.lerp(pp, k); L.plugDir.lerp(pd, k).normalize();
    L.probe.position.copy(L.tip);
    L.probe.quaternion.copy(q.setFromUnitVectors(UP, L.dir));
    L.plug.position.copy(L.plugPos);
    L.plug.quaternion.copy(q.setFromUnitVectors(UP, L.plugDir));
    const a = L.plugPos.clone().addScaledVector(L.plugDir, 0.78);
    const b = L.tip.clone().addScaledVector(L.dir, 2.78);
    const key = [a.x, a.y, a.z, b.x, b.y, b.z].map((v) => v.toFixed(2)).join(',');
    if (key !== L.wireKey) {
      L.wireKey = key;
      const a2 = a.clone().addScaledVector(L.plugDir, 0.7);
      const b2 = b.clone().addScaledVector(L.dir, 0.8);
      a2.y = Math.max(a2.y, 0.1); b2.y = Math.max(b2.y, 0.1);
      const mid = a2.clone().lerp(b2, 0.5);
      mid.y = 0.09;
      mid.z = Math.min(6.2, Math.max(a2.z, b2.z) + (lead === 'red' ? 0.9 : 0.5));
      const q1 = a2.clone().lerp(mid, 0.5); q1.y = 0.09;
      const q2 = b2.clone().lerp(mid, 0.5); q2.y = Math.max(0.09, b2.y * 0.35);
      const curve = new THREE.CatmullRomCurve3([a, a2, q1, mid, q2, b2, b], false, 'catmullrom', 0.5);
      L.wire.geometry.dispose();
      L.wire.geometry = new THREE.TubeGeometry(curve, 48, 0.055, 6);
      L.mid = q2;
      L.nick.position.copy(b.clone().lerp(b2, 0.55));
      L.nick.quaternion.copy(q.setFromUnitVectors(V3(0, 0, 1), L.dir));
    }
    L.nick.visible = sim.state.damaged[lead];
    const up = sim.state.probes[lead] || sim.state.near[lead] || (drag && drag.lead === lead);
    L.tag.position.copy(L.tip).addScaledVector(L.dir, up ? 2.75 : lead === 'red' ? 2.5 : 1.5).add(V3(0, up ? 0.3 : 0.5, 0));
  }

  function update(dt) {
    time += dt;
    const s = sim.state;
    if (tween) {
      tween.k = Math.min(1, tween.k + dt / 0.7);
      const e = tween.k * tween.k * (3 - 2 * tween.k);
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (tween.k >= 1) tween = null;
    }
    // keep the orbit target on the bench
    controls.target.x = Math.max(-9, Math.min(11.5, controls.target.x));
    controls.target.z = Math.max(-4, Math.min(6, controls.target.z));
    controls.target.y = Math.max(0, Math.min(3, controls.target.y));
    controls.update();

    const k = 1 - Math.exp(-dt * 12);
    knob.rotation.z += ((-DIAL_ANGLE[s.dial] * Math.PI) / 180 - knob.rotation.z) * k;
    Object.keys(switches).forEach((id) => {
      const sw = switches[id];
      sw.lever.rotation.z += ((s.switches[id] ? 0 : 0.6) - sw.lever.rotation.z) * k;
    });
    Object.keys(lamps).forEach((id) => {
      const l = lamps[id];
      const target = Math.min(1, sim.lampLevel(id)) > 0.5 ? 1 : 0;
      l.level += (target - l.level) * k;
      l.bulbMat.emissiveIntensity = l.level * 2.4;
      l.light.intensity = l.level * 14;
    });
    updateLead('black', dt); updateLead('red', dt);
    drawLCD();

    labelT += dt;
    if (labelT > 0.15) {
      labelT = 0;
      dynLabels.forEach((f) => f());
      Object.values(terms).forEach((t) => {
        if (!t.label) return;
        const intended = s.intended.includes(t.id);
        const hover = ctl.ui.hoverTerm === t.id;
        t.ring.visible = intended || hover;
        t.label.userData.set(`${intended ? '✔ ' : ''}${t.text}`, intended ? { bg: '#ffffff', fg: '#10222c', border: '#10222c' } : hover ? { bg: '#0b3d91' } : {});
      });
    }

    // guided highlights
    const keys = (ctl.ui.highlights || []).filter((key) => anchors[key]);
    const sel = ctl.ui.selected;
    const pulse = 1 + 0.12 * Math.sin(time * 5);
    markers.forEach((m, i) => {
      const key = keys[i];
      if (!key) { m.r.visible = m.a.visible = false; return; }
      const p = anchors[key]();
      const dist = camera.position.distanceTo(p);
      const size = Math.max(0.5, dist * 0.055);
      m.r.visible = m.a.visible = true;
      m.r.position.copy(p); m.r.scale.setScalar(size * 1.5 * pulse);
      m.a.position.copy(p).add(V3(0, size * 1.6 + 0.12 * Math.sin(time * 5), 0)); m.a.scale.set(size * 0.75, size, 1);
    });
    void sel;
    renderer.render(scene, camera);
  }

  return {
    update, focus, zoom, canvas,
    refreshLabels: () => { labelT = 1; canvas.setAttribute('aria-label', tr(UI.stageHelp)); },
    // test hook: screen position of an anchor
    screenOf: (key) => {
      const rect = canvas.getBoundingClientRect();
      const p = anchors[key] ? anchors[key]() : null;
      if (!p) return null;
      const s = screenPos(p, rect);
      return { x: s.x + rect.left, y: s.y + rect.top };
    },
  };
}
