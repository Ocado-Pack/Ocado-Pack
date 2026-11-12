// The core learning loop: Observe → Predict → Inspect → Test → Interpret → Act → Verify → Document → Review
// Works on the shared simulation; all evidence comes from the engine at the moment it is collected.
import { esc, fmtDur, uid } from '../util.js';
import { Sim } from '../sim/engine.js';
import { SCENARIO_MAP, startAttempt } from '../sim/scenarios.js';
import { DIAGNOSTICS, SANDBOX_TESTS, OPERATIONS, CHECKS, sandboxAction } from '../sim/catalog.js';
import { store, save, addReview } from '../store.js';
import { rich, explainBlock, predictionForm, evidenceTable, toast, modal, caption, statusPill, downloadText, SIM_NOTE } from './common.js';
import { scoreDocument, fieldChecks, RULES_LIMITS, hasTimeTz } from '../docs-rules.js';
import { queuePredictionReview, queueDiscriminatorReview, queueCheckReview, queueDocReview } from '../review-templates.js';
import { interviewBlock } from './interview.js';

export const STAGES = ['Observe', 'Predict', 'Inspect', 'Test', 'Interpret', 'Act', 'Verify', 'Document', 'Review'];
const COACH = {
  Observe: 'Look before you touch. Note what you can see: the robot\'s status label, where it is, queue and alarm numbers. A [[symptom]] is what you observe — not the cause.',
  Predict: 'Write down possible causes ([[hypothesis]]) and rank them. A good hypothesis predicts something you can check. Say what evidence would support or contradict your top one.',
  Inspect: 'Run read-only checks. Before each result is shown you must predict it. Prefer checks whose results differ between your hypotheses.',
  Test: 'Now separate the hypotheses. Ask: does the symptom follow the robot, the place, or the software record? Sandbox tests change nothing in production.',
  Interpret: 'For each hypothesis, mark supported / contradicted / untested and link the evidence. Only call a cause confirmed if a discriminating result supports it.',
  Act: 'Choose the least disruptive action that addresses the cause or reduces impact. Preserve evidence before anything that erases state. Predict the fleet impact first.',
  Verify: 'A successful command is not recovery. Run every check, observe for at least 5 minutes, and make sure a full task completes.',
  Document: 'The draft only contains facts you collected. Edit it, keep hypotheses labelled, and state root-cause status honestly.',
  Review: 'Compare your reasoning with what actually happened. Deductions are explained; mistakes go to your review queue.',
};
const GENERIC_HINTS = {
  Observe: ['Start with the target robot or area named in the report.', 'Capture the robot status and the queue/alarm numbers — they show impact.', 'Demonstration: press “Capture robot status label” — it records what the 3D label shows, as evidence E1.'],
  Predict: ['List more than one cause. Beginners often lock onto the first idea.', 'For each candidate, ask: what would I expect to see if this were true?', 'Demonstration: e.g. “If it is an obstruction, the obstacle sensor will read < 1 m and the camera will show an object.”'],
  Interpret: ['Look at each result: which hypothesis does it support, which does it contradict?', 'A result that is the same under every hypothesis does not discriminate.', 'Demonstration: a clear obstacle sensor CONTRADICTS “obstruction”; link that evidence to the obstruction hypothesis and mark it contradicted.'],
  Act: ['Pick the action that matches the cause you confirmed; preserve evidence before restarts/rollbacks.', 'Mitigation now (reduce impact) and permanent fix later can be different actions.', 'Demonstration: open “Explain this action” on any operation to see prerequisites, what to preserve and the rollback.'],
  Verify: ['Run each check; some need time to pass.', 'Fast-forward the observation period; intermittent problems come back.', 'Demonstration: “Run all checks” after fast-forwarding 5 minutes.'],
  Document: ['Every claim should cite [E#] evidence.', 'Root-cause status must match what you confirmed.', 'Demonstration: the auto-draft inserts [E#] citations from your notebook.'],
};

const REQ_FIELDS = [
  ['title', 'Incident title and ID', 'Searchable record.'],
  ['impact', 'Operational impact (quantified)', 'Readers need scale.', (v) => /\d/.test(v) && v.length > 10],
  ['affected', 'Affected robots / orders / stations / zones', 'Scope.'],
  ['timeline', 'Detection time and timeline with time zone', 'Ordering and alignment.', hasTimeTz],
  ['symptoms', 'Symptoms', 'What was observed.'],
  ['tests', 'Tests performed and results', 'What was ruled in/out.'],
  ['mitigation', 'Mitigation', 'What reduced impact.'],
  ['recovery', 'Recovery checks', 'Proof of recovery.'],
  ['rootCause', 'Root-cause status statement', 'Confirmed / suspected / unknown.'],
  ['followups', 'Follow-up actions and owners', 'Prevents recurrence.', (v) => /(owner|team|engineer|support|me|I )/i.test(v)],
  ['questions', 'Questions for engineering', 'Open items.'],
];

// -------------------------------------------------------------------------------- lifecycle
export function newAttempt(ctx, scenarioId, opts = {}) {
  const seed = opts.seed ?? (Date.now() % 1000000007);
  const { sim, variant, info } = startAttempt(scenarioId, seed, opts.variant);
  const mode = opts.mode || store.get().settings.mode;
  const a = { id: uid('att'), scenarioId, variant, seed, mode, stage: 0, reached: 0, started: Date.now(), simStart: sim.s.t, info,
    evidence: [], hyps: { ranked: [], why: '', confirmWhat: '' }, hypStatus: {}, diagnosis: null, fleetImpact: null, actions: [], mitigationAt: null,
    checks: {}, notebook: null, hints: {}, escalation: null, done: false, interview: {} };
  store.update((st) => { st.current = { attempt: a, snapshot: null }; });
  ctx.setSim(sim);
  persist(ctx, a);
  return a;
}
export function persist(ctx, a) {
  const st = store.get();
  if (!st.current || st.current.attempt.id !== a.id) st.current = { attempt: a, snapshot: null };
  st.current.attempt = a;
  try { const s = ctx.sim.snapshot(); s.logs = s.logs.slice(-2500); st.current.snapshot = s; } catch { st.current.snapshot = null; }
  save();
}
export function resumeAttempt(ctx) {
  const cur = store.get().current; if (!cur) return null;
  const a = cur.attempt;
  if (ctx.sim?.__attemptId === a.id) return a;
  let sim;
  if (cur.snapshot) sim = Sim.fromSnapshot(cur.snapshot);
  else sim = startAttempt(a.scenarioId, a.seed, a.variant).sim;
  sim.__attemptId = a.id;
  ctx.setSim(sim);
  return a;
}

