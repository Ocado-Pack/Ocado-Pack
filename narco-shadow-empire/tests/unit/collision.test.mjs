// Static collision: pure geometry, so the player controller, the camera and the car can rely on tested behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollisionWorld, createCollision } from '../../src/world/collision.js';
import { createContext } from '../../src/core/context.js';
import { createRng } from '../../src/core/rng.js';
import { FACE } from '../../src/core/util.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const R = 0.35, H = 1.8;
/** walk a capsule with gravity for `n` frames toward (vx, vz) m/s */
function walk(col, pos, vx, vz, n, dt = 1 / 60) {
  let p = { ...pos }, vy = 0, last = null;
  for (let i = 0; i < n; i++) { vy -= 20 * dt; last = col.moveCapsule(p, { x: vx * dt, y: vy * dt, z: vz * dt }, R, H); if (last.grounded) vy = 0; p = { x: last.x, y: last.y, z: last.z }; }
  return last;
}

test('collision: ground height, steps and floors above', () => {
  const col = createCollisionWorld();
  assert.equal(col.groundY(0, 0, 0), 0, 'the road is the default floor');
  col.addRect({ x0: 2, x1: 10, z0: -3, z1: 3 }, 0, 0.15);                    // sidewalk slab
  col.addBox(4, 0, -1, 5, 1.1, 1);                                           // crate on it
  const roof = col.addBox(-20, 17.5, -20, 20, 18, 20, { tag: 'roof' });      // a roof far above
  assert.equal(col.groundY(3, 0, 0), 0.15);
  assert.equal(col.groundY(4.5, 0, 0.15), 0.15, 'a 1.1 m crate is not a step');
  assert.equal(col.groundY(4.5, 0, 1.0), 1.1, 'but it is a floor from just below its top');
  assert.equal(col.groundY(0, 0, 1.7), 0, 'the roof is not picked from the street');
  assert.equal(col.groundY(0, 0, 18.2), 18);
  assert.equal(col.groundY(0, 0, 17, 2), 18, 'maxUp');
  roof.setEnabled(false); assert.equal(col.groundY(0, 0, 18.2), 0);
  roof.setEnabled(true); roof.remove(); assert.equal(col.groundY(0, 0, 30), 0);
  assert.equal(col.count, 2); assert.equal(col.all().length, 2);
  // defaults: who is blocked by what
  const curb = col.addBox(0, 0, 10, 5, 0.15, 11).box, wall = col.addBox(0, 0, 12, 5, 3, 12.5).box, bench = col.addBox(0, 0, 14, 2, 0.5, 14.6).box;
  assert.deepEqual([curb.player, curb.vehicle, curb.camera], [true, false, false]);
  assert.deepEqual([wall.player, wall.vehicle, wall.camera], [true, true, true]);
  assert.deepEqual([bench.player, bench.vehicle, bench.camera], [true, true, false]);
});

