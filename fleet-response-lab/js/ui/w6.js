// Walkthrough 6 — Live operations support (SIMULATED). Incident clock runs in facility (sim) time.
import { esc, fmtDur, uid, pad } from '../util.js';
import { Sim } from '../sim/engine.js';
import { SCENARIO_MAP, startAttempt } from '../sim/scenarios.js';
import { DIAGNOSTICS, SANDBOX_TESTS, OPERATIONS, CHECKS } from '../sim/catalog.js';
import { store, addReview } from '../store.js';
import { rich, predictionForm, evidenceTable, toast, modal, caption, statusPill, downloadText, SIM_NOTE } from './common.js';
import { scoreUpdate } from '../docs-rules.js';
import { queueDocReview, queueCheckReview } from '../review-templates.js';

const SC = 'w6-backlog';
const TEMPLATES = {
  ack: 'Acknowledged — I am looking at the order backlog and idle robots now. Current impact: [N] tasks waiting, oldest about [X] min. Next update at [HH:MM].',
  impact: 'Update [HH:MM]: Impact: [N] tasks waiting, oldest [X] min; affected: [stations/robots/zones]. Known so far: [facts]. Not yet known: [unknowns]. Investigating: [what I am checking]. Next update at [HH:MM].',
  mitigation: 'Mitigation in progress: [action] (temporary workaround, not a permanent fix). Expected effect: [..]. Possible side effect: [..]. Next update at [HH:MM].',
  observing: 'Recovery under observation since [HH:MM]: [queue/oldest task/throughput]. Verifying: [checks]. I will not close until [condition]. Next update at [HH:MM].',
  resolved: 'Resolved at [HH:MM]: service restored by [action]. Verified by: [checks]. Root cause: [confirmed / suspected / unknown — explain]. Follow-up: [actions + owners]. Separately: [unrelated issues and their status].',
};
const QUESTIONS = [
  { id: 'onset', q: 'When did you first notice the backlog?', focused: true },
  { id: 'impact', q: 'How many orders are late, and which stations are affected?', focused: true },
  { id: 'robots', q: 'Are the idle robots showing errors, or just waiting?', focused: true },
  { id: 'changes', q: 'Has anything changed recently — maintenance, layout, software?', focused: true },
  { id: 'people', q: 'Is anyone working inside the robot area right now?', focused: true },
  { id: 'scope', q: 'Is it one area or everywhere?', focused: true },
  { id: 'restart', q: 'Have you tried restarting everything?', focused: false },
  { id: 'logs', q: 'Can you send me all the logs?', focused: false },
  { id: 'bad', q: 'Is it really that bad?', focused: false },
];

