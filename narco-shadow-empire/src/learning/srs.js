// Learner-model rules, part 3: spaced repetition. One Leitner-style record per topic. Pure module.
//
//   · A non-independent result (assisted, revealed, incorrect) puts the topic in box 0: due after the NEXT
//     completed mission (dueMission = missionCount + 1) and at now + 1 day, whichever comes first. The
//     template that was missed is remembered so the review can target it.
//   · An independent result WHILE DUE moves the topic up one box. Intervals by box 1..5: 1, 3, 7, 14, 30 days.
//     An independent result while not due changes nothing (reviewing early does not skip the wait).
//   · The first ever result of a topic, when independent, starts it in box 1 (first review in 1 day).
//   · Unanswered exam questions (outcome 'skipped') are not evidence: nothing changes.

export const DAY_MS = 86400000;

export const SRS = Object.freeze({
  intervalsDays: Object.freeze([1, 3, 7, 14, 30]),   // box 1..5
  missDelayDays: 1,                                   // box 0: due again at now + 1 day ...
  missAfterMissions: 1,                               // ... or after the next completed mission
  maxBox: 5,
});

/**
 * @typedef {object} SrsState
 * @property {number} box                 0 = missed · 1..5 = spaced
 * @property {number} dueAt               ms timestamp
 * @property {number|null} dueMission     box 0 only: due once profile.missionCount reaches this
 * @property {string|null} templateId     the last template that was missed
 * @property {number} at                  when this state was written
 */

/** Interval (ms) that follows a success INTO `box` (1..5). */
export function intervalMs(box) {
  const i = Math.min(SRS.maxBox, Math.max(1, box | 0)) - 1;
  return SRS.intervalsDays[i] * DAY_MS;
}

/**
 * @param {SrsState|null} srs
 * @param {number} now
 * @param {number} [missionCount]
 */
export function isDue(srs, now, missionCount = 0) {
  if (!srs) return false;
  if (now >= srs.dueAt) return true;
  return srs.box === 0 && Number.isInteger(srs.dueMission) && missionCount >= srs.dueMission;
}

/**
 * Next review state of a topic after one result. Returns a NEW state (or the same object when unchanged).
 * @param {SrsState|null} srs
 * @param {{outcome:string, templateId?:string}} result
 * @param {{now:number, missionCount?:number}} env
 * @returns {SrsState|null}
 */
export function applySrs(srs, result, { now, missionCount = 0 }) {
  const o = result.outcome;
  if (o === 'skipped') return srs || null;
  if (o !== 'independent') {
    return {
      box: 0,
      dueAt: now + SRS.missDelayDays * DAY_MS,
      dueMission: missionCount + SRS.missAfterMissions,
      templateId: result.templateId || (srs && srs.templateId) || null,
      at: now,
    };
  }
  if (!srs) return { box: 1, dueAt: now + intervalMs(1), dueMission: null, templateId: null, at: now };
  if (!isDue(srs, now, missionCount)) return srs;
  const box = Math.min(SRS.maxBox, srs.box + 1);
  return { box, dueAt: now + intervalMs(box), dueMission: null, templateId: srs.templateId || null, at: now };
}

/**
 * Called when a mission is completed: a missed topic whose mission condition is now met becomes due at this
 * moment (so "most overdue first" has a real timestamp to sort by). Mutates and returns `srs`.
 */
export function missionTick(srs, now, missionCount) {
  if (srs && srs.box === 0 && Number.isInteger(srs.dueMission) && missionCount >= srs.dueMission && srs.dueAt > now) srs.dueAt = now;
  return srs;
}

/**
 * The due queue: most overdue first; on a tie missed topics come before spaced ones, then by topic id.
 * @param {Record<string, {srs: SrsState|null}>} topics
 * @param {number} now
 * @param {number} [missionCount]
 * @returns {{topicId:string, templateId?:string, reason:'missed'|'spaced', dueAt:number, overdueMs:number, box:number}[]}
 */
export function dueQueue(topics, now, missionCount = 0) {
  const out = [];
  for (const [topicId, st] of Object.entries(topics || {})) {
    const srs = st && st.srs;
    if (!isDue(srs, now, missionCount)) continue;
    const dueAt = Math.min(srs.dueAt, now);
    const item = { topicId, reason: srs.box === 0 ? 'missed' : 'spaced', dueAt, overdueMs: now - dueAt, box: srs.box };
    if (srs.box === 0 && srs.templateId) item.templateId = srs.templateId;
    out.push(item);
  }
  out.sort((a, b) => b.overdueMs - a.overdueMs || a.box - b.box || (a.topicId < b.topicId ? -1 : a.topicId > b.topicId ? 1 : 0));
  return out;
}
