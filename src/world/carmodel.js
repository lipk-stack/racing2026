/**
 * Procedural car models.
 *
 * Every car in the roster is lofted at runtime from its own dimensions and body profile: a lower
 * body shell, a glass cabin, a roof panel, four wheels with brake discs, lights, a spoiler and an
 * underglow plane. No mesh files, no downloads - and because the shape is driven by the same data
 * the physics reads, a wide car is wide in both.
 */

import * as THREE from "three";

const SECTION_SEGMENTS = 14;

/** Superellipse cross-section: `power` below 1 squares the section off, above 1 rounds it. */
function section(halfWidth, bottom, top, power = 0.55) {
  const points = [];
  const centreY = (top + bottom) / 2;
  const halfHeight = Math.max(0.02, (top - bottom) / 2);
  for (let i = 0; i < SECTION_SEGMENTS; i += 1) {
    const angle = (i / SECTION_SEGMENTS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    points.push([
      Math.sign(cos) * Math.abs(cos) ** power * halfWidth,
      centreY + Math.sign(sin) * Math.abs(sin) ** power * halfHeight,
    ]);
  }
  return points;
}

/** Loft a list of stations (each with a z and a cross-section) into a closed shell. */
function loft(stations) {
  const positions = [];
  const indices = [];
  const ringSize = SECTION_SEGMENTS;

  stations.forEach((station) => {
    station.points.forEach(([x, y]) => positions.push(x, y, station.z));
  });

  for (let s = 0; s < stations.length - 1; s += 1) {
    for (let i = 0; i < ringSize; i += 1) {
      const next = (i + 1) % ringSize;
      const a = s * ringSize + i;
      const b = s * ringSize + next;
      const c = (s + 1) * ringSize + next;
      const d = (s + 1) * ringSize + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  // Flat caps at both ends.
  const capStart = positions.length / 3;
  const first = stations[0];
  const last = stations[stations.length - 1];
  positions.push(0, first.points.reduce((sum, p) => sum + p[1], 0) / ringSize, first.z);
  positions.push(0, last.points.reduce((sum, p) => sum + p[1], 0) / ringSize, last.z);
  for (let i = 0; i < ringSize; i += 1) {
    const next = (i + 1) % ringSize;
    indices.push(capStart, next, i);
    indices.push(capStart + 1, (stations.length - 1) * ringSize + i, (stations.length - 1) * ringSize + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Per-profile shaping: where the cabin sits, how the nose drops, how the tail is cut. */
const PROFILES = {
  gt: { cabin: [0.34, 0.74], nose: 0.32, tail: 0.5, shoulder: 1, roofDrop: 0.1 },
  berlinetta: { cabin: [0.33, 0.72], nose: 0.28, tail: 0.55, shoulder: 1.02, roofDrop: 0.12 },
  wedge: { cabin: [0.36, 0.72], nose: 0.2, tail: 0.62, shoulder: 1.05, roofDrop: 0.16 },
  longtail: { cabin: [0.3, 0.66], nose: 0.24, tail: 0.42, shoulder: 1, roofDrop: 0.14 },
  longnose: { cabin: [0.45, 0.82], nose: 0.4, tail: 0.52, shoulder: 0.98, roofDrop: 0.06 },
  coupe: { cabin: [0.4, 0.78], nose: 0.38, tail: 0.5, shoulder: 0.96, roofDrop: 0.04 },
  widebody: { cabin: [0.38, 0.78], nose: 0.36, tail: 0.48, shoulder: 1.08, roofDrop: 0.05 },
};

function bodyGeometry(car) {
  const shape = PROFILES[car.profile] || PROFILES.gt;
  const { length, width, height } = car.body;
  const halfLength = length / 2;
  const stations = [];
  const count = 24;

  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const z = -halfLength + t * length;

    // Plan-view width: pinched at the nose, full over the axles, tucked at the tail.
    const planWidth = 0.62
      + 0.38 * Math.sin(Math.min(1, t / 0.22) * Math.PI * 0.5)
      - 0.16 * Math.max(0, t - 0.86) * 6;
    const shoulder = clampNumber(planWidth, 0.5, 1) * shape.shoulder;

    // Side view: low nose rising over the front axle, flat beltline, cut tail.
    const noseRise = Math.min(1, t / 0.24);
    const tailCut = t > 0.9 ? (t - 0.9) * 5 : 0;
    const belt = height * (0.34 + 0.14 * noseRise - shape.nose * 0.08 - tailCut * 0.06);
    const floor = height * (0.1 + (t < 0.1 || t > 0.94 ? 0.03 : 0));

    stations.push({
      z,
      points: section((width / 2) * shoulder, floor, belt + height * 0.06, 0.5),
    });
  }
  return loft(stations);
}

function cabinGeometry(car) {
  const shape = PROFILES[car.profile] || PROFILES.gt;
  const { length, width, height } = car.body;
  const halfLength = length / 2;
  const [start, end] = shape.cabin;
  const stations = [];
  const count = 14;

  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const along = start + (end - start) * t;
    const z = -halfLength + along * length;
    // Greenhouse tapers in plan and in height toward both screens.
    const taper = Math.sin(Math.min(1, Math.max(0.001, t)) * Math.PI) ** 0.55;
    const halfWidth = (width / 2) * (0.62 + 0.22 * taper);
    const roof = height * (0.42 + (0.52 - shape.roofDrop) * taper);
    stations.push({ z, points: section(halfWidth, height * 0.3, roof, 0.62) });
  }
  return loft(stations);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wheelMesh(radius, width, rimColor) {
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 22, 1),
    new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.92, metalness: 0.02 }),
  );
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  group.add(tyre);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, width * 1.02, 20, 1),
    new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.28, metalness: 0.92 }),
  );
  rim.rotation.z = Math.PI / 2;
  group.add(rim);

  const spokes = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.44, radius * 0.07, 6, 14),
    new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.3, metalness: 0.9 }),
  );
  spokes.rotation.y = Math.PI / 2;
  group.add(spokes);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width * 0.28, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.45, metalness: 0.6, emissive: 0x000000 }),
  );
  disc.rotation.z = Math.PI / 2;
  group.add(disc);
  group.userData.disc = disc;
  return group;
}

