// Rubric scoring, metrics, guarded model answers and mode-specific coaching (pure).
import { CHECKS } from '../sim/catalog.js';
import { DIAGNOSTICS, SANDBOX_TESTS } from '../sim/catalog.js';
import { HYP_LABELS } from './scenarios.js';
import * as R from './rules.js';
import { TEMPLATES, validateDoc } from './docs.js';

export const MESSAGE_KINDS = {
  ack: { label: 'Initial acknowledgment', to: 'dana', check: (t, c) => R.checkAck(t, c) },
  ops3: { label: 'Three-sentence operations update', to: 'dana', check: (t, c) => R.checkOpsUpdate(t, { ...c, maxSentences: 3 }) },
  ops: { label: 'Operations update', to: 'dana', check: (t, c) => R.checkOpsUpdate(t, c) },
  mgmt: { label: 'Management summary', to: 'avery', check: (t, c) => R.checkMgmt(t, c) },
  eng: { label: 'Engineering version', to: 'priya', check: (t, c) => R.checkEngVersion(t, c) },
  uncertainty: { label: 'Status with facts / hypotheses / estimates / unknowns', to: 'dana', check: (t, c) => R.checkUncertainty(t, c) },
  correction: { label: 'Correction of earlier update', to: 'dana', check: (t, c) => R.checkCorrection(t, c) },
  disagreement: { label: 'Professional disagreement (to Dana and Priya)', to: 'group', check: (t, c) => R.checkDisagreement(t, c) },
  prioritization: { label: 'Prioritization of concurrent issues', to: 'dana', check: (t, c) => R.checkPrioritization(t, c.order || [], c) },
};
export const DOC_DELIVERABLES = { notes: 'notes', ticket: 'ticket', pir: 'pir', kb: 'kb' };

function lastMsg(att, kind) { const m = att.messages.filter((x) => x.kind === kind); return m[m.length - 1]; }
const firstOf = (att, kinds) => att.messages.filter((x) => kinds.includes(x.kind)).sort((a, b) => a.t - b.t)[0];
export function msgCtx(att, sc, sim, extra = {}) {
  const truth = sc.truth[att.variant];
  return { evidenceIds: att.evidence.map((e) => e.id), discriminatingIds: att.evidence.filter((e) => truth.discriminators.includes(e.source)).map((e) => e.id), truthTeam: truth.team, recovered: sc.checks.every((id) => att.checks[id]?.pass), causeKnown: false, audience: 'ops', hypIds: sc.hypotheses, wrongHyp: sc.priorUpdate?.hyp, discKw: sc.discKw || ['compare', 'other robots', 'fleet-wide', 'group', 'firmware', 'zone', 'healthy robot', 'same zone', 'all robots', 'access point', 'grouped'], firstPriority: sc.firstPriority?.[att.variant], firstWhy: sc.firstWhy?.[att.variant], labels: Object.fromEntries((att.issues || []).map((i) => [i.id, i.label])), order: att.prioritization?.order || [], reportKw: R.lc(sc.brief.text).split(/\W+/).filter((w) => w.length > 4).slice(0, 8), ...extra };
}
export function deliverableText(att, kind) { if (att.revision?.messages?.[kind]) return att.revision.messages[kind]; return lastMsg(att, kind)?.text || ''; }

/** Active (unresolved) items the receiving technician must hear about. */
export function activeItems(sim, sc, att) {
  const s = sim.s; const items = [];
  for (const r of s.robots) if (r.isolated) items.push({ label: `${r.id} isolated`, kw: [r.id] });
  for (const a of Object.keys(s.restricted)) items.push({ label: `Aisle ${a} restricted`, kw: [`aisle ${a}`, `${a} restrict`, 'restricted'] });
  for (const p of s.pendingOps) items.push({ label: `pending ${p.kind.replace(/_/g, ' ')}`, kw: [p.kind.split('_')[0], p.charger, p.aisle, p.ap, p.station, p.loc, 'pending', 'requested', 'waiting'].filter(Boolean) });
  for (const al of sim.activeAlarms().filter((x) => !x.key.startsWith('AP_CHANNEL_UTIL'))) items.push({ label: `alarm ${al.key}`, kw: [al.source, al.key.split(':')[1] || al.key, 'alarm'].filter(Boolean) });
  for (const [id, st] of Object.entries(s.stations)) if (!s.config.stationRotation[id]) items.push({ label: `${id} out of rotation`, kw: [id] });
  for (const e of att.escalations.filter((x) => x.useful && !x.closed)) items.push({ label: `open escalation to ${e.team}`, kw: [e.team.split(' ')[0], 'escalat', TEAM_SHORT[e.team] || ''].filter(Boolean) });
  const seen = new Set(); return items.filter((i) => (seen.has(i.label) ? false : seen.add(i.label)));
}
const TEAM_SHORT = { 'fleet software engineering': 'priya', 'network team': 'lee', 'inventory/WMS team': 'sam', 'robot maintenance': 'kai', 'station technician': 'technician', facilities: 'facilities' };

