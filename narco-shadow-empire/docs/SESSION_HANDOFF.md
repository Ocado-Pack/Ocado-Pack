# SESSION HANDOFF — NARCO: SHADOW EMPIRE (Operation Numbers)

Snapshot: 2026-11-12 ~07:55 UTC · branch `claude/narco-shadow-empire-asvab-erthmj` · project root `narco-shadow-empire/`
(all paths below are relative to it). Read with `docs/NEXT_TASKS.md` and `docs/ARCHITECTURE.md`.

> **Honest one-line status:** the foundation (tooling, core, layout, contracts) is built and verified; the math
> engine is written but **has never been run and currently fails to import**; **no 3D, gameplay or UI code exists
> yet**. The game is not playable.

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
  `src/main.js` (currently a placeholder that only creates the context). Build output:
  `dist/narco-shadow-empire.html`.
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
| Single-file bundler | **Done, verified** on the placeholder (loads from `file://`, zero requests) | `tools/build.mjs`, `dist/narco-shadow-empire.html` (placeholder build) |
| Core: context, events, rng, storage (memory fallback), settings + quality presets, i18n, flow, loop, util, ltext, params | **Done, verified** — 7/7 unit tests pass | `src/core/*.js`, `tests/unit/core.test.mjs` |
| District layout + anchors/stations | **Done, verified** by tests (anchors inside their rooms) | `src/world/layout.js` |
| Contracts document | **Done** | `docs/ARCHITECTURE.md` |
| UI design tokens | **Done** (tokens only, no components) | `src/styles/base.css`; other `src/styles/*.css` are empty placeholders |
| Learner model: credit/XP/mastery, adaptive levels, spaced repetition | **Partial** — written by a sub-agent, reads correctly, **untested** | `src/learning/mastery.js`, `adaptive.js`, `srs.js` |
| Learner model: profile, tutor ladder, session, exam logic, recommend, explain-it | **Not implemented** | planned: `src/learning/{index,profile,tutor,session,exam,recommend,explain}.js` |
| Math engine: kit (rationals, formatting, answers, assembly, validation, parsing), engine, linear step-model, topics | **Written, NEVER RUN** | `src/math/kit.js`, `engine.js`, `linear.js`, `topics.js` |
| Topic packs: ar.ops (5 templates), ar.word (2), mk.linear (4), mk.order (2) | **Written, NEVER RUN** | `src/math/templates/ar/{ops,word}.js`, `src/math/templates/mk/{linear,order}.js` |
| Math registry + tests + README | **Missing → engine import is BROKEN** | `src/math/registry.js`, `tests/unit/math.test.mjs`, `src/math/README.md` |
| Other 16 topic packs | **Not implemented** | — |
| Character model | **Stub only** (capsule with the final interface) | `src/world/character.js` |
| Renderer / post / 4K resolution modes, sky, day-night, fog, rain, materials, lights | **Not implemented** | planned `src/world/{renderer,post,environment,weather,textures,materials,lights}.js` |
| City block, warehouse, pier, garage, hotel/ops room | **Not implemented** | planned `src/world/{world,city,warehouse,pier,garage,hotel}.js` |
| Input, collision, player, camera, interact, zones, touch | **Not implemented** | planned `src/core/input.js`, `src/world/{collision,player,camera,interact,zones}.js`, `src/ui/touch.js` |
| Vehicle + dashboard telemetry | **Not implemented** | planned `src/world/{vehicle,carmodel}.js` |
| NPCs, traffic, pedestrians | **Not implemented** | — |
| UI: HUD, dialog/subtitles, documents, menus, pause, settings, phone, map | **Not implemented** | planned `src/ui/*`, `src/game/dialog.js` |
| Puzzle panel + tutor UI, debrief, dashboard, drills, exam UI, visual lab | **Not implemented** | planned `src/ui/*` |
| Missions, campaign, cinematics, save/load, app controller, selfTest | **Not implemented** | planned `src/game/*` |
| Audio | **Not implemented** | planned `src/core/audio.js` |
| Boot wiring | **Placeholder** (creates ctx, sets `window.__ready`) | `src/main.js` |

---

## 4. Current unfinished work (resume exactly here)

**Task in progress:** finishing the math engine for the first playable demo.

- Files just written and not yet executed: `src/math/kit.js`, `engine.js`, `linear.js`, `topics.js`,
  `templates/ar/ops.js`, `templates/ar/word.js`, `templates/mk/linear.js`, `templates/mk/order.js`.
- **Current error:** `node -e "import('./src/math/engine.js')"` → `ERR_MODULE_NOT_FOUND … src/math/registry.js`.
- **Last successful result:** `npm test` → 7 tests, 7 pass (core + layout only; nothing imports the math yet).

**Exact next action**
1. Create `src/math/registry.js` — side-effect imports of the four existing packs:
   `import './templates/ar/ops.js'; import './templates/ar/word.js'; import './templates/mk/linear.js';
   import './templates/mk/order.js';` (each pack calls `defineTemplate`, which fills the kit's template map).
2. Write `tests/unit/math.test.mjs` and run it: exact text + answers of `math.fixed.trucks()` (40) and
   `math.fixed.equation()` (x = 9); a sweep of every template × supported level × ~300 seeds through
   `math.validate`; `parseAnswer` table; `checkAnswer` (accepts `40`, `40 cases`, `x = 9`; wrong value returns the
   matching misconception `why`); determinism per seed; `similar` / `easier`; `createLinear` both routes for
   3(x − 2) = 21 (`div 3, add 2` and `expand, add 6, div 3`), illegal moves, undo.
3. Fix what the sweep finds. **Known suspects in the unrun code:**
   - `mk.linear.twostep` builds `rookie.lines` with `.slice(0, p.b > 0 ? 4 : 0)` → an empty `lines` array when
     `b ≤ 0`, which `validateQuestion` rejects ("bad rookie block"). Set `rookie` to `undefined` when `b ≤ 0`, and
     replace the placeholder last line `x = …` with the real (wrong) value.
   - `mk.linear.distribute` rookie's last line is also the placeholder `x = …`.
   - Wrong-answer lists are filtered to integers/half/quarter values; the kit tops up to 3 with near-miss fillers —
     confirm every template always yields 4 distinct choices.
   - The leak check in `validateQuestion` (answer token must not appear in `beginner`, `hints[0]`, `hints[1]`
     unless it is in the prompt/expr) may reject some parameter sets; `generate` retries up to 60 times — confirm
     no template exhausts its retries.
   - `ans.frac`/`ans.money` formatting paths and `kit.t()` placeholder substitution are untested.
4. Then continue down `docs/NEXT_TASKS.md` (learner model → 3D core → UI → mission → integration).

**Tests still to run:** everything under math and learning; no visual or gameplay test exists yet.

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

---

## 6. Environment notes for the next session

- Node 22, npm 10, 4 CPUs, Chromium at `/opt/pw-browsers`. `npm install` in `narco-shadow-empire/` restores
  esbuild (node_modules is git-ignored).
- The session scratchpad and `~/.claude` workflow files are **not** persistent — everything needed is in the repo.
- Git: commit on `claude/narco-shadow-empire-asvab-erthmj`, push with `git push -u origin <branch>`; no PR unless
  the user asks.
