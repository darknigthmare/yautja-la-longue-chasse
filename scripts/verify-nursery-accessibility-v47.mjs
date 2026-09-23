import fs from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.V47_QA_URL || "http://127.0.0.1:4174";
const out = process.env.V47_NURSERY_ACCESSIBILITY_OUTPUT || "work/v47/nursery-accessibility-browser-qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], unexpectedHttpFailures = [], expectedAssetFailures = [];
let currentPage = null;
const missingPath = "/game/prologue/v47/youngling-player-right.png";
const check = (name, passed, details = null) => checks.push({ name, passed: Boolean(passed), details });
const watch = (page, injected404 = false) => {
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.status() < 400) return;
    const item = { url: response.url(), status: response.status() };
    if (injected404 && new URL(response.url()).pathname === missingPath && response.status() === 404) expectedAssetFailures.push(item);
    else unexpectedHttpFailures.push(item);
  });
};
const scene = page => page.locator("[data-nursery-prologue]");
const canvas = page => scene(page).locator("canvas");
const phase = (page, name) => page.locator(`[data-nursery-prologue] canvas[data-nursery-phase="${name}"]`);
const state = page => canvas(page).evaluate(node => ({ phase: node.dataset.nurseryPhase, tick: Number(node.dataset.nurseryTick), paused: node.dataset.nurseryPaused, assets: node.dataset.nurseryAssets, positions: node.dataset.nurseryPositions }));
const savedProgress = page => page.evaluate(() => JSON.parse(localStorage.getItem("yautja-long-hunt.save") || "null")?.prologue ?? null);
async function create(page, name) {
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: /^Nouvelle partie/ }).click();
  await page.getByLabel("Nom du chasseur", { exact: true }).fill(name);
  await page.getByRole("button", { name: /^Créer la partie 1/ }).click();
  await scene(page).waitFor({ timeout: 120000 });
}
async function focusInside(page, role) { return role.evaluate(node => node.contains(document.activeElement)); }
async function reachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate(node => {
    const r = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, r.left + r.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, r.top + r.height / 2));
    return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && node.contains(document.elementFromPoint(x, y));
  });
}

