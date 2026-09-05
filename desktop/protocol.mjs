import path from "node:path";

export const APP_ORIGIN = "yautja://game";
export const APP_ROUTES = new Set(["/", "/pit-lab", "/rig-lab"]);
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

export function isAppRoute(value) {
  if (!isAppUrl(value)) return false;
  return APP_ROUTES.has(new URL(value).pathname.replace(/\/$/, "") || "/");
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
  if (name !== "/index.html" && !name.startsWith("/assets/") && !name.startsWith("/game/")) return null;
  const absoluteRoot = path.resolve(root);
  const file = path.resolve(absoluteRoot, "." + name);
  const relative = path.relative(absoluteRoot, file);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return file;
}
