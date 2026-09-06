/**
 * Race state machine.
 *
 * Owns everything that happens between "GO" and the results screen: the player car, the rival
 * field, the pursuit, lap and sector timing, the style economy and each contract's own objective.
 * It is deliberately renderer-free - `update()` returns the events the presentation layer reacts to
 * and `snapshot()` exposes world poses - so the whole race can be stepped headlessly in a test.
 */

import { CARS, CAR_IDS } from "../data/cars.js";
import { DIFFICULTY, EVENTS, PURSUIT } from "../data/events.js";
import { TRACKS } from "../data/tracks.js";
import { buildTrackPath } from "./trackpath.js";
import {
  WEATHER_GRIP,
  calculateSlipstream,
  clamp,
  createVehicleSpec,
  createVehicleState,
  lerp,
  percentRemaining,
  scoreDrift,
  scoreNearMiss,
  stepVehicle,
} from "./vehicle.js";
import { driveAI, rubberBandFactor, updateLaneBias } from "./ai.js";
import {
  addHeat,
  calculateEvadeProgress,
  calculateHeatLevel,
  calculatePursuitPressure,
  createPursuitState,
  drivePursuitUnit,
  evadeBonus,
  recyclePursuitUnits,
  requiredUnits,
  spawnUnit,
} from "./pursuit.js";

const RIVAL_COLORS = ["#31f5ff", "#ffb82f", "#f64f59", "#51ff7b", "#e6e9ef", "#c07bff"];
const GRID_GAP = 11;
const COUNTDOWN = 3.2;

function pickRivalCars(playerCarId, count) {
  const playerTier = CARS[playerCarId]?.tier ?? 3;
  const pool = CAR_IDS
    .filter((id) => id !== playerCarId)
    .sort((a, b) => Math.abs(CARS[a].tier - playerTier) - Math.abs(CARS[b].tier - playerTier));
  const chosen = [];
  for (let i = 0; i < count; i += 1) chosen.push(pool[i % pool.length]);
  return chosen;
}

/**
 * Create a race. `options.upgrades` is the player's owned parts for the selected car, so a built
 * car is faster here in exactly the way the garage promised.
 */
