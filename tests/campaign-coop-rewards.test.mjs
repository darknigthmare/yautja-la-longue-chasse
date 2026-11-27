import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const output = await build({
  stdin: {
    contents: 'export * from "./app/game/save"; export { MISSION_BY_ID } from "./app/game/data";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const {
  applyMissionResult, defaultSave, exportSave, loadSaveWithStatus, parseSaveImport, createCampaignCoopGuestRewardRestorer,
  SAVE_STORAGE_KEY, writeSaveWithStatus, MISSION_BY_ID,
} = await import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));

const hostOwner = "2026-11-24T10:00:00.000Z";
const guestOwner = "2026-11-24T11:00:00.000Z";
const otherOwner = "2026-11-24T12:00:00.000Z";
const startedAt = "2026-11-25T10:00:00.000Z";
const completedAt = "2026-11-25T10:20:00.000Z";
const mission = MISSION_BY_ID["jungle-vey"];
const prefix = `${mission.id}:0:`;
const specimen = {
  id: prefix + "jungle-scout:bone", sourceId: prefix + "jungle-scout",
  speciesId: "oseris-iv--jungle-xeno-scout", partId: "bone",
  label: "Segment caudal de xénomorphe", quality: 80, massKg: 1.2, volumeUnits: 2, stage: "raw",
};
const toolUse = prefix + "harvest-bone:jungle-scout";

function memoryStorage() {
  const data = new Map();
  return {
    refuseWrite: false,
    refuseReadback: false,
    loseReadback: false,
    getItem(key) {
      if (key === SAVE_STORAGE_KEY && this.loseReadback) {
        this.loseReadback = false;
        throw Error("interrupted readback");
      }
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      if (key === SAVE_STORAGE_KEY && this.refuseWrite) throw Error("full");
      data.set(key, value);
      if (key === SAVE_STORAGE_KEY && this.refuseReadback) this.loseReadback = true;
    },
    removeItem(key) { data.delete(key); },
  };
}
function guest(owner = guestOwner, honor = 0) {
  const storage = memoryStorage();
  const save = defaultSave(owner);
  const started = writeSaveWithStatus({ ...save, profile: { ...save.profile, honor } }, storage);
  assert.equal(started.persisted, true);
  return { save: started.save, storage };
}
function hostHunt() {
  const before = defaultSave(hostOwner);
  before.inventory.fieldToolIds = ["flaying-tool"];
  const result = {
    missionId: mission.id, difficultyId: "hunter", outcome: "success", completedAt,
    score: 82, elapsedSeconds: 1200, kills: 4, scans: 3, secondWindUsed: false,
    completedObjectiveIds: mission.objectives.map(objective => objective.id),
    trophyQuality: "elite",
    trophyClaims: [{
      id: "apex-claim", definitionId: mission.trophy.id, targetName: mission.targetName,
      targetKind: mission.targetKind, partId: mission.trophy.partId, condition: "pristine", quality: "elite",
    }],
    honorEvents: [
      { id: "host-strike", label: "Chasse", kind: "honorable-kill", value: 20 },
      { id: "guest-strike", label: "Chasse", kind: "honorable-kill", value: 40 },
      { id: "guest-violation", label: "Écart de conduite", kind: "violation", value: -10 },
      { id: "other-assist", label: "Défense", kind: "honorable-kill", value: 12 },
    ],
    specimensV112: [specimen], toolUseIdsV112: [toolUse], harvestEncounterRunV112: 0,
  };
  const projected = applyMissionResult(before, result);
  assert.equal(projected.missionProgress[mission.id].completions, 1);
  assert.equal(projected.trophies.length, 1);
  assert.equal(projected.inventory.harvestV112.specimens.length, 1);
  // The test authority confirms the host's progress and routes each physical item once.
  const hostShare = applyMissionResult(before, {
    ...result, honorEvents: [result.honorEvents[0]], specimensV112: [],
  });
  const hostBeforeWrite = { ...hostShare, trophies: [] };
  const hostStorage = memoryStorage();
  const written = writeSaveWithStatus(hostBeforeWrite, hostStorage);
  assert.equal(written.persisted, true);
  const lease = {
    version: 1, runtimeRevision: 1, ownerSaveCreatedAt: hostOwner, missionId: mission.id,
    difficultyId: result.difficultyId, encounterRun: 0, runId: "host-session-run", sequence: 8,
    startedAt, savedAt: completedAt, configuration: {}, snapshot: {}, retryCheckpoint: null,
  };
  const participants = [
    { ownerCreatedAt: hostOwner, honorEventIds: ["host-strike"], trophyClaimIds: [], specimenIds: [] },
    { ownerCreatedAt: guestOwner, honorEventIds: ["guest-strike", "guest-violation"], trophyClaimIds: ["apex-claim"], specimenIds: [specimen.id] },
    { ownerCreatedAt: otherOwner, honorEventIds: ["other-assist"], trophyClaimIds: [], specimenIds: [] },
  ];
  return { before, committed: written.save, lease, result, participants, finalBlowOwnerCreatedAt: guestOwner };
}

