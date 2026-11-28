import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const key = "yautja-long-hunt.campaign-coop-lobby";
const output = resolve("outputs/campaign-coop-lobby");
const bundle = await build({
  entryPoints: ["tests/browser/campaign-menu-navigation.fixture.tsx"], outfile: "campaign-coop-fixture.js",
  bundle: true, write: false, platform: "browser", jsx: "automatic", external: ["/game/*"],
  define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});
const js = bundle.outputFiles.find(file => file.path.endsWith(".js"))?.contents;
const css = bundle.outputFiles.find(file => file.path.endsWith(".css"))?.contents;
assert.ok(js && css);
const html = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/lobby.css"><style>body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="/lobby.js"></script></html>';
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(html); }
  else if (pathname === "/lobby.js") { response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); response.end(js); }
  else if (pathname === "/lobby.css") { response.writeHead(200, { "content-type": "text/css; charset=utf-8" }); response.end(css); }
  else if (pathname === "/game/prologue/v47/village.png" || pathname === "/game/prologue/v47/arena.png") {
    try {
      const bytes = await readFile("public" + pathname);
      response.writeHead(200, { "content-type": "image/png" });
      response.end(bytes);
    } catch { response.writeHead(404); response.end(); }
  } else { response.writeHead(404); response.end(); }
});

const checks = [];
const errors = [];
const pass = message => { checks.push(message); console.log("PASS " + message); };
const campaignMenu = page => page.locator('[data-campaign-menu="campaign"]');
const lobby = page => page.locator("[data-campaign-coop-lobby]");
const button = (page, name) => lobby(page).getByRole("button", { name, exact: true });
const snapshot = page => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
const archive = page => page.evaluate(storageKey => Object.fromEntries(Object.keys(localStorage)
  .filter(name => name !== storageKey).map(name => [name, localStorage.getItem(name)])), key);
const roster = page => lobby(page).getByRole("list", { name: "Invités admis" });
const exercise = page => lobby(page).locator("[data-campaign-coop-exercise]");
const step = (page, expected) => exercise(page).locator('[data-coop-exercise-step="' + expected + '"]');

async function followCue(page, prefix, cluePattern, wrong = false) {
  const panel = exercise(page);
  const clue = await panel.getByText(cluePattern).innerText();
  const choices = panel.getByRole("button", { name: new RegExp("^" + prefix + " ") });
  assert.equal(await choices.count(), 2);
  const labels = await choices.allTextContents();
  const correct = labels.findIndex(label => clue.endsWith(" " + label.trim().slice(prefix.length + 1) + "."));
  assert.ok(correct >= 0, clue);
  await choices.nth(wrong ? 1 - correct : correct).click();
}

async function enterLobby(page) {
  await page.locator('[data-menu-section="campaign"]').click();
  await campaignMenu(page).locator('[data-menu-action="coop"]').click();
  await lobby(page).waitFor();
}

async function issue(page, renewal = false) {
  const output = lobby(page).locator("output");
  const previous = renewal ? await output.innerText() : null;
  await button(page, renewal ? "Renouveler le code" : "Créer un code d’invitation").click();
  await page.waitForFunction(oldCode => {
    const nextCode = document.querySelector("[data-campaign-coop-lobby] output")?.textContent;
    return nextCode && nextCode !== oldCode;
  }, previous);
  const code = await output.innerText();
  assert.match(code, /^[0-9a-f]{6}(?:-[0-9a-f]{6}){3}$/);
  return code;
}

