import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const CATALOGUE_PATH = resolve(ROOT, "docs", "DLC-PRIVE-CATALOGUE.md");
const OUTPUT_PATH = resolve(ROOT, "private-dlc", "manifest.json");

const MEDIA_BY_PREFIX = Object.freeze({
  F: "film-animation",
  G: "licensed-video-game",
  C: "comic",
  N: "literature",
  L: "licensed-design",
});

const PRODUCTION_STATUS_BY_CODE = Object.freeze({
  A: "capturable",
  B: "partial",
  C: "visually-blocked",
  D: "duplicate-or-state",
  X: "out-of-scope",
});

const PROOF_TIERS = Object.freeze([
  ["ÉCRAN-A", "screen-primary"],
  ["ART-A", "publisher-art-primary"],
  ["LIC-B", "licensed-object-secondary"],
  ["TEXTE-C", "text-only"],
  ["SEC-D", "secondary-index-only"],
]);

const SLOT_SCHEMA = Object.freeze([
  { id: "body", group: "anatomy", atomic: true },
  { id: "head", group: "anatomy", atomic: true },
  { id: "dreadlocks", group: "anatomy", atomic: true },
  { id: "biomask", group: "head-gear", atomic: true },
  { id: "netting", group: "soft-gear", atomic: true },
  { id: "torso-armor", group: "armor", atomic: true },
  { id: "shoulder-armor-left", group: "armor", atomic: true },
  { id: "shoulder-armor-right", group: "armor", atomic: true },
  { id: "backpack", group: "plasma-caster", atomic: true },
  { id: "plasma-caster-mount", group: "plasma-caster", atomic: true },
  { id: "plasma-caster-upper-arm", group: "plasma-caster", atomic: true },
  { id: "plasma-caster-lower-arm", group: "plasma-caster", atomic: true },
  { id: "plasma-caster-yoke", group: "plasma-caster", atomic: true },
  { id: "plasma-caster-receiver", group: "plasma-caster", atomic: true },
  { id: "plasma-caster-barrel", group: "plasma-caster", atomic: true },
  { id: "plasma-caster-muzzle", group: "plasma-caster", atomic: true },
  { id: "gauntlet-left-base", group: "forearm-gear", atomic: true },
  { id: "gauntlet-left-lid", group: "forearm-gear", atomic: true },
  { id: "gauntlet-right-base", group: "forearm-gear", atomic: true },
  { id: "gauntlet-right-lid", group: "forearm-gear", atomic: true },
  { id: "wrist-blades-left", group: "forearm-gear", atomic: true },
  { id: "wrist-blades-right", group: "forearm-gear", atomic: true },
  { id: "hand-weapon-primary", group: "weapon", atomic: true },
  { id: "hand-weapon-secondary", group: "weapon", atomic: true },
  { id: "belt", group: "armor", atomic: true },
  { id: "loincloth", group: "soft-gear", atomic: true },
  { id: "thigh-armor-left", group: "armor", atomic: true },
  { id: "thigh-armor-right", group: "armor", atomic: true },
  { id: "shin-armor-left", group: "armor", atomic: true },
  { id: "shin-armor-right", group: "armor", atomic: true },
  { id: "trophies", group: "prop", atomic: true },
  { id: "companion-or-drone", group: "companion", atomic: true },
  { id: "state-variant", group: "state", atomic: true },
]);

