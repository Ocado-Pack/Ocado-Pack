// Math engine tests: kit (rationals, formatting, parsing, assembly, validation), engine, linear step model,
// and a sweep of every template x supported level x 300 seeds. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMath } from '../../src/math/engine.js';
import * as kit from '../../src/math/kit.js';
import { createLinear, distributeSpec } from '../../src/math/linear.js';
import { TOPICS, LEVELS } from '../../src/math/topics.js';
import { PACKS, TEMPLATE_LIST } from '../../src/math/registry.js';
import { createRng } from '../../src/core/rng.js';

const { frac, fAdd, fSub, fMul, fDiv, fEq, fNum, fromNumber, toFrac, fmtInt, fmtNum, fmtFrac, fmtMixed, fmtMoney, numWord, N, q, t, L, parseAnswer, checkAnswer, assemble, validateQuestion } = kit;
const math = createMath();
const SEEDS = 300;
const clone = (o) => JSON.parse(JSON.stringify(o));

/** every learner-facing LText of a question, as [where, ltext] */
function texts(qn) {
  const out = [['prompt', qn.prompt], ['answer.display', qn.answer.display], ['beginner', qn.beginner], ['formula', qn.formula], ['final', qn.solution.final]];
  if (qn.trick) out.push(['trick', qn.trick]);
  if (qn.ask) out.push(['ask', qn.ask]);
  qn.hints.forEach((h, i) => out.push(['hint' + (i + 1), h]));
  qn.solution.steps.forEach((s, i) => out.push(['step' + (i + 1), s.text], ['label' + (i + 1), s.label]));
  qn.choices.forEach((c, i) => { out.push(['choice' + i, c.text]); if (c.why) out.push(['choice' + i + '.why', c.why]); });
  (qn.misconceptions || []).forEach((m) => out.push(['why:' + m.tag, m.why]));
  if (qn.rookie) { qn.rookie.lines.forEach((l, i) => out.push(['rookie' + i, l])); out.push(['rookie.why', qn.rookie.why]); }
  return out;
}
/** evaluate the maths a learner reads ("3(x − 2)", "4 + 3² × 2") with ordinary precedence - independent of the templates */
function evalText(s, x) {
  const js = s.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/²/g, '**2')
    .replace(/(\d)\s*(x|\()/g, '$1*$2').replace(/-\(/g, '-1*(').replace(/-x/g, '-1*x').replace(/x/g, `(${x})`);
  return Function(`"use strict"; return (${js});`)();
}
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('rationals: reduction, sign, arithmetic, float recovery', () => {
  assert.deepEqual(frac(6, 8), { n: 3, d: 4 });
  assert.deepEqual(frac(3, -6), { n: -1, d: 2 });
  assert.deepEqual(frac(0, 5), { n: 0, d: 1 });
  assert.throws(() => frac(1, 0), /zero denominator/);
  assert.deepEqual(fAdd(frac(1, 2), frac(1, 3)), { n: 5, d: 6 });
  assert.deepEqual(fSub(frac(1, 2), frac(3, 4)), { n: -1, d: 4 });
  assert.deepEqual(fMul(frac(2, 3), frac(9, 4)), { n: 3, d: 2 });
  assert.deepEqual(fDiv(frac(2, 3), frac(4, 9)), { n: 3, d: 2 });
  assert.ok(fEq(frac(2, 4), frac(1, 2)) && !fEq(frac(1, 3), frac(1, 2)));
  assert.equal(fNum(frac(7, 4)), 1.75);
  assert.deepEqual(fromNumber(25 / 3), { n: 25, d: 3 }, 'a float that is a small fraction keeps its small denominator');
  assert.deepEqual(fromNumber(0.1 + 0.2), { n: 3, d: 10 });
  assert.deepEqual(fromNumber(0.125), { n: 1, d: 8 });
  assert.deepEqual(fromNumber(0.123456), { n: 1929, d: 15625 });
  assert.deepEqual(toFrac(4), { n: 4, d: 1 });
  assert.deepEqual(toFrac({ n: 4, d: 6 }), { n: 2, d: 3 });
});

test('formatting: integers, decimals, fractions, money, number words, units, placeholders', () => {
  assert.equal(fmtInt(1200), '1,200');
  assert.equal(fmtInt(-1234567), '−1,234,567');
  assert.equal(fmtNum(40), '40');
  assert.equal(fmtNum(2.5), '2.5');
  assert.equal(fmtNum(1200.5), '1,200.5');
  assert.equal(fmtNum(-0.75), '−0.75');
  assert.equal(fmtNum(2.999, 2), '3');
  assert.equal(fmtNum(9.6, 0), '10', 'zero decimal places must not strip the zeros of a whole number');
  assert.equal(fmtNum(-0.001), '0');
  assert.equal(fmtFrac(frac(3, 4)), '3/4');
  assert.equal(fmtFrac(frac(-6, 4)), '−3/2');
  assert.equal(fmtFrac(frac(8, 4)), '2');
  assert.equal(fmtMixed(frac(23, 3)), '7 2/3');
  assert.equal(fmtMixed(frac(-3, 2)), '−1 1/2');
  assert.equal(fmtMixed(frac(3, 4)), '3/4');
  assert.equal(fmtMoney(12), '$12');
  assert.equal(fmtMoney(12.5), '$12.50');
  assert.equal(fmtMoney(1200.05), '$1,200.05');
  assert.equal(fmtMoney(19.999999999999996), '$20', 'float artefacts round to whole cents');
  assert.equal(fmtMoney(4.35 * 100), '$435');
  assert.equal(fmtMoney(-3), '−$3');
  assert.deepEqual(numWord(3, true), { en: 'Three', es: 'Tres' });
  assert.deepEqual(numWord(14), { en: 'fourteen', es: 'catorce' });
  assert.deepEqual(numWord(16), { en: 'sixteen', es: 'dieciséis' });
  assert.deepEqual(numWord(21), { en: '21', es: '21' });
  const CASES = N('case', 'cases', 'caja', 'cajas');
  assert.deepEqual(q(1, CASES), { en: '1 case', es: '1 caja' });
  assert.deepEqual(q(40, CASES), { en: '40 cases', es: '40 cajas' });
  assert.deepEqual(t('{n} {u} left, {z}', 'quedan {n} {u}, {z}', { n: 4, u: L('cases', 'cajas') }), { en: '4 cases left, {z}', es: 'quedan 4 cajas, {z}' });
  assert.deepEqual(kit.ans.int(1, CASES).fmt(1), { en: '1 case', es: '1 caja' });
  assert.deepEqual(kit.ans.frac(6, 8).fmt(0.75), { en: '3/4', es: '3/4' });
  assert.deepEqual(kit.ans.frac(7, 2, undefined, true).fmt(3.5), { en: '3 1/2', es: '3 1/2' });
  assert.deepEqual(kit.ans.percent(25).fmt(12.5), { en: '12.5%', es: '12.5%' });
  assert.deepEqual(kit.ans.x(9).fmt(-4), { en: 'x = −4', es: 'x = −4' });
  assert.deepEqual(kit.ans.x(2.5).fmt(23 / 3), { en: 'x = 7 2/3', es: 'x = 7 2/3' });
});

test('parseAnswer: accepted forms and garbage', () => {
  const ok = [
    ['40', 40], ['40.0', 40], ['40.', 40], [' 40 ', 40], ['+40', 40], ['-3', -3], ['−3', -3], ['.5', 0.5], ['0.57', 0.57], ['2.5', 2.5],
    ['1/2', 0.5], ['3 / 4', 0.75], ['-1/4', -0.25], ['1 1/2', 1.5], ['-1 1/2', -1.5], ['25%', 25], ['12.5 %', 12.5], ['$1,200.50', 1200.5],
    ['1,200', 1200], ['$40', 40], ['40 cases', 40], ['40cases', 40], ['9 ft2', 9], ['9 ft^2', 9], ['12 cm3', 12], ['9 m²', 9], ['3/4 cup', 0.75], ['x = 9', 9], ['x=9', 9], ['= 9', 9], ['X = −9', -9], ['y = 1/2', 0.5],
  ];
  for (const [text, value] of ok) { const f = parseAnswer(text); assert.ok(f, `"${text}" should parse`); assert.ok(near(fNum(f), value), `"${text}" -> ${fNum(f)} (expected ${value})`); }
  assert.deepEqual(parseAnswer('2/4'), { n: 1, d: 2 }, 'fractions are exact and reduced');
  assert.deepEqual(parseAnswer('0.57'), { n: 57, d: 100 });
  for (const bad of ['', '   ', 'abc', 'forty', '1/0', '1 1/0', '40 12', '1,2', '9.5.2', '1e3', '3 x 2', '18x3', '2 + 2', '40 = 40', '54 - 14', '(40)', '--3', 'x =', '=', '3 +', '0.1234567891', null, undefined]) assert.equal(parseAnswer(bad), null, `"${bad}" should not parse`);
});

test('fixed problem 1 (AR): three trucks, 18 cases each, fourteen removed -> 40', () => {
  const p = math.fixed.trucks();
  assert.equal(p.prompt.en, 'Three trucks carry 18 equipment cases each. Fourteen cases are removed. How many remain?');
  assert.equal(p.prompt.es, 'Tres camiones llevan 18 cajas de equipo cada uno. Se retiran catorce cajas. ¿Cuántas quedan?');
  assert.equal(p.answer.value, 40);
  assert.deepEqual(p.answer.display, { en: '40 cases', es: '40 cajas' });
  assert.deepEqual([p.section, p.topic, p.templateId, p.level, p.entry], ['AR', 'ar.ops', 'ar.ops.loadout', 1, 'number']);
  assert.deepEqual(math.validate(p), { ok: true, errors: [] });
  assert.deepEqual(p.choices.map((c) => c.value).sort((a, b) => a - b), [12, 40, 54, 68]);
  assert.equal(p.choices.filter((c) => c.correct).length, 1);
  for (const text of ['40', ' 40 ', '40.0', '40 cases', '40 cajas', '+40', '80/2']) assert.equal(math.check(p, { text }).correct, true, text);
  assert.equal(math.check(p, { choice: p.choices.findIndex((c) => c.correct) }).correct, true);
  // every named mistake is explained, including the one that is not among the four choices (3 + 18 − 14 = 7)
  for (const [text, tag] of [['54', 'forgot-subtract'], ['12', 'subtract-first'], ['68', 'added-instead'], ['7', 'added-groups']]) {
    const r = math.check(p, { text });
    assert.equal(r.correct, false); assert.equal(r.tag, tag, text);
    assert.ok(r.why.en.length > 20 && r.why.es.length > 20 && r.why.en !== r.why.es);
  }
  assert.equal(math.check(p, { text: '7' }).choice, undefined);
  assert.equal(math.check(p, { text: '54' }).choice.value, 54);
  const other = math.check(p, { text: '41' });
  assert.deepEqual([other.correct, other.why, other.parseError], [false, undefined, undefined]);
  const junk = math.check(p, { text: 'forty' });
  assert.equal(junk.correct, false); assert.ok(junk.parseError.en && junk.parseError.es);
  assert.equal(math.check(p, { choice: 9 }).correct, false);
  const wrongIndex = p.choices.findIndex((c) => c.value === 54), byChoice = math.check(p, { choice: wrongIndex });
  assert.deepEqual([byChoice.correct, byChoice.tag], [false, 'forgot-subtract']);
  assert.match(p.hints[2].en, /3 × 18 = 54/);
  assert.equal(p.solution.steps.length, 5);
  assert.match(p.solution.steps[3].text.en, /3 × 18 = 54\. Then 54 − 14 = 40\./);
  assert.equal(p.visual.type, 'bars');
  assert.deepEqual(p.visual.params.values.map((v) => v.value), [18, 18, 18]);
  assert.equal(p.rookie.wrongIndex, 1); assert.equal(p.rookie.lines.length, 3);
});

test('fixed problem 2 (MK): 3(x − 2) = 21 -> x = 9', () => {
  const p = math.fixed.equation();
  assert.deepEqual(p.prompt, { en: 'Solve 3(x − 2) = 21.', es: 'Resuelve 3(x − 2) = 21.' });
  assert.equal(p.expr, '3(x − 2) = 21');
  assert.equal(p.answer.value, 9);
  assert.deepEqual(p.answer.display, { en: 'x = 9', es: 'x = 9' });
  assert.deepEqual([p.section, p.topic, p.templateId, p.level, p.entry], ['MK', 'mk.linear', 'mk.linear.distribute', 2, 'number']);
  assert.deepEqual(math.validate(p), { ok: true, errors: [] });
  assert.ok(p.choices.every((c) => Number.isInteger(c.value)), 'a whole-number solution gets whole-number choices');
  for (const text of ['9', ' 9 ', '9.0', 'x = 9', 'x=9', 'X = 9', '18/2']) assert.equal(math.check(p, { text }).correct, true, text);
  for (const [text, tag] of [['5', 'same-op'], ['27', 'forgot-divide'], ['7', 'stopped-early'], ['-9', 'sign'], ['x = −9', 'sign'], ['23/3', 'partial-distribute'], ['7 2/3', 'partial-distribute']]) {
    const r = math.check(p, { text });
    assert.equal(r.correct, false, text); assert.equal(r.tag, tag, text); assert.ok(r.why.en && r.why.es);
  }
  assert.deepEqual(p.visual, { type: 'balance', params: { display: '3(x − 2) = 21', lhs: { x: 3, c: -6, mult: 3, inner: { x: 1, c: -2 } }, rhs: { x: 0, c: 21 }, solution: 9 } });
  assert.equal(createLinear(p.visual.params).solution(), 9);
  assert.match(p.hints[2].en, /x − 2 = 21 ÷ 3/);
  assert.match(p.solution.steps[3].text.en, /21 ÷ 3 = 7, so x − 2 = 7\. Then x = 7 \+ 2 = 9\./);
  assert.deepEqual(p.rookie.lines.map((l) => l.en), ['3(x − 2) = 21', '3x − 2 = 21', '3x = 21 + 2', '3x = 23', 'x = 7 2/3']);
  assert.equal(p.rookie.wrongIndex, 1);
  for (const lt of [p.beginner, p.hints[0], p.hints[1]]) assert.doesNotMatch(lt.en + lt.es, /9/, 'no early leak of the answer');
});

test('validateQuestion rejects broken questions', () => {
  const tplOf = (qn) => math.templates.get(qn.templateId);
  const errs = (mutate, base = math.fixed.trucks()) => { const qn = clone(base); mutate(qn); return validateQuestion(qn, tplOf(base)).errors.join(' | '); };
  const wrongs = (qn) => qn.choices.filter((c) => !c.correct);
  assert.equal(errs(() => {}), '');
  assert.match(errs((x) => { wrongs(x)[1].value = wrongs(x)[0].value; }), /choice values must be distinct/);
  assert.match(errs((x) => { wrongs(x)[1].text = clone(wrongs(x)[0].text); }), /distinct in both languages/);
  assert.match(errs((x) => { wrongs(x)[0].correct = true; }), /exactly one correct/);
  assert.match(errs((x) => { x.choices.pop(); }), /exactly 4 choices/);
  assert.match(errs((x) => { x.prompt.es = ''; }), /prompt must be bilingual/);
  assert.match(errs((x) => { x.hints[1].es = ' '; }), /3 bilingual hints/);
  assert.match(errs((x) => { x.hints.pop(); }), /3 bilingual hints/);
  assert.match(errs((x) => { x.solution.steps.length = 2; }), />= 3 bilingual solution steps/);
  assert.match(errs((x) => { delete wrongs(x)[0].why; }), /wrong choices need a bilingual why/);
  assert.match(errs((x) => { x.beginner = { en: 'x', es: '' }; }), /beginner explanation/);
  assert.match(errs((x) => { x.answer.value = 41; }), /correct choice != answer.*independent check disagrees: 40 vs 41/);
  assert.match(errs((x) => { wrongs(x)[0].value = Infinity; }), /non-finite choice/);
  assert.match(errs((x) => { x.rookie.wrongIndex = 7; }), /bad rookie block/);
  assert.match(errs((x) => { x.rookie.lines = []; }), /bad rookie block/);
  assert.match(errs((x) => { x.misconceptions[0].value = 40; }), /a misconception equals the answer/);
  assert.match(errs((x) => { x.misconceptions[0].why = { en: 'only english', es: '' }; }), /misconceptions need/);
  assert.equal(validateQuestion(null).ok, false);
  // leak check: the answer may not stand alone in the beginner text or the first two hints ...
  assert.match(errs((x) => { x.hints[0] = L('The answer is 40.', 'La respuesta es 40.'); }), /hint 1 leaks the answer/);
  assert.match(errs((x) => { x.hints[1] = L('54 − 14 = 40', '54 − 14 = 40'); }), /hint 2 leaks the answer/);
  assert.match(errs((x) => { x.beginner = L('You end with 40 cases', 'Terminas con 40 cajas'); }), /beginner leaks the answer/);
  // ... but a longer number that merely contains those digits is not a leak, and hint 3 may show a first step
  for (const harmless of ['about 140 in all', 'roughly 40.5 units', 'a ratio of 40/7', 'page 1,040', '0.40 of it', 'section 3.40']) assert.equal(errs((x) => { x.hints[0] = L(harmless, harmless); }), '', harmless);
  assert.equal(errs((x) => { x.hints[2] = L('That leaves 40.', 'Quedan 40.'); }), '');
  // thousands separators and trailing zeros do not hide a leak
  const big = (hint) => errs((x) => { x.answer.value = 1200; x.choices.find((c) => c.correct).value = 1200; x.hints[0] = L(hint, hint); }).replace(/independent check[^|]*/, '');
  assert.match(big('you get 1,200 cases'), /hint 1 leaks/);
  assert.match(big('you get 1200.00 cases'), /hint 1 leaks/);
  assert.doesNotMatch(big('you get 11,200 cases'), /leaks/);
  // a number that is printed in the problem itself is never a leak
  assert.equal(errs((x) => { x.hints[0] = L('Start from the 18 cases on each truck.', 'Empieza con las 18 cajas de cada camión.'); }), '');
});

test('engine: determinism, reproducibility, filters, similar / easier / avoid, coverage', () => {
  const a = math.generate({ templateId: 'ar.ops.shifts', level: 3, seed: 12345 });
  assert.deepEqual(math.generate({ templateId: 'ar.ops.shifts', level: 3, seed: 12345 }), a, 'same engine, same seed');
  assert.deepEqual(createMath().generate({ templateId: 'ar.ops.shifts', level: 3, seed: 12345 }), a, 'fresh engine, same seed');
  assert.deepEqual(math.generate({ topic: 'mk.linear', level: 2, seed: 'mission-1/step-3' }), math.generate({ topic: 'mk.linear', level: 2, seed: 'mission-1/step-3' }), 'string seeds');
  assert.notEqual(math.generate({ templateId: 'ar.ops.shifts', level: 3, seed: 12346 }).signature, a.signature);
  assert.equal(a.id, 'ar.ops.shifts#' + a.seed.toString(16));
  assert.deepEqual(clone(a).answer, clone(JSON.parse(JSON.stringify(a))).answer);
  // a saved {templateId, level, seed} is enough to rebuild the identical question
  for (const topic of ['ar.ops', 'ar.word', 'mk.linear', 'mk.order']) for (let s = 1; s <= 25; s++) {
    const g = math.generate({ topic, level: 1 + (s % 5), seed: s * 7919 });
    assert.deepEqual(math.generate({ templateId: g.templateId, level: g.level, seed: g.seed }), g);
    assert.equal(g.topic, topic);
  }
  assert.equal(math.generate({ section: 'MK', seed: 5 }).section, 'MK');
  assert.equal(math.generate({ section: 'AR', seed: 5 }).section, 'AR');
  assert.equal(math.generate({ templateId: 'mk.linear.onestep', level: 5, seed: 3 }).level, 1, 'falls back to the nearest supported level');
  assert.equal(math.generate({ templateId: 'mk.linear.bothsides', level: 1, seed: 3 }).level, 3);
  assert.equal(math.generate({ topic: 'ar.ops', level: 5, seed: 3 }).templateId, 'ar.ops.change', 'prefers a template that supports the level');
  assert.equal(math.generate({ topic: 'ar.ops', level: 2, theme: 'warehouse', seed: 11 }).templateId.startsWith('ar.ops.'), true);
  for (let s = 0; s < 20; s++) assert.ok(['ar.ops.loadout', 'ar.ops.restock'].includes(math.generate({ topic: 'ar.ops', level: 2, theme: 'warehouse', seed: s }).templateId), 'theme narrows the pool');
  assert.throws(() => math.generate({ templateId: 'nope' }), /unknown template nope/);
  assert.throws(() => math.generate({ topic: 'ar.percent' }), /no templates for ar\.percent/);
  assert.throws(() => math.build('nope', {}), /unknown template/);
  assert.throws(() => math.build('mk.linear.distribute', { a: 3, b: -2, c: 20 }), /c divisible by a/);
  assert.throws(() => math.build('mk.linear.twostep', { a: 1, b: 3, x: 4 }), /\|a\| >= 2/);
  const built = math.build('mk.linear.twostep', { a: 4, b: -6, x: 5 });
  assert.equal(built.expr, '4x − 6 = 14'); assert.equal(built.answer.value, 5);
  assert.deepEqual(math.build('mk.linear.twostep', { a: 4, b: -6, x: 5 }), built, 'build is deterministic');
  // avoid: an explicit seed normally reproduces a question; listing its signature forces a different one
  const again = math.generate({ templateId: 'ar.ops.shifts', level: 3, seed: 12345, avoid: [a.signature] });
  assert.notEqual(again.signature, a.signature);
  assert.notEqual(math.generate({ templateId: 'ar.ops.shifts', level: 3, seed: 12345, avoid: new Set([a.signature]) }).signature, a.signature);
  // without a seed the engine never repeats a recent question
  const seen = new Set();
  for (let i = 0; i < 60; i++) { const g = math.generate({ templateId: 'ar.ops.split', level: 2 }); assert.ok(!seen.has(g.signature), 'recent ring'); seen.add(g.signature); }
  for (const base of [math.fixed.trucks(), math.fixed.equation(), a]) {
    const sim = math.similar(base);
    assert.deepEqual([sim.templateId, sim.level], [base.templateId, base.level]);
    assert.notEqual(sim.signature, base.signature);
    assert.equal(math.validate(sim).ok, true);
  }
  const hard = math.generate({ templateId: 'ar.ops.shifts', level: 4, seed: 9 }), easy = math.easier(hard);
  assert.deepEqual([easy.templateId, easy.level], ['ar.ops.shifts', 3]);
  const bottom = math.easier(math.generate({ templateId: 'mk.linear.bothsides', level: 3, seed: 9 }));
  assert.deepEqual([bottom.topic, bottom.level], ['mk.linear', 2], 'same topic when the template has no easier level');
  assert.notEqual(bottom.templateId, 'mk.linear.bothsides');
  assert.equal(math.easier(math.fixed.trucks()).level, 1, 'never below level 1');
  // coverage and topic list
  assert.equal(TOPICS.length, 20); assert.equal(LEVELS.length, 5);
  assert.equal(TOPICS.filter((x) => x.section === 'AR').length, 10);
  const cov = math.coverage();
  assert.deepEqual(Object.keys(cov), TOPICS.map((x) => x.id));
  for (const id of ['ar.ops', 'mk.linear', 'mk.order']) for (let lv = 1; lv <= 5; lv++) assert.ok(cov[id][lv] >= 1, `${id} level ${lv}`);
  assert.deepEqual(cov['ar.word'], { 1: 1, 2: 2, 3: 2, 4: 1, 5: 0 });
  assert.deepEqual(cov['mk.geom'], { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, 'empty packs are tolerated');
  assert.deepEqual(math.populated().map((x) => x.id), ['ar.word', 'ar.ops', 'mk.order', 'mk.linear']);
  // registry
  assert.deepEqual(TEMPLATE_LIST.map((x) => x.id), [...math.templates.keys()]);
  const topicIds = new Set(TOPICS.map((x) => x.id));
  for (const [topic, pack] of Object.entries(PACKS)) { assert.ok(topicIds.has(topic), topic); for (const tpl of pack) { assert.equal(tpl.topic, topic); assert.ok(tpl.id.startsWith(topic + '.')); assert.equal(typeof tpl.check, 'function', tpl.id + ' has an independent check'); } }
  // the engine registers itself on a context
  const reg = {}; createMath({ register: (name, sys) => { reg[name] = sys; } });
  assert.equal(typeof reg.math.generate, 'function');
});

test(`sweep: every template x level x ${SEEDS} seeds is valid, well-formed and consistent`, () => {
  const report = [];
  let total = 0, fillerTotal = 0;
  for (const tpl of math.templates.values()) for (const lv of tpl.levels) {
    let filler = 0;
    const where = (s) => `${tpl.id} L${lv} seed ${s}`;
    for (let s = 1; s <= SEEDS; s++) {
      const seed = Math.imul(s, 2654435761) >>> 0;
      // raw path, no retries: a template must never produce an invalid question
      const qn = assemble(tpl, tpl.params(createRng(seed), lv, {}), seed, lv);
      const v = validateQuestion(qn, tpl);
      assert.deepEqual(v.errors, [], where(s));
      total++;
      assert.deepEqual([qn.templateId, qn.topic, qn.section, qn.level], [tpl.id, tpl.topic, tpl.topic.startsWith('mk.') ? 'MK' : 'AR', lv]);
      assert.ok(qn.estSeconds > 0 && ['number', 'choice'].includes(qn.entry));
      // choices: 4 distinct, one correct, every wrong one explained
      assert.equal(new Set(qn.choices.map((c) => c.text.en)).size, 4, where(s));
      assert.equal(new Set(qn.choices.map((c) => c.value)).size, 4, where(s));
      for (const c of qn.choices) if (!c.correct) assert.ok(c.tag && c.why.en && c.why.es, where(s));
      if (qn.choices.some((c) => c.tag === 'near')) filler++;
      if (Number.isInteger(qn.answer.value) && tpl.topic.startsWith('mk.linear')) assert.ok(qn.choices.every((c) => Number.isInteger(c.value)), where(s));
      // text hygiene in both languages: no unresolved placeholder, no stringified junk, no ASCII minus before a number
      for (const [name, lt] of texts(qn)) for (const lang of ['en', 'es']) {
        const str = lt[lang];
        assert.ok(typeof str === 'string' && str.trim().length > 0, `${where(s)} ${name}.${lang} empty`);
        assert.doesNotMatch(str, /[{}]|undefined|NaN|null|Infinity|\[object|(^|[\s(=])-\d|\+ −|− −/, `${where(s)} ${name}.${lang}: ${str}`);
      }
      // answers: the displayed answer and the bare value are accepted; every wrong choice and every named mistake is recognised
      assert.equal(checkAnswer(qn, { text: qn.answer.display.en }).correct, true, where(s) + ' display.en');
      assert.equal(checkAnswer(qn, { text: qn.answer.display.es }).correct, true, where(s) + ' display.es');
      assert.equal(checkAnswer(qn, { text: String(qn.answer.value) }).correct, true, where(s));
      qn.choices.forEach((c, i) => {
        const r = checkAnswer(qn, { choice: i });
        assert.equal(r.correct, c.correct, where(s));
        if (!c.correct) { assert.equal(r.tag, c.tag); const typed = checkAnswer(qn, { text: c.text.en }); assert.deepEqual([typed.correct, typed.tag], [false, c.tag], where(s) + ' typed ' + c.text.en); }
      });
      for (const m of qn.misconceptions) {
        const r = checkAnswer(qn, { text: fmtFrac(toFrac(m.value)).replace('−', '-') });
        assert.deepEqual([r.correct, r.tag], [false, m.tag], `${where(s)} mistake ${m.tag} = ${m.value}`);
      }
      for (const c of qn.choices) if (!c.correct && c.tag !== 'near') assert.ok(qn.misconceptions.some((m) => m.tag === c.tag && near(m.value, c.value)), where(s));
      // the maths the learner reads really has the stated answer (evaluated independently of the template code)
      if (tpl.topic === 'mk.order') assert.ok(near(evalText(qn.expr, 0), qn.answer.value), `${where(s)}: ${qn.expr} != ${qn.answer.value}`);
      if (tpl.topic === 'mk.linear') {
        const [lhs, rhs] = qn.expr.split(' = ');
        assert.ok(near(evalText(lhs, qn.answer.value), evalText(rhs, qn.answer.value)), `${where(s)}: x = ${qn.answer.value} does not satisfy ${qn.expr}`);
        assert.ok(!near(evalText(lhs, qn.answer.value + 1), evalText(rhs, qn.answer.value + 1)), where(s) + ' is an identity');
        assert.equal(qn.prompt.en, `Solve ${qn.expr}.`);
      }
      if (qn.visual.type === 'balance') { const eq = createLinear(qn.visual.params); assert.ok(near(eq.solution(), qn.answer.value), where(s) + ' balance'); assert.equal(eq.text(), qn.visual.params.display, where(s) + ' balance text'); }
      if (qn.rookie) assert.ok(qn.rookie.lines.length >= 3 && qn.rookie.lines.length <= 5, where(s));
      // a question survives a JSON round trip (save / load)
      const copy = clone(qn);
      assert.equal(validateQuestion(copy, tpl).ok, true, where(s) + ' after JSON round trip');
      assert.equal(checkAnswer(copy, { text: String(copy.answer.value) }).correct, true);
      // the public generate() path gives the same answer for this template, level and seed
      const g = math.generate({ templateId: tpl.id, level: lv, seed });
      assert.deepEqual(g, qn, where(s) + ' generate() differs from the raw path');
    }
    fillerTotal += filler;
    report.push(`${tpl.id} L${lv}: ${filler}`);
    assert.ok(filler <= SEEDS * 0.05, `${tpl.id} L${lv}: ${filler}/${SEEDS} questions needed a generic near-miss filler; add named mistakes`);
  }
  assert.equal(total, [...math.templates.values()].reduce((n, x) => n + x.levels.length, 0) * SEEDS);
  assert.ok(fillerTotal <= total * 0.01, `fillers overall: ${fillerTotal}/${total}\n${report.join('\n')}`);
});

test('linear step model: both routes for 3(x − 2) = 21, illegal moves, undo, variables on both sides', () => {
  const eq = createLinear(distributeSpec(3, -2, 21));
  assert.equal(eq.text(), '3(x − 2) = 21');
  assert.equal(eq.isSolved(), false);
  assert.equal(eq.solution(), 9, 'the solution is known before x is isolated');
  // route 1: divide by 3, add 2
  let r = eq.apply('div', 3);
  assert.deepEqual([r.ok, r.text, r.solved], [true, 'x − 2 = 7', false]);
  r = eq.apply('add', 2);
  assert.deepEqual([r.ok, r.text, r.solved], [true, 'x = 9', true]);
  assert.deepEqual(eq.history.map((h) => [h.op, h.value, h.text]), [['div', 3, 'x − 2 = 7'], ['add', 2, 'x = 9']]);
  assert.equal(eq.undo(), 'x − 2 = 7');
  assert.equal(eq.undo(), '3(x − 2) = 21');
  assert.equal(eq.undo(), '3(x − 2) = 21', 'undo on an empty history is harmless');
  // route 2: expand, add 6, divide by 3
  assert.equal(eq.apply('expand').text, '3x − 6 = 21');
  assert.equal(eq.apply('add', '6').text, '3x = 27');
  r = eq.apply('div', 3);
  assert.deepEqual([r.text, r.solved, eq.isSolved(), eq.solution()], ['x = 9', true, true, 9]);
  assert.equal(eq.reset(), '3(x − 2) = 21'); assert.equal(eq.history.length, 0);
  // illegal moves change nothing and explain themselves in both languages
  for (const [op, value] of [['div', 0], ['mul', 0], ['div', 'abc'], ['add', undefined], ['mul', { x: 2 }], ['pow', 2]]) {
    r = eq.apply(op, value);
    assert.equal(r.ok, false, op); assert.ok(r.error.en && r.error.es, op);
    assert.equal(eq.text(), '3(x − 2) = 21'); assert.equal(eq.history.length, 0);
  }
  eq.apply('expand');
  assert.equal(eq.apply('expand').ok, false, 'nothing left to expand');
  // a wrong but legal move keeps the equation true and is undoable
  assert.equal(eq.apply('sub', 6).text, '3x − 12 = 15'); assert.equal(eq.solution(), 9);
  assert.equal(eq.undo(), '3x − 6 = 21');
  // adding or subtracting auto-expands; scaling keeps the factored form
  eq.reset();
  assert.equal(eq.apply('add', 6).text, '3x = 27');
  eq.reset();
  assert.equal(eq.apply('mul', 2).text, '6(x − 2) = 42');
  assert.equal(eq.apply('div', 4).text, '(3/2)(x − 2) = 10 1/2');
  assert.equal(eq.apply('mul', '-2/3').text, '−(x − 2) = −7');
  assert.equal(eq.apply('mul', -1).text, 'x − 2 = 7');
  assert.equal(eq.solution(), 9);
  // variables on both sides: 5x + 3 = 2x + 12
  const both = createLinear({ lhs: { x: 5, c: 3 }, rhs: { x: 2, c: 12 } });
  assert.equal(both.text(), '5x + 3 = 2x + 12');
  assert.equal(both.apply('sub', { x: 2 }).text, '3x + 3 = 12');
  assert.equal(both.apply('sub', 3).text, '3x = 9');
  assert.equal(both.apply('div', 3).text, 'x = 3');
  assert.equal(both.isSolved(), true);
  // x isolated on the right also counts; fractions stay exact
  const right = createLinear({ lhs: { x: 0, c: 10 }, rhs: { x: 4, c: 0 } });
  assert.equal(right.text(), '10 = 4x');
  assert.equal(right.apply('div', 4).text, '2 1/2 = x');
  assert.deepEqual([right.isSolved(), right.solution()], [true, 2.5]);
  const neg = createLinear({ lhs: { x: -1, c: 4 }, rhs: { x: 0, c: -3 } });
  assert.equal(neg.text(), '−x + 4 = −3');
  assert.equal(neg.apply('sub', 4).text, '−x = −7'); assert.equal(neg.isSolved(), false);
  assert.equal(neg.apply('div', -1).text, 'x = 7'); assert.equal(neg.isSolved(), true);
  assert.equal(createLinear({ lhs: { x: 2, c: 1 }, rhs: { x: 2, c: 5 } }).solution(), null, 'no solution');
  assert.equal(JSON.stringify(eq.state()).includes('"n"'), true);
});
