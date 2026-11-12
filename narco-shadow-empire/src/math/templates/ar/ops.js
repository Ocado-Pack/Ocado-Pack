// Topic pack: ar.ops - whole-number operations in context (levels 1-5).
import { defineTemplate, ans, steps5, t, N, numWord, fmtInt, fmtMoney, L, TIMES, MINUS, DIV } from '../../kit.js';

const CASES = N('case', 'cases', 'caja', 'cajas'), BOXES = N('box', 'boxes', 'caja', 'cajas'), CRATES = N('crate', 'crates', 'cajón', 'cajones'), DRUMS = N('drum', 'drums', 'tambor', 'tambores');
const BORROW = L('Re-check the subtraction; a regrouping (borrowing) slip changes the tens digit.', 'Revisa la resta; un error al reagrupar (pedir prestado) cambia las decenas.');
const borrows = (from, take) => from % 10 < take % 10;   // does from − take need regrouping in the ones place?
const RECHECK_DIV = L('Re-check the division: multiply your answer by the carton size and compare with the total.', 'Revisa la división: multiplica tu respuesta por el tamaño del cartón y compárala con el total.');
const LOAD = {
  trucks: { unit: CASES, en: '{G} trucks carry {per} equipment cases each. {R} cases are removed. How many remain?', es: '{G} camiones llevan {per} cajas de equipo cada uno. Se retiran {r} cajas. ¿Cuántas quedan?', g: L('trucks', 'camiones') },
  shelves: { unit: BOXES, en: '{G} shelves hold {per} boxes each. {R} boxes are taken to the dock. How many boxes are left on the shelves?', es: '{G} estantes tienen {per} cajas cada uno. Se llevan {r} cajas al muelle. ¿Cuántas cajas quedan en los estantes?', g: L('shelves', 'estantes') },
  vans: { unit: CRATES, en: '{G} vans are loaded with {per} crates each. {R} crates are unloaded at the first stop. How many crates are still on the vans?', es: '{G} camionetas se cargan con {per} cajones cada una. Se descargan {r} cajones en la primera parada. ¿Cuántos cajones siguen en las camionetas?', g: L('vans', 'camionetas') },
  pallets: { unit: DRUMS, en: '{G} pallets are stacked with {per} drums each. {R} drums are shipped out. How many drums remain?', es: '{G} tarimas tienen {per} tambores cada una. Se despachan {r} tambores. ¿Cuántos tambores quedan?', g: L('pallets', 'tarimas') },
};

