/**
 * Car body surfacing.
 *
 * Turns a blueprint from `src/data/carbodies.js` into geometry: a body shell lofted from authored
 * cross-sections with real wheel arches cut into the flanks, and a greenhouse lofted over the
 * beltline. Sections are built from named control points - floor, rocker, hip, shoulder crease,
 * deck - rather than a swept primitive, which is what gives the flanks form instead of the soap-bar
 * look of a swept superellipse.
 *
 * This module imports nothing: it returns plain typed arrays, so the whole shape can be measured
 * against published dimensions in a Node test with no renderer.
 */

const SIDE_SAMPLES = 20; // points down each side of a section
const STATIONS = 60; // cross-sections along the length

/** Catmull-Rom through `[t, value]` control points, clamped outside the authored range. */
export function sampleCurve(points, t) {
  if (t <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (t >= last[0]) return last[1];
  let i = 0;
  while (i < points.length - 2 && points[i + 1][0] < t) i += 1;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  const span = p2[0] - p1[0] || 1;
  const u = (t - p1[0]) / span;
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (
    2 * p1[1]
    + (-p0[1] + p2[1]) * u
    + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2
    + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3
  );
}

/** Catmull-Rom resample of a 2D polyline into `count` evenly parameterised points. */
function resample(controls, count) {
  const out = [];
  const n = controls.length;
  for (let i = 0; i < count; i += 1) {
    const s = (i / (count - 1)) * (n - 1);
    const k = Math.min(n - 2, Math.floor(s));
    const u = s - k;
    const p0 = controls[Math.max(0, k - 1)];
    const p1 = controls[k];
    const p2 = controls[k + 1];
    const p3 = controls[Math.min(n - 1, k + 2)];
    const u2 = u * u;
    const u3 = u2 * u;
    const blend = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
    out.push([blend(p0[0], p1[0], p2[0], p3[0]), blend(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

/**
 * How far the centre of the top surface drops below the fender line at a station, as a fraction of
 * the flank height: a valley down the hood, and another over the engine cover on a mid-engined car.
 */
function valleyDepth(blueprint, t) {
  const cowl = blueprint.roof[0][0];
  const rear = blueprint.roof[blueprint.roof.length - 1][0];
  const s = blueprint.section;
  const hood = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.06) / Math.max(0.05, cowl - 0.1)))) ** 0.7;
  const deck = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - rear) / Math.max(0.05, 0.94 - rear)))) ** 0.7;
  return Math.max(hood * (s.hoodDip ?? 0.16), deck * (s.deckDip ?? 0.1));
}

/** Height of the underbody at a station: flat in the middle, lifted for approach and departure. */
function floorHeight(blueprint, t) {
  const { ride } = blueprint;
  const nose = smoothstep(0.09, 0, t) * 0.11;
  const tail = smoothstep(0.9, 1, t) * 0.13;
  return ride + nose + tail;
}

/**
 * Half-width at a station, including the blister over each axle.
 * The flare is carved out of the published width rather than added to it, so a car that measures
 * 1945 mm across still measures 1945 mm across at its widest arch.
 */
function planHalfWidth(blueprint, t, z) {
  const { flare, span } = blueprint.arch;
  const base = sampleCurve(blueprint.plan, t) * (blueprint.halfWidth - flare);
  const reach = blueprint.tyre.front.radius * span;
  const front = 1 - smoothstep(0, reach, Math.abs(z - blueprint.frontAxle));
  const rear = 1 - smoothstep(0, blueprint.tyre.rear.radius * span, Math.abs(z - blueprint.rearAxle));
  return base + flare * Math.max(front, rear);
}

/**
 * Lower boundary of the flank at a station: the wheel arch.
 * The opening is the upper half of a circle centred on the axle, so the body sheet wraps over the
 * wheel exactly the way a real arch does.
 */
