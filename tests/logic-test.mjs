/**
 * Pure-logic checks.
 *
 * Everything here runs in plain Node against the same modules the browser loads, so the simulation,
 * the economy and the track maths are all covered without a canvas. Rendering is covered by
 * `npm run smoke`.
 */

import {
  BODY_IDS,
  CARS,
  CAR_IDS,
  EVENTS,
  EVENT_IDS,
  PEAK_SLIP,
  PROFILE_DEFAULT,
  STARTER_CAR,
  TRACKS,
  TRACK_IDS,
  UPGRADE_PARTS,
  applyEventReward,
  approximateLapLength,
  autoGear,
  buildArchLiner,
  buildBody,
  buildGreenhouse,
  buildPillars,
  buildRoofPanel,
  buildTrackPath,
  carBlueprint,
  measure,
  parseTyre,
  profileAt,
  buyCar,
  buyUpgrade,
  calculateDriverLevel,
  calculateEvadeProgress,
  calculateEventReward,
  calculateGear,
  calculateGripLoad,
  calculateHeatLevel,
  calculatePerformanceIndex,
  calculatePursuitPressure,
  calculateSlipstream,
  carUpgrades,
  clamp,
  createProfile,
  createRace,
  createVehicleSpec,
  createVehicleState,
  driveAI,
  engineTorque,
  eventUnlocked,
  formatTime,
  garageValue,
  gearTopSpeed,
  loadProfile,
  ownsCar,
  paceControls,
  peakTyreForce,
  percentRemaining,
  planTargetSpeed,
  requiredUnits,
  sampleCurve,
  saveProfile,
  scoreDrift,
  sectionRing,
  scoreNearMiss,
  snapshot,
  steerLimit,
  steerToTarget,
  stepVehicle,
  surfaceGrip,
  tyreForce,
  updateRace,
  upgradeCost,
  upgradeMultipliers,
  upgradeProgress,
  upgradeValue,
  weightTransfer,
  wheelRpm,
} from "../src/game.js";

const failures = [];
let checks = 0;

function assert(name, condition) {
  checks += 1;
  if (!condition) failures.push(name);
}

function section(title) {
  process.stdout.write(`  ${title}\n`);
}

/* ------------------------------------------------------------- roster --- */
section("roster and events");
assert("car roster has prestige real-model options", Object.keys(CARS).length >= 8);
assert("car roster includes Porsche 911 Turbo S", CARS.porsche911turbo.model === "911 Turbo S");
assert("car roster includes Ferrari 296 GTB", CARS.ferrari296.brand === "Ferrari");
assert("roster spans attainable to hypercar tiers", new Set(CAR_IDS.map((id) => CARS[id].tier)).size >= 4);
assert("starter car is free to own", CARS[STARTER_CAR].price === 0);
assert("every car carries simulation and body data", CAR_IDS.every((id) => CARS[id].sim && CARS[id].body && CARS[id].audio));
assert("performance index grades supercars highly", calculatePerformanceIndex(CARS.ferrari296) > 920);
assert("performance index ranks the starter below the hypercars", calculatePerformanceIndex(CARS.toyotasupra) < calculatePerformanceIndex(CARS.mclaren765lt));
assert("event roster covers nine contract types", EVENT_IDS.length === 9);
assert("every event points at a real circuit", EVENT_IDS.every((id) => TRACKS[EVENTS[id].track]));

/* ------------------------------------------------------------ utility --- */
section("formatting and utilities");
assert("clamp caps above range", clamp(11, 0, 10) === 10);
assert("clamp caps below range", clamp(-1, 0, 10) === 0);
assert("formatTime renders milliseconds", formatTime(65.432).startsWith("1:05.432"));
assert("formatTime handles infinity", formatTime(Infinity) === "--");
assert("percentRemaining wraps", percentRemaining(175, 100) === 0.75);

