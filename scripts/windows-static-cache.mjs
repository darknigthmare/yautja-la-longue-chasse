/** Windows compatibility for Vinext static-cache keys.
 * Some builds use path.relative (backslashes), while requests use URL slashes.
 * Preserve the server's hidden metadata boundary and keep installation idempotent.
 */
const installed = new WeakSet();
export function installWindowsStaticCacheCompatibility(CacheClass, platform = process.platform) {
  if (platform !== "win32" || installed.has(CacheClass)) return;
  const lookup = CacheClass.prototype.lookup;
  if (typeof lookup !== "function") throw new Error("Unsupported Vinext static cache interface");
  CacheClass.prototype.lookup = function lookupWindowsPath(pathname) {
    if (typeof pathname !== "string" || !pathname.startsWith("/") ||
        pathname === "/" || pathname.startsWith("//") || pathname.includes("\\") ||
        pathname === "/.vite" || pathname.startsWith("/.vite/") ||
        pathname.split("/").some((part) => part === "." || part === "..")) return undefined;
    return lookup.call(this, pathname) ??
      lookup.call(this, "/" + pathname.slice(1).replaceAll("/", "\\"));
  };
  installed.add(CacheClass);
}
