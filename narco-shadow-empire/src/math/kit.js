// Template kit: exact rationals, bilingual formatting, answer builders, question assembly, validation, answer parsing.
// Pure module (no DOM / three.js) - Node-testable. See src/math/README.md for how to write a template.
import { L, pickLang } from '../core/ltext.js';
import { createRng } from '../core/rng.js';

// ---- rationals ------------------------------------------------------------------------------------------
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
export const frac = (n, d = 1) => { if (d === 0) throw new Error('frac: zero denominator'); if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
/** Float -> exact rational. Recovers a small denominator when the float is one (25/3, 0.1 + 0.2); otherwise 6 decimal places. */
export const fromNumber = (v) => {
  for (let d = 2; d <= 1000; d++) { const n = Math.round(v * d); if (Math.abs(n / d - v) < 1e-9) return frac(n, d); }
  return frac(Math.round(v * 1e6), 1e6);
};
export const toFrac = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? frac(v, 1) : fromNumber(v)) : frac(v.n, v.d));
export const fAdd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const fSub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const fMul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const fDiv = (a, b) => frac(a.n * b.d, a.d * b.n);
export const fEq = (a, b) => a.n * b.d === b.n * a.d;
export const fNum = (a) => a.n / a.d;
export const fIsInt = (a) => a.d === 1;

// ---- formatting -----------------------------------------------------------------------------------------
export const MINUS = '−', TIMES = '×', DIV = '÷';
export const fmtInt = (n) => (n < 0 ? MINUS : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function fmtNum(v, places = 2) {
  if (Number.isInteger(v)) return fmtInt(v);
  const fixed = Math.abs(v).toFixed(places);
  const s = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
  const [i, f] = s.split('.');
  return (v < 0 && Number(s) !== 0 ? MINUS : '') + fmtInt(Number(i)) + (f ? '.' + f : '');
}
export const fmtFrac = (f) => (f.d === 1 ? fmtInt(f.n) : (f.n < 0 ? MINUS : '') + Math.abs(f.n) + '/' + f.d);
export function fmtMixed(f) {
  if (f.d === 1 || Math.abs(f.n) < f.d) return fmtFrac(f);
  const w = Math.trunc(Math.abs(f.n) / f.d), r = Math.abs(f.n) % f.d;
  return (f.n < 0 ? MINUS : '') + w + ' ' + r + '/' + f.d;
}
/** "$1,200" / "$12.50" - rounded to whole cents first, so 19.999999999999996 prints as $20. */
export function fmtMoney(v) {
  const cents = Math.round(Math.abs(v) * 100), c = cents % 100;
  return (v < 0 && cents ? MINUS : '') + '$' + fmtInt((cents - c) / 100) + (c ? '.' + String(c).padStart(2, '0') : '');
}
const W_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const W_ES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** Small numbers as words (0-20), numerals otherwise. `capital` capitalises. In Spanish "uno" -> "un" before a noun is the caller's job. */
export function numWord(n, capital = false) {
  if (!Number.isInteger(n) || n < 0 || n > 20) return L(fmtInt(n));
  return L(capital ? cap(W_EN[n]) : W_EN[n], capital ? cap(W_ES[n]) : W_ES[n]);
}
/** Bilingual noun with singular/plural: N('case','cases','caja','cajas'). q(n, noun) -> "3 cases" / "3 cajas". */
export const N = (en1, enN, es1, esN) => ({ en: [en1, enN], es: [es1, esN] });
export const nounL = (noun, n) => L(noun.en[n === 1 ? 0 : 1], noun.es[n === 1 ? 0 : 1]);
export const q = (n, noun) => L(fmtNum(n) + ' ' + noun.en[n === 1 ? 0 : 1], fmtNum(n) + ' ' + noun.es[n === 1 ? 0 : 1]);
/** Template literal for bilingual text: T`{a} trucks`  is not used; use t(en, es, vars) with {name} placeholders. */
export function t(en, es, vars) {
  const sub = (s, lang) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? pickLang(vars[k], lang) : m)) : s);
  return { en: sub(en, 'en'), es: sub(es, 'es') };
}