/* ------------------------------------------------------------- tyres ----- */
section("tyre and chassis model");
const load = 14000;
assert("tyre force rises toward the peak", tyreForce(0.05, load, 1.4) < tyreForce(PEAK_SLIP, load, 1.4));
assert("tyre force falls away past the peak", tyreForce(0.5, load, 1.4) < tyreForce(PEAK_SLIP, load, 1.4));
assert("tyre force is antisymmetric", Math.abs(tyreForce(-0.2, load, 1.4) + tyreForce(0.2, load, 1.4)) < 1e-6);
assert("tyre force scales with grip", tyreForce(PEAK_SLIP, load, 1.6) > tyreForce(PEAK_SLIP, load, 1.2));
assert("peak tyre force matches the curve peak", Math.abs(peakTyreForce(load, 1.4) - tyreForce(PEAK_SLIP, load, 1.4)) < 1e-6);
const transfer = weightTransfer(8, CARS.porsche911turbo.sim);
assert("weight transfer splits sum to one", Math.abs(transfer.front + transfer.rear - 1) < 1e-9);
assert("acceleration loads the rear axle", transfer.rear > CARS.porsche911turbo.sim.frontWeight);
assert("braking loads the front axle", weightTransfer(-8, CARS.porsche911turbo.sim).front > CARS.porsche911turbo.sim.frontWeight);
assert("surface grip drops off the road", surfaceGrip(9.5, 7.5, 1) < surfaceGrip(2, 7.5, 1));
assert("surface grip is worst in the gravel", surfaceGrip(14, 7.5, 1) < surfaceGrip(9.5, 7.5, 1));
assert("wet weather scales grip down", surfaceGrip(0, 7.5, 0.86) < surfaceGrip(0, 7.5, 1));
assert("steering lock reduces with speed", steerLimit(80) < steerLimit(10));

/* --------------------------------------------------------- drivetrain --- */
section("drivetrain");
const porscheSpec = createVehicleSpec(CARS.porsche911turbo, {});
assert("top gear reaches the published top speed", Math.abs(gearTopSpeed(porscheSpec.gearRatios.length - 1, porscheSpec) * 3.6 - CARS.porsche911turbo.maxSpeed) < 0.6);
assert("gears are progressively taller", gearTopSpeed(0, porscheSpec) < gearTopSpeed(1, porscheSpec));
assert("engine makes no torque at rest", engineTorque(0, porscheSpec) === 0);
assert("engine torque peaks in the mid range", engineTorque(porscheSpec.peakRpm, porscheSpec) > engineTorque(porscheSpec.redline, porscheSpec));
assert("wheel rpm scales with road speed", wheelRpm(40, 2, porscheSpec) > wheelRpm(20, 2, porscheSpec));
assert("gearbox upshifts at the limiter", autoGear(2, porscheSpec.redline * 0.99, porscheSpec, 1) === 3);
assert("gearbox downshifts when bogged", autoGear(4, porscheSpec.peakRpm * 0.3, porscheSpec, 1) === 3);
const upgradedSpec = createVehicleSpec(CARS.porsche911turbo, { engine: 3, tyres: 3, weight: 3 });
assert("upgrades raise peak torque", upgradedSpec.peakTorque > porscheSpec.peakTorque);
assert("upgrades add grip and cut weight", upgradedSpec.tyreGrip > porscheSpec.tyreGrip && upgradedSpec.mass < porscheSpec.mass);

/* ------------------------------------------------- physics integration --- */
section("physics integration");
const straight = { sample: () => ({ curvature: 0, grade: 0, halfWidth: 8, runoff: 4, banking: 0 }) };
function launch(carId) {
  const spec = createVehicleSpec(CARS[carId], {});
  const state = createVehicleState();
  const dt = 1 / 200;
  let time = 0;
  let hundred = null;
  while (time < 70) {
    stepVehicle(state, spec, { throttle: 1, steer: 0 }, straight, dt, { assist: true, weatherGrip: 1 });
    time += dt;
    if (!hundred && state.speed * 3.6 >= 100) hundred = time;
  }
  return { hundred, top: state.speed * 3.6 };
}
const porscheRun = launch("porsche911turbo");
const supraRun = launch("toyotasupra");
assert("Porsche reaches its published top speed", Math.abs(porscheRun.top - CARS.porsche911turbo.maxSpeed) < 2);
assert("Supra reaches its published top speed", Math.abs(supraRun.top - CARS.toyotasupra.maxSpeed) < 2);
assert("Porsche launches within a second of its 0-100 claim", Math.abs(porscheRun.hundred - CARS.porsche911turbo.zeroTo100) < 1);
assert("faster car out-accelerates the starter", porscheRun.hundred < supraRun.hundred);

