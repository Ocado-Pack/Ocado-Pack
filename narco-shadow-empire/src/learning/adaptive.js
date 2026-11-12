// Learner-model rules, part 2: adaptive difficulty. One level (1..5) per topic. Pure module.
//
//   +1 level (max 5) after 3 consecutive independent results at the current level.
//        A result slower than 2.5 x question.estSeconds does not add to the streak, but does not reset it.
//   -1 level (min 1) after 2 consecutive results that are revealed, or assisted with hint level >= 2.
//
// "At the current level" is taken literally: the level of the QUESTION is compared with the level of the topic.
//   · an independent answer to a question BELOW the topic's level is no evidence for a promotion (ignored);
//   · a miss on a question ABOVE the topic's level is no evidence for a demotion (ignored).
// Unanswered exam questions (outcome 'skipped') never change anything.
import { LEVELS, clampLevel } from './mastery.js';

export const ADAPTIVE = Object.freeze({
  minLevel: LEVELS.min,
  maxLevel: LEVELS.max,
  startLevel: LEVELS.min,
  promoteAfter: 3,          // consecutive independent results
  demoteAfter: 2,           // consecutive struggling results
  slowFactor: 2.5,          // x question.estSeconds
  struggleHintLevel: 2,     // assisted with at least this hint level counts as struggling
});

/** A result slower than 2.5 x the question's estimated time. Results without `estSeconds` are never slow. */
export function isSlow(result) {
  const est = Number(result && result.estSeconds);
  const t = Number(result && result.timeMs);
  return est > 0 && t > 0 && t > ADAPTIVE.slowFactor * est * 1000;
}

/** Revealed, or assisted with hint level >= 2: the results that count towards a demotion. */
export function isStruggle(result) {
  if (!result) return false;
  if (result.outcome === 'revealed') return true;
  return result.outcome === 'assisted' && (Number(result.hintLevel) || 0) >= ADAPTIVE.struggleHintLevel;
}

/**
 * Update a topic's level and streaks for one result. Mutates `stats` ({level, promo, demo}).
 * @param {{level:number, promo:number, demo:number}} stats
 * @param {import('./mastery.js').QuestionResult} result
 * @returns {{from:number, to:number}|null} the level change, if any
 */
export function applyAdaptive(stats, result) {
  const level = clampLevel(stats.level);
  stats.level = level;
  stats.promo = Math.max(0, stats.promo | 0);
  stats.demo = Math.max(0, stats.demo | 0);
  const o = result.outcome;
  if (o === 'skipped') return null;
  const qLevel = Number.isFinite(result.level) ? clampLevel(result.level) : level;

  if (o === 'independent') {
    if (qLevel < level) return null;
    stats.demo = 0;
    if (!isSlow(result)) stats.promo += 1;
  } else {
    if (qLevel > level) return null;
    stats.promo = 0;
    if (isStruggle(result)) stats.demo += 1;
    else if (o === 'assisted') stats.demo = 0;      // solved with light help: the run of struggles is broken
    // 'incorrect' (exam, abandoned problem) is not a listed demotion trigger and not a recovery: demo unchanged
  }

  if (stats.promo >= ADAPTIVE.promoteAfter) {
    stats.promo = 0;
    stats.demo = 0;
    if (level < ADAPTIVE.maxLevel) { stats.level = level + 1; return { from: level, to: level + 1 }; }
  } else if (stats.demo >= ADAPTIVE.demoteAfter) {
    stats.promo = 0;
    stats.demo = 0;
    if (level > ADAPTIVE.minLevel) { stats.level = level - 1; return { from: level, to: level - 1 }; }
  }
  return null;
}
