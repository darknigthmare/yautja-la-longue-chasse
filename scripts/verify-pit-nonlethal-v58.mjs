import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';

const url = process.env.V58_NONLETHAL_QA_URL || 'http://localhost:4178';
const output = process.env.V58_NONLETHAL_QA_OUTPUT || 'work-local/v58/qa/nonlethal';
await fs.mkdir(output, { recursive: true });
const checks = [], captures = [], errors = [], consoleErrors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const record = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(JSON.stringify({ passed: true, name })); };
let page;
try {
  for (const reducedGore of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const fixture = structuredClone(await campaignFixture());
    fixture.save.settings.reducedGore = reducedGore;
    fixture.save.settings.screenShake = false;
    await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
    // Observe actual contact-ring drawing, without changing game state or paint arguments.
    await context.addInitScript(() => {
      window.__v58ContactRings = [];
      window.__v58ContactDiagnostics = [];
      window.__v58RawStrokes = { arcs: 0, strokes: 0, samples: [] };
      const proto = CanvasRenderingContext2D.prototype;
      const beginPath = proto.beginPath, arc = proto.arc, stroke = proto.stroke;
      const paths = new WeakMap();
      proto.beginPath = function (...args) { paths.delete(this); return beginPath.apply(this, args); };
      proto.arc = function (...args) { window.__v58RawStrokes.arcs++; paths.set(this, args); return arc.apply(this, args); };
      proto.stroke = function (...args) {
        window.__v58RawStrokes.strokes++;
        const shape = paths.get(this);
        if (shape && window.__v58RawStrokes.samples.length < 20) window.__v58RawStrokes.samples.push({ shape, canvas: this.canvas.outerHTML?.slice(0, 1200), color: this.strokeStyle, width: this.lineWidth });
        if (this.canvas.dataset.pitFighterPositions && shape && shape[2] >= 10 && shape[2] < 55 && window.__v58ContactDiagnostics.length < 100) window.__v58ContactDiagnostics.push({ color: this.strokeStyle, width: this.lineWidth, radius: shape[2] });
        if (this.canvas.dataset.pitFighterPositions && this.lineWidth === 5 && shape && shape[2] >= 10 && shape[2] < 55 && ['#e8bd66', '#bb303b'].includes(this.strokeStyle)) {
          window.__v58ContactRings.push({ color: this.strokeStyle, radius: shape[2] });
        }
        return stroke.apply(this, args);
      };
    });
    page = await context.newPage(); page.setDefaultTimeout(45000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await enterCampaignDeck(page, { url });
    await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
    await page.locator('[data-pit-narrative-open]').click();
    await page.locator('[data-pit-narrative-trials]').waitFor();
    const saved = () => page.evaluate(key => Object.fromEntries(Object.entries(localStorage).filter(([name]) => name === key || /the-pit|pit-save|pit-replay/i.test(name))), fixture.key);
    const before = await saved();
    await page.clock.install();
    for (const id of ['greyback-city-rival', 'berserker-classic-rival']) {
      const clanTrial = id === 'greyback-city-rival';
      await page.locator(`[data-narrative-choice="${id}"]`).click();
      await page.waitForFunction(() => document.querySelector('[data-narrative-primary]')?.disabled === false);
      assert.equal(await page.locator('[data-narrative-combat-policy="non-lethal-clan-trial"]').count(), Number(clanTrial));
      await page.evaluate(() => { window.__v58ContactRings.length = 0; });
      await page.locator('[data-narrative-primary]').click();
      await page.locator('[data-pit-immersive]').waitFor();
      // Let the actual CPU approach and strike; no health, phase or winner injection.
      let rings = [];
      for (let step = 0; step < 180 && !rings.length; step++) {
        await page.clock.runFor(200);
        rings = await page.evaluate(() => window.__v58ContactRings);
        assert.equal(await page.locator('#error-title').count(), 0);
      }
      assert(rings.length > 0, `${id}: the real duel must paint a contact ring`);
      const expected = clanTrial || reducedGore ? '#e8bd66' : '#bb303b';
      assert(rings.every(ring => ring.color === expected), `${id}: actual contact style must match the scoped policy`);
      const capture = `${id}-setting-${reducedGore}.png`;
      await page.screenshot({ path: path.join(output, capture) }); captures.push(capture);
      record(`${id}-user-setting-${reducedGore}`, { expected, observed: [...new Set(rings.map(ring => ring.color))], samples: rings.length });
      if (clanTrial && !reducedGore) {
        for (let step = 0; step < 1500 && !(await page.getByRole('button', { name: 'Lire l’issue de l’épreuve', exact: true }).isVisible()); step++) await page.clock.runFor(200);
        await page.getByRole('button', { name: 'Lire l’issue de l’épreuve', exact: true }).click();
        await page.locator('[data-narrative-outcome="defeat"]').waitFor();
        assert.match(await page.locator('[data-pit-narrative-trials] [role="status"]').innerText(), /aucun des deux chasseurs n’est tué/);
        const resultCapture = 'greyback-nonlethal-defeat.png';
        await page.screenshot({ path: path.join(output, resultCapture) }); captures.push(resultCapture);
        record('actual-greyback-defeat-is-narratively-nonlethal');
      } else {
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Retour au récit', exact: true }).click();
        await page.locator('[data-narrative-outcome="abandoned"]').waitFor();
      }
      assert.deepEqual(await saved(), before, 'the scoped presentation must preserve both settings and progression');
    }
    record(`settings-and-progress-unchanged-${reducedGore}`);
    await context.close(); page = null;
  }
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, url, checks, captures, errors, consoleErrors,
    scope: 'Actual CPU bouts; passive Canvas contact-ring observation; both saved violence preferences; one completed Greyback defeat; unchanged settings/progression. This verifies presentation, not a new nonlethal combat mechanic.' }, null, 2));
} catch (error) {
  if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: false, url, checks, captures, errors, consoleErrors, error: String(error.stack || error), diagnostics: page ? await page.evaluate(() => ({filtered: window.__v58ContactDiagnostics, raw: window.__v58RawStrokes, strokeHook: CanvasRenderingContext2D.prototype.stroke.toString().slice(0, 100)})).catch(() => null) : null }, null, 2));
  throw error;
} finally { await browser.close(); }
