/**
 * Car parts.
 *
 * The details that make a body identifiable: light signatures, wheels, apertures and aero. Light
 * graphics are extruded 2D shapes rather than boxes, because the shape of a lamp - four rings, a
 * hexagonal Y, a full-width bar - is most of what tells two cars apart at a glance.
 *
 * Every builder takes the blueprint and a shared material set, and returns a `THREE.Group` already
 * positioned in body space (nose at -Z).
 */

import * as THREE from "three";
import { profileAt } from "./carbody.js";

const EXTRUDE = { depth: 0.05, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 };

function shapeFrom(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

function extrude(points, depth, material) {
  const geometry = new THREE.ExtrudeGeometry(shapeFrom(points), { ...EXTRUDE, depth });
  geometry.center();
  return new THREE.Mesh(geometry, material);
}

/* ------------------------------------------------------------------ lamps -- */

/**
 * Front light glyphs. `w` and `h` are the lamp's envelope in metres.
 * Each returns a group whose origin is the centre of the lamp, facing -Z.
 */
const HEADLAMPS = {
  // 911 / Cayman: a round lens with the four-point daytime running light inside it.
  "round-quad": (w, h, mats) => {
    const group = new THREE.Group();
    const radius = Math.min(w, h) * 0.5;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(radius, 22), mats.lampGlass);
    group.add(lens);
    for (let i = 0; i < 4; i += 1) {
      const angle = Math.PI * (0.62 + i * 0.25);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.15, 12), mats.lamp);
      dot.position.set(Math.cos(angle) * radius * 0.52, Math.sin(angle) * radius * 0.52, 0.004);
      group.add(dot);
    }
    return group;
  },
  // Huracán: hexagonal housing with a Y of light across it.
  "hex-y": (w, h, mats) => {
    const group = new THREE.Group();
    const hex = extrude([[-w / 2, 0], [-w / 4, h / 2], [w / 4, h / 2], [w / 2, 0], [w / 4, -h / 2], [-w / 4, -h / 2]], 0.03, mats.lampHousing);
    group.add(hex);
    const bar = (points) => {
      const mesh = extrude(points, 0.012, mats.lamp);
      mesh.position.z = 0.02;
      return mesh;
    };
    group.add(bar([[-w * 0.42, h * 0.28], [-w * 0.02, h * 0.04], [-w * 0.02, -h * 0.06], [-w * 0.42, h * 0.16]]));
    group.add(bar([[-w * 0.42, -h * 0.3], [-w * 0.02, -h * 0.06], [-w * 0.02, -h * 0.16], [-w * 0.42, -h * 0.42]]));
    group.add(bar([[-w * 0.04, h * 0.06], [w * 0.44, h * 0.02], [w * 0.44, -h * 0.1], [-w * 0.04, -h * 0.06]]));
    return group;
  },
  // Ferrari / AMG / BMW: a slim unit with an L kink at the outer edge.
  "slim-l": (w, h, mats) => {
    const group = new THREE.Group();
    group.add(extrude([[-w / 2, h * 0.5], [w / 2, h * 0.2], [w / 2, -h * 0.5], [w * 0.24, -h * 0.2], [-w / 2, -h * 0.1]], 0.03, mats.lampHousing));
    const strip = extrude([[-w * 0.46, h * 0.34], [w * 0.44, h * 0.08], [w * 0.44, -h * 0.06], [-w * 0.46, h * 0.14]], 0.012, mats.lamp);
    strip.position.z = 0.02;
    group.add(strip);
    return group;
  },
  // McLaren: the hooked lamp that wraps into the bumper.
  hooked: (w, h, mats) => {
    const group = new THREE.Group();
    group.add(extrude([[-w / 2, h * 0.5], [w * 0.3, h * 0.32], [w / 2, -h * 0.1], [w * 0.1, -h * 0.5], [-w * 0.2, -h * 0.2], [-w / 2, 0]], 0.03, mats.lampHousing));
    const strip = extrude([[-w * 0.44, h * 0.3], [w * 0.26, h * 0.16], [w * 0.36, -h * 0.16], [w * 0.1, -h * 0.34], [w * 0.04, -h * 0.12], [-w * 0.44, h * 0.12]], 0.012, mats.lamp);
    strip.position.z = 0.02;
    group.add(strip);
    return group;
  },
  // GT-R: the swept boomerang.
  boomerang: (w, h, mats) => {
    const group = new THREE.Group();
    group.add(extrude([[-w / 2, h * 0.4], [w * 0.36, h * 0.5], [w / 2, 0], [w * 0.2, -h * 0.5], [-w / 2, -h * 0.2]], 0.03, mats.lampHousing));
    const strip = extrude([[-w * 0.44, h * 0.26], [w * 0.34, h * 0.36], [w * 0.42, h * 0.06], [-w * 0.44, h * 0.02]], 0.012, mats.lamp);
    strip.position.z = 0.02;
    group.add(strip);
    return group;
  },
  // Z: the round-in-a-teardrop lamps.
  "round-twin": (w, h, mats) => {
    const group = new THREE.Group();
    group.add(extrude([[-w / 2, h * 0.5], [w / 2, h * 0.34], [w / 2, -h * 0.34], [-w / 2, -h * 0.5]], 0.03, mats.lampHousing));
    for (const side of [-1, 1]) {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(h * 0.3, 16), mats.lamp);
      dot.position.set(side * w * 0.2, 0, 0.02);
      group.add(dot);
    }
    return group;
  },
  // Mustang: three vertical bars.
  "tri-bar": (w, h, mats) => {
    const group = new THREE.Group();
    group.add(extrude([[-w / 2, h * 0.5], [w / 2, h * 0.4], [w / 2, -h * 0.4], [-w / 2, -h * 0.5]], 0.03, mats.lampHousing));
    for (let i = 0; i < 3; i += 1) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.16, h * 0.66), mats.lamp);
      bar.position.set((i - 1) * w * 0.26, 0, 0.02);
      group.add(bar);
    }
    return group;
  },
  wrap: (w, h, mats) => {
    const group = new THREE.Group();
    group.add(extrude([[-w / 2, h * 0.5], [w / 2, h * 0.24], [w / 2, -h * 0.3], [-w / 2, -h * 0.4]], 0.03, mats.lampHousing));
    const strip = extrude([[-w * 0.44, h * 0.3], [w * 0.42, h * 0.1], [w * 0.42, -h * 0.08], [-w * 0.44, h * 0.08]], 0.012, mats.lamp);
    strip.position.z = 0.02;
    group.add(strip);
    return group;
  },
};

