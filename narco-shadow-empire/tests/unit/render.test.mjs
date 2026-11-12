// Pure parts of the rendering core: the resolution policy (incl. the "4K" rule) and the sky / weather model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBuffer, createDynamicScale, is4K } from '../../src/world/resolution.js';
import {
  WEATHER, WEATHER_KINDS, DAWN, DUSK, computeSky, makeSky, weatherParams, blendWeather,
  sunDirection, moonDirection, nightFactor, isNightHour, luminance,
} from '../../src/world/skymodel.js';

const len = (v) => Math.hypot(v[0], v[1], v[2]);

test('resolution: native mode follows devicePixelRatio, the preset cap and the render scale', () => {
  assert.deepEqual(pick(computeBuffer({ cssW: 1280, cssH: 720, dpr: 1, maxPixelRatio: 2, renderScale: 1 })), [1280, 720, 1]);
  assert.deepEqual(pick(computeBuffer({ cssW: 1280, cssH: 720, dpr: 3, maxPixelRatio: 2, renderScale: 1 })), [2560, 1440, 2]);
  assert.deepEqual(pick(computeBuffer({ cssW: 1280, cssH: 720, dpr: 2, maxPixelRatio: 1, renderScale: 0.75 })), [960, 540, 0.75]);
  // a 4K display at 100 % scaling is native 4K on every preset that does not scale down
  const uhd = computeBuffer({ cssW: 3840, cssH: 2160, dpr: 1, maxPixelRatio: 2, renderScale: 1 });
  assert.equal(uhd.is4K, true);
  // ... and the low preset on the same display is honestly NOT 4K
  assert.equal(computeBuffer({ cssW: 3840, cssH: 2160, dpr: 1, maxPixelRatio: 1, renderScale: 0.75 }).is4K, false);
  // a HiDPI laptop (1920x1080 CSS at dpr 2) reaches 4K only when the preset allows pixel ratio 2
  assert.equal(computeBuffer({ cssW: 1920, cssH: 1080, dpr: 2, maxPixelRatio: 2, renderScale: 1 }).is4K, true);
  assert.equal(computeBuffer({ cssW: 1920, cssH: 1080, dpr: 2, maxPixelRatio: 1.25, renderScale: 1 }).is4K, false);
  assert.equal(computeBuffer({ cssW: 0, cssH: 0 }).bufferW, 1, 'never a zero-sized buffer');
});

test('resolution: the 4K label needs both 3840 wide and 2160 high', () => {
  assert.equal(is4K(3840, 2160), true);
  assert.equal(is4K(3839, 2160), false);
  assert.equal(is4K(3840, 2159), false);
  assert.equal(is4K(2560, 1440), false);
  assert.equal(is4K(2160, 3840), false, 'a portrait buffer is not labelled 4K');
});

test('resolution: fixed4k renders a real 4K-class buffer at the window aspect, or says it could not', () => {
  for (const [w, h] of [[1280, 720], [1920, 1080], [640, 360], [3840, 2160], [1366, 768], [1024, 768], [2560, 1080], [3440, 1440]]) {
    const b = computeBuffer({ cssW: w, cssH: h, dpr: 1, mode: 'fixed4k', maxPixelRatio: 1, renderScale: 0.75 });
    assert.equal(b.is4K, true, `${w}x${h} -> ${b.bufferW}x${b.bufferH}`);
    assert.equal(b.limited, false);
    assert.ok(Math.abs(b.bufferW / b.bufferH - w / h) < 0.01, 'aspect kept');
    assert.ok(b.bufferW * b.bufferH <= 3840 * 2160 * 1.5);
  }
  assert.deepEqual(pick(computeBuffer({ cssW: 1280, cssH: 720, mode: 'fixed4k' })), [3840, 2160, 3]);
  // a GPU that cannot allocate it: smaller buffer, flagged, and not 4K
  const weak = computeBuffer({ cssW: 1280, cssH: 720, mode: 'fixed4k', maxSize: 2048 });
  assert.deepEqual([weak.bufferW, weak.bufferH, weak.limited, weak.is4K], [2048, 1152, true, false]);
  // 32:9 would need 16.6 M pixels: the budget wins and the result is not labelled 4K
  const wide = computeBuffer({ cssW: 5120, cssH: 1440, mode: 'fixed4k' });
  assert.equal(wide.limited, true); assert.equal(wide.is4K, false);
  // portrait phone: the rotated 4K-class buffer, never the 4K label
  const tall = computeBuffer({ cssW: 390, cssH: 844, dpr: 3, mode: 'fixed4k' });
  assert.ok(tall.bufferW >= 2160 && tall.bufferH >= 3840); assert.equal(tall.is4K, false);
});