/* ------------------------------------------------------------- track ----- */
section("circuits");
for (const id of TRACK_IDS) {
  const path = buildTrackPath(TRACKS[id]);
  const start = path.pointAt(0);
  const end = path.pointAt(path.length - 0.0001);
  assert(`${id} closes into a loop`, Math.hypot(start.x - end.x, start.z - end.z) < 1.5);
  assert(`${id} length is plausible`, path.length > 1800 && path.length < 6000);
  assert(`${id} length tracks its control polygon`, Math.abs(path.length - approximateLapLength(TRACKS[id])) / path.length < 0.25);
  assert(`${id} keeps the racing line on the road`, Array.from(path.racingLine).every((n) => Math.abs(n) <= path.halfWidth));
  assert(`${id} wraps distances`, Math.abs(path.wrap(path.length + 12) - 12) < 1e-6);
  assert(`${id} measures the short way round`, Math.abs(path.signedDelta(10, path.length - 10) + 20) < 1e-6);
  assert(`${id} has real corners`, Array.from(path.curvature).some((k) => Math.abs(k) > 0.006));
  assert(`${id} splits into sectors`, path.sectorLength > 0 && Math.abs(path.sectorLength * TRACKS[id].sectors - path.length) < 1e-6);
}

/* ---------------------------------------------------------------- ai ----- */
section("driver model");
const aiPath = buildTrackPath(TRACKS.nightlineBay);
assert("AI slows for corners", planTargetSpeed(aiPath, 0, porscheSpec, 0.86, 1) <= porscheSpec.topSpeedMs);
assert("AI runs flat out on an empty straight", planTargetSpeed({ sample: () => ({ curvature: 0, racingLine: 0 }), halfWidth: 8 }, 0, porscheSpec, 1, 1) === porscheSpec.topSpeedMs);
assert("pace controls open the throttle when slow", paceControls(20, 60).throttle > 0.5);
assert("pace controls brake when too fast", paceControls(80, 40).brake > 0.3);
assert("steering corrects toward the line", steerToTarget(createVehicleState({ s: 0, n: 4, speed: 40 }), porscheSpec, aiPath, 0, 30) < 0);
{
  const entity = { state: createVehicleState({ speed: 30 }), personality: { skill: 1, gripScale: 0.86, aggression: 0.5 } };
  let time = 0;
  let wallFrames = 0;
  while (entity.state.s < aiPath.length && time < 240) {
    const events = driveAI(entity, porscheSpec, aiPath, 1 / 120, { weatherGrip: 0.86 });
    if (events.hitWall) wallFrames += 1;
    time += 1 / 120;
  }
  assert("AI completes a lap", entity.state.s >= aiPath.length);
  assert("AI laps at a competitive pace", time > 40 && time < 110);
  assert("AI mostly stays off the barriers", wallFrames < 60);
}

/* ------------------------------------------------------- car bodies ------ */
section("car bodies");
assert("every car has a body blueprint", CAR_IDS.every((id) => BODY_IDS.includes(id)));
assert("tyre codes parse", parseTyre("315/30R21").width === 0.315 && parseTyre("315/30R21").rim > 0.53);
assert("tyre radius is a real rolling radius", Math.abs(parseTyre("255/35R19").radius - 0.3306) < 0.001);
assert("an unreadable tyre code is rejected", (() => {
  try {
    parseTyre("nonsense");
    return false;
  } catch {
    return true;
  }
})());

