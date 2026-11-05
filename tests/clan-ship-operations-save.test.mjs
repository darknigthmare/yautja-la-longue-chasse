import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const ops = qa.load('app/game/systems/clanShipOperations.ts');
const saves = qa.load('app/game/save.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const archives = qa.load('app/game/systems/completeArchive.ts');
const slots = qa.load('app/game/systems/campaignSlots.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const OWNER = '2026-11-05T12:00:00.000Z';
const OTHER = '2026-11-05T13:00:00.000Z';
const MAIN = saves.SAVE_STORAGE_KEY;

function storage(values = new Map()) {
  return {
    values, writes: [], quotaKey: null, failReadback: false, pendingReadback: false,
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) {
      if (key === MAIN && this.pendingReadback) { this.pendingReadback = false; throw Error('Uncertain readback'); }
      return values.get(key) ?? null;
    },
    setItem(key, raw) {
      if (this.quotaKey === key) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, raw); this.writes.push(['set', key]);
      if (key === MAIN && this.failReadback) { this.failReadback = false; this.pendingReadback = true; }
    },
    removeItem(key) { values.delete(key); this.writes.push(['remove', key]); },
  };
}
const bytes = store => [...store.values].sort(([a], [b]) => a.localeCompare(b));
function write(save, store) {
  const written = saves.writeSaveWithStatus(save, store, MAIN);
  assert.equal(written.persisted, true, written.failure);
  return written.save;
}
function atRoom(save, roomId) {
  return { ...save, clanShipDocking: { ...save.clanShipDocking, roomId } };
}
function fixture() {
  let save = saves.defaultSave(OWNER);
  save.profile.clanMarks = 25;
  let visit = docking.createClanShipDockingState(OWNER, 'classic-predator-spaceship');
  for (const type of ['approach', 'dock', 'board']) visit = docking.actClanShipDocking(visit, { type },
    { ownerCreatedAt: OWNER, personalShipId: 'classic-predator-spaceship' }).state;
  save = { ...save, clanShipDocking: visit, clanShipOperations: ops.createClanShipOperations(OWNER) };
  return save;
}
function transition(save, type, values = {}, roomId = save.clanShipDocking.roomId) {
  const current = atRoom(save, roomId);
  const state = current.clanShipOperations;
  const result = ops.actClanShipOperations(state, { type, expectedRevision: state.revision, ...values },
    { ownerCreatedAt: OWNER, docking: current.clanShipDocking, campaign: current });
  assert.equal(result.accepted, true, `${type}: ${result.reason} ${result.message}`);
  assert.equal(result.changed, true, type);
  return { save: { ...current, clanShipOperations: result.state,
    profile: { ...current.profile, clanMarks: current.profile.clanMarks + result.clanMarksReward } }, result };
}
function ready() {
  let save = fixture();
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) save = transition(save, 'onboard-step', { stepId: step.id }, step.roomId).save;
  return transition(save, 'accept-mandate', {}, 'conseil').save;
}
function circuit(save, id, count = ops.clanShipContract(id).steps.length) {
  save = transition(save, 'accept-contract', { contractId: id }, 'conseil').save;
  for (const step of ops.clanShipContract(id).steps.slice(0, count)) save = transition(save, 'interior-step', { stepId: step.id }, step.roomId).save;
  return save;
}
const order = (save, type) => transition(save, 'space-command',
  { command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } }, 'conseil').save;
const lastStep = () => ops.clanShipContract('ship-seal-check').steps.at(-1);
const finishCircuit = save => transition(save, 'interior-step', { stepId: lastStep().id }, lastStep().roomId);
function completedEscort(save = ready()) {
  save = transition(save, 'accept-contract', { contractId: 'space-screening' }, 'conseil').save;
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) save = order(save, type);
  return save;
}
async function withLocks(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true,
    value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try { return await run(); }
  finally { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator; }
}
const slotDocument = store => JSON.parse(store.getItem(slots.campaignSlotStorageKey(1)));

