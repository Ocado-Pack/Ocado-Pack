export const meta = {
  name: 'narco-world',
  description: 'NARCO: SHADOW EMPIRE - rendering foundation, city block, warehouse, garage, pier and hotel',
  phases: [
    { title: 'Foundation', detail: 'renderer/env/weather, textures/materials, lights/buildkit/world harness' },
    { title: 'City and Warehouse', detail: 'streets + central block + backdrop; warehouse compound' },
    { title: 'Garage, Pier and Hotel', detail: 'garage + gas station + waterfront; hotel lobby + ops room + rooftop' },
  ],
}

const SCRATCH_BASE = '<SCRATCH_DIR>'

const PRE = (label) => `You are one of several engineers building a game in parallel.

PROJECT - "NARCO: SHADOW EMPIRE - Operation Numbers": a cinematic third-person 3D investigation game for the browser (three.js r160 vendored, plain ES modules, no build step in dev, ZERO network requests at runtime, everything procedural - no asset files). Its purpose is to train a learner for the ASVAB Arithmetic Reasoning and Mathematics Knowledge subtests: every important gate in the game is a math problem. The player is an undercover analyst-operative (codename Cifra) auditing a fictional syndicate's logistics fronts in the rain-soaked fictional port city Puerto Ceniza. Fiction only; no real brands, organisations or places.

ROOT: /home/user/Ocado-Pack/narco-shadow-empire   (cd there first; every path below is relative to it)
SCRATCH: ${SCRATCH_BASE}/${label}/   (create it; ALL temporary files and screenshots go here, never in the repo)

READ BEFORE WRITING CODE: docs/ARCHITECTURE.md (THE CONTRACT - implement the names and signatures given there exactly), src/world/layout.js (THE SPATIAL CONTRACT - footprints, door openings, anchors, stations, zones, features), src/core/context.js, src/core/util.js, src/core/ltext.js, src/core/settings.js, src/core/flow.js, src/core/loop.js, dev/_template.html, and the header comment of tools/shot.cjs.

HARD RULES
1. Edit ONLY the files listed under YOUR FILES (create them). Other engineers are creating their own files in this same working tree right now - never touch, move, reformat or delete anything else, even if it looks wrong or unfinished. If another file needs a change, say so under REQUESTS in your final report.
2. No git commands that write (add/commit/stash/checkout/reset/clean/restore). No new npm dependencies. No network access at runtime, no external assets, no CDN, no fonts or images from anywhere: geometry, textures and text are generated in code.
3. Plain JavaScript ES modules with JSDoc. three.js r160 only (import * as THREE from 'three'; addons from 'three/addons/...'). When unsure whether an API exists in r160, grep vendor/three. Lights use physical units in r160 (point/spot intensity in candela: tens to thousands).
4. Player-facing strings are bilingual: L(en, es) from src/core/ltext.js. In-world signage is Spanish (it is a Latin-American city); natural Latin-American Spanish with correct accents.
5. A module you depend on may be missing or half-written right now. Statically import only what is listed as AVAILABLE; reach everything else through ctx (ctx.<system> is always safely callable - see "Null objects" in the contract). In dev harness pages (dev/*.html) you MAY use dynamic import() inside try/catch to pick up optional modules; never in src/.
6. No placeholders: everything you expose must really work. No TODOs, no grey untextured boxes left in the shipped scene.
7. Shipping constraint: the game is later bundled into ONE offline html file. So in src/: no fetch of local files, no Workers, no import.meta.url asset loading, no dynamic import.
8. VERIFY VISUALLY before you finish: render your work with   node tools/shot.cjs "dev/<page>.html?<params>" --out SCRATCH/name.png --w 960 --h 540 --timeout 240000   then LOOK at the PNG with the Read tool, judge it honestly against the art direction, and iterate. Rendering here is software WebGL (a few FPS, slower while other engineers render) - keep viewports small, be patient, and never conclude "it works" without having looked. The shot report must show zero console errors and zero page errors.

ART DIRECTION: gritty, cinematic urban realism; the signature look is night + rain. A humid Latin-American port town: stucco and brick mid-rises with balconies and roll-down shutters, hand-painted and neon signage in Spanish, tangled overhead cables, sodium-vapour street lamps casting warm orange pools, magenta / cyan / green neon, wet asphalt mirroring the lights, steam from grates, fog swallowing the distance. Industrial zones: corrugated metal, chain-link, floodlights with visible cones, rust, hazard stripes. Interiors are motivated by practical lights: cold high-bay lamps and a warm office in the warehouse, tungsten work lights in the garage, cyan monitor glow in the ops room, amber sconces in the hotel lobby. Compose in depth layers (foreground props, mid-ground buildings, far skyline) with readable landmarks and strong silhouettes. Physically based materials (albedo + normal + roughness maps, all procedural). The same scene must also read well by day (overcast port light) because time of day changes.

PERFORMANCE BUDGET (High preset, 1080p, mid-range laptop GPU): about 350 draw calls and 1.5 million triangles in view for the WHOLE world, at most settings.maxLights real lights (the light pool handles that), one shadow-casting directional light. So: merge static geometry per material (BufferGeometryUtils.mergeGeometries), instance repeated props (InstancedMesh), put window grids / panel lines / small detail into textures rather than geometry, share materials, and never create per-frame garbage.

FINAL REPORT - your last message is returned verbatim to the lead engineer and pasted into other engineers' briefs. Keep it precise, under 70 lines:
FILES: what you created. API: the exact public API other engineers will call (signatures, events, settings read, debug views), flagging any deviation from docs/ARCHITECTURE.md and why. VERIFIED: what you ran, which screenshots you inspected and what they showed. GAPS: anything not done or weak - be honest. REQUESTS: changes needed in files you do not own.`

