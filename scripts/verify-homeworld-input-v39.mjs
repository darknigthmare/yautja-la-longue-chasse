import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = await fs.realpath(process.cwd());
const target = new URL(process.env.V39_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && !target.hash);
const base = target.href.replace(/\/+$/, "");
const expectedVersion = process.env.V39_QA_EXPECTED_VERSION || "V39";
const output = path.resolve(root, process.env.V39_HOMEWORLD_QA_OUTPUT || "work/v39/world-flow");
const relative = path.relative(root, output);
assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
let directory = root;
for (const part of relative.split(path.sep)) {
  directory = path.join(directory, part);
  await fs.mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const stat = await fs.lstat(directory);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && path.relative(directory, await fs.realpath(directory)) === "", "Output cannot traverse links.");
}
const errors = [], failures = [], checks = [];
const report = { passed: false, expectedVersion, checkedAt: new Date().toISOString(), url: base, checks, errors, failures,
  scope: "Real Homeworld component with virtual navigator.getGamepads input and controlled clock; no physical controller certification, no save injection." };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", entry => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.addInitScript(() => {
    window.__homeworldQaPad = { connected: false, id: "Homeworld V39 virtual QA", index: 0,
      axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [window.__homeworldQaPad] });
  });
  await page.clock.install();
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="' + expectedVersion + '"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "Yautja Prime · monde natal", exact: true }).click();
  const hub = page.locator("[data-homeworld-hub]");
  const city = page.getByRole("group", { name: "Cité jouable en perspective 2.5D", exact: true });
  await city.waitFor(); await city.focus();
  const position = () => page.locator("[data-homeworld-actor]").evaluate(element => ({ x: Number(element.dataset.x), y: Number(element.dataset.y) }));
  const sample = (x = 0, buttons = [], y = 0) => page.evaluate(({ x, y, buttons }) => {
    const pad = window.__homeworldQaPad; pad.connected = true; pad.axes = [x, y];
    pad.buttons.forEach((button, index) => { button.pressed = buttons.includes(index); button.touched = button.pressed; button.value = Number(button.pressed); });
  }, { x, y, buttons });
  const tick = (ms = 100) => page.clock.runFor(ms);
  const release = async () => { await sample(); await tick(64); };
  const preserved = async (before, reason) => assert.deepEqual(await position(), before, reason);
  const noCityDialog = async () => assert.equal(await hub.getByRole("dialog").count(), 0);
  const saveIdentity = () => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("yautja-long-hunt.save"));
    return { createdAt: save.createdAt, profile: save.profile, inventory: save.inventory, trophies: save.trophies };
  });
  // Let the shell finish its entrance focus restoration before deliberately
  // granting control to the playable city, as a real click would do.
  await tick(180); await city.focus(); await tick(50);
  assert(await city.evaluate(element => document.activeElement === element), "City owns focus before gamepad tests");
  const beforeSave = await saveIdentity();
  const entry = await position();
  await sample(1, [0]); await tick(160);
  await preserved(entry, "Held A/stick must not act on initial focus"); await noCityDialog();
  await release(); await sample(1); await tick(110); await release();
  report.initialMovement = { entry, after: await position(), focus: await city.evaluate(element => ({ ownsFocus: document.activeElement === element, windowFocused: document.hasFocus(), hidden: document.hidden, activeTag: document.activeElement?.tagName, activeLabel: document.activeElement?.textContent?.slice(0,100), pad: navigator.getGamepads()[0] })) };
  assert(report.initialMovement.after.x > entry.x + 15, "An intentional new direction moves the actual actor");
  checks.push("Initial held stick/A blocked; neutral then a new direction moves the actor.");

  const focusedAt = await position();
  await page.getByRole("button", { name: "Carte galactique", exact: true }).focus();
  await sample(1); await tick(80);
  await page.evaluate(() => { window.__homeworldQaPad.buttons[0].pressed = true; document.querySelector('[role="group"][aria-label="Cité jouable en perspective 2.5D"]').focus(); });
  await tick(160); await preserved(focusedAt, "Held controls must not replay on return from external focus"); await noCityDialog();
  await release();
  checks.push("Returning focus with stick/A held neither walks nor opens a dialogue.");

  await sample(0, [0]); await tick(160);
  const dialogue = hub.getByRole("dialog"); await dialogue.waitFor();
  assert.equal(await dialogue.getByRole("button", { name: "Monter à bord", exact: true }).count(), 1);
  assert(await dialogue.isVisible(), "Holding the opening A cannot select a dialogue action");
  await release(); await sample(0, [12]); await tick(80);
  assert(await dialogue.getByRole("button", { name: "Revenir à la cité", exact: true }).evaluate(element => document.activeElement === element), "Up from the container selects its last enabled action");
  await release(); await sample(0, [13]); await tick(80);
  assert(await dialogue.getByRole("button", { name: "Monter à bord", exact: true }).evaluate(element => document.activeElement === element), "Down wraps to the first action");
  const dialogueAt = await position();
  await release(); await sample(1, [1]); await tick(160);
  await dialogue.waitFor({ state: "hidden" }); await preserved(dialogueAt, "B close cannot leak its held direction into walking");
  await release();
  checks.push("Real ship dialogue opens once, Up/Down wrap correctly, B closes without leaking movement.");

  await sample(0, [9]); await tick(160);
  await hub.getByRole("button", { name: "Reprendre l’exploration", exact: true }).waitFor();
  const pausedAt = await position();
  await release(); await sample(0, [9]); await tick(80);
  await hub.getByRole("button", { name: "Reprendre l’exploration", exact: true }).waitFor({ state: "hidden" });
  await sample(1, [9]); await tick(160); await preserved(pausedAt, "Held Start/direction must not repeat or move on resume");
  await release(); await sample(-1); await tick(100); await release();
  assert((await position()).x < pausedAt.x - 10);
  checks.push("Start pauses/resumes after release; held Start and direction stay blocked until the next intentional input.");

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await tick(80);
  await hub.getByRole("button", { name: "Reprendre l’exploration", exact: true }).waitFor();
  await release(); await sample(0, [9]); await tick(100);
  await hub.getByRole("button", { name: "Reprendre l’exploration", exact: true }).waitFor({ state: "hidden" });
  await release();
  checks.push("Window-blur inactivity resumes with one deliberate Start press after release.");
  const serviceAt = await position();
  await page.getByRole("button", { name: /^Dossier ·/ }).click();
  await page.getByRole("heading", { name: "Dossier des Enforcers", exact: true }).waitFor();
  await sample(1); await tick(160); await preserved(serviceAt, "Mounted city is suspended behind its service");
  await page.getByRole("button", { name: "Fermer le dossier", exact: true }).click();
  await city.focus(); await tick(160); await preserved(serviceAt, "Service return requires neutral before movement");
  await noCityDialog();
  await release(); await sample(1); await tick(110); await release();
  assert((await position()).x > serviceAt.x + 15);
  assert.deepEqual(await saveIdentity(), beforeSave, "Control transitions cannot change profile, inventory or trophies");
  checks.push("Actual Enforcer service opens/closes without losing position or replaying a held direction; progression/inventory/trophies unchanged.");
  await page.screenshot({ path: path.join(output, "homeworld-controls-1280.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await tick(100);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px overflow");
  await page.screenshot({ path: path.join(output, "homeworld-controls-390.png"), fullPage: true });
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  report.passed = true; console.log(JSON.stringify({ passed: true, checks, output }));
} catch (error) {
  report.failure = String(error?.stack || error);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