test('old campaigns retain absent or null operations through portable and complete archives', () => {
  for (const source of [saves.defaultSave(OWNER), { ...saves.defaultSave(OWNER), clanShipOperations: null }]) {
    const present = Object.hasOwn(source, 'clanShipOperations');
    const store = storage(), saved = write(source, store);
    for (const raw of [JSON.stringify(saved), saves.exportSave(saved)]) {
      const parsed = saves.parseSaveImport(raw);
      assert.ok(parsed.save, parsed.failure);
      assert.equal(Object.hasOwn(parsed.save, 'clanShipOperations'), present);
      if (present) assert.equal(parsed.save.clanShipOperations, null);
      assert.deepEqual(parsed.save.profile, saved.profile);
    }
    const archive = archives.createCompleteArchive(saved, store, OWNER);
    const parsed = archives.parseCompleteArchive(archive.serialized);
    assert.ok(parsed.archive, parsed.failure);
    assert.equal(Object.hasOwn(parsed.archive.campaign, 'clanShipOperations'), present);
  }
});

test('partial welcome, ordered interior work, crew and an active space turn survive reopening and import', () => {
  const welcome = transition(fixture(), 'onboard-step', { stepId: 'berth-register' }, 'hangar').save;
  const partial = circuit(ready(), 'ship-seal-check', 2);
  let recruited = circuit(ready(), 'ship-armory-audit');
  recruited = transition(recruited, 'recruit', { npcId: 'iron-claw' }, 'armurerie').save;
  let combat = transition(recruited, 'accept-contract', { contractId: 'space-screening' }, 'conseil').save;
  combat = order(combat, 'scan');
  for (const source of [welcome, partial, recruited, combat, completedEscort()]) {
    const store = storage(), saved = write(source, store);
    const reopened = storage(new Map(bytes(store))), before = bytes(reopened);
    const loaded = saves.loadSaveWithStatus(reopened, MAIN);
    assert.equal(loaded.loaded, true, loaded.failure);
    assert.deepEqual(loaded.save.clanShipOperations, saved.clanShipOperations);
    assert.equal(loaded.save.profile.clanMarks, saved.profile.clanMarks);
    assert.deepEqual(bytes(reopened), before, 'reading never advances or pays a turn');
    const portable = saves.parseSaveImport(saves.exportSave(loaded.save));
    assert.ok(portable.save, portable.failure);
    assert.deepEqual(portable.save.clanShipOperations, saved.clanShipOperations);
    const complete = archives.createCompleteArchive(loaded.save, reopened, OWNER);
    const parsed = archives.parseCompleteArchive(complete.serialized);
    assert.ok(parsed.archive, parsed.failure);
    const destination = storage();
    write(saves.defaultSave(OTHER), destination);
    const plan = archives.prepareCompleteArchiveImport(parsed.archive, destination);
    assert.equal(archives.importCompleteArchive(plan, destination).persisted, true);
    const imported = saves.loadSaveWithStatus(destination, MAIN);
    assert.equal(imported.save.createdAt, OWNER);
    assert.deepEqual(imported.save.clanShipOperations, saved.clanShipOperations);
    assert.equal(imported.save.profile.clanMarks, saved.profile.clanMarks);
  }
});

test('future, foreign and inconsistent operations cannot replace a confirmed campaign or enter an archive', () => {
  const store = storage(), saved = write(completedEscort(), store), before = bytes(store), writeCount = store.writes.length;
  const complete = archives.createCompleteArchive(saved, store, OWNER);
  for (const [edit, failure] of [
    [state => { state.version = 2; state.future = { preserve: true }; }, 'future-version'],
    [state => { state.ownerCreatedAt = OTHER; }, 'invalid-save'],
    [state => { state.completedContracts.push(structuredClone(state.completedContracts.at(-1))); }, 'invalid-save'],
    [state => { state.spaceEncounter.version = 2; }, 'future-version'],
    [state => { state.completedContracts.at(-1).proof.encounter.version = 2; }, 'future-version'],
    [state => { state.spaceEncounter.energy += 1; }, 'invalid-save'],
    [state => { state.completedContracts[0].completedRevision = 1; }, 'invalid-save'],
  ]) {
    const invalid = structuredClone(saved); edit(invalid.clanShipOperations);
    assert.equal(saves.parseSaveImport(JSON.stringify(invalid)).failure, failure);
    assert.equal(saves.importSaveWithStatus(JSON.stringify(invalid), store, MAIN).persisted, false);
    assert.equal(saves.writeSaveWithStatus(invalid, store, MAIN).persisted, false);
    assert.throws(() => saves.exportSave(invalid));
    const invalidArchive = structuredClone(complete.archive); invalidArchive.campaign = invalid;
    assert.equal(archives.parseCompleteArchive(JSON.stringify(invalidArchive)).failure, failure);
    assert.throws(() => archives.prepareCompleteArchiveImport(invalidArchive, store));
    assert.deepEqual(bytes(store), before); assert.equal(store.writes.length, writeCount);
  }
});

