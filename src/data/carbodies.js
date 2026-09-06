/**
 * Car body blueprints.
 *
 * One entry per car, authored from published dimensions and design descriptions. The numbers that
 * can be looked up - length, width, height, wheelbase, tyre sizes - are the real ones; the rest are
 * the landmarks that make a silhouette identifiable: where the cowl sits, where the roof peaks, how
 * fast the backlight falls, where the body is widest.
 *
 * Coordinates: the car is built nose-first along -Z, so z runs from -length/2 (nose) to +length/2
 * (tail), x is half-width either side, and y is height above the ground. `src/world/carbody.js`
 * turns a blueprint into geometry; nothing here imports anything.
 *
 * Curves are lists of `[t, value]` control points where t is the fraction of the car's length from
 * the nose. `deck` and `roof` are heights in metres; `plan` is a fraction of the half-width.
 */

/** Tyre code (255/35R19) -> section width, aspect, rim diameter and rolling radius, all metres. */
export function parseTyre(code) {
  const match = /^(\d{3})\/(\d{2})R(\d{2})$/.exec(code);
  if (!match) throw new Error(`Unreadable tyre code: ${code}`);
  const width = Number(match[1]) / 1000;
  const aspect = Number(match[2]) / 100;
  const rim = (Number(match[3]) * 25.4) / 1000;
  return { code, width, aspect, rim, radius: rim / 2 + width * aspect };
}

const DEFAULTS = {
  ride: 0.105,
  // Cross-section shape, as fractions of the body height at each station.
  section: {
    floorInset: 0.82, // how far in the flat underside runs before the sill turns up
    sill: 0.16, // tuck-under: the rocker is pulled in below the widest point
    sillInset: 0.93,
    hip: 0.42, // the widest point of the body
    shoulder: 0.9, // the crease along the top of the flank
    shoulderInset: 0.98,
    topInset: 0.86, // where the flank meets the hood/deck surface
    crown: 0.016, // how much the hood and deck dome across the centreline
    hoodDip: 0.2, // how far the hood sinks below the front fender tops
    deckDip: 0.12, // the same over the rear deck or engine cover
  },
  arch: { clearance: 0.055, flare: 0.022, span: 1.18 },
  glass: { tint: 0.86, inset: 0.9 },
  rim: { spokes: 10, style: "twin", colour: 0x9aa4ad, dish: 0.22 },
  caliper: 0x8d1c1c,
  face: { lamp: "wrap", intake: "twin", splitter: 0.055, grille: true },
  rear: { lamp: "twin", exhaust: "twin-round", diffuser: 0.12, wing: "lip" },
  extras: {},
};

/**
 * Per-car blueprints. Published dimensions in millimetres are noted beside each entry so the
 * authored curve can be checked against the source it came from.
 */
