# CLAUDE.md

## What this repo is
- `README.md` at the root is the owner's **GitHub profile README** — do not edit it unless asked.
- `narco-shadow-empire/` is the project: **NARCO: SHADOW EMPIRE — Operation Numbers**, a cinematic 3D browser
  game (three.js) that trains U.S. Army ASVAB **Arithmetic Reasoning (AR)** and **Mathematics Knowledge (MK)**.

## Start here (read in this order)
1. `narco-shadow-empire/docs/SESSION_HANDOFF.md` — current state, what works, what is broken, exact next action.
2. `narco-shadow-empire/docs/NEXT_TASKS.md` — prioritized unfinished work.
3. `narco-shadow-empire/docs/ARCHITECTURE.md` — module contracts (APIs, events, Question schema). Follow it.
4. `narco-shadow-empire/src/world/layout.js` — the spatial contract (anchors, stations, footprints).

Current user priority: **keep going until the first playable demo works** (arrive at night in the rain → radio
call → drive to the warehouse → AR problem "3 trucks × 18 cases − 14 = 40" → MK problem "3(x − 2) = 21, x = 9"
→ cinematic → points → dashboard → after-action report → next mission unlocked).

## Commands (run inside `narco-shadow-empire/`)
- `npm install` (dev-only dependency: esbuild) · `npm run dev` → http://localhost:8080
- `npm test` → `node --test "tests/unit/**/*.test.mjs"` (never pass a bare directory to `node --test`)
- `node tools/shot.cjs "<page>?quality=low" --out <png> [--eval "js"] [--scenario f.cjs]` → headless Chromium
  screenshot + console/page-error report (software WebGL, a few FPS; use small viewports)
- `npm run e2e` → scenarios in `tests/e2e/*.e2e.cjs` · `npm run build` → `dist/narco-shadow-empire.html`

## Non-negotiable rules
- three.js **r160**, vendored in `vendor/three` (`import * as THREE from 'three'`, addons from `three/addons/…`).
  Plain ES modules, plain JS + JSDoc, no framework, no TypeScript.
- **Zero network at runtime**; all art/audio procedural. Must bundle into ONE offline HTML: in `src/` no `fetch`
  of local files, no Workers, no `import.meta.url`, no dynamic `import()`.
- `src/math/**`, `src/learning/**` and the pure `src/core/*` files import neither `three` nor DOM (Node-testable).
- Every learner/player-facing string is bilingual: `L(en, es)` (`src/core/ltext.js`) or `ctx.i18n` tables.
- yaw = three.js `rotation.y` of a model facing −Z (0 north, +π/2 west, π south, −π/2 east) — `src/core/util.js`.
- Systems are factories `createXxx(ctx)` that call `ctx.register(name, system, {order, runWhenPaused})`.
  Missing systems are null objects — never let a module throw because another is absent.
- Learning integrity: a revealed answer never earns mastery credit; exam mode has no hints/calculator; never
  output AFQT or "official" scores; never label anything "4K" unless the drawing buffer is ≥ 3840×2160.
- Fiction only (city Puerto Ceniza, syndicate El Consorcio Sombra); nothing actionable about real crime.
- Do not put model names/identifiers in code, docs or commit messages beyond the session's required trailers.

## Context guard (automatic handoff)
- `.claude/settings.json` wires `.claude/hooks/context-guard.mjs` to SessionStart, UserPromptSubmit, PreToolUse,
  PostToolBatch, Stop, PreCompact and the status line. Thresholds, as a share of the context window (1M tokens for the
  current model): **65% prepare the handoff · 70% complete and verify it · 75% development tools are blocked**.
- When a `[context-guard]` message appears, follow it: finish the safe operation, update the handoff docs, commit, run
  `node .claude/hooks/context-guard.mjs verify-handoff`, report HANDOFF READY. A fresh session starts from
  `narco-shadow-empire/docs/RESUME_PROMPT.md`.
- `node .claude/hooks/context-guard.mjs status` shows the reading · tests: `node --test .claude/hooks/context-guard.test.mjs`
  · the user can lift the guard with `touch .claude/state/guard-off`. The guard never commits, pushes or deletes.

## Working style that fits this project
- **Token budget is the binding constraint.** A 21-agent parallel fan-out at maximum reasoning effort exhausted
  the 5-hour usage limit before writing any code. Write code directly in large, complete files; test with Node
  and `tools/shot.cjs`. If you use Workflow/sub-agents, keep them to 2–3 and set `effort: 'medium'` or lower.
- Verify before claiming: unit tests for logic, screenshots you actually look at for visuals, and an E2E scenario
  for gameplay. Report failures plainly.
- Commit on branch `claude/narco-shadow-empire-asvab-erthmj` and push; never open a PR unless asked.
- Update `docs/SESSION_HANDOFF.md` and `docs/NEXT_TASKS.md` whenever a system lands or before context resets.