test('a future operations primary remains protected beside an older valid backup', () => {
  const old = completedEscort(), future = structuredClone(old);
  future.clanShipOperations.version = 2;
  const store = storage(new Map([[MAIN, JSON.stringify(future)], [MAIN + '.backup', JSON.stringify(old)]]));
  const before = bytes(store), loaded = saves.loadSaveWithStatus(store, MAIN);
  assert.equal(loaded.loaded, false); assert.equal(loaded.failure, 'future-version');
  assert.equal(saves.writeSaveWithStatus(old, store, MAIN).failure, 'protected-save');
  assert.deepEqual(bytes(store), before); assert.equal(store.writes.length, 0);
});

test('quota failure keeps a contract and its currency together, and a retry pays only once', () => {
  const store = storage(), current = write(circuit(ready(), 'ship-seal-check', 3), store);
  const before = bytes(store), result = finishCircuit(current);
  assert.equal(result.result.clanMarksReward, 15);
  store.quotaKey = MAIN;
  const failed = saves.writeSaveWithStatus(result.save, store, MAIN);
  assert.equal(failed.persisted, false); assert.equal(failed.failure, 'write-failed');
  assert.deepEqual(bytes(store), before);
  const confirmed = saves.loadSaveWithStatus(store, MAIN).save;
  assert.equal(confirmed.profile.clanMarks, 25); assert.equal(confirmed.clanShipOperations.activeContract.stepIndex, 3);
  store.quotaKey = null;
  const retried = write(finishCircuit(confirmed).save, store);
  assert.equal(retried.profile.clanMarks, 40); assert.equal(retried.clanShipOperations.activeContract, null);
  const duplicate = ops.actClanShipOperations(retried.clanShipOperations,
    { type: 'interior-step', stepId: lastStep().id, expectedRevision: retried.clanShipOperations.revision },
    { ownerCreatedAt: OWNER, docking: retried.clanShipDocking, campaign: retried });
  assert.equal(duplicate.accepted, false); assert.equal(duplicate.clanMarksReward, 0);
  assert.equal(saves.loadSaveWithStatus(storage(new Map(bytes(store))), MAIN).save.profile.clanMarks, 40);
});

test('an uncertain reward write is recovered without recomputing or applying its command again', () => {
  const store = storage(), current = write(circuit(ready(), 'ship-seal-check', 3), store);
  const result = finishCircuit(current); store.failReadback = true;
  const pending = saves.writeSaveWithStatus(result.save, store, MAIN);
  assert.equal(pending.persisted, false);
  const written = bytes(store), writeCount = store.writes.length;
  const recovered = saves.reconcileSaveWrite(pending, OWNER, store, MAIN);
  assert.equal(recovered.status, 'confirmed', recovered.failure);
  assert.equal(recovered.save.profile.clanMarks, 40);
  assert.equal(recovered.save.clanShipOperations.completedContracts.filter(receipt => receipt.contractId === 'ship-seal-check').length, 1);
  assert.deepEqual(bytes(store), written); assert.equal(store.writes.length, writeCount);
  const stale = ops.actClanShipOperations(recovered.save.clanShipOperations,
    { type: 'interior-step', stepId: lastStep().id, expectedRevision: current.clanShipOperations.revision },
    { ownerCreatedAt: OWNER, docking: recovered.save.clanShipDocking, campaign: recovered.save });
  assert.equal(stale.reason, 'stale-revision'); assert.equal(stale.clanMarksReward, 0);
});

