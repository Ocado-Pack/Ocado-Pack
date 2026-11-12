// The feel of the character controller, pinned down against the real collision world.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollisionWorld } from '../../src/world/collision.js';
import { createMotion, MOVE } from '../../src/world/motion.js';
import { FACE } from '../../src/core/util.js';

const DT = 1 / 60, near = (a, b, eps) => Math.abs(a - b) <= eps;
/** run `seconds` of simulation; `cmd` may be a function of the frame index; returns every event seen */
function run(m, seconds, cmd) {
  const all = [];
  for (let i = 0, n = Math.round(seconds / DT); i < n; i++) for (const e of m.step(DT, typeof cmd === 'function' ? cmd(i) : cmd)) all.push({ ...e, frame: i });
  return all;
}

test('motion: walk and run speeds, camera-relative directions, stopping, body turn', () => {
  const m = createMotion(createCollisionWorld());
  run(m, 1.5, { moveY: 1, cameraYaw: FACE.N });
  assert.ok(near(m.speed, MOVE.walk, 0.03) && m.velocity.z < -1.7 && m.state === 'walk', `walk north: ${m.speed}`);
  assert.ok(Math.abs(m.yaw - FACE.N) < 0.05, 'the body faces where it walks');
  run(m, 1.5, { moveY: 1, cameraYaw: FACE.N, run: true });
  assert.ok(near(m.speed, MOVE.run, 0.05) && m.state === 'run', `run: ${m.speed}`);
  run(m, 0.6, {});
  assert.ok(m.speed < 0.05 && m.state === 'idle', `stops within 0.6 s: ${m.speed}`);
  const x0 = m.position.x;
  run(m, 1, { moveY: 1, cameraYaw: FACE.E });
  assert.ok(m.position.x > x0 + 1.2 && Math.abs(m.yaw - FACE.E) < 0.1, 'forward with the camera facing east is +X');
  const z0 = m.position.z;
  run(m, 1, { moveX: 1, cameraYaw: FACE.E });
  assert.ok(m.position.z > z0 + 1.0, 'strafing right while facing east is +Z (south)');
  run(m, 0.6, {}); run(m, 1.5, { moveX: 0.5, moveY: 0, cameraYaw: FACE.N });
  assert.ok(near(m.speed, MOVE.walk * 0.5, 0.04), 'half stick, half speed');
  run(m, 1.5, { moveX: 1, moveY: 1, cameraYaw: FACE.N, run: true });
  assert.ok(near(m.speed, MOVE.run, 0.06), 'diagonal is not faster');
});

test('motion: jump reaches about one metre, lands once, cannot be repeated in the air', () => {
  const m = createMotion(createCollisionWorld());
  let apex = 0;
  const ev = run(m, 1.2, (i) => { apex = Math.max(apex, m.position.y); return { jump: i === 0 || i === 10 }; });
  assert.ok(apex > 0.9 && apex < 1.08, `apex ${apex.toFixed(3)} m`);
  assert.deepEqual(ev.map((e) => e.type), ['jump', 'land']);
  assert.ok(ev[1].speed > 5 && m.grounded && m.position.y === 0);
  assert.equal(run(m, 0.3, {}).length, 0);
});

test('motion: coyote time and jump buffering', () => {
  const col = createCollisionWorld();
  col.addBox(-5, 0, -2, 0, 3, 2, { tag: 'metal platform' });                 // 3 m: the fall lasts half a second
  const m = createMotion(col);
  m.teleport(-0.4, 3, 0, FACE.E);
  let left = -1;
  const ev = run(m, 1.0, (i) => { if (left < 0 && !m.grounded) left = i; return { moveY: 1, cameraYaw: FACE.E, run: true, jump: left >= 0 && i === left + 4 }; });
  assert.ok(left > 0 && ev.some((e) => e.type === 'jump'), 'jumping 4 frames after leaving the edge still works');
  // too late: 15 frames after the edge (and 16 before the ground) there is no jump, in the air or on landing
  m.teleport(-0.4, 3, 0, FACE.E); left = -1;
  const late = run(m, 1.0, (i) => { if (left < 0 && !m.grounded) left = i; return { moveY: 1, cameraYaw: FACE.E, run: true, jump: left >= 0 && i === left + 15 }; });
  assert.equal(late.some((e) => e.type === 'jump'), false);
  // buffer: pressing jump 5 frames before touching down jumps on landing
  m.teleport(3, 2.5, 0, 0);
  let pressAt = -1, jumps = 0;
  for (let i = 0; i < 200; i++) {
    const willLandSoon = !m.grounded && m.position.y < 0.45 && m.velocity.y < 0 && pressAt < 0;
    if (willLandSoon) pressAt = i;
    for (const e of m.step(DT, { jump: i === pressAt })) if (e.type === 'jump') jumps++;
  }
  assert.ok(pressAt > 0 && jumps === 1, `buffered jump: pressed at frame ${pressAt}, jumps ${jumps}`);
});

