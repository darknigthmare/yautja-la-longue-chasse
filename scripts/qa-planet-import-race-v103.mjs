import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { reportGithubActionsFailure } from "./lib/github-actions-annotation.mjs";

// Real Next route, React editor, generator and material textures. The only
// controlled boundary delays delivery of a genuine File.text() result in a
// fresh browser context; it never replaces file bytes, hooks or game state.
const base = new URL(process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101");
assert.ok(["http:", "https:"].includes(base.protocol) && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Use an isolated loopback QA server");
const outputRoot = path.resolve(process.env.YAUTJA_PLANET_IMPORT_RACE_V103_QA_OUTPUT ?? "outputs/qa-planet-import-race-v103");
await fs.mkdir(outputRoot, { recursive: true });
const output = await fs.mkdtemp(path.join(outputRoot, "run-"));
const reportPath = path.join(output, "report.json");
const require = createRequire(import.meta.url);
const executable = process.env.CHROMIUM_EXECUTABLE_PATH ?? process.env.AUDIT_CHROME_EXECUTABLE;
const checks = [], errors = [], consoleErrors = [], httpErrors = [], textures = new Map();
const seedError = "Une graine numérique doit être comprise entre 0 et 4 294 967 295.";
const codeError = "Ce code de monde n’est pas reconnu. Vérifiez qu’il est complet.";
const importedMessage = "Fiche importée. Le monde conserve sa version et sa géographie d’origine.";
const root = page => page.getByTestId("planet-generator-v103");
const seedInput = page => root(page).getByRole("textbox", { name: "Graine du monde", exact: true });
const codeInput = page => root(page).getByRole("textbox", { name: "Importer un code de monde", exact: true });
const fileInput = page => root(page).getByLabel("Ou importer une fiche", { exact: true });
const status = page => root(page).locator(':scope > [role="status"]');
const button = (page, name) => root(page).getByRole("button", { name, exact: true });
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
let browser, context, page, failure, restoredFileText = false, worlds;

async function frames() {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Two native animation frames did not arrive")), 5000);
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timeout); resolve(); }));
  }));
}

async function readyMaterial() {
  const canvas = root(page).getByTestId("planet-generator-quicklook-v103").locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-testid="planet-generator-quicklook-v103"] canvas');
    return ["ready", "fallback"].includes(canvas?.getAttribute("data-render-status"));
  }, undefined, { timeout: 60000 });
  assert.equal(await canvas.getAttribute("data-render-status"), "ready", "The real planet materials must render; an SVG fallback is insufficient for this journey");
}

async function snapshot() {
  return root(page).evaluate(element => ({
    message: element.querySelector(':scope > [role="status"]').textContent,
    preview: element.getAttribute("data-preview-planet-code"),
    atlas: element.querySelector('[data-testid="clan-war-atlas-v95"]').getAttribute("data-planet-id"),
    sharedCode: element.querySelector("textarea[readonly]").value,
    seed: element.querySelector('[data-generator-field="seed"] input:not([type="checkbox"])').value,
    importCode: [...element.querySelectorAll("label")].find(label => label.textContent.trim() === "Importer un code de monde").querySelector("input").value,
    modified: element.getAttribute("data-draft-modified"),
    fields: Object.fromEntries([...element.querySelectorAll("[data-generator-field]")].map(field => [field.dataset.generatorField, field.querySelector('select,input:not([type="checkbox"])').value])),
  }));
}

async function generateAndExport(seed) {
  await seedInput(page).fill(String(seed));
  await button(page, "Générer l’aperçu").click();
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-generator-v103"]')?.getAttribute("data-draft-modified") === "false");
  await readyMaterial();
  const applied = await snapshot();
  const [download] = await Promise.all([page.waitForEvent("download"), button(page, "Télécharger la fiche").click()]);
  const stream = await download.createReadStream();
  assert.ok(stream, "The actual UI must produce a downloadable JSON file");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks), value = JSON.parse(buffer.toString("utf8"));
  await download.delete();
  assert.ok(buffer.length <= 65536, "The real export must satisfy its import size limit");
  assert.equal(value.format, "yautja-war-planet");
  assert.equal(value.version, 103);
  assert.equal(value.recipe.seed, seed);
  assert.equal(value.recipe.regionCount, 3);
  assert.equal(value.recipe.territoryCount, 18);
  assert.equal(value.code, applied.preview);
  assert.equal(value.code, applied.atlas);
  assert.equal(value.code, applied.sharedCode);
  return { seed, code: value.code, buffer, sha256: sha256(buffer), bytes: buffer.length };
}

