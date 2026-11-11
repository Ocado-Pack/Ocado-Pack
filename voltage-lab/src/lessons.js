// Lesson content. Every hands-on step has a `check` that inspects the actual
// simulator state; nothing advances because a button was clicked.
import { T } from './i18n.js';

// ---- predicates -----------------------------------------------------------
const st = (sim) => sim.state;
const on = (sim, red, black) => st(sim).probes.red === red && st(sim).probes.black === black;
const pairOn = (sim, a, b) => on(sim, a, b) || on(sim, b, a);
const parked = (sim) => !st(sim).probes.red && !st(sim).probes.black;
const meas = (sim) => sim.reading().valid && sim.settled && !st(sim).hold;
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const intendedIs = (sim, pts) => sameSet(st(sim).intended, pts);
const clicked = (ctx, ...keys) => keys.every((k) => ctx.clicked.has(k));
const did = (ctx, type, f = () => true) => ctx.events.some((e) => e.type === type && f(e));

const READY = {
  plugs: { red: 'V', black: 'COM' },
  inspected: { meter: true, red: true, black: true },
  checklist: { jacks: true, func: true, range: true, guards: true, bridge: true },
};

const SEQ_POINTS = {
  basics: T('A voltmeter always compares two points: red minus black.', 'Un voltímetro siempre compara dos puntos: roja menos negra.'),
  manual: T('Real meters differ from this training meter — read your own meter’s manual.', 'Los medidores reales difieren de este medidor de práctica: lee el manual del tuyo.'),
  qualify: T('Finishing a simulation does not qualify anyone to work on energized equipment.', 'Terminar una simulación no habilita a nadie para trabajar en equipos energizados.'),
  zero: T('A zero reading alone never proves that something is safe to touch.', 'Una lectura de cero por sí sola nunca demuestra que algo sea seguro de tocar.'),
};

const summary = (id, points) => ({
  id, kind: 'summary', focus: 'front',
  title: T('Remember the sequence', 'Recuerda la secuencia'),
  points,
  setup: (sim) => sim.setup({ probes: { red: null, black: null }, near: { red: null, black: null } }),
});

// ---- reusable steps -------------------------------------------------------
function setupStep(id, o) {
  const dialName = o.dial === 'VAC' ? 'V~' : 'V⎓';
  const kindEn = o.dial === 'VAC' ? 'an AC' : 'a DC';
  const kindEs = o.dial === 'VAC' ? 'CA' : 'CC';
  const ranges = o.ranges || ['AUTO'];
  const rName = ranges.map((r) => (r === 'AUTO' ? 'AUTO' : `${r} V`)).join(' / ');
  const pts = o.points.map((p) => o.labels[p]).join(' + ');
  return {
    id, kind: 'do', focus: 'meter', diagram: o.diagram,
    title: T('Set up and complete the pre-measurement check', 'Preparar y completar la comprobación previa'),
    goal: T(`Get the meter ready for ${kindEn} voltage measurement and complete the pre-measurement check.`, `Dejar el medidor listo para medir voltaje de ${kindEs} y completar la comprobación previa.`),
    why: T('Most measuring mistakes happen before a probe touches anything. The simulator will not let a probe touch a circuit until every item is done.', 'La mayoría de los errores de medición ocurren antes de que una punta toque algo. El simulador no deja que una punta toque un circuito hasta completar cada punto.'),
    action: T(
      `Work down the “Pre-measurement check” list: inspect the meter and both leads (replace a damaged lead if you find one); plug black into COM and red into V/Ω and confirm; turn the selector to ${dialName} and confirm; set RANGE to ${rName} and confirm; click test points ${pts} to identify them; confirm the two handling rules.`,
      `Recorre la lista «Comprobación previa a la medición»: inspecciona el medidor y ambos cables (reemplaza un cable dañado si lo encuentras); conecta el negro en COM y el rojo en V/Ω y confirma; gira el selector a ${dialName} y confirma; pon RANGE en ${rName} y confirma; haz clic en los puntos ${pts} para identificarlos; confirma las dos reglas de manejo.`),
    observe: T('Each list item changes to “Done”. The display switches on and shows the mode and range.', 'Cada punto de la lista cambia a «Hecho». La pantalla se enciende y muestra el modo y el rango.'),
    meaning: T('The meter is correctly prepared and you have decided where the probes will go — before anything is touched.', 'El medidor está bien preparado y ya decidiste dónde irán las puntas, antes de tocar nada.'),
    hi: (sim) => {
      const s = st(sim);
      if (!sim.checkItem('inspect')) return ['meter', 'lead:red', 'lead:black'];
      if (s.plugs.black !== 'COM') return ['plug:black', 'jack:COM'];
      if (s.plugs.red !== 'V') return ['plug:red', 'jack:V'];
      if (s.dial !== o.dial) return [`dialpos:${o.dial}`];
      if (!ranges.includes(s.range)) return ['btn:range'];
      if (!intendedIs(sim, o.points)) return o.points.map((p) => `term:${p}`);
      return [];
    },
    setup: o.setup,
    subs: [
      { label: T('Meter and both leads inspected, no damage', 'Medidor y ambos cables inspeccionados, sin daños'), ok: (sim) => sim.checkItem('inspect') },
      { label: T('Black in COM, red in V/Ω — confirmed', 'Negro en COM, rojo en V/Ω: confirmado'), ok: (sim) => sim.jacksOK() && st(sim).checklist.jacks },
      { label: T(`Selector on ${dialName} — confirmed`, `Selector en ${dialName}: confirmado`), ok: (sim) => st(sim).dial === o.dial && st(sim).checklist.func },
      { label: T(`Range ${rName} — confirmed`, `Rango ${rName}: confirmado`), ok: (sim) => ranges.includes(st(sim).range) && st(sim).checklist.range },
      { label: T(`Test points identified: ${pts}`, `Puntos identificados: ${pts}`), ok: (sim) => intendedIs(sim, o.points) },
      { label: T('Handling rules confirmed (guards, no bridging)', 'Reglas de manejo confirmadas (guardas, sin puentear)'), ok: (sim) => st(sim).checklist.guards && st(sim).checklist.bridge },
    ],
    demo: [
      ['inspect', 'meter'], ['inspect', 'red'], ['replace', 'red'], ['inspect', 'black'],
      ['plug', 'black', 'COM'], ['plug', 'red', 'V'], ['confirm', 'jacks'],
      ['dial', o.dial], ['confirm', 'func'], ['range', ranges[0]], ['confirm', 'range'],
      ['identify', o.points], ['confirm', 'guards'], ['confirm', 'bridge'],
    ],
  };
}

function removeStep(id, focus) {
  return {
    id, kind: 'do', focus,
    title: T('Remove red, then black', 'Retirar la roja y luego la negra'),
    goal: T('Disconnect the probes from the circuit in the right order.', 'Desconectar las puntas del circuito en el orden correcto.'),
    why: T('The reference (black) probe goes on first and comes off last, so the red lead is never left connected on its own.', 'La punta de referencia (negra) se conecta primero y se retira al final, para que el cable rojo nunca quede conectado solo.'),
    action: T('Click the red probe’s handle to lift it and click it again to put it down. Then do the same with the black probe. (Or drag each probe away.)', 'Haz clic en el mango de la punta roja para levantarla y otra vez para dejarla. Luego haz lo mismo con la negra. (O arrastra cada punta fuera.)'),
    observe: T('Both probes rest on the bench. The display no longer shows a steady measurement.', 'Ambas puntas descansan en la mesa. La pantalla ya no muestra una medición estable.'),
    meaning: T('The meter is disconnected from the circuit. Only now may the selector or jacks be changed.', 'El medidor está desconectado del circuito. Solo ahora se pueden cambiar el selector o los bornes.'),
    hi: ['probe:red', 'probe:black'],
    check: (sim, ctx) => parked(sim) && !ctx.badOrder,
    onEvent: (ev, ctx, sim) => {
      if (ev.type === 'lift' && ev.lead === 'black' && st(sim).probes.red) { ctx.badOrder = true; return 'remove_order'; }
      return null;
    },
    demo: [['lift', 'red'], ['lift', 'black']],
  };
}

function offStep(id) {
  return {
    id, kind: 'do', focus: 'dial',
    title: T('Turn the meter off', 'Apagar el medidor'),
    goal: T('Leave the meter switched off.', 'Dejar el medidor apagado.'),
    why: T('It saves the battery and means the next person starts from a known state.', 'Ahorra batería y hace que la siguiente persona empiece desde un estado conocido.'),
    action: T('Turn the rotary selector to OFF.', 'Gira el selector giratorio a OFF.'),
    observe: T('The display goes blank.', 'La pantalla queda en blanco.'),
    meaning: T('The measurement is finished and the equipment is left safe and tidy.', 'La medición terminó y el equipo queda seguro y ordenado.'),
    hi: ['dialpos:OFF'],
    check: (sim) => st(sim).dial === 'OFF' && parked(sim),
    demo: [['dial', 'OFF']],
  };
}

function measStep(id, o) {
  const [a, b] = o.pair;
  const la = o.labels[a]; const lb = o.labels[b];
  return {
    id, kind: 'do', focus: o.focus, pair: o.pair, record: o.record,
    title: o.title,
    goal: o.goal,
    why: o.why,
    action: T(
      `${o.pre ? o.pre.en + ' ' : ''}Answer the prediction. With no probe in hand, click ${la} and ${lb} to identify them. Then touch black to ${lb} and red to ${la}.`,
      `${o.pre ? o.pre.es + ' ' : ''}Responde la predicción. Sin punta en la mano, haz clic en ${la} y ${lb} para identificarlos. Luego toca con la negra ${lb} y con la roja ${la}.`),
    observe: T(`About ${o.expect} once the reading settles. (A minus sign would only mean your probes are the other way round.)`, `Aproximadamente ${o.expect} cuando la lectura se estabilice. (Un signo menos solo indicaría que tus puntas están al revés.)`),
    meaning: o.meaning,
    hi: [`term:${a}`, `term:${b}`],
    predict: o.predict,
    expect: ['reversed', 'same_node'],
    setup: o.setup,
    check: (sim) => pairOn(sim, a, b) && meas(sim) && (!o.cond || o.cond(sim)),
    wantText: T(`${la} and ${lb}`, `${la} y ${lb}`),
    demo: [...(o.demoPre || []), ['predict'], ['identify', [a, b]], ['touch', 'black', b], ['touch', 'red', a], ['wait', 1700]],
  };
}

const predV = (correct, opts) => ({
  q: T('What will the display show?', '¿Qué mostrará la pantalla?'),
  opts, correct,
});
const o9 = [T('About 9 V', 'Unos 9 V'), T('About 0 V', 'Unos 0 V'), T('About 4.5 V', 'Unos 4,5 V')];
const o24 = [T('About 24 V', 'Unos 24 V'), T('About 0 V', 'Unos 0 V'), T('About 12 V', 'Unos 12 V')];

