# NEXT TASKS — prioritized

Legend: **P0** = required for the first playable demo (the user's current priority) · **P1** = required for the
full vertical slice in the master prompt · **P2** = polish / expansion.
State of each item is "not started" unless noted. Contracts: `docs/ARCHITECTURE.md`; detailed per-module
requirements: `docs/briefs/*.workflow.js`; current state: `docs/SESSION_HANDOFF.md`.

Working method: one author, large complete files, test each layer before the next (Node tests for logic,
`tools/shot.cjs` screenshots you look at for visuals, an E2E scenario for the mission). Keep files compact —
the demo target is roughly 7k lines in total.

## P0 — first playable demo (in this order)

1. **Math engine: make it run** — **DONE (session 2).** `registry.js`, `tests/unit/math.test.mjs`, `src/math/README.md`;
   fixed problems give 40 and x = 9 with the exact prompt text; every template × level × 300 seeds validates on the
   raw path with no retries.
2. **Learner model** — **DONE (session 2).** `profile.js`, `tutor.js`, `session.js`, `index.js`
   (`createLearning(ctx, {now})`), `tests/unit/learning.test.mjs`; plus `src/game/selftest.js` and two browser
   scenarios in `tests/e2e/`. Still open and deferred to P1: `exam.js`, `explain.js`.
3. **Rendering core** — **DONE (session 3).** `src/world/{renderer,post,resolution,environment,skymodel,weather}.js`,
   harness `dev/render.html` + `dev/render.shots.cjs`, `tests/unit/render.test.mjs` (13), `tests/e2e/render.e2e.cjs` (18
   checks), self-test extended to 11. Wired into `src/main.js`. Open items moved to P1: rain blocked by roofs, a frame-rate
   pass on a real GPU, a look at the dust / spray emitters and at AO.
4. **Materials** — **DONE (session 3).** `src/world/{texgen,textures,materials}.js` → `ctx.mats`, harness
   `dev/materials.html`, `tests/unit/texgen.test.mjs` (5), `tests/e2e/materials.e2e.cjs` (6 checks). Add further materials
   (tile floor, carpet, cardboard, water, car paint) when a builder needs them.
5. **Actors core** *(in progress — `src/world/collision.js` is DONE with 8 unit tests; continue with input, zones,
   player, camera, interact, character and the harness)*: `src/core/input.js` (keyboard + mouse with pointer-lock and drag-look fallback, `setVirtual`
   for tests), `src/world/collision.js` (AABB spatial hash, capsule move with step-up, raycast, oriented-box
   resolve for the car), `player.js`, `camera.js` (follow with wall collision, vehicle chase, cinematic pose,
   focus), `interact.js`, `zones.js`, `character.js` (replace the stub with a procedural humanoid + walk/run/idle).
   Harness with an automated self-check driven by `ctx.loop.fastForward`.
6. **World for the demo**: `src/world/world.js`, `city.js` (four roads, sidewalks, central block as facade
   buildings with neon signs and street lamps, boundary), `pier.js` (lite: promenade, parking apron, deck, kiosk,
   ferry silhouette — the arrival point), `warehouse.js` (yard + gate, three box trucks with countable cases and
   placards, removal slip board, building shell with dock doors, racks, manifest podium, evidence cage with a
   door feature, terminal, records office). Must match `layout.js`; register colliders, stations, the
   `roadblock.marea` and `warehouse.cageOpen` features. Hotel and garage may be plain facade boxes for now.
7. **Vehicle**: `src/world/vehicle.js` (+ procedural sedan): bicycle-model driving with 1/120 s sub-steps, box
   collision, enter/exit (F), headlights, fuel/trip telemetry, `ctx.debug.autodrive(points)` for tests; verify it
   completes `ROUTE_CH1`.
8. **UI base**: `src/ui/ui.js` (layers, modal helper, fade, letterbox, title card, toast, loading), `hud.js`
   (objective, interaction prompt, waypoint marker, session phase bar, vehicle dashboard, points), `document.js`
   (evidence viewer), `src/game/dialog.js` + subtitle box (radio lines from Faro), CSS in `src/styles/hud.css`.
9. **Puzzle panel + tutor UI**: `src/ui/puzzle.js` — numeric entry with keypad, 4-choice mode, the manifest table
   for the trucks problem, the step-by-step balance interaction for 3(x − 2) = 21 (uses `src/math/linear.js`),
   hint cards, five-step solution stepper, related-problem follow-up, the seven tutor requests, outcome badge.
   `data-testid` hooks for E2E. CSS in `src/styles/puzzle.css`.
10. **After-action report + dashboard (basic)**: `src/ui/debrief.js`, `src/ui/dashboard.js` (totals, independent
    %, per-topic accuracy and level, streak, due topics, simple skill map), plus a minimal main menu and pause
    (`src/ui/menu.js`).
11. **Mission system + Chapter 1**: `src/game/missions.js` (step types cinematic / dialog / goto / drive /
    interact / collect / puzzle / debrief; objectives, markers, checkpoints), `src/game/missions/ch1_arrival.js`,
    `src/game/cinematics.js`, `src/game/save.js`. Flow: pier spawn → radio call → walk to the car → drive the long
    way round (roadblock on Paseo de la Marea) → park in the yard → read three truck placards + the removal slip →
    manifest podium (AR, 40) → cage keypad (MK, x = 9) → cage opens → evidence terminal (short AR + MK chain) →
    outro cinematic → debrief → Chapter 2 unlocked.
12. **Audio (basic)**: `src/core/audio.js` — synthesized rain, engine, footsteps, UI correct/wrong/unlock.
13. **Integration + proof**: `src/main.js` wiring; `tests/e2e/ch1.e2e.cjs` that plays Chapter 1 end to end through
    the real UI (typing answers), asserting 40 / x = 9, hint ladder on wrong answers, XP and dashboard updates and
    the unlock; `npm run build`; load `dist/narco-shadow-empire.html` via `file://` with zero console errors and
    zero external requests; look at screenshots of the arrival, the drive, the dock, the cage and the debrief;
    commit and push; update the handoff docs.

## P1 — full vertical slice (after the demo works)

- Remaining 16 topic packs (every topic × levels 1–5, ≥ 2 templates per level) + sweep tests.
- Exam mode: `src/learning/exam.js` + `src/ui/exam.js` (timed AR/MK sections, multiple choice, no hints or
  calculator, solutions after submission, practice band only).
- Field drills (untimed adaptive practice, review-due and mixed modes): `src/ui/drills.js`.
- Chapters 2 (percent, fractions, ratios in the warehouse) and 3 (distance/time, units, algebra in the garage) —
  needs `garage.js`; spaced-repetition callback questions inside missions.
- Operations room (`hotel.js`: lobby, ops room, rooftop) and its stations.
- Dashboard completeness: repeated mistakes, recommendation, exam history, full skill map.
- Phone + district map, settings screens (graphics incl. resolution modes, audio, controls, accessibility,
  learning, data export/import), touch controls.
- Visual lab manipulatives (fraction, percent, balance, geometry, route, bars, number line).
- Extend `window.__game.selfTest()` (`src/game/selftest.js`, learning core only today) to the whole acceptance list;
  README for the game folder.
- Day/night transitions per mission (the clock and transitions exist: `env.setTime`, `env.setClockRate`), light pool
  for many lamps (`ctx.lights`, feeding `ctx.weather.setLights`).
- Rendering follow-ups: keep rain out of covered spaces seen from outside (a top-down depth map or per-zone volumes);
  measure the presets on a real GPU against the budget in ARCHITECTURE §12 and tune `QUALITY_PRESETS`; look at AO on
  real scenery; a graphics settings screen that shows `gfx.getInfo()` and labels "4K" only when `is4K`.

## P2 — polish and expansion

- Chapters 4 and 5, NPC presets and idle behaviours, ambient traffic and pedestrians, generative music, speech
  synthesis for dialogue, cold-recall quiz + explain-it step in the debrief, "check the rookie's work" puzzles,
  performance pass against the budget in ARCHITECTURE §12, gamepad support.

## Unresolved decisions (ask the user; do not guess)

1. Publish the finished single-file build as a private Artifact link, or keep it as a repo file only?
2. Add a link to the game in the profile `README.md` at the repo root?
3. Confirm the CAT-style exam timing preset once the official figures can be checked.
4. Start a fresh cloud session automatically at the 75 % hard stop? The session tools can do it, but it is
   deliberately not automated: every new session spends usage and an unattended relay could repeat. Needs an explicit yes.
