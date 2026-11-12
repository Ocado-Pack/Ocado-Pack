// Walkthrough 4 — Documentation & engineering handoff (SIMULATED).
import { esc, uid } from '../util.js';
import { SCENARIO_MAP } from '../sim/scenarios.js';
import { DIAGNOSTICS, SANDBOX_TESTS, OPERATIONS, CHECKS } from '../sim/catalog.js';
import { store } from '../store.js';
import { rich, toast, downloadText, SIM_NOTE } from './common.js';
import { scoreDocument, RULES_LIMITS } from '../docs-rules.js';
import { notebookMarkdown } from './investigation.js';
import { scenarioList, bindScenarioStart } from './w1.js';
import { SUPPORTS } from '../review-templates.js';

const SECTIONS = [
  ['whenToUse', 'When to use it (symptoms, scope)'], ['preconditions', 'Preconditions & access requirements'], ['diagnostics', 'Safe diagnostic steps (with expected results)'], ['decisions', 'Decision points (if … then …)'], ['mitigations', 'Safe mitigation options'], ['verification', 'Verification steps'], ['escalation', 'Escalation criteria (trigger → team → evidence)'], ['rollback', 'Rollback guidance'],
];
const VAGUE = ['check it', 'fix it', 'as needed', 'etc', 'look at things', 'make sure it works', 'handle it', 'sort it out', 'if necessary', 'investigate'];
const UNKNOWN_FACTS = [
  { id: 'E1', text: '06:31 facility time (simulated): heartbeat-loss disconnects began in zone B — 8 robots affected over 12 min.' },
  { id: 'E2', text: '06:38: disconnects grouped by firmware were spread across both firmware versions; grouped by zone they were concentrated in zone B.' },
  { id: 'E3', text: '06:44: network team (fictional) rebooted AP-2 at your request.' },
  { id: 'E4', text: '06:46–07:06: zero disconnects in zone B; 41 tasks completed with picks in zone B.' },
  { id: 'E5', text: 'AP-2 logs from before the reboot were not retained (buffer cleared on reboot).' },
  { id: 'E6', text: 'All recovery checks passed at 07:06 after a 20-minute observation period.' },
];

