// Input state machine and zones: both are pure, so the rules the player controller relies on are tested in Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from '../../src/core/context.js';
import { createInput, ACTIONS } from '../../src/core/input.js';
import { createZones } from '../../src/world/zones.js';
import { ZONES } from '../../src/world/layout.js';

const world = () => { const ctx = createContext({ params: { test: '1' } }); ctx.flow.setMode('world'); return ctx; };
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('input: movement from keys, gated by the flow, never longer than 1', () => {
  const ctx = createContext({ params: { test: '1' } }), input = createInput(ctx);
  assert.equal(ctx.has('input'), true);
  input.handleKey('KeyW', true);
  assert.deepEqual({ ...input.move }, { x: 0, y: 0 }, 'no movement outside world mode');
  ctx.flow.setMode('world');
  assert.deepEqual({ ...input.move }, { x: 0, y: 1 });
  input.handleKey('KeyD', true);
  assert.ok(near(Math.hypot(input.move.x, input.move.y), 1) && input.move.x > 0.7 && input.move.y > 0.7, 'diagonal is normalised');
  input.handleKey('ArrowLeft', true);
  assert.ok(near(input.move.x, 0), 'opposite keys cancel');
  input.handleKey('ArrowUp', true); input.handleKey('KeyW', false);
  assert.equal(input.move.y, 1, 'two keys for one direction: releasing one keeps it held');
  const close = ctx.flow.pushModal('puzzle');
  assert.deepEqual({ ...input.move }, { x: 0, y: 0 }, 'a panel takes the input');
  close();
  assert.equal(input.move.y, 1);
  assert.equal(input.handleKey('F13', true), false, 'unknown keys are not ours');
});

test('input: press / release edges last one frame; auto-repeat is ignored; Space is jump and handbrake', () => {
  const ctx = world(), input = createInput(ctx), seen = [];
  ctx.events.on('input:action', (e) => seen.push(e.action + ':' + e.device));
  input.handleKey('Space', true);
  assert.deepEqual([input.pressed('jump'), input.down('jump'), input.pressed('handbrake'), input.released('jump')], [true, true, true, false]);
  input.handleKey('Space', true);                                    // key repeat
  assert.deepEqual(seen, ['jump:keyboard', 'handbrake:keyboard']);
  input.endFrame();
  assert.deepEqual([input.pressed('jump'), input.down('jump')], [false, true], 'held, but no longer "just pressed"');
  input.handleKey('Space', false);
  assert.deepEqual([input.released('jump'), input.down('jump')], [true, false]);
  input.endFrame();
  assert.equal(input.released('jump'), false);
  input.handleKey('ShiftLeft', true); input.handleKey('ShiftRight', true); input.handleKey('ShiftLeft', false);
  assert.equal(input.down('run'), true); assert.equal(input.released('run'), false);
  for (const a of ACTIONS) assert.equal(typeof input.down(a), 'boolean');
  assert.deepEqual([input.label('interact'), input.label('vehicle'), input.label('pause'), input.label('nope')], ['E', 'F', 'Esc', '']);
});

test('input: gameplay actions are blocked while a panel is open, interface actions are not', () => {
  const ctx = world(), input = createInput(ctx), seen = [];
  ctx.events.on('input:action', (e) => seen.push(e.action));
  const close = ctx.flow.pushModal('puzzle');
  input.handleKey('KeyE', true); input.handleKey('Escape', true); input.handleKey('Enter', true);
  assert.deepEqual([input.pressed('interact'), input.down('interact'), input.pressed('pause'), input.pressed('skip')], [false, false, true, true]);
  assert.deepEqual(seen, ['interact', 'pause', 'skip'], 'the event always fires: the UI decides');
  close();
  assert.equal(input.pressed('interact'), true, 'same frame, panel closed');
  input.releaseAll(); input.endFrame();
  assert.deepEqual([input.down('interact'), input.down('pause')], [false, false]);
});

