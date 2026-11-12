// Persistent key/value storage: localStorage wrapped in try/catch with an in-memory fallback.
// Never touches the network. Pure enough for Node tests (falls back to memory when no localStorage).

/**
 * @param {string} [namespace]
 * @param {{getItem:Function,setItem:Function,removeItem:Function}|null} [backend]  inject for tests; `null` forces memory
 */
export function createStorage(namespace = 'narco-se', backend) {
  const mem = new Map();
  let store = null;
  let usingFallback = true;

  const probe = (b) => {
    try {
      const k = `${namespace}:__probe__`;
      b.setItem(k, '1');
      const ok = b.getItem(k) === '1';
      b.removeItem(k);
      return ok;
    } catch { return false; }
  };

  if (backend === undefined) {
    try { backend = typeof localStorage !== 'undefined' ? localStorage : null; } catch { backend = null; }
  }
  if (backend && probe(backend)) { store = backend; usingFallback = false; }

  const key = (k) => `${namespace}:${k}`;

  const api = {
    namespace,
    /** true when values survive a reload */
    get persistent() { return !usingFallback; },
    get usingFallback() { return usingFallback; },
    /** Read and JSON-parse a value; returns `fallback` when missing or unreadable. */
    get(k, fallback = null) {
      try {
        const raw = store ? store.getItem(key(k)) : mem.has(key(k)) ? mem.get(key(k)) : null;
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch {
        if (mem.has(key(k))) { try { return JSON.parse(mem.get(key(k))); } catch { /* ignore */ } }
        return fallback;
      }
    },
    /** JSON-stringify and write a value. Returns true when written to persistent storage. */
    set(k, value) {
      const raw = JSON.stringify(value);
      mem.set(key(k), raw); // always mirror in memory so a later failure cannot lose the session
      if (!store) return false;
      try { store.setItem(key(k), raw); return true; } catch {
        // quota exceeded / storage disabled mid-session -> degrade to memory, keep playing
        usingFallback = true; store = null;
        return false;
      }
    },
    remove(k) {
      mem.delete(key(k));
      try { if (store) store.removeItem(key(k)); } catch { /* ignore */ }
    },
    /** Remove every key of this namespace. */
    clear() {
      for (const k of [...mem.keys()]) mem.delete(k);
      try {
        if (store && typeof store.length === 'number') {
          const dead = [];
          for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.startsWith(namespace + ':')) dead.push(k); }
          dead.forEach((k) => store.removeItem(k));
        }
      } catch { /* ignore */ }
    },
  };
  return api;
}
