import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const sha256 = value => createHash("sha256").update(value).digest("hex");
export const DOWNLOAD_LIMITS = Object.freeze({ fileBytes: 600 * 1024 ** 2, totalBytes: 1024 ** 3,
  reserveBytes: 64 * 1024 ** 2, timeoutMs: 120000, pollMs: 250 });
const allowedExtension = /\.(zip|png|webp|jpg|jpeg|json|csv|xlsx|pdf)$/i;

/** Lossless partitions of captured DOM text, not a reconstruction of hidden source. */
export function splitSourceText(text, maxChars = 12000) {
  if (typeof text !== "string" || !Number.isInteger(maxChars) || maxChars < 2) throw Error("Invalid text/chunk size.");
  const chunks = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const newline = text.lastIndexOf("\n", end - 1);
      if (newline >= start + Math.floor(maxChars / 2)) end = newline + 1;
      if (/[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
    }
    chunks.push(text.slice(start, end)); start = end;
  }
  return chunks;
}

export function validateThreadId(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value ?? "")) throw Error("A ChatGPT conversation UUID is required.");
  return value.toLowerCase();
}

export function parseCaptureArgs(args) {
  const threadId = validateThreadId(args[0]);
  let port = 54837, explicitPort = false;
  const flags = new Set();
  for (const value of args.slice(1)) {
    if (["--download", "--share"].includes(value) && !flags.has(value)) flags.add(value);
    else if (/^\d+$/.test(value) && !explicitPort) { port = Number(value); explicitPort = true; }
    else throw Error("Usage: capture-chatgpt-thread.mjs <uuid> [local-port] [--share] [--download]");
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error("Invalid local CDP port.");
  return { threadId, port, share: flags.has("--share"), download: flags.has("--download"),
    url: `https://chatgpt.com/${flags.has("--share") ? "share" : "c"}/${threadId}` };
}

export function isAllowedDownloadUrl(value) {
  try {
    const url = new URL(value, "https://chatgpt.com");
    return !url.username && !url.password && url.origin === "https://chatgpt.com" &&
      ["https:", "blob:"].includes(url.protocol);
  } catch { return false; }
}

export function assertCaptureUrl(actual, expected) {
  const url = new URL(actual);
  if (url.origin !== "https://chatgpt.com" || url.username || url.password ||
      url.pathname !== new URL(expected).pathname || url.search || url.hash) throw Error("Conversation URL changed; capture refused.");
}

export function isChatGPTFileLink({ href, text }) {
  if (!isAllowedDownloadUrl(href)) return false;
  const url = new URL(href, "https://chatgpt.com");
  let leaf;
  try { leaf = decodeURIComponent(url.pathname).split("/").at(-1); } catch { return false; }
  // A misleading label cannot override a disallowed extension in the actual URL.
  if (/\.[^./]+$/.test(leaf)) return allowedExtension.test(leaf);
  return allowedExtension.test(String(text ?? "").trim());
}

export function safeDownloadName(name) {
  const leaf = String(name).split(/[\\/]/).at(-1).replace(/[<>:"|?*\u0000-\u001f]/g, "_").slice(0, 150).replace(/[. ]+$/g, "");
  return !leaf || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(leaf) ? `attachment-${sha256(String(name)).slice(0, 12)}.bin` : leaf;
}

export function validatedDownloadName(value) {
  if (typeof value !== "string" || /[\\/<>:"|?*\u0000-\u001f]/.test(value) || /[. ]$/.test(value) ||
      !allowedExtension.test(value)) throw Error("Unsupported or unsafe suggested download filename.");
  const name = safeDownloadName(value);
  if (!allowedExtension.test(name)) throw Error("Unsupported sanitized download filename.");
  return name;
}

/** Every component must be a real directory under work, including the UUID/run. */
export async function assertPrivateOutput(workspace, output, create = false) {
  const root = await fs.realpath(workspace);
  const relative = path.relative(root, path.resolve(output));
  const parts = relative.split(path.sep);
  if (path.isAbsolute(relative) || parts.some(part => !part || part === "..") ||
      parts[0] !== "work" || parts[1] !== "v37" || parts[2] !== "chatgpt-intake") throw Error("Output must stay under private work/v37/chatgpt-intake.");
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    if (create) await fs.mkdir(current).catch(error => { if (error.code !== "EEXIST") throw error; });
    const info = await fs.lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink() || path.relative(current, await fs.realpath(current)) !== "")
      throw Error("Private output contains a symbolic link, junction or redirected directory.");
  }
  return current;
}

export async function createPrivateOutput(workspace, threadId) {
  const root = await fs.realpath(workspace);
  const output = path.join(root, "work", "v37", "chatgpt-intake", validateThreadId(threadId),
    new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID().slice(0, 8));
  return assertPrivateOutput(root, output, true);
}

export async function freeBytes(directory) {
  const info = await fs.statfs(directory);
  return Number(info.bavail) * Number(info.bsize);
}

export function checkDownloadBudget({ receivedBytes, totalBytes = 0, usedBytes = 0, availableBytes }, limits = DOWNLOAD_LIMITS) {
  if (![receivedBytes, totalBytes, usedBytes, availableBytes].every(value => Number.isFinite(value) && value >= 0)) return "Unknown download size or disk availability.";
  const expected = Math.max(receivedBytes, totalBytes);
  if (expected > limits.fileBytes) return "Per-file limit exceeded (600 MiB).";
  if (usedBytes + expected > limits.totalBytes) return "Total transfer budget exceeded (1 GiB).";
  if (availableBytes < limits.reserveBytes + Math.max(0, totalBytes - receivedBytes)) return "Insufficient free disk space; reserve preserved.";
  return null;
}

/** Wait for text/links to stop changing; unverified virtualized history stays partial. */
export async function waitForStableCapture(read, options = {}) {
  const { quietMs = 2000, timeoutMs = 15000, pollMs = 400, now = Date.now,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = options;
  const startedAt = now();
  let lastHash = null, quietSince = startedAt, capture = null;
  while (now() - startedAt <= timeoutMs) {
    capture = await read();
    const fingerprint = sha256(JSON.stringify({ messages: capture.messages, links: capture.links }));
    const ready = capture.documentReady && !capture.generationDetected && capture.messages.length > 0;
    if (!ready || fingerprint !== lastHash) quietSince = now();
    lastHash = fingerprint;
    if (ready && now() - quietSince >= quietMs) return { capture, stable: true, textStatus: "stable-rendered-text", captureStatus: "partial",
      historyCompleteness: "unverified", reasons: ["Rendered branch only: hidden, collapsed or virtualized history is not verified."] };
    await sleep(pollMs);
  }
  return { capture, stable: false, textStatus: "draft-unstable-rendered-text", captureStatus: "draft", historyCompleteness: "unverified",
    reasons: ["Text did not become stable before the deadline, or generation is still active.", "Hidden, collapsed or virtualized history is not verified."] };
}