for (const id of BODY_IDS) {
  const blueprint = carBlueprint(id);
  const car = CARS[id];
  const body = buildBody(blueprint);
  const glass = buildGreenhouse(blueprint);
  const roof = buildRoofPanel(blueprint);
  const pillars = buildPillars(blueprint);
  const shell = measure(body);
  const cabin = measure(glass);
  const height = Math.max(shell.max[1], cabin.max[1], measure(roof).max[1], measure(pillars).max[1]);

  // The measurable half of "looks like the real car": the mesh is the size the real car is.
  assert(`${id} is the published length`, Math.abs(shell.size[2] - blueprint.length) < 0.03);
  assert(`${id} is the published width`, Math.abs(shell.size[0] - blueprint.width) < 0.03);
  assert(`${id} is the published height`, Math.abs(height - blueprint.height) < 0.03);
  assert(`${id} has the published wheelbase`, Math.abs(blueprint.rearAxle - blueprint.frontAxle - blueprint.wheelbase) < 1e-9);
  assert(`${id} agrees with the physics wheelbase`, Math.abs(blueprint.wheelbase - car.sim.wheelbase) < 1e-9);
  assert(`${id} agrees with the roster dimensions`, Math.abs(car.body.length - blueprint.length) < 1e-9 && Math.abs(car.body.width - blueprint.width) < 1e-9);
  assert(`${id} rolls on its published tyres`, Math.abs(car.body.wheelRadius - blueprint.tyre.rear.radius) < 1e-9);

  // Stance.
  assert(`${id} tracks narrower than its body`, blueprint.track[0] < blueprint.width && blueprint.track[1] < blueprint.width);
  assert(`${id} runs staggered or square tyres`, blueprint.tyre.rear.width >= blueprint.tyre.front.width);
  assert(`${id} keeps both axles inside the body`, blueprint.frontAxle > -blueprint.length / 2 && blueprint.rearAxle < blueprint.length / 2);
  assert(`${id} sits on the ground`, Math.abs(shell.min[1] - blueprint.ride) < 0.2 && shell.min[1] > 0);

  // Arches have to clear the wheels they are cut for, or the tyre pokes through the bodywork.
  for (const [axle, tyre] of [[blueprint.frontAxle, blueprint.tyre.front], [blueprint.rearAxle, blueprint.tyre.rear]]) {
    const ring = sectionRing(blueprint, (axle + blueprint.length / 2) / blueprint.length);
    const outer = ring.ring.filter(([x]) => Math.abs(x) > blueprint.track[0] / 2 - tyre.width * 0.6);
    const lowest = Math.min(...outer.map(([, y]) => y));
    assert(`${id} arch clears its wheel`, lowest > tyre.radius * 1.6);
  }

  // The cabin is a cabin: above the beltline, below the roof, and actually built.
  const roofMid = (blueprint.roof[0][0] + blueprint.roof[blueprint.roof.length - 1][0]) / 2;
  const belt = sampleCurve(blueprint.deck, roofMid);
  assert(`${id} has a glasshouse above the beltline`, cabin.max[1] > belt + 0.15);
  assert(`${id} has a beltline below the roof`, belt < blueprint.height * 0.78);
  assert(`${id} builds glass, roof and pillars`, glass.triangles > 0 && roof.triangles > 0 && pillars.triangles > 0);

  // Geometry hygiene and budget.
  const total = body.triangles + glass.triangles + roof.triangles + pillars.triangles;
  assert(`${id} geometry is finite`, shell.finite && cabin.finite);
  assert(`${id} indexes inside its vertex buffer`, body.indices.every((index) => index < body.positions.length / 3));
  assert(`${id} stays inside the shell budget`, total < 9000);
  assert(`${id} liners cover both arches`, buildArchLiner(blueprint, "front").triangles > 0 && buildArchLiner(blueprint, "rear").triangles > 0);
}

assert("profiles read the body at a station", profileAt(carBlueprint("porsche911turbo"), 0.5).halfWidth > 0.7);
assert("curve sampling clamps outside its range", sampleCurve([[0.2, 1], [0.8, 2]], 0) === 1 && sampleCurve([[0.2, 1], [0.8, 2]], 1) === 2);
assert("bodies differ between cars", (() => {
  const a = measure(buildBody(carBlueprint("porsche911turbo")));
  const b = measure(buildBody(carBlueprint("fordmustang")));
  return Math.abs(a.size[2] - b.size[2]) > 0.2;
})());

/* --------------------------------------------------------- pursuit ------- */
section("pursuit");
assert("heat level escalates at high pursuit heat", calculateHeatLevel(82) === 4);
assert("heat level stays clear when calm", calculateHeatLevel(8) === 0);
assert("pursuit pressure rises near police", calculatePursuitPressure(120, 0.12, 4) > 0.75);
assert("pursuit pressure ignores clear state", calculatePursuitPressure(120, 0.12, 0) === 0);
assert("evade progress gains under low pressure", calculateEvadeProgress(0, 0.05, 220, 1) > 0.8);
assert("evade progress drops under high pressure", calculateEvadeProgress(4, 0.8, 220, 1) < 4);
assert("more heat brings more units", requiredUnits(4) > requiredUnits(1));
assert("no heat brings no units", requiredUnits(0) === 0);