export function createRace(options) {
  const {
    eventType = "circuit",
    carId = "toyotasupra",
    difficulty = "street",
    upgrades = {},
    trackId,
    timeTrial = false,
    rivalCount = 5,
  } = options || {};

  const event = EVENTS[eventType] || EVENTS.circuit;
  const track = TRACKS[trackId || event.track] || TRACKS.nightlineBay;
  const path = buildTrackPath(track);
  const settings = DIFFICULTY[difficulty] || DIFFICULTY.street;
  const solo = timeTrial || eventType === "timeattack";
  const weatherGrip = (WEATHER_GRIP[track.weather] || 1) * settings.grip;

  const playerSpec = createVehicleSpec(CARS[carId], upgrades);
  const player = {
    id: "player",
    carId,
    spec: playerSpec,
    state: createVehicleState({ s: 0 }),
    progress: 0,
    lastS: 0,
    lap: 1,
    lapTime: 0,
    bestLap: Infinity,
    lastLap: 0,
    sector: 0,
    sectorTimes: [],
    finished: false,
  };

  const fieldSize = solo ? 0 : event.boss ? 1 : Math.round(rivalCount * (event.elimination ? 1.2 : 1));
  const rivalCars = pickRivalCars(carId, fieldSize);
  const rivals = rivalCars.map((rivalCarId, i) => {
    const startS = path.wrap(-GRID_GAP * (i + 1));
    const spec = createVehicleSpec(CARS[rivalCarId], event.boss ? { engine: 2, tyres: 2, aero: 1 } : {});
    const skillBase = event.boss ? 1.05 : 0.74 + (fieldSize - i) / (fieldSize + 2) * 0.3;
    return {
      id: `rival${i}`,
      carId: rivalCarId,
      name: event.boss ? "NIGHTLINE" : `R${i + 1}`,
      color: RIVAL_COLORS[i % RIVAL_COLORS.length],
      spec,
      state: createVehicleState({ s: startS, n: (i % 2 ? 1 : -1) * (1.6 + (i % 3) * 1.1), speed: 0 }),
      progress: -GRID_GAP * (i + 1),
      lastS: startS,
      lap: 1,
      personality: {
        skill: clamp(skillBase * settings.rivals, 0.55, 1.12),
        gripScale: weatherGrip,
        aggression: 0.35 + Math.random() * 0.5,
      },
      laneBias: 0,
      nearMissArmed: true,
      eliminated: false,
      finished: false,
    };
  });

  const pursuit = createPursuitState(solo ? 0 : event.heatStart || 0);
  if (pursuit.active) {
    spawnUnit(pursuit, "pursuit", path.wrap(-120), 2.2, createVehicleSpec(CARS.fordmustang, { engine: 1, tyres: 1 }));
  }

  const gates = [];
  if (event.gates) {
    const spacing = path.length / 14;
    for (let i = 1; i <= 14; i += 1) {
      const distance = spacing * i;
      gates.push({ distance, offset: path.sample(distance).racingLine, hit: false, index: i });
    }
  }

  return {
    event,
    eventType,
    track,
    path,
    difficulty,
    settings,
    weatherGrip,
    solo,
    player,
    rivals,
    pursuit,
    gates,
    totalLaps: solo ? Math.max(1, event.laps) : event.laps,
    phase: "countdown",
    countdown: COUNTDOWN,
    raceTime: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    driftScore: 0,
    driftTimer: 0,
    nearMisses: 0,
    maxSpeed: 0,
    slipstream: 0,
    airTime: 0,
    gatesHit: 0,
    gateClock: event.gates ? event.gateTime * 2 : 0,
    rank: 1,
    directorCooldown: 0,
    eliminationTimer: 0,
    finishOrder: [],
    result: null,
  };
}

function advance(entity, path) {
  const delta = path.signedDelta(entity.lastS, entity.state.s);
  entity.progress += delta;
  entity.lastS = entity.state.s;
  return delta;
}

function laneGapOf(race, entity) {
  return Math.abs(entity.state.n - race.player.state.n) / race.path.halfWidth;
}

/**
 * Advance the race by `dt`. Returns a list of presentation events - messages, impacts, gear shifts,
 * lap flips - so audio, HUD and camera can all react without polling state.
 */
