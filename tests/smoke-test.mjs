/**
 * Browser smoke test.
 *
 * Boots the real game in a real browser, proves the WebGL 2 scene renders, drives the car with the
 * keyboard, exercises the garage economy, and visits every circuit - then writes screenshots to
 * `output/playwright` for review.
 *
 * Driver resolution is deliberately forgiving: playwright-core (the dev dependency), playwright,
 * or a puppeteer that happens to be installed, with the Chromium binary discovered from the
 * environment or from the usual desktop install paths.
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outputDir = resolve(root, "output", "playwright");
const port = Number(process.env.SMOKE_PORT || 4188);
const require = createRequire(import.meta.url);

// Software rendering still has to produce a real GL context in headless CI.
const CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--enable-webgl",
  "--ignore-gpu-blocklist",
  "--disable-dev-shm-usage",
];

function wait(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

/**
 * Poll a predicate in the page. Frames can take seconds on a software renderer - notably the first
 * one after a circuit is built - so anything that depends on the loop having ticked waits for it.
 */
async function waitFor(session, fn, { timeout = 30000, interval = 400 } = {}) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await session.evaluate(fn);
    if (last) return last;
    await wait(interval);
  }
  return last;
}

function loadDriver() {
  for (const name of ["playwright-core", "playwright"]) {
    try {
      return { kind: "playwright", module: require(name), name };
    } catch {
      // Try the next candidate.
    }
  }
  const puppeteerCandidates = [
    "puppeteer",
    "puppeteer-core",
    resolve(root, "..", "ProPM", "node_modules", "puppeteer"),
    resolve(root, "..", "ProPM", "node_modules", "puppeteer-core"),
  ];
  for (const name of puppeteerCandidates) {
    try {
      return { kind: "puppeteer", module: require(name), name };
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("No browser driver found. Run `npm install` to fetch playwright-core.");
}

/** Find a Chromium/Chrome binary: the bundled browser cache first, then desktop installs. */
function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (browsersPath && existsSync(browsersPath)) {
    for (const entry of readdirSync(browsersPath)) {
      for (const relative of ["chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-win/chrome.exe"]) {
        const candidate = join(browsersPath, entry, relative);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  const installed = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return installed.find((candidate) => existsSync(candidate));
}

async function launch() {
  const driver = loadDriver();
  const executablePath = findBrowser();
  if (driver.kind === "playwright") {
    const browser = await driver.module.chromium.launch({ executablePath, args: CHROMIUM_ARGS });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    return {
      driver: driver.name,
      browser,
      page,
      goto: (url) => page.goto(url, { waitUntil: "load" }),
      evaluate: (fn, arg) => page.evaluate(fn, arg),
      screenshot: (path) => page.screenshot({ path }),
      click: (selector) => page.click(selector),
      keyDown: (key) => page.keyboard.down(key),
      keyUp: (key) => page.keyboard.up(key),
      setViewport: (size) => page.setViewportSize(size),
      logs: [],
      close: () => browser.close(),
    };
  }
  const browser = await driver.module.launch({ headless: "new", executablePath, args: CHROMIUM_ARGS });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  return {
    driver: driver.name,
    browser,
    page,
    goto: (url) => page.goto(url, { waitUntil: "load" }),
    evaluate: (fn, arg) => page.evaluate(fn, arg),
    screenshot: (path) => page.screenshot({ path }),
    click: (selector) => page.click(selector),
    keyDown: (key) => page.keyboard.down(key),
    keyUp: (key) => page.keyboard.up(key),
    setViewport: (size) => page.setViewport({ ...size, deviceScaleFactor: 1 }),
    logs: [],
    close: () => browser.close(),
  };
}

const failures = [];
function check(name, condition, detail = "") {
  if (!condition) failures.push(`${name}${detail ? ` (${detail})` : ""}`);
}

const server = spawn(process.execPath, ["tools/server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}`);
      if (response.ok) return;
    } catch {
      await wait(250);
    }
  }
  throw new Error("Static server did not start");
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await waitForServer();

  const session = await launch();
  const consoleErrors = [];
  session.page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  session.page.on("pageerror", (error) => consoleErrors.push(String(error)));

  await session.goto(`http://127.0.0.1:${port}`);
  await waitFor(session, () => Boolean(window.__nightline) || null, { timeout: 20000 });
  await waitFor(session, () => (window.__nightline.state.time > 0.05 ? true : null), { timeout: 20000 });

  // --- boot and showroom ----------------------------------------------------
  const boot = await session.evaluate(async () => {
    const canvas = document.querySelector("#gameCanvas");
    return {
      title: document.querySelector("h1")?.textContent,
      webgl2: Boolean(canvas.getContext("webgl2")),
      tier: window.__nightline.tier,
      garageCards: document.querySelectorAll(".garage-card").length,
      eventCards: document.querySelectorAll(".event-card").length,
      upgradeCards: document.querySelectorAll(".upgrade-card").length,
      driverLevel: document.querySelector("#driverLevel")?.textContent,
      driverCash: document.querySelector("#driverCash")?.textContent,
      selectedModel: document.querySelector("#selectedModel")?.textContent,
      menuVisible: document.querySelector("#menuPanel")?.classList.contains("is-visible"),
      bootDone: document.querySelector("#bootPanel")?.classList.contains("is-done"),
      fallbackVisible: document.querySelector("#fallbackPanel")?.classList.contains("is-visible"),
      frame: await window.__nightline.sampleFrame(),
    };
  });
  await session.screenshot(resolve(outputDir, "garage.png"));

  check("page renders its title", boot.title === "Nightline Racer", boot.title);
  check("WebGL 2 context is live", boot.webgl2 && !boot.fallbackVisible);
  check("boot overlay clears", boot.bootDone);
  check("garage lists the roster", boot.garageCards >= 12, `${boot.garageCards} cards`);
  check("contracts are listed", boot.eventCards >= 9, `${boot.eventCards} events`);
  check("upgrade shop is stocked", boot.upgradeCards >= 8, `${boot.upgradeCards} parts`);
  check("career strip is populated", boot.driverLevel === "1" && boot.driverCash?.startsWith("$"));
  check("showroom names the selected car", Boolean(boot.selectedModel));
  check("showroom renders a lit scene", boot.frame.ratio > 0.25, `lit ratio ${boot.frame.ratio.toFixed(3)}`);

  // --- economy --------------------------------------------------------------
  const economy = await session.evaluate(() => {
    const api = window.__nightline;
    const before = api.profile.cash;
    api.purchaseUpgrade("brakes");
    const afterUpgrade = api.profile.cash;
    api.profile.cash = 900000;
    api.purchaseCar("nissangtr");
    const owned = Boolean(api.profile.owned.nissangtr);
    const afterCar = api.profile.cash;
    api.selectCar("nissangtr");
    return {
      before,
      afterUpgrade,
      afterCar,
      owned,
      upgradeLevel: api.profile.upgrades.toyotasupra?.brakes || 0,
      selected: document.querySelector("#selectedModel")?.textContent,
      buildValue: document.querySelector("#buildValue")?.textContent,
    };
  });
  check("fitting a part debits the bank", economy.afterUpgrade < economy.before, `${economy.before} -> ${economy.afterUpgrade}`);
  check("fitting a part is recorded", economy.upgradeLevel === 1);
  check("buying a car debits the bank", economy.afterCar < 900000);
  check("buying a car grants ownership", economy.owned);
  check("selecting a car updates the showroom", economy.selected?.includes("GT-R"));

  // --- race -----------------------------------------------------------------
  await session.evaluate(() => window.__nightline.selectCar("toyotasupra"));
  await session.click("#startRace");
  await waitFor(session, () => (window.__nightline.race ? true : null));
  const gridState = await session.evaluate(() => ({
    phase: window.__nightline.race?.phase,
    menuVisible: document.querySelector("#menuPanel")?.classList.contains("is-visible"),
    hudLive: document.querySelector(".hud")?.classList.contains("is-live"),
    track: window.__nightline.race?.track?.name,
  }));
  check("starting an event hides the garage", !gridState.menuVisible);
  check("the HUD comes live", gridState.hudLive);
  check("the race starts on the grid", gridState.phase === "countdown" || gridState.phase === "racing");

  // Real keyboard input, then fast-forward the simulation: a software renderer manages only a few
  // frames a second, so waiting out a lap in real time would take minutes.
  await session.keyDown("ArrowUp");
  await session.keyDown("ArrowRight");
  const keyboard = await waitFor(session, () => {
    const controls = window.__nightline.input.controls;
    return controls.throttle === 1 && controls.steer > 0.1 ? { ...controls } : null;
  }) || await session.evaluate(() => ({ ...window.__nightline.input.controls }));
  await session.keyUp("ArrowRight");
  await session.keyDown("Space");
  await wait(600);
  const drivenBurst = await session.evaluate(() => {
    window.__nightline.advance(4);
    return window.__nightline.advance(8, { autopilot: true });
  });
  await session.keyUp("Space");
  await wait(700);
  check("keys reach the controls", keyboard.throttle === 1 && keyboard.steer > 0.1, JSON.stringify(keyboard));
  await session.screenshot(resolve(outputDir, "race.png"));
  await session.keyUp("ArrowUp");

  const driving = await session.evaluate(async () => {
    const api = window.__nightline;
    const race = api.race;
    return {
      phase: race.phase,
      speed: race.player.state.speed * 3.6,
      distance: race.player.progress,
      rpm: race.player.state.rpm,
      gear: race.player.state.gear,
      rank: race.rank,
      rivals: race.rivals.length,
      rivalMoved: race.rivals.some((rival) => rival.progress > -5),
      hudSpeed: Number(document.querySelector("#speedValue")?.textContent),
      hudGear: document.querySelector("#gearValue")?.textContent,
      hudGrip: document.querySelector("#gripValue")?.textContent,
      hudApex: document.querySelector("#apexValue")?.textContent,
      hudHeat: document.querySelector("#heatValue")?.textContent,
      hudEvade: document.querySelector("#evadeValue")?.textContent,
      hudTime: document.querySelector("#timeValue")?.textContent,
      frame: await api.sampleFrame(),
      poses: api.snapshot(),
    };
  });
  check("the fast-forward stepped the simulation", drivenBurst.steps > 100, JSON.stringify(drivenBurst));
  check("the car is racing", driving.phase === "racing", driving.phase);
  check("driving accelerates the car", driving.speed > 60, `${driving.speed.toFixed(0)} km/h`);
  check("driving covers ground", driving.distance > 120, `${driving.distance.toFixed(0)} m`);
  check("the engine is turning", driving.rpm > 1200 && driving.gear >= 1);
  check("rivals race too", driving.rivalMoved);
  check("the HUD mirrors the simulation", Math.abs(driving.hudSpeed - driving.speed) < 40, `${driving.hudSpeed} vs ${driving.speed.toFixed(0)}`);
  check("telemetry reads out", driving.hudGrip?.endsWith("%") && Boolean(driving.hudApex) && Boolean(driving.hudGear));
  check("pursuit HUD is present", Boolean(driving.hudHeat) && Boolean(driving.hudEvade));
  check("the lap clock runs", driving.hudTime !== "0:00.000");
  check("the race viewport is not blank", driving.frame.ratio > 0.3, `lit ratio ${driving.frame.ratio.toFixed(3)}`);
  check("rivals are on track", driving.poses.rivals.length >= 4);
  check("world poses are finite", Number.isFinite(driving.poses.player.x) && Number.isFinite(driving.poses.player.y));

  // --- cameras, pause, photo mode ------------------------------------------
  const chrome = await session.evaluate(async () => {
    const api = window.__nightline;
    const modes = [];
    for (let i = 0; i < 4; i += 1) {
      document.querySelector("#cameraToggle").click();
      modes.push(api.state.cameraMode);
    }
    document.querySelector("#photoToggle").click();
    const photo = document.querySelector(".hud").classList.contains("is-photo");
    document.querySelector("#photoToggle").click();
    return { modes, photo, tier: api.tier };
  });
  check("every camera can be selected", new Set(chrome.modes).size === 4);
  check("photo mode hides the HUD", chrome.photo);

  // --- every circuit --------------------------------------------------------
  const circuits = [];
  for (const [eventId, file] of [["sprint", "downtown"], ["timeattack", "ridge"], ["speedtrap", "coast"]]) {
    const info = await session.evaluate(async (id) => {
      const api = window.__nightline;
      api.quitToGarage();
      api.profile.rep = 40000;
      api.profile.level = 12;
      api.selectEvent(id);
      api.startRace({ timeTrial: false });
      api.advance(7, { autopilot: true });
      return {
        track: api.race?.track?.name,
        weather: api.race?.track?.weather,
        ratio: (await api.sampleFrame()).ratio,
        rivals: api.race?.rivals.length,
        speed: api.race.player.state.speed * 3.6,
      };
    }, eventId);
    await wait(500);
    await session.screenshot(resolve(outputDir, `track-${file}.png`));
    circuits.push({ eventId, ...info });
    check(`${info.track} renders`, info.ratio > 0.25, `lit ratio ${info.ratio?.toFixed(3)}`);
  }
  check("each contract loads its own circuit", new Set(circuits.map((c) => c.track)).size === 3, circuits.map((c) => c.track).join(", "));

  // --- finishing ------------------------------------------------------------
  const finish = await session.evaluate(async () => {
    const api = window.__nightline;
    api.quitToGarage();
    api.selectEvent("timeattack");
    api.startRace({ timeTrial: true });
    const cashBefore = api.profile.cash;
    // Drive the whole lap in the simulation: countdown, laps, finish and payout for real.
    let guard = 0;
    while (api.race.phase !== "finished" && guard < 40) {
      api.advance(10, { autopilot: true });
      guard += 1;
    }
    return {
      cashBefore,
      cashAfter: api.profile.cash,
      phase: api.race?.phase,
      laps: api.race?.player.lap,
      finishVisible: document.querySelector("#finishPanel")?.classList.contains("is-visible"),
      stars: document.querySelector("#finishStars")?.textContent,
      resultTime: document.querySelector("#resultTime")?.textContent,
      resultPosition: document.querySelector("#resultPosition")?.textContent,
    };
  });
  check("a finished race shows results", finish.finishVisible, `phase ${finish.phase}`);
  check("the results report a lap time", /\d:\d\d\./.test(finish.resultTime || ""), finish.resultTime);
  check("results award a rating", /[★☆]{3}/.test(finish.stars || ""));
  check("finishing pays the driver", finish.cashAfter > finish.cashBefore, `${finish.cashBefore} -> ${finish.cashAfter}`);
  await session.screenshot(resolve(outputDir, "results.png"));

  // --- mobile ---------------------------------------------------------------
  await session.evaluate(() => window.__nightline.quitToGarage());
  await session.setViewport({ width: 390, height: 844 });
  await wait(600);
  const mobile = await session.evaluate(() => ({
    touchPad: getComputedStyle(document.querySelector(".touch-pad")).display,
    menuColumns: getComputedStyle(document.querySelector(".menu-body")).gridTemplateColumns.split(" ").length,
  }));
  await session.screenshot(resolve(outputDir, "mobile.png"));
  check("mobile touch controls appear", mobile.touchPad === "grid", mobile.touchPad);
  check("the garage collapses to one column", mobile.menuColumns === 1, `${mobile.menuColumns} columns`);

  const fatalErrors = consoleErrors.filter((text) => !/Failed to load resource|favicon/i.test(text));
  check("no runtime errors were logged", fatalErrors.length === 0, fatalErrors.slice(0, 3).join(" | "));

  const result = { driver: session.driver, boot, economy, driving: { ...driving, poses: undefined }, chrome, circuits, finish, mobile, consoleErrors: fatalErrors };
  await writeFile(resolve(outputDir, "smoke-result.json"), JSON.stringify(result, null, 2));
  await session.close();

  if (failures.length) {
    console.error(`\n${failures.length} smoke checks failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Smoke checks passed (driver: ${session.driver}, tier: ${boot.tier})`);
  console.log(`Screenshots written to ${outputDir}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
  });
