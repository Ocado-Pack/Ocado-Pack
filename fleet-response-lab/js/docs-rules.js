// Transparent, rule-based checks for documents and messages. NO AI is used.
// LIMITS (shown to the learner): these rules look for structure, citations and specific risky
// phrases. They cannot judge whether arbitrary prose is true or well-reasoned. A reviewer must.
import { hasAny } from './util.js';

export const RULES_LIMITS = 'These checks are keyword and structure rules, not understanding. They catch missing fields, citations to evidence you never collected, and specific risky phrases (e.g. "root cause was…" without a confirmed cause). They can miss subtle errors and can be fooled by wording. Treat a pass as "no obvious problem found", not "correct".';

const UNSAFE = ['bypass', 'override the interlock', 'override interlock', 'jumper', 'disable the e-stop', 'disable e-stop', 'defeat', 'mute the sensor', 'tape over', 'reset the e-stop remotely', 'remote e-stop reset', 'enter the aisle while', 'walk into the robot area', 'while energized', 'while energised', 'hot swap the battery', 'climb on'];
const RESTORED = ['restored', 'resolved', 'back to normal', 'fully recovered', 'fixed', 'recovered'];
const ROOTCAUSE_CLAIM = ['root cause was', 'root cause is', 'caused by', 'the cause was', 'permanently fixed', 'fixed permanently', 'will not happen again', "won't happen again"];
const HEDGES = ['hypothesis', 'suspect', 'likely', 'possible', 'unconfirmed', 'not yet confirmed', 'not confirmed', 'unknown', 'under investigation', 'we think', 'appears', 'may be', 'might'];
const NEGATED = (t, w) => new RegExp(`(not|n't|no|un|yet to be|isn't|is not|not yet)\\s*(\\w+\\s){0,2}${w}`).test(t);

export function findCitations(text) { return [...new Set((String(text).match(/\[(E\d+)\]/g) || []).map((x) => x.slice(1, -1)))]; }

/** doc: {rootCause, body, cited?}; evidence: [{id,text}]; ctx: {recovered, rootCauseKnown} */
export function scoreDocument(doc, evidence, ctx = {}) {
  const items = []; const critical = [];
  const body = String(doc.body || '').toLowerCase();
  const ids = new Set(evidence.map((e) => e.id));
  const cited = [...new Set([...(doc.cited || []), ...findCitations(doc.body || '')])];
  const fake = cited.filter((c) => !ids.has(c));
  if (fake.length) critical.push({ code: 'fabricated_evidence', msg: `Cites evidence that was never collected: ${fake.join(', ')}. Only evidence in your notebook can be cited.` });
  if (hasAny(body, UNSAFE)) critical.push({ code: 'unsafe', msg: `Contains an unsafe instruction (${UNSAFE.filter((w) => body.includes(w)).join(', ')}). Never bypass protective devices, enter active robot areas or work on energized equipment.` });
  const claimsRestored = RESTORED.some((w) => body.includes(w) && !NEGATED(body, w));
  if (claimsRestored && ctx.recovered === false) critical.push({ code: 'unsupported_restored', msg: 'Claims service is restored/resolved, but recovery checks have not passed.' });
  const claimsRC = doc.rootCause === 'confirmed' || ROOTCAUSE_CLAIM.some((w) => body.includes(w) && !NEGATED(body, w));
  if (claimsRC && !ctx.rootCauseKnown) critical.push({ code: 'unsupported_root_cause', msg: 'States a confirmed root cause that your evidence does not confirm. Use "suspected" or "unknown" and say what would confirm it.' });
  items.push({ ok: cited.length > 0, pts: 2, label: 'Cites collected evidence with [E#] references', why: 'Readers must be able to check claims.' });
  items.push({ ok: !claimsRC || ctx.rootCauseKnown || hasAny(body, HEDGES), pts: 2, label: 'Separates facts from hypotheses', why: 'Unverified explanations must be labelled as hypotheses.' });
  return { items, critical, cited, fake };
}

/** Field completeness for incident notebooks/handoffs. Each required field must be non-trivial. */
export function fieldChecks(fields, required) {
  return required.map(([key, label, why, test]) => {
    const v = String(fields[key] ?? '').trim();
    const okv = test ? test(v) : v.length >= 8;
    return { ok: okv, pts: 1, label, why, key };
  });
}
export const hasTimeTz = (v) => /\b\d{1,2}:\d{2}\b/.test(v) && /(utc|local|[a-z]{2,4}t\b|time zone|tz|facility time|sim time)/i.test(v);
export const hasNumber = (v) => /\d/.test(v);
export const hasOwner = (v) => /(owner|assigned to|@|team|engineer|tech|lead|me\b|I will|support)/i.test(v);

