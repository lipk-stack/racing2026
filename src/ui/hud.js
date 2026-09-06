/**
 * In-race HUD.
 *
 * Reads the race and its snapshot once per frame and writes the DOM. The two canvases - the RPM
 * dial and the minimap - are drawn here too, so the racing viewport never has to share a context.
 */

import { CARS } from "../data/cars.js";
import { PURSUIT } from "../data/events.js";
import { clamp } from "../sim/vehicle.js";
import { formatDelta, formatTime } from "../game/format.js";

const $ = (id) => document.getElementById(id);

export function createHud() {
  const dom = {
    root: document.querySelector(".hud"),
    position: $("positionValue"),
    lap: $("lapValue"),
    time: $("timeValue"),
    best: $("bestValue"),
    delta: $("deltaValue"),
    deltaModule: document.querySelector(".hud-module.delta"),
    score: $("scoreValue"),
    combo: $("comboValue"),
    heat: $("heatValue"),
    evade: $("evadeValue"),
    pursuitModule: document.querySelector(".hud-module.pursuit"),
    gear: $("gearValue"),
    grip: $("gripValue"),
    gripFill: $("gripFill"),
    apex: $("apexValue"),
    drift: $("driftValue"),
    speed: $("speedValue"),
    boostFill: $("boostFill"),
    slipstreamFill: $("slipstreamFill"),
    speedCanvas: $("speedCanvas"),
    miniMap: $("miniMap"),
    countdown: $("countdown"),
    feed: $("directorFeed"),
    status: $("statusLine"),
    objective: $("objectiveBar"),
    objectiveLabel: $("objectiveLabel"),
    objectiveValue: $("objectiveValue"),
    quickSettings: document.querySelector(".quick-settings"),
  };

  const speedCtx = dom.speedCanvas.getContext("2d");
  const mapCtx = dom.miniMap.getContext("2d");
  const messages = [];
  let mapPoints = null;
  let mapBounds = null;
  let bestSectors = [];

  /** Precompute the minimap polyline for a circuit, normalised into the canvas box. */
  function bindPath(path) {
    const bounds = path.bounds();
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    const span = Math.max(width, depth) || 1;
    mapBounds = { ...bounds, span };
    mapPoints = [];
    for (let i = 0; i < path.count; i += 4) {
      mapPoints.push(project(path.x[i], path.z[i]));
    }
    bestSectors = [];
  }

  function project(x, z) {
    const pad = 0.1;
    const u = (x - mapBounds.minX) / mapBounds.span;
    const v = (z - mapBounds.minZ) / mapBounds.span;
    return [pad + u * (1 - pad * 2), pad + v * (1 - pad * 2)];
  }

  function fitCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width || 1, height: rect.height || 1 };
  }

  /** Rev counter: a sweep of ticks, a filled arc, a redline zone and the current gear. */
  function drawTacho(rpm, redline, gear, nitro) {
    const { width, height } = fitCanvas(dom.speedCanvas, speedCtx);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;
    const start = Math.PI * 0.76;
    const sweep = Math.PI * 1.48;
    speedCtx.clearRect(0, 0, width, height);

    speedCtx.lineWidth = Math.max(6, width * 0.05);
    speedCtx.lineCap = "round";
    speedCtx.strokeStyle = "rgba(255,255,255,0.12)";
    speedCtx.beginPath();
    speedCtx.arc(cx, cy, radius, start, start + sweep);
    speedCtx.stroke();

    // Redline zone.
    speedCtx.strokeStyle = "rgba(255,62,62,0.4)";
    speedCtx.beginPath();
    speedCtx.arc(cx, cy, radius, start + sweep * 0.86, start + sweep);
    speedCtx.stroke();

    const ratio = clamp(rpm / redline, 0, 1.02);
    const gradient = speedCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#00d8ff");
    gradient.addColorStop(0.62, "#6eff7a");
    gradient.addColorStop(1, "#ff3e3e");
    speedCtx.strokeStyle = gradient;
    speedCtx.beginPath();
    speedCtx.arc(cx, cy, radius, start, start + sweep * ratio);
    speedCtx.stroke();

    // Nitro ring inside the dial.
    speedCtx.lineWidth = Math.max(3, width * 0.018);
    speedCtx.strokeStyle = "rgba(176,123,255,0.75)";
    speedCtx.beginPath();
    speedCtx.arc(cx, cy, radius * 0.82, start, start + sweep * clamp(nitro / 100, 0, 1));
    speedCtx.stroke();

    speedCtx.fillStyle = ratio > 0.92 ? "#ff3e3e" : "rgba(246,243,234,0.9)";
    speedCtx.font = `700 ${Math.round(width * 0.16)}px Inter, system-ui, sans-serif`;
    speedCtx.textAlign = "center";
    speedCtx.textBaseline = "middle";
    speedCtx.fillText(gear, cx, cy + radius * 0.62);
  }

  function drawMinimap(race, snapshot) {
    if (!mapPoints) return;
    const { width, height } = fitCanvas(dom.miniMap, mapCtx);
    mapCtx.clearRect(0, 0, width, height);
    const toScreen = ([u, v]) => [u * width, v * height];

    mapCtx.strokeStyle = "rgba(255,255,255,0.26)";
    mapCtx.lineWidth = Math.max(3, width * 0.032);
    mapCtx.lineJoin = "round";
    mapCtx.beginPath();
    mapPoints.forEach((point, index) => {
      const [x, y] = toScreen(point);
      if (index === 0) mapCtx.moveTo(x, y);
      else mapCtx.lineTo(x, y);
    });
    mapCtx.closePath();
    mapCtx.stroke();

    const dot = (worldX, worldZ, color, size) => {
      const [x, y] = toScreen(project(worldX, worldZ));
      mapCtx.fillStyle = color;
      mapCtx.beginPath();
      mapCtx.arc(x, y, size, 0, Math.PI * 2);
      mapCtx.fill();
    };

    for (const rival of snapshot.rivals) dot(rival.x, rival.z, rival.color, width * 0.018);
    for (const unit of snapshot.police) dot(unit.x, unit.z, unit.kind === "roadblock" ? "#ffd166" : "#ff3e3e", width * 0.022);
    dot(snapshot.player.x, snapshot.player.z, CARS[race.player.carId].accent, width * 0.028);
  }

  function pushMessage(text, kind = "info", duration = 1.4) {
    const element = document.createElement("p");
    element.textContent = text;
    element.className = kind;
    dom.feed.appendChild(element);
    messages.push({ element, life: duration });
    while (messages.length > 3) {
      const oldest = messages.shift();
      oldest.element.remove();
    }
  }

  function tickMessages(dt) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      messages[i].life -= dt;
      if (messages[i].life <= 0) {
        messages[i].element.remove();
        messages.splice(i, 1);
      }
    }
  }

  return {
    dom,
    bindPath,
    pushMessage,
    setLive(live) {
      dom.root.classList.toggle("is-live", live);
      dom.quickSettings.classList.toggle("is-live", live);
    },
    setPhotoMode(on) {
      dom.root.classList.toggle("is-photo", on);
      dom.quickSettings.classList.toggle("is-live", !on);
    },
    setStatus(text) {
      dom.status.textContent = text;
    },
    setCountdown(label) {
      if (label === null) {
        dom.countdown.classList.remove("is-visible");
        return;
      }
      dom.countdown.textContent = label;
      dom.countdown.classList.remove("is-visible");
      void dom.countdown.offsetWidth;
      dom.countdown.classList.add("is-visible");
    },
    recordSector(index, time) {
      const best = bestSectors[index];
      const delta = best === undefined ? 0 : time - best;
      if (best === undefined || time < best) bestSectors[index] = time;
      return delta;
    },
    showDelta(delta) {
      dom.delta.textContent = formatDelta(delta);
      dom.deltaModule.classList.toggle("is-fast", delta < 0);
      dom.deltaModule.classList.toggle("is-slow", delta > 0);
    },
    /** One frame of HUD. `extras` carries values the race does not own, like the assist state. */
    update(race, snapshot, extras, dt) {
      const car = CARS[race.player.carId];
      const state = race.player.state;
      const speedKmh = state.speed * 3.6;

      dom.position.textContent = race.solo ? "TT" : `${race.rank}`;
      dom.lap.textContent = `${Math.min(race.player.lap, race.totalLaps)}/${race.totalLaps}`;
      dom.time.textContent = formatTime(race.raceTime);
      dom.best.textContent = formatTime(race.player.bestLap);
      dom.score.textContent = Math.round(race.score).toLocaleString("en-US");
      dom.combo.textContent = `x${race.combo.toFixed(1)}`;
      dom.heat.textContent = `${race.pursuit.level}`;
      dom.evade.textContent = race.pursuit.active
        ? `${Math.round((race.pursuit.evadeProgress / PURSUIT.evadeSeconds) * 100)}%`
        : race.pursuit.level
          ? "WATCH"
          : "CLEAR";
      dom.pursuitModule.classList.toggle("is-hot", race.pursuit.active || race.pursuit.flash > 0.1);

      dom.gear.textContent = state.speed < 0.6 ? "N" : String(state.gear + 1);
      const gripPercent = Math.round(clamp(1 - state.gripUsage / 1.15, 0, 1) * 100);
      dom.grip.textContent = `${gripPercent}%`;
      dom.gripFill.style.width = `${gripPercent}%`;
      const ahead = race.path.sample(state.s + 45).curvature;
      dom.apex.textContent = Math.abs(ahead) < 0.0018 ? "OPEN" : ahead > 0 ? "LEFT" : "RIGHT";
      dom.drift.textContent = Math.round(race.driftScore).toLocaleString("en-US");
      dom.speed.textContent = Math.round(speedKmh);
      dom.boostFill.style.width = `${clamp(state.nitro, 0, 100)}%`;
      dom.slipstreamFill.style.width = `${Math.round(race.slipstream * 100)}%`;

      if (race.event.gates) {
        dom.objective.hidden = false;
        dom.objectiveLabel.textContent = `GATES ${race.gatesHit}/${race.gates.length}`;
        dom.objectiveValue.textContent = race.gateClock.toFixed(1);
      } else if (race.event.targetSpeed) {
        dom.objective.hidden = false;
        dom.objectiveLabel.textContent = "TRAP TARGET";
        dom.objectiveValue.textContent = `${Math.round(race.maxSpeed)} / ${race.event.targetSpeed}`;
      } else if (race.event.targetDrift) {
        dom.objective.hidden = false;
        dom.objectiveLabel.textContent = "DRIFT TARGET";
        dom.objectiveValue.textContent = `${Math.round(race.driftScore)} / ${race.event.targetDrift}`;
      } else {
        dom.objective.hidden = true;
      }

      drawTacho(state.rpm, car.sim.redline, state.speed < 0.6 ? "N" : String(state.gear + 1), state.nitro);
      if (extras?.drawMap !== false) drawMinimap(race, snapshot);
      tickMessages(dt);
    },
  };
}
