/**
 * Garage showroom.
 *
 * The menu is not a static screen: the selected car sits on a lit turntable in the same renderer
 * the race uses, with the same paint shader and the same environment map. Swapping cars or buying a
 * part is visible immediately, on the actual model you are about to drive.
 */

import * as THREE from "three";
import { createCarModel, updateCarModel } from "./carmodel.js";
import { createSkyTexture } from "../engine/textures.js";

const SHOWROOM_THEME = {
  skyTop: 0x05070d,
  skyHorizon: 0x101a26,
  skyGlow: 0x1d3346,
  stars: 0.6,
  moon: 1,
};

export function createShowroom(renderCtx) {
  const { scene, renderer } = renderCtx;
  const group = new THREE.Group();
  scene.add(group);

  const skyTexture = createSkyTexture(SHOWROOM_THEME);
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTexture;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTexture = pmrem.fromEquirectangular(skyTexture).texture;
  scene.environment = environmentTexture;
  pmrem.dispose();
  scene.fog = new THREE.FogExp2(0x060a0f, 0.02);

  // Polished floor: dark, slightly reflective, with a ring of light around the plinth.
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(26, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0e13, roughness: 0.18, metalness: 0.75, envMapIntensity: 1.1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.6, 5.1, 64),
    new THREE.MeshBasicMaterial({ color: 0x00d8ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  group.add(ring);

  group.add(new THREE.HemisphereLight(0x2b6f9c, 0x05070a, 0.55));

  const key = new THREE.SpotLight(0xffffff, 240, 60, 0.62, 0.5, 1.6);
  key.position.set(6, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  group.add(key);

  const fillA = new THREE.PointLight(0x00d8ff, 70, 34);
  fillA.position.set(-8, 3.4, -5);
  group.add(fillA);
  const fillB = new THREE.PointLight(0xffd166, 55, 30);
  fillB.position.set(7, 2.6, -6);
  group.add(fillB);

  const turntable = new THREE.Group();
  group.add(turntable);

  let model = null;
  let currentCarId = null;
  let angle = 0.6;

  function setCar(car, options = {}) {
    if (model) {
      turntable.remove(model);
      model.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose?.();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
          else child.material?.dispose?.();
        }
      });
    }
    model = createCarModel(car, options);
    model.rotation.y = Math.PI * 0.5;
    turntable.add(model);
    currentCarId = car.id || `${car.brand}${car.model}`;
  }

  return {
    group,
    get carId() {
      return currentCarId;
    },
    setCar,
    /** Slow orbit plus a gentle camera drift, so the menu is never a still image. */
    update(dt, time) {
      angle += dt * 0.16;
      turntable.rotation.y = angle;
      if (model) {
        updateCarModel(model, { speed: 0, steer: Math.sin(time * 0.3) * 0.18, brake: 0, nitro: 0, dt });
      }
      ring.material.opacity = 0.22 + Math.sin(time * 1.4) * 0.08;
      const camera = renderCtx.camera;
      const radius = 7.4 + Math.sin(time * 0.22) * 0.5;
      camera.position.set(
        Math.cos(time * 0.09) * radius,
        2.1 + Math.sin(time * 0.31) * 0.28,
        Math.sin(time * 0.09) * radius,
      );
      camera.fov = 40;
      camera.lookAt(0, 0.7, 0);
      camera.updateProjectionMatrix();
    },
    dispose() {
      scene.remove(group);
      scene.environment = null;
      scene.background = null;
      scene.fog = null;
      skyTexture.dispose();
      environmentTexture.dispose();
      group.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose?.();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
          else child.material?.dispose?.();
        }
      });
    },
  };
}