// ---- answers --------------------------------------------------------------------------------------------
// An answer spec carries a formatter so wrong choices are formatted exactly like the correct one.
const withUnit = (txt, unit, n) => (unit ? L(txt + ' ' + pickLang(nounOrText(unit, n), 'en'), txt + ' ' + pickLang(nounOrText(unit, n), 'es')) : L(txt));
const nounOrText = (unit, n) => (unit && unit.en && Array.isArray(unit.en) ? nounL(unit, n) : unit);
export const ans = {
  /** whole number, optional unit (noun from N() or an LText) */
  int: (v, unit) => ({ type: 'number', value: v, unit, nonNegative: true, fmt: (x) => withUnit(fmtInt(x), unit, x), ok: (x) => Number.isInteger(x) }),
  /** integer that may be negative */
  signed: (v, unit) => ({ type: 'number', value: v, unit, fmt: (x) => withUnit(fmtInt(x), unit, x), ok: (x) => Number.isInteger(x) }),
  /** decimal with up to `places` places */
  num: (v, places = 2, unit) => ({ type: 'number', value: v, unit, nonNegative: v >= 0, fmt: (x) => withUnit(fmtNum(x, places), unit, x), ok: (x) => Number.isFinite(x) }),
  money: (v) => ({ type: 'number', value: v, nonNegative: true, fmt: (x) => L(fmtMoney(x)), ok: (x) => x >= 0, unitPrefix: '$' }),
  percent: (v) => ({ type: 'number', value: v, nonNegative: true, fmt: (x) => L(fmtNum(x) + '%'), ok: (x) => Number.isFinite(x), unitSuffix: '%' }),
  /** exact fraction n/d (shown in lowest terms, mixed when > 1 if `mixed`) */
  frac: (n, d, unit, mixed = false) => { const f = frac(n, d); return { type: 'fraction', value: fNum(f), frac: f, unit, nonNegative: true, fmt: (x) => withUnit((mixed ? fmtMixed : fmtFrac)(toFrac(x)), unit, 2), ok: () => true }; },
  /** value of a variable: display "x = 9" */
  x: (v, name = 'x') => ({ type: 'number', value: v, varName: name, fmt: (x) => L(name + ' = ' + (Number.isInteger(x) ? fmtInt(x) : fmtMixed(toFrac(x)))), ok: (x) => Number.isInteger(x) || !Number.isInteger(v), accept: [name + '=' + v] }),
  /** non-numeric answer (expression, inequality): multiple choice only */
  text: (lt) => ({ type: 'text', text: lt, fmt: (x) => x, ok: () => true }),
};

const LABELS = [L('Understand the problem', 'Comprende el problema'), L('Identify the given info', 'Identifica los datos'), L('Choose the operation or formula', 'Elige la operación o fórmula'), L('Solve', 'Resuelve'), L('Check', 'Comprueba')];
/** The 5-step worked solution: Understand / Given / Choose / Solve / Check. */
export const steps5 = (u, g, c, s, k) => [u, g, c, s, k].map((text, i) => ({ label: LABELS[i], text }));

/** @type {Map<string, object>} */
const TEMPLATES = new Map();
export const sectionOfTopic = (topic) => (topic.startsWith('mk.') ? 'MK' : 'AR');
/** Register a template. Shape: {id, topic, levels:[..], themes?, params(rng, level, opts), build(p), check(p)} */
export function defineTemplate(tpl) {
  if (!tpl.id || !tpl.topic || !Array.isArray(tpl.levels) || !tpl.params || !tpl.build) throw new Error('defineTemplate: incomplete template ' + tpl.id);
  tpl.section = sectionOfTopic(tpl.topic);
  TEMPLATES.set(tpl.id, tpl);
  return tpl;
}
export const allTemplates = () => TEMPLATES;

const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const sig = (id, p) => id + '|' + JSON.stringify(canon(p));
const keyOf = (v) => (typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : JSON.stringify(v));

