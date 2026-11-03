import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

// Regenerate these golden sources only from the published V102 commit. The
// checked-in text fixtures let CI compare live pixels without a network fetch
// or assumptions about which git parents a shallow PR checkout contains.
const commit = "6bd43c7c0185077783bfb9d6f2eb2929c469a03d";
const files = [
  "app/game/planetMaterialRendererV101.ts",
  "app/game/planetRegionalMaterialsV102.ts",
  "app/game/systems/planetMaterialV101.ts",
];
const directory = "tests/fixtures/planet-material-v102";
await fs.mkdir(directory, { recursive: true });
const manifest = { commit, files: [] };
for (const source of files) {
  const contents = execFileSync("git", ["show", `${commit}:${source}`]);
  const fixture = path.basename(source) + ".txt";
  const sha256 = crypto.createHash("sha256").update(contents).digest("hex");
  await fs.writeFile(path.join(directory, fixture), contents);
  manifest.files.push({ source, fixture, sha256 });
}
await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Prepared ${manifest.files.length} original renderer sources from ${commit}`);
