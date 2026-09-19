import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPrivateOutput } from "../scripts/lib/chatgpt-source-capture.mjs";
import { createDownloadGuard } from "../scripts/lib/chatgpt-download-guard.mjs";

async function setup(t, limits = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-guard-test-"));
  const output = await createPrivateOutput(root, "6a9f6ce6-2548-83eb-a8ee-152b84e89fe5");
  const session = new EventEmitter();
  const calls = [];
  session.send = async (method, args) => { calls.push({ method, args }); };
  session.detach = async () => {};
  const pageSession = { send: async method => method === "Target.getTargetInfo" ? { targetInfo: { browserContextId: "dedicated-context" } } :
    { frameTree: { frame: { id: "capture-frame" } } }, detach: async () => {} };
  const browser = { newBrowserCDPSession: async () => session };
  const page = { context: () => ({ newCDPSession: async () => pageSession }) };
  const budget = { usedBytes: 0 };
  const guard = await createDownloadGuard(browser, page, { workspace: root, output, budget,
    limits: { fileBytes: 8, totalBytes: 12, reserveBytes: 0, timeoutMs: 150, pollMs: 5, ...limits } });
  t.after(async () => {
    await guard.close();
    const relative = path.relative(await fs.realpath(os.tmpdir()), await fs.realpath(root));
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    await fs.rm(root, { recursive: true, force: true });
  });
  const begin = (guid, extra = {}) => session.emit("Browser.downloadWillBegin", { guid, frameId: "capture-frame",
    url: "https://chatgpt.com/backend-api/files/file/download", suggestedFilename: "sprite.png", ...extra });
  const progress = (guid, receivedBytes, totalBytes, state = "inProgress") => session.emit("Browser.downloadProgress", { guid, receivedBytes, totalBytes, state });
  const complete = async (guid, bytes = "abc") => {
    begin(guid);
    await fs.writeFile(path.join(output, "incoming", guid), bytes);
    progress(guid, Buffer.byteLength(bytes), Buffer.byteLength(bytes), "completed");
  };
  return { guard, budget, output, calls, begin, progress, complete, session, root, browser, page };
}

test("CDP guard preserves other tabs, promotes verified bytes only and restores scoped settings", async t => {
  const f = await setup(t);
  const result = await f.guard.download(async () => {
    f.begin("other-guid", { frameId: "login-frame", suggestedFilename: "outside.exe" });
    f.progress("other-guid", 99999999, 99999999);
    await f.complete("our-guid");
  }, 1);
  assert.equal(result.status, "downloaded-unreviewed"); assert.equal(result.bytes, 3);
  assert.equal(await fs.readFile(path.join(f.output, result.file), "utf8"), "abc");
  assert.equal(f.budget.usedBytes, 3);
  assert.ok(!f.calls.some(call => call.method === "Browser.cancelDownload" && call.args.guid === "other-guid"));
  assert.deepEqual(await fs.readdir(path.join(f.output, "incoming")), []);
  await f.guard.close();
  const restored = f.calls.filter(call => call.method === "Browser.setDownloadBehavior").at(-1);
  assert.deepEqual(restored.args, { browserContextId: "dedicated-context", behavior: "default", eventsEnabled: false });
});

test("per-file and total limits cancel before large transfers and count failed received bytes", async t => {
  const f = await setup(t);
  await assert.rejects(f.guard.download(async () => { f.begin("large"); f.progress("large", 0, 9); }, 1), /Per-file/);
  assert.ok(f.calls.some(call => call.method === "Browser.cancelDownload" && call.args.guid === "large"));
  await f.guard.download(() => f.complete("first", "12345678"), 2);
  await assert.rejects(f.guard.download(async () => { f.begin("total"); f.progress("total", 1, 5); }, 3), /Total/);
  assert.equal(f.budget.usedBytes, 9);
  await f.guard.download(() => f.complete("last", "abc"), 4);
  let clicked = false;
  await assert.rejects(f.guard.download(async () => { clicked = true; }, 5), /budget exhausted/);
  assert.equal(clicked, false);
});

test("transfer timeout cancels in-flight bytes and removes only its private incomplete files", async t => {
  const f = await setup(t, { timeoutMs: 30 });
  await assert.rejects(f.guard.download(async () => {
    f.begin("slow");
    await fs.writeFile(path.join(f.output, "incoming", "slow.crdownload"), "a");
    f.progress("slow", 1, 3);
  }, 1), /deadline/);
  assert.ok(f.calls.some(call => call.method === "Browser.cancelDownload" && call.args.guid === "slow"));
  assert.deepEqual(await fs.readdir(path.join(f.output, "incoming")), []);
  assert.equal(f.budget.usedBytes, 1);
});

test("unsupported suggested filename and external final origin are blocked and canceled", async t => {
  const f = await setup(t);
  for (const extra of [{ suggestedFilename: "payload.exe" }, { url: "https://other.test/sprite.png" }]) {
    await assert.rejects(f.guard.download(async () => f.begin("bad", extra), 1), /filename|origin/);
  }
  assert.equal(f.calls.filter(call => call.method === "Browser.cancelDownload").length, 2);
  assert.deepEqual(await fs.readdir(path.join(f.output, "incoming")), []);
});

test("disk reserve refuses a transfer before clicking the candidate", async t => {
  const f = await setup(t, { reserveBytes: Number.MAX_SAFE_INTEGER });
  let clicked = false;
  await assert.rejects(f.guard.download(async () => { clicked = true; }, 1), /disk/);
  assert.equal(clicked, false);
});

test("unconfirmed cancellation disables later downloads instead of retrying unsafely", async t => {
  const f = await setup(t);
  f.session.send = async (method, args) => {
    f.calls.push({ method, args });
    if (method === "Browser.cancelDownload") throw Error("CDP cancellation unavailable");
  };
  await assert.rejects(f.guard.download(async () => { f.begin("oversized"); f.progress("oversized", 0, 100); }, 1), /cancellation unavailable/);
  await assert.rejects(f.guard.download(async () => assert.fail("must not click"), 2), /unavailable/);
});


test("a second download guard cannot change settings while the same context is locked", async t => {
  const f = await setup(t);
  const second = await createPrivateOutput(f.root, "6a9f6ce6-2548-83eb-a8ee-152b84e89fe5");
  const settingsBefore = f.calls.filter(call => call.method === "Browser.setDownloadBehavior").length;
  await assert.rejects(createDownloadGuard(f.browser, f.page, { workspace: f.root, output: second, budget: { usedBytes: 0 } }), /EEXIST/);
  assert.equal(f.calls.filter(call => call.method === "Browser.setDownloadBehavior").length, settingsBefore);
  await f.guard.close();
  const replacement = await createDownloadGuard(f.browser, f.page, { workspace: f.root, output: second, budget: { usedBytes: 0 } });
  await replacement.close();
});

test("failed CDP configuration restores default behavior and releases the context lock", async t => {
  const f = await setup(t);
  await f.guard.close();
  f.session.send = async (method, args) => {
    f.calls.push({ method, args });
    if (method === "Browser.setDownloadBehavior" && args.behavior === "allowAndName") throw Error("Configuration response lost");
  };
  await assert.rejects(createDownloadGuard(f.browser, f.page, { workspace: f.root, output: f.output, budget: { usedBytes: 0 } }), /response lost/);
  const settings = f.calls.filter(call => call.method === "Browser.setDownloadBehavior");
  assert.equal(settings.at(-1).args.behavior, "default");
  const files = await fs.readdir(path.join(f.root, "work", "v37", "chatgpt-intake"));
  assert.ok(files.every(file => !file.endsWith(".lock")));
});