// ------------------------------------------------------------------------------------------------ stage 1
const B1A = `YOUR JOB: the renderer, post-processing, sky / time of day / fog, and weather.

AVAILABLE to import: src/core/*.js (context, util, ltext, settings, events ...). Nothing else exists yet.

YOUR FILES
  src/world/renderer.js      createRenderer(ctx) -> registers and returns ctx.gfx (contract section 5, "ctx.gfx")
  src/world/post.js          the post-processing chain and the custom grade pass
  src/world/environment.js   createEnvironment(ctx) -> ctx.env (order 50, runWhenPaused)
  src/world/weather.js       createWeather(ctx) -> ctx.weather (order 55, runWhenPaused)
  dev/render.html            your harness page

RENDERER (ctx.gfx)
  Uses the existing <canvas id="game">. THREE.WebGLRenderer (powerPreference high-performance), ACES filmic tone mapping, sRGB output, PCFSoftShadowMap. Scene, PerspectiveCamera (fov from settings.fov, near 0.1, far about 1200).
  Resolution, honestly: pixelRatio = min(devicePixelRatio, settings.maxPixelRatio) x settings.renderScale in resolutionMode 'native'; 'fixed4k' renders an internal buffer of about 3840x2160 pixels at the window's aspect ratio (supersampled down to the canvas); 'dynamic' adjusts the scale between 0.5 and the native value to hold settings.targetFps (smooth, hysteresis, no oscillation). getInfo() returns {cssW, cssH, bufferW, bufferH, pixelRatio, preset, is4K, fps, drawCalls, triangles} where is4K is true only when the drawing buffer really is at least 3840x2160. Emit gfx:resize.
  Post chain (EffectComposer from three/addons): RenderPass -> UnrealBloomPass (settings.bloom; tuned so neon and lamps glow without washing the frame) -> your GradePass (one ShaderPass: filmic contrast, gentle teal-shadow / warm-highlight split toning, vignette, animated film grain when settings.grain; grain and vignette reduced by reducedMotion only where they animate) -> OutputPass. MSAA through a multisampled HalfFloat render target (settings.msaa samples). Optional GTAO when settings.ao. When bloom, grain and ao are all off take a direct renderer.render fast path. Everything reacts live to ctx.settings.onChange (quality presets, renderScale, shadows off/low/high with shadowMapSize, msaa, bloom, ao, grain, fov, resolutionMode, targetFps).
  render(dt), resize() (window resize + ResizeObserver), setExposure(v), project(vec3) -> {x, y, visible, depth} in CSS pixels, screenToRay(x, y). Handle webglcontextlost / restored. If WebGL is unavailable: do not throw - set gfx.unavailable = true and show a readable bilingual message in #ui.
  ctx.debug.gfxStats() returns getInfo().

ENVIRONMENT (ctx.env)
  setTime(hour, {instant}), hour, isNight, setClockRate(gameMinutesPerRealSecond) (default 0 = clock stopped; missions set the time), setWeather(kind, {intensity, instant}) with kinds clear | rain | storm | fog | overcast | dust, weather, intensity, wetness (0-1; rises over ~20 s of rain, dries slowly), sunDir, nightFactor (0-1 smooth), update(dt).
  Sky: a dome with a shader - gradient keyed by time of day (night deep blue-black with a faint warm city glow near the horizon, dawn pink/orange, overcast grey-blue day, amber-magenta dusk), stars that fade in at night (hidden by rain/overcast), a moon disc, slow cloud noise. A DirectionalLight for sun or moon (shadow camera that follows the camera target with texel snapping, sized ~120 m, so shadows stay stable and sharp near the player), a HemisphereLight, FogExp2 whose colour follows the sky horizon and whose density depends on weather (fog and rain thicken it), exposure by time of day. scene.environment: a small procedural environment map built with PMREMGenerator.fromScene (sky gradient plus a few emissive coloured panels so wet/metallic surfaces pick up neon-like reflections at night), regenerated only when time or weather has changed materially (throttled).
  Events: env:time (at most twice a second), env:night {night} when crossing dusk/dawn (19:00 and 06:00, with smooth nightFactor around them), env:weather, env:lightning (storm only: random flashes that briefly boost ambient light; softened when settings.reducedMotion).
  Night must not be pitch black: silhouettes and the ground must remain readable by moonlight + sky glow even where no lamp reaches.

WEATHER (ctx.weather)
  Rain: a camera-following volume of streaks (instanced quads or line segments with a cheap shader, wind slant, speed variation; count scales with settings.rainDensity x env intensity), fading out by ctx.zones.indoor (0-1; treat a non-number as 0) so it never rains indoors. Ground splashes: small expanding rings/sparkles on the ground plane around the camera. Wet-lens or screen effects are not needed.
  Emitters: weather.addEmitter({type: 'steam' | 'smoke' | 'dust' | 'spray', position, rate, size, rise, color, radius}) -> handle {setEnabled, remove, position}: pooled soft sprites lit by the ambient colour (steam from grates, chimney smoke, dust motes in interiors). Keep it cheap: one shared geometry/material per type.
  Drives itself from ctx.env (intensity, wetness, wind) and settings (rainDensity, particles). No per-frame allocations.

HARNESS dev/render.html: boots createContext, your three systems, and builds a small test set (a 60 m ground plane with a rough dark PBR material that shows wetness, a few boxes of different heights, emissive neon bars in magenta/cyan/amber, three warm point lights, a steam emitter). URL params: time (default 22.5), weather (default rain), quality. Sets window.__ready after a few rendered frames. Screenshot and inspect at least: night+rain, night+storm, dawn+fog, noon+overcast, dusk+clear, and night+rain at quality=low and quality=ultra; report what each looks like and the FPS/drawing-buffer numbers from getInfo().`

