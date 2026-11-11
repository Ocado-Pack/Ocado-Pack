// "Help me diagnose": guided troubleshooting on the simulator's own training
// scenarios. The reasoning is computed, not scripted: every candidate cause is
// a set of circuit faults, its expected readings come from solving that
// circuit, and causes are ruled out only by the learner's actual measurements.
import { T } from './i18n.js';
import { CIRCUITS, TERMINALS, solveCircuit } from './sim.js';

const tp = (id) => TERMINALS[id].label;

function loopScenario(o) {
  const L = o.labels; // names of the six points in loop order
  const [p1, p2, p3, p4, p5, p6] = o.pts;
  const n = o.nominal;
  return {
    id: o.id, circuit: o.circuit, sw: o.circuit, mode: 'VDC', nominal: n, range: o.range, focus: o.circuit, rest: o.rest, diagram: o.circuit,
    title: o.title,
    useful: o.useful,
    points: o.pts,
    hyps: [
      o.srcHyp,
      {
        id: 'sw', faults: { [o.f.sw]: true },
        label: T(`${o.swName} is not passing voltage although it is in the closed position`, `${o.swName} no deja pasar voltaje aunque está en posición cerrada`),
        finding: T(`Voltage is present before ${o.swName} and absent after it while it is closed, so the open is in the switch section between ${L[p2]} and ${L[p3]}.`, `Hay voltaje antes de ${o.swName} y no después mientras está cerrado, así que la interrupción está en el tramo del interruptor entre ${L[p2]} y ${L[p3]}.`),
        limit: T('Voltage readings locate the open but cannot say whether the contact is worn, dirty or broken.', 'Las lecturas de voltaje ubican la interrupción, pero no pueden decir si el contacto está gastado, sucio o roto.'),
      },
      {
        id: 'w2', faults: { [o.f.w2]: true },
        label: T(`An open in the connection from ${L[p3]} to ${L[p4]}`, `Una interrupción en la conexión de ${L[p3]} a ${L[p4]}`),
        finding: T(`Voltage is present at ${L[p3]} and absent at ${L[p4]}, and the diagram shows only a wire between them.`, `Hay voltaje en ${L[p3]} y no en ${L[p4]}, y el diagrama muestra solo un cable entre ambos.`),
        limit: T('Voltage readings cannot tell a broken wire from a loose terminal — only that the path between these two points is open.', 'Las lecturas de voltaje no distinguen un cable roto de un terminal flojo; solo indican que el camino entre estos dos puntos está abierto.'),
      },
      {
        id: 'lamp', faults: { [o.f.lamp]: true },
        label: T(`An open inside the lamp or its holder (between ${L[p4]} and ${L[p5]})`, `Una interrupción dentro de la lámpara o su portalámparas (entre ${L[p4]} y ${L[p5]})`),
        finding: T('The full supply voltage is across the lamp, yet it stays dark: voltage reaches both lamp terminals but no current flows through it.', 'Todo el voltaje de alimentación está en la lámpara y aun así sigue apagada: el voltaje llega a ambos terminales pero no circula corriente por ella.'),
        limit: T('Voltage cannot tell a burnt-out filament from a poor holder contact. That takes removing and checking the lamp with the circuit switched off, which this lab does not cover.', 'El voltaje no distingue un filamento fundido de un mal contacto del portalámparas. Eso requiere retirar y revisar la lámpara con el circuito apagado, algo que este laboratorio no cubre.'),
      },
      {
        id: 'w3', faults: { [o.f.w3]: true },
        label: T(`An open in the return connection from ${L[p5]} to ${L[p6]}`, `Una interrupción en la conexión de retorno de ${L[p5]} a ${L[p6]}`),
        finding: T(`Voltage reaches the lamp, there is about 0 V across it, and nearly the full supply voltage appears between ${L[p5]} and ${L[p6]} — two points the diagram says are joined.`, `El voltaje llega a la lámpara, hay unos 0 V entre sus extremos y casi todo el voltaje de alimentación aparece entre ${L[p5]} y ${L[p6]}, dos puntos que el diagrama muestra unidos.`),
        limit: T('Voltage readings cannot tell a broken wire from a loose terminal — only that the return path is open.', 'Las lecturas de voltaje no distinguen un cable roto de un terminal flojo; solo indican que el retorno está abierto.'),
      },
    ],
    meas: [
      { id: 'src', red: p1, black: p6, sw: true, what: o.srcWhat, tells: T('whether the source is delivering voltage while the lamp is connected', 'si la fuente entrega voltaje mientras la lámpara está conectada') },
      { id: 'out', red: p3, black: p6, sw: true, what: T(`after the switch, relative to ${L[p6]} (${L[p3]} to ${L[p6]})`, `después del interruptor, respecto a ${L[p6]} (${L[p3]} a ${L[p6]})`), tells: T('whether the switch passes the voltage on', 'si el interruptor deja pasar el voltaje') },
      { id: 'in', red: p4, black: p6, sw: true, what: T(`at the lamp’s input, relative to ${L[p6]} (${L[p4]} to ${L[p6]})`, `en la entrada de la lámpara, respecto a ${L[p6]} (${L[p4]} a ${L[p6]})`), tells: T('whether the voltage reaches the lamp', 'si el voltaje llega a la lámpara') },
      { id: 'lamp', red: p4, black: p5, sw: true, what: T(`across the lamp (${L[p4]} to ${L[p5]})`, `entre los extremos de la lámpara (${L[p4]} a ${L[p5]})`), tells: T('whether the lamp itself has voltage across it', 'si la propia lámpara tiene voltaje entre sus extremos') },
      { id: 'ret', red: p5, black: p6, sw: true, what: T(`the return side, relative to ${L[p6]} (${L[p5]} to ${L[p6]})`, `el lado de retorno, respecto a ${L[p6]} (${L[p5]} a ${L[p6]})`), tells: T('whether the return path is intact (a healthy return shows about 0 V)', 'si el retorno está intacto (un retorno sano muestra unos 0 V)') },
      ...(o.extraMeas || []),
    ],
    cases: o.cases,
  };
}

