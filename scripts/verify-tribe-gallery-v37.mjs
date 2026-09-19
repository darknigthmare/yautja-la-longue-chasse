import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";

// Against a server already started by the release owner; no build or fixture server.
const projectRoot = await fs.realpath(process.cwd());
const parsedBase = new URL(process.env.V37_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(parsedBase.protocol) && !parsedBase.username && !parsedBase.password && !parsedBase.search && !parsedBase.hash,
  "V37_QA_URL must be a plain HTTP(S) application URL.");
const base = parsedBase.href.replace(/\/+$/, "");
const output = path.resolve(projectRoot, process.env.V37_TRIBE_QA_OUTPUT || "work/v37/tribe-gallery-qa");
const relativeOutput = path.relative(projectRoot, output);
assert(relativeOutput && !relativeOutput.startsWith("..") && !path.isAbsolute(relativeOutput), "QA output must remain inside this workspace.");
let verifiedDirectory = projectRoot;
for (const part of relativeOutput.split(path.sep)) {
  verifiedDirectory = path.join(verifiedDirectory, part);
  await fs.mkdir(verifiedDirectory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const info = await fs.lstat(verifiedDirectory);
  assert(info.isDirectory() && !info.isSymbolicLink() && path.relative(verifiedDirectory, await fs.realpath(verifiedDirectory)) === "",
    "QA output must not traverse symbolic links or junctions.");
}
const catalogue = JSON.parse(await fs.readFile(path.join(projectRoot, "app/game/tribeArtV37.json"), "utf8"));
assert.equal(catalogue.assets.length, 204, "This V37 source import must contain exactly 204 unique assets.");
assert.equal(new Set(catalogue.assets.map(asset => asset.id)).size, 204);
const countsByPack = Object.fromEntries(catalogue.packs.map(pack => [pack.id, catalogue.assets.filter(asset => asset.pack === pack.id).length]));
assert.deepEqual(countsByPack, { V2: 119, V3: 45, V4: 40 });
for (const asset of catalogue.assets) {
  assert(catalogue.packs.some(pack => pack.id === asset.pack) && catalogue.kinds.some(kind => kind.id === asset.kind), `Unknown pack/kind: ${asset.id}`);
  for (const src of [asset.src, asset.thumbnailSrc]) assert(/^\/game\/[a-zA-Z0-9_./-]+\.webp$/.test(src) && !src.split("/").includes(".."), `Unexpected public source path: ${asset.id}`);
  assert(asset.width > 0 && asset.height > 0 && asset.label && asset.sourceName);
}
const SAVE_KEY = "yautja-long-hunt.save";
// Valid partial V7 campaign: loadSave normalizes defaults in memory, never on disk.
// Deliberately isolated from all user profiles, real saves and private source packs.
const fixture = { version: 7, createdAt: "2026-09-19T12:00:00.000Z", updatedAt: "2026-09-19T12:00:00.000Z",
  profile: { hunterName: "Galerie QA V37", rankId: "elder", honor: 1900, clanMarks: 83, playTimeSeconds: 4321 },
  missionProgress: {}, statistics: { missionsStarted: 19, missionsCompleted: 17, missionsFailed: 2 },
  settings: { difficultyId: "hunter", masterVolume: 0, musicVolume: 0, effectsVolume: 0 } };
const digest = text => createHash("sha256").update(text).digest("hex");
const fold = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
const pageSize = 12;
const errors = [], failedResponses = [], failedRequests = [], checkedPages = [], checkedFilters = [], fullResolutionChecks = [];
const loadedThumbnails = new Set();
const report = { passed: false, checkedAt: new Date().toISOString(), url: base, version: "V37", sourceCount: catalogue.assets.length,
  countsByPack, fixture: "isolated-partial-v7-read-only", checkedPages, checkedFilters, fullResolutionChecks,
  errors, failedResponses, failedRequests };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  await context.addInitScript(({ key, save }) => {
    if (location.protocol !== "http:" && location.protocol !== "https:") return;
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(save));
      localStorage.setItem("v37-tribe-qa-sentinel", "unchanged");
    }
    window.__tribeStorageWrites = [];
    for (const method of ["setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.__tribeStorageWrites.push({ method, key: args[0] ?? null });
        return original.apply(this, args);
      };
    }
  }, { key: SAVE_KEY, save: fixture });
  const attached = new WeakSet();
  const observePage = current => {
    if (attached.has(current)) return; attached.add(current);
    current.on("pageerror", error => errors.push(error.message));
    current.on("response", response => { if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() }); });
    current.on("requestfailed", request => {
      const error = request.failure()?.errorText ?? "unknown";
      if (!error.includes("ERR_ABORTED")) failedRequests.push({ url: request.url(), error });
    });
  };
  context.on("page", observePage);
  page = await context.newPage(); observePage(page);
  page.setDefaultTimeout(20000);
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="V37"]').waitFor();
  await page.getByRole("button", { name: "Dossier de campagne", exact: true }).waitFor();
  const storageSnapshot = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
  const before = await storageSnapshot();
  assert.equal(JSON.parse(before)[SAVE_KEY], JSON.stringify(fixture), "Isolated fixture bytes must load unchanged.");
  await page.evaluate(() => { window.__tribeStorageWrites = []; });
  await page.getByRole("button", { name: "Dossier de campagne", exact: true }).click();
  const panel = page.locator('[data-clan-chronicle="design-v37"]');
  await panel.waitFor();
  await panel.locator('[data-chronicle-legacy-rank="elder"]').waitFor();
  assert.match(await panel.innerText(), /Galerie QA V37/);
  assert.match(await panel.innerText(), /1900 honneur/);
  await panel.getByRole("button", { name: "Mondes et réserves", exact: true }).click();
  const gallery = panel.locator('[data-tribe-source-gallery="v37"]');
  await gallery.waitFor();
  assert.match(await gallery.innerText(), /204 images uniques importées/);
  assert.match(await gallery.innerText(), /ne débloque aucun niveau/);
  const search = gallery.getByRole("searchbox");
  const kinds = gallery.getByRole("combobox", { name: "Type d’image", exact: true });
  const packs = gallery.getByRole("combobox", { name: "Pack source", exact: true });
  const cards = gallery.locator("[data-tribe-asset]");
  const counts = gallery.getByRole("status").filter({ hasText: /image\(s\).*page/ });
  const previous = gallery.getByRole("button", { name: "Page précédente", exact: true });
  const next = gallery.getByRole("button", { name: "Page suivante", exact: true });
  const cardFor = id => gallery.locator(`[data-tribe-asset=${JSON.stringify(id)}]`);
  const expectedResults = ({ kind = "", pack = "", query = "" } = {}) => catalogue.assets.filter(asset => (!kind || asset.kind === kind) &&
    (!pack || asset.pack === pack) && fold(`${asset.label} ${asset.subject} ${asset.category} ${asset.sourceName}`).includes(fold(query.trim())));
  async function assertCount(expected, currentPage = 1) {
    const text = `${expected} image(s) · page ${expected ? currentPage : 0} sur ${Math.ceil(expected / pageSize)}`;
    await counts.filter({ hasText: text }).waitFor();
    assert.equal((await counts.innerText()).replace(/\s+/g, " ").trim(), text);
    assert.equal(await cards.count(), Math.min(pageSize, Math.max(0, expected - (currentPage - 1) * pageSize)));
  }
  async function imageReady(locator, src) {
    await locator.scrollIntoViewIfNeeded();
    await locator.evaluate(async (image, expected) => {
      if (image.src !== expected) throw Error(`Wrong image source: ${image.src}`);
      let timer;
      try { await Promise.race([image.decode(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("Image decoding timed out")), 20000); })]); }
      finally { clearTimeout(timer); }
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) throw Error(`Undecoded image: ${expected}`);
    }, new URL(src, base).href);
    return locator.evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight, src: image.currentSrc }));
  }
  async function loadVisible(expectedAssets) {
    assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.tribeAsset)), expectedAssets.map(asset => asset.id));
    for (const asset of expectedAssets) {
      await imageReady(cardFor(asset.id).locator("img"), asset.thumbnailSrc);
      loadedThumbnails.add(asset.id);
    }
  }
  async function setFilters(values = {}) {
    await search.fill(values.query ?? "");
    await kinds.selectOption(values.kind ?? "");
    await packs.selectOption(values.pack ?? "");
    const matches = expectedResults(values);
    await assertCount(matches.length);
    return matches;
  }
  await assertCount(204);
  assert.equal(await previous.isDisabled(), true);
  for (let index = 0; index < Math.ceil(catalogue.assets.length / pageSize); index++) {
    await assertCount(204, index + 1);
    const expected = catalogue.assets.slice(index * pageSize, (index + 1) * pageSize);
    await loadVisible(expected);
    const selectedImage = gallery.locator("[data-tribe-selected] img");
    const dimensions = await imageReady(selectedImage, expected[0].src);
    assert.deepEqual([dimensions.width, dimensions.height], [expected[0].width, expected[0].height]);
    checkedPages.push({ page: index + 1, ids: expected.map(asset => asset.id), thumbnailsDecoded: expected.length });
    if (index === 0) await gallery.screenshot({ path: path.join(output, "gallery-desktop.png") });
    if (index < 16) { assert.equal(await next.isEnabled(), true); await next.click(); }
  }
  assert.equal(await next.isDisabled(), true);
  assert.equal(loadedThumbnails.size, 204);
  assert.equal(checkedPages.length, 17);
  for (const pack of catalogue.packs) {
    const matches = await setFilters({ pack: pack.id });
    assert.equal(matches.length, countsByPack[pack.id]);
    await loadVisible(matches.slice(0, pageSize));
    checkedFilters.push({ type: "pack", id: pack.id, count: matches.length });
  }
  for (const kind of catalogue.kinds) {
    const matches = await setFilters({ kind: kind.id });
    assert(matches.length > 0, `Empty declared category: ${kind.id}`);
    await loadVisible(matches.slice(0, pageSize));
    checkedFilters.push({ type: "kind", id: kind.id, count: matches.length });
  }
  const mycora = await setFilters({ query: "Mycora" });
  assert(mycora.length > 0, "Expected provided Mycora source art.");
  await loadVisible(mycora.slice(0, pageSize));
  checkedFilters.push({ type: "query", query: "Mycora", count: mycora.length });
  const first = cardFor(mycora[0].id);
  await first.focus(); await first.press("Enter");
  assert.equal(await first.getAttribute("aria-pressed"), "true");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-tribe-asset")), mycora[0].id);
  await gallery.screenshot({ path: path.join(output, "mycora-desktop.png") });
  const combinedPack = mycora[0].pack;
  const combined = await setFilters({ query: "mycora", pack: combinedPack, kind: mycora[0].kind });
  assert(combined.length > 0 && combined.every(asset => asset.pack === combinedPack && asset.kind === mycora[0].kind));
  checkedFilters.push({ type: "combined", query: "mycora", pack: combinedPack, kind: mycora[0].kind, count: combined.length });
  await setFilters({ query: "no-such-tribe-v37-qa-204" });
  assert.equal(await gallery.locator("[data-tribe-selected]").count(), 0, "Empty filters must remove stale preview.");
  await gallery.getByRole("button", { name: "Réinitialiser les filtres", exact: true }).click();
  await assertCount(204);
  assert.equal(await search.inputValue(), ""); assert.equal(await kinds.inputValue(), ""); assert.equal(await packs.inputValue(), "");

  const candidates = [catalogue.assets.find(asset => asset.kind === "nature"),
    catalogue.assets.find(asset => asset.kind === "homeworld-character"),
    catalogue.assets.find(asset => asset.kind === "flora"),
    catalogue.assets.find(asset => asset.kind === "objects")].filter(Boolean);
  assert(candidates.some(asset => asset.kind === "nature"), "Nature category must have a full-resolution sample.");
  for (const asset of candidates) {
    await setFilters({ pack: asset.pack, kind: asset.kind });
    await cardFor(asset.id).focus(); await cardFor(asset.id).press("Enter");
    await gallery.locator(`[data-tribe-selected=${JSON.stringify(asset.id)}]`).waitFor();
    const full = gallery.locator("[data-tribe-selected] img");
    const image = await imageReady(full, asset.src);
    assert.deepEqual([image.width, image.height], [asset.width, asset.height]);
    const alpha = await full.evaluate(image => {
      const scale = Math.min(1, 320 / image.naturalWidth, 220 / image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw Error("Missing 2D context for alpha verification.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let minAlpha = 255, maxAlpha = 0;
      for (let i = 3; i < bytes.length; i += 4) { minAlpha = Math.min(minAlpha, bytes[i]); maxAlpha = Math.max(maxAlpha, bytes[i]); }
      canvas.width = 0; canvas.height = 0;
      return { minAlpha, maxAlpha, resampledForInspection: true };
    });
    const link = gallery.getByRole("link", { name: "Ouvrir en pleine résolution", exact: true });
    assert.equal(await link.getAttribute("href"), asset.src);
    const opened = page.waitForEvent("popup");
    opened.catch(() => {});
    await link.focus(); await link.press("Enter");
    const popup = await opened;
    try {
      await popup.waitForLoadState("domcontentloaded");
      assert.equal(new URL(popup.url()).pathname, asset.src);
      const nativeImage = popup.locator("img").first();
      const dimensions = await imageReady(nativeImage, asset.src);
      assert.deepEqual([dimensions.width, dimensions.height], [asset.width, asset.height]);
    } finally { await popup.close(); }
    await gallery.locator("[data-tribe-selected]").screenshot({ path: path.join(output, `full-${asset.kind}.png`) });
    fullResolutionChecks.push({ id: asset.id, kind: asset.kind, src: asset.src, width: image.width, height: image.height,
      nativePopupOpened: true, alpha });
  }
  assert(fullResolutionChecks.some(entry => entry.alpha.minAlpha < 255 && entry.alpha.maxAlpha > 0), "At least one real full-resolution asset must preserve alpha.");
  await page.setViewportSize({ width: 390, height: 844 });
  await setFilters({ query: "Mycora" });
  await loadVisible(mycora.slice(0, pageSize));
  const mobile = await page.evaluate(() => {
    const gallery = document.querySelector('[data-tribe-source-gallery="v37"]');
    const bounds = gallery.getBoundingClientRect();
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      galleryLeft: bounds.left, galleryRight: bounds.right,
      controls: [...gallery.querySelectorAll("input,select,button,a")].map(node => ({ label: node.textContent?.trim().slice(0, 60),
        left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })) };
  });
  assert(mobile.documentWidth <= 391 && mobile.bodyWidth <= 391 && mobile.galleryLeft >= -1 && mobile.galleryRight <= 391, "390px page/gallery horizontal overflow.");
  assert(mobile.controls.every(control => control.left >= -1 && control.right <= 391), "390px gallery controls overflow.");
  await gallery.screenshot({ path: path.join(output, "gallery-mobile-390.png") });
  report.mobile = { ...mobile, noHorizontalOverflow: true };
  await panel.getByRole("button", { name: "Retour au menu", exact: true }).click();
  await page.getByRole("button", { name: "Jouer", exact: true }).waitFor();
  const after = await storageSnapshot();
  const storageWrites = await page.evaluate(() => window.__tribeStorageWrites);
  assert.equal(after, before, "Gallery consultation must preserve every localStorage byte.");
  assert.deepEqual(storageWrites, [], "A read-only gallery must not write and later restore save bytes.");
  report.storage = { beforeSha256: digest(before), afterSha256: digest(after), unchanged: true, writesObserved: storageWrites };
  report.uniqueThumbnailsDecoded = loadedThumbnails.size;
  report.boundedCardsPerPage = pageSize;
  report.keyboardSelectionAndFullResolutionLink = true;
  assert.deepEqual(errors, []); assert.deepEqual(failedResponses, []); assert.deepEqual(failedRequests, []);
  report.passed = true;
  report.limitations = ["Uses an isolated browser and a QA campaign, not user saves.", "No physical controller, gameplay unlock or animation coverage claim.",
    "Full-resolution WebP and browser alpha sampled here; complete source PNG/RGBA equality belongs to the separate import audit."];
} catch (error) {
  report.error = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) {
    report.failureUrl = page.url();
    await page.screenshot({ path: path.join(output, "failure.png") }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  try {
    await fs.writeFile(path.join(output, "browser-qa.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
}
