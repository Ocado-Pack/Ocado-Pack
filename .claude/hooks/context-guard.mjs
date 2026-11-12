#!/usr/bin/env node
// NARCO context guard: protects the project against context-window exhaustion.
//   node .claude/hooks/context-guard.mjs <event>      (hook events read the hook JSON on stdin)
//   events:  statusline | session-start | prompt | pre-tool | post-batch | stop | pre-compact
//   CLI:     status | verify-handoff
// Stages by context-window use:  < prepare normal · prepare (65%) start the handoff · complete (70%) finish and
// verify it · stop (75%) development tools are blocked. Every failure of this script is fail-open (exit 0, no
// output): the guard must never be the reason a session breaks. It never commits, pushes or deletes anything.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.NARCO_GUARD_ROOT || path.resolve(HERE, '..', '..');
const STATE_DIR = process.env.NARCO_GUARD_STATE_DIR || path.join(ROOT, '.claude', 'state');
const TEST = process.env.NARCO_GUARD_TEST === '1';
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const CFG = {
  thresholds: { prepare: 65, complete: 70, stop: 75 },
  contextWindowTokens: { default: 200000 },      // per model id; unknown models fall back to the conservative default
  statuslineMaxAgeMs: 10 * 60 * 1000,            // an older status-line snapshot counts as delayed metadata
  docsDir: 'narco-shadow-empire/docs',
  handoffDocs: ['CLAUDE.md', 'narco-shadow-empire/docs/SESSION_HANDOFF.md', 'narco-shadow-empire/docs/NEXT_TASKS.md', 'narco-shadow-empire/docs/ARCHITECTURE.md', 'narco-shadow-empire/docs/RESUME_PROMPT.md'],
  codePaths: ['narco-shadow-empire/src', 'narco-shadow-empire/tests', 'narco-shadow-empire/tools'],
  ...(readJson(path.join(HERE, 'context-guard.config.json')) || {}),
};
const T = CFG.thresholds;
const safe = (s) => String(s || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
const git = (...args) => { try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim(); } catch { return null; } };

// ---- state and log (git-ignored, per session) ---------------------------------------------------------------
const stateFile = (sid) => path.join(STATE_DIR, `guard-${safe(sid)}.json`);
const loadState = (sid) => readJson(stateFile(sid)) || { notified: {}, stopBlocks: 0, hardStopIssued: false, warnedUnknown: false };
function saveState(sid, st) { try { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(stateFile(sid), JSON.stringify({ ...st, updatedAt: Date.now() })); } catch { /* fail-open */ } }
function log(event, m, action) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const f = path.join(STATE_DIR, 'guard.log');
    try { if (fs.statSync(f).size > 262144) fs.writeFileSync(f, fs.readFileSync(f, 'utf8').slice(-131072)); } catch { /* new file */ }
    fs.appendFileSync(f, `${new Date().toISOString()} ${event} pct=${m && m.pct !== null && m.pct !== undefined ? m.pct : 'unknown'} src=${m ? m.source : '-'} ${action}\n`);
  } catch { /* fail-open */ }
}

