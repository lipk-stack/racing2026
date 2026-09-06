/**
 * Car roster.
 *
 * Every entry carries three layers of data:
 *  - showroom facts (brand, model, grade, engine, drivetrain, headline numbers)
 *  - simulation parameters consumed by `src/sim/vehicle.js`
 *  - build parameters consumed by `src/world/carmodel.js` and `src/engine/audio.js`
 *
 * The legacy arcade fields (`accel`, `handling`, `boost`, `grip`, `maxSpeed`) are kept because the
 * career reward math, the performance index and the published test contract all read them.
 */

import { carBlueprint } from "./carbodies.js";

const GEARBOX = {
  dct7: { ratios: [3.91, 2.29, 1.58, 1.19, 0.97, 0.81, 0.67], final: 3.44, shiftTime: 0.09 },
  dct8: { ratios: [4.71, 2.84, 1.91, 1.43, 1.16, 0.95, 0.79, 0.65], final: 3.31, shiftTime: 0.08 },
  manual6: { ratios: [3.59, 2.19, 1.52, 1.15, 0.92, 0.76], final: 3.73, shiftTime: 0.28 },
  auto10: { ratios: [4.7, 2.99, 2.15, 1.8, 1.52, 1.28, 1.0, 0.85, 0.69, 0.64], final: 3.55, shiftTime: 0.14 },
};

