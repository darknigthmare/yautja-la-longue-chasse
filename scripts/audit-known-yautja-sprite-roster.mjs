import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOGUE_ROSTER, CATALOGUE_ROSTER_COUNTS, CATALOGUE_SOURCE_WORKBOOK } from "../app/game/catalogueRoster.ts";
import { HUNTER_PRESETS } from "../app/game/hunterLore.ts";
import { PIT_CHRONICLE_BOSS_IDS, PIT_FIRST_EDITION_FIGHTER_IDS } from "../app/game/systems/pitFirstEdition.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_OUTPUT = "art-source/v26/known-yautja/roster.json";
const DOC_OUTPUT = "docs/known-yautja-sprite-roster-v26.md";
const CATALOGUE_PATH = "app/game/catalogueRoster.ts";
const PRESET_PATH = "app/game/hunterLore.ts";
const DLC_PATH = "docs/DLC-PRIVE-CATALOGUE.md";
const PLATES_PATH = "public/game/sprites/v5/film-plates/manifest.json";
const V14_PATH = "art-source/v14/roster/manifest.json";
const V23_PATH = "art-source/v23/pit/manifest.json";
const INPUTS = [CATALOGUE_PATH, PRESET_PATH, DLC_PATH, PLATES_PATH, V14_PATH, V23_PATH,
  "app/game/systems/pitFirstEdition.ts", "docs/chatgpt-yautja-backlog-2026-09-04.md"];
