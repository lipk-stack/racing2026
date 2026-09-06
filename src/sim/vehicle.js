/**
 * Vehicle dynamics.
 *
 * A single-track ("bicycle") model solved in track-relative curvilinear coordinates: the car owns a
 * distance along the racing surface (`s`), a lateral offset from the centreline (`n`) and a yaw
 * angle relative to the track tangent. That keeps lap counting, AI and pursuit logic trivial while
 * still giving real slip angles, weight transfer and drift.
 *
 * Everything here is pure: no DOM, no three.js, no module state. `src/sim/race.js` owns the state
 * object and the track sampler is injected, which is what makes the model testable from Node.
 */

import { getGearbox, peakTorque } from "../data/cars.js";
import { upgradeMultipliers } from "../data/upgrades.js";

export const GRAVITY = 9.81;
const AIR_DENSITY = 1.225;
const ROLLING_RESISTANCE = 0.014;
const DRIVETRAIN_EFFICIENCY = 0.88;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Fractional progress of `n` through a repeating span of `total`. */
export function percentRemaining(n, total) {
  return (n % total) / total;
}

/**
 * Simplified Pacejka "magic formula" lateral tyre curve.
 * Rises steeply to a peak near 0.14 rad of slip, then falls away into the slide the drift score
 * rewards. Returns a force in newtons.
 */
export function tyreForce(slipAngle, load, grip = 1) {
  const B = 18;
  const C = 1.42;
  const D = grip * Math.max(0, load);
  const E = -0.15;
  const x = clamp(slipAngle, -1.4, 1.4);
  const inner = B * x;
  return D * Math.sin(C * Math.atan(inner - E * (inner - Math.atan(inner))));
}

/** Slip angle, in radians, at which the tyre curve peaks. */
export const PEAK_SLIP = 0.105;

/** Peak lateral force a tyre can deliver, used for AI corner speeds and the grip meter. */
export function peakTyreForce(load, grip = 1) {
  return tyreForce(PEAK_SLIP, load, grip);
}

/**
 * Static axle split adjusted by longitudinal acceleration.
 * Returns the fraction of total vertical load carried by each axle; the two always sum to 1.
 */
export function weightTransfer(longitudinalAccel, spec) {
  const shift = (longitudinalAccel * spec.cgHeight) / (spec.wheelbase * GRAVITY);
  const front = clamp(spec.frontWeight - shift, 0.08, 0.92);
  return { front, rear: 1 - front };
}

/**
 * Crank torque in Nm. A broad bell around the power peak with a plateau on either side, so the
 * car pulls out of corners instead of falling off a cliff below the peak.
 */
export function engineTorque(rpm, spec) {
  if (rpm <= 0) return 0;
  const ratio = rpm / spec.peakRpm;
  const shape = ratio < 1
    ? 0.58 + 0.42 * Math.sin(clamp(ratio, 0, 1) * Math.PI * 0.5) ** 0.6
    : clamp(1 - (ratio - 1) * 0.72, 0.42, 1);
  const idleFade = clamp((rpm - spec.idleRpm * 0.5) / (spec.idleRpm * 0.9), 0, 1);
  return spec.peakTorque * shape * idleFade;
}

/** Engine speed implied by road speed in a given gear. */
export function wheelRpm(speed, gearIndex, spec) {
  const ratio = spec.gearRatios[clamp(gearIndex, 0, spec.gearRatios.length - 1)];
  const wheelRevs = Math.abs(speed) / (2 * Math.PI * spec.wheelRadius);
  return wheelRevs * 60 * ratio * spec.finalDrive;
}

/** Road speed at which a gear hits the limiter - the ceiling the gearbox imposes on top speed. */
export function gearTopSpeed(gearIndex, spec) {
  const ratio = spec.gearRatios[clamp(gearIndex, 0, spec.gearRatios.length - 1)];
  return (spec.redline / 60 / (ratio * spec.finalDrive)) * 2 * Math.PI * spec.wheelRadius;
}

/** Automatic gearbox logic: shift up near the limiter, down when the engine drops off song. */
export function autoGear(gearIndex, rpm, spec, throttle = 1) {
  const upshiftAt = spec.redline * (0.94 - (1 - throttle) * 0.18);
  const downshiftAt = spec.peakRpm * (0.52 + throttle * 0.06);
  if (rpm > upshiftAt && gearIndex < spec.gearRatios.length - 1) return gearIndex + 1;
  if (rpm < downshiftAt && gearIndex > 0) return gearIndex - 1;
  return gearIndex;
}

