import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outputDir = resolve(root, "output", "playwright");
const port = 4188;
const require = createRequire(import.meta.url);
const server = spawn(process.execPath, ["tools/server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
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

  const puppeteer = loadPuppeteer();
  const executablePath = findBrowserExecutable();

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: resolve(outputDir, "desktop.png"), fullPage: true });

  const desktop = await page.evaluate(() => {
    const canvas = document.querySelector("#gameCanvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlank = 0;
    for (let i = 0; i < sample.length; i += 4) {
      if (sample[i] + sample[i + 1] + sample[i + 2] > 24) nonBlank += 1;
    }
    return {
      title: document.querySelector("h1")?.textContent,
      garageCards: document.querySelectorAll(".garage-card").length,
      eventCards: document.querySelectorAll(".event-card").length,
      driverLevel: document.querySelector("#driverLevel")?.textContent,
      driverCash: document.querySelector("#driverCash")?.textContent,
      selectedModel: document.querySelector("#selectedModel")?.textContent,
      hudModules: document.querySelectorAll(".hud-module").length,
      telemetryItems: document.querySelectorAll(".telemetry-strip strong").length,
      countdown: Boolean(document.querySelector("#countdown")),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      nonBlankRatio: nonBlank / (sample.length / 4),
    };
  });

  await page.click("#startRace");
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Space");
  await wait(3700);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Space");
  await page.keyboard.up("ArrowUp");
  await page.screenshot({ path: resolve(outputDir, "race.png"), fullPage: true });
  const afterDrive = await page.evaluate(() => ({
    speed: window.__nightline.state.speed,
    position: window.__nightline.state.position,
    mode: window.__nightline.state.mode,
    startPanelVisible: document.querySelector("#startPanel")?.classList.contains("is-visible"),
    countdown: window.__nightline.state.countdown,
    gear: document.querySelector("#gearValue")?.textContent,
    grip: document.querySelector("#gripValue")?.textContent,
    apex: document.querySelector("#apexValue")?.textContent,
    heat: document.querySelector("#heatValue")?.textContent,
    evade: document.querySelector("#evadeValue")?.textContent,
    eventType: window.__nightline.state.eventType,
    totalLaps: window.__nightline.state.totalLaps,
    slipstreamHelper: window.__nightline.calculateSlipstream(180, 0.08),
    pursuitPressureHelper: window.__nightline.calculatePursuitPressure(120, 0.12, 4),
  }));

  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await wait(250);
  await page.screenshot({ path: resolve(outputDir, "mobile.png"), fullPage: true });
  const mobile = await page.evaluate(() => {
    const touchPad = getComputedStyle(document.querySelector(".touch-pad")).display;
    return { touchPad };
  });

  await browser.close();

  const result = { desktop, afterDrive, mobile };
  await writeFile(resolve(outputDir, "smoke-result.json"), JSON.stringify(result, null, 2));

  if (desktop.nonBlankRatio < 0.35) throw new Error("Canvas appears too blank");
  if (desktop.garageCards < 8 || !desktop.selectedModel?.includes("Porsche")) {
    throw new Error("Prestige garage did not render");
  }
  if (desktop.eventCards < 5 || desktop.driverLevel !== "1" || !desktop.driverCash?.startsWith("$")) {
    throw new Error("Career event hub did not render");
  }
  if (desktop.hudModules < 6 || desktop.telemetryItems < 3 || !desktop.countdown) {
    throw new Error("Racecraft HUD did not render");
  }
  if (afterDrive.mode !== "race" || afterDrive.speed <= 40 || afterDrive.position <= 0) {
    throw new Error("Driving interaction did not advance the race");
  }
  if (afterDrive.startPanelVisible) throw new Error("Start overlay stayed visible after race start");
  if (!afterDrive.gear || !afterDrive.grip?.endsWith("%") || !afterDrive.apex) {
    throw new Error("Telemetry HUD did not update");
  }
  if (!afterDrive.heat || !afterDrive.evade) {
    throw new Error("Pursuit HUD did not render");
  }
  if (afterDrive.eventType !== "circuit" || afterDrive.totalLaps !== 3) {
    throw new Error("Event state did not initialize");
  }
  if (afterDrive.countdown !== 0 || afterDrive.slipstreamHelper <= 0.45 || afterDrive.pursuitPressureHelper <= 0.75) {
    throw new Error("Countdown, slipstream, or pursuit helper failed");
  }
  if (mobile.touchPad !== "grid") throw new Error("Mobile touch controls were not visible");

  console.log("Smoke checks passed");
  console.log(JSON.stringify(result, null, 2));
}

function loadPuppeteer() {
  const candidates = [
    "puppeteer",
    "puppeteer-core",
    resolve(root, "..", "ProPM", "node_modules", "puppeteer"),
    resolve(root, "..", "ProPM", "node_modules", "puppeteer-core"),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next local candidate.
    }
  }
  throw new Error("Puppeteer is not available locally");
}

function findBrowserExecutable() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
  });