// ------------------------------------------------------------------ metrics
export function metricsFor(att, sc, sim) {
  const truth = sc.truth[att.variant];
  const ack = firstOf(att, ['ack', 'ops', 'ops3', 'correction']);
  const needsEsc = sc.deliverables.includes('escalation') || (truth.approve || []).some(([op]) => ['rollback_release', 'revert_config', 'restart_service', 'release_task_lease', 'repair'].includes(op));
  const useful = att.escalations.find((e) => e.useful);
  const counts = {}; let repeated = 0; let lastStateChange = -1;
  const stateTimes = att.actions.filter((a) => a.ok && a.op !== 'preserve_evidence').map((a) => a.t);
  for (const e of att.evidence.filter((x) => DIAGNOSTICS[x.source] || SANDBOX_TESTS[x.source])) { const prev = counts[e.source]; if (prev != null && e.t - prev < 180 && !stateTimes.some((t) => t > prev && t < e.t)) repeated++; counts[e.source] = e.t; void lastStateChange; }
  repeated += att.asked.filter((a) => a.repeated || a.onScreen).length;
  const unfocused = att.asked.filter((a) => a.unfocused).length;
  const since = Math.max(att.reportedAt, ...att.actions.filter((a) => a.ok && !['preserve_evidence', 'dispatch_test_task'].includes(a.op)).map((a) => a.t + (a.pendingFor || 0)));
  const verified = sc.checks.filter((id) => att.checks[id] && att.checks[id].t >= since && att.checks[id].pass).length;
  const unsupported = unsupportedClaims(att, sc);
  return {
    ackTime: ack ? ack.t - att.reportedAt : null,
    commitments: { made: att.commitments.length, met: att.commitments.filter((c) => c.met).length },
    usefulEscalation: !needsEsc ? 'not needed' : useful ? useful.t - att.reportedAt : null,
    repeatedTests: repeated, unfocusedQuestions: unfocused,
    verification: { passed: verified, required: sc.checks.length },
    handoffQuestions: att.handoff?.rounds?.reduce((a, r) => a + (r.accepted ? 0 : r.questions.length), 0) ?? null,
    runbookSuccess: att.runbook ? { validated: !!att.runbook.validated, tests: att.runbook.tests.length } : null,
    unsupportedClaims: unsupported.length, unsupportedList: unsupported,
    docCorrections: att.hyps.reduce((a, h) => a + h.history.filter((x) => x.status === 'rejected').length, 0) + (att.assessmentHistory?.length || 0) + Object.values(att.docs || {}).reduce((a, d) => a + Math.max(0, d.versions.length - 1), 0),
  };
}
export function unsupportedClaims(att, sc) {
  const truth = sc.truth[att.variant]; const out = [];
  for (const m of att.messages) {
    const discBefore = att.evidence.some((e) => truth.discriminators.includes(e.source) && e.t <= m.t);
    for (const c of R.claimsIn(m.text, sc.hypotheses)) if (c.assertive && (c.hyp !== truth.cause || !discBefore)) out.push({ where: `${m.clock} ${m.kind} message`, text: c.sentence, why: c.hyp !== truth.cause ? `Asserts “${HYP_LABELS[c.hyp] || c.hyp}” as fact; the evidence did not support it.` : 'Asserts the cause before collecting evidence that distinguishes it.' });
    if (R.ETA_RE.test(m.text) && !m.causeKnownAt) out.push({ where: `${m.clock} ${m.kind} message`, text: R.sentences(m.text).find((s) => R.ETA_RE.test(s)) || m.text.slice(0, 80), why: 'Gives a repair time while the cause was not known.' });
    if (R.claimsRestored(m.text) && !m.recoveredAt) out.push({ where: `${m.clock} ${m.kind} message`, text: R.sentences(m.text).find((s) => R.claimsRestored(s)) || '', why: 'Claims recovery before checks passed.' });
  }
  return out;
}

