import assert from "node:assert/strict";
import { execFile, fork } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import sharp from "sharp";
import { writeFileAtomic } from "../scripts/lib/atomic-write.mjs";

const execFileAsync = promisify(execFile);
const atomicWriterUrl = new URL("../scripts/lib/atomic-write.mjs", import.meta.url).href;
const exporterUrl = new URL("../scripts/export-planet-materials-v101.mjs", import.meta.url).href;

async function temporaryDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-planet-export-v101-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test("atomic publication writes complete JSON, HTML and binary files without leftover temporary files", async t => {
  const directory = await temporaryDirectory(t);
  const documents = [
    ["exports.json", JSON.stringify({ complete: true, planets: ["Korthas"] }) + "\n"],
    ["index.html", "<!doctype html><title>Planètes modulaires</title>\n"],
    ["layer.png", Buffer.from([0, 255, 128, 0])],
  ];
  for (const [name, bytes] of documents) {
    const destination = path.join(directory, name);
    await writeFileAtomic(destination, "previous complete file");
    await writeFileAtomic(destination, bytes);
    assert.deepEqual(await fs.readFile(destination), Buffer.from(bytes));
  }
  assert.deepEqual((await fs.readdir(directory)).sort(), documents.map(([name]) => name).sort());
});

test("a partial write failure preserves the last checkpoint and cleans up staging bytes", async t => {
  const directory = await temporaryDirectory(t);
  const destination = path.join(directory, "exports.json");
  const previous = '{"complete":false,"planets":[{"id":"korthas"}]}\n';
  const failure = new Error("simulated failure after writing the first chunk");
  await fs.writeFile(destination, previous);
  async function* failingBytes() {
    yield '{"complete":';
    assert.equal(await fs.readFile(destination, "utf8"), previous);
    throw failure;
  }
  await assert.rejects(writeFileAtomic(destination, failingBytes()), error => error === failure);
  assert.equal(await fs.readFile(destination, "utf8"), previous);
  assert.deepEqual(await fs.readdir(directory), ["exports.json"]);
});

test("a failed rename preserves the destination and removes the staged file", async t => {
  const directory = await temporaryDirectory(t);
  const destination = path.join(directory, "index.html");
  await fs.mkdir(destination);
  await fs.writeFile(path.join(destination, "keep.txt"), "existing content");
  await assert.rejects(writeFileAtomic(destination, "new gallery"), error => ["EISDIR", "ENOTEMPTY", "EEXIST", "EPERM"].includes(error.code));
  assert.equal(await fs.readFile(path.join(destination, "keep.txt"), "utf8"), "existing content");
  assert.deepEqual(await fs.readdir(directory), ["index.html"]);
});

test("killing an export during its write leaves a readable checkpoint that the next writer can replace", { timeout: 10000 }, async t => {
  const directory = await temporaryDirectory(t);
  const destination = path.join(directory, "exports.json");
  const previous = { complete: false, planets: [{ id: "korthas" }] };
  await fs.writeFile(destination, JSON.stringify(previous));
  const childPath = path.join(directory, "interrupted-writer.mjs");
  await fs.writeFile(childPath, `
    import { writeFileAtomic } from ${JSON.stringify(atomicWriterUrl)};
    process.on("message", () => {});
    async function* bytes() {
      yield '{"complete":';
      process.send("partial-write");
      await new Promise(() => {});
    }
    await writeFileAtomic(process.argv[2], bytes());
  `);
  const child = fork(childPath, [destination], { execArgv: [], stdio: ["ignore", "ignore", "pipe", "ipc"] });
  const exited = once(child, "exit");
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exited;
  });
  await Promise.race([
    once(child, "message", { signal: t.signal }).then(([message]) => assert.equal(message, "partial-write")),
    exited.then(() => { throw new Error("Writer exited before the interruption checkpoint"); }),
  ]);
  assert.deepEqual(JSON.parse(await fs.readFile(destination, "utf8")), previous);
  child.kill("SIGKILL");
  await exited;
  assert.deepEqual(JSON.parse(await fs.readFile(destination, "utf8")), previous);
  const abandoned = (await fs.readdir(directory)).filter(name => name.endsWith(".tmp"));
  assert.equal(abandoned.length, 1, "An uncatchable interruption can leave only the private staged file");
  await writeFileAtomic(destination, JSON.stringify({ ...previous, complete: true }));
  assert.deepEqual(JSON.parse(await fs.readFile(destination, "utf8")), { ...previous, complete: true });
  assert.deepEqual((await fs.readdir(directory)).filter(name => name.endsWith(".tmp")), abandoned);
});

