# SESSION HANDOFF — NARCO: SHADOW EMPIRE (Operation Numbers)

Snapshot: 2026-11-12, end of session 3 (rendering core) · branch `claude/narco-shadow-empire-asvab-erthmj` · project root `narco-shadow-empire/`
(all paths below are relative to it). Read with `docs/NEXT_TASKS.md` and `docs/ARCHITECTURE.md`.

> **Honest one-line status:** the learning core (question engine for 4 of 20 topics, learner profile, tutor hint ladder,
> session report) and the **rendering core** (renderer with honest 4K modes, post chain, sky / time of day / fog, rain
> and particles) are built and verified — 41 unit tests, 3 browser scenarios, self-test 11/11. **There is still no world,
> no character control, no vehicle, no UI and no mission.** The game is not playable: the page boots both cores and
> shows a status line; the 3D can only be seen in the harness `dev/render.html` on a test set of boxes.

---

## 1. What the user asked for (digest of the master prompt — preserve it)

A playable, original, cinematic 3D game that trains the ASVAB **AR** and **MK** subtests through gameplay.
Player = undercover intelligence operative investigating a fictional criminal organisation in a fictional
Latin-American-inspired city. Must feel like an adventure game, not a quiz. Fiction only; no real-crime how-to.

1. **Visuals**: 3840×2160 when display/hardware allow, 60 FPS target, scalable settings, PBR materials, cinematic
   lighting/shadows/reflections, day/night, rain, wet roads, dust, smoke, fog, headlights, streetlights, crisp
   learning text, smooth third-person camera with collision. Never label low-res assets "4K".
2. **Gameplay**: walk/run/jump/crouch, inspect, pick up, interact, enter/leave vehicles, talk to NPCs, in-game
   phone + map; vehicle with steering/accel/brake/camera and a dashboard (fuel, distance, speed); read documents,
   examine evidence, operate terminals, access puzzles. Every important interaction gives visible feedback; no
   fake buttons.
3. **Math engine** — AR (10): word problems; + − × ÷; fractions & decimals; percent & discounts; ratios &
   proportions; distance-rate-time; averages; work-rate; unit conversions; multi-step. MK (10): order of
   operations; linear equations; algebraic expressions; exponents & roots; inequalities; geometry;
   perimeter-area-volume; angles & triangles; factoring & polynomials; properties & formulas.
4. **Math controls gameplay**: correct answers advance the mission; wrong answers trigger hints/teaching, never
   immediate failure.
5. **15-minute session**: 0–2 story · 2–5 AR · 5–8 MK · 8–12 combined · 12–15 debrief (mistakes, solutions,
   strengths/weaknesses, review questions). Also longer sessions and a dedicated exam-practice mode.
6. **Campaign**: Ch1 The Arrival · Ch2 The Warehouse · Ch3 The Garage · Ch4 The Network · Ch5 Final Operation;
   easy to extend.
7. **Tutor**: mistake 1 concept hint → 2 formula/operation → 3 first step → 4 full solution, then a related
   problem. On request: explain like a beginner, show formula, why is my answer wrong, similar example, try again,
   visual explanation, Spanish/English. Never full mastery credit for a revealed answer.
8. **Adaptive difficulty**, 5 levels: Recruit, Specialist, Operator, Advanced Operator, ASVAB Readiness; track
   first-attempt accuracy + response time per topic; spaced repetition.
9. **Dashboard**: AR/MK totals, independent %, accuracy by topic, avg response time, repeated mistakes, current
   difficulty, daily streak, topics due, recommended next mission, a skill map that fills; persists (localStorage).
10. **Exam simulation**: separate mode, timed, no story, no calculator, no hints, multiple choice, solutions after
    submitting, custom length + review; never invent official ASVAB/Army scores.
11. **Visual learning**: math as manipulable 3D objects (fraction containers, percent inventory, equation balance
    scale, measurable geometry, vehicle on a route).
12. **Offline question engine**: procedural templates, exact answers, plausible distractors, duplicate avoidance,
    deterministic hints, per-topic mastery, validation (one correct answer, sufficient info). No AI call per answer.
