// SIMULATED 3D fulfillment warehouse (procedural assets). Reads the shared Sim state every frame.
// Status is never color-only: every robot/station/charger/AP label carries an icon + text.
import * as THREE from '../../vendor/three.module.js';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { AISLES, SLOT_Z, ROAD_Z, STATIONS, CHARGERS, APS, MAINT, zoneOf, aisleAt } from '../sim/engine.js';
import { robotVisual, STATION_STATUS, AP_STATUS } from '../sim/visual.js';

const W = { x0: -45, x1: 45, z0: -32, z1: 32 };
const QUALITY = {
  low: { ratio: 1, shadows: false, shadowSize: 512, floor: 2048, totes: 0.4 },
  medium: { ratio: 1.5, shadows: true, shadowSize: 1024, floor: 2048, totes: 0.8 },
  high: { ratio: 2, shadows: true, shadowSize: 2048, floor: 4096, totes: 1 },
  ultra: { ratio: 3, shadows: true, shadowSize: 4096, floor: 4096, totes: 1 },
};
export const PART_INFO = {
  battery: 'battery', wheels: 'drive', encoders: 'encoders', bumper: 'obstacle', lidar: 'localization', estop: 'estop', controller: 'controller', antenna: 'wireless', lift: 'payload',
};

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function labelTex(text, opts = {}) {
  const w = opts.w || 512, h = opts.h || 128;
  return canvasTex(w, h, (g) => {
    g.fillStyle = opts.bg || '#f4f1e8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = opts.border || '#1c1c1c'; g.lineWidth = Math.max(4, h * 0.05); g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = opts.fg || '#111'; g.font = `700 ${opts.size || Math.floor(h * 0.55)}px "Inter", "Segoe UI", Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
    if (opts.sub) { g.font = `600 ${Math.floor(h * 0.18)}px Arial`; g.fillText(opts.sub, w / 2, h * 0.86); }
  });
}

export class Warehouse {
  constructor(container, opts = {}) {
    this.container = container;
    this.quality = opts.quality || 'medium';
    this.reducedMotion = !!opts.reducedMotion;
    this.overlays = { power: false, comms: false, sensors: false, software: false };
    this.mode = 'overview';
    this.selectCbs = new Set();
    this.robotObjs = new Map();
    this.labels = [];
    this.fp = { yaw: 0, pitch: -0.1, keys: {}, pos: new THREE.Vector3(-30.3, 1.7, -26) };
    this.tween = null;
    this.exploded = null; this.explodeT = 0;
    this.sim = null;
    this._init();
  }

