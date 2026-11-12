// Shared Playwright harness for screenshots and end-to-end scenarios.
// Starts an ephemeral static server on a free port, opens headless Chromium (software WebGL),
// collects console errors / page errors / external network requests, and hands you the page.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
};

function startServer(root = ROOT) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p;
      try { p = decodeURIComponent(req.url.split('?')[0]); } catch { p = '/'; }
      if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(root, p));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

/**
 * @param {object} opts
 * @param {string} opts.page      path relative to project root incl. query, e.g. "dev/world.html?quality=low"
 * @param {boolean} [opts.file]   load through file:// instead of http (used for the single-file dist build)
 * @param {number} [opts.width=1280] @param {number} [opts.height=720] @param {number} [opts.dpr=1]
 * @param {boolean} [opts.touch]  emulate a touch device
 * @param {string} [opts.ready]   JS expression awaited truthy (default "window.__ready === true"); pass "" to skip
 * @param {number} [opts.timeout=90000]
 * @param {(api:object)=>Promise<any>} fn   receives { page, shot, sleep, log, evalJs, report, baseUrl }
 */
async function withPage(opts, fn) {
  const { chromium } = require('playwright');
  const report = { ok: true, page: opts.page, errors: [], pageErrors: [], warnings: [], externalRequests: [], failedRequests: [], shots: [], result: undefined, ms: 0 };
  const t0 = Date.now();
  let server = null;
  let baseUrl;
  if (opts.file) {
    baseUrl = pathToFileURL(ROOT + path.sep).href;
  } else {
    server = await startServer();
    baseUrl = `http://127.0.0.1:${server.port}/`;
  }
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: opts.width || 1280, height: opts.height || 720 },
      deviceScaleFactor: opts.dpr || 1,
      hasTouch: !!opts.touch,
      isMobile: !!opts.touch,
    });
    const page = await context.newPage();
    page.on('console', (m) => {
      const t = m.type();
      if (t === 'error') report.errors.push(m.text());
      else if (t === 'warning') report.warnings.push(m.text());
      else if (opts.verbose) console.error('[console.' + t + ']', m.text());
    });
    page.on('pageerror', (e) => report.pageErrors.push(String(e && e.stack || e)));
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(baseUrl) && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('file:')) report.externalRequests.push(u);
    });
    page.on('requestfailed', (r) => report.failedRequests.push(r.url() + ' :: ' + (r.failure() && r.failure().errorText)));
    page.on('response', (r) => { if (r.status() >= 400) report.failedRequests.push(r.url() + ' :: HTTP ' + r.status()); });

    const url = opts.file ? pathToFileURL(path.join(ROOT, opts.page.split('?')[0])).href + (opts.page.includes('?') ? '?' + opts.page.split('?')[1] : '') : baseUrl + opts.page;
    await page.goto(url, { waitUntil: 'load', timeout: opts.timeout || 240000 });
    const ready = opts.ready === undefined ? 'window.__ready === true' : opts.ready;
    if (ready) {
      try {
        await page.waitForFunction(ready, null, { timeout: opts.timeout || 240000, polling: 250 });
      } catch (e) {
        report.ok = false;
        report.errors.push('READY TIMEOUT waiting for: ' + ready);
      }
    }
    const api = {
      page, baseUrl, report,
      sleep: (ms) => page.waitForTimeout(ms),
      log: (...a) => console.error('[scenario]', ...a),
      evalJs: (js) => page.evaluate(js),
      shot: async (file, o = {}) => {
        const out = path.resolve(file);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        await page.screenshot({ path: out, ...o });
        report.shots.push(out);
        return out;
      },
    };
    report.result = await fn(api);
  } catch (e) {
    report.ok = false;
    report.errors.push('HARNESS: ' + String(e && e.stack || e));
  } finally {
    await browser.close().catch(() => {});
    if (server) server.srv.close();
  }
  if (report.pageErrors.length) report.ok = false;
  report.ms = Date.now() - t0;
  return report;
}

module.exports = { withPage, ROOT };