function archFloor(blueprint, z) {
  let highest = -Infinity;
  for (const [axle, tyre] of [[blueprint.frontAxle, blueprint.tyre.front], [blueprint.rearAxle, blueprint.tyre.rear]]) {
    const radius = tyre.radius + blueprint.arch.clearance;
    const dz = Math.abs(z - axle);
    if (dz >= radius) continue;
    highest = Math.max(highest, tyre.radius + Math.sqrt(radius * radius - dz * dz));
  }
  return highest;
}

/** Innermost x an arch reaches - inboard of that the underbody stays low. */
function archInnerX(blueprint, z) {
  const front = Math.abs(z - blueprint.frontAxle) < Math.abs(z - blueprint.rearAxle);
  const track = front ? blueprint.track[0] : blueprint.track[1];
  const tyre = front ? blueprint.tyre.front : blueprint.tyre.rear;
  return track / 2 - tyre.width * 0.65;
}

/** Body dimensions at a station: what the parts layer needs to sit a lamp or a scoop on the skin. */
export function profileAt(blueprint, t) {
  const z = -blueprint.length / 2 + t * blueprint.length;
  return {
    z,
    deck: sampleCurve(blueprint.deck, t),
    floor: floorHeight(blueprint, t),
    halfWidth: planHalfWidth(blueprint, t, z),
  };
}

/**
 * One cross-section, as a closed ring of `[x, y]` starting at the top centre and running down the
 * right flank, across the underbody and back up the left.
 */
export function sectionRing(blueprint, t) {
  const z = -blueprint.length / 2 + t * blueprint.length;
  const deck = sampleCurve(blueprint.deck, t);
  const floor = floorHeight(blueprint, t);
  const halfWidth = planHalfWidth(blueprint, t, z);
  const s = blueprint.section;
  const flank = Math.max(0.05, deck - floor);
  // Close the very ends down so the loft caps into a rounded bumper rather than a flat slab.
  const cap = Math.min(smoothstep(0, 0.03, t), smoothstep(1, 0.97, t));
  const capWidth = 0.66 + 0.34 * cap;
  const capHeight = 0.72 + 0.28 * cap;

  const middle = floor + flank * 0.5;
  const shrink = (y) => middle + (y - middle) * capHeight;
  const width = halfWidth * capWidth;
  // The hood and the engine cover sit below the fender tops. Without that valley the top surface is
  // one flat plane from wing to wing, which is the single biggest giveaway of a generated body.
  const dip = valleyDepth(blueprint, t) * flank;
  const controls = [
    [0, shrink(deck + s.crown - dip)],
    [width * s.topInset, shrink(deck - dip * 0.25)],
    [width * s.shoulderInset, shrink(floor + s.shoulder * flank)],
    [width * s.shoulderInset, shrink(floor + s.shoulder * flank)],
    [width, shrink(floor + s.hip * flank)],
    [width, shrink(floor + s.hip * flank)],
    [width * s.sillInset, shrink(floor + s.sill * flank)],
    [width * s.floorInset, shrink(floor)],
    [0, shrink(floor)],
  ];
  const right = resample(controls, SIDE_SAMPLES);

  // Cut the arch: anything outboard of the wheel is pushed up to the arch line.
  const arch = archFloor(blueprint, z);
  if (arch > -Infinity) {
    const innerX = archInnerX(blueprint, z);
    const ceiling = shrink(floor + s.shoulder * flank);
    for (const point of right) {
      if (point[0] <= innerX) continue;
      const lift = Math.min(arch, ceiling);
      if (point[1] < lift) point[1] = lift;
    }
  }

  const ring = right.slice();
  for (let i = right.length - 2; i >= 1; i -= 1) ring.push([-right[i][0], right[i][1]]);
  return { ring, z, deck, floor, halfWidth: width };
}

