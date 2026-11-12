// Walkthrough 2 — Robotics & fulfillment software debugging console (SIMULATED, read-only).
// Commands are fictional and only query the simulation.
import { esc, fmtDur, round } from '../util.js';
import { SERVICES, SERVICE_DEPS, zoneOf } from '../sim/engine.js';
import { OPERATIONS, SANDBOX_TESTS, CHECKS, sandboxAction, COMPONENTS } from '../sim/catalog.js';
import { rich, toast, statusPill, predictionForm, SIM_NOTE } from './common.js';
import { scenarioList, bindScenarioStart } from './w1.js';

const SEV = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const LESSONS = [
  ['Event ordering & timestamp alignment', 'Each log line has the time the device wrote (source timestamp) and the time the log system received it ([[ingest time]]). A robot with [[clock skew]] (R-07 runs 1.8 s fast here) or a disconnected robot that uploads buffered logs later can make events look out of order. Sort by ingest time or apply the known offset ("aligned") before deciding what happened first.'],
  ['Error versus warning', 'WARN means something unexpected that the system handled (e.g. a retry). ERROR means an operation failed. Many WARNs can matter more than one ERROR — look at rates and trends, not severity alone.'],
  ['Correlation versus causation', '[[correlation vs causation]]: a release at 06:10 and a throughput drop at 06:12 are correlated. To show causation, test it: roll back in the sandbox, or find the mechanism in logs (e.g. ack timeouts that match the new config).'],
  ['Retries, timeouts and backoff', 'A [[timeout]] ends a wait; a [[retry]] tries again; [[backoff]] spaces retries out (2 s, 4 s, 8 s…). Retries without backoff can overload a slow service and make it slower. Retries of state-changing requests must be safe — that is what [[idempotency]] keys are for.'],
  ['Why repeated restarts hurt', 'A restart erases in-memory state and local logs (evidence), can create new problems (stale sessions, stranded tasks), and often makes symptoms vanish briefly so the real cause returns later. Preserve evidence first and restart only with a reason.'],
  ['A successful command is not recovery', '"Restart accepted" only means the command was delivered. Recovery means: the component is healthy, a full task completes, records are consistent, and alarms stay clear for a meaningful period.'],
];

