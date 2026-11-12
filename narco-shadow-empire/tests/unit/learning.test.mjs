// Learner model tests: credit / XP / mastery rules, adaptive difficulty, spaced repetition, the persistent profile,
// the tutor hint ladder and the session report - driven by an injected clock and the real question engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../src/core/context.js';
import { createMath } from '../../src/math/engine.js';
import { createLearning, createProfile } from '../../src/learning/index.js';
import { XP, LEVEL_CAPS, MASTERY, classifyOutcome, usedPenaltyAid, givesMasteryCredit, xpFor, masteryScore, masteryState, createTopicStats, applyOutcome, tierName, sectionOf, TOPIC_IDS } from '../../src/learning/mastery.js';
import { ADAPTIVE, applyAdaptive, isSlow, isStruggle } from '../../src/learning/adaptive.js';
import { DAY_MS, SRS, applySrs, isDue, dueQueue, missionTick, intervalMs } from '../../src/learning/srs.js';
import { LIMITS, migrate, PROFILE_VERSION } from '../../src/learning/profile.js';
import { LADDER, REQUEST_KINDS } from '../../src/learning/tutor.js';
import { makePlan, PHASES } from '../../src/learning/session.js';
import { TOPICS } from '../../src/math/topics.js';

const NOON = new Date(2026, 10, 12, 12, 0, 0).getTime();   // local noon, so +N days never crosses a date line
const MIN = 60000;
/** a context with the real engine, the learner model and a clock the test controls */
function setup(opts = {}) {
  const clock = { t: NOON, now: () => clock.t, days: (n) => { clock.t += n * DAY_MS; }, ms: (n) => { clock.t += n; } };
  const ctx = createContext({ params: { test: '1' }, ...opts });
  const math = createMath(ctx);
  const events = [];
  ctx.events.on('*', (e) => events.push(e));
  return { ctx, math, clock, events, ...createLearning(ctx, { now: clock.now }) };
}
let serial = 0;
const res = (over = {}) => ({ questionId: 'q' + ++serial, templateId: 'ar.ops.loadout', topic: 'ar.ops', section: 'AR', level: 1, signature: 'sig' + serial, mode: 'mission', outcome: 'independent', attempts: 1, hintLevel: 0, aids: {}, timeMs: 20000, wrong: [], ...over });
const WHY = { en: 'You forgot to subtract.', es: 'Olvidaste restar.' };

test('credit rule and XP table', () => {
  assert.equal(classifyOutcome({}), 'independent');
  assert.equal(classifyOutcome({ wrongCount: 1 }), 'assisted');
  assert.equal(classifyOutcome({ hintLevel: 1 }), 'assisted');
  assert.equal(classifyOutcome({ aids: { beginner: true } }), 'assisted');
  assert.equal(classifyOutcome({ aids: { calculator: true } }), 'assisted');
  assert.equal(classifyOutcome({ aids: { why: true } }), 'independent', 'asking why an answer is wrong is free');
  assert.equal(classifyOutcome({ hintLevel: 4 }), 'revealed');
  assert.equal(classifyOutcome({ revealed: true, wrongCount: 0 }), 'revealed', 'revealed wins whatever happens afterwards');
  assert.equal(classifyOutcome({ solved: false, wrongCount: 2 }), 'incorrect');
  assert.equal(classifyOutcome({ solved: false }), 'skipped');
  assert.equal(usedPenaltyAid({ why: true }), false);
  assert.deepEqual(['independent', 'assisted', 'revealed', 'incorrect'].map(givesMasteryCredit), [true, false, false, false]);
  const xp = (o) => xpFor(res(o));
  assert.deepEqual([1, 2, 3, 4, 5].map((level) => xp({ level })), [100, 125, 150, 175, 200]);
  assert.deepEqual([0, 1, 2, 3].map((hintLevel) => xp({ outcome: 'assisted', hintLevel })), [50, 50, 30, 15]);
  assert.equal(xp({ outcome: 'revealed', hintLevel: 4 }), 0);
  assert.equal(xp({ outcome: 'assisted', hintLevel: 4 }), 0, 'a shown solution never pays');
  assert.equal(xp({ outcome: 'independent', hintLevel: 4, level: 5 }), 0);
  assert.deepEqual([xp({ outcome: 'incorrect' }), xp({ outcome: 'skipped' })], [0, 0]);
  assert.deepEqual([xp({ mode: 'exam', level: 5 }), xp({ mode: 'exam', outcome: 'incorrect' })], [60, 0]);
  assert.deepEqual([xp({ mode: 'debrief', level: 5 }), xp({ mode: 'debrief', outcome: 'assisted', hintLevel: 1 }), xp({ mode: 'debrief', outcome: 'assisted', hintLevel: 3 })], [40, 40, 15]);
  assert.equal(xpFor(null), 0);
  assert.deepEqual([XP.independentBase, XP.examCorrect, XP.debriefCorrect, XP.revealed], [100, 60, 40, 0]);
});