/** Accumulate face normals into per-vertex normals. */
function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const ax = positions[b] - positions[a];
    const ay = positions[b + 1] - positions[a + 1];
    const az = positions[b + 2] - positions[a + 2];
    const bx = positions[c] - positions[a];
    const by = positions[c + 1] - positions[a + 1];
    const bz = positions[c + 2] - positions[a + 2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    for (const index of [a, b, c]) {
      normals[index] += nx;
      normals[index + 1] += ny;
      normals[index + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
  return normals;
}

function pack(positions, indices, uvs) {
  const position = new Float32Array(positions);
  const index = new Uint32Array(indices);
  return {
    positions: position,
    indices: index,
    uvs: new Float32Array(uvs),
    normals: computeNormals(position, index),
    triangles: index.length / 3,
  };
}

/** The body shell: every station lofted together, with flat caps at the nose and tail. */
export function buildBody(blueprint) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const rings = [];

  for (let i = 0; i < STATIONS; i += 1) {
    const t = i / (STATIONS - 1);
    const { ring, z } = sectionRing(blueprint, t);
    rings.push(ring.length);
    ring.forEach(([x, y], k) => {
      positions.push(x, y, z);
      uvs.push(k / (ring.length - 1), t);
    });
  }

  const ringSize = rings[0];
  for (let s = 0; s < STATIONS - 1; s += 1) {
    for (let i = 0; i < ringSize; i += 1) {
      const next = (i + 1) % ringSize;
      const a = s * ringSize + i;
      const b = s * ringSize + next;
      const c = (s + 1) * ringSize + next;
      const d = (s + 1) * ringSize + i;
      indices.push(a, c, b, a, d, c);
    }
  }

  // Caps, as a fan to the section's centroid.
  for (const [station, flip] of [[0, false], [STATIONS - 1, true]]) {
    const base = station * ringSize;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ringSize; i += 1) {
      cx += positions[(base + i) * 3];
      cy += positions[(base + i) * 3 + 1];
    }
    const centre = positions.length / 3;
    positions.push(cx / ringSize, cy / ringSize, positions[base * 3 + 2]);
    uvs.push(0.5, flip ? 1 : 0);
    for (let i = 0; i < ringSize; i += 1) {
      const next = (i + 1) % ringSize;
      if (flip) indices.push(centre, base + i, base + next);
      else indices.push(centre, base + next, base + i);
    }
  }

  return pack(positions, indices, uvs);
}

/**
 * The greenhouse grid: a domed loft from the cowl to the rear deck, tapering at both ends so the
 * windscreen and backlight close into the body instead of ending in a hole.
 *
 * It is emitted as two surfaces - painted roof shell and glazing - because a cabin rendered as one
 * dark shell disappears at night, and because the roof/glass split *is* the daylight opening that
 * gives a car its profile.
 */
const GREENHOUSE = { stations: 30, arc: 16 };

function greenhouseGrid(blueprint, swell = 0) {
  const roof = blueprint.roof;
  const startT = roof[0][0];
  const endT = roof[roof.length - 1][0];
  const { stations, arc } = GREENHOUSE;
  const positions = [];
  const uvs = [];

  for (let s = 0; s < stations; s += 1) {
    const u = s / (stations - 1);
    const t = startT + (endT - startT) * u;
    const z = -blueprint.length / 2 + t * blueprint.length;
    const belt = sampleCurve(blueprint.deck, t);
    // Clamped: a Catmull-Rom can overshoot between control points, and the roof is the one curve
    // whose peak is a published figure.
    const top = Math.min(blueprint.height - swell, Math.max(belt + 0.02, sampleCurve(roof, t)));
    const taper = 0.18 + 0.82 * Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.42;
    const halfWidth = planHalfWidth(blueprint, t, z) * blueprint.glass.inset * taper;

    for (let a = 0; a < arc; a += 1) {
      const angle = (a / (arc - 1)) * Math.PI;
      const lift = Math.sin(angle) ** 0.7;
      positions.push(
        Math.cos(angle) * (halfWidth + swell),
        belt + (top - belt) * lift + swell * lift,
        z,
      );
      uvs.push(a / (arc - 1), u);
    }
  }
  return { positions, uvs, ...GREENHOUSE };
}

