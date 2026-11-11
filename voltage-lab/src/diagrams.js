// Circuit diagrams shown beside the 3D bench. They are generated from the
// same simulator state, so switch positions, lamp state, probe positions and
// identified test points always match the bench.
import { TERMINALS } from './sim.js';
import { UI, tr, esc, getLang } from './i18n.js';

const LOOP = {
  lamp9: {
    pts: { tp1: [50, 50], tp2: [130, 50], tp3: [215, 50], tp4: [310, 50], tp5: [310, 180], tp6: [50, 180] },
    labels: { tp1: 'TP1', tp2: 'TP2', tp3: 'TP3', tp4: 'TP4', tp5: 'TP5', tp6: 'TP6' },
    src: '9 V', sw: 'lamp9', swName: 'S', lampName: { en: 'Lamp', es: 'Lámpara' }, plus: '+', minus: '−',
  },
  panel24: {
    pts: { x1: [50, 50], x3: [130, 50], x4: [215, 50], x5: [310, 50], x6: [310, 180], x2: [50, 180] },
    labels: { x1: 'X1 +24 V', x3: 'X3', x4: 'X4', x5: 'X5', x6: 'X6', x2: 'X2 0 V' },
    src: '24 V', sw: 'panel24', swName: 'S1', lampName: { en: 'Lamp H1', es: 'Lámpara H1' }, plus: '+24 V', minus: '0 V', w2: true,
  },
};
const TWO = {
  aa: { top: 'aa+', bottom: 'aa-', sym: 'bat', cap: { en: 'AA battery — 1.5 V nominal', es: 'Pila AA: 1,5 V nominal' } },
  b9: { top: 'b9+', bottom: 'b9-', sym: 'bat', cap: { en: '9 V battery — 9 V nominal', es: 'Batería de 9 V: 9 V nominal' } },
  ac12: { top: 'ac1', bottom: 'ac2', sym: 'ac', cap: { en: '12 V AC training source (simulated, isolated)', es: 'Fuente de práctica 12 V CA (simulada, aislada)' } },
};

function termG(id, x, y, label, sim, ui, dx = 0, dy = -16, anchor = 'middle') {
  const s = sim.state;
  const intended = s.intended.includes(id);
  const hover = ui.hoverTerm === id;
  const red = s.probes.red === id;
  const black = s.probes.black === id;
  const es = getLang() === 'es';
  const aria = `${label}${intended ? (es ? ', identificado' : ', identified') : ''}${red ? (es ? ', punta roja' : ', red probe') : ''}${black ? (es ? ', punta negra' : ', black probe') : ''}`;
  return `<g class="tp${intended ? ' intended' : ''}${hover ? ' hover' : ''}" data-term="${id}" tabindex="0" role="button" aria-label="${esc(aria)}" transform="translate(${x},${y})">
    <circle class="hit" r="17"/>${intended ? '<circle class="ring" r="11"/>' : ''}<circle class="dot" r="5"/>
    <text x="${dx}" y="${dy}" text-anchor="${anchor}">${intended ? '✔ ' : ''}${esc(label)}</text>
    ${red ? `<g class="mk mk-red"><rect x="9" y="-9" width="16" height="16" rx="3"/><text x="17" y="3.5" text-anchor="middle">R</text></g>` : ''}
    ${black ? `<g class="mk mk-black"><circle cx="-17" cy="0" r="8.5"/><text x="-17" y="3.5" text-anchor="middle">${es ? 'N' : 'B'}</text></g>` : ''}
  </g>`;
}

// Voltmeter symbol drawn beside the two probed points ("in parallel").
function meterSym(pa, pb, center) {
  if (!pa || !pb || (pa[0] === pb[0] && pa[1] === pb[1])) return '';
  const mx = (pa[0] + pb[0]) / 2; const my = (pa[1] + pb[1]) / 2;
  let vx = center[0] - mx; let vy = center[1] - my;
  const len = Math.hypot(vx, vy) || 1;
  const d = Math.min(104, len);
  vx = (vx / len) * d; vy = (vy / len) * d;
  const cx = mx + vx; const cy = my + vy;
  return `<g class="vm"><path d="M${pa[0]} ${pa[1]}L${cx} ${cy}L${pb[0]} ${pb[1]}"/><circle cx="${cx}" cy="${cy}" r="13"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle">V</text></g>`;
}

function probePts(sim, pts) {
  const s = sim.state;
  return [pts[s.probes.red], pts[s.probes.black]];
}

