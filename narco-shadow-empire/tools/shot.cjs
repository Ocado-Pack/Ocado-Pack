#!/usr/bin/env node
// Load a page in headless Chromium (software WebGL), optionally run JS / a scenario, take screenshots,
// and print a JSON report (console errors, page errors, external network requests).
//
//   node tools/shot.cjs <page> [options]
//
//   <page>               path relative to the project root, may include a query string
//                        e.g. "index.html?quality=low&test=1"  or  "dev/world.html"
//   --out <file.png>     take a screenshot after everything else ran
//   --w <px> --h <px>    viewport size (default 1280x720)      --dpr <n>  device scale factor (default 1)
//   --wait <ms>          extra wait after the page is ready (default 1500)
//   --ready <expr>       JS expression that must become truthy (default "window.__ready === true"; "" to skip)
//   --timeout <ms>       ready/navigation timeout (default 90000)
//   --eval <js>          evaluate JS in the page (repeatable, run in order; awaited; results in report.evals)
//   --scenario <f.cjs>   module exporting  async ({page, shot, sleep, log, evalJs, report, baseUrl}) => any
//   --file               load via file:// (use for dist/narco-shadow-empire.html)
//   --touch              emulate a touch device
//   --verbose            echo page console.log to stderr
//
// Exit code 0 when no page errors occurred, 1 otherwise. Rendering is software (slow: a few FPS) - keep
// viewports small and prefer ?quality=low when you only need to test logic.
const path = require('node:path');
const { withPage } = require('./lib/harness.cjs');

function parseArgs(argv) {
  const o = { evals: [] };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--out') o.out = next();
    else if (a === '--w') o.width = Number(next());
    else if (a === '--h') o.height = Number(next());
    else if (a === '--dpr') o.dpr = Number(next());
    else if (a === '--wait') o.wait = Number(next());
    else if (a === '--ready') o.ready = next();
    else if (a === '--timeout') o.timeout = Number(next());
    else if (a === '--eval') o.evals.push(next());
    else if (a === '--scenario') o.scenario = next();
    else if (a === '--file') o.file = true;
    else if (a === '--touch') o.touch = true;
    else if (a === '--verbose') o.verbose = true;
    else rest.push(a);
  }
  o.page = rest[0];
  return o;
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  if (!o.page) { console.error('usage: node tools/shot.cjs <page> [--out file.png] [--eval js] [--scenario file.cjs] ...'); process.exit(2); }
  const report = await withPage(o, async (api) => {
    await api.sleep(o.wait === undefined ? 1500 : o.wait);
    const evals = [];
    for (const js of o.evals) {
      try { evals.push(await api.evalJs(js)); } catch (e) { evals.push({ error: String(e) }); api.report.ok = false; }
    }
    let scenarioResult;
    if (o.scenario) {
      const fn = require(path.resolve(o.scenario));
      scenarioResult = await (fn.default || fn)(api);
    }
    if (o.out) await api.shot(o.out);
    return { evals, scenario: scenarioResult };
  });
  const trim = (arr, n = 12) => (arr.length > n ? arr.slice(0, n).concat([`... +${arr.length - n} more`]) : arr);
  report.errors = trim(report.errors); report.warnings = trim(report.warnings, 6);
  report.failedRequests = trim(report.failedRequests); report.externalRequests = trim(report.externalRequests);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
})();
