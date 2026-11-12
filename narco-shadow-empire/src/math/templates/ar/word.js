// Topic pack: ar.word - translating written situations into equations (levels 1-4).
import { defineTemplate, ans, steps5, t, N, L, fmtMoney, TIMES, MINUS, DIV } from '../../kit.js';

export default [
  defineTemplate({
    id: 'ar.word.compare', topic: 'ar.word', levels: [1, 2, 3], themes: ['warehouse'],
    params(rng, level) { return { base: rng.int(6, level === 1 ? 20 : 60), k: level === 1 ? 1 : rng.int(2, 4), more: rng.int(3, 15), sign: level >= 2 && rng.chance(0.4) ? -1 : 1, askTotal: level >= 3 }; },
    build(p) {
      const b = p.k * p.base + p.sign * p.more, a = p.askTotal ? b + p.base : b;
      const rel = p.k === 1 ? L('', '') : p.k === 2 ? L('twice ', 'el doble de ') : t('{k} times ', '{k} veces ', p);
      const v = { ...p, b, a, x: TIMES, m: MINUS, rel, dir: p.sign > 0 ? L('more than', 'más que') : L('fewer than', 'menos que'), op: p.sign > 0 ? '+' : MINUS, kb: p.k * p.base };
      return {
        prompt: t('Dock A logged {base} deliveries this week. Dock B logged {more} {dir} {rel}Dock A. ' + (p.askTotal ? 'How many deliveries did the two docks log together?' : 'How many deliveries did Dock B log?'),
          'El muelle A registró {base} entregas esta semana. El muelle B registró {more} {dir} {rel}el muelle A. ' + (p.askTotal ? '¿Cuántas entregas registraron los dos muelles en total?' : '¿Cuántas entregas registró el muelle B?'), v),
        answer: ans.int(a, N('delivery', 'deliveries', 'entrega', 'entregas')), estSeconds: 50,
        wrong: [
          { value: p.askTotal ? b : b + p.base, tag: p.askTotal ? 'stopped-early' : 'answered-total', why: p.askTotal ? L('That is Dock B alone. The question asks for both docks together.', 'Eso es solo el muelle B. La pregunta pide los dos muelles juntos.') : L('You added Dock A. The question asks only about Dock B.', 'Sumaste el muelle A. La pregunta solo pide el muelle B.') },
          { value: (p.k * p.base - p.sign * p.more) + (p.askTotal ? p.base : 0), tag: 'wrong-direction', why: t('"{dir}" tells you which way to go: here it means {op} {more}.', '"{dir}" te indica la dirección: aquí significa {op} {more}.', v) },
          { value: p.k * (p.base + p.sign * p.more) + (p.askTotal ? p.base : 0), tag: 'grouping', why: t('Multiply Dock A by {k} first, THEN adjust by {more}.', 'Primero multiplica el muelle A por {k} y DESPUÉS ajusta con {more}.', v) },
          { value: p.base + p.more + p.k, tag: 'added-all', why: L('Do not simply add every number you see; translate each phrase into an operation.', 'No sumes sin más todos los números que ves; traduce cada frase a una operación.') },
        ],
        hints: [
          L('Translate the sentence piece by piece. "More than" adds, "fewer than" subtracts, "twice / times" multiplies.', 'Traduce la oración parte por parte. "Más que" suma, "menos que" resta, "el doble / veces" multiplica.'),
          t('B = {k} {x} A {op} {more}' + (p.askTotal ? ';  total = A + B' : ''), 'B = {k} {x} A {op} {more}' + (p.askTotal ? ';  total = A + B' : ''), v),
          t('Start with {k} {x} {base} = {kb}.', 'Empieza con {k} {x} {base} = {kb}.', v)],
        steps: steps5(
          p.askTotal ? L('Find the combined deliveries of both docks.', 'Halla las entregas combinadas de ambos muelles.') : L('Find Dock B’s deliveries.', 'Halla las entregas del muelle B.'),
          t('A = {base}. B is {more} {dir} {rel}A.', 'A = {base}. B es {more} {dir} {rel}A.', v),
          t('Write the equation: B = {k} {x} {base} {op} {more}.', 'Escribe la ecuación: B = {k} {x} {base} {op} {more}.', v),
          t('{k} {x} {base} = {kb}; {kb} {op} {more} = {b}.' + (p.askTotal ? ' Total: {base} + {b} = {a}.' : ''), '{k} {x} {base} = {kb}; {kb} {op} {more} = {b}.' + (p.askTotal ? ' Total: {base} + {b} = {a}.' : ''), v),
          t('Is B {dir} {rel}A by {more}? {b} vs {kb}: yes.', '¿B es {more} {dir} {rel}A? {b} frente a {kb}: sí.', v)),
        beginner: L('A word problem is a sentence written in a different language. Read it slowly and swap each phrase for a symbol: the thing you are comparing with becomes your starting number, and each comparing phrase becomes one operation on it.', 'Un problema verbal es una oración escrita en otro idioma. Léela despacio y cambia cada frase por un símbolo: aquello con lo que comparas es tu número inicial, y cada frase de comparación es una operación sobre él.'),
        formula: L('"n more than k times A"  →  k × A + n', '"n más que k veces A"  →  k × A + n'),
        visual: { type: 'bars', params: { values: [{ label: L('A'), value: p.base }, { label: L('B'), value: b }], mode: 'total' } },
      };
    },
    check(p) { let b = 0; for (let i = 0; i < p.k; i++) b += p.base; b += p.sign * p.more; return p.askTotal ? b + p.base : b; },
  }),

  defineTemplate({
    id: 'ar.word.fee', topic: 'ar.word', levels: [2, 3, 4],
    params(rng, level) { const rate = rng.pick([4, 5, 6, 8, 12, 15]), fee = rng.pick([10, 15, 20, 25, 30]), n = rng.int(3, 12); return { rate, fee, n, reverse: level >= 3, tip: level >= 4 ? rng.int(2, 9) : 0 }; },
    build(p) {
      const total = p.fee + p.rate * p.n, v = { ...p, total, fm: fmtMoney(p.fee), rm: fmtMoney(p.rate), tm: fmtMoney(total), x: TIMES, m: MINUS, d: DIV, rem: fmtMoney(total - p.fee), var: fmtMoney(p.rate * p.n) };
      const extraEn = p.tip ? ' (The courier also waited {tip} minutes; waiting is free.)' : '', extraEs = p.tip ? ' (El mensajero además esperó {tip} minutos; la espera es gratis.)' : '';
      return p.reverse ? {
        prompt: t('A courier charges a flat fee of {fm} plus {rm} per mile. A delivery cost {tm}.' + extraEn + ' How many miles was the delivery?', 'Un mensajero cobra una tarifa fija de {fm} más {rm} por milla. Una entrega costó {tm}.' + extraEs + ' ¿De cuántas millas fue la entrega?', v),
        answer: ans.int(p.n, N('mile', 'miles', 'milla', 'millas')), estSeconds: 70,
        wrong: [
          { value: total / p.rate, tag: 'ignored-fee', why: L('You divided the whole bill by the per-mile rate. Remove the flat fee first.', 'Dividiste toda la cuenta entre la tarifa por milla. Primero quita la tarifa fija.') },
          { value: total - p.fee, tag: 'forgot-divide', why: L('That is the money spent on miles. Divide it by the rate to get the miles.', 'Ese es el dinero gastado en millas. Divídelo entre la tarifa para obtener las millas.') },
          { value: (total + p.fee) / p.rate, tag: 'same-op', why: L('The flat fee is part of the bill, so subtract it; do not add it.', 'La tarifa fija es parte de la cuenta: réstala, no la sumes.') },
        ].filter((w) => Number.isInteger(w.value)),
        hints: [
          L('The bill has two parts: a part that never changes and a part that grows with the miles. Peel off the fixed part first.', 'La cuenta tiene dos partes: una que nunca cambia y otra que crece con las millas. Quita primero la parte fija.'),
          L('total = fee + rate × miles   →   miles = (total − fee) ÷ rate', 'total = tarifa + precio × millas   →   millas = (total − tarifa) ÷ precio'),
          t('{tm} {m} {fm} = {rem} was charged for the miles.', '{tm} {m} {fm} = {rem} se cobró por las millas.', v)],
        steps: steps5(L('Find the number of miles.', 'Halla el número de millas.'), t('Fee {fm}, {rm} per mile, total {tm}.', 'Tarifa {fm}, {rm} por milla, total {tm}.', v),
          L('Write total = fee + rate × miles and solve for miles.', 'Escribe total = tarifa + precio × millas y despeja las millas.'),
          t('{tm} {m} {fm} = {rem}. {rem} {d} {rm} = {n}.', '{tm} {m} {fm} = {rem}. {rem} {d} {rm} = {n}.', v),
          t('{fm} + {n} {x} {rm} = {tm}. It checks.', '{fm} + {n} {x} {rm} = {tm}. Coincide.', v)),
        beginner: L('Imagine the receipt. One line is the same on every delivery; the other line is "miles times price per mile". Cross out the fixed line, and what is left tells you how many miles were paid for.', 'Imagina el recibo. Una línea es igual en todas las entregas; la otra es "millas por precio por milla". Tacha la línea fija y lo que queda te dice cuántas millas se pagaron.'),
        formula: L('miles = (total − fee) ÷ rate', 'millas = (total − tarifa) ÷ precio'), visual: { type: 'balance', params: { display: `${p.rate}x + ${p.fee} = ${total}`, lhs: { x: p.rate, c: p.fee }, rhs: { x: 0, c: total }, solution: p.n } },
      } : {
        prompt: t('A courier charges a flat fee of {fm} plus {rm} per mile. How much does a {n}-mile delivery cost?', 'Un mensajero cobra una tarifa fija de {fm} más {rm} por milla. ¿Cuánto cuesta una entrega de {n} millas?', v),
        answer: ans.money(total), estSeconds: 50,
        wrong: [
          { value: p.rate * p.n, tag: 'ignored-fee', why: L('You left out the flat fee.', 'Olvidaste la tarifa fija.') },
          { value: (p.fee + p.rate) * p.n, tag: 'fee-per-mile', why: L('The flat fee is charged once, not once per mile.', 'La tarifa fija se cobra una vez, no una vez por milla.') },
          { value: p.fee + p.rate + p.n, tag: 'added-all', why: L('"Per mile" means multiply the rate by the miles.', '"Por milla" significa multiplicar la tarifa por las millas.') },
        ],
        hints: [
          L('One part of the price is paid once; the other part is paid for every mile.', 'Una parte del precio se paga una vez; la otra se paga por cada milla.'),
          L('total = fee + rate × miles', 'total = tarifa + precio × millas'),
          t('The mileage part: {n} {x} {rm} = {var}.', 'La parte por millas: {n} {x} {rm} = {var}.', v)],
        steps: steps5(L('Find the total cost.', 'Halla el costo total.'), t('Fee {fm}, {rm} per mile, {n} miles.', 'Tarifa {fm}, {rm} por milla, {n} millas.', v),
          L('total = fee + rate × miles.', 'total = tarifa + precio × millas.'),
          t('{n} {x} {rm} = {var}. {var} + {fm} = {tm}.', '{n} {x} {rm} = {var}. {var} + {fm} = {tm}.', v),
          L('The total is more than the fee and more than the mileage alone: reasonable.', 'El total es mayor que la tarifa y que el costo por millas por separado: es razonable.')),
        beginner: L('Think of a taxi meter: it starts at a fixed amount the moment you get in, then climbs by the same step for every mile. Add the starting amount to all the steps.', 'Piensa en un taxímetro: empieza con una cantidad fija al subir y luego aumenta el mismo escalón por cada milla. Suma la cantidad inicial a todos los escalones.'),
        formula: L('total = fee + rate × miles', 'total = tarifa + precio × millas'), visual: { type: 'route', params: { legs: [{ rate: p.rate, time: p.n }], unitD: '$', unitT: 'mi', find: 'distance' } },
      };
    },
    check(p) { let tot = p.fee; for (let i = 0; i < p.n; i++) tot += p.rate; if (!p.reverse) return tot; let miles = 0, rest = tot - p.fee; while (rest > 0) { rest -= p.rate; miles++; } return miles; },
  }),
];
