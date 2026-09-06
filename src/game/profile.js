/**
 * Career profile and economy.
 *
 * The profile is a plain serializable object so it can be written straight to localStorage and read
 * back by a later build: unknown keys are merged, missing keys fall back to defaults. Every payout
 * and purchase goes through the pure helpers here.
 */

import { CARS, STARTER_CAR } from "../data/cars.js";
import { EVENTS } from "../data/events.js";
import { UPGRADE_PARTS, getPart, upgradeCost, upgradeValue } from "../data/upgrades.js";
import { clamp } from "../sim/vehicle.js";

export const STORAGE_KEY = "racing2026.profile";

export const PROFILE_DEFAULT = {
  cash: 25000,
  rep: 0,
  level: 1,
  wins: 0,
  events: {},
  carMastery: {},
};

export function calculateDriverLevel(rep) {
  return clamp(Math.floor(rep / 1800) + 1, 1, 99);
}

/**
 * Normalise a saved (or partial) profile into a complete one.
 * Never throws on malformed input - a corrupt save degrades to a fresh career instead of a crash.
 */
export function createProfile(seed = {}) {
  const profile = {
    ...PROFILE_DEFAULT,
    ...seed,
    events: { ...(seed.events || {}) },
    carMastery: { ...(seed.carMastery || {}) },
    owned: { ...(seed.owned || {}) },
    upgrades: { ...(seed.upgrades || {}) },
    liveries: { ...(seed.liveries || {}) },
  };
  profile.cash = Math.max(0, Number(profile.cash) || 0);
  profile.rep = Math.max(0, Number(profile.rep) || 0);
  profile.level = calculateDriverLevel(profile.rep);
  profile.wins = Math.max(0, Number(profile.wins) || 0);
  profile.owned[STARTER_CAR] = true;
  profile.selectedCar = CARS[profile.selectedCar] ? profile.selectedCar : STARTER_CAR;
  if (!profile.owned[profile.selectedCar]) profile.selectedCar = STARTER_CAR;
  for (const id of Object.keys(profile.upgrades)) {
    const parts = profile.upgrades[id] || {};
    const cleaned = {};
    for (const part of UPGRADE_PARTS) {
      const level = Math.round(Number(parts[part.id]) || 0);
      if (level > 0) cleaned[part.id] = clamp(level, 0, part.levels.length);
    }
    profile.upgrades[id] = cleaned;
  }
  return profile;
}

/**
 * Event payout.
 *
 * Rank sets the base, then each contract's own yardstick scales it: trap speed, lap time, heat
 * carried, drift banked. Style score always adds a slice, so a spectacular run pays even off the
 * podium.
 */
export function calculateEventReward(event, result) {
  const rank = result.rank || 6;
  const rankMultiplier = event.ranked ? [0, 1.35, 1.08, 0.88, 0.58, 0.42, 0.32][rank] || 0.28 : 1;
  const speedMultiplier = event.targetSpeed
    ? clamp((result.maxSpeed || 0) / event.targetSpeed, 0.45, 1.38)
    : 1;
  const lapAverage = result.laps ? (result.raceTime || 999) / result.laps : result.raceTime || 999;
  const timeMultiplier = event.targetTime
    ? clamp(event.targetTime / Math.max(1, lapAverage), 0.62, 1.32)
    : 1;
  const heatMultiplier = event.targetHeat ? 1 + clamp(result.heatLevel || 0, 0, 5) * 0.08 : 1;
  const driftMultiplier = event.targetDrift
    ? clamp((result.driftScore || 0) / event.targetDrift, 0.4, 1.45)
    : 1;
  const gateMultiplier = event.gates
    ? clamp((result.gatesHit || 0) / Math.max(1, result.gatesTotal || 1), 0.35, 1.25)
    : 1;
  const styleMultiplier = 1 + clamp((result.score || 0) / 10000, 0, 0.42);
  const combined = rankMultiplier * speedMultiplier * timeMultiplier * heatMultiplier * driftMultiplier * gateMultiplier;
  const cash = Math.round((event.cash * combined * styleMultiplier) / 50) * 50;
  const rep = Math.round((event.rep * combined + (result.score || 0) * 0.055) / 10) * 10;
  const starBasis = event.targetSpeed
    ? (result.maxSpeed || 0) / event.targetSpeed
    : event.targetTime
      ? event.targetTime / Math.max(1, lapAverage)
      : event.targetDrift
        ? (result.driftScore || 0) / event.targetDrift
        : event.gates
          ? (result.gatesHit || 0) / Math.max(1, result.gatesTotal || 1)
          : event.ranked
            ? (7 - rank) / 6
            : 0.75 + clamp((result.score || 0) / 10000, 0, 0.3);
  return {
    cash: Math.max(0, cash),
    rep: Math.max(0, rep),
    stars: clamp(Math.ceil(starBasis * 3), 1, 3),
  };
}