// ------------------------------------------------------------------ rubric
export function scoreAttempt(att, sc, sim, { useRevision = false } = {}) {
  const truth = sc.truth[att.variant]; const ctx = msgCtx(att, sc, sim);
  const cats = Object.fromEntries(R.RUBRIC.map((r) => [r.id, { ...r, got: r.max, notes: [] }]));
  const ded = (cat, pts, why, example) => { const c = cats[cat]; const d = Math.min(pts, c.got); if (d <= 0) return; c.got -= d; c.notes.push({ pts: -d, why, example }); };
  const ok = (cat, why) => cats[cat].notes.push({ pts: 0, why });
  const critical = []; const reviewKeys = new Set();
  const addCrit = (list, where) => { for (const c of list) if (!critical.some((x) => x.code === c.code && x.msg === c.msg)) critical.push({ ...c, where }); };
  const disc = att.evidence.filter((e) => truth.discriminators.includes(e.source));
  // ---- accuracy (25)
  const as = att.assessment;
  if (!as?.cause) { ded('accuracy', 8, 'No current assessment recorded (cause + confidence).'); reviewKeys.add('uncertainty'); }
  else if (as.cause !== truth.cause) { ded('accuracy', as.confidence === 'confirmed' ? 8 : 5, `Assessment “${HYP_LABELS[as.cause]}” (${as.confidence}) does not match what the evidence supports.`); reviewKeys.add('hypothesis'); }
  else if (as.confidence === 'confirmed' && (sc.unknownRootCause || !(as.evidence || []).some((id) => disc.some((e) => e.id === id)))) { ded('accuracy', 4, sc.unknownRootCause ? 'Marked the cause “confirmed” although the evidence cannot confirm it (logs lost / no mechanism shown).' : 'Marked “confirmed” without linking discriminating evidence.'); reviewKeys.add('uncertainty'); }
  else ok('accuracy', 'Assessment matches the evidence and its confidence is justified.');
  if (!disc.length) { ded('accuracy', 5, 'No evidence collected that separates the candidate causes.'); reviewKeys.add('hypothesis'); } else ok('accuracy', `Discriminating evidence collected (${disc.map((e) => e.id).join(', ')}).`);
  const uns = unsupportedClaims(att, sc);
  if (uns.length) { ded('accuracy', Math.min(12, uns.length * 3), `${uns.length} unsupported claim(s). A confident explanation of an unsupported diagnosis scores poorly here, however well written.`, `“${uns[0].text.slice(0, 140)}” — ${uns[0].why}`); reviewKeys.add('uncertainty'); }
  // ---- messages (communication) + criticals
  const kinds = sc.deliverables.filter((k) => MESSAGE_KINDS[k]);
  let commSum = 0, formatOk = 0, formatN = 0;
  for (const k of kinds) {
    const text = useRevision ? deliverableText(att, k) : lastMsg(att, k)?.text || '';
    if (!text) { cats.communication.notes.push({ pts: 0, why: `${MESSAGE_KINDS[k].label}: not sent.` }); reviewKeys.add(k); continue; }
    const m = lastMsg(att, k);
    const r = MESSAGE_KINDS[k].check(text, { ...ctx, recovered: m?.recoveredAt ? true : ctx.recovered && !!m?.recoveredAt, causeKnown: !!m?.causeKnownAt });
    const s = R.scoreOf(r); commSum += s.pct;
    const miss = r.items.filter((i) => !i.ok);
    cats.communication.notes.push({ pts: 0, why: `${MESSAGE_KINDS[k].label}: ${Math.round(s.pct * 100)}%${miss.length ? ` — missing: ${miss.slice(0, 3).map((i) => i.label).join('; ')}` : ''}`, example: miss.length ? `Your text: “${text.slice(0, 160)}${text.length > 160 ? '…' : ''}”` : undefined });
    if (miss.length) reviewKeys.add(k);
    addCrit(r.critical, MESSAGE_KINDS[k].label);
    const fmt = r.items.find((i) => /^Format|Brief|Concise/.test(i.label)); if (fmt) { formatN++; if (fmt.ok) formatOk++; }
  }
  const instr = att.instructions || [];
  if (sc.deliverables.includes('instruction')) { const best = instr.map((x) => R.scoreOf(R.checkInstruction(x, ctx)).pct).sort((a, b) => b - a)[0] ?? 0; commSum += best; if (!instr.length) cats.communication.notes.push({ pts: 0, why: 'Closed-loop instruction: not given.' }); else cats.communication.notes.push({ pts: 0, why: `Closed-loop instruction: ${Math.round(best * 100)}%` }); if (best < 0.8) reviewKeys.add('instruction'); }
  const nComm = kinds.length + (sc.deliverables.includes('instruction') ? 1 : 0);
  const commPts = nComm ? Math.round((commSum / nComm) * 15) : 15;
  cats.communication.got = commPts; if (commPts < 15) cats.communication.notes.unshift({ pts: -(15 - commPts), why: `Average checklist score across ${nComm} communication deliverable(s).` });
  // ---- reasoning (20)
  const evald = att.hyps.filter((h) => h.status !== 'open');
  if (att.hyps.length < 2) { ded('reasoning', 3, 'Fewer than two hypotheses considered.'); reviewKeys.add('hypothesis'); }
  if (!att.hyps.some((h) => h.status === 'rejected' && h.history.some((x) => x.reason))) ded('reasoning', 2, 'No hypothesis explicitly rejected with a reason (keep rejected ones visible with why).');
  if (evald.length >= 2 && att.hyps.some((h) => h.status === 'rejected')) ok('reasoning', 'Hypotheses evaluated; rejections recorded with reasons.');
  const firstAct = att.actions.filter((a) => a.ok && !['preserve_evidence', 'dispatch_test_task'].includes(a.op)).sort((a, b) => a.t - b.t)[0];
  if (firstAct && !disc.some((e) => e.t <= firstAct.t)) { ded('reasoning', 5, `First state-changing action (“${firstAct.label}”) taken before any discriminating evidence.`); }
  const met = metricsFor(att, sc, sim);
  const ver = met.verification; const closing = att.closed?.how === 'closed';
  const verFrac = ver.required ? ver.passed / ver.required : 1;
  const runFrac = sc.checks.filter((id) => att.checks[id]).length / Math.max(1, sc.checks.length);
  const verPts = Math.round(6 * (closing ? verFrac : runFrac));
  if (verPts < 6) { ded('reasoning', 6 - verPts, closing ? `Closure verification: ${ver.passed}/${ver.required} checks passed after the last mitigation.` : `Ran ${Math.round(runFrac * 100)}% of the recovery checks before handing off (needed to report status honestly).`); reviewKeys.add('verification'); }
  if (met.repeatedTests + met.unfocusedQuestions > 1) ded('reasoning', Math.min(2, Math.floor((met.repeatedTests + met.unfocusedQuestions) / 2)), `${met.repeatedTests} repeated/on-screen check(s) or question(s) and ${met.unfocusedQuestions} unfocused question(s).`);
  for (const a of att.actions.filter((x) => x.ok && ['restart_robot', 'restart_service', 'rollback_release'].includes(x.op) && !x.preserved)) ded('reasoning', 2, `“${a.label}” without preserving evidence first.`);
  // ---- documentation (15)
  const docKinds = sc.deliverables.filter((k) => TEMPLATES[k] || k === 'ticket' || k === 'notes' || k === 'pir' || k === 'kb');
  let docSum = 0;
  for (const k of docKinds) {
    const d = att.docs?.[k]; const fields = useRevision && att.revision?.docs?.[k] ? att.revision.docs[k] : d?.versions?.[d.versions.length - 1]?.fields;
    if (!fields) { cats.documentation.notes.push({ pts: 0, why: `${TEMPLATES[k].label}: not saved.` }); reviewKeys.add('documentation'); continue; }
    const v = validateDoc(k, fields, docCtx(att, sc, sim)); docSum += v.pct;
    const miss = v.items.filter((i) => !i.ok);
    cats.documentation.notes.push({ pts: 0, why: `${TEMPLATES[k].label}: ${Math.round(v.pct * 100)}% of required fields substantive${miss.length ? ` — weak/missing: ${miss.slice(0, 4).map((i) => i.label).join('; ')}` : ''}${v.notes.length ? ` · ${v.notes.map((n) => n.msg).join(' · ')}` : ''}` });
    if (miss.length) reviewKeys.add('documentation');
    addCrit(v.critical, TEMPLATES[k].label);
    if (v.notes.some((n) => n.unsupported)) ded('accuracy', 2, `${TEMPLATES[k].label}: ${v.notes.filter((n) => n.unsupported).map((n) => n.msg).join(' ')}`);
  }
  const runbookReq = sc.deliverables.includes('runbook');
  const docMax = runbookReq ? 7 : 15;
  const docPts = docKinds.length ? Math.round((docSum / docKinds.length) * (docMax - 2)) + (att.hyps.some((h) => h.status === 'rejected') ? 2 : 0) : docMax;
  cats.documentation.got = docPts;
  if (runbookReq) { const rb = att.runbook; if (rb?.validated) { cats.documentation.got += 8; cats.documentation.notes.push({ pts: 0, why: `Runbook validated by the simulated technician after ${rb.tests.length} test(s).` }); } else { cats.documentation.notes.push({ pts: -8, why: rb?.tests?.length ? `Runbook not validated: last test paused ${rb.tests[rb.tests.length - 1].pauses.length} time(s). Field text alone earns no credit.` : 'Runbook not tested with the simulated technician.' }); reviewKeys.add('runbook'); } }
  cats.documentation.got = Math.min(15, cats.documentation.got);
  // ---- ownership (15)
  const needsEsc = met.usefulEscalation !== 'not needed';
  const useful = att.escalations.find((e) => e.useful);
  if (needsEsc) { if (useful) ok('ownership', `Useful escalation to ${useful.team} at ${useful.clock}.`); else if (att.escalations.length) { ded('ownership', 3, `Escalation(s) sent but not actionable — ${att.escalations[att.escalations.length - 1].reply.slice(0, 120)}`); reviewKeys.add('escalation'); } else { ded('ownership', 6, 'An escalation was needed (the fix is outside your authority) but none was sent.'); reviewKeys.add('escalation'); } }
  const ho = att.handoff;
  if (sc.endState === 'handoff' || att.closed?.how === 'handoff') {
    if (!ho?.accepted) { ded('ownership', 6, 'Handoff not accepted by the receiving technician.'); reviewKeys.add('handoff'); }
    else { const q = met.handoffQuestions || 0; if (q > 1) ded('ownership', Math.min(2, q - 1), `Receiver needed ${q} follow-up question(s) before accepting.`); else ok('ownership', 'Handoff accepted with little or no follow-up.'); }
    for (const r of (useRevision ? (ho?.rounds || []).slice(-1) : ho?.rounds || [])) addCrit(r.critical || [], 'Shift handoff');
  } else if (!att.closed) ded('ownership', 6, 'Incident neither closed with verification nor handed off.');
  if (sc.deliverables.includes('instruction')) { const loop = instr.find((x) => x.readBack && x.willConfirm && x.confirmed); if (!loop) { ded('ownership', 3, instr.length ? 'Instruction loop not closed (read-back, completion report and your confirmation).' : 'No closed-loop instruction given.'); reviewKeys.add('instruction'); } }
  if (att.authRefusals) ded('ownership', Math.min(3, att.authRefusals), `${att.authRefusals} attempt(s) to perform actions outside your authority instead of escalating.`);
  // ---- timeliness (10)
  if (sc.deliverables.some((k) => ['ack', 'ops', 'ops3', 'correction', 'prioritization'].includes(k))) {
    if (met.ackTime == null) ded('timeliness', 4, 'The reporter never received an acknowledgment/update.'); else if (met.ackTime > 360) ded('timeliness', 4, `First acknowledgment after ${Math.round(met.ackTime / 60)} min (facility time).`); else if (met.ackTime > 180) ded('timeliness', 2, `First acknowledgment after ${Math.round(met.ackTime / 60)} min; aim for ~3 min. (No bonus for being faster than that.)`);
    if (!met.commitments.made) ded('timeliness', 3, 'No next-update commitment made.'); else if (met.commitments.met < met.commitments.made) ded('timeliness', Math.round(3 * (1 - met.commitments.met / met.commitments.made)), `${met.commitments.met}/${met.commitments.made} update commitments met.`);
  }
  if (formatN && formatOk < formatN) ded('timeliness', Math.round(3 * (1 - formatOk / formatN)), `${formatN - formatOk} message(s) exceeded the requested format.`);
  if (att.reflection?.text) { const rr = R.checkReflection(att.reflection.text); if (R.scoreOf(rr).pct < 0.6) cats.communication.notes.push({ pts: 0, why: `Reasoning explanation covered ${rr.items.filter((i) => i.ok).length}/5 elements (feedback only).` }); }
  const total = Object.values(cats).reduce((a, c) => a + Math.max(0, c.got), 0);
  return { total, cats: Object.values(cats), critical, metrics: met, reviewKeys: [...reviewKeys], notScored: R.NOT_SCORED };
}
export function docCtx(att, sc, sim) {
  const truth = sc.truth[att.variant];
  const known = [...sim.s.robots.map((r) => r.id), ...Object.keys(sim.s.stations), ...Object.keys(sim.s.chargers), ...Object.keys(sim.s.aps), ...Object.keys(sim.s.inventory), ...sim.s.taskIds, ...sim.s.orderIds];
  return { evidenceIds: att.evidence.map((e) => e.id), knownIds: known, recovered: sc.checks.every((id) => att.checks[id]?.pass), rootCauseSupported: !sc.unknownRootCause && att.assessment?.cause === truth.cause && att.evidence.some((e) => truth.discriminators.includes(e.source)), failingChecks: sc.checks.filter((id) => att.checks[id] && !att.checks[id].pass).map((id) => CHECKS[id].label) };
}
export function verifySinceOf(att) { return Math.max(att.reportedAt, ...att.actions.filter((a) => a.ok && !['preserve_evidence', 'dispatch_test_task'].includes(a.op)).map((a) => a.t + (a.pendingFor || 0))); }
/** Closure requires every relevant recovery check to have been run after the last mitigation, and to pass. */
export function canClose(att, sc) {
  if (sc.endState === 'handoff') return { ok: false, reason: 'This incident ends with a shift handoff, not a closure.' };
  const since = verifySinceOf(att);
  const missing = sc.checks.filter((id) => !att.checks[id] || att.checks[id].t < since);
  const failing = sc.checks.filter((id) => att.checks[id] && att.checks[id].t >= since && !att.checks[id].pass);
  if (missing.length) return { ok: false, reason: `Run after your last mitigation: ${missing.map((id) => CHECKS[id].label).join('; ')}` };
  if (failing.length) return { ok: false, reason: `Failing: ${failing.map((id) => CHECKS[id].label).join('; ')}` };
  return { ok: true };
}
/** Submission requires an ending: verified closure or a handoff ACCEPTED by the receiving technician. */
export function canSubmit(att, sc) {
  if (sc.endState === 'handoff' && !att.handoff?.accepted) return { ok: false, reason: 'The receiving technician has not accepted your handoff yet.' };
  if (sc.endState !== 'handoff' && !(att.closed?.how === 'closed' || att.handoff?.accepted)) return { ok: false, reason: 'Close the incident with passing checks, or get a handoff accepted.' };
  return { ok: true };
}
export const passes = (score, threshold) => score.total >= threshold && !score.critical.length;

