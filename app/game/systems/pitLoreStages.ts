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

export const PIT_LORE_STAGE_WORKS = PIT_LORE_STAGE_DEFINITIONS.map(stage => ({ id: stage.workId, title: stage.workTitle, kind: stage.kind }));

export function getPitLoreStage(id: unknown) {
  return typeof id === "string" ? PIT_LORE_STAGE_DEFINITIONS.find(stage => stage.id === id) ?? null : null;
}
