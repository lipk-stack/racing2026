/**
 * Nightline Racer entry point.
 *
 * Owns the top-level mode machine (showroom <-> race), the fixed-step loop, and the wiring between
 * the headless simulation and everything that presents it: the 3D scene, the HUD, the audio engine
 * and the career profile.
 */

import * as THREE from "three";
import { CARS } from "./data/cars.js";
import { DIFFICULTY, EVENTS } from "./data/events.js";
import { TRACKS } from "./data/tracks.js";
import { createAudioEngine } from "./engine/audio.js";
import { createInput } from "./engine/input.js";
import { createRenderer } from "./engine/renderer.js";
import { paceControls, planTargetSpeed, steerToTarget } from "./sim/ai.js";
import { createRace, retireRace, snapshot, updateRace } from "./sim/race.js";
import { clamp } from "./sim/vehicle.js";
import { createRaceView, CAMERA_MODES } from "./world/raceview.js";
import { createShowroom } from "./world/showroom.js";
import { createHud } from "./ui/hud.js";
import { createMenus } from "./ui/menus.js";
import {
  applyEventReward,
  buyCar,
  buyUpgrade,
  calculateEventReward,
  carUpgrades,
  loadProfile,
  ownsCar,
  saveProfile,
} from "./game/profile.js";

const FIXED_STEP = 1 / 120;
const MAX_STEPS = 6;

const state = {
  mode: "boot",
  carId: "toyotasupra",
  eventType: "circuit",
  difficulty: "street",
  cameraMode: 0,
  assist: true,
  muted: false,
  photo: false,
  paused: false,
  time: 0,
  boostFlash: 0,
  lastSectorTime: 0,
};

let profile = null;
let renderCtx = null;
let hud = null;
let menus = null;
let audio = null;
let input = null;
let showroom = null;
let raceView = null;
let race = null;
let accumulator = 0;
let lastFrame = 0;

function boot() {
  const canvas = document.getElementById("gameCanvas");
  const fallback = document.getElementById("fallbackPanel");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    fallback.classList.add("is-visible");
    document.getElementById("bootPanel").classList.add("is-done");
    return;
  }

  profile = loadProfile();
  state.carId = profile.selectedCar;

  renderCtx = createRenderer(canvas, { preserveDrawingBuffer: true });
  hud = createHud();
  audio = createAudioEngine();
  input = createInput(window);
  input.bindTouch(document);
  menus = createMenus({
    state,
    profile: () => profile,
    onSelectCar: selectCar,
    onSelectEvent: selectEvent,
    onBuyCar: purchaseCar,
    onBuyUpgrade: purchaseUpgrade,
    onDifficulty: (value) => {
      state.difficulty = value;
      audio.ui("click");
      hud.setStatus(`${DIFFICULTY[value].label} difficulty`);
    },
    onSound: (kind) => audio.ui(kind),
  });

  bindChrome();
  setBootProgress(0.35, "Painting the city");

  // Building the showroom touches the GPU, so let the boot frame paint first.
  requestAnimationFrame(() => {
    enterShowroom();
    setBootProgress(1, "Ready");
    setTimeout(() => document.getElementById("bootPanel").classList.add("is-done"), 240);
    resize();
    window.addEventListener("resize", resize);
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  });

  exposeDebugSurface();
}

function setBootProgress(value, label) {
  const fill = document.getElementById("bootFill");
  const text = document.getElementById("bootLabel");
  if (fill) fill.style.width = `${Math.round(value * 100)}%`;
  if (text) text.textContent = label;
}

function resize() {
  const rect = document.querySelector(".game-shell").getBoundingClientRect();
  renderCtx.resize(rect.width, rect.height);
}

/* ------------------------------------------------------------------ modes -- */

function enterShowroom() {
  disposeRace();
  if (!showroom) showroom = createShowroom(renderCtx);
  showroom.setCar(CARS[state.carId]);
  state.mode = "showroom";
  hud.setLive(false);
  menus.showMenu();
  audio.update({ paused: true });
}

function disposeShowroom() {
  if (!showroom) return;
  showroom.dispose();
  showroom = null;
}

function disposeRace() {
  if (raceView) {
    raceView.dispose();
    raceView = null;
  }
  race = null;
}

