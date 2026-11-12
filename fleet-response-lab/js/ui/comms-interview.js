// Stage 4 — mock interview room (SIMULATED interviewer "Morgan"). Questions come from YOUR attempt record.
// Two answer types are kept separate: real experience you supply, and clearly identified simulation practice.
import { esc, uid } from '../util.js';
import { HYP_LABELS } from '../comms/scenarios.js';
import { interviewChecks } from '../docs-rules.js';
import { cs, saveComms } from '../comms/state.js';
import { toast, caption, SIM_NOTE } from './common.js';

export const HONEST_PHRASE = 'I have practiced this in a simulated environment. Here is my approach, and here is what I would verify in your system.';
const words = (t) => new Set(String(t || '').toLowerCase().match(/[a-z0-9-]{3,}/g) || []);
export function similarity(a, b) { const A = words(a), B = words(b); if (!A.size || !B.size) return 0; let i = 0; for (const w of A) if (B.has(w)) i++; return i / Math.min(A.size, B.size); }

export function questionsFor(a) {
  const m = a.first?.metrics || {}; const art = a.artifacts || {};
  const q = [
    ['test', 'Why did you choose the test that mattered most in that incident?'],
    ['change', `What evidence would have changed your conclusion${art.variantRevealed ? '' : ''}?`],
    ['escalate', m.usefulEscalation === 'not needed' ? 'Nothing needed escalation — how did you decide that, and what would have made you escalate?' : m.usefulEscalation == null ? 'You did not get an actionable escalation in. What would you send now, to whom, with what evidence?' : 'Why did you escalate at that point, and why to that team?'],
    ['recovery', m.verification ? `How did you know recovery was complete? (Your record shows ${m.verification.passed}/${m.verification.required} checks passing.)` : 'How did you know recovery was complete?'],
    ['repro', 'How would another technician reproduce your investigation?'],
    ['improve', 'What would you improve next time?'],
  ];
  if ((m.unsupportedClaims || 0) > 0) q.push(['claims', 'One of your messages stated something the evidence didn’t support. How would you phrase it now?']);
  if ((m.handoffQuestions || 0) > 1) q.push(['handoff', 'The incoming technician had to ask several questions. What was missing from your handoff?']);
  if (a.first?.critical?.length) q.push(['critical', `Your first attempt had a critical issue (${a.first.critical.map((c) => c.code.replace(/_/g, ' ')).join(', ')}). What did you change?`]);
  return q;
}
function checklist(text, type) {
  const l = text.toLowerCase(); const { flags, okSim } = interviewChecks(text);
  const items = [
    [type === 'real' || okSim, type === 'real' ? 'Marked as your real experience' : 'Identifies this as simulation practice'],
    [/(evidence|log|metric|result|showed|compared|grouped|check)/.test(l), 'Refers to specific evidence'],
    [/(because|so that|to tell|separate|distinguish|rule out|ruled out)/.test(l), 'Explains the reasoning (why)'],
    [/(verify|verified|confirm|observ|check|passed)/.test(l), 'Mentions verification'],
    [/(uncertain|not sure|unknown|would need|depends|would verify|in your system)/.test(l), 'Acknowledges uncertainty / what to verify'],
  ];
  return { items, flags };
}

