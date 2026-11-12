// STUB - the character engineer replaces this file with the full procedural humanoid (same interface).
// Interface (contract for player.js / npc.js / vehicle.js):
//   const ch = createCharacter({ preset: 'player' | 'clerk' | 'mechanic' | 'analyst' | 'receptionist' | 'pedestrian', seed? })
//   ch.object            THREE.Group, feet at the origin, model facing -Z, ~1.78 m tall
//   ch.update(dt, { state, speed, crouch, grounded, vy })   state: 'idle'|'walk'|'run'|'jump'|'fall'|'crouch'|'crouchwalk'|'driving'
//   ch.play(gesture) -> Promise      gesture: 'inspect' | 'use' | 'pickup' | 'talk' | 'type'
//   ch.height            number (meters)
import * as THREE from 'three';

export function createCharacter(opts = {}) {
  const object = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: opts.preset === 'player' ? 0x2b3a4a : 0x6a5a4a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 6, 12), mat);
  body.position.y = 0.78; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc89f84, roughness: 0.7 }));
  head.position.y = 1.62; head.castShadow = true;
  object.add(body, head);
  let t = 0;
  return {
    object,
    height: 1.78,
    update(dt, s = {}) {
      t += dt * (s.state === 'run' ? 12 : s.state === 'walk' ? 7 : 2);
      const crouch = s.crouch || s.state === 'crouch' || s.state === 'crouchwalk';
      body.scale.y = crouch ? 0.62 : 1; body.position.y = crouch ? 0.5 : 0.78 + Math.sin(t) * 0.015;
      head.position.y = crouch ? 1.0 : 1.62 + Math.sin(t) * 0.015;
    },
    play() { return Promise.resolve(); },
  };
}