test('two independent storage views cannot overwrite the same reward or recruitment with stale state', () => {
  const shared = new Map(), first = storage(shared), second = storage(shared);
  write(circuit(ready(), 'ship-seal-check', 3), first);
  const a = saves.loadSaveWithStatus(first, MAIN).save, b = saves.loadSaveWithStatus(second, MAIN).save;
  write(finishCircuit(a).save, first);
  const confirmedBytes = bytes(first), rejected = saves.writeSaveWithStatus(finishCircuit(b).save, second, MAIN);
  assert.equal(rejected.persisted, false); assert.equal(rejected.failure, 'save-conflict');
  assert.deepEqual(bytes(first), confirmedBytes);
  const reloaded = saves.loadSaveWithStatus(second, MAIN).save;
  assert.equal(reloaded.profile.clanMarks, 40);
  const a2 = saves.loadSaveWithStatus(first, MAIN).save;
  const joined = transition(a2, 'recruit', { npcId: 'threshold-guard' }, 'hangar').save;
  write(joined, first);
  const staleJoin = transition(reloaded, 'recruit', { npcId: 'threshold-guard' }, 'hangar').save;
  assert.equal(saves.writeSaveWithStatus(staleJoin, second, MAIN).failure, 'save-conflict');
  const final = saves.loadSaveWithStatus(second, MAIN).save;
  assert.deepEqual(final.clanShipOperations.recruitedNpcIds, ['threshold-guard']);
  assert.equal(final.profile.clanMarks, 40);
});

test('save boundaries reject mismatched mission bindings while preserving legacy completion counts', () => {
  for (const completions of [0, 3]) {
    let source = ready();
    source.missionProgress['jungle-vey'].completions = completions;
    source.missionProgress['jungle-vey'].status = completions ? 'completed' : 'available';
    source = transition(source, 'accept-contract', { contractId: 'field-jungle-survey' }, 'conseil').save;
    const binding = ops.bindClanShipMission(source.clanShipOperations,
      { ownerCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 0, expectedRevision: source.clanShipOperations.revision });
    assert.equal(binding.accepted, true);
    const store = storage(), saved = write({ ...source, clanShipOperations: binding.state }, store);
    const exported = saves.parseSaveImport(saves.exportSave(saved));
    assert.ok(exported.save, exported.failure);
    assert.equal(exported.save.missionProgress['jungle-vey'].attempts, 0);
    assert.equal(exported.save.missionProgress['jungle-vey'].completions, completions);
    const before = bytes(store), writes = store.writes.length;
    for (const patch of [{ attempts: 1 }, { completions: completions + 1 }, { status: 'locked' }, { attempts: 0.5 }]) {
      const invalid = structuredClone(saved); Object.assign(invalid.missionProgress['jungle-vey'], patch);
      const raw = JSON.stringify(invalid);
      assert.equal(saves.parseSaveImport(raw).failure, 'invalid-save');
      assert.equal(saves.importSaveWithStatus(raw, store, MAIN).persisted, false);
      assert.equal(saves.writeSaveWithStatus(invalid, store, MAIN).persisted, false);
      assert.throws(() => saves.exportSave(invalid));
      assert.deepEqual(bytes(store), before); assert.equal(store.writes.length, writes);
    }
    const missing = structuredClone(saved); delete missing.missionProgress['jungle-vey'];
    assert.equal(saves.parseSaveImport(JSON.stringify(missing)).failure, 'invalid-save');
  }
});

test('a field mission, its contract receipt and its bonus are one durable reward snapshot', () => {
  const store = storage();
  let source = transition(ready(), 'accept-contract', { contractId: 'field-jungle-survey' }, 'conseil').save;
  const binding = ops.bindClanShipMission(source.clanShipOperations,
    { ownerCreatedAt: OWNER, missionId: 'jungle-vey', encounterRun: 0, expectedRevision: source.clanShipOperations.revision });
  assert.equal(binding.accepted, true);
  source = write({ ...source, clanShipOperations: binding.state }, store);
  const mission = MISSION_BY_ID['jungle-vey'];
  const result = { missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 2, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: 'clan-save-proof', definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-05T14:00:00.000Z' };
  const progressed = saves.applyMissionResult(source, result);
  assert.equal(saves.parseSaveImport(JSON.stringify(progressed)).failure, 'invalid-save', 'the intermediate mission result cannot be stored before contract settlement');
  const settled = ops.settleClanShipMission(source.clanShipOperations, source, progressed, result,
    { ownerSaveCreatedAt: OWNER, missionId: mission.id, encounterRun: 0 });
  assert.equal(settled.accepted, true); assert.equal(settled.clanMarksReward, 40);
  const next = { ...progressed, clanShipOperations: settled.state,
    profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settled.clanMarksReward } };
  store.quotaKey = MAIN;
  assert.equal(saves.writeSaveWithStatus(next, store, MAIN).persisted, false);
  const unchanged = saves.loadSaveWithStatus(store, MAIN).save;
  assert.equal(unchanged.missionProgress[mission.id].completions, 0); assert.equal(unchanged.profile.clanMarks, 25);
  assert.equal(unchanged.clanShipOperations.activeContract.missionEncounterRun, 0);
  store.quotaKey = null;
  const final = write(next, store);
  assert.equal(final.missionProgress[mission.id].completions, 1);
  assert.equal(final.profile.clanMarks, progressed.profile.clanMarks + 40);
  const parsed = saves.parseSaveImport(saves.exportSave(final));
  assert.equal(parsed.save.clanShipOperations.activeContract, null);
  assert.equal(parsed.save.clanShipOperations.completedContracts.at(-1).proof.encounterRun, 0);
  const unproven = { ...final, missionProgress: source.missionProgress };
  assert.equal(saves.parseSaveImport(JSON.stringify(unproven)).failure, 'invalid-save', 'a field receipt requires its accepted campaign completion');
  const repeated = ops.settleClanShipMission(parsed.save.clanShipOperations, source, progressed, result,
    { ownerSaveCreatedAt: OWNER, missionId: mission.id, encounterRun: 0 });
  assert.equal(repeated.changed, false); assert.equal(repeated.clanMarksReward, 0);
});

