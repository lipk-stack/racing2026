# Racing 2026

Racing 2026 is the canonical repository for the Daily Classic Game automation. Future automation runs should use this checkout instead of the older local `daily-classic-game` prototype.

## Automation Contract

Every automation iteration should:

- Read `docs/automation-ledger.md` before planning new work.
- Add a new dated entry to `docs/automation-ledger.md` describing what changed, what was verified, and what should be considered next.
- Keep source, tests, documentation, and the ledger in this repository.
- Prefer substantial game-quality improvements over isolated cosmetic tweaks.

## Play

Open `index.html` in a browser, or run the local static server:

```powershell
npm start
```

Then open `http://127.0.0.1:4177`.

## Controls

- Arrow keys or WASD: steer, throttle, and brake
- Space or Shift: nitro
- P or Escape: pause
- R: restart
- C: camera

Touch controls appear automatically on small screens.

## Current Features

- Pseudo-3D racing road with hills, curves, rumble strips, lane markers, fog, and skyline scenery
- Prestige sports-car garage with real model/trim references across Porsche, Ferrari, Lamborghini, McLaren, Mercedes-AMG, Audi, BMW, and Nissan
- Per-car class, horsepower, 0-100 km/h, top-speed, drivetrain, engine, weight, grip, boost, and handling data
- Cruise, Street, and Pro difficulty modes
- Cinematic countdown launch, AI rivals, collision response, off-road grip loss, camera shake, sparks, and boost trails
- Slipstream drafting, near-miss style scoring, combo multiplier, race director callouts, and opponent proximity arrows
- NFS-style police pursuit layer with heat levels, chase cars, roadblocks, evasion bonuses, siren lighting, and pursuit pressure feedback
- Dynamic night sky, weather toggle, city lighting, motion particles, minimap, speedometer, lap timer, and race results
- Wet-road sheen, headlight cone, speed-line effects, nitro bloom, curve chevrons, gantries, and responsive racecraft HUD meters
- Higher-detail car silhouettes with distinct wedge, longtail, longnose, widebody, coupe, and GT body profiles
- Assistive projected racing line plus live gear, grip, and upcoming-apex telemetry for better corner setup
- Responsive HUD with desktop cockpit controls and mobile touch controls
- No network dependency and no paid APIs

## Verification

```powershell
npm test
npm run smoke
```

`npm test` checks pure game utilities. `npm run smoke` starts the local server, opens the game in a headless browser, takes desktop and mobile screenshots, verifies the canvas is nonblank, drives the car, and confirms mobile controls appear.
