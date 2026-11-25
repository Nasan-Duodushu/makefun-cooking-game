// Ember & Thyme — handover program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ into /output and writes
// /output/dossier.json with the kit's vendored buildDossier, exactly as the
// bounty asks. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The scorer's caps live in one place so a cap change is a one-line edit;
// the dossier call refuses anything the gate would refuse (too many or too
// large screenshots, too many game files, game paths too long).
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Gate caps for best-cooking-game-20261125-0137 (from the kit's gate.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handOver(): void {
  mkdirSync(OUT, { recursive: true });
  cpSync(join(HERE, "game"), join(OUT, "game"), { recursive: true });

  const shotsDir = join(OUT, "screenshots");
  mkdirSync(shotsDir, { recursive: true });
  if (existsSync(join(HERE, "screenshots"))) {
    cpSync(join(HERE, "screenshots"), shotsDir, { recursive: true });
  }
  // The gate needs 3–4 screenshots: fail loudly here instead of handing
  // over an entry the scorer would mark invalid.
  const shots = readdirSync(shotsDir).filter((f) => !f.startsWith("."));
  if (shots.length < 3 || shots.length > DOSSIER_CAPS.screenshots.max) {
    throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
  }

  const dossierPath = join(OUT, "dossier.json");
  writeFileSync(dossierPath, buildDossier(OUT, DOSSIER_CAPS));

  // The grader collects outputs as another user: leave everything readable.
  chmodSync(dossierPath, 0o644);
  console.log(`handed over game/ + screenshots/ and wrote ${dossierPath}`);
}

handOver();
