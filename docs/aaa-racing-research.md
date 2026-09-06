# AAA Racing Game Research Notes

Research dates: 2026-06-17 (console benchmarks), 2026-09-06 (AI-built browser games)

## Benchmarks

### Console and PC racing

- Need for Speed Unbound: street-racing events, takeovers, heat/police pressure, garage-based
  banking, car upgrades, engine swaps, and drift/grip handling direction.
- Need for Speed Heat: day/night risk-reward structure, cash/REP split, high-heat pursuits,
  roadblocks, spike-strip style escalation, and event activities such as speed traps and drift zones.
- Forza Horizon 5: broad event map, campaign progression, large car collection, extensive
  tuning/livery systems, weather/biome variety, and high-fidelity automotive presentation.
- Current 2026 racing-market coverage: genre leaders are judged on handling quality, visual
  fidelity, progression depth, car roster breadth, event variety, and customization.

### Browser games people are showing off from GPT-6 Astra

The bar for an AI-built game moved in September 2026, and the showcase builds are the reference for
what "best quality" now means for a browser racer:

- A Mario Kart-style racer built with **Three.js**, running entirely in the browser: six cars, four
  themed tracks, close overtakes, collisions, comeback moments, and currency collected while racing
  and spent in a garage on parts and upgrades.
  <https://x.com/DeryaTR_/status/2095945186643710171>
- Launch-week builds across kart racers, FPS maps, WebGL shader cities, procedural oceans and
  walkable 3D environments.
  <https://pasqualepillitteri.it/en/news/14472/gpt-6-astra-10-wild-builds>
- Reviews of playable games generated from a single prompt, and of the model driving Three.js,
  Godot and Blender directly.
  <https://www.stork.ai/blog/astra-built-a-game-you-can-play-it-now> ·
  <https://openai.com/index/gpt-6-astra/> ·
  <https://www.mindstudio.ai/blog/gpt6-astra-release-overview>

Distilled bar: **one click to a lit, post-processed 3D world; a car that transfers weight and
slides; audio that reacts to the drivetrain; several distinct places to race; and a loop that pays
out into upgrades you can see.**

## Coding Standards To Apply Iteratively

- Keep core mechanics testable with pure helpers for reward math, physics modifiers, scoring, and
  progression - and keep the simulation free of the DOM and the renderer so a whole race can be run
  headlessly in a test.
- Keep race state explicit and serializable so persistence, future saves, and telemetry can be added
  cleanly.
- Favor data-driven events, cars, tracks and tuning over hard-coded menu branches.
- Verify every iteration with logic tests plus a real browser smoke test and screenshot review.
- Make each feature playable in the first screen rather than hiding it behind marketing copy.

## Current Implementation Response

The 2026-09-06 revamp rebuilds the game against the Astra bar:

- Real 3D on vendored Three.js: WebGL2, filmic tone mapping, soft shadows, bloom, speed blur and
  SMAA, across four quality tiers that step down at runtime.
- A single-track vehicle model with a Pacejka-style tyre curve, load transfer, a torque curve
  through real gear ratios, traction-circle limited drive, downforce and surface grip.
- Four authored circuits with their own palette, weather, lighting and scenery.
- Twelve cars, each lofted procedurally from its own dimensions and shown live on a garage
  turntable; eight upgrade parts that feed the physics; cash and REP that finally spend.
- Nine contracts including drift zones, checkpoint gates, elimination and a boss race.
- Fully synthesised audio: per-car engine harmonics on live RPM, turbo, tyre squeal, wind, sirens.
- Rivals that run the same physics as the player, so overtakes and comebacks are earned.

## Next Standards Gap

- Livery and paint customisation, including wraps and rim colour, saved per car.
- Damage and repair economy, with visible panel deformation.
- Car-to-car collision geometry rather than a single-point impulse.
- Ghost laps and a persistent per-track leaderboard, plus a replay camera.
- Traffic on the city circuits, distinct from the rival field.
- Engine swaps and a dyno screen showing the torque curve a build actually produces.
