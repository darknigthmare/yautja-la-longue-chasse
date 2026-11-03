import { returnPitSelection, openPitLaboratory } from "./pit-selection-browser-helpers.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

// Fresh profile only. This exercises the shipped callbacks, not a second input implementation.
const root = await fs.realpath(process.cwd());
const target = new URL(process.env.V40_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && !target.hash);
const output = path.resolve(root, process.env.V40_CONTROLS_QA_OUTPUT || "work/v40/pit-controls-qa");
const relative = path.relative(root, output);
assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
let directory = root;
for (const part of relative.split(path.sep)) {
  directory = path.join(directory, part);
  await fs.mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const info = await fs.lstat(directory);
  assert(info.isDirectory() && !info.isSymbolicLink() && path.relative(directory, await fs.realpath(directory)) === "");
}
const report = { passed: false, version: "V40", checkedAt: new Date().toISOString(), url: target.href,
  input: "virtual-standard-gamepads-and-real-DOM-callbacks", physicalControllerCertified: false, checks: [], errors: [], failures: [] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, acceptDownloads: false });
  await context.addInitScript(() => {
    if (location.protocol.startsWith("http") && localStorage.getItem("yautja-long-hunt.save") === null) localStorage.setItem("yautja-long-hunt.save", JSON.stringify({
      version: 7, createdAt: "2026-09-19T12:00:00.000Z", updatedAt: "2026-09-19T12:00:00.000Z",
      profile: { hunterName: "Controls QA V40", rankId: "elder", honor: 1900, clanMarks: 83, playTimeSeconds: 4321 },
      missionProgress: {}, statistics: { missionsStarted: 19, missionsCompleted: 17, missionsFailed: 2 },
      settings: { difficultyId: "hunter", masterVolume: 0, musicVolume: 0, effectsVolume: 0 },
    }));
    window.__controlsPads = [null, null, null, null];
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => window.__controlsPads });
  });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => report.errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) report.failures.push({ url: response.url(), status: response.status() }); });
  page.on("requestfailed", request => {
    if (!request.failure()?.errorText.includes("ERR_ABORTED")) report.failures.push({ url: request.url(), error: request.failure()?.errorText });
  });
  await page.goto(target.href, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="V40"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  const storage = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
  const before = await storage();
  assert.match(before, /Controls QA V40/);
  await page.evaluate(() => {
    window.__controlsWrites = [];
    for (const method of ["setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.__controlsWrites.push({ method, key: args[0] ?? null });
        return original.apply(this, args);
      };
    }
  });
  const connect = (slot, id, heldButton = -1) => page.evaluate(({ slot, id, heldButton }) => {
    window.__controlsPads[slot] = { id, index: slot, connected: true, mapping: "standard", axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: index === heldButton, touched: index === heldButton, value: Number(index === heldButton) })) };
  }, { slot, id, heldButton });
  const disconnect = slot => page.evaluate(slot => {
    const gamepad = window.__controlsPads[slot];
    window.__controlsPads[slot] = null;
    const event = new Event("gamepaddisconnected");
    Object.defineProperty(event, "gamepad", { value: { ...gamepad, connected: false } });
    window.dispatchEvent(event);
  }, slot);
  const button = (slot, index, pressed) => page.evaluate(({ slot, index, pressed }) => {
    window.__controlsPads[slot].buttons[index] = { pressed, touched: pressed, value: Number(pressed) };
  }, { slot, index, pressed });
  const tapPad = async (slot, index) => {
    await button(slot, index, true); await page.waitForTimeout(140); await button(slot, index, false);
  };
  const rootCombat = () => page.getByRole("region", { name: "Combat THE PIT", exact: true });
  const waitIdle = () => page.waitForFunction(() => {
    const bars = [...document.querySelectorAll('[role="progressbar"][aria-label^="Vie de "]')];
    return bars.length === 2 && bars.every(bar => bar.previousElementSibling?.querySelector("span")?.textContent === "IDLE");
  });
  const watchPhases = async () => {
    await page.evaluate(() => {
      window.__controlsObserver?.disconnect();
      window.__controlsPhases = [[], []];
      const sample = () => [...document.querySelectorAll('[role="progressbar"][aria-label^="Vie de "]')].forEach((bar, player) => {
        const phase = bar.previousElementSibling?.querySelector("span")?.textContent;
        if (phase && phase !== "IDLE" && !window.__controlsPhases[player].includes(phase)) window.__controlsPhases[player].push(phase);
      });
      window.__controlsObserver = new MutationObserver(sample);
      window.__controlsObserver.observe(document.querySelector('[aria-label="Combat THE PIT"]'), { subtree: true, childList: true, characterData: true });
      sample();
    });
  };
  const expectAttack = async (player, action) => {
    await waitIdle(); await watchPhases(); await action();
    await page.waitForFunction(player => window.__controlsPhases[player].includes("ACTIVE"), player);
    await waitIdle();
    const phases = await page.evaluate(() => window.__controlsPhases);
    assert(phases[player].includes("STARTUP"));
    assert.deepEqual(phases[1 - player], [], "The other fighter must not inherit this input.");
    return phases;
  };
  const choose = async mode => {
    await page.getByRole("radio", { name: new RegExp("^" + mode) }).click();
    await page.getByRole("combobox", { name: "Combattant joueur", exact: true }).selectOption("jungle-hunter");
    await page.getByRole("combobox", { name: "Adversaire", exact: true }).selectOption("berserker");
  };
  const waitCombat = async () => {
    await rootCombat().waitFor();
    await page.locator('canvas[data-pit-arena-art-status="bitmap"]').waitFor({ timeout: 60000 });
    await waitIdle(); await page.waitForTimeout(150);
  };
  const lab = () => page.getByRole("complementary", { name: "Laboratoire d’entraînement", exact: true });
  const openLab = async () => {
    await openPitLaboratory(page);
    await lab().waitFor();
  };

  // selectOption can force a disabled option; the real onChange must still reject it.
  for (const fighterId of ["machiko-noguchi", "scar"]) {
    await choose("Versus local");
    const playerSelect = page.getByRole("combobox", { name: "Combattant joueur", exact: true });
    const opponentSelect = page.getByRole("combobox", { name: "Adversaire", exact: true });
    await playerSelect.selectOption(fighterId);
    await opponentSelect.selectOption("theta");
    assert(await opponentSelect.locator('option[value="' + fighterId + '"]').evaluate(option => option.disabled));
    await opponentSelect.selectOption(fighterId);
    await page.waitForFunction(expected => document.querySelector('select[aria-label="Adversaire"]')?.value === expected, "theta");
    await page.getByText("Choisissez un adversaire différent du combattant joueur.", { exact: true }).last().waitFor();
    await page.getByRole("button", { name: /^ENTRER DANS L’ARÈNE/ }).click();
    await waitCombat();
    const actual = await page.locator("[data-pit-bitmap-id]").evaluateAll(elements => elements.map(element => element.dataset.pitBitmapId));
    assert.deepEqual(actual, [fighterId, "theta"]);
    report.checks.push({ name: "identical-opponent-rejected", fighterId, validOpponentPreserved: "theta", enteredCombat: true });
    await returnPitSelection(page);
  }
  // Changing J1 to the current J2 must move the other side to a distinct selection.
  await page.getByRole("combobox", { name: "Adversaire", exact: true }).selectOption("theta");
  await page.getByRole("combobox", { name: "Combattant joueur", exact: true }).selectOption("theta");
  assert.notEqual(await page.getByRole("combobox", { name: "Adversaire", exact: true }).inputValue(), "theta");
  report.checks.push({ name: "changing-J1-preserves-distinct-opponent", fighterId: "theta" });

  await connect(2, "V40 first sparse pad");
  await choose("Entraînement"); await page.waitForTimeout(180); await tapPad(2, 0); await waitCombat();
  await openLab();
  await lab().getByRole("combobox", { name: "Comportement du mannequin", exact: true }).selectOption("idle");
  const firstAttack = await expectAttack(0, () => tapPad(2, 2));
  report.checks.push({ name: "sparse-pad-menu-to-combat", browserSlot: 2, role: "J1", phases: firstAttack });

  for (const panel of ["commands-pointer", "laboratory-keyboard", "commands-touch"]) {
    const commands = panel.startsWith("commands");
    if (commands) {
      const open = page.getByRole("button", { name: "Commandes", exact: true });
      if (await open.count()) await open.click();
    } else await openLab();
    await rootCombat().focus();
    await page.keyboard.down("KeyI"); // Keep guard physically down: closing must purge it before light attack.
    await page.waitForTimeout(150);
    const close = page.getByRole("button", { name: commands ? "Masquer les commandes" : "Masquer le laboratoire", exact: true });
    if (panel.endsWith("keyboard")) { await close.focus(); await page.keyboard.press("Enter"); }
    else if (panel.endsWith("touch")) { await page.setViewportSize({ width: 390, height: 844 }); await close.tap(); }
    else await close.click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Combat THE PIT");
    let phases;
    try { phases = await expectAttack(0, () => page.keyboard.press("KeyJ", { delay: 120 })); }
    finally { await page.keyboard.up("KeyI"); }
    report.checks.push({ name: panel, focusRestored: true, heldGuardPurged: true, phases });
    if (panel.endsWith("touch")) {
      await page.screenshot({ path: path.join(output, "mobile-panel-focus.png"), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
  }

  await openLab();
  const summary = lab().locator("summary", { hasText: "Exercices guidés" });
  if (await summary.locator("..").getAttribute("open") === null) await summary.click();
  await lab().getByRole("button", { name: "Garde basse", exact: true }).click();
  await page.locator('[data-training-briefing="ready"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(150);
  assert.equal(await page.locator("[data-pit-frame]").getAttribute("data-pit-frame"), "0");
  await tapPad(2, 0);
  await lab().locator('[data-status="running"]').waitFor();
  report.checks.push({ name: "sparse-pad-briefing", browserSlot: 2, explicitStart: true });
  await disconnect(2);
  await returnPitSelection(page);

  await connect(1, "V40 local J1"); await connect(3, "V40 local J2");
  await choose("Versus local"); await page.waitForTimeout(150); await tapPad(1, 0); await waitCombat();
  const localOne = await expectAttack(0, () => tapPad(1, 2));
  const localTwo = await expectAttack(1, () => tapPad(3, 2));
  await disconnect(1); await page.waitForTimeout(150);
  const survived = await expectAttack(1, () => tapPad(3, 2));
  report.checks.push({ name: "two-sparse-pads-and-J1-loss", J1slot: 1, J2slot: 3, localOne, localTwo, afterDisconnect: survived, noRolePromotion: true });
  await watchPhases();
  await connect(1, "V40 local J1", 2);
  await page.waitForTimeout(750);
  assert.deepEqual(await page.evaluate(() => window.__controlsPhases), [[], []], "A held attack after reconnect must wait for neutral input.");
  await button(1, 2, false); await page.waitForTimeout(160);
  const reconnected = await expectAttack(0, () => tapPad(1, 2));
  await disconnect(3); await page.waitForTimeout(150);
  const loneFirst = await expectAttack(0, () => tapPad(1, 2));
  report.checks.push({ name: "reconnect-and-J2-loss", heldInputSuppressed: true, reconnected, afterJ2Disconnect: loneFirst });
  await page.screenshot({ path: path.join(output, "local-roles.png"), fullPage: true });

  await disconnect(1); await connect(3, "V40 local J2");
  await returnPitSelection(page);
  await choose("Entraînement"); await page.waitForTimeout(150); await tapPad(3, 0); await waitCombat();
  const reassigned = await expectAttack(0, () => tapPad(3, 2));
  report.checks.push({ name: "explicit-selection-reassigns-roles", newJ1slot: 3, phases: reassigned });
  assert.equal(await storage(), before, "Opening panels, training and unfinished local duels must preserve the existing save.");
  assert.deepEqual(await page.evaluate(() => window.__controlsWrites), []);
  report.checks.push({ name: "existing-save-unchanged", localStorageWrites: 0 });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []);
  report.passed = true;
} catch (error) {
  report.error = error.stack || String(error);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  await fs.writeFile(path.join(output, "browser-qa.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
