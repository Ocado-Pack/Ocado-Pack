// Documentation templates, validation, revisions and runbook testing (pure, SIMULATED).
import { DIAGNOSTICS, SANDBOX_TESTS, CHECKS } from '../sim/catalog.js';
import { SUPPORTS } from '../review-templates.js';
import { lc, citations, hasTime, hasTz, hasNumber, idsIn, claimsRestored, unsafeIn, TIME_RE } from './rules.js';

const nonTrivial = (v, n = 12) => String(v || '').replace(/\s+/g, ' ').trim().length >= n;
export const FIELDS = {
  incidentId: { label: 'Incident ID', test: (v) => /\b(INC|TKT)-[A-Z0-9]{3,}/i.test(v), why: 'A searchable ID links notes, tickets and messages.' },
  title: { label: 'Title', test: (v) => nonTrivial(v, 15) && idsIn(v).length + (/(aisle|zone|station|robot|order|charger)/i.test(v) ? 1 : 0) > 0, why: 'A title names what and where (not just “robot issue”).' },
  timestamp: { label: 'Timestamp and time zone', test: (v) => hasTime(v) && hasTz(v), why: 'Times without a zone get misread across sites and shifts.' },
  affected: { label: 'Affected robot / task / order / station / service', test: (v, ctx) => idsIn(v).length > 0 || /(service|inventory-service|fleet-manager|station-service)/i.test(v), why: 'Use real identifiers.' },
  expected: { label: 'Expected behavior', test: (v) => nonTrivial(v), why: 'Defines “normal”.' },
  observed: { label: 'Observed behavior', test: (v) => nonTrivial(v), why: 'Defines the deviation.' },
  impact: { label: 'Operational impact', test: (v) => hasNumber(v) && /(order|task|robot|minute|min|%|station|capacity)/i.test(v), why: 'Quantify (orders, robots, minutes).' },
  evidence: { label: 'Evidence and source links', test: (v) => citations(v).length >= 2, why: 'Cite collected evidence as [E#].' },
  hypotheses: { label: 'Hypotheses (with status)', test: (v) => /(supported|rejected|open|untested|hypothes)/i.test(v) && nonTrivial(v, 20), why: 'Label unverified explanations; keep rejected ones with the reason.' },
  tests: { label: 'Tests performed and results', test: (v) => nonTrivial(v, 25), why: 'What you checked and what it showed.' },
  actions: { label: 'Actions and results', test: (v) => nonTrivial(v, 10), why: 'What was changed, when, with what result.' },
  mitigation: { label: 'Mitigation (temporary)', test: (v) => nonTrivial(v, 8), why: 'What reduced impact now.' },
  permanent: { label: 'Permanent correction (or “not yet identified”)', test: (v) => nonTrivial(v, 8), why: 'Separate from mitigation.' },
  recovery: { label: 'Recovery checks', test: (v) => /(pass|fail|not run|check|verified|observ)/i.test(v) && nonTrivial(v, 15), why: 'Which checks, with results.' },
  uncertainty: { label: 'Remaining uncertainty', test: (v) => nonTrivial(v, 12), why: 'What is still unknown.' },
  nextAction: { label: 'Next action', test: (v) => nonTrivial(v, 10), why: 'What happens next.' },
  owner: { label: 'Owner', test: (v) => nonTrivial(v, 3), why: 'A named person or team.' },
  followUp: { label: 'Follow-up time or escalation trigger', test: (v) => TIME_RE.test(v) || /(if|when|unless|after|>|\d+ ?min)/i.test(v), why: 'When to look again or escalate.' },
  // handoff
  status: { label: 'Status (open / mitigated / monitoring / resolved)', test: (v) => /(open|active|mitigated|monitoring|resolved|unresolved)/i.test(v), why: 'The receiver must know if it is live.' },
  summary: { label: 'Summary', test: (v) => nonTrivial(v, 20), why: 'Two or three lines of context.' },
  pending: { label: 'Pending requests (who, what, when)', test: (v) => nonTrivial(v, 4), why: 'So the receiver can chase them.' },
  risks: { label: 'Open items and risks', test: (v) => nonTrivial(v, 8), why: 'Everything unresolved.' },
  next: { label: 'Next actions with owner and time', test: (v) => nonTrivial(v, 15) && (TIME_RE.test(v) || /(at |by |within|after|every)/i.test(v)), why: 'What to do first and when.' },
  verify: { label: 'What remains to verify', test: (v) => /(verify|check|confirm|watch|observe)/i.test(v), why: 'Recovery is not proven until checked.' },
  // KB / PIR
  appliesTo: { label: 'Applies to (scope)', test: (v) => nonTrivial(v, 8), why: 'When this article is relevant.' },
  symptoms: { label: 'Symptoms', test: (v) => nonTrivial(v, 15), why: 'What the reader will see.' },
  diagnostics: { label: 'Diagnostic steps (with expected results)', test: (v) => /expected|should|if /i.test(v) && nonTrivial(v, 30), why: 'Reproducible steps.' },
  resolution: { label: 'Resolution / mitigation options', test: (v) => nonTrivial(v, 15), why: 'What fixed or reduced it.' },
  limits: { label: 'Known limits / when to escalate', test: (v) => /(escalat|if|unless|when)/i.test(v), why: 'Where the article stops.' },
  author: { label: 'Author', test: (v) => nonTrivial(v, 2), why: 'Who to ask.' },
  rootCause: { label: 'Root-cause status (confirmed / suspected / unknown) with basis', test: (v) => /(confirmed|suspected|unknown|not determined|under investigation)/i.test(v), why: 'Never imply a confirmed cause you have not shown.' },
  timeline: { label: 'Timeline (with time zone)', test: (v) => (String(v).match(TIME_RE) || []).length >= 1 && hasTz(v), why: 'Ordered, time-zoned events.' },
  whatWorked: { label: 'What went well', test: (v) => nonTrivial(v, 8), why: 'Keep doing it.' },
  whatDidnt: { label: 'What did not go well', test: (v) => nonTrivial(v, 8), why: 'Blameless learning.' },
  actionItems: { label: 'Action items with owners and dates', test: (v) => /(owner|team|by |due|\d{1,2}:\d{2}|nov|mon|tue|wed|thu|fri)/i.test(v) && nonTrivial(v, 15), why: 'Follow-ups that will happen.' },
};
export const TEMPLATES = {
  notes: { label: 'Troubleshooting notes', fields: ['incidentId', 'title', 'timestamp', 'affected', 'expected', 'observed', 'impact', 'evidence', 'hypotheses', 'tests', 'actions', 'uncertainty', 'nextAction', 'owner', 'followUp'] },
  ticket: { label: 'Incident ticket', fields: ['incidentId', 'title', 'timestamp', 'affected', 'expected', 'observed', 'impact', 'evidence', 'hypotheses', 'tests', 'actions', 'mitigation', 'permanent', 'recovery', 'uncertainty', 'nextAction', 'owner', 'followUp'] },
  escalationDoc: { label: 'Engineering escalation', fields: ['incidentId', 'title', 'timestamp', 'affected', 'expected', 'observed', 'impact', 'evidence', 'tests', 'uncertainty', 'nextAction', 'owner', 'followUp'] },
  handoffDoc: { label: 'Shift handoff', fields: ['incidentId', 'status', 'summary', 'actions', 'pending', 'risks', 'next', 'owner', 'verify', 'followUp', 'evidence'] },
  kb: { label: 'Knowledge-base article', fields: ['title', 'appliesTo', 'symptoms', 'diagnostics', 'resolution', 'limits', 'author'] },
  pir: { label: 'Post-incident review', fields: ['incidentId', 'title', 'timestamp', 'summary', 'impact', 'timeline', 'rootCause', 'mitigation', 'permanent', 'recovery', 'whatWorked', 'whatDidnt', 'uncertainty', 'actionItems'] },
};

