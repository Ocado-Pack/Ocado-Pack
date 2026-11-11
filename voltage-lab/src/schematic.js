// Schematic drawing for the control-circuit modules: one renderer for the
// editable workspace, the read-only repair circuit and review figures.
import { GRID, KINDS, termXY, termPos } from './ctl.js';
import { esc } from './i18n.js';

export const CELL = 44;
export const MX = 52; // left margin
export const MY = 44; // top margin
const px = (gx) => MX + gx * CELL;
const py = (gy) => MY + gy * CELL;

// Symbol for a horizontal component, 88 units long, terminals at x = 0 and x = 88.
// `closed`/`on` show the live state; without a runtime the reference state is drawn.
export function symbol(sym, o = {}) {
  const lead = '<path class="s-w" d="M0 0H30M58 0H88"/>';
  const closedNow = o.closed;
  if (sym === 'lamp') return `${lead}<circle class="s-b${o.on ? ' s-on' : ''}" cx="44" cy="0" r="14"/><path class="s-b" d="M34 -10L54 10M54 -10L34 10"/>${o.on ? '<path class="s-b" d="M44 -19V-26M44 19V26M24 0H18M70 0H64M30 -14L25 -19M58 -14L63 -19M30 14L25 19M58 14L63 19"/>' : ''}`;
  if (sym === 'coil') return `<path class="s-w" d="M0 0H28M60 0H88"/><rect class="s-b${o.on ? ' s-on' : ''}" x="28" y="-13" width="32" height="26"/>`;
  const nc = sym === 'nc' || sym === 'pb_nc' || sym === 'ol';
  let lever;
  if (nc) {
    const shut = closedNow === undefined ? true : closedNow;
    lever = `<path class="s-b" d="M58 0V-11"/><path class="s-b s-lever" d="M30 0L${shut ? '63 -11' : '57 9'}"/>`;
  } else {
    const shut = closedNow === undefined ? false : closedNow;
    lever = `<path class="s-b s-lever" d="M30 0L${shut ? '58 0' : '56 -13'}"/>`;
  }
  let extra = '<circle class="s-dot" cx="30" cy="0" r="2.5"/>';
  if (sym === 'pb_no' || sym === 'pb_nc') extra += '<path class="s-b s-thin" d="M44 -8V-24M36 -24H52" stroke-dasharray="3 2"/>';
  if (sym === 'ol') extra += '<path class="s-b s-thin" d="M44 -8V-17"/><rect class="s-b s-thin" x="39" y="-27" width="10" height="10"/>';
  return `${lead}${lever}${extra}`;
}

export function symbolSVG(sym, w = 96) {
  return `<svg class="sch sym" viewBox="-4 -32 96 62" width="${w}" role="img" aria-hidden="true">${symbol(sym)}</svg>`;
}

function route(a, b) {
  const [x1, y1] = a; const [x2, y2] = b;
  if (x1 === x2 || y1 === y2) return `M${x1} ${y1}L${x2} ${y2}`;
  const railFirst = a[2];
  return railFirst ? `M${x1} ${y1}H${x2}V${y2}` : `M${x1} ${y1}V${y2}H${x2}`;
}

