import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { splitSourceText, sha256, isChatGPTFileLink, safeDownloadName, validateThreadId,
  parseCaptureArgs, assertCaptureUrl, validatedDownloadName, isAllowedDownloadUrl,
  createPrivateOutput, assertPrivateOutput, waitForStableCapture, checkDownloadBudget, DOWNLOAD_LIMITS } from "../scripts/lib/chatgpt-source-capture.mjs";

const id = "6aa8031b-aad4-83eb-86ae-7173d8dd3e92";
async function fixture(t) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "yautja-intake-test-"));
  t.after(async () => {
    const relative = path.relative(await fs.realpath(os.tmpdir()), await fs.realpath(temp));
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    await fs.rm(temp, { recursive: true, force: true });
  });
  return temp;
}

test("long captured text survives chunks and UTF-8 disk roundtrip without splitting emoji", async t => {
  const text = "Ligne française 🛸\r\n".repeat(2400) + "dernière correction du joueur";
  const chunks = splitSourceText(text);
  assert.ok(text.length > 20000 && chunks.length > 2);
  assert.equal(chunks.join(""), text); assert.equal(sha256(chunks.join("")), sha256(text));
  const folder = await fixture(t);
  for (const [index, chunk] of chunks.entries()) {
    assert.ok(chunk.length <= 12000);
    assert.doesNotMatch(chunk, /^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/);
    const file = path.join(folder, `${index}.txt`);
    await fs.writeFile(file, chunk);
    assert.equal(await fs.readFile(file, "utf8"), chunk);
  }
  assert.deepEqual(splitSourceText(""), []);
  assert.equal(splitSourceText("a🛸b", 2).join(""), "a🛸b");
});

test("CLI supports authorized public shares with or without an explicit port", () => {
  assert.equal(parseCaptureArgs([id]).url, `https://chatgpt.com/c/${id}`);
  assert.deepEqual(parseCaptureArgs([id, "--share", "--download"]), {
    threadId: id, port: 54837, share: true, download: true, url: `https://chatgpt.com/share/${id}`,
  });
  assert.equal(parseCaptureArgs([id, "54838", "--share"]).port, 54838);
  for (const args of [["../escape"], [id, "--share", "--share"], [id, "--other"], [id, "80"], [id, "65536"], [id, "54837", "54838"]])
    assert.throws(() => parseCaptureArgs(args));
  assert.throws(() => validateThreadId("../thread"));
});

test("capture URL cannot switch origin, private/share route, credentials or parameters", () => {
  const expected = `https://chatgpt.com/share/${id}`;
  assert.doesNotThrow(() => assertCaptureUrl(expected, expected));
  for (const actual of [`https://other.test/share/${id}`, `https://chatgpt.com:8443/share/${id}`,
    `https://chatgpt.com/c/${id}`, `${expected}?other=1`, `${expected}#branch`, `https://user@chatgpt.com/share/${id}`])
    assert.throws(() => assertCaptureUrl(actual, expected));
});

test("file candidates require exact ChatGPT origin and cannot hide executable extensions", () => {
  assert.equal(isChatGPTFileLink({ href: "/backend-api/files/file123/download", text: "pack_final.zip" }), true);
  assert.equal(isChatGPTFileLink({ href: "blob:https://chatgpt.com/abc", text: "atlas.png" }), true);
  for (const href of ["https://example.com/pack.zip", "https://chatgpt.com.evil.test/pack.zip", "file:///C:/private.zip", "javascript:alert(1)",
    "https://chatgpt.com/payload.exe", "https://chatgpt.com/payload.zip.exe", "https://chatgpt.com/payload.zip%2Eexe",
    "https://chatgpt.com:8443/pack.zip", "https://user:pass@chatgpt.com/pack.zip", "blob:https://other.test/file"]) {
    assert.equal(isChatGPTFileLink({ href, text: "pack.zip" }), false, href);
  }
  assert.equal(isAllowedDownloadUrl("https://cdn.example/pack.zip"), false);
  assert.equal(isChatGPTFileLink({ href: "/backend-api/files/id/download", text: "pack.zip.exe" }), false);
});

test("actual suggested filename is validated separately before any saved file is promoted", () => {
  assert.equal(validatedDownloadName("sprite.png"), "sprite.png");
  for (const name of ["payload.exe", "payload.zip.exe", "../../pack.zip", "C:\\temp\\pack.zip", "CON.zip", "image.png ", "image.png:stream", "image.png\u0000"])
    assert.throws(() => validatedDownloadName(name));
  assert.equal(safeDownloadName("../../pack.zip"), "pack.zip");
  assert.match(safeDownloadName("CON.zip"), /^attachment-[0-9a-f]+\.bin$/);
});

