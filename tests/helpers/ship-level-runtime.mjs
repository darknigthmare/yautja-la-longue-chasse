import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const directory = await mkdtemp(join(tmpdir(), "yautja-ship-level-v21-"));
await build({
  configFile: false, publicDir: false, logLevel: "silent",
  build: {
    emptyOutDir: true, outDir: directory,
    ssr: fileURLToPath(new URL("../../app/game/systems/physicalShipMotion.ts", import.meta.url)),
    rollupOptions: { output: { entryFileNames: "ship-motion.mjs" } },
  },
});
export const ship = await import(pathToFileURL(join(directory, "ship-motion.mjs")).href);
after(async () => { await rm(directory, { recursive: true, force: true }); });
