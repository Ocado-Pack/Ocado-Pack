// ctx.gfx - the renderer (docs/ARCHITECTURE.md section 5).
//
//   const gfx = createRenderer(ctx);            // uses <canvas id="game">, registers itself as ctx.gfx
//   gfx.scene.add(mesh); gfx.camera.position.set(...);   ctx.loop.start();   // the loop calls gfx.render(dt)
//
// Honest resolution: getInfo() reports the REAL drawing-buffer size, and is4K is true only when that buffer is at
// least 3840 x 2160. Three modes (settings.resolutionMode): 'native', 'fixed4k', 'dynamic' - see resolution.js.
// Two render paths: the post chain (post.js: HDR target, MSAA, bloom, AO, grade) or, when bloom, grain, ao and msaa
// are all off (the low preset), a direct draw to the canvas. Everything reacts live to ctx.settings.
import * as THREE from 'three';
import { L } from '../core/ltext.js';
import { createPost } from './post.js';
import { computeBuffer, createDynamicScale, is4K } from './resolution.js';

const MSG = {
  noWebGL: L('This game needs WebGL (3D graphics), but it could not be started on this device or browser. Turn on hardware acceleration in the browser settings, or try another browser.',
    'Este juego necesita WebGL (gráficos 3D), pero no se pudo iniciar en este dispositivo o navegador. Activa la aceleración por hardware en la configuración del navegador o prueba con otro navegador.'),
  lost: L('The graphics context was lost. Restoring…', 'Se perdió el contexto gráfico. Restaurando…'),
};
const SIZE_KEYS = ['renderScale', 'maxPixelRatio', 'resolutionMode'];
const POST_KEYS = ['bloom', 'grain', 'ao', 'msaa', 'reducedMotion'];

/**
 * @param {object} ctx
 * @param {{canvas?:HTMLCanvasElement}} [opts]
 */
