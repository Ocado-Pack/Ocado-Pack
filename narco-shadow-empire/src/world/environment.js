// ctx.env - sky dome, sun / moon key light, hemisphere light, fog, time of day, weather state and wetness
// (docs/ARCHITECTURE.md section 5). The numbers come from skymodel.js (pure, unit-tested); this file turns them into
// three.js objects: a shader sky dome, one shadow-casting DirectionalLight, a HemisphereLight, FogExp2, exposure,
// bloom level and a small prefiltered reflection map (scene.environment) so wet and metallic surfaces have something
// to mirror.
//
//   const env = createEnvironment(ctx);
//   env.setTime(22.5, { instant: true });  env.setWeather('rain', { intensity: 1, instant: true });
//
// Works without a renderer too (ctx.gfx absent or unavailable): the clock, weather, wetness and events still run.
import * as THREE from 'three';
import { clamp01, TAU } from '../core/util.js';
import { WEATHER, computeSky, makeSky, weatherParams, blendWeather, wrap24 } from './skymodel.js';

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );   // rotation only: the dome is always centred on the camera
    gl_Position = p.xyww;                                                       // ... and always on the far plane
  }`;

const SKY_FRAG = /* glsl */`
  uniform vec3 uZenith, uHorizon, uGround, uGlow, uSunDir, uMoonDir, uSunColor, uMoonColor, uCloudLit, uCloudDark, uFlashDir;
  uniform float uSunDisc, uSunHalo, uMoonDisc, uStars, uCloud, uTime, uFlash, uDither;
  uniform vec2 uScroll;
  varying vec3 vDir;

  float hash12( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
  float hash13( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
  float vnoise( vec2 p ) {
    vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( hash12( i ), hash12( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hash12( i + vec2( 0.0, 1.0 ) ), hash12( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
  }
  float fbm( vec2 p ) {
    float a = 0.5, s = 0.0;
    for ( int i = 0; i < 5; i ++ ) { s += a * vnoise( p ); p = p * 2.03 + vec2( 17.1, 9.3 ); a *= 0.5; }
    return s / 0.96875;
  }

  void main() {
    vec3 d = normalize( vDir );
    float h = d.y, up = clamp( h, 0.0, 1.0 );
    vec3 col = mix( uHorizon, uZenith, pow( up, 0.45 ) );
    float fadeH = smoothstep( 0.0, 0.14, h );
    float cov = uCloud;
    vec3 ccol = mix( uCloudDark, uCloudLit, 0.5 );

    #ifndef PROBE
      // clouds: noise on a dome-projected plane, drifting with the wind
      vec2 cuv = d.xz / ( up + 0.18 ) * 0.55 + uScroll;
      float n = fbm( cuv ), n2 = fbm( cuv * 2.7 + 11.0 );
      float edge = 1.0 - uCloud * 1.05;
      cov = smoothstep( edge - 0.12, edge + 0.28, n + ( n2 - 0.5 ) * 0.25 );
      ccol = mix( uCloudDark, uCloudLit, smoothstep( 0.25, 0.85, n2 * 0.6 + n * 0.5 ) );
      ccol += uSunColor * uSunHalo * pow( max( dot( d, uSunDir ), 0.0 ), 6.0 ) * 0.45;      // brighter toward the sun
    #endif
    col = mix( col, ccol, cov * fadeH );
    float open = 1.0 - cov * fadeH;

    #ifndef PROBE
      // sun: disc + aureole
      float sd = dot( d, uSunDir ), sdp = max( sd, 0.0 );
      col += uSunColor * uSunDisc * smoothstep( 0.99962, 0.99978, sd ) * open * open;
      col += uSunColor * uSunHalo * ( pow( sdp, 180.0 ) * 0.9 + pow( sdp, 12.0 ) * 0.22 ) * ( 0.35 + 0.65 * open );
      // moon: a 1.6 degree disc (stylised, about six times the real one) with limb shading and maria, plus a faint halo
      float md = dot( d, uMoonDir ), mdp = max( md, 0.0 );
      vec3 mx = normalize( cross( uMoonDir, vec3( 0.0, 1.0, 0.0 ) ) ), my = cross( mx, uMoonDir );
      vec2 mp = vec2( dot( d, mx ), dot( d, my ) ) / 0.02792;
      float limb = sqrt( max( 0.0, 1.0 - dot( mp, mp ) ) );
      float maria = 0.5 + 0.5 * smoothstep( 0.3, 0.7, vnoise( mp * 1.9 + 4.0 ) * 0.65 + vnoise( mp * 4.7 ) * 0.35 );
      float disc = smoothstep( 0.99958, 0.99964, md ) * open * step( 0.001, uMoonDisc );
      col = mix( col, uMoonColor * uMoonDisc * maria * ( 0.55 + 0.45 * limb ), disc );
      col += uMoonColor * uMoonDisc * ( pow( mdp, 900.0 ) * 0.06 + pow( mdp, 60.0 ) * 0.012 ) * ( 0.3 + 0.7 * open );
      // stars: at most one per cell, jittered inside it, always about one pixel in radius whatever the resolution
      if ( uStars > 0.001 ) {
        vec3 sp = d * 140.0, cell = floor( sp ), f = fract( sp ) - 0.5;
        float r = hash13( cell );
        vec3 off = ( vec3( hash13( cell + 1.7 ), hash13( cell + 5.3 ), hash13( cell + 9.1 ) ) - 0.5 ) * 0.4;
        float rad = clamp( length( fwidth( sp ) ) * 0.8, 0.05, 0.3 );
        float bright = pow( fract( r * 57.31 ), 4.0 ) * 3.0 + 0.2;
        float star = step( 0.985, r ) * smoothstep( rad, rad * 0.25, length( f - off ) ) * bright;
        float twinkle = 0.75 + 0.25 * sin( uTime * ( 1.5 + 5.0 * fract( r * 91.7 ) ) + r * 60.0 );
        col += vec3( 0.9, 0.95, 1.0 ) * star * twinkle * uStars * smoothstep( 0.03, 0.3, h ) * open * ( 1.0 - disc );
      }
      // lightning lights the cloud deck from inside, strongest in one direction
      float lobe = pow( max( dot( normalize( d.xz + vec2( 1e-4 ) ), uFlashDir.xz ), 0.0 ), 2.0 );
      col += uFlash * vec3( 0.55, 0.62, 0.8 ) * ( 0.25 + 0.75 * cov ) * ( 0.35 + 0.65 * lobe );
    #endif

    col = mix( col, uHorizon, exp( - up * 14.0 ) );                 // the horizon line is exactly the fog colour
    col += uGlow * exp( - up * 6.0 ) * ( 0.7 + 0.6 * cov );         // city glow under the clouds: far roofs read as silhouettes
    if ( h < 0.0 ) col = mix( col, uGround, smoothstep( - 0.02, - 0.3, h ) );

    gl_FragColor = vec4( col, 1.0 );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb += ( hash12( gl_FragCoord.xy ) + hash12( gl_FragCoord.xy + 7.7 ) - 1.0 ) / 255.0 * uDither;
  }`;

// Coloured panels around the horizon of the reflection probe: stand-ins for the neon and lamps of a night city, so
// puddles, car paint and glass pick up coloured glints even where no real lamp is close. [hex, azimuth deg, height m, w, h]
const PROBE_PANELS = [[0xff2d95, 20, 5, 9, 2.4], [0x22e0ff, 95, 7, 7, 3], [0xffa040, 150, 4, 12, 2], [0x3dff8a, 215, 6, 6, 2.2], [0xffa040, 265, 5, 10, 2], [0xff5a3c, 320, 8, 7, 2.6]];

/**
 * @param {object} ctx
 * @param {{hour?:number, weather?:string, intensity?:number}} [opts] starting state (defaults: 22.5, clear)
 */
export function createEnvironment(ctx, opts = {}) {
  const settings = ctx.settings;
  const gfx = ctx.has('gfx') && !ctx.gfx.unavailable ? ctx.gfx : null;
  const scene = gfx ? gfx.scene : null;
  const rng = ctx.rng.fork('env');

  let hour = wrap24(opts.hour === undefined ? 22.5 : opts.hour), goalHour = null, clockRate = 0;
  let weather = WEATHER[opts.weather] ? opts.weather : 'clear', intensity = opts.intensity === undefined ? 1 : clamp01(opts.intensity);
  const wxFrom = weatherParams(weather, intensity), wxTo = weatherParams(weather, intensity), wx = weatherParams(weather, intensity);
  let wxT = 1, wxSeconds = 8;
  let wetness = wx.rain > 0.02 ? 1 : 0, flash = 0, flashT = -1, flashPower = 0, nextStrike = 5, windClock = rng.float(0, 100);
  let night = null, lastTimeEvent = -1, lastEventHour = -1, envKey = '', envAt = -10, envForce = true;
  const sky = computeSky(hour, wx, makeSky());

  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(), keyDir = new THREE.Vector3(0, 1, 0);
  const wind = { x: 0, z: 0, speed: 0 };

  // ---- lights and fog ------------------------------------------------------------------------------------------------
  const key = new THREE.DirectionalLight(0xffffff, 0);
  key.name = 'env.key';
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.05;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemi.name = 'env.hemi';
  const fog = new THREE.FogExp2(0x000000, 0.004);
  let shadowHalf = 60;
  function applyShadowSettings() {
    const mode = settings.get('shadows'), size = settings.get('shadowMapSize') || 1024;
    key.castShadow = mode !== 'off';
    shadowHalf = mode === 'low' ? 42 : 60;                     // metres around the focus; smaller on 'low' to keep the texels fine
    const cam = key.shadow.camera;
    cam.left = cam.bottom = -shadowHalf; cam.right = cam.top = shadowHalf; cam.near = 1; cam.far = 340;
    cam.updateProjectionMatrix();
    if (key.shadow.mapSize.x !== size) {
      key.shadow.mapSize.set(size, size);
      if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    }
  }
  applyShadowSettings();
  const offSettings = [settings.onChange('shadows', applyShadowSettings), settings.onChange('shadowMapSize', applyShadowSettings)];

  // ---- sky dome + reflection probe -----------------------------------------------------------------------------------
  const v3 = () => ({ value: new THREE.Vector3() }), col = () => ({ value: new THREE.Color() });
  const u = {
    uZenith: col(), uHorizon: col(), uGround: col(), uGlow: col(), uSunColor: col(), uMoonColor: col(), uCloudLit: col(), uCloudDark: col(),
    uSunDir: v3(), uMoonDir: v3(), uFlashDir: { value: new THREE.Vector3(1, 0, 0) },
    uSunDisc: { value: 0 }, uSunHalo: { value: 0 }, uMoonDisc: { value: 0 }, uStars: { value: 0 }, uCloud: { value: 0 },
    uTime: { value: 0 }, uFlash: { value: 0 }, uDither: { value: 0 }, uScroll: { value: new THREE.Vector2() },
  };
  const skyMaterial = (probe) => new THREE.ShaderMaterial({
    name: probe ? 'env.skyProbe' : 'env.sky', uniforms: u, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, defines: probe ? { PROBE: 1 } : {},
    side: THREE.BackSide, depthWrite: false, depthTest: !probe, fog: false, extensions: { derivatives: true },
  });
  const domeGeo = new THREE.SphereGeometry(1, 32, 16);
  const dome = new THREE.Mesh(domeGeo, skyMaterial(false));
  dome.name = 'env.sky'; dome.frustumCulled = false; dome.renderOrder = 1000; dome.matrixAutoUpdate = false;   // drawn after the solid scene: only uncovered pixels are shaded

  const probeScene = new THREE.Scene(), probeDome = new THREE.Mesh(domeGeo, skyMaterial(true)), panels = [];
  probeDome.frustumCulled = false; probeDome.renderOrder = -1;
  probeScene.add(probeDome);
  for (const [hex, az, y, w, h] of PROBE_PANELS) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
    const a = (az * Math.PI) / 180;
    m.position.set(Math.cos(a) * 30, y, Math.sin(a) * 30); m.lookAt(0, y, 0);
    m.userData.color = new THREE.Color(hex);
    probeScene.add(m); panels.push(m);
  }
  const pmrem = gfx ? new THREE.PMREMGenerator(gfx.renderer) : null;
  let envTarget = null;
  function refreshEnvironment() {
    if (!pmrem || gfx.contextLost) return;
    const k = sky.nightFactor * 2.2;                             // the panels only exist at night
    for (const p of panels) { p.visible = k > 0.01; p.material.color.copy(p.userData.color).multiplyScalar(k); }
    const dither = u.uDither.value; u.uDither.value = 0;
    const next = pmrem.fromScene(probeScene, 0.03, 0.1, 100);
    u.uDither.value = dither;
    scene.environment = next.texture;
    if (envTarget) envTarget.dispose();
    envTarget = next;
    envForce = false; envAt = ctx.time.real;
  }
  if (scene) {
    scene.add(key, key.target, hemi, dome);
    scene.fog = fog;
  }
  const offRestore = ctx.events.on('gfx:contextrestored', () => { envForce = true; });

  // ---- apply the model to the scene ------------------------------------------------------------------------------------
  const setC = (c, a, k = 1) => c.setRGB(a[0] * k, a[1] * k, a[2] * k);
  function apply() {
    const s = sky;
    sunDir.fromArray(s.sunDir); moonDir.fromArray(s.moonDir); keyDir.fromArray(s.keyDir);
    setC(key.color, s.keyColor); key.intensity = s.keyIntensity;
    const reduced = !!settings.get('reducedMotion'), boost = flash * (reduced ? 0.7 : 2.4);
    setC(hemi.color, s.hemiSky); setC(hemi.groundColor, s.hemiGround);
    hemi.color.lerp(_cool, Math.min(1, boost * 0.4));
    hemi.intensity = s.hemiIntensity + boost;
    setC(fog.color, s.fogColor);
    fog.density = Math.max(s.fogDensity, 1.2 / (settings.get('drawDistance') || 320));   // scenery beyond the draw distance is mostly fog
    setC(u.uZenith.value, s.zenith); setC(u.uHorizon.value, s.fogColor); setC(u.uGround.value, s.ground); setC(u.uGlow.value, s.glow);
    setC(u.uSunColor.value, s.sunColor); setC(u.uMoonColor.value, s.moonColor); setC(u.uCloudLit.value, s.cloudLit); setC(u.uCloudDark.value, s.cloudDark);
    u.uSunDir.value.copy(sunDir); u.uMoonDir.value.copy(moonDir);
    u.uSunDisc.value = s.sunDisc; u.uSunHalo.value = s.sunHalo; u.uMoonDisc.value = s.moonDisc; u.uStars.value = s.stars; u.uCloud.value = s.cloud;
    u.uFlash.value = flash; u.uTime.value = reduced ? 0 : ctx.time.real;
    if (gfx) {
      u.uDither.value = gfx.postActive ? 0 : 1;                  // the post chain dithers the final image itself
      gfx.setExposure(s.exposure);
      gfx.setBloom({ threshold: s.bloomThreshold, strength: s.bloomStrength });
    }
  }
  const _cool = new THREE.Color(0.8, 0.86, 1), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _f = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

  /** Keep the shadow camera around the player (or ahead of the camera), snapped to shadow texels so edges do not crawl. */
  function followShadow() {
    if (!gfx) return;
    if (ctx.has('player') && ctx.player.position && typeof ctx.player.position.x === 'number') _f.copy(ctx.player.position);
    else { gfx.camera.getWorldDirection(_f); _f.y = 0; _f.multiplyScalar(18).add(gfx.camera.position); _f.y = 0; }
    _x.crossVectors(_up, keyDir).normalize(); _y.crossVectors(keyDir, _x);
    const texel = (2 * shadowHalf) / key.shadow.mapSize.x;
    const fx = Math.round(_f.dot(_x) / texel) * texel, fy = Math.round(_f.dot(_y) / texel) * texel, fz = _f.dot(keyDir);
    key.target.position.set(0, 0, 0).addScaledVector(_x, fx).addScaledVector(_y, fy).addScaledVector(keyDir, fz);
    key.position.copy(key.target.position).addScaledVector(keyDir, 160);
  }

  function lightning(dt) {
    if (wx.lightning > 0.05) {
      nextStrike -= dt * wx.lightning;
      if (nextStrike <= 0) {
        nextStrike = rng.float(5, 16);
        flashT = 0; flashPower = rng.float(0.6, 1);
        const a = rng.float(0, TAU);
        u.uFlashDir.value.set(Math.cos(a), 0, Math.sin(a));
        ctx.events.emit('env:lightning', { strength: flashPower, delay: rng.float(0.4, 3.5) });   // delay: seconds until the thunder
      }
    }
    if (flashT < 0) { flash = 0; return; }
    flashT += dt;
    if (settings.get('reducedMotion')) {                           // one slow, soft pulse instead of a strobe
      flash = flashT < 0.9 ? 0.35 * flashPower * Math.sin((Math.PI * flashT) / 0.9) : 0;
      if (flashT >= 0.9) flashT = -1;
    } else {
      let f = 0;
      for (const [t0, a] of [[0, 1], [0.09, 0.55], [0.21, 0.85]]) if (flashT >= t0) f += a * Math.exp(-(flashT - t0) * 18);
      flash = Math.min(1, f) * flashPower;
      if (flashT > 0.75) flashT = -1;
    }
  }

  const env = {
    get hour() { return hour; },
    get isNight() { return sky.isNight; },
    /** 0 by day .. 1 at night, smooth around 19:00 and 06:00 (lamps, neon and lit windows fade with it) */
    get nightFactor() { return sky.nightFactor; },
    get weather() { return weather; },
    get intensity() { return intensity; },
    /** 0 dry .. 1 soaked: rises over about 20 s of rain, dries over minutes */
    get wetness() { return wetness; },
    /** current rain amount 0-1.3 after transitions (0 = none) */
    get rain() { return wx.rain; },
    get cloud() { return wx.cloud; },
    /** lightning flash 0-1 right now */
    get flash() { return flash; },
    /** direction TO the sun / the moon / whichever is the key light right now (unit vectors) */
    sunDir, moonDir, keyDir,
    /** wind in m/s, world axes; blows mostly west, off the sea */
    wind,
    /** the full computed state (skymodel.js makeSky): colours are linear RGB arrays. Read-only. */
    state: sky,
    key, hemi, fog, dome,

    /** @param {number} h 0-24 @param {{instant?:boolean}} [o] without `instant` the clock runs forward to `h` in about 4 s */
    setTime(h, o = {}) {
      if (!Number.isFinite(h)) return;
      if (o.instant) { hour = wrap24(h); goalHour = null; envForce = true; lastTimeEvent = -1; refresh(0); } else goalHour = wrap24(h);
    },
    /** Game minutes per real second (0 = the clock stands still; missions set the time). */
    setClockRate(r) { clockRate = Number.isFinite(r) ? Math.max(0, r) : 0; },
    /** @param {'clear'|'rain'|'storm'|'fog'|'overcast'|'dust'} kind @param {{intensity?:number, instant?:boolean, seconds?:number}} [o] */
    setWeather(kind, o = {}) {
      if (!WEATHER[kind]) { console.warn('[env] unknown weather:', kind); return; }
      weather = kind; intensity = o.intensity === undefined ? 1 : clamp01(o.intensity);
      blendWeather(wxFrom, wx, wx, 0); weatherParams(kind, intensity, wxTo);
      if (o.instant) { wxT = 1; blendWeather(wx, wxTo, wxTo, 0); wetness = wx.rain > 0.02 ? 1 : wetness; envForce = true; refresh(0); }
      else { wxT = 0; wxSeconds = o.seconds > 0 ? o.seconds : 8; }
      ctx.events.emit('env:weather', { weather, intensity });
    },
    /** Force the wetness (missions that start on wet streets, tests). */
    setWetness(v) { wetness = clamp01(v); },
    /** Rebuild the reflection map now (normally throttled and automatic). */
    refreshEnvironment() { envForce = true; refresh(0); },

    update(dt) {
      if (!ctx.flow.simPaused) {                                   // the clock belongs to the simulation
        if (goalHour !== null) {
          const left = wrap24(goalHour - hour), stepH = Math.max(left, 0.5) * Math.min(1, dt / 0.9) + dt * 0.4;
          if (stepH >= left) { hour = goalHour; goalHour = null; } else hour = wrap24(hour + stepH);
        } else if (clockRate > 0) hour = wrap24(hour + (clockRate * dt) / 60);
      }
      if (wxT < 1) { wxT = Math.min(1, wxT + dt / wxSeconds); const t = wxT * wxT * (3 - 2 * wxT); blendWeather(wx, wxFrom, wxTo, t); }
      if (wx.rain > 0.02) wetness = Math.min(1, wetness + (dt * Math.min(1, wx.rain)) / 20);
      else wetness = Math.max(0, wetness - dt / (sky.isNight ? 240 : 120));
      lightning(dt);
      windClock += dt;
      const a = Math.PI * 0.92 + 0.3 * Math.sin(windClock * 0.05), gust = 1 + 0.22 * Math.sin(windClock * 0.83) + 0.1 * Math.sin(windClock * 2.1);
      wind.speed = wx.wind * gust; wind.x = Math.cos(a) * wind.speed; wind.z = Math.sin(a) * wind.speed;
      u.uScroll.value.x += wind.x * dt * 0.0025; u.uScroll.value.y += wind.z * dt * 0.0025;
      refresh(dt);
    },

    dispose() {
      offSettings.forEach((off) => off()); offRestore();
      if (scene) { scene.remove(key, key.target, hemi, dome); if (scene.fog === fog) scene.fog = null; if (envTarget && scene.environment === envTarget.texture) scene.environment = null; }
      if (envTarget) envTarget.dispose();
      if (pmrem) pmrem.dispose();
      domeGeo.dispose(); dome.material.dispose(); probeDome.material.dispose();
      for (const p of panels) { p.geometry.dispose(); p.material.dispose(); }
      if (key.shadow.map) key.shadow.map.dispose();
    },
  };

  /** Recompute the model, push it into the scene, fire events, refresh the reflection map when the light has changed. */
  function refresh() {
    computeSky(hour, wx, sky);
    apply();
    followShadow();
    const now = ctx.time.real;
    if (night !== sky.isNight) { night = sky.isNight; ctx.events.emit('env:night', { night }); }
    if (Math.abs(hour - lastEventHour) > 1e-4 && (lastTimeEvent < 0 || now - lastTimeEvent >= 0.5)) {
      lastEventHour = hour; lastTimeEvent = now;
      ctx.events.emit('env:time', { hour });
    }
    if (pmrem) {
      const k = `${Math.round(hour * 4)}|${Math.round(wx.cloud * 10)}|${Math.round(wx.haze * 10)}|${Math.round(wx.tint * 5)}|${Math.round(sky.nightFactor * 10)}`;
      if (envForce || (k !== envKey && now - envAt > 1.5)) { envKey = k; refreshEnvironment(); }
    }
  }

  refresh();
  ctx.register('env', env, { order: 50, runWhenPaused: true });
  return env;
}