function restoreCampaignCoopGuestReward(save, hunt, storage) {
  const restore = createCampaignCoopGuestRewardRestorer(reference => reference === "confirmed" ? hunt : null);
  return restore(save, "confirmed", storage);
}

test("seule une référence résolue par l'autorité peut atteindre le règlement", () => {
  const a = guest();
  const hunt = hostHunt();
  const seen = [];
  const restore = createCampaignCoopGuestRewardRestorer((reference, owner) => {
    seen.push([reference, owner]);
    return reference === "confirmed" && owner === guestOwner ? hunt : null;
  });
  const before = a.storage.getItem(SAVE_STORAGE_KEY);
  assert.equal(restore(a.save, hunt, a.storage).persisted, false);
  assert.equal(restore(a.save, "unconfirmed", a.storage).persisted, false);
  assert.deepEqual(seen, [["unconfirmed", guestOwner]]);
  assert.equal(a.storage.getItem(SAVE_STORAGE_KEY), before);
  assert.equal(restore(a.save, "confirmed", a.storage).persisted, true);
});

test("deux invités identifiés reçoivent seulement leurs gains, l'hôte conserve la progression", () => {
  const hunt = hostHunt();
  const a = guest();
  const b = guest(otherOwner);
  const aWrite = restoreCampaignCoopGuestReward(a.save, hunt, a.storage);
  const bWrite = restoreCampaignCoopGuestReward(b.save, hunt, b.storage);
  assert.equal(aWrite.persisted, true, aWrite.failure);
  assert.equal(bWrite.persisted, true, bWrite.failure);
  assert.equal(aWrite.save.profile.honor, 30);
  assert.equal(bWrite.save.profile.honor, 12);
  assert.equal(aWrite.save.trophies[0].definitionId, mission.trophy.id);
  assert.equal(aWrite.save.inventory.harvestV112.specimens[0].partId, "bone");
  assert.equal(aWrite.save.inventory.harvestV112.toolCondition, a.save.inventory.harvestV112.toolCondition);
  assert.deepEqual(aWrite.save.inventory.harvestV112.settledEncounterRuns, a.save.inventory.harvestV112.settledEncounterRuns);
  assert.deepEqual(bWrite.save.trophies, []);
  assert.deepEqual(bWrite.save.inventory.harvestV112.specimens, []);
  for (const key of ["missionProgress", "storyCompleted", "prologue", "statistics", "codex", "exploration", "loadout"]) {
    assert.deepEqual(aWrite.save[key], a.save[key]);
  }
  assert.equal(aWrite.save.profile.clanMarks, a.save.profile.clanMarks);
  assert.equal(hunt.committed.missionProgress[mission.id].status, "completed");
  assert.equal(hunt.committed.trophies.length, 0);
});

test("l'honneur invité utilisable ne franchit aucun seuil de rang au rechargement ou à l'import", () => {
  const a = guest(guestOwner, 1_499);
  const saved = restoreCampaignCoopGuestReward(a.save, hostHunt(), a.storage);
  assert.equal(saved.persisted, true);
  const loaded = loadSaveWithStatus(a.storage).save;
  assert.equal(loaded.profile.honor, 1_529);
  assert.equal(loaded.profile.rankId, "young-blood");
  assert.equal(loaded.profile.rankId, a.save.profile.rankId);
  assert.equal(loaded.profile.acquiredRankIdV166, a.save.profile.acquiredRankIdV166);
  const imported = parseSaveImport(exportSave(loaded)).save;
  assert.equal(imported.profile.rankId, a.save.profile.rankId);
  assert.equal(imported.trophies[0].id, loaded.trophies[0].id);
  assert.equal(imported.inventory.harvestV112.specimens[0].id, loaded.inventory.harvestV112.specimens[0].id);
});

