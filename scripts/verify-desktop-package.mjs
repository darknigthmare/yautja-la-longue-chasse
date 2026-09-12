import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DESKTOP_RELEASE_TAG, DESKTOP_VERSION } from "../desktop/release.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const { extractFile, listPackage } = require("@electron/asar");
const release = path.join(root, "tmp", "desktop-release", DESKTOP_RELEASE_TAG);
const directory = path.join(release, "Yautja-La-Longue-Chasse-win32-x64");
const asarPath = path.join(directory, "resources", "app.asar");
const manifestPath = path.join(release, "manifest-" + DESKTOP_RELEASE_TAG + ".json");
const evidence = path.join(root, "tmp", "desktop-qa", DESKTOP_RELEASE_TAG);
const zipPath = path.join(release, "Yautja-La-Longue-Chasse-PC-" + DESKTOP_RELEASE_TAG.toUpperCase() + ".zip");

async function sha256(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}

const entries = listPackage(asarPath).map((entry) => entry.replaceAll("\\", "/"));
const allowedRoots = ["/renderer", "/main.mjs", "/protocol.mjs", "/release.mjs", "/package.json"];
assert.deepEqual(
  entries.filter((entry) => !allowedRoots.includes(entry) && !entry.startsWith("/renderer/")),
  [],
  "The ASAR contains an unexpected top-level entry",
);
assert.ok(entries.includes("/renderer/audio/manifest.json"), "The bundled audio manifest is missing");
assert.deepEqual(
  entries.filter((entry) => entry.split("/").some((part) =>
    part === ".git" || part.startsWith(".env") || part === "art-source" || part === "node_modules")),
  [],
  "The ASAR contains a private or development path",
);

const packagedMetadata = JSON.parse(extractFile(asarPath, "package.json").toString("utf8"));
assert.equal(packagedMetadata.version, DESKTOP_VERSION);
const readme = await fs.readFile(path.join(directory, "LIRE-MOI.txt"), "utf8");
assert.match(readme, new RegExp("PC " + DESKTOP_RELEASE_TAG.toUpperCase() + "(?:\\r?\\n)"));

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
assert.equal(manifest.version, DESKTOP_VERSION);
assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/);
for (const [file, expected] of Object.entries(manifest.hashes)) {
  assert.equal(await sha256(path.join(directory, file)), expected, "Hash mismatch for " + file);
}

const result = {
  passed: true,
  releaseTag: DESKTOP_RELEASE_TAG,
  sourceCommit: manifest.sourceCommit,
  sourceDigest: manifest.sourceDigest,
  version: manifest.version,
  asarEntries: entries.length,
  asarTopLevel: entries.filter((entry) => entry.lastIndexOf("/") === 0),
  audioManifestIncluded: true,
  manifestHashesVerified: true,
};

if (process.argv.includes("--zip")) {
  const archiveEntries = execFileSync(process.platform === "win32" ? "tar.exe" : "tar", ["-t", "-f", zipPath], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  }).trim().split(/\r?\n/);
  const prefix = "Yautja-La-Longue-Chasse-win32-x64/";
  assert.ok(archiveEntries.every((entry) => entry.startsWith(prefix) && !entry.split("/").includes("..")));
  for (const required of ["Yautja-La-Longue-Chasse.exe", "resources/app.asar", "LIRE-MOI.txt"]) {
    assert.ok(archiveEntries.includes(prefix + required), "Missing ZIP entry: " + required);
  }
  Object.assign(result, {
    zip: path.relative(root, zipPath).replaceAll("\\", "/"),
    zipBytes: (await fs.stat(zipPath)).size,
    zipSha256: await sha256(zipPath),
    zipEntries: archiveEntries.length,
  });
}

result.testedAt = new Date().toISOString();
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(evidence, "archive-verification.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
