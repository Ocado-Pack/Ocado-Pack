// The session director (ctx.session, contract 7.6): the 15-minute structure and the after-action report.
// Pure module; the clock is injected. Full Questions are kept in memory only (never persisted) so the debrief
// can show solutions.
import { L } from '../core/ltext.js';
import { pct } from './mastery.js';

/** The plan of a 15-minute session, in minutes. Longer sessions scale every phase proportionally. */
export const PHASES = Object.freeze([
  Object.freeze({ id: 'story', name: L('Story', 'Historia'), from: 0, to: 2 }),
  Object.freeze({ id: 'ar', name: L('Arithmetic Reasoning', 'Razonamiento Aritmético'), from: 2, to: 5 }),
  Object.freeze({ id: 'mk', name: L('Mathematics Knowledge', 'Conocimiento Matemático'), from: 5, to: 8 }),
  Object.freeze({ id: 'combined', name: L('Combined operation', 'Operación combinada'), from: 8, to: 12 }),
  Object.freeze({ id: 'debrief', name: L('Debrief', 'Informe final'), from: 12, to: 15 }),
]);
export const SESSION = Object.freeze({ baseMinutes: 15, reviewMin: 3, reviewMax: 5, strengthPct: 80, weaknessPct: 50 });
const MIN = 60000;

export const makePlan = (minutes) => PHASES.map((p) => ({ id: p.id, name: p.name, fromMs: Math.round((p.from * minutes * MIN) / SESSION.baseMinutes), toMs: Math.round((p.to * minutes * MIN) / SESSION.baseMinutes) }));

