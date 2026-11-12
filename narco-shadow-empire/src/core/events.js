// Minimal event bus. Pure module.
export function createEvents() {
  /** @type {Map<string, Set<Function>>} */
  const map = new Map();
  const api = {
    /** Subscribe. Returns an unsubscribe function. */
    on(type, fn) {
      let set = map.get(type);
      if (!set) { set = new Set(); map.set(type, set); }
      set.add(fn);
      return () => api.off(type, fn);
    },
    once(type, fn) {
      const off = api.on(type, (payload) => { off(); fn(payload); });
      return off;
    },
    off(type, fn) {
      const set = map.get(type);
      if (set) set.delete(fn);
    },
    /** Emit synchronously. A throwing listener never breaks the others. */
    emit(type, payload) {
      const set = map.get(type);
      if (set) {
        for (const fn of [...set]) {
          try { fn(payload); } catch (e) { console.error(`[events] listener for "${type}" threw`, e); }
        }
      }
      const any = map.get('*');
      if (any) {
        for (const fn of [...any]) {
          try { fn({ type, payload }); } catch (e) { console.error('[events] wildcard listener threw', e); }
        }
      }
    },
    /** Promise that resolves with the payload of the next `type` event. */
    wait(type) {
      return new Promise((resolve) => api.once(type, resolve));
    },
    clear() { map.clear(); },
  };
  return api;
}
