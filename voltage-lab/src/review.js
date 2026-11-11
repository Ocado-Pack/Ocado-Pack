// Spaced review: a local practice queue that tracks performance by concept.
// Pure logic and content only; storage is handled by the caller.
import { T } from './i18n.js';
import { EXERCISES, createRuntime } from './ctl.js';

export const CONCEPTS = [
  { id: 'sym', name: T('Symbol recognition', 'Reconocimiento de símbolos') },
  { id: 'nonc', name: T('NO/NC reference state', 'Estado de referencia NA/NC') },
  { id: 'logic', name: T('Series and parallel logic', 'Lógica serie y paralelo') },
  { id: 'coil', name: T('Coil/contact relationships', 'Relación bobina/contacto') },
  { id: 'hold', name: T('Holding circuits', 'Circuitos de retención') },
  { id: 'd2p', name: T('Drawing-to-panel matching', 'Del plano al tablero') },
  { id: 'diag', name: T('Diagnostic reasoning', 'Razonamiento de diagnóstico') },
  { id: 'verify', name: T('Repair verification', 'Verificación de la reparación') },
];

// Practice defaults (minutes). Shown to the learner and editable; not a guaranteed learning formula.
export const DEFAULTS = { help: 10, first: 60, second: 1440, third: 4320, fourth: 10080, gap: 3, perQuestion: 40 };
const MIN = 60000;

export const newState = () => ({ v: 1, cfg: { ...DEFAULTS }, recs: {}, log: [] });
const rec = (st, id) => st.recs[id] || (st.recs[id] = { stage: 0, due: 0, last: 0, attempts: 0, correct: 0, hints: 0, conf: null, lastOK: null, revealedAt: 0, priority: false, v: 0 });

// Record one attempt on a concept and schedule its next review.
export function record(st, concept, { correct, hint = false, conf = null }, now) {
  const r = rec(st, concept); const c = st.cfg;
  r.attempts += 1; r.last = now; r.conf = conf; r.lastOK = !!correct;
  if (hint) r.hints += 1;
  if (!correct) {
    r.stage = 0; r.due = now; r.revealedAt = now; r.priority = conf === 'high';
    r.outcome = 'wrong';
  } else {
    r.correct += 1; r.priority = false;
    // A right answer straight after the answer was shown, or with a hint, is not counted as mastery.
    const helped = hint || (r.revealedAt && now - r.revealedAt < c.help * MIN);
    if (helped) { r.due = now + c.help * MIN; r.outcome = 'helped'; } else {
      r.stage = Math.min(4, r.stage + 1);
      r.due = now + [c.first, c.first, c.second, c.third, c.fourth][r.stage] * MIN;
      r.outcome = 'solo';
    }
  }
  st.log.push({ c: concept, ok: !!correct, hint: !!hint, conf, t: now });
  if (st.log.length > 400) st.log.splice(0, st.log.length - 400);
  return r;
}

export const accuracy = (r) => (r && r.attempts ? r.correct / r.attempts : null);
// Concepts whose review time has arrived (never-attempted concepts count as due).
export function dueList(st, now) {
  return CONCEPTS.map((c) => ({ id: c.id, r: st.recs[c.id] }))
    .filter((x) => !x.r || x.r.due <= now)
    .sort((a, b) => ((b.r && b.r.priority ? 1 : 0) - (a.r && a.r.priority ? 1 : 0)) || ((a.r ? a.r.due : 0) - (b.r ? b.r.due : 0)))
    .map((x) => x.id);
}
export function weakest(st) {
  return CONCEPTS.map((c) => ({ id: c.id, r: st.recs[c.id] }))
    .sort((a, b) => ((a.r ? a.r.stage : -1) - (b.r ? b.r.stage : -1)) || ((accuracy(a.r) ?? -1) - (accuracy(b.r) ?? -1)))
    .map((x) => x.id);
}
// A manageable session: due items first (priority first), then the weakest concepts.
export function buildSession(st, now, kind) {
  const c = st.cfg;
  if (kind === 'interview') {
    const order = weakest(st);
    return [...order, ...order.filter((id) => !st.recs[id] || st.recs[id].stage < 2)];
  }
  const n = Math.max(3, Math.floor((5 * 60) / c.perQuestion));
  const due = dueList(st, now);
  const fill = weakest(st).filter((id) => !due.includes(id));
  return [...due, ...fill].slice(0, n);
}
export const estimateMinutes = (st, n) => Math.max(1, Math.round((n * st.cfg.perQuestion) / 60));

