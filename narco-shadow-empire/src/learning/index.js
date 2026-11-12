// Learner model entry point: creates and registers ctx.profile, ctx.session and ctx.tutor. Pure module.
// (ctx.exam - the practice-exam logic of contract 7.7 - is not implemented yet and stays a null object.)
import { createProfile } from './profile.js';
import { createSession } from './session.js';
import { createTutor } from './tutor.js';

/**
 * @param {object} ctx                       the game context
 * @param {{now?: () => number}} [opts]      injectable clock (ms); defaults to Date.now
 */
export function createLearning(ctx, { now = Date.now } = {}) {
  const profile = ctx.register('profile', createProfile(ctx, { now }));
  const session = ctx.register('session', createSession(ctx, { now }));
  const tutor = ctx.register('tutor', createTutor(ctx, { now }));
  return { profile, session, tutor };
}

export { createProfile, createSession, createTutor };
