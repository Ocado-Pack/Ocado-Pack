// Template-based review exercise generation (no AI). Mistakes become spaced-review items.
import { DIAGNOSTICS, SANDBOX_TESTS, CHECKS } from './sim/catalog.js';
import { addReview } from './store.js';

// What each (diagnostic, outcome) most directly supports. Used to generate "interpret the evidence" items.
export const SUPPORTS = {
  'comp_obstacle:blocked': 'Something physical is detected in the robot’s path (obstruction).',
  'comp_obstacle:clear': 'The path ahead is clear — an obstruction is unlikely to be the reason for this stop.',
  'comp_localization:low': 'The robot is unsure where it is (localization problem — robot sensor or environment).',
  'comp_localization:normal': 'Localization is fine — a localization cause is unlikely.',
  'comp_wireless:unstable': 'The robot’s link is unstable (network problem — robot-side or AP-side still to be separated).',
  'comp_wireless:stable': 'The link is stable — a network cause is unlikely for this robot.',
  'task_record:mismatch': 'Software task state disagrees between fleet manager and robot (task-state problem).',
  'task_record:match': 'Task records agree — a stale-assignment problem is unlikely.',
  'compare_zone:others_affected': 'Other robots in the same place show the same symptom — the cause is probably shared (place/infrastructure).',
  'compare_zone:only_target': 'Only this robot shows the symptom (but check how many others actually passed through) — likely individual.',
  'network_zone:degraded': 'An access point / zone shows degraded network health.',
  'firmware_breakdown:by_firmware': 'The problem follows a robot attribute (firmware), not a place.',
  'firmware_breakdown:by_zone': 'The problem follows a place (zone/AP), not a robot attribute.',
  'comp_encoders:mismatch': 'Wheel feedback disagrees left vs right while driving straight (encoder problem).',
  'comp_drive:overcurrent': 'One motor works much harder than the other (mechanical drag).',
  'redock_test:robot_bad': 'The robot fails on a good charger too — the robot side (contacts) is at fault.',
  'redock_test:charger_bad': 'The robot charges elsewhere; the original charger fails other robots — the charger is at fault.',
  'station_local:hmi_ready': 'The station hardware reports READY while software says unavailable — a software status problem.',
  'station_local:scanner_fault': 'The station hardware itself reports a fault.',
  'release_diff:relevant': 'A recent change aligns with onset — a suspect that still needs a test (correlation ≠ causation).',
  'records_probe:none': 'Duplicate deliveries had no physical effect — the idempotency safeguard worked.',
  'sandbox_restart:persists': 'A restart would not fix it — the wrong state is not in the robot (and a restart would erase evidence).',
  'service_health:degraded': 'A service in the request path is slow or failing.',
  'trace_oldest:reserve': 'Work is stuck at stock reservation (downstream service timeouts).',
  'trace_oldest:ack': 'Work is stuck waiting for a robot acknowledgment.',
  'inventory_record:mismatch': 'System quantity disagrees with what robots find at a location.',
  'comp_controller:recent_reboot': 'The controller restarted recently — check what state may have been lost.',
};

export const DOC_BANK = [
  { q: 'Service is restored but the cause is not confirmed. Which sentence belongs in the incident record?', options: ['Root cause was the AP firmware; fixed permanently.', 'Service restored at 06:42 (facility time) after the AP-2 reboot [E3]; root cause not determined; monitoring for recurrence until 08:00 and AP log retention requested.', 'Everything is back to normal, no further action.', 'The network team broke it.'], answer: 1, why: 'States what was observed, cites evidence, says the cause is unknown, and sets a follow-up.' },
  { q: 'Which line correctly labels an unverified explanation?', options: ['Cause: damaged markers.', 'Hypothesis (unconfirmed): damaged floor markers near C-11 — supported by E4 (loc 0.29) and E6 (camera); would be confirmed by facilities inspection.', 'Markers definitely broke.', 'It is probably fine.'], answer: 1, why: 'Labels it as a hypothesis, links evidence, and states the confirming test.' },
  { q: 'An engineer asks for evidence. What is most useful to attach?', options: ['“It was broken.”', 'Screenshot of the 3D view only.', 'Timestamped log lines with correlation IDs, the task record comparison, and what you already tested.', 'Your opinion of the release.'], answer: 2, why: 'Engineers need reproducible, timestamped evidence and what was ruled out.' },
];
export const COMM_BANK = [
  { q: 'Operations asks “When will it be fixed?” and the cause is unknown. Best reply?', options: ['In 10 minutes.', 'No idea.', 'We don’t have a cause yet. Impact: ~12 orders waiting at P-3. I’m rerouting P-3 work to other stations now; next update at 06:50 facility time.', 'Should be fine soon.'], answer: 2, why: 'Gives facts, current action and an update commitment instead of an invented ETA.' },
  { q: 'Which initial acknowledgment is best?', options: ['ok', 'Acknowledged — looking at R-07 near Aisle C now. Next update in 10 min.', 'I will fix everything.', 'Please send me all the logs.'], answer: 1, why: 'Short, confirms scope, states next step and update time.' },
];