const B1B = `YOUR JOB: the procedural texture generators and the PBR material library that every world builder will use.

AVAILABLE to import: src/core/*.js. Another engineer is writing src/world/renderer.js / environment.js right now; reach them only through ctx (ctx.gfx, ctx.env) and events.

YOUR FILES
  src/world/textures.js     procedural canvas texture generation (seeded, cached, resolution from settings.textureSize)
  src/world/materials.js    createMaterials(ctx) -> registers and returns ctx.mats
  dev/materials.html        swatch showroom harness (use dynamic import in try/catch for ../src/world/renderer.js and environment.js; if they are not there yet, fall back to a minimal inline WebGLRenderer + hemisphere/directional light + a neutral procedural environment so you can still judge the materials)

TEXTURES
  Seeded value-noise / fbm / worley helpers on ImageData. makeMaps(kind, {size, seed, ...}) -> {map, normalMap, roughnessMap, and where relevant metalnessMap, emissiveMap, alphaMap}; normal maps are derived from a height field with a Sobel filter. Deterministic, generated lazily, cached. Performance matters: a 1024 texture set must take well under 200 ms; reuse height fields; never block for seconds.
  Kinds (each must look like the real material at 1-2 m viewing distance AND tile without obvious repetition): asphalt (aggregate speckle, cracks, tar patches, oil stains); puddle mask for wet roads (roughness map with smooth puddle regions); sidewalk pavers with joints and gum stains; concrete (clean, stained, and with expansion joints); brick (3 palettes, uneven mortar); stucco / painted plaster (4 pastel-weathered palettes with water stains and patched areas); corrugated metal (painted, and rusty); flat sheet metal; diamond plate; rust; chain-link (alpha); roll-up shutter slats; wood planks; crate wood with stencilled marks; cardboard; dirty glass; lobby floor tiles (checker / terrazzo); carpet; rubber; fabric; polished concrete warehouse floor; roofing felt/gravel; water normal map.
  Building facades: a window-atlas generator - facade(style, {floors, bays, seed}) producing map + emissiveMap + roughness/normal for a whole facade (window grid with frames, sills, balconies hinted, AC units, randomly lit windows with warm/cool curtains, ground-floor band) so a building is one textured box face, not thousands of triangles. At least 5 styles (stucco apartments, brick tenement, concrete office, tiled commercial, industrial).
  Text and signs: textTexture(text, {font, weight, color, background, padding, width, height, glow, border, align, lines}) for signs, placards, tags, monitors, documents; supports multi-line; crisp at the requested size; returns a CanvasTexture with correct colour space. A numberPlate helper is welcome.
  All textures: RepeatWrapping where they tile, sRGB colour space for colour maps, mipmaps, anisotropy min(8, renderer max) when ctx.gfx is available.

MATERIALS (ctx.mats)
  mats.get(name, opts) -> cached material. Provide at least these names: asphalt, sidewalk, curb, concrete, concreteStained, concreteFloor, brick, brickDark, brickPainted, stucco (variants via opts.palette), metalCorrugated, metalCorrugatedRust, metalPainted (opts.color), metalDark, steel, chrome, diamondPlate, rust, chainlink, shutter, woodPlank, woodCrate, cardboard, glass, glassDark, glassFrosted, tileFloor, carpet, rubber, plastic (opts.color), fabric (opts.color), roofing, water, skin? (not needed), paper.
  mats.paint(color, {roughness, metalness}) ; mats.carPaint(color) (MeshPhysicalMaterial with clearcoat) ; mats.neon(color, intensity) and mats.emissive(color, intensity) (tuned to glow through the bloom pass) ; mats.glass({tint, opacity}) ; mats.screen(texture, intensity) ; mats.sign(text, opts) and mats.label(text, opts) (material from textTexture) ; mats.facade(style, opts) (facade material whose lit windows fade in at night).
  Wetness: materials flagged wettable (asphalt, sidewalk, concrete, roofing, car paint, metal roofs ...) respond to ctx.env.wetness: lower roughness (asphalt uses its puddle mask so puddles become mirror-like while the aggregate stays rough), slightly darker albedo, higher envMapIntensity. Update cheaply (a couple of times per second, uniforms or material properties, no recompiles).
  Night: emissive materials flagged nightOnly (lit windows, neon when the mission wants) scale with a smooth night factor driven by env:night / ctx.env.nightFactor. Expose mats.setNightFactor(v) for tests.
  mats.dispose(), mats.stats() -> {materials, textures, bytesEstimate}.
  React to settings.textureSize changes by regenerating lazily (or document that it applies on reload).

HARNESS dev/materials.html: a showroom - a grid of 1.5 m spheres and 2x2 m panels, one per material, with a name label under each, a ground strip of asphalt and sidewalk, three facades (10 m tall) at the back, a row of neon tubes and two signs. URL params: wet (0-1), night (0 or 1), page (to show a subset when there are many), quality. Take screenshots dry-day, wet-night, and close-ups of asphalt / brick / stucco facades / corrugated metal / crate wood; LOOK at them and iterate until each reads as its material, with visible relief from the normal maps and no blur or obvious tiling.`

