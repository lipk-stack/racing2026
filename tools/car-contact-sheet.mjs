/**
 * Car contact sheet.
 *
 * Boots the game headlessly, puts every car in the roster on the showroom turntable and photographs
 * it from the same three angles, writing the results to `output/cars/`. This is the review loop for
 * the body blueprints: a silhouette that is wrong is obvious in the side elevation and invisible in
 * a spec sheet.
 *
 *   node tools/car-contact-sheet.mjs [carId ...]
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outputDir = resolve(root, "output", "cars");
const port = Number(process.env.SHEET_PORT || 4191);
const require = createRequire(import.meta.url);

// The showroom seats the car nose-along -X, so the azimuths below give a true side elevation and
// a front and rear three-quarter.
const VIEWS = [
  { name: "side", azimuth: Math.PI / 2, elevation: 0.05, radius: 7.4, fov: 36, target: 0.66 },
  { name: "hero", azimuth: Math.PI * 0.74, elevation: 0.2, radius: 6.6, fov: 40, target: 0.62 },
  { name: "rear", azimuth: Math.PI * 0.26, elevation: 0.19, radius: 6.6, fov: 40, target: 0.62 },
];

function wait(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (browsers && existsSync(browsers)) {
    for (const entry of readdirSync(browsers)) {
      for (const relative of ["chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-win/chrome.exe"]) {
        const candidate = join(browsers, entry, relative);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return ["/usr/bin/google-chrome", "/usr/bin/chromium", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"]
    .find((candidate) => existsSync(candidate));
}

const server = spawn(process.execPath, ["tools/server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

async function main() {
  await mkdir(outputDir, { recursive: true });
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) break;
    } catch {
      await wait(250);
    }
  }

  const { chromium } = require("playwright-core");
  const browser = await chromium.launch({
    executablePath: findBrowser(),
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
  page.on("pageerror", (error) => console.error("[page error]", String(error).slice(0, 300)));
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.__nightline?.showroom), null, { timeout: 40000 });

  // Hide the menu chrome so the sheet shows the car and nothing else.
  await page.evaluate(() => {
    for (const selector of ["#menuPanel", "#statusLine", "#bootPanel", ".hud", ".quick-settings"]) {
      const element = document.querySelector(selector);
      if (element) element.style.display = "none";
    }
    // Studio conditions: the showroom's dramatic rim lighting sells the car in the menu but hides
    // the surfaces, and a contact sheet exists to judge surfaces.
    const api = window.__nightline;
    api.renderer.bloomPass.strength = 0.08;
    api.renderer.renderer.toneMappingExposure = 1.05;
    // A mid-grey cyclorama: a dark cabin on a light body vanishes against a night sky, and the
    // point of a contact sheet is to see the silhouette.
    api.renderer.scene.background = new api.THREE.Color(0x39414a);
    api.renderer.scene.fog = null;
    api.renderer.scene.traverse((child) => {
      if (child.geometry?.type === "RingGeometry") child.visible = false;
      if (child.isPointLight) child.intensity *= 0.25;
      if (child.isSpotLight) {
        child.intensity *= 1.5;
        child.angle = 1.1;
        child.penumbra = 0.9;
      }
      if (child.isHemisphereLight) child.intensity = 1.1;
    });
  });

  const requested = process.argv.slice(2);
  const cars = await page.evaluate(() => Object.keys(window.__nightline.cars));
  const roster = requested.length ? requested : cars;

  for (const carId of roster) {
    await page.evaluate((id) => window.__nightline.selectCar(id), carId);
    for (const view of VIEWS) {
      await page.evaluate((pose) => window.__nightline.showroom.setPose(pose), view);
      await wait(1100);
      await page.screenshot({ path: resolve(outputDir, `${carId}-${view.name}.png`) });
    }
    const stats = await page.evaluate(() => window.__nightline.modelStats());
    console.log(`${carId.padEnd(20)} ${String(stats.triangles).padStart(6)} tris  ${stats.meshes} meshes`);
  }

  await page.evaluate(() => window.__nightline.showroom.setPose(null));
  await browser.close();
  console.log(`\nContact sheet written to ${outputDir}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => server.kill());
