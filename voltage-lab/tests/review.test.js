import test from 'node:test';
import assert from 'node:assert/strict';
import { newState, record, dueList, buildSession, weakest, pickQuestion, QUESTIONS, CONCEPTS, answerOf, estimateMinutes } from '../src/review.js';

const MIN = 60000; const H = 60 * MIN; const DAY = 24 * H;

test('schedule: help 10 min, then 1 h, 1 day, 3 days, 7 days', () => {
  const st = newState(); let now = 1e12;
  assert.equal(record(st, 'logic', { correct: true, hint: true }, now).due - now, 10 * MIN);
  now += 11 * MIN;
  assert.equal(record(st, 'logic', { correct: true }, now).due - now, H);
  now += 2 * H;
  assert.equal(record(st, 'logic', { correct: true }, now).due - now, DAY);
  now += 2 * DAY;
  assert.equal(record(st, 'logic', { correct: true }, now).due - now, 3 * DAY);
  now += 4 * DAY;
  assert.equal(record(st, 'logic', { correct: true }, now).due - now, 7 * DAY);
  now += 8 * DAY;
  assert.equal(record(st, 'logic', { correct: true }, now).due - now, 7 * DAY);
});

test('an incorrect answer is due again at once and resets progress', () => {
  const st = newState(); const now = 1e12;
  record(st, 'hold', { correct: true }, now); record(st, 'hold', { correct: true }, now + 2 * H);
  const r = record(st, 'hold', { correct: false, conf: 'low' }, now + 3 * DAY);
  assert.equal(r.stage, 0); assert.equal(r.due, now + 3 * DAY); assert.equal(r.priority, false);
});

test('repeating a revealed answer straight away is not counted as mastery', () => {
  const st = newState(); const now = 1e12;
  record(st, 'coil', { correct: false }, now);
  const r = record(st, 'coil', { correct: true }, now + 2 * MIN);
  assert.equal(r.outcome, 'helped'); assert.equal(r.stage, 0); assert.equal(r.due - (now + 2 * MIN), 10 * MIN);
  const r2 = record(st, 'coil', { correct: true }, now + 30 * MIN);
  assert.equal(r2.outcome, 'solo'); assert.equal(r2.stage, 1);
});

test('confidently incorrect concepts come first', () => {
  const st = newState(); const now = 1e12;
  CONCEPTS.forEach((c) => record(st, c.id, { correct: true }, now - 2 * H));
  record(st, 'diag', { correct: false, conf: 'low' }, now - 5 * MIN);
  record(st, 'nonc', { correct: false, conf: 'high' }, now - MIN);
  const due = dueList(st, now);
  assert.equal(due[0], 'nonc');
  assert.ok(due.includes('diag'));
});

test('sessions stay manageable and survive a long absence', () => {
  const st = newState(); const now = 1e12;
  CONCEPTS.forEach((c) => record(st, c.id, { correct: true }, now));
  assert.equal(dueList(st, now + 30 * MIN).length, 0);
  const saved = JSON.parse(JSON.stringify(st)); // what local storage would hold
  const later = now + 30 * DAY;
  assert.equal(dueList(saved, later).length, CONCEPTS.length);
  const five = buildSession(saved, later, 'five');
  assert.ok(five.length <= 7 && five.length >= 3);
  assert.ok(estimateMinutes(saved, five.length) <= 5);
  const all = buildSession(saved, later, 'interview');
  assert.ok(CONCEPTS.every((c) => all.includes(c.id)));
  assert.equal(weakest(newState()).length, CONCEPTS.length);
});

test('question bank: every concept has variants, a retry gets a different example', () => {
  const st = newState();
  CONCEPTS.forEach((c) => {
    const pool = QUESTIONS.filter((q) => q.c === c.id);
    assert.ok(pool.length >= 3, c.id);
    const a = pickQuestion(st, c.id, []); const b = pickQuestion(st, c.id, [a.id]);
    assert.notEqual(a.id, b.id);
  });
  QUESTIONS.forEach((q) => assert.ok(q.ch.some(([k]) => k === answerOf(q)), q.id));
});

test('circuit questions take their answers from the simulated circuit', () => {
  const by = (id) => QUESTIONS.find((q) => q.id === id);
  assert.equal(answerOf(by('log1')), 'off'); assert.equal(answerOf(by('log2')), 'on');
  assert.equal(answerOf(by('log3')), 'on'); assert.equal(answerOf(by('log4')), 'off');
  assert.equal(answerOf(by('hold1')), 'on'); assert.equal(answerOf(by('hold2')), 'off'); assert.equal(answerOf(by('hold4')), 'off');
});