test('mastery: only independent answers count, recency weighted, capped by level', () => {
  assert.equal(masteryScore('', 3), 0);
  assert.equal(masteryScore('iiii', 1), LEVEL_CAPS[1]);
  assert.equal(masteryScore('iiiiiiiiiiii', 5), 1);
  assert.deepEqual([masteryScore('rrrr', 5), masteryScore('aaaa', 5), masteryScore('xxxx', 5)], [0, 0, 0], 'revealed / assisted / incorrect earn nothing');
  assert.ok(masteryScore('xi', 5) > masteryScore('ix', 5), 'the newest answer weighs most');
  assert.ok(Math.abs(masteryScore('ai', 5) - 1 / (1 + MASTERY.decay)) < 1e-12);
  assert.deepEqual([masteryState(0, 0), masteryState(3, 0.3), masteryState(3, 0.6), masteryState(3, 0.85)], ['new', 'learning', 'proficient', 'mastered']);
  assert.equal(masteryState(12, masteryScore('iiiiiiiiiiii', 1)), 'learning', 'level 1 alone cannot look proficient');
  assert.equal(masteryState(12, masteryScore('iiiiiiiiiiii', 2)), 'proficient');
  assert.equal(masteryState(12, masteryScore('iiiiiiiiiiii', 4)), 'mastered');
  // per-topic counters
  const st = createTopicStats('AR');
  applyOutcome(st, res({ timeMs: 30000 }), 1000);
  applyOutcome(st, res({ outcome: 'assisted', timeMs: 50000, wrong: [{ value: 54, tag: 'forgot-subtract', why: WHY }, { value: 54, tag: 'forgot-subtract' }, { value: 7 }] }), 2000);
  applyOutcome(st, res({ outcome: 'revealed', timeMs: 90000, wrong: [{ value: 54, tag: 'forgot-subtract' }] }), 3000);
  applyOutcome(st, res({ outcome: 'incorrect', timeMs: 5000 }), 4000);
  applyOutcome(st, res({ outcome: 'skipped' }), 5000);
  applyOutcome(st, res({ outcome: 'nonsense' }), 6000);
  assert.deepEqual([st.attempts, st.independent, st.assisted, st.revealed, st.incorrect, st.skipped], [4, 1, 1, 1, 1, 1]);
  assert.deepEqual([st.timeMs, st.timeCount, st.last, st.lastSeen], [80000, 2, 'iarx', 4000], 'only solved answers are timed');
  assert.deepEqual(st.mistakes, { 'forgot-subtract': { count: 2, why: WHY, ts: 3000 } }, 'one question counts a misconception once; the latest why is kept');
  for (let i = 0; i < 20; i++) applyOutcome(st, res(), 7000);
  assert.equal(st.last, 'i'.repeat(MASTERY.window));
  assert.deepEqual([tierName(1).en, tierName(5).es, tierName(99).en], ['Recruit', 'Preparación ASVAB', 'ASVAB Readiness']);
  assert.deepEqual([sectionOf('mk.linear'), sectionOf('ar.ops'), sectionOf('x')], ['MK', 'AR', null]);
  assert.deepEqual(TOPIC_IDS, TOPICS.map((t) => t.id), 'the fallback topic list matches the engine');
});

test('adaptive difficulty: promote after 3 independent, demote after 2 struggles', () => {
  const st = { level: 1, promo: 0, demo: 0 };
  assert.equal(applyAdaptive(st, res()), null);
  assert.equal(applyAdaptive(st, res({ timeMs: 200000, estSeconds: 45 })), null, 'a slow answer does not add to the streak');
  assert.deepEqual([st.promo, isSlow({ timeMs: 200000, estSeconds: 45 }), isSlow({ timeMs: 200000 })], [1, true, false]);
  assert.equal(applyAdaptive(st, res()), null);
  assert.deepEqual(applyAdaptive(st, res()), { from: 1, to: 2 });
  assert.deepEqual(st, { level: 2, promo: 0, demo: 0 });
  // an easier question proves nothing about the current level; a harder one counts
  for (let i = 0; i < 5; i++) assert.equal(applyAdaptive(st, res({ level: 1 })), null);
  assert.equal(st.promo, 0);
  applyAdaptive(st, res({ level: 3 })); applyAdaptive(st, res({ level: 2 }));
  assert.equal(st.promo, 2);
  // one light assist breaks the promotion streak, but is not a struggle
  applyAdaptive(st, res({ level: 2, outcome: 'assisted', hintLevel: 1 }));
  assert.deepEqual(st, { level: 2, promo: 0, demo: 0 });
  assert.deepEqual([isStruggle(res({ outcome: 'assisted', hintLevel: 1 })), isStruggle(res({ outcome: 'assisted', hintLevel: 2 })), isStruggle(res({ outcome: 'revealed' })), isStruggle(res({ outcome: 'incorrect' }))], [false, true, true, false]);
  // two struggles in a row demote; a light assist in between resets the run; a miss above the level is ignored
  assert.equal(applyAdaptive(st, res({ level: 2, outcome: 'revealed', hintLevel: 4 })), null);
  applyAdaptive(st, res({ level: 2, outcome: 'assisted', hintLevel: 1 }));
  assert.equal(st.demo, 0);
  applyAdaptive(st, res({ level: 2, outcome: 'assisted', hintLevel: 3 }));
  assert.equal(applyAdaptive(st, res({ level: 4, outcome: 'revealed', hintLevel: 4 })), null);
  assert.equal(st.demo, 1);
  assert.deepEqual(applyAdaptive(st, res({ level: 2, outcome: 'revealed', hintLevel: 4 })), { from: 2, to: 1 });
  // floors and ceilings
  applyAdaptive(st, res({ outcome: 'revealed' }));
  assert.equal(applyAdaptive(st, res({ outcome: 'revealed' })), null);
  assert.equal(st.level, ADAPTIVE.minLevel);
  const top = { level: 5, promo: 0, demo: 0 };
  for (let i = 0; i < 6; i++) assert.equal(applyAdaptive(top, res({ level: 5 })), null);
  assert.equal(top.level, 5);
  assert.equal(applyAdaptive(top, res({ outcome: 'skipped' })), null);
});