/** Quads of the grid selected by a predicate on (station, arc) - the rest is left to the other surface. */
function emitGrid(grid, keep) {
  const { positions, uvs, stations, arc } = grid;
  const map = new Map();
  const outPositions = [];
  const outUvs = [];
  const indices = [];
  const vertex = (s, a) => {
    const key = s * arc + a;
    if (map.has(key)) return map.get(key);
    const index = outPositions.length / 3;
    outPositions.push(positions[key * 3], positions[key * 3 + 1], positions[key * 3 + 2]);
    outUvs.push(uvs[key * 2], uvs[key * 2 + 1]);
    map.set(key, index);
    return index;
  };

  for (let s = 0; s < stations - 1; s += 1) {
    for (let a = 0; a < arc - 1; a += 1) {
      if (!keep(s / (stations - 2), a / (arc - 2))) continue;
      const p = vertex(s, a);
      const q = vertex(s + 1, a);
      const r = vertex(s, a + 1);
      const t = vertex(s + 1, a + 1);
      indices.push(p, q, r, r, q, t);
    }
  }
  return pack(outPositions, indices, outUvs);
}

/** True inside the painted roof panel: the middle of the arch, over the middle of the cabin. */
function isRoofPanel(u, v) {
  return u > 0.18 && u < 0.86 && v > 0.26 && v < 0.74;
}

/** A and C pillars: the painted frame either side of the windscreen and the backlight. */
function isPillar(u, v) {
  const side = (v > 0.06 && v < 0.3) || (v > 0.7 && v < 0.94);
  return side && (u < 0.2 || u > 0.78);
}

/** Glazing: windscreen, side windows and backlight - what the roof and pillars do not cover. */
export function buildGreenhouse(blueprint) {
  return emitGrid(greenhouseGrid(blueprint, 0), (u, v) => !isRoofPanel(u, v) && !isPillar(u, v));
}

/** The painted pillars, swollen like the roof so they frame the glass rather than sit flush. */
export function buildPillars(blueprint) {
  return emitGrid(greenhouseGrid(blueprint, 0.01), isPillar);
}

/** The painted roof, swollen slightly so it sits proud of the glass rather than inside it. */
export function buildRoofPanel(blueprint) {
  return emitGrid(greenhouseGrid(blueprint, 0.012), isRoofPanel);
}

/** A dark liner behind each arch so the opening never shows daylight through the body. */
export function buildArchLiner(blueprint, which) {
  const axle = which === "front" ? blueprint.frontAxle : blueprint.rearAxle;
  const tyre = which === "front" ? blueprint.tyre.front : blueprint.tyre.rear;
  const track = which === "front" ? blueprint.track[0] : blueprint.track[1];
  const radius = tyre.radius + blueprint.arch.clearance;
  const inner = track / 2 - tyre.width * 0.7;
  const outer = track / 2 + tyre.width * 0.55;
  const steps = 14;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (const side of [-1, 1]) {
    const base = positions.length / 3;
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / (steps - 1)) * Math.PI;
      const z = axle - Math.cos(angle) * radius;
      const y = tyre.radius + Math.sin(angle) * radius;
      positions.push(side * inner, y, z, side * outer, y, z);
      uvs.push(0, i / (steps - 1), 1, i / (steps - 1));
    }
    for (let i = 0; i < steps - 1; i += 1) {
      const p = base + i * 2;
      if (side > 0) indices.push(p, p + 1, p + 3, p, p + 3, p + 2);
      else indices.push(p, p + 3, p + 1, p, p + 2, p + 3);
    }
  }
  return pack(positions, indices, uvs);
}

/** Bounding box of a geometry payload - the measurement the dimensional tests assert on. */
export function measure(geometry) {
  const p = geometry.positions;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], p[i + axis]);
      max[axis] = Math.max(max[axis], p[i + axis]);
    }
  }
  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    finite: p.every(Number.isFinite),
  };
}
