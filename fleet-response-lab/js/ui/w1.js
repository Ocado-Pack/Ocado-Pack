// Walkthrough 1 — Robot hardware & fleet diagnosis (SIMULATED).
import { esc, fmtDur } from '../util.js';
import { COMPONENTS, DIAGNOSTICS } from '../sim/catalog.js';
import { SCENARIOS } from '../sim/scenarios.js';
import { store } from '../store.js';
import { rich, predictionForm, evidenceTable, caption, toast, SIM_NOTE } from './common.js';
import { newAttempt } from './investigation.js';

export function scenarioList(ctx, filter) {
  const st = store.get();
  const packs = st.settings.packs || {};
  return `<div class="grid2">${SCENARIOS.filter(filter).filter((sc) => packs[sc.pack] !== false).map((sc) => { const att = st.attempts.filter((a) => a.scenarioId === sc.id); const best = att.length ? Math.max(...att.map((a) => a.total)) : null; return `<div class="tile"><b>${esc(sc.title)}</b><p class="small">${esc(sc.brief)}</p><p class="small muted">≈ ${sc.minutes} min · ${sc.variants.length > 1 ? `${sc.variants.length} possible hidden causes` : 'one hidden cause, several plausible ones'}${best != null ? ` · best ${best}/100 (${att.length} attempt${att.length > 1 ? 's' : ''})` : ''}</p><button class="btn small primary" data-scenario="${sc.id}">Start</button></div>`; }).join('')}</div>`;
}
export function bindScenarioStart(root, ctx) {
  if (root.__scenarioBound) return; root.__scenarioBound = true; // panel element persists across pages: bind once
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-scenario]'); if (!b) return; const cur = store.get().current?.attempt; if (cur && !cur.done && !confirm('Start a new incident? Your current unfinished incident will be replaced.')) return; newAttempt(ctx, b.dataset.scenario, { mode: store.get().settings.mode }); ctx.setSpeed(1); location.hash = '#/incident'; });
}

