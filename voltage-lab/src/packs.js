// Equipment packs: vocabulary, legend, scenarios and interview material for one
// family of equipment. Only the general pack ships in the main bundle; the
// others are separate files under packs/ and are loaded when first selected.
//
// Pack schema (version 1) — the same shape is used for future verified content:
//   id, schema, name, summary
//   source: { kind: 'representative' | 'verified', by?, reference?, date? }
//   supports: { starter: boolean }        does the pack use the motor-starter exercise?
//   load: 'lamp' | 'coil'                 how the output of exercises A–C is drawn
//   actuator: 'motor' | 'cylinder' | null which 3D output model moves
//   labels: role -> { ref, t, name }      ref = drawing label, t = wording in sentences
//   glossary: [[term, definition]]
//   models: [text]                        which bench models stand for what
//   legend: [[symbol, meaning]]
//   scenarios: [{ title, text, go }]      go = { mode, ex | scn | i } into existing modules
//   interview: [{ q, a }]
//   behavior: [text]
//   checks: { ids: [verification check ids], extra: [text] }
//   review: [extra review questions]      optional, same format as src/review.js
import { T } from './i18n.js';

export const NOTICE = T('Representative training equipment — not manufacturer-specific.', 'Equipo de práctica representativo: no corresponde a ningún fabricante.');
const L = (ref, en, es, nameEn, nameEs) => ({ ref, t: T(en, es), name: T(nameEn, nameEs) });

