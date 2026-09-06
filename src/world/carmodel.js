/**
 * Car model assembly.
 *
 * Puts a car together from three layers: the blueprint in `src/data/carbodies.js` (real dimensions
 * and design landmarks), the surfacing engine in `carbody.js` (body shell, greenhouse, arches) and
 * the detail builders in `carparts.js` (lights, wheels, apertures, aero).
 *
 * Geometry is cached per car, so six rivals and a police pack cost one build each and share the
 * buffers; only materials are cloned when a rival wants a different colour.
 */

import * as THREE from "three";
import { carBlueprint } from "../data/carbodies.js";
import {
  buildArchLiner,
  buildBody,
  buildGreenhouse,
  buildPillars,
  buildRoofPanel,
  profileAt,
} from "./carbody.js";
import {
  buildDiffuser,
  buildExhaust,
  buildIntakes,
  buildLights,
  buildMirrors,
  buildInterior,
  buildShutlines,
  buildSideIntake,
  buildSplitter,
  buildWheel,
  buildWing,
} from "./carparts.js";

const geometryCache = new Map();

/** Turn a pure geometry payload from `carbody.js` into a `BufferGeometry`. */
function toBufferGeometry(payload) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(payload.positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(payload.normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(payload.uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(payload.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function cachedGeometry(carId, blueprint) {
  const cached = geometryCache.get(carId);
  if (cached) return cached;
  const built = {
    body: toBufferGeometry(buildBody(blueprint)),
    glass: toBufferGeometry(buildGreenhouse(blueprint)),
    roof: toBufferGeometry(buildRoofPanel(blueprint)),
    pillars: toBufferGeometry(buildPillars(blueprint)),
    frontLiner: toBufferGeometry(buildArchLiner(blueprint, "front")),
    rearLiner: toBufferGeometry(buildArchLiner(blueprint, "rear")),
  };
  geometryCache.set(carId, built);
  return built;
}

/** The shared material set. Paint is per-instance; everything else is common to all cars. */
function createMaterials(car, colour, accent) {
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colour),
      metalness: 0.62,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.055,
      envMapIntensity: 1.35,
    }),
    trim: new THREE.MeshStandardMaterial({ color: 0x14171b, metalness: 0.5, roughness: 0.42 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x0d0f12, metalness: 0.42, roughness: 0.34 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc8ced4, metalness: 1, roughness: 0.14 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0b0d10, metalness: 0.02, roughness: 0.94 }),
    mesh: new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.3, roughness: 0.72 }),
    shutline: new THREE.MeshBasicMaterial({
      color: 0x05070a,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
    disc: new THREE.MeshStandardMaterial({ color: 0x2f343a, metalness: 0.7, roughness: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x18202b,
      metalness: 0.12,
      roughness: 0.035,
      transmission: 0.34,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1,
      envMapIntensity: 2.1,
    }),
    cabin: new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.1, roughness: 0.85 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xf4f9ff, emissive: 0xdcecff, emissiveIntensity: 2.2, roughness: 0.2 }),
    lampGlass: new THREE.MeshPhysicalMaterial({
      color: 0x1b2028,
      metalness: 0.2,
      roughness: 0.08,
      clearcoat: 1,
      envMapIntensity: 2,
    }),
    lampHousing: new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.5, roughness: 0.35 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x3a0708, emissive: 0xff2323, emissiveIntensity: 2.4, roughness: 0.3 }),
    accent: new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent),
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.3,
      roughness: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  };
}

/**
 * Build a complete car.
 * `options.color` overrides the roster paint (rivals), `options.accent` the trim colour.
 */
