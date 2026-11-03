import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

// Use the real menu, order handlers, resolver and browser storage in a fresh
// browser context. No campaign or strategic state is injected by this check.
const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = path.resolve(process.env.YAUTJA_ATLAS_QA_OUTPUT ?? "outputs/qa-clan-war-atlas-v95");
const key = "yautja.clan-war.v85.free.v1";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium",
  headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [], checks = [];
page.on("pageerror", error => errors.push(error.message));
const check = (name, condition) => { assert(condition, name); checks.push(name); };
const state = () => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey) ?? "null"), key);
const waitState = (predicate, value) => page.waitForFunction(({ storageKey, predicate, value }) => {
  const current = JSON.parse(localStorage.getItem(storageKey) ?? "null");
  if (!current) return false;
  if (predicate === "orders") return current.orders.length === value;
  if (predicate === "turn") return current.turn === value;
  return false;
}, { storageKey: key, predicate, value });
async function enter() {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.getByRole("button", { name: /^Guerres des clans/ }).click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.getByTestId("clan-war-atlas-v95").waitFor();
}
async function resolveTurn(expected) {
  await page.getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
  await page.getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
  await waitState("turn", expected);
}
try {
  await enter();
  const atlas = page.getByTestId("clan-war-atlas-v95");
  const command = page.getByRole("complementary", { name: "Commandement du territoire", exact: true });
  check("the real menu opens the interactive globe", await atlas.getByRole("button", { name: "◎ Globe", exact: true }).getAttribute("aria-pressed") === "true");
  await atlas.screenshot({ path: path.join(output, "desktop-globe.png") });
  await atlas.getByRole("button", { name: "Tourner vers l’est", exact: true }).click();
  await atlas.getByRole("button", { name: "Centrer la sélection", exact: true }).click();
  await atlas.getByRole("button", { name: "▱ Planisphère", exact: true }).click();
  const zones = atlas.locator("svg").getByRole("button");
  check("the planisphere exposes all 36 real territories", await zones.count() === 36);
  await atlas.getByLabel("Routes", { exact: true }).check();
  await atlas.getByRole("button", { name: "2 · Cible voisine", exact: true }).click();
  await zones.filter({ hasText: "T08" }).first().click();
  check("a map target updates the actual order form", await command.getByRole("combobox", { name: /^Route voisine/ }).inputValue() === "CON-T08");
  check("unobserved enemy strength stays unknown", /Effectif inconnu/.test(await atlas.getByRole("complementary", { name: "Renseignement territorial" }).innerText()));
  await command.getByRole("combobox", { name: /^Ordre/ }).selectOption("recon");
  await command.getByRole("checkbox", { name: /^P08 ·/ }).check();
  await command.getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await waitState("orders", 1);
  check("reserving reconnaissance does not award control", (await state()).territories["CON-T08"].controller === "CON-F02");
  await resolveTurn(2);
  const prepared = await state();
  check("played reconnaissance records a dated estimate", prepared.observations.some(item => item.territoryId === "CON-T08" && item.turn === 1));
  const attackers = prepared.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === "CON-T02" && actor.status === "fit" && !actor.garrison && actor.trainingUntilTurn === null).slice(0, 8);
  check("actual surviving actors are available for assault", attackers.length > 0);
  await command.getByRole("combobox", { name: /^Ordre/ }).selectOption("attack");
  for (const actor of attackers) await command.getByRole("checkbox", { name: new RegExp(`^${actor.id} ·`) }).check();
  await command.getByRole("button", { name: "Étudier l’assaut", exact: true }).click();
  await command.getByRole("button", { name: "Confirmer l’assaut", exact: true }).click();
  await waitState("orders", 1);
  await resolveTurn(3);
  const conquered = await state();
  check("confirmed assault captures the selected territory", conquered.territories["CON-T08"].controller === "CON-F01");
  check("capture retains a living garrison", conquered.combatants.some(actor => actor.territoryId === "CON-T08" && actor.factionId === "CON-F01" && actor.status === "fit" && actor.garrison));
  const capturedPath = () => atlas.locator("svg").getByRole("button", { name: /^T08 ·/ }).locator("path").first();
  check("the surface changes to the controlling faction colour", await capturedPath().getAttribute("fill") === "#63dcc5");
  await atlas.screenshot({ path: path.join(output, "desktop-conquest.png") });
  await enter();
  await atlas.getByRole("button", { name: "▱ Planisphère", exact: true }).click();
  check("reload restores the real strategic turn and captured colour", (await state()).turn === 3 && await capturedPath().getAttribute("fill") === "#63dcc5");
  const keyboardZone = atlas.locator("svg").getByRole("button", { name: /^T08 ·/ });
  await keyboardZone.focus();
  await keyboardZone.press("Enter");
  check("keyboard selection updates actual command origin", /CON-T08/.test(await command.innerText()));
  await page.setViewportSize({ width: 390, height: 844 });
  await atlas.scrollIntoViewIfNeeded();
  check("mobile layout has no horizontal page overflow", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await atlas.screenshot({ path: path.join(output, "mobile-planisphere.png") });
  check("no browser runtime errors", errors.length === 0);
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify({ status: "PASS", checks, errors, completedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, output }));
} catch (error) {
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify({ status: "FAIL", checks, errors, failure: String(error), completedAt: new Date().toISOString() }, null, 2) + "\n");
  console.error(error);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
