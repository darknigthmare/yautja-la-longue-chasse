import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const base = process.env.PIT_LAYOUT_QA_URL ?? "http://127.0.0.1:4173";
const output = process.env.PIT_LAYOUT_QA_OUTPUT ?? "work/v35/arena-layout/compiled";
const versionSource = await fs.readFile("app/game/buildInfo.ts", "utf8");
const expectedVersion = versionSource.match(/GAME_CONTENT_VERSION = "([^"]+)"/)[1];
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [];

try {
  for (const touch of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: touch });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForFunction(version => document.querySelector(`[data-game-content-version="${version}"]`), expectedVersion);
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
    await page.getByRole("radio", { name: /Entraînement/ }).click();
    await page.getByRole("combobox", { name: "Arène", exact: true }).selectOption("arena-019-porte-des-reserves");
    await page.getByRole("button", { name: /^ENTRER DANS L’ARÈNE/ }).click();
    await page.waitForSelector('canvas[data-pit-arena-art-status="bitmap"]');
    const viewports = touch ? [{ width: 390, height: 844 }] : [{ width: 1280, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const laboratoryOpen of [false, true]) {
        const toggle = page.getByRole("button", { name: laboratoryOpen ? "Laboratoire" : "Masquer le laboratoire", exact: true });
        if (await toggle.count()) await toggle.click();
        const root = page.getByRole("region", { name: "Combat THE PIT", exact: true });
        await root.evaluate(element => element.scrollTo(0, 0));
        const canvas = page.locator("canvas[data-pit-arena-id]");
        const data = await canvas.evaluate(element => {
          const rect = node => {
            if (!node) return null;
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
          };
          const laboratory = document.querySelector('[aria-label="Laboratoire d’entraînement"]');
          const match = document.querySelector('[aria-label="Combat THE PIT"]');
          return {
            textRows: [...match.children].filter(node => /_(hud|bitmapArtStatus|throwTechStatus|replayNoticeMatch)__/.test(node.className)).map(node => ({ name: node.className, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight })),
            canvas: rect(element), shell: rect(element.parentElement),
            intrinsic: { width: element.width, height: element.height },
            laboratory: rect(laboratory),
            labScroll: laboratory ? { clientHeight: laboratory.clientHeight, scrollHeight: laboratory.scrollHeight, overflowY: getComputedStyle(laboratory).overflowY } : null,
            documentWidth: document.documentElement.scrollWidth, rootWidth: match.scrollWidth,
            touchControls: !!document.querySelector('[aria-label="Commandes tactiles"]'),
          };
        });
        assert.deepEqual(data.intrinsic, { width: 960, height: 540 });
        assert(data.textRows.every(row => row.scrollHeight <= row.clientHeight + 1), "HUD and status text must never compress into the arena");
        assert(Math.abs(data.canvas.width / data.canvas.height - 16 / 9) < 0.002, "The actual canvas box must remain 16:9");
        assert(Math.abs(data.canvas.width - data.shell.width) < 1 && Math.abs(data.canvas.height - data.shell.height) < 1, "The overlays must share the exact canvas bounds");
        assert(data.canvas.x >= -1 && data.canvas.right <= viewport.width + 1);
        assert(data.canvas.y >= 0 && data.canvas.bottom <= viewport.height + 1, "The complete canvas, including feet, must remain visible");
        assert(data.documentWidth <= viewport.width && data.rootWidth <= viewport.width, "No horizontal overflow");
        assert.equal(data.touchControls, touch);
        if (laboratoryOpen) {
          assert(data.laboratory.right <= viewport.width + 1);
          if (viewport.width >= 1000) assert(data.laboratory.x >= data.canvas.right - 1, "Desktop tools must not cover the arena");
          else assert(data.laboratory.y >= data.canvas.bottom - 1, "Mobile tools must remain below the arena");
          assert.equal(data.labScroll.overflowY, "auto");
          const lab = page.getByRole("complementary", { name: "Laboratoire d’entraînement" });
          await lab.evaluate(element => { element.scrollTop = element.scrollHeight; });
          assert(await lab.evaluate(element => element.scrollHeight <= element.clientHeight || element.scrollTop > 0), "Overflowing laboratory controls must remain reachable");
          await lab.getByRole("button", { name: "Enregistrer le mannequin", exact: true }).scrollIntoViewIfNeeded();
          assert(await lab.getByRole("button", { name: "Enregistrer le mannequin", exact: true }).evaluate(element => { const r = element.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
          await lab.evaluate(element => { element.scrollTop = 0; });
          await root.evaluate(element => element.scrollTo(0, 0));
        }
        const name = `${touch ? "touch-" : ""}${viewport.width}x${viewport.height}-lab-${laboratoryOpen ? "open" : "closed"}`;
        await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
        await canvas.screenshot({ path: `${output}/${name}-canvas.png` });
        checks.push({ viewport, laboratoryOpen, touch, ...data });
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  const result = { passed: true, surface: "full-application-pit-layout", verifiedContentVersion: expectedVersion, checkedAt: new Date().toISOString(), url: base, checks, errors };
  await fs.writeFile(`${output}/browser-qa.json`, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
