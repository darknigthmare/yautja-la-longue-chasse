import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Archived Node QA scripts use local CommonJS VM containers, not Next modules.
    // Preserve their executed bytes and evidence hashes; retain all other rules.
    files: ["docs/qa/**/*.mjs"],
    rules: { "@next/next/no-assign-module-variable": "off" },
  },
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
    // Standalone historical DLC archive; not activated application source.
    "dlc/prey-2022/**",
    "tmp/**",
    "work/**",
    "work-local/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
