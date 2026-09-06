/**
 * Police pursuit layer.
 *
 * Heat rises from the way you drive - nitrous signatures, near misses, contact, leading the pack -
 * and decays when you behave. Once a pursuit is live, chase units run the same driver model as the
 * rivals but target the player rather than the racing line, and roadblocks are dropped ahead.
 *
 * The four scoring helpers keep the units they were tuned in: distances in decimetres, speed in
 * km/h. They are the published contract for the pursuit HUD and the tests.
 */

import { PURSUIT } from "../data/events.js";
import { clamp, createVehicleState, stepVehicle, steerLimit } from "./vehicle.js";
import { paceControls, planTargetSpeed } from "./ai.js";

export function calculateHeatLevel(heat) {
  if (heat < 18) return 0;
  if (heat < 38) return 1;
  if (heat < 58) return 2;
  if (heat < 78) return 3;
  if (heat < 94) return 4;
  return 5;
}

export function calculatePursuitPressure(distance, laneGap, heatLevel) {
  if (heatLevel <= 0) return 0;
  const proximity = clamp((720 - distance) / 720, 0, 1);
  const interception = clamp((0.58 - laneGap) / 0.58, 0, 1);
  return clamp(proximity * 0.66 + interception * 0.24 + heatLevel * 0.04, 0, 1);
}

export function calculateEvadeProgress(current, pressure, speed, dt) {
  const pace = clamp((speed - 130) / 130, 0, 1);
  const gain = pressure < 0.18 ? (0.55 + pace * 0.75) * dt : -pressure * 1.35 * dt;
  return clamp(current + gain, 0, PURSUIT.evadeSeconds);
}

/** Reward for shaking a pursuit, scaled by how hot it was when you lost them. */
export function evadeBonus(heatLevel) {
  return 1200 + heatLevel * 450;
}

export function createPursuitState(heatStart = 0) {
  return {
    heat: heatStart,
    level: calculateHeatLevel(heatStart),
    active: heatStart > 0 && calculateHeatLevel(heatStart) > 0,
    timer: 0,
    evadeProgress: 0,
    bustProgress: 0,
    pressure: 0,
    flash: 0,
    roadblockCooldown: 5,
    units: [],
  };
}

export function addHeat(pursuit, amount, onEscalate) {
  if (amount <= 0) return pursuit.level;
  const previous = pursuit.level;
  pursuit.heat = clamp(pursuit.heat + amount, 0, 100);
  pursuit.level = calculateHeatLevel(pursuit.heat);
  if (pursuit.level > 0 && !pursuit.active) {
    pursuit.active = true;
    pursuit.flash = 1;
    if (onEscalate) onEscalate("start", pursuit.level);
  } else if (pursuit.level > previous) {
    pursuit.flash = 1;
    if (onEscalate) onEscalate("escalate", pursuit.level);
  }
  return pursuit.level;
}

export function spawnUnit(pursuit, kind, distance, offset, spec) {
  pursuit.units.push({
    kind,
    spec,
    state: createVehicleState({ s: distance, n: offset, speed: kind === "roadblock" ? 0 : 46 }),
    laneTimer: 0.8 + Math.random() * 1.8,
    nearMissArmed: true,
    life: 0,
  });
}

/** How many chase cars the current heat level justifies. */
export function requiredUnits(level) {
  return level <= 0 ? 0 : clamp(1 + Math.floor(level / 2), 1, 3);
}

/**
 * Drive one chase unit. Unlike a rival it steers at the player's lateral position rather than the
 * racing line, which is what makes a pursuit feel like being hunted.
 */
export function drivePursuitUnit(unit, path, player, dt, weatherGrip) {
  if (unit.kind === "roadblock") return { hitWall: false };
  const state = unit.state;
  const gap = path.signedDelta(state.s, player.s);
  const desiredOffset = clamp(player.n + Math.sign(gap || 1) * 0.9, -path.halfWidth + 1.2, path.halfWidth - 1.2);

  unit.laneTimer -= dt;
  if (unit.laneTimer <= 0) {
    unit.laneTimer = 1.1 + Math.random() * 1.8;
    unit.jink = (Math.random() - 0.5) * 2.2;
  }

  const lookahead = clamp(7 + state.speed * 0.52, 11, 46);
  const ahead = path.sample(state.s + lookahead);
  const understeer = unit.spec.wheelbase + 0.0016 * state.speed * state.speed;
  const feedForward = path.sample(state.s + lookahead * 0.55).curvature * understeer;
  const crossTrack = state.n - desiredOffset;
  const angle = feedForward
    + (Math.atan2(ahead.racingLine - state.n, lookahead) - state.yaw) * 2.2
    + Math.atan2(-crossTrack * 1.7, Math.max(9, state.speed))
    - state.yawRate * 0.09
    + (unit.jink || 0) * 0.01;
  const steer = clamp(angle / Math.max(steerLimit(state.speed), 0.05), -1, 1);

  // Close the gap when behind, hold station when alongside, never simply teleport.
  const chaseBias = gap > 24 ? 1.14 : gap < -60 ? 0.9 : 1.02;
  const planned = planTargetSpeed(path, state.s, unit.spec, weatherGrip, 0.92) * chaseBias;
  const target = Math.min(planned, Math.max(player.speed * chaseBias, 22));
  const pace = paceControls(state.speed, target);

  return stepVehicle(state, unit.spec, { steer, ...pace }, path, dt, {
    assist: true,
    weatherGrip,
  });
}

/** Recycle units that fall too far behind or get left in front, so a pursuit never simply ends. */
export function recyclePursuitUnits(pursuit, path, playerDistance) {
  for (const unit of pursuit.units) {
    if (unit.kind !== "pursuit") continue;
    const gap = path.signedDelta(unit.state.s, playerDistance);
    if (gap > 2600 || gap < -1700) {
      unit.state.s = path.wrap(playerDistance - PURSUIT.spawnDistance / 10);
      unit.state.speed = Math.max(unit.state.speed, 44);
      unit.state.n = clamp(unit.state.n, -path.halfWidth + 1.5, path.halfWidth - 1.5);
    }
  }
}