// ---- context measurement ------------------------------------------------------------------------------------
function windowFor(model) {
  const id = String(model || '');
  if (/\[1m\]/i.test(id)) return 1000000;
  const map = CFG.contextWindowTokens;
  const key = Object.keys(map).filter((k) => k !== 'default' && id.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return key ? map[key] : map.default;
}
/** Tokens in the context of the newest main-thread API response: input + cache read + cache write (the formula of context_window.used_percentage). */
function lastUsage(file) {
  try {
    const size = fs.statSync(file).size, fd = fs.openSync(file, 'r');
    try {
      for (const span of [524288, 4194304]) {
        const len = Math.min(size, span), buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, size - len);
        const lines = buf.toString('utf8').split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          if (!lines[i].includes('"usage"') || !lines[i].includes('"assistant"')) continue;
          let e; try { e = JSON.parse(lines[i]); } catch { continue; }
          const u = e && e.type === 'assistant' && !e.isSidechain && e.message && e.message.usage;
          if (!u) continue;
          const tokens = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
          if (tokens > 0) return { tokens, model: e.message.model, ts: Date.parse(e.timestamp) || 0 };
        }
        if (len === size) break;
      }
    } finally { fs.closeSync(fd); }
  } catch { /* unreadable */ }
  return null;
}
function guessTranscript(sid) {
  const dir = path.join(os.homedir(), '.claude', 'projects', ROOT.replace(/[^A-Za-z0-9]/g, '-'));
  const direct = path.join(dir, `${sid}.jsonl`);
  if (fs.existsSync(direct)) return direct;
  try { return fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null; } catch { return null; }
}
/** -> {pct: number|null, source, window?, tokens?, model?}. Order: status-line snapshot (fresh) -> transcript -> unknown. */
function measure(input) {
  if (TEST && process.env.NARCO_GUARD_SIM_PCT !== undefined) {
    const v = process.env.NARCO_GUARD_SIM_PCT;
    return v === 'unknown' ? { pct: null, source: 'simulated-missing' } : { pct: Number(v), source: 'simulated', window: 1000000, tokens: Math.round(Number(v) * 10000) };
  }
  const sid = input.session_id || process.env.CLAUDE_CODE_SESSION_ID || 'unknown';
  const sl = readJson(path.join(STATE_DIR, `statusline-${safe(sid)}.json`));
  if (sl && Number.isFinite(sl.pct) && Date.now() - sl.at <= CFG.statuslineMaxAgeMs) return { pct: sl.pct, source: 'statusline', window: sl.size, tokens: sl.tokens };
  // A hook always receives its own transcript path. Only the CLI has to guess (session id, else the newest transcript).
  const tp = input.transcript_path || (input.hook_event_name ? null : guessTranscript(sid));
  const u = tp ? lastUsage(tp) : null, resetAt = loadState(sid).resetAt || 0;
  if (!tp) return { pct: null, source: sl ? 'stale-statusline' : 'none' };
  // no API response yet in this session, or none since /clear or a compaction: the context is fresh, not unknown
  if (!u || (u.ts && u.ts < resetAt)) return { pct: 0, source: 'transcript (no API response yet)', window: windowFor(u && u.model), tokens: 0 };
  const window = Number(process.env.NARCO_CONTEXT_WINDOW) || (sl && sl.size) || windowFor(u.model);
  return { pct: Math.round((u.tokens / window) * 1000) / 10, source: sl ? 'transcript (status line stale)' : 'transcript', window, tokens: u.tokens, model: u.model };
}
const stageOf = (pct) => (pct === null || pct === undefined ? 0 : pct >= T.stop ? 3 : pct >= T.complete ? 2 : pct >= T.prepare ? 1 : 0);
const overridden = () => process.env.NARCO_GUARD === 'off' || fs.existsSync(path.join(STATE_DIR, 'guard-off'));

// ---- handoff verification (state-based, so it survives a change of session id) --------------------------------
function treeState() {
  const porcelain = git('status', '--porcelain');
  return { branch: git('rev-parse', '--abbrev-ref', 'HEAD'), head: git('rev-parse', 'HEAD'), dirty: porcelain === null ? null : porcelain.split('\n').filter(Boolean), unpushed: Number(git('rev-list', '--count', '@{u}..HEAD') || 0) };
}
function handoffVerified() {
  const m = readJson(path.join(STATE_DIR, 'handoff-verified.json'));
  if (!m) return false;
  const t = treeState();
  return m.head === t.head && Array.isArray(t.dirty) && t.dirty.length === 0;
}
function verifyHandoff() {
  const problems = [], t = treeState();
  for (const rel of CFG.handoffDocs) { try { if (fs.statSync(path.join(ROOT, rel)).size < 200) problems.push(`${rel} is almost empty`); } catch { problems.push(`${rel} is missing`); } }
  let doc = '';
  try { doc = fs.readFileSync(path.join(ROOT, CFG.docsDir, 'SESSION_HANDOFF.md'), 'utf8'); } catch { /* reported above */ }
  for (const [name, re] of [['the exact next action', /exact next action/i], ['test results', /npm test|tests?,? \d+ pass|last successful result/i], ['current errors (or "none")', /current errors?/i], ['what is done and what is not', /not implemented|done, verified|implementation status/i]]) if (doc && !re.test(doc)) problems.push(`SESSION_HANDOFF.md does not record ${name}`);
  if (doc && t.branch && !doc.includes(t.branch)) problems.push(`SESSION_HANDOFF.md does not name the current branch (${t.branch})`);
  if (t.dirty === null) problems.push('git status failed (not a git repository?)');
  else if (t.dirty.length) problems.push(`${t.dirty.length} uncommitted path(s): commit them on ${t.branch} first (${t.dirty.slice(0, 4).map((l) => l.slice(3)).join(', ')}${t.dirty.length > 4 ? ', …' : ''})`);
  const docTime = Number(git('log', '-1', '--format=%ct', '--', path.join(CFG.docsDir, 'SESSION_HANDOFF.md')) || 0), codeTime = Number(git('log', '-1', '--format=%ct', '--', ...CFG.codePaths) || 0);
  if (docTime < codeTime) problems.push('SESSION_HANDOFF.md was last committed BEFORE the newest code commit: update it to describe the current code');
  const ok = problems.length === 0;
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const f = path.join(STATE_DIR, 'handoff-verified.json');
    if (ok) fs.writeFileSync(f, JSON.stringify({ head: t.head, branch: t.branch, at: Date.now(), unpushed: t.unpushed })); else fs.rmSync(f, { force: true });
  } catch { /* fail-open */ }
  return { ok, problems, ...t };
}