test('collision: the capsule stops at walls, slides along them and never tunnels', () => {
  const col = createCollisionWorld();
  col.addBox(5, 0, -10, 5.2, 3, 10);                                         // thin wall, east of the start
  let r = walk(col, { x: 0, y: 0, z: 0 }, 5, 0, 120);
  assert.ok(near(r.x, 5 - R, 1e-3) && r.hitWall && r.grounded, `stopped at the wall: x = ${r.x}`);
  r = col.moveCapsule({ x: 0, y: 0, z: 0 }, { x: 40, y: 0, z: 0 }, R, H);    // one huge step
  assert.ok(r.x <= 5 - R + 1e-3, `no tunnelling: x = ${r.x}`);
  r = walk(col, { x: 4.6, y: 0, z: 0 }, 3, 3, 60);                           // pushing diagonally into the wall
  assert.ok(near(r.x, 5 - R, 1e-3) && r.z > 2.9, `slides along it: z = ${r.z}`);
  // a corner does not trap the capsule
  col.addBox(-10, 0, 5, 5, 3, 5.2);
  r = walk(col, { x: 4, y: 0, z: 4 }, 4, 4, 60);
  assert.ok(near(r.x, 5 - R, 2e-3) && near(r.z, 5 - R, 2e-3));
  // starting inside a box gets pushed out through the nearest side
  r = col.moveCapsule({ x: 5.1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, R, H);
  assert.ok(r.x >= 5.2 + R - 1e-6 || r.x <= 5 - R + 1e-6);
});

test('collision: steps, edges, landing and ceilings', () => {
  const col = createCollisionWorld();
  col.addRect({ x0: 2, x1: 6, z0: -5, z1: 5 }, 0, 0.15, { tag: 'sidewalk' });
  col.addBox(8, 0, -5, 12, 0.6, 5, { tag: 'dock' });                         // too high to step onto
  let r = walk(col, { x: 0, y: 0, z: 0 }, 3, 0, 60);
  assert.ok(r.x > 2.5 && near(r.y, 0.15), `stepped up the curb: y = ${r.y}`);
  r = walk(col, { x: 3, y: 0.15, z: 0 }, 3, 0, 240);
  assert.ok(near(r.x, 8 - R, 1e-3) && near(r.y, 0, 1e-6), `left the sidewalk, stopped by the dock: x = ${r.x}, y = ${r.y}`);
  // jump onto the dock: rise, move in, land on top
  let p = { x: 7.4, y: 0, z: 0 }, vy = 6, landed = null;
  for (let i = 0; i < 120 && !landed; i++) { vy -= 20 / 60; const m = col.moveCapsule(p, { x: 2.5 / 60, y: vy / 60, z: 0 }, R, H); p = m; if (m.grounded && i > 3) landed = m; }
  assert.ok(landed && near(landed.y, 0.6) && landed.x > 8, `landed on the dock: ${JSON.stringify(landed)}`);
  // walking off the dock falls back to the road
  r = walk(col, { x: 11.5, y: 0.6, z: 0 }, 3, 0, 120);
  assert.ok(r.x > 12.3 && near(r.y, 0) && r.grounded);
  // a low ceiling stops a jump
  col.addBox(-6, 2.2, -2, -2, 2.6, 2, { tag: 'awning' });
  const j = col.moveCapsule({ x: -4, y: 0, z: 0 }, { x: 0, y: 1.0, z: 0 }, R, H);
  assert.ok(j.hitHead && near(j.y, 2.2 - H), `head stops under the awning: y = ${j.y}`);
  assert.equal(col.moveCapsule({ x: -8, y: 0, z: 0 }, { x: 0, y: 1.0, z: 0 }, R, H).hitHead, false);
});

test('collision: walls with door openings and lintels', () => {
  const col = createCollisionWorld();
  const room = { x0: 0, x1: 10, z0: 0, z1: 8 };
  const made = col.addWalls(room, 0, 3, 0.4, [{ side: 'N', at: 5, width: 1.2, height: 2.2 }, { side: 'E', at: 4, width: 2 }]);
  assert.equal(made.length, 4 + 1 + 1 + 1, 'N splits in two + lintel, E splits in two, S and W are whole');
  // through the north door (z0 side): from outside (z < 0) to inside
  let r = walk(col, { x: 5, y: 0, z: -2 }, 0, 3, 120);
  assert.ok(r.z > 1.5, `walked in through the door: z = ${r.z}`);
  r = walk(col, { x: 2, y: 0, z: -2 }, 0, 3, 120);
  assert.ok(near(r.z, -R, 1e-3), 'the wall beside the door is solid');
  // a 2.5 m tall thing does not fit under the 2.2 m lintel, a 1.8 m person does
  assert.equal(col.sweepCircleXZ(5, -2, 5, 2, R, 0.4, 2.5).hit, true);
  assert.equal(col.sweepCircleXZ(5, -2, 5, 2, R, 0.4, 1.8).hit, false);
  // the east opening has no lintel and is 2 m wide
  r = walk(col, { x: 8, y: 0, z: 4 }, 3, 0, 120);
  assert.ok(r.x > 11, 'out through the east opening');
  made.forEach((h) => h.remove()); assert.equal(col.count, 0);
});

test('collision: raycast returns the nearest face, its normal, and respects masks', () => {
  const col = createCollisionWorld();
  col.addBox(4, 0, -1, 5, 3, 1, { tag: 'wall' });
  col.addBox(2, 0, -0.5, 2.5, 1, 0.5, { tag: 'crate' });                     // 1 m tall: the camera ignores it
  const o = { x: 0, y: 0.5, z: 0 }, east = { x: 3, y: 0, z: 0 };
  let h = col.raycast(o, east, 10);
  assert.ok(near(h.distance, 2) && h.handle.box.tag === 'crate'); assert.deepEqual(h.normal, { x: -1, y: 0, z: 0 });
  h = col.raycast(o, east, 10, 'camera');
  assert.ok(near(h.distance, 4) && h.handle.box.tag === 'wall' && near(h.point.x, 4));
  assert.equal(col.raycast(o, east, 1.5), null, 'too short');
  assert.equal(col.raycast(o, { x: -1, y: 0, z: 0 }, 50), null);
  assert.equal(col.raycast({ x: 0, y: 5, z: 0 }, east, 50), null, 'passes above');
  h = col.raycast({ x: 4.5, y: 6, z: 0 }, { x: 0, y: -1, z: 0 }, 10);
  assert.ok(near(h.distance, 3)); assert.deepEqual(h.normal, { x: 0, y: 1, z: 0 });
  h = col.raycast({ x: 4.5, y: 0.5, z: -4 }, { x: 0.2, y: 0, z: 4 }, 20);    // slanted onto the north face (z = -1) at x = 4.65
  assert.ok(h.handle.box.tag === 'wall' && near(h.point.z, -1) && near(h.point.x, 4.65)); assert.deepEqual(h.normal, { x: 0, y: 0, z: -1 });
  h = col.raycast({ x: 0, y: 0.5, z: -4 }, { x: 4.5, y: 0, z: 4 }, 20);      // this diagonal reaches x = 4 first (at z = -0.44): west face
  assert.ok(h.handle.box.tag === 'wall' && near(h.point.x, 4)); assert.deepEqual(h.normal, { x: -1, y: 0, z: 0 });
  assert.equal(col.raycast({ x: 4.5, y: 1, z: 0 }, east, 5).distance, 0, 'starting inside reports distance 0');
  assert.equal(col.raycast(o, { x: 0, y: 0, z: 0 }, 5), null);
});

test('collision: the car (oriented box) is pushed out of walls but rolls over curbs', () => {
  const col = createCollisionWorld();
  col.addBox(10, 0, -20, 10.5, 3, 20, { tag: 'wall' });
  col.addRect({ x0: -20, x1: 20, z0: 6, z1: 9 }, 0, 0.15, { tag: 'sidewalk' });
  const HL = 2.3, HW = 0.95;
  let r = col.resolveBoxXZ(8.5, 0, HL, HW, FACE.E, 0.1, 1.5);                // nose 0.8 m into the wall
  assert.ok(r.hit && near(r.x, 10 - HL, 1e-6) && near(r.z, 0) && r.nx === -1, JSON.stringify(r));
  assert.equal(col.resolveBoxXZ(5, 0, HL, HW, FACE.E, 0.1, 1.5).hit, false);
  r = col.resolveBoxXZ(9.5, 0, HL, HW, FACE.N, 0.1, 1.5);                     // side-on: only the half width counts
  assert.ok(r.hit && near(r.x, 10 - HW, 1e-6));
  r = col.resolveBoxXZ(8.6, 0, HL, HW, FACE.E + 0.5, 0.1, 1.5);               // rotated: a corner is inside
  assert.ok(r.hit && r.x < 8.6);
  const again = col.resolveBoxXZ(r.x, r.z, HL, HW, FACE.E + 0.5, 0.1, 1.5);
  assert.ok(!again.hit || Math.hypot(again.x - r.x, again.z - r.z) < 1e-6, 'resolved in one call');
  assert.equal(col.resolveBoxXZ(0, 7.5, HL, HW, FACE.E, 0.1, 1.5).hit, false, 'a sidewalk does not stop the car');
});

test('collision: the spatial hash agrees with brute force', () => {
  const col = createCollisionWorld(), rng = createRng(77), list = [];
  for (let i = 0; i < 400; i++) {
    const x = rng.float(-100, 100), z = rng.float(-100, 100), w = rng.float(0.2, 30), d = rng.float(0.2, 30), y0 = rng.float(0, 6), h = rng.float(0.1, 12);
    list.push(col.addBox(x, y0, z, x + w, y0 + h, z + d).box);
  }
  for (let i = 0; i < 2000; i++) {
    const x = rng.float(-110, 140), z = rng.float(-110, 140), from = rng.float(0, 20);
    let want = 0;
    for (const b of list) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= from + 0.4 && b.y1 > want) want = b.y1;
    assert.equal(col.groundY(x, z, from), want);
  }
  for (let i = 0; i < 300; i++) {
    const o = { x: rng.float(-100, 100), y: rng.float(0, 10), z: rng.float(-100, 100) }, a = rng.float(0, Math.PI * 2), d = { x: Math.cos(a), y: rng.float(-0.3, 0.3), z: Math.sin(a) }, len = Math.hypot(d.x, d.y, d.z);
    const got = col.raycast(o, d, 60);
    let want = Infinity;
    for (const b of list) {                                                   // slab test, written independently
      let t0 = 0, t1 = 60, ok = true;
      for (const [p, v, lo, hi] of [[o.x, d.x / len, b.x0, b.x1], [o.y, d.y / len, b.y0, b.y1], [o.z, d.z / len, b.z0, b.z1]]) {
        if (Math.abs(v) < 1e-12) { if (p < lo || p > hi) ok = false; continue; }
        const ta = Math.min((lo - p) / v, (hi - p) / v), tb = Math.max((lo - p) / v, (hi - p) / v);
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) ok = false;
      }
      if (ok && t0 < want) want = t0;
    }
    if (want === Infinity) assert.equal(got, null); else assert.ok(got && near(got.distance, want, 1e-9), `ray ${i}: ${got && got.distance} vs ${want}`);
  }
});

test('collision: registers as ctx.collision; missing system stays a safe null object elsewhere', () => {
  const ctx = createContext({ params: { test: '1' } });
  assert.equal(ctx.collision.groundY(0, 0, 0), undefined, 'null object before registration');
  const col = createCollision(ctx);
  assert.equal(ctx.has('collision'), true); assert.equal(ctx.collision, col);
  let seen = null; ctx.events.on('collision:debug', (e) => { seen = e.on; });
  col.debug(true); assert.equal(seen, true); assert.equal(col.debugOn, true);
  col.addBox(0, 0, 0, 1, 1, 1); assert.equal(ctx.collision.groundY(0.5, 0.5, 1), 1);
  col.clear(); assert.equal(col.count, 0);
});
