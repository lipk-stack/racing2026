const CONFIG = {
  lanes: 3,
  roadWidth: 2200,
  segmentLength: 170,
  rumbleLength: 3,
  drawDistance: 230,
  cameraHeight: 1050,
  fieldOfView: 100,
  centrifugal: 0.26,
  fogDensity: 5.8,
  totalLaps: 3,
  trackSegments: 1850,
  maxParticles: 360,
  racingLineLookahead: 90,
};

const CARS = {
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
    color: "#b8c2c9",
    accent: "#16d6ff",
    roof: "#101419",
    profile: "gt",
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
    color: "#e11d2e",
    accent: "#ffd166",
    roof: "#17100f",
    profile: "berlinetta",
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
    color: "#f47b20",
    accent: "#5ef0ff",
    roof: "#0a1116",
    profile: "wedge",
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
    color: "#f28c28",
    accent: "#111820",
    roof: "#071017",
    profile: "longtail",
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
    color: "#161b22",
    accent: "#ff4d4d",
    roof: "#050608",
    profile: "longnose",
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
    color: "#dfe7eb",
    accent: "#2f80ff",
    roof: "#11151b",
    profile: "gt",
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
    color: "#d9d5c8",
    accent: "#00a3ff",
    roof: "#111111",
    profile: "coupe",
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
    color: "#f2f2ec",
    accent: "#e0262f",
    roof: "#141414",
    profile: "widebody",
  },
};

const DIFFICULTY = {
  cruise: { traffic: 0.72, rivals: 0.86, grip: 1.08 },
  street: { traffic: 1, rivals: 1, grip: 1 },
  pro: { traffic: 1.24, rivals: 1.13, grip: 0.92 },
};

const PURSUIT = {
  heatDecay: 1.2,
  heatFromBoost: 3.8,
  heatFromNearMiss: 8,
  heatFromImpact: 14,
  heatFromLead: 2.4,
  spawnDistance: 1180,
  roadblockDistance: 2850,
  evadeSeconds: 7.5,
};

const state = {
  mode: "menu",
  selectedCar: "porsche911turbo",
  difficulty: "street",
  timeTrial: false,
  paused: false,
  muted: false,
  assist: true,
  weather: true,
  cameraMode: 0,
  width: 0,
  height: 0,
  scale: 1,
  resolution: 1,
  trackLength: CONFIG.trackSegments * CONFIG.segmentLength,
  position: 0,
  playerX: 0,
  speed: 0,
  lap: 1,
  raceTime: 0,
  currentLapTime: 0,
  bestLap: Infinity,
  boost: 100,
  shake: 0,
  drift: 0,
  combo: 0,
  score: 0,
  nearMisses: 0,
  slipstream: 0,
  heat: 0,
  heatLevel: 0,
  pursuitActive: false,
  pursuitTimer: 0,
  evadeProgress: 0,
  bustProgress: 0,
  pursuitPressure: 0,
  pursuitFlash: 0,
  roadblockCooldown: 0,
  gripLoad: 100,
  cornerSeverity: 0,
  gear: "N",
  comboTimer: 0,
  countdown: 0,
  directorCooldown: 0,
  lastCountdownText: "",
  statusTimer: 0,
  status: "Ready",
  lapPulse: 0,
  finishRank: 6,
  lastFrame: 0,
};

const input = {
  left: false,
  right: false,
  throttle: false,
  brake: false,
  boost: false,
};

const dom = {};
const track = [];
const rivals = [];
const policeUnits = [];
const particles = [];
const scenery = [];
const audio = {
  ctx: null,
  engine: null,
  gain: null,
  filter: null,
};

let ctx;
let speedCtx;
let mapCtx;

