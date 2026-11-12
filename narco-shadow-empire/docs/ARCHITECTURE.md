# NARCO: SHADOW EMPIRE — Operation Numbers · Architecture & Contracts

A cinematic 3D investigation game whose every gate is an ASVAB **Arithmetic Reasoning (AR)** or **Mathematics
Knowledge (MK)** problem. Browser game, three.js r160, zero runtime dependencies, **zero network requests**.

This file is the contract between modules. If you build a module, implement the API below *exactly* (names,
arguments, return shapes). If you consume a module, code against this file and the real source if it exists.

---

## 1. Ground rules

- **Plain ES modules, plain JavaScript** (no TypeScript, no framework, no build step in dev). JSDoc for types.
- **three.js r160 only**, vendored: `import * as THREE from 'three'` and `import {…} from 'three/addons/…'`
  (import map in `index.html` → `vendor/three/`). Do not use APIs newer than r160 — check `vendor/three` when unsure.
  Lights use physical units (r155+): point/spot intensities are candela-like (tens to thousands), not 0–1.
- **Offline**: no fetch/XHR/CDN/fonts/images from the network, ever. All art is procedural (canvas textures,
  generated geometry) and all audio is synthesized with WebAudio. System font stacks only.
- **Single-file build**: `npm run build` bundles everything into `dist/narco-shadow-empire.html` (opens by
  double-click from `file://`). So: no `fetch()` of local files, no `new Worker(url)`, no `import.meta.url` asset
  loading, no dynamic `import()` with computed paths. CSS lives in `src/styles/*.css` (listed in `index.html`).
- **Pure logic stays pure**: everything under `src/math/` and `src/learning/` and `src/core/{ltext,util,events,
  rng,storage,settings,i18n,flow}.js` must import neither `three` nor touch `document/window` at module top level,
  so `node --test` can import it.
- **Bilingual**: every learner- or player-facing string exists in English and Spanish. Use `L(en, es)` objects
  (`src/core/ltext.js`) for content, and `ctx.i18n.addStrings({en:{…}, es:{…}})` + `ctx.i18n.t('key')` for UI chrome.
  Spanish must be natural, correct Latin-American Spanish (with accents: á é í ó ú ñ ¿ ¡).
- **Units**: meters, seconds, radians. +X east, +Z south (north = −Z), +Y up.
- **yaw**: three.js `rotation.y` of a model that faces −Z. `yaw 0` = north, `+π/2` = west, `π` = south, `−π/2` = east.
  `forward(yaw) = (−sin yaw, 0, −cos yaw)`. Helpers and `FACE.{N,W,S,E}` in `src/core/util.js`. Author every model
  facing −Z.
- **File ownership is exclusive.** Only edit files you own. Never edit `src/core/*` (except the file you were given),
  `src/world/layout.js`, `index.html`, `src/main.js`, `package.json`, `tools/*`, `docs/*` unless told to.
- **No git writes** (no add/commit/stash/checkout/reset). The orchestrator commits.
- **A system never throws because another system is missing.** `ctx.<name>` is always callable (see null objects).
- Fictional story only. No real organisations, places or people, and nothing that reads as instructions for real
  crime. The "contraband" is always unspecified *unregistered cargo*; the gameplay is audit math.

---

## 2. Repository layout

```
index.html                     dev entry (import map + stylesheet list + <canvas id="game"> + <div id="ui">)
src/main.js                    boot / wiring (integration owns)
src/core/                      context, events, rng, storage, settings, i18n, flow, loop, util, ltext, params, input, audio
src/world/layout.js            district layout: THE spatial contract (anchors, stations, footprints, zones, features)
src/world/                     renderer, post, resolution*, environment, skymodel*, weather, textures, materials, lights, props,
                               city, warehouse, garage, hotel, pier, collision, zones, interact, character, npc, player, camera,
                               vehicle, traffic                     (* pure modules: no three.js, unit-tested in Node)
src/math/                      question engine (pure): rational, format, kit, engine, registry, topics, answer, linear,
                               templates/ar/*.js, templates/mk/*.js
src/learning/                  learner model (pure): profile, mastery, adaptive, srs, tutor, session, exam, recommend
src/ui/                        DOM UI: ui (base), hud, menu, pause, settings, phone, map, document, dialogbox,
                               puzzle, tutor, debrief, dashboard, drills, exam, touch, visuallab/*
src/game/                      dialog, cinematics, missions (system + defs), campaign, save, app (flow controller), selftest
src/i18n/                      UI string tables per area (en/es)
src/styles/                    base.css hud.css menus.css phone.css puzzle.css study.css visuallab.css touch.css
dev/                           one harness page per module (dev/world.html, dev/player.html, …) — never shipped
tests/unit/*.test.mjs          node --test (math + learning)
tests/e2e/*.e2e.cjs            Playwright scenarios (tools/e2e.cjs)
tools/                         serve.mjs (dev server), shot.cjs (screenshot/eval), e2e.cjs, build.mjs (single-file)
vendor/three/                  three.module.js (r160) + addons/
```

---

## 3. The context (`src/core/context.js`)

`const ctx = createContext()` — one object passed to every factory. Also exposed as `window.__game`.

```js
ctx.events     // on(type, fn) → off · once · off · emit(type, payload) · wait(type) → Promise
ctx.settings   // get(key) · set(key, value) · setMany(obj) · applyQuality(preset) · onChange(key|'*', fn) → off · all()
ctx.storage    // get(key, fallback) · set(key, value) · remove(key) · clear() · persistent · usingFallback
ctx.i18n       // t(key, vars) · tl(LText) · learn(LText) · lang · learnLang · addStrings({en,es}) · onLangChange(fn)
ctx.flow       // mode · setMode(m) · pushModal(id, opts) → close() · popModal(id) · has(id) · worldInput · simPaused · cursorFree
ctx.loop       // start() · stop() · step(dt) · fastForward(seconds, stepDt?, each?) · renderOnce() · fps · renderEnabled
ctx.time       // { now (sim seconds), real, dt, frame, simFrame }
ctx.rng        // seeded RNG for non-learning randomness (createRng in src/core/rng.js)
ctx.params     // URL params: quality, test, seed, lang, nosave, mission, start, norender, fps
ctx.test       // true with ?test=1 (in-memory storage, deterministic seed)
ctx.register(name, system, { order, runWhenPaused })   // sets ctx[name]; system.update(dt, ctx) is called every frame
ctx.has(name)  // is a REAL system registered?
ctx.debug      // bag for test hooks (each module may add functions here)
```