const TPL = { tp1: 'TP1', tp2: 'TP2', tp3: 'TP3', tp4: 'TP4', tp5: 'TP5', tp6: 'TP6' };
const XL = { x1: 'X1 (+24 V)', x3: 'X3', x4: 'X4', x5: 'X5', x6: 'X6', x2: 'X2 (0 V)' };

const batteryHyps = (lowFault, nominal) => [
  {
    id: 'ok', faults: {},
    label: T('A voltage in the normal range for this battery with nothing connected', 'Un voltaje en el rango normal para esta pila sin nada conectado'),
    finding: T(`The reading is at or a little above the ${nominal} V nominal value, which is normal for a battery that is not supplying current.`, `La lectura está en el valor nominal de ${nominal} V o un poco por encima, lo normal en una pila que no entrega corriente.`),
    limit: T('This one no-load reading does not prove the battery’s capacity or overall health: a tired battery can show a good voltage until it has to supply current. The “lamp will not turn on” scenario lets you compare a battery with and without load.', 'Esta única lectura sin carga no demuestra la capacidad ni el estado general de la pila: una pila gastada puede mostrar buen voltaje hasta que tiene que entregar corriente. El caso «la lámpara no enciende» te deja comparar una batería con y sin carga.'),
  },
  {
    id: 'low', faults: { [lowFault]: true },
    label: T('A voltage clearly below nominal with nothing connected', 'Un voltaje claramente inferior al nominal sin nada conectado'),
    finding: T(`The reading is well below the ${nominal} V nominal value even though the battery is supplying no current. That is consistent with a largely discharged battery.`, `La lectura está muy por debajo del valor nominal de ${nominal} V aunque la pila no entrega corriente. Eso es coherente con una pila muy descargada.`),
    limit: T('A no-load voltage cannot say how much energy is left or whether a particular device will still run. Trying a known-good battery in the device is the practical comparison.', 'Un voltaje sin carga no puede decir cuánta energía queda ni si un aparato concreto seguirá funcionando. Probar una pila en buen estado en el aparato es la comparación práctica.'),
  },
];