function startRace({ timeTrial = false } = {}) {
  if (!ownsCar(profile, state.carId)) {
    hud.setStatus("Buy this car first");
    audio.ui("error");
    return;
  }
  audio.ensure();
  disposeShowroom();
  disposeRace();

  race = createRace({
    eventType: timeTrial ? "timeattack" : state.eventType,
    carId: state.carId,
    difficulty: state.difficulty,
    upgrades: carUpgrades(profile, state.carId),
    timeTrial,
  });
  raceView = createRaceView(renderCtx, race);
  hud.bindPath(race.path);
  hud.setLive(true);
  hud.setStatus(race.event.objective);
  hud.pushMessage(`${race.event.name} · ${race.track.name}`, "info", 2.4);
  audio.setCar(CARS[state.carId]);
  menus.hideMenu();
  menus.hideResults();
  menus.hidePause();
  state.mode = "race";
  state.paused = false;
  state.lastSectorTime = 0;
  accumulator = 0;
}

function quitToGarage() {
  if (race && race.phase !== "finished") retireRace(race);
  menus.hidePause();
  menus.hideResults();
  enterShowroom();
  hud.setStatus("Garage");
}

/* ------------------------------------------------------------- purchases -- */

function selectCar(carId) {
  state.carId = carId;
  profile.selectedCar = carId;
  saveProfile(profile);
  if (showroom) showroom.setCar(CARS[carId]);
  audio.ui("click");
  menus.renderGarage();
  menus.renderUpgrades();
  menus.updateSpec();
  hud.setStatus(`${CARS[carId].brand} ${CARS[carId].model}`);
}

function selectEvent(eventId) {
  state.eventType = eventId;
  audio.ui("click");
  menus.renderEvents();
  menus.updateSpec();
  hud.setStatus(EVENTS[eventId].objective);
}

function purchaseCar(carId) {
  const outcome = buyCar(profile, carId);
  if (!outcome.ok) {
    audio.ui("error");
    hud.setStatus(outcome.reason === "insufficient-funds" ? "Not enough cash" : "Unavailable");
    return;
  }
  audio.ui("buy");
  saveProfile(profile);
  hud.setStatus(`${CARS[carId].brand} ${CARS[carId].model} delivered`);
  selectCar(carId);
  menus.renderAll();
}

function purchaseUpgrade(partId) {
  const outcome = buyUpgrade(profile, state.carId, partId);
  if (!outcome.ok) {
    audio.ui("error");
    hud.setStatus(outcome.reason === "insufficient-funds" ? "Not enough cash" : "Already fitted");
    return;
  }
  audio.ui("buy");
  saveProfile(profile);
  hud.setStatus(`${outcome.name} fitted`);
  menus.renderUpgrades();
  menus.updateCareer();
  menus.updateSpec();
  if (showroom) showroom.setCar(CARS[state.carId]);
}

/* ---------------------------------------------------------------- chrome -- */

function cycleCamera() {
  state.cameraMode = (state.cameraMode + 1) % CAMERA_MODES.length;
  hud.setStatus(`Camera: ${CAMERA_MODES[state.cameraMode]}`);
  updateChips();
}

function togglePause(force) {
  if (state.mode !== "race" || race.phase === "finished") return;
  state.paused = force ?? !state.paused;
  if (state.paused) menus.showPause(`${race.event.name} · ${race.track.name}`);
  else menus.hidePause();
}

function updateChips() {
  const chips = document.querySelectorAll("[data-setting]");
  for (const chip of chips) {
    switch (chip.dataset.setting) {
      case "camera":
        chip.textContent = `Camera: ${CAMERA_MODES[state.cameraMode]}`;
        break;
      case "assist":
        chip.textContent = `Assists: ${state.assist ? "On" : "Off"}`;
        chip.classList.toggle("is-on", state.assist);
        break;
      case "audio":
        chip.textContent = `Audio: ${state.muted ? "Off" : "On"}`;
        chip.classList.toggle("is-on", !state.muted);
        break;
      case "quality":
        chip.textContent = `Quality: ${renderCtx.tier}`;
        break;
      default:
        break;
    }
  }
  document.getElementById("assistToggle").classList.toggle("is-on", state.assist);
  document.getElementById("muteToggle").classList.toggle("is-on", !state.muted);
  document.getElementById("photoToggle").classList.toggle("is-on", state.photo);
}