test('resolution: dynamic mode stays between pixel ratio 0.5 and native', () => {
  const o = { cssW: 1280, cssH: 720, dpr: 2, maxPixelRatio: 2, renderScale: 1, mode: 'dynamic' };
  assert.equal(computeBuffer({ ...o, dynamicScale: 1 }).pixelRatio, 2);
  assert.equal(computeBuffer({ ...o, dynamicScale: 0.5 }).pixelRatio, 1);
  assert.equal(computeBuffer({ ...o, dynamicScale: 0.1 }).pixelRatio, 0.5);
  assert.equal(computeBuffer({ ...o, dynamicScale: 3 }).pixelRatio, 2);
});

/** A GPU whose frame time grows with the pixel count, behind a 60 Hz display. `ideal` = the scale that just holds 60. */
function simulate(ctl, ideal, seconds, onFrame) {
  let t = 0, n = 0;
  while (t < seconds) {
    const s = ctl.scale, fps = Math.min(60, 60 * (ideal * ideal) / (s * s));
    const dt = (1 / fps) * (1 + 0.04 * Math.sin(n * 1.7));         // a little frame-time jitter
    ctl.update(dt); t += dt; n++;
    if (onFrame) onFrame(t, fps, ctl.scale);
  }
}

test('dynamic resolution: settles near the scale that holds the target and does not oscillate', () => {
  const ctl = createDynamicScale({ targetFps: 60 });
  assert.equal(ctl.scale, 1);
  let late = [], changesAt120 = 0;
  simulate(ctl, 0.72, 300, (t, fps, s) => { if (t > 120) late.push([fps, s]); else changesAt120 = ctl.changes; });
  const minFps = Math.min(...late.map((x) => x[0])), scales = new Set(late.map((x) => x[1]));
  assert.ok(late.filter((x) => x[0] >= 54).length / late.length > 0.95, 'holds at least 90 % of the target almost always');
  assert.ok(minFps > 45, `no deep dips (${minFps.toFixed(1)})`);
  for (const s of scales) assert.ok(s >= 0.6 && s <= 0.8, `scale ${s} near the ideal 0.72`);
  assert.ok(ctl.changes - changesAt120 <= 8, `few changes once settled: ${ctl.changes - changesAt120} in 3 minutes`);
});

test('dynamic resolution: a raise that costs the frame rate is retried less and less often', () => {
  // ideal 0.60: one step up (0.65) drops to 85 % of the target, so every attempt has to be undone
  const ctl = createDynamicScale({ targetFps: 60 });
  let late = [], changesAt120 = 0;
  simulate(ctl, 0.6, 300, (t, fps) => { if (t > 120) late.push(fps); else changesAt120 = ctl.changes; });
  assert.ok(ctl.changes - changesAt120 <= 8, `${ctl.changes - changesAt120} changes in the last 3 minutes`);
  assert.ok(late.filter((f) => f >= 54).length / late.length > 0.97, 'on target nearly all the time');
  assert.ok(ctl.scale >= 0.55 && ctl.scale <= 0.65);
});

test('dynamic resolution: recovers when the load drops, respects its range, ignores hitches', () => {
  const ctl = createDynamicScale({ targetFps: 60, min: 0.5, max: 1 });
  simulate(ctl, 0.3, 30);
  assert.equal(ctl.scale, 0.5, 'never below the floor even when the target is unreachable');
  simulate(ctl, 2, 240);
  assert.equal(ctl.scale, 1, 'back to full resolution once there is headroom');
  const before = ctl.changes;
  for (let i = 0; i < 20; i++) ctl.update(2.5);                    // tab was hidden
  ctl.update(0); ctl.update(NaN);
  assert.equal(ctl.changes, before);
  // a 30 fps target on the same GPU allows a higher scale than a 60 fps target
  const a = createDynamicScale({ targetFps: 60 }), b = createDynamicScale({ targetFps: 30 });
  const run = (c, target) => { let t = 0; while (t < 120) { const fps = Math.min(60, 60 * 0.36 / (c.scale * c.scale)); c.update(1 / Math.min(fps, target === 30 ? 30 : 60)); t += 1 / fps; } };
  run(a, 60); run(b, 30);
  assert.ok(b.scale > a.scale, `${b.scale} > ${a.scale}`);
});

