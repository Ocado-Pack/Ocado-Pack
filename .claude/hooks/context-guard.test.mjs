// Tests for the context guard. They simulate context percentages (no real tokens are used):
//   node --test .claude/hooks/context-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'context-guard.mjs');
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `guard-${name}-`));
/** run one hook event; returns {code, out (parsed JSON or raw text), text (additionalContext / reason)} */
function run(event, input = {}, { pct, state, root, env = {}, raw } = {}) {
  const e = { ...process.env, NARCO_GUARD_TEST: '1', NARCO_GUARD_STATE_DIR: state, ...env };
  delete e.NARCO_GUARD_SIM_PCT; delete e.NARCO_GUARD; delete e.NARCO_CONTEXT_WINDOW;
  if (pct !== undefined) e.NARCO_GUARD_SIM_PCT = String(pct);
  if (root) e.NARCO_GUARD_ROOT = root;
  Object.assign(e, env);
  const r = spawnSync(process.execPath, [SCRIPT, event], { input: raw !== undefined ? raw : JSON.stringify({ session_id: 's1', ...input }), encoding: 'utf8', env: e });
  let out = r.stdout; try { out = JSON.parse(r.stdout); } catch { /* plain text or empty */ }
  const h = out && out.hookSpecificOutput;
  return { code: r.status, out, text: (h && (h.additionalContext || h.permissionDecisionReason)) || (out && (out.reason || out.stopReason)) || '', deny: !!(h && h.permissionDecision === 'deny') };
}
const tool = (name, tool_input) => ({ tool_name: name, tool_input });
const bash = (command) => tool('Bash', { command });
const SRC = 'narco-shadow-empire/src/world/renderer.js';

test('60%: normal development, the guard is silent', () => {
  const state = tmp('60'), o = { pct: 60, state };
  for (const ev of ['prompt', 'post-batch', 'stop', 'pre-compact']) assert.deepEqual([run(ev, {}, o).code, run(ev, {}, o).out], [0, ''], ev);
  for (const t of [tool('Write', { file_path: SRC }), bash('git checkout -b x && rm -rf dist'), tool('Agent', {})]) assert.equal(run('pre-tool', t, o).out, '');
});

test('65%: prepare the handoff (announced once); destructive git and agent spawns are refused, development is not', () => {
  const state = tmp('65'), o = { pct: 65, state };
  const first = run('post-batch', {}, o);
  assert.equal(first.out.hookSpecificOutput.hookEventName, 'PostToolBatch');
  assert.match(first.text, /Context window at 65%.*PREPARE THE HANDOFF.*SESSION_HANDOFF\.md.*verify-handoff/s);
  assert.equal(run('post-batch', {}, o).out, '', 'not repeated');
  assert.equal(run('prompt', {}, o).out, '', 'not repeated on the next prompt either');
  assert.equal(run('stop', {}, o).out, '', 'stopping is not blocked at the prepare stage');
  for (const ok of [tool('Write', { file_path: SRC }), bash('npm test'), bash('git add -A && git commit -m "wip; done" && git push -u origin claude/x'), bash('git branch -vv; git restore --staged a.js; git stash list'), bash('python3 build.py')]) assert.equal(run('pre-tool', ok, o).out, '', JSON.stringify(ok.tool_input));
  for (const bad of ['git reset --hard HEAD~1', 'git clean -fd', 'git checkout main', 'git switch -c other', 'git restore src/a.js', 'git stash', 'git branch -D feature', 'git push --force', 'git push origin +main', 'git push origin :old', 'cd x && git rebase -i HEAD~2', 'git -C /repo checkout .']) {
    const r = run('pre-tool', bash(bad), o);
    assert.ok(r.deny, bad); assert.match(r.text, /not allowed during a handoff/);
  }
  assert.ok(run('pre-tool', tool('Agent', { prompt: 'build the renderer' }), o).deny);
  assert.ok(run('pre-tool', tool('Workflow', {}), o).deny);
});