const B1C = `YOUR JOB: the light pool, the builder toolkit, the world assembler with its feature registry, and THE shared world harness page every area builder will use.

AVAILABLE to import: src/core/*.js, src/world/layout.js. Two engineers are writing src/world/renderer.js + environment.js + weather.js and src/world/textures.js + materials.js right now (see contract section 5 for their APIs: ctx.gfx, ctx.env, ctx.weather, ctx.mats). In src/ reach them only through ctx. In your harness use dynamic import in try/catch with a minimal inline fallback renderer so you can work before theirs exist; before you finish, re-test with the real ones if they have appeared.

YOUR FILES
  src/world/lights.js       createLights(ctx) -> ctx.lights (order 60, runWhenPaused) - contract section 5
  src/world/buildkit.js     geometry / batching / collision-logging helpers for builders
  src/world/world.js        createWorld(ctx) -> ctx.world (builder orchestration, base ground, water, features, debug views)
  src/world/city.js, src/world/warehouse.js, src/world/garage.js, src/world/pier.js, src/world/hotel.js
                            create each as a STUB:   export async function buildCity(ctx, parent, kit) {}   (buildWarehouse, buildGarage, buildPier, buildHotel). Four other engineers will replace these files after you finish. world.js imports and calls all five.
  dev/world.html            THE shared world harness

LIGHT POOL (ctx.lights)
  lights.add({position, color, intensity, distance, type: 'point' | 'spot', target, angle, penumbra, group: 'street' | 'neon' | 'interior' | 'vehicle' | 'fx', nightOnly, castShadow, flicker, glow: true, cone: false, zone}) -> handle {setEnabled, setIntensity, setColor, position, remove}.
  Hundreds of logical lamps but only settings.maxLights real THREE lights (created once, never added/removed at runtime to avoid shader recompiles - disabled ones get intensity 0). Each frame rank lamps by importance (intensity / distance squared to the camera, with a bonus for lamps in front of the camera and for the 'vehicle' group, hysteresis to prevent flip-flopping) and bind the top ones, fading intensity in/out over ~0.25 s. Every lamp also owns a cheap additive glow billboard (so distant lamps still read as lights) and, when cone is true, a soft additive light-cone mesh for the foggy look. nightOnly lamps follow env:night / ctx.env.nightFactor. Optional zone: lamps tagged with an interior zone id are ranked only while the player/camera is inside or near that zone. flicker: 0-1 random flicker amount (respect reducedMotion). lights.setGroupEnabled(group, on), lights.count, lights.active. Budget: updating 400 lamps must cost well under half a millisecond (typed arrays, partial selection, zero allocations).

BUILDKIT (src/world/buildkit.js) - createBuildKit(ctx) returns helpers used by every area builder:
  box(w, h, d, material, {uvScale}) and friends (plane, cylinder, slab(rect, y0, y1, material), prism/gable roof) with WORLD-SCALE UVs: textures tile by physical size (default one repeat per 2 m, overridable), so a wall of any size has correctly scaled bricks.
  walls(rect, y0, y1, thickness, openings, {material, innerMaterial}) -> wall meshes with door / window openings cut as separate boxes (openings: [{side: 'N' | 'S' | 'E' | 'W', at, width, height, sill}]) AND the matching colliders (lintel above the opening).
  batch(): collect meshes/geometries with their material and world transform, then flush(parent) -> one merged mesh per material (BufferGeometryUtils.mergeGeometries), with castShadow / receiveShadow flags per batch. This is how static scenery stays within the draw-call budget.
  instances(geometry, material, transforms) -> InstancedMesh.
  label(text, w, h, opts) -> a plane with a text texture (uses ctx.mats.sign when available, else an inline canvas texture) and setText(newText) to update it later (diegetic numbers: placards, tags, screens).
  place(obj, x, y, z, yaw), rectCenter helpers, a seeded RNG for prop scatter (ctx.rng.fork(label)).
  Collision logging: collide.box(x0, y0, z0, x1, y1, z1, opts), collide.rect(rect, y0, y1, opts), collide.walls(...) - each records the box in ctx.world.colliderLog AND forwards to ctx.collision.addBox / addRect / addWalls (contract section 5; it is null-safe while the collision engineer's module is absent) and returns the collision handle (or a no-op handle). Builders must go through these wrappers.
  Station helper: station(id, {object, position, prompt, icon, onUse}) -> registers ctx.interact.add({id, anchor: STATIONS[id].anchor, ...}) with a sensible default handler (shows a short bilingual description through ctx.ui.document.show or ctx.ui.toast) and records it in ctx.world.stationLog.

WORLD (ctx.world)
  createWorld(ctx) -> {root, build({only}) -> Promise, setFeature(id, on), getFeature(id), defineFeature(id, {apply(on)}), addView(name, {position, lookAt, fov}), views, colliderLog, stationLog, checkAnchors() -> [{id, problem}], area: {} }.
  build(): creates the base ground (a dark catch-all plane just below road level) and the sea east of the seawall (large water plane at WATER_Y with an animated normal map and reflective material, plus a soft horizon), registers the zones of layout ZONES that belong to no builder, then awaits each builder (city, warehouse, garage, pier, hotel) passing (ctx, parentGroup, kit), yielding to the event loop between them and emitting world:progress {done, total, label}. only: array of builder names to build a subset (harness speed).
  Features: defineFeature registers an apply(on) callback; after build every id in layout FEATURES is set to its default; setFeature emits world:feature. Unknown ids warn once, never throw.
  Builders hang their own extra APIs on ctx.world.<area> (for example ctx.world.warehouse.setTruckTag(...)): provide ctx.world.area(name) that returns/creates that namespace object.
  checkAnchors(): for every anchor in layout ANCHORS, test a 0.35 m radius, 1.8 m tall capsule (vehicle spots: a 4.8 x 2.0 m box) against colliderLog and report anchors that are blocked, plus stations in layout STATIONS that no builder registered. Area builders will be asked to keep this list empty for their area.
  ctx.debug.views = world.views.

HARNESS dev/world.html - used by every area builder, so make it robust and convenient:
  Boots createContext, then (dynamic import, each in try/catch, falling back gracefully) renderer / environment / weather / materials, your lights and world, and - if their files exist - collision.js, zones.js and interact.js from src/world (another engineer is writing those per contract section 5; register them when they load so colliders can be visualised).
  URL params: only=city,warehouse (subset of builders), view=<name> (camera preset registered by builders; default an overview), time=22.5, weather=rain, quality=low|medium|high, fly=1 (WASD + mouse-drag free-fly camera, shift = fast), colliders=1 (wireframe overlay drawn from colliderLog - your own debug drawing, independent of the collision module), plan=1 (top-down orthographic plan view of the district with the layout rectangles and anchors drawn over it, to check alignment against layout.js), lights=0 to disable the pool.
  window.__view(name), window.__views() (list), window.__check() -> world.checkAnchors(); sets window.__ready once the world is built and a few frames have rendered. Prints draw calls / triangles / active lights in a small corner readout and exposes them as window.__stats().
  Until the real builders exist, the harness must still show something meaningful (ground, water, a few test lamps demonstrating the pool with 60+ lamps and maxLights 8, a test building made with walls() and a door opening, labels, a batched prop field). Screenshot it (night rain, day, plan view, colliders view), LOOK, and report.`