export function render(root, ctx) {
  let o = store.get().opsCurrent || null;
  const sc = SCENARIO_MAP[SC];
  let tab = 'comms';
  const sim = () => ctx.sim;

  function ensureSim() {
    if (!o || ctx.sim?.__opsId === o.id) return;
    let s; const snap = store.get().opsSnap;
    if (snap && snap.__id === o.id) { s = Sim.fromSnapshot(snap.s); } else s = startAttempt(SC, o.seed, o.variant).sim;
    s.__opsId = o.id; ctx.setSim(s);
  }
  function persist() { store.update((st) => { st.opsCurrent = o; try { const sn = sim().snapshot(); sn.logs = sn.logs.slice(-2000); st.opsSnap = { __id: o.id, s: sn }; } catch { st.opsSnap = null; } }); }
  function start(capstone) {
    const seed = Date.now() % 1000000007; const { sim: s, variant } = startAttempt(SC, seed);
    s.__opsId = uid('ops'); ctx.setSim(s);
    o = { id: s.__opsId, seed, variant, capstone, simStart: s.s.t, reportedAt: s.s.t, ackAt: null, msgs: [], asked: [], evidence: [], actions: [], updates: [], commitments: [], checks: {}, scope: null, escalation: null, closed: false, score: null, firstMitigation: null, second: null, lastOpsPing: s.s.t };
    s.s.incidents.push({ id: o.id, reportedAt: s.s.t, ackAt: null, recoveredAt: null });
    msg('ops', 'Dana (operations shift lead, fictional) — radio', sc.brief.replace(/^[^:]+:\s*/, ''));
    ctx.setSpeed(1); persist(); draw();
    caption('Incident clock started. Acknowledge first, then gather facts.');
  }
  function msg(kind, who, text) { o.msgs.push({ t: sim().s.t, clock: sim().clockStr(), kind, who, text }); }
  const el = () => sim().s.t - o.simStart;
  const T = (t) => sim().clockStr(t).slice(0, 5);

  // ------------------------------------------------------------- operator responses (reflect live state)
  function answer(id) {
    const s = sim(); const late = s.openTasks().filter((t) => s.s.t - t.createdAt > 300).length;
    const waitingSt = Object.values(s.s.stations).filter((x) => !x.ready).map((x) => x.id);
    const f = Object.entries(s.s.faults).find(([k]) => ['slowService', 'stationDown', 'regression'].includes(k));
    switch (id) {
      case 'onset': return f ? `Maybe around ${T(f[1].injectedAt + 60)}? I noticed it a few minutes after that.` : 'Not sure.';
      case 'impact': return `I count about ${late} tasks older than 5 minutes. ${waitingSt.length ? `Robots are lining up at ${waitingSt.join(', ')}.` : 'All stations look slow, none is completely down as far as I can see.'}`;
      case 'robots': { const w = s.s.robots.filter((r) => r.state === 'waiting_station').length; const idle = s.s.robots.filter((r) => r.state === 'idle').length; return w ? `${w} are parked at the station showing WAITING. No error lights.` : `${idle} are sitting with the IDLE icon. No error lights — except R-11 by aisle D, that one shows E-STOP.`; }
      case 'changes': return 'Not that I know of. I don’t see software releases — engineering would know.';
      case 'people': return 'The cleaning crew went through aisle D about 20 minutes ago. I think they’re out now. R-11 stopped around then.';
      case 'scope': return waitingSt.length ? `Mostly around ${waitingSt.join(', ')}.` : 'Everywhere — all stations are slow.';
      case 'restart': return 'Uh — I’m not allowed to restart anything, and I don’t think we should without knowing why.';
      case 'logs': return 'I don’t have access to logs. You can see them in your console.';
      case 'bad': return 'Yes, we are falling behind on the outbound cutoff.';
      default: return '';
    }
  }

  // ------------------------------------------------------------- timed events
  function safeDraw() { if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) { pendingDraw = true; toast('New message from operations (see Comms).'); return; } draw(); }
  let pendingDraw = false;
  function tick() {
    if (!o || o.closed) return;
    if (pendingDraw && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) { pendingDraw = false; safeDraw(); }
    const s = sim(); const e = el();
    if (!o.flags) o.flags = {};
    if (!o.ackAt && e > 240 && !o.flags.noAck) { o.flags.noAck = true; msg('ops', 'Dana', 'Hello? Is anyone looking at this?'); safeDraw(); }
    if (e > 180 && !o.flags.r11) { o.flags.r11 = true; msg('ops', 'Dana', 'Also — R-11 has been stopped near aisle D since the cleaning crew came through. Not sure if related.'); safeDraw(); }
    const lastUpd = o.updates.length ? o.updates[o.updates.length - 1].t : o.reportedAt;
    if (o.ackAt && s.s.t - lastUpd > 600 && s.s.t - o.lastOpsPing > 600) { o.lastOpsPing = s.s.t; msg('ops', 'Dana', 'Any update? My supervisor is asking how long this will take.'); safeDraw(); }
    for (const c of o.commitments) if (!c.met && !c.missed && s.s.t > c.due + 60) { c.missed = true; msg('ops', 'Dana', `You said you would update by ${T(c.due)} — anything new?`); safeDraw(); }
    if (o.capstone && o.firstMitigation && !o.second && s.s.t > o.firstMitigation + 480) {
      o.second = { at: s.s.t }; s.inject('chargerFault', { charger: 'C-1' });
      for (const id of ['R-02', 'R-08']) { const r = s.robot(id); if (!r.taskId && r.state === 'idle') r.battery = 24; }
      msg('ops', 'Dana', 'New one: R-02 and R-08 went to charge but their batteries keep dropping. Is that the same problem?'); draw();
    }
  }

  // ------------------------------------------------------------- tabs
  function commsTab() {
    return `<div class="chat" id="chat">${o.msgs.map((m) => `<div class="msg ${m.kind === 'me' ? 'me' : ''}"><div class="who">${esc(m.clock)} · ${esc(m.who)}</div>${esc(m.text)}${m.score ? `<div class="small">${m.score}</div>` : ''}</div>`).join('')}</div>
      <h4>Ask operations a focused question</h4><div class="btnrow">${QUESTIONS.map((q) => `<button class="btn small" data-ask="${q.id}" ${o.asked.includes(q.id) ? 'aria-pressed="true"' : ''}>${esc(q.q)}${o.asked.includes(q.id) ? ' ✓' : ''}</button>`).join('')}</div>
      <h4>Send an update</h4><label>Template <select id="tpl">${Object.keys(TEMPLATES).map((k) => `<option value="${k}">${{ ack: 'Initial acknowledgment', impact: 'Current impact & investigation', mitigation: 'Mitigation in progress', observing: 'Recovery under observation', resolved: 'Resolved with follow-up actions' }[k]}</option>`).join('')}</select></label>
      <textarea id="upd" rows="4">${esc(fill(TEMPLATES.ack))}</textarea>
      <div class="btnrow"><button class="btn primary" data-send>Send to operations</button><span class="muted small">Replace every [bracket]. Do not invent an ETA; commit to an update time instead.</span></div>`;
  }
  function fill(t) { const s = sim(); return t.replace('[N]', String(s.queueDepth())).replace('[X]', String(Math.round(s.oldestOpenAge() / 60))); }
  function investigateTab() {
    const ids = [...sc.diagnostics, ...sc.tests, 'comp_estop_r11'];
    return `<p>${rich('Gather evidence. Predict before each result. Watch for distractions: an alarm can be misleading, and a second fault can be unrelated.')}</p>
      <div class="diags">${ids.map((id) => { const d = id === 'comp_estop_r11' ? { ...DIAGNOSTICS.comp_estop, label: 'Check R-11 E-stop circuit' } : DIAGNOSTICS[id] || SANDBOX_TESTS[id]; const runs = o.evidence.filter((e) => e.source === id); return `<div class="diag"><div class="diag-h"><b>${esc(d.label)}</b> ${runs.length ? `<span class="tag ok">ran ×${runs.length}</span>` : ''}</div>${runs.length ? `<p class="small">${esc(runs[runs.length - 1].summary)}</p>` : ''}<div data-slot="${id}"><button class="btn small" data-run="${id}">Run</button></div></div>`; }).join('')}</div>
      <h4>Evidence</h4><ul class="evlist">${o.evidence.map((e) => `<li><b>${e.id}</b> ${e.clock} ${esc(e.label)}: ${esc(e.summary)}</li>`).join('') || '<li class="muted">none yet</li>'}</ul>`;
  }
  function scopeTab() {
    const sv = o.scope || { stations: [], services: [], robots: '', zones: [], impact: '' };
    return `<p>Determine scope and impact before choosing a mitigation.</p>
      <fieldset><legend>Affected stations</legend>${['P-1', 'P-2', 'P-3', 'P-4'].map((x) => `<label class="chip"><input type="checkbox" data-sc="stations" value="${x}" ${sv.stations.includes(x) ? 'checked' : ''}> ${x}</label>`).join('')}<label class="chip"><input type="checkbox" data-sc="stations" value="all" ${sv.stations.includes('all') ? 'checked' : ''}> all equally</label></fieldset>
      <fieldset><legend>Implicated services</legend>${['inventory-service', 'fleet-manager', 'station-service', 'task-scheduler', 'robot-gateway', 'none (hardware)'].map((x) => `<label class="chip"><input type="checkbox" data-sc="services" value="${x}" ${sv.services.includes(x) ? 'checked' : ''}> ${x}</label>`).join('')}</fieldset>
      <fieldset><legend>Unrelated issues identified</legend>${['R-11 E-stop', 'AP-1 alarm'].map((x) => `<label class="chip"><input type="checkbox" data-sc="zones" value="${x}" ${sv.zones.includes(x) ? 'checked' : ''}> ${x} is unrelated / separate</label>`).join('')}</fieldset>
      <label>Impact statement (numbers) <textarea id="impactTxt" rows="2">${esc(sv.impact)}</textarea></label><button class="btn" data-savescope>Save scope</button>`;
  }
  function actTab() {
    return `<p class="safety">⚠ Simulated actions by fictional authorized staff. Never reset an E-stop remotely or before the area is confirmed safe.</p>
      ${sim().s.pendingOps.length ? `<p class="pending">⏳ ${sim().s.pendingOps.map((p) => `${esc(p.kind.replace(/_/g, ' '))} (${Math.max(0, Math.round(p.due - sim().s.t))} s)`).join(', ')}</p>` : ''}
      ${sc.operations.map(([op, p], i) => `<div class="op"><div class="diag-h"><b>${esc(OPERATIONS[op].label)}</b> <span class="muted">${esc(Object.values(p).join(' · '))}</span></div><details class="explain"><summary>Impact · prerequisites · preserve · rollback</summary><p class="small"><b>Impact:</b> ${esc(OPERATIONS[op].impact)}<br><b>Prerequisites:</b> ${esc(OPERATIONS[op].prereq)}<br><b>Preserve:</b> ${esc(OPERATIONS[op].preserve)}<br><b>Rollback:</b> ${esc(OPERATIONS[op].rollback)}<br><b>Limits:</b> ${esc(OPERATIONS[op].limits)}</p></details><button class="btn small ${op === 'preserve_evidence' ? '' : 'warn'}" data-op="${i}">Apply…</button></div>`).join('')}
      ${o.capstone && o.second ? `<div class="op"><b>Second incident tools</b><div class="btnrow"><button class="btn small" data-op2="charger_status">Check charger status</button><button class="btn small" data-op2="redock">Send R-02 to C-3 (test)</button><button class="btn small" data-op2="request_charger_repair">Request charger C-1 inspection</button></div></div>` : ''}
      <h4>Escalate</h4><label>Team <select id="escTeam">${['fleet software engineering', 'inventory/WMS engineering', 'network team', 'station technician', 'facilities', 'robot maintenance'].map((x) => `<option ${o.escalation?.team === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Specific request <textarea id="escText" rows="2">${esc(o.escalation?.text || '')}</textarea></label><div class="chips" id="escEv">${o.evidence.map((e) => `<label class="chip"><input type="checkbox" value="${e.id}" ${(o.escalation?.ev || []).includes(e.id) ? 'checked' : ''}> ${e.id}</label>`).join('')}</div><button class="btn small" data-esc>Send escalation</button>
      <h4>Action log</h4><ul class="evlist">${o.actions.map((a) => `<li>${a.clock} ${esc(a.label)} — ${esc(a.msg)}</li>`).join('') || '<li class="muted">none</li>'}</ul>`;
  }
  function verifyTab() {
    const since = Math.max(o.simStart, ...o.actions.filter((a) => a.ok && a.op !== 'preserve_evidence').map((a) => a.t + (a.pendingFor || 0)));
    return `<p>Observed since last mitigation: <b>${fmtDur(sim().s.t - since)}</b>.</p><div class="btnrow"><button class="btn" data-ff="60">+1 min</button><button class="btn" data-ff="300">+5 min</button><button class="btn primary" data-allchecks>Run all checks</button></div>
      <table class="checks"><tbody>${sc.checks.map((id) => { const r = o.checks[id]; return `<tr><td>${esc(CHECKS[id].label)}</td><td>${r ? `${statusPill(r.pass)} <span class="small">${esc(r.detail)}</span>` : '<span class="muted">not run</span>'}</td></tr>`; }).join('')}${o.capstone && o.second ? `<tr><td>Second incident: no docked robot at 0 A</td><td>${sim().metric('chargeFaults') === 0 ? statusPill(true) : statusPill(false)}</td></tr>` : ''}</tbody></table>
      <p class="small muted">A mitigation that improves one metric can worsen another — check error rates, station queues and neighbouring robots, not just the queue.</p>
      <h4>Close the incident</h4><p class="small">Closing requires a final “Resolved” update in Comms. Closing while checks fail is premature closure.</p><button class="btn primary" data-close>Close incident & get feedback</button>`;
  }
  function reviewTab() {
    const r = o.score; const truth = sc.truth[o.variant];
    return `<div class="reveal"><h4>What was happening</h4><p><b>${esc(sc.hypotheses.find((h) => h.id === truth.cause).label)}</b></p><p>${esc(truth.explanation)}</p><p><b>Mitigation tradeoff in this variant:</b> ${esc(truth.tradeoff)}</p><p><b>Right team to escalate to:</b> ${esc(truth.team)}</p></div>
      <div class="grid2"><div class="tile"><b>Technical decisions</b><div class="val">${r.tech}/50</div>${r.techNotes.map((n) => `<p class="small ${n.ok ? 'ok' : 'ded'}">${n.ok ? '✓' : '−'} ${esc(n.t)}</p>`).join('')}</div>
      <div class="tile"><b>Communication</b><div class="val">${r.comm}/50</div>${r.commNotes.map((n) => `<p class="small ${n.ok ? 'ok' : 'ded'}">${n.ok ? '✓' : '−'} ${esc(n.t)}</p>`).join('')}</div></div>
      ${r.critical.length ? `<div class="critical">${r.critical.map((c) => `<p>✕ ${esc(c)}</p>`).join('')}</div>` : ''}
      <p class="muted small">Speed is not rewarded beyond acknowledging within ~3 minutes and keeping your update commitments. A polished message about an unsupported conclusion scores low on technical accuracy.</p>
      <div class="btnrow"><button class="btn" data-export>Export incident summary</button><button class="btn primary" data-new>Start a new live incident</button></div>`;
  }

  function draw() {
    if (!o) {
      root.innerHTML = `<div class="card"><span class="eyebrow">Walkthrough 6 ${SIM_NOTE}</span><h2>Live operations support</h2>
        <p>${rich('Operations will report a problem. An incident clock (facility time) starts. Acknowledge, ask focused questions, determine scope, mitigate safely, communicate progress, escalate with evidence, verify recovery and close with a clear summary.')}</p>
        <ul class="small"><li>Distractions include a misleading alarm, an unrelated second robot fault, incomplete information, and an operator asking for updates.</li><li>One mitigation option improves one metric while worsening another.</li><li>Technical decisions and communication are scored separately. Speed alone is never rewarded.</li></ul>
        <div class="btnrow"><button class="btn primary" data-start="0">Start incident (≈ 20–25 min)</button><button class="btn" data-start="1">Optional capstone (≈ 40 min, a second incident arrives)</button></div></div>`;
      return;
    }
    root.innerHTML = `<div class="card"><div class="inc-head"><div><span class="eyebrow">Walkthrough 6 · live ops ${o.capstone ? '· capstone' : ''} ${SIM_NOTE}</span><h2>${esc(sc.title)}</h2></div><div class="inc-clock"><span>Incident clock</span><b data-live="clk">${fmtDur(el())}</b><span class="small muted">${o.ackAt ? `acknowledged after ${fmtDur(o.ackAt - o.reportedAt)}` : 'not acknowledged'}</span></div></div>
      <div class="btnrow" role="tablist">${[['comms', `Comms (${o.msgs.length})`], ['investigate', 'Investigate'], ['scope', 'Scope & impact'], ['act', 'Mitigate & escalate'], ['verify', 'Verify & close'], ...(o.closed ? [['review', 'Feedback']] : [])].map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div>${{ comms: commsTab, investigate: investigateTab, scope: scopeTab, act: actTab, verify: verifyTab, review: reviewTab }[tab]()}</div></div>`;
    const ch = root.querySelector('#chat'); if (ch) ch.scrollTop = ch.scrollHeight;
  }

  // ------------------------------------------------------------- scoring
  function finish() {
    const s = sim(); const truth = sc.truth[o.variant]; const res = sc.resolved(s, o.variant);
    const tn = []; const cn = []; const critical = []; let tech = 0, comm = 0;
    const add = (arr, ok, pts, t) => { arr.push({ ok, t: ok ? t : `${t} (−${pts})` }); return ok ? pts : 0; };
    const disc = o.evidence.filter((e) => truth.discriminators.includes(e.source));
    tech += add(tn, disc.length > 0, 10, `Collected discriminating evidence${disc.length ? ' (' + disc.map((e) => e.id).join(', ') + ')' : ''}`);
    tech += add(tn, res.fixed || res.mitigated, 15, res.fixed ? 'Cause corrected' : res.mitigated ? 'Impact mitigated' : 'Cause/impact addressed');
    const wrong = o.actions.filter((a) => a.ok && ((a.op === 'request_ap_repair') || (a.op === 'restart_service') || (a.op === 'set_concurrency' && a.params.value > 4)));
    tech += add(tn, !wrong.length, 5, wrong.length ? `Avoided unnecessary/disruptive actions — took: ${wrong.map((a) => a.label).join('; ')}` : 'No unnecessary or disruptive actions (did not chase the misleading AP-1 alarm)');
    const r11 = o.actions.some((a) => a.op === 'request_estop_inspection');
    tech += add(tn, r11, 3, 'Handled the unrelated R-11 E-stop through a local inspection request (separately)');
    const failing = sc.checks.filter((id) => !o.checks[id]?.pass);
    tech += add(tn, !failing.length, 12, failing.length ? `Recovery verified — not run/failing: ${failing.map((id) => CHECKS[id].label).join('; ')}` : 'All recovery checks passed');
    for (const id of failing) queueCheckReview(sc.title, id);
    const escOk = o.escalation && o.escalation.team === truth.team && (o.escalation.ev || []).some((id) => disc.some((e) => e.id === id)) && o.escalation.text.length > 25;
    tech += add(tn, !!escOk || (res.fixed && !o.escalation), 5, escOk ? 'Escalated to the right team with evidence and a specific request' : 'Useful escalation (right team + discriminating evidence + specific request)');
    // communication
    const ackDelay = o.ackAt ? o.ackAt - o.reportedAt : null;
    comm += add(cn, ackDelay != null && ackDelay <= 180, 10, ackDelay == null ? 'Acknowledged the report' : `Acknowledged within ~3 min (${fmtDur(ackDelay)})`);
    const nonFinal = o.updates.filter((u) => u.kind !== 'resolved');
    const avg = nonFinal.length ? nonFinal.reduce((a, u) => a + u.pct, 0) / nonFinal.length : 0;
    const uq = Math.round(avg * 15); comm += uq; cn.push({ ok: uq >= 11, t: `Update quality ${uq}/15 (average of checklist scores for ${nonFinal.length} update(s))` });
    const commits = o.commitments; const met = commits.filter((c) => c.met).length;
    comm += add(cn, commits.length > 0 && met === commits.length, 10, commits.length ? `Update commitments met: ${met}/${commits.length}` : 'Committed to next-update times');
    const focused = o.asked.filter((id) => QUESTIONS.find((q) => q.id === id).focused).length; const unf = o.asked.length - focused;
    comm += add(cn, focused >= 3 && unf === 0, 5, `Focused questions: ${focused}, unfocused: ${unf}`);
    const fin = o.updates.find((u) => u.kind === 'resolved');
    comm += add(cn, fin && fin.pct >= 0.75, 10, fin ? `Closure summary checklist ${Math.round(fin.pct * 100)}%` : 'Closure summary sent');
    for (const u of o.updates) for (const c of u.critical) critical.push(`Update at ${u.clock}: ${c.msg}`);
    if (failing.length) critical.push('Closed while recovery checks were failing or not run (premature closure).');
    if (critical.length) { queueDocReview('communication'); }
    o.score = { tech: Math.min(50, tech), comm: Math.min(50, comm), techNotes: tn, commNotes: cn, critical };
    const inc = s.s.incidents.find((i) => i.id === o.id); if (inc && !failing.length) inc.recoveredAt = s.s.t;
    store.update((st) => { st.ops.push({ id: o.id, variant: o.variant, ended: Date.now(), score: o.score }); st.attempts.push({ id: o.id, scenarioId: SC, title: `W6 · ${sc.title}${o.capstone ? ' (capstone)' : ''}`, walkthrough: 'W6', variant: o.variant, mode: st.settings.mode, started: Date.now(), ended: Date.now(), total: o.score.tech + o.score.comm, skills: { communication: Math.round(o.score.comm * 2), diagnosis: Math.round(o.score.tech * 2), verification: failing.length ? 40 : 100 }, critical: critical.map(() => 'ops'), cats: [{ name: 'Technical decisions', got: o.score.tech, max: 50, notes: tn.map((n) => ({ pts: n.ok ? 0 : -1, why: n.t })) }, { name: 'Communication', got: o.score.comm, max: 50, notes: cn.map((n) => ({ pts: n.ok ? 0 : -1, why: n.t })) }], summary: { observed: o.msgs.slice(0, 1).map((m) => m.text), suspected: [], tests: o.evidence.map((e) => `${e.label}: ${e.summary}`).slice(0, 5), diagnosis: null, actions: o.actions.filter((a) => a.ok).map((a) => a.label), checks: Object.entries(o.checks).map(([id, r]) => `${r.pass ? 'PASS' : 'FAIL'} ${CHECKS[id].label}`), escalation: o.escalation } }); st.walkthroughs.W6 = { done: true }; });
  }

  // ------------------------------------------------------------- events
  root.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.start) { start(b.dataset.start === '1'); return; }
    if (b.dataset.new !== undefined) { o = null; store.update((st) => { st.opsCurrent = null; st.opsSnap = null; }); draw(); return; }
    if (b.dataset.tab) { tab = b.dataset.tab; draw(); return; }
    if (b.dataset.ask) { const q = QUESTIONS.find((x) => x.id === b.dataset.ask); const dup = o.asked.includes(q.id); if (!dup) o.asked.push(q.id); msg('me', 'You', q.q); msg('ops', 'Dana', dup ? `${answer(q.id)} (You asked that already.)` : answer(q.id)); if (!q.focused) toast('That question is unlikely to help — operations cannot act on it.', 'warn'); persist(); draw(); return; }
    if (b.dataset.send !== undefined) {
      const kind = root.querySelector('#tpl').value; const text = root.querySelector('#upd').value.trim();
      if (/\[[^\]]+\]/.test(text)) { toast('Replace the [bracketed] placeholders first.', 'warn'); return; }
      const s = sim(); const recovered = sc.checks.every((id) => o.checks[id]?.pass);
      const r = scoreUpdate(text, kind, { causeKnown: false, recovered, rootCauseKnown: false, audience: 'ops' });
      const pct = r.max ? r.score / r.max : 0;
      // commitment parsing
      let due = null; const m1 = text.match(/(?:next update|update you|update)\D{0,12}(\d{1,2}):(\d{2})/i); const m2 = text.match(/in (\d+) ?min/i);
      if (m1) { const sec = (+m1[1]) * 3600 + (+m1[2]) * 60 - s.s.clock0; due = sec < s.s.t - 3600 ? sec + 86400 : sec; } else if (m2) due = s.s.t + (+m2[1]) * 60;
      for (const c of o.commitments) if (!c.met && !c.missed && s.s.t <= c.due + 60) c.met = true;
      if (due != null && kind !== 'resolved') o.commitments.push({ due, at: s.s.t });
      if (!o.ackAt) { o.ackAt = s.s.t; const inc = s.s.incidents.find((i) => i.id === o.id); if (inc) inc.ackAt = s.s.t; }
      o.updates.push({ t: s.s.t, clock: s.clockStr(), kind, text, pct, critical: r.critical });
      const fb = `${r.items.map((i) => `${i.ok ? '✓' : '○'} ${i.label}`).join(' · ')}${r.critical.length ? ' · ✕ ' + r.critical.map((c) => c.msg).join(' ') : ''}${r.tips.length ? ' · ' + r.tips.join(' ') : ''}`;
      msg('me', `You → operations (${kind})`, text); o.msgs[o.msgs.length - 1].score = `Checklist ${r.score}/${r.max}: ${fb}`;
      if (kind === 'ack') msg('ops', 'Dana', 'Thanks. Let me know as soon as you know more.');
      else if (r.critical.some((c) => c.code === 'invented_eta')) msg('ops', 'Dana', 'OK, I will tell my supervisor it will be fixed by then.');
      else msg('ops', 'Dana', due ? `Got it, talk at ${T(due)}.` : 'Got it — when will I hear from you next?');
      persist(); draw(); return;
    }
    if (b.dataset.run) {
      const id = b.dataset.run; const d = id === 'comp_estop_r11' ? DIAGNOSTICS.comp_estop : DIAGNOSTICS[id] || SANDBOX_TESTS[id];
      const slot = root.querySelector(`[data-slot="${id}"]`);
      predictionForm(slot, d.predict, ({ choice, label }) => { const r = d.run(sim(), id === 'comp_estop_r11' ? { robot: 'R-11' } : { station: 'P-2' }); const ev = { id: `E${o.evidence.length + 1}`, t: sim().s.t, clock: sim().clockStr(), source: id, label: id === 'comp_estop_r11' ? 'R-11 E-stop' : d.label, summary: r.summary, outcome: r.outcome, correct: choice === r.outcome }; o.evidence.push(ev); if (!ev.correct) { addReview({ kind: 'prediction', skill: 'diagnosis', sig: `ops:${id}:${r.outcome}`, source: 'Live ops', prompt: `Live ops: you predicted “${label}” for “${d.label}”; it showed: ${r.summary} What does this tell you?`, options: [d.predict.options.find((x) => x[0] === r.outcome)?.[1] || r.outcome, label].sort(), answer: [d.predict.options.find((x) => x[0] === r.outcome)?.[1] || r.outcome, label].sort().indexOf(d.predict.options.find((x) => x[0] === r.outcome)?.[1] || r.outcome), explain: r.summary }); } persist(); draw(); }, { cancel: () => draw() });
      return;
    }
    if (b.dataset.savescope !== undefined) { const sv = { stations: [], services: [], zones: [], impact: root.querySelector('#impactTxt').value }; root.querySelectorAll('[data-sc]:checked').forEach((x) => sv[x.dataset.sc].push(x.value)); o.scope = sv; persist(); toast('Scope saved.'); return; }
    if (b.dataset.op) {
      const [op, p] = sc.operations[+b.dataset.op]; const m = OPERATIONS[op];
      if (op !== 'preserve_evidence') { const r = await modal(`${m.label} — confirm`, `<dl class="opconf"><dt>Expected impact</dt><dd>${esc(m.impact)}</dd><dt>Prerequisites</dt><dd>${esc(m.prereq)}</dd><dt>Evidence to preserve</dt><dd>${esc(m.preserve)}</dd><dt>Rollback</dt><dd>${esc(m.rollback)}</dd></dl><p class="small muted">What do you know? What is uncertain? Who needs an update? What would make you stop or escalate?</p>`, [{ label: 'Cancel', value: null }, { label: 'Apply (simulated)', value: 'go', primary: true }]); if (!r?.value) return; }
      const res = sim().operate(op, p);
      o.actions.push({ t: sim().s.t, clock: sim().clockStr(), op, params: p, ok: res.ok, msg: res.msg, label: `${m.label} ${Object.values(p).join(' ')}`, pendingFor: res.pendingFor || 0 });
      if (res.ok && !['preserve_evidence', 'request_estop_inspection'].includes(op) && !o.firstMitigation) o.firstMitigation = sim().s.t;
      toast(res.msg, res.ok ? 'info' : 'warn'); persist(); draw(); return;
    }
    if (b.dataset.op2) { const s = sim(); if (b.dataset.op2 === 'charger_status') { const r = DIAGNOSTICS.charger_status.run(s, {}); o.evidence.push({ id: `E${o.evidence.length + 1}`, t: s.s.t, clock: s.clockStr(), source: 'charger_status', label: 'Charger status', summary: r.summary }); } else { const res = b.dataset.op2 === 'redock' ? s.operate('redock', { robot: 'R-02', charger: 'C-3' }) : s.operate('request_charger_repair', { charger: 'C-1' }); o.actions.push({ t: s.s.t, clock: s.clockStr(), op: b.dataset.op2, params: {}, ok: res.ok, msg: res.msg, label: b.dataset.op2.replace(/_/g, ' '), pendingFor: res.pendingFor || 0 }); toast(res.msg); } persist(); draw(); return; }
    if (b.dataset.esc !== undefined) { const text = root.querySelector('#escText').value.trim(); if (text.length < 15) { toast('Write a specific request.', 'warn'); return; } o.escalation = { team: root.querySelector('#escTeam').value, text, ev: [...root.querySelectorAll('#escEv input:checked')].map((x) => x.value), clock: sim().clockStr() }; msg('me', `You → ${o.escalation.team}`, text); const truth = sc.truth[o.variant]; msg('eng', `${o.escalation.team} (fictional)`, o.escalation.team !== truth.team ? 'We had a look but nothing on our side explains this. Can you share what evidence points to us?' : !o.escalation.ev.length ? 'We can look, but please attach the evidence (timestamps, IDs, what you ruled out).' : 'Thanks — the evidence is clear. We are on it and will confirm before making changes.'); persist(); draw(); return; }
    if (b.dataset.ff) { ctx.fastForward(+b.dataset.ff); tick(); draw(); return; }
    if (b.dataset.allchecks !== undefined) { const since = Math.max(o.simStart, ...o.actions.filter((a) => a.ok && a.op !== 'preserve_evidence').map((a) => a.t + (a.pendingFor || 0))); for (const id of sc.checks) { const r = CHECKS[id].run(sim(), { ...sc.checkCtx(), since, relatedKeys: sc.relatedAlarms }); o.checks[id] = r; } persist(); draw(); return; }
    if (b.dataset.close !== undefined) {
      if (!o.updates.some((u) => u.kind === 'resolved')) { toast('Send a “Resolved with follow-up actions” update first (Comms tab).', 'warn'); return; }
      const failing = sc.checks.filter((id) => !o.checks[id]?.pass);
      if (failing.length) { const r = await modal('Close with failing checks?', `<p>${failing.length} check(s) are failing or not run. Closing now is premature closure and is recorded as a critical issue.</p>`, [{ label: 'Keep working', value: null }, { label: 'Close anyway', value: 'go', danger: true }]); if (!r?.value) return; }
      o.closed = true; finish(); tab = 'review'; persist(); draw(); return;
    }
    if (b.dataset.export !== undefined) { downloadText(`live-ops-${o.id}-simulated.md`, `# Live operations incident (SIMULATED training)\n\n> Fictional facility and staff. Not professional experience.\n\nVariant revealed: ${o.variant}\nTechnical ${o.score.tech}/50 · Communication ${o.score.comm}/50\n\n## Communications\n${o.msgs.map((m) => `- ${m.clock} **${m.who}:** ${m.text}`).join('\n')}\n\n## Evidence\n${o.evidence.map((e) => `- [${e.id}] ${e.clock} ${e.label}: ${e.summary}`).join('\n')}\n\n## Actions\n${o.actions.map((a) => `- ${a.clock} ${a.label}: ${a.msg}`).join('\n')}\n\n## Escalation\n${o.escalation ? `${o.escalation.team}: ${o.escalation.text} (evidence ${o.escalation.ev.join(', ')})` : 'none'}\n`); }
  };
  root.onchange = (e) => { if (e.target.id === 'tpl') { root.querySelector('#upd').value = fill(TEMPLATES[e.target.value]); } };

  if (o) ensureSim();
  draw();
  return { refresh() { if (!o) return; tick(); const c = root.querySelector('[data-live="clk"]'); if (c) c.textContent = fmtDur(el()); }, unmount() { if (o) persist(); } };
}
void pad;
