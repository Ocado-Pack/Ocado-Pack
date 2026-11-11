// Training modules built on the control-circuit engine: dashboard, Build a
// Circuit, Verify a Repair, Equipment Packs and Review Due. All content is
// local; nothing here calls a network service.
import { T, getLang } from './i18n.js';
import { EXERCISES, KINDS, GRID, emptyDesign, cloneDesign, canPlace, precheck, ISSUE_TEXT, runTests, createRuntime, attention, CAUSES, SCENARIOS_V, CHECKS, fitting, replay } from './ctl.js';
import { schematicSVG, symbolSVG, cellAt, termName } from './schematic.js';
import { GENERAL, PACK_LIST, CLOSEST, NOTICE, loadPack, loaded, labelsFor } from './packs.js';
import { CONCEPTS, QUESTIONS, newState, record, dueList, weakest, buildSession, estimateMinutes, pickQuestion, answerOf, shuffled, accuracy, DEFAULTS } from './review.js';

const KEY = 'voltage-lab-study';
const X = {
  home: T('Dashboard', 'Panel principal'), build: T('Build a Circuit', 'Construir un circuito'), verify: T('Verify a Repair', 'Verificar una reparación'),
  packs: T('Equipment Packs', 'Paquetes de equipo'), review: T('Review Due', 'Repaso pendiente'), open: T('Open', 'Abrir'),
  lessons: T('Lessons', 'Lecciones'), lessonsSub: T('Voltmeter basics, step by step. Start here if you are new.', 'Lo básico del voltímetro, paso a paso. Empieza aquí si eres nuevo.'),
  assess: T('Assessment', 'Evaluación'), assessSub: T('Ten voltmeter tasks with a report.', 'Diez tareas de voltímetro con informe.'),
  dx: T('Help me diagnose', 'Ayúdame a diagnosticar'), dxSub: T('Guided fault-finding with the meter.', 'Búsqueda de fallas guiada con el medidor.'),
  buildSub: T('Turn a description of machine behavior into a working schematic.', 'Convierte una descripción del comportamiento de una máquina en un esquema que funciona.'),
  verifySub: T('Diagnose, make a simulated repair, then prove the result.', 'Diagnostica, haz una reparación simulada y demuestra el resultado.'),
  packsSub: T('Vocabulary, scenarios and interview questions for one family of equipment.', 'Vocabulario, casos e interrogantes de entrevista para una familia de equipos.'),
  reviewSub: T('Short practice on the concepts that need it most.', 'Práctica breve de los conceptos que más lo necesitan.'),
  dueN: T('{n} due now', '{n} pendientes ahora'), current: T('Current pack', 'Paquete actual'),
  settings: T('Display settings', 'Ajustes de pantalla'), lowfx: T('Reduced graphics (no shadows, lower resolution)', 'Gráficos reducidos (sin sombras, menor resolución)'), calm: T('Reduced motion (no camera glides or spinning parts)', 'Movimiento reducido (sin desplazamientos de cámara ni piezas girando)'),
  storageOK: T('Your progress is saved in this browser only. It may be lost if browser data is cleared.', 'Tu progreso se guarda solo en este navegador. Puede perderse si se borran los datos del navegador.'),
  storageNo: T('This browser is not allowing local storage, so progress will last only until the page is closed.', 'Este navegador no permite el almacenamiento local, así que el progreso durará solo hasta cerrar la página.'),
  exercise: T('Exercise', 'Ejercicio'), required: T('Required behavior', 'Comportamiento requerido'), parts: T('Components provided', 'Componentes disponibles'),
  check: T('Check circuit', 'Comprobar circuito'), runTests: T('Run behavior tests', 'Ejecutar pruebas de comportamiento'), hint: T('Hint', 'Pista'), solution: T('Show worked solution', 'Mostrar solución resuelta'),
  hint1: T('In other words, the finished circuit must do this', 'En otras palabras, el circuito terminado debe hacer esto'), hint2: T('Circuit principle', 'Principio del circuito'), hint3: T('Look at the highlighted part of your drawing', 'Mira la parte resaltada de tu dibujo'),
  hint3none: T('Nothing is placed yet. Start by placing the load and connecting it to 0 V.', 'Aún no hay nada colocado. Empieza por colocar la carga y conectarla a 0 V.'),
  revealed: T('Worked solution loaded. Study it, then press Reset and build it yourself — a revealed answer is not counted as mastered.', 'Solución cargada. Estúdiala y luego pulsa Reiniciar y constrúyela tú: una respuesta revelada no cuenta como dominada.'),
  blocked: T('Not ready to run', 'Aún no puede funcionar'), checkOK: T('Circuit check passed. The 3D equipment is now wired to your drawing: operate it from the bench, the drawing or the buttons below.', 'Comprobación superada. El equipo 3D ya está cableado según tu dibujo: opéralo desde la mesa, el dibujo o los botones de abajo.'),
  testsTitle: T('Behavior tests', 'Pruebas de comportamiento'), question: T('Question', 'Pregunta'), expected: T('Expected', 'Esperado'), observed: T('Observed', 'Observado'), result: T('Result', 'Resultado'),
  pass: T('Pass', 'Correcto'), fail: T('Fail', 'Fallo'), on: T('on', 'encendido'), off: T('off', 'apagado'), running: T('running', 'en marcha'), stopped: T('stopped', 'parado'), unstable: T('unstable', 'inestable'),
  allPass: T('Every behavior test passed. This circuit does what was asked — whatever its layout.', 'Todas las pruebas de comportamiento se superaron. Este circuito hace lo que se pidió, sea cual sea su disposición.'),
  somePass: T('The circuit runs, but it does not yet behave as required. Compare the failed rows with the description.', 'El circuito funciona, pero aún no se comporta como se requiere. Compara las filas fallidas con la descripción.'),
  operate: T('Operate the equipment', 'Operar el equipo'), notWired: T('Not wired yet — check the circuit first', 'Aún sin cablear: primero comprueba el circuito'),
  palette: T('Component palette', 'Paleta de componentes'), rotate: T('Rotate', 'Girar'), remove: T('Remove', 'Quitar'), undo: T('Undo', 'Deshacer'), redo: T('Redo', 'Rehacer'), clear: T('Clear', 'Vaciar'), reset: T('Reset', 'Reiniciar'),
  assign: T('Operated by', 'Accionado por'), choose: T('choose…', 'elige…'),
  vSch: T('Schematic', 'Esquema'), v3d: T('Equipment', 'Equipo'), vBoth: T('Both', 'Ambos'),
  msgIdle: T('Pick a component, then click a grid position — or drag it there. Click one connection point, then another, to add a wire.', 'Elige un componente y haz clic en una posición de la cuadrícula, o arrástralo. Haz clic en un punto de conexión y luego en otro para añadir un cable.'),
  msgTool: T('{p} selected: click a grid position (or use the arrow keys and Enter).', '{p} seleccionado: haz clic en una posición de la cuadrícula (o usa las flechas y Enter).'),
  msgWire: T('Wire started at {p}: click the connection point where it should end.', 'Cable iniciado en {p}: haz clic en el punto de conexión donde debe terminar.'),
  msgNoSpot: T('That position is occupied or outside the workspace.', 'Esa posición está ocupada o fuera del área de trabajo.'),
  msgSel: T('{p} selected. Rotate, Remove, drag it, or move it with the arrow keys.', '{p} seleccionado. Gira, Quita, arrástralo o muévelo con las flechas.'),
  power: T('Power circuit (pre-wired, not part of this exercise): K1 main contacts feed {M1}.', 'Circuito de potencia (precableado, fuera de este ejercicio): los contactos principales de K1 alimentan {M1}.'),
  refPoint: T('REF — tester check point (24 V reference)', 'REF: punto de comprobación del probador (referencia de 24 V)'),
  wire: T('Wire', 'Cable'), point: T('Connection point', 'Punto de conexión'), closed: T('closed', 'cerrado'), open_: T('open', 'abierto'),
  packFallback: T('The selected pack has no motor starter, so this exercise uses the general industrial maintenance labels.', 'El paquete seleccionado no tiene arrancador de motor, así que este ejercicio usa las referencias de mantenimiento industrial general.'),
  // verify
  scenario: T('Scenario', 'Caso'), symptom: T('Reported symptom', 'Síntoma reportado'), start: T('Start', 'Comenzar'),
  scope: T('These steps and checks apply to this teaching circuit only. Actual equipment may have different documented operating sequences, and real isolation follows the site’s written procedure.', 'Estos pasos y comprobaciones se aplican solo a este circuito didáctico. El equipo real puede tener otras secuencias de funcionamiento documentadas, y el aislamiento real sigue el procedimiento escrito del sitio.'),
  stDiag: T('1 · Diagnose', '1 · Diagnosticar'), stIso: T('2 · Isolate and repair (simulated)', '2 · Aislar y reparar (simulado)'), stVer: T('3 · Verify operation', '3 · Verificar el funcionamiento'), stRep: T('4 · Repair report', '4 · Informe de reparación'),
  diagHow: T('Operate the equipment and click connection points on the drawing to read their voltage relative to 0 V. Everything you do is recorded as evidence.', 'Opera el equipo y haz clic en puntos de conexión del dibujo para leer su voltaje respecto a 0 V. Todo lo que hagas queda registrado como evidencia.'),
  evidence: T('Evidence so far', 'Evidencia hasta ahora'), noEvidence: T('Nothing recorded yet.', 'Aún no hay nada registrado.'),
  cause: T('Your diagnosis', 'Tu diagnóstico'), judge: T('Check against the evidence', 'Contrastar con la evidencia'),
  jContra: T('Your evidence contradicts this cause: “{e}” would not have happened.', 'Tu evidencia contradice esta causa: «{e}» no habría ocurrido.'),
  jAmbig: T('The evidence fits this cause, but it also fits: {o}. Another reading could separate them.', 'La evidencia concuerda con esta causa, pero también con: {o}. Otra lectura podría separarlas.'),
  jUnique: T('The evidence fits this cause and no other in the list.', 'La evidencia concuerda con esta causa y con ninguna otra de la lista.'),
  toIso: T('Go on to isolation and repair', 'Pasar al aislamiento y la reparación'), anyway: T('Repair on this evidence anyway', 'Reparar con esta evidencia de todos modos'),
  isoIntro: T('The repair is represented abstractly: one button replaces the part. It is enabled only when these simulated isolation steps are complete.', 'La reparación se representa de forma abstracta: un botón reemplaza la pieza. Se habilita solo cuando estos pasos de aislamiento simulados están completos.'),
  iso1: T('{M1} stopped', '{M1} parado'), iso2: T('Control power switched off', 'Alimentación de control desconectada'), iso3: T('Lock and tag applied to the control power switch', 'Candado y etiqueta colocados en el interruptor de alimentación de control'),
  iso4: T('Tester checked on the REF point (reads about 24 V)', 'Probador comprobado en el punto REF (marca unos 24 V)'), iso5: T('Zero volts confirmed on the +24 V rail', 'Cero voltios confirmados en la barra de +24 V'), iso6: T('Tester checked on REF again', 'Probador comprobado otra vez en REF'),
  pOff: T('Switch control power off', 'Desconectar la alimentación de control'), pOn: T('Switch control power on', 'Conectar la alimentación de control'), lock: T('Apply lock and tag', 'Colocar candado y etiqueta'), unlock: T('Remove lock and tag', 'Retirar candado y etiqueta'),
  tRef: T('Test REF point', 'Probar el punto REF'), tRail: T('Test +24 V rail', 'Probar la barra de +24 V'), reads: T('Tester reads {v}', 'El probador marca {v}'),
  doRepair: T('Carry out simulated repair: replace {p}', 'Realizar la reparación simulada: reemplazar {p}'),
  verIntro: T('Demonstrate each function. Results are taken from the simulated equipment at the moment you operate it — there are no boxes to tick.', 'Demuestra cada función. Los resultados se toman del equipo simulado en el momento en que lo operas; no hay casillas que marcar.'),
  restoreFirst: T('Remove the lock and switch control power on before testing.', 'Retira el candado y conecta la alimentación de control antes de probar.'),
  nextCheck: T('Next check', 'Siguiente comprobación'), precond: T('Not recorded: {t}', 'No registrado: {t}'), test: T('Test', 'Prueba'), pf: T('Pass/Fail', 'Correcto/Fallo'),
  notTested: T('not tested', 'sin probar'), verFail: T('Verification failed: the repair has not been proven. The symptom needs a new diagnosis.', 'La verificación falló: la reparación no quedó demostrada. El síntoma requiere un nuevo diagnóstico.'),
  rediag: T('Return to diagnosis', 'Volver al diagnóstico'), inherited: T('A colleague replaced {p}.', 'Un compañero reemplazó {p}.'), youRepl: T('You replaced {p}.', 'Reemplazaste {p}.'),
  unresolved: T('Symptom unresolved.', 'Síntoma sin resolver.'), resolved: T('Verified.', 'Verificado.'),
  rSymptom: T('Original symptom', 'Síntoma original'), rEvidence: T('Evidence supporting the diagnosis', 'Evidencia que respalda el diagnóstico'), rRepair: T('Simulated repair', 'Reparación simulada'), rVerify: T('Verification results', 'Resultados de la verificación'), rUncert: T('Remaining uncertainty', 'Incertidumbre restante'),
  uWhy: T('The evidence located the open part. It does not show why that part failed, so the cause of the failure is not established.', 'La evidencia ubicó la pieza abierta. No muestra por qué falló, así que la causa del fallo no queda establecida.'),
  uAmbig: T('The repair was made while the evidence still fitted more than one cause.', 'La reparación se hizo cuando la evidencia aún concordaba con más de una causa.'),
  another: T('Another scenario', 'Otro caso'),
  // packs
  selectPack: T('Choose a pack', 'Elige un paquete'), loading: T('Loading pack…', 'Cargando paquete…'), loadFail: T('That pack could not be loaded, so the general pack is still in use.', 'No se pudo cargar ese paquete, así que sigue en uso el paquete general.'),
  glossary: T('Glossary', 'Glosario'), models: T('Physical models on the bench', 'Modelos físicos en la mesa'), legend: T('Drawing legend', 'Leyenda del plano'), scenarios: T('Introductory scenarios', 'Casos introductorios'),
  interview: T('Interview questions', 'Preguntas de entrevista'), answer: T('Points a good answer covers', 'Puntos que cubre una buena respuesta'), behavior: T('Expected operating behavior', 'Comportamiento de funcionamiento esperado'), vchecks: T('Applicable verification checks', 'Comprobaciones de verificación aplicables'),
  notes: T('Interview Equipment Notes', 'Notas del equipo de la entrevista'), notesHelp: T('Write down machine names and topics the employer mentioned. This is your own study reference: the app does not interpret these notes or create training from them.', 'Anota nombres de máquinas y temas que mencionó el empleador. Es tu propia referencia de estudio: la aplicación no interpreta estas notas ni crea formación a partir de ellas.'),
  notListed: T('Equipment not listed?', '¿El equipo no aparece?'), closest: T('Closest pack: {p}.', 'Paquete más cercano: {p}.'), limits: T('Limits of the match', 'Límites de la coincidencia'),
  verified: T('Verified content — source: {s}', 'Contenido verificado. Fuente: {s}'),
  // review
  dueTitle: T('Due now', 'Pendiente ahora'), nothingDue: T('Nothing is due right now.', 'No hay nada pendiente ahora.'), weak: T('Weakest concepts', 'Conceptos más débiles'), est: T('Estimated session: about {n} min', 'Sesión estimada: unos {n} min'),
  five: T('Practice for 5 Minutes', 'Practicar 5 minutos'), before: T('Review Before My Interview', 'Repasar antes de mi entrevista'), never: T('not tried yet', 'sin intentar'), nextIn: T('next review {t}', 'próximo repaso {t}'), now: T('now', 'ahora'),
  schedule: T('Practice schedule', 'Calendario de práctica'), schedNote: T('These are practice defaults, not a guaranteed learning formula. Change them if they do not suit you.', 'Son valores de práctica por defecto, no una fórmula de aprendizaje garantizada. Cámbialos si no te convienen.'),
  cfg: { help: T('Correct with help: review after (min)', 'Correcto con ayuda: repasar tras (min)'), first: T('Correct on your own: review after (min)', 'Correcto por tu cuenta: repasar tras (min)'), second: T('Correct again: review after (min)', 'Correcto otra vez: repasar tras (min)'), third: T('Then (min)', 'Después (min)'), fourth: T('Then (min)', 'Después (min)'), gap: T('Incorrect: retry after this many other questions', 'Incorrecto: reintentar tras este número de otras preguntas'), perQuestion: T('Seconds allowed per question for estimates', 'Segundos por pregunta para las estimaciones') },
  restore: T('Restore defaults', 'Restaurar valores'), backup: T('Export or import progress', 'Exportar o importar progreso'), backupHelp: T('Copy this text somewhere safe. To restore, paste saved text here and press Import.', 'Copia este texto en un lugar seguro. Para restaurar, pega aquí el texto guardado y pulsa Importar.'),
  copy: T('Copy', 'Copiar'), import_: T('Import', 'Importar'), imported: T('Progress imported.', 'Progreso importado.'), importBad: T('That text is not a Voltage Lab progress export.', 'Ese texto no es una exportación de progreso de Voltage Lab.'), copied: T('Copied.', 'Copiado.'), selectCopy: T('Select the text and copy it.', 'Selecciona el texto y cópialo.'),
  qOf: T('Question {i} of {n}', 'Pregunta {i} de {n}'), sure: T('How sure are you?', '¿Qué tan seguro estás?'), c1: T('Guessing', 'Adivinando'), c2: T('Fairly sure', 'Bastante seguro'), c3: T('Certain', 'Seguro'),
  checkAns: T('Check answer', 'Comprobar respuesta'), next: T('Next', 'Siguiente'), finish: T('Finish', 'Terminar'), right: T('Correct.', 'Correcto.'), wrong: T('Not this time.', 'Esta vez no.'),
  confWrong: T('You were certain, so this concept moves to the front of the queue.', 'Estabas seguro, así que este concepto pasa al frente de la cola.'), again: T('You will see a different example of this shortly.', 'Verás un ejemplo distinto de esto en breve.'),
  sched: { wrong: T('Due again straight away.', 'Pendiente de nuevo de inmediato.'), helped: T('Correct with help: back in about {t}.', 'Correcto con ayuda: vuelve en unos {t}.'), solo: T('Correct on your own: back in about {t}.', 'Correcto por tu cuenta: vuelve en unos {t}.') },
  done: T('Session complete', 'Sesión completada'), score: T('{a} of {n} correct', '{a} de {n} correctas'), backDue: T('Back to Review Due', 'Volver a Repaso pendiente'), yourNotes: T('Your interview notes', 'Tus notas de entrevista'), noNotes: T('No notes saved yet. Add them under Equipment Packs.', 'Aún no hay notas guardadas. Añádelas en Paquetes de equipo.'),
  stop: T('End session', 'Terminar sesión'),
};

