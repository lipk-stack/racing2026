/**
 * Public module surface.
 *
 * The game itself boots from `src/main.js`; this barrel re-exports the pure, DOM-free pieces -
 * roster and event data, vehicle and pursuit maths, the career economy - so the Node tests and any
 * tooling can exercise the same code the browser runs, without a canvas.
 */

export { CARS, CAR_IDS, STARTER_CAR, calculatePerformanceIndex, getGearbox, peakTorque } from "./data/cars.js";
export { DIFFICULTY, EVENTS, EVENT_IDS, PURSUIT } from "./data/events.js";
export { TRACKS, TRACK_IDS, approximateLapLength, trackControlPoints } from "./data/tracks.js";
export {
  UPGRADE_PARTS,
  UPGRADE_IDS,
  getPart,
  maxLevel,
  upgradeCost,
  upgradeMultipliers,
  upgradeProgress,
  upgradeValue,
} from "./data/upgrades.js";

export {
  GRAVITY,
  PEAK_SLIP,
  WEATHER_GRIP,
  autoGear,
  calculateGear,
  calculateGripLoad,
  calculateSlipstream,
  clamp,
  createVehicleSpec,
  createVehicleState,
  engineTorque,
  gearTopSpeed,
  lerp,
  peakTyreForce,
  percentRemaining,
  scoreDrift,
  scoreNearMiss,
  steerLimit,
  stepVehicle,
  surfaceGrip,
  tyreForce,
  weightTransfer,
  wheelRpm,
} from "./sim/vehicle.js";

export { BODY_IDS, carBlueprint, parseTyre } from "./data/carbodies.js";
export {
  buildArchLiner,
  buildBody,
  buildGreenhouse,
  buildPillars,
  buildRoofPanel,
  measure,
  profileAt,
  sampleCurve,
  sectionRing,
} from "./world/carbody.js";

export { buildTrackPath } from "./sim/trackpath.js";
export { driveAI, paceControls, planTargetSpeed, rubberBandFactor, steerToTarget } from "./sim/ai.js";
export {
  calculateEvadeProgress,
  calculateHeatLevel,
  calculatePursuitPressure,
  createPursuitState,
  evadeBonus,
  requiredUnits,
} from "./sim/pursuit.js";
export { computeRank, createRace, retireRace, snapshot, updateRace } from "./sim/race.js";

export {
  PROFILE_DEFAULT,
  applyEventReward,
  buyCar,
  buyUpgrade,
  calculateDriverLevel,
  calculateEventReward,
  carPrice,
  carUpgrades,
  createProfile,
  eventUnlocked,
  garageValue,
  loadProfile,
  ownsCar,
  saveProfile,
} from "./game/profile.js";
export { formatDelta, formatMoney, formatTime } from "./game/format.js";