test('manual checkpoints restore the exact space turn and currency before replaying later commands', async () => withLocks(async () => {
  let source = circuit(ready(), 'ship-armory-audit');
  source = transition(source, 'recruit', { npcId: 'iron-claw' }, 'armurerie').save;
  source = transition(source, 'accept-contract', { contractId: 'space-screening' }, 'conseil').save;
  source = order(source, 'scan');
  const store = storage(), original = write(source, store);
  const migrated = await slots.migrateLegacyCampaignSlot(store);
  assert.equal(migrated.ok, true, migrated.message);
  const checkpoint = await slots.saveCampaignCheckpoint(1,
    { kind: 'manual', index: 1, expectedRevision: slotDocument(store).revision, location: 'clan-ship' }, store);
  assert.equal(checkpoint.ok, true, checkpoint.message);
  let finished = saves.loadSaveWithStatus(store, MAIN).save;
  for (const type of ['manoeuvre', 'brace', 'brace', 'extract']) finished = order(finished, type);
  write(finished, store);
  assert.equal(finished.profile.clanMarks, original.profile.clanMarks + 45);
  const restored = await slots.activateCampaignCheckpoint(1, 'manual-1',
    { expectedRevision: slotDocument(store).revision }, store);
  assert.equal(restored.ok, true, restored.message);
  assert.equal(restored.checkpoint.resumeLocation, 'clan-ship');
  assert.deepEqual(restored.save.clanShipOperations, original.clanShipOperations);
  assert.equal(restored.save.profile.clanMarks, original.profile.clanMarks);
  const reopened = storage(new Map(bytes(store)));
  const resumed = await slots.continueCampaignSlot(1, { expectedRevision: slotDocument(reopened).revision }, reopened);
  assert.equal(resumed.ok, true, resumed.message);
  assert.equal(resumed.save.clanShipOperations.spaceEncounter.turn, 1);
  assert.deepEqual(resumed.save.clanShipOperations.spaceEncounter.crewRoles, ['armorer']);
  let replayed = resumed.save;
  for (const type of ['manoeuvre', 'brace', 'brace', 'extract']) replayed = order(replayed, type);
  const saved = write(replayed, reopened);
  assert.equal(saved.profile.clanMarks, finished.profile.clanMarks, 'replaying restores the same reward total, not an extra reward');
  assert.equal(saved.clanShipOperations.completedContracts.filter(receipt => receipt.contractId === 'space-screening').length, 1);
}));

test('replacing a campaign does not transfer an earned crew to its new owner', () => {
  let source = circuit(ready(), 'ship-armory-audit');
  source = transition(source, 'recruit', { npcId: 'iron-claw' }, 'armurerie').save;
  const store = storage(), saved = write(source, store), other = saves.defaultSave(OTHER);
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...other, clanShipOperations: saved.clanShipOperations })).failure, 'invalid-save');
  assert.equal(saves.writeSaveWithStatus(other, store, MAIN).failure, 'save-conflict');
  assert.equal(saves.replaceSaveWithStatus(other, store, MAIN).persisted, true);
  const loaded = saves.loadSaveWithStatus(store, MAIN).save;
  assert.equal(loaded.createdAt, OTHER); assert.equal(Object.hasOwn(loaded, 'clanShipOperations'), false);
  assert.equal(loaded.profile.clanMarks, 0);
});
