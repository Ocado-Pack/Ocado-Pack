// Start page + 4-step onboarding: (1) facility & controls, (2) follow a healthy order,
// (3) introduce the dashboard, (4) launch the first guided incident.
import { esc, fmtDur } from '../util.js';
import { Sim } from '../sim/engine.js';
import { METRICS, fmtMetric } from '../sim/catalog.js';
import { store, dueReviews } from '../store.js';
import { rich, caption, toast, SIM_NOTE } from './common.js';
import { newAttempt } from './investigation.js';

const LIFECYCLE_TEXT = {
  queued: 'The [[task lifecycle]] starts: the order service created the order; the task scheduler planned one task per item.',
  reserving: 'The scheduler asks inventory-service to reserve stock (a request with a [[timeout]]).',
  ready: 'Stock reserved. The task waits for the [[fleet manager]] to pick an available robot.',
  assigned: 'The fleet manager sent the task to a robot and waits for an [[acknowledgment]].',
  acknowledged: 'The robot acknowledged. It is driving to the storage location.',
  picking: 'At the location, the handling mechanism retrieves the tote.',
  to_station: 'Tote on board. The robot drives to its picking station.',
  at_station: 'At the station, a (fictional) operator picks the item from the tote.',
  completed: 'Task completed; with all tasks done, the order is complete.',
};

