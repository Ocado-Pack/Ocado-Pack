import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext, makeNullSystem } from '../../src/core/context.js';
import { createRng, hashString } from '../../src/core/rng.js';
import { createStorage } from '../../src/core/storage.js';
import { L, pickLang, fillL } from '../../src/core/ltext.js';
import { FACE, yawToForward, forwardToYaw, wrapAngle, dayKey, daysBetween } from '../../src/core/util.js';
import { ANCHORS, STATIONS, HOTEL, GARAGE, WAREHOUSE, ZONES } from '../../src/world/layout.js';

test('rng is deterministic and in range', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
  const r = createRng('seed');
  for (let i = 0; i < 1000; i++) { const v = r.int(3, 7); assert.ok(v >= 3 && v <= 7 && Number.isInteger(v)); }
  assert.equal(hashString('abc'), hashString('abc'));
  assert.deepEqual(createRng(7).shuffle([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
});

test('storage falls back to memory when the backend throws', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  const s = createStorage('t', bad);
  assert.equal(s.usingFallback, true);
  s.set('k', { a: 1 });
  assert.deepEqual(s.get('k'), { a: 1 });
  assert.equal(s.get('missing', 5), 5);
  // backend that fails later (quota) must not lose data
  const store = new Map(); let fail = false;
  const flaky = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { if (fail) throw new Error('quota'); store.set(k, v); }, removeItem: (k) => store.delete(k) };
  const s2 = createStorage('t2', flaky);
  assert.equal(s2.persistent, true);
  fail = true; s2.set('x', 9);
  assert.equal(s2.get('x'), 9);
});

test('ltext helpers', () => {
  assert.equal(pickLang(L('a', 'b'), 'es'), 'b');
  assert.equal(pickLang(L('a'), 'es'), 'a');
  assert.deepEqual(fillL(L('{n} cases', '{n} cajas'), { n: 4 }), { en: '4 cases', es: '4 cajas' });
});

test('yaw convention', () => {
  const n = yawToForward(FACE.N), e = yawToForward(FACE.E), s = yawToForward(FACE.S), w = yawToForward(FACE.W);
  assert.ok(Math.abs(n.x) < 1e-9 && Math.abs(n.z + 1) < 1e-9);
  assert.ok(Math.abs(e.x - 1) < 1e-9 && Math.abs(e.z) < 1e-9);
  assert.ok(Math.abs(s.z - 1) < 1e-9);
  assert.ok(Math.abs(w.x + 1) < 1e-9);
  assert.ok(Math.abs(wrapAngle(forwardToYaw(1, 0)) - FACE.E) < 1e-9);
  assert.equal(daysBetween('2026-01-30', '2026-02-02'), 3);
  assert.match(dayKey(0), /^\d{4}-\d{2}-\d{2}$/);
});

test('context: null systems are safe, register replaces them, flow gates input', () => {
  const ctx = createContext({ params: { test: '1' } });
  assert.equal(ctx.has('ui'), false);
  assert.equal(ctx.ui.hud.setObjective('x'), undefined);
  assert.equal(makeNullSystem('x').then, undefined);
  let ticks = 0;
  ctx.register('player', { update() { ticks++; } }, { order: 20 });
  assert.equal(ctx.has('player'), true);
  ctx.loop.step(1 / 60);
  assert.equal(ticks, 0, 'sim systems do not run outside world mode');
  ctx.flow.setMode('world');
  ctx.loop.step(1 / 60);
  assert.equal(ticks, 1);
  assert.equal(ctx.flow.worldInput, true);
  const close = ctx.flow.pushModal('puzzle');
  assert.equal(ctx.flow.worldInput, false);
  assert.equal(ctx.flow.simPaused, false);
  const closePause = ctx.flow.pushModal('pause', { pausesSim: true });
  assert.equal(ctx.flow.simPaused, true);
  closePause(); close();
  assert.equal(ctx.flow.worldInput, true);
  assert.equal(ctx.loop.fastForward(1), 60);
});

test('settings: presets, change events, custom detection', () => {
  const ctx = createContext({ params: { test: '1' } });
  const seen = [];
  ctx.settings.onChange('*', (v, k) => seen.push(k));
  ctx.settings.applyQuality('low');
  assert.equal(ctx.settings.get('quality'), 'low');
  assert.equal(ctx.settings.get('bloom'), false);
  ctx.settings.set('bloom', true);
  assert.equal(ctx.settings.get('quality'), 'custom');
  assert.ok(seen.includes('bloom'));
});

test('layout: every station has an anchor inside its building, anchors are sane', () => {
  for (const [id, st] of Object.entries(STATIONS)) assert.ok(ANCHORS[st.anchor], `station ${id} -> anchor ${st.anchor}`);
  const inside = (r, [x, , z]) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
  for (const id of ['ops.terminal', 'ops.table', 'ops.board', 'ops.analyst', 'ops.drills', 'ops.exam', 'ops.entry']) assert.ok(inside(HOTEL.ops, ANCHORS[id].pos), id);
  for (const id of ['hotel.lobby', 'hotel.reception', 'hotel.elevator']) assert.ok(inside(HOTEL.lobby, ANCHORS[id].pos), id);
  for (const id of ['garage.bay1', 'garage.log', 'garage.diag', 'garage.chart', 'garage.mechanic']) assert.ok(inside(GARAGE.interior, ANCHORS[id].pos), id);
  for (const id of ['warehouse.clipboard', 'warehouse.rackA', 'warehouse.rackB', 'warehouse.rackC', 'warehouse.drums', 'warehouse.clerk']) assert.ok(inside(WAREHOUSE.interior, ANCHORS[id].pos), id);
  assert.ok(inside(WAREHOUSE.cage, ANCHORS['warehouse.terminal'].pos));
  assert.ok(inside(WAREHOUSE.office, ANCHORS['warehouse.ledger'].pos) && inside(WAREHOUSE.office, ANCHORS['warehouse.cabinet'].pos));
  assert.ok(inside(HOTEL.roof, ANCHORS['roof.scope'].pos) && inside(HOTEL.roof, ANCHORS['roof.rangefinder'].pos));
  for (const z of Object.values(ZONES)) assert.ok(z.rect.x0 < z.rect.x1 && z.rect.z0 < z.rect.z1);
});
