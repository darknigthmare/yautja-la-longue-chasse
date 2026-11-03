import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { desktopBuildPaths, assertDesktopOutputSafety, directoryBytes, sha256File, assertFreeBytes, packagingAdditionalBytes } from "../desktop/build-paths.mjs";

const root = process.cwd();
async function removeFixture(fixture) {
  const real = await fs.realpath(fixture), tempRoot = await fs.realpath(os.tmpdir());
  assert.equal(path.dirname(real), tempRoot);
  assert.match(path.basename(real), /^yautja-desktop-(paths|alias|size)-/);
  await fs.rm(real, { recursive: true });
}
test("the absent override preserves all legacy release/build/QA paths", () => {
  const paths = desktopBuildPaths({ root, releaseTag: "v41", outputRoot: null });
  assert.equal(paths.build, path.join(root, "tmp", "desktop-build"));
  assert.equal(paths.renderer, path.join(paths.build, "renderer"));
  assert.equal(paths.release, path.join(root, "tmp", "desktop-release", "v41"));
  assert.equal(paths.evidence, path.join(root, "tmp", "desktop-qa", "v41"));
  assert.equal(paths.packagerTemp, os.tmpdir());
});

test("an explicit output root groups build, release, QA and packager files without relocating sources", () => {
  const outputRoot = path.resolve(os.tmpdir(), "yautja-output-path-test");
  const paths = desktopBuildPaths({ root, outputRoot, releaseTag: "v41" });
  assert.equal(paths.root, root);
  assert.equal(paths.renderer, path.join(outputRoot, "build", "renderer"));
  assert.equal(paths.release, path.join(outputRoot, "release", "v41"));
  assert.equal(paths.evidence, path.join(outputRoot, "qa", "v41"));
  assert.equal(paths.packagerTemp, path.join(outputRoot, "packager-tmp"));
  assert.equal(paths.zip, path.join(paths.release, "Yautja-La-Longue-Chasse-PC-V41.zip"));
});

test("output rejects ambiguous paths, drive roots, project ancestors, source folders and old outputs", () => {
  for (const outputRoot of ["", " ", "relative/path", path.parse(root).root, root, path.dirname(root), ...["app", "desktop", "public", "scripts", "node_modules", ".git", "tmp"].map(name => path.join(root, name, "generated"))]) {
    assert.throws(() => desktopBuildPaths({ root, outputRoot }), /Desktop output|YAUTJA_DESKTOP_OUTPUT_ROOT/, outputRoot);
  }
  for (const releaseTag of ["../v35", "v41/../v35", "V41", ""]) assert.throws(() => desktopBuildPaths({ root, releaseTag }), /release tag/);
});

test("physical output checks prevent a generated renderer junction from cleaning unrelated files", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-desktop-paths-"));
  const source = path.join(fixture, "source"), outputRoot = path.join(fixture, "output");
  await fs.mkdir(source); await fs.mkdir(path.join(outputRoot, "build"), { recursive: true });
  const paths = desktopBuildPaths({ root: source, outputRoot });
  await assertDesktopOutputSafety(paths);
  await fs.symlink(source, paths.renderer, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(assertDesktopOutputSafety(paths), /plain directory/);
  await fs.unlink(paths.renderer);
  await removeFixture(fixture);
});

test("physical output checks detect a source alias even when its lexical path looks separate", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-desktop-alias-"));
  const source = path.join(fixture, "source"), actualPublic = path.join(fixture, "public-files");
  await fs.mkdir(source); await fs.mkdir(actualPublic);
  await fs.symlink(actualPublic, path.join(source, "public"), process.platform === "win32" ? "junction" : "dir");
  const paths = desktopBuildPaths({ root: source, outputRoot: path.join(actualPublic, "output") });
  await assert.rejects(assertDesktopOutputSafety(paths), /overlaps/);
  await fs.unlink(path.join(source, "public"));
  await removeFixture(fixture);
});

test("streamed hashes and exact file counts feed space checks which refuse insufficient capacity", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-desktop-size-"));
  const bytes = Buffer.alloc(1_048_593, 0x5a), file = path.join(fixture, "store", "asset.bin");
  await fs.mkdir(path.dirname(file));
  await fs.writeFile(file, bytes);
  assert.equal(await directoryBytes(fixture), bytes.length);
  assert.equal(await sha256File(file), createHash("sha256").update(bytes).digest("hex"));
  assert.equal(packagingAdditionalBytes(bytes.length), 3 * bytes.length + 1024 ** 3);
  assert((await assertFreeBytes(fixture, 1, "test")).availableBytes > 0);
  await assert.rejects(assertFreeBytes(fixture, Number.MAX_SAFE_INTEGER, "test"), /required.*available/);
  for (const size of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER]) assert.throws(() => packagingAdditionalBytes(size));
  await fs.symlink(path.dirname(file), path.join(fixture, "alias"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(directoryBytes(fixture), /Refusing link/);
  assert.equal(await directoryBytes(fixture, { followLinks: true }), bytes.length * 2);
  await fs.unlink(path.join(fixture, "alias"));
  await removeFixture(fixture);
});
