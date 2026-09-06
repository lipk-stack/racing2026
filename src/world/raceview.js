/**
 * Race view.
 *
 * Binds a headless `race` to the 3D scene: builds the circuit and one car model per entrant, then
 * pushes the simulation's poses into the scene every frame and drives the camera rig, the player's
 * headlights, the tyre smoke and the police lightbars.
 */

import * as THREE from "three";
import { CARS } from "../data/cars.js";
import { createCarModel, updateCarModel } from "./carmodel.js";
import { buildGates, buildTrackMeshes } from "./track.js";
import { createEnvironment, createParticleSystem } from "./environment.js";

export const CAMERA_MODES = ["chase", "hood", "bumper", "cinematic"];

const CAMERA_RIGS = {
  chase: { back: 6.6, height: 2.55, look: 15, fovBoost: 1 },
  hood: { back: -0.2, height: 1.28, look: 18, fovBoost: 0.86 },
  bumper: { back: -2.1, height: 0.72, look: 20, fovBoost: 0.8 },
  cinematic: { back: 11, height: 3.9, look: 16, fovBoost: 1.15 },
};

/**
 * Place a car in the world.
 *
 * Car models are built nose-first along -Z, so aligning that with a track heading measured as
 * atan2(dz, dx) needs a quarter turn the other way: rotate by -(heading + PI/2).
 */
function applyPose(model, pose) {
  model.position.set(pose.x, pose.y, pose.z);
  model.rotation.set(0, -pose.heading - Math.PI / 2, pose.banking * 0.7);
}