test('70%: complete and verify; stopping without a verified handoff is blocked exactly once', () => {
  const state = tmp('70'), o = { pct: 70.4, state };
  assert.match(run('prompt', {}, o).text, /COMPLETE AND VERIFY THE HANDOFF NOW.*HANDOFF READY/s);
  assert.equal(run('pre-tool', tool('Edit', { file_path: SRC }), o).out, '', 'not yet a hard stop');
  const stop = run('stop', {}, o);
  assert.equal(stop.out.decision, 'block'); assert.match(stop.text, /not verified yet/);
  assert.equal(run('stop', {}, o).out, '', 'second stop is allowed: never an endless loop');
  assert.equal(run('stop', { stop_hook_active: true }, { pct: 72, state: tmp('70b') }).out, '', 'never blocks while a stop hook is already active');
});

test('75% without a verified handoff: development tools are blocked, the emergency handoff is not', () => {
  const state = tmp('75'), o = { pct: 75, state };
  const n = run('post-batch', {}, o);
  assert.match(n.text, /HARD STOP.*only the emergency handoff is allowed/s);
  assert.notEqual(n.out.continue, false, 'the loop keeps running so the handoff can be written');
  assert.match(run('prompt', {}, o).text, /HARD STOP/, 'repeated on every prompt');
  for (const f of [SRC, 'narco-shadow-empire/tests/unit/x.test.mjs', 'narco-shadow-empire/package.json', '.claude/settings.json']) { const r = run('pre-tool', tool('Write', { file_path: f }), o); assert.ok(r.deny, f); assert.match(r.text, /HARD STOP/); }
  for (const f of ['CLAUDE.md', 'narco-shadow-empire/docs/SESSION_HANDOFF.md', 'narco-shadow-empire/docs/NEXT_TASKS.md', 'narco-shadow-empire/docs/ARCHITECTURE.md', 'narco-shadow-empire/docs/RESUME_PROMPT.md', path.join(os.tmpdir(), 'scratch.txt')]) assert.equal(run('pre-tool', tool('Edit', { file_path: f }), o).out, '', f);
  const allowed = ['git status --short && git log --oneline | head -3', "git add -A && git commit -q -F - <<'EOF'\nUpdate handoff; next: renderer\n\nbody | with && separators\nEOF\ngit push -u origin claude/narco 2>&1 | tail -1", 'git commit -m "$(cat <<\'EOF\'\nmsg\nEOF\n)"', 'cd narco-shadow-empire && npm test 2>&1 | grep -E "^# (pass|fail)"', "sed -n '1,20p' narco-shadow-empire/docs/NEXT_TASKS.md", 'node .claude/hooks/context-guard.mjs verify-handoff', 'node --test .claude/hooks/context-guard.test.mjs', 'ls -la && cat CLAUDE.md > /dev/null', 'echo done >> narco-shadow-empire/docs/SESSION_HANDOFF.md', 'git ls-remote origin refs/heads/x; git rev-parse HEAD'];
  for (const c of allowed) assert.equal(run('pre-tool', bash(c), o).out, '', c);
  const refused = ['python3 patch.py', "cat > narco-shadow-empire/src/a.js <<'EOF'\nx\nEOF", "cat <<'EOF' > narco-shadow-empire/src/a.js\nx\nEOF", "sed -i 's/a/b/' src/a.js", 'rm -rf narco-shadow-empire/dist', 'node -e "require(\'fs\').writeFileSync(\'a\',\'\')"', 'git show HEAD:a.js > narco-shadow-empire/src/a.js', 'echo "$(rm -rf src)"', 'echo `rm x`', 'npm run build', 'npm install left-pad', 'git push --force', 'git merge main', 'curl https://example.com', 'find . -name "*.js" -delete', 'ls | xargs rm', 'cp a b', 'FOO=1 bash run.sh'];
  for (const c of refused) assert.ok(run('pre-tool', bash(c), o).deny, c);
  assert.ok(run('pre-tool', tool('Agent', {}), o).deny);
  assert.equal(run('pre-tool', tool('Read', { file_path: SRC }), o).out, '');
  assert.equal(run('pre-tool', tool('Grep', { pattern: 'x' }), o).out, '');
  // the user can always lift the guard
  fs.writeFileSync(path.join(state, 'guard-off'), '');
  assert.equal(run('pre-tool', tool('Write', { file_path: SRC }), o).out, '');
  assert.equal(run('pre-tool', tool('Write', { file_path: SRC }), { pct: 90, state: tmp('75env'), env: { NARCO_GUARD: 'off' } }).out, '');
});