/** Rear light glyphs. Built in the tail plane, facing +Z. */
const TAILLAMPS = {
  // 992: the full-width bar every 911 has worn since 2019.
  "full-bar": (width, mats) => {
    const group = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.08, 0.04), mats.lampHousing);
    group.add(housing);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.045, 0.02), mats.tail);
    bar.position.z = 0.02;
    group.add(bar);
    return group;
  },
  "quad-round": (width, mats) => {
    const group = new THREE.Group();
    for (let i = 0; i < 4; i += 1) {
      const side = i < 2 ? -1 : 1;
      const inner = i % 2 === 0 ? 0.2 : 0.36;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 18), mats.tail);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(side * width * inner, 0, 0.01);
      group.add(ring);
    }
    return group;
  },
  "hex-y": (width, mats) => {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const lamp = extrude([[-0.12, 0.05], [0.02, 0.07], [0.12, 0], [0.02, -0.07], [-0.12, -0.05]], 0.03, mats.tail);
      lamp.position.set(side * width * 0.33, 0, 0.01);
      group.add(lamp);
    }
    return group;
  },
  "slim-bar": (width, mats) => {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.055, 0.03), mats.tail);
      lamp.position.set(side * width * 0.3, 0, 0.01);
      group.add(lamp);
    }
    return group;
  },
  "l-shape": (width, mats) => {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const lamp = extrude([[-0.16, 0.06], [0.16, 0.06], [0.16, -0.02], [-0.02, -0.02], [-0.02, -0.07], [-0.16, -0.07]], 0.03, mats.tail);
      lamp.position.set(side * width * 0.31, 0, 0.01);
      lamp.scale.x = side;
      group.add(lamp);
    }
    return group;
  },
  "tri-bar": (width, mats) => {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.075, 0.11, 0.03), mats.tail);
        bar.position.set(side * (width * 0.18 + i * width * 0.085), 0, 0.01);
        group.add(bar);
      }
    }
    return group;
  },
  "round-twin": (width, mats) => {
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 20), mats.tail);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(side * width * 0.3, 0, 0.01);
      group.add(ring);
    }
    return group;
  },
  wrap: (width, mats) => TAILLAMPS["slim-bar"](width, mats),
};