test('spaced repetition: misses come back after the next mission or a day; successes space out 1-3-7-14-30', () => {
  const t0 = NOON;
  assert.deepEqual(SRS.intervalsDays, [1, 3, 7, 14, 30]);
  let s = applySrs(null, res(), { now: t0 });
  assert.deepEqual(s, { box: 1, dueAt: t0 + DAY_MS, dueMission: null, templateId: null, at: t0 });
  assert.equal(applySrs(s, res(), { now: t0 + 1000 }), s, 'answering early does not skip the wait');
  assert.deepEqual([isDue(s, t0 + DAY_MS - 1), isDue(s, t0 + DAY_MS), isDue(null, t0)], [false, true, false]);
  let t = t0;
  for (const [box, days] of [[2, 3], [3, 7], [4, 14], [5, 30], [5, 30]]) {
    t = s.dueAt;
    s = applySrs(s, res(), { now: t });
    assert.deepEqual([s.box, s.dueAt - t], [box, days * DAY_MS]);
  }
  assert.equal(intervalMs(3), 7 * DAY_MS);
  // a miss: box 0, due at +1 day or once another mission is completed, remembering the template
  const miss = applySrs(s, res({ outcome: 'revealed', templateId: 'ar.ops.split' }), { now: t, missionCount: 2 });
  assert.deepEqual(miss, { box: 0, dueAt: t + DAY_MS, dueMission: 3, templateId: 'ar.ops.split', at: t });
  assert.deepEqual([isDue(miss, t + 1, 2), isDue(miss, t + 1, 3), isDue(miss, t + DAY_MS, 2)], [false, true, true]);
  for (const outcome of ['assisted', 'incorrect']) assert.equal(applySrs(null, res({ outcome }), { now: t }).box, 0);
  assert.equal(applySrs(miss, res({ outcome: 'skipped' }), { now: t }), miss);
  const back = applySrs(miss, res(), { now: t + 5, missionCount: 3 });
  assert.deepEqual([back.box, back.dueAt, back.dueMission, back.templateId], [1, t + 5 + DAY_MS, null, 'ar.ops.split']);
  // mission tick stamps the moment a missed topic became due; the queue is most-overdue first, misses before spaced
  const ticked = missionTick({ ...miss }, t + 500, 3);
  assert.equal(ticked.dueAt, t + 500);
  const topics = { 'ar.ops': { srs: { box: 2, dueAt: t - 5 * DAY_MS } }, 'mk.linear': { srs: { box: 0, dueAt: t - 5 * DAY_MS, dueMission: 1, templateId: 'mk.linear.twostep' } }, 'ar.word': { srs: { box: 1, dueAt: t - DAY_MS } }, 'mk.order': { srs: { box: 1, dueAt: t + DAY_MS } }, 'mk.geom': { srs: null } };
  assert.deepEqual(dueQueue(topics, t).map((d) => [d.topicId, d.reason, d.templateId]), [['mk.linear', 'missed', 'mk.linear.twostep'], ['ar.ops', 'spaced', undefined], ['ar.word', 'spaced', undefined]]);
});

test('profile: record() is the single entry point and enforces the credit rule', () => {
  const { profile, events, clock, ctx } = setup();
  assert.equal(ctx.profile, profile);
  assert.deepEqual([profile.xp, profile.overall().answered, profile.tier().level, profile.missionCount], [0, 0, 1, 0]);
  const out = profile.record(res({ timeMs: 30000 }));
  assert.deepEqual([out.xp, out.levelChange, out.srs.box], [100, undefined, 1]);
  const t = profile.topic('ar.ops');
  assert.deepEqual([t.attempts, t.independent, t.independentPct, t.avgTimeMs, t.level, t.state, t.due], [1, 1, 100, 30000, 1, 'learning', false]);
  assert.equal(t.mastery, LEVEL_CAPS[1]);
  assert.deepEqual(profile.section('AR'), { answered: 1, independent: 1, assisted: 0, revealed: 0, incorrect: 0, independentPct: 100, avgTimeMs: 30000 });
  assert.equal(profile.section('MK').answered, 0);
  assert.deepEqual(events.filter((e) => e.type === 'learning:recorded').map((e) => [e.payload.xp, e.payload.result.outcome]), [[100, 'independent']]);
  // a result cannot claim more credit than the learner earned
  assert.equal(profile.record(res({ outcome: 'independent', hintLevel: 2 })).result.outcome, 'assisted');
  assert.equal(profile.record(res({ outcome: 'independent', attempts: 3 })).result.outcome, 'assisted');
  assert.equal(profile.record(res({ outcome: 'independent', aids: { calculator: true } })).result.outcome, 'assisted');
  assert.equal(profile.record(res({ outcome: 'independent', aids: { why: true } })).result.outcome, 'independent');
  const shown = profile.record(res({ outcome: 'independent', hintLevel: 4, level: 5 }));
  assert.deepEqual([shown.result.outcome, shown.xp, shown.srs.box], ['revealed', 0, 0]);
  assert.equal(profile.record(res({ mode: 'exam', outcome: 'assisted', hintLevel: 1 })).result.outcome, 'incorrect', 'an exam has no assisted answers');
  // malformed results are refused and change nothing
  const before = JSON.stringify(profile.data);
  for (const bad of [null, {}, { topic: 'ar.ops' }, { topic: 'ar.ops', outcome: 'won' }, { outcome: 'independent' }, 'x']) assert.equal(profile.record(bad), null);
  assert.equal(JSON.stringify(profile.data), before);
  // history and signatures are bounded
  for (let i = 0; i < LIMITS.history + 30; i++) profile.record(res({ topic: 'mk.order', section: 'MK' }));
  assert.deepEqual([profile.data.history.length, profile.data.signatures.length, profile.recentSignatures().size], [LIMITS.history, LIMITS.signatures, LIMITS.signatures]);
  assert.ok(profile.recentSignatures().has('sig' + serial));
  assert.equal(profile.topic('nope').state, 'new');
  assert.equal(profile.levelFor('nope'), 1);
  clock.days(0);
});

