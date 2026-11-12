// Progress, transparent scores, resets and exports. Stored only in this browser.
import { esc } from '../util.js';
import { store, skillSummary, SKILLS } from '../store.js';
import { toast, downloadText, modal, SIM_NOTE } from './common.js';

const WT = [['first', 'First guided incident'], ['W1', '1 · Hardware & fleet'], ['W2', '2 · Software'], ['W3', '3 · Observability'], ['W4', '4 · Documentation'], ['W5', '5 · Prioritization'], ['W6', '6 · Live ops'], ['EX', 'Reverse-building']];

export function render(root) {
  function draw() {
    const st = store.get(); const sk = skillSummary(); const atts = st.attempts.slice().reverse();
    root.innerHTML = `<div class="card"><span class="eyebrow">Progress ${SIM_NOTE}</span><h2>Your progress</h2>
      <p class="muted small">Scores are practice measures from this simulation, computed by transparent rules. They are not a certification and not evidence of job readiness on their own.</p>
      <h3>Skills (average of your last 5 scored activities)</h3>
      ${Object.entries(SKILLS).map(([k, l]) => { const s = sk[k]; return `<div class="cat"><div class="cat-h"><b>${esc(l)}</b><span>${s.avg == null ? 'not yet practiced' : `${s.avg}% · ${s.n} activit${s.n === 1 ? 'y' : 'ies'}`}</span></div><div class="bar"><i style="width:${s.avg || 0}%"></i></div></div>`; }).join('')}
      <h3>Walkthroughs</h3><div class="chips">${WT.map(([k, l]) => { const n = st.attempts.filter((a) => a.walkthrough === k).length; return `<span class="chip">${n ? '✓' : '○'} ${esc(l)} ${n ? `(${n})` : ''}</span>`; }).join('')}</div></div>
    <div class="card"><h3>Attempts & deductions</h3>${atts.length ? atts.map((a) => `<details class="lesson"><summary><b>${esc(a.title)}</b> — ${a.total}/100 · ${esc(a.mode || '')} · ${new Date(a.ended).toLocaleString()}${a.critical?.length ? ' · <span class="warn">needs remediation</span>' : ''}</summary>${(a.cats || []).map((c) => `<p class="small"><b>${esc(c.name)}</b> ${c.got}/${c.max}</p>${(c.notes || []).map((n) => `<p class="small ${n.pts < 0 ? 'ded' : 'ok'}">${n.pts < 0 ? `−${-n.pts}` : '✓'} ${esc(n.why)}</p>`).join('')}`).join('')}${a.hints && Object.keys(a.hints).length ? `<p class="small muted">Hints used: ${Object.entries(a.hints).map(([k, v]) => `${k} ×${v}`).join(', ')} (no score impact)</p>` : ''}</details>`).join('') : '<p>No attempts yet.</p>'}</div>
    <div class="card"><h3>Export</h3><div class="btnrow"><button class="btn" data-exp="progress">Export progress (JSON)</button><button class="btn" data-exp="notes">Export all incident notebooks (Markdown)</button><button class="btn" data-exp="runbooks">Export all runbooks (Markdown)</button><label class="btn">Import progress JSON <input type="file" id="imp" accept="application/json" hidden></label></div></div>
    <div class="card"><h3>Reset</h3><p class="small">Resets cannot be undone. Export first if you want a backup.</p><div class="btnrow"><button class="btn" data-reset="review">Clear review queue</button><button class="btn" data-reset="onboarding">Restart onboarding</button><button class="btn" data-reset="attempts">Clear attempts & active incident</button><button class="btn danger" data-reset="all">Reset everything</button></div></div>`;
  }
  root.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.reset) { const r = await modal('Confirm reset', `<p>Reset <b>${esc(b.dataset.reset)}</b>? This cannot be undone.</p>`, [{ label: 'Cancel', value: null }, { label: 'Reset', value: 'go', danger: true }]); if (!r?.value) return; store.reset(b.dataset.reset); toast('Reset done.'); draw(); return; }
    if (b.dataset.exp === 'progress') downloadText('fleet-response-lab-progress.json', store.exportJSON(), 'application/json');
    if (b.dataset.exp === 'notes') { const st = store.get(); const md = st.attempts.filter((a) => a.notebook).map((a) => `# ${a.notebook.title}\n\n> SIMULATION-BASED TRAINING RECORD — fictional facility.\n\n**Root-cause status:** ${a.notebook.rootStatus}\n\n## Impact\n${a.notebook.impact}\n\n## Timeline\n${a.notebook.timeline}\n\n## Evidence\n${a.notebook.evidence}\n\n## Tests\n${a.notebook.tests}\n\n## Hypotheses\n${a.notebook.hypotheses}\n\n## Mitigation\n${a.notebook.mitigation}\n\n## Recovery checks\n${a.notebook.recovery}\n\n## Root cause\n${a.notebook.rootCause}\n\n## Follow-ups\n${a.notebook.followups}\n\n## Questions for engineering\n${a.notebook.questions}\n`).join('\n\n---\n\n'); downloadText('incident-notebooks-simulated.md', md || '# No notebooks yet'); }
    if (b.dataset.exp === 'runbooks') { const st = store.get(); const md = st.runbooks.map((rb) => { const v = rb.versions[rb.versions.length - 1]; return `# ${rb.title}\n\n> SIMULATION-BASED TRAINING ARTIFACT. Employer procedures marked TO VERIFY.\n\nAuthor ${rb.author || '—'} · v${rb.versions.length} · validated ${rb.lastValidated ? new Date(rb.lastValidated).toISOString() : 'no'}\n\n${Object.entries(v.sections).map(([k, t]) => `## ${k}\n${t}`).join('\n\n')}`; }).join('\n\n---\n\n'); downloadText('runbooks-simulated.md', md || '# No runbooks yet'); }
  };
  root.onchange = async (e) => { if (e.target.id === 'imp') { const f = e.target.files[0]; if (!f) return; try { store.importJSON(await f.text()); toast('Progress imported.'); draw(); } catch (err) { toast('Import failed: ' + err.message, 'warn'); } } };
  draw();
  return {};
}
