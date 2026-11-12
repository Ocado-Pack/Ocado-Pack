# SESSION HANDOFF — NARCO: SHADOW EMPIRE (Operation Numbers)

Snapshot: 2026-11-12, end of session 2 (context guard added) · branch `claude/narco-shadow-empire-asvab-erthmj` · project root `narco-shadow-empire/`
(all paths below are relative to it). Read with `docs/NEXT_TASKS.md` and `docs/ARCHITECTURE.md`.

> **Honest one-line status:** the learning core is built and verified (question engine for 4 of 20 topics, learner
> profile, tutor hint ladder, session report — 28 unit tests, 2 browser scenarios, both demo problems give 40 and
> x = 9); **no 3D, gameplay or UI code exists yet**. The game is not playable: the page only boots the learning core.

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
| Single-file bundler | **Done, verified** with the learning core (120 KB, loads from `file://`, zero requests) | `tools/build.mjs`, `dist/narco-shadow-empire.html` (learning core only) |
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
| Live self-test (learning core only, sandboxed) | **Done, verified** in Node and in the browser — 8/8 | `src/game/selftest.js` → `window.__game.selfTest()` |
| Browser proof of the learning core | **Done, verified** — dev page and single-file build from `file://`: self-test, both demo problems through `ctx.tutor`, progress survives a reload, 0 console errors, 0 external requests | `tests/e2e/{_learning,learning.e2e,learning-dist.e2e}.cjs` |
| Character model | **Stub only** (capsule with the final interface) | `src/world/character.js` |
| Renderer / post / 4K resolution modes, sky, day-night, fog, rain, materials, lights | **Not implemented** | planned `src/world/{renderer,post,environment,weather,textures,materials,lights}.js` |
| City block, warehouse, pier, garage, hotel/ops room | **Not implemented** | planned `src/world/{world,city,warehouse,pier,garage,hotel}.js` |
| Input, collision, player, camera, interact, zones, touch | **Not implemented** | planned `src/core/input.js`, `src/world/{collision,player,camera,interact,zones}.js`, `src/ui/touch.js` |
| Vehicle + dashboard telemetry | **Not implemented** | planned `src/world/{vehicle,carmodel}.js` |
| NPCs, traffic, pedestrians | **Not implemented** | — |
| UI: HUD, dialog/subtitles, documents, menus, pause, settings, phone, map | **Not implemented** | planned `src/ui/*`, `src/game/dialog.js` |
| Puzzle panel + tutor UI, debrief, dashboard, drills, exam UI, visual lab | **Not implemented** | planned `src/ui/*` |
| Missions, campaign, cinematics, save/load, app controller | **Not implemented** | planned `src/game/*` |
| Audio | **Not implemented** | planned `src/core/audio.js` |
| Context guard: thresholds 65 / 70 / 75 % of the context window, handoff verification, resume prompt | **Done, verified** — 7 simulation tests; on the real harness (separate headless process) SessionStart, UserPromptSubmit, PreToolUse deny, PostToolBatch and Stop all fired. Not verified live: the status line (no terminal UI in cloud sessions), PreCompact, and the one-time loop stop at 75 % | `.claude/settings.json`, `.claude/hooks/context-guard.{mjs,config.json,test.mjs}`, `docs/RESUME_PROMPT.md` |
| Boot wiring | **Partial** — learning core only (ctx, math, profile, session, tutor, selfTest); no renderer, world, UI or missions | `src/main.js` |

---

## 4. Current unfinished work (resume exactly here)

**Nothing is half-done.** P0 tasks 1 (math engine) and 2 (learner model) are complete, committed and pushed.

- **Last successful results:** `npm test` → 28 tests, 28 pass (7 core/layout, 9 math, 12 learning);
  `node --test .claude/hooks/context-guard.test.mjs` → 7/7 pass; `npm run e2e` → 2/2 scenarios pass; `npm run build` → `dist/narco-shadow-empire.html` (120 KB).
- **Current errors:** none known.
- **How the tests were checked:** 14 deliberate one-line breaks (credit rule, reveal gate, SRS delay, leak check,
  independent check, displayed equation …) were applied one at a time; the suite failed for all 14 after one gap
  was closed (the recall quiz repeating a seen question now has its own test).

**Exact next action — P0 task 3, rendering core** (`docs/NEXT_TASKS.md`; spec in `docs/briefs/narco-world.workflow.js`):
1. `src/world/renderer.js` → `ctx.gfx` (ARCHITECTURE §5): WebGLRenderer on `<canvas id="game">`, ACES tone mapping, sRGB
   output, shadows, pixel-ratio / render-scale / fixed-4K modes driven by `ctx.settings` quality presets, an honest
   `getInfo()` (real drawing-buffer size), `render(dt)` called by the loop. Bloom/grade (`post.js`) can follow.
2. `src/world/environment.js` (sky dome, moon, hemisphere + directional light, fog, time of day, wetness) and
   `src/world/weather.js` (camera-following rain).
3. Harness `dev/render.html` (copy `dev/_template.html`); look at night-rain and day screenshots with
   `node tools/shot.cjs "dev/render.html?quality=low" --w 640 --h 360 --out <png>`.
4. Register the renderer in `src/main.js`, extend `src/game/selftest.js` with a renderer check, then continue with
   P0 tasks 4–13 in order.

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

**Tests still to write as the code appears:** everything visual and gameplay (screenshots + E2E per NEXT_TASKS).

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
- Git: commit on `claude/narco-shadow-empire-asvab-erthmj`, push with `git push -u origin <branch>`; no PR unless
  the user asks.
