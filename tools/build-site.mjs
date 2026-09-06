/**
 * Build the deployable site.
 *
 * The game needs no compilation - it is ES modules and an import map - so this only assembles the
 * publishable subset into `dist/`: the page and `src/` (which carries the vendored Three.js). Tests,
 * tools, docs and `node_modules` stay out of the deploy.
 *
 *   node tools/build-site.mjs
 */

import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

/** Everything the browser actually loads, and nothing else. */
const CONTENTS = ["index.html", "src"];

async function measure(directory) {
  let bytes = 0;
  let files = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await measure(path);
      bytes += nested.bytes;
      files += nested.files;
    } else {
      bytes += (await stat(path)).size;
      files += 1;
    }
  }
  return { bytes, files };
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const item of CONTENTS) {
  await cp(resolve(root, item), resolve(dist, item), { recursive: true });
}

const { bytes, files } = await measure(dist);
console.log(`dist/ built: ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