test('sky model: sun and moon directions', () => {
  for (let h = 0; h <= 24; h += 0.25) {
    assert.ok(Math.abs(len(sunDirection(h)) - 1) < 1e-9); assert.ok(Math.abs(len(moonDirection(h)) - 1) < 1e-9);
  }
  assert.ok(sunDirection(12.5)[1] > 0.85, 'high at noon');
  assert.ok(sunDirection(DAWN)[0] > 0.99 && Math.abs(sunDirection(DAWN)[1]) < 1e-9, 'rises in the east (+X)');
  assert.ok(sunDirection(DUSK)[0] < -0.99, 'sets in the west (-X)');
  assert.ok(sunDirection(12.5)[2] > 0, 'leans south (+Z)');
  assert.ok(sunDirection(0)[1] < -0.5 && sunDirection(23)[1] < 0 && sunDirection(3)[1] < 0, 'below the horizon at night');
  for (let h = 18; h <= 30; h += 0.5) assert.ok(moonDirection(h)[1] > 0.15, `moon usable all night (${h % 24})`);
  const m = moonDirection(22.5);
  assert.ok(m[0] < -0.3 && m[1] > 0.6 && m[2] > 0.2, 'at 22:30 the moon is high in the west-south-west');
});

test('sky model: night factor and the dusk / dawn crossings', () => {
  assert.equal(nightFactor(12), 0); assert.equal(nightFactor(0), 1); assert.equal(nightFactor(22.5), 1);
  assert.ok(Math.abs(nightFactor(DUSK) - 0.5) < 1e-9 && Math.abs(nightFactor(DAWN) - 0.5) < 1e-9);
  for (let h = 17; h < 21; h += 0.05) assert.ok(nightFactor(h + 0.05) >= nightFactor(h) - 1e-12, 'rises monotonically through dusk');
  for (let h = 4; h < 8; h += 0.05) assert.ok(nightFactor(h + 0.05) <= nightFactor(h) + 1e-12, 'falls monotonically through dawn');
  assert.deepEqual([18.99, 19, 23.9, 0, 5.99, 6, 12].map(isNightHour), [false, true, true, true, true, false, false]);
  assert.equal(nightFactor(-1.5), nightFactor(22.5)); assert.equal(nightFactor(46.5), nightFactor(22.5));
});

test('sky model: every hour and weather gives finite, usable values and night is never pitch black', () => {
  const sky = makeSky(), wx = {};
  for (const kind of WEATHER_KINDS) for (const intensity of [0.3, 1]) for (let h = 0; h < 24; h += 0.25) {
    computeSky(h, weatherParams(kind, intensity, wx), sky);
    for (const key of ['zenith', 'horizon', 'ground', 'glow', 'keyColor', 'hemiSky', 'hemiGround', 'fogColor', 'cloudLit', 'cloudDark', 'sunColor', 'moonColor'])
      for (const c of sky[key]) assert.ok(Number.isFinite(c) && c >= 0 && c <= 1.5, `${kind} ${h} ${key} = ${sky[key]}`);
    for (const key of ['keyIntensity', 'hemiIntensity', 'fogDensity', 'exposure', 'stars', 'sunDisc', 'moonDisc', 'bloomThreshold', 'bloomStrength'])
      assert.ok(Number.isFinite(sky[key]) && sky[key] >= 0, `${kind} ${h} ${key} = ${sky[key]}`);
    assert.ok(Math.abs(len(sky.keyDir) - 1) < 1e-9);
    assert.ok(sky.keyDir[1] > -1e-9 || sky.keyIntensity < 1e-6, 'the key light never shines from below the horizon');
    assert.ok(sky.hemiIntensity * luminance(sky.hemiSky) >= 0.2, `${kind} ${h}: ambient ${sky.hemiIntensity * luminance(sky.hemiSky)}`);
    assert.ok(sky.exposure >= 0.8 && sky.exposure <= 1.4);
    assert.deepEqual(sky.fogColor, sky.horizon, 'fog takes the horizon colour so distance melts into the sky');
  }
});

