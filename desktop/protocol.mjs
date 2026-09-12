import path from "node:path";

export const APP_ORIGIN = "yautja://game";
export const APP_ROUTES = new Set(["/", "/pit-lab", "/rig-lab"]);
// Only these bundled documents may open as auxiliary windows; they are not SPA routes.
export const APP_DOCUMENT_ROUTES = new Set([
  "/game/assets/v27/sprite-review/index.html",
  "/game/assets/v28/sprite-review/index.html",
  "/game/assets/v33/production-review/index.html",
  "/game/assets/v34/production-review/index.html",
  "/game/assets/v34/vehicle-assembly-review/index.html",
]);
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

export function isAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "yautja:" && url.hostname === "game" &&
      !url.port && !url.username && !url.password;
  } catch { return false; }
}

export function appRoutePath(value) {
  if (!isAppUrl(value)) return null;
  const route = new URL(value).pathname.replace(/\/$/, "") || "/";
  return APP_ROUTES.has(route) || APP_DOCUMENT_ROUTES.has(route) ? route : null;
}

export function isAppRoute(value) {
  return appRoutePath(value) !== null;
}

/** Decode once, reject Windows path syntax and traversal, then enforce containment. */
export function resolveAppFile(root, value, method = "GET") {
  if (!isAppUrl(value) || !["GET", "HEAD"].includes(method)) return null;
  let name;
  try { name = decodeURIComponent(new URL(value).pathname); } catch { return null; }
  if (/[\\\x00-\x1f:]/.test(name) || name.split("/").some((part) => part === ".." || part === ".")) return null;
  name = name.replace(/\/$/, "") || "/";
  if (APP_ROUTES.has(name)) name = "/index.html";
  // Expose only built renderer assets and game runtime assets.
  const isAudio = name === "/audio/manifest.json" || name.startsWith("/audio/") && /\.(ogg|mp3|m4a|wav|flac|aac|webm|opus)$/i.test(name);
  if (name !== "/index.html" && !name.startsWith("/assets/") && !name.startsWith("/game/") && !isAudio) return null;
  const absoluteRoot = path.resolve(root);
  const file = path.resolve(absoluteRoot, "." + name);
  const relative = path.relative(absoluteRoot, file);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return file;
}

/** One RFC-style byte range for local streamed audio. false means unsatisfiable. */
export function parseAudioByteRange(header, size) {
  if (!header) return null;
  if (!Number.isSafeInteger(size) || size < 1) return false;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || !match[1] && !match[2]) return false;
  let start; let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return false;
  }
  return { start, end };
}

/** User-triggered exports stay limited to local saves and bundled raster game art. */
export function appDownloadKind(value) {
  if (value.startsWith("blob:" + APP_ORIGIN + "/") || /^data:application\/json(?:;[^,]*)?,/i.test(value)) return "save";
  if (!isAppUrl(value)) return null;
  const name = new URL(value).pathname;
  if (!name.startsWith("/game/") || !/\.(png|webp|jpe?g)$/i.test(name)) return null;
  return resolveAppFile(path.resolve("bundled-renderer"), value) ? "image" : null;
}
