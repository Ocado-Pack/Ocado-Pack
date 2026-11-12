// Material library in a real browser: every named material compiles and draws, caching, wetness and night response.
const J = JSON.stringify;
module.exports = {
  name: 'materials (dev/materials.html): every material draws, wet ground gets glossy puddles, windows and signs light up at night',
  page: 'dev/materials.html?quality=low&test=1&time=12.5&weather=overcast', width: 480, height: 270, timeout: 300000,
  run: async ({ evalJs, report }) => {
    const d = {}, checks = {}, same = (a, b) => J(a) === J(b);
    d.lib = await evalJs(() => { const h = window.__h, m = h.mats, names = ['asphalt', 'sidewalk', 'curb', 'concrete', 'concreteStained', 'concreteFloor', 'brick', 'brickDark', 'brickPainted', 'stucco', 'metalCorrugated', 'metalCorrugatedRust', 'woodCrate', 'woodPlank', 'chainlink', 'steel', 'metalDark', 'chrome', 'rubber', 'plastic', 'paper'];
      const got = names.map((n) => m.get(n)), s = m.stats();
      return { all: got.every((x) => x && x.isMeshStandardMaterial), textured: got.filter((x) => x.map && x.normalMap && x.roughnessMap).length, meters: got.filter((x) => x.userData.meters > 0).length,
        cached: m.get('brick') === m.get('brick') && m.get('stucco', { color: 0x7fa0b0 }) !== m.get('stucco') && m.paint(0x123456) === m.paint(0x123456), sameMaps: m.get('brick').map === m.get('brick').map,
        unknown: m.get('no-such-thing').isMeshStandardMaterial, wettable: got.filter((x) => x.userData.wettable).length, chainlink: [m.get('chainlink').alphaTest, m.get('chainlink').side === h.THREE.DoubleSide],
        stats: [s.materials > 30, s.textures > 40, s.bytesEstimate < 80e6, s.nightOnly], registered: h.ctx.has('mats') && h.ctx.mats === m, aspect: m.sign('HOLA', { width: 400, height: 100 }).userData.aspect }; });
    checks.everyNameIsAMaterial = d.lib.all && d.lib.textured === 15 && d.lib.meters === 15 && d.lib.unknown === true && d.lib.registered;
    checks.cachingWorks = d.lib.cached && d.lib.sameMaps && same(d.lib.chainlink, [0.5, true]) && d.lib.aspect === 4;
    checks.memoryIsBounded = same(d.lib.stats.slice(0, 3), [true, true, true]);

    // wet: the ground darkens and its puddles mirror the sky (a much wider brightness range on the road than when dry)
    d.wet = await evalJs(() => { const h = window.__h, look = (wet) => { h.apply({ time: 12.5, weather: 'overcast', wet, cam: 'ground' }); h.ctx.loop.step(1 / 60); const s = h.gfx.sample(8), road = s.lumas.slice(0, 24); return { uniform: h.mats.wetness, mean: +(road.reduce((a, b) => a + b, 0) / road.length).toFixed(3), spread: +(Math.max(...road) - Math.min(...road)).toFixed(3) }; };
      h.ctx.loop.stop(); return { dry: look(0), soaked: look(1) }; });
    checks.wetnessReachesTheShader = d.wet.dry.uniform === 0 && d.wet.soaked.uniform > 0.99 && d.wet.soaked.spread > d.wet.dry.spread * 1.5 && Math.abs(d.wet.soaked.mean - d.wet.dry.mean) > 0.02;

    // night: lit windows and night-only signs follow the night factor; neon is always on
    d.night = await evalJs(() => { const h = window.__h, m = h.mats, f = m.facade('stucco', { seed: 1 }), bodega = m.sign(['BODEGA 7', 'ALMACENES MARÍTIMOS CENIZA'], { color: '#ffd9a0', background: '#1a1410', border: '#ffb46b', width: 768, height: 256, nightOnly: true }), neon = m.neon(0xff2d95);
      const at = (time) => { h.apply({ time, weather: 'clear', wet: 0, cam: 'facade' }); h.ctx.loop.step(1 / 60); return [+f.emissiveIntensity.toFixed(2), +bodega.emissiveIntensity.toFixed(2), neon.emissiveIntensity, +h.gfx.sample(6).max.toFixed(2)]; };
      const noon = at(12.5), dusk = at(19), night = at(23); m.setNightFactor(0.25); h.ctx.loop.step(1 / 60); const forced = +f.emissiveIntensity.toFixed(2); m.setNightFactor(null);
      return { noon, dusk, night, forced, hasEmissiveMap: !!f.emissiveMap }; });
    checks.windowsLightUpAtNight = same(d.night.noon.slice(0, 3), [0, 0, 5.5]) && same(d.night.dusk.slice(0, 2), [1.2, 1.5]) && same(d.night.night.slice(0, 3), [2.4, 3, 5.5]) && d.night.forced === 0.6 && d.night.hasEmissiveMap && d.night.night[3] > 0.5;

    d.errors = report.errors.slice(0, 5); d.pageErrors = report.pageErrors.slice(0, 3);
    checks.noErrorsNoNetwork = report.errors.length === 0 && report.pageErrors.length === 0 && report.externalRequests.length === 0;
    d.checks = checks;
    return { pass: Object.values(checks).every(Boolean), details: d };
  },
};
