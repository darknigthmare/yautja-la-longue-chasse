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
  {
    // These exact files are frozen executable evidence or original intake
    // copies. Preserve their recorded bytes; current QA entrypoints in scripts/
    // and tests/ retain the normal rules, including unused binding checks.
    files: [
      "art-source/v94/pit/celtic/intake-original.mjs",
      "dlc/predator-1987/v0.3.0/INSTALLER_DLC_LOCAL.mjs",
      "dlc/predator-1987/v0.3.0/src/browser-engine.js",
      "docs/qa/gamedev-navigation-performance-20261029/fixture-build-run.mjs",
      "docs/qa/v112-homeworld-live-guidance/v112-route-guidance-chromium-benchmark.mjs",
      "docs/qa/v112-integration/pit-launch-observation-r5/executed-qa-scar-feral.mjs",
      "docs/qa/v112-integration/pit-whiff-cadence-r6/diagnostic-sources/qa-initial-whiffs.mjs",
      "production/p0p1-20261109/qa/phg/diagnostic-isolation/recipe-used.mjs",
      "production/clan-war-command-20261109/qa/before-native/capture.mjs",
      "production/clan-war-command-20261109/qa/pr-integration/final-attempt-4/hunt-dialogue-scroll-diagnostic/diagnostic-recipe.mjs",
    ],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
  {
    // Pinned first-version harness, retained with its executed receipt. The
    // maintained tests/browser/trophy-tutorial-v6.fixture.tsx publishes its
    // read-only observer from an effect and keeps the normal hook rules.
    files: ["production/clan-war-command-20261109/qa/trophy-tutorial/fixture.tsx"],
    rules: { "react-hooks/refs": "off" },
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
    // Generated review bundles; their source generators remain linted.
    "public/game/assets/v27/sprite-review/review.js",
    "public/game/assets/v28/sprite-review/review.js",
    "public/game/assets/v33/production-review/review.js",
    "public/game/assets/v34/production-review/review.js",
    "public/game/assets/v34/vehicle-assembly-review/review.js",
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