export function render(root, ctx) {
  const c = cs();
  const atts = c.attempts.filter((a) => a.first).slice().reverse();
  let sel = atts.find((a) => a.mode === 'assessment')?.id || atts[0]?.id; let qi = 0; let timed = true; let timer = null; let left = 90;
  const sess = { id: uid('iv'), attemptId: sel, started: Date.now(), answers: [] };
  ctx.scene?.focus({ type: 'control', id: 'control-room' });
  function draw() {
    const a = atts.find((x) => x.id === sel);
    if (!a) { root.innerHTML = `<div class="card"><span class="eyebrow">Interview room ${SIM_NOTE}</span><h2>Mock interview</h2><p>Submit at least one communication incident first — the interviewer asks about what you actually did.</p><a class="btn" href="#/comms">Back to module</a></div>`; return; }
    const qs = questionsFor(a); const q = qs[qi];
    const prior = [a.artifacts?.reflection, a.artifacts?.opsUpdate, a.artifacts?.escalation?.request].filter(Boolean).join(' ');
    root.innerHTML = `<div class="card"><span class="eyebrow">Interview room · interviewer Morgan (fictional) ${SIM_NOTE}</span><h2>Explain and defend your decisions</h2>
      <p class="small">Attempt: <select id="ivA">${atts.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.letter)} ${esc(x.title)} — ${x.mode === 'assessment' ? 'independent' : x.mode} ${x.first.total}/100</option>`).join('')}</select></p>
      <div class="lesson small"><b>Two answer types — never mixed:</b> (1) <b>Real experience</b> you supply yourself, in your own words; (2) <b>Simulation practice</b>, explicitly labelled. This app never turns simulated work into professional experience. If you have no real example, say: “${esc(HONEST_PHRASE)}”</div>
      <label class="chip"><input type="checkbox" id="ivT" ${timed ? 'checked' : ''}> No-script mode: 90 s per answer, your notes and drafts hidden</label>
      ${timed ? '' : `<details><summary class="small">Your own record for this attempt</summary><p class="small">${esc(prior || 'No notes stored.')}</p></details>`}
      <div class="msg"><div class="who">Morgan · question ${qi + 1}/${qs.length}</div>${esc(q[1])}</div>
      <div class="btnrow"><label class="chip"><input type="radio" name="ivType" value="sim" checked> Simulation practice</label><label class="chip"><input type="radio" name="ivType" value="real"> My real experience</label><button class="btn small" data-phrase>Insert honest framing</button>${(window.SpeechRecognition || window.webkitSpeechRecognition) ? '<button class="btn small" data-speak>🎙 Speak</button>' : ''}${timed ? `<span class="big" data-live="t">${left}s</span>` : ''}</div>
      <textarea id="ivAns" rows="5" placeholder="Answer in your own words."></textarea>
      <div class="btnrow"><button class="btn primary" data-answer>Answer</button></div><div id="ivOut"></div>
      ${sess.answers.length ? `<h4>This session</h4>${sess.answers.map((x) => `<p class="small"><b>${esc(x.q)}</b> — ${x.type === 'real' ? 'real experience' : 'simulation practice'} · ${x.score}/5${x.script ? ' · ⚠ reads like a script' : ''}${x.flags.length ? ' · ⚠ honesty flag' : ''}</p>`).join('')}` : ''}
      <p class="small muted">Checklist only (evidence, reasoning, verification, uncertainty, honest labelling). Not scored on accent, personality, length or jargon. It cannot judge whether your reasoning is correct.</p></div>`;
    if (timed) startTimer();
  }
  function startTimer() { clearInterval(timer); left = 90; timer = setInterval(() => { left--; const el = root.querySelector('[data-live="t"]'); if (!el) { clearInterval(timer); return; } el.textContent = `${left}s`; if (left <= 0) { clearInterval(timer); toast('Time — finish your sentence and answer.'); } }, 1000); }
  let pasted = false;
  root.onpaste = (e) => { if (e.target.id === 'ivAns') pasted = true; };
  root.onchange = (e) => { if (e.target.id === 'ivA') { sel = e.target.value; qi = 0; sess.attemptId = sel; draw(); } if (e.target.id === 'ivT') { timed = e.target.checked; draw(); } };
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.phrase !== undefined) { const ta = root.querySelector('#ivAns'); ta.value = (HONEST_PHRASE + ' ' + ta.value).trim(); return; }
    if (b.dataset.speak !== undefined) { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const r = new SR(); r.lang = 'en-US'; r.onresult = (ev) => { const ta = root.querySelector('#ivAns'); ta.value = (ta.value + ' ' + [...ev.results].map((x) => x[0].transcript).join(' ')).trim(); }; r.start(); toast('Listening…'); return; }
    if (b.dataset.answer !== undefined) {
      const a = atts.find((x) => x.id === sel); const qs = questionsFor(a); const text = root.querySelector('#ivAns').value.trim();
      if (text.split(/\s+/).length < 15) { toast('Give a fuller answer (≈ 15+ words).', 'warn'); return; }
      const type = root.querySelector('input[name="ivType"]:checked').value;
      const prior = [a.artifacts?.reflection, a.artifacts?.opsUpdate, a.artifacts?.escalation?.request].filter(Boolean).join(' ');
      const script = pasted || (timed && similarity(text, prior) > 0.7);
      const r = checklist(text, type);
      const flags = [...r.flags]; if (type === 'real' && /(simulat|this app|the lab|r-0\d|inc-\d)/i.test(text)) flags.push('This answer is marked “real experience” but describes the simulation. Mark it as simulation practice instead.');
      const score = r.items.filter((i) => i[0]).length;
      sess.answers.push({ q: qs[qi][1], type, text, score, script, flags, pasted });
      c.interviews = c.interviews.filter((x) => x.id !== sess.id); c.interviews.push({ ...sess, ended: Date.now() });
      if (sess.answers.length >= 4 && sess.answers.filter((x) => !x.flags.length).length >= 4 && sess.answers.reduce((s, x) => s + x.score, 0) / sess.answers.length >= 3) c.stage4Done = true;
      saveComms(); clearInterval(timer);
      const follow = score < 3 ? 'Follow-up: can you be more specific — which result, and what would it have looked like if you were wrong?' : r.items[1][0] ? 'Follow-up: and how would you verify that in a real system you haven’t used yet?' : 'Follow-up: what evidence supported that?';
      root.querySelector('#ivOut').innerHTML = `<div class="docres small">${flags.map((f) => `<p class="bad">⚠ ${esc(f)}</p>`).join('')}${script ? '<p class="bad">⚠ This looks pasted or nearly identical to your written notes. Practise saying it in fresh words.</p>' : ''}${r.items.map(([ok, l]) => `<p class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '○'} ${esc(l)}</p>`).join('')}<p><b>Morgan:</b> ${esc(follow)}</p><button class="btn small" data-nextq>${qi < qs.length - 1 ? 'Next question' : 'Finish'}</button></div>`;
      pasted = false; caption(`Morgan: ${follow}`);
      return;
    }
    if (b.dataset.nextq !== undefined) { const a = atts.find((x) => x.id === sel); if (qi < questionsFor(a).length - 1) { qi++; draw(); } else { root.querySelector('#ivOut').innerHTML = `<p class="ok">Session saved. ${c.stage4Done ? 'Stage 4 practice criterion met (≥ 4 honest answers averaging ≥ 3/5).' : 'Stage 4 needs ≥ 4 honest answers averaging ≥ 3/5.'}</p><a class="btn" href="#/portfolio">Portfolio</a>`; } }
  };
  draw();
  return { unmount() { clearInterval(timer); } };
}
void HYP_LABELS;