/** Draft only from collected evidence, the append-only timeline and the hypothesis ledger. Never from the hidden cause. */
export function draftDoc(tid, att, sim) {
  const ev = att.evidence;
  const evLines = ev.map((e) => `[${e.id}] ${e.clock} — ${(e.facts && e.facts[0]) || e.summary}`).join('\n');
  const tests = ev.filter((e) => DIAGNOSTICS[e.source] || SANDBOX_TESTS[e.source] || e.source.startsWith('ask:')).map((e) => `${e.label}: ${e.summary} [${e.id}]`).join('\n');
  const acts = att.timeline.filter((x) => x.kind === 'action').map((x) => `${x.clock} ${x.text}`).join('\n');
  const hyps = att.hyps.map((h) => `${h.status.toUpperCase()} — ${h.label}${h.history.length ? ` (${h.history[h.history.length - 1].reason || ''})` : ''}`).join('\n');
  const ids = [...new Set(ev.flatMap((e) => idsIn(`${e.summary} ${(e.facts || []).join(' ')}`)))].slice(0, 10);
  const base = { incidentId: att.incidentId, timestamp: `${sim.clockStr(att.reportedAt).slice(0, 5)} facility time (simulated)`, evidence: evLines, tests, actions: acts || '—', hypotheses: hyps, affected: ids.join(', ') };
  const f = {};
  for (const k of TEMPLATES[tid].fields) f[k] = base[k] ?? '';
  if (tid === 'pir') f.timeline = att.timeline.map((x) => `${x.clock} facility time — ${x.text}`).join('\n');
  if (tid === 'handoffDoc') { f.actions = acts; f.status = ''; }
  return f;
}

