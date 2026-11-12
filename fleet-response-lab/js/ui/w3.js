// Walkthrough 3 — Build an observability tool (SIMULATED data).
import { esc, fmtDur, round, uid } from '../util.js';
import { METRICS, fmtMetric } from '../sim/catalog.js';
import { STOPPED_STATES, zoneOf } from '../sim/engine.js';
import { runView, evalAlert, alertSeries, TASK_INCIDENTS, ALERT_INCIDENTS } from '../sim/history.js';
import { store } from '../store.js';
import { rich, sparkline, toast, SIM_NOTE } from './common.js';

const SERIES_KEY = { availability: 'availability', tasksPerHour: 'tasksPerHour', successRate: 'successRate', orderLatency: 'orderLatency', queueDepth: 'queueDepth', oldestAge: 'oldestAge', batteryAvg: 'batteryAvg', faultCount: 'faultCount', dupIgnored: 'dupIgnored', chargeFaults: 'chargeFaults' };

export function render(root, ctx) {
  let tab = 'views'; let drill = null;
  const st = store.get();
  const q = { fields: ['robot', 'zone', 'count', 'codes'], code: 'any', zone: 'any', agg: 'count', window: 1, group: 'robot+zone', threshold: 2, minSample: 0 };
  const rule = { threshold: 250, duration: 0, minSamples: 1, recover: 250, recoverFor: 5, severity: 'MINOR', component: 'task-scheduler / fulfillment workflow', guidance: '', recoveryText: '' };
  const sim = () => ctx.sim;

  function tileBody(m) {
    const s = sim();
    if (m.id === 'disconnects') return `<span class="small muted">${esc(m.label)}</span><div>${['A', 'B', 'C', 'D', 'S'].map((z) => { const v = s.metric('disconnects', 900, { zone: z }); return `<span class="chip">${z}: ${v == null ? '<b>No data</b>' : `<b>${v}</b>`}</span>`; }).join(' ')}</div>`;
    const v = s.metric(m.id, 900, m.opt || {});
    const series = SERIES_KEY[m.id] ? s.s.samples.slice(-40).map((x) => x[SERIES_KEY[m.id]]) : m.id === 'serviceErrorRate' ? s.s.samples.slice(-40).map((x) => x.svcErr?.['inventory-service']) : [];
    const why = v == null ? (m.id === 'orderLatency' ? 'no orders completed in window' : m.id.startsWith('incident') ? 'no incidents handled yet' : m.id === 'successRate' ? 'no tasks finished in window' : 'no samples') : '';
    return `<span class="small muted">${esc(m.label)}</span><div class="val ${v == null ? 'nodata' : ''}">${fmtMetric(m, v)}${v == null ? `<span class="small"> — ${why}</span>` : ''}</div>${series.length ? sparkline(series.map((x) => (x == null ? null : x))) : ''}`;
  }
  function tile(m) {
    return `<div class="tile click" data-drill="${m.id}" tabindex="0" role="button" aria-label="${esc(m.label)}: open drill-down"><div class="tb" data-tb="${m.id}">${tileBody(m)}</div>${meta(m)}<button class="btn small tile-x" data-rm="${m.id}" aria-label="Remove widget">✕</button></div>`;
  }
  const meta = (m) => `<details class="small"><summary>Definition · unit · window · source</summary><p>${esc(m.def)}<br><b>Unit:</b> ${esc(m.unit)} · <b>Window:</b> ${esc(m.window)}<br><b>Source:</b> ${esc(m.source)}</p></details>`;

  function drillHtml(id) {
    const s = sim(); const m = METRICS.find((x) => x.id === id);
    let html = `<h4>Drill-down: ${esc(m.label)}</h4>`;
    if (['availability', 'faultCount', 'batteryAvg', 'chargeFaults', 'disconnects'].includes(id)) {
      const rs = s.s.robots.filter((r) => id === 'availability' ? !s.robotAvailable(r) : id === 'faultCount' ? STOPPED_STATES.includes(r.state) : id === 'chargeFaults' ? r.state === 'charging' && r.chargeA === 0 : id === 'disconnects' ? s.countWin('disconnect', 900, (e) => e.robot === r.id) > 0 : true);
      html += `<p>Related robots (${rs.length}): ${rs.map((r) => `<button class="btn small" data-fr="${r.id}">${r.id} · ${esc(r.state)} · zone ${zoneOf(r.x, r.z)}${id === 'disconnects' ? ` · ${s.countWin('disconnect', 900, (e) => e.robot === r.id)} disc.` : ''}</button>`).join(' ') || 'none'}</p>`;
    }
    const open = s.openTasks().sort((a, b) => a.createdAt - b.createdAt).slice(0, 5);
    if (['tasksPerHour', 'successRate', 'queueDepth', 'oldestAge', 'orderLatency'].includes(id)) html += `<p>Oldest open tasks: ${open.map((t) => `<a href="#/w2" data-trace="${t.id}">${t.id}</a> (${fmtDur(s.s.t - t.createdAt)}, ${esc(t.state)}${t.robot ? ', ' + t.robot : ''})`).join(' · ') || 'none'}</p>`;
    const codes = { successRate: ['TASK_FAILED', 'ACK_TIMEOUT_GIVEUP'], serviceErrorRate: ['RESERVE_TIMEOUT', 'RESERVE_UNAVAILABLE'], disconnects: ['ROBOT_HEARTBEAT_MISSED'], faultCount: ['OBSTACLE_DETECTED', 'LOC_CONFIDENCE_LOW', 'COMMS_LOSS_SAFE_STOP', 'WHEEL_FEEDBACK_FAULT', 'ESTOP_ACTIVE'], dupIgnored: ['DUPLICATE_TASK_IGNORED', 'ACK_TIMEOUT_REDELIVER'], chargeFaults: ['CHARGE_CURRENT_ZERO'], oldestAge: ['RESERVE_TIMEOUT', 'ACK_TIMEOUT_REDELIVER', 'STATION_UNAVAILABLE', 'ASSIGNMENT_RETAINED'], queueDepth: ['RESERVE_TIMEOUT', 'ACK_TIMEOUT_GIVEUP'] }[id] || [];
    if (codes.length) { const logs = s.s.logs.filter((e) => codes.includes(e.code) && e.t > s.s.t - 900).slice(-12); html += `<p class="small">Related log lines (15 min, codes ${codes.join(', ')}):</p><div class="scroll"><table class="data mono"><tbody>${logs.map((e) => `<tr class="logrow ${e.sev}"><td>${s.clockStr(e.ingest ?? e.t)}</td><td>${e.service}</td><td>${e.robot || ''}</td><td><b>${e.code}</b> ${esc(e.msg)}</td></tr>`).join('') || '<tr><td>none</td></tr>'}</tbody></table></div>`; }
    if (open[0]?.spans?.length) html += `<p class="small">Trace of oldest task ${open[0].id}: ${open[0].spans.map((sp) => `${sp.svc}.${sp.op} ${sp.dur >= 1 ? round(sp.dur, 1) + 's' : Math.round(sp.dur * 1000) + 'ms'}${sp.status !== 'ok' ? ' ✕' : ''}`).join(' → ')}</p>`;
    return html;
  }

  function viewsTab() {
    const s = sim(); const tk = s.openTasks().sort((a, b) => a.createdAt - b.createdAt)[0];
    return `<p>${rich('[[observability]] means you can understand what is happening inside the system from what it emits. Three connected views:')}</p>
      <div class="grid2"><div class="tile"><b>1. Metrics — what is changing</b><p class="small">${rich('A [[metric]] summarises many events into a number over time.')}</p><p>Oldest open task age: <b>${fmtDur(s.oldestOpenAge())}</b></p>${sparkline(s.s.samples.slice(-40).map((x) => x.oldestAge))}</div>
      <div class="tile"><b>2. Logs — what specific events occurred</b><p class="small">${rich('A [[log]] line records one event. The oldest task’s recent lines:')}</p><ul class="small mono">${tk ? s.s.logs.filter((e) => e.task === tk.id).slice(-4).map((e) => `<li>${s.clockStr(e.ingest ?? e.t)} ${e.code}</li>`).join('') : '<li>no open task</li>'}</ul></div>
      <div class="tile"><b>3. Traces — where time was spent</b><p class="small">${rich('A [[trace]] follows one request across services as [[span]]s.')}</p><p class="small mono">${tk?.spans?.map((sp) => `${sp.svc}: ${sp.dur >= 1 ? round(sp.dur, 1) + 's' : Math.round(sp.dur * 1000) + 'ms'}${sp.status !== 'ok' ? ' ✕' : ''}`).join('<br>') || 'no spans yet'}</p></div></div>
      <p class="small">Workflow: a metric tells you <i>that</i> something changed → logs tell you <i>what</i> happened → a trace tells you <i>where</i> time went. Click any dashboard tile to drill down the same way.</p>`;
  }
  function dashTab() {
    const ids = store.get().dashboard.widgets;
    return `<p>Assemble your dashboard. Each widget states definition, unit, window and source. <b>No data</b> ≠ 0.</p>
      <div class="btnrow"><label>Add widget <select id="addW">${METRICS.filter((m) => !ids.includes(m.id)).map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}</select></label><button class="btn small" data-add>Add</button></div>
      <div class="grid2" id="tiles">${ids.map((id) => METRICS.find((m) => m.id === id)).filter(Boolean).map(tile).join('')}</div>
      <div id="drill" class="card" ${drill ? '' : 'hidden'}>${drill ? drillHtml(drill) : ''}</div>`;
  }
  function viewTab() {
    const r = runView(q);
    return `<div class="lesson"><b>Exercise:</b> “Create a view that identifies robots with repeated task failures and groups them by warehouse zone.” Configure the view, then preview it against 14 days of simulated history with 4 labelled incidents.</div>
      <div class="grid2">
      <fieldset><legend>Fields to show</legend>${[['robot', 'Robot'], ['zone', 'Zone breakdown'], ['count', 'Failure count / value'], ['codes', 'Failure codes'], ['time', 'Time bucket']].map(([k, l]) => `<label class="chip"><input type="checkbox" data-field="${k}" ${q.fields.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>
      <label>Filter: failure code <select data-q="code">${['any', 'WHEEL_FEEDBACK_FAULT', 'COMMS_LOSS', 'ITEM_NOT_FOUND', 'ACK_TIMEOUT', 'OBSTACLE_TIMEOUT'].map((c) => `<option ${q.code === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label>Filter: zone <select data-q="zone">${['any', 'A', 'B', 'C', 'D'].map((c) => `<option ${q.zone === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label>Aggregation <select data-q="agg"><option value="count" ${q.agg === 'count' ? 'selected' : ''}>count of failures</option><option value="rate" ${q.agg === 'rate' ? 'selected' : ''}>failure rate (failures ÷ tasks)</option><option value="distinct" ${q.agg === 'distinct' ? 'selected' : ''}>distinct robots failing</option></select></label>
      <label>Time window <select data-q="window">${[[1, '1 hour'], [4, '4 hours'], [24, '24 hours']].map(([v, l]) => `<option value="${v}" ${q.window === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Group by <select data-q="group">${[['robot', 'robot'], ['zone', 'zone'], ['robot+zone', 'zone → robot']].map(([v, l]) => `<option value="${v}" ${q.group === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Threshold (≥) <input type="number" data-q="threshold" value="${q.threshold}" step="${q.agg === 'rate' ? 0.01 : 1}" min="0"></label>
      ${q.agg === 'rate' ? `<label>Minimum sample size (tasks) <input type="number" data-q="minSample" value="${q.minSample}" min="0"></label>` : ''}
      </div>
      <h4>Preview against historical simulated incidents</h4>
      <p>Detected: <b>${r.detected.join(', ') || 'none'}</b> · Missed: <b>${r.missed.join(', ') || 'none'}</b> · Rows not matching any incident (likely false positives): <b>${r.falseHits}</b> · Rows: ${r.rows.length}</p>
      <ul class="small">${TASK_INCIDENTS.map((i) => `<li>${r.detected.includes(i.id) ? '✓' : '○'} ${i.id}: ${esc(i.label)} (day ${i.day + 1}, ${i.h0}:00–${i.h1}:00)</li>`).join('')}</ul>
      <div class="scroll"><table class="data"><thead><tr>${q.fields.includes('time') ? '<th>Day / hour</th>' : ''}<th>Group</th>${q.fields.includes('count') ? '<th>Value</th>' : ''}${q.fields.includes('robot') ? '<th>Robots</th>' : ''}${q.fields.includes('zone') ? '<th>Zones</th>' : ''}${q.fields.includes('codes') ? '<th>Codes</th>' : ''}<th>Incident</th></tr></thead><tbody>${r.rows.slice(0, 120).map((x) => `<tr>${q.fields.includes('time') ? `<td>D${x.day + 1} ${x.hour}:00</td>` : ''}<td>${esc(x.group)}</td>${q.fields.includes('count') ? `<td>${q.agg === 'rate' ? (x.value * 100).toFixed(1) + '%' : x.value}</td>` : ''}${q.fields.includes('robot') ? `<td>${esc(x.robots)}</td>` : ''}${q.fields.includes('zone') ? `<td>${esc(x.zones)}</td>` : ''}${q.fields.includes('codes') ? `<td class="small">${esc(x.codes)}</td>` : ''}<td>${x.incident || '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>
      <div class="btnrow"><button class="btn primary" data-viewcheck>Check my view</button><button class="btn" data-saveview>Save view</button></div><div id="vfb"></div>`;
  }
  function viewFeedback() {
    const r = runView(q); const fb = [];
    const good = r.detected.length >= 3 && r.falseHits <= 3;
    if (q.group === 'robot+zone' && r.missed.includes('H-1')) fb.push('Grouping by zone → robot split R-09\'s failures across zones, so no single row crossed the threshold (H-1 missed). A robot fault follows the robot — count per robot, then show the zone breakdown.');
    if (q.group === 'zone' && r.falseHits > 3) fb.push('Grouping only by zone mixes all robots together; normal background failures add up and create noisy rows. It is good at shared (zone) problems like H-2/H-3, but cannot tell you which robots repeat.');
    if (q.threshold <= 1 && q.agg === 'count') fb.push('A threshold of 1 flags every single failure — far too noisy to act on.');
    if (q.window === 24) fb.push('A 24-hour window accumulates background noise; repeated failures within a shift are hidden among normal ones. Shorter windows separate bursts.');
    if (q.agg === 'rate' && !q.minSample) fb.push('Failure rate without a minimum sample size flags a robot that failed 1 of 1 task (100%). Add a minimum sample size.');
    if (!q.fields.includes('zone')) fb.push('The exercise asks to group results by zone — show the zone breakdown so responders can see where failures happened.');
    if (good && q.fields.includes('zone')) fb.unshift('✓ Your view detects most labelled incidents with few false positives. A reasonable design: count failures per robot per 1-hour window, threshold ≥ 3, show zone breakdown and codes.');
    const score = Math.max(0, Math.min(100, Math.round((r.detected.length / 4) * 70 + (r.falseHits <= 3 ? 20 : r.falseHits <= 10 ? 10 : 0) + (q.fields.includes('zone') ? 10 : 0))));
    return { fb, score, r };
  }
  function alertTab() {
    const res = evalAlert(rule); const { values } = alertSeries();
    const W = 640, H = 170; const mx = 760; const sx = W / values.length; const y = (v) => H - 14 - (v / mx) * (H - 24);
    const pts = values.map((v, i) => (v == null ? null : `${(i * sx).toFixed(1)},${y(v).toFixed(1)}`));
    let path = ''; let pen = false; for (const p of pts) { if (!p) { pen = false; continue; } path += (pen ? 'L' : 'M') + p; pen = true; }
    const chart = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Oldest task age over 7 simulated days with incidents and alert firings">
      ${ALERT_INCIDENTS.map((n) => `<rect x="${n.start * sx}" y="0" width="${Math.max(3, (n.end - n.start) * sx)}" height="${H - 14}" fill="#CC79A7" opacity=".25"><title>${n.id} ${esc(n.label)}</title></rect>`).join('')}
      <rect x="${(4 * 288 + 24) * sx}" y="0" width="${24 * sx}" height="${H - 14}" fill="url(#hatch)" opacity=".7"><title>data gap (unavailable)</title></rect>
      <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#888" stroke-width="2"/></pattern></defs>
      <path d="${path}" fill="none" stroke="#0072B2" stroke-width="1"/>
      <line x1="0" x2="${W}" y1="${y(rule.threshold)}" y2="${y(rule.threshold)}" stroke="#D55E00" stroke-dasharray="5 3"/><text x="4" y="${y(rule.threshold) - 3}">threshold ${rule.threshold}s</text>
      ${res.episodes.map((e) => `<path d="M${e.fired * sx},${H - 12} l-4,8 h8z" fill="${e.inc ? '#009E73' : '#D55E00'}"><title>${e.inc ? 'true alert for ' + e.inc : 'false alert'}</title></path>`).join('')}
      ${Array.from({ length: 7 }, (_, d) => `<text x="${d * 288 * sx + 2}" y="${H - 1}">day ${d + 1}</text>`).join('')}
    </svg><p class="small">Purple bands = labelled incidents · hatched = exporter gap (no data, treated as unknown, not 0) · ▲ green = alert during an incident · ▲ red = false alert.</p>`;
    return `<div class="lesson">${rich('An alert = metric + [[threshold]] + duration (+ minimum samples) + severity + who responds + what to do + when it recovers. Lower thresholds detect earlier but cause [[false positive]]s; higher thresholds and long durations cause [[false negative]]s (missed incidents) and slower detection.')}</div>
      <div class="btnrow"><button class="btn small" data-preset="noisy">Noisy example</button><button class="btn small" data-preset="missing">Missing-alert example</button><button class="btn small" data-preset="tuned">Better-tuned example</button></div>
      <div class="grid2">
        <label>Metric <select disabled><option>Oldest open task age (s), 5-min samples</option></select></label>
        <label>Threshold (s) <input type="number" data-r="threshold" value="${rule.threshold}" step="10"></label>
        <label>Duration (min above threshold) <input type="number" data-r="duration" value="${rule.duration}" step="5" min="0"></label>
        <label>Minimum samples <input type="number" data-r="minSamples" value="${rule.minSamples}" min="1"></label>
        <label>Recovery: below (s) <input type="number" data-r="recover" value="${rule.recover}" step="10"></label>
        <label>…for (min) <input type="number" data-r="recoverFor" value="${rule.recoverFor}" step="5" min="5"></label>
        <label>Severity <select data-r="severity">${['WARNING', 'MINOR', 'MAJOR'].map((x) => `<option ${rule.severity === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Affected component <input type="text" data-r="component" value="${esc(rule.component)}"></label>
      </div>
      <label>Response guidance (what should the responder do first?) <textarea data-r="guidance" rows="2" placeholder="e.g. Open the oldest task trace; check station status and fleet-manager ack timeouts; notify shift lead if > 10 min.">${esc(rule.guidance)}</textarea></label>
      <label>Recovery condition (plain words) <input type="text" data-r="recoveryText" value="${esc(rule.recoveryText)}" placeholder="e.g. oldest task < 200 s for 10 min and a task completes"></label>
      ${chart}
      <table class="kv"><tr><th>Alerts fired (7 days)</th><td>${res.episodes.length} (${res.perDay.toFixed(1)}/day)</td></tr><tr><th>Incidents detected</th><td>${res.tp.length}/4 ${res.tp.join(', ')}</td></tr><tr><th>Missed incidents</th><td>${res.missed.join(', ') || 'none'}</td></tr><tr><th>False alerts</th><td>${res.fp}</td></tr><tr><th>Mean detection delay</th><td>${res.meanDelay == null ? 'no detections' : res.meanDelay + ' min after incident start'}</td></tr></table>
      <div class="btnrow"><button class="btn primary" data-alertcheck>Check & save alert</button></div><div id="afb"></div>`;
  }

  function draw() {
    root.innerHTML = `<div class="card"><span class="eyebrow">Walkthrough 3 ${SIM_NOTE}</span><h2>Build an observability tool</h2>
      <div class="btnrow" role="tablist">${[['views', 'Metrics · logs · traces'], ['dash', 'Dashboard builder'], ['view', 'Exercise: repeated-failure view'], ['alert', 'Alert designer']].map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div id="tb">${{ views: viewsTab, dash: dashTab, view: viewTab, alert: alertTab }[tab]()}</div></div>`;
  }
  root.onkeydown = (e) => { const t = e.target.closest('[data-drill]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); } };
  root.onclick = (e) => {
    const b = e.target.closest('button, [data-drill], a[data-trace]'); if (!b) return;
    if (b.dataset.trace) { return; }
    if (b.dataset.tab) { tab = b.dataset.tab; draw(); return; }
    if (b.dataset.rm) { e.stopPropagation(); store.update((s) => { s.dashboard.widgets = s.dashboard.widgets.filter((x) => x !== b.dataset.rm); }); draw(); return; }
    if (b.dataset.add !== undefined) { const v = root.querySelector('#addW').value; if (v) store.update((s) => { s.dashboard.widgets.push(v); }); draw(); return; }
    if (b.dataset.drill) { drill = b.dataset.drill; draw(); root.querySelector('#drill')?.scrollIntoView({ block: 'nearest' }); return; }
    if (b.dataset.fr) { ctx.scene?.focus({ type: 'robot', id: b.dataset.fr }); return; }
    if (b.dataset.viewcheck !== undefined) { const { fb, score } = viewFeedback(); root.querySelector('#vfb').innerHTML = `<div class="docres"><p><b>View score: ${score}/100</b> (70 detection, 20 false positives, 10 shows zone grouping)</p>${fb.map((x) => `<p class="${x.startsWith('✓') ? 'ok' : 'bad'}">${esc(x)}</p>`).join('')}</div>`; recordObs('Repeated-failure view', score); return; }
    if (b.dataset.saveview !== undefined) { store.update((s) => { s.views.push({ id: uid('view'), ...q, saved: Date.now() }); }); toast('View saved.'); return; }
    if (b.dataset.preset) { Object.assign(rule, b.dataset.preset === 'noisy' ? { threshold: 250, duration: 0, minSamples: 1, recover: 250, recoverFor: 5 } : b.dataset.preset === 'missing' ? { threshold: 600, duration: 30, minSamples: 6, recover: 600, recoverFor: 5 } : { threshold: 300, duration: 10, minSamples: 2, recover: 200, recoverFor: 10 }); draw(); return; }
    if (b.dataset.alertcheck !== undefined) {
      const res = evalAlert(rule); const fb = [];
      if (res.fp > 5) fb.push(`${res.fp} false alerts in 7 days — responders will learn to ignore it (alert fatigue). Add a duration or raise the threshold.`);
      if (res.missed.length) fb.push(`Missed ${res.missed.join(', ')} — the rule is too strict or too slow.`);
      if (res.meanDelay != null && res.meanDelay > 20) fb.push(`Mean detection delay ${res.meanDelay} min — consider a shorter duration.`);
      if (rule.guidance.trim().length < 20) fb.push('Response guidance is missing or vague — an alert without a first step is hard to act on.');
      if (rule.recoveryText.trim().length < 10) fb.push('State the recovery condition in plain words.');
      fb.push(`Note: the data gap on day 5 (${res.gapSamples} samples) is treated as UNKNOWN, not as 0. Consider a separate "no data" alert for the exporter.`);
      const score = Math.max(0, Math.round((res.tp.length / 4) * 50 + Math.max(0, 25 - res.fp * 3) + (rule.guidance.trim().length >= 20 ? 15 : 0) + (rule.recoveryText.trim().length >= 10 ? 10 : 0)));
      store.update((s) => { s.alerts.push({ id: uid('al'), ...rule, result: { tp: res.tp, fp: res.fp, missed: res.missed }, saved: Date.now() }); });
      root.querySelector('#afb').innerHTML = `<div class="docres"><p><b>Alert score: ${score}/100</b> (50 detection, 25 low false positives, 15 guidance, 10 recovery condition)</p>${fb.map((x) => `<p class="${x.startsWith('Note') ? 'muted' : 'bad'}">${esc(x)}</p>`).join('')}${!res.missed.length && res.fp <= 2 ? '<p class="ok">✓ Detects all labelled incidents with few false alerts. Tradeoff: earlier detection (lower threshold/duration) would add false alerts; a stricter rule would miss the short incident.</p>' : ''}</div>`;
      recordObs('Alert design', score); return;
    }
  };
  function recordObs(title, score) { store.update((s) => { s.attempts.push({ id: uid('obs'), scenarioId: 'w3', title: `W3 · ${title}`, walkthrough: 'W3', mode: s.settings.mode, started: Date.now(), ended: Date.now(), total: score, skills: { observability: score }, critical: [], cats: [{ name: title, got: score, max: 100, notes: [] }] }); s.walkthroughs.W3 = { done: true }; }); }
  root.onchange = (e) => {
    const t = e.target;
    if (t.dataset.field) { const k = t.dataset.field; q.fields = t.checked ? [...new Set([...q.fields, k])] : q.fields.filter((x) => x !== k); draw(); return; }
    if (t.dataset.q) { q[t.dataset.q] = ['window', 'threshold', 'minSample'].includes(t.dataset.q) ? +t.value : t.value; draw(); return; }
    if (t.dataset.r) { rule[t.dataset.r] = t.type === 'number' ? +t.value : t.value; if (t.type === 'number' || t.tagName === 'SELECT') draw(); return; }
  };
  root.oninput = (e) => { const t = e.target; if (t.dataset.r && t.type !== 'number' && t.tagName !== 'SELECT') rule[t.dataset.r] = t.value; };
  draw();
  let lastRef = 0;
  return { refresh() { if (tab !== 'dash' || Date.now() - lastRef < 2000) return; lastRef = Date.now(); for (const el of root.querySelectorAll('[data-tb]')) { const m = METRICS.find((x) => x.id === el.dataset.tb); if (m) el.innerHTML = tileBody(m); } if (drill) { const d = root.querySelector('#drill'); if (d && !d.contains(document.activeElement)) d.innerHTML = drillHtml(drill); } } };
  void st;
}
