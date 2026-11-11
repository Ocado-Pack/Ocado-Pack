/* Voltage Lab equipment pack: conveyor and material handling (representative). */
(function () {
  var t = function (en, es) { return { en: en, es: es }; };
  var L = function (ref, en, es, n1, n2) { return { ref: ref, t: t(en, es), name: t(n1, n2) }; };
  window.VoltageLabPacks.register({
    id: 'conveyor', schema: 1, source: { kind: 'representative' }, supports: { starter: true }, load: 'lamp', actuator: 'motor',
    name: t('Conveyor and material handling', 'Transportadores y manejo de materiales'),
    summary: t('A single conveyor drive with start/stop control, a run lamp and permissive switches.', 'Un solo accionamiento de transportador con control de marcha/paro, una lámpara de marcha e interruptores de permiso.'),
    labels: {
      SA: L('S1', 'zone switch S1', 'el interruptor de zona S1', 'Zone enable switch S1', 'Interruptor de habilitación de zona S1'),
      SB: L('S2', 'downstream-ready switch S2', 'el interruptor de salida lista S2', 'Downstream-ready switch S2', 'Interruptor de salida lista S2'),
      H1: L('H1', 'run lamp H1', 'la lámpara de marcha H1', 'Conveyor run lamp H1', 'Lámpara de marcha del transportador H1'),
      M1: L('M1', 'conveyor drive M1', 'el accionamiento M1', 'Conveyor drive motor M1', 'Motor de accionamiento del transportador M1'),
      K1: L('K1', 'K1', 'K1', 'Drive contactor K1', 'Contactor del accionamiento K1'),
      F1: L('F1', 'F1', 'F1', 'Drive overload relay F1', 'Relé de sobrecarga del accionamiento F1')
    },
    glossary: [
      [t('Permissive', 'Permiso'), t('A condition that must be true before a machine is allowed to run, such as “downstream ready”.', 'Una condición que debe cumplirse antes de que una máquina pueda funcionar, como «salida lista».')],
      [t('Interlock', 'Enclavamiento'), t('Wiring or logic that prevents one action unless another condition is met.', 'Cableado o lógica que impide una acción si no se cumple otra condición.')],
      [t('Zone', 'Zona'), t('One section of a conveyor line with its own drive and controls.', 'Una sección de una línea de transporte con su propio accionamiento y controles.')],
      [t('Jam', 'Atasco'), t('Product stopped on the belt. A jammed drive can trip its overload relay.', 'Producto detenido en la banda. Un accionamiento atascado puede disparar su relé de sobrecarga.')],
      [t('Run indication', 'Indicación de marcha'), t('A lamp that shows the drive has been commanded to run.', 'Una lámpara que muestra que se ha ordenado la marcha del accionamiento.')]
    ],
    models: [
      t('Motor M1 stands for the conveyor drive; its rotor shows the belt moving.', 'El motor M1 representa el accionamiento del transportador; su rotor muestra el movimiento de la banda.'),
      t('Selector switches S1 and S2 stand for zone-enable and downstream-ready permissives.', 'Los interruptores S1 y S2 representan los permisos de zona habilitada y salida lista.'),
      t('Lamp H1 is the run indication; START, STOP, K1 and F1 are the drive controls.', 'La lámpara H1 es la indicación de marcha; START, STOP, K1 y F1 son los controles del accionamiento.')
    ],
    legend: [['no', t('Permissive contact (NO)', 'Contacto de permiso (NA)')], ['pb_no', t('START pushbutton', 'Pulsador START')], ['pb_nc', t('STOP pushbutton', 'Pulsador STOP')], ['ol', t('Drive overload contact', 'Contacto de sobrecarga del accionamiento')], ['coil', t('Drive contactor coil', 'Bobina del contactor del accionamiento')], ['lamp', t('Run lamp', 'Lámpara de marcha')]],
    scenarios: [
      { title: t('Run lamp needs both permissives', 'La lámpara de marcha requiere ambos permisos'), text: t('Zone enabled AND downstream ready: build the series logic.', 'Zona habilitada Y salida lista: construye la lógica en serie.'), go: { mode: 'build', ex: 'B' } },
      { title: t('Conveyor drive start/stop', 'Marcha/paro del accionamiento'), text: t('Build the drive starter with holding contact, STOP and overload.', 'Construye el arrancador del accionamiento con retención, STOP y sobrecarga.'), go: { mode: 'build', ex: 'D' } },
      { title: t('Conveyor will not start after a “repair”', 'El transportador no arranca tras una «reparación»'), text: t('A part was swapped on a guess. Verify, re-diagnose and prove the result.', 'Se cambió una pieza por intuición. Verifica, vuelve a diagnosticar y demuestra el resultado.'), go: { mode: 'verify', scn: 1 } }
    ],
    interview: [
      { q: t('A conveyor stops and will not restart. Where do you begin?', 'Un transportador se detiene y no vuelve a arrancar. ¿Por dónde empiezas?'), a: t('Make it safe to approach, then check indications: overload tripped, stop circuit, permissives. Follow the control circuit against the drawing before touching parts.', 'Hacer segura la aproximación y revisar indicaciones: sobrecarga disparada, circuito de paro, permisos. Seguir el circuito de control con el plano antes de tocar piezas.') },
      { q: t('What is a permissive, and how is it usually wired?', '¿Qué es un permiso y cómo suele cablearse?'), a: t('A condition required to run. Its contact is in series with the start circuit, so the drive cannot run unless it is closed.', 'Una condición necesaria para funcionar. Su contacto va en serie con el circuito de marcha, de modo que el accionamiento no funciona si no está cerrado.') },
      { q: t('Why must a conveyor not restart by itself when power returns?', '¿Por qué un transportador no debe volver a arrancar solo al regresar la energía?'), a: t('People may be clearing product. The holding circuit drops out on power loss, so a deliberate start is needed.', 'Puede haber personas retirando producto. El circuito de retención cae al perder energía, así que hace falta un arranque deliberado.') },
      { q: t('The overload keeps tripping. What does that tell you?', 'La sobrecarga dispara una y otra vez. ¿Qué te indica?'), a: t('The motor is drawing too much current. Look for the cause — a jam, a mechanical bind — rather than only resetting.', 'El motor consume demasiada corriente. Hay que buscar la causa (un atasco, un bloqueo mecánico) en lugar de solo rearmar.') },
      { q: t('How do you confirm a repair on a conveyor drive?', '¿Cómo confirmas una reparación en un accionamiento de transportador?'), a: t('Demonstrate start, hold, stop, overload trip and power-return behavior, and record the results.', 'Demostrando el arranque, la retención, la parada, el disparo de sobrecarga y el comportamiento al regresar la energía, y registrando los resultados.') }
    ],
    behavior: [
      t('The run lamp is on only while every permissive is closed.', 'La lámpara de marcha se enciende solo mientras todos los permisos están cerrados.'),
      t('START runs the drive; it holds in until STOP or an overload trip.', 'START pone en marcha el accionamiento; queda retenido hasta STOP o un disparo de sobrecarga.'),
      t('The drive never restarts on its own after a stop, a reset or a power return.', 'El accionamiento nunca vuelve a arrancar solo tras una parada, un rearme o el regreso de la energía.')
    ],
    checks: { ids: ['start', 'seal', 'stop', 'stoprel', 'trip', 'reset', 'loss', 'restore', 'again'], extra: [t('The run lamp follows both permissives.', 'La lámpara de marcha sigue a ambos permisos.')] }
  });
})();