export const SCENARIOS = {
  aa: {
    id: 'aa', circuit: 'aa', sw: null, mode: 'VDC', nominal: 1.5, range: 2, focus: 'aa', rest: 'center', diagram: 'aa', points: ['aa+', 'aa-'],
    title: T('AA battery voltage', 'Voltaje de la pila AA'),
    useful: T('Partly. A voltage reading tells you the battery’s voltage right now, with nothing connected. It cannot tell you how much capacity is left.', 'En parte. Una lectura de voltaje te dice el voltaje de la pila ahora mismo, sin nada conectado. No puede decirte cuánta capacidad le queda.'),
    hyps: batteryHyps('aa_low', '1.5'),
    meas: [{ id: 'term', red: 'aa+', black: 'aa-', sw: null, what: T('across the battery terminals (AA + to AA −)', 'entre los terminales de la pila (AA + a AA −)'), tells: T('the battery’s voltage with nothing connected', 'el voltaje de la pila sin nada conectado') }],
    cases: ['low', 'ok'],
  },
  b9: {
    id: 'b9', circuit: 'b9', sw: null, mode: 'VDC', nominal: 9, range: 20, focus: 'b9', rest: 'center', diagram: 'b9', points: ['b9+', 'b9-'],
    title: T('9 V battery voltage', 'Voltaje de la batería de 9 V'),
    useful: T('Partly. A voltage reading tells you the battery’s voltage right now, with nothing connected. It cannot tell you how much capacity is left.', 'En parte. Una lectura de voltaje te dice el voltaje de la batería ahora mismo, sin nada conectado. No puede decirte cuánta capacidad le queda.'),
    hyps: batteryHyps('b9_low', '9'),
    meas: [{ id: 'term', red: 'b9+', black: 'b9-', sw: null, what: T('across the battery snaps (9V + to 9V −) — one tip per snap, never the gap between them', 'entre los broches de la batería (9V + a 9V −): una punta por broche, nunca el hueco entre ellos'), tells: T('the battery’s voltage with nothing connected', 'el voltaje de la batería sin nada conectado') }],
    cases: ['ok', 'low'],
  },
  lamp9: loopScenario({
    id: 'lamp9', circuit: 'lamp9', nominal: 9, range: 20, rest: 'center', labels: TPL, pts: ['tp1', 'tp2', 'tp3', 'tp4', 'tp5', 'tp6'], swName: 'The switch',
    title: T('A lamp that will not turn on (9 V lamp circuit)', 'Una lámpara que no enciende (circuito de 9 V)'),
    useful: T('Yes. The switch is closed and the lamp is dark, so somewhere the battery’s voltage is not getting around the loop. Voltage readings show how far it gets. They cannot show how bright a lamp should be or how much battery capacity remains.', 'Sí. El interruptor está cerrado y la lámpara apagada, así que en algún punto el voltaje de la batería no completa el lazo. Las lecturas de voltaje muestran hasta dónde llega. No pueden mostrar qué brillo debería tener la lámpara ni cuánta capacidad le queda a la batería.'),
    f: { sw: 'l9_sw', w2: 'l9_w2', lamp: 'l9_lamp', w3: 'l9_w3' },
    srcWhat: T('across the battery with the switch closed (TP1 to TP6)', 'entre los terminales de la batería con el interruptor cerrado (TP1 a TP6)'),
    srcHyp: {
      id: 'src', faults: { l9_bat: true }, confirm: 'srcOpen',
      label: T('The battery cannot hold its voltage when the lamp draws current', 'La batería no mantiene su voltaje cuando la lámpara consume corriente'),
      finding: T('The battery’s voltage is far below 9 V while it is connected to the lamp and much higher with the switch open. A voltage that collapses under load is consistent with a depleted battery.', 'El voltaje de la batería está muy por debajo de 9 V mientras está conectada a la lámpara y es mucho mayor con el interruptor abierto. Un voltaje que se desploma con carga es coherente con una batería agotada.'),
      limit: T('Voltage readings show the collapse but not the remaining capacity. Fitting a known-good battery and measuring again is how this would be confirmed.', 'Las lecturas de voltaje muestran el desplome, pero no la capacidad restante. Colocar una batería en buen estado y volver a medir es la forma de confirmarlo.'),
    },
    extraMeas: [{ id: 'srcOpen', red: 'tp1', black: 'tp6', sw: false, aux: true, what: T('across the battery again, this time with the switch open (TP1 to TP6)', 'otra vez entre los terminales de la batería, ahora con el interruptor abierto (TP1 a TP6)'), tells: T('what the battery shows with no load, to compare with the loaded reading', 'qué muestra la batería sin carga, para compararlo con la lectura con carga') }],
    cases: ['w2', 'src', 'lamp', 'sw', 'w3'],
  }),
  panel24: loopScenario({
    id: 'panel24', circuit: 'panel24', nominal: 24, range: 200, rest: 'right', labels: XL, pts: ['x1', 'x3', 'x4', 'x5', 'x6', 'x2'], swName: 'S1',
    title: T('The simulated 24 V control circuit (lamp H1 stays off)', 'El circuito de control simulado de 24 V (la lámpara H1 no enciende)'),
    useful: T('Yes. S1 is closed and lamp H1 is dark. Measuring relative to the 0 V reference shows where the 24 V stops. This is the virtual training panel only — nothing here applies to opening real control equipment.', 'Sí. S1 está cerrado y la lámpara H1 apagada. Medir respecto a la referencia de 0 V muestra dónde se detienen los 24 V. Es solo el panel virtual de práctica: nada de esto se aplica a abrir equipos de control reales.'),
    f: { sw: 'p_sw', w2: 'w2open', lamp: 'p_lamp', w3: 'p_w3' },
    srcWhat: T('the supply, across +24 V and 0 V (X1 to X2)', 'la alimentación, entre +24 V y 0 V (X1 a X2)'),
    srcHyp: {
      id: 'src', faults: { p_sup: true },
      label: T('No voltage at the supply terminals', 'No hay voltaje en los terminales de alimentación'),
      finding: T('X1 to X2 reads about 0 V, and so does every point after it. With no supply voltage, nothing downstream can work.', 'Entre X1 y X2 hay unos 0 V, igual que en todos los puntos posteriores. Sin voltaje de alimentación, nada de lo que sigue puede funcionar.'),
      limit: T('Voltage testing on this panel cannot say why the supply is not delivering. The cause lies inside or ahead of the supply, outside this training panel — and a zero reading alone never proves that something is safe to touch.', 'Medir voltaje en este panel no puede decir por qué la alimentación no entrega. La causa está dentro de la fuente o antes de ella, fuera de este panel de práctica; además, una lectura de cero por sí sola nunca demuestra que algo sea seguro de tocar.'),
    },
    cases: ['w3', 'lamp', 'w2', 'sw', 'src'],
  }),
  ac12: {
    id: 'ac12', circuit: 'ac12', sw: null, mode: 'VAC', nominal: 12, range: 20, focus: 'ac12', rest: 'right', diagram: 'ac12', points: ['ac1', 'ac2'],
    title: T('The simulated 12 V AC source output', 'La salida de la fuente simulada de 12 V CA'),
    useful: T('Yes, for one question: is AC voltage present at the output terminals? The meter must be on V~. On V⎓ this source would read about zero even when it is working.', 'Sí, para una pregunta: ¿hay voltaje de CA en los terminales de salida? El medidor debe estar en V~. En V⎓ esta fuente marcaría casi cero aunque funcione.'),
    hyps: [
      {
        id: 'ok', faults: {},
        label: T('About 12 V AC (RMS) is present at the output', 'Hay unos 12 V CA (RMS) en la salida'),
        finding: T('The source is delivering its rated RMS voltage with nothing connected.', 'La fuente entrega su voltaje RMS nominal sin nada conectado.'),
        limit: T('An RMS reading does not show the peak (about 17 V here), the waveform, or how the voltage holds up when a load is connected.', 'Una lectura RMS no muestra el pico (unos 17 V aquí), la forma de onda ni cómo se mantiene el voltaje al conectar una carga.'),
      },
      {
        id: 'off', faults: { ac_off: true },
        label: T('No AC voltage at the output terminals', 'No hay voltaje de CA en los terminales de salida'),
        finding: T('With the meter confirmed on V~, the output reads about 0 V.', 'Con el medidor confirmado en V~, la salida marca unos 0 V.'),
        limit: T('Voltage testing at the output cannot say why the source is not delivering. And a zero reading alone never proves that something is safe to touch.', 'Medir voltaje en la salida no puede decir por qué la fuente no entrega. Y una lectura de cero por sí sola nunca demuestra que algo sea seguro de tocar.'),
      },
    ],
    meas: [{ id: 'term', red: 'ac1', black: 'ac2', sw: null, what: T('across the output terminals (AC 1 to AC 2)', 'entre los terminales de salida (AC 1 a AC 2)'), tells: T('whether AC voltage is present at the output', 'si hay voltaje de CA en la salida') }],
    cases: ['ok', 'off'],
  },
};

