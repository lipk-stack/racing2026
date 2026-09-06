/**
 * Track geometry.
 *
 * Turns a sampled `trackpath` into the meshes you actually drive on: asphalt with painted markings,
 * kerbs where the corners are, a run-off skirt, barriers with reflective strips, the start/finish
 * gantry and the checkpoint arches. All of it is generated once per race into a handful of merged
 * buffer geometries so the draw call count stays flat no matter how long the lap is.
 */

import * as THREE from "three";
import {
  createBarrierTexture,
  createGroundTexture,
  createKerbTexture,
  createRoadNormal,
  createRoadTexture,
  createSignTexture,
  createWindowTexture,
} from "../engine/textures.js";

const KERB_WIDTH = 0.95;
const KERB_CURVATURE = 0.0035;
const BARRIER_HEIGHT = 1.15;

/** Right-hand lateral basis vector at a station, tilted by the track's banking. */
function lateral(heading, banking) {
  const cos = Math.cos(banking);
  return {
    x: -Math.sin(heading) * cos,
    y: Math.sin(banking),
    z: Math.cos(heading) * cos,
  };
}

function stationAt(path, index) {
  const i = index % path.count;
  const heading = path.heading[i];
  const banking = path.banking[i];
  return {
    x: path.x[i],
    y: path.y[i],
    z: path.z[i],
    heading,
    banking,
    curvature: path.curvature[i],
    right: lateral(heading, banking),
    distance: i * path.step,
  };
}

/**
 * Build a ribbon between two lateral offsets along the whole lap.
 * `vScale` sets how often the texture repeats along the road.
 */
function ribbon(path, innerOffset, outerOffset, height, vScale, filter) {
  const positions = [];
  const uvs = [];
  const indices = [];
  let ring = 0;
  const rings = [];

  for (let i = 0; i <= path.count; i += 1) {
    const station = stationAt(path, i);
    const keep = !filter || filter(station);
    if (!keep) {
      rings.push(null);
      continue;
    }
    const inner = typeof innerOffset === "function" ? innerOffset(station) : innerOffset;
    const outer = typeof outerOffset === "function" ? outerOffset(station) : outerOffset;
    const lift = typeof height === "function" ? height(station) : height;
    positions.push(
      station.x + station.right.x * inner,
      station.y + station.right.y * inner + lift,
      station.z + station.right.z * inner,
    );
    positions.push(
      station.x + station.right.x * outer,
      station.y + station.right.y * outer + lift,
      station.z + station.right.z * outer,
    );
    const v = station.distance / vScale;
    uvs.push(0, v, 1, v);
    rings.push(ring);
    ring += 1;
  }

  for (let i = 0; i < rings.length - 1; i += 1) {
    const a = rings[i];
    const b = rings[i + 1];
    if (a === null || b === null) continue;
    const a0 = a * 2;
    const a1 = a * 2 + 1;
    const b0 = b * 2;
    const b1 = b * 2 + 1;
    indices.push(a0, b0, b1, a0, b1, a1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Vertical wall: an inner face plus a capped top so the barrier reads as solid from the cockpit. */
function wall(path, offset, height) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= path.count; i += 1) {
    const station = stationAt(path, i);
    const x = station.x + station.right.x * offset;
    const y = station.y + station.right.y * offset;
    const z = station.z + station.right.z * offset;
    positions.push(x, y, z, x, y + height, z);
    const v = station.distance / 12;
    uvs.push(0, v, 1, v);
  }
  for (let i = 0; i < path.count; i += 1) {
    const a0 = i * 2;
    const a1 = i * 2 + 1;
    const b0 = (i + 1) * 2;
    const b1 = (i + 1) * 2 + 1;
    indices.push(a0, b0, b1, a0, b1, a1);
    indices.push(a0, b1, b0, a0, a1, b1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Lane markings as real geometry.
 * Solid lines down both edges and dashed separators between the lanes, lifted a few centimetres
 * above the asphalt with a polygon offset so they never z-fight.
 */
function laneMarkings(path, lanes = 3) {
  const positions = [];
  const indices = [];
  const halfWidth = path.halfWidth;
  const lift = 0.035;
  let vertex = 0;

  const quad = (fromDistance, toDistance, offset, width) => {
    const a = path.pointAt(fromDistance, offset - width / 2);
    const b = path.pointAt(fromDistance, offset + width / 2);
    const c = path.pointAt(toDistance, offset + width / 2);
    const d = path.pointAt(toDistance, offset - width / 2);
    positions.push(a.x, a.y + lift, a.z, b.x, b.y + lift, b.z, c.x, c.y + lift, c.z, d.x, d.y + lift, d.z);
    indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
    vertex += 4;
  };

  // Continuous edge lines, walked at the sampling step so they follow every corner.
  const step = path.step * 2;
  for (let distance = 0; distance < path.length; distance += step) {
    const to = Math.min(distance + step, path.length);
    for (const side of [-1, 1]) quad(distance, to, side * (halfWidth - 0.5), 0.16);
  }

  // Dashed separators: 3 m of paint every 9 m.
  for (let lane = 1; lane < lanes; lane += 1) {
    const offset = -halfWidth + ((halfWidth * 2) / lanes) * lane;
    for (let distance = 0; distance < path.length - 9; distance += 9) {
      quad(distance, distance + 3, offset, 0.13);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function gantry(path, distance, label, color) {
  const group = new THREE.Group();
  const sample = path.sample(distance);
  const centre = path.pointAt(distance, 0);
  const heading = path.headingAt(distance);
  const span = sample.halfWidth * 2 + 3.2;
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1f26, metalness: 0.75, roughness: 0.42 });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(span, 0.55, 0.7), metal);
  beam.position.set(centre.x, centre.y + 6.4, centre.z);
  beam.rotation.y = -heading;
  group.add(beam);

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.6, 0.5), metal);
    const point = path.pointAt(distance, side * (sample.halfWidth + 1.4));
    post.position.set(point.x, point.y + 3.3, point.z);
    post.rotation.y = -heading;
    group.add(post);
  }

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 0.44, 2.1),
    new THREE.MeshBasicMaterial({ map: createSignTexture(color, label), transparent: false, side: THREE.DoubleSide }),
  );
  sign.position.set(centre.x, centre.y + 7.6, centre.z);
  sign.rotation.y = -heading + Math.PI / 2;
  group.add(sign);
  return group;
}

