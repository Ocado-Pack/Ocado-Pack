// Local storage for the Technical Communication module (browser only; nothing leaves the device).
import { store } from '../store.js';
export function cs() {
  const st = store.get();
  if (!st.comms) st.comms = {};
  const c = st.comms;
  c.attempts ||= []; c.kb ||= []; c.interviews ||= []; c.current ??= null; c.snap ??= null;
  c.worked ||= { done: false, quiz: null };
  c.benchmark ||= { threshold: 85, n: 3 };
  c.careerGoal ||= { amount: 100000, note: 'Career goal set by you — not a verified salary for any role and not a guaranteed outcome.' };
  c.realExperience ??= '';
  return c;
}
export const saveComms = () => store.update(() => {});