export function render(root, ctx) {
  const st = store.get();
  const ob = st.onboarding;
  let follow = null; let shown = -1;
  const cur = st.current?.attempt;

  function draw() {
    const due = dueReviews().length;
    root.innerHTML = `
    <div class="card"><span class="eyebrow">Welcome ${SIM_NOTE}</span>
      <h2>Robotics Fleet Response Lab</h2>
      <p>${rich('A beginner-friendly practice environment for supporting an order-fulfillment robot fleet: diagnosing robots, investigating software, building [[observability]] tools, documenting incidents, prioritizing improvements and supporting operations.')}</p>
      <p class="muted small">This is a <b>fictional facility</b>. Robots, telemetry, logs, commands, services and procedures are invented for training. It does not reproduce any company's proprietary systems (including any employer you may be preparing for). Items marked “to verify” must be checked with the real employer. See <a href="#/about">Accuracy &amp; scope</a>.</p>
      ${cur && !cur.done ? `<p><a class="btn primary" href="#/incident">Continue active incident</a> <span class="muted small">(saved locally)</span></p>` : ''}
      ${due ? `<p><a class="btn" href="#/review">${due} review item(s) due</a></p>` : ''}
    </div>
    <div class="card"><h3>Onboarding (≈ 10 minutes)</h3>
      <ol class="stepcards" style="list-style:none;padding:0">
        ${['Explore the warehouse & controls', 'Follow one healthy order', 'Meet the dashboard', 'First guided incident'].map((t, i) => `<li class="tile ${ob.step === i ? 'click' : ''}" ${ob.step > i ? 'style="opacity:.75"' : ''}><b>${ob.step > i ? '✓' : i + 1}. ${t}</b><br><button class="btn small" data-step="${i}">${ob.step > i ? 'Revisit' : ob.step === i ? 'Start' : 'Open'}</button></li>`).join('')}
      </ol>
      <div id="ob"></div>
    </div>
    <div class="card"><h3>Walkthroughs (15–25 min each)</h3>
      <div class="grid2">
        ${[['#/w1', '1 · Robot hardware & fleet diagnosis', 'Component tour, exploded views, 5 incidents; individual vs shared faults.'], ['#/w2', '2 · Software debugging', 'Log console, order tracing, correlation IDs, releases, sandbox; 6 incidents.'], ['#/w3', '3 · Build an observability tool', 'Metrics/logs/traces, dashboard builder, view builder, alert tuning.'], ['#/w4', '4 · Documentation & handoff', 'Incident notebook, runbook builder, engineering collaboration, unknown-cause recovery.'], ['#/w5', '5 · Data-driven prioritization', 'Historical incidents, Pareto, transparent scoring, before/after comparison.'], ['#/w6', '6 · Live operations support', 'Timed incident with distractions, updates and escalation. Optional 40-min capstone.'], ['#/exercises', 'Reverse-building exercises', 'Build maps, dashboards, step orders, runbooks and telemetry choices from a goal.'], ['#/review', 'Spaced review', 'Exercises generated from your own mistakes.']].map(([h, t, d]) => `<a class="tile click" href="${h}" style="text-decoration:none;color:inherit"><b>${t}</b><br><span class="small muted">${d}</span>${st.walkthroughs[h.slice(2).toUpperCase()]?.done ? ' <span class="pill ok">✓ done</span>' : ''}</a>`).join('')}
      </div>
    </div>
    <div class="card"><h3>Free play</h3><p>Reset the simulation to a healthy fleet to explore without an incident.</p><button class="btn" data-healthy>Reset to healthy fleet</button></div>`;
    if (ob.step < 4) drawStep(ob.step); else root.querySelector('#ob').innerHTML = '<p class="ok">✓ Onboarding complete. Revisit any step above.</p>';
  }

  function drawStep(i) {
    shown = i;
    const el = root.querySelector('#ob');
    const sim = ctx.sim;
    if (i === 0) {
      el.innerHTML = `<div class="lesson"><h4>1. The fictional warehouse</h4>
        <p>${rich('Twelve mobile robots (R-01…R-12) fetch totes from four storage aisles (A–D) and bring them to four picking stations (P-1…P-4). Chargers C-1…C-4 are on the east side; the maintenance bay and control room are on the west. Five Wi-Fi [[access point]]s (AP-1…AP-5) create network zones. Green walkways are for people; the hatched yellow boundary marks the robot operating area — people do not enter it while robots are active.')}</p>
        <div class="btnrow">${[['aisle:C', 'Aisle C'], ['station:P-3', 'Station P-3'], ['charger:C-2', 'Charger C-2'], ['maint:bay', 'Maintenance bay'], ['control:control-room', 'Control room'], ['ap:AP-3', 'Access point AP-3'], ['robot:R-07', 'Robot R-07']].map(([v, l]) => `<button class="btn small" data-tour="${v}">${l}</button>`).join('')}</div>
        <p><b>Controls:</b> 🗺 Overview, 🔄 Orbit (drag to rotate, scroll/pinch to zoom, right-drag/two-finger to pan), 🚶 First-person (drag to look; W/A/S/D or arrows, or the on-screen pad). Click any robot or label to focus it — or use the <i>Focus</i> list. Keyboard: O / R / F switch camera, P pauses. The simulation clock and speed are at the top.</p>
        <p>${rich('Overlays: 🔋 power, 📶 communications, 📡 sensors and 🧩 software dependencies show real relationships in the simulation (not decoration). Select a robot and press 💥 to see an exploded view of its components.')}</p>
        <p class="muted small">Status is always icon + text (e.g. ✕ STOPPED), never color alone. Captions appear at the bottom of the 3D view; narration can be turned on in Settings.</p>
        <button class="btn primary" data-done="0">Next: follow a healthy order</button></div>`;
    } else if (i === 1) {
      const tk = follow ? sim.s.tasks[follow.task] : null;
      const order = follow ? sim.s.orders[follow.order] : null;
      el.innerHTML = `<div class="lesson"><h4>2. Follow one healthy order</h4>
        <p>${rich('Every order flows through: order service → task scheduler → fleet manager → robot → picking station → order completion. Watch the [[task lifecycle]] below; the camera follows the robot.')}</p>
        ${!follow ? '<button class="btn primary" data-follow>Create an order and follow it</button>' : `<p><b>Order ${order.id}</b> (correlation ID <code>${order.corr}</code>) · task ${tk.id}: ${tk.sku} at ${tk.loc} → ${tk.station}</p>
          <ol class="timeline">${tk.history.map((h) => `<li><b>${sim.clockStr(h.t)}</b> ${esc(h.state)} — ${esc(h.note)}<br><span class="small">${rich(LIFECYCLE_TEXT[h.state] || '')}</span></li>`).join('')}</ol>
          <p class="muted small">Elapsed ${fmtDur(sim.s.t - order.createdAt)}. Tip: use 5× speed.</p>
          ${order.state === 'completed' ? `<p class="ok">✓ Order completed in ${fmtDur(order.doneAt - order.createdAt)}. Each step above also produced log lines with the same [[correlation ID]] — you will use that in Walkthrough 2.</p><button class="btn primary" data-done="1">Next: the dashboard</button>` : ''}`}</div>`;
    } else if (i === 2) {
      const ms = METRICS.filter((m) => ['availability', 'tasksPerHour', 'successRate', 'orderLatency', 'queueDepth', 'oldestAge'].includes(m.id));
      el.innerHTML = `<div class="lesson"><h4>3. Meet the dashboard</h4>
        <p>${rich('A [[metric]] is a number measured over time. Each tile states its definition, unit, time window and data source. "No data" is different from zero.')}</p>
        <div class="grid2">${ms.map((m) => { const v = sim.metric(m.id, 900); return `<div class="tile"><span class="small muted">${esc(m.label)}</span><div class="val ${v == null ? 'nodata' : ''}">${fmtMetric(m, v)}</div><p class="small">${esc(m.def)}<br><b>Unit:</b> ${esc(m.unit)} · <b>Window:</b> ${esc(m.window)}<br><b>Source:</b> ${esc(m.source)}</p></div>`; }).join('')}
        <div class="tile"><span class="small muted">Network disconnects — zone A vs zone D (15 min)</span><div class="val">A: ${sim.metric('disconnects', 900, { zone: 'A' })} · D: <span class="nodata">No data</span></div><p class="small">Zone A shows a <b>true zero</b> (measured, none happened). Zone D shows <b>No data</b>: its exporter is not deployed, so we do not know.</p></div></div>
        <button class="btn primary" data-done="2">Next: first guided incident</button></div>`;
    } else if (i === 3) {
      el.innerHTML = `<div class="lesson"><h4>4. Your first guided incident</h4>
        <p>📻 Operations: <i>“Robot R-07 stopped completing tasks near Aisle C.”</i></p>
        <p>${rich('You will investigate whether it is an obstruction, a [[localization]] issue, a network problem, or a software/task-state issue. One cause is chosen at random for each attempt and stays hidden until you have diagnosed and verified. Each step follows: Observe → Predict → Inspect → Test → Interpret → Act → Verify → Document → Review.')}</p>
        <label>Mode <select id="m1"><option value="guided">Guided — step-by-step coaching</option><option value="assisted">Assisted — objectives + optional hints</option><option value="assessment">Assessment — independent, feedback at end</option></select></label>
        <button class="btn primary" data-launch>Launch incident (≈ 20 min)</button></div>`;
    }
  }

  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.step) { drawStep(+b.dataset.step); return; }
    if (b.dataset.tour) { const [type, id] = b.dataset.tour.split(':'); ctx.scene?.focus({ type, id }); caption({ 'aisle': `Aisle ${id}: storage racks on both sides; each location has a label like ${id}-07. Robots drive down the centre.`, 'station': `Picking station ${id}: robots queue on the robot side; a fictional operator works behind the barrier. The light tower and label show readiness.`, 'charger': `Charger ${id}: robots dock on the floor plate; contacts under the robot touch it.`, 'maint': 'Maintenance bay: robots are recovered here by technicians under a lockout procedure (simulated).', 'control': 'Control room: screens show the same simulated fleet dashboards you will build in Walkthrough 3.', 'ap': `Access point ${id}: a ceiling Wi-Fi radio. Turn on the 📶 Comms overlay to see its coverage zone.`, 'robot': `Robot ${id}. Press 💥 Explode robot to see its components.` }[type] || ''); if (type === 'robot') ctx.selected = { type, id }; document.getElementById('explodeBtn').disabled = type !== 'robot'; return; }
    if (b.dataset.done) { store.update((s) => { s.onboarding.step = Math.max(s.onboarding.step, +b.dataset.done + 1); }); draw(); return; }
    if (b.dataset.follow !== undefined) {
      if (ctx.sim.__attemptId) { ctx.healthy(); toast('Switched to a healthy free-play simulation for onboarding. Your incident is saved.'); }
      const sim = ctx.sim; const loc = 'B-07';
      const o = sim.createOrder([sim.s.inventory[loc].sku], { loc, station: 'P-2' });
      follow = { order: o.id, task: o.tasks[0] }; ctx.setSpeed(5); drawStep(1); caption(`Order ${o.id} created. Watch the task move through its lifecycle.`); return;
    }
    if (b.dataset.launch !== undefined) { const mode = root.querySelector('#m1').value; store.update((s) => { s.settings.mode = mode; s.onboarding.step = Math.max(s.onboarding.step, 3); }); newAttempt(ctx, 'r07', { mode }); ctx.setSpeed(1); location.hash = '#/incident'; return; }
    if (b.dataset.healthy !== undefined) { if (ctx.sim.__attemptId && !confirm('Leave the active incident view? Your incident stays saved and can be resumed.')) return; ctx.healthy(); toast('Healthy fleet loaded.'); }
  };
  draw();
  return {
    refresh() {
      if (follow) {
        const tk = ctx.sim.s.tasks[follow.task];
        if (tk?.robot && !follow.focused) { follow.focused = true; ctx.scene?.focus({ type: 'robot', id: tk.robot }); }
        if (shown === 1) drawStep(1);
      }
    },
  };
}