function $(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeIn(a, b, percent) {
  return a + (b - a) * percent ** 2;
}

function easeOut(a, b, percent) {
  return a + (b - a) * (1 - (1 - percent) ** 2);
}

function easeInOut(a, b, percent) {
  return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
}

function percentRemaining(n, total) {
  return (n % total) / total;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function calculateSlipstream(distanceAhead, laneGap) {
  if (distanceAhead <= 0 || distanceAhead > 620 || laneGap > 0.42) return 0;
  const distancePower = 1 - distanceAhead / 620;
  const lanePower = 1 - laneGap / 0.42;
  return clamp(distancePower * lanePower, 0, 1);
}

function calculateGear(speed, maxSpeed) {
  if (speed < 12 || maxSpeed <= 0) return "N";
  return String(clamp(Math.floor((speed / maxSpeed) * 6) + 1, 1, 6));
}

function calculateGripLoad(playerX, speedPercent, curve, boostActive = false) {
  const cornerLoad = Math.abs(curve) * speedPercent * 18;
  const edgeLoad = Math.max(0, Math.abs(playerX) - 0.72) * 38;
  const boostLoad = boostActive ? 8 : 0;
  return clamp(Math.round(100 - cornerLoad - edgeLoad - boostLoad), 0, 100);
}

function scoreNearMiss(speed, laneGap, combo) {
  const precision = clamp((0.62 - laneGap) / 0.4, 0, 1);
  const speedBonus = clamp((speed - 120) / 190, 0, 1);
  return Math.round((140 + precision * 260 + speedBonus * 220) * combo);
}

function calculatePerformanceIndex(car) {
  const speedScore = clamp((car.maxSpeed - 270) * 1.65, 0, 120);
  const launchScore = clamp((4.2 - car.zeroTo100) * 56, 0, 110);
  const powerScore = clamp((car.powerHp - 480) * 0.18, 0, 90);
  const handlingScore = clamp((car.handling + car.grip - 1.95) * 95, 0, 90);
  return Math.round(700 + speedScore + launchScore + powerScore + handlingScore);
}

function calculateHeatLevel(heat) {
  if (heat < 18) return 0;
  if (heat < 38) return 1;
  if (heat < 58) return 2;
  if (heat < 78) return 3;
  if (heat < 94) return 4;
  return 5;
}

function calculatePursuitPressure(distance, laneGap, heatLevel) {
  if (heatLevel <= 0) return 0;
  const proximity = clamp((720 - distance) / 720, 0, 1);
  const interception = clamp((0.58 - laneGap) / 0.58, 0, 1);
  return clamp(proximity * 0.66 + interception * 0.24 + heatLevel * 0.04, 0, 1);
}

function calculateEvadeProgress(current, pressure, speed, dt) {
  const pace = clamp((speed - 130) / 130, 0, 1);
  const gain = pressure < 0.18 ? (0.55 + pace * 0.75) * dt : -pressure * 1.35 * dt;
  return clamp(current + gain, 0, PURSUIT.evadeSeconds);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${minutes}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function addRoad(enter, hold, leave, curve, hill) {
  const startY = track.length ? track[track.length - 1].y : 0;
  const endY = startY + hill * CONFIG.segmentLength;
  const total = enter + hold + leave;

  for (let n = 0; n < enter; n += 1) {
    addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
  }
  for (let n = 0; n < hold; n += 1) {
    addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
  }
  for (let n = 0; n < leave; n += 1) {
    addSegment(easeOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
  }
}

function addSegment(curve, y) {
  const index = track.length;
  const palette = Math.floor(index / CONFIG.rumbleLength) % 2;
  const zone = Math.floor(index / 165) % 5;
  track.push({
    index,
    curve,
    y,
    p1: { world: { y, z: index * CONFIG.segmentLength }, screen: {}, camera: {} },
    p2: {
      world: { y, z: (index + 1) * CONFIG.segmentLength },
      screen: {},
      camera: {},
    },
    color: {
      road: palette ? "#202329" : "#181b20",
      grass: zone === 2 ? "#163423" : palette ? "#112519" : "#0d2016",
      rumble: palette ? "#f2f2e8" : "#d72733",
      lane: palette ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.22)",
    },
    zone,
    sprites: [],
    cars: [],
  });
}

function buildTrack() {
  track.length = 0;
  addRoad(40, 70, 40, 0, 0);
  addRoad(30, 60, 45, 1.1, 6);
  addRoad(25, 50, 25, -0.7, -4);
  addRoad(35, 55, 45, 1.6, 7);
  addRoad(28, 45, 32, 0, -6);
  addRoad(30, 70, 50, -1.45, 4);
  addRoad(30, 44, 36, 0.8, 0);
  addRoad(26, 54, 44, -2.1, -3);
  addRoad(40, 90, 40, 0, 8);
  addRoad(30, 45, 30, 1.35, -5);
  addRoad(26, 40, 40, -0.85, 0);
  addRoad(45, 95, 50, 0, 3);

  while (track.length < CONFIG.trackSegments) {
    const curve = randomChoice([-1.4, -0.9, 0, 0.7, 1.15, 1.75]);
    const hill = randomChoice([-6, -3, 0, 3, 7]);
    addRoad(22, 46, 26, curve, hill);
  }

  state.trackLength = track.length * CONFIG.segmentLength;
}

function populateWorld() {
  scenery.length = 0;
  for (let i = 0; i < track.length; i += 5) {
    const segment = track[i];
    const zone = segment.zone;
    if (i % 13 === 0) {
      segment.sprites.push({
        type: "billboard",
        offset: randomChoice([-1.95, 1.95]),
        scale: randomChoice([0.8, 1, 1.25]),
        color: zone === 1 ? "#00d8ff" : zone === 3 ? "#ffd166" : "#ff3e3e",
      });
    }
    if (i % 9 === 0) {
      segment.sprites.push({
        type: "light",
        offset: randomChoice([-1.28, 1.28]),
        scale: 1,
        color: i % 18 === 0 ? "#00d8ff" : "#ffd166",
      });
    }
    if (i % 17 === 0) {
      segment.sprites.push({
        type: "tree",
        offset: randomChoice([-2.55, 2.55, -3.2, 3.2]),
        scale: randomChoice([0.85, 1.15, 1.45]),
        color: "#1ea05b",
      });
    }
    if (i % 23 === 0) {
      scenery.push({
        z: i * CONFIG.segmentLength,
        x: randomChoice([-4.2, -3.5, 3.5, 4.2]),
        w: randomChoice([60, 80, 120]),
        h: randomChoice([160, 220, 300, 380]),
        lit: Math.random() > 0.35,
      });
    }
    if (Math.abs(segment.curve) > 0.68 && i % 7 === 0) {
      segment.sprites.push({
        type: "chevron",
        offset: segment.curve > 0 ? 1.42 : -1.42,
        scale: 0.62 + Math.abs(segment.curve) * 0.12,
        color: segment.curve > 0 ? "#00d8ff" : "#ffd166",
        direction: segment.curve > 0 ? 1 : -1,
      });
    }
    if (i % 97 === 0) {
      segment.sprites.push({
        type: "gantry",
        offset: 0,
        scale: 1.4,
        color: randomChoice(["#00d8ff", "#ff3e3e", "#ffd166"]),
      });
    }
  }
}

function resetRivals() {
  rivals.length = 0;
  const colors = ["#31f5ff", "#ffb82f", "#f64f59", "#51ff7b", "#e6e9ef"];
  for (let i = 0; i < 5; i += 1) {
    rivals.push({
      id: i,
      x: [-0.64, 0.58, 0.05, -0.28, 0.34][i],
      z: state.trackLength - (i + 1) * 760,
      speed: (218 + i * 12) * DIFFICULTY[state.difficulty].rivals,
      color: colors[i],
      laneChange: Math.random() * 4,
      name: `R${i + 1}`,
      passed: false,
      nearMissArmed: true,
    });
  }
}

function resetPolice() {
  policeUnits.length = 0;
  state.heat = 0;
  state.heatLevel = 0;
  state.pursuitActive = false;
  state.pursuitTimer = 0;
  state.evadeProgress = 0;
  state.bustProgress = 0;
  state.pursuitPressure = 0;
  state.pursuitFlash = 0;
  state.roadblockCooldown = 5;
}

function addHeat(amount, reason = "") {
  if (state.timeTrial || amount <= 0) return;
  const previousLevel = state.heatLevel;
  state.heat = clamp(state.heat + amount, 0, 100);
  state.heatLevel = calculateHeatLevel(state.heat);
  if (state.heatLevel > 0 && !state.pursuitActive) {
    state.pursuitActive = true;
    state.pursuitFlash = 1;
    spawnPoliceUnit("pursuit", -PURSUIT.spawnDistance, randomChoice([-0.58, 0.58]));
    setStatus(reason || "Pursuit started", 1.6);
  } else if (state.heatLevel > previousLevel) {
    state.pursuitFlash = 1;
    setStatus(`Heat level ${state.heatLevel}`, 1.2);
  }
}

function spawnPoliceUnit(kind, relativeZ, x) {
  policeUnits.push({
    kind,
    x,
    z: (state.position + relativeZ + state.trackLength) % state.trackLength,
    speed: kind === "roadblock" ? 0 : 238 + state.heatLevel * 18,
    laneChange: 0.8 + Math.random() * 1.8,
    nearMissArmed: true,
  });
}

function resetRace({ trial = false } = {}) {
  state.mode = "race";
  state.timeTrial = trial;
  state.paused = false;
  state.position = 0;
  state.playerX = 0;
  state.speed = 0;
  state.lap = 1;
  state.raceTime = 0;
  state.currentLapTime = 0;
  state.bestLap = Infinity;
  state.boost = 100;
  state.shake = 0;
  state.drift = 0;
  state.combo = 1;
  state.score = 0;
  state.nearMisses = 0;
  state.slipstream = 0;
  resetPolice();
  state.gripLoad = 100;
  state.cornerSeverity = 0;
  state.gear = "N";
  state.comboTimer = 0;
  state.countdown = 3.15;
  state.directorCooldown = 0;
  state.lastCountdownText = "";
  state.lapPulse = 0;
  state.finishRank = 6;
  particles.length = 0;
  resetRivals();
  hidePanel(dom.startPanel);
  hidePanel(dom.pausePanel);
  hidePanel(dom.finishPanel);
  setStatus(trial ? "Time trial armed" : "Race armed");
  startAudio();
}

function setStatus(text, duration = 2.4) {
  state.status = text;
  state.statusTimer = duration;
  dom.statusLine.textContent = text;
}

function findSegment(z) {
  return track[Math.floor(z / CONFIG.segmentLength) % track.length];
}

function project(point, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
  point.camera.x = (point.world.x || 0) - cameraX;
  point.camera.y = point.world.y - cameraY;
  point.camera.z = point.world.z - cameraZ;
  point.screen.scale = cameraDepth / point.camera.z;
  point.screen.x = Math.round(width / 2 + point.screen.scale * point.camera.x * width / 2);
  point.screen.y = Math.round(height / 2 - point.screen.scale * point.camera.y * height / 2);
  point.screen.w = Math.round(point.screen.scale * roadWidth * width / 2);
}

function exponentialFog(distance, density) {
  return 1 / Math.E ** (distance * distance * density);
}

function sampleUpcomingCurve(position, lookahead = CONFIG.racingLineLookahead) {
  let signed = 0;
  let weighted = 0;
  for (let i = 10; i < lookahead; i += 8) {
    const weight = 1 - i / lookahead;
    const segment = findSegment(position + i * CONFIG.segmentLength);
    signed += segment.curve * weight;
    weighted += weight;
  }
  return weighted ? signed / weighted : 0;
}

function resize() {
  const canvas = dom.canvas;
  const rect = canvas.getBoundingClientRect();
  state.width = Math.max(320, rect.width);
  state.height = Math.max(320, rect.height);
  state.resolution = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(state.width * state.resolution);
  canvas.height = Math.floor(state.height * state.resolution);
  ctx.setTransform(state.resolution, 0, 0, state.resolution, 0, 0);
  state.scale = state.height / 720;
}

function drawPolygon(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawSegment(width, lanes, p1, p2, color, fog) {
  const rumbleW1 = p1.w / 4.2;
  const rumbleW2 = p2.w / 4.2;
  const laneW1 = p1.w * 2 / lanes;
  const laneW2 = p2.w * 2 / lanes;

  drawPolygon(
    [
      { x: 0, y: p2.y },
      { x: width, y: p2.y },
      { x: width, y: p1.y },
      { x: 0, y: p1.y },
    ],
    color.grass,
  );

  drawPolygon(
    [
      { x: p1.x - p1.w - rumbleW1, y: p1.y },
      { x: p1.x - p1.w, y: p1.y },
      { x: p2.x - p2.w, y: p2.y },
      { x: p2.x - p2.w - rumbleW2, y: p2.y },
    ],
    color.rumble,
  );
  drawPolygon(
    [
      { x: p1.x + p1.w + rumbleW1, y: p1.y },
      { x: p1.x + p1.w, y: p1.y },
      { x: p2.x + p2.w, y: p2.y },
      { x: p2.x + p2.w + rumbleW2, y: p2.y },
    ],
    color.rumble,
  );
  drawPolygon(
    [
      { x: p1.x - p1.w, y: p1.y },
      { x: p1.x + p1.w, y: p1.y },
      { x: p2.x + p2.w, y: p2.y },
      { x: p2.x - p2.w, y: p2.y },
    ],
    color.road,
  );

  if (state.weather) {
    drawPolygon(
      [
        { x: p1.x - p1.w * 0.7, y: p1.y },
        { x: p1.x + p1.w * 0.7, y: p1.y },
        { x: p2.x + p2.w * 0.5, y: p2.y },
        { x: p2.x - p2.w * 0.5, y: p2.y },
      ],
      "rgba(255,255,255,0.035)",
    );

    const sheen = ctx.createLinearGradient(0, p2.y, 0, p1.y);
    sheen.addColorStop(0, "rgba(0,216,255,0.02)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.07)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    drawPolygon(
      [
        { x: p1.x - p1.w * 0.18, y: p1.y },
        { x: p1.x + p1.w * 0.18, y: p1.y },
        { x: p2.x + p2.w * 0.1, y: p2.y },
        { x: p2.x - p2.w * 0.1, y: p2.y },
      ],
      sheen,
    );
  }

  if (color.lane) {
    for (let lane = 1; lane < lanes; lane += 1) {
      const laneX1 = p1.x - p1.w + laneW1 * lane;
      const laneX2 = p2.x - p2.w + laneW2 * lane;
      drawPolygon(
        [
          { x: laneX1 - 2, y: p1.y },
          { x: laneX1 + 2, y: p1.y },
          { x: laneX2 + 2, y: p2.y },
          { x: laneX2 - 2, y: p2.y },
        ],
        color.lane,
      );
    }
  }

  if (fog < 1) {
    ctx.fillStyle = `rgba(5, 8, 11, ${1 - fog})`;
    ctx.fillRect(0, p2.y, width, p1.y - p2.y);
  }
}

function drawRacingLine(segments) {
  if (!state.assist || state.mode === "finished") return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let n = segments.length - 2; n > 5; n -= 2) {
    const segment = segments[n];
    const next = segments[n - 1];
    const severity = clamp(Math.abs(segment.curve) * 0.75 + state.speed / 520, 0, 1);
    const inside = clamp(-segment.curve * 0.12, -0.28, 0.28);
    const nextInside = clamp(-next.curve * 0.12, -0.28, 0.28);
    const startX = segment.p1.screen.x + segment.p1.screen.w * inside;
    const endX = next.p1.screen.x + next.p1.screen.w * nextInside;
    const startY = segment.p1.screen.y;
    const endY = next.p1.screen.y;
    if (startY < 0 || endY > state.height) continue;
    ctx.strokeStyle =
      severity > 0.72
        ? "rgba(255,62,62,0.48)"
        : severity > 0.42
          ? "rgba(255,209,102,0.46)"
          : "rgba(110,255,122,0.38)";
    ctx.lineWidth = clamp(segment.p1.screen.w * 0.018, 2, 10);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSky(time) {
  const width = state.width;
  const height = state.height;
  const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.62);
  const pulse = (Math.sin(time * 0.05) + 1) / 2;
  gradient.addColorStop(0, `rgb(${Math.floor(8 + pulse * 12)}, ${Math.floor(13 + pulse * 8)}, 24)`);
  gradient.addColorStop(0.5, "#182737");
  gradient.addColorStop(1, "#473022");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 90; i += 1) {
    const x = (i * 151 + time * 4) % width;
    const y = 18 + ((i * 79) % (height * 0.32));
    const a = 0.28 + ((i % 7) / 10);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }

  const moonX = width * 0.76 + Math.sin(time * 0.02) * 38;
  const moonY = height * 0.16;
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 209, 102, 0.78)";
  ctx.arc(moonX, moonY, 42 * state.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHorizon(baseSegment, time) {
  const width = state.width;
  const height = state.height;
  const horizonY = height * 0.47 + Math.sin(time * 0.4) * 5;
  ctx.fillStyle = "#0b1115";
  ctx.beginPath();
  ctx.moveTo(0, horizonY + 60);
  for (let x = 0; x <= width + 80; x += 80) {
    const y = horizonY + Math.sin((x + baseSegment.index * 0.4) * 0.012) * 32;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.92;
  for (let i = 0; i < scenery.length; i += 1) {
    const item = scenery[i];
    const dz = ((item.z - state.position + state.trackLength) % state.trackLength) / state.trackLength;
    if (dz > 0.36) continue;
    const side = item.x < 0 ? -1 : 1;
    const x = width / 2 + side * (width * 0.28 + dz * width * 0.95) + item.x * 18;
    const h = item.h * (1 - dz * 1.5) * state.scale;
    const w = item.w * (1 - dz * 1.3) * state.scale;
    const y = horizonY - h + dz * 80;
    if (h < 8) continue;
    ctx.fillStyle = item.lit ? "#111b24" : "#0a0f14";
    ctx.fillRect(x - w / 2, y, w, h);
    if (item.lit) {
      ctx.fillStyle = "rgba(255, 209, 102, 0.38)";
      for (let wy = y + 14; wy < y + h - 12; wy += 22 * state.scale) {
        for (let wx = x - w / 2 + 8; wx < x + w / 2 - 8; wx += 18 * state.scale) {
          if ((Math.floor(wx + wy) + item.h) % 3) ctx.fillRect(wx, wy, 5, 8);
        }
      }
    }
  }
  ctx.restore();
}

function drawSprite(sprite, scale, destX, destY, offsetX, offsetY, clipY, fog) {
  const width = state.width;
  const spriteScale = scale * sprite.scale * width / 2;
  const x = destX + spriteScale * offsetX;
  const y = destY + spriteScale * offsetY;
  const w = spriteScale;
  const h = spriteScale * (sprite.type === "billboard" ? 0.7 : 1.8);
  if (clipY && y + h > clipY) return;

  ctx.save();
  ctx.globalAlpha = fog;
  if (sprite.type === "gantry") {
    const postH = h * 0.72;
    ctx.strokeStyle = "rgba(210,220,214,0.72)";
    ctx.lineWidth = Math.max(2, w * 0.035);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.58, y);
    ctx.lineTo(x - w * 0.58, y - postH);
    ctx.lineTo(x + w * 0.58, y - postH);
    ctx.lineTo(x + w * 0.58, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(4,8,10,0.9)";
    ctx.fillRect(x - w * 0.42, y - postH - h * 0.14, w * 0.84, h * 0.18);
    ctx.fillStyle = sprite.color;
    ctx.shadowColor = sprite.color;
    ctx.shadowBlur = 18;
    ctx.fillRect(x - w * 0.3, y - postH - h * 0.07, w * 0.6, h * 0.035);
  } else if (sprite.type === "chevron") {
    ctx.fillStyle = "rgba(4,8,10,0.86)";
    ctx.fillRect(x - w * 0.34, y - h * 0.48, w * 0.68, h * 0.32);
    ctx.strokeStyle = sprite.color;
    ctx.lineWidth = Math.max(2, w * 0.035);
    ctx.strokeRect(x - w * 0.34, y - h * 0.48, w * 0.68, h * 0.32);
    ctx.fillStyle = sprite.color;
    for (let i = 0; i < 2; i += 1) {
      const cx = x + (i - 0.5) * w * 0.22;
      ctx.beginPath();
      ctx.moveTo(cx - sprite.direction * w * 0.12, y - h * 0.41);
      ctx.lineTo(cx + sprite.direction * w * 0.08, y - h * 0.32);
      ctx.lineTo(cx - sprite.direction * w * 0.12, y - h * 0.23);
      ctx.lineTo(cx - sprite.direction * w * 0.04, y - h * 0.32);
      ctx.closePath();
      ctx.fill();
    }
  } else if (sprite.type === "billboard") {
    ctx.fillStyle = "rgba(4,8,10,0.84)";
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = sprite.color;
    ctx.lineWidth = Math.max(1, 3 * scale * state.width);
    ctx.strokeRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = sprite.color;
    ctx.fillRect(x - w * 0.34, y - h * 0.62, w * 0.68, h * 0.1);
    ctx.fillRect(x - w * 0.22, y - h * 0.42, w * 0.44, h * 0.08);
  } else if (sprite.type === "light") {
    ctx.strokeStyle = "rgba(210,220,214,0.72)";
    ctx.lineWidth = Math.max(1, 4 * state.scale * scale * width);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h);
    ctx.stroke();
    ctx.fillStyle = sprite.color;
    ctx.shadowColor = sprite.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x, y - h, Math.max(2, w * 0.11), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#102817";
    ctx.fillRect(x - w * 0.06, y - h * 0.38, w * 0.12, h * 0.38);
    ctx.fillStyle = sprite.color;
    ctx.beginPath();
    ctx.arc(x, y - h * 0.55, Math.max(4, w * 0.34), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f6a3b";
    ctx.beginPath();
    ctx.arc(x + w * 0.18, y - h * 0.72, Math.max(4, w * 0.23), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCar(x, y, scale, color, accent, steer = 0, boost = false, rival = false) {
  const style = typeof color === "object" ? color : { color, accent, roof: "#10151b", profile: "gt" };
  const bodyColor = style.color;
  const trimColor = style.accent || accent || "#f6f3ea";
  const roofColor = style.roof || "#10151b";
  const profile = style.profile || "gt";
  const dimensions = {
    wedge: [126, 180],
    longtail: [116, 206],
    berlinetta: [120, 190],
    longnose: [122, 216],
    coupe: [116, 198],
    widebody: [132, 188],
    gt: [118, 194],
  }[profile] || [118, 194];
  const w = dimensions[0] * scale;
  const h = dimensions[1] * scale;
  const lean = steer * 10 * scale;
  const nose = profile === "longnose" ? -h * 0.7 : profile === "longtail" ? -h * 0.62 : -h * 0.58;
  const tail = profile === "longtail" ? h * 0.48 : h * 0.34;
  const waist = profile === "widebody" ? 0.56 : profile === "wedge" ? 0.52 : 0.48;
  const cockpitY = profile === "longnose" ? -h * 0.28 : -h * 0.22;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(steer * 0.035);
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 24 * scale;
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.1, w * 0.55, h * 0.23, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  const bodyGradient = ctx.createLinearGradient(-w * 0.45, nose, w * 0.46, tail);
  bodyGradient.addColorStop(0, bodyColor);
  bodyGradient.addColorStop(0.48, "rgba(255,255,255,0.24)");
  bodyGradient.addColorStop(0.56, bodyColor);
  bodyGradient.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(-w * waist + lean, h * 0.18);
  ctx.lineTo(-w * 0.4, -h * 0.32);
  ctx.quadraticCurveTo(-w * 0.24, nose, 0, nose);
  ctx.quadraticCurveTo(w * 0.24, nose, w * 0.4, -h * 0.32);
  ctx.lineTo(w * waist + lean, h * 0.18);
  ctx.quadraticCurveTo(w * 0.36, tail, 0, tail);
  ctx.quadraticCurveTo(-w * 0.36, tail, -w * waist + lean, h * 0.18);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(1, 1.8 * scale);
  ctx.stroke();

  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, cockpitY);
  ctx.lineTo(-w * 0.18, cockpitY - h * 0.22);
  ctx.quadraticCurveTo(0, cockpitY - h * 0.32, w * 0.18, cockpitY - h * 0.22);
  ctx.lineTo(w * 0.28, cockpitY);
  ctx.quadraticCurveTo(0, cockpitY + h * 0.12, -w * 0.28, cockpitY);
  ctx.closePath();
  ctx.fill();

  const glass = ctx.createLinearGradient(0, cockpitY - h * 0.28, 0, cockpitY + h * 0.12);
  glass.addColorStop(0, "rgba(220,250,255,0.62)");
  glass.addColorStop(1, "rgba(7,16,24,0.92)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-w * 0.18, cockpitY - h * 0.16);
  ctx.lineTo(w * 0.18, cockpitY - h * 0.16);
  ctx.lineTo(w * 0.22, cockpitY + h * 0.02);
  ctx.lineTo(-w * 0.22, cockpitY + h * 0.02);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(0, nose + h * 0.1);
  ctx.lineTo(0, tail - h * 0.04);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect(-w * 0.58, -h * 0.24, w * 0.12, h * 0.34);
  ctx.fillRect(w * 0.46, -h * 0.24, w * 0.12, h * 0.34);
  ctx.fillRect(-w * 0.55, h * 0.12, w * 0.13, h * 0.2);
  ctx.fillRect(w * 0.42, h * 0.12, w * 0.13, h * 0.2);

  ctx.fillStyle = trimColor;
  ctx.fillRect(-w * 0.42, h * 0.16, w * 0.22, h * 0.045);
  ctx.fillRect(w * 0.2, h * 0.16, w * 0.22, h * 0.045);
  ctx.fillStyle = "rgba(235,250,255,0.9)";
  ctx.fillRect(-w * 0.34, nose + h * 0.2, w * 0.17, h * 0.045);
  ctx.fillRect(w * 0.17, nose + h * 0.2, w * 0.17, h * 0.045);

  if (profile === "longtail" || profile === "wedge" || profile === "widebody") {
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, tail - h * 0.05);
    ctx.lineTo(w * 0.46, tail - h * 0.05);
    ctx.stroke();
  }

  if (boost && !rival) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(0,216,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, h * 0.34);
    ctx.lineTo(0, h * (0.78 + Math.random() * 0.16));
    ctx.lineTo(w * 0.2, h * 0.34);
    ctx.fill();
    ctx.fillStyle = "rgba(110,255,122,0.55)";
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, h * 0.34);
    ctx.lineTo(0, h * (0.62 + Math.random() * 0.1));
    ctx.lineTo(w * 0.12, h * 0.34);
    ctx.fill();
  }

  ctx.restore();
}

function drawRival(rival, segment, percent, roadX, roadW, clipY, fog) {
  const scale = lerp(segment.p1.screen.scale, segment.p2.screen.scale, percent);
  const x = lerp(segment.p1.screen.x, segment.p2.screen.x, percent) + scale * rival.x * CONFIG.roadWidth * state.width / 2;
  const y = lerp(segment.p1.screen.y, segment.p2.screen.y, percent);
  if (y > clipY) return;
  const carScale = clamp(scale * state.width * 0.72, 0.12, 1.2);
  ctx.save();
  ctx.globalAlpha = fog;
  drawCar(x, y, carScale, rival.color, "#f6f3ea", 0, false, true);
  ctx.restore();
}

function drawPoliceUnit(unit, segment, percent, clipY, fog) {
  const scale = lerp(segment.p1.screen.scale, segment.p2.screen.scale, percent);
  const x = lerp(segment.p1.screen.x, segment.p2.screen.x, percent) + scale * unit.x * CONFIG.roadWidth * state.width / 2;
  const y = lerp(segment.p1.screen.y, segment.p2.screen.y, percent);
  if (y > clipY) return;
  const carScale = clamp(scale * state.width * (unit.kind === "roadblock" ? 0.82 : 0.76), 0.14, 1.28);
  const pulse = 0.5 + Math.sin(state.raceTime * 18) * 0.5;

  ctx.save();
  ctx.globalAlpha = fog;
  drawCar(x, y, carScale, "#e7edf2", pulse > 0.5 ? "#ff3e3e" : "#00d8ff", 0, false, true);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = pulse > 0.5 ? "rgba(255,62,62,0.86)" : "rgba(0,216,255,0.86)";
  ctx.shadowColor = pulse > 0.5 ? "#ff3e3e" : "#00d8ff";
  ctx.shadowBlur = 18;
  ctx.fillRect(x - carScale * 16, y - carScale * 46, carScale * 32, carScale * 8);

  if (unit.kind === "roadblock") {
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(255,209,102,0.8)";
    ctx.lineWidth = Math.max(2, carScale * 4);
    ctx.beginPath();
    ctx.moveTo(x - carScale * 74, y + carScale * 16);
    ctx.lineTo(x + carScale * 74, y + carScale * 16);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  const car = CARS[state.selectedCar];
  const x = state.width / 2 + state.playerX * state.width * 0.28 + state.drift * 18;
  const y = state.height * (state.cameraMode ? 0.83 : 0.79);
  const scale = clamp(state.height / 820, 0.68, 1.1);
  drawCar(x, y, scale, car, car.accent, state.drift, input.boost && state.boost > 0);
}

function drawHeadlightSweep() {
  const beamWidth = state.width * (0.24 + state.slipstream * 0.08);
  const carX = state.width / 2 + state.playerX * state.width * 0.28;
  const nearY = state.height * 0.81;
  const farY = state.height * 0.46;
  const gradient = ctx.createLinearGradient(0, farY, 0, nearY);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.62, "rgba(0,216,255,0.09)");
  gradient.addColorStop(1, "rgba(255,255,255,0.2)");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(carX - beamWidth * 0.12, nearY);
  ctx.lineTo(carX + beamWidth * 0.12, nearY);
  ctx.lineTo(state.width / 2 + beamWidth, farY);
  ctx.lineTo(state.width / 2 - beamWidth, farY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPoliceOverlay() {
  if (!state.pursuitActive && state.pursuitFlash <= 0) return;

  const pulse = 0.5 + Math.sin(state.raceTime * 16) * 0.5;
  const heat = clamp(state.heat / 100, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp(0.12 + state.pursuitPressure * 0.26 + state.pursuitFlash * 0.18, 0, 0.52);

  const left = ctx.createLinearGradient(0, 0, state.width * 0.34, 0);
  left.addColorStop(0, pulse > 0.5 ? "rgba(255,62,62,0.75)" : "rgba(0,216,255,0.65)");
  left.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, state.width * (0.24 + heat * 0.1), state.height);

  const right = ctx.createLinearGradient(state.width, 0, state.width * 0.66, 0);
  right.addColorStop(0, pulse > 0.5 ? "rgba(0,216,255,0.65)" : "rgba(255,62,62,0.75)");
  right.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = right;
  ctx.fillRect(state.width * (0.76 - heat * 0.1), 0, state.width * 0.34, state.height);

  if (state.heatLevel >= 3) {
    const spotX = state.width * (0.5 + Math.sin(state.raceTime * 0.85) * 0.25);
    const spot = ctx.createRadialGradient(spotX, state.height * 0.42, 12, spotX, state.height * 0.42, state.height * 0.34);
    spot.addColorStop(0, "rgba(255,255,255,0.22)");
    spot.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, state.width, state.height);
  }
  ctx.restore();
}

function drawSpeedLines() {
  const speedPct = clamp(state.speed / CARS[state.selectedCar].maxSpeed, 0, 1.3);
  if (speedPct < 0.45) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(0,216,255,${0.08 + speedPct * 0.12})`;
  ctx.lineWidth = 1.5 + speedPct * 2;
  for (let i = 0; i < 36; i += 1) {
    const side = i % 2 ? -1 : 1;
    const x = state.width / 2 + side * (state.width * (0.18 + (i % 9) * 0.045));
    const y = (i * 73 + state.raceTime * 940 * speedPct) % state.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + side * (34 + speedPct * 70), y + 34 + speedPct * 80);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNitroBloom() {
  const boostActive = input.boost && state.boost > 0 && state.speed > 90;
  const intensity = clamp((boostActive ? 0.32 : 0) + state.slipstream * 0.18 + state.cornerSeverity * 0.08, 0, 0.5);
  if (intensity <= 0.03) return;

  const gradient = ctx.createRadialGradient(
    state.width / 2,
    state.height * 0.76,
    state.height * 0.12,
    state.width / 2,
    state.height * 0.76,
    state.height * 0.68,
  );
  gradient.addColorStop(0, `rgba(0,216,255,${intensity})`);
  gradient.addColorStop(0.44, `rgba(255,62,62,${intensity * 0.32})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.restore();
}

function drawProximityWarnings() {
  if (state.timeTrial || state.mode !== "race") return;

  const alerts = [];
  for (const rival of rivals) {
    const dz = Math.abs(((rival.z - state.position + state.trackLength / 2) % state.trackLength) - state.trackLength / 2);
    const laneGap = rival.x - state.playerX;
    if (dz < 760 && Math.abs(laneGap) > 0.26 && Math.abs(laneGap) < 1.2) {
      alerts.push({ side: laneGap > 0 ? 1 : -1, strength: 1 - dz / 760, color: rival.color });
    }
  }
  for (const unit of policeUnits) {
    const dz = Math.abs(((unit.z - state.position + state.trackLength / 2) % state.trackLength) - state.trackLength / 2);
    const laneGap = unit.x - state.playerX;
    if (dz < 940 && Math.abs(laneGap) < 1.25) {
      alerts.push({ side: laneGap > 0 ? 1 : -1, strength: 1 - dz / 940, color: unit.kind === "roadblock" ? "#ffd166" : "#ff3e3e" });
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const alert of alerts.slice(0, 3)) {
    const x = alert.side > 0 ? state.width - 74 : 74;
    const y = state.height * (0.42 + alert.strength * 0.22);
    ctx.fillStyle = alert.color;
    ctx.globalAlpha = 0.38 + alert.strength * 0.48;
    ctx.beginPath();
    if (alert.side > 0) {
      ctx.moveTo(x + 26, y);
      ctx.lineTo(x - 18, y - 24);
      ctx.lineTo(x - 18, y + 24);
    } else {
      ctx.moveTo(x - 26, y);
      ctx.lineTo(x + 18, y - 24);
      ctx.lineTo(x + 18, y + 24);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawWeather(dt) {
  if (!state.weather) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(170, 222, 255, 0.34)";
  ctx.lineWidth = 1;
  const speedFactor = clamp(state.speed / CARS[state.selectedCar].maxSpeed, 0.15, 1.25);
  for (let i = 0; i < 130; i += 1) {
    const x = (i * 97 + state.raceTime * 460 * speedFactor) % (state.width + 120) - 60;
    const y = (i * 53 + state.raceTime * 860 * speedFactor) % (state.height + 140) - 70;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 18 * speedFactor, y + 38 * speedFactor);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.fillStyle = p.color;
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

function addParticles(kind, amount) {
  if (particles.length > CONFIG.maxParticles) return;
  for (let i = 0; i < amount; i += 1) {
    const baseX = state.width / 2 + state.playerX * state.width * 0.28;
    particles.push({
      x: baseX + (Math.random() - 0.5) * 90,
      y: state.height * 0.83 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 210,
      vy: 180 + Math.random() * 340,
      life: 0.25 + Math.random() * 0.5,
      size: kind === "spark" ? 2 + Math.random() * 4 : 1 + Math.random() * 3,
      color: kind === "spark" ? "rgba(255,209,102,0.9)" : "rgba(0,216,255,0.7)",
    });
  }
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(
    state.width / 2,
    state.height * 0.5,
    state.height * 0.25,
    state.width / 2,
    state.height * 0.5,
    state.height * 0.8,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);
}

function render(dt) {
  const baseSegment = findSegment(state.position);
  const basePercent = percentRemaining(state.position, CONFIG.segmentLength);
  const playerSegment = findSegment(state.position + CONFIG.cameraHeight);
  const cameraDepth = 1 / Math.tan((CONFIG.fieldOfView / 2) * Math.PI / 180);
  const cameraY = CONFIG.cameraHeight + playerSegment.y + (state.cameraMode ? 80 : 0);
  const shakeX = (Math.random() - 0.5) * state.shake * 16;
  const shakeY = (Math.random() - 0.5) * state.shake * 10;
  const cameraX = state.playerX * CONFIG.roadWidth - shakeX;
  const cameraZ = state.position - (state.cameraMode ? 470 : 620);

  drawSky(state.raceTime);
  drawHorizon(baseSegment, state.raceTime);

  let x = 0;
  let dx = -(baseSegment.curve * basePercent);
  let maxY = state.height;
  const segmentsToDraw = [];

  for (let n = 0; n < CONFIG.drawDistance; n += 1) {
    const segment = track[(baseSegment.index + n) % track.length];
    segment.looped = segment.index < baseSegment.index;
    segment.fog = exponentialFog(n / CONFIG.drawDistance, CONFIG.fogDensity);
    segment.clip = maxY;
    segment.p1.world.x = x;
    segment.p2.world.x = x + dx;

    project(
      segment.p1,
      cameraX,
      cameraY,
      cameraZ - (segment.looped ? state.trackLength : 0),
      cameraDepth,
      state.width,
      state.height,
      CONFIG.roadWidth,
    );
    project(
      segment.p2,
      cameraX,
      cameraY,
      cameraZ - (segment.looped ? state.trackLength : 0),
      cameraDepth,
      state.width,
      state.height,
      CONFIG.roadWidth,
    );

    x += dx;
    dx += segment.curve;
    if (segment.p1.camera.z <= cameraDepth || segment.p2.screen.y >= maxY) continue;
    segmentsToDraw.push(segment);
    maxY = segment.p2.screen.y;
  }

  for (let n = segmentsToDraw.length - 1; n >= 0; n -= 1) {
    const segment = segmentsToDraw[n];
    drawSegment(
      state.width,
      CONFIG.lanes,
      segment.p1.screen,
      segment.p2.screen,
      segment.color,
      segment.fog,
    );
  }

  drawRacingLine(segmentsToDraw);

  for (let n = segmentsToDraw.length - 1; n >= 0; n -= 1) {
    const segment = segmentsToDraw[n];
    const fog = segment.fog;
    for (const sprite of segment.sprites) {
      const destX = segment.p1.screen.x + segment.p1.screen.w * sprite.offset;
      drawSprite(sprite, segment.p1.screen.scale, destX, segment.p1.screen.y, 0, -1, segment.clip, fog);
    }
    for (const rival of rivals) {
      const rivalSegment = findSegment(rival.z);
      if (rivalSegment.index !== segment.index) continue;
      drawRival(
        rival,
        segment,
        percentRemaining(rival.z, CONFIG.segmentLength),
        segment.p1.screen.x,
        segment.p1.screen.w,
        segment.clip,
        fog,
      );
    }
    for (const unit of policeUnits) {
      const policeSegment = findSegment(unit.z);
      if (policeSegment.index !== segment.index) continue;
      drawPoliceUnit(unit, segment, percentRemaining(unit.z, CONFIG.segmentLength), segment.clip, fog);
    }
  }

  drawHeadlightSweep();
  drawPoliceOverlay();
  drawSpeedLines();
  drawNitroBloom();
  drawProximityWarnings();
  drawPlayer();
  drawWeather(dt);
  drawVignette();
}

function updateCountdown(dt) {
  if (state.countdown <= 0) {
    dom.countdown.classList.remove("is-visible");
    return false;
  }

  state.countdown = Math.max(0, state.countdown - dt);
  const label = state.countdown > 0.9 ? String(Math.ceil(state.countdown)) : "GO";
  dom.countdown.textContent = label;
  dom.countdown.classList.add("is-visible");
  if (label !== state.lastCountdownText) {
    state.lastCountdownText = label;
    setStatus(label === "GO" ? "Launch" : `Grid ${label}`, 0.8);
  }
  if (state.countdown === 0) {
    dom.countdown.classList.remove("is-visible");
    setStatus(state.timeTrial ? "Clean lap" : "Go", 1.2);
  }
  return state.countdown > 0;
}

function updatePursuit(dt) {
  if (state.timeTrial) return;

  state.pursuitFlash = Math.max(0, state.pursuitFlash - dt * 1.8);
  state.roadblockCooldown = Math.max(0, state.roadblockCooldown - dt);
  state.heat = clamp(state.heat - PURSUIT.heatDecay * dt, 0, 100);
  state.heatLevel = calculateHeatLevel(state.heat);

  if (state.speed > 250) addHeat(PURSUIT.heatFromLead * dt, "Speed trap");
  if (state.finishRank === 1 && state.speed > 190) addHeat(0.85 * dt);

  const requiredPursuitCars = state.pursuitActive ? clamp(1 + Math.floor(state.heatLevel / 2), 1, 3) : 0;
  while (policeUnits.filter((unit) => unit.kind === "pursuit").length < requiredPursuitCars) {
    spawnPoliceUnit("pursuit", -PURSUIT.spawnDistance - Math.random() * 720, randomChoice([-0.64, 0, 0.64]));
  }

  if (state.pursuitActive && state.heatLevel >= 3 && state.roadblockCooldown === 0) {
    const firstLane = randomChoice([-0.58, 0, 0.58]);
    spawnPoliceUnit("roadblock", PURSUIT.roadblockDistance, firstLane);
    spawnPoliceUnit("roadblock", PURSUIT.roadblockDistance + 130, -firstLane);
    state.roadblockCooldown = 9.5 - state.heatLevel * 0.7;
    setStatus("Roadblock ahead", 1.3);
  }

  let pressure = 0;
  for (let i = policeUnits.length - 1; i >= 0; i -= 1) {
    const unit = policeUnits[i];
    const signed = ((unit.z - state.position + state.trackLength / 2) % state.trackLength) - state.trackLength / 2;
    const distance = Math.abs(signed);
    const laneGap = Math.abs(unit.x - state.playerX);

    if (unit.kind === "pursuit") {
      const policeCurve = findSegment(unit.z).curve;
      const desiredX = clamp(state.playerX + Math.sign(signed || 1) * 0.14, -0.86, 0.86);
      unit.laneChange -= dt;
      unit.x = lerp(unit.x, desiredX, dt * (0.9 + state.heatLevel * 0.18));
      if (unit.laneChange <= 0) {
        unit.x = clamp(unit.x + randomChoice([-0.12, 0.12]), -0.86, 0.86);
        unit.laneChange = 1.1 + Math.random() * 1.8;
      }
      const closeControl = signed > 220 ? -22 : signed < -480 ? 44 : 12;
      unit.speed = lerp(unit.speed, state.speed + closeControl + state.heatLevel * 11, dt * 1.8);
      unit.z = (unit.z + (unit.speed - policeCurve * 7) * 24 * dt + state.trackLength) % state.trackLength;
      if (signed < -2600) unit.z = (state.position - PURSUIT.spawnDistance + state.trackLength) % state.trackLength;
      if (signed > 1700) unit.z = (state.position + 760 + state.trackLength) % state.trackLength;
    }

    if (unit.kind === "roadblock" && signed < -540) {
      policeUnits.splice(i, 1);
      continue;
    }

    pressure = Math.max(pressure, calculatePursuitPressure(distance, laneGap, state.heatLevel));

    if (distance > 520) unit.nearMissArmed = true;
    if (unit.nearMissArmed && distance < 250 && laneGap >= 0.2 && laneGap < 0.58 && state.speed > 135) {
      const points = Math.round(scoreNearMiss(state.speed, laneGap, state.combo) * 1.35);
      state.score += points;
      state.combo = clamp(state.combo + 0.5, 1, 6);
      state.comboTimer = 4.2;
      state.boost = clamp(state.boost + 12, 0, 100);
      unit.nearMissArmed = false;
      addParticles("spark", 7);
      setStatus(`Evade bonus +${points}`, 1.1);
    }

    if (distance < 175 && laneGap < 0.23) {
      state.speed *= unit.kind === "roadblock" ? 0.48 : 0.68;
      state.shake = 1.15;
      state.boost = Math.max(0, state.boost - 24);
      state.combo = 1;
      state.comboTimer = 0;
      state.bustProgress = clamp(state.bustProgress + (unit.kind === "roadblock" ? 1.9 : 1.1), 0, 5);
      addHeat(PURSUIT.heatFromImpact, "Pursuit contact");
      addParticles("spark", unit.kind === "roadblock" ? 28 : 18);
      setStatus(unit.kind === "roadblock" ? "Roadblock hit" : "Police contact", 1);
      if (unit.kind === "roadblock") policeUnits.splice(i, 1);
    }
  }

  state.pursuitPressure = lerp(state.pursuitPressure, pressure, dt * 5);
  state.bustProgress = clamp(state.bustProgress - (state.speed > 90 ? 0.34 : 0.12) * dt, 0, 5);

  if (state.pursuitActive) {
    state.pursuitTimer += dt;
    state.evadeProgress = calculateEvadeProgress(state.evadeProgress, state.pursuitPressure, state.speed, dt);
    if (state.evadeProgress >= PURSUIT.evadeSeconds) {
      const bonus = 1200 + state.heatLevel * 450;
      state.score += bonus;
      state.heat = clamp(state.heat - 22, 0, 100);
      state.heatLevel = calculateHeatLevel(state.heat);
      state.pursuitActive = state.heatLevel > 1;
      state.evadeProgress = 0;
      policeUnits.length = state.pursuitActive ? policeUnits.length : 0;
      state.pursuitFlash = 1;
      setStatus(`Pursuit escaped +${bonus}`, 1.8);
    }
  }

  if (state.heatLevel === 0 && state.heat <= 0.5) {
    state.pursuitActive = false;
    state.pursuitTimer = 0;
    state.evadeProgress = 0;
    policeUnits.length = 0;
  }
}

function updateRace(dt) {
  if (state.mode !== "race" || state.paused) return;

  if (updateCountdown(dt)) {
    state.speed = 0;
    state.shake = Math.max(0, state.shake - dt * 1.9);
    return;
  }

  const car = CARS[state.selectedCar];
  const difficulty = DIFFICULTY[state.difficulty];
  const maxSpeed = car.maxSpeed + (input.boost && state.boost > 0 ? 74 * car.boost : 0);
  const oldPosition = state.position;
  const segment = findSegment(state.position + CONFIG.cameraHeight);
  const upcomingCurve = sampleUpcomingCurve(state.position);
  const speedPercent = state.speed / car.maxSpeed;
  const steerScale = dt * 2.7 * car.handling * (car.grip || 1) * difficulty.grip * (state.assist ? 1.08 : 1);

  if (input.throttle || state.speed < 45) {
    state.speed += car.accel * dt;
  } else {
    state.speed -= 34 * dt;
  }
  if (input.brake) state.speed -= 176 * dt;
  if (input.boost && state.boost > 0 && state.speed > 90) {
    state.speed += 168 * dt * car.boost;
    state.boost -= 27 * dt;
    state.shake = Math.max(state.shake, 0.5);
    addParticles("boost", 2);
    addHeat(PURSUIT.heatFromBoost * dt, "Nitro signature");
  } else {
    state.boost += (state.speed > 180 ? 7 : 3) * dt;
  }

  if (state.slipstream > 0.08 && state.speed > 120) {
    state.speed += 58 * state.slipstream * dt;
    state.boost += 11 * state.slipstream * dt;
  }

  if (input.left) state.playerX -= steerScale * (0.62 + speedPercent);
  if (input.right) state.playerX += steerScale * (0.62 + speedPercent);
  state.playerX -= speedPercent * segment.curve * CONFIG.centrifugal * dt;
  state.playerX = clamp(state.playerX, -1.28, 1.28);

  const offRoad = Math.abs(state.playerX) > 1;
  if (offRoad) {
    state.speed -= (state.assist ? 55 : 88) * dt;
    if (Math.random() > 0.74) addParticles("spark", 1);
  }

  const intendedDrift = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  state.drift = lerp(state.drift, intendedDrift * speedPercent, dt * 7);
  state.speed = clamp(state.speed, 0, maxSpeed);
  state.boost = clamp(state.boost, 0, 100);
  state.gear = calculateGear(state.speed, car.maxSpeed);
  state.gripLoad = calculateGripLoad(
    state.playerX,
    speedPercent,
    segment.curve / (car.grip || 1),
    input.boost && state.boost > 0,
  );
  state.cornerSeverity = clamp(Math.abs(upcomingCurve) * (0.45 + speedPercent), 0, 1);
  state.position = (state.position + state.speed * 26 * dt) % state.trackLength;
  state.raceTime += dt;
  state.currentLapTime += dt;
  state.shake = Math.max(0, state.shake - dt * 1.9);
  state.lapPulse = Math.max(0, state.lapPulse - dt * 2.5);
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  state.directorCooldown = Math.max(0, state.directorCooldown - dt);
  if (state.comboTimer === 0) state.combo = lerp(state.combo, 1, dt * 2.6);

  for (const rival of rivals) {
    const rivalCurve = findSegment(rival.z).curve;
    rival.laneChange -= dt;
    if (rival.laneChange < 0) {
      rival.x = clamp(rival.x + randomChoice([-0.34, -0.2, 0.2, 0.34]), -0.8, 0.8);
      rival.laneChange = 1.7 + Math.random() * 3.2;
    }
    rival.z = (rival.z + (rival.speed - rivalCurve * 8) * 24 * dt) % state.trackLength;
  }

  let slipstreamTarget = 0;
  for (const rival of rivals) {
    const dz = Math.abs(((rival.z - state.position + state.trackLength / 2) % state.trackLength) - state.trackLength / 2);
    const ahead = (rival.z - state.position + state.trackLength) % state.trackLength;
    const laneGap = Math.abs(rival.x - state.playerX);
    slipstreamTarget = Math.max(slipstreamTarget, calculateSlipstream(ahead, laneGap));

    if (dz > 520) rival.nearMissArmed = true;
    if (rival.nearMissArmed && dz < 250 && laneGap >= 0.22 && laneGap < 0.58 && state.speed > 125) {
      const points = scoreNearMiss(state.speed, laneGap, state.combo);
      state.score += points;
      state.nearMisses += 1;
      state.combo = clamp(state.combo + 0.34, 1, 5);
      state.comboTimer = 3.8;
      state.boost = clamp(state.boost + 9, 0, 100);
      rival.nearMissArmed = false;
      addParticles("spark", 5);
      addHeat(PURSUIT.heatFromNearMiss, "Heat rising");
      setStatus(`Near miss +${points}`, 1.1);
    }

    if (dz < 190 && laneGap < 0.22) {
      state.speed *= 0.72;
      state.shake = 1;
      state.boost = Math.max(0, state.boost - 18);
      rival.x += rival.x > state.playerX ? 0.24 : -0.24;
      rival.nearMissArmed = false;
      state.combo = 1;
      state.comboTimer = 0;
      addParticles("spark", 18);
      addHeat(PURSUIT.heatFromImpact, "Impact reported");
      setStatus("Impact", 0.9);
    }
  }
  updatePursuit(dt);
  state.slipstream = lerp(state.slipstream, slipstreamTarget, dt * 4);
  if (state.slipstream > 0.42 && state.directorCooldown === 0) {
    state.directorCooldown = 5;
    setStatus("Draft locked", 1);
  }

  if (oldPosition > state.position) {
    const lapTime = state.currentLapTime;
    state.bestLap = Math.min(state.bestLap, lapTime);
    state.currentLapTime = 0;
    state.lap += 1;
    state.lapPulse = 1;
    state.boost = 100;
    if (state.lap > CONFIG.totalLaps) {
      finishRace();
    } else {
      setStatus(`Lap ${state.lap}`, 1.6);
    }
  }

  state.finishRank = computePosition();
  if (state.statusTimer > 0) {
    state.statusTimer -= dt;
    if (state.statusTimer <= 0) dom.statusLine.textContent = "";
  }
}

function computePosition() {
  if (state.timeTrial) return 1;
  const playerRaceDistance = (state.lap - 1) * state.trackLength + state.position;
  let rank = 1;
  for (const rival of rivals) {
    const rivalDistance = rival.z > state.position - 500 ? rival.z : rival.z + state.trackLength;
    if (rivalDistance > playerRaceDistance) rank += 1;
  }
  return clamp(rank, 1, rivals.length + 1);
}

function finishRace() {
  state.mode = "finished";
  state.paused = false;
  state.speed = 0;
  stopAudio();
  dom.finishTitle.textContent =
    state.finishRank === 1 ? "Podium finish" : state.finishRank <= 3 ? "Strong finish" : "Run complete";
  dom.resultTime.textContent = formatTime(state.raceTime);
  dom.resultLap.textContent = formatTime(state.bestLap);
  dom.resultPosition.textContent = state.timeTrial ? "Solo" : `${state.finishRank}/${rivals.length + 1}`;
  dom.resultScore.textContent = state.score.toLocaleString("en-US");
  showPanel(dom.finishPanel);
  setStatus("Race complete", 5);
}

function updateHud() {
  dom.positionValue.textContent = state.timeTrial ? "TT" : state.finishRank;
  dom.lapValue.textContent = `${Math.min(state.lap, CONFIG.totalLaps)}/${CONFIG.totalLaps}`;
  dom.timeValue.textContent = formatTime(state.raceTime);
  dom.bestValue.textContent = formatTime(state.bestLap);
  dom.speedValue.textContent = Math.round(state.speed);
  dom.scoreValue.textContent = state.score.toLocaleString("en-US");
  dom.comboValue.textContent = `x${state.combo.toFixed(1)}`;
  dom.heatValue.textContent = state.heatLevel ? `${state.heatLevel}` : "0";
  dom.evadeValue.textContent = state.pursuitActive
    ? `${Math.round(state.evadeProgress / PURSUIT.evadeSeconds * 100)}%`
    : state.heatLevel ? "WATCH" : "CLEAR";
  dom.pursuitModule.classList.toggle("is-hot", state.pursuitActive || state.pursuitFlash > 0.1);
  dom.gearValue.textContent = state.gear;
  dom.gripValue.textContent = `${state.gripLoad}%`;
  dom.gripFill.style.width = `${state.gripLoad}%`;
  dom.apexValue.textContent =
    state.cornerSeverity < 0.16 ? "OPEN" : sampleUpcomingCurve(state.position) > 0 ? "RIGHT" : "LEFT";
  dom.boostFill.style.width = `${state.boost}%`;
  dom.slipstreamFill.style.width = `${Math.round(state.slipstream * 100)}%`;
  drawSpeedometer();
  drawMiniMap();
}

function drawSpeedometer() {
  const canvas = dom.speedCanvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.floor(rect.width * dpr)) {
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }
  speedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.42;
  speedCtx.clearRect(0, 0, w, h);
  speedCtx.lineWidth = Math.max(8, w * 0.045);
  speedCtx.strokeStyle = "rgba(255,255,255,0.16)";
  speedCtx.beginPath();
  speedCtx.arc(cx, cy, radius, Math.PI * 0.78, Math.PI * 2.22);
  speedCtx.stroke();
  const car = CARS[state.selectedCar];
  const pct = clamp(state.speed / (car.maxSpeed + 74), 0, 1);
  const gradient = speedCtx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, "#00d8ff");
  gradient.addColorStop(0.6, "#6eff7a");
  gradient.addColorStop(1, "#ff3e3e");
  speedCtx.strokeStyle = gradient;
  speedCtx.beginPath();
  speedCtx.arc(cx, cy, radius, Math.PI * 0.78, Math.PI * (0.78 + 1.44 * pct));
  speedCtx.stroke();
}

function drawMiniMap() {
  const canvas = dom.miniMap;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.floor(rect.width * dpr)) {
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }
  mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  mapCtx.clearRect(0, 0, w, h);
  mapCtx.strokeStyle = "rgba(255,255,255,0.22)";
  mapCtx.lineWidth = 4;
  mapCtx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const t = i / 120;
    const idx = Math.floor(t * (track.length - 1));
    const curveSum = track.slice(Math.max(0, idx - 12), idx + 1).reduce((sum, seg) => sum + seg.curve, 0);
    const x = w / 2 + Math.sin(t * Math.PI * 2) * w * 0.22 + curveSum * 1.1;
    const y = 18 + t * (h - 36);
    if (i === 0) mapCtx.moveTo(x, y);
    else mapCtx.lineTo(x, y);
  }
  mapCtx.stroke();

  const drawDot = (z, color, r) => {
    const t = (z % state.trackLength) / state.trackLength;
    const idx = Math.floor(t * (track.length - 1));
    const curveSum = track.slice(Math.max(0, idx - 12), idx + 1).reduce((sum, seg) => sum + seg.curve, 0);
    const x = w / 2 + Math.sin(t * Math.PI * 2) * w * 0.22 + curveSum * 1.1;
    const y = 18 + t * (h - 36);
    mapCtx.fillStyle = color;
    mapCtx.beginPath();
    mapCtx.arc(x, y, r, 0, Math.PI * 2);
    mapCtx.fill();
  };

  for (const rival of rivals) drawDot(rival.z, rival.color, 3);
  for (const unit of policeUnits) drawDot(unit.z, unit.kind === "roadblock" ? "#ffd166" : "#ff3e3e", 4);
  drawDot(state.position, CARS[state.selectedCar].color, 5);
}

function showPanel(panel) {
  panel.classList.add("is-visible");
}

function hidePanel(panel) {
  panel.classList.remove("is-visible");
}

function renderGarage() {
  if (!dom.garageGrid) return;
  dom.garageGrid.innerHTML = "";
  Object.entries(CARS).forEach(([id, car]) => {
    const button = document.createElement("button");
    button.className = `garage-card${id === state.selectedCar ? " is-selected" : ""}`;
    button.dataset.car = id;
    button.type = "button";
    button.innerHTML = `
      <span class="car-swatch" style="color:${car.color};background:${car.color}"></span>
      <span>
        <strong>${car.brand} ${car.model}</strong>
        <small>${car.grade}<br>${car.powerHp} hp · ${car.drivetrain} · ${car.zeroTo100.toFixed(1)}s</small>
        <em>${car.className}</em>
      </span>
    `;
    dom.garageGrid.appendChild(button);
  });
  updateGarageSpec();
}

function updateGarageSpec() {
  const car = CARS[state.selectedCar];
  if (!car || !dom.selectedModel) return;
  dom.selectedClass.textContent = `${car.className} ${calculatePerformanceIndex(car)}`;
  dom.selectedModel.textContent = `${car.brand} ${car.model}`;
  dom.selectedGrade.textContent = `${car.grade} · ${car.engine}`;
  dom.selectedPower.textContent = `${car.powerHp} hp`;
  dom.selectedLaunch.textContent = `${car.zeroTo100.toFixed(1)}s`;
  dom.selectedTopSpeed.textContent = `${car.maxSpeed} km/h`;
  dom.selectedDrive.textContent = car.drivetrain;
}

function togglePause() {
  if (state.mode !== "race") return;
  state.paused = !state.paused;
  if (state.paused) {
    showPanel(dom.pausePanel);
    stopAudio();
  } else {
    hidePanel(dom.pausePanel);
    startAudio();
  }
}

function startAudio() {
  if (state.muted) return;
  if (!audio.ctx) {
    audio.ctx = new AudioContext();
    audio.engine = audio.ctx.createOscillator();
    audio.gain = audio.ctx.createGain();
    audio.filter = audio.ctx.createBiquadFilter();
    audio.engine.type = "sawtooth";
    audio.filter.type = "lowpass";
    audio.engine.connect(audio.filter);
    audio.filter.connect(audio.gain);
    audio.gain.connect(audio.ctx.destination);
    audio.gain.gain.value = 0.0001;
    audio.engine.start();
  }
  audio.ctx.resume();
}

function stopAudio() {
  if (audio.gain) audio.gain.gain.setTargetAtTime(0.0001, audio.ctx.currentTime, 0.08);
}

function updateAudio() {
  if (!audio.ctx || state.muted || state.mode !== "race" || state.paused) return;
  const car = CARS[state.selectedCar];
  const pct = clamp(state.speed / car.maxSpeed, 0, 1.2);
  audio.engine.frequency.setTargetAtTime(58 + pct * 150, audio.ctx.currentTime, 0.04);
  audio.filter.frequency.setTargetAtTime(320 + pct * 1300, audio.ctx.currentTime, 0.06);
  audio.gain.gain.setTargetAtTime(0.025 + pct * 0.04, audio.ctx.currentTime, 0.08);
}

function bindInputs() {
  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "throttle",
    KeyW: "throttle",
    ArrowDown: "brake",
    KeyS: "brake",
    Space: "boost",
    ShiftLeft: "boost",
    ShiftRight: "boost",
  };

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyP" || event.code === "Escape") {
      togglePause();
      return;
    }
    if (event.code === "KeyR" && state.mode !== "menu") {
      resetRace({ trial: state.timeTrial });
      return;
    }
    if (event.code === "KeyC") {
      state.cameraMode = (state.cameraMode + 1) % 2;
      setStatus("Camera changed", 1);
      return;
    }
    const mapped = keyMap[event.code];
    if (mapped) {
      input[mapped] = true;
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const mapped = keyMap[event.code];
    if (mapped) {
      input[mapped] = false;
      event.preventDefault();
    }
  });

  document.querySelectorAll(".touch-pad button").forEach((button) => {
    const control = button.dataset.control;
    const press = (event) => {
      input[control] = true;
      button.classList.add("is-pressed");
      event.preventDefault();
    };
    const release = (event) => {
      input[control] = false;
      button.classList.remove("is-pressed");
      event.preventDefault();
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });
}

function bindMenus() {
  renderGarage();
  document.querySelectorAll(".garage-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCar = button.dataset.car;
      document.querySelectorAll(".garage-card").forEach((card) => card.classList.remove("is-selected"));
      button.classList.add("is-selected");
      updateGarageSpec();
      setStatus(`${CARS[state.selectedCar].brand} ${CARS[state.selectedCar].model}`, 1.4);
    });
  });

  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => {
      state.difficulty = button.dataset.difficulty;
      document.querySelectorAll("[data-difficulty]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      setStatus(`${button.textContent} mode`, 1.4);
    });
  });

  dom.startRace.addEventListener("click", () => resetRace({ trial: false }));
  dom.timeTrial.addEventListener("click", () => resetRace({ trial: true }));
  dom.resumeRace.addEventListener("click", togglePause);
  dom.restartRace.addEventListener("click", () => resetRace({ trial: state.timeTrial }));
  dom.nextRace.addEventListener("click", () => resetRace({ trial: state.timeTrial }));
  dom.backGarage.addEventListener("click", () => {
    hidePanel(dom.finishPanel);
    showPanel(dom.startPanel);
    state.mode = "menu";
    setStatus("Ready");
  });

  dom.cameraToggle.addEventListener("click", () => {
    state.cameraMode = (state.cameraMode + 1) % 2;
    dom.cameraToggle.classList.toggle("is-on", state.cameraMode === 1);
  });
  dom.weatherToggle.addEventListener("click", () => {
    state.weather = !state.weather;
    dom.weatherToggle.classList.toggle("is-on", state.weather);
  });
  dom.assistToggle.addEventListener("click", () => {
    state.assist = !state.assist;
    dom.assistToggle.classList.toggle("is-on", state.assist);
  });
  dom.muteToggle.addEventListener("click", () => {
    state.muted = !state.muted;
    dom.muteToggle.classList.toggle("is-on", !state.muted);
    if (state.muted) stopAudio();
    else startAudio();
  });
}

