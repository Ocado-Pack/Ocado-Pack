// Post-processing chain for ctx.gfx:   scene -> [ambient occlusion] -> [bloom] -> grade + tone map + output
//
// The scene is rendered in linear HDR into ONE half-float target (multisampled when settings.msaa > 0). Bloom works on
// that HDR image, so only real emitters and glints glow. The last pass does, in this order: ACES filmic tone mapping
// (the same curve three.js applies on the direct path), gentle contrast, teal-shadow / warm-highlight split toning,
// vignette, sRGB encoding, film grain and a 1-bit dither that removes banding from dark sky gradients.
// It replaces three's OutputPass: one full-screen pass less at 4K.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

export const GradeShader = {
  name: 'NarcoGrade',
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1 },
    uTime: { value: 0 },
    uGrain: { value: 0 },                                    // 0 = no grain
    uGrainSize: { value: 1 },                                // grain cell in buffer pixels (about 1/1080 of the height)
    uVignette: { value: 0.3 },
    uContrast: { value: 0.16 },
    uSaturation: { value: 1.05 },
    uSplit: { value: 1 },
    uShadowTint: { value: new THREE.Vector3(0.86, 1.01, 1.1) },      // multipliers applied in the shadows (teal)
    uHighlightTint: { value: new THREE.Vector3(1.05, 1.0, 0.93) },   // ... and in the highlights (warm)
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uExposure, uTime, uGrain, uGrainSize, uVignette, uContrast, uSaturation, uSplit;
    uniform vec3 uShadowTint, uHighlightTint;
    varying vec2 vUv;
    const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

    // ACES filmic fit (Stephen Hill) - identical to THREE.ACESFilmicToneMapping, so both render paths match
    vec3 gradeFit( vec3 v ) {
      vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
      vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
      return a / b;
    }
    vec3 aces( vec3 color ) {
      const mat3 inputMat = mat3( vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );
      const mat3 outputMat = mat3( vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );
      color *= uExposure / 0.6;
      color = inputMat * color;
      color = gradeFit( color );
      color = outputMat * color;
      return clamp( color, 0.0, 1.0 );
    }
    vec3 toSRGB( vec3 c ) {
      return mix( pow( c, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), c * 12.92, vec3( lessThanEqual( c, vec3( 0.0031308 ) ) ) );
    }
    float hash12( vec2 p ) {
      vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
      p3 += dot( p3, p3.yzx + 33.33 );
      return fract( ( p3.x + p3.y ) * p3.z );
    }
    void main() {
      vec3 c = clamp( texture2D( tDiffuse, vUv ).rgb, 0.0, 256.0 );
      c = aces( c );
      // grade, on the tone-mapped (display-linear) image
      c = mix( c, c * c * ( 3.0 - 2.0 * c ), uContrast );
      float l = dot( c, LUMA );
      c *= mix( vec3( 1.0 ), uShadowTint, uSplit * ( 1.0 - smoothstep( 0.0, 0.45, l ) ) );
      c *= mix( vec3( 1.0 ), uHighlightTint, uSplit * smoothstep( 0.45, 1.0, l ) );
      c = mix( vec3( dot( c, LUMA ) ), c, uSaturation );
      float d = length( vUv - 0.5 );
      c *= 1.0 - uVignette * smoothstep( 0.32, 0.82, d );
      c = toSRGB( clamp( c, 0.0, 1.0 ) );
      // grain and dither, on the encoded image
      vec2 px = gl_FragCoord.xy;
      if ( uGrain > 0.0 ) {
        float n = hash12( floor( px / uGrainSize ) + mod( floor( uTime * 24.0 ), 240.0 ) * vec2( 17.13, 31.71 ) ) - 0.5;
        c += n * uGrain * ( 1.0 - 0.5 * abs( 2.0 * dot( c, LUMA ) - 1.0 ) );
      }
      c += ( hash12( px + 0.37 ) + hash12( px + 17.19 ) - 1.0 ) / 255.0;
      gl_FragColor = vec4( c, 1.0 );
    }`,
};

/** GTAO that ignores everything that is not solid scenery (the sky dome, rain, particles, glass, glow sprites). */
class SolidAoPass extends GTAOPass {
  overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      const m = o.material;
      if (o.isPoints || o.isLine || o.isSprite || (m && !Array.isArray(m) && (m.transparent || m.depthWrite === false))) o.visible = false;
    });
  }
}

/**
 * @param {THREE.WebGLRenderer} renderer @param {THREE.Scene} scene @param {THREE.Camera} camera
 * @returns post = { supported, active, composer, samples, configure(o), setSize(w, h), render(dt, time), setBloom(o), setGrade(o), dispose() }
 */
export function createPost(renderer, scene, camera) {
  const caps = renderer.capabilities;
  const supported = !!caps.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const bloomCfg = { strength: 0.55, radius: 0.55, threshold: 1.0, knee: 0.35 };
  if (!supported) {
    // No floating-point render targets (WebGL 1 or a very old GPU): the renderer always uses the direct path.
    return { supported: false, active: false, composer: null, samples: 0, configure() { return false; }, setSize() {}, render() {}, setBloom(o) { Object.assign(bloomCfg, o); }, setGrade() {}, dispose() {} };
  }

  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  // EffectComposer clones this target. Passes are arranged so that the scene always lands in renderTarget2; only that
  // one carries the depth buffer and the MSAA samples, and renderTarget1 gets GPU storage only while AO is on.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { type: THREE.HalfFloatType, depthBuffer: false }));
  const sceneTarget = composer.renderTarget2;
  sceneTarget.depthBuffer = true;
  sceneTarget.texture.name = 'gfx.scene';
  const renderPass = new RenderPass(scene, camera);
  const gradePass = new ShaderPass(GradeShader);
  gradePass.needsSwap = false;
  gradePass.material.toneMapped = false;
  const gu = gradePass.uniforms;
  let bloomPass = null, aoPass = null, active = false, grain = false, reducedMotion = false, w = size.x, h = size.y;

  const applyBloom = () => {
    if (!bloomPass) return;
    bloomPass.strength = bloomCfg.strength; bloomPass.radius = bloomCfg.radius; bloomPass.threshold = bloomCfg.threshold;
    bloomPass.highPassUniforms.smoothWidth.value = bloomCfg.knee;      // soft knee instead of a hard cut-off
  };
  const applyGrain = () => {
    gu.uGrain.value = grain ? (reducedMotion ? 0.014 : 0.03) : 0;
    gu.uGrainSize.value = Math.max(1, h / 1080);
  };

  const post = {
    supported: true,
    composer,
    get active() { return active; },
    get samples() { return sceneTarget.samples; },
    /**
     * @param {{bloom?:boolean, grain?:boolean, ao?:boolean, msaa?:number, reducedMotion?:boolean}} o
     * @returns {boolean} true when the chain is needed (otherwise the renderer draws straight to the canvas)
     */
    configure(o) {
      const samples = Math.max(0, Math.min(o.msaa | 0, caps.maxSamples | 0));
      if (sceneTarget.samples !== samples) { sceneTarget.samples = samples; sceneTarget.dispose(); }
      if (o.bloom && !bloomPass) { bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), bloomCfg.strength, bloomCfg.radius, bloomCfg.threshold); applyBloom(); }
      if (!o.bloom && bloomPass) { bloomPass.dispose(); bloomPass = null; }
      if (o.ao && !aoPass) {
        aoPass = new SolidAoPass(scene, camera, w, h);
        aoPass.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 });
        aoPass.blendIntensity = 0.85;
      }
      if (!o.ao && aoPass) { aoPass.dispose(); aoPass = null; composer.renderTarget1.dispose(); }
      grain = !!o.grain; reducedMotion = !!o.reducedMotion;
      applyGrain();
      composer.passes.length = 0;
      for (const p of [renderPass, aoPass, bloomPass, gradePass]) if (p) composer.addPass(p);
      active = !!(o.bloom || o.grain || o.ao || samples > 0);
      return active;
    },
    setSize(bufferW, bufferH) {
      w = Math.max(1, bufferW | 0); h = Math.max(1, bufferH | 0);
      composer.setSize(w, h);
      applyGrain();
    },
    /** @param {number} dt seconds @param {number} time seconds, drives the grain */
    render(dt, time) {
      composer.writeBuffer = composer.renderTarget1; composer.readBuffer = sceneTarget;   // AO swaps them: start the same way every frame
      gu.uExposure.value = renderer.toneMappingExposure;
      gu.uTime.value = reducedMotion ? 0 : time;
      composer.render(dt);
    },
    /** @param {{strength?:number, radius?:number, threshold?:number, knee?:number}} o */
    setBloom(o) { Object.assign(bloomCfg, o); applyBloom(); },
    /** @param {{contrast?:number, saturation?:number, vignette?:number, split?:number, shadowTint?:number[], highlightTint?:number[]}} o */
    setGrade(o) {
      if (o.contrast !== undefined) gu.uContrast.value = o.contrast;
      if (o.saturation !== undefined) gu.uSaturation.value = o.saturation;
      if (o.vignette !== undefined) gu.uVignette.value = o.vignette;
      if (o.split !== undefined) gu.uSplit.value = o.split;
      if (o.shadowTint) gu.uShadowTint.value.fromArray(o.shadowTint);
      if (o.highlightTint) gu.uHighlightTint.value.fromArray(o.highlightTint);
    },
    dispose() {
      if (bloomPass) bloomPass.dispose();
      if (aoPass) aoPass.dispose();
      gradePass.dispose();
      composer.dispose();
    },
  };
  return post;
}
