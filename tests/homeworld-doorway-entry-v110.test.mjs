import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {cargoRouteV108} from './helpers/cargo-v108-route.mjs';
import {createOccupiedDoorwayV110} from './helpers/cargo-doorway-v110-route.mjs';

const f = cargoRouteV108('2026-10-26T10:00:00.000Z');
const load = name => f.qa.load('app/game/systems/' + name + '.ts');
const api = Object.assign({}, ...[
  'homeworldWorldV77', 'homeworldCity', 'homeworldGeometryV64', 'homeworldInteriorsV64', 'homeworldLocationV77',
  'homeworldTransitionsV110', 'homeworldWayfindingV75', 'homeworldCartographyLedgerV104',
  'homeworldCartographyLedgerV105', 'homeworldCartographyV105', 'homeworldArchiveLedgerV106', 'homeworldArchiveV106',
  'homeworldArchiveComparisonLedgerV107', 'homeworldArchiveComparisonV107', 'homeworldCargoLedgerV108',
  'homeworldCargoV108', 'homeworldArchivePlaqueLedgerV109', 'homeworldArchivePlaqueV109',
  'homeworldArchiveContinuationLedgerV111', 'homeworldArchiveContinuationV111',
  'homeworldArrivalRecoveryLedgerV111', 'homeworldArrivalRecoveryV111',
].map(load));
const saves = f.qa.load('app/game/save.ts');
const source = await fs.readFile('app/game/HomeworldHub.tsx', 'utf8');
const tree = ts.createSourceFile('HomeworldHub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let played;
const playedDoorway = () => structuredClone(played ??= createOccupiedDoorwayV110(f.owner, f));

/** Execute the shipped entry, persistence and exit callbacks. Only React refs,
 * setters, frame scheduling and the actual save storage adapter are supplied;
 * no door admission, anchor assignment or checkpoint normalizer is copied. */
function callback(name, environment) {
  let implementation;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) implementation = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(tree); assert(implementation, 'Execute actual Hub callback ' + name);
  const compiled = ts.transpileModule(`const handler=${implementation.getText(tree)};`, {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None},
  }).outputText;
  return runInNewContext(`(()=>{${compiled};return handler;})()`, environment);
}

