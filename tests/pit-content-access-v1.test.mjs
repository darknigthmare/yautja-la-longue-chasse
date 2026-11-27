import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `export * as access from "./pitContentAccessV1";
      export * as saves from "./pitSave";
      export * as arcade from "./pitArcade";
      export * as firstEdition from "./pitFirstEdition";`,
    resolveDir: fileURLToPath(new URL("../app/game/systems/", import.meta.url)),
    loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
});
const { access, saves, arcade, firstEdition } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`,
);

const OWNER = "2026-11-27T06:00:00.000Z";
const NOW = "2026-11-27T06:10:00.000Z";
const READY = access.PIT_CONTENT_READY_V1;
const empty = () => access.buildPitContentEvidenceV1(saves.createPitSave(OWNER), OWNER);
const rewardId = arcade.PIT_ARCADE_LADDERS["jungle-hunter"].cosmeticRewardId;

function rewardDefinition(overrides = {}) {
  return {
    id: rewardId, category: "palette", label: "Palette du Jugement",
    loreStatus: "original-compatible", lockedPreview: "silhouette",
    discovery: { initial: "identified", secretLabel: "Distinction non révélée" },
    access: {
      kind: "reward", grantId: rewardId,
      condition: { kind: "counter", counterId: "arcade:jungle-hunter:encounters", minimum: 8, label: "Terminer l’Arcade avec Jungle Hunter." },
    },
    ...overrides,
  };
}

function playArcade() {
  let save = saves.createPitSave(OWNER);
  let lastResult;
  for (const [index, encounter] of arcade.PIT_ARCADE_LADDERS["jungle-hunter"].encounters.entries()) {
    const completed = index === 7;
    const result = {
      id: `content-arcade-${index}`, mode: "arcade", outcome: "victory", fighterId: "jungle-hunter",
      arenaId: encounter.arenaId, roundsWon: 2, roundsLost: 0,
      arcadeEncounterIndex: index, arcadeCompleted: completed,
      cosmeticRewardIds: completed ? [rewardId] : [], completedAt: NOW,
    };
    save = saves.applyPitResult(save, result).save;
    lastResult = result;
  }
  return { save, lastResult };
}

test("the existing 18 distinctions expose inspectable locks without adding roster locks", () => {
  const save = saves.createPitSave(OWNER);
  const before = saves.serializePitSave(save);
  const catalog = access.buildPitRewardSlotsV1(save, OWNER);
  assert.equal(catalog.status, "ready");
  assert.equal(catalog.totalCount, 18);
  assert.equal(catalog.entries.filter(entry => entry.definition.category === "palette").length, 12);
  assert.equal(catalog.entries.filter(entry => entry.definition.category === "collection").length, 6);
  assert.equal(catalog.earnedCount, 0);
  assert.ok(catalog.entries.every(entry => entry.access.canInspect && !entry.access.canSelect));
  assert.ok(catalog.entries.every(entry => entry.access.right === "locked" && entry.access.visual === "silhouette"));
  assert.equal(saves.serializePitSave(save), before);
  for (const id of firstEdition.PIT_FIRST_EDITION_FIGHTER_IDS) {
    const included = rewardDefinition({ id, category: "fighter", label: id, access: { kind: "included" } });
    const state = access.resolvePitContentAccessV1(included, empty(), READY);
    assert.equal(state.canSelect, true);
    assert.equal(state.mark, "none");
  }
});

test("a real Arcade completion reveals one permanent slot, survives save/load, and is idempotent", () => {
  const { save, lastResult } = playArcade();
  const duplicate = saves.applyPitResult(save, lastResult);
  assert.equal(duplicate.applied, false);
  assert.deepEqual(duplicate.save, save);
  assert.deepEqual(save.unlockedCosmeticIds, [rewardId]);
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const options = { storage, key: saves.pitSaveStorageKey(OWNER), expectedOwnerSaveCreatedAt: OWNER };
  assert.equal(saves.writePitSave(save, options).persisted, true);
  const loaded = saves.loadPitSave(options);
  assert.equal(loaded.loaded, true);
  const catalog = access.buildPitRewardSlotsV1(loaded.save, OWNER);
  const earned = catalog.entries.find(entry => entry.honor.id === rewardId);
  assert.equal(catalog.earnedCount, 1);
  assert.equal(earned.access.right, "permanent");
  assert.equal(earned.access.visual, "revealed");
  assert.equal(earned.access.canSelect, true);
  assert.equal(earned.access.condition.satisfied, true);
  assert.deepEqual(loaded.save, save);
});

test("AND/OR groups retain their alternatives and malformed rules cannot unlock", () => {
  const evidence = { facts: ["archive-found"], counters: { victories: 4, fragments: 3 } };
  const archive = { kind: "fact", factId: "archive-found", label: "Archive découverte" };
  const victories = { kind: "counter", counterId: "victories", minimum: 5, label: "Cinq victoires" };
  const fragments = { kind: "counter", counterId: "fragments", minimum: 3, label: "Trois fragments" };
  const rule = { kind: "all", label: "Archive ET (victoires OU fragments)", conditions: [archive, { kind: "any", label: "Une des deux voies", conditions: [victories, fragments] }] };
  const result = access.evaluatePitUnlockConditionV1(rule, evidence);
  assert.equal(result.satisfied, true);
  assert.equal(result.children[1].kind, "any");
  assert.equal(result.children[1].children[0].satisfied, false);
  assert.equal(result.children[1].children[1].satisfied, true);
  assert.equal(access.evaluatePitUnlockConditionV1(rule, { ...evidence, facts: [] }).satisfied, false);
  assert.equal(access.evaluatePitUnlockConditionV1({ kind: "all", label: "Vide", conditions: [] }, evidence).valid, false);
  assert.equal(access.evaluatePitUnlockConditionV1({ ...victories, minimum: 0 }, evidence).valid, false);
  const cycle = { kind: "all", label: "Cycle", conditions: [] };
  cycle.conditions.push(cycle);
  assert.equal(access.evaluatePitUnlockConditionV1(cycle, evidence).valid, false);
});

test("conditions do not fabricate a grant; only an explicit claim policy produces claimable", () => {
  const definition = rewardDefinition();
  const evidence = { ...empty(), counters: { "arcade:jungle-hunter:encounters": 8 } };
  const automatic = access.resolvePitContentAccessV1(definition, evidence, READY);
  assert.equal(automatic.condition.satisfied, true);
  assert.equal(automatic.right, "locked");
  assert.equal(automatic.canSelect, false);
  const manual = access.resolvePitContentAccessV1({ ...definition, access: { ...definition.access, claimRequired: true } }, evidence, READY);
  assert.equal(manual.right, "claimable");
  assert.equal(manual.nextAction, "claim");
  assert.equal(manual.canSelect, false);
  assert.deepEqual(evidence.permanentIds, []);
});

test("ownership, installation and composition remain distinct without losing permanent rights", () => {
  const { save } = playArcade();
  const evidence = access.buildPitContentEvidenceV1(save, OWNER);
  const installed = access.resolvePitContentAccessV1(rewardDefinition(), evidence, READY);
  const missing = access.resolvePitContentAccessV1(rewardDefinition(), evidence, { ...READY, installation: "missing" });
  assert.equal(installed.canSelect, true);
  assert.equal(missing.right, "permanent");
  assert.equal(missing.discovery, "identified");
  assert.equal(missing.canSelect, false);
  assert.equal(missing.nextAction, "install");
  assert.match(missing.statusLabel, /Acquis.*installation/);
  const incompatible = access.resolvePitContentAccessV1(rewardDefinition(), evidence, { ...READY, compatibility: "incompatible", compatibilityReason: "Combattant déjà choisi" });
  assert.equal(incompatible.right, "permanent");
  assert.equal(incompatible.canSelect, false);
  assert.equal(incompatible.nextAction, "choose-compatible");
  assert.deepEqual(incompatible.reasons, ["Combattant déjà choisi"]);
  const catalog = access.buildPitRewardSlotsV1(save, OWNER, { [rewardId]: { ...READY, installation: "unavailable" } });
  assert.equal(catalog.earnedCount, 1);
  assert.equal(catalog.entries.find(entry => entry.honor.id === rewardId).access.canSelect, false);
  assert.deepEqual(save.unlockedCosmeticIds, [rewardId]);
});

test("secret names, rule trees and detailed reason text do not leak through accessible presentation", () => {
  const definition = rewardDefinition({
    id: "secret-slot", label: "IDENTITE_SECRETE",
    discovery: { initial: "secret", secretLabel: "Combattant non révélé", hintedLabel: "Trace inconnue", hintedWhen: { kind: "fact", factId: "trace", label: "Trace trouvée" } },
    access: { kind: "reward", grantId: "secret-grant", condition: { kind: "fact", factId: "IDENTITE_SECRETE", label: "Vaincre IDENTITE_SECRETE" } },
  });
  const ready = { ...READY, installation: "missing", installationReason: "Texture IDENTITE_SECRETE manquante", compatibility: "incompatible", compatibilityReason: "IDENTITE_SECRETE déjà choisi" };
  const secret = access.resolvePitContentAccessV1(definition, empty(), ready);
  assert.equal(secret.visual, "neutral-emblem");
  assert.equal(secret.canPreview, false);
  assert.equal(secret.condition, null);
  assert.equal(JSON.stringify(secret).includes("IDENTITE_SECRETE"), false);
  const hinted = access.resolvePitContentAccessV1(definition, { ...empty(), facts: ["trace"] }, READY);
  assert.equal(hinted.discovery, "hinted");
  assert.equal(hinted.label, "Trace inconnue");
  assert.equal(hinted.visual, "silhouette");
  assert.equal(hinted.canInspect, true);
  assert.equal(hinted.canSelect, false);
});

test("an expired or unavailable external source cannot remove a permanent reward or invent active access", () => {
  const definition = rewardDefinition();
  definition.access.externalBenefitId = "future-benefit";
  const acquired = access.buildPitContentEvidenceV1(playArcade().save, OWNER);
  for (const externalCheck of ["expired", "revoked", "pending", "unavailable", "not-configured"]) {
    const result = access.resolvePitContentAccessV1(definition, acquired, { ...READY, externalCheck });
    assert.equal(result.right, "permanent");
    assert.equal(result.canSelect, true);
  }
  const pending = access.resolvePitContentAccessV1(definition, empty(), { ...READY, externalCheck: "pending" });
  const unavailable = access.resolvePitContentAccessV1(definition, empty(), { ...READY, externalCheck: "unavailable" });
  const expired = access.resolvePitContentAccessV1(definition, empty(), { ...READY, externalCheck: "expired" });
  assert.equal(pending.right, "verification-pending");
  assert.equal(unavailable.right, "verification-unavailable");
  assert.notEqual(unavailable.statusLabel, expired.statusLabel);
  const forgedActive = access.resolvePitContentAccessV1(definition, { ...empty(), subscriber: true }, { ...READY, externalCheck: "active" });
  assert.equal(forgedActive.canSelect, false);
});

test("wrong owners and forged local rewards cannot confer content access", () => {
  const save = playArcade().save;
  const alienOwner = "2026-11-27T06:01:00.000Z";
  assert.equal(access.buildPitContentEvidenceV1(save, alienOwner).status, "owner-conflict");
  assert.deepEqual(access.buildPitRewardSlotsV1(save, alienOwner).entries, []);
  const forged = saves.createPitSave(OWNER);
  forged.unlockedCosmeticIds.push(rewardId);
  assert.equal(access.buildPitContentEvidenceV1(forged, OWNER).status, "invalid");
  assert.deepEqual(access.buildPitRewardSlotsV1(forged, OWNER).entries, []);
  assert.equal(access.buildPitContentEvidenceV1({ ...save, subscriber: true }, OWNER).status, "invalid");
  assert.equal(access.buildPitContentEvidenceV1(null, "not-an-owner").status, "invalid");
});

test("unknown cosmetic strings keep the existing honors display behavior without mutation or new rights", () => {
  const save = playArcade().save;
  save.unlockedCosmeticIds.push("unknown-future-distinction");
  const before = JSON.stringify(save);
  const evidence = access.buildPitContentEvidenceV1(save, OWNER);
  const catalog = access.buildPitRewardSlotsV1(save, OWNER);
  assert.equal(evidence.status, "ready");
  assert.deepEqual(evidence.permanentIds, [rewardId]);
  assert.equal(catalog.earnedCount, 1);
  assert.equal(catalog.entries.some(entry => entry.honor.id === "unknown-future-distinction"), false);
  assert.equal(JSON.stringify(save), before);
});

test("eligible random choices and fallback exclude locks, missing resources and incompatible slots", () => {
  const acquired = access.buildPitContentEvidenceV1(playArcade().save, OWNER);
  const permanent = access.resolvePitContentAccessV1(rewardDefinition(), acquired, READY);
  const base = access.resolvePitContentAccessV1(rewardDefinition({ id: "base", access: { kind: "included" } }), empty(), READY);
  const locked = access.resolvePitContentAccessV1(rewardDefinition({ id: "locked" }), empty(), READY);
  const missing = access.resolvePitContentAccessV1(rewardDefinition({ id: "missing" }), acquired, { ...READY, installation: "missing" });
  const duplicate = access.resolvePitContentAccessV1(rewardDefinition({ id: "duplicate" }), acquired, { ...READY, compatibility: "incompatible" });
  const states = [base, permanent, locked, missing, duplicate, base];
  assert.deepEqual(access.selectablePitContentIdsV1(states), ["base", rewardId]);
  assert.deepEqual(access.resolvePitContentFallbackV1("locked", "base", states), { preferredId: "locked", selectedId: "base", substituted: true });
  assert.deepEqual(access.resolvePitContentFallbackV1(rewardId, "base", states), { preferredId: rewardId, selectedId: rewardId, substituted: false });
  assert.equal(access.resolvePitContentFallbackV1("locked", "missing", states).selectedId, null);
  assert.equal(locked.canInspect, true);
});

test("existing save migration is the only migration and no access field is persisted", () => {
  const legacy = { ...saves.createPitSave(OWNER), version: 1, runtimeRevision: 1 };
  const migrated = saves.normalizePitSave(legacy);
  assert.ok(migrated);
  const before = saves.serializePitSave(migrated);
  const catalog = access.buildPitRewardSlotsV1(migrated, OWNER);
  assert.equal(catalog.totalCount, 18);
  assert.equal(catalog.earnedCount, 0);
  assert.equal(saves.serializePitSave(migrated), before);
  assert.equal(Object.hasOwn(migrated, "contentAccess"), false);
});
