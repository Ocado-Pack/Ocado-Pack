// Fictional colleagues (SIMULATED). Every answer is computed from the CURRENT simulation state and
// from what the learner has sent or collected — never from the hidden cause.
import { robotVisual } from '../sim/visual.js';
import { zoneOf, aisleAt } from '../sim/engine.js';
import { DIAGNOSTICS } from '../sim/catalog.js';
import { fmtDur } from '../util.js';
import { lc, citations, claimsIn, contradictions, claimsRestored, ETA_RE, checkEscalation, checkHandoff, checkInstruction, checkMgmt, scoreOf } from './rules.js';

export const PEOPLE = {
  dana: { name: 'Dana', role: 'operations shift lead', channel: 'radio' },
  marco: { name: 'Marco', role: 'floor technician', channel: 'radio' },
  jordan: { name: 'Jordan', role: 'incoming technician (next shift)', channel: 'chat' },
  priya: { name: 'Priya', role: 'fleet software engineer (on-call)', channel: 'chat', team: 'fleet software engineering' },
  lee: { name: 'Lee', role: 'network engineer', channel: 'chat', team: 'network team' },
  sam: { name: 'Sam', role: 'inventory/WMS engineer', channel: 'chat', team: 'inventory/WMS team' },
  kai: { name: 'Kai', role: 'robot maintenance lead', channel: 'chat', team: 'robot maintenance' },
  avery: { name: 'Avery', role: 'operations manager', channel: 'chat' },
  morgan: { name: 'Morgan', role: 'interviewer (mock interview)', channel: 'room' },
  you: { name: 'You', role: 'support technician (learner)', channel: '' },
};
export const TEAM_PERSON = { 'fleet software engineering': 'priya', 'network team': 'lee', 'inventory/WMS team': 'sam', 'robot maintenance': 'kai', 'station technician': 'marco', facilities: 'marco' };
const T = (sim, t) => sim.clockStr(t).slice(0, 5);

