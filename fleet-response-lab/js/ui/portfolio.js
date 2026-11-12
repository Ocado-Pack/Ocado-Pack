// Practice portfolio + requirements map (SIMULATION-BASED TRAINING). Never declares job readiness.
import { esc } from '../util.js';
import { FIELDS, RUNBOOK_SECTIONS } from '../comms/docs.js';
import { benchmarkStatus } from '../comms/score.js';
import { cs, saveComms } from '../comms/state.js';
import { store } from '../store.js';
import { downloadText, SIM_NOTE } from './common.js';

const LABEL = 'SIMULATION-BASED TRAINING ARTIFACT — produced in Robotics Fleet Response Lab, a fictional fulfillment facility with fictional staff, telemetry and procedures. This is practice, not professional experience.';
export const REQUIREMENTS = [
  { id: 'r1', text: 'Diagnose and resolve issues in an order-fulfillment robot fleet.', exercises: ['First exercise', 'A', 'D', 'G', 'H', 'W1'], skills: ['diagnosis', 'verification'] },
  { id: 'r2', text: 'Investigate robotics and fulfillment software problems.', exercises: ['B', 'C', 'F', 'I', 'W2'], skills: ['software'] },
  { id: 'r3', text: 'Develop observability tools that make production issues easier to detect and mitigate.', exercises: ['W3 view builder & alert designer', 'reverse-build #2'], skills: ['observability'] },
  { id: 'r4', text: 'Document system operation and issue resolution for support and engineering teams.', exercises: ['C', 'E', 'G', 'H', 'all incident notes', 'KB', 'W4'], skills: ['documentation'] },
  { id: 'r5', text: 'Use operational data to prioritize improvements.', exercises: ['J', 'W5'], skills: ['system'] },
  { id: 'r6', text: 'Provide timely support to operations teams and improve robot and system performance.', exercises: ['First exercise', 'A', 'B', 'I', 'J', 'W6'], skills: ['communication'] },
];
export const TO_VERIFY = ['Required years of experience and education', 'Specific tools, languages and platforms (e.g. scripting, SQL, robot middleware)', 'The employer’s actual robots, software, logs, dashboards and alerting tools', 'Authority levels, escalation paths, on-call and shift schedule', 'Safety, lockout/tagout and physical-work procedures', 'Physical requirements and work location', 'Compensation range for the role, level and location (your $100,000 goal is a goal, not a verified figure)'];

function collect() {
  const c = cs(); const A = c.attempts.filter((a) => a.first && a.artifacts);
  const best = (f) => A.map((a) => ({ a, v: f(a) })).filter((x) => x.v != null).sort((x, y) => (y.v.score ?? 0) - (x.v.score ?? 0))[0];
  const ops = best((a) => (a.artifacts.opsUpdate ? { text: a.artifacts.opsUpdate, score: a.artifacts.opsCheck } : null));
  const esc1 = best((a) => (a.artifacts.escalation?.useful ? { f: a.artifacts.escalation, score: 1 } : null));
  const ho = best((a) => (a.artifacts.handoff ? { f: a.artifacts.handoff, score: 1 / (1 + a.artifacts.handoffRounds) } : null));
  const rb = best((a) => (a.artifacts.runbook ? { f: a.artifacts.runbook, score: 1 / a.artifacts.runbookTests } : null));
  const w4rb = store.get().runbooks?.find((r) => r.lastValidated);
  const pir = best((a) => (a.artifacts.pir ? { f: a.artifacts.pir, score: 1 } : null));
  const rev = best((a) => (a.artifacts.revisions?.length || a.artifacts.messageRevision?.length ? { r: a.artifacts.revisions?.[0], m: a.artifacts.messageRevision?.[0], score: 1 } : null));
  return { ops, esc1, ho, rb, w4rb, pir, rev, A };
}
function ctxLine(a) { return a ? `Context: ${a.artifacts.scenario} · ${a.artifacts.incidentId} · ${a.mode === 'assessment' ? 'independent assessment' : `${a.mode} practice`} · score ${a.first.total}/100${a.revised ? ` (revised ${a.revised.total})` : ''} · simulated` : ''; }