/* ----------------------------------------------------------- scoring ----- */
section("style scoring");
assert("slipstream rewards close drafting", calculateSlipstream(180, 0.08) > 0.45);
assert("slipstream ignores distant cars", calculateSlipstream(900, 0.08) === 0);
assert("near-miss score scales with combo", scoreNearMiss(230, 0.28, 2) > scoreNearMiss(230, 0.28, 1));
assert("gear stays neutral at launch", calculateGear(0, CARS.porsche911turbo.maxSpeed) === "N");
assert("gear reaches sixth near top speed", calculateGear(310, CARS.porsche911turbo.maxSpeed) === "6");
assert("grip load drops under hard cornering", calculateGripLoad(1.1, 0.9, 1.5, true) < 70);
assert("drift needs angle", scoreDrift(0.05, 40, 1) === 0);
assert("drift needs speed", scoreDrift(0.5, 4, 1) === 0);
assert("drift pays for angle at speed", scoreDrift(0.45, 40, 1) > 0);
assert("drift score scales with combo", scoreDrift(0.45, 40, 2) > scoreDrift(0.45, 40, 1));

/* ---------------------------------------------------------- upgrades ----- */
section("upgrades");
assert("upgrade parts cover the whole car", UPGRADE_PARTS.length >= 8);
assert("first upgrade level has a price", upgradeCost("engine", 0) > 0);
assert("a maxed part cannot be bought again", upgradeCost("engine", 3) === null);
assert("upgrade multipliers stack", upgradeMultipliers({ engine: 2 }).power > upgradeMultipliers({ engine: 1 }).power);
assert("unowned parts are neutral", upgradeMultipliers({}).power === 1);
assert("weight reduction lowers mass", upgradeMultipliers({ weight: 3 }).mass < 1);
assert("upgrade value counts every fitted level", upgradeValue({ engine: 2 }) === UPGRADE_PARTS[0].levels[0].cost + UPGRADE_PARTS[0].levels[1].cost);
assert("build progress reports a percentage", upgradeProgress({ engine: 3 }) > 0 && upgradeProgress({}) === 0);

/* ----------------------------------------------------------- economy ----- */
section("career economy");
const reward = calculateEventReward(EVENTS.speedtrap, {
  rank: 1,
  score: 4200,
  raceTime: 120,
  maxSpeed: 302,
  heatLevel: 2,
  laps: 2,
});
assert("speed trap reward pays cash", reward.cash > EVENTS.speedtrap.cash);
assert("speed trap reward grants stars", reward.stars >= 3);
const driftReward = calculateEventReward(EVENTS.drift, { rank: 1, score: 5000, raceTime: 150, driftScore: 40000, laps: 2 });
const weakDrift = calculateEventReward(EVENTS.drift, { rank: 1, score: 5000, raceTime: 150, driftScore: 2000, laps: 2 });
assert("drift contract pays for angle banked", driftReward.cash > weakDrift.cash);
const gateReward = calculateEventReward(EVENTS.gauntlet, { rank: 1, score: 0, raceTime: 150, laps: 2, gatesHit: 14, gatesTotal: 14 });
assert("gate contract pays for gates clipped", gateReward.cash > calculateEventReward(EVENTS.gauntlet, { rank: 1, score: 0, raceTime: 150, laps: 2, gatesHit: 3, gatesTotal: 14 }).cash);

