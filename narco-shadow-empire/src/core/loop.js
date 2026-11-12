// Main loop. Simulation (update) is separate from rendering so tests can fast-forward without drawing.
//
// Systems are registered with ctx.register(name, system, { order, runWhenPaused }).
// Each frame, in ascending `order`:
//     system.update(dt, ctx)       - skipped while ctx.flow.simPaused unless runWhenPaused is true
// then ctx.gfx.render(dt) (when a renderer is registered and rendering is enabled),
// then ctx.input.endFrame().
//
// Suggested orders: input 0 · missions 10 · player 20 · vehicle 25 · traffic 28 · npcs 30 · cameraRig 40 ·
// interact 45 · zones 46 · env 50 · weather 55 · lights 60 · audio 70 · ui 80 (runWhenPaused) · gfx (render) last.
import { clamp } from './util.js';

export function createLoop(ctx) {
  let raf = 0;
  let running = false;
  let last = 0;
  let renderEnabled = true;
  let fpsSmooth = 60;
  /** @type {{name:string, system:any, order:number, runWhenPaused:boolean}[]} */
  let ordered = [];

  const rebuild = () => {
    ordered = [...ctx.systems.values()].sort((a, b) => a.order - b.order);
  };

  function update(dt) {
    const paused = ctx.flow.simPaused;
    ctx.time.dt = dt;
    ctx.time.real += dt;
    if (!paused) { ctx.time.now += dt; ctx.time.simFrame++; }
    ctx.time.frame++;
    for (const s of ordered) {
      if (!s.system || typeof s.system.update !== 'function') continue;
      if (paused && !s.runWhenPaused) continue;
      try { s.system.update(dt, ctx); } catch (e) {
        if (!s._errored) { s._errored = true; console.error(`[loop] system "${s.name}" update threw`, e); }
      }
    }
  }

  function endFrame() {
    if (ctx.input && typeof ctx.input.endFrame === 'function') ctx.input.endFrame();
  }

  function frame(tMs) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const now = tMs / 1000;
    let dt = last ? now - last : 1 / 60;
    last = now;
    if (dt > 0) fpsSmooth += (1 / dt - fpsSmooth) * 0.05;
    dt = clamp(dt, 0, 1 / 15); // never simulate more than 66 ms in one step (tab switch, hitch)
    update(dt);
    if (renderEnabled && ctx.gfx && typeof ctx.gfx.render === 'function') {
      try { ctx.gfx.render(dt); } catch (e) { if (!frame._err) { frame._err = true; console.error('[loop] render threw', e); } }
    }
    endFrame();
  }

  const api = {
    rebuild,
    get running() { return running; },
    get fps() { return fpsSmooth; },
    get renderEnabled() { return renderEnabled; },
    set renderEnabled(v) { renderEnabled = !!v; },
    start() {
      if (running) return;
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    /** Advance exactly one simulation step (no render). */
    step(dt = 1 / 60) { update(dt); endFrame(); },
    /**
     * Debug/test helper: run the simulation for `seconds` of game time in fixed steps without rendering.
     * `each(stepIndex)` may return false to stop early. Returns the number of steps run.
     */
    fastForward(seconds, stepDt = 1 / 60, each) {
      const n = Math.max(1, Math.round(seconds / stepDt));
      let i = 0;
      for (; i < n; i++) {
        update(stepDt);
        endFrame();
        if (each && each(i) === false) { i++; break; }
      }
      return i;
    },
    /** Render one frame now (used after fastForward in tests). */
    renderOnce(dt = 0) { if (ctx.gfx && typeof ctx.gfx.render === 'function') ctx.gfx.render(dt); },
  };
  return api;
}
