/**
 * Rival and police driver models.
 *
 * AI cars run the *same* `stepVehicle` dynamics as the player - only the controls differ. A Stanley
 * style path tracker steers toward the racing line while a lookahead speed planner brakes for the
 * corner it can see, so rivals lose time where a human would and comebacks stay possible.
 */

import { clamp, lerp, steerLimit, stepVehicle } from "./vehicle.js";

/**
 * Fastest speed (m/s) the car can carry through the tightest corner inside the lookahead window,
 * allowing for how long it takes to shed the difference.
 */
export function planTargetSpeed(path, distance, spec, gripScale = 1, skill = 1) {
  const grip = spec.tyreGrip * gripScale;
  const margin = 0.72 + skill * 0.1;
  let target = spec.topSpeedMs;
  const horizon = 240;
  for (let ahead = 4; ahead < horizon; ahead += 6) {
    const sample = path.sample(distance + ahead);
    const curvature = Math.abs(sample.curvature);
    if (curvature < 2e-5) continue;
    // v^2 * k = grip * (g + downforce * v^2 / (2 * mass))  ->  solve for v.
    const aeroTerm = (grip * spec.downforce * 0.5) / spec.mass;
    const denominator = curvature - aeroTerm;
    const corner = denominator <= 1e-6
      ? spec.topSpeedMs
      : Math.sqrt((grip * 9.81) / denominator) * margin;
    if (corner >= spec.topSpeedMs) continue;
    // How fast we may be going now and still scrub down to `corner` by the time we arrive.
    const brakeCapacity = (spec.brakeForce / spec.mass) * (0.55 + skill * 0.25);
    const reachable = Math.sqrt(Math.max(0, corner * corner + 2 * brakeCapacity * ahead));
    target = Math.min(target, reachable);
  }
  return clamp(target, 9, spec.topSpeedMs);
}

/**
 * Normalised steering command (-1..1) that tracks a lateral target on the path.
 * Feed-forward for the corner's own curvature, then a Stanley-style correction for heading and
 * cross-track error, so the car settles on the line instead of sawing across it.
 */
export function steerToTarget(state, spec, path, targetOffset, lookahead) {
  const ahead = path.sample(state.s + lookahead);
  // Feed-forward includes an understeer term: faster corners need more lock for the same radius.
  const understeer = spec.wheelbase + 0.0016 * state.speed * state.speed;
  const feedForward = path.sample(state.s + lookahead * 0.55).curvature * understeer;
  const targetAhead = clamp(ahead.racingLine, -path.halfWidth + 1.2, path.halfWidth - 1.2);
  const desiredYaw = Math.atan2(targetAhead - targetOffset, Math.max(lookahead, 1));
  const crossTrack = state.n - targetOffset;
  const headingTerm = (desiredYaw - state.yaw) * 2.6;
  const crossTerm = Math.atan2(-crossTrack * 1.8, Math.max(9, state.speed));
  const damping = -state.yawRate * 0.09;
  const angle = feedForward + headingTerm + crossTerm + damping;
  return clamp(angle / Math.max(steerLimit(state.speed), 0.05), -1, 1);
}

/** Throttle/brake pair that converges on a target speed. */
export function paceControls(speed, target) {
  const error = target - speed;
  if (error > 0.6) return { throttle: clamp(error / 6, 0.25, 1), brake: 0 };
  if (error < -1.2) return { throttle: 0, brake: clamp(-error / 9, 0.15, 1) };
  return { throttle: clamp(0.35 + error * 0.3, 0, 0.75), brake: 0 };
}

/**
 * One AI driving step. `personality` blends aggression (how late they brake and how hard they
 * defend) with consistency (how often they make a mistake).
 */
export function driveAI(entity, spec, path, dt, context = {}) {
  const { skill = 1, gripScale = 1, aggression = 0.5 } = entity.personality || {};
  const state = entity.state;
  const lookahead = clamp(7 + state.speed * 0.52, 11, 46);

  entity.mistakeTimer = (entity.mistakeTimer || 0) - dt;
  if (entity.mistakeTimer <= 0) {
    entity.mistakeTimer = 4 + Math.random() * 7;
    entity.mistake = Math.random() > 0.55 + skill * 0.3 ? (Math.random() - 0.5) * 1.6 : 0;
  }

  const lineOffset = path.sample(state.s).racingLine;
  const target = clamp(lineOffset + (entity.laneBias || 0), -path.halfWidth + 1.4, path.halfWidth - 1.4);
  const steer = clamp(steerToTarget(state, spec, path, target, lookahead) + (entity.mistake || 0) * 0.05, -1, 1);

  let targetSpeed = planTargetSpeed(path, state.s, spec, gripScale, skill) * (0.9 + skill * 0.12);
  if (context.rubberBand) targetSpeed *= context.rubberBand;
  if (entity.blockedBy) targetSpeed = Math.min(targetSpeed, entity.blockedBy);

  const pace = paceControls(state.speed, targetSpeed);
  const nitro = Boolean(context.allowNitro) && state.nitro > 35 && Math.abs(path.sample(state.s).curvature) < 0.004
    && aggression > 0.4;

  return stepVehicle(
    state,
    spec,
    { steer, throttle: pace.throttle, brake: pace.brake, nitro },
    path,
    dt,
    { assist: true, weatherGrip: context.weatherGrip ?? 1 },
  );
}

/**
 * Lateral bias used to attack or defend. Rivals ease out of the racing line when someone is
 * alongside, which is what turns a pass into a battle instead of a collision.
 */
export function updateLaneBias(entity, neighbours, path, dt) {
  let desired = 0;
  for (const other of neighbours) {
    if (other === entity) continue;
    const gap = path.signedDelta(entity.state.s, other.state.s);
    if (Math.abs(gap) > 14) continue;
    const lateral = other.state.n - entity.state.n;
    if (Math.abs(lateral) > 4.5) continue;
    desired += lateral > 0 ? -2.6 : 2.6;
  }
  entity.laneBias = lerp(entity.laneBias || 0, clamp(desired, -3.4, 3.4), clamp(dt * 2.2, 0, 1));
  return entity.laneBias;
}

/**
 * Keeps a race alive without making the result meaningless: rivals ahead of the player ease off a
 * little, rivals behind push a little, bounded so pace still has to be earned.
 */
export function rubberBandFactor(gapToPlayer, strength = 1) {
  const normalised = clamp(gapToPlayer / 320, -1, 1);
  return 1 + normalised * 0.075 * strength;
}