const presetById = new Map(HUNTER_PRESETS.map((entry) => [entry.id, entry]));
const catalogueById = new Map(CATALOGUE_ROSTER.map((entry) => [entry.id, entry]));
const animationFamilies = ["locomotion", "combat", "damage-and-defense", "weapon-and-mask-states",
  "campaign-interactions", "synchronized-throws", "finishers-and-victory"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const unique = (values) => [...new Set(values)];
const text = (relative) => readFileSync(resolveLocal(relative), "utf8").replace(/\r\n/g, "\n");
const readJson = (relative) => JSON.parse(text(relative));

function resolveLocal(relative) {
  assert.equal(typeof relative, "string");
  assert(!path.isAbsolute(relative) && !/^[A-Za-z]:/.test(relative), `Absolute path rejected: ${relative}`);
  assert(!relative.includes("\\"), `Use portable POSIX paths: ${relative}`);
  assert(!relative.split("/").includes(".."), `Traversal rejected: ${relative}`);
  const result = path.resolve(ROOT, ...relative.split("/"));
  assert(result.startsWith(`${ROOT}${path.sep}`), `Path outside project: ${relative}`);
  return result;
}

function localReference(relative, role, sourcePath, sourceKey) {
  const portable = relative.startsWith("/game/") ? `public${relative}` : relative;
  const absolute = resolveLocal(portable);
  const present = existsSync(absolute) && statSync(absolute).isFile();
  return { path: portable, role, status: present ? "present" : "missing", sourcePath, sourceKey };
}

function sourceLink(url) {
  const parsed = new URL(url);
  assert(["https:", "http:"].includes(parsed.protocol), `Invalid source URL: ${url}`);
  return { url, role: /(?:^|\.)fandom\.com$/.test(parsed.hostname) ? "secondary-index-only" : "source-link-to-review",
    fetchedByThisAudit: false, visualFidelityVerified: false };
}

function missingAnimation() {
  return { status: "missing", generated: false, acceptedManifestPaths: [], framesAccepted: 0, clipsAccepted: 0,
    plannedFrameCount: null, plannedClipCount: null,
    families: Object.fromEntries(animationFamilies.map((id) => [id, "missing"])),
    applicability: "review-per-character-before-defining-clips" };
}

function parseDlc() {
  const lines = text(DLC_PATH).split("\n");
  const links = new Map();
  for (const line of lines) {
    const match = line.match(/^\[([SR]\d+)\]:\s+(https?:\/\/\S+)/);
    if (match) links.set(match[1], match[2]);
  }
  return lines.flatMap((line, index) => {
    if (!/^\| `[FGCNL]-\d{3}`/.test(line)) return [];
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const sourceIds = unique([...line.matchAll(/\[([SR]\d+)\]/g)].map((match) => match[1]));
    for (const id of sourceIds) assert(links.has(id), `Unresolved DLC source ${id}`);
    return [{ id: cells[0].replaceAll("`", ""), name: cells[1], work: cells[2],
      evidence: cells.slice(3).join(" | "), source: { path: DLC_PATH, line: index + 1 },
      sourceIds, sourceUrls: sourceIds.map((id) => links.get(id)), rawCells: cells }];
  });
}

// Explicit identity mapping, never fuzzy name matching or the stale F-* cross-references
// in some DLC descriptions. Uncertain cross-media variants stay separate below.
const FILM_TARGETS = ["Y-118", "Y-049", "Y-103", "Y-031", "Y-187", "Y-199", "Y-245", "Y-104", "Y-035", "Y-179", "Y-206",
  "Y-175", "Y-044", "Y-045", "Y-258", "Y-012", "Y-213", "Y-255", "Y-250", "Y-040", "Y-034", "Y-058", "Y-024", "Y-083", "Y-222",
  "Y-092", "Y-237", "Y-076-emissary-one", "Y-076-emissary-two", "Y-085", "Y-101", "Y-154", "Y-161", "Y-102", "Y-259", "Y-260", "Y-066", "Y-127", "Y-151"];
const DIRECT_DLC_TARGETS = {
  "G-002": "Y-166", "G-003": "Y-013", "G-004": "Y-063", "G-006": "Y-257", "G-007": "Y-256", "G-008": "Y-137", "G-009": "Y-177", "G-010": "Y-209",
  "G-020": "Y-074", "G-021": "Y-008", "G-022": "Y-174", "G-024": "Y-240", "G-025": "Y-239", "G-026": "Y-055", "G-027": "Y-081",
  "G-033": "Y-029", "G-034": "Y-009", "G-035": "Y-157", "G-038": "Y-096", "G-039": "Y-014", "G-040": "Y-080", "G-041": "Y-249", "G-049": "Y-132", "G-050": "Y-211",
  "C-001": "Y-061", "C-002": "Y-220", "C-003": "Y-190", "C-005": "Y-110", "C-006": "Y-004", "C-007": "Y-027", "C-008": "Y-021", "C-009": "Y-077", "C-016": "Y-194", "C-019": "Y-162",
  "N-001": "Y-106", "N-002": "Y-122", "N-003": "Y-252", "N-004": "Y-121", "N-005": "Y-189", "N-006": "Y-099", "N-007": "Y-139",
  "L-001": "Y-150", "L-002": "Y-129", "L-004": "Y-170", "L-006": "Y-178", "L-007": "Y-202", "L-008": "Y-207", "L-009": "Y-094", "L-010": "Y-051", "L-011": "Y-128", "L-012": "Y-241", "L-013": "Y-010", "L-014": "Y-008", "L-015": "Y-028", "L-016": "Y-247", "L-017": "Y-006",
};
const DLC_VARIANTS = {
  "G-005": ["Y-007"], "G-023": ["Y-049"], "G-028": ["Y-058"], "G-029": ["Y-083"], "G-030": ["Y-024"], "G-031": ["Y-250"],
  "G-032": ["Y-076"], "G-037": ["Y-085"], "G-042": ["Y-154"], "G-043": ["Y-101", "Y-116"], "G-044": ["Y-151", "Y-084"],
  "G-045": [], "G-046": ["Y-118"], "G-048": [], "C-010": ["Y-103"], "L-003": ["Y-108"], "L-005": ["Y-057"],
};
const UNCERTAIN_VARIANTS = new Set(["G-032", "G-042", "G-043", "G-044", "G-045", "G-048"]);
const DLC_ARCHETYPES = { "G-001": [], "G-011": ["Y-037"], "G-012": ["Y-112"], "G-013": ["Y-201"], "G-014": ["Y-208"], "G-015": ["Y-068"], "G-016": [], "G-017": [], "G-018": ["Y-030"], "G-047": [] };
const DLC_RESEARCH_SETS = new Set(["G-051", "C-011", "C-012", "C-015", "C-017", "C-018", "N-011", "N-012", "N-013"]);
const DLC_UNRESOLVED_INDIVIDUALS = new Set(["C-013", "C-014", "N-008", "N-009", "N-010"]);

function buildInventory() {
  const plates = readJson(PLATES_PATH).entries;
  const v14 = readJson(V14_PATH).entries;
  const keyArt = readJson(V23_PATH).entries;
  const dlcRows = parseDlc();
  const entries = [];
  const makeBase = (id, name, kind) => ({ id, name, kind, catalogueIds: [], presetIds: [], dlcIds: [],
    work: "", documentedWorks: [], continuityLabel: "unresolved", identityStatus: "catalogue-label-not-independently-certified",
    flags: [], relatedCatalogueIds: [], sources: [], sourceLinks: [], localReferences: [],
    generationGate: "reference-review-required", visualFidelity: "not-certified",
    animation: missingAnimation(), warnings: [] });

  for (const original of CATALOGUE_ROSTER) {
    if (original.kind !== "individual" && original.id !== "Y-260") continue;
    const splitPresets = original.id === "Y-076" ? original.presetIds : [null];
    for (const splitPreset of splitPresets) {
      const presetIds = splitPreset ? [splitPreset] : [...original.presetIds];
      const entry = makeBase(splitPreset ? `${original.id}-${splitPreset}` : original.id,
        splitPreset ? presetById.get(splitPreset).name : original.name,
        original.kind === "group" ? "archetype" : "catalogue-individual");
      entry.catalogueIds = [original.id];
      entry.presetIds = presetIds;
      entry.work = original.work;
      entry.documentedWorks.push(original.work);
      entry.continuityLabel = original.continuity;
      entry.aliases = [...original.aliases];
      entry.catalogueEvidence = { mediaLabel: original.mediaLabel, family: original.family, sourceStatus: original.sourceStatus,
        distinctIdentity: original.distinctIdentity, notes: original.notes, visualAnchor: original.visualAnchor,
        forbiddenVisualMixes: [...original.forbiddenVisualMixes] };
      entry.catalogueVisualStatus = original.visualAssetStatus;
      entry.sources.push({ path: CATALOGUE_PATH, export: "CATALOGUE_ENTRY_BY_ID", key: original.id },
        { path: original.source.sheet === "Index maître" ? CATALOGUE_SOURCE_WORKBOOK.archivedPath : V14_PATH,
          sheet: original.source.sheet, row: original.source.row });
      entry.sourceLinks.push(...original.referenceUrls.map(sourceLink));
      if (original.continuity === "fan") entry.flags.push("fan-unofficial");
      if (original.distinctIdentity === null) entry.flags.push("identity-unconfirmed");
      if (original.family === "Fan-film" && original.continuity !== "fan") entry.flags.push("fan-origin-later-licensed-as-catalogued");
      if (/Anime inédit/.test(original.family)) entry.flags.push("unreleased-production");
      if (original.kind === "group") entry.flags.push("collective-archetype-not-named-individual");
      // Mixed visual/prose labels do not erase an existing screen or comic design.
      const proseOnly = original.media.length > 0 && original.media.every((media) => /^(?:Roman|prose)\b/i.test(media));
      if (proseOnly || presetIds.some((id) => presetById.get(id).textInterpretation)) {
        entry.flags.push("text-interpretation-not-canonical-visual");
        entry.generationGate = "text-source-review-and-explicit-interpretation-label";
      } else if (/Roman|prose/i.test(original.mediaLabel) && !presetIds.length) {
        entry.flags.push("mixed-media-visual-evidence-to-review");
      }
      for (const presetId of presetIds) {
        const preset = presetById.get(presetId);
        entry.documentedWorks.push(preset.work);
        entry.sources.push({ path: PRESET_PATH, export: "HUNTER_PRESET_BY_ID", key: presetId });
        entry.sourceLinks.push(...preset.sourceUrls.map(sourceLink));
        const plate = plates.find((item) => item.id === presetId);
        if (plate) {
          entry.localReferences.push(localReference(plate.runtimePath, "project-static-plate-not-animation", PLATES_PATH, presetId),
            localReference(plate.sourcePath, "project-static-master-not-animation", PLATES_PATH, presetId),
            ...plate.localReferences.map((ref) => localReference(ref, "historical-visual-reference-not-project-art", PLATES_PATH, presetId)));
          entry.sourceLinks.push(...plate.referenceUrls.map(sourceLink));
        }
        const illustration = keyArt.find((item) => item.id === presetId);
        if (illustration) {
          entry.localReferences.push(localReference(illustration.runtime, "project-selection-art-not-animation", V23_PATH, presetId),
            localReference(illustration.source, "project-selection-master-not-animation", V23_PATH, presetId));
          entry.warnings.push(`V23 ${presetId}: filmOneToOneCertified=${illustration.visualReview.filmOneToOneCertified}; ${illustration.visualReview.handCorrection ?? "pas de correction de main enregistrée"}.`);
        }
      }
      const supplemental = v14.find((item) => item.id === original.id);
      if (supplemental?.visualAsset?.masterPath) entry.localReferences.push(
        localReference(supplemental.visualAsset.masterPath, "project-static-master-not-animation", V14_PATH, original.id),
        localReference(supplemental.visualAsset.runtimePath, "project-static-plate-not-animation", V14_PATH, original.id));
      if (original.id === "Y-076") entry.warnings.push("La ligne collective Emissary est divisée en deux designs existants ; aucun troisième individu inventé.");
      entries.push(entry);
    }
  }

  const findEntry = (id) => { const entry = entries.find((item) => item.id === id); assert(entry, `Missing target ${id}`); return entry; };
  const attachDlc = (entry, row) => {
    entry.dlcIds.push(row.id);
    entry.documentedWorks.push(row.work);
    entry.sources.push(row.source);
    entry.sourceLinks.push(...row.sourceUrls.map(sourceLink));
    if (row.id.startsWith("N-")) {
      entry.flags.push("text-interpretation-not-canonical-visual");
      entry.generationGate = "text-source-review-and-explicit-interpretation-label";
    }
  };
  const addDlc = (row, kind, related = [], suffix = "", name = row.name) => {
    const entry = makeBase(`DLC-${row.id}${suffix}`, name, kind);
    entry.work = row.work;
    entry.documentedWorks.push(row.work);
    entry.continuityLabel = row.id.startsWith("N-") ? "expanded-text" : "licensed-or-source-labelled-design";
    entry.relatedCatalogueIds = related;
    entry.identityStatus = kind === "variant" ? "separate-visual-production-no-new-individual-claim" : "identification-required";
    if (UNCERTAIN_VARIANTS.has(row.id)) {
      entry.identityStatus = "cross-media-equivalence-unconfirmed-do-not-merge";
      entry.flags.push("cross-media-identity-conflict");
    }
    if (kind === "archetype") entry.flags.push("class-or-generic-design-not-named-individual");
    if (kind === "research-set") {
      entry.flags.push("unresolved-set-not-one-character");
      entry.generationGate = "identify-individual-designs-before-production";
    }
    entry.warnings.push("Les images des profils apparentés ne sont pas automatiquement des références fidèles de cette version.");
    attachDlc(entry, row);
    entries.push(entry);
    return entry.id;
  };

  for (const row of dlcRows) {
    let targetIds;
    if (row.id.startsWith("F-")) targetIds = [FILM_TARGETS[Number(row.id.slice(2)) - 1]];
    else if (DIRECT_DLC_TARGETS[row.id]) targetIds = [DIRECT_DLC_TARGETS[row.id]];
    else if (DLC_VARIANTS[row.id]) targetIds = [addDlc(row, "variant", DLC_VARIANTS[row.id])];
    else if (DLC_ARCHETYPES[row.id]) targetIds = [addDlc(row, "archetype", DLC_ARCHETYPES[row.id])];
    else if (DLC_RESEARCH_SETS.has(row.id)) targetIds = [addDlc(row, "research-set")];
    else if (DLC_UNRESOLVED_INDIVIDUALS.has(row.id)) targetIds = [addDlc(row, "dlc-individual-to-reconcile")];
    else if (row.id === "G-019") targetIds = ["Hunter", "Berserker", "Scout"].map((name) => addDlc(row, "archetype", [], `-${name.toLowerCase()}`, `${name} configurable — Hunting Grounds`));
    else if (row.id === "G-036") targetIds = [["Scar", "Y-175"], ["Celtic", "Y-044"], ["Chopper", "Y-045"]].map(([name, id]) => addDlc(row, "variant", [id], `-${name.toLowerCase()}`, `${name} — Hunting Grounds`));
    else if (row.id === "C-004") targetIds = ["Y-131", addDlc(row, "research-set", ["Y-131"], "-other", "Autres jeunes chasseurs nommés — AVP (à identifier)")];
    else throw new Error(`DLC row has no explicit coverage decision: ${row.id}`);
    for (const id of targetIds) { const entry = findEntry(id); if (!entry.dlcIds.includes(row.id)) attachDlc(entry, row); }
    row.productionIds = targetIds;
    row.mappingPolicy = "explicit-work-and-design-mapping-not-fuzzy-name-matching";
  }

  for (const entry of entries) {
    entry.flags = unique(entry.flags);
    entry.documentedWorks = unique(entry.documentedWorks);
    entry.sourceLinks = [...new Map(entry.sourceLinks.map((link) => [link.url, link])).values()];
    entry.localReferences = [...new Map(entry.localReferences.map((ref) => [`${ref.path}/${ref.role}`, ref])).values()];
    entry.existingStaticImagePaths = unique(entry.localReferences.filter((ref) => ref.status === "present" && ref.role.startsWith("project-")).map((ref) => ref.path));
    entry.missingHistoricalVisualReferencePaths = unique(entry.localReferences.filter((ref) => ref.status === "missing" && ref.role.startsWith("historical-")).map((ref) => ref.path));
    entry.hasLocalPrimaryVisualReference = entry.localReferences.some((ref) => ref.status === "present" && ref.role.startsWith("historical-"));
    entry.pitAvailability = entry.presetIds.some((id) => PIT_FIRST_EDITION_FIGHTER_IDS.includes(id)) ? "selectable-first-edition"
      : entry.presetIds.some((id) => PIT_CHRONICLE_BOSS_IDS.includes(id)) ? "chronicle-boss-not-selectable" : "not-implemented-as-pit-fighter";
    if (entry.missingHistoricalVisualReferencePaths.length) entry.warnings.push("Sources visuelles historiques perdues ou absentes : retrouver les références avant validation de fidélité.");
    if (!entry.sourceLinks.length) entry.warnings.push("Aucun lien source documenté pour cette entrée.");
    if (!entry.hasLocalPrimaryVisualReference) entry.warnings.push("Aucune référence visuelle primaire locale recensée ; les liens seuls et portraits du projet ne certifient pas le design.");
  }
  const count = (items, key) => items.reduce((counts, item) => { counts[item[key]] = (counts[item[key]] ?? 0) + 1; return counts; }, {});
  const historicalReferences = plates.flatMap((plate) => plate.localReferences.map((ref) => localReference(ref, "historical-visual-reference", PLATES_PATH, plate.id)));
  const inputs = INPUTS.map((file) => ({ path: file, sha256NormalizedLf: hash(text(file)) }));
  const sourceWorkbook = localReference(CATALOGUE_SOURCE_WORKBOOK.archivedPath, "immutable-source-workbook", CATALOGUE_PATH, "CATALOGUE_SOURCE_WORKBOOK");
  const workbookBytes = readFileSync(resolveLocal(sourceWorkbook.path));
  assert.equal(hash(workbookBytes), CATALOGUE_SOURCE_WORKBOOK.sha256, "Source workbook changed");
  const nonIndividuals = CATALOGUE_ROSTER.filter((entry) => entry.kind !== "individual").map((entry) => ({
    id: entry.id, name: entry.name, kind: entry.kind, canonicalName: entry.canonicalName, presetIds: [...entry.presetIds],
    source: { path: CATALOGUE_PATH, key: entry.id }, sourceLinks: entry.referenceUrls.map(sourceLink),
    productionIds: entries.filter((design) => design.catalogueIds.includes(entry.id) || design.relatedCatalogueIds.includes(entry.id)).map((design) => design.id),
    policy: entry.kind === "alias" ? "reference-alias-not-an-additional-person; check-cross-media-conflicts" : "collective-or-class-not-a-count-of-named-individuals",
  }));
  const inventory = {
    schemaVersion: 1, version: "v26-known-yautja-production-inventory", generator: "scripts/audit-known-yautja-sprite-roster.mjs",
    policy: { scope: "all-catalogued-individuals-plus-documented-dlc-designs-without-uncertain-merges",
      generationProviderAllowed: "OpenAI-integrated-imagegen-only", generationPerformedByThisScript: false,
      baselineOnly: true, acceptedAnimationProductionManifests: [],
      generatedAnimationIntegration: "Independent production manifests, including Jungle Hunter V26, must be audited separately. This baseline never discovers or promotes generated outputs automatically.",
      staticArtOrProceduralRigsCountAsAnimations: false, canonicalUniqueIndividualCount: null,
      futureRosterResearchRequired: true, officialReferencePixelsAreRuntimeAssets: false,
      imageQaRequired: ["hands-and-finger-count", "grips-and-weapon-continuity", "joint-anatomy", "identity-and-equipment", "frame-to-frame-coherence", "orientation-and-silhouette", "transparent-padding-and-grid", "timing-and-gameplay-readability"],
    },
    inputFiles: inputs, sourceWorkbook: { ...sourceWorkbook, byteLength: workbookBytes.length, sha256: hash(workbookBytes) },
    summary: { catalogue: CATALOGUE_ROSTER_COUNTS, catalogueIndividualEntries: 214, catalogueIndividualDesigns: 215,
      catalogueIndividualDesignsWithPreset: entries.filter((e) => e.kind === "catalogue-individual" && e.presetIds.length).length,
      directPresets: HUNTER_PRESETS.length, pitSelectable: PIT_FIRST_EDITION_FIGHTER_IDS.length, pitBosses: PIT_CHRONICLE_BOSS_IDS.length,
      dlcDocumentRows: dlcRows.length, dlcDocumentRowsByPrefix: count(dlcRows.map((row) => ({ prefix: row.id[0] })), "prefix"),
      productionEntries: entries.length, productionEntriesByKind: count(entries, "kind"),
      researchSetEntries: entries.filter((entry) => entry.kind === "research-set").length,
      fanIndividualEntries: entries.filter((entry) => entry.flags.includes("fan-unofficial")).length,
      textInterpretationEntries: entries.filter((entry) => entry.flags.includes("text-interpretation-not-canonical-visual")).length,
      animationMissingEntries: entries.length, animationGeneratedEntries: 0, animationAcceptedFrames: 0,
      staticFilmPlatesPresent: plates.filter((entry) => existsSync(resolveLocal(entry.runtimePath))).length,
      staticFilmMastersPresent: plates.filter((entry) => existsSync(resolveLocal(entry.sourcePath))).length,
      historicalReferenceOccurrences: historicalReferences.length,
      historicalReferenceMissingOccurrences: historicalReferences.filter((ref) => ref.status === "missing").length,
      historicalReferenceUniquePaths: unique(historicalReferences.map((ref) => ref.path)).length,
      historicalReferenceMissingUniquePaths: unique(historicalReferences.filter((ref) => ref.status === "missing").map((ref) => ref.path)).length,
      existingStaticProjectImages: unique(entries.flatMap((entry) => entry.existingStaticImagePaths)).length,
    },
    budgetFromRecoveredChat: { hunters: 53, movesetActions: 1179, synchronizedThrows: 154, finishers: 424,
      boards: 3074, clips: 12296, originalPoses: 38054, delivered: false, exactHunterListRecovered: false,
      source: { path: "docs/chatgpt-yautja-backlog-2026-09-04.md", section: "PIT-07 / PIT-08" },
      warning: "These historical quantities are neither this roster's limit nor accepted animation coverage." },
    identityConflicts: [
      { catalogueIds: ["Y-084", "Y-151"], separateProductionId: "DLC-G-044", warning: "Father PHG et Njohrr fusionnés dans le classeur ; document DLC demande des designs séparés tant que l'équivalence n'est pas prouvée." },
      { catalogueIds: ["Y-116", "Y-101"], separateProductionId: "DLC-G-043", warning: "Jotun PHG et Grendel KoK : ne pas fusionner sur l'alias du classeur." },
      { catalogueIds: ["Y-154"], separateProductionId: "DLC-G-042", warning: "Oni PHG et chasseur du Japon féodal KoK : identité inter-médias non validée." },
      { catalogueIds: ["Y-076"], separateProductionId: "DLC-G-032", warning: "Emissary PHG conservé séparément des deux Emissaries des scènes supprimées." },
    ],
    originalsOutsideKnownFranchiseRoster: [{ id: "custom", status: "player-created-appearance-not-known-franchise-individual" },
      { id: null, name: "Bad Blood originaux de Cinder", status: "unidentified-story-backlog-not-implemented-roster", sourcePath: "docs/chatgpt-yautja-backlog-2026-09-04.md" }],
    entries, catalogueNonIndividuals: nonIndividuals, dlcRows,
  };
  validateInventory(inventory);
  return inventory;
}

function validateInventory(inventory) {
  const { entries } = inventory;
  const ids = new Set(entries.map((entry) => entry.id));
  assert.equal(ids.size, entries.length, "Duplicate production ID");
  const individuals = CATALOGUE_ROSTER.filter((entry) => entry.kind === "individual");
  assert.equal(individuals.length, 214, "Catalogue expanded: review coverage assertion and summary");
  assert.equal(entries.filter((entry) => entry.kind === "catalogue-individual").length, 215);
  for (const original of individuals) assert.equal(entries.filter((entry) => entry.catalogueIds.includes(original.id)).length, original.id === "Y-076" ? 2 : 1, `Missing/duplicate catalogue coverage ${original.id}`);
  assert.equal(inventory.dlcRows.length, 139, "DLC expanded: classify every new row before production");
  for (const row of inventory.dlcRows) {
    assert(row.productionIds.length > 0, `Uncovered DLC row ${row.id}`);
    for (const id of row.productionIds) assert(ids.has(id), `Invalid DLC target ${id}`);
  }
  for (const preset of HUNTER_PRESETS) assert(entries.some((entry) => entry.presetIds.includes(preset.id)), `Preset not covered ${preset.id}`);
  for (const conflict of inventory.identityConflicts) assert(ids.has(conflict.separateProductionId));
  for (const entry of entries) {
    assert.equal(entry.animation.status, "missing");
    assert.equal(entry.animation.generated, false);
    assert.deepEqual(entry.animation.acceptedManifestPaths, []);
    for (const id of [...entry.catalogueIds, ...entry.relatedCatalogueIds]) assert(catalogueById.has(id), `Unknown catalogue ID ${id}`);
    for (const source of entry.sources) assert(existsSync(resolveLocal(source.path)), `Source document missing: ${source.path}`);
    for (const ref of entry.localReferences) {
      const current = existsSync(resolveLocal(ref.path)) && statSync(resolveLocal(ref.path)).isFile();
      assert.equal(ref.status, current ? "present" : "missing", `Wrong file status ${ref.path}`);
    }
    for (const file of entry.existingStaticImagePaths) assert(existsSync(resolveLocal(file)), `Claimed existing image missing ${file}`);
    for (const file of entry.missingHistoricalVisualReferencePaths) assert(!existsSync(resolveLocal(file)), `Missing-source list contains existing file ${file}`);
  }
  // Regression checks for known historical ambiguities, not just total counts.
  for (const id of ["Y-031", "Y-061", "Y-194"]) assert(!entries.find((entry) => entry.id === id).flags.includes("text-interpretation-not-canonical-visual"), `Visual character misclassified as text-only: ${id}`);
  assert(entries.find((entry) => entry.id === "Y-106").flags.includes("text-interpretation-not-canonical-visual"));
  for (const [preset, id] of [["emissary-one", "Y-076-emissary-one"], ["emissary-two", "Y-076-emissary-two"]]) assert.deepEqual(entries.find((entry) => entry.id === id).presetIds, [preset]);
  assert.deepEqual(entries.find((entry) => entry.id === "DLC-G-028").relatedCatalogueIds, ["Y-058"]);
  for (const entry of entries.filter((entry) => entry.kind === "variant")) assert.deepEqual(entry.existingStaticImagePaths, [], "Do not silently inherit art from another version");
  assert.throws(() => resolveLocal("../outside.png"));
  assert.throws(() => resolveLocal("C:/outside.png"));
}

function renderDoc(inventory) {
  const s = inventory.summary;
  const escapeCell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
  const entryRows = inventory.entries.map((entry) => `| ${entry.id} | ${escapeCell(entry.name)} | ${entry.kind} | ${entry.flags.join(", ") || "—"} | ${entry.existingStaticImagePaths.length} | missing |`);
  return `# Production des sprites Yautja — inventaire V26\n\nDocument généré par \`node scripts/audit-known-yautja-sprite-roster.mjs\`. Vérification sans écriture : \`node scripts/audit-known-yautja-sprite-roster.mjs --check\`.\n\nLa matrice [roster.json](../art-source/v26/known-yautja/roster.json) est un **inventaire initial**, pas une livraison graphique. Aucune génération n'est exécutée par ce script. Toutes les animations restent \`missing\`. Les productions réelles, y compris les planches Jungle Hunter V26, ont leurs manifestes séparés et ne sont pas promues automatiquement par cet audit.\n\n## Comptes vérifiés\n\n| Ensemble | Compte | Sens |\n|---|---:|---|\n| Fiches catalogue | ${s.catalogue.total} | ${s.catalogue.byKind.individual} individus, ${s.catalogue.byKind.alias} aliases, ${s.catalogue.byKind.rank} rangs, ${s.catalogue.byKind.group} groupes |\n| Fiches individuelles couvertes | ${s.catalogueIndividualEntries} | Aucune restriction aux 12 PIT ou aux 53 presets |\n| Designs issus des individus | ${s.catalogueIndividualDesigns} | Les deux Emissaries Y-076 sont séparés |\n| Presets de campagne couverts | ${s.directPresets} | Inclut le preset d'archétype Arena Guard |\n| PIT | ${s.pitSelectable} + ${s.pitBosses} | Sélectionnables + boss non sélectionnables |\n| Registre documentaire DLC | ${s.dlcDocumentRows} | 39 films, 51 jeux, 19 comics, 13 littérature, 17 designs licenciés |\n| Entrées de production/recherche | ${s.productionEntries} | ${Object.entries(s.productionEntriesByKind).map(([key, count]) => `${key}: ${count}`).join(" ; ")} |\n| Entrées de recherche collective | ${s.researchSetEntries} | Ce ne sont pas ${s.researchSetEntries} individus uniques |\n| Fiches fan non officielles | ${s.fanIndividualEntries} | Origines et limites signalées dans chaque entrée |\n| Entrées signalées texte/interprétation | ${s.textInterpretationEntries} | Pas de promesse de vue canonique 1:1 |\n| Plaques V5 présentes | ${s.staticFilmPlatesPresent} + ${s.staticFilmMastersPresent} | PNG runtime + masters statiques |\n| Images statiques locales recensées | ${s.existingStaticProjectImages} | Chemins uniques ; aucun n'est compté comme animation |\n| Animations générées/acceptées dans cette matrice | 0 | ${s.animationMissingEntries} entrées missing ; 0 frame acceptée |\n\nLe total de production n'est **pas un nombre de Yautja canoniques uniques** : il inclut des versions de jeux, états historiques, archétypes et ensembles encore à identifier. Les 53 Hunters / 1 179 actions / 424 finishers du chat retrouvé sont un budget historique, sans master de roster récupéré ; ils ne limitent pas cette matrice et ne prouvent aucun clip livré.\n\n## Sources perdues et fidélité\n\nLe manifeste V5 mentionne **${s.historicalReferenceOccurrences} références locales historiques** (${s.historicalReferenceUniquePaths} chemins uniques). **${s.historicalReferenceMissingOccurrences} occurrences sont absentes** (${s.historicalReferenceMissingUniquePaths} chemins uniques). Chaque chemin absent reste visible dans \`localReferences\` et \`missingHistoricalVisualReferencePaths\` ; les images statiques présentes sont listées séparément. Les liens source sont conservés sans prétendre qu'ils ont été téléchargés ou vérifiés par ce script. Les liens Fandom restent des index secondaires.\n\nUn portrait original du projet, un preset modulaire ou un rig procédural ne valide ni la fidélité à la source ni une spritesheet animée. Les images V23 sont explicitement non certifiées 1:1 ; la correction des deux prises de City Hunter est tracée dans les avertissements de son entrée. Mains, doigts, articulations, armes, équipement, orientation et cohérence entre frames doivent être contrôlés avant acceptation.\n\nLes interprétations textuelles sont signalées ; les personnages encore anonymes dans un groupe exigent une identification avant génération. Les familles d'animation prévues sont locomotion, combat, dégâts/défense, états armes/masque, interactions de campagne, projections synchronisées et finishers/victoire, avec applicabilité à confirmer par personnage. Aucun nombre de frames ou de clips par personnage n'est inventé.\n\n## Identités et variantes à ne pas fusionner\n\n- Father Hunting Grounds (DLC-G-044) reste distinct de Njohrr Y-151 malgré l'alias Y-084 du classeur.\n- Jotun Hunting Grounds (DLC-G-043) reste distinct de Grendel KoK Y-101 malgré Y-116.\n- Oni Hunting Grounds (DLC-G-042) reste distinct du chasseur du Japon féodal KoK Y-154.\n- Emissary Hunting Grounds (DLC-G-032) reste distinct des deux Emissaries des scènes supprimées.\n- Les adaptations PHG, Fortnite, Mortal Kombat X, Ghost Recon, états Golden Angel et variantes licenciées ont des fiches de production séparées lorsque le document distingue le design. Les liens \`relatedCatalogueIds\` ne réutilisent pas automatiquement les images de l'autre version.\n- Les lignes DLC sont toutes reliées à au moins une entrée via \`dlcRows[].productionIds\`. Les correspondances utilisent les noms/œuvres explicites : certaines références F-* internes au document source sont anciennes et ne doivent pas être résolues aveuglément.\n- Le personnage personnel \`custom\` et les Bad Blood originaux de Cinder ne sont pas ajoutés comme personnages connus de franchise.\n\n## Reproductibilité et limites\n\nLe générateur n'utilise ni date courante, ni réseau, ni dossier temporaire de sortie. Il calcule les empreintes SHA-256 des sources textuelles après normalisation LF et vérifie l'empreinte binaire du classeur immuable. Les chemins sont relatifs au dépôt et les sorties JSON/Markdown sont stables à sources et disponibilité des références inchangées. \`--check\` reconstruit deux fois en mémoire, compare les octets et contrôle les fichiers publiés, la couverture de chaque ID, les 139 lignes DLC, les 53 presets et les chemins. Une nouvelle référence présente ou une source modifiée exige une régénération explicite.\n\nLe registre reflète les sources présentes dans le dépôt, sans certification exhaustive externe de la franchise. Les flags de continuité du catalogue sont conservés comme étiquettes documentaires, pas comme un nouvel audit canon.\n\n## Matrice exhaustive\n\nLes références locales, liens sources, correspondances de presets/DLC, avertissements et familles manquantes sont détaillés par ID dans le JSON.\n\n| ID de production | Nom | Type | Balisage | Images statiques présentes | Animation |\n|---|---|---|---|---:|---|\n${entryRows.join("\n")}\n`;
}

const check = process.argv.includes("--check");
assert(process.argv.slice(2).every((arg) => arg === "--check"), "Usage: node scripts/audit-known-yautja-sprite-roster.mjs [--check]");
const inventory = buildInventory();
const json = `${JSON.stringify(inventory, null, 2)}\n`;
const doc = renderDoc(inventory);
const second = buildInventory();
assert.equal(JSON.stringify(second, null, 2) + "\n", json, "Non-deterministic JSON generation");
assert.equal(renderDoc(second), doc, "Non-deterministic Markdown generation");
for (const [file, contents] of [[JSON_OUTPUT, json], [DOC_OUTPUT, doc]]) {
  if (check) assert(readFileSync(resolveLocal(file)).equals(Buffer.from(contents, "utf8")), `${file} is stale. Run this script without --check.`);
  else { mkdirSync(path.dirname(resolveLocal(file)), { recursive: true }); writeFileSync(resolveLocal(file), contents, "utf8"); }
}
console.log(JSON.stringify({ mode: check ? "check" : "write", reproducible: true, outputPaths: [JSON_OUTPUT, DOC_OUTPUT], summary: inventory.summary }, null, 2));
