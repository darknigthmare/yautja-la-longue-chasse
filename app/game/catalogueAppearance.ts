// @ts-expect-error Node's strip-types test runner needs an explicit extension.
import { HUNTER_PRESETS, appearanceForPreset } from "./hunterLore.ts";
// @ts-expect-error Node's strip-types test runner needs an explicit extension.
import { CATALOGUE_ENTRY_BY_ID, CATALOGUE_ROSTER } from "./catalogueRoster.ts";
import type {
  CatalogueContinuity,
  CatalogueEntryKind,
  CatalogueStableId,
  CatalogueYautjaEntry,
} from "./catalogueRoster";
import type { HunterLorePresetId } from "./hunterLore";
import type { HunterAppearance } from "./types";

export const CATALOGUE_RECONSTRUCTION_WARNING =
  "Reconstruction modulaire guidée par l’œuvre, le média et le statut de la source : elle reste signalée comme approximation tant qu’une plaque individuelle validée n’existe pas.";

export interface CatalogueAppearanceProvenance {
  readonly kind: "mapped-preset" | "modular-reconstruction";
  readonly catalogueId: CatalogueStableId;
  readonly source: "hunterLore preset" | "catalogue source + closest hunterLore preset";
  readonly referencePresetId: HunterLorePresetId;
  readonly note: string;
}

export interface CatalogueAppearanceResolution {
  readonly entry: CatalogueYautjaEntry;
  readonly presetId: HunterLorePresetId | null;
  readonly appearance: HunterAppearance;
  readonly provenance: CatalogueAppearanceProvenance;
  readonly warning: string | null;
}

export type CatalogueVisualResolution =
  | {
      readonly kind: "runtime-plate";
      readonly entry: CatalogueYautjaEntry;
      readonly runtimePath: string;
      readonly appearanceResolution: null;
    }
  | {
      readonly kind: "appearance-fallback";
      readonly entry: CatalogueYautjaEntry;
      readonly runtimePath: null;
      readonly appearanceResolution: CatalogueAppearanceResolution;
    };

export type CataloguePlayableSelection = HunterLorePresetId | HunterAppearance;

export interface CatalogueFilterState {
  readonly query?: string;
  readonly media?: string | "all";
  readonly kind?: CatalogueEntryKind | "all";
  readonly continuity?: CatalogueContinuity | "all";
}

export interface CataloguePage {
  readonly items: readonly CatalogueYautjaEntry[];
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly total: number;
  readonly startIndex: number;
  readonly endIndex: number;
}

function uniquePresetValues<
  Key extends
    | "bodyMorphId"
    | "skinId"
    | "biomaskId"
    | "dreadStyleId"
    | "dreadTintId"
    | "armorStyleId"
    | "armorTintId"
    | "trophyAdornmentId",
>(key: Key): readonly (typeof HUNTER_PRESETS)[number][Key][] {
  return Object.freeze(
    Array.from(new Set(HUNTER_PRESETS.map((preset) => preset[key]))),
  );
}

/** Every reconstruction value comes from at least one production preset. */
export const CATALOGUE_APPEARANCE_MODULE_IDS = Object.freeze({
  bodyMorphIds: uniquePresetValues("bodyMorphId"),
  skinIds: uniquePresetValues("skinId"),
  biomaskIds: uniquePresetValues("biomaskId"),
  dreadStyleIds: uniquePresetValues("dreadStyleId"),
  dreadTintIds: uniquePresetValues("dreadTintId"),
  armorStyleIds: uniquePresetValues("armorStyleId"),
  armorTintIds: uniquePresetValues("armorTintId"),
  trophyAdornmentIds: uniquePresetValues("trophyAdornmentId"),
});