try {
  const brokenContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  currentPage = await brokenContext.newPage(); watch(currentPage, true);
  const broken = currentPage;
  await broken.route(`**${missingPath}`, route => route.fulfill({ status: 404, contentType: "image/png", body: "Injected missing prologue PNG for QA" }));
  await create(broken, "QA PNG manquant");
  await broken.getByRole("button", { name: "Réessayer le chargement", exact: true }).waitFor();
  const blocked = await state(broken), beforeProgress = await savedProgress(broken);
  await canvas(broken).focus(); await broken.keyboard.press("Enter"); await broken.waitForTimeout(450);
  const afterBlocked = await state(broken), afterProgress = await savedProgress(broken);
  check("missing-png-blocks-scene-without-progress", blocked.phase === "loading" && blocked.assets === "false" && blocked.tick === 0 && afterBlocked.tick === 0 && JSON.stringify(beforeProgress) === JSON.stringify(afterProgress) && afterProgress?.status === "active" && !afterProgress?.chronicle.evidence.some(item => item.id === "intro-completed"), { blocked, afterBlocked, status: afterProgress?.status, injectedFailures: expectedAssetFailures.length });
  check("missing-png-offers-retry-and-exit", await broken.getByRole("button", { name: "Réessayer le chargement", exact: true }).isVisible() && await broken.getByRole("button", { name: "Retour au menu", exact: true }).isVisible());
  await broken.screenshot({ path: out + "/missing-png.png" });
  await broken.unroute(`**${missingPath}`);
  await broken.getByRole("button", { name: "Réessayer le chargement", exact: true }).click();
  await phase(broken, "prompt").waitFor({ timeout: 120000 });
  const focusAfterRetry = await broken.evaluate(() => { const node=document.activeElement; return { tag: node?.tagName, label: node?.getAttribute("aria-label"), text: node?.textContent?.slice(0,100) }; });
  await broken.keyboard.press("q", { delay: 80 }); await broken.waitForTimeout(250);
  const phaseAfterRetryKey = (await state(broken)).phase;
  check("retry-restores-keyboard-start-focus", ["arrival", "ready"].includes(phaseAfterRetryKey), { focusAfterRetry, phaseAfterRetryKey });
  if (phaseAfterRetryKey === "prompt") { await canvas(broken).focus(); await broken.keyboard.press("q", { delay: 80 }); }
  await phase(broken, "ready").waitFor();
  check("new-player-ready-instructions-and-no-combat-hud", await scene(broken).getAttribute("data-nursery-hud") === "false" && await broken.getByText("Maintenez Entrée / A pendant 2 secondes.", { exact: true }).isVisible() && await broken.getByLabel("Valider Prêt par une simple pression", { exact: true }).isVisible() && await scene(broken).getByRole("progressbar").count() === 0, { visibleReadyHint: true, noHealthOrXpMeter: true });
  await broken.getByRole("button", { name: "Pause et commandes", exact: true }).click();
  const dialog = broken.getByRole("dialog", { name: "Prologue en pause", exact: true }); await dialog.waitFor();
  check("pause-explains-all-intro-actions", (await dialog.innerText()).includes("Projection au contact") && (await dialog.innerText()).includes("Ramasser la lame proche") && (await dialog.innerText()).includes("Relâchez vos commandes"));
  const readyOption = dialog.getByLabel("Prêt par une pression, sans maintien", { exact: true });
  await readyOption.focus(); await broken.keyboard.press("Shift+Tab");
  const wrappedBack = await dialog.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }).evaluate(node => document.activeElement === node);
  await broken.keyboard.press("Tab");
  const wrappedForward = await readyOption.evaluate(node => document.activeElement === node);
  const settled = await state(broken); await broken.waitForTimeout(350);
  check("pause-dialog-keyboard-trap-and-frozen-clock", wrappedBack && wrappedForward && (await state(broken)).tick === settled.tick, { wrappedBack, wrappedForward });
  await readyOption.press("Space");
  check("press-ready-option-persists-without-progress", await readyOption.isChecked() && (await savedProgress(broken))?.checkpoint.readyMode === "press" && (await savedProgress(broken))?.status === "active");
  await broken.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
  const resumedFocus = await broken.waitForFunction(() => document.activeElement === document.querySelector("[data-nursery-prologue] canvas"), null, { timeout: 1000 }).then(() => true, () => false);
  check("escape-resumes-with-canvas-focus", resumedFocus);
  await broken.getByRole("button", { name: "Je suis prêt", exact: true }).click();
  await phase(broken, "duel").waitFor(); await canvas(broken).focus(); await broken.waitForTimeout(80);
  await broken.keyboard.press("Shift+Tab"); await broken.waitForTimeout(150);
  const tabAway = await state(broken), focusAfterTab = await broken.evaluate(() => { const node=document.activeElement; return { tag: node?.tagName, text: node?.textContent?.slice(0,100) }; });
  await broken.waitForTimeout(350); const afterTab = await state(broken);
  check("leaving-canvas-with-tab-pauses-duel", tabAway.paused === "true" && afterTab.tick === tabAway.tick, { focusAfterTab, before: tabAway, after: afterTab });
  if (await dialog.count() === 0) await broken.getByRole("button", { name: "Pause et commandes", exact: true }).click();
  await dialog.waitFor(); await broken.screenshot({ path: out + "/pause-keyboard.png" });
  await dialog.getByRole("button", { name: "Reprendre le prologue", exact: true }).click(); await canvas(broken).focus();
  await broken.evaluate(() => window.dispatchEvent(new Event("blur"))); await dialog.waitFor();
  await broken.waitForFunction(() => document.querySelector("[data-nursery-prologue] canvas")?.dataset.nurseryPaused === "true");
  const blurred = await state(broken); await broken.waitForTimeout(350);
  check("window-blur-freezes-with-visible-pause", blurred.paused === "true" && (await state(broken)).tick === blurred.tick && await focusInside(broken, dialog), { blurred, after: await state(broken), focusInside: await focusInside(broken, dialog) });
  await brokenContext.close();

  const smallContext = await browser.newContext({ viewport: { width: 640, height: 280 }, reducedMotion: "reduce", serviceWorkers: "block" });
  currentPage = await smallContext.newPage(); watch(currentPage); const small = currentPage;
  await create(small, "QA Paysage"); await phase(small, "prompt").waitFor({ timeout: 120000 });
  check("landscape-prompt-legible-with-reduced-motion", await scene(small).getAttribute("data-reduced-motion") === "true" && await small.getByText("La longue chasse commence ici.", { exact: true }).isVisible() && await reachable(small.getByRole("button", { name: "Entrer dans la nurserie", exact: true })), { viewport: "640x280" });
  await small.getByRole("button", { name: "Pause et commandes", exact: true }).click();
  const smallDialog = small.getByRole("dialog", { name: "Prologue en pause", exact: true }); await smallDialog.waitFor();
  const layout = await smallDialog.evaluate(node => { const r=node.getBoundingClientRect(),style=getComputedStyle(node);return { top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,overflowY:style.overflowY }; });
  const resumeReachable = await reachable(smallDialog.getByRole("button", { name: "Reprendre le prologue", exact: true }));
  const exitReachable = await reachable(smallDialog.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }));
  check("landscape-pause-actions-reachable", resumeReachable && exitReachable && await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { layout, resumeReachable, exitReachable });
  await small.screenshot({ path: out + "/pause-landscape.png" });
  await small.setViewportSize({ width: 320, height: 568 });
  await small.addStyleTag({ content: "[data-nursery-prologue] { font-size: 200% !important; } [data-nursery-prologue] p, [data-nursery-prologue] button, [data-nursery-prologue] label, [data-nursery-prologue] kbd { font-size: 1em !important; }" });
  check("pause-text-enlargement-remains-scrollable", await reachable(smallDialog.getByRole("button", { name: "Reprendre le prologue", exact: true })) && await reachable(smallDialog.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true })) && await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const largeTextControls = await smallDialog.locator("button,label").evaluateAll(nodes => nodes.map(node => ({
    text: node.textContent, font: getComputedStyle(node).fontSize, height: node.getBoundingClientRect().height,
    clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
  })));
  check("pause-large-text-does-not-overflow-controls", largeTextControls.every(node => node.scrollHeight <= node.clientHeight + 2 && node.scrollWidth <= node.clientWidth + 2), largeTextControls);
  await small.screenshot({ path: out + "/pause-320-large-text.png" });
  await smallContext.close();
  const passed=checks.every(item=>item.passed)&&errors.length===0&&unexpectedHttpFailures.length===0;
  const report={passed,base,at:new Date().toISOString(),profile:"Simulated novice and keyboard/accessibility QA; real compiled app, no physical-device certification",checks,errors,unexpectedHttpFailures,expectedAssetFailures};
  await fs.writeFile(out+"/report.json",JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));if(!passed)process.exitCode=1;
} catch(error) {
  if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:out+"/failure.png"}).catch(()=>{});
  await fs.writeFile(out+"/report.json",JSON.stringify({passed:false,base,at:new Date().toISOString(),checks,errors,unexpectedHttpFailures,expectedAssetFailures,error:String(error)},null,2)+"\n");
  console.error(error);process.exitCode=1;
} finally { await browser.close(); }
