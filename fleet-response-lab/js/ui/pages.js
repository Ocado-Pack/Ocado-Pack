// Static-ish pages: glossary, accuracy & scope, settings, equipment packs.
import { esc } from '../util.js';
import { GLOSSARY } from '../glossary.js';
import { store } from '../store.js';
import { rich, toast, SIM_NOTE } from './common.js';

export function renderGlossary(root) {
  let q = '';
  const draw = () => {
    const items = Object.entries(GLOSSARY).filter(([k, v]) => !q || (k + v.def).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a[0].localeCompare(b[0]));
    root.innerHTML = `<div class="card"><h2>Glossary</h2><p class="muted small">Plain-language definitions. In lessons, a term’s definition appears inline the first time you meet it; afterwards it is a clickable chip.</p>
      <label>Search <input type="text" id="gq" value="${esc(q)}"></label>
      <dl>${items.map(([k, v]) => `<dt><b>${esc(k)}</b> ${v.verify ? '<span class="tag">general + to verify</span>' : '<span class="tag">general concept</span>'}</dt><dd>${esc(v.def)}</dd>`).join('')}</dl></div>`;
    const inp = root.querySelector('#gq'); inp.oninput = (e) => { q = e.target.value; draw(); const n = root.querySelector('#gq'); n.focus(); n.setSelectionRange(q.length, q.length); };
  };
  draw(); return {};
}

const RESP = [
  ['Diagnose and resolve issues in an order-fulfillment robot fleet', 'Walkthrough 1, first incident, W6', 'Evidence-based diagnosis, recovery verification scores'],
  ['Investigate robotics and fulfillment software problems', 'Walkthrough 2 (console, tracing, sandbox, 6 incidents)', 'Software investigation score'],
  ['Develop observability tools that make production issues easier to detect and mitigate', 'Walkthrough 3 (dashboard, view builder, alert designer), reverse-build #2', 'Observability score'],
  ['Document system operation and issue resolution for support and engineering', 'Walkthrough 4 (notebook, runbook + technician test, collaboration, unknown cause)', 'Documentation score'],
  ['Use operational data to prioritize improvements', 'Walkthrough 5 (Pareto, method, ranking, before/after)', 'System understanding score'],
  ['Provide timely support to operations teams and improve robot and system performance', 'Walkthrough 6 (live ops, updates, escalation)', 'Operations communication score'],
];
export function renderAbout(root) {
  root.innerHTML = `<div class="card"><span class="eyebrow">Accuracy & scope ${SIM_NOTE}</span><h2>What is simulated, what is general, what to verify</h2>
    <h3>Simulated (invented for training)</h3>
    <ul><li>The facility, its layout, robot design (R-01…R-12), stations, chargers, access points and staff names.</li><li>All telemetry values, log formats, error codes, service names (order-service, task-scheduler, fleet-manager, inventory-service, station-service, robot-gateway), APIs, configuration keys, release numbers and console commands.</li><li>All procedures and actions: they are performed by fictional staff and only change the simulation.</li><li>Historical incident datasets, effort estimates and improvement results.</li></ul>
    <p>This app does <b>not</b> reproduce any company’s proprietary robots, software, interfaces, commands, architecture or procedures — including any employer you may be preparing for. It is not affiliated with or endorsed by any employer.</p>
    <h3>General concepts (widely used, transferable)</h3>
    <ul><li>Symptom vs cause, hypotheses, discriminating tests, correlation vs causation.</li><li>Metrics, logs, traces; thresholds, durations, false positives/negatives; p95 latency; “no data” vs zero.</li><li>Timeouts, retries, exponential backoff, idempotency keys, correlation IDs, clock skew and ingest time.</li><li>Controlled stops, E-stops, isolation, evidence preservation, rollback, recovery verification, runbooks, escalation with evidence.</li><li>Pareto analysis, avoiding double counting, normalizing by workload, short-term improvement ≠ proof of causation.</li></ul>
    <h3>Employer-specific — TO VERIFY</h3>
    <ul><li>Robot hardware, sensors, localization method, charging design and their real limits.</li><li>Fleet/task software architecture, interfaces, log formats, dashboards and alerting tools actually used.</li><li>Lockout/tagout, E-stop reset authority, robot recovery and maintenance procedures, and who may perform them.</li><li>Which actions a support engineer is authorized to take (restarts, rollbacks, config changes, isolations).</li><li>Escalation paths, on-call rules, incident severity definitions, documentation templates and SLAs.</li></ul>
    <h3>Responsibilities practiced here</h3>
    <table class="data"><thead><tr><th>Responsibility</th><th>Where you practice it</th><th>Evidence produced</th></tr></thead><tbody>${RESP.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Completing this app is practice, not professional experience or certification. When discussing it, say “in a simulated training environment”.</p>
    <h3>Safety</h3><p>${rich('Nothing here instructs you to bypass interlocks, defeat protective devices, enter an active robot area, or perform energized repairs. In a real facility follow your employer-approved procedures.')}</p></div>`;
  return {};
}

