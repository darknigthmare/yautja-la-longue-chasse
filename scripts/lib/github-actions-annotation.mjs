/** Keep a failed browser journey readable through the GitHub annotations API
 * even when the archived job log is unavailable to the current environment. */
export function reportGithubActionsFailure(title, error) {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  const escape = value => String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  const property = escape(title).replaceAll(":", "%3A").replaceAll(",", "%2C");
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`::error title=${property}::${escape(detail.slice(0, 3000))}`);
}