// ---- messages to the agent ----------------------------------------------------------------------------------
const D = CFG.docsDir, RUN = 'node .claude/hooks/context-guard.mjs';
const head = (m) => `[context-guard] Context window at ${m.pct}% (${m.tokens ? Math.round(m.tokens / 1000) + 'K of ' + Math.round(m.window / 1000) + 'K tokens, ' : ''}source: ${m.source}).`;
const STEPS = `Handoff steps: (1) update ${D}/SESSION_HANDOFF.md (status table, completed and incomplete work, test results and errors, branch and working-tree state, the exact next action) and ${D}/NEXT_TASKS.md; touch ${D}/ARCHITECTURE.md only if a contract changed; keep CLAUDE.md concise. Record file paths, never file contents or the conversation. (2) Commit on the current branch: no branch switch, no destructive git. Push only as the project instructions authorize; never open a pull request. (3) Run \`${RUN} verify-handoff\` and fix what it reports.`;
const READY = `Tell the user: HANDOFF READY. They should run /clear (or start a new session) and send the prompt in ${D}/RESUME_PROMPT.md. Do not claim the context was cleared or that a new session exists.`;
function notice(stage, m, verified) {
  if (stage === 1) return `${head(m)} PREPARE THE HANDOFF (threshold ${T.prepare}%). Accept no new development milestone. Finish only the operation in progress and leave the code in a tested, safe state. ${STEPS} At ${T.complete}% the handoff must be complete; at ${T.stop}% development tools are blocked.`;
  if (stage === 2) return verified ? `${head(m)} The handoff is verified (threshold ${T.complete}%). Start no new work. ${READY}` : `${head(m)} COMPLETE AND VERIFY THE HANDOFF NOW (threshold ${T.complete}%). Stop development work. ${STEPS} Then: ${READY}`;
  return verified ? `${head(m)} HARD STOP (threshold ${T.stop}%): development is blocked. ${READY}` : `${head(m)} HARD STOP (threshold ${T.stop}%): development tools are blocked; only the emergency handoff is allowed (reading, the handoff documents, non-destructive git, tests, this guard). ${STEPS} Then: ${READY}`;
}

