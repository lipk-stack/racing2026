/**
 * Circuit definitions.
 *
 * Each circuit is authored in polar form: a list of `[angleDeg, radius, elevation]` control points
 * walked once around the centre. Monotonic angles guarantee a closed, non self-intersecting loop,
 * while the radius column is what actually shapes the lap - a sudden radius drop is a hairpin, a
 * long constant run is a straight. `src/world/track.js` lofts these into a spline, a road mesh and
 * a Frenet lookup used by physics, AI, camera and minimap alike.
 */

export const TRACKS = {
  nightlineBay: {
    id: "nightlineBay",
    name: "Nightline Bay",
    subtitle: "Harbour circuit · night · wet",
    blurb: "Neon reflections on wet dock asphalt, two long straights and a technical marina complex.",
    roadWidth: 15.5,
    laps: 3,
    sectors: 3,
    weather: "wet",
    timeOfDay: "night",
    targetLap: 78,
    theme: {
      skyTop: 0x05070d,
      skyHorizon: 0x18354d,
      skyGlow: 0x2b6f9c,
      fog: 0x0a141c,
      fogDensity: 0.0042,
      ambient: 0x223140,
      key: 0x9fd8ff,
      keyIntensity: 0.55,
      keyAngle: [-0.35, 0.75, -0.4],
      road: 0x1b1e23,
      kerbA: 0xf2f2e8,
      kerbB: 0xd72733,
      verge: 0x101a20,
      barrier: 0x1d262e,
      barrierGlow: 0x00d8ff,
      ground: 0x0b1218,
      city: { density: 1, height: [24, 92], glow: 0x00d8ff, warm: 0xffd166 },
      props: { lights: 1, billboards: 1, trees: 0.15, gantries: 1, cranes: 0.6 },
      stars: 1,
      moon: 1,
    },
    points: [
      [0, 505, 0], [16, 512, 1], [32, 498, 2], [48, 452, 3], [62, 402, 3],
      [76, 372, 2], [90, 388, 0], [104, 436, -2], [118, 486, -3], [134, 520, -3],
      [150, 528, -2], [166, 498, 0], [178, 430, 1], [190, 372, 2], [202, 344, 2],
      [216, 356, 1], [232, 404, 0], [248, 462, -1], [264, 508, -2], [280, 532, -2],
      [296, 528, -1], [312, 496, 0], [326, 452, 1], [340, 452, 1], [352, 482, 0],
    ],
  },
  ridgePass: {
    id: "ridgePass",
    name: "Ridge Pass",
    subtitle: "Mountain pass · storm · elevation",
    blurb: "Switchbacks cut into a rain-lashed ridge. Blind crests, no run-off, headlights only.",
    roadWidth: 13.2,
    laps: 2,
    sectors: 3,
    weather: "storm",
    timeOfDay: "night",
    targetLap: 74,
    theme: {
      skyTop: 0x04060a,
      skyHorizon: 0x14202e,
      skyGlow: 0x1d3a52,
      fog: 0x0a1017,
      fogDensity: 0.0072,
      key: 0x7fa8d8,
      keyIntensity: 0.35,
      keyAngle: [0.5, 0.6, -0.5],
      road: 0x191c1f,
      kerbA: 0xe8e4d8,
      kerbB: 0xc31f2c,
      verge: 0x1a1d18,
      barrier: 0x2a2f2c,
      barrierGlow: 0xffd166,
      ground: 0x121710,
      city: { density: 0, height: [0, 0], glow: 0x000000, warm: 0x000000 },
      props: { lights: 0.45, billboards: 0.2, trees: 1.4, gantries: 0.35, rocks: 1.4 },
      stars: 0.4,
      moon: 0.6,
    },
    points: [
      [0, 430, 0], [14, 470, 14], [28, 486, 28], [42, 452, 40], [54, 386, 48],
      [66, 322, 52], [80, 296, 50], [96, 330, 42], [112, 398, 32], [128, 462, 20],
      [144, 500, 8], [158, 486, -4], [170, 420, -14], [182, 348, -22], [194, 306, -26],
      [208, 316, -24], [224, 372, -18], [240, 440, -10], [256, 492, -2], [272, 512, 6],
      [286, 486, 12], [300, 424, 14], [314, 362, 12], [328, 340, 8], [344, 372, 4], [356, 412, 1],
    ],
  },
  downtownGrid: {
    id: "downtownGrid",
    name: "Downtown Grid",
    subtitle: "City block circuit · night · pursuit",
    blurb: "Tight ninety-degree blocks between tower blocks, with a tunnel and every siren in the city.",
    roadWidth: 14.2,
    laps: 3,
    sectors: 4,
    weather: "damp",
    timeOfDay: "night",
    targetLap: 71,
    theme: {
      skyTop: 0x06070c,
      skyHorizon: 0x1a2434,
      skyGlow: 0x39406b,
      fog: 0x0b0f16,
      fogDensity: 0.0055,
      key: 0xb9c6ff,
      keyIntensity: 0.42,
      keyAngle: [0.2, 0.9, 0.35],
      road: 0x1d2025,
      kerbA: 0xf0efe6,
      kerbB: 0xbe2331,
      verge: 0x14161b,
      barrier: 0x232830,
      barrierGlow: 0xff3e3e,
      ground: 0x0d1015,
      city: { density: 1.7, height: [40, 165], glow: 0xff3e3e, warm: 0xffd166 },
      props: { lights: 1.4, billboards: 1.5, trees: 0.1, gantries: 1.2 },
      stars: 0.3,
      moon: 0.4,
    },
    points: [
      [0, 430, 0], [10, 442, 0], [22, 430, 1], [30, 372, 2], [40, 336, 3],
      [54, 330, 3], [68, 368, 2], [78, 420, 1], [90, 448, 0], [104, 440, -1],
      [116, 396, -2], [126, 344, -3], [138, 322, -3], [152, 344, -2], [164, 398, -1],
      [176, 442, 0], [190, 452, 1], [204, 420, 2], [214, 362, 3], [226, 326, 3],
      [240, 330, 2], [254, 376, 1], [266, 428, 0], [280, 450, 0], [294, 436, 1],
      [306, 388, 2], [318, 344, 2], [332, 348, 1], [346, 392, 0], [356, 424, 0],
    ],
  },
  coastSunset: {
    id: "coastSunset",
    name: "Coast Sunset",
    subtitle: "Cliffside speedway · dusk · dry",
    blurb: "Wide sweepers above the water with the sun on the deck. The fastest lap on the calendar.",
    roadWidth: 16.5,
    laps: 3,
    sectors: 3,
    weather: "dry",
    timeOfDay: "dusk",
    targetLap: 82,
    theme: {
      skyTop: 0x1b2b52,
      skyHorizon: 0xff9752,
      skyGlow: 0xffbe6a,
      fog: 0x3a3550,
      fogDensity: 0.0026,
      key: 0xffb877,
      keyIntensity: 0.92,
      keyAngle: [-0.85, 0.16, -0.5],
      road: 0x24262b,
      kerbA: 0xf7f4ea,
      kerbB: 0xd8452f,
      verge: 0x241f12,
      barrier: 0x3c3a35,
      barrierGlow: 0xffd166,
      ground: 0x1c1b12,
      city: { density: 0.25, height: [16, 46], glow: 0xffd166, warm: 0xffe6a8 },
      props: { lights: 0.5, billboards: 0.5, trees: 0.9, gantries: 0.6, rocks: 0.8 },
      stars: 0,
      moon: 0,
      sun: 1,
    },
    points: [
      [0, 620, 0], [18, 648, 4], [36, 640, 8], [54, 596, 10], [72, 556, 10],
      [90, 552, 8], [108, 588, 5], [126, 636, 2], [144, 664, 0], [162, 652, -2],
      [180, 600, -4], [198, 540, -4], [214, 500, -2], [230, 502, 0], [248, 546, 2],
      [266, 604, 4], [284, 648, 5], [302, 660, 4], [320, 634, 2], [338, 592, 1], [352, 588, 0],
    ],
  },
};

export const TRACK_IDS = Object.keys(TRACKS);
export const DEFAULT_TRACK = "nightlineBay";

/** Convert the authored polar control points into flat XZ + elevation triples. */
export function trackControlPoints(track) {
  return track.points.map(([angleDeg, radius, elevation]) => {
    const angle = (angleDeg * Math.PI) / 180;
    return [Math.cos(angle) * radius, elevation, Math.sin(angle) * radius];
  });
}

/** Approximate lap distance in metres, used for previews before the spline is built. */
export function approximateLapLength(track) {
  const points = trackControlPoints(track);
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return total;
}