export const CARS = {
  toyotasupra: {
    brand: "Toyota",
    model: "GR Supra",
    grade: "A90 3.0 Final Edition",
    className: "B",
    engine: "3.0L turbocharged inline-six",
    drivetrain: "RWD",
    powerHp: 382,
    zeroTo100: 4.1,
    weightKg: 1520,
    maxSpeed: 250,
    accel: 96,
    handling: 0.98,
    boost: 0.9,
    grip: 0.96,
    price: 0,
    tier: 1,
    color: "#d63f2b",
    accent: "#111820",
    roof: "#14181d",
    profile: "coupe",
    sim: {
      wheelbase: 2.47, frontWeight: 0.52, cgHeight: 0.46, dragArea: 0.66, downforce: 0.62,
      tyreGrip: 1.32, brakeForce: 15200, redline: 6800, idleRpm: 850, peakRpm: 5800, gearbox: "dct8",
    },
    audio: { harmonics: [1, 0.55, 0.32, 0.18], type: "sawtooth", turbo: 0.55, growl: 0.35, cutoff: 1150 },
    body: { length: 4.38, width: 1.87, height: 1.29, wheelRadius: 0.35, spoiler: "duck" },
  },
  nissanz: {
    brand: "Nissan",
    model: "Z NISMO",
    grade: "RZ34",
    className: "B+",
    engine: "3.0L twin-turbo V6",
    drivetrain: "RWD",
    powerHp: 420,
    zeroTo100: 4.3,
    weightKg: 1610,
    maxSpeed: 250,
    accel: 100,
    handling: 0.96,
    boost: 1.02,
    grip: 0.98,
    price: 76000,
    tier: 1,
    color: "#f0f2f4",
    accent: "#e0262f",
    roof: "#101215",
    profile: "coupe",
    sim: {
      wheelbase: 2.55, frontWeight: 0.54, cgHeight: 0.47, dragArea: 0.7, downforce: 0.6,
      tyreGrip: 1.34, brakeForce: 15600, redline: 6800, idleRpm: 800, peakRpm: 5600, gearbox: "auto10",
    },
    audio: { harmonics: [1, 0.62, 0.3, 0.14], type: "sawtooth", turbo: 0.7, growl: 0.4, cutoff: 1100 },
    body: { length: 4.38, width: 1.85, height: 1.32, wheelRadius: 0.35, spoiler: "duck" },
  },
  fordmustang: {
    brand: "Ford",
    model: "Mustang Dark Horse",
    grade: "S650 Coyote",
    className: "A",
    engine: "5.0L naturally aspirated V8",
    drivetrain: "RWD",
    powerHp: 500,
    zeroTo100: 4.1,
    weightKg: 1780,
    maxSpeed: 267,
    accel: 108,
    handling: 0.92,
    boost: 0.88,
    grip: 0.94,
    price: 88000,
    tier: 2,
    color: "#1c3f8f",
    accent: "#f6f3ea",
    roof: "#0d1119",
    profile: "longnose",
    sim: {
      wheelbase: 2.72, frontWeight: 0.55, cgHeight: 0.5, dragArea: 0.78, downforce: 0.55,
      tyreGrip: 1.3, brakeForce: 16400, redline: 7500, idleRpm: 750, peakRpm: 6500, gearbox: "manual6",
    },
    audio: { harmonics: [1, 0.78, 0.42, 0.26, 0.12], type: "sawtooth", turbo: 0, growl: 0.85, cutoff: 900 },
    body: { length: 4.81, width: 1.92, height: 1.4, wheelRadius: 0.36, spoiler: "wing" },
  },
  porschecayman: {
    brand: "Porsche",
    model: "718 Cayman GT4 RS",
    grade: "982 Weissach",
    className: "A",
    engine: "4.0L naturally aspirated flat-six",
    drivetrain: "RWD",
    powerHp: 493,
    zeroTo100: 3.4,
    weightKg: 1415,
    maxSpeed: 315,
    accel: 118,
    handling: 1.12,
    boost: 0.9,
    grip: 1.09,
    price: 168000,
    tier: 2,
    color: "#b9d7e8",
    accent: "#1b1f24",
    roof: "#0c1014",
    profile: "wedge",
    sim: {
      wheelbase: 2.48, frontWeight: 0.44, cgHeight: 0.42, dragArea: 0.62, downforce: 1.55,
      tyreGrip: 1.52, brakeForce: 18200, redline: 9000, idleRpm: 950, peakRpm: 8400, gearbox: "dct7",
    },
    audio: { harmonics: [1, 0.48, 0.62, 0.24, 0.15], type: "sawtooth", turbo: 0, growl: 0.55, cutoff: 1700 },
    body: { length: 4.46, width: 1.82, height: 1.27, wheelRadius: 0.35, spoiler: "swan" },
  },
  bmwM4csl: {
    brand: "BMW",
    model: "M4 CSL",
    grade: "G82 Lightweight",
    className: "A+",
    engine: "3.0L twin-turbo inline-six",
    drivetrain: "RWD",
    powerHp: 543,
    zeroTo100: 3.7,
    weightKg: 1625,
    maxSpeed: 307,
    accel: 118,
    handling: 1.07,
    boost: 0.98,
    grip: 1.03,
    price: 195000,
    tier: 3,
    color: "#d9d5c8",
    accent: "#00a3ff",
    roof: "#111111",
    profile: "coupe",
    sim: {
      wheelbase: 2.86, frontWeight: 0.53, cgHeight: 0.46, dragArea: 0.7, downforce: 0.95,
      tyreGrip: 1.44, brakeForce: 17800, redline: 7200, idleRpm: 800, peakRpm: 6250, gearbox: "auto10",
    },
    audio: { harmonics: [1, 0.6, 0.34, 0.2, 0.1], type: "sawtooth", turbo: 0.72, growl: 0.42, cutoff: 1250 },
    body: { length: 4.79, width: 1.89, height: 1.39, wheelRadius: 0.36, spoiler: "duck" },
  },
  nissangtr: {
    brand: "Nissan",
    model: "GT-R NISMO",
    grade: "R35",
    className: "A+",
    engine: "3.8L twin-turbo V6",
    drivetrain: "AWD",
    powerHp: 600,
    zeroTo100: 2.9,
    weightKg: 1725,
    maxSpeed: 315,
    accel: 136,
    handling: 1.04,
    boost: 1.08,
    grip: 1.12,
    price: 245000,
    tier: 3,
    color: "#f2f2ec",
    accent: "#e0262f",
    roof: "#141414",
    profile: "widebody",
    sim: {
      wheelbase: 2.78, frontWeight: 0.54, cgHeight: 0.47, dragArea: 0.72, downforce: 1.25,
      tyreGrip: 1.5, brakeForce: 18600, redline: 7000, idleRpm: 850, peakRpm: 6400, gearbox: "dct7",
    },
    audio: { harmonics: [1, 0.66, 0.36, 0.16], type: "sawtooth", turbo: 0.92, growl: 0.5, cutoff: 1180 },
    body: { length: 4.71, width: 1.9, height: 1.37, wheelRadius: 0.37, spoiler: "wing" },
  },
  audir8: {
    brand: "Audi",
    model: "R8 V10 Performance",
    grade: "Quattro",
    className: "A+",
    engine: "5.2L naturally aspirated V10",
    drivetrain: "AWD",
    powerHp: 602,
    zeroTo100: 3.2,
    weightKg: 1595,
    maxSpeed: 331,
    accel: 124,
    handling: 1.06,
    boost: 0.92,
    grip: 1.13,
    price: 268000,
    tier: 3,
    color: "#dfe7eb",
    accent: "#2f80ff",
    roof: "#11151b",
    profile: "gt",
    sim: {
      wheelbase: 2.65, frontWeight: 0.43, cgHeight: 0.43, dragArea: 0.65, downforce: 1.35,
      tyreGrip: 1.54, brakeForce: 18900, redline: 8700, idleRpm: 900, peakRpm: 8100, gearbox: "dct7",
    },
    audio: { harmonics: [1, 0.42, 0.58, 0.3, 0.18, 0.1], type: "sawtooth", turbo: 0, growl: 0.62, cutoff: 1900 },
    body: { length: 4.43, width: 1.94, height: 1.24, wheelRadius: 0.36, spoiler: "lip" },
  },
  lamborghinihuracan: {
    brand: "Lamborghini",
    model: "Huracan STO",
    grade: "LP 640-2",
    className: "S",
    engine: "5.2L naturally aspirated V10",
    drivetrain: "RWD",
    powerHp: 631,
    zeroTo100: 3.0,
    weightKg: 1339,
    maxSpeed: 310,
    accel: 132,
    handling: 1.12,
    boost: 0.95,
    grip: 1.14,
    price: 342000,
    tier: 4,
    color: "#f47b20",
    accent: "#5ef0ff",
    roof: "#0a1116",
    profile: "wedge",
    sim: {
      wheelbase: 2.62, frontWeight: 0.41, cgHeight: 0.4, dragArea: 0.63, downforce: 2.35,
      tyreGrip: 1.62, brakeForce: 19800, redline: 8500, idleRpm: 950, peakRpm: 8000, gearbox: "dct7",
    },
    audio: { harmonics: [1, 0.4, 0.66, 0.34, 0.2, 0.12], type: "sawtooth", turbo: 0, growl: 0.7, cutoff: 2100 },
    body: { length: 4.55, width: 1.95, height: 1.22, wheelRadius: 0.36, spoiler: "swan" },
  },
  mercedesamggt: {
    brand: "Mercedes-AMG",
    model: "GT Black Series",
    grade: "Track Package",
    className: "S",
    engine: "4.0L flat-plane twin-turbo V8",
    drivetrain: "RWD",
    powerHp: 720,
    zeroTo100: 3.2,
    weightKg: 1540,
    maxSpeed: 325,
    accel: 130,
    handling: 1.02,
    boost: 1.05,
    grip: 1.06,
    price: 398000,
    tier: 4,
    color: "#161b22",
    accent: "#ff4d4d",
    roof: "#050608",
    profile: "longnose",
    sim: {
      wheelbase: 2.63, frontWeight: 0.47, cgHeight: 0.44, dragArea: 0.69, downforce: 2.1,
      tyreGrip: 1.55, brakeForce: 19400, redline: 7200, idleRpm: 850, peakRpm: 6700, gearbox: "dct7",
    },
    audio: { harmonics: [1, 0.72, 0.4, 0.22, 0.12], type: "sawtooth", turbo: 0.78, growl: 0.72, cutoff: 1350 },
    body: { length: 4.75, width: 2.05, height: 1.29, wheelRadius: 0.37, spoiler: "wing" },
  },
  mclaren765lt: {
    brand: "McLaren",
    model: "765LT",
    grade: "Longtail Coupe",
    className: "S+",
    engine: "4.0L twin-turbo V8",
    drivetrain: "RWD",
    powerHp: 755,
    zeroTo100: 2.8,
    weightKg: 1339,
    maxSpeed: 330,
    accel: 148,
    handling: 1.1,
    boost: 1.15,
    grip: 1.08,
    price: 452000,
    tier: 5,
    color: "#f28c28",
    accent: "#111820",
    roof: "#071017",
    profile: "longtail",
    sim: {
      wheelbase: 2.67, frontWeight: 0.42, cgHeight: 0.4, dragArea: 0.6, downforce: 2.25,
      tyreGrip: 1.6, brakeForce: 20400, redline: 8500, idleRpm: 950, peakRpm: 7500, gearbox: "dct7",
    },
    audio: { harmonics: [1, 0.68, 0.44, 0.24, 0.14], type: "sawtooth", turbo: 1, growl: 0.6, cutoff: 1500 },
    body: { length: 4.6, width: 1.93, height: 1.19, wheelRadius: 0.36, spoiler: "wing" },
  },
  ferrari296: {
    brand: "Ferrari",
    model: "296 GTB",
    grade: "Assetto Fiorano",
    className: "S+",
    engine: "3.0L twin-turbo V6 PHEV",
    drivetrain: "RWD",
    powerHp: 819,
    zeroTo100: 2.9,
    weightKg: 1470,
    maxSpeed: 330,
    accel: 150,
    handling: 1.04,
    boost: 1.22,
    grip: 1.01,
    price: 486000,
    tier: 5,
    color: "#e11d2e",
    accent: "#ffd166",
    roof: "#17100f",
    profile: "berlinetta",
    sim: {
      wheelbase: 2.6, frontWeight: 0.4, cgHeight: 0.41, dragArea: 0.61, downforce: 2.05,
      tyreGrip: 1.58, brakeForce: 20100, redline: 8500, idleRpm: 950, peakRpm: 7250, gearbox: "dct8",
    },
    audio: { harmonics: [1, 0.5, 0.56, 0.3, 0.18, 0.1], type: "sawtooth", turbo: 0.85, growl: 0.5, cutoff: 1850 },
    body: { length: 4.57, width: 1.96, height: 1.19, wheelRadius: 0.36, spoiler: "lip" },
  },
  porsche911turbo: {
    brand: "Porsche",
    model: "911 Turbo S",
    grade: "992.2 T-Hybrid",
    className: "S+",
    engine: "3.6L twin-turbo flat-six hybrid",
    drivetrain: "AWD",
    powerHp: 701,
    zeroTo100: 2.5,
    weightKg: 1737,
    maxSpeed: 322,
    accel: 142,
    handling: 1.08,
    boost: 1.02,
    grip: 1.1,
    price: 520000,
    tier: 5,
    color: "#b8c2c9",
    accent: "#16d6ff",
    roof: "#101419",
    profile: "gt",
    sim: {
      wheelbase: 2.45, frontWeight: 0.39, cgHeight: 0.42, dragArea: 0.64, downforce: 1.75,
      tyreGrip: 1.58, brakeForce: 20600, redline: 7500, idleRpm: 900, peakRpm: 6750, gearbox: "dct8",
    },
    audio: { harmonics: [1, 0.46, 0.5, 0.26, 0.16], type: "sawtooth", turbo: 0.88, growl: 0.48, cutoff: 1600 },
    body: { length: 4.55, width: 1.9, height: 1.3, wheelRadius: 0.36, spoiler: "wing" },
  },
};