function loopSVG(kind, sim, ui) {
  const L = LOOP[kind];
  const s = sim.state;
  const ids = Object.keys(L.pts);
  const P = L.pts;
  const [a, b, c, d, e, f] = ids.map((k) => P[k]);
  const closed = s.switches[L.sw];
  const lampOn = sim.lampOn(kind);
  const open = tr(closed ? UI.closed : UI.open);
  const lamp = tr(lampOn ? UI.lampOn : UI.lampOff);
  const broken = L.w2 && s.faults.w2open && s.faultRevealed;
  const [pr, pb] = probePts(sim, P);
  const rays = lampOn ? [0, 45, 90, 135, 180, 225, 270, 315].map((g) => {
    const r = (g * Math.PI) / 180;
    return `<path class="ray" d="M${310 + Math.cos(r) * 20} ${115 + Math.sin(r) * 20}L${310 + Math.cos(r) * 27} ${115 + Math.sin(r) * 27}"/>`;
  }).join('') : '';
  const lbl = (id, dx, dy, anchor) => termG(id, P[id][0], P[id][1], L.labels[id], sim, ui, dx, dy, anchor);
  return `<svg class="diagram" viewBox="0 0 360 226" role="group" aria-label="${esc(tr(UI.diagram))}">
    <path class="wire" d="M${a[0]} ${a[1]}V96 M50 134V${f[1]} M${a[0]} ${a[1]}H${b[0]} M${c[0]} ${c[1]}H${broken ? 250 : d[0]} ${broken ? `M274 50H${d[0]}` : ''} M${d[0]} ${d[1]}V99 M310 131V${e[1]} M${e[0]} ${e[1]}H${f[0]}"/>
    <path class="comp" d="M34 96H66"/><path class="comp thick" d="M41 106H59"/><path class="comp" d="M34 124H66"/><path class="comp thick" d="M41 134H59"/>
    <path class="wire" d="M50 106V124" stroke-dasharray="2 3"/>
    <text class="lbl" x="72" y="101">${L.plus}</text><text class="lbl" x="72" y="139">${L.minus}</text><text class="lbl strong" x="16" y="119" text-anchor="middle">${L.src}</text>
    <circle class="comp fill" cx="${b[0] + 14}" cy="50" r="3"/><circle class="comp fill" cx="${c[0] - 14}" cy="50" r="3"/>
    <path class="comp" d="M${b[0]} 50H${b[0] + 14} M${c[0] - 14} 50H${c[0]}"/>
    <path class="comp thick" d="M${b[0] + 14} 50L${closed ? c[0] - 14 : c[0] - 22} ${closed ? 50 : 27}"/>
    <text class="lbl strong" x="${(b[0] + c[0]) / 2}" y="${closed ? 34 : 18}" text-anchor="middle">${L.swName}: ${esc(open)}</text>
    ${L.w2 ? `<text class="lbl" x="262" y="${broken ? 40 : 43}" text-anchor="middle">W2</text>` : ''}
    ${broken ? `<path class="break" d="M246 42L254 58M270 42L278 58"/><text class="lbl strong warn" x="262" y="26" text-anchor="middle">✖ ${esc(tr(UI.faultOpen))}</text>` : ''}
    <circle class="comp${lampOn ? ' lit' : ''}" cx="310" cy="115" r="16"/><path class="comp" d="M299 104L321 126M321 104L299 126"/>${rays}
    <text class="lbl" x="284" y="103" text-anchor="end">${esc(tr(L.lampName))}</text><text class="lbl strong" x="284" y="119" text-anchor="end">${esc(lamp)}</text>
    ${meterSym(pr, pb, [180, 122])}
    ${lbl(ids[0], 0, -14, 'middle')}${lbl(ids[1], 0, 26, 'middle')}${lbl(ids[2], 0, 26, 'middle')}${lbl(ids[3], 0, -14, 'middle')}
    ${lbl(ids[4], 0, 28, 'middle')}${lbl(ids[5], 0, 28, 'middle')}
  </svg>`;
}

function twoSVG(kind, sim, ui) {
  const D = TWO[kind];
  const P = { [D.top]: [150, 46], [D.bottom]: [150, 184] };
  const [pr, pb] = probePts(sim, P);
  const sym = D.sym === 'bat'
    ? `<path class="comp" d="M126 98H174"/><path class="comp thick" d="M137 110H163"/><path class="comp" d="M126 122H174"/><path class="comp thick" d="M137 134H163"/>
       <path class="wire" d="M150 46V98M150 134V184"/><text class="lbl strong" x="186" y="103">+</text><text class="lbl strong" x="186" y="139">−</text>`
    : `<circle class="comp" cx="150" cy="115" r="24"/><path class="comp" d="M134 115q8 -18 16 0t16 0"/><path class="wire" d="M150 46V91M150 139V184"/>`;
  return `<svg class="diagram" viewBox="0 0 360 226" role="group" aria-label="${esc(tr(UI.diagram))}">
    ${sym}
    <text class="lbl" x="180" y="218" text-anchor="middle">${esc(tr(D.cap))}</text>
    ${meterSym(pr, pb, [330, 115])}
    ${termG(D.top, 150, 46, TERMINALS[D.top].label, sim, ui, 0, -16)}
    ${termG(D.bottom, 150, 184, TERMINALS[D.bottom].label, sim, ui, -30, 5, 'end')}
  </svg>`;
}