function frame(timestamp) {
  if (!state.lastFrame) state.lastFrame = timestamp;
  const dt = clamp((timestamp - state.lastFrame) / 1000, 0, 0.05);
  state.lastFrame = timestamp;
  updateRace(dt);
  render(dt);
  updateHud();
  updateAudio();
  requestAnimationFrame(frame);
}

function assignDom() {
  dom.canvas = $("gameCanvas");
  dom.speedCanvas = $("speedCanvas");
  dom.miniMap = $("miniMap");
  dom.startPanel = $("startPanel");
  dom.pausePanel = $("pausePanel");
  dom.finishPanel = $("finishPanel");
  dom.garageGrid = $("garageGrid");
  dom.selectedClass = $("selectedClass");
  dom.selectedModel = $("selectedModel");
  dom.selectedGrade = $("selectedGrade");
  dom.selectedPower = $("selectedPower");
  dom.selectedLaunch = $("selectedLaunch");
  dom.selectedTopSpeed = $("selectedTopSpeed");
  dom.selectedDrive = $("selectedDrive");
  dom.positionValue = $("positionValue");
  dom.lapValue = $("lapValue");
  dom.timeValue = $("timeValue");
  dom.bestValue = $("bestValue");
  dom.scoreValue = $("scoreValue");
  dom.comboValue = $("comboValue");
  dom.heatValue = $("heatValue");
  dom.evadeValue = $("evadeValue");
  dom.pursuitModule = document.querySelector(".hud-module.pursuit");
  dom.speedValue = $("speedValue");
  dom.gearValue = $("gearValue");
  dom.gripValue = $("gripValue");
  dom.gripFill = $("gripFill");
  dom.apexValue = $("apexValue");
  dom.boostFill = $("boostFill");
  dom.slipstreamFill = $("slipstreamFill");
  dom.statusLine = $("statusLine");
  dom.countdown = $("countdown");
  dom.startRace = $("startRace");
  dom.timeTrial = $("timeTrial");
  dom.resumeRace = $("resumeRace");
  dom.restartRace = $("restartRace");
  dom.nextRace = $("nextRace");
  dom.backGarage = $("backGarage");
  dom.cameraToggle = $("cameraToggle");
  dom.weatherToggle = $("weatherToggle");
  dom.assistToggle = $("assistToggle");
  dom.muteToggle = $("muteToggle");
  dom.resultTime = $("resultTime");
  dom.resultLap = $("resultLap");
  dom.resultPosition = $("resultPosition");
  dom.resultScore = $("resultScore");
  dom.finishTitle = $("finishTitle");
}

function init() {
  assignDom();
  ctx = dom.canvas.getContext("2d");
  speedCtx = dom.speedCanvas.getContext("2d");
  mapCtx = dom.miniMap.getContext("2d");
  buildTrack();
  populateWorld();
  resetRivals();
  bindInputs();
  bindMenus();
  resize();
  window.addEventListener("resize", resize);
  render(0);
  updateHud();
  requestAnimationFrame(frame);
  window.__nightline = {
    state,
    input,
    resetRace,
    formatTime,
    findSegment,
    calculateGear,
    calculateGripLoad,
    calculateHeatLevel,
    calculatePerformanceIndex,
    calculatePursuitPressure,
    calculateEvadeProgress,
    calculateSlipstream,
    scoreNearMiss,
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", init);
}

export {
  CARS,
  DIFFICULTY,
  CONFIG,
  PURSUIT,
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
};
