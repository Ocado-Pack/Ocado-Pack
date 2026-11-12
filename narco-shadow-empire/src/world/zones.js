// ctx.zones - named volumes of the district (docs/ARCHITECTURE.md section 5). Pure module: no three.js, no DOM.
//   zones.add({ id, rect: {x0, x1, z0, z1}, y0?, y1?, indoor?, ambience? })     // layout.js ZONES entries fit as they are
//   zones.current (Set of ids) · zones.isInside(id) · zones.indoor (0-1, smoothed: the rain fades with it) · zones.ambience
// Follows the player (or the camera when there is no player); emits zone:enter / zone:exit {id, zone}.
import { rectContains } from '../core/util.js';

const MARGIN = 0.3;   // metres of hysteresis: a zone is left a little later than it is entered, so borders do not flicker

/** @param {object} ctx @param {{probe?:()=>({x:number,y:number,z:number}|null)}} [opts] */
export function createZones(ctx, opts = {}) {
  const zones = new Map(), current = new Set();
  let indoor = 0, ambience = null, probe = opts.probe || null;
  const where = () => (probe ? probe() : ctx.has('player') ? ctx.player.position : ctx.has('gfx') ? ctx.gfx.camera.position : null);
  const contains = (z, p, pad) => rectContains(z.rect, p.x, p.z, pad) && p.y >= z.y0 - pad && p.y <= z.y1 + pad;

  const api = {
    current,
    /** 0 outdoors .. 1 indoors, eased: 95 % of the way after 0.7 s, exact within two seconds */
    get indoor() { return indoor; },
    /** ambience id of the smallest zone the player is in (audio), or null */
    get ambience() { return ambience; },
    add(def) {
      if (!def || !def.id || !def.rect) return null;
      const z = { id: def.id, rect: def.rect, y0: def.y0 === undefined ? -Infinity : def.y0, y1: def.y1 === undefined ? Infinity : def.y1, indoor: def.indoor === true ? 1 : Number(def.indoor) || 0, ambience: def.ambience || null };
      z.area = (z.rect.x1 - z.rect.x0) * (z.rect.z1 - z.rect.z0);
      zones.set(z.id, z);
      return z;
    },
    /** Register every entry of a table keyed by id (layout.js ZONES). */
    addAll(table) { for (const [id, def] of Object.entries(table || {})) api.add({ id, ...def }); },
    remove(id) { const z = zones.get(id); if (!z) return; zones.delete(id); if (current.delete(id)) ctx.events.emit('zone:exit', { id, zone: z }); },
    get: (id) => zones.get(id) || null,
    all: () => [...zones.values()],
    isInside: (id) => current.has(id),
    /** Follow something else than the player (harness, cinematics); null restores the default. */
    setProbe(fn) { probe = fn || null; },
    /** @param {number} dt @param {boolean} [snap] true = no easing (teleports, mission starts) */
    update(dt, snap = false) {
      const p = where();
      if (!p || typeof p.x !== 'number') return;
      let target = 0, smallest = Infinity;
      ambience = null;
      for (const z of zones.values()) {
        const was = current.has(z.id), now = contains(z, p, was ? MARGIN : 0);
        if (now && !was) { current.add(z.id); ctx.events.emit('zone:enter', { id: z.id, zone: z }); }
        else if (!now && was) { current.delete(z.id); ctx.events.emit('zone:exit', { id: z.id, zone: z }); }
        if (now) { if (z.indoor > target) target = z.indoor; if (z.ambience && z.area < smallest) { smallest = z.area; ambience = z.ambience; } }
      }
      indoor = snap ? target : indoor + (target - indoor) * (1 - Math.exp(-Math.max(0, dt) * 4.5));
      if (Math.abs(target - indoor) < 0.002) indoor = target;
    },
  };
  ctx.register('zones', api, { order: 46, runWhenPaused: true });
  return api;
}
