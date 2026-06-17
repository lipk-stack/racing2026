import {
  CARS,
  calculateEvadeProgress,
  calculateGear,
  calculateGripLoad,
  calculateHeatLevel,
  calculatePerformanceIndex,
  calculatePursuitPressure,
  calculateSlipstream,
  clamp,
  formatTime,
  percentRemaining,
  scoreNearMiss,
} from "../src/game.js";

const failures = [];

function assert(name, condition) {
  if (!condition) failures.push(name);
}

assert("car roster has prestige real-model options", Object.keys(CARS).length >= 8);
assert("car roster includes Porsche 911 Turbo S", CARS.porsche911turbo.model === "911 Turbo S");
assert("car roster includes Ferrari 296 GTB", CARS.ferrari296.brand === "Ferrari");
assert("clamp caps above range", clamp(11, 0, 10) === 10);
assert("clamp caps below range", clamp(-1, 0, 10) === 0);
assert("formatTime renders milliseconds", formatTime(65.432).startsWith("1:05.432"));
assert("formatTime handles infinity", formatTime(Infinity) === "--");
assert("percentRemaining wraps", percentRemaining(175, 100) === 0.75);
assert("slipstream rewards close drafting", calculateSlipstream(180, 0.08) > 0.45);
assert("slipstream ignores distant cars", calculateSlipstream(900, 0.08) === 0);
assert("near-miss score scales with combo", scoreNearMiss(230, 0.28, 2) > scoreNearMiss(230, 0.28, 1));
assert("gear stays neutral at launch", calculateGear(0, CARS.porsche911turbo.maxSpeed) === "N");
assert("gear reaches sixth near top speed", calculateGear(310, CARS.porsche911turbo.maxSpeed) === "6");
assert("grip load drops under hard cornering", calculateGripLoad(1.1, 0.9, 1.5, true) < 70);
assert("performance index grades supercars highly", calculatePerformanceIndex(CARS.ferrari296) > 920);
assert("heat level escalates at high pursuit heat", calculateHeatLevel(82) === 4);
assert("heat level stays clear when calm", calculateHeatLevel(8) === 0);
assert("pursuit pressure rises near police", calculatePursuitPressure(120, 0.12, 4) > 0.75);
assert("pursuit pressure ignores clear state", calculatePursuitPressure(120, 0.12, 0) === 0);
assert("evade progress gains under low pressure", calculateEvadeProgress(0, 0.05, 220, 1) > 0.8);
assert("evade progress drops under high pressure", calculateEvadeProgress(4, 0.8, 220, 1) < 4);

if (failures.length) {
  console.error(`Logic checks failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("Logic checks passed");
