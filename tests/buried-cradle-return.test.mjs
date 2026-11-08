import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { createCradleReturnRoute } from './helpers/buried-cradle-return-route.mjs';

const qa = homeworldSceneSsrV78();
const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
const returns = qa.load('app/game/systems/buriedCradleReturn.ts');
const cradle = qa.load('app/game/systems/buriedCradle.ts');
const snapshots = qa.load('app/game/systems/buriedCradleSnapshot.ts');
const ship = qa.load('app/game/systems/shipInterior25d.ts');
const saves = qa.load('app/game/save.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const OWNER = '2026-11-08T12:30:00.000Z', SHIP = 'classic-predator-spaceship';
const context = { personalShipId: SHIP, ownedShipIds: [SHIP] };
const observation = type => ({ roomId: returns.CRADLE_RETURN_STATIONS[type],
  ...ship.SHIP_INTERIOR_25D_ROOMS[returns.CRADLE_RETURN_STATIONS[type]].station.approach });
function apply(save, action, extra = {}) {
  const before = JSON.stringify(save);
  const result = campaign.actBuriedCradleCampaign(save, action, { ...context, ...extra });
  assert(result.accepted, result.message); assert.equal(JSON.stringify(save), before, 'input remains immutable');
  return { ...save, buriedCradle: result.state, prologue: result.prologue };
}
function extracted(outcome = 'crown') {
  let save = saves.defaultSave(OWNER);
  for (const mission of MISSIONS) save.missionProgress[mission.id] = { ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1 };
  save = apply(apply(save, { type: 'prepare' }), { type: 'depart' });
  const progress = { ...cradle.createBuriedCradleProgress(), visitedRoomIds: [...cradle.CRADLE_ROOM_IDS],
    rootRingCut: true, drainageOpened: true, shortcutIds: ['roots-fault'],
    bossDefeated: outcome !== 'retreat', crownClaimed: outcome === 'crown' };
  let run = cradle.createBuriedCradleRun(progress, 1);
  run.roomId = '01'; run.player.x = 156; run.player.y = 508; run.player.health = 61;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
  assert(run.extracted);
  return apply(save, { type: 'extract', progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
}
function invoke(save, type, overrides = {}, action = {}) {
  return campaign.actBuriedCradleCampaign(save, { type, expectedRevision: save.buriedCradle.returnVisit?.revision ?? 0, ...action },
    { ...context, returnActive: true, returnObservation: observation(type), ...overrides });
}
const render = (save, selectedShipId = SHIP, stationId = null) => qa.render('app/game/BuriedCradleReturnPanel.tsx', {
  controlled: { save, selectedShipId, onAction: () => true }, stationId, suspended: false, observe: () => null, onNavigate: () => {},
});

test('a new extraction cannot use the old report shortcut or skip care and examination', () => {
  const save = extracted();
  assert.deepEqual(save.buriedCradle.returnVisit, { version: 1, revision: 0, events: [] });
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'report' }, context).accepted, false);
  for (const type of ['inspect-return', 'present-clan', 'analyze-workshop']) assert.equal(invoke(save, type).accepted, false);
  assert.equal(save.buriedCradle.crownDelivered, false);
});

test('both debrief choices use real walked room routes and retain the extraction snapshot', () => {
  for (const choice of ['present-clan', 'analyze-workshop']) {
    let save = extracted(); const original = structuredClone(save.buriedCradle.snapshot), economy = structuredClone(save.profile);
    const route = createCradleReturnRoute(qa);
    for (const type of ['treat-return', 'inspect-return', choice]) {
      save = route.act(save, type, context);
      const loaded = saves.parseSaveImport(saves.exportSave(save)); assert(loaded.save, loaded.failure);
      assert.deepEqual(loaded.save.buriedCradle, save.buriedCradle); save = loaded.save;
    }
    assert(route.trace.length >= 3); assert.equal(save.buriedCradle.status, 'reported');
    assert.equal(returns.cradleReturnChoice(save.buriedCradle.returnVisit), choice === 'present-clan' ? 'clan' : 'workshop');
    assert.deepEqual(save.buriedCradle.snapshot, original, 'care never rewrites the field proof');
    assert.deepEqual(save.profile, economy); assert.equal(save.buriedCradle.crownDelivered, true);
    assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'report' }, context).changed, false);
    assert.equal(invoke(save, choice).changed, false);
    assert.equal(invoke(save, choice === 'present-clan' ? 'analyze-workshop' : 'present-clan').accepted, false);
  }
});