// ---- tool gate ----------------------------------------------------------------------------------------------
const READ_ONLY = new Set(['ls', 'cat', 'head', 'tail', 'wc', 'grep', 'egrep', 'rg', 'sed', 'jq', 'pwd', 'date', 'echo', 'printf', 'true', 'test', '[', 'cd', 'find', 'sort', 'uniq', 'cut', 'tr', 'diff', 'stat', 'du', 'df', 'which', 'basename', 'dirname', 'realpath', 'sleep', 'git', 'npm', 'node']);
const GIT_OK = new Set(['status', 'diff', 'log', 'show', 'add', 'commit', 'push', 'fetch', 'reset', 'restore', 'rev-parse', 'rev-list', 'ls-remote', 'ls-files', 'branch', 'remote', 'stash', 'describe', 'blame', 'merge-base', 'for-each-ref', 'shortlog', 'check-ignore']);
const relPath = (p) => path.relative(ROOT, path.resolve(ROOT, String(p || '')));
const isHandoffPath = (p) => { const r = relPath(p); return r.startsWith('..') || path.isAbsolute(r) || CFG.handoffDocs.includes(r) || r.startsWith(path.join('.claude', 'state') + path.sep); };
/** Split a shell command into simple commands, ignoring text inside quotes and heredoc bodies. */
function simpleCommands(cmd) {
  let s = String(cmd || '').replace(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1([^\n]*)\n[\s\S]*?\n[ \t]*\2(?=\s|$)/g, ' $3 ').replace(/'[^']*'/g, "''");
  s = s.replace(/\d*[<>]&\d+/g, ' ').replace(/&>>?/g, '>');      // "2>&1" is harmless; "&> file" is a redirection to a file
  const inner = [];
  if (/`/.test(s)) inner.push('backtick-substitution');
  s = s.replace(/\$\(([^()]*)\)/g, (_, c) => { inner.push(c); return ' '; });
  if (/\$\(/.test(s)) inner.push('nested-substitution');
  s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
  return [...s.split(/\|\||&&|[;|&\n]/), ...inner].map((x) => x.trim().replace(/^(?:[A-Za-z_]\w*=\S*\s+)+/, '')).filter(Boolean);
}
/** Classify a git command. `destructive` (can discard work, rewrite history or leave the branch) is refused from the prepare stage on. */
function gitVerdict(tokens) {
  let i = 1;
  while (tokens[i] === '-C' || tokens[i] === '-c') i += 2;
  const sub = tokens[i] || '', args = tokens.slice(i + 1), has = (re) => args.some((x) => re.test(x));
  const destructive = ['clean', 'checkout', 'switch', 'worktree', 'rebase', 'filter-branch', 'update-ref', 'gc'].includes(sub) ? `git ${sub}`
    : sub === 'reset' && has(/^--(hard|merge|keep)$/) ? 'git reset --hard'
    : sub === 'restore' && !(has(/^--staged$/) && !has(/^--worktree$/)) ? 'git restore (working tree)'
    : sub === 'branch' && has(/^(-[a-zA-Z]*[dDmMfC][a-zA-Z]*|--delete|--move|--force|--copy)$/) ? 'git branch delete/move/force'
    : sub === 'stash' && !['list', 'show'].includes(args[0]) ? 'git stash'
    : sub === 'push' && (has(/^(--force.*|-[a-zA-Z]*f[a-zA-Z]*|--delete|-d|--mirror|--prune)$/) || has(/^[+:]/)) ? 'git push --force/--delete' : null;
  return { destructive, listed: GIT_OK.has(sub), sub };
}
/** -> null when the tool call may run, else the reason it is refused. */
function gate(stage, input) {
  const name = input.tool_name || '', ti = input.tool_input || {};
  if (stage >= 1 && /^(Agent|Task|Workflow)$/.test(name)) return 'starting agents or workflows is not part of a handoff';
  if (name === 'Bash') {
    for (const c of simpleCommands(ti.command)) {
      const tk = c.split(/\s+/), prog = path.basename(tk[0] || '');
      if (prog === 'git') {
        const g = gitVerdict(tk);
        if (g.destructive) return `${g.destructive} is not allowed during a handoff (it can discard work, rewrite history or leave the branch)`;
        if (stage >= 3 && !g.listed) return `git ${g.sub} is not on the handoff allowlist`;
      }
      if (stage < 3) continue;
      if (c === 'backtick-substitution' || c === 'nested-substitution') return 'command substitution cannot be checked';
      if (!READ_ONLY.has(prog)) return `\`${prog}\` is not on the handoff allowlist`;
      if (prog === 'sed' && tk.some((x) => /^(-[a-zA-Z]*i|--in-place)/.test(x))) return 'sed -i edits files';
      if (prog === 'find' && tk.some((x) => /^-(delete|exec|execdir|ok|fprint|fls)/.test(x))) return 'find with -exec/-delete';
      if (prog === 'npm' && !(tk[1] === 'test' || (tk[1] === 'run' && tk[2] === 'test'))) return 'only `npm test` is allowed';
      if (prog === 'node' && !(tk[1] === '--test' || /\.claude\/hooks\/context-guard(\.test)?\.mjs$/.test(tk[1] || ''))) return 'only `node --test` and the guard CLI are allowed';
      for (const m of c.matchAll(/(?:\d*|&)>>?\s*([^\s]+)/g)) if (!/^(&\d|\/dev\/null)$/.test(m[1]) && !isHandoffPath(m[1])) return `redirecting output to ${m[1]}`;
    }
    return null;
  }
  if (stage >= 3 && /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(name) && !isHandoffPath(ti.file_path || ti.notebook_path)) return `${relPath(ti.file_path || ti.notebook_path)} is not a handoff document`;
  return null;
}