function spoiler(car, paint) {
  const { width, length, height } = car.body;
  const kind = car.body.spoiler || "lip";
  const group = new THREE.Group();
  const z = length / 2 - length * 0.06;

  if (kind === "lip" || kind === "duck") {
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.84, height * (kind === "duck" ? 0.09 : 0.045), length * 0.07),
      paint,
    );
    lip.position.set(0, height * (kind === "duck" ? 0.52 : 0.47), z);
    group.add(lip);
  } else {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, height * 0.045, length * 0.09), paint);
    blade.position.set(0, height * (kind === "swan" ? 0.72 : 0.64), z);
    blade.castShadow = true;
    group.add(blade);
    const strutGeometry = new THREE.BoxGeometry(width * 0.035, height * 0.22, length * 0.03);
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(strutGeometry, paint);
      strut.position.set(side * width * (kind === "swan" ? 0.34 : 0.38), height * (kind === "swan" ? 0.62 : 0.55), z);
      group.add(strut);
    }
  }
  return group;
}

/**
 * Build a complete car. `options.simple` drops shadow casting and the smaller details for cars that
 * are only ever seen at a distance (the rival field on the mobile tier).
 */
export function createCarModel(car, options = {}) {
  const { color = car.color, accent = car.accent, simple = false } = options;
  const group = new THREE.Group();
  const { width, length, height, wheelRadius } = car.body;

  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.55,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    envMapIntensity: 1.25,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(car.roof || 0x10151b),
    metalness: 0.4,
    roughness: 0.42,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a1018,
    metalness: 0.1,
    roughness: 0.06,
    transmission: 0.28,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1,
    envMapIntensity: 1.8,
  });

  const body = new THREE.Mesh(bodyGeometry(car), paint);
  body.castShadow = !simple;
  body.receiveShadow = !simple;
  group.add(body);

  const cabin = new THREE.Mesh(cabinGeometry(car), glass);
  cabin.castShadow = !simple;
  group.add(cabin);

  // Roof panel in body colour so the greenhouse reads as glass plus metal, not a bubble.
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.6, height * 0.03, length * 0.2),
    trim,
  );
  const profile = PROFILES[car.profile] || PROFILES.gt;
  roof.position.set(0, height * (0.9 - profile.roofDrop), -length / 2 + length * ((profile.cabin[0] + profile.cabin[1]) / 2));
  group.add(roof);

  // Lights.
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f8ff,
    emissive: 0xdfefff,
    emissiveIntensity: 2.1,
    roughness: 0.2,
  });
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: 0x330607,
    emissive: 0xff2626,
    emissiveIntensity: 2.4,
    roughness: 0.3,
  });
  const headlights = [];
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(width * 0.2, height * 0.05, length * 0.02), headlightMaterial);
    lamp.position.set(side * width * 0.29, height * 0.4, -length / 2 + length * 0.03);
    group.add(lamp);
    headlights.push(lamp);
  }
  const tailLight = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.78, height * 0.045, length * 0.015),
    tailMaterial,
  );
  tailLight.position.set(0, height * 0.44, length / 2 - length * 0.012);
  group.add(tailLight);

  const accentStripe = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.06, height * 0.012, length * 0.86),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), emissive: new THREE.Color(accent), emissiveIntensity: 0.35, roughness: 0.4 }),
  );
  accentStripe.position.set(0, height * 0.56, 0);
  group.add(accentStripe);

  group.add(spoiler(car, paint));

  // Wheels.
  const wheels = [];
  const axleZ = (car.sim.wheelbase / 2) * 0.98;
  const trackHalf = width / 2 - wheelRadius * 0.28;
  for (const [zi, xi] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const wheel = wheelMesh(wheelRadius, wheelRadius * 0.62, new THREE.Color(accent).lerp(new THREE.Color(0x9aa4ad), 0.55));
    wheel.position.set(xi * trackHalf, wheelRadius, zi * axleZ);
    wheel.userData.front = zi < 0;
    group.add(wheel);
    wheels.push(wheel);
  }

  // Nitro underglow: a single additive plane that only shows when the bottle is open.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.5, length * 1.15),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.06;
  group.add(glow);

  // Exhaust flame, shown on shifts and nitrous.
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.09, length * 0.22, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, height * 0.24, length / 2 + length * 0.06);
  group.add(flame);

  group.userData = {
    car,
    wheels,
    headlights,
    tailLight,
    tailMaterial,
    glow,
    flame,
    paint,
    wheelRadius,
  };
  return group;
}

/** Per-frame animation shared by the player car, the rivals and the showroom turntable. */
export function updateCarModel(model, { speed = 0, steer = 0, brake = 0, nitro = 0, boostFlash = 0, dt = 0.016 } = {}) {
  const data = model.userData;
  if (!data?.wheels) return;
  const spin = (speed * dt) / Math.max(0.1, data.wheelRadius);
  for (const wheel of data.wheels) {
    wheel.rotation.x -= spin;
    if (wheel.userData.front) wheel.rotation.y = steer * 0.5;
    const disc = wheel.userData.disc;
    if (disc) disc.material.emissive.setHex(brake > 0.4 ? 0x8f1f10 : 0x000000);
  }
  data.tailMaterial.emissiveIntensity = 2.2 + brake * 5;
  data.glow.material.opacity = nitro * 0.55;
  data.flame.material.opacity = Math.max(nitro * 0.5, boostFlash);
  data.flame.scale.setScalar(0.8 + boostFlash * 0.9);
}