export const GOALS = [
  { id: 'battery', title: T('Battery voltage', 'Voltaje de una pila'), sub: ['aa', 'b9'] },
  { id: 'lamp9', title: T('A lamp that will not turn on', 'Una lámpara que no enciende'), scn: 'lamp9' },
  { id: 'panel24', title: T('The simulated 24 V control circuit', 'El circuito de control simulado de 24 V'), scn: 'panel24' },
  { id: 'ac12', title: T('The simulated 12 V AC source', 'La fuente simulada de 12 V CA'), scn: 'ac12' },
  { id: 'other', title: T('Something else, or real equipment', 'Otra cosa, o un equipo real') },
];

// ---- engine ----------------------------------------------------------------
export const tol = (scn) => Math.max(0.3, scn.nominal * 0.04);
const hyp = (scn, id) => scn.hyps.find((h) => h.id === id);
const meas = (scn, id) => scn.meas.find((m) => m.id === id);

// Voltage (red − black) that the circuit would produce for one cause.
export function predictValue(scn, faults, m) {
  const sw = scn.sw ? { [scn.sw]: m.sw } : {};
  const a = TERMINALS[m.red].n; const b = TERMINALS[m.black].n;
  const sol = solveCircuit(scn.circuit, sw, faults, [a, b]);
  const v = sol.v(a) - sol.v(b);
  return CIRCUITS[scn.circuit].kind === 'ac' ? Math.abs(v) : v;
}
export const healthyValue = (scn, m) => predictValue(scn, {}, m);