13. **Polish**: chapter intro cinematic, transitions, subtitles, EN/ES explanations, ambient audio, objective
    indicators, checkpoints, pause/resume, save/load, text sizing, reduced motion, keyboard/mouse + touch.
14. **Priority = small polished vertical slice**: one city block, one warehouse, one operations room, one vehicle,
    one character, three complete AR/MK missions, one tutor, one persistent dashboard, one timed practice mode.
    If something cannot be supported, say so and ship a functional alternative — never a silent static mock-up.
15. **First playable demo (current target)**: arrive at night in the rain; dispatcher radio call about inventory
    discrepancies; drive to the warehouse; enter; investigate records; solve the AR problem *"Three trucks carry 18
    equipment cases each. Fourteen cases are removed. How many remain?"* → **40**; solve *3(x − 2) = 21* → **x = 9**
    to unlock an evidence terminal; then cinematic transition, learning points, dashboard update, after-action
    report, next mission unlocked. Both problems must be solved through interactive interfaces.
16. **Acceptance**: character moves/interacts; vehicle drivable; missions have start/objectives/completion; AR/MK
    answers evaluated correctly; hints work; dashboard updates; wrong answers teach; visuals scale to hardware;
    all three initial missions completable; progress persists.

Later user messages: **"keep going until the first playable demo works"** (current priority), then this handoff
request.

User's own study skills that were folded into the design (see ARCHITECTURE §10):
- *ASVAB AR tutor*: 5-step explanation format (Understand → Given → Choose operation/formula → Solve → Check),
  plain-English problems, A–D choices in exam format, memory tricks (DIRT, "of means multiply"), topic ladder
  Developing / Proficient / Advanced.
- *Helion learning method (L9)*: commit-before-reveal, cold recall quiz in the debrief, callbacks/spaced review at
  1-3-7 days with a "Due for review" card, explain-it step, "check the rookie's work", mixed/interleaved drills,
  chunk-and-save checkpoints, a live `window.__game.selfTest()` returning `{pass, passed, total, results}`,
  single offline HTML with zero network requests, localStorage in try/catch with memory fallback.

---

## 2. Architecture (decided — keep it)

- **Stack**: browser, three.js **r160** vendored (`vendor/three/three.module.js` + `vendor/three/addons/*`), plain
  ES modules, no build step in dev; `esbuild` (only dev dependency) bundles to one offline file.
- **Entry points**: `index.html` (dev; import map + stylesheet list + `<canvas id="game">` + `<div id="ui">`) →
  `src/main.js` (creates the context, registers `ctx.math`, `ctx.profile`, `ctx.session`, `ctx.tutor` and
  `ctx.selfTest`; everything else is still a null object). Build output: `dist/narco-shadow-empire.html`.
- **Context pattern**: `createContext()` (`src/core/context.js`) → `ctx` with events, settings, storage, i18n,
  flow, loop, rng, time; systems are factories `createXxx(ctx)` that `ctx.register(name, system, {order,
  runWhenPaused})`; unregistered systems are deep null objects. Simulation (`loop.step` / `loop.fastForward`) is
  separate from rendering so tests can run logic without drawing.
- **Contracts**: `docs/ARCHITECTURE.md` (ctx API, events table, settings, world/actor/learning/UI/game APIs, the
  Question schema §7.1, learning design §10, story bible §11). `src/world/layout.js` is the spatial contract:
  roads, 3×3 cells, hotel / garage / warehouse / pier footprints and door openings, `ANCHORS`, `STATIONS`,
  `FEATURES`, `ZONES`, `ROUTE_CH1`.
- **Detailed per-module requirement briefs**: `docs/briefs/*.workflow.js` — the prompts written for an abandoned
  parallel build (see §5). They are the most detailed written requirements for each module (renderer, materials,
  city, warehouse, garage/pier, hotel, input/collision/player/camera, character, vehicle, audio, traffic, UI base,
  menus/phone/map, puzzle + tutor UI, study screens, visual lab, math core, learner model). Use them as specs.
