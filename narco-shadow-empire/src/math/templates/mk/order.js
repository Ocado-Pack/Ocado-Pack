// Topic pack: mk.order - order of operations (levels 1-5).
import { defineTemplate, ans, steps5, t, L, TIMES, MINUS, DIV } from '../../kit.js';

const PEMDAS = L('PEMDAS: Parentheses, Exponents, then Multiplication and Division (left to right), then Addition and Subtraction (left to right).', 'PEMDAS: Paréntesis, Exponentes, luego Multiplicación y División (de izquierda a derecha), luego Suma y Resta (de izquierda a derecha).');
const BEG = L('Math has traffic rules so everyone gets the same answer. Grouped parts (parentheses) go first, powers next, then every multiply or divide, and adding or subtracting waits until the very end.', 'Las matemáticas tienen reglas de tránsito para que todos obtengan la misma respuesta. Las partes agrupadas (paréntesis) van primero, luego las potencias, después toda multiplicación o división, y sumar o restar espera hasta el final.');
const LTR = L('You worked strictly left to right. Multiplication and division come before addition and subtraction.', 'Trabajaste estrictamente de izquierda a derecha. La multiplicación y la división van antes de la suma y la resta.');
const n = (v) => (v < 0 ? MINUS + Math.abs(v) : String(v));       // true minus sign for negative results

