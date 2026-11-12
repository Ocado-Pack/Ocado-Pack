// Topic pack: mk.linear - solving one-variable linear equations (levels 1-5).
import { defineTemplate, ans, steps5, t, L, fmtInt, MINUS, TIMES, DIV } from '../../kit.js';

const sgn = (n) => (n < 0 ? MINUS + ' ' + Math.abs(n) : '+ ' + n);         // "+ 5" / "− 5"
const num = (n) => (n < 0 ? MINUS + Math.abs(n) : String(n));              // "−5"
const pick = (rng, lo, hi) => { let v = 0; while (v === 0) v = rng.int(lo, hi); return v; };
const BAL = L('An equation is a balanced scale: whatever you do to one side you must do to the other. Undo the operations around x one at a time, in reverse order, until x stands alone.',
  'Una ecuación es una balanza equilibrada: lo que hagas a un lado debes hacerlo al otro. Deshaz las operaciones alrededor de x una a la vez, en orden inverso, hasta que x quede sola.');

export default [
  defineTemplate({
    id: 'mk.linear.onestep', topic: 'mk.linear', levels: [1],
    params(rng) { const kind = rng.pick(['add', 'mul']); return kind === 'add' ? { kind, a: pick(rng, -12, 15), x: rng.int(2, 20) } : { kind, a: rng.int(2, 9), x: rng.int(2, 12) }; },
    build(p) {
      const add = p.kind === 'add', b = add ? p.x + p.a : p.a * p.x;
      const expr = add ? `x ${sgn(p.a)} = ${num(b)}` : `${p.a}x = ${b}`;
      const v = { expr, a: Math.abs(p.a), b: num(b), x: p.x, inv: add ? (p.a > 0 ? L('subtract', 'resta') : L('add', 'suma')) : L('divide by', 'divide entre'), d: DIV };
      return {
        prompt: t('Solve {expr}.', 'Resuelve {expr}.', v), expr, answer: ans.x(p.x), accept: [String(p.x)], estSeconds: 30,
        wrong: add
          ? [{ value: b + p.a, tag: 'same-op', why: L('You repeated the operation instead of undoing it. Use the opposite operation on both sides.', 'Repetiste la operación en lugar de deshacerla. Usa la operación contraria en ambos lados.') },
            { value: -p.x, tag: 'sign', why: L('Check the sign of your result.', 'Revisa el signo de tu resultado.') },
            { value: b, tag: 'no-step', why: L('That is the right-hand side; x still has a number attached to it.', 'Ese es el lado derecho; x todavía tiene un número pegado.') }]
          : [{ value: b - p.a, tag: 'subtracted', why: t('{a}x means {a} times x, so undo it by dividing, not subtracting.', '{a}x significa {a} por x: se deshace dividiendo, no restando.', v) },
            { value: b * p.a, tag: 'same-op', why: L('You multiplied again instead of dividing.', 'Volviste a multiplicar en lugar de dividir.') },
            { value: b, tag: 'no-step', why: L('That is the right-hand side; you still need to divide.', 'Ese es el lado derecho; aún debes dividir.') }],
        hints: [BAL,
          t('To undo what is attached to x, {inv} {a} on both sides.', 'Para deshacer lo que acompaña a x, {inv} {a} en ambos lados.', v),
          add ? t('{b} {op} {a} = ?', '{b} {op} {a} = ?', { ...v, op: p.a > 0 ? MINUS : '+' }) : t('{b} {d} {a} = ?', '{b} {d} {a} = ?', v)],
        steps: steps5(
          L('Find the value of x that makes the equation true.', 'Halla el valor de x que hace verdadera la ecuación.'),
          t('The equation {expr}.', 'La ecuación {expr}.', v),
          t('Undo the operation on x: {inv} {a} on both sides.', 'Deshaz la operación sobre x: {inv} {a} en ambos lados.', v),
          t('x = {x}.', 'x = {x}.', v),
          add ? t('{x} {s} = {b}. True.', '{x} {s} = {b}. Verdadero.', { ...v, s: sgn(p.a) }) : t('{a} {t} {x} = {b}. True.', '{a} {t} {x} = {b}. Verdadero.', { ...v, t: TIMES })),
        beginner: BAL, formula: L('x + a = b  →  x = b − a;   ax = b  →  x = b ÷ a', 'x + a = b  →  x = b − a;   ax = b  →  x = b ÷ a'),
        visual: { type: 'balance', params: { display: expr, lhs: add ? { x: 1, c: p.a } : { x: p.a, c: 0 }, rhs: { x: 0, c: b }, solution: p.x } },
      };
    },
    check(p) { for (let x = -60; x <= 60; x++) if ((p.kind === 'add' ? x + p.a : p.a * x) === (p.kind === 'add' ? p.x + p.a : p.a * p.x)) return x; },
  }),

  defineTemplate({
    id: 'mk.linear.twostep', topic: 'mk.linear', levels: [1, 2, 3],
    params(rng, level) { return { a: level >= 3 ? pick(rng, -9, 9) || 2 : rng.int(2, 9), b: pick(rng, level === 1 ? 1 : -20, 20), x: level >= 3 ? pick(rng, -9, 12) : rng.int(1, 12) }; },
    build(p) {
      if (Math.abs(p.a) === 1) p = { ...p, a: 2 };
      const c = p.a * p.x + p.b, expr = `${num(p.a)}x ${sgn(p.b)} = ${num(c)}`, mid = c - p.b;
      const v = { expr, a: num(p.a), b: Math.abs(p.b), c: num(c), mid: num(mid), x: num(p.x), op: p.b > 0 ? MINUS : '+', inv: p.b > 0 ? L('Subtract', 'Resta') : L('Add', 'Suma'), d: DIV, t: TIMES };
      return {
        prompt: t('Solve {expr}.', 'Resuelve {expr}.', v), expr, answer: ans.x(p.x), accept: [String(p.x)], estSeconds: 45,
        wrong: [
          { value: (c + p.b) / p.a, tag: 'same-op', why: t('You moved {b} the wrong way. Undo "{s}" with the opposite operation.', 'Moviste {b} en la dirección equivocada. Deshaz "{s}" con la operación contraria.', { ...v, s: sgn(p.b) }) },
          { value: mid, tag: 'forgot-divide', why: t('You stopped at {a}x = {mid}. Divide both sides by {a}.', 'Te detuviste en {a}x = {mid}. Divide ambos lados entre {a}.', v) },
          { value: c / p.a - p.b, tag: 'divided-first', why: t('If you divide first, EVERY term must be divided by {a}, including the {b}. It is easier to undo the {s} first.', 'Si divides primero, TODOS los términos se dividen entre {a}, incluido el {b}. Es más fácil deshacer primero el {s}.', { ...v, s: sgn(p.b) }) },
          { value: -p.x, tag: 'sign', why: L('Check the signs when you divide.', 'Revisa los signos al dividir.') },
        ].filter((w) => Number.isInteger(w.value) || Math.abs(w.value * 2 % 1) < 1e-9),
        hints: [BAL,
          L('Two steps, in reverse order of operations: first undo the addition/subtraction, then undo the multiplication.', 'Dos pasos, en orden inverso de operaciones: primero deshaz la suma/resta y luego la multiplicación.'),
          t('{inv} {b} on both sides: {a}x = {c} {op} {b}.', '{inv} {b} en ambos lados: {a}x = {c} {op} {b}.', v)],
        steps: steps5(
          L('Find x.', 'Halla x.'), t('{expr}', '{expr}', v),
          L('Undo + or − first, then undo ×.', 'Deshaz primero + o −, luego ×.'),
          t('{inv} {b}: {a}x = {mid}. Divide by {a}: x = {x}.', '{inv} {b}: {a}x = {mid}. Divide entre {a}: x = {x}.', v),
          t('{a} {t} ({x}) {s} = {c}. True.', '{a} {t} ({x}) {s} = {c}. Verdadero.', { ...v, s: sgn(p.b) })),
        beginner: BAL, formula: L('ax + b = c  →  x = (c − b) ÷ a', 'ax + b = c  →  x = (c − b) ÷ a'),
        trick: L('Undo in reverse: SADMEP (the order of operations backwards).', 'Deshaz al revés: el orden de operaciones, pero hacia atrás.'),
        visual: { type: 'balance', params: { display: expr, lhs: { x: p.a, c: p.b }, rhs: { x: 0, c }, solution: p.x } },
        rookie: { lines: [L(expr), t('{a}x = {c} + {b}', '{a}x = {c} + {b}', v), t('{a}x = {w}', '{a}x = {w}', { ...v, w: num(c + Math.abs(p.b)) }), t('x = {w}', 'x = {w}', { w: L('…') })].slice(0, p.b > 0 ? 4 : 0), wrongIndex: 1, why: t('To undo + {b} you subtract {b} from both sides: {a}x = {mid}.', 'Para deshacer + {b} se resta {b} en ambos lados: {a}x = {mid}.', v) },
      };
    },
    check(p) { const a = Math.abs(p.a) === 1 ? 2 : p.a; for (let x = -80; x <= 80; x++) if (a * x + p.b === a * p.x + p.b) return x; },
  }),

  defineTemplate({
    id: 'mk.linear.distribute', topic: 'mk.linear', levels: [2, 3, 4],
    params(rng, level) { const a = level >= 4 ? pick(rng, -6, 7) : rng.int(2, 7), b = pick(rng, -9, 9), x = level >= 3 ? pick(rng, -8, 12) : rng.int(Math.max(1, 1 - b), 14); return { a: Math.abs(a) === 1 ? 3 : a, b, c: (Math.abs(a) === 1 ? 3 : a) * (x + b) }; },
    build(p) {
      const x = p.c / p.a - p.b, expr = `${num(p.a)}(x ${sgn(p.b)}) = ${num(p.c)}`, inner = p.c / p.a, ab = p.a * p.b;
      const v = { expr, a: num(p.a), b: Math.abs(p.b), c: num(p.c), inner: num(inner), x: num(x), ab: num(ab), op: p.b > 0 ? MINUS : '+', inv: p.b > 0 ? L('subtract', 'resta') : L('add', 'suma'), s: sgn(p.b), sab: sgn(ab), d: DIV, t: TIMES };
      return {
        prompt: t('Solve {expr}.', 'Resuelve {expr}.', v), expr, answer: ans.x(x), accept: [String(x)], estSeconds: 60,
        wrong: [
          { value: (p.c - p.b) / p.a, tag: 'partial-distribute', why: t('You multiplied only x by {a}. The {a} multiplies everything inside the parentheses: {a}x {sab}.', 'Multiplicaste solo x por {a}. El {a} multiplica todo lo que está dentro del paréntesis: {a}x {sab}.', v) },
          { value: inner + p.b, tag: 'same-op', why: t('After dividing you had x {s} = {inner}. Undo "{s}" with the opposite operation.', 'Después de dividir tenías x {s} = {inner}. Deshaz "{s}" con la operación contraria.', v) },
          { value: p.c - ab, tag: 'forgot-divide', why: t('That is {a}x. You still have to divide by {a}.', 'Eso es {a}x. Todavía debes dividir entre {a}.', v) },
          { value: inner, tag: 'stopped-early', why: t('{inner} is the value of the parentheses (x {s}), not of x.', '{inner} es el valor del paréntesis (x {s}), no de x.', v) },
          { value: -x, tag: 'sign', why: L('Check your signs.', 'Revisa los signos.') },
        ].filter((w) => Number.isInteger(w.value) || Math.abs((w.value * 4) % 1) < 1e-9),
        hints: [
          L('The number in front of the parentheses multiplies the whole group inside. You can either divide both sides by it first, or distribute it.', 'El número delante del paréntesis multiplica a todo el grupo de adentro. Puedes dividir primero ambos lados entre él, o distribuirlo.'),
          t('Route 1: divide both sides by {a}, then {inv} {b}.  Route 2: distribute to get {a}x {sab} = {c}, then solve the two-step equation.', 'Ruta 1: divide ambos lados entre {a} y luego {inv} {b}.  Ruta 2: distribuye para obtener {a}x {sab} = {c} y resuelve la ecuación de dos pasos.', v),
          t('Divide both sides by {a}:  x {s} = {c} {d} {a}.', 'Divide ambos lados entre {a}:  x {s} = {c} {d} {a}.', v)],
        steps: steps5(
          L('Find the value of x.', 'Halla el valor de x.'),
          t('{expr}: {a} times the group (x {s}) equals {c}.', '{expr}: {a} por el grupo (x {s}) es igual a {c}.', v),
          t('Divide both sides by {a} to free the parentheses, then {inv} {b}.', 'Divide ambos lados entre {a} para liberar el paréntesis y luego {inv} {b}.', v),
          t('{c} {d} {a} = {inner}, so x {s} = {inner}. Then x = {inner} {op} {b} = {x}.', '{c} {d} {a} = {inner}, así que x {s} = {inner}. Luego x = {inner} {op} {b} = {x}.', v),
          t('{a}({x} {s}) = {a} {t} {inner} = {c}. True.', '{a}({x} {s}) = {a} {t} {inner} = {c}. Verdadero.', v)),
        beginner: L('Treat the parentheses as one sealed box. The equation says "several identical boxes weigh this much", so one box weighs the total shared equally among them. Once you know what one box holds, open it and undo the small step inside.', 'Trata el paréntesis como una caja sellada. La ecuación dice "varias cajas idénticas pesan tanto", así que una caja pesa el total repartido en partes iguales. Cuando sepas cuánto contiene una caja, ábrela y deshaz el pequeño paso de adentro.'),
        formula: L('a(x + b) = c  →  x + b = c ÷ a  →  x = c ÷ a − b', 'a(x + b) = c  →  x + b = c ÷ a  →  x = c ÷ a − b'),
        trick: L('Distributive property: a(x + b) = ax + ab.', 'Propiedad distributiva: a(x + b) = ax + ab.'),
        visual: { type: 'balance', params: { display: expr, lhs: { x: p.a, c: ab, mult: p.a, inner: { x: 1, c: p.b } }, rhs: { x: 0, c: p.c }, solution: x } },
        rookie: { lines: [L(expr), t('{a}x {s} = {c}', '{a}x {s} = {c}', v), t('{a}x = {c} {op} {b}', '{a}x = {c} {op} {b}', v), L('x = …')], wrongIndex: 1, why: t('The {a} must multiply both terms inside: {a}x {sab} = {c}.', 'El {a} debe multiplicar ambos términos de adentro: {a}x {sab} = {c}.', v) },
      };
    },
    check(p) { for (let x = -200; x <= 200; x++) if (p.a * (x + p.b) === p.c) return x; },
  }),

  defineTemplate({
    id: 'mk.linear.bothsides', topic: 'mk.linear', levels: [3, 4, 5],
    params(rng, level) {
      const c = rng.int(1, 6), a = c + rng.int(1, level >= 5 ? 7 : 4), x = level >= 4 ? pick(rng, -9, 12) : rng.int(1, 12), b = pick(rng, -15, 15);
      return { a, b, c, d: (a - c) * x + b };
    },
    build(p) {
      const x = (p.d - p.b) / (p.a - p.c), expr = `${p.a}x ${sgn(p.b)} = ${p.c}x ${sgn(p.d)}`, k = p.a - p.c, rhs = p.d - p.b;
      const v = { expr, a: p.a, c: p.c, k, rhs: num(rhs), x: num(x), b: Math.abs(p.b), d: num(p.d), sb: sgn(p.b), opb: p.b > 0 ? MINUS : '+', dv: DIV, t: TIMES };
      return {
        prompt: t('Solve {expr}.', 'Resuelve {expr}.', v), expr, answer: ans.x(x), accept: [String(x)], estSeconds: 75,
        wrong: [
          { value: (p.d - p.b) / (p.a + p.c), tag: 'added-x', why: t('To collect the x-terms, subtract {c}x from both sides ({a}x − {c}x = {k}x); you added them.', 'Para juntar los términos con x, resta {c}x en ambos lados ({a}x − {c}x = {k}x); tú los sumaste.', v) },
          { value: (p.d + p.b) / k, tag: 'same-op', why: t('The constant {sb} was moved the wrong way; undo it with the opposite operation.', 'La constante {sb} se movió en la dirección equivocada; deshazla con la operación contraria.', v) },
          { value: rhs, tag: 'forgot-divide', why: t('You reached {k}x = {rhs} but did not divide by {k}.', 'Llegaste a {k}x = {rhs} pero no dividiste entre {k}.', v) },
          { value: -x, tag: 'sign', why: L('Check your signs.', 'Revisa los signos.') },
        ].filter((w) => Number.isInteger(w.value) || Math.abs((w.value * 4) % 1) < 1e-9),
        hints: [
          L('Get every x on one side and every plain number on the other. Moving a term means doing the opposite operation to both sides.', 'Lleva todas las x a un lado y todos los números al otro. Mover un término significa hacer la operación contraria en ambos lados.'),
          t('Subtract {c}x from both sides, then undo the constant, then divide by the coefficient of x.', 'Resta {c}x en ambos lados, luego deshaz la constante y por último divide entre el coeficiente de x.', v),
          t('Subtract {c}x from both sides: {k}x {sb} = {d}.', 'Resta {c}x en ambos lados: {k}x {sb} = {d}.', v)],
        steps: steps5(
          L('Find x when it appears on both sides.', 'Halla x cuando aparece en ambos lados.'), t('{expr}', '{expr}', v),
          L('Collect x-terms on one side, constants on the other, then divide.', 'Junta los términos con x en un lado, las constantes en el otro, y divide.'),
          t('{k}x {sb} = {d}  →  {k}x = {rhs}  →  x = {rhs} {dv} {k} = {x}.', '{k}x {sb} = {d}  →  {k}x = {rhs}  →  x = {rhs} {dv} {k} = {x}.', v),
          t('Left: {a} {t} ({x}) {sb} = {val}. Right: {c} {t} ({x}) {sd} = {val}. Equal.', 'Izquierda: {a} {t} ({x}) {sb} = {val}. Derecha: {c} {t} ({x}) {sd} = {val}. Iguales.', { ...v, val: num(p.a * x + p.b), sd: sgn(p.d) })),
        beginner: BAL, formula: L('ax + b = cx + d  →  (a − c)x = d − b  →  x = (d − b) ÷ (a − c)', 'ax + b = cx + d  →  (a − c)x = d − b  →  x = (d − b) ÷ (a − c)'),
        visual: { type: 'balance', params: { display: expr, lhs: { x: p.a, c: p.b }, rhs: { x: p.c, c: p.d }, solution: x } },
      };
    },
    check(p) { for (let x = -300; x <= 300; x++) if (p.a * x + p.b === p.c * x + p.d) return x; },
  }),
];
export { fmtInt };