export function createRaceView(renderCtx, race) {
  const { scene } = renderCtx;
  const group = new THREE.Group();
  scene.add(group);

  const environment = createEnvironment(renderCtx, race.track);
  const track = buildTrackMeshes(race.path, race.track);
  group.add(track.group);

  const gates = race.gates.length ? buildGates(race.path, race.gates, race.track.theme.barrierGlow) : null;
  if (gates) group.add(gates);

  const particles = createParticleSystem(scene, environment.particleTexture, Math.round(520 * renderCtx.settings.particles));

  // --- cars -----------------------------------------------------------------
  const playerCar = CARS[race.player.carId];
  const playerModel = createCarModel(playerCar);
  group.add(playerModel);

  const rivalModels = new Map();
  for (const rival of race.rivals) {
    const model = createCarModel(CARS[rival.carId], { color: rival.color, simple: renderCtx.tier === "mobile" });
    group.add(model);
    rivalModels.set(rival.id, model);
  }

  const policePool = [];
  function policeModel(index) {
    while (policePool.length <= index) {
      const model = createCarModel(CARS.fordmustang, { color: "#e9edf2", accent: "#0f1318", simple: renderCtx.tier === "mobile" });
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.16, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x101318, emissive: 0xff2020, emissiveIntensity: 3 }),
      );
      bar.position.set(0, CARS.fordmustang.body.height * 0.98, 0);
      model.add(bar);
      model.userData.lightbar = bar;
      model.visible = false;
      group.add(model);
      policePool.push(model);
    }
    return policePool[index];
  }

  // Headlights: real spot lights for the player only - everyone else gets emissive lamps, which is
  // where the frame budget is best spent.
  // Daylight washes a headlight out; at night it is the only thing lighting the road.
  const headlightPower = race.track.timeOfDay === "night" ? 430 : 150;

  // A soft fill above the hero car: at night an unlit car reads as a hole in the road, and every
  // racing game solves it the same way - light the car the player is driving.
  const heroFill = new THREE.PointLight(0xbfd8ff, 26, 14, 2);
  heroFill.position.set(0, 3.4, -0.6);
  playerModel.add(heroFill);

  const headlights = [];
  for (const side of [-1, 1]) {
    const light = new THREE.SpotLight(0xdfefff, headlightPower, 190, 0.44, 0.5, 1.2);
    light.position.set(side * 0.6, 0.62, -1.6);
    light.target.position.set(side * 0.3, -0.9, -38);
    playerModel.add(light);
    playerModel.add(light.target);
    headlights.push(light);
  }

  const cameraTarget = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const focus = new THREE.Vector3();
  let shake = 0;
  let cinematicAngle = 0;

  function updateCamera(pose, mode, dt, speedRatio) {
    const rig = CAMERA_RIGS[mode] || CAMERA_RIGS.chase;
    const heading = pose.heading;
    focus.set(pose.x, pose.y + 0.9, pose.z);

    if (mode === "cinematic") {
      cinematicAngle += dt * 0.22;
      const radius = rig.back + Math.sin(cinematicAngle * 0.7) * 3.5;
      desired.set(
        pose.x - Math.cos(heading + Math.sin(cinematicAngle) * 0.9) * radius,
        pose.y + rig.height,
        pose.z - Math.sin(heading + Math.sin(cinematicAngle) * 0.9) * radius,
      );
    } else {
      // Trail the car's own heading, but lag it slightly so a slide is visible from behind.
      const drag = mode === "chase" ? pose.yaw * 0.55 : pose.yaw * 0.15;
      const back = rig.back + speedRatio * 1.4;
      desired.set(
        pose.x - Math.cos(heading - drag) * back,
        pose.y + rig.height + speedRatio * 0.25,
        pose.z - Math.sin(heading - drag) * back,
      );
    }

    const follow = mode === "chase" ? 6.5 : mode === "cinematic" ? 2.4 : 18;
    lookTarget.set(
      pose.x + Math.cos(heading) * rig.look,
      pose.y + 1.1,
      pose.z + Math.sin(heading) * rig.look,
    );
    // A big jump means the race just started or the simulation was fast-forwarded: cut, do not pan.
    if (cameraPosition.distanceTo(desired) > 40) {
      cameraPosition.copy(desired);
      cameraTarget.copy(lookTarget);
    }
    cameraPosition.lerp(desired, Math.min(1, follow * dt));
    cameraTarget.lerp(lookTarget, Math.min(1, 9 * dt));

    const camera = renderCtx.camera;
    camera.position.copy(cameraPosition);
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.9;
      camera.position.y += (Math.random() - 0.5) * shake * 0.6;
      camera.position.z += (Math.random() - 0.5) * shake * 0.9;
      shake = Math.max(0, shake - dt * 2.4);
    }
    camera.lookAt(cameraTarget);
    camera.rotation.z += pose.drift * 0.12;
    return rig;
  }

  return {
    group,
    playerModel,
    environment,
    particles,
    addShake(amount) {
      shake = Math.min(1.4, shake + amount);
    },
    /**
     * Push one frame of simulation into the scene.
     * `state` carries the presentation-only values (camera mode, control positions, nitro flash).
     */
    update(snapshot, state, dt) {
      const { player, rivals, police } = snapshot;
      applyPose(playerModel, player);
      updateCarModel(playerModel, {
        speed: player.speed,
        steer: state.steer,
        brake: state.brake,
        nitro: state.nitro,
        boostFlash: state.boostFlash,
        dt,
      });

      for (const rival of rivals) {
        const model = rivalModels.get(rival.id);
        if (!model) continue;
        applyPose(model, rival);
        updateCarModel(model, { speed: rival.speed, steer: rival.yaw * 0.6, brake: 0, nitro: 0, dt });
      }
      for (const [id, model] of rivalModels) {
        model.visible = rivals.some((rival) => rival.id === id);
      }

      police.forEach((unit, index) => {
        const model = policeModel(index);
        model.visible = true;
        applyPose(model, unit);
        updateCarModel(model, { speed: unit.speed, steer: 0, brake: 0, nitro: 0, dt });
        const bar = model.userData.lightbar;
        if (bar) {
          const flash = Math.sin(state.time * 14 + index) > 0;
          bar.material.emissive.setHex(flash ? 0xff2020 : 0x2060ff);
          bar.material.emissiveIntensity = 3.4;
        }
      });
      for (let i = police.length; i < policePool.length; i += 1) policePool[i].visible = false;

      if (gates) {
        for (const arch of gates.children) {
          const gate = arch.userData.gate;
          arch.visible = !gate.hit;
        }
      }

      // Tyre smoke only once the rear axle is genuinely past its peak; spray on a wet road.
      if (state.slip > 0.55 && player.speed > 12) {
        particles.emit("smoke", { x: player.x, y: player.y + 0.15, z: player.z }, 1);
      }
      if (state.wet && player.speed > 26 && Math.random() > 0.55) {
        particles.emit("spray", { x: player.x, y: player.y + 0.25, z: player.z }, 1);
      }
      particles.update(dt);

      const speedRatio = Math.min(1, player.speed / 90);
      const rig = updateCamera(player, state.cameraMode, dt, speedRatio);
      renderCtx.camera.fov = (58 + speedRatio * 14) * rig.fovBoost;
      renderCtx.camera.updateProjectionMatrix();

      for (const light of headlights) light.intensity = state.headlights ? headlightPower : 0;
      environment.update(renderCtx.camera.position, new THREE.Vector3(player.x, player.y, player.z), dt);
    },
    emit(kind, position, amount, direction) {
      particles.emit(kind, position, amount, direction);
    },
    dispose() {
      scene.remove(group);
      track.dispose();
      particles.dispose();
      environment.dispose();
      group.traverse((child) => {
        if (child.isMesh || child.isInstancedMesh) {
          child.geometry?.dispose?.();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
          else child.material?.dispose?.();
        }
      });
    },
  };
}