export function updateRace(race, controls, dt) {
  const events = [];
  const say = (text, kind = "info", duration = 1.4) => events.push({ type: "message", text, kind, duration });

  if (race.phase === "countdown") {
    const before = Math.ceil(race.countdown);
    race.countdown = Math.max(0, race.countdown - dt);
    const after = Math.ceil(race.countdown);
    if (after !== before) events.push({ type: "countdown", value: after, label: after === 0 ? "GO" : String(after) });
    if (race.countdown <= 0) {
      race.phase = "racing";
      events.push({ type: "start" });
    }
    // Rev the engine on the grid but hold the car still.
    race.player.state.speed = 0;
    race.player.state.rpm = lerp(race.player.state.rpm, race.player.spec.idleRpm + controls.throttle * 4200, clamp(dt * 6, 0, 1));
    return events;
  }

  if (race.phase !== "racing") return events;

  const { path, player } = race;
  race.raceTime += dt;
  player.lapTime += dt;
  race.directorCooldown = Math.max(0, race.directorCooldown - dt);
  race.comboTimer = Math.max(0, race.comboTimer - dt);
  if (race.comboTimer === 0) race.combo = lerp(race.combo, 1, clamp(dt * 2.6, 0, 1));

  // --- player ---------------------------------------------------------------
  const playerEvents = stepVehicle(player.state, player.spec, controls, path, dt, {
    assist: controls.assist !== false,
    weatherGrip: race.weatherGrip,
  });
  if (playerEvents.shifted) events.push({ type: "shift", gear: player.state.gear });
  race.wallTimer = Math.max(0, (race.wallTimer || 0) - dt);
  if (playerEvents.hitWall) {
    if (race.wallTimer === 0 && playerEvents.wallImpact > 0.12) {
      race.wallTimer = 0.45;
      events.push({ type: "impact", strength: playerEvents.wallImpact, kind: "wall" });
    }
    race.combo = 1;
    race.comboTimer = 0;
    if (!race.solo) addHeat(race.pursuit, PURSUIT.heatFromImpact * 0.4);
    if (race.directorCooldown === 0) {
      race.directorCooldown = 1.2;
      say("Barrier contact", "warn", 1);
    }
  }
  advance(player, path);
  race.maxSpeed = Math.max(race.maxSpeed, player.state.speed * 3.6);

  // --- style economy --------------------------------------------------------
  const drift = scoreDrift(player.state.driftAngle, player.state.speed, race.combo);
  if (drift > 0 && !playerEvents.offTrack) {
    race.driftScore += drift * dt;
    race.score += drift * dt * 0.4;
    race.driftTimer = 1.1;
    if (race.driftTimer > 0 && race.directorCooldown === 0 && Math.abs(player.state.driftAngle) > 0.42) {
      race.directorCooldown = 3.4;
      say("Angle held", "style", 1);
    }
  } else {
    race.driftTimer = Math.max(0, race.driftTimer - dt);
  }
  if (!race.solo) {
    if (controls.nitro && player.state.nitro > 0 && player.state.speed > 8) {
      addHeat(race.pursuit, PURSUIT.heatFromBoost * dt);
    }
    if (player.state.speed * 3.6 > 250) addHeat(race.pursuit, PURSUIT.heatFromLead * dt * 0.5);
  }

  // --- rivals ---------------------------------------------------------------
  let slipstreamTarget = 0;
  const live = race.rivals.filter((rival) => !rival.eliminated);
  for (const rival of live) {
    updateLaneBias(rival, live, path, dt);
    const gapToPlayer = path.signedDelta(rival.state.s, player.state.s);
    driveAI(rival, rival.spec, path, dt, {
      weatherGrip: race.weatherGrip,
      rubberBand: rubberBandFactor(gapToPlayer, race.settings.rivals),
      allowNitro: true,
    });
    advance(rival, path);

    const ahead = path.signedDelta(player.state.s, rival.state.s);
    const distance = Math.abs(ahead);
    const laneGap = laneGapOf(race, rival);
    if (ahead > 0) slipstreamTarget = Math.max(slipstreamTarget, calculateSlipstream(ahead * 10, laneGap));

    if (distance > 52) rival.nearMissArmed = true;
    if (rival.nearMissArmed && distance < 25 && laneGap >= 0.22 && laneGap < 0.58 && player.state.speed > 34) {
      const points = scoreNearMiss(player.state.speed * 3.6, laneGap, race.combo);
      race.score += points;
      race.nearMisses += 1;
      race.combo = clamp(race.combo + 0.34, 1, 5);
      race.comboTimer = 3.8;
      rival.nearMissArmed = false;
      if (!race.solo) addHeat(race.pursuit, PURSUIT.heatFromNearMiss);
      events.push({ type: "nearmiss", points });
      say(`Near miss +${points}`, "style", 1.1);
    }

    // Car-to-car contact: swap a little momentum, cost both cars time.
    rival.contactTimer = Math.max(0, (rival.contactTimer || 0) - dt);
    if (rival.contactTimer === 0 && distance < 4.6 && Math.abs(rival.state.n - player.state.n) < 2.1) {
      rival.contactTimer = 0.7;
      const closing = player.state.speed - rival.state.speed;
      const side = Math.sign(rival.state.n - player.state.n) || 1;
      player.state.speed -= Math.abs(closing) * 0.16 + 1.2;
      rival.state.speed += closing * 0.1;
      player.state.lateral -= side * 2.4;
      rival.state.lateral += side * 3.1;
      rival.nearMissArmed = false;
      race.combo = 1;
      race.comboTimer = 0;
      if (!race.solo) addHeat(race.pursuit, PURSUIT.heatFromImpact * 0.5);
      events.push({ type: "impact", strength: clamp(Math.abs(closing) / 18 + 0.25, 0.2, 1), kind: "car" });
    }
  }
  race.slipstream = lerp(race.slipstream, slipstreamTarget, clamp(dt * 4, 0, 1));
  if (race.slipstream > 0.08) {
    player.state.speed += 5.2 * race.slipstream * dt;
    player.state.nitro = Math.min(player.spec.nitrous.capacity, player.state.nitro + 9 * race.slipstream * dt);
  }
  if (race.slipstream > 0.42 && race.directorCooldown === 0) {
    race.directorCooldown = 5;
    say("Draft locked", "info", 1);
  }

  updatePursuit(race, dt, events, say);
  updateObjectives(race, dt, events, say);

  // --- laps and sectors -----------------------------------------------------
  const lapDistance = path.length;
  const sectorCount = race.track.sectors || 3;
  const sector = Math.min(sectorCount - 1, Math.floor(percentRemaining(path.wrap(player.state.s), lapDistance) * sectorCount));
  if (sector !== player.sector) {
    player.sector = sector;
    events.push({ type: "sector", index: sector, time: player.lapTime });
  }

  if (player.progress >= player.lap * lapDistance && !player.finished) {
    player.lastLap = player.lapTime;
    player.bestLap = Math.min(player.bestLap, player.lapTime);
    player.lapTime = 0;
    player.lap += 1;
    player.state.nitro = Math.min(player.spec.nitrous.capacity, player.state.nitro + 45);
    if (player.lap > race.totalLaps) {
      finishRace(race, events);
    } else {
      events.push({ type: "lap", lap: player.lap, last: player.lastLap, best: player.bestLap });
      say(`Lap ${player.lap} of ${race.totalLaps}`, "info", 1.5);
      if (race.event.elimination) eliminateLast(race, events, say);
    }
  }

  for (const rival of live) {
    if (rival.progress >= rival.lap * lapDistance) rival.lap += 1;
  }

  race.rank = computeRank(race);
  return events;
}