export function render(root, ctx) {
  let robotId = 'R-01'; let follow = null;
  const draw = () => {
    const sim = ctx.sim; const r = sim.robot(robotId);
    root.innerHTML = `
    <div class="card"><span class="eyebrow">Walkthrough 1 ${SIM_NOTE}</span><h2>Robot hardware & fleet diagnosis</h2>
      <p>${rich('Goal: understand what each part of a (fictional) mobile robot does, what normal looks like, and how to tell an individual robot fault from a shared infrastructure or software problem.')}</p>
      <div class="lesson"><b>The key question:</b> ${rich('does the [[symptom]] follow the ROBOT (individual fault), the PLACE (environment or shared infrastructure), or the SOFTWARE RECORD? Compare with neighbours, change one variable at a time, and look at grouped data before acting.')}</div>
      <p class="safety">⚠ All physical interventions are simulated and performed by fictional, authorized staff. In a real facility: follow employer-approved procedures, never bypass interlocks or protective devices, never enter an active robot area, never work on energized equipment. Site-specific procedures are “to verify”.</p></div>

    <div class="card"><h3>A. Healthy robot & a normal fulfillment cycle</h3>
      ${sim.__attemptId ? '<p class="warn">An incident simulation is loaded. <button class="btn small" data-healthy>Switch to a healthy fleet for this tour</button> (your incident stays saved).</p>' : ''}
      <label>Robot <select id="rsel">${sim.s.robots.map((x) => `<option ${x.id === robotId ? 'selected' : ''}>${x.id}</option>`).join('')}</select></label>
      <div class="btnrow"><button class="btn" data-focusr>Focus in 3D</button><button class="btn" data-explode>💥 Exploded component view</button><button class="btn" data-cycle>Run a normal cycle (test task)</button></div>
      <div id="cycle">${follow ? cycleHtml(sim) : ''}</div>
      <div class="grid2" id="comps">${COMPONENTS.map((c) => compCard(c, sim, r)).join('')}</div>
    </div>

    <div class="card"><h3>B. Incidents</h3>
      <p>${rich('Each incident hides one cause (chosen per attempt). Several include a “predict the fleet impact” exercise before you isolate a robot or reroute work.')}</p>
      ${scenarioList(ctx, (s) => s.walkthrough === 'W1' || s.walkthrough === 'first')}
    </div>`;
  };
  function cycleHtml(sim) {
    const tk = sim.s.tasks[follow]; if (!tk) return '';
    return `<div class="lesson"><b>Test task ${tk.id}</b> (${tk.loc} → ${tk.station}) — state <b>${esc(tk.state)}</b>, age ${fmtDur(sim.s.t - tk.createdAt)}<ol class="small">${tk.history.map((h) => `<li>${sim.clockStr(h.t)} ${esc(h.state)} — ${esc(h.note)}</li>`).join('')}</ol>${tk.state === 'completed' ? '<p class="ok">✓ Normal cycle complete: reserve → assign → ack → travel → pick → deliver. Watch how the telemetry cards changed while it drove.</p>' : '<p class="muted small">Watch the encoder counts, motor currents and payload sensor update below.</p>'}</div>`;
  }
  function compCard(c, sim, r) {
    return `<div class="tile" id="cc-${c.id}"><b>${esc(c.name)}</b>
      <p class="small">${rich(c.purpose)}</p>
      <details><summary class="small">Normal behaviour · failure symptoms</summary><p class="small"><b>Normal:</b> ${rich(c.normal)}</p><p class="small"><b>Common failures:</b> ${c.failures.map(esc).join('; ')}</p></details>
      <table class="kv small" data-tel="${c.id}">${c.telemetry(sim, r).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
      <div class="small">Simulated checks: ${c.checks.map((d) => DIAGNOSTICS[d] ? `<button class="btn small" data-chk="${d}" data-comp="${c.id}">${esc(DIAGNOSTICS[d].label)}</button>` : '').join(' ')}</div>
      <div data-out="${c.id}"></div>
      <p class="muted small"><b>General:</b> ${esc(c.general)} <b>To verify:</b> ${esc(c.verify)}</p></div>`;
  }
  root.onchange = (e) => { if (e.target.id === 'rsel') { robotId = e.target.value; draw(); } };
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.healthy !== undefined) { ctx.healthy(); draw(); return; }
    if (b.dataset.focusr !== undefined) { ctx.scene?.focus({ type: 'robot', id: robotId }); ctx.selected = { type: 'robot', id: robotId }; document.getElementById('explodeBtn').disabled = false; return; }
    if (b.dataset.explode !== undefined) { ctx.selected = { type: 'robot', id: robotId }; ctx.scene?.explode(ctx.scene.exploded === robotId ? null : robotId); document.getElementById('explodeBtn').disabled = false; caption('Exploded view: parts move apart. Click a part in 3D, or use the component cards here.'); return; }
    if (b.dataset.cycle !== undefined) {
      if (ctx.sim.__attemptId) { ctx.healthy(); toast('Switched to a healthy fleet for the tour.'); }
      const sim = ctx.sim; const r = sim.robot(robotId);
      for (let i = 0; i < 60 && !sim.fmAvailable(r); i++) ctx.fastForward(5);
      const res = sim.operate('dispatch_test_task', { robot: robotId });
      if (!res.ok) { toast(res.msg, 'warn'); return; }
      follow = res.task; ctx.scene?.focus({ type: 'robot', id: robotId }); ctx.setSpeed(5); caption(`${robotId} received test task ${res.task}. Watch a full normal cycle at 5× speed.`); draw(); return;
    }
    if (b.dataset.chk) {
      const d = DIAGNOSTICS[b.dataset.chk]; const out = root.querySelector(`[data-out="${b.dataset.comp}"]`);
      if (b.dataset.chk === 'redock') return;
      predictionForm(out, d.predict, ({ choice, label }) => { const res = d.run(ctx.sim, { robot: robotId }); out.innerHTML = `<div class="result ${choice === res.outcome ? 'match' : 'miss'}"><p class="small">${choice === res.outcome ? '✓ matched' : `✕ you predicted “${esc(label)}”`} — ${esc(res.summary)}</p>${evidenceTable(res)}</div>`; }, { cancel: () => { out.innerHTML = ''; } });
    }
  };
  bindScenarioStart(root, ctx);
  draw();
  return {
    refresh() {
      const sim = ctx.sim; const r = sim.robot(robotId); if (!r) return;
      for (const c of COMPONENTS) { const t = root.querySelector(`[data-tel="${c.id}"]`); if (t) t.innerHTML = c.telemetry(sim, r).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join(''); }
      const cy = root.querySelector('#cycle'); if (cy && follow) cy.innerHTML = cycleHtml(sim);
    },
  };
}