- **Folder structure**: `src/core` (context, events, rng, storage, settings, i18n, flow, loop, util, ltext,
  params; planned: input, audio) · `src/math` (engine) · `src/learning` (learner model) · `src/world`
  (rendering, world, actors) · `src/ui` · `src/game` (missions etc.) · `src/i18n` · `src/styles` · `dev/`
  (harness pages) · `tests/unit`, `tests/e2e` · `tools/` · `vendor/three` · `dist/`.
- **Story bible**: city Puerto Ceniza; syndicate El Consorcio Sombra and its bookkeeper "El Contador"; task force
  Unidad Meridiano; player codename Cifra; handler Inés Varela, callsign Faro; analyst Darío Ibarra; night clerk
  Tomás Quiroga; mechanic Lupe Rentería; receptionist Marisol.

---

## 3. Implementation status (never confuse planned with working)

| System | Status | Files |
|---|---|---|
| Dev server, screenshot/E2E harness | **Done, verified** (page loads, WebGL2 via SwiftShader ~5 FPS) | `tools/serve.mjs`, `tools/lib/harness.cjs`, `tools/shot.cjs`, `tools/e2e.cjs` |
| Single-file bundler | **Done, verified** with both cores (664 KB incl. three.js, loads from `file://`, zero requests, self-test 11/11 inside the bundle) | `tools/build.mjs`, `dist/narco-shadow-empire.html` |
| Core: context, events, rng, storage (memory fallback), settings + quality presets, i18n, flow, loop, util, ltext, params | **Done, verified** — 7/7 unit tests pass | `src/core/*.js`, `tests/unit/core.test.mjs` |
| District layout + anchors/stations | **Done, verified** by tests (anchors inside their rooms) | `src/world/layout.js` |
| Contracts document | **Done** | `docs/ARCHITECTURE.md` |
| UI design tokens | **Done** (tokens only, no components) | `src/styles/base.css`; other `src/styles/*.css` are empty placeholders |
| Math engine: kit (rationals, formatting, answer types, assembly, validation, parsing, checking), engine, registry, linear step model, topics | **Done, verified** — sweep of every template × level × 300 seeds on the raw no-retry path: 0 invalid | `src/math/{kit,engine,registry,linear,topics}.js`, `src/math/README.md`, `tests/unit/math.test.mjs` |
| Topic packs: ar.ops (5 templates, levels 1–5), ar.word (2, levels 1–4), mk.linear (4, levels 1–5), mk.order (2, levels 1–5) | **Done, verified** (EN + ES read through by hand once) | `src/math/templates/ar/{ops,word}.js`, `src/math/templates/mk/{linear,order}.js` |
| Other 16 topic packs | **Not implemented** (`math.generate({topic})` throws "no templates for …") | — |
| Learner model rules: credit / XP / mastery, adaptive levels, spaced repetition | **Done, verified** | `src/learning/{mastery,adaptive,srs}.js` |
| Learner model: persistent profile, tutor hint ladder + follow-up gate, session director + after-action report | **Done, verified** (injected clock, real engine, throwing storage) | `src/learning/{profile,tutor,session,index}.js`, `tests/unit/learning.test.mjs` |
| Learner model: exam logic, explain-it coach | **Not implemented** (P1; `ctx.exam` is a null object) | planned `src/learning/{exam,explain}.js` |
| Live self-test | **Done, verified** — 8 learning checks (sandboxed; also pass in Node) + 3 rendering checks when a renderer exists: 11/11 in the browser, dev page and single-file build | `src/game/selftest.js` → `window.__game.selfTest()` |
| Browser proof of the learning core | **Done, verified** — dev page and single-file build from `file://`: self-test, both demo problems through `ctx.tutor`, progress survives a reload, 0 console errors, 0 external requests | `tests/e2e/{_learning,learning.e2e,learning-dist.e2e}.cjs` |
| Character model | **Stub only** (capsule with the final interface) | `src/world/character.js` |
| Renderer `ctx.gfx`: resolution modes native / fixed 4K / dynamic with an honest `getInfo()`, post chain (HDR target, MSAA, bloom, optional GTAO, one grade + tone-map + output pass) and a direct path for the low preset, live settings, context-loss recovery, no-WebGL message | **Done, verified** in the browser: both paths, every preset, a real 3840×2160 drawing buffer on both paths, portrait window not labelled 4K, loss + restore, resize. **Not verified:** frame rate on a real GPU (only software WebGL here); AO was only checked to render without artefacts | `src/world/{renderer,post,resolution}.js` |
| Sky + time of day `ctx.env`: shader dome (gradient, clouds, sun, moon, stars, city glow), key light with texel-snapped shadows, hemisphere light, fog, exposure, bloom level, six weathers with transitions, wetness, lightning, reflection map | **Done, verified** — pure model unit-tested for every hour × weather; 20 screenshots looked at (night rain, storm flash, clear night sky, dawn fog, overcast and clear noon, morning shadows, dusk, sunset) | `src/world/{environment,skymodel}.js` |
| Weather `ctx.weather`: 9000-streak GPU rain, ground splashes, pooled steam / smoke / dust / spray emitters, all lit by nearby lamps | **Done, verified** (counts follow the preset, smooth under gusts, emitters start/stop). **Gaps:** rain is not blocked by roofs (it only fades out by `ctx.zones.indoor`, which does not exist yet); dust and spray emitters run but were not looked at | `src/world/weather.js` |
| Rendering harness + screenshot matrix | **Done** | `dev/render.html`, `dev/render.shots.cjs`, `tests/e2e/render.e2e.cjs` |
| Materials + procedural textures, light pool | **Not implemented** (the harness has a 20-line sketch of the wet-ground shader) | planned `src/world/{textures,materials,lights}.js` |
| City block, warehouse, pier, garage, hotel/ops room | **Not implemented** | planned `src/world/{world,city,warehouse,pier,garage,hotel}.js` |
| Input, collision, player, camera, interact, zones, touch | **Not implemented** | planned `src/core/input.js`, `src/world/{collision,player,camera,interact,zones}.js`, `src/ui/touch.js` |
| Vehicle + dashboard telemetry | **Not implemented** | planned `src/world/{vehicle,carmodel}.js` |
| NPCs, traffic, pedestrians | **Not implemented** | — |
| UI: HUD, dialog/subtitles, documents, menus, pause, settings, phone, map | **Not implemented** | planned `src/ui/*`, `src/game/dialog.js` |
| Puzzle panel + tutor UI, debrief, dashboard, drills, exam UI, visual lab | **Not implemented** | planned `src/ui/*` |
| Missions, campaign, cinematics, save/load, app controller | **Not implemented** | planned `src/game/*` |
| Audio | **Not implemented** | planned `src/core/audio.js` |
| Context guard: thresholds 65 / 70 / 75 % of the context window, handoff verification, resume prompt | **Done, verified** — 7 simulation tests; on the real harness (separate headless process) SessionStart, UserPromptSubmit, PreToolUse deny, PostToolBatch and Stop all fired. Not verified live: the status line (no terminal UI in cloud sessions), PreCompact, and the one-time loop stop at 75 % | `.claude/settings.json`, `.claude/hooks/context-guard.{mjs,config.json,test.mjs}`, `docs/RESUME_PROMPT.md` |
| Boot wiring | **Partial** — learning core + rendering core (ctx, math, profile, session, tutor, gfx, env, weather, selfTest). The loop is NOT started (nothing to show); `?norender=1` skips WebGL. No world, UI or missions | `src/main.js` |