// ===========================================================================
// Lesson 0 — Meet the meter
// ===========================================================================
const L0 = {
  id: 'l0', minutes: 10, diagram: 'none',
  title: T('Meet the meter', 'Conoce el medidor'),
  blurb: T('Names of every part, the symbols, and the safety boundaries.', 'Nombres de cada parte, los símbolos y los límites de seguridad.'),
  init: (sim) => sim.reset(),
  steps: [
    {
      id: 'welcome', kind: 'ack', focus: 'front',
      title: T('Welcome and safety boundaries', 'Bienvenida y límites de seguridad'),
      goal: T('Know what this lab is — and what it is not.', 'Saber qué es este laboratorio y qué no es.'),
      why: T('You are starting from zero, so every new word is explained before it is used. Everything on this bench is simulated: batteries and isolated, low-energy training circuits only.', 'Empiezas desde cero, así que cada palabra nueva se explica antes de usarla. Todo en esta mesa es simulado: solo pilas y circuitos de práctica aislados y de baja energía.'),
      action: T('Read this, then press Continue.', 'Lee esto y pulsa Continuar.'),
      observe: T('A workbench with a multimeter, two test leads, two batteries and three training circuits.', 'Una mesa con un multímetro, dos cables de prueba, dos pilas y tres circuitos de práctica.'),
      meaning: T('Nothing here teaches probing wall outlets, breaker panels, mains wiring or industrial equipment, and completing the simulation does not qualify you to work on energized electrical equipment.', 'Nada aquí enseña a medir en tomacorrientes, tableros, cableado de red ni equipos industriales, y completar la simulación no te habilita para trabajar en equipos eléctricos energizados.'),
    },
    {
      id: 'what', kind: 'do', focus: 'meter', hi: ['meter'],
      title: T('The multimeter', 'El multímetro'),
      goal: T('Find the instrument you will use.', 'Encontrar el instrumento que vas a usar.'),
      why: T('A multimeter is one instrument with several measuring functions. A voltmeter is a meter that measures voltage — and that is the only function these lessons use.', 'Un multímetro es un instrumento con varias funciones de medición. Un voltímetro es un medidor que mide voltaje, y esa es la única función que usan estas lecciones.'),
      action: T('Click the body of the multimeter (the large yellow instrument on the left).', 'Haz clic en el cuerpo del multímetro (el instrumento amarillo grande a la izquierda).'),
      observe: T('An information card describes it.', 'Una tarjeta de información lo describe.'),
      meaning: T('This is a generic teaching meter. Real meters have different layouts, so you must consult your own meter’s manual.', 'Es un medidor didáctico genérico. Los medidores reales tienen otras disposiciones, así que debes consultar el manual del tuyo.'),
      check: (sim, ctx) => clicked(ctx, 'meter'),
      demo: [['click', 'meter']],
    },
    {
      id: 'display', kind: 'do', focus: 'display', hi: ['display'],
      title: T('The display', 'La pantalla'),
      goal: T('Learn what the display can tell you.', 'Saber qué te puede decir la pantalla.'),
      why: T('A reading is more than a number: it also has a sign, a unit and a mode. Missing one of them is a classic beginner mistake.', 'Una lectura es más que un número: también tiene signo, unidad y modo. Pasar por alto uno de ellos es un error típico de principiante.'),
      action: T('Click the display at the top of the meter.', 'Haz clic en la pantalla, en la parte superior del medidor.'),
      observe: T('The card lists: number, minus sign (polarity), unit, mode (DC or AC), range and the HOLD flag.', 'La tarjeta enumera: número, signo menos (polaridad), unidad, modo (DC o AC), rango y el aviso HOLD.'),
      meaning: T('You will read all of these every time, not just the big digits.', 'Leerás todo esto cada vez, no solo los dígitos grandes.'),
      check: (sim, ctx) => clicked(ctx, 'display'),
      demo: [['click', 'display']],
    },
    {
      id: 'dial', kind: 'do', focus: 'dial', hi: ['dial'],
      title: T('The rotary selector', 'El selector giratorio'),
      goal: T('Find the control that chooses what the meter measures.', 'Encontrar el control que elige qué mide el medidor.'),
      why: T('The same meter measures different things. The rotary selector (the big knob) picks one function at a time.', 'El mismo medidor mide cosas distintas. El selector giratorio (la perilla grande) elige una función a la vez.'),
      action: T('Click the knob in the middle of the meter.', 'Haz clic en la perilla en el centro del medidor.'),
      observe: T('The card lists the positions: OFF, V⎓, V~, Ω and A.', 'La tarjeta enumera las posiciones: OFF, V⎓, V~, Ω y A.'),
      meaning: T('V means volts. V⎓ is DC voltage (steady polarity, like a battery). V~ is AC voltage (polarity keeps reversing). Ω is resistance in ohms. A is current in amperes.', 'V significa voltios. V⎓ es voltaje de CC (polaridad fija, como una pila). V~ es voltaje de CA (la polaridad se invierte continuamente). Ω es resistencia en ohmios. A es corriente en amperios.'),
      check: (sim, ctx) => clicked(ctx, 'dial'),
      demo: [['click', 'dial']],
    },
    {
      id: 'turn', kind: 'do', focus: 'dial', hi: ['dialpos:VDC', 'dialpos:VAC', 'dialpos:OFF'],
      title: T('Turn the selector', 'Girar el selector'),
      goal: T('Practice selecting the two voltage functions.', 'Practicar la selección de las dos funciones de voltaje.'),
      why: T('Choosing the wrong function is one of the most common mistakes, so the positions should feel familiar.', 'Elegir la función equivocada es uno de los errores más comunes, así que las posiciones deben resultarte familiares.'),
      action: T('Turn the selector to V⎓, then to V~, then back to OFF. Click a label next to the knob, or drag the knob.', 'Gira el selector a V⎓, luego a V~ y de vuelta a OFF. Haz clic en una etiqueta junto a la perilla o arrástrala.'),
      observe: T('The display shows “DC” in V⎓ and “AC” in V~, and goes blank at OFF.', 'La pantalla muestra «DC» en V⎓ y «AC» en V~, y queda en blanco en OFF.'),
      meaning: T('The display always tells you which mode is active. Check it instead of trusting the knob position alone.', 'La pantalla siempre te dice qué modo está activo. Compruébalo en lugar de fiarte solo de la posición de la perilla.'),
      subs: [
        { label: T('Selected V⎓', 'Seleccionaste V⎓'), ok: (sim, ctx) => did(ctx, 'dial', (e) => e.pos === 'VDC') },
        { label: T('Selected V~', 'Seleccionaste V~'), ok: (sim, ctx) => did(ctx, 'dial', (e) => e.pos === 'VAC') },
        { label: T('Back at OFF', 'De vuelta en OFF'), ok: (sim, ctx) => st(sim).dial === 'OFF' && did(ctx, 'dial', (e) => e.pos === 'OFF') },
      ],
      demo: [['dial', 'VDC'], ['dial', 'VAC'], ['dial', 'OFF']],
    },
    {
      id: 'com', kind: 'do', focus: 'jacks', hi: ['jack:COM'],
      title: T('The COM jack', 'El borne COM'),
      goal: T('Find where the black lead connects.', 'Encontrar dónde se conecta el cable negro.'),
      why: T('A jack is a socket on the meter for a test lead. COM is the meter’s common reference connection: the point every reading is compared against.', 'Un borne es un conector del medidor para un cable de prueba. COM es la conexión de referencia común del medidor: el punto con el que se compara cada lectura.'),
      action: T('Click the jack labeled COM.', 'Haz clic en el borne rotulado COM.'),
      observe: T('The card explains COM.', 'La tarjeta explica COM.'),
      meaning: T('The black lead always goes in COM. COM does not automatically mean earth ground.', 'El cable negro siempre va en COM. COM no significa automáticamente tierra física.'),
      check: (sim, ctx) => clicked(ctx, 'jack:COM'),
      demo: [['click', 'jack:COM']],
    },
    {
      id: 'vjack', kind: 'do', focus: 'jacks', hi: ['jack:V'],
      title: T('The V/Ω jack', 'El borne V/Ω'),
      goal: T('Find where the red lead connects for voltage.', 'Encontrar dónde se conecta el cable rojo para voltaje.'),
      why: T('Only one jack is correct for the red lead when measuring voltage.', 'Solo un borne es correcto para el cable rojo al medir voltaje.'),
      action: T('Click the jack labeled V/Ω.', 'Haz clic en el borne rotulado V/Ω.'),
      observe: T('The card explains the V/Ω jack.', 'La tarjeta explica el borne V/Ω.'),
      meaning: T('Red in V/Ω and black in COM is the lead setup for every measurement in this lab.', 'Rojo en V/Ω y negro en COM es la conexión de cables para todas las mediciones de este laboratorio.'),
      check: (sim, ctx) => clicked(ctx, 'jack:V'),
      demo: [['click', 'jack:V']],
    },
    {
      id: 'ajacks', kind: 'do', focus: 'jacks', hi: ['jack:A', 'jack:mA'],
      title: T('The A and mA jacks', 'Los bornes A y mA'),
      goal: T('Recognize the two jacks you must not use for voltage.', 'Reconocer los dos bornes que no debes usar para voltaje.'),
      why: T('The A and mA jacks measure current. Inside the meter they are almost a plain wire to COM. A red lead left in one of them turns the meter into a short circuit across whatever you touch.', 'Los bornes A y mA miden corriente. Dentro del medidor son casi un cable directo a COM. Un cable rojo dejado en uno de ellos convierte al medidor en un cortocircuito sobre lo que toques.'),
      action: T('Click the A jack, then the mA jack.', 'Haz clic en el borne A y luego en el borne mA.'),
      observe: T('The cards explain what each is for and that they are blocked here.', 'Las tarjetas explican para qué sirve cada uno y que aquí están bloqueados.'),
      meaning: T('This simulator blocks every voltage measurement while a lead is in A or mA. The meter’s fuse is a last resort, never permission to make that mistake.', 'Este simulador bloquea toda medición de voltaje mientras un cable esté en A o mA. El fusible del medidor es un último recurso, nunca un permiso para cometer ese error.'),
      check: (sim, ctx) => clicked(ctx, 'jack:A', 'jack:mA'),
      demo: [['click', 'jack:A'], ['click', 'jack:mA']],
    },
    {
      id: 'probe', kind: 'do', focus: 'probes', hi: ['probe:red', 'probe:black'], expect: ['tip_grip'],
      title: T('The parts of a probe', 'Las partes de una punta'),
      goal: T('Name the three parts of a test probe.', 'Nombrar las tres partes de una punta de prueba.'),
      why: T('A test lead is a flexible insulated wire with a plug at one end and a probe at the other. Where you hold the probe decides whether your fingers are near bare metal.', 'Un cable de prueba es un cable flexible aislado con una clavija en un extremo y una punta en el otro. Dónde sujetas la punta decide si tus dedos quedan cerca del metal desnudo.'),
      action: T('On either probe, click the long handle, the raised ring (finger guard), and the thin metal tip.', 'En cualquiera de las puntas, haz clic en el mango largo, en el anillo elevado (guarda) y en la punta metálica delgada.'),
      observe: T('Three cards. Clicking the tip also brings up a coaching note — that is expected here.', 'Tres tarjetas. Al hacer clic en la punta metálica también aparece una nota de corrección; aquí es lo esperado.'),
      meaning: T('Hold the insulated handle, keep fingers behind the guard, and let only the metal tip touch the test point.', 'Sujeta el mango aislado, mantén los dedos detrás de la guarda y deja que solo la punta metálica toque el punto de prueba.'),
      subs: [
        { label: T('Insulated handle', 'Mango aislado'), ok: (sim, ctx) => clicked(ctx, 'probe:handle') },
        { label: T('Finger guard', 'Guarda para los dedos'), ok: (sim, ctx) => clicked(ctx, 'probe:guard') },
        { label: T('Exposed metal tip', 'Punta metálica expuesta'), ok: (sim, ctx) => clicked(ctx, 'probe:tip') },
      ],
      demo: [['click', 'probe:handle'], ['click', 'probe:guard'], ['click', 'probe:tip']],
    },
    {
      id: 'qcom', kind: 'quiz', focus: 'jacks',
      title: T('Check: what COM means', 'Comprobación: qué significa COM'),
      goal: T('Make sure the meaning of COM has stuck.', 'Asegurar que el significado de COM quedó claro.'),
      why: T('Confusing COM with earth ground leads to wrong conclusions later.', 'Confundir COM con tierra física lleva después a conclusiones equivocadas.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('What is the COM jack?', '¿Qué es el borne COM?'),
        opts: [
          T('The meter’s common reference connection, where the black lead goes', 'La conexión de referencia común del medidor, donde va el cable negro'),
          T('A connection that is always earth ground', 'Una conexión que siempre es tierra física'),
          T('The jack for measuring current', 'El borne para medir corriente'),
        ],
        correct: 0,
        explain: T('COM is simply the reference side of the meter. Whatever point the black probe touches becomes the “compared-against” point. It is not automatically earth ground.', 'COM es simplemente el lado de referencia del medidor. El punto que toque la punta negra pasa a ser el punto «contra el que se compara». No es automáticamente tierra física.'),
      },
    },
    {
      id: 'qmv', kind: 'quiz', focus: 'display',
      title: T('Check: volts and millivolts', 'Comprobación: voltios y milivoltios'),
      goal: T('Connect the two voltage units.', 'Relacionar las dos unidades de voltaje.'),
      why: T('“Milli” means one-thousandth. Meters switch between V and mV, and misreading the unit gives an answer 1,000 times wrong.', '«Mili» significa una milésima. Los medidores cambian entre V y mV, y leer mal la unidad da un resultado 1000 veces erróneo.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('How many millivolts (mV) make 1 volt (V)?', '¿Cuántos milivoltios (mV) hacen 1 voltio (V)?'),
        opts: [T('10 mV', '10 mV'), T('100 mV', '100 mV'), T('1,000 mV', '1000 mV')],
        correct: 2,
        explain: T('1,000 mV = 1 V. So 500 mV is half a volt.', '1000 mV = 1 V. Así, 500 mV es medio voltio.'),
      },
    },
    summary('sum', [SEQ_POINTS.manual, SEQ_POINTS.qualify,
      T('Black lead → COM. Red lead → V/Ω. Never A or mA for voltage.', 'Cable negro → COM. Cable rojo → V/Ω. Nunca A ni mA para voltaje.')]),
  ],
};

