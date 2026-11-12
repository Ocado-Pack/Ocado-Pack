// Technical Communication, Documentation & Interview Readiness — RULES (pure, no DOM).
// Transparent checklist rules + scenario-specific rules. NO AI and no hidden "understanding":
// these rules look for structure, citations, specific phrases and consistency with recorded evidence.
// They are stated to the learner, including their limits.

export const RULE_LIMITS = 'Checks are transparent rules (keywords, structure, citations, and comparison with the simulation state and the evidence you collected). They cannot understand arbitrary prose, can miss subtle errors and can be fooled by wording. They never score accent, personality, length beyond a stated format limit, or use of jargon.';

export const SECRET_SAFE_NOTE = 'Hints, characters and document drafts only use information you have collected or could observe; hidden causes are revealed after submission.';

// ------------------------------------------------------------------ text helpers
export const sentences = (t) => String(t || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).map((s) => s.trim()).filter((s) => s.replace(/[^a-z0-9]/gi, '').length > 3);
export const lc = (t) => String(t || '').toLowerCase();
const any = (t, ws) => ws.some((w) => t.includes(w));
export function citations(text) { return [...new Set((String(text || '').match(/\[(E\d+)\]/g) || []).map((x) => x.slice(1, -1)))]; }
export const TIME_RE = /\b([01]?\d|2[0-3]):[0-5]\d\b/;
export const hasTime = (t) => TIME_RE.test(t);
export const hasTz = (t) => /(utc|facility time|local time|site time|\b[a-z]{2,4}t\b|time zone|tz)/i.test(t);
export const hasNumber = (t) => /\d/.test(String(t || '').replace(TIME_RE, ''));
const IDS_RE = /\b(R-\d\d|P-\d|C-\d|AP-\d|T-\d{3,}|O-\d{3,}|[A-D]-\d\d)\b/g;
export const idsIn = (t) => [...new Set(String(t || '').match(IDS_RE) || [])];

// ------------------------------------------------------------------ claims & uncertainty
export const HYP_KW = {
  network: ['wi-fi', 'wifi', 'network', 'access point', 'ap-1', 'ap-2', 'ap-3', 'ap-4', 'ap-5', 'disconnect', 'signal', 'rssi', 'zone c network'],
  firmware: ['firmware', 'rc-4.3', 'robot-side software', 'wi-fi driver'],
  inventory: ['inventory', 'stock record', 'item not found', 'item_not_found', 'mis-slot', 'cycle count', 'location record', 'system quantity'],
  obstruction: ['obstruction', 'obstacle', 'blocked aisle', 'tote on the floor', 'debris', 'fallen tote'],
  localization: ['localization', 'localisation', 'floor marker', 'markers', 'lost its position', 'relocaliz'],
  taskstate: ['stale', 'assignment record', 'lease', 'session', 'task state', 'task record', 'stuck assignment'],
  station: ['scanner', 'station hardware', 'station is down', 'station down'],
  heartbeat: ['heartbeat', 'station-service', 'station service', 'status mismatch'],
  timeout: ['inventory-service', 'reservation timeout', 'slow service', 'database', 'connection pool', 'reserve timeout'],
  regression: ['release', 'regression', '5.2.0', 'deploy', 'ack timeout', 'ack_timeout'],
  contacts: ['charging contacts', 'contacts', 'robot-side charging'],
  charger: ['charger fault', 'charger output', 'fuse', 'charger c-'],
  encoder: ['encoder', 'wheel feedback', 'odometry'],
  drag: ['motor current', 'drag', 'bearing', 'overcurrent'],
  service: ['service issue', 'fleet-manager', 'fleet manager', 'software issue', 'server side', 'service-side'],
  robot: ['robot fault', 'robot hardware', 'faulty robot', 'robot is broken', 'pull r-'],
  zone: ['zone d', 'ap-4', 'that zone', 'area network'],
  unknown: ['unknown cause'],
};
const ASSERT = ['caused by', 'cause is', 'cause was', 'root cause', 'is due to', 'because of', 'the problem is', 'confirmed', 'definitely', 'is the reason', 'it was', 'it is a', 'it\'s a', 'we found', 'was fixed by', 'permanent fix'];
const HEDGE = ['suspect', 'hypothesis', 'might', 'may ', 'possible', 'possibly', 'likely', 'unconfirmed', 'not confirmed', 'not yet confirmed', 'investigating', 'checking whether', 'could be', 'rule out', 'ruled out', 'not the', 'unknown', 'not determined', 'leading theory', 'working theory', 'we think', 'appears'];

