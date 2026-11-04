/** Visible content lot, shared by portable archive metadata and the UI. */
export const GAME_CONTENT_VERSION = "V112";
export const GAME_CONTENT_LABEL = "Canopée · cité vivante · épreuves royales · arrivées orbitales";

/** Application release; independent from the historical content and save formats. */
export const GAME_RELEASE_VERSION = "1.3.0";

function publishedBuildId(): string {
  // Next and Vite replace this literal with the same public, non-secret Git ID.
  // Standalone browser fixtures have no Node process and identify themselves as local.
  try {
    const id = process.env.NEXT_PUBLIC_YAUTJA_BUILD_ID;
    return /^[a-f0-9]{8}$/.test(id ?? "") ? id! : "local";
  } catch {
    return "local";
  }
}

export const GAME_BUILD_ID = publishedBuildId();
export const GAME_VERSION_LABEL = `v${GAME_RELEASE_VERSION}`;
export const GAME_BUILD_LABEL = GAME_BUILD_ID === "local" ? "développement local" : GAME_BUILD_ID;