// -------------------------------------------------------------------------------- render
export function renderInvestigation(root, ctx) {
  const a = resumeAttempt(ctx);
  if (!a) { root.innerHTML = `<div class="card"><h2>No active incident</h2><p>Start one from a walkthrough.</p><a class="btn primary" href="#/home">Go to start</a></div>`; return {}; }
  ctx.sim.__attemptId = a.id;
  const sc = SCENARIO_MAP[a.scenarioId];
  const sim = () => ctx.sim;
  const evOpts = () => a.evidence.map((e) => `<label class="chip"><input type="checkbox" value="${e.id}"> ${e.id}</label>`).join('');
  const T = sc.target || {};

  function addEvidence(e) {
    const id = `E${a.evidence.length + 1}`;
    const rec = { id, t: sim().s.t, clock: sim().clockStr(), stage: STAGES[a.stage], ...e };
    a.evidence.push(rec); persist(ctx, a);
    return rec;
  }
  ctx.addEvidence = (e) => { const r = addEvidence({ source: 'console', ...e }); toast(`Added ${r.id} to the incident notebook`); draw(); return r; };

  function go(i) { a.stage = i; a.reached = Math.max(a.reached, i); persist(ctx, a); draw(); caption(`${STAGES[i]}: ${COACH[STAGES[i]].replace(/\[\[|\]\]/g, '')}`); root.scrollTop = 0; root.closest('.panel')?.scrollTo?.(0, 0); }

  function header() {
    const el = sim().s.t - a.simStart;
    return `<div class="inc-head">
      <div><span class="eyebrow">${sc.walkthrough === 'first' ? 'First guided incident' : sc.walkthrough} · ${esc(a.mode)} mode ${SIM_NOTE}</span>
      <h2>${esc(sc.title)}</h2><p class="brief">📻 ${esc(sc.brief)}</p></div>
      <div class="inc-clock" aria-live="off"><span>Incident clock</span><b data-live="incclock">${fmtDur(el)}</b><span class="muted small">facility time ${sim().clockStr()}</span></div>
    </div>
    <ol class="stepper" aria-label="Investigation stages">${STAGES.map((s, i) => `<li class="${i === a.stage ? 'cur' : ''} ${i < a.reached || (a.done && i <= a.reached) ? 'done' : ''}"><button ${i > a.reached ? 'disabled' : ''} data-stage="${i}" aria-current="${i === a.stage ? 'step' : 'false'}">${i < a.reached ? '✓ ' : ''}${s}</button></li>`).join('')}</ol>`;
  }
  function coach() {
    const stg = STAGES[a.stage];
    const hintsSrc = sc.hints?.[stg.toLowerCase()] || GENERIC_HINTS[stg];
    const lvl = a.hints[stg] || 0;
    if (a.mode === 'assessment' && stg !== 'Review') return `<div class="coach assess"><b>Assessment mode:</b> no hints or coaching until you finish. You will get full feedback at Review.</div>`;
    const guided = a.mode === 'guided' ? `<p>${rich(COACH[stg])}</p>` : `<p class="muted">Objective: ${rich(COACH[stg].split('. ')[0])}.</p>`;
    const hintHtml = hintsSrc ? `<div class="hints">${hintsSrc.slice(0, lvl).map((h, i) => `<p class="hint"><b>Hint ${i + 1}${i === 0 ? ' — where to look' : i === 1 ? ' — what relationship matters' : ' — demonstration'}:</b> ${rich(h)}</p>`).join('')}${lvl < 3 ? `<button class="btn small" data-hint>${lvl === 0 ? 'Need a hint?' : 'Next hint'}</button>` : ''}</div>` : '';
    return `<aside class="coach" aria-label="Coach">${guided}${hintHtml}<p class="muted small">Hints are a normal part of learning; using them does not reduce your score.</p></aside>`;
  }

  // ---------------------------------------------------------------- stage bodies
  function bodyObserve() {
    const obs = a.evidence.filter((e) => e.source.startsWith('observe'));
    return `<div class="card"><h3>What can you see right now?</h3>
      <p>${rich('Use the 3D view (click a robot to focus it) and capture observations. These are facts about the present, not explanations.')}</p>
      <div class="btnrow">
        ${T.robot ? `<button class="btn" data-focus="${T.robot}">Focus 3D on ${T.robot}</button><button class="btn" data-obs="label">Capture ${T.robot} status label</button>` : ''}
        ${T.aisle ? `<button class="btn" data-focus-aisle="${T.aisle}">Focus Aisle ${T.aisle}</button>` : ''}
        ${T.station ? `<button class="btn" data-focus-station="${T.station}">Focus ${T.station}</button>` : ''}
        <button class="btn" data-obs="dash">Capture dashboard numbers</button>
        <button class="btn" data-obs="alarms">Capture active alarms</button>
      </div>
      <label>Your own observation <textarea id="obsText" rows="2" placeholder="e.g. R-07 is parked mid-aisle; other robots are moving in Aisle B"></textarea></label>
      <button class="btn" data-obs="text">Add observation</button>
      ${obs.length ? `<h4>Captured</h4><ul class="evlist">${obs.map((e) => `<li><b>${e.id}</b> <span class="muted">${e.clock}</span> ${esc(e.summary)}</li>`).join('')}</ul>` : ''}
      <div class="next"><button class="btn primary" data-next ${obs.length ? '' : 'disabled'}>Continue to Predict</button>${obs.length ? '' : '<span class="muted small">Capture at least one observation.</span>'}</div></div>`;
  }
  function bodyPredict() {
    const r = a.hyps.ranked;
    return `<div class="card"><h3>What could explain this? Rank up to three.</h3>
      <p>${rich('Pick candidate causes. You will test them; it is fine to be wrong. Each [[hypothesis]] should predict different evidence.')}</p>
      <div class="hyplist">${sc.hypotheses.map((h) => { const i = r.indexOf(h.id); return `<button class="hyp ${i >= 0 ? 'on' : ''}" data-hyp="${h.id}" aria-pressed="${i >= 0}">${i >= 0 ? `<b>#${i + 1}</b> ` : ''}${esc(h.label)}</button>`; }).join('')}</div>
      <label>Why is your #1 the most likely? <textarea id="hwhy" rows="2">${esc(a.hyps.why)}</textarea></label>
      <label>What evidence would support or contradict your #1? <textarea id="hwhat" rows="2">${esc(a.hyps.confirmWhat)}</textarea></label>
      <div class="next"><button class="btn primary" data-next>Save & continue to Inspect</button></div></div>`;
  }
  function diagCard(id, kind) {
    const d = DIAGNOSTICS[id] || SANDBOX_TESTS[id];
    if (!d) return '';
    const runs = a.evidence.filter((e) => e.source === id);
    return `<div class="diag" id="d-${id}"><div class="diag-h"><b>${esc(d.label)}</b> ${kind === 'test' && SANDBOX_TESTS[id] ? '<span class="tag">sandbox</span>' : '<span class="tag">read-only</span>'} ${runs.length ? `<span class="tag ok">ran ×${runs.length}</span>` : ''}</div>
      ${explainBlock({ ...d, ops: d.ops })}
      <div class="diag-run" data-slot="${id}">${runs.length ? `<p class="muted small">Last result (${runs[runs.length - 1].id}): ${esc(runs[runs.length - 1].summary)}</p>` : ''}<button class="btn" data-run="${id}">${runs.length ? 'Run again' : 'Run'}</button></div></div>`;
  }
  function bodyInspect() {
    const n = a.evidence.filter((e) => e.stage === 'Inspect' && e.predicted).length;
    return `<div class="card"><h3>Inspect (read-only)</h3><p>${rich('These checks change nothing. Each asks for your prediction first. Re-running a check gives a fresh reading of the live system, but repeated identical checks without a reason count as unnecessary.')}</p>
      <div class="diags">${sc.diagnostics.map((d) => diagCard(d, 'inspect')).join('')}</div>
      <p class="muted small">Tip: the <a href="#/w2">software console</a> (logs, order tracing) also works on this incident — it can add log lines here as evidence.</p>
      <div class="next"><button class="btn primary" data-next ${n >= 2 ? '' : 'disabled'}>Continue to Test</button>${n >= 2 ? '' : '<span class="muted small">Run at least two inspections.</span>'}</div></div>`;
  }
  function bodyTest() {
    const ids = [...sc.tests, ...(sc.extraTests || [])];
    const n = a.evidence.filter((e) => ids.includes(e.source)).length;
    return `<div class="card"><h3>Test to separate the hypotheses</h3><p>${rich('A useful test gives different results for different causes. Sandbox tests run on a cloned copy of the system — production is untouched.')}</p>
      <div class="diags">${ids.map((d) => diagCard(d, 'test')).join('')}</div>
      <div class="next"><button class="btn primary" data-next ${n >= 1 ? '' : 'disabled'}>Continue to Interpret</button>${n >= 1 ? '' : '<span class="muted small">Run at least one test.</span>'}</div></div>`;
  }
  function bodyInterpret() {
    const st = a.hypStatus;
    const d = a.diagnosis || {};
    return `<div class="card"><h3>Interpret the evidence</h3>
      <div class="evref"><h4>Your evidence</h4><ul class="evlist">${a.evidence.map((e) => `<li><b>${e.id}</b> <span class="muted">${e.clock}</span> ${esc(e.label || e.source)}: ${esc(e.summary)}</li>`).join('')}</ul></div>
      <h4>Hypotheses</h4>
      ${sc.hypotheses.map((h) => { const s = st[h.id] || {}; return `<fieldset class="hypfs" data-h="${h.id}"><legend>${esc(h.label)}</legend>
        <div class="seg">${['untested', 'supported', 'contradicted'].map((v) => `<label><input type="radio" name="hs-${h.id}" value="${v}" ${(s.status || 'untested') === v ? 'checked' : ''}> ${v === 'supported' ? '▲ supported' : v === 'contradicted' ? '▼ contradicted' : '• untested'}</label>`).join('')}</div>
        <div class="chips">${a.evidence.map((e) => `<label class="chip"><input type="checkbox" value="${e.id}" ${(s.evidence || []).includes(e.id) ? 'checked' : ''}> ${e.id}</label>`).join('')}</div></fieldset>`; }).join('')}
      <h4>Diagnosis</h4>
      <label>Cause <select id="dcause"><option value="">— Not confirmed yet —</option>${sc.hypotheses.map((h) => `<option value="${h.id}" ${d.cause === h.id ? 'selected' : ''}>${esc(h.label)}</option>`).join('')}</select></label>
      <label>Scope <select id="dscope"><option value="">—</option><option value="individual" ${d.scope === 'individual' ? 'selected' : ''}>Individual robot/component</option><option value="shared" ${d.scope === 'shared' ? 'selected' : ''}>Shared (place, infrastructure, software)</option></select></label>
      <label>Confidence <select id="dconf">${['low', 'medium', 'high'].map((c) => `<option ${d.confidence === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <div><span class="muted small">Evidence that supports this diagnosis:</span><div class="chips" id="devid">${a.evidence.map((e) => `<label class="chip"><input type="checkbox" value="${e.id}" ${(d.evidence || []).includes(e.id) ? 'checked' : ''}> ${e.id}</label>`).join('')}</div></div>
      <div class="next"><button class="btn primary" data-next>Save & continue to Act</button></div></div>`;
  }
  function bodyAct() {
    const fi = sc.fleetImpact;
    const needFI = fi && !a.fleetImpact;
    const pend = sim().s.pendingOps;
    return `<div class="card"><h3>Act: mitigate safely</h3>
      <p class="safety">⚠ ${rich('All physical work here is performed by fictional staff following a simulated procedure. In a real facility follow your employer-approved procedures; never bypass interlocks, defeat protective devices, enter an active robot area, or work on energized equipment.')}</p>
      ${fi ? `<div class="fi ${a.fleetImpact ? 'done' : ''}"><h4>Predict the fleet impact</h4>${a.fleetImpact ? `<p>You predicted: “${esc(a.fleetImpact.label)}”. ${a.fleetImpact.sandbox ? `<br><b>Sandbox result:</b> ${esc(a.fleetImpact.sandbox)}` : ''}</p>${fi.sandbox && !a.fleetImpact.sandbox ? '<button class="btn small" data-fisandbox>Check it in the sandbox</button>' : ''}${fi.answer ? `<p class="muted small">Reference answer: ${esc(fi.options.find((o) => o[0] === fi.answer)[1])}</p>` : ''}` : `<div id="fiSlot"></div>`}</div>` : ''}
      ${pend.length ? `<p class="pending">⏳ In progress: ${pend.map((p) => `${esc(p.kind.replace(/_/g, ' '))} (${Math.max(0, Math.round(p.due - sim().s.t))} s)`).join(', ')} — use the speed controls to fast-forward.</p>` : ''}
      <div class="ops ${needFI ? 'locked' : ''}">${needFI ? '<p class="muted">Answer the fleet-impact prediction to unlock isolation and rerouting actions.</p>' : ''}
      ${sc.operations.map(([op, p], i) => { const m = OPERATIONS[op]; const lockable = needFI && ['isolate_robot', 'restrict_zone', 'reroute_station'].includes(op); return `<div class="op"><div class="diag-h"><b>${esc(m.label)}</b> <span class="muted">${esc(Object.values(p).join(' · '))}</span></div>${explainBlock(m, true)}<button class="btn ${op === 'preserve_evidence' ? '' : 'warn'}" data-op="${i}" ${lockable ? 'disabled' : ''}>${op === 'preserve_evidence' ? 'Preserve' : 'Request / apply…'}</button></div>`; }).join('')}
      <div class="op"><div class="diag-h"><b>Dispatch a verification test task</b></div>${explainBlock(OPERATIONS.dispatch_test_task, true)}${T.robot ? `<button class="btn" data-testtask>Send test task to ${T.robot}</button>` : '<p class="muted small">Not robot-specific in this incident.</p>'}</div>
      <div class="op"><div class="diag-h"><b>Escalate to engineering / another team</b></div><p class="muted small">Escalate with a specific request and evidence. Escalation is an action, not a failure.</p>
        <label>Team <select id="escTeam"><option>fleet software engineering</option><option>inventory/WMS engineering</option><option>network team</option><option>station technician</option><option>facilities</option><option>robot maintenance</option></select></label>
        <label>Request <textarea id="escText" rows="2" placeholder="What do you need them to do, and why?">${esc(a.escalation?.text || '')}</textarea></label>
        <div class="chips" id="escEv">${a.evidence.map((e) => `<label class="chip"><input type="checkbox" value="${e.id}" ${(a.escalation?.evidence || []).includes(e.id) ? 'checked' : ''}> ${e.id}</label>`).join('')}</div>
        <button class="btn" data-escalate>${a.escalation ? 'Update escalation' : 'Send escalation (simulated)'}</button>${a.escalation ? `<p class="muted small">Sent at ${esc(a.escalation.clock)} to ${esc(a.escalation.team)}.</p>` : ''}</div>
      </div>
      ${a.actions.length ? `<h4>Action log (append-only)</h4><ul class="evlist">${a.actions.map((x) => `<li><span class="muted">${x.clock}</span> ${esc(x.label)} — ${x.ok ? '' : '<b>refused/failed:</b> '}${esc(x.msg)}</li>`).join('')}</ul>` : ''}
      <div class="next"><button class="btn primary" data-next ${a.actions.some((x) => x.ok && x.op !== 'preserve_evidence') || a.escalation ? '' : 'disabled'}>Continue to Verify</button></div></div>`;
  }
  function bodyVerify() {
    const since = verifySince();
    const obs = sim().s.t - since;
    return `<div class="card"><h3>Verify recovery</h3>
      <p>${rich('Observation started when your last mitigation took effect')} (${sim().clockStr(since)}). Observed: <b data-live="obs">${fmtDur(obs)}</b> ${obs < 300 ? '— at least 5 minutes is needed for meaningful results.' : ''}</p>
      <div class="btnrow"><button class="btn" data-ff="60">Fast-forward 1 min</button><button class="btn" data-ff="300">Fast-forward 5 min</button>${T.robot ? `<button class="btn" data-testtask>Send test task to ${T.robot}</button>` : ''}<button class="btn primary" data-allchecks>Run all checks now</button></div>
      <table class="checks"><thead><tr><th>Check</th><th>Why it matters</th><th>Result</th><th></th></tr></thead><tbody>
      ${sc.checks.map((id) => { const c = CHECKS[id]; const r = a.checks[id]; return `<tr><td>${esc(c.label)}</td><td class="small">${esc(c.why)}</td><td>${r ? `${statusPill(r.pass)}<div class="small muted">${esc(r.detail)} <br>(${esc(r.clock)})</div>` : '<span class="muted">not run</span>'}</td><td><button class="btn small" data-check="${id}">Run</button></td></tr>`; }).join('')}
      </tbody></table>
      <p class="muted small">If a check fails, go back to Act — you can apply another action. Failing checks are not shameful; closing with them is.</p>
      <div class="next"><button class="btn" data-back="5">Back to Act</button><button class="btn primary" data-next>Continue to Document</button></div></div>`;
  }
  function verifySince() {
    const lastOp = a.actions.filter((x) => x.ok && x.op !== 'preserve_evidence' && x.op !== 'dispatch_test_task').map((x) => x.t + (x.pendingFor || 0));
    return Math.max(a.simStart, ...lastOp, a.mitigationAt || 0);
  }
  function draftNotebook() {
    const s = sim(); const T2 = sc.target;
    const evLine = (e) => `[${e.id}] ${e.clock} — ${e.facts?.[0] || e.summary}`;
    const obsE = a.evidence.filter((e) => e.source.startsWith('observe'));
    const testE = a.evidence.filter((e) => e.stage === 'Inspect' || e.stage === 'Test' || e.source === 'console');
    const hy = sc.hypotheses.map((h) => { const st = a.hypStatus[h.id]; if (!st || st.status === 'untested') return null; return `HYPOTHESIS — ${h.label}: ${st.status.toUpperCase()}${st.evidence?.length ? ' (' + st.evidence.map((x) => `[${x}]`).join(' ') + ')' : ''}`; }).filter(Boolean);
    const ck = Object.entries(a.checks).map(([id, r]) => `${r.pass ? 'PASS' : 'FAIL'} ${CHECKS[id].label}: ${r.detail} (${r.clock})`);
    const acts = a.actions.map((x) => `${x.clock} ${x.label}${x.ok ? '' : ' (refused)'}`);
    const diag = a.diagnosis?.cause ? sc.hypotheses.find((h) => h.id === a.diagnosis.cause)?.label : null;
    return {
      title: `INC-${a.id.slice(-5).toUpperCase()} — ${sc.title} (SIMULATED training incident)`,
      impact: `${s.queueDepth()} tasks waiting; oldest open task ${fmtDur(s.oldestOpenAge())}; robot availability ${Math.round(s.metric('availability') * 100)}% at ${s.clockStr()} facility time (simulated).`,
      affected: [T2.robot && `Robot ${T2.robot}`, T2.aisle && `Aisle ${T2.aisle}`, T2.zone && `Zone ${T2.zone}`, T2.station && `Station ${T2.station}`, T2.service && `Service ${T2.service}`, T2.loc && `Location ${T2.loc}`, a.info?.order && `Order ${a.info.order}`].filter(Boolean).join('; '),
      timeline: [`${s.clockStr(a.simStart)} facility time (simulated) — report received: ${sc.brief}`, ...a.evidence.map((e) => `${e.clock} facility time — ${e.id} ${e.label || e.source}`), ...a.actions.map((x) => `${x.clock} facility time — ACTION ${x.label}`)].sort().join('\n'),
      symptoms: obsE.map(evLine).join('\n'),
      evidence: a.evidence.map(evLine).join('\n'),
      tests: testE.map((e) => `${e.label}: ${e.summary} [${e.id}]`).join('\n'),
      hypotheses: hy.join('\n'),
      mitigation: acts.join('\n'),
      recovery: ck.join('\n'),
      rootCause: diag ? `${a.diagnosis.confidence === 'high' ? 'Suspected (high confidence)' : 'Suspected'}: ${diag}. Supported by ${(a.diagnosis.evidence || []).map((x) => `[${x}]`).join(' ') || '(no linked evidence)'}. Confirmation needed: ` : 'Root cause not determined. ',
      rootStatus: diag ? 'suspected' : 'unknown',
      followups: 'Owner: ___ — ',
      questions: '',
    };
  }
  function bodyDocument() {
    if (!a.notebook) { a.notebook = draftNotebook(); persist(ctx, a); }
    const nb = a.notebook;
    const fields = [['title', 'Incident title and ID', 1], ['impact', 'Operational impact', 2], ['affected', 'Affected robots, orders, stations, zones', 1], ['timeline', 'Detection time and timeline (facility time, simulated)', 5], ['symptoms', 'Symptoms (observed facts)', 3], ['evidence', 'Evidence (auto-collected; cite as [E#])', 5], ['tests', 'Tests performed and results', 4], ['hypotheses', 'Hypotheses (label unverified explanations)', 3], ['mitigation', 'Mitigation / actions (append-only log)', 3], ['recovery', 'Recovery checks', 4], ['rootCause', 'Root-cause statement', 2], ['followups', 'Follow-up actions and owners', 2], ['questions', 'Questions for engineering', 2]];
    return `<div class="card"><h3>Incident notebook</h3><p>${rich('This draft was generated only from facts you collected. Unverified explanations are labelled HYPOTHESIS. Edit freely — then check it.')}</p>
      <label>Root-cause status <select id="rstat">${['confirmed', 'suspected', 'unknown'].map((v) => `<option ${nb.rootStatus === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      ${fields.map(([k, l, rows]) => `<label>${esc(l)}<textarea data-nb="${k}" rows="${rows}" ${k === 'evidence' || k === 'mitigation' ? 'readonly class="ro"' : ''}>${esc(nb[k] || '')}</textarea></label>`).join('')}
      <div class="btnrow"><button class="btn" data-doccheck>Check document</button><button class="btn" data-export="md">Export Markdown</button><button class="btn" data-export="json">Export JSON</button><button class="btn" data-runbook>Turn into a runbook (W4)</button></div>
      <div id="docres"></div>
      <p class="muted small">${esc(RULES_LIMITS)}</p>
      <div class="next"><button class="btn primary" data-next>Finish & review</button></div></div>`;
  }
  function docEval() {
    const nb = a.notebook;
    const body = Object.entries(nb).filter(([k]) => !['evidence', 'title'].includes(k)).map(([, v]) => v).join('\n');
    const recovered = sc.checks.every((id) => a.checks[id]?.pass);
    const truth = sc.truth[a.variant];
    const diagnosisRight = a.diagnosis?.cause === truth.cause && !sc.unknownRootCause;
    const res = scoreDocument({ rootCause: nb.rootStatus, body }, a.evidence, { recovered, rootCauseKnown: diagnosisRight && nb.rootStatus !== 'unknown' ? true : nb.rootStatus !== 'confirmed' });
    const fc = fieldChecks(nb, REQ_FIELDS);
    if (nb.rootStatus === 'confirmed' && (!diagnosisRight)) res.critical.push({ code: 'unsupported_root_cause', msg: 'Root-cause status is “confirmed”, but the evidence you collected does not confirm that cause.' });
    return { res, fc, recovered };
  }
  function bodyReview() {
    if (!a.done) finalize();
    const sr = a.score; const truth = sc.truth[a.variant];
    return `<div class="card"><h3>Review</h3>
      <div class="reveal"><h4>What actually happened (hidden cause revealed)</h4><p><b>${esc(sc.hypotheses.find((h) => h.id === truth.cause)?.label || truth.cause)}</b> — scope: ${esc(truth.scope)}.</p><p>${esc(truth.explanation)}</p>
      <p><b>Valid mitigation:</b> ${esc(truth.mitigation)}<br><b>Permanent corrective action:</b> ${esc(truth.permanent)}</p>
      <p class="muted small">Discriminating evidence for this cause: ${truth.discriminators.map((d) => esc((DIAGNOSTICS[d] || SANDBOX_TESTS[d])?.label || d)).join('; ')}.</p></div>
      <div class="score"><div class="big">${sr.total}<small>/100</small></div><div>${sr.cats.map((c) => `<div class="cat"><div class="cat-h"><b>${esc(c.name)}</b> <span>${c.got}/${c.max}</span></div><div class="bar"><i style="width:${(c.got / c.max) * 100}%"></i></div>${c.notes.map((n) => `<p class="small ${n.pts < 0 ? 'ded' : 'ok'}">${n.pts < 0 ? `−${-n.pts}` : '✓'} ${esc(n.why)}</p>`).join('')}</div>`).join('')}</div></div>
      ${sr.critical.length ? `<div class="critical"><h4>Needs remediation before this attempt counts as a pass</h4>${sr.critical.map((c) => `<p>✕ ${esc(c.msg)}</p>`).join('')}</div>` : ''}
      <p class="muted small">Scoring is rule-based and transparent. Speed is not rewarded; safety, evidence quality and verified recovery are. ${sr.reviewAdded ? `${sr.reviewAdded} item(s) were added to your <a href="#/review">review queue</a>.` : ''}</p>
      ${interviewBlock(a, sc, ctx)}
      <div class="btnrow"><button class="btn primary" data-retry>New attempt (new hidden cause may be chosen)</button><a class="btn" href="#/progress">See progress</a><a class="btn" href="#/home">Back to start</a></div></div>`;
  }

  // ---------------------------------------------------------------- scoring
  function finalize() {
    const truth = sc.truth[a.variant];
    const cats = []; const critical = []; let reviewAdded = 0;
    const s = sim();
    const add = (name, skill, max) => { const c = { name, skill, max, got: max, notes: [] }; cats.push(c); return c; };
    const ded = (c, pts, why) => { const d = Math.min(pts, c.got); c.got -= d; c.notes.push({ pts: -d, why }); };
    const good = (c, why) => c.notes.push({ pts: 0, why });
    // diagnosis 25
    const dg = add('Evidence-based diagnosis', 'diagnosis', 25);
    const diag = a.diagnosis || {};
    const discE = a.evidence.filter((e) => truth.discriminators.includes(e.source));
    const linked = (diag.evidence || []).filter((id) => discE.some((e) => e.id === id));
    if (diag.cause !== truth.cause) { ded(dg, 12, diag.cause ? `Diagnosed “${sc.hypotheses.find((h) => h.id === diag.cause)?.label}”; the evidence pointed to “${sc.hypotheses.find((h) => h.id === truth.cause)?.label}”.` : 'No diagnosis recorded (left “not confirmed”).'); }
    else good(dg, 'Identified the correct cause.');
    if (!linked.length) ded(dg, 8, discE.length ? `Your diagnosis was not linked to the discriminating evidence you collected (${discE.map((e) => e.id).join(', ')}).` : `You did not collect discriminating evidence (e.g. ${(DIAGNOSTICS[truth.discriminators[0]] || SANDBOX_TESTS[truth.discriminators[0]])?.label}). A correct guess without it is not evidence-based.`);
    else good(dg, `Diagnosis linked to discriminating evidence ${linked.join(', ')}.`);
    const evaluated = Object.values(a.hypStatus).filter((h) => h.status !== 'untested' && h.evidence?.length).length;
    if (evaluated < 2) ded(dg, 5, `Only ${evaluated} hypothesis/hypotheses evaluated against evidence; evaluate at least two (including one you rule out).`); else good(dg, `${evaluated} hypotheses evaluated with evidence.`);
    if (diag.cause !== truth.cause || !linked.length) { queueDiscriminatorReview(sc, truth, sc.hypotheses); reviewAdded++; }
    // system understanding 15
    const su = add('System understanding (predictions)', 'system', 15);
    const preds = a.evidence.filter((e) => e.predicted);
    const right = preds.filter((e) => e.correct).length;
    const pScore = preds.length ? Math.round((right / preds.length) * 10) : 0;
    if (pScore < 10) ded(su, 10 - pScore, `${right} of ${preds.length} predictions matched the result. Each miss is a learning signal and was queued for review.`); else good(su, 'All predictions matched.');
    for (const e of preds.filter((x) => !x.correct)) { queuePredictionReview(sc.title, e); reviewAdded++; }
    if (sc.fleetImpact) { const fiOk = a.fleetImpact?.correct; if (!a.fleetImpact) ded(su, 5, 'Fleet-impact prediction not made.'); else if (fiOk === false) ded(su, 5, `Fleet-impact prediction did not match: ${a.fleetImpact.explain || ''}`); else good(su, 'Fleet impact predicted correctly.'); }
    else if (!a.hyps.ranked.includes(truth.cause)) ded(su, 5, 'The actual cause was not in your initial ranked hypotheses — widen the list next time.');
    // investigation efficiency 10
    const ef = add('Investigation efficiency & safety', sc.walkthrough === 'W2' ? 'software' : 'diagnosis', 10);
    const counts = {}; for (const e of a.evidence) if (e.predicted) counts[e.source] = (counts[e.source] || 0) + 1;
    const repeats = Object.values(counts).reduce((x, n) => x + Math.max(0, n - 2), 0);
    if (repeats) ded(ef, repeats, `${repeats} repeated identical check(s) beyond a re-check.`);
    const validOps = new Set(); const truthOps = { r07: { obstruction: ['request_aisle_clear', 'restrict_zone', 'unrestrict_zone'], localization: ['restrict_zone', 'isolate_robot', 'request_marker_repair', 'unrestrict_zone', 'return_to_service'], network: ['restrict_zone', 'request_ap_repair', 'unrestrict_zone'], taskstate: ['release_task_lease', 'isolate_robot', 'return_to_service'] } };
    void validOps; void truthOps;
    const disruptive = a.actions.filter((x) => x.ok && ['restart_robot', 'restart_service'].includes(x.op));
    const resolvedNow = sc.resolved(s, a.variant);
    for (const x of disruptive) { if (!x.preserved) ded(ef, 3, `${x.label} without first preserving evidence — local diagnostic data was erased.`); }
    const unnecessary = disruptive.filter((x) => !(sc.id === 'w2-station' && a.variant === 'heartbeat' && x.op === 'restart_service'));
    if (unnecessary.length) ded(ef, 2 * unnecessary.length, `${unnecessary.length} restart(s) that do not address this cause. Restarts can hide evidence and briefly make symptoms disappear.`);
    if (!disruptive.length) good(ef, 'No unnecessary disruptive actions.');
    // mitigation 15
    const mt = add('Mitigation / corrective action', 'diagnosis', 15);
    if (resolvedNow.fixed) good(mt, 'The underlying cause was corrected.');
    else if (resolvedNow.mitigated) { ded(mt, 3, 'Impact mitigated, but the cause is not corrected yet (that can be correct if a permanent fix needs another team — say so in follow-ups).'); }
    else ded(mt, 15, 'Neither the cause nor its impact was addressed by your actions.');
    // verification 20
    const vf = add('Recovery verification', 'verification', 20);
    const per = 20 / sc.checks.length; const since = verifySince();
    let lost = 0;
    for (const id of sc.checks) { const r = a.checks[id]; if (!r) { lost += per; vf.notes.push({ pts: -Math.round(per), why: `Not run: ${CHECKS[id].label}.` }); queueCheckReview(sc.title, id); reviewAdded++; } else if (r.t < since) { lost += per; vf.notes.push({ pts: -Math.round(per), why: `Run before your last mitigation took effect: ${CHECKS[id].label}.` }); } else if (!r.pass) { lost += per; vf.notes.push({ pts: -Math.round(per), why: `Failed: ${CHECKS[id].label} — ${r.detail}` }); queueCheckReview(sc.title, id); reviewAdded++; } }
    vf.got = Math.max(0, Math.round(20 - lost)); if (!lost) good(vf, 'All recovery checks run after mitigation and passing.');
    // documentation 15
    const dc = add('Documentation', 'documentation', 15);
    if (!a.notebook) { ded(dc, 15, 'No notebook completed.'); }
    else {
      const { res, fc, recovered } = docEval();
      const missing = fc.filter((x) => !x.ok);
      if (missing.length) ded(dc, Math.min(8, missing.length), `Missing/thin fields: ${missing.map((x) => x.label).join('; ')}.`);
      for (const it of res.items) if (!it.ok) ded(dc, it.pts, `${it.label} — ${it.why}`);
      if (a.notebook.rootStatus === 'confirmed' && !(a.diagnosis?.cause === truth.cause && linked.length) ) { /* critical added in docEval */ }
      if (res.critical.length) { dc.got = 0; dc.notes.push({ pts: 0, why: 'Critical documentation issue — see below.' }); critical.push(...res.critical); queueDocReview(); reviewAdded++; }
      if (!res.critical.length && !missing.length) good(dc, 'Complete, cited, honest about root-cause status.');
      void recovered;
    }
    const total = cats.reduce((x, c) => x + c.got, 0);
    const skills = {};
    for (const c of cats) { skills[c.skill] = skills[c.skill] == null ? Math.round((c.got / c.max) * 100) : Math.round((skills[c.skill] + (c.got / c.max) * 100) / 2); }
    if (sc.walkthrough === 'W2') skills.software = Math.round(((dg.got / dg.max) + (ef.got / ef.max)) * 50);
    a.score = { total, cats, critical, reviewAdded };
    a.skills = skills; a.done = true; a.ended = Date.now();
    store.update((st) => { st.attempts.push({ id: a.id, scenarioId: a.scenarioId, title: sc.title, walkthrough: sc.walkthrough, variant: a.variant, mode: a.mode, started: a.started, ended: a.ended, total, skills, critical: critical.map((c) => c.code), cats: cats.map((c) => ({ name: c.name, got: c.got, max: c.max, notes: c.notes })), evidenceCount: a.evidence.length, hints: a.hints, summary: summaryFor(a, sc), notebook: a.notebook, evidence: a.evidence.map(({ id, clock, label, summary, source, outcome }) => ({ id, clock, label, summary, source, outcome })), actions: a.actions.map(({ clock, label, ok, op, params }) => ({ clock, label, ok, op, params })), checks: a.checks, escalation: a.escalation, cause: sc.truth[a.variant].cause, unknownRootCause: !!sc.unknownRootCause }); st.walkthroughs[sc.walkthrough] = { ...(st.walkthroughs[sc.walkthrough] || {}), done: true }; });
    persist(ctx, a);
  }
  function summaryFor(a2, sc2) {
    return { observed: a2.evidence.filter((e) => e.source.startsWith('observe')).map((e) => e.summary).slice(0, 3), suspected: a2.hyps.ranked.map((h) => sc2.hypotheses.find((x) => x.id === h)?.label), tests: a2.evidence.filter((e) => e.predicted).map((e) => `${e.label}: ${e.summary}`).slice(0, 6), diagnosis: sc2.hypotheses.find((h) => h.id === a2.diagnosis?.cause)?.label || null, actions: a2.actions.filter((x) => x.ok).map((x) => x.label), checks: Object.entries(a2.checks).map(([id, r]) => `${r.pass ? 'PASS' : 'FAIL'} ${CHECKS[id].label}`), escalation: a2.escalation };
  }

  // ---------------------------------------------------------------- draw & events
  function draw() {
    const stg = STAGES[a.stage];
    const body = { Observe: bodyObserve, Predict: bodyPredict, Inspect: bodyInspect, Test: bodyTest, Interpret: bodyInterpret, Act: bodyAct, Verify: bodyVerify, Document: bodyDocument, Review: bodyReview }[stg]();
    root.innerHTML = header() + `<div class="inc-grid"><div>${body}</div>${coach()}</div>`;
    if (stg === 'Act' && sc.fleetImpact && !a.fleetImpact) {
      const fi = sc.fleetImpact;
      predictionForm(root.querySelector('#fiSlot'), { question: fi.question, options: fi.options }, ({ choice, why, label }) => {
        a.fleetImpact = { choice, why, label };
        if (fi.answer) { a.fleetImpact.correct = choice === fi.answer; a.fleetImpact.explain = fi.options.find((o) => o[0] === fi.answer)[1]; }
        persist(ctx, a); draw();
      });
    }
  }
  function sim2() { return sim(); }

  async function runDiag(id) {
    const d = DIAGNOSTICS[id] || SANDBOX_TESTS[id];
    const slot = root.querySelector(`[data-slot="${id}"]`);
    predictionForm(slot, d.predict, ({ choice, why, label }) => {
      let res;
      try { res = d.run(sim2(), { ...T }); } catch (e) { console.error(e); toast('That check failed to run: ' + e.message, 'warn'); return; }
      const correct = choice === res.outcome;
      const ev = addEvidence({ source: id, label: d.label, summary: res.summary, rows: res.rows, facts: res.facts, outcome: res.outcome, predicted: choice, predictedLabel: label, why, correct, outcomeLabel: d.predict.options.find((o) => o[0] === res.outcome)?.[1] });
      draw();
      const s2 = root.querySelector(`[data-slot="${id}"]`);
      s2.innerHTML = `<div class="result ${correct ? 'match' : 'miss'}"><p><b>${ev.id}</b> · ${esc(ev.clock)} · ${correct ? '✓ matched your prediction' : `✕ you predicted “${esc(label)}”; result: “${esc(ev.outcomeLabel || res.outcome)}”`}</p><p>${esc(res.summary)}</p>${evidenceTable(res)}<p class="muted small">Added to notebook as ${ev.id}. ${correct ? '' : 'Ask yourself: what does this result change about your hypotheses?'}</p><button class="btn small" data-run="${id}">Run again</button></div>`;
      caption(`${d.label}: ${res.summary}`);
      if (id === 'redock_test' || id === 'camera_view') ctx.scene?.focus({ type: 'robot', id: T.robot || 'R-04' });
    }, { cancel: () => draw() });
  }

  async function doOp(i) {
    const [op, p] = sc.operations[i];
    const m = OPERATIONS[op];
    const erases = ['restart_robot', 'restart_service', 'rollback_release'].includes(op);
    const preserved = sim().s.preserved.some((x) => (x.target === p.robot || x.target === p.service || x.target === 'system') && x.t > sim().s.t - 900);
    if (op !== 'preserve_evidence') {
      const body = `<dl class="opconf"><dt>Expected impact</dt><dd>${rich(m.impact)}</dd><dt>Prerequisites</dt><dd>${rich(m.prereq)}</dd><dt>Evidence to preserve</dt><dd>${rich(m.preserve)}${erases && !preserved ? '<br><b class="warn">⚠ You have not preserved evidence for this target. This action can erase it.</b>' : ''}</dd><dt>Rollback option</dt><dd>${rich(m.rollback)}</dd><dt>Limitations</dt><dd>${rich(m.limits)}</dd></dl>
        <label>Why are you taking this action? <textarea id="opwhy" rows="2"></textarea></label>
        <p class="muted small">Before acting ask: What do I know? What is still uncertain? What would make me stop or escalate?</p>`;
      const btns = [{ label: 'Cancel', value: null }];
      if (erases && !preserved) btns.push({ label: 'Preserve evidence first', value: 'preserve' });
      btns.push({ label: 'Apply (simulated)', value: 'go', primary: true, danger: erases });
      const r = await modal(m.label + ' — confirm', body, btns);
      if (!r || !r.value) return;
      if (r.value === 'preserve') { const pr = sim().operate('preserve_evidence', p); logAction('preserve_evidence', p, pr, OPERATIONS.preserve_evidence.label); return doOp(i); }
      const why = r.root.querySelector('#opwhy')?.value || '';
      const res = sim().operate(op, p);
      logAction(op, p, res, `${m.label} (${Object.values(p).join(', ')})`, why, preserved);
    } else {
      const res = sim().operate(op, p); logAction(op, p, res, m.label + (p.robot ? ` (${p.robot})` : p.service ? ` (${p.service})` : ''));
    }
  }
  function logAction(op, p, res, label, why = '', preserved = false) {
    a.actions.push({ t: sim().s.t, clock: sim().clockStr(), op, params: p, ok: res.ok, msg: res.msg, label, why, preserved, pendingFor: res.pendingFor || 0 });
    if (res.ok && op !== 'preserve_evidence' && op !== 'dispatch_test_task') a.mitigationAt = sim().s.t + (res.pendingFor || 0);
    persist(ctx, a); toast(res.msg, res.ok ? 'info' : 'warn'); caption(res.msg); draw();
  }

  root.onclick = async (e) => {
    const b = e.target.closest('button, [data-focus]'); if (!b) return;
    const ds = b.dataset;
    if (ds.stage) return go(+ds.stage);
    if (ds.hint !== undefined) { const stg = STAGES[a.stage]; a.hints[stg] = (a.hints[stg] || 0) + 1; persist(ctx, a); if (a.hints[stg] === 3) { const demo = stg === 'Inspect' ? sc.diagnostics[0] : stg === 'Test' ? sc.tests[0] : null; if (demo) { const d = DIAGNOSTICS[demo] || SANDBOX_TESTS[demo]; const res = d.run(sim(), { ...T }); addEvidence({ source: demo, label: d.label + ' (demonstrated by hint)', summary: res.summary, rows: res.rows, facts: res.facts, outcome: res.outcome }); toast(`Demonstrated: ${d.label}`); } } draw(); return; }
    if (ds.focus) { ctx.scene?.focus({ type: 'robot', id: ds.focus }); return; }
    if (ds.focusAisle) { ctx.scene?.focus({ type: 'aisle', id: ds.focusAisle }); return; }
    if (ds.focusStation) { ctx.scene?.focus({ type: 'station', id: ds.focusStation }); return; }
    if (ds.obs) {
      const s = sim();
      if (ds.obs === 'label') { const { robotVisual } = await import('../sim/visual.js'); const r = s.robot(T.robot); const v = robotVisual(s, r); addEvidence({ source: 'observe:label', label: 'Observation', summary: `${r.id} label shows ${v.icon} ${v.label}, in zone ${r.z < -14.4 ? 'S' : ''}${r.z >= -14.4 ? 'near aisle ' + (Math.abs(r.x - 8) < 1 ? 'C' : Math.abs(r.x + 8) < 1 ? 'B' : Math.abs(r.x + 24) < 1 ? 'A' : Math.abs(r.x - 24) < 1 ? 'D' : 'road') : ''}`, facts: [`${r.id} status label ${v.label} at ${s.clockStr()}`] }); }
      if (ds.obs === 'dash') addEvidence({ source: 'observe:dash', label: 'Observation', summary: `Availability ${Math.round(s.metric('availability') * 100)}%, queue ${s.queueDepth()}, oldest task ${fmtDur(s.oldestOpenAge())}, ${Math.round(s.metric('tasksPerHour', 900) ?? 0)} tasks/h`, facts: [`Dashboard at ${s.clockStr()}: availability ${Math.round(s.metric('availability') * 100)}%, queue ${s.queueDepth()}, oldest ${fmtDur(s.oldestOpenAge())}`] });
      if (ds.obs === 'alarms') { const al = s.activeAlarms(); addEvidence({ source: 'observe:alarms', label: 'Observation', summary: al.length ? al.map((x) => x.msg).join('; ') : 'No active alarms', facts: [al.length ? `Active alarms: ${al.map((x) => x.msg).join('; ')}` : 'No active alarms'] }); }
      if (ds.obs === 'text') { const t = root.querySelector('#obsText').value.trim(); if (t.length < 5) { toast('Write an observation first.', 'warn'); return; } addEvidence({ source: 'observe:text', label: 'Learner observation', summary: t, facts: [t] }); }
      draw(); return;
    }
    if (ds.hyp) { const r = a.hyps.ranked; const i = r.indexOf(ds.hyp); if (i >= 0) r.splice(i, 1); else if (r.length < 3) r.push(ds.hyp); else toast('Rank up to three. Remove one first.', 'warn'); a.hyps.why = root.querySelector('#hwhy')?.value || a.hyps.why; a.hyps.confirmWhat = root.querySelector('#hwhat')?.value || a.hyps.confirmWhat; persist(ctx, a); draw(); return; }
    if (ds.run) return runDiag(ds.run);
    if (ds.op !== undefined) return doOp(+ds.op);
    if (ds.testtask !== undefined) { const res = sim().operate('dispatch_test_task', { robot: T.robot }); logAction('dispatch_test_task', { robot: T.robot }, res, `Dispatch test task to ${T.robot}`); return; }
    if (ds.fisandbox !== undefined) { const [op, p] = sc.fleetImpact.sandbox; const r = sandboxAction(sim(), op, p, 240); const txt = `${r.res.msg} After 4 min (sandbox): queue ${r.before.q} → ${r.after.q}, oldest task ${fmtDur(r.before.age)} → ${fmtDur(r.after.age)}, ${r.after.done} tasks completed.`; a.fleetImpact.sandbox = txt; const improved = r.after.age < r.before.age * 0.6; a.fleetImpact.correct = (a.fleetImpact.choice === 'fixed') === improved || (a.fleetImpact.choice === 'same_problem' && !improved); a.fleetImpact.explain = improved ? 'In the sandbox the requeued work completed — the problem was attached to R-07 or its record.' : 'In the sandbox the waiting work did not recover — the cause is not attached to R-07 alone.'; addEvidence({ source: 'sandbox_isolation', label: 'Sandbox: isolate target robot', summary: txt, facts: [txt] }); persist(ctx, a); draw(); return; }
    if (ds.escalate !== undefined) { const team = root.querySelector('#escTeam').value; const text = root.querySelector('#escText').value.trim(); const ev = [...root.querySelectorAll('#escEv input:checked')].map((x) => x.value); if (text.length < 15) { toast('Write a specific request (what you need and why).', 'warn'); return; } a.escalation = { team, text, evidence: ev, clock: sim().clockStr(), t: sim().s.t }; persist(ctx, a); toast(`Escalation sent to ${team} (simulated).${ev.length ? '' : ' Tip: attach evidence — engineers cannot act on a request without it.'}`); draw(); return; }
    if (ds.ff) { ctx.fastForward(+ds.ff); draw(); return; }
    if (ds.check) { const r = CHECKS[ds.check].run(sim(), { ...sc.checkCtx(sim()), since: verifySince(), relatedKeys: sc.relatedAlarms }); a.checks[ds.check] = { ...r, t: sim().s.t, clock: sim().clockStr() }; persist(ctx, a); draw(); return; }
    if (ds.allchecks !== undefined) { for (const id of sc.checks) { const r = CHECKS[id].run(sim(), { ...sc.checkCtx(sim()), since: verifySince(), relatedKeys: sc.relatedAlarms }); a.checks[id] = { ...r, t: sim().s.t, clock: sim().clockStr() }; } persist(ctx, a); draw(); return; }
    if (ds.back) return go(+ds.back);
    if (ds.doccheck !== undefined) { saveNotebook(); const { res, fc } = docEval(); root.querySelector('#docres').innerHTML = `<div class="docres">${res.critical.map((c) => `<p class="bad">✕ CRITICAL: ${esc(c.msg)}</p>`).join('')}${[...fc, ...res.items].map((x) => `<p class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓' : '✕'} ${esc(x.label)}${x.ok ? '' : ' — ' + esc(x.why)}</p>`).join('')}</div>`; return; }
    if (ds.export) { saveNotebook(); const nb = a.notebook; const md = notebookMarkdown(nb, a, sc); if (ds.export === 'md') downloadText(`${nb.title.split(' ')[0]}-simulated-incident.md`, md); else downloadText(`${nb.title.split(' ')[0]}-simulated-incident.json`, JSON.stringify({ simulated: true, notebook: nb, evidence: a.evidence.map(({ id, clock, label, summary, facts }) => ({ id, clock, label, summary, facts })), actions: a.actions }, null, 2), 'application/json'); return; }
    if (ds.runbook !== undefined) { saveNotebook(); store.update((st) => { st.pendingRunbookFrom = a.id; }); location.hash = '#/w4'; return; }
    if (ds.retry !== undefined) { const nx = newAttempt(ctx, sc.id, { mode: a.mode }); void nx; renderInvestigation(root, ctx); return; }
    if (ds.next !== undefined) {
      const stg = STAGES[a.stage];
      if (stg === 'Predict') { a.hyps.why = root.querySelector('#hwhy').value.trim(); a.hyps.confirmWhat = root.querySelector('#hwhat').value.trim(); if (!a.hyps.ranked.length) { toast('Pick at least one hypothesis.', 'warn'); return; } if (a.hyps.why.split(/\s+/).length < 4) { toast('Explain briefly why your #1 is most likely.', 'warn'); return; } }
      if (stg === 'Interpret') { saveInterpret(); }
      if (stg === 'Document') saveNotebook();
      if (stg === 'Verify') { const missing = sc.checks.filter((id) => !a.checks[id]); if (missing.length) { const r = await modal('Some checks were not run', `<p>${missing.length} check(s) not run. Continuing now will count them as missed verification steps.</p>`, [{ label: 'Go back', value: null }, { label: 'Continue anyway', value: 'go', primary: true }]); if (!r?.value) return; } }
      return go(a.stage + 1);
    }
  };
  root.onchange = (e) => { if (STAGES[a.stage] === 'Interpret') saveInterpret(); if (STAGES[a.stage] === 'Document') saveNotebook(); };
  function saveInterpret() {
    for (const fs of root.querySelectorAll('.hypfs')) { const h = fs.dataset.h; a.hypStatus[h] = { status: fs.querySelector('input[type=radio]:checked')?.value || 'untested', evidence: [...fs.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value) }; }
    a.diagnosis = { cause: root.querySelector('#dcause').value || null, scope: root.querySelector('#dscope').value, confidence: root.querySelector('#dconf').value, evidence: [...root.querySelectorAll('#devid input:checked')].map((x) => x.value) };
    persist(ctx, a);
  }
  function saveNotebook() { if (!a.notebook) return; for (const t of root.querySelectorAll('[data-nb]')) a.notebook[t.dataset.nb] = t.value; const rs = root.querySelector('#rstat'); if (rs) a.notebook.rootStatus = rs.value; persist(ctx, a); }

  draw();
  caption(`${STAGES[a.stage]}: ${COACH[STAGES[a.stage]].replace(/\[\[|\]\]/g, '')}`);
  return {
    refresh() { const c = root.querySelector('[data-live="incclock"]'); if (c) c.textContent = fmtDur(sim().s.t - a.simStart); const o = root.querySelector('[data-live="obs"]'); if (o) o.textContent = fmtDur(sim().s.t - verifySince()); },
    unmount() { ctx.addEvidence = null; },
  };
}

export function notebookMarkdown(nb, a, sc) {
  return `# ${nb.title}

> SIMULATION-BASED TRAINING RECORD — Robotics Fleet Response Lab. Fictional facility, equipment, telemetry and staff. Not professional experience.
> Times are facility time in the simulation.

**Root-cause status:** ${nb.rootStatus}

## Operational impact
${nb.impact}

## Affected
${nb.affected}

## Detection & timeline
${nb.timeline}

## Symptoms
${nb.symptoms}

## Evidence
${nb.evidence}

## Tests performed and results
${nb.tests}

## Hypotheses
${nb.hypotheses}

## Mitigation / actions (append-only)
${nb.mitigation}

## Recovery checks
${nb.recovery}

## Root cause
${nb.rootCause}

## Follow-up actions and owners
${nb.followups}

## Questions for engineering
${nb.questions}
${a.escalation ? `\n## Escalation\nTo: ${a.escalation.team} at ${a.escalation.clock}\n${a.escalation.text}\nEvidence: ${a.escalation.evidence.map((x) => `[${x}]`).join(' ')}\n` : ''}
---
Scenario: ${sc.title} · attempt ${a.id}
`;
}