const BODIES = {
  // 4380 x 1865 x 1292, wb 2470. Double-bubble roof, ducktail, big oval side vents.
  toyotasupra: {
    dims: [4.38, 1.865, 1.292], wheelbase: 2.47, frontOverhang: 0.9,
    track: [1.594, 1.589], tyres: ["255/35R19", "275/35R19"],
    deck: [[0, 0.6], [0.06, 0.72], [0.16, 0.83], [0.3, 0.828], [0.42, 0.832], [0.72, 0.88], [0.86, 0.95], [0.95, 0.93], [1, 0.86]],
    roof: [[0.4, 0.94], [0.5, 1.26], [0.6, 1.292], [0.72, 1.24], [0.86, 0.99]],
    plan: [[0, 0.56], [0.1, 0.82], [0.2, 1.0], [0.45, 0.9], [0.72, 1.0], [0.9, 0.93], [1, 0.76]],
    face: { lamp: "wrap", intake: "triple", splitter: 0.05, grille: true },
    rear: { lamp: "wrap", exhaust: "twin-round", diffuser: 0.1, wing: "ducktail" },
    rim: { spokes: 5, style: "twin", colour: 0x33383d, dish: 0.26 },
    caliper: 0xb01f1f,
    extras: { doubleBubble: true, sideVent: "oval" },
  },
  // 4399 x 1869 x 1316, wb 2550. Long hood, squared-off nose, rectangular tail lamps.
  nissanz: {
    dims: [4.399, 1.869, 1.316], wheelbase: 2.55, frontOverhang: 0.87,
    track: [1.601, 1.61], tyres: ["255/40R19", "285/35R19"],
    deck: [[0, 0.66], [0.07, 0.79], [0.18, 0.88], [0.34, 0.862], [0.46, 0.865], [0.74, 0.927], [0.88, 0.99], [1, 0.92]],
    roof: [[0.44, 0.96], [0.56, 1.29], [0.66, 1.316], [0.78, 1.25], [0.9, 1.02]],
    plan: [[0, 0.62], [0.1, 0.86], [0.22, 1.0], [0.5, 0.92], [0.76, 1.0], [0.92, 0.94], [1, 0.82]],
    face: { lamp: "round-twin", intake: "wide", splitter: 0.04, grille: true },
    rear: { lamp: "slim-bar", exhaust: "twin-round", diffuser: 0.1, wing: "lip" },
    rim: { spokes: 6, style: "y", colour: 0x24282c, dish: 0.24 },
    caliper: 0xc22a2a,
  },
  // 4820 x 1920 x 1400, wb 2720. Long hood, short deck, tri-bar tail lamps, big grille.
  fordmustang: {
    dims: [4.82, 1.92, 1.4], wheelbase: 2.72, frontOverhang: 0.86,
    track: [1.628, 1.63], tyres: ["255/40R19", "275/40R19"],
    deck: [[0, 0.72], [0.06, 0.86], [0.16, 0.96], [0.34, 0.928], [0.44, 0.921], [0.74, 0.984], [0.88, 1.05], [1, 0.98]],
    roof: [[0.42, 1.02], [0.54, 1.36], [0.63, 1.4], [0.76, 1.33], [0.87, 1.06]],
    plan: [[0, 0.66], [0.09, 0.88], [0.2, 0.98], [0.48, 0.93], [0.75, 1.0], [0.92, 0.95], [1, 0.86]],
    face: { lamp: "tri-bar", intake: "wide", splitter: 0.05, grille: true },
    rear: { lamp: "tri-bar", exhaust: "quad-corner", diffuser: 0.09, wing: "wing" },
    rim: { spokes: 5, style: "twin", colour: 0x1b1e22, dish: 0.3 },
    caliper: 0xc4451f,
    extras: { hoodVents: true },
  },
  // 4456 x 1822 x 1267, wb 2482. Mid-engine, swan-neck wing, NACA ducts, side intakes.
  porschecayman: {
    dims: [4.456, 1.822, 1.267], wheelbase: 2.482, frontOverhang: 0.88,
    track: [1.548, 1.548], tyres: ["245/35R20", "295/30R20"],
    deck: [[0, 0.62], [0.08, 0.74], [0.2, 0.8], [0.32, 0.792], [0.44, 0.811], [0.66, 0.903], [0.82, 1.02], [0.94, 1], [1, 0.92]],
    roof: [[0.38, 0.9], [0.5, 1.22], [0.58, 1.267], [0.7, 1.2], [0.8, 1.04]],
    plan: [[0, 0.58], [0.1, 0.84], [0.22, 0.96], [0.46, 0.9], [0.72, 1.0], [0.9, 0.95], [1, 0.8]],
    face: { lamp: "round-quad", intake: "triple", splitter: 0.08, grille: false },
    rear: { lamp: "slim-bar", exhaust: "centre-twin", diffuser: 0.2, wing: "swan" },
    rim: { spokes: 10, style: "twin", colour: 0x2c3136, dish: 0.2 },
    caliper: 0xd4322a,
    extras: { sideIntake: "shoulder", ducts: true },
  },
  // 4794 x 1887 x 1393, wb 2857. Tall kidney grille, carbon roof, ducktail.
  bmwM4csl: {
    dims: [4.794, 1.887, 1.393], wheelbase: 2.857, frontOverhang: 0.88,
    track: [1.617, 1.605], tyres: ["275/35R19", "285/30R20"],
    deck: [[0, 0.7], [0.06, 0.84], [0.16, 0.94], [0.32, 0.926], [0.42, 0.926], [0.74, 0.984], [0.88, 1.05], [1, 0.98]],
    roof: [[0.4, 1.02], [0.52, 1.35], [0.6, 1.393], [0.74, 1.32], [0.9, 1.07]],
    plan: [[0, 0.64], [0.1, 0.88], [0.22, 0.98], [0.5, 0.93], [0.76, 1.0], [0.92, 0.95], [1, 0.84]],
    face: { lamp: "slim-l", intake: "kidney", splitter: 0.05, grille: true },
    rear: { lamp: "l-shape", exhaust: "quad-corner", diffuser: 0.12, wing: "ducktail" },
    rim: { spokes: 5, style: "y", colour: 0x2a2d31, dish: 0.28 },
    caliper: 0xc9302c,
    extras: { carbonRoof: true },
  },
  // 4690 x 1895 x 1372, wb 2780. Four round tail lamps, V-motion grille, wide rear haunches.
  nissangtr: {
    dims: [4.69, 1.895, 1.372], wheelbase: 2.78, frontOverhang: 0.9,
    track: [1.59, 1.6], tyres: ["255/40R20", "285/35R20"],
    deck: [[0, 0.72], [0.07, 0.84], [0.18, 0.93], [0.32, 0.917], [0.42, 0.917], [0.72, 0.977], [0.88, 1.06], [1, 1]],
    roof: [[0.4, 1.01], [0.5, 1.33], [0.58, 1.372], [0.72, 1.31], [0.88, 1.08]],
    plan: [[0, 0.66], [0.1, 0.88], [0.22, 0.97], [0.48, 0.92], [0.74, 1.0], [0.92, 0.96], [1, 0.86]],
    face: { lamp: "boomerang", intake: "v-motion", splitter: 0.06, grille: true },
    rear: { lamp: "quad-round", exhaust: "quad-round", diffuser: 0.14, wing: "ducktail" },
    rim: { spokes: 10, style: "y", colour: 0x14161a, dish: 0.24 },
    caliper: 0xd8b23a,
    extras: { hoodVents: true },
  },
  // 4427 x 1941 x 1240, wb 2649. Sideblade, hexagonal grille, mid-engine deck.
  audir8: {
    dims: [4.427, 1.941, 1.24], wheelbase: 2.649, frontOverhang: 0.85,
    track: [1.638, 1.599], tyres: ["245/30R20", "305/30R20"],
    deck: [[0, 0.6], [0.08, 0.72], [0.2, 0.79], [0.32, 0.783], [0.44, 0.803], [0.66, 0.894], [0.84, 1], [0.95, 0.98], [1, 0.9]],
    roof: [[0.38, 0.89], [0.5, 1.2], [0.57, 1.24], [0.68, 1.18], [0.78, 1.02]],
    plan: [[0, 0.6], [0.1, 0.86], [0.22, 1.0], [0.46, 0.9], [0.72, 1.0], [0.9, 0.94], [1, 0.8]],
    face: { lamp: "slim-l", intake: "hexagon", splitter: 0.06, grille: true },
    rear: { lamp: "slim-bar", exhaust: "twin-oval", diffuser: 0.18, wing: "lip" },
    rim: { spokes: 5, style: "y", colour: 0x30353a, dish: 0.22 },
    caliper: 0xb3121a,
    extras: { sideIntake: "blade" },
  },
  // 4549 x 1945 x 1220, wb 2620. Hexagonal Y lamps, hard wedge, huge fixed wing, centre exhaust.
  lamborghinihuracan: {
    dims: [4.549, 1.945, 1.22], wheelbase: 2.62, frontOverhang: 0.93,
    track: [1.668, 1.62], tyres: ["245/30R20", "305/30R20"],
    deck: [[0, 0.52], [0.08, 0.66], [0.2, 0.74], [0.32, 0.744], [0.44, 0.774], [0.64, 0.871], [0.82, 1], [0.94, 0.99], [1, 0.9]],
    roof: [[0.36, 0.86], [0.48, 1.17], [0.54, 1.22], [0.66, 1.15], [0.76, 0.99]],
    plan: [[0, 0.54], [0.1, 0.84], [0.22, 0.98], [0.44, 0.88], [0.7, 1.0], [0.9, 0.95], [1, 0.78]],
    face: { lamp: "hex-y", intake: "wedge", splitter: 0.1, grille: false },
    rear: { lamp: "hex-y", exhaust: "centre-twin", diffuser: 0.26, wing: "fixed" },
    rim: { spokes: 5, style: "y", colour: 0x1a1c20, dish: 0.18 },
    caliper: 0xd8721f,
    extras: { sideIntake: "shoulder", shark: true },
  },
  // 4551 x 2007 x 1284, wb 2630. Very long hood, Panamericana grille, wide rear track.
  mercedesamggt: {
    dims: [4.551, 2.007, 1.284], wheelbase: 2.63, frontOverhang: 0.94,
    track: [1.71, 1.7], tyres: ["285/35R19", "335/30R20"],
    deck: [[0, 0.6], [0.06, 0.76], [0.18, 0.86], [0.36, 0.847], [0.52, 0.864], [0.76, 0.958], [0.9, 1.01], [1, 0.94]],
    roof: [[0.5, 0.96], [0.62, 1.24], [0.68, 1.284], [0.8, 1.2], [0.92, 1.02]],
    plan: [[0, 0.58], [0.1, 0.84], [0.24, 0.96], [0.52, 0.92], [0.78, 1.0], [0.93, 0.94], [1, 0.8]],
    face: { lamp: "slim-l", intake: "panamericana", splitter: 0.09, grille: true },
    rear: { lamp: "slim-bar", exhaust: "twin-square", diffuser: 0.2, wing: "fixed" },
    rim: { spokes: 10, style: "twin", colour: 0x202327, dish: 0.26 },
    caliper: 0xd8b23a,
    extras: { hoodVents: true, longHood: true },
  },
  // 4600 x 1930 x 1159, wb 2670. Lowest of the roster, hooked lamps, long tail, top exhausts.
  mclaren765lt: {
    dims: [4.6, 1.93, 1.159], wheelbase: 2.67, frontOverhang: 0.86,
    track: [1.674, 1.629], tyres: ["245/35R19", "305/30R20"],
    deck: [[0, 0.48], [0.08, 0.62], [0.2, 0.7], [0.32, 0.706], [0.44, 0.738], [0.64, 0.825], [0.82, 0.95], [0.94, 0.94], [1, 0.86]],
    roof: [[0.34, 0.82], [0.46, 1.11], [0.53, 1.159], [0.66, 1.09], [0.78, 0.94]],
    plan: [[0, 0.52], [0.1, 0.82], [0.22, 0.97], [0.44, 0.88], [0.7, 1.0], [0.9, 0.94], [1, 0.76]],
    face: { lamp: "hooked", intake: "wedge", splitter: 0.11, grille: false },
    rear: { lamp: "slim-bar", exhaust: "centre-twin", diffuser: 0.28, wing: "active" },
    rim: { spokes: 10, style: "y", colour: 0x24272b, dish: 0.2 },
    caliper: 0xd9861f,
    extras: { sideIntake: "door", shark: true },
  },
  // 4565 x 1958 x 1187, wb 2600. Short cabin over a wide flank, single round lamp each side.
  ferrari296: {
    dims: [4.565, 1.958, 1.187], wheelbase: 2.6, frontOverhang: 0.9,
    track: [1.665, 1.632], tyres: ["245/35R20", "305/35R20"],
    deck: [[0, 0.5], [0.08, 0.64], [0.2, 0.72], [0.32, 0.725], [0.44, 0.756], [0.64, 0.843], [0.82, 0.97], [0.94, 0.96], [1, 0.88]],
    roof: [[0.36, 0.84], [0.48, 1.14], [0.55, 1.187], [0.67, 1.12], [0.78, 0.96]],
    plan: [[0, 0.54], [0.1, 0.84], [0.22, 0.98], [0.45, 0.89], [0.71, 1.0], [0.9, 0.95], [1, 0.78]],
    face: { lamp: "slim-l", intake: "wedge", splitter: 0.09, grille: false },
    rear: { lamp: "round-twin", exhaust: "centre-twin", diffuser: 0.24, wing: "active" },
    rim: { spokes: 5, style: "y", colour: 0x2b2f34, dish: 0.2 },
    caliper: 0xd8b23a,
    extras: { sideIntake: "shoulder" },
  },
  // 4535 x 1900 x 1303, wb 2450. Rear engine: apex far forward, continuous fastback, light bar.
  porsche911turbo: {
    dims: [4.535, 1.9, 1.303], wheelbase: 2.45, frontOverhang: 0.95,
    track: [1.583, 1.6], tyres: ["255/35R20", "315/30R21"],
    deck: [[0, 0.62], [0.08, 0.76], [0.18, 0.84], [0.28, 0.837], [0.36, 0.846], [0.62, 0.912], [0.84, 1.06], [0.95, 1.04], [1, 0.94]],
    roof: [[0.34, 0.92], [0.44, 1.26], [0.5, 1.303], [0.66, 1.24], [0.86, 1.08]],
    plan: [[0, 0.56], [0.1, 0.82], [0.22, 0.94], [0.44, 0.9], [0.74, 1.0], [0.92, 0.96], [1, 0.84]],
    face: { lamp: "round-quad", intake: "triple", splitter: 0.06, grille: false },
    rear: { lamp: "full-bar", exhaust: "centre-quad", diffuser: 0.16, wing: "active" },
    rim: { spokes: 10, style: "twin", colour: 0x8f959c, dish: 0.22 },
    caliper: 0xd4322a,
    extras: { sideIntake: "shoulder", ducktail: true },
  },
};

function merge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? merge(base[key] || {}, value)
      : value;
  }
  return result;
}

/**
 * Resolve a car's blueprint: published dimensions, defaults filled in, tyres parsed and the axle
 * positions derived so the wheelbase is exactly the published figure.
 */
export function carBlueprint(carId) {
  const body = BODIES[carId];
  if (!body) throw new Error(`No body blueprint for ${carId}`);
  const blueprint = merge(DEFAULTS, body);
  const [length, width, height] = blueprint.dims;
  const frontAxle = -length / 2 + blueprint.frontOverhang;
  return {
    ...blueprint,
    id: carId,
    length,
    width,
    height,
    halfWidth: width / 2,
    frontAxle,
    rearAxle: frontAxle + blueprint.wheelbase,
    tyre: { front: parseTyre(blueprint.tyres[0]), rear: parseTyre(blueprint.tyres[1]) },
  };
}

export const BODY_IDS = Object.keys(BODIES);