export function renderSettings(root) {
  const draw = () => {
    const s = store.get().settings;
    root.innerHTML = `<div class="card"><h2>Settings</h2>
      <label>Rendering quality <select data-s="quality">${[['auto', 'Auto (based on your display)'], ['low', 'Low — fastest, no shadows, 1× pixels'], ['medium', 'Medium — soft shadows, up to 1.5× pixels'], ['high', 'High — 2× pixels (crisp on HiDPI)'], ['ultra', 'Ultra — up to 3× pixels, 4K-capable, large shadow maps']].map(([v, l]) => `<option value="${v}" ${s.quality === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="small muted">Text labels in the 3D view are HTML, so they stay crisp and readable at any setting. Antialiasing changes apply after a page reload.</p>
      <label class="chip"><input type="checkbox" data-b="reducedMotion" ${s.reducedMotion ? 'checked' : ''}> Reduced motion (no camera fly-throughs or smoothing; respects your OS setting by default)</label>
      <label class="chip"><input type="checkbox" data-b="captions" ${s.captions ? 'checked' : ''}> Captions</label>
      <label class="chip"><input type="checkbox" data-b="narration" ${s.narration ? 'checked' : ''}> Narration (browser text-to-speech, optional)</label>
      <label class="chip"><input type="checkbox" data-b="highContrast" ${s.highContrast ? 'checked' : ''}> High contrast panels</label>
      <label>Text size <select data-s="textScale">${[[0.9, '90%'], [1, '100%'], [1.15, '115%'], [1.3, '130%'], [1.5, '150%']].map(([v, l]) => `<option value="${v}" ${+s.textScale === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Default coaching mode <select data-s="mode">${[['guided', 'Guided — step-by-step coaching'], ['assisted', 'Assisted — objectives + optional hints'], ['assessment', 'Assessment — independent, feedback afterwards']].map(([v, l]) => `<option value="${v}" ${s.mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <h3>Controls</h3><ul class="small"><li>Camera: O overview · R orbit · F first-person · P pause/resume.</li><li>Orbit: drag rotate, wheel/pinch zoom, right-drag/two-finger pan. Click a robot or label to focus; or use the Focus list.</li><li>First-person: drag to look; W/A/S/D or arrows to move (←/→ turn); Shift faster; on touch screens use the on-screen pad.</li><li>Every 3D interaction has a panel/list alternative.</li></ul>
      <p><a href="#/progress">Reset or export progress</a></p></div>`;
  };
  root.onchange = (e) => { const t = e.target; store.update((st) => { if (t.dataset.s) st.settings[t.dataset.s] = t.dataset.s === 'textScale' ? +t.value : t.value; if (t.dataset.b) st.settings[t.dataset.b] = t.checked; }); window.dispatchEvent(new Event('settings-changed')); toast('Saved.'); };
  draw(); return {};
}

const PACKS = [
  { id: 'mobile', name: 'Mobile robots', core: true, desc: 'Fictional autonomous mobile robots: drive, encoders, obstacle & localization sensors, E-stop, controller, Wi-Fi, payload lift.', scenarios: 'First incident, W1, W2', verify: 'Real robot model, sensors and service procedures.' },
  { id: 'stations', name: 'Picking stations', desc: 'Fictional stations with scanner, HMI and light tower; station-service readiness.', scenarios: 'W2 station incident, W6', verify: 'Real station hardware and operator procedures.' },
  { id: 'charging', name: 'Charging systems', desc: 'Floor-plate docks with contacts; per-dock output current.', scenarios: 'W1 charging incident, W6 capstone', verify: 'Real charger design, currents and maintenance.' },
  { id: 'network', name: 'Industrial networking', desc: 'Five access points / zones, heartbeats, disconnect exporter (zone D not instrumented).', scenarios: 'W1 network incident, W2 duplicates, W4 unknown cause', verify: 'Real network design and who may change it.' },
  { id: 'conveyors', name: 'Conveyors', desc: 'Concept-only pack: a [[conveyor]] moves totes; a [[photo-eye]] detects jams; full-belt conditions can make stations report “not ready”. No 3D model or scenario is included in this pack — details shown only as general concepts.', scenarios: 'Concept cards only', verify: 'Everything about real conveyors on site.' },
  { id: 'plc', name: 'PLC / HMI / VFD interfaces', desc: 'Concept-only pack: a [[PLC]] runs equipment logic; an [[HMI]] shows status locally; a [[VFD]] controls motor speed. Typical support tasks: read HMI alarms, compare with software status, escalate to controls engineers. No vendor screens are imitated.', scenarios: 'Concept cards only (station HMI comparison appears in W2)', verify: 'PLC/HMI/VFD models, access rights and procedures — never change PLC logic without authorization.' },
];
export function renderPacks(root) {
  const draw = () => {
    const p = store.get().settings.packs;
    root.innerHTML = `<div class="card"><h2>Optional equipment packs</h2><p>${rich('Scenarios are modular by equipment pack. Only details supported by the selected fictional pack (or material you provide) are shown. Employer-specific procedures and specifications are always marked “to verify”.')}</p>
      ${PACKS.map((k) => `<div class="lesson"><label class="chip"><input type="checkbox" data-pk="${k.id}" ${p[k.id] ? 'checked' : ''} ${k.core ? 'disabled' : ''}> <b>${esc(k.name)}</b>${k.core ? ' (core)' : ''}</label><p class="small">${rich(k.desc)}</p><p class="small"><b>Used in:</b> ${esc(k.scenarios)} · <b>To verify:</b> ${esc(k.verify)}</p></div>`).join('')}
      <p class="small muted">Turning a pack off hides its scenarios from walkthrough lists (the shared simulation still runs, so nothing breaks).</p></div>`;
  };
  root.onchange = (e) => { const t = e.target; if (t.dataset.pk) { store.update((s) => { s.settings.packs[t.dataset.pk] = t.checked; }); toast('Saved.'); } };
  draw(); return {};
}