test("private output rejects redirects into public and a nested UUID junction", async t => {
  const root = await fixture(t);
  const first = await createPrivateOutput(root, id);
  assert.equal(await assertPrivateOutput(root, first), first);
  await assert.rejects(assertPrivateOutput(root, path.join(root, "public", "leak"), true));
  const destination = path.join(root, "public");
  await fs.mkdir(destination);
  const nestedId = "6a9f6ce6-2548-83eb-a8ee-152b84e89fe5";
  const junction = path.join(root, "work", "v37", "chatgpt-intake", nestedId);
  await fs.symlink(destination, junction, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(createPrivateOutput(root, nestedId), /symbolic link|junction/);
  assert.deepEqual(await fs.readdir(destination), []);
  await fs.unlink(junction);
  const privateRoot = path.join(root, "work", "v37", "chatgpt-intake");
  const holding = path.join(root, "original-intake");
  await fs.rename(privateRoot, holding);
  await fs.symlink(destination, privateRoot, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(createPrivateOutput(root, id), /symbolic link|junction/);
  assert.deepEqual(await fs.readdir(destination), []);
});

const snapshot = (text, generationDetected = false) => ({ messages: [{ index: 1, role: "assistant", id: "m1", text }], links: [],
  documentReady: true, generationDetected, url: `https://chatgpt.com/share/${id}` });
function fakeClock() {
  let time = 0;
  return { quietMs: 20, timeoutMs: 80, pollMs: 10, now: () => time, sleep: async ms => { time += ms; } };
}

test("capture waits for delayed text and never declares virtualized history complete", async () => {
  const clock = fakeClock();
  const result = await waitForStableCapture(async () => snapshot(clock.now() < 20 ? "début" : "début puis correction finale 🛸"), clock);
  assert.equal(result.capture.messages[0].text, "début puis correction finale 🛸");
  assert.ok(clock.now() >= 40); assert.equal(result.stable, true);
  assert.equal(result.captureStatus, "partial"); assert.equal(result.historyCompleteness, "unverified");
});

test("a continuously changing or generating reply remains an explicit draft", async () => {
  for (const generating of [true, false]) {
    const clock = fakeClock();
    const result = await waitForStableCapture(async () => snapshot(generating ? "texte figé mais génération active" : String(clock.now()), generating), clock);
    assert.equal(result.stable, false); assert.equal(result.captureStatus, "draft");
    assert.equal(result.textStatus, "draft-unstable-rendered-text");
  }
});

test("download budget validates declared and observed bytes, total transfers and disk reserve", () => {
  const base = { receivedBytes: 0, totalBytes: 0, usedBytes: 0, availableBytes: 2 * 1024 ** 3 };
  assert.equal(checkDownloadBudget(base), null);
  assert.match(checkDownloadBudget({ ...base, totalBytes: DOWNLOAD_LIMITS.fileBytes + 1 }), /Per-file/);
  assert.match(checkDownloadBudget({ ...base, receivedBytes: DOWNLOAD_LIMITS.fileBytes + 1 }), /Per-file/);
  assert.match(checkDownloadBudget({ ...base, usedBytes: DOWNLOAD_LIMITS.totalBytes - 2, totalBytes: 3 }), /Total/);
  assert.match(checkDownloadBudget({ ...base, availableBytes: DOWNLOAD_LIMITS.reserveBytes - 1 }), /disk/);
  assert.match(checkDownloadBudget({ ...base, availableBytes: DOWNLOAD_LIMITS.reserveBytes + 2, totalBytes: 3 }), /disk/);
  assert.match(checkDownloadBudget({ ...base, receivedBytes: NaN }), /Unknown/);
});

test("capture modules parse and never read/export authentication storage or close the browser", async () => {
  const files = ["scripts/capture-chatgpt-thread.mjs", "scripts/lib/chatgpt-source-capture.mjs", "scripts/lib/chatgpt-download-guard.mjs"];
  for (const file of files) {
    const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(check.status, 0, check.stderr);
    const source = await fs.readFile(file, "utf8");
    assert.doesNotMatch(source, /\.cookies\s*\(|\.storageState\s*\(|\.addCookies\s*\(|browser\.close\s*\(|context\.request/);
  }
});