/* ----------------------------------------------------------------- wheels -- */

/** Tyre cross-section revolved into a carcass with a real sidewall bulge and a crowned tread. */
function tyreGeometry(radius, width) {
  const rim = radius - width * 0.35;
  const half = width / 2;
  const profile = [
    new THREE.Vector2(rim, -half),
    new THREE.Vector2(radius * 0.86, -half * 1.05),
    new THREE.Vector2(radius * 0.99, -half * 0.86),
    new THREE.Vector2(radius, -half * 0.5),
    new THREE.Vector2(radius, half * 0.5),
    new THREE.Vector2(radius * 0.99, half * 0.86),
    new THREE.Vector2(radius * 0.86, half * 1.05),
    new THREE.Vector2(rim, half),
  ];
  const geometry = new THREE.LatheGeometry(profile, 30);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/**
 * A wheel: tyre, rim barrel, spokes in the car's own pattern, brake disc and caliper.
 * `updateCarModel` spins the group on X and reads `userData.disc` to glow the brakes.
 */
export function buildWheel(blueprint, which, mats) {
  const tyre = which === "front" ? blueprint.tyre.front : blueprint.tyre.rear;
  const { spokes, style, colour, dish } = blueprint.rim;
  const group = new THREE.Group();
  const rimRadius = tyre.rim / 2;

  const carcass = new THREE.Mesh(tyreGeometry(tyre.radius, tyre.width), mats.rubber);
  carcass.castShadow = true;
  group.add(carcass);

  const rimMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour), metalness: 0.92, roughness: 0.26 });
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(rimRadius, rimRadius, tyre.width * 0.92, 28, 1, true),
    rimMaterial,
  );
  barrel.rotation.z = Math.PI / 2;
  group.add(barrel);

  const face = new THREE.Mesh(new THREE.CircleGeometry(rimRadius * 0.34, 20), rimMaterial);
  face.rotation.y = Math.PI / 2;
  face.position.x = tyre.width * (0.5 - dish);
  group.add(face);

  // Spokes: one tapered blade per spoke, doubled for a twin pattern, split into a V for a Y.
  const spokeCount = Math.max(4, spokes);
  const spokeGeometry = new THREE.BoxGeometry(rimRadius * 0.9, rimRadius * 0.14, tyre.width * 0.16);
  for (let i = 0; i < spokeCount; i += 1) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const offsets = style === "twin" ? [-0.07, 0.07] : style === "y" ? [-0.1, 0.1] : [0];
    for (const offset of offsets) {
      const spoke = new THREE.Mesh(spokeGeometry, rimMaterial);
      spoke.position.set(
        tyre.width * (0.42 - dish),
        Math.sin(angle) * rimRadius * 0.55,
        Math.cos(angle) * rimRadius * 0.55,
      );
      spoke.rotation.x = -angle + offset;
      spoke.rotation.z = Math.PI / 2;
      spoke.scale.y = style === "y" ? 0.8 : 1;
      group.add(spoke);
    }
  }

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(rimRadius * 0.78, rimRadius * 0.78, tyre.width * 0.12, 24),
    mats.disc,
  );
  disc.rotation.z = Math.PI / 2;
  group.add(disc);
  group.userData.disc = disc;

  const caliper = new THREE.Mesh(
    new THREE.TorusGeometry(rimRadius * 0.74, rimRadius * 0.13, 6, 10, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(blueprint.caliper), metalness: 0.4, roughness: 0.45 }),
  );
  caliper.rotation.y = Math.PI / 2;
  caliper.rotation.z = Math.PI * 0.62;
  caliper.position.x = -tyre.width * 0.12;
  group.add(caliper);

  return group;
}

/* ------------------------------------------------------------- apertures -- */

