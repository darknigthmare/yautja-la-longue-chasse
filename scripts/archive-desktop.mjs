import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { DESKTOP_VERSION } from "../desktop/release.mjs";
import { desktopBuildPaths, assertDesktopOutputSafety, directoryBytes, assertFreeBytes, sha256File } from "../desktop/build-paths.mjs";

const paths = desktopBuildPaths();
await assertDesktopOutputSafety(paths);
// Verify package contents, metadata and streamed file hashes before archiving.
const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: "inherit", windowsHide: true, ...options });
  child.on("error", reject);
  child.on("close", code => code === 0 ? resolve() : reject(new Error(command + " exited " + code)));
});
await run(process.execPath, [path.join(paths.root, "scripts/verify-desktop-package.mjs")]);
try {
  await fs.lstat(paths.zip);
  throw new Error("Refusing to overwrite an existing desktop ZIP: " + paths.zip);
} catch (error) { if (error.code !== "ENOENT") throw error; }
const packageBytes = await directoryBytes(paths.directory);
await assertFreeBytes(paths.release, packageBytes + 256 * 1024 * 1024, "Desktop ZIP");
const partial = paths.zip + ".partial-" + randomUUID();
const claim = await fs.open(partial, "wx");
await claim.close();
// libarchive writes ZIP64 when required. Explicit format also covers the partial suffix.
// Failed partials are retained for inspection; no source/archive cleanup is attempted.
await run(process.platform === "win32" ? "tar.exe" : "tar", ["--format=zip", "-cf", partial, "-C", paths.release, path.basename(paths.directory)]);
const sha256 = await sha256File(partial);
const bytes = (await fs.stat(partial)).size;
// Same-volume link is atomic and refuses replacement; it does not duplicate the ZIP.
await fs.link(partial, paths.zip);
await fs.unlink(partial);
await fs.mkdir(paths.evidence, { recursive: true });
const result = { version: DESKTOP_VERSION, zip: paths.zip, bytes, sha256, packageBytes, createdAt: new Date().toISOString() };
await fs.writeFile(path.join(paths.evidence, "zip-creation.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
