// App shell: simulation loop, 3D scene, routing, inspector, overlays, settings.
import { Sim, SERVICES, STATIONS, CHARGERS, APS, AISLES, zoneOf } from './sim/engine.js';
import { robotVisual } from './sim/visual.js';
import { COMPONENTS } from './sim/catalog.js';
import { store, dueReviews } from './store.js';
import { esc, fmtDur, round } from './util.js';
import { caption, refreshCaption, markViewStart, rich, toast } from './ui/common.js';
import { PART_INFO } from './scene/warehouse.js';

const ROUTES = {
  home: () => import('./ui/home.js'),
  incident: () => import('./ui/incident-page.js'),
  w1: () => import('./ui/w1.js'),
  w2: () => import('./ui/w2.js'),
  w3: () => import('./ui/w3.js'),
  w4: () => import('./ui/w4.js'),
  w5: () => import('./ui/w5.js'),
  w6: () => import('./ui/w6.js'),
  exercises: () => import('./ui/exercises.js'),
  comms: () => import('./ui/comms-hub.js'),
  'comms-run': () => import('./ui/comms-run.js'),
  'comms-worked': () => import('./ui/comms-worked.js'),
  'comms-interview': () => import('./ui/comms-interview.js'),
  kb: () => import('./ui/comms-kb.js'),
  portfolio: () => import('./ui/portfolio.js'),
  review: () => import('./ui/review.js'),
  progress: () => import('./ui/progress.js'),
  interview: () => import('./ui/interview-page.js'),
  glossary: () => import('./ui/pages.js').then((m) => ({ render: m.renderGlossary })),
  about: () => import('./ui/pages.js').then((m) => ({ render: m.renderAbout })),
  settings: () => import('./ui/pages.js').then((m) => ({ render: m.renderSettings })),
  packs: () => import('./ui/pages.js').then((m) => ({ render: m.renderPacks })),
};

const panel = document.getElementById('panel');
const ctx = {
  sim: null, scene: null, speed: 1, selected: null, addEvidence: null,
  setSim(sim) { this.sim = sim; this.scene?.setSim(sim); acc = 0; updateFocusList(); },
  fastForward(sec) { const n = Math.round(sec / 0.5); for (let i = 0; i < n; i++) { this.sim._step(0.5); } this.scene?.captureStep(); this.scene?.captureStep(); this.sim.emit('tick'); refreshAll(true); },
  setSpeed(v) { this.speed = v; document.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.speed === v))); },
  go(h) { location.hash = h; },
  healthy() { const s = new Sim({ seed: Date.now() % 100000 }); s.run(300); this.setSim(s); return s; },
};
window.__rfrl = ctx; // for debugging in devtools

// ------------------------------------------------------------------ settings application
function applySettings() {
  const st = store.get().settings;
  document.documentElement.style.setProperty('--text-scale', st.textScale);
  document.body.classList.toggle('hc', !!st.highContrast);
  document.body.classList.toggle('reduced-motion', !!st.reducedMotion);
  document.getElementById('modeSel').value = st.mode;
  if (ctx.scene) { ctx.scene.setReducedMotion(!!st.reducedMotion); const q = resolveQuality(st.quality); if (q !== ctx.scene.quality) ctx.scene.setQuality(q); }
  refreshCaption();
}
function resolveQuality(q) {
  if (q !== 'auto') return q;
  const dpr = window.devicePixelRatio || 1; const w = window.innerWidth;
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  if (mobile) return 'low';
  if (dpr >= 2 && w >= 1800) return 'high';
  return 'medium';
}
store.subscribe(() => { updateDueBadge(); });
function updateDueBadge() { const n = dueReviews().length; const b = document.getElementById('dueBadge'); b.hidden = !n; b.textContent = n; }