/** a throwaway git repository that looks like the project, with complete handoff documents */
function fakeProject() {
  const root = tmp('repo'), g = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  g('init', '-q'); g('config', 'user.email', 't@example.com'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
  const branch = g('symbolic-ref', '--short', 'HEAD'), docs = path.join(root, 'narco-shadow-empire', 'docs');
  fs.mkdirSync(docs, { recursive: true }); fs.mkdirSync(path.join(root, 'narco-shadow-empire', 'src'));
  const filler = ' '.padEnd(220, '.');
  fs.writeFileSync(path.join(root, 'narco-shadow-empire', 'src', 'a.js'), 'export const a = 1;\n');
  g('add', '-A'); g('commit', '-q', '-m', 'code');
  for (const f of ['NEXT_TASKS.md', 'ARCHITECTURE.md', 'RESUME_PROMPT.md']) fs.writeFileSync(path.join(docs, f), f + filler);
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'instructions' + filler);
  fs.writeFileSync(path.join(docs, 'SESSION_HANDOFF.md'), `branch ${branch}\n## 3. Implementation status\nDone, verified\n## 4.\nLast successful results: npm test 28 pass\nCurrent errors: none\nExact next action: renderer${filler}`);
  return { root, g, docs };
}

test('verify-handoff: fails on missing content or uncommitted work, passes on a complete committed handoff, expires with new commits', () => {
  const { root, g, docs } = fakeProject(), state = tmp('verify'), o = { state, root };
  const v = () => { const r = run('verify-handoff', {}, o); return { code: r.code, text: String(r.out) }; };
  let r = v();
  assert.equal(r.code, 1); assert.match(r.text, /HANDOFF NOT VERIFIED[\s\S]*uncommitted path/);
  g('add', '-A'); g('commit', '-q', '-m', 'handoff');
  r = v();
  assert.equal(r.code, 0); assert.match(r.text, /^HANDOFF VERIFIED: branch .*working tree clean/);
  assert.ok(fs.existsSync(path.join(state, 'handoff-verified.json')));
  // at 75% with a verified handoff the agent loop is stopped once, with the message for the user
  const stopLoop = run('post-batch', {}, { ...o, pct: 76 });
  assert.equal(stopLoop.out.continue, false); assert.match(stopLoop.text, /HARD STOP.*HANDOFF READY.*\/clear.*RESUME_PROMPT\.md/s);
  assert.notEqual(run('post-batch', {}, { ...o, pct: 77 }).out.continue, false, 'the loop is stopped only once');
  assert.match(run('prompt', {}, { ...o, pct: 77 }).text, /HARD STOP.*development is blocked.*HANDOFF READY/s);
  assert.equal(run('stop', {}, { ...o, pct: 77 }).out, '', 'a verified handoff may stop');
  assert.match(run('prompt', {}, { ...o, pct: 71, state: tmp('v70') , env: { NARCO_GUARD_STATE_DIR: state } }).text, /handoff is verified|HARD STOP|COMPLETE/);
  // missing sections and a stale document are reported
  fs.writeFileSync(path.join(docs, 'SESSION_HANDOFF.md'), 'nothing useful here' + ' '.padEnd(220, '.')); fs.rmSync(path.join(docs, 'RESUME_PROMPT.md'));
  r = v();
  assert.equal(r.code, 1);
  for (const re of [/RESUME_PROMPT\.md is missing/, /does not record the exact next action/, /does not record test results/, /does not name the current branch/, /uncommitted path/]) assert.match(r.text, re);
  assert.ok(!fs.existsSync(path.join(state, 'handoff-verified.json')), 'a failed check clears the old verification');
  g('checkout', '-q', '--', '.');
  assert.equal(v().code, 0);
  fs.writeFileSync(path.join(root, 'narco-shadow-empire', 'src', 'a.js'), 'export const a = 2;\n'); g('add', '-A'); g('commit', '-q', '-m', 'more code', '--date', '2099-01-01T00:00:00', '--no-verify');
  execFileSync('git', ['commit', '--amend', '-q', '--no-edit', '--date', '2099-01-01T00:00:00'], { cwd: root, env: { ...process.env, GIT_COMMITTER_DATE: '2099-01-01T00:00:00' } });
  assert.match(v().text, /last committed BEFORE the newest code commit/);
  assert.equal(run('stop', {}, { ...o, pct: 72 }).out.decision, 'block', 'new commits invalidate the old verification');
});

