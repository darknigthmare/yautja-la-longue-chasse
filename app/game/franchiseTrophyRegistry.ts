import franchiseTrophyManifestData from "../../public/game/assets/v16/franchise-trophies/manifest.json";

export type FranchiseTrophyMedium =
  | "film"
  | "animation"
  | "video-game"
  | "comic"
  | "licensed-crossover"
  | "merchandise";

export interface FranchiseTrophyAppearance {
  work: string;
  year: number;
  medium: FranchiseTrophyMedium;
  status: string;
  sourcePage: string;
  note: string;
}

export interface FranchiseTrophyArchiveAsset {
  id: string;
  name: string;
  visualAnchor: string;
  appearances: readonly FranchiseTrophyAppearance[];
  confidence: "high" | "medium";
  guardrail: string;
  composition: string;
  runtimePath: string;
  runtimeUrl: string;
  planned: boolean;
  available: boolean;
  consumers: readonly ["franchise-archive"];
  sourceMetadata: {
    bytes: number;
    width: number;
    height: number;
    sha256: string;
  };
  metadata: {
    bytes: number;
    width: number;
    height: number;
    channels: number;
    sha256: string;
  };
  validation: {
    alpha: boolean;
    cornerAlpha: readonly number[];
    bounds: readonly number[];
    padding: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
    visibleRatio: number;
    transparentRatio: number;
    partialAlphaPixels: number;
    visibleGreenRatio: number;
  };
  inspection: {
    status: "passed" | "planned";
    notes: string;
  };
}

interface FranchiseTrophyManifest {
  schemaVersion: number;
  packId: string;
  packVersion: number;
  generator: string;
  assetRoot: string;
  coverage: {
    planned: number;
    available: number;
    complete: boolean;
  };
  entries: readonly FranchiseTrophyArchiveAsset[];
}

const manifest = franchiseTrophyManifestData as unknown as FranchiseTrophyManifest;

export const FRANCHISE_TROPHY_MANIFEST_SUMMARY = Object.freeze({
  schemaVersion: manifest.schemaVersion,
  packId: manifest.packId,
  packVersion: manifest.packVersion,
  generator: manifest.generator,
  assetRoot: manifest.assetRoot,
  planned: manifest.coverage.planned,
  available: manifest.coverage.available,
  complete: manifest.coverage.complete,
});

export const FRANCHISE_TROPHY_ARCHIVE_ASSETS = Object.freeze(
  manifest.entries
    .filter(
      (entry) =>
        entry.available && entry.consumers.includes("franchise-archive"),
    )
    .map((entry) =>
      Object.freeze({
        ...entry,
        appearances: Object.freeze(
          entry.appearances.map((appearance) =>
            Object.freeze({ ...appearance }),
          ),
        ),
        consumers: Object.freeze([...entry.consumers]),
      }),
    ),
) as readonly FranchiseTrophyArchiveAsset[];

export function franchiseTrophyMediumLabel(
  medium: FranchiseTrophyMedium,
): string {
  return {
    film: "Film",
    animation: "Animation",
    "video-game": "Jeu vidéo",
    comic: "Comic licencié",
    "licensed-crossover": "Crossover licencié",
    merchandise: "Produit licencié",
  }[medium];
}

export function franchiseTrophyEvidenceLabel(status: string): string {
  if (/screen-trophy|screen-acquisition|screen-processing|screen-equipment/.test(status)) {
    return "Vu à l’écran";
  }
  if (/official-cosmetic/.test(status)) {
    return "Cosmétique officiel";
  }
  if (/community-documented/.test(status)) {
    return "Documenté en jeu";
  }
  if (/licensed-accessory|licensed-merchandise/.test(status)) {
    return "Accessoire licencié";
  }
  if (/persistent-gallery|environmental|wall|rack/.test(status)) {
    return "Exposé dans l’œuvre";
  }
  if (/collectible|campaign-trophy|resource-object|counter-object|claim-object/.test(status)) {
    return "Objet de jeu";
  }
  return "Objet licencié";
}

export function franchiseTrophyContinuityLabel(
  appearance: FranchiseTrophyAppearance,
): string {
  if (
    appearance.medium === "licensed-crossover" ||
    /noncanon/.test(appearance.status)
  ) {
    return "Hors continuité principale";
  }
  if (appearance.medium === "merchandise" || /licensed-accessory/.test(appearance.status)) {
    return "Produit licencié";
  }
  if (appearance.medium === "comic") {
    return "Continuité comics licenciée";
  }
  if (appearance.medium === "video-game") {
    return "Jeu licencié";
  }
  return "Continuité écran";
}
