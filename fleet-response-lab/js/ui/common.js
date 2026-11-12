// Shared UI helpers. All content describes a SIMULATED, fictional facility.
import { esc } from '../util.js';
import { GLOSSARY, termKey } from '../glossary.js';
import { store } from '../store.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export let viewStart = Date.now();
export function markViewStart() { viewStart = Date.now(); }

/** Escape text, then turn [[term]] into glossary chips; first meeting shows the definition inline. */
export function rich(text) {
  return esc(text).replace(/\[\[([^\]]+)\]\](\w*)/g, (_, t, suf) => {
    const k = termKey(t);
    if (!k) return esc(t) + suf;
    const st = store.get();
    const first = !st.seenTerms[k] || st.seenTerms[k] >= viewStart;
    if (!st.seenTerms[k]) { st.seenTerms[k] = Date.now(); queueSave(); }
    return `<button type="button" class="term" data-term="${esc(k)}" aria-label="Glossary: ${esc(k)}">${esc(t)}${suf}</button>${first ? `<span class="def"> (${esc(GLOSSARY[k].def)})</span>` : ''}`;
  });
}
let saveTimer = null;
function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.update(() => {}), 400); }

document.addEventListener('click', (e) => {
  const b = e.target.closest('.term'); if (!b) return;
  e.preventDefault();
  const k = b.dataset.term; const g = GLOSSARY[k];
  showPopover(b, `<b>${esc(k)}</b><p>${esc(g.def)}</p><p class="muted small">${g.verify ? 'General concept — the exact procedure at a real employer must be verified.' : 'General concept (not employer-specific).'}</p>`);
});

let pop = null;
export function showPopover(anchor, html) {
  pop?.remove();
  pop = document.createElement('div'); pop.className = 'popover'; pop.setAttribute('role', 'dialog'); pop.innerHTML = html + '<button class="btn small" data-close>Close</button>';
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const x = Math.min(window.innerWidth - pop.offsetWidth - 8, Math.max(8, r.left));
  const y = r.bottom + 6 + pop.offsetHeight > window.innerHeight ? r.top - pop.offsetHeight - 6 : r.bottom + 6;
  pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
  pop.querySelector('[data-close]').onclick = () => pop.remove();
  pop.querySelector('[data-close]').focus();
  setTimeout(() => document.addEventListener('click', function h(ev) { if (!pop?.contains(ev.target)) { pop?.remove(); document.removeEventListener('click', h); } }), 0);
}

export function toast(msg, kind = 'info') {
  const t = document.createElement('div'); t.className = `toast ${kind}`; t.setAttribute('role', 'status'); t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 5200);
}

export function modal(title, bodyHtml, buttons = [{ label: 'Close', value: null }]) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div'); wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt">${esc(title)}</h2><div class="modal-body">${bodyHtml}</div><div class="modal-actions">${buttons.map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    document.body.appendChild(wrap);
    const prev = document.activeElement;
    const close = (v) => { wrap.remove(); prev?.focus?.(); resolve(v); };
    wrap.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => close({ value: buttons[+b.dataset.i].value, root: wrap }));
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(null); });
    (wrap.querySelector('.btn.primary') || wrap.querySelector('[data-i]')).focus();
  });
}

// ---------------------------------------------------------------- captions & narration
let lastCaption = '';
export function caption(text, opts = {}) {
  const st = store.get().settings;
  const el = document.getElementById('caption');
  lastCaption = text;
  if (el) { el.textContent = st.captions ? text : ''; el.hidden = !st.captions || !text; }
  if (st.narration && opts.speak !== false && 'speechSynthesis' in window) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/\[\[|\]\]/g, '')); u.rate = 1; speechSynthesis.speak(u); } catch { /* optional */ }
  }
}
export function refreshCaption() { caption(lastCaption, { speak: false }); }

