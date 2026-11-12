// Resolution policy for the renderer: how large the drawing buffer should be. Pure module (no three.js, no DOM),
// so the rules - including the one that decides whether anything may be called "4K" - are unit-tested in Node.
//
//   native   device pixels:  min(devicePixelRatio, maxPixelRatio) x renderScale
//   fixed4k  an internal buffer of at least 3840 x 2160 at the window's aspect ratio (the browser scales it down)
//   dynamic  native multiplied by a factor that createDynamicScale() adjusts to hold the target frame rate

export const UHD_W = 3840;
export const UHD_H = 2160;

/** The only test that may put the label "4K" on anything: the drawing buffer really is at least 3840 x 2160. */
export const is4K = (w, h) => w >= UHD_W && h >= UHD_H;

/**
 * @param {object} o
 * @param {number} o.cssW  canvas width in CSS pixels          @param {number} o.cssH  canvas height in CSS pixels
 * @param {number} [o.dpr=1]            window.devicePixelRatio
 * @param {'native'|'fixed4k'|'dynamic'} [o.mode='native']
 * @param {number} [o.maxPixelRatio]    preset cap on the device pixel ratio
 * @param {number} [o.renderScale=1]    preset multiplier (0.75 on the low preset)
 * @param {number} [o.dynamicScale=1]   factor from createDynamicScale(), used in 'dynamic' mode only
 * @param {number} [o.maxSize=8192]     largest renderbuffer/texture side the GPU accepts
 * @param {number} [o.maxPixels]        pixel budget of 'fixed4k' (default 1.5 x 3840 x 2160, for ultrawide windows)
 * @returns {{bufferW:number, bufferH:number, pixelRatio:number, nativePixelRatio:number, mode:string, limited:boolean, is4K:boolean}}
 *          `limited` is true when a GPU limit or the pixel budget forced a smaller buffer than the mode asked for.
 */
export function computeBuffer(o) {
  const cssW = Math.max(1, Math.round(o.cssW || 0)), cssH = Math.max(1, Math.round(o.cssH || 0));
  const dpr = o.dpr > 0 ? o.dpr : 1;
  const maxSize = o.maxSize > 0 ? Math.floor(o.maxSize) : 8192;
  const native = Math.min(dpr, o.maxPixelRatio > 0 ? o.maxPixelRatio : dpr) * (o.renderScale > 0 ? o.renderScale : 1);
  const mode = o.mode === 'fixed4k' || o.mode === 'dynamic' ? o.mode : 'native';
  let w, h, limited = false;
  if (mode === 'fixed4k') {
    // Long side >= 3840 and short side >= 2160, so a landscape window always gets a true 4K-class buffer.
    const s = Math.max(UHD_W / Math.max(cssW, cssH), UHD_H / Math.min(cssW, cssH));
    w = Math.ceil(cssW * s - 1e-6); h = Math.ceil(cssH * s - 1e-6);
    const budget = o.maxPixels > 0 ? o.maxPixels : UHD_W * UHD_H * 1.5;
    if (w * h > budget) { const k = Math.sqrt(budget / (w * h)); w = Math.floor(w * k); h = Math.floor(h * k); limited = true; }
  } else {
    let pr = native;
    if (mode === 'dynamic') pr = Math.min(native, Math.max(Math.min(0.5, native), native * (o.dynamicScale > 0 ? o.dynamicScale : 1)));
    w = Math.round(cssW * pr); h = Math.round(cssH * pr);
  }
  if (w > maxSize || h > maxSize) { const k = Math.min(maxSize / w, maxSize / h); w = Math.floor(w * k); h = Math.floor(h * k); limited = true; }
  w = Math.max(1, w); h = Math.max(1, h);
  return { bufferW: w, bufferH: h, pixelRatio: w / cssW, nativePixelRatio: native, mode, limited, is4K: is4K(w, h) };
}

/**
 * Controller for resolutionMode 'dynamic'. Feed it the real duration of every rendered frame; it answers with a
 * multiplier in [min, max]. It lowers the multiplier when the frame rate is more than 10 % under the target and
 * raises it one step at a time after a sustained period on target. A raise that turns out to be too much doubles the
 * wait before the next attempt (up to a minute), so it settles instead of oscillating.
 *
 * @param {{targetFps?:number, min?:number, max?:number, step?:number}} [o]
 */
export function createDynamicScale(o = {}) {
  const step = o.step > 0 ? o.step : 0.05;
  const minLevel = Math.round((o.min > 0 ? o.min : 0.5) / step), maxLevel = Math.max(minLevel, Math.round((o.max > 0 ? o.max : 1) / step));
  const WINDOW = 0.5, SETTLE = 0.4, HOLD_START = 2, HOLD_MAX = 60;
  let target = o.targetFps > 0 ? o.targetFps : 60;
  let level = maxLevel, time = 0, frames = 0, settle = 0, good = 0, hold = HOLD_START, sinceRaise = Infinity, changes = 0;
  const setLevel = (l) => { if (l !== level) { level = l; settle = SETTLE; changes++; } };
  const api = {
    get scale() { return +(level * step).toFixed(4); },
    get target() { return target; },
    /** number of scale changes so far (tests, debug readout) */
    get changes() { return changes; },
    setTarget(fps) { if (fps > 0 && fps !== target) { target = fps; good = 0; hold = HOLD_START; } },
    reset() { level = maxLevel; time = 0; frames = 0; settle = 0; good = 0; hold = HOLD_START; sinceRaise = Infinity; },
    /** @param {number} dt real seconds since the previous rendered frame @returns {number} the scale to use now */
    update(dt) {
      if (!(dt > 0) || dt > 0.5) return api.scale;         // a hitch or a hidden tab says nothing about the GPU
      sinceRaise += dt;
      if (settle > 0) { settle -= dt; return api.scale; }  // let a resize finish before measuring again
      time += dt; frames++;
      if (time < WINDOW || frames < 4) return api.scale;
      const ratio = frames / time / target, span = time;
      time = 0; frames = 0;
      if (ratio < 0.9) {
        if (sinceRaise < 3) hold = Math.min(hold * 2, HOLD_MAX);          // the last raise cost the frame rate
        good = 0;
        if (level > minLevel) {
          const want = Math.floor((level * step * Math.sqrt(ratio) * 0.98) / step + 1e-9);   // cost ~ pixels ~ scale^2
          setLevel(Math.max(minLevel, Math.min(level - 1, want)));
        }
      } else if (ratio >= 0.97) {
        good += span;
        if (good >= hold && level < maxLevel) { setLevel(level + 1); sinceRaise = 0; good = 0; }
      } else {
        good = 0;                                            // between 90 % and 97 %: close enough, change nothing
      }
      return api.scale;
    },
  };
  return api;
}