/**
 * Grip multiplier for where the car actually is across the road.
 * Asphalt, then a kerb band that still bites, then run-off that does not.
 */
export function surfaceGrip(lateralOffset, halfWidth, weatherGrip = 1) {
  const distance = Math.abs(lateralOffset);
  if (distance <= halfWidth - 0.35) return weatherGrip;
  if (distance <= halfWidth + 0.9) return weatherGrip * 0.9;
  if (distance <= halfWidth + 3.2) return weatherGrip * 0.62;
  return weatherGrip * 0.44;
}

export const WEATHER_GRIP = { dry: 1, damp: 0.93, wet: 0.86, storm: 0.79 };

/** Speed-sensitive steering limit in radians. */
export function steerLimit(speed) {
  return 0.44 * (1 - 0.66 * clamp(speed / 76, 0, 1));
}

/**
 * Build the simulation spec for a car plus its owned upgrades.
 *
 * The final drive is solved from the published top speed so a car reaches its spec-sheet number at
 * the limiter in top gear - the gearbox data then only describes ratio spacing.
 */
export function createVehicleSpec(car, upgrades = {}) {
  const mult = upgradeMultipliers(upgrades);
  const gearbox = getGearbox(car);
  const sim = car.sim;
  const mass = car.weightKg * mult.mass;
  const wheelRadius = car.body.wheelRadius;
  const topSpeedMs = car.maxSpeed / 3.6;
  const topRatio = gearbox.ratios[gearbox.ratios.length - 1];
  const peakRpm = sim.peakRpm * mult.peakRpm;
  const finalDrive =
    ((sim.redline / 60) * 2 * Math.PI * wheelRadius) / (topRatio * topSpeedMs) * mult.finalDrive;

  return {
    id: car.id || `${car.brand} ${car.model}`,
    mass,
    wheelbase: sim.wheelbase,
    frontWeight: sim.frontWeight,
    cgHeight: sim.cgHeight,
    wheelRadius,
    trackWidth: car.body.width,
    dragArea: sim.dragArea * mult.dragArea,
    downforce: sim.downforce * mult.downforce,
    tyreGrip: sim.tyreGrip * mult.grip,
    brakeForce: sim.brakeForce * mult.brakeForce,
    gearRatios: gearbox.ratios,
    finalDrive,
    shiftTime: gearbox.shiftTime * mult.shiftTime,
    redline: sim.redline,
    idleRpm: sim.idleRpm,
    peakRpm,
    peakTorque: peakTorque(car) * mult.power,
    drivetrain: car.drivetrain,
    topSpeedMs,
    nitrous: {
      force: 5600 * car.boost * mult.nitrousForce,
      capacity: 100 * mult.nitrousCapacity,
      drain: 26,
      refill: 5.5,
    },
    inertia: mass * sim.wheelbase * sim.frontWeight * (1 - sim.frontWeight) * 2.4,
  };
}

export function createVehicleState(overrides = {}) {
  return {
    s: 0,
    n: 0,
    yaw: 0,
    speed: 0,
    lateral: 0,
    yawRate: 0,
    gear: 0,
    rpm: 0,
    shiftTimer: 0,
    nitro: 100,
    slipFront: 0,
    slipRear: 0,
    driftAngle: 0,
    wheelSpin: 0,
    gripUsage: 0,
    accelLong: 0,
    accelLat: 0,
    airborne: 0,
    ...overrides,
  };
}

const NEUTRAL_CONTROLS = { steer: 0, throttle: 0, brake: 0, handbrake: false, nitro: false };

/**
 * Advance the vehicle by `dt` seconds.
 *
 * `sample` is a track lookup taking a distance and returning `{ curvature, halfWidth, grade }`.
 * Returns the events the presentation layer cares about (shifts, wall hits, wheelspin) rather than
 * touching anything outside the state object.
 */
