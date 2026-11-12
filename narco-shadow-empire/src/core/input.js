// ctx.input - keyboard, mouse and virtual (touch / test) input (docs/ARCHITECTURE.md section 6).
// The state machine is free of DOM: handleKey / handleMouseMove / handleWheel / setVirtual / tap can be driven from
// Node tests; attach() wires the real browser events.
//
//   input.move {x, y}      strafe (+right) and forward (+forward), length <= 1 - zero while !ctx.flow.worldInput
//   input.look {dx, dy}    look movement since the last frame (pixels x settings.mouseSens)       input.zoom  wheel steps
//   input.down(a) · input.pressed(a) · input.released(a)       gameplay actions are false while !ctx.flow.worldInput
// Every press also emits 'input:action' {action, device} - the UI listens for pause, phone, map, tutor, skip.

export const ACTIONS = Object.freeze(['run', 'jump', 'crouch', 'interact', 'vehicle', 'phone', 'map', 'pause', 'tutor', 'headlights', 'handbrake', 'horn', 'camera', 'skip']);
/** Actions that belong to the interface: reported even while a panel has the input. */
const UI_ACTIONS = new Set(['pause', 'phone', 'map', 'tutor', 'skip']);
const KEYS = {
  KeyW: ['up'], ArrowUp: ['up'], KeyS: ['down'], ArrowDown: ['down'], KeyA: ['left'], ArrowLeft: ['left'], KeyD: ['right'], ArrowRight: ['right'],
  ShiftLeft: ['run'], ShiftRight: ['run'], Space: ['jump', 'handbrake'], KeyC: ['crouch'], ControlLeft: ['crouch'], ControlRight: ['crouch'],
  KeyE: ['interact'], KeyF: ['vehicle'], Tab: ['phone'], KeyP: ['phone'], KeyM: ['map'], Escape: ['pause'], KeyH: ['tutor'],
  KeyL: ['headlights'], KeyG: ['horn'], KeyV: ['camera'], Enter: ['skip'],
};
const LABELS = { run: 'Shift', jump: 'Space', handbrake: 'Space', crouch: 'C', interact: 'E', vehicle: 'F', phone: 'Tab', map: 'M', pause: 'Esc', tutor: 'H', headlights: 'L', horn: 'G', camera: 'V', skip: 'Enter' };
const DIRS = new Set(['up', 'down', 'left', 'right']);
const editable = (t) => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));