export function validateDoc(tid, fields, ctx) {
  const items = []; const critical = []; const notes = [];
  for (const k of TEMPLATES[tid].fields) { const d = FIELDS[k]; const ok = !!d.test(fields[k] || '', ctx); items.push({ ok, key: k, label: d.label, why: d.why, pts: 1 }); }
  const all = Object.values(fields).join('\n');
  const fake = citations(all).filter((c) => !ctx.evidenceIds.includes(c));
  if (fake.length) critical.push({ code: 'fabricated_evidence', msg: `Cites evidence never collected: ${fake.join(', ')}` });
  const unknown = idsIn(all).filter((id) => ctx.knownIds && !ctx.knownIds.includes(id));
  if (unknown.length) notes.push({ code: 'unknown_id', msg: `Identifiers not found in the system: ${unknown.join(', ')}` });
  if (claimsRestored(all) && ctx.recovered === false) critical.push({ code: 'unsupported_restored', msg: 'Document says service is restored/resolved while recovery checks fail.' });
  const u = unsafeIn(all); if (u.length) critical.push({ code: 'unsafe', msg: `Unsafe instruction (${u.join(', ')})` });
  if (fields.permanent && fields.mitigation && lc(fields.permanent).trim() === lc(fields.mitigation).trim()) notes.push({ code: 'mitigation_equals_permanent', msg: 'Mitigation and permanent correction are identical — they are usually different.' });
  if ((fields.rootCause || fields.permanent) && /(confirmed|root cause (is|was)|permanent(ly)? fix(ed)?)/i.test(`${fields.rootCause} ${fields.permanent}`) && !/(not|un)\s*confirmed/i.test(`${fields.rootCause}`) && !ctx.rootCauseSupported) notes.push({ code: 'unsupported_root_cause', msg: 'States a confirmed root cause / permanent fix that your evidence does not support.', unsupported: true });
  if (fields.recovery && /pass/i.test(fields.recovery) && ctx.failingChecks?.length && ctx.failingChecks.some((c) => lc(fields.recovery).includes(lc(c).slice(0, 18)) && !/fail/i.test(fields.recovery))) notes.push({ code: 'recovery_mismatch', msg: 'Recovery field reports checks as passing that currently fail.', unsupported: true });
  const got = items.filter((i) => i.ok).length;
  return { items, critical, notes, pct: items.length ? got / items.length : 0 };
}
export function diffVersions(a, b) { const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])]; return keys.filter((k) => (a?.[k] || '') !== (b?.[k] || '')).map((k) => ({ key: k, before: a?.[k] || '', after: b?.[k] || '' })); }

