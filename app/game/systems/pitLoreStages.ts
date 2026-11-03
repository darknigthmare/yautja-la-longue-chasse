import additional from "./pitLoreStagesV55.generated.json";
import workbookStagesV60 from "./pitLoreStagesV60.generated.json";
import workbookStagesV62 from "./pitLoreStagesV62.generated.json";

export type PitStageSourceClassification = "character-setting" | "work-setting" | "original-exhibition";
export type PitStageSourceStatus = "resolved" | "primary-limited" | "original-selected";
export interface PitAdditionalLoreStage {
  readonly id: string; readonly catalogueNumber: number; readonly name: string;
  readonly kind: "film" | "game" | "comic" | "novel" | "original";
  readonly workId: string; readonly workTitle: string; readonly setting: string;
  readonly palette: { readonly sky: string; readonly ground: string; readonly accent: string };
  readonly referenceStatus: PitStageSourceClassification;
  readonly sourceUrl: string | null; readonly sourceUrls: readonly string[]; readonly sourceClaim: string;
  readonly dedicatedFighters: readonly string[];
}
export interface PitExplicitStageAssociation {
  readonly fighterId: string; readonly stageId: string;
  readonly classification: PitStageSourceClassification; readonly sourceStatus: PitStageSourceStatus;
  readonly reason: string; readonly sourceUrls: readonly string[];
}

/** Publisher-attested setting; exact geometry remains an original lateral adaptation. */
export const PIT_LORE_STAGE_DEFINITIONS = [
  {
    id: "arena-137-concrete-jungle-neonopolis", catalogueNumber: 137,
    name: "Neonopolis — coursives industrielles", kind: "game" as const,
    workId: "predator-concrete-jungle-2005", workTitle: "Predator: Concrete Jungle (2005)",
    setting: "Ville de la chasse de Scarface : profondeur urbaine et coursive industrielle recomposées en vue latérale.",
    palette: { sky: "#0e1720", ground: "#222e33", accent: "#81c3c3" },
    referenceStatus: "publisher-setting-attested-original-lateral-layout",
    sourceUrl: "https://store.necaonline.com/blogs/behind-the-scenes/closer-look-video-game-appearance-ultimate-scarface-predator",
    sourceClaim: "La source officielle NECA relie Scarface, Concrete Jungle et Neonopolis ; elle ne certifie pas cette géométrie.",
    dedicatedFighters: ["scarface"],
  },
  {
    id: "arena-138-avp-ryushi-prosperity-wells", catalogueNumber: 138,
    name: "Ryushi — Prosperity Wells", kind: "comic" as const,
    workId: "avp-machiko-ryushi", workTitle: "Aliens vs. Predator — cycle de Machiko Noguchi",
    setting: "Colonie d’élevage de Ryushi : bâtiments utilitaires et enclos lointains, réinterprétation latérale pour Machiko et Broken Tusk.",
    palette: { sky: "#433b2e", ground: "#614d33", accent: "#d2b57b" },
    referenceStatus: "publisher-setting-attested-original-lateral-layout",
    sourceUrl: "https://titanbooks.com/8792-the-complete-aliens-vs-predator-omnibus/",
    sourceClaim: "Titan atteste Machiko, la colonie d’élevage de Ryushi et Prosperity Wells ; Dark Horse atteste son cycle comics. Leur géométrie exacte n’est pas certifiée ici.",
    dedicatedFighters: ["machiko-noguchi", "user-broken-tusk"],
  },
] as const;

// Keep the historical batch stable; authored definitions alone never activate a stage.
export const PIT_ADDITIONAL_LORE_STAGES = additional.stages as readonly PitAdditionalLoreStage[];
export const PIT_EXPLICIT_STAGE_ASSOCIATIONS = additional.associations as readonly PitExplicitStageAssociation[];
export const PIT_WORKBOOK_LORE_STAGES_V60 = workbookStagesV60.stages as readonly PitAdditionalLoreStage[];
export const PIT_WORKBOOK_LORE_STAGES_V62 = workbookStagesV62.stages as readonly PitAdditionalLoreStage[];
export const PIT_ALL_LORE_STAGE_DEFINITIONS = [...PIT_LORE_STAGE_DEFINITIONS, ...PIT_ADDITIONAL_LORE_STAGES, ...PIT_WORKBOOK_LORE_STAGES_V60, ...PIT_WORKBOOK_LORE_STAGES_V62];
export const PIT_LORE_STAGE_WORKS = Array.from(new Map(PIT_ALL_LORE_STAGE_DEFINITIONS
  .filter(stage => stage.kind !== "original")
  .map(stage => [stage.workId, { id: stage.workId, title: stage.workTitle, kind: stage.kind as "film" | "game" | "comic" | "novel" }])).values());

export function getPitLoreStage(id: unknown) {
  return typeof id === "string" ? PIT_ALL_LORE_STAGE_DEFINITIONS.find(stage => stage.id === id) ?? null : null;
}