export default [
  defineTemplate({
    id: 'mk.order.basic', topic: 'mk.order', levels: [1, 2, 3],
    params(rng, level) { return { form: level === 1 ? 0 : rng.int(0, 2), a: rng.int(2, 12), b: rng.int(2, 9), c: rng.int(2, 9), d: rng.int(2, 9) }; },
    build(p) {
      const { a, b, c, d } = p;
      const F = [
        { expr: `${a} + ${b} ${TIMES} ${c}`, val: a + b * c, first: `${b} ${TIMES} ${c} = ${b * c}`, then: `${a} + ${b * c} = ${a + b * c}`,
          wrong: [
            { value: (a + b) * c, tag: 'left-to-right', why: LTR },
            { value: a * b + c, tag: 'wrong-pair', why: L('You multiplied the first two numbers. The × sign joins only the two numbers next to it.', 'Multiplicaste los dos primeros números. El signo × une solo los dos números que tiene al lado.') },
            { value: b * c, tag: 'dropped-term', why: L('You found the product but never added the first number.', 'Hallaste el producto pero no sumaste el primer número.') },
            { value: a + b + c, tag: 'added-all', why: L('You added every number. Do the multiplication first, then add.', 'Sumaste todos los números. Haz primero la multiplicación y después suma.') },
          ] },
        { expr: `${a} ${TIMES} (${b} + ${c}) ${MINUS} ${d}`, val: a * (b + c) - d, first: `(${b} + ${c}) = ${b + c}`, then: `${a} ${TIMES} ${b + c} = ${a * (b + c)}; ${a * (b + c)} ${MINUS} ${d} = ${n(a * (b + c) - d)}`,
          wrong: [
            { value: a * b + c - d, tag: 'ignored-parens', why: L('You multiplied before adding inside the parentheses. Whatever is in parentheses is done first.', 'Multiplicaste antes de sumar dentro del paréntesis. Lo que está entre paréntesis se hace primero.') },
            { value: a * (b + c - d), tag: 'subtract-first', why: L('You subtracted before multiplying. The subtraction is outside the parentheses, so it comes last.', 'Restaste antes de multiplicar. La resta está fuera del paréntesis, así que va al final.') },
            { value: a * (b + c), tag: 'stopped-early', why: L('You stopped before the final subtraction.', 'Te detuviste antes de la resta final.') },
            { value: a * (b + c) + d, tag: 'added-instead', why: L('The last operation is a subtraction, not an addition.', 'La última operación es una resta, no una suma.') },
          ] },
        { expr: `${a * b} ${DIV} ${a} + ${c} ${TIMES} ${d}`, val: b + c * d, first: `${a * b} ${DIV} ${a} = ${b}; ${c} ${TIMES} ${d} = ${c * d}`, then: `${b} + ${c * d} = ${b + c * d}`,
          wrong: [
            { value: (b + c) * d, tag: 'left-to-right', why: LTR },
            { value: c * d, tag: 'dropped-term', why: L('You found the product but never added the result of the division.', 'Hallaste el producto pero no sumaste el resultado de la división.') },
            { value: b + c + d, tag: 'added-all', why: L('You added the last two numbers. The × sign means multiply them first.', 'Sumaste los dos últimos números. El signo × significa multiplicarlos primero.') },
          ] },
      ][p.form];
      const v = { expr: F.expr, first: F.first, then: F.then };
      return {
        prompt: t('Evaluate: {expr}', 'Evalúa: {expr}', v), expr: F.expr, answer: ans.signed(F.val), estSeconds: 35, wrong: F.wrong,
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
        { expr: `${a} + ${b}² ${TIMES} ${c}`, val: a + b2 * c, first: `${b}² = ${b2}`, then: `${b2} ${TIMES} ${c} = ${b2 * c}; ${a} + ${b2 * c} = ${a + b2 * c}`,
          wrong: [
            { value: (a + b2) * c, tag: 'left-to-right', why: L('Multiplication comes before addition, even when the addition is written first.', 'La multiplicación va antes de la suma, aunque la suma esté escrita primero.') },
            { value: a + b * 2 * c, tag: 'exponent', why: L('An exponent of 2 means multiply the number by itself, not by 2.', 'Un exponente 2 significa multiplicar el número por sí mismo, no por 2.') },
            { value: a + b * c * b * c, tag: 'exponent-scope', why: L('The exponent belongs only to the number it is attached to. Square that number first, then multiply.', 'El exponente pertenece solo al número que lo lleva. Eleva ese número al cuadrado primero y luego multiplica.') },
            { value: b2 * c, tag: 'dropped-term', why: L('You never added the first number.', 'No sumaste el primer número.') },
          ] },
        { expr: `(${b} + ${d})² ${MINUS} ${a} ${TIMES} ${c}`, val: s - a * c, first: `(${b} + ${d}) = ${b + d}; ${b + d}² = ${s}`, then: `${a} ${TIMES} ${c} = ${a * c}; ${s} ${MINUS} ${a * c} = ${n(s - a * c)}`,
          wrong: [
            { value: (s - a) * c, tag: 'left-to-right', why: L('Multiplication comes before subtraction, even when it is written last.', 'La multiplicación va antes de la resta, aunque esté escrita al final.') },
            { value: b2 + d * d - a * c, tag: 'square-of-sum', why: L('(a + b)² is not a² + b². Add inside the parentheses first, then square.', '(a + b)² no es a² + b². Suma dentro del paréntesis primero y luego eleva al cuadrado.') },
            { value: 2 * (b + d) - a * c, tag: 'exponent', why: L('An exponent of 2 means multiply the number by itself, not by 2.', 'Un exponente 2 significa multiplicar el número por sí mismo, no por 2.') },
            { value: s, tag: 'stopped-early', why: L('You stopped before subtracting the product.', 'Te detuviste antes de restar el producto.') },
          ] },
      ][p.form];
      const v = { expr: F.expr, first: F.first, then: F.then };
      return {
        prompt: t('Evaluate: {expr}', 'Evalúa: {expr}', v), expr: F.expr, answer: ans.signed(F.val), estSeconds: 50, wrong: F.wrong,
        hints: [PEMDAS, L('Parentheses, then the exponent, then ×, then + or −.', 'Paréntesis, luego el exponente, luego ×, luego + o −.'), t('First: {first}.', 'Primero: {first}.', v)],
        steps: steps5(L('Evaluate the expression.', 'Evalúa la expresión.'), t('{expr}', '{expr}', v), PEMDAS, t('{first}. Then {then}.', '{first}. Luego {then}.', v), L('Exponent before multiplication, multiplication before addition/subtraction.', 'Exponente antes que multiplicación, multiplicación antes que suma/resta.')),
        beginner: BEG, formula: PEMDAS, visual: { type: 'none', params: {} },
      };
    },
    check(p) { const { a, b, c, d } = p; return p.form === 0 ? a + Math.pow(b, 2) * c : Math.pow(b + d, 2) - a * c; },
  }),
];