// ===========================================================================
// Lesson 1 — Understand voltage
// ===========================================================================
const L1 = {
  id: 'l1', minutes: 10, diagram: 'aa',
  title: T('Understand voltage', 'Entender el voltaje'),
  blurb: T('What a voltmeter actually compares, and what “in parallel” means.', 'Qué compara realmente un voltímetro y qué significa «en paralelo».'),
  init: (sim) => sim.reset(),
  steps: [
    {
      id: 'def', kind: 'ack', focus: 'aa', diagram: 'analogy',
      title: T('Voltage is a difference between two points', 'El voltaje es una diferencia entre dos puntos'),
      goal: T('Understand what the word “voltage” means.', 'Entender qué significa la palabra «voltaje».'),
      why: T('Voltage is the electrical potential difference between two points — how strongly electric charge is urged from one point toward the other. It is never a property of a single point.', 'El voltaje es la diferencia de potencial eléctrico entre dos puntos: con cuánta fuerza se empuja la carga eléctrica de un punto hacia el otro. Nunca es una propiedad de un solo punto.'),
      action: T('Look at the picture of the two water tanks, then press Continue.', 'Mira el dibujo de los dos tanques de agua y pulsa Continuar.'),
      observe: T('Two tanks at different heights joined by a pipe. The height difference is what pushes the water.', 'Dos tanques a distinta altura unidos por un tubo. La diferencia de altura es lo que empuja el agua.'),
      meaning: T('Analogy only: voltage is like the pressure difference between the tanks. It is a helpful picture, not exactly how electricity works.', 'Solo una analogía: el voltaje es como la diferencia de presión entre los tanques. Es una imagen útil, no exactamente cómo funciona la electricidad.'),
    },
    {
      id: 'vir', kind: 'quiz', focus: 'aa', diagram: 'analogy',
      title: T('Voltage, current, resistance', 'Voltaje, corriente, resistencia'),
      goal: T('Tell three different quantities apart.', 'Distinguir tres magnitudes diferentes.'),
      why: T('Voltage is potential difference (in the analogy: pressure difference). Current is the flow of electric charge (the water actually moving). Resistance is opposition to current (a narrow pipe).', 'El voltaje es diferencia de potencial (en la analogía: diferencia de presión). La corriente es el flujo de carga eléctrica (el agua moviéndose). La resistencia es la oposición a la corriente (un tubo estrecho).'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('A fresh battery sits on the table, connected to nothing. Which statement is true?', 'Una pila nueva está sobre la mesa, sin conectar a nada. ¿Qué afirmación es cierta?'),
        opts: [
          T('There is voltage between its terminals, but no current flows', 'Hay voltaje entre sus terminales, pero no circula corriente'),
          T('There is current, but no voltage', 'Hay corriente, pero no voltaje'),
          T('There is neither voltage nor current', 'No hay ni voltaje ni corriente'),
        ],
        correct: 0,
        explain: T('Voltage can exist with no flow at all — like water pressure behind a closed tap. Current needs a complete path.', 'Puede haber voltaje sin ningún flujo, como la presión del agua detrás de un grifo cerrado. La corriente necesita un camino completo.'),
      },
    },
    {
      id: 'points', kind: 'do', focus: 'aa', hi: ['term:aa+', 'term:aa-'],
      title: T('Find the two points', 'Encontrar los dos puntos'),
      goal: T('Point out the two points a voltmeter would compare on the AA battery.', 'Señalar los dos puntos que un voltímetro compararía en la pila AA.'),
      why: T('A terminal is a metal contact where you can connect to a component. The battery has a positive (+) terminal and a negative (−) terminal.', 'Un terminal es un contacto metálico donde puedes conectarte a un componente. La pila tiene un terminal positivo (+) y uno negativo (−).'),
      action: T('Click the terminal labeled AA + and the terminal labeled AA − (on the bench or on the diagram).', 'Haz clic en el terminal rotulado AA + y en el rotulado AA − (en la mesa o en el diagrama).'),
      observe: T('Both points are marked with a ring and a check mark — on the bench and on the diagram at the same time.', 'Ambos puntos quedan marcados con un anillo y una marca de verificación, en la mesa y en el diagrama a la vez.'),
      meaning: T('The diagram and the bench show the same circuit. Identifying the two points always comes before measuring.', 'El diagrama y la mesa muestran el mismo circuito. Identificar los dos puntos siempre va antes de medir.'),
      check: (sim) => intendedIs(sim, ['aa+', 'aa-']),
      demo: [['identify', ['aa+', 'aa-']]],
    },
    {
      id: 'formula', kind: 'quiz', focus: 'aa',
      title: T('Red minus black', 'Roja menos negra'),
      goal: T('Learn the one rule that explains every DC reading.', 'Aprender la única regla que explica toda lectura de CC.'),
      why: T('The meter compares the red probe’s point with the black probe’s point: Displayed DC voltage = potential at red probe − potential at black probe.', 'El medidor compara el punto de la punta roja con el de la punta negra: Voltaje de CC mostrado = potencial en la punta roja − potencial en la punta negra.'),
      action: T('Use the rule to answer.', 'Usa la regla para responder.'),
      quiz: {
        q: T('Call the AA − terminal 0 V. Then AA + is 1.58 V higher. Red touches AA +, black touches AA −. What is displayed?', 'Llamemos 0 V al terminal AA −. Entonces AA + está 1,58 V más alto. La roja toca AA + y la negra AA −. ¿Qué se muestra?'),
        opts: [T('1.58 V', '1,58 V'), T('−1.58 V', '−1,58 V'), T('0 V', '0 V')],
        correct: 0,
        explain: T('1.58 − 0 = 1.58 V. Red is on the higher point, so the result is positive.', '1,58 − 0 = 1,58 V. La roja está en el punto más alto, así que el resultado es positivo.'),
      },
    },
    {
      id: 'formula2', kind: 'quiz', focus: 'aa',
      title: T('Swap the probes', 'Intercambiar las puntas'),
      goal: T('Predict what happens when the probes are the other way round.', 'Predecir qué pasa cuando las puntas están al revés.'),
      why: T('The same rule works in every case. You will try this for real in Lesson 3.', 'La misma regla sirve en todos los casos. Lo probarás de verdad en la Lección 3.'),
      action: T('Use the rule again.', 'Usa la regla otra vez.'),
      quiz: {
        q: T('Now red touches AA − (0 V) and black touches AA + (1.58 V). What is displayed?', 'Ahora la roja toca AA − (0 V) y la negra AA + (1,58 V). ¿Qué se muestra?'),
        opts: [T('1.58 V', '1,58 V'), T('−1.58 V', '−1,58 V'), T('0 V', '0 V')],
        correct: 1,
        explain: T('0 − 1.58 = −1.58 V. The minus sign only tells you that red is on the lower point. Nothing is wrong or damaged.', '0 − 1,58 = −1,58 V. El signo menos solo indica que la roja está en el punto más bajo. Nada está mal ni se daña.'),
      },
    },
    {
      id: 'parallel', kind: 'do', focus: 'lamp9', diagram: 'lamp9', hi: [], expect: ['reversed'],
      title: T('“In parallel”: across, not in the way', '«En paralelo»: junto a, no en medio'),
      goal: T('See how a voltmeter connects to a working circuit.', 'Ver cómo se conecta un voltímetro a un circuito en funcionamiento.'),
      why: T('“In parallel” means the meter connects across a component — one probe on each side — while the circuit’s own path stays intact. You never cut a wire to measure voltage.', '«En paralelo» significa que el medidor se conecta entre los extremos de un componente, una punta a cada lado, mientras el camino del circuito queda intacto. Nunca se corta un cable para medir voltaje.'),
      action: T('Press “Show me” and watch the instructor’s meter connect across the lamp while it is lit.', 'Pulsa «Muéstrame» y observa cómo el medidor del instructor se conecta entre los extremos de la lámpara mientras está encendida.'),
      observe: T('The lamp stays on. The meter shows about 9 V. On the diagram the meter sits beside the lamp, not in the loop.', 'La lámpara sigue encendida. El medidor muestra unos 9 V. En el diagrama el medidor queda al lado de la lámpara, no dentro del lazo.'),
      meaning: T('The meter only “looks” at the two points. The circuit keeps working exactly as before.', 'El medidor solo «mira» los dos puntos. El circuito sigue funcionando exactamente igual.'),
      setup: (sim) => sim.setup({ ...READY, dial: 'VDC', range: 'AUTO', switches: { lamp9: true }, intended: [] }),
      check: (sim, ctx) => ctx.demoDone || (pairOn(sim, 'tp4', 'tp5') && meas(sim)),
      demo: [['identify', ['tp4', 'tp5']], ['touch', 'black', 'tp5'], ['touch', 'red', 'tp4'], ['wait', 2200]],
    },
    {
      id: 'qpar', kind: 'quiz', focus: 'lamp9', diagram: 'lamp9',
      title: T('Check: in parallel', 'Comprobación: en paralelo'),
      goal: T('Confirm what “in parallel” means in practice.', 'Confirmar qué significa «en paralelo» en la práctica.'),
      why: T('Knowing that the circuit stays intact removes a lot of beginner worry.', 'Saber que el circuito queda intacto quita muchas dudas de principiante.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('To measure the voltage across the lamp, what did the instructor do to the circuit wiring?', 'Para medir el voltaje entre los extremos de la lámpara, ¿qué le hizo el instructor al cableado del circuito?'),
        opts: [
          T('Nothing — the probes touched one point on each side of the lamp', 'Nada: las puntas tocaron un punto a cada lado de la lámpara'),
          T('Disconnected a wire and put the meter in the gap', 'Desconectó un cable y puso el medidor en el hueco'),
          T('Removed the lamp', 'Quitó la lámpara'),
        ],
        correct: 0,
        explain: T('Voltage is measured across (in parallel). Putting a meter into a gap is how current is measured — a different procedure that this lab does not use.', 'El voltaje se mide entre los extremos (en paralelo). Poner el medidor en un hueco es como se mide corriente: otro procedimiento que este laboratorio no usa.'),
      },
    },
    summary('sum', [SEQ_POINTS.basics,
      T('Voltage = potential difference; current = flow of charge; resistance = opposition to current.', 'Voltaje = diferencia de potencial; corriente = flujo de carga; resistencia = oposición a la corriente.'),
      T('A voltmeter connects in parallel: across the component, with the circuit left intact.', 'Un voltímetro se conecta en paralelo: entre los extremos del componente, dejando el circuito intacto.')]),
  ],
};

