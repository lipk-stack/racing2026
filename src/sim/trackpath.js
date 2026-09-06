/**
 * Track path.
 *
 * Lofts a circuit's authored control points into a closed Catmull-Rom spline and resamples it at a
 * uniform arc-length step. Everything downstream - vehicle physics, AI, pursuit, camera, minimap
 * and the road mesh - reads the same table, so there is exactly one definition of where the road is.
 *
 * Deliberately free of three.js so the simulation can be exercised from Node.
 */

import { trackControlPoints } from "../data/tracks.js";
import { clamp } from "./vehicle.js";

const SAMPLE_STEP = 2.5; // metres between resampled stations

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function densePoints(control, subdivisions = 40) {
  const count = control.length;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const p0 = control[(i - 1 + count) % count];
    const p1 = control[i];
    const p2 = control[(i + 1) % count];
    const p3 = control[(i + 2) % count];
    for (let step = 0; step < subdivisions; step += 1) {
      const t = step / subdivisions;
      out.push([
        catmullRom(p0[0], p1[0], p2[0], p3[0], t),
        catmullRom(p0[1], p1[1], p2[1], p3[1], t),
        catmullRom(p0[2], p1[2], p2[2], p3[2], t),
      ]);
    }
  }
  return out;
}

function smoothWrapped(values, radius) {
  const count = values.length;
  const out = new Float32Array(count);
  const window = radius * 2 + 1;
  for (let i = 0; i < count; i += 1) {
    let sum = 0;
    for (let k = -radius; k <= radius; k += 1) sum += values[(i + k + count) % count];
    out[i] = sum / window;
  }
  return out;
}

/**
 * Build the sampled path for a circuit.
 * Returns a frozen-ish object of typed arrays plus the lookup helpers the game uses.
 */
export function buildTrackPath(track) {
  const control = trackControlPoints(track);
  const dense = densePoints(control);

  // Cumulative arc length along the dense polyline.
  const cumulative = [0];
  for (let i = 1; i <= dense.length; i += 1) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cumulative.push(cumulative[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  const length = cumulative[dense.length];
  const count = Math.max(64, Math.round(length / SAMPLE_STEP));
  const step = length / count;

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const z = new Float32Array(count);

  let cursor = 0;
  for (let i = 0; i < count; i += 1) {
    const target = i * step;
    while (cursor < dense.length - 1 && cumulative[cursor + 1] < target) cursor += 1;
    const span = cumulative[cursor + 1] - cumulative[cursor] || 1;
    const t = (target - cumulative[cursor]) / span;
    const a = dense[cursor];
    const b = dense[(cursor + 1) % dense.length];
    x[i] = a[0] + (b[0] - a[0]) * t;
    y[i] = a[1] + (b[1] - a[1]) * t;
    z[i] = a[2] + (b[2] - a[2]) * t;
  }

  // Heading in the XZ plane, curvature as its rate of change, grade from elevation.
  const heading = new Float32Array(count);
  const grade = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    const prev = (i - 1 + count) % count;
    heading[i] = Math.atan2(z[next] - z[prev], x[next] - x[prev]);
    grade[i] = Math.atan2(y[next] - y[prev], 2 * step);
  }

  const rawCurvature = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    let delta = heading[next] - heading[i];
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    rawCurvature[i] = delta / step;
  }
  const curvature = smoothWrapped(rawCurvature, 3);
  const banking = smoothWrapped(
    Array.from(curvature, (k) => clamp(k * 42, -0.14, 0.14)),
    6,
  );

  const halfWidth = track.roadWidth / 2;
  const runoff = track.theme?.props?.rocks ? 3.0 : 4.4;

  // Racing line: pull toward the inside of a corner, then smooth so entry and exit run wide.
  const rawLine = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const pull = clamp(curvature[i] * 620, -1, 1);
    rawLine[i] = -pull * (halfWidth - 2.4);
  }
  const racingLine = smoothWrapped(rawLine, Math.max(4, Math.round(26 / step)));

  // Corner speed ceiling from lateral grip, used by AI and the assist line colouring.
  const cornerSpeed = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const k = Math.abs(curvature[i]) + 1e-6;
    cornerSpeed[i] = Math.sqrt((1.45 * 9.81) / k);
  }

  const wrap = (distance) => ((distance % length) + length) % length;
  const indexAt = (distance) => Math.floor(wrap(distance) / step) % count;

  const sample = (distance) => {
    const d = wrap(distance);
    const i = Math.floor(d / step) % count;
    const j = (i + 1) % count;
    const t = (d - i * step) / step;
    return {
      index: i,
      distance: d,
      curvature: curvature[i] + (curvature[j] - curvature[i]) * t,
      grade: grade[i] + (grade[j] - grade[i]) * t,
      banking: banking[i] + (banking[j] - banking[i]) * t,
      halfWidth,
      runoff,
      racingLine: racingLine[i] + (racingLine[j] - racingLine[i]) * t,
      cornerSpeed: Math.min(cornerSpeed[i], cornerSpeed[j]),
    };
  };

  /** World position of a point `offset` metres to the right of the centreline at distance `s`. */
  const pointAt = (distance, offset = 0, height = 0) => {
    const d = wrap(distance);
    const i = Math.floor(d / step) % count;
    const j = (i + 1) % count;
    const t = (d - i * step) / step;
    const px = x[i] + (x[j] - x[i]) * t;
    const py = y[i] + (y[j] - y[i]) * t;
    const pz = z[i] + (z[j] - z[i]) * t;
    const h = headingAt(d);
    return {
      x: px + Math.sin(h) * -offset,
      y: py + height + Math.abs(offset) * banking[i] * Math.sign(offset || 1) * 0.2,
      z: pz + Math.cos(h) * offset,
    };
  };

  function headingAt(distance) {
    const d = wrap(distance);
    const i = Math.floor(d / step) % count;
    const j = (i + 1) % count;
    const t = (d - i * step) / step;
    let delta = heading[j] - heading[i];
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return heading[i] + delta * t;
  }

  /** Shortest signed distance from `from` to `to` around the loop. */
  const signedDelta = (from, to) => {
    let delta = wrap(to) - wrap(from);
    if (delta > length / 2) delta -= length;
    if (delta < -length / 2) delta += length;
    return delta;
  };

  const bounds = () => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < count; i += 1) {
      minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]);
      minZ = Math.min(minZ, z[i]); maxZ = Math.max(maxZ, z[i]);
    }
    return { minX, maxX, minZ, maxZ };
  };

  return {
    id: track.id,
    track,
    length,
    count,
    step,
    x, y, z,
    heading, curvature, banking, grade, racingLine, cornerSpeed,
    halfWidth,
    runoff,
    sample,
    pointAt,
    headingAt,
    indexAt,
    signedDelta,
    wrap,
    bounds,
    sectorLength: length / (track.sectors || 3),
  };
}
