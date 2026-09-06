# Nightline Racer Architecture

## Runtime

A static web app with no build step: `index.html` declares an import map pointing `three` and
`three/addons/` at the vendored copy in `src/vendor/three/`, then loads `src/main.js` as a module.
`tools/server.mjs` serves it locally; there is no other runtime service and no network dependency.

## Module layout

```
src/main.js                 mode machine, fixed-step loop, event wiring, debug surface
src/game.js                 barrel of the pure, DOM-free modules (used by the tests)

src/data/                   cars, tracks, events, upgrade parts - all data, no behaviour
src/sim/                    the game, minus any way to see it
  vehicle.js                tyre model, load transfer, drivetrain, one integration step
  trackpath.js              spline -> arc-length sampled Frenet table
  ai.js                     rival driver model (path tracker + speed planner)
  pursuit.js                heat, pressure, evasion, chase units
  race.js                   laps, sectors, positions, style economy, contract objectives
src/game/                   career profile, economy, formatting
src/engine/                 renderer + post chain, procedural textures, audio, input
src/world/                  track meshes, car models, environment, race view, showroom
src/ui/                     HUD and menus (DOM only)
```

The dependency direction is one way: `ui` and `world` read `sim` and `data`; `sim` never imports
anything that touches the DOM or three.js. That is what lets `npm test` exercise the whole
simulation - including a full race - without a canvas.

## Simulation

The car is a single-track ("bicycle") model solved in **curvilinear track coordinates**: distance
along the racing surface, lateral offset from the centreline, and a yaw angle relative to the track
tangent. Lap counting, AI, pursuit and the minimap all become trivial in that frame while the model
still produces real slip angles, weight transfer and drift.

Each step computes vertical load (mass plus downforce, shifted fore/aft by the previous frame's
longitudinal acceleration), slip angles at both axles, lateral forces from a simplified Pacejka
curve that peaks near six degrees and falls away gently, engine torque through the current gear,
and a drive force limited by whatever grip the driven axle is not already using laterally. Forces
integrate into speed, lateral velocity and yaw rate, which map back into the track frame. Surface
grip depends on where the car is across the road and on the weather; barriers apply an impulse
rather than a teleport.

Rivals and police run the *same* `stepVehicle` - only their controls differ. A Stanley-style path
tracker with an understeer feed-forward steers toward the racing line, and a lookahead planner sets
a target speed from the tightest corner it can see and how hard the car can brake to reach it.
Bounded rubber-banding keeps a race alive without making the result meaningless.

`race.js` owns the state and returns a list of events - shifts, impacts, near misses, laps, sectors,
gates, finish - which `main.js` turns into audio, camera shake, particles, HUD messages and the
career payout. `snapshot()` converts the simulation into world poses so nothing else needs to know
about the coordinate system.

## Rendering

`engine/renderer.js` builds a WebGL2 renderer with ACES filmic tone mapping, soft shadow maps and an
`EffectComposer` chain of bloom, a combined speed-blur/chromatic-aberration/vignette pass driven by
how fast the car feels, and SMAA. Four quality tiers control pixel ratio, shadows, bloom, blur
samples and draw distance; a frame-time monitor drops a tier rather than let the game stutter.

There are no binary assets. `engine/textures.js` paints asphalt and its normal map, kerbs, barriers,
lit tower windows, neon signage, the particle sprite and the sky into offscreen canvases at boot;
the sky doubles as the environment map, so car paint reflects the same city the player is driving
through. Lane markings are built as geometry rather than painted into the road texture - at the
grazing angles a racing camera looks from, painted lines disappear into the mip chain.

`world/carmodel.js` lofts every car from its own dimensions and body profile: a lower body shell, a
glass cabin, roof panel, wheels with brake discs that glow under braking, lights, a spoiler and an
underglow plane. The same model is used in the race, in the showroom and for the police.

## Interface

The garage is a window onto the showroom: the roster and the spec rail hug the screen edges and the
selected car turns on a lit plinth between them, rendered by the same renderer that runs the race.
Buying a car or fitting a part updates the profile and re-renders, so career state lives in exactly
one place. The HUD draws its rev counter and minimap into their own small canvases so the racing
viewport is never shared.

## Verification

`npm test` runs the pure logic in Node. `npm run smoke` drives the real game in a real browser
(playwright-core, playwright or puppeteer, with Chromium discovered from the environment or the
usual desktop paths), reads the framebuffer inside an animation frame to prove the scene is not
blank, exercises the garage economy, drives with the keyboard, visits every circuit, finishes a race
and writes screenshots to `output/playwright`. Because a software renderer may only manage a couple
of frames a second, the test waits on the loop having ticked rather than on wall-clock delays, and
uses the debug surface's `advance()` to step the simulation - including an autopilot that drives the
player's car with the rival driver model.