  _init() {
    const q = QUALITY[this.quality];
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.ratio));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = q.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.setAttribute('aria-label', '3D view of the simulated warehouse. Use the camera buttons, or the lists in the side panel, for the same information.');
    r.domElement.setAttribute('role', 'img');
    r.domElement.tabIndex = 0;
    this.container.appendChild(r.domElement);
    this.labelLayer = document.createElement('div'); this.labelLayer.className = 'label-layer'; this.container.appendChild(this.labelLayer);

    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#cfd6dc');
    s.fog = new THREE.Fog('#cfd6dc', 90, 170);
    const cam = this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    cam.position.set(4, 62, 52);
    this.controls = new OrbitControls(cam, r.domElement);
    this.controls.target.set(0, 0, -2); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47; this.controls.minDistance = 3; this.controls.maxDistance = 140;

    s.add(new THREE.HemisphereLight('#ffffff', '#5a5f66', 0.9));
    const sun = this.sun = new THREE.DirectionalLight('#fffaf0', 1.6);
    sun.position.set(30, 60, 25); sun.castShadow = q.shadows;
    sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 45, bottom: -45, near: 10, far: 150 });
    sun.shadow.bias = -0.0005;
    s.add(sun);
    // ceiling light fixtures (visual only, restrained)
    const fixMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffbe8', emissiveIntensity: 0.7 });
    const fixGeo = new THREE.BoxGeometry(4, 0.12, 0.4);
    for (let x = -36; x <= 36; x += 12) for (let z = -24; z <= 20; z += 11) { const m = new THREE.Mesh(fixGeo, fixMat); m.position.set(x, 9.5, z); s.add(m); }

    this._buildFloor(q);
    this._buildStructure();
    this._buildRacks(q);
    this._buildStations();
    this._buildChargers();
    this._buildMaintenance();
    this._buildControlRoom();
    this._buildAPs();
    this._buildMarkers();
    this._buildDynamic();

    this.raycaster = new THREE.Raycaster();
    this._bindInput();
    this.resize();
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(this.container);
    this.clock = new THREE.Clock();
  }

  // ------------------------------------------------------------------ floor & markings
  _buildFloor(q) {
    const size = q.floor, S = size / (W.x1 - W.x0), H = Math.round((W.z1 - W.z0) * S);
    const P = (x, z) => [(x - W.x0) * S, (z - W.z0) * S];
    const tex = canvasTex(size, H, (g) => {
      g.fillStyle = '#a3a6a8'; g.fillRect(0, 0, size, H);
      // concrete speckle
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < size * 14; i++) { const v = 140 + Math.floor(rnd() * 40); g.fillStyle = `rgba(${v},${v},${v + 3},0.35)`; g.fillRect(rnd() * size, rnd() * H, 2, 2); }
      // expansion joints
      g.strokeStyle = 'rgba(60,60,60,0.35)'; g.lineWidth = 2;
      for (let x = W.x0; x <= W.x1; x += 6) { const [a] = P(x, 0); g.beginPath(); g.moveTo(a, 0); g.lineTo(a, H); g.stroke(); }
      for (let z = W.z0; z <= W.z1; z += 6) { const [, b] = P(0, z); g.beginPath(); g.moveTo(0, b); g.lineTo(size, b); g.stroke(); }
      const rect = (x0, z0, x1, z1, fill) => { const [a, b] = P(x0, z0), [c, d] = P(x1, z1); g.fillStyle = fill; g.fillRect(a, b, c - a, d - b); };
      const hatchBand = (x0, z0, x1, z1) => { const [a, b] = P(x0, z0), [c, d] = P(x1, z1); g.save(); g.beginPath(); g.rect(a, b, c - a, d - b); g.clip(); g.fillStyle = '#f2c200'; g.fillRect(a, b, c - a, d - b); g.strokeStyle = '#151515'; g.lineWidth = 0.18 * S; for (let k = -H; k < size + H; k += 0.6 * S) { g.beginPath(); g.moveTo(k, b - 10); g.lineTo(k + (d - b) + 20, d + 10); g.stroke(); } g.restore(); };
      const text = (str, x, z, sizeM, color = '#111', rot = 0, weight = 800) => { const [a, b] = P(x, z); g.save(); g.translate(a, b); g.rotate(rot); g.fillStyle = color; g.font = `${weight} ${sizeM * S}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(str, 0, 0); g.restore(); };
      // pedestrian walkways (green with white edges)
      const walk = (x0, z0, x1, z1) => { rect(x0, z0, x1, z1, '#2f7d4f'); const [a, b] = P(x0, z0), [c, d] = P(x1, z1); g.strokeStyle = '#ffffff'; g.lineWidth = 0.12 * S; g.strokeRect(a, b, c - a, d - b); };
      walk(-44, -28.2, 41, -25.4); walk(-31.4, -25.4, -29.6, 26);
      for (let x = -40; x <= 36; x += 9) text('PEDESTRIAN WALKWAY  ▶', x, -26.8, 0.7, '#ffffff');
      for (let z = -20; z <= 22; z += 9) text('WALKWAY ▲', -30.5, z, 0.55, '#ffffff', -Math.PI / 2);
      // robot operating area: hatched boundary + label
      const RA = { x0: -29, z0: -20.4, x1: 40, z1: 19.2 };
      hatchBand(RA.x0, RA.z0 - 0.35, RA.x1, RA.z0); hatchBand(RA.x0, RA.z1, RA.x1, RA.z1 + 0.35);
      hatchBand(RA.x0 - 0.35, RA.z0 - 0.35, RA.x0, RA.z1 + 0.35); hatchBand(RA.x1, RA.z0 - 0.35, RA.x1 + 0.35, RA.z1 + 0.35);
      for (let x = -20; x <= 34; x += 18) text('ROBOT OPERATING AREA — NO PEDESTRIAN ENTRY', x, 19.9, 0.55);
      text('ROBOT AREA — AUTHORIZED ACCESS ONLY', -28.3, 0, 0.5, '#111', -Math.PI / 2);
      // gated robot crossing to maintenance bay
      hatchBand(-31.4, -15.8, -29.6, -15.6); hatchBand(-31.4, -14.4, -29.6, -14.2);
      text('GATED ROBOT CROSSING', -30.5, -15, 0.32, '#fff');
      // road and aisle center lines
      g.setLineDash([1.2 * S, 0.8 * S]); g.strokeStyle = '#f7f7f2'; g.lineWidth = 0.1 * S;
      let [a, b] = P(-36, ROAD_Z), [c] = P(38, ROAD_Z); g.beginPath(); g.moveTo(a, b); g.lineTo(c, b); g.stroke();
      for (const ax of Object.values(AISLES)) { const [p, q2] = P(ax, ROAD_Z), [, r2] = P(ax, 16); g.beginPath(); g.moveTo(p, q2); g.lineTo(p, r2); g.stroke(); }
      g.setLineDash([]);
      for (const [al, ax] of Object.entries(AISLES)) { text(al, ax, -12.6, 2.2, 'rgba(20,20,20,0.75)'); text(`ZONE ${al}`, ax, 17.3, 0.6); }
      text('ZONE S — STATIONS & CHARGING ROAD', 0, -16.9, 0.6);
      // station boxes and charger bays
      for (const [id, p] of Object.entries(STATIONS)) { const [x0, z0] = P(p.x - 1.6, p.z + 1.2), [x1, z1] = P(p.x + 1.6, p.z + 3.4); g.strokeStyle = '#ffffff'; g.lineWidth = 0.1 * S; g.strokeRect(x0, z0, x1 - x0, z1 - z0); text(id, p.x, p.z + 2.9, 0.6, '#fff'); }
      for (const [id, p] of Object.entries(CHARGERS)) { const [x0, z0] = P(p.x - 2.2, p.z - 1.2), [x1, z1] = P(p.x + 0.4, p.z + 1.2); g.strokeStyle = '#56B4E9'; g.lineWidth = 0.1 * S; g.strokeRect(x0, z0, x1 - x0, z1 - z0); text(id, p.x - 1.6, p.z, 0.45, '#0b3a57'); }
      // maintenance bay
      const [m0, n0] = P(-42, -14), [m1, n1] = P(-32, -3); g.save(); g.beginPath(); g.rect(m0, n0, m1 - m0, n1 - n0); g.clip(); g.fillStyle = '#b9b39a'; g.fillRect(m0, n0, m1 - m0, n1 - n0); g.strokeStyle = 'rgba(242,194,0,0.9)'; g.lineWidth = 0.15 * S; for (let k = m0 - 400; k < m1 + 400; k += 1.2 * S) { g.beginPath(); g.moveTo(k, n0); g.lineTo(k + (n1 - n0), n1); g.stroke(); } g.restore();
      text('MAINTENANCE BAY', -37, -12.8, 0.8);
      // control room floor
      rect(-44.5, 8, -33.5, 24.5, '#7f8a93'); text('CONTROL ROOM', -39, 23.4, 0.7, '#fff');
    });
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W.x1 - W.x0, W.z1 - W.z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.0 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((W.x0 + W.x1) / 2, 0, (W.z0 + W.z1) / 2); floor.receiveShadow = true;
    this.scene.add(floor);
  }

  _buildStructure() {
    const s = this.scene;
    const wallMat = new THREE.MeshStandardMaterial({ color: '#dfe3e6', roughness: 0.95 });
    const north = new THREE.Mesh(new THREE.BoxGeometry(90, 10, 0.4), wallMat); north.position.set(0, 5, -32.2); north.receiveShadow = true; s.add(north);
    const west = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10, 64), wallMat); west.position.set(-45.2, 5, 0); s.add(west);
    const colMat = new THREE.MeshStandardMaterial({ color: '#2f5f8f', roughness: 0.6, metalness: 0.4 });
    const colGeo = new THREE.BoxGeometry(0.4, 10, 0.4);
    for (const x of [-30, -16, 0, 16, 30]) for (const z of [-30, 18.6]) { const c = new THREE.Mesh(colGeo, colMat); c.position.set(x, 5, z); c.castShadow = true; s.add(c); }
    // safety barrier between operator side and robot area at stations (with openings)
    const barMat = new THREE.MeshStandardMaterial({ color: '#f2c200', roughness: 0.5 });
    for (let x = -28; x <= 39; x += 2) { if (Object.values(STATIONS).some((p) => Math.abs(p.x - x) < 1.8)) continue; const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), barMat); post.position.set(x, 0.55, -20.6); s.add(post); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(67, 0.08, 0.06), barMat); rail.position.set(5.5, 1.05, -20.6); s.add(rail);
    // signs
    const sign = (text, x, y, z, ry = 0, w = 6, sub) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: labelTex(text, { sub, w: 1024, h: 256 }), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; s.add(m); return m; };
    sign('MAINTENANCE BAY', -37, 4, -14.3, 0, 6, 'LOCKOUT/TAGOUT REQUIRED (simulated)');
    sign('CHARGING', 39.6, 4.2, -22.5, -Math.PI / 2, 5, 'docks C-1 … C-4');
    sign('PICKING STATIONS', 0, 4.5, -27.5, 0, 7, 'operators stay behind barrier');
  }

  // ------------------------------------------------------------------ racks & totes
  _buildRacks(q) {
    const s = this.scene;
    const upMat = new THREE.MeshStandardMaterial({ color: '#1f4e8c', roughness: 0.55, metalness: 0.5 });
    const beamMat = new THREE.MeshStandardMaterial({ color: '#e46f1a', roughness: 0.5, metalness: 0.4 });
    const deckMat = new THREE.MeshStandardMaterial({ color: '#8e9599', roughness: 0.8, metalness: 0.3 });
    const upGeo = new THREE.BoxGeometry(0.09, 4.2, 0.09), beamGeo = new THREE.BoxGeometry(0.08, 0.12, 3), deckGeo = new THREE.BoxGeometry(1.2, 0.03, 27);
    const levels = [0.55, 1.45, 2.4, 3.35];
    const toteColors = ['#3b6ea5', '#4f5b66', '#2e7d6b', '#8a6d3b', '#5a4f8c'].map((c) => new THREE.Color(c));
    const toteGeo = new THREE.BoxGeometry(0.6, 0.38, 0.9);
    const toteMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const perBay = q.totes >= 1 ? 2 : 1;
    const count = 4 * 2 * 9 * levels.length * perBay;
    const totes = new THREE.InstancedMesh(toteGeo, toteMat, count); totes.castShadow = q.shadows; totes.receiveShadow = true;
    let ti = 0; const m4 = new THREE.Matrix4();
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const [al, ax] of Object.entries(AISLES)) {
      for (const side of [-1, 1]) {
        const cx = ax + side * 2.4;
        for (let k = 0; k <= 9; k++) for (const dx of [-0.6, 0.6]) { const u = new THREE.Mesh(upGeo, upMat); u.position.set(cx + dx, 2.1, -11.5 + 3 * k); u.castShadow = q.shadows; s.add(u); }
        for (const y of levels) {
          const d = new THREE.Mesh(deckGeo, deckMat); d.position.set(cx, y - 0.06, 2); d.receiveShadow = true; s.add(d);
          for (let k = 0; k < 9; k++) for (const dx of [-0.6, 0.6]) { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(cx + dx, y - 0.1, -10 + 3 * k); s.add(b); }
          for (let k = 0; k < 9; k++) for (let j = 0; j < perBay; j++) { if (rnd() < 1 - q.totes * 0.95) continue; m4.makeTranslation(cx, y + 0.12, -10 + 3 * k + (perBay === 2 ? (j ? 0.7 : -0.7) : 0)); totes.setMatrixAt(ti, m4); totes.setColorAt(ti, toteColors[Math.floor(rnd() * toteColors.length)]); ti++; }
        }
        // location label plates facing the aisle
        for (let k = 0; k < 9; k++) {
          const n = k * 2 + (side < 0 ? 1 : 2); const code = `${al}-${String(n).padStart(2, '0')}`;
          const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.26), new THREE.MeshBasicMaterial({ map: labelTex(code, { w: 256, h: 84, bg: '#ffffff' }) }));
          p.position.set(cx - side * 0.62, 0.95, SLOT_Z[k]); p.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; s.add(p);
        }
      }
      // aisle header sign
      const hs = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: labelTex(`AISLE ${al}`, { w: 512, h: 160, bg: '#0b3a57', fg: '#ffffff', border: '#ffffff' }), side: THREE.DoubleSide }));
      hs.position.set(ax, 5.0, -12); s.add(hs);
    }
    totes.count = ti; s.add(totes);
  }

  // ------------------------------------------------------------------ stations, chargers, maintenance, control room, APs
  _buildStations() {
    const s = this.scene; this.stationObjs = {};
    const deskMat = new THREE.MeshStandardMaterial({ color: '#5c6670', roughness: 0.6, metalness: 0.3 });
    const topMat = new THREE.MeshStandardMaterial({ color: '#c9c3b5', roughness: 0.8 });
    for (const [id, p] of Object.entries(STATIONS)) {
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.userData.pick = { type: 'station', id };
      const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, 1.2), deskMat); desk.position.set(0, 0.45, -1.2); desk.castShadow = true; g.add(desk);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.05, 1.3), topMat); top.position.set(0, 0.92, -1.2); g.add(top);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.05), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#1d3b52', emissiveIntensity: 0.6 })); screen.position.set(0.8, 1.5, -1.6); screen.rotation.x = -0.2; g.add(screen);
      const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.12), new THREE.MeshStandardMaterial({ color: '#222' })); scanner.position.set(-0.9, 1.1, -0.8); g.add(scanner);
      const mat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 1.2), new THREE.MeshStandardMaterial({ color: '#222' })); mat.position.set(0, 0.01, -3); g.add(mat);
      // light tower: 3 tiers (top = stopped, middle = attention, bottom = ready)
      const tiers = ['#D55E00', '#E69F00', '#009E73'].map((c, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05 })); m.position.set(1.4, 1.9 - i * 0.18, -1.7); g.add(m); return m; });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0), deskMat); pole.position.set(1.4, 1.2, -1.7); g.add(pole);
      s.add(g);
      this.stationObjs[id] = { g, tiers };
      this._addLabel({ type: 'station', id, pos: new THREE.Vector3(p.x, 2.6, p.z - 1.2) });
    }
  }
  _buildChargers() {
    const s = this.scene; this.chargerObjs = {};
    for (const [id, p] of Object.entries(CHARGERS)) {
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.userData.pick = { type: 'charger', id };
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.9), new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.6 })); box.position.set(0.3, 0.6, 0); box.castShadow = true; g.add(box);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.8), new THREE.MeshStandardMaterial({ color: '#30363b', metalness: 0.6, roughness: 0.4 })); plate.position.set(-0.6, 0.015, 0); g.add(plate);
      for (const dz of [-0.2, 0.2]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.08), new THREE.MeshStandardMaterial({ color: '#b08d57', metalness: 0.9, roughness: 0.3 })); c.position.set(-0.6, 0.04, dz); g.add(c); }
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshStandardMaterial({ color: '#56B4E9', emissive: '#56B4E9', emissiveIntensity: 0.4 })); led.position.set(0.05, 1.05, 0); g.add(led);
      s.add(g); this.chargerObjs[id] = { g, led };
      this._addLabel({ type: 'charger', id, pos: new THREE.Vector3(p.x + 0.3, 1.7, p.z) });
    }
    // power feed (shown in power overlay)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 1.6), new THREE.MeshStandardMaterial({ color: '#7d858c' })); panel.position.set(39.2, 1.1, -14); this.scene.add(panel);
    this.powerFeed = new THREE.Group(); this.powerFeed.visible = false;
    const feedMat = new THREE.LineBasicMaterial({ color: '#E69F00' });
    for (const p of Object.values(CHARGERS)) { const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(39, 2.2, -14), new THREE.Vector3(39, 2.2, p.z), new THREE.Vector3(p.x + 0.4, 1.2, p.z)]); this.powerFeed.add(new THREE.Line(geo, feedMat)); }
    this.scene.add(this.powerFeed);
  }
  _buildMaintenance() {
    const s = this.scene;
    const fenceMat = new THREE.MeshStandardMaterial({ color: '#f2c200', transparent: true, opacity: 0.55 });
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 0.05), fenceMat); f1.position.set(-37, 0.8, -3); s.add(f1);
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 9), fenceMat); f2.position.set(-32, 0.8, -7.5); s.add(f2);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1), new THREE.MeshStandardMaterial({ color: '#6d5c4b' })); bench.position.set(-40.5, 0.45, -10); s.add(bench);
    const lift = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.8), new THREE.MeshStandardMaterial({ color: '#3c4650', metalness: 0.5 })); lift.position.set(-37, 0.25, -6.5); s.add(lift);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.6), new THREE.MeshStandardMaterial({ color: '#b3261e' })); cab.position.set(-41.2, 0.9, -5); s.add(cab);
    const loto = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: labelTex('LOCKOUT STATION', { w: 512, h: 256, sub: 'simulated — follow site procedure' }) })); loto.position.set(-41.2, 2.2, -4.69); s.add(loto);
  }
  _buildControlRoom() {
    const s = this.scene;
    const glass = new THREE.MeshStandardMaterial({ color: '#a9c7d9', transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.1 });
    const frame = new THREE.MeshStandardMaterial({ color: '#39424a' });
    const wE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3, 16), glass); wE.position.set(-33.6, 1.5, 16.2); s.add(wE);
    const wS = new THREE.Mesh(new THREE.BoxGeometry(11, 3, 0.08), glass); wS.position.set(-39, 1.5, 8.1); s.add(wS);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.15, 16.4), new THREE.MeshStandardMaterial({ color: '#39424a', transparent: true, opacity: 0.18, depthWrite: false })); roof.position.set(-39, 3.05, 16.2); s.add(roof);
    const chairs = new THREE.MeshStandardMaterial({ color: '#2d3640' }); for (const x of [-41, -37]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), chairs); ch.position.set(x, 0.45, 15.4); s.add(ch); }
    const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.75, 1.2), new THREE.MeshStandardMaterial({ color: '#4c5560' })); desk.position.set(-39, 0.38, 14); s.add(desk);
    this.dashTex = canvasTex(1024, 576, (g) => { g.fillStyle = '#0d1b26'; g.fillRect(0, 0, 1024, 576); });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.36), new THREE.MeshBasicMaterial({ map: this.dashTex })); scr.position.set(-39, 2.0, 12.3); scr.rotation.y = Math.PI; s.add(scr);
    const scr2 = scr.clone(); scr2.position.set(-39, 2.0, 15.0); scr2.rotation.y = 0; s.add(scr2);
    const grp = new THREE.Group(); grp.userData.pick = { type: 'control', id: 'control-room' }; grp.add(scr.clone()); s.add(grp);
    this._addLabel({ type: 'fixed', id: 'control', text: '🖥 Control room & interview room (simulated)', pos: new THREE.Vector3(-39, 3.6, 16) });
    this._addLabel({ type: 'fixed', id: 'maint', text: '🔧 Maintenance bay', pos: new THREE.Vector3(-37, 2.4, -8.5) });
  }
  _buildAPs() {
    const s = this.scene; this.apObjs = {};
    this.commsGroup = new THREE.Group(); this.commsGroup.visible = false; s.add(this.commsGroup);
    for (const [id, p] of Object.entries(APS)) {
      const g = new THREE.Group(); g.position.set(p.x, 7.2, p.z); g.userData.pick = { type: 'ap', id };
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24), new THREE.MeshStandardMaterial({ color: '#f5f5f5' })); g.add(disc);
      const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2), new THREE.MeshStandardMaterial({ color: '#777' })); mount.position.y = 1.1; g.add(mount);
      s.add(g); this.apObjs[id] = g;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, p.zone === 'S' ? 14 : 9, 48), new THREE.MeshBasicMaterial({ color: '#0072B2', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.03, p.z); this.commsGroup.add(ring); this.apObjs[id].ring = ring;
      const edge = new THREE.Mesh(new THREE.RingGeometry(p.zone === 'S' ? 13.85 : 8.85, p.zone === 'S' ? 14 : 9, 64), new THREE.MeshBasicMaterial({ color: '#0072B2', transparent: true, opacity: 0.5, side: THREE.DoubleSide })); edge.rotation.x = -Math.PI / 2; edge.position.set(p.x, 0.035, p.z); this.commsGroup.add(edge); this.apObjs[id].edge = edge;
      this._addLabel({ type: 'ap', id, pos: new THREE.Vector3(p.x, 7.9, p.z) });
    }
  }
  _buildMarkers() {
    // floor localization markers (fiducials) along aisle centres
    const pts = [];
    for (const [al, ax] of Object.entries(AISLES)) for (let z = -11; z <= 15; z += 1.5) pts.push({ al, x: ax, z });
    this.markerPts = pts;
    const m = this.markers = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: '#ffffff' }), pts.length);
    const m4 = new THREE.Matrix4(); const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    pts.forEach((p, i) => { m4.makeTranslation(p.x + 0.7, 0.02, p.z).multiply(rot); m.setMatrixAt(i, m4); m.setColorAt(i, new THREE.Color('#151515')); });
    this.scene.add(m); this._markerState = '';
  }

  // ------------------------------------------------------------------ dynamic objects
  _buildDynamic() {
    const s = this.scene;
    this.obstruction = new THREE.Group();
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.38, 0.6), new THREE.MeshStandardMaterial({ color: '#3b6ea5', roughness: 0.7 })); t.rotation.set(0.3, 0.6, 1.2); t.position.y = 0.3; t.castShadow = true; this.obstruction.add(t);
    const spill = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.3), new THREE.MeshStandardMaterial({ color: '#c9a66b' })); spill.position.set(0.5, 0.1, 0.3); this.obstruction.add(spill);
    this.obstruction.visible = false; s.add(this.obstruction);
    this.lockoutBars = {}; this.restrictSigns = {};
    for (const [al, ax] of Object.entries(AISLES)) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: '#D55E00' })); bar.position.set(ax, 0.9, -12.2); bar.visible = false; s.add(bar); this.lockoutBars[al] = bar;
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: labelTex('RESTRICTED', { w: 512, h: 256, bg: '#ffffff', fg: '#b3261e', sub: 'no robot work dispatched' }), side: THREE.DoubleSide })); sg.position.set(ax, 1.6, -12.4); sg.visible = false; s.add(sg); this.restrictSigns[al] = sg;
    }
    this.sensorGroup = new THREE.Group(); this.sensorGroup.visible = false; s.add(this.sensorGroup);
    this.linkGroup = new THREE.Group(); this.commsGroup.add(this.linkGroup);
    this.powerLinks = new THREE.Group(); this.powerLinks.visible = false; s.add(this.powerLinks);
  }

  _makeRobot(id) {
    const g = new THREE.Group(); g.userData.pick = { type: 'robot', id };
    const parts = {};
    const shellMat = new THREE.MeshStandardMaterial({ color: '#e8eaec', roughness: 0.45, metalness: 0.1, transparent: true, opacity: 1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#2a2f35', roughness: 0.6 });
    const add = (name, mesh, explode) => { mesh.userData.part = name; mesh.userData.home = mesh.position.clone(); mesh.userData.explode = explode; mesh.castShadow = true; g.add(mesh); (parts[name] = parts[name] || []).push(mesh); return mesh; };
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 1.25), shellMat); shell.position.y = 0.33; shell.castShadow = true; shell.userData.part = 'shell'; g.add(shell); parts.shell = [shell];
    add('lift', new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 1.1), darkMat), new THREE.Vector3(0, 0.9, 0)).position.y = 0.57;
    for (const sx of [-1, 1]) { const w = add('wheels', new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 20), darkMat), new THREE.Vector3(sx * 0.7, 0, 0)); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.52, 0.15, 0); const e = add('encoders', new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), new THREE.MeshStandardMaterial({ color: '#0072B2' })), new THREE.Vector3(sx * 1.1, 0.1, 0)); e.rotation.z = Math.PI / 2; e.position.set(sx * 0.42, 0.15, 0); }
    add('battery', new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: '#2e7d32' })), new THREE.Vector3(0, -0.05, -1.0)).position.set(0, 0.2, -0.25);
    add('controller', new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.35), new THREE.MeshStandardMaterial({ color: '#455a64' })), new THREE.Vector3(-0.9, 0.5, 0.3)).position.set(0, 0.36, 0.25);
    add('bumper', new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.06), new THREE.MeshStandardMaterial({ color: '#E69F00' })), new THREE.Vector3(0, 0, 0.8)).position.set(0, 0.22, 0.64);
    add('lidar', new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 20), darkMat), new THREE.Vector3(0, 0.6, 0.6)).position.set(0, 0.6, 0.45);
    add('estop', new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), new THREE.MeshStandardMaterial({ color: '#D55E00' })), new THREE.Vector3(0.7, 0.5, -0.6)).position.set(0.38, 0.57, -0.5);
    add('antenna', new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35), darkMat), new THREE.Vector3(-0.7, 0.6, -0.6)).position.set(-0.38, 0.72, -0.5);
    // status light strips (front/back/sides of the lid) + a beacon; colour is backed by icon+text labels
    const statusMat = new THREE.MeshStandardMaterial({ color: '#0072B2', emissive: '#0072B2', emissiveIntensity: 0.6 });
    const ring = new THREE.Group();
    for (const [w, d, x, z] of [[0.86, 0.04, 0, 0.62], [0.86, 0.04, 0, -0.62], [0.04, 1.1, 0.5, 0], [0.04, 1.1, -0.5, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), statusMat); m.position.set(x, 0.5, z); ring.add(m); }
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16), statusMat); beacon.position.set(-0.36, 0.64, 0.48); ring.add(beacon);
    ring.material = statusMat; g.add(ring);
    const tote = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.9), new THREE.MeshStandardMaterial({ color: '#3b6ea5' })); tote.position.y = 0.79; tote.visible = false; tote.castShadow = true; g.add(tote);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshBasicMaterial({ map: labelTex(id, { w: 256, h: 72, bg: '#e8eaec', border: '#e8eaec' }) })); decal.position.set(0.505, 0.36, 0); decal.rotation.y = Math.PI / 2; g.add(decal);
    const decal2 = decal.clone(); decal2.position.x = -0.505; decal2.rotation.y = -Math.PI / 2; g.add(decal2);
    // sensor fan (overlay)
    const fan = new THREE.Mesh(new THREE.CircleGeometry(4, 32, Math.PI / 2 - 0.6, 1.2), new THREE.MeshBasicMaterial({ color: '#56B4E9', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); fan.rotation.x = -Math.PI / 2; fan.position.y = 0.05; fan.visible = false; g.add(fan);
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), new THREE.MeshBasicMaterial({ color: '#D55E00' })); ray.position.y = 0.25; ray.visible = false; g.add(ray);
    this.scene.add(g);
    const o = { g, parts, ring, tote, shellMat, fan, ray, prev: null, cur: null };
    this.robotObjs.set(id, o);
    this._addLabel({ type: 'robot', id, obj: g, offset: 1.5 });
    return o;
  }

  // ------------------------------------------------------------------ labels (HTML, crisp at any DPI)
  _addLabel(spec) {
    const el = document.createElement('button');
    el.className = `wl wl-${spec.type}`; el.type = 'button';
    el.addEventListener('click', (e) => { e.stopPropagation(); if (spec.type !== 'fixed') this._emitSelect({ type: spec.type, id: spec.id }); else if (spec.id === 'control') this._emitSelect({ type: 'control', id: 'control-room' }); });
    this.labelLayer.appendChild(el);
    spec.el = el; spec.last = '';
    if (spec.text) el.textContent = spec.text;
    this.labels.push(spec);
    return spec;
  }

  // ------------------------------------------------------------------ public API
  setSim(sim) {
    this.sim = sim;
    for (const r of sim.s.robots) { const o = this.robotObjs.get(r.id) || this._makeRobot(r.id); o.prev = { x: r.x, z: r.z, h: r.heading }; o.cur = { x: r.x, z: r.z, h: r.heading }; }
    this._markerState = '';
  }
  onSelect(cb) { this.selectCbs.add(cb); return () => this.selectCbs.delete(cb); }
  _emitSelect(sel) { for (const cb of this.selectCbs) cb(sel); }
  /** called after each sim step to enable interpolation */
  captureStep() { if (!this.sim) return; for (const r of this.sim.s.robots) { const o = this.robotObjs.get(r.id); if (!o) continue; o.prev = o.cur || { x: r.x, z: r.z, h: r.heading }; o.cur = { x: r.x, z: r.z, h: r.heading }; } this._stepT = performance.now(); }

  setQuality(qname) {
    this.quality = qname; const q = QUALITY[qname];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.ratio));
    this.renderer.shadowMap.enabled = q.shadows; this.sun.castShadow = q.shadows;
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }
  setReducedMotion(b) { this.reducedMotion = b; this.controls.enableDamping = !b; }
  setOverlay(name, on) {
    this.overlays[name] = on;
    this.commsGroup.visible = this.overlays.comms;
    this.sensorGroup.visible = this.overlays.sensors;
    this.powerFeed.visible = this.overlays.power; this.powerLinks.visible = this.overlays.power;
    for (const o of this.robotObjs.values()) { o.fan.visible = this.overlays.sensors; o.ray.visible = this.overlays.sensors; }
    this.markers.material.color.set(this.overlays.sensors ? '#ffffff' : '#ffffff');
  }
  setCameraMode(mode) {
    this.mode = mode;
    const c = this.controls;
    if (mode === 'first') {
      c.enabled = false;
      const p = this.fp.pos; this.camera.position.copy(p);
      this._applyFp();
    } else {
      c.enabled = true;
      if (mode === 'overview') { this._tweenTo(new THREE.Vector3(4, 62, 52), new THREE.Vector3(0, 0, -2)); c.maxPolarAngle = Math.PI * 0.42; }
      else { c.maxPolarAngle = Math.PI * 0.49; if (this.camera.position.y > 40) this._tweenTo(new THREE.Vector3(18, 16, 14), new THREE.Vector3(8, 0, 0)); }
    }
  }
  focus(sel) {
    let p = null;
    if (sel.type === 'robot') { const r = this.sim?.robot(sel.id); if (r) p = new THREE.Vector3(r.x, 0.4, r.z); this.followId = sel.id; }
    else { this.followId = null; }
    if (sel.type === 'station') { const s = STATIONS[sel.id]; p = new THREE.Vector3(s.x, 1, s.z - 1); }
    if (sel.type === 'charger') { const s = CHARGERS[sel.id]; p = new THREE.Vector3(s.x, 0.6, s.z); }
    if (sel.type === 'ap') { const s = APS[sel.id]; p = new THREE.Vector3(s.x, 6, s.z); }
    if (sel.type === 'control') p = new THREE.Vector3(-39, 1.5, 14);
    if (sel.type === 'maint') p = new THREE.Vector3(MAINT.x, 0.5, MAINT.z);
    if (sel.type === 'aisle') p = new THREE.Vector3(AISLES[sel.id], 0.5, 3);
    if (sel.type === 'point') p = new THREE.Vector3(sel.x, 0.5, sel.z);
    if (!p) return;
    if (this.mode === 'first' || this.mode === 'overview') { this.mode = 'orbit'; this.controls.enabled = true; this.controls.maxPolarAngle = Math.PI * 0.49; this._modeCb && this._modeCb('orbit'); }
    const dist = sel.type === 'robot' ? 5.5 : sel.type === 'aisle' ? 22 : 9;
    const dir = new THREE.Vector3(0.55, 0.65, 0.75).normalize();
    this._tweenTo(p.clone().add(dir.multiplyScalar(dist)), p);
  }
  onModeChange(cb) { this._modeCb = cb; }
  explode(robotId) { this.exploded = robotId; if (robotId) { this.focus({ type: 'robot', id: robotId }); } }
  _tweenTo(pos, target) {
    if (this.reducedMotion) { this.camera.position.copy(pos); this.controls.target.copy(target); this.controls.update(); this.tween = null; return; }
    this.tween = { t: 0, p0: this.camera.position.clone(), p1: pos, t0: this.controls.target.clone(), t1: target };
  }
  fpMove(key, down) { this.fp.keys[key] = down; }
  _applyFp() { const e = new THREE.Euler(this.fp.pitch, this.fp.yaw, 0, 'YXZ'); this.camera.quaternion.setFromEuler(e); }

  _bindInput() {
    const el = this.renderer.domElement;
    let down = null, dragging = false;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; dragging = false; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragging = true;
      if (this.mode === 'first' && dragging) { this.fp.yaw -= e.movementX * 0.004; this.fp.pitch = Math.max(-1.2, Math.min(1.0, this.fp.pitch - e.movementY * 0.004)); this._applyFp(); }
    });
    el.addEventListener('pointerup', (e) => { if (down && !dragging) this._pick(e); down = null; });
    window.addEventListener('keydown', (e) => { if (this.mode !== 'first' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return; this.fp.keys[e.key.toLowerCase()] = true; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); });
    window.addEventListener('keyup', (e) => { this.fp.keys[e.key.toLowerCase()] = false; });
  }
  _pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      let o = h.object;
      if (this.exploded && o.userData.part && o.userData.part !== 'shell') { this._emitSelect({ type: 'part', id: o.userData.part, robot: this.exploded }); return; }
      while (o && !o.userData.pick) o = o.parent;
      if (o) { this._emitSelect(o.userData.pick); return; }
    }
    // floor hit: focus that point in orbit mode
    const fh = hits.find((h) => h.object.geometry?.type === 'PlaneGeometry' && h.point.y < 0.05);
    if (fh && this.mode === 'orbit') this._tweenTo(this.camera.position.clone().add(fh.point.clone().sub(this.controls.target)), fh.point.clone());
  }

  resize() {
    const w = this.container.clientWidth || 300, h = this.container.clientHeight || 200;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ per-frame update
  render(stepAlpha = 1) {
    const dt = Math.min(0.05, this.clock.getDelta());
    const sim = this.sim;
    if (this.tween) {
      this.tween.t = Math.min(1, this.tween.t + dt / 0.8);
      const k = this.tween.t < 0.5 ? 2 * this.tween.t * this.tween.t : 1 - Math.pow(-2 * this.tween.t + 2, 2) / 2;
      this.camera.position.lerpVectors(this.tween.p0, this.tween.p1, k);
      this.controls.target.lerpVectors(this.tween.t0, this.tween.t1, k);
      if (this.tween.t >= 1) this.tween = null;
    }
    if (this.mode === 'first') {
      const k = this.fp.keys; const sp = (k.shift ? 9 : 4) * dt;
      const fwd = new THREE.Vector3(-Math.sin(this.fp.yaw), 0, -Math.cos(this.fp.yaw)); const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const mv = new THREE.Vector3();
      if (k.w || k.arrowup || k.fwd) mv.add(fwd); if (k.s || k.arrowdown || k.back) mv.sub(fwd);
      if (k.d || k.right) mv.add(right); if (k.a || k.left) mv.sub(right);
      if (k.arrowleft || k.turnl) { this.fp.yaw += 1.6 * dt; this._applyFp(); } if (k.arrowright || k.turnr) { this.fp.yaw -= 1.6 * dt; this._applyFp(); }
      if (mv.lengthSq()) { mv.normalize().multiplyScalar(sp); this.fp.pos.add(mv); this.fp.pos.x = Math.max(-44, Math.min(44, this.fp.pos.x)); this.fp.pos.z = Math.max(-31, Math.min(31, this.fp.pos.z)); }
      this.camera.position.copy(this.fp.pos);
    } else this.controls.update();

    if (sim) this._updateDynamic(stepAlpha, dt);
    this.renderer.render(this.scene, this.camera);
    this._updateLabels();
  }

  _updateDynamic(alpha, dt) {
    const sim = this.sim, s = sim.s;
    const a = this.reducedMotion ? 1 : Math.min(1, alpha);
    this.explodeT += ((this.exploded ? 1 : 0) - this.explodeT) * (this.reducedMotion ? 1 : Math.min(1, dt * 5));
    for (const r of s.robots) {
      const o = this.robotObjs.get(r.id); if (!o) continue;
      const p = o.prev || r, c = o.cur || r;
      const x = p.x + (c.x - p.x) * a, z = p.z + (c.z - p.z) * a;
      o.g.position.set(x, 0, z);
      let dh = c.h - p.h; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
      o.g.rotation.y = p.h + dh * a;
      const vis = robotVisual(sim, r);
      o.ring.material.color.set(vis.color); o.ring.material.emissive.set(vis.color);
      o.ring.material.emissiveIntensity = vis.key === 'stopped' || vis.key === 'estop' ? 1.0 : 0.5;
      o.tote.visible = r.payload === 'tote' && this.explodeT < 0.05;
      const ex = this.exploded === r.id ? this.explodeT : 0;
      o.shellMat.opacity = 1 - 0.78 * ex; o.shellMat.depthWrite = ex < 0.5;
      for (const [name, meshes] of Object.entries(o.parts)) if (name !== 'shell') for (const m of meshes) { m.position.copy(m.userData.home).addScaledVector(m.userData.explode, ex); }
      o.fan.material.color.set(r.loc < 0.6 ? '#E69F00' : '#56B4E9');
      if (this.overlays.sensors) { const L = Math.min(4, r.obstacle); o.ray.scale.z = L; o.ray.position.z = L / 2 + 0.6; o.ray.material.color.set(r.obstacle < 1 ? '#D55E00' : '#56B4E9'); }
    }
    // obstruction
    const ob = s.faults.obstruction;
    this.obstruction.visible = !!ob; if (ob) this.obstruction.position.set(AISLES[ob.aisle] + 0.2, 0, ob.z);
    for (const al of Object.keys(AISLES)) { this.lockoutBars[al].visible = (s.lockouts[al] || 0) > s.t; this.restrictSigns[al].visible = !!s.restricted[al]; }
    // markers damaged
    const md = s.faults.markerDamage; const key = md ? `${md.aisle}${md.zMin}${md.zMax}` : '';
    if (key !== this._markerState) {
      this._markerState = key; const m4 = new THREE.Matrix4(); const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      this.markerPts.forEach((p, i) => { const dmg = md && p.al === md.aisle && p.z >= md.zMin && p.z <= md.zMax; const sc = dmg ? (i % 3 === 0 ? 0.001 : 0.55) : 1; m4.makeTranslation(p.x + 0.7, 0.02, p.z).multiply(rot).multiply(new THREE.Matrix4().makeScale(sc, sc, 1)); this.markers.setMatrixAt(i, m4); this.markers.setColorAt(i, new THREE.Color(dmg ? '#8a8a7a' : '#151515')); });
      this.markers.instanceMatrix.needsUpdate = true; if (this.markers.instanceColor) this.markers.instanceColor.needsUpdate = true;
    }
    // stations
    for (const [id, o] of Object.entries(this.stationObjs)) { const st = s.stations[id]; const level = !st.ready ? 0 : (!s.config.stationRotation[id] ? 1 : 2); o.tiers.forEach((m, i) => { m.material.emissiveIntensity = i === level ? 1.4 : 0.03; }); }
    for (const [id, o] of Object.entries(this.chargerObjs)) { const ch = s.chargers[id]; const rr = ch.occupiedBy ? sim.robot(ch.occupiedBy) : null; const zero = rr && rr.state === 'charging' && rr.chargeA === 0; o.led.material.emissiveIntensity = zero ? 0.05 : rr?.state === 'charging' ? 1.2 : 0.4; o.led.material.color.set(zero ? '#E69F00' : '#56B4E9'); }
    // comms links
    if (this.overlays.comms) {
      this.linkGroup.clear();
      for (const r of s.robots) { const ap = APS[`AP-${{ A: 1, B: 2, C: 3, D: 4, S: 5 }[zoneOf(r.x, r.z)]}`]; const conn = sim.connected(r); const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(r.x, 0.8, r.z), new THREE.Vector3(ap.x, 7.1, ap.z)]); const mat = conn ? new THREE.LineBasicMaterial({ color: '#0072B2', transparent: true, opacity: 0.45 }) : new THREE.LineDashedMaterial({ color: '#CC79A7', dashSize: 0.4, gapSize: 0.3 }); const ln = new THREE.Line(geo, mat); if (!conn) ln.computeLineDistances(); this.linkGroup.add(ln); }
      for (const [id, g] of Object.entries(this.apObjs)) { const deg = s.aps[id].status !== 'up'; g.ring.material.color.set(deg ? '#E69F00' : '#0072B2'); g.edge.material.color.set(deg ? '#E69F00' : '#0072B2'); g.ring.material.opacity = deg ? 0.16 : 0.07; }
    }
    if (this.overlays.power) {
      this.powerLinks.clear();
      for (const ch of Object.values(s.chargers)) { const rr = ch.occupiedBy ? sim.robot(ch.occupiedBy) : null; if (!rr || rr.state !== 'charging') continue; const zero = rr.chargeA === 0; const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ch.x + 0.3, 1.0, ch.z), new THREE.Vector3(rr.x, 0.3, rr.z)]); const mat = zero ? new THREE.LineDashedMaterial({ color: '#D55E00', dashSize: 0.2, gapSize: 0.15 }) : new THREE.LineBasicMaterial({ color: '#E69F00' }); const ln = new THREE.Line(geo, mat); if (zero) ln.computeLineDistances(); this.powerLinks.add(ln); }
    }
    if (this.followId && !this.tween && this.mode === 'orbit') { const r = sim.robot(this.followId); if (r) { const d = new THREE.Vector3(r.x, 0.4, r.z).sub(this.controls.target); if (d.lengthSq() > 0.0001) { this.controls.target.add(d); this.camera.position.add(d); } } }
    // control room dashboard texture (every ~2 s)
    const now = performance.now(); if (!this._dashT || now - this._dashT > 2000) { this._dashT = now; this._drawDash(); }
  }

  _drawDash() {
    const sim = this.sim; const c = this.dashTex.image; const g = c.getContext('2d');
    g.fillStyle = '#0d1b26'; g.fillRect(0, 0, 1024, 576);
    g.fillStyle = '#9fb3c8'; g.font = '600 26px Arial'; g.fillText('FLEET DASHBOARD — SIMULATED', 30, 46); g.fillText(sim.clockStr(), 840, 46);
    const tiles = [['Robot availability', `${Math.round(sim.metric('availability') * 100)}%`], ['Tasks / h (15m)', `${Math.round(sim.metric('tasksPerHour', 900) ?? 0)}`], ['Queue depth', `${sim.queueDepth()}`], ['Oldest task', `${Math.round(sim.oldestOpenAge())} s`], ['Active alarms', `${sim.activeAlarms().length}`], ['Stopped robots', `${sim.metric('faultCount')}`]];
    tiles.forEach(([k, v], i) => { const x = 30 + (i % 3) * 330, y = 80 + Math.floor(i / 3) * 230; g.fillStyle = '#152a3a'; g.fillRect(x, y, 310, 210); g.fillStyle = '#9fb3c8'; g.font = '600 26px Arial'; g.fillText(k, x + 18, y + 44); g.fillStyle = '#ffffff'; g.font = '700 84px Arial'; g.fillText(v, x + 18, y + 150); });
    this.dashTex.needsUpdate = true;
  }

  _updateLabels() {
    const sim = this.sim; if (!sim) return;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3(); const camPos = this.camera.position;
    for (const L of this.labels) {
      let pos;
      if (L.type === 'robot') { const o = this.robotObjs.get(L.id); if (!o) continue; pos = v.set(o.g.position.x, L.offset + (this.exploded === L.id ? 1.2 * this.explodeT : 0), o.g.position.z); }
      else pos = v.copy(L.pos);
      const dist = pos.distanceTo(camPos);
      const p = pos.clone().project(this.camera);
      const hidden = p.z > 1 || p.x < -1.1 || p.x > 1.1 || p.y < -1.1 || p.y > 1.1 || dist > (L.type === 'robot' ? 110 : 90);
      if (hidden) { if (L.el.style.display !== 'none') L.el.style.display = 'none'; continue; }
      if (L.el.style.display === 'none') L.el.style.display = '';
      const x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * h;
      L.el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      L.el.style.zIndex = String(1000 - Math.round(dist));
      const narrow = w < 640;
      if (narrow && L.type === 'fixed') { if (L.el.style.display !== 'none') L.el.style.display = 'none'; continue; }
      const compact = dist > 45 || (narrow && dist > 25);
      let html = L.text ? L.el.innerHTML : '';
      if (L.type === 'robot') {
        const r = sim.robot(L.id); const vis = robotVisual(sim, r);
        const extra = [];
        if (this.overlays.power) extra.push(`🔋${Math.round(r.battery)}%${r.state === 'charging' ? ` ${r.chargeA.toFixed(0)}A` : ''}`);
        if (this.overlays.comms) extra.push(sim.connected(r) ? `📶${r.rssi}dBm` : '📶 LINK LOST');
        if (this.overlays.sensors) extra.push(`loc ${r.loc.toFixed(2)} · obst ${r.obstacle < 6 ? r.obstacle.toFixed(1) + 'm' : 'clear'}`);
        html = `<span class="ic" style="--c:${vis.color}">${vis.icon}</span><b>${r.id}</b>${compact ? '' : ` <span class="st">${vis.label}</span>`}${extra.length && !compact ? `<span class="ex">${extra.join(' · ')}</span>` : ''}`;
        L.el.setAttribute('aria-label', `${r.id}: ${vis.label}, ${vis.detail}`);
        L.el.classList.toggle('sel', this.exploded === r.id || this.followId === r.id);
      } else if (L.type === 'station') {
        const st = sim.s.stations[L.id]; const ss = STATION_STATUS(st, sim.s.config.stationRotation[L.id]);
        html = `<span class="ic" style="--c:${ss.color}">${ss.icon}</span><b>${L.id}</b>${compact ? '' : ` <span class="st">${ss.label}</span>`}`;
        L.el.setAttribute('aria-label', `Station ${L.id}: ${ss.label}`);
      } else if (L.type === 'charger') {
        const ch = sim.s.chargers[L.id]; const rr = ch.occupiedBy ? sim.robot(ch.occupiedBy) : null; const zero = rr && rr.state === 'charging' && rr.chargeA === 0; const maint = ch.status === 'maintenance';
        const lab = maint ? ['🔧', 'MAINT', '#6b6b6b'] : zero ? ['⚠', `0 A → ${rr.id}`, '#E69F00'] : rr?.state === 'charging' ? ['⚡', `${rr.chargeA.toFixed(0)} A → ${rr.id}`, '#56B4E9'] : ['○', 'FREE', '#7a8794'];
        html = `<span class="ic" style="--c:${lab[2]}">${lab[0]}</span><b>${L.id}</b>${compact ? '' : ` <span class="st">${lab[1]}</span>`}`;
      } else if (L.type === 'ap') {
        if (!this.overlays.comms && dist > 30) { L.el.style.display = 'none'; continue; }
        const ap = sim.s.aps[L.id]; const as = AP_STATUS(ap);
        html = `<span class="ic" style="--c:${as.color}">${as.icon}</span><b>${L.id}</b>${compact ? '' : ` <span class="st">${as.label} · zone ${ap.zone}${this.overlays.comms ? ` · retries ${ap.retries}%` : ''}</span>`}`;
      }
      if (html !== L.last && !L.text) { L.el.innerHTML = html; L.last = html; }
    }
  }

  partLabels() { return PART_INFO; }
  dispose() { this._ro?.disconnect(); this.renderer.dispose(); }
}