function comparisonText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const REFERENCE_PRESET_KEYWORDS = [
  ["wolf", "wolf"],
  ["scarface", "scarface"],
  ["feral", "feral-hunter"],
  ["female", "big-mama"],
  ["huntress", "big-mama"],
  ["matriarch", "big-mama"],
  ["elder", "greyback"],
  ["ancient", "ancient-warrior"],
  ["bad blood", "bad-blood-comic"],
  ["rogue", "bad-blood-comic"],
  ["berserker", "berserker"],
  ["youngblood", "youngblood"],
  ["unblooded", "youngblood"],
  ["enforcer", "enforcer"],
  ["samurai", "samurai"],
  ["valkyrie", "valkyrie"],
  ["cleopatra", "cleopatra"],
  ["bionic", "bionic"],
] as const satisfies readonly (readonly [string, HunterLorePresetId])[];

function mediaAffinity(entry: CatalogueYautjaEntry, media: string): number {
  const catalogue = comparisonText(entry.mediaLabel);
  if (media === "film" || media === "animated-film") {
    return catalogue.includes("film") || catalogue.includes("animation") ? 18 : 0;
  }
  if (media === "video-game") return catalogue.includes("jeu") ? 18 : 0;
  if (media === "comic") return catalogue.includes("comic") ? 18 : 0;
  return catalogue.includes("roman") || catalogue.includes("prose") ? 18 : 0;
}

/** Pick a coherent licensed visual family instead of hashing unrelated parts. */
export function referencePresetForCatalogueEntry(
  entry: CatalogueYautjaEntry,
): HunterLorePresetId {
  const identity = comparisonText(
    [entry.name, ...entry.aliases, entry.canonicalName ?? "", entry.notes ?? ""].join(" "),
  );
  const keywordMatch = REFERENCE_PRESET_KEYWORDS.find(([keyword]) =>
    identity.includes(keyword),
  );
  if (keywordMatch) return keywordMatch[1];

  const entryWork = comparisonText(entry.work);
  let best: (typeof HUNTER_PRESETS)[number] = HUNTER_PRESETS[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const preset of HUNTER_PRESETS) {
    const presetWork = comparisonText(preset.work);
    const comparableWork = entryWork.length > 8 && presetWork.length > 8;
    const score =
      (comparableWork && entryWork === presetWork ? 120 : 0) +
      (comparableWork &&
      (entryWork.includes(presetWork) || presetWork.includes(entryWork))
        ? 70
        : 0) +
      (entry.year !== null && entry.year === preset.year ? 24 : 0) +
      mediaAffinity(entry, preset.media) +
      (entry.continuity === preset.continuity ||
      (entry.continuity === "expanded" && preset.continuity === "crossover")
        ? 12
        : 0);
    if (score > bestScore) {
      best = preset;
      bestScore = score;
    }
  }
  return best.id;
}

export function catalogueReferenceUrlsForEntry(
  entry: CatalogueYautjaEntry,
): readonly string[] {
  const referencePresetIds =
    entry.presetIds.length > 0
      ? entry.presetIds
      : [referencePresetForCatalogueEntry(entry)];
  return Array.from(
    new Set(
      [
        ...entry.referenceUrls,
        ...referencePresetIds.flatMap(
          (presetId) =>
            HUNTER_PRESETS.find((preset) => preset.id === presetId)
              ?.sourceUrls ?? [],
        ),
      ].filter((url): url is string => Boolean(url?.trim())),
    ),
  ).slice(0, 3);
}

function reconstructCatalogueAppearance(
  entry: CatalogueYautjaEntry,
): HunterAppearance {
  const referencePresetId = referencePresetForCatalogueEntry(entry);
  return {
    ...appearanceForPreset(referencePresetId),
    presetId: "custom",
  };
}

function catalogueEntry(
  entryOrId: CatalogueYautjaEntry | CatalogueStableId,
): CatalogueYautjaEntry {
  return typeof entryOrId === "string"
    ? CATALOGUE_ENTRY_BY_ID[entryOrId]
    : entryOrId;
}

