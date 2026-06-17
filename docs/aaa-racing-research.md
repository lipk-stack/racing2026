# AAA Racing Game Research Notes

Research date: 2026-06-17

## Benchmarks

- Need for Speed Unbound: street-racing events, takeovers, heat/police pressure, garage-based banking, car upgrades, engine swaps, and drift/grip handling direction.
- Need for Speed Heat: day/night risk-reward structure, cash/REP split, high-heat pursuits, roadblocks, spike-strip style escalation, and event activities such as speed traps and drift zones.
- Forza Horizon 5: broad event map, campaign progression, large car collection, extensive tuning/livery systems, weather/biome variety, and high-fidelity automotive presentation.
- Current 2026 racing-market coverage: genre leaders are judged on handling quality, visual fidelity, progression depth, car roster breadth, event variety, and customization.

## Coding Standards To Apply Iteratively

- Keep core mechanics testable with pure helpers for reward math, physics modifiers, scoring, and progression.
- Keep race state explicit and serializable so persistence, future saves, and telemetry can be added cleanly.
- Favor data-driven events, cars, and tuning over hard-coded menu branches.
- Verify every iteration with logic tests plus a real browser smoke test and screenshot review.
- Make each feature playable in the first screen rather than hiding it behind marketing copy.

## Current Implementation Response

The 2026-06-17 career/event enhancement adds:

- Data-driven event contracts: circuit, sprint, time attack, speed trap, and heat escape.
- Driver profile with bank, REP, level, wins, per-event records, and per-car mastery.
- Reward calculation based on event type, rank, peak speed, time, heat risk, and style score.
- Persistent browser-local profile storage.
- Real browser smoke coverage for career hub rendering and event initialization.

## Next Standards Gap

- Add garage showroom and rotating car preview.
- Add car-specific engine audio profiles and layered turbo/gear effects.
- Add upgrade/tuning sliders for grip/drift, nitro, tires, gearbox, and aero.
- Add damage and repair economy inspired by high-stakes racing loops.
- Add richer event goals: drift zones, checkpoint gates, speed zones, elimination timers, pursuit escape-only finish, and boss contracts.
