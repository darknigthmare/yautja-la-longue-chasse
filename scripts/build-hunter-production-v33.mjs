import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// This inventories work. It never generates images or approves a clip.
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rosterPath = 'art-source/v26/known-yautja/roster.json';
const humanPath = 'art-source/v28/known-hunters/manifest.json';
const roster = read(rosterPath), previous = read(humanPath);
const families = [
  ['idle', 'Neutre et respiration', ['B01']],
  ['walk-forward', 'Marche avant', ['B02']],
  ['walk-backward', 'Recul marche', ['B02']],
  ['crouch', 'Accroupissement et remontée', ['B04']],
  ['jump-land', 'Saut et réception', ['B06', 'B07']],
  ['guard', 'Garde et raccords', ['B09', 'B10']],
  ['hurt', 'Impact et récupération courte', ['B12', 'B13']],
  ['light', 'Frappe légère', ['B23']],
  ['medium', 'Frappe moyenne', ['B23']],
  ['heavy', 'Frappe lourde', ['B23']],
].map(([id, label, recoveredFamilies]) => ({ id, label, recoveredFamilies }));
const uniqueHumanVariants = new Map();
for (const entry of previous.entries.filter(entry => entry.species === 'human')) {
  if (!uniqueHumanVariants.has(entry.variantId)) uniqueHumanVariants.set(entry.variantId, entry);
}
const subjects = roster.entries.map(entry => ({
  id: entry.id, name: entry.name, kind: entry.kind, species: 'yautja',
  work: entry.work, presetIds: entry.presetIds, flags: entry.flags,
  generationGate: entry.generationGate, visualFidelity: entry.visualFidelity,
  source: rosterPath, existingPresentationPaths: entry.existingStaticImagePaths,
  isIndividualDesign: ['catalogue-individual', 'dlc-individual-to-reconcile'].includes(entry.kind),
}));
for (const entry of uniqueHumanVariants.values()) subjects.push({
  id: entry.variantId, name: entry.name + ' · ' + entry.variantLabel,
  kind: 'explicitly-requested-human-variant', species: 'human',
  work: entry.variantLabel, presetIds: [], flags: ['human-not-yautja'],
  generationGate: 'preserve-reviewed-variant-and-human-anatomy', visualFidelity: 'not-certified',
  source: humanPath, existingPresentationPaths: [entry.source.path], isIndividualDesign: true,
});
assert.equal(new Set(subjects.map(entry => entry.id)).size, subjects.length);

const registrySource = fs.readFileSync('app/game/pitSpriteSheetRegistry.ts', 'utf8');
const registryStart = registrySource.indexOf('= [');
assert(registryStart >= 0);
const registry = JSON.parse(registrySource.slice(registryStart + 2).trim().replace(/;$/, ''));
const runtimeByPreset = new Map(registry.map(entry => [entry.fighterId, entry]));
const productionPath = 'art-source/v33/pit/berserker/berserker-production-provenance-v33.json';
const berserker = fs.existsSync(productionPath) ? read(productionPath) : null;
for (const entry of subjects) {
  entry.firstLot = families.map(family => {
    const runtime = entry.presetIds.map(id => runtimeByPreset.get(id)).filter(Boolean);
    const clips = runtime.flatMap(def => def.atlas.clips.filter(clip =>
      clip.status === 'validated' && (clip.id === family.id || clip.id.startsWith(family.id + '-') || clip.id.startsWith('pit.stand.' + family.id + '.') || (family.id === 'guard' && ['high-guard', 'low-guard'].includes(clip.id)) || (family.id === 'jump-land' && /^(jump|land)(-|$)/.test(clip.id))))
      .map(clip => ({ id: clip.id, facing: clip.facing, frameCount: clip.frames.length, atlas: def.atlas.id })));
    const authored = entry.id === 'Y-024' ? berserker?.assets.filter(asset => (asset.actionId ?? asset.id) === family.id) ?? [] : [];
    const artifacts = authored.map(asset => {
      assert(fs.existsSync(asset.sourcePath), 'Missing authored source: ' + asset.sourcePath);
      assert.equal(digest(fs.readFileSync(asset.sourcePath)), asset.sha256, 'Changed source: ' + asset.sourcePath);
      return { path: asset.sourcePath, sha256: asset.sha256, reviewStatus: asset.status, provenance: productionPath };
    });
    return { familyId: family.id, status: clips.length ? 'runtime-partial' : artifacts.length ? 'authored-awaiting-or-failed-review' : 'planned',
      complete: false, artifacts, runtimeClips: clips };
  });
}
const output = {
  schemaVersion: 1, id: 'v33-known-hunter-ten-sheet-first-lot', generator: 'scripts/build-hunter-production-v33.mjs',
  policy: {
    openAI: 'integrated-imagegen-only', generationPerformedByThisScript: false,
    claimedCanonicalUniqueHunterCount: null, doNotTruncateToApproximateHundred: true,
    firstLotFamiliesPerDesign: 10, firstLotIsCompleteAnimationSet: false,
    tenSheetMeaning: 'Ten initial production families; not a replacement for the recovered 36 families, movesets and finishers.',
    fourPosesPerFacingIsOnlyInitialSampling: true, mirrorGeneratedFacings: false,
    keepResearchSetsAndAliasesOutOfUniqueIndividualCounts: true,
    sourceStatus: 'Local inventory cross-checked with recovered Concevoir le DLC messages; referenced attachments remain unavailable.',
    requiredReview: ['identity', 'hands', 'grip-and-weapon-attachment', 'joint-anatomy', 'facing', 'foot-contact', 'pose-continuity', 'alpha-padding', 'timing-in-runtime'],
  },
  sourceDigests: [rosterPath, humanPath].map(file => ({ file, sha256: digest(fs.readFileSync(file)) })),
  summary: {
    catalogueIndividualDesigns: subjects.filter(entry => entry.kind === 'catalogue-individual').length,
    additionalProductionOrResearchEntries: subjects.filter(entry => entry.species === 'yautja' && entry.kind !== 'catalogue-individual').length,
    explicitlyRequestedHumanVariants: uniqueHumanVariants.size,
    productionRecords: subjects.length, initialFamilyTargets: subjects.length * 10,
    completedCharacters: 0, recordsWithRuntimeClips: subjects.filter(entry => entry.firstLot.some(family => family.runtimeClips.length)).length,
    newSourceSheetsIndexed: subjects.reduce((sum, entry) => sum + entry.firstLot.reduce((n, family) => n + family.artifacts.length, 0), 0),
  },
  initialFamilies: families,
  remainingRecoveredFamilies: ['B03', 'B05', 'B08', 'B11', 'B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B24', 'B25', 'B26', 'B27', 'B28', 'B29', 'B30', 'B31', 'B32', 'B33', 'B34', 'B35', 'B36'],
  additionalWork: ['Complete normaux and five identity-specific specials', 'Two supers, ultimate, finishers and self-destruct where applicable', 'Victim sync, weapons, projectiles, front/back nets, VFX and transitions', 'Independent authored opposite facings and all interrupted or failed branches'],
  subjects,
};
const file = 'art-source/v33/known-hunters/production-manifest.json';
const serialized = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(file, 'utf8'), serialized, 'Stale V33 production inventory');
else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, serialized); }
console.log(JSON.stringify(output.summary));
