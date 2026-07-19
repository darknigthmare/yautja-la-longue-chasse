import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const MANIFEST_PATH = resolve(ROOT, "private-dlc", "manifest.json");
const PRIVATE_DLC_ROOT = resolve(ROOT, "private-dlc");
const PRIVATE_ASSETS_ROOT = resolve(ROOT, "private-dlc", "assets");
const CATALOGUE_PATH = resolve(ROOT, "docs", "DLC-PRIVE-CATALOGUE.md");
const GITIGNORE_PATH = resolve(ROOT, ".gitignore");
const VERCELIGNORE_PATH = resolve(ROOT, ".vercelignore");
const PACKAGE_PATH = resolve(ROOT, "package.json");

const EXPECTED_COUNTS = Object.freeze({
  F: 39,
  G: 51,
  C: 19,
  N: 13,
  L: 17,
});
const EXPECTED_TOTAL = Object.values(EXPECTED_COUNTS).reduce((sum, count) => sum + count, 0);
const VISUAL_CANON_STATES = new Set([
  "candidate-primary-or-licensed-reference",
  "pending-primary-capture",
  "blocked-no-canonical-visual",
]);
const SLOT_STATES = new Set([
  "attested-in-catalogue",
  "requires-private-capture",
  "blocked-no-canonical-visual",
]);
const VISUAL_PROOF_TIERS = new Set([
  "screen-primary",
  "publisher-art-primary",
  "licensed-object-secondary",
]);
const PUBLIC_SOURCE_ROOTS = ["app", "build", "worker", "public"];

const errors = [];