// ------------------------------------------------------------------ benchmark & unlocks
export function benchmarkStatus(commsAttempts, threshold = 85, n = 3) {
  const indep = commsAttempts.filter((a) => a.mode === 'assessment' && a.first && !a.worked);
  const qualifying = []; const seen = new Set();
  for (const a of indep.slice().sort((x, y) => y.first.total - x.first.total)) if (a.first.total >= threshold && !a.first.critical.length && !seen.has(a.scenarioId)) { seen.add(a.scenarioId); qualifying.push(a); }
  return { met: qualifying.length >= n, qualifying, needed: n, threshold, label: 'Internal practice benchmark — not an employer certification or a statement of job readiness.' };
}
export function unlocks(comms) {
  const A = comms.attempts.filter((a) => a.first);
  const indep = A.filter((a) => a.mode === 'assessment');
  const best = (list) => list.reduce((m, a) => Math.max(m, (a.revised || a.first).total), 0);
  const stage2 = !!comms.worked?.done;
  const s2Done = A.some((a) => a.mode !== 'assessment' && a.revisionDone && !(a.revised || a.first).critical.length && (a.revised || a.first).total >= 60);
  const stage3 = stage2 && s2Done;
  const tier2 = indep.some((a) => a.first.total >= 70 && !a.first.critical.length);
  const tier3 = new Set(indep.filter((a) => a.first.total >= 75 && !a.first.critical.length).map((a) => a.scenarioId)).size >= 2;
  const stage4 = indep.length >= 1;
  return { stage1: true, stage2, stage3, stage4, tier1: stage3, tier2: stage3 && tier2, tier3: stage3 && tier3, reasons: { stage2: stage2 ? '' : 'Complete the worked example and its comprehension check (≥ 3/4).', stage3: stage3 ? '' : 'Finish a partially guided incident, revise it, reach ≥ 60 with no unresolved critical failure.', tier2: tier2 ? '' : 'Score ≥ 70 with no critical failure on one independent incident.', tier3: tier3 ? '' : 'Score ≥ 75 with no critical failure on two different independent incidents.', stage4: stage4 ? '' : 'Submit at least one independent incident.' }, bestIndependent: best(indep) };
}