export const GENERAL = {
  id: 'general', schema: 1, source: { kind: 'representative' }, supports: { starter: true }, load: 'lamp', actuator: 'motor',
  name: T('General industrial maintenance', 'Mantenimiento industrial general'),
  summary: T('Switches, pushbuttons, a lamp, a contactor, an overload relay and a motor: the control basics that most maintenance interviews start from.', 'Interruptores, pulsadores, una lámpara, un contactor, un relé de sobrecarga y un motor: lo básico de control con lo que empiezan casi todas las entrevistas de mantenimiento.'),
  labels: {
    SA: L('S1', 'S1', 'S1', 'Selector switch S1', 'Interruptor selector S1'),
    SB: L('S2', 'S2', 'S2', 'Selector switch S2', 'Interruptor selector S2'),
    H1: L('H1', 'lamp H1', 'la lámpara H1', 'Indicator lamp H1', 'Lámpara indicadora H1'),
    STOP: L('S1 STOP', 'STOP', 'STOP', 'STOP pushbutton (NC)', 'Pulsador STOP (NC)'),
    START: L('S2 START', 'START', 'START', 'START pushbutton (NO)', 'Pulsador START (NA)'),
    F1: L('F1', 'F1', 'F1', 'Overload relay F1', 'Relé de sobrecarga F1'),
    K1: L('K1', 'K1', 'K1', 'Contactor K1', 'Contactor K1'),
    KA: L('K1', 'the K1 contact', 'el contacto de K1', 'K1 auxiliary contact', 'Contacto auxiliar de K1'),
    M1: L('M1', 'motor M1', 'el motor M1', 'Motor M1', 'Motor M1'),
    Q1: L('Q1', 'control power', 'la alimentación de control', 'Control power switch Q1', 'Interruptor de alimentación de control Q1'),
  },
  glossary: [
    [T('Contactor', 'Contactor'), T('A heavy-duty relay. Its coil closes power contacts that feed a motor.', 'Un relé de servicio pesado. Su bobina cierra contactos de potencia que alimentan un motor.')],
    [T('Overload relay', 'Relé de sobrecarga'), T('Opens a contact in the control circuit when the motor draws too much current for too long.', 'Abre un contacto del circuito de control cuando el motor consume demasiada corriente durante demasiado tiempo.')],
    [T('Holding (seal-in) contact', 'Contacto de retención'), T('A normally open contact of a coil’s own device, in parallel with START, that keeps the coil energized.', 'Un contacto normalmente abierto del mismo dispositivo que la bobina, en paralelo con START, que la mantiene energizada.')],
    [T('NO / NC', 'NA / NC'), T('Normally open / normally closed: the contact’s state at rest, as drawn.', 'Normalmente abierto / normalmente cerrado: el estado del contacto en reposo, tal como se dibuja.')],
    [T('Control circuit', 'Circuito de control'), T('The low-energy circuit that decides when the machine runs. Here it is 24 V DC.', 'El circuito de baja energía que decide cuándo funciona la máquina. Aquí es de 24 V CC.')],
  ],
  models: [
    T('Control station: selector switches, START and STOP pushbuttons, indicator lamp.', 'Estación de control: interruptores selectores, pulsadores START y STOP, lámpara indicadora.'),
    T('Contactor K1 and overload relay F1 with TEST and RESET controls.', 'Contactor K1 y relé de sobrecarga F1 con controles TEST y RESET.'),
    T('Motor M1 with a visible rotor, and the control power switch Q1.', 'Motor M1 con rotor visible e interruptor de alimentación de control Q1.'),
  ],
  legend: [['no', T('Normally open contact', 'Contacto normalmente abierto')], ['nc', T('Normally closed contact', 'Contacto normalmente cerrado')], ['pb_no', T('Pushbutton, normally open', 'Pulsador normalmente abierto')], ['pb_nc', T('Pushbutton, normally closed', 'Pulsador normalmente cerrado')], ['ol', T('Overload contact (NC)', 'Contacto de sobrecarga (NC)')], ['coil', T('Coil', 'Bobina')], ['lamp', T('Lamp', 'Lámpara')]],
  scenarios: [
    { title: T('Switch a lamp', 'Encender una lámpara con un interruptor'), text: T('Build the simplest working loop and watch the station follow your drawing.', 'Construye el lazo más simple que funciona y observa cómo la estación sigue tu plano.'), go: { mode: 'build', ex: 'A' } },
    { title: T('Build a motor starter', 'Construir un arrancador de motor'), text: T('START, holding contact, STOP and overload — from a description of behavior.', 'START, contacto de retención, STOP y sobrecarga, a partir de una descripción del comportamiento.'), go: { mode: 'build', ex: 'D' } },
    { title: T('Motor runs only while START is held', 'El motor funciona solo mientras se mantiene START'), text: T('Collect evidence, make a simulated repair and prove the result.', 'Reúne evidencia, haz una reparación simulada y demuestra el resultado.'), go: { mode: 'verify', scn: 0 } },
  ],
  interview: [
    { q: T('What is the difference between a normally open and a normally closed contact?', '¿Cuál es la diferencia entre un contacto normalmente abierto y uno normalmente cerrado?'), a: T('State at rest, as drawn: NO has no path until operated, NC has a path until operated. “Normally” does not mean “usually while running”.', 'El estado en reposo, tal como se dibuja: NA no tiene camino hasta que se acciona, NC tiene camino hasta que se acciona. «Normalmente» no significa «habitualmente en marcha».') },
    { q: T('Why does a motor keep running after you release START?', '¿Por qué un motor sigue en marcha después de soltar START?'), a: T('A normally open contact of the contactor, wired in parallel with START, closes when the coil pulls in and keeps the coil energized.', 'Un contacto normalmente abierto del contactor, cableado en paralelo con START, cierra cuando actúa la bobina y la mantiene energizada.') },
    { q: T('Why is STOP wired with a normally closed contact?', '¿Por qué STOP se cablea con un contacto normalmente cerrado?'), a: T('So that pressing it, or a broken wire in the STOP circuit, removes power from the coil. The circuit stops when the path is lost.', 'Para que al pulsarlo, o ante un cable roto en el circuito de STOP, se quite la energía de la bobina. El circuito se detiene cuando se pierde el camino.') },
    { q: T('How would you approach a motor that will not start?', '¿Cómo abordarías un motor que no arranca?'), a: T('Confirm the symptom, check the supply, then follow the voltage along the control rung against the drawing. Name a cause only when the readings leave one explanation.', 'Confirmar el síntoma, revisar la alimentación y seguir el voltaje por el circuito de control comparando con el plano. Nombrar una causa solo cuando las lecturas dejen una explicación.') },
    { q: T('You replaced a part. How do you know the repair is complete?', 'Reemplazaste una pieza. ¿Cómo sabes que la reparación está completa?'), a: T('By demonstrating the operating sequence: start, hold, stop, no restart after stop, trip, reset or power return, and recording what was observed.', 'Demostrando la secuencia de funcionamiento: arranque, retención, parada, sin rearranque tras parada, disparo, rearme o regreso de energía, y registrando lo observado.') },
  ],
  behavior: [
    T('START energizes K1; K1 runs M1 and holds itself in.', 'START energiza K1; K1 pone en marcha M1 y se autorretiene.'),
    T('STOP or an overload trip drops K1 and stops M1.', 'STOP o un disparo de sobrecarga desenergiza K1 y detiene M1.'),
    T('After a stop, a reset or a return of control power, M1 stays stopped until START is pressed again.', 'Tras una parada, un rearme o el regreso de la alimentación de control, M1 sigue parado hasta pulsar START otra vez.'),
  ],
  checks: { ids: ['start', 'seal', 'stop', 'stoprel', 'trip', 'reset', 'loss', 'restore', 'again'], extra: [] },
};