/** Front bumper apertures, as recessed dark volumes cut into the nose. */
export function buildIntakes(blueprint, mats) {
  const group = new THREE.Group();
  const kind = blueprint.face.intake;
  const nose = profileAt(blueprint, 0.035);
  const width = nose.halfWidth * 2;
  const y = nose.floor + (nose.deck - nose.floor) * 0.32;
  const add = (w, h, x, yy, depth = 0.1) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mats.mesh);
    mesh.position.set(x, yy, nose.z + depth * 0.35);
    group.add(mesh);
  };

  if (kind === "kidney") {
    for (const side of [-1, 1]) add(width * 0.2, (nose.deck - nose.floor) * 0.75, side * width * 0.13, y + 0.06);
  } else if (kind === "panamericana") {
    for (let i = -4; i <= 4; i += 1) add(width * 0.022, (nose.deck - nose.floor) * 0.6, i * width * 0.05, y + 0.08, 0.06);
  } else if (kind === "v-motion") {
    add(width * 0.42, (nose.deck - nose.floor) * 0.5, 0, y + 0.04);
    for (const side of [-1, 1]) add(width * 0.16, (nose.deck - nose.floor) * 0.34, side * width * 0.34, y - 0.03);
  } else if (kind === "hexagon") {
    add(width * 0.52, (nose.deck - nose.floor) * 0.46, 0, y + 0.02);
    for (const side of [-1, 1]) add(width * 0.14, (nose.deck - nose.floor) * 0.3, side * width * 0.36, y - 0.02);
  } else if (kind === "wedge") {
    for (const side of [-1, 1]) add(width * 0.3, (nose.deck - nose.floor) * 0.42, side * width * 0.28, y - 0.02, 0.14);
    add(width * 0.24, (nose.deck - nose.floor) * 0.2, 0, y - 0.06, 0.12);
  } else if (kind === "triple") {
    add(width * 0.26, (nose.deck - nose.floor) * 0.36, 0, y);
    for (const side of [-1, 1]) add(width * 0.2, (nose.deck - nose.floor) * 0.42, side * width * 0.32, y - 0.02);
  } else if (kind === "wide") {
    add(width * 0.66, (nose.deck - nose.floor) * 0.42, 0, y);
  } else {
    for (const side of [-1, 1]) add(width * 0.26, (nose.deck - nose.floor) * 0.4, side * width * 0.28, y);
  }
  return group;
}

/** Side intakes: the scoop or blade ahead of the rear arch on a mid-engined car. */
export function buildSideIntake(blueprint, mats) {
  const kind = blueprint.extras.sideIntake;
  if (!kind) return null;
  const group = new THREE.Group();
  const t = (blueprint.rearAxle - 0.62 + blueprint.length / 2) / blueprint.length;
  const at = profileAt(blueprint, t);
  const height = at.deck - at.floor;

  for (const side of [-1, 1]) {
    if (kind === "blade") {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, height * 0.66, 1.05), mats.trim);
      blade.position.set(side * (at.halfWidth - 0.012), at.floor + height * 0.62, at.z - 0.1);
      group.add(blade);
    } else if (kind === "door") {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.09, height * 0.34, 0.52), mats.mesh);
      scoop.position.set(side * (at.halfWidth - 0.03), at.floor + height * 0.5, at.z - 0.05);
      group.add(scoop);
    } else {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.1, height * 0.3, 0.46), mats.mesh);
      scoop.position.set(side * (at.halfWidth - 0.035), at.floor + height * 0.68, at.z);
      group.add(scoop);
    }
  }
  return group;
}

/* ------------------------------------------------------------------- aero -- */

export function buildSplitter(blueprint, mats) {
  const nose = profileAt(blueprint, 0.02);
  const depth = blueprint.face.splitter;
  const splitter = new THREE.Mesh(
    new THREE.BoxGeometry(nose.halfWidth * 2 * 0.96, 0.028, depth * 2.4),
    mats.carbon,
  );
  splitter.position.set(0, nose.floor + 0.01, nose.z + depth * 0.6);
  return splitter;
}