export function render(root, ctx) {
  let tab = store.get().pendingRunbookFrom ? 'runbook' : 'notebook';
  const st = store.get();
  const withNb = () => store.get().attempts.filter((a) => a.notebook).slice().reverse();
  let selAtt = st.pendingRunbookFrom || withNb()[0]?.id || null;
  let rbId = null; let techOut = ''; let collabFb = {};

  function att() { return store.get().attempts.find((a) => a.id === selAtt); }
  function attSelect() { const L = withNb(); return L.length ? `<label>Completed incident <select id="attSel">${L.map((a) => `<option value="${a.id}" ${a.id === selAtt ? 'selected' : ''}>${esc(a.title)} — ${new Date(a.ended).toLocaleString()}</option>`).join('')}</select></label>` : '<p>Complete an incident (any walkthrough) to use it here. Its notebook is saved automatically.</p>'; }

  function notebookTab() {
    const a = att(); if (!a) return attSelect();
    const nb = a.notebook;
    return `${attSelect()}<p>${rich('Edit the saved notebook. The evidence list and action log are append-only (you cannot silently rewrite what happened); summaries are editable.')}</p>
      <label>Root-cause status <select data-nbf="rootStatus">${['confirmed', 'suspected', 'unknown'].map((v) => `<option ${nb.rootStatus === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      ${['title', 'impact', 'affected', 'timeline', 'symptoms', 'tests', 'hypotheses', 'recovery', 'rootCause', 'followups', 'questions'].map((k) => `<label>${esc(k)}<textarea data-nbf="${k}" rows="${['timeline', 'tests'].includes(k) ? 4 : 2}">${esc(nb[k] || '')}</textarea></label>`).join('')}
      <label>Evidence (append-only)<textarea readonly class="ro" rows="4">${esc(nb.evidence || '')}</textarea></label>
      <div class="btnrow"><button class="btn" data-nbcheck>Check</button><button class="btn" data-nbexport>Export Markdown</button><button class="btn primary" data-mkrb>Turn into a runbook</button></div><div id="nbres"></div><p class="muted small">${esc(RULES_LIMITS)}</p>`;
  }
  function draftRunbook(a) {
    const sc = SCENARIO_MAP[a.scenarioId];
    const diags = a.evidence.filter((e) => DIAGNOSTICS[e.source] || SANDBOX_TESTS[e.source]);
    const seen = new Set(); const steps = [];
    for (const e of diags) { if (seen.has(e.source)) continue; seen.add(e.source); const d = DIAGNOSTICS[e.source] || SANDBOX_TESTS[e.source]; const normal = d.predict.options.find((o) => /normal|clear|stable|match|closed|consistent|ready|healthy/i.test(o[1]))?.[1]; steps.push(`${steps.length + 1}. ${d.label} (read-only). Expected if healthy: ${normal || 'see explanation'}. If not: note the value and go to the decision points.`); }
    const decisions = [...new Set(diags.map((e) => SUPPORTS[`${e.source}:${e.outcome}`]).filter(Boolean))].map((t, i) => `D${i + 1}. If ${diags.find((e) => SUPPORTS[`${e.source}:${e.outcome}`] === t)?.label} shows this pattern → ${t}`);
    const ops = a.actions.filter((x) => x.ok && OPERATIONS[x.op]);
    return {
      whenToUse: `Use when: ${sc.brief.replace(/^[^:]+:\s*/, '')} Scope: ${Object.entries(sc.target).map(([k, v]) => `${k} ${v}`).join(', ')}. (Simulated facility.)`,
      preconditions: 'Read access to fleet dashboard, log console and task records (simulated). Authorization for state-changing actions per your role — TO VERIFY with employer. Physical work only by trained staff under the site safety procedure — TO VERIFY.',
      diagnostics: steps.join('\n'),
      decisions: decisions.join('\n') + '\nOtherwise → escalate (see criteria).',
      mitigations: ops.map((x, i) => `M${i + 1}. ${OPERATIONS[x.op].label}${x.params ? ' (' + Object.values(x.params).join(', ') + ')' : ''}. Prerequisites: ${OPERATIONS[x.op].prereq} Preserve: ${OPERATIONS[x.op].preserve}`).join('\n') || 'M1. ',
      verification: sc.checks.map((id, i) => `V${i + 1}. ${CHECKS[id].label} — pass condition: as shown by the check; observe ≥ 5 min.`).join('\n'),
      escalation: 'Escalate to the owning team (fleet software / network / maintenance / facilities) when: (a) recovery checks still fail 15 min after mitigation, (b) the cause is not identified within 30 min, (c) any safety state is unexplained, or (d) task/inventory records are inconsistent. Include: incident ID, timeline, evidence [E#], tests already run, and a specific request.',
      rollback: ops.map((x) => `${OPERATIONS[x.op].label}: ${OPERATIONS[x.op].rollback}`).join('\n') || '—',
    };
  }
  function runbookTab() {
    const rbs = store.get().runbooks;
    const rb = rbs.find((r) => r.id === rbId) || rbs[rbs.length - 1];
    if (rb) rbId = rb.id;
    const v = rb ? rb.versions[rb.versions.length - 1] : null;
    return `${attSelect()}<div class="btnrow">${att() ? '<button class="btn" data-newrb>Create runbook from this incident</button>' : ''}${rbs.length ? `<label>Runbook <select id="rbSel">${rbs.map((r) => `<option value="${r.id}" ${r.id === rbId ? 'selected' : ''}>${esc(r.title)} (v${r.versions.length})</option>`).join('')}</select></label>` : ''}</div>
      ${rb ? `<label>Title <input type="text" data-rbm="title" value="${esc(rb.title)}"></label>
        <div class="grid2"><label>Author (your name or initials) <input type="text" data-rbm="author" value="${esc(rb.author || '')}"></label><label>Version <input type="text" readonly value="v${rb.versions.length}"></label><label>Last validated <input type="text" readonly value="${rb.lastValidated ? new Date(rb.lastValidated).toLocaleString() : 'not yet validated'}"></label></div>
        ${SECTIONS.map(([k, l]) => `<label>${esc(l)}<textarea data-rbs="${k}" rows="${['diagnostics', 'decisions', 'mitigations', 'verification'].includes(k) ? 5 : 3}">${esc(v.sections[k] || '')}</textarea></label>`).join('')}
        <label>Revision note <input type="text" id="revNote" placeholder="What changed and why"></label>
        <div class="btnrow"><button class="btn" data-saverb>Save as new version</button><button class="btn primary" data-tech>Test with simulated technician</button><button class="btn" data-exprb>Export Markdown</button></div>
        <div id="techOut">${techOut}</div>
        <h4>Revision history</h4><ul class="small">${rb.versions.map((x, i) => `<li>v${i + 1} · ${new Date(x.at).toLocaleString()} · ${esc(x.note || '')}${x.validated ? ' · ✓ validated' : ''}</li>`).join('')}</ul>` : ''}`;
  }
  function technician(rb) {
    const v = rb.versions[rb.versions.length - 1].sections;
    const pauses = [];
    const lines = (k) => String(v[k] || '').split('\n').map((x) => x.trim()).filter(Boolean);
    for (const [k, l] of SECTIONS) if (String(v[k] || '').trim().length < 15) pauses.push({ where: l, why: 'Section is empty or too thin.', consequence: 'The technician has nothing to follow here and stops to call you.' });
    lines('diagnostics').forEach((x, i) => { if (!/(expected|should|normal|if )/i.test(x)) pauses.push({ where: `Diagnostic step ${i + 1}`, why: `No expected result: “${x.slice(0, 80)}”`, consequence: 'The technician cannot tell whether the reading is good or bad, so they cannot choose the next branch.' }); const vg = VAGUE.find((w) => x.toLowerCase().includes(w)); if (vg) pauses.push({ where: `Diagnostic step ${i + 1}`, why: `Vague instruction (“${vg}”).`, consequence: 'Two technicians would do different things; results are not reproducible.' }); });
    if (!lines('decisions').some((x) => /\bif\b/i.test(x))) pauses.push({ where: 'Decision points', why: 'No “if … then …” branches.', consequence: 'After diagnostics the technician does not know which mitigation applies.' });
    if (!/otherwise|else|none of the above|escalate/i.test(v.decisions || '')) pauses.push({ where: 'Decision points', why: 'No branch for “none of the above”.', consequence: 'An unexpected result leaves the technician stuck.' });
    lines('mitigations').forEach((x, i) => { if (!/(prereq|authori|preserve|isolat|lockout|procedure|approval)/i.test(x)) pauses.push({ where: `Mitigation ${i + 1}`, why: 'No prerequisite, authorization or evidence-preservation note.', consequence: 'Risk of acting without authority or erasing evidence.' }); });
    if (lines('verification').length < 3) pauses.push({ where: 'Verification', why: 'Fewer than three verification steps.', consequence: 'Premature closure: the robot may look healthy while the workflow is broken.' });
    if (!/(when|if|after|>|\d)/i.test(v.escalation || '') || !/(team|engineer|network|maintenance|facilities|support)/i.test(v.escalation || '')) pauses.push({ where: 'Escalation', why: 'Missing trigger or receiving team.', consequence: 'The technician either escalates too late or to the wrong people.' });
    if (/(bypass|override|jumper|defeat|disable the e-stop|enter the aisle while|energi[sz]ed)/i.test(Object.values(v).join(' '))) pauses.push({ where: 'Safety', why: 'Unsafe instruction detected.', consequence: 'STOP — the technician refuses. Never include instructions to bypass protective devices.' });
    if (!rb.author) pauses.push({ where: 'Metadata', why: 'No author.', consequence: 'Nobody knows who to ask about this runbook.' });
    return pauses;
  }
  function collabTab() {
    const a = att(); if (!a) return attSelect();
    const sc = SCENARIO_MAP[a.scenarioId]; const truth = sc.truth[a.variant] || Object.values(sc.truth)[0];
    const disc = truth.discriminators.map((d) => (DIAGNOSTICS[d] || SANDBOX_TESTS[d])?.label).filter(Boolean);
    const th = (store.get().collab || {})[a.id] || {};
    const msgs = [
      { k: 'ops', who: 'Dana — operations shift lead (fictional)', text: `Thanks for jumping on “${sc.title}”. Is it safe to put things back to normal, and what should my team watch for in the next hour?` },
      { k: 'eng', who: 'Priya — fleet software engineer (fictional)', text: 'I am picking this up. Can you attach the evidence that best separates the possible causes, and tell me what you already ruled out?' },
      { k: 'sup', who: 'Sam — support (fictional)', text: 'For the handoff record: is the root cause confirmed, and who owns the follow-up?' },
    ];
    return `${attSelect()}<p>${rich('Fictional colleagues ask for information about your completed incident. Answer, attach evidence where requested, then revise until they can act.')}</p>
      ${msgs.map((m) => `<div class="chat"><div class="msg"><div class="who">${esc(m.who)} · simulated message</div>${esc(m.text)}</div>${th[m.k] ? `<div class="msg me"><div class="who">You</div>${esc(th[m.k].text)}${th[m.k].ev?.length ? `<br><span class="small">Attached: ${th[m.k].ev.join(', ')}</span>` : ''}</div>` : ''}${collabFb[m.k] ? `<div class="msg"><div class="who">${esc(m.who.split(' — ')[0])}</div>${esc(collabFb[m.k])}</div>` : ''}</div>
        <label>Your reply <textarea rows="2" data-cr="${m.k}">${esc(th[m.k]?.text || '')}</textarea></label>
        ${m.k === 'eng' ? `<div class="chips" data-cev>${a.evidence.map((e) => `<label class="chip"><input type="checkbox" value="${e.id}" ${(th.eng?.ev || []).includes(e.id) ? 'checked' : ''}> ${e.id} ${esc((e.label || '').slice(0, 28))}</label>`).join('')}</div>` : ''}
        <button class="btn small" data-csend="${m.k}">Send (simulated)</button>`).join('<hr>')}
      <p class="muted small">Replies are checked with transparent rules (not AI). The engineer’s reaction depends on whether your attached evidence actually discriminates between causes — for this incident that would include: ${esc(disc.join('; '))}.</p>`;
  }
  function unknownTab() {
    const sv = store.get().unknownDoc || { status: 'confirmed', text: '' };
    return `<div class="lesson">${rich('Sometimes a [[mitigation]] restores service and the cause stays unknown. Your job is to document recovery accurately without claiming a confirmed [[root cause]].')}</div>
      <h4>Facts collected (simulated)</h4><ul>${UNKNOWN_FACTS.map((f) => `<li><b>[${f.id}]</b> ${esc(f.text)}</li>`).join('')}</ul>
      <label>Root-cause status <select id="ukS">${['confirmed', 'suspected', 'unknown'].map((v) => `<option ${sv.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Recovery summary (cite facts as [E#]) <textarea id="ukT" rows="5" placeholder="Service restored … root cause … monitoring … follow-up owner …">${esc(sv.text)}</textarea></label>
      <button class="btn primary" data-ukcheck>Check</button><div id="ukOut"></div>
      <h4>Or do it hands-on</h4>${scenarioList(ctx, (s) => s.id === 'w4-unknown')}`;
  }
  function draw() {
    root.innerHTML = `<div class="card"><span class="eyebrow">Walkthrough 4 ${SIM_NOTE}</span><h2>Documentation & engineering handoff</h2>
      <div class="btnrow" role="tablist">${[['notebook', 'Incident notebook'], ['runbook', 'Runbook builder'], ['collab', 'Collaboration'], ['unknown', 'Recovery, cause unknown']].map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div>${{ notebook: notebookTab, runbook: runbookTab, collab: collabTab, unknown: unknownTab }[tab]()}</div></div>`;
  }
  root.onchange = (e) => {
    const t = e.target;
    if (t.id === 'attSel') { selAtt = t.value; draw(); return; }
    if (t.id === 'rbSel') { rbId = t.value; techOut = ''; draw(); return; }
    if (t.dataset.nbf) { store.update(() => { att().notebook[t.dataset.nbf] = t.value; }); return; }
    if (t.dataset.rbm) { store.update((s) => { s.runbooks.find((r) => r.id === rbId)[t.dataset.rbm] = t.value; }); return; }
  };
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { tab = b.dataset.tab; draw(); return; }
    if (b.dataset.nbcheck !== undefined) { const a = att(); const body = Object.entries(a.notebook).filter(([k]) => k !== 'evidence').map(([, v]) => v).join('\n'); const ok = a.checks && Object.values(a.checks).every((x) => x.pass); const res = scoreDocument({ rootCause: a.notebook.rootStatus, body }, a.evidence, { recovered: !!ok, rootCauseKnown: a.notebook.rootStatus !== 'confirmed' || (a.cause && !a.unknownRootCause && a.summary?.diagnosis) }); root.querySelector('#nbres').innerHTML = `<div class="docres">${res.critical.map((c) => `<p class="bad">✕ ${esc(c.msg)}</p>`).join('') || '<p class="ok">✓ No critical issues.</p>'}${res.items.map((x) => `<p class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓' : '✕'} ${esc(x.label)}</p>`).join('')}</div>`; return; }
    if (b.dataset.nbexport !== undefined) { const a = att(); downloadText(`${a.notebook.title.split(' ')[0]}-simulated.md`, notebookMarkdown(a.notebook, { id: a.id, escalation: a.escalation }, { title: a.title })); return; }
    if (b.dataset.mkrb !== undefined || b.dataset.newrb !== undefined) { const a = att(); const sections = draftRunbook(a); const rb = { id: uid('rb'), title: `Runbook: ${a.title} (simulated)`, from: a.id, author: '', versions: [{ at: Date.now(), sections, note: 'Drafted from completed incident' }], lastValidated: null }; store.update((s) => { s.runbooks.push(rb); delete s.pendingRunbookFrom; }); rbId = rb.id; tab = 'runbook'; techOut = ''; draw(); return; }
    if (b.dataset.saverb !== undefined) { const sections = {}; root.querySelectorAll('[data-rbs]').forEach((x) => { sections[x.dataset.rbs] = x.value; }); const note = root.querySelector('#revNote').value.trim() || 'Edited'; store.update((s) => { s.runbooks.find((r) => r.id === rbId).versions.push({ at: Date.now(), sections, note }); }); toast('Saved new version.'); techOut = ''; draw(); return; }
    if (b.dataset.tech !== undefined) {
      const sections = {}; root.querySelectorAll('[data-rbs]').forEach((x) => { sections[x.dataset.rbs] = x.value; });
      const rb = store.get().runbooks.find((r) => r.id === rbId); const last = rb.versions[rb.versions.length - 1];
      if (JSON.stringify(last.sections) !== JSON.stringify(sections)) { toast('Save a new version first so the test runs on a recorded revision.', 'warn'); return; }
      const p = technician(rb);
      if (!p.length) { store.update((s) => { const r = s.runbooks.find((x) => x.id === rbId); r.lastValidated = Date.now(); r.versions[r.versions.length - 1].validated = true; s.attempts.push({ id: uid('rbv'), scenarioId: 'w4-runbook', title: `W4 · Runbook validated: ${r.title}`, walkthrough: 'W4', mode: s.settings.mode, started: Date.now(), ended: Date.now(), total: 100, skills: { documentation: 100 }, critical: [], cats: [] }); s.walkthroughs.W4 = { done: true }; }); techOut = '<div class="docres"><p class="ok">✓ The simulated technician completed every step using only the document. Runbook marked validated (version and date recorded).</p></div>'; }
      else techOut = `<div class="docres"><p><b>The simulated technician paused ${p.length} time(s)</b> (they can only use the document and read-only system information):</p>${p.map((x) => `<p class="bad">⏸ <b>${esc(x.where)}:</b> ${esc(x.why)}<br><span class="small">Consequence: ${esc(x.consequence)}</span></p>`).join('')}<p class="muted small">Revise, save a new version, and test again. Filling every field with text does not pass by itself.</p></div>`;
      draw(); return;
    }
    if (b.dataset.exprb !== undefined) { const rb = store.get().runbooks.find((r) => r.id === rbId); const v = rb.versions[rb.versions.length - 1]; downloadText(`${rb.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 50)}.md`, `# ${rb.title}\n\n> SIMULATION-BASED TRAINING ARTIFACT — fictional facility. Employer-specific procedures marked TO VERIFY.\n\nAuthor: ${rb.author || '—'} · Version v${rb.versions.length} · Last validated: ${rb.lastValidated ? new Date(rb.lastValidated).toISOString() : 'not validated'}\n\n${SECTIONS.map(([k, l]) => `## ${l}\n${v.sections[k] || ''}\n`).join('\n')}\n## Revision history\n${rb.versions.map((x, i) => `- v${i + 1} ${new Date(x.at).toISOString()} — ${x.note}${x.validated ? ' (validated)' : ''}`).join('\n')}\n`); return; }
    if (b.dataset.csend) {
      const k = b.dataset.csend; const a = att(); const sc = SCENARIO_MAP[a.scenarioId]; const truth = sc.truth[a.variant] || Object.values(sc.truth)[0];
      const text = root.querySelector(`[data-cr="${k}"]`).value.trim(); const ev = k === 'eng' ? [...root.querySelectorAll('[data-cev] input:checked')].map((x) => x.value) : [];
      store.update((s) => { s.collab = s.collab || {}; s.collab[a.id] = s.collab[a.id] || {}; s.collab[a.id][k] = { text, ev, at: Date.now() }; });
      const lo = text.toLowerCase();
      if (k === 'ops') collabFb.ops = !/(check|verif|pass|observ|watch|monitor)/.test(lo) ? 'Thanks — but how do we know it is really OK? What did you check, and what exactly should my team watch for?' : /(fixed|resolved|all good|back to normal)/.test(lo) && !a.checks ? 'You say it is resolved, but I do not see verification results. I will hold off until you confirm the checks.' : !/(\d|min|hour|queue|alarm|robot)/.test(lo) ? 'OK. Can you give me something concrete to watch — e.g. queue age, a specific robot, an alarm?' : 'Clear, thanks. We will watch for that and call you if it comes back.';
      if (k === 'eng') { const disc = a.evidence.filter((x) => ev.includes(x.id) && truth.discriminators.includes(x.source)); collabFb.eng = !ev.length ? 'I cannot act on this without evidence. Please attach the specific results (timestamps, IDs).' : !disc.length ? `These attachments do not separate the causes. Do you have something like “${(DIAGNOSTICS[truth.discriminators[0]] || SANDBOX_TESTS[truth.discriminators[0]])?.label}”? If you never ran it, say so — that is useful too.` : !/(ruled out|not the|contradict|excluded|clear|normal)/.test(lo) ? 'Good evidence, thanks. What did you rule out? That saves me repeating your tests.' : 'Perfect — evidence plus what you ruled out. I can reproduce this and take the permanent fix.'; }
      if (k === 'sup') collabFb.sup = (/confirmed/.test(lo) && !/(not confirmed|unconfirmed)/.test(lo) && (a.unknownRootCause || !a.summary?.diagnosis)) ? 'Hmm — your notebook does not show evidence that confirms a cause. Can you correct this to “suspected” or “unknown” and say what would confirm it?' : !/(owner|assigned|team|i will|engineering|support)/.test(lo) ? 'Who owns the follow-up? Please name an owner or team.' : 'Thanks — status and ownership are clear for the handoff.';
      draw(); return;
    }
    if (b.dataset.ukcheck !== undefined) {
      const status = root.querySelector('#ukS').value; const text = root.querySelector('#ukT').value;
      store.update((s) => { s.unknownDoc = { status, text }; });
      const res = scoreDocument({ rootCause: status, body: text }, UNKNOWN_FACTS, { recovered: true, rootCauseKnown: false });
      const extra = [[/monitor|watch|observ|recurr/i.test(text), 'Says recovery is being monitored for recurrence'], [/(follow.?up|owner|ticket|vendor|retain)/i.test(text), 'Names follow-up actions (e.g. log retention, vendor ticket) and an owner'], [status !== 'confirmed', 'Root-cause status is not “confirmed”'], [/restor|recover/i.test(text), 'States that service was restored, and by what action']];
      const score = Math.max(0, (res.critical.length ? 0 : 40) + extra.filter((x) => x[0]).length * 12 + (res.cited.length >= 2 ? 12 : 0));
      root.querySelector('#ukOut').innerHTML = `<div class="docres">${res.critical.map((c) => `<p class="bad">✕ ${esc(c.msg)}</p>`).join('')}${extra.map(([ok, l]) => `<p class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✕'} ${esc(l)}</p>`).join('')}<p class="${res.cited.length >= 2 ? 'ok' : 'bad'}">${res.cited.length >= 2 ? '✓' : '✕'} Cites at least two facts</p><p><b>${Math.min(100, score)}/100</b></p><p class="muted small">Model sentence: “Service restored at 06:46 after the network team rebooted AP-2 [E3][E4]; all checks passed after 20 min [E6]. Root cause NOT determined — pre-reboot AP logs were not retained [E5]. Follow-up: network team to enable log retention and monitor zone B for recurrence through end of shift.”</p></div>`;
      store.update((s) => { s.attempts.push({ id: uid('uk'), scenarioId: 'w4-unknown-doc', title: 'W4 · Recovery documented without confirmed cause', walkthrough: 'W4', mode: s.settings.mode, started: Date.now(), ended: Date.now(), total: Math.min(100, score), skills: { documentation: Math.min(100, score) }, critical: res.critical.map((c) => c.code), cats: [] }); });
      return;
    }
  };
  bindScenarioStart(root, ctx);
  draw();
  return {};
}
