// Boot. PLACEHOLDER - the integration step replaces this with the full wiring (see docs/ARCHITECTURE.md §3, §9).
import { createContext } from './core/context.js';

const ctx = createContext();
console.info('[narco] context ready; systems not yet wired:', ctx.missing().join(', '));
const boot = document.getElementById('boot');
if (boot) boot.querySelector('#boot-label').textContent = 'Systems not wired yet';
window.__ready = true;