await mkdir(output, { recursive: true });
let browser;
let failure;
try {
  await new Promise((ready, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", ready); });
  const origin = "http://127.0.0.1:" + server.address().port + "/?frontend";
  const executablePath = process.env.AUDIT_CHROME_EXECUTABLE ?? process.env.CHROMIUM_EXECUTABLE_PATH;
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : { channel: process.env.AUDIT_CHROME_CHANNEL ?? "chrome" }) });
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 1280, height: 900 } });
  async function newTab() {
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin);
    return page;
  }

  const host = await newTab();
  const names = ["Hôte Ruun", "Invitée Yena", "Invité Tov", "Invité Harek"];
  await host.locator('[data-menu-section="campaign"]').click();
  for (const [index, name] of names.entries()) {
    await campaignMenu(host).locator('[data-menu-action="new"]').click();
    await host.getByLabel("Nom du chasseur").fill(name);
    await host.getByRole("button", { name: /Créer la partie/ }).click();
    await host.locator('[data-qa-campaign-session="' + (index + 1) + '"]').waitFor();
    await host.getByRole("button", { name: "Retour au menu principal", exact: true }).click();
  }
  const before = await archive(host);
  assert.equal(Object.keys(before).filter(name => /campaign-slot\.[1-4]$/.test(name)).length, 4);
  await campaignMenu(host).locator('[data-menu-action="coop"]').click();
  await lobby(host).getByLabel("Chronique").selectOption("1");
  await button(host, "Ouvrir un salon").click();
  const code = await issue(host);

  const first = await newTab();
  const second = await newTab();
  const fourth = await newTab();
  await Promise.all([first, second, fourth].map(enterLobby));
  assert.equal(await button(first, "Fermer le salon").count(), 0);
  assert.equal(await lobby(first).locator("output").count(), 0);
  assert.equal((await snapshot(first)).host.slotId, 1);
  pass("Le menu Campagne ouvre le salon avec des archives du jeu et réserve la gestion à l’onglet hôte.");

  await lobby(first).getByLabel("Chronique").selectOption("2");
  await lobby(first).getByLabel("Code d’invitation").fill("0".repeat(24));
  await button(first, "Demander à rejoindre").click();
  await lobby(first).getByText(/Le code d’invitation est invalide/).waitFor();
  assert.equal((await snapshot(first)).pending.length, 0);

  await lobby(first).getByLabel("Code d’invitation").fill(code);
  await lobby(second).getByLabel("Chronique").selectOption("3");
  await lobby(second).getByLabel("Code d’invitation").fill(code);
  await Promise.all([first, second].map(page => page.locator("[data-campaign-coop-lobby] form")
    .evaluate(form => form.requestSubmit())));
  await first.waitForFunction(storageKey => JSON.parse(localStorage.getItem(storageKey)).pending.length === 1, key);
  const race = await snapshot(host);
  assert.equal(race.invitationHash, null);
  assert.equal(race.pending.length, 1);
  const firstWins = race.pending[0].slotId === 2;
  const winner = firstWins ? first : second;
  const other = firstWins ? second : first;
  const winnerName = names[race.pending[0].slotId - 1];
  const otherName = firstWins ? names[2] : names[1];
  await lobby(winner).getByText("Demande d’admission en attente de l’hôte.").waitFor();
  assert.equal(await button(other, "Admettre " + winnerName).count(), 0);
  pass("Un code erroné est refusé et deux onglets concurrents ne consomment qu’une seule invitation.");

  await host.reload();
  await enterLobby(host);
  await button(host, "Admettre " + winnerName).click();
  await lobby(winner).getByText("Votre chronique a été admise dans le trio.").waitFor();
  await winner.reload();
  await enterLobby(winner);
  await lobby(winner).getByText("Votre chronique a été admise dans le trio.").waitFor();
  assert.equal(await roster(winner).getByText(winnerName).count(), 1);
  pass("La demande et les droits de l’hôte, puis l’admission de l’invité survivent au rechargement.");

  const old = await issue(host);
  const renewed = await issue(host, true);
  assert.notEqual(old, renewed);
  await lobby(other).getByLabel("Chronique").selectOption(firstWins ? "3" : "2");
  await lobby(other).getByLabel("Code d’invitation").fill(old);
  await button(other, "Demander à rejoindre").click();
  await lobby(other).getByText(/Le code d’invitation est invalide/).waitFor();
  await lobby(other).getByLabel("Code d’invitation").fill(renewed);
  await button(other, "Demander à rejoindre").click();
  await button(host, "Admettre " + otherName).click();
  await lobby(other).getByText("Votre chronique a été admise dans le trio.").waitFor();
  await lobby(fourth).getByText("Les trois places du trio sont réservées.").waitFor();
  assert.equal((await snapshot(host)).guests.length, 2);
  assert.equal(await button(fourth, "Demander à rejoindre").isDisabled(), true);
  await host.screenshot({ path: resolve(output, "salon-trio.png"), animations: "disabled" });
  pass("Le renouvellement invalide l’ancien code et le trio complet bloque une quatrième place.");

  await button(host, "Lancer l’exercice").click();
  await Promise.all([host, winner, other].map(page => step(page, "track").waitFor()));
  assert.equal(await exercise(fourth).count(), 0);
  assert.equal(await button(host, "Faire franchir le trio").count(), 0);
  assert.equal(await exercise(host).getByRole("button", { name: /^Signaler/ }).count(), 0);
  assert.equal(await exercise(other).getByRole("button", { name: /^Signaler/ }).count(), 0);

  await followCue(winner, "Signaler", /^Les traces fraîches/, true);
  await lobby(winner).getByText(/La voie signalée ne porte/).waitFor();
  assert.equal((await snapshot(host)).exercise.journal.length, 0);
  await followCue(winner, "Signaler", /^Les traces fraîches/);
  await step(other, "support").waitFor();
  const firstSignal = (await snapshot(host)).exercise.journal;
  for (const page of [host, winner, other]) {
    await page.reload();
    await enterLobby(page);
    await step(page, "support").waitFor();
    assert.deepEqual((await snapshot(page)).exercise.journal, firstSignal);
  }
  await host.screenshot({ path: resolve(output, "releve-apres-reprise.png"), animations: "disabled" });

  for (let passage = 0; passage < 3; passage++) {
    if (passage > 0) {
      await step(winner, "track").waitFor();
      await followCue(winner, "Signaler", /^Les traces fraîches/);
    }
    await step(other, "support").waitFor();
    if (passage === 0) {
      await followCue(other, "Assurer", /^La charge tient/, true);
      await lobby(other).getByText(/Cette prise cède/).waitFor();
      assert.equal((await snapshot(host)).exercise.journal.length, 1);
    }
    await followCue(other, "Assurer", /^La charge tient/);
    await step(host, "lead").waitFor();
    assert.equal(await button(other, "Faire franchir le trio").count(), 0);
    await button(host, "Faire franchir le trio").click();
  }
  for (const page of [host, winner, other]) {
    await exercise(page).getByText(/^Relève terminée/).waitFor();
    const current = await snapshot(page);
    assert.equal(current.exercise.journal.length, 9);
    assert.deepEqual(current.exercise.journal.map(entry => entry.actor),
      [current.guests[0].proof, current.guests[1].proof, current.host.proof,
        current.guests[0].proof, current.guests[1].proof, current.host.proof,
        current.guests[0].proof, current.guests[1].proof, current.host.proof]);
  }
  await host.screenshot({ path: resolve(output, "releve-terminee.png"), animations: "disabled" });
  pass("Les trois chroniques jouent la relève sous l’autorité de l’hôte. Neuf signaux, deux erreurs corrigées et une reprise au même passage.");

  await button(host, "Relancer l’exercice").click();
  await step(winner, "track").waitFor();
  await button(winner, "Quitter le salon").click();
  await exercise(host).getByText(/^Relève interrompue/).waitFor();
  assert.equal((await snapshot(host)).exercise.abandoned, true);
  await roster(host).getByText(winnerName).waitFor({ state: "detached" });
  await button(host, "Fermer le salon").click();
  await lobby(other).getByText(/Le précédent salon est clos/).waitFor();
  assert.equal((await snapshot(host)).closed, true);
  assert.deepEqual(await archive(host), before);
  assert.deepEqual(await archive(other), before);
  assert.deepEqual(errors, []);
  pass("Le départ et la fermeture se propagent. Les archives restent identiques octet pour octet.");
} catch (error) {
  failure = String(error.stack ?? error);
  throw error;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify({ checks, errors, failure }, null, 2) + "\n");
  await browser?.close();
  if (server.listening) await new Promise(done => server.close(done));
}