/** @param {object} ctx  @param {{now?: () => number}} [opts] */
export function createSession(ctx, { now = Date.now } = {}) {
  const has = (name) => !!ctx && typeof ctx.has === 'function' && ctx.has(name);
  const emit = (type, payload) => { if (ctx && ctx.events) ctx.events.emit(type, payload); };
  let active = false, missionId = null, minutes = SESSION.baseMinutes, plan = makePlan(minutes), phase = 'story';
  let startedAt = 0, pausedAt = null, pausedTotal = 0, finalMs = 0, report = null;
  /** @type {object[]} */ let results = [];
  /** @type {Map<string, object>} */ const questions = new Map();

  const elapsed = () => (active ? (pausedAt === null ? now() : pausedAt) - startedAt - pausedTotal : finalMs);

  /** 3-5 fresh questions for the cold-recall quiz: what was missed here first, then due topics, then this session's topics. */
  function reviewQuestions() {
    if (!has('math')) return [];
    const math = ctx.math, out = [], seen = new Set(results.map((r) => r.signature).filter(Boolean));
    const levelOf = (topic, fallback = 1) => (has('profile') ? ctx.profile.levelFor(topic) : fallback);
    const add = (make) => {
      if (out.length >= SESSION.reviewMax) return;
      try { const qn = make(); if (qn && !seen.has(qn.signature)) { seen.add(qn.signature); out.push(qn); } } catch { /* a topic without templates is skipped */ }
    };
    const doneTemplates = new Set();
    for (const r of results) {
      if (r.outcome === 'independent' || r.outcome === 'skipped' || doneTemplates.has(r.templateId)) continue;
      doneTemplates.add(r.templateId);
      const original = questions.get(r.questionId);
      add(() => (original ? math.similar(original) : math.generate({ topic: r.topic, level: r.level, avoid: seen })));
    }
    if (has('profile')) for (const d of ctx.profile.due()) if (out.length < SESSION.reviewMin) add(() => math.generate({ topic: d.topicId, level: levelOf(d.topicId), avoid: seen }));
    const topics = [...new Set(results.map((r) => r.topic))];
    for (let i = 0; topics.length && out.length < SESSION.reviewMin && i < topics.length * 4; i++) { const tp = topics[i % topics.length]; add(() => math.generate({ topic: tp, level: levelOf(tp), avoid: seen })); }
    return out;
  }

  const api = {
    get active() { return active; },
    get missionId() { return missionId; },
    get minutes() { return minutes; },
    get plan() { return plan; },
    /** the phase the mission says we are in (set with setPhase) */
    get phase() { return phase; },
    /** the phase the clock says we should be in */
    get timePhase() { const t = elapsed(); const p = plan.find((x) => t < x.toMs); return (p || plan[plan.length - 1]).id; },
    get elapsedMs() { return elapsed(); },
    get remainingMs() { return Math.max(0, minutes * MIN - elapsed()); },
    get paused() { return pausedAt !== null; },
    get results() { return results; },
    /** the report of the session that ended last, or null */
    get report() { return report; },

    start({ missionId: id = null, minutes: m } = {}) {
      const want = Number(m) || Number(ctx && ctx.settings && ctx.settings.get('sessionMinutes')) || SESSION.baseMinutes;
      minutes = Math.max(1, want); plan = makePlan(minutes); missionId = id; phase = 'story';
      startedAt = now(); pausedAt = null; pausedTotal = 0; finalMs = 0; results = []; questions.clear(); report = null; active = true;
      emit('session:phase', { phase, missionId });
      return api;
    },
    setPhase(id) {
      if (!active || id === phase || !PHASES.some((p) => p.id === id)) return phase;
      phase = id;
      emit('session:phase', { phase, missionId });
      return phase;
    },
    pause() { if (active && pausedAt === null) pausedAt = now(); },
    resume() { if (active && pausedAt !== null) { pausedTotal += now() - pausedAt; pausedAt = null; } },
    /** add minutes to a running session (the plan stretches proportionally) */
    extend(extra) { if (active && Number(extra) > 0) { minutes += Number(extra); plan = makePlan(minutes); } return minutes; },
    /** Add one QuestionResult; pass the full Question so the debrief can show its solution. */
    add(result, question) {
      if (!active || !result) return;
      results.push(result);
      if (question && result.questionId) questions.set(result.questionId, question);
    },
    /** the full Question behind a result of this session (memory only) */
    question: (questionId) => questions.get(questionId) || null,

    /** End the session and build the after-action report. */
    end() {
      if (!active) return report;
      finalMs = elapsed(); active = false; pausedAt = null;
      const byTopic = {}, counts = { independent: 0, assisted: 0, revealed: 0, incorrect: 0, skipped: 0 };
      let xp = 0;
      for (const r of results) {
        counts[r.outcome] = (counts[r.outcome] || 0) + 1;
        xp += r.xp || 0;
        if (r.outcome === 'skipped') continue;
        const t = byTopic[r.topic] || (byTopic[r.topic] = { section: r.section, answered: 0, independent: 0, assisted: 0, revealed: 0, incorrect: 0, timeMs: 0, independentPct: 0 });
        t.answered += 1; t[r.outcome] += 1; t.timeMs += r.timeMs || 0;
      }
      for (const t of Object.values(byTopic)) t.independentPct = pct(t.independent, t.answered);
      const ids = Object.keys(byTopic);
      const mistakes = results.filter((r) => r.wrong && r.wrong.length).map((r) => {
        const qn = questions.get(r.questionId) || null, explained = [...r.wrong].reverse().find((w) => w.why);
        return { questionId: r.questionId, topic: r.topic, outcome: r.outcome, question: qn, prompt: qn ? qn.prompt : null, yourAnswers: r.wrong.map((w) => w.value), why: explained ? explained.why : null, answer: qn ? qn.answer.display : null, solution: qn ? qn.solution : null };
      });
      report = {
        missionId, durationMs: finalMs, minutes, results, byTopic, counts, xp,
        answered: results.length - counts.skipped, independentPct: pct(counts.independent, results.length - counts.skipped),
        strengths: ids.filter((id) => byTopic[id].independentPct >= SESSION.strengthPct),
        weaknesses: ids.filter((id) => byTopic[id].revealed > 0 || byTopic[id].independentPct < SESSION.weaknessPct),
        mistakes, reviewQuestions: reviewQuestions(),
      };
      emit('session:end', { report });
      return report;
    },
  };
  return api;
}
