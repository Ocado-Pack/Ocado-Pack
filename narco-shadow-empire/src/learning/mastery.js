// Learner-model rules, part 1: outcomes, credit, XP ("intel points"), mastery score and mastery states.
// Pure module (no DOM, no three.js, Node-importable). Every number the UI may want to explain is an
// exported constant, so a "how scoring works" panel can be generated instead of hand-written.
import { L } from '../core/ltext.js';

/** @typedef {{en:string, es:string}} LText */
/** @typedef {'independent'|'assisted'|'revealed'|'incorrect'|'skipped'} Outcome */
/** @typedef {'mission'|'drill'|'review'|'callback'|'debrief'|'exam'} Mode */
/**
 * One answered (or skipped) question, as recorded into the profile (contract 7.4).
 * Optional additions to the contract: `estSeconds` (needed by the slow-answer rule), `wrong[].why`
 * (kept as "the why text of the latest occurrence" of a repeated mistake) and, on results returned by
 * `tutor.finish()`, `xp`, `levelChange` and `needsReview`.
 * @typedef {object} QuestionResult
 * @property {string} questionId
 * @property {string} templateId
 * @property {string} topic
 * @property {'AR'|'MK'} section
 * @property {number} level                1..5 - the level of the QUESTION
 * @property {string} signature
 * @property {Mode} mode
 * @property {Outcome} outcome
 * @property {number} attempts             checked submissions, including the correct one
 * @property {number} hintLevel            0..4 (4 = the full solution was shown)
 * @property {{beginner?:boolean, formula?:boolean, similar?:boolean, visual?:boolean, why?:boolean, calculator?:boolean}} aids
 * @property {number} timeMs
 * @property {{value:any, tag?:string, why?:LText}[]} wrong
 * @property {number} ts
 * @property {number} [estSeconds]
 */

export const OUTCOMES = Object.freeze(['independent', 'assisted', 'revealed', 'incorrect', 'skipped']);
export const MODES = Object.freeze(['mission', 'drill', 'review', 'callback', 'debrief', 'exam']);

/** Tutor aids that can be recorded on a result. */
export const AID_KINDS = Object.freeze(['beginner', 'formula', 'similar', 'visual', 'why', 'calculator']);
/** Aids that cost independent credit. Asking "why is my answer incorrect" is free. */
export const PENALTY_AIDS = Object.freeze(['beginner', 'formula', 'similar', 'visual', 'calculator']);

export const LEVELS = Object.freeze({ min: 1, max: 5 });

/** Difficulty tiers (contract 7.2). `profile.tier()` returns one of these. */
export const TIERS = Object.freeze([
  Object.freeze({ level: 1, name: L('Recruit', 'Recluta') }),
  Object.freeze({ level: 2, name: L('Specialist', 'Especialista') }),
  Object.freeze({ level: 3, name: L('Operator', 'Operador') }),
  Object.freeze({ level: 4, name: L('Advanced Operator', 'Operador Avanzado') }),
  Object.freeze({ level: 5, name: L('ASVAB Readiness', 'Preparación ASVAB') }),
]);

/** XP = "intel points". */
export const XP = Object.freeze({
  independentBase: 100,                               // x (1 + levelBonus x (level - 1))
  levelBonus: 0.25,
  assistedByHint: Object.freeze([50, 50, 30, 15]),    // index = hint level 0..3
  revealed: 0,
  examCorrect: 60,
  debriefCorrect: 40,                                 // cold recall quiz in the debrief
});

/** Mastery can never exceed this fraction while the topic sits at that level. */
export const LEVEL_CAPS = Object.freeze({ 1: 0.45, 2: 0.6, 3: 0.75, 4: 0.9, 5: 1 });

export const MASTERY = Object.freeze({
  window: 12,          // outcomes remembered per topic
  decay: 0.85,         // recency weight: the newest outcome weighs 1, the one before 0.85, then 0.85^2 ...
  proficient: 0.6,
  mastered: 0.85,
});

export const MASTERY_STATES = Object.freeze(['new', 'learning', 'proficient', 'mastered', 'due']);

/** Compact codes used for the per-topic "last 12 outcomes" string (skipped answers are not evidence). */
export const OUTCOME_CODE = Object.freeze({ independent: 'i', assisted: 'a', revealed: 'r', incorrect: 'x' });
export const CODE_OUTCOME = Object.freeze({ i: 'independent', a: 'assisted', r: 'revealed', x: 'incorrect' });

