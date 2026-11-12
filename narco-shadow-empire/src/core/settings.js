// Settings store (persisted). Pure enough for Node tests.
// Read:   ctx.settings.get('quality')
// Write:  ctx.settings.set('quality', 'high')     -> emits 'settings:changed' {key, value, prev}
// Watch:  ctx.settings.onChange('textScale', fn)  or onChange('*', fn)

/**
 * Graphics presets. Applying a preset writes every key below (see applyQuality).
 * Effective pixel ratio = min(devicePixelRatio, maxPixelRatio) * renderScale, so on a 3840x2160 display
 * the 'high' and 'ultra' presets render a native 4K drawing buffer. Nothing is ever *labelled* 4K unless the
 * drawing buffer really is >= 3840x2160 (see gfx.getInfo()).
 */
export const QUALITY_PRESETS = Object.freeze({
  low:    { renderScale: 0.75, maxPixelRatio: 1,    shadows: 'off',  shadowMapSize: 512,  bloom: false, ao: false, grain: false, msaa: 0, rainDensity: 0.35, textureSize: 512,  maxLights: 4,  reflections: 'off',  drawDistance: 170, particles: 0.4, traffic: 0.5 },
  medium: { renderScale: 1.0,  maxPixelRatio: 1.25, shadows: 'low',  shadowMapSize: 1024, bloom: true,  ao: false, grain: true,  msaa: 2, rainDensity: 0.7,  textureSize: 1024, maxLights: 8,  reflections: 'low',  drawDistance: 230, particles: 0.7, traffic: 1 },
  high:   { renderScale: 1.0,  maxPixelRatio: 2,    shadows: 'high', shadowMapSize: 2048, bloom: true,  ao: false, grain: true,  msaa: 4, rainDensity: 1.0,  textureSize: 1024, maxLights: 12, reflections: 'high', drawDistance: 320, particles: 1.0, traffic: 1 },
  ultra:  { renderScale: 1.0,  maxPixelRatio: 3,    shadows: 'high', shadowMapSize: 4096, bloom: true,  ao: true,  grain: true,  msaa: 4, rainDensity: 1.3,  textureSize: 2048, maxLights: 16, reflections: 'high', drawDistance: 420, particles: 1.3, traffic: 1 },
});

export const DEFAULT_SETTINGS = Object.freeze({
  // language / accessibility
  lang: 'en',                 // UI language: 'en' | 'es'
  learnLang: 'en',            // language of tutor explanations (can differ from UI language)
  subtitles: true,
  voice: false,               // speak dialogue with the browser's speech synthesis when available
  textScale: 1.0,             // 0.85 .. 1.6  (multiplies every UI font size)
  highContrast: false,
  reducedMotion: false,       // no camera shake/bob, cuts instead of camera moves, no UI animation
  // graphics
  quality: 'high',            // 'low' | 'medium' | 'high' | 'ultra' | 'custom'
  resolutionMode: 'native',   // 'native' (device pixels) | 'fixed4k' (3840x2160-class internal buffer) | 'dynamic' (hold targetFps)
  targetFps: 60,
  ...QUALITY_PRESETS.high,
  fov: 62,
  showFps: false,
  // audio (0..1)
  volMaster: 0.8, volAmbient: 0.7, volSfx: 0.8, volMusic: 0.45, volVoice: 1.0,
  // controls
  mouseSens: 1.0, invertY: false,
  units: 'imperial',          // dashboard units: 'imperial' (mph, miles, gallons) | 'metric' (km/h, km, liters)
  touchControls: 'auto',      // 'auto' | 'on' | 'off'
  // learning
  allowCalculator: false,     // phone calculator in untimed learning (never in exam mode); using it removes independent credit
  sessionMinutes: 15,         // 15 | 30 | 45
  showSessionClock: true,
  timedDrills: false,
});

const QUALITY_KEYS = Object.keys(QUALITY_PRESETS.high);

/**
 * @param {{storage:any, events:any}} deps
 * @param {object} [overrides] one-off overrides (e.g. from URL params); not persisted
 */
export function createSettings({ storage, events }, overrides = {}) {
  const saved = (storage && storage.get('settings', null)) || {};
  const firstRun = !storage || storage.get('settings', null) === null;
  const values = { ...DEFAULT_SETTINGS, ...saved };
  if (firstRun) {
    try {
      if (typeof navigator !== 'undefined' && /^es\b/i.test(navigator.language || '')) { values.lang = 'es'; values.learnLang = 'es'; }
      if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) values.reducedMotion = true;
    } catch { /* ignore */ }
  }
  const transient = { ...overrides };
  if (transient.quality && QUALITY_PRESETS[transient.quality]) Object.assign(transient, QUALITY_PRESETS[transient.quality]);
  const listeners = new Map();

  const persist = () => { if (storage) storage.set('settings', values); };
  const notify = (key, value, prev) => {
    for (const k of [key, '*']) {
      const set = listeners.get(k);
      if (set) for (const fn of [...set]) { try { fn(value, key, prev); } catch (e) { console.error('[settings] listener threw', e); } }
    }
    if (events) events.emit('settings:changed', { key, value, prev });
  };

  const api = {
    get(key) { return key in transient ? transient[key] : values[key]; },
    all() { return { ...values, ...transient }; },
    set(key, value) {
      const prev = api.get(key);
      delete transient[key];
      if (prev === value && values[key] === value) return;
      values[key] = value;
      if (QUALITY_KEYS.includes(key) && values.quality !== 'custom') {
        const p = QUALITY_PRESETS[values.quality];
        if (!p || p[key] !== value) { values.quality = 'custom'; delete transient.quality; notify('quality', 'custom', undefined); }
      }
      persist();
      notify(key, value, prev);
    },
    setMany(obj) { for (const [k, v] of Object.entries(obj)) api.set(k, v); },
    /** Apply a graphics preset: writes all preset keys, then 'quality'. */
    applyQuality(name) {
      const p = QUALITY_PRESETS[name];
      if (!p) return;
      for (const k of QUALITY_KEYS) { const prev = api.get(k); delete transient[k]; values[k] = p[k]; if (prev !== p[k]) notify(k, p[k], prev); }
      const prevQ = api.get('quality');
      delete transient.quality;
      values.quality = name;
      persist();
      notify('quality', name, prevQ);
    },
    /** fn(value, key, prev). Use key '*' for every change. Returns unsubscribe. */
    onChange(key, fn) {
      let set = listeners.get(key);
      if (!set) { set = new Set(); listeners.set(key, set); }
      set.add(fn);
      return () => set.delete(fn);
    },
    reset() {
      for (const k of Object.keys(DEFAULT_SETTINGS)) { const prev = values[k]; values[k] = DEFAULT_SETTINGS[k]; if (prev !== values[k]) notify(k, values[k], prev); }
      persist();
    },
    presets: QUALITY_PRESETS,
    defaults: DEFAULT_SETTINGS,
  };
  return api;
}