test('profile: revealed answers earn no mastery and come back for review', () => {
  const { profile, clock } = setup();
  for (let i = 0; i < 3; i++) profile.record(res({ outcome: 'revealed', hintLevel: 4, attempts: 4, wrong: [{ value: 54, tag: 'forgot-subtract', why: WHY }] }));
  const t = profile.topic('ar.ops');
  assert.deepEqual([t.mastery, t.independent, t.revealed, t.state, profile.xp], [0, 0, 3, 'learning', 0]);
  assert.deepEqual(profile.due(), [], 'not due yet');
  assert.deepEqual(profile.mistakes(), [{ tag: 'forgot-subtract', topicId: 'ar.ops', count: 3, why: WHY, ts: clock.t }]);
  // ... due after the next completed mission
  assert.deepEqual(profile.missionDone('ch1', { xp: 175 }), { completed: true, completedAt: clock.t, bestXp: 175, attempts: 1 });
  assert.deepEqual(profile.due(), [{ topicId: 'ar.ops', templateId: 'ar.ops.loadout', reason: 'missed', dueAt: clock.t }]);
  assert.deepEqual([profile.topic('ar.ops').state, profile.topic('ar.ops').due], ['due', true]);
  // an independent answer while due moves it to box 1: next review in a day
  profile.record(res());
  assert.deepEqual(profile.due(), []);
  clock.days(1);
  assert.equal(profile.due()[0].reason, 'spaced');
  // ... or after a day, without any mission
  const other = setup();
  other.profile.record(res({ topic: 'mk.linear', section: 'MK', outcome: 'assisted', hintLevel: 1, templateId: 'mk.linear.twostep' }));
  assert.deepEqual(other.profile.due(), []);
  other.clock.days(1);
  assert.deepEqual(other.profile.due().map((d) => [d.topicId, d.templateId, d.reason]), [['mk.linear', 'mk.linear.twostep', 'missed']]);
  // missions: best XP and attempts accumulate
  assert.deepEqual(profile.missionState('ch2'), { completed: false, completedAt: 0, bestXp: 0, attempts: 0 });
  profile.missionDone('ch1', { xp: 90 });
  assert.deepEqual([profile.missionState('ch1').bestXp, profile.missionState('ch1').attempts, profile.missionCount], [175, 2, 2]);
  // a mistake seen once is not a "repeated mistake"
  profile.record(res({ topic: 'mk.order', section: 'MK', outcome: 'assisted', hintLevel: 1, wrong: [{ value: 3, tag: 'left-to-right' }] }));
  assert.deepEqual(profile.mistakes().map((m) => m.tag), ['forgot-subtract']);
  profile.record(res({ topic: 'mk.order', section: 'MK', outcome: 'assisted', hintLevel: 1, wrong: [{ value: 3, tag: 'left-to-right' }] }));
  const rep = profile.mistakes();
  assert.deepEqual(rep.map((m) => [m.tag, m.count]), [['forgot-subtract', 3], ['left-to-right', 2]]);
  assert.ok(rep[1].why.en && rep[1].why.es, 'a generic explanation stands in when the question gave none');
});