/** The 20 fixed topic ids (contract 7.2) with fallback names, used when the question engine is absent. */
export const TOPICS = Object.freeze([
  Object.freeze({ id: 'ar.word', section: 'AR', name: L('Word problems', 'Problemas verbales') }),
  Object.freeze({ id: 'ar.ops', section: 'AR', name: L('Operations (+ − × ÷)', 'Operaciones (+ − × ÷)') }),
  Object.freeze({ id: 'ar.fracdec', section: 'AR', name: L('Fractions and decimals', 'Fracciones y decimales') }),
  Object.freeze({ id: 'ar.percent', section: 'AR', name: L('Percent and discounts', 'Porcentajes y descuentos') }),
  Object.freeze({ id: 'ar.ratio', section: 'AR', name: L('Ratios and proportions', 'Razones y proporciones') }),
  Object.freeze({ id: 'ar.drt', section: 'AR', name: L('Distance, rate and time', 'Distancia, velocidad y tiempo') }),
  Object.freeze({ id: 'ar.avg', section: 'AR', name: L('Averages', 'Promedios') }),
  Object.freeze({ id: 'ar.work', section: 'AR', name: L('Work rate', 'Ritmo de trabajo') }),
  Object.freeze({ id: 'ar.units', section: 'AR', name: L('Unit conversions', 'Conversión de unidades') }),
  Object.freeze({ id: 'ar.multi', section: 'AR', name: L('Multi-step reasoning', 'Razonamiento de varios pasos') }),
  Object.freeze({ id: 'mk.order', section: 'MK', name: L('Order of operations', 'Orden de las operaciones') }),
  Object.freeze({ id: 'mk.linear', section: 'MK', name: L('Linear equations', 'Ecuaciones lineales') }),
  Object.freeze({ id: 'mk.expr', section: 'MK', name: L('Algebraic expressions', 'Expresiones algebraicas') }),
  Object.freeze({ id: 'mk.exp', section: 'MK', name: L('Exponents and roots', 'Exponentes y raíces') }),
  Object.freeze({ id: 'mk.ineq', section: 'MK', name: L('Inequalities', 'Desigualdades') }),
  Object.freeze({ id: 'mk.geom', section: 'MK', name: L('Geometry', 'Geometría') }),
  Object.freeze({ id: 'mk.pav', section: 'MK', name: L('Perimeter, area and volume', 'Perímetro, área y volumen') }),
  Object.freeze({ id: 'mk.angles', section: 'MK', name: L('Angles and triangles', 'Ángulos y triángulos') }),
  Object.freeze({ id: 'mk.factor', section: 'MK', name: L('Factoring and polynomials', 'Factorización y polinomios') }),
  Object.freeze({ id: 'mk.props', section: 'MK', name: L('Properties, formulas and patterns', 'Propiedades, fórmulas y patrones') }),
]);
export const TOPIC_IDS = Object.freeze(TOPICS.map((t) => t.id));

/** 'AR' | 'MK' from a topic id ('ar.ops' -> 'AR'); null when the id carries no section prefix. */
export function sectionOf(topicId) {
  const s = String(topicId || '').toLowerCase();
  if (s.startsWith('ar.')) return 'AR';
  if (s.startsWith('mk.')) return 'MK';
  return null;
}

/**
 * Topic list for a context: the engine's (`ctx.math.topics`) when a real engine is registered, else the
 * fixed fallback list. Always returns [{id, section, name: LText}].
 */
export function topicList(ctx) {
  try {
    if (ctx && typeof ctx.has === 'function' && ctx.has('math') && Array.isArray(ctx.math.topics) && ctx.math.topics.length) {
      return ctx.math.topics
        .filter((t) => t && typeof t.id === 'string')
        .map((t) => ({ id: t.id, section: t.section === 'AR' || t.section === 'MK' ? t.section : sectionOf(t.id) || 'AR', name: t.name && typeof t.name.en === 'string' ? t.name : L(t.id) }));
    }
  } catch { /* fall through to the fixed list */ }
  return TOPICS.map((t) => ({ id: t.id, section: t.section, name: t.name }));
}

/** Bilingual display name of a topic (engine name, fallback name, or the id itself). */
export function topicName(ctx, topicId) {
  const hit = topicList(ctx).find((t) => t.id === topicId) || TOPICS.find((t) => t.id === topicId);
  return hit ? hit.name : L(String(topicId));
}

export function clampLevel(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return LEVELS.min;
  return n < LEVELS.min ? LEVELS.min : n > LEVELS.max ? LEVELS.max : n;
}

/** Bilingual name of a difficulty tier. */
export function tierName(level) {
  return TIERS[clampLevel(level) - 1].name;
}

/** true when any aid that costs independent credit was used. */
export function usedPenaltyAid(aids) {
  if (!aids || typeof aids !== 'object') return false;
  for (const k of PENALTY_AIDS) if (aids[k]) return true;
  return false;
}

/**
 * THE credit rule.
 *   independent = correct on the first attempt with no hint and no aid
 *   assisted    = correct after at least one wrong attempt, or after any hint / aid
 *   revealed    = the full solution was shown (hint level 4) - whatever happened afterwards
 *   incorrect / skipped = never solved (with / without a committed answer)
 * @param {{solved?:boolean, wrongCount?:number, hintLevel?:number, aids?:object, revealed?:boolean}} s
 * @returns {Outcome}
 */