export function buildDiffuser(blueprint, mats) {
  const group = new THREE.Group();
  const tail = profileAt(blueprint, 0.975);
  const depth = blueprint.rear.diffuser;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(tail.halfWidth * 1.72, depth * 0.9, depth * 2.2), mats.carbon);
  shell.position.set(0, tail.floor + depth * 0.35, tail.z - depth * 0.9);
  group.add(shell);
  for (let i = -2; i <= 2; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, depth * 0.85, depth * 2.1), mats.carbon);
    fin.position.set(i * tail.halfWidth * 0.32, tail.floor + depth * 0.42, tail.z - depth * 0.9);
    group.add(fin);
  }
  return group;
}

export function buildWing(blueprint, mats, paint) {
  const kind = blueprint.rear.wing;
  const group = new THREE.Group();
  const deckT = kind === "ducktail" ? 0.93 : 0.88;
  const at = profileAt(blueprint, deckT);
  const span = at.halfWidth * 2 * 0.94;

  if (kind === "lip") {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(span, 0.02, 0.09), paint);
    lip.position.set(0, at.deck + 0.012, at.z + 0.06);
    lip.rotation.x = -0.14;
    group.add(lip);
  } else if (kind === "ducktail") {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(span * 0.98, 0.035, 0.2), paint);
    lip.position.set(0, at.deck + 0.05, at.z + 0.02);
    lip.rotation.x = -0.3;
    group.add(lip);
  } else if (kind === "active") {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(span * 0.9, 0.03, 0.19), mats.trim);
    blade.position.set(0, at.deck + 0.12, at.z + 0.02);
    blade.rotation.x = -0.22;
    group.add(blade);
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), mats.trim);
      strut.position.set(side * span * 0.3, at.deck + 0.06, at.z + 0.02);
      group.add(strut);
    }
  } else if (kind === "swan") {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(span, 0.035, 0.26), mats.carbon);
    blade.position.set(0, at.deck + 0.3, at.z + 0.05);
    blade.rotation.x = -0.2;
    group.add(blade);
    for (const side of [-1, 1]) {
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.05), mats.carbon);
      neck.position.set(side * span * 0.34, at.deck + 0.16, at.z + 0.01);
      neck.rotation.x = 0.22;
      group.add(neck);
    }
  } else {
    // Fixed race wing: a full-span blade on uprights.
    const blade = new THREE.Mesh(new THREE.BoxGeometry(span * 1.02, 0.04, 0.32), mats.carbon);
    blade.position.set(0, at.deck + 0.34, at.z + 0.08);
    blade.rotation.x = -0.24;
    group.add(blade);
    for (const side of [-1, 1]) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.1), mats.carbon);
      upright.position.set(side * span * 0.4, at.deck + 0.17, at.z + 0.05);
      group.add(upright);
    }
  }
  return group;
}

export function buildExhaust(blueprint, mats) {
  const group = new THREE.Group();
  const kind = blueprint.rear.exhaust;
  const tail = profileAt(blueprint, 0.985);
  const y = tail.floor + 0.08;
  const pipe = (x, radius, squareish = false) => {
    const mesh = new THREE.Mesh(
      squareish
        ? new THREE.BoxGeometry(radius * 2.4, radius * 1.5, 0.1)
        : new THREE.CylinderGeometry(radius, radius, 0.1, 14),
      mats.chrome,
    );
    if (!squareish) mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, tail.z - 0.02);
    group.add(mesh);
  };

  if (kind === "centre-quad") for (let i = 0; i < 4; i += 1) pipe((i - 1.5) * 0.1, 0.042);
  else if (kind === "centre-twin") for (const side of [-1, 1]) pipe(side * 0.075, 0.05);
  else if (kind === "quad-corner") for (const side of [-1, 1]) for (const inner of [0.44, 0.62]) pipe(side * tail.halfWidth * inner, 0.05);
  else if (kind === "quad-round") for (const side of [-1, 1]) for (const inner of [0.4, 0.62]) pipe(side * tail.halfWidth * inner, 0.055);
  else if (kind === "twin-square") for (const side of [-1, 1]) pipe(side * tail.halfWidth * 0.6, 0.055, true);
  else if (kind === "twin-oval") for (const side of [-1, 1]) pipe(side * tail.halfWidth * 0.58, 0.06, true);
  else for (const side of [-1, 1]) pipe(side * tail.halfWidth * 0.58, 0.055);
  return group;
}