async function installReadGate() {
  await page.evaluate(() => {
    const ownDescriptor = Object.getOwnPropertyDescriptor(File.prototype, "text");
    const nativeText = File.prototype.text, held = new Map();
    let armed = null;
    const state = entry => ({ name: entry.name, nativeFinished: entry.nativeFinished, nativeLength: entry.nativeLength, released: entry.released, delivered: entry.delivered });
    Object.defineProperty(File.prototype, "text", { configurable: true, writable: true, value: function () {
      if (this.name !== armed) return nativeText.call(this);
      const name = armed; armed = null;
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      const entry = { name, release, nativeFinished: false, nativeLength: null, released: false, delivered: false };
      held.set(name, entry);
      // Start the actual native read immediately. Only its delivery to React is
      // held, so the later user action deterministically races completed I/O.
      const read = nativeText.call(this).then(text => { entry.nativeFinished = true; entry.nativeLength = text.length; return text; });
      entry.done = Promise.all([read, gate]).then(([text]) => { entry.delivered = true; return text; });
      return entry.done;
    } });
    window.__planetImportRaceV103 = {
      arm(name) {
        if (armed !== null || held.has(name) || [...held.values()].some(entry => !entry.delivered)) throw new Error("Only one intentionally delayed file is allowed");
        armed = name;
      },
      state(name) { return held.has(name) ? state(held.get(name)) : null; },
      async release(name) {
        const entry = held.get(name);
        if (!entry || entry.released || !entry.nativeFinished) throw new Error("Release requires a completed, still-held native read");
        entry.released = true; entry.release();
        let timeout;
        try {
          await Promise.race([entry.done, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Native file delivery did not settle")), 5000); })]);
          return state(entry);
        } finally { clearTimeout(timeout); }
      },
      restore() {
        for (const entry of held.values()) { entry.released = true; entry.release(); }
        if (ownDescriptor) Object.defineProperty(File.prototype, "text", ownDescriptor);
        else delete File.prototype.text;
        delete window.__planetImportRaceV103;
        return File.prototype.text === nativeText;
      },
    };
  });
}

async function baseline() {
  await root(page).getByRole("checkbox", { name: "Conserver : Graine du monde", exact: true }).setChecked(false);
  await codeInput(page).fill(worlds[0].code);
  await button(page, "Retrouver le monde").click();
  await frames();
  const current = await snapshot();
  assert.equal(current.preview, worlds[0].code);
  assert.equal(current.seed, "201");
  return current;
}

async function check(name, run) {
  try { const detail = await run(); checks.push({ name, status: "PASS", ...detail }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, status: "FAIL", error: error instanceof Error ? error.message : String(error) }); throw error; }
}

async function staleRead(name, prepare, action, expectedMessage) {
  await check(name, async () => {
    await baseline();
    await prepare(); // Invalid input must predate the file, not cancel it itself.
    const filename = `held-${checks.length}.json`;
    await page.evaluate(name => window.__planetImportRaceV103.arm(name), filename);
    await fileInput(page).setInputFiles({ name: filename, mimeType: "application/json", buffer: worlds[1].buffer });
    await page.waitForFunction(name => window.__planetImportRaceV103.state(name)?.nativeFinished === true, filename);
    const held = await page.evaluate(name => window.__planetImportRaceV103.state(name), filename);
    assert.equal(held.delivered, false);
    assert.equal(held.nativeLength, worlds[1].buffer.toString("utf8").length);
    await action();
    await frames();
    const latest = await snapshot();
    assert.equal(latest.preview, worlds[0].code);
    assert.equal(latest.sharedCode, worlds[0].code);
    assert.equal(latest.atlas, worlds[0].code);
    if (expectedMessage) assert.equal(latest.message, expectedMessage);
    const released = await page.evaluate(name => window.__planetImportRaceV103.release(name), filename);
    assert.equal(released.delivered, true, "The stale result must actually reach the component's awaiting continuation");
    await frames();
    const after = await snapshot();
    assert.deepEqual(after, latest, "A completed stale file must preserve the latest message, preview, seed, share/import codes and draft controls");
    return { nativeRead: released, preserved: after };
  });
}

try {
  browser = await chromium.launch({ headless: true, ...(executable ? { executablePath: executable } : process.env.AUDIT_CHROME_CHANNEL ? { channel: process.env.AUDIT_CHROME_CHANNEL } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
  context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: "reduce", acceptDownloads: true });
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.origin !== base.origin) return;
    if (response.status() >= 400) httpErrors.push({ path: url.pathname, status: response.status() });
    if (/^\/game\/planets\/v10[13]\/runtime\/.+\.webp$/.test(url.pathname)) textures.set(url.pathname, { path: url.pathname, status: response.status(), contentType: response.headers()["content-type"] });
  });
  await page.goto(new URL("/planet-generator-v103", base).href, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.bringToFront(); await root(page).waitFor(); await readyMaterial();
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [], "A fresh context must not carry an existing campaign or cloud session");
  await root(page).getByRole("combobox", { name: "Nombre de régions", exact: true }).selectOption("3");
  await root(page).getByRole("combobox", { name: "Nombre de territoires", exact: true }).selectOption("18");
  worlds = [await generateAndExport(201), await generateAndExport(202)];
  assert.notEqual(worlds[0].code, worlds[1].code);
  await installReadGate();
  for (const name of ["Générer l’aperçu", "Base terrestre", "Base extraterrestre"]) {
    await staleRead(`Rejected ${name} supersedes the older file read`, () => seedInput(page).fill("4294967296"), () => button(page, name).click(), seedError);
  }
  await staleRead("Rejected shuffle with a locked invalid seed supersedes the older file read", async () => {
    await seedInput(page).fill("4294967296");
    await root(page).getByRole("checkbox", { name: "Conserver : Graine du monde", exact: true }).setChecked(true);
  }, () => button(page, "Mélanger les réglages").click(), seedError);
  await staleRead("Rejected code import prepared before the file supersedes its pending read", () => codeInput(page).fill("invalid-world-code-v103"), () => button(page, "Retrouver le monde").click(), codeError);
  await staleRead("Editing the code field after native reading preserves the newer unfinished input", async () => {}, async () => {
    const before = await snapshot();
    await codeInput(page).fill("newer-unfinished-world-code");
    const after = await snapshot();
    assert.equal(after.importCode, "newer-unfinished-world-code");
    assert.equal(after.message, before.message);
  });
  await check("A new valid native file import still succeeds after all cancelled reads", async () => {
    await fileInput(page).setInputFiles({ name: "fresh-world-202.json", mimeType: "application/json", buffer: worlds[1].buffer });
    await status(page).getByText(importedMessage, { exact: true }).waitFor();
    await readyMaterial(); await frames();
    const after = await snapshot();
    assert.equal(after.preview, worlds[1].code);
    assert.equal(after.sharedCode, worlds[1].code);
    assert.equal(after.atlas, worlds[1].code);
    assert.equal(after.seed, "202");
    assert.equal(after.fields.regionCount, "3");
    assert.equal(after.fields.territoryCount, "18");
    assert.equal(after.message, importedMessage);
    assert.equal(after.modified, "false");
    return { imported: after };
  });
  assert.equal(checks.length, 7);
  assert.ok(textures.size > 0 && [...textures.values()].every(item => item.status === 200 && item.contentType?.includes("image/webp")), "The journey must load the original runtime textures successfully");
  assert.deepEqual(errors, [], "No uncaught browser errors");
  assert.deepEqual(httpErrors, [], "No HTTP errors on the local journey");
  assert.ok(!consoleErrors.some(message => /hydration|hydrating|uncaught|react error/i.test(message)), "No hydration or React runtime errors");
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [], "The editor/import journey must not create a campaign or war archive");
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error);
  reportGithubActionsFailure("Planet import intent V103 browser regression", error);
} finally {
  if (page && !page.isClosed()) {
    restoredFileText = await page.evaluate(() => window.__planetImportRaceV103?.restore() ?? true).catch(() => false);
    if (!restoredFileText && !failure) failure = "File.prototype.text was not restored";
  }
  const report = {
    status: failure ? "FAIL" : "PASS", checkedAt: new Date().toISOString(), route: "/planet-generator-v103", baseUrl: base.origin,
    declaredServerMode: process.env.YAUTJA_QA_SERVER_MODE ?? "unspecified", viewport: [1440, 1080],
    runtime: { node: process.version, next: require("next/package.json").version, playwright: require("playwright-core/package.json").version, chromium: browser?.version() ?? null },
    scope: "Real Next route, React UI, procedural generator and original runtime textures; only native File.text delivery is delayed in a fresh isolated context.",
    limits: ["This targeted import-order regression is not full-game, Homeworld, artistic or performance qualification.", "The declared server mode is supplied by the runner; this script does not build or attest a deployed commit."],
    fileTextRestored: restoredFileText, fixtures: worlds?.map(world => ({ seed: world.seed, code: world.code, sha256: world.sha256, bytes: world.bytes })) ?? [], checks,
    textures: [...textures.values()], errors, consoleErrors, httpErrors, ...(failure ? { failure } : {}),
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  await context?.close(); await browser?.close();
}
if (failure) throw new Error(`${failure}\nReport: ${reportPath}`);
console.log(JSON.stringify({ status: "PASS", checks: checks.length, report: reportPath }));