**Null objects.** Before a system is registered, `ctx.<name>` (for every name in `SYSTEM_NAMES`) is a deep null
object: any property chain is callable and returns `undefined` (`ctx.ui.hud.setObjective(x)` is a no-op). Use
`ctx.has('player')` before *reading state* from a system that might be absent. Never `await` a value you didn't
create unless the contract says it returns a Promise.

**Factories.** Each module exports `createXxx(ctx)` which builds the system, subscribes to events, **registers
itself with `ctx.register`**, and returns it. Factories must be cheap to call in a harness page.

**Update order** (`order` option): input 0 · missions 10 · player 20 · vehicle 25 · traffic 28 · npcs 30 ·
cameraRig 40 · interact 45 · zones 46 · env 50 · weather 55 · lights 60 · audio 70 · ui 80 · visualLab 85.
Ambient/visual systems (env, weather, lights, audio, ui, cameraRig, gfx) register with `runWhenPaused: true`;
gameplay systems (missions, player, vehicle, traffic, npcs, interact) do not. Rendering happens after all updates
via `ctx.gfx.render(dt)`; then `ctx.input.endFrame()`.

**Flow.** `mode`: `'boot' | 'menu' | 'world' | 'exam' | 'drills'`. Modals (pause, puzzle, phone, dialog, cinematic,
document, debrief, dashboard, settings) are pushed with `ctx.flow.pushModal(id, {capturesInput, pausesSim,
freeCursor})`. Gameplay code checks `ctx.flow.worldInput`; the sim stops when `ctx.flow.simPaused`.

### Events (payloads)

| event | payload |
|---|---|
| `settings:changed` | `{key, value, prev}` |
| `flow:mode` / `flow:modal` | `{mode, prev}` / `{stack, top}` |
| `input:action` | `{action, device}` — edge-triggered on every action press (UI listens for `pause`, `phone`, `map`, `tutor`, `skip`) |
| `zone:enter` / `zone:exit` | `{id, zone}` |
| `interact:focus` | `{id|null, interactable|null}` |
| `interact:use` | `{id, interactable}` |
| `player:step` / `player:jump` / `player:land` | `{surface, running}` / `{}` / `{speed}` |
| `vehicle:enter` / `vehicle:exit` / `vehicle:collision` | `{vehicle}` / `{vehicle}` / `{speed}` |
| `env:time` / `env:night` / `env:weather` | `{hour}` (≤ 2/s) / `{night:boolean}` (at 19:00 and 06:00) / `{weather, intensity}` |
| `env:lightning` | `{strength 0–1, delay}` — storm only; `delay` = seconds until the thunder should be heard |
| `world:feature` | `{id, on}` |
| `mission:start` / `mission:step` / `mission:objective` / `mission:checkpoint` / `mission:complete` | `{missionId}` / `{missionId, stepId, index, total, phase}` / `{text, marker}` / `{missionId, stepId}` / `{missionId, report}` |
| `puzzle:open` / `puzzle:answer` / `puzzle:solved` / `puzzle:close` | `{question, spec}` / `{questionId, correct, attempt, hintLevel}` / `{questionId, result}` / `{aborted}` |
| `tutor:hint` | `{questionId, level, kind}` |
| `learning:recorded` | `{result, xp, levelChange}` (after `profile.record`) |
| `learning:level` | `{topic, from, to}` |
| `learning:reset` / `learning:aid` | `{imported}` (profile reset or imported) / `{aid:'calculator'}` (emitted by the phone calculator) |
| `session:phase` / `session:end` | `{phase, missionId}` / `{report}` |
| `exam:start` / `exam:section` / `exam:finish` | `{config}` / `{report}` / `{report}` |
| `dialog:line` / `dialog:end` | `{speaker, text}` / `{}` |
| `cinematic:start` / `cinematic:end` | `{id}` |
| `ui:menu` | `{action:'continue'|'new'|'mission'|'drills'|'exam'|'dashboard'|'freeroam'|'quit', missionId?}` — the app controller handles |
| `gfx:resize` / `gfx:quality` | `{cssW, cssH, bufferW, bufferH, pixelRatio}` / `{preset}` |
| `gfx:contextlost` / `gfx:contextrestored` | `{}` — GPU resources are rebuilt automatically; re-create anything you cached from the GPU |
| `save:written` / `save:loaded` | `{slot}` |
| `audio:unlocked` | `{}` |

### Settings keys
See `DEFAULT_SETTINGS` and `QUALITY_PRESETS` in `src/core/settings.js` (language, accessibility, graphics, audio,
controls, learning). Every system that depends on a setting must react to `ctx.settings.onChange`.

---

## 4. World layout (`src/world/layout.js`) — read it

Fictional port city **Puerto Ceniza**. Four 12 m roads form a `#`: **Avenida del Faro** (north, z −47…−35),
**Calle del Muelle** (south, z 35…47), **Calle Ancla** (west, x −57…−45), **Paseo de la Marea** (east, x 45…57).
That makes a 3×3 grid of cells: the **Manzana Central** neon block in the middle (≤ 14 m tall, cut by two alleys),
**Hotel Mirador** (north; lobby + ops room + rooftop at y 18), **Bodega 7** warehouse compound (south),
**Taller Rueda** garage + gas station (west), **El Malecón** waterfront + ferry pier (east; the arrival point), and
four backdrop corner cells (radio tower NW, lighthouse NE, power plant SW, container port + crane SE).

`layout.js` exports `ROADWAYS, LANES, CELLS, DRIVEWAYS, CENTRAL, HOTEL, GARAGE, WAREHOUSE, PIER, LANDMARKS,
ANCHORS, STATIONS, FEATURES, ZONES, MAP_LABELS, ROUTE_CH1, Y_ROAD (0), Y_WALK (0.15), Y_ROOF (18)`.
Builders must match footprints/door openings and put a visible prop at every station anchor. Missions and UI use
**only** anchor/station ids.

