export const meta = {
  name: 'narco-actors',
  description: 'NARCO: SHADOW EMPIRE - input, collision, player, camera, character, vehicle, audio, ambient life',
  phases: [
    { title: 'Controller and Character', detail: 'input/collision/zones/interact/player/camera/touch; procedural humanoid + NPCs' },
    { title: 'Vehicle and Audio', detail: 'drivable car; synthesized audio engine' },
    { title: 'Ambient Life', detail: 'traffic and pedestrians' },
  ],
}

const SCRATCH_BASE = '<SCRATCH_DIR>'

const PRE = (label) => `You are one of several engineers building a game in parallel.

PROJECT - "NARCO: SHADOW EMPIRE - Operation Numbers": a cinematic third-person 3D investigation game for the browser (three.js r160 vendored, plain ES modules, no build step in dev, ZERO network requests at runtime, everything procedural - no asset files). Its purpose is to train a learner for the ASVAB Arithmetic Reasoning and Mathematics Knowledge subtests: every important gate in the game is a math problem. The player is an undercover analyst-operative (codename Cifra) who walks and drives around the rain-soaked fictional port city Puerto Ceniza, inspecting evidence at warehouses, a garage and an operations room. Fiction only.

ROOT: /home/user/Ocado-Pack/narco-shadow-empire   (cd there first; every path below is relative to it)
SCRATCH: ${SCRATCH_BASE}/${label}/   (create it; ALL temporary files and screenshots go here, never in the repo)

READ BEFORE WRITING CODE: docs/ARCHITECTURE.md (THE CONTRACT - implement the names and signatures given there exactly), src/world/layout.js (the spatial contract), src/core/context.js, src/core/util.js (yaw convention!), src/core/ltext.js, src/core/settings.js, src/core/flow.js, src/core/loop.js, dev/_template.html, and the header comment of tools/shot.cjs.

HARD RULES
1. Edit ONLY the files listed under YOUR FILES (create them). Other engineers are creating their own files in this same working tree right now - never touch, move, reformat or delete anything else, even if it looks wrong or unfinished. If another file needs a change, say so under REQUESTS in your final report.
2. No git commands that write (add/commit/stash/checkout/reset/clean/restore). No new npm dependencies. No network access at runtime, no external assets: geometry, textures and sound are generated in code.
3. Plain JavaScript ES modules with JSDoc. three.js r160 only (import * as THREE from 'three'; addons from 'three/addons/...'). When unsure whether an API exists in r160, grep vendor/three.
4. Player-facing strings are bilingual: L(en, es) from src/core/ltext.js or ctx.i18n string tables (ctx.i18n.addStrings). Natural Latin-American Spanish with correct accents.
5. A module you depend on may be missing or half-written right now. Statically import only what is listed as AVAILABLE; reach everything else through ctx (ctx.<system> is always safely callable - see "Null objects" in the contract; use ctx.has(name) before READING state). In dev harness pages (dev/*.html) you MAY use dynamic import() inside try/catch to pick up optional modules, with an inline fallback; never in src/.
6. No placeholders: everything you expose must really work. No TODOs.
7. Shipping constraint: the game is later bundled into ONE offline html file: in src/ no fetch of local files, no Workers, no import.meta.url asset loading, no dynamic import.
8. Frame-rate independence: all motion integrates with dt; logic must behave the same at 5 FPS and 144 FPS (the loop clamps dt to 1/15 s; sub-step where stability needs it). Tests fast-forward with ctx.loop.fastForward(seconds) at a fixed 1/60 step without rendering.
9. VERIFY before you finish: build a harness page dev/<name>.html with an automated self-check function window.__selfcheck() (returns {pass, results: [{name, ok, detail}]}) that drives your systems through ctx.input.setVirtual / ctx.loop.fastForward and asserts real behaviour; run it with   node tools/shot.cjs "dev/<name>.html?quality=low" --eval "window.__selfcheck()" --out SCRATCH/x.png --w 960 --h 540 --timeout 240000   Also LOOK at screenshots with the Read tool where visuals matter. Rendering here is software WebGL (a few FPS, slower while other engineers render): small viewports, patience. Zero console errors and zero page errors in the shot report.

FINAL REPORT - your last message is returned verbatim to the lead engineer and pasted into other engineers' briefs. Keep it precise, under 70 lines:
FILES: what you created. API: the exact public API (signatures, events emitted, settings read, debug hooks), flagging any deviation from docs/ARCHITECTURE.md and why. VERIFIED: what you ran (self-check results, screenshots inspected and what they showed). GAPS: anything not done or weak - be honest. REQUESTS: changes needed in files you do not own.`

