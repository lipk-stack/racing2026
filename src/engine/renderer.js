/**
 * Rendering stack.
 *
 * A WebGL2 renderer with filmic tone mapping and a post chain of bloom, a speed effect (radial
 * blur, chromatic aberration and vignette in one pass) and antialiasing. Quality is tiered and can
 * step down at runtime: the same build has to look right on a desktop GPU and still hold frame rate
 * on a phone.
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";

export const QUALITY_TIERS = {
  ultra: { pixelRatio: 2, shadows: true, shadowSize: 2048, bloom: 0.62, smaa: true, blurSamples: 8, drawDistance: 900, particles: 1 },
  high: { pixelRatio: 1.5, shadows: true, shadowSize: 1024, bloom: 0.58, smaa: true, blurSamples: 6, drawDistance: 750, particles: 0.8 },
  medium: { pixelRatio: 1.25, shadows: false, shadowSize: 512, bloom: 0.5, smaa: false, blurSamples: 4, drawDistance: 620, particles: 0.55 },
  mobile: { pixelRatio: 1, shadows: false, shadowSize: 512, bloom: 0.42, smaa: false, blurSamples: 3, drawDistance: 520, particles: 0.35 },
};

/**
 * Radial speed blur + chromatic aberration + vignette.
 * One pass because all three are driven by the same "how fast does this feel" number.
 */
export const SpeedShader = {
  name: "SpeedShader",
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0 },
    aberration: { value: 0 },
    vignette: { value: 0.42 },
    samples: { value: 6 },
    tint: { value: new THREE.Color(0x00d8ff) },
    flash: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float aberration;
    uniform float vignette;
    uniform float samples;
    uniform float flash;
    uniform vec3 tint;
    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5, 0.52);
      vec2 toCenter = vUv - center;
      float radius = length(toCenter);

      // Radial smear that only bites away from the middle of the screen.
      vec4 color = vec4(0.0);
      float total = 0.0;
      int count = int(samples);
      for (int i = 0; i < 12; i++) {
        if (i >= count) break;
        float t = float(i) / max(1.0, float(count - 1));
        float scale = 1.0 - intensity * 0.09 * t * smoothstep(0.05, 0.75, radius);
        float weight = 1.0 - t * 0.55;
        color += texture2D(tDiffuse, center + toCenter * scale) * weight;
        total += weight;
      }
      color /= max(total, 0.0001);

      // Lens dispersion grows with the same intensity.
      float shift = aberration * (0.0016 + radius * 0.004);
      color.r = texture2D(tDiffuse, center + toCenter * (1.0 - shift)).r * 0.5 + color.r * 0.5;
      color.b = texture2D(tDiffuse, center + toCenter * (1.0 + shift)).b * 0.5 + color.b * 0.5;

      color.rgb = mix(color.rgb, color.rgb + tint * 0.35, flash);
      float falloff = smoothstep(0.78, 0.24, radius);
      color.rgb *= mix(1.0 - vignette, 1.0, falloff);
      gl_FragColor = vec4(color.rgb, 1.0);
    }
  `,
};

/** Pick a starting tier from what the device advertises. */
export function detectTier() {
  if (typeof window === "undefined") return "high";
  const cores = navigator.hardwareConcurrency || 4;
  const touch = window.matchMedia?.("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 620;
  if (touch || small) return cores >= 8 ? "medium" : "mobile";
  if (cores >= 12) return "ultra";
  if (cores >= 6) return "high";
  return "medium";
}

export function createRenderer(canvas, options = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    stencil: false,
    preserveDrawingBuffer: Boolean(options.preserveDrawingBuffer),
  });
  renderer.setClearColor(0x05070b, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.4, 4200);
  camera.position.set(0, 6, -12);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.72, 0.86);
  const speedPass = new ShaderPass(SpeedShader);
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(speedPass);
  composer.addPass(outputPass);

  let smaaPass = null;
  let tier = options.tier || detectTier();
  let settings = QUALITY_TIERS[tier];
  let width = 1;
  let height = 1;

  function applyTier(nextTier) {
    tier = nextTier;
    settings = QUALITY_TIERS[tier] || QUALITY_TIERS.high;
    renderer.shadowMap.enabled = settings.shadows;
    bloomPass.strength = settings.bloom;
    speedPass.uniforms.samples.value = settings.blurSamples;
    camera.far = settings.drawDistance * 4;
    camera.updateProjectionMatrix();
    if (settings.smaa && !smaaPass) {
      smaaPass = new SMAAPass();
      composer.addPass(smaaPass);
    } else if (!settings.smaa && smaaPass) {
      composer.removePass(smaaPass);
      smaaPass.dispose?.();
      smaaPass = null;
    }
    resize(width, height);
  }

  function resize(nextWidth, nextHeight) {
    width = Math.max(2, nextWidth);
    height = Math.max(2, nextHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, settings.pixelRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    bloomPass.setSize(width * ratio, height * ratio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  /** Drive the post chain from the car: speed smear, pursuit flash, boost bloom. */
  function setEffects({ speed = 0, blur = 0, flash = 0, bloom = null, exposure = null } = {}) {
    speedPass.uniforms.intensity.value = blur;
    speedPass.uniforms.aberration.value = blur * 0.85 + flash * 0.6;
    speedPass.uniforms.flash.value = flash;
    speedPass.uniforms.vignette.value = 0.38 + blur * 0.16;
    if (bloom !== null) bloomPass.strength = settings.bloom + bloom;
    if (exposure !== null) renderer.toneMappingExposure = exposure;
    camera.fov = 62 + speed * 16;
    camera.updateProjectionMatrix();
  }

  // Runtime downgrade: if the GPU cannot hold the frame budget, drop a tier rather than stutter.
  const order = ["ultra", "high", "medium", "mobile"];
  let slowFrames = 0;
  function monitor(delta) {
    if (delta > 0.034) slowFrames += 1;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 90) {
      const index = order.indexOf(tier);
      if (index >= 0 && index < order.length - 1) {
        applyTier(order[index + 1]);
        slowFrames = 0;
        return tier;
      }
      slowFrames = 0;
    }
    return null;
  }

  applyTier(tier);

  return {
    renderer,
    scene,
    camera,
    composer,
    bloomPass,
    speedPass,
    get tier() {
      return tier;
    },
    get settings() {
      return settings;
    },
    applyTier,
    resize,
    setEffects,
    monitor,
    render: () => composer.render(),
    dispose: () => {
      composer.dispose?.();
      renderer.dispose();
    },
  };
}
