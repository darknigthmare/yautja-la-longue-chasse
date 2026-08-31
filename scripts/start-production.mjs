import { fileURLToPath } from "node:url";
import { installWindowsStaticCacheCompatibility } from "./windows-static-cache.mjs";

const vinextEntry = import.meta.resolve("vinext");
if (process.platform === "win32") {
  const { StaticFileCache } = await import(new URL("./server/static-file-cache.js", vinextEntry).href);
  installWindowsStaticCacheCompatibility(StaticFileCache);
}
const cliUrl = new URL("./cli.js", vinextEntry);
// Preserve standard Vinext flags, including --hostname and --port.
process.argv.splice(1, 1, fileURLToPath(cliUrl), "start");
await import(cliUrl.href);