const C1 = `YOUR JOB: the on-foot gameplay core - input, static collision, zones, interaction, the third-person player controller, the camera rig, and touch controls.

AVAILABLE to import: src/core/*.js, src/world/layout.js, src/world/character.js (currently a STUB with the final interface - another engineer is replacing it with the real procedural humanoid right now; read its header comment and code against that interface). Renderer/world modules are being written by others: in src/ reach ctx.gfx / ctx.ui / ctx.audio / ctx.vehicle only through ctx. In your harness, use dynamic import in try/catch for ../src/world/renderer.js with a minimal inline fallback (a WebGLRenderer + scene + camera registered as a tiny ctx.gfx with scene, camera, renderer, render()).

YOUR FILES
  src/core/input.js       createInput(ctx) -> ctx.input (order 0, runWhenPaused) - contract section 6
  src/world/collision.js  createCollision(ctx) -> ctx.collision - contract section 5
  src/world/zones.js      createZones(ctx) -> ctx.zones (order 46)
  src/world/interact.js   createInteract(ctx) -> ctx.interact (order 45)
  src/world/player.js     createPlayer(ctx) -> ctx.player (order 20)
  src/world/camera.js     createCameraRig(ctx) -> ctx.cameraRig (order 40, runWhenPaused)
  src/ui/touch.js         createTouchControls(ctx) - on-screen controls for touch devices
  src/styles/touch.css    styles for them (use the design tokens in src/styles/base.css)
  src/i18n/controls.js    bilingual strings for prompts / control labels (export default {en: {...}, es: {...}})
  dev/player.html         harness with a test arena and window.__selfcheck()

INPUT (ctx.input) - exactly the contract API: move {x, y}, look {dx, dy}, down / pressed / released (action), setVirtual, tap, pointerLocked, requestPointerLock, exitPointerLock, isTouch, lastDevice, label(action), endFrame(), plus zoom (wheel delta this frame).
  Actions: run jump crouch interact vehicle phone map pause tutor headlights handbrake horn camera skip. Keyboard: WASD and arrows, Shift run, Space jump (and handbrake when driving), C or Ctrl crouch, E interact, F enter/exit vehicle, Tab or P phone, M map, Esc pause, H tutor, L headlights, G horn, V camera, Enter skip. Mouse: pointer-lock look when available (request on canvas click while ctx.flow.worldInput and not ctx.flow.cursorFree); if pointer lock is refused or unavailable (sandboxed iframe), fall back to drag-to-look with either mouse button. Wheel zooms the camera. Optional gamepad (standard mapping).
  Gating: when ctx.flow.worldInput is false, move and look are zero and gameplay actions read false - but EVERY key press still emits the event input:action {action, device} so UI can react (pause, phone, map, tutor, skip). Never capture keys while the user types in an input/textarea/contenteditable. Prevent default for game keys (Tab, Space, arrows) only in world mode. Clear held keys on blur / visibility change. Release pointer lock when ctx.flow.cursorFree becomes true.
  setVirtual({moveX, moveY, lookDX, lookDY, down: {action: bool}}) merges a virtual device (touch UI and tests); tap(action) = one-frame press. label(action) -> the key cap text for prompts ('E', 'F', 'Tab'...) or a short touch label when lastDevice is touch. Sensitivity and invertY from settings.

COLLISION (ctx.collision) - exactly the contract API: addBox, addRect, addWalls (four walls just inside a rect with openings and lintels), handle.setEnabled / remove, groundY, moveCapsule, raycast, resolveBoxXZ, debug(on), count.
  Static axis-aligned boxes in a uniform spatial hash (8 m cells). Flags per contract defaults: boxes whose top is at most 0.3 m above road level do not block vehicles; boxes under 1.5 m tall do not block the camera; every box top is a walkable floor.
  moveCapsule(pos, delta, radius, height) -> {x, y, z, grounded, hitWall, hitHead}: vertical capsule vs boxes - resolve XZ as circle-vs-rectangle for boxes overlapping the capsule's vertical span, slide along walls (iterate 3 times), step up obstacles whose top is at most 0.4 m above the feet when there is headroom, snap down small drops when walking (0.4 m), land on the highest box top under the feet, stop at ceilings. No tunnelling at 6 m/s and dt 1/15 (sub-step moves longer than the radius).
  raycast(origin, dir, maxDist, mask) slab test -> nearest {distance, point, normal, handle} or null; mask 'player' | 'vehicle' | 'camera'.
  resolveBoxXZ(cx, cz, halfLen, halfWid, yaw, yMin, yMax) -> {x, z, hit, nx, nz, depth}: push an oriented rectangle (a car) out of all overlapping vehicle-blocking boxes (separating-axis test, iterate up to 4 times).
  groundY(x, z, fromY, maxUp = 0.4): highest walkable top at (x, z) that is <= fromY + maxUp, or 0 when none.
  Pure data + math (no three.js needed except for the optional debug wireframes, which lazily use ctx.gfx.scene).

ZONES (ctx.zones): add({id, rect, y0, y1, indoor, ambience}), current (Set), indoor (0-1 smoothed over ~0.6 s), isInside(id), at(x, y, z) -> ids. Tracks the player's position (the vehicle's while driving; the camera position if there is no player). Emits zone:enter / zone:exit.

INTERACT (ctx.interact) - the contract API: add({id, anchor, position, radius, prompt, icon, object, enabled, onUse}), setHandler(id, fn or null to restore the default), setEnabled, setPrompt, get, remove, setObjective(id or null), focused, list().
  position is the thing the player looks at; when only anchor is given use the layout anchor position plus 1 m forward along its yaw at 1.1 m height. Focus = the nearest enabled interactable whose position is within radius (default 2.2 m) of the player and roughly in front of the camera or the player (within about 110 degrees); only on foot and only while ctx.flow.worldInput. Shows the prompt through ctx.ui.hud.showPrompt({text, key: ctx.input.label('interact'), icon}) (null to hide) and ALSO keeps the same info in ctx.interact.focused for other UIs. On the interact action: ctx.player.gesture('use'), call the handler(ctx, it), emit interact:use. Emit interact:focus on change. Objective highlight: setObjective(id) shows a slowly pulsing vertical beacon + ground ring at that interactable (soft amber, additive, visible through rain but not through walls is fine either way) and makes its object's emissive pulse if it has one; reducedMotion -> steady.

PLAYER (ctx.player) - the contract API: object, position (feet), yaw, velocity, grounded, state, teleport(anchorId or [x,y,z], yaw), setVisible, setEnabled, gesture(name).
  Capsule radius 0.35, height 1.8 (crouch 1.1). Camera-relative movement from ctx.input.move and ctx.cameraRig.yaw; smooth acceleration/deceleration; walk 1.8 m/s, run 5.0 m/s (Shift), crouch-walk 1.1 m/s; the body turns smoothly toward the movement direction; gravity 22 m/s2; jump about 1.0 m apex with coyote time and jump buffering; crouch toggles on C / holds on Ctrl and cannot stand up under a low ceiling; states idle walk run jump fall crouch crouchwalk driving. Footsteps: emit player:step {surface, running} by distance travelled (surface from the tag of the collider under the feet: metal, wood, water, carpet; default concrete), player:jump, player:land {speed}.
  Uses createCharacter({preset: 'player'}) from src/world/character.js and calls ch.update(dt, {state, speed, crouch, grounded, vy}) every frame; gesture(name) forwards to ch.play(name).
  While ctx.vehicle.occupied (check ctx.has('vehicle')): state 'driving', hidden, position follows the vehicle. setEnabled(false) freezes input (cinematics). teleport resolves anchor ids through layout ANCHORS, snaps to the ground, zeroes velocity and re-centres the camera behind the player.
  ctx.debug.teleport = player.teleport; ctx.debug.playerInfo().

CAMERA (ctx.cameraRig) - the contract API: mode ('follow' | 'vehicle' | 'cinematic' | 'focus'), setMode, yaw, pitch, focus({position, lookAt, fov}, seconds) -> Promise, unfocus(seconds) -> Promise, setPose({position, lookAt, fov}), shake(amount, seconds), recenter().
  follow: orbit around a point 1.55 m above the feet (1.05 when crouched) with a slight right-shoulder offset, distance 3.6 m (wheel or the camera action cycles 2.4 / 3.6 / 5.2), yaw/pitch from ctx.input.look, pitch clamped (-35 to +65 degrees), smoothed with damping; COLLISION: ray from the pivot to the desired camera position (collision.raycast, mask camera, with a 0.25 m margin) pulls the camera in so it never ends up inside or behind a wall, and eases back out; near interiors it must not jitter.
  vehicle: chase camera behind ctx.vehicle (read position/yaw/speed via ctx, null-safe): distance and height grow slightly with speed, looks ahead of the car, the player may orbit with look input and the camera drifts back behind the car after ~2 s without input; same collision handling.
  cinematic: the pose is set externally each frame with setPose. focus: tween from the current pose to a given pose (ease in-out), hold, and unfocus tweens back to the gameplay camera. reducedMotion: no shake, no FOV kick, focus/unfocus become quick cross-fades (ctx.ui.fade) or instant cuts.
  Drives ctx.gfx.camera (position, quaternion, fov + updateProjectionMatrix). FOV from settings.fov with a small sprint/speed kick.

TOUCH CONTROLS (src/ui/touch.js + touch.css): shown when settings.touchControls is 'on', or 'auto' and a touch device is detected (and when the first touchstart happens). A dynamic left thumb-stick (appears where the thumb lands in the left 45% of the screen), look-drag on the right side, buttons bottom-right: Interact (label follows ctx.interact.focused), Jump, Run (toggle), Crouch (toggle), Vehicle (shows only near the car or when driving), and top-right: Phone, Pause, Tutor. While driving: stick X steers, big Gas and Brake/Reverse pedals, Handbrake, Lights. All through ctx.input.setVirtual / tap. Hidden whenever ctx.flow.worldInput is false. 44 px minimum targets, safe-area insets, works in portrait and landscape. Mount into ctx.ui.layer('touch') when ctx.has('ui'), else into a div you append to #ui.

HARNESS dev/player.html: a lit test arena built from collision boxes with matching meshes: flat floor, a wall, a 1 m wide doorway, a low beam at 1.3 m (crouch under it), stairs with 0.2 m steps, a 0.3 m step and a 0.6 m ledge, a 0.15 m raised slab (sidewalk), a 1.2 m platform reachable only by the stairs, a narrow corridor, two interactables with visible props, a zone marked indoor. window.__selfcheck() must assert at least: walking forward 3 s covers about 5.4 m; running about 15 m; a wall stops the capsule and it slides along it; the 0.3 m step is climbed, the 0.6 m ledge is not; the stairs reach the platform; jump apex is 0.9-1.2 m; crouching passes under the beam and standing up under it is refused; teleport by anchor id works; interact focus appears in range and the handler fires on the interact action; nothing happens when ctx.flow.worldInput is false; zone enter/exit events fire and zones.indoor ramps; the follow camera never sits inside a collider (sample while orbiting next to a wall); raycast and resolveBoxXZ return correct results for known cases; input:action events fire for pause/phone even while a modal is open. Take a screenshot of the arena with the player and look at it.`