/** Instanced scatter of buildings, trees and rocks outside the barriers. */
function scatterProps(path, theme, rng) {
  const group = new THREE.Group();
  const city = theme.city || { density: 0 };
  const props = theme.props || {};

  if (city.density > 0) {
    const count = Math.round(path.count * 0.09 * city.density);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0f141b,
      roughness: 0.86,
      metalness: 0.1,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const glassMesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: createWindowTexture(city.glow, city.warm, city.density),
        transparent: true,
        opacity: 0.95,
      }),
      count,
    );
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      const distance = rng() * path.length;
      const side = rng() > 0.5 ? 1 : -1;
      const offset = side * (path.halfWidth + 16 + rng() * 78);
      const point = path.pointAt(distance, offset);
      const height = city.height[0] + rng() * (city.height[1] - city.height[0]);
      const width = 12 + rng() * 22;
      const depth = 12 + rng() * 22;
      matrix.makeRotationY(rng() * Math.PI);
      matrix.scale(new THREE.Vector3(width, height, depth));
      matrix.setPosition(point.x, point.y + height / 2 - 2, point.z);
      mesh.setMatrixAt(i, matrix);
      matrix.scale(new THREE.Vector3(1.002, 1.002, 1.002));
      glassMesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    glassMesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    group.add(mesh, glassMesh);
  }

  if (props.trees > 0) {
    const count = Math.round(path.count * 0.16 * props.trees);
    const trunk = new THREE.CylinderGeometry(0.22, 0.34, 3.4, 6);
    const canopy = new THREE.ConeGeometry(2.1, 5.4, 7);
    const trunkMesh = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x2a2117, roughness: 1 }), count);
    const canopyMesh = new THREE.InstancedMesh(canopy, new THREE.MeshStandardMaterial({ color: 0x16351f, roughness: 0.95 }), count);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      const distance = rng() * path.length;
      const side = rng() > 0.5 ? 1 : -1;
      const point = path.pointAt(distance, side * (path.halfWidth + 7 + rng() * 42));
      const scale = 0.7 + rng() * 0.9;
      matrix.makeScale(scale, scale, scale);
      matrix.setPosition(point.x, point.y + 1.7 * scale, point.z);
      trunkMesh.setMatrixAt(i, matrix);
      matrix.setPosition(point.x, point.y + 4.6 * scale, point.z);
      canopyMesh.setMatrixAt(i, matrix);
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    group.add(trunkMesh, canopyMesh);
  }

  if (props.rocks > 0) {
    const count = Math.round(path.count * 0.1 * props.rocks);
    const geometry = new THREE.IcosahedronGeometry(1.6, 0);
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: 0x2b2f2a, roughness: 1, flatShading: true }), count);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      const distance = rng() * path.length;
      const side = rng() > 0.5 ? 1 : -1;
      const point = path.pointAt(distance, side * (path.halfWidth + 5 + rng() * 26));
      const scale = 0.6 + rng() * 2.2;
      matrix.makeRotationY(rng() * Math.PI);
      matrix.scale(new THREE.Vector3(scale, scale * 0.7, scale));
      matrix.setPosition(point.x, point.y + scale * 0.3, point.z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  if (props.lights > 0) {
    const count = Math.round((path.length / 46) * props.lights);
    const pole = new THREE.CylinderGeometry(0.12, 0.16, 7.2, 6);
    const head = new THREE.SphereGeometry(0.36, 8, 6);
    const poleMesh = new THREE.InstancedMesh(pole, new THREE.MeshStandardMaterial({ color: 0x2c3138, metalness: 0.7, roughness: 0.5 }), count);
    const headMesh = new THREE.InstancedMesh(
      head,
      new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffd9a0, emissiveIntensity: 4.2 }),
      count,
    );
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      const distance = (i / count) * path.length;
      const side = i % 2 ? 1 : -1;
      const point = path.pointAt(distance, side * (path.halfWidth + 2.6));
      matrix.makeTranslation(point.x, point.y + 3.6, point.z);
      poleMesh.setMatrixAt(i, matrix);
      matrix.makeTranslation(point.x, point.y + 7.2, point.z);
      headMesh.setMatrixAt(i, matrix);
    }
    poleMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    group.add(poleMesh, headMesh);
  }

  return group;
}

function makeRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build every mesh for a circuit. Returns the group to add to the scene plus the disposables.
 */
export function buildTrackMeshes(path, track) {
  const theme = track.theme;
  const rng = makeRng(0xa17c);
  const group = new THREE.Group();
  const disposables = [];

  const roadTexture = createRoadTexture(theme);
  const roadNormal = createRoadNormal();
  const wet = track.weather === "wet" || track.weather === "storm";
  // Asphalt is a dielectric: metalness has to stay near zero or the painted markings lose their
  // albedo and the surface reads as a mirror. Wet just means smoother and a little more reflective.
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    normalMap: roadNormal,
    normalScale: new THREE.Vector2(wet ? 0.5 : 0.85, wet ? 0.5 : 0.85),
    roughness: wet ? 0.36 : 0.76,
    metalness: wet ? 0.12 : 0.04,
    envMapIntensity: wet ? 0.95 : 0.45,
  });
  const roadGeometry = ribbon(path, -path.halfWidth, path.halfWidth, 0.02, 26);
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.receiveShadow = true;
  group.add(road);
  disposables.push(roadGeometry, roadMaterial, roadTexture, roadNormal);

  const markingGeometry = laneMarkings(path);
  const markingMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f2e6,
    roughness: 0.62,
    metalness: 0.02,
    emissive: 0x1a1a18,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const markings = new THREE.Mesh(markingGeometry, markingMaterial);
  markings.receiveShadow = true;
  group.add(markings);
  disposables.push(markingGeometry, markingMaterial);

  // Kerbs, only where the corner justifies one.
  const kerbTexture = createKerbTexture(theme.kerbA, theme.kerbB);
  const kerbMaterial = new THREE.MeshStandardMaterial({ map: kerbTexture, roughness: 0.6 });
  for (const side of [-1, 1]) {
    const geometry = ribbon(
      path,
      () => side * path.halfWidth,
      () => side * (path.halfWidth + KERB_WIDTH),
      0.06,
      3.2,
      (station) => (side > 0 ? station.curvature < -KERB_CURVATURE : station.curvature > KERB_CURVATURE),
    );
    const mesh = new THREE.Mesh(geometry, kerbMaterial);
    mesh.receiveShadow = true;
    group.add(mesh);
    disposables.push(geometry);
  }
  disposables.push(kerbMaterial, kerbTexture);

  // Run-off and the wider skirt that becomes the terrain.
  const groundTexture = createGroundTexture(theme.verge ?? 0x101a20);
  const vergeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.98, envMapIntensity: 0.3 });
  for (const side of [-1, 1]) {
    const runoff = ribbon(
      path,
      () => side * (path.halfWidth + KERB_WIDTH * 0.9),
      () => side * (path.halfWidth + path.runoff),
      -0.04,
      14,
    );
    group.add(new THREE.Mesh(runoff, vergeMaterial));
    disposables.push(runoff);
  }
  const skirtMaterial = new THREE.MeshStandardMaterial({
    map: createGroundTexture(theme.ground ?? 0x0b1218),
    roughness: 1,
    envMapIntensity: 0.25,
  });
  for (const side of [-1, 1]) {
    const skirt = ribbon(
      path,
      () => side * (path.halfWidth + path.runoff),
      () => side * (path.halfWidth + path.runoff + 140),
      (station) => -1.4 - Math.abs(station.curvature) * 40,
      60,
    );
    group.add(new THREE.Mesh(skirt, skirtMaterial));
    disposables.push(skirt);
  }
  disposables.push(vergeMaterial, skirtMaterial, groundTexture);

  // Barriers.
  const barrierTexture = createBarrierTexture(theme.barrier, theme.barrierGlow);
  const barrierMaterial = new THREE.MeshStandardMaterial({
    map: barrierTexture,
    roughness: 0.7,
    metalness: 0.2,
    emissive: new THREE.Color(theme.barrierGlow ?? 0x00d8ff),
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const geometry = wall(path, side * (path.halfWidth + path.runoff), BARRIER_HEIGHT);
    const mesh = new THREE.Mesh(geometry, barrierMaterial);
    mesh.receiveShadow = true;
    group.add(mesh);
    disposables.push(geometry);
  }
  disposables.push(barrierMaterial, barrierTexture);

  // Start/finish line and gantries around the lap.
  const startLine = new THREE.Mesh(
    new THREE.PlaneGeometry(path.halfWidth * 2, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xf2f2e8, roughness: 0.5 }),
  );
  const startPoint = path.pointAt(2, 0);
  startLine.position.set(startPoint.x, startPoint.y + 0.05, startPoint.z);
  startLine.rotation.set(-Math.PI / 2, 0, path.headingAt(2));
  group.add(startLine);
  group.add(gantry(path, 6, "START", theme.barrierGlow ?? 0x00d8ff));

  const gantryCount = Math.max(1, Math.round((path.length / 620) * ((theme.props?.gantries) ?? 1)));
  for (let i = 1; i <= gantryCount; i += 1) {
    const distance = (path.length / (gantryCount + 1)) * i;
    group.add(gantry(path, distance, i % 2 ? "NIGHTLINE" : track.name.toUpperCase().slice(0, 10), i % 2 ? theme.barrierGlow : theme.kerbB));
  }

  group.add(scatterProps(path, theme, rng));

  return {
    group,
    road,
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}

/** Checkpoint arches for the gate contract, built only when the event needs them. */
export function buildGates(path, gates, color = 0x00d8ff) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0.82,
  });
  for (const gate of gates) {
    const arch = new THREE.Group();
    const centre = path.pointAt(gate.distance, gate.offset);
    const heading = path.headingAt(gate.distance);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.4, 0.35), material);
      const point = path.pointAt(gate.distance, gate.offset + side * 4.2);
      post.position.set(point.x, point.y + 2.7, point.z);
      arch.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.32, 0.32), material);
    bar.position.set(centre.x, centre.y + 5.2, centre.z);
    bar.rotation.y = -heading;
    arch.add(bar);
    arch.userData.gate = gate;
    group.add(arch);
  }
  group.userData.material = material;
  return group;
}