test('sky model: no jumps as the clock runs (including midnight and the sun-moon hand-over)', () => {
  const a = makeSky(), b = makeSky(), wx = weatherParams('clear');
  const step = 0.01;
  for (let h = 0; h < 24; h += step) {
    computeSky(h, wx, a); computeSky(h + step, wx, b);
    const lightA = a.keyColor.map((c) => c * a.keyIntensity), lightB = b.keyColor.map((c) => c * b.keyIntensity);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(lightA[i] - lightB[i]) < 0.08, `key light jump at ${h.toFixed(2)}`);
      assert.ok(Math.abs(a.zenith[i] - b.zenith[i]) < 0.02 && Math.abs(a.horizon[i] - b.horizon[i]) < 0.03, `sky jump at ${h.toFixed(2)}`);
      assert.ok(Math.abs(a.hemiSky[i] * a.hemiIntensity - b.hemiSky[i] * b.hemiIntensity) < 0.02, `ambient jump at ${h.toFixed(2)}`);
    }
    assert.ok(Math.abs(a.exposure - b.exposure) < 0.01);
    // the direction may only change abruptly while the key light is off
    const dot = a.keyDir[0] * b.keyDir[0] + a.keyDir[1] * b.keyDir[1] + a.keyDir[2] * b.keyDir[2];
    assert.ok(dot > 0.999 || Math.max(a.keyIntensity, b.keyIntensity) < 0.02, `key direction jump at ${h.toFixed(2)} with light on`);
  }
  assert.ok(computeSky(DUSK, wx).keyIntensity < 1e-9 && computeSky(DAWN, wx).keyIntensity < 1e-9);
});

test('sky model: weather behaves like weather', () => {
  const at = (kind, h, i = 1) => computeSky(h, weatherParams(kind, i), makeSky());
  const fog = (k) => WEATHER[k].fog;
  assert.ok(fog('fog') > fog('dust') && fog('dust') > fog('storm') && fog('storm') > fog('rain') && fog('rain') > fog('overcast') && fog('overcast') > fog('clear'));
  assert.ok(at('clear', 1).stars > 0.5 && at('clear', 12).stars === 0 && at('rain', 1).stars === 0 && at('storm', 23).stars === 0);
  assert.ok(at('clear', 12.5).keyIntensity > 3 && at('rain', 12.5).keyIntensity < 1 && at('storm', 12.5).keyIntensity < at('rain', 12.5).keyIntensity);
  assert.ok(at('overcast', 12.5).hemiIntensity > at('clear', 12.5).hemiIntensity, 'an overcast sky is a bigger soft light');
  assert.equal(at('clear', 12.5).keyIsMoon, false); assert.equal(at('clear', 22.5).keyIsMoon, true);
  assert.ok(at('clear', 22.5).keyIntensity > 0.4 && at('clear', 22.5).keyColor[2] > at('clear', 22.5).keyColor[0], 'moonlight is blue');
  assert.ok(at('clear', 12.5).sunDisc > 5 && at('rain', 12.5).sunDisc === 0 && at('clear', 22.5).moonDisc > 0.8 && at('rain', 22.5).moonDisc < 0.01);
  assert.ok(at('clear', 12.5).bloomThreshold > at('clear', 22.5).bloomThreshold, 'bloom is harder to trigger by day');
  assert.ok(luminance(at('rain', 22.5).glow) > luminance(at('clear', 22.5).glow) && luminance(at('rain', 12.5).glow) === 0, 'clouds bounce the city glow at night only');
  // intensity 0 of rain is plain overcast; half-way sits in between
  assert.equal(weatherParams('rain', 0).rain, 0); assert.equal(weatherParams('rain', 0).cloud, WEATHER.overcast.cloud);
  assert.equal(weatherParams('rain', 0.5).rain, 0.5); assert.equal(weatherParams('nonsense', 1).fog, WEATHER.clear.fog);
  const mid = blendWeather({}, WEATHER.clear, WEATHER.fog, 0.5);
  assert.ok(mid.fog > WEATHER.clear.fog && mid.fog < WEATHER.fog.fog);
  // dawn is warm at the horizon, noon is blue overhead, night is dark
  const dawn = at('clear', 6.3), noon = at('clear', 12.5), night = at('clear', 1);
  assert.ok(dawn.horizon[0] > dawn.horizon[2] && noon.zenith[2] > noon.zenith[0] && luminance(night.zenith) < 0.02);
});

function pick(b) { return [b.bufferW, b.bufferH, b.pixelRatio]; }

test('self-test: still runs in Node (no renderer) and passes its learning checks', async () => {
  const { runSelfTest } = await import('../../src/game/selftest.js');
  const r = runSelfTest();
  assert.equal(r.pass, true, JSON.stringify(r.results.filter((x) => !x.ok)));
  assert.equal(r.total, 8);
  // a context without a renderer adds no renderer checks and does not throw
  assert.equal(runSelfTest({ has: () => false }).total, 8);
});
