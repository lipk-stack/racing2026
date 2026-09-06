# Automation Ledger

This file is the repo-local memory for the Daily Classic Game automation. Read it before each iteration, then append a new entry before finishing the run.

## Operating Rules

- Canonical repository: `C:\Users\lmkho\Documents\Git\racing2026`
- Previous prototype source: `C:\Users\lmkho\Documents\Git\daily-classic-game`
- Keep implementation, tests, screenshots, docs, and this ledger in this repository going forward.
- Each iteration should record:
  - date and run objective
  - changes completed
  - verification commands and results
  - recommended next additions

## Iteration History

### 2026-09-06 - Astra-Tier 3D Revamp

Objective: Rebuild Nightline Racer to the quality bar set by the best browser games people are
showing off from GPT-6 Astra - real 3D on Three.js, cars that transfer weight and slide, drivetrain
audio, several distinct circuits, and a payout loop that buys upgrades you can see.

Completed:

- Vendored Three.js 0.185.1 (`src/vendor/three/`) plus only the postprocessing, shader and
  geometry-utils addons in use; `index.html` resolves them through an import map, so the game stays
  offline and build-free.
- Replaced the pseudo-3D canvas renderer with a WebGL2 scene: ACES tone mapping, soft shadows, and a
  post chain of bloom, a combined speed-blur/aberration/vignette pass and SMAA, across four quality
  tiers that step down at runtime instead of stuttering.
- Replaced the arcade speed model with a single-track vehicle model in curvilinear track
  coordinates: Pacejka-style tyre curve peaking near six degrees of slip, longitudinal load
  transfer, torque curve through real gear ratios, traction-circle limited drive, downforce,
  per-surface grip, handbrake and barrier impulses. Final drive is solved from each car's published
  top speed, so every car hits its spec-sheet number at the limiter in top gear.
- Added four authored circuits (Nightline Bay, Ridge Pass, Downtown Grid, Coast Sunset), each lofted
  from a closed spline into road, geometry lane markings, kerbs, run-off, barriers, gantries and
  instanced scenery, with its own palette, weather and lighting.
- Grew the roster to twelve cars with simulation, body and audio parameters, each lofted
  procedurally and shown live on a garage turntable; added eight upgrade parts that feed the physics
  and a career economy that spends cash on cars and parts.
- Grew the contract list to nine: circuit, sprint, time attack, speed trap, heat escape, drift zone,
  checkpoint gauntlet, elimination and a boss race, unlocking by driver level.
- Rivals and police now run the same physics as the player through a Stanley path tracker and a
  lookahead speed planner, with bounded rubber-banding.
- Replaced the single-oscillator engine drone with synthesised per-car audio: engine harmonics on
  live RPM, turbo spool, blow-off, tyre squeal, wind, sirens, impacts and UI.
- Rebuilt the shell: the garage is now a window onto the showroom, with a rev counter, minimap,
  sector deltas, objective bar, race-director feed, four camera rigs and a photo mode.

Verification:

- `npm test` passed - grown from 27 to 145 assertions covering the tyre and chassis model,
  drivetrain, an acceleration integration against published 0-100 and top-speed figures, all four
  circuits, the driver model, pursuit, scoring, upgrades, the career economy and a complete race.
- `npm run smoke` passed - drives the real game in a real browser, proves the WebGL2 scene renders
  by reading the framebuffer, works the garage economy, drives with the keyboard, visits every
  circuit, finishes a race for its payout, and checks the mobile layout. Screenshots under
  `output/playwright`.
- Screenshots reviewed at each step; this is what caught the cars rendering nose-backwards, the sky
  sphere clipping against the far plane, lane markings vanishing into the mip chain, and the camera
  panning from the world origin at the start of a race.

Next additions to consider:

- Livery and paint customisation saved per car.
- Damage and repair economy with visible panel deformation.
- Ghost laps, per-track leaderboards and a replay camera.
- Ambient traffic on the city circuits, distinct from the rival field.
- Engine swaps and a dyno screen showing the torque curve a build actually produces.

### 2026-06-17 - Career Event Hub

Objective: Move closer to AAA/EA-style racing standards by adding progression, event variety, and persistent reward loops after researching current racing-game benchmarks.

Completed:

- Added `docs/aaa-racing-research.md` with benchmark notes from Need for Speed, Forza Horizon, and current 2026 racing-market coverage.
- Added data-driven event contracts: Apex Circuit, Bayline Sprint, Precision Time Attack, Speed Trap Chain, and Heat Escape.
- Added browser-local driver profile persistence with bank, REP, level, wins, event records, and per-car mastery.
- Added event reward math for rank, speed trap peak speed, time attack pace, heat risk, and style score.
- Added a career strip and event playlist to the setup screen.
- Expanded finish results with event name, cash, REP, peak speed, and star rating.
- Expanded logic and browser smoke tests to cover event/progression behavior.

Verification:

- `npm test` passed.
- `npm run smoke` passed.
- Screenshot review found and fixed desktop setup crowding by moving the setup screen into a two-column cockpit layout.

Next additions to consider:

- Add rotating garage showroom previews and a photo mode.
- Add car-specific engine audio profiles and layered turbo, exhaust, and gear effects.
- Add upgrade/tuning sliders for tires, aero, nitro, gearbox, and drift/grip bias.
- Add damage, repair costs, and high-stakes event consequences.

### 2026-06-17 - Canonical Repo Published

Objective: Make the cloned GitHub repository the persisted source of truth for future automation runs.

Completed:

- Committed the migrated baseline on `main`.
- Pushed `main` to `origin` at `https://github.com/lipk-stack/racing2026.git`.
- Confirmed generated smoke artifacts are ignored by `.gitignore` so future test runs do not dirty the working tree with screenshots.

Verification:

- Prior to publishing, `npm test` passed.
- Prior to publishing, `npm run smoke` passed.

Next additions to consider:

- Start the next enhancement from this repo and read this ledger first.
- Add a visual garage showroom mode with larger rotating car render previews.
- Add car-specific audio profiles for flat-six, V6 hybrid, V10, and twin-turbo V8 engines.

### 2026-06-17 - Prototype Baseline Migrated

Objective: Preserve the current playable browser racing game in the new GitHub-backed repository.

Completed:

- Cloned `https://github.com/lipk-stack/racing2026.git` into `C:\Users\lmkho\Documents\Git\racing2026`.
- Migrated the latest playable local prototype into this repo: `index.html`, `src/`, `tests/`, `tools/`, `docs/`, and `package.json`.
- Replaced the placeholder README with a project README that declares this repo as the canonical automation target.
- Added this automation ledger so future runs can track completed enhancements and planned additions in-repo.

Verification:

- `npm test` passed in `C:\Users\lmkho\Documents\Git\racing2026`.
- `npm run smoke` passed in `C:\Users\lmkho\Documents\Git\racing2026`.
- Smoke output and screenshots were generated under `output/playwright`.

Next additions to consider:

- Push the migrated baseline to `main` if it has not already been pushed.
- Add a visual garage showroom mode with larger rotating car render previews.
- Add car-specific audio profiles for flat-six, V6 hybrid, V10, and twin-turbo V8 engines.

### 2026-06-17 - Local Prototype Enhancements Already Included

Objective: Capture the enhancement history from the prior local `daily-classic-game` prototype now migrated here.

Completed:

- Built a self-contained Canvas arcade racer with pseudo-3D road projection, AI rivals, boost, drifting, lap timing, minimap, weather, HUD, mobile touch controls, and browser smoke tests.
- Added an NFS-style police pursuit layer with heat levels, chase cars, roadblocks, pursuit pressure, evasion bonuses, siren lighting, police minimap dots, and proximity warnings.
- Added a prestige sports-car garage with real model/trim references: Porsche 911 Turbo S, Ferrari 296 GTB, Lamborghini Huracan STO, McLaren 765LT, Mercedes-AMG GT Black Series, Audi R8 V10 Performance, BMW M4 CSL, and Nissan GT-R NISMO.
- Added per-car specs and handling data: class, engine, drivetrain, horsepower, 0-100 km/h, top speed, weight, grip, boost, handling, color, and body profile.
- Upgraded vehicle rendering with distinct high-detail silhouettes for GT, berlinetta, wedge, longtail, longnose, coupe, and widebody profiles.
- Tightened mobile garage layout after screenshot review.

Verification from local prototype:

- `npm test` passed.
- `npm run smoke` passed.
- Browser screenshots were generated under the prior prototype's `output/playwright` folder.

Next additions to consider:

- Port screenshots into this repo's own smoke output after running `npm run smoke` here.
- Add in-game progression: unlock classes, garage sorting, car mastery, and event types.
- Add adult, high-definition presentation upgrades: cinematic pre-race camera, lighting presets, richer asphalt texture, reflections, motion blur tuning, and a photo mode.
- Add race modes inspired by modern arcade racers: sprint, circuit, time attack, pursuit escape, speed trap, and elimination.