const C3 = `YOUR JOB: the procedural humanoid character (player and NPCs) with procedural animation, and the NPC system.

AVAILABLE to import: src/core/*.js, src/world/layout.js. Renderer and other systems are being written by others; reach them only through ctx. In your harness use dynamic import in try/catch for ../src/world/renderer.js, with a minimal inline fallback renderer.

YOUR FILES
  src/world/character.js   createCharacter(opts) - REPLACE the existing stub, keeping its documented interface (read its header comment) and extending it
  src/world/npc.js         createNpcs(ctx) -> ctx.npcs (order 30)
  src/i18n/npc.js          bilingual ambient lines for the story NPCs (export default {en, es}) if you use string tables
  dev/character.html       harness: turntable, state selector, preset line-up, window.__selfcheck()

CHARACTER  createCharacter({preset, seed, height, colors}) -> {object, height, update(dt, {state, speed, crouch, grounded, vy, lookAt}), play(gesture) -> Promise, setPreset(name), bones, dispose()}
  object: THREE.Group with the feet at the origin, facing -Z, about 1.78 m tall (height option scales it).
  Build a believable stylised-realistic adult from primitives arranged on a joint hierarchy (hips -> spine -> chest -> neck -> head; clavicles -> upper arm -> forearm -> hand; hips -> thigh -> shin -> foot): tapered torso and pelvis, capsule limbs with visible elbows/knees, hands, boots, a head with hair, ears, a subtle nose and brow (no uncanny face - keep features minimal but human). Clothing through shape and material: jacket with collar and hem, trousers, belt, boots. Smooth shading, rounded forms, natural proportions (head about 1/7.5 of height, hands reach mid-thigh, shoulders wider than hips). All meshes castShadow.
  Procedural animation driven by update(): idle (breathing, slow weight shift, occasional glance), walk and run cycles keyed to actual speed (stride length matches ground speed so feet do not slide: leg swing with knee bend, heel-to-toe foot roll, counter-swinging arms with elbow bend, torso bob, lean and twist, head stabilised), crouch and crouch-walk, jump (anticipation, tuck) / fall / land (squash and recover), driving (seated, hands on a wheel at chest height), and one-shot gestures via play(): inspect (lean in, hand to chin), use (reach forward with the right hand), pickup (bend and reach down), talk (conversational hand movement), type (both hands forward, small finger motion). Blend between states over about 0.15 s by interpolating joint targets - no pops. lookAt (a world position) turns head and upper torso within natural limits.
  Presets (clothing colours + accessories): player (dark hooded rain jacket, jeans, boots, cross-body satchel, small earpiece), clerk (hi-vis vest over a shirt, cap, clipboard in hand), mechanic (coveralls with a rag in the pocket, cap), analyst (shirt, lanyard badge, glasses, rolled sleeves), receptionist (blazer, name tag), pedestrian (seeded variety: raincoat or jacket colours, optional hat, optional open umbrella held overhead, optional shopping bag; vary height and build slightly).
  Performance: at most about 30 meshes per character, shared geometries and materials across characters (cache by preset/colour); update() must be allocation-free.

NPCS (ctx.npcs): add({id, anchor or position, yaw, preset, name: LText, idle: 'stand' | 'type' | 'lean' | 'clipboard' | 'sit', station, lines}) -> npc {id, object, name, lookAt(pos or null), setVisible(b), setIdle(name), say(lines) -> Promise}; get(id), remove(id), list(), spawnDefaults().
  Each NPC stands at its anchor (layout ANCHORS, feet on the ground), plays its idle, and turns head/torso to look at the player when within 4 m (ctx.player.position, null-safe). Registers an interactable through ctx.interact.add({id: station id, position at chest height, prompt: L('Talk to <name>', 'Hablar con <name>'), icon: 'talk'}) whose default handler plays 1-2 short in-character bilingual ambient lines through ctx.dialog.play([...], {mode: 'talk'}) (null-safe); missions will override it with ctx.interact.setHandler.
  spawnDefaults() creates the four story NPCs: Darío Ibarra (preset analyst, anchor ops.analyst, idle type, station id 'ops.analyst'), Lupe Rentería (mechanic, garage.mechanic, idle stand, station 'garage.mechanic'), Tomás Quiroga (clerk, warehouse.clerk, idle clipboard, station 'warehouse.clerk'), Marisol (receptionist, hotel.receptionist, idle stand, station 'hotel.reception'). Their default lines must fit the story bible in the contract (section 11) and stay non-violent and fictional.
  Skip animation updates for NPCs farther than 60 m from the camera.

HARNESS dev/character.html: neutral three-point lighting on a ground plane; URL params preset, state (idle walk run crouch crouchwalk jump fall driving), gesture, speed, lineup=1 (all presets side by side), turn=1 (turntable). window.__selfcheck(): every preset builds; every state and gesture runs 2 s without NaN in any joint and without the feet sinking below the ground or floating more than a few centimetres in idle/walk; bounding box height about 1.78 m; update() does not allocate (same object count before/after 600 updates); NPC add/get/remove and default NPCs spawn at their anchors.
  Take and LOOK AT screenshots: the line-up from the front, a side view mid-stride walking, running, crouching, the driving pose, each gesture. Iterate until the figure reads as a person with natural proportions - no detached or interpenetrating limbs, no robot stiffness. This character is on screen for the whole game: its quality matters.`

