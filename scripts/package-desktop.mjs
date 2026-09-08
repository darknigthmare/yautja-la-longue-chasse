import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";
import { DESKTOP_VERSION, DESKTOP_RELEASE_TAG } from "../desktop/release.mjs";
import { desktopSourceStamp, cleanDesktopSourceCommit } from "./stamp-desktop-build.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const buildRoot = await fs.realpath(path.join(root, "tmp", "desktop-build"));
const renderer = path.join(buildRoot, "renderer");
const sourceCommit = cleanDesktopSourceCommit();
const builtStamp = JSON.parse(await fs.readFile(path.join(buildRoot, "source-stamp.json"), "utf8"));
const currentStamp = await desktopSourceStamp();
if (builtStamp.sourceDigest !== currentStamp.sourceDigest) throw new Error("Desktop renderer is stale: rebuild from the committed sources before packaging.");
await fs.mkdir(path.join(root, "tmp", "desktop-release", DESKTOP_RELEASE_TAG), { recursive: true });
const release = await fs.realpath(path.join(root, "tmp", "desktop-release", DESKTOP_RELEASE_TAG));
await fs.access(path.join(renderer, "index.html"));
await fs.mkdir(buildRoot, { recursive: true });
const stage = await fs.mkdtemp(path.join(buildRoot, "package-"));
try {
// A positive allowlist: no repository, env, art sources, user saves or build tools.
await fs.cp(renderer, path.join(stage, "renderer"), { recursive: true, dereference: false, filter: async (source) => {
  if ((await fs.lstat(source)).isSymbolicLink()) throw new Error("Refusing symlink in renderer: " + source);
  return true;
} });
for (const name of ["main.mjs", "protocol.mjs", "release.mjs"]) await fs.copyFile(path.join(root, "desktop", name), path.join(stage, name));
await fs.writeFile(path.join(stage, "package.json"), JSON.stringify({
  name: "yautja-la-longue-chasse-pc", productName: "Yautja La Longue Chasse",
  version: DESKTOP_VERSION, author: "Yautja La Longue Chasse - projet de fan", private: true, type: "module", main: "main.mjs",
  description: "Jeu de fan non commercial - edition PC hors ligne V29",
}, null, 2));
const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const directories = await packager({
  dir: stage, out: release, name: "Yautja-La-Longue-Chasse",
  executableName: "Yautja-La-Longue-Chasse", platform: "win32", arch: "x64",
  electronVersion: pkg.devDependencies.electron, asar: true, prune: false,
  overwrite: true, appVersion: DESKTOP_VERSION, buildVersion: DESKTOP_VERSION,
  appCopyright: "Projet de fan non commercial, sans affiliation officielle",
});
const directory = directories[0];
const readme = "YAUTJA : LA LONGUE CHASSE - PC V29\r\n\r\nExtraire TOUT le dossier, puis lancer Yautja-La-Longue-Chasse.exe.\r\nAucun navigateur, Node, serveur ou reseau requis pour jouer.\r\nF11 : plein ecran. Alt : menu PC.\r\nAvant de fermer une chasse : Pause > Suspendre. Ne pas ignorer une alerte de sauvegarde.\r\nSauvegardes : %APPDATA%\\YautjaLaLongueChasse, distinctes du navigateur.\r\nLes exports/imports dans le jeu permettent le transfert de campagne.\r\nConserver ce dossier de profil lors d'une mise a jour manuelle.\r\n\r\nVersion de developpement non signee, non commerciale et non certifiee Steam Deck.\r\nLe runtime utilise Electron/Chromium et le moteur React/Canvas du jeu.\r\nContenu et visuels encore en production ; voir le rapprochement des conversations et le dossier V29 dans les sources.\r\nConserver LICENSE et LICENSES.chromium.html avec le programme.\r\n";
await fs.writeFile(path.join(directory, "LIRE-MOI.txt"), readme, "utf8");
const hashes = {};
for (const name of ["Yautja-La-Longue-Chasse.exe", "resources/app.asar"]) {
  hashes[name] = createHash("sha256").update(await fs.readFile(path.join(directory, name))).digest("hex");
}
await fs.writeFile(path.join(release, "manifest-" + DESKTOP_RELEASE_TAG + ".json"), JSON.stringify({
  sourceCommit, sourceDigest: currentStamp.sourceDigest, version: DESKTOP_VERSION, electron: pkg.devDependencies.electron, platform: "win32-x64",
  createdAt: new Date().toISOString(), signed: false, networkRequired: false, hashes,
}, null, 2));
console.log(JSON.stringify({ directory, manifest: path.join(release, "manifest-" + DESKTOP_RELEASE_TAG + ".json"), hashes }, null, 2));

} finally {
  const actualStage = await fs.realpath(stage);
  if (path.dirname(actualStage) !== buildRoot || !path.basename(actualStage).startsWith("package-") || (await fs.lstat(stage)).isSymbolicLink()) {
    throw new Error("Refusing to remove unexpected packaging stage");
  }
  await fs.rm(actualStage, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
