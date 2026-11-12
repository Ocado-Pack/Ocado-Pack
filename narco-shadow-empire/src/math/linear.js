// Step model of a one-variable linear equation for the balance puzzle. Pure module.
//   const eq = createLinear({ lhs: {x: 3, c: -6, mult: 3, inner: {x: 1, c: -2}}, rhs: {x: 0, c: 21} });
//   eq.text() -> "3(x − 2) = 21";  eq.apply('div', 3) -> "x − 2 = 7";  eq.apply('add', 2) -> "x = 9"
import { L } from '../core/ltext.js';
import { frac, fAdd, fSub, fMul, fDiv, fNum, fmtMixed, toFrac, parseAnswer, MINUS } from './kit.js';

const Z = frac(0, 1), ONE = frac(1, 1);
const isZero = (f) => f.n === 0;
const side = (s) => ({ x: toFrac(s.x || 0), c: toFrac(s.c || 0) });
const abs = (f) => frac(Math.abs(f.n), f.d);

// coefficient in front of x or of a parenthesis: "" for 1, "3", "(3/2)" for a fraction (the sign is written separately)
const coef = (f) => (f.d === 1 ? (Math.abs(f.n) === 1 ? '' : String(Math.abs(f.n))) : '(' + Math.abs(f.n) + '/' + f.d + ')');
function termText(x, c) {
  const parts = [];
  if (!isZero(x)) parts.push((x.n < 0 ? MINUS : '') + coef(x) + 'x');
  if (!isZero(c)) parts.push(parts.length ? (c.n < 0 ? MINUS + ' ' : '+ ') + fmtMixed(abs(c)) : fmtMixed(c));
  return parts.length ? parts.join(' ') : '0';
}

export function createLinear(spec) {
  const init = () => ({
    L: side(spec.lhs), R: side(spec.rhs),
    paren: spec.lhs.mult !== undefined && spec.lhs.inner ? { mult: toFrac(spec.lhs.mult), inner: side(spec.lhs.inner) } : null,
  });
  let st = init();
  const history = [];
  const text = (s = st) => (s.paren ? (s.paren.mult.n < 0 ? MINUS : '') + coef(s.paren.mult) + '(' + termText(s.paren.inner.x, s.paren.inner.c) + ')' : termText(s.L.x, s.L.c)) + ' = ' + termText(s.R.x, s.R.c);
  const snapshot = () => JSON.parse(JSON.stringify(st));
  const fail = (en, es) => ({ ok: false, error: L(en, es), text: text(), state: snapshot() });

  function parseValue(v) {
    if (v && typeof v === 'object' && 'x' in v) { const k = typeof v.x === 'string' ? parseAnswer(v.x) : toFrac(v.x); return k ? { x: k, c: Z } : null; }
    const f = typeof v === 'string' ? parseAnswer(v) : v === undefined || v === null ? null : toFrac(v);
    return f ? { x: Z, c: f } : null;
  }

  const api = {
    history,
    text,
    /** op: 'add' | 'sub' | 'mul' | 'div' | 'expand'; value: number | "3/4" | {x: k} (a multiple of x, add/sub only) */
    apply(op, value) {
      const prev = snapshot();
      if (op === 'expand') {
        if (!st.paren) return fail('There are no parentheses to expand.', 'No hay paréntesis que expandir.');
        st.paren = null;
      } else {
        const v = parseValue(value);
        if (!v) return fail('Enter a number first.', 'Primero escribe un número.');
        if (op === 'add' || op === 'sub') {
          st.paren = null; // adding/subtracting works on the expanded form
          const f = op === 'add' ? fAdd : fSub;
          st.L = { x: f(st.L.x, v.x), c: f(st.L.c, v.c) };
          st.R = { x: f(st.R.x, v.x), c: f(st.R.c, v.c) };
        } else if (op === 'mul' || op === 'div') {
          if (!isZero(v.x)) return fail('Multiply or divide by a plain number, not by x.', 'Multiplica o divide por un número, no por x.');
          if (isZero(v.c)) return fail(op === 'div' ? 'You cannot divide by zero.' : 'Multiplying both sides by zero erases the equation.', op === 'div' ? 'No se puede dividir entre cero.' : 'Multiplicar ambos lados por cero borra la ecuación.');
          const f = op === 'mul' ? fMul : fDiv;
          st.L = { x: f(st.L.x, v.c), c: f(st.L.c, v.c) };
          st.R = { x: f(st.R.x, v.c), c: f(st.R.c, v.c) };
          if (st.paren) { st.paren.mult = f(st.paren.mult, v.c); if (st.paren.mult.n === st.paren.mult.d) st.paren = null; }
        } else return fail('Unknown operation.', 'Operación desconocida.');
      }
      history.push({ op, value, text: text(), prev });
      return { ok: true, text: text(), state: snapshot(), solved: api.isSolved() };
    },
    undo() { const h = history.pop(); if (h) st = { L: side(h.prev.L), R: side(h.prev.R), paren: h.prev.paren ? { mult: toFrac(h.prev.paren.mult), inner: side(h.prev.paren.inner) } : null }; return text(); },
    reset() { st = init(); history.length = 0; return text(); },
    /** true when the equation reads x = k or k = x */
    isSolved() {
      if (st.paren) return false;
      const a = st.L, b = st.R;
      return (a.x.n === a.x.d && isZero(a.c) && isZero(b.x)) || (b.x.n === b.x.d && isZero(b.c) && isZero(a.x));
    },
    /** the solution as a number (also before it is isolated), or null when there is none / infinitely many */
    solution() {
      const dx = fSub(st.L.x, st.R.x), dc = fSub(st.R.c, st.L.c);
      return isZero(dx) ? null : fNum(fDiv(dc, dx));
    },
    state: () => snapshot(),
  };
  return api;
}

/** Build a createLinear spec for a(x + b) = c. */
export const distributeSpec = (a, b, c) => ({ lhs: { x: a, c: a * b, mult: a, inner: { x: 1, c: b } }, rhs: { x: 0, c } });
export { ONE };