// ------------------------------------------------------------------ runbooks
export const RUNBOOK_SECTIONS = [
  ['intendedUse', 'Intended use and scope'], ['preconditions', 'Preconditions and access requirements'], ['diagnostics', 'Safe diagnostic steps (one per line, each with “Expected:”)'], ['decisions', 'Branching decisions (If … then …; include “Otherwise …”)'],
  ['stop', 'Stop and escalation conditions'], ['verification', 'Recovery verification'], ['rollback', 'Rollback considerations'], ['author', 'Author'],
];
const DIAG_KW = [[['charge current', 'battery telemetry', 'battery and charging', 'charging telemetry', 'battery %'], 'comp_battery'], [['re-dock', 'redock', 'different charger', 'another charger', 'known-good charger', 'move it to c-', 'move r-04 to'], 'redock_test'], [['charger status', 'charger display', 'charger data', 'charger output'], 'charger_status'], [['obstacle'], 'comp_obstacle'], [['camera'], 'camera_view'], [['localization'], 'comp_localization'], [['wireless', 'rssi', 'link'], 'comp_wireless'], [['same zone', 'other robots'], 'compare_zone'], [['access point', 'ap health', 'network health'], 'network_zone'], [['firmware', 'group disconnects'], 'firmware_breakdown'], [['service health'], 'service_health'], [['release', 'config change'], 'release_diff'], [['station status'], 'station_status'], [['hmi'], 'station_local'], [['inventory record', 'pick failures'], 'inventory_record'], [['task record', 'assignment'], 'task_record'], [['robot status', 'status label'], 'robot_status'], [['logs', 'warnings', 'error codes'], 'robot_logs'], [['queue', 'oldest task'], 'queue_metrics'], [['alarm'], 'alarm_list'], [['encoder'], 'comp_encoders'], [['motor current'], 'comp_drive'], [['e-stop', 'estop'], 'comp_estop'], [['controller', 'uptime'], 'comp_controller'], [['payload'], 'comp_payload']];
const OUTCOME_KW = {
  'comp_battery:not_charging': ['0 a', '0a', '0.0 a', 'zero', 'not charging', 'no current'], 'comp_battery:low': ['low battery', 'below 25', 'not docked'],
  'redock_test:robot_bad': ['fails on', 'also fails', 'still 0', 'robot side', 'robot-side', 'contacts', 'both chargers', 'any charger'], 'redock_test:charger_bad': ['charges on', 'charges normally', 'charger fault', 'charger side', 'charger-side', 'other robot fails', 'other robot also'],
  'charger_status:output_zero': ['0 a', 'zero', 'no output', 'output'],
};
const normalOutcome = (diag) => (diag.predict?.options || []).find((o) => /normal|clear|stable|match|closed|consistent|ready|healthy|none/i.test(o[1]))?.[0];
export function mapStep(line) { const l = lc(line); for (const [kws, id] of DIAG_KW) if (kws.some((k) => l.includes(k))) return id; return null; }

