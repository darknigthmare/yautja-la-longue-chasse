import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const bundled = await build({ stdin: { contents: [
  'export * as roster from "./app/game/systems/planetInsertion.ts";',
  'export * as saves from "./app/game/save.ts";',
  'export * as archives from "./app/game/systems/completeArchive.ts";',
].join('\n'), resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'ts' },
bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { roster: p, saves, archives } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const OWNER = '2026-11-06T16:00:00.000Z', OTHER = '2026-11-06T16:01:00.000Z';
const SHIP = 'classic-predator-spaceship', WOLF = 'wolf-ship', RUN = 'roster-assignment-outcome';
const PLAN = { version: 1, method: 'pod', team: 'triad' };

function assigned() {
  return p.TRIO_MEMBERS.reduce((state, { id }) =>
    p.assignExpeditionMember(p.recruitExpeditionMember(state, OWNER, id), OWNER, SHIP, id), null);
}
function wounded() {
  return p.settleExpeditionOutcome(assigned(), OWNER, RUN, PLAN, SHIP, {
    version: 1, runId: RUN, plan: PLAN,
    members: [{ id: 'karhek', status: 'extracted', health: 70, maxHealth: 100 },
      { id: 'saketh', status: 'left-behind', health: 0, maxHealth: 120 }],
    extracted: ['karhek'], leftBehind: ['saketh'], injured: ['karhek'],
  });
}
function storage() {
  const values = new Map();
  return { values, get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('ALL-02: recruitment records an agreement without assigning a ship or enabling a triad', () => {
  assert.throws(() => p.assignExpeditionMember(null, OWNER, SHIP, 'karhek'), TypeError);
  const first = p.recruitExpeditionMember(null, OWNER, 'karhek');
  assert.deepEqual(first, { version: 2, ownerCreatedAt: OWNER, settledRunIds: [],
    members: [{ id: 'karhek', assignedShipId: null, availability: 'ready' }] });
  assert.equal(p.expeditionTrioReady(first, OWNER, SHIP), false);
  const both = p.recruitExpeditionMember(first, OWNER, 'saketh');
  assert.deepEqual(both.members.map(member => member.assignedShipId), [null, null]);
  assert.equal(p.expeditionTrioReady(both, OWNER, SHIP), false);
  const oneAssigned = p.assignExpeditionMember(both, OWNER, SHIP, 'karhek');
  assert.equal(p.expeditionTrioReady(oneAssigned, OWNER, SHIP), false);
  assert.equal(p.expeditionTrioReady(p.assignExpeditionMember(oneAssigned, OWNER, SHIP, 'saketh'), OWNER, SHIP), true);
  assert.deepEqual(p.recruitExpeditionMember(first, OWNER, 'karhek'), first, 'a repeated agreement cannot duplicate or assign');
  assert.deepEqual(both.members.map(member => member.assignedShipId), [null, null], 'commands do not mutate an uncommitted roster');
});

test('QA-C09: reserve removes only assignment and preserves recruitment, injury, rescue and settled receipts', () => {
  const before = wounded();
  const reserve = p.reserveExpeditionMember(p.reserveExpeditionMember(before, OWNER, 'karhek'), OWNER, 'saketh');
  assert.deepEqual(reserve.members, [
    { id: 'karhek', assignedShipId: null, availability: 'recovering' },
    { id: 'saketh', assignedShipId: null, availability: 'missing' },
  ]);
  assert.deepEqual(reserve.settledRunIds, [RUN]);
  assert.equal(p.expeditionTrioReady(reserve, OWNER, SHIP), false);
  assert.deepEqual(p.reserveExpeditionMember(reserve, OWNER, 'saketh'), reserve);
  assert.deepEqual(p.recruitExpeditionMember(reserve, OWNER, 'saketh'), reserve, 'recruiting again cannot erase a rescue');
  const changedHull = p.assignExpeditionMember(reserve, OWNER, WOLF, 'karhek');
  assert.equal(changedHull.members[0].availability, 'recovering');
  assert.equal(changedHull.members[0].assignedShipId, WOLF);
  assert.deepEqual(before.members.map(member => member.assignedShipId), [SHIP, SHIP]);
  assert.throws(() => p.reserveExpeditionMember(undefined, OWNER, 'karhek'), TypeError);
});

test('care in reserve keeps the paid two-step rescue and never boards or heals other members', () => {
  const reserve = p.reserveExpeditionMember(wounded(), OWNER, 'saketh');
  assert.equal(p.careForExpeditionMember(reserve, OWNER, 'saketh', 59, 'missing'), null);
  const rescue = p.careForExpeditionMember(reserve, OWNER, 'saketh', 100, 'missing');
  assert.equal(rescue.clanMarks, 40);
  assert.equal(rescue.roster.members[1].assignedShipId, null);
  assert.equal(p.careForExpeditionMember(rescue.roster, OWNER, 'saketh', 40, 'missing'), null);
  const care = p.careForExpeditionMember(rescue.roster, OWNER, 'saketh', 40, 'recovering');
  assert.equal(care.clanMarks, 20);
  assert.deepEqual(care.roster.members[1], { id: 'saketh', assignedShipId: null, availability: 'ready' });
  assert.deepEqual(care.roster.members[0], reserve.members[0]);
  assert.deepEqual(care.roster.settledRunIds, [RUN]);
  assert.equal(p.expeditionTrioReady(care.roster, OWNER, SHIP), false);
});

test('v1 migration preserves earned members, hull assignments, availability and settlement history exactly', () => {
  const legacy = { ...wounded(), version: 1 }, original = JSON.stringify(legacy);
  const migrated = p.inspectExpeditionRoster(legacy, OWNER);
  assert.equal(migrated.status, 'valid');
  assert.deepEqual(migrated.state, { ...legacy, version: 2 });
  assert.equal(JSON.stringify(legacy), original, 'inspection must not rewrite the supplied bytes');
  assert.deepEqual(p.inspectExpeditionRoster(migrated.state, OWNER), migrated, 'migration is repeatable without new occupants');
  assert.equal(p.inspectExpeditionRoster(undefined, OWNER).status, 'absent');
  assert.equal(p.inspectExpeditionRoster(null, OWNER).status, 'absent');
  assert.equal(p.inspectExpeditionRoster({ ...legacy, members: [{ ...legacy.members[0], assignedShipId: null }] }, OWNER).status,
    'invalid-save', 'v1 never stored an unassigned member, so malformed old data cannot become a new agreement');
});

test('new and legacy rosters survive durable reload, portable export and complete archive', () => {
  const cases = [p.recruitExpeditionMember(null, OWNER, 'karhek'), assigned(),
    p.reserveExpeditionMember(wounded(), OWNER, 'saketh'), { ...wounded(), version: 1 }];
  for (const roster of cases) {
    const target = storage(), candidate = { ...saves.defaultSave(OWNER), expeditionRoster: roster };
    const written = saves.writeSaveWithStatus(candidate, target);
    assert.equal(written.persisted, true, written.failure);
    const expected = p.inspectExpeditionRoster(roster, OWNER).state;
    const archive = archives.createCompleteArchive(written.save, target, OWNER);
    for (const copy of [saves.loadSaveWithStatus(target).save, saves.parseSaveImport(saves.exportSave(written.save)).save,
      archives.parseCompleteArchive(archive.serialized).archive?.campaign]) {
      assert(copy, 'campaign remains recoverable');
      assert.deepEqual(copy.expeditionRoster, expected);
      assert.deepEqual(copy.profile, written.save.profile);
    }
  }
});

test('invalid or future roster data cannot replace the last readable campaign', () => {
  const target = storage(), valid = { ...saves.defaultSave(OWNER), expeditionRoster: assigned() };
  assert(saves.writeSaveWithStatus(valid, target).persisted);
  const bytes = [...target.values];
  for (const roster of [{ ...valid.expeditionRoster, version: 3 }, { ...valid.expeditionRoster, ownerCreatedAt: OTHER },
    { ...valid.expeditionRoster, members: [{ id: 'karhek', assignedShipId: undefined, availability: 'ready' }] },
    { ...valid.expeditionRoster, members: [{ id: 'karhek', assignedShipId: 'unknown', availability: 'ready' }] }]) {
    assert.equal(saves.writeSaveWithStatus({ ...valid, expeditionRoster: roster }, target).persisted, false);
    assert.deepEqual([...target.values], bytes);
  }
  assert.equal(p.inspectExpeditionRoster({ version: 3 }, OWNER).status, 'future-version');
});