export function classifyOutcome({ solved = true, wrongCount = 0, hintLevel = 0, aids = null, revealed = false } = {}) {
  if (revealed || hintLevel >= 4) return 'revealed';
  if (!solved) return wrongCount > 0 ? 'incorrect' : 'skipped';
  if (wrongCount === 0 && hintLevel === 0 && !usedPenaltyAid(aids)) return 'independent';
  return 'assisted';
}

/** Only independent results raise mastery. */
export function givesMasteryCredit(outcome) {
  return outcome === 'independent';
}

/**
 * Intel points for one result.
 *   independent 100 x (1 + 0.25 x (level - 1)) · assisted 50 / 50 / 30 / 15 by hint level 0..3 · revealed 0
 *   exam: 60 per correct answer · debrief recall quiz: 40 per correct answer (never more than 40).
 * @param {QuestionResult} result
 */
export function xpFor(result) {
  if (!result) return 0;
  const { outcome, mode } = result;
  const hint = Math.max(0, Math.round(Number(result.hintLevel) || 0));
  if (hint >= 4 || outcome === 'revealed') return XP.revealed;
  if (mode === 'exam') return outcome === 'independent' ? XP.examCorrect : 0;
  if (outcome === 'independent') {
    if (mode === 'debrief') return XP.debriefCorrect;
    return Math.round(XP.independentBase * (1 + XP.levelBonus * (clampLevel(result.level) - 1)));
  }
  if (outcome === 'assisted') {
    const base = XP.assistedByHint[Math.min(hint, XP.assistedByHint.length - 1)];
    return mode === 'debrief' ? Math.min(XP.debriefCorrect, base) : base;
  }
  return 0;
}

/**
 * Mastery 0..1 = recency-weighted independent rate over the remembered outcomes, scaled by the level cap.
 * @param {string|string[]} last   outcome codes, oldest -> newest ('i' independent, 'a', 'r', 'x')
 * @param {number} level
 */
export function masteryScore(last, level) {
  const n = last ? last.length : 0;
  if (!n) return 0;
  let num = 0;
  let den = 0;
  for (let k = 0; k < n; k++) {
    const w = Math.pow(MASTERY.decay, n - 1 - k);
    den += w;
    if (last[k] === 'i') num += w;
  }
  return (num / den) * LEVEL_CAPS[clampLevel(level)];
}

/** 'new' (never answered) / 'learning' / 'proficient' (>= 0.6) / 'mastered' (>= 0.85). 'due' is layered on by the profile. */
export function masteryState(attempts, mastery) {
  if (!attempts) return 'new';
  if (mastery >= MASTERY.mastered) return 'mastered';
  if (mastery >= MASTERY.proficient) return 'proficient';
  return 'learning';
}

/** Fresh per-topic statistics record (this is what is persisted under profile.data.topics[id]). */
export function createTopicStats(section) {
  return {
    section: section === 'MK' ? 'MK' : 'AR',
    attempts: 0,          // answered results (independent + assisted + revealed + incorrect)
    independent: 0,
    assisted: 0,
    revealed: 0,
    incorrect: 0,
    skipped: 0,           // exam questions left unanswered: counted, but not evidence either way
    timeMs: 0,            // total response time of independent + assisted results
    timeCount: 0,
    last: '',             // last 12 outcome codes, oldest -> newest
    level: LEVELS.min,
    promo: 0,             // promotion streak
    demo: 0,              // demotion streak
    lastSeen: 0,
    mistakes: {},         // tag -> {count, why: LText|null, ts}
    srs: null,            // see srs.js
  };
}

/**
 * Fold one result into a topic's counters (not the level and not the review schedule - see adaptive.js, srs.js).
 * @param {ReturnType<typeof createTopicStats>} stats
 * @param {QuestionResult} result
 * @param {number} now
 */
export function applyOutcome(stats, result, now) {
  const o = result.outcome;
  if (o === 'skipped') { stats.skipped += 1; return stats; }
  if (!OUTCOME_CODE[o]) return stats;                    // not an outcome: nothing to fold in
  stats.attempts += 1;
  stats[o] += 1;
  stats.lastSeen = now;
  if ((o === 'independent' || o === 'assisted') && result.timeMs > 0) {
    stats.timeMs += result.timeMs;
    stats.timeCount += 1;
  }
  stats.last = (stats.last + OUTCOME_CODE[o]).slice(-MASTERY.window);
  const seen = new Set();
  for (const w of result.wrong || []) {
    const tag = w && typeof w.tag === 'string' ? w.tag : '';
    if (!tag || seen.has(tag)) continue;          // one question = one occurrence of a misconception
    seen.add(tag);
    const m = stats.mistakes[tag] || (stats.mistakes[tag] = { count: 0, why: null, ts: 0 });
    m.count += 1;
    m.ts = now;
    if (w.why && typeof w.why.en === 'string') m.why = { en: w.why.en, es: typeof w.why.es === 'string' ? w.why.es : w.why.en };
  }
  return stats;
}

/** Whole percent (0..100) of part/total; 0 when total is 0. */
export function pct(part, total) {
  return total > 0 ? Math.round((100 * part) / total) : 0;
}