export function stepVehicle(state, spec, controls, track, dt, options = {}) {
  const input = { ...NEUTRAL_CONTROLS, ...controls };
  const assist = options.assist !== false;
  const weatherGrip = options.weatherGrip ?? 1;
  const events = { shifted: false, hitWall: false, wallImpact: 0, wheelspin: false, offTrack: false };

  const sample = track.sample(state.s);
  const halfWidth = sample.halfWidth;
  const grip = spec.tyreGrip * surfaceGrip(state.n, halfWidth, weatherGrip);
  const speed = Math.max(state.speed, 0);
  const steer = clamp(input.steer, -1, 1) * steerLimit(speed);

  // --- vertical load -------------------------------------------------------
  const downforce = spec.downforce * speed * speed * 0.5;
  const totalLoad = spec.mass * GRAVITY + downforce;
  const split = weightTransfer(state.accelLong, spec);
  const loadFront = totalLoad * split.front;
  const loadRear = totalLoad * split.rear;

  // --- slip angles ---------------------------------------------------------
  const vx = Math.max(speed, 1.2);
  const a = spec.wheelbase * (1 - spec.frontWeight);
  const b = spec.wheelbase * spec.frontWeight;
  const slipFront = Math.atan2(state.lateral + a * state.yawRate, vx) - steer;
  const slipRear = Math.atan2(state.lateral - b * state.yawRate, vx);
  const handbrakeGrip = input.handbrake ? 0.45 : 1;
  const assistTrim = assist ? 0.88 : 1;

  const forceFront = -tyreForce(slipFront, loadFront, grip);
  const forceRear = -tyreForce(slipRear, loadRear, grip * handbrakeGrip) * (assist ? 1.06 : 1);

  // --- drivetrain ----------------------------------------------------------
  if (state.shiftTimer > 0) state.shiftTimer = Math.max(0, state.shiftTimer - dt);
  const rpmRaw = wheelRpm(speed, state.gear, spec);
  state.rpm = clamp(Math.max(rpmRaw, spec.idleRpm), spec.idleRpm, spec.redline * 1.02);
  if (state.shiftTimer === 0) {
    const nextGear = autoGear(state.gear, state.rpm, spec, input.throttle);
    if (nextGear !== state.gear) {
      state.gear = nextGear;
      state.shiftTimer = spec.shiftTime;
      events.shifted = true;
    }
  }

  const ratio = spec.gearRatios[state.gear];
  const shifting = state.shiftTimer > 0;
  const limiter = state.rpm >= spec.redline ? 0.35 : 1;
  const torque = shifting ? 0 : engineTorque(state.rpm, spec) * input.throttle * limiter;
  let driveForce = (torque * ratio * spec.finalDrive * DRIVETRAIN_EFFICIENCY) / spec.wheelRadius;

  // Traction circle: whatever the driven axle is already using laterally is not available for drive.
  const drivenLoad = spec.drivetrain === "AWD" ? totalLoad : loadRear;
  const usedLateral = spec.drivetrain === "AWD" ? Math.abs(forceFront) + Math.abs(forceRear) : Math.abs(forceRear);
  const tractionLimit = Math.sqrt(Math.max(0, (grip * drivenLoad) ** 2 - usedLateral ** 2));
  if (driveForce > tractionLimit) {
    events.wheelspin = true;
    state.wheelSpin = clamp(state.wheelSpin + dt * 3.4, 0, 1);
    driveForce = tractionLimit + (driveForce - tractionLimit) * (assist ? 0.06 : 0.2);
  } else {
    state.wheelSpin = Math.max(0, state.wheelSpin - dt * 2.6);
  }

  const nitroReady = input.nitro && state.nitro > 0 && speed > 8;
  if (nitroReady) {
    driveForce += spec.nitrous.force;
    state.nitro = Math.max(0, state.nitro - spec.nitrous.drain * dt);
  } else {
    state.nitro = Math.min(spec.nitrous.capacity, state.nitro + spec.nitrous.refill * dt);
  }

  const brakeDemand = input.brake * spec.brakeForce + (input.handbrake ? spec.brakeForce * 0.42 : 0);
  const brakeForce = speed > 0.4 ? -Math.min(brakeDemand, grip * totalLoad * 1.05) : 0;
  const drag = -0.5 * AIR_DENSITY * spec.dragArea * speed * speed * Math.sign(speed || 1);
  const rolling = -ROLLING_RESISTANCE * totalLoad * Math.sign(speed || 1) * clamp(speed / 3, 0, 1);
  const slope = -Math.sin(sample.grade || 0) * spec.mass * GRAVITY;

  // --- rigid body ----------------------------------------------------------
  const longForce = driveForce + brakeForce + drag + rolling + slope - forceFront * Math.sin(steer);
  const latForce = forceFront * Math.cos(steer) + forceRear;
  const yawMoment = (a * forceFront * Math.cos(steer) - b * forceRear) * assistTrim;

  const accelLong = longForce / spec.mass + state.lateral * state.yawRate;
  const accelLat = latForce / spec.mass - speed * state.yawRate;
  const yawAccel = yawMoment / spec.inertia;

  state.speed = Math.max(0, state.speed + accelLong * dt);
  state.lateral += accelLat * dt;
  state.yawRate += yawAccel * dt;
  state.accelLong = accelLong;
  state.accelLat = accelLat;

  // Low-speed damping keeps the model calm when the tyre model loses meaning.
  const settle = clamp(1 - state.speed / 6, 0, 1);
  state.lateral *= 1 - settle * 0.55 * clamp(dt * 60, 0, 1);
  state.yawRate *= 1 - settle * 0.6 * clamp(dt * 60, 0, 1);
  if (assist) state.yawRate *= 1 - clamp(Math.abs(state.yawRate) * 0.12, 0, 0.14);

  // --- curvilinear mapping -------------------------------------------------
  const curvature = sample.curvature;
  const denominator = Math.max(0.25, 1 - state.n * curvature);
  const sDot = (state.speed * Math.cos(state.yaw) - state.lateral * Math.sin(state.yaw)) / denominator;
  const nDot = state.speed * Math.sin(state.yaw) + state.lateral * Math.cos(state.yaw);
  state.s += sDot * dt;
  state.n += nDot * dt;
  state.yaw += (state.yawRate - curvature * sDot) * dt;
  if (state.yaw > Math.PI) state.yaw -= Math.PI * 2;
  if (state.yaw < -Math.PI) state.yaw += Math.PI * 2;

  // --- barriers ------------------------------------------------------------
  const barrier = halfWidth + (sample.runoff ?? 3.6);
  if (Math.abs(state.n) > barrier) {
    const side = Math.sign(state.n);
    events.hitWall = true;
    events.wallImpact = clamp(Math.abs(nDot) / 16 + state.speed / 140, 0, 1);
    state.n = side * barrier;
    state.lateral = -state.lateral * 0.28;
    state.speed *= 1 - clamp(events.wallImpact * 0.42, 0.04, 0.5);
    state.yawRate *= -0.25;
    state.yaw = lerp(state.yaw, 0, 0.35);
  }
  events.offTrack = Math.abs(state.n) > halfWidth + 0.9;

  state.slipFront = slipFront;
  state.slipRear = slipRear;
  state.driftAngle = Math.atan2(state.lateral, Math.max(state.speed, 1));
  state.gripUsage = clamp(
    (Math.abs(forceFront) + Math.abs(forceRear)) / Math.max(1, grip * totalLoad),
    0,
    1.4,
  );
  return events;
}

