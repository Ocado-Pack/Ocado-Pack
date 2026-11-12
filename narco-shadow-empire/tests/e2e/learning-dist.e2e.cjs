// The same scenario against the single-file offline build, opened from file:// like a double-click.
// The build is refreshed first so the scenario can never pass or fail on a stale bundle.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
execFileSync(process.execPath, [path.join(__dirname, '..', '..', 'tools', 'build.mjs')], { stdio: 'pipe' });
module.exports = { name: 'learning core (single-file build, file://): self-test, demo problems, progress survives a reload', page: 'dist/narco-shadow-empire.html', file: true, width: 640, height: 360, run: require('./_learning.cjs') };
