import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || ".");
const action = process.argv[3] || "install";
const systems = join(root, "app", "game", "systems");
const target = join(systems, "mausoleum.ts");
const backup = join(systems, ".mausoleum.prey-v06.backup");
const receipt = join(systems, ".mausoleum.prey-v06.json");
const adapter = join(systems, "preyMausoleumAdapterV06.ts");
const sha = (text) => createHash("sha256").update(text).digest("hex");

if (action === "uninstall") {
  if (!existsSync(backup) || !existsSync(receipt)) {
    console.log("Adaptateur mausolée PREY V0.6 non installé.");
    process.exit(0);
  }
  const meta = JSON.parse(readFileSync(receipt, "utf8"));
  const current = readFileSync(target, "utf8");
  if (sha(current) !== meta.patchedSha) {
    console.error("mausoleum.ts a changé depuis l’installation. Restauration automatique refusée.");
    process.exit(6);
  }
  writeFileSync(target, readFileSync(backup));
  rmSync(backup, { force: true });
  rmSync(receipt, { force: true });
  rmSync(adapter, { force: true });
  console.log("Adaptateur mausolée PREY V0.6 retiré.");
  process.exit(0);
}

if (action !== "install") {
  console.error("usage: node APPLIQUER_MAUSOLEE_PREY_LOCAL_V0_6.mjs <repo> install|uninstall");
  process.exit(2);
}
if (!existsSync(target)) {
  console.error("app/game/systems/mausoleum.ts absent");
  process.exit(3);
}
if (existsSync(backup) || existsSync(receipt)) {
  console.error("Installation mausolée PREY déjà présente.");
  process.exit(4);
}
let source = readFileSync(target, "utf8");
if (source.includes("PREY_MAUSOLEUM_V06")) {
  console.error("Marqueur PREY_MAUSOLEUM_V06 déjà présent.");
  process.exit(4);
}
const importNeedle = 'import { referenceBiomaskPathV62 } from "../biomaskCatalogueV62";';
const arrayNeedle = "export const MAUSOLEUM_INSTALLED_CAMPAIGNS: readonly MausoleumDlcAdapter[] = [];";
if (!source.includes(importNeedle) || !source.includes(arrayNeedle)) {
  console.error("mausoleum.ts ne correspond pas au contrat V0.6 testé. Aucun fichier modifié.");
  process.exit(5);
}
const original = source;
source = source.replace(
  importNeedle,
  `${importNeedle}\nimport { PREY_MAUSOLEUM_ADAPTER_V06 } from "./preyMausoleumAdapterV06"; // PREY_MAUSOLEUM_V06`,
);
source = source.replace(
  arrayNeedle,
  "export const MAUSOLEUM_INSTALLED_CAMPAIGNS: readonly MausoleumDlcAdapter[] = [PREY_MAUSOLEUM_ADAPTER_V06]; // PREY_MAUSOLEUM_V06",
);
writeFileSync(backup, original, "utf8");
writeFileSync(target, source, "utf8");
copyFileSync(join(here, "preyMausoleumAdapterV06.ts"), adapter);
writeFileSync(
  receipt,
  JSON.stringify({ version: "0.6.0", target: "app/game/systems/mausoleum.ts", originalSha: sha(original), patchedSha: sha(source) }, null, 2) + "\n",
);
console.log("PREY V0.6 raccordé au Mausolée des Grandes Chasses en développement local.");
console.log("Le rituel natif take → inspect → wear → boot → remove → replace reste géré par le jeu hôte.");
