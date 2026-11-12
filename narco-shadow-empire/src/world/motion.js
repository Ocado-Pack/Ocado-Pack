// Character motion: the rules that move a capsule through the collision world (walk, run, crouch, jump, footsteps).
// Pure module - plain objects, no three.js, no DOM - so the feel of the controls is pinned down by Node tests.
// player.js wraps it (input -> command, position -> scene object, events -> ctx.events); NPCs can reuse it.
//
//   const m = createMotion(ctx.collision);  m.teleport(x, y, z, yaw);
//   const events = m.step(dt, { moveX, moveY, cameraYaw, run, jump, crouchToggle, crouchHold });
//   m.position {x, y, z} (feet) · m.velocity · m.yaw (body) · m.grounded · m.crouching · m.height · m.state · m.speed
import { dampAngle, forwardToYaw } from '../core/util.js';

export const MOVE = Object.freeze({
  radius: 0.35, height: 1.8, crouchHeight: 1.1,
  walk: 1.8, run: 5.0, crouchWalk: 1.1,          // m/s
  accel: 12, airAccel: 3,                        // 1/s: how fast the velocity follows the stick on the ground / in the air
  gravity: 22, jumpHeight: 1.0, coyote: 0.12, buffer: 0.12,
  turn: 12, strideWalk: 0.75, strideRun: 1.25,
});
const SURFACES = ['metal', 'wood', 'water', 'carpet', 'gravel'];

/** @param {{moveCapsule:Function, raycast:Function}} collision  @param {Partial<typeof MOVE>} [tune] */
export function createMotion(collision, tune = {}) {
  const C = { ...MOVE, ...tune }, jumpSpeed = Math.sqrt(2 * C.gravity * C.jumpHeight);
  const position = { x: 0, y: 0, z: 0 }, velocity = { x: 0, y: 0, z: 0 }, delta = { x: 0, y: 0, z: 0 }, events = [];
  const up = { x: 0, y: 1, z: 0 }, down = { x: 0, y: -1, z: 0 }, probe = { x: 0, y: 0, z: 0 };
  let yaw = 0, grounded = true, crouching = false, coyote = 0, buffer = 0, stride = 0, state = 'idle', fallSpeed = 0;

  /** is there room to stand up here? */
  const headroom = () => { probe.x = position.x; probe.y = position.y + C.crouchHeight - 0.05; probe.z = position.z; return !collision.raycast(probe, up, C.height - C.crouchHeight + 0.05); };
  const surface = () => {
    probe.x = position.x; probe.y = position.y + 0.1; probe.z = position.z;
    const hit = collision.raycast(probe, down, 0.4), tag = hit && hit.handle.box.tag ? String(hit.handle.box.tag) : '';
    return SURFACES.find((s) => tag.includes(s)) || 'concrete';
  };

  const m = {
    position, velocity,
    get yaw() { return yaw; }, set yaw(v) { yaw = v; },
    get grounded() { return grounded; },
    get crouching() { return crouching; },
    get height() { return crouching ? C.crouchHeight : C.height; },
    get radius() { return C.radius; },
    /** horizontal speed, m/s */
    get speed() { return Math.hypot(velocity.x, velocity.z); },
    /** 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'crouch' | 'crouchwalk' */
    get state() { return state; },
    teleport(x, y, z, newYaw) { position.x = x; position.y = y; position.z = z; velocity.x = velocity.y = velocity.z = 0; if (newYaw !== undefined) yaw = newYaw; grounded = true; coyote = buffer = stride = 0; state = crouching ? 'crouch' : 'idle'; },
    /**
     * Advance by dt seconds.
     * @param {{moveX?:number, moveY?:number, cameraYaw?:number, run?:boolean, jump?:boolean, crouchToggle?:boolean, crouchHold?:boolean}} cmd
     *        moveX / moveY are relative to cameraYaw; jump and crouchToggle are edges ("pressed this frame")
     * @returns {{type:'step'|'jump'|'land', surface?:string, running?:boolean, speed?:number}[]} valid until the next call
     */
    step(dt, cmd = {}) {
      events.length = 0;
      if (!(dt > 0)) return events;
      // crouch: toggle on the edge, or follow the held key; standing up needs headroom
      const wantCrouch = cmd.crouchHold ? true : cmd.crouchToggle ? !crouching : cmd.crouchHold === false && m._held ? false : crouching;
      m._held = !!cmd.crouchHold;
      if (wantCrouch && !crouching && grounded) crouching = true; else if (!wantCrouch && crouching && headroom()) crouching = false;

      // horizontal: the velocity chases the wished velocity (camera-relative stick)
      const cy = cmd.cameraYaw || 0, mx = cmd.moveX || 0, my = cmd.moveY || 0, len = Math.min(1, Math.hypot(mx, my));
      const top = crouching ? C.crouchWalk : cmd.run ? C.run : C.walk, n = Math.hypot(mx, my) || 1;
      const wx = ((Math.cos(cy) * mx - Math.sin(cy) * my) / n) * len * top, wz = ((-Math.sin(cy) * mx - Math.cos(cy) * my) / n) * len * top;
      const k = 1 - Math.exp(-(grounded ? C.accel : C.airAccel) * dt);
      velocity.x += (wx - velocity.x) * k; velocity.z += (wz - velocity.z) * k;
      if (len > 0.05 && m.speed > 0.2) yaw = dampAngle(yaw, forwardToYaw(velocity.x, velocity.z), C.turn, dt);

      // jump: buffered press + coyote time
      coyote = grounded ? C.coyote : Math.max(0, coyote - dt);
      buffer = cmd.jump ? C.buffer : Math.max(0, buffer - dt);
      if (buffer > 0 && coyote > 0 && !crouching) { velocity.y = jumpSpeed; buffer = coyote = 0; grounded = false; events.push({ type: 'jump' }); }
      velocity.y -= C.gravity * dt;
      if (velocity.y < 0) fallSpeed = -velocity.y;

      delta.x = velocity.x * dt; delta.y = velocity.y * dt; delta.z = velocity.z * dt;
      const r = collision.moveCapsule(position, delta, C.radius, m.height), moved = Math.hypot(r.x - position.x, r.z - position.z);
      position.x = r.x; position.y = r.y; position.z = r.z;
      if (r.hitHead && velocity.y > 0) velocity.y = 0;
      if (r.grounded) {
        if (!grounded && fallSpeed > 3) events.push({ type: 'land', speed: fallSpeed });
        grounded = true; velocity.y = 0; fallSpeed = 0;
        stride += moved;
        const running = m.speed > 3.2, need = running ? C.strideRun : C.strideWalk;
        if (stride >= need) { stride -= need; events.push({ type: 'step', surface: surface(), running }); }
      } else grounded = false;

      const s = m.speed;
      state = !grounded ? (velocity.y > 0 ? 'jump' : 'fall') : crouching ? (s > 0.2 ? 'crouchwalk' : 'crouch') : s > 3.2 ? 'run' : s > 0.2 ? 'walk' : 'idle';
      return events;
    },
  };
  return m;
}
