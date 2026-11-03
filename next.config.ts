import type { NextConfig } from "next";
import { gameBuildIdentity } from "./scripts/game-build-identity";
import { nativeAssetDestinationV1, readNativeAssetOriginV1 } from "./scripts/native-asset-origin-v1.mjs";
const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_YAUTJA_BUILD_ID: gameBuildIdentity() },
  // Independent local QA servers keep the compiled production build untouched.
  distDir: process.env.YAUTJA_NEXT_DIST_DIR || '.next',
  async rewrites() {
    if (process.env.VERCEL !== "1") return { beforeFiles: [], afterFiles: [], fallback: [] };
    if (process.env.VERCEL_GIT_PROVIDER !== "github" || process.env.VERCEL_GIT_REPO_OWNER !== "darknigthmare" || process.env.VERCEL_GIT_REPO_SLUG !== "yautja-la-longue-chasse") throw new Error("Unexpected published Git repository");
    const sha = process.env.VERCEL_GIT_COMMIT_SHA;
    if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Native sprites require a valid release SHA");
    // Only a delivery carrying the verified provenance manifest opts in.
    // Retained JSON/SVG/review pages keep normal local filesystem precedence.
    const origin = readNativeAssetOriginV1();
    if (origin) return {
      beforeFiles: [],
      afterFiles: [{ source: "/game/:path*", destination: nativeAssetDestinationV1(origin.sourceCommit) }],
      fallback: [],
    };
    return {
      beforeFiles: [{
        source: "/game/imports/v85/:path*",
        destination: "https://raw.githubusercontent.com/darknigthmare/yautja-la-longue-chasse/" + sha + "/public/game/imports/v85/:path*",
      }],
      afterFiles: [],
      fallback: [],
    };
  },
};
export default nextConfig;