// ===========================================================================
// Lesson 2 — First battery measurement
// ===========================================================================
function aaProcedure() {
  return [
    {
      id: 'inspect', kind: 'do', focus: 'meter', hi: ['meter', 'lead:red', 'lead:black'],
      title: T('Inspect the meter and leads', 'Inspeccionar el medidor y los cables'),
      goal: T('Make sure the meter and both test leads are undamaged.', 'Asegurar que el medidor y ambos cables de prueba no tengan daños.'),
      why: T('Insulation is the covering that keeps electricity away from your hands. A cracked case or a nicked lead is no longer protecting you.', 'El aislamiento es la cubierta que mantiene la electricidad lejos de tus manos. Una carcasa agrietada o un cable cortado ya no te protege.'),
      action: T('Click the meter body, then the red lead’s wire, then the black lead’s wire. (Or use the three Inspect buttons in the check list.)', 'Haz clic en el cuerpo del medidor, luego en el cable rojo y luego en el cable negro. (O usa los tres botones Inspeccionar de la lista.)'),
      observe: T('Each inspection reports “no cracks, no exposed metal, insulation intact”.', 'Cada inspección informa «sin grietas, sin metal expuesto, aislamiento intacto».'),
      meaning: T('The equipment is fit to use. If anything had been damaged, you would replace it before going on.', 'El equipo está en condiciones de uso. Si algo hubiera estado dañado, lo reemplazarías antes de continuar.'),
      check: (sim) => sim.checkItem('inspect'),
      demo: [['inspect', 'meter'], ['inspect', 'red'], ['inspect', 'black']],
    },
    {
      id: 'black', kind: 'do', focus: 'jacks', hi: ['plug:black', 'jack:COM'],
      title: T('Black lead into COM', 'Cable negro en COM'),
      goal: T('Connect the black lead to the meter’s reference jack.', 'Conectar el cable negro al borne de referencia del medidor.'),
      why: T('Leads are connected to the meter while the probes are away from the battery, so nothing is live while you handle plugs.', 'Los cables se conectan al medidor mientras las puntas están lejos de la pila, para que nada esté energizado mientras manipulas las clavijas.'),
      action: T('With the probes resting on the bench, click the black plug and then the COM jack (or drag the plug to the jack).', 'Con las puntas descansando en la mesa, haz clic en la clavija negra y luego en el borne COM (o arrastra la clavija al borne).'),
      observe: T('The black plug sits in the COM jack.', 'La clavija negra queda en el borne COM.'),
      meaning: T('The black probe is now the meter’s reference point.', 'La punta negra es ahora el punto de referencia del medidor.'),
      check: (sim) => st(sim).plugs.black === 'COM' && parked(sim),
      demo: [['plug', 'black', 'COM']],
    },
    {
      id: 'red', kind: 'do', focus: 'jacks', hi: ['plug:red', 'jack:V'], confirms: ['jacks'],
      title: T('Red lead into V/Ω', 'Cable rojo en V/Ω'),
      goal: T('Connect the red lead to the voltage jack.', 'Conectar el cable rojo al borne de voltaje.'),
      why: T('V/Ω is the only correct red-lead jack for voltage. The A and mA jacks would turn the meter into a short circuit.', 'V/Ω es el único borne correcto del cable rojo para voltaje. Los bornes A y mA convertirían el medidor en un cortocircuito.'),
      action: T('Click the red plug and then the V/Ω jack (or drag it there).', 'Haz clic en la clavija roja y luego en el borne V/Ω (o arrástrala).'),
      observe: T('The red plug sits in V/Ω. In the check list, “Confirm the correct jacks” shows Done.', 'La clavija roja queda en V/Ω. En la lista, «Confirmar los bornes correctos» muestra Hecho.'),
      meaning: T('The leads are connected correctly for a voltage measurement.', 'Los cables están bien conectados para medir voltaje.'),
      check: (sim) => sim.jacksOK() && parked(sim),
      demo: [['plug', 'red', 'V']],
    },
    {
      id: 'dc', kind: 'do', focus: 'dial', hi: ['dialpos:VDC'], confirms: ['func'],
      title: T('Select DC voltage', 'Seleccionar voltaje de CC'),
      goal: T('Set the meter to measure DC voltage.', 'Ajustar el medidor para medir voltaje de CC.'),
      why: T('A battery is a DC source: its polarity stays the same. DC voltage is marked V⎓ on the selector.', 'Una pila es una fuente de CC: su polaridad se mantiene. El voltaje de CC está marcado V⎓ en el selector.'),
      action: T('Turn the rotary selector to V⎓.', 'Gira el selector giratorio a V⎓.'),
      observe: T('The display switches on and shows “DC” and the unit V.', 'La pantalla se enciende y muestra «DC» y la unidad V.'),
      meaning: T('The meter is now a DC voltmeter.', 'El medidor es ahora un voltímetro de CC.'),
      check: (sim) => st(sim).dial === 'VDC',
      demo: [['dial', 'VDC']],
    },
    {
      id: 'auto', kind: 'do', focus: 'display', hi: ['btn:range'], confirms: ['range'],
      title: T('Select autorange', 'Seleccionar rango automático'),
      goal: T('Let the meter choose the range for you.', 'Dejar que el medidor elija el rango por ti.'),
      why: T('The range is the largest value the meter can show at its present setting. With autorange (AUTO) the meter picks a suitable range itself.', 'El rango es el valor máximo que el medidor puede mostrar con su ajuste actual. Con rango automático (AUTO) el medidor elige solo un rango adecuado.'),
      action: T('Press the RANGE button until the display shows AUTO.', 'Pulsa el botón RANGE hasta que la pantalla muestre AUTO.'),
      observe: T('“AUTO” appears at the top right of the display.', '«AUTO» aparece arriba a la derecha de la pantalla.'),
      meaning: T('You do not need to choose a range for this measurement. Lesson 4 covers manual ranges.', 'No necesitas elegir un rango para esta medición. La Lección 4 trata los rangos manuales.'),
      check: (sim) => st(sim).dial === 'VDC' && st(sim).range === 'AUTO',
      demo: [['range', 'AUTO']],
    },
    {
      id: 'ident', kind: 'do', focus: 'aa', hi: ['term:aa+', 'term:aa-'],
      title: T('Identify the battery terminals', 'Identificar los terminales de la pila'),
      goal: T('Find the battery’s positive (+) and negative (−) terminals.', 'Encontrar los terminales positivo (+) y negativo (−) de la pila.'),
      why: T('You decide where each probe will go before picking one up.', 'Decides dónde irá cada punta antes de tomar una.'),
      action: T('Click the terminal labeled AA + and the terminal labeled AA −.', 'Haz clic en el terminal rotulado AA + y en el rotulado AA −.'),
      observe: T('Both terminals are marked with a ring and a check mark, on the bench and on the diagram.', 'Ambos terminales quedan marcados con un anillo y una marca de verificación, en la mesa y en el diagrama.'),
      meaning: T('These are your two intended test points. The simulator will only let probes touch points you have identified.', 'Estos son tus dos puntos de prueba previstos. El simulador solo deja que las puntas toquen puntos que hayas identificado.'),
      check: (sim) => intendedIs(sim, ['aa+', 'aa-']),
      demo: [['identify', ['aa+', 'aa-']]],
    },
    {
      id: 'grip', kind: 'do', focus: 'probes', hi: ['probe:red', 'probe:black'], confirms: ['guards', 'bridge'],
      title: T('Hold the handles behind the guards', 'Sujetar los mangos detrás de las guardas'),
      goal: T('Grip each probe the safe way.', 'Sujetar cada punta de forma segura.'),
      why: T('Your fingers stay on the insulated handle, behind the finger guard, and each metal tip will touch one terminal only.', 'Tus dedos quedan en el mango aislado, detrás de la guarda, y cada punta metálica tocará un solo terminal.'),
      action: T('Click the handle of the black probe, then the handle of the red probe.', 'Haz clic en el mango de la punta negra y luego en el mango de la punta roja.'),
      observe: T('Each probe lifts “in hand” when gripped by the handle. The last two check-list items show Done.', 'Cada punta se levanta «en la mano» al tomarla por el mango. Los dos últimos puntos de la lista muestran Hecho.'),
      meaning: T('The pre-measurement check is complete. Now, and only now, a probe may touch the battery.', 'La comprobación previa está completa. Ahora, y solo ahora, una punta puede tocar la pila.'),
      check: (sim, ctx) => did(ctx, 'grip', (e) => e.lead === 'red' && e.part === 'handle') && did(ctx, 'grip', (e) => e.lead === 'black' && e.part === 'handle'),
      demo: [['grip', 'black'], ['grip', 'red']],
    },
    {
      id: 'tblack', kind: 'do', focus: 'aa', hi: ['probe:black', 'term:aa-'],
      title: T('Touch black to negative', 'Tocar el negativo con la negra'),
      goal: T('Put the reference probe on the battery’s negative terminal.', 'Poner la punta de referencia en el terminal negativo de la pila.'),
      why: T('The black (reference) probe goes on first.', 'La punta negra (referencia) se coloca primero.'),
      action: T('Drag the black probe by its handle to AA −. Or click the black handle, then click AA −.', 'Arrastra la punta negra por su mango hasta AA −. O haz clic en el mango negro y luego en AA −.'),
      observe: T('The black tip snaps onto AA −. The display still wanders near zero: only one point is connected.', 'La punta negra encaja en AA −. La pantalla sigue variando cerca de cero: solo hay un punto conectado.'),
      meaning: T('One probe alone measures nothing. A voltage needs two points.', 'Una sola punta no mide nada. Un voltaje necesita dos puntos.'),
      expect: ['floating'],
      check: (sim) => st(sim).probes.black === 'aa-',
      demo: [['touch', 'black', 'aa-']],
    },
    {
      id: 'tred', kind: 'do', focus: 'aa', hi: ['probe:red', 'term:aa+'],
      title: T('Touch red to positive', 'Tocar el positivo con la roja'),
      goal: T('Complete the two-point connection.', 'Completar la conexión entre dos puntos.'),
      why: T('With red on the higher point and black on the lower point, the reading will be positive.', 'Con la roja en el punto más alto y la negra en el más bajo, la lectura será positiva.'),
      action: T('Drag the red probe by its handle to AA +. Or click the red handle, then click AA +.', 'Arrastra la punta roja por su mango hasta AA +. O haz clic en el mango rojo y luego en AA +.'),
      observe: T('The red tip snaps onto AA +. The digits start to climb.', 'La punta roja encaja en AA +. Los dígitos empiezan a subir.'),
      meaning: T('The meter is now connected across the battery — in parallel with it.', 'El medidor está ahora conectado entre los terminales de la pila: en paralelo con ella.'),
      check: (sim) => on(sim, 'aa+', 'aa-'),
      demo: [['touch', 'red', 'aa+']],
    },
    {
      id: 'settle', kind: 'do', focus: 'display', hi: ['display'],
      title: T('Wait for the reading to settle', 'Esperar a que la lectura se estabilice'),
      goal: T('Give the meter a moment before you read it.', 'Darle un momento al medidor antes de leerlo.'),
      why: T('A digital meter takes a short time to work out a steady value. The first digits you see are not the answer.', 'Un medidor digital tarda un poco en calcular un valor estable. Los primeros dígitos que ves no son la respuesta.'),
      action: T('Keep both probes still and watch the display until it stops changing.', 'Mantén ambas puntas quietas y observa la pantalla hasta que deje de cambiar.'),
      observe: T('The number stops at 1.580 and the status line says “Reading is steady”.', 'El número se detiene en 1.580 y la línea de estado dice «La lectura es estable».'),
      meaning: T('You now have a real, steady measurement.', 'Ahora tienes una medición real y estable.'),
      check: (sim) => on(sim, 'aa+', 'aa-') && meas(sim),
      demo: [['wait', 1800]],
    },
    {
      id: 'read', kind: 'entry', focus: 'display', hi: ['display'],
      title: T('Read number, sign and unit', 'Leer número, signo y unidad'),
      goal: T('Read the complete result: number, sign and unit.', 'Leer el resultado completo: número, signo y unidad.'),
      why: T('“1.58” alone is not a measurement. Is it positive or negative? Volts or millivolts? DC or AC?', '«1.58» por sí solo no es una medición. ¿Es positivo o negativo? ¿Voltios o milivoltios? ¿CC o CA?'),
      action: T('Say the reading aloud, then enter the sign, the number and the unit below and press Check.', 'Di la lectura en voz alta; luego ingresa abajo el signo, el número y la unidad y pulsa Comprobar.'),
      observe: T('No minus sign, 1.580, and the unit V with “DC”.', 'Sin signo menos, 1.580, y la unidad V con «DC».'),
      meaning: T('“Positive 1.58 volts DC”: the red probe’s point is 1.58 V higher than the black probe’s point. (Simulated reading.)', '«1,58 voltios de CC, positivo»: el punto de la punta roja está 1,58 V por encima del de la negra. (Lectura simulada.)'),
      entry: { type: 'reading' },
      pre: (sim) => on(sim, 'aa+', 'aa-') && meas(sim),
      demo: [['wait', 1800], ['entry']],
    },
    removeStep('remove', 'aa'),
    offStep('off'),
  ];
}

const L2 = {
  id: 'l2', minutes: 14, diagram: 'aa',
  title: T('First battery measurement', 'Primera medición de una pila'),
  blurb: T('The complete procedure on an AA battery — guided, then on your own.', 'El procedimiento completo en una pila AA: guiado y luego por tu cuenta.'),
  init: (sim) => sim.reset({ range: 200 }),
  steps: [
    ...aaProcedure(),
    {
      id: 'nominal', kind: 'quiz', focus: 'aa',
      title: T('Nominal and measured', 'Nominal y medido'),
      goal: T('Interpret 1.58 V on a battery labeled 1.5 V.', 'Interpretar 1,58 V en una pila rotulada 1,5 V.'),
      why: T('“1.5 V” is the battery’s nominal rating — its name-plate value. A measured value can differ from it.', '«1,5 V» es el valor nominal de la pila: su valor de etiqueta. Un valor medido puede ser distinto.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('The battery is labeled 1.5 V and the meter read 1.58 V with nothing else connected. What can you conclude?', 'La pila está rotulada 1,5 V y el medidor marcó 1,58 V sin nada más conectado. ¿Qué puedes concluir?'),
        opts: [
          T('The reading is normal: 1.5 V is a nominal label, and an unloaded battery often reads a little higher', 'La lectura es normal: 1,5 V es un valor nominal, y una pila sin carga suele marcar algo más'),
          T('The meter must be faulty, because it should read exactly 1.500 V', 'El medidor debe estar averiado, porque debería marcar exactamente 1,500 V'),
          T('The battery is proven to be healthy and full', 'Queda demostrado que la pila está sana y llena'),
        ],
        correct: 0,
        explain: T('One voltage reading with no load does not prove a battery’s capacity or overall health — a tired battery can still show a good voltage until it has to supply current.', 'Una sola lectura de voltaje sin carga no demuestra la capacidad ni el estado general de una pila: una pila gastada puede mostrar buen voltaje hasta que tiene que entregar corriente.'),
      },
    },
    {
      id: 'handover', kind: 'ack', focus: 'front',
      title: T('Your turn', 'Tu turno'),
      goal: T('Repeat the whole procedure on your own.', 'Repetir todo el procedimiento por tu cuenta.'),
      why: T('Doing it again without step-by-step coaching is what makes it stick.', 'Hacerlo otra vez sin guía paso a paso es lo que lo fija en la memoria.'),
      action: T('The equipment has been reset: leads unplugged, meter off. Press Continue, then carry out all 13 steps. The list ticks off as your setup becomes correct.', 'El equipo se reinició: cables desconectados y medidor apagado. Pulsa Continuar y realiza los 13 pasos. La lista se irá marcando cuando tu configuración sea correcta.'),
      observe: T('No highlights this time. A Hint button is there if you get stuck.', 'Esta vez sin resaltados. Hay un botón Pista si te atascas.'),
      meaning: T('Safety blocks still work exactly as before.', 'Los bloqueos de seguridad funcionan exactamente igual que antes.'),
      setup: (sim) => sim.reset({ range: 200 }),
    },
    ...aaProcedure().map((s, i) => ({ ...s, id: `solo_${s.id}`, independent: true, soloFirst: i === 0 })),
    summary('sum', [SEQ_POINTS.basics,
      T('1.5 V is a nominal rating; 1.58 V is a normal measured value.', '1,5 V es un valor nominal; 1,58 V es un valor medido normal.'),
      T('One unloaded voltage reading does not prove a battery’s capacity or health.', 'Una lectura de voltaje sin carga no demuestra la capacidad ni el estado de una pila.')]),
  ],
};

