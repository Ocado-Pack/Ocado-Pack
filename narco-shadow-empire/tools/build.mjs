#!/usr/bin/env node
// Builds the single-file, fully offline game: dist/narco-shadow-empire.html
// (all JavaScript incl. three.js r160 and all CSS inlined - open it by double-click, no server, no network).
//   node tools/build.mjs [--no-minify]
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const minify = !process.argv.includes('--no-minify');

const threePath = path.join(ROOT, 'vendor/three/three.module.js');
const addonsDir = path.join(ROOT, 'vendor/three/addons');

const vendorAlias = {
  name: 'vendor-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: threePath }));
    b.onResolve({ filter: /^three\/addons\// }, (args) => ({ path: path.join(addonsDir, args.path.slice('three/addons/'.length)) }));
  },
};

const result = await build({
  entryPoints: [path.join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify,
  legalComments: 'inline',
  write: false,
  plugins: [vendorAlias],
  logLevel: 'warning',
  define: { 'globalThis.__NARCO_SINGLE_FILE__': 'true' },
});
// Make the bundle safe to inline in a <script> element: "</script" and "<!--" may only occur inside string /
// template / regex literals or comments in esbuild output, where these escapes are equivalent.
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\x21--');

// CSS: every file referenced by <link rel="stylesheet" href="src/styles/..."> in index.html, in order.
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let css = '';
html = html.replace(/[ \t]*<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>\s*\n?/g, (m, href) => {
  const file = path.join(ROOT, href);
  if (fs.existsSync(file)) css += `/* ${href} */\n` + fs.readFileSync(file, 'utf8') + '\n';
  else console.warn('build: stylesheet not found (skipped):', href);
  return '';
});
// Drop the dev import map and module entry; inline everything.
html = html.replace(/[ \t]*<script type="importmap">[\s\S]*?<\/script>\s*\n?/, '');
html = html.replace(/[ \t]*<script type="module" src="[^"]+"><\/script>\s*\n?/, '');
// NOTE: function replacers on purpose - a string replacement would interpret "$&", "$'" ... inside the bundle.
html = html.replace('</head>', () => `<style>\n${css}</style>\n</head>`);
html = html.replace('</body>', () => `<script>\n${js}\n</script>\n</body>`);

const outDir = path.join(ROOT, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'narco-shadow-empire.html');
fs.writeFileSync(out, html);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log(`built ${path.relative(ROOT, out)}  (js ${kb(js.length)}, css ${kb(css.length)}, total ${kb(html.length)})`);
