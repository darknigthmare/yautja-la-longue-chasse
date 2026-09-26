import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { selectPitMatch, closePitSelectionOptions } from './pit-selection-browser-helpers.mjs';
const url = process.env.V51_LAYOUT_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V51_LAYOUT_QA_OUTPUT || 'outputs/qa-commercial-audit/v51/countdown-layout-browser-qa';
const browserChannel = process.env.V51_QA_BROWSER_CHANNEL || 'chrome';
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], responses = [];
let browser, page;
try {
  browser = await chromium.launch({ channel: browserChannel, headless: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 640, height: 360 }]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, reducedMotion: 'reduce' });
    const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
    await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
    page = await context.newPage(); page.setDefaultTimeout(45000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) responses.push({ status: response.status(), url: response.url() }); });
    await enterCampaignDeck(page, { url });
    assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), 'V51');
    await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
    await closePitSelectionOptions(page); await page.getByRole('radio', { name: /^Versus local/ }).click();
    await selectPitMatch(page, { player: 'jungle-hunter', opponent: 'city-hunter', arena: 'the-pit' });
    await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'countdown' && Number(document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationElapsedMs) >= 400);
    const state = await page.locator('[data-pit-round-presentation]').evaluate(node => {
      const panel = node.firstElementChild, digit = panel.querySelector('strong'), style = getComputedStyle(panel);
      return { phase: node.dataset.phase, className: panel.className, slotAttribute: panel.getAttribute('data-slot'), digit: digit.textContent, elapsed: Number(document.querySelector('[data-pit-immersive]').dataset.pitPresentationElapsedMs), digitFontSize: getComputedStyle(digit).fontSize, panelBorderLeft: style.borderLeftWidth, panelBorderRight: style.borderRightWidth, overflowX: document.documentElement.scrollWidth > innerWidth, overflowY: document.documentElement.scrollHeight > innerHeight + 1 };
    });
    checks.push({ viewport, state });
    await fs.writeFile(path.join(output, `${viewport.width}-state.json`), JSON.stringify(state, null, 2));
    await page.screenshot({ path: path.join(output, `${viewport.width}-countdown.png`) });
    assert.equal(state.phase, 'countdown'); assert.equal(state.slotAttribute, null);
    assert(Number.parseFloat(state.digitFontSize) >= 48, 'Countdown digit must remain prominently legible');
    assert.equal(state.panelBorderLeft, '0px'); assert.equal(state.panelBorderRight, '0px');
    assert.equal(state.overflowX, false); assert.equal(state.overflowY, false);
    console.log(JSON.stringify({ passed: true, viewport, state })); await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(responses, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), url, checks, errors, responses }, null, 2));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ passed: false, checkedAt: new Date().toISOString(), url, error: String(error), stack: error?.stack, checks, errors, responses }, null, 2)); throw error;
} finally { await browser?.close(); }
