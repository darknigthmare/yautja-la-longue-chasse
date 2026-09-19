import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { sha256, splitSourceText, parseCaptureArgs, assertCaptureUrl, isChatGPTFileLink,
  createPrivateOutput, assertPrivateOutput, waitForStableCapture, DOWNLOAD_LIMITS } from "./lib/chatgpt-source-capture.mjs";
import { createDownloadGuard } from "./lib/chatgpt-download-guard.mjs";

// Only the dedicated browser and an explicitly authorized thread/share. No authentication
// storage, private conversation APIs, conversation sharing, or outgoing messages.
const options = parseCaptureArgs(process.argv.slice(2));
const root = await fs.realpath(process.cwd());
const output = await createPrivateOutput(root, options.threadId);
const writePrivate = async (name, content) => {
  await assertPrivateOutput(root, output);
  await fs.writeFile(path.join(output, name), content, { flag: "wx" });
};
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${options.port}`);
try {
  const context = browser.contexts().find(c => c.pages().some(p => {
    try { return new URL(p.url()).origin === "https://chatgpt.com"; } catch { return false; }
  }));
  if (!context) throw Error("No ChatGPT page in the dedicated browser. Open the authorized site there first.");
  // Preserve the existing authentication window, even when it currently shows an error.
  const page = await context.newPage();
  let guard = null;
  try {
    await page.goto(options.url, { waitUntil: "domcontentloaded" });
    await page.locator('[data-message-author-role]').first().waitFor({ timeout: 45000 });
    const read = async () => {
      assertCaptureUrl(page.url(), options.url);
      return page.evaluate(() => {
        const main = document.querySelector("main") ?? document;
        const visible = node => node.getClientRects().length > 0;
        const generating = [...main.querySelectorAll('[data-is-streaming="true"], .result-streaming, [data-message-author-role][aria-busy="true"], button[data-testid="stop-button"], button[aria-label*="Stop generating" i], button[aria-label*="Stop streaming" i], button[aria-label*="Arrêter" i]')].some(visible);
        return { title: document.title, url: location.href, documentReady: document.readyState === "complete", generationDetected: generating,
          messages: [...document.querySelectorAll('[data-message-author-role]')].map((node, index) => ({
            index: index + 1, role: node.getAttribute('data-message-author-role'), id: node.getAttribute('data-message-id'), text: node.innerText,
          })),
          pageText: document.body.innerText,
          links: [...document.querySelectorAll('main a[href]')].map((node, index) => ({ index, text: node.innerText, href: node.href })),
          unrecognizedDownloadControls: [...main.querySelectorAll('button')].filter(node => visible(node) &&
            /download|télécharger/i.test(`${node.innerText} ${node.getAttribute('aria-label') ?? ''}`))
            .map(node => ({ label: node.innerText || node.getAttribute('aria-label'), status: "not-downloaded", reason: "Button requires separate review; only observed file anchors are supported." })),
        };
      });
    };
    const observed = await waitForStableCapture(read);
    const capture = observed.capture;
    if (!capture?.messages.length) throw Error("No rendered conversation messages could be captured.");
    assertCaptureUrl(capture.url, options.url);
    const manifest = { format: "yautja-chatgpt-dom-capture-v2", threadId: options.threadId, title: capture.title,
      capturedAt: new Date().toISOString(), mode: options.share ? "authorized-public-share" : "visible-conversation-branch",
      captureStatus: observed.captureStatus, textStatus: observed.textStatus, historyCompleteness: observed.historyCompleteness,
      exhaustiveProjectExport: false, limits: observed.reasons, messages: [], downloads: [],
      downloadLimits: DOWNLOAD_LIMITS, downloadRequested: options.download };
    await writePrivate("capture.private.json", JSON.stringify(capture, null, 2));
    await writePrivate("page.private.txt", capture.pageText);
    for (const message of capture.messages) {
      const prefix = `message-${String(message.index).padStart(3, "0")}`;
      const chunks = splitSourceText(message.text);
      await writePrivate(`${prefix}.txt`, message.text);
      for (let i = 0; i < chunks.length; i++) await writePrivate(`${prefix}.part-${String(i + 1).padStart(3, "0")}.txt`, chunks[i]);
      manifest.messages.push({ index: message.index, role: message.role, id: message.id, chars: message.text.length,
        sha256: sha256(message.text), file: `${prefix}.txt`, chunks: chunks.length, textStatus: observed.textStatus,
        sourceCompleteness: "unverified" });
    }
    if (options.download) {
      const budget = { usedBytes: 0 };
      let blocked = observed.stable ? null : "Unstable draft capture: downloads blocked.";
      const candidates = capture.links.filter(isChatGPTFileLink);
      if (!blocked && candidates.length) {
        try { guard = await createDownloadGuard(browser, page, { workspace: root, output, budget }); }
        catch (error) { blocked = error.message; }
      }
      const seen = new Set();
      for (const link of candidates) {
        if (seen.has(link.href)) continue; seen.add(link.href);
        try {
          if (blocked) throw Error(blocked);
          assertCaptureUrl(page.url(), options.url);
          const locator = page.locator('main a[href]').nth(link.index);
          if (await locator.evaluate(a => a.href) !== link.href) throw Error("Download link changed; skipped.");
          // Keep the download in the monitored frame, never a new unmonitored target tab.
          await locator.evaluate(a => { a.target = "_self"; });
          const result = await guard.download(() => locator.click({ timeout: 10000, noWaitAfter: true }), manifest.downloads.length + 1);
          manifest.downloads.push({ ...result, label: link.text });
        } catch (error) {
          manifest.downloads.push({ label: link.text, status: "not-downloaded", reason: error.message });
        }
      }
      manifest.downloads.push(...capture.unrecognizedDownloadControls);
      manifest.transferBytesObserved = budget.usedBytes;
    }
    await writePrivate("manifest.private.json", JSON.stringify(manifest, null, 2));
    const failedDownloads = manifest.downloads.filter(d => d.status === "not-downloaded").length;
    console.log(JSON.stringify({ output, messages: manifest.messages.length, maxMessageChars: Math.max(0, ...manifest.messages.map(m => m.chars)),
      captureStatus: observed.captureStatus, textStatus: observed.textStatus, historyCompleteness: "unverified",
      downloaded: manifest.downloads.filter(d => d.status === "downloaded-unreviewed").length, failedDownloads,
      exhaustiveProjectExport: false }, null, 2));
    if (!observed.stable || failedDownloads) process.exitCode = 2;
  } finally {
    try { await guard?.close(); } finally { await page.close(); }
  }
} catch (error) {
  process.exitCode = 1;
  console.error("Capture incomplete:", error.message);
} finally {
  // Do not close the dedicated browser, the existing login window or its profile.
  process.exitCode ??= 0;
  setTimeout(() => process.exit(process.exitCode), 20);
}