test('profile: adaptive level, tier, skill map, streak, recommendations', () => {
  const { profile, clock, events, ctx } = setup();
  assert.deepEqual(profile.recommend().kind, 'drill');
  assert.deepEqual(profile.streak(), { current: 0, best: 0, practicedToday: false });
  profile.record(res()); profile.record(res());
  const third = profile.record(res());
  assert.deepEqual(third.levelChange, { topic: 'ar.ops', from: 1, to: 2 });
  assert.deepEqual(events.filter((e) => e.type === 'learning:level').map((e) => e.payload), [{ topic: 'ar.ops', from: 1, to: 2 }]);
  assert.deepEqual([profile.levelFor('ar.ops'), profile.tier().level, profile.tier().name.en], [2, 2, 'Specialist']);
  profile.record(res({ topic: 'mk.linear', section: 'MK', level: 1 }));
  assert.equal(profile.tier().level, 2, 'mean of 2 and 1 rounds up');
  const map = profile.skillMap();
  assert.equal(map.length, 20);
  assert.deepEqual(map.find((m) => m.topicId === 'ar.ops'), { topicId: 'ar.ops', section: 'AR', name: TOPICS.find((t) => t.id === 'ar.ops').name, mastery: LEVEL_CAPS[2], level: 2, state: 'proficient' });
  assert.deepEqual(map.find((m) => m.topicId === 'mk.geom').state, 'new');
  // streak: consecutive local days with an answer
  assert.deepEqual(profile.streak(), { current: 1, best: 1, practicedToday: true });
  clock.days(1);
  assert.deepEqual(profile.streak(), { current: 1, best: 1, practicedToday: false }, 'yesterday still counts until today ends');
  profile.record(res({ outcome: 'skipped' }));
  assert.equal(profile.streak().practicedToday, false, 'a skipped question is not practice');
  profile.record(res());
  clock.days(1); profile.record(res());
  assert.deepEqual(profile.streak(), { current: 3, best: 3, practicedToday: true });
  clock.days(3);
  assert.deepEqual(profile.streak(), { current: 0, best: 3, practicedToday: false }, 'a missed day breaks the streak');
  profile.record(res());
  assert.deepEqual(profile.streak(), { current: 1, best: 3, practicedToday: true });
  // recommendations
  assert.equal(profile.recommend().kind, 'review', 'something is due after several days');
  const calm = setup();
  calm.profile.record(res({ topic: 'mk.order', section: 'MK' }));
  calm.profile.record(res({ topic: 'ar.word', outcome: 'assisted', hintLevel: 1 }));
  assert.deepEqual([calm.profile.recommend().kind, calm.profile.recommend().topicId], ['drill', 'ar.word']);
  calm.ctx.register('campaign', { next: () => ({ id: 'ch2' }) });
  assert.deepEqual([calm.profile.recommend().kind, calm.profile.recommend().id], ['mission', 'ch2']);
  calm.ctx.register('campaign', { next: () => null });
  for (let i = 0; i < LIMITS.examAfterAnswers; i++) calm.profile.record(res({ topic: 'mk.order', section: 'MK' }));
  assert.equal(calm.profile.recommend().kind, 'exam');
  calm.profile.addExam({ overallPct: 72, band: { id: 'on-track' }, sections: [{ section: 'AR', correct: 4, total: 5, pct: 80, timeUsedMs: 200000, items: ['dropped'] }] });
  assert.notEqual(calm.profile.recommend().kind, 'exam', 'not again within three days');
  assert.deepEqual(calm.profile.exams, [{ ts: calm.clock.t, overallPct: 72, band: 'on-track', sections: [{ section: 'AR', correct: 4, total: 5, pct: 80, timeUsedMs: 200000 }] }]);
  for (const topic of ['ar.ops', 'ar.word', 'mk.linear']) calm.profile.record(res({ topic, outcome: 'revealed', hintLevel: 4 }));
  calm.clock.days(1);
  assert.deepEqual([calm.profile.recommend().kind, calm.profile.due().length >= 3], ['review', true]);
  for (const r of [profile.recommend(), calm.profile.recommend()]) assert.ok(r.reason.en && r.reason.es);
  assert.doesNotMatch(JSON.stringify(calm.profile.data) + JSON.stringify(calm.profile.recommend()), /AFQT|official|percentile/i);
  assert.equal(ctx.has('profile'), true);
});

test('profile: persistence, export / import, reset, storage that throws', () => {
  const a = setup();
  a.profile.record(res()); a.profile.record(res({ outcome: 'assisted', hintLevel: 2 }));
  a.profile.missionDone('ch1', { xp: 130 });
  const snapshot = JSON.stringify(a.profile.data);
  // a second profile on the same storage sees the same data (a page reload)
  const reloaded = createProfile(a.ctx, { now: a.clock.now });
  assert.equal(JSON.stringify(reloaded.data), snapshot);
  assert.deepEqual([reloaded.xp, reloaded.missionCount, reloaded.topic('ar.ops').attempts], [130, 1, 2]);
  // export -> import into a fresh profile
  const exported = a.profile.export();
  const b = setup();
  assert.equal(b.profile.import(exported), true);
  assert.equal(JSON.stringify(b.profile.data), snapshot);
  assert.equal(b.profile.import(JSON.parse(exported)), true, 'an object works as well as a string');
  // garbage is refused and the current profile is untouched
  for (const junk of ['nope', '{"v":99}', '{"v":0}', '[]', 'null', '{"v":1,"topics":[]}', '{"data":{"v":"1"}}', 42, undefined]) assert.equal(b.profile.import(junk), false, String(junk));
  assert.equal(JSON.stringify(b.profile.data), snapshot);
  // damaged fields are repaired on load rather than trusted
  const fixed = migrate({ v: PROFILE_VERSION, xp: -5, topics: { 'ar.ops': { level: 99, last: 'iiZZxi', attempts: 'many', srs: { box: 'x' } }, junk: 7 }, streak: { current: 2, best: 2, lastDay: 'yesterday' }, history: 'no', missionCount: 2.6 }, NOON);
  assert.deepEqual([fixed.xp, fixed.topics['ar.ops'].level, fixed.topics['ar.ops'].last, fixed.topics['ar.ops'].attempts, fixed.topics['ar.ops'].srs, Object.keys(fixed.topics), fixed.streak.lastDay, fixed.history, fixed.missionCount], [0, 5, 'iixi', 0, null, ['ar.ops'], null, [], 3]);
  b.profile.reset();
  assert.deepEqual([b.profile.xp, b.profile.overall().answered, b.profile.missionCount], [0, 0, 0]);
  assert.equal(createProfile(b.ctx, { now: b.clock.now }).xp, 0, 'the reset is persisted');
  // a storage backend that throws on every call: the profile keeps working in memory
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const c = setup({ params: {}, storageBackend: bad });
  assert.equal(c.ctx.storage.usingFallback, true);
  assert.equal(c.profile.record(res()).xp, 100);
  assert.equal(createProfile(c.ctx, { now: c.clock.now }).xp, 100);
  // a backend that starts failing later (quota) loses nothing
  const store = new Map(); let fail = false;
  const flaky = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { if (fail) throw new Error('quota'); store.set(k, v); }, removeItem: (k) => store.delete(k) };
  const d = setup({ params: {}, storageBackend: flaky });
  d.profile.record(res());
  assert.ok([...store.keys()].some((k) => k.endsWith(':profile')), 'written to the real backend');
  fail = true; d.profile.record(res());
  assert.equal(createProfile(d.ctx, { now: d.clock.now }).xp, 200);
  // no context at all still works (memory only)
  const solo = createProfile(null);
  assert.equal(solo.record(res()).xp, 100);
  assert.equal(solo.skillMap().length, 20);
});