// ------------------------------------------------------------------------------------------------ stage 2
const STAGE2_COMMON = `AVAILABLE to import (read their source first - it is the real API; the reports below summarise it): src/core/*.js, src/world/layout.js, src/world/buildkit.js, src/world/textures.js, src/world/materials.js, src/world/lights.js, src/world/world.js, src/world/weather.js, src/world/environment.js, src/world/renderer.js. Reach collision / zones / interact / ui / audio only through ctx or the buildkit wrappers (kit.collide.*, kit.station).

HOW YOU WORK: your builder is  export async function buildXxx(ctx, parent, kit)  called by src/world/world.js. Use the harness:  node tools/shot.cjs "dev/world.html?only=<your builder>&view=<name>&time=22.5&weather=rain&quality=medium" --out SCRATCH/x.png --w 960 --h 540 --timeout 240000  and LOOK at the result. Register several camera presets for your area with ctx.world.addView(name, {position, lookAt}). Also check plan=1 (alignment with layout.js) and colliders=1, and make window.__check() (world.checkAnchors) report nothing for your area: no anchor inside a collider, every station of your area registered with a visible prop at the right place, NPC anchor spots left free.
Everything must match src/world/layout.js exactly (footprints, door openings, anchors). Build static scenery through kit.batch() so it merges per material; instance repeated props; register every substantial obstacle as a collider through kit.collide.* (walls, furniture, vehicles, poles) but leave doorways, aisles and anchors walkable (the player capsule is 0.35 m radius, 1.8 m tall; give 1.2 m clear paths). Register lamps through ctx.lights.add (nightOnly for outdoor lamps; interior lamps always on, tagged with their zone id). Register the zones of layout ZONES that belong to your area with ctx.zones.add (null-safe).
Where the missions need to show generated numbers in the world (placards, tags, screens, boards) use kit.label(...) and expose setter functions on ctx.world.area('<name>') so a mission can write text into them at runtime; document those setters in your report.`

const B2 = `YOUR JOB: the city exterior - streets, sidewalks, the central neon block with its alleys, street furniture, the hotel's neighbours, the four backdrop corner lots with their landmarks, road-end barriers, the district boundary and the far skyline.

YOUR FILES
  src/world/city.js           export async function buildCity(ctx, parent, kit)   (replace the stub)
  src/world/buildings.js      reusable building generator (facade boxes with roofs, parapets, rooftop clutter, ground-floor storefronts, awnings, signs)
  src/world/props-street.js   street props: sodium street lamp, traffic light, bench, bin, hydrant, bollard, barrier, cone, dumpster, AC unit, fire escape, awning, neon sign (Spanish text), hanging string lights, overhead cables between poles, bus stop, phone booth, kiosk, manhole + steam, parked car (simple but decent low-poly, several colours), street-name sign

SCOPE (see layout.js: ROADWAYS, LANES, CELLS, DRIVEWAYS, CENTRAL, ROAD_ENDS, LANDMARKS, ROADBLOCK_MAREA, DISTRICT)
  Roads: the four 12 m roadways with wet-capable asphalt, lane markings (centre line, parking-lane lines, stop lines, crosswalks at the four intersections), manholes, drain grates, patched areas. Roads end at ROAD_ENDS with the given barrier kinds (construction fencing and cones, police barriers with a parked van and flashing lights, a closed port gate, a seawall guardrail) plus colliders, and continue visually into fog.
  Sidewalks: 3 m raised slabs (top at Y_WALK = 0.15) along every road on both sides with curbs; lowered to road level at DRIVEWAYS. Register them as colliders through kit.collide (their tops are the walkable floor; vehicles may mount them).
  Central block (CELLS.center, CENTRAL): four clusters of 2-4 varied buildings each (2 to 4 floors, NEVER taller than 14 m), storefronts facing all four roads with shutters, awnings and neon / painted signs in Spanish (fictional generic businesses: cantina, farmacia, casa de empeño, taquería, lavandería, billar, abarrotes, mariscos, ferretería, hotel de paso is NOT wanted - the hotel is across the avenue), balconies, rooftop water tanks and antennas. The two alleys (CENTRAL.alleyNS pedestrian with bollards at both ends, CENTRAL.alleyEW service alley) are walkable and atmospheric: dumpsters, AC units, pipes, fire escapes, hanging string lights, steam vents (ctx.weather.addEmitter), puddles, crates, back doors with caged bulbs. Buildings are solid (not enterable) with colliders.
  North cell: build ONLY the neighbours of the hotel - leave HOTEL.footprint and HOTEL.forecourt completely empty (another engineer builds the hotel): row buildings west of x = -22 and east of x = 14, and a back wall / service yard north of z = -86, up to 4 floors.
  South, west and east cells are built by other engineers (warehouse, garage, waterfront): leave CELLS.south.lot, CELLS.west.lot and CELLS.east.lot empty, but DO build their sidewalks.
  Corner cells (not enterable, perimeter fenced or walled with colliders, each with its landmark from LANDMARKS): NW apartment towers and the 55 m radio tower with red blinking lamps; NE harbour office and the 30 m lighthouse on a breakwater with a slowly rotating beam; SW power plant with a 40 m smokestack (smoke emitter) and a fenced substation; SE container port with stacked containers and the 45 m gantry crane with work lights.
  District boundary: nothing may be walkable or drivable beyond DISTRICT (colliders along the edges, visible reasons: buildings, walls, fences, barriers). Beyond it, a far skyline ring (cheap silhouettes with lit windows, a few with red aircraft lights) on the west, north and south, and the sea to the east.
  Street furniture: sodium street lamps about every 22 m alternating sides on all roads (ctx.lights.add group street, nightOnly, with light cones), traffic lights at the four intersections (emissive, slowly cycling, decorative), benches, bins, hydrants, a bus stop, a phone booth, kiosks, overhead cables, parked cars in the parking lanes (keep clear: every DRIVEWAY, the hotel curb spot around ANCHORS['hotel.parking'], and 6 m either side of each intersection).
  Feature 'roadblock.marea' (ctx.world.defineFeature): a police barricade with a parked patrol pickup, cones and flashing red/blue lamps across Paseo de la Marea at z = 18 (ROADBLOCK_MAREA), with colliders; hidden and non-colliding when off.
  Views to register: avenue (looking west along Avenida del Faro at street level), intersection, alley, alley2, malecon-skyline (from the pier side looking west at the block), overview (high oblique of the whole district), south-street, corner-ne, corner-se.

Night + rain is the hero look: warm sodium pools, neon reflected in wet asphalt, steam, fog. Check day too. Aim for about 150 draw calls for everything you build.`

