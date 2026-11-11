// Assessment: ten tasks, validated at submission against the actual state.
import { T } from './i18n.js';
import { helpers } from './lessons.js';

const { on, pairOn, meas, READY } = helpers;
const st = (sim) => sim.state;

export const TASKS = [
  {
    id: 'a1', lesson: 'l0', focus: 'jacks', diagram: 'none',
    title: T('Identify COM and the voltage jack', 'Identificar COM y el borne de voltaje'),
    prompt: T('Connect both test leads to the meter the way a voltage measurement needs. Then submit.', 'Conecta ambos cables de prueba al medidor como lo requiere una medición de voltaje. Luego envía.'),
    setup: (sim) => sim.reset(),
    fails: [
      { ok: (sim) => st(sim).plugs.black === 'COM', msg: T('The black lead is not in COM.', 'El cable negro no está en COM.') },
      { ok: (sim) => st(sim).plugs.red === 'V', msg: T('The red lead is not in V/Ω.', 'El cable rojo no está en V/Ω.') },
    ],
    explain: T('Black → COM (the reference). Red → V/Ω. The A and mA jacks are for current and are never used for voltage.', 'Negro → COM (la referencia). Rojo → V/Ω. Los bornes A y mA son para corriente y nunca se usan para voltaje.'),
  },
  {
    id: 'a2', lesson: 'l2', focus: 'dial', diagram: 'none',
    title: T('Select DC voltage', 'Seleccionar voltaje de CC'),
    prompt: T('Set the meter to measure the voltage of a battery. Then submit.', 'Ajusta el medidor para medir el voltaje de una pila. Luego envía.'),
    setup: (sim) => sim.reset({ plugs: { red: 'V', black: 'COM' } }),
    fails: [{ ok: (sim) => st(sim).dial === 'VDC', msg: T('The selector is not on V⎓.', 'El selector no está en V⎓.') }],
    explain: T('A battery is a DC source, so the selector goes to V⎓. The display confirms it with “DC”.', 'Una pila es una fuente de CC, así que el selector va en V⎓. La pantalla lo confirma con «DC».'),
  },
  {
    id: 'a3', lesson: 'l2', focus: 'aa', diagram: 'aa',
    title: T('Measure the AA battery', 'Medir la pila AA'),
    prompt: T('Starting from scratch, measure the AA battery with red on + and black on −, including the full pre-measurement check. Leave the probes connected, enter the reading, and submit.', 'Empezando desde cero, mide la pila AA con la roja en + y la negra en −, incluida toda la comprobación previa. Deja las puntas conectadas, ingresa la lectura y envía.'),
    setup: (sim) => sim.reset({ range: 200 }),
    entry: { type: 'reading' },
    fails: [
      { ok: (sim) => on(sim, 'aa+', 'aa-'), msg: T('The probes are not on AA + (red) and AA − (black).', 'Las puntas no están en AA + (roja) y AA − (negra).') },
      { ok: (sim) => st(sim).dial === 'VDC', msg: T('The meter is not on V⎓.', 'El medidor no está en V⎓.') },
      { ok: (sim) => !st(sim).hold, msg: T('HOLD is on, so the display is not live.', 'HOLD está activo, así que la pantalla no está en vivo.') },
      { ok: (sim) => !sim.display.ol, msg: T('The display shows overrange (OL): the range is too small.', 'La pantalla muestra sobrerrango (OL): el rango es demasiado pequeño.') },
      { ok: (sim) => meas(sim), msg: T('There is no steady two-point reading yet.', 'Aún no hay una lectura estable entre dos puntos.') },
    ],
    explain: T('Inspect → black in COM, red in V/Ω → V⎓ and range → identify AA + and AA − → black on −, red on + → read sign, number and unit: about +1.58 V DC.', 'Inspeccionar → negro en COM, rojo en V/Ω → V⎓ y rango → identificar AA + y AA − → negra en −, roja en + → leer signo, número y unidad: unos +1,58 V CC.'),
  },
  {
    id: 'a4', lesson: 'l3', focus: 'aa', diagram: 'aa',
    title: T('Explain a negative reading', 'Explicar una lectura negativa'),
    prompt: T('Choose the best explanation.', 'Elige la mejor explicación.'),
    setup: (sim) => sim.reset(),
    quiz: {
      q: T('On a battery, the meter shows −1.58 V DC. What does the minus sign mean?', 'En una pila, el medidor muestra −1,58 V CC. ¿Qué significa el signo menos?'),
      opts: [
        T('The battery is faulty', 'La pila está defectuosa'),
        T('The red probe is on the lower-potential point and the black probe on the higher one', 'La punta roja está en el punto de menor potencial y la negra en el de mayor'),
        T('The meter is in the wrong function and unsafe', 'El medidor está en la función equivocada y es inseguro'),
        T('The range is too small', 'El rango es demasiado pequeño'),
      ],
      correct: 1,
    },
    explain: T('Displayed DC voltage = potential at red − potential at black. Negative means red is on the lower point. It is a valid reading, not an unsafe connection.', 'Voltaje de CC mostrado = potencial en la roja − potencial en la negra. Negativo significa que la roja está en el punto más bajo. Es una lectura válida, no una conexión insegura.'),
  },
  {
    id: 'a5', lesson: 'l4', focus: 'display', diagram: 'b9',
    title: T('Select a range for the 9 V battery', 'Elegir un rango para la batería de 9 V'),
    prompt: T('You are about to measure a battery labeled 9 V using manual ranging. This meter’s ranges are 2 V, 20 V and 200 V. Select the most suitable manual range, then submit.', 'Vas a medir una batería rotulada 9 V usando rango manual. Los rangos de este medidor son 2 V, 20 V y 200 V. Selecciona el rango manual más adecuado y envía.'),
    setup: (sim) => sim.reset({ ...READY, dial: 'VDC', range: 'AUTO' }),
    fails: [{ ok: (sim) => st(sim).range === 20, msg: T('The selected range is not 20 V.', 'El rango elegido no es 20 V.') }],
    explain: T('20 V is the smallest range above 9 V: the value fits and you keep two decimals. 2 V would show overrange; 200 V would lose a decimal.', '20 V es el menor rango por encima de 9 V: el valor cabe y conservas dos decimales. 2 V mostraría sobrerrango; 200 V perdería un decimal.'),
  },
  {
    id: 'a6', lesson: 'l3', focus: 'lamp9', diagram: 'lamp9',
    title: T('Explain a same-node zero reading', 'Explicar un cero en el mismo nodo'),
    prompt: T('Choose the best explanation.', 'Elige la mejor explicación.'),
    setup: (sim) => sim.reset({ switches: { lamp9: true } }),
    quiz: {
      q: T('The lamp is lit. Red is on TP1 and black is on TP2, which are joined by a wire. The meter shows 0.000 V. Why?', 'La lámpara está encendida. La roja está en TP1 y la negra en TP2, unidos por un cable. El medidor muestra 0.000 V. ¿Por qué?'),
      opts: [
        T('The battery is flat', 'La batería está agotada'),
        T('The circuit is switched off', 'El circuito está apagado'),
        T('Both probes are on the same node, so there is no difference between them', 'Ambas puntas están en el mismo nodo, así que no hay diferencia entre ellas'),
        T('The meter is broken', 'El medidor está averiado'),
      ],
      correct: 2,
    },
    explain: T('Points joined by metal are one node, at one potential. The zero says nothing about whether the circuit is powered — here the lamp is on.', 'Los puntos unidos por metal son un solo nodo, a un solo potencial. El cero no dice nada sobre si el circuito está energizado; aquí la lámpara está encendida.'),
  },
  {
    id: 'a7', lesson: 'l5', focus: 'lamp9', diagram: 'lamp9',
    title: T('Measure voltage across the lamp', 'Medir el voltaje de la lámpara'),
    prompt: T('The meter is already prepared and the lamp is on. Choose your two test points, measure the voltage across the lamp, leave the probes connected, enter the reading and submit.', 'El medidor ya está preparado y la lámpara está encendida. Elige tus dos puntos de prueba, mide el voltaje entre los extremos de la lámpara, deja las puntas conectadas, ingresa la lectura y envía.'),
    setup: (sim) => sim.reset({ ...READY, dial: 'VDC', range: 'AUTO', switches: { lamp9: true } }),
    entry: { type: 'reading' },
    fails: [
      { ok: (sim) => pairOn(sim, 'tp4', 'tp5'), msg: T('The probes are not on the lamp’s own two terminals (TP4 and TP5).', 'Las puntas no están en los dos terminales propios de la lámpara (TP4 y TP5).') },
      { ok: (sim) => meas(sim), msg: T('There is no steady two-point reading yet.', 'Aún no hay una lectura estable entre dos puntos.') },
    ],
    explain: T('“Across the lamp” means one probe on each lamp terminal: TP4 and TP5. With the switch closed the idealized reading is 9.00 V (or −9.00 V with the probes reversed).', '«Entre los extremos de la lámpara» significa una punta en cada terminal de la lámpara: TP4 y TP5. Con el interruptor cerrado la lectura ideal es 9.00 V (o −9.00 V con las puntas invertidas).'),
  },
  {
    id: 'a8', lesson: 'l0', focus: 'jacks', diagram: 'b9',
    title: T('Recognize an unsafe current-jack setup', 'Reconocer una conexión insegura en el borne de corriente'),
    prompt: T('A colleague hands you this meter “ready to check the 9 V battery”. Look at the jacks. Answer the question, put the meter right, then submit.', 'Un compañero te entrega este medidor «listo para revisar la batería de 9 V». Mira los bornes. Responde la pregunta, corrige el medidor y envía.'),
    setup: (sim) => sim.reset({
      plugs: { red: 'A', black: 'COM' }, dial: 'VDC', range: 'AUTO',
      inspected: { meter: true, red: true, black: true },
      checklist: { jacks: false, func: true, range: true, guards: true, bridge: true },
    }),
    quiz: {
      q: T('What do you do?', '¿Qué haces?'),
      opts: [
        T('Measure — the meter’s fuse will protect it if anything is wrong', 'Medir: el fusible del medidor lo protegerá si algo está mal'),
        T('Switch the selector to A so it matches the red lead', 'Girar el selector a A para que coincida con el cable rojo'),
        T('Stop: the red lead is in the A jack. Move it to V/Ω before any voltage measurement', 'Detenerme: el cable rojo está en el borne A. Pasarlo a V/Ω antes de cualquier medición de voltaje'),
      ],
      correct: 2,
    },
    fails: [{ ok: (sim) => sim.jacksOK(), msg: T('The leads are still not black in COM and red in V/Ω.', 'Los cables siguen sin estar negro en COM y rojo en V/Ω.') }],
    explain: T('With red in A, touching the battery would short it through the meter: possible damage or injury. The fuse is a last resort, not permission. Red belongs in V/Ω.', 'Con el rojo en A, tocar la batería la pondría en cortocircuito a través del medidor: posible daño o lesión. El fusible es un último recurso, no un permiso. El rojo va en V/Ω.'),
  },
  {
    id: 'a9', lesson: 'l4', focus: 'display', diagram: 'none', expect: ['hold_stale'],
    title: T('Identify a stale HOLD reading', 'Identificar una lectura HOLD antigua'),
    prompt: T('Both probes are lying on the bench, touching nothing. Look at the display. Answer the question, put the meter right, then submit.', 'Ambas puntas están sobre la mesa, sin tocar nada. Mira la pantalla. Responde la pregunta, corrige el medidor y envía.'),
    setup: (sim) => { sim.reset({ ...READY, dial: 'VDC', range: 'AUTO' }); sim.presetHold({ digits: '9.36' }); },
    quiz: {
      q: T('The display shows 9.36 V. What is going on?', 'La pantalla muestra 9.36 V. ¿Qué está pasando?'),
      opts: [
        T('There is 9.36 V between the probe tips right now', 'Hay 9,36 V entre las puntas en este momento'),
        T('HOLD is on: this is an old, frozen value — not a live reading', 'HOLD está activo: es un valor antiguo y congelado, no una lectura en vivo'),
        T('The meter needs a new battery', 'El medidor necesita una batería nueva'),
      ],
      correct: 1,
    },
    fails: [{ ok: (sim) => !st(sim).hold, msg: T('HOLD is still on.', 'HOLD sigue activo.') }],
    explain: T('The HOLD flag means the number is frozen. Press HOLD again to return to live readings before trusting the display.', 'El aviso HOLD significa que el número está congelado. Pulsa HOLD otra vez para volver a lecturas en vivo antes de fiarte de la pantalla.'),
  },
  {
    id: 'a10', lesson: 'l6', focus: 'front', diagram: 'none',
    title: T('Zero does not establish safe isolation', 'Cero no establece un aislamiento seguro'),
    prompt: T('Choose the best explanation.', 'Elige la mejor explicación.'),
    setup: (sim) => sim.reset(),
    quiz: {
      q: T('A meter reads 0.00 V between two points. Why does that reading alone not prove the equipment is safe to touch?', 'Un medidor marca 0.00 V entre dos puntos. ¿Por qué esa lectura por sí sola no demuestra que el equipo sea seguro de tocar?'),
      opts: [
        T('It does prove it — zero volts means no danger', 'Sí lo demuestra: cero voltios significa que no hay peligro'),
        T('Zero can also come from the wrong AC/DC setting, HOLD, a bad lead or contact, or both probes on the same node — and other points may still be live', 'El cero también puede venir de un ajuste CA/CC equivocado, de HOLD, de un cable o contacto defectuoso, o de tener ambas puntas en el mismo nodo; además otros puntos pueden seguir energizados'),
        T('Because meters always read a little low', 'Porque los medidores siempre marcan un poco de menos'),
      ],
      correct: 1,
    },
    explain: T('A zero is only as trustworthy as the measurement behind it. Proving that real equipment is de-energized is a formal procedure for trained, authorized people — it is not taught by this simulation.', 'Un cero es tan fiable como la medición que lo respalda. Demostrar que un equipo real está sin energía es un procedimiento formal para personas formadas y autorizadas; esta simulación no lo enseña.'),
  },
];

// What each coaching code suggests repeating.
export const ERROR_LESSON = {
  unsafe_jack: 'l0', wrong_jack: 'l0', swapped_jacks: 'l0', lead_unplugged: 'l2',
  change_connected: 'l2', bridge: 'l4', tip_grip: 'l0', func_block: 'l0', func_not_voltage: 'l2',
  meter_off: 'l2', precheck: 'l2', unplanned_point: 'l5', mode_mismatch: 'l6', range_low: 'l4',
  no_contact: 'l3', floating: 'l3', reversed: 'l3', same_node: 'l3', hold_stale: 'l4', remove_order: 'l2',
};