/** Which hypotheses a text asserts or mentions. Returns [{hyp, assertive, sentence}] */
export function claimsIn(text, hypIds) {
  const out = [];
  for (const s of sentences(text)) {
    const l = lc(s);
    for (const h of hypIds) {
      const kws = HYP_KW[h] || [];
      if (!any(l, kws)) continue;
      const assertive = any(l, ASSERT) && !any(l, HEDGE) && !/\b(not|isn't|wasn't|no)\b[^.]{0,30}(caused|cause|due)/.test(l);
      out.push({ hyp: h, assertive, sentence: s });
    }
  }
  return out;
}
export function uncertaintyLabels(text) {
  const l = lc(text);
  return {
    facts: /(fact|known|confirmed|observed|we see|we can see|measured|logs show|e\d)/.test(l),
    hypotheses: /(hypothes|suspect|working theory|leading theory|possible cause|could be|likely)/.test(l),
    estimates: /(estimate|approx|about|around|roughly|~)/.test(l),
    unknowns: /(unknown|not yet known|not known|don't know|do not know|uncertain|unclear|not confirmed|still checking|to be determined)/.test(l),
  };
}
export const ETA_RE = /(eta|will be (fixed|resolved|back|up|done)|fixed by|resolved by|back (up|online|to normal) (by|in)|should be (fixed|resolved|back|done)|ready by|done by)\s*[^.]{0,25}(\d|minutes|min\b|hour)/i;
const RESTORED = ['restored', 'resolved', 'back to normal', 'fully recovered', 'is fixed', 'all good', 'all clear', 'working normally', 'recovered'];
const NEG = (l, w) => new RegExp(`(not|n't|no|un|yet to be|not yet|isn't|is not|until)\\s*(\\w+\\s){0,3}${w}`).test(l);
const CONTRAST = /(\bbut\b|\bstill\b|however|although|except|not yet|remain|growing|partial|only the robot|robot is back)/;
/** True if any sentence asserts recovery without negation or contrast (e.g. "R-07 recovered but the queue is still growing" is NOT a restored claim). */
export const claimsRestored = (text) => sentences(text).concat(sentences(text).length ? [] : [String(text || '')]).some((sn) => { const l = lc(sn); return RESTORED.some((w) => l.includes(w) && !NEG(l, w)) && !CONTRAST.test(l); });
export const UNSAFE = ['bypass', 'override the interlock', 'jumper', 'disable the e-stop', 'disable e-stop', 'reset the e-stop remotely', 'remote e-stop reset', 'defeat', 'mute the sensor', 'tape over', 'enter the aisle while', 'walk into the robot area', 'go into the aisle', 'while energized', 'while energised', 'climb on', 'push the robot by hand while', 'reach into'];
export const unsafeIn = (text) => UNSAFE.filter((w) => lc(text).includes(w));

// ------------------------------------------------------------------ checkers (each returns {items:[{ok,label,why,pts,example?}], critical:[], tips:[]})
function res() { return { items: [], critical: [], tips: [] }; }
function add(r, ok, label, why, pts = 1) { r.items.push({ ok: !!ok, label, why, pts }); }
function common(r, text, ctx) {
  const cites = citations(text);
  const fake = cites.filter((c) => !ctx.evidenceIds?.includes(c));
  if (fake.length) r.critical.push({ code: 'fabricated_evidence', msg: `Cites evidence that was never collected: ${fake.join(', ')}.` });
  if (claimsRestored(text) && ctx.recovered === false) r.critical.push({ code: 'unsupported_restored', msg: 'Says service is restored/resolved while recovery checks have not passed.', example: sentences(text).find((s) => claimsRestored(s)) });
  const u = unsafeIn(text); if (u.length) r.critical.push({ code: 'unsafe', msg: `Unsafe instruction (${u.join(', ')}).` });
  if (/[A-Z]{3,}_[A-Z_]{3,}/.test(text) && ctx.audience === 'ops') r.tips.push('Tip (not scored): operations readers may not know internal codes like ACK_TIMEOUT — say what they mean for orders.');
  return cites;
}
export function checkAck(text, ctx) {
  const r = res(); const l = lc(text); common(r, text, ctx);
  add(r, any(l, ctx.reportKw || ['robot', 'order', 'queue', 'fail', 'task', 'station']), 'Summarizes the reported problem', 'Shows you understood what was reported.');
  add(r, hasNumber(text) || /(confirm|how many|which)/.test(l), 'Confirms or asks to confirm impact', 'Impact drives priority.');
  add(r, /(i'm|i am|i will|i'll|checking|looking|now|next|first)/.test(l), 'States the immediate next step', 'Shows ownership.');
  add(r, hasTime(text) || /in \d+ ?min/.test(l), 'Commits to a next update', 'Sets expectations.');
  add(r, sentences(text).length <= 4, 'Brief (≤ 4 sentences)', 'Acknowledgments should be quick to read.');
  if (ETA_RE.test(text) && !ctx.causeKnown) r.critical.length || r.items.push({ ok: false, label: 'No invented repair estimate', why: 'Cause unknown — commit to an update time instead.', pts: 2, unsupported: true });
  return r;
}
export function checkOpsUpdate(text, ctx) {
  const r = res(); const l = lc(text); common(r, text, ctx);
  const n = sentences(text).length;
  if (ctx.maxSentences) add(r, n <= ctx.maxSentences && n >= 2, `Format: ${ctx.maxSentences} sentences (you wrote ${n})`, 'Respect the requested format; operations reads this on a radio/handheld.', 2);
  add(r, hasNumber(text) && /(order|task|robot|queue|minute|min|%)/.test(l), 'Quantified operational impact', 'e.g. "~14 tasks waiting, oldest 9 min".', 2);
  add(r, /(workaround|meanwhile|until then|in the meantime|reroute|restrict|avoid|hold|isolat|keep)/.test(l) || ctx.noWorkaround, 'Workaround or what operations should do now', 'Operations needs to know how to keep working.');
  add(r, hasTime(text) || /in \d+ ?min/.test(l), 'Next update time', 'Commit to a time, not a repair estimate.', 2);
  const u = uncertaintyLabels(text); add(r, u.unknowns || u.hypotheses || ctx.causeKnown, 'Says what is not yet known', 'Avoid implying certainty you do not have.');
  if (ETA_RE.test(text) && !ctx.causeKnown) r.items.push({ ok: false, label: 'No invented repair estimate', why: 'The cause is not known; a repair time would be a guess presented as fact.', pts: 3, unsupported: true, example: sentences(text).find((s) => ETA_RE.test(s)) });
  return r;
}
const ACTION_VERBS = /(check|inspect|repair|replace|roll ?back|revert|release|cycle count|count|reseat|reboot|restart|confirm|review|verify|isolate|rollback|move|test)/;
const COMPONENTS = /\b(r-\d\d|p-\d|c-\d|ap-\d|[a-d]-\d\d|t-\d{3,}|o-\d{3,}|access points?|firmware|location|scanner|station|assignments?|lease|config(uration)?|release|charger|contacts|encoder|inventory record|fleet-manager|inventory-service|station-service|markers|rc-[\d.]+)\b/;
export function specificRequest(t) { const l = lc(t); return /(please|can you|could you|request|need you to|asking you to|would you)/.test(l) && ACTION_VERBS.test(l) && COMPONENTS.test(l) && !/(whatever|the component our evidence|the problem|everything|it\b)$/.test(l.trim()); }
export function checkEscalation(f, ctx) {
  const r = res(); const text = `${f.request || ''}\n${f.summary || ''}\n${f.repro || ''}\n${f.ruledOut || ''}`; const l = lc(text);
  const cites = [...new Set([...(f.cites || []), ...common(r, text, ctx)])];
  add(r, f.team === ctx.truthTeam, `Routed to the owning team (${f.team || 'none'})`, 'The right team can act; the wrong one bounces it back.', 2);
  add(r, specificRequest(f.request), 'Specific request (action + named equipment/system)', '“Please fix” or “repair whatever is wrong” is not actionable: name the action and the equipment or system.', 2);
  add(r, cites.filter((c) => ctx.evidenceIds.includes(c)).length >= 2, 'At least two pieces of collected evidence attached/cited', 'Engineers need timestamps, IDs and results.', 2);
  add(r, cites.some((c) => ctx.discriminatingIds.includes(c)), 'Includes evidence that separates the hypotheses', 'Otherwise they must redo your work.', 2);
  add(r, (f.repro || '').length > 15 && (idsIn(f.repro).length || hasTime(f.repro) || /(since|every|only when|when|after|zone|aisle)/.test(lc(f.repro))), 'Reproduction conditions (when/where/how often)', 'Lets someone reproduce or observe it.');
  add(r, /(ruled out|not the|normal|healthy|contradict|excluded|clear)/.test(lc(f.ruledOut || '')), 'What you already tested / ruled out', 'Saves duplicate work.');
  add(r, hasNumber(f.summary || '') || /(order|task|robot)/.test(lc(f.summary || '')), 'Operational impact', 'Sets urgency.');
  add(r, ctx.withinAuthority !== false, 'Respects escalation boundary', 'Request actions you are not authorized to perform instead of doing them.');
  return r;
}
export function checkHandoff(f, ctx) {
  const r = res(); const all = Object.values(f).join('\n'); const l = lc(all); common(r, all, ctx);
  add(r, /(open|active|mitigated|monitoring|unresolved|resolved)/.test(lc(f.status)), 'States incident status', 'The receiver must know if it is still live.');
  add(r, ctx.statusHonest, 'Status matches recovery checks', 'Do not hand over "resolved" while checks fail.', 2);
  add(r, /(jordan|you own|you are owner|owner:|incoming|ownership)/.test(l), 'Explicit ownership transfer', 'Avoids "I thought you had it".', 2);
  add(r, (f.next || '').length > 15 && (hasTime(f.next) || /(at |by |within|after|every)/.test(lc(f.next))), 'Next actions with timing', 'What to do and when.', 2);
  const missing = (ctx.activeItems || []).filter((it) => !it.kw.some((k) => l.includes(lc(k))));
  add(r, !missing.length, `Lists every unresolved item${missing.length ? ` (missing: ${missing.map((m) => m.label).join('; ')})` : ''}`, 'Hidden open items cause repeat incidents.', 3);
  add(r, /(pending|requested|waiting on|awaiting|asked)/.test(lc(f.pending || '')) || !ctx.hasPending, 'Pending requests and who owns them', 'So the receiver can chase them.');
  add(r, citations(all).length >= 1 || /(notebook|ticket|timeline|inc-)/.test(l), 'Points to evidence / record', 'Where to find the details.');
  add(r, /(verify|check|confirm|watch|observe)/.test(lc(f.verify || '') + lc(f.next || '')), 'What remains to verify', 'Recovery is not proven yet.');
  if ((!ctx.statusHonest || missing.length) && ctx.unresolved) r.critical.push({ code: 'concealed_unresolved', msg: !ctx.statusHonest ? 'Handoff reports the incident as resolved while recovery checks fail.' : `Handoff omits unresolved item(s): ${missing.map((m) => m.label).join('; ')}.` });
  return r;
}
export function checkMgmt(text, ctx) {
  const r = res(); const l = lc(text); common(r, text, ctx);
  add(r, hasNumber(text) && /(order|robot|station|zone|%|task)/.test(l), 'Scope with numbers', 'How big is it?');
  add(r, /(recover|restored|mitigat|workaround|in progress|not yet|still|status)/.test(l), 'Recovery status', 'Where are we now?');
  add(r, /(risk|cutoff|could|if not|might|exposure)/.test(l), 'Risk', 'What could get worse?');
  add(r, /(decision|decide|approve|option|do you want|need you to|recommend)/.test(l), 'Decision needed (or none needed)', 'Managers act on decisions.', 2);
  add(r, sentences(text).length <= 5, 'Concise (≤ 5 sentences)', 'Managers skim.');
  if (ETA_RE.test(text) && !ctx.causeKnown) r.items.push({ ok: false, label: 'No invented repair estimate', why: 'Give options and update time instead.', pts: 2, unsupported: true });
  return r;
}
export function checkEngVersion(text, ctx) {
  const r = res(); const l = lc(text); const cites = common(r, text, ctx);
  add(r, cites.length >= 2, 'Evidence with [E#] citations', 'Engineers need to check claims.', 2);
  add(r, /(since|when|only|every|reproduc|zone|aisle|after)/.test(l), 'Reproduction conditions', 'How to see it.');
  add(r, /(depend|service|ap-|network|inventory|fleet-manager|station|upstream|downstream)/.test(l), 'Dependencies involved', 'Where it sits in the system.');
  add(r, /(please|can you|need|request|could you)/.test(l), 'Requested help', 'What you need.');
  return r;
}
export function checkUncertainty(text, ctx) {
  const r = res(); common(r, text, ctx); const u = uncertaintyLabels(text);
  add(r, u.facts, 'Facts identified', 'What is observed/measured.'); add(r, u.hypotheses, 'Hypotheses identified', 'What you suspect.'); add(r, u.estimates, 'Estimates identified (with basis)', 'Numbers that are approximate.'); add(r, u.unknowns, 'Unknowns identified', 'What you do not know yet.');
  return r;
}
export function checkInstruction(f, ctx) {
  const r = res(); const t = f.text || ''; const l = lc(t); common(r, t, ctx);
  add(r, l.includes(lc(f.to || '###')) || /^(marco|jordan|dana|lee|sam|priya)/i.test(t.trim()), 'Names the recipient', 'On a radio, say who you are talking to.');
  add(r, (f.action && l.length > 20), 'Clear action', 'What to do.');
  add(r, f.equipment && l.includes(lc(f.equipment)), 'Equipment identifier in the message', 'Which robot/aisle/charger.');
  add(r, hasTime(t) || /(now|immediately|asap|within \d+|after|before|by )/.test(l), 'Timing', 'When.');
  add(r, /(read (that |it |this )?back|repeat (that |it )?back|confirm (you )?(got|received|understand)|acknowledge|copy\?)/.test(l), 'Asks for acknowledgment / read-back', 'Confirms the message was understood.');
  add(r, /(call|radio|tell|let me know|report|confirm).{0,25}(done|complete|finished|when you)/.test(l), 'Asks for completion confirmation', 'Closes the loop.');
  const u = unsafeIn(t); if (u.length) r.critical.push({ code: 'unsafe', msg: `Unsafe instruction (${u.join(', ')}).` });
  return r;
}
export function checkCorrection(text, ctx) {
  const r = res(); const l = lc(text); common(r, text, ctx);
  add(r, /(correction|correcting|update to my|earlier|previous|at \d{1,2}:\d{2} i said|i said)/.test(l), 'Explicitly corrects the earlier update', 'Readers must know which statement is withdrawn.', 2);
  add(r, /(not|no longer|incorrect|wrong|ruled out|rejected)/.test(l) && any(l, HYP_KW[ctx.wrongHyp] || []), `Withdraws the earlier explanation (${ctx.wrongHyp})`, 'Name what was wrong.', 2);
  add(r, citations(text).length >= 1 || /(new evidence|found|showed|reported)/.test(l), 'Explains what new evidence changed it', 'Builds trust.', 2);
  add(r, /(now|current|instead|investigating|suspect|next)/.test(l), 'Gives the current assessment', 'What we think now.');
  add(r, hasTime(text) || /in \d+ ?min/.test(l), 'Next update time', 'Keeps commitments.');
  add(r, !ETA_RE.test(text) || ctx.causeKnown, 'Withdraws or avoids repair estimates', 'The earlier ETA was based on the wrong cause.', 2);
  return r;
}
export function checkDisagreement(text, ctx) {
  const r = res(); const l = lc(text); common(r, text, ctx);
  add(r, /(operations|ops|dana|floor)/.test(l) && /(robot)/.test(l), 'Represents the operations view fairly', 'Name their observation.', 2);
  add(r, /(engineering|priya|service|fleet-manager|software)/.test(l), 'Represents the engineering view fairly', 'Name their observation.', 2);
  add(r, (ctx.discKw || []).some((k) => l.includes(k)), 'Proposes a test that distinguishes them', 'A test both sides accept settles it.', 3);
  add(r, /(if .* then|if it|if only|if other|if the)/.test(l), 'States how the result decides it ("if … then …")', 'Agree on the decision rule before testing.', 2);
  if (/(obviously|you're wrong|you are wrong|clearly wrong|nonsense)/.test(l)) r.tips.push('Tip (not scored): dismissive wording makes disagreement harder to resolve.');
  return r;
}
export function checkPrioritization(text, order, ctx) {
  const r = res(); const l = lc(text); common(r, text, ctx);
  add(r, order[0] === ctx.firstPriority, `First priority: ${ctx.labels?.[order[0]] || order[0] || 'none'}`, ctx.firstWhy, 4);
  add(r, hasNumber(text) && /(order|robot|task|station|%|throughput)/.test(l), 'Uses impact (numbers)', 'Impact = how much work is affected.');
  add(r, /(urgen|safety|now|immediately|first|cutoff|time)/.test(l), 'Considers urgency / safety', 'Safety and deadlines first.');
  add(r, /(depend|block|before|after|requires|waiting on|parallel)/.test(l), 'Considers dependencies', 'Some work unblocks other work.');
  add(r, /(support|available|unavailable|busy|on.?call|marco|technician|team)/.test(l), 'Considers available support', 'Use who is available; parallelize.');
  return r;
}
export function checkStatement(f, ctx) {
  const r = res(); const all = Object.values(f).join(' '); common(r, all, ctx);
  add(r, idsIn(f.scope).length > 0 || /(zone|aisle|station)/i.test(f.scope || ''), 'Scope with identifiers (robots/zone/station)', '"Robots are not working" → which ones?', 2);
  add(r, hasTime(f.onset || ''), 'Onset time', 'When it started.');
  add(r, hasNumber(f.impact || '') , 'Quantified impact', 'How much work is affected.');
  add(r, (f.expected || '').length > 8 && (f.observed || '').length > 8, 'Expected vs observed behavior', 'Defines the problem precisely.', 2);
  const unknownIds = idsIn(all).filter((id) => ctx.knownIds && !ctx.knownIds.includes(id));
  add(r, !unknownIds.length, `Only real identifiers${unknownIds.length ? ` (unknown: ${unknownIds.join(', ')})` : ''}`, 'Invented IDs send people to the wrong equipment.');
  return r;
}
export function checkReflection(text) {
  const r = res(); const l = lc(text);
  add(r, /(observ|saw|noticed|metric|log|dashboard|task record)/.test(l), 'Starts from what you observed', '');
  add(r, /(hypothes|suspect|could be|alternative|rather than|instead of|ruled out)/.test(l), 'Mentions alternatives considered', '');
  add(r, /(test|compare|check|grouped|sandbox)/.test(l) && /(because|so that|to see|to tell|separate|distinguish)/.test(l), 'Explains why the key test was chosen', '');
  add(r, /(not sure|uncertain|unknown|not confirmed|still|would need)/.test(l), 'States remaining uncertainty', '');
  add(r, /(next|escalat|handoff|hand off|jordan|verify)/.test(l), 'States next steps / handoff', '');
  return r;
}
export function scoreOf(r) { const got = r.items.filter((i) => i.ok).reduce((a, i) => a + i.pts, 0); const max = r.items.reduce((a, i) => a + i.pts, 0); return { got, max, pct: max ? got / max : 0 }; }

// ------------------------------------------------------------------ discriminating & contradiction tables
export const CONTRA = {
  network: ['network_zone:healthy', 'firmware_breakdown:by_firmware', 'comp_wireless:stable'],
  firmware: ['firmware_breakdown:by_zone'],
  inventory: ['inventory_record:none'],
  obstruction: ['comp_obstacle:clear', 'camera_view:clear', 'ask:walk:clear'],
  localization: ['comp_localization:normal'],
  taskstate: ['task_record:match', 'task_record:none'],
  station: ['station_local:hmi_ready', 'station_status:ready'],
  heartbeat: ['station_local:scanner_fault'],
  timeout: ['service_health:healthy'],
  regression: ['release_diff:unrelated', 'robot_logs_zone:comms'],
  contacts: ['redock_test:charger_bad'],
  charger: ['redock_test:robot_bad'],
  service: ['robot_logs_zone:comms'],
};
export function contradictions(hyp, evidence) { const keys = CONTRA[hyp] || []; return evidence.filter((e) => keys.includes(`${e.source}:${e.outcome}`)); }

// ------------------------------------------------------------------ metrics (definitions + computation)
export const METRIC_DEFS = [
  { id: 'ackTime', label: 'Time to acknowledgment', def: 'Facility-time seconds from the report to your first acknowledgment message to the reporter.', window: 'Per incident; summary = median of your last 5 incidents.', note: 'Faster is not better beyond ~3 minutes; a thoughtful 2-minute ack beats an empty 10-second one.' },
  { id: 'commitments', label: 'Update commitments met', def: 'Next-update times you committed to that you met (within 60 s grace), divided by commitments made.', window: 'Per incident; summary = total over last 5 incidents.' },
  { id: 'usefulEscalation', label: 'Time to useful escalation', def: 'Facility-time seconds from report to the first escalation that went to the owning team with discriminating evidence and a specific request. “Not needed” when the scenario did not require one; “None” if required but never achieved (not zero).', window: 'Per incident.' },
  { id: 'repeatedTests', label: 'Unnecessary or repeated tests', def: 'Diagnostics re-run with no state change in between and less than 3 minutes apart, plus questions whose answer was already on your screen.', window: 'Per incident.' },
  { id: 'verification', label: 'Completeness of recovery verification', def: 'Required recovery checks run after your last mitigation and passing at closure/handoff, divided by required checks.', window: 'At closure or handoff.' },
  { id: 'handoffQuestions', label: 'Handoff questions caused by missing information', def: 'Follow-up questions the receiving technician asked before accepting your handoff.', window: 'Per handoff.' },
  { id: 'runbookSuccess', label: 'Runbook completion success', def: 'Whether the simulated technician completed every step using only your runbook, and how many revisions it took.', window: 'Per runbook test.' },
  { id: 'unsupportedClaims', label: 'Unsupported claims', def: 'Statements that assert a cause, a recovery or a repair time not supported by collected evidence or passing checks, plus citations to evidence you never collected.', window: 'Per incident (messages + documents).' },
  { id: 'docCorrections', label: 'Documentation corrections', def: 'Saved revisions that change an earlier finding (hypothesis status, assessment, root-cause statement) with a reason. Prompt corrections after new evidence are good practice, not a penalty.', window: 'Per incident.' },
];
export const METRIC_CAVEATS = [
  'Faster resolution is not automatically better: incident complexity, safety, evidence preservation and recurrence matter more.',
  'Operational results (queue age, throughput) and communication results (updates, handoffs) are reported separately. A message does not cause a throughput change; only system actions can, and even those need evidence.',
];

// ------------------------------------------------------------------ rubric
export const RUBRIC = [
  { id: 'accuracy', label: 'Factual accuracy and evidence', max: 25 },
  { id: 'reasoning', label: 'Technical reasoning and verification', max: 20 },
  { id: 'communication', label: 'Clear, audience-appropriate communication', max: 15 },
  { id: 'documentation', label: 'Actionable documentation and reproducibility', max: 15 },
  { id: 'ownership', label: 'Ownership, handoff, and escalation', max: 15 },
  { id: 'timeliness', label: 'Timeliness and concision', max: 10 },
];
export const CRITICAL_LABELS = { fabricated_evidence: 'Fabricated evidence', unsupported_restored: 'Unsupported claim that service is restored', unsafe: 'Unsafe instructions', concealed_unresolved: 'Concealing an unresolved issue during handoff' };
export const NOT_SCORED = 'Never scored: accent, personality, verbosity (beyond a stated format limit), or jargon.';
