// ctx.collision - static world collision (docs/ARCHITECTURE.md section 5). Pure module: no three.js, no DOM, so the
// whole thing is unit-tested in Node. The city is axis-aligned, so every collider is an axis-aligned box; boxes live
// in a spatial hash (8 m cells), and every box top is a walkable floor.
//
//   const col = createCollision(ctx);                         // registers ctx.collision
//   col.addBox(x0, y0, z0, x1, y1, z1, { tag: 'crate' });     col.addWalls(rect, 0, 9, 0.5, [{ side: 'N', at: 6, width: 1.2, height: 2.2 }]);
//   const p = col.moveCapsule(pos, delta, 0.35, 1.8);         // player: slide along walls, step up 0.4 m, land, bump the head
//   col.raycast(origin, dir, 6, 'camera')                     col.resolveBoxXZ(x, z, 2.3, 0.95, yaw, 0.1, 1.5)   // the car
//
// Who a box blocks: `player` (default true), `vehicle` (default: its top is more than 0.3 m above the road, so curbs
// and sidewalks do not stop a car), `camera` (default: it is at least 1.5 m tall).

const CELL = 8, STEP_UP = 0.4, EPS = 1e-6;
const key = (cx, cz) => (cx + 8192) * 16384 + (cz + 8192);

/** The collision world without a context (tests, tools). */
export function createCollisionWorld() {
  const cells = new Map(), boxes = new Set(), found = [];
  let stamp = 0;

  const insert = (b) => { for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) for (let cz = Math.floor(b.z0 / CELL); cz <= Math.floor(b.z1 / CELL); cz++) { const k = key(cx, cz); let c = cells.get(k); if (!c) cells.set(k, (c = [])); c.push(b); } };
  const unlink = (b) => { for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) for (let cz = Math.floor(b.z0 / CELL); cz <= Math.floor(b.z1 / CELL); cz++) { const c = cells.get(key(cx, cz)); if (c) { const i = c.indexOf(b); if (i >= 0) c.splice(i, 1); } } };
  /** Enabled boxes of `mask` whose XZ footprint touches the rectangle. Returns a shared array: use it before the next query. */
  function query(x0, z0, x1, z1, mask) {
    found.length = 0; stamp++;
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
      const c = cells.get(key(cx, cz));
      if (!c) continue;
      for (let i = 0; i < c.length; i++) { const b = c[i]; if (b.stamp !== stamp && b.enabled && b[mask] && b.x1 >= x0 && b.x0 <= x1 && b.z1 >= z0 && b.z0 <= z1) { b.stamp = stamp; found.push(b); } }
    }
    return found;
  }

  function addBox(x0, y0, z0, x1, y1, z1, o = {}) {
    const b = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), tag: o.tag || '', enabled: o.enabled !== false, stamp: 0 };
    b.player = o.player !== false; b.vehicle = o.vehicle === undefined ? b.y1 > 0.3 : !!o.vehicle; b.camera = o.camera === undefined ? b.y1 - b.y0 >= 1.5 : !!o.camera;
    boxes.add(b); insert(b);
    return { box: b, setEnabled(on) { b.enabled = !!on; }, remove() { if (boxes.delete(b)) unlink(b); } };
  }

  /** Push a circle out of every blocking box (XZ only). Returns true when it was pushed. */
  function pushOut(p, radius, yMin, yMax, mask) {
    let hit = false;
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      const list = query(p.x - radius, p.z - radius, p.x + radius, p.z + radius, mask);
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        if (b.y1 <= yMin + EPS || b.y0 >= yMax - EPS) continue;
        const qx = p.x < b.x0 ? b.x0 : p.x > b.x1 ? b.x1 : p.x, qz = p.z < b.z0 ? b.z0 : p.z > b.z1 ? b.z1 : p.z;
        let dx = p.x - qx, dz = p.z - qz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > EPS) { const d = Math.sqrt(d2), k = (radius - d) / d; p.x += dx * k; p.z += dz * k; p.nx = dx / d; p.nz = dz / d; }
        else {                                                 // centre inside the box: leave through the nearest side
          const l = p.x - b.x0, r = b.x1 - p.x, n = p.z - b.z0, s = b.z1 - p.z, m = Math.min(l, r, n, s);
          dx = m === l ? -1 : m === r ? 1 : 0; dz = dx ? 0 : m === n ? -1 : 1;
          p.x += dx * (m + radius); p.z += dz * (m + radius); p.nx = dx; p.nz = dz;
        }
        moved = hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }

  const world = {
    addBox,
    /** rect = {x0, x1, z0, z1} */
    addRect(rect, y0, y1, o) { return addBox(rect.x0, y0, rect.z0, rect.x1, y1, rect.z1, o); },
    /**
     * Four walls just INSIDE `rect`. openings = [{side: 'N'|'S'|'E'|'W', at, width, height?}] where N is the z0 side,
     * S the z1 side, W the x0 side, E the x1 side; `at` is the x (N, S) or z (W, E) of the opening's centre. With a
     * `height`, a lintel closes the opening above it.
     */
    addWalls(rect, y0, y1, t, openings = [], o) {
      const out = [];
      const sides = { N: [rect.x0, rect.x1, rect.z0, rect.z0 + t, true], S: [rect.x0, rect.x1, rect.z1 - t, rect.z1, true], W: [rect.z0 + t, rect.z1 - t, rect.x0, rect.x0 + t, false], E: [rect.z0 + t, rect.z1 - t, rect.x1 - t, rect.x1, false] };
      for (const side of ['N', 'S', 'W', 'E']) {
        const [a0, a1, c0, c1, alongX] = sides[side];
        const piece = (p0, p1, ya, yb) => { if (p1 - p0 > 1e-4 && yb - ya > 1e-4) out.push(alongX ? addBox(p0, ya, c0, p1, yb, c1, o) : addBox(c0, ya, p0, c1, yb, p1, o)); };
        let from = a0;
        for (const op of openings.filter((x) => x.side === side).sort((p, q) => p.at - q.at)) {
          const g0 = Math.max(a0, op.at - op.width / 2), g1 = Math.min(a1, op.at + op.width / 2);
          piece(from, g0, y0, y1);
          if (op.height !== undefined) piece(g0, g1, y0 + op.height, y1);
          from = Math.max(from, g1);
        }
        piece(from, a1, y0, y1);
      }
      return out;
    },
    /** Highest walkable top at (x, z) that is no higher than fromY + maxUp; 0 (the road) when there is none. */
    groundY(x, z, fromY, maxUp = STEP_UP) {
      const list = query(x, z, x, z, 'player'), limit = fromY + maxUp;
      let best = 0;
      for (let i = 0; i < list.length; i++) { const y = list[i].y1; if (y <= limit && y > best) best = y; }
      return best;
    },
    /**
     * Move a standing capsule (feet at pos) by delta: slides along walls, climbs steps up to 0.4 m, lands on floors,
     * stops under ceilings. pos = {x, y, z}, delta = {x, y, z}; nothing is modified.
     * @returns {{x:number, y:number, z:number, grounded:boolean, hitWall:boolean, hitHead:boolean}}
     */
    moveCapsule(pos, delta, radius, height) {
      const p = { x: pos.x, z: pos.z, nx: 0, nz: 0 };
      let y = pos.y, hitWall = false, hitHead = false, grounded = false;
      const len = Math.hypot(delta.x, delta.z), steps = Math.max(1, Math.ceil(len / (radius * 0.8)));
      for (let i = 0; i < steps; i++) {
        p.x += delta.x / steps; p.z += delta.z / steps;
        if (pushOut(p, radius, y + STEP_UP, y + height, 'player')) hitWall = true;
      }
      const floor = world.groundY(p.x, p.z, y), ny = y + delta.y;
      if (delta.y > 0) {
        const list = query(p.x - radius * 0.7, p.z - radius * 0.7, p.x + radius * 0.7, p.z + radius * 0.7, 'player');
        let roof = Infinity;
        for (let i = 0; i < list.length; i++) { const b = list[i]; if (b.y0 >= y + height - 0.05 && b.y0 < roof) roof = b.y0; }
        if (ny + height > roof) { y = roof - height; hitHead = true; } else y = ny;
        if (y < floor) y = floor;                              // rising onto a step: follow it, the jump goes on
      } else if (ny <= floor) { y = floor; grounded = true; } else y = ny;
      return { x: p.x, y, z: p.z, grounded, hitWall, hitHead };
    },
    /** Move a circle from (x0, z0) to (x1, z1) in XZ, sliding along what it touches (NPCs, traffic). */
    sweepCircleXZ(x0, z0, x1, z1, radius, yMin, yMax, mask = 'player') {
      const p = { x: x0, z: z0, nx: 0, nz: 0 }, len = Math.hypot(x1 - x0, z1 - z0), steps = Math.max(1, Math.ceil(len / (radius * 0.8)));
      let hit = false;
      for (let i = 0; i < steps; i++) { p.x += (x1 - x0) / steps; p.z += (z1 - z0) / steps; if (pushOut(p, radius, yMin, yMax, mask)) hit = true; }
      return { x: p.x, z: p.z, hit, nx: hit ? p.nx : 0, nz: hit ? p.nz : 0 };
    },
    /**
     * Nearest hit of a ray. origin / dir = {x, y, z} (dir need not be normalised). mask: 'player' | 'vehicle' | 'camera'.
     * @returns {{distance:number, point:{x,y,z}, normal:{x,y,z}, handle:{box:object}}|null}
     */
    raycast(origin, dir, maxDist, mask = 'player') {
      const l = Math.hypot(dir.x, dir.y, dir.z);
      if (!(l > 0) || !(maxDist > 0)) return null;
      const dx = dir.x / l, dy = dir.y / l, dz = dir.z / l, ex = origin.x + dx * maxDist, ez = origin.z + dz * maxDist;
      const list = query(Math.min(origin.x, ex), Math.min(origin.z, ez), Math.max(origin.x, ex), Math.max(origin.z, ez), mask);
      let best = maxDist, hit = null, axis = 0, sign = 0;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        let t0 = 0, t1 = best, a = -1, s = 0, ok = true;
        for (let k = 0; k < 3 && ok; k++) {
          const o = k === 0 ? origin.x : k === 1 ? origin.y : origin.z, d = k === 0 ? dx : k === 1 ? dy : dz, lo = k === 0 ? b.x0 : k === 1 ? b.y0 : b.z0, hi = k === 0 ? b.x1 : k === 1 ? b.y1 : b.z1;
          if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) ok = false; continue; }
          let ta = (lo - o) / d, tb = (hi - o) / d, sg = -1;
          if (ta > tb) { const t = ta; ta = tb; tb = t; sg = 1; }
          if (ta > t0) { t0 = ta; a = k; s = sg; }
          if (tb < t1) t1 = tb;
          if (t0 > t1) ok = false;
        }
        if (ok && t0 < best) { best = t0; hit = b; axis = a; sign = s; }
      }
      if (!hit) return null;
      return { distance: best, point: { x: origin.x + dx * best, y: origin.y + dy * best, z: origin.z + dz * best }, normal: { x: axis === 0 ? sign : 0, y: axis === 1 ? sign : 0, z: axis === 2 ? sign : 0 }, handle: { box: hit } };
    },
    /**
     * Push an oriented box (the car: centre, half length along its heading, half width, yaw) out of the world.
     * Only boxes overlapping [yMin, yMax] that block vehicles count.
     * @returns {{x:number, z:number, hit:boolean, nx:number, nz:number}} corrected centre and the push direction
     */
    resolveBoxXZ(cx, cz, halfLen, halfWid, yaw, yMin, yMax) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const ex = Math.abs(fx) * halfLen + Math.abs(rx) * halfWid, ez = Math.abs(fz) * halfLen + Math.abs(rz) * halfWid;   // AABB of the car
      let x = cx, z = cz, hit = false, nx = 0, nz = 0;
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        const list = query(x - ex, z - ez, x + ex, z + ez, 'vehicle');
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          if (b.y1 <= yMin + EPS || b.y0 >= yMax - EPS) continue;
          const bx = (b.x0 + b.x1) / 2, bz = (b.z0 + b.z1) / 2, hx = (b.x1 - b.x0) / 2, hz = (b.z1 - b.z0) / 2, ddx = x - bx, ddz = z - bz;
          // separating axes: world X, world Z, the car's forward and right
          let depth = Infinity, ax = 0, az = 0, apart = false;
          for (let k = 0; k < 4 && !apart; k++) {
            const ux = k === 0 ? 1 : k === 1 ? 0 : k === 2 ? fx : rx, uz = k === 0 ? 0 : k === 1 ? 1 : k === 2 ? fz : rz;
            const car = k === 0 ? ex : k === 1 ? ez : k === 2 ? halfLen : halfWid, box = Math.abs(ux) * hx + Math.abs(uz) * hz, dist = ddx * ux + ddz * uz;
            const over = car + box - Math.abs(dist);
            if (over <= 0) apart = true; else if (over < depth) { depth = over; const sg = dist < 0 ? -1 : 1; ax = ux * sg; az = uz * sg; }
          }
          if (apart) continue;
          x += ax * depth; z += az * depth; nx = ax; nz = az; hit = moved = true;
        }
        if (!moved) break;
      }
      return { x, z, hit, nx, nz };
    },
    /** every collider box (debug views, anchor checks) */
    all: () => [...boxes],
    get count() { return boxes.size; },
    clear() { boxes.clear(); cells.clear(); },
  };
  return world;
}

/** @param {object} ctx registers ctx.collision; debug(on) emits 'collision:debug' {on} for a harness to draw collision.all() */
export function createCollision(ctx) {
  const world = createCollisionWorld();
  let debugOn = false;
  world.debug = (on) => { debugOn = !!on; ctx.events.emit('collision:debug', { on: debugOn }); };
  Object.defineProperty(world, 'debugOn', { get: () => debugOn });
  ctx.register('collision', world, { order: 5 });
  return world;
}