export function buildMirrors(blueprint, mats, paint) {
  const group = new THREE.Group();
  const t = (blueprint.roof[0][0] + 0.04);
  const at = profileAt(blueprint, t);
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.03), mats.trim);
    stalk.position.set(side * (at.halfWidth + 0.03), at.deck + 0.02, at.z);
    group.add(stalk);
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.15), paint);
    pod.position.set(side * (at.halfWidth + 0.085), at.deck + 0.035, at.z);
    pod.rotation.y = side * 0.12;
    group.add(pod);
  }
  return group;
}

/** Head and tail light assemblies, placed on the real body surface. */
export function buildLights(blueprint, mats) {
  const group = new THREE.Group();
  const headlights = [];

  const noseT = 0.055;
  const nose = profileAt(blueprint, noseT);
  const lampWidth = nose.halfWidth * 0.52;
  const lampHeight = Math.min(0.19, (nose.deck - nose.floor) * 0.34);
  const builder = HEADLAMPS[blueprint.face.lamp] || HEADLAMPS.wrap;
  for (const side of [-1, 1]) {
    const lamp = builder(lampWidth, lampHeight, mats);
    lamp.position.set(side * nose.halfWidth * 0.56, nose.deck - lampHeight * 0.35, nose.z - 0.05);
    lamp.scale.x = side;
    group.add(lamp);
    headlights.push(lamp);
  }

  const tail = profileAt(blueprint, 0.97);
  const tailBuilder = TAILLAMPS[blueprint.rear.lamp] || TAILLAMPS["slim-bar"];
  const tailLamp = tailBuilder(tail.halfWidth * 2, mats);
  tailLamp.position.set(0, tail.deck - 0.09, tail.z + 0.06);
  group.add(tailLamp);

  return { group, headlights, tailLamp };
}

/**
 * A minimal cabin: tub, dashboard and two seat backs.
 * Glass only reads as glass when there is something behind it; an empty greenhouse reads as a hole.
 */
export function buildInterior(blueprint, mats) {
  const group = new THREE.Group();
  const roofStart = blueprint.roof[0][0];
  const roofEnd = blueprint.roof[blueprint.roof.length - 1][0];
  const front = profileAt(blueprint, roofStart + 0.04);
  const mid = profileAt(blueprint, (roofStart + roofEnd) / 2);

  const tub = new THREE.Mesh(
    new THREE.BoxGeometry(mid.halfWidth * 1.5, 0.1, (roofEnd - roofStart) * blueprint.length * 0.66),
    mats.cabin,
  );
  tub.position.set(0, mid.deck - 0.06, mid.z);
  group.add(tub);

  const dash = new THREE.Mesh(new THREE.BoxGeometry(front.halfWidth * 1.3, 0.1, 0.2), mats.cabin);
  dash.position.set(0, front.deck - 0.02, front.z + 0.1);
  group.add(dash);

  for (const side of [-1, 1]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.12), mats.cabin);
    seat.position.set(side * mid.halfWidth * 0.42, mid.deck + 0.11, mid.z + 0.18);
    seat.rotation.x = 0.16;
    group.add(seat);
  }
  return group;
}

/** Panel shutlines: hood, doors and decklid, inset just enough to catch a shadow. */
export function buildShutlines(blueprint, mats) {
  const group = new THREE.Group();
  const line = (t, width) => {
    const at = profileAt(blueprint, t);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(at.halfWidth * 2 * width, 0.008, 0.014), mats.shutline);
    strip.position.set(0, at.deck + 0.012, at.z);
    group.add(strip);
  };
  const roofStart = blueprint.roof[0][0];
  const roofEnd = blueprint.roof[blueprint.roof.length - 1][0];
  line(roofStart - 0.03, 0.78);
  line(roofEnd + 0.03, 0.74);

  // Door cut down each flank.
  for (const side of [-1, 1]) {
    for (const t of [roofStart + 0.02, roofEnd - 0.02]) {
      const at = profileAt(blueprint, t);
      const cut = new THREE.Mesh(new THREE.BoxGeometry(0.012, (at.deck - at.floor) * 0.55, 0.014), mats.shutline);
      cut.position.set(side * (at.halfWidth + 0.004), at.floor + (at.deck - at.floor) * 0.62, at.z);
      group.add(cut);
    }
  }
  return group;
}