/* ------------------------------------------------------------------------- *
 * Arcade-scale helpers.
 *
 * These carry the tuned constants from the original build and remain the contract used by the HUD,
 * the style scoring and the published tests. Distances are in decimetres so the numbers keep the
 * feel they were tuned with.
 * ------------------------------------------------------------------------- */

export function calculateSlipstream(distanceAhead, laneGap) {
  if (distanceAhead <= 0 || distanceAhead > 620 || laneGap > 0.42) return 0;
  const distancePower = 1 - distanceAhead / 620;
  const lanePower = 1 - laneGap / 0.42;
  return clamp(distancePower * lanePower, 0, 1);
}

export function calculateGear(speed, maxSpeed) {
  if (speed < 12 || maxSpeed <= 0) return "N";
  return String(clamp(Math.floor((speed / maxSpeed) * 6) + 1, 1, 6));
}

export function calculateGripLoad(playerX, speedPercent, curve, boostActive = false) {
  const cornerLoad = Math.abs(curve) * speedPercent * 18;
  const edgeLoad = Math.max(0, Math.abs(playerX) - 0.72) * 38;
  const boostLoad = boostActive ? 8 : 0;
  return clamp(Math.round(100 - cornerLoad - edgeLoad - boostLoad), 0, 100);
}

export function scoreNearMiss(speed, laneGap, combo) {
  const precision = clamp((0.62 - laneGap) / 0.4, 0, 1);
  const speedBonus = clamp((speed - 120) / 190, 0, 1);
  return Math.round((140 + precision * 260 + speedBonus * 220) * combo);
}

/** Drift points per second for the drift-zone contract: angle and speed both have to be there. */
export function scoreDrift(driftAngle, speed, combo = 1) {
  const angle = Math.abs(driftAngle);
  if (angle < 0.12 || speed < 14) return 0;
  const angleScore = clamp((angle - 0.1) / 0.55, 0, 1.25);
  const speedScore = clamp(speed / 55, 0, 1.3);
  return angleScore * speedScore * 620 * combo;
}
