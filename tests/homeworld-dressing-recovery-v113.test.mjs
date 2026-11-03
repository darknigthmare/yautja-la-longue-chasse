import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78(), load = name => qa.load('app/game/systems/' + name + '.ts');
const api = load('homeworldGeometryRecoveryV112'), dressing = load('homeworldDressingV113');
const world = load('homeworldWorldV77'), civic = load('homeworldCivicWorldV80'), location = load('homeworldLocationV77');
const saves = qa.load('app/game/save.ts'), owner = '2026-11-03T16:00:00.000Z';
const center = polygon => ({x: polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length, y: polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length});
const checkpoint = (point, levelId = '0') => ({version: 1, layoutRevision: 1, ownerCreatedAt: owner, levelId, exterior: {...point}, interiorId: null, local: null});
const context = (saved, ledgers = {}) => ({ownerCreatedAt: owner, currentOwnerCreatedAt: owner, checkpoint: saved, ledgers,
  actor: world.createHomeworldWorldActorV77(), levelId: '0', interiorId: null, active: true});
const prepare = value => {const out = api.planHomeworldGeometryRecoveryV112(value); assert(out.ok, out.reason); return out.plan;};
const fixtureAt = floor => {
  const item = dressing.HOMEWORLD_DRESSING_FIXTURES_V113.find(item => item.levelId === floor);
  assert(item, 'a real authored fixture on ' + floor);
  return {item, point: center(dressing.homeworldDressingFixturePolygonV113(item))};
};
const storage = () => {const map = new Map(); return {map, getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key)};};

test('old supported checkpoints inside all nine new facade contacts recover on their own floor without crediting a walk', () => {
  assert.equal(dressing.HOMEWORLD_DRESSING_FACADES_V113.length, 9);
  for (const item of dressing.HOMEWORLD_DRESSING_FACADES_V113) {
    const point = center(dressing.homeworldDressingFacadePolygonV113(item)), saved = checkpoint(point, item.levelId);
    const input = context(saved), bytes = JSON.stringify(input);
    assert(api.homeworldBeforeDressingWalkableV113(item.levelId, point), item.id + ' was supported before dressing');
    assert.equal(location.resolveHomeworldLocationV77(saved, owner).restored, false, 'new solid formerly forced the port fallback');
    assert(api.homeworldGeometryRecoveryRequiredV112(saved, owner, {}));
    const plan = prepare(input), migration = plan.migrations[0];
    assert(plan.movesActor); assert.equal(plan.checkpoint.levelId, item.levelId); assert.equal(migration.levelId, item.levelId);
    assert.equal(migration.obstacleId, item.id);
    assert(civic.homeworldCivicWalkableV80(item.levelId, plan.checkpoint.exterior));
    assert(location.resolveHomeworldLocationV77(plan.checkpoint, owner).restored);
    assert.equal(plan.backup.originalCheckpointJson, JSON.stringify(saved));
    assert.equal(plan.backup.source, 'new-local-geometry-position'); assert.deepEqual(plan.ledgers, {});
    const span = Math.hypot(migration.to.x - point.x, migration.to.y - point.y);
    assert(span <= dressing.homeworldDressingRecoveryRadiusV113(item.id, point, {halfWidth: 24, halfDepth: 14}) + 1e-6);
    // The migration can cross only the newly placed volume, never an older wall or unsupported floor.
    for (let k = 0, n = Math.ceil(span / 2); k <= n; k++) assert(api.homeworldBeforeDressingWalkableV113(item.levelId,
      {x: point.x + (migration.to.x - point.x) * k / n, y: point.y + (migration.to.y - point.y) * k / n}));
    assert.equal(JSON.stringify(input), bytes, 'preview preserves every incoming byte');
  }
});