function updatePursuit(race, dt, events, say) {
  const { pursuit, path, player } = race;
  if (race.solo) return;

  pursuit.flash = Math.max(0, pursuit.flash - dt * 1.8);
  pursuit.roadblockCooldown = Math.max(0, pursuit.roadblockCooldown - dt);
  pursuit.heat = clamp(pursuit.heat - PURSUIT.heatDecay * dt, 0, 100);
  pursuit.level = calculateHeatLevel(pursuit.heat);

  const wanted = requiredUnits(pursuit.level);
  const chasers = pursuit.units.filter((unit) => unit.kind === "pursuit").length;
  if (chasers < wanted) {
    const spec = createVehicleSpec(CARS.fordmustang, { engine: 1, tyres: 1, brakes: 1 });
    spawnUnit(pursuit, "pursuit", path.wrap(player.state.s - 120 - Math.random() * 80), (Math.random() - 0.5) * 4, spec);
    if (pursuit.units.length === 1) say("Police engaged", "danger", 1.6);
  }

  if (pursuit.active && pursuit.level >= 3 && pursuit.roadblockCooldown === 0) {
    const offset = (Math.random() - 0.5) * path.halfWidth;
    const spec = createVehicleSpec(CARS.fordmustang, {});
    spawnUnit(pursuit, "roadblock", path.wrap(player.state.s + 280), offset, spec);
    spawnUnit(pursuit, "roadblock", path.wrap(player.state.s + 292), -offset, spec);
    pursuit.roadblockCooldown = 11 - pursuit.level;
    say("Roadblock ahead", "danger", 1.4);
  }

  let pressure = 0;
  for (let i = pursuit.units.length - 1; i >= 0; i -= 1) {
    const unit = pursuit.units[i];
    unit.life += dt;
    drivePursuitUnit(unit, path, player.state, dt, race.weatherGrip);
    const gap = path.signedDelta(player.state.s, unit.state.s);
    const distance = Math.abs(gap);
    const laneGap = Math.abs(unit.state.n - player.state.n) / path.halfWidth;

    if (unit.kind === "roadblock" && gap < -60) {
      pursuit.units.splice(i, 1);
      continue;
    }

    pressure = Math.max(pressure, calculatePursuitPressure(distance * 10, laneGap, pursuit.level));

    if (distance > 52) unit.nearMissArmed = true;
    if (unit.nearMissArmed && distance < 25 && laneGap >= 0.2 && laneGap < 0.58 && player.state.speed > 38) {
      const points = Math.round(scoreNearMiss(player.state.speed * 3.6, laneGap, race.combo) * 1.35);
      race.score += points;
      race.combo = clamp(race.combo + 0.5, 1, 6);
      race.comboTimer = 4.2;
      unit.nearMissArmed = false;
      events.push({ type: "nearmiss", points, police: true });
      say(`Evade bonus +${points}`, "style", 1.1);
    }

    if (distance < 4.8 && Math.abs(unit.state.n - player.state.n) < 2.2) {
      const severity = unit.kind === "roadblock" ? 0.5 : 0.32;
      player.state.speed *= 1 - severity;
      player.state.lateral += Math.sign(player.state.n - unit.state.n || 1) * 3.2;
      race.combo = 1;
      race.comboTimer = 0;
      pursuit.bustProgress = clamp(pursuit.bustProgress + (unit.kind === "roadblock" ? 1.9 : 1.1), 0, 5);
      addHeat(race.pursuit, PURSUIT.heatFromImpact, () => say("Heat rising", "danger", 1.2));
      events.push({ type: "impact", strength: severity + 0.4, kind: "police" });
      say(unit.kind === "roadblock" ? "Roadblock hit" : "Police contact", "danger", 1);
      if (unit.kind === "roadblock") pursuit.units.splice(i, 1);
    }
  }
  recyclePursuitUnits(pursuit, path, player.state.s);

  pursuit.pressure = lerp(pursuit.pressure, pressure, clamp(dt * 5, 0, 1));
  pursuit.bustProgress = clamp(pursuit.bustProgress - (player.state.speed > 25 ? 0.34 : 0.12) * dt, 0, 5);

  if (pursuit.active) {
    pursuit.timer += dt;
    pursuit.evadeProgress = calculateEvadeProgress(pursuit.evadeProgress, pursuit.pressure, player.state.speed * 3.6, dt);
    if (pursuit.evadeProgress >= PURSUIT.evadeSeconds) {
      const bonus = evadeBonus(pursuit.level);
      race.score += bonus;
      pursuit.heat = clamp(pursuit.heat - 22, 0, 100);
      pursuit.level = calculateHeatLevel(pursuit.heat);
      pursuit.active = pursuit.level > 1;
      pursuit.evadeProgress = 0;
      if (!pursuit.active) pursuit.units.length = 0;
      pursuit.flash = 1;
      events.push({ type: "evaded", bonus });
      say(`Pursuit escaped +${bonus}`, "style", 1.8);
    }
  }

  if (pursuit.level === 0 && pursuit.heat <= 0.5) {
    pursuit.active = false;
    pursuit.timer = 0;
    pursuit.evadeProgress = 0;
    pursuit.units.length = 0;
  }
}

