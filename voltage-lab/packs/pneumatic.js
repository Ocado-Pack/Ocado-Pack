/* Voltage Lab equipment pack: pneumatic actuators (representative, electrical side only). */
(function () {
  var t = function (en, es) { return { en: en, es: es }; };
  var L = function (ref, en, es, n1, n2) { return { ref: ref, t: t(en, es), name: t(n1, n2) }; };
  window.VoltageLabPacks.register({
    id: 'pneumatic', schema: 1, source: { kind: 'representative' }, supports: { starter: false }, load: 'coil', actuator: 'cylinder',
    name: t('Pneumatic actuators', 'Actuadores neumáticos'),
    summary: t('The electrical side of a solenoid valve: switches energize valve coil Y1, and a cylinder follows it. Air pressure is not simulated.', 'El lado eléctrico de una electroválvula: los interruptores energizan la bobina Y1 y un cilindro la sigue. No se simula la presión de aire.'),
    labels: {
      SA: L('S1', 'S1', 'S1', 'Extend switch S1', 'Interruptor de avance S1'),
      SB: L('S2', 'S2', 'S2', 'Extend switch S2', 'Interruptor de avance S2'),
      H1: L('Y1', 'valve coil Y1', 'la bobina de válvula Y1', 'Solenoid valve coil Y1', 'Bobina de electroválvula Y1'),
      M1: L('A', 'cylinder A', 'el cilindro A', 'Cylinder A (spring return, representative)', 'Cilindro A (retorno por muelle, representativo)')
    },
    glossary: [
      [t('Solenoid valve', 'Electroválvula'), t('A valve moved by an electrical coil. Energizing the coil changes where the air goes.', 'Una válvula movida por una bobina eléctrica. Energizar la bobina cambia hacia dónde va el aire.')],
      [t('Cylinder (actuator)', 'Cilindro (actuador)'), t('A piston moved by air pressure. In this pack it extends while Y1 is energized.', 'Un pistón movido por presión de aire. En este paquete avanza mientras Y1 está energizada.')],
      [t('Spring return', 'Retorno por muelle'), t('The valve goes back to its rest position when the coil loses power.', 'La válvula vuelve a su posición de reposo cuando la bobina pierde energía.')],
      [t('Valve coil', 'Bobina de válvula'), t('An electrical load like a relay coil: it needs a complete path from +24 V to 0 V.', 'Una carga eléctrica como la bobina de un relé: necesita un camino completo de +24 V a 0 V.')],
      [t('Stored energy', 'Energía almacenada'), t('Compressed air can move a cylinder after the electrical power is off.', 'El aire comprimido puede mover un cilindro después de cortar la energía eléctrica.')]
    ],
    models: [
      t('The coil symbol Y1 is the solenoid valve coil; on the bench it is shown by the indicator lamp.', 'El símbolo de bobina Y1 es la bobina de la electroválvula; en la mesa se muestra con la lámpara indicadora.'),
      t('Cylinder A: its rod extends while Y1 is energized and returns when it is not.', 'Cilindro A: su vástago avanza mientras Y1 está energizada y retorna cuando no lo está.'),
      t('Selector switches S1 and S2 are the extend commands.', 'Los interruptores S1 y S2 son las órdenes de avance.')
    ],
    legend: [['no', t('Command contact (NO)', 'Contacto de orden (NA)')], ['coil', t('Solenoid valve coil', 'Bobina de electroválvula')]],
    scenarios: [
      { title: t('One switch extends the cylinder', 'Un interruptor hace avanzar el cilindro'), text: t('Wire S1 to valve coil Y1 and watch cylinder A follow.', 'Cablea S1 a la bobina Y1 y observa cómo la sigue el cilindro A.'), go: { mode: 'build', ex: 'A' } },
      { title: t('Either of two stations extends it', 'Cualquiera de dos puestos lo hace avanzar'), text: t('Two command contacts in parallel feed the valve coil.', 'Dos contactos de orden en paralelo alimentan la bobina de la válvula.'), go: { mode: 'build', ex: 'C' } },
      { title: t('The valve coil does not energize', 'La bobina de la válvula no se energiza'), text: t('Use the meter on the simulated 24 V circuit to find where the voltage stops.', 'Usa el medidor en el circuito simulado de 24 V para encontrar dónde se detiene el voltaje.'), go: { mode: 'diagnose', scn: 'panel24' } }
    ],
    interview: [
      { q: t('A cylinder does not extend. How do you split the problem?', 'Un cilindro no avanza. ¿Cómo divides el problema?'), a: t('Electrical or pneumatic: is 24 V reaching the valve coil when commanded? If yes, look at the air side; if no, follow the control circuit.', 'Eléctrico o neumático: ¿llegan 24 V a la bobina de la válvula cuando se ordena? Si llegan, mirar el lado de aire; si no, seguir el circuito de control.') },
      { q: t('What does a solenoid valve do?', '¿Qué hace una electroválvula?'), a: t('Its coil shifts the valve, which directs compressed air to move an actuator.', 'Su bobina desplaza la válvula, que dirige el aire comprimido para mover un actuador.') },
      { q: t('What does “spring return” mean for a loss of power?', '¿Qué significa «retorno por muelle» ante una pérdida de energía?'), a: t('The valve returns to its rest position, so the actuator goes to its rest state — as far as the air supply allows.', 'La válvula vuelve a su posición de reposo, así que el actuador va a su estado de reposo, en la medida en que el suministro de aire lo permita.') },
      { q: t('Why is switching off the electrical power not enough before working on pneumatics?', '¿Por qué no basta con cortar la energía eléctrica antes de trabajar en neumática?'), a: t('Compressed air is stored energy and can still move parts. Isolation follows the site’s written procedure for every energy source.', 'El aire comprimido es energía almacenada y aún puede mover piezas. El aislamiento sigue el procedimiento escrito del sitio para cada fuente de energía.') },
      { q: t('There is 24 V across the valve coil, but the valve does not shift. What does that suggest?', 'Hay 24 V en la bobina de la válvula, pero la válvula no se desplaza. ¿Qué sugiere?'), a: t('The control circuit is delivering. The cause is in the coil, the valve or the air side, and voltage readings cannot say which.', 'El circuito de control está entregando. La causa está en la bobina, la válvula o el lado de aire, y las lecturas de voltaje no pueden decir cuál.') }
    ],
    behavior: [
      t('Cylinder A extends while valve coil Y1 is energized.', 'El cilindro A avanza mientras la bobina Y1 está energizada.'),
      t('It returns when Y1 is de-energized (spring return).', 'Retorna cuando Y1 se desenergiza (retorno por muelle).'),
      t('Only the electrical side is modelled. Air pressure, flow and speed are not simulated.', 'Solo se modela el lado eléctrico. No se simulan presión, caudal ni velocidad del aire.')
    ],
    checks: { ids: [], extra: [
      t('The cylinder extends when the command contact closes.', 'El cilindro avanza cuando el contacto de orden cierra.'),
      t('It returns when the contact opens.', 'Retorna cuando el contacto abre.'),
      t('It returns when control power is lost and does not extend again until commanded.', 'Retorna cuando se pierde la alimentación de control y no vuelve a avanzar hasta que se ordene.')
    ] }
  });
})();