test('tutor: first-try answers, parse errors, and the four-rung hint ladder', () => {
  const { tutor, profile, math, clock, events } = setup();
  // correct on the first try
  let q = math.fixed.trucks(), s = tutor.begin(q);
  assert.equal(tutor.active, s);
  clock.ms(20000);
  const bad = s.submit({ text: 'forty' });
  assert.deepEqual([bad.correct, !!bad.parseError.en, s.attempts], [false, true, 0], 'a parse error is not an attempt');
  const ok = s.submit({ text: '40 cases' });
  assert.deepEqual([ok.correct, ok.outcome, s.canAdvance], [true, 'independent', true]);
  const r = s.finish();
  assert.deepEqual([r.outcome, r.xp, r.attempts, r.hintLevel, r.timeMs, r.needsReview, r.topic, r.mode], ['independent', 100, 1, 0, 20000, false, 'ar.ops', 'mission']);
  assert.equal(s.finish(), r, 'finish is idempotent');
  assert.deepEqual([profile.topic('ar.ops').attempts, profile.xp, tutor.active], [1, 100, null]);
  assert.equal(s.submit({ text: '40' }).correct, true);
  assert.equal(profile.topic('ar.ops').attempts, 1, 'answers after finish() are not recorded again');
  // four wrong answers: concept -> formula -> first step -> full solution + a related problem
  s = tutor.begin(q);
  const steps = ['54', '12', '68', '7'].map((text) => s.submit({ text }));
  assert.deepEqual(steps.map((x) => x.correct), [false, false, false, false]);
  assert.deepEqual(steps.map((x) => x.tag), ['forgot-subtract', 'subtract-first', 'added-instead', 'added-groups']);
  assert.ok(steps.every((x) => x.why.en && x.why.es), 'every wrong answer is explained');
  assert.deepEqual(steps.slice(0, 3).map((x) => [x.hint.level, x.hint.body]), [[1, q.hints[0]], [2, q.hints[1]], [3, q.hints[2]]]);
  assert.ok(steps.slice(0, 3).every((x) => x.hint.title.en && x.hint.title.es && !x.reveal && !x.followUp));
  const last = steps[3];
  assert.deepEqual([last.hint, last.reveal, last.answer], [undefined, q.solution, q.answer.display]);
  assert.deepEqual([last.followUp.templateId, last.followUp.level, last.followUp.signature !== q.signature], [q.templateId, q.level, true]);
  assert.deepEqual([s.hintLevel, s.revealed, s.outcome(), s.canAdvance, s.attempts], [LADDER.reveal, true, 'revealed', false, 4]);
  assert.deepEqual(events.filter((e) => e.type === 'tutor:hint').map((e) => e.payload.level), [1, 2, 3, 4]);
  // solving it after the reveal is still 'revealed': no XP, no mastery, and it does not open the gate
  const late = s.submit({ text: '40' });
  assert.deepEqual([late.correct, late.outcome, s.canAdvance], [true, 'revealed', false]);
  const rr = s.finish();
  assert.deepEqual([rr.outcome, rr.xp, rr.needsReview, rr.wrong.map((w) => w.value)], ['revealed', 0, true, [54, 12, 68, 7]]);
  assert.equal(profile.topic('ar.ops').independent, 1);
  assert.equal(profile.xp, 100);
  // the related problem, solved without a reveal, opens the gate
  const f1 = s.beginFollowUp();
  assert.equal(f1.question, last.followUp);
  assert.equal(f1.submit({ text: String(f1.question.answer.value) }).correct, true);
  assert.deepEqual([f1.canAdvance, s.canAdvance, f1.needsReview], [true, true, false]);
  assert.equal(f1.finish().outcome, 'independent');
  // if the related problems are revealed too: similar -> easier -> the gate opens anyway, flagged for review
  const hard = math.generate({ templateId: 'ar.ops.shifts', level: 3, seed: 5 });
  const wrongOf = (qn, i) => ({ text: String(qn.answer.value + 1000 + i) });
  const fail = (sess) => { let out; for (let i = 0; i < 4; i++) out = sess.submit(wrongOf(sess.question, i)); sess.finish(); return out; };
  const root = tutor.begin(hard), o1 = fail(root);
  assert.deepEqual([o1.followUp.templateId, o1.followUp.level], ['ar.ops.shifts', 3]);
  const c1 = root.beginFollowUp(), o2 = fail(c1);
  assert.deepEqual([o2.followUp.templateId, o2.followUp.level, c1.canAdvance], ['ar.ops.shifts', 2, false], 'the second related problem is one level easier');
  const c2 = c1.beginFollowUp(), o3 = fail(c2);
  assert.deepEqual([o3.followUp, !!o3.reveal, c2.canAdvance, root.canAdvance, c2.needsReview, c2.beginFollowUp()], [undefined, true, true, true, true, null], 'never a dead end');
  assert.equal(profile.topic('ar.ops').revealed, 4);
  assert.throws(() => tutor.begin({}), /not a Question/);
});