test("rejeu après rechargement, clé de session remplacée et sauvegarde concurrente périmée sont refusés", () => {
  const a = guest();
  const hunt = hostHunt();
  assert.equal(restoreCampaignCoopGuestReward(a.save, hunt, a.storage).persisted, true);
  const raw = a.storage.getItem(SAVE_STORAGE_KEY);
  const current = loadSaveWithStatus(a.storage).save;
  assert.equal(restoreCampaignCoopGuestReward(current, hunt, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(current, { ...hunt, lease: { ...hunt.lease, runId: "renamed" } }, a.storage).persisted, false);
  assert.equal(writeSaveWithStatus(a.save, a.storage).persisted, false);
  assert.equal(a.storage.getItem(SAVE_STORAGE_KEY), raw);
});

test("invité absent, résultat d'une autre rencontre ou progression hôte absente refusés", () => {
  const hunt = hostHunt();
  const a = guest();
  const outsider = guest("2026-11-24T13:00:00.000Z");
  assert.equal(restoreCampaignCoopGuestReward(outsider.save, hunt, outsider.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, { ...hunt, lease: { ...hunt.lease, ownerSaveCreatedAt: guestOwner } }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, { ...hunt, committed: hunt.before }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, { ...hunt, result: { ...hunt.result, outcome: "failed" } }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, { ...hunt, result: { ...hunt.result, completedObjectiveIds: [] } }, a.storage).persisted, false);
});

test("une prise inconnue, deux attributions ou un hôte gardant déjà la prise sont refusés", () => {
  const hunt = hostHunt();
  const a = guest();
  const [host, member, other] = hunt.participants;
  assert.equal(restoreCampaignCoopGuestReward(a.save, {
    ...hunt, participants: [host, { ...member, specimenIds: ["inventé"] }, other],
  }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, {
    ...hunt, participants: [host, member, { ...other, honorEventIds: ["guest-strike"] }],
  }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, { ...hunt, finalBlowOwnerCreatedAt: hostOwner }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, {
    ...hunt, committed: applyMissionResult(hunt.before, hunt.result),
  }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, {
    ...hunt, committed: { ...hunt.committed, profile: { ...hunt.committed.profile, honor: hunt.committed.profile.honor + 30 } },
  }, a.storage).persisted, false);
  assert.equal(restoreCampaignCoopGuestReward(a.save, {
    ...hunt, result: { ...hunt.result, toolUseIdsV112: [] },
  }, a.storage).persisted, false);
});

test("un échec du stockage conserve le dossier et un nouvel essai l'écrit une seule fois", () => {
  const a = guest();
  const hunt = hostHunt();
  const raw = a.storage.getItem(SAVE_STORAGE_KEY);
  a.storage.refuseWrite = true;
  assert.equal(restoreCampaignCoopGuestReward(a.save, hunt, a.storage).failure, "write-failed");
  assert.equal(a.storage.getItem(SAVE_STORAGE_KEY), raw);
  a.storage.refuseWrite = false;
  a.storage.refuseReadback = true;
  assert.equal(restoreCampaignCoopGuestReward(a.save, hunt, a.storage).failure, "write-failed");
  a.storage.refuseReadback = false;
  const recovered = loadSaveWithStatus(a.storage).save;
  assert.equal(recovered.profile.honor, 30);
  assert.equal(restoreCampaignCoopGuestReward(recovered, hunt, a.storage).persisted, false);
});

test("un dossier non enregistré ou un registre protégé ne reçoit rien", () => {
  const hunt = hostHunt();
  const a = guest();
  assert.equal(restoreCampaignCoopGuestReward(defaultSave(guestOwner), hunt, memoryStorage()).persisted, false);
  const corrupt = JSON.stringify({ ...a.save, honorSourcesV169: { version: 99 } });
  a.storage.setItem(SAVE_STORAGE_KEY, corrupt);
  assert.equal(restoreCampaignCoopGuestReward(a.save, hunt, a.storage).persisted, false);
  assert.equal(a.storage.getItem(SAVE_STORAGE_KEY), corrupt);
});