const EQUIPMENT_RULES = Object.freeze([
  ["biomask", /\b(?:biomask|masque|faceplate)\b/],
  ["plasma-caster", /\b(?:plasma caster|plasmacaster|caster|plasma cannon|shoulder plasma cannon)\b/],
  ["caster-backpack", /\bbackpack\b/],
  ["gauntlet", /\b(?:gauntlet|gantelet|gantelets|gant ouvrant|gants ouvrants)\b/],
  ["wrist-blades", /\b(?:wrist blades?|wrist blade|lames? de poignet|gauntlet blades?|double wrist blades?)\b/],
  ["netting", /\b(?:filet|netting)\b/],
  ["trophies", /\b(?:trophee|trophees|crane|cranes|skull|skulls|collier d'os|tete de xenomorphe)\b/],
  ["smart-disc", /\b(?:smart discs?|disc|discs)\b/],
  ["combistick", /\b(?:combistick|lance repliee|lance en deux etats)\b/],
  ["netgun", /\bnetgun\b/],
  ["shuriken", /\bshuriken\b/],
  ["whip", /\b(?:whip|fouet)\b/],
  ["mine", /\bmines?\b/],
  ["dissolvent", /\b(?:dissolvant|dissolvent)\b/],
  ["crossbolt-gun", /\b(?:crossbolt gun|crossbolt)\b/],
  ["deployable-shield", /\b(?:deployable shield|shield deployable|shield)\b/],
  ["spear", /\b(?:spear|lance|staff|trident)\b/],
  ["spear-gun", /\bspear gun\b/],
  ["maul", /\bmaul\b/],
  ["drone", /\b(?:drone|faucon)\b/],
  ["hounds", /\b(?:hounds?|hell-hounds?)\b/],
  ["rifle", /\b(?:rifle|pulse rifle)\b/],
  ["smartgun", /\bsmartgun\b/],
  ["battle-axe", /\bbattle axe\b/],
  ["hammer", /\b(?:marteau|hammer)\b/],
  ["hook-weapon", /\b(?:hook weapon|grappling hook)\b/],
  ["eye-of-ra", /\beye of ra\b/],
  ["sword", /\b(?:sword|swords|epee|epees|katana|katanas|faux a double lame)\b/],
  ["chain-whip", /\bchain whip\b/],
  ["shock-gauntlet", /\bshock gauntlet\b/],
  ["bow", /\b(?:bow|arc)\b/],
  ["flintlock", /\bflintlock\b/],
  ["missile-system", /\bmissiles?\b/],
  ["heavy-weapon", /\barme lourde\b/],
  ["cloak", /\b(?:cloak|camouflage)\b/],
  ["medicomp", /\bmedicomp\b/],
  ["sickle", /\bsickle\b/],
  ["assault-cannon", /\bassault cannon\b/],
  ["facehugger-prop", /\bfacehugger\b/],
  ["chestburster-prop", /\bchestburster\b/],
]);

const SLOT_EVIDENCE_RULES = Object.freeze([
  [["body"], /\b(?:corps|silhouette|modele|morphologie|cyborg|chasseur)\b/],
  [["head"], /\b(?:tete|mandibules?|demasque|demasquee|face)\b/],
  [["dreadlocks"], /\b(?:dreadlocks?|predlocks?)\b/],
  [["biomask"], /\b(?:biomask|masque|faceplate)\b/],
  [["netting"], /\b(?:filet|netting)\b/],
  [
    ["torso-armor", "shoulder-armor-left", "shoulder-armor-right"],
    /\b(?:armure|plastron|epaule|epaules|collier)\b/,
  ],
  [["backpack"], /\bbackpack\b/],
  [
    [
      "plasma-caster-mount",
      "plasma-caster-upper-arm",
      "plasma-caster-lower-arm",
      "plasma-caster-yoke",
      "plasma-caster-receiver",
      "plasma-caster-barrel",
      "plasma-caster-muzzle",
    ],
    /\b(?:plasma caster|plasmacaster|caster|plasma cannon|shoulder plasma cannon)\b/,
  ],
  [
    ["gauntlet-left-base", "gauntlet-left-lid", "gauntlet-right-base", "gauntlet-right-lid"],
    /\b(?:gauntlet|gantelet|gantelets|gant ouvrant|gants ouvrants)\b/,
  ],
  [["wrist-blades-left", "wrist-blades-right"], /\b(?:wrist blades?|lames? de poignet|gauntlet blades?)\b/],
  [
    ["hand-weapon-primary"],
    /\b(?:combistick|smart discs?|disc|netgun|shuriken|whip|fouet|mine|crossbolt|shield|spear|lance|staff|trident|rifle|smartgun|axe|marteau|hammer|hook|sword|epee|katana|bow|arc|flintlock|maul|sickle|arme lourde)\b/,
  ],
  [["belt", "loincloth"], /\b(?:ceinture|pagne|loincloth)\b/],
  [["thigh-armor-left", "thigh-armor-right"], /\b(?:cuisse|cuisses)\b/],
  [["shin-armor-left", "shin-armor-right"], /\b(?:tibia|tibias|jambes?)\b/],
  [["trophies"], /\b(?:trophee|trophees|crane|cranes|skull|skulls|collier d'os|tete de xenomorphe)\b/],
  [["companion-or-drone"], /\b(?:drone|faucon|hounds?|compagnon)\b/],
  [["state-variant"], /\b(?:etat|etats|battle damaged|camoufle|demasque|historique|version jeu|loadout)\b/],
]);

function normalizeForSearch(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function plainMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values)];
}

function parseSourceDefinitions(markdown) {
  const sourceDefinitions = {};
  const sourcePattern = /^\[((?:S|R)\d+)\]:\s+(https:\/\/\S+)\s*$/gm;
  for (const match of markdown.matchAll(sourcePattern)) {
    const [, id, url] = match;
    sourceDefinitions[id] = {
      id,
      url,
      authority: id.startsWith("S") ? "primary-or-licensed" : "secondary-index-only",
      visualEvidencePolicy: "entry-specific-review-required",
    };
  }
  return sourceDefinitions;
}

function parseProofTiers(rowText, prefix) {
  const tiers = PROOF_TIERS.flatMap(([catalogueCode, id]) =>
    rowText.includes(catalogueCode) ? [id] : [],
  );
  if (prefix === "N" && !tiers.includes("text-only")) {
    tiers.push("text-only");
  }
  return tiers;
}

function parseProductionStatus(rawStatus) {
  const match = rawStatus.match(/^([ABCDX])(?:\s|—|-)/);
  if (!match) {
    throw new Error(`Statut de production sans code A/B/C/D/X : ${rawStatus}`);
  }
  return {
    code: PRODUCTION_STATUS_BY_CODE[match[1]],
    catalogueCode: match[1],
    label: rawStatus,
  };
}

function inferNamedEquipment(searchableText) {
  return EQUIPMENT_RULES.flatMap(([id, pattern]) => (pattern.test(searchableText) ? [id] : []));
}

function buildSlots({
  isBlocked,
  hasCandidateVisualSource,
  searchableText,
  sourceRefs,
}) {
  const attested = new Set();
  if (!isBlocked && hasCandidateVisualSource) {
    for (const [slotIds, pattern] of SLOT_EVIDENCE_RULES) {
      if (pattern.test(searchableText)) {
        slotIds.forEach((slotId) => attested.add(slotId));
      }
    }
  }

  return Object.fromEntries(
    SLOT_SCHEMA.map(({ id }) => {
      if (isBlocked) {
        return [
          id,
          {
            state: "blocked-no-canonical-visual",
            sourceRefs: [],
          },
        ];
      }
      const isAttested = attested.has(id);
      return [
        id,
        {
          state: isAttested ? "attested-in-catalogue" : "requires-private-capture",
          sourceRefs: isAttested ? sourceRefs : [],
        },
      ];
    }),
  );
}

function parseEntries(markdown, sourceDefinitions) {
  const entries = [];
  for (const line of markdown.split(/\r?\n/)) {
    const idMatch = line.match(/^\|\s*`([FGCNL]-\d{3})`\s*\|/);
    if (!idMatch) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const id = idMatch[1];
    const prefix = id[0];
    const isLiterature = prefix === "N";
    const expectedCells = isLiterature ? 5 : 6;
    if (cells.length !== expectedCells) {
      throw new Error(`${id}: ${cells.length} colonnes, ${expectedCells} attendues`);
    }

    const [
      rawId,
      rawName,
      rawWork,
      rawEvidence,
      rawSourceOrStatus,
      rawStatusIfPresent,
    ] = cells;
    if (plainMarkdown(rawId) !== id) {
      throw new Error(`${id}: identifiant de cellule incohérent (${rawId})`);
    }

    const rawSource = isLiterature ? "" : rawSourceOrStatus;
    const rawStatus = isLiterature ? rawSourceOrStatus : rawStatusIfPresent;
    const completeRow = cells.join(" ");
    const sourceRefs = unique([...completeRow.matchAll(/\[((?:S|R)\d+)\]/g)].map((match) => match[1]));
    const missingSources = sourceRefs.filter((sourceRef) => !sourceDefinitions[sourceRef]);
    if (missingSources.length > 0) {
      throw new Error(`${id}: sources non définies : ${missingSources.join(", ")}`);
    }

    const normalizedRow = normalizeForSearch(completeRow);
    const isBlocked =
      isLiterature || normalizedRow.includes("aucune vue canonique exploitable");
    const productionStatus = parseProductionStatus(plainMarkdown(rawStatus));
    const searchableText = normalizeForSearch(`${rawName} ${rawEvidence}`);
    const candidateVisualSourceRefs = isBlocked
      ? []
      : sourceRefs.filter((sourceRef) => sourceRef.startsWith("S"));
    const hasCandidateVisualSource = candidateVisualSourceRefs.length > 0;
    const visualCanon = isBlocked
      ? "blocked-no-canonical-visual"
      : hasCandidateVisualSource
        ? "candidate-primary-or-licensed-reference"
        : "pending-primary-capture";
    const spritePolicy = isBlocked
      ? "forbidden-no-canonical-visual"
      : hasCandidateVisualSource
        ? "allowed-only-after-private-turnaround"
        : "forbidden-until-primary-visual-capture";

    entries.push({
      id,
      name: plainMarkdown(rawName),
      media: {
        type: MEDIA_BY_PREFIX[prefix],
        work: plainMarkdown(rawWork),
      },
      evidenceSummary: plainMarkdown(rawEvidence),
      provenance: {
        proofTiers: parseProofTiers(completeRow, prefix),
        catalogueNotation: plainMarkdown(rawSource),
        sourceRefs,
        candidateVisualSourceRefs,
        sources: sourceRefs.map((sourceRef) => sourceDefinitions[sourceRef]),
      },
      productionStatus,
      visualCanon,
      spritePolicy,
      namedEquipment:
        isBlocked || !hasCandidateVisualSource
          ? []
          : inferNamedEquipment(searchableText),
      slots: buildSlots({
        isBlocked,
        hasCandidateVisualSource,
        searchableText,
        sourceRefs,
      }),
    });
  }
  return entries;
}

const markdown = readFileSync(CATALOGUE_PATH, "utf8");
const sourceDefinitions = parseSourceDefinitions(markdown);
const entries = parseEntries(markdown, sourceDefinitions);

const manifest = {
  schemaVersion: 2,
  contentClass: "private-dlc-reference-registry",
  publicBuildPolicy: {
    importableByPublicApp: false,
    gitIgnored: true,
    vercelExcluded: true,
    officialImagesAllowedInRepository: false,
    separateRepositoryMustRemainPrivate: true,
    publicDeploymentAllowed: false,
  },
  coveragePolicy: {
    snapshotDate: "2026-07-19",
    registryEntriesAreUniqueIndividuals: false,
    universalCompletenessClaimAllowed: false,
    note: "Work-item registry containing groups, states, cross-media duplicates and licensed archetypes.",
  },
  generatedFrom: {
    path: "docs/DLC-PRIVE-CATALOGUE.md",
    sha256: createHash("sha256").update(markdown).digest("hex"),
    webVerificationDate: "2026-07-19",
  },
  visualCanonStates: [
    "candidate-primary-or-licensed-reference",
    "pending-primary-capture",
    "blocked-no-canonical-visual",
  ],
  slotStates: [
    "attested-in-catalogue",
    "requires-private-capture",
    "blocked-no-canonical-visual",
  ],
  slotSchema: SLOT_SCHEMA,
  sources: sourceDefinitions,
  entries,
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `Manifeste DLC privé généré : ${entries.length} entrées, ${Object.keys(sourceDefinitions).length} sources.`,
);
