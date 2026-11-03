import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { desktopBuildPaths, assertDesktopOutputSafety } from "./build-paths.mjs";
import { gameBuildIdentity } from "../scripts/game-build-identity";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
export default defineConfig(async () => {
  const paths = desktopBuildPaths();
  await assertDesktopOutputSafety(paths);
  return {
  define: { "process.env.NEXT_PUBLIC_YAUTJA_BUILD_ID": JSON.stringify(gameBuildIdentity()) },
  root: path("./"),
  publicDir: path("../public"),
  plugins: [react()],
  resolve: { alias: { "next/link": path("./LocalLink.tsx"), "@": path("../") } },
  build: {
    outDir: paths.renderer,
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4500,
  },
  };
});