function bindChrome() {
  document.getElementById("startRace").addEventListener("click", () => startRace({ timeTrial: false }));
  document.getElementById("timeTrial").addEventListener("click", () => startRace({ timeTrial: true }));
  document.getElementById("resumeRace").addEventListener("click", () => togglePause(false));
  document.getElementById("restartRace").addEventListener("click", () => startRace({ timeTrial: race?.solo }));
  document.getElementById("quitRace").addEventListener("click", quitToGarage);
  document.getElementById("nextRace").addEventListener("click", () => startRace({ timeTrial: race?.solo }));
  document.getElementById("backGarage").addEventListener("click", quitToGarage);
  document.getElementById("cameraToggle").addEventListener("click", cycleCamera);
  document.getElementById("assistToggle").addEventListener("click", () => {
    state.assist = !state.assist;
    updateChips();
    hud.setStatus(`Assists ${state.assist ? "on" : "off"}`);
  });
  document.getElementById("muteToggle").addEventListener("click", () => {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    updateChips();
  });
  document.getElementById("photoToggle").addEventListener("click", togglePhoto);

  document.querySelectorAll("[data-setting]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const setting = chip.dataset.setting;
      if (setting === "camera") cycleCamera();
      if (setting === "assist") state.assist = !state.assist;
      if (setting === "audio") {
        state.muted = !state.muted;
        audio.setMuted(state.muted);
      }
      if (setting === "quality") {
        const order = ["ultra", "high", "medium", "mobile"];
        const next = order[(order.indexOf(renderCtx.tier) + 1) % order.length];
        renderCtx.applyTier(next);
        resize();
      }
      updateChips();
    });
  });

  input.on("pause", () => togglePause());
  input.on("restart", () => {
    if (state.mode === "race") startRace({ timeTrial: race?.solo });
  });
  input.on("camera", cycleCamera);
  input.on("mute", () => {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    updateChips();
  });
  input.on("photo", togglePhoto);

  // The audio context may only start from a gesture.
  const unlock = () => audio.ensure();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  updateChips();
}

function togglePhoto() {
  if (state.mode !== "race") return;
  state.photo = !state.photo;
  hud.setPhotoMode(state.photo);
  if (state.photo) state.cameraMode = CAMERA_MODES.indexOf("cinematic");
  updateChips();
}

/* ------------------------------------------------------------------ loop -- */

function handleRaceEvents(events) {
  for (const event of events) {
    switch (event.type) {
      case "message":
        hud.pushMessage(event.text, event.kind, event.duration);
        break;
      case "countdown":
        hud.setCountdown(event.label);
        audio.countdown(event.value === 0);
        if (event.value === 0) setTimeout(() => hud.setCountdown(null), 700);
        break;
      case "start":
        hud.setCountdown(null);
        break;
      case "shift":
        audio.shift();
        state.boostFlash = 0.55;
        break;
      case "impact":
        audio.impact(event.strength);
        raceView?.addShake(0.35 + event.strength * 0.7);
        if (raceView) {
          const pose = snapshot(race).player;
          raceView.emit("spark", { x: pose.x, y: pose.y + 0.3, z: pose.z }, Math.round(6 + event.strength * 14));
        }
        break;
      case "nearmiss":
        audio.nearMiss();
        break;
      case "evaded":
        audio.nitro();
        break;
      case "lap":
        audio.ui("buy");
        break;
      case "sector": {
        const delta = hud.recordSector(event.index, event.time - state.lastSectorTime);
        state.lastSectorTime = event.time;
        hud.showDelta(delta);
        break;
      }
      case "gate":
        audio.ui(event.hit ? "buy" : "error");
        break;
      case "finish":
        completeRace(event.result);
        break;
      default:
        break;
    }
  }
}

function completeRace(result) {
  const event = EVENTS[race.eventType];
  const base = calculateEventReward(event, result);
  const scale = DIFFICULTY[state.difficulty].reward;
  const reward = {
    cash: Math.round((base.cash * scale) / 50) * 50,
    rep: Math.round((base.rep * scale) / 10) * 10,
    stars: base.stars,
  };
  applyEventReward(profile, { eventType: race.eventType, carId: state.carId, reward, result });
  saveProfile(profile);
  hud.setLive(false);
  menus.showResults({ event, result, reward, difficulty: state.difficulty });
  menus.updateCareer();
  audio.update({ paused: true });
}

function stepRace(dt) {
  const controls = input.sample(dt);
  controls.assist = state.assist;
  if (state.paused || race.phase === "finished") {
    audio.update({ paused: true });
    return;
  }

  accumulator += dt;
  let steps = 0;
  const collected = [];
  while (accumulator >= FIXED_STEP && steps < MAX_STEPS) {
    collected.push(...updateRace(race, controls, FIXED_STEP));
    accumulator -= FIXED_STEP;
    steps += 1;
  }
  if (steps === MAX_STEPS) accumulator = 0;
  handleRaceEvents(collected);
}