// Causes that agree with every reading taken so far.
export function consistent(scn, readings) {
  return scn.hyps.filter((h) => readings.every((r) => Math.abs(predictValue(scn, h.faults, meas(scn, r.id)) - r.value) <= tol(scn)));
}

// Group causes by the reading each would produce for measurement m.
export function outcomes(scn, hyps, m) {
  const groups = [];
  hyps.forEach((h) => {
    const v = predictValue(scn, h.faults, m);
    const g = groups.find((x) => Math.abs(x.value - v) <= tol(scn));
    if (g) g.hyps.push(h); else groups.push({ value: v, hyps: [h] });
  });
  return groups;
}

// Next measurement: the one that best separates the causes still possible.
export function recommend(scn, readings) {
  const taken = new Set(readings.map((r) => r.id));
  const left = scn.meas.filter((m) => !taken.has(m.id));
  if (!readings.length) return { m: scn.meas[0], reason: 'first' };
  const live = consistent(scn, readings);
  let best = null;
  left.filter((m) => !m.aux).forEach((m) => {
    const g = outcomes(scn, live, m);
    if (g.length < 2) return;
    const worst = Math.max(...g.map((x) => x.hyps.length));
    if (!best || worst < best.worst) best = { m, worst };
  });
  if (best) return { m: best.m, reason: 'split' };
  // One cause left but only one reading taken: ask for a confirming reading.
  if (live.length === 1 && readings.length < 2 && left.length) {
    const h = live[0];
    const pick = (h.confirm && left.find((m) => m.id === h.confirm))
      || left.filter((m) => !m.aux).sort((x, y) => Math.abs(predictValue(scn, h.faults, y) - healthyValue(scn, y)) - Math.abs(predictValue(scn, h.faults, x) - healthyValue(scn, x)))[0];
    if (pick) return { m: pick, reason: 'confirm' };
  }
  return null;
}

export function newSession(scn, count) {
  const actual = scn.cases[count % scn.cases.length];
  return { scn: scn.id, actual, faults: { ...hyp(scn, actual).faults }, readings: [], cur: recommend(scn, []), predicted: undefined };
}

export const fmtV = (v) => (Math.abs(v) < 0.05 ? '0 V' : `${(Math.round(v * 10) / 10).toString()} V`);

// Three prediction choices for "what would a healthy circuit show here?"
export function predictOptions(scn, m) {
  const n = scn.nominal;
  const vals = [n, 0, n / 2];
  const h = Math.abs(healthyValue(scn, m));
  let correct = 0;
  vals.forEach((v, i) => { if (Math.abs(v - h) < Math.abs(vals[correct] - h)) correct = i; });
  return { vals, correct };
}
export { hyp, meas, tp };

