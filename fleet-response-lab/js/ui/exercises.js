// Reverse-building exercises: construct an explanation or tool from a desired behaviour. Rule-based feedback.
import { esc, uid } from '../util.js';
import { METRICS } from '../sim/catalog.js';
import { store } from '../store.js';
import { rich, toast, SIM_NOTE } from './common.js';

const NODES = ['Order service', 'Task scheduler', 'Inventory service', 'Fleet manager', 'Robot', 'Picking station', 'Order completion', 'Wi-Fi access point', 'Charger', 'Station service'];
const EX1 = { desc: 'Order O-2231 failed. Its tasks were planned, but stock reservation timed out repeatedly, so no robot was ever assigned. Picking station P-1 sat idle waiting for totes.', need: [['Order service', 'Task scheduler'], ['Task scheduler', 'Inventory service'], ['Task scheduler', 'Fleet manager'], ['Fleet manager', 'Robot'], ['Robot', 'Picking station'], ['Picking station', 'Order completion']], failing: 'Inventory service', irrelevant: ['Charger', 'Wi-Fi access point'] };
const PSEUDO = [{ id: 'stationStatus', label: 'Station status by station (station-service view)' }, { id: 'robotsWaiting', label: 'Robots waiting at each station (count & wait time)' }, { id: 'stationHmi', label: 'Station HMI vs software status mismatch' }];
const EX2 = { goal: 'Detect this failure pattern early: “a picking station reports unavailable while robots wait at it and orders age.”', need: ['stationStatus', 'robotsWaiting', 'oldestAge'], helpful: ['queueDepth', 'tasksPerHour', 'stationHmi'], noise: ['batteryAvg', 'disconnects', 'chargeFaults', 'dupIgnored'] };
const STEPS = [
  { id: 'a', t: 'Read the report; confirm scope (which robot, where, since when)', kind: 'observe' },
  { id: 'b', t: 'Check robot status and stop reason (read-only)', kind: 'read' },
  { id: 'c', t: 'Check obstacle sensor range and camera snapshot (read-only)', kind: 'read' },
  { id: 'd', t: 'Compare with other robots in the same zone (read-only)', kind: 'read' },
  { id: 'e', t: 'Preserve evidence (robot log buffer, task records)', kind: 'preserve' },
  { id: 'f', t: 'Request floor team to clear aisle under lockout (simulated)', kind: 'act' },
  { id: 'g', t: 'Verify: robot healthy, full task completes, alarms clear for 5 min', kind: 'verify' },
  { id: 'h', t: 'Document timeline and evidence with citations', kind: 'doc' },
  { id: 'x1', t: 'Restart the robot immediately to see if it helps', kind: 'bad', why: 'Erases evidence and does not address a physical obstruction.' },
  { id: 'x2', t: 'Restart fleet-manager', kind: 'bad', why: 'Disrupts the whole fleet; no evidence implicates software.' },
  { id: 'x3', t: 'Replace the robot battery', kind: 'bad', why: 'Unsupported by any evidence; battery telemetry was normal.' },
];
const EX5 = [
  { pair: 'R-07 stops in Aisle C: obstruction vs localization', opts: [['obstacle', 'Forward obstacle range', 'disc'], ['loc', 'Localization confidence', 'disc'], ['cam', 'Camera snapshot ahead of the robot', 'disc'], ['others', 'Other robots stopping at the same spot', 'neutral', 'Both causes are place-based, so this separates robot-vs-place, not these two causes.'], ['batt', 'Battery %', 'no'], ['motor', 'Motor current', 'no'], ['temp', 'Controller temperature', 'no'], ['rssi', 'Wi-Fi RSSI', 'no']] },
  { pair: 'Robots dropping offline: access point fault vs robot firmware', opts: [['byzone', 'Disconnects grouped by zone', 'disc'], ['byfw', 'Disconnects grouped by firmware version', 'disc'], ['apretry', 'AP retry rate', 'disc'], ['release', 'Firmware rollout list (which robots, when)', 'neutral', 'Useful context, but timing alone is correlation.'], ['batt', 'Battery %', 'no'], ['enc', 'Encoder ratio', 'no'], ['loc', 'Localization confidence', 'no']] },
];