export default [
  defineTemplate({
    id: 'ar.ops.loadout', topic: 'ar.ops', levels: [1, 2], themes: ['warehouse'],
    params(rng, level) {
      const groups = rng.int(2, level === 1 ? 5 : 9), per = rng.int(level === 1 ? 6 : 12, level === 1 ? 20 : 45);
      return { groups, per, removed: rng.int(3, per - 1), context: rng.pick(Object.keys(LOAD)), words: false };
    },
    build(p) {
      const c = LOAD[p.context] || LOAD.trucks, total = p.groups * p.per, a = total - p.removed;
      const v = { G: p.words ? numWord(p.groups, true) : L(fmtInt(p.groups)), R: p.words ? numWord(p.removed, true) : L(fmtInt(p.removed)), r: p.words ? numWord(p.removed) : L(fmtInt(p.removed)), per: p.per, g: p.groups, rm: p.removed, total, a, unit: L(c.unit.en[1], c.unit.es[1]), gs: c.g };
      return {
        prompt: t(c.en, c.es, v), answer: ans.int(a, c.unit), estSeconds: 45,
        wrong: [
          { value: total, tag: 'forgot-subtract', why: t('That is the total before anything was removed. You still have to take away the {rm} that left.', 'Ese es el total antes de retirar algo. Aún debes restar {rm}.', v) },
          { value: p.groups * (p.per - p.removed), tag: 'subtract-first', why: t('You subtracted {rm} from every group. Only {rm} {unit} were removed in total, so multiply first, then subtract once.', 'Restaste {rm} de cada grupo. Solo se retiraron {rm} {unit} en total: primero multiplica y luego resta una sola vez.', v) },
          { value: total + p.removed, tag: 'added-instead', why: t('"Removed" means take away. You added {rm} instead of subtracting it.', '"Retirar" significa quitar. Sumaste {rm} en lugar de restarlo.', v) },
          { value: p.groups + p.per - p.removed, tag: 'added-groups', why: t('"{per} each" for {g} {gs} means {g} groups of {per}: multiply, do not add.', '{g} {gs} con {per} en cada grupo son {g} grupos de {per}: multiplica, no sumes.', v) },
          borrows(total, p.removed) ? { value: a + 10, tag: 'borrow-error', why: BORROW } : null,
        ],
        hints: [
          t('Work out how many {unit} there were before any left. The word "each" signals equal groups.', 'Calcula primero el total de {unit} antes de que se retirara nada. La palabra "cada" indica grupos iguales.', v),
          t('Total = number of groups {x} amount in each. Remaining = total {m} removed.', 'Total = número de grupos {x} cantidad en cada grupo. Lo que queda = total {m} lo retirado.', { x: TIMES, m: MINUS }),
          t('Start with {g} {x} {per} = {total}. Now take away the {rm} that were removed.', 'Empieza con {g} {x} {per} = {total}. Ahora resta {rm}, lo que se retiró.', { ...v, x: TIMES }),
        ],
        steps: steps5(
          t('Find how many {unit} are left after some are removed.', 'Halla el número de {unit} que quedan después del retiro.', v),
          t('{g} {gs}, {per} {unit} in each, {rm} removed.', '{g} {gs}, {per} {unit} en cada grupo; se retiran {rm}.', v),
          t('Equal groups {a1} multiply for the total; "removed" {a1} subtract: {g} {x} {per} {m} {rm}.', 'Grupos iguales {a1} multiplica para el total; "retirar" {a1} resta: {g} {x} {per} {m} {rm}.', { ...v, x: TIMES, m: MINUS, a1: '→' }),
          t('{g} {x} {per} = {total}. Then {total} {m} {rm} = {a}.', '{g} {x} {per} = {total}. Luego {total} {m} {rm} = {a}.', { ...v, x: TIMES, m: MINUS }),
          t('Add back what left: {a} + {rm} = {total}, the full load. It checks.', 'Suma lo que salió: {a} + {rm} = {total}, la carga completa. Coincide.', v),
        ),
        beginner: t('Picture each of the {gs} as an equal stack. Counting equal stacks is repeated addition, and multiplying is the fast way to do it. Once you know the whole pile, removing some is a simple take-away.', 'Imagina que cada grupo ({gs}) es una pila del mismo tamaño. Contar pilas iguales es una suma repetida, y multiplicar es la forma rápida. Cuando ya conoces el montón completo, retirar una parte es una resta sencilla.', v),
        formula: t('remaining = (groups {x} each) {m} removed', 'lo que queda = (grupos {x} cantidad por grupo) {m} lo retirado', { x: TIMES, m: MINUS }),
        trick: L('"Each" = multiply. "Removed / left / remain" = subtract.', '"Cada" = multiplica. "Retirar / quedan" = resta.'),
        visual: { type: 'bars', params: { values: Array.from({ length: p.groups }, (_, i) => ({ label: L(String(i + 1)), value: p.per })), mode: 'total', removed: p.removed } },
        rookie: {
          lines: [t('{g} {x} {per} = {total}', '{g} {x} {per} = {total}', { ...v, x: TIMES }), t('{total} + {rm} = {w}', '{total} + {rm} = {w}', { ...v, w: total + p.removed }), t('{w} {unit} remain', 'Quedan {w} {unit}', { ...v, w: total + p.removed })],
          wrongIndex: 1, why: t('Removed items are subtracted, not added: {total} {m} {rm} = {a}.', 'Lo retirado se resta, no se suma: {total} {m} {rm} = {a}.', { ...v, m: MINUS }),
        },
      };
    },
    check(p) { let s = 0; for (let i = 0; i < p.groups; i++) s += p.per; return s - p.removed; },
  }),

  defineTemplate({
    id: 'ar.ops.restock', topic: 'ar.ops', levels: [1, 2, 3], themes: ['warehouse'],
    params(rng, level) {
      const start = rng.int(20, level === 1 ? 60 : 240), added = rng.int(8, level === 1 ? 30 : 120);
      return { start, added, shipped: rng.int(5, start - 1), second: level >= 3 ? rng.int(4, 40) : 0 };
    },
    build(p) {
      const a = p.start + p.added - p.shipped + p.second, v = { ...p, a, mid: p.start + p.added, m: MINUS };
      const extraEn = p.second ? ' Later, {second} more pallets arrive.' : '', extraEs = p.second ? ' Más tarde llegan {second} tarimas más.' : '';
      return {
        prompt: t('A stockroom starts the shift with {start} pallets. A delivery adds {added} pallets, and {shipped} pallets are shipped out.' + extraEn + ' How many pallets are in the stockroom now?', 'Un almacén empieza el turno con {start} tarimas. Una entrega añade {added} tarimas y se despachan {shipped} tarimas.' + extraEs + ' ¿Cuántas tarimas hay ahora en el almacén?', v),
        answer: ans.int(a, N('pallet', 'pallets', 'tarima', 'tarimas')), estSeconds: 45,
        wrong: [
          { value: p.start + p.added + p.shipped + p.second, tag: 'added-shipped', why: L('Shipped pallets leave the room, so they are subtracted, not added.', 'Las tarimas despachadas salen del almacén: se restan, no se suman.') },
          { value: p.start - p.shipped + p.second, tag: 'ignored-delivery', why: t('You left out the delivery of {added}.', 'Olvidaste la entrega de {added}.', v) },
          { value: p.start + p.added, tag: 'forgot-subtract', why: t('That is the count before {shipped} were shipped out.', 'Ese es el conteo antes de despachar {shipped}.', v) },
          p.second ? { value: p.start + p.added - p.shipped, tag: 'stopped-early', why: t('You stopped before the {second} pallets that arrived later.', 'Te detuviste antes de las {second} tarimas que llegaron después.', v) } : null,
          borrows(p.start + p.added, p.shipped) ? { value: a + 10, tag: 'borrow-error', why: BORROW } : null,
        ],
        hints: [
          L('Track the count like a running balance: things coming in raise it, things going out lower it.', 'Lleva la cuenta como un saldo: lo que entra la sube, lo que sale la baja.'),
          L('now = start + delivered − shipped (+ anything that arrives later).', 'ahora = inicio + entregado − despachado (+ lo que llegue después).'),
          t('Start with {start} + {added} = {mid}. Then handle what was shipped.', 'Empieza con {start} + {added} = {mid}. Luego ocúpate de lo despachado.', v),
        ],
        steps: steps5(
          L('Find the number of pallets after deliveries and shipments.', 'Halla el número de tarimas después de entregas y despachos.'),
          t('Start {start}; in {added}; out {shipped}' + (p.second ? '; in {second}' : '') + '.', 'Inicio {start}; entran {added}; salen {shipped}' + (p.second ? '; entran {second}' : '') + '.', v),
          L('Add what comes in, subtract what goes out.', 'Suma lo que entra y resta lo que sale.'),
          t('{start} + {added} = {mid}. {mid} {m} {shipped} = {x}.' + (p.second ? ' {x} + {second} = {a}.' : ''), '{start} + {added} = {mid}. {mid} {m} {shipped} = {x}.' + (p.second ? ' {x} + {second} = {a}.' : ''), { ...v, x: p.start + p.added - p.shipped }),
          L('The result is smaller than everything that came in and not negative: reasonable.', 'El resultado es menor que todo lo que entró y no es negativo: es razonable.'),
        ),
        beginner: L('Think of the stockroom as a bank balance. Deliveries are deposits and shipments are withdrawals. Go through the story one event at a time and update the balance after each.', 'Piensa en el almacén como un saldo bancario. Las entregas son depósitos y los despachos son retiros. Recorre la historia un evento a la vez y actualiza el saldo después de cada uno.'),
        formula: L('now = start + in − out', 'ahora = inicio + entradas − salidas'),
        visual: { type: 'bars', params: { values: [{ label: L('start', 'inicio'), value: p.start }, { label: L('in', 'entran'), value: p.added }, { label: L('out', 'salen'), value: p.shipped }], mode: 'total' } },
      };
    },
    check(p) { return [p.start, p.added, -p.shipped, p.second].reduce((s, x) => s + x, 0); },
  }),

  defineTemplate({
    id: 'ar.ops.split', topic: 'ar.ops', levels: [1, 2, 3],
    params(rng, level) {
      const per = rng.int(4, level === 1 ? 9 : 24), groups = rng.int(3, level === 1 ? 9 : 18);
      return { per, groups, extra: level >= 2 ? rng.int(1, per - 1) : 0 };
    },
    build(p) {
      const total = p.per * p.groups + p.extra, v = { ...p, total, d: DIV, x: TIMES };
      return {
        prompt: p.extra
          ? t('A crew must pack {total} radios into cartons that hold {per} radios each. How many cartons can they fill completely?', 'Un equipo debe empacar {total} radios en cartones de {per} radios cada uno. ¿Cuántos cartones pueden llenar por completo?', v)
          : t('A crew packs {total} radios into cartons that hold {per} radios each. How many cartons do they need?', 'Un equipo empaca {total} radios en cartones de {per} radios cada uno. ¿Cuántos cartones necesitan?', v),
        answer: ans.int(p.groups, N('carton', 'cartons', 'cartón', 'cartones')), estSeconds: 50,
        wrong: [
          p.extra ? { value: p.groups + 1, tag: 'rounded-up', why: L('The question asks for completely filled cartons. A partly filled carton does not count.', 'La pregunta pide cartones completamente llenos. Un cartón a medias no cuenta.') } : { value: p.groups + 1, tag: 'slip', why: RECHECK_DIV },
          { value: total - p.per, tag: 'subtracted', why: L('Sharing into equal groups is division, not subtraction.', 'Repartir en grupos iguales es dividir, no restar.') },
          { value: total * p.per, tag: 'multiplied', why: L('Multiplying makes the amount bigger. Packing a fixed total into equal cartons means dividing.', 'Multiplicar agranda la cantidad. Empacar un total fijo en cartones iguales significa dividir.') },
          { value: p.groups - 1, tag: 'slip', why: RECHECK_DIV },
        ],
        hints: [
          L('You are sharing one total into equal-sized groups. Which operation does that?', 'Estás repartiendo un total en grupos del mismo tamaño. ¿Qué operación hace eso?'),
          L('number of groups = total ÷ size of each group (ignore any leftover if only full groups count).', 'número de grupos = total ÷ tamaño de cada grupo (ignora el sobrante si solo cuentan grupos completos).'),
          t('Ask: how many times does {per} fit into {total}? Try {per} {x} 2, {per} {x} 3 … until you reach the total.', 'Pregunta: ¿cuántas veces cabe {per} en {total}? Prueba {per} {x} 2, {per} {x} 3 … hasta llegar al total.', v),
        ],
        steps: steps5(
          L('Find how many equal cartons the radios fill.', 'Halla cuántos cartones iguales llenan los radios.'),
          t('{total} radios, {per} per carton.', '{total} radios, {per} por cartón.', v),
          t('Equal groups from a total: divide {total} {d} {per}.', 'Grupos iguales a partir de un total: divide {total} {d} {per}.', v),
          p.extra ? t('{total} {d} {per} = {groups} remainder {extra}. Only full cartons count: {groups}.', '{total} {d} {per} = {groups} con residuo {extra}. Solo cuentan los cartones llenos: {groups}.', v) : t('{total} {d} {per} = {groups}.', '{total} {d} {per} = {groups}.', v),
          t('{groups} {x} {per} = {back}' + (p.extra ? ', plus {extra} left over, makes {total}.' : ', the total.'), '{groups} {x} {per} = {back}' + (p.extra ? ', más {extra} que sobran, da {total}.' : ', el total.'), { ...v, back: p.groups * p.per }),
        ),
        beginner: L('Imagine dealing the radios out, one carton at a time, until you run out. Division simply counts how many cartons you filled. If a few radios are left that cannot fill another carton, they are the remainder.', 'Imagina repartir los radios, un cartón a la vez, hasta que se acaben. La división simplemente cuenta cuántos cartones llenaste. Si sobran unos radios que no llenan otro cartón, son el residuo.'),
        formula: L('groups = total ÷ size of each group', 'grupos = total ÷ tamaño de cada grupo'),
        visual: { type: 'bars', params: { values: [{ label: L('total'), value: total }], mode: 'ratio', group: p.per } },
      };
    },
    check(p) { let n = 0, left = p.per * p.groups + p.extra; while (left >= p.per) { left -= p.per; n++; } return n; },
  }),

  defineTemplate({
    id: 'ar.ops.shifts', topic: 'ar.ops', levels: [2, 3, 4],
    params(rng, level) {
      return { rate: rng.int(6, level >= 4 ? 48 : 25), hours: rng.int(4, 9), days: rng.int(2, level >= 3 ? 6 : 4), breakH: level >= 4 ? 1 : 0 };
    },
    build(p) {
      const work = p.hours - p.breakH, a = p.rate * work * p.days, v = { ...p, work, a, perDay: p.rate * work, x: TIMES };
      return {
        prompt: t('A scanner logs {rate} packages per hour. It runs {hours} hours a day' + (p.breakH ? ', but is shut down for {breakH} of those hours for maintenance' : '') + '. How many packages does it log in {days} days?', 'Un escáner registra {rate} paquetes por hora. Funciona {hours} horas al día' + (p.breakH ? ', pero se apaga {breakH} de esas horas por mantenimiento' : '') + '. ¿Cuántos paquetes registra en {days} días?', v),
        answer: ans.int(a, N('package', 'packages', 'paquete', 'paquetes')), estSeconds: 60,
        wrong: [
          { value: p.rate * work, tag: 'one-day', why: t('That is one day. The question asks for {days} days.', 'Eso es un solo día. La pregunta pide {days} días.', v) },
          { value: p.rate * p.hours * p.days, tag: 'ignored-info', why: L('You counted the maintenance hour as working time.', 'Contaste la hora de mantenimiento como tiempo de trabajo.') },
          { value: p.rate * (work + p.days), tag: 'added-time', why: L('Hours per day and days multiply (hours each day, for several days); they do not add.', 'Las horas por día y los días se multiplican (horas cada día, durante varios días); no se suman.') },
          { value: p.rate + work * p.days, tag: 'added-rate', why: L('"Per hour" is a rate: multiply it by the total hours.', '"Por hora" es una tasa: multiplícala por el total de horas.') },
        ],
        hints: [
          L('"Per hour" is a rate. First figure out how many hours the scanner actually works in all.', '"Por hora" es una tasa. Primero averigua cuántas horas trabaja realmente el escáner en total.'),
          L('total = rate × working hours per day × number of days.', 'total = tasa × horas de trabajo por día × número de días.'),
          t('Working hours per day: {work}. In one day: {rate} {x} {work} = {perDay}.', 'Horas de trabajo por día: {work}. En un día: {rate} {x} {work} = {perDay}.', v),
        ],
        steps: steps5(
          t('Find the total packages logged in {days} days.', 'Halla el total de paquetes registrados en {days} días.', v),
          t('{rate} per hour; {work} working hours a day; {days} days.', '{rate} por hora; {work} horas de trabajo al día; {days} días.', v),
          L('Rate × time, where time = hours per day × days.', 'Tasa × tiempo, donde tiempo = horas por día × días.'),
          t('{rate} {x} {work} = {perDay} per day. {perDay} {x} {days} = {a}.', '{rate} {x} {work} = {perDay} por día. {perDay} {x} {days} = {a}.', v),
          t('Estimate: about {rate} {x} {th} hours in total is close to {a}.', 'Estimación: unas {rate} {x} {th} horas en total se acerca a {a}.', { ...v, th: work * p.days }),
        ),
        beginner: L('A rate tells you what happens in ONE hour. To know what happens over many hours, repeat it that many times. So first count all the hours worked, then multiply the hourly amount by that count.', 'Una tasa te dice qué pasa en UNA hora. Para saber qué pasa en muchas horas, repítela esa cantidad de veces. Así que primero cuenta todas las horas trabajadas y luego multiplica la cantidad por hora por ese número.'),
        formula: L('total = rate × time', 'total = tasa × tiempo'),
        visual: { type: 'route', params: { legs: [{ rate: p.rate, time: work * p.days }], unitD: 'packages', unitT: 'h', find: 'distance' } },
      };
    },
    check(p) { let s = 0; for (let d = 0; d < p.days; d++) for (let h = 0; h < p.hours - p.breakH; h++) s += p.rate; return s; },
  }),

  defineTemplate({
    id: 'ar.ops.change', topic: 'ar.ops', levels: [3, 4, 5],
    params(rng, level) {
      const price = rng.pick([3, 4, 6, 7, 8, 9, 12, 15]), n = rng.int(3, 8), fee = level >= 4 ? rng.pick([5, 8, 10, 12]) : 0;
      const cost = price * n + fee, bill = [50, 100, 200].find((b) => b > cost + 2) || 500;
      return { price, n, fee, bill, weight: level >= 5 ? rng.int(2, 9) : 0 };
    },
    build(p) {
      const cost = p.price * p.n + p.fee, a = p.bill - cost, v = { ...p, cost, a, pm: fmtMoney(p.price), fm: fmtMoney(p.fee), bm: fmtMoney(p.bill), cm: fmtMoney(cost), sub: fmtMoney(p.price * p.n), x: TIMES, m: MINUS };
      return {
        prompt: t('A supply clerk buys {n} flashlights at {pm} each' + (p.weight ? ' (each weighs {weight} ounces)' : '') + (p.fee ? ' and pays a {fm} delivery fee' : '') + '. She pays with {bm}. How much change does she get?', 'Una encargada de suministros compra {n} linternas a {pm} cada una' + (p.weight ? ' (cada una pesa {weight} onzas)' : '') + (p.fee ? ' y paga {fm} de envío' : '') + '. Paga con {bm}. ¿Cuánto cambio recibe?', v),
        answer: ans.money(a), estSeconds: 70,
        wrong: [
          { value: cost, tag: 'gave-cost', why: L('That is what she spent. Change is what is left of the money she handed over.', 'Eso es lo que gastó. El cambio es lo que sobra del dinero que entregó.') },
          { value: p.bill - p.price * p.n, tag: 'ignored-fee', why: L('You forgot the delivery fee.', 'Olvidaste el cargo de envío.') },
          { value: p.bill - p.price - p.fee, tag: 'one-item', why: t('You subtracted the price of one flashlight, not {n}.', 'Restaste el precio de una linterna, no de {n}.', v) },
          { value: p.bill - p.price - p.n - p.fee, tag: 'added-not-multiplied', why: t('"{n} at {pm} each" means {n} {x} {pm}. You added the two numbers instead of multiplying.', '"{n} a {pm} cada una" significa {n} {x} {pm}. Sumaste los dos números en lugar de multiplicar.', v) },
          p.weight ? { value: p.bill - cost - p.weight, tag: 'used-extra-info', why: L('The weight has nothing to do with money. Leave it out of the calculation.', 'El peso no tiene nada que ver con el dinero. Déjalo fuera del cálculo.') } : null,
          borrows(p.bill, cost) ? { value: a + 10, tag: 'borrow-error', why: BORROW } : null,
        ],
        hints: [
          L('Change = money handed over minus the total cost. Find the total cost first and ignore facts that are not about money.', 'Cambio = dinero entregado menos el costo total. Halla primero el costo total e ignora los datos que no son de dinero.'),
          L('total cost = (number × price each) + any fee;  change = paid − total cost.', 'costo total = (cantidad × precio de cada uno) + cualquier cargo;  cambio = pagado − costo total.'),
          t('Cost of the flashlights: {n} {x} {pm} = {sub}.', 'Costo de las linternas: {n} {x} {pm} = {sub}.', v),
        ],
        steps: steps5(
          L('Find the change after a purchase.', 'Halla el cambio después de una compra.'),
          t('{n} items at {pm}' + (p.fee ? ', fee {fm}' : '') + ', paid {bm}.' + (p.weight ? ' The weight is not needed.' : ''), '{n} artículos a {pm}' + (p.fee ? ', cargo {fm}' : '') + ', pagó {bm}.' + (p.weight ? ' El peso no se necesita.' : ''), v),
          L('Multiply for the cost, add the fee, subtract from the amount paid.', 'Multiplica para el costo, suma el cargo y resta de lo pagado.'),
          t('{n} {x} {pm} = {sub}' + (p.fee ? '; {sub} + {fm} = {cm}' : '') + '. {bm} {m} {cm} = {am}.', '{n} {x} {pm} = {sub}' + (p.fee ? '; {sub} + {fm} = {cm}' : '') + '. {bm} {m} {cm} = {am}.', { ...v, am: fmtMoney(a) }),
          t('{am} + {cm} = {bm}. It checks.', '{am} + {cm} = {bm}. Coincide.', { ...v, am: fmtMoney(a) }),
        ),
        beginner: L('Break it into two small jobs. Job one: what did everything cost together? Job two: she gave the cashier more than that, so how much comes back? Extra facts such as weight have nothing to do with money, so leave them out.', 'Divídelo en dos tareas pequeñas. Tarea uno: ¿cuánto costó todo junto? Tarea dos: ella le dio al cajero más que eso, así que ¿cuánto regresa? Los datos extra, como el peso, no tienen que ver con dinero: déjalos fuera.'),
        formula: L('change = paid − (number × price + fees)', 'cambio = pagado − (cantidad × precio + cargos)'),
        visual: { type: 'bars', params: { values: [{ label: L('paid', 'pagó'), value: p.bill }, { label: L('cost', 'costo'), value: cost }], mode: 'total' } },
      };
    },
    check(p) { let c = p.fee; for (let i = 0; i < p.n; i++) c += p.price; return p.bill - c; },
  }),
];