// o: { labels, rt, sel, wireFrom, cursor, hi: {ids, terms}, edit, measure, loadSym, starter, texts }
export function schematicSVG(design, o = {}) {
  const R = o.rows === undefined ? GRID.rows : o.rows; // rows drawn (figures crop the empty ones)
  const W = MX * 2 + GRID.cols * CELL; const H = MY + R * CELL + (o.starter ? 84 : 40);
  const t = o.texts || {};
  const ref = (id) => (o.labels && o.labels[id] ? o.labels[id].ref : id);
  const out = [];
  // grid
  let dots = '';
  for (let x = 1; x < GRID.cols; x++) for (let y = 0; y <= R; y++) dots += `<circle class="s-grid" cx="${px(x)}" cy="${py(y)}" r="1.6"/>`;
  out.push(dots);
  if (o.cursor && o.edit) out.push(`<rect class="s-cursor" x="${px(o.cursor[0]) - 10}" y="${py(o.cursor[1]) - 18}" width="${CELL * 2 + 20}" height="36" rx="6"/>`);
  // rails
  const live = (term) => !!o.rt && o.rt.volts(term) > 12;
  out.push(`<path class="s-rail${live('L') ? ' s-live' : ''}" d="M${px(0)} ${py(0) - 16}V${py(R) + 16}"/><path class="s-rail" d="M${px(GRID.cols)} ${py(0) - 16}V${py(R) + 16}"/>`);
  out.push(`<text class="s-lbl s-strong" x="${px(0)}" y="${py(0) - 24}" text-anchor="middle">+24 V</text><text class="s-lbl s-strong" x="${px(GRID.cols)}" y="${py(0) - 24}" text-anchor="middle">0 V</text>`);
  // wires
  design.wires.forEach((w, i) => {
    const a = termXY(design, w[0]); const b = termXY(design, w[1]);
    if (!a || !b) return;
    const pa = [px(a[0]), py(a[1]), w[0].includes('@')]; const pb = [px(b[0]), py(b[1]), w[1].includes('@')];
    const d = route(pa, pb);
    out.push(`<g class="s-wire${o.sel === `w${i}` ? ' s-sel' : ''}${live(w[0]) ? ' s-live' : ''}" ${o.edit ? `data-wire="${i}" tabindex="0" role="button" aria-label="${esc((t.wire || 'Wire') + ' ' + w.map((x) => termName(x, ref)).join(' – '))}"` : ''}><path class="s-hit" d="${d}"/><path class="s-w" d="${d}"/></g>`);
  });
  // components
  design.comps.forEach((c) => {
    const k = KINDS[c.kind];
    const sym = k.load && o.loadSym && c.kind === 'lamp' ? o.loadSym : k.sym;
    const st = {};
    let state = '';
    if (o.rt) {
      if (k.contact) { st.closed = o.rt.closed(c.id); state = st.closed ? (t.closed || 'closed') : (t.open || 'open'); } else { st.on = o.rt.loadOn(c.id); state = st.on ? (t.on || 'ON') : (t.off || 'off'); }
    }
    const hi = o.hi && o.hi.ids.includes(c.id);
    const label = c.kind === 'k_no' ? (c.ref ? (o.labels && o.labels[c.ref] ? o.labels[c.ref].ref : c.ref) : '?') : ref(c.id);
    const aria = `${label}${state ? `, ${state}` : ''}`;
    out.push(`<g class="s-comp${o.sel === c.id ? ' s-sel' : ''}${hi ? ' s-hi' : ''}" transform="translate(${px(c.x)},${py(c.y)})${c.rot ? ' rotate(90)' : ''}" ${o.edit ? `data-comp="${c.id}" tabindex="0" role="button"` : ''} aria-label="${esc(aria)}">
      <rect class="s-box" x="14" y="-30" width="60" height="60" rx="6"/>${symbol(sym, st)}
      <text class="s-lbl s-strong" x="44" y="${c.rot ? 30 : -35}" text-anchor="middle" ${c.rot ? 'transform="rotate(-90 44 30)"' : ''}>${esc(label)}</text>
      ${state && !c.rot ? `<text class="s-lbl" x="44" y="27" text-anchor="middle">${esc(state)}</text>` : ''}</g>`);
  });
  // connection points
  const wired = new Set(design.wires.flat());
  const term = (tid, x, y) => {
    const cls = `s-term${o.wireFrom === tid ? ' s-from' : ''}${wired.has(tid) ? ' s-wired' : ''}${o.hi && o.hi.terms && o.hi.terms.includes(tid) ? ' s-hi' : ''}`;
    const act = o.edit ? `data-term="${tid}"` : o.measure ? `data-meas="${tid}"` : '';
    return `<g class="${cls}" ${act} ${act ? 'tabindex="0" role="button"' : ''} aria-label="${esc((t.point || 'Connection point') + ' ' + termName(tid, ref))}" transform="translate(${px(x)},${py(y)})"><circle class="s-hit" r="12"/><circle class="s-pt" r="4.5"/></g>`;
  };
  for (let y = 0; y <= R; y++) { out.push(term(`L@${y}`, 0, y)); out.push(term(`N@${y}`, GRID.cols, y)); }
  design.comps.forEach((c) => ['a', 'b'].forEach((s) => { const p = termPos(c, s); out.push(term(`${c.id}.${s}`, p[0], p[1])); }));
  if (o.starter) {
    const y = py(R) + 48;
    out.push(`<path class="s-thinline" d="M${px(0)} ${y - 22}H${px(GRID.cols)}"/><text class="s-lbl" x="${px(1)}" y="${y}">${esc(t.power || '')}</text>`);
    if (o.measure) out.push(`<g class="s-term s-wired" data-meas="REF" tabindex="0" role="button" aria-label="${esc(t.refPoint || 'REF')}" transform="translate(${px(0)},${y + 22})"><circle class="s-hit" r="12"/><circle class="s-pt" r="4.5"/></g><text class="s-lbl" x="${px(0) + 14}" y="${y + 26}">${esc(t.refPoint || 'REF')}</text>`);
  }
  return `<svg class="sch" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(t.title || 'Schematic')}">${out.join('')}</svg>`;
}

export function termName(tid, ref = (x) => x) {
  if (tid === 'REF') return 'REF';
  if (tid.startsWith('L@') || tid === 'L') return '+24 V';
  if (tid.startsWith('N@') || tid === 'N') return '0 V';
  const [id, s] = tid.split('.');
  return `${ref(id)}${id === 'KA' ? '*' : ''} ${s === 'a' ? '◂' : '▸'}`;
}

// Grid cell under a pointer position inside the rendered svg.
export function cellAt(svg, clientX, clientY) {
  const r = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const x = ((clientX - r.left) / r.width) * vb.width; const y = ((clientY - r.top) / r.height) * vb.height;
  return [Math.round((x - MX) / CELL), Math.round((y - MY) / CELL)];
}
