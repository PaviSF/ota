import fs from "node:fs";
import path from "node:path";

const MARKERS = ["app.json", "app.config.ts", "app.config.js", "app.config.mjs", "app.config.cjs"];

/** Walks up from `start` to the nearest directory that looks like an Expo project. */
export function findProjectRoot(start = process.cwd()): string | null {
  let dir = path.resolve(start);
  for (;;) {
    if (MARKERS.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