/** Assemble a full Question (contract 7.1) from a template + params. Deterministic for (template, params, seed). */
export function assemble(tpl, params, seed, level) {
  const p = tpl.build(params);
  const a = p.answer;
  const rng = createRng((seed ^ 0x5bd1e995) >>> 0);
  const isText = a.type === 'text';
  if (!isText && (!Number.isFinite(a.value) || (a.nonNegative && a.value < 0) || !a.ok(a.value))) throw new Error(`${tpl.id}: the answer ${a.value} does not fit its own answer type`);
  const seen = new Set([isText ? pickLang(a.text, 'en') : keyOf(a.value)]);
  const seenText = new Set([pickLang(isText ? a.text : a.fmt(a.value), 'en')]);
  const wrongs = [], misconceptions = [];
  for (const w of p.wrong || []) {
    if (!w) continue;                                   // templates may list a conditional mistake as null
    const val = isText ? w.text : w.value;
    if (val === undefined || val === null || (!isText && !Number.isFinite(val))) continue;
    const k = isText ? pickLang(val, 'en') : keyOf(val);
    if (seen.has(k)) continue;                          // same as the answer, or as an earlier mistake
    seen.add(k);
    const tag = w.tag || 'slip';
    if (!isText) misconceptions.push({ value: val, tag, why: w.why });
    // shown as a choice only when it fits next to the correct answer (sign, whole number ...) and there is room
    if (wrongs.length === 3 || (!isText && ((a.nonNegative && val < 0) || !a.ok(val)))) continue;
    const text = isText ? val : a.fmt(val), txt = pickLang(text, 'en');
    if (seenText.has(txt)) continue;
    seenText.add(txt);
    wrongs.push({ value: isText ? undefined : val, text, tag, why: w.why });
  }
  if (!isText) {
    const base = a.value, intLike = Number.isInteger(base);
    const steps = intLike ? [1, -1, 2, -2, 10, -10, 5, -5, 3, -3, 20, 4, 6] : [0.5, -0.5, 1, -1, 0.25, -0.25, 2, 0.1, -0.1, 1.5];
    let i = 0;
    while (wrongs.length < 3 && i < steps.length) {
      const val = Math.round((base + steps[i++]) * 1e6) / 1e6;
      if ((a.nonNegative && val < 0) || !a.ok(val) || (a.type === 'fraction' && val <= 0)) continue;
      const txt = pickLang(a.fmt(val), 'en');
      if (seen.has(keyOf(val)) || seenText.has(txt)) continue;
      seen.add(keyOf(val)); seenText.add(txt);
      wrongs.push({ value: val, text: a.fmt(val), tag: 'near', why: L('Close, but re-check your arithmetic step by step.', 'Cerca, pero revisa tu aritmética paso a paso.') });
    }
  }
  const choices = rng.shuffle([{ value: isText ? undefined : a.value, text: isText ? a.text : a.fmt(a.value), correct: true }, ...wrongs.map((w) => ({ ...w, correct: false }))]);
  const display = isText ? a.text : a.fmt(a.value);
  const answer = { type: a.type, display };
  if (!isText) { answer.value = a.value; answer.frac = a.frac || (Number.isInteger(a.value) ? frac(a.value, 1) : fromNumber(a.value)); }
  if (a.unit) answer.unit = nounOrText(a.unit, 2);
  if (a.unitPrefix) answer.unitPrefix = a.unitPrefix;
  if (a.unitSuffix) answer.unitSuffix = a.unitSuffix;
  if (a.accept || p.accept) answer.accept = [...(a.accept || []), ...(p.accept || [])];
  if (a.varName) answer.varName = a.varName;
  return {
    id: tpl.id + '#' + (seed >>> 0).toString(16), templateId: tpl.id, section: tpl.section, topic: tpl.topic, level,
    signature: sig(tpl.id, params), params, seed: seed >>> 0,
    prompt: p.prompt, expr: p.expr, ask: p.ask, answer,
    entry: isText ? 'choice' : (p.entry || 'number'), choices,
    hints: p.hints, solution: { steps: p.steps, final: p.final || t('Answer: {a}', 'Respuesta: {a}', { a: display }) },
    beginner: p.beginner, formula: p.formula, trick: p.trick,
    visual: p.visual || { type: 'none', params: {} }, rookie: p.rookie, misconceptions, estSeconds: p.estSeconds || 60,
  };
}