/** Simulated technician: uses ONLY the runbook text and permitted (read-only/sandbox) system information. */
export function technicianRun(rb, occurrences) {
  const pauses = []; const log = [];
  const sec = (k) => String(rb[k] || '');
  const lines = (k) => sec(k).split('\n').map((x) => x.trim()).filter(Boolean);
  for (const [k, l] of RUNBOOK_SECTIONS) if (sec(k).trim().length < (k === 'author' ? 2 : 12)) pauses.push({ occ: '-', where: l, why: 'Missing or too thin.', consequence: 'The technician has nothing to follow here and stops to call the author.' });
  const u = unsafeIn(Object.values(rb).join(' ')); if (u.length) pauses.push({ occ: '-', where: 'Safety', why: `Unsafe instruction: ${u.join(', ')}`, consequence: 'STOP — the technician refuses to continue.' });
  if (!/(access|permission|role|login|authori|read-only)/i.test(sec('preconditions'))) pauses.push({ occ: '-', where: 'Preconditions', why: 'Access requirements not stated.', consequence: 'A technician without the right access discovers it halfway through.' });
  if (!/\bif\b/i.test(sec('stop')) && !/(\d+ ?min|>|after|when)/i.test(sec('stop'))) pauses.push({ occ: '-', where: 'Stop and escalation', why: 'No concrete trigger (if/when/after N minutes).', consequence: 'Escalates too late or never.' });
  if (!/(team|engineer|maintenance|network|facilities|support|lead)/i.test(sec('stop'))) pauses.push({ occ: '-', where: 'Stop and escalation', why: 'Does not say who to escalate to.', consequence: 'The technician does not know whom to call.' });
  if (lines('verification').length < 3 || !/(task|order)/i.test(sec('verification')) || !/(min|observe|watch)/i.test(sec('verification'))) pauses.push({ occ: '-', where: 'Recovery verification', why: 'Needs ≥ 3 checks including a completed task and an observation period.', consequence: 'Premature closure: the robot looks fine while the problem continues.' });
  if (!/(otherwise|else|none of the above|any other|if normal)/i.test(sec('decisions'))) pauses.push({ occ: '-', where: 'Branching decisions', why: 'No catch-all branch (“Otherwise …”).', consequence: 'An unexpected result leaves the technician stuck.' });
  for (const o of occurrences) {
    for (const [i, ln] of lines('diagnostics').entries()) {
      const id = mapStep(ln);
      if (!id) { pauses.push({ occ: o.label, where: `Diagnostic step ${i + 1}`, why: `No permitted tool matches “${ln.slice(0, 70)}”.`, consequence: 'The technician cannot perform the step with the access they have.' }); continue; }
      if (!/(expected|should|normal is|if )/i.test(ln)) pauses.push({ occ: o.label, where: `Diagnostic step ${i + 1}`, why: 'No expected result stated.', consequence: 'They cannot tell whether the reading is good or bad.' });
      const D = DIAGNOSTICS[id] || SANDBOX_TESTS[id];
      const target = (ln.match(/\bR-\d\d\b/) || [o.robot])[0];
      let res; try { res = D.run(o.sim, { robot: target, station: (ln.match(/\bP-\d\b/) || [])[0] }); } catch (e) { res = { outcome: 'error', summary: 'tool error' }; }
      log.push({ occ: o.label, step: i + 1, tool: D.label, result: res.summary, outcome: res.outcome });
      const norm = normalOutcome(D);
      if (res.outcome !== norm) {
        const kws = OUTCOME_KW[`${id}:${res.outcome}`] || (SUPPORTS[`${id}:${res.outcome}`] ? [res.outcome.replace(/_/g, ' ')] : [res.outcome.replace(/_/g, ' ')]);
        const covered = lines('decisions').some((d) => kws.some((k) => lc(d).includes(k)));
        if (!covered && !/(otherwise|else)/i.test(sec('decisions'))) pauses.push({ occ: o.label, where: `After step ${i + 1}`, why: `Observed “${res.summary.slice(0, 90)}” — no branch covers this result.`, consequence: 'The technician does not know which action applies and stops.' });
        else if (!covered) log.push({ occ: o.label, step: i + 1, tool: 'decision', result: 'No specific branch; followed “Otherwise” (likely escalation).', outcome: 'fallback' });
      }
    }
  }
  for (const d of lines('decisions')) if (/(rollback|roll back|restart (the )?service|change config|revert)/i.test(d) && !/(escalat|engineering|approval|ask)/i.test(d)) pauses.push({ occ: '-', where: 'Branching decisions', why: `“${d.slice(0, 60)}” requires engineering approval but the runbook tells the technician to do it.`, consequence: 'Outside a technician’s authority — the step cannot be performed.' });
  const fallbacks = log.filter((x) => x.outcome === 'fallback').length;
  return { completed: pauses.length === 0, pauses, log, fallbacks };
}
export const ALL_CHECK_LABELS = Object.fromEntries(Object.entries(CHECKS).map(([k, v]) => [k, v.label]));