---

## 5. Rendering & world systems

### `ctx.gfx` — renderer (`src/world/renderer.js`, `post.js`, `resolution.js`) — **implemented**
```js
gfx.renderer, gfx.scene, gfx.camera (PerspectiveCamera, fov = settings.fov, near 0.1, far 1200), gfx.canvas, gfx.composer
gfx.render(dt)                 // called by the loop
gfx.resize()                   // also automatic: window resize, ResizeObserver, devicePixelRatio change
gfx.getInfo()                  // {cssW, cssH, bufferW, bufferH, pixelRatio, preset, is4K, fps, drawCalls, triangles,
                               //  mode, limited, dynamicScale, post, msaa, shadows, frames, webgl2, unavailable, contextLost}
gfx.setExposure(v) · gfx.exposure · gfx.setBloom({strength, radius, threshold, knee}) · gfx.setGrade({contrast, saturation, vignette, split, shadowTint, highlightTint})
gfx.screenToRay(x, y) → {origin, direction} · gfx.project(vec3) → {x, y, visible, depth, behind}  (CSS pixels)
gfx.sample(n = 6) → {luma, min, max, mean, lumas} | null    // draws a frame and reads an n×n pixel grid back (tests, self-test)
gfx.unavailable · gfx.contextLost · gfx.postActive · gfx.maxAnisotropy · gfx.dispose()
```
- **Honest resolution.** `bufferW/H` are the real drawing-buffer size and `is4K` is `bufferW ≥ 3840 && bufferH ≥ 2160` — the
  only test that may put "4K" on screen. `settings.resolutionMode`: `'native'` (min(devicePixelRatio, maxPixelRatio) ×
  renderScale), `'fixed4k'` (an internal buffer of at least 3840×2160 at the window's aspect; the browser scales it down;
  a GPU limit or the 1.5 × UHD pixel budget makes it smaller, sets `limited` and drops the label), `'dynamic'` (native ×
  a factor between pixel ratio 0.5 and native that holds `targetFps`, with back-off so it does not oscillate).
- **Two render paths.** Post chain (HDR half-float target, MSAA `settings.msaa`, optional GTAO `settings.ao`, bloom
  `settings.bloom`, then ONE final pass: ACES tone mapping → contrast / split toning / vignette → sRGB → grain
  `settings.grain` → dither). When bloom, grain, ao and msaa are all off (the `low` preset) the scene is drawn straight to
  the canvas with the renderer's own ACES + sRGB. Custom `ShaderMaterial`s must therefore end with
  `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` to look the same on both paths.
- Reacts live to every graphics setting. `shadows` `'off' | 'low' (PCF) | 'high' (PCF soft)`. Context loss shows a message
  and recovers. If WebGL cannot start, `gfx.unavailable` is true, a bilingual message is shown and every method is a safe
  no-op (`gfx.scene` / `gfx.camera` still exist).
- Light units are r160 physical ones: a white surface facing a directional light of intensity I has radiance I / π.
  Daylight is ≈ 3.3, moonlight ≈ 0.5, a street lamp ≈ 130 cd, a neon tube's spill light ≈ 20 cd; emissive surfaces of
  intensity ≥ 4 glow through the bloom. Brighter lamps wash the frame out.

### `ctx.mats` — materials & procedural textures (`src/world/materials.js`, `textures.js`)
`mats.get(name)` returns a cached PBR material (asphalt, wet asphalt with puddles, sidewalk, concrete, brick, plaster,
corrugated/painted/rusted metal, steel, chain-link (alpha), glass, wood/crate, cardboard, rubber, plastic, fabric,
water, emissive/neon by colour, screens). `mats.text(…)` / `mats.sign(…)` make canvas-text textures for signs,
labels, tags and monitors. Texture resolution follows `settings.textureSize`. Wettable materials read `ctx.env.wetness`
(`dev/render.html` has a working sketch of the technique: darker albedo, lower roughness, mirror-like puddles from noise).