function fixture() {
  const route = playedDoorway(), values = new Map(), key = 'homeworld-doorway-v110';
  const storage = {getItem: name => values.get(name) ?? null, setItem: (name, bytes) => values.set(name, bytes), removeItem: name => values.delete(name)};
  const save = saves.defaultSave(f.owner); save.homeworld.visitedDistrictIds = ['port'];
  save.homeworld.cargoV108 = structuredClone(route.ledger);
  save.homeworld.locationV77 = api.createHomeworldCheckpointV77(f.owner, '0', route.actor, null, route.actor);
  assert(saves.writeSaveWithStatus(save, storage, key).persisted);
  let writes = 0;
  const env = {
    ...api, save, saveRef: {current: save}, progressRef: {current: save.homeworld},
    actorRef: {current: structuredClone(route.actor)}, exteriorAnchorRef: {current: structuredClone(route.actor)},
    interiorRef: {current: null}, levelRefV77: {current: '0'}, transitRefV77: {current: null}, skiffRefV77: {current: null},
    suspendedRef: {current: false}, pausedRef: {current: false}, dialogStateRef: {current: null},
    cargoMigrationWriteReadyRefV108: {current: true},
    cartographyDraftRefV104: {current: api.defaultHomeworldCartographyV104(f.owner)},
    cartographyDraftRefV105: {current: api.defaultHomeworldCartographyV105(f.owner)},
    archiveDraftRefV106: {current: api.defaultHomeworldArchiveV106(f.owner)},
    comparisonDraftRefV107: {current: api.defaultHomeworldArchiveComparisonV107(f.owner)},
    cargoDraftRefV108: {current: structuredClone(route.ledger)},
    plaqueDraftRefV109: {current: api.defaultHomeworldArchivePlaqueV109(f.owner)},
    continuationDraftRefV111: {current: api.defaultHomeworldArchiveContinuationV111(f.owner)},
    residentAdmissionRefV110: {current: {owner: f.owner, active: true}},
    document: {hidden: false, hasFocus: () => true},
    youthMotionRefV74: {current: {direction: 's'}}, viewportRef: {current: {focus() {}}},
    clearInputs() {}, setActor() {}, setInteriorId() {}, setYouthMotionV74() {},
    setAnnouncement(message) { env.announcement = message; }, onNotify() {},
    requestAnimationFrame(handler) { handler(); return 1; },
    persistProgress(homeworld) {
      const result = saves.writeSaveWithStatus({...env.saveRef.current, homeworld}, storage, key);
      if (result.persisted) { env.saveRef.current = result.save; writes++; } return result.persisted;
    },
  };
  for (const name of ['cartography', 'archive', 'comparison', 'cargo', 'plaque']) {
    const version = {cartography: 'V104', archive: 'V106', comparison: 'V107', cargo: 'V108', plaque: 'V109'}[name];
    env[name + 'WritePausedRef' + version] = {current: false};
  }
  env.cartographyWritePausedRefV105 = {current: false};
  for (const name of ['setPlaqueViewV109', 'setPlaqueWritePausedV109', 'setCargoViewV108', 'setCargoWritePausedV108',
    'setComparisonViewV107', 'setComparisonWritePausedV107', 'setArchiveViewV106', 'setArchiveWritePausedV106',
    'setCartographyWritePausedV104', 'setCartographyWritePausedV105', 'setContinuationViewV111',
    'setRecoveryPlanV111', 'setRecoveryMessageV111', 'setRecoveryWriteRefusedV111', 'setDialog']) env[name] = () => {};
  for (const name of ['onProgress', 'recordLocationV77', 'recoveryContextV111', 'enterInterior', 'exitInterior']) env[name] = callback(name, env);
  return {env, route, values, key, storage, get writes() { return writes; }};
}

function walkToInteriorExit(env) {
  const room = env.interiorRef.current;
  const route = api.homeworldWayfindingInteriorRouteV75(room, env.actorRef.current, 'exit');
  assert.equal(route.status, 'reachable');
  let actor = env.actorRef.current;
  for (const point of route.points.slice(1)) {
    let budget = 1000;
    while (Math.hypot(point.x - actor.x, point.y - actor.y) > .01 && budget-- > 0) {
      const span = Math.max(Math.abs(point.x - actor.x) / 330, Math.abs(point.y - actor.y) / 260, 1 / 60);
      actor = api.stepHomeworldActorOnFloor(actor, {moveX: (point.x - actor.x) / (330 * span), climb: (point.y - actor.y) / (260 * span), jumpPressed: false}, 1 / 60,
        position => api.isHomeworldInteriorWalkableV64(room, position), () => ({...actor, ...room.spawn}));
    }
    assert(Math.hypot(point.x - actor.x, point.y - actor.y) <= .01);
  }
  env.actorRef.current = actor;
  assert.equal(api.nearestHomeworldInteriorTargetV64(room, actor)?.kind, 'exit');
}

