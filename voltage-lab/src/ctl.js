// Control-circuit training engine: constrained schematics (rails, contacts,
// loads) that are checked for wiring errors and then simulated with the same
// nodal solver as the voltmeter lessons. Relay coils feed back into their
// contacts, so holding circuits, overload trips and power loss behave for real.
import { T } from './i18n.js';
import { solveCircuit } from './sim.js';

export const GRID = { cols: 13, rows: 5 }; // rails at x = 0 (L+) and x = cols (0 V); rows 0..rows
export const KINDS = {
  sw: { contact: true, sym: 'no' },
  pb_no: { contact: true, sym: 'pb_no', momentary: true },
  pb_nc: { contact: true, sym: 'pb_nc', momentary: true },
  ol_nc: { contact: true, sym: 'ol' },
  k_no: { contact: true, sym: 'no', relay: true },
  lamp: { load: true, sym: 'lamp', r: 1200 },
  coil: { load: true, sym: 'coil', r: 600 },
};

export const termPos = (c, t) => (t === 'a' ? [c.x, c.y] : c.rot ? [c.x, c.y + 2] : [c.x + 2, c.y]);
const points = (c) => (c.rot ? [[c.x, c.y], [c.x, c.y + 1], [c.x, c.y + 2]] : [[c.x, c.y], [c.x + 1, c.y], [c.x + 2, c.y]]);
export function termXY(design, tid) {
  if (tid.startsWith('L@')) return [0, Number(tid.slice(2))];
  if (tid.startsWith('N@')) return [GRID.cols, Number(tid.slice(2))];
  const [id, t] = tid.split('.');
  const c = design.comps.find((x) => x.id === id);
  return c ? termPos(c, t) : null;
}
export function allTerms(design) {
  const out = [];
  for (let y = 0; y <= GRID.rows; y++) { out.push(`L@${y}`); out.push(`N@${y}`); }
  design.comps.forEach((c) => { out.push(`${c.id}.a`); out.push(`${c.id}.b`); });
  return out;
}
export function canPlace(design, c) {
  const maxX = c.rot ? GRID.cols - 1 : GRID.cols - 3;
  const maxY = c.rot ? GRID.rows - 2 : GRID.rows;
  if (c.x < 1 || c.x > maxX || c.y < 0 || c.y > maxY) return false;
  const mine = points(c).map((p) => p.join(','));
  return !design.comps.some((o) => o.id !== c.id && points(o).some((p) => mine.includes(p.join(','))));
}
export const emptyDesign = (ex) => ({ ex, comps: [], wires: [] });
export const cloneDesign = (d) => JSON.parse(JSON.stringify(d));

function netElements(design) {
  const el = [{ t: 'v', a: 'SRC', b: 'N', v: 24 }, { t: 's', a: 'SRC', b: 'L', sw: 'Q1' }, { t: 'v', a: 'REF', b: 'N', v: 24 }];
  for (let y = 0; y <= GRID.rows; y++) { el.push({ t: 'w', a: `L@${y}`, b: 'L' }); el.push({ t: 'w', a: `N@${y}`, b: 'N' }); }
  design.wires.forEach((w, i) => el.push({ t: 'w', a: w[0], b: w[1], fault: `W${i}` }));
  design.comps.forEach((c) => {
    const k = KINDS[c.kind];
    if (k.contact) el.push({ t: 's', a: `${c.id}.a`, b: `${c.id}.b`, sw: c.id, fault: c.id });
    else el.push({ t: 'r', a: `${c.id}.a`, b: `${c.id}.b`, r: k.r, fault: c.id });
  });
  return el;
}