const profile = createProfile({ cash: -100, rep: 3600, events: { circuit: { bestStars: 2 } } });
assert("profile normalizes cash", profile.cash === 0);
assert("profile preserves event history", profile.events.circuit.bestStars === 2);
assert("driver level scales with rep", calculateDriverLevel(3600) === 3);
assert("profile defaults are sane", PROFILE_DEFAULT.cash > 0 && PROFILE_DEFAULT.level === 1);
assert("starter car comes with the career", ownsCar(profile, STARTER_CAR));
assert("expensive cars start locked", !ownsCar(profile, "ferrari296"));
assert("a broke driver cannot buy a car", buyCar(profile, "ferrari296").ok === false);
profile.cash = 400000;
assert("a funded driver can buy a car", buyCar(profile, "porschecayman").ok === true);
assert("buying a car debits the bank", profile.cash < 400000);
assert("a car cannot be bought twice", buyCar(profile, "porschecayman").reason === "already-owned");
assert("garage value counts owned cars", garageValue(profile) >= CARS.porschecayman.price);
const fitted = buyUpgrade(profile, "porschecayman", "tyres");
assert("upgrades can be fitted to an owned car", fitted.ok === true && fitted.level === 1);
assert("fitted upgrades are recorded", carUpgrades(profile, "porschecayman").tyres === 1);
assert("upgrades cannot be fitted to a car you do not own", buyUpgrade(profile, "ferrari296", "tyres").reason === "not-owned");
assert("contracts unlock with driver level", eventUnlocked(profile, "circuit") && !eventUnlocked({ ...profile, level: 1 }, "boss"));

const applied = applyEventReward(createProfile({ cash: 1000 }), {
  eventType: "circuit",
  carId: STARTER_CAR,
  reward: { cash: 5000, rep: 900, stars: 3 },
  result: { rank: 1, raceTime: 180, bestLap: 60, score: 4000, maxSpeed: 250 },
});
assert("finishing pays into the bank", applied.cash === 6000);
assert("finishing first counts as a win", applied.wins === 1);
assert("event records are written", applied.events.circuit.bestStars === 3);
assert("car mastery accrues rep", applied.carMastery[STARTER_CAR].rep === 900);

// Round-trip a save through a storage stand-in.
const memory = new Map();
const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
saveProfile(applied, storage);
const reloaded = loadProfile(storage);
assert("profiles survive a save/load round trip", reloaded.cash === applied.cash && reloaded.wins === applied.wins);
assert("a corrupt save degrades to a fresh career", loadProfile({ getItem: () => "{not json", setItem: () => {} }).cash === PROFILE_DEFAULT.cash);

/* -------------------------------------------------------------- race ----- */
section("race loop");
{
  const race = createRace({ eventType: "circuit", carId: "porsche911turbo", difficulty: "street" });
  assert("race starts on the countdown", race.phase === "countdown");
  assert("race fields rivals", race.rivals.length >= 5);
  assert("race picks the contract's circuit", race.track.id === EVENTS.circuit.track);
  assert("snapshot exposes world poses", Number.isFinite(snapshot(race).player.x));

  // Drive it with the AI controller so the whole loop is exercised.
  let time = 0;
  let finished = null;
  while (race.phase !== "finished" && time < 900) {
    const state = race.player.state;
    const lookahead = clamp(7 + state.speed * 0.52, 11, 46);
    const steer = steerToTarget(state, race.player.spec, race.path, race.path.sample(state.s).racingLine, lookahead);
    const pace = paceControls(state.speed, planTargetSpeed(race.path, state.s, race.player.spec, race.weatherGrip, 1));
    for (const event of updateRace(race, { steer, ...pace, nitro: state.nitro > 60, assist: true }, 1 / 60)) {
      if (event.type === "finish") finished = event.result;
    }
    time += 1 / 60;
  }
  assert("a full race reaches the finish", Boolean(finished));
  assert("finishing reports a rank inside the field", finished.rank >= 1 && finished.rank <= finished.field);
  assert("finishing reports a best lap", finished.bestLap > 20 && finished.bestLap < 200);
  assert("the race ran the full lap count", race.player.lap > race.totalLaps);
  assert("peak speed is recorded", finished.maxSpeed > 100);
}
{
  const race = createRace({ eventType: "timeattack", carId: "toyotasupra", timeTrial: true });
  assert("time attack runs solo", race.solo && race.rivals.length === 0);
  assert("time attack never spawns police", race.pursuit.units.length === 0);
}
{
  const race = createRace({ eventType: "gauntlet", carId: "toyotasupra" });
  assert("the gate contract places checkpoints", race.gates.length > 0);
  assert("gates start unclipped", race.gates.every((gate) => !gate.hit));
  assert("gates sit on the racing line", race.gates.every((gate) => Math.abs(gate.offset) <= race.path.halfWidth));
}

/* -------------------------------------------------------------- report --- */
if (failures.length) {
  console.error(`\n${failures.length} of ${checks} checks failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`\nLogic checks passed (${checks} assertions)`);
