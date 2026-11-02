import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-dev-*/**",
    "out/**",
    // Vinext production bundles are generated output, like Next's .next.
    "dist/**",
    // Generated QA exports are not application source.
    "outputs/**",
    // Preserve the exact executed bundle archived with its browser evidence.
    "docs/qa/hunt-pr62-followup-r8-20261102/hud-layout/native-badge.bundle.js",
    "tmp/**",
    "work/**",
    "work-local/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
