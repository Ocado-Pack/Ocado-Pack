// Topic pack: mk.order - order of operations (levels 1-5).
import { defineTemplate, ans, steps5, t, L, TIMES, MINUS, DIV } from '../../kit.js';

const PEMDAS = L('PEMDAS: Parentheses, Exponents, then Multiplication and Division (left to right), then Addition and Subtraction (left to right).', 'PEMDAS: Paréntesis, Exponentes, luego Multiplicación y División (de izquierda a derecha), luego Suma y Resta (de izquierda a derecha).');
const BEG = L('Math has traffic rules so everyone gets the same answer. Grouped parts (parentheses) go first, powers next, then every multiply or divide, and adding or subtracting waits until the very end.', 'Las matemáticas tienen reglas de tránsito para que todos obtengan la misma respuesta. Las partes agrupadas (paréntesis) van primero, luego las potencias, después toda multiplicación o división, y sumar o restar espera hasta el final.');

export default [
  defineTemplate({
    id: 'mk.order.basic', topic: 'mk.order', levels: [1, 2, 3],
    params(rng, level) { return { form: level === 1 ? 0 : rng.int(0, 2), a: rng.int(2, 12), b: rng.int(2, 9), c: rng.int(2, 9), d: rng.int(1, 9) }; },
    build(p) {
      const { a, b, c, d } = p;
      const F = [
        { expr: `${a} + ${b} ${TIMES} ${c}`, val: a + b * c, first: `${b} ${TIMES} ${c} = ${b * c}`, then: `${a} + ${b * c} = ${a + b * c}`, ltr: (a + b) * c },
        { expr: `${a} ${TIMES} (${b} + ${c}) ${MINUS} ${d}`, val: a * (b + c) - d, first: `(${b} + ${c}) = ${b + c}`, then: `${a} ${TIMES} ${b + c} = ${a * (b + c)}; ${a * (b + c)} ${MINUS} ${d} = ${a * (b + c) - d}`, ltr: a * b + c - d },
        { expr: `${a * b} ${DIV} ${a} + ${c} ${TIMES} ${d}`, val: b + c * d, first: `${a * b} ${DIV} ${a} = ${b}; ${c} ${TIMES} ${d} = ${c * d}`, then: `${b} + ${c * d} = ${b + c * d}`, ltr: (b + c) * d },
      ][p.form];
      const v = { expr: F.expr, first: F.first, then: F.then, val: F.val };
      return {
        prompt: t('Evaluate: {expr}', 'Evalúa: {expr}', v), expr: F.expr, answer: ans.signed(F.val), estSeconds: 35,
        wrong: [
          { value: F.ltr, tag: 'left-to-right', why: L('You worked strictly left to right. Multiplication, division and parentheses come before addition and subtraction.', 'Trabajaste estrictamente de izquierda a derecha. La multiplicación, la división y los paréntesis van antes de la suma y la resta.') },
          { value: F.val + (p.form === 1 ? d * 2 : b), tag: 'slip', why: L('Re-check each small calculation.', 'Revisa cada cálculo pequeño.') },
          { value: F.val - c, tag: 'dropped-term', why: L('One of the terms was left out.', 'Faltó uno de los términos.') },
        ],
        hints: [PEMDAS, L('Do parentheses first, then × and ÷ from left to right, and only then + and −.', 'Haz primero los paréntesis, luego × y ÷ de izquierda a derecha, y solo después + y −.'), t('First: {first}.', 'Primero: {first}.', v)],
        steps: steps5(L('Find the single number the expression equals.', 'Halla el único número al que equivale la expresión.'), t('{expr}', '{expr}', v), PEMDAS, t('{first}. Then {then}.', '{first}. Luego {then}.', v), L('Each operation was done in PEMDAS order.', 'Cada operación se hizo en el orden PEMDAS.')),
        beginner: BEG, formula: PEMDAS, trick: L('"Please Excuse My Dear Aunt Sally."', 'PEMDAS: Paréntesis, Exponentes, Multiplicación/División, Adición/Sustracción.'),
        visual: { type: 'none', params: {} },
        rookie: p.form === 0 ? { lines: [L(F.expr), L(`${a} + ${b} = ${a + b}`), L(`${a + b} ${TIMES} ${c} = ${(a + b) * c}`)], wrongIndex: 1, why: t('Multiply before adding: {first}, then add.', 'Multiplica antes de sumar: {first}, y luego suma.', v) } : undefined,
      };
    },
    check(p) { const { a, b, c, d } = p; return p.form === 0 ? a + (b * c) : p.form === 1 ? (a * (b + c)) - d : ((a * b) / a) + (c * d); },
  }),

  defineTemplate({
    id: 'mk.order.powers', topic: 'mk.order', levels: [3, 4, 5],
    params(rng, level) { return { form: level === 3 ? 0 : rng.int(0, 1), a: rng.int(2, 9), b: rng.int(2, level >= 5 ? 6 : 4), c: rng.int(2, 5), d: rng.int(1, 6) }; },
    build(p) {
      const { a, b, c, d } = p, b2 = b * b, s = (b + d) * (b + d);
      const F = [
        { expr: `${a} + ${b}² ${TIMES} ${c}`, val: a + b2 * c, first: `${b}² = ${b2}`, then: `${b2} ${TIMES} ${c} = ${b2 * c}; ${a} + ${b2 * c} = ${a + b2 * c}`, w1: (a + b2) * c, w2: a + b * 2 * c },
        { expr: `(${b} + ${d})² ${MINUS} ${a} ${TIMES} ${c}`, val: s - a * c, first: `(${b} + ${d}) = ${b + d}; ${b + d}² = ${s}`, then: `${a} ${TIMES} ${c} = ${a * c}; ${s} ${MINUS} ${a * c} = ${s - a * c}`, w1: (s - a) * c, w2: b2 + d * d - a * c },
      ][p.form];
      const v = { expr: F.expr, first: F.first, then: F.then };
      return {
        prompt: t('Evaluate: {expr}', 'Evalúa: {expr}', v), expr: F.expr, answer: ans.signed(F.val), estSeconds: 50,
        wrong: [
          { value: F.w1, tag: 'left-to-right', why: L('Multiplication comes before addition and subtraction, even when it is written last.', 'La multiplicación va antes de la suma y la resta, aunque esté escrita al final.') },
          { value: F.w2, tag: 'exponent', why: p.form === 0 ? L('An exponent of 2 means multiply the number by itself, not by 2.', 'Un exponente 2 significa multiplicar el número por sí mismo, no por 2.') : L('(a + b)² is not a² + b². Add inside the parentheses first, then square.', '(a + b)² no es a² + b². Suma dentro del paréntesis primero y luego eleva al cuadrado.') },
          { value: F.val + c, tag: 'slip', why: L('Re-check each small calculation.', 'Revisa cada cálculo pequeño.') },
        ],
        hints: [PEMDAS, L('Parentheses, then the exponent, then ×, then + or −.', 'Paréntesis, luego el exponente, luego ×, luego + o −.'), t('First: {first}.', 'Primero: {first}.', v)],
        steps: steps5(L('Evaluate the expression.', 'Evalúa la expresión.'), t('{expr}', '{expr}', v), PEMDAS, t('{first}. Then {then}.', '{first}. Luego {then}.', v), L('Exponent before multiplication, multiplication before addition/subtraction.', 'Exponente antes que multiplicación, multiplicación antes que suma/resta.')),
        beginner: BEG, formula: PEMDAS, visual: { type: 'none', params: {} },
      };
    },
    check(p) { const { a, b, c, d } = p; return p.form === 0 ? a + Math.pow(b, 2) * c : Math.pow(b + d, 2) - a * c; },
  }),
];