// ---- hook events --------------------------------------------------------------------------------------------
const out = (o) => process.stdout.write(JSON.stringify(o));
const ctx = (event, text) => out({ hookSpecificOutput: { hookEventName: event, additionalContext: text } });
function onNotify(event, input) {                      // UserPromptSubmit and PostToolBatch
  const sid = input.session_id, m = measure(input), st = loadState(sid), stage = stageOf(m.pct), hookName = event === 'prompt' ? 'UserPromptSubmit' : 'PostToolBatch';
  if (overridden()) return log(event, m, 'override');
  if (TEST && process.env.NARCO_GUARD_TEST_QUIET === '1') return log(event, m, 'quiet (test)');   // lets a test reach the tool gate without the notice
  if (m.pct === null) {
    if (!st.warnedUnknown) { st.warnedUnknown = true; saveState(sid, st); log(event, m, 'warn-unknown'); return ctx(hookName, `[context-guard] No context-window data is available (${m.source}), so the ${T.prepare}/${T.complete}/${T.stop}% thresholds cannot be enforced in this session. Watch the context yourself and write the handoff early: \`${RUN} status\` shows what the guard can see.`); }
    return log(event, m, 'unknown');
  }
  if (stage === 0) { if (m.pct < T.prepare - 10 && (Object.keys(st.notified).length || st.hardStopIssued)) saveState(sid, { notified: {}, stopBlocks: 0, hardStopIssued: false, warnedUnknown: false, resetAt: st.resetAt }); return log(event, m, 'normal'); }
  const verified = handoffVerified(), key = `${stage}${verified ? 'v' : ''}`;
  if (stage === 3 && verified && event === 'post-batch' && !st.hardStopIssued) {
    st.hardStopIssued = true; st.notified[key] = Date.now(); saveState(sid, st); log(event, m, 'HARD-STOP loop stopped');
    return out({ continue: false, stopReason: `${head(m)} HARD STOP (threshold ${T.stop}%). HANDOFF READY: the handoff documents are committed and verified. Run /clear (or start a new session) and send the prompt in ${D}/RESUME_PROMPT.md.` });
  }
  if (st.notified[key] && !(stage === 3 && event === 'prompt')) return log(event, m, `stage${stage} already-notified`);
  st.notified[key] = Date.now(); saveState(sid, st); log(event, m, `stage${stage} notice${verified ? ' (verified)' : ''}`);
  return ctx(hookName, notice(stage, m, verified));
}
function onPreTool(input) {
  const m = measure(input), stage = stageOf(m.pct);
  if (stage === 0 || overridden()) return;
  const why = gate(stage, input);
  if (!why) return;
  log('pre-tool', m, `DENY ${input.tool_name}: ${why}`);
  out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `[context-guard] Context at ${m.pct}%: ${why}. ${stage >= 3 ? 'HARD STOP: only reading, the handoff documents, non-destructive git, `npm test` and `' + RUN + '` are allowed.' : 'Handoff in progress.'} (The user can lift the guard with: touch .claude/state/guard-off)` } });
}
function onStop(input) {
  const sid = input.session_id, m = measure(input), st = loadState(sid), stage = stageOf(m.pct);
  if (input.stop_hook_active || overridden() || stage < 2 || st.stopBlocks >= 1 || handoffVerified()) return log('stop', m, 'allow');
  st.stopBlocks += 1; saveState(sid, st); log('stop', m, 'BLOCK handoff not verified');
  out({ decision: 'block', reason: `${head(m)} The handoff is not verified yet (threshold ${T.complete}%). Before stopping: ${STEPS} Then: ${READY}` });
}
function onSessionStart(input) {
  const src = input.source || 'startup', m = measure(input), t = treeState();
  if (src !== 'resume') saveState(input.session_id, { notified: {}, stopBlocks: 0, hardStopIssued: false, warnedUnknown: false, resetAt: src === 'startup' ? 0 : Date.now() });
  const m2 = src === 'resume' ? m : measure(input);
  log('session-start', m2, src);
  const where = `Git: branch ${t.branch || '?'}, HEAD ${(t.head || '?').slice(0, 7)}, ${t.dirty ? t.dirty.length : '?'} uncommitted path(s), ${t.unpushed} unpushed commit(s).`;
  if (src === 'resume') return ctx('SessionStart', `[context-guard] active (${T.prepare}/${T.complete}/${T.stop}% of the context window; now ${m.pct === null ? 'unknown' : m.pct + '%'}). ${where}`);
  ctx('SessionStart', `[context-guard] ${src === 'compact' ? 'The conversation was compacted: details may be lost.' : 'Fresh context.'} Before any work, restore the project state from the saved handoff: read CLAUDE.md, then ${D}/SESSION_HANDOFF.md (section 4 is the exact next action) and ${D}/NEXT_TASKS.md; ${D}/RESUME_PROMPT.md holds the full resume procedure. Do not rebuild systems the handoff lists as done. ${where} The guard asks for a handoff at ${T.prepare}% of the context window, requires it verified at ${T.complete}%, and blocks development tools at ${T.stop}%.`);
}
function onStatusline(input) {
  const cw = input.context_window || {}, sid = input.session_id || process.env.CLAUDE_CODE_SESSION_ID;
  if (Number.isFinite(cw.used_percentage)) { try { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(path.join(STATE_DIR, `statusline-${safe(sid)}.json`), JSON.stringify({ pct: cw.used_percentage, size: cw.context_window_size, tokens: cw.total_input_tokens, at: Date.now() })); } catch { /* fail-open */ } }
  const pct = Number.isFinite(cw.used_percentage) ? cw.used_percentage : null;
  process.stdout.write(`[${(input.model && input.model.display_name) || 'Claude'}] ctx ${pct === null ? '?' : Math.round(pct) + '%'} · guard ${['normal', 'PREPARE HANDOFF', 'COMPLETE HANDOFF', 'HARD STOP'][stageOf(pct)]} (${T.prepare}/${T.complete}/${T.stop})`);
}