function updateObjectives(race, dt, events, say) {
  const { event, path, player } = race;
  if (event.gates) {
    race.gateClock -= dt;
    for (const gate of race.gates) {
      if (gate.hit) continue;
      const gap = path.signedDelta(player.state.s, gate.distance);
      if (gap < 0 && gap > -12) {
        const clean = Math.abs(player.state.n - gate.offset) < 4.2;
        gate.hit = true;
        if (clean) {
          race.gatesHit += 1;
          race.gateClock = Math.min(event.gateTime * 3, race.gateClock + event.gateTime);
          race.score += 320;
          events.push({ type: "gate", index: gate.index, hit: true });
          say(`Gate ${gate.index} +${event.gateTime.toFixed(0)}s`, "style", 0.9);
        } else {
          events.push({ type: "gate", index: gate.index, hit: false });
          say("Gate missed", "warn", 1);
        }
      }
    }
    if (race.gateClock <= 0 && !player.finished) {
      say("Out of time", "danger", 2);
      finishRace(race, events);
    }
  }
  if (event.targetSpeed && race.maxSpeed >= event.targetSpeed && race.directorCooldown === 0) {
    race.directorCooldown = 4;
    say(`Trap speed ${Math.round(race.maxSpeed)} km/h`, "style", 1.2);
  }
}

