// Interview practice: turn ACTUAL simulation work into an honest explanation.
// Never invents employment history, certifications, tools used or proprietary experience.
import { esc } from '../util.js';
import { store } from '../store.js';
import { interviewChecks } from '../docs-rules.js';
import { toast, SIM_NOTE } from './common.js';

export const QUESTIONS = [
  ['observed', 'What did you observe?'],
  ['suspected', 'What did you suspect, and why?'],
  ['test', 'Which test helped most, and why?'],
  ['mitigation', 'Why did you choose that mitigation?'],
  ['verify', 'How did you verify recovery?'],
  ['escalate', 'What would you escalate, to whom, with what evidence?'],
];
export const FOLLOWUPS = ['What evidence would have changed your conclusion?', 'How would another technician reproduce your investigation?', 'What would you improve next time?', 'What would you verify first in a real employer\'s system?'];

export function honestDraft(sum, title) {
  if (!sum) return '';
  const p = [];
  p.push(`In a simulated training environment (Robotics Fleet Response Lab — a fictional fulfillment facility; this is practice, not professional experience), I worked an incident: "${title}".`);
  if (sum.observed?.length) p.push(`I started by observing: ${sum.observed.join('; ')}.`);
  if (sum.suspected?.length) p.push(`My initial hypotheses were: ${sum.suspected.filter(Boolean).join(', ')}.`);
  if (sum.tests?.length) p.push(`I ran read-only checks and tests, predicting each result first, including: ${sum.tests.slice(0, 3).join(' | ')}.`);
  p.push(sum.diagnosis ? `Based on that evidence I concluded the most likely cause was: ${sum.diagnosis}.` : 'I did not reach a confirmed cause, and I said so.');
  if (sum.actions?.length) p.push(`Actions taken (simulated): ${sum.actions.join('; ')}.`);
  if (sum.checks?.length) p.push(`I verified recovery with: ${sum.checks.join('; ')}.`);
  if (sum.escalation) p.push(`I escalated to ${sum.escalation.team}: "${sum.escalation.text}".`);
  p.push('In your system I would first verify how robot, task and network telemetry are actually exposed, what the approved procedures and escalation paths are, and which actions require authorization.');
  return p.join(' ');
}

export function interviewBlock(a, sc) {
  const sum = store.get().attempts.find((x) => x.id === a.id)?.summary;
  return `<div class="card interview"><h3>Interview practice ${SIM_NOTE}</h3>
    <p>Answer in your own words, from what you actually did. Practice saying it aloud without reading. If you lack real experience, say: <i>“I have practiced this in a simulated environment. Here is my approach, and here is what I would verify in your system.”</i></p>
    ${QUESTIONS.map(([k, q]) => `<label>${esc(q)}<textarea rows="2" data-iq="${k}" data-att="${a.id}">${esc(a.interview?.[k] || '')}</textarea></label>`).join('')}
    <div class="btnrow"><button class="btn" data-iqcheck="${a.id}">Check my answers for honesty & structure</button><button class="btn" data-iqdraft="${a.id}">Show an honest draft built from this attempt</button></div>
    <div data-iqout="${a.id}"></div>
    <details><summary>Draft (built only from your attempt data)</summary><p class="draft">${esc(honestDraft(sum, sc.title))}</p></details>
  </div>`;
}

// global handlers for interview blocks (used inside investigation review and the interview page)
document.addEventListener('input', (e) => {
  const t = e.target; if (!t.dataset?.iq) return;
  const st = store.get();
  const cur = st.current?.attempt?.id === t.dataset.att ? st.current.attempt : null;
  if (cur) { cur.interview = cur.interview || {}; cur.interview[t.dataset.iq] = t.value; }
  let rec = st.interview.find((x) => x.attemptId === t.dataset.att);
  if (!rec) { rec = { attemptId: t.dataset.att, answers: {} }; st.interview.push(rec); }
  rec.answers[t.dataset.iq] = t.value; rec.at = Date.now();
  clearTimeout(window.__iqT); window.__iqT = setTimeout(() => store.update(() => {}), 500);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-iqcheck],[data-iqdraft]'); if (!b) return;
  const id = b.dataset.iqcheck || b.dataset.iqdraft;
  const out = document.querySelector(`[data-iqout="${id}"]`);
  if (b.dataset.iqdraft) { const det = b.closest('.interview').querySelector('details'); det.open = true; return; }
  const answers = [...document.querySelectorAll(`[data-att="${id}"]`)].map((x) => x.value).join('\n');
  out.innerHTML = interviewFeedback(answers);
});

