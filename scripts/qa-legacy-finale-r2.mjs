import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright-core";
import { houseSite, legacyFixture } from "../tests/helpers/legacy-finale-r2.mjs";

const output = resolve(process.env.LEGACY_FINALE_OUTPUT ?? "outputs/qa-legacy-finale-r2");
const scratch = resolve("work-local");
await mkdir(scratch, { recursive: true });
await mkdir(output, { recursive: true });
const directory = await mkdtemp(resolve(scratch, "legacy-finale-r2-"));
const mount = "/" + relative(process.cwd(), directory).replaceAll("\\", "/") + "/";
await writeFile(resolve(directory, "index.html"), '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Recette M059 et M060</title><body style="background:#172024;color:#f4ebdb;font:17px system-ui;padding:15px"><div id="root"></div><script type="module" src="/tests/browser/legacy-finale-r2.fixture.tsx"></script></body></html>');
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "Test-only prior origin ending and Ancient fixtures. The campaign does not provide the origin ending prerequisite yet. All actions below use the real controls and reducer.",
  scenarios: [],
  errors: [],
};
let server, browser;
try {
  server = await createServer({ configFile: false, plugins: [react()],
    server: { host: "127.0.0.1", port: 4225, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  const site = "http://127.0.0.1:4225" + mount;
  for (const approach of ["stay", "help"]) {
    const context = await browser.newContext({ viewport: { width: 1250, height: 790 } });
    await context.addInitScript(admission => { window.legacyAdmissionR2 = admission; }, { site: houseSite, save: legacyFixture() });
    const page = await context.newPage();
    page.on("pageerror", error => report.errors.push(error.message));
    page.setDefaultTimeout(23000);
    const panel = page.locator("[data-legacy-finale]");
    const action = (name) => panel.locator('[data-legacy-action="' + name + '"]');
    const walk = async target => {
      const at = Number(await panel.getAttribute("data-legacy-at"));
      for (let step = 0; step < Math.abs(target - at); step++) {
        await panel.locator('[data-legacy-move="' + (target > at ? "right" : "left") + '"]').click();
      }
      assert.equal(Number(await panel.getAttribute("data-legacy-at")), target);
    };
    await page.goto(site);
    await panel.waitFor();
    assert.equal(await action("unload").isDisabled(), true);
    assert.equal(await panel.locator("img[data-speaker]").count(), 4);
    await walk(11); await action("unload").click();
    await walk(9); await action("wall-foot").click();
    await walk(11); await action("test").click();
    assert.equal(await panel.locator("[data-steady]").getAttribute("data-steady"), "false");
    await page.reload(); await panel.waitFor();
    assert.equal(await panel.locator("[data-loaded]").getAttribute("data-loaded"), "true");
    assert.equal(await panel.locator("[data-wall]").getAttribute("data-wall"), "true");
    await action("unload").click();
    await walk(13); await action("door-foot").click();
    await walk(11); await action("test").click();
    await walk(15); await action(approach).click();
    if (approach === "stay") {
      for (const x of [15, 17, 19, 21]) { await walk(x); await action("listen").click(); }
      await walk(22); await action("unknown").click(); await action("close").click();
    } else {
      await walk(2); await action("close").click();
    }
    assert.equal(await panel.getAttribute("data-legacy-complete"), "true");
    await panel.screenshot({ path: resolve(output, "cohorte-" + approach + ".png"), animations: "disabled" });
    await page.reload(); await panel.waitFor();
    assert.equal(await panel.getAttribute("data-legacy-complete"), "true");
    if (approach === "stay") {
      await page.goto(site + "?epilogue"); await panel.waitFor();
      await walk(6); await action("belongings").click();
      await walk(11); await action("relations").click();
      await walk(16); await action("transmit").click();
      await walk(21); await action("act").click();
      assert.equal(await panel.getAttribute("data-legacy-complete"), "true");
      await panel.screenshot({ path: resolve(output, "epilogue-transmission.png"), animations: "disabled" });
    }
    report.scenarios.push({ approach, finished: true });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
}