const C2 = `YOUR JOB: the player's drivable car - procedural model, arcade-physical driving, collisions, enter/exit, lights, fuel and telemetry.

AVAILABLE to import (read their source first): src/core/*.js, src/world/layout.js, src/world/collision.js, src/world/camera.js, src/world/player.js, src/world/interact.js, src/world/character.js, src/core/input.js. Reach ctx.gfx / ctx.env / ctx.weather / ctx.lights / ctx.mats / ctx.ui / ctx.audio only through ctx (ctx.mats may be absent: then use your own MeshStandard/MeshPhysical materials). In your harness use dynamic import in try/catch for ../src/world/renderer.js with an inline fallback.

YOUR FILES
  src/world/carmodel.js   buildCar({style, color, seed, lod}) -> {object, dims, wheels, parts, setLights({head, brake, reverse}), update(dt, {speed, steer, wipers})}
  src/world/vehicle.js    createVehicle(ctx) -> ctx.vehicle (order 25) - contract section 6
  src/i18n/vehicle.js     bilingual strings (prompts, toasts)
  dev/vehicle.html        harness with layout-derived block colliders and window.__selfcheck()

CAR MODEL: origin on the ground at the centre, facing -Z. A mid-size sedan about 4.6 x 1.85 x 1.45 m built procedurally with real shape: a lofted or extruded body with a proper side profile (hood, raked windshield, roof, trunk), wheel arches, four wheels (tyre, rim, hub) on steerable front pivots, glass (windshield, side and rear windows), headlamp and tail-lamp lenses (emissive, switchable), grille, bumpers, mirrors, a fictional number plate (PCZ-4827), interior silhouettes visible through the glass (seats, dashboard, steering wheel), two wipers. Paint: MeshPhysicalMaterial with clearcoat (use ctx.mats.carPaint when available). The player's car is a slightly weathered dark teal sedan. Styles sedan | hatch | pickup | van and lod 'low' variants (few meshes, merged) exist for parked/traffic cars - another engineer will instance them, so keep buildCar cheap and its geometries/materials cached. parts exposes at least {headlights, taillights, steeringWheel, wipers, driverSeat (a point where a seated character can be attached)}.

VEHICLE (ctx.vehicle) - the contract API: object, position, yaw, speed (m/s signed), occupied, enter(), exit(), canEnter(), teleport(anchorId or [x,y,z], yaw), fuel, fuelCapacity, tripMeters, resetTrip(), refuel(liters), headlights, setLocked(b), telemetry(), plus getState() / setState(s) for save games.
  Driving: bicycle-model arcade physics integrated at a fixed 1/120 s sub-step. Inputs when occupied and ctx.flow.worldInput: throttle = input.move.y > 0, brake = move.y < 0 (and reverse once stopped), steer = input.move.x, handbrake action. Targets: 0-50 km/h in about 4.5 s, top speed about 110 km/h, brakes about 8 m/s2, reverse capped near 20 km/h, steering lock 34 degrees shrinking with speed, lateral grip limit (mu 1.0 dry, about 0.8 at full ctx.env.wetness) so the car understeers believably when pushed and the handbrake kicks the tail out; self-centring steering; body roll and pitch; wheel spin and steer animation; a small bump when mounting curbs (sample ctx.collision.groundY under the wheels for a visual ride height). It must be easy and pleasant to drive around the ring road with a keyboard in the rain.
  Collisions: each sub-step call ctx.collision.resolveBoxXZ with the car's oriented footprint; on a hit remove the velocity component into the wall, lose speed proportional to the impact and emit vehicle:collision {speed}; no tunnelling at top speed; the car can always back out of a wall (never gets stuck).
  Enter / exit: registers the interactable 'car' (prompt Enter vehicle / Subir al vehículo, icon car) and also listens for the vehicle action (F) when the player is within 2.6 m of a door. enter(): hide the player, show a seated driver (createCharacter preset player in the driving pose attached at the driver seat), ctx.cameraRig.setMode('vehicle'), emit vehicle:enter. exit(): only below 5 km/h (otherwise a toast: stop the car first); place the player beside the driver door if that spot is free (collision test), else the passenger side, else behind; ctx.cameraRig.setMode('follow'); emit vehicle:exit. setLocked(true) prevents entering (missions).
  Lights: two real spot lights for the headlamps (through ctx.lights.add with group 'vehicle' when ctx.has('lights'), else your own SpotLights) plus soft cones; toggled with the headlights action and switched on automatically at night (env:night); brake lamps when braking, reverse lamps in reverse. Wipers run while it rains (ctx.env.weather) and the car is occupied.
  Fuel and trip: fuelCapacity 50 L, starts at 32 L; consumption 9 L per 100 km plus 0.8 L/h idling, multiplied by vehicle.fuelScale (default 20 so the gauge visibly moves in a small district; documented); at 0 the engine cuts and the car coasts; refuel(liters) clamps to capacity. tripMeters and odometerMeters accumulate distance driven; resetTrip().
  telemetry() -> {speedMps, speedMph, speedKmh, rpm (0-1), gear 'P' | 'D' | 'R' | 'N', fuelL, fuelGal, fuelPct, tripKm, tripMi, odometerKm, headlights, engineOn} (1 mile = 1.609344 km, 1 US gallon = 3.785411784 L).
  ctx.debug.autodrive(points, {speedKmh}) -> starts a simple pure-pursuit autopilot along [x, z] waypoints (used by automated tests and nowhere else); ctx.debug.autodriveStatus() -> {done, index, stuck}.

HARNESS dev/vehicle.html: a road-level ground plane plus visible grey boxes generated from layout (the central block CELLS.center.outer and the outer cells' lots as colliders, so the ring road exists) and a few test walls. window.__selfcheck() must assert at least: full throttle reaches 50 km/h in 3.5-6 s; braking from 50 km/h stops within 25 m; steering changes yaw in the right direction (left input turns left) both forward and in reverse; reverse works after stopping; the handbrake slows the car; driving into a wall at 80 km/h stops it without passing through and it can reverse out; fuel decreases with distance and the car coasts at empty then refuels; trip distance matches distance travelled within 2%; telemetry units are consistent; enter/exit swaps the camera mode, hides/shows the player, and exit is refused at speed; autodrive completes the chapter-1 route (layout ROUTE_CH1, pier parking to the warehouse yard) without getting stuck, in under 120 simulated seconds. Screenshot the car (three-quarter front and rear views, night with headlights on) and LOOK: it must read as a real car, not a box.`