const both = (lt) => !!lt && typeof lt.en === 'string' && lt.en.trim() !== '' && typeof lt.es === 'string' && lt.es.trim() !== '';
/** Validate a generated Question. `tpl` (optional) enables the independent re-derivation check. */
export function validateQuestion(qn, tpl) {
  const e = [];
  if (!qn || typeof qn !== 'object') return { ok: false, errors: ['not an object'] };
  if (!both(qn.prompt)) e.push('prompt must be bilingual');
  if (!Array.isArray(qn.choices) || qn.choices.length !== 4) e.push('need exactly 4 choices');
  else {
    if (qn.choices.filter((c) => c.correct).length !== 1) e.push('need exactly one correct choice');
    const en = new Set(qn.choices.map((c) => pickLang(c.text, 'en'))), es = new Set(qn.choices.map((c) => pickLang(c.text, 'es')));
    if (en.size !== 4 || es.size !== 4) e.push('choices must be distinct in both languages');
    if (qn.answer && qn.answer.type !== 'text') {
      const vals = new Set(qn.choices.map((c) => keyOf(c.value)));
      if (vals.size !== 4) e.push('choice values must be distinct');
      const c = qn.choices.find((x) => x.correct);
      if (c && Math.abs(c.value - qn.answer.value) > 1e-9) e.push('correct choice != answer');
      if (!qn.choices.every((x) => Number.isFinite(x.value))) e.push('non-finite choice');
    }
    if (!qn.choices.every((c) => both(c.text))) e.push('choice text must be bilingual');
    if (!qn.choices.filter((c) => !c.correct).every((c) => both(c.why))) e.push('wrong choices need a bilingual why');
  }
  if (!qn.answer || !both(qn.answer.display)) e.push('answer.display must be bilingual');
  if (!Array.isArray(qn.hints) || qn.hints.length !== 3 || !qn.hints.every(both)) e.push('need 3 bilingual hints');
  if (!qn.solution || !Array.isArray(qn.solution.steps) || qn.solution.steps.length < 3 || !qn.solution.steps.every((s) => both(s.text) && both(s.label))) e.push('need >= 3 bilingual solution steps');
  if (!both(qn.beginner)) e.push('beginner explanation must be bilingual');
  if (!both(qn.formula)) e.push('formula must be bilingual');
  if (qn.rookie && (!Array.isArray(qn.rookie.lines) || !(qn.rookie.wrongIndex >= 0 && qn.rookie.wrongIndex < qn.rookie.lines.length) || !both(qn.rookie.why))) e.push('bad rookie block');
  if (qn.misconceptions) {
    if (!Array.isArray(qn.misconceptions) || !qn.misconceptions.every((m) => Number.isFinite(m.value) && m.tag && both(m.why))) e.push('misconceptions need a finite value, a tag and a bilingual why');
    else if (qn.answer && qn.misconceptions.some((m) => Math.abs(m.value - qn.answer.value) < 1e-9)) e.push('a misconception equals the answer');
  }
  if (tpl && tpl.check && qn.answer && qn.answer.type !== 'text') {
    let v;
    try { v = tpl.check(qn.params); } catch (err) { e.push('check() threw: ' + err.message); }
    if (v !== undefined) { const n = typeof v === 'number' ? v : fNum(v); if (Math.abs(n - qn.answer.value) > 1e-9) e.push(`independent check disagrees: ${n} vs ${qn.answer.value}`); }
  }
  // leak check: the final numeric answer must not be given away by the beginner text or the first two hints
  if (qn.answer && qn.answer.type !== 'text') {
    const tokens = [String(Math.round(Math.abs(qn.answer.value) * 1e4) / 1e4)];
    if (qn.answer.frac && qn.answer.frac.d !== 1) tokens.push(Math.abs(qn.answer.frac.n) + '/' + qn.answer.frac.d);
    // compare plain numerals: "1,200" -> "1200", "2.50" -> "2.5"; a number is a hit only when it stands alone
    const plain = (str) => String(str).replace(/(\d),(?=\d{3}(?!\d))/g, '$1').replace(/(\.\d*?)0+(?!\d)/g, '$1');
    const res = tokens.map((tk) => new RegExp('(^|[^\\d.,/])' + tk.replace('.', '\\.') + '($|[^\\d/.,]|[.,](?!\\d))'));
    const re = { test: (str) => res.some((r) => r.test(plain(str))) };
    const inPrompt = re.test(qn.prompt.en) || (qn.expr && re.test(qn.expr));
    if (!inPrompt) for (const [name, lt] of [['beginner', qn.beginner], ['hint 1', qn.hints && qn.hints[0]], ['hint 2', qn.hints && qn.hints[1]]]) {
      if (lt && (re.test(lt.en) || re.test(lt.es))) e.push(name + ' leaks the answer');
    }
  }
  return { ok: e.length === 0, errors: e };
}