---

## 4. Current unfinished work (resume exactly here)

**Nothing is half-done.** P0 tasks 1 (math engine), 2 (learner model) and 3 (rendering core) are complete, committed and
pushed.

- **Last successful results:** `npm test` → 41 tests, 41 pass (7 core/layout, 9 math, 12 learning, 13 rendering);
  `node --test .claude/hooks/context-guard.test.mjs` → 7/7; `npm run e2e` → 3/3 scenarios (learning on the dev page,
  learning in the single-file build from `file://`, rendering core with 17 checks); `npm run build` → 664 KB.
- **Current errors:** none known. The only console noise is Chromium's "GPU stall due to ReadPixels" warning, which
  comes from software WebGL screenshots, not from the game.
- **How the tests were checked:** ten deliberate one-line breaks in the rendering core (4K rule, fixed-4K sizing,
  back-off of the dynamic scaler, night ambient floor, sun-moon hand-over, fog colour, `is4K` taken from the mode name,
  rain drift, the `env:night` event, instant wetness). Eight failed the suite at once; two exposed gaps that were then
  closed (a scaler scenario that needs the back-off, and a portrait window in fixed-4K mode). All ten are caught now.

**Exact next action — P0 task 4, materials** (`docs/NEXT_TASKS.md`; spec `B1B` in `docs/briefs/narco-world.workflow.js`):
1. `src/world/textures.js`: seeded value-noise / fbm helpers on canvas `ImageData`, `makeMaps(kind, {size, seed})` →
   `{map, normalMap (Sobel from a height field), roughnessMap}`, cached, size from `settings.textureSize`. Lean first
   set: asphalt (+ puddle mask), sidewalk, concrete, brick, stucco, corrugated metal, crate wood, chain-link (alpha),
   one facade atlas with lit windows, `textTexture` for signs and labels.