const E1 = `YOUR JOB: the fully synthesized audio engine (WebAudio, no audio files): ambience, rain, engine, footsteps, UI sounds, a minimal generative score, and optional speech for dialogue.

AVAILABLE to import: src/core/*.js. Everything else through ctx and events.

YOUR FILES
  src/core/audio.js    createAudio(ctx) -> ctx.audio (order 70, runWhenPaused) - contract section 6
  dev/audio.html       harness with buttons for every sound and window.__selfcheck()

API: unlock(), unlocked, play(id, {volume, pitch}), setAmbience(id), music(id or null), speak(text, {lang, pitch, rate}) -> Promise, stopSpeech(), setEngine({on, rpm, load, speed}), setRain(intensity, indoor), update(dt), plus ids -> list of all one-shot ids.
  Graph: master -> compressor -> destination, with buses ambient, sfx, music, voice whose gains follow settings volMaster, volAmbient, volSfx, volMusic, volVoice live. The AudioContext is created lazily and resumed on the first user gesture (pointerdown / keydown / touchstart) or when unlock() is called; emit audio:unlocked. Suspend when the page is hidden. When AudioContext does not exist (Node, old browsers) every method is a silent no-op - never throw.
  One-shots (short, tasteful, mixed quietly; all synthesized from oscillators and filtered noise): ui.click ui.hover ui.open ui.close ui.correct (bright rising two-note) ui.wrong (soft low double-thud, never harsh) ui.hint (gentle chime) ui.unlock (mechanical clunk + rising tone) ui.type ui.notify (radio blip) ui.levelup (short arpeggio) ui.tick (timer) keypad paper elevator (ding + hum) pickup door.open door.metal car.door car.start car.horn car.crash (scaled by volume) radio.open radio.close (squelch) thunder (long rumble) step.concrete step.metal step.wood step.carpet step.water (puddle splash).
  Ambience beds that cross-fade over about 1.5 s: street (distant traffic rumble, an occasional far-off dog or siren very rarely and very quietly), yard, pier (slow waves, rope creak, a distant bell buoy), roof (wind), lobby (room tone, a clock, faint old radio), ops (computer hum, soft data chirps), garage (fluorescent hum, an occasional distant impact-wrench burst, compressor), warehouse (large reverberant room tone, ventilation), menu, none.
  Rain layer: filtered noise whose level follows ctx.env intensity; indoors (ctx.zones.indoor) it is low-passed and replaced by roof patter; thunder on the event env:lightning.
  Engine: detuned oscillators through a low-pass, pitch from rpm, level from load, plus tyre/road noise by speed and wet-road hiss when ctx.env.wetness is high; idle when stopped; car.start when the engine starts.
  Music: a restrained generative score (slow pad chords, a low pulse, sparse plucked notes in a minor mode) with states menu | investigate | tension | finale | null; cross-fades; never fatiguing; silent when volMusic is 0.
  Speech: speak() uses window.speechSynthesis when settings.voice is true and it exists, choosing a voice that matches lang ('en' or 'es'), resolving when the utterance ends (with a timeout safety) and resolving immediately when unavailable. stopSpeech().
  Self-wiring (so other modules need not call you): zone:enter/exit -> ambience by the zone's ambience field (fallback street); env:weather / per-frame env intensity -> rain; ctx.zones.indoor -> muffling; when ctx.has('vehicle') and it is occupied read ctx.vehicle.telemetry() each update -> engine; vehicle:enter / exit -> car.door (+ car.start); vehicle:collision -> car.crash; player:step -> step.<surface>; player:land; interact:use -> ui.click; puzzle:answer -> ui.correct / ui.wrong; tutor:hint -> ui.hint; learning:level (up) -> ui.levelup; mission:checkpoint -> soft chime; flow:modal -> ui.open / ui.close; dialog:line in radio mode -> radio.open; exam timer ticks are played by the exam UI through play('ui.tick').
  Zero allocations in update(); schedule with AudioParam ramps, not per-frame node creation.

HARNESS dev/audio.html: a grid of buttons (every one-shot, each ambience, rain slider, engine rpm/load sliders, music states, speak EN/ES). window.__selfcheck(): creates the engine (the shot tool launches Chromium with autoplay allowed), triggers every one-shot id without exceptions, switches every ambience and music state, drives engine/rain parameters, changes volume settings and checks the bus gains follow, verifies no-op safety when AudioContext is deleted, and renders a few representative sounds (ui.correct, ui.wrong, step.concrete, car.horn, one second of rain, one second of engine) through an OfflineAudioContext asserting the output is non-silent (RMS above a threshold) and not clipping (peak <= 1).`

