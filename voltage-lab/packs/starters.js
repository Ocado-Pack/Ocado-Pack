/* Voltage Lab equipment pack: motor starters and control panels (representative). */
(function () {
  var t = function (en, es) { return { en: en, es: es }; };
  window.VoltageLabPacks.register({
    id: 'starters', schema: 1, source: { kind: 'representative' }, supports: { starter: true }, load: 'lamp', actuator: 'motor',
    name: t('Motor starters and control panels', 'Arrancadores de motor y tableros de control'),
    summary: t('A direct-on-line starter: contactor, overload relay, START/STOP station and a 24 V control circuit.', 'Un arrancador directo: contactor, relé de sobrecarga, botonera START/STOP y un circuito de control de 24 V.'),
    labels: {},
    glossary: [
      [t('Direct-on-line starter', 'Arrancador directo'), t('A contactor and an overload relay that connect a motor straight to its supply.', 'Un contactor y un relé de sobrecarga que conectan un motor directamente a su alimentación.')],
      [t('Main contacts', 'Contactos principales'), t('The contactor’s power contacts, which carry motor current.', 'Los contactos de potencia del contactor, que llevan la corriente del motor.')],
      [t('Auxiliary contact', 'Contacto auxiliar'), t('A small contact on the contactor used in the control circuit, for example for holding.', 'Un contacto pequeño del contactor usado en el circuito de control, por ejemplo para la retención.')],
      [t('Control voltage', 'Voltaje de control'), t('The voltage of the control circuit, often lower than the motor supply. Here 24 V DC.', 'El voltaje del circuito de control, a menudo menor que el del motor. Aquí 24 V CC.')],
      [t('Trip / reset', 'Disparo / rearme'), t('An overload relay trips to open its contact and must be reset before the motor can be started again.', 'Un relé de sobrecarga dispara para abrir su contacto y debe rearmarse antes de poder arrancar el motor otra vez.')]
    ],
    models: [
      t('Contactor K1: the block that pulls in when its coil is energized.', 'Contactor K1: el bloque que actúa cuando su bobina se energiza.'),
      t('Overload relay F1 with TEST (simulated trip) and RESET.', 'Relé de sobrecarga F1 con TEST (disparo simulado) y RESET.'),
      t('START/STOP station, control power switch Q1 and motor M1.', 'Botonera START/STOP, interruptor de alimentación de control Q1 y motor M1.')
    ],
    legend: [['pb_nc', t('STOP pushbutton (NC)', 'Pulsador STOP (NC)')], ['ol', t('Overload contact (NC)', 'Contacto de sobrecarga (NC)')], ['pb_no', t('START pushbutton (NO)', 'Pulsador START (NA)')], ['no', t('Auxiliary contact (NO)', 'Contacto auxiliar (NA)')], ['coil', t('Contactor coil', 'Bobina del contactor')]],
    scenarios: [
      { title: t('Build the starter control circuit', 'Construir el circuito de control del arrancador'), text: t('Place STOP, overload, START, the holding contact and the coil.', 'Coloca STOP, sobrecarga, START, el contacto de retención y la bobina.'), go: { mode: 'build', ex: 'D' } },
      { title: t('Motor drops out when START is released', 'El motor se cae al soltar START'), text: t('Find the evidence, repair it in simulation, and verify all nine checks.', 'Busca la evidencia, repáralo en simulación y verifica las nueve comprobaciones.'), go: { mode: 'verify', scn: 0 } },
      { title: t('Follow 24 V through a control circuit', 'Seguir los 24 V por un circuito de control'), text: t('Use the meter on the 24 V panel to find where the voltage stops.', 'Usa el medidor en el panel de 24 V para encontrar dónde se detiene el voltaje.'), go: { mode: 'diagnose', scn: 'panel24' } }
    ],
    interview: [
      { q: t('Name the parts of a direct-on-line starter and what each does.', 'Nombra las partes de un arrancador directo y qué hace cada una.'), a: t('Contactor: switches the motor. Overload relay: opens the control circuit on sustained over-current. START/STOP station and holding contact: command and latch the contactor.', 'Contactor: conmuta el motor. Relé de sobrecarga: abre el circuito de control ante sobrecorriente sostenida. Botonera START/STOP y contacto de retención: ordenan y retienen el contactor.') },
      { q: t('Where does the overload contact go in the control circuit, and why?', '¿Dónde va el contacto de sobrecarga en el circuito de control y por qué?'), a: t('In series with the coil, so a trip always removes power from the coil and nothing can bypass it.', 'En serie con la bobina, para que un disparo siempre quite la energía de la bobina y nada pueda puentearlo.') },
      { q: t('The contactor chatters or drops out when START is released. What do you suspect?', 'El contactor vibra o se cae al soltar START. ¿Qué sospechas?'), a: t('The holding path: the auxiliary contact or its wiring. Confirm with readings before replacing anything.', 'El camino de retención: el contacto auxiliar o su cableado. Confirmar con lecturas antes de reemplazar nada.') },
      { q: t('What is the difference between the control circuit and the power circuit?', '¿Cuál es la diferencia entre el circuito de control y el de potencia?'), a: t('The control circuit decides; the power circuit carries motor current through the main contacts. They are drawn and tested separately.', 'El circuito de control decide; el de potencia lleva la corriente del motor por los contactos principales. Se dibujan y se prueban por separado.') },
      { q: t('After resetting an overload, should the motor start by itself?', 'Tras rearmar una sobrecarga, ¿debe arrancar el motor solo?'), a: t('Not in this teaching circuit: the holding contact has dropped out, so a new START is required. Actual equipment follows its own documented sequence.', 'No en este circuito didáctico: el contacto de retención cayó, así que hace falta un nuevo START. El equipo real sigue su propia secuencia documentada.') }
    ],
    behavior: [
      t('START pulls in K1; the auxiliary contact holds it.', 'START hace actuar K1; el contacto auxiliar lo retiene.'),
      t('STOP, an overload trip or a loss of control voltage drops K1.', 'STOP, un disparo de sobrecarga o la pérdida del voltaje de control desenergiza K1.'),
      t('K1 stays out until a new START.', 'K1 queda desenergizado hasta un nuevo START.')
    ],
    checks: { ids: ['start', 'seal', 'stop', 'stoprel', 'trip', 'reset', 'loss', 'restore', 'again'], extra: [] }
  });
})();