// ===========================================================================
// Lesson 3 — Polarity and reference points
// ===========================================================================
const AA_LABELS = { 'aa+': 'AA +', 'aa-': 'AA −' };
const oAA = [T('About +1.58 V', 'Unos +1,58 V'), T('About −1.58 V', 'Unos −1,58 V'), T('About 0 V', 'Unos 0 V')];
const L3 = {
  id: 'l3', minutes: 12, diagram: 'aa',
  title: T('Polarity and reference points', 'Polaridad y puntos de referencia'),
  blurb: T('Reverse the probes, share a node, lift a probe — and predict each result first.', 'Invierte las puntas, comparte un nodo, levanta una punta, y predice cada resultado antes.'),
  init: (sim) => sim.reset(),
  steps: [
    setupStep('setup', { dial: 'VDC', points: ['aa+', 'aa-'], labels: AA_LABELS }),
    {
      id: 'normal', kind: 'do', focus: 'aa', hi: ['term:aa+', 'term:aa-'], pair: ['aa+', 'aa-'],
      title: T('Red on +, black on −', 'Roja en +, negra en −'),
      goal: T('Take the normal reading as a starting point.', 'Tomar la lectura normal como punto de partida.'),
      why: T('Polarity means which of the two points is higher (+) and which is lower (−).', 'La polaridad indica cuál de los dos puntos es más alto (+) y cuál más bajo (−).'),
      action: T('Answer the prediction. Then touch black to AA − and red to AA +.', 'Responde la predicción. Luego toca AA − con la negra y AA + con la roja.'),
      observe: T('About 1.580 V with no minus sign.', 'Unos 1.580 V sin signo menos.'),
      meaning: T('Red minus black = 1.58 − 0 = +1.58 V.', 'Roja menos negra = 1,58 − 0 = +1,58 V.'),
      predict: predV(0, oAA),
      check: (sim) => on(sim, 'aa+', 'aa-') && meas(sim),
      demo: [['predict'], ['touch', 'black', 'aa-'], ['touch', 'red', 'aa+'], ['wait', 1700]],
    },
    {
      id: 'reverse', kind: 'do', focus: 'aa', hi: ['term:aa+', 'term:aa-'], expect: ['reversed', 'floating', 'same_node'], pair: ['aa-', 'aa+'],
      title: T('Reverse the probes', 'Invertir las puntas'),
      goal: T('See what the meter shows when the probes are swapped.', 'Ver qué muestra el medidor cuando las puntas se intercambian.'),
      why: T('Beginners often fear this is dangerous. On this battery it is simply another valid measurement.', 'Los principiantes suelen temer que esto sea peligroso. En esta pila es simplemente otra medición válida.'),
      action: T('Answer the prediction. Then move the probes so that red is on AA − and black is on AA +.', 'Responde la predicción. Luego mueve las puntas para que la roja quede en AA − y la negra en AA +.'),
      observe: T('About −1.580 V: the same number with a minus sign in front.', 'Unos −1.580 V: el mismo número con un signo menos delante.'),
      meaning: T('The negative sign indicates that the red probe is at a lower potential than the black probe. It is a valid reading, not an unsafe connection.', 'El signo negativo indica que la punta roja está a menor potencial que la negra. Es una lectura válida, no una conexión insegura.'),
      predict: predV(1, oAA),
      check: (sim) => on(sim, 'aa-', 'aa+') && meas(sim),
      demo: [['predict'], ['lift', 'red'], ['touch', 'black', 'aa+'], ['touch', 'red', 'aa-'], ['wait', 1700]],
    },
    {
      id: 'same', kind: 'do', focus: 'aa', hi: ['term:aa+'], expect: ['same_node', 'reversed', 'floating'],
      title: T('Both probes on the same node', 'Ambas puntas en el mismo nodo'),
      goal: T('Find out what the meter shows between a point and itself.', 'Averiguar qué muestra el medidor entre un punto y él mismo.'),
      why: T('A node is all the metal that is joined together with nothing in between. Every spot on one node is at the same potential.', 'Un nodo es todo el metal unido entre sí sin nada en medio. Todos los puntos de un nodo están al mismo potencial.'),
      action: T('Answer the prediction. Then put both probes on the AA + terminal.', 'Responde la predicción. Luego pon ambas puntas en el terminal AA +.'),
      observe: T('About 0.000 V.', 'Unos 0.000 V.'),
      meaning: T('Zero here means “no difference between these two points”. It does not mean the battery is dead — it still has 1.58 V across it.', 'Aquí cero significa «no hay diferencia entre estos dos puntos». No significa que la pila esté agotada: sigue teniendo 1,58 V entre sus terminales.'),
      predict: predV(2, oAA),
      check: (sim) => on(sim, 'aa+', 'aa+') && meas(sim),
      demo: [['predict'], ['touch', 'red', 'aa+'], ['touch', 'black', 'aa+'], ['wait', 1700]],
    },
    {
      id: 'open', kind: 'do', focus: 'aa', hi: ['probe:black'], expect: ['floating', 'same_node'],
      title: T('One probe disconnected', 'Una punta desconectada'),
      goal: T('See what the display does with only one probe connected.', 'Ver qué hace la pantalla con una sola punta conectada.'),
      why: T('An input that is connected to nothing is called “floating”. People often assume it must read zero.', 'Una entrada que no está conectada a nada se llama «flotante». Mucha gente supone que debe marcar cero.'),
      action: T('Answer the prediction. Then lift the black probe off the battery (click its handle, then click it again to put it down) and leave red on AA +.', 'Responde la predicción. Luego levanta la punta negra de la pila (clic en su mango y otro clic para dejarla) y deja la roja en AA +.'),
      observe: T('The status line says “No valid two-point measurement”. The digits wander by a few thousandths of a volt and may change sign.', 'La línea de estado dice «No hay medición válida entre dos puntos». Los dígitos varían unas milésimas de voltio y pueden cambiar de signo.'),
      meaning: T('A floating input does not reliably read zero. Real meters may show unstable or misleading numbers. A number without two good contacts is not a measurement.', 'Una entrada flotante no marca cero de forma fiable. Los medidores reales pueden mostrar números inestables o engañosos. Un número sin dos buenos contactos no es una medición.'),
      predict: {
        q: T('What will the display show with the black probe in the air?', '¿Qué mostrará la pantalla con la punta negra en el aire?'),
        opts: [
          T('Exactly 0.000 V, steadily', 'Exactamente 0.000 V, de forma estable'),
          T('Small wandering numbers that are not a real measurement', 'Números pequeños y cambiantes que no son una medición real'),
          T('1.58 V, the same as before', '1,58 V, igual que antes'),
        ],
        correct: 1,
      },
      check: (sim) => st(sim).probes.red === 'aa+' && !st(sim).probes.black && sim.reading().reason === 'open',
      demo: [['predict'], ['touch', 'red', 'aa+'], ['lift', 'black'], ['wait', 2500]],
    },
    {
      id: 'qneg', kind: 'quiz', focus: 'aa',
      title: T('Check: a negative reading', 'Comprobación: una lectura negativa'),
      goal: T('Explain a minus sign in your own words.', 'Explicar un signo menos con tus propias palabras.'),
      why: T('You need to tell a valid negative reading apart from a genuinely unsafe connection.', 'Necesitas distinguir una lectura negativa válida de una conexión realmente insegura.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('The display shows −1.58 V DC. What does it tell you?', 'La pantalla muestra −1,58 V CC. ¿Qué te dice?'),
        opts: [
          T('The red probe is on the lower-potential point; the reading is valid', 'La punta roja está en el punto de menor potencial; la lectura es válida'),
          T('The meter is being damaged and must be disconnected at once', 'El medidor se está dañando y hay que desconectarlo ya'),
          T('The battery is producing negative energy', 'La pila está produciendo energía negativa'),
        ],
        correct: 0,
        explain: T('Reversed probes on a voltage function give a valid negative number. What is unsafe is a different thing entirely: a lead in a current jack, the wrong function, or a tip bridging terminals.', 'Las puntas invertidas en una función de voltaje dan un número negativo válido. Lo inseguro es algo totalmente distinto: un cable en un borne de corriente, la función equivocada o una punta puenteando terminales.'),
      },
    },
    removeStep('remove', 'aa'),
    offStep('off'),
    summary('sum', [SEQ_POINTS.basics,
      T('A minus sign means red is on the lower point. Valid, not unsafe.', 'Un signo menos significa que la roja está en el punto más bajo. Válido, no inseguro.'),
      T('Same node → about 0 V. One probe open → no valid measurement, and not a reliable zero.', 'Mismo nodo → unos 0 V. Una punta abierta → no hay medición válida ni un cero fiable.')]),
  ],
};

// ===========================================================================
// Lesson 4 — Manual ranging and units
// ===========================================================================
const B9_LABELS = { 'b9+': '9V +', 'b9-': '9V −' };
const L4 = {
  id: 'l4', minutes: 14, diagram: 'b9',
  title: T('Manual ranging and units', 'Rango manual y unidades'),
  blurb: T('Choose a range for a 9 V battery, see overrange, and convert V and mV.', 'Elige un rango para una batería de 9 V, observa el sobrerrango y convierte V y mV.'),
  init: (sim) => sim.reset(),
  steps: [
    {
      id: 'ranges', kind: 'do', focus: 'display', hi: ['dialpos:VDC', 'btn:range'],
      title: T('This meter’s DC ranges', 'Los rangos de CC de este medidor'),
      goal: T('See the three manual DC ranges of this training meter.', 'Ver los tres rangos manuales de CC de este medidor de práctica.'),
      why: T('This fictional training meter documents its ranges like a manual would: 2 V (shows up to 1.999, in steps of 0.001 V), 20 V (up to 19.99, steps of 0.01 V) and 200 V (up to 199.9, steps of 0.1 V).', 'Este medidor de práctica ficticio documenta sus rangos como lo haría un manual: 2 V (muestra hasta 1.999, en pasos de 0,001 V), 20 V (hasta 19.99, pasos de 0,01 V) y 200 V (hasta 199.9, pasos de 0,1 V).'),
      action: T('Turn the selector to V⎓. Then press RANGE repeatedly until you have seen 2 V, 20 V and 200 V.', 'Gira el selector a V⎓. Luego pulsa RANGE varias veces hasta haber visto 2 V, 20 V y 200 V.'),
      observe: T('The display shows MANUAL with the range, and the decimal point moves.', 'La pantalla muestra MANUAL con el rango y el punto decimal se desplaza.'),
      meaning: T('In manual ranging, you choose the range. A smaller range shows more decimal places but tops out sooner.', 'En rango manual, tú eliges el rango. Un rango menor muestra más decimales pero se agota antes.'),
      subs: [
        { label: T('Selector on V⎓', 'Selector en V⎓'), ok: (sim) => st(sim).dial === 'VDC' },
        { label: T('Seen 2 V', 'Visto 2 V'), ok: (sim, ctx) => did(ctx, 'range', (e) => e.range === 2) },
        { label: T('Seen 20 V', 'Visto 20 V'), ok: (sim, ctx) => did(ctx, 'range', (e) => e.range === 20) },
        { label: T('Seen 200 V', 'Visto 200 V'), ok: (sim, ctx) => did(ctx, 'range', (e) => e.range === 200) },
      ],
      demo: [['dial', 'VDC'], ['range', 2], ['range', 20], ['range', 200]],
    },
    {
      id: 'qrange', kind: 'quiz', focus: 'b9',
      title: T('Choose a range for 9 V', 'Elegir un rango para 9 V'),
      goal: T('Pick the best manual range for a known 9 V battery.', 'Elegir el mejor rango manual para una batería conocida de 9 V.'),
      why: T('The best range is the smallest one that is still larger than the voltage you expect: it fits the value and gives the most useful decimals.', 'El mejor rango es el menor que siga siendo mayor que el voltaje que esperas: abarca el valor y da los decimales más útiles.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('The battery is labeled 9 V. Which range of this meter fits best?', 'La batería está rotulada 9 V. ¿Qué rango de este medidor conviene más?'),
        opts: [T('2 V', '2 V'), T('20 V', '20 V'), T('200 V', '200 V')],
        correct: 1,
        explain: T('9 V does not fit in the 2 V range. It fits in both 20 V and 200 V, but 20 V shows 9.36 where 200 V shows only 9.4.', '9 V no cabe en el rango de 2 V. Cabe en 20 V y en 200 V, pero 20 V muestra 9.36 donde 200 V solo muestra 9.4.'),
      },
    },
    setupStep('setup', { dial: 'VDC', ranges: [20], points: ['b9+', 'b9-'], labels: B9_LABELS }),
    {
      id: 'm20', kind: 'do', focus: 'b9', hi: ['term:b9+', 'term:b9-'], pair: ['b9+', 'b9-'], expect: ['reversed'],
      title: T('Measure on the 20 V range', 'Medir en el rango de 20 V'),
      goal: T('Measure the 9 V battery on a well-chosen range.', 'Medir la batería de 9 V con un rango bien elegido.'),
      why: T('The two snap terminals of a 9 V battery are close together. Each tip goes squarely on one terminal — never in the gap between them.', 'Los dos terminales a presión de una batería de 9 V están muy juntos. Cada punta va de lleno sobre un terminal, nunca en el hueco entre ambos.'),
      action: T('Touch black to 9V − and red to 9V +.', 'Toca 9V − con la negra y 9V + con la roja.'),
      observe: T('About 9.36 V (simulated). Two decimal places.', 'Unos 9.36 V (simulado). Dos decimales.'),
      meaning: T('The value fits the 20 V range with room to spare, and you can read it to a hundredth of a volt.', 'El valor cabe de sobra en el rango de 20 V y puedes leerlo hasta la centésima de voltio.'),
      check: (sim) => on(sim, 'b9+', 'b9-') && meas(sim) && st(sim).range === 20,
      demo: [['touch', 'black', 'b9-'], ['touch', 'red', 'b9+'], ['wait', 1700]],
    },
    {
      id: 'ol', kind: 'do', focus: 'display', hi: ['btn:range'], expect: ['range_low'],
      title: T('See an overrange', 'Ver un sobrerrango'),
      goal: T('Learn what this meter shows when the range is too small.', 'Saber qué muestra este medidor cuando el rango es demasiado pequeño.'),
      why: T('Overrange means the value is bigger than the selected range can display. You may change range with the probes connected, because the function does not change.', 'Sobrerrango significa que el valor es mayor de lo que el rango elegido puede mostrar. Puedes cambiar de rango con las puntas conectadas, porque la función no cambia.'),
      action: T('Leave the probes on the battery. Press RANGE until the range is 2 V.', 'Deja las puntas en la batería. Pulsa RANGE hasta que el rango sea 2 V.'),
      observe: T('The display shows “OL” instead of a number, and the coach flags it — expected here.', 'La pantalla muestra «OL» en lugar de un número y el instructor lo señala; aquí es lo esperado.'),
      meaning: T('Overrange means the selected range is too small — not that voltage is absent. “OL” is specific to this simulated meter; real displays vary, so check your manual.', 'Sobrerrango significa que el rango elegido es demasiado pequeño, no que no haya voltaje. «OL» es propio de este medidor simulado; las pantallas reales varían, así que consulta tu manual.'),
      check: (sim) => on(sim, 'b9+', 'b9-') && st(sim).range === 2 && sim.display.ol,
      demo: [['range', 2], ['wait', 1500]],
    },
    {
      id: 'm200', kind: 'do', focus: 'display', hi: ['btn:range'],
      title: T('Try the 200 V range', 'Probar el rango de 200 V'),
      goal: T('See what a larger-than-needed range does to the reading.', 'Ver qué le hace a la lectura un rango mayor del necesario.'),
      why: T('A higher range always “fits”, but there is a cost.', 'Un rango mayor siempre «cabe», pero tiene un costo.'),
      action: T('Press RANGE until the range is 200 V.', 'Pulsa RANGE hasta que el rango sea 200 V.'),
      observe: T('About 9.4 V: only one decimal place.', 'Unos 9.4 V: un solo decimal.'),
      meaning: T('A higher range may show fewer useful decimal places. The battery did not change — only the detail you can see.', 'Un rango mayor puede mostrar menos decimales útiles. La batería no cambió; solo cambió el detalle que puedes ver.'),
      check: (sim) => on(sim, 'b9+', 'b9-') && st(sim).range === 200 && meas(sim),
      demo: [['range', 200], ['wait', 1500]],
    },
    {
      id: 'hold', kind: 'do', focus: 'display', hi: ['btn:hold'], expect: ['hold_stale', 'floating'],
      title: T('HOLD freezes the display', 'HOLD congela la pantalla'),
      goal: T('See how HOLD can leave an old number on the display.', 'Ver cómo HOLD puede dejar un número antiguo en la pantalla.'),
      why: T('HOLD freezes the number so you can look away from the probes and read it afterwards. The danger: a frozen number looks exactly like a live one.', 'HOLD congela el número para que puedas apartar la vista de las puntas y leerlo después. El peligro: un número congelado se ve igual que uno en vivo.'),
      action: T('With the probes still on the battery, press HOLD. Then lift the red probe off the battery and put it down. Look at the display. Finally press HOLD again.', 'Con las puntas aún en la batería, pulsa HOLD. Luego levanta la punta roja de la batería y déjala. Mira la pantalla. Por último pulsa HOLD otra vez.'),
      observe: T('With HOLD on, the display keeps showing 9.4 V and the word HOLD although the red probe touches nothing; the coach flags a stale reading — expected here. After the second press it returns to live.', 'Con HOLD activo, la pantalla sigue mostrando 9.4 V y la palabra HOLD aunque la punta roja no toque nada; el instructor señala una lectura antigua, y aquí es lo esperado. Tras la segunda pulsación vuelve a estar en vivo.'),
      meaning: T('A held reading is no longer live. Always look for the HOLD flag before you trust a number.', 'Una lectura retenida ya no está en vivo. Busca siempre el aviso HOLD antes de fiarte de un número.'),
      subs: [
        { label: T('HOLD pressed while measuring', 'HOLD pulsado mientras medías'), ok: (sim, ctx) => did(ctx, 'hold', (e) => e.on) },
        { label: T('Red probe lifted while HOLD was on (display stayed frozen)', 'Punta roja levantada con HOLD activo (la pantalla quedó congelada)'), ok: (sim, ctx) => did(ctx, 'detect', (e) => e.code === 'hold_stale') },
        { label: T('HOLD released — display is live again', 'HOLD liberado: la pantalla vuelve a estar en vivo'), ok: (sim, ctx) => !st(sim).hold && did(ctx, 'detect', (e) => e.code === 'hold_stale') },
      ],
      demo: [['hold'], ['wait', 800], ['lift', 'red'], ['wait', 2200], ['hold'], ['wait', 800]],
    },
    {
      id: 'qrating', kind: 'quiz', focus: 'meter',
      title: T('Range is not a safety rating', 'El rango no es una categoría de seguridad'),
      goal: T('Separate “range” from “what the meter is allowed to measure”.', 'Separar «rango» de «lo que el medidor tiene permitido medir».'),
      why: T('Every meter has a maximum permitted input and a safety rating printed on it and stated in its manual. The range setting does not change either.', 'Todo medidor tiene una entrada máxima permitida y una categoría de seguridad impresas en él y en su manual. El ajuste de rango no cambia ninguna de las dos.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('You select the highest range. What happens to the meter’s permitted input and safety rating?', 'Seleccionas el rango más alto. ¿Qué pasa con la entrada permitida y la categoría de seguridad del medidor?'),
        opts: [
          T('Nothing — they stay exactly the same', 'Nada: siguen exactamente igual'),
          T('They increase, so the meter can safely measure more', 'Aumentan, así que el medidor puede medir más con seguridad'),
          T('The meter becomes protected against any voltage', 'El medidor queda protegido contra cualquier voltaje'),
        ],
        correct: 0,
        explain: T('Range only decides how the number is displayed. The meter’s limits are fixed by its design.', 'El rango solo decide cómo se muestra el número. Los límites del medidor los fija su diseño.'),
      },
    },
    {
      id: 'qunknown', kind: 'quiz', focus: 'meter',
      title: T('When the voltage is unknown', 'Cuando el voltaje es desconocido'),
      goal: T('Know the right order of thinking for an unknown voltage.', 'Conocer el orden correcto de razonamiento ante un voltaje desconocido.'),
      why: T('First the measurement situation itself must be verified as safe and within the meter’s rating. Only then does range selection matter — and for that you follow the manufacturer’s manual, which typically says to use autorange or to start at the highest range and step down.', 'Primero hay que verificar que la situación de medición sea segura y esté dentro de la categoría del medidor. Solo entonces importa la elección del rango, y para eso sigues el manual del fabricante, que normalmente indica usar rango automático o empezar por el rango más alto e ir bajando.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('Someone says: “I don’t know what voltage is in there, so I’ll just pick the highest range and measure.” What is wrong with that?', 'Alguien dice: «No sé qué voltaje hay ahí, así que elijo el rango más alto y mido». ¿Qué está mal?'),
        opts: [
          T('Choosing the highest range does not make an unknown circuit safe to approach', 'Elegir el rango más alto no vuelve seguro acercarse a un circuito desconocido'),
          T('Nothing — the highest range protects the meter and the person', 'Nada: el rango más alto protege al medidor y a la persona'),
          T('They should pick the lowest range instead', 'Debería elegir el rango más bajo'),
        ],
        correct: 0,
        explain: T('Range is a display setting. Whether a circuit may be measured at all depends on the circuit, the meter’s rating, and the person’s training and authorization — never on the range.', 'El rango es un ajuste de visualización. Que un circuito pueda medirse depende del circuito, de la categoría del medidor y de la formación y autorización de la persona, nunca del rango.'),
      },
    },
    {
      id: 'u1', kind: 'entry', focus: 'display',
      title: T('Units: volts to millivolts', 'Unidades: de voltios a milivoltios'),
      goal: T('Convert volts to millivolts.', 'Convertir voltios a milivoltios.'),
      why: T('1 V = 1,000 mV, so to go from V to mV you multiply by 1,000.', '1 V = 1000 mV, así que para pasar de V a mV multiplicas por 1000.'),
      action: T('Type the answer and press Check.', 'Escribe la respuesta y pulsa Comprobar.'),
      observe: T('The coach confirms the conversion.', 'El instructor confirma la conversión.'),
      meaning: T('1.5 V and 1,500 mV are the same voltage written two ways.', '1,5 V y 1500 mV son el mismo voltaje escrito de dos maneras.'),
      entry: { type: 'convert', q: T('1.5 V = ? mV', '1,5 V = ? mV'), answer: 1500, unit: 'mV' },
      demo: [['entry']],
    },
    {
      id: 'u2', kind: 'entry', focus: 'display',
      title: T('Units: a small voltage', 'Unidades: un voltaje pequeño'),
      goal: T('Convert a small voltage to millivolts.', 'Convertir un voltaje pequeño a milivoltios.'),
      why: T('Small voltages are easier to read in millivolts.', 'Los voltajes pequeños se leen mejor en milivoltios.'),
      action: T('Type the answer and press Check.', 'Escribe la respuesta y pulsa Comprobar.'),
      observe: T('The coach confirms the conversion.', 'El instructor confirma la conversión.'),
      meaning: T('0.024 V = 24 mV. Always read the unit next to the number.', '0,024 V = 24 mV. Lee siempre la unidad junto al número.'),
      entry: { type: 'convert', q: T('0.024 V = ? mV', '0,024 V = ? mV'), answer: 24, unit: 'mV' },
      demo: [['entry']],
    },
    removeStep('remove', 'b9'),
    offStep('off'),
    summary('sum', [
      T('Overrange (OL here) means “range too small”, not “no voltage”.', 'Sobrerrango (OL aquí) significa «rango demasiado pequeño», no «sin voltaje».'),
      T('A reading with HOLD showing is frozen, not live.', 'Una lectura con HOLD a la vista está congelada, no en vivo.'),
      T('A higher range shows fewer decimals and never raises the meter’s permitted input or safety rating.', 'Un rango mayor muestra menos decimales y nunca aumenta la entrada permitida ni la categoría de seguridad del medidor.'),
      T('1 V = 1,000 mV.', '1 V = 1000 mV.'), SEQ_POINTS.manual]),
  ],
};