const B3 = `YOUR JOB: the warehouse compound "ALMACENES MARÍTIMOS CENIZA - BODEGA 7" (south cell): yard, building shell, the full interior, and reusable industrial + office props.

YOUR FILES
  src/world/warehouse.js          export async function buildWarehouse(ctx, parent, kit)   (replace the stub)
  src/world/props-industrial.js   crate (3 colour-coded types), pallet, pallet stack, steel drum, IBC tote with a visible settable liquid level, pallet rack bay, forklift, hand truck, shipping container (several colours, fictional line names), box truck with an open rear showing cargo, chain-link fence segment + gate, roll-up door, floodlight pole, high-bay lamp, hazard-stripe decals, wall-mounted notice board, podium with a rugged tablet, electrical cabinet
  src/world/props-office.js       desk, office chair, computer monitor with an emissive screen (settable text), keyboard, desk lamp, filing cabinet, shelf with binders, ledger book, wall calendar, cork board, water cooler, terminal console (monitor + keyboard + tower with blinking LEDs), keypad lock

SCOPE - everything in layout WAREHOUSE and the warehouse.* ANCHORS / STATIONS / ZONES / FEATURES:
  Yard: chain-link fence on the WAREHOUSE.fence rectangle with the vehicle gate at WAREHOUSE.gate (feature 'warehouse.gateOpen': sliding gate + collider), an empty guard booth, floodlight poles with visible cones, stacked containers along the east and south sides, pallets, a parked forklift, puddled concrete, a big painted "BODEGA 7" on the facade and a company sign. ANCHORS['warehouse.park'] (a 4.8 x 2 m car spot) and the gate approach must stay clear.
  The three box trucks at WAREHOUSE.trucks, backed up to the three dock doors with their cabs to the north. Each truck's cargo area is open toward its dock door and visibly holds stacked equipment cases (default 18 per truck, arranged so they can be counted: 3 x 3 x 2). A placard / cargo tag on the east side of each truck at the warehouse.truckN.tag anchors: stations 'warehouse.truck1.tag' ... 'warehouse.truck3.tag'. Expose ctx.world.area('warehouse').setTruck(i, {cases, tagLines}) to change the visible case count (0-27) and the placard text.
  Notice board with the removal slip outside, east of the personnel door: station 'warehouse.slip' with setSlip(lines).
  Building shell on WAREHOUSE.footprint: 9 m walls (concrete plinth + corrugated metal), three open dock doors, the personnel door opening, the open east roll-up door, a roof with skylights, gutters, exterior lamps over the doors. Interior per WAREHOUSE.interior, floor at road level.
  Interior: polished concrete floor with painted aisle lines and hazard stripes; pallet racks rackA / rackB / rackC at WAREHOUSE.racks (1.2 m deep, 6 m tall) stocked with crates of three colour-coded types, each rack with an inventory tag board at its inspection anchor: stations 'warehouse.rackA' / 'warehouse.rackB' / 'warehouse.rackC' with setRack(id, {lines, counts: {red, blue, green}}) (the visible mix of crate colours on that rack should follow counts when given); dock staging area with pallets and hand trucks; the manifest podium with a rugged tablet at the clipboard anchor: station 'warehouse.clipboard' with setClipboard(lines); a row of five translucent IBC totes on the south wall between the cage and the office: station 'warehouse.drums' with setTotes([{fill: 0..1, label}]) changing the visible liquid levels; the chain-link evidence cage (WAREHOUSE.cage) with its door (feature 'warehouse.cageOpen' closed by default: door leaf + collider; a keypad on the post: station 'warehouse.cageDoor') and inside it the evidence terminal console with glowing monitors: station 'warehouse.terminal' with setTerminal(lines), plus shelves of sealed evidence boxes; the records office (WAREHOUSE.office: solid walls with windows into the hall and a door opening) with a desk, ledger book (station 'warehouse.ledger', setLedger(lines)), desk lamp (warm light), computer, filing cabinets (station 'warehouse.cabinet'), calendar; keep ANCHORS['warehouse.clerk'] free for an NPC (do not create NPCs).
  Lighting: cold high-bay lamps in the hall (interior group, zone 'warehouse.interior'), light shafts with dust motes under the skylights (weather emitter type dust), warm office, cyan-green terminal glow in the cage, exterior door lamps and yard floodlights (nightOnly).
  Zones 'warehouse.yard' and 'warehouse.interior' from layout ZONES.
  Views to register: warehouse.yard, warehouse.dock (outside, trucks and doors), warehouse.hall (inside looking down an aisle), warehouse.cage, warehouse.office, warehouse.totes, warehouse.aerial.
The interior must be readable and navigable: 1.6 m+ aisles, nothing blocking the paths between door -> clipboard -> racks -> totes -> cage -> office. Aim for about 110 draw calls for the whole compound.`

