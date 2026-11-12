// Boundary sweep of the guard in simulation mode: what is allowed, refused or announced just below and at each threshold.
//   node .claude/hooks/context-guard.sweep.mjs      (own temporary state directory; the real session is not touched)
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), SCRIPT = path.join(HERE, 'context-guard.mjs'), REPO = path.resolve(HERE, '..', '..');
const run = (event, input, pct, state) => { const r = spawnSync(process.execPath, [SCRIPT, event], { input: JSON.stringify({ session_id: 'sweep', ...input }), encoding: 'utf8', env: { ...process.env, NARCO_GUARD_TEST: '1', NARCO_GUARD_SIM_PCT: String(pct), NARCO_GUARD_STATE_DIR: state } }); try { return JSON.parse(r.stdout); } catch { return r.stdout; } };
const tools = { 'Write src/*.js': { tool_name: 'Write', tool_input: { file_path: 'narco-shadow-empire/src/world/renderer.js' } }, 'Bash node tools/shot.cjs': { tool_name: 'Bash', tool_input: { command: 'node tools/shot.cjs dev/render.html' } }, 'Bash npm run build': { tool_name: 'Bash', tool_input: { command: 'npm run build' } },
  'Bash npm test': { tool_name: 'Bash', tool_input: { command: 'npm test' } }, 'Bash git add+commit+push': { tool_name: 'Bash', tool_input: { command: 'git add -A && git commit -m x && git push -u origin b' } }, 'Bash git checkout -b': { tool_name: 'Bash', tool_input: { command: 'git checkout -b other' } },
  'Edit SESSION_HANDOFF.md': { tool_name: 'Edit', tool_input: { file_path: 'narco-shadow-empire/docs/SESSION_HANDOFF.md' } }, 'Read any file': { tool_name: 'Read', tool_input: { file_path: 'narco-shadow-empire/src/main.js' } }, 'Agent (sub-agent)': { tool_name: 'Agent', tool_input: {} },
  'mcp__github__push_files': { tool_name: 'mcp__github__push_files', tool_input: {} }, 'mcp remote create_session': { tool_name: 'mcp__claude-code-remote__create_session', tool_input: {} } };
const pcts = [64.9, 65, 69.9, 70, 74.9, 75];
console.log('tool call'.padEnd(26) + pcts.map((p) => String(p).padStart(7)).join(''));
for (const [name, input] of Object.entries(tools)) { const st = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-')); console.log(name.padEnd(26) + pcts.map((p) => { const o = run('pre-tool', input, p, st); return (o && o.hookSpecificOutput && o.hookSpecificOutput.permissionDecision === 'deny' ? 'DENY' : 'allow').padStart(7); }).join('')); }
const kind = (o) => !o ? 'silent' : o.continue === false ? 'LOOP STOPPED' : o.decision === 'block' ? 'STOP BLOCKED' : /HARD STOP/.test(JSON.stringify(o)) ? 'hard-stop notice' : /COMPLETE AND VERIFY/.test(JSON.stringify(o)) ? 'complete notice' : /PREPARE THE HANDOFF/.test(JSON.stringify(o)) ? 'prepare notice' : /handoff is verified/.test(JSON.stringify(o)) ? 'verified notice' : 'other';
for (const verified of [false, true]) {
  console.log(`--- handoff ${verified ? 'VERIFIED' : 'NOT verified'}: what each event returns ---`);
  for (const ev of ['post-batch', 'prompt', 'stop']) console.log(ev.padEnd(26) + pcts.map((p) => { const st = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-')); if (verified) fs.writeFileSync(path.join(st, 'handoff-verified.json'), JSON.stringify({ head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim() })); return kind(run(ev, {}, p, st)).padStart(18); }).join(''));
}