export function render(root) {
  const draw = () => {
    const c = cs(); const p = collect(); const b = benchmarkStatus(c.attempts, c.benchmark.threshold, c.benchmark.n);
    const sk = store.get().attempts; const skAvg = (k) => { const v = sk.filter((a) => a.skills?.[k] != null).slice(-5).map((a) => a.skills[k]); return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : null; };
    const indepFor = (r) => { const letters = r.exercises.map((e) => e.split(' ')[0]); const ids = c.attempts.filter((a) => a.mode === 'assessment' && a.first && (letters.includes(a.letter) || (letters.includes('First') && a.scenarioId === 'CX-first'))); return ids.length ? Math.max(...ids.map((a) => a.first.total)) : null; };
    const evidenceFor = (r) => { const n = c.attempts.filter((a) => a.first && (r.exercises.some((e) => e.startsWith(a.letter)) || (r.exercises.includes('First exercise') && a.scenarioId === 'CX-first'))).length; const w = sk.filter((a) => r.exercises.some((e) => e.startsWith(a.walkthrough || '~'))).length; return `${n} comms incident(s), ${w} walkthrough activity(ies)`; };
    const gap = (r) => { const s = indepFor(r); const avg = r.skills.map(skAvg).filter((x) => x != null); if (s == null && !avg.length) return 'No assessed evidence yet'; if (s == null) return 'No independent (assessment-mode) result yet'; if (s < c.benchmark.threshold) return `Independent best ${s} < ${c.benchmark.threshold}`; return 'Practice bar met — still needs real-world verification'; };
    const nextAct = (r) => { const s = indepFor(r); return s == null ? `Run ${r.exercises[0]} in Independent mode` : s < c.benchmark.threshold ? `Revise, then try ${r.exercises[1] || r.exercises[0]} independently` : `Explain it in the interview room; ask the employer what they use (to verify)`; };
    root.innerHTML = `<div class="card"><span class="eyebrow">Portfolio ${SIM_NOTE}</span><h2>Practice portfolio & requirements map</h2>
      <p class="small">${esc(LABEL)}</p>
      <p class="small"><b>Readiness statement:</b> This portfolio shows practice evidence only. Completing the app does not make you job-ready; employers assess real experience, their own tools and procedures, and many factors this app cannot measure. ${b.met ? 'You met the internal practice benchmark.' : `Internal practice benchmark: ${b.qualifying.length}/${b.needed} qualifying independent incidents.`}</p>
      <div class="btnrow"><button class="btn primary" data-exp="md">Export portfolio (Markdown)</button><button class="btn" data-exp="html">Export portfolio (HTML)</button></div></div>
      <div class="card"><h3>Artifacts</h3>
      ${art('1. Concise operations update', p.ops, (x) => `<p>${esc(x.v.text)}</p>`)}
      ${art('2. Evidence-backed engineering escalation (accepted)', p.esc1, (x) => `<p><b>To:</b> ${esc(x.v.f.team)}<br><b>Summary:</b> ${esc(x.v.f.summary)}<br><b>Reproduction:</b> ${esc(x.v.f.repro)}<br><b>Ruled out:</b> ${esc(x.v.f.ruledOut)}<br><b>Request:</b> ${esc(x.v.f.request)}<br><b>Evidence:</b> ${esc((x.v.f.cites || []).join(', '))}<br><b>Reply (fictional engineer):</b> ${esc(x.v.f.reply)}</p>`)}
      ${art('3. Accepted shift handoff', p.ho, (x) => `<p>${Object.entries(x.v.f).map(([k, v]) => `<b>${esc(FIELDS[k]?.label || k)}:</b> ${esc(v)}`).join('<br>')}</p>`)}
      ${art('4. Validated runbook', p.rb, (x) => `<p>${RUNBOOK_SECTIONS.map(([k, l]) => `<b>${esc(l)}:</b> ${esc(x.v.f[k] || '')}`).join('<br>')}</p>`, p.w4rb ? `<p class="small">Also validated in Walkthrough 4: ${esc(p.w4rb.title)}</p>` : '')}
      ${art('5. Incident review', p.pir, (x) => `<p>${Object.entries(x.v.f).map(([k, v]) => `<b>${esc(FIELDS[k]?.label || k)}:</b> ${esc(v)}`).join('<br>')}</p>`)}
      ${art('6. Before-and-after documentation revision', p.rev, (x) => x.v.m ? `<p><b>${esc(x.v.m.kind)} — before:</b> ${esc(x.v.m.before)}<br><b>After:</b> ${esc(x.v.m.after)}</p>` : `<p><b>${esc(x.v.r.doc)}</b> — changed fields: ${esc(Object.keys(x.v.r.after).filter((k) => x.v.r.after[k] !== x.v.r.before[k]).map((k) => FIELDS[k]?.label || k).join(', '))}</p>`)}
      </div>
      <div class="card"><h3>Requirements map (source: the job responsibilities you supplied)</h3><table class="data"><thead><tr><th>Requirement</th><th>Relevant exercises</th><th>Evidence produced</th><th>Independent result</th><th>Remaining gap</th><th>Next practice action</th></tr></thead><tbody>
      ${REQUIREMENTS.map((r) => `<tr><td>${esc(r.text)}</td><td class="small">${esc(r.exercises.join(', '))}</td><td class="small">${esc(evidenceFor(r))}</td><td>${indepFor(r) ?? '—'}</td><td class="small">${esc(gap(r))}</td><td class="small">${esc(nextAct(r))}</td></tr>`).join('')}</tbody></table>
      <h4>Not in the supplied description — to verify with the employer</h4><ul class="small">${TO_VERIFY.map((x) => `<li>${esc(x)} — <b>to verify</b></li>`).join('')}</ul></div>
      <div class="card"><h3>Your real experience (optional, your words)</h3><p class="small">Kept separate from simulation artifacts. Never generated or edited by the app.</p><textarea id="realx" rows="4">${esc(c.realExperience || '')}</textarea></div>`;
  };
  function art(title, x, body, extra = '') { return `<div class="lesson"><h4>${esc(title)}</h4>${x ? `<p class="small muted">${esc(ctxLine(x.a))}</p>${body(x)}` : '<p class="small muted">Not yet produced — complete an incident that requires it.</p>'}${extra}</div>`; }
  root.oninput = (e) => { if (e.target.id === 'realx') { cs().realExperience = e.target.value; clearTimeout(window.__rxT); window.__rxT = setTimeout(saveComms, 400); } };
  root.onclick = (e) => {
    const b = e.target.closest('button[data-exp]'); if (!b) return;
    const p = collect(); const c = cs();
    const sec = (t, x, f) => `## ${t}\n\n${x ? `_${ctxLine(x.a)}_\n\n${f(x)}` : '_Not yet produced._'}\n`;
    const md = `# Practice portfolio\n\n> ${LABEL}\n\n**Readiness:** practice evidence only — not job readiness, not certification.\n\n${sec('1. Concise operations update', p.ops, (x) => x.v.text)}\n${sec('2. Engineering escalation', p.esc1, (x) => `To: ${x.v.f.team}\n\nSummary: ${x.v.f.summary}\n\nReproduction: ${x.v.f.repro}\n\nRuled out: ${x.v.f.ruledOut}\n\nRequest: ${x.v.f.request}\n\nEvidence: ${(x.v.f.cites || []).join(', ')}`)}\n${sec('3. Accepted shift handoff', p.ho, (x) => Object.entries(x.v.f).map(([k, v]) => `- **${FIELDS[k]?.label || k}:** ${v}`).join('\n'))}\n${sec('4. Validated runbook', p.rb, (x) => RUNBOOK_SECTIONS.map(([k, l]) => `### ${l}\n${x.v.f[k] || ''}`).join('\n\n'))}\n${sec('5. Incident review', p.pir, (x) => Object.entries(x.v.f).map(([k, v]) => `### ${FIELDS[k]?.label || k}\n${v}`).join('\n\n'))}\n${sec('6. Before/after revision', p.rev, (x) => (x.v.m ? `**Before:** ${x.v.m.before}\n\n**After:** ${x.v.m.after}` : `${x.v.r.doc}: fields revised`))}\n## Requirements map\n\n| Requirement | Exercises |\n|---|---|\n${REQUIREMENTS.map((r) => `| ${r.text} | ${r.exercises.join(', ')} |`).join('\n')}\n\n### To verify with the employer\n${TO_VERIFY.map((x) => `- ${x}`).join('\n')}\n\nCareer goal: $${c.careerGoal.amount.toLocaleString()} per year — a personal goal, not a verified salary or guaranteed outcome.\n`;
    if (b.dataset.exp === 'md') downloadText('practice-portfolio-simulated.md', md);
    else downloadText('practice-portfolio-simulated.html', `<!doctype html><meta charset="utf-8"><title>Practice portfolio (simulated)</title><body style="font-family:system-ui;max-width:860px;margin:2rem auto;line-height:1.5"><pre style="white-space:pre-wrap;font-family:inherit">${md.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))}</pre></body>`, 'text/html');
  };
  draw();
  return {};
}