// ---- entry ----------------------------------------------------------------------------------------------------
const event = process.argv[2];
try {
  if (event === 'status') {
    const m = measure({}), v = handoffVerified();
    console.log(JSON.stringify({ ...m, stage: ['normal', 'prepare', 'complete', 'stop'][stageOf(m.pct)], thresholds: T, thresholdTokens: m.window ? { prepare: m.window * T.prepare / 100, complete: m.window * T.complete / 100, stop: m.window * T.stop / 100 } : null, handoffVerified: v, overridden: overridden(), ...treeState() }, null, 1));
  } else if (event === 'verify-handoff') {
    const r = verifyHandoff();
    console.log(r.ok ? `HANDOFF VERIFIED: branch ${r.branch}, HEAD ${r.head.slice(0, 7)}, working tree clean${r.unpushed ? `, ${r.unpushed} commit(s) NOT pushed (push if the project instructions authorize it)` : ', nothing unpushed'}.` : `HANDOFF NOT VERIFIED:\n - ${r.problems.join('\n - ')}`);
    process.exitCode = r.ok ? 0 : 1;
  } else {
    let input = {};
    try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { input = {}; }
    if (event === 'statusline') onStatusline(input);
    else if (event === 'session-start') onSessionStart(input);
    else if (event === 'prompt' || event === 'post-batch') onNotify(event, input);
    else if (event === 'pre-tool') onPreTool(input);
    else if (event === 'stop') onStop(input);
    else if (event === 'pre-compact') log('pre-compact', measure(input), `${input.trigger || ''} verified=${handoffVerified()}`);
  }
} catch (e) { log(event || '?', null, `ERROR ${String(e && e.message).slice(0, 200)}`); }