function eliminateLast(race, events, say) {
  const live = race.rivals.filter((rival) => !rival.eliminated);
  if (!live.length) return;
  const standings = [...live, race.player].sort((a, b) => b.progress - a.progress);
  const last = standings[standings.length - 1];
  if (last === race.player) {
    say("Eliminated", "danger", 2);
    finishRace(race, events);
    return;
  }
  last.eliminated = true;
  events.push({ type: "eliminated", id: last.id });
  say(`${last.name} eliminated`, "warn", 1.6);
}

export function computeRank(race) {
  if (race.solo) return 1;
  let rank = 1;
  for (const rival of race.rivals) {
    if (rival.eliminated) continue;
    if (rival.progress > race.player.progress) rank += 1;
  }
  return rank;
}

function finishRace(race, events) {
  if (race.player.finished) return;
  race.player.finished = true;
  race.phase = "finished";
  race.rank = computeRank(race);
  race.result = {
    rank: race.rank,
    solo: race.solo,
    raceTime: race.raceTime,
    bestLap: Number.isFinite(race.player.bestLap) ? race.player.bestLap : race.player.lapTime,
    score: Math.round(race.score),
    driftScore: Math.round(race.driftScore),
    maxSpeed: race.maxSpeed,
    heatLevel: race.pursuit.level,
    laps: race.totalLaps,
    gatesHit: race.gatesHit,
    gatesTotal: race.gates.length,
    nearMisses: race.nearMisses,
    field: race.rivals.filter((rival) => !rival.eliminated).length + 1,
  };
  events.push({ type: "finish", result: race.result });
}

/** Force the race to end early (used by the pause menu's "retire" and by tests). */
export function retireRace(race) {
  const events = [];
  finishRace(race, events);
  return events;
}

/**
 * World-space poses for the renderer plus everything the HUD needs, computed once per frame so no
 * other module has to know about the curvilinear coordinate system.
 */
export function snapshot(race) {
  const { path, player } = race;
  const pose = (entity) => {
    const point = path.pointAt(entity.state.s, entity.state.n);
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      heading: path.headingAt(entity.state.s) + entity.state.yaw,
      yaw: entity.state.yaw,
      banking: path.sample(entity.state.s).banking,
      speed: entity.state.speed,
      drift: entity.state.driftAngle,
      wheelSpin: entity.state.wheelSpin,
      s: entity.state.s,
      n: entity.state.n,
    };
  };
  return {
    player: { ...pose(player), carId: player.carId, rpm: player.state.rpm, gear: player.state.gear },
    rivals: race.rivals.filter((r) => !r.eliminated).map((rival) => ({ ...pose(rival), carId: rival.carId, color: rival.color, id: rival.id })),
    police: race.pursuit.units.map((unit) => ({ ...pose(unit), kind: unit.kind })),
    gates: race.gates,
  };
}
