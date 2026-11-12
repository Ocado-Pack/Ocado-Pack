// The game context: one object handed to every system. See docs/ARCHITECTURE.md for the full contract.
import { createEvents } from './events.js';
import { createStorage } from './storage.js';
import { createSettings } from './settings.js';
import { createI18n } from './i18n.js';
import { createFlow } from './flow.js';
import { createLoop } from './loop.js';
import { createRng } from './rng.js';
import { getParams, flag } from './params.js';

/**
 * A "deep null object": any property is another null object, any call returns undefined, and it is not
 * thenable. Lets a dev harness run one system without the others (ctx.ui.hud.setObjective(...) is a no-op).
 * Use ctx.has('name') before READING state from a system that might not be registered.
 */
export function makeNullSystem(name) {
  const fn = function () {};
  const proxy = new Proxy(fn, {
    get(_t, prop) {
      if (prop === '__null') return true;
      if (prop === '__name') return name;
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      if (prop === 'toJSON') return () => null;
      return proxy;
    },
    apply() { return undefined; },
    set() { return true; },
  });
  return proxy;
}

/** Names every module may rely on existing on ctx (real system or null object). */
export const SYSTEM_NAMES = [
  'input', 'audio', 'gfx', 'mats', 'env', 'weather', 'lights', 'world', 'collision', 'zones', 'interact',
  'player', 'vehicle', 'traffic', 'cameraRig', 'npcs', 'cinematics', 'visualLab',
  'math', 'profile', 'tutor', 'session', 'exam',
  'missions', 'campaign', 'dialog', 'ui', 'save',
];

/**
 * @param {object} [opts]
 * @param {object} [opts.params]            URL params override (defaults to location.search)
 * @param {object} [opts.settingsOverrides] transient settings (not persisted)
 * @param {any}    [opts.storageBackend]    inject a storage backend (tests); null forces in-memory
 */
export function createContext(opts = {}) {
  const params = opts.params || getParams();
  const test = flag(params, 'test');
  const noSave = flag(params, 'nosave') || test;
  const events = createEvents();
  const storage = createStorage('narco-se', noSave ? null : opts.storageBackend);
  const overrides = { ...(opts.settingsOverrides || {}) };
  if (params.quality) overrides.quality = params.quality;
  if (params.lang) { overrides.lang = params.lang; overrides.learnLang = params.lang; }
  if (flag(params, 'fps')) overrides.showFps = true;
  const settings = createSettings({ storage, events }, overrides);
  const i18n = createI18n({ settings, events });
  const flow = createFlow({ events });

  const ctx = {
    version: '0.1.0',
    params,
    test,
    events,
    storage,
    settings,
    i18n,
    flow,
    /** non-learning randomness (prop placement jitter, weather). Question generation uses its own seeds. */
    rng: createRng(params.seed ? Number(params.seed) || params.seed : test ? 1234 : undefined),
    /** now = simulated seconds (stops while paused), real = seconds since boot, dt = last step, frame counters */
    time: { now: 0, real: 0, dt: 0, frame: 0, simFrame: 0 },
    /** @type {Map<string, {name:string, system:any, order:number, runWhenPaused:boolean}>} */
    systems: new Map(),
    loop: null,
    debug: {},
    /**
     * Register a system: sets ctx[name] and adds it to the update loop.
     * @param {string} name
     * @param {object} system  may implement update(dt, ctx) and dispose()
     * @param {{order?:number, runWhenPaused?:boolean}} [o]
     */
    register(name, system, o = {}) {
      ctx.systems.set(name, { name, system, order: o.order ?? 100, runWhenPaused: !!o.runWhenPaused });
      ctx[name] = system;
      if (ctx.loop) ctx.loop.rebuild();
      events.emit('system:registered', { name });
      return system;
    },
    /** true when a real (non-null) system is registered under this name */
    has(name) { return ctx.systems.has(name); },
    /** names from SYSTEM_NAMES that are still null objects */
    missing() { return SYSTEM_NAMES.filter((n) => !ctx.systems.has(n)); },
  };
  for (const n of SYSTEM_NAMES) ctx[n] = makeNullSystem(n);
  ctx.loop = createLoop(ctx);
  if (typeof window !== 'undefined') window.__game = ctx;
  return ctx;
}
