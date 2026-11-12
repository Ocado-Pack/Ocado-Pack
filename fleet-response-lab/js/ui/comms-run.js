// Technical Communication module — incident runner (SIMULATED).
// Loop: Inspect → Ask → Hypotheses → Test → Communicate → Mitigate → Verify → Document → Handoff → Reflect → (Submit) → Feedback → Revise → Transfer
import { esc, fmtDur, uid } from '../util.js';
import { Sim } from '../sim/engine.js';
import { DIAGNOSTICS, SANDBOX_TESTS, OPERATIONS, CHECKS } from '../sim/catalog.js';
import { COMMS_MAP, startComms, BOUNDARY, OP_AUTH, TEAMS, HYP_LABELS, scenariosForSkill, SKILL_LABELS } from '../comms/scenarios.js';
import { PEOPLE, QUESTIONS, askQuestion, respondOps, respondEscalation, respondHandoff, respondInstruction, respondMgmt, respondDisagreement, TEAM_PERSON } from '../comms/personas.js';
import * as R from '../comms/rules.js';
import { TEMPLATES, FIELDS, draftDoc, validateDoc, diffVersions, RUNBOOK_SECTIONS, technicianRun } from '../comms/docs.js';
import { MESSAGE_KINDS, scoreAttempt, msgCtx, activeItems, modelAnswers, coachFor, docCtx, COMM_REVIEW, metricsFor, canClose, canSubmit } from '../comms/score.js';
import { cs, saveComms } from '../comms/state.js';
import { addReview, store } from '../store.js';
import { toast, modal, caption, rich, downloadText, SIM_NOTE } from './common.js';

export const CSTAGES = ['Inspect', 'Ask', 'Hypotheses', 'Test', 'Communicate', 'Mitigate', 'Verify', 'Document', 'Handoff', 'Reflect'];
const STAGE_HELP = {
  Inspect: 'Look first: the 3D scene, metrics, logs and task records. Capture what you see as evidence.',
  Ask: 'Ask focused questions for what you cannot see yourself: onset, scope, equipment IDs, recent changes, impact. Don’t ask for what is already on your screen.',
  Hypotheses: 'Write at least two explanations. Keep a ledger: supported, rejected (with the reason) or open. Record your current assessment and how confident you are.',
  Test: 'Choose a test whose result would differ between your top hypotheses.',
  Communicate: 'Send the messages this incident needs, each for its audience. Facts vs hypotheses vs unknowns. Commit to update times, not repair times.',
  Mitigate: 'Act within your authority; escalate for anything that needs engineering. Preserve evidence before anything that erases state.',
  Verify: 'Run the recovery checks. You can only close when they pass; otherwise hand off as active.',
  Document: 'Fill the required documents. Drafts contain only what you collected. Every save is a new version — earlier findings are never silently overwritten.',
  Handoff: 'Transfer ownership. The receiving technician must accept, and will ask about anything missing.',
  Reflect: 'Explain your reasoning briefly — typed or spoken — without reading a script.',
};
const MSG_PEOPLE = { ack: 'dana', ops3: 'dana', ops: 'dana', mgmt: 'avery', eng: 'priya', uncertainty: 'dana', correction: 'dana', disagreement: 'group', prioritization: 'dana' };

// ---------------------------------------------------------------- lifecycle
export function newCommsAttempt(ctx, scenarioId, { mode = 'assisted', transferOf = null, seed = null, variant = null } = {}) {
  const sd = seed ?? (Date.now() % 1000000007);
  const sc = COMMS_MAP[scenarioId];
  const { sim, variant: v, issues, reportedAt, shiftEnd } = startComms(scenarioId, sd, variant);
  const att = { id: uid('cx'), scenarioId, variant: v, seed: sd, mode, stage: 0, reached: 0, incidentId: `INC-${String(sd % 100000).padStart(5, '0')}`, issues, reportedAt, shiftEnd, started: Date.now(), transferOf,
    evidence: [], timeline: [], asked: [], hyps: [], assessment: null, assessmentHistory: [], messages: [], commitments: [], actions: [], escalations: [], instructions: [], checks: {}, docs: {}, handoff: { versions: [], rounds: [], accepted: false }, runbook: null, prioritization: null, reflection: null, pauses: [], queue: [], closed: null, submitted: false, authRefusals: 0 };
  sim.__commsId = att.id;
  // seeded history (clearly labelled)
  for (const a of sim.s.audit) att.timeline.push({ t: a.t, clock: sim.clockStr(a.t), kind: 'action', text: `[earlier in your shift] ${a.msg.replace('[learner action, simulated] ', '')}` });
  if (sc.priorUpdate) { att.messages.push({ id: 'M0', t: reportedAt - 600, clock: sc.priorUpdate.at, kind: 'prior', to: 'dana', text: sc.priorUpdate.text, seeded: true }); att.hyps.push({ id: sc.priorUpdate.hyp, label: HYP_LABELS[sc.priorUpdate.hyp], status: 'supported', history: [{ t: reportedAt - 600, clock: sc.priorUpdate.at, status: 'supported', reason: 'Initial report only (no discriminating evidence) — recorded earlier in your shift', evidence: [] }] }); att.assessment = { cause: sc.priorUpdate.hyp, confidence: 'likely', evidence: [], t: reportedAt - 600 }; att.timeline.push({ t: reportedAt - 600, clock: sc.priorUpdate.at, kind: 'message', text: `[earlier] You → Dana: “${sc.priorUpdate.text}”` }); }
  if (sc.seededTicket) { att.docs.ticket = { versions: [{ t: reportedAt - 700, clock: sc.seededTicket.at, fields: { incidentId: sc.seededTicket.id, title: 'R-05 broken', observed: sc.seededTicket.text }, note: `Created by ${sc.seededTicket.by}`, phase: 'seeded' }] }; }
  const msgs = [{ from: sc.brief.from, channel: sc.brief.channel, text: issuesText(sc.brief.text, issues), delay: 0 }, ...(sc.extraOpening || [])];
  for (const m of msgs) att.queue.push({ at: reportedAt + (m.delay || 0), type: 'msg', from: m.from, channel: m.channel, text: m.text });
  if (sc.pressure) for (const d of [100, 260, 430]) att.queue.push({ at: reportedAt + d, type: 'pressure' });
  if (sc.pressure) att.queue.push({ at: reportedAt + 200, type: 'msg', from: 'avery', channel: 'chat', text: 'Avery here. I have to decide by 07:25 whether to hold the 07:30 wave or call overtime. What can you tell me?' });
  if (shiftEnd) { att.queue.push({ at: shiftEnd - 120, type: 'msg', from: 'jordan', channel: 'chat', text: 'Two minutes out. I’ll need your handoff.' }); att.queue.push({ at: shiftEnd, type: 'msg', from: 'jordan', channel: 'chat', text: 'I’m here. What am I taking over?' }); att.queue.push({ at: shiftEnd + 300, type: 'handoffNag' }); }
  if (sc.secondIncident) att.queue.push({ at: reportedAt + sc.secondIncident.atMin * 60, type: 'second' });
  if (sc.id === 'CX-I') att.timeline.push({ t: reportedAt - 700, clock: sim.clockStr(reportedAt - 700), kind: 'system', text: '[earlier] R-07 stale assignment released by you; R-07 back in service.' });
  if (sc.history) for (const h of sc.history) att.timeline.push({ t: reportedAt - 86400, clock: h.when, kind: 'system', text: `[history] ${h.id}: ${h.text}` });
  const c = cs(); c.current = att; ctx.setSim(sim); persist(ctx, att);
  return att;
}
function issuesText(text, issues) { if (!issues) return text; return text.replace('[I1]', issues[0].label.toLowerCase()).replace('[I2]', issues[1].label.toLowerCase()); }
export function persist(ctx, att) {
  const c = cs(); c.current = att;
  try { const sn = ctx.sim.snapshot(); sn.logs = sn.logs.slice(-2000); c.snap = { id: att.id, s: sn }; } catch { c.snap = null; }
  saveComms();
}
function resume(ctx) {
  const c = cs(); const att = c.current; if (!att) return null;
  if (ctx.sim?.__commsId === att.id) return att;
  let sim; if (c.snap?.id === att.id) sim = Sim.fromSnapshot(c.snap.s); else sim = startComms(att.scenarioId, att.seed, att.variant).sim;
  sim.__commsId = att.id; ctx.setSim(sim); return att;
}

