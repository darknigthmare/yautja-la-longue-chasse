import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { DESKTOP_RELEASE_TAG } from "./release.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const MiB = 1024 * 1024;
const within = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
};

/** One opt-in output root; existing releases and legacy junctions keep their paths. */
export function desktopBuildPaths({ root = projectRoot, releaseTag = DESKTOP_RELEASE_TAG, outputRoot = process.env.YAUTJA_DESKTOP_OUTPUT_ROOT } = {}) {
  root = path.resolve(root);
  if (!/^v\d+$/.test(releaseTag)) throw new Error("Invalid desktop release tag");
  const custom = outputRoot != null;
  if (custom && (!outputRoot.trim() || !path.isAbsolute(outputRoot) || outputRoot.includes("\0"))) {
    throw new Error("YAUTJA_DESKTOP_OUTPUT_ROOT must be an explicit absolute directory");
  }
  const output = custom ? path.resolve(outputRoot) : null;
  if (output && (output === path.parse(output).root || within(output, root))) {
    throw new Error("Desktop output cannot be a drive root, project root or project ancestor");
  }
  if (output) for (const name of ["app", "desktop", "public", "scripts", "node_modules", ".git", "tmp"]) {
    if (within(path.join(root, name), output)) throw new Error("Desktop output cannot be inside sources or legacy outputs");
  }
  const build = output ? path.join(output, "build") : path.join(root, "tmp", "desktop-build");
  const release = output ? path.join(output, "release", releaseTag) : path.join(root, "tmp", "desktop-release", releaseTag);
  return {
    root, output, build, release,
    renderer: path.join(build, "renderer"),
    evidence: output ? path.join(output, "qa", releaseTag) : path.join(root, "tmp", "desktop-qa", releaseTag),
    packagerTemp: output ? path.join(output, "packager-tmp") : os.tmpdir(),
    directory: path.join(release, "Yautja-La-Longue-Chasse-win32-x64"),
    zip: path.join(release, "Yautja-La-Longue-Chasse-PC-" + releaseTag.toUpperCase() + ".zip"),
  };
}

/** Resolve the existing ancestor without creating anything. */
async function prospectiveRealPath(candidate) {
  try { return await fs.realpath(candidate); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = path.dirname(candidate);
    if (parent === candidate) throw error;
    return path.join(await prospectiveRealPath(parent), path.basename(candidate));
  }
}

export async function assertDesktopOutputSafety(paths) {
  if (!paths.output) return; // Legacy locations intentionally retain their existing junctions.
  const realOutput = await prospectiveRealPath(paths.output);
  if (realOutput === path.parse(realOutput).root || within(realOutput, await fs.realpath(paths.root))) {
    throw new Error("Desktop output resolves to a protected root");
  }
  for (const name of ["app", "desktop", "public", "scripts", "node_modules", ".git", "tmp", "tmp/desktop-build", "tmp/desktop-release"]) {
    const protectedPath = await prospectiveRealPath(path.join(paths.root, name));
    if (within(protectedPath, realOutput) || within(realOutput, protectedPath)) throw new Error("Desktop output overlaps a source or legacy output: " + name);
  }
  for (const destination of [paths.build, paths.renderer, paths.release, paths.directory, paths.evidence, paths.packagerTemp]) {
    const relative = path.relative(paths.output, destination);
    if (!within(paths.output, destination)) throw new Error("Desktop destination escapes output root");
    let current = paths.output;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      try {
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Desktop destination is not a plain directory: " + current);
      } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
}

export async function directoryBytes(directory, { followLinks = false } = {}, ancestors = []) {
  const real = await fs.realpath(directory);
  if (ancestors.includes(real)) throw new Error("Directory cycle: " + directory);
  let bytes = 0;
  for (const entry of await fs.readdir(real, { withFileTypes: true })) {
    const file = path.join(real, entry.name);
    if (entry.isSymbolicLink() && !followLinks) throw new Error("Refusing link in desktop renderer/package: " + file);
    const stat = await fs.stat(file);
    if (stat.isDirectory()) bytes += await directoryBytes(file, { followLinks }, [...ancestors, real]);
    else if (stat.isFile()) bytes += stat.size;
    else throw new Error("Unsupported desktop file: " + file);
  }
  return bytes;
}

export async function sha256File(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export async function assertFreeBytes(directory, requiredBytes, label) {
  if (!Number.isSafeInteger(requiredBytes) || requiredBytes < 0) throw new Error("Invalid free-space reservation");
  let existing = directory;
  while (true) {
    try { await fs.stat(existing); break; }
    catch (error) {
      if (error.code !== "ENOENT" || path.dirname(existing) === existing) throw error;
      existing = path.dirname(existing);
    }
  }
  const stat = await fs.statfs(existing);
  const availableBytes = stat.bavail * stat.bsize;
  if (availableBytes < requiredBytes) throw new Error(`${label}: ${requiredBytes} bytes required, ${availableBytes} available at ${directory}`);
  return { requiredBytes, availableBytes };
}

// The renderer already exists. Budget its stage copy plus the packager app copy
// plus ASAR, and 1 GiB for Electron, metadata and filesystem overhead.
export function packagingAdditionalBytes(rendererBytes) {
  if (!Number.isSafeInteger(rendererBytes) || rendererBytes < 0) throw new Error("Invalid renderer size");
  const required = 3 * rendererBytes + 1024 * MiB;
  if (!Number.isSafeInteger(required)) throw new Error("Renderer size exceeds safe capacity accounting");
  return required;
}

export async function assertPackagingSpace(paths, rendererBytes) {
  // Aggregate reservations on the same physical volume. On separate volumes,
  // allow an extra final-package copy because rename may fall back to copy.
  const stageVolume = path.parse(await prospectiveRealPath(paths.build)).root;
  const tempVolume = path.parse(await prospectiveRealPath(paths.packagerTemp)).root;
  const releaseVolume = path.parse(await prospectiveRealPath(paths.release)).root;
  if (stageVolume === tempVolume && tempVolume === releaseVolume) {
    return [await assertFreeBytes(paths.build, packagingAdditionalBytes(rendererBytes), "Desktop packaging")];
  }
  const budgets = new Map();
  for (const [volume, directory, bytes] of [
    [stageVolume, paths.build, rendererBytes + 256 * MiB],
    [tempVolume, paths.packagerTemp, 2 * rendererBytes + 768 * MiB],
    ...(releaseVolume === tempVolume ? [] : [[releaseVolume, paths.release, rendererBytes + 768 * MiB]]),
  ]) {
    const old = budgets.get(volume);
    budgets.set(volume, { directory, bytes: bytes + (old?.bytes ?? 0) });
  }
  return Promise.all([...budgets.values()].map(({ directory, bytes }) => assertFreeBytes(directory, bytes, "Desktop packaging")));
}
