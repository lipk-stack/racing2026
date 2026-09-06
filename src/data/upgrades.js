/**
 * Garage upgrade parts.
 *
 * Every part is a ladder of levels; each level states its own price and a typed effect that
 * `applyUpgrades` folds into a car's simulation spec. Keeping the effects declarative means the
 * economy, the showroom preview and the physics all read the same source of truth.
 */

export const UPGRADE_PARTS = [
  {
    id: "engine",
    name: "Engine internals",
    blurb: "Forged internals, ported heads and a remap. Raises crank power across the range.",
    levels: [
      { name: "Stage 1", cost: 8500, power: 1.06 },
      { name: "Stage 2", cost: 19000, power: 1.13 },
      { name: "Stage 3", cost: 41000, power: 1.22 },
    ],
  },
  {
    id: "turbo",
    name: "Forced induction",
    blurb: "Bigger snails or a supercharger swap. Adds top-end punch and turbo noise.",
    levels: [
      { name: "Uprated", cost: 11000, power: 1.05, peakRpm: 1.02 },
      { name: "Big single", cost: 24000, power: 1.11, peakRpm: 1.04 },
      { name: "Race spec", cost: 52000, power: 1.19, peakRpm: 1.06 },
    ],
  },
  {
    id: "tyres",
    name: "Tyre compound",
    blurb: "Softer compounds bite harder but the difference shows most in the wet.",
    levels: [
      { name: "Sport", cost: 6200, grip: 1.05 },
      { name: "Semi-slick", cost: 15500, grip: 1.11 },
      { name: "Track slick", cost: 33000, grip: 1.18 },
    ],
  },
  {
    id: "gearbox",
    name: "Gearbox",
    blurb: "Shorter ratios and faster actuation. Cuts the dead time between gears.",
    levels: [
      { name: "Short ratios", cost: 7400, shiftTime: 0.82, finalDrive: 1.03 },
      { name: "Race clutch", cost: 17800, shiftTime: 0.62, finalDrive: 1.05 },
      { name: "Sequential", cost: 38000, shiftTime: 0.42, finalDrive: 1.08 },
    ],
  },
  {
    id: "aero",
    name: "Aero package",
    blurb: "Splitter, diffuser and wing. More downforce through corners, a little more drag.",
    levels: [
      { name: "Street kit", cost: 5800, downforce: 1.18, dragArea: 1.02 },
      { name: "Track kit", cost: 14500, downforce: 1.42, dragArea: 1.05 },
      { name: "GT aero", cost: 31000, downforce: 1.75, dragArea: 1.09 },
    ],
  },
  {
    id: "brakes",
    name: "Brakes",
    blurb: "Carbon-ceramic discs and race pads. Brake later, hold the line longer.",
    levels: [
      { name: "Sport pads", cost: 4900, brakeForce: 1.08 },
      { name: "Big brake kit", cost: 12800, brakeForce: 1.18 },
      { name: "Carbon-ceramic", cost: 27500, brakeForce: 1.3 },
    ],
  },
  {
    id: "weight",
    name: "Weight reduction",
    blurb: "Carbon panels, lexan and a stripped cabin. Helps everything at once.",
    levels: [
      { name: "Interior strip", cost: 6600, mass: 0.96 },
      { name: "Carbon panels", cost: 16400, mass: 0.92 },
      { name: "Full lightweight", cost: 35500, mass: 0.87 },
    ],
  },
  {
    id: "nitrous",
    name: "Nitrous system",
    blurb: "Bottle, solenoid and purge. Bigger shot, faster refill, louder night.",
    levels: [
      { name: "Wet shot", cost: 5400, nitrousForce: 1.15, nitrousCapacity: 1.1 },
      { name: "Direct port", cost: 13200, nitrousForce: 1.3, nitrousCapacity: 1.25 },
      { name: "Twin bottle", cost: 29000, nitrousForce: 1.5, nitrousCapacity: 1.45 },
    ],
  },
];

export const UPGRADE_IDS = UPGRADE_PARTS.map((part) => part.id);

const PART_BY_ID = new Map(UPGRADE_PARTS.map((part) => [part.id, part]));

export function getPart(id) {
  return PART_BY_ID.get(id) || null;
}

export function maxLevel(id) {
  const part = PART_BY_ID.get(id);
  return part ? part.levels.length : 0;
}

/** Cost of moving a part from `level` to `level + 1`, or null when it is already maxed. */
export function upgradeCost(id, level) {
  const part = PART_BY_ID.get(id);
  if (!part) return null;
  const next = part.levels[level];
  return next ? next.cost : null;
}

/** Total money sunk into a set of upgrades, used for resale value and the garage summary. */
export function upgradeValue(upgrades = {}) {
  let total = 0;
  for (const part of UPGRADE_PARTS) {
    const level = Math.min(Number(upgrades[part.id]) || 0, part.levels.length);
    for (let i = 0; i < level; i += 1) total += part.levels[i].cost;
  }
  return total;
}

const MULTIPLIERS = ["power", "grip", "downforce", "dragArea", "brakeForce", "mass", "shiftTime", "finalDrive", "peakRpm", "nitrousForce", "nitrousCapacity"];

/**
 * Fold owned upgrade levels into a flat multiplier set. Everything is multiplicative so parts
 * stack predictably and a missing part is simply 1.
 */
export function upgradeMultipliers(upgrades = {}) {
  const result = {};
  for (const key of MULTIPLIERS) result[key] = 1;
  for (const part of UPGRADE_PARTS) {
    const level = Math.min(Math.max(Number(upgrades[part.id]) || 0, 0), part.levels.length);
    for (let i = 0; i < level; i += 1) {
      const effect = part.levels[i];
      for (const key of MULTIPLIERS) {
        if (typeof effect[key] === "number") result[key] *= effect[key];
      }
    }
  }
  return result;
}

/** Rough 0-100 score of how built a car is, for the garage progress bar. */
export function upgradeProgress(upgrades = {}) {
  let owned = 0;
  let total = 0;
  for (const part of UPGRADE_PARTS) {
    owned += Math.min(Number(upgrades[part.id]) || 0, part.levels.length);
    total += part.levels.length;
  }
  return total ? Math.round((owned / total) * 100) : 0;
}
