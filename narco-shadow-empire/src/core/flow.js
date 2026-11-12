// Game flow: top-level mode + a stack of modal overlays. Pure module.
//
// mode:   'boot' | 'menu' | 'world' | 'exam' | 'drills'
// modals: overlays stacked on top of the current mode (pause menu, puzzle panel, phone, dialog, cinematic, ...)
//
// Everything that needs to know "may the player move right now?" asks ctx.flow.worldInput.
// Everything that needs to know "is the simulation frozen?" asks ctx.flow.simPaused.
//
//   const close = ctx.flow.pushModal('puzzle', { capturesInput: true, freeCursor: true });
//   ... later: close();
//
// Modal options:
//   capturesInput (default true)  - player/vehicle input is ignored while this modal is open
//   pausesSim     (default false) - world simulation (player, vehicle, missions, env clock) stops; rendering continues
//   freeCursor    (default true)  - the mouse cursor must be visible/usable (pointer lock is released)
export function createFlow({ events }) {
  let mode = 'boot';
  /** @type {{id:string, capturesInput:boolean, pausesSim:boolean, freeCursor:boolean}[]} */
  const stack = [];

  const changed = () => events && events.emit('flow:modal', { stack: stack.map((m) => m.id), top: api.top });

  const api = {
    get mode() { return mode; },
    setMode(next) {
      if (next === mode) return;
      const prev = mode;
      mode = next;
      if (events) events.emit('flow:mode', { mode, prev });
    },
    /** Open a modal. Returns a function that closes exactly this modal (safe to call twice). */
    pushModal(id, opts = {}) {
      const m = { id, capturesInput: opts.capturesInput !== false, pausesSim: !!opts.pausesSim, freeCursor: opts.freeCursor !== false };
      stack.push(m);
      changed();
      let closed = false;
      return () => {
        if (closed) return;
        closed = true;
        const i = stack.indexOf(m);
        if (i >= 0) { stack.splice(i, 1); changed(); }
      };
    },
    /** Close the top-most modal with this id (no-op when absent). */
    popModal(id) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].id === id) { stack.splice(i, 1); changed(); return true; }
      }
      return false;
    },
    has(id) { return stack.some((m) => m.id === id); },
    get top() { return stack.length ? stack[stack.length - 1].id : null; },
    get modals() { return stack.map((m) => m.id); },
    /** true when gameplay input (move/look/interact/drive) should be processed */
    get worldInput() { return mode === 'world' && !stack.some((m) => m.capturesInput); },
    /** true when the world simulation must not advance */
    get simPaused() { return mode !== 'world' || stack.some((m) => m.pausesSim); },
    /** true when the OS cursor should be free (menus, panels) */
    get cursorFree() { return mode !== 'world' || stack.some((m) => m.freeCursor); },
    clearModals() { if (stack.length) { stack.length = 0; changed(); } },
  };
  return api;
}
