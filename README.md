# Racing 2026

Racing 2026 is the canonical repository for the Daily Classic Game automation. It holds **Nightline
Racer**, a self-contained 3D arcade racing game that runs in the browser with no network calls, no
paid APIs and no build step.

## Automation Contract

Every automation iteration should:

- Read `docs/automation-ledger.md` before planning new work.
- Add a new dated entry to `docs/automation-ledger.md` describing what changed, what was verified,
  and what should be considered next.
- Keep source, tests, documentation, and the ledger in this repository.
- Prefer substantial game-quality improvements over isolated cosmetic tweaks.

## Play

```powershell
npm start
```

Then open `http://127.0.0.1:4177`.

The game is an ES module and uses an import map, so it needs to be served over HTTP - opening
`index.html` straight off the filesystem will not work.

## Controls

- Arrow keys or WASD: steer, throttle, brake
- Space or Shift: nitrous
- X or Ctrl: handbrake
- C: camera (chase, hood, bumper, cinematic)
- P or Escape: pause · R: restart · M: mute · H: photo mode
- A gamepad works if one is connected; touch controls appear automatically on small screens.

## The game

**Drive.** A single-track vehicle model solved in track-relative coordinates: a Pacejka-style tyre
curve, longitudinal load transfer, a torque curve through real gear ratios, traction-circle limited
drive, downforce, per-surface grip, handbrake and barrier impulses. Each car's final drive is solved
from its published top speed, so it reaches its spec-sheet number at the limiter in top gear.

**Four circuits.** Nightline Bay (wet harbour night), Ridge Pass (storm-lashed mountain switchbacks),
Downtown Grid (tight city blocks and sirens) and Coast Sunset (fast cliffside sweepers). Each is
lofted from an authored spline into road, kerbs, run-off, barriers, gantries and scenery, with its
own palette, weather and lighting.

**Nine contracts.** Circuit, sprint, time attack, speed trap, heat escape, drift zone, checkpoint
gauntlet, elimination and a boss race, unlocking as the driver levels up.

**A garage that spends.** Twelve real-model cars from an attainable GR Supra to a 911 Turbo S, each
rendered live on the showroom turntable. Cash and REP buy cars and eight upgrade parts - engine,
turbo, tyres, gearbox, aero, brakes, weight and nitrous - and every part feeds the physics directly.

**Police.** Heat rises from nitrous signatures, near misses, contact and leading the pack; chase
units hunt the player's line, roadblocks drop ahead, and a clean gap banks an evasion bonus.

**Presentation.** WebGL2 with filmic tone mapping, soft shadows, bloom, speed blur and SMAA over
four quality tiers that step down at runtime rather than stutter. Procedurally synthesised audio -
per-car engine harmonics tied to live RPM, turbo, tyre squeal, wind, sirens and impacts. Rev
counter, minimap, sector deltas, race-director feed and a photo mode.

## Verification

```powershell
npm install
npm test
npm run smoke
```

`npm test` covers the pure simulation, track, economy and race logic in Node (145 assertions).
`npm run smoke` drives the real game in a real browser: it proves the WebGL2 scene renders, works
the garage economy, drives with the keyboard, visits every circuit, finishes a race, and writes
screenshots to `output/playwright`.

See `docs/architecture.md` for how the modules fit together and `docs/aaa-racing-research.md` for
the benchmarks guiding the work.