// ------------------------------------------------------------------------------------------------ stage 3
const B4 = `YOUR JOB: the west cell - garage "TALLER MECÁNICO RUEDA" with its gas station - and the east cell - El Malecón waterfront with the ferry pier where the player arrives.

YOUR FILES
  src/world/garage.js         export async function buildGarage(ctx, parent, kit)   (replace the stub)
  src/world/pier.js           export async function buildPier(ctx, parent, kit)     (replace the stub)
  src/world/props-garage.js   two-post car lift, workbench with vise, tool chest, tyre rack and tyre stack, oil drum, air compressor, jack stand, creeper, hanging work light, parts shelf, fuel pump, price sign, canopy, wrecked car shell, maritime lamp post, railing segment, mooring bollard, rope coil, small fishing boat, buoy with a blinking lamp
You may reuse props from src/world/props-street.js, props-industrial.js and props-office.js (read them).

GARAGE (layout GARAGE; garage.* ANCHORS / STATIONS; zone 'garage.interior'; the whole of CELLS.west.lot is yours)
  Building on GARAGE.footprint, 6.5 m, painted block walls + metal roof, the two open bay doors in the east wall (GARAGE.bays), a neon / painted sign "TALLER MECÁNICO RUEDA". Asphalt forecourt (GARAGE.forecourt) open to Calle Ancla at the garage driveway.
  Interior (floor at road level): bay 1 is EMPTY with a painted outline - the player's car parks at ANCHORS['garage.bay1'] (keep a 5.2 x 2.4 m box clear and a clear drive line in through the bay door); bay 2 has a car raised on a two-post lift (ANCHORS['garage.lift']); south workbench with the open maintenance log book: station 'garage.log' with setLog(lines); a diagnostic cart with a laptop: station 'garage.diag' with setDiag(lines); a big conversion chart on the north wall: station 'garage.chart' whose texture and default document show true, readable conversion facts (1 mile = 5,280 feet = 1,760 yards; 1 mile is about 1.6 kilometers; 1 gallon = 4 quarts and is about 3.8 liters; 1 inch = 2.54 centimeters; 1 pound = 16 ounces; 1 hour = 60 minutes; F = (9/5)C + 32); tool chests, tyre racks, oil drums, compressor, parts shelves, hanging tungsten work lights (interior group, zone 'garage.interior'), a small office corner (GARAGE.office) with a desk and calendar. Keep ANCHORS['garage.mechanic'] free for an NPC.
  Gas station: canopy (GARAGE.canopy) with lights underneath, one pump island at GARAGE.pump: station 'garage.pump' (default handler: a document describing the pump) with setPrices({perGallon, perLiter}) updating a lit price sign; the car spot ANCHORS['garage.pumpSpot'] stays clear; reachable from Calle Ancla through the gas driveway.
  Rest of the lot: scrap cars and tyres behind the garage, a perimeter wall/fence along the west and the lot edges with colliders so nothing is reachable outside the lot.
  Views: garage.front, garage.interior, garage.bench, garage.gas.

PIER (layout PIER; pier.* ANCHORS / STATIONS; zone 'pier'; the whole of CELLS.east.lot is yours)
  Promenade paving at Y_WALK with a railing along the seawall (x = 80) except where the pier deck starts, maritime lamp posts, benches, planters; the asphalt parking apron (PIER.parking) at road level with painted bays, open to Paseo de la Marea at the pier driveway - ANCHORS['pier.parking'] (the player's car in chapter 1) must be clear with a clear drive line west to the road.
  The ferry ticket kiosk (PIER.kiosk, not enterable) with a lit arrivals board on its south face: station 'pier.board' with setBoard(lines) (default: fictional ferry times).
  The wooden pier deck (PIER.deck) at Y_WALK: planks, posts, rope rails, lamps, mooring bollards, crates, coiled rope; colliders so the player cannot fall into the water (rails + invisible edge walls where needed); ANCHORS['pier.spawn'] clear and facing west with an unobstructed walk to the car.
  The moored ferry (PIER.ferry): hull, superstructure with lit windows, funnel, deck lamps, name "ESTRELLA DEL SUR"; gently bobbing; collider; not boardable. A couple of bobbing fishing boats and buoys with blinking lamps out on the water.
  The seawall face down to the water. (The water plane itself is created by world.js.)
  Views: pier.arrival (from the pier spawn looking west at the city - this is the opening shot of the game: skyline, neon, wet promenade, the parked car), pier.deck, pier.kiosk, pier.wide.
Aim for about 70 draw calls for both areas together.`