// ---- answer parsing / checking ----------------------------------------------------------------------------
/** Parse learner input into an exact rational, or null. Accepts 40, 40.0, -3, 1/2, 1 1/2, .5, 25%, $1,200.50, "40 cases", "x = 9", "= 9". */
export function parseAnswer(raw) {
  let s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/[−–]/g, '-').replace(/\$/g, '').replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/^(?:[a-z]\s*)?=\s*/, '').trim();
  let m = s.match(/^([+-]?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)(.*)$/);
  let f = null, rest = '';
  if (m) { if (+m[4] === 0) return null; f = frac((m[1] === '-' ? -1 : 1) * (+m[2] * +m[4] + +m[3]), +m[4]); rest = m[5]; }
  else if ((m = s.match(/^([+-]?)\s*(\d+)\s*\/\s*(\d+)(.*)$/))) { if (+m[3] === 0) return null; f = frac((m[1] === '-' ? -1 : 1) * +m[2], +m[3]); rest = m[4]; }
  else if ((m = s.match(/^([+-]?)\s*(\d+\.?\d*|\.\d+)(.*)$/))) {
    const dec = m[2].includes('.') ? m[2].split('.')[1].length : 0;
    if (dec > 9) return null;
    f = frac((m[1] === '-' ? -1 : 1) * Math.round(parseFloat(m[2]) * Math.pow(10, dec)), Math.pow(10, dec)); rest = m[3];
  } else return null;
  rest = rest.trim();
  if (/[+=*×÷()<>]/.test(rest)) return null;          // an expression ("3 +", "40 = 40"), not a number
  // trailing words are ignored ("40 cases"), trailing digits are not ("40 12", "3 x 2", "1e3") - except a unit exponent ("9 ft2")
  if (rest && /\d/.test(rest.replace(/\b(?:mm|cm|km|m|in|ft|yd|mi)\s?\^?[23]\b/g, ''))) return null;
  return f;
}

const NORM = (s) => String(s).toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, '');
/**
 * Check an answer. input = {choice: index} | {text: string}.
 * -> {correct, normalized, value?, choice?, tag?, why?, parseError?}   (tag + why name the mistake behind a wrong value)
 */
export function checkAnswer(qn, input) {
  if (input && Number.isInteger(input.choice)) {
    const c = qn.choices[input.choice];
    if (!c) return { correct: false, parseError: L('Pick one of the four answers.', 'Elige una de las cuatro respuestas.') };
    return { correct: !!c.correct, normalized: pickLang(c.text, 'en'), choice: c, tag: c.correct ? undefined : c.tag, why: c.correct ? undefined : c.why, value: c.value };
  }
  const text = input && input.text !== undefined ? String(input.text) : '';
  if (qn.answer.accept && qn.answer.accept.some((a) => NORM(a) === NORM(text))) return { correct: true, normalized: NORM(text), value: qn.answer.value };
  if (qn.answer.type === 'text') {
    const c = qn.choices.find((x) => NORM(pickLang(x.text, 'en')) === NORM(text) || NORM(pickLang(x.text, 'es')) === NORM(text));
    if (!c) return { correct: false, parseError: L('Choose one of the listed answers.', 'Elige una de las respuestas de la lista.') };
    return { correct: !!c.correct, normalized: NORM(text), choice: c, tag: c.correct ? undefined : c.tag, why: c.correct ? undefined : c.why };
  }
  const f = parseAnswer(text);
  if (!f) return { correct: false, parseError: L('Enter a number (for example 40, 2.5 or 3/4).', 'Escribe un número (por ejemplo 40, 2.5 o 3/4).') };
  const value = fNum(f);
  const tol = qn.answer.tolerance || 0;
  const correct = fEq(f, qn.answer.frac) || Math.abs(value - qn.answer.value) <= Math.max(tol, 1e-9);
  const out = { correct, normalized: fmtMixed(f), value };
  if (!correct) {
    const same = (x) => Math.abs(x.value - value) < 1e-9;
    const c = qn.choices.find((x) => !x.correct && same(x)), m = (qn.misconceptions || []).find(same) || c;
    if (c) out.choice = c;
    if (m) { out.tag = m.tag; out.why = m.why; }
  }
  return out;
}

export { L };