// ---------------------------------------------------------------- observable facts
export function strugglingRobots(sim, win = 900) {
  const c = {};
  for (const e of sim.s.winEv) if ((e.type === 'task_failed' || e.type === 'task_aborted') && e.t > sim.s.t - win) c[e.robot] = (c[e.robot] || 0) + 2;
  for (const e of sim.s.logs) if (e.t > sim.s.t - win && e.robot && ['COMMS_LOSS_SAFE_STOP', 'OBSTACLE_DETECTED', 'LOC_CONFIDENCE_LOW', 'WHEEL_FEEDBACK_FAULT'].includes(e.code)) c[e.robot] = (c[e.robot] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
function oldestOrder(sim) { const tk = sim.openTasks().sort((a, b) => a.createdAt - b.createdAt)[0]; return tk ? { id: tk.orderId, age: sim.s.t - tk.createdAt, task: tk } : null; }
function onset(sim, att) { const f = Object.values(sim.s.faults).filter((x) => x.injectedAt != null && !x.ap?.startsWith?.('AP-1')); const t = f.length ? Math.min(...f.map((x) => x.injectedAt)) : att.reportedAt - 600; return t; }

// ---------------------------------------------------------------- question bank (focused vs not); answers become evidence
export const QUESTIONS = {
  'dana.ids': { to: 'dana', cat: 'equipment IDs', focused: true, q: 'Which robot IDs and which order are you seeing problems with?', answer(sim) { const r = strugglingRobots(sim).slice(0, 3); const o = oldestOrder(sim); return `${r.length ? `The ones I keep seeing are ${r.join(', ')}.` : 'I can’t pick out specific robots.'} ${o ? `Oldest order on my screen is ${o.id}, about ${Math.round(o.age / 60)} minutes old.` : ''}`; }, fact: true },
  'dana.onset': { to: 'dana', cat: 'onset', focused: true, q: 'When did you first notice it?', answer(sim, att) { return `I noticed it around ${T(sim, onset(sim, att) + 150)}. Could have started a bit earlier.`; }, fact: true },
  'dana.scope': { to: 'dana', cat: 'scope', focused: true, q: 'Which robots or areas are affected — one place or everywhere?', answer(sim) { const waiting = Object.values(sim.s.stations).filter((st) => sim.s.robots.filter((r) => r.state === 'waiting_station' && sim.s.tasks[r.taskId]?.station === st.id && sim.s.t - r.waitSince > 60).length >= 2).map((st) => st.id); const stopped = sim.s.robots.filter((r) => ['stopped', 'nolink', 'estop'].includes(robotVisual(sim, r).key)); const idle = sim.s.robots.filter((r) => r.state === 'idle').length; const zones = [...new Set(stopped.map((r) => aisleAt(r.x) ? `Aisle ${aisleAt(r.x)}` : `zone ${zoneOf(r.x, r.z)}`))]; return `${waiting.length ? `Robots are lining up at ${waiting.join(', ')}. ` : ''}${stopped.length ? `${stopped.map((r) => r.id).join(', ')} show stopped or no-link${zones.length ? ` around ${zones.join(', ')}` : ''}. ` : ''}${idle >= 4 ? `${idle} robots are just sitting idle. ` : ''}${!waiting.length && !stopped.length && idle < 4 ? 'Hard to say — things just feel slow everywhere.' : ''}`.trim(); }, fact: true },
  'dana.impact': { to: 'dana', cat: 'operational impact', focused: true, q: 'How many orders are late, and is a cutoff at risk?', answer(sim) { const late = sim.openTasks().filter((t) => sim.s.t - t.createdAt > 300).length; const o = oldestOrder(sim); return `About ${late} task(s) are more than 5 minutes old${o ? `; the oldest (${o.id}) is ${Math.round(o.age / 60)} min` : ''}. Next truck cutoff is at the top of the half hour.`; }, fact: true, onScreen: ['queue_metrics', 'observe:dash'] },
  'dana.see': { to: 'dana', cat: 'scope', focused: true, q: 'What do the affected robots show on their status lights/screens?', answer(sim) { const list = sim.s.robots.map((r) => [r.id, robotVisual(sim, r)]).filter(([, v]) => !['working', 'idle', 'charging'].includes(v.key)); return list.length ? list.map(([id, v]) => `${id}: ${v.label}`).join(', ') + '.' : 'Nothing unusual on the lights — they look normal or idle.'; }, fact: true },
  'dana.changes': { to: 'dana', cat: 'recent changes', focused: true, q: 'Any recent changes on the floor — maintenance, layout, cleaning, new equipment?', answer() { return 'The cleaning crew did Aisle D overnight. Nothing else I know of on the floor — I don’t see software changes; ask engineering.'; }, fact: true },
  'dana.people': { to: 'dana', cat: 'safety', focused: true, q: 'Is anyone inside the robot area right now?', answer(sim) { const e = sim.s.faults.estop; return e ? `One of the cleaners might still be near Aisle D — that’s where ${e.robot} stopped. I haven’t been able to reach them.` : 'Not that I know of — everyone is on the walkways.'; }, fact: true },
  'avery.decision': { to: 'avery', cat: 'operational impact', focused: true, q: 'Avery, what decisions are pending on your side?', answer() { return 'I need to decide by 07:25 whether to hold the 07:30 wave or call overtime. I need facts and your next update time, not a guess.'; }, fact: true },
  'priya.changes': { to: 'priya', cat: 'recent changes', focused: true, q: 'Any software releases or configuration changes in the last few hours?', answer(sim) { const rel = sim.s.releases.filter((x) => x.t > sim.s.t - 6 * 3600); return rel.length ? `From the change log: ${rel.map((x) => `${x.id} ${x.service} ${x.from}→${x.to} at ${T(sim, x.t)}`).join('; ')}. Correlation isn’t proof — check whether timing and symptoms line up.` : 'Nothing in the last 6 hours.'; }, fact: true, onScreen: ['release_diff'] },
  'lee.ap': { to: 'lee', cat: 'scope', focused: true, q: 'Lee, can you check access-point health?', answer(sim, att, sc) { if (sc?.id === 'CX-J') return 'Sorry — I’m in a change window until 13:00. Use the AP dashboard; escalate only if it is clearly network.'; const aps = Object.values(sim.s.aps).filter((a) => a.retries > 10 || a.status !== 'up'); return aps.length ? `Retry rates are high on ${aps.map((a) => `${a.id} (zone ${a.zone}, ${a.retries}%)`).join(', ')}. Others normal. AP-1 channel utilization is high but that alone doesn’t drop clients.` : 'All APs look normal from here: low retries everywhere. AP-1 channel utilization is high, but that alone doesn’t drop clients.'; }, fact: true, onScreen: ['network_zone'] },
  'sam.loc': { to: 'sam', cat: 'equipment IDs', focused: true, q: 'Sam, are there pick failures concentrated at any location?', answer(sim) { const f = {}; for (const e of sim.s.winEv) if (e.type === 'task_failed' && e.t > sim.s.t - 1800) f[e.loc] = (f[e.loc] || 0) + 1; const top = Object.entries(f).sort((a, b) => b[1] - a[1]); return top.length ? `ITEM_NOT_FOUND counts (30 min): ${top.map(([l, n]) => `${l}×${n}`).join(', ')}. System quantity at ${top[0][0]} is ${sim.s.inventory[top[0][0]].sys}.` : 'No pick failures by location in the last 30 minutes.'; }, fact: true, onScreen: ['inventory_record'] },
  'kai.history': { to: 'kai', cat: 'recent changes', focused: true, q: 'Kai, what was done the last two times R-04 didn’t charge?', answer() { return 'TKT-1187: someone reseated it at the dock and it charged. TKT-1203: moved to another dock and it charged. Nobody recorded which dock, or measured anything. That’s why it keeps coming back.'; }, fact: true },
  'marco.walk': { to: 'marco', cat: 'physical check', focused: true, q: 'Marco, can you walk the aisle and tell me what you see? (from the walkway, no entry)', param: 'aisle', delay: 60, answer(sim, att, sc, p) { const a = p?.aisle || 'C'; const ob = sim.s.faults.obstruction; const md = sim.s.faults.markerDamage; return `From the walkway end of Aisle ${a}: ${ob && ob.aisle === a ? 'there’s a fallen tote lying across the aisle about two-thirds of the way in.' : 'nothing on the floor that I can see.'}${md && md.aisle === a ? ' Some of the floor markers in the middle look scuffed or missing.' : ''} I did not enter the aisle.`; }, fact: true, outcome: (sim, p) => (sim.s.faults.obstruction?.aisle === (p?.aisle || 'C') ? 'object' : 'clear'), source: 'ask:walk' },
  'marco.hmi': { to: 'marco', cat: 'physical check', focused: true, q: 'Marco, can you read the station HMI for me?', param: 'station', delay: 45, answer(sim, att, sc, p) { const id = p?.station || Object.values(sim.s.stations).find((s) => !s.ready)?.id || 'P-1'; const st = sim.s.stations[id]; return `${id} HMI says ${st.hmi}; scanner ${st.scanner}.`; }, fact: true, outcome: (sim, p) => { const id = p?.station || Object.values(sim.s.stations).find((s) => !s.ready)?.id || 'P-1'; return sim.s.stations[id].hmi === 'READY' ? 'hmi_ready' : 'scanner_fault'; }, source: 'station_local' },
  'marco.charger': { to: 'marco', cat: 'physical check', focused: true, q: 'Marco, can you look at the charger display where R-04 is docked?', delay: 45, answer(sim) { const r = sim.robot('R-04'); const ch = r.charger ? sim.s.chargers[r.charger] : null; return ch ? `${ch.id}: R-04 docked, display shows ${r.chargeA.toFixed(1)} A. ${ch.status === 'maintenance' ? 'It has a maintenance tag on it.' : ''} I can’t see the contacts without lifting the robot — that’s a maintenance job.` : 'R-04 isn’t docked right now.'; }, fact: true },
  'marco.estop': { to: 'marco', cat: 'safety', focused: true, q: 'Marco, can you check R-11 and the area around it from the walkway?', delay: 60, answer(sim) { const r = sim.robot('R-11'); return r.estop ? 'R-11’s E-stop button is pressed. I can see the aisle from the walkway — no one in it now. I have NOT reset it; that needs the shift lead per procedure.' : 'R-11 looks normal, no E-stop.'; }, fact: true },
  'marco.robot': { to: 'marco', cat: 'physical check', focused: true, q: 'Marco, what does R-05’s local screen show?', delay: 45, answer(sim) { const r = sim.robot('R-05'); const v = robotVisual(sim, r); return `R-05 local screen: ${v.label}${r.faultCodes.length ? `, fault ${r.faultCodes.join(', ')}` : ''}; uptime ${fmtDur(sim.s.t - r.bootAt)}.`; }, fact: true },
  'jordan.avail': { to: 'jordan', cat: 'scope', focused: true, q: 'Jordan, what will you be able to work on first when you arrive?', answer() { return 'I’ll have the floor radio and the dashboards. I can chase pending requests if you tell me who has them.'; }, fact: true },
  'x.restart': { to: 'dana', cat: 'unfocused', focused: false, q: 'Have you tried restarting everything?', answer() { return 'Uh — I’m not allowed to restart anything, and I don’t think we should without knowing why.'; } },
  'x.bad': { to: 'dana', cat: 'unfocused', focused: false, q: 'Is it really that bad?', answer() { return 'Yes. We’re falling behind.'; } },
};

/** Ask a question; returns {text, repeated, onScreen, evidence?} */
export function askQuestion(qid, sim, att, sc, param) {
  const q = QUESTIONS[qid];
  const repeated = att.asked.some((a) => a.qid === qid && (a.param || '') === (param || ''));
  const onScreen = (q.onScreen || []).some((src) => att.evidence.some((e) => e.source === src || e.source.startsWith(src)));
  let text = q.answer(sim, att, sc, param ? { [q.param]: param } : null);
  if (repeated) text += ' (You asked me that already.)';
  else if (onScreen) text = `That’s on your screen already — ${text}`;
  return { text, repeated, onScreen, outcome: q.outcome ? q.outcome(sim, param ? { [q.param]: param } : null) : null, source: q.source || `ask:${qid}` };
}

// ---------------------------------------------------------------- responses to learner messages
export function respondOps(kind, text, ctx) {
  const l = lc(text); const out = [];
  if (claimsRestored(text) && ctx.recovered === false) out.push('I’m still seeing problems out here — are you sure it’s fixed?');
  if (ETA_RE.test(text) && !ctx.causeKnown) out.push('OK — I’ll tell the floor and the manager it’ll be fixed by then.');
  else if (!/(\d{1,2}:\d{2}|in \d+ ?min)/.test(l) && kind !== 'resolved') out.push('When will I hear from you next?');
  if (!/\d/.test(text.replace(/\d{1,2}:\d{2}/g, '')) && ['ops', 'ops3', 'ack'].includes(kind)) out.push('How many orders are we talking about?');
  if (/[A-Z]{3,}_[A-Z_]{3,}/.test(text)) out.push('What does that code mean for my orders?');
  if (!out.length) out.push(kind === 'ack' ? 'Thanks — talk soon.' : 'Clear, thanks. I’ll pass that on.');
  return out.join(' ');
}
export function respondEscalation(f, ctx) {
  const person = TEAM_PERSON[f.team] || 'priya';
  const r = checkEscalation(f, ctx);
  const cites = [...new Set([...(f.cites || []), ...citations(`${f.request} ${f.summary} ${f.repro} ${f.ruledOut}`)])];
  const ev = ctx.evidence.filter((e) => cites.includes(e.id));
  const claims = claimsIn(`${f.summary} ${f.request}`, ctx.hypIds);
  const contra = claims.flatMap((c) => contradictions(c.hyp, ev).map((e) => ({ c, e })));
  let text; let useful = false;
  if (f.team !== ctx.truthTeam) text = ev.length ? `I looked at what you attached and nothing there points at ${f.team}. ${contra.length ? `Also, your ${contra[0].e.id} (“${contra[0].e.summary.slice(0, 80)}”) contradicts what you suggest. ` : ''}Who owns the part of the system your evidence points to?` : `This doesn’t give me anything that points at ${f.team}. What did you observe, and why do you think it’s ours?`;
  else if (!cites.length) text = 'I can’t act on this without evidence. Attach the specific results — timestamps, robot/task IDs — and tell me what you already ruled out.';
  else if (contra.length) text = `Your ${contra[0].e.id} says “${contra[0].e.summary.slice(0, 90)}”, which contradicts your suggestion (${contra[0].c.hyp}). Can you reconcile that before I start?`;
  else if (!r.items.find((i) => i.label.startsWith('Specific request')).ok) text = 'Thanks for the evidence. What exactly do you need me to do?';
  else if (!cites.some((c) => ctx.discriminatingIds.includes(c))) text = 'This is helpful, but it doesn’t separate the candidate causes yet. Which result tells them apart? Attach that and I can act.';
  else { useful = true; text = `Thanks — that’s actionable. ${ctx.approveText || 'I’ll take it from here and confirm when done.'}`; }
  return { person, text, useful, checklist: r, pct: scoreOf(r).pct };
}
export function respondHandoff(f, ctx) {
  const r = checkHandoff(f, ctx); const qs = [];
  const all = lc(Object.values(f).join(' '));
  if (!ctx.statusHonest) qs.push(`I just looked at the board: ${ctx.failing.join('; ')}. Your handoff says it’s resolved — is it?`);
  for (const it of (ctx.activeItems || [])) if (!it.kw.some((k) => all.includes(lc(k)))) qs.push(`What about ${it.label}?`);
  if (!/(jordan|you own|owner|incoming|ownership)/.test(all)) qs.push('Am I the owner of this from 07:00, or are you staying on it?');
  if (!(f.next || '').trim() || !/(\d{1,2}:\d{2}|at |by |within|after|every)/.test(lc(f.next))) qs.push('What should I do first, and by when?');
  if (ctx.hasPending && !/(pending|requested|waiting|awaiting|asked)/.test(lc(f.pending || ''))) qs.push('Is anything pending with another team? Who do I chase?');
  if (!/(verify|check|confirm|watch|observe)/.test(lc((f.verify || '') + (f.next || '')))) qs.push('How will I know it’s actually recovered?');
  const accepted = qs.length === 0 && scoreOf(r).pct >= 0.75;
  return { accepted, questions: qs.slice(0, 3), text: accepted ? `Accepted — I own ${ctx.incidentId} from now. I’ll start with: ${(f.next || '').split(/[.\n]/)[0]}.` : qs.slice(0, 3).join(' '), checklist: r };
}
export function respondInstruction(f, ctx) {
  const r = checkInstruction(f, ctx); const missing = r.items.filter((i) => !i.ok).map((i) => i.label);
  const who = PEOPLE[f.to]?.name || 'Marco';
  if (r.critical.length) return { text: `${who}: I won’t do that — it isn’t safe. Please give me an instruction that follows the site procedure.`, readBack: false, willConfirm: false, checklist: r };
  const asks = [];
  if (missing.includes('Equipment identifier in the message')) asks.push('Which one exactly?');
  if (missing.includes('Timing')) asks.push('Now, or after my current job?');
  const readBack = r.items.find((i) => i.label.startsWith('Asks for acknowledgment')).ok;
  const willConfirm = r.items.find((i) => i.label.startsWith('Asks for completion')).ok;
  return { text: asks.length ? `${who}: ${asks.join(' ')}` : readBack ? `${who}: Copy — ${f.action} on ${f.equipment}, ${/(now|immediately|asap)/i.test(f.text) ? 'now' : 'as you said'}.${willConfirm ? ' I’ll call you when it’s done.' : ''}` : `${who}: OK.`, readBack, willConfirm, needsMore: asks.length > 0, checklist: r };
}
export function respondMgmt(text, ctx) {
  const r = checkMgmt(text, ctx); const miss = r.items.filter((i) => !i.ok).map((i) => i.label);
  if (r.items.find((i) => i.unsupported)) return 'You’re giving me a time but you said the cause isn’t known. If I plan around it and it’s wrong, we miss the truck. What are my options?';
  if (miss.includes('Decision needed (or none needed)')) return 'Thanks. Do you need a decision from me?';
  if (miss.includes('Risk')) return 'What’s the risk to the cutoff if this continues?';
  if (miss.includes('Scope with numbers')) return 'How many orders and robots are affected?';
  return 'Understood. I’ll make the call and wait for your next update.';
}
export function respondDisagreement(text, ctx) {
  const l = lc(text);
  const test = (ctx.discKw || []).some((k) => l.includes(k));
  return { dana: /(robot)/.test(l) ? (test ? 'Fair — if the test shows it’s only R-08, you pull it. Deal.' : 'So are we pulling R-08 or not?') : 'You haven’t said anything about what we see on the floor.', priya: /(service|fleet-manager|software|engineering)/.test(l) ? (test ? 'Agreed, that test would settle it. Share the result with me.' : 'What would convince you either way?') : 'You haven’t addressed the service-side evidence.' };
}
export { DIAGNOSTICS };