export const DXUI = {
  btn: T('Help me diagnose', 'Ayúdame a diagnosticar'),
  mode: T('Diagnose', 'Diagnóstico'),
  pickQ: T('What are you trying to check?', '¿Qué quieres comprobar?'),
  pickIntro: T('Choose one. You will be told whether a voltage measurement can help, how to set the meter, exactly where both probes go, and what each reading does and does not tell you.', 'Elige una opción. Sabrás si medir voltaje puede ayudar, cómo ajustar el medidor, dónde va exactamente cada punta y qué te dice, y qué no, cada lectura.'),
  whichBattery: T('Which battery?', '¿Qué pila?'),
  otherTitle: T('Outside this guide', 'Fuera de esta guía'),
  otherBody: T('This guide only works on the simulator’s own training scenarios: the two batteries, the 9 V lamp circuit, the virtual 24 V panel and the 12 V AC training source. It cannot guide a measurement on real equipment. For anything real — and above all anything connected to mains power — fault-finding belongs to a trained, authorized person using their own meter’s manual. You can practise the same reasoning here on the scenarios in the list.', 'Esta guía solo funciona con los casos de práctica del simulador: las dos pilas, el circuito de lámpara de 9 V, el panel virtual de 24 V y la fuente de práctica de 12 V CA. No puede guiar una medición en un equipo real. Para cualquier cosa real, y sobre todo si está conectada a la red eléctrica, buscar fallas corresponde a una persona formada y autorizada que use el manual de su propio medidor. Aquí puedes practicar el mismo razonamiento con los casos de la lista.'),
  caseN: T('Case {n}', 'Caso {n}'),
  usefulQ: T('Is a voltage measurement useful here?', '¿Sirve aquí medir voltaje?'),
  setupTitle: T('Set up the meter', 'Preparar el medidor'),
  adviceJacks: T('Jacks: black lead in COM, red lead in V/Ω. Never A or mA.', 'Bornes: cable negro en COM, cable rojo en V/Ω. Nunca A ni mA.'),
  adviceDC: T('Setting: this is a DC source, so turn the selector to V⎓.', 'Ajuste: es una fuente de CC, así que gira el selector a V⎓.'),
  adviceAC: T('Setting: this is an AC source, so turn the selector to V~.', 'Ajuste: es una fuente de CA, así que gira el selector a V~.'),
  adviceRange: T('Range: you expect about {n} V. Use AUTO, or the {r} V manual range (the smallest one that fits).', 'Rango: esperas unos {n} V. Usa AUTO o el rango manual de {r} V (el menor que lo abarca).'),
  subInspect: T('Meter and both leads inspected, no damage', 'Medidor y ambos cables inspeccionados, sin daños'),
  subJacks: T('Black in COM, red in V/Ω — confirmed', 'Negro en COM, rojo en V/Ω: confirmado'),
  subFunc: T('Selector on {f} — confirmed', 'Selector en {f}: confirmado'),
  subRange: T('Range AUTO or {r} V and above — confirmed', 'Rango AUTO o de {r} V en adelante: confirmado'),
  subHandling: T('Handling rules confirmed (guards, no bridging)', 'Reglas de manejo confirmadas (guardas, sin puentear)'),
  setupHint: T('Use the “Pre-measurement check” list below to inspect and confirm each item.', 'Usa la lista «Comprobación previa a la medición» de abajo para inspeccionar y confirmar cada punto.'),
  measN: T('Measurement {n}', 'Medición {n}'),
  measure: T('Measure {what}.', 'Mide {what}.'),
  tells: T('This shows {tells}.', 'Esto muestra {tells}.'),
  whereTitle: T('Where both probes go', 'Dónde va cada punta'),
  where: T('With no probe in hand, click {a} and {b} to identify them. Then put the BLACK probe on {b} and the RED probe on {a}.', 'Sin punta en la mano, haz clic en {a} y {b} para identificarlos. Luego pon la punta NEGRA en {b} y la ROJA en {a}.'),
  swClosed: T('Keep the switch closed.', 'Mantén el interruptor cerrado.'),
  swOpen: T('First open the switch (click it).', 'Primero abre el interruptor (haz clic en él).'),
  predictQ: T('Before you measure: what would you read here if everything were working?', 'Antes de medir: ¿qué leerías aquí si todo funcionara?'),
  about: T('About {v}', 'Unos {v}'),
  subPredicted: T('Prediction made', 'Predicción hecha'),
  subSwitch: T('Switch {s}', 'Interruptor {s}'),
  subPoints: T('Test points identified: {a} + {b}', 'Puntos identificados: {a} + {b}'),
  subProbes: T('Black on {b}, red on {a}', 'Negra en {b}, roja en {a}'),
  subSteady: T('Steady, valid reading (right mode, no OL, no HOLD)', 'Lectura estable y válida (modo correcto, sin OL, sin HOLD)'),
  resultTitle: T('What you measured', 'Lo que mediste'),
  measured: T('Measured', 'Medido'),
  expected: T('Expected if all is working', 'Esperado si todo funciona'),
  predicted: T('Your prediction', 'Tu predicción'),
  match: T('The reading matches what you would see at these points if everything were working.', 'La lectura coincide con lo que verías en estos puntos si todo funcionara.'),
  differ: T('The reading differs from what you would see at these points if everything were working.', 'La lectura difiere de lo que verías en estos puntos si todo funcionara.'),
  ruledOut: T('Explanations ruled out by this reading', 'Explicaciones descartadas por esta lectura'),
  ruledNone: T('This reading rules out nothing new.', 'Esta lectura no descarta nada nuevo.'),
  still: T('Explanations that still fit every reading', 'Explicaciones que aún concuerdan con todas las lecturas'),
  ambiguous: T('This reading alone cannot tell these apart, so no component is being blamed yet.', 'Esta lectura por sí sola no permite distinguirlas, así que todavía no se culpa a ningún componente.'),
  oneNeedsConfirm: T('Only one explanation fits so far, but it rests on a single reading. One more reading will confirm it before anything is named.', 'Por ahora solo encaja una explicación, pero se apoya en una sola lectura. Una lectura más la confirmará antes de nombrar nada.'),
  nextTitle: T('Next measurement', 'Siguiente medición'),
  nextSplit: T('Measure {what}. That reading separates what is left:', 'Mide {what}. Esa lectura separa lo que queda:'),
  nextConfirm: T('Measure {what} to confirm.', 'Mide {what} para confirmarlo.'),
  wouldPoint: T('about {v} would point to: {h}', 'unos {v} apuntarían a: {h}'),
  cont: T('Continue', 'Continuar'),
  conclTitle: T('What the evidence shows', 'Lo que muestra la evidencia'),
  conclOne: T('Your {n} readings fit one explanation:', 'Tus {n} lecturas concuerdan con una explicación:'),
  conclSingle: T('Only one voltage measurement is possible here, so the conclusion is limited to what that single reading can show:', 'Aquí solo es posible una medición de voltaje, así que la conclusión se limita a lo que esa única lectura puede mostrar:'),
  conclMany: T('Voltage readings at the available test points cannot separate these possibilities:', 'Las lecturas de voltaje en los puntos disponibles no permiten separar estas posibilidades:'),
  conclNone: T('These readings do not fit any cause modelled in this scenario. Check the meter setup and probe positions, then start the case again.', 'Estas lecturas no concuerdan con ninguna causa modelada en este caso. Revisa el ajuste del medidor y la posición de las puntas, y empieza el caso otra vez.'),
  limitTitle: T('What voltage testing cannot establish here', 'Lo que medir voltaje no puede establecer aquí'),
  revealTitle: T('Instructor’s answer', 'Respuesta del instructor'),
  revealFault: T('The condition modelled in this case was: {h}.', 'La condición modelada en este caso era: {h}.'),
  evidence: T('Readings so far', 'Lecturas hasta ahora'),
  wrapTitle: T('Finish the job', 'Terminar el trabajo'),
  wrapProbes: T('Probes removed (red first, then black)', 'Puntas retiradas (primero la roja, luego la negra)'),
  wrapOff: T('Meter turned off', 'Medidor apagado'),
  again: T('Another case like this', 'Otro caso como este'),
  back: T('Check something else', 'Comprobar otra cosa'),
  needSwitch: T('The switch is not in the position this measurement needs.', 'El interruptor no está en la posición que requiere esta medición.'),
};