test('motion: crouching is lower and slower, and you cannot stand up under a beam', () => {
  const col = createCollisionWorld();
  col.addBox(4, 1.4, -3, 8, 1.7, 3, { tag: 'beam' });                        // clearance 1.4 m
  const m = createMotion(col);
  run(m, 2.5, { moveY: 1, cameraYaw: FACE.E });
  assert.ok(m.position.x < 4 - MOVE.radius + 0.01, `standing, the beam stops you: x = ${m.position.x}`);
  run(m, 0.2, (i) => ({ crouchToggle: i === 0 }));
  assert.deepEqual([m.crouching, m.height, m.state], [true, MOVE.crouchHeight, 'crouch']);
  run(m, 2, { moveY: 1, cameraYaw: FACE.E, run: true });
  assert.ok(m.position.x > 4.5 && near(m.speed, MOVE.crouchWalk, 0.03) && m.state === 'crouchwalk', `crawls under it at ${m.speed} m/s`);
  run(m, 0.1, (i) => ({ crouchToggle: i === 0 }));
  assert.equal(m.crouching, true, 'no room to stand up');
  assert.equal(run(m, 0.3, { jump: true }).some((e) => e.type === 'jump'), false, 'no jumping while crouched');
  run(m, 4.5, { moveY: 1, cameraYaw: FACE.E });
  assert.ok(m.position.x > 8.4);
  run(m, 0.1, (i) => ({ crouchToggle: i === 0 }));
  assert.equal(m.crouching, false, 'stands up once clear');
  run(m, 0.2, { crouchHold: true }); assert.equal(m.crouching, true);
  run(m, 0.2, { crouchHold: false }); assert.equal(m.crouching, false, 'hold-to-crouch releases');
});

test('motion: footsteps by distance and surface; curbs are climbed, walls stop you', () => {
  const col = createCollisionWorld();
  col.addRect({ x0: 6, x1: 30, z0: -4, z1: 4 }, 0, 0.15, { tag: 'metal deck' });
  col.addBox(20, 0, -4, 20.4, 3, 4, { tag: 'wall' });
  const m = createMotion(col);
  const walk = run(m, 3, { moveY: 1, cameraYaw: FACE.E }).filter((e) => e.type === 'step');
  assert.ok(Math.abs(walk.length - Math.floor(m.position.x / MOVE.strideWalk)) <= 1, `${walk.length} steps over ${m.position.x.toFixed(2)} m`);
  assert.ok(walk.every((e) => e.surface === 'concrete' && e.running === false));
  const more = run(m, 4, { moveY: 1, cameraYaw: FACE.E, run: true }).filter((e) => e.type === 'step');
  assert.ok(m.position.y === 0.15 && more.at(-1).surface === 'metal' && more.at(-1).running === true, 'up the curb onto the metal deck, running');
  assert.ok(near(m.position.x, 20 - MOVE.radius, 0.01), `stopped by the wall: x = ${m.position.x}`);
  const before = m.position.x;
  assert.equal(run(m, 1, { moveY: 1, cameraYaw: FACE.E, run: true }).filter((e) => e.type === 'step').length, 0, 'no footsteps while pushing against a wall');
  assert.ok(near(m.position.x, before, 1e-3));
  m.teleport(1, 0, 1, FACE.S); assert.deepEqual([m.speed, m.state, m.yaw], [0, 'idle', FACE.S]);
  assert.equal(m.step(0, { moveY: 1 }).length, 0);
});
