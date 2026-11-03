import { execFileSync } from "node:child_process";

/** Only a validated Git revision is made public; never expose arbitrary environment text. */
export function gameBuildIdentity({
  env = process.env,
  gitRevision = () => execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2000,
  }).trim(),
}: {
  env?: Record<string, string | undefined>;
  gitRevision?: () => string;
} = {}): string {
  for (const candidate of [env.VERCEL_GIT_COMMIT_SHA, env.GITHUB_SHA]) {
    if (/^[a-f0-9]{40}$/.test(candidate ?? "")) return candidate!.slice(0, 8);
  }
  try {
    const revision = gitRevision();
    if (/^[a-f0-9]{40}$/.test(revision)) return revision.slice(0, 8);
  } catch {
    // A downloaded source archive has no Git directory.
  }
  return "local";
}