const C4 = `YOUR JOB: ambient life - a few traffic cars circulating on the ring road and pedestrians on the sidewalks - so the district feels inhabited without ever getting in the way of a mission.

AVAILABLE to import (read their source first): src/core/*.js, src/world/layout.js (ROADWAYS, LANES, CELLS, DRIVEWAYS, ANCHORS), src/world/carmodel.js, src/world/character.js, src/world/collision.js. Everything else through ctx.

YOUR FILES
  src/world/traffic.js   createTraffic(ctx) -> ctx.traffic (order 28)
  dev/traffic.html       harness with window.__selfcheck()

TRAFFIC: 3 to 5 cars (count scaled by settings.traffic and quality) using buildCar({lod: 'low'}) in varied styles/colours with headlights at night, following closed lane-centre loops around the ring (clockwise on the inner lanes and counter-clockwise on the outer lanes, built from layout LANES with rounded corners at the four intersections), at 25-35 km/h. Each car keeps a safe gap: it brakes smoothly and stops for anything ahead in its lane corridor - another traffic car, the player's car (ctx.vehicle), the player on foot (ctx.player), or an enabled 'roadblock.marea' feature (listen for world:feature; cars must turn around or queue well before the barricade, or simply avoid the closed segment by using a loop that excludes it while the feature is on) - then pulls away again; a stopped car honks rarely (ctx.audio.play('car.horn', {volume}) at low volume) and after about 12 s of being blocked by the player it despawns and respawns elsewhere out of sight. Traffic never drives through the player's car: if they overlap anyway, push the player's car out sideways gently and emit vehicle:collision with a low speed. Traffic cars are kinematic (no physics), cheap, and their wheels spin.
  Pedestrians: 6 to 10 walkers (createCharacter preset pedestrian with seeds; some with umbrellas when it rains) walking sidewalk loops around the central block and along the malecón at 1.2-1.5 m/s, stepping around the player (stop and wait if the player blocks them), pausing occasionally under awnings. They never enter roadways except at crosswalk corners, never enter buildings, and stay out of the anchors used by missions (2 m clearance from every layout anchor).
  API: traffic.setEnabled(b), traffic.setDensity(0-1), traffic.cars, traffic.walkers, traffic.clearNear(x, z, radius) (remove/relocate anything near a spot - missions call this around their staging areas), traffic.reset(). Skip updates for anything farther than about 120 m from the camera; freeze entirely while ctx.flow.simPaused (the loop already skips you).
  HARNESS dev/traffic.html (flat ground + layout-derived block colliders, like dev/vehicle.html): window.__selfcheck(): after 120 simulated seconds every car has stayed within 2 m of its lane loop and off the sidewalks, no two cars overlap, cars stop for an obstacle placed ahead and resume when it is removed, pedestrians stay on sidewalk rectangles, clearNear works, setEnabled(false) hides everything, and update() cost is small (time 600 updates). Screenshot the ring road at night with traffic and walkers and look at it.`

