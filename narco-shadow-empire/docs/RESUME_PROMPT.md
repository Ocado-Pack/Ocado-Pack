# RESUME PROMPT — send this as the first message of a fresh session

Resume NARCO: SHADOW EMPIRE from its saved handoff. Do not rebuild completed systems.

1. **Restore instructions.** Read, in order: `CLAUDE.md` → `narco-shadow-empire/docs/SESSION_HANDOFF.md` →
   `narco-shadow-empire/docs/NEXT_TASKS.md`. Open `narco-shadow-empire/docs/ARCHITECTURE.md` for any contract you touch.
2. **Inspect the repository before changing anything.** `git status --short` and `git log --oneline -5`; then inside
   `narco-shadow-empire/`: `npm install` (only if `node_modules` is missing) and `npm test`. If the working tree is not
   clean or a test fails, report that first and repair it before any new work.
3. **Find the last incomplete task.** It is the one under "Exact next action" in `SESSION_HANDOFF.md` §4; cross-check
   with the first item not marked DONE in `NEXT_TASKS.md`. Continue exactly there.
4. **Working rules.** One primary agent, no parallel fan-out (2–3 helpers at most, medium effort). One milestone at a
   time. Test before claiming. After each milestone update `SESSION_HANDOFF.md` and `NEXT_TASKS.md`, commit on the
   branch named in the handoff, and push only as `CLAUDE.md` authorizes. Never open a pull request unless asked.
5. **Context guard.** Hooks in `.claude/` watch the context window: at 65% prepare the handoff, at 70% finish it and
   run `node .claude/hooks/context-guard.mjs verify-handoff`, at 75% development tools are blocked — report
   HANDOFF READY and stop. `node .claude/hooks/context-guard.mjs status` shows the current reading.
6. Begin with a three-line status (branch, test result, next task), then work.
