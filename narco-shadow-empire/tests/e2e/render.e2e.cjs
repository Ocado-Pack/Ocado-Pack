// Rendering core in a real browser (software WebGL): renderer + post chain, sky / time of day, weather.
// Checks behaviour through the public API and by reading pixels back; dev/render.shots.cjs is for looking at it.
const J = JSON.stringify;
module.exports = {
  name: 'rendering core (dev/render.html): honest resolution, both render paths, day/night, rain, emitters, context loss',
  page: 'dev/render.html?quality=low&test=1&hud=0', width: 480, height: 270, timeout: 300000,
  run: async ({ page, evalJs, report }) => {
    const d = {}, checks = {};
    const same = (a, b) => J(a) === J(b);

    // 1. the three systems are real and the numbers reported are the drawing buffer's
    d.boot = await evalJs(() => { const h = window.__h, g = h.ctx, i = h.info(), gl = h.gfx.renderer.getContext(), c = h.gfx.canvas;
      return { systems: ['gfx', 'env', 'weather'].map((n) => g.has(n)), info: [i.bufferW, i.bufferH, i.is4K, i.post, i.mode], canvas: [c.width, c.height], gl: [gl.drawingBufferWidth, gl.drawingBufferHeight], frames: i.frames }; });
    checks.boots = same(d.boot.systems, [true, true, true]) && d.boot.frames >= 3;
    checks.lowPresetIsDirectAndScaled = same(d.boot.info, [360, 203, false, false, 'native']) && same(d.boot.canvas, [360, 203]) && same(d.boot.gl, [360, 203]);

    // 2. fixed-4K mode really renders 3840 x 2160, and only then is the 4K label allowed
    d.uhd = await evalJs(async () => { const h = window.__h; h.ctx.loop.stop(); h.ctx.settings.set('resolutionMode', 'fixed4k'); const i = h.gfx.getInfo(), gl = h.gfx.renderer.getContext(), s = h.gfx.sample(3);
      const r = { info: [i.bufferW, i.bufferH, i.is4K, i.limited], gl: [gl.drawingBufferWidth, gl.drawingBufferHeight], drawn: !!s && s.max > s.min }; h.ctx.settings.set('resolutionMode', 'native'); return { ...r, back: [h.gfx.getInfo().bufferW, h.gfx.getInfo().is4K] }; });
    checks.fixed4kIsReal4K = same(d.uhd.info, [3840, 2160, true, false]) && same(d.uhd.gl, [3840, 2160]) && d.uhd.drawn && same(d.uhd.back, [360, false]);

    //    ... and a portrait window in the same mode gets the rotated buffer WITHOUT the label: is4K comes from the buffer, not the mode
    await page.setViewportSize({ width: 270, height: 480 });
    d.portrait = await evalJs(async () => { const h = window.__h; await new Promise((r) => setTimeout(r, 150)); h.ctx.settings.set('resolutionMode', 'fixed4k'); const i = h.gfx.getInfo(), gl = h.gfx.renderer.getContext();
      const r = { info: [i.bufferW, i.bufferH, i.is4K, i.mode], gl: [gl.drawingBufferWidth, gl.drawingBufferHeight] }; h.ctx.settings.set('resolutionMode', 'native'); return r; });
    await page.setViewportSize({ width: 480, height: 270 });
    d.landscapeAgain = await evalJs(async () => { await new Promise((r) => setTimeout(r, 150)); const i = window.__h.gfx.getInfo(); return [i.cssW, i.cssH, i.bufferW, i.bufferH]; });
    checks.fourKLabelComesFromTheBuffer = same(d.portrait.info, [2160, 3840, false, 'fixed4k']) && same(d.portrait.gl, [2160, 3840]) && same(d.landscapeAgain, [480, 270, 360, 203]);

    // 3. presets switch the render path, MSAA and shadows live
    d.presets = await evalJs(() => { const h = window.__h, out = {}; for (const q of ['medium', 'high', 'low']) { h.ctx.settings.applyQuality(q); h.gfx.render(0); const i = h.gfx.getInfo(); out[q] = [i.post, i.msaa, i.shadows, h.env.key.castShadow, i.bufferW]; } return out; });
    checks.presetsApplyLive = same(d.presets, { medium: [true, 2, 'low', true, 480], high: [true, 4, 'high', true, 480], low: [false, 0, 'off', false, 360] });

    // 4. time of day, with every lamp and neon of the test set switched OFF so only the sky lights the scene:
    //    noon is far brighter than night, a moonlit street is still readable, the night event fires at dusk
    d.time = await evalJs(() => { const h = window.__h, e = h.env, ev = []; const off = h.ctx.events.on('env:night', (x) => ev.push(x.night));
      const power = h.lamps.map((l) => l.light.intensity), glow = []; h.lamps.forEach((l) => { l.light.intensity = 0; });
      h.gfx.scene.traverse((o) => { if (o.material && o.material.emissiveIntensity > 1) { glow.push([o.material, o.material.emissiveIntensity]); o.material.emissiveIntensity = 0; } });
      const look = (time, weather, cam) => { h.apply({ time, weather, cam }); e.setWetness(0); const s = h.gfx.sample(6); return { luma: +s.luma.toFixed(3), min: +s.min.toFixed(3), max: +s.max.toFixed(3) }; };
      const r = { noon: look(12.5, 'clear', 'street'), night: look(1, 'clear', 'street'), nightSky: look(1, 'clear', 'sky'), noonSky: look(12.5, 'clear', 'sky'), events: ev.slice(), isNight: [] };
      ev.length = 0; e.setTime(18.9, { instant: true }); e.setClockRate(6); h.ctx.loop.fastForward(3); r.isNight = [e.isNight, +e.hour.toFixed(2)]; r.dusk = ev.slice(); e.setClockRate(0);
      // a timed change runs the clock FORWARD (through midnight) and lands exactly on the hour asked for
      e.setTime(22.5, { instant: true }); ev.length = 0; const seen = []; const offT = h.ctx.events.on('env:time', (x) => seen.push(x.hour)); e.setTime(6.5); h.ctx.loop.fastForward(1.5); const mid = e.hour;
      h.ctx.loop.fastForward(8); offT(); r.lapse = [+e.hour.toFixed(3), ev.slice(), e.isNight, mid > 22.5 || mid < 6.5, seen.length > 0 && seen.length <= 20]; off();
      h.lamps.forEach((l, i) => { l.light.intensity = power[i]; }); glow.forEach(([m, v]) => { m.emissiveIntensity = v; }); return r; });
    checks.dayIsBrighterThanNight = d.time.noon.luma > d.time.night.luma * 3 && d.time.noonSky.luma > d.time.nightSky.luma * 4;
    checks.nightIsNotPitchBlack = d.time.night.luma > 0.05 && d.time.night.max > 0.12 && d.time.night.luma < 0.25;
    checks.nightEventAtDusk = same(d.time.dusk, [true]) && d.time.isNight[0] === true && d.time.isNight[1] > 19;
    checks.timedTimeChange = same(d.time.lapse, [6.5, [false], false, true, true]);

    // 5. weather: rain is drawn only when it rains, follows the preset density, wets the ground gradually, fog thickens
    d.rain = await evalJs(() => { const h = window.__h, e = h.env, w = h.weather, S = () => w.stats().streaks, out = {};
      h.apply({ time: 22.5, weather: 'clear' }); e.setWetness(0); h.ctx.loop.step(1 / 60); out.clear = [S(), e.wetness, +e.fog.density.toFixed(4)];
      e.setWeather('rain'); h.ctx.loop.fastForward(10); out.after10s = [S() > 0, +e.wetness.toFixed(2)];
      h.ctx.loop.fastForward(30); out.after40s = [S(), +e.wetness.toFixed(2)];
      h.ctx.settings.applyQuality('medium'); h.ctx.loop.step(1 / 60); out.medium = S(); h.ctx.settings.applyQuality('low');
      e.setWeather('fog', { instant: true }); h.ctx.loop.step(1 / 60); out.fog = [S(), +e.fog.density.toFixed(4)];
      e.setWeather('storm', { instant: true }); let strike = null; const off = h.ctx.events.on('env:lightning', (x) => { strike = x; }); h.ctx.loop.fastForward(40); off(); out.lightning = !!strike && strike.strength > 0;
      return out; });
    checks.rainOnlyWhenItRains = same(d.rain.clear.slice(0, 2), [0, 0]) && d.rain.after10s[0] === true && d.rain.fog[0] === 0;
    checks.rainFollowsDensity = d.rain.after40s[0] === 3150 && d.rain.medium === 6300;
    checks.groundGetsWetGradually = d.rain.after10s[1] > 0.1 && d.rain.after10s[1] < 0.6 && d.rain.after40s[1] === 1;
    checks.fogThickens = d.rain.fog[1] > d.rain.clear[2] * 3;
    checks.stormHasLightning = d.rain.lightning === true;

    // 6. rain never jumps when the wind gusts; emitters make particles and stop when removed
    d.motion = await evalJs(() => { const h = window.__h, u = h.weather.rain.material.uniforms; let worst = 0, wind = 0, px = u.uDrift.value.x;
      for (let i = 0; i < 300; i++) { h.ctx.loop.step(1 / 60); const x = u.uDrift.value.x, dx = Math.min(Math.abs(x - px), 30 - Math.abs(x - px)); worst = Math.max(worst, dx); wind = Math.max(wind, h.env.wind.speed); px = x; }
      const base = h.weather.stats().particles, scale = h.ctx.settings.get('particles');   // the steam grate of the test set keeps running
      const em = h.weather.addEmitter({ type: 'smoke', position: [0, 1, -5], rate: 40 }); h.ctx.loop.fastForward(2); const made = h.weather.stats().particles - base; em.remove(); h.ctx.loop.fastForward(8);
      return { worst: +worst.toFixed(4), limit: +(wind * 0.55 / 60 + 1e-4).toFixed(4), made, expected: 40 * 2 * scale, extraAfter: h.weather.stats().particles - base, emitters: h.weather.stats().emitters }; });
    checks.rainMovesSmoothly = d.motion.worst <= d.motion.limit;
    checks.emittersWork = Math.abs(d.motion.made - d.motion.expected) <= 6 && d.motion.emitters === 1 && Math.abs(d.motion.extraAfter) <= 6;

    // 7. losing the WebGL context is survived
    d.context = await evalJs(async () => { const h = window.__h, ext = h.gfx.renderer.getContext().getExtension('WEBGL_lose_context'), wait = (ms) => new Promise((r) => setTimeout(r, ms));
      h.apply({ time: 22.5, weather: 'rain', cam: 'street' }); ext.loseContext(); await wait(250); const lost = [h.gfx.contextLost, !!document.querySelector('[data-testid=gfx-message]')];
      ext.restoreContext(); await wait(500); const s = h.gfx.sample(4); return { lost, restored: [h.gfx.contextLost, !!document.querySelector('[data-testid=gfx-message]')], drawn: !!s && s.max - s.min > 0.05, env: !!h.gfx.scene.environment }; });
    checks.survivesContextLoss = same(d.context.lost, [true, true]) && same(d.context.restored, [false, false]) && d.context.drawn && d.context.env;

    d.consoleErrors = report.errors.slice(0, 5); d.pageErrors = report.pageErrors.slice(0, 3); d.externalRequests = report.externalRequests.slice(0, 3);
    checks.noErrorsNoNetwork = report.errors.length === 0 && report.pageErrors.length === 0 && report.externalRequests.length === 0;
    d.checks = checks;
    return { pass: Object.values(checks).every(Boolean), details: d };
  },
};