test('input: mouse look, wheel, virtual stick and taps', () => {
  const ctx = world(), input = createInput(ctx);
  ctx.settings.set('mouseSens', 2);
  input.handleMouseMove(10, -4); input.handleMouseMove(5, 1); input.handleWheel(-120); input.handleWheel(-120);
  assert.deepEqual([input.look.dx, input.look.dy, input.zoom, input.lastDevice], [30, -6, -2, 'mouse']);
  input.endFrame();
  assert.deepEqual([input.look.dx, input.look.dy, input.zoom], [0, 0, 0]);
  input.setVirtual({ moveX: 0.5, moveY: 2, lookDX: 7, down: { run: true } });
  assert.ok(near(Math.hypot(input.move.x, input.move.y), 1) && input.move.y > 0.9, 'virtual stick is clamped');
  assert.deepEqual([input.look.dx, input.down('run'), input.pressed('run'), input.lastDevice, input.label('interact')], [7, true, true, 'touch', '']);
  input.endFrame();
  assert.deepEqual([input.look.dx, input.down('run'), input.move.y > 0.9], [0, true, true], 'look lasts a frame; stick and buttons stay');
  input.setVirtual({ moveX: 0, moveY: 0, down: { run: false } });
  assert.deepEqual([input.released('run'), input.down('run'), input.move.y], [true, false, 0]);
  input.endFrame();
  input.tap('interact', 'test');
  assert.deepEqual([input.pressed('interact'), input.down('interact')], [true, true]);
  input.endFrame();
  assert.deepEqual([input.pressed('interact'), input.down('interact')], [false, false]);
  assert.equal(typeof input.attach(), 'function', 'attach is harmless without a browser');
  ctx.loop.step(1 / 60);                                               // the loop calls endFrame without complaint
});

test('zones: enter / exit with hysteresis, smoothed indoor factor, layout zones', () => {
  const ctx = world(), p = { x: 0, y: 0, z: 0 }, zones = createZones(ctx, { probe: () => p }), log = [];
  ctx.events.on('zone:enter', (e) => log.push('+' + e.id)); ctx.events.on('zone:exit', (e) => log.push('-' + e.id));
  zones.add({ id: 'hall', rect: { x0: 10, x1: 30, z0: -5, z1: 5 }, y0: 0, y1: 9, indoor: true, ambience: 'warehouse' });
  zones.add({ id: 'office', rect: { x0: 24, x1: 30, z0: 0, z1: 5 }, y0: 0, y1: 3, indoor: true, ambience: 'office' });
  zones.add({ id: 'yard', rect: { x0: -10, x1: 10, z0: -20, z1: 20 }, indoor: false, ambience: 'yard' });
  zones.update(0.016);
  assert.deepEqual([[...zones.current], zones.indoor, zones.ambience], [['yard'], 0, 'yard']);
  p.x = 12; zones.update(0.1);
  assert.deepEqual(log, ['+yard', '+hall', '-yard']);
  assert.ok(zones.indoor > 0.2 && zones.indoor < 0.6, `indoor eases in: ${zones.indoor}`);
  for (let i = 0; i < 60; i++) zones.update(1 / 60);
  assert.ok(zones.indoor > 0.98, `nearly there after a second: ${zones.indoor}`);
  for (let i = 0; i < 60; i++) zones.update(1 / 60);
  assert.equal(zones.indoor, 1, 'and exactly 1 within two');
  p.x = 9.8; zones.update(0.016);                                      // 0.2 m outside the hall: still inside (hysteresis), yard entered
  assert.deepEqual([zones.isInside('hall'), zones.isInside('yard')], [true, true]);
  p.x = 9.5; zones.update(0.016);
  assert.equal(zones.isInside('hall'), false);
  p.x = 26; p.z = 2; zones.update(0, true);
  assert.deepEqual([[...zones.current].sort(), zones.indoor, zones.ambience], [['hall', 'office'], 1, 'office'], 'the smaller zone names the ambience');
  p.y = 5; zones.update(0.016);
  assert.equal(zones.isInside('office'), false, 'zones have a height');
  zones.remove('hall'); assert.equal(log.at(-1), '-hall'); assert.equal(zones.get('hall'), null);
  // the layout table registers as it is; a point on the hotel roof is outdoors, the lobby below it indoors
  const z2 = createZones(world(), { probe: () => q }), q = { x: -4, y: 18.2, z: -60 };
  z2.addAll(ZONES); assert.equal(z2.all().length, Object.keys(ZONES).length);
  z2.update(0, true); assert.deepEqual([[...z2.current], z2.indoor], [['hotel.roof'], 0]);
  q.y = 0.15; z2.update(0, true); assert.deepEqual([[...z2.current], z2.indoor], [['hotel.lobby'], 1]);
  // no player, no camera, no probe: nothing happens and nothing throws
  const z3 = createZones(world()); z3.add({ id: 'a', rect: { x0: 0, x1: 1, z0: 0, z1: 1 } }); z3.update(0.1); assert.equal(z3.current.size, 0);
});
