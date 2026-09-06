/**
 * World environment.
 *
 * Sky dome, lighting rig, fog, the environment map that makes car paint look like paint, and the
 * weather systems. Each circuit's theme drives all of it, which is what makes four tracks feel like
 * four places rather than one road with a different palette.
 */

import * as THREE from "three";
import { createParticleTexture, createSkyTexture } from "../engine/textures.js";

/**
 * Build the environment for a track and attach it to the scene.
 * Returns handles for the pieces that animate per frame.
 */
export function createEnvironment(renderCtx, track) {
  const { scene, renderer } = renderCtx;
  const theme = track.theme;
  const group = new THREE.Group();
  const disposables = [];

  // --- sky ------------------------------------------------------------------
  // Painted as an equirectangular scene background rather than a sphere: no geometry to clip
  // against the far plane, no depth interaction with the world, and one less draw call.
  const skyTexture = createSkyTexture(theme);
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTexture;
  disposables.push(skyTexture);

  // The same sky drives reflections, so chrome and clearcoat pick up the city rather than grey.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTexture = pmrem.fromEquirectangular(skyTexture).texture;
  scene.environment = environmentTexture;
  pmrem.dispose();
  disposables.push(environmentTexture);

  scene.fog = new THREE.FogExp2(theme.fog ?? 0x0a141c, theme.fogDensity ?? 0.0045);

  // --- lighting -------------------------------------------------------------
  const ambient = new THREE.HemisphereLight(theme.skyGlow ?? 0x2b6f9c, theme.ground ?? 0x0b1218, 0.4);
  group.add(ambient);

  const key = new THREE.DirectionalLight(theme.key ?? 0x9fd8ff, theme.keyIntensity ?? 0.55);
  const angle = theme.keyAngle || [-0.35, 0.75, -0.4];
  key.position.set(angle[0] * 400, angle[1] * 400, angle[2] * 400);
  key.castShadow = true;
  key.shadow.mapSize.set(renderCtx.settings.shadowSize, renderCtx.settings.shadowSize);
  key.shadow.camera.near = 12;
  key.shadow.camera.far = 420;
  key.shadow.camera.left = -70;
  key.shadow.camera.right = 70;
  key.shadow.camera.top = 70;
  key.shadow.camera.bottom = -70;
  key.shadow.bias = -0.0016;
  group.add(key);
  group.add(key.target);

  // Rim light opposite the key stops the cars going flat black at night.
  const rim = new THREE.DirectionalLight(theme.barrierGlow ?? 0x00d8ff, 0.28);
  rim.position.set(-angle[0] * 300, 120, -angle[2] * 300);
  group.add(rim);

  // --- weather --------------------------------------------------------------
  const particleTexture = createParticleTexture();
  let rain = null;
  const rainIntensity = track.weather === "storm" ? 1 : track.weather === "wet" ? 0.55 : track.weather === "damp" ? 0.2 : 0;
  if (rainIntensity > 0) {
    const count = Math.round(2600 * rainIntensity * renderCtx.settings.particles);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 46;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      speeds[i] = 26 + Math.random() * 34;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xbfe4ff,
      size: 0.17,
      map: particleTexture,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    rain = new THREE.Points(geometry, material);
    rain.frustumCulled = false;
    rain.userData = { speeds, count, positions };
    group.add(rain);
    disposables.push(geometry, material);
  }

  scene.add(group);

  return {
    group,
    key,
    rim,
    ambient,
    rain,
    particleTexture,
    environmentTexture,
    /** Keep the sky and the shadow frustum centred on the car. */
    update(cameraPosition, focus, dt) {
      key.position.set(focus.x + angle[0] * 180, focus.y + angle[1] * 180, focus.z + angle[2] * 180);
      key.target.position.copy(focus);
      key.target.updateMatrixWorld();
      if (rain) {
        const { speeds, count, positions } = rain.userData;
        for (let i = 0; i < count; i += 1) {
          positions[i * 3 + 1] -= speeds[i] * dt;
          if (positions[i * 3 + 1] < -4) {
            positions[i * 3] = focus.x + (Math.random() - 0.5) * 90;
            positions[i * 3 + 1] = focus.y + 42;
            positions[i * 3 + 2] = focus.z + (Math.random() - 0.5) * 120;
          }
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      scene.remove(group);
      for (const item of disposables) item.dispose?.();
      particleTexture.dispose();
      scene.environment = null;
      scene.background = null;
      scene.fog = null;
    },
  };
}

/**
 * Sparks, tyre smoke and spray.
 * One pooled points cloud - allocating per collision would stutter exactly when the action peaks.
 */
export function createParticleSystem(scene, texture, budget = 420) {
  const positions = new Float32Array(budget * 3);
  const colors = new Float32Array(budget * 3);
  const velocities = new Float32Array(budget * 3);
  const lives = new Float32Array(budget);
  let cursor = 0;
  // Unused slots live far below the world so the pool never shows up as a cloud at the origin.
  positions.fill(-9999);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.3,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const colour = new THREE.Color();

  return {
    points,
    /** Emit a burst at a world position. `kind` picks the colour and how it moves. */
    emit(kind, position, amount, direction = { x: 0, y: 0, z: 0 }) {
      for (let i = 0; i < amount; i += 1) {
        const index = cursor % budget;
        cursor += 1;
        positions[index * 3] = position.x + (Math.random() - 0.5) * 0.9;
        positions[index * 3 + 1] = position.y + Math.random() * 0.5;
        positions[index * 3 + 2] = position.z + (Math.random() - 0.5) * 0.9;
        const spread = kind === "spark" ? 5.5 : 2.4;
        velocities[index * 3] = direction.x * 0.4 + (Math.random() - 0.5) * spread;
        velocities[index * 3 + 1] = (kind === "smoke" ? 1.8 : 3.4) * Math.random();
        velocities[index * 3 + 2] = direction.z * 0.4 + (Math.random() - 0.5) * spread;
        lives[index] = kind === "smoke" ? 0.9 + Math.random() * 0.6 : 0.35 + Math.random() * 0.4;
        colour.set(kind === "spark" ? 0xffc866 : kind === "spray" ? 0x8fb8d8 : 0x23272b);
        colors[index * 3] = colour.r;
        colors[index * 3 + 1] = colour.g;
        colors[index * 3 + 2] = colour.b;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
    update(dt) {
      let dirty = false;
      for (let i = 0; i < budget; i += 1) {
        if (lives[i] <= 0) continue;
        lives[i] -= dt;
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        velocities[i * 3 + 1] -= 7 * dt;
        const fade = Math.max(0, lives[i]);
        colors[i * 3] *= 0.985;
        colors[i * 3 + 1] *= 0.985;
        colors[i * 3 + 2] *= 0.985;
        if (fade <= 0) {
          positions[i * 3] = -9999;
          positions[i * 3 + 1] = -9999;
          positions[i * 3 + 2] = -9999;
        }
        dirty = true;
      }
      if (dirty) {
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
      }
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