// ------------------------------------------------------------------ model answers (guarded)
export function modelAnswers(att, sc, sim) {
  if (!att.submitted) throw new Error('Model answers are withheld until you submit.');
  const truth = sc.truth[att.variant]; const disc = att.evidence.filter((e) => truth.discriminators.includes(e.source)).map((e) => `[${e.id}]`).join(' ') || '(the discriminating check you did not run)';
  const q = sim.queueDepth(), age = Math.round(sim.oldestOpenAge() / 60); const next = sim.clockStr(sim.s.t + 900).slice(0, 5);
  return {
    ops3: `About ${q} tasks are waiting and the oldest order is ${age} min late; the problem is ${HYP_LABELS[truth.cause].toLowerCase()} (confirmed by ${disc}), not the robots operations reported. Meanwhile: ${truth.mitigation} Next update at ${next} facility time.`,
    ack: `Copy, Dana — looking at the failing robots and the delayed order now. Can you confirm which robot IDs you're seeing? Next update by ${sim.clockStr(att.reportedAt + 600).slice(0, 5)}.`,
    escalation: `To ${truth.team}: Impact — ${q} tasks waiting, oldest ${age} min. Evidence ${disc}. Reproduction: ${truth.explanation.split('. ')[0]}. Ruled out: the other candidates, using the same evidence. Request: ${truth.mitigation}`,
    handoff: 'Status: open/mitigated (say which). Owner: Jordan from 07:00. Done so far: … (timeline). Pending: … with whom and when. Open items: every isolated robot, restriction, alarm and pending request. Next: first action + time. Verify: which checks remain. Evidence: INC record [E#].',
    explanation: truth.explanation, mitigation: truth.mitigation, permanent: truth.permanent,
  };
}