// Live circuit. `faults` maps a component id (or W<n> for a wire) to true = open.
export function createRuntime(design, faults = {}) {
  const circuit = { kind: 'dc', ref: 'N', el: netElements(design) };
  const dev = { power: true, lock: false, on: {}, pressed: {}, tripped: false, K: {} };
  const coils = design.comps.filter((c) => c.kind === 'coil');
  let sol = null;
  const rt = { dev, design, faults, unstable: false };
  const closed = (c) => {
    switch (c.kind) {
      case 'sw': return !!dev.on[c.id];
      case 'pb_no': return !!dev.pressed[c.id];
      case 'pb_nc': return !dev.pressed[c.id];
      case 'ol_nc': return !dev.tripped;
      case 'k_no': return c.ref === 'F1' ? dev.tripped : !!dev.K[c.ref];
      default: return false;
    }
  };
  rt.closed = (id) => { const c = design.comps.find((x) => x.id === id); return !!c && !faults[id] && closed(c); };
  // what the drawing says the contact should be doing, ignoring any fault
  rt.nominalClosed = (id) => { const c = design.comps.find((x) => x.id === id); return !!c && closed(c); };
  function settle() {
    rt.unstable = false;
    for (let i = 0; i < 10; i++) {
      const sw = { Q1: dev.power };
      design.comps.forEach((c) => { if (KINDS[c.kind].contact) sw[c.id] = closed(c); });
      sol = solveCircuit(circuit, sw, faults);
      let changed = false;
      coils.forEach((c) => {
        const e = !faults[c.id] && Math.abs(sol.v(`${c.id}.a`) - sol.v(`${c.id}.b`)) > 12;
        if (e !== !!dev.K[c.id]) { dev.K[c.id] = e; changed = true; }
      });
      if (!changed) return;
    }
    rt.unstable = true;
  }
  rt.act = (type, id) => {
    if (type === 'toggle') dev.on[id] = !dev.on[id];
    else if (type === 'press') dev.pressed[id] = true;
    else if (type === 'release') dev.pressed[id] = false;
    else if (type === 'trip') dev.tripped = true;
    else if (type === 'reset') dev.tripped = false;
    else if (type === 'powerOff') dev.power = false;
    else if (type === 'powerOn') { if (dev.lock) return false; dev.power = true; }
    else if (type === 'lock') { if (dev.power) return false; dev.lock = true; }
    else if (type === 'unlock') dev.lock = false;
    settle();
    return true;
  };
  rt.volts = (term) => sol.v(term);
  rt.loadOn = (id) => {
    const c = design.comps.find((x) => x.id === id);
    if (!c) return false;
    if (c.kind === 'coil') return !!dev.K[id];
    return !faults[id] && Math.abs(sol.v(`${id}.a`) - sol.v(`${id}.b`)) > 12;
  };
  settle();
  return rt;
}

