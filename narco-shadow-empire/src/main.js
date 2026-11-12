// Boot. Wired so far: the learning core (question engine + learner model) and the rendering core (renderer, sky /
// time of day / fog, rain and particles, material library) and the first actor systems (input, collision, zones). The world, actors, UI and game layers are not built yet - the integration
// step extends this file (see docs/ARCHITECTURE.md sections 3 and 9).
import { createContext } from './core/context.js';
import { flag } from './core/params.js';
import { createInput } from './core/input.js';
import { createMath } from './math/engine.js';
import { createLearning } from './learning/index.js';
import { createRenderer } from './world/renderer.js';
import { createEnvironment } from './world/environment.js';
import { createWeather } from './world/weather.js';
import { createMaterials } from './world/materials.js';
import { createCollision } from './world/collision.js';
import { createZones } from './world/zones.js';
import { runSelfTest } from './game/selftest.js';

const ctx = createContext();
createMath(ctx);
createLearning(ctx);
// ?norender=1 (logic-only tests): no WebGL at all; time of day and weather still run so missions can use them.
if (flag(ctx.params, 'norender')) ctx.loop.renderEnabled = false; else createRenderer(ctx);
createEnvironment(ctx, { hour: 22.5, weather: 'rain' });      // the opening scene: night, rain, wet streets
createWeather(ctx);
createMaterials(ctx);                                          // textures are generated lazily, on first use
createCollision(ctx);                                          // empty until the world builders add their boxes
createZones(ctx);                                              // ... and their zones
createInput(ctx).attach();                                     // keys act only in world mode; nothing consumes them yet
/** window.__game.selfTest() -> {pass, passed, total, results} (learning checks run in a sandbox; never touches the saved profile) */
ctx.selfTest = () => runSelfTest(ctx);
// The loop is not started yet: there is no world to show. Frames are drawn on demand (ctx.loop.renderOnce, gfx.sample).
console.info('[narco] learning core and rendering core ready; systems not yet wired:', ctx.missing().join(', '));
const boot = document.getElementById('boot');
if (boot) boot.querySelector('#boot-label').textContent = 'Learning and rendering cores ready - world not built yet';
window.__ready = true;