// ---------------------------------------------------------------- render
export function render(root, ctx) {
  const att = resume(ctx);
  if (!att) { root.innerHTML = '<div class="card"><h2>No active communication incident</h2><p><a class="btn primary" href="#/comms">Open the Communication & Interview module</a></p></div>'; return {}; }
  const sc = COMMS_MAP[att.scenarioId];
  const sim = () => ctx.sim;
  let chTab = 'radio'; let hintLvl = {}; let docSel = sc.deliverables.find((k) => TEMPLATES[k]) || 'notes';
  const now = () => sim().s.t; const clk = (t = now()) => sim().clockStr(t).slice(0, 5);
  const tl = (kind, text) => att.timeline.push({ t: now(), clock: sim().clockStr(), kind, text });
  const msg = (from, channel, text) => { att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), from, channel, kind: 'in', text }); };
  const save = () => persist(ctx, att);
  const truth = sc.truth[att.variant];
  const allChecksPass = () => sc.checks.every((id) => att.checks[id]?.pass && att.checks[id].t >= verifySince());
  function verifySince() { return Math.max(att.reportedAt, ...att.actions.filter((a) => a.ok && !['preserve_evidence', 'dispatch_test_task'].includes(a.op)).map((a) => a.t + (a.pendingFor || 0))); }
  const causeKnownNow = () => !!(att.assessment && att.assessment.confidence === 'confirmed' && att.assessment.cause === truth.cause && att.evidence.some((e) => truth.discriminators.includes(e.source)));
  const evChips = (name, sel = []) => `<div class="chips" data-chips="${name}">${att.evidence.map((e) => `<label class="chip" title="${esc(e.summary)}"><input type="checkbox" value="${e.id}" ${sel.includes(e.id) ? 'checked' : ''}> ${e.id}</label>`).join('') || '<span class="muted small">No evidence yet.</span>'}</div>`;
  const chipVals = (name) => [...root.querySelectorAll(`[data-chips="${name}"] input:checked`)].map((x) => x.value);
  const assess = att.mode === 'assessment';

  function addEvidence(e) { const id = `E${att.evidence.length + 1}`; const r = { id, t: now(), clock: sim().clockStr(), ...e }; att.evidence.push(r); tl('evidence', `${id} ${e.label}: ${e.summary}`.slice(0, 220)); save(); return r; }
  ctx.addEvidence = (e) => { const r = addEvidence({ source: 'console', ...e }); toast(`Added ${r.id} to ${att.incidentId}`); draw(); return r; };

  // ---------------------------------------------------------------- pre-action pause
  async function pause(before) {
    const r = await modal(`Before you ${before}`, `<p class="small">Quick structured pause (part of the loop; recorded in your timeline).</p>${[['know', 'What do you know (facts)?'], ['uncertain', 'What remains uncertain?'], ['evidence', 'What evidence supports this next step?'], ['who', 'Who needs an update?'], ['stop', 'What would make you stop or escalate?']].map(([k, l]) => `<label>${l}<textarea data-p="${k}" rows="1"></textarea></label>`).join('')}`, [{ label: 'Cancel', value: null }, { label: 'Continue', value: 'go', primary: true }]);
    if (!r?.value) return false;
    const fields = Object.fromEntries([...r.root.querySelectorAll('[data-p]')].map((x) => [x.dataset.p, x.value.trim()]));
    const filled = Object.values(fields).filter((v) => v.split(/\s+/).length >= 2).length;
    if (filled < 3) { toast('Fill at least three of the five prompts (a few words each).', 'warn'); return pause(before); }
    att.pauses.push({ t: now(), before, fields }); tl('system', `Pause before ${before}: know “${fields.know}”; uncertain “${fields.uncertain}”; stop/escalate if “${fields.stop}”.`); save(); return true;
  }

  // ---------------------------------------------------------------- header & channels
  function header() {
    const sEnd = att.shiftEnd ? att.shiftEnd - now() : null;
    return `<div class="inc-head"><div><span class="eyebrow">${sc.letter} · ${esc(att.mode)} ${att.transferOf ? '· transfer test' : ''} · ${att.incidentId} ${SIM_NOTE}</span><h2>${esc(sc.title)}</h2>
      <p class="small muted">Consequence: ${esc(sc.consequence)}</p></div>
      <div class="inc-clock"><span>Facility time</span><b data-live="clk">${sim().clockStr()}</b>${att.shiftEnd ? `<span class="small" data-live="shift">${sEnd > 0 ? `shift ends in ${fmtDur(sEnd)}` : 'shift ended'}</span>` : ''}<span class="small muted" data-live="inc">incident ${fmtDur(now() - att.reportedAt)}</span></div></div>
      <ol class="stepper">${[...CSTAGES, ...(att.submitted ? ['Feedback'] : [])].map((s, i) => `<li class="${i === att.stage ? 'cur' : ''} ${i < att.reached ? 'done' : ''}"><button data-stage="${i}" ${i > att.reached && !(att.submitted && i === CSTAGES.length) ? 'disabled' : ''}>${i < att.reached ? '✓ ' : ''}${s}</button></li>`).join('')}</ol>`;
  }
  function channels() {
    const radio = att.messages.filter((m) => m.channel === 'radio' || PEOPLE[m.to]?.channel === 'radio' || m.kind === 'prior');
    const chat = att.messages.filter((m) => m.channel === 'chat' || ['priya', 'lee', 'sam', 'kai', 'avery', 'jordan', 'group'].includes(m.to));
    const list = (arr) => `<div class="chat" data-autoscroll>${arr.map((m) => `<div class="msg ${m.from ? '' : 'me'}"><div class="who">${esc(m.clock)} · ${m.from ? `${esc(PEOPLE[m.from]?.name)} (${esc(PEOPLE[m.from]?.role)})` : `You → ${esc(PEOPLE[m.to]?.name || m.to)}${m.kind && m.kind !== 'in' ? ` · ${esc(MESSAGE_KINDS[m.kind]?.label || m.kind)}` : ''}${m.seeded ? ' · earlier in your shift' : ''}`}</div>${esc(m.text)}${m.feedback && !assess ? `<div class="small muted">${esc(m.feedback)}</div>` : ''}</div>`).join('') || '<p class="muted small">No messages yet.</p>'}</div>`;
    const board = activeItems(sim(), sc, att);
    const body = { radio: list(radio), chat: list(chat),
      ticket: `<p class="small">Incident ${att.incidentId}${sc.seededTicket ? ` · original ticket ${sc.seededTicket.id} by ${esc(sc.seededTicket.by)} at ${sc.seededTicket.at}: “${esc(sc.seededTicket.text)}”` : ''}</p>${Object.entries(att.docs).map(([k, d]) => `<p class="small"><b>${esc(TEMPLATES[k]?.label || k)}</b> — ${d.versions.length} version(s), last ${esc(d.versions[d.versions.length - 1].clock)}</p>`).join('') || '<p class="muted small">No documents saved yet (Document step).</p>'}`,
      board: `<p class="small"><b>Shift handoff board</b> (live from the system):</p><ul class="small">${board.map((i) => `<li>${esc(i.label)}</li>`).join('') || '<li>No open items detected.</li>'}</ul><p class="small">Handoff: ${att.handoff.accepted ? `✓ accepted at ${esc(att.handoff.acceptedClock)}` : att.handoff.rounds.length ? `${att.handoff.rounds.length} round(s), not yet accepted` : 'not started'}</p>`,
      timeline: `<p class="small muted">Append-only. Nothing here can be edited or deleted.</p><ol class="small timeline">${att.timeline.slice().sort((a, b) => a.t - b.t).map((x) => `<li><b>${esc(x.clock)}</b> [${esc(x.kind)}] ${esc(x.text)}</li>`).join('')}</ol>`,
      kb: `<p class="small">Knowledge base (simulated): <a href="#/kb">open</a>. Articles you publish appear there with revision history.</p>` };
    return `<div class="card"><div class="btnrow" role="tablist">${[['radio', `📻 Radio (${radio.length})`], ['chat', `💬 Team chat (${chat.length})`], ['ticket', '🎫 Ticket'], ['board', '📋 Handoff board'], ['timeline', '🕒 Timeline'], ['kb', '📚 KB']].map(([k, l]) => `<button class="btn small ${chTab === k ? 'primary' : ''}" data-ch="${k}">${l}</button>`).join('')}</div>${body[chTab]}
      ${['radio', 'chat'].includes(chTab) ? `<div class="btnrow"><select id="qTo">${(chTab === 'radio' ? ['dana', 'marco'] : ['priya', 'lee', 'sam', 'kai', 'avery', 'jordan']).map((p) => `<option value="${p}">${PEOPLE[p].name}</option>`).join('')}</select><input type="text" id="qText" placeholder="Short reply / free message (formal deliverables are in Communicate)" style="flex:1;min-width:160px"><button class="btn small" data-free>Send</button></div>` : ''}</div>`;
  }

  // ---------------------------------------------------------------- stage bodies
  function diagRow(id, kind) {
    const D = DIAGNOSTICS[id] || SANDBOX_TESTS[id]; if (!D) return '';
    const runs = att.evidence.filter((e) => e.source === id);
    const needsRobot = D.target === 'robot'; const needsStation = D.target === 'station';
    return `<div class="diag"><div class="diag-h"><b>${esc(D.label)}</b> ${runs.length ? `<span class="tag ok">×${runs.length}</span>` : ''}</div>
      <details class="explain"><summary>What it shows / limits</summary><p class="small">${esc(D.what)} <b>Limits:</b> ${esc(D.limits)}</p></details>
      <div class="btnrow">${needsRobot ? `<select data-rsel="${id}">${sim().s.robots.map((r) => `<option>${r.id}</option>`).join('')}</select>` : ''}${needsStation ? `<select data-ssel="${id}">${['P-1', 'P-2', 'P-3', 'P-4'].map((x) => `<option>${x}</option>`).join('')}</select>` : ''}
      <select data-exp="${id}" aria-label="What do you expect?"><option value="">Expect…</option>${D.predict.options.map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join('')}</select>
      ${kind === 'test' ? `<select data-sep="${id}" aria-label="Which hypotheses does this separate?"><option value="">Separates…</option>${att.hyps.map((h, i) => att.hyps.slice(i + 1).map((h2) => `<option value="${h.id}|${h2.id}">${esc(h.label.split(' (')[0])} vs ${esc(h2.label.split(' (')[0])}</option>`).join('')).join('')}</select>` : ''}
      <button class="btn small" data-run="${id}" data-kind="${kind}">Run</button></div>${runs.length ? `<p class="small muted">Last (${runs[runs.length - 1].id}): ${esc(runs[runs.length - 1].summary)}</p>` : ''}</div>`;
  }
  function bInspect() {
    const ids = [...new Set([...sc.diagnostics])];
    return `<div class="card"><h3>Inspect: scene, metrics, logs, task records</h3><p class="small">${esc(STAGE_HELP.Inspect)} The <a href="#/w2">log console</a> and <a href="#/w3">dashboards</a> work on this incident; the console can pin log lines here.</p>
      <div class="btnrow"><button class="btn" data-cap="dash">Capture dashboard metrics</button><button class="btn" data-cap="alarms">Capture active alarms</button><button class="btn" data-cap="scene">Capture what the 3D labels show</button><button class="btn" data-cap="oldest">Capture oldest order’s task record</button></div>
      <p class="small muted">Expectation first: choose what you expect before running a check (one click). Some checks are irrelevant to this incident — that is realistic.</p>
      <div class="diags">${ids.map((d) => diagRow(d, 'inspect')).join('')}</div>${evList()}${next(att.evidence.length >= 2, 'Capture at least two pieces of evidence.')}</div>`;
  }
  const evList = () => `<h4>Evidence (${att.evidence.length})</h4><ul class="evlist">${att.evidence.map((e) => `<li><b>${e.id}</b> <span class="muted">${e.clock}</span> ${esc(e.label)}: ${esc(e.summary)}</li>`).join('') || '<li class="muted">none</li>'}</ul>`;
  const next = (ok, msgTxt) => `<div class="next"><button class="btn primary" data-next ${ok ? '' : 'disabled'}>Continue</button>${ok ? '' : `<span class="muted small">${esc(msgTxt)}</span>`}</div>`;
  function bAsk() {
    const groups = {};
    for (const qid of sc.questions) { const q = QUESTIONS[qid]; (groups[q.to] ||= []).push([qid, q]); }
    return `<div class="card"><h3>Ask focused questions</h3><p class="small">${esc(STAGE_HELP.Ask)}</p>
      ${Object.entries(groups).map(([p, qs]) => `<h4>${esc(PEOPLE[p].name)} — ${esc(PEOPLE[p].role)}</h4><div class="btnrow">${qs.map(([qid, q]) => `<span class="btnrow" style="margin:0">${q.param === 'aisle' ? `<select data-qp="${qid}">${['A', 'B', 'C', 'D'].map((a) => `<option ${a === 'C' ? 'selected' : ''}>${a}</option>`).join('')}</select>` : q.param === 'station' ? `<select data-qp="${qid}">${['P-1', 'P-2', 'P-3', 'P-4'].map((a) => `<option>${a}</option>`).join('')}</select>` : ''}<button class="btn small" data-ask="${qid}">${esc(q.q)} <span class="tag">${esc(q.cat)}</span></button></span>`).join('')}</div>`).join('')}
      <p class="small muted">Answers arrive in the Radio/Chat tabs and become citable evidence. Physical checks by Marco take a minute or two of facility time.</p>${evList()}${next(att.asked.length >= 1, 'Ask at least one question.')}</div>`;
  }
  function bHyp() {
    const known = new Set(att.hyps.map((h) => h.id));
    const a = att.assessment || {};
    return `<div class="card"><h3>Hypothesis ledger</h3><p class="small">${esc(STAGE_HELP.Hypotheses)}</p>
      <div class="btnrow">${sc.hypotheses.filter((h) => !known.has(h)).map((h) => `<button class="btn small" data-addh="${h}">+ ${esc(HYP_LABELS[h])}</button>`).join('')}</div>
      ${att.hyps.map((h) => `<fieldset class="hypfs"><legend>${esc(h.label)} — <b>${h.status.toUpperCase()}</b></legend>
        <ol class="small">${h.history.map((x) => `<li>${esc(x.clock)} → ${x.status}${x.reason ? `: ${esc(x.reason)}` : ''}${x.evidence?.length ? ` [${x.evidence.join(', ')}]` : ''}</li>`).join('')}</ol>
        <div class="btnrow"><select data-hs="${h.id}"><option value="">Change status…</option><option value="supported">supported</option><option value="rejected">rejected</option><option value="open">open</option></select><input type="text" data-hr="${h.id}" placeholder="Reason (required)" style="flex:1"></div>${evChips(`h-${h.id}`)}<button class="btn small" data-hsave="${h.id}">Record (append)</button></fieldset>`).join('')}
      <h4>Current assessment</h4>
      <div class="btnrow"><select id="asC"><option value="">— cause —</option>${sc.hypotheses.map((h) => `<option value="${h}" ${a.cause === h ? 'selected' : ''}>${esc(HYP_LABELS[h])}</option>`).join('')}</select>
      <select id="asF">${[['hypothesis', 'Hypothesis (working theory)'], ['likely', 'Likely (some support)'], ['confirmed', 'Confirmed (discriminating evidence)']].map(([v, l]) => `<option value="${v}" ${a.confidence === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${evChips('as', a.evidence || [])}<input type="text" id="asR" placeholder="Why (required when changing)" style="width:100%"><button class="btn small" data-assess>Record assessment (append)</button>
      ${att.assessmentHistory.length ? `<ol class="small">${att.assessmentHistory.map((x) => `<li>${esc(x.clock)}: ${esc(HYP_LABELS[x.cause] || x.cause)} (${x.confidence}) — ${esc(x.reason)}</li>`).join('')}</ol>` : ''}
      ${next(att.hyps.length >= 2, 'Add at least two hypotheses.')}</div>`;
  }
  function bTest() {
    return `<div class="card"><h3>Test</h3><p class="small">${esc(STAGE_HELP.Test)} State which pair of hypotheses each test separates.</p><div class="diags">${sc.diagnostics.map((d) => diagRow(d, 'test')).join('')}</div>${evList()}${next(att.evidence.some((e) => e.testIntent), 'Run at least one test with a stated intent.')}</div>`;
  }
  function composer(kind) {
    const K = MESSAGE_KINDS[kind]; const sent = att.messages.filter((m) => m.kind === kind);
    const co = coachFor(att.mode, kind, hintLvl[kind] || 0);
    return `<div class="op"><div class="diag-h"><b>${esc(K.label)}</b> → ${esc(PEOPLE[K.to]?.name || 'Dana + Priya')} ${sent.length ? `<span class="tag ok">sent ×${sent.length}</span>` : ''}</div>
      ${!assess ? `<div class="coach small">${esc(co.text)}${co.examples ? `<ol>${co.examples.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ol>` : ''}${co.hints.map((h, i) => `<p class="hint"><b>Hint ${i + 1}:</b> ${esc(h)}</p>`).join('')}${(hintLvl[kind] || 0) < 3 ? `<button class="btn small" data-hint="${kind}">${att.mode === 'guided' ? 'More help' : 'Hint'}</button>` : ''}</div>` : ''}
      ${kind === 'prioritization' ? `<div class="btnrow">${(att.issues || []).map((i, n) => `<label>Priority ${n + 1} <select data-prio="${n}">${att.issues.map((j) => `<option value="${j.id}" ${(att.prioritization?.order || att.issues.map((x) => x.id))[n] === j.id ? 'selected' : ''}>${j.id}: ${esc(j.label)}</option>`).join('')}</select></label>`).join('')}</div><p class="small muted">${esc(sc.support || '')}</p>` : ''}
      <textarea id="m-${kind}" rows="${kind === 'ops3' ? 3 : 4}" placeholder="${kind === 'ops3' ? 'Exactly three sentences.' : ''}"></textarea>${evChips(`c-${kind}`)}<button class="btn small" data-cite="${kind}">Insert selected citations</button>
      <button class="btn primary small" data-send="${kind}">Send</button></div>`;
  }
  function escalationForm() {
    const last = att.escalations[att.escalations.length - 1]?.fields || {};
    const co = coachFor(att.mode, 'escalation', hintLvl.escalation || 0);
    return `<div class="op"><div class="diag-h"><b>Engineering escalation</b> ${att.escalations.length ? `<span class="tag ${att.escalations.some((e) => e.useful) ? 'ok' : ''}">${att.escalations.length} sent${att.escalations.some((e) => e.useful) ? ' · accepted' : ''}</span>` : ''}</div>
      ${!assess ? `<div class="coach small">${esc(co.text)}${co.examples ? `<ol>${co.examples.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ol>` : ''}${co.hints.map((h, i) => `<p class="hint"><b>Hint ${i + 1}:</b> ${esc(h)}</p>`).join('')}${(hintLvl.escalation || 0) < 3 ? '<button class="btn small" data-hint="escalation">Hint</button>' : ''}</div>` : ''}
      <label>Team <select id="eTeam">${TEAMS.map((t) => `<option ${last.team === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Summary & impact<textarea id="eSum" rows="2">${esc(last.summary || '')}</textarea></label>
      <label>Reproduction conditions (when / where / how often)<textarea id="eRep" rows="2">${esc(last.repro || '')}</textarea></label>
      <label>Already tested / ruled out (dependencies)<textarea id="eRul" rows="2">${esc(last.ruledOut || '')}</textarea></label>
      <label>Specific request<textarea id="eReq" rows="2">${esc(last.request || '')}</textarea></label>${evChips('esc', last.cites || [])}
      <button class="btn primary small" data-esc>Send escalation</button></div>`;
  }
  function statementForm() {
    const last = att.statement || {};
    return `<div class="op"><div class="diag-h"><b>Actionable incident statement</b> ${att.statement ? '<span class="tag ok">saved</span>' : ''}</div>
      ${['scope', 'onset', 'impact', 'expected', 'observed'].map((k) => `<label>${{ scope: 'Scope (robots / zone / station IDs)', onset: 'Onset (time + zone)', impact: 'Impact (numbers)', expected: 'Expected behavior', observed: 'Observed behavior' }[k]}<input type="text" data-st="${k}" value="${esc(last[k] || '')}"></label>`).join('')}<button class="btn primary small" data-stsave>Save statement to ticket</button></div>`;
  }
  function bComm() {
    const kinds = sc.deliverables.filter((k) => MESSAGE_KINDS[k]);
    return `<div class="card"><h3>Communicate</h3><p class="small">${esc(STAGE_HELP.Communicate)}</p>
      ${sc.deliverables.includes('statement') ? statementForm() : ''}${kinds.map(composer).join('')}${sc.deliverables.includes('escalation') ? escalationForm() : ''}
      ${!sc.deliverables.includes('escalation') ? `<details><summary class="small">Optional: escalate to another team</summary>${escalationForm()}</details>` : ''}
      <p class="small muted">${esc(R.RULE_LIMITS)}</p>${next(true)}</div>`;
  }
  function bMitigate() {
    const pend = sim().s.pendingOps;
    return `<div class="card"><h3>Mitigate within your authority</h3>
      <div class="lesson small"><b>Escalation boundary.</b> <b>You may:</b> ${esc(BOUNDARY.may)}<br><b>Approval needed:</b> ${esc(BOUNDARY.approval)}<br><b>Never:</b> ${esc(BOUNDARY.never)}<br><span class="muted">Real employer authority levels are TO VERIFY.</span></div>
      ${pend.length ? `<p class="pending">⏳ ${pend.map((p) => `${esc(p.kind.replace(/_/g, ' '))} (${Math.max(0, Math.round(p.due - now()))} s)`).join(', ')}</p>` : ''}
      ${sc.ops.map(([op, p], i) => { const m = OPERATIONS[op]; const auth = OP_AUTH[op]; const approved = att.approved?.includes(op); return `<div class="op"><div class="diag-h"><b>${esc(m.label)}</b> <span class="muted">${esc(Object.values(p).join(' · '))}</span> ${auth ? `<span class="tag">${auth === 'eng' ? 'needs engineering' : 'maintenance only'}</span>` : '<span class="tag ok">your authority</span>'}</div><details class="explain"><summary>Impact · prerequisites · preserve · rollback</summary><p class="small"><b>Impact:</b> ${esc(m.impact)} <b>Prerequisites:</b> ${esc(m.prereq)} <b>Preserve:</b> ${esc(m.preserve)} <b>Rollback:</b> ${esc(m.rollback)}</p></details><button class="btn small ${op === 'preserve_evidence' ? '' : 'warn'}" data-op="${i}">${auth && !approved ? 'Request…' : 'Apply…'}</button></div>`; }).join('')}
      ${sc.deliverables.includes('instruction') || true ? instructionForm() : ''}
      <h4>Action log</h4><ul class="evlist">${att.actions.map((a) => `<li>${esc(a.clock)} ${esc(a.label)} — ${esc(a.msg)}</li>`).join('') || '<li class="muted">none</li>'}</ul>${next(true)}</div>`;
  }
  function instructionForm() {
    const co = coachFor(att.mode, 'instruction', hintLvl.instruction || 0);
    return `<div class="op"><div class="diag-h"><b>Closed-loop instruction (radio)</b> ${sc.deliverables.includes('instruction') ? '<span class="tag">required</span>' : '<span class="tag">optional</span>'}</div>
      ${!assess ? `<div class="coach small">${co.examples ? `<ol>${co.examples.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ol>` : ''}${co.hints.map((h, i) => `<p class="hint"><b>Hint ${i + 1}:</b> ${esc(h)}</p>`).join('')}${(hintLvl.instruction || 0) < 3 ? '<button class="btn small" data-hint="instruction">Hint</button>' : ''}</div>` : ''}
      <div class="btnrow"><label>To <select id="iTo"><option value="marco">Marco (floor technician)</option><option value="dana">Dana (shift lead)</option></select></label>
      <label>Action <select id="iAct">${[['walk', 'Look down an aisle from the walkway'], ['hmi', 'Read a station HMI'], ['charger', 'Read a charger display'], ['estop', 'Inspect E-stop & area (shift lead resets per procedure)'], ['clear', 'Clear an aisle under lockout'], ['tote', 'Hand-carry a tote from an isolated robot']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label>Equipment <input type="text" id="iEq" placeholder="e.g. Aisle C, P-4, C-1, R-11" style="width:140px"></label></div>
      <textarea id="iText" rows="2" placeholder="The actual radio message"></textarea><button class="btn small primary" data-instr>Send instruction</button>
      ${(att.instructions || []).map((x, n) => `<p class="small">${esc(x.clock)} → ${esc(PEOPLE[x.to].name)}: ${esc(x.action)} ${esc(x.equipment)} · read-back ${x.readBack ? '✓' : '✕'} · completion report ${x.done ? (x.reported ? '✓ reported' : 'done (not reported)') : 'pending'} · ${x.confirmed ? 'you confirmed ✓' : x.done ? `<button class="btn small" data-confirm="${n}">Confirm completion</button>` : ''}</p>`).join('')}</div>`;
  }
  function bVerify() {
    const since = verifySince();
    return `<div class="card"><h3>Verify</h3><p class="small">${esc(STAGE_HELP.Verify)} Observation since last mitigation: <b data-live="obs">${fmtDur(now() - since)}</b>.</p>
      <div class="btnrow"><button class="btn" data-ff="60">+1 min</button><button class="btn" data-ff="300">+5 min</button><button class="btn primary" data-allchecks>Run all checks</button></div>
      <table class="checks"><tbody>${sc.checks.map((id) => { const r = att.checks[id]; return `<tr><td>${esc(CHECKS[id].label)}</td><td>${r ? `${r.pass ? '<span class="pill ok">✓ PASS</span>' : '<span class="pill bad">✕ FAIL</span>'} <span class="small">${esc(r.detail)} (${esc(r.clock)})${r.t < since ? ' — stale: run after last mitigation' : ''}</span>` : '<span class="muted">not run</span>'}</td></tr>`; }).join('')}</tbody></table>
      <div class="btnrow"><button class="btn primary" data-close ${canClose(att, sc).ok ? '' : 'disabled'}>Close incident (all checks pass)</button><button class="btn" data-tohandoff>Hand off as active</button></div>
      <p class="small muted">${sc.endState === 'handoff' ? 'This incident ends with a shift handoff.' : allChecksPass() ? 'All checks pass — you may close, or hand off if work remains.' : 'Closure is blocked until every required check passes after your last mitigation.'}</p>${next(Object.keys(att.checks).length > 0, 'Run the checks first.')}</div>`;
  }
  function docForm(k) {
    const d = att.docs[k]; const fields = d?.versions?.[d.versions.length - 1]?.fields || draftDoc(k, att, sim());
    const v = validateDoc(k, fields, docCtx(att, sc, sim()));
    return `<h4>${esc(TEMPLATES[k].label)} ${d ? `<span class="tag">v${d.versions.length}</span>` : '<span class="tag">draft from your evidence</span>'}</h4>
      ${TEMPLATES[k].fields.map((f) => `<label>${esc(FIELDS[f].label)}${['evidence', 'actions', 'tests'].includes(f) ? ' <span class="tag">from your record</span>' : ''}<textarea data-df="${f}" rows="${['evidence', 'timeline', 'actions', 'tests', 'hypotheses'].includes(f) ? 4 : 2}">${esc(fields[f] || '')}</textarea></label>`).join('')}
      <label>Revision note (what changed and why)<input type="text" id="dNote"></label>
      <div class="btnrow"><button class="btn primary small" data-dsave="${k}">Save new version</button><button class="btn small" data-dexp="${k}">Export Markdown</button></div>
      ${!assess ? `<div class="docres small">${v.critical.map((c) => `<p class="bad">✕ ${esc(c.msg)}</p>`).join('')}${v.items.map((i) => `<p class="${i.ok ? 'ok' : 'bad'}">${i.ok ? '✓' : '○'} ${esc(i.label)}${i.ok ? '' : ' — ' + esc(i.why)}</p>`).join('')}${v.notes.map((n) => `<p class="warn">⚠ ${esc(n.msg)}</p>`).join('')}</div>` : '<p class="small muted">Assessment mode: field checks are shown after you submit.</p>'}
      ${d && d.versions.length > 1 ? `<details><summary class="small">Revision history (${d.versions.length})</summary>${d.versions.map((x, i) => `<p class="small">v${i + 1} ${esc(x.clock)} ${esc(x.note || '')}${i ? ` — changed: ${diffVersions(d.versions[i - 1].fields, x.fields).map((c) => esc(FIELDS[c.key]?.label || c.key)).join(', ') || 'nothing'}` : ''}</p>`).join('')}</details>` : ''}`;
  }
  function runbookForm() {
    const rb = att.runbook?.versions?.[att.runbook.versions.length - 1]?.fields || { intendedUse: '', preconditions: '', diagnostics: '', decisions: '', stop: '', verification: '', rollback: '', author: '' };
    const last = att.runbook?.tests?.[att.runbook.tests.length - 1];
    return `<h4>Runbook ${att.runbook ? `<span class="tag">v${att.runbook.versions.length}</span>` : ''} ${att.runbook?.validated ? `<span class="pill ok">✓ validated ${esc(att.runbook.validatedClock)}</span>` : ''}</h4>
      ${RUNBOOK_SECTIONS.map(([k, l]) => `<label>${esc(l)}<textarea data-rb="${k}" rows="${['diagnostics', 'decisions', 'verification'].includes(k) ? 5 : 2}">${esc(rb[k] || '')}</textarea></label>`).join('')}
      <div class="btnrow"><button class="btn small" data-rbsave>Save version</button><button class="btn primary small" data-rbtest>Test with simulated technician</button></div>
      ${last ? `<div class="docres small"><p><b>Technician test ${att.runbook.tests.length}</b> — ${last.completed ? '✓ completed every step using only your runbook' : `paused ${last.pauses.length} time(s)`}</p>${last.log.map((x) => `<p class="muted">${esc(x.occ)} · step ${x.step}: ${esc(x.tool)} → ${esc(x.result)}</p>`).join('')}${last.pauses.map((x) => `<p class="bad">⏸ ${esc(x.occ)} · ${esc(x.where)}: ${esc(x.why)}<br>Consequence: ${esc(x.consequence)}</p>`).join('')}<p class="muted">The technician tests the runbook on this occurrence AND a fresh occurrence of the same symptom. Filling every field is not enough; revise and retest.</p></div>` : ''}`;
  }
  function bDoc() {
    const docs = sc.deliverables.filter((k) => TEMPLATES[k]);
    return `<div class="card"><h3>Document</h3><p class="small">${esc(STAGE_HELP.Document)}</p>
      <div class="btnrow">${[...docs, ...(sc.deliverables.includes('runbook') ? ['runbook'] : [])].map((k) => `<button class="btn small ${docSel === k ? 'primary' : ''}" data-dsel="${k}">${esc(TEMPLATES[k]?.label || 'Runbook')}</button>`).join('')}<details style="display:inline"><summary class="small">Other templates</summary>${Object.keys(TEMPLATES).filter((k) => !docs.includes(k)).map((k) => `<button class="btn small" data-dsel="${k}">${esc(TEMPLATES[k].label)}</button>`).join('')}</details></div>
      ${docSel === 'runbook' ? runbookForm() : docForm(docSel)}${next(true)}</div>`;
  }
  function bHandoff() {
    const last = att.handoff.versions[att.handoff.versions.length - 1]?.fields || draftDoc('handoffDoc', att, sim());
    const items = activeItems(sim(), sc, att);
    const co = coachFor(att.mode, 'handoff', hintLvl.handoff || 0);
    return `<div class="card"><h3>Shift handoff → Jordan</h3><p class="small">${esc(STAGE_HELP.Handoff)}</p>
      <div class="lesson small"><b>Board (live):</b> ${items.map((i) => esc(i.label)).join(' · ') || 'no open items detected'} · checks: ${sc.checks.filter((id) => att.checks[id]?.pass).length}/${sc.checks.length} passing</div>
      ${!assess ? `<div class="coach small">${co.examples ? `<ol>${co.examples.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ol>` : ''}${co.hints.map((h, i) => `<p class="hint"><b>Hint ${i + 1}:</b> ${esc(h)}</p>`).join('')}${(hintLvl.handoff || 0) < 3 ? '<button class="btn small" data-hint="handoff">Hint</button>' : ''}</div>` : ''}
      ${TEMPLATES.handoffDoc.fields.map((f) => `<label>${esc(FIELDS[f].label)}<textarea data-hf="${f}" rows="${f === 'actions' || f === 'evidence' ? 3 : 2}">${esc(last[f] || '')}</textarea></label>`).join('')}
      <button class="btn primary" data-handoff ${att.handoff.accepted ? 'disabled' : ''}>Submit handoff to Jordan</button>
      ${att.handoff.rounds.map((r, i) => `<div class="msg"><div class="who">Round ${i + 1} · ${esc(r.clock)} · Jordan</div>${esc(r.text)}</div>`).join('')}
      ${next(att.handoff.accepted || (att.closed?.how === 'closed' && sc.endState !== 'handoff'), sc.endState === 'handoff' ? 'Jordan must accept the handoff.' : 'Close the incident (Verify) or get the handoff accepted.')}</div>`;
  }
  function bReflect() {
    const r = att.reflection || {};
    const sr = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    return `<div class="card"><h3>Reflect: explain your reasoning</h3><p class="small">${esc(STAGE_HELP.Reflect)} 60–120 seconds. Not scored on accent, fluency, length or jargon — only on whether the explanation covers observation, alternatives, the key test, uncertainty and next steps.</p>
      <div class="btnrow">${sr ? '<button class="btn" data-speak>🎙 Speak (browser speech-to-text)</button>' : '<span class="muted small">Speech input not available in this browser — type instead.</span>'}</div>
      <textarea id="refl" rows="5" placeholder="I saw… I considered… I chose the test… because… I still don’t know… Next…">${esc(r.text || '')}</textarea>
      ${r.pasted ? '<p class="warn small">Pasted text detected — practise saying it without reading a script.</p>' : ''}
      <div class="btnrow"><button class="btn primary" data-submit>Submit attempt for assessment</button></div>
      <p class="small muted">Submitting freezes your first-attempt score. You will then revise independently, and a different incident will test the same skills.</p></div>`;
  }
  function bFeedback() {
    const f = att.first; const rv = att.revised;
    const met = f.metrics;
    return `<div class="card"><h3>Feedback — first attempt ${f.total}/100 ${rv ? `· revised ${rv.total}/100` : ''}</h3>
      <div class="reveal"><h4>What was actually happening</h4><p><b>${esc(HYP_LABELS[truth.cause])}</b>. ${esc(truth.explanation)}</p><p><b>Mitigation:</b> ${esc(truth.mitigation)} <b>Permanent:</b> ${esc(truth.permanent)} <b>Owning team:</b> ${esc(truth.team)}</p></div>
      ${f.critical.length ? `<div class="critical"><h4>Critical failures — remediation required before this counts as a pass</h4>${f.critical.map((c) => `<p>✕ <b>${esc(R.CRITICAL_LABELS[c.code] || c.code)}</b> (${esc(c.where || '')}): ${esc(c.msg)}${c.example ? ` — “${esc(c.example)}”` : ''}</p>`).join('')}</div>` : ''}
      ${f.cats.map((c) => `<div class="cat"><div class="cat-h"><b>${esc(c.label)}</b><span>${c.got}/${c.max}</span></div><div class="bar"><i style="width:${(c.got / c.max) * 100}%"></i></div>${c.notes.map((n) => `<p class="small ${n.pts < 0 ? 'ded' : 'ok'}">${n.pts < 0 ? `−${-n.pts}` : '•'} ${esc(n.why)}${n.example ? `<br><span class="muted">${esc(n.example)}</span>` : ''}</p>`).join('')}</div>`).join('')}
      <p class="small muted">${esc(R.NOT_SCORED)} Technical correctness and communication quality are scored separately.</p>
      <h4>Metrics for this incident</h4><table class="kv small"><tr><th>Time to acknowledgment</th><td>${met.ackTime == null ? 'none sent' : fmtDur(met.ackTime)}</td></tr><tr><th>Update commitments met</th><td>${met.commitments.met}/${met.commitments.made}</td></tr><tr><th>Time to useful escalation</th><td>${met.usefulEscalation === 'not needed' ? 'not needed' : met.usefulEscalation == null ? 'none achieved' : fmtDur(met.usefulEscalation)}</td></tr><tr><th>Unnecessary / repeated tests</th><td>${met.repeatedTests} (+ ${met.unfocusedQuestions} unfocused questions)</td></tr><tr><th>Recovery verification</th><td>${met.verification.passed}/${met.verification.required}</td></tr><tr><th>Handoff questions</th><td>${met.handoffQuestions ?? '—'}</td></tr><tr><th>Runbook</th><td>${met.runbookSuccess ? (met.runbookSuccess.validated ? `validated after ${met.runbookSuccess.tests} test(s)` : 'not validated') : '—'}</td></tr><tr><th>Unsupported claims</th><td>${met.unsupportedClaims}</td></tr><tr><th>Documentation corrections</th><td>${met.docCorrections}</td></tr></table>
      <p class="small muted">Operational results (queue, throughput) are not attributed to your messages. Definitions: <a href="#/comms">module page</a>.</p>
      ${!att.revisionDone ? revisionWorkspace() : postRevision()}</div>`;
  }
  function revisionTargets() { return [...sc.deliverables.filter((k) => MESSAGE_KINDS[k]), ...sc.deliverables.filter((k) => TEMPLATES[k])]; }
  function revisionWorkspace() {
    const rv = att.revision || { messages: {}, docs: {} };
    return `<h3>Revise independently</h3><p class="small">Improve your own deliverables using the feedback above. The model answers stay hidden until you finish revising. Your first-attempt score is preserved.</p>
      ${revisionTargets().map((k) => MESSAGE_KINDS[k] ? `<label>${esc(MESSAGE_KINDS[k].label)}<textarea data-rv="${k}" rows="3">${esc(rv.messages[k] ?? (att.messages.filter((m) => m.kind === k).pop()?.text || ''))}</textarea></label>` : `<details><summary>${esc(TEMPLATES[k].label)}</summary>${TEMPLATES[k].fields.map((f) => `<label class="small">${esc(FIELDS[f].label)}<textarea data-rvd="${k}:${f}" rows="2">${esc((rv.docs[k] || att.docs[k]?.versions?.slice(-1)[0]?.fields || {})[f] || '')}</textarea></label>`).join('')}</details>`).join('')}
      ${att.escalations.length || sc.deliverables.includes('escalation') ? '<p class="small">Escalation and handoff revisions: re-send them from the Communicate / Handoff steps — the characters will respond again.</p>' : ''}
      <div class="btnrow"><button class="btn" data-rvcheck>Check revision</button><button class="btn primary" data-rvdone>Finish revision</button></div><div id="rvOut"></div>`;
  }
  function postRevision() {
    let ma = null; try { ma = modelAnswers(att, sc, sim()); } catch { ma = null; }
    const weakest = weakestSkill();
    const nextSc = scenariosForSkill(weakest, sc.id).filter((s) => !s.capstone)[0];
    return `<h3>Model answers (shown after revision)</h3>${ma ? `<p class="small"><b>Ops update:</b> ${esc(ma.ops3)}</p><p class="small"><b>Escalation:</b> ${esc(ma.escalation)}</p><p class="small"><b>Handoff structure:</b> ${esc(ma.handoff)}</p>` : ''}
      <p class="small muted">Model answers are illustrations built from what actually happened, not the only correct wording.</p>
      <h3>Apply the skill to a different incident</h3><p>Weakest skill in this attempt: <b>${esc(SKILL_LABELS[weakest] || weakest)}</b>. ${nextSc ? `Suggested transfer incident: <b>${esc(nextSc.letter)} — ${esc(nextSc.title)}</b>.` : ''}</p>
      ${nextSc ? `<button class="btn primary" data-transfer="${nextSc.id}">Start transfer incident (${att.mode === 'guided' ? 'assisted' : att.mode} mode)</button>` : ''} <a class="btn" href="#/comms">Back to module</a> <a class="btn" href="#/comms-interview">Explain it in the interview room</a>`;
  }
  function weakestSkill() { const keys = att.first.reviewKeys.filter((k) => SKILL_LABELS[k] || MESSAGE_KINDS[k]); const map = { ops3: 'audience', ops: 'audience', mgmt: 'audience', eng: 'audience', hypothesis: 'uncertainty', documentation: 'documentation' }; const k = keys[0] || 'escalation'; return map[k] || k; }

  // ---------------------------------------------------------------- draw
  function draw() {
    const stg = att.stage;
    const body = stg === CSTAGES.length ? bFeedback() : [bInspect, bAsk, bHyp, bTest, bComm, bMitigate, bVerify, bDoc, bHandoff, bReflect][stg]();
    root.innerHTML = header() + body + channels();
    root.querySelectorAll('[data-autoscroll]').forEach((el) => { el.scrollTop = el.scrollHeight; });
  }
  function go(i) { att.stage = i; att.reached = Math.max(att.reached, i); save(); draw(); caption(`${[...CSTAGES, 'Feedback'][i]}: ${STAGE_HELP[CSTAGES[i]] || 'Review your feedback, then revise.'}`); root.closest('.panel')?.scrollTo?.(0, 0); }

  // ---------------------------------------------------------------- actions
  function runDiag(id, kind) {
    const D = DIAGNOSTICS[id] || SANDBOX_TESTS[id];
    const exp = root.querySelector(`[data-exp="${id}"]`)?.value;
    if (!exp) { toast('Choose what you expect first.', 'warn'); return; }
    const sep = root.querySelector(`[data-sep="${id}"]`)?.value;
    if (kind === 'test' && !sep) { toast('Say which two hypotheses this test separates.', 'warn'); return; }
    const p = { robot: root.querySelector(`[data-rsel="${id}"]`)?.value, station: root.querySelector(`[data-ssel="${id}"]`)?.value, ...(sc.target || {}) };
    if (root.querySelector(`[data-rsel="${id}"]`)) p.robot = root.querySelector(`[data-rsel="${id}"]`).value;
    let res; try { res = D.run(sim(), p); } catch (e) { toast('Check failed: ' + e.message, 'warn'); return; }
    const e = addEvidence({ source: id, label: D.label + (p.robot && D.target === 'robot' ? ` (${p.robot})` : ''), summary: res.summary, facts: res.facts, outcome: res.outcome, expected: exp, matched: exp === res.outcome, testIntent: sep || null });
    if (!e.matched && !assess) toast(`Result differs from your expectation — what does that change?`);
    draw();
  }
  function capture(kind) {
    const s = sim();
    if (kind === 'dash') addEvidence({ source: 'observe:dash', label: 'Dashboard', summary: `Availability ${Math.round(s.metric('availability') * 100)}%, ${Math.round(s.metric('tasksPerHour', 900) ?? 0)} tasks/h, queue ${s.queueDepth()}, oldest task ${fmtDur(s.oldestOpenAge())}`, outcome: s.oldestOpenAge() > 300 ? 'high' : 'normal' });
    if (kind === 'alarms') { const al = s.activeAlarms(); addEvidence({ source: 'observe:alarms', label: 'Active alarms', summary: al.length ? al.map((a) => a.msg).join('; ') : 'none' }); }
    if (kind === 'scene') { const odd = s.s.robots.map((r) => [r.id, robotLabel(s, r)]).filter(([, l]) => !['WORKING', 'IDLE', 'CHARGING'].includes(l)); addEvidence({ source: 'observe:scene', label: '3D scene labels', summary: odd.length ? odd.map(([id, l]) => `${id} ${l}`).join(', ') : 'All robots WORKING/IDLE/CHARGING' }); }
    if (kind === 'oldest') { const D = DIAGNOSTICS.trace_oldest; const r = D.run(s, {}); addEvidence({ source: 'trace_oldest', label: 'Oldest order task record', summary: `${r.summary} History: ${(r.rows || []).slice(-4).map((x) => `${x[0]} ${x[1]}`).join(' | ')}`, outcome: r.outcome }); }
    draw();
  }
  function robotLabel(s, r) { return ({ blocked: 'STOPPED', loc_lost: 'STOPPED', fault: 'STOPPED', comms_stop: 'NO LINK', estop: 'E-STOP', waiting_station: 'WAITING', charging: r.chargeA === 0 ? 'NOT CHARGING' : 'CHARGING', idle: 'IDLE' })[r.state] || (r.isolated ? 'ISOLATED' : 'WORKING'); }
  function ask(qid) {
    const q = QUESTIONS[qid]; const param = root.querySelector(`[data-qp="${qid}"]`)?.value;
    const r = askQuestion(qid, sim(), att, sc, param);
    att.asked.push({ qid, t: now(), param, repeated: r.repeated, onScreen: r.onScreen, unfocused: !q.focused });
    att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), to: q.to, kind: 'question', text: q.q + (param ? ` (${param})` : ''), channel: PEOPLE[q.to].channel });
    tl('message', `You → ${PEOPLE[q.to].name}: ${q.q}${param ? ` (${param})` : ''}`);
    att.queue.push({ at: now() + (q.delay || 5), type: 'answer', qid, from: q.to, text: r.text, outcome: r.outcome, source: r.source, fact: q.fact });
    if (!q.focused && !assess) toast('That question is unlikely to help the people who must act.', 'warn');
    save(); draw();
  }
  function sendMessage(kind) {
    const text = root.querySelector(`#m-${kind}`).value.trim();
    if (text.length < 10) { toast('Write the message first.', 'warn'); return; }
    if (/\[[A-Z ]+\]/.test(text)) { toast('Replace placeholders first.', 'warn'); return; }
    if (kind === 'prioritization') att.prioritization = { order: [...root.querySelectorAll('[data-prio]')].map((x) => x.value), text, t: now() };
    const ctx2 = msgCtx(att, sc, sim(), { recovered: allChecksPass(), causeKnown: causeKnownNow() });
    const r = MESSAGE_KINDS[kind].check(text, ctx2);
    const m = { id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), kind, to: MSG_PEOPLE[kind], text, channel: kind === 'mgmt' || kind === 'eng' || kind === 'disagreement' ? 'chat' : 'radio', recoveredAt: allChecksPass() ? now() : null, causeKnownAt: causeKnownNow() ? now() : null, feedback: `Checklist: ${r.items.filter((i) => i.ok).length}/${r.items.length}${r.critical.length ? ' · ✕ ' + r.critical.map((c) => c.msg).join(' ') : ''}${r.items.filter((i) => !i.ok).length ? ' · missing: ' + r.items.filter((i) => !i.ok).map((i) => i.label).join('; ') : ''}${r.tips.length ? ' · ' + r.tips.join(' ') : ''}` };
    att.messages.push(m); tl('message', `You → ${m.to}: (${kind}) ${text}`.slice(0, 260));
    // commitments
    for (const c of att.commitments) if (!c.met && !c.missed && now() <= c.due + 60) c.met = true;
    const mt = text.match(/(?:update|hear from me|back to you|report)[^.]{0,30}?\b([01]?\d|2[0-3]):([0-5]\d)\b/i) || text.match(/\b(?:by|at)\s+([01]?\d|2[0-3]):([0-5]\d)\b/i); const mm = text.match(/in (\d+) ?min/i);
    if (mt) { let sec = (+mt[1]) * 3600 + (+mt[2]) * 60 - sim().s.clock0; if (sec < now() - 3600) sec += 86400; if (sec > now()) att.commitments.push({ due: sec, at: now(), msgId: m.id }); } else if (mm) att.commitments.push({ due: now() + (+mm[1]) * 60, at: now(), msgId: m.id });
    if (R.ETA_RE.test(text) && !causeKnownNow()) att.etaPromise = { at: now(), text };
    // replies
    let reply;
    if (kind === 'mgmt') reply = ['avery', respondMgmt(text, ctx2)];
    else if (kind === 'eng') reply = ['priya', r.items.filter((i) => !i.ok).length > 1 ? `Can you add ${r.items.filter((i) => !i.ok).map((i) => i.label.toLowerCase()).slice(0, 2).join(' and ')}?` : 'Thanks — clear and reproducible.'];
    else if (kind === 'disagreement') { const d = respondDisagreement(text, ctx2); att.queue.push({ at: now() + 8, type: 'msg', from: 'dana', channel: 'radio', text: d.dana }); reply = ['priya', d.priya]; }
    else reply = ['dana', respondOps(kind, text, ctx2)];
    att.queue.push({ at: now() + 6, type: 'msg', from: reply[0], channel: PEOPLE[reply[0]].channel, text: reply[1] });
    if (!assess) toast(m.feedback.slice(0, 160));
    save(); draw();
  }
  async function sendEscalation() {
    const f = { team: root.querySelector('#eTeam').value, summary: root.querySelector('#eSum').value.trim(), repro: root.querySelector('#eRep').value.trim(), ruledOut: root.querySelector('#eRul').value.trim(), request: root.querySelector('#eReq').value.trim(), cites: chipVals('esc') };
    if (f.request.length < 10) { toast('Write a specific request.', 'warn'); return; }
    if (!(await pause('escalate'))) return;
    const ctx2 = msgCtx(att, sc, sim(), { evidence: att.evidence, approveText: approveText() });
    const res = respondEscalation(f, ctx2);
    const e = { t: now(), clock: sim().clockStr(), team: f.team, fields: f, useful: res.useful, reply: res.text, pct: res.pct };
    att.escalations.push(e); att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), kind: 'escalation', to: TEAM_PERSON[f.team], text: `${f.summary}\nRepro: ${f.repro}\nRuled out: ${f.ruledOut}\nRequest: ${f.request}\nEvidence: ${f.cites.join(', ')}`, channel: 'chat' });
    tl('message', `Escalation → ${f.team}: ${f.request}`.slice(0, 220));
    att.queue.push({ at: now() + 20, type: 'msg', from: res.person, channel: 'chat', text: res.text });
    // save as escalation document version
    (att.docs.escalationDoc ||= { versions: [] }).versions.push({ t: now(), clock: sim().clockStr(), fields: { incidentId: att.incidentId, title: `${sc.title}`, impact: f.summary, evidence: f.cites.map((c) => `[${c}]`).join(' '), tests: f.ruledOut, nextAction: f.request, owner: f.team, followUp: '', observed: f.repro, expected: '', affected: R.idsIn(`${f.summary} ${f.repro}`).join(', '), timestamp: `${clk()} facility time (simulated)`, uncertainty: '' }, note: 'Sent escalation', phase: att.submitted ? 'revision' : 'first' });
    if (res.useful && f.team === truth.team) { att.approved = [...new Set([...(att.approved || []), ...(truth.approve || []).map(([op]) => op)])]; for (const [op, p] of truth.approve || []) att.queue.push({ at: now() + 60, type: 'engAction', op, p, by: res.person }); }
    save(); draw();
  }
  function approveText() { const ap = truth.approve || []; if (!ap.length) return 'I’ll follow up and confirm.'; const [op, p] = ap[0]; return `I’ll handle “${OPERATIONS[op].label}${Object.keys(p).length ? ' (' + Object.values(p).join(', ') + ')' : ''}” on our side and confirm when done — please verify afterwards.`; }
  async function doOp(i) {
    const [op, p0] = sc.ops[i]; const m = OPERATIONS[op]; const auth = OP_AUTH[op]; const p = { ...p0 };
    if (op === 'preserve_evidence') { const r = sim().operate(op, p); logAction(op, p, r, m.label); return; }
    if (auth) { att.authRefusals = (att.authRefusals || 0) + 1; toast(`Outside your authority: ${m.label} needs ${auth === 'eng' ? 'engineering' : 'maintenance'}. Escalate with evidence and a specific request; they perform it.`, 'warn'); tl('system', `Attempted “${m.label}” — outside your authority; escalation required.`); save(); return; }
    if (!att.pauses.some((x) => x.before === 'mitigate')) { if (!(await pause('mitigate'))) return; }
    const erases = ['restart_robot', 'restart_service', 'rollback_release'].includes(op);
    const preserved = sim().s.preserved.some((x) => x.t > now() - 900);
    const r = await modal(`${m.label} — confirm`, `<dl class="opconf"><dt>Expected impact</dt><dd>${esc(m.impact)}</dd><dt>Prerequisites</dt><dd>${esc(m.prereq)}</dd><dt>Evidence to preserve</dt><dd>${esc(m.preserve)}${erases && !preserved ? '<br><b class="warn">⚠ Not preserved yet — this can erase evidence.</b>' : ''}</dd><dt>Rollback</dt><dd>${esc(m.rollback)}</dd></dl>`, [{ label: 'Cancel', value: null }, ...(erases && !preserved ? [{ label: 'Preserve evidence first', value: 'p' }] : []), { label: 'Apply (simulated)', value: 'go', primary: true }]);
    if (!r?.value) return;
    if (r.value === 'p') { logAction('preserve_evidence', {}, sim().operate('preserve_evidence', p), 'Preserve evidence'); }
    const res = sim().operate(op, p); logAction(op, p, res, `${m.label}${Object.keys(p).length ? ' (' + Object.values(p).join(', ') + ')' : ''}`, erases ? (preserved || r.value === 'p') : true);
  }
  function logAction(op, p, res, label, preserved = true) { att.actions.push({ t: now(), clock: sim().clockStr(), op, params: p, ok: res.ok, msg: res.msg, label, preserved, pendingFor: res.pendingFor || 0 }); tl('action', `${label} → ${res.msg}`.slice(0, 220)); toast(res.msg, res.ok ? 'info' : 'warn'); save(); draw(); }
  function sendInstruction() {
    const f = { to: root.querySelector('#iTo').value, actionType: root.querySelector('#iAct').value, equipment: root.querySelector('#iEq').value.trim(), text: root.querySelector('#iText').value.trim() };
    f.action = root.querySelector('#iAct').selectedOptions[0].textContent;
    if (f.text.length < 10) { toast('Write the radio message.', 'warn'); return; }
    const res = respondInstruction(f, msgCtx(att, sc, sim()));
    const ins = { ...f, t: now(), clock: sim().clockStr(), readBack: res.readBack, willConfirm: res.willConfirm, done: false, reported: false, confirmed: false };
    att.instructions.push(ins); att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), kind: 'instruction', to: f.to, text: f.text, channel: 'radio' });
    tl('message', `Instruction → ${PEOPLE[f.to].name}: ${f.text}`.slice(0, 220));
    att.queue.push({ at: now() + 5, type: 'msg', from: f.to, channel: 'radio', text: res.text.replace(/^\w+: /, '') });
    if (!res.needsMore && !res.checklist.critical.length) att.queue.push({ at: now() + 75, type: 'instrDone', idx: att.instructions.length - 1 });
    save(); draw();
  }
  async function submitHandoff() {
    const fields = Object.fromEntries([...root.querySelectorAll('[data-hf]')].map((x) => [x.dataset.hf, x.value]));
    if (!(await pause('hand off'))) return;
    const items = activeItems(sim(), sc, att); const passNow = sc.checks.every((id) => sc.checks && CHECKS[id].run(sim(), { since: verifySince() }).pass);
    const saysResolved = /resolved|closed|fixed|all good/i.test(fields.status || '') && !/(un|not)\s*resolved/i.test(fields.status || '');
    const failing = sc.checks.filter((id) => !CHECKS[id].run(sim(), { since: verifySince(), relatedKeys: sc.relatedAlarms }).pass).map((id) => CHECKS[id].label);
    const ctx2 = { ...msgCtx(att, sc, sim()), statusHonest: !saysResolved || failing.length === 0, activeItems: items, hasPending: sim().s.pendingOps.length > 0, failing, incidentId: att.incidentId, unresolved: failing.length > 0 || items.length > 0 };
    const res = respondHandoff(fields, ctx2); void passNow;
    att.handoff.versions.push({ t: now(), clock: sim().clockStr(), fields, phase: att.submitted ? 'revision' : 'first' });
    att.handoff.rounds.push({ t: now(), clock: sim().clockStr(), questions: res.questions, accepted: res.accepted, text: res.text, critical: res.checklist.critical });
    (att.docs.handoffDoc ||= { versions: [] }).versions.push({ t: now(), clock: sim().clockStr(), fields, note: `Handoff round ${att.handoff.rounds.length}` });
    att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), kind: 'handoff', to: 'jordan', text: Object.entries(fields).map(([k, v]) => `${FIELDS[k]?.label || k}: ${v}`).join('\n'), channel: 'chat' });
    att.queue.push({ at: now() + 10, type: 'msg', from: 'jordan', channel: 'chat', text: res.text });
    if (res.accepted) { att.handoff.accepted = true; att.handoff.acceptedClock = sim().clockStr(); if (!att.closed) att.closed = { t: now(), how: 'handoff' }; tl('system', `Handoff accepted by Jordan at ${sim().clockStr()}.`); }
    else tl('system', `Handoff not accepted: ${res.questions.length} question(s).`);
    save(); draw();
  }
  function submitAttempt() {
    att.reflection = { ...(att.reflection || {}), text: root.querySelector('#refl').value.trim(), t: now() };
    if (att.reflection.text.split(/\s+/).length < 20) { toast('Explain your reasoning in at least a few sentences (≈ 20+ words).', 'warn'); return; }
    const cs2 = canSubmit(att, sc); if (!cs2.ok) { toast(cs2.reason, 'warn'); return; }
    att.submitted = true; att.first = scoreAttempt(att, sc, sim()); att.stage = CSTAGES.length; att.reached = CSTAGES.length;
    tl('system', `Submitted for assessment: ${att.first.total}/100${att.first.critical.length ? ` with ${att.first.critical.length} critical failure(s)` : ''}.`);
    for (const k of att.first.reviewKeys) { const it = COMM_REVIEW[k] || COMM_REVIEW[{ ops3: 'ops3', ops: 'ops3', eng: 'escalation', mgmt: 'mgmt' }[k]]; if (it) addReview({ kind: 'communication', skill: ['documentation', 'runbook', 'hypothesis'].includes(k) ? 'documentation' : 'communication', sig: `cx:${k}:${it.q}`, source: `Comms ${sc.letter}`, prompt: it.q, options: it.options, answer: it.answer, explain: it.why }); }
    recordAttempt(); save(); draw();
  }
  function recordAttempt() {
    const c = cs(); const rec = { id: att.id, scenarioId: sc.id, letter: sc.letter, title: sc.title, mode: att.mode, variant: att.variant, ended: Date.now(), first: { total: att.first.total, critical: att.first.critical.map((x) => ({ code: x.code, msg: x.msg })), cats: att.first.cats.map((x) => ({ id: x.id, label: x.label, got: x.got, max: x.max })), metrics: att.first.metrics, reviewKeys: att.first.reviewKeys }, revised: att.revised ? { total: att.revised.total, critical: att.revised.critical.map((x) => ({ code: x.code })) } : null, revisionDone: !!att.revisionDone, transferOf: att.transferOf, skills: sc.skills, artifacts: artifacts() };
    const i = c.attempts.findIndex((x) => x.id === att.id); if (i >= 0) c.attempts[i] = rec; else c.attempts.push(rec);
    const pct = (id) => { const x = (att.revised || att.first).cats.find((k) => k.id === id); return x ? Math.round((x.got / x.max) * 100) : null; };
    const g = store.get(); const entry = { id: att.id, scenarioId: sc.id, title: `Comms ${sc.letter} · ${sc.title}`, walkthrough: 'COMMS', mode: att.mode, started: att.started, ended: Date.now(), total: (att.revised || att.first).total, skills: { communication: pct('communication'), documentation: pct('documentation'), diagnosis: pct('accuracy'), verification: pct('reasoning') }, critical: att.first.critical.map((x) => x.code), cats: att.first.cats.map((x) => ({ name: x.label, got: x.got, max: x.max, notes: x.notes })) };
    const j = g.attempts.findIndex((x) => x.id === att.id); if (j >= 0) g.attempts[j] = entry; else g.attempts.push(entry);
  }
  function artifacts() {
    const pick = (k) => att.messages.filter((m) => m.kind === k).pop()?.text;
    const esc1 = att.escalations.find((e) => e.useful) || att.escalations[att.escalations.length - 1];
    return { incidentId: att.incidentId, scenario: `${sc.letter} — ${sc.title}`, variantRevealed: HYP_LABELS[truth.cause], opsUpdate: pick('ops3') || pick('ops'), opsCheck: (pick('ops3') || pick('ops')) ? R.scoreOf(MESSAGE_KINDS[pick('ops3') ? 'ops3' : 'ops'].check(pick('ops3') || pick('ops'), msgCtx(att, sc, sim()))).pct : 0, escalation: esc1 ? { ...esc1.fields, useful: esc1.useful, reply: esc1.reply } : null, handoff: att.handoff.accepted ? att.handoff.versions[att.handoff.versions.length - 1].fields : null, handoffRounds: att.handoff.rounds.length, runbook: att.runbook?.validated ? att.runbook.versions[att.runbook.versions.length - 1].fields : null, runbookTests: att.runbook?.tests?.length || 0, pir: att.docs.pir?.versions?.slice(-1)[0]?.fields || null, revisions: Object.entries(att.docs).filter(([, d]) => d.versions.length > 1).map(([k, d]) => ({ doc: TEMPLATES[k]?.label || k, before: d.versions[0].fields, after: d.versions[d.versions.length - 1].fields })), messageRevision: att.revision?.messages ? Object.entries(att.revision.messages).map(([k, v]) => ({ kind: MESSAGE_KINDS[k]?.label || k, before: att.messages.filter((m) => m.kind === k).pop()?.text || '', after: v })) : [], timeline: att.timeline.slice(-40), reflection: att.reflection?.text || '' };
  }

  // ---------------------------------------------------------------- timed events
  function tick() {
    let changed = false;
    att.queue.sort((a, b) => a.at - b.at);
    while (att.queue.length && att.queue[0].at <= now()) {
      const q = att.queue.shift(); changed = true;
      if (q.type === 'msg') { msg(q.from, q.channel, q.text); tl('message', `${PEOPLE[q.from].name}: ${q.text}`.slice(0, 220)); }
      if (q.type === 'answer') { msg(q.from, PEOPLE[q.from].channel, q.text); if (q.fact) addEvidence({ source: q.source, label: `Info from ${PEOPLE[q.from].name}`, summary: q.text, outcome: q.outcome }); }
      if (q.type === 'pressure') { const has = att.messages.some((m) => !m.from && ['ops', 'ack', 'uncertainty'].includes(m.kind) && m.t > now() - 150); msg('dana', 'radio', has ? 'OK — but the floor keeps asking me for a time. When will it be back?' : 'I still don’t have a time. The supervisor wants to know when we’ll be back up.'); }
      if (q.type === 'handoffNag' && !att.handoff.accepted) msg('dana', 'radio', 'Your shift has ended — has Jordan got this?');
      if (q.type === 'second') { const [k, p] = sc.secondIncident.inject; sim().inject(k, p); msg('dana', 'radio', sc.secondIncident.text); tl('system', 'Second issue reported.'); }
      if (q.type === 'engAction' && q.op === 'repair' && sim().robot(q.p.robot)?.state !== 'in_maintenance') { q.tries = (q.tries || 0) + 1; if (q.tries === 1) msg(q.by, 'chat', `Isolate ${q.p.robot} and send it to the maintenance bay (that’s within your authority). I’ll do the bench work as soon as it arrives.`); if (q.tries < 20) att.queue.push({ ...q, at: now() + 45 }); continue; }
      if (q.type === 'engAction') { const res = sim().operate(q.op, { ...q.p }); att.actions.push({ t: now(), clock: sim().clockStr(), op: q.op, params: q.p, ok: res.ok, msg: `${PEOPLE[q.by].name} (fictional): ${res.msg}`, label: `${OPERATIONS[q.op].label} — performed by ${PEOPLE[q.by].name}`, preserved: true, pendingFor: res.pendingFor || 0, by: q.by }); tl('action', `${PEOPLE[q.by].name} performed ${OPERATIONS[q.op].label}: ${res.msg}`.slice(0, 220)); msg(q.by, 'chat', res.ok ? `Done on our side: ${res.msg} Please verify.` : `I couldn’t do that yet: ${res.msg}`); }
      if (q.type === 'instrDone') { const ins = att.instructions[q.idx]; ins.done = true; const result = instructionResult(ins); if (ins.willConfirm) { ins.reported = true; msg(ins.to, 'radio', `Done: ${result.text}`); } if (result.evidence) addEvidence({ source: result.source, label: `Physical check by ${PEOPLE[ins.to].name}`, summary: ins.willConfirm ? result.text : `(${PEOPLE[ins.to].name} did not report back — you didn’t ask for confirmation) ${result.text}`, outcome: result.outcome }); }
    }
    for (const c of att.commitments) if (!c.met && !c.missed && now() > c.due + 60) { c.missed = true; msg('dana', 'radio', `You said I’d hear from you by ${clk(c.due)} — anything?`); changed = true; }
    if (att.etaPromise && !att.etaChased && now() > att.etaPromise.at + 420 && !allChecksPass()) { att.etaChased = true; msg('dana', 'radio', 'It’s past the time you gave me and it’s still not fixed. The floor planned around your estimate.'); changed = true; }
    if (changed) { save(); if (!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) draw(); else toast('New message — see Radio / Team chat.'); }
  }
  function instructionResult(ins) {
    const s = sim(); const eq = ins.equipment.toUpperCase();
    if (ins.actionType === 'walk') { const a = (eq.match(/[A-D]\b/) || ['C'])[0]; const r = askQuestion('marco.walk', s, att, sc, a); return { text: r.text, evidence: true, outcome: r.outcome, source: 'ask:walk' }; }
    if (ins.actionType === 'hmi') { const st = (eq.match(/P-\d/) || [])[0]; const r = askQuestion('marco.hmi', s, att, sc, st); return { text: r.text, evidence: true, outcome: r.outcome, source: 'station_local' }; }
    if (ins.actionType === 'charger') { const r = askQuestion('marco.charger', s, att, sc); return { text: r.text, evidence: true, source: 'ask:charger' }; }
    if (ins.actionType === 'estop') { const rid = (eq.match(/R-\d\d/) || ['R-11'])[0]; const res = s.operate('request_estop_inspection', { robot: rid }); att.actions.push({ t: now(), clock: s.clockStr(), op: 'request_estop_inspection', params: { robot: rid }, ok: res.ok, msg: res.msg, label: `E-stop inspection ${rid} (via instruction)`, pendingFor: res.pendingFor || 0 }); return { text: `${rid}: area checked from the walkway; shift lead will reset per procedure once confirmed clear.`, evidence: true, source: 'ask:estop' }; }
    if (ins.actionType === 'clear') { const a = (eq.match(/[A-D]\b/) || ['B'])[0]; const res = s.operate('request_aisle_clear', { aisle: a }); att.actions.push({ t: now(), clock: s.clockStr(), op: 'request_aisle_clear', params: { aisle: a }, ok: res.ok, msg: res.msg, label: `Aisle ${a} clear under lockout (via instruction)`, pendingFor: res.pendingFor || 0 }); return { text: `Aisle ${a} locked out; clearing now.`, evidence: false }; }
    if (ins.actionType === 'tote') { const rid = (eq.match(/R-\d\d/) || [''])[0]; const res = rid ? s.operate('recover_payload', { robot: rid }) : { ok: false, msg: 'Which robot?' }; return { text: res.msg, evidence: false }; }
    return { text: 'Done.', evidence: false };
  }

  // ---------------------------------------------------------------- events
  root.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.stage) return go(+d.stage);
    if (d.ch) { chTab = d.ch; draw(); return; }
    if (d.next !== undefined) return go(att.stage + 1);
    if (d.cap) return capture(d.cap);
    if (d.run) return runDiag(d.run, d.kind);
    if (d.ask) return ask(d.ask);
    if (d.hint) { hintLvl[d.hint] = (hintLvl[d.hint] || 0) + 1; att.hintsUsed = (att.hintsUsed || 0) + 1; save(); draw(); return; }
    if (d.addh) { att.hyps.push({ id: d.addh, label: HYP_LABELS[d.addh], status: 'open', history: [{ t: now(), clock: sim().clockStr(), status: 'open', reason: 'added', evidence: [] }] }); tl('hyp', `Hypothesis added: ${HYP_LABELS[d.addh]}`); save(); draw(); return; }
    if (d.hsave) { const h = att.hyps.find((x) => x.id === d.hsave); const st = root.querySelector(`[data-hs="${h.id}"]`).value; const reason = root.querySelector(`[data-hr="${h.id}"]`).value.trim(); if (!st) { toast('Choose a status.', 'warn'); return; } if (reason.split(/\s+/).length < 3) { toast('Give a reason (a few words) — rejected hypotheses stay in the record with why.', 'warn'); return; } const ev = chipVals(`h-${h.id}`); h.status = st; h.history.push({ t: now(), clock: sim().clockStr(), status: st, reason, evidence: ev }); tl('hyp', `${h.label} → ${st.toUpperCase()}: ${reason}${ev.length ? ` [${ev.join(', ')}]` : ''}`); save(); draw(); return; }
    if (d.assess !== undefined) { const cause = root.querySelector('#asC').value; const conf = root.querySelector('#asF').value; const reason = root.querySelector('#asR').value.trim(); if (!cause) { toast('Choose a cause.', 'warn'); return; } if (att.assessment && reason.split(/\s+/).length < 3) { toast('Explain what changed (a few words).', 'warn'); return; } if (att.assessment) att.assessmentHistory.push({ ...att.assessment, clock: sim().clockStr(att.assessment.t), reason: reason || 'initial' }); att.assessment = { cause, confidence: conf, evidence: chipVals('as'), t: now() }; tl('hyp', `Assessment: ${HYP_LABELS[cause]} (${conf})${reason ? ' — ' + reason : ''}`); save(); draw(); return; }
    if (d.cite) { const ta = root.querySelector(`#m-${d.cite}`); ta.value = (ta.value + ' ' + chipVals(`c-${d.cite}`).map((x) => `[${x}]`).join('')).trim(); return; }
    if (d.send) return sendMessage(d.send);
    if (d.esc !== undefined) return sendEscalation();
    if (d.stsave !== undefined) { att.statement = Object.fromEntries([...root.querySelectorAll('[data-st]')].map((x) => [x.dataset.st, x.value])); const r = R.checkStatement(att.statement, { ...msgCtx(att, sc, sim()), knownIds: docCtx(att, sc, sim()).knownIds }); att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), kind: 'statement', to: 'dana', text: Object.entries(att.statement).map(([k, v]) => `${k}: ${v}`).join(' | '), channel: 'radio', feedback: `Checklist ${r.items.filter((i) => i.ok).length}/${r.items.length}` }); tl('doc', 'Actionable incident statement saved to ticket.'); if (!assess) toast(`Statement checklist ${r.items.filter((i) => i.ok).length}/${r.items.length}`); save(); draw(); return; }
    if (d.op) return doOp(+d.op);
    if (d.instr !== undefined) return sendInstruction();
    if (d.confirm) { const ins = att.instructions[+d.confirm]; ins.confirmed = true; att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), kind: 'confirm', to: ins.to, text: `Thanks ${PEOPLE[ins.to].name} — confirmed, ${ins.action.toLowerCase()} on ${ins.equipment} is complete.`, channel: 'radio' }); tl('message', `Confirmed completion with ${PEOPLE[ins.to].name}.`); save(); draw(); return; }
    if (d.ff) { ctx.fastForward(+d.ff); tick(); draw(); return; }
    if (d.allchecks !== undefined) { const since = verifySince(); for (const id of sc.checks) { const r = CHECKS[id].run(sim(), { ...(sc.checkCtx ? sc.checkCtx(sim()) : {}), since, relatedKeys: sc.relatedAlarms }); att.checks[id] = { ...r, t: now(), clock: sim().clockStr() }; } tl('system', `Checks: ${sc.checks.filter((id) => att.checks[id].pass).length}/${sc.checks.length} pass.`); save(); draw(); return; }
    if (d.close !== undefined) { const cc = canClose(att, sc); if (!cc.ok) { toast(`Closure blocked — ${cc.reason}`, 'warn'); return; } if (!(await pause('close the incident'))) return; att.closed = { t: now(), how: 'closed' }; tl('system', `Incident closed at ${sim().clockStr()} with all checks passing.`); const inc = sim().s.incidents; inc.push({ id: att.id, reportedAt: att.reportedAt, ackAt: att.messages.find((m) => !m.from && ['ack', 'ops', 'ops3'].includes(m.kind))?.t ?? null, recoveredAt: now() }); save(); go(CSTAGES.indexOf('Document')); return; }
    if (d.tohandoff !== undefined) return go(CSTAGES.indexOf('Handoff'));
    if (d.dsel) { docSel = d.dsel; draw(); return; }
    if (d.dsave) { const fields = Object.fromEntries([...root.querySelectorAll('[data-df]')].map((x) => [x.dataset.df, x.value])); const v = validateDoc(d.dsave, fields, docCtx(att, sc, sim())); const note = root.querySelector('#dNote').value.trim(); const docx = (att.docs[d.dsave] ||= { versions: [] }); if (docx.versions.length && !note) { toast('Add a revision note — earlier versions are kept, so say what changed and why.', 'warn'); return; } docx.versions.push({ t: now(), clock: sim().clockStr(), fields, note: note || 'first save', phase: att.submitted ? 'revision' : 'first' }); tl('doc', `${TEMPLATES[d.dsave].label} saved (v${docx.versions.length})${note ? ': ' + note : ''}`); if (v.critical.length && !assess) toast(v.critical[0].msg, 'warn'); save(); draw(); return; }
    if (d.dexp) { const docx = att.docs[d.dexp]; const f = docx?.versions?.slice(-1)[0]?.fields; if (!f) { toast('Save first.', 'warn'); return; } downloadText(`${att.incidentId}-${d.dexp}-simulated.md`, `# ${TEMPLATES[d.dexp].label} — ${att.incidentId}\n\n> SIMULATION-BASED TRAINING ARTIFACT (Robotics Fleet Response Lab). Fictional facility, staff and data. Not professional experience.\n\n${Object.entries(f).map(([k, v]) => `## ${FIELDS[k]?.label || k}\n${v}\n`).join('\n')}\n## Revision history\n${docx.versions.map((x, i) => `- v${i + 1} ${x.clock} — ${x.note}`).join('\n')}\n`); return; }
    if (d.rbsave !== undefined || d.rbtest !== undefined) {
      const fields = Object.fromEntries([...root.querySelectorAll('[data-rb]')].map((x) => [x.dataset.rb, x.value]));
      att.runbook ||= { versions: [], tests: [] };
      const last = att.runbook.versions[att.runbook.versions.length - 1];
      if (!last || JSON.stringify(last.fields) !== JSON.stringify(fields)) { att.runbook.versions.push({ t: now(), clock: sim().clockStr(), fields }); tl('doc', `Runbook saved (v${att.runbook.versions.length}).`); }
      if (d.rbtest !== undefined) {
        const other = sc.variants.find((v) => v !== att.variant) || att.variant;
        const occ2 = startComms(sc.id, att.seed + 7, other).sim;
        const r = technicianRun(fields, [{ sim: sim().clone(), label: 'this occurrence', robot: 'R-04' }, { sim: occ2, label: 'another occurrence', robot: 'R-04' }]);
        att.runbook.tests.push({ t: now(), clock: sim().clockStr(), version: att.runbook.versions.length, ...r });
        if (r.completed) { att.runbook.validated = true; att.runbook.validatedClock = sim().clockStr(); att.runbook.versions[att.runbook.versions.length - 1].fields.lastValidated = sim().clockStr(); }
        tl('doc', `Runbook technician test ${att.runbook.tests.length}: ${r.completed ? 'completed' : `${r.pauses.length} pause(s)`}.`);
      }
      save(); draw(); return;
    }
    if (d.handoff !== undefined) return submitHandoff();
    if (d.speak !== undefined) { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false; rec.onresult = (ev) => { const t = [...ev.results].map((x) => x[0].transcript).join(' '); const ta = root.querySelector('#refl'); ta.value = (ta.value + ' ' + t).trim(); att.reflection = { ...(att.reflection || {}), mode: 'spoken' }; }; rec.onerror = () => toast('Speech recognition unavailable — type instead.', 'warn'); rec.start(); toast('Listening… speak your explanation.'); return; }
    if (d.submit !== undefined) return submitAttempt();
    if (d.rvcheck !== undefined || d.rvdone !== undefined) {
      att.revision ||= { messages: {}, docs: {} };
      root.querySelectorAll('[data-rv]').forEach((x) => { att.revision.messages[x.dataset.rv] = x.value; });
      root.querySelectorAll('[data-rvd]').forEach((x) => { const [k, f] = x.dataset.rvd.split(':'); (att.revision.docs[k] ||= { ...(att.docs[k]?.versions?.slice(-1)[0]?.fields || {}) })[f] = x.value; });
      const rs = scoreAttempt(att, sc, sim(), { useRevision: true });
      const out = root.querySelector('#rvOut');
      const msgsHtml = Object.entries(att.revision.messages).map(([k, t]) => { const r = MESSAGE_KINDS[k].check(t, msgCtx(att, sc, sim(), { recovered: allChecksPass(), causeKnown: causeKnownNow() })); return `<p><b>${esc(MESSAGE_KINDS[k].label)}</b>: ${r.items.filter((i) => i.ok).length}/${r.items.length}${r.items.filter((i) => !i.ok).length ? ' — still missing: ' + esc(r.items.filter((i) => !i.ok).map((i) => i.label).join('; ')) : ''}${r.critical.length ? ` <span class="bad">✕ ${esc(r.critical.map((c) => c.msg).join(' '))}</span>` : ''}</p>`; }).join('');
      if (d.rvcheck !== undefined) { out.innerHTML = `<div class="docres small">${msgsHtml}<p>Revised total would be <b>${rs.total}/100</b>${rs.critical.length ? ` · <span class="bad">${rs.critical.length} critical issue(s) remain</span>` : ' · no critical issues'}.</p></div>`; save(); return; }
      if (rs.critical.length) { out.innerHTML = `<div class="critical small">${rs.critical.map((c) => `<p>✕ ${esc(c.msg)}</p>`).join('')}<p>Remediate these before finishing the revision.</p></div>`; return; }
      att.revised = rs; att.revisionDone = true; tl('system', `Revision finished: ${rs.total}/100 (first attempt ${att.first.total} preserved).`);
      for (const [k, t] of Object.entries(att.revision.messages)) if (t !== (att.messages.filter((m) => m.kind === k).pop()?.text || '')) tl('doc', `Revised ${MESSAGE_KINDS[k].label}.`);
      recordAttempt(); save(); draw(); return;
    }
    if (d.transfer) { const nextMode = att.mode === 'guided' ? 'assisted' : att.mode; const nx = newCommsAttempt(ctx, d.transfer, { mode: nextMode, transferOf: att.id }); void nx; location.hash = '#/comms-run'; render(root, ctx); return; }
    if (d.free !== undefined) { const to = root.querySelector('#qTo').value; const text = root.querySelector('#qText').value.trim(); if (!text) return; att.messages.push({ id: `M${att.messages.length + 1}`, t: now(), clock: sim().clockStr(), kind: 'free', to, text, channel: PEOPLE[to].channel }); tl('message', `You → ${PEOPLE[to].name}: ${text}`.slice(0, 200)); for (const c of att.commitments) if (!c.met && !c.missed && to === 'dana' && now() <= c.due + 60) c.met = true; att.queue.push({ at: now() + 6, type: 'msg', from: to, channel: PEOPLE[to].channel, text: to === 'dana' ? respondOps('free', text, msgCtx(att, sc, sim(), { recovered: allChecksPass(), causeKnown: causeKnownNow() })) : to === 'jordan' ? 'Thanks — send me the full handoff when you’re ready.' : 'Noted. If you need action from us, send a proper escalation with evidence.' }); save(); draw(); }
  };
  root.oninput = (e) => { if (e.target.id === 'refl' && e.inputType === 'insertFromPaste') { att.reflection = { ...(att.reflection || {}), pasted: true }; } };

  draw();
  caption(`${CSTAGES[Math.min(att.stage, CSTAGES.length - 1)]}: ${STAGE_HELP[CSTAGES[Math.min(att.stage, CSTAGES.length - 1)]]}`);
  return {
    refresh() { tick(); const c = root.querySelector('[data-live="clk"]'); if (c) c.textContent = sim().clockStr(); const s = root.querySelector('[data-live="shift"]'); if (s && att.shiftEnd) { const r = att.shiftEnd - now(); s.textContent = r > 0 ? `shift ends in ${fmtDur(r)}` : 'shift ended'; } const i = root.querySelector('[data-live="inc"]'); if (i) i.textContent = `incident ${fmtDur(now() - att.reportedAt)}`; const o = root.querySelector('[data-live="obs"]'); if (o) o.textContent = fmtDur(now() - verifySince()); },
    unmount() { ctx.addEvidence = null; save(); },
  };
}
void rich; void metricsFor;
