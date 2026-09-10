/**
 * Blueprint bridge.
 *
 * `src/data/carbodies.js` is the one place the car dimensions and profile curves live, and the
 * game imports it directly. The Blender modelling scripts are Python, so this dumps the resolved
 * blueprints to JSON for them to read - deriving the data rather than restating it, so a change
 * to a profile curve reaches the mesh without anyone remembering to copy it across.
 *
 *   node tools/blender/dump_blueprints.mjs [carId ...] > reference/blueprints.json
 */

import { BODY_IDS, carBlueprint } from "../../src/data/carbodies.js";

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : BODY_IDS;

const unknown = ids.filter((id) => !BODY_IDS.includes(id));
if (unknown.length) {
  console.error(`No blueprint for: ${unknown.join(", ")}`);
  process.exit(1);
}

const out = {};
for (const id of ids) out[id] = carBlueprint(id);
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
