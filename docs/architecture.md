# Nightline Racer Architecture

## Runtime

The game is a static web app: `index.html` loads `src/styles.css` and `src/game.js`. There is no build step and no runtime service beyond optional static hosting from `tools/server.mjs`.

## Rendering

`src/game.js` renders a pseudo-3D road into one primary Canvas. Track segments are projected from world space into screen space each frame, then drawn back-to-front with fog and clipped scenery. The main pass also draws wet-road sheen, an assistive racing line, headlight sweep, speed streaks, nitro bloom, gantries, curve chevrons, and opponent proximity arrows. Separate small canvases render the speedometer and minimap so the HUD remains crisp and independent from the racing viewport.

## Simulation

The simulation state is held in a single `state` object. A fixed maximum frame delta prevents large time jumps after tab suspension. The player car uses speed, lateral offset, drift, nitro, countdown launch state, slipstream strength, combo, projected gear, grip load, corner severity, and grip modifiers. Car data is roster-driven: each real-model reference carries class, engine, drivetrain, horsepower, launch time, weight, top speed, handling, boost, grip, and body-profile metadata. Rivals move along the same track loop and perform lane changes at intervals. Collisions, near misses, and drafting compare track distance and lateral spacing. The pursuit layer tracks heat, pressure, evasion progress, police chase cars, and roadblocks; heat rises from high-risk driving and police contact, while clean high-speed gaps can escape a pursuit for style bonuses.

## UX

The first screen is the garage/race setup over a live rendered track. The garage is generated from the car roster and exposes model grade, performance class, power, 0-100 km/h, top speed, and drivetrain. The HUD is always present during driving, with pause and finish panels layered above it. Style score, combo, nitro, draft, heat, evasion, gear, grip, and apex telemetry are updated from simulation state. Mobile touch controls are CSS-driven and activate at narrow viewport widths. Settings toggles update the active game state immediately.

## Verification

The smoke test uses a real browser through Puppeteer when available. It records screenshots under `output/playwright`, samples canvas pixels to catch blank rendering, verifies the racecraft and pursuit HUD, waits through countdown, simulates keyboard driving input, checks the slipstream and pursuit-pressure helpers, and verifies mobile controls.