// ===========================================================================
// Lesson 5 — Measure a working circuit
// ===========================================================================
const TP = { tp1: 'TP1', tp2: 'TP2', tp3: 'TP3', tp4: 'TP4', tp5: 'TP5', tp6: 'TP6' };
const closed9 = (sim) => st(sim).switches.lamp9;
const open9 = (sim) => !st(sim).switches.lamp9;
const L5 = {
  id: 'l5', minutes: 14, diagram: 'lamp9',
  title: T('Measure a working circuit', 'Medir un circuito en funcionamiento'),
  blurb: T('Battery, switch and lamp in series — measured with the switch closed and open.', 'Batería, interruptor y lámpara en serie, medidos con el interruptor cerrado y abierto.'),
  init: (sim) => sim.reset(),
  steps: [
    {
      id: 'tour', kind: 'do', focus: 'lamp9', hi: ['switch:lamp9'],
      title: T('Meet the circuit', 'Conocer el circuito'),
      goal: T('Understand the lamp circuit before measuring it.', 'Entender el circuito de la lámpara antes de medirlo.'),
      why: T('“In series” means the parts are joined one after another in a single loop: 9 V battery → switch → lamp → back to the battery. A switch is closed when it completes the path and open when it breaks it.', '«En serie» significa que las partes están unidas una tras otra en un solo lazo: batería de 9 V → interruptor → lámpara → de vuelta a la batería. Un interruptor está cerrado cuando completa el camino y abierto cuando lo interrumpe.'),
      action: T('Click the switch on the lamp circuit to close it.', 'Haz clic en el interruptor del circuito de la lámpara para cerrarlo.'),
      observe: T('The switch label changes to CLOSED and the lamp label to LAMP ON. Test points TP1–TP6 sit on each side of every part.', 'La etiqueta del interruptor cambia a CERRADO y la de la lámpara a LÁMPARA ENCENDIDA. Los puntos TP1–TP6 están a cada lado de cada parte.'),
      meaning: T('This is an idealized circuit: perfect wires and a perfect switch. Real wiring and components produce small voltage drops.', 'Es un circuito ideal: cables perfectos y un interruptor perfecto. El cableado y los componentes reales producen pequeñas caídas de voltaje.'),
      check: closed9,
      demo: [['switch', 'lamp9', true]],
    },
    setupStep('setup', {
      dial: 'VDC', ranges: ['AUTO', 20], points: ['tp1', 'tp6'], labels: TP,
      setup: (sim) => sim.setup({ damaged: { red: true } }),
    }),
    measStep('bat_c', {
      labels: TP, pair: ['tp1', 'tp6'], focus: 'lamp9', expect: '9.00 V', cond: closed9,
      record: T('Battery — switch closed', 'Batería: interruptor cerrado'),
      title: T('Across the battery (switch closed)', 'Entre los terminales de la batería (cerrado)'),
      goal: T('Find the voltage across the battery while the lamp is on.', 'Hallar el voltaje de la batería con la lámpara encendida.'),
      why: T('The source is always the first thing to check: everything else depends on it.', 'La fuente es siempre lo primero que se revisa: todo lo demás depende de ella.'),
      meaning: T('The battery supplies 9 V to the loop.', 'La batería entrega 9 V al lazo.'),
      predict: predV(0, o9),
    }),
    measStep('lamp_c', {
      labels: TP, pair: ['tp4', 'tp5'], focus: 'lamp9', expect: '9.00 V', cond: closed9,
      record: T('Lamp — switch closed', 'Lámpara: interruptor cerrado'),
      title: T('Across the lamp (switch closed)', 'Entre los extremos de la lámpara (cerrado)'),
      goal: T('Find the voltage across the lamp while it is on.', 'Hallar el voltaje de la lámpara mientras está encendida.'),
      why: T('“Across the lamp” means one probe on each side of the lamp: TP4 and TP5.', '«Entre los extremos de la lámpara» significa una punta a cada lado: TP4 y TP5.'),
      meaning: T('All 9 V appear across the lamp: it is the only part in the loop that opposes the current.', 'Los 9 V aparecen completos en la lámpara: es la única parte del lazo que se opone a la corriente.'),
      predict: predV(0, o9),
    }),
    measStep('sw_c', {
      labels: TP, pair: ['tp2', 'tp3'], focus: 'lamp9', expect: '0.000 V', cond: closed9,
      record: T('Switch — switch closed', 'Interruptor: cerrado'),
      title: T('Across the closed switch', 'Entre los extremos del interruptor cerrado'),
      goal: T('Find the voltage across the switch while it is closed.', 'Hallar el voltaje del interruptor mientras está cerrado.'),
      why: T('A closed ideal switch is just a piece of metal joining TP2 and TP3.', 'Un interruptor ideal cerrado es solo un trozo de metal que une TP2 y TP3.'),
      meaning: T('Both sides of a closed ideal switch are the same node, so the difference is 0 V — even though current is flowing through it. A real switch would show a very small drop.', 'Ambos lados de un interruptor ideal cerrado son el mismo nodo, así que la diferencia es 0 V, aunque circule corriente por él. Un interruptor real mostraría una caída muy pequeña.'),
      predict: predV(1, o9),
    }),
    measStep('bat_o', {
      labels: TP, pair: ['tp1', 'tp6'], focus: 'lamp9', expect: '9.00 V', cond: open9,
      pre: T('First click the switch to open it (the lamp goes off).', 'Primero haz clic en el interruptor para abrirlo (la lámpara se apaga).'),
      demoPre: [['switch', 'lamp9', false]],
      record: T('Battery — switch open', 'Batería: interruptor abierto'),
      title: T('Across the battery (switch open)', 'Entre los terminales de la batería (abierto)'),
      goal: T('Check the battery again with the lamp off.', 'Revisar la batería otra vez con la lámpara apagada.'),
      why: T('Opening the switch stops the current. Does the battery voltage disappear?', 'Abrir el interruptor detiene la corriente. ¿Desaparece el voltaje de la batería?'),
      meaning: T('The battery still has 9 V across it. Voltage does not need current to exist.', 'La batería sigue teniendo 9 V. El voltaje no necesita corriente para existir.'),
      predict: predV(0, o9),
    }),
    measStep('lamp_o', {
      labels: TP, pair: ['tp4', 'tp5'], focus: 'lamp9', expect: '0.000 V', cond: open9,
      record: T('Lamp — switch open', 'Lámpara: interruptor abierto'),
      title: T('Across the lamp (switch open)', 'Entre los extremos de la lámpara (abierto)'),
      goal: T('Find the voltage across the lamp while it is off.', 'Hallar el voltaje de la lámpara mientras está apagada.'),
      why: T('The lamp is intact but no current flows through it.', 'La lámpara está intacta pero no circula corriente por ella.'),
      meaning: T('With no current, nothing pushes charge through the lamp, so both of its sides sit at the same potential: 0 V across it. This zero does not mean the circuit is unpowered — the battery is still there.', 'Sin corriente, nada empuja carga a través de la lámpara, así que sus dos lados quedan al mismo potencial: 0 V entre sus extremos. Este cero no significa que el circuito esté sin energía: la batería sigue ahí.'),
      predict: predV(1, o9),
    }),
    measStep('sw_o', {
      labels: TP, pair: ['tp2', 'tp3'], focus: 'lamp9', expect: '9.00 V', cond: open9,
      record: T('Switch — switch open', 'Interruptor: abierto'),
      title: T('Across the open switch', 'Entre los extremos del interruptor abierto'),
      goal: T('Find the voltage across the switch while it is open.', 'Hallar el voltaje del interruptor mientras está abierto.'),
      why: T('This is the result that surprises most beginners.', 'Este es el resultado que sorprende a la mayoría de los principiantes.'),
      meaning: T('TP2 is still joined to battery +. TP3 is joined through the unlit lamp to battery −. So the full 9 V appears across the gap in the switch, although no current flows around the loop.', 'TP2 sigue unido al + de la batería. TP3 está unido, a través de la lámpara apagada, al − de la batería. Por eso los 9 V completos aparecen en el hueco del interruptor, aunque no circule corriente por el lazo.'),
      predict: predV(0, o9),
    }),
    {
      id: 'qopen', kind: 'quiz', focus: 'lamp9',
      title: T('Check: the open switch', 'Comprobación: el interruptor abierto'),
      goal: T('Explain the 9 V across the open switch.', 'Explicar los 9 V en el interruptor abierto.'),
      why: T('If you can explain this, you understand voltage as a difference between two points.', 'Si puedes explicar esto, entiendes el voltaje como diferencia entre dos puntos.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('Why can an open switch have 9 V across it when no current flows?', '¿Por qué un interruptor abierto puede tener 9 V entre sus extremos si no circula corriente?'),
        opts: [
          T('One side is still connected to battery + and the other side, through the lamp, to battery −', 'Un lado sigue conectado al + de la batería y el otro, a través de la lámpara, al − de la batería'),
          T('Current is secretly flowing through the open switch', 'La corriente circula en secreto por el interruptor abierto'),
          T('The meter is adding its own 9 V', 'El medidor añade sus propios 9 V'),
        ],
        correct: 0,
        explain: T('The gap in the switch is the one place where the two sides of the battery face each other, so the whole battery voltage shows up there. Results in this lesson are idealized.', 'El hueco del interruptor es el único lugar donde los dos lados de la batería quedan frente a frente, así que ahí aparece todo el voltaje de la batería. Los resultados de esta lección son ideales.'),
      },
    },
    removeStep('remove', 'lamp9'),
    offStep('off'),
    summary('sum', [
      T('Closed (ideal): battery 9 V, lamp 9 V, switch 0 V. Open: battery 9 V, lamp 0 V, switch 9 V.', 'Cerrado (ideal): batería 9 V, lámpara 9 V, interruptor 0 V. Abierto: batería 9 V, lámpara 0 V, interruptor 9 V.'),
      T('An open switch can have full voltage across it with no current flowing.', 'Un interruptor abierto puede tener el voltaje completo entre sus extremos sin que circule corriente.'),
      T('These values are idealized; real wiring and parts add small voltage drops.', 'Estos valores son ideales; el cableado y las piezas reales añaden pequeñas caídas de voltaje.'),
      SEQ_POINTS.zero]),
  ],
};