export function resolveCatalogueAppearance(
  entryOrId: CatalogueYautjaEntry | CatalogueStableId,
  preferredPresetId?: HunterLorePresetId,
): CatalogueAppearanceResolution {
  const entry = catalogueEntry(entryOrId);
  const presetId =
    preferredPresetId && entry.presetIds.includes(preferredPresetId)
      ? preferredPresetId
      : (entry.presetIds[0] ?? null);

  if (presetId) {
    return {
      entry,
      presetId,
      appearance: appearanceForPreset(presetId),
      provenance: {
        kind: "mapped-preset",
        catalogueId: entry.id,
        source: "hunterLore preset",
        referencePresetId: presetId,
        note: `Preset de production associé ${presetId}. Statut visuel : ${entry.visualAssetStatus}.`,
      },
      warning: null,
    };
  }

  const referencePresetId = referencePresetForCatalogueEntry(entry);

  return {
    entry,
    presetId: null,
    appearance: reconstructCatalogueAppearance(entry),
    provenance: {
      kind: "modular-reconstruction",
      catalogueId: entry.id,
      source: "catalogue source + closest hunterLore preset",
      referencePresetId,
      note: `${CATALOGUE_RECONSTRUCTION_WARNING} Base visuelle : ${referencePresetId}.`,
    },
    warning: CATALOGUE_RECONSTRUCTION_WARNING,
  };
}

/**
 * An explicitly validated individual project plate always wins over the
 * modular appearance resolver. A film plate inherited from an associated
 * preset remains an approximation and must never enter this runtime path.
 * Official reference URLs never enter this path: only local `/game/...`
 * runtime assets recorded by the catalogue can be returned.
 */
export function resolveCatalogueVisual(
  entryOrId: CatalogueYautjaEntry | CatalogueStableId,
  preferredPresetId?: HunterLorePresetId,
): CatalogueVisualResolution {
  const entry = catalogueEntry(entryOrId);
  const runtimePath =
    entry.visualAssetStatus === "existing-custom-plate"
      ? (entry.runtimeAssetPaths[0] ?? null)
      : null;

  if (runtimePath) {
    return {
      kind: "runtime-plate",
      entry,
      runtimePath,
      appearanceResolution: null,
    };
  }

  return {
    kind: "appearance-fallback",
    entry,
    runtimePath: null,
    appearanceResolution: resolveCatalogueAppearance(
      entry,
      preferredPresetId,
    ),
  };
}

export function catalogueSelectionForEntry(
  entry: CatalogueYautjaEntry,
  preferredPresetId?: HunterLorePresetId,
): CataloguePlayableSelection {
  const resolution = resolveCatalogueAppearance(entry, preferredPresetId);
  return resolution.presetId ?? resolution.appearance;
}

export function isCatalogueEntryPlayable(
  entry: CatalogueYautjaEntry,
): boolean {
  return entry.kind === "individual";
}

export const CATALOGUE_PLAYABLE_INDIVIDUALS = Object.freeze(
  CATALOGUE_ROSTER.filter(isCatalogueEntryPlayable),
);

function normalizedSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export function filterCatalogueEntries(
  entries: readonly CatalogueYautjaEntry[],
  filters: CatalogueFilterState,
): readonly CatalogueYautjaEntry[] {
  const query = normalizedSearchValue(filters.query ?? "");
  const media = filters.media ?? "all";
  const kind = filters.kind ?? "all";
  const continuity = filters.continuity ?? "all";

  return entries.filter((entry) => {
    if (media !== "all" && !entry.media.includes(media)) return false;
    if (kind !== "all" && entry.kind !== kind) return false;
    if (continuity !== "all" && entry.continuity !== continuity) return false;
    if (!query) return true;

    return normalizedSearchValue(
      [
        entry.id,
        entry.name,
        ...entry.aliases,
        entry.canonicalName ?? "",
        entry.work,
        entry.mediaLabel,
        entry.sourceStatus,
        entry.notes ?? "",
      ].join(" "),
    ).includes(query);
  });
}

export function paginateCatalogueEntries(
  entries: readonly CatalogueYautjaEntry[],
  requestedPage: number,
  requestedPageSize: number,
): CataloguePage {
  const pageSize = Math.max(1, Math.floor(requestedPageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(entries.length, startIndex + pageSize);

  return {
    items: Object.freeze(entries.slice(startIndex, endIndex)),
    page,
    pageSize,
    pageCount,
    total: entries.length,
    startIndex,
    endIndex,
  };
}