export function render(root) {
  const st = store.get();
  const ex = st.exercises;
  const s1 = ex.ex1?.edges || []; let fail1 = ex.ex1?.failing || '';
  const s2 = new Set(ex.ex2?.widgets || []);
  const order = ex.ex3?.order || ['x1', 'b', 'a', 'f', 'c', 'h', 'd', 'x2', 'g', 'e', 'x3']; const excl = new Set(ex.ex3?.excl || []);
  const s5 = ex.ex5?.sel || {};
  const out = {};

  function svgMap(edges) {
    const pos = Object.fromEntries(NODES.map((n, i) => [n, { x: 70 + (i % 4) * 140, y: 30 + Math.floor(i / 4) * 80 }]));
    return `<svg class="chart" viewBox="0 0 600 260" role="img" aria-label="Your dependency map"><defs><marker id="m1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#555"/></marker></defs>${edges.map(([a, b]) => `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" stroke="#555" stroke-width="1.5" marker-end="url(#m1)"/>`).join('')}${NODES.map((n) => `<g><rect x="${pos[n].x - 62}" y="${pos[n].y - 14}" width="124" height="28" rx="6" fill="${n === fail1 ? '#fdecea' : '#eef4fa'}" stroke="${n === fail1 ? '#b3261e' : '#0072B2'}" ${n === fail1 ? 'stroke-dasharray="3 2" stroke-width="2.5"' : ''}/><text x="${pos[n].x}" y="${pos[n].y + 4}" text-anchor="middle">${n === fail1 ? '✕ ' : ''}${esc(n)}</text></g>`).join('')}</svg>`;
  }
  function draw() {
    root.innerHTML = `<div class="card"><span class="eyebrow">Reverse-building ${SIM_NOTE}</span><h2>Build from the desired behaviour</h2><p>${rich('Each exercise starts from a goal or a failure description. Feedback flags missing dependencies, unsupported conclusions and unnecessary actions.')}</p></div>

    <div class="card"><h3>1. Assemble a dependency map from an order-failure description</h3><p class="lesson">${esc(EX1.desc)}</p>
      <div class="btnrow"><select id="e1a">${NODES.map((n) => `<option>${esc(n)}</option>`).join('')}</select> depends on / sends work to → <select id="e1b">${NODES.map((n, i) => `<option ${i === 1 ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><button class="btn small" data-e1add>Add arrow</button><button class="btn small" data-e1clear>Clear</button></div>
      <label>Which component failed? <select id="e1f"><option value="">—</option>${NODES.map((n) => `<option ${fail1 === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      ${svgMap(s1)}<p class="small">Arrows: ${s1.map(([a, b]) => `${esc(a)} → ${esc(b)} <button class="btn small" data-e1rm="${esc(a)}|${esc(b)}" aria-label="remove">✕</button>`).join(' · ') || 'none'}</p>
      <button class="btn primary" data-e1check>Check</button><div>${out.e1 || ''}</div></div>

    <div class="card"><h3>2. Build a dashboard that detects a specified failure pattern</h3><p class="lesson">${esc(EX2.goal)}</p>
      <div class="chips">${[...METRICS.map((m) => ({ id: m.id, label: m.label })), ...PSEUDO].map((w) => `<label class="chip"><input type="checkbox" data-e2="${w.id}" ${s2.has(w.id) ? 'checked' : ''}> ${esc(w.label)}</label>`).join('')}</div>
      <button class="btn primary" data-e2check>Check</button><div>${out.e2 || ''}</div></div>

    <div class="card"><h3>3. Arrange diagnostic steps into an efficient investigation</h3><p class="lesson">Incident: “R-03 repeatedly stopping in Aisle B.” Order the steps and exclude any that should not be done.</p>
      <ol class="sortable">${order.map((id, i) => { const stp = STEPS.find((x) => x.id === id); return `<li class="${excl.has(id) ? 'off' : ''}"><span>${i + 1}.</span> ${esc(stp.t)} <span style="margin-left:auto"></span><button class="btn small" data-up="${i}" aria-label="up">▲</button><button class="btn small" data-down="${i}" aria-label="down">▼</button><button class="btn small" data-ex="${id}">${excl.has(id) ? 'Include' : 'Exclude'}</button></li>`; }).join('')}</ol>
      <button class="btn primary" data-e3check>Check</button><div>${out.e3 || ''}</div></div>

    <div class="card"><h3>4. Create a runbook from a completed incident</h3><p>Open Walkthrough 4 → Runbook builder. It drafts from your incident record; then a simulated technician tests it using only the document and pauses at ambiguous steps.</p><a class="btn" href="#/w4">Open runbook builder</a></div>

    <div class="card"><h3>5. Choose telemetry that distinguishes two competing causes</h3>
      ${EX5.map((p, pi) => `<div class="lesson"><b>${esc(p.pair)}</b><div class="chips">${p.opts.map(([k, l]) => `<label class="chip"><input type="checkbox" data-e5="${pi}:${k}" ${(s5[pi] || []).includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div></div>`).join('')}
      <button class="btn primary" data-e5check>Check</button><div>${out.e5 || ''}</div></div>`;
  }
  const save = (k, v) => store.update((s) => { s.exercises[k] = { ...(s.exercises[k] || {}), ...v }; });
  const record = (title, score) => store.update((s) => { s.exercises[title] = { ...(s.exercises[title] || {}), best: Math.max(score, s.exercises[title]?.best || 0) }; s.attempts.push({ id: uid('ex'), scenarioId: 'exercise', title: `Reverse-build · ${title}`, walkthrough: 'EX', mode: s.settings.mode, started: Date.now(), ended: Date.now(), total: score, skills: { system: score }, critical: [], cats: [] }); });
  root.onchange = (e) => {
    const t = e.target;
    if (t.id === 'e1f') { fail1 = t.value; save('ex1', { failing: fail1 }); draw(); }
    if (t.dataset.e2) { t.checked ? s2.add(t.dataset.e2) : s2.delete(t.dataset.e2); save('ex2', { widgets: [...s2] }); }
    if (t.dataset.e5) { const [pi, k] = t.dataset.e5.split(':'); s5[pi] = s5[pi] || []; if (t.checked) s5[pi].push(k); else s5[pi] = s5[pi].filter((x) => x !== k); save('ex5', { sel: s5 }); }
  };
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e1add !== undefined) { const a = root.querySelector('#e1a').value, c = root.querySelector('#e1b').value; if (a === c) { toast('Pick two different components.', 'warn'); return; } if (!s1.some(([x, y]) => x === a && y === c)) s1.push([a, c]); save('ex1', { edges: s1 }); draw(); return; }
    if (b.dataset.e1clear !== undefined) { s1.length = 0; save('ex1', { edges: s1 }); draw(); return; }
    if (b.dataset.e1rm) { const [a, c] = b.dataset.e1rm.split('|'); const i = s1.findIndex(([x, y]) => x === a && y === c); s1.splice(i, 1); save('ex1', { edges: s1 }); draw(); return; }
    if (b.dataset.e1check !== undefined) {
      const has = (a, c) => s1.some(([x, y]) => x === a && y === c);
      const missing = EX1.need.filter(([a, c]) => !has(a, c)); const extra = s1.filter(([a, c]) => !EX1.need.some(([x, y]) => x === a && y === c));
      const fb = [];
      if (!missing.length) fb.push(['ok', 'All dependencies on the order path are present.']); else fb.push(['bad', `Missing dependencies: ${missing.map(([a, c]) => `${a} → ${c}`).join('; ')}`]);
      for (const [a, c] of extra) fb.push(['bad', `${a} → ${c}: ${EX1.irrelevant.includes(a) || EX1.irrelevant.includes(c) ? 'real in general, but nothing in the description involves it — it does not help explain this failure.' : 'not supported by the description (check direction).'}`]);
      fb.push(fail1 === EX1.failing ? ['ok', 'Correct failing component: reservations timed out at the inventory service.'] : ['bad', fail1 ? `“${fail1}” is not supported: the description says reservation timed out, so no robot was assigned. The robot and station were idle victims.` : 'Mark which component failed.']);
      const score = Math.max(0, Math.round(((EX1.need.length - missing.length) / EX1.need.length) * 60 - extra.length * 5 + (fail1 === EX1.failing ? 40 : 0)));
      out.e1 = `<div class="docres"><p><b>${score}/100</b></p>${fb.map(([k, t]) => `<p class="${k}">${k === 'ok' ? '✓' : '✕'} ${esc(t)}</p>`).join('')}</div>`; record('Dependency map', score); draw(); return;
    }
    if (b.dataset.e2check !== undefined) {
      const fb = []; const miss = EX2.need.filter((x) => !s2.has(x)); const noise = EX2.noise.filter((x) => s2.has(x));
      const nm = (id) => (METRICS.find((m) => m.id === id) || PSEUDO.find((p) => p.id === id))?.label;
      if (!miss.length) fb.push(['ok', 'Includes station status, robots waiting at stations, and oldest task age — the three signals that together define the pattern.']); else fb.push(['bad', `Missing: ${miss.map(nm).join('; ')} — without it the pattern cannot be distinguished.`]);
      for (const x of noise) fb.push(['bad', `${nm(x)} does not help detect this pattern (unnecessary clutter).`]);
      const help = EX2.helpful.filter((x) => s2.has(x)); if (help.length) fb.push(['ok', `Helpful context: ${help.map(nm).join('; ')}.`]);
      fb.push(['muted', 'Note: robots waiting at a station show as healthy (WAITING), so robot availability alone would miss this failure.']);
      const score = Math.max(0, Math.round(((EX2.need.length - miss.length) / EX2.need.length) * 80 + Math.min(20, help.length * 7) - noise.length * 8));
      out.e2 = `<div class="docres"><p><b>${score}/100</b></p>${fb.map(([k, t]) => `<p class="${k}">${k === 'ok' ? '✓' : k === 'bad' ? '✕' : 'ℹ'} ${esc(t)}</p>`).join('')}</div>`; record('Failure-pattern dashboard', score); draw(); return;
    }
    if (b.dataset.up) { const i = +b.dataset.up; if (i > 0) [order[i - 1], order[i]] = [order[i], order[i - 1]]; save('ex3', { order, excl: [...excl] }); draw(); return; }
    if (b.dataset.down) { const i = +b.dataset.down; if (i < order.length - 1) [order[i + 1], order[i]] = [order[i], order[i + 1]]; save('ex3', { order, excl: [...excl] }); draw(); return; }
    if (b.dataset.ex) { excl.has(b.dataset.ex) ? excl.delete(b.dataset.ex) : excl.add(b.dataset.ex); save('ex3', { order, excl: [...excl] }); draw(); return; }
    if (b.dataset.e3check !== undefined) {
      const seq = order.filter((id) => !excl.has(id)); const idx = (id) => seq.indexOf(id); const fb = []; let pen = 0;
      for (const s of STEPS.filter((x) => x.kind === 'bad')) if (!excl.has(s.id)) { fb.push(['bad', `Unnecessary action included: “${s.t}” — ${s.why}`]); pen += 15; }
      for (const s of STEPS.filter((x) => x.kind !== 'bad')) if (excl.has(s.id)) { fb.push(['bad', `Needed step excluded: “${s.t}”.`]); pen += 10; }
      if (idx('a') !== 0) { fb.push(['bad', 'Start by confirming the report and scope (observe before acting).']); pen += 8; }
      const firstAct = idx('f'); for (const r of ['b', 'c', 'd']) if (idx(r) > firstAct && firstAct >= 0) { fb.push(['bad', `Read-only check “${STEPS.find((x) => x.id === r).t}” comes after acting — you would act without evidence.`]); pen += 8; }
      if (idx('e') > firstAct && firstAct >= 0) { fb.push(['bad', 'Preserve evidence before the state-changing action.']); pen += 8; }
      if (idx('g') < firstAct) { fb.push(['bad', 'Verification must come after the mitigation.']); pen += 10; }
      if (idx('h') !== seq.length - 1) { fb.push(['bad', 'Documentation is usually finalized last (notes are taken throughout).']); pen += 4; }
      if (!fb.length) fb.push(['ok', 'Efficient and safe: observe → read-only checks → discriminate → preserve → act → verify → document.']);
      const score = Math.max(0, 100 - pen);
      out.e3 = `<div class="docres"><p><b>${score}/100</b></p>${fb.map(([k, t]) => `<p class="${k}">${k === 'ok' ? '✓' : '✕'} ${esc(t)}</p>`).join('')}</div>`; record('Diagnostic step order', score); draw(); return;
    }
    if (b.dataset.e5check !== undefined) {
      const fb = []; let score = 0;
      EX5.forEach((p, pi) => { const sel = s5[pi] || []; const disc = p.opts.filter((o) => o[2] === 'disc'); const got = disc.filter((o) => sel.includes(o[0])); const bad = p.opts.filter((o) => o[2] === 'no' && sel.includes(o[0])); const neu = p.opts.filter((o) => o[2] === 'neutral' && sel.includes(o[0]));
        score += (got.length / disc.length) * 50 - bad.length * 8;
        fb.push(['ok', `${p.pair}: ${got.length}/${disc.length} discriminating signals chosen${got.length < disc.length ? ` (missing: ${disc.filter((o) => !sel.includes(o[0])).map((o) => o[1]).join(', ')})` : ''}.`]);
        for (const o of bad) fb.push(['bad', `${o[1]} does not differ between the two causes.`]);
        for (const o of neu) fb.push(['muted', `${o[1]}: ${o[3]}`]); });
      score = Math.max(0, Math.round(score));
      out.e5 = `<div class="docres"><p><b>${score}/100</b></p>${fb.map(([k, t]) => `<p class="${k}">${k === 'ok' ? '•' : k === 'bad' ? '✕' : 'ℹ'} ${esc(t)}</p>`).join('')}</div>`; record('Discriminating telemetry', score); draw();
    }
  };
  draw();
  return {};
}