function analogySVG() {
  const es = getLang() === 'es';
  const t = es
    ? { tag: 'SOLO UNA ANALOGÍA', hi: 'Tanque alto', lo: 'Tanque bajo', dp: 'Diferencia de presión ↔ Voltaje', fl: 'Agua que fluye ↔ Corriente', nr: 'Tubo estrecho ↔ Resistencia' }
    : { tag: 'ANALOGY ONLY', hi: 'High tank', lo: 'Low tank', dp: 'Pressure difference ↔ Voltage', fl: 'Water flowing ↔ Current', nr: 'Narrow pipe ↔ Resistance' };
  return `<svg class="diagram" viewBox="0 0 360 226" role="img" aria-label="${t.tag}: ${t.dp}; ${t.fl}; ${t.nr}">
    <rect class="tag" x="112" y="4" width="136" height="20" rx="10"/><text class="lbl strong inv" x="180" y="18" text-anchor="middle">${t.tag}</text>
    <path class="comp" d="M30 40V120H110V40"/><rect class="water" x="31" y="62" width="78" height="57"/>
    <path class="comp" d="M250 100V170H330V100"/><rect class="water" x="251" y="146" width="78" height="23"/>
    <path class="comp" d="M110 112H160L175 126H215L230 140H250 M110 120H156L171 134H211L226 148H250"/>
    <path class="flow" d="M132 106H152M146 101L153 106L146 111"/>
    <path class="dim" d="M345 62V146M340 62H350M340 146H350"/>
    <text class="lbl" x="70" y="36" text-anchor="middle">${t.hi}</text><text class="lbl" x="290" y="96" text-anchor="middle">${t.lo}</text>
    <text class="lbl strong" x="12" y="192">${t.dp}</text><text class="lbl" x="12" y="207">${t.fl}</text><text class="lbl" x="12" y="222">${t.nr}</text>
  </svg>`;
}

export function renderDiagram(kind, sim, ui) {
  if (LOOP[kind]) return loopSVG(kind, sim, ui);
  if (kind === 'ac12') return twoSVG(kind, sim, ui) + '<canvas class="wave" width="720" height="300" aria-hidden="true"></canvas>';
  if (TWO[kind]) return twoSVG(kind, sim, ui);
  if (kind === 'analogy') return analogySVG();
  if (kind === 'wave') return '<canvas class="wave" width="720" height="380" aria-hidden="true"></canvas>';
  return '';
}

export function diagramTerms(kind) {
  if (LOOP[kind]) return Object.keys(LOOP[kind].pts);
  if (TWO[kind]) return [TWO[kind].top, TWO[kind].bottom];
  return [];
}

// Animated DC and AC traces with the RMS level and the peak marked in words.
export function drawWave(canvas, t) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;
  const es = getLang() === 'es';
  const css = getComputedStyle(canvas);
  const ink = css.getPropertyValue('--ink').trim() || '#16222b';
  const mute = css.getPropertyValue('--mute').trim() || '#5c6b76';
  const ac = css.getPropertyValue('--accent').trim() || '#0b6e8a';
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  const full = H > 320;
  const x0 = 176; const x1 = W - 16;
  const font = (px, b) => `${b ? '600 ' : ''}${px}px system-ui, sans-serif`;
  let top = 0;
  if (full) {
    // DC trace
    const y0 = 86;
    ctx.strokeStyle = mute; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, y0 - 44); ctx.lineTo(x1, y0 - 44); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = font(30, true);
    ctx.fillText(es ? 'CC: polaridad fija' : 'DC: steady polarity', x0, 28);
    ctx.fillStyle = mute; ctx.font = font(26);
    ctx.fillText('0 V', 10, y0 + 6); ctx.fillText('+', 10, y0 - 38);
    top = 118;
  }
  const mid = top + (H - top) / 2 + 8;
  const amp = (H - top) / 2 - 44;
  const rms = amp / Math.SQRT2;
  ctx.strokeStyle = mute; ctx.lineWidth = 1.5; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
  ctx.setLineDash([10, 8]); ctx.strokeStyle = ac; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x0, mid - rms); ctx.lineTo(x1, mid - rms); ctx.stroke();
  ctx.setLineDash([3, 6]); ctx.strokeStyle = mute; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, mid - amp); ctx.lineTo(x1, mid - amp); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  ctx.beginPath();
  const k = (Math.PI * 2 * 2.5) / (x1 - x0);
  for (let x = x0; x <= x1; x += 3) {
    const y = mid - amp * Math.sin(k * (x - x0) - t * 2.2);
    if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = ink; ctx.font = font(30, true);
  ctx.fillText(es ? 'CA: la polaridad se invierte' : 'AC: polarity keeps reversing', x0, top + 28);
  ctx.font = font(26);
  ctx.fillStyle = mute;
  ctx.fillText('0 V', 10, mid + 6);
  ctx.fillText(es ? 'pico ≈17 V' : 'peak ≈17 V', 10, mid - amp + 2);
  ctx.fillStyle = ac; ctx.font = font(26, true);
  ctx.fillText('RMS 12 V', 10, mid - rms + 8);
}
