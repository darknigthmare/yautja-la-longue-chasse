import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from './helpers/ship-receipt-v161.mjs';

const qa = homeworldSceneSsrV78();
const { defaultSave, parseSaveImport } = qa.load('app/game/save.ts');
const { createDefaultShipProgression } = qa.load('app/game/systems/progression.ts');
const { evaluateShipPreparationV88, inspectShipPreparationV88 } = qa.load('app/game/systems/shipPreparationV88.ts');
const { SHIP_LEVEL_STATIONS } = qa.load('app/game/systems/shipLevelLayout.ts');
const {
  commitFirstInterstellarV173: act,
  firstInterstellarAccessV173: accessFor,
  firstInterstellarReceiptV173: receipt,
  inspectFirstInterstellarV173: inspect,
} = qa.load('app/game/systems/firstInterstellarV173.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const { getEarthHuntAccessV171 } = qa.load('app/game/systems/earthHuntV171.ts');
const { shipReceiptV161 } = qa.load('app/game/systems/shipReceiptV161.ts');
const shipId = 'classic-predator-spaceship';
const owner = '2026-11-22T12:00:00.000Z';
const rank = () => {
  const save = defaultSave(owner);
  let history = chronicle.createClanChronicle();
  const earn = id => {
    const proof = chronicle.CHRONICLE_EVIDENCE.find(candidate => candidate.id === id);
    history = chronicle.recordChronicleEvidence(history, { id, sourceId: proof.sourceId }).state;
  };
  earn('intro-begun');
  for (const rite of chronicle.CHRONICLE_RITES.slice(0, 3)) {
    rite.requiredEvidenceIds.forEach(earn);
    history = chronicle.performChronicleRite(history, { id: rite.id, sourceId: rite.sourceId }).state;
  }
  assert.equal(chronicle.getChronicleRank(history), 'blooded');
  save.prologue = { chronicle: history };
  return save;
};
const owned = playShipAcquisitionV161(qa, rank());
const admission = accessFor(owned, shipId, true, null);
assert.equal(admission.allowed, true);

function run(state, ...actions) {
  for (const action of actions) {
    const result = act(state, action, admission);
    assert.equal(result.accepted, true, JSON.stringify(action) + ' ' + result.message);
    state = result.state;
  }
  return state;
}

const walk = direction => ({ kind: 'walk', direction });
const steer = direction => ({ kind: 'steer', direction });
const mooring = action => ({ kind: 'mooring', action });
const launch = { kind: 'launch' };
const beacon = { kind: 'beacon' };
const relay = { kind: 'relay' };
const repeat = (number, action) => Array.from({ length: number }, () => action);
const prepare = route => run(null, { kind: 'plan', route }, ...repeat(4, walk(1)), launch);
const flyDirect = () => run(prepare('direct'), steer(-1), beacon, steer(1), steer(1), beacon, steer(-1), beacon);

function align(state) {
  return run(state, ...repeat(3, mooring({ type: 'lateral', direction: -1 })), mooring({ type: 'align' }));
}
function dock(state) {
  const flight = inspect(state, owner).view.flight;
  return run(state,
    ...repeat(flight.speed - 1, mooring({ type: 'speed', direction: -1 })),
    ...repeat(flight.distance / 10, mooring({ type: 'advance' })),
    mooring({ type: 'lock', index: 0 }), mooring({ type: 'lock', index: 1 }),
    ...repeat(2, mooring({ type: 'ring', direction: 1 })), mooring({ type: 'berth' }));
}

test('First travel requires an owned hull and the current eight-station preflight', () => {
  assert.equal(shipReceiptV161(rank()).receipt, null);
  assert.match(accessFor(rank(), shipId, true, null).reason, /R2-M021/);
  assert.match(accessFor(owned, shipId, false, null).reason, /R2-M022/);
  assert.match(accessFor(owned, 'other-hull', true, null).reason, /R2-M021/);
  assert.equal(act(null, { kind: 'plan', route: 'direct' }, accessFor(owned, shipId, false, null)).accepted, false);
  const boarded = run(null, { kind: 'plan', route: 'direct' });
  assert.equal(act(boarded, launch, admission).accepted, false);
  assert.equal(accessFor(owned, shipId, false, prepare('direct')).allowed, true);
});

test('The physical preflight allows the Couronne des Départs without a hunt selection', () => {
  const fleet = createDefaultShipProgression(owned, owner);
  const ctx = { save: owned, shipId, selectedMissionId: 'R2-M023', fleet, active: true, focused: true, suspended: false };
  let state;
  assert.equal(evaluateShipPreparationV88(state, ctx).ready, false);
  const airlockLast = [...SHIP_LEVEL_STATIONS.filter(station => station.id !== 'launch-airlock'),
    SHIP_LEVEL_STATIONS.find(station => station.id === 'launch-airlock')];
  for (const { id, x, y } of airlockLast) {
    const result = inspectShipPreparationV88(state, { stationId: id, x, y }, ctx);
    assert.equal(result.accepted, true, result.message);
    state = result.state;
  }
  assert.equal(evaluateShipPreparationV88(state, ctx).ready, true);
  assert.equal(evaluateShipPreparationV88(state, { ...ctx, selectedMissionId: 'jungle-vey' }).ready, false);
});

test('An escale is an explicit action between the first and second beacons', () => {
  const first = run(prepare('stopover'), steer(1), beacon);
  const secondBearing = run(first, ...repeat(3, steer(-1)));
  assert.equal(act(secondBearing, beacon, admission).accepted, false);
  const approach = run(secondBearing, relay, beacon, ...repeat(3, steer(1)), beacon);
  assert.equal(inspect(approach, owner).view.phase, 'approach');
  assert.equal(receipt(owned, approach), null);
});

test('A fast contact returns to the safe approach point with no berth', () => {
  const tooFast = run(align(flyDirect()), ...repeat(4, mooring({ type: 'advance' })));
  const { view } = inspect(tooFast, owner);
  assert.equal(view.flight.setbacks, 1);
  assert.equal(view.flight.speed, 0);
  assert.equal(view.phase, 'approach');
  assert.equal(receipt(owned, tooFast), null);
});

test('The berth, a walked destination and a boarded return are all required', () => {
  const approach = flyDirect();
  assert.equal(act(approach, mooring({ type: 'berth' }), admission).accepted, false);
  const quay = dock(align(approach));
  assert.equal(inspect(quay, owner).view.phase, 'quay');
  assert.equal(receipt(owned, quay), null);
  const visited = run(quay, ...repeat(5, walk(1)));
  assert.equal(inspect(visited, owner).view.visitedDestination, 'SPACE-BASE-01');
  assert.equal(receipt(owned, visited), null);
  assert.equal(getEarthHuntAccessV171(owned, Boolean(receipt(owned, visited))).allowed, false);
  const reloaded = JSON.parse(JSON.stringify(visited));
  const returned = run(reloaded, ...repeat(5, walk(-1)));
  assert.deepEqual(receipt(owned, returned), {
    missionId: 'R2-M023', firstInterstellarComplete: true, visitedDestination: 'SPACE-BASE-01', shipId,
  });
  assert.equal(getEarthHuntAccessV171(owned, Boolean(receipt(owned, returned))).allowed, true);
  const foreign = { ...returned, hullInstanceId: 'other-instance' };
  assert.equal(receipt(owned, foreign), null);
  assert.equal(inspect(returned, '2026-11-22T13:00:00.000Z').status, 'invalid');
  const fake = { ...returned, actions: [returned.actions[0], mooring({ type: 'berth' })] };
  assert.equal(receipt(owned, fake), null);
});

test('Old saves remain compatible and future journals are protected', () => {
  const old = defaultSave(owner);
  const empty = parseSaveImport(JSON.stringify(old));
  assert.equal(Object.hasOwn(empty.save, 'firstInterstellarV173'), false);
  assert.equal(Object.hasOwn(empty.save, 'earthHuntV171'), false);
  const future = { ...old, firstInterstellarV173: { version: 2 } };
  assert.equal(parseSaveImport(JSON.stringify(future)).failure, 'future-version');
  const wrongOwner = { ...old, firstInterstellarV173: { ...prepare('direct'), owner: 'foreign' } };
  assert.equal(parseSaveImport(JSON.stringify(wrongOwner)).failure, 'invalid-save');
});

test('The campaign screen displays both source routes and the physical quay', () => {
  const render = state => qa.render('app/game/FirstInterstellarV173.tsx', {
    owner, state, access: admission, onAction() { throw Error('SSR must not dispatch'); }, onExit() {},
  });
  assert.match(render(null), /Couronne des Départs/);
  assert.match(render(null), /Halte des Trois Routes/);
  const quay = dock(align(flyDirect()));
  assert.match(render(quay), /Quai des arrivées/);
  assert.match(render(quay), /data-first-interstellar="quay"/);
});
