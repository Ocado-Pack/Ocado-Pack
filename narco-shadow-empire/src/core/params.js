// URL parameters (dev / test switches). Browser only, but safe to import anywhere.
//   ?quality=low|medium|high|ultra   start with this graphics preset (not persisted)
//   ?test=1        test mode: in-memory save, no intro cinematic gating, deterministic seed, exposes extra debug
//   ?seed=1234     base seed for procedural questions in test mode
//   ?lang=es       UI + learning language
//   ?nosave=1      do not read/write localStorage (in-memory only)
//   ?mission=ch2_warehouse   jump straight into a mission (test/dev)
//   ?start=menu|world|exam|drills|dashboard
//   ?norender=1    never render (pure logic E2E)
//   ?fps=1         show the FPS/resolution readout
export function getParams() {
  const out = {};
  try {
    const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
    for (const [k, v] of q.entries()) out[k] = v === '' ? '1' : v;
  } catch { /* ignore */ }
  return out;
}

export const flag = (params, name) => params[name] !== undefined && params[name] !== '0' && params[name] !== 'false';