const on = T('On / running', 'Encendido / en marcha'); const off = T('Off / stopped', 'Apagado / parado');
const ONOFF = [['on', on], ['off', off]];
const ckt = (ex, acts) => ({ ex, acts });

export const QUESTIONS = [
  { id: 'sym1', c: 'sym', fig: { sym: 'no' }, p: T('What does this symbol show?', '¿Qué muestra este símbolo?'), ch: [['a', T('A normally open (NO) contact', 'Un contacto normalmente abierto (NA)')], ['b', T('A normally closed (NC) contact', 'Un contacto normalmente cerrado (NC)')], ['c', T('A coil', 'Una bobina')]], a: 'a', h: T('Look at the gap: is there a path through it at rest?', 'Mira el hueco: ¿hay camino a través de él en reposo?'), x: T('The lever does not touch the fixed contact, so there is no path at rest: normally open.', 'La palanca no toca el contacto fijo, así que en reposo no hay camino: normalmente abierto.') },
  { id: 'sym2', c: 'sym', fig: { sym: 'nc' }, p: T('What does this symbol show?', '¿Qué muestra este símbolo?'), ch: [['a', T('A normally open (NO) contact', 'Un contacto normalmente abierto (NA)')], ['b', T('A normally closed (NC) contact', 'Un contacto normalmente cerrado (NC)')], ['c', T('A lamp', 'Una lámpara')]], a: 'b', h: T('The lever reaches the fixed contact.', 'La palanca llega al contacto fijo.'), x: T('The lever touches the fixed contact, so there is a path at rest: normally closed.', 'La palanca toca el contacto fijo, así que en reposo hay camino: normalmente cerrado.') },
  { id: 'sym3', c: 'sym', fig: { sym: 'coil' }, p: T('What does this symbol show?', '¿Qué muestra este símbolo?'), ch: [['a', T('A pushbutton', 'Un pulsador')], ['b', T('A relay or contactor coil', 'La bobina de un relé o contactor')], ['c', T('An overload contact', 'Un contacto de sobrecarga')]], a: 'b', h: T('A rectangle in a control rung is a load that operates contacts.', 'Un rectángulo en un circuito de control es una carga que acciona contactos.'), x: T('The rectangle is a coil. When it is energized, the contacts carrying the same reference label change state.', 'El rectángulo es una bobina. Cuando se energiza, los contactos con la misma referencia cambian de estado.') },
  { id: 'sym4', c: 'sym', fig: { sym: 'pb_nc' }, p: T('What does this symbol show?', '¿Qué muestra este símbolo?'), ch: [['a', T('A normally closed pushbutton', 'Un pulsador normalmente cerrado')], ['b', T('A normally open pushbutton', 'Un pulsador normalmente abierto')], ['c', T('A maintained switch', 'Un interruptor mantenido')]], a: 'a', h: T('Two clues: the push actuator on top, and whether the lever touches.', 'Dos pistas: el actuador de pulsar arriba y si la palanca toca.'), x: T('The actuator mark shows it is pushed by hand; the closed lever shows it conducts until pressed. STOP buttons are drawn like this.', 'La marca del actuador indica que se pulsa a mano; la palanca cerrada indica que conduce hasta que se pulsa. Los botones STOP se dibujan así.') },
  { id: 'nonc1', c: 'nonc', p: T('In which state does a schematic show its contacts?', '¿En qué estado muestra un esquema sus contactos?'), ch: [['a', T('At rest: nothing pressed, coils de-energized', 'En reposo: nada pulsado, bobinas sin energía')], ['b', T('With the machine running', 'Con la máquina en marcha')], ['c', T('Whatever state the machine was in when it was drawn', 'El estado que tenía la máquina cuando se dibujó')]], a: 'a', h: T('“Normally” in NO and NC refers to this state.', '«Normalmente» en NA y NC se refiere a este estado.'), x: T('Drawings use the reference state: unoperated and de-energized. “Normally open” means open in that state, not “usually open while running”.', 'Los planos usan el estado de referencia: sin accionar y sin energía. «Normalmente abierto» significa abierto en ese estado, no «habitualmente abierto en marcha».') },
  { id: 'nonc2', c: 'nonc', p: T('{STOP} is a normally closed pushbutton. Nobody is touching it. Is its contact open or closed?', '{STOP} es un pulsador normalmente cerrado. Nadie lo toca. ¿Su contacto está abierto o cerrado?'), ch: [['a', T('Closed — it conducts until someone presses it', 'Cerrado: conduce hasta que alguien lo pulsa')], ['b', T('Open — it conducts only while pressed', 'Abierto: conduce solo mientras se pulsa')]], a: 'a', h: T('NC describes the untouched state.', 'NC describe el estado sin tocar.'), x: T('NC means closed at rest. Pressing STOP opens it and breaks the path to the coil.', 'NC significa cerrado en reposo. Pulsar STOP lo abre e interrumpe el camino hacia la bobina.') },
  { id: 'nonc3', c: 'nonc', p: T('Coil {K1} is de-energized. What is the state of a normally open contact of {K1}?', 'La bobina {K1} está sin energía. ¿Cuál es el estado de un contacto normalmente abierto de {K1}?'), ch: [['a', T('Open', 'Abierto')], ['b', T('Closed', 'Cerrado')], ['c', T('It depends on the START button', 'Depende del botón START')]], a: 'a', h: T('De-energized is the reference state.', 'Sin energía es el estado de referencia.'), x: T('A NO contact is open in the reference state and closes only while its coil is energized.', 'Un contacto NA está abierto en el estado de referencia y cierra solo mientras su bobina está energizada.') },
  { id: 'log1', c: 'logic', fig: ckt('B', [['toggle', 'SA']]), p: T('{SA} is closed and {SB} is open. What does {H1} do?', '{SA} está cerrado y {SB} abierto. ¿Qué hace {H1}?'), ch: ONOFF, a: ckt('B', [['toggle', 'SA']]), h: T('Follow the single path from +24 V to 0 V.', 'Sigue el único camino de +24 V a 0 V.'), x: T('The contacts are in series (AND). One open contact breaks the only path.', 'Los contactos están en serie (Y). Un contacto abierto interrumpe el único camino.') },
  { id: 'log2', c: 'logic', fig: ckt('B', [['toggle', 'SA'], ['toggle', 'SB']]), p: T('{SA} and {SB} are both closed. What does {H1} do?', '{SA} y {SB} están cerrados. ¿Qué hace {H1}?'), ch: ONOFF, a: ckt('B', [['toggle', 'SA'], ['toggle', 'SB']]), h: T('Is every contact in the path closed?', '¿Está cerrado cada contacto del camino?'), x: T('Series contacts all closed: the path is complete.', 'Contactos en serie todos cerrados: el camino está completo.') },
  { id: 'log3', c: 'logic', fig: ckt('C', [['toggle', 'SB']]), p: T('{SA} is open and {SB} is closed. What does {H1} do?', '{SA} está abierto y {SB} cerrado. ¿Qué hace {H1}?'), ch: ONOFF, a: ckt('C', [['toggle', 'SB']]), h: T('Count the paths to the load.', 'Cuenta los caminos hacia la carga.'), x: T('The contacts are in parallel (OR). One closed branch is enough.', 'Los contactos están en paralelo (O). Basta una rama cerrada.') },
  { id: 'log4', c: 'logic', fig: ckt('C', []), p: T('{SA} and {SB} are both open. What does {H1} do?', '{SA} y {SB} están abiertos. ¿Qué hace {H1}?'), ch: ONOFF, a: ckt('C', []), h: T('Is any branch closed?', '¿Hay alguna rama cerrada?'), x: T('Parallel branches all open: no path at all.', 'Ramas en paralelo todas abiertas: no hay ningún camino.') },
  { id: 'coil1', c: 'coil', p: T('Coil {K1} becomes energized. What do the contacts labelled {K1} do?', 'La bobina {K1} se energiza. ¿Qué hacen los contactos rotulados {K1}?'), ch: [['a', T('Its NO contacts close and its NC contacts open', 'Sus contactos NA cierran y sus NC abren')], ['b', T('Nothing until START is released', 'Nada hasta que se suelte START')], ['c', T('Its NO contacts open and its NC contacts close', 'Sus contactos NA abren y sus NC cierran')]], a: 'a', h: T('Energizing moves every contact away from its reference state.', 'Energizar aleja cada contacto de su estado de referencia.'), x: T('All contacts of a device change together when its coil is energized: NO closes, NC opens.', 'Todos los contactos de un dispositivo cambian a la vez cuando su bobina se energiza: NA cierra, NC abre.') },
  { id: 'coil2', c: 'coil', p: T('A contact on the drawing carries the label {K1}. What operates it?', 'Un contacto del plano lleva la referencia {K1}. ¿Qué lo acciona?'), ch: [['a', T('The coil with the same label, {K1}', 'La bobina con la misma referencia, {K1}')], ['b', T('The nearest pushbutton on the drawing', 'El pulsador más cercano en el plano')], ['c', T('Whatever load is in the same rung', 'La carga que esté en el mismo circuito')]], a: 'a', h: T('Reference labels tie parts of one device together.', 'Las referencias unen las partes de un mismo dispositivo.'), x: T('A coil and its contacts share one reference label, however far apart they are drawn.', 'Una bobina y sus contactos comparten una referencia, por muy separados que estén dibujados.') },
  { id: 'coil3', c: 'coil', p: T('The holding contact in a starter is assigned to the overload relay instead of {K1}. What goes wrong?', 'El contacto de retención de un arrancador se asigna al relé de sobrecarga en lugar de a {K1}. ¿Qué falla?'), ch: [['a', T('It does not follow the coil, so it cannot hold the coil in', 'No sigue a la bobina, así que no puede retenerla')], ['b', T('Nothing: any NO contact works', 'Nada: cualquier contacto NA sirve')], ['c', T('The lamp becomes brighter', 'La lámpara brilla más')]], a: 'a', h: T('Which device must the contact copy?', '¿A qué dispositivo debe copiar el contacto?'), x: T('A holding contact must close because its own coil pulled in. A contact of another device follows that other device.', 'Un contacto de retención debe cerrar porque su propia bobina actuó. Un contacto de otro dispositivo sigue a ese otro dispositivo.') },
  { id: 'hold1', c: 'hold', fig: ckt('D', [['press', 'START'], ['release', 'START']]), p: T('{START} was pressed and then released. What does {M1} do now?', 'Se pulsó {START} y luego se soltó. ¿Qué hace {M1} ahora?'), ch: ONOFF, a: ckt('D', [['press', 'START'], ['release', 'START']]), h: T('Look for a second path around START.', 'Busca un segundo camino alrededor de START.'), x: T('The {K1} contact in parallel with START closed when the coil pulled in, so the coil keeps itself energized.', 'El contacto de {K1} en paralelo con START cerró cuando actuó la bobina, así que la bobina se mantiene energizada.') },
  { id: 'hold2', c: 'hold', fig: ckt('D', [['press', 'START'], ['release', 'START'], ['powerOff'], ['powerOn']]), p: T('{M1} was running. Control power was lost and has now returned. Nobody touched a button. What does {M1} do?', '{M1} estaba en marcha. Se perdió la alimentación de control y ya volvió. Nadie tocó un botón. ¿Qué hace {M1}?'), ch: ONOFF, a: ckt('D', [['press', 'START'], ['release', 'START'], ['powerOff'], ['powerOn']]), h: T('What happened to the holding contact when the coil lost power?', '¿Qué le pasó al contacto de retención cuando la bobina perdió energía?'), x: T('Losing power dropped the coil, which opened the holding contact. With START open too, nothing re-energizes the coil. A new START is needed.', 'Al perder energía cayó la bobina y se abrió el contacto de retención. Con START también abierto, nada vuelve a energizar la bobina. Hace falta un nuevo START.') },
  { id: 'hold3', c: 'hold', p: T('Where is a holding contact connected?', '¿Dónde se conecta un contacto de retención?'), ch: [['a', T('In parallel with START only', 'En paralelo solo con START')], ['b', T('In parallel with START and STOP together', 'En paralelo con START y STOP juntos')], ['c', T('In series with the coil', 'En serie con la bobina')]], a: 'a', h: T('STOP must still be able to break the path.', 'STOP aún debe poder interrumpir el camino.'), x: T('Around START only. If it also went around STOP, pressing STOP could not drop the coil.', 'Solo alrededor de START. Si también rodeara a STOP, pulsar STOP no podría desenergizar la bobina.') },
  { id: 'hold4', c: 'hold', fig: ckt('D', [['press', 'START'], ['release', 'START'], ['trip'], ['reset']]), p: T('{M1} was running, the overload tripped, and it has just been reset. What does {M1} do?', '{M1} estaba en marcha, disparó la sobrecarga y se acaba de rearmar. ¿Qué hace {M1}?'), ch: ONOFF, a: ckt('D', [['press', 'START'], ['release', 'START'], ['trip'], ['reset']]), h: T('The trip dropped the coil. What is holding it now?', 'El disparo desenergizó la bobina. ¿Qué la retiene ahora?'), x: T('The trip opened the path and the holding contact dropped out. Resetting closes the overload contact again, but the coil still needs a START.', 'El disparo abrió el camino y el contacto de retención cayó. Rearmar vuelve a cerrar el contacto de sobrecarga, pero la bobina sigue necesitando un START.') },
  { id: 'd2p1', c: 'd2p', p: T('On the drawing, a contact labelled {K1} is shown far away from the {K1} coil. Where is that contact physically?', 'En el plano, un contacto rotulado {K1} aparece lejos de la bobina {K1}. ¿Dónde está físicamente ese contacto?'), ch: [['a', T('On the {K1} device itself', 'En el propio dispositivo {K1}')], ['b', T('In a separate box somewhere else', 'En una caja aparte en otro lugar')], ['c', T('It exists only on paper', 'Solo existe en el papel')]], a: 'a', h: T('The label names the device, not the place on the page.', 'La referencia nombra el dispositivo, no el lugar en la página.'), x: T('Drawings place symbols where they make the logic readable. Parts with one reference label belong to one physical device.', 'Los planos colocan los símbolos donde la lógica se lee mejor. Las partes con una misma referencia pertenecen a un solo dispositivo físico.') },
  { id: 'd2p2', c: 'd2p', p: T('Several wires meet at one dot on the drawing. What does that mean on the panel?', 'Varios cables se unen en un punto del plano. ¿Qué significa eso en el tablero?'), ch: [['a', T('Those terminals are joined by wire and are one electrical point', 'Esos terminales están unidos por cable y son un solo punto eléctrico')], ['b', T('The wires merely cross without touching', 'Los cables solo se cruzan sin tocarse')], ['c', T('A component is missing there', 'Ahí falta un componente')]], a: 'a', h: T('Think “node”.', 'Piensa en «nodo».'), x: T('A dot is a node: everything joined there is at the same potential, even if the terminals sit in different places on the panel.', 'Un punto es un nodo: todo lo unido ahí está al mismo potencial, aunque los terminales estén en lugares distintos del tablero.') },
  { id: 'd2p3', c: 'd2p', p: T('You need to find {F1} on the equipment. Which clue from the drawing helps most?', 'Necesitas encontrar {F1} en el equipo. ¿Qué pista del plano ayuda más?'), ch: [['a', T('Its reference label, which should also be marked on the device', 'Su referencia, que también debería estar marcada en el dispositivo')], ['b', T('Its position on the page', 'Su posición en la página')], ['c', T('The thickness of the lines', 'El grosor de las líneas')]], a: 'a', h: T('What is printed both on the drawing and on the hardware?', '¿Qué está impreso tanto en el plano como en el equipo?'), x: T('Reference labels link drawing and hardware. Page position says nothing about physical location.', 'Las referencias enlazan plano y equipo. La posición en la página no dice nada de la ubicación física.') },
  { id: 'diag1', c: 'diag', p: T('A contact should be closed. You read 24 V before it and 0 V after it, both relative to 0 V. What does that evidence show?', 'Un contacto debería estar cerrado. Lees 24 V antes y 0 V después, ambos respecto a 0 V. ¿Qué muestra esa evidencia?'), ch: [['a', T('The path is open at that contact or its connections', 'El camino está abierto en ese contacto o en sus conexiones')], ['b', T('The supply has failed', 'La alimentación falló')], ['c', T('The coil is burnt out', 'La bobina está quemada')]], a: 'a', h: T('Where does the voltage stop?', '¿Dónde se detiene el voltaje?'), x: T('Voltage present on one side and absent on the other locates an open between the two points.', 'Voltaje presente en un lado y ausente en el otro ubica una interrupción entre los dos puntos.') },
  { id: 'diag2', c: 'diag', p: T('{M1} will not start. With {START} pressed you read 0 V across coil {K1}. What can you conclude from that one reading?', '{M1} no arranca. Con {START} pulsado lees 0 V en la bobina {K1}. ¿Qué puedes concluir con esa única lectura?'), ch: [['a', T('Voltage is not reaching the coil; more readings are needed to find where it stops', 'El voltaje no llega a la bobina; hacen falta más lecturas para ver dónde se detiene')], ['b', T('The coil has failed', 'La bobina falló')], ['c', T('The START button has failed', 'El botón START falló')]], a: 'a', h: T('Several different opens would give this same reading.', 'Varias interrupciones distintas darían esta misma lectura.'), x: T('One reading that fits several causes cannot name one of them. It only narrows the search.', 'Una lectura que concuerda con varias causas no puede señalar una. Solo acota la búsqueda.') },
  { id: 'diag3', c: 'diag', p: T('With {START} pressed, there is 24 V across coil {K1} but it does not pull in. Which explanation fits?', 'Con {START} pulsado hay 24 V en la bobina {K1} pero no actúa. ¿Qué explicación concuerda?'), ch: [['a', T('An open in the coil itself', 'Una interrupción en la propia bobina')], ['b', T('An open STOP contact', 'Un contacto de STOP abierto')], ['c', T('A tripped overload', 'Una sobrecarga disparada')]], a: 'a', h: T('Would an open STOP let 24 V reach the coil?', '¿Un STOP abierto dejaría llegar 24 V a la bobina?'), x: T('Full voltage across a load that does nothing means the path up to it is good and the load itself is open.', 'Voltaje completo en una carga que no hace nada significa que el camino hasta ella está bien y la propia carga está abierta.') },
  { id: 'ver1', c: 'verify', p: T('You have replaced the part you diagnosed. What comes next?', 'Reemplazaste la pieza que diagnosticaste. ¿Qué sigue?'), ch: [['a', T('Prove every required function works, and record what you observed', 'Demostrar que cada función requerida funciona y registrar lo observado')], ['b', T('Close the job: the faulty part is gone', 'Cerrar el trabajo: la pieza defectuosa ya no está')], ['c', T('Replace the neighbouring parts as well', 'Reemplazar también las piezas vecinas')]], a: 'a', h: T('Replacing a part is not the same as proving the machine works.', 'Reemplazar una pieza no es lo mismo que demostrar que la máquina funciona.'), x: T('A repair is finished only when the operating sequence has been demonstrated, including stopping and not restarting on its own.', 'Una reparación termina solo cuando se ha demostrado la secuencia de funcionamiento, incluida la parada y que no vuelva a arrancar sola.') },
  { id: 'ver2', c: 'verify', p: T('Which check shows that the machine will not restart by itself after a power interruption?', '¿Qué comprobación muestra que la máquina no volverá a arrancar sola tras un corte de energía?'), ch: [['a', T('Remove control power while running, restore it, and observe that it stays stopped', 'Quitar la alimentación de control en marcha, restablecerla y observar que sigue parada')], ['b', T('Press START twice', 'Pulsar START dos veces')], ['c', T('Measure the supply voltage', 'Medir el voltaje de alimentación')]], a: 'a', h: T('The check has to include the power coming back.', 'La comprobación debe incluir el regreso de la energía.'), x: T('Only an actual loss and return of control power demonstrates that a new START command is required.', 'Solo una pérdida y un regreso reales de la alimentación de control demuestran que se requiere una nueva orden de START.') },
  { id: 'ver3', c: 'verify', p: T('After your repair, the first verification check fails: the original symptom is still there. What now?', 'Tras tu reparación, la primera comprobación falla: el síntoma original sigue ahí. ¿Y ahora?'), ch: [['a', T('Return to diagnosis and gather new evidence', 'Volver al diagnóstico y reunir nueva evidencia')], ['b', T('Repeat the same repair', 'Repetir la misma reparación')], ['c', T('Report the job as complete anyway', 'Dar el trabajo por terminado de todos modos')]], a: 'a', h: T('What did the failed check tell you about the diagnosis?', '¿Qué te dijo la comprobación fallida sobre el diagnóstico?'), x: T('An unresolved symptom means the diagnosis was wrong or incomplete. The evidence has to be rebuilt.', 'Un síntoma sin resolver significa que el diagnóstico fue erróneo o incompleto. Hay que rehacer la evidencia.') },
];

// Correct answer key, computed from the simulated circuit where the question shows one.
export function answerOf(q) {
  if (typeof q.a === 'string') return q.a;
  const ex = EXERCISES[q.a.ex];
  const rt = createRuntime(ex.solution);
  q.a.acts.forEach((a) => rt.act(a[0], a[1]));
  return rt.loadOn(ex.out) ? 'on' : 'off';
}

// Next variant for a concept: rotates through its questions and avoids ones already used this session.
export function pickQuestion(st, concept, used, bank = QUESTIONS) {
  const pool = bank.filter((q) => q.c === concept);
  const r = rec(st, concept);
  for (let i = 0; i < pool.length; i++) {
    const q = pool[(r.v + i) % pool.length];
    if (!used.includes(q.id)) { r.v = (r.v + i + 1) % pool.length; return q; }
  }
  const q = pool[r.v % pool.length]; r.v = (r.v + 1) % pool.length;
  return q;
}
export function shuffled(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