export const PACK_LIST = [
  { id: 'general', name: GENERAL.name },
  { id: 'conveyor', name: T('Conveyor and material handling', 'Transportadores y manejo de materiales') },
  { id: 'starters', name: T('Motor starters and control panels', 'Arrancadores de motor y tableros de control') },
  { id: 'sensors', name: T('Sensors and PLC input/output', 'Sensores y entradas/salidas de PLC') },
  { id: 'pneumatic', name: T('Pneumatic actuators', 'Actuadores neumáticos') },
];

// When the equipment in an interview is not covered: the closest pack and what the match leaves out.
export const CLOSEST = [
  { id: 'vfd', name: T('Variable frequency drives', 'Variadores de frecuencia'), pack: 'starters', limit: T('The start/stop control logic carries over. Drive parameters, fault codes and power electronics are not covered at all.', 'La lógica de marcha/paro es aplicable. No se cubren parámetros del variador, códigos de falla ni electrónica de potencia.') },
  { id: 'robot', name: T('Robots and robot cells', 'Robots y celdas robotizadas') , pack: 'sensors', limit: T('Input and output signals and interlock logic carry over. Robot programming, safety controllers and teach pendants are not covered.', 'Las señales de entrada y salida y la lógica de enclavamiento son aplicables. No se cubren la programación de robots, los controladores de seguridad ni las consolas de programación.') },
  { id: 'hydraulic', name: T('Hydraulic systems', 'Sistemas hidráulicos'), pack: 'pneumatic', limit: T('Solenoid valve control is similar. Pressures, fluid, pumps and hydraulic safety are different and are not covered.', 'El control de electroválvulas es parecido. Las presiones, el fluido, las bombas y la seguridad hidráulica son distintos y no se cubren.') },
  { id: 'packaging', name: T('Packaging machines', 'Máquinas de envasado'), pack: 'conveyor', limit: T('Conveying, sensors and start/stop logic carry over. Motion control, timing and product-specific stations are not covered.', 'El transporte, los sensores y la lógica de marcha/paro son aplicables. No se cubren el control de movimiento, la sincronización ni las estaciones específicas del producto.') },
  { id: 'hvac', name: T('HVAC and building systems', 'Climatización y sistemas de edificios'), pack: 'starters', limit: T('Contactors, overloads and control circuits carry over. Refrigeration, controls programming and mains distribution are not covered.', 'Contactores, sobrecargas y circuitos de control son aplicables. No se cubren refrigeración, programación de controles ni distribución de red.') },
  { id: 'other', name: T('Something else', 'Otra cosa'), pack: 'general', limit: T('The general pack covers symbols, logic, holding circuits and troubleshooting method only. Nothing in it is specific to your equipment.', 'El paquete general cubre solo símbolos, lógica, circuitos de retención y método de diagnóstico. Nada en él es específico de tu equipo.') },
];

const registry = { general: GENERAL };
const waiting = {};
if (typeof window !== 'undefined') {
  window.VoltageLabPacks = { register(p) { registry[p.id] = p; if (waiting[p.id]) { waiting[p.id](p); delete waiting[p.id]; } } };
}
export const loaded = (id) => registry[id] || null;
// Fetch a pack's file the first time it is selected.
export function loadPack(id) {
  if (registry[id]) return Promise.resolve(registry[id]);
  return new Promise((resolve, reject) => {
    waiting[id] = resolve;
    const s = document.createElement('script');
    s.src = `packs/${id}.js`;
    s.onerror = () => { delete waiting[id]; reject(new Error(`pack ${id}`)); };
    document.head.appendChild(s);
  });
}
// Labels for one exercise: packs without a motor starter fall back to the general wording there.
export function labelsFor(pack, starter) {
  return starter && !(pack.supports && pack.supports.starter) ? GENERAL.labels : { ...GENERAL.labels, ...pack.labels };
}
