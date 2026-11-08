import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
const cradle = qa.load('app/game/systems/buriedCradle.ts');
const saves = qa.load('app/game/save.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const OWNER = '2026-11-08T12:00:00.000Z';
const SHIP = 'classic-predator-spaceship';
const context = { personalShipId: SHIP, ownedShipIds: [SHIP] };
function store(entries = []) {
  const data = new Map(entries), key = saves.SAVE_STORAGE_KEY;
  return { data, full: false, failReadback: false, pendingReadback: false, writes: 0,
    get length() { return data.size; }, key(i) { return [...data.keys()][i] ?? null; },
    getItem(name) { if (name === key && this.pendingReadback) { this.pendingReadback = false; throw Error('Uncertain readback'); } return data.get(name) ?? null; },
    setItem(name, raw) { if (this.full) throw Error('Quota'); this.writes++; data.set(name, raw); if (name === key && this.failReadback) { this.failReadback = false; this.pendingReadback = true; } },
    removeItem(name) { data.delete(name); },
  };
}
const fresh = (difficultyId = 'hunter') => {
  const save = saves.defaultSave(OWNER);
  save.settings.difficultyId = difficultyId;
  for (const mission of MISSIONS) save.missionProgress[mission.id] = {
    ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1,
  };
  return save;
};
function act(save, type, extra = {}) {
  const before = JSON.stringify(save);
  const result = campaign.actBuriedCradleCampaign(save, { type, ...extra }, context);
  assert.equal(result.accepted, true, `${type}: ${result.message}`);
  assert.equal(JSON.stringify(save), before, 'campaign input is immutable');
  return { ...save, buriedCradle: result.state, prologue: result.prologue };
}
const active = (difficulty = 'hunter') => act(act(fresh(difficulty), 'prepare'), 'depart');
function completedProgress(crownClaimed = false) {
  return { ...cradle.createBuriedCradleProgress(), visitedRoomIds: [...cradle.CRADLE_ROOM_IDS],
    rootRingCut: true, bossDefeated: true, crownClaimed };
}

test('old campaigns are unchanged and have no automatic queen or companion records', () => {
  const save = saves.defaultSave(OWNER);
  assert.equal(Object.hasOwn(saves.normalizeSave(save), 'buriedCradle'), false);
  assert.equal(Object.hasOwn(saves.normalizeSave(save), 'companionResidence'), false);
  assert.equal(campaign.inspectBuriedCradleCampaign(undefined, OWNER).status, 'absent');
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'prepare' }, context).accepted, false);
  assert.equal(campaign.CRADLE_CAMPAIGN_SOURCE.zoneId, 'XP-Z12');
  assert.equal(campaign.CRADLE_CAMPAIGN_SOURCE.entryZoneId, 'XP-Z11');
});

test('all eight hunts, the Blooded rite and an owned hull gate departure independently', () => {
  const save = fresh();
  assert(campaign.evaluateBuriedCradleAccess(save, SHIP, [SHIP]).allowed);
  assert.equal(campaign.evaluateBuriedCradleAccess(save, SHIP, []).allowed, false);
  for (const mission of MISSIONS) {
    const incomplete = structuredClone(save); incomplete.missionProgress[mission.id].status = 'available';
    assert.equal(campaign.evaluateBuriedCradleAccess(incomplete, SHIP, [SHIP]).allowed, false);
  }
  save.prologue = { status: 'completed', chronicle: chronicle.createClanChronicle() };
  save.profile.honor = 999999; save.profile.rankId = 'elder';
  assert.equal(campaign.evaluateBuriedCradleAccess(save, SHIP, [SHIP]).allowed, false);
  save.prologue.chronicle = { version: 1, evidence: chronicle.CHRONICLE_EVIDENCE.map(({ id, sourceId }) => ({ id, sourceId })),
    rites: chronicle.CHRONICLE_RITES.slice(0, 3).map(({ id, sourceId }) => ({ id, sourceId })), legacyRecognition: null };
  assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), 'blooded');
  assert(campaign.evaluateBuriedCradleAccess(save, SHIP, [SHIP]).allowed, 'Elite is never a prerequisite');
});

test('docking and another destination prevent prepare/depart and cannot be overwritten', () => {
  for (const patch of [{ clanShipDocking: { status: 'aboard' } }, { planetArrival: { status: 'complete' } },
    { wolfCastle: { status: 'present' } }]) {
    const save = { ...fresh(), ...patch }, before = JSON.stringify(save);
    assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'prepare' }, context).accepted, false);
    assert.equal(JSON.stringify(save), before);
  }
  const prepared = act(fresh(), 'prepare');
  assert.equal(campaign.actBuriedCradleCampaign(prepared, { type: 'depart' }, {
    personalShipId: 'wolf-ship', ownedShipIds: ['wolf-ship'],
  }).accepted, false);
});

