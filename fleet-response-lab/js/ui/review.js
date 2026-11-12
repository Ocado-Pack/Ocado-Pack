// Mistake-driven spaced review (Leitner boxes). Items are generated from templates + your incident data; no AI.
import { esc } from '../util.js';
import { store, dueReviews, answerReview, SKILLS } from '../store.js';
import { queueDocReview } from '../review-templates.js';
import { SIM_NOTE } from './common.js';

export function render(root) {
  let mode = 'due'; let idx = 0; let answered = null; let pinned = null;
  function list() { return mode === 'due' ? dueReviews() : store.get().review.slice().sort((a, b) => a.box - b.box); }
  function draw() {
    const L = list(); const all = store.get().review;
    const it = pinned || L[idx];
    root.innerHTML = `<div class="card"><span class="eyebrow">Spaced review ${SIM_NOTE}</span><h2>Review queue</h2>
      <p>Built from your incorrect predictions, weak hypotheses, misread telemetry, missed verification steps and documentation issues. Correct answers move an item to a longer interval (1, 3, 7, 14 days); a miss brings it back soon. There is no penalty for reviewing — this is practice.</p>
      <p class="small">${all.length} item(s) total · ${dueReviews().length} due now · by skill: ${Object.entries(SKILLS).map(([k, l]) => { const n = all.filter((r) => r.skill === k).length; return n ? `${l} ${n}` : ''; }).filter(Boolean).join(' · ') || '—'}</p>
      <div class="btnrow"><button class="btn small ${mode === 'due' ? 'primary' : ''}" data-mode="due">Due now</button><button class="btn small ${mode === 'all' ? 'primary' : ''}" data-mode="all">Practice all</button><button class="btn small" data-seed>Add a documentation/communication practice item</button></div></div>
      ${it ? `<div class="card"><span class="eyebrow">${esc(it.kind)} · ${esc(SKILLS[it.skill] || it.skill)} · box ${it.box + 1}/5 · from ${esc(it.source || '')}</span>
        <p><b>${esc(it.prompt)}</b></p>
        <div>${it.options.map((o, i) => `<button class="btn" style="display:block;width:100%;text-align:left;margin:4px 0" data-ans="${i}" ${answered != null ? 'disabled' : ''}>${answered != null ? (i === it.answer ? '✓ ' : answered === i ? '✕ ' : '') : ''}${esc(o)}</button>`).join('')}</div>
        ${answered != null ? `<div class="lesson"><p>${answered === it.answer ? '✓ Correct.' : '✕ Not quite.'} ${esc(it.explain || '')}</p></div><button class="btn primary" data-next>Next</button>` : ''}
        <p class="muted small">${idx + 1} of ${L.length}</p></div>` : `<div class="card"><p>${mode === 'due' ? 'Nothing due. Complete an incident or practice all items.' : 'No items yet — they appear after you make (normal, useful) mistakes in incidents.'}</p></div>`}`;
  }
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) { mode = b.dataset.mode; idx = 0; answered = null; pinned = null; draw(); return; }
    if (b.dataset.seed !== undefined) { queueDocReview(Math.random() < 0.5 ? 'documentation' : 'communication'); draw(); return; }
    if (b.dataset.ans) { const it = pinned || list()[idx]; answered = +b.dataset.ans; pinned = it; answerReview(it.id, answered === it.answer); draw(); return; }
    if (b.dataset.next !== undefined) { answered = null; pinned = null; if (mode === 'all') idx = (idx + 1) % Math.max(1, list().length); else idx = 0; draw(); }
  };
  draw();
  return {};
}