// ---------------------------------------------------------------- explain-on-demand
export function explainBlock(meta, isOp = false) {
  if (!meta) return '';
  const rows = [['What it does', meta.what], ['When to use it', meta.when], ['Evidence it produces', meta.evidence || (isOp ? 'An audit entry and changed system state (watch the results).' : '')], ['Limitations', meta.limits], ['Effect on operations', meta.ops || meta.impact]];
  if (isOp) rows.push(['Prerequisites', meta.prereq], ['Evidence to preserve first', meta.preserve], ['Rollback option', meta.rollback]);
  return `<details class="explain"><summary>Explain this action</summary><dl>${rows.filter((r) => r[1]).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${rich(v)}</dd>`).join('')}</dl></details>`;
}

// ---------------------------------------------------------------- prediction widget
/** Renders a prediction form. onReveal({choice, why}) is called only after the learner commits. */
export function predictionForm(container, predict, onReveal, opts = {}) {
  const id = 'p' + Math.floor(Math.random() * 1e9);
  container.innerHTML = `<form class="predict" aria-label="Prediction before revealing the result">
    <p class="q"><b>Predict first:</b> ${rich(predict.question)}</p>
    <div class="opts">${predict.options.map(([k, l]) => `<label class="opt"><input type="radio" name="${id}" value="${esc(k)}"> ${esc(l)}</label>`).join('')}</div>
    <label class="why">Why do you expect that? <textarea rows="2" required minlength="8" placeholder="e.g. Because the robot stopped in one place repeatedly…"></textarea></label>
    <div class="row"><button class="btn primary" type="submit">Reveal result</button>${opts.cancel ? '<button class="btn" type="button" data-cancel>Cancel</button>' : ''}</div>
    <p class="muted small">Committing to a prediction (and a reason) before seeing data is how you build diagnostic intuition. Wrong predictions are added to your review queue — that is normal and useful.</p>
  </form>`;
  const f = container.querySelector('form');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const choice = f.querySelector(`input[name="${id}"]:checked`)?.value;
    const why = f.querySelector('textarea').value.trim();
    if (!choice) { toast('Choose what you expect first.', 'warn'); return; }
    if (why.split(/\s+/).length < 3) { toast('Add a short reason (a few words) for your prediction.', 'warn'); return; }
    onReveal({ choice, why, label: predict.options.find((o) => o[0] === choice)?.[1] });
  });
  f.querySelector('[data-cancel]')?.addEventListener('click', () => opts.cancel());
  f.querySelector('input')?.focus();
}

export function evidenceTable(ev) {
  return `<table class="kv">${(ev.rows || []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
}

export function statusPill(ok, textOk = 'PASS', textBad = 'FAIL') {
  return ok ? `<span class="pill ok">✓ ${textOk}</span>` : `<span class="pill bad">✕ ${textBad}</span>`;
}

export function sparkline(values, { w = 140, h = 34, color = 'currentColor' } = {}) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return `<svg width="${w}" height="${h}" role="img" aria-label="not enough data"><text x="4" y="${h / 2 + 4}" font-size="11" fill="currentColor" opacity=".6">not enough data</text></svg>`;
  const mn = Math.min(...v), mx = Math.max(...v), rg = mx - mn || 1;
  const pts = values.map((x, i) => x == null ? null : `${(i / (values.length - 1)) * (w - 4) + 2},${h - 3 - ((x - mn) / rg) * (h - 6)}`).filter(Boolean).join(' ');
  return `<svg width="${w}" height="${h}" role="img" aria-label="trend from ${Math.round(v[0])} to ${Math.round(v[v.length - 1])}"><polyline fill="none" stroke="${color}" stroke-width="1.8" points="${pts}"/></svg>`;
}

export function downloadText(name, text, mime = 'text/markdown') {
  const blob = new Blob([text], { type: mime }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

export const SIM_NOTE = '<span class="simtag" title="Everything here is a fictional training simulation">SIMULATED</span>';
