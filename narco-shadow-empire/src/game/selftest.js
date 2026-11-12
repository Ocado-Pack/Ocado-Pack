// Live self-test: window.__game.selfTest() -> {pass, passed, total, results: [{name, ok, detail}]}.
// It runs the learning systems in a sandbox (own in-memory storage, own clock), so the player's saved profile is
// never touched. Each system that lands adds its checks here. No DOM, no three.js: also runs in Node.
import { createEvents } from '../core/events.js';
import { createStorage } from '../core/storage.js';
import { createMath } from '../math/engine.js';
import { createLinear } from '../math/linear.js';
import { createLearning } from '../learning/index.js';

/** A minimal stand-in for the game context: just what the math engine and the learner model use. */
function sandbox() {
  const systems = new Map(), values = { learnLang: 'en', sessionMinutes: 15 };
  const sb = {
    events: createEvents(), storage: createStorage('narco-se-selftest', null),
    settings: { get: (k) => values[k], set: (k, v) => { values[k] = v; } },
    has: (name) => systems.has(name),
    register(name, system) { systems.set(name, system); sb[name] = system; return system; },
  };
  return sb;
}

export function runSelfTest() {
  const results = [];
  const same = (got, want, what) => { if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`); };
  const check = (name, fn) => { try { fn(); results.push({ name, ok: true, detail: '' }); } catch (e) { results.push({ name, ok: false, detail: String((e && e.message) || e) }); } };
  let clock = 1.7e12;
  const sb = sandbox(), math = createMath(sb), { profile, tutor, session } = createLearning(sb, { now: () => clock });
  const trucks = math.fixed.trucks(), equation = math.fixed.equation();

  check('AR demo problem: 3 trucks x 18 cases - 14 removed = 40', () => {
    same(trucks.prompt.en, 'Three trucks carry 18 equipment cases each. Fourteen cases are removed. How many remain?', 'prompt');
    same([trucks.answer.value, math.check(trucks, { text: '40 cases' }).correct, math.check(trucks, { text: '54' }).tag], [40, true, 'forgot-subtract'], 'answer');
  });
  check('MK demo problem: 3(x - 2) = 21 gives x = 9', () => {
    same([equation.expr, equation.answer.value, math.check(equation, { text: 'x = 9' }).correct, math.check(equation, { text: '27' }).tag], ['3(x − 2) = 21', 9, true, 'forgot-divide'], 'answer');
  });
  check('balance model solves 3(x - 2) = 21 by both routes', () => {
    const a = createLinear(equation.visual.params), b = createLinear(equation.visual.params);
    same([a.apply('div', 3).text, a.apply('add', 2).text, a.isSolved()], ['x − 2 = 7', 'x = 9', true], 'divide first');
    same([b.apply('expand').text, b.apply('add', 6).text, b.apply('div', 3).text, b.isSolved()], ['3x − 6 = 21', '3x = 27', 'x = 9', true], 'expand first');
  });
  check('every template generates valid questions at every level', () => {
    let n = 0;
    for (const tpl of math.templates.values()) for (const level of tpl.levels) for (let seed = 1; seed <= 15; seed++) {
      const qn = math.generate({ templateId: tpl.id, level, seed: seed * 7919 }), v = math.validate(qn);
      if (!v.ok) throw new Error(`${qn.id}: ${v.errors.join('; ')}`);
      if (!math.check(qn, { text: String(qn.answer.value) }).correct) throw new Error(`${qn.id}: own answer rejected`);
      n++;
    }
    if (n < 100) throw new Error('only ' + n + ' questions generated');
  });
  check('correct first-try answer earns full credit', () => {
    session.start({ missionId: 'selftest' });
    const s = tutor.begin(equation); clock += 30000; s.submit({ text: '9' });
    const r = s.finish();
    same([r.outcome, r.xp, s.canAdvance, profile.topic('mk.linear').independent], ['independent', 125, true, 1], 'result');
  });
  check('wrong answers teach: hints 1-2-3, then the solution and a related problem; a revealed answer earns nothing', () => {
    const s = tutor.begin(trucks), steps = ['54', '12', '68', '7'].map((text) => s.submit({ text }));
    same(steps.map((x) => (x.hint ? x.hint.level : 'reveal')), [1, 2, 3, 'reveal'], 'ladder');
    if (!steps.every((x) => x.why && x.why.en && x.why.es)) throw new Error('a wrong answer was not explained');
    if (!steps[3].followUp || steps[3].followUp.signature === trucks.signature) throw new Error('no related problem');
    s.submit({ text: '40' });
    const r = s.finish();
    same([r.outcome, r.xp, s.canAdvance, profile.topic('ar.ops').mastery], ['revealed', 0, false, 0], 'revealed result');
    const f = s.beginFollowUp(); f.submit({ text: String(f.question.answer.value) }); f.finish();
    same([f.canAdvance, s.canAdvance], [true, true], 'gate after the related problem');
  });
  check('after-action report, mission completion and review scheduling', () => {
    const rep = session.end();
    same([rep.answered, rep.counts.independent, rep.counts.revealed, rep.xp, rep.weaknesses], [3, 2, 1, 225, ['ar.ops']], 'report');
    if (rep.reviewQuestions.length < 3 || rep.mistakes.length !== 1) throw new Error('debrief content missing');
    profile.missionDone('selftest', rep);
    same([profile.missionCount, profile.due().map((d) => d.topicId), profile.xp], [1, ['ar.ops'], 225], 'profile');
  });
  check('progress persists across a reload', () => {
    const again = createLearning(sandboxFrom(sb), { now: () => clock }).profile;
    same([again.xp, again.missionCount, again.overall().answered], [225, 1, 3], 'reloaded profile');
  });

  const passed = results.filter((r) => r.ok).length;
  return { pass: passed === results.length, passed, total: results.length, results };
}

/** A second sandbox on the same storage: what a page reload would see. */
function sandboxFrom(first) {
  const sb = sandbox();
  sb.storage = first.storage;
  return sb;
}