function presentRace(dt) {
  const snap = snapshot(race);
  const player = race.player.state;
  const slip = Math.abs(player.slipRear) + player.wheelSpin * 0.4;
  const nitro = input.controls.nitro && player.nitro > 0 && player.speed > 8 ? 1 : 0;
  state.boostFlash = Math.max(0, state.boostFlash - dt * 2.6);

  raceView.update(snap, {
    cameraMode: CAMERA_MODES[state.cameraMode],
    steer: input.controls.steer,
    brake: input.controls.brake,
    nitro,
    boostFlash: state.boostFlash,
    slip,
    wet: race.track.weather === "wet" || race.track.weather === "storm",
    headlights: true,
    time: state.time,
  }, dt);

  const speedRatio = clamp(player.speed / 92, 0, 1.1);
  renderCtx.setEffects({
    speed: speedRatio * 0.35,
    blur: clamp(speedRatio ** 2 * 1.15 + nitro * 0.35, 0, 1.5),
    flash: clamp(race.pursuit.flash * 0.6 + race.pursuit.pressure * 0.25, 0, 1),
    bloom: nitro * 0.25,
  });

  if (!state.photo) hud.update(race, snap, { drawMap: true }, dt);

  audio.update({
    rpm: player.rpm,
    redline: CARS[state.carId].sim.redline,
    load: input.controls.throttle,
    speed: player.speed,
    slip: clamp(slip - 0.12, 0, 1),
    nitro,
    pursuit: race.pursuit.active ? clamp(race.pursuit.pressure + 0.25, 0, 1) : 0,
    paused: state.paused,
  });
}

function frame(now) {
  const rawDelta = (now - lastFrame) / 1000;
  lastFrame = now;
  const dt = clamp(rawDelta, 0, 0.05);
  state.time += dt;

  if (state.mode === "showroom" && showroom) {
    showroom.update(dt, state.time);
    renderCtx.setEffects({ speed: 0, blur: 0.06, flash: 0 });
  } else if (state.mode === "race" && race) {
    stepRace(dt);
    presentRace(dt);
  }

  const downgraded = renderCtx.monitor(rawDelta);
  if (downgraded) {
    hud.setStatus(`Quality: ${downgraded}`);
    updateChips();
  }

  renderCtx.render();
  requestAnimationFrame(frame);
}

/** The rival driver model applied to the player's car - demo laps and headless verification. */
function autopilotControls() {
  const car = race.player.state;
  const lookahead = clamp(7 + car.speed * 0.52, 11, 46);
  const line = race.path.sample(car.s).racingLine;
  const steer = steerToTarget(car, race.player.spec, race.path, line, lookahead);
  const target = planTargetSpeed(race.path, car.s, race.player.spec, race.weatherGrip, 1);
  return { steer, ...paceControls(car.speed, target), nitro: false, assist: true };
}

/* ----------------------------------------------------------------- debug -- */

function exposeDebugSurface() {
  window.__nightline = {
    state,
    THREE,
    get profile() {
      return profile;
    },
    get race() {
      return race;
    },
    get renderer() {
      return renderCtx;
    },
    get tier() {
      return renderCtx?.tier;
    },
    get tracks() {
      return TRACKS;
    },
    startRace,
    quitToGarage,
    selectCar,
    selectEvent,
    purchaseCar,
    purchaseUpgrade,
    snapshot: () => (race ? snapshot(race) : null),
    input,
    /**
     * Non-blank check for the tests: read the framebuffer from inside an animation frame, which is
     * the only point the drawing buffer is guaranteed to still hold the frame we just drew.
     */
    sampleFrame() {
      return new Promise((done) => {
        requestAnimationFrame(() => {
          const gl = renderCtx.renderer.getContext();
          const width = gl.drawingBufferWidth;
          const height = gl.drawingBufferHeight;
          const pixels = new Uint8Array(width * height * 4);
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let lit = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 24) lit += 1;
          }
          done({ width, height, ratio: lit / (width * height) });
        });
      });
    },
    /**
     * Step the simulation without waiting for real time.
     *
     * Used to verify a full race on a machine that only renders a few frames a second, and to drive
     * the car from the same AI the rivals use (`{ autopilot: true }`), which is how the smoke test
     * completes a lap without a human at the keyboard.
     */
    advance(seconds, overrides = {}) {
      if (!race) return null;
      const steps = Math.min(60000, Math.round(seconds / FIXED_STEP));
      const { autopilot, ...manual } = overrides;
      const collected = [];
      for (let i = 0; i < steps; i += 1) {
        const controls = autopilot
          ? autopilotControls()
          : { ...input.controls, assist: state.assist, ...manual };
        collected.push(...updateRace(race, controls, FIXED_STEP));
        if (race.phase === "finished") break;
      }
      handleRaceEvents(collected);
      return { steps, phase: race.phase, distance: race.player.progress };
    },
  };
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot);
  else boot();
}