const B5 = `YOUR JOB: Hotel Mirador in the north cell - the task force's safehouse: exterior, walk-in lobby, the operations room behind it, and the rooftop observation deck.

YOUR FILES
  src/world/hotel.js            export async function buildHotel(ctx, parent, kit)   (replace the stub)
  src/world/props-interior.js   reception desk, sofa, armchair, coffee table, rug, potted plant, ceiling fan (rotating), wall sconce, elevator doors with indicator, vending machine, monitor wall (grid of emissive screens with settable canvas content), map table (lit district map drawn from layout.js), workstation desk with dual monitors, server rack with blinking LEDs, evidence board (pinned photos, strings, a settable bar chart), whiteboard, training console, exam booth, tripod spotting scope, rangefinder / theodolite on a tripod, water tank, antenna mast with a red blinker, roof AC unit, vent with steam, tarp shelter with a folding table
You may reuse props from src/world/props-street.js, props-industrial.js and props-office.js (read them).

SCOPE (layout HOTEL; hotel.*, ops.* and roof.* ANCHORS / STATIONS; zones 'hotel.lobby', 'hotel.ops', 'hotel.roof'; build only inside HOTEL.footprint and HOTEL.forecourt - the neighbours are someone else's)
  Exterior: a five-floor stucco hotel (roof deck at Y_ROOF = 18) with a balconied window grid that lights up at night, a ground-floor entrance at HOTEL.entrance with an awning, open glass doors, and a vertical neon sign "HOTEL MIRADOR" (one letter flickering, respecting reducedMotion), planters on the forecourt.
  Lobby (HOTEL.lobby, floor at Y_WALK, ceiling 4.2 m): tiled floor, reception desk with lamp, bell and key rack (station 'hotel.reception'; keep ANCHORS['hotel.receptionist'] free for an NPC), sofas and coffee table, plants, rug, ceiling fans, amber wall sconces, a vending machine, elevator doors on the east wall, and the "SOLO PERSONAL" door into the ops room at HOTEL.opsDoor (feature 'hotel.opsOpen': door leaf + collider when closed; open by default).
  Elevator: station 'hotel.elevator' in the lobby and 'roof.elevator' on the roof. Implement the default handlers here because they are pure navigation: fade out (ctx.ui.fade), play ctx.audio.play('elevator'), ctx.player.teleport to the other end's anchor, fade in. Null-safe.
  Ops room (HOTEL.ops): dark, technical. A wall of monitors on the north wall with live-looking content (district map, tables of numbers, waveforms) and the intel terminal console in front of it: station 'ops.terminal' with setTerminal(lines); the central lit map table: station 'ops.table'; the analyst's desk (keep ANCHORS['ops.analyst'] free for an NPC; station id 'ops.analyst' is created by the NPC system, not by you); the evidence board in the north-east corner with a settable chart: station 'ops.board' with setBoard({title, bars: [{label, value}], notes}); the training console on the west wall: station 'ops.drills' (sign ENTRENAMIENTO); the exam booth in the south-east: station 'ops.exam' (sign EVALUACIÓN); server racks, cable trays, whiteboard with handwritten equations, coffee corner. Lighting: cyan/teal screen glow plus a few warm desk lamps (interior group, zone 'hotel.ops').
  Upper floors are solid (no interior): colliders for the ground-floor walls with the entrance and ops-door openings, a solid block above the ground-floor ceiling up to the roof slab.
  Roof (HOTEL.roof at y = 18): gravel/felt deck (a collider slab whose top is exactly 18), a 1.1 m parapet with colliders all round, the elevator hut (HOTEL.roofHut) with its door on the west side, water tank, AC units, vents with steam, antenna mast with a red blinker, puddles, a tarp shelter with a folding table, the spotting scope at the south parapet: station 'roof.scope', and the rangefinder at the east parapet: station 'roof.rangefinder'. From the scope the player must be able to see over the central block to the warehouse and the port crane; from the rangefinder, the lighthouse.
  Expose the setters on ctx.world.area('hotel').
  Views: hotel.front (street level, night), hotel.lobby, hotel.ops, hotel.ops2 (toward the board and booth), hotel.roof, roof.south (from the scope looking south), roof.east.
Aim for about 90 draw calls.`

async function run(label, phaseTitle, body) {
  const prompt = PRE(label) + '\n\n' + body
  let r = await agent(prompt, { label, phase: phaseTitle })
  if (!r) {
    log(label + ': no report, retrying once')
    r = await agent(prompt + '\n\nNOTE: a previous attempt at this job stopped early. Inspect which of YOUR FILES already exist, keep what is good, and finish the job.', { label: label + '-retry', phase: phaseTitle })
  }
  return r || '(' + label + ' produced no report)'
}

phase('Foundation')
const [rRender, rMats, rKit] = await parallel([
  () => run('renderer-env-weather', 'Foundation', B1A),
  () => run('textures-materials', 'Foundation', B1B),
  () => run('lights-buildkit-world', 'Foundation', B1C),
])
const notes1 = '\n\n===== REPORTS FROM THE FOUNDATION ENGINEERS (their files are in the tree - read the source) =====\n--- renderer / environment / weather ---\n' + rRender + '\n--- textures / materials ---\n' + rMats + '\n--- lights / buildkit / world / harness ---\n' + rKit

phase('City and Warehouse')
const [rCity, rWarehouse] = await parallel([
  () => run('city', 'City and Warehouse', B2 + '\n\n' + STAGE2_COMMON + notes1),
  () => run('warehouse', 'City and Warehouse', B3 + '\n\n' + STAGE2_COMMON + notes1),
])
const notes2 = notes1 + '\n\n===== REPORTS FROM THE CITY AND WAREHOUSE ENGINEERS =====\n--- city ---\n' + rCity + '\n--- warehouse ---\n' + rWarehouse

phase('Garage, Pier and Hotel')
const [rGarage, rHotel] = await parallel([
  () => run('garage-pier', 'Garage, Pier and Hotel', B4 + '\n\n' + STAGE2_COMMON + notes2),
  () => run('hotel', 'Garage, Pier and Hotel', B5 + '\n\n' + STAGE2_COMMON + notes2),
])
return { rRender, rMats, rKit, rCity, rWarehouse, rGarage, rHotel }