test('all three outcomes are truthful and a failed crown retrieval can be retried without old return receipts', () => {
  for (const outcome of ['crown', 'victory', 'retreat']) {
    let save = extracted(outcome); const world = structuredClone(save.buriedCradle.progress);
    save = createCradleReturnRoute(qa).complete(save, context, 'analyze-workshop');
    assert.equal(save.buriedCradle.crownDelivered, outcome === 'crown');
    assert.equal(save.buriedCradle.progress.bossDefeated, outcome !== 'retreat');
    const html = render(save);
    assert.equal(html.includes('100_trophee_couronne_socle.png'), outcome === 'crown');
    if (outcome === 'crown') {
      assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'depart' }, context).accepted, false);
    } else {
      save = apply(save, { type: 'depart' });
      assert.equal(save.buriedCradle.returnVisit, undefined); assert.equal(save.buriedCradle.snapshot, null);
      assert.deepEqual(save.buriedCradle.progress, world);
      save = apply(save, { type: 'extract', progress: world });
      assert.equal(save.buriedCradle.returnVisit.revision, 0);
    }
  }
});

test('distance, solid geometry, the wrong room, another hull and inactive scenes cannot create receipts', () => {
  const save = extracted(), before = JSON.stringify(save);
  for (const override of [
    { returnActive: false }, { returnObservation: null }, { ownedShipIds: [] },
    { personalShipId: 'wolf-ship', ownedShipIds: [SHIP, 'wolf-ship'] },
    { returnObservation: { roomId: 'medical-bay', x: 600, y: 700 } },
    { returnObservation: { roomId: 'medical-bay', x: 600, y: 330 } },
    { returnObservation: { roomId: 'trophy-hall', x: 600, y: 405 } },
    { returnObservation: { roomId: 'medical-bay', x: NaN, y: 395 } },
    { returnObservation: { ...observation('treat-return'), viaMenu: true } },
  ]) assert.equal(invoke(save, 'treat-return', override).accepted, false, JSON.stringify(override));
  for (const patch of [{ clanShipDocking: { status: 'aboard' } }, { planetArrival: {} }, { wolfCastle: { status: 'present' } }])
    assert.equal(invoke({ ...save, ...patch }, 'treat-return').accepted, false);
  assert.equal(JSON.stringify(save), before);
});

test('stale and malformed commands never repeat care or change a recorded decision', () => {
  const initial = extracted();
  for (const revision of [-1, 1, .5, NaN, '0']) assert.equal(invoke(initial, 'treat-return', {}, { expectedRevision: revision }).accepted, false);
  assert.equal(invoke(initial, 'treat-return', {}, { bonus: 100 }).accepted, false);
  const save = createCradleReturnRoute(qa).act(initial, 'treat-return', context), before = JSON.stringify(save);
  assert.equal(invoke(save, 'treat-return', {}, { expectedRevision: 0 }).accepted, false);
  assert.equal(invoke(save, 'inspect-return', {}, { expectedRevision: 0 }).accepted, false);
  assert.equal(JSON.stringify(save), before);
});

test('old absent/null return fields and already reported dossiers preserve their bytes and recognition', () => {
  for (const isNull of [false, true]) {
    let save = extracted();
    if (isNull) save.buriedCradle.returnVisit = null; else delete save.buriedCradle.returnVisit;
    const inspected = campaign.inspectBuriedCradleCampaign(save.buriedCradle, OWNER);
    assert.equal(inspected.status, 'valid'); assert.deepEqual(inspected.state, save.buriedCradle);
    save = apply(save, { type: 'report' });
    const bytes = JSON.stringify(save.buriedCradle), loaded = saves.parseSaveImport(saves.exportSave(save));
    assert(loaded.save, loaded.failure); assert.equal(JSON.stringify(loaded.save.buriedCradle), bytes);
    assert.equal(render(save), '', 'no invented retrospective care or choice');
  }
});