test('real measurement: transcript usage, model windows, status line snapshot, delayed and missing metadata', () => {
  const state = tmp('measure'), dir = tmp('transcript'), file = path.join(dir, 't.jsonl');
  const line = (tokens, model, extra = {}) => JSON.stringify({ type: 'assistant', ...extra, message: { model, usage: { input_tokens: 2, cache_read_input_tokens: tokens - 1002, cache_creation_input_tokens: 1000, output_tokens: 5000 } } });
  const write = (...lines) => fs.writeFileSync(file, ['{"type":"user","message":{}}', ...lines, '{"type":"attachment"}', '{broken json'].join('\n') + '\n');
  const at = (o = {}) => run('post-batch', { transcript_path: file, session_id: o.sid || 's' + Math.random() }, { state, ...o });
  write(line(500000, 'claude-fable-5-2'), line(700000, 'claude-fable-5-2'), line(999999, 'claude-fable-5-2', { isSidechain: true }));
  assert.match(at().text, /Context window at 70% \(700K of 1000K tokens, source: transcript\)\. COMPLETE AND VERIFY/, 'newest main-thread response, 1M window for the configured model');
  write(line(640000, 'claude-fable-5-2'));
  assert.equal(at().out, '', '64% is below every threshold');
  write(line(650000, 'claude-fable-5-2'));
  assert.match(at().text, /at 65%.*PREPARE/s);
  write(line(150000, 'some-future-model'));
  assert.match(at().text, /at 75% \(150K of 200K tokens.*HARD STOP/s, 'unknown models use the conservative 200K default');
  write(line(150000, 'some-future-model[1m]'));
  assert.equal(at().out, '', 'a [1m] model id means a 1M window');
  assert.match(at({ env: { NARCO_CONTEXT_WINDOW: '200000' } }).text, /HARD STOP/, 'the window can be set explicitly');
  // status line snapshot: authoritative while fresh
  const sl = run('statusline', { session_id: 'live', model: { display_name: 'Fable 5.2' }, context_window: { used_percentage: 66.4, context_window_size: 1000000, total_input_tokens: 664000 } }, { state });
  assert.equal(sl.out, '[Fable 5.2] ctx 66% · guard PREPARE HANDOFF (65/70/75)');
  write(line(100000, 'claude-fable-5-2'));
  assert.match(at({ sid: 'live' }).text, /at 66\.4% \(664K of 1000K tokens, source: statusline\)/);
  // delayed: a snapshot older than 10 minutes is ignored and the transcript is used
  const snap = path.join(state, 'statusline-live.json'), old = JSON.parse(fs.readFileSync(snap, 'utf8'));
  fs.writeFileSync(snap, JSON.stringify({ ...old, pct: 99, at: Date.now() - 11 * 60 * 1000 }));
  write(line(720000, 'claude-fable-5-2'));
  assert.match(run('prompt', { transcript_path: file, session_id: 'live' }, { state }).text, /at 72% .*source: transcript \(status line stale\)/);
  assert.equal(run('statusline', { session_id: 'x', context_window: { used_percentage: null } }, { state }).out, '[Claude] ctx ? · guard normal (65/70/75)', 'null before the first API call');
  // missing: no usable data -> one warning, then silence; nothing is ever blocked
  // a session that has no API response yet (new file, or nothing since /clear or a compaction) is fresh, not unknown
  const fresh = { transcript_path: path.join(dir, 'not-written-yet.jsonl'), session_id: 'f', hook_event_name: 'UserPromptSubmit' };
  assert.equal(run('prompt', fresh, { state }).out, '');
  write(line(900000, 'claude-fable-5-2', { timestamp: new Date(Date.now() - 60000).toISOString() }));
  const afterCompact = { transcript_path: file, session_id: 'c', hook_event_name: 'UserPromptSubmit' };
  assert.match(run('prompt', afterCompact, { state }).text, /at 90%.*HARD STOP/s);
  run('session-start', { ...afterCompact, source: 'compact' }, { state });
  assert.equal(run('prompt', afterCompact, { state }).out, '', 'usage from before the compaction is not counted');
  write(line(900000, 'claude-fable-5-2', { timestamp: new Date(Date.now() - 60000).toISOString() }), line(120000, 'claude-fable-5-2', { timestamp: new Date(Date.now() + 5000).toISOString() }));
  assert.equal(run('prompt', afterCompact, { state }).out, '', '12% after the compaction');
  const none = { state: tmp('none'), env: { HOME: tmp('home') } }, miss = { session_id: 'm', hook_event_name: 'UserPromptSubmit' };
  assert.match(run('prompt', miss, none).text, /No context-window data is available.*cannot be enforced/s);
  assert.equal(run('prompt', miss, none).out, '');
  assert.equal(run('post-batch', miss, none).out, '');
  assert.equal(run('pre-tool', { ...miss, ...tool('Write', { file_path: SRC }) }, none).out, '');
  assert.equal(run('stop', miss, none).out, '');
  const unknown = { pct: 'unknown', state: tmp('unk') };
  assert.match(run('post-batch', {}, unknown).text, /No context-window data/);
  assert.equal(run('pre-tool', bash('rm -rf /'), unknown).out, '', 'fail-open');
});

test('new session: the handoff is pointed to; garbage input never breaks a session', () => {
  const state = tmp('start');
  for (const source of ['startup', 'clear']) {
    const r = run('session-start', { source }, { state, pct: 3 });
    assert.equal(r.out.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(r.text, /Fresh context\. Before any work.*CLAUDE\.md.*SESSION_HANDOFF\.md \(section 4 is the exact next action\).*NEXT_TASKS\.md.*RESUME_PROMPT\.md.*Do not rebuild.*Git: branch \S+, HEAD [0-9a-f]{7}/s);
  }
  assert.match(run('session-start', { source: 'compact' }, { state, pct: 20 }).text, /The conversation was compacted/);
  const resume = run('session-start', { source: 'resume' }, { state, pct: 40 });
  assert.match(resume.text, /^\[context-guard\] active \(65\/70\/75% of the context window; now 40%\)\. Git: branch/);
  assert.ok(resume.text.length < 260, 'a resumed session gets one short line');
  // a fresh session forgets the previous session's notices
  run('post-batch', {}, { state, pct: 66 });
  assert.equal(run('post-batch', {}, { state, pct: 66 }).out, '');
  run('session-start', { source: 'clear' }, { state, pct: 2 });
  assert.match(run('post-batch', {}, { state, pct: 66 }).text, /PREPARE/);
  // dropping well below the thresholds (compaction) re-arms the notices
  run('post-batch', {}, { state, pct: 20 });
  assert.match(run('post-batch', {}, { state, pct: 67 }).text, /PREPARE/);
  for (const ev of ['prompt', 'post-batch', 'pre-tool', 'stop', 'session-start', 'statusline', 'pre-compact', 'no-such-event']) {
    const r = run(ev, {}, { state: tmp('junk'), raw: '{not json', pct: ev === 'statusline' ? undefined : 80 });
    assert.equal(r.code, 0, ev);
  }
  assert.match(fs.readFileSync(path.join(state, 'guard.log'), 'utf8'), /session-start pct=3 src=simulated startup/);
});