2. `src/world/materials.js` → `ctx.mats` (`get`, `paint`, `neon` / `emissive`, `glass`, `sign` / `label`, `facade`).
   Wettable materials follow `ctx.env.wetness` (move the sketch in `dev/render.html` → `wettable()` into the library:
   darker albedo, lower roughness, puddles from the mask); night-only emissives follow `ctx.env.nightFactor`.
3. Harness `dev/materials.html` (swatches on the render core); look at dry-day and wet-night screenshots.
4. Then P0 tasks 5–13 in order. The first thing that needs `ctx.lights` is the city (task 6): decide there whether the
   lean demo gets the pooled light system or a fixed handful of real lights (`settings.maxLights`).

**Things the next layers can rely on (all tested):**
- `ctx.math.fixed.trucks()` / `.equation()`; `ctx.math.check(q, {text})` → `{correct, tag, why, parseError}`;
  a `parseError` must not be counted as an attempt (the tutor already handles this).
- `const t = ctx.tutor.begin(question, {mode})` → `t.submit({text|choice})`, `t.request(kind)`, `t.finish()`,
  `t.canAdvance` (the gate), `t.beginFollowUp()`; the puzzle panel only has to render what these return.
- `ctx.session.start({missionId})` … `ctx.session.end()` → the after-action report (`mistakes`, `reviewQuestions`,
  `byTopic`, `strengths`, `weaknesses`, `xp`); `ctx.profile.missionDone(id, report)` unlocks "due after next mission".
- `ctx.profile` getters for the dashboard: `section('AR'|'MK')`, `overall()`, `topic(id)`, `skillMap()`, `tier()`,
  `streak()`, `due()`, `mistakes()`, `recommend()`.
- `createLinear(question.visual.params)` for the balance puzzle of 3(x − 2) = 21 (both routes verified).
- Rendering (ARCHITECTURE §5 is up to date): add meshes to `ctx.gfx.scene`, move `ctx.gfx.camera`, start
  `ctx.loop`; `ctx.env.setTime(22.5, {instant: true})` + `ctx.env.setWeather('rain', {instant: true})` give the opening
  look; `ctx.gfx.getInfo()` for the FPS / resolution readout (show "4K" only when `is4K`); `ctx.gfx.project()` for HUD
  markers; `ctx.weather.addEmitter()` for steam and smoke; `ctx.weather.setLights()` so rain glows near lamps.
- Light levels that work with the exposure and bloom: street lamp ≈ 130 cd at 5.7 m, neon spill ≈ 20 cd, emissive
  intensity 5–7 for tubes and lamp heads. Three times that washed the frame out (seen in the first screenshots).
- A custom `ShaderMaterial` must end with `#include <tonemapping_fragment>` + `#include <colorspace_fragment>`, or it
  will look wrong on one of the two render paths.

**Tests still to write as the code appears:** everything about the world, actors, UI and missions (screenshots + E2E
per NEXT_TASKS).

---

## 5. Decisions, constraints, rejected approaches

- **Location**: the game lives in `narco-shadow-empire/`; the repo root `README.md` is the owner's GitHub profile
  page and was deliberately left untouched. Unresolved: whether the owner wants a link added to it.
