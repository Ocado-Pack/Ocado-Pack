// Sky, time-of-day and weather model. Pure module (numbers only: no three.js, no DOM), unit-tested in Node.
// environment.js turns the numbers into lights, fog, sky-shader uniforms, exposure and bloom.
//
// Colours are LINEAR RGB triples. Light intensities use three.js r160 physical units: a white surface facing a
// directional light of intensity I has radiance I / PI, so "daylight" is about 3.3 and "moonlight" about 0.5.
import { clamp01, lerp, smoothstep } from '../core/util.js';

export const DAWN = 6;    // the sun rises, env:night {night:false}
export const DUSK = 19;   // the sun sets,  env:night {night:true}
const SUN_TILT = (24 * Math.PI) / 180, MOON_TILT = (30 * Math.PI) / 180;   // both arcs lean south (+Z)

export const wrap24 = (h) => ((h % 24) + 24) % 24;
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
/** sRGB hex -> linear [r, g, b] */
export const rgb = (hex) => [s2l(((hex >> 16) & 255) / 255), s2l(((hex >> 8) & 255) / 255), s2l((hex & 255) / 255)];
export const luminance = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const set = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; return o; };
const mix3 = (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
const scale3 = (o, k) => { o[0] *= k; o[1] *= k; o[2] *= k; return o; };

/** Unit vector pointing AT the sun. East (+X) at 06:00, high in the south at 12:30, west at 19:00, below at night. */
export function sunDirection(hour, out = [0, 0, 0]) {
  const h = wrap24(hour), dayLen = DUSK - DAWN;
  const a = h >= DAWN && h <= DUSK ? (Math.PI * (h - DAWN)) / dayLen : Math.PI + (Math.PI * wrap24(h - DUSK)) / (24 - dayLen);
  out[0] = Math.cos(a); out[1] = Math.sin(a) * Math.cos(SUN_TILT); out[2] = Math.sin(a) * Math.sin(SUN_TILT);
  return out;
}

/**
 * Unit vector pointing AT the moon. A deliberately slow, stylised arc: high in the south at dusk, 48 degrees up in
 * the west-south-west at 22:30, low in the west at dawn - so every night hour has a usable key light.
 */
export function moonDirection(hour, out = [0, 0, 0]) {
  const a = ((95 + (70 * wrap24(hour - 18)) / 12) * Math.PI) / 180;
  out[0] = Math.cos(a); out[1] = Math.sin(a) * Math.cos(MOON_TILT); out[2] = Math.sin(a) * Math.sin(MOON_TILT);
  return out;
}

/** 0 by day, 1 at night, 0.5 exactly at DUSK and DAWN; ramps over 90 minutes around each. */
export function nightFactor(hour) {
  const h = wrap24(hour);
  return h >= 12 ? smoothstep(DUSK - 0.75, DUSK + 0.75, h) : 1 - smoothstep(DAWN - 0.75, DAWN + 0.75, h);
}
export const isNightHour = (hour) => { const h = wrap24(hour); return h >= DUSK || h < DAWN; };

// ---- weather -------------------------------------------------------------------------------------------------------
// cloud 0-1 cover · sunDim / moonDim multiply the key light · fog = FogExp2 density · haze 0-1 flattens the sky toward
// the horizon colour · tint 0-1 dust colour · rain 0-1.3 amount · wind m/s · lightning 0-1 flash activity
export const WEATHER = Object.freeze({
  clear:    Object.freeze({ cloud: 0.15, sunDim: 1.00, moonDim: 1.00, fog: 0.0022, haze: 0.00, tint: 0, rain: 0.0, wind: 2,  lightning: 0 }),
  overcast: Object.freeze({ cloud: 0.88, sunDim: 0.30, moonDim: 0.45, fog: 0.0038, haze: 0.15, tint: 0, rain: 0.0, wind: 3,  lightning: 0 }),
  rain:     Object.freeze({ cloud: 0.95, sunDim: 0.22, moonDim: 0.40, fog: 0.0072, haze: 0.30, tint: 0, rain: 1.0, wind: 5,  lightning: 0 }),
  storm:    Object.freeze({ cloud: 1.00, sunDim: 0.14, moonDim: 0.30, fog: 0.0100, haze: 0.40, tint: 0, rain: 1.3, wind: 11, lightning: 1 }),
  fog:      Object.freeze({ cloud: 0.75, sunDim: 0.25, moonDim: 0.35, fog: 0.0260, haze: 0.90, tint: 0, rain: 0.0, wind: 1,  lightning: 0 }),
  dust:     Object.freeze({ cloud: 0.40, sunDim: 0.55, moonDim: 0.60, fog: 0.0135, haze: 0.55, tint: 1, rain: 0.0, wind: 8,  lightning: 0 }),
});
export const WEATHER_KINDS = Object.freeze(Object.keys(WEATHER));
const WX_KEYS = Object.keys(WEATHER.clear);

/** Parameters of `kind` at `intensity` 0-1. Rain and storm fade from overcast, everything else from clear. */
export function weatherParams(kind, intensity = 1, out = {}) {
  const to = WEATHER[kind] || WEATHER.clear, from = kind === 'rain' || kind === 'storm' ? WEATHER.overcast : WEATHER.clear;
  const t = clamp01(intensity);
  for (const k of WX_KEYS) out[k] = lerp(from[k], to[k], t);
  return out;
}

/** out = from + (to - from) * t for every weather parameter. */
export function blendWeather(out, from, to, t) {
  for (const k of WX_KEYS) out[k] = lerp(from[k], to[k], t);
  return out;
}

// ---- clear-sky keyframes -------------------------------------------------------------------------------------------
// zen / hor: sky dome zenith and horizon · hemS / hemG / hemI: hemisphere light · exp: tone-mapping exposure
const K = (h, zen, hor, hemS, hemG, hemI, exp) => ({ h, zen: rgb(zen), hor: rgb(hor), hemS: rgb(hemS), hemG: rgb(hemG), hemI, exp });
const NIGHT = [0x0c1120, 0x1c2333, 0x8a9cc8, 0x57483c, 1.0, 1.2];
const KEYS = [
  K(0, ...NIGHT),
  K(4.6, ...NIGHT),
  K(5.5, 0x1a2742, 0x5a4654, 0x8f96b8, 0x54463e, 0.95, 1.15),    // first light
  K(6.3, 0x47689f, 0xf0a878, 0xc3b4b6, 0x6a5a50, 0.90, 1.02),    // dawn: pink / orange
  K(7.6, 0x4a86d0, 0xc4d8ec, 0xc2d6ee, 0x7d766a, 0.85, 0.95),
  K(12.5, 0x3f7ccc, 0xc9dcee, 0xc8dcf2, 0x8a8274, 0.85, 0.92),   // noon
  K(17, 0x4379c2, 0xdcd2c0, 0xcfd2d8, 0x86796a, 0.85, 0.95),
  K(18.4, 0x3d5f9c, 0xf4a660, 0xd4b8a4, 0x6e5a4c, 0.85, 1.0),    // golden hour
  K(19.05, 0x2b3566, 0xcc5f62, 0xa08aa6, 0x56444a, 0.90, 1.08),  // dusk: amber / magenta
  K(19.8, 0x101a36, 0x3a3154, 0x8088b8, 0x50423e, 0.95, 1.16),   // blue hour
  K(21, ...NIGHT),
  K(24, ...NIGHT),
];
const C = {
  ocZenNight: rgb(0x0e1014), ocZenDay: rgb(0x8793a0), ocHorNight: rgb(0x2b2a2e), ocHorDay: rgb(0xb4bcc3),
  dustNight: rgb(0x3a3026), dustDay: rgb(0xc2a070),
  sunLow: rgb(0xff6a2a), sunHigh: rgb(0xfff1dc), sunCloud: rgb(0xe8eef5), moon: rgb(0xa9bfe6),
  hemCloudDay: rgb(0xc9d2da), hemCloudNight: rgb(0x8d92a8),
  cloudLitDay: rgb(0xf2f4f6), cloudLitOver: rgb(0xb9c0c6), cloudDarkDay: rgb(0x9aa5b2), cloudDarkOver: rgb(0x6c7580),
  cloudLitNight: rgb(0x23262e), cloudDarkNight: rgb(0x0d0f14),
  glow: rgb(0xff9050),
};

/** A reusable result object for computeSky (no per-frame allocation). */
export function makeSky() {
  const v = () => [0, 0, 0];
  return {
    hour: 0, nightFactor: 0, isNight: false,
    zenith: v(), horizon: v(), ground: v(), glow: v(),
    sunDir: v(), moonDir: v(), keyDir: v(), keyColor: v(), keyIntensity: 0, keyIsMoon: false,
    sunColor: v(), sunDisc: 0, sunHalo: 0, moonColor: v(), moonDisc: 0,
    hemiSky: v(), hemiGround: v(), hemiIntensity: 0,
    fogColor: v(), fogDensity: 0, exposure: 1, stars: 0,
    cloud: 0, cloudLit: v(), cloudDark: v(),
    bloomThreshold: 1, bloomStrength: 0.5,
    rain: 0, wind: 0, lightning: 0, haze: 0,
  };
}

const _a = [0, 0, 0], _b = [0, 0, 0];

/**
 * Everything the renderer needs for one moment: `hour` 0-24 and a weather parameter set (see weatherParams).
 * @param {number} hour @param {object} wx @param {ReturnType<typeof makeSky>} [out]
 */
export function computeSky(hour, wx, out = makeSky()) {
  const h = wrap24(hour), nf = nightFactor(h), day = 1 - nf;
  out.hour = h; out.nightFactor = nf; out.isNight = isNightHour(h);

  // 1. the clear sky at this hour
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
  const k0 = KEYS[i], k1 = KEYS[i + 1], t = clamp01((h - k0.h) / (k1.h - k0.h));
  mix3(out.zenith, k0.zen, k1.zen, t); mix3(out.horizon, k0.hor, k1.hor, t);
  mix3(out.hemiSky, k0.hemS, k1.hemS, t); mix3(out.hemiGround, k0.hemG, k1.hemG, t);
  let hemI = lerp(k0.hemI, k1.hemI, t);
  out.exposure = lerp(k0.exp, k1.exp, t);
  const dusk = 1 - Math.abs(2 * nf - 1);                      // peaks while the sky is coloured
  set(_b, out.horizon);                                        // remember the clear horizon for the cloud tint

  // 2. sun, moon and the single key light (the hand-over happens while both are at zero)
  sunDirection(h, out.sunDir); moonDirection(h, out.moonDir);
  const sunUp = smoothstep(0, 0.22, out.sunDir[1]);
  const moonUp = smoothstep(0.5, 1, nf) * smoothstep(0, 0.2, out.moonDir[1]);
  mix3(out.sunColor, C.sunLow, C.sunHigh, smoothstep(0.02, 0.4, out.sunDir[1]));
  mix3(out.sunColor, out.sunColor, C.sunCloud, wx.cloud * 0.7);
  set(out.moonColor, C.moon);
  out.keyIsMoon = !(out.sunDir[1] > 0);
  if (out.keyIsMoon) { set(out.keyDir, out.moonDir); set(out.keyColor, out.moonColor); out.keyIntensity = 0.5 * moonUp * wx.moonDim; }
  else { set(out.keyDir, out.sunDir); set(out.keyColor, out.sunColor); out.keyIntensity = 3.3 * sunUp * wx.sunDim; }
  const thin = clamp01(1 - wx.cloud * 1.08);
  out.sunDisc = 30 * thin * thin * (out.sunDir[1] > -0.02 ? 1 : 0);
  out.sunHalo = sunUp * (0.3 + 0.4 * wx.haze) * (1 - 0.6 * wx.cloud);
  out.moonDisc = 1.2 * nf * thin * (out.moonDir[1] > 0 ? 1 : 0);

  // 3. clouds, haze and dust change the sky colours; the fog takes the horizon colour so far geometry melts into it
  mix3(_a, C.ocZenNight, C.ocZenDay, day); mix3(out.zenith, out.zenith, _a, wx.cloud * 0.92);
  mix3(_a, C.ocHorNight, C.ocHorDay, day); mix3(out.horizon, out.horizon, _a, wx.cloud * 0.92);
  mix3(_a, C.dustNight, C.dustDay, day);
  mix3(out.horizon, out.horizon, _a, wx.tint * 0.85); mix3(out.zenith, out.zenith, _a, wx.tint * 0.5);
  mix3(out.zenith, out.zenith, out.horizon, wx.haze * 0.85);
  set(out.fogColor, out.horizon);
  out.fogDensity = wx.fog;
  mix3(out.ground, out.horizon, out.hemiGround, 0.5); scale3(out.ground, 0.45);
  const glow = nf * lerp(0.03, 0.075, wx.cloud) * (1 + 0.5 * wx.haze);     // the city lighting the low sky at night
  set(out.glow, C.glow); scale3(out.glow, glow);
  out.stars = nf * nf * clamp01(1 - wx.cloud * 1.35) * (1 - wx.haze);

  // 4. ambient: clouds are a big soft light by day and a ceiling that bounces the city glow back at night
  mix3(_a, C.hemCloudNight, C.hemCloudDay, day); mix3(out.hemiSky, out.hemiSky, _a, wx.cloud * 0.8);
  mix3(_a, C.dustNight, C.dustDay, day);                       // dust shifts the hue of the ambient light, not its level
  scale3(_a, luminance(out.hemiSky) / Math.max(1e-4, luminance(_a))); mix3(out.hemiSky, out.hemiSky, _a, wx.tint * 0.5);
  hemI *= 1 + 0.45 * wx.cloud * day - 0.12 * wx.cloud * nf + 0.2 * wx.haze;
  scale3(out.hemiGround, 1 + 0.3 * wx.cloud * nf);
  out.hemiIntensity = hemI;

  // 5. cloud colours for the sky shader
  out.cloud = wx.cloud;
  mix3(out.cloudLit, C.cloudLitDay, C.cloudLitOver, wx.cloud); scale3(out.cloudLit, 0.7 + 0.3 * sunUp);
  mix3(out.cloudLit, out.cloudLit, C.cloudLitNight, nf);
  scale3(_b, 1.1); mix3(out.cloudLit, out.cloudLit, _b, dusk * (1 - wx.cloud * 0.7) * 0.75);
  mix3(out.cloudDark, C.cloudDarkDay, C.cloudDarkOver, wx.cloud); mix3(out.cloudDark, out.cloudDark, C.cloudDarkNight, nf);

  // 6. bloom follows the light level: by day only emitters and glints should glow, never a sunlit wall
  const wet = Math.min(1, wx.rain + wx.haze);
  out.bloomThreshold = lerp(1.8, 1.0, nf);
  out.bloomStrength = lerp(0.25, 0.55, nf) + 0.12 * nf * wet;

  out.rain = wx.rain; out.wind = wx.wind; out.lightning = wx.lightning; out.haze = wx.haze;
  return out;
}