### `ctx.env` — sky, time of day, fog (`src/world/environment.js`, `skymodel.js`) — **implemented**
```js
env.setTime(hour 0–24, {instant?}) · env.hour · env.isNight · env.nightFactor (0–1, smooth) · env.setClockRate(gameMinutesPerRealSecond)
env.setWeather('clear'|'rain'|'storm'|'fog'|'overcast'|'dust', {intensity?:0–1, instant?, seconds?}) · env.weather · env.intensity
env.wetness (0–1) · env.setWetness(v) · env.rain (0–1.3 right now) · env.cloud · env.flash (lightning 0–1) · env.wind {x, z, speed} m/s
env.sunDir · env.moonDir · env.keyDir (Vector3, direction TO the light) · env.key (DirectionalLight) · env.hemi · env.fog · env.dome
env.state                      // everything skymodel.js computed for this moment (linear RGB arrays): fogColor, hemiSky, keyColor, …
env.refreshEnvironment() · env.update(dt) · env.dispose()
```
Day/night changes the sky dome (shader: gradient, clouds, sun, moon, stars, city glow), the one shadow-casting key light
(sun by day, a stylised slow moon at night; the hand-over happens at zero intensity), the hemisphere light, FogExp2 (its
colour is the sky's horizon colour, and never thinner than 1.2 / `settings.drawDistance`), exposure and the bloom level,
and emits `env:night` (lamps, neon and windows listen; fade with `env.nightFactor`). `scene.environment` is a small
prefiltered reflection map of the sky plus, at night, coloured panels standing in for city neon; it is rebuilt when the
light changes materially (throttled). Shadows stay sharp around the player (or ahead of the camera) with texel snapping.
Without a renderer (`?norender=1`) the clock, weather, wetness and events still run.

### `ctx.weather` — rain streaks, splashes, steam, smoke, dust, spray (`src/world/weather.js`) — **implemented**
```js
weather.addEmitter({type:'steam'|'smoke'|'dust'|'spray', position, rate?, size?, rise?, color?, radius?, alpha?}) → {position, enabled, setEnabled(b), setRate(r), remove()}
weather.setLights([{position: Vector3, color, intensity, distance}, …])   // lamps that light the rain; the 4 with the most effect near the camera are used
weather.stats() → {streaks, splashes, particles, emitters} · weather.update(dt) · weather.dispose()
```
Self-driven from `ctx.env` (rain amount, wind, light colours, fog) and `ctx.zones.indoor` (rain fades out indoors).
Rain count = 9000 × `settings.rainDensity` × rain; particles scale with `settings.particles`. Three draw calls.
The light pool (or the vehicle's headlights) should call `weather.setLights` so rain lights up near lamps.

### `ctx.lights` — light pool (`src/world/lights.js`)
```js
lights.add({ position:[x,y,z], color, intensity, distance, type:'point'|'spot', target?:[x,y,z], angle?, penumbra?,
             group:'street'|'neon'|'interior'|'vehicle'|'fx', nightOnly?:true, castShadow?:false, flicker?:0 }) → handle
handle.setEnabled(b) · handle.setIntensity(v) · handle.position (Vector3) · handle.remove()
```
Hundreds of logical lamps, only `settings.maxLights` real three.js lights: each frame the pool assigns real lights to
the most important handles near the camera. Every lamp also gets a cheap emissive/glow sprite so far lamps still read.

### `ctx.world` — builder + features (`src/world/world.js`)
```js
world.build() → Promise           // builds city + lots; reports progress via events 'world:progress' {done, total, label}
world.root (Group) · world.setFeature(id, on) · world.getFeature(id)      // ids in layout FEATURES
world.setInteriorDetail(zoneId, on)                                         // optional perf hook
```
Area builders (`city.js`, `hotel.js`, `garage.js`, `warehouse.js`, `pier.js`) export `buildXxx(ctx, parent)` and
register their colliders, zones, lamps, interactables and features.

### `ctx.collision` — static colliders (`src/world/collision.js`)
All static world collision is **axis-aligned boxes** (the whole city is axis-aligned).
```js
collision.addBox(x0, y0, z0, x1, y1, z1, opts?) → handle        // opts: {tag?, player?:true, vehicle?:auto, camera?:auto, enabled?:true}
collision.addRect(rect, y0, y1, opts?) → handle                 // rect = {x0,x1,z0,z1}
collision.addWalls(rect, y0, y1, thickness, openings?, opts?) → handle[]
      // four walls just INSIDE the rect; openings = [{side:'N'|'S'|'E'|'W', at:<x or z of the opening centre>, width, height?}]
      // (a lintel box is added above `height`)
handle.setEnabled(b) · handle.remove() · handle.box
collision.groundY(x, z, fromY, maxUp?) → y        // highest walkable top at (x,z) that is ≤ fromY + maxUp (default step 0.4); 0 if none
collision.moveCapsule(pos, delta, radius, height) → {x, y, z, grounded, hitWall, hitHead}
collision.raycast(origin, dir, maxDist, mask?) → {distance, point, normal, handle} | null     // mask: 'player'|'vehicle'|'camera'
collision.sweepCircleXZ / collision.resolveBoxXZ(cx, cz, halfLen, halfWid, yaw, yMin, yMax) → {x, z, hit, nx, nz}   // vehicles
collision.debug(on)                 // wireframe overlay
```
Defaults: boxes whose top is ≤ 0.3 m above the road (curbs, sidewalks) do not block vehicles; boxes shorter than
1.5 m do not block the camera. Every box top is walkable. Raised floors (sidewalk slabs, pier deck, roof deck) are
simply boxes whose top is the floor height.

### `ctx.zones` (`src/world/zones.js`)
```js
zones.add({id, rect, y0, y1, indoor, ambience}) · zones.current (Set of ids containing the player) · zones.indoor (0–1, smoothed)
zones.isInside(id) · emits zone:enter / zone:exit
```

### `ctx.interact` (`src/world/interact.js`)
```js
interact.add({ id, anchor?:'layout id', position?:[x,y,z] /* the thing you look at */, radius?:2.2,
               prompt: LText, icon?:'read'|'use'|'talk'|'terminal'|'door'|'car', object?: Object3D /* glow target */,
               enabled?:true, onUse?(ctx, it) }) → it
interact.setHandler(id, fn|null)    // missions override; null restores the builder's default handler
interact.setEnabled(id, b) · interact.setPrompt(id, LText) · interact.get(id) · interact.remove(id)
interact.setObjective(id|null)      // highlights that interactable (pulse) — HUD marker is separate
interact.focused                    // interactable currently in reach & view, or null
```
On foot only. Shows the prompt through `ctx.ui.hud.showPrompt`, fires on the `interact` action, emits
`interact:focus` / `interact:use`.

---

## 6. Actors

### `ctx.input` (`src/core/input.js`)
```js
input.move {x, y}                 // x strafe (+right), y forward (+forward), |v| ≤ 1 — zero when !ctx.flow.worldInput
input.look {dx, dy}               // look delta this frame (px-equivalent, sensitivity applied)
input.down(a) · input.pressed(a) · input.released(a)          // gameplay actions are false when !ctx.flow.worldInput
input.setVirtual({moveX, moveY, lookDX, lookDY, down:{action:boolean}})   // touch UI and tests
input.tap(action)                 // synthetic press (touch buttons, tests)
input.pointerLocked · input.requestPointerLock() · input.exitPointerLock() · input.isTouch · input.lastDevice
input.label(action) → 'E'         // for prompts
input.endFrame()
```
Actions: `run jump crouch interact vehicle phone map pause tutor headlights handbrake horn camera skip`.
Keyboard: WASD/arrows, Shift run, Space jump/handbrake, C/Ctrl crouch, E interact, F enter/exit vehicle, Tab/P phone,
M map, Esc pause, H tutor, L headlights, G horn, V camera, Enter skip. Mouse look with pointer lock, **and** a
drag-to-look fallback when pointer lock is unavailable (sandboxed iframes). Touch: left stick, right-side drag look,
on-screen buttons. Gamepad optional. Every press emits `input:action`.

### `ctx.player` (`src/world/player.js`) + character model (`src/world/character.js`)
```js
player.object (Group) · player.position (Vector3, feet) · player.yaw · player.velocity · player.grounded
player.state 'idle'|'walk'|'run'|'jump'|'fall'|'crouch'|'crouchwalk'|'driving'
player.teleport(anchorId | [x,y,z], yaw?) · player.setVisible(b) · player.setEnabled(b) · player.gesture('inspect'|'use'|'pickup'|'talk')
```
Third-person, capsule (r 0.35, h 1.8; crouch 1.1) vs the AABB world, step-up 0.4, walk 1.8 m/s, run 5 m/s, jump ~1 m.
`createCharacter({preset, colors})` → `{object, animate(state, dt, speed), setPose(…)}` procedural humanoid with walk /
run / idle / crouch / jump / sit-drive / gesture animation (also used for NPCs).

### `ctx.cameraRig` (`src/world/camera.js`)
```js
cameraRig.mode 'follow'|'vehicle'|'cinematic'|'focus'
cameraRig.setMode(mode) · cameraRig.yaw · cameraRig.pitch
cameraRig.focus({position:[x,y,z], lookAt:[x,y,z], fov?}, seconds=0.8) → Promise     // frame a station while its panel is open
cameraRig.unfocus(seconds=0.5) → Promise
cameraRig.setPose({position, lookAt, fov})          // cinematic mode: driven by ctx.cinematics
cameraRig.shake(amount, seconds)                    // ignored when settings.reducedMotion
```
Follow camera with collision (never clips through walls), shoulder offset, smooth; honours `settings.fov`,
`mouseSens`, `invertY`, `reducedMotion`.

### `ctx.vehicle` (`src/world/vehicle.js`)
```js
vehicle.object · vehicle.position · vehicle.yaw · vehicle.speed (m/s, signed) · vehicle.occupied
vehicle.enter() · vehicle.exit() · vehicle.canEnter() · vehicle.teleport(anchorId | [x,y,z], yaw?)
vehicle.fuel (liters) · vehicle.fuelCapacity · vehicle.tripMeters · vehicle.resetTrip() · vehicle.refuel(liters)
vehicle.headlights (bool) · vehicle.setLocked(b)
vehicle.telemetry() → {speedMps, speedMph, speedKmh, rpm (0–1), gear 'P'|'D'|'R', fuelL, fuelGal, fuelPct, tripKm, tripMi, headlights}
```
Arcade-physical driving (W/S throttle & brake/reverse, A/D steer, Space handbrake), wet-road grip, rotated-box
collision vs the AABB world, headlights (real spot lights), brake/reverse lights, wipers in rain. `F` enters/exits
(registers interactable `car`). Emits `vehicle:enter/exit/collision`. HUD dashboard reads `telemetry()`.

### `ctx.npcs` (`src/world/npc.js`) · `ctx.traffic` (`src/world/traffic.js`)
`npcs.add({id, anchor, preset:'clerk'|'mechanic'|'analyst'|'receptionist'|'pedestrian', name: LText, idle})` →
`{object, lookAt(pos), setVisible(b)}`; NPCs with a station id get a `talk` interactable. Traffic = a few ambient
cars looping the ring road and pedestrians; never blocks a mission (`traffic.setEnabled(b)`, `settings.traffic`).

### `ctx.audio` (`src/core/audio.js`) — all synthesized
```js
audio.unlock() · audio.unlocked                       // call from a user gesture
audio.play(id, {volume?, pitch?, position?})          // one-shots: ui.click ui.hover ui.open ui.close ui.correct ui.wrong ui.hint
                                                      // ui.unlock ui.type ui.notify ui.levelup ui.tick step.* door.* car.door car.start
                                                      // car.horn car.crash radio.open radio.close thunder keypad paper elevator pickup
audio.setAmbience(id) · audio.music(id|null)          // ambience follows zones automatically; music: menu | investigate | tension | finale
audio.speak(text, {lang, pitch, rate}) → Promise · audio.stopSpeech()     // speech synthesis when settings.voice and supported
```
Self-wires to events (zones → ambience, env → rain/thunder, vehicle telemetry → engine, player:step → footsteps,
puzzle:answer → correct/wrong). Other modules only call `audio.play('ui.*')` for their own clicks.

---

## 7. Learning core (pure JS, Node-testable)

### 7.1 Question (generated instance — plain JSON)
```js
/** @typedef {{en:string, es:string}} LText */
Question = {
  id: 'ar.ops.loadout#9f3a2c',        // templateId + '#' + seed hex
  templateId, section: 'AR'|'MK', topic: 'ar.ops', level: 1..5,
  signature: 'ar.ops.loadout|{"groups":3,"per":18,"removed":14}',   // dedupe key
  params: {…},                         // generated parameters (plain JSON)
  prompt: LText,                       // the problem as the learner reads it. AR: plain-English word problem
  expr?: string,                       // MK: the equation/expression in text math, e.g. '3(x − 2) = 21'
  ask?: LText,                         // short "what to find"
  answer: { type:'number'|'fraction'|'text', value?:number, frac?:{n,d}, tolerance?:number,
            display: LText /* '40 cases' */, unit?: LText, accept?: string[] },
  entry: 'number'|'choice',            // learning-mode entry: typed/keypad free response, or 4 choices only
  choices: [ {text: LText, value?:number, correct:boolean, tag?:string, why?: LText} ×4 ],   // shuffled, exactly one correct
  hints: [LText, LText, LText],        // [0] concept · [1] formula / operation · [2] first step demonstrated
  solution: { steps: [{label: LText, text: LText} ×5], final: LText },   // Understand · Given · Choose · Solve · Check
  beginner: LText,                     // "explain like I'm a beginner" — must NOT contain the final answer
  formula: LText, trick?: LText,       // rule/formula; optional memory trick ("DIRT: Distance = Rate × Time")
  visual: { type:'fraction'|'percent'|'balance'|'geometry'|'route'|'bars'|'numberline'|'none', params:{…} },
  rookie?: { lines: LText[], wrongIndex: number, why: LText },   // flawed worked solution ("check the rookie's work")
  misconceptions: [ {value:number, tag:string, why: LText} ],    // EVERY named mistake of the template (superset of the wrong choices)
  estSeconds: number
}
```
Wrong choices come from **named misconceptions** (`tag` + `why`), so the tutor can say *why* an answer is wrong.
`misconceptions` keeps all of them, so a **typed** wrong answer is explained even when it is not one of the four
choices (3 + 18 − 14 = 7, x = 23/3 …). A whole-number answer is only shown next to whole-number choices; generic
`near` fillers are a last resort (the test sweep fails above 5 %). A question is plain JSON: it survives a save/load
round trip, and `{templateId, level, seed}` alone rebuilds it. How to write a template: `src/math/README.md`.

### 7.2 Topics (ids are fixed)
AR: `ar.word` word problems · `ar.ops` + − × ÷ · `ar.fracdec` fractions & decimals · `ar.percent` percent & discounts ·
`ar.ratio` ratios & proportions · `ar.drt` distance-rate-time · `ar.avg` averages · `ar.work` work-rate ·
`ar.units` unit conversions · `ar.multi` multi-step reasoning.
MK: `mk.order` order of operations · `mk.linear` linear equations · `mk.expr` algebraic expressions ·
`mk.exp` exponents & roots · `mk.ineq` inequalities · `mk.geom` geometry · `mk.pav` perimeter-area-volume ·
`mk.angles` angles & triangles · `mk.factor` factoring & polynomials · `mk.props` properties, formulas & patterns.

Levels: 1 Recruit · 2 Specialist · 3 Operator · 4 Advanced Operator · 5 ASVAB Readiness.

### 7.3 `ctx.math` — engine (`src/math/engine.js`)
```js
math.topics → [{id, section, name: LText, short: LText, blurb: LText}]            // 20 topics
math.templates → Map(id → template)   // template = {id, section, topic, levels:[…], params(rng, level, opts) , build(params) , check?(params)}
math.generate({templateId?, topic?, section?, level?, seed?, avoid?:Set|string[], theme?}) → Question   // validated; never returns an invalid item
      // with an explicit seed the result is reproducible (only `avoid` can change it); without one the engine
      // also avoids its own ring of ~200 recent signatures
math.build(templateId, params, level?) → Question  // deterministic from explicit params (story-specific numbers); throws on params it cannot present
math.similar(q) → Question                         // same template + level, different numbers (≠ signature)
math.easier(q) → Question                          // same topic, one level down (same template when possible)
math.check(q, input) → {correct, value?, normalized, choice?: Choice, tag?: string, why?: LText, parseError?: LText}
      // input: {choice: index} | {text: '40'}  — accepts 40, 40.0, 1/2, 1 1/2, -3, 25%, $1,200.50, 'x = 9', units ignored;
      // expressions ('54 - 14', '3 x 18') are a parseError, which callers must NOT count as an attempt.
      // tag + why name the mistake behind a wrong value (looked up in q.misconceptions)
math.validate(q) → {ok, errors: string[]}
math.fixed.trucks() → Question      // "Three trucks carry 18 equipment cases each. Fourteen cases are removed. How many remain?" → 40
math.fixed.equation() → Question    // "Solve 3(x − 2) = 21." → x = 9
```
Validation (every generated item): 4 distinct choices, exactly one correct and equal to `answer`, both languages
non-empty, 3 hints, ≥ 3 solution steps, finite numbers, answer re-derived by an **independent check** (`template.check`),
no answer leak in `beginner`/`hints[0..1]`. Unit tests sweep every template × level × many seeds.

`src/math/linear.js` models one-variable linear equations for the balance puzzle:
`createLinear({lhs:{x, c, mult?, inner?}, rhs:{x, c}})` → `{apply(op:'add'|'sub'|'mul'|'div'|'expand', value?) → {ok, state, text, solved?, error?}, undo(), reset(), isSolved(), solution(), text(), state(), history}`.
`value` is a number, a fraction string (`'3/4'`) or `{x: k}` (add/subtract k·x). Illegal moves return `ok:false` with a bilingual `error` and change nothing.

### 7.4 `ctx.profile` — learner model (`src/learning/profile.js` …)
```js
QuestionResult = { questionId, templateId, topic, section, level, signature,
  mode: 'mission'|'drill'|'review'|'callback'|'debrief'|'exam',
  outcome: 'independent'|'assisted'|'revealed'|'incorrect'|'skipped',    // exam: independent | incorrect | skipped
  attempts, hintLevel (0–4), aids: {beginner?, formula?, similar?, visual?, why?, calculator?},
  timeMs, wrong: [{value, tag}], ts }

profile.record(result) → {xp, levelChange?: {topic, from, to}, srs: {box, dueAt, dueMission}, result} | null   // THE entry point
      // `result` is the stored copy with the credit rule ENFORCED (a result that claims 'independent' with a hint, an aid or a
      // second attempt is stored as 'assisted'; hint level 4 is always 'revealed'); null for a malformed result
profile.data                         // persisted plain object (versioned); profile.save() · profile.load()
profile.topic(topicId) → {attempts, independent, assisted, revealed, independentPct, avgTimeMs, level, mastery (0–1), state, due}
profile.section('AR'|'MK') → {answered, independent, independentPct, avgTimeMs} · profile.overall()
profile.levelFor(topicId) → 1..5 · profile.tier() → {level, name: LText}        // current difficulty tier
profile.due(now?) → [{topicId, templateId?, reason:'missed'|'spaced', dueAt}]   // spaced-repetition queue
profile.mistakes() → [{tag, topicId, count, why: LText}]                         // repeated mistakes
profile.streak() → {current, best, practicedToday}
profile.skillMap() → [{topicId, section, mastery, level, state:'new'|'learning'|'proficient'|'mastered'|'due'}]
profile.recommend() → {kind:'mission'|'review'|'drill'|'exam', id?, topicId?, reason: LText}
profile.xp · profile.missionDone(id, report) · profile.missionState(id) · profile.missionCount
profile.addExam(report) · profile.exams · profile.recentSignatures() → Set
profile.export() → string · profile.import(json) → boolean · profile.reset()
```
`recommend()` order: 3+ topics due → review · next mission (`ctx.campaign.next()`) · practice exam (30+ answers, none in 3 days) ·
any topic due → review · weakest practised topic → drill. Saves are synchronous (no debounce). Events: `learning:recorded`,
`learning:level`, `learning:reset {imported}`.

**Credit rules.** `independent` = correct on the first attempt with no hint/aid → full mastery credit + full XP.
`assisted` = correct after a wrong attempt or any hint/aid → completion + reduced XP, no independent credit.
`revealed` = the full solution was shown → **zero mastery credit**, topic scheduled for early review.
**Adaptive difficulty** (per topic, 1–5): promote after 3 consecutive `independent` at the current level; demote after
2 consecutive `assisted (hintLevel ≥ 2)`/`revealed`. **Spaced repetition**: a miss is due again after the next mission
*and* at +1 day; successes move through 1 → 3 → 7 → 14 → 30 days. Storage: `ctx.storage` key `profile` (try/catch,
memory fallback, never the network).

### 7.5 `ctx.tutor` (`src/learning/tutor.js`) — deterministic hint ladder
```js
const t = tutor.begin(question, {mode})          // TutorSession
t.submit(input) → { correct, feedback: LText, why?: LText,                       // wrong #1 → hint 1 (concept)
                    hint?: {level:1|2|3, title: LText, body: LText},              // wrong #2 → hint 2 (formula/operation)
                    reveal?: Solution,                                            // wrong #3 → hint 3 (first step)
                    followUp?: Question }                                         // wrong #4 → full solution + a related problem
t.request(kind) → {title: LText, body: LText, example?: {question, solution}, visual?: Visual}
      // kind: 'beginner' | 'formula' | 'why' | 'similar' | 'visual' | 'retry' | 'language'
t.outcome() → 'independent'|'assisted'|'revealed'|'incorrect'|'skipped' · t.hintLevel · t.attempts · t.revealed · t.wrong · t.aids
t.finish() → QuestionResult (+ xp, levelChange?, needsReview)   // records into ctx.profile and the running ctx.session exactly once
t.canAdvance · t.needsReview · t.followUp · t.beginFollowUp() → TutorSession|null · tutor.active · tutor.nextAfterReveal(t)
```
Details that the puzzle UI relies on: a parse error is not an attempt; each wrong answer climbs ONE rung from where the
learner already is (after the `formula` aid the next wrong answer shows hint 3); `beginner`/`visual` cost rung 1,
`formula`/`similar` rung 2, `why`/`retry`/`language` are free, and help taken after the problem is solved is free;
the event `learning:aid {aid:'calculator'}` while a problem is open costs independent credit. With `mode:'exam'` every
request is denied and wrong answers give no hint. `t.canAdvance` is the gate: true once the problem — or a follow-up in
its chain — was solved without a reveal (an assisted solve counts), or when the chain ran out.
After a reveal the learner must solve the **related problem** independently to advance (max 2 follow-ups, the second one
level easier; then the gate opens flagged "needs review" — never a dead end, never mastery credit).

### 7.6 `ctx.session` (`src/learning/session.js`) — the 15-minute structure
Phases: `story` 0–2 min · `ar` 2–5 · `mk` 5–8 · `combined` 8–12 · `debrief` 12–15 (scaled for 30/45-minute sessions).
```js
session.start({missionId, minutes}) · session.setPhase(id) · session.phase · session.plan · session.elapsedMs
session.add(result, question?) · session.results · session.end() → SessionReport · session.report · session.active
session.timePhase (what the clock says) · session.remainingMs · session.pause() · session.resume() · session.extend(minutes) · session.question(id)
SessionReport = {missionId, durationMs, minutes, results, byTopic, counts, answered, independentPct, strengths:[topicId], weaknesses:[topicId], xp,
                 mistakes:[{question, yourAnswers, why, solution}], reviewQuestions: Question[3–5]  /* cold recall quiz */ }
```

### 7.7 `ctx.exam` (`src/learning/exam.js`) — ASVAB Practice Mode logic
```js
exam.presets → [{id, name: LText, ar:{count, minutes}, mk:{count, minutes}, note: LText}]   // quick · CAT-style · paper-style · custom
exam.create({ar:{count, minutes}, mk:{count, minutes}, seed?}) → run
run.sections[i] → {section, questions, timeLimitMs, answers[], flagged[], startedAt, submitted}
run.answer(qIndex, choiceIndex) · run.flag(qIndex, b) · run.remainingMs(now) · run.submitSection(now) → SectionReport
run.finish() → ExamReport {sections:[{section, correct, total, pct, timeUsedMs, byTopic, items:[{question, chosen, correct, timeMs}]}], overallPct, ts}
```
Timed, multiple choice, no hints, no calculator, no tutor, solutions only after the section is submitted. Results feed
`profile` (mode `'exam'`). **Never** output an AFQT / line score / "official" score: only percent correct, per-topic
accuracy, pacing, and a plainly-labelled practice readiness band.

---

## 8. UI (DOM over the canvas)

`ctx.ui` (`src/ui/ui.js`) owns `#ui` and its layers; other UI modules attach with `ui.mount(name, api)` → `ctx.ui[name]`.
```js
ui.root · ui.layer('hud'|'modal'|'overlay'|'touch') · ui.mount(name, api) · ui.el(tag, className?, html?)
ui.fade(alpha, seconds) → Promise · ui.letterbox(on) · ui.titleCard({kicker, title, subtitle}, seconds) → Promise
ui.toast(LText, kind?) · ui.loading(progress 0–1, label?) / ui.loading(null)
ui.hud.setObjective(LText|null, {sub?: LText, step?: [i, n]}) · ui.hud.setMarker([x,y,z]|null, {label?: LText})
ui.hud.showPrompt({text: LText, key: string}|null) · ui.hud.setPhase(session) · ui.hud.setVisible(b) · ui.hud.checkpoint()
ui.menu.show() / hide() · ui.pause.open() / close() · ui.settings.open()
ui.phone.open(tab?) / close() · ui.phone.message({from: LText, text: LText}) · ui.map.setRoute(points|null) · ui.map.setTarget(pos|null)
ui.document.show({title: LText, kind:'paper'|'tag'|'screen'|'board', body: LText | LText[] , rows?: [{label: LText, value: LText|string}], footer?: LText}) → Promise
ui.puzzle.open(spec) → Promise<{solved, aborted, results: QuestionResult[]}> · ui.puzzle.close() · ui.puzzle.current
ui.debrief.show(SessionReport, {missionId, next?}) → Promise<'continue'|'drills'|'exam'|'menu'|'replay'>
ui.dashboard.open() / close() · ui.drills.open({topicId?, review?, mixed?}) · ui.exam.open()
```
`puzzle spec = { question, chain?: Question[], mode, skin:'terminal'|'clipboard'|'keypad'|'paper'|'radio', title: LText,
intro?: LText, presentation?: 'entry'|'choice'|'balance'|'manifest'|'rookie', manifest?: {rows:[{label, value}], totalLabel},
allowTutor?: true, allowLeave?: true, timeLimitMs? }`.

`ctx.dialog.play(lines, {mode:'radio'|'talk'|'phone', skippable?: true}) → Promise` with
`line = {speaker:'control'|'player'|npcId, name: LText, text: LText, seconds?}` — subtitles (if enabled), optional speech.
`ctx.visualLab.open(visual, {container?, question?}) → {close(), el}` — interactive 3D manipulatives:
`fraction` (divided containers), `percent` (10×10 crate grid), `balance` (equation scale), `geometry` (measurable
solids), `route` (vehicle on a route: distance = rate × time), `bars` (averages/ratios), `numberline` (inequalities).

UI rules: all sizes in `rem` scaled by `--ui-scale` (settings.textScale); honour `highContrast`, `reducedMotion`;
keyboard operable (Tab/Enter/Esc), 44 px touch targets, works from 360 px wide to 3840×2160; text never baked into
the 3D frame when it must be read to learn.

---

## 9. Game layer

`ctx.missions` (`src/game/missions.js`) runs data-driven mission definitions (`src/game/missions/*.js`):
steps of type `cinematic | dialog | goto | drive | interact | collect | puzzle | callback | wait | custom | debrief`,
each with `phase` (session phase), `objective` (LText), `marker` (anchor id), optional `checkpoint`.
`missions.start(id, {fromCheckpoint?})`, `missions.active`, `missions.abort()`, `missions.restartCheckpoint()`.
`ctx.campaign` lists chapters and unlock state. `ctx.cinematics.play(sequence) → Promise` drives `cameraRig.setPose`
(letterbox, fades, title cards, skippable; cuts instead of moves when `reducedMotion`). `ctx.save` persists the campaign
checkpoint. `src/game/app.js` is the flow controller (handles `ui:menu`, starts modes). `src/game/selftest.js`
exposes `window.__game.selfTest()` → `{pass, passed, total, results:[{name, ok, detail?}]}` computed live.

Chapters: **1 The Arrival** (navigation, arithmetic, simple equations — the first playable demo) · **2 The Warehouse**
(percent, fractions, ratios) · **3 The Garage** (distance/time, units, algebra) · **4 The Network** (patterns, multi-step,
charts, rooftop angles) · **5 Final Operation** (timed mixed AR/MK). Adding a chapter = adding one definition file.

---

## 10. Learning design (how the game teaches)

1. **Math gates everything.** A mission step that matters completes only when a generated problem is solved.
2. **15-minute session** = Story → AR challenge → MK challenge → Combined mission → Debrief, with a checkpoint and a
   visible phase bar at every boundary ("good stopping point — resume anytime").
3. **Commit before reveal.** No hint, formula or answer is visible until the learner commits an answer or asks.
4. **Hint ladder** (1 concept → 2 formula → 3 first step → 4 full 5-step solution) then a **related problem**.
5. **On-demand tutor**: beginner explanation · formula · why is my answer wrong · similar example · try again ·
   visual explanation · Spanish/English.
6. **Callbacks / spaced repetition**: every mission re-tests 2–3 earlier skills pulled from the due queue; review dates
   at 1, 3, 7, 14, 30 days; a "Due for review" card on the start screen.
7. **Cold recall quiz** in the debrief (3–5 fresh questions, no hints) + an **explain-it** line (keyword coach).
8. **Check the rookie's work**: find the wrong line in a worked solution (error analysis).
9. **Mixed ops** drills interleave topics without labelling them. **Exam mode** is separate, timed and hint-free.
10. **5-step explanation format** everywhere: Understand → Given → Choose the operation/formula → Solve → Check.

## 11. Story bible (keep it consistent)

- City: **Puerto Ceniza**. Syndicate: **El Consorcio Sombra** (a smuggling and money-laundering network hiding behind
  logistics fronts). Its bookkeeper: **"El Contador"**. Task force: **Unidad Meridiano**.
- Player: undercover analyst-operative, codename **Cifra**. Handler/dispatcher on the radio: **Inés Varela**, callsign
  **Faro**. Rookie analyst in the ops room: **Darío Ibarra**. Warehouse night clerk (informant): **Tomás Quiroga**.
  Mechanic (informant): **Lupe Rentería**. Hotel receptionist (task-force cover): **Marisol**.
- Tone: terse, gritty, rain and neon; the hero wins with arithmetic, not violence. No gore, no drug-making or
  trafficking how-to, no real cartels/agencies/brands. Evidence is ledgers, manifests, fuel logs, odometers, schedules.

## 12. Dev workflow

- `npm run dev` → http://localhost:8080 (or `PORT=… node tools/serve.mjs`). `npm test` (unit). `npm run e2e`.
- `node tools/shot.cjs "<page>?quality=low" --out /tmp/x.png [--eval "js"] [--scenario f.cjs]` → headless Chromium
  with software WebGL (slow: a few FPS — small viewports, `quality=low`, and `ctx.loop.fastForward(seconds)` for logic).
  It prints console errors/page errors; it starts its own server on a free port (no port clashes).
- A page signals readiness with `window.__ready = true`.
- Each module has a harness page `dev/<module>.html` that boots a context with only what it needs.
  `dev/render.html` is the rendering-core harness (URL parameters in its header comment);
  `node tools/shot.cjs "dev/render.html?quality=medium" --w 960 --h 540 --scenario dev/render.shots.cjs` writes the whole
  time-of-day × weather matrix to `dev/out/` (git-ignored). Look at the images; `tests/e2e/render.e2e.cjs` checks behaviour.
- Performance budget (High preset, 1080p, mid-range laptop GPU): ≤ 350 draw calls, ≤ 1.5 M triangles in view, ≤ 12
  real lights, one 2048² shadow map. Merge static geometry per material; instance repeated props.