export function render(root, ctx) {
  const f = { robot: '', order: '', task: '', corr: '', service: '', sev: 'INFO', since: 15, text: '', sort: 'ingest' };
  let tab = 'logs'; let traceId = ''; let cmpA = 'R-07', cmpB = 'R-03'; let sandOut = ''; const picked = new Set();
  const sim = () => ctx.sim;

  function filtered() {
    const s = sim(); const t0 = s.s.t - f.since * 60;
    const skew = (e) => (e.service === 'robot-agent' ? s.robot(e.robot)?.skew || 0 : 0);
    let rows = s.s.logs.filter((e) => (e.ingest ?? e.t) >= t0 && SEV[e.sev] >= SEV[f.sev] && (!f.robot || e.robot === f.robot) && (!f.order || e.order === f.order) && (!f.task || e.task === f.task) && (!f.corr || e.corr === f.corr) && (!f.service || e.service === f.service) && (!f.text || (e.msg + e.code).toLowerCase().includes(f.text.toLowerCase())));
    const key = f.sort === 'source' ? (e) => e.ts : f.sort === 'aligned' ? (e) => e.ts - skew(e) : (e) => e.ingest ?? e.t;
    rows = rows.slice().sort((a, b) => key(a) - key(b) || a.id - b.id);
    return rows.slice(-400);
  }
  function logsTab() {
    const s = sim(); const rows = filtered();
    return `<form class="filters" id="lf"><div class="grid2">
      <label>Robot <select name="robot"><option value="">any</option>${s.s.robots.map((r) => `<option ${f.robot === r.id ? 'selected' : ''}>${r.id}</option>`).join('')}</select></label>
      <label>Service <select name="service"><option value="">any</option>${[...SERVICES, 'robot-agent', 'alarm-engine', 'audit'].map((x) => `<option ${f.service === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Min severity <select name="sev">${Object.keys(SEV).map((x) => `<option ${f.sev === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Time window <select name="since">${[5, 15, 30, 60, 120].map((x) => `<option value="${x}" ${f.since === x ? 'selected' : ''}>last ${x} min</option>`).join('')}</select></label>
      <label>Order ID <input type="text" name="order" value="${esc(f.order)}" placeholder="O-1234"></label>
      <label>Task ID <input type="text" name="task" value="${esc(f.task)}" placeholder="T-5001"></label>
      <label>Correlation ID <input type="text" name="corr" value="${esc(f.corr)}" placeholder="c-1a2b3c"></label>
      <label>Text <input type="text" name="text" value="${esc(f.text)}" placeholder="TIMEOUT"></label>
      <label>Sort by <select name="sort"><option value="ingest" ${f.sort === 'ingest' ? 'selected' : ''}>ingest time</option><option value="source" ${f.sort === 'source' ? 'selected' : ''}>source timestamp</option><option value="aligned" ${f.sort === 'aligned' ? 'selected' : ''}>source, aligned for known clock skew</option></select></label>
      </div><div class="btnrow"><button class="btn small" type="button" data-clear>Clear filters</button>${ctx.addEvidence ? `<button class="btn small" type="button" data-pin ${picked.size ? '' : 'disabled'}>Add ${picked.size} selected line(s) to incident notebook</button>` : '<span class="muted small">Start an incident to pin log lines as evidence.</span>'}</div></form>
      <p class="muted small">${rows.length} line(s) shown (max 400). Click a correlation ID to follow it across services.</p>
      <div class="scroll"><table class="data mono"><thead><tr><th></th><th>time (${f.sort})</th><th>sev</th><th>service</th><th>robot</th><th>order</th><th>task</th><th>corr</th><th>code · message</th></tr></thead><tbody>
      ${rows.map((e) => { const tm = f.sort === 'ingest' ? (e.ingest ?? e.t) : f.sort === 'source' ? e.ts : e.ts - (e.service === 'robot-agent' ? s.robot(e.robot)?.skew || 0 : 0); const late = e.ingest != null && e.ingest - e.t > 1.5; return `<tr class="logrow ${e.sev}"><td><input type="checkbox" data-pick="${e.id}" ${picked.has(e.id) ? 'checked' : ''} aria-label="select log line"></td><td>${s.clockStr(tm, true)}${late ? ' <span title="arrived late (buffered while disconnected)">⏱</span>' : ''}</td><td class="sev">${e.sev}</td><td>${esc(e.service)}</td><td>${e.robot ? `<a href="#" data-f="robot" data-v="${e.robot}">${e.robot}</a>` : ''}</td><td>${e.order ? `<a href="#" data-f="order" data-v="${e.order}">${e.order}</a>` : ''}</td><td>${e.task ? `<a href="#" data-f="task" data-v="${e.task}">${e.task}</a>` : ''}</td><td>${e.corr ? `<a href="#" data-f="corr" data-v="${e.corr}">${e.corr}</a>` : ''}</td><td><b>${esc(e.code)}</b> ${esc(e.msg)}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }
  function traceTab() {
    const s = sim();
    const open = s.openTasks().sort((a, b) => a.createdAt - b.createdAt).slice(0, 6);
    const recent = s.s.orderIds.slice(-8).reverse();
    const order = s.s.orders[traceId] || (s.s.tasks[traceId] && s.s.orders[s.s.tasks[traceId].orderId]);
    let body = '<p class="muted">Pick an order or task.</p>';
    if (order) {
      const tasks = order.tasks.map((id) => s.s.tasks[id]).filter(Boolean);
      const logs = s.s.logs.filter((e) => e.corr === order.corr).slice(-60);
      body = `<h4>Order ${order.id} · ${esc(order.state)} · correlation ID <code>${order.corr}</code> · age ${fmtDur((order.doneAt ?? s.s.t) - order.createdAt)}</h4>
      ${tasks.map((tk) => `<div class="lesson"><b>${tk.id}</b> ${esc(tk.sku)} @ ${tk.loc} → ${tk.station} · <b>${esc(tk.state)}</b>${tk.robot ? ' · ' + tk.robot : ''} · idempotency key <code>${tk.idem}</code> · deliveries ${tk.deliveries}
        <ol class="small timeline">${tk.history.map((h) => `<li>${s.clockStr(h.t, true)} <b>${esc(h.state)}</b> — ${esc(h.note)}</li>`).join('')}</ol>
        ${waterfall(tk, s)}</div>`).join('')}
      <h4>All log lines with this correlation ID (${logs.length})</h4><div class="scroll"><table class="data mono"><tbody>${logs.map((e) => `<tr class="logrow ${e.sev}"><td>${s.clockStr(e.ingest ?? e.t, true)}</td><td>${e.sev}</td><td>${esc(e.service)}</td><td>${e.robot || ''}</td><td><b>${esc(e.code)}</b> ${esc(e.msg)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    return `<div class="btnrow"><input type="text" id="trId" value="${esc(traceId)}" placeholder="O-1234 or T-5001" style="max-width:200px"><button class="btn small" data-tr>Trace</button></div>
      <p class="small">Oldest open tasks: ${open.map((t) => `<a href="#" data-trid="${t.id}">${t.id} (${fmtDur(s.s.t - t.createdAt)}, ${t.state})</a>`).join(' · ') || 'none'}<br>Recent orders: ${recent.map((o) => `<a href="#" data-trid="${o}">${o}</a>`).join(' · ')}</p>${body}`;
  }
  function waterfall(tk, s) {
    if (!tk.spans?.length) return '';
    const t0 = tk.spans[0].start; const t1 = Math.max(...tk.spans.map((x) => x.start + x.dur), s.s.t > t0 ? Math.min(s.s.t, t0 + 600) : t0 + 1);
    const W = 520, sc = (W - 170) / Math.max(0.5, t1 - t0);
    return `<svg class="chart" viewBox="0 0 ${W} ${tk.spans.length * 18 + 22}" role="img" aria-label="trace waterfall for ${tk.id}">${tk.spans.map((sp, i) => `<text x="2" y="${i * 18 + 14}">${esc(sp.svc)}.${esc(sp.op).slice(0, 14)}</text><rect x="${170 + (sp.start - t0) * sc}" y="${i * 18 + 3}" width="${Math.max(2, sp.dur * sc)}" height="12" fill="${sp.status === 'ok' ? '#0072B2' : '#D55E00'}"><title>${esc(sp.svc)} ${esc(sp.op)} ${round(sp.dur * 1000, 0)} ms ${sp.status}</title></rect><text x="${Math.min(W - 60, 174 + (sp.start - t0 + sp.dur) * sc)}" y="${i * 18 + 13}">${sp.dur >= 1 ? round(sp.dur, 1) + ' s' : Math.round(sp.dur * 1000) + ' ms'}${sp.status !== 'ok' ? ' ✕ ' + sp.status : ''}</text>`).join('')}<text x="2" y="${tk.spans.length * 18 + 18}" class="small">Span = one timed step. Red ✕ = timeout/error. Time runs left → right.</text></svg>`;
  }
  function compareTab() {
    const s = sim(); const A = s.robot(cmpA), B = s.robot(cmpB);
    const codes = (r) => { const c = {}; for (const e of s.s.logs) if (e.robot === r.id && e.t > s.s.t - 900 && (e.sev === 'WARN' || e.sev === 'ERROR')) c[e.code] = (c[e.code] || 0) + 1; return Object.entries(c).map(([k, v]) => `${k}×${v}`).join(', ') || 'none'; };
    const rows = [['State', A.state, B.state], ['Zone', zoneOf(A.x, A.z), zoneOf(B.x, B.z)], ['Fleet-manager assignment', s.s.fm.assignments[A.id]?.taskId || 'none', s.s.fm.assignments[B.id]?.taskId || 'none'], ['Robot-side task', A.taskId || 'none', B.taskId || 'none'], ['Session / uptime', `${A.session} / ${fmtDur(s.s.t - A.bootAt)}`, `${B.session} / ${fmtDur(s.s.t - B.bootAt)}`], ['Firmware', A.firmware, B.firmware], ['Localization', round(A.loc, 2), round(B.loc, 2)], ['Obstacle range', round(A.obstacle, 2) + ' m', round(B.obstacle, 2) + ' m'], ['RSSI / connected', `${A.rssi} / ${s.connected(A)}`, `${B.rssi} / ${s.connected(B)}`], ['Disconnects 15 min', s.countWin('disconnect', 900, (e) => e.robot === A.id), s.countWin('disconnect', 900, (e) => e.robot === B.id)], ['Encoder L/R ratio', A.ratio ?? 'no data', B.ratio ?? 'no data'], ['Motor L/R (A)', `${A.motorL}/${A.motorR}`, `${B.motorL}/${B.motorR}`], ['Battery', round(A.battery, 0) + '%', round(B.battery, 0) + '%'], ['Tasks done / failed', `${A.tasksDone}/${A.tasksFailed}`, `${B.tasksDone}/${B.tasksFailed}`], ['WARN/ERROR codes 15 min', codes(A), codes(B)]];
    return `<div class="btnrow"><label>Robot A <select id="cA">${s.s.robots.map((r) => `<option ${r.id === cmpA ? 'selected' : ''}>${r.id}</option>`).join('')}</select></label><label>Robot B (healthy reference) <select id="cB">${s.s.robots.map((r) => `<option ${r.id === cmpB ? 'selected' : ''}>${r.id}</option>`).join('')}</select></label></div>
      <table class="data"><thead><tr><th></th><th>${A.id}</th><th>${B.id}</th></tr></thead><tbody>${rows.map(([k, a, b]) => `<tr ${String(a) !== String(b) ? 'style="font-weight:600"' : ''}><td>${esc(k)}</td><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>
      <p class="muted small">Bold rows differ. A difference is a lead, not a conclusion — robots in different places or doing different work will differ normally.</p>`;
  }
  function servicesTab() {
    const s = sim();
    return `<table class="data"><thead><tr><th>Service</th><th>Status</th><th>Version</th><th>p50 / p95</th><th>Errors (2 min)</th><th>Depends on</th></tr></thead><tbody>${SERVICES.map((n) => { const l = s.serviceLatency(n); const er = s.serviceErrorRate(n, 120); const st = s.serviceStatus(n); return `<tr><td>${n}</td><td>${st === 'healthy' ? '✓' : st === 'warning' ? '⚠' : '✕'} ${st}</td><td>${s.s.services[n].version}</td><td>${l.p50 == null ? 'no data' : Math.round(l.p50) + ' / ' + Math.round(l.p95) + ' ms'}</td><td>${er == null ? 'no data (no calls)' : Math.round(er * 100) + '%'}</td><td>${SERVICE_DEPS[n].join(', ') || '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="small">${rich('[[p95 latency]] shows slow outliers. "No data" means no calls in the window — not zero errors. Turn on the 🧩 Software overlay in the 3D view for the live dependency map.')}</p>
      <h4>Configuration (simulated)</h4><table class="kv small"><tr><th>fleet-manager ack_timeout_ms</th><td>${s.s.config.ackTimeoutMs}</td></tr><tr><th>fleet-manager max redeliveries</th><td>${s.s.config.maxRedeliveries}</td></tr><tr><th>task-scheduler reserve timeout</th><td>${s.s.config.reserveTimeoutMs} ms</td></tr><tr><th>task-scheduler reservation concurrency</th><td>${s.s.config.schedulerConcurrency}</td></tr><tr><th>inventory-service db.pool.max</th><td>${s.s.config.inventoryPoolMax}</td></tr></table>`;
  }
  function releasesTab() {
    const s = sim(); const first = s.s.alarms[0];
    const firstErr = s.s.logs.find((e) => e.sev === 'ERROR' || e.code.includes('TIMEOUT'));
    return `<p>${rich('Line up changes against symptom onset. Close timing is a [[correlation vs causation]] clue — confirm with a test.')}</p>
      <table class="data"><thead><tr><th>When</th><th>Change</th><th>Diff</th></tr></thead><tbody>${s.s.releases.slice().sort((a, b) => b.t - a.t).map((x) => `<tr><td>${s.clockStr(x.t)}${x.t < 0 && x.t < -86400 ? ' (days ago)' : ''}</td><td><b>${x.id}</b> ${esc(x.service)}<br>${esc(x.from)} → ${esc(x.to)}${x.rolledBack ? ' <span class="pill ok">rolled back</span>' : ''}</td><td class="small">${x.changes.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table>
      <p class="small">First alarm: ${first ? `${s.clockStr(first.raisedAt)} — ${esc(first.msg)}` : 'none'} · First ERROR/timeout log: ${firstErr ? `${s.clockStr(firstErr.t)} — ${esc(firstErr.code)}` : 'none'}</p>`;
  }
  function sandboxTab() {
    const s = sim(); const ops = Object.entries(OPERATIONS).filter(([k]) => !['preserve_evidence'].includes(k));
    return `<p>${rich('The [[sandbox]] clones the current simulation and runs an action there for 5 minutes. Production is untouched. Use it to test a hypothesis or a mitigation before acting.')}</p>
      <div class="grid2"><label>Action <select id="sbOp">${ops.map(([k, m]) => `<option value="${k}">${esc(m.label)}</option>`).join('')}</select></label>
      <label>Robot <select id="sbR">${s.s.robots.map((r) => `<option>${r.id}</option>`).join('')}</select></label>
      <label>Aisle <select id="sbA">${['A', 'B', 'C', 'D'].map((x) => `<option>${x}</option>`).join('')}</select></label>
      <label>Service <select id="sbS">${SERVICES.map((x) => `<option>${x}</option>`).join('')}</select></label>
      <label>Station <select id="sbSt">${['P-1', 'P-2', 'P-3', 'P-4'].map((x) => `<option>${x}</option>`).join('')}</select></label>
      <label>Other (AP / change / location / value) <input type="text" id="sbX" placeholder="AP-3 · CHG-2291 · B-14 · 12"></label></div>
      <button class="btn primary" data-sb>Run in sandbox (5 min)</button>
      <h4>Sandbox behaviour tests</h4><div class="btnrow">${Object.entries(SANDBOX_TESTS).map(([k, t]) => `<button class="btn small" data-sbt="${k}">${esc(t.label)}</button>`).join('')}</div><div id="sbtOut"></div>
      <div id="sbOut">${sandOut}</div>`;
  }
  function lessonsTab() { return LESSONS.map(([t, b]) => `<div class="lesson"><b>${esc(t)}</b><p>${rich(b)}</p></div>`).join(''); }

  function draw() {
    root.innerHTML = `<div class="card"><span class="eyebrow">Walkthrough 2 ${SIM_NOTE}</span><h2>Software investigation console</h2>
      <p class="muted small">Fictional, read-only diagnostic tools over the shared simulation${ctx.sim.__attemptId ? ' (currently: your active incident)' : ' (currently: free-play fleet)'}. Commands below are invented for training and do not correspond to any real product.</p>
      <form id="cli" class="btnrow" aria-label="Simulated read-only command line"><input type="text" id="cliIn" class="mono" placeholder="sim> logs --robot R-07 --sev WARN --since 15   |   trace O-1001   |   task T-5001   |   compare R-07 R-03   |   health   |   releases" style="flex:1;min-width:240px"><button class="btn small" type="submit">Run</button></form>
      <div class="btnrow" role="tablist">${[['logs', 'Logs'], ['trace', 'Order / task trace'], ['compare', 'Compare robots'], ['services', 'Service health'], ['releases', 'Releases & config'], ['sandbox', 'Sandbox'], ['lessons', 'Concepts']].map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div id="tabBody">${{ logs: logsTab, trace: traceTab, compare: compareTab, services: servicesTab, releases: releasesTab, sandbox: sandboxTab, lessons: lessonsTab }[tab]()}</div></div>
      <div class="card"><h3>Software incidents</h3>${scenarioList(ctx, (s) => s.walkthrough === 'W2')}</div>`;
  }
  function runCli(line) {
    const parts = line.trim().replace(/^sim>\s*/, '').split(/\s+/); const cmd = parts.shift();
    const opt = (n) => { const i = parts.indexOf('--' + n); return i >= 0 ? parts[i + 1] : ''; };
    if (cmd === 'logs') { Object.assign(f, { robot: opt('robot'), service: opt('service'), order: opt('order'), task: opt('task'), corr: opt('corr'), text: opt('grep') }); if (opt('sev')) f.sev = opt('sev').toUpperCase(); if (opt('since')) f.since = +opt('since') || 15; tab = 'logs'; }
    else if (cmd === 'trace' || cmd === 'task') { traceId = parts[0] || ''; tab = 'trace'; }
    else if (cmd === 'compare') { cmpA = parts[0] || cmpA; cmpB = parts[1] || cmpB; tab = 'compare'; }
    else if (cmd === 'health') tab = 'services';
    else if (cmd === 'releases') tab = 'releases';
    else { toast('Unknown simulated command. Try: logs, trace, task, compare, health, releases.', 'warn'); return; }
    draw();
  }
  root.onsubmit = (e) => { if (e.target.id === 'cli') { e.preventDefault(); runCli(root.querySelector('#cliIn').value); } };
  root.onchange = (e) => {
    const t = e.target;
    if (t.closest('#lf') && t.name) { f[t.name] = t.name === 'since' ? +t.value : t.value; draw(); return; }
    if (t.dataset.pick) { t.checked ? picked.add(+t.dataset.pick) : picked.delete(+t.dataset.pick); const b = root.querySelector('[data-pin]'); if (b) { b.disabled = !picked.size; b.textContent = `Add ${picked.size} selected line(s) to incident notebook`; } return; }
    if (t.id === 'cA') { cmpA = t.value; draw(); } if (t.id === 'cB') { cmpB = t.value; draw(); }
  };
  root.onclick = (e) => {
    const a = e.target.closest('a[data-f], a[data-trid]'); if (a) { e.preventDefault(); if (a.dataset.trid) { traceId = a.dataset.trid; tab = 'trace'; } else { f[a.dataset.f] = a.dataset.v; tab = 'logs'; } draw(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { tab = b.dataset.tab; draw(); return; }
    if (b.dataset.clear !== undefined) { Object.assign(f, { robot: '', order: '', task: '', corr: '', service: '', sev: 'INFO', since: 15, text: '' }); draw(); return; }
    if (b.dataset.tr !== undefined) { traceId = root.querySelector('#trId').value.trim(); draw(); return; }
    if (b.dataset.pin !== undefined && ctx.addEvidence) { const lines = sim().s.logs.filter((x) => picked.has(x.id)); const facts = lines.map((x) => `${sim().clockStr(x.ingest ?? x.t, true)} ${x.service}${x.robot ? ' ' + x.robot : ''} ${x.code}: ${x.msg}`); ctx.addEvidence({ label: `Log lines (${lines.length})`, summary: facts.slice(0, 3).join(' | ') + (facts.length > 3 ? ' …' : ''), facts, source: 'console' }); picked.clear(); draw(); return; }
    if (b.dataset.sb !== undefined) {
      const op = root.querySelector('#sbOp').value; const x = root.querySelector('#sbX').value.trim();
      const p = { robot: root.querySelector('#sbR').value, aisle: root.querySelector('#sbA').value, service: root.querySelector('#sbS').value, station: root.querySelector('#sbSt').value, ap: x.startsWith('AP') ? x : 'AP-3', change: x.startsWith('CHG') ? x : 'CHG-2291', loc: /^[A-D]-\d\d$/.test(x) ? x : 'B-14', value: +x || 12, part: 'replace_encoder', charger: 'C-2' };
      const r = sandboxAction(sim(), op, p, 300);
      sandOut = `<div class="result"><p><b>Sandbox: ${esc(OPERATIONS[op].label)}</b> → ${esc(r.res.msg)}</p><table class="kv"><tr><th>Queue depth</th><td>${r.before.q} → ${r.after.q}</td></tr><tr><th>Oldest open task</th><td>${fmtDur(r.before.age)} → ${fmtDur(r.after.age)}</td></tr><tr><th>Tasks completed in 5 min</th><td>${r.after.done}</td></tr><tr><th>inventory-service error rate</th><td>${r.after.err == null ? 'no data' : Math.round(r.after.err * 100) + '%'}</td></tr><tr><th>Active alarms after</th><td>${esc(r.after.alarms.join(', ') || 'none')}</td></tr></table>
        <h4>Checks in the sandbox after 5 min</h4>${Object.entries(r.checks).map(([k, v]) => `<p class="small">${statusPill(v.pass)} ${esc(CHECKS[k].label)} — ${esc(v.detail)}</p>`).join('')}<p class="muted small">Sandbox results are evidence about what WOULD happen; they are not recovery. Nothing changed in production.</p></div>`;
      draw(); return;
    }
    if (b.dataset.sbt) { const t = SANDBOX_TESTS[b.dataset.sbt]; const out = root.querySelector('#sbtOut'); const rid = root.querySelector('#sbR').value; predictionForm(out, t.predict, ({ choice }) => { const r = t.run(sim(), { robot: rid }); out.innerHTML = `<div class="result ${choice === r.outcome ? 'match' : 'miss'}"><p>${esc(r.summary)}</p></div>`; }, { cancel: () => { out.innerHTML = ''; } }); }
  };
  bindScenarioStart(root, ctx);
  draw();
  let lastRef = 0;
  return { refresh() { if (Date.now() - lastRef < 2000) return; lastRef = Date.now(); if ((tab === 'services' || tab === 'compare') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) { const tb = root.querySelector('#tabBody'); if (tb) tb.innerHTML = tab === 'services' ? servicesTab() : compareTab(); } } };
}
void COMPONENTS;