test('new fixture checkpoints are detected on each of the six floors and remain on that floor after a real save round trip', () => {
  for (const floor of ['0', '+1', '+2', '-1A', '-1B', '-1C']) {
    const {point} = fixtureAt(floor), input = context(checkpoint(point, floor));
    assert(api.homeworldBeforeDressingWalkableV113(floor, point));
    const plan = prepare(input), disk = storage(), save = saves.defaultSave(owner);
    save.homeworld = {...save.homeworld, locationV77: plan.checkpoint};
    assert(saves.writeSaveWithStatus(save, disk, 'dressing-save').persisted);
    const loaded = saves.loadSave(disk, 'dressing-save');
    assert.equal(loaded.createdAt, owner); assert.deepEqual(loaded.homeworld.locationV77, plan.checkpoint);
    assert.equal(loaded.homeworld.locationV77.levelId, floor);
    assert(location.resolveHomeworldLocationV77(loaded.homeworld.locationV77, owner).restored);
  }
});

/** Construct a schema fixture with a prescribed retained position. The actual
 * operation establishes identity/consent/lines; relocation is test input, not
 * a played trace or newly earned distance/provenance. */
function operationAt(point, groundObject = false) {
  const action = load('homeworldArchivePlaqueV109'), schema = load('homeworldArchivePlaqueLedgerV109');
  const definition = load('homeworldArchivePlaqueDefinitionV109').HOMEWORLD_ARCHIVE_PLAQUE_V109;
  const atPost = {ownerCreatedAt: owner, currentOwnerCreatedAt: owner, actor: definition.post, levelId: '0', visitedDistrictIds: ['port'], active: true, artAvailable: true};
  let ledger;
  for (const name of ['open', 'choose-a', 'reply', 'authorize', 'start', 'interrupt']) {
    const out = action.applyArchivePlaqueV109(ledger, name, ledger?.revision ?? 0, atPost); assert(out.ok, out.message); ledger = out.ledger;
  }
  if (groundObject) {
    // Explicit synthetic ground-piece fixture. Its existing permissions and
    // source claims must remain unchanged by the migration.
    ledger.receipt.observations = ['plaque']; ledger.receipt.provenances = ['plaque'];
    Object.assign(ledger.receipt.objects[0], point, {place: 'ground'});
  } else ledger.receipt.last = {...point};
  assert(schema.normalizeHomeworldArchivePlaqueV109(ledger)); return ledger;
}

test('remote interrupted operations and grounded pieces recover without moving the free actor or manufacturing progress', () => {
  const {point} = fixtureAt('0'), saved = checkpoint(world.HOMEWORLD_SPACEPORT_V77.spawn);
  for (const groundObject of [false, true]) {
    const ledger = operationAt(point, groundObject), input = context(saved, {archivePlaqueV109: ledger}), bytes = JSON.stringify(input);
    const plan = prepare(input), after = plan.ledgers.archivePlaqueV109.receipt;
    assert.equal(plan.movesActor, false); assert.deepEqual(plan.checkpoint, saved);
    assert.equal(plan.migrations.length, 1); assert.equal(plan.migrations[0].kind, groundObject ? 'ground-object' : 'operation-last');
    assert.equal(after.walked, ledger.receipt.walked); assert.equal(after.pickupWalked, ledger.receipt.pickupWalked);
    for (const field of ['ownerConsent', 'lineIds', 'provenances', 'observations', 'carrier', 'interruptedCount']) assert.deepEqual(after[field], ledger.receipt[field], field);
    if (groundObject) {
      assert.deepEqual(after.last, ledger.receipt.last);
      assert.equal(after.objects[0].place, 'ground'); assert.equal(after.objects[0].id, ledger.receipt.objects[0].id);
      assert(civic.homeworldCivicWalkableV80('0', {x: after.objects[0].x, y: after.objects[0].y + 60}), 'actual pickup approach remains free');
    } else assert.deepEqual(after.objects, ledger.receipt.objects);
    assert.equal(JSON.stringify(input), bytes);
    const save = saves.defaultSave(owner); save.homeworld = {...save.homeworld, visitedDistrictIds: ['port'], locationV77: plan.checkpoint, ...plan.ledgers};
    assert(saves.parseSaveImport(JSON.stringify(save)).save, 'the complete migrated campaign retains the strict save contract');
  }
});