async function exportFixture(t) {
  const directory = await temporaryDirectory(t);
  const sourceFiles = [
    "app/game/planetMaterialRendererV101.ts", "app/game/systems/planetMaterialV101.ts",
    "app/game/planetRegionalMaterialsV102.ts",
    "app/game/planetDetailMaterialsV103.ts", "app/game/systems/planetMaterialProfilesV103.ts",
    "app/game/systems/clanWarPlanetsV96.ts", "app/game/systems/clanWarCoastlinesV97.ts",
    "app/game/systems/clanWarPlanetGeneratorV102.ts", "app/game/systems/clanWarPlanetGeographyV102.ts",
    "app/game/systems/clanWarProceduralV103.ts", "app/game/systems/clanWarPlanetGeneratorV103.ts",
    "app/game/systems/clanWarPlanetGeographyV103.ts",
    "app/planet-materials-v101/review.tsx",
  ];
  for (const file of sourceFiles) {
    const destination = path.join(directory, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, "// export fixture\n");
  }
  const native = path.join(directory, "public/game/planets/v101");
  await fs.mkdir(path.join(native, "materials"), { recursive: true });
  await fs.writeFile(path.join(native, "manifest.json"), JSON.stringify({ planets: [{ id: "korthas", name: "Korthas", landBiome: "jungle" }] }));
  const output = path.join(directory, "export");
  await fs.mkdir(output);
  return { directory, output, manifestPath: path.join(output, "exports.json") };
}

function runExport(fixture, args = [], browserSetup = 'chromium.launch = async () => { throw new Error("test browser reached"); };') {
  const bootstrap = `
    import { chromium } from ${JSON.stringify(import.meta.resolve("playwright-core"))};
    ${browserSetup}
    process.argv = [process.execPath, ${JSON.stringify(exporterUrl)}, ...${JSON.stringify(args)}];
    await import(${JSON.stringify(exporterUrl)});
  `;
  return execFileAsync(process.execPath, ["--input-type=module", "--eval", bootstrap], {
    cwd: fixture.directory,
    env: { ...process.env, YAUTJA_PLANET_MATERIAL_EXPORT_OUTPUT: fixture.output },
    timeout: 10000,
    maxBuffer: 128 * 1024,
  });
}

test("a fresh export can start despite an older truncated manifest", async t => {
  const fixture = await exportFixture(t);
  const truncated = '{"planets":[';
  await fs.writeFile(fixture.manifestPath, truncated);
  await assert.rejects(runExport(fixture), error => /test browser reached/.test(error.stderr));
  assert.equal(await fs.readFile(fixture.manifestPath, "utf8"), truncated, "No checkpoint is replaced before a planet has been exported");
});

test("resume reports a corrupt checkpoint with a clean-restart instruction and preserves it", async t => {
  const fixture = await exportFixture(t);
  const truncated = '{"planets":[';
  await fs.writeFile(fixture.manifestPath, truncated);
  await assert.rejects(runExport(fixture, ["--resume"]), error => /Cannot resume from invalid .*exports\.json; rerun without --resume/.test(error.stderr));
  assert.equal(await fs.readFile(fixture.manifestPath, "utf8"), truncated);
});

test("resume still rejects checkpoints from different source files", async t => {
  const fixture = await exportFixture(t);
  const previous = JSON.stringify({ sourceFingerprint: "stale-source", planets: [] });
  await fs.writeFile(fixture.manifestPath, previous);
  await assert.rejects(runExport(fixture, ["--resume"]), error => /Source files changed; rerun without --resume/.test(error.stderr));
  assert.equal(await fs.readFile(fixture.manifestPath, "utf8"), previous);
});

test("an invalid renderer PNG cannot overwrite the previous image before validation", async t => {
  const fixture = await exportFixture(t);
  const destination = path.join(fixture.output, "planets/korthas/albedo.png");
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const previous = await sharp({ create: { width: 1024, height: 512, channels: 4, background: "green" } }).png().toBuffer();
  const invalid = await sharp({ create: { width: 1, height: 1, channels: 4, background: "red" } }).png().toBuffer();
  await fs.writeFile(destination, previous);
  const browserSetup = `
    const recipes = Array.from({ length: 30 }, (_, index) => ({ id: index === 0 ? "korthas" : "fixture-" + index }));
    chromium.launch = async () => ({
      newContext: async () => ({ newPage: async () => ({
        on() {}, goto: async () => {}, waitForFunction: async () => {},
        evaluate: async (_, options) => options ? ${JSON.stringify(`data:image/png;base64,${invalid.toString("base64")}`)} : recipes,
      }) }),
      close: async () => {},
    });
  `;
  await assert.rejects(runExport(fixture, ["--planet=korthas"], browserSetup), error => /1 !== 1024/.test(error.stderr));
  assert.deepEqual(await fs.readFile(destination), previous);
  assert.deepEqual(await fs.readdir(path.dirname(destination)), ["albedo.png"]);
  await assert.rejects(fs.access(fixture.manifestPath), { code: "ENOENT" });
});
