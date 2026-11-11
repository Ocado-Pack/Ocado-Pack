// Language support (English / Spanish) and all non-lesson text.

export const T = (en, es) => ({ en, es });

let lang = 'en';
export const getLang = () => lang;
export const setLang = (l) => { lang = l === 'es' ? 'es' : 'en'; };

const DC_SVG = '<svg class="dcs" viewBox="0 0 14 10" aria-hidden="true"><path d="M1 3h12" /><path d="M1 7h2.6M5.7 7h2.6M10.4 7H13" /></svg>';

// Plain string in the current language.
export function tr(o, vars) {
  if (o == null) return '';
  let s = typeof o === 'string' ? o : (o[lang] ?? o.en);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
// HTML version: the DC symbol is drawn so it never depends on a font glyph.
export function h(o, vars) { return tr(o, vars).replace(/⎓/g, DC_SVG); }
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Text prepared for speech synthesis.
export function spoken(o, vars) {
  const es = lang === 'es';
  return tr(o, vars)
    .replace(/<[^>]+>/g, ' ')
    .replace(/V⎓/g, es ? 'voltaje de corriente continua' : 'D C volts')
    .replace(/V~/g, es ? 'voltaje de corriente alterna' : 'A C volts')
    .replace(/V\/Ω|VΩ/g, es ? 'V ohmios' : 'V ohms')
    .replace(/Ω/g, es ? 'ohmios' : 'ohms')
    .replace(/−/g, es ? ' menos ' : ' minus ')
    .replace(/→/g, es ? ', luego ' : ', then ')
    .replace(/≈/g, es ? 'aproximadamente ' : 'about ')
    .replace(/\s+/g, ' ');
}

export const UI = {
  appTitle: T('Voltage Lab', 'Laboratorio de Voltaje'),
  appSub: T('From Zero to Confident Measurements', 'De cero a mediciones con confianza'),
  simBadge: T('Simulation only', 'Solo simulación'),
  mode: T('Mode', 'Modo'),
  guided: T('Guided', 'Guiado'),
  practice: T('Practice', 'Práctica'),
  assessment: T('Assessment', 'Evaluación'),
  language: T('Language', 'Idioma'),
  narration: T('Narration', 'Narración'),
  captions: T('Captions', 'Subtítulos'),
  on: T('on', 'sí'),
  off: T('off', 'no'),
  help: T('Help', 'Ayuda'),
  lesson: T('Lesson', 'Lección'),
  step: T('Step', 'Paso'),
  of: T('of', 'de'),
  estTime: T('about {n} min', 'unos {n} min'),
  elapsed: T('elapsed', 'transcurrido'),
  goal: T('Goal', 'Objetivo'),
  why: T('Why', 'Por qué'),
  action: T('Action', 'Acción'),
  observe: T('Observation', 'Observación'),
  meaning: T('Meaning', 'Significado'),
  showMe: T('Show me', 'Muéstrame'),
  letMeTry: T('Let me try', 'Déjame intentar'),
  explainAgain: T('Explain again', 'Explícalo otra vez'),
  reset: T('Reset', 'Reiniciar'),
  back: T('Back', 'Atrás'),
  next: T('Next', 'Siguiente'),
  cont: T('Continue', 'Continuar'),
  finish: T('Finish lesson', 'Terminar lección'),
  nextLesson: T('Next lesson', 'Siguiente lección'),
  restartLesson: T('Restart lesson', 'Reiniciar lección'),
  hint: T('Hint', 'Pista'),
  explain: T('Explain', 'Explicar'),
  stepDone: T('Done — your setup matches this step.', 'Hecho: tu configuración coincide con este paso.'),
  stepWaiting: T('Waiting for your action…', 'Esperando tu acción…'),
  demoRunning: T('Demonstration running…', 'Demostración en curso…'),
  demoDone: T('Demonstrated. Press “Let me try” to do it yourself, or Next.', 'Demostrado. Pulsa «Déjame intentar» para hacerlo tú, o Siguiente.'),
  inShort: T('In short', 'En resumen'),
  youShouldSee: T('You should see', 'Deberías ver'),
  predictFirst: T('Predict first', 'Primero predice'),
  yourPrediction: T('Your prediction', 'Tu predicción'),
  predRight: T('Your prediction matched.', 'Tu predicción coincidió.'),
  predWrong: T('Not what you predicted — that is fine. Compare it with the explanation.', 'No fue lo que predijiste; no pasa nada. Compáralo con la explicación.'),
  correct: T('Correct.', 'Correcto.'),
  notQuite: T('Not quite.', 'No del todo.'),
  tryAgain: T('Try again', 'Intenta de nuevo'),
  submit: T('Submit', 'Enviar'),
  check: T('Check', 'Comprobar'),
  retry: T('Retry', 'Reintentar'),
  dismiss: T('Close', 'Cerrar'),
  yourTurn: T('Your turn — no highlights this time', 'Tu turno: esta vez sin resaltados'),
  procedure: T('Procedure', 'Procedimiento'),
  results: T('Results so far', 'Resultados hasta ahora'),
  measuring: T('Measuring', 'Midiendo'),
  wrongPair: T('The probes are on {a} and {b}. This step needs {want}.', 'Las puntas están en {a} y {b}. Este paso necesita {want}.'),
  sequenceTitle: T('Remember the sequence', 'Recuerda la secuencia'),
  sequence: T(
    'Inspect → Connect leads correctly → Select voltage mode and range → Identify two points → Measure → Interpret → Disconnect.',
    'Inspeccionar → Conectar bien los cables → Elegir modo de voltaje y rango → Identificar dos puntos → Medir → Interpretar → Desconectar.'),
  takeaways: T('Key points', 'Puntos clave'),
  lessonComplete: T('Lesson complete', 'Lección completada'),
  // meter readout
  meterTitle: T('Meter reading', 'Lectura del medidor'),
  meterOff: T('Meter is OFF', 'Medidor APAGADO'),
  statusTitle: T('Connection status', 'Estado de la conexión'),
  rangeAuto: T('AUTO', 'AUTO'),
  rangeManual: T('MANUAL', 'MANUAL'),
  holdOn: T('HOLD — frozen, not live', 'HOLD: congelado, no en vivo'),
  stOff: T('Meter is off. No measurement.', 'El medidor está apagado. No hay medición.'),
  stNotV: T('The dial is not on a voltage function. These lessons only measure voltage.', 'El selector no está en una función de voltaje. Estas lecciones solo miden voltaje.'),
  stLeads: T('Leads are not plugged into COM and V/Ω. No measurement.', 'Los cables no están en COM y V/Ω. No hay medición.'),
  stOpenBoth: T('No valid two-point measurement: neither probe is touching a test point. Any number shown is not a measurement.', 'No hay medición válida entre dos puntos: ninguna punta toca un punto de prueba. Cualquier número mostrado no es una medición.'),
  stOpenOne: T('No valid two-point measurement: the {lead} probe is not touching a test point. The number shown is stray pickup, not a measurement.', 'No hay medición válida entre dos puntos: la punta {lead} no toca un punto de prueba. El número mostrado es ruido captado, no una medición.'),
  stSeparate: T('The probes are on two separate, isolated circuits. There is no defined voltage between them.', 'Las puntas están en dos circuitos separados y aislados. No hay un voltaje definido entre ellos.'),
  stValid: T('Two-point contact: RED on {r}, BLACK on {b}.', 'Contacto en dos puntos: ROJA en {r}, NEGRA en {b}.'),
  stSettling: T('Reading is settling…', 'La lectura se está estabilizando…'),
  stSettled: T('Reading is steady.', 'La lectura es estable.'),
  stMismatch: T('Warning: AC/DC setting does not match this source — the number is misleading.', 'Aviso: el ajuste CA/CC no corresponde a esta fuente; el número es engañoso.'),
  stSameNode: T('Both probes are on the same node.', 'Ambas puntas están en el mismo nodo.'),
  stOver: T('Overrange: the selected range is too small.', 'Sobrerrango: el rango elegido es demasiado pequeño.'),
  stHoldStale: T('HOLD is on: the display is an old value, not the present reading.', 'HOLD está activo: la pantalla muestra un valor antiguo, no la lectura actual.'),
  red: T('red', 'roja'),
  black: T('black', 'negra'),
  RED: T('RED', 'ROJA'),
  BLACK: T('BLACK', 'NEGRA'),
  parked: T('parked', 'en reposo'),
  unplugged: T('unplugged', 'desconectado'),
  // checklist
  checklist: T('Pre-measurement check', 'Comprobación previa a la medición'),
  checklistNote: T('Probes cannot touch a circuit until every item is done.', 'Las puntas no pueden tocar un circuito hasta completar cada punto.'),
  ckInspect: T('Inspect meter and leads for damage', 'Inspeccionar medidor y cables en busca de daños'),
  ckJacks: T('Confirm the correct jacks', 'Confirmar los bornes correctos'),
  ckFunc: T('Confirm the measurement function', 'Confirmar la función de medición'),
  ckRange: T('Check the selected range', 'Revisar el rango elegido'),
  ckPoints: T('Identify the intended test points', 'Identificar los puntos de prueba previstos'),
  ckGuards: T('Fingers stay behind the probe guards', 'Los dedos quedan detrás de las guardas'),
  ckBridge: T('One tip touches one terminal — no bridging', 'Una punta toca un solo terminal: sin puentear'),
  done: T('Done', 'Hecho'),
  todo: T('To do', 'Pendiente'),
  confirm: T('Confirm', 'Confirmar'),
  inspect: T('Inspect', 'Inspeccionar'),
  meterBody: T('Meter', 'Medidor'),
  redLead: T('Red lead', 'Cable rojo'),
  blackLead: T('Black lead', 'Cable negro'),
  replaceLead: T('Replace damaged lead', 'Reemplazar cable dañado'),
  inspOK: T('{item}: no cracks, no exposed metal, insulation intact.', '{item}: sin grietas, sin metal expuesto, aislamiento intacto.'),
  inspBad: T('{item}: the insulation is nicked and metal shows through. Do not use it — replace it.', '{item}: el aislamiento está cortado y se ve el metal. No lo uses; reemplázalo.'),
  inspReplaced: T('{item} replaced with a good one and inspected.', '{item} reemplazado por uno en buen estado e inspeccionado.'),
  none: T('none yet', 'ninguno aún'),
  clear: T('Clear', 'Borrar'),
  nowIs: T('Now', 'Ahora'),
  // controls
  controls: T('Equipment controls (alternative to using the 3D view)', 'Controles del equipo (alternativa a la vista 3D)'),
  dial: T('Rotary selector', 'Selector giratorio'),
  range: T('Range', 'Rango'),
  hold: T('HOLD', 'HOLD'),
  leadsJacks: T('Lead plugs', 'Clavijas de los cables'),
  probes: T('Probes', 'Puntas de prueba'),
  pickUp: T('Pick up {c} probe (by the handle)', 'Tomar la punta {c} (por el mango)'),
  holding: T('Holding {c} probe — now choose a test point', 'Sosteniendo la punta {c}: ahora elige un punto de prueba'),
  park: T('Park {c} probe', 'Dejar la punta {c} en reposo'),
  testPoints: T('Test points', 'Puntos de prueba'),
  tpHelp: T('With no probe in hand, choosing a point marks it as an intended test point. With a probe in hand, choosing a point touches it with that probe.', 'Sin punta en la mano, elegir un punto lo marca como punto de prueba previsto. Con una punta en la mano, elegir un punto lo toca con esa punta.'),
  switches: T('Switches', 'Interruptores'),
  swLamp9: T('9 V lamp circuit switch', 'Interruptor del circuito de lámpara de 9 V'),
  swPanel: T('24 V panel switch S1', 'Interruptor S1 del panel de 24 V'),
  open: T('OPEN', 'ABIERTO'),
  closed: T('CLOSED', 'CERRADO'),
  lampOn: T('LAMP ON', 'LÁMPARA ENCENDIDA'),
  lampOff: T('LAMP OFF', 'LÁMPARA APAGADA'),
  intended: T('Identified points', 'Puntos identificados'),
  diagram: T('Circuit diagram', 'Diagrama del circuito'),
  diagramHelp: T('The same test points are marked here and on the bench. You can click them in either place.', 'Los mismos puntos de prueba están marcados aquí y en la mesa. Puedes hacer clic en cualquiera de los dos.'),
  glossary: T('Symbols and terms', 'Símbolos y términos'),
  // stage toolbar
  frontView: T('Front view', 'Vista frontal'),
  closeups: T('Close-up', 'Acercar'),
  vDisplay: T('Display', 'Pantalla'),
  vDial: T('Dial', 'Selector'),
  vJacks: T('Jacks', 'Bornes'),
  vTips: T('Probe tips', 'Puntas'),
  vBench: T('Circuit', 'Circuito'),
  zoomIn: T('Zoom in', 'Acercar'),
  zoomOut: T('Zoom out', 'Alejar'),
  stageHelp: T('Drag to rotate · scroll or pinch to zoom · drag a probe handle to a test point, or click a probe then a test point', 'Arrastra para girar · rueda o pellizco para zoom · arrastra el mango de una punta a un punto, o haz clic en la punta y luego en el punto'),
  selected: T('In hand', 'En la mano'),
  // 3D station titles
  stAA: T('AA battery 1.5 V', 'Pila AA 1,5 V'),
  stB9: T('9 V battery', 'Batería 9 V'),
  stLamp9: T('9 V lamp circuit (idealized)', 'Circuito de lámpara 9 V (ideal)'),
  stPanel: T('24 V DC training panel — simulated, isolated', 'Panel de práctica 24 V CC: simulado, aislado'),
  stAC: T('12 V AC training source — simulated, isolated', 'Fuente de práctica 12 V CA: simulada, aislada'),
  swLabel: T('SWITCH', 'INTERRUPTOR'),
  faultOpen: T('OPEN WIRE', 'CABLE ABIERTO'),
  damagedTag: T('NICK', 'CORTE'),
  // assessment
  asTitle: T('Assessment', 'Evaluación'),
  asIntro: T(
    'Ten tasks. No hints until you submit each one. Safety blocks stay active. Take your time: correct setup and reasoning count, speed does not.',
    'Diez tareas. Sin pistas hasta que envíes cada una. Los bloqueos de seguridad siguen activos. Tómate tu tiempo: cuentan la preparación y el razonamiento correctos, no la rapidez.'),
  asStart: T('Start assessment', 'Comenzar evaluación'),
  asTask: T('Task', 'Tarea'),
  asPass: T('Passed', 'Aprobada'),
  asFail: T('Not yet', 'Aún no'),
  asRetryTask: T('Retry this task', 'Reintentar esta tarea'),
  asNextTask: T('Next task', 'Siguiente tarea'),
  asReport: T('View report', 'Ver informe'),
  asFirstTry: T('Passed on first submission', 'Aprobada al primer envío'),
  asAfterRetry: T('Passed after correction', 'Aprobada tras corregir'),
  asNotPassed: T('Not passed yet', 'Aún no aprobada'),
  repTitle: T('Your report', 'Tu informe'),
  repSkills: T('Completed skills', 'Habilidades completadas'),
  repErrors: T('Errors corrected', 'Errores corregidos'),
  repNoErrors: T('No coaching events were recorded.', 'No se registraron eventos de corrección.'),
  repRepeat: T('Topics to repeat', 'Temas para repasar'),
  repNothing: T('Nothing stands out — well done.', 'Nada destaca: buen trabajo.'),
  repNext: T('Recommended next practice session', 'Siguiente sesión de práctica recomendada'),
  repBlocked: T('Before the report: correct these safety mistakes', 'Antes del informe: corrige estos errores de seguridad'),
  repBlockedHelp: T('Each critical safety mistake must be put right on the bench. Do the correction shown and this list clears itself.', 'Cada error crítico de seguridad debe corregirse en la mesa. Haz la corrección indicada y esta lista se vaciará sola.'),
  repCorrected: T('corrected', 'corregido'),
  repOpen: T('needs correction', 'requiere corrección'),
  repTimes: T('× {n}', '× {n}'),
  repDisclaimer: T(
    'Completing this simulation does not qualify you to work on energized electrical equipment. Real work needs training, supervision, authorization and your own meter’s manual.',
    'Completar esta simulación no te habilita para trabajar en equipos eléctricos energizados. El trabajo real requiere formación, supervisión, autorización y el manual de tu propio medidor.'),
  repAgain: T('Take the assessment again', 'Repetir la evaluación'),
  repGoPractice: T('Open this practice session', 'Abrir esta sesión de práctica'),
  repAllGood: T('Practice mode, Lesson 7 (24 V panel fault-finding) without hints — then try explaining each reading out loud before you take it.', 'Modo Práctica, Lección 7 (búsqueda de fallas en el panel de 24 V) sin pistas; después intenta explicar cada lectura en voz alta antes de tomarla.'),
  repPracticeLesson: T('Practice mode — {lesson}', 'Modo Práctica: {lesson}'),
  // help dialog
  helpTitle: T('How to use Voltage Lab', 'Cómo usar el Laboratorio de Voltaje'),
  helpBody: T(
    `<p><b>Everything here is simulated.</b> Nothing in this app is an instruction for wall outlets, breaker panels, mains wiring or industrial equipment, and finishing it does not qualify you to work on energized equipment.</p>
<ul>
<li><b>Look around:</b> drag the bench to rotate, scroll or pinch to zoom, two-finger drag (or right-drag) to pan. “Front view” returns to the starting view; the close-up buttons jump to the display, dial, jacks and probe tips.</li>
<li><b>Meter:</b> click a dial label (or drag the knob) to turn the selector. Click RANGE and HOLD. Click any part to learn what it is.</li>
<li><b>Leads:</b> click a plug, then a jack — or drag the plug onto the jack.</li>
<li><b>Probes:</b> drag a probe by its insulated handle onto a test point; it snaps when it is close enough. Or click the handle (it is now “in hand”), then click the test point. Click the handle again to put the probe down.</li>
<li><b>Test points:</b> with no probe in hand, clicking a test point marks it as one of your two intended points. You must do this before a probe may touch it.</li>
<li><b>No mouse?</b> Every action is also available under “Equipment controls” and on the circuit diagram, with keyboard focus.</li>
<li><b>Lessons:</b> a step completes only when your actual setup is right. “Show me” demonstrates, “Let me try” hands the equipment back, “Explain again” rephrases, “Reset” restores the start of the step.</li>
</ul>
<p><b>Known limits:</b> narration uses your browser’s built-in voices and may be missing in some browsers or languages (captions always work). Resistance (Ω) and current (A) are identified but deliberately not simulated. The meter is a generic teaching model: real meters have different layouts, ranges and overrange displays — read your own meter’s manual.</p>`,
    `<p><b>Aquí todo es simulado.</b> Nada en esta aplicación es una instrucción para tomacorrientes, tableros, cableado de red ni equipos industriales, y terminarla no te habilita para trabajar en equipos energizados.</p>
<ul>
<li><b>Mirar:</b> arrastra la mesa para girar, usa la rueda o pellizca para zoom, arrastra con dos dedos (o botón derecho) para desplazar. «Vista frontal» vuelve a la vista inicial; los botones de acercamiento van a la pantalla, el selector, los bornes y las puntas.</li>
<li><b>Medidor:</b> haz clic en una etiqueta del selector (o arrastra la perilla) para girarlo. Haz clic en RANGE y HOLD. Haz clic en cualquier parte para saber qué es.</li>
<li><b>Cables:</b> haz clic en una clavija y luego en un borne, o arrastra la clavija al borne.</li>
<li><b>Puntas:</b> arrastra una punta por su mango aislado hasta un punto de prueba; se ajusta al acercarse. O haz clic en el mango (queda «en la mano») y luego en el punto. Haz clic otra vez en el mango para soltarla.</li>
<li><b>Puntos de prueba:</b> sin punta en la mano, hacer clic en un punto lo marca como uno de tus dos puntos previstos. Debes hacerlo antes de que una punta pueda tocarlo.</li>
<li><b>¿Sin ratón?</b> Todas las acciones están también en «Controles del equipo» y en el diagrama, con foco de teclado.</li>
<li><b>Lecciones:</b> un paso se completa solo cuando tu configuración real es correcta. «Muéstrame» demuestra, «Déjame intentar» te devuelve el equipo, «Explícalo otra vez» lo reformula, «Reiniciar» restaura el inicio del paso.</li>
</ul>
<p><b>Límites conocidos:</b> la narración usa las voces del navegador y puede faltar en algunos navegadores o idiomas (los subtítulos siempre funcionan). Resistencia (Ω) y corriente (A) se identifican pero no se simulan, a propósito. El medidor es un modelo didáctico genérico: los medidores reales tienen otras disposiciones, rangos e indicaciones de sobrerrango; lee el manual de tu medidor.</p>`),
  helpStart: T('Start', 'Empezar'),
  narrationNA: T('Narration is not available in this browser.', 'La narración no está disponible en este navegador.'),
};

// Names used in messages.
export const DIAL_NAMES = {
  OFF: T('OFF', 'OFF'),
  VDC: T('V⎓ (DC voltage)', 'V⎓ (voltaje CC)'),
  VAC: T('V~ (AC voltage)', 'V~ (voltaje CA)'),
  OHM: T('Ω (resistance)', 'Ω (resistencia)'),
  A: T('A (current)', 'A (corriente)'),
};
export const DIAL_SHORT = { OFF: 'OFF', VDC: 'V⎓', VAC: 'V~', OHM: 'Ω', A: 'A' };
export const JACK_NAMES = { A: 'A', mA: 'mA', COM: 'COM', V: 'V/Ω' };

// Clickable part descriptions.
export const PARTS = {
  meter: {
    name: T('Multimeter', 'Multímetro'),
    info: T('A multimeter is one instrument with several measuring functions. In these lessons it works as a voltmeter: it measures voltage. This is a generic teaching model — real meters have different layouts, so always read your own meter’s manual.',
      'Un multímetro es un instrumento con varias funciones de medición. En estas lecciones funciona como voltímetro: mide voltaje. Es un modelo didáctico genérico; los medidores reales tienen otras disposiciones, así que lee siempre el manual del tuyo.'),
  },
  display: {
    name: T('Display', 'Pantalla'),
    info: T('Shows the number, a minus sign for negative polarity, the unit (V), the mode (DC or AC), the range (AUTO or the manual range) and a HOLD flag when the reading is frozen.',
      'Muestra el número, un signo menos para polaridad negativa, la unidad (V), el modo (DC o AC), el rango (AUTO o el rango manual) y el aviso HOLD cuando la lectura está congelada.'),
  },
  dial: {
    name: T('Rotary selector', 'Selector giratorio'),
    info: T('Chooses the function: OFF, V⎓ (DC voltage), V~ (AC voltage), Ω (resistance) and A (current). These lessons use only V⎓ and V~. Remove the probes from the circuit before turning it.',
      'Elige la función: OFF, V⎓ (voltaje CC), V~ (voltaje CA), Ω (resistencia) y A (corriente). Estas lecciones usan solo V⎓ y V~. Retira las puntas del circuito antes de girarlo.'),
  },
  'jack:COM': {
    name: T('COM jack', 'Borne COM'),
    info: T('COM means “common”: the meter’s reference connection. The black lead goes here for every measurement. COM does not automatically mean earth ground — it is simply the point the meter compares against.',
      'COM significa «común»: la conexión de referencia del medidor. El cable negro va aquí en todas las mediciones. COM no significa automáticamente tierra física; es solo el punto con el que el medidor compara.'),
  },
  'jack:V': {
    name: T('V/Ω jack', 'Borne V/Ω'),
    info: T('The red lead goes here to measure voltage (V) and, on real meters, resistance (Ω). This is the only correct red-lead jack for the lessons in this app.',
      'El cable rojo va aquí para medir voltaje (V) y, en medidores reales, resistencia (Ω). Es el único borne correcto del cable rojo para las lecciones de esta aplicación.'),
  },
  'jack:A': {
    name: T('A jack (current)', 'Borne A (corriente)'),
    info: T('For measuring larger currents in amperes. Inside, this jack is almost a direct wire to COM. If the red lead is here while you touch a voltage source, you short the source. Blocked in these voltage lessons.',
      'Para medir corrientes grandes en amperios. Por dentro, este borne es casi un cable directo a COM. Si el cable rojo está aquí cuando tocas una fuente de voltaje, la pones en cortocircuito. Bloqueado en estas lecciones de voltaje.'),
  },
  'jack:mA': {
    name: T('mA jack (small current)', 'Borne mA (corriente pequeña)'),
    info: T('For measuring small currents in milliamperes. Like the A jack, it is a low-resistance path and must never be used for a voltage measurement. Blocked in these lessons.',
      'Para medir corrientes pequeñas en miliamperios. Igual que el borne A, es un camino de baja resistencia y nunca debe usarse para medir voltaje. Bloqueado en estas lecciones.'),
  },
  'btn:range': {
    name: T('RANGE button', 'Botón RANGE'),
    info: T('Steps through AUTO → 2 V → 20 V → 200 V on this training meter. AUTO lets the meter pick the range. Changing the range never raises the meter’s permitted input or safety rating.',
      'Recorre AUTO → 2 V → 20 V → 200 V en este medidor de práctica. AUTO deja que el medidor elija el rango. Cambiar de rango nunca aumenta la entrada permitida ni la categoría de seguridad del medidor.'),
  },
  'btn:hold': {
    name: T('HOLD button', 'Botón HOLD'),
    info: T('Freezes the number on the display. While HOLD is shown, the display is an old value and does not follow the circuit. Press again to return to live readings.',
      'Congela el número en la pantalla. Mientras se muestra HOLD, la pantalla es un valor antiguo y no sigue al circuito. Pulsa otra vez para volver a lecturas en vivo.'),
  },
  'probe:handle': {
    name: T('Insulated probe handle', 'Mango aislado de la punta'),
    info: T('The only part you hold. It is covered in insulation, a material that does not carry electricity.',
      'La única parte que sujetas. Está cubierta de aislamiento, un material que no conduce electricidad.'),
  },
  'probe:guard': {
    name: T('Finger guard', 'Guarda para los dedos'),
    info: T('The raised ring that marks where your fingers must stop. Fingers stay behind it, on the handle side, so they cannot slide onto the metal tip.',
      'El anillo elevado que marca hasta dónde llegan tus dedos. Los dedos quedan detrás, del lado del mango, para que no resbalen hacia la punta metálica.'),
  },
  'probe:tip': {
    name: T('Exposed metal tip', 'Punta metálica expuesta'),
    info: T('The bare metal that makes electrical contact with one test point. Never touch it during a measurement, and never let it touch two terminals at once.',
      'El metal desnudo que hace contacto eléctrico con un punto de prueba. Nunca lo toques durante una medición ni dejes que toque dos terminales a la vez.'),
  },
  plug: {
    name: T('Lead plug', 'Clavija del cable'),
    info: T('The end of the test lead that goes into a meter jack. Black goes to COM, red goes to V/Ω.',
      'El extremo del cable de prueba que entra en un borne del medidor. El negro va a COM y el rojo a V/Ω.'),
  },
};

export const GLOSSARY = [
  [T('Voltage (V)', 'Voltaje o tensión (V)'), T('Electrical potential difference between two points. Always measured between two points.', 'Diferencia de potencial eléctrico entre dos puntos. Siempre se mide entre dos puntos.')],
  [T('Current (A)', 'Corriente (A)'), T('Flow of electric charge through a path, in amperes.', 'Flujo de carga eléctrica por un camino, en amperios.')],
  [T('Resistance (Ω)', 'Resistencia (Ω)'), T('Opposition to current, in ohms.', 'Oposición a la corriente, en ohmios.')],
  [T('V', 'V'), T('Volts, the unit of voltage.', 'Voltios, la unidad de voltaje.')],
  [T('mV', 'mV'), T('Millivolts. 1,000 mV = 1 V.', 'Milivoltios. 1000 mV = 1 V.')],
  [T('V⎓', 'V⎓'), T('DC voltage: polarity stays the same (batteries).', 'Voltaje CC (corriente continua): la polaridad se mantiene (pilas).')],
  [T('V~', 'V~'), T('AC voltage: polarity reverses periodically.', 'Voltaje CA (corriente alterna): la polaridad se invierte periódicamente.')],
  [T('COM', 'COM'), T('The meter’s common reference connection. It does not automatically mean earth ground.', 'La conexión de referencia común del medidor. No significa automáticamente tierra física.')],
  [T('A', 'A'), T('Current in amperes — also the name of the current input jack.', 'Corriente en amperios; también el nombre del borne de corriente.')],
  [T('Ω', 'Ω'), T('Resistance in ohms.', 'Resistencia en ohmios.')],
  [T('Node', 'Nodo'), T('All the metal joined together with nothing in between. Every spot on one node is at the same potential.', 'Todo el metal unido entre sí sin nada en medio. Todos los puntos de un nodo están al mismo potencial.')],
  [T('In parallel', 'En paralelo'), T('Connected across a component, side by side with it, without opening the circuit. Voltmeters connect in parallel.', 'Conectado entre los extremos de un componente, junto a él, sin abrir el circuito. Los voltímetros se conectan en paralelo.')],
  [T('Range', 'Rango'), T('The largest value the meter can show at its present setting.', 'El valor máximo que el medidor puede mostrar con su ajuste actual.')],
  [T('Overrange (OL)', 'Sobrerrango (OL)'), T('The value is larger than the selected range. It does not mean “no voltage”. This meter shows OL; real meters vary.', 'El valor supera el rango elegido. No significa «sin voltaje». Este medidor muestra OL; los reales varían.')],
  [T('RMS', 'RMS (valor eficaz)'), T('The effective value of an AC voltage. It is smaller than the peak.', 'El valor eficaz de un voltaje de CA. Es menor que el pico.')],
  [T('HOLD', 'HOLD'), T('Freezes the display. A held number is not a live reading.', 'Congela la pantalla. Un número retenido no es una lectura en vivo.')],
  [T('Nominal', 'Nominal'), T('The name-plate value, such as “1.5 V”. A measured value can differ.', 'El valor de etiqueta, como «1,5 V». El valor medido puede ser distinto.')],
];

// Error and coaching cards. level: block (action refused), error, note.
export const COACH = {
  unsafe_jack: {
    level: 'block', critical: true,
    title: T('Blocked: a lead is in a current jack', 'Bloqueado: un cable está en un borne de corriente'),
    what: T('A lead is plugged into the A or mA jack, and you tried to go ahead with a voltage measurement. The simulator stopped the probe before it touched.', 'Un cable está en el borne A o mA y quisiste seguir con una medición de voltaje. El simulador detuvo la punta antes de que tocara.'),
    why: T('The current jacks are a very low-resistance path through the meter. Across a voltage source that is a short circuit: it can damage the meter and the source and can injure you. The meter’s fuse is a last-resort protection, not permission to make this connection.', 'Los bornes de corriente son un camino de muy baja resistencia a través del medidor. Entre los polos de una fuente de voltaje eso es un cortocircuito: puede dañar el medidor y la fuente, y puede lesionarte. El fusible del medidor es una protección de último recurso, no un permiso para hacer esta conexión.'),
    fix: T('With both probes away from the circuit, move the red lead to V/Ω and keep black in COM. Then confirm the jacks again.', 'Con ambas puntas lejos del circuito, pasa el cable rojo a V/Ω y deja el negro en COM. Luego confirma los bornes otra vez.'),
  },
  wrong_jack: {
    level: 'error', critical: true,
    title: T('Wrong input jack', 'Borne de entrada equivocado'),
    what: T('You plugged a lead into a current jack (A or mA).', 'Conectaste un cable en un borne de corriente (A o mA).'),
    why: T('Those jacks are for measuring current. With a lead there, touching a voltage source would short it. Voltage measurements are blocked while this lasts.', 'Esos bornes son para medir corriente. Con un cable ahí, tocar una fuente de voltaje la pondría en cortocircuito. Las mediciones de voltaje quedan bloqueadas mientras siga así.'),
    fix: T('Move the lead: black belongs in COM, red belongs in V/Ω.', 'Mueve el cable: el negro va en COM y el rojo en V/Ω.'),
  },
  swapped_jacks: {
    level: 'error',
    title: T('Leads are swapped at the meter', 'Los cables están cruzados en el medidor'),
    what: T('Red is in COM and black is in V/Ω.', 'El rojo está en COM y el negro en V/Ω.'),
    why: T('The meter still works, but every sign is reversed compared with the lead colors, which makes readings easy to misread.', 'El medidor sigue funcionando, pero todos los signos quedan invertidos respecto a los colores de los cables, lo que hace fácil leer mal.'),
    fix: T('Remove the probes from the circuit, then put black in COM and red in V/Ω.', 'Retira las puntas del circuito y pon el negro en COM y el rojo en V/Ω.'),
  },
  change_connected: {
    level: 'block', critical: true,
    title: T('Blocked: probes are still on the circuit', 'Bloqueado: las puntas siguen en el circuito'),
    what: T('You tried to change the function, a jack or a lead while a probe was touching a test point.', 'Quisiste cambiar la función, un borne o un cable mientras una punta tocaba un punto de prueba.'),
    why: T('Turning the selector or moving a plug while connected can pass through a setting that is wrong for the circuit, such as a current function, with the probes live.', 'Girar el selector o mover una clavija estando conectado puede pasar por un ajuste incorrecto para el circuito, como una función de corriente, con las puntas energizadas.'),
    fix: T('Remove the red probe, then the black probe. Make the change. Then reconnect.', 'Retira la punta roja y luego la negra. Haz el cambio. Después vuelve a conectar.'),
  },
  bridge: {
    level: 'block', critical: true,
    title: T('Blocked: the tip would bridge two terminals', 'Bloqueado: la punta puentearía dos terminales'),
    what: T('You aimed the probe at the gap between two neighbouring terminals, where the metal tip would touch both.', 'Apuntaste la punta al espacio entre dos terminales vecinos, donde el metal tocaría ambos.'),
    why: T('A tip touching two terminals joins them with metal: a short circuit made by your probe.', 'Una punta que toca dos terminales los une con metal: un cortocircuito hecho por tu punta.'),
    fix: T('Place the tip squarely on one labeled terminal only.', 'Coloca la punta de lleno sobre un solo terminal rotulado.'),
  },
  tip_grip: {
    level: 'block', critical: true,
    title: T('Not there: that is the bare metal tip', 'Ahí no: esa es la punta metálica desnuda'),
    what: T('You reached for the exposed metal tip of the probe.', 'Fuiste a tomar la punta metálica expuesta.'),
    why: T('The tip is the part that becomes electrically connected to the circuit. Fingers belong on the insulated handle, behind the finger guard.', 'La punta es la parte que queda conectada eléctricamente al circuito. Los dedos van en el mango aislado, detrás de la guarda.'),
    fix: T('Click or drag the insulated handle, behind the guard.', 'Haz clic o arrastra el mango aislado, detrás de la guarda.'),
  },
  func_block: {
    level: 'block', critical: true,
    title: T('Blocked: not a voltage function', 'Bloqueado: no es una función de voltaje'),
    what: T('The selector is on Ω or A and you tried to touch a powered circuit.', 'El selector está en Ω o A y quisiste tocar un circuito energizado.'),
    why: T('Resistance is never measured on an energized circuit, and current measurement needs a different connection. Either can damage the meter or the circuit.', 'La resistencia nunca se mide en un circuito energizado, y medir corriente requiere otra conexión. Cualquiera de las dos puede dañar el medidor o el circuito.'),
    fix: T('Select V⎓ for DC or V~ for AC, confirm the function, then measure.', 'Selecciona V⎓ para CC o V~ para CA, confirma la función y luego mide.'),
  },
  func_not_voltage: {
    level: 'block',
    title: T('Select a voltage function first', 'Primero selecciona una función de voltaje'),
    what: T('The selector is not on V⎓ or V~, so there is nothing to confirm yet.', 'El selector no está en V⎓ ni en V~, así que aún no hay nada que confirmar.'),
    why: T('The check is about making sure the meter is set to measure voltage before any probe touches the circuit.', 'La comprobación consiste en asegurar que el medidor esté listo para medir voltaje antes de que una punta toque el circuito.'),
    fix: T('Turn the selector to V⎓ (batteries, DC circuits) or V~ (the AC training source).', 'Gira el selector a V⎓ (pilas, circuitos de CC) o V~ (la fuente de práctica de CA).'),
  },
  meter_off: {
    level: 'block',
    title: T('The meter is off', 'El medidor está apagado'),
    what: T('You tried to touch a test point with the selector on OFF.', 'Quisiste tocar un punto de prueba con el selector en OFF.'),
    why: T('Set up the meter completely before the probes touch anything, because the selector must not be turned while connected.', 'Prepara el medidor por completo antes de que las puntas toquen algo, porque el selector no debe girarse estando conectado.'),
    fix: T('Turn the selector to V⎓ or V~ first.', 'Gira primero el selector a V⎓ o V~.'),
  },
  lead_unplugged: {
    level: 'block',
    title: T('Connect the leads to the meter first', 'Primero conecta los cables al medidor'),
    what: T('The leads are not both plugged in: black in COM and red in V/Ω.', 'Los cables no están ambos conectados: negro en COM y rojo en V/Ω.'),
    why: T('Leads are connected to the meter before the probes go near a circuit, never the other way round.', 'Los cables se conectan al medidor antes de acercar las puntas a un circuito, nunca al revés.'),
    fix: T('Plug black into COM and red into V/Ω.', 'Conecta el negro en COM y el rojo en V/Ω.'),
  },
  precheck: {
    level: 'block',
    title: T('Finish the pre-measurement check first', 'Termina primero la comprobación previa'),
    what: T('A probe was about to touch the circuit before the check was complete. Still missing: {missing}.', 'Una punta iba a tocar el circuito antes de completar la comprobación. Falta: {missing}.'),
    why: T('The check catches the common mistakes — damaged leads, wrong jack, wrong function — while they are still harmless.', 'La comprobación detecta los errores habituales (cables dañados, borne o función equivocados) cuando todavía son inofensivos.'),
    fix: T('Complete the missing items in the “Pre-measurement check” list, then touch the test point again.', 'Completa los puntos que faltan en la lista «Comprobación previa a la medición» y vuelve a tocar el punto de prueba.'),
  },
  unplanned_point: {
    level: 'block',
    title: T('That is not one of your identified points', 'Ese no es uno de tus puntos identificados'),
    what: T('You moved a probe to {term}, but your identified test points are: {intended}.', 'Llevaste una punta a {term}, pero tus puntos identificados son: {intended}.'),
    why: T('Deciding the two points before you measure is what prevents probing the wrong place by accident.', 'Decidir los dos puntos antes de medir es lo que evita tocar por accidente el lugar equivocado.'),
    fix: T('Put the probe down (click its handle), click the test points you really intend to measure, then pick the probe up again.', 'Suelta la punta (clic en su mango), haz clic en los puntos que de verdad quieres medir y vuelve a tomar la punta.'),
  },
  predict_first: {
    level: 'block',
    title: T('Predict before you touch', 'Predice antes de tocar'),
    what: T('This step asks for your prediction before the probes make contact.', 'Este paso pide tu predicción antes de que las puntas hagan contacto.'),
    why: T('Predicting first is how you notice when a reading is surprising — the heart of troubleshooting.', 'Predecir primero es la forma de notar cuándo una lectura sorprende: la base del diagnóstico.'),
    fix: T('Choose an answer under “Predict first” in the lesson panel.', 'Elige una respuesta en «Primero predice» en el panel de la lección.'),
  },
  jack_taken: {
    level: 'block',
    title: T('That jack is already in use', 'Ese borne ya está ocupado'),
    what: T('The other lead is already plugged into that jack.', 'El otro cable ya está conectado en ese borne.'),
    why: T('Each jack takes one plug.', 'Cada borne admite una clavija.'),
    fix: T('Unplug the other lead first, or choose the correct free jack.', 'Desconecta primero el otro cable o elige el borne libre correcto.'),
  },
  range_na: {
    level: 'note',
    title: T('RANGE works in a voltage function', 'RANGE funciona en una función de voltaje'),
    what: T('The RANGE button did nothing because the selector is not on V⎓ or V~.', 'El botón RANGE no hizo nada porque el selector no está en V⎓ ni V~.'),
    why: T('Ranges in this simulator belong to the voltage functions.', 'En este simulador los rangos pertenecen a las funciones de voltaje.'),
    fix: T('Turn the selector to V⎓ or V~, then press RANGE.', 'Gira el selector a V⎓ o V~ y luego pulsa RANGE.'),
  },
  meter_off_btn: {
    level: 'note',
    title: T('The meter is off', 'El medidor está apagado'),
    what: T('The button did nothing because the selector is on OFF.', 'El botón no hizo nada porque el selector está en OFF.'),
    why: T('Buttons work only when the meter is on.', 'Los botones funcionan solo con el medidor encendido.'),
    fix: T('Turn the selector to a function first.', 'Gira primero el selector a una función.'),
  },
  damaged_lead: {
    level: 'error',
    title: T('Damaged lead found', 'Cable dañado encontrado'),
    what: T('Your inspection found a nick in the insulation with metal showing.', 'Tu inspección encontró un corte en el aislamiento con el metal a la vista.'),
    why: T('Damaged insulation can put your hand in contact with the circuit. Finding it now is exactly what inspection is for.', 'Un aislamiento dañado puede poner tu mano en contacto con el circuito. Encontrarlo ahora es justo para lo que sirve la inspección.'),
    fix: T('Press “Replace damaged lead” in the check list. Never tape over or “just use” a damaged lead.', 'Pulsa «Reemplazar cable dañado» en la lista. Nunca lo cubras con cinta ni lo uses «por esta vez».'),
  },
  mode_mismatch: {
    level: 'error',
    title: T('AC/DC setting does not match the source', 'El ajuste CA/CC no corresponde a la fuente'),
    what: T('The meter is on {have} but this source is {kind}. This simulated meter shows about zero.', 'El medidor está en {have} pero esta fuente es de {kind}. Este medidor simulado muestra casi cero.'),
    why: T('The number is misleading: voltage is present although the display is near zero. Real meters do not all behave the same in the wrong mode — some show zero, some a partial or unstable value.', 'El número es engañoso: hay voltaje aunque la pantalla marque casi cero. No todos los medidores reales se comportan igual en el modo equivocado: unos marcan cero y otros un valor parcial o inestable.'),
    fix: T('Remove both probes, select {want}, confirm the function, then measure again.', 'Retira ambas puntas, selecciona {want}, confirma la función y vuelve a medir.'),
  },
  range_low: {
    level: 'error',
    title: T('Range too low (overrange)', 'Rango demasiado bajo (sobrerrango)'),
    what: T('The display shows OL: the voltage is larger than the selected {range} V range can show.', 'La pantalla muestra OL: el voltaje supera lo que puede mostrar el rango de {range} V elegido.'),
    why: T('OL means “too big for this range”, not “no voltage”. Reading it as zero would be a serious mistake. OL is how this simulated meter shows overrange; real displays vary.', 'OL significa «demasiado grande para este rango», no «sin voltaje». Leerlo como cero sería un error grave. OL es como este medidor simulado indica sobrerrango; las pantallas reales varían.'),
    fix: T('Press RANGE to choose a higher range (or AUTO). You may change range while connected — it is not a function change.', 'Pulsa RANGE para elegir un rango mayor (o AUTO). Puedes cambiar de rango estando conectado; no es un cambio de función.'),
  },
  no_contact: {
    level: 'error',
    title: T('Probe is not making contact', 'La punta no hace contacto'),
    what: T('The {lead} probe was left beside the terminal, not on it.', 'La punta {lead} quedó al lado del terminal, no sobre él.'),
    why: T('Without metal-to-metal contact at both points there is no two-point measurement. The display may show small wandering numbers that mean nothing.', 'Sin contacto metal con metal en ambos puntos no hay medición entre dos puntos. La pantalla puede mostrar números pequeños y cambiantes que no significan nada.'),
    fix: T('Bring the tip onto the labeled terminal until it snaps into place.', 'Lleva la punta sobre el terminal rotulado hasta que encaje.'),
  },
  floating: {
    level: 'note',
    title: T('Only one probe is touching', 'Solo una punta está tocando'),
    what: T('One probe is on a test point and the other is not touching anything.', 'Una punta está en un punto de prueba y la otra no toca nada.'),
    why: T('Voltage needs two points. With one input open (“floating”), a real meter can show unstable or misleading numbers — not a reliable zero.', 'El voltaje necesita dos puntos. Con una entrada abierta («flotante»), un medidor real puede mostrar números inestables o engañosos, no un cero fiable.'),
    fix: T('Place the other probe on its test point to complete the measurement.', 'Coloca la otra punta en su punto de prueba para completar la medición.'),
  },
  reversed: {
    level: 'note',
    title: T('Negative reading: probes are reversed', 'Lectura negativa: puntas invertidas'),
    what: T('The display shows a minus sign.', 'La pantalla muestra un signo menos.'),
    why: T('This is a valid reading, not an unsafe connection. The minus sign says the red probe is on the lower-potential point and the black probe on the higher one.', 'Es una lectura válida, no una conexión insegura. El signo menos indica que la punta roja está en el punto de menor potencial y la negra en el de mayor.'),
    fix: T('If you want a positive number, swap the two probe positions. Nothing is damaged either way.', 'Si quieres un número positivo, intercambia las posiciones de las puntas. Nada se daña en ningún caso.'),
  },
  same_node: {
    level: 'note',
    title: T('Both probes are on the same node', 'Ambas puntas están en el mismo nodo'),
    what: T('Both probes touch metal that is joined together, so the meter shows about 0 V.', 'Ambas puntas tocan metal unido entre sí, así que el medidor muestra unos 0 V.'),
    why: T('There is no difference between a point and itself. This zero says nothing about whether the circuit is powered.', 'No hay diferencia entre un punto y él mismo. Este cero no dice nada sobre si el circuito está energizado.'),
    fix: T('To measure across a component, put one probe on each side of it.', 'Para medir entre los extremos de un componente, pon una punta a cada lado.'),
  },
  hold_stale: {
    level: 'error',
    title: T('HOLD is showing an old value', 'HOLD muestra un valor antiguo'),
    what: T('HOLD is on, and the connection has changed since the number was frozen.', 'HOLD está activo y la conexión cambió desde que se congeló el número.'),
    why: T('The display no longer follows the circuit. Trusting a held number as a live reading can lead to a wrong — and possibly unsafe — conclusion.', 'La pantalla ya no sigue al circuito. Confiar en un número retenido como si fuera en vivo puede llevar a una conclusión equivocada y quizá insegura.'),
    fix: T('Press HOLD again so the HOLD flag disappears, then read the live value.', 'Pulsa HOLD otra vez para que desaparezca el aviso HOLD y lee el valor en vivo.'),
  },
  remove_order: {
    level: 'error',
    title: T('Remove red first, then black', 'Retira primero la roja y luego la negra'),
    what: T('The black probe came off while the red probe was still on the circuit.', 'La punta negra se retiró mientras la roja seguía en el circuito.'),
    why: T('The habit taught here is: reference (black) goes on first and comes off last, so the red lead is never left connected on its own.', 'El hábito que se enseña aquí es: la referencia (negra) se conecta primero y se retira al final, para que el cable rojo nunca quede conectado solo.'),
    fix: T('Press Retry to put the probes back, then lift red first and black second.', 'Pulsa Reintentar para volver a colocar las puntas y retira primero la roja y después la negra.'),
  },
};
export const CRITICAL = Object.keys(COACH).filter((k) => COACH[k].critical);
