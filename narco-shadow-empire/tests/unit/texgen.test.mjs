// The procedural texture generator is pure (typed arrays), so its promises are checked in Node:
// deterministic, seamless, sane value ranges, and fast enough to build a world's worth at load time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, fbm, normalFromHeight, KIND_NAMES, FACADES } from '../../src/world/texgen.js';
import { createRng } from '../../src/core/rng.js';

const SIZE = 128;
const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s = (s * 31 + a[i]) >>> 0; return s; };
const luma = (c, i) => 0.2126 * c[i * 4] + 0.7152 * c[i * 4 + 1] + 0.0722 * c[i * 4 + 2];

test('texgen: every kind is deterministic and depends on its seed', () => {
  assert.deepEqual([...KIND_NAMES].sort(), ['asphalt', 'brick', 'chainlink', 'concrete', 'corrugated', 'facade', 'sidewalk', 'stucco', 'wood']);
  for (const kind of KIND_NAMES) {
    const a = generate(kind, { size: SIZE, seed: 5 }), b = generate(kind, { size: SIZE, seed: 5 }), c = generate(kind, { size: SIZE, seed: 6 });
    assert.equal(a.size, SIZE); assert.ok(a.meters > 0);
    for (const k of ['color', 'normal', 'orm']) { assert.equal(a[k].length, SIZE * SIZE * 4, `${kind}.${k}`); assert.equal(sum(a[k]), sum(b[k]), `${kind}.${k} repeatable`); }
    if (kind !== 'chainlink') assert.notEqual(sum(a.color), sum(c.color), `${kind} changes with the seed`);
  }
  assert.throws(() => generate('marble'), /unknown kind/);
  assert.equal(generate('brick', { seed: 'wall-a', size: 32 }).size, 32);
});

test('texgen: maps tile seamlessly (the wrap edge is no rougher than the interior)', () => {
  const f = fbm(SIZE, createRng(3), 4, 4, 4);
  let seam = 0, inner = 0;
  for (let y = 0; y < SIZE; y++) { seam += Math.abs(f[y * SIZE] - f[y * SIZE + SIZE - 1]); inner += Math.abs(f[y * SIZE + 40] - f[y * SIZE + 41]); }
  assert.ok(seam < inner * 2.5 + 0.02 * SIZE, `fbm x seam ${seam.toFixed(3)} vs interior ${inner.toFixed(3)}`);
  for (const v of f) assert.ok(v >= 0 && v <= 1);
  // structured kinds: the left and right columns, and the top and bottom rows, continue each other
  for (const kind of ['concrete', 'stucco', 'sidewalk', 'corrugated']) {
    const m = generate(kind, { size: SIZE, seed: 2 });
    let sx = 0, ix = 0, sy = 0, iy = 0;
    for (let k = 0; k < SIZE; k++) {
      sx += Math.abs(luma(m.color, k * SIZE) - luma(m.color, k * SIZE + SIZE - 1)); ix += Math.abs(luma(m.color, k * SIZE + 50) - luma(m.color, k * SIZE + 51));
      sy += Math.abs(luma(m.color, k) - luma(m.color, (SIZE - 1) * SIZE + k)); iy += Math.abs(luma(m.color, 50 * SIZE + k) - luma(m.color, 51 * SIZE + k));
    }
    assert.ok(sx < ix * 3 + 6 * SIZE && sy < iy * 3 + 6 * SIZE, `${kind}: seams ${sx.toFixed(0)}/${sy.toFixed(0)} vs interior ${ix.toFixed(0)}/${iy.toFixed(0)}`);
  }
  // brick has a mortar joint exactly on the wrap column, so compare the wrap with the same joint three bricks in
  const B = 384, br = generate('brick', { size: B, seed: 2 });
  let wrap = 0, joint = 0;
  for (let y = 0; y < B; y++) { wrap += Math.abs(luma(br.color, y * B) - luma(br.color, y * B + B - 1)); joint += Math.abs(luma(br.color, y * B + 192) - luma(br.color, y * B + 191)); }
  assert.ok(wrap < joint * 1.6 + B && joint < wrap * 1.6 + B, `brick: wrap ${wrap.toFixed(0)} vs interior joint ${joint.toFixed(0)}`);
});

