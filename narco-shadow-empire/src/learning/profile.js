// The persistent learner profile (ctx.profile, contract 7.4). Pure module: storage and clock are injected.
// record(result) is the single entry point; everything the dashboard shows is derived from the stored data.
import { L } from '../core/ltext.js';
import { dayKey, daysBetween } from '../core/util.js';
import { OUTCOMES, MODES, MASTERY, createTopicStats, applyOutcome, masteryScore, masteryState, xpFor, usedPenaltyAid, clampLevel, tierName, sectionOf, topicList, topicName, pct } from './mastery.js';
import { applyAdaptive } from './adaptive.js';
import { applySrs, isDue, missionTick, dueQueue, DAY_MS } from './srs.js';

export const PROFILE_VERSION = 1;
export const PROFILE_KEY = 'profile';
export const LIMITS = Object.freeze({
  history: 500,            // QuestionResults kept (compact)
  signatures: 300,         // recent question signatures kept for duplicate avoidance
  exams: 30,               // exam reports kept (compact)
  repeatedMistake: 2,      // a misconception tag seen this often counts as a repeated mistake
  reviewAtDue: 3,          // this many due topics -> recommend a review
  examAfterAnswers: 30,    // recommend a practice exam once this many questions were answered ...
  examEveryDays: 3,        // ... and no exam was taken in the last N days
});
const GENERIC_WHY = L('This mistake keeps coming back. Slow down on this step and check it before you answer.', 'Este error se repite. Ve más despacio en este paso y revísalo antes de responder.');
const NO_MISSION = Object.freeze({ completed: false, completedAt: 0, bestXp: 0, attempts: 0 });

const fresh = (now) => ({ v: PROFILE_VERSION, createdAt: now, xp: 0, topics: {}, history: [], signatures: [], streak: { current: 0, best: 0, lastDay: null }, missions: {}, missionCount: 0, exams: [] });
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const whole = (v) => Math.max(0, Math.round(Number(v) || 0));

/** Validate and upgrade stored / imported data. Returns a clean profile object, or null when it is not one. */
export function migrate(raw, now) {
  if (!isObj(raw) || !Number.isInteger(raw.v) || raw.v < 1 || raw.v > PROFILE_VERSION || (raw.topics !== undefined && !isObj(raw.topics))) return null;
  const d = fresh(now);
  if (Number.isFinite(raw.createdAt)) d.createdAt = raw.createdAt;
  d.xp = whole(raw.xp);
  for (const [id, st] of Object.entries(raw.topics || {})) {
    if (!isObj(st)) continue;
    const base = createTopicStats(st.section || sectionOf(id));
    for (const k of Object.keys(base)) if (st[k] !== undefined && st[k] !== null && typeof st[k] === typeof base[k] && !Array.isArray(st[k])) base[k] = st[k];
    base.level = clampLevel(base.level);
    base.last = base.last.replace(/[^iarx]/g, '').slice(-MASTERY.window);
    if (base.srs && !(Number.isFinite(base.srs.dueAt) && Number.isInteger(base.srs.box))) base.srs = null;
    d.topics[id] = base;
  }
  if (Array.isArray(raw.history)) d.history = raw.history.filter(isObj).slice(-LIMITS.history);
  if (Array.isArray(raw.signatures)) d.signatures = raw.signatures.filter((s) => typeof s === 'string').slice(-LIMITS.signatures);
  if (isObj(raw.streak)) d.streak = { current: whole(raw.streak.current), best: whole(raw.streak.best), lastDay: /^\d{4}-\d{2}-\d{2}$/.test(raw.streak.lastDay || '') ? raw.streak.lastDay : null };
  if (isObj(raw.missions)) for (const [id, m] of Object.entries(raw.missions)) if (isObj(m)) d.missions[id] = { completed: !!m.completed, completedAt: whole(m.completedAt), bestXp: whole(m.bestXp), attempts: whole(m.attempts) };
  d.missionCount = whole(raw.missionCount);
  if (Array.isArray(raw.exams)) d.exams = raw.exams.filter(isObj).slice(-LIMITS.exams);
  return d;
}

