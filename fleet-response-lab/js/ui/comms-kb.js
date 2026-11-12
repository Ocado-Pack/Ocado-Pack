// Knowledge base (SIMULATED). Seeded articles are fictional; your articles keep full revision history.
import { esc, uid } from '../util.js';
import { TEMPLATES, FIELDS, validateDoc, diffVersions } from '../comms/docs.js';
import { cs, saveComms } from '../comms/state.js';
import { toast, downloadText, SIM_NOTE } from './common.js';

const SEED = [
  { id: 'kb-s1', seeded: true, title: 'Reading the fleet dashboard: no data vs zero (simulated facility)', appliesTo: 'All shifts; fleet dashboard (simulated)', symptoms: 'A tile shows “No data” or a zone shows no disconnect count.', diagnostics: '1. Open the tile definition. Expected: definition, unit, window, source.\n2. If “No data”, check whether the source exists (zone D has no exporter). Expected: exporter status.', resolution: 'Treat “No data” as unknown, never as zero. Use another source (fleet-manager logs) to fill the gap.', limits: 'If a source that normally reports goes silent, escalate to the monitoring owner.', author: 'Support team (fictional)' },
  { id: 'kb-s2', seeded: true, title: 'Comms-loss safe stop on robots (simulated)', appliesTo: 'Robots that stop and resume, NO LINK label', symptoms: 'Robot shows NO LINK, stops for a few seconds, resumes; long losses abandon tasks before pick.', diagnostics: '1. Check robot wireless link. Expected: stable link, no disconnects.\n2. Group disconnects by zone and by firmware. Expected: no concentration.', resolution: 'If one zone: restrict the aisle and escalate to the network team. If one firmware: isolate those robots and escalate to robot maintenance.', limits: 'Escalate if disconnects affect more than one zone or persist after mitigation for 15 min.', author: 'Support team (fictional)' },
  { id: 'kb-s3', seeded: true, title: 'Charging problems — DRAFT (incomplete, simulated)', appliesTo: 'Robots not charging', symptoms: 'Battery not rising while docked.', diagnostics: 'Check the charger.', resolution: 'Reseat the robot.', limits: '', author: 'night shift (fictional)', draft: true },
];

export function render(root) {
  let sel = null; let editing = null;
  const c = cs();
  const all = () => [...SEED, ...c.kb.map((k) => ({ ...k.versions[k.versions.length - 1].fields, id: k.id, mine: true, versions: k.versions }))];
  function draw() {
    const art = all().find((a) => a.id === sel);
    root.innerHTML = `<div class="card"><span class="eyebrow">Knowledge base ${SIM_NOTE}</span><h2>Knowledge base & templates</h2>
      <p class="small">Fictional articles for the simulated facility. Seeded articles are examples (one is deliberately incomplete — compare it with the template). Your articles keep every version.</p>
      <div class="btnrow"><button class="btn primary small" data-new>New article from template</button>${Object.entries(TEMPLATES).map(([k, t]) => `<span class="tag">${esc(t.label)}</span>`).join(' ')}</div>
      <ul>${all().map((a) => `<li><a href="#" data-sel="${a.id}">${esc(a.title)}</a> ${a.seeded ? '<span class="tag">seeded</span>' : `<span class="tag ok">yours · v${a.versions.length}</span>`}${a.draft ? ' <span class="tag">draft</span>' : ''}</li>`).join('')}</ul></div>
      ${editing ? editor() : art ? view(art) : ''}`;
  }
  function view(a) {
    const v = validateDoc('kb', a, { evidenceIds: [], knownIds: null });
    return `<div class="card"><h3>${esc(a.title)}</h3>${TEMPLATES.kb.fields.filter((f) => f !== 'title').map((f) => `<h4>${esc(FIELDS[f].label)}</h4><p style="white-space:pre-wrap">${esc(a[f] || '—')}</p>`).join('')}
      <div class="docres small"><b>Template check:</b> ${v.items.map((i) => `<span class="${i.ok ? 'ok' : 'bad'}">${i.ok ? '✓' : '○'} ${esc(i.label)}</span>`).join(' · ')}</div>
      ${a.mine ? `<details><summary class="small">Revision history (${a.versions.length})</summary>${a.versions.map((x, i) => `<p class="small">v${i + 1} ${new Date(x.at).toLocaleString()} — ${esc(x.note)}${i ? ` (changed: ${diffVersions(a.versions[i - 1].fields, x.fields).map((d) => esc(FIELDS[d.key]?.label || d.key)).join(', ')})` : ''}</p>`).join('')}</details><div class="btnrow"><button class="btn small" data-edit="${a.id}">Revise</button><button class="btn small" data-exp="${a.id}">Export Markdown</button></div>` : ''}</div>`;
  }
  function editor() {
    const base = editing.fields;
    return `<div class="card"><h3>${editing.id ? 'Revise article' : 'New article'}</h3>${TEMPLATES.kb.fields.map((f) => `<label>${esc(FIELDS[f].label)}<textarea data-kb="${f}" rows="${f === 'diagnostics' ? 5 : 2}">${esc(base[f] || '')}</textarea></label>`).join('')}<label>Revision note<input type="text" id="kbNote"></label><button class="btn primary" data-kbsave>Save version</button> <button class="btn" data-cancel>Cancel</button></div>`;
  }
  root.onclick = (e) => {
    const a = e.target.closest('a[data-sel]'); if (a) { e.preventDefault(); sel = a.dataset.sel; editing = null; draw(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.new !== undefined) { editing = { id: null, fields: { author: '' } }; draw(); return; }
    if (b.dataset.edit) { const k = c.kb.find((x) => x.id === b.dataset.edit); editing = { id: k.id, fields: { ...k.versions[k.versions.length - 1].fields } }; draw(); return; }
    if (b.dataset.cancel !== undefined) { editing = null; draw(); return; }
    if (b.dataset.kbsave !== undefined) { const fields = Object.fromEntries([...root.querySelectorAll('[data-kb]')].map((x) => [x.dataset.kb, x.value])); const note = root.querySelector('#kbNote').value.trim(); if (editing.id && !note) { toast('Add a revision note.', 'warn'); return; } if (editing.id) c.kb.find((x) => x.id === editing.id).versions.push({ at: Date.now(), fields, note }); else { const id = uid('kb'); c.kb.push({ id, versions: [{ at: Date.now(), fields, note: note || 'created' }] }); editing.id = id; } sel = editing.id; editing = null; saveComms(); toast('Saved.'); draw(); return; }
    if (b.dataset.exp) { const k = c.kb.find((x) => x.id === b.dataset.exp); const f = k.versions[k.versions.length - 1].fields; downloadText(`kb-${(f.title || 'article').replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.md`, `# ${f.title}\n\n> SIMULATION-BASED TRAINING ARTIFACT — fictional facility.\n\n${TEMPLATES.kb.fields.filter((x) => x !== 'title').map((x) => `## ${FIELDS[x].label}\n${f[x] || ''}`).join('\n\n')}\n\n## Revision history\n${k.versions.map((v, i) => `- v${i + 1} ${new Date(v.at).toISOString()} — ${v.note}`).join('\n')}\n`); }
  };
  draw();
  return {};
}