export function loadProfile(storage = globalThis.localStorage) {
  if (!storage) return createProfile();
  try {
    return createProfile(JSON.parse(storage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return createProfile();
  }
}

export function saveProfile(profile, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // A full or blocked storage quota must never interrupt a race.
  }
}

/** Apply a finished event to the profile: bank, rep, level, wins and the record books. */
export function applyEventReward(profile, { eventType, carId, reward, result }) {
  const event = EVENTS[eventType];
  const eventRecord = profile.events[eventType] || {};
  const carRecord = profile.carMastery[carId] || {};
  const car = CARS[carId];

  profile.cash += reward.cash;
  profile.rep += reward.rep;
  profile.level = calculateDriverLevel(profile.rep);
  if (result.rank === 1 || result.solo) profile.wins += 1;
  profile.events[eventType] = {
    ...eventRecord,
    name: event?.name || eventType,
    bestStars: Math.max(eventRecord.bestStars || 0, reward.stars),
    bestScore: Math.max(eventRecord.bestScore || 0, result.score || 0),
    bestTime: eventRecord.bestTime ? Math.min(eventRecord.bestTime, result.raceTime) : result.raceTime,
    bestLap: eventRecord.bestLap ? Math.min(eventRecord.bestLap, result.bestLap || Infinity) : result.bestLap,
    bestSpeed: Math.max(eventRecord.bestSpeed || 0, Math.round(result.maxSpeed || 0)),
  };
  if (car) {
    profile.carMastery[carId] = {
      ...carRecord,
      name: `${car.brand} ${car.model}`,
      rep: (carRecord.rep || 0) + reward.rep,
      events: (carRecord.events || 0) + 1,
    };
  }
  return profile;
}

export function ownsCar(profile, carId) {
  return Boolean(profile.owned?.[carId]);
}

export function carUpgrades(profile, carId) {
  return profile.upgrades?.[carId] || {};
}

/** Price of a car after any trade-in style discount the driver's level has earned. */
export function carPrice(profile, carId) {
  const car = CARS[carId];
  if (!car) return Infinity;
  const loyalty = clamp((profile.level - 1) * 0.004, 0, 0.08);
  return Math.round((car.price * (1 - loyalty)) / 100) * 100;
}

export function buyCar(profile, carId) {
  const car = CARS[carId];
  if (!car) return { ok: false, reason: "unknown-car" };
  if (ownsCar(profile, carId)) return { ok: false, reason: "already-owned" };
  const price = carPrice(profile, carId);
  if (profile.cash < price) return { ok: false, reason: "insufficient-funds", price };
  profile.cash -= price;
  profile.owned[carId] = true;
  return { ok: true, price };
}

export function buyUpgrade(profile, carId, partId) {
  const part = getPart(partId);
  if (!part) return { ok: false, reason: "unknown-part" };
  if (!ownsCar(profile, carId)) return { ok: false, reason: "not-owned" };
  const upgrades = profile.upgrades[carId] || (profile.upgrades[carId] = {});
  const level = Math.min(Number(upgrades[partId]) || 0, part.levels.length);
  const cost = upgradeCost(partId, level);
  if (cost === null) return { ok: false, reason: "maxed" };
  if (profile.cash < cost) return { ok: false, reason: "insufficient-funds", cost };
  profile.cash -= cost;
  upgrades[partId] = level + 1;
  return { ok: true, cost, level: level + 1, name: part.levels[level].name };
}

/** What the garage is worth - cars plus everything bolted to them. */
export function garageValue(profile) {
  let total = 0;
  for (const carId of Object.keys(profile.owned || {})) {
    if (!profile.owned[carId] || !CARS[carId]) continue;
    total += CARS[carId].price + upgradeValue(carUpgrades(profile, carId));
  }
  return total;
}

/** Contracts unlock with driver level so the calendar opens up as the career grows. */
export function eventUnlocked(profile, eventId) {
  const event = EVENTS[eventId];
  if (!event) return false;
  return profile.level >= (event.minLevel || 1);
}
