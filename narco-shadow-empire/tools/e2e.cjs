#!/usr/bin/env node
// Runs every end-to-end scenario in tests/e2e/*.e2e.cjs (or the ones named on the command line).
// A scenario module exports:
//   module.exports = { name, page: 'index.html?test=1&quality=low', width?, height?, touch?, file?,
//                      run: async ({page, shot, sleep, log, evalJs, report}) => { ...; return {pass: boolean, details} } }
// Exit code 0 only when every scenario passes with no page errors.
const fs = require('node:fs');
const path = require('node:path');
const { withPage, ROOT } = require('./lib/harness.cjs');

(async () => {
  const dir = path.join(ROOT, 'tests', 'e2e');
  const wanted = process.argv.slice(2);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.e2e.cjs')).filter((f) => !wanted.length || wanted.some((w) => f.includes(w))).sort();
  if (!files.length) { console.log('no e2e scenarios found'); process.exit(0); }
  let failed = 0;
  for (const f of files) {
    const sc = require(path.join(dir, f));
    const t0 = Date.now();
    const report = await withPage({ page: sc.page || 'index.html?test=1&quality=low', width: sc.width, height: sc.height, touch: sc.touch, file: sc.file, ready: sc.ready, timeout: sc.timeout }, sc.run);
    const res = report.result || {};
    const pass = report.ok && res.pass !== false;
    if (!pass) failed++;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${sc.name || f}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    if (!pass || process.env.E2E_VERBOSE) {
      console.log(JSON.stringify({ details: res.details, errors: report.errors.slice(0, 10), pageErrors: report.pageErrors.slice(0, 5), failedRequests: report.failedRequests.slice(0, 5) }, null, 2));
    }
  }
  console.log(`\n${files.length - failed}/${files.length} scenarios passed`);
  process.exit(failed ? 1 : 0);
})();
