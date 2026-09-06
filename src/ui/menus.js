/**
 * Garage, contracts and results UI.
 *
 * Renders straight from the profile and the data modules - buying a car, fitting a part or
 * unlocking a contract changes the profile and re-renders, so there is no second copy of the
 * career state living in the DOM.
 */

import { CARS, CAR_IDS, calculatePerformanceIndex } from "../data/cars.js";
import { EVENTS, EVENT_IDS, DIFFICULTY } from "../data/events.js";
import { TRACKS } from "../data/tracks.js";
import { UPGRADE_PARTS, upgradeCost, upgradeProgress } from "../data/upgrades.js";
import { carPrice, carUpgrades, eventUnlocked, garageValue, ownsCar } from "../game/profile.js";
import { formatMoney, formatTime } from "../game/format.js";

const $ = (id) => document.getElementById(id);
const money = formatMoney;

export function createMenus(context) {
  const dom = {
    menu: $("menuPanel"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    panels: Array.from(document.querySelectorAll(".tab-panel")),
    garageGrid: $("garageGrid"),
    upgradeGrid: $("upgradeGrid"),
    eventGrid: $("eventGrid"),
    driverLevel: $("driverLevel"),
    driverCash: $("driverCash"),
    driverRep: $("driverRep"),
    driverWins: $("driverWins"),
    driverGarage: $("driverGarage"),
    selectedClass: $("selectedClass"),
    selectedModel: $("selectedModel"),
    selectedGrade: $("selectedGrade"),
    selectedPower: $("selectedPower"),
    selectedLaunch: $("selectedLaunch"),
    selectedTopSpeed: $("selectedTopSpeed"),
    selectedDrive: $("selectedDrive"),
    selectedWeight: $("selectedWeight"),
    selectedEngine: $("selectedEngine"),
    buildFill: $("buildFill"),
    buildValue: $("buildValue"),
    carAction: $("carAction"),
    eventSummary: $("eventSummary"),
    startRace: $("startRace"),
    timeTrial: $("timeTrial"),
    pause: $("pausePanel"),
    pauseTitle: $("pauseTitle"),
    finish: $("finishPanel"),
    finishTitle: $("finishTitle"),
    finishStars: $("finishStars"),
    resultTime: $("resultTime"),
    resultLap: $("resultLap"),
    resultPosition: $("resultPosition"),
    resultScore: $("resultScore"),
    resultEvent: $("resultEvent"),
    resultCash: $("resultCash"),
    resultRep: $("resultRep"),
    resultPeak: $("resultPeak"),
    resultStars: $("resultStars"),
  };

  const state = context.state;

  function renderGarage() {
    const profile = context.profile();
    dom.garageGrid.innerHTML = "";
    for (const id of CAR_IDS) {
      const car = CARS[id];
      const owned = ownsCar(profile, id);
      const price = carPrice(profile, id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `garage-card${id === state.carId ? " is-selected" : ""}${owned ? "" : " is-locked"}`;
      button.dataset.car = id;
      button.innerHTML = `
        <span class="swatch" style="color:${car.color}"></span>
        <strong>${car.brand} ${car.model}</strong>
        <small>${car.grade}<br>${car.powerHp} hp · ${car.drivetrain} · ${car.zeroTo100.toFixed(1)}s</small>
        <em>${car.className} · ${calculatePerformanceIndex(car)}</em>
        <span class="card-tag ${owned ? "owned" : "locked"}">${owned ? "Owned" : money(price)}</span>
      `;
      dom.garageGrid.appendChild(button);
    }
  }

  function renderUpgrades() {
    const profile = context.profile();
    const upgrades = carUpgrades(profile, state.carId);
    const owned = ownsCar(profile, state.carId);
    dom.upgradeGrid.innerHTML = "";
    for (const part of UPGRADE_PARTS) {
      const level = Math.min(Number(upgrades[part.id]) || 0, part.levels.length);
      const cost = upgradeCost(part.id, level);
      const card = document.createElement("div");
      card.className = "upgrade-card";
      const levelPips = part.levels
        .map((_, index) => `<i class="${index < level ? "is-on" : ""}"></i>`)
        .join("");
      const label = cost === null
        ? "Fully built"
        : !owned
          ? "Buy the car first"
          : profile.cash < cost
            ? `Need ${money(cost)}`
            : `Fit ${part.levels[level].name} · ${money(cost)}`;
      card.innerHTML = `
        <strong>${part.name}</strong>
        <small>${part.blurb}</small>
        <div class="levels">${levelPips}</div>
        <button class="buy-button" data-part="${part.id}" type="button" ${cost === null || !owned || profile.cash < cost ? "disabled" : ""}>${label}</button>
      `;
      dom.upgradeGrid.appendChild(card);
    }
  }

  function renderEvents() {
    const profile = context.profile();
    dom.eventGrid.innerHTML = "";
    for (const id of EVENT_IDS) {
      const event = EVENTS[id];
      const record = profile.events[id] || {};
      const unlocked = eventUnlocked(profile, id);
      const track = TRACKS[event.track];
      const button = document.createElement("button");
      button.type = "button";
      button.className = `event-card${id === state.eventType ? " is-selected" : ""}${unlocked ? "" : " is-locked"}`;
      button.dataset.event = id;
      button.disabled = !unlocked;
      button.innerHTML = `
        <em>${event.tag} · ${track?.name || ""}</em>
        <strong>${event.name}</strong>
        <small>${event.objective}</small>
        <span class="card-tag ${unlocked ? "" : "locked"}">${
          unlocked
            ? record.bestStars
              ? `${"★".repeat(record.bestStars)}${"☆".repeat(3 - record.bestStars)}`
              : "New"
            : `LVL ${event.minLevel}`
        }</span>
        <small>${money(event.cash)} · ${event.rep} REP${record.bestLap ? ` · best ${formatTime(record.bestLap)}` : ""}</small>
      `;
      dom.eventGrid.appendChild(button);
    }
  }

  function updateCareer() {
    const profile = context.profile();
    dom.driverLevel.textContent = profile.level;
    dom.driverCash.textContent = money(profile.cash);
    dom.driverRep.textContent = profile.rep.toLocaleString("en-US");
    dom.driverWins.textContent = profile.wins.toLocaleString("en-US");
    dom.driverGarage.textContent = money(garageValue(profile));
  }

  function updateSpec() {
    const profile = context.profile();
    const car = CARS[state.carId];
    const owned = ownsCar(profile, state.carId);
    const price = carPrice(profile, state.carId);
    dom.selectedClass.textContent = `${car.className} · ${calculatePerformanceIndex(car)}`;
    dom.selectedModel.textContent = `${car.brand} ${car.model}`;
    dom.selectedGrade.textContent = car.grade;
    dom.selectedPower.textContent = `${car.powerHp} hp`;
    dom.selectedLaunch.textContent = `${car.zeroTo100.toFixed(1)}s`;
    dom.selectedTopSpeed.textContent = `${car.maxSpeed} km/h`;
    dom.selectedDrive.textContent = car.drivetrain;
    dom.selectedWeight.textContent = `${car.weightKg} kg`;
    dom.selectedEngine.textContent = car.engine;

    const progress = upgradeProgress(carUpgrades(profile, state.carId));
    dom.buildFill.style.width = `${progress}%`;
    dom.buildValue.textContent = `${progress}%`;

    dom.carAction.innerHTML = owned
      ? ""
      : `<button class="buy-button" data-buy-car="${state.carId}" type="button" ${profile.cash < price ? "disabled" : ""}>${
          profile.cash < price ? `Need ${money(price)}` : `Buy for ${money(price)}`
        }</button>`;

    const event = EVENTS[state.eventType];
    const track = TRACKS[event.track];
    dom.eventSummary.textContent = `${event.name} · ${track.name} · ${event.laps} lap${event.laps > 1 ? "s" : ""} · ${track.subtitle}`;
    dom.startRace.disabled = !owned;
    dom.startRace.textContent = owned ? "Start event" : "Locked";
  }

  function renderAll() {
    renderGarage();
    renderUpgrades();
    renderEvents();
    updateCareer();
    updateSpec();
  }

  // --- events ---------------------------------------------------------------
  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      dom.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      dom.panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tab.dataset.tab));
      context.onSound?.("click");
    });
  });

  dom.garageGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".garage-card");
    if (!card) return;
    context.onSelectCar(card.dataset.car);
  });

  dom.upgradeGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-part]");
    if (!button) return;
    context.onBuyUpgrade(button.dataset.part);
  });

  dom.carAction.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-car]");
    if (!button) return;
    context.onBuyCar(button.dataset.buyCar);
  });

  dom.eventGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".event-card");
    if (!card || card.disabled) return;
    context.onSelectEvent(card.dataset.event);
  });

  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-difficulty]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      context.onDifficulty(button.dataset.difficulty);
    });
  });

  return {
    dom,
    renderAll,
    renderGarage,
    renderUpgrades,
    renderEvents,
    updateCareer,
    updateSpec,
    showMenu() {
      dom.menu.classList.add("is-visible");
      dom.finish.classList.remove("is-visible");
      dom.pause.classList.remove("is-visible");
      renderAll();
    },
    hideMenu() {
      dom.menu.classList.remove("is-visible");
    },
    showPause(title) {
      dom.pauseTitle.textContent = title;
      dom.pause.classList.add("is-visible");
    },
    hidePause() {
      dom.pause.classList.remove("is-visible");
    },
    /** Results screen. `reward` is what the career actually banked, after difficulty scaling. */
    showResults({ event, result, reward, difficulty }) {
      const stars = `${"★".repeat(reward.stars)}${"☆".repeat(3 - reward.stars)}`;
      dom.finishTitle.textContent = reward.stars >= 3
        ? "Elite result"
        : result.solo || result.rank <= 3
          ? "Contract paid"
          : "Run complete";
      dom.finishStars.textContent = stars;
      dom.resultTime.textContent = formatTime(result.raceTime);
      dom.resultLap.textContent = formatTime(result.bestLap);
      dom.resultPosition.textContent = result.solo ? "Solo" : `${result.rank}/${result.field}`;
      dom.resultScore.textContent = Math.round(result.score).toLocaleString("en-US");
      dom.resultEvent.textContent = `${event.name} · ${DIFFICULTY[difficulty].label}`;
      dom.resultCash.textContent = money(reward.cash);
      dom.resultRep.textContent = `${reward.rep.toLocaleString("en-US")} REP`;
      dom.resultPeak.textContent = `${Math.round(result.maxSpeed)} km/h`;
      dom.resultStars.textContent = stars;
      dom.finish.classList.add("is-visible");
    },
    hideResults() {
      dom.finish.classList.remove("is-visible");
    },
  };
}
