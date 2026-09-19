import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { assertPrivateOutput, checkDownloadBudget, DOWNLOAD_LIMITS, freeBytes,
  isAllowedDownloadUrl, validatedDownloadName, sha256 } from "./chatgpt-source-capture.mjs";

/** CDP monitoring is confined to the new capture tab's frame and selected context. */
export async function createDownloadGuard(browser, page, { workspace, output, budget, limits = DOWNLOAD_LIMITS }) {
  await assertPrivateOutput(workspace, output);
  const incoming = await assertPrivateOutput(workspace, path.join(output, "incoming"), true);
  const session = await browser.newBrowserCDPSession();
  const pageSession = await page.context().newCDPSession(page);
  let scope = {}, configured = false, unusable = false, busy = false, lock = null, lockPath = null, closed = false;
  const lockRoot = await assertPrivateOutput(workspace, path.join(workspace, "work", "v37", "chatgpt-intake"));
  const releaseLock = async () => {
    if (!lock) return;
    await lock.close(); lock = null;
    await assertPrivateOutput(workspace, lockRoot);
    await fs.unlink(lockPath);
  };
  try {
    const { targetInfo } = await pageSession.send("Target.getTargetInfo");
    const { frameTree } = await pageSession.send("Page.getFrameTree");
    if (!frameTree?.frame?.id) throw Error("Cannot isolate the capture frame; download blocked.");
    scope = targetInfo.browserContextId ? { browserContextId: targetInfo.browserContextId } : {};
    lockPath = path.join(lockRoot, "download-context-" + sha256(scope.browserContextId ?? "default").slice(0, 16) + ".lock");
    lock = await fs.open(lockPath, "wx");
    await lock.writeFile(JSON.stringify({ pid: process.pid, output, createdAt: new Date().toISOString() }));
    configured = true; // A failed CDP response can still have changed the browser setting.
    await session.send("Browser.setDownloadBehavior", { ...scope, behavior: "allowAndName", downloadPath: incoming, eventsEnabled: true });
    const frameId = frameTree.frame.id;
    return {
      async download(click, index) {
        if (busy || unusable || closed) throw Error("Download monitor unavailable; transfer blocked.");
        await assertPrivateOutput(workspace, incoming);
        const initialFree = await freeBytes(incoming);
        const preflight = checkDownloadBudget({ receivedBytes: 0, usedBytes: budget.usedBytes, availableBytes: initialFree }, limits);
        if (preflight || budget.usedBytes >= limits.totalBytes) throw Error(preflight ?? "Total transfer budget exhausted.");
        busy = true;
        let guid = null, name = null, received = 0, expected = 0, settled = false, finalFile = null;
        let resolveDone, rejectDone, timeout, poll;
        const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
        done.catch(() => {});
        let queue = Promise.resolve();
        const clearTimers = () => { clearTimeout(timeout); clearInterval(poll); };
        const fail = async error => {
          if (settled) return;
          settled = true; clearTimers();
          if (guid) {
            let cancelTimer;
            try {
              await Promise.race([session.send("Browser.cancelDownload", { ...scope, guid }),
                new Promise((_, reject) => { cancelTimer = setTimeout(() => reject(Error("Cancellation could not be confirmed.")), 3000); })]);
            } catch (cancelError) { unusable = true; error = Error(`${error.message} ${cancelError.message}`); }
            finally { clearTimeout(cancelTimer); }
          }
          rejectDone(error);
        };
        const onBegin = event => {
          if (event.frameId !== frameId) return; // Never capture or cancel another tab's downloads.
          if (guid || settled) {
            void session.send("Browser.cancelDownload", { ...scope, guid: event.guid }).catch(() => { unusable = true; });
            return;
          }
          guid = event.guid;
          try {
            if (!/^[a-zA-Z0-9_-]{1,128}$/.test(guid) || !isAllowedDownloadUrl(event.url)) throw Error("Unexpected download identity or origin.");
            name = validatedDownloadName(event.suggestedFilename);
          } catch (error) { void fail(error); }
        };
        const check = async () => {
          const reason = checkDownloadBudget({ receivedBytes: received, totalBytes: expected, usedBytes: budget.usedBytes,
            availableBytes: await freeBytes(incoming) }, limits);
          if (reason) throw Error(reason);
        };
        const onProgress = event => {
          if (!guid || event.guid !== guid || settled) return;
          queue = queue.then(async () => {
            if (settled) return;
            if (![event.receivedBytes, event.totalBytes].every(value => Number.isFinite(value) && value >= 0)) throw Error("Invalid download progress.");
            received = Math.max(received, event.receivedBytes); expected = Math.max(expected, event.totalBytes);
            await check();
            if (settled) return;
            if (event.state === "canceled") throw Error("Browser canceled the download.");
            if (event.state !== "completed") return;
            await assertPrivateOutput(workspace, incoming);
            const source = path.join(incoming, guid);
            const info = await fs.lstat(source);
            if (!info.isFile() || info.isSymbolicLink() || info.size <= 0 || info.size !== received) throw Error("Completed download bytes could not be verified.");
            await assertPrivateOutput(workspace, output);
            if (settled) return;
            const target = path.join(output, `${String(index).padStart(3, "0")}-${name}`);
            // Same-volume, exclusive hard link avoids both overwrite and a second large copy.
            await fs.link(source, target);
            finalFile = target;
            const digest = createHash("sha256");
            for await (const chunk of createReadStream(target)) digest.update(chunk);
            await fs.unlink(source);
            settled = true; clearTimers();
            resolveDone({ name, file: path.basename(target), bytes: info.size, sha256: digest.digest("hex"), status: "downloaded-unreviewed" });
          }).catch(error => fail(error));
        };
        session.on("Browser.downloadWillBegin", onBegin);
        session.on("Browser.downloadProgress", onProgress);
        timeout = setTimeout(() => void fail(Error("Download transfer deadline exceeded.")), limits.timeoutMs);
        poll = setInterval(() => { queue = queue.then(() => settled ? undefined : check()).catch(error => fail(error)); }, limits.pollMs);
        try {
          await click();
          return await done;
        } catch (error) {
          await fail(error);
          await done.catch(() => {});
          throw error;
        } finally {
          clearTimers();
          session.off("Browser.downloadWillBegin", onBegin); session.off("Browser.downloadProgress", onProgress);
          await queue;
          budget.usedBytes += received; // Failed transfers consume the same total network budget.
          busy = false;
          if (guid && /^[a-zA-Z0-9_-]{1,128}$/.test(guid)) {
            await assertPrivateOutput(workspace, incoming);
            for (const leaf of [guid, `${guid}.crdownload`]) await fs.unlink(path.join(incoming, leaf)).catch(() => {});
          }
          // Keep a successfully hashed result only; partial files are never promoted.
          if (finalFile && (await done.then(() => false, () => true))) {
            await assertPrivateOutput(workspace, output);
            await fs.unlink(finalFile).catch(() => {});
          }
        }
      },
      async close() {
        if (closed) return;
        closed = true;
        try { await session.send("Browser.setDownloadBehavior", { ...scope, behavior: "default", eventsEnabled: false }); }
        finally {
          await Promise.allSettled([session.detach(), pageSession.detach()]);
          await releaseLock();
        }
      },
    };
  } catch (error) {
    if (configured) await session.send("Browser.setDownloadBehavior", { ...scope, behavior: "default", eventsEnabled: false }).catch(() => {});
    await Promise.allSettled([session.detach(), pageSession.detach()]);
    await releaseLock();
    throw Error(`Download monitor unavailable; downloads blocked: ${error.message}`);
  }
}
