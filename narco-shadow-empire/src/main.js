// Boot. The learning core (question engine + learner model) is wired; the world, UI and game layers are not
// built yet - the integration step extends this file (see docs/ARCHITECTURE.md §3, §9).
import { createContext } from './core/context.js';
import { createMath } from './math/engine.js';
import { createLearning } from './learning/index.js';
import { runSelfTest } from './game/selftest.js';

const ctx = createContext();
createMath(ctx);
createLearning(ctx);
/** window.__game.selfTest() -> {pass, passed, total, results} (runs in a sandbox; never touches the saved profile) */
ctx.selfTest = runSelfTest;
console.info('[narco] learning core ready; systems not yet wired:', ctx.missing().join(', '));
const boot = document.getElementById('boot');
if (boot) boot.querySelector('#boot-label').textContent = 'Learning core ready - world not built yet';
window.__ready = true;