/** @param {object} ctx */
export function createInput(ctx) {
  const keysDown = new Set();                       // physical key codes held
  const held = new Map();                           // action / direction -> number of keys holding it
  const pressed = new Set(), released = new Set();  // edges of this frame
  const virtual = { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, down: {} };
  const move = { x: 0, y: 0 }, look = { dx: 0, dy: 0 };
  let zoom = 0, pointerLocked = false, dragging = false, lastDevice = 'keyboard', canvas = null, detach = null;
  const taps = new Set();
  const isHeld = (name) => (held.get(name) || 0) > 0 || !!virtual.down[name];
  const allowed = (action) => UI_ACTIONS.has(action) || ctx.flow.worldInput;
  const press = (action, device) => { pressed.add(action); lastDevice = device; ctx.events.emit('input:action', { action, device }); };

  const input = {
    get move() {
      if (!ctx.flow.worldInput) { move.x = 0; move.y = 0; return move; }
      let x = (isHeld('right') ? 1 : 0) - (isHeld('left') ? 1 : 0) + virtual.moveX, y = (isHeld('up') ? 1 : 0) - (isHeld('down') ? 1 : 0) + virtual.moveY;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      move.x = x; move.y = y;
      return move;
    },
    get look() {
      const on = ctx.flow.worldInput;
      look.dx = on ? look._x + virtual.lookDX : 0; look.dy = on ? look._y + virtual.lookDY : 0;
      return look;
    },
    /** mouse-wheel steps since the last frame (+ = away from the user) */
    get zoom() { return ctx.flow.worldInput ? zoom : 0; },
    down: (a) => allowed(a) && (isHeld(a) || taps.has(a)),
    pressed: (a) => allowed(a) && pressed.has(a),
    released: (a) => allowed(a) && released.has(a),

    /** Touch controls and tests. moveX / moveY and `down` stay until changed; lookDX / lookDY last one frame. */
    setVirtual(v = {}, device = 'touch') {
      if (v.moveX !== undefined) virtual.moveX = Number(v.moveX) || 0;
      if (v.moveY !== undefined) virtual.moveY = Number(v.moveY) || 0;
      if (v.lookDX !== undefined) virtual.lookDX = Number(v.lookDX) || 0;
      if (v.lookDY !== undefined) virtual.lookDY = Number(v.lookDY) || 0;
      for (const [a, on] of Object.entries(v.down || {})) {
        const was = !!virtual.down[a];
        virtual.down[a] = !!on;
        if (on && !was) press(a, device); else if (!on && was) released.add(a);
      }
      if (v.moveX || v.moveY) lastDevice = device;
    },
    /** A synthetic press that lasts one frame (touch buttons, tests). */
    tap(action, device = 'touch') { taps.add(action); press(action, device); },

    get pointerLocked() { return pointerLocked; },
    requestPointerLock() { if (canvas && canvas.requestPointerLock && !ctx.flow.cursorFree) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { /* sandboxed frame: drag-look still works */ } } },
    exitPointerLock() { if (typeof document !== 'undefined' && document.exitPointerLock && document.pointerLockElement) document.exitPointerLock(); },
    isTouch: typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)),
    get lastDevice() { return lastDevice; },
    /** Key name for prompts ('E'); empty on touch, where on-screen buttons are used instead. */
    label: (action) => (lastDevice === 'touch' ? '' : LABELS[action] || ''),

    // ---- raw events (called by attach(), or directly by tests) -------------------------------------------------------
    handleKey(code, isDown, device = 'keyboard') {
      const names = KEYS[code];
      if (!names) return false;
      if (isDown === keysDown.has(code)) return true;                 // auto-repeat, or a key-up we never saw go down
      if (isDown) keysDown.add(code); else keysDown.delete(code);
      for (const n of names) {
        const count = (held.get(n) || 0) + (isDown ? 1 : -1);
        held.set(n, Math.max(0, count));
        if (DIRS.has(n)) { if (isDown) lastDevice = device; continue; }
        if (isDown && count === 1) press(n, device); else if (!isDown && count === 0) released.add(n);
      }
      return true;
    },
    handleMouseMove(dx, dy) { const s = ctx.settings.get('mouseSens') || 1; look._x += dx * s; look._y += dy * s; lastDevice = 'mouse'; },
    handleWheel(deltaY) { zoom += Math.sign(deltaY); },
    /** Let go of everything (window lost focus, a panel opened). */
    releaseAll() { for (const [n, c] of held) if (c > 0 && !DIRS.has(n)) released.add(n); held.clear(); keysDown.clear(); dragging = false; },
    endFrame() { pressed.clear(); released.clear(); taps.clear(); look._x = 0; look._y = 0; virtual.lookDX = 0; virtual.lookDY = 0; zoom = 0; },

    /** Wire browser events. `target` receives the keys (default window); mouse look uses the canvas. Returns detach(). */
    attach(target, cnv) {
      if (typeof window === 'undefined') return () => {};
      if (detach) detach();
      const t = target || window; canvas = cnv || (ctx.has('gfx') ? ctx.gfx.canvas : document.getElementById('game'));
      const onKey = (e) => {
        if (editable(e.target) && e.code !== 'Escape') return;        // typing an answer is not gameplay
        const playing = ctx.flow.worldInput;                          // in menus and panels Tab, Space and arrows belong to the page
        if (e.code === 'Tab' && !playing) return;
        if (e.repeat && KEYS[e.code]) { if (playing) e.preventDefault(); return; }
        if (input.handleKey(e.code, e.type === 'keydown') && playing && !e.metaKey && !e.altKey && (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
      };
      const onMove = (e) => { if (pointerLocked || dragging) input.handleMouseMove(e.movementX || 0, e.movementY || 0); };
      const onDown = (e) => { if (e.button === 0 && ctx.flow.worldInput) { dragging = true; input.requestPointerLock(); } };
      const onUp = () => { dragging = false; };
      const onWheel = (e) => { if (ctx.flow.worldInput) input.handleWheel(-e.deltaY); };
      const onLock = () => { pointerLocked = !!canvas && document.pointerLockElement === canvas; };
      const onBlur = () => input.releaseAll();
      const offFlow = [ctx.events.on('flow:modal', () => { if (ctx.flow.cursorFree) input.exitPointerLock(); }), ctx.events.on('flow:mode', () => { if (ctx.flow.cursorFree) input.exitPointerLock(); })];
      t.addEventListener('keydown', onKey); t.addEventListener('keyup', onKey);
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); window.addEventListener('blur', onBlur);
      document.addEventListener('pointerlockchange', onLock);
      if (canvas) { canvas.addEventListener('mousedown', onDown); canvas.addEventListener('wheel', onWheel, { passive: true }); }
      detach = () => {
        t.removeEventListener('keydown', onKey); t.removeEventListener('keyup', onKey);
        window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('blur', onBlur);
        document.removeEventListener('pointerlockchange', onLock);
        if (canvas) { canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('wheel', onWheel); }
        offFlow.forEach((off) => off()); detach = null;
      };
      return detach;
    },
  };
  look._x = 0; look._y = 0;
  ctx.register('input', input, { order: 0, runWhenPaused: true });
  return input;
}