/** Ops/communication messages. kind: ack | impact | mitigation | observing | resolved */
export function scoreUpdate(text, kind, ctx = {}) {
  const t = String(text || ''); const lo = t.toLowerCase();
  const items = []; const critical = []; const tips = [];
  const sentences = t.split(/[.!?]+\s/).filter((x) => x.trim().length > 3).length;
  const add = (ok, label, why, pts = 1) => items.push({ ok, label, why, pts });
  add(/(robot|order|queue|station|aisle|zone|task|r-\d\d|p-\d)/i.test(t), 'States what is affected (scope)', 'The reader needs to know what is impacted.');
  add(/\d/.test(t) && /(order|task|robot|min|%|queue|backlog|throughput)/i.test(t), 'Quantifies impact', 'Numbers ("~14 orders waiting", "3 robots") beat adjectives.');
  if (kind !== 'resolved') add(/(next update|update (you|again)|by \d{1,2}:\d{2}|in \d+ ?min|at \d{1,2}:\d{2})/i.test(t), 'Commits to a next-update time', 'Sets expectations and builds trust.');
  add(/(investigating|checking|next step|i will|we will|i'm|i am|now|working on|requesting|escalat)/i.test(t), 'States the current action / next step', 'Shows ownership.');
  if (kind === 'ack') add(sentences <= 4, 'Brief (≤ 4 sentences)', 'Initial acknowledgments should be fast to read.');
  if (kind === 'mitigation') add(/(workaround|reroute|restrict|isolat|rollback|roll back|hold|mitigat|temporar)/i.test(t), 'Names the mitigation and that it is temporary', 'Separates mitigation from permanent fix.');
  if (kind === 'observing') add(/(monitor|observ|watch|verify|verif|check)/i.test(t), 'Says recovery is being verified/observed', 'Avoids premature "all clear".');
  if (kind === 'resolved') { add(/(follow.?up|action|owner|ticket|review)/i.test(t), 'Lists follow-up actions', 'Closure needs next steps.'); add(/(cause|unknown|confirmed|suspected|under investigation)/i.test(t), 'States root-cause status honestly', 'Confirmed vs suspected vs unknown.'); }
  if (!ctx.causeKnown && /(eta|will be (fixed|resolved|back)|fixed by|resolved by|back up by)\s*.{0,20}\d/i.test(t)) critical.push({ code: 'invented_eta', msg: 'Gives a repair ETA before the cause is known. Commit to an update time instead.' });
  const claimsRestored = RESTORED.some((w) => lo.includes(w) && !NEGATED(lo, w));
  if (claimsRestored && ctx.recovered === false) critical.push({ code: 'unsupported_restored', msg: 'Says service is restored/resolved before recovery checks passed.' });
  if (hasAny(lo, UNSAFE)) critical.push({ code: 'unsafe', msg: 'Contains an unsafe instruction.' });
  if (ctx.rootCauseKnown === false && ROOTCAUSE_CLAIM.some((w) => lo.includes(w) && !NEGATED(lo, w))) critical.push({ code: 'unsupported_root_cause', msg: 'States a root cause that is not confirmed.' });
  if (/[A-Z_]{8,}/.test(t) && kind !== 'resolved' && ctx.audience === 'ops') tips.push('Tip (not scored): operations readers may not know internal log codes — say what the code means.');
  const got = items.filter((i) => i.ok).reduce((a, i) => a + i.pts, 0); const max = items.reduce((a, i) => a + i.pts, 0);
  return { items, critical, tips, score: critical.length ? Math.min(got, Math.floor(max / 2)) : got, max };
}

/** Honest interview phrasing checks. */
export function interviewChecks(text) {
  const lo = String(text || '').toLowerCase();
  const flags = [];
  if (/(at my (job|work|company)|in production|on the floor at|my team at|years of experience|i was responsible for the fleet|i managed the fleet)/i.test(lo) && !/(simulat|training|practice)/i.test(lo)) flags.push('This reads like professional experience. If it happened in this app, say "in a simulated training environment".');
  if (/nimble/i.test(lo) && /(i (used|worked|configured|operated))/i.test(lo)) flags.push('Do not claim experience with an employer\'s proprietary systems. Say what you would verify in their system.');
  if (/(certified|certification)/i.test(lo)) flags.push('Do not mention certifications you have not earned. This app does not certify anything.');
  const okSim = /(simulat|training|practice)/i.test(lo);
  return { flags, okSim };
}