export function createCarModel(car, options = {}) {
  const blueprint = carBlueprint(options.blueprintId || car.id);
  const materials = createMaterials(car, options.color ?? car.color, options.accent ?? car.accent);
  const geometry = cachedGeometry(blueprint.id, blueprint);
  const group = new THREE.Group();

  const body = new THREE.Mesh(geometry.body, materials.paint);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const glass = new THREE.Mesh(geometry.glass, materials.glass);
  glass.castShadow = true;
  group.add(glass);

  const roofMaterial = blueprint.extras.carbonRoof ? materials.carbon : materials.paint;
  group.add(new THREE.Mesh(geometry.roof, roofMaterial));
  group.add(new THREE.Mesh(geometry.pillars, materials.paint));

  for (const liner of [geometry.frontLiner, geometry.rearLiner]) {
    group.add(new THREE.Mesh(liner, materials.mesh));
  }

  const { group: lights, headlights, tailLamp } = buildLights(blueprint, materials);
  group.add(lights);

  group.add(buildIntakes(blueprint, materials));
  const sideIntake = buildSideIntake(blueprint, materials);
  if (sideIntake) group.add(sideIntake);
  group.add(buildSplitter(blueprint, materials));
  group.add(buildDiffuser(blueprint, materials));
  group.add(buildWing(blueprint, materials, materials.paint));
  group.add(buildExhaust(blueprint, materials));
  group.add(buildMirrors(blueprint, materials, materials.paint));
  group.add(buildInterior(blueprint, materials));
  group.add(buildShutlines(blueprint, materials));

  // Wheels, on the real track width with the car's own staggered tyres.
  const wheels = [];
  for (const [which, axle, track, tyre] of [
    ["front", blueprint.frontAxle, blueprint.track[0], blueprint.tyre.front],
    ["rear", blueprint.rearAxle, blueprint.track[1], blueprint.tyre.rear],
  ]) {
    for (const side of [-1, 1]) {
      const wheel = buildWheel(blueprint, which, materials);
      wheel.position.set(side * (track / 2 - tyre.width * 0.5), tyre.radius, axle);
      wheel.userData.front = which === "front";
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    }
  }

  // An accent stripe along the shoulder, which is what makes a rival's colour readable at distance.
  const shoulder = profileAt(blueprint, 0.55);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.01, blueprint.length * 0.4),
    materials.accent,
  );
  stripe.position.set(0, shoulder.deck + 0.014, shoulder.z);
  group.add(stripe);

  // Nitrous underglow and an exhaust flame for shifts.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(blueprint.width * 1.5, blueprint.length * 1.1),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(options.accent ?? car.accent),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  group.add(glow);

  const tailProfile = profileAt(blueprint, 0.99);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(blueprint.width * 0.07, blueprint.length * 0.18, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, tailProfile.floor + 0.09, tailProfile.z + blueprint.length * 0.06);
  group.add(flame);

  group.userData = {
    car,
    blueprint,
    wheels,
    headlights,
    tailLight: tailLamp,
    tailMaterial: materials.tail,
    glow,
    flame,
    paint: materials.paint,
    materials,
    wheelRadius: blueprint.tyre.rear.radius,
  };
  return group;
}

/** Per-frame animation shared by the player car, the rivals, the police and the showroom. */
export function updateCarModel(model, { speed = 0, steer = 0, brake = 0, nitro = 0, boostFlash = 0, dt = 0.016 } = {}) {
  const data = model.userData;
  if (!data?.wheels) return;
  const spin = (speed * dt) / Math.max(0.1, data.wheelRadius);
  for (const wheel of data.wheels) {
    wheel.rotation.x -= spin;
    if (wheel.userData.front) wheel.rotation.y = steer * 0.42;
    const disc = wheel.userData.disc;
    if (disc) disc.material.emissive.setHex(brake > 0.4 ? 0x7d1a0c : 0x000000);
  }
  data.tailMaterial.emissiveIntensity = 2.2 + brake * 5;
  data.glow.material.opacity = nitro * 0.55;
  data.flame.material.opacity = Math.max(nitro * 0.5, boostFlash);
  data.flame.scale.setScalar(0.8 + boostFlash * 0.9);
}

/** Free the shared geometry cache (used when the renderer is torn down). */
export function disposeCarGeometry() {
  for (const set of geometryCache.values()) {
    for (const geometry of Object.values(set)) geometry.dispose();
  }
  geometryCache.clear();
}
