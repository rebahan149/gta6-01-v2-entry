// CORAL KEY: HIGH TIDE — hand-in program for the make.fun gta6-01 bounty.
//
// Running `node main.ts` copies the playable game (game/) and the screenshot
// set (screenshots/) into the output directory, then asks the kit's dossier
// library to describe that output and writes the result to dossier.json.
// Node 22+ runs this .ts file directly; only the standard library is used.

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// The repository root is the directory this file lives in, wherever the
// checkout happens to sit on disk.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// The scorer tells us where the hand-in belongs; fall back to /output.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outDir, { recursive: true });

// Copy the two payload trees across, replacing whatever was there before.
for (const name of ["game", "screenshots"]) {
  cpSync(join(repoRoot, name), join(outDir, name), { recursive: true, force: true });
}

// The caps mirror the bounty's published limits for this competition.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log(`dossier.json written to ${join(outDir, "dossier.json")} (${dossier.length} bytes)`);