- **three r160, not latest (r187)**: matches the owner's existing trainer standard and is the most familiar API.
- **No external assets**: procedural geometry, canvas textures and WebAudio synthesis only — keeps the build
  offline, licence-clean and small. Consequence to state honestly to the user: stylised-realistic, not
  photoreal; "4K" means the drawing buffer is native 3840×2160 when the display provides it (or with the
  "fixed 4K internal resolution" mode), never a marketing label.
- **Single offline HTML** as the shipping format (double-click from `file://`); also suitable for publishing as a
  private Artifact page so the user can play from a link. Unresolved: publish only after the demo works.
- **Headless verification**: Playwright + Chromium are preinstalled (`require('playwright')` works in `.cjs`
  files only; ESM `import 'playwright'` does not resolve). Software WebGL is slow → use `quality=low`, small
  viewports and `ctx.loop.fastForward()`; gameplay tests must not depend on real-time frame rate.
- **Bundler gotcha (fixed)**: `String.replace` with a string replacement interprets `$&`/`$'` inside the bundle;
  `tools/build.mjs` uses function replacers and escapes `</script` and `<!--`.
- **Exam timing presets** (unverified — `officialasvab.com` is outside this session's allowed network): paper-style
  AR 30 questions / 36 min and MK 25 / 24 min (consistent across secondary sources); CAT-style 15 questions each,
  AR 55 min and MK 31 min (one secondary source; another older source says 16 q / 39 min and 16 q / 20 min).
  Label presets "approximate", keep them customizable, never present an official score.
- **REJECTED — large parallel agent fan-out.** Four workflows (21 sub-agents, inherited maximum reasoning effort)
  were launched to build everything in parallel. They consumed the 5-hour usage limit in ~20 minutes while still
  planning; all failed with "You've hit your 5-hour limit"; the only output was the three files in
  `src/learning/`. Lesson (also in `CLAUDE.md`): write code directly in large complete files; if sub-agents are
  used, 2–3 at most with `effort: 'medium'` or lower and tight scopes.
- **Scope decision after the limit hit**: build the first playable demo single-author and lean (≈ 7k lines), on
  the real architecture, then widen to the full vertical slice. The lean demo scope is in `docs/NEXT_TASKS.md`.
- **Learning rules already encoded** (`src/learning/mastery.js`, `adaptive.js`, `srs.js`): outcomes independent /
  assisted / revealed; XP 100 × (1 + 0.25·(level−1)) independent, 50/50/30/15 assisted by hint level, 0 revealed,
  60 exam, 40 debrief quiz; mastery = recency-weighted independent rate over the last 12 results capped by level;
  promote after 3 consecutive independent, demote after 2 struggles; SRS: a miss is due after the next mission or
  +1 day, successes space out 1 → 3 → 7 → 14 → 30 days.
- **Question design rule**: wrong choices come from named misconceptions (`tag` + bilingual `why`) so the tutor
  can explain *why* an answer is wrong; every template has an independent `check()`.
- **Decisions of session 2 (math + learner model)**
  - Every named mistake is stored on the question (`misconceptions`), not only the three shown as choices: the demo
    is typed-entry, so typing 7 (3 + 18 − 14) or 23/3 (3x − 2 = 21) must still be explained.
  - Template parameters are chosen so that the answer and every listed mistake are sensible values (e.g. fewer than
    one truckload is removed). A mistake whose explanation would be untrue for the numbers is left out (`null`).
    Generic `near` fillers remain only as a last resort; the sweep fails above 5 % per template/level.
  - A whole-number answer is shown only next to whole-number choices (fraction mistakes are diagnose-only).
  - The validator's leak rule is lexical, so `beginner`, hint 1 and hint 2 must not contain stray numerals
    ("Route 1 / Route 2" was a real failure).
  - `build()` throws on parameters it cannot present (it used to rewrite them silently).
  - An explicit seed makes `generate` reproducible; `{templateId, level, seed}` is all a save file needs.
  - `profile.record()` enforces the credit rule itself, so no caller can store credit that was not earned.
  - Follow-up gate after a reveal: a related problem solved **without a reveal** opens it (an assisted solve
    counts); after two revealed follow-ups it opens flagged `needsReview`. Stricter ("independent only") was
    rejected as a possible dead end for a struggling learner.
  - Profile saves are synchronous on every record (no debounce): simpler, and nothing is lost on tab close.
  - `recommend()` order differs slightly from the brief (exam before single due topic / drill) because the brief's
    order made the exam recommendation unreachable.
  - The self-test runs in a sandbox with its own in-memory storage, so it can never alter the saved profile.
- **Decisions of session 3 (rendering core)**
  - The drawing-buffer size is set explicitly (renderer pixel ratio stays 1), so the reported numbers are exact and
    `fixed4k` cannot miss 3840×2160 by a rounding pixel. `is4K` is read from `gl.drawingBufferWidth/Height`.
  - `fixed4k` targets "long side ≥ 3840 and short side ≥ 2160" so ultrawide and portrait windows get a 4K-class buffer,
    but the label keeps the strict rule (width ≥ 3840 and height ≥ 2160): a portrait buffer is never called 4K.
  - One final pass replaces three's OutputPass (tone map + grade + vignette + sRGB + grain + dither): one full-screen
    pass less at 4K. Only the scene target carries depth and MSAA; the composer's second target gets GPU storage only
    while AO is on. The canvas itself is created without antialiasing, so the `low` preset has none by definition.
  - Bloom threshold and strength follow the light level (1.8 by day, 1.0 at night) because exposure alone does not span
    day and night; otherwise sunlit walls bloom.
  - The night key light is a stylised slow moon (west-south-west and 48° up at 22:30, never below 13°), so every night
    hour has a usable key and the arrival shot from the pier is back-lit. Sun and moon hand over at zero intensity.
  - Fog colour = sky horizon colour (seamless distance); the city glow is added above the horizon so far roofs read as
    silhouettes. Fog is never thinner than 1.2 / `drawDistance`, which gives that setting a visible meaning already.
  - Rain is animated in the vertex shader from two wrapped clocks kept on the CPU (fall time, accumulated wind drift):
    the first version used `wind × time`, which would have teleported every streak on each gust.
  - Stars keep about one pixel of radius at any resolution (an energy-conserving version made them invisible below 4K).
  - REJECTED: tying the 4K label to the resolution mode; an antialiased canvas (doubles memory at 4K next to the MSAA
    target); a second MSAA composer target; `drawDistance` as the camera far plane (pops in clear weather).

---

## 6. Environment notes for the next session

- Node 22, npm 10, 4 CPUs, Chromium at `/opt/pw-browsers`. `npm install` in `narco-shadow-empire/` restores
  esbuild (node_modules is git-ignored).
- The session scratchpad and `~/.claude` workflow files are **not** persistent — everything needed is in the repo.
- Context guard: Claude Code 2.1.322 cloud session (entry point `remote_mobile`); the model's context window is
  1,000,000 tokens (650K / 700K / 750K thresholds). Hook input carries no context data and cloud sessions have no
  status line, so the guard reads the newest API usage from the session transcript (same formula as
  `context_window.used_percentage`). Hooks are loaded when a session process starts — settings edited mid-session
  are not picked up. When session 2 ended the context stood at about 66 % (prepare stage).
- `node --test tests/unit/` (a directory) fails with MODULE_NOT_FOUND on Node 22 — use `npm test` or name the files.
- Rendering in this container is software WebGL (SwiftShader): ~5 FPS at 960×540, ~25 s for one 3840×2160 frame, so a
  4K screenshot times out — check 4K through `getInfo()` / `gfx.sample()` instead. Shader compiles take 1–2 s.
- Context cost seen in session 3: reading the handoff, contract, brief and core files took the reading from 9 % to
  about 25 %; the whole rendering core with ~25 screenshots ended near 50 %. Small viewports and filtered tool output
  (pipe reports through a one-line summary) keep it down.
- Git: commit on `claude/narco-shadow-empire-asvab-erthmj`, push with `git push -u origin <branch>`; no PR unless
  the user asks.