// ===========================================================================
// Lesson 6 — Introductory AC measurement
// ===========================================================================
const AC = { ac1: 'AC 1', ac2: 'AC 2' };
const L6 = {
  id: 'l6', minutes: 11, diagram: 'ac12',
  title: T('Introductory AC measurement', 'Introducción a la medición de CA'),
  blurb: T('DC versus AC, RMS, and what a wrong AC/DC setting does — on a simulated 12 V source only.', 'CC frente a CA, RMS y qué pasa con un ajuste CA/CC equivocado, solo en una fuente simulada de 12 V.'),
  init: (sim) => sim.reset(),
  steps: [
    {
      id: 'dcac', kind: 'quiz', focus: 'ac12', diagram: 'wave',
      title: T('DC and AC', 'CC y CA'),
      goal: T('Tell DC and AC apart.', 'Distinguir CC y CA.'),
      why: T('DC (direct current) keeps the same polarity: + stays +. AC (alternating current) periodically reverses polarity: the two terminals keep swapping which one is higher, many times per second.', 'La CC (corriente continua) mantiene la misma polaridad: + sigue siendo +. La CA (corriente alterna) invierte la polaridad periódicamente: los dos terminales intercambian cuál es el más alto muchas veces por segundo.'),
      action: T('Watch the two moving traces, then choose the best answer.', 'Observa los dos trazos en movimiento y elige la mejor respuesta.'),
      quiz: {
        q: T('Which trace is AC?', '¿Qué trazo es CA?'),
        opts: [
          T('The wave that swings above and below the zero line', 'La onda que oscila por encima y por debajo de la línea de cero'),
          T('The flat line that stays above zero', 'La línea plana que permanece sobre cero'),
        ],
        correct: 0,
        explain: T('Above the line one terminal is higher; below it the other one is. That repeated reversal is what “alternating” means. This lesson uses only the simulated, isolated 12 V AC training source — never a wall outlet.', 'Sobre la línea un terminal es el más alto; debajo lo es el otro. Esa inversión repetida es lo que significa «alterna». Esta lección usa solo la fuente de práctica de 12 V CA simulada y aislada, nunca un tomacorriente.'),
      },
    },
    {
      id: 'rms', kind: 'quiz', focus: 'ac12', diagram: 'wave',
      title: T('RMS: the effective value', 'RMS: el valor eficaz'),
      goal: T('Understand the single number a meter shows for AC.', 'Entender el único número que un medidor muestra para CA.'),
      why: T('An AC voltage changes all the time, so the meter reports its RMS value: the effective value — the steady DC voltage that would heat a lamp filament just as much. The wave’s peak is higher than its RMS value.', 'Un voltaje de CA cambia todo el tiempo, así que el medidor informa su valor RMS: el valor eficaz, es decir, el voltaje de CC constante que calentaría igual el filamento de una lámpara. El pico de la onda es mayor que su valor RMS.'),
      action: T('Look at the RMS line and the peak marker on the wave, then answer.', 'Mira la línea RMS y la marca de pico en la onda y responde.'),
      quiz: {
        q: T('The source is a sine wave of 12 V RMS. How high is its peak?', 'La fuente es una onda senoidal de 12 V RMS. ¿Cuánto vale su pico?'),
        opts: [T('About 17 V — higher than the RMS value', 'Unos 17 V: mayor que el valor RMS'), T('Exactly 12 V — peak and RMS are the same', 'Exactamente 12 V: pico y RMS son iguales'), T('About 6 V', 'Unos 6 V')],
        correct: 0,
        explain: T('For a sine wave the peak is about 1.41 times the RMS value: 12 V RMS peaks near 17 V. Never read an RMS number as the peak.', 'En una onda senoidal el pico es unas 1,41 veces el valor RMS: 12 V RMS alcanzan picos de unos 17 V. Nunca leas un número RMS como si fuera el pico.'),
      },
    },
    setupStep('setup', { dial: 'VAC', points: ['ac1', 'ac2'], labels: AC, diagram: 'ac12' }),
    {
      id: 'mac', kind: 'do', focus: 'ac12', hi: ['term:ac1', 'term:ac2'], pair: ['ac1', 'ac2'],
      title: T('Measure 12 V AC', 'Medir 12 V CA'),
      goal: T('Measure the AC training source in the correct mode.', 'Medir la fuente de práctica de CA en el modo correcto.'),
      why: T('For AC voltage the selector must be on V~. Black still goes on first.', 'Para voltaje de CA el selector debe estar en V~. La negra sigue colocándose primero.'),
      action: T('Touch black to AC 2 and red to AC 1.', 'Toca AC 2 con la negra y AC 1 con la roja.'),
      observe: T('About 12.00 V with “AC” on the display and no polarity sign.', 'Unos 12.00 V con «AC» en la pantalla y sin signo de polaridad.'),
      meaning: T('The meter shows the RMS value of the simulated sine wave. Because the polarity keeps reversing, an AC reading has no plus or minus.', 'El medidor muestra el valor RMS de la onda senoidal simulada. Como la polaridad se invierte continuamente, una lectura de CA no tiene signo.'),
      check: (sim) => pairOn(sim, 'ac1', 'ac2') && meas(sim) && st(sim).dial === 'VAC',
      demo: [['touch', 'black', 'ac2'], ['touch', 'red', 'ac1'], ['wait', 1700]],
    },
    {
      id: 'mismatch', kind: 'do', focus: 'ac12', hi: ['dialpos:VDC'], expect: ['mode_mismatch'],
      title: T('The wrong setting on purpose', 'El ajuste equivocado, a propósito'),
      goal: T('See what an AC/DC mismatch looks like, so you can recognize it.', 'Ver cómo se ve un desajuste CA/CC para poder reconocerlo.'),
      why: T('Measuring an AC source on V⎓ (or a DC source on V~) is a very common slip.', 'Medir una fuente de CA en V⎓ (o una de CC en V~) es un descuido muy común.'),
      action: T('Remove red, then black. Turn the selector to V⎓ and confirm the function in the check list. Then touch black to AC 2 and red to AC 1 again.', 'Retira la roja y luego la negra. Gira el selector a V⎓ y confirma la función en la lista. Luego vuelve a tocar AC 2 con la negra y AC 1 con la roja.'),
      observe: T('This simulated meter shows about 0.000 V and the coach flags an AC/DC mismatch — expected here.', 'Este medidor simulado muestra unos 0.000 V y el instructor señala un desajuste CA/CC; aquí es lo esperado.'),
      meaning: T('The source is still delivering 12 V AC — the number is misleading. Real meters do not all show the same thing in the wrong mode. A near-zero display never proves that voltage is absent.', 'La fuente sigue entregando 12 V CA: el número es engañoso. No todos los medidores reales muestran lo mismo en el modo equivocado. Una pantalla cercana a cero nunca demuestra que no haya voltaje.'),
      subs: [
        { label: T('Selector on V⎓', 'Selector en V⎓'), ok: (sim) => st(sim).dial === 'VDC' },
        { label: T('Probes back on AC 1 and AC 2, reading steady', 'Puntas de nuevo en AC 1 y AC 2, lectura estable'), ok: (sim) => pairOn(sim, 'ac1', 'ac2') && meas(sim) && st(sim).dial === 'VDC' },
      ],
      demo: [['lift', 'red'], ['lift', 'black'], ['dial', 'VDC'], ['confirm', 'func'], ['touch', 'black', 'ac2'], ['touch', 'red', 'ac1'], ['wait', 2000]],
    },
    {
      id: 'fix', kind: 'do', focus: 'ac12', hi: ['dialpos:VAC'],
      title: T('Correct the setting', 'Corregir el ajuste'),
      goal: T('Put the mistake right and measure properly.', 'Corregir el error y medir correctamente.'),
      why: T('The function may only be changed with the probes off the circuit.', 'La función solo puede cambiarse con las puntas fuera del circuito.'),
      action: T('Remove red, then black. Turn the selector to V~, confirm the function, and measure AC 1 to AC 2 again.', 'Retira la roja y luego la negra. Gira el selector a V~, confirma la función y vuelve a medir entre AC 1 y AC 2.'),
      observe: T('About 12.00 V AC again.', 'De nuevo unos 12.00 V CA.'),
      meaning: T('Checking the mode on the display before trusting a number is part of every measurement.', 'Comprobar el modo en la pantalla antes de fiarte de un número forma parte de toda medición.'),
      check: (sim) => pairOn(sim, 'ac1', 'ac2') && meas(sim) && st(sim).dial === 'VAC',
      demo: [['lift', 'red'], ['lift', 'black'], ['dial', 'VAC'], ['confirm', 'func'], ['touch', 'black', 'ac2'], ['touch', 'red', 'ac1'], ['wait', 1700]],
    },
    removeStep('remove', 'ac12'),
    offStep('off'),
    summary('sum', [
      T('DC keeps its polarity; AC periodically reverses it.', 'La CC mantiene su polaridad; la CA la invierte periódicamente.'),
      T('V~ shows RMS, the effective value. The peak of a sine wave is higher (12 V RMS ≈ 17 V peak).', 'V~ muestra el RMS, el valor eficaz. El pico de una onda senoidal es mayor (12 V RMS ≈ 17 V de pico).'),
      T('A wrong AC/DC setting gives a misleading number, and real meters differ in what they show.', 'Un ajuste CA/CC equivocado da un número engañoso, y los medidores reales difieren en lo que muestran.'),
      SEQ_POINTS.zero]),
  ],
};

