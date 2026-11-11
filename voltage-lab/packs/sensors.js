/* Voltage Lab equipment pack: sensors and PLC input/output (representative). */
(function () {
  var t = function (en, es) { return { en: en, es: es }; };
  var L = function (ref, en, es, n1, n2) { return { ref: ref, t: t(en, es), name: t(n1, n2) }; };
  window.VoltageLabPacks.register({
    id: 'sensors', schema: 1, source: { kind: 'representative' }, supports: { starter: false }, load: 'lamp', actuator: null,
    name: t('Sensors and PLC input/output', 'Sensores y entradas/salidas de PLC'),
    summary: t('Sensor contacts switching 24 V into an input, shown by an input indicator. No PLC program is simulated.', 'Contactos de sensores que conmutan 24 V hacia una entrada, mostrada por un indicador de entrada. No se simula ningún programa de PLC.'),
    labels: {
      SA: L('B1', 'sensor B1', 'el sensor B1', 'Sensor B1 (simulated as a contact)', 'Sensor B1 (simulado como contacto)'),
      SB: L('B2', 'sensor B2', 'el sensor B2', 'Sensor B2 (simulated as a contact)', 'Sensor B2 (simulado como contacto)'),
      H1: L('I1', 'input indicator I1', 'el indicador de entrada I1', 'Input indicator I1 (representative)', 'Indicador de entrada I1 (representativo)')
    },
    glossary: [
      [t('Input', 'Entrada'), t('A point where a controller reads a signal, such as a sensor contact switching 24 V.', 'Un punto donde un controlador lee una señal, como un contacto de sensor que conmuta 24 V.')],
      [t('Output', 'Salida'), t('A point where a controller switches a load such as a lamp, a coil or a valve.', 'Un punto donde un controlador conmuta una carga como una lámpara, una bobina o una válvula.')],
      [t('Input indicator', 'Indicador de entrada'), t('A small light that shows the controller sees voltage on an input.', 'Una luz pequeña que muestra que el controlador ve voltaje en una entrada.')],
      [t('Sensor', 'Sensor'), t('A device that changes an electrical signal when it detects something. Here it is modelled as a simple contact.', 'Un dispositivo que cambia una señal eléctrica cuando detecta algo. Aquí se modela como un contacto simple.')],
      [t('24 V DC signal', 'Señal de 24 V CC'), t('The common control voltage for sensors and inputs in this lab.', 'El voltaje de control habitual para sensores y entradas en este laboratorio.')]
    ],
    models: [
      t('Selector switches stand for sensor contacts B1 and B2: closed means “detecting”.', 'Los interruptores selectores representan los contactos de los sensores B1 y B2: cerrado significa «detectando».'),
      t('Lamp H1 stands for an input indicator: on means 24 V is present at the input.', 'La lámpara H1 representa un indicador de entrada: encendida significa que hay 24 V en la entrada.'),
      t('The 24 V panel on the main bench stands for a sensor-to-input circuit you can measure.', 'El panel de 24 V de la mesa principal representa un circuito de sensor a entrada que puedes medir.')
    ],
    legend: [['no', t('Sensor contact (NO), shown not detecting', 'Contacto de sensor (NA), mostrado sin detectar')], ['lamp', t('Input indicator', 'Indicador de entrada')]],
    scenarios: [
      { title: t('One sensor, one input', 'Un sensor, una entrada'), text: t('Wire a sensor contact so the input indicator follows it.', 'Cablea un contacto de sensor para que el indicador de entrada lo siga.'), go: { mode: 'build', ex: 'A' } },
      { title: t('Two conditions in series', 'Dos condiciones en serie'), text: t('The input is on only when both sensors detect.', 'La entrada se activa solo cuando ambos sensores detectan.'), go: { mode: 'build', ex: 'B' } },
      { title: t('The input never comes on', 'La entrada nunca se activa'), text: t('Measure along the simulated 24 V circuit to find where the signal stops.', 'Mide a lo largo del circuito simulado de 24 V para encontrar dónde se detiene la señal.'), go: { mode: 'diagnose', scn: 'panel24' } }
    ],
    interview: [
      { q: t('A sensor is detecting, but the input indicator is off. How do you approach it?', 'Un sensor está detectando, pero el indicador de entrada está apagado. ¿Cómo lo abordas?'), a: t('Check the 24 V supply to the sensor, then the signal at the sensor output and at the input, against the drawing. The voltage shows where the signal is lost.', 'Revisar los 24 V que alimentan el sensor y luego la señal en la salida del sensor y en la entrada, comparando con el plano. El voltaje muestra dónde se pierde la señal.') },
      { q: t('What is the difference between an input and an output?', '¿Cuál es la diferencia entre una entrada y una salida?'), a: t('An input brings information in, such as a sensor state. An output switches something, such as a lamp or a valve coil.', 'Una entrada trae información, como el estado de un sensor. Una salida conmuta algo, como una lámpara o la bobina de una válvula.') },
      { q: t('What does an input indicator tell you, and what does it not tell you?', '¿Qué te dice un indicador de entrada y qué no te dice?'), a: t('It shows voltage is present at the input. It does not show that the program is using it correctly.', 'Muestra que hay voltaje en la entrada. No muestra que el programa lo esté usando bien.') },
      { q: t('How do two sensors in series behave?', '¿Cómo se comportan dos sensores en serie?'), a: t('As AND logic: the signal arrives only when both contacts are closed.', 'Como lógica Y: la señal llega solo cuando ambos contactos están cerrados.') },
      { q: t('What would you ask before changing a sensor?', '¿Qué preguntarías antes de cambiar un sensor?'), a: t('What evidence shows the sensor is the cause, rather than its supply, wiring or the input. Then how the result will be verified.', 'Qué evidencia muestra que el sensor es la causa, y no su alimentación, su cableado o la entrada. Después, cómo se verificará el resultado.') }
    ],
    behavior: [
      t('The input indicator is on while the sensor contact is closed.', 'El indicador de entrada se enciende mientras el contacto del sensor está cerrado.'),
      t('Sensor contacts in series act as AND; in parallel as OR.', 'Los contactos de sensores en serie actúan como Y; en paralelo como O.'),
      t('This pack models contacts and voltage only. It does not simulate a PLC program, addresses or diagnostics.', 'Este paquete modela solo contactos y voltaje. No simula un programa de PLC, direcciones ni diagnósticos.')
    ],
    checks: { ids: [], extra: [
      t('The input indicator comes on when the sensor contact closes.', 'El indicador de entrada se enciende cuando el contacto del sensor cierra.'),
      t('It goes off when the contact opens.', 'Se apaga cuando el contacto abre.'),
      t('With two conditions in series, either one open keeps the input off.', 'Con dos condiciones en serie, cualquiera abierta mantiene la entrada desactivada.')
    ] }
  });
})();