function diagLabel(id) { return (DIAGNOSTICS[id] || SANDBOX_TESTS[id])?.label || id; }
function pickDistractors(correct, n = 3) {
  const all = Object.values(SUPPORTS).filter((x) => x !== correct);
  const out = []; while (out.length < n && all.length) out.push(all.splice(Math.floor(Math.random() * all.length), 1)[0]);
  return out;
}
function shuffled(correct, distractors) { const arr = [correct, ...distractors].sort(() => Math.random() - 0.5); return { options: arr, answer: arr.indexOf(correct) }; }

export function queuePredictionReview(scTitle, ev, skill = 'diagnosis', kind = 'prediction') {
  const sup = SUPPORTS[`${ev.source}:${ev.outcome}`]; if (!sup) return;
  const { options, answer } = shuffled(sup, pickDistractors(sup));
  addReview({ kind, skill, sig: `${kind}:${ev.source}:${ev.outcome}`, source: scTitle, prompt: `From "${scTitle}": “${diagLabel(ev.source)}” returned: ${ev.summary} What does this most directly support?`, options, answer, explain: sup + (kind === 'prediction' ? ` (You predicted: “${ev.predictedLabel}”.)` : '') });
}
export function queueDiscriminatorReview(sc, truth, hyps) {
  const disc = truth.discriminators.map(diagLabel);
  const nondisc = [...sc.diagnostics, ...sc.tests].filter((d) => !truth.discriminators.includes(d)).map(diagLabel);
  if (!disc.length || nondisc.length < 2) return;
  const correct = disc[0]; const opts = [correct, ...nondisc.sort(() => Math.random() - 0.5).slice(0, 3)];
  const { options, answer } = shuffled(correct, opts.slice(1));
  addReview({ kind: 'hypothesis', skill: 'diagnosis', sig: `hyp:${sc.id}:${truth.cause}`, source: sc.title, prompt: `In "${sc.title}" you weighed: ${hyps.map((h) => h.label).join(' / ')}. Which test best discriminates between them?`, options, answer, explain: `“${correct}” produces different results depending on the cause. ${truth.explanation.split('. ').slice(0, 1).join('')}.` });
}
export function queueCheckReview(scTitle, checkId, opLabel) {
  const ck = CHECKS[checkId]; if (!ck) return;
  const others = Object.values(CHECKS).filter((c) => c.id !== checkId).map((c) => c.label).sort(() => Math.random() - 0.5).slice(0, 3);
  const { options, answer } = shuffled(ck.label, others);
  addReview({ kind: 'verification', skill: 'verification', sig: `ver:${checkId}`, source: scTitle, prompt: `After a mitigation${opLabel ? ` (“${opLabel}”)` : ''}, which check confirms this: “${ck.why}”`, options, answer, explain: `${ck.label}: ${ck.why}` });
}
export function queueDocReview(skill = 'documentation') {
  const bank = skill === 'communication' ? COMM_BANK : DOC_BANK;
  const it = bank[Math.floor(Math.random() * bank.length)];
  addReview({ kind: skill === 'communication' ? 'communication' : 'documentation', skill, sig: `${skill}:${it.q}`, source: 'Documentation rules', prompt: it.q, options: it.options, answer: it.answer, explain: it.why });
}