// ===========================================================================
// Lesson 7 — Connection to industrial controls
// ===========================================================================
const X = { x1: 'X1 (+24 V)', x2: 'X2 (0 V)', x3: 'X3', x4: 'X4', x5: 'X5', x6: 'X6' };
const s1closed = (sim) => st(sim).switches.panel24;
const healthy = (sim) => s1closed(sim) && !st(sim).faults.w2open;
const faulty = (sim) => s1closed(sim) && st(sim).faults.w2open;
const L7 = {
  id: 'l7', minutes: 15, diagram: 'panel24',
  title: T('Connection to industrial controls', 'Relación con controles industriales'),
  blurb: T('A virtual 24 V DC training panel: a healthy circuit, then an open-wire fault found by evidence.', 'Un panel virtual de práctica de 24 V CC: un circuito sano y luego una falla de cable abierto hallada con evidencia.'),
  init: (sim) => sim.reset(),
  steps: [
    {
      id: 'intro', kind: 'quiz', focus: 'panel24',
      title: T('The 24 V training panel', 'El panel de práctica de 24 V'),
      goal: T('Understand what this panel is and what “0 V” means on it.', 'Entender qué es este panel y qué significa «0 V» en él.'),
      why: T('Many control circuits run on 24 V DC. This panel is completely virtual, isolated and current-limited: a +24 V terminal, a 0 V terminal, a switch S1 and an indicator lamp H1. 0 V is the point this circuit’s designer chose as the reference for its voltages.', 'Muchos circuitos de control funcionan con 24 V CC. Este panel es totalmente virtual, aislado y con corriente limitada: un terminal +24 V, un terminal 0 V, un interruptor S1 y una lámpara indicadora H1. 0 V es el punto que el diseñador de este circuito eligió como referencia de sus voltajes.'),
      action: T('Choose the best answer.', 'Elige la mejor respuesta.'),
      quiz: {
        q: T('On this panel, what is the terminal marked 0 V?', 'En este panel, ¿qué es el terminal marcado 0 V?'),
        opts: [
          T('The chosen circuit reference — not automatically protective earth', 'La referencia elegida del circuito; no es automáticamente la tierra de protección'),
          T('Always the same thing as protective earth', 'Siempre lo mismo que la tierra de protección'),
          T('A terminal that can never have voltage on it relative to anything', 'Un terminal que nunca puede tener voltaje respecto a nada'),
        ],
        correct: 0,
        explain: T('“0 V” only means “we call this point zero”. Whether it is also connected to protective earth depends on the installation and its drawings. This lesson stays on the simulated panel — it is not a guide to opening real industrial equipment.', '«0 V» solo significa «a este punto lo llamamos cero». Que además esté conectado a la tierra de protección depende de la instalación y de sus planos. Esta lección se queda en el panel simulado; no es una guía para abrir equipos industriales reales.'),
      },
    },
    {
      id: 'close', kind: 'do', focus: 'panel24', hi: ['switch:panel24'],
      title: T('Switch the circuit on', 'Encender el circuito'),
      goal: T('See the healthy circuit working.', 'Ver funcionar el circuito sano.'),
      why: T('Troubleshooting starts with knowing what “normal” looks like.', 'El diagnóstico empieza por saber cómo se ve lo «normal».'),
      action: T('Click switch S1 on the 24 V panel to close it.', 'Haz clic en el interruptor S1 del panel de 24 V para cerrarlo.'),
      observe: T('S1 shows CLOSED and lamp H1 shows LAMP ON.', 'S1 muestra CERRADO y la lámpara H1 muestra LÁMPARA ENCENDIDA.'),
      meaning: T('Current path: +24 V (X1) → X3 → S1 → X4 → wire W2 → X5 → lamp H1 → X6 → 0 V (X2).', 'Camino de la corriente: +24 V (X1) → X3 → S1 → X4 → cable W2 → X5 → lámpara H1 → X6 → 0 V (X2).'),
      check: s1closed,
      demo: [['switch', 'panel24', true]],
    },
    setupStep('setup', { dial: 'VDC', ranges: ['AUTO', 200], points: ['x1', 'x2'], labels: X }),
    measStep('h_sup', {
      labels: X, pair: ['x1', 'x2'], focus: 'panel24', expect: '24.0 V', cond: healthy,
      record: T('Healthy — supply X1 to X2', 'Sano: alimentación X1 a X2'),
      title: T('Healthy: check the supply', 'Sano: revisar la alimentación'),
      goal: T('Step 1 and 2 of the sequence: predict, then check the supply across +24 V and 0 V.', 'Pasos 1 y 2 de la secuencia: predecir y luego revisar la alimentación entre +24 V y 0 V.'),
      why: T('If the supply is missing, nothing downstream can work — so it is always checked first.', 'Si falta la alimentación, nada de lo que sigue puede funcionar; por eso siempre se revisa primero.'),
      meaning: T('The supply is present. On AUTO the meter uses its 200 V range, so you see one decimal place.', 'La alimentación está presente. En AUTO el medidor usa su rango de 200 V, así que ves un decimal.'),
      predict: predV(0, o24),
    }),
    measStep('h_out', {
      labels: X, pair: ['x4', 'x2'], focus: 'panel24', expect: '24.0 V', cond: healthy,
      record: T('Healthy — switched output X4 to 0 V', 'Sano: salida conmutada X4 a 0 V'),
      title: T('Healthy: switched output to 0 V', 'Sano: salida conmutada respecto a 0 V'),
      goal: T('Step 3: measure the switched output (X4) relative to 0 V.', 'Paso 3: medir la salida conmutada (X4) respecto a 0 V.'),
      why: T('“Relative to 0 V” means the black probe stays on the 0 V reference while the red probe visits the point of interest.', '«Respecto a 0 V» significa que la punta negra se queda en la referencia de 0 V mientras la roja visita el punto de interés.'),
      meaning: T('With S1 closed, 24 V reaches the output side of the switch.', 'Con S1 cerrado, los 24 V llegan al lado de salida del interruptor.'),
      predict: predV(0, o24),
    }),
    measStep('h_lamp', {
      labels: X, pair: ['x5', 'x6'], focus: 'panel24', expect: '24.0 V', cond: healthy,
      record: T('Healthy — across lamp X5 to X6', 'Sano: lámpara X5 a X6'),
      title: T('Healthy: across the lamp', 'Sano: entre los extremos de la lámpara'),
      goal: T('Step 4: measure across the lamp.', 'Paso 4: medir entre los extremos de la lámpara.'),
      why: T('The lamp lights only when voltage actually reaches both of its terminals.', 'La lámpara enciende solo cuando el voltaje llega de verdad a sus dos terminales.'),
      meaning: T('Step 5: compared with the diagram, every reading matches a healthy circuit — 24 V supply, 24 V at the switched output, 24 V across the lamp, lamp on.', 'Paso 5: comparadas con el diagrama, todas las lecturas corresponden a un circuito sano: 24 V de alimentación, 24 V en la salida conmutada, 24 V en la lámpara, lámpara encendida.'),
      predict: predV(0, o24),
    }),
    {
      id: 'fault', kind: 'ack', focus: 'panel24',
      title: T('A fault appears', 'Aparece una falla'),
      goal: T('Start a fault-finding task the right way.', 'Empezar bien una tarea de búsqueda de fallas.'),
      why: T('The instructor has put one fault into the virtual panel. S1 is closed but lamp H1 stays off. Guessing (“must be the lamp”) is how wrong parts get replaced.', 'El instructor introdujo una falla en el panel virtual. S1 está cerrado pero la lámpara H1 sigue apagada. Adivinar («debe ser la lámpara») es la forma de cambiar piezas equivocadas.'),
      action: T('Look at the panel and the diagram: S1 CLOSED, LAMP OFF. Then press Continue and repeat the same three measurements.', 'Mira el panel y el diagrama: S1 CERRADO, LÁMPARA APAGADA. Luego pulsa Continuar y repite las mismas tres mediciones.'),
      observe: T('The probes have been put down for you, and the lamp is off.', 'Las puntas se dejaron en reposo y la lámpara está apagada.'),
      meaning: T('You will collect evidence first and name the fault last.', 'Primero reunirás evidencia y al final nombrarás la falla.'),
      setup: (sim) => sim.setup({ probes: { red: null, black: null }, near: { red: null, black: null }, faults: { w2open: true }, faultRevealed: false, switches: { panel24: true }, intended: [] }),
    },
    measStep('f_sup', {
      labels: X, pair: ['x1', 'x2'], focus: 'panel24', expect: '24.0 V', cond: faulty,
      record: T('Fault — supply X1 to X2', 'Falla: alimentación X1 a X2'),
      title: T('Fault: check the supply', 'Falla: revisar la alimentación'),
      goal: T('Check the supply across +24 V and 0 V.', 'Revisar la alimentación entre +24 V y 0 V.'),
      why: T('Predict what a healthy circuit would show here, then compare.', 'Predice lo que mostraría aquí un circuito sano y compara.'),
      meaning: T('The supply is fine, so the problem lies somewhere after it.', 'La alimentación está bien, así que el problema está en algún punto posterior.'),
      predict: { q: T('What would a healthy circuit show here?', '¿Qué mostraría aquí un circuito sano?'), opts: o24, correct: 0 },
    }),
    measStep('f_out', {
      labels: X, pair: ['x4', 'x2'], focus: 'panel24', expect: '24.0 V', cond: faulty,
      record: T('Fault — switched output X4 to 0 V', 'Falla: salida conmutada X4 a 0 V'),
      title: T('Fault: switched output to 0 V', 'Falla: salida conmutada respecto a 0 V'),
      goal: T('Measure the switched output (X4) relative to 0 V.', 'Medir la salida conmutada (X4) respecto a 0 V.'),
      why: T('This tells you whether the switch is passing the supply on.', 'Esto te dice si el interruptor está dejando pasar la alimentación.'),
      meaning: T('24 V arrives at X4, so the switch is doing its job.', 'Llegan 24 V a X4, así que el interruptor cumple su función.'),
      predict: { q: T('What would a healthy circuit show here?', '¿Qué mostraría aquí un circuito sano?'), opts: o24, correct: 0 },
    }),
    measStep('f_lamp', {
      labels: X, pair: ['x5', 'x6'], focus: 'panel24', expect: '0.000 V', cond: faulty,
      record: T('Fault — across lamp X5 to X6', 'Falla: lámpara X5 a X6'),
      title: T('Fault: across the lamp', 'Falla: entre los extremos de la lámpara'),
      goal: T('Measure across the lamp.', 'Medir entre los extremos de la lámpara.'),
      why: T('A healthy circuit shows 24 V here. A different reading is evidence.', 'Un circuito sano muestra 24 V aquí. Una lectura distinta es evidencia.'),
      meaning: T('About 0 V: the lamp is not receiving voltage. On its own this reading does not say why — an open switch, a missing supply or a broken wire would all look like this.', 'Unos 0 V: la lámpara no recibe voltaje. Por sí sola esta lectura no dice por qué: un interruptor abierto, la falta de alimentación o un cable roto se verían igual.'),
      predict: { q: T('What would a healthy circuit show here?', '¿Qué mostraría aquí un circuito sano?'), opts: o24, correct: 0 },
    }),
    measStep('f_x5', {
      labels: X, pair: ['x5', 'x2'], focus: 'panel24', expect: '0.000 V', cond: faulty,
      record: T('Fault — lamp input X5 to 0 V', 'Falla: entrada de lámpara X5 a 0 V'),
      title: T('Fault: where does the voltage stop?', 'Falla: ¿dónde se detiene el voltaje?'),
      goal: T('Find out whether 24 V reaches the lamp’s input terminal X5.', 'Averiguar si los 24 V llegan al terminal de entrada X5 de la lámpara.'),
      why: T('X4 has 24 V. On the diagram, X4 and X5 are joined by wire W2, so a healthy X5 must show the same.', 'X4 tiene 24 V. En el diagrama, X4 y X5 están unidos por el cable W2, así que un X5 sano debe mostrar lo mismo.'),
      meaning: T('24 V at X4 but about 0 V at X5: the voltage is lost between two points the diagram says are joined.', '24 V en X4 pero unos 0 V en X5: el voltaje se pierde entre dos puntos que el diagrama dice que están unidos.'),
      predict: { q: T('What would a healthy circuit show here?', '¿Qué mostraría aquí un circuito sano?'), opts: o24, correct: 0 },
    }),
    {
      id: 'diagnose', kind: 'quiz', focus: 'panel24',
      title: T('Explain the evidence, then name the fault', 'Explicar la evidencia y luego nombrar la falla'),
      goal: T('Step 6: explain the evidence before naming a fault.', 'Paso 6: explicar la evidencia antes de nombrar una falla.'),
      why: T('Your readings: supply 24 V · X4 to 0 V 24 V · across lamp 0 V · X5 to 0 V 0 V.', 'Tus lecturas: alimentación 24 V · X4 a 0 V 24 V · lámpara 0 V · X5 a 0 V 0 V.'),
      action: T('Choose the conclusion that the evidence supports.', 'Elige la conclusión que la evidencia respalda.'),
      quiz: {
        q: T('Which conclusion fits all four readings and the diagram?', '¿Qué conclusión concuerda con las cuatro lecturas y el diagrama?'),
        opts: [
          T('There is an open in the connection between X4 and X5 (wire W2 or its terminals)', 'Hay una interrupción en la conexión entre X4 y X5 (el cable W2 o sus terminales)'),
          T('The lamp is burnt out, because it has 0 V across it', 'La lámpara está fundida, porque tiene 0 V entre sus extremos'),
          T('The 24 V supply has failed', 'La alimentación de 24 V falló'),
          T('Switch S1 is not closing', 'El interruptor S1 no cierra'),
        ],
        correct: 0,
        explain: T('24 V is present at X4 and absent at X5, and only W2 lies between them. A burnt-out lamp would be an open lamp with 24 V across it, not 0 V. One reading never proves one specific failed part — the chain of readings does.', 'Hay 24 V en X4 y no en X5, y entre ambos solo está W2. Una lámpara fundida sería una lámpara abierta con 24 V entre sus extremos, no 0 V. Una sola lectura nunca demuestra una pieza concreta averiada; la cadena de lecturas sí.'),
        onCorrect: (sim) => sim.setup({ faultRevealed: true }),
      },
    },
    removeStep('remove', 'panel24'),
    offStep('off'),
    summary('sum', [
      T('Predict → check supply → switched output relative to 0 V → across the load → compare with the diagram → explain the evidence before naming a fault.', 'Predecir → revisar alimentación → salida conmutada respecto a 0 V → entre los extremos de la carga → comparar con el diagrama → explicar la evidencia antes de nombrar una falla.'),
      T('0 V is the chosen circuit reference, not automatically protective earth.', '0 V es la referencia elegida del circuito, no automáticamente la tierra de protección.'),
      T('One voltage reading never proves that one specific component has failed.', 'Una sola lectura de voltaje nunca demuestra que un componente concreto haya fallado.'),
      SEQ_POINTS.qualify]),
  ],
};

export const LESSONS = [L0, L1, L2, L3, L4, L5, L6, L7];
export const helpers = { on, pairOn, parked, meas, intendedIs, READY };