export function interviewFeedback(text) {
  const { flags, okSim } = interviewChecks(text);
  const lo = text.toLowerCase();
  const items = [
    [okSim, 'Labels the work as simulation/training practice'],
    [/(observ|saw|noticed|status|label)/.test(lo), 'Describes what was observed'],
    [/(hypothes|suspect|could be|candidate)/.test(lo), 'Names hypotheses (more than one is better)'],
    [/(test|compare|sandbox|check)/.test(lo), 'Explains the discriminating test'],
    [/(verif|confirm|complete.*task|observ.*min|alarm)/.test(lo), 'Explains how recovery was verified'],
    [/(escalat|engineer|team|evidence)/.test(lo), 'Says what to escalate and with what evidence'],
    [/(would verify|in your system|i would check|confirm with)/.test(lo), 'Says what you would verify in a real system'],
  ];
  return `<div class="docres">${flags.map((f) => `<p class="bad">⚠ ${esc(f)}</p>`).join('')}${items.map(([ok, l]) => `<p class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '○'} ${esc(l)}</p>`).join('')}<p class="muted small">Checklist only — it cannot judge whether your reasoning is right. Not scored on accent, personality, length or jargon.</p></div>`;
}

export function renderInterview(root) {
  const st = store.get();
  const atts = st.attempts.slice().reverse();
  root.innerHTML = `<div class="card"><h2>Interview practice</h2>
    <p>Two kinds of answers — keep them separate:</p>
    <ol><li><b>Real experience you supply</b> (your own words below). This app never writes this for you.</li><li><b>Simulation practice</b>, clearly identified as training.</li></ol>
    <label>Your real, relevant experience (optional, your own words — e.g. troubleshooting, support, documentation you have actually done)<textarea id="realExp" rows="4">${esc(st.realExperience || '')}</textarea></label>
    <p class="muted small">Stored only in this browser. Never merged into simulation drafts.</p></div>
    <div class="card"><h3>Practice from a completed attempt</h3>
    ${atts.length ? `<label>Attempt <select id="attSel">${atts.map((x) => `<option value="${x.id}">${esc(x.title)} — ${new Date(x.ended).toLocaleString()} — ${x.total}/100</option>`).join('')}</select></label><div id="attQ"></div>` : '<p>Complete a walkthrough incident first; your interview practice will be built from what you actually did.</p>'}
    </div>
    <div class="card"><h3>Say it without a script</h3><p>Press start, hide the draft, and answer aloud (or type) from memory in under 2 minutes. Then compare against the checklist.</p>
    <div class="btnrow"><button class="btn" id="noScript">Start 2-minute answer</button></div><div id="nsArea"></div>
    <h4>Follow-up questions interviewers ask</h4><ul>${FOLLOWUPS.map((q) => `<li>${esc(q)}</li>`).join('')}<li>Why did you choose that test? · Why did you escalate at that point? · How did you know recovery was complete?</li></ul></div>`;
  root.querySelector('#realExp').oninput = (e) => { st.realExperience = e.target.value; clearTimeout(window.__reT); window.__reT = setTimeout(() => store.update(() => {}), 400); };
  const sel = root.querySelector('#attSel');
  const drawQ = () => {
    const att = st.attempts.find((x) => x.id === sel.value); const rec = st.interview.find((x) => x.attemptId === sel.value) || { answers: {} };
    root.querySelector('#attQ').innerHTML = `${QUESTIONS.map(([k, q]) => `<label>${esc(q)}<textarea rows="2" data-iq="${k}" data-att="${att.id}">${esc(rec.answers[k] || '')}</textarea></label>`).join('')}<div class="btnrow"><button class="btn" data-iqcheck="${att.id}">Check honesty & structure</button></div><div data-iqout="${att.id}"></div><details class="interview"><summary>Honest draft from this attempt's data</summary><p class="draft">${esc(honestDraft(att.summary, att.title))}</p></details>`;
  };
  if (sel) { sel.onchange = drawQ; drawQ(); }
  root.querySelector('#noScript').onclick = () => {
    const area = root.querySelector('#nsArea'); let left = 120;
    area.innerHTML = `<p class="big">⏱ <span id="nsT">2:00</span></p><textarea id="nsText" rows="6" placeholder="Answer here from memory (or speak aloud and type key points)…"></textarea><button class="btn" id="nsDone">Done</button><div id="nsOut"></div>`;
    document.querySelectorAll('.interview details').forEach((d) => { d.open = false; });
    const iv = setInterval(() => { left--; const t = root.querySelector('#nsT'); if (!t) return clearInterval(iv); t.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (left <= 0) { clearInterval(iv); toast('Time — wrap up your answer.'); } }, 1000);
    root.querySelector('#nsDone').onclick = () => { clearInterval(iv); root.querySelector('#nsOut').innerHTML = interviewFeedback(root.querySelector('#nsText').value); };
  };
}