test('retreat, victory and manual crown retrieval have distinct, idempotent debriefs', () => {
  for (const [progress, outcome, delivered] of [
    [cradle.createBuriedCradleProgress(), 'retreated', false],
    [completedProgress(), 'victory-without-crown', false],
    [completedProgress(true), 'crown-returned', true],
  ]) {
    let save = active();
    const profile = structuredClone(save.profile), trophies = structuredClone(save.trophies);
    save = act(save, 'extract', { progress });
    assert.equal(save.buriedCradle.outcome, outcome);
    assert.equal(save.buriedCradle.crownDelivered, false, 'extraction alone is not the debrief');
    save = act(save, 'report');
    assert.equal(save.buriedCradle.crownDelivered, delivered);
    assert.deepEqual(save.profile, profile); assert.deepEqual(save.trophies, trophies);
    const again = campaign.actBuriedCradleCampaign(save, { type: 'report' }, context);
    assert.equal(again.accepted, true); assert.equal(again.changed, false);
    assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'depart' }, context).accepted, !delivered);
  }
});

test('queen proof records no automatic Elite rite and no duplicate trophy economy', () => {
  const save = fresh();
  save.prologue = { status: 'completed', chronicle: { version: 1,
    evidence: chronicle.CHRONICLE_EVIDENCE.filter(item => !['first-queen-hunt', 'queen-mission-briefing'].includes(item.id)).map(({ id, sourceId }) => ({ id, sourceId })),
    rites: chronicle.CHRONICLE_RITES.slice(0, 3).map(({ id, sourceId }) => ({ id, sourceId })), legacyRecognition: null } };
  let next = act(act(save, 'prepare'), 'depart');
  assert(next.prologue.chronicle.evidence.some(item => item.id === 'queen-mission-briefing'));
  next = act(act(next, 'extract', { progress: completedProgress(true) }), 'report');
  assert.equal(next.prologue.chronicle.evidence.filter(item => item.id === 'first-queen-hunt').length, 1);
  assert.equal(chronicle.getChronicleRank(next.prologue.chronicle), 'blooded');
  assert.deepEqual(next.prologue.chronicle.rites, save.prologue.chronicle.rites);
  assert.deepEqual(next.profile, save.profile);
});

test('checkpoint budgets are fixed at departure and reject an imported extra beacon', () => {
  assert.deepEqual(campaign.CRADLE_CHECKPOINT_BUDGET, { 'young-blood': 2, hunter: 1, elite: 0, elder: 0 });
  for (const [difficulty, budget] of Object.entries(campaign.CRADLE_CHECKPOINT_BUDGET)) {
    let save = active(difficulty);
    const progress = { ...completedProgress(), bossDefeated: false, checkpointId: '11' };
    assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress }, context).accepted, budget === 2);
    progress.checkpointId = '07';
    assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress }, context).accepted, budget >= 1);
    save.settings.difficultyId = 'young-blood';
    assert.equal(save.buriedCradle.difficultyId, difficulty, 'later settings do not grant more beacons');
  }
});

test('checkpoint progress is monotonic and suspension requires a departure before new field writes', () => {
  let save = active();
  save = act(save, 'checkpoint', { progress: { ...cradle.createBuriedCradleProgress(), visitedRoomIds: ['01', '02'] } });
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress: cradle.createBuriedCradleProgress() }, context).accepted, false);
  save = act(save, 'suspend');
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'extract', progress: save.buriedCradle.progress }, context).accepted, false);
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'report' }, context).accepted, false);
  save = act(save, 'depart'); assert.equal(save.buriedCradle.status, 'active');
  assert.deepEqual(save.buriedCradle.progress.visitedRoomIds, ['01', '02']);
});