test('texgen: value ranges - normals point out of the surface, roughness is plausible, masks do their job', () => {
  for (const kind of KIND_NAMES) {
    const m = generate(kind, { size: SIZE, seed: 9 });
    let blue = 0, rough = 0, minA = 255, maxA = 0, len = 0;
    for (let i = 0; i < SIZE * SIZE; i++) {
      const nx = m.normal[i * 4] / 127.5 - 1, ny = m.normal[i * 4 + 1] / 127.5 - 1, nz = m.normal[i * 4 + 2] / 127.5 - 1;
      blue += nz; len += Math.hypot(nx, ny, nz); rough += m.orm[i * 4 + 1] / 255;
      minA = Math.min(minA, m.color[i * 4 + 3]); maxA = Math.max(maxA, m.color[i * 4 + 3]);
    }
    const n = SIZE * SIZE;
    assert.ok(blue / n > 0.6, `${kind}: mean normal z ${(blue / n).toFixed(2)}`);
    assert.ok(Math.abs(len / n - 1) < 0.03, `${kind}: unit normals`);
    if (kind === 'chainlink') assert.deepEqual([minA, maxA], [0, 255], 'chain-link has holes');
    else { assert.equal(minA, 255, `${kind} is opaque`); assert.ok(rough / n > 0.4 && rough / n <= 0.98, `${kind}: mean roughness ${(rough / n).toFixed(2)}`); }
  }
  const flat = normalFromHeight(new Float32Array(64).fill(0.3), 8);
  assert.deepEqual([flat[0], flat[1], flat[2]], [127, 127, 255]);
  // asphalt is dark, a sidewalk is clearly lighter, rust makes corrugated metal rougher and browner
  const mean = (m) => { let s = 0; for (let i = 0; i < SIZE * SIZE; i++) s += luma(m.color, i); return s / (SIZE * SIZE); };
  assert.ok(mean(generate('asphalt', { size: SIZE })) < 70 && mean(generate('sidewalk', { size: SIZE })) > 110);
  const clean = generate('corrugated', { size: SIZE, rust: 0 }), rusty = generate('corrugated', { size: SIZE, rust: 1 });
  const g = (m) => { let s = 0; for (let i = 0; i < SIZE * SIZE; i++) s += m.orm[i * 4 + 1]; return s; };
  assert.ok(g(rusty) > g(clean) * 1.15);
  assert.notEqual(sum(generate('stucco', { size: 32, color: 0x7fa0b0 }).color), sum(generate('stucco', { size: 32, color: 0xd9b08a }).color));
});

test('texgen: facades have windows, and some of them are lit', () => {
  for (const style of Object.keys(FACADES)) {
    const m = generate('facade', { size: 256, seed: 4, style });
    assert.ok(m.emissive && m.emissive.length === 256 * 256 * 4, style);
    let litPx = 0, glassPx = 0;
    for (let i = 0; i < 256 * 256; i++) { if (m.emissive[i * 4 + 3]) litPx++; if (m.orm[i * 4 + 1] < 40) glassPx++; }
    const litShare = litPx / (256 * 256), glassShare = glassPx / (256 * 256);
    assert.ok(glassShare > 0.03 && glassShare < 0.6, `${style}: glass covers ${(glassShare * 100).toFixed(1)} %`);
    assert.ok(litShare > 0.004 && litShare < glassShare * 1.2 + 0.05, `${style}: lit ${(litShare * 100).toFixed(1)} %`);
  }
  const dark = generate('facade', { size: 128, style: 'stucco', lit: 0 }), bright = generate('facade', { size: 128, style: 'stucco', lit: 1 });
  assert.equal(dark.emissive.some((v) => v > 0), false);
  assert.ok(bright.emissive.filter((v, i) => i % 4 === 3 && v > 0).length > 128 * 128 * 0.1);
  assert.equal(generate('asphalt', { size: 32 }).emissive, null);
});

test('texgen: fast enough to build at load time', () => {
  const t0 = performance.now();
  for (const kind of ['asphalt', 'brick', 'stucco', 'concrete']) generate(kind, { size: 512 });
  const each = (performance.now() - t0) / 4;
  assert.ok(each < 400, `${each.toFixed(0)} ms per 512 px texture set`);
});
