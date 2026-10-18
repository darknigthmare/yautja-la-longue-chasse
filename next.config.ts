import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.VERCEL !== "1") return { beforeFiles: [], afterFiles: [], fallback: [] };
    if (process.env.VERCEL_GIT_PROVIDER !== "github" || process.env.VERCEL_GIT_REPO_OWNER !== "darknigthmare" || process.env.VERCEL_GIT_REPO_SLUG !== "yautja-la-longue-chasse") throw new Error("Unexpected published Git repository");
    const sha = process.env.VERCEL_GIT_COMMIT_SHA;
    if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Native sprites require a valid release SHA");
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