test('future, foreign, inconsistent and unknown records are rejected without destructive normalization', () => {
  const save = active();
  const variants = [
    [{ ...save.buriedCradle, version: 2 }, 'future-version'],
    [{ ...save.buriedCradle, progress: { ...save.buriedCradle.progress, version: 2 } }, 'future-version'],
    [{ ...save.buriedCradle, ownerCreatedAt: '2026-11-08T13:00:00.000Z' }, 'invalid-save'],
    [{ ...save.buriedCradle, crownDelivered: true }, 'invalid-save'],
    [{ ...save.buriedCradle, status: 'reported' }, 'invalid-save'],
    [{ ...save.buriedCradle, extra: 'preserve unknown data' }, 'invalid-save'],
    [{ ...save.buriedCradle, status: ['active'] }, 'invalid-save'],
  ];
  for (const [value, failure] of variants) {
    const serialized = JSON.stringify({ ...save, buriedCradle: value });
    const parsed = saves.parseSaveImport(serialized);
    assert.equal(parsed.failure, failure); assert.equal(parsed.save, null);
    assert.equal(JSON.stringify({ ...save, buriedCradle: value }), serialized);
  }
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'promote' }, context).accepted, false);
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'report', reward: 999 }, context).accepted, false);
});

test('save import preserves a valid expedition, rejects premature proof and concurrent travel', () => {
  const save = active();
  const parsed = saves.parseSaveImport(JSON.stringify(save));
  assert.equal(parsed.failure, null); assert.deepEqual(parsed.save.buriedCradle, save.buriedCradle);
  const premature = structuredClone(save); premature.missionProgress[MISSIONS[0].id].status = 'available';
  assert.equal(saves.parseSaveImport(JSON.stringify(premature)).failure, 'invalid-save');
  const docking = qa.load('app/game/systems/clanShipDocking.ts');
  const berth = docking.normalizeClanShipDocking(undefined, OWNER, SHIP);
  assert(berth);
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, clanShipDocking: { ...berth, status: 'approach' } })).failure, 'invalid-save');
});

test('quota refusal and uncertain acknowledgement preserve the exact crown receipt without rewarding twice', () => {
  const key = saves.SAVE_STORAGE_KEY, storage = store();
  const original = fresh(); assert(saves.writeSaveWithStatus(original, storage, key).persisted);
  const reported = act(act(active(), 'extract', { progress: completedProgress(true) }), 'report');
  const before = [...storage.data]; storage.full = true;
  assert.equal(saves.writeSaveWithStatus(reported, storage, key).persisted, false);
  assert.deepEqual([...storage.data], before);
  storage.full = false; storage.failReadback = true;
  const pending = saves.writeSaveWithStatus(reported, storage, key);
  assert.equal(pending.persisted, false);
  const afterWrite = [...storage.data], count = storage.writes;
  const recovered = saves.reconcileSaveWrite(pending, OWNER, storage, key);
  assert.equal(recovered.status, 'confirmed', recovered.failure);
  assert.equal(storage.writes, count); assert.deepEqual([...storage.data], afterWrite);
  assert.deepEqual(recovered.save.buriedCradle, reported.buriedCradle);
  assert.equal(campaign.actBuriedCradleCampaign(recovered.save, { type: 'report' }, context).changed, false);
});

test('portable, complete and account archives retain world changes and protect future campaign bytes', () => {
  const key = saves.SAVE_STORAGE_KEY, storage = store();
  const save = act(active('young-blood'), 'checkpoint', { progress: { ...completedProgress(true),
    checkpointId: '11', drainageOpened: true, shortcutIds: ['perch-forest', 'fault-river', 'roots-fault'] } });
  assert(saves.writeSaveWithStatus(save, storage, key).persisted);
  const progression = qa.load('app/game/systems/progression.ts');
  storage.setItem(progression.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(progression.createDefaultShipProgression(save, OWNER)));
  const archive = qa.load('app/game/systems/completeArchive.ts');
  const cloud = qa.load('app/game/systems/cloudArchiveV71.ts');
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(save)).save.buriedCradle, save.buriedCradle);
  const complete = archive.createCompleteArchive(saves.loadSaveWithStatus(storage, key).save, storage, OWNER);
  const parsed = archive.parseCompleteArchive(complete.serialized);
  assert(parsed.archive, parsed.failure); assert.deepEqual(parsed.archive.campaign.buriedCradle, save.buriedCradle);
  const snapshot = cloud.captureCloudArchiveV71(storage, OWNER);
  const importedCloud = cloud.parseCloudArchiveV71(JSON.stringify(snapshot));
  assert(importedCloud.archive, importedCloud.error);
  assert.deepEqual(JSON.parse(importedCloud.archive.entries.find(entry => entry.key === key).raw).buriedCradle, save.buriedCradle);
  const future = structuredClone(save); future.buriedCradle.version = 2;
  const protectedStore = store([[key, JSON.stringify(future)], [key + '.backup', JSON.stringify(save)]]), before = [...protectedStore.data];
  assert.equal(saves.loadSaveWithStatus(protectedStore, key).failure, 'future-version');
  assert.equal(saves.writeSaveWithStatus(save, protectedStore, key).failure, 'protected-save');
  assert.deepEqual([...protectedStore.data], before);
});