// ------------------------------------------------------------------ scene
async function initScene() {
  try {
    const { Warehouse } = await import('./scene/warehouse.js');
    const st = store.get().settings;
    ctx.scene = new Warehouse(document.getElementById('viewport'), { quality: resolveQuality(st.quality), reducedMotion: st.reducedMotion });
    ctx.scene.setSim(ctx.sim);
    ctx.scene.onSelect(onSelect);
    ctx.scene.onModeChange((m) => setCamButtons(m));
  } catch (e) {
    console.error(e);
    document.getElementById('webglFallback').hidden = false;
  }
}
function setCamButtons(m) { document.querySelectorAll('[data-cam]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cam === m))); document.getElementById('fpPad').hidden = m !== 'first'; }

// ------------------------------------------------------------------ inspector
function onSelect(sel) {
  ctx.selected = sel;
  if (sel.type === 'part') return showPart(sel.id, sel.robot);
  document.getElementById('explodeBtn').disabled = sel.type !== 'robot';
  ctx.scene?.focus(sel);
  drawInspector();
  caption(sel.type === 'robot' ? `${sel.id} selected. Use "Explode robot" to see its components.` : `${sel.id || sel.type} selected.`, { speak: false });
}
function showPart(partId, robotId) {
  const comp = COMPONENTS.find((c) => c.id === PART_INFO[partId]); if (!comp) return;
  const r = ctx.sim.robot(robotId);
  const ins = document.getElementById('inspector'); ins.hidden = false;
  ins.innerHTML = `<div class="ins-h"><b>${esc(comp.name)}</b> · ${esc(robotId)} <button class="x" aria-label="Close inspector">✕</button></div>
   <p>${rich(comp.purpose)}</p><p><b>Normal:</b> ${rich(comp.normal)}</p><p><b>Common failure symptoms:</b> ${comp.failures.map(esc).join('; ')}</p>
   <table class="kv">${comp.telemetry(ctx.sim, r).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
   <p class="muted small"><b>General concept:</b> ${esc(comp.general)}<br><b>To verify with employer:</b> ${esc(comp.verify)}</p>`;
  ins.querySelector('.x').onclick = () => { ins.hidden = true; };
}
function drawInspector() {
  const sel = ctx.selected; const ins = document.getElementById('inspector'); const sim = ctx.sim;
  if (!sel || sel.type === 'part' || !sim) return;
  let html = '';
  if (sel.type === 'robot') {
    const r = sim.robot(sel.id); const v = robotVisual(sim, r); const tk = r.taskId ? sim.s.tasks[r.taskId] : null;
    html = `<div class="ins-h"><span class="ic" style="--c:${v.color}">${v.icon}</span> <b>${r.id}</b> ${v.label} <button class="x" aria-label="Close inspector">✕</button></div>
      <table class="kv"><tr><th>State</th><td>${esc(r.state.replace(/_/g, ' '))}</td></tr><tr><th>Zone</th><td>${zoneOf(r.x, r.z)} (x ${round(r.x, 1)}, z ${round(r.z, 1)})</td></tr><tr><th>Battery</th><td>${round(r.battery, 0)}%${r.state === 'charging' ? ` · ${round(r.chargeA, 1)} A` : ''}</td></tr><tr><th>Task</th><td>${tk ? `${tk.id} → ${tk.loc} → ${tk.station} (${tk.state})` : 'none'}</td></tr><tr><th>Link</th><td>${sim.connected(r) ? `connected · ${r.rssi} dBm` : 'LOST'}</td></tr><tr><th>Payload</th><td>${r.payload === 'tote' ? 'LOADED' : 'EMPTY'}</td></tr></table>
      <p class="muted small">Simulated telemetry. Click parts in the exploded view for component cards.</p>`;
  } else if (sel.type === 'station') {
    const st = sim.s.stations[sel.id];
    html = `<div class="ins-h"><b>Station ${sel.id}</b> <button class="x" aria-label="Close inspector">✕</button></div><table class="kv"><tr><th>station-service</th><td>${st.ready ? '✓ READY' : '✕ UNAVAILABLE — ' + esc(st.reason)}</td></tr><tr><th>In rotation</th><td>${sim.s.config.stationRotation[sel.id] ? 'yes' : 'no'}</td></tr><tr><th>Totes served</th><td>${st.served}</td></tr><tr><th>Robots waiting</th><td>${sim.s.robots.filter((r) => r.state === 'waiting_station' && sim.s.tasks[r.taskId]?.station === sel.id).map((r) => r.id).join(', ') || 'none'}</td></tr></table><p class="muted small">Light tower: top = stopped, middle = out of rotation, bottom = ready (plus text label).</p>`;
  } else if (sel.type === 'charger') {
    const c = sim.s.chargers[sel.id]; const r = c.occupiedBy ? sim.robot(c.occupiedBy) : null;
    html = `<div class="ins-h"><b>Charger ${sel.id}</b> <button class="x" aria-label="Close inspector">✕</button></div><table class="kv"><tr><th>Status</th><td>${esc(c.status)}</td></tr><tr><th>Occupied by</th><td>${r ? r.id + ' (' + r.state + ')' : 'free'}</td></tr><tr><th>Output</th><td>${r?.state === 'charging' ? round(r.chargeA, 1) + ' A' : '—'}</td></tr></table>`;
  } else if (sel.type === 'ap') {
    const ap = sim.s.aps[sel.id]; const d = sim.metric('disconnects', 900, { zone: ap.zone });
    html = `<div class="ins-h"><b>${sel.id}</b> (zone ${ap.zone}) <button class="x" aria-label="Close inspector">✕</button></div><table class="kv"><tr><th>Status</th><td>${ap.status === 'up' ? '✓ up' : '⚠ degraded'}</td></tr><tr><th>Retry rate</th><td>${ap.retries}%</td></tr><tr><th>Channel utilization</th><td>${ap.channelUtil}%</td></tr><tr><th>Clients</th><td>${ap.clients}</td></tr><tr><th>Disconnects (15 min)</th><td>${d == null ? 'NO DATA (exporter not deployed)' : d}</td></tr></table>`;
  } else if (sel.type === 'control') {
    html = `<div class="ins-h"><b>Control room</b> <button class="x" aria-label="Close inspector">✕</button></div><p>The fleet dashboards on these screens show the same simulated metrics as Walkthrough 3. <a href="#/w3">Open the dashboard builder</a>.</p>`;
  }
  ins.hidden = !html; ins.innerHTML = html;
  ins.querySelector('.x')?.addEventListener('click', () => { ins.hidden = true; ctx.selected = null; });
}

// ------------------------------------------------------------------ focus list (accessible click-to-focus)
function updateFocusList() {
  const sel = document.getElementById('focusSel'); if (!ctx.sim) return;
  sel.innerHTML = `<option value="">Choose…</option><optgroup label="Robots">${ctx.sim.s.robots.map((r) => `<option value="robot:${r.id}">${r.id}</option>`).join('')}</optgroup><optgroup label="Areas">${Object.keys(AISLES).map((a) => `<option value="aisle:${a}">Aisle ${a}</option>`).join('')}<option value="maint:bay">Maintenance bay</option><option value="control:control-room">Control room</option></optgroup><optgroup label="Stations">${Object.keys(STATIONS).map((s) => `<option value="station:${s}">${s}</option>`).join('')}</optgroup><optgroup label="Chargers">${Object.keys(CHARGERS).map((s) => `<option value="charger:${s}">${s}</option>`).join('')}</optgroup><optgroup label="Access points">${Object.keys(APS).map((s) => `<option value="ap:${s}">${s}</option>`).join('')}</optgroup>`;
}
document.getElementById('focusSel').onchange = (e) => { const [type, id] = e.target.value.split(':'); if (type) onSelect({ type, id }); e.target.value = ''; };

// ------------------------------------------------------------------ software dependency overlay
function drawDeps() {
  const el = document.getElementById('depOverlay'); if (el.hidden || !ctx.sim) return;
  const s = ctx.sim; const st = (n) => s.serviceStatus(n);
  const icon = (x) => x === 'healthy' ? '✓' : x === 'restarting' ? '↻' : x === 'warning' ? '⚠' : '✕';
  const box = (n, x, y, w = 132) => { const v = st(n); return `<g transform="translate(${x},${y})"><rect width="${w}" height="38" rx="6" class="dep ${v}"/><text x="8" y="16" class="dn">${icon(v)} ${n}</text><text x="8" y="31" class="ds">${v} · v${s.s.services[n].version}</text></g>`; };
  const avail = s.s.robots.filter((r) => s.robotAvailable(r)).length; const ready = Object.values(s.s.stations).filter((x) => x.ready).length;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="arr" marker-end="url(#ah)"/>`;
  el.innerHTML = `<svg viewBox="0 0 470 210" role="img" aria-label="Software dependency map with live health"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" class="arrh"/></marker></defs>
    ${box('order-service', 4, 4)}${arrow(136, 23, 162, 23)}${box('task-scheduler', 164, 4)}${arrow(296, 18, 322, 12)}${box('inventory-service', 324, 0, 142)}${arrow(296, 30, 322, 52)}${box('station-service', 324, 42, 142)}
    ${arrow(230, 42, 230, 70)}${box('fleet-manager', 164, 72)}${arrow(230, 110, 230, 128)}${box('robot-gateway', 164, 130)}${arrow(230, 168, 230, 176)}
    <g transform="translate(110,176)"><rect width="240" height="30" rx="6" class="dep ${avail >= 10 ? 'healthy' : avail >= 7 ? 'warning' : 'degraded'}"/><text x="8" y="20" class="dn">Robots: ${avail}/12 available · Stations: ${ready}/4 ready</text></g></svg>
    <p class="muted small">Simulated services. Arrows = "calls / depends on". Status from live error rate and latency.</p>`;
}

// ------------------------------------------------------------------ legend
document.getElementById('legend').innerHTML = `<details><summary>Status legend</summary><ul>${[['▶', 'WORKING'], ['■', 'IDLE'], ['⏸', 'WAITING'], ['⚡', 'CHARGING'], ['⚠', 'NOT CHARGING'], ['✕', 'STOPPED'], ['⊘', 'NO LINK'], ['⛔', 'E-STOP'], ['⊗', 'ISOLATED'], ['🔧', 'MAINTENANCE']].map(([i, l]) => `<li><span class="ic">${i}</span> ${l}</li>`).join('')}</ul><p class="small">Status is shown by icon + text, never color alone.</p></details>`;

// ------------------------------------------------------------------ routing
let current = null, currentName = '';
async function route() {
  const name = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const key = ROUTES[name] ? name : 'home';
  current?.unmount?.();
  currentName = key;
  document.querySelectorAll('.tabs a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#/${key}` ? 'page' : 'false'));
  markViewStart();
  for (const k of ['onclick', 'onchange', 'oninput', 'onsubmit', 'onkeydown']) panel[k] = null; // the panel element is shared by all pages
  panel.innerHTML = '<p class="muted">Loading…</p>';
  try { const mod = await ROUTES[key](); current = (await mod.render(panel, ctx)) || {}; }
  catch (e) { console.error(e); panel.innerHTML = `<div class="card"><h2>Something went wrong</h2><pre>${esc(e.stack || e.message)}</pre></div>`; }
  panel.focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);

