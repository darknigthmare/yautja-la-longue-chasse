import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { legacyCanonicalCohortFixture, legacyHaltApproach, legacyHaltFixture, legacyPersonalShipFixture, legacyRegions, saves } from "../tests/helpers/legacy-finale-r2.mjs";
import { homeworldRegionNavigatorV68 } from "./homeworld-region-navigation-v68.mjs";
import { continuation, practice } from "../tests/helpers/origin-continuation-o6.mjs";

const output = path.resolve("outputs/qa-o6-e1-first-lesson-r2");
const temp = path.resolve("work-local");
await mkdir(output, { recursive: true });
await mkdir(temp, { recursive: true });
const directory = await mkdtemp(path.resolve(temp, "legacy-epilogues-"));
const mount = "/" + path.relative(process.cwd(), directory).replaceAll("\\", "/") + "/";
await writeFile(path.join(directory, "index.html"), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette M059 et M060</title><div id="root"></div><script type="module" src="${mount}app.tsx"></script></html>`);
await writeFile(path.join(directory, "app.tsx"), `
import React from "react";
import { createRoot } from "react-dom/client";
import GameClient from "/app/game/GameClient.tsx";
import "/app/globals.css";
createRoot(document.getElementById("root")).render(<GameClient />);
`);

const report = {
  source: process.env.EPILOGUE_CANDIDATE_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "M29 et M056 sont établies par les réducteurs existants. Chromium joue chaque geste O6-M30, quitte puis recharge après le retour du bâton, et déduit le reçu de clôture avant les deux épilogues au foyer. Les droits et l’entrée du vaisseau sont obtenus par les réducteurs. Le rapport régional de la halte est préparé.",
  sequences: [], errors: [],
};
const service = await createServer({ configFile: false, plugins: [react()],
  server: { host: "127.0.0.1", port: 4341, strictPort: true } });
let browser;
const url = "http://127.0.0.1:4341" + mount;
const capture = (page, name) => page.screenshot({ path: path.join(output, name + ".png"), animations: "disabled" });
async function openWorld(page, id) {
  const world = page.locator(`[data-homeworld-region-v68="${id}"]`);
  const menu = page.locator("[data-campaign-menu]");
  await world.or(menu).first().waitFor();
  if (await menu.isVisible()) {
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
  }
  await world.waitFor();
  try {
    await world.locator("[data-region-resume]").waitFor({ timeout: 24_000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      region: document.querySelector("[data-homeworld-region-v68]")?.getAttribute("data-zone"),
      dialog: document.querySelector("[data-homeworld-region-v68] [role=dialog]")?.textContent?.slice(0, 1200),
      focus: document.hasFocus(),
      badImages: Array.from(document.images).filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.getAttribute("src")).slice(0, 30),
    }));
    console.log("WORLD START " + JSON.stringify(state));
    await capture(page, id + "-entree-incomplete");
    throw error;
  }
  const walker = homeworldRegionNavigatorV68(page, legacyRegions);
  await walker.resume();
  return walker;
}
async function runFrom(save, check) {
  const validated = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(validated.save, validated.failure);
  const context = await browser.newContext({ viewport: { width: 1360, height: 920 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, state }) => {
    if (localStorage.length === 0) localStorage.setItem(key, JSON.stringify(state));
  }, { key: saves.SAVE_STORAGE_KEY, state: validated.save });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  await page.clock.install();
  page.on("pageerror", error => { report.errors.push(error.message); console.log(error.stack); });
  page.on("response", response => {
    if (response.status() >= 400 && response.url().includes("/game/")) {
      console.log("REGION ART " + response.status() + " " + response.url());
    }
  });
  try {
    await page.goto(url);
    await check(page);
  } catch (error) {
    report.errors.push(error.message);
    console.log("ROUTE ERROR " + error.stack);
    await capture(page, "parcours-interrompu-" + report.errors.length);
  } finally {
    await context.close();
  }
}
async function walkScene(scene, target) {
  const at = Number(await scene.getAttribute("data-legacy-at"));
  for (let i = 0; i < Math.abs(target - at); i++) {
    await scene.locator(`[data-legacy-move="${target < at ? "left" : "right"}"]`).click();
  }
  assert.equal(await scene.getAttribute("data-legacy-at"), String(target));
}
const action = (scene, id) => scene.locator(`[data-legacy-action="${id}"]`);

try {
  await service.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  await runFrom(legacyHaltFixture({ walkthrough: false, approach: { x: 1940, y: 2310 } }), async page => {
    const enterHalt = async () => {
      const walk = await openWorld(page, "storm-chain");
      await walk.walkTo(legacyHaltApproach);
      await walk.interact();
      await page.locator("[data-bible-scene-v86]").waitFor();
    };
    await enterHalt();
    const cultural = page.locator("[data-bible-scene-v86]");
    assert.equal(await cultural.locator("[data-open-legacy-halt-r2]").count(), 0);
    for (const name of ["Commencer la halte à cette table", "Rester sans boire", "Écouter la réponse", "Prendre place",
      "Écouter volontairement", "Aider au rangement et terminer"]) await cultural.getByRole("button", { name, exact: true }).click();
    await cultural.locator("[data-open-legacy-halt-r2]").click();
    const scene = page.locator('[data-legacy-finale="epilogue"][data-legacy-site="halt"]');
    await scene.waitFor();
    assert(await action(scene, "belongings").isDisabled());
    assert.equal((await page.request.get(new URL("/game/backgrounds/ice-depth-v4.webp", url).href)).ok(), true);
    await walkScene(scene, 6); await action(scene, "belongings").click();
    await walkScene(scene, 11); await action(scene, "relations").click();
    assert.match(await scene.locator("[data-legacy-belongings]").innerText(), /3 indices remis/);
    assert.match(await scene.locator("[data-legacy-relations]").innerText(), /Hôte de la halte des Crêtes/);
    await capture(page, "m060-halte-carnet");
    await scene.getByRole("button", { name: "Revenir au lieu" }).click();
    await page.locator('[data-homeworld-region-v68="storm-chain"]').waitFor();
    await page.reload();
    await enterHalt();
    await cultural.locator("[data-open-legacy-halt-r2]").click();
    await scene.waitFor();
    assert.equal(await scene.getAttribute("data-legacy-at"), "11");
    await walkScene(scene, 16); await action(scene, "transmit").click();
    await walkScene(scene, 21); await action(scene, "act").click();
    await scene.and(page.locator('[data-legacy-complete="true"]')).waitFor();
    await capture(page, "m060-halte-transmission");
    report.sequences.push("M060 · marche native vers la table V86, reçu et hôte relus, reprise et transmission");
  });

  await runFrom(legacyCanonicalCohortFixture({ realized: false }), async page => {
    let player = await openWorld(page, "luminous-marshes");
    const stage = page.locator("[data-o6-origin-stage]");
    const lesson = page.locator("[data-o6-practice-stage]");
    const recordedOrigin = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).originV151, saves.SAVE_STORAGE_KEY);
    assert.equal((await recordedOrigin()).ending.endingRealized, false);
    assert.equal(await page.locator("[data-open-legacy-cohort-r2]").count(), 0);
    const preparations = [];
    for (;;) {
      const order = await stage.getAttribute("data-o6-origin-stage");
      if (order === "ready") break;
      const post = continuation.CONTINUATION_POSTS_O6[order];
      assert.ok(post, order);
      assert.ok(preparations.length < 10);
      await player.walkTo(post);
      await player.interact();
      await page.waitForFunction(previous => document.querySelector("[data-o6-origin-stage]")?.getAttribute("data-o6-origin-stage") !== previous, order);
      preparations.push(order);
    }
    assert.equal(preparations.at(-1), "open-rack");
    await lesson.and(page.locator('[data-o6-practice-stage="listen-novice"]')).waitFor();
    for (const order of Object.keys(practice.PRACTICE_POSTS_O6)) {
      await lesson.and(page.locator(`[data-o6-practice-stage="${order}"]`)).waitFor();
      assert.equal((await recordedOrigin()).ending.endingRealized, false);
      await player.walkTo(practice.PRACTICE_POSTS_O6[order]);
      await player.interact();
      await page.waitForFunction(previous => document.querySelector("[data-o6-practice-stage]")?.getAttribute("data-o6-practice-stage") !== previous, order);
      if (order === "present-tools") {
        await page.locator("[data-o6-practice-staff]").waitFor();
        await capture(page, "o6-e1-outil-choisi-par-le-novice");
      }
      if (order === "return-staff") {
        assert.equal((await recordedOrigin()).ending.endingRealized, false);
        await page.reload();
        player = await openWorld(page, "luminous-marshes");
        await lesson.and(page.locator('[data-o6-practice-stage="hear-lesson-outcome"]')).waitFor();
        assert.equal(await page.locator("[data-o6-practice-staff]").count(), 0);
      }
    }
    await lesson.and(page.locator('[data-o6-practice-stage="complete"]')).waitFor();
    const realized = await recordedOrigin();
    assert.equal(realized.ending.endingRealized, true);
    assert.equal(realized.ending.originEndingId, "O6-E1");
    assert.equal(realized.consumed.filter(value => value === practice.O6_FIRST_LESSON_EVENT).length, 1);
    await capture(page, "o6-e1-bilan-de-la-premiere-lecon");
    report.sequences.push("O6-M30 · râtelier, outil choisi par le novice, première tentative, retour du bâton et bilan au seuil après rechargement");
    const enterHouse = async (visit = "cohort", currentWalker = null) => {
      const walk = currentWalker ?? await openWorld(page, "luminous-marshes");
      const interior = legacyRegions.HOMEWORLD_REGION_INTERIOR_V68;
      if (visit === "cohort") {
        await walk.walkTo(interior.entry);
        await page.locator("[data-residence-open-threshold]").click();
        await page.locator('[data-open-legacy-cohort-r2][data-legacy-cohort-entry="threshold"]').click();
        return;
      }
      await walk.walkTo({ x: interior.service.x, y: interior.service.y + 70 });
      await walk.interact();
      await page.locator("[data-open-legacy-epilogue-r2]").click();
    };
    await enterHouse("cohort", player);
    const scene = page.locator('[data-legacy-finale="cohort"]');
    await scene.waitFor();
    assert.equal(await scene.getAttribute("data-legacy-cohort-arrival"), "waiting");
    const youthCount = await scene.locator("img[data-speaker]").evaluateAll(async images => {
      await Promise.all(images.map(image => image.decode()));
      return images.filter(image => image.naturalWidth > 0).length;
    });
    assert.equal(youthCount, 4);
    await action(scene, "greet").click();
    assert(await action(scene, "lead").isDisabled());
    await capture(page, "m059-cohorte-au-seuil");
    await scene.getByRole("button", { name: "Revenir au lieu" }).click();
    await page.reload();
    await enterHouse();
    await scene.waitFor();
    assert.equal(await scene.getAttribute("data-legacy-cohort-arrival"), "greeted");
    assert.equal(await scene.getAttribute("data-legacy-at"), "2");
    await walkScene(scene, 8); await action(scene, "lead").click();
    assert.equal(await scene.getAttribute("data-legacy-cohort-arrival"), "inside");
    await walkScene(scene, 11); await action(scene, "unload").click();
    await capture(page, "m059-cohorte-et-support");
    await walkScene(scene, 9); await action(scene, "wall-foot").click();
    await walkScene(scene, 13); await action(scene, "door-foot").click();
    await walkScene(scene, 11); await action(scene, "test").click();
    await walkScene(scene, 15); await action(scene, "stay").click();
    await action(scene, "listen").click();
    await action(scene, "ask").click();
    await scene.getByRole("button", { name: "Revenir au lieu" }).click();
    await page.reload();
    await enterHouse();
    await scene.waitFor();
    assert.equal(await scene.getAttribute("data-legacy-at"), "15");
    const register = scene.locator("[data-legacy-cohort-record]");
    await register.locator("summary").click();
    assert.match(await register.locator("[data-legacy-clarification]").innerText(), /reste inconnue/);
    for (const target of [17, 19, 21]) {
      await walkScene(scene, target);
      await action(scene, "listen").click();
    }
    await walkScene(scene, 22); await action(scene, "unknown").click();
    assert.equal(await register.locator("[data-legacy-witness]").count(), 4);
    await action(scene, "close").click();
    await scene.and(page.locator('[data-legacy-complete="true"]')).waitFor();
    await capture(page, "m059-registre-des-temoignages");
    report.sequences.push("M059 · seuil, marche accompagnée, support, quatre voix, précision retrouvée après rechargement et ligne libre");
    await scene.getByRole("button", { name: "Revenir au lieu" }).click();
    await page.reload();
    await enterHouse("epilogue");
    const epilogue = page.locator('[data-legacy-finale="epilogue"][data-legacy-site="residence"]');
    await epilogue.waitFor();
    await walkScene(epilogue, 6); await action(epilogue, "belongings").click();
    await walkScene(epilogue, 11); await action(epilogue, "relations").click();
    assert.match(await epilogue.locator("[data-legacy-relations]").innerText(), /Piste, Nœud, Passage, Pièce/);
    await walkScene(epilogue, 16); await action(epilogue, "transmit").click();
    await walkScene(epilogue, 21);
    await action(epilogue, "offer").and(epilogue.locator('[data-legacy-speaker="track"]')).click();
    assert(await action(epilogue, "answer").isDisabled());
    await epilogue.getByRole("button", { name: "Revenir au lieu" }).click();
    await page.reload();
    await enterHouse("epilogue");
    await epilogue.waitFor();
    assert.equal(await epilogue.getAttribute("data-legacy-at"), "21");
    assert.equal(await epilogue.getAttribute("data-legacy-recipient"), "track");
    assert.equal(await epilogue.getAttribute("data-legacy-complete"), "false");
    await walkScene(epilogue, 15); await action(epilogue, "answer").click();
    assert.equal(await epilogue.getAttribute("data-legacy-complete"), "true");
    assert.match(await epilogue.locator("[data-legacy-answer]").innerText(), /la lecture s’arrête|ma lecture s’arrête/);
    await capture(page, "m060-la-reponse-du-jeune");
    report.sequences.push("M060 · témoins du foyer, passage réel repris au registre, reprise puis réponse du jeune au bon emplacement");
  });
  await runFrom(legacyPersonalShipFixture(), async page => {
    const deck = page.locator('[data-ship-interior="2.5d"]');
    const entry = deck.locator("[data-open-legacy-personal-archive-r2]");
    const scene = page.locator('[data-legacy-finale="epilogue"][data-legacy-site="ship"]');
    const enterArchiveFromDeck = async () => {
      const menu = page.locator("[data-campaign-menu]");
      await deck.or(menu).first().waitFor();
      if (await menu.isVisible()) {
        const campaign = page.locator('[data-menu-section="campaign"]');
        if (await campaign.isVisible()) await campaign.click();
        await page.locator('[data-menu-action="continue"]').click();
      }
      await deck.waitFor();
      const rooms = [await deck.getAttribute("data-ship-room")];
      assert.equal(await entry.count(), 0, "un poste distant ne doit pas ouvrir la transmission");
      await deck.locator("[data-ship-plan-toggle]").click();
      await deck.locator('[data-ship-guide="clan-archives"]').click();
      while (rooms.at(-1) !== "clan-archives") {
        assert.ok(rooms.length < 8, rooms.join(" → "));
        await deck.and(page.locator('[data-ship-nearby="door"]')).waitFor();
        await deck.locator("[data-ship-interact]").click();
        const last = rooms.at(-1);
        await page.waitForFunction(precedent => document.querySelector("[data-ship-interior]")?.getAttribute("data-ship-room") !== precedent, last);
        rooms.push(await deck.getAttribute("data-ship-room"));
      }
      await deck.and(page.locator('[data-ship-nearby="clan-archives"]')).waitFor();
      await entry.waitFor();
      return rooms;
    };
    const itinerary = await enterArchiveFromDeck();
    assert.ok(itinerary.length > 1);
    await capture(page, "m060-vaisseau-poste-physique");
    await entry.click();
    await scene.waitFor();
    assert.equal(await scene.getAttribute("data-legacy-at"), "2");
    const archive = scene.locator("[data-legacy-personal-archive-terminal]");
    const terminalWidth = await archive.evaluate(async image => { await image.decode(); return image.naturalWidth; });
    assert.ok(terminalWidth > 0);
    await walkScene(scene, 6); await action(scene, "belongings").click();
    assert.equal(await action(scene, "transmit").count(), 0);
    await walkScene(scene, 11); await action(scene, "relations").click();
    assert.match(await scene.locator("[data-legacy-belongings]").innerText(), /Coque remise/);
    assert.match(await scene.locator("[data-legacy-relations]").innerText(), /remise des droits et entrée à bord attestées/);
    await walkScene(scene, 16); await action(scene, "transmit").click();
    assert.ok(await action(scene, "act").isDisabled());
    await capture(page, "m060-vaisseau-accord-du-chantier");
    await scene.getByRole("button", { name: "Revenir au lieu" }).click();
    await entry.waitFor();
    assert.equal(await deck.getAttribute("data-ship-room"), "clan-archives");
    await page.reload();
    assert.deepEqual(await enterArchiveFromDeck(), itinerary);
    await entry.click();
    await scene.waitFor();
    assert.equal(await scene.getAttribute("data-legacy-at"), "16");
    assert.ok(await action(scene, "act").isDisabled());
    await walkScene(scene, 21); await action(scene, "act").click();
    await scene.and(page.locator('[data-legacy-complete="true"]')).waitFor();
    assert.match(await scene.locator("[data-legacy-personal-archive]").innerText(), /dossier de la remise/);
    await capture(page, "m060-vaisseau-transmission-archivee");
    report.sequences.push("M060 · plan et portes " + itinerary.join(" → ") + ", accord réel, retour au même poste, reprise après rechargement et dossier transmis");
  });
  console.log(JSON.stringify(report));
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser?.close();
  await service.close();
  await rm(directory, { recursive: true, force: true });
}
