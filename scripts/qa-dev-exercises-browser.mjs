import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const origin = new URL(process.env.DEV_EXERCISES_ORIGIN ?? "http://127.0.0.1:4194");
assert.equal(origin.hostname, "127.0.0.1");
const output = resolve(process.env.DEV_EXERCISES_OUTPUT ?? "outputs/qa-dev-exercises");
await mkdir(output, { recursive: true });
const log = createWriteStream(resolve(output, "next.log"));
const server = process.env.DEV_EXERCISES_EXTERNAL_SERVER === "1" ? null :
  spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", origin.hostname, "--port", origin.port], {
    env: { ...process.env, YAUTJA_NEXT_DIST_DIR: ".next-dev-exercises" },
  });
server?.stdout.pipe(log, { end: false });
server?.stderr.pipe(log, { end: false });
const report = { checks: [], failures: [], errors: [], storageWrites: [] };
let browser;

async function ready() {
  for (let attempt = 0; attempt < 180; attempt++) {
    if (server && server.exitCode !== null) throw new Error("Next s’est arrêté avant le chargement de /dev.");
    try {
      if ((await fetch(new URL("/dev", origin), { signal: AbortSignal.timeout(3000) })).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Le banc /dev n’a pas répondu.");
}

try {
  await ready();
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce",
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{ name: "qa.campagne-existante", value: "à conserver" }] }] },
  });
  await context.exposeBinding("observeDevStorage", (_source, change) => { report.storageWrites.push(change); });
  await context.addInitScript(() => {
    if (location.pathname !== "/dev") return;
    for (const method of ["setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        void window.observeDevStorage({ method, key: args[0] });
        return original.apply(this, args);
      };
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  let running = "";
  page.on("pageerror", error => { report.errors.push({ running, message: error.message }); });
  const run = async (name, test) => {
    running = name;
    try {
      await test();
      report.checks.push(name);
      console.log("DEV_EXERCISES", name);
    } catch (error) {
      report.failures.push({ name, message: error.stack });
      const scene = await page.locator("[data-dev-session]").innerText({ timeout: 250 }).catch(() => "");
      console.error(error, scene.slice(0, 3200));
      await page.screenshot({ path: resolve(output, name + ".png") }).catch(() => {});
    }
  };
  const open = async id => {
    await page.goto(new URL("/dev?lieu=" + id, origin).href, { waitUntil: "domcontentloaded" });
    await page.locator('[data-dev-session="' + id + '"][data-dev-interactive="true"]').waitFor({ timeout: 100000 });
  };
  async function walkWarp(field, tag, target) {
    const at = Number(await field.getAttribute("data-" + tag + "-position"));
    const direction = at < target ? "right" : "left";
    for (let step = 0; step < Math.abs(at - target); step++) {
      await field.locator('[data-' + tag + '-walk="' + direction + '"]').click();
    }
    assert.equal(Number(await field.getAttribute("data-" + tag + "-position")), target);
  }
  await run("catalogue-et-sortie-f8", async () => {
    await page.goto(new URL("/dev", origin).href);
    await page.locator('[data-dev-category="exercises"]').click();
    assert.equal(await page.locator("[data-dev-card]").count(), 14);
    await page.locator("[data-dev-search]").fill("Smart Disc");
    assert.equal(await page.locator("[data-dev-card]").count(), 2);
    await page.locator('[data-dev-launch="dev-forge"]').click();
    await page.locator("[data-dev-walkthrough] summary").click();
    assert.equal(await page.locator("[data-dev-walkthrough] li").count(), 2);
    await page.keyboard.press("F8");
    await page.locator("[data-dev-catalogue]").waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-dev-launch") === "dev-forge");
    assert.equal(new URL(page.url()).searchParams.has("lieu"), false);
    assert.equal(await page.locator('[data-dev-launch="dev-forge"]').evaluate(node => node === document.activeElement), true);
  });
  await run("achat-et-conduite-vehicule", async () => {
    await open("dev-vehicles");
    const garage = page.locator("[data-mobility-garage]");
    await garage.getByRole("button", { name: /Confirmer l’achat · 420/ }).click();
    await garage.locator('[data-mobility-owned-count="1"]').waitFor();
    assert.match(await garage.innerText(), /80\s*marques de clan/);
    const delivery = garage.getByRole("button", { name: "Prendre le contrat des Forges", exact: true });
    const available = await delivery.count() > 0;
    await (available ? delivery : garage.getByRole("button", { name: "Sortir sur l’aire", exact: true })).click();
    const yard = garage.locator(available ? '[data-mobility-yard][data-route="forge-delivery"]' : "[data-mobility-yard]");
    await yard.waitFor();
    await yard.getByRole("button", { name: "Reprendre la conduite", exact: true }).click();
    await yard.and(page.locator('[data-paused="false"]')).waitFor();
    const before = Number(await yard.getAttribute("data-x"));
    await yard.getByRole("img").focus();
    await page.keyboard.down("ArrowUp");
    try {
      await page.waitForFunction(before => Number(document.querySelector("[data-mobility-yard]")?.getAttribute("data-x")) > before + 5, before);
    } finally { await page.keyboard.up("ArrowUp"); }
    await page.locator("[data-dev-reset]").click();
    await garage.locator('[data-mobility-owned-count="0"]').waitFor();
  });
  await run("registre-des-montures", async () => {
    await open("dev-mounts");
    await page.locator('[data-mobility-model="kha_rha"]').click();
    await page.locator("[data-mount-recruitment]").or(page.getByRole("button", { name: /épreuve|confiance/i }).first()).first().waitFor();
  });
  await run("forge-deux-armes-deux-paliers", async () => {
    await open("dev-forge");
    await page.getByRole("tab", { name: "Réparations", exact: true }).click();
    const stock = page.locator("[data-forge-repair-stock]");
    const started = Number(await stock.getAttribute("data-forge-repair-stock"));
    for (const [id, cost] of [["plasma-caster", 10], ["smart-disc", 10]]) {
      const before = Number(await stock.getAttribute("data-forge-repair-stock"));
      await page.locator("[data-forge-weapon-select]").selectOption(id);
      for (let level = 1; level <= 2; level++) {
        for (const part of ["bone", "tissue"]) {
          await page.locator('[data-forge-weapon-material="' + part + '"]').selectOption({ index: 1 });
        }
        await page.locator("[data-forge-weapon-apply]").click();
        await page.locator('[data-forge-weapon-level="' + level + '"][data-forge-weapon-id="' + id + '"]').waitFor();
      }
      assert.equal(Number(await stock.getAttribute("data-forge-repair-stock")), before - cost);
    }
    await page.locator("[data-dev-forge-hunt]").click();
    await page.locator('[data-dev-stage="hunt"] canvas').first().waitFor();
    await page.getByRole("button", { name: "Commencer la chasse", exact: true }).click();
    await page.locator("[data-dev-reset]").click();
    await page.getByRole("tab", { name: "Réparations", exact: true }).click();
    assert.equal(Number(await stock.getAttribute("data-forge-repair-stock")), started);
  });
  await run("fjord-et-second-voyage-forteresse", async () => {
    await open("dev-warp");
    const depart = page.getByRole("button", { name: "Engager le voyage", exact: true });
    await depart.click();
    const fjord = page.locator("[data-warp-fjord]");
    await walkWarp(fjord, "fjord", 4);
    await fjord.locator('[data-fjord-enter="quai"]').click();
    await walkWarp(fjord, "fjord", 11);
    await fjord.locator("[data-fjord-observe]").click();
    await walkWarp(fjord, "fjord", 4);
    await fjord.locator('[data-fjord-enter="grotte"]').click();
    await walkWarp(fjord, "fjord", 0);
    await fjord.locator("[data-fjord-report]").click();
    await page.locator("[data-warp-fjord-register]").waitFor();
    await depart.click();
    const fortress = page.locator("[data-warp-fortress]");
    await fortress.waitFor();
    await walkWarp(fortress, "fortress", 4);
    await fortress.locator('[data-fortress-act="sounded"]').click();
    await walkWarp(fortress, "fortress", 8);
    await fortress.locator('[data-fortress-act="entered"]').click();
    await walkWarp(fortress, "fortress", 14);
    await fortress.locator('[data-fortress-act="copied"]').click();
    await walkWarp(fortress, "fortress", 0);
    await fortress.locator('[data-fortress-act="returned"]').click();
    await page.locator("[data-warp-fortress-register]").waitFor();
  });
  await run("ouvertures-w02-et-tantalus", async () => {
    for (const [id, target] of [["dev-warp-w02", "W-02"], ["dev-warp-tantalus", "warp-tantalus-2204"]]) {
      await open(id);
      await page.getByRole("button", { name: "Engager le voyage", exact: true }).click();
      await page.locator('[data-warp-branch="' + target + '"][data-warp-return="reservee"]').waitFor();
    }
  });
  await run("m015-rapport-reprise-et-rite", async () => {
    await open("dev-m015");
    await page.getByRole("button", { name: "Activer le son de l’essai" }).click();
    const scene = page.locator("[data-solo-v68]");
    const canvas = scene.locator("canvas");
    await scene.and(page.locator('[data-solo-step="debrief"]')).waitFor();
    await canvas.focus();
    await scene.locator('canvas[data-solo-assets="true"][data-solo-armed="true"]').waitFor();
    await page.keyboard.press("KeyH", { delay: 150 });
    await scene.and(page.locator('[data-solo-step="recognition"]')).waitFor();
    await page.keyboard.press("Escape");
    await scene.getByRole("button", { name: "Reprendre", exact: true }).waitFor();
    await page.getByRole("button", { name: "Reprendre du point conservé" }).click();
    await scene.and(page.locator('[data-solo-step="recognition"]')).waitFor();
    await canvas.focus();
    await scene.locator('canvas[data-solo-assets="true"][data-solo-armed="true"]').waitFor();
    await page.keyboard.down("KeyH");
    try {
      await scene.and(page.locator('[data-solo-step="complete"]')).waitFor();
    } finally { await page.keyboard.up("KeyH"); }
  });
  await run("rites-l06-et-terrasse-o6", async () => {
    await open("dev-l06");
    const arena = page.locator("[data-elite-clan-arena]");
    await arena.waitFor();
    const term = page.locator('[data-yautja-term="kehrite"]');
    await term.waitFor();
    assert.match(await term.innerText(), /Kehrite/);
    assert.match(await page.locator("[data-elite-clan-rites]").innerText(), /Avance jusqu’au poste/);
    await open("dev-o6-terrace");
    await page.locator('[data-o6-horizon-action="saar"]').click({ timeout: 100000 });
    await page.locator('[data-o6-horizons="1"]').waitFor();
  });
  await run("releve-coop-trois-postes", async () => {
    await open("dev-coop-relief");
    await page.getByRole("button", { name: "Lancer l’exercice" }).click();
    const roles = page.locator("[data-dev-coop-role]");
    const cue = page.locator("[data-campaign-coop-exercise] p").filter({ hasText: /Les traces fraîches|La charge tient/ });
    const choices = page.locator("[data-coop-choice]");
    for (let passage = 0; passage < 3; passage++) {
      for (const role of ["Pisteur", "Soutien"]) {
        await roles.selectOption({ label: role });
        const hint = await cue.innerText();
        const labels = await choices.allTextContents();
        const right = labels.findIndex(label => hint.includes(label.trim().replace(/^(Signaler|Assurer) /, "")));
        assert.notEqual(right, -1);
        if (passage === 0) {
          await choices.nth(1 - right).click();
          await page.getByRole("status").filter({ hasText: /pas fraîche|n’est plus fraîche|cède sous la charge/ }).waitFor();
        }
        await choices.nth(right).click();
      }
      await roles.selectOption({ label: "Hôte" });
      await page.getByRole("button", { name: "Faire franchir le trio" }).click();
    }
    await page.getByRole("status").filter({ hasText: "Les trois passages sont franchis" }).waitFor();
  });
  await run("temple-acheron-mycora-et-chenil", async () => {
    await open("dev-temple-triad");
    const temple = page.locator('[data-solo-v70][data-solo-step="briefing"]');
    await temple.waitFor();
    const dialogue = temple.locator('[data-yautja-translation-v67][data-translation-complete="true"]');
    assert.match(await dialogue.innerText(), /Saar et Vek entrent avec toi/);
    await temple.getByRole("button", { name: "Tactile", exact: true }).click();
    await temple.getByRole("button", { name: "Marcher à gauche" }).waitFor();
    for (const id of ["dev-acheron-field", "dev-mycora-canopy"]) {
      await open(id);
      await page.locator('[data-dev-stage="hunt"] canvas').first().waitFor({ timeout: 80000 });
    }
    await open("dev-kennel");
    await page.locator("[data-dev-kennel-hunt]").waitFor();
    assert.equal(await page.locator("[data-dev-kennel-hunt]").isDisabled(), true);
    const city = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]');
    await city.waitFor({ timeout: 100000 });
    await city.locator("[data-homeworld-viewport]").focus();
    await page.keyboard.press("KeyE");
    const kennel = page.locator('[data-hound-kennel-v147="CITY-28"]');
    await kennel.waitFor();
    await kennel.locator('[data-hound-kennel-action="recruit"]').click();
    const balance = kennel.locator("[data-hound-kennel-balance]");
    assert.match((await balance.innerText()).replaceAll(/\s/g, " "), /988 Marques/);
    await kennel.locator('[data-hound-kennel-action="heal"]').click();
    assert.equal(await kennel.locator('[data-hound-id][data-condition="wounded"]').count(), 0);
    await page.locator("[data-dev-kennel-hunt]").click();
    await page.getByRole("button", { name: "Commencer la chasse", exact: true }).click();
    await page.locator("[data-hound-current-order]").waitFor();
    await page.locator('[data-hound-field-order="recall"]').click();
    await page.locator('[data-hound-current-order="recall"]').waitFor();
  });
  await run("campagne-et-stockage-preserves", async () => {
    const data = await page.evaluate(() => ({ saved: localStorage.getItem("qa.campagne-existante"), local: localStorage.length, session: sessionStorage.length }));
    assert.deepEqual(data, { saved: "à conserver", local: 1, session: 0 });
    assert.deepEqual(report.storageWrites, []);
    assert.deepEqual(report.errors, []);
  });
  assert.deepEqual(report.failures.map(failure => failure.name), []);
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  if (server && server.exitCode === null) server.kill("SIGTERM");
  log.end();
}
