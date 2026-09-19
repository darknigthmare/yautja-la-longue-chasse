import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import { build } from "esbuild";

// Real V38 UI, isolated browser storage; never starts or changes a server.
assert(process.env.V38_QA_URL, "Set V38_QA_URL to the release owner's running V38 server.");
const target = new URL(process.env.V38_QA_URL);
assert(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && !target.hash);
const base = target.href.replace(/\/+$/, "");
const root = await fs.realpath(process.cwd());
const output = path.resolve(root, process.env.V38_HONORS_QA_OUTPUT || "work/v38/pit-honors-qa");
const relative = path.relative(root, output);
assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Evidence stays in the workspace.");
let directory = root;
for (const segment of relative.split(path.sep)) {
  directory = path.join(directory, segment);
  await fs.mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const info = await fs.lstat(directory);
  assert(info.isDirectory() && !info.isSymbolicLink() && path.relative(directory, await fs.realpath(directory)) === "", "Evidence cannot traverse a link.");
}
const digest = value => createHash("sha256").update(value).digest("hex");
async function loadSystem(entryPoint) {
  const bundle = await build({ entryPoints: [entryPoint], bundle: true, format: "esm", platform: "node", target: "es2022", write: false, logLevel: "silent" });
  return import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
}
const [campaign, saves, arcade, circuit, honors] = await Promise.all([
  "app/game/save.ts", "app/game/systems/pitSave.ts", "app/game/systems/pitArcade.ts",
  "app/game/systems/pitCircuit.ts", "app/game/systems/pitHonors.ts",
].map(loadSystem));
const OWNER = "2026-09-19T10:00:00.000Z", OTHER = "2026-09-19T10:00:01.000Z", AT = "2026-09-19T11:00:00.000Z";
const key = saves.pitSaveStorageKey(OWNER), otherKey = saves.pitSaveStorageKey(OTHER);
const saveFixture = campaign.defaultSave(OWNER);
Object.assign(saveFixture.profile, { hunterName: "Distinctions QA V38", rankId: "elder", honor: 1900, clanMarks: 83, playTimeSeconds: 4321 });
Object.assign(saveFixture.settings, { masterVolume: 0, musicVolume: 0, effectsVolume: 0 });
const campaignBytes = JSON.stringify(saveFixture);