// ---- wiring checks (run before any simulation) ------------------------------
function graph(design) {
  const parent = {};
  const find = (n) => { if (!(n in parent)) parent[n] = n; while (parent[n] !== n) n = parent[n]; return n; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (let y = 0; y <= GRID.rows; y++) { union(`L@${y}`, 'L'); union(`N@${y}`, 'N'); }
  design.wires.forEach((w) => union(w[0], w[1]));
  const contacts = design.comps.filter((c) => KINDS[c.kind].contact);
  // nodes reachable from `start` through contacts (all treated as closed), skipping `skip`
  const reach = (start, skip) => {
    const seen = new Set([find(start)]);
    let grew = true;
    while (grew) {
      grew = false;
      contacts.forEach((c) => {
        if (c.id === skip) return;
        const a = find(`${c.id}.a`); const b = find(`${c.id}.b`);
        if (seen.has(a) !== seen.has(b)) { seen.add(a); seen.add(b); grew = true; }
      });
    }
    return seen;
  };
  return { find, reach };
}

export function precheck(design, ex) {
  const issues = [];
  const has = (id) => design.comps.some((c) => c.id === id);
  const missing = ex.parts.filter((p) => !has(p.id)).map((p) => p.id);
  if (missing.length) issues.push({ code: 'missing_part', where: missing });
  const wired = new Set(design.wires.flat());
  const open = design.comps.flatMap((c) => [`${c.id}.a`, `${c.id}.b`]).filter((t) => !wired.has(t));
  if (open.length) issues.push({ code: 'open_terminal', where: [...new Set(open.map((t) => t.split('.')[0]))], terms: open });
  design.comps.filter((c) => KINDS[c.kind].relay).forEach((c) => {
    if (!c.ref) issues.push({ code: 'unassigned', where: [c.id] });
    else if (ex.assoc && ex.assoc[c.id] && c.ref !== ex.assoc[c.id]) issues.push({ code: 'wrong_assoc', where: [c.id], ref: c.ref, want: ex.assoc[c.id] });
  });
  const g = graph(design);
  if (g.reach('L').has(g.find('N'))) issues.push({ code: 'short', where: [] });
  else if (!missing.length && !open.length) {
    const fromL = g.reach('L'); const fromN = g.reach('N');
    const dead = design.comps.filter((c) => KINDS[c.kind].load).filter((c) => {
      const a = g.find(`${c.id}.a`); const b = g.find(`${c.id}.b`);
      return !((fromL.has(a) && fromN.has(b)) || (fromL.has(b) && fromN.has(a)));
    }).map((c) => c.id);
    if (dead.length) issues.push({ code: 'no_path', where: dead });
    (ex.protect || []).filter(has).forEach((id) => {
      if (g.reach(`${id}.a`, id).has(g.find(`${id}.b`))) issues.push({ code: 'bypass', where: [id] });
    });
  }
  return issues;
}

export const ISSUE_TEXT = {
  missing_part: T('Not every component has been placed yet. Still in the palette: {list}.', 'Aún no se han colocado todos los componentes. Siguen en la paleta: {list}.'),
  open_terminal: T('Missing connections: {list} has a connection point with no wire on it.', 'Faltan conexiones: {list} tiene un punto de conexión sin cable.'),
  unassigned: T('The auxiliary contact has no reference yet. Select it and choose which device operates it.', 'El contacto auxiliar aún no tiene referencia. Selecciónalo y elige qué dispositivo lo acciona.'),
  wrong_assoc: T('Incorrect coil/contact association: this contact is assigned to {ref}, so it would follow {ref} and not the coil it has to hold in. A holding contact must belong to the same device as the coil ({want}).', 'Asociación bobina/contacto incorrecta: este contacto está asignado a {ref}, así que seguiría a {ref} y no a la bobina que debe mantener. Un contacto de retención debe pertenecer al mismo dispositivo que la bobina ({want}).'),
  short: T('Direct supply short circuit: there is a path from +24 V to 0 V that goes only through wires and contacts, with no lamp or coil in it. When those contacts close, the supply is shorted. Every path between the rails must pass through a load.', 'Cortocircuito directo de la alimentación: hay un camino de +24 V a 0 V que pasa solo por cables y contactos, sin lámpara ni bobina. Cuando esos contactos cierren, la alimentación quedará en cortocircuito. Todo camino entre las barras debe pasar por una carga.'),
  no_path: T('Incomplete path: {list} can never be energized, because no route leads from +24 V through it to 0 V even with every contact closed.', 'Camino incompleto: {list} nunca puede energizarse, porque ninguna ruta va de +24 V a través de él hasta 0 V ni con todos los contactos cerrados.'),
  bypass: T('Protective contact bypassed: a parallel branch goes around {list}. Current could reach the coil without passing through it, so it could not stop the machine.', 'Contacto de protección puenteado: una rama en paralelo rodea a {list}. La corriente podría llegar a la bobina sin pasar por él, así que no podría detener la máquina.'),
};

// ---- exercises ---------------------------------------------------------------
const D = (ex, comps, wires) => ({ ex, comps: comps.map(([id, kind, x, y, ref]) => ({ id, kind, x, y, rot: 0, ...(ref ? { ref } : {}) })), wires });
const lampTests = (rows) => rows.map(([q, act, on]) => ({ q, act, on }));
const Q0 = T('What happens before anything is operated?', '¿Qué pasa antes de accionar nada?');

export const EXERCISES = {
  A: {
    id: 'A', out: 'H1', concepts: ['logic'],
    title: T('A. A maintained switch controls {H1}', 'A. Un interruptor mantenido controla {H1}'),
    behavior: T('When {SA} is closed, {H1} is on. When {SA} is open, {H1} is off. A maintained switch stays where you put it.', 'Cuando {SA} está cerrado, {H1} está encendida. Cuando {SA} está abierto, {H1} está apagada. Un interruptor mantenido se queda donde lo dejas.'),
    principle: T('A load works only inside a complete loop: +24 V → switch → load → 0 V. The switch goes in series with the load so that it can break the loop.', 'Una carga funciona solo dentro de un lazo completo: +24 V → interruptor → carga → 0 V. El interruptor va en serie con la carga para poder interrumpir el lazo.'),
    parts: [{ id: 'SA', kind: 'sw' }, { id: 'H1', kind: 'lamp' }],
    tests: lampTests([[Q0, [], false], [T('What happens when {SA} is closed?', '¿Qué pasa cuando {SA} se cierra?'), [['toggle', 'SA']], true], [T('What happens when {SA} is opened again?', '¿Qué pasa cuando {SA} se abre otra vez?'), [['toggle', 'SA']], false]]),
    solution: D('A', [['SA', 'sw', 3, 1], ['H1', 'lamp', 8, 1]], [['L@1', 'SA.a'], ['SA.b', 'H1.a'], ['H1.b', 'N@1']]),
    focus: () => ['SA', 'H1'],
  },
  B: {
    id: 'B', out: 'H1', concepts: ['logic'],
    title: T('B. Two switches must both close to operate {H1}', 'B. Dos interruptores deben cerrarse a la vez para accionar {H1}'),
    behavior: T('{H1} is on only when {SA} AND {SB} are both closed. If either one is open, {H1} is off.', '{H1} se enciende solo cuando {SA} Y {SB} están ambos cerrados. Si cualquiera está abierto, {H1} está apagada.'),
    principle: T('Contacts in series make AND logic: the current has one path and every contact in it must be closed.', 'Los contactos en serie forman la lógica Y: la corriente tiene un solo camino y cada contacto en él debe estar cerrado.'),
    parts: [{ id: 'SA', kind: 'sw' }, { id: 'SB', kind: 'sw' }, { id: 'H1', kind: 'lamp' }],
    tests: lampTests([[Q0, [], false], [T('What happens with only {SA} closed?', '¿Qué pasa con solo {SA} cerrado?'), [['toggle', 'SA']], false], [T('What happens with {SA} and {SB} both closed?', '¿Qué pasa con {SA} y {SB} cerrados?'), [['toggle', 'SB']], true], [T('What happens with only {SB} closed?', '¿Qué pasa con solo {SB} cerrado?'), [['toggle', 'SA']], false]]),
    solution: D('B', [['SA', 'sw', 2, 1], ['SB', 'sw', 6, 1], ['H1', 'lamp', 10, 1]], [['L@1', 'SA.a'], ['SA.b', 'SB.a'], ['SB.b', 'H1.a'], ['H1.b', 'N@1']]),
    focus: () => ['SA', 'SB'],
  },
  C: {
    id: 'C', out: 'H1', concepts: ['logic'],
    title: T('C. Either of two switches can operate {H1}', 'C. Cualquiera de dos interruptores puede accionar {H1}'),
    behavior: T('{H1} is on when {SA} OR {SB} is closed (or both). It is off only when both are open.', '{H1} se enciende cuando {SA} O {SB} está cerrado (o ambos). Solo se apaga cuando los dos están abiertos.'),
    principle: T('Contacts in parallel make OR logic: each contact offers its own path, and one closed path is enough.', 'Los contactos en paralelo forman la lógica O: cada contacto ofrece su propio camino y basta un camino cerrado.'),
    parts: [{ id: 'SA', kind: 'sw' }, { id: 'SB', kind: 'sw' }, { id: 'H1', kind: 'lamp' }],
    tests: lampTests([[Q0, [], false], [T('What happens with only {SA} closed?', '¿Qué pasa con solo {SA} cerrado?'), [['toggle', 'SA']], true], [T('What happens with {SA} and {SB} both closed?', '¿Qué pasa con {SA} y {SB} cerrados?'), [['toggle', 'SB']], true], [T('What happens with only {SB} closed?', '¿Qué pasa con solo {SB} cerrado?'), [['toggle', 'SA']], true], [T('What happens when both are open again?', '¿Qué pasa cuando ambos vuelven a estar abiertos?'), [['toggle', 'SB']], false]]),
    solution: D('C', [['SA', 'sw', 3, 1], ['SB', 'sw', 3, 3], ['H1', 'lamp', 8, 1]], [['L@1', 'SA.a'], ['L@3', 'SB.a'], ['SA.b', 'H1.a'], ['SB.b', 'H1.a'], ['H1.b', 'N@1']]),
    focus: () => ['SA', 'SB'],
  },
  D: {
    id: 'D', out: 'K1', starter: true, concepts: ['hold', 'coil'], protect: ['STOP', 'F1'], assoc: { KA: 'K1' },
    title: T('D. START, holding contact, STOP and overload', 'D. START, contacto de retención, STOP y sobrecarga'),
    behavior: T('Pressing {START} energizes coil {K1}, and {K1} runs {M1}. When {START} is released, {M1} keeps running, held in by a contact of {K1}. Pressing {STOP}, or a trip of overload {F1}, stops {M1}. After a stop, a trip reset or a loss of control power, {M1} stays stopped until {START} is pressed again.', 'Al pulsar {START} se energiza la bobina {K1}, y {K1} pone en marcha {M1}. Al soltar {START}, {M1} sigue en marcha, retenido por un contacto de {K1}. Pulsar {STOP}, o un disparo de la sobrecarga {F1}, detiene {M1}. Tras una parada, un rearme o una pérdida de la alimentación de control, {M1} sigue parado hasta que se pulse {START} otra vez.'),
    principle: T('A holding (seal-in) contact is a normally open contact of the coil’s own device, wired in parallel with START only. STOP and the overload contact are normally closed and sit in series with everything that feeds the coil, so opening either one always drops it out.', 'Un contacto de retención es un contacto normalmente abierto del mismo dispositivo que la bobina, cableado en paralelo solo con START. STOP y el contacto de sobrecarga son normalmente cerrados y van en serie con todo lo que alimenta la bobina, de modo que abrir cualquiera siempre la desenergiza.'),
    parts: [{ id: 'STOP', kind: 'pb_nc' }, { id: 'F1', kind: 'ol_nc' }, { id: 'START', kind: 'pb_no' }, { id: 'KA', kind: 'k_no' }, { id: 'K1', kind: 'coil' }],
    tests: [
      { q: T('What happens before any button is pressed?', '¿Qué pasa antes de pulsar ningún botón?'), act: [], on: false },
      { q: T('What happens while {START} is pressed?', '¿Qué pasa mientras se pulsa {START}?'), act: [['press', 'START']], on: true, hint: 'start' },
      { q: T('What happens when {START} is released?', '¿Qué pasa cuando se suelta {START}?'), act: [['release', 'START']], on: true, hint: 'hold' },
      { q: T('What happens when {STOP} is pressed?', '¿Qué pasa cuando se pulsa {STOP}?'), act: [['press', 'STOP']], on: false, hint: 'stop' },
      { q: T('What happens when {STOP} is released?', '¿Qué pasa cuando se suelta {STOP}?'), act: [['release', 'STOP']], on: false, hint: 'hold' },
      { q: T('What happens when the overload trips while running?', '¿Qué pasa cuando la sobrecarga dispara en marcha?'), act: [['press', 'START'], ['release', 'START'], ['trip']], on: false, hint: 'ol' },
      { q: T('What happens when the overload is reset?', '¿Qué pasa cuando se rearma la sobrecarga?'), act: [['reset']], on: false, hint: 'hold' },
      { q: T('What happens when control power is lost while running?', '¿Qué pasa cuando se pierde la alimentación de control en marcha?'), act: [['press', 'START'], ['release', 'START'], ['powerOff']], on: false },
      { q: T('What happens after control power returns?', '¿Qué pasa cuando vuelve la alimentación de control?'), act: [['powerOn']], on: false, hint: 'hold' },
      { q: T('What happens when {START} is pressed and released again?', '¿Qué pasa cuando se pulsa y se suelta {START} de nuevo?'), act: [['press', 'START'], ['release', 'START']], on: true, hint: 'hold' },
    ],
    solution: D('D', [['STOP', 'pb_nc', 1, 1], ['F1', 'ol_nc', 4, 1], ['START', 'pb_no', 7, 1], ['KA', 'k_no', 7, 3, 'K1'], ['K1', 'coil', 10, 1]],
      [['L@1', 'STOP.a'], ['STOP.b', 'F1.a'], ['F1.b', 'START.a'], ['START.b', 'K1.a'], ['K1.b', 'N@1'], ['F1.b', 'KA.a'], ['KA.b', 'K1.a']]),
    focus: (hint) => ({ start: ['START', 'K1'], hold: ['START', 'KA'], stop: ['STOP'], ol: ['F1'] }[hint] || ['START', 'KA']),
  },
};

export function runTests(design, ex) {
  const rt = createRuntime(design);
  return ex.tests.map((t) => {
    t.act.forEach((a) => rt.act(a[0], a[1]));
    const observed = rt.loadOn(ex.out);
    return { q: t.q, expected: t.on, observed, unstable: rt.unstable, pass: observed === t.on && !rt.unstable, hint: t.hint };
  });
}

// Which part of the drawing deserves attention (hint level 3).
export function attention(design, ex, issues, results) {
  if (issues && issues.length) return { ids: issues[0].where && issues[0].where.length ? issues[0].where : design.comps.map((c) => c.id), terms: issues[0].terms || [] };
  const bad = results && results.find((r) => !r.pass);
  return { ids: ex.focus(bad && bad.hint), terms: [] };
}

// ---- repair verification (motor starter teaching circuit) --------------------
export const CAUSES = [
  { id: 'STOP', label: T('{STOP} contact is open when it should be closed', 'El contacto de {STOP} está abierto cuando debería estar cerrado') },
  { id: 'F1', label: T('{F1} overload contact is open although the overload is not tripped', 'El contacto de la sobrecarga {F1} está abierto aunque no ha disparado') },
  { id: 'START', label: T('{START} contact does not close when pressed', 'El contacto de {START} no cierra al pulsarlo') },
  { id: 'KA', label: T('The {K1} holding contact does not close when {K1} is energized', 'El contacto de retención de {K1} no cierra cuando {K1} está energizada') },
  { id: 'K1', label: T('Coil {K1} is open circuit (it has voltage but does not pull in)', 'La bobina {K1} está en circuito abierto (tiene voltaje pero no actúa)') },
];
export const SCENARIOS_V = [
  {
    id: 'hold', fault: 'KA', prior: null,
    symptom: T('{M1} runs only while {START} is held. It stops as soon as {START} is released.', '{M1} funciona solo mientras se mantiene pulsado {START}. Se detiene en cuanto se suelta {START}.'),
  },
  {
    id: 'inherited', fault: 'F1', prior: 'START',
    symptom: T('{M1} will not start. A colleague replaced the {START} pushbutton on a guess and reported the job as finished. You are asked to verify it.', '{M1} no arranca. Un compañero reemplazó el pulsador {START} por intuición y dio el trabajo por terminado. Te piden verificarlo.'),
  },
];

// Replay the learner's own action log on a circuit with one candidate fault.
export function replay(design, fault, log) {
  const rt = createRuntime(design, fault ? { [fault]: true } : {});
  return log.map((e) => {
    if (e.t === 'act') { rt.act(e.a[0], e.a[1]); return { run: rt.loadOn('K1') }; }
    return { v: rt.volts(e.term) };
  });
}
export function fitting(design, log) {
  return CAUSES.filter((c) => {
    const r = replay(design, c.id, log);
    return log.every((e, i) => (e.t === 'act' ? r[i].run === e.run : Math.abs(r[i].v - e.v) < 2));
  }).map((c) => c.id);
}

export const CHECKS = [
  { id: 'start', test: T('{START} operates {M1}', '{START} pone en marcha {M1}'), how: T('Press {START}.', 'Pulsa {START}.'), trig: ['press', 'START'], need: false, expect: true },
  { id: 'seal', test: T('Releasing {START} leaves {M1} running', 'Al soltar {START}, {M1} sigue en marcha'), how: T('Release {START}.', 'Suelta {START}.'), trig: ['release', 'START'], need: true, expect: true },
  { id: 'stop', test: T('{STOP} stops {M1}', '{STOP} detiene {M1}'), how: T('Press {STOP}.', 'Pulsa {STOP}.'), trig: ['press', 'STOP'], need: true, expect: false },
  { id: 'stoprel', test: T('Releasing {STOP} does not restart {M1}', 'Al soltar {STOP}, {M1} no vuelve a arrancar'), how: T('Release {STOP}.', 'Suelta {STOP}.'), trig: ['release', 'STOP'], need: false, expect: false },
  { id: 'trip', test: T('An overload trip stops {M1}', 'Un disparo de sobrecarga detiene {M1}'), how: T('Start {M1} again (press and release {START}), then use the overload TEST control.', 'Arranca {M1} otra vez (pulsa y suelta {START}) y usa el control TEST de la sobrecarga.'), trig: ['trip'], need: true, expect: false },
  { id: 'reset', test: T('Resetting the overload does not restart {M1}', 'Rearmar la sobrecarga no vuelve a arrancar {M1}'), how: T('Use the overload RESET control.', 'Usa el control RESET de la sobrecarga.'), trig: ['reset'], need: false, expect: false },
  { id: 'loss', test: T('Loss of control power stops {M1}', 'La pérdida de la alimentación de control detiene {M1}'), how: T('Start {M1} again, then switch control power off.', 'Arranca {M1} otra vez y desconecta la alimentación de control.'), trig: ['powerOff'], need: true, expect: false },
  { id: 'restore', test: T('Restoring control power does not restart {M1}', 'Restablecer la alimentación de control no vuelve a arrancar {M1}'), how: T('Switch control power back on.', 'Vuelve a conectar la alimentación de control.'), trig: ['powerOn'], need: false, expect: false },
  { id: 'again', test: T('A deliberate new {START} command is required to restart', 'Se requiere una nueva orden deliberada de {START} para volver a arrancar'), how: T('Press {START}.', 'Pulsa {START}.'), trig: ['press', 'START'], need: false, expect: true },
];