test('V110: real 603-step doorway entry saves, reloads and exits through its actual free standing point', () => {
  const state = fixture(), {env, route} = state, cargoBefore = JSON.stringify(route.ledger);
  assert.equal(route.ticks, 603); assert(route.carriedDistance > 2750);
  assert(Math.abs(Math.hypot(route.actor.x - route.approach.x, route.actor.y - route.approach.y) - 31.5) < 1e-9);
  assert.equal(f.api.cargoCaseCollisionV108(route.ledger, route.actor), null);
  assert.equal(f.api.cargoCaseCollisionV108(route.ledger, route.approach), 'cargo-lot-narrow-v108');
  env.enterInterior(route.building.id);
  assert.equal(env.interiorRef.current?.buildingId, route.building.id);
  assert.deepEqual({...env.exteriorAnchorRef.current}, {...route.actor, vx: 0, vy: 0}, 'entry must retain the safe actual standing point');
  assert.equal(state.writes, 1);
  const stored = JSON.parse(state.values.get(state.key));
  assert(saves.parseSaveImport(JSON.stringify(stored)).save, 'the exact 31.5-unit anchor is accepted by the real save validator');
  const loaded = saves.loadSave(state.storage, state.key);
  const restored = api.resolveHomeworldLocationV77(loaded.homeworld.locationV77, loaded.createdAt);
  assert.equal(restored.restored, true); assert.equal(restored.interiorId, route.building.id);
  assert(Math.hypot(restored.exterior.x - route.actor.x, restored.exterior.y - route.actor.y) < .0001);
  env.saveRef.current = loaded; env.progressRef.current = loaded.homeworld;
  env.actorRef.current = restored.actor; env.exteriorAnchorRef.current = restored.exterior;
  env.interiorRef.current = api.homeworldInteriorForBuildingV64(restored.interiorId);
  walkToInteriorExit(env); env.exitInterior();
  assert.equal(env.interiorRef.current, null); assert.equal(state.writes, 2);
  assert(Math.hypot(env.actorRef.current.x - route.actor.x, env.actorRef.current.y - route.actor.y) < .0001);
  assert.equal(f.api.cargoCaseCollisionV108(route.ledger, env.actorRef.current), null);
  assert.equal(JSON.stringify(env.saveRef.current.homeworld.cargoV108), cargoBefore, 'entry, reload and exit do not move or award a load');
});

test('V110: a legacy interior checkpoint with an occupied authored anchor is retained without inventing an exit', () => {
  const state = fixture(), {env, route} = state, room = api.homeworldInteriorForBuildingV64(route.building.id);
  const oldAnchor = {...route.actor, ...route.approach, vx: 0, vy: 0};
  const checkpoint = api.createHomeworldCheckpointV77(f.owner, '0', {...route.actor, ...room.spawn}, room.buildingId, oldAnchor);
  const legacy = {...env.saveRef.current, homeworld: {...env.progressRef.current, locationV77: checkpoint}};
  assert(saves.parseSaveImport(JSON.stringify(legacy)).save, 'declared legacy geometry fixture remains importable');
  env.saveRef.current = legacy; env.progressRef.current = legacy.homeworld;
  const restored = api.resolveHomeworldLocationV77(checkpoint, f.owner);
  assert.equal(restored.interiorId, room.buildingId);
  env.actorRef.current = restored.actor; env.exteriorAnchorRef.current = restored.exterior; env.interiorRef.current = room;
  walkToInteriorExit(env);
  const before = JSON.stringify({actor: env.actorRef.current, anchor: env.exteriorAnchorRef.current, cargo: env.cargoDraftRefV108.current});
  env.exitInterior();
  assert.equal(env.interiorRef.current, room); assert.equal(state.writes, 0); assert.match(env.announcement, /occupé/);
  assert.equal(JSON.stringify({actor: env.actorRef.current, anchor: env.exteriorAnchorRef.current, cargo: env.cargoDraftRefV108.current}), before);
});

test('V110: a replaced cargo owner cannot enter a room or replace the exterior anchor', () => {
  const state = fixture(), {env, route} = state;
  env.cargoDraftRefV108.current.ownerCreatedAt = '2026-10-25T10:00:00.000Z';
  const before = JSON.stringify({actor: env.actorRef.current, anchor: env.exteriorAnchorRef.current});
  env.enterInterior(route.building.id);
  assert.equal(env.interiorRef.current, null); assert.equal(state.writes, 0);
  assert.equal(JSON.stringify({actor: env.actorRef.current, anchor: env.exteriorAnchorRef.current}), before);
});