test('tutor: on-demand help, what it costs, exam mode', () => {
  const { tutor, math, ctx, profile } = setup();
  const q = math.fixed.equation();
  const solveWith = (prep, answer = '9') => { const s = tutor.begin(q); const extra = prep(s); const out = s.submit({ text: answer }); return { s, extra, out, r: s.finish() }; };
  // paid help
  let x = solveWith((s) => s.request('beginner'));
  assert.deepEqual([x.extra.body, x.extra.kind, x.r.outcome, x.r.hintLevel, x.r.xp, x.r.aids], [q.beginner, 'beginner', 'assisted', 1, 50, { beginner: true }]);
  x = solveWith((s) => s.request('formula'));
  assert.deepEqual([x.extra.body, x.extra.trick, x.r.outcome, x.r.hintLevel, x.r.xp], [q.formula, q.trick, 'assisted', 2, 30]);
  x = solveWith((s) => s.request('visual'));
  assert.deepEqual([x.extra.visual, x.r.outcome, x.r.hintLevel, x.r.aids.visual], [q.visual, 'assisted', 1, true]);
  x = solveWith((s) => s.request('similar'));
  assert.deepEqual([x.extra.example.question.templateId, x.extra.example.solution, x.r.outcome, x.r.hintLevel], [q.templateId, x.extra.example.question.solution, 'assisted', 2]);
  assert.notEqual(x.extra.example.question.signature, q.signature);
  // free help
  x = solveWith((s) => [s.request('retry'), s.request('why')]);
  assert.deepEqual([x.r.outcome, x.r.xp, x.r.hintLevel], ['independent', 125, 0]);
  assert.ok(x.extra[0].body.en && x.extra[1].body.es);
  assert.equal(ctx.settings.get('learnLang'), 'en');
  x = solveWith((s) => s.request('language'));
  assert.deepEqual([ctx.settings.get('learnLang'), x.extra.lang, x.r.outcome], ['es', 'es', 'independent']);
  assert.equal(tutor.begin(q).request('language').lang, 'en');
  assert.equal(tutor.begin(q).request('telepathy'), null);
  assert.deepEqual(REQUEST_KINDS, ['beginner', 'formula', 'why', 'similar', 'visual', 'retry', 'language']);
  // "why is my answer wrong" names the mistake that was just made
  let s = tutor.begin(q);
  const w = s.submit({ text: '27' });
  assert.deepEqual([w.tag, w.hint.level], ['forgot-divide', 1]);
  const why = s.request('why');
  assert.deepEqual([why.body, why.tag, why.value, s.hintLevel], [w.why, 'forgot-divide', 27, 1]);
  s.submit({ text: '41' });
  assert.ok(s.request('why').body.en.includes('common mistake'), 'an unrecognised value gets general advice');
  // a wrong answer climbs from the rung the learner is already on
  s = tutor.begin(q);
  s.request('formula');
  assert.equal(s.submit({ text: '5' }).hint.level, 3);
  assert.equal(s.submit({ text: '9' }).correct, true);
  assert.deepEqual([s.outcome(), s.finish().xp], ['assisted', 15]);
  // help taken after the problem is solved costs nothing
  s = tutor.begin(q); s.submit({ text: '9' });
  s.request('beginner'); s.request('formula'); s.request('similar');
  assert.deepEqual([s.outcome(), s.hintLevel, s.finish().xp], ['independent', 0, 125]);
  // a problem without a visual model is not charged for asking
  const plain = math.generate({ templateId: 'mk.order.basic', level: 1, seed: 4 });
  s = tutor.begin(plain);
  assert.deepEqual([s.request('visual').visual, s.hintLevel, s.aids], [undefined, 0, {}]);
  // the calculator costs independent credit while a problem is open
  s = tutor.begin(q);
  ctx.events.emit('learning:aid', { aid: 'calculator' });
  s.submit({ text: '9' });
  assert.deepEqual([s.outcome(), s.finish().aids], ['assisted', { calculator: true }]);
  ctx.events.emit('learning:aid', { aid: 'calculator' });
  // exam mode: no hints, no aids, no reveal
  const before = profile.xp;
  s = tutor.begin(q, { mode: 'exam' });
  const denied = REQUEST_KINDS.map((k) => s.request(k));
  assert.ok(denied.every((d) => d.denied && d.body.en.includes('exam mode')));
  ctx.events.emit('learning:aid', { aid: 'calculator' });
  const miss = s.submit({ text: '5' });
  assert.deepEqual([miss.correct, miss.hint, miss.why, miss.reveal, s.hintLevel, s.aids], [false, undefined, undefined, undefined, 0, {}]);
  assert.deepEqual([s.finish().outcome, profile.xp], ['incorrect', before]);
  s = tutor.begin(q, { mode: 'exam' }); s.submit({ text: '9' });
  assert.deepEqual([s.finish().xp, profile.xp], [60, before + 60]);
  // a question nobody answered is skipped, not wrong
  assert.equal(tutor.begin(q).finish().outcome, 'skipped');
});