/**
 * Stamp each car with its roster key, and take its physical dimensions from the body blueprint so
 * the published figures live in exactly one place: the blueprint is what the model is built from,
 * so it is also what the physics should measure.
 */
for (const [id, car] of Object.entries(CARS)) {
  car.id = id;
  const blueprint = carBlueprint(id);
  car.body = {
    ...car.body,
    length: blueprint.length,
    width: blueprint.width,
    height: blueprint.height,
    wheelRadius: blueprint.tyre.rear.radius,
    trackWidth: blueprint.track[1],
  };
  car.sim.wheelbase = blueprint.wheelbase;
}

export const STARTER_CAR = "toyotasupra";

export const CAR_IDS = Object.keys(CARS);

export function getGearbox(car) {
  return GEARBOX[car.sim.gearbox] || GEARBOX.dct7;
}

/**
 * Peak crank torque in Nm, back-solved from the published power figure so the roster stays
 * data-driven: P(W) = T(Nm) * omega(rad/s) at the power peak, with a shape allowance for the
 * torque curve being flatter than the power curve.
 */
export function peakTorque(car) {
  const watts = car.powerHp * 735.5;
  const omega = (car.sim.peakRpm * 2 * Math.PI) / 60;
  return (watts / omega) * 1.12;
}

/** Marketing-friendly single number used to sort and grade the garage. */
export function calculatePerformanceIndex(car) {
  const speedScore = clampIndex((car.maxSpeed - 270) * 1.65, 0, 120);
  const launchScore = clampIndex((4.2 - car.zeroTo100) * 56, 0, 110);
  const powerScore = clampIndex((car.powerHp - 480) * 0.18, 0, 90);
  const handlingScore = clampIndex((car.handling + car.grip - 1.95) * 95, 0, 90);
  return Math.round(700 + speedScore + launchScore + powerScore + handlingScore);
}

function clampIndex(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