export function createModules(env) {
  const { app, tr, h, esc, btn, mark } = env;
  let storageOK = true;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { storageOK = false; }
  const prefersCalm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const study = {
    packId: saved.packId || 'general', notes: saved.notes || '', lowfx: !!saved.lowfx, calm: saved.calm === undefined ? prefersCalm : !!saved.calm,
    done: saved.done || {}, review: saved.review && saved.review.recs ? { ...newState(), ...saved.review, cfg: { ...DEFAULTS, ...(saved.review.cfg || {}) } } : newState(),
  };
  app.study = study;
  app.pack = GENERAL;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(study)); } catch (e) { storageOK = false; } };
  const es = () => getLang() === 'es';
  const dirty = () => env.dirty();
  const txt = (o, vars) => tr(o, vars);

  // ---- labels (pack vocabulary) ------------------------------------------
  const labels = (starter) => labelsFor(app.pack, starter);
  const cap = (s) => s.replace(/(^|[.!?:]\s+)([a-zñáéíóú])/g, (m, a, b) => a + b.toUpperCase());
  const fill = (o, starter, vars) => cap(tr(o, vars).replace(/\{(\w+)\}/g, (m, k) => { const l = labels(starter)[k]; return l ? tr(l.t) : m; }));
  const refOf = (id, starter) => { const l = labels(starter)[id]; return l ? l.ref : id; };
  const kindName = (kind) => txt({ sw: T('maintained switch', 'interruptor mantenido'), pb_no: T('pushbutton, NO', 'pulsador NA'), pb_nc: T('pushbutton, NC', 'pulsador NC'), ol_nc: T('overload contact, NC', 'contacto de sobrecarga NC'), k_no: T('auxiliary contact, NO', 'contacto auxiliar NA'), lamp: app.pack.load === 'coil' ? T('valve coil', 'bobina de válvula') : T('lamp', 'lámpara'), coil: T('coil', 'bobina') }[kind]);
  const partName = (p, starter) => (p.kind === 'k_no' ? kindName(p.kind) : `${tr(labels(starter)[p.id].name)} — ${kindName(p.kind)}`);
  const usesFallback = (starter) => starter && !(app.pack.supports && app.pack.supports.starter);

  function selectPack(id) {
    app.packLoading = id; app.packError = false; dirty();
    loadPack(id).then((p) => { app.pack = p; study.packId = id; app.packLoading = null; persist(); bdStart(bd.ex); vr.stage = 'intro'; dirty(); })
      .catch(() => { app.packLoading = null; app.packError = true; dirty(); });
  }
  if (study.packId !== 'general') loadPack(study.packId).then((p) => { app.pack = p; dirty(); }).catch(() => { study.packId = 'general'; });

  // ---- Build a Circuit ----------------------------------------------------
  const bd = { ex: 'A' };
  app.bd = bd;
  const ex = () => EXERCISES[bd.ex];
  function bdStart(id) {
    Object.assign(bd, { ex: id, design: emptyDesign(id), hist: [], fut: [], sel: null, tool: null, wireFrom: null, cursor: [3, 1], hint: 0, revealed: false, issues: null, results: null, rt: null, msg: null, recorded: false });
  }
  bdStart('A');
  const invalidate = () => { bd.issues = null; bd.results = null; bd.rt = null; };
  function mutate(fn) {
    bd.hist.push(JSON.stringify(bd.design)); if (bd.hist.length > 80) bd.hist.shift();
    bd.fut = []; fn(bd.design); invalidate(); dirty();
  }
  function place(id, cx, cy) {
    const part = ex().parts.find((p) => p.id === id);
    const cur = bd.design.comps.find((c) => c.id === id);
    const c = { id, kind: part.kind, rot: cur ? cur.rot : 0, ...(cur && cur.ref ? { ref: cur.ref } : {}) };
    c.x = c.rot ? cx : cx - 1; c.y = c.rot ? cy - 1 : cy;
    if (!canPlace(bd.design, c)) { bd.msg = txt(X.msgNoSpot); dirty(); return false; }
    mutate((d) => { d.comps = d.comps.filter((o) => o.id !== id); d.comps.push(c); });
    bd.tool = null; bd.sel = id; bd.msg = null;
    return true;
  }
  function addWire(a, b) {
    if (a === b) return;
    const rail = (t) => (t.includes('@') ? t[0] : null);
    if (rail(a) && rail(a) === rail(b)) return;
    if (bd.design.wires.some((w) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a))) return;
    mutate((d) => d.wires.push([a, b]));
  }
  function termClick(t) {
    if (bd.wireFrom && bd.wireFrom !== t) { addWire(bd.wireFrom, t); bd.wireFrom = null; } else bd.wireFrom = bd.wireFrom === t ? null : t;
    bd.tool = null; bd.sel = null; dirty();
  }
  function removeSel() {
    const s = bd.sel; if (!s) return;
    if (s[0] === 'w' && /^w\d+$/.test(s)) mutate((d) => d.wires.splice(Number(s.slice(1)), 1));
    else mutate((d) => { d.comps = d.comps.filter((c) => c.id !== s); d.wires = d.wires.filter((w) => !w.some((t) => t.startsWith(`${s}.`))); });
    bd.sel = null;
  }
  function rotateSel() {
    const c = bd.design.comps.find((o) => o.id === bd.sel); if (!c) return;
    const n = { ...c, rot: c.rot ? 0 : 1 };
    if (!canPlace(bd.design, n)) { bd.msg = txt(X.msgNoSpot); dirty(); return; }
    mutate((d) => { d.comps.find((o) => o.id === c.id).rot = n.rot; });
  }
  function nudge(dx, dy) {
    const c = bd.design.comps.find((o) => o.id === bd.sel);
    if (!c) { bd.cursor = [Math.max(1, Math.min(GRID.cols - 1, bd.cursor[0] + dx)), Math.max(0, Math.min(GRID.rows, bd.cursor[1] + dy))]; dirty(); return; }
    const n = { ...c, x: c.x + dx, y: c.y + dy };
    if (canPlace(bd.design, n)) mutate((d) => { Object.assign(d.comps.find((o) => o.id === c.id), { x: n.x, y: n.y }); });
  }
  function bdCheck() {
    bd.issues = precheck(bd.design, ex());
    bd.results = null;
    bd.rt = bd.issues.length ? null : createRuntime(bd.design);
    dirty();
  }
  function bdTests() {
    if (!bd.rt) return;
    bd.results = runTests(bd.design, ex());
    bd.rt = createRuntime(bd.design);
    if (bd.results.every((r) => r.pass)) {
      study.done[bd.ex] = true;
      if (!bd.recorded) { bd.recorded = true; ex().concepts.forEach((c) => record(study.review, c, { correct: !bd.revealed, hint: bd.hint > 0 }, Date.now())); }
      persist();
    }
    dirty();
  }
  const issueText = (i, starter) => {
    const list = (i.where || []).map((id) => (id === 'KA' ? kindName('k_no') : refOf(id, starter))).join(', ');
    return fill(ISSUE_TEXT[i.code], starter, { list, ref: i.ref ? refOf(i.ref, true) : '', want: i.want ? refOf(i.want, true) : '' });
  };

  // ---- shared device operation -------------------------------------------
  const rtNow = () => (app.mode === 'verify' ? vr.rt : app.mode === 'build' ? bd.rt : null);
  function operate(type, id) {
    const rt = rtNow();
    if (!rt) { bd.msg = txt(X.notWired); dirty(); return; }
    if (app.mode === 'verify') vrOperate(type, id); else rt.act(type, id);
    dirty();
  }
  function stationClick(id) {
    const rt = rtNow(); if (!rt) { operate(); return; }
    if (id === 'Q1') operate(rt.dev.power ? 'powerOff' : 'powerOn');
    else if (id === 'SA' || id === 'SB') operate('toggle', id);
    else if (id === 'START' || id === 'STOP') operate(rt.dev.pressed[id] ? 'release' : 'press', id);
    else if (id === 'F1test') operate('trip'); else if (id === 'F1reset') operate('reset');
  }
  function stationState() {
    if (app.mode !== 'build' && app.mode !== 'verify') return { show: false };
    const starter = app.mode === 'verify' || ex().starter;
    const rt = rtNow();
    const L = (id) => refOf(id, starter);
    const cyl = !starter && app.pack.actuator === 'cylinder';
    const parts = starter ? { Q1: 1, STOP: 1, START: 1, F1: 1, K1: 1, M1: 1 } : { Q1: 1, SA: 1, SB: bd.ex !== 'A', H1: 1, M1: cyl };
    const dev = rt ? rt.dev : { power: true, on: {}, pressed: {}, tripped: false, K: {} };
    const lamp = !!rt && !starter && rt.loadOn('H1'); const k1 = !!rt && starter && rt.loadOn('K1');
    const state = { power: dev.power, lock: dev.lock, on: dev.on, pressed: dev.pressed, tripped: dev.tripped, K1: k1, lamp, act: starter ? k1 : lamp };
    const oc = (b) => txt(b ? UIX.closed : UIX.open);
    const lab = {
      Q1: `${L('Q1')}: ${dev.power ? 'ON' : 'OFF'}${dev.lock ? (es() ? ' · CANDADO' : ' · LOCKED') : ''}`,
      SA: `${L('SA')}: ${oc(dev.on.SA)}`, SB: `${L('SB')}: ${oc(dev.on.SB)}`,
      START: `START: ${dev.pressed.START ? (es() ? 'PULSADO' : 'PRESSED') : (es() ? 'SUELTO' : 'RELEASED')}`,
      STOP: `STOP: ${dev.pressed.STOP ? (es() ? 'PULSADO' : 'PRESSED') : (es() ? 'SUELTO' : 'RELEASED')}`,
      F1: `${L('F1')}: ${dev.tripped ? (es() ? 'DISPARADO' : 'TRIPPED') : 'NORMAL'}`,
      K1: `${L('K1')}: ${k1 ? (es() ? 'ENERGIZADO' : 'ENERGIZED') : (es() ? 'SIN ENERGÍA' : 'DE-ENERGIZED')}`,
      H1: `${L('H1')}: ${lamp ? 'ON' : 'OFF'}`,
      M1: cyl ? `${L('M1')}: ${lamp ? (es() ? 'AVANZADO' : 'EXTENDED') : (es() ? 'RETRAÍDO' : 'RETRACTED')}` : `${L('M1')}: ${k1 ? (es() ? 'EN MARCHA' : 'RUNNING') : (es() ? 'PARADO' : 'STOPPED')}`,
    };
    return { show: true, parts, labels: lab, state, actuator: cyl ? 'cylinder' : 'motor', title: `${tr(NOTICE)}${rt ? '' : ` · ${txt(X.notWired)}`}` };
  }
  const UIX = { closed: T('CLOSED', 'CERRADO'), open: T('OPEN', 'ABIERTO') };

  function deviceButtons(starter) {
    const rt = rtNow(); if (!rt) return '';
    const d = rt.dev; const L = (id) => refOf(id, starter);
    const b = (type, id, label, pressed) => btn('m-op', label, `data-t="${type}" data-id="${id || ''}" aria-pressed="${!!pressed}"`);
    let out = '';
    if (starter) {
      out += b(d.pressed.START ? 'release' : 'press', 'START', d.pressed.START ? (es() ? 'Soltar START' : 'Release START') : (es() ? 'Pulsar START' : 'Press START'), d.pressed.START);
      out += b(d.pressed.STOP ? 'release' : 'press', 'STOP', d.pressed.STOP ? (es() ? 'Soltar STOP' : 'Release STOP') : (es() ? 'Pulsar STOP' : 'Press STOP'), d.pressed.STOP);
      out += b('trip', '', es() ? 'Sobrecarga: TEST (disparo simulado)' : 'Overload: TEST (simulated trip)') + b('reset', '', es() ? 'Sobrecarga: RESET' : 'Overload: RESET');
    } else {
      out += b('toggle', 'SA', `${L('SA')}: ${txt(d.on.SA ? UIX.closed : UIX.open)}`, d.on.SA);
      if (bd.ex !== 'A') out += b('toggle', 'SB', `${L('SB')}: ${txt(d.on.SB ? UIX.closed : UIX.open)}`, d.on.SB);
    }
    out += b(d.power ? 'powerOff' : 'powerOn', '', txt(d.power ? X.pOff : X.pOn));
    return out;
  }
  const schTexts = (starter) => ({ closed: txt(X.closed), open: txt(X.open_), on: 'ON', off: txt(X.off), wire: txt(X.wire), point: txt(X.point), title: txt(X.vSch), power: fill(X.power, starter), refPoint: txt(X.refPoint) });

  // ---- workspace (drawn over the stage) -----------------------------------
  function workHTML() {
    if (app.mode !== 'build' && app.mode !== 'verify') return '';
    const view = app.workView || 'both';
    const tabs = `<div class="tabs" role="group">${[['sch', X.vSch], ['3d', X.v3d], ['both', X.vBoth]].map(([v, l]) => btn('m-view', txt(l), `data-v="${v}" aria-pressed="${view === v}"`)).join('')}</div>`;
    if (app.mode === 'verify') {
      const starter = true;
      return `<div class="work-head"><b>${txt(X.verify)}</b><span class="small">${tr(NOTICE)}</span>${tabs}</div>
        <div class="work-svg">${schematicSVG(EXERCISES.D.solution, { labels: labels(true), rt: vr.rt && { closed: vr.rt.nominalClosed, loadOn: vr.rt.loadOn, volts: () => 0 }, measure: vr.stage === 'diagnose' || vr.stage === 'isolate', starter, texts: schTexts(starter) })}</div>`;
    }
    const e = ex(); const starter = !!e.starter;
    const placed = (id) => bd.design.comps.some((c) => c.id === id);
    const pal = e.parts.map((p) => {
      const sym = KINDS[p.kind].load && p.kind === 'lamp' && app.pack.load === 'coil' ? 'coil' : KINDS[p.kind].sym;
      return `<button type="button" class="pal-item${placed(p.id) ? ' placed' : ''}" data-act="m-tool" data-id="${p.id}" data-drag="${p.id}" aria-pressed="${bd.tool === p.id}">${symbolSVG(sym, 62)}<span>${esc(partName(p, starter))}${placed(p.id) ? ' ✔' : ''}</span></button>`;
    }).join('');
    const selC = bd.design.comps.find((c) => c.id === bd.sel);
    const assign = selC && KINDS[selC.kind].relay ? `<label class="small">${txt(X.assign)} <select id="m-ref"><option value="">${txt(X.choose)}</option>${['K1', 'F1'].map((r) => `<option value="${r}"${selC.ref === r ? ' selected' : ''}>${esc(tr(labels(true)[r].name))}</option>`).join('')}</select></label>` : '';
    const tools = `${btn('m-rotate', txt(X.rotate), selC ? '' : 'disabled')}${btn('m-remove', txt(X.remove), bd.sel ? '' : 'disabled')}<span class="sep"></span>${btn('m-undo', txt(X.undo), bd.hist.length ? '' : 'disabled')}${btn('m-redo', txt(X.redo), bd.fut.length ? '' : 'disabled')}<span class="sep"></span>${btn('m-clear', txt(X.clear), bd.design.comps.length || bd.design.wires.length ? '' : 'disabled')}${btn('m-reset', txt(X.reset))}${assign}`;
    let msg = bd.msg || txt(X.msgIdle);
    if (bd.tool) msg = txt(X.msgTool, { p: partName(e.parts.find((p) => p.id === bd.tool), starter) });
    else if (bd.wireFrom) msg = txt(X.msgWire, { p: termName(bd.wireFrom, (id) => refOf(id, starter)) });
    else if (selC && !bd.msg) msg = txt(X.msgSel, { p: partName(e.parts.find((p) => p.id === selC.id), starter) });
    const hi = bd.hint >= 3 ? attention(bd.design, e, bd.issues || precheck(bd.design, e), bd.results) : null;
    return `<div class="work-head"><div class="pal" role="toolbar" aria-label="${txt(X.palette)}">${pal}</div>${tabs}</div>
      <div class="work-tools">${tools}</div><p class="work-msg" role="status">${esc(msg)}</p>
      <div class="work-svg" id="m-svg" tabindex="0" aria-label="${txt(X.vSch)}">${schematicSVG(bd.design, { labels: labels(starter), rt: bd.rt, sel: bd.sel, wireFrom: bd.wireFrom, cursor: bd.tool || (!bd.sel && bd.kb) ? bd.cursor : null, hi, edit: true, loadSym: app.pack.load === 'coil' ? 'coil' : null, starter, texts: schTexts(starter) })}</div>`;
  }

  function buildHTML() {
    const e = ex(); const starter = !!e.starter;
    const opts = Object.values(EXERCISES).map((x) => `<option value="${x.id}"${x.id === bd.ex ? ' selected' : ''}>${esc(fill(x.title, !!x.starter))}${study.done[x.id] ? ' ✔' : ''}</option>`).join('');
    let out = `<div class="card"><label class="small" for="m-ex">${txt(X.exercise)}</label><select id="m-ex" style="width:100%">${opts}</select>
      <p class="small">${tr(NOTICE)} · ${esc(tr(app.pack.name))}</p>${usesFallback(starter) ? `<p class="state info">${txt(X.packFallback)}</p>` : ''}
      <h3 style="margin-top:10px">${txt(X.required)}</h3><p style="margin:0">${esc(fill(e.behavior, starter))}</p>
      <h3 style="margin-top:10px">${txt(X.parts)}</h3><ul class="points">${e.parts.map((p) => `<li>${esc(partName(p, starter))}</li>`).join('')}</ul>
      <div class="btns">${btn('m-check', txt(X.check), '', 'primary')}${btn('m-tests', txt(X.runTests), bd.rt ? '' : 'disabled')}${btn('m-hint', `${txt(X.hint)} ${Math.min(bd.hint + 1, 3)}/3`, bd.hint >= 3 ? 'disabled' : '')}${bd.hint >= 3 ? btn('m-solution', txt(X.solution)) : ''}</div>`;
    if (bd.hint >= 1) out += `<div class="again"><b>${txt(X.hint1)}:</b><ul class="points">${e.tests.map((t) => `<li>${esc(fill(t.q, starter))} → ${txt(t.on ? (starter ? X.running : X.on) : (starter ? X.stopped : X.off))}</li>`).join('')}</ul></div>`;
    if (bd.hint >= 2) out += `<div class="again"><b>${txt(X.hint2)}:</b> ${esc(fill(e.principle, starter))}</div>`;
    if (bd.hint >= 3) out += `<div class="again"><b>${txt(X.hint3)}.</b> ${bd.design.comps.length ? '' : txt(X.hint3none)}</div>`;
    if (bd.revealed) out += `<p class="state info">${txt(X.revealed)}</p>`;
    out += '</div>';
    if (bd.issues && bd.issues.length) out += `<div class="card coach block" role="alert"><h2><span class="kind">${txt(X.blocked)}</span></h2><ul class="points">${bd.issues.map((i) => `<li>${esc(issueText(i, starter))}</li>`).join('')}</ul></div>`;
    if (bd.rt) {
      out += `<div class="card"><p class="state ok" style="margin-top:0">✔ ${txt(X.checkOK)}</p>${bd.rt.unstable ? `<p class="state bad">${txt(X.unstable)}</p>` : ''}<h3 style="margin-top:10px">${txt(X.operate)}</h3><div class="btns">${deviceButtons(starter)}</div></div>`;
    }
    if (bd.results) {
      const ok = bd.results.every((r) => r.pass);
      const word = (b) => txt(b ? (starter ? X.running : X.on) : (starter ? X.stopped : X.off));
      out += `<div class="card"><h3>${txt(X.testsTitle)}</h3><table class="log vt"><tr><th>${txt(X.question)}</th><th>${txt(X.expected)}</th><th>${txt(X.observed)}</th><th>${txt(X.result)}</th></tr>${bd.results.map((r) => `<tr><td>${esc(fill(r.q, starter))}</td><td>${word(r.expected)}</td><td>${r.unstable ? txt(X.unstable) : word(r.observed)}</td><td>${r.pass ? `✔ ${txt(X.pass)}` : `✘ ${txt(X.fail)}`}</td></tr>`).join('')}</table>
        <p class="state ${ok ? 'ok' : 'bad'}">${txt(ok ? X.allPass : X.somePass)}</p></div>`;
    }
    return out;
  }

  // ---- Verify a Repair ----------------------------------------------------
  const vr = { scn: 0, stage: 'intro' };
  app.vr = vr;
  const VD = EXERCISES.D.solution;
  const vfill = (o, vars) => fill(o, true, vars);
  const causeLabel = (id) => vfill(CAUSES.find((c) => c.id === id).label);
  const partLabel = (id) => (id === 'KA' ? `${kindName('k_no')} (${refOf('K1', true)})` : tr(labels(true)[id].name));
  function vrStart(i) {
    const s = SCENARIOS_V[i];
    Object.assign(vr, { scn: i, faults: { [s.fault]: true }, log: [], pick: null, judged: null, attempts: s.prior ? [{ part: s.prior, by: 'colleague', fixed: false }] : [], idx: 0, results: [], iso: [], note: null, final: null, ambiguous: false, failures: 0, wrongDiag: 0, recorded: false, lastRead: null });
    vr.rt = createRuntime(VD, vr.faults);
    vr.stage = s.prior ? 'verify' : 'diagnose';
  }
  function vrOperate(type, id) {
    const rt = vr.rt; const prev = rt.loadOn('K1');
    const ok = rt.act(type, id);
    vr.note = null;
    if (ok === false) { vr.note = txt(X.restoreFirst); return; }
    if (type === 'powerOn' || type === 'unlock') vr.iso = [];
    if (vr.stage === 'diagnose') { vr.log.push({ t: 'act', a: [type, id], run: rt.loadOn('K1') }); vr.judged = null; } else if (vr.stage === 'verify') {
      const c = CHECKS[vr.idx]; if (!c) return;
      if (c.trig[0] !== type || (c.trig[1] && c.trig[1] !== id)) return;
      if ((rt.dev.lock || !rt.dev.power) && c.id !== 'loss') { vr.note = txt(X.restoreFirst); return; }
      if (prev !== c.need) { vr.note = txt(X.precond, { t: vfill(c.how) }); return; }
      const observed = rt.loadOn('K1');
      vr.results.push({ id: c.id, expected: c.expect, observed, pass: observed === c.expect });
      if (observed !== c.expect) { vr.stage = 'failed'; vr.failures += 1; const a = vr.attempts[vr.attempts.length - 1]; if (a) a.unresolved = true; } else {
        vr.idx += 1;
        if (vr.idx >= CHECKS.length) vrFinish();
      }
    }
  }
  function vrMeasure(term) {
    const v = vr.rt.volts(term);
    vr.lastRead = { term, v };
    if (vr.stage === 'diagnose') { vr.log.push({ t: 'meas', term, v }); vr.judged = null; } else if (vr.stage === 'isolate') vr.iso.push({ term: term === 'REF' ? 'REF' : term.startsWith('L@') ? 'L' : term, v });
    dirty();
  }
  function isoSteps() {
    const rt = vr.rt; const s = vr.iso;
    const i = s.findIndex((e) => e.term === 'REF' && e.v > 20);
    const j = i < 0 ? -1 : s.findIndex((e, n) => n > i && e.term === 'L' && Math.abs(e.v) < 1);
    const k = j < 0 ? -1 : s.findIndex((e, n) => n > j && e.term === 'REF' && e.v > 20);
    const locked = rt.dev.lock;
    return [[X.iso1, !rt.loadOn('K1')], [X.iso2, !rt.dev.power], [X.iso3, locked], [X.iso4, locked && i >= 0], [X.iso5, locked && j >= 0], [X.iso6, locked && k >= 0]];
  }
  function vrJudge() {
    const fits = fitting(VD, vr.log);
    const r = replay(VD, vr.pick, vr.log);
    const bad = vr.log.findIndex((e, n) => (e.t === 'act' ? r[n].run !== e.run : Math.abs(r[n].v - e.v) >= 2));
    vr.judged = { ok: fits.includes(vr.pick), unique: fits.length === 1, others: fits.filter((x) => x !== vr.pick), bad };
    if (!vr.judged.ok) vr.wrongDiag += 1;
  }
  function vrRepair() {
    if (!isoSteps().every((x) => x[1])) return;
    const fixed = !!vr.faults[vr.pick];
    vr.attempts.push({ part: vr.pick, by: 'you', fixed, ambiguous: vr.ambiguous });
    if (fixed) vr.faults = {};
    const rt = createRuntime(VD, vr.faults); rt.act('powerOff'); rt.act('lock');
    Object.assign(vr, { rt, stage: 'verify', idx: 0, results: [], iso: [], note: null, lastRead: null });
  }
  function vrFinish() {
    vr.stage = 'report';
    if (!vr.recorded) {
      vr.recorded = true;
      const mine = vr.attempts.filter((a) => a.by === 'you');
      record(study.review, 'verify', { correct: mine.every((a) => a.fixed), hint: false }, Date.now());
      record(study.review, 'diag', { correct: vr.wrongDiag === 0 && mine.every((a) => a.fixed && !a.ambiguous), hint: false }, Date.now());
      persist();
    }
  }
  const evText = (e) => {
    if (e.t === 'meas') return `${termName(e.term, (id) => refOf(id, true))} → 0 V: ${e.v.toFixed(1)} V`;
    const [type, id] = e.a;
    const what = { press: es() ? `Pulsar ${id}` : `Press ${id}`, release: es() ? `Soltar ${id}` : `Release ${id}`, trip: es() ? 'Disparo de sobrecarga (TEST)' : 'Overload trip (TEST)', reset: es() ? 'Rearme de sobrecarga' : 'Overload reset', powerOff: txt(X.pOff), powerOn: txt(X.pOn), lock: txt(X.lock), unlock: txt(X.unlock), toggle: id }[type];
    return `${what} → ${refOf('M1', true)} ${txt(e.run ? X.running : X.stopped)}`;
  };
  const evList = (log) => (log.length ? `<ol class="points">${log.map((e) => `<li>${esc(evText(e))}</li>`).join('')}</ol>` : `<p class="small">${txt(X.noEvidence)}</p>`);
  function checksTable() {
    const run = (b) => `${refOf('M1', true)} ${txt(b ? X.running : X.stopped)}`;
    return `<table class="log vt"><tr><th>${txt(X.test)}</th><th>${txt(X.expected)}</th><th>${txt(X.observed)}</th><th>${txt(X.pf)}</th></tr>${CHECKS.map((c, n) => {
      const r = vr.results.find((x) => x.id === c.id);
      return `<tr class="${n === vr.idx && vr.stage === 'verify' ? 'cur' : ''}"><td>${esc(vfill(c.test))}</td><td>${run(c.expect)}</td><td>${r ? run(r.observed) : '—'}</td><td>${r ? (r.pass ? `✔ ${txt(X.pass)}` : `✘ ${txt(X.fail)}`) : txt(X.notTested)}</td></tr>`;
    }).join('')}</table>`;
  }
  const attemptText = (a) => `${vfill(a.by === 'you' ? X.youRepl : X.inherited, { p: partLabel(a.part) })} ${a.unresolved || !a.fixed ? txt(X.unresolved) : ''}`;
  function verifyHTML() {
    const s = SCENARIOS_V[vr.scn];
    if (vr.stage === 'intro') {
      return `<div class="card"><p>${txt(X.verifySub)}</p><p class="small">${tr(NOTICE)}</p>${usesFallback(true) ? `<p class="state info">${txt(X.packFallback)}</p>` : ''}
        <div class="opts">${SCENARIOS_V.map((x, i) => `<div class="box"><p class="q">${txt(X.scenario)} ${i + 1}</p><p>${esc(vfill(x.symptom))}</p>${btn('m-vstart', txt(X.start), `data-i="${i}"`, 'primary')}</div>`).join('')}</div>
        <p class="small">${txt(X.scope)}</p></div>`;
    }
    const steps = `<ol class="seq">${[X.stDiag, X.stIso, X.stVer, X.stRep].map((t, n) => `<li class="${['diagnose', 'isolate', 'verify', 'report'].indexOf(vr.stage === 'failed' ? 'verify' : vr.stage) === n ? 'cur' : ''}">${txt(t).replace(/^\d · /, '')}</li>`).join('')}</ol>`;
    let out = `<div class="card"><h3>${txt(X.symptom)}</h3><p style="margin:0">${esc(vfill(s.symptom))}</p>${vr.attempts.length ? `<ul class="points">${vr.attempts.map((a) => `<li>${esc(attemptText(a))}</li>`).join('')}</ul>` : ''}${steps}</div>`;
    const read = vr.lastRead ? `<p class="state info" role="status">${txt(X.reads, { v: `${vr.lastRead.v.toFixed(1)} V` })} (${esc(termName(vr.lastRead.term, (id) => refOf(id, true)))})</p>` : '';
    if (vr.stage === 'diagnose') {
      const j = vr.judged;
      out += `<div class="card"><h2>${txt(X.stDiag)}</h2><p>${txt(X.diagHow)}</p><div class="btns">${deviceButtons(true)}</div>${read}
        <h3 style="margin-top:10px">${txt(X.evidence)}</h3>${evList(vr.log)}
        <h3 style="margin-top:10px">${txt(X.cause)}</h3><div class="opts">${CAUSES.map((c) => btn('m-cause', esc(vfill(c.label)), `data-id="${c.id}" aria-pressed="${vr.pick === c.id}"`, vr.pick === c.id ? 'picked' : '')).join('')}</div>
        <div class="btns">${btn('m-judge', txt(X.judge), vr.pick ? '' : 'disabled', 'primary')}</div>`;
      if (j) {
        if (!j.ok) out += `<p class="state bad">${txt(X.jContra, { e: esc(evText(vr.log[j.bad])) })}</p>`;
        else if (!j.unique) out += `<p class="state info">${txt(X.jAmbig, { o: j.others.map(causeLabel).map(esc).join('; ') })}</p><div class="btns">${btn('m-toiso', txt(X.anyway), 'data-amb="1"')}</div>`;
        else out += `<p class="state ok">${txt(X.jUnique)}</p><div class="btns">${btn('m-toiso', txt(X.toIso), '', 'primary')}</div>`;
      }
      out += '</div>';
    } else if (vr.stage === 'isolate') {
      const st = isoSteps(); const d = vr.rt.dev;
      out += `<div class="card"><h2>${txt(X.stIso)}</h2><p>${txt(X.isoIntro)}</p><ul class="subs">${st.map(([t, ok]) => `<li>${mark(ok)}<span>${esc(vfill(t))}</span></li>`).join('')}</ul>
        <div class="btns">${deviceButtons(true)}${btn('m-op', txt(d.lock ? X.unlock : X.lock), `data-t="${d.lock ? 'unlock' : 'lock'}" ${d.power ? 'disabled' : ''}`)}${btn('m-meas', txt(X.tRef), 'data-term="REF"')}${btn('m-meas', txt(X.tRail), 'data-term="L@0"')}</div>${read}
        <div class="btns">${btn('m-repair', esc(txt(X.doRepair, { p: partLabel(vr.pick) })), st.every((x) => x[1]) ? '' : 'disabled', 'primary')}</div><p class="small">${txt(X.scope)}</p></div>`;
    } else if (vr.stage === 'verify' || vr.stage === 'failed') {
      const c = CHECKS[vr.idx]; const d = vr.rt.dev;
      out += `<div class="card"><h2>${txt(X.stVer)}</h2><p>${txt(X.verIntro)}</p>${checksTable()}`;
      if (vr.stage === 'failed') out += `<p class="state bad" role="alert">${txt(X.verFail)}</p><div class="btns">${btn('m-rediag', txt(X.rediag), '', 'primary')}</div>`;
      else out += `<p class="state info" role="status"><b>${txt(X.nextCheck)}:</b> ${esc(vfill(c.test))} — ${esc(vfill(c.how))}</p>${vr.note ? `<p class="state bad">${esc(vr.note)}</p>` : ''}
        <div class="btns">${deviceButtons(true)}${d.lock || !d.power ? btn('m-op', txt(X.unlock), `data-t="unlock" ${d.lock ? '' : 'disabled'}`) : ''}</div>`;
      out += `<p class="small">${txt(X.scope)}</p></div>`;
    } else {
      const mine = vr.attempts.filter((a) => a.by === 'you');
      const good = mine[mine.length - 1];
      out += `<div class="card rep"><h2>${txt(X.stRep)}</h2>
        <h3>${txt(X.rSymptom)}</h3><p style="margin:0">${esc(vfill(s.symptom))}</p>
        <h3>${txt(X.rEvidence)}</h3>${evList(vr.final || [])}<p style="margin:4px 0 0"><b>${txt(X.cause)}:</b> ${esc(causeLabel(good.part))}</p>
        <h3>${txt(X.rRepair)}</h3><ul class="points">${vr.attempts.map((a) => `<li>${esc(attemptText(a))}${a === good ? ` ${txt(X.resolved)}` : ''}</li>`).join('')}</ul>
        <h3>${txt(X.rVerify)}</h3>${checksTable()}
        <h3>${txt(X.rUncert)}</h3><ul class="points"><li>${txt(X.uWhy)}</li>${good.ambiguous ? `<li>${txt(X.uAmbig)}</li>` : ''}<li>${txt(X.scope)}</li></ul>
        <div class="btns">${btn('m-vintro', txt(X.another), '', 'primary')}${btn('m-go', txt(X.review), 'data-mode="review"')}</div></div>`;
    }
    return out;
  }

  // ---- Equipment Packs ----------------------------------------------------
  function packsHTML() {
    const p = app.pack;
    const src = p.source && p.source.kind === 'verified' ? txt(X.verified, { s: esc(p.source.reference || p.source.by || '') }) : tr(NOTICE);
    const list = PACK_LIST.map((x) => btn('m-pack', `${esc(tr(x.name))}${x.id === 'general' ? (es() ? ' (por defecto)' : ' (default)') : ''}`, `data-id="${x.id}" aria-pressed="${p.id === x.id}"`, p.id === x.id ? 'picked' : '')).join('');
    const sect = (title, body) => `<h3 style="margin-top:12px">${title}</h3>${body}`;
    const ul = (items) => `<ul class="points">${items.map((i) => `<li>${esc(tr(i))}</li>`).join('')}</ul>`;
    const checks = [...p.checks.ids.map((id) => fill(CHECKS.find((c) => c.id === id).test, true)), ...p.checks.extra.map((e) => tr(e))];
    const rec = CLOSEST.find((c) => c.id === app.closest);
    return `<div class="card"><h3>${txt(X.selectPack)}</h3><div class="opts">${list}</div>
        ${app.packLoading ? `<p class="state info" role="status">${txt(X.loading)}</p>` : ''}${app.packError ? `<p class="state bad" role="alert">${txt(X.loadFail)}</p>` : ''}
        <label class="small" for="m-closest" style="display:block;margin-top:10px">${txt(X.notListed)}</label><select id="m-closest" style="width:100%"><option value="">${txt(X.choose)}</option>${CLOSEST.map((c) => `<option value="${c.id}"${app.closest === c.id ? ' selected' : ''}>${esc(tr(c.name))}</option>`).join('')}</select>
        ${rec ? `<div class="again"><b>${txt(X.closest, { p: esc(tr(PACK_LIST.find((x) => x.id === rec.pack).name)) })}</b> ${btn('m-pack', txt(X.open), `data-id="${rec.pack}"`)}<br><b>${txt(X.limits)}:</b> ${esc(tr(rec.limit))}</div>` : ''}</div>
      <div class="card"><h2>${esc(tr(p.name))}</h2><p class="state info" style="margin-top:0">${src}</p><p>${esc(tr(p.summary))}</p>
        ${sect(txt(X.glossary), `<dl class="gloss">${p.glossary.map(([a, b]) => `<div><dt>${esc(tr(a))}</dt><dd>${esc(tr(b))}</dd></div>`).join('')}</dl>`)}
        ${sect(txt(X.models), ul(p.models))}
        ${sect(txt(X.legend), `<ul class="legend">${p.legend.map(([s, t]) => `<li>${symbolSVG(s, 70)}<span>${esc(tr(t))}</span></li>`).join('')}</ul>`)}
        ${sect(txt(X.scenarios), `<div class="opts">${p.scenarios.map((s, i) => `<div class="box"><p class="q">${esc(tr(s.title))}</p><p>${esc(tr(s.text))}</p>${btn('m-scn', txt(X.open), `data-i="${i}"`, 'primary')}</div>`).join('')}</div>`)}
        ${sect(txt(X.behavior), ul(p.behavior))}
        ${sect(txt(X.vchecks), `<ul class="points">${checks.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`)}
        ${sect(txt(X.interview), p.interview.map((q) => `<details class="iq"><summary>${esc(tr(q.q))}</summary><p><b>${txt(X.answer)}:</b> ${esc(tr(q.a))}</p></details>`).join(''))}</div>
      <div class="card"><h3><label for="m-notes">${txt(X.notes)}</label></h3><p class="small" style="margin-top:0">${txt(X.notesHelp)}</p><textarea id="m-notes" rows="5" style="width:100%">${esc(study.notes)}</textarea><p class="small">${txt(storageOK ? X.storageOK : X.storageNo)}</p></div>`;
  }
  function openScenario(i) {
    const g = app.pack.scenarios[i].go;
    if (g.mode === 'build') { env.setMode('build'); bdStart(g.ex); } else if (g.mode === 'verify') { env.setMode('verify'); vrStart(g.scn); } else if (g.mode === 'diagnose') env.openDiagnose(g.scn); else if (g.mode === 'lesson') env.openLesson(g.i);
    dirty();
  }

  // ---- Review Due ---------------------------------------------------------
  const rv = { session: null };
  app.rv = rv;
  const cname = (id) => tr(CONCEPTS.find((c) => c.id === id).name);
  const bank = () => [...QUESTIONS, ...((app.pack.review) || [])];
  const span = (ms) => {
    const m = Math.round(ms / 60000);
    if (m < 1) return txt(X.now);
    if (m < 90) return `${m} min`;
    if (m < 2880) return `${Math.round(m / 60)} h`;
    return `${Math.round(m / 1440)} ${es() ? 'días' : 'days'}`;
  };
  function rvNext() {
    const s = rv.session;
    if (s.i >= s.queue.length) { s.over = true; persist(); return; }
    const q = pickQuestion(study.review, s.queue[s.i], s.used, bank());
    s.used.push(q.id);
    Object.assign(s, { q, choices: shuffled(q.ch), pick: null, conf: null, hint: false, answered: null });
  }
  function rvStart(kind) {
    const queue = buildSession(study.review, Date.now(), kind);
    rv.session = { kind, queue, i: 0, used: [], results: [], over: false };
    rvNext();
  }
  function rvCheck() {
    const s = rv.session; if (!s.pick || !s.conf || s.answered) return;
    const correct = s.pick === answerOf(s.q);
    const r = record(study.review, s.q.c, { correct, hint: s.hint, conf: s.conf }, Date.now());
    s.answered = { correct, outcome: r.outcome, due: r.due };
    s.results.push(correct);
    if (!correct) {
      const gap = Math.max(1, study.review.cfg.gap - (s.conf === 'high' ? 1 : 0));
      s.queue.splice(Math.min(s.queue.length, s.i + 1 + gap), 0, s.q.c);
    }
    persist();
  }
  function figureHTML(q) {
    if (!q.fig) return '';
    if (q.fig.sym) return `<div class="fig">${symbolSVG(q.fig.sym, 150)}</div>`;
    const e = EXERCISES[q.fig.ex]; const rt = createRuntime(e.solution);
    q.fig.acts.forEach((a) => rt.act(a[0], a[1]));
    // the figure shows contact states only, never the load's state (that is the question)
    const mask = { ...rt, loadOn: () => false, volts: () => 0, closed: rt.closed };
    const rows = Math.max(...e.solution.comps.map((c) => c.y)) + 1;
    return `<div class="fig">${schematicSVG(e.solution, { rows, labels: labels(!!e.starter), rt: mask, loadSym: app.pack.load === 'coil' ? 'coil' : null, starter: false, texts: { ...schTexts(!!e.starter), on: '?', off: '?' } })}</div>`;
  }
  function reviewHTML() {
    const st = study.review; const now = Date.now();
    const s = rv.session;
    if (s && !s.over) {
      const q = s.q; const starter = !!(q.fig && q.fig.ex && EXERCISES[q.fig.ex].starter) || /\{(START|STOP|K1|F1|M1)\}/.test(q.p.en);
      const a = s.answered; const key = a ? answerOf(q) : null;
      let out = `<div class="card"><p class="small" style="margin:0">${txt(X.qOf, { i: s.i + 1, n: s.queue.length })} · ${esc(cname(q.c))}</p>${figureHTML(q)}<p class="q" style="font-weight:600">${esc(fill(q.p, starter))}</p>
        <div class="opts">${s.choices.map(([k, t]) => btn('m-pick', esc(fill(t, starter)), `data-k="${k}" aria-pressed="${s.pick === k}" ${a ? 'disabled' : ''}`, a ? (k === key ? 'right' : k === s.pick ? 'wrong' : '') : s.pick === k ? 'picked' : '')).join('')}</div>`;
      if (!a) {
        out += `<p class="small" style="margin-bottom:4px">${txt(X.sure)}</p><div class="btns" style="margin-top:0">${[['low', X.c1], ['mid', X.c2], ['high', X.c3]].map(([k, l]) => btn('m-conf', txt(l), `data-k="${k}" aria-pressed="${s.conf === k}"`)).join('')}</div>
          ${s.hint ? `<div class="again">${esc(fill(q.h, starter))}</div>` : ''}
          <div class="btns">${btn('m-rvcheck', txt(X.checkAns), s.pick && s.conf ? '' : 'disabled', 'primary')}${s.hint ? '' : btn('m-rvhint', txt(X.hint))}${btn('m-rvstop', txt(X.stop))}</div>`;
      } else {
        const when = span(a.due - Date.now());
        out += `<p class="state ${a.correct ? 'ok' : 'bad'}" role="status">${a.correct ? `✔ ${txt(X.right)}` : `✘ ${txt(X.wrong)}`} ${txt(X.sched[a.outcome], { t: when })}</p><div class="again">${esc(fill(q.x, starter))}</div>
          ${!a.correct ? `<p class="small">${s.conf === 'high' ? `${txt(X.confWrong)} ` : ''}${txt(X.again)}</p>` : ''}
          <div class="btns">${btn('m-rvnext', txt(s.i + 1 >= s.queue.length ? X.finish : X.next), '', 'primary')}</div>`;
      }
      return `${out}</div>`;
    }
    let out = '';
    if (s && s.over) {
      out += `<div class="card"><h2>✔ ${txt(X.done)}</h2><p>${txt(X.score, { a: s.results.filter(Boolean).length, n: s.results.length })}</p>`;
      if (s.kind === 'interview') {
        out += `<h3>${txt(X.interview)} — ${esc(tr(app.pack.name))}</h3>${app.pack.interview.map((q) => `<details class="iq"><summary>${esc(tr(q.q))}</summary><p><b>${txt(X.answer)}:</b> ${esc(tr(q.a))}</p></details>`).join('')}
          <h3 style="margin-top:12px">${txt(X.yourNotes)}</h3>${study.notes.trim() ? `<pre class="notes">${esc(study.notes)}</pre>` : `<p class="small">${txt(X.noNotes)}</p>`}`;
      }
      out += `<div class="btns">${btn('m-rvclose', txt(X.backDue), '', 'primary')}</div></div>`;
      return out;
    }
    const due = dueList(st, now); const weak = weakest(st).slice(0, 3);
    const five = buildSession(st, now, 'five'); const all = buildSession(st, now, 'interview');
    const row = (id) => {
      const r = st.recs[id];
      const info = !r ? txt(X.never) : `${Math.round(accuracy(r) * 100)}% · ${r.due <= now ? txt(X.dueTitle).toLowerCase() : txt(X.nextIn, { t: span(r.due - now) })}`;
      return `<li><span>${r && r.priority ? '⚑ ' : ''}${esc(cname(id))}</span><span class="small">${info}</span></li>`;
    };
    out += `<div class="card rep"><h3>${txt(X.dueTitle)} (${due.length})</h3>${due.length ? `<ul>${due.map(row).join('')}</ul>` : `<p>${txt(X.nothingDue)}</p>`}
      <h3>${txt(X.weak)}</h3><ul>${weak.map(row).join('')}</ul>
      <div class="btns">${btn('m-rvstart', `${txt(X.five)} · ${five.length}`, 'data-k="five"', 'primary')}${btn('m-rvstart', `${txt(X.before)} · ${all.length}`, 'data-k="interview"')}</div>
      <p class="small">${txt(X.est, { n: estimateMinutes(st, five.length) })} / ${txt(X.est, { n: estimateMinutes(st, all.length) })} · ${esc(tr(app.pack.name))}</p>
      <p class="small">${txt(storageOK ? X.storageOK : X.storageNo)}</p></div>
      <details class="card" id="m-sched" ${app.schedOpen ? 'open' : ''}><summary>${txt(X.schedule)}</summary><p class="small">${txt(X.schedNote)}</p><div class="cfg">${Object.keys(DEFAULTS).map((k) => `<label for="m-cfg-${k}">${txt(X.cfg[k])}<input type="text" inputmode="numeric" id="m-cfg-${k}" data-cfg="${k}" value="${st.cfg[k]}"></label>`).join('')}</div><div class="btns">${btn('m-cfgreset', txt(X.restore))}</div></details>
      <details class="card" id="m-backup" ${app.backupOpen ? 'open' : ''}><summary>${txt(X.backup)}</summary><p class="small">${txt(X.backupHelp)}</p><textarea id="m-export" rows="4" style="width:100%">${app.backupOpen ? esc(JSON.stringify({ app: 'voltage-lab', v: 1, study })) : ''}</textarea><div class="btns">${btn('m-copy', txt(X.copy))}${btn('m-import', txt(X.import_))}</div>${app.backupMsg ? `<p class="state info" role="status">${esc(app.backupMsg)}</p>` : ''}</details>`;
    return out;
  }

  // ---- dashboard ----------------------------------------------------------
  function homeHTML() {
    const due = dueList(study.review, Date.now()).length;
    const card = (title, sub, act, attrs, extra = '') => `<div class="dash-item"><div><b>${esc(title)}</b>${extra}<p class="small" style="margin:2px 0 0">${esc(sub)}</p></div>${btn(act, txt(X.open), attrs, 'primary')}</div>`;
    return `<div class="card"><div class="dash">
        ${card(txt(X.lessons), txt(X.lessonsSub), 'm-go', 'data-mode="guided"')}
        ${card(txt(X.dx), txt(X.dxSub), 'm-go', 'data-mode="diagnose"')}
        ${card(txt(X.build), txt(X.buildSub), 'm-go', 'data-mode="build"', ` <span class="small">${Object.keys(EXERCISES).filter((k) => study.done[k]).length}/4</span>`)}
        ${card(txt(X.verify), txt(X.verifySub), 'm-go', 'data-mode="verify"')}
        ${card(txt(X.packs), `${txt(X.current)}: ${tr(app.pack.name)}`, 'm-go', 'data-mode="packs"')}
        ${card(txt(X.review), txt(X.reviewSub), 'm-go', 'data-mode="review"', ` <span class="mark${due ? '' : ' ok'}">${txt(X.dueN, { n: due })}</span>`)}
        ${card(txt(X.assess), txt(X.assessSub), 'm-go', 'data-mode="assess"')}
      </div></div>
      <div class="card"><h3>${txt(X.settings)}</h3><div class="btns" style="margin-top:0">${btn('m-lowfx', `${txt(X.lowfx)}: ${tr(study.lowfx ? T('on', 'sí') : T('off', 'no'))}`, `aria-pressed="${study.lowfx}"`)}${btn('m-calm', `${txt(X.calm)}: ${tr(study.calm ? T('on', 'sí') : T('off', 'no'))}`, `aria-pressed="${study.calm}"`)}</div>
      <p class="small">${txt(storageOK ? X.storageOK : X.storageNo)}</p></div>`;
  }

  // ---- actions and input ----------------------------------------------------
  const actions = {
    'm-go': (d) => env.setMode(d.mode),
    'm-tool': (d) => { bd.tool = bd.tool === d.id ? null : d.id; bd.sel = null; bd.wireFrom = null; bd.msg = null; },
    'm-rotate': () => rotateSel(), 'm-remove': () => removeSel(),
    'm-undo': () => { if (bd.hist.length) { bd.fut.push(JSON.stringify(bd.design)); bd.design = JSON.parse(bd.hist.pop()); bd.sel = null; invalidate(); } },
    'm-redo': () => { if (bd.fut.length) { bd.hist.push(JSON.stringify(bd.design)); bd.design = JSON.parse(bd.fut.pop()); bd.sel = null; invalidate(); } },
    'm-clear': () => { mutate((d) => { d.comps = []; d.wires = []; }); bd.sel = null; },
    'm-reset': () => bdStart(bd.ex),
    'm-check': () => bdCheck(), 'm-tests': () => bdTests(),
    'm-hint': () => { bd.hint = Math.min(3, bd.hint + 1); },
    'm-solution': () => { mutate((d) => { const s = cloneDesign(ex().solution); d.comps = s.comps; d.wires = s.wires; }); bd.revealed = true; bd.sel = null; },
    'm-op': (d) => operate(d.t, d.id || undefined),
    'm-view': (d) => { app.workView = d.v; },
    'm-vstart': (d) => vrStart(Number(d.i)), 'm-vintro': () => { vr.stage = 'intro'; },
    'm-cause': (d) => { vr.pick = d.id; vr.judged = null; },
    'm-judge': () => vrJudge(),
    'm-toiso': (d) => { vr.ambiguous = !!d.amb; vr.final = [...vr.log]; vr.stage = 'isolate'; vr.iso = []; vr.lastRead = null; },
    'm-meas': (d) => vrMeasure(d.term), 'm-repair': () => vrRepair(),
    'm-rediag': () => { vr.rt = createRuntime(VD, vr.faults); Object.assign(vr, { stage: 'diagnose', log: [], pick: null, judged: null, lastRead: null, note: null }); },
    'm-pack': (d) => selectPack(d.id), 'm-scn': (d) => openScenario(Number(d.i)),
    'm-rvstart': (d) => rvStart(d.k), 'm-pick': (d) => { if (!rv.session.answered) rv.session.pick = d.k; }, 'm-conf': (d) => { rv.session.conf = d.k; },
    'm-rvhint': () => { rv.session.hint = true; }, 'm-rvcheck': () => rvCheck(),
    'm-rvnext': () => { rv.session.i += 1; rvNext(); }, 'm-rvstop': () => { rv.session = null; persist(); }, 'm-rvclose': () => { rv.session = null; },
    'm-cfgreset': () => { study.review.cfg = { ...DEFAULTS }; persist(); },
    'm-copy': () => {
      const ta = document.getElementById('m-export');
      const done = () => { app.backupMsg = txt(X.copied); dirty(); };
      const manual = () => { ta.focus(); ta.select(); app.backupMsg = txt(X.selectCopy); dirty(); };
      try { navigator.clipboard.writeText(ta.value).then(done, manual); } catch (e) { manual(); }
    },
    'm-import': () => {
      try {
        const data = JSON.parse(document.getElementById('m-export').value);
        if (data.app !== 'voltage-lab' || !data.study || !data.study.review) throw new Error('shape');
        Object.assign(study, { notes: String(data.study.notes || ''), done: data.study.done || {}, review: { ...newState(), ...data.study.review, cfg: { ...DEFAULTS, ...(data.study.review.cfg || {}) } } });
        persist(); app.backupMsg = txt(X.imported);
        if (data.study.packId && data.study.packId !== study.packId) selectPack(data.study.packId);
      } catch (e) { app.backupMsg = txt(X.importBad); }
    },
    'm-lowfx': () => { study.lowfx = !study.lowfx; persist(); }, 'm-calm': () => { study.calm = !study.calm; persist(); },
  };

  function onChange(t) {
    if (t.id === 'm-ex') bdStart(t.value);
    else if (t.id === 'm-ref') mutate((d) => { const c = d.comps.find((o) => o.id === bd.sel); if (c) { if (t.value) c.ref = t.value; else delete c.ref; } });
    else if (t.id === 'm-closest') app.closest = t.value;
    else if (t.dataset && t.dataset.cfg) { const n = Number(t.value); if (n > 0) { study.review.cfg[t.dataset.cfg] = n; persist(); } } else return false;
    return true;
  }
  function onInput(t) { if (t.id === 'm-notes') { study.notes = t.value; persist(); } }
  function onToggle(t) { if (t.id === 'm-sched') app.schedOpen = t.open; if (t.id === 'm-backup') { app.backupOpen = t.open; dirty(); } }

  // Pointer and keyboard handling for the schematic workspace.
  let drag = null; let swallow = 0;
  const inWork = (el) => el && el.closest && el.closest('#work');
  const svgEl = () => document.querySelector('#m-svg svg');
  function workClick(el, ev) {
    if (app.mode === 'verify') { const m = el.closest('[data-meas]'); if (m) vrMeasure(m.dataset.meas); return; }
    const term = el.closest('[data-term]'); const comp = el.closest('[data-comp]'); const wire = el.closest('[data-wire]');
    bd.msg = null;
    if (term) termClick(term.dataset.term);
    else if (comp && !bd.tool) { bd.sel = bd.sel === comp.dataset.comp ? null : comp.dataset.comp; bd.wireFrom = null; } else if (wire && !bd.tool) { bd.sel = `w${wire.dataset.wire}`; bd.wireFrom = null; } else if (el.closest('#m-svg')) {
      if (bd.tool && ev && svgEl()) { const c = cellAt(svgEl(), ev.clientX, ev.clientY); place(bd.tool, c[0], c[1]); } else { bd.sel = null; bd.wireFrom = null; }
    }
    dirty();
  }
  document.addEventListener('pointerdown', (e) => {
    if (app.mode !== 'build' || !inWork(e.target)) return;
    const pal = e.target.closest('[data-drag]'); const comp = e.target.closest('[data-comp]'); const term = e.target.closest('[data-term]');
    if (pal) drag = { kind: 'tool', id: pal.dataset.drag }; else if (term) drag = { kind: 'term', id: term.dataset.term }; else if (comp) drag = { kind: 'comp', id: comp.dataset.comp }; else return;
    drag.x = e.clientX; drag.y = e.clientY; drag.on = false;
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) { drag.on = true; if (drag.kind === 'term') bd.wireFrom = drag.id; else bd.tool = drag.id; }
    if (drag.on && drag.kind !== 'term' && svgEl()) { const c = cellAt(svgEl(), e.clientX, e.clientY); if (c[0] !== bd.cursor[0] || c[1] !== bd.cursor[1]) { bd.cursor = c; dirty(); } }
  });
  document.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const g = drag; drag = null;
    if (!g.on) return;
    swallow = Date.now();
    if (g.kind === 'term') {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const t = el && el.closest('[data-term]');
      if (t && t.dataset.term !== g.id) addWire(g.id, t.dataset.term);
      bd.wireFrom = null;
    } else if (svgEl()) {
      const r = svgEl().getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { const c = cellAt(svgEl(), e.clientX, e.clientY); place(g.id, c[0], c[1]); }
      bd.tool = null;
    }
    dirty();
  });
  document.addEventListener('click', (e) => {
    if (!inWork(e.target) || e.target.closest('[data-act]')) return;
    if (Date.now() - swallow < 250) return;
    workClick(e.target, e);
  });
  document.addEventListener('keydown', (e) => {
    if (!inWork(e.target) || (app.mode !== 'build' && app.mode !== 'verify')) return;
    if (e.target.matches('select, input, textarea, button')) return;
    const k = e.key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (app.mode === 'build' && e.target.id === 'm-svg') { if (bd.tool) place(bd.tool, bd.cursor[0], bd.cursor[1]); } else workClick(e.target, null);
      dirty(); return;
    }
    if (app.mode !== 'build') return;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[k]) { e.preventDefault(); bd.kb = true; nudge(arrows[k][0], arrows[k][1]); } else if (k === 'r' || k === 'R') rotateSel();
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); removeSel(); } else if (k === 'Escape') { bd.tool = null; bd.wireFrom = null; bd.sel = null; }
    dirty();
  });

  return {
    X, actions, onChange, onInput, onToggle, workHTML, stationState, stationClick,
    panel: (mode) => ({ home: homeHTML, build: buildHTML, verify: verifyHTML, packs: packsHTML, review: reviewHTML }[mode]()),
    title: (mode) => tr(X[mode]),
    caption: (mode) => (mode === 'build' ? fill(ex().title, !!ex().starter) : mode === 'verify' && vr.stage !== 'intro' ? vfill(SCENARIOS_V[vr.scn].symptom) : tr(X[mode])),
    enter: (mode) => { if (mode === 'verify') vr.stage = 'intro'; if (mode === 'review') rv.session = null; },
    dueCount: () => dueList(study.review, Date.now()).length,
    api: { bd, vr, rv, study, bdStart, place, addWire, bdCheck, bdTests, vrStart, vrMeasure, selectPack, rvStart, loaded },
  };
}
