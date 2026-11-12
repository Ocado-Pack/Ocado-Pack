// Technical Communication, Documentation & Interview Readiness — module hub (SIMULATED training).
import { esc, fmtDur } from '../util.js';
import { COMMS_SCENARIOS, SKILL_LABELS } from '../comms/scenarios.js';
import { METRIC_DEFS, METRIC_CAVEATS, RUBRIC, CRITICAL_LABELS, NOT_SCORED, RULE_LIMITS } from '../comms/rules.js';
import { unlocks, benchmarkStatus } from '../comms/score.js';
import { cs, saveComms } from '../comms/state.js';
import { toast, SIM_NOTE } from './common.js';
import { newCommsAttempt } from './comms-run.js';

export function render(root, ctx) {
  const draw = () => {
    const c = cs(); const u = unlocks(c); const b = benchmarkStatus(c.attempts, c.benchmark.threshold, c.benchmark.n);
    const cur = c.current && !c.current.submitted ? c.current : null;
    const last5 = c.attempts.filter((a) => a.first).slice(-5);
    const med = (arr) => { const v = arr.filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const tierOk = (t) => t <= 1 ? true : t === 2 ? u.tier2 : u.tier3;
    root.innerHTML = `<div class="card"><span class="eyebrow">Module ${SIM_NOTE}</span><h2>Technical Communication, Documentation & Interview Readiness</h2>
      <p>Practise explaining technical decisions, supporting operations, writing documentation others can act on, and showing ownership — using honest, simulation-based evidence from the same warehouse, robots, logs and fault engine.</p>
      <div class="lesson small"><b>Career goal:</b> $<input type="number" id="goal" value="${c.careerGoal.amount}" style="width:110px" aria-label="Career compensation goal"> per year. ${esc(c.careerGoal.note)} Salary ranges for a specific role, level and location are <b>to verify</b> with the employer and current postings. This module builds practice evidence; it cannot guarantee an offer.</div>
      <p class="small muted">Requirements source: the job responsibilities you supplied (see <a href="#/portfolio">Portfolio & requirements map</a>). Missing employer requirements and proprietary procedures are marked “to verify”.</p>
      ${cur ? `<p><a class="btn primary" href="#/comms-run">Continue ${esc(cur.incidentId)} (${esc(cur.mode)})</a></p>` : ''}</div>

    <div class="card"><h3>Beginner → independent: four stages</h3><p class="small">Harder material unlocks from demonstrated performance, not time spent.</p>
      <div class="grid2">
        ${stageCard(1, 'Observe a worked example', 'An annotated incident from start to handoff, then a short comprehension check.', true, c.worked.done ? `✓ Completed (${c.worked.quiz}/4)` : '', '<a class="btn small primary" href="#/comms-worked">Open worked example</a>')}
        ${stageCard(2, 'Partially guided incident', 'The 06:45 shift-end incident with coaching (Guided shows structure; Assisted gives progressive hints).', u.stage2, u.reasons.stage2, `<button class="btn small primary" data-start="CX-first" data-mode="guided">Start — Guided</button> <button class="btn small" data-start="CX-first" data-mode="assisted">Start — Assisted</button>`)}
        ${stageCard(3, 'Handle a new incident independently', 'Assessment mode: no hints or model answers until you submit; then revise and transfer.', u.stage3, u.reasons.stage3, '<a class="btn small" href="#lib">Choose an incident below</a>')}
        ${stageCard(4, 'Explain and defend your decisions', 'Mock interview built from your own independent attempt; answer without a script.', u.stage4, u.reasons.stage4, '<a class="btn small primary" href="#/comms-interview">Enter interview room</a>')}
      </div></div>

    <div class="card" id="lib"><h3>Incident library</h3><p class="small">Normal sessions 15–25 min; the capstone ≈ 40 min. Each run picks a hidden cause and varies the evidence.</p>
      <table class="data"><thead><tr><th></th><th>Incident</th><th>Skills</th><th>Tier</th><th>Your results</th><th>Start</th></tr></thead><tbody>
      ${COMMS_SCENARIOS.filter((s) => !s.worked).map((s) => { const at = c.attempts.filter((a) => a.scenarioId === s.id && a.first); const ok = tierOk(s.tier); return `<tr><td><b>${esc(s.letter)}</b></td><td>${esc(s.title)}<br><span class="small muted">≈ ${s.minutes} min · ${s.variants.length} possible causes</span></td><td class="small">${s.skills.map((k) => esc(SKILL_LABELS[k] || k)).join(', ')}</td><td>${s.tier}</td><td class="small">${at.length ? at.map((a) => `${a.mode === 'assessment' ? 'indep.' : a.mode} ${a.first.total}${a.first.critical.length ? '✕' : ''}${a.revised ? `→${a.revised.total}` : ''}`).join(', ') : '—'}</td><td>${u.stage2 && (s.tier <= 1 || ok) ? `<button class="btn small" data-start="${s.id}" data-mode="assisted">Practice</button>` : ''} ${u.stage3 && ok ? `<button class="btn small primary" data-start="${s.id}" data-mode="assessment">Independent</button>` : `<span class="small muted">${esc(!u.stage2 ? u.reasons.stage2 : !u.stage3 ? u.reasons.stage3 : s.tier === 2 ? u.reasons.tier2 : u.reasons.tier3)}</span>`}</td></tr>`; }).join('')}
      </tbody></table></div>

    <div class="card"><h3>Internal practice benchmark</h3><p class="small">${esc(b.label)}</p>
      <p>Target: <input type="number" id="thr" value="${b.threshold}" min="50" max="100" style="width:70px">/100 across <b>${b.needed}</b> different independent incidents (first attempts), with no critical failures.</p>
      <p>${b.met ? '<span class="pill ok">✓ benchmark met</span>' : `<span class="pill bad">${b.qualifying.length}/${b.needed} qualifying</span>`} ${b.qualifying.map((a) => `${esc(a.letter)} ${a.first.total}`).join(' · ')}</p>
      <p class="small muted">Meeting it means you met this app’s practice bar. It does not make you job-ready, is not a certification, and says nothing about a specific employer’s expectations.</p></div>

    <div class="card"><h3>Evidence-based metrics</h3><table class="data"><thead><tr><th>Metric</th><th>Definition</th><th>Window</th><th>Your recent value</th></tr></thead><tbody>
      ${METRIC_DEFS.map((m) => `<tr><td><b>${esc(m.label)}</b></td><td class="small">${esc(m.def)}${m.note ? `<br><i>${esc(m.note)}</i>` : ''}</td><td class="small">${esc(m.window)}</td><td class="small">${recent(m.id, last5, med)}</td></tr>`).join('')}</tbody></table>
      <ul class="small">${METRIC_CAVEATS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>

    <div class="card"><h3>Assessment rubric (100 points)</h3><ul>${RUBRIC.map((r) => `<li><b>${esc(r.label)}</b> — ${r.max}</li>`).join('')}</ul>
      <p><b>Critical failures (remediation required before an attempt passes):</b> ${Object.values(CRITICAL_LABELS).map(esc).join(' · ')}.</p>
      <p class="small">Corrected attempts are allowed; your first-attempt score is always kept. ${esc(NOT_SCORED)}</p><p class="small muted">${esc(RULE_LIMITS)}</p>
      <p class="small"><b>Loop for every incident:</b> Inspect → Ask → Form hypotheses → Test → Communicate → Mitigate → Verify → Document → Handoff → Reflect. Before important actions you are asked: what you know, what is uncertain, what evidence supports the step, who needs an update, and what would make you stop or escalate.</p>
      <p class="small"><a href="#/kb">Knowledge base & document templates</a> · <a href="#/review">Spaced review</a> · <a href="#/portfolio">Portfolio & requirements map</a></p></div>`;
  };
  function stageCard(n, title, desc, unlocked, status, actions) { return `<div class="tile"><b>Stage ${n}: ${esc(title)}</b><p class="small">${esc(desc)}</p>${unlocked ? `<p class="small ok">${esc(status || 'Unlocked')}</p>${actions}` : `<p class="small muted">🔒 ${esc(status)}</p>`}</div>`; }
  function recent(id, last5, med) {
    const m = last5.map((a) => a.first.metrics || {});
    if (!m.length) return 'no data yet';
    if (id === 'ackTime') { const v = med(m.map((x) => x.ackTime)); return v == null ? 'no acknowledgments' : `median ${fmtDur(v)}`; }
    if (id === 'commitments') { const made = m.reduce((a, x) => a + (x.commitments?.made || 0), 0); const met = m.reduce((a, x) => a + (x.commitments?.met || 0), 0); return made ? `${met}/${made}` : 'none made'; }
    if (id === 'usefulEscalation') return m.map((x) => (x.usefulEscalation === 'not needed' ? 'n/a' : x.usefulEscalation == null ? 'none' : fmtDur(x.usefulEscalation))).join(', ');
    if (id === 'repeatedTests') return m.map((x) => x.repeatedTests ?? 0).join(', ');
    if (id === 'verification') return m.map((x) => `${x.verification?.passed}/${x.verification?.required}`).join(', ');
    if (id === 'handoffQuestions') return m.map((x) => x.handoffQuestions ?? '—').join(', ');
    if (id === 'runbookSuccess') return m.filter((x) => x.runbookSuccess).map((x) => (x.runbookSuccess.validated ? `✓ (${x.runbookSuccess.tests})` : '✕')).join(', ') || '—';
    if (id === 'unsupportedClaims') return m.map((x) => x.unsupportedClaims ?? 0).join(', ');
    if (id === 'docCorrections') return m.map((x) => x.docCorrections ?? 0).join(', ');
    return '—';
  }
  root.onclick = (e) => {
    const b = e.target.closest('button[data-start]'); if (!b) return;
    const c = cs(); if (c.current && !c.current.submitted && !confirm('Replace your unfinished communication incident?')) return;
    newCommsAttempt(ctx, b.dataset.start, { mode: b.dataset.mode }); ctx.setSpeed(1); location.hash = '#/comms-run';
  };
  root.onchange = (e) => {
    if (e.target.id === 'thr') { cs().benchmark.threshold = Math.max(50, Math.min(100, +e.target.value || 85)); saveComms(); toast('Benchmark threshold saved.'); draw(); }
    if (e.target.id === 'goal') { cs().careerGoal.amount = +e.target.value || 100000; saveComms(); toast('Career goal saved (a goal, not a verified salary).'); }
  };
  draw();
  return {};
}
