// Walkthrough 5 — Data-driven improvement prioritization (SIMULATED history).
import { esc, uid } from '../util.js';
import { incidentHistory, CATEGORIES, CANDIDATES, followUp } from '../sim/history.js';
import { store } from '../store.js';
import { rich, toast, SIM_NOTE } from './common.js';

const CONF_W = { high: 1, medium: 0.7, low: 0.4 };

function bars(data, { unit = '', w = 560, color = '#0072B2', pareto = false } = {}) {
  const max = Math.max(1, ...data.map((d) => d.v)); const bh = 20; const h = data.length * (bh + 6) + 24; const lx = 210;
  const total = data.reduce((a, d) => a + d.v, 0); let cum = 0;
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${pareto ? 'Pareto chart' : 'bar chart'}">${data.map((d, i) => { cum += d.v; const y = i * (bh + 6) + 4; const bw = ((w - lx - 90) * d.v) / max; return `<text x="0" y="${y + 14}">${esc(d.label.slice(0, 32))}</text><rect x="${lx}" y="${y}" width="${Math.max(1, bw)}" height="${bh}" fill="${d.hl ? '#E69F00' : color}"><title>${esc(d.label)}: ${Math.round(d.v)} ${unit}</title></rect><text x="${lx + bw + 4}" y="${y + 14}">${Math.round(d.v)}${unit ? ' ' + unit : ''}${pareto ? ` · cum ${Math.round((cum / total) * 100)}%` : ''}</text>`; }).join('')}${pareto ? `<text x="0" y="${h - 4}" class="small">Sorted by impact; “cum” = cumulative share. Categories above ~80% cumulative are the vital few.</text>` : ''}</svg>`;
}
function scatter(points) {
  const W = 560, H = 260, p = 36; const mx = Math.max(...points.map((x) => x.f)), my = Math.max(...points.map((x) => x.i));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="frequency versus mean impact"><line class="axis" x1="${p}" y1="${H - p}" x2="${W - 10}" y2="${H - p}"/><line class="axis" x1="${p}" y1="10" x2="${p}" y2="${H - p}"/><text x="${W / 2 - 60}" y="${H - 6}">frequency (incidents / 90 days) →</text><text x="4" y="12">mean orders affected ↑</text>
  ${points.map((x) => { const cx = p + (x.f / mx) * (W - p - 30), cy = H - p - (x.i / my) * (H - p - 20); return `<circle cx="${cx}" cy="${cy}" r="6" fill="#0072B2"/><text x="${cx + 8}" y="${cy + 4}">${esc(x.label.split(' ')[0])}${x.label.split(' ')[1] ? ' ' + esc(x.label.split(' ')[1]) : ''}</text>`; }).join('')}
  <text x="${W - 150}" y="${H - p - 6}" class="small">frequent · low impact</text><text x="${p + 6}" y="24" class="small">rare · high impact</text></svg>`;
}

export function render(root) {
  const st = store.get();
  const pr = st.priorities || (st.priorities = { measure: 'orders', dedupe: true, includeLow: true, cands: Object.fromEntries(CANDIDATES.map((c) => [c.id, { effort: c.effort, reduction: c.reduction }])), ranking: CANDIDATES.map((c) => c.id), justification: '', implemented: null, causalAnswer: null });
  let metric = 'orders';

  function rows() { return incidentHistory().filter((x) => (!pr.dedupe || !x.parent) && (pr.includeLow || x.confidence !== 'low')); }
  function byCat(m) { const o = {}; for (const x of rows()) { o[x.category] = (o[x.category] || 0) + (m === 'count' ? 1 : x[m]); } return CATEGORIES.map((c) => ({ id: c.id, label: c.label, v: o[c.id] || 0 })); }
  function method() {
    const all = rows(); const out = [];
    for (const c of CANDIDATES) {
      const cfg = pr.cands[c.id]; const inc = all.filter((x) => x.category === c.covers);
      const impact = inc.reduce((a, x) => a + x[pr.measure], 0);
      const conf = inc.length ? inc.reduce((a, x) => a + CONF_W[x.confidence], 0) / inc.length : 0;
      const benefit = impact * (cfg.reduction / 100) * conf;
      out.push({ ...c, impact, conf, benefit, effort: cfg.effort, reduction: cfg.reduction, score: benefit / Math.max(0.5, cfg.effort), n: inc.length });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  function draw() {
    const data = byCat(metric).sort((a, b) => b.v - a.v);
    const m = method();
    const all = incidentHistory();
    const dupCount = all.filter((x) => x.parent).length;
    const pts = CATEGORIES.map((c) => { const inc = rows().filter((x) => x.category === c.id); return { label: c.label, f: inc.length, i: inc.length ? inc.reduce((a, x) => a + x.orders, 0) / inc.length : 0 }; });
    const fu = pr.implemented ? followUp(pr.implemented) : null;
    root.innerHTML = `<div class="card"><span class="eyebrow">Walkthrough 5 ${SIM_NOTE}</span><h2>Use operational data to prioritize improvements</h2>
      <p>${rich('90 days of simulated incident records. Decide which improvements to fund first — and show your evidence. A [[Pareto]] view shows which categories contribute most to measured impact.')}</p>
      <div class="lesson"><b>Data quality first.</b> ${dupCount} records are <i>symptom tickets</i> (“robot offline”) that duplicate a parent network incident — counting them inflates Wi-Fi impact. Zone D had no network exporter before day 40, so zone D Wi-Fi incidents are under-reported (missing/biased data). Some inventory records have low evidence confidence.
        <div class="btnrow"><label class="chip"><input type="checkbox" id="dd" ${pr.dedupe ? 'checked' : ''}> De-duplicate symptom tickets (count each event once)</label><label class="chip"><input type="checkbox" id="lowc" ${pr.includeLow ? 'checked' : ''}> Include low-confidence records</label></div></div>
      <label>Chart metric <select id="met">${[['count', 'Incident frequency'], ['downtime', 'Total downtime (min)'], ['orders', 'Orders affected'], ['recovery', 'Total recovery time (min)'], ['lostTasks', 'Lost tasks (overlaps downtime!)']].map(([v, l]) => `<option value="${v}" ${metric === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <h4>Pareto: ${esc(metric)}</h4>${bars(data, { pareto: true })}
      <h4>Frequent-low-impact vs rare-high-impact</h4>${scatter(pts)}
      <p class="small">Repeat failures (same category & zone within 14 days): ${CATEGORIES.map((c) => { const n = rows().filter((x) => x.category === c.id && x.repeat).length; return n ? `${c.label.split(' ')[0]} ${n}` : ''; }).filter(Boolean).join(' · ') || 'none'}</p>
      <details><summary>Raw records (${rows().length} shown)</summary><div class="scroll"><table class="data"><thead><tr><th>ID</th><th>Day</th><th>Category</th><th>Down (min)</th><th>Orders</th><th>Lost tasks</th><th>Recovery</th><th>Repeat</th><th>Confidence</th><th>Parent</th><th>Zone</th></tr></thead><tbody>${rows().map((x) => `<tr><td>${x.id}</td><td>${x.day + 1}</td><td>${esc(x.label)}</td><td>${x.downtime}</td><td>${x.orders}</td><td>${x.lostTasks}</td><td>${x.recovery}</td><td>${x.repeat ? 'yes' : ''}</td><td>${x.confidence}</td><td>${x.parent || ''}</td><td>${x.zone}</td></tr>`).join('')}</tbody></table></div></details></div>

    <div class="card"><h3>Transparent prioritization method (editable)</h3>
      <p><b>Score = impact × expected reduction × evidence confidence ÷ effort.</b> Impact uses <b>one</b> measure only. ${rich('Downtime and lost tasks overlap (lost tasks ≈ downtime × throughput), so adding both would count the same harm twice.')}</p>
      <label>Impact measure (choose one) <select id="meas">${[['orders', 'Orders affected'], ['downtime', 'Downtime minutes'], ['lostTasks', 'Lost tasks']].map(([v, l]) => `<option value="${v}" ${pr.measure === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="small muted">Assumptions: past 90 days predict the next 90; reductions are estimates (edit them); confidence weights high 1.0 / medium 0.7 / low 0.4; effort in person-days (estimates); categories are independent (a fix to one does not change another).</p>
      <div class="scroll"><table class="data"><thead><tr><th>Candidate</th><th>Covers</th><th>Incidents</th><th>Impact</th><th>Reduction %</th><th>Confidence</th><th>Effort (days)</th><th>Score</th></tr></thead><tbody>${m.map((c, i) => `<tr><td>${i + 1}. ${esc(c.label)}</td><td>${esc(CATEGORIES.find((x) => x.id === c.covers).label)}</td><td>${c.n}</td><td>${Math.round(c.impact)}</td><td><input type="number" data-red="${c.id}" value="${c.reduction}" min="0" max="100" style="width:70px"></td><td>${c.conf.toFixed(2)}</td><td><input type="number" data-eff="${c.id}" value="${c.effort}" min="1" style="width:70px"></td><td><b>${c.score.toFixed(1)}</b></td></tr>`).join('')}</tbody></table></div></div>

    <div class="card"><h3>Your ranking</h3><p>Rank the candidates yourself (before looking too hard at the method's order) and justify the top three with evidence (numbers from the charts).</p>
      <ol class="sortable">${pr.ranking.map((id, i) => `<li><span>${i + 1}.</span> ${esc(CANDIDATES.find((c) => c.id === id).label)} <span style="margin-left:auto"></span><button class="btn small" data-up="${i}" aria-label="Move up">▲</button><button class="btn small" data-down="${i}" aria-label="Move down">▼</button></li>`).join('')}</ol>
      <label>Justification <textarea id="just" rows="4" placeholder="e.g. Release regressions are rare (2 in 90 days) but caused ~600 affected orders…">${esc(pr.justification)}</textarea></label>
      <button class="btn primary" data-rankcheck>Check my ranking</button><div id="rfb"></div></div>

    <div class="card"><h3>Implement an improvement and compare periods</h3>
      <label>Implement (simulated) <select id="impl">${CANDIDATES.map((c) => `<option value="${c.id}" ${pr.implemented === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label><button class="btn" data-impl>Implement & collect 30 days</button>
      ${fu ? `<table class="data"><thead><tr><th>Category</th><th>Baseline (30 d)</th><th>Follow-up (30 d)</th><th>Per 10k orders: baseline → follow-up</th></tr></thead><tbody>${CATEGORIES.map((c) => { const b = fu.baseline[c.id] || 0, f = fu.followup[c.id] || 0; return `<tr ${c.id === fu.covers ? 'style="font-weight:700"' : ''}><td>${esc(c.label)}</td><td>${b}</td><td>${f}</td><td>${(b / fu.orders.baseline * 10000).toFixed(2)} → ${(f / fu.orders.followup * 10000).toFixed(2)}</td></tr>`; }).join('')}</tbody></table>
        <p class="small">Workload differs: ${fu.orders.baseline.toLocaleString()} orders (baseline) vs ${fu.orders.followup.toLocaleString()} (follow-up). Raw counts mislead — compare rates per 10,000 orders.</p>
        <fieldset><legend>Does this comparison prove the improvement caused the change?</legend>${[['yes', 'Yes — the numbers went down after we implemented it.'], ['no', 'Not on its own — 30 days is short, counts are small, workload/season and other changes differ, and rare events vary by chance (regression to the mean). It is supporting evidence; confirm with a longer period, a comparable control area, or the mechanism (fewer of the specific failure).']].map(([v, l]) => `<label class="opt"><input type="radio" name="caus" value="${v}" ${pr.causalAnswer === v ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset><div id="cfb">${pr.causalAnswer ? (pr.causalAnswer === 'no' ? '<p class="ok">✓ Correct. A short-term improvement does not automatically prove causation.</p>' : '<p class="bad">✕ Before/after alone is correlation. See the other answer for why.</p>') : ''}</div>` : ''}
    </div>`;
  }
  root.onchange = (e) => {
    const t = e.target;
    if (t.id === 'met') { metric = t.value; draw(); return; }
    if (t.id === 'meas') { pr.measure = t.value; save(); draw(); return; }
    if (t.id === 'dd') { pr.dedupe = t.checked; save(); draw(); return; }
    if (t.id === 'lowc') { pr.includeLow = t.checked; save(); draw(); return; }
    if (t.dataset.red) { pr.cands[t.dataset.red].reduction = +t.value; save(); draw(); return; }
    if (t.dataset.eff) { pr.cands[t.dataset.eff].effort = +t.value; save(); draw(); return; }
    if (t.name === 'caus') { pr.causalAnswer = t.value; save(); draw(); return; }
    if (t.id === 'just') { pr.justification = t.value; save(); }
  };
  function save() { store.update((s) => { s.priorities = pr; }); }
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.up) { const i = +b.dataset.up; if (i > 0) [pr.ranking[i - 1], pr.ranking[i]] = [pr.ranking[i], pr.ranking[i - 1]]; save(); draw(); return; }
    if (b.dataset.down) { const i = +b.dataset.down; if (i < pr.ranking.length - 1) [pr.ranking[i + 1], pr.ranking[i]] = [pr.ranking[i], pr.ranking[i + 1]]; save(); draw(); return; }
    if (b.dataset.impl !== undefined) { pr.implemented = root.querySelector('#impl').value; pr.causalAnswer = null; save(); draw(); return; }
    if (b.dataset.rankcheck !== undefined) {
      pr.justification = root.querySelector('#just').value; save();
      const m = method().map((c) => c.id); const top3 = pr.ranking.slice(0, 3); const mTop3 = m.slice(0, 3);
      const overlap = top3.filter((x) => mTop3.includes(x)).length;
      let disp = 0; pr.ranking.forEach((id, i) => { disp += Math.abs(i - m.indexOf(id)); });
      const j = pr.justification; const fb = [];
      const hasNums = (j.match(/\d+/g) || []).length >= 3; const mentionsConf = /confiden|uncertain|low.?quality|estimate/i.test(j); const mentionsEffort = /effort|days|cost/i.test(j); const mentionsDup = /duplicat|double|symptom ticket|overlap/i.test(j);
      fb.push([hasNums, 'Uses numbers from the data (≥ 3)']); fb.push([mentionsEffort, 'Considers effort']); fb.push([mentionsConf, 'Mentions evidence confidence or uncertainty']); fb.push([mentionsDup || pr.dedupe, 'Avoids counting the same event twice (de-duplication)']);
      const score = Math.round(overlap / 3 * 40 + Math.max(0, 30 - disp * 1.5) + fb.filter((x) => x[0]).length * 7.5);
      root.querySelector('#rfb').innerHTML = `<div class="docres"><p><b>${Math.min(100, score)}/100</b> — your top 3 shares ${overlap}/3 with the method's top 3 (${mTop3.map((id) => esc(CANDIDATES.find((c) => c.id === id).label.split(' ').slice(0, 3).join(' '))).join('; ')}). Disagreeing with the method is fine <i>if your justification explains why</i> (e.g. you distrust an estimate).</p>${fb.map(([ok, l]) => `<p class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✕'} ${esc(l)}</p>`).join('')}<p class="muted small">Rules-based checklist; it cannot judge the quality of your argument. Note: the method only re-orders what you measured — missing data (zone D Wi-Fi) means some categories may be under-ranked.</p></div>`;
      store.update((s) => { s.attempts.push({ id: uid('w5'), scenarioId: 'w5', title: 'W5 · Improvement ranking', walkthrough: 'W5', mode: s.settings.mode, started: Date.now(), ended: Date.now(), total: Math.min(100, score), skills: { system: Math.min(100, score), observability: Math.min(100, score) }, critical: [], cats: [] }); s.walkthroughs.W5 = { done: true }; });
      toast('Ranking scored and saved to progress.');
    }
  };
  draw();
  return {};
}