test('physical emergency extraction leaves queen and crown untouched in each refuge', () => {
  for (const roomId of ['01', '11', '12']) {
    const run = cradle.createBuriedCradleRun(); run.roomId = roomId;
    run.player.x = 192 - run.player.width / 2; run.player.y = 624 - run.player.height;
    const result = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60);
    assert.equal(result.run.extracted, true); assert.equal(result.run.progress.bossDefeated, false);
    assert.equal(result.run.progress.crownClaimed, false);
    assert(result.events.some(event => event.type === 'extracted' && event.id === 'emergency'));
  }
});

test('Continue and manual campaign slots retain exact active and suspended Cradle runs', async () => {
  const slots = qa.load('app/game/systems/campaignSlots.ts');
  const progression = qa.load('app/game/systems/progression.ts');
  const snapshots = qa.load('app/game/systems/buriedCradleSnapshot.ts');
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true,
    value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try {
    for (const status of ['active', 'suspended']) {
      let save = active(), run = cradle.createBuriedCradleRun(save.buriedCradle.progress, 1);
      for (let frame = 0; frame < 33; frame++) run = cradle.stepBuriedCradle(run, { move: 1, jumpPressed: frame === 16, jumpHeld: true }, 1 / 60).run;
      save = act(save, 'checkpoint', { progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
      if (status === 'suspended') save = act(save, 'suspend');
      const storage = store();
      assert(saves.writeSaveWithStatus(save, storage).persisted);
      storage.setItem(progression.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(progression.createDefaultShipProgression(save, OWNER)));
      const document = () => JSON.parse(storage.getItem(slots.campaignSlotStorageKey(1)));
      const migrated = await slots.migrateLegacyCampaignSlot(storage);
      assert(migrated.ok, migrated.message);
      const manual = await slots.saveCampaignCheckpoint(1, { kind: 'manual', index: 1, expectedRevision: document().revision, location: 'deck' }, storage);
      assert(manual.ok, manual.message); assert.equal(manual.checkpoint.resumeLocation, 'buried-cradle');
      const continued = await slots.continueCampaignSlot(1, { expectedRevision: document().revision, location: 'deck' }, storage);
      assert(continued.ok, continued.message); assert.equal(continued.checkpoint.resumeLocation, 'buried-cradle');
      assert.deepEqual(continued.save.buriedCradle, save.buriedCradle);
      const restored = await slots.activateCampaignCheckpoint(1, 'manual-1', { expectedRevision: document().revision }, storage);
      assert(restored.ok, restored.message); assert.deepEqual(restored.save.buriedCradle.snapshot.run, run);
      run.player.x = 156; run.player.y = 508; run.player.velocityX = 0; run.player.velocityY = 0; run.player.grounded = true;
      if (status === 'suspended') save = act(save, 'depart');
      run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
      save = act(save, 'extract', { progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
      assert(saves.writeSaveWithStatus(save, storage).persisted);
      const returned = await slots.continueCampaignSlot(1, { expectedRevision: document().revision, location: 'buried-cradle' }, storage);
      assert(returned.ok, returned.message); assert.equal(returned.checkpoint.resumeLocation, 'deck');
    }
  } finally {
    if (priorNavigator) Object.defineProperty(globalThis, 'navigator', priorNavigator); else delete globalThis.navigator;
  }
});

test('complete Cradle archives reject a different owned hull and a simultaneous hunt sidecar', () => {
  const save = active(), storage = store(), archive = qa.load('app/game/systems/completeArchive.ts');
  const progression = qa.load('app/game/systems/progression.ts');
  const hunts = qa.load('app/game/systems/activeHuntSave.ts');
  const { captureHuntGauntletV142 } = qa.load('app/game/systems/huntGauntletIdentityV142.ts');
  const { normalizeHuntAccessibilityV112 } = qa.load('app/game/systems/huntAccessibilityV112.ts');
  assert(saves.writeSaveWithStatus(save, storage).persisted);
  const fleet = progression.createDefaultShipProgression(save, OWNER);
  storage.setItem(progression.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(fleet));
  const complete = archive.createCompleteArchive(saves.loadSaveWithStatus(storage).save, storage, OWNER).archive;
  const wrongHull = structuredClone(complete);
  wrongHull.attachments.shipProgression = progression.normalizeShipProgression({ ...fleet,
    selectedShipId: 'wolf-ship', unlockedShipIds: [...new Set([...fleet.unlockedShipIds, 'wolf-ship'])] }, save, OWNER);
  assert(progression.validateCanonicalShipProgression(wrongHull.attachments.shipProgression, save));
  assert.equal(archive.parseCompleteArchive(JSON.stringify(wrongHull)).failure, 'invalid-sidecar');
  complete.attachments.activeHunt = { version: hunts.ACTIVE_HUNT_SAVE_VERSION, runtimeRevision: hunts.ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: OWNER, missionId: 'jungle-vey', difficultyId: save.settings.difficultyId,
    encounterRun: save.missionProgress['jungle-vey'].attempts, runId: 'existing-hunt', sequence: 1, startedAt: OWNER, savedAt: OWNER,
    configuration: { inventory: save.inventory, loadout: save.loadout, appearance: save.appearance,
      gauntletVariantId: captureHuntGauntletV142(undefined, save.profile.rankId, save.gauntletV134?.claimedStudies ?? []),
      visualOptions: { screenShake: save.settings.screenShake, reducedGore: save.settings.reducedGore,
        highContrastVision: save.settings.highContrastVision, huntAccessibility: normalizeHuntAccessibilityV112(save.settings.huntAccessibility) }, elapsedSeconds: 0 },
    snapshot: { elapsed: 0 }, retryCheckpoint: null };
  assert(hunts.normalizeActiveHuntSave(complete.attachments.activeHunt, hunts.ACTIVE_HUNT_RUNTIME_REVISION));
  assert.equal(archive.parseCompleteArchive(JSON.stringify(complete)).failure, 'incompatible-hunt');
});

test('returning by the root shortcut never demotes beacon eleven or blocks its acknowledged save', () => {
  let save = active('young-blood');
  const progress = { ...completedProgress(), checkpointId: '11', bossDefeated: false, shortcutIds: ['roots-fault'] };
  save = act(save, 'checkpoint', { progress });
  let run = cradle.createBuriedCradleRun(progress, 2);
  const shortcut = cradle.BURIED_CRADLE_DOORS.find(door => door.shortcutId === 'roots-fault');
  run.roomId = shortcut.a.roomId;
  run.player.x = shortcut.a.feet.x - 36; run.player.y = shortcut.a.feet.y - 116;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
  assert.equal(run.roomId, '07'); assert.equal(run.progress.checkpointId, '11');
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress: run.progress }, context).accepted, true);
});

test('head base and damaging breath share the measured source anchor', () => {
  const head = cradle.CRADLE_BOSS_HEAD;
  assert(Math.abs(head.y + head.height * 789 / 941 - 624) < 0.001);
  const boss = cradle.createBuriedCradleRun().boss; boss.attack = 'breath';
  const [area] = cradle.getCradleBossAttackRects(boss);
  assert(Math.abs(area.x + area.width - cradle.CRADLE_BOSS_MOUTH.x) < 0.001);
  assert(area.y <= cradle.CRADLE_BOSS_MOUTH.y && area.y + area.height >= cradle.CRADLE_BOSS_MOUTH.y);
});

test('all 156 runtime images equal their source SHA256 and all twelve layouts resolve', () => {
  const art = JSON.parse(fs.readFileSync('app/game/data/buriedCradleArt.json', 'utf8'));
  assert.equal(Object.keys(art.assets).length, 156); assert.equal(art.scenes.length, 12);
  for (const asset of Object.values(art.assets)) {
    const bytes = fs.readFileSync(`public${asset.src}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.id);
  }
  for (const scene of art.scenes) {
    assert(art.assets[scene.background]);
    for (const item of scene.scenery) { assert(art.assets[item.id]); if (item.after) assert(art.assets[item.after]); }
  }
});

test('production renderer exposes real controls and hides the Matriarch outside room twelve', () => {
  const save = fresh();
  const html = qa.render('app/game/BuriedCradleScene.tsx', { progress: cradle.createBuriedCradleProgress(),
    appearance: save.appearance, loadout: save.loadout, onCheckpoint: () => true, onExtract: () => true, onExit: () => true });
  assert.match(html, /data-buried-cradle/); assert.match(html, /data-room="01"/);
  assert.match(html, /data-cradle-control="jump"/); assert.match(html, /data-cradle-control="interact"/);
  assert.doesNotMatch(html, /059_matriarche_intacte\.png/);
  assert.match(html, /Repli/); assert.match(html, /Vers 02/);
});