/**
 * @param {object} ctx        game context (uses ctx.storage, ctx.events, ctx.has('math'|'campaign'))
 * @param {{now?: () => number}} [opts]   injectable clock (ms) so tests can travel in time
 */
export function createProfile(ctx, { now = Date.now } = {}) {
  const mem = new Map();
  const storage = ctx && ctx.storage ? ctx.storage : { get: (k, f = null) => (mem.has(k) ? JSON.parse(mem.get(k)) : f), set: (k, v) => { mem.set(k, JSON.stringify(v)); return false; } };
  const emit = (type, payload) => { if (ctx && ctx.events) ctx.events.emit(type, payload); };
  const has = (name) => !!ctx && typeof ctx.has === 'function' && ctx.has(name);
  let data = fresh(now());

  const save = () => { try { return storage.set(PROFILE_KEY, data); } catch { return false; } };
  const load = () => { let raw = null; try { raw = storage.get(PROFILE_KEY, null); } catch { raw = null; } data = migrate(raw, now()) || fresh(now()); return api; };

  /** Clean copy of a result, with the credit rule enforced: nobody can record credit the learner did not earn. */
  function normalize(x) {
    if (!isObj(x) || typeof x.topic !== 'string' || !x.topic || !OUTCOMES.includes(x.outcome)) return null;
    const hintLevel = Math.min(4, whole(x.hintLevel)), attempts = whole(x.attempts), aids = isObj(x.aids) ? { ...x.aids } : {};
    const mode = MODES.includes(x.mode) ? x.mode : 'mission';
    let outcome = x.outcome;
    if (outcome === 'independent' && (hintLevel > 0 || attempts > 1 || usedPenaltyAid(aids))) outcome = 'assisted';
    if ((outcome === 'independent' || outcome === 'assisted') && hintLevel >= 4) outcome = 'revealed';
    if (mode === 'exam' && (outcome === 'assisted' || outcome === 'revealed')) outcome = 'incorrect';   // an exam has no hints
    const r = {
      questionId: String(x.questionId || ''), templateId: String(x.templateId || ''), topic: x.topic,
      section: x.section === 'AR' || x.section === 'MK' ? x.section : sectionOf(x.topic) || 'AR',
      level: clampLevel(x.level), signature: String(x.signature || ''), mode, outcome, attempts, hintLevel, aids,
      timeMs: whole(x.timeMs), wrong: Array.isArray(x.wrong) ? x.wrong.filter(isObj).map((w) => ({ value: w.value, tag: w.tag, why: w.why })) : [],
      ts: Number.isFinite(x.ts) ? x.ts : now(),
    };
    if (Number(x.estSeconds) > 0) r.estSeconds = Number(x.estSeconds);
    return r;
  }

  function touchStreak(t) {
    const s = data.streak, day = dayKey(t);
    if (s.lastDay === day) return;
    s.current = s.lastDay && daysBetween(s.lastDay, day) === 1 ? s.current + 1 : 1;
    s.best = Math.max(s.best, s.current);
    s.lastDay = day;
  }

  function topicView(id) {
    const st = data.topics[id];
    if (!st) return { topicId: id, section: sectionOf(id) || 'AR', attempts: 0, independent: 0, assisted: 0, revealed: 0, incorrect: 0, independentPct: 0, avgTimeMs: 0, level: 1, mastery: 0, state: 'new', due: false, lastSeen: 0 };
    const mastery = masteryScore(st.last, st.level), due = isDue(st.srs, now(), data.missionCount);
    return {
      topicId: id, section: st.section, attempts: st.attempts, independent: st.independent, assisted: st.assisted, revealed: st.revealed, incorrect: st.incorrect,
      independentPct: pct(st.independent, st.attempts), avgTimeMs: st.timeCount ? Math.round(st.timeMs / st.timeCount) : 0,
      level: st.level, mastery, state: due ? 'due' : masteryState(st.attempts, mastery), due, lastSeen: st.lastSeen,
    };
  }

  function totals(section) {
    const t = { answered: 0, independent: 0, assisted: 0, revealed: 0, incorrect: 0, timeMs: 0, timeCount: 0 };
    for (const st of Object.values(data.topics)) {
      if (section && st.section !== section) continue;
      t.answered += st.attempts; t.independent += st.independent; t.assisted += st.assisted; t.revealed += st.revealed; t.incorrect += st.incorrect; t.timeMs += st.timeMs; t.timeCount += st.timeCount;
    }
    return { answered: t.answered, independent: t.independent, assisted: t.assisted, revealed: t.revealed, incorrect: t.incorrect, independentPct: pct(t.independent, t.answered), avgTimeMs: t.timeCount ? Math.round(t.timeMs / t.timeCount) : 0 };
  }

  const api = {
    /** the persisted plain object */
    get data() { return data; },
    get xp() { return data.xp; },
    get missionCount() { return data.missionCount; },
    get exams() { return data.exams; },
    save, load,

    /**
     * THE entry point: fold one QuestionResult into the profile.
     * @returns {{xp:number, levelChange?:{topic:string, from:number, to:number}, srs:object|null, result:object}|null} null for a malformed result
     */
    record(input) {
      const r = normalize(input);
      if (!r) return null;
      const t = now();
      const st = data.topics[r.topic] || (data.topics[r.topic] = createTopicStats(r.section));
      applyOutcome(st, r, t);
      const change = applyAdaptive(st, r);
      st.srs = applySrs(st.srs, r, { now: t, missionCount: data.missionCount });
      const xp = xpFor(r);
      data.xp += xp;
      data.history.push({ questionId: r.questionId, templateId: r.templateId, topic: r.topic, section: r.section, level: r.level, mode: r.mode, outcome: r.outcome, attempts: r.attempts, hintLevel: r.hintLevel, timeMs: r.timeMs, ts: r.ts, xp, tags: r.wrong.map((w) => w.tag).filter(Boolean) });
      if (data.history.length > LIMITS.history) data.history.splice(0, data.history.length - LIMITS.history);
      if (r.signature) { data.signatures.push(r.signature); if (data.signatures.length > LIMITS.signatures) data.signatures.splice(0, data.signatures.length - LIMITS.signatures); }
      if (r.outcome !== 'skipped') touchStreak(t);
      save();
      const levelChange = change ? { topic: r.topic, from: change.from, to: change.to } : undefined;
      emit('learning:recorded', { result: r, xp, levelChange });
      if (levelChange) emit('learning:level', levelChange);
      return { xp, levelChange, srs: st.srs ? { box: st.srs.box, dueAt: st.srs.dueAt, dueMission: st.srs.dueMission } : null, result: r };
    },

    topic: topicView,
    section: (id) => totals(id === 'MK' ? 'MK' : 'AR'),
    overall: () => totals(null),
    levelFor: (topicId) => (data.topics[topicId] ? data.topics[topicId].level : 1),
    /** current difficulty tier: the rounded mean level of the practised topics (1 when none) */
    tier() {
      const lv = Object.values(data.topics).filter((st) => st.attempts > 0).map((st) => st.level);
      const level = lv.length ? clampLevel(lv.reduce((a, b) => a + b, 0) / lv.length) : 1;
      return { level, name: tierName(level) };
    },
    /** spaced-repetition queue, most overdue first */
    due(at = now()) { return dueQueue(data.topics, at, data.missionCount).map((d) => ({ topicId: d.topicId, ...(d.templateId ? { templateId: d.templateId } : {}), reason: d.reason, dueAt: d.dueAt })); },
    /** misconceptions seen at least twice, most frequent first */
    mistakes() {
      const out = [];
      for (const [topicId, st] of Object.entries(data.topics)) for (const [tag, m] of Object.entries(st.mistakes)) if (m.count >= LIMITS.repeatedMistake) out.push({ tag, topicId, count: m.count, why: m.why || GENERIC_WHY, ts: m.ts });
      return out.sort((a, b) => b.count - a.count || b.ts - a.ts || (a.tag < b.tag ? -1 : 1));
    },
    streak() {
      const s = data.streak, gap = s.lastDay ? daysBetween(s.lastDay, dayKey(now())) : null;
      return { current: gap === 0 || gap === 1 ? s.current : 0, best: s.best, practicedToday: gap === 0 };
    },
    skillMap: () => topicList(ctx).map((tp) => { const v = topicView(tp.id); return { topicId: tp.id, section: tp.section, name: tp.name, mastery: v.mastery, level: v.level, state: v.state }; }),
    /** what to do next: review (3+ topics due) -> next mission -> practice exam -> drill on the weakest topic */
    recommend() {
      const due = api.due();
      if (due.length >= LIMITS.reviewAtDue) return { kind: 'review', topicId: due[0].topicId, reason: L(`${due.length} topics are due for review. A short review now keeps them from fading.`, `${due.length} temas están pendientes de repaso. Un repaso corto ahora evita que se olviden.`) };
      let next = null;
      try { next = has('campaign') ? ctx.campaign.next() : null; } catch { next = null; }
      if (next && next.id) return { kind: 'mission', id: next.id, reason: L('Your next mission is ready.', 'Tu próxima misión está lista.') };
      const lastExam = data.exams.length ? data.exams[data.exams.length - 1].ts || 0 : 0;
      if (totals(null).answered >= LIMITS.examAfterAnswers && now() - lastExam >= LIMITS.examEveryDays * DAY_MS) return { kind: 'exam', reason: L('You have answered enough questions to try a timed practice exam.', 'Ya respondiste suficientes preguntas para intentar un examen de práctica cronometrado.') };
      if (due.length) return { kind: 'review', topicId: due[0].topicId, reason: L('One of your topics is due for review.', 'Uno de tus temas está pendiente de repaso.') };
      const weak = Object.keys(data.topics).map(topicView).filter((v) => v.attempts > 0).sort((a, b) => a.mastery - b.mastery || a.independentPct - b.independentPct || (a.topicId < b.topicId ? -1 : 1))[0];
      if (weak) { const nm = topicName(ctx, weak.topicId); return { kind: 'drill', topicId: weak.topicId, reason: L(`Drill your weakest topic: ${nm.en}.`, `Practica tu tema más débil: ${nm.es}.`) }; }
      return { kind: 'drill', reason: L('Start with a short drill to set your level.', 'Empieza con una práctica corta para fijar tu nivel.') };
    },

    /** A completed mission: stored, and it makes "due after the next mission" tick. */
    missionDone(id, report = {}) {
      const t = now(), prev = data.missions[id] || NO_MISSION;
      data.missions[id] = { completed: true, completedAt: t, bestXp: Math.max(prev.bestXp, whole(report && report.xp)), attempts: prev.attempts + 1 };
      data.missionCount += 1;
      for (const st of Object.values(data.topics)) missionTick(st.srs, t, data.missionCount);
      save();
      return { ...data.missions[id] };
    },
    missionState: (id) => ({ ...(data.missions[id] || NO_MISSION) }),
    /** store a compact exam report (never an official score: percentages and pacing only) */
    addExam(report) {
      if (!isObj(report)) return null;
      const entry = { ts: Number.isFinite(report.ts) ? report.ts : now(), overallPct: whole(report.overallPct), band: report.band && report.band.id ? report.band.id : null, sections: (Array.isArray(report.sections) ? report.sections : []).map((s) => ({ section: s.section, correct: whole(s.correct), total: whole(s.total), pct: whole(s.pct), timeUsedMs: whole(s.timeUsedMs) })) };
      data.exams.push(entry);
      if (data.exams.length > LIMITS.exams) data.exams.splice(0, data.exams.length - LIMITS.exams);
      save();
      return entry;
    },
    recentSignatures: () => new Set(data.signatures),

    export: () => JSON.stringify({ app: 'narco-shadow-empire', kind: 'profile', exportedAt: now(), data }),
    /** Replace the profile with exported data. Returns false (and changes nothing) for anything that is not a profile. */
    import(json) {
      let parsed;
      try { parsed = typeof json === 'string' ? JSON.parse(json) : json; } catch { return false; }
      const next = migrate(isObj(parsed) && isObj(parsed.data) ? parsed.data : parsed, now());
      if (!next) return false;
      data = next; save();
      emit('learning:reset', { imported: true });
      return true;
    },
    reset() { data = fresh(now()); save(); emit('learning:reset', { imported: false }); },
  };
  return load();
}