test('failed backup, a stale floor and another owner cannot write or apply a dressing recovery', () => {
  const {point} = fixtureAt('+1'), input = context(checkpoint(point, '+1')), plan = prepare(input); let writes = 0;
  const transaction = api.createHomeworldGeometryRecoveryTransactionV112(() => input, () => false, () => {writes++; return true;});
  assert.equal(transaction(plan.key).writeRefused, true); assert.equal(writes, 0);
  input.levelId = '+2';
  assert.equal(api.createHomeworldGeometryRecoveryTransactionV112(() => input, () => true, () => {writes++; return true;})(plan.key).stale, true);
  input.currentOwnerCreatedAt = '2026-11-02T16:00:00.000Z';
  assert.equal(api.planHomeworldGeometryRecoveryV112(input).ok, false); assert.equal(writes, 0);
});

test('a carried piece follows its coupled checkpoint and operation without a new pickup or added walking', () => {
  const {point} = fixtureAt('0'), ledger = operationAt(point);
  ledger.receipt.observations = ['plaque']; ledger.receipt.provenances = ['plaque'];
  Object.assign(ledger.receipt.objects[0], point, {place: 'carried'});
  ledger.receipt.carrier = 'plaque'; ledger.receipt.pickupWalked = ledger.receipt.walked;
  assert(load('homeworldArchivePlaqueLedgerV109').normalizeHomeworldArchivePlaqueV109(ledger));
  const input = context(checkpoint(point), {archivePlaqueV109: ledger}), plan = prepare(input), after = plan.ledgers.archivePlaqueV109.receipt;
  assert.equal(plan.migrations.length, 2); assert(plan.movesActor);
  assert.deepEqual(after.last, plan.checkpoint.exterior);
  assert.deepEqual({x: after.objects[0].x, y: after.objects[0].y}, after.last);
  assert.equal(after.objects[0].place, 'carried'); assert.equal(after.carrier, ledger.receipt.carrier);
  for (const key of ['walked', 'pickupWalked', 'lineIds', 'provenances', 'observations', 'ownerConsent']) assert.deepEqual(after[key], ledger.receipt[key], key);
  const save = saves.defaultSave(owner); save.homeworld = {...save.homeworld, visitedDistrictIds: ['port'], locationV77: plan.checkpoint, ...plan.ledgers};
  assert(saves.parseSaveImport(JSON.stringify(save)).save);
});

test('successful confirmation stores the exact original backup before one acknowledged campaign write', () => {
  const {point} = fixtureAt('-1C'), input = context(checkpoint(point, '-1C')), plan = prepare(input), disk = storage(), order = [];
  const before = JSON.stringify(input), save = saves.defaultSave(owner);
  const out = api.createHomeworldGeometryRecoveryTransactionV112(() => input,
    proposal => {order.push('backup'); return api.storeHomeworldGeometryRecoveryBackupV112(proposal, disk);},
    proposal => {order.push('save'); save.homeworld = {...save.homeworld, locationV77: proposal.checkpoint, ...proposal.ledgers};
      return saves.writeSaveWithStatus(save, disk, 'confirmed-dressing-save').persisted;})(plan.key);
  assert(out.ok, out.message); assert.deepEqual(order, ['backup', 'save']);
  assert.equal(disk.getItem(plan.backupKey), JSON.stringify(plan.backup));
  assert.equal(plan.backup.originalCheckpointJson, JSON.stringify(input.checkpoint));
  assert.equal(JSON.stringify(input), before);
  const loaded = saves.loadSave(disk, 'confirmed-dressing-save');
  assert(api.homeworldGeometryRecoverySaveMatchesV112(plan, owner, loaded.homeworld));
});