test('session: plan, clock, phases and the after-action report', () => {
  assert.deepEqual(makePlan(15).map((p) => [p.id, p.fromMs / MIN, p.toMs / MIN]), [['story', 0, 2], ['ar', 2, 5], ['mk', 5, 8], ['combined', 8, 12], ['debrief', 12, 15]]);
  assert.deepEqual(makePlan(45).map((p) => p.toMs / MIN), [6, 15, 24, 36, 45]);
  assert.ok(PHASES.every((p) => p.name.en && p.name.es));
  const { session, tutor, math, profile, clock, events } = setup();
  assert.deepEqual([session.active, session.end(), session.report], [false, null, null]);
  session.add(res());
  assert.equal(session.results.length, 0, 'nothing is added outside a session');
  session.start({ missionId: 'ch1' });
  assert.deepEqual([session.active, session.minutes, session.phase, session.timePhase, session.elapsedMs, session.missionId], [true, 15, 'story', 'story', 0, 'ch1']);
  clock.ms(3 * MIN);
  assert.deepEqual([session.elapsedMs, session.timePhase, session.remainingMs], [3 * MIN, 'ar', 12 * MIN]);
  session.pause(); clock.ms(10 * MIN);
  assert.deepEqual([session.elapsedMs, session.paused], [3 * MIN, true], 'the clock stops while paused');
  session.resume();
  assert.deepEqual([session.setPhase('ar'), session.setPhase('nope'), session.phase], ['ar', 'ar', 'ar']);
  assert.deepEqual(events.filter((e) => e.type === 'session:phase').map((e) => e.payload.phase), ['story', 'ar']);
  // AR problem: one wrong answer, then solved (assisted). MK problem: first try.
  const trucks = math.fixed.trucks(), eq = math.fixed.equation();
  let s = tutor.begin(trucks);
  s.submit({ text: '54' }); clock.ms(40000); s.submit({ text: '40' }); s.finish();
  session.setPhase('mk');
  s = tutor.begin(eq); clock.ms(30000); s.submit({ text: 'x = 9' }); s.finish();
  assert.equal(session.results.length, 2);
  assert.equal(session.question(session.results[0].questionId), trucks);
  clock.ms(20 * MIN);
  assert.equal(session.timePhase, 'debrief', 'past the plan the clock stays in the last phase');
  assert.equal(session.extend(15), 30);
  assert.equal(session.plan[4].toMs, 30 * MIN);
  const rep = session.end();
  assert.deepEqual([rep.missionId, rep.minutes, rep.xp, rep.answered, rep.independentPct, session.active], ['ch1', 30, 175, 2, 50, false]);
  assert.equal(rep.durationMs, 3 * MIN + 70000 + 20 * MIN);
  assert.deepEqual(rep.counts, { independent: 1, assisted: 1, revealed: 0, incorrect: 0, skipped: 0 });
  assert.deepEqual(rep.byTopic, { 'ar.ops': { section: 'AR', answered: 1, independent: 0, assisted: 1, revealed: 0, incorrect: 0, timeMs: 40000, independentPct: 0 }, 'mk.linear': { section: 'MK', answered: 1, independent: 1, assisted: 0, revealed: 0, incorrect: 0, timeMs: 30000, independentPct: 100 } });
  assert.deepEqual([rep.strengths, rep.weaknesses], [['mk.linear'], ['ar.ops']]);
  assert.equal(rep.mistakes.length, 1);
  const m = rep.mistakes[0];
  assert.deepEqual([m.topic, m.outcome, m.yourAnswers, m.question, m.prompt, m.answer, m.solution], ['ar.ops', 'assisted', [54], trucks, trucks.prompt, trucks.answer.display, trucks.solution]);
  assert.match(m.why.en, /total before anything was removed/);
  // the cold-recall quiz: 3-5 fresh questions, the missed template first, nothing the learner has just seen
  const rq = rep.reviewQuestions;
  assert.ok(rq.length >= 3 && rq.length <= 5, `review questions: ${rq.length}`);
  assert.equal(rq[0].templateId, 'ar.ops.loadout');
  const sigs = rq.map((x) => x.signature);
  assert.equal(new Set(sigs).size, sigs.length);
  assert.ok(!sigs.includes(trucks.signature) && !sigs.includes(eq.signature));
  assert.ok(rq.every((x) => ['ar.ops', 'mk.linear'].includes(x.topic) && math.validate(x).ok));
  assert.deepEqual([session.end(), session.report], [rep, rep], 'end() is idempotent');
  assert.equal(events.filter((e) => e.type === 'session:end').length, 1);
  // completing the mission makes the missed topic due; the profile is what the dashboard reads
  profile.missionDone('ch1', rep);
  assert.deepEqual([profile.xp, profile.missionState('ch1').bestXp, profile.section('AR').independentPct, profile.section('MK').independentPct, profile.topic('ar.ops').state], [175, 175, 0, 100, 'due']);
  // a new session starts clean; debrief answers are worth 40
  session.start({ minutes: 30 });
  assert.deepEqual([session.results.length, session.minutes, session.report, session.plan[0].toMs], [0, 30, null, 4 * MIN]);
  s = tutor.begin(rq[0], { mode: 'debrief' }); s.submit({ text: String(rq[0].answer.value) });
  assert.equal(s.finish().xp, 40);
  assert.equal(session.end().xp, 40);
});

test('session: the recall quiz never repeats a question the learner saw in the session', () => {
  const { ctx, session, math } = setup();
  // an engine with only four questions: A and B are used in the session, so the quiz may only contain C and D
  const pool = ['A', 'B', 'C', 'D'].map((sig) => ({ ...math.fixed.trucks(), id: 'fake#' + sig, signature: sig }));
  let i = 0;
  ctx.register('math', { ...math, generate: () => pool[i++ % pool.length], similar: () => pool[i++ % pool.length] });
  session.start({});
  session.add(res({ questionId: pool[0].id, signature: 'A', outcome: 'assisted', hintLevel: 1 }), pool[0]);
  session.add(res({ questionId: pool[1].id, signature: 'B' }), pool[1]);
  assert.deepEqual(session.end().reviewQuestions.map((x) => x.signature).sort(), ['C', 'D']);
  // without an engine the report still builds, with an empty quiz
  const bare = createContext({ params: { test: '1' } });
  const lone = createLearning(bare);
  lone.session.start({ missionId: 'x' });
  lone.session.add(res());
  assert.deepEqual([lone.session.end().reviewQuestions, lone.session.report.answered], [[], 1]);
  assert.equal(lone.tutor.begin(math.fixed.trucks()).submit({ text: '40' }).parseError.en, 'The question engine is not available.');
});