// ------------------------------------------------------------------ loop
let acc = 0, last = performance.now(), uiT = 0;
function refreshAll(force) {
  if (!ctx.sim) return;
  document.getElementById('simclock').textContent = ctx.sim.clockStr();
  drawInspector(); drawDeps();
  current?.refresh?.(force);
}
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (ctx.sim && ctx.speed > 0) {
    acc += dt * ctx.speed; let n = 0;
    while (acc >= 0.5 && n < 80) { ctx.sim._step(0.5); ctx.scene?.captureStep(); acc -= 0.5; n++; }
    if (n === 80) acc = 0;
  }
  ctx.scene?.render(ctx.speed > 0 ? acc / 0.5 : 1);
  uiT += dt; if (uiT > 0.5) { uiT = 0; refreshAll(false); }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ controls
document.querySelector('.speed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.speed != null) ctx.setSpeed(+b.dataset.speed); if (b.dataset.skip) { ctx.fastForward(+b.dataset.skip); toast(`Skipped ahead ${+b.dataset.skip / 60} min of facility time.`); } });
document.getElementById('modeSel').onchange = (e) => { store.update((st) => { st.settings.mode = e.target.value; }); toast(`Mode for new incidents: ${e.target.value}`); };
document.querySelector('.vtools').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.cam) { ctx.scene?.setCameraMode(b.dataset.cam); setCamButtons(b.dataset.cam); caption(b.dataset.cam === 'first' ? 'First-person: drag to look, W/A/S/D or arrow keys (or the on-screen pad) to move, Shift to go faster. You are on the pedestrian walkway.' : b.dataset.cam === 'orbit' ? 'Orbit: drag to rotate, scroll/pinch to zoom, right-drag to pan. Click equipment to focus it.' : 'Overview of the whole simulated facility.'); }
  if (b.dataset.ov) { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); if (b.dataset.ov === 'software') { document.getElementById('depOverlay').hidden = !on; drawDeps(); } else ctx.scene?.setOverlay(b.dataset.ov, on); }
  if (b.id === 'explodeBtn' && ctx.selected?.type === 'robot') { const on = ctx.scene.exploded !== ctx.selected.id; ctx.scene.explode(on ? ctx.selected.id : null); b.setAttribute('aria-pressed', String(on)); caption(on ? `Exploded view of ${ctx.selected.id}. Click a part (or its label) to read what it does and its live telemetry.` : 'Exploded view closed.'); if (on) drawPartLabels(); }
});
function drawPartLabels() {
  const ins = document.getElementById('inspector'); ins.hidden = false;
  ins.innerHTML = `<div class="ins-h"><b>${ctx.selected.id} components</b> <button class="x" aria-label="Close">✕</button></div><div class="partlist">${COMPONENTS.map((c) => `<button class="btn small" data-part="${Object.entries(PART_INFO).find(([, v]) => v === c.id)[0]}">${esc(c.name)}</button>`).join('')}</div><p class="muted small">Simplified, fictional robot. Parts move apart so you can see them; click one.</p>`;
  ins.querySelector('.x').onclick = () => { ins.hidden = true; };
  ins.querySelectorAll('[data-part]').forEach((b) => b.onclick = () => showPart(b.dataset.part, ctx.selected.id));
}
document.getElementById('fpPad').addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-fp]'); if (b) ctx.scene?.fpMove(b.dataset.fp, true); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => document.getElementById('fpPad').addEventListener(ev, (e) => { const b = e.target.closest('[data-fp]'); if (b) ctx.scene?.fpMove(b.dataset.fp, false); }));
document.getElementById('layoutBtn').onclick = () => { const L = document.getElementById('layout'); const modes = ['', 'wide3d', 'widepanel']; const i = (modes.indexOf(L.dataset.mode || '') + 1) % 3; L.dataset.mode = modes[i]; setTimeout(() => ctx.scene?.resize(), 50); };
window.addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (ctx.scene?.mode === 'first' && 'wasd'.includes(e.key.toLowerCase())) return;
  const k = e.key.toLowerCase();
  if (k === 'o') { ctx.scene?.setCameraMode('overview'); setCamButtons('overview'); }
  if (k === 'r') { ctx.scene?.setCameraMode('orbit'); setCamButtons('orbit'); }
  if (k === 'f') { ctx.scene?.setCameraMode('first'); setCamButtons('first'); }
  if (k === 'p') ctx.setSpeed(ctx.speed ? 0 : 1);
});
window.addEventListener('settings-changed', applySettings);

// ------------------------------------------------------------------ boot
(async function boot() {
  const cur = store.get().current;
  if (!cur) ctx.healthy(); else { const s = new Sim({ seed: 1 }); ctx.sim = s; }
  applySettings();
  ctx.setSpeed(1);
  await initScene();
  if (cur) { const { resumeAttempt } = await import('./ui/investigation.js'); try { if (cur.attempt?.scenarioId) resumeAttempt(ctx); else ctx.healthy(); } catch (e) { console.error(e); ctx.healthy(); } }
  updateFocusList(); updateDueBadge();
  if (!location.hash) location.hash = '#/home';
  route();
  requestAnimationFrame(frame);
})();
export { ctx };
void SERVICES; void fmtDur;