test('import rejects future, reordered, duplicated, extra and physically impossible return events', () => {
  const save = createCradleReturnRoute(qa).complete(extracted(), context);
  const mutations = [
    ['future-version', v => { v.returnVisit.version = 2; }],
    ['invalid-save', v => { v.returnVisit.revision = 2; }],
    ['invalid-save', v => { v.returnVisit.events.reverse(); }],
    ['invalid-save', v => { v.returnVisit.events.push(v.returnVisit.events[2]); v.returnVisit.revision = 4; }],
    ['invalid-save', v => { v.returnVisit.events[0].observation.x = 600; v.returnVisit.events[0].observation.y = 330; }],
    ['invalid-save', v => { v.returnVisit.events[1].observation.roomId = 'clan-archives'; }],
    ['invalid-save', v => { v.returnVisit.events[2].unexpected = true; }],
    ['invalid-save', v => { v.returnVisit.events.pop(); v.returnVisit.revision = 2; }],
    ['invalid-save', v => { v.status = 'extracted'; v.crownDelivered = false; }],
  ];
  for (const [failure, mutate] of mutations) {
    const changed = structuredClone(save); mutate(changed.buriedCradle);
    const bytes = JSON.stringify(changed), parsed = saves.parseSaveImport(bytes);
    assert.equal(parsed.failure, failure); assert.equal(parsed.save, null); assert.equal(JSON.stringify(changed), bytes);
  }
});

test('first queen evidence is recorded once after either choice and never grants an Elite rite', () => {
  for (const choice of ['present-clan', 'analyze-workshop']) {
    let save = extracted();
    save.prologue = { status: 'completed', chronicle: { version: 1, legacyRecognition: null,
      evidence: chronicle.CHRONICLE_EVIDENCE.filter(item => item.id !== 'first-queen-hunt').map(({ id, sourceId }) => ({ id, sourceId })),
      rites: chronicle.CHRONICLE_RITES.slice(0, 3).map(({ id, sourceId }) => ({ id, sourceId })) } };
    const rites = structuredClone(save.prologue.chronicle.rites), route = createCradleReturnRoute(qa);
    save = route.act(save, 'treat-return', context); save = route.act(save, 'inspect-return', context);
    assert.equal(save.prologue.chronicle.evidence.filter(item => item.id === 'first-queen-hunt').length, 0);
    save = route.act(save, choice, context);
    assert.equal(save.prologue.chronicle.evidence.filter(item => item.id === 'first-queen-hunt').length, 1);
    assert.deepEqual(save.prologue.chronicle.rites, rites); assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), 'blooded');
  }
});

test('quota refusal and uncertain readback keep the prior step or reconcile the exact new receipt', () => {
  const key = saves.SAVE_STORAGE_KEY, map = new Map();
  const storage = { full: false, uncertain: false, readback: false,
    getItem(k) { if (k === key && this.readback) { this.readback = false; throw Error('readback'); } return map.get(k) ?? null; },
    setItem(k, v) { if (this.full) throw Error('quota'); map.set(k, v); if (k === key && this.uncertain) { this.uncertain = false; this.readback = true; } },
    removeItem(k) { map.delete(k); } };
  const save = extracted(); assert(saves.writeSaveWithStatus(save, storage, key).persisted);
  const next = createCradleReturnRoute(qa).act(save, 'treat-return', context), previous = map.get(key);
  storage.full = true; assert.equal(saves.writeSaveWithStatus(next, storage, key).persisted, false); assert.equal(map.get(key), previous);
  storage.full = false; storage.uncertain = true;
  const pending = saves.writeSaveWithStatus(next, storage, key); assert.equal(pending.persisted, false);
  const recovered = saves.reconcileSaveWrite(pending, OWNER, storage, key);
  assert.equal(recovered.status, 'confirmed'); assert.deepEqual(recovered.save.buriedCradle.returnVisit, next.buriedCradle.returnVisit);
  assert.equal(invoke(recovered.save, 'treat-return').accepted, false);
});

test('the real personal interior renders a crown only after examination and on its assigned hull', () => {
  const route = createCradleReturnRoute(qa);
  const before = extracted(), care = route.act(before, 'treat-return', context), examined = route.act(care, 'inspect-return', context);
  function interior(save, selectedShipId) {
    return qa.render('app/game/ShipInterior25D.tsx', { appearance: save.appearance, loadout: save.loadout,
      cradleReturn: { save, selectedShipId, onAction: () => true } });
  }
  assert.doesNotMatch(interior(before, SHIP), /100_trophee_couronne_socle/);
  assert.match(interior(examined, SHIP), /100_trophee_couronne_socle/);
  assert.doesNotMatch(interior(examined, 'wolf-ship'), /100_trophee_couronne_socle/);
  assert.match(interior(examined, 'wolf-ship'), /Reprends cette coque/);
  const html = render(examined, SHIP, 'trophy-hall');
  assert.match(html, /data-cradle-return-action="analyze-workshop"[^>]*>Analyser/);
  assert.match(html, /data-cradle-return-action="present-clan" disabled=""/);
});