async function run(label, phaseTitle, body) {
  const prompt = PRE(label) + '\n\n' + body
  let r = await agent(prompt, { label, phase: phaseTitle })
  if (!r) {
    log(label + ': no report, retrying once')
    r = await agent(prompt + '\n\nNOTE: a previous attempt at this job stopped early. Inspect which of YOUR FILES already exist, keep what is good, and finish the job.', { label: label + '-retry', phase: phaseTitle })
  }
  return r || '(' + label + ' produced no report)'
}

phase('Controller and Character')
const [rController, rCharacter] = await parallel([
  () => run('controller', 'Controller and Character', C1),
  () => run('character', 'Controller and Character', C3),
])
const notes1 = '\n\n===== REPORTS FROM THE CONTROLLER AND CHARACTER ENGINEERS (their files are in the tree - read the source) =====\n--- input / collision / zones / interact / player / camera / touch ---\n' + rController + '\n--- character / npc ---\n' + rCharacter

phase('Vehicle and Audio')
const [rVehicle, rAudio] = await parallel([
  () => run('vehicle', 'Vehicle and Audio', C2 + notes1),
  () => run('audio', 'Vehicle and Audio', E1),
])
const notes2 = notes1 + '\n\n===== REPORT FROM THE VEHICLE ENGINEER =====\n' + rVehicle

phase('Ambient Life')
const rTraffic = await run('traffic', 'Ambient Life', C4 + notes2)
return { rController, rCharacter, rVehicle, rAudio, rTraffic }