// ------------------------------------------------------------------ coaching (never uses the hidden cause)
export const STRUCTURE_EXAMPLES = {
  ack: [['Summary', 'Copy, Dana — robots piling up at P-3.'], ['Impact check', 'I see ~9 tasks waiting; is P-3 the only station affected?'], ['Next step + update time', 'Checking station status now; update by 05:50.']],
  ops3: [['Impact (numbers)', 'About 9 tasks are waiting at P-3 and the oldest is 7 minutes late.'], ['Status + workaround', 'P-3 is reporting a fault, so I have moved new P-3 work to the other three stations while a technician checks it.'], ['Next update (not an ETA)', 'Next update at 05:55 facility time.']],
  ops: [['Impact', '9 tasks waiting, oldest 7 min.'], ['What we know / don’t know', 'Known: P-3 reports unavailable. Not yet known: why.'], ['Workaround', 'P-3 work rerouted.'], ['Next update', 'Next update 05:55.']],
  escalation: [['Owning team', 'To: station technician.'], ['Impact', '9 tasks waiting; P-3 = 25% of station capacity.'], ['Evidence', 'station-service shows P-3 UNAVAILABLE [E2]; HMI shows SCANNER FAULT [E3].'], ['Reproduction', 'Since ~05:31; every robot sent to P-3 waits.'], ['Ruled out', 'Robots healthy (status WAITING, no faults) [E1].'], ['Specific request', 'Please inspect/reseat the P-3 scanner and confirm when it reads a test barcode.']],
  handoff: [['Status', 'OPEN — mitigated (P-3 out of rotation).'], ['Ownership', 'Jordan owns INC-xxxx from 06:00.'], ['Open items', 'P-3 out of rotation; technician request pending (Marco, ETA unknown).'], ['Next actions', 'At 06:10 check with Marco; when scanner fixed, restore P-3 and run checks.'], ['Verify', 'A full task through P-3; queue age < 4 min for 5 min.']],
  mgmt: [['Scope', 'One of four stations down; ~9 orders delayed.'], ['Status', 'Mitigated by rerouting; repair in progress.'], ['Risk', 'If another station fails before 06:00, the wave may slip.'], ['Decision', 'No decision needed now; I’ll flag by 05:55 if we need overtime.']],
  uncertainty: [['Facts', 'P-3 reports UNAVAILABLE [E2]; HMI shows SCANNER FAULT [E3].'], ['Hypothesis', 'Scanner hardware fault.'], ['Estimate', '~9 tasks delayed (from queue at 05:47).'], ['Unknown', 'Why the scanner stopped; repair time.']],
  correction: [['Correction', 'Correction to my 05:40 update: I said the robots were at fault.'], ['What changed', 'New evidence: the P-3 HMI shows a scanner fault [E3]; robots are healthy [E1].'], ['Current assessment', 'Now: station hardware problem; robots are waiting, not broken.'], ['Plan + next update', 'P-3 work rerouted; next update 05:55. Earlier time estimate withdrawn.']],
  disagreement: [['Ops view', 'Dana sees robots stuck at P-3 and thinks they are faulty.'], ['Eng view', 'Software says P-3 itself is unavailable.'], ['Discriminating test', 'Read the P-3 HMI and compare with a robot at another station.'], ['Decision rule', 'If the HMI shows a fault, it is the station; if robots fail elsewhere too, it is the robots.']],
  instruction: [['Recipient', 'Marco,'], ['Action + equipment', 'please read the HMI and scanner light at P-3'], ['Timing', 'now, from the operator side'], ['Read-back', 'read that back to me,'], ['Completion', 'and radio me when you have the result.']],
  prioritization: [['Ranking', '1) P-3 down, 2) R-04 charging.'], ['Impact', 'P-3 is 25% of station capacity; R-04 is one robot.'], ['Urgency/safety', 'No safety issue in either; cutoff in 20 min.'], ['Dependencies', 'Rerouting P-3 frees robots now.'], ['Support', 'Marco checks P-3 first; R-04 waits for maintenance at 11:30.']],
  statement: [['Scope', 'Robots waiting at P-3 (R-03, R-08, R-11).'], ['Onset', 'Since ~05:31 facility time.'], ['Impact', '9 tasks delayed.'], ['Expected vs observed', 'Expected: robots deliver and leave in ~10 s. Observed: robots wait > 2 min.']],
};
export const HINTS = {
  ack: ['Three parts: what you heard, how big it is (or ask), what you are doing next — plus when you’ll update.', 'Keep it to two or three sentences. Do not guess the cause yet.', 'Starter: “Copy — [problem] at [where]. I see [number] … / Can you confirm …? Checking [first check] now; update by [time].”'],
  ops3: ['Sentence 1 impact, sentence 2 status + workaround, sentence 3 next update time.', 'Numbers beat adjectives. If the cause is not confirmed, say what is known and what is not.', 'Starter: “About [N] tasks are waiting and the oldest is [M] min late. [What we know] — meanwhile [workaround]. Next update at [time].”'],
  escalation: ['Route to the team that owns the part of the system your evidence points at.', 'Attach the result that separates your candidate causes, plus what you ruled out.', 'Starter: “Impact … Evidence [E#][E#] … Reproduction: since … only when … Ruled out … Request: please …”'],
  handoff: ['Status, owner, open items, pending requests, next actions with times, what to verify.', 'Mention every isolated robot, restriction, alarm and pending request on the board.', 'Starter: “Status: … Owner: Jordan from 07:00. Open: … Pending: … Next: at [time] … Verify: …”'],
  mgmt: ['Managers need scope, status, risk and the decision they must make.', 'Offer options with consequences instead of a repair time.', 'Starter: “Scope … Status … Risk to cutoff … Decision needed: …”'],
  eng: ['Evidence with citations, how to reproduce it, which dependencies are involved, what you need.', 'Engineers will check your claims — cite them.', 'Starter: “[E#] shows … Reproduces when … Involves … Can you …”'],
  uncertainty: ['Label each statement: Fact / Hypothesis / Estimate / Unknown.', 'An estimate needs a basis; an unknown is fine to admit.', 'Starter: “Facts: … Hypothesis: … Estimate: … Unknown: …”'],
  correction: ['Say clearly which earlier statement you are withdrawing.', 'Explain the new evidence and the current assessment; withdraw any time estimate built on the old explanation.', 'Starter: “Correction to my [time] update: … New evidence [E#] … Current assessment … Next update …”'],
  disagreement: ['Describe each side’s observation fairly.', 'Propose one test whose result would favor one side, and agree the decision rule.', 'Starter: “Dana sees … Priya sees … Test: … If …, then …”'],
  instruction: ['Recipient, action, equipment, timing.', 'Ask for a read-back and a completion report.', 'Starter: “Marco, please [action] [equipment] [when]. Read that back, and radio me when done.”'],
  prioritization: ['Rank by impact, urgency/safety, dependencies, available support.', 'Safety first; then the biggest impact; delegate in parallel when someone is available.', 'Starter: “1) … because … 2) … Marco takes … while I …”'],
  statement: ['Turn the report into scope, onset, impact, expected vs observed.', 'Use real IDs you saw or were told.', 'Starter: “Scope: … Onset: … Impact: … Expected: … Observed: …”'],
  reflection: ['Observation → hypotheses → the test that separated them → what you did → what is uncertain → next.', 'Explain why the key test discriminates.', 'Starter: “I saw … I considered … I chose … because … I still don’t know …”'],
};
export function coachFor(mode, kind, level = 0) {
  if (mode === 'assessment') return { text: 'Assessment mode: no examples or hints until you submit.', examples: null, hints: [] };
  if (mode === 'guided') return { text: 'Guided: here is the structure, shown on the worked example (a different incident).', examples: STRUCTURE_EXAMPLES[kind] || null, hints: (HINTS[kind] || []).slice(0, Math.max(1, level)) };
  return { text: 'Assisted: progressive hints — they never write the full answer.', examples: null, hints: (HINTS[kind] || []).slice(0, level) };
}
export const COMM_REVIEW = {
  ack: { q: 'Which acknowledgment has all three parts (summary, impact, next step + update time)?', options: ['On it.', 'Copy — three robots failing tasks; I see ~12 tasks waiting. Checking their logs now; update by 06:55.', 'It is probably the network, I will fix it.', 'Please send me everything you have.'], answer: 1, why: 'Summary + impact + next step + update time.' },
  ops3: { q: 'Which three-sentence update is best when the cause is unknown?', options: ['It will be fixed by 07:00. Robots are fine. Thanks.', 'About 12 tasks are waiting and the oldest order is 9 min late. Three robots are failing intermittently and we have not confirmed why; meanwhile keep the aisle clear and I am testing robot vs area. Next update at 06:55.', 'The AP-3 access point is definitely broken and will be back in 10 minutes. Next update later.', 'Lots of orders are late.'], answer: 1, why: 'Impact numbers, honest status + workaround, next update time — no invented ETA or unsupported cause.' },
  escalation: { q: 'What makes an escalation actionable?', options: ['Urgent wording.', 'The owning team, impact, cited evidence that separates causes, reproduction conditions, what you ruled out, and a specific request.', 'A long description of the robot.', 'Copying the whole log.'], answer: 1, why: 'Engineers need to reproduce and act without redoing your work.' },
  handoff: { q: 'A handoff should NOT…', options: ['Name the new owner.', 'List pending requests.', 'Say “resolved” while checks still fail.', 'Give the next action with a time.'], answer: 2, why: 'Concealing an unresolved issue is a critical failure.' },
  uncertainty: { q: 'Which statement correctly labels uncertainty?', options: ['The cause is the network.', 'Fact: disconnects concentrate in zone C [E5]. Hypothesis: AP-3 degraded. Unknown: why.', 'It might be anything.', 'Everything is fine.'], answer: 1, why: 'Separates fact (with source), hypothesis and unknown.' },
  correction: { q: 'Your 06:20 update blamed an obstruction; the aisle is clear. Best correction?', options: ['Say nothing; it will sort itself out.', 'Edit the old message so it never said that.', 'Correction to my 06:20 update: no obstruction — the floor team found the aisle clear [E4]. Current assessment: still investigating localization vs task state. The 06:30 estimate is withdrawn; next update 06:45.', 'Blame the floor team.'], answer: 2, why: 'Prompt, explicit, preserves history, explains new evidence, withdraws the ETA.' },
  instruction: { q: 'Which radio instruction is closed-loop?', options: ['Check the charger.', 'Marco, please read the display on charger C-1 now and read that back; radio me when you have the reading.', 'Someone look at R-04.', 'Fix C-1 ASAP.'], answer: 1, why: 'Recipient, action, equipment, timing, read-back and completion report.' },
  disagreement: { q: 'Ops says robot fault; engineering says service issue. Best move?', options: ['Pick the more senior person’s view.', 'State both observations and propose a test that separates them (e.g. compare ack timeouts across the fleet vs only R-08).', 'Restart the service and the robot.', 'Ignore both.'], answer: 1, why: 'A discriminating test settles disagreements.' },
  prioritization: { q: 'A possible person in an aisle vs a fleet-wide slowdown — first priority?', options: ['The slowdown — more orders.', 'The possible person — safety first; keep robots out and confirm the area.', 'Whichever was reported first.', 'Neither.'], answer: 1, why: 'Safety outranks throughput.' },
  verification: { q: 'Robot status is healthy but the queue keeps growing. Close?', options: ['Yes — the robot is fixed.', 'No — the workflow is not recovered; queue age and throughput checks must pass for a meaningful period.', 'Yes, if ops asks.', 'Restart everything first.'], answer: 1, why: 'Partial recovery is not recovery.' },
  documentation: { q: 'Which field content earns credit?', options: ['Timestamp: morning', 'Timestamp: 06:47 facility time (simulated); Affected: R-02, R-06, R-09; Evidence: [E3][E7]', 'Affected: some robots', 'Evidence: see logs'], answer: 1, why: 'Specific, time-zoned, real IDs, cited evidence.' },
  hypothesis: { q: 'How should a rejected hypothesis appear in the record?', options: ['Deleted.', 'Kept, marked REJECTED with the reason and the evidence that ruled it out.', 'Left as “supported”.', 'Renamed.'], answer: 1, why: 'Never silently overwrite earlier findings.' },
  runbook: { q: 'Why did the simulated technician pause on “Check the charger”?', options: ['It was too long.', 'No expected result and no tool named — they cannot tell good from bad or what to do next.', 'Because of jargon.', 'It was correct.'], answer: 1, why: 'Reproducible steps state the tool and expected result.' },
  mgmt: { q: 'A manager asks “when will it be back?” and you do not know. Best reply?', options: ['In 10 minutes.', 'Scope: 1 of 4 stations; status: rerouted; risk: wave may slip if a second station fails; decision: hold overtime decision until my 07:20 update.', 'No idea.', 'Ask engineering.'], answer: 1, why: 'Scope, status, risk, decision — no invented ETA.' },
  statement: { q: 'Turn “robots are not working” into an actionable statement:', options: ['Robots broken.', 'Scope: R-03/R-08/R-11 waiting at P-1; onset ~07:02; impact 9 tasks late; expected deliver+leave in 10 s, observed waits > 2 min.', 'Everything is down.', 'Call engineering.'], answer: 1, why: 'Scope, onset, impact, expected vs observed.' },
};
export { DIAGNOSTICS as _D, R as rules };
