import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
export default defineConfig({
  root: path("./"),
  publicDir: path("../public"),
  plugins: [react()],
  resolve: { alias: { "next/link": path("./LocalLink.tsx"), "@": path("../") } },
  build: {
    outDir: path("../tmp/desktop-build/renderer"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4500,
  },
});