function clearArcade(save, fighterId, count) {
  const ladder = arcade.PIT_ARCADE_LADDERS[fighterId];
  for (let i = 0; i < count; i++) save = saves.applyPitResult(save, {
    id: `${fighterId}-honors-arcade-${i}`, mode: "arcade", outcome: "victory", fighterId,
    arenaId: ladder.encounters[i].arenaId, roundsWon: 2, roundsLost: 0,
    arcadeEncounterIndex: i, arcadeCompleted: i === ladder.encounters.length - 1,
    cosmeticRewardIds: i === ladder.encounters.length - 1 ? [ladder.cosmeticRewardId] : [], completedAt: AT,
  }).save;
  return save;
}
function clearCircuit(save, fighterId, count) {
  const definition = circuit.PIT_CLAN_CIRCUITS[fighterId];
  for (let i = 0; i < count; i++) {
    const fight = definition.fights[i];
    const plan = definition.chapters.find(candidate => candidate.chapter.id === fight.chapterId);
    const finishes = plan.fights.at(-1).index === fight.index;
    save = saves.applyPitResult(save, { id: `${fighterId}-honors-circuit-${i}`, mode: "circuit", outcome: "victory", fighterId,
      arenaId: fight.arenaId, roundsWon: 2, roundsLost: 0, circuitFightIndex: i,
      circuitCompleted: i === definition.fights.length - 1, cosmeticRewardIds: finishes ? [plan.chapter.cosmeticRewardId] : [], completedAt: AT }).save;
  }
  return save;
}
function clearDescent(save, fighterId, count) {
  let run = arcade.createPitDescentRun(fighterId, 72);
  save = saves.persistPitDescentRun(save, run, AT).save;
  for (let i = 0; i < count; i++) {
    const node = arcade.createPitDescentPlan(fighterId, run.seed).floors[i].options[0];
    run = arcade.selectPitDescentNode(run, node.id);
    save = saves.persistPitDescentRun(save, run, AT).save;
    run = arcade.applyPitDescentResolution(run, { id: `${fighterId}-honors-descent-${i}`, nodeId: node.id,
      ...(node.kind === "fight" || node.kind === "boss" ? { victory: true, remainingHealth: Math.max(100, run.health - 70), roundsWon: 1, roundsLost: 0 } : {}) }).run;
    save = saves.persistPitDescentRun(save, run, AT).save;
  }
  return save;
}
let earned = clearArcade(saves.createPitSave(OWNER), "wolf", 8);
earned = clearArcade(earned, "city-hunter", 3);
earned = clearCircuit(earned, "wolf", 2);
earned = clearCircuit(earned, "city-hunter", 2);
earned = clearDescent(earned, "enforcer", 8);
const expected = honors.buildPitHonors(earned, OWNER);
assert.equal(expected.earnedCount, 3);
assert.equal(expected.totalCount, 18);
assert.deepEqual(expected.entries.filter(entry => entry.source === "circuit").map(entry => entry.progress.current), [1, 1, 0, 0, 0]);
assert.deepEqual(["arcade", "circuit", "descent"].map(source => expected.entries.filter(entry => entry.source === source).length), [12, 5, 1]);
const emptyBytes = JSON.stringify(saves.createPitSave(OWNER));
const earnedBytes = JSON.stringify(earned);
const foreignBytes = JSON.stringify(clearArcade(saves.createPitSave(OTHER), "wolf", 8));
const errors = [], failures = [], cases = [];
const report = { passed: false, version: "V38", checkedAt: new Date().toISOString(), url: base,
  fixture: { mechanism: "real applyPitResult and descent reducers", earnedCount: 3, catalogueCount: 18,
    campaignSha256: digest(campaignBytes), pitSha256: digest(earnedBytes), earnedIds: expected.entries.filter(entry => entry.earned).map(entry => entry.id) },
  cases, errors, failures, limitations: ["Isolated synthetic profiles; no real user data read or modified.", "No physical controller or desktop package checked.", "This panel displays existing cosmetic rewards and does not award gameplay items."] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let activePage;
async function scenario(name, sidecarBytes, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: false });
  await context.addInitScript(({ campaignKey, campaignBytes, pitKey, sidecarBytes, otherKey, foreignBytes }) => {
    if (!/^https?:$/.test(location.protocol)) return;
    if (localStorage.getItem("v38-honors-qa-seeded") === null) {
      localStorage.setItem(campaignKey, campaignBytes);
      if (sidecarBytes !== null) localStorage.setItem(pitKey, sidecarBytes);
      localStorage.setItem(otherKey, foreignBytes);
      localStorage.setItem("v38-honors-qa-seeded", "unchanged");
    }
    window.__honorsWrites = [];
    window.__honorsStorageEvents = [];
    window.addEventListener("storage", event => window.__honorsStorageEvents.push({ key: event.key, trusted: event.isTrusted, length: event.newValue?.length ?? null }));
    for (const method of ["setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.__honorsWrites.push({ method, key: args[0] ?? null });
        return original.apply(this, args);
      };
    }
  }, { campaignKey: campaign.SAVE_STORAGE_KEY, campaignBytes, pitKey: key, sidecarBytes, otherKey, foreignBytes });
  context.on("page", current => {
    current.on("pageerror", error => errors.push({ case: name, error: error.message }));
    current.on("response", response => { if (response.status() >= 400) failures.push({ case: name, url: response.url(), status: response.status() }); });
    current.on("requestfailed", request => { const error = request.failure()?.errorText ?? "unknown"; if (!error.includes("ERR_ABORTED")) failures.push({ case: name, url: request.url(), error }); });
  });
  const page = await context.newPage(); activePage = page;
  page.setDefaultTimeout(20_000);
  await page.goto(base, { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('[data-game-content-version="V38"]').waitFor();
  const snapshot = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
  const before = await snapshot();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "Accès rapide aux installations", exact: true }).click();
  await page.locator("summary", { hasText: "Accès direct aux interfaces · sans déplacement du chasseur" }).click();
  await page.getByRole("navigation", { name: "Accès alternatif aux interfaces, la position du chasseur est conservée" }).getByRole("button", { name: /Troph/i }).click();
  const panel = page.locator('[data-pit-honors="v38"]');
  await panel.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-pit-honors="v38"]')?.getAttribute("data-honors-status") !== "loading");
  assert.equal(await page.evaluate(k => localStorage.getItem(k), campaign.SAVE_STORAGE_KEY), campaignBytes, "Visiting the ship must preserve campaign bytes.");
  const verifyReadOnly = async () => {
    assert.equal(await snapshot(), before, `${name}: consultation changes no stored bytes.`);
    assert.deepEqual(await page.evaluate(() => window.__honorsWrites), [], `${name}: no write-and-restore is allowed.`);
  };
  return { context, page, panel, before, snapshot, verifyReadOnly };
}
async function checkCards(panel, entries) {
  assert.equal(await panel.locator("[data-pit-honor]").count(), entries.length);
  for (const entry of entries) {
    const card = panel.locator('[data-pit-honor="' + entry.id + '"]');
    assert.equal(await card.getAttribute("data-earned"), String(entry.earned));
    assert.equal(await card.getByRole("heading", { level: 3 }).innerText(), entry.label);
    assert((await card.innerText()).includes(entry.condition), `Condition must be complete: ${entry.id}`);
    const progress = await card.locator("progress").evaluate(node => ({ value: node.value, max: node.max, label: node.getAttribute("aria-label") }));
    assert.deepEqual(progress, { value: entry.progress.current, max: entry.progress.total, label: entry.label + " · " + entry.progress.label });
    if (entry.palette) assert.deepEqual(await card.locator('[aria-label="Couleurs de la distinction"] span').evaluateAll(nodes => nodes.map(node => node.title)), Object.values(entry.palette));
  }
}
try {
  const ready = await scenario("earned-desktop-mobile", earnedBytes);
  assert.equal(await ready.panel.getAttribute("data-honors-status"), "ready");
  assert.match(await ready.panel.innerText(), /3 \/ 18/);
  await checkCards(ready.panel, expected.entries.filter(entry => entry.earned));
  await ready.panel.screenshot({ path: path.join(output, "earned-desktop.png") });
  const filter = ready.panel.getByRole("checkbox", { name: "Seulement les distinctions obtenues", exact: true });
  await filter.uncheck();
  await checkCards(ready.panel, expected.entries);
  await ready.page.setViewportSize({ width: 390, height: 844 });
  await ready.panel.evaluate(node => { for (let parent = node.parentElement; parent; parent = parent.parentElement) parent.scrollTop = 0; });
  assert(await ready.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "390px page has no horizontal overflow.");
  const bounds = await ready.panel.locator("[data-pit-honor]").evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
  assert(bounds.every(rect => rect.left >= 0 && rect.right <= 391), "All 18 mobile cards fit horizontally.");
  assert(Math.max(...bounds.map(rect => rect.left)) - Math.min(...bounds.map(rect => rect.left)) < 1, "Mobile cards form one column.");
  await ready.page.screenshot({ path: path.join(output, "conditions-mobile.png"), fullPage: false });
  await filter.focus(); await filter.press("Space");
  await checkCards(ready.panel, expected.entries.filter(entry => entry.earned));
  await ready.verifyReadOnly();
  cases.push({ name: "earned-desktop-mobile", passed: true, earned: 3, conditions: 18, categories: [12, 5, 1], mobileWidth: 390, keyboardFilter: true, localStorageSha256: digest(ready.before), writes: 0 });
  await ready.context.close();

  for (const [name, raw, status, message] of [
    ["missing", null, "empty", /Aucune distinction obtenue/],
    ["empty", emptyBytes, "ready", /Aucune distinction obtenue/],
    ["corrupt", "{broken-pit-json", "corrupt-save", /endommagée/],
    ["wrong-owner", foreignBytes, "owner-conflict", /autre campagne/],
    ["future", JSON.stringify({ ...earned, version: 6 }), "future-version", /version plus récente/],
  ]) {
    const current = await scenario(name, raw);
    assert.equal(await current.panel.getAttribute("data-honors-status"), status);
    assert.match(await current.panel.innerText(), message);
    assert.equal(await current.panel.locator("[data-pit-honor]").count(), 0);
    if (name === "missing" || name === "empty") {
      assert.match(await current.panel.innerText(), /0 \/ 18/);
      await current.panel.getByRole("button", { name: "Voir les conditions", exact: true }).click();
      await checkCards(current.panel, honors.buildPitHonors(null, OWNER).entries);
    } else {
      await current.panel.getByRole("button", { name: "Réessayer la lecture", exact: true }).click();
      assert.equal(await current.panel.getAttribute("data-honors-status"), status);
      assert.equal(await current.panel.locator("[data-pit-honor]").count(), 0);
      assert.equal(await current.panel.getByRole("checkbox").count(), 0);
    }
    await current.panel.screenshot({ path: path.join(output, name + ".png") });
    await current.verifyReadOnly();
    cases.push({ name, passed: true, status, originalBytesPreserved: true, writes: 0, storageSha256: digest(current.before) });
    await current.context.close();
  }

  const cross = await scenario("native-cross-tab-storage", emptyBytes);
  const writer = await cross.context.newPage();
  await writer.goto(base, { waitUntil: "networkidle", timeout: 60_000 });
  await writer.locator('[data-game-content-version="V38"]').waitFor();
  await writer.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value: earnedBytes });
  await cross.page.waitForFunction(() => document.querySelectorAll('[data-pit-honors="v38"] [data-earned="true"]').length === 3);
  await checkCards(cross.panel, expected.entries.filter(entry => entry.earned));
  assert((await cross.page.evaluate(() => window.__honorsStorageEvents)).some(event => event.key === key && event.trusted), "Must receive a native browser storage event, not dispatchEvent.");
  const panelText = await cross.panel.innerText();
  await writer.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: otherKey, value: JSON.stringify(saves.createPitSave(OTHER)) });
  await cross.page.waitForFunction(k => window.__honorsStorageEvents.some(event => event.key === k), otherKey);
  assert.equal(await cross.panel.innerText(), panelText, "Another owner's updates do not expose or change this catalogue.");
  await writer.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value: foreignBytes });
  await cross.page.waitForFunction(() => document.querySelector('[data-pit-honors="v38"]')?.getAttribute("data-honors-status") === "owner-conflict");
  assert.equal(await cross.panel.locator("[data-pit-honor]").count(), 0, "Stale earned cards disappear after owner conflict.");
  await writer.evaluate(k => localStorage.removeItem(k), key);
  await cross.page.waitForFunction(() => document.querySelector('[data-pit-honors="v38"]')?.getAttribute("data-honors-status") === "empty");
  assert.match(await cross.panel.innerText(), /0 \/ 18/);
  assert.equal(await cross.page.evaluate(k => localStorage.getItem(k), campaign.SAVE_STORAGE_KEY), campaignBytes);
  assert.deepEqual(await cross.page.evaluate(() => window.__honorsWrites), [], "Observer tab never writes while reacting to external changes.");
  await cross.panel.screenshot({ path: path.join(output, "cross-tab-empty-recovery.png") });
  cases.push({ name: "native-cross-tab-storage", passed: true, nativeEvents: await cross.page.evaluate(() => window.__honorsStorageEvents), sequence: ["empty", "earned3", "foreign-key-ignored", "owner-conflict", "missing"], observerWrites: 0, campaignBytesPreserved: true, intentionalFixtureWritesOnlyInWriterTab: true });
  await cross.context.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  report.passed = true;
} catch (error) {
  report.error = String(error.stack || error);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, "verification.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
