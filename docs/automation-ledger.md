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
