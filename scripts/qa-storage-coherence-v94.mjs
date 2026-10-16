/** Diagnostic only: two real tabs, isolated loopback origin and synthetic data.
 * It does not weaken a regression assertion or touch any user's save. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><title>Native storage coherence diagnostic</title>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch({headless: true, ...(process.env.AUDIT_CHROME_EXECUTABLE
    ? {executablePath: process.env.AUDIT_CHROME_EXECUTABLE} : {channel: 'chrome'})});
  for (const mode of ['sync', 'yield-before', 'yield-after', 'idb-cas']) {
    const context = await browser.newContext();
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const pages = await Promise.all([context.newPage(), context.newPage()]);
    for (const page of pages) {
      await page.goto(origin);
      await page.evaluate(async () => {
        window.probeDb = await new Promise((resolve, reject) => {
          const open = indexedDB.open('coherence-probe', 1);
          open.onupgradeneeded = () => open.result.createObjectStore('values');
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
      });
    }
    let doubleWinners = 0;
    const samples = [];
    for (let iteration = 0; iteration < 100; iteration++) {
      const key = `probe-${mode}-${iteration}`;
      for (const page of pages) await page.evaluate(key => { window.probeBefore = localStorage.getItem(key); }, key);
      const round = await Promise.all(pages.map((page, id) => page.evaluate(async ({key, id, mode}) => {
        const target = JSON.stringify({id, padding: 'x'.repeat(24000)});
        if (mode === 'idb-cas') return new Promise((resolve, reject) => {
          const tx = window.probeDb.transaction('values', 'readwrite');
          const values = tx.objectStore('values');
          let won = false;
          const read = values.get(key);
          read.onsuccess = () => {
            if (read.result !== undefined) return;
            values.put(target, key); won = true;
          };
          tx.oncomplete = () => resolve({won});
          tx.onabort = () => reject(tx.error);
        });
        return navigator.locks.request('coherence-probe-lock', async lock => {
          if (mode === 'yield-before') await new Promise(resolve => setTimeout(resolve, 0));
          const current = localStorage.getItem(key);
          if (current !== window.probeBefore) return {won: false, mode: lock.mode};
          localStorage.setItem(key, target);
          const confirmed = localStorage.getItem(key) === target;
          if (mode === 'yield-after') await new Promise(resolve => setTimeout(resolve, 0));
          return {won: confirmed, mode: lock.mode};
        });
      }, {key, id, mode})));
      if (round.filter(r => r.won).length > 1) { doubleWinners++; if (samples.length < 3) samples.push({iteration, round}); }
    }
    results.push({mode, iterations: 100, doubleWinners, samples});
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
  assert.equal(results.find(r => r.mode === 'idb-cas').doubleWinners, 0, 'Native transactional control must serialize writers');
  const report = {scope: 'Diagnostic, not gameplay QA. Timing yields are probes, not a claimed fix.', browser: browser.version(), results};
  await fs.mkdir('outputs/qa-audit-v94', {recursive: true});
  await fs.writeFile('outputs/qa-audit-v94/storage-coherence.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