export function createRenderer(ctx, opts = {}) {
  const settings = ctx.settings;
  const canvas = opts.canvas || document.getElementById('game') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'game' }));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.get('fov') || 62, 16 / 9, 0.1, 1200);
  camera.position.set(0, 1.7, 6);
  scene.add(camera);

  // ---- messages (WebGL missing, context lost): readable, bilingual, and never a thrown error -----------------------
  let msgEl = null, msgText = null;
  const showMessage = (lt) => {
    msgText = lt;
    if (!lt) { if (msgEl) { msgEl.remove(); msgEl = null; } return; }
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.setAttribute('role', 'alert');
      msgEl.dataset.testid = 'gfx-message';
      msgEl.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:min(34rem,86vw);padding:1.25rem 1.5rem;' +
        'background:rgba(8,12,18,.94);color:#e8eef5;border:1px solid #f0a43a;border-radius:10px;font:600 1rem/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;' +
        'text-align:center;z-index:10000;pointer-events:auto';
      (document.getElementById('ui') || document.body).appendChild(msgEl);
    }
    msgEl.textContent = ctx.i18n.tl(lt);
  };
  ctx.i18n.onLangChange(() => { if (msgText) showMessage(msgText); });

  // ---- WebGL context -------------------------------------------------------------------------------------------------
  const attrs = { alpha: false, depth: true, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  let gl = null, renderer = null;
  try {
    gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
    if (gl) renderer = new THREE.WebGLRenderer({ canvas, context: gl, ...attrs });
  } catch (e) {
    console.warn('[gfx] WebGL could not be initialised:', e && e.message);
    renderer = null;
  }

  let cssW = 1, cssH = 1, bufferW = 1, bufferH = 1, limited = false, lastDpr = 0;
  let sizeDirty = true, postDirty = true, shadowDirty = true, usePost = false, contextLost = false, lastFrame = 0;
  let frames = 0, drawCalls = 0, triangles = 0;
  const dyn = createDynamicScale({ targetFps: settings.get('targetFps') });
  const post = renderer ? createPost(renderer, scene, camera) : null;
  const maxSize = renderer ? Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096) : 4096;
  const _v = new THREE.Vector3(), _px = new Uint8Array(4);

  if (renderer) {
    renderer.setPixelRatio(1);                         // the buffer size is set explicitly (resolution.js), not through a ratio
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0x05070b, 1);
    renderer.info.autoReset = false;                   // so drawCalls / triangles cover the whole frame, passes included
  }

  function measure() {
    const r = canvas.getBoundingClientRect();
    cssW = Math.max(1, Math.round(r.width || canvas.clientWidth || window.innerWidth || 1));
    cssH = Math.max(1, Math.round(r.height || canvas.clientHeight || window.innerHeight || 1));
  }

  function applySize() {
    sizeDirty = false;
    measure();
    lastDpr = window.devicePixelRatio || 1;
    camera.aspect = cssW / cssH;
    camera.updateProjectionMatrix();
    if (!renderer) return;
    const want = computeBuffer({
      cssW, cssH, dpr: lastDpr, mode: settings.get('resolutionMode'), maxPixelRatio: settings.get('maxPixelRatio'),
      renderScale: settings.get('renderScale'), dynamicScale: dyn.scale, maxSize,
    });
    let w = want.bufferW, h = want.bufferH;
    limited = want.limited;
    if (w !== canvas.width || h !== canvas.height) renderer.setSize(w, h, false);
    // The browser may give less than was asked for; the numbers we report and render with are the real ones.
    if (!contextLost && (gl.drawingBufferWidth !== w || gl.drawingBufferHeight !== h) && gl.drawingBufferWidth > 0) {
      w = gl.drawingBufferWidth; h = gl.drawingBufferHeight; limited = true;
      renderer.setSize(w, h, false);
    }
    const changed = w !== bufferW || h !== bufferH;
    bufferW = w; bufferH = h;
    if (post) post.setSize(w, h);
    if (changed || !frames) ctx.events.emit('gfx:resize', { cssW, cssH, bufferW, bufferH, pixelRatio: bufferW / cssW });
  }

  function applyPost() {
    postDirty = false;
    if (!post) return;
    usePost = post.configure({ bloom: !!settings.get('bloom'), grain: !!settings.get('grain'), ao: !!settings.get('ao'), msaa: settings.get('msaa') | 0, reducedMotion: !!settings.get('reducedMotion') });
  }

  function applyShadows() {
    shadowDirty = false;
    if (!renderer) return;
    const mode = settings.get('shadows');
    const on = mode !== 'off', type = mode === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (renderer.shadowMap.enabled === on && renderer.shadowMap.type === type) return;
    renderer.shadowMap.enabled = on;
    renderer.shadowMap.type = type;
    renderer.shadowMap.needsUpdate = true;
    scene.traverse((o) => {                             // shadow support is compiled into every lit material
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => { x.needsUpdate = true; }); else if (m) m.needsUpdate = true;
    });
  }

  /** Apply everything a settings change left pending. Called before each frame and by getInfo(). */
  function flush() {
    if (postDirty) applyPost();
    if (shadowDirty) applyShadows();
    if (sizeDirty || (window.devicePixelRatio || 1) !== lastDpr) applySize();
  }

  const offSettings = settings.onChange('*', (value, key) => {
    if (SIZE_KEYS.includes(key)) { sizeDirty = true; if (key === 'resolutionMode') dyn.reset(); }
    else if (POST_KEYS.includes(key)) postDirty = true;
    else if (key === 'shadows') shadowDirty = true;
    else if (key === 'targetFps') dyn.setTarget(value);
    else if (key === 'fov') { camera.fov = value; camera.updateProjectionMatrix(); }
    else if (key === 'quality') ctx.events.emit('gfx:quality', { preset: value });
  });

  const onResize = () => { sizeDirty = true; };
  window.addEventListener('resize', onResize);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(canvas);
  const onLost = (e) => { e.preventDefault(); contextLost = true; showMessage(MSG.lost); ctx.events.emit('gfx:contextlost', {}); };
  const onRestored = () => { contextLost = false; showMessage(null); sizeDirty = true; postDirty = true; ctx.events.emit('gfx:contextrestored', {}); };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const gfx = {
    renderer, scene, camera, canvas,
    composer: post ? post.composer : null,
    /** true when WebGL could not be created: nothing is drawn, a message is shown, every method is still safe to call */
    unavailable: !renderer,
    get contextLost() { return contextLost; },
    /** true while the post chain (HDR target, MSAA, bloom, AO, grade) is in use; false on the direct path */
    get postActive() { return usePost; },
    get exposure() { return renderer ? renderer.toneMappingExposure : 1; },
    maxAnisotropy: renderer ? renderer.capabilities.getMaxAnisotropy() : 1,

    /** Draw one frame. Called by ctx.loop after every system has updated. */
    render(dt = 0) {
      if (!renderer || contextLost) return;
      const now = performance.now(), real = lastFrame ? (now - lastFrame) / 1000 : 0;
      lastFrame = now;
      if (settings.get('resolutionMode') === 'dynamic') { const before = dyn.scale; if (dyn.update(real) !== before) sizeDirty = true; }
      flush();
      renderer.info.reset();
      if (usePost) post.render(dt, ctx.time.real);
      else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
      drawCalls = renderer.info.render.calls; triangles = renderer.info.render.triangles;
      frames++;
    },

    /** Re-measure the canvas and resize the drawing buffer now (also happens automatically on window resize). */
    resize() { sizeDirty = true; flush(); },

    /** The real numbers. is4K is true only when the drawing buffer is at least 3840 x 2160. */
    getInfo() {
      flush();
      const w = renderer && !contextLost ? gl.drawingBufferWidth : bufferW, h = renderer && !contextLost ? gl.drawingBufferHeight : bufferH;
      return {
        cssW, cssH, bufferW: renderer ? w : 0, bufferH: renderer ? h : 0, pixelRatio: renderer ? w / cssW : 0,
        preset: settings.get('quality'), is4K: !!renderer && is4K(w, h), fps: ctx.loop ? ctx.loop.fps : 0, drawCalls, triangles,
        mode: settings.get('resolutionMode'), limited, dynamicScale: dyn.scale, post: usePost, msaa: usePost ? post.samples : 0,
        shadows: settings.get('shadows'), frames, webgl2: !!(renderer && renderer.capabilities.isWebGL2), unavailable: !renderer, contextLost,
      };
    },

    setExposure(v) { if (renderer && v > 0) renderer.toneMappingExposure = v; },
    /** Bloom follows the light level (ctx.env calls this). {strength, radius, threshold, knee} */
    setBloom(o) { if (post) post.setBloom(o); },
    /** Grade controls: {contrast, saturation, vignette, split, shadowTint:[r,g,b], highlightTint:[r,g,b]} */
    setGrade(o) { if (post) post.setGrade(o); },

    /** World position -> CSS pixels on the canvas. visible is false off-screen or behind the camera. */
    project(v) {
      camera.updateMatrixWorld();
      _v.copy(v).applyMatrix4(camera.matrixWorldInverse);
      const depth = -_v.z;
      _v.applyMatrix4(camera.projectionMatrix);
      const behind = depth <= 0;
      return { x: (_v.x * 0.5 + 0.5) * cssW, y: (-_v.y * 0.5 + 0.5) * cssH, depth, behind, visible: !behind && Math.abs(_v.x) <= 1 && Math.abs(_v.y) <= 1 && depth < camera.far };
    },
    /** CSS pixel on the canvas -> world-space ray {origin, direction} (new vectors). */
    screenToRay(x, y) {
      camera.updateMatrixWorld();
      const origin = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
      const direction = new THREE.Vector3((x / cssW) * 2 - 1, -(y / cssH) * 2 + 1, 0.5).unproject(camera).sub(origin).normalize();
      return { origin, direction };
    },

    /**
     * Draw a frame and read back an n x n grid of pixels from the canvas (tests, self-test).
     * @returns {{n:number, mean:number[], luma:number, min:number, max:number, lumas:number[]}|null}  0-255 values; luma 0-1
     */
    sample(n = 6) {
      if (!renderer || contextLost) return null;
      gfx.render(0);
      renderer.setRenderTarget(null);
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, mean = [0, 0, 0], lumas = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        gl.readPixels(Math.min(w - 1, Math.floor(((i + 0.5) / n) * w)), Math.min(h - 1, Math.floor(((j + 0.5) / n) * h)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px);
        mean[0] += _px[0]; mean[1] += _px[1]; mean[2] += _px[2];
        lumas.push((0.2126 * _px[0] + 0.7152 * _px[1] + 0.0722 * _px[2]) / 255);       // rows run bottom to top
      }
      const k = 1 / (n * n);
      return { n, mean: mean.map((v) => v * k), luma: lumas.reduce((a, b) => a + b, 0) * k, min: Math.min(...lumas), max: Math.max(...lumas), lumas };
    },

    dispose() {
      offSettings();
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      showMessage(null);
      if (post) post.dispose();
      if (renderer) renderer.dispose();
    },
  };

  if (!renderer) showMessage(MSG.noWebGL);
  flush();
  ctx.register('gfx', gfx, { order: 1000, runWhenPaused: true });
  ctx.debug.gfxStats = () => gfx.getInfo();
  ctx.debug.gfxSample = (n) => gfx.sample(n);
  return gfx;
}