function check(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function isBelow(directory, path) {
  const pathFromDirectory = relative(directory, path);
  return (
    pathFromDirectory.length > 0 &&
    !pathFromDirectory.startsWith("..") &&
    !isAbsolute(pathFromDirectory)
  );
}

function listFilesRecursively(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listFilesRecursively(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

check(existsSync(MANIFEST_PATH), "private-dlc/manifest.json est absent");
if (!existsSync(MANIFEST_PATH)) {
  console.error(errors.map((error) => `ERREUR: ${error}`).join("\n"));
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
} catch (error) {
  console.error(`ERREUR: manifeste JSON illisible : ${error.message}`);
  process.exit(1);
}

check(manifest.schemaVersion === 2, "schemaVersion doit valoir 2");
check(
  manifest.contentClass === "private-dlc-reference-registry",
  "contentClass privé absent ou incorrect",
);
check(manifest.publicBuildPolicy?.importableByPublicApp === false, "le manifeste doit être non importable par l'app publique");
check(manifest.publicBuildPolicy?.gitIgnored === true, "la politique doit exiger l'exclusion Git");
check(manifest.publicBuildPolicy?.vercelExcluded === true, "la politique doit exiger l'exclusion Vercel");
check(
  manifest.publicBuildPolicy?.officialImagesAllowedInRepository === false,
  "les images officielles doivent être interdites dans le dépôt",
);
check(
  manifest.publicBuildPolicy?.separateRepositoryMustRemainPrivate === true,
  "un éventuel dépôt DLC séparé doit rester privé",
);
check(
  manifest.publicBuildPolicy?.publicDeploymentAllowed === false,
  "le déploiement public du DLC doit être explicitement interdit",
);
check(
  manifest.coveragePolicy?.registryEntriesAreUniqueIndividuals === false,
  "les entrées de travail ne doivent pas être présentées comme des individus uniques",
);
check(
  manifest.coveragePolicy?.universalCompletenessClaimAllowed === false,
  "le registre daté ne doit pas promettre une exhaustivité universelle",
);
check(existsSync(CATALOGUE_PATH), "le catalogue source est absent");
if (existsSync(CATALOGUE_PATH)) {
  const catalogueHash = createHash("sha256")
    .update(readFileSync(CATALOGUE_PATH, "utf8"))
    .digest("hex");
  check(
    manifest.generatedFrom?.sha256 === catalogueHash,
    "le manifeste est périmé : reconstruire avec npm run dlc:build-manifest",
  );
}

const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
check(entries.length === EXPECTED_TOTAL, `${EXPECTED_TOTAL} entrées attendues, ${entries.length} trouvées`);
const sources = manifest.sources ?? {};
check(Object.keys(sources).length === 100, `100 sources attendues, ${Object.keys(sources).length} trouvées`);
check(
  new Set(Object.values(sources).map((source) => source.url)).size ===
    Object.keys(sources).length,
  "chaque identifiant de source doit pointer vers une URL distincte",
);

const ids = new Set();
const counts = Object.fromEntries(Object.keys(EXPECTED_COUNTS).map((prefix) => [prefix, 0]));
const slotIds = new Set((manifest.slotSchema ?? []).map((slot) => slot.id));
check(slotIds.size === 33, `33 slots atomiques attendus, ${slotIds.size} trouvés`);

for (const entry of entries) {
  check(typeof entry.id === "string", "une entrée ne possède pas d'identifiant");
  if (typeof entry.id !== "string") {
    continue;
  }
  check(!ids.has(entry.id), `${entry.id}: identifiant dupliqué`);
  ids.add(entry.id);

  const idMatch = entry.id.match(/^([FGCNL])-\d{3}$/);
  check(Boolean(idMatch), `${entry.id}: format d'identifiant invalide`);
  if (idMatch) {
    counts[idMatch[1]] += 1;
  }

  check(typeof entry.name === "string" && entry.name.length > 0, `${entry.id}: nom absent`);
  check(typeof entry.media?.type === "string", `${entry.id}: type de média absent`);
  check(typeof entry.media?.work === "string" && entry.media.work.length > 0, `${entry.id}: œuvre absente`);
  check(
    VISUAL_CANON_STATES.has(entry.visualCanon),
    `${entry.id}: visualCanon invalide (${entry.visualCanon})`,
  );

  const sourceRefs = entry.provenance?.sourceRefs;
  const proofTiers = entry.provenance?.proofTiers;
  check(
    Array.isArray(proofTiers) && proofTiers.length > 0,
    `${entry.id}: niveau de preuve absent`,
  );
  check(Array.isArray(sourceRefs) && sourceRefs.length > 0, `${entry.id}: aucune source`);
  check(
    new Set(sourceRefs ?? []).size === (sourceRefs ?? []).length,
    `${entry.id}: référence source dupliquée`,
  );
  for (const sourceRef of sourceRefs ?? []) {
    const source = sources[sourceRef];
    check(Boolean(source), `${entry.id}: source ${sourceRef} absente du registre global`);
    check(
      typeof source?.url === "string" && source.url.startsWith("https://"),
      `${entry.id}: URL HTTPS invalide pour ${sourceRef}`,
    );
    check(
      source?.visualEvidencePolicy === "entry-specific-review-required",
      `${entry.id}: la politique visuelle de ${sourceRef} doit imposer une revue par entrée`,
    );
  }
  const candidateVisualSourceRefs = entry.provenance?.candidateVisualSourceRefs;
  check(
    Array.isArray(candidateVisualSourceRefs),
    `${entry.id}: candidateVisualSourceRefs absent`,
  );
  for (const sourceRef of candidateVisualSourceRefs ?? []) {
    check(
      sourceRefs?.includes(sourceRef) && sourceRef.startsWith("S"),
      `${entry.id}: source visuelle candidate invalide (${sourceRef})`,
    );
  }
  const hasCandidateVisualSource = (candidateVisualSourceRefs ?? []).length > 0;

  const entrySlotIds = Object.keys(entry.slots ?? {});
  check(entrySlotIds.length === slotIds.size, `${entry.id}: nombre de slots incomplet`);
  for (const slotId of slotIds) {
    const slot = entry.slots?.[slotId];
    check(Boolean(slot), `${entry.id}: slot ${slotId} absent`);
    check(SLOT_STATES.has(slot?.state), `${entry.id}: état invalide pour ${slotId}`);
    check(Array.isArray(slot?.sourceRefs), `${entry.id}: sourceRefs absent pour ${slotId}`);
    for (const sourceRef of slot?.sourceRefs ?? []) {
      check(
        sourceRefs?.includes(sourceRef),
        `${entry.id}: ${slotId} cite ${sourceRef}, absent de la provenance de l'entrée`,
      );
    }
  }

  const hasNoCanonicalVisualText = /aucune vue canonique exploitable/i.test(
    `${entry.evidenceSummary} ${entry.productionStatus?.label}`,
  );
  const isLiterature = entry.id.startsWith("N-");
  if (isLiterature || hasNoCanonicalVisualText) {
    check(
      (proofTiers ?? []).includes("text-only"),
      `${entry.id}: blocage visuel sans niveau de preuve TEXTE-C`,
    );
    check(
      entry.visualCanon === "blocked-no-canonical-visual",
      `${entry.id}: une entrée sans vue canonique doit être bloquée`,
    );
    check(
      entry.spritePolicy === "forbidden-no-canonical-visual",
      `${entry.id}: génération de sprite interdite attendue`,
    );
    check(
      Object.values(entry.slots ?? {}).every(
        (slot) => slot.state === "blocked-no-canonical-visual",
      ),
      `${entry.id}: tous les slots doivent être bloqués`,
    );
    check(
      Array.isArray(entry.namedEquipment) && entry.namedEquipment.length === 0,
      `${entry.id}: aucun équipement visuel ne peut être inféré`,
    );
    check(
      candidateVisualSourceRefs?.length === 0,
      `${entry.id}: aucune source ne peut être déclarée candidate visuelle`,
    );
  } else {
    if (hasCandidateVisualSource) {
      check(
        (proofTiers ?? []).some((tier) => VISUAL_PROOF_TIERS.has(tier)),
        `${entry.id}: source visuelle candidate sans niveau de preuve visuel`,
      );
      check(
        entry.visualCanon === "candidate-primary-or-licensed-reference",
        `${entry.id}: une source candidate ne doit pas être déclarée déjà validée`,
      );
      check(
        entry.spritePolicy === "allowed-only-after-private-turnaround",
        `${entry.id}: le sprite doit rester conditionné au turnaround privé`,
      );
    } else {
      check(
        (proofTiers ?? []).includes("secondary-index-only"),
        `${entry.id}: attente de capture primaire sans niveau SEC-D`,
      );
      check(
        entry.visualCanon === "pending-primary-capture",
        `${entry.id}: une entrée fondée seulement sur SEC-D doit attendre une capture primaire`,
      );
      check(
        entry.spritePolicy === "forbidden-until-primary-visual-capture",
        `${entry.id}: sprite interdit tant qu'aucune source visuelle primaire n'est acquise`,
      );
      check(
        Array.isArray(entry.namedEquipment) && entry.namedEquipment.length === 0,
        `${entry.id}: aucun équipement ne doit être inféré d'un index secondaire`,
      );
      check(
        Object.values(entry.slots ?? {}).every(
          (slot) => slot.state === "requires-private-capture",
        ),
        `${entry.id}: tous les slots doivent attendre une capture primaire`,
      );
    }
  }
}

for (const [prefix, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
  check(
    counts[prefix] === expectedCount,
    `${prefix}-*: ${expectedCount} entrées attendues, ${counts[prefix]} trouvées`,
  );
}

const blockedIds = entries
  .filter((entry) => entry.visualCanon === "blocked-no-canonical-visual")
  .map((entry) => entry.id)
  .sort();
const expectedBlockedIds = Array.from(
  { length: EXPECTED_COUNTS.N },
  (_, index) => `N-${String(index + 1).padStart(3, "0")}`,
);
check(
  JSON.stringify(blockedIds) === JSON.stringify(expectedBlockedIds),
  `blocage visuel inattendu : ${blockedIds.join(", ")}`,
);

const gitignore = existsSync(GITIGNORE_PATH) ? readFileSync(GITIGNORE_PATH, "utf8") : "";
const vercelignore = existsSync(VERCELIGNORE_PATH)
  ? readFileSync(VERCELIGNORE_PATH, "utf8")
  : "";
check(
  gitignore.split(/\r?\n/).includes("/private-dlc/"),
  ".gitignore doit contenir /private-dlc/",
);
check(
  vercelignore.split(/\r?\n/).includes("/private-dlc/"),
  ".vercelignore doit contenir /private-dlc/",
);
if (existsSync(PACKAGE_PATH)) {
  const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, "utf8"));
  check(
    !/(?:private-dlc|dlc:)/i.test(packageJson.scripts?.build ?? ""),
    "le script build public ne doit pas charger le DLC privé",
  );
}

for (const rootName of PUBLIC_SOURCE_ROOTS) {
  const sourceRoot = resolve(ROOT, rootName);
  for (const file of listFilesRecursively(sourceRoot)) {
    if (!/\.(?:[cm]?[jt]sx?|json)$/.test(file)) {
      continue;
    }
    const contents = readFileSync(file, "utf8");
    check(
      !/(?:from\s+|import\s*\(|require\s*\()\s*["'][^"']*private-dlc/i.test(contents),
      `${relative(ROOT, file)} importe le contenu DLC privé`,
    );
  }
}

let visualModuleCount = 0;
let reviewableVisualModuleCount = 0;
let blockedVisualModuleCount = 0;
const globalWaveIds = new Set();
const globalWavePaths = new Set();
const waveManifestPaths = listFilesRecursively(PRIVATE_ASSETS_ROOT).filter(
  (file) => file.toLowerCase().endsWith("manifest.json"),
);
for (const waveManifestPath of waveManifestPaths) {
  let wave;
  try {
    wave = JSON.parse(readFileSync(waveManifestPath, "utf8"));
  } catch (error) {
    check(
      false,
      `${relative(ROOT, waveManifestPath)}: JSON illisible (${error.message})`,
    );
    continue;
  }
  check(
    wave.visibility === "owner-only",
    `${relative(ROOT, waveManifestPath)}: visibilité owner-only requise`,
  );
  check(
    wave.source?.containsOfficialPixels === false,
    `${relative(ROOT, waveManifestPath)}: les pixels officiels sont interdits`,
  );
  check(
    wave.fidelityPolicy?.exactOfficialAssetClaimAllowed === false,
    `${relative(ROOT, waveManifestPath)}: une promesse de copie exacte est interdite`,
  );
  const sourcePath = resolve(ROOT, wave.source?.path ?? "");
  check(
    isBelow(PRIVATE_DLC_ROOT, sourcePath),
    `${relative(ROOT, waveManifestPath)}: l'atlas source doit rester sous private-dlc/`,
  );
  check(
    existsSync(sourcePath),
    `${relative(ROOT, waveManifestPath)}: atlas source absent`,
  );
  if (existsSync(sourcePath)) {
    const sourceHash = createHash("sha256")
      .update(readFileSync(sourcePath))
      .digest("hex");
    check(
      sourceHash === wave.source?.sha256,
      `${relative(ROOT, waveManifestPath)}: hash de l'atlas source périmé`,
    );
  }

  const waveIds = new Set();
  for (const assetModule of wave.modules ?? []) {
    visualModuleCount += 1;
    check(
      typeof assetModule.id === "string" &&
        !waveIds.has(assetModule.id) &&
        !globalWaveIds.has(assetModule.id),
      `${relative(ROOT, waveManifestPath)}: module dupliqué ou sans ID`,
    );
    waveIds.add(assetModule.id);
    globalWaveIds.add(assetModule.id);
    check(
      slotIds.has(assetModule.slot),
      `${assetModule.id}: slot atomique inconnu (${assetModule.slot})`,
    );
    const isReviewable =
      assetModule.productionStatus === "pending-reference-overlay";
    const isBlockedCandidate =
      assetModule.productionStatus === "blocked-requires-new-atomic-source";
    check(
      isReviewable || isBlockedCandidate,
      `${assetModule.id}: statut de production visuelle invalide`,
    );
    if (isReviewable) {
      reviewableVisualModuleCount += 1;
      check(
        (assetModule.blockingIssues ?? []).length === 0,
        `${assetModule.id}: un candidat révisable ne doit pas avoir de blocage`,
      );
    }
    if (isBlockedCandidate) {
      blockedVisualModuleCount += 1;
      check(
        Array.isArray(assetModule.blockingIssues) &&
          assetModule.blockingIssues.length > 0,
        `${assetModule.id}: le blocage atomique doit être documenté`,
      );
    }
    check(
      assetModule.approval?.visualMatchApproved === false &&
        assetModule.approval?.pivotApproved === false &&
        assetModule.approval?.runtimeApproved === false &&
        assetModule.approval?.atomicityApproved === false,
      `${assetModule.id}: approbation prématurée`,
    );
    const modulePath = resolve(ROOT, assetModule.path ?? "");
    check(
      isBelow(PRIVATE_DLC_ROOT, modulePath),
      `${assetModule.id}: le fichier doit rester sous private-dlc/`,
    );
    check(
      !globalWavePaths.has(modulePath),
      `${assetModule.id}: fichier réutilisé par plusieurs modules`,
    );
    globalWavePaths.add(modulePath);
    check(
      existsSync(modulePath),
      `${assetModule.id}: fichier atomique absent`,
    );
    if (existsSync(modulePath)) {
      const moduleHash = createHash("sha256")
        .update(readFileSync(modulePath))
        .digest("hex");
      check(
        moduleHash === assetModule.sha256,
        `${assetModule.id}: hash du module périmé`,
      );
    }
    for (const entryId of assetModule.entryIds ?? []) {
      const entry = entries.find((candidate) => candidate.id === entryId);
      check(
        Boolean(entry),
        `${assetModule.id}: entrée inconnue ${entryId}`,
      );
      check(
        entry?.visualCanon === "candidate-primary-or-licensed-reference",
        `${assetModule.id}: ${entryId} ne possède pas de source visuelle candidate primaire/licenciée`,
      );
    }
  }
}
check(
  visualModuleCount >= 17,
  `17 modules visuels privés minimum attendus, ${visualModuleCount} trouvés`,
);
check(
  reviewableVisualModuleCount + blockedVisualModuleCount === visualModuleCount,
  "chaque module visuel doit être révisable ou explicitement bloqué",
);

if (errors.length > 0) {
  console.error(errors.map((error) => `ERREUR: ${error}`).join("\n"));
  console.error(`ÉCHEC: ${errors.length} erreur(s).`);
  process.exit(1);
}

console.log(
  `DLC privé valide : ${entries.length} entrées de travail, ${blockedIds.length} entrées littérature bloquées, ${slotIds.size} slots par entrée, ${reviewableVisualModuleCount} modules en revue et ${blockedVisualModuleCount} candidats bloqués.`,
);
