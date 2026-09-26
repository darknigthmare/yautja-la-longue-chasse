import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';

const bundled = await build({
  stdin: { contents: [
    'export * from "./app/game/systems/pitCombat";',
    'export * from "./app/game/systems/pitReplay";',
    'export * from "./app/game/systems/pitStageJourney";',
    'export {resetPitTrainingPositions} from "./app/game/systems/pitTraining";',
    'export {getPitArenaArtPaths} from "./app/game/pitArenaRendering";',
    'export {resolvePitArenaProductionKit} from "./app/game/pitArenaProduction";',
    'export {PIT_ARENA_CATALOGUE} from "./app/game/systems/pitArenaCatalogue";',
  ].join('\n'), resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const p = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const routes = p.PIT_STAGE_JOURNEY_ROUTES.filter(route => route.release === 'V53');
const legacy = JSON.parse(await fs.readFile('tests/fixtures/pit-replay-v5-reserve-throw.json', 'utf8'));
const reader = p.createPitReplayReader(legacy), inputs = [];
while (!reader.done) inputs.push(reader.next().value.inputs);
const initial = (route, mode = 'training') => p.createPitCombatState('jungle-hunter', 'city-hunter', {
  arenaId: route.entry, stageJourney: route.id, mode,
});
function corner(route, side, mode = 'training') {
  const state = initial(route, mode);
  state.fighters[0].x = side === 1 ? 800 : 160;
  state.fighters[1].x = side === 1 ? 862 : 98;
  state.fighters[0].facing = side;
  state.fighters[1].facing = -side;
  return state;
}
function project(state, tech = false) {
  const states = [p.stepPitCombat(state, [{ throw: true }, {}])];
  let used = false;
  for (let tick = 0; tick < 55; tick++) {
    const current = states.at(-1), defence = tech && current.pendingThrow && !used ? { throw: true } : {};
    if (current.pendingThrow) used = true;
    states.push(p.stepPitCombat(current, [{}, defence]));
  }
  return { state: states.at(-1), states };
}

test('V53 adds eight original two-sector choices and preserves distinct entries and pure-duel arenas', () => {
  assert.equal(routes.length, 8);
  assert.equal(p.PIT_STAGE_JOURNEY_ROUTES.length, 13);
  for (const key of ['id', 'entry']) assert.equal(new Set(p.PIT_STAGE_JOURNEY_ROUTES.map(route => route[key])).size, 13);
  for (const route of routes) {
    assert.equal(p.getPitStageJourneyForArena(route.entry).id, route.id);
    assert.equal(p.getPitStageJourneyForArena(route.destination), undefined, 'No hidden multi-hop route');
    assert.notEqual(route.entry, route.destination);
    for (const id of [route.entry, route.destination]) {
      const entry = p.PIT_ARENA_CATALOGUE.find(value => value.runtimeArenaId === id);
      assert(entry && entry.number <= 80 && entry.referenceStudy === null);
      assert.equal(entry.rightsNote, 'original-project-art');
      assert.equal(entry.interactivePropsImplemented, false, 'Static bitmap props do not become interactive through a route');
    }
    assert.equal(p.createPitCombatState('jungle-hunter', 'city-hunter', { arenaId: route.entry }).stageJourney, undefined);
  }
});

for (const route of routes) {
  test(route.id + ': both real modular kits are ready, six planes each, same contact floor', async () => {
    assert.deepEqual(p.pitStageJourneyArtIds(route.entry, route.id), [route.entry, route.destination]);
    for (const id of [route.entry, route.destination]) {
      const arena = p.PIT_ARENAS[id];
      assert.deepEqual([arena.width, arena.height, arena.groundY, arena.leftWall, arena.rightWall], [960, 540, 430, 54, 906]);
      const kit = p.resolvePitArenaProductionKit(id);
      assert(kit && kit.requiredPaths.length > 0);
      assert.deepEqual(kit.planes.map(plane => plane.id), ['P0', 'P1', 'P2', 'P3', 'P4', 'P5']);
      const paths = p.getPitArenaArtPaths(id);
      assert(paths.length >= 6);
      for (const src of paths) {
        const metadata = await sharp('public' + src).metadata();
        assert(metadata.width > 0 && metadata.height > 0, src);
      }
    }
  });

  test(route.id + ': projection at either edge carries both slots once, with unchanged combat consequences', () => {
    for (const side of [-1, 1]) {
      const start = corner(route, side), bytes = p.serializePitCombat(start), neutral = structuredClone(start);
      delete neutral.stageJourney; delete neutral.rules.stageJourney;
      const result = project(start), control = project(neutral);
      assert.equal(p.serializePitCombat(start), bytes);
      const transfers = result.states.filter(state => state.events.some(event => event.type === 'stage-transfer'));
      assert.equal(transfers.length, 1);
      const transferred = transfers[0], same = control.states.find(state => state.frame === transferred.frame);
      assert.equal(transferred.stageJourney.exitSide, side);
      assert.deepEqual(transferred.fighters.map(fighter => fighter.x), side === 1 ? [300, 660] : [660, 300]);
      assert(transferred.fighters.every(fighter => fighter.grounded && fighter.y === 0));
      for (const slot of [0, 1]) for (const key of ['health', 'traque', 'roundsWon', 'stunFrames', 'knockdownFrames']) {
        assert.equal(transferred.fighters[slot][key], same.fighters[slot][key], key);
      }
      assert.equal(p.pitStageSceneArena(transferred), route.destination);
      assert.equal(transferred.arenaId, route.entry);
      assert.equal(project(result.state).states.flatMap(state => state.events).filter(event => event.type === 'stage-transfer').length, 0);
    }
  });

  test(route.id + ': restore at every tick, including capture and transfer, matches the replay exactly', () => {
    const replay = p.recordPitReplay(inputs, { fighters: legacy.fighters, arenaId: route.entry, rules: { mode: 'training', stageJourney: route.id } });
    assert.equal(replay.engineVersion, 6); assert.equal(replay.version, 3);
    let state = p.createPitCombatState(...replay.fighters, { arenaId: replay.arenaId, ...replay.rules }), captures = 0, transfers = 0;
    for (const input of inputs) {
      const bytes = p.serializePitCombat(state);
      const restored = p.deserializePitCombat(bytes);
      assert.equal(p.serializePitCombat(restored), bytes);
      if (restored.pendingThrow) captures++;
      state = p.stepPitCombat(restored, input);
      if (state.events.some(event => event.type === 'stage-transfer')) transfers++;
    }
    assert(captures > 0); assert.equal(transfers, 1);
    assert.equal(p.serializePitCombat(state), p.serializePitCombat(p.playPitReplay(replay)));
    assert.deepEqual(p.deserializePitReplay(p.serializePitReplay(replay)), replay);
    assert.equal(p.pitStageSceneArena(state), route.destination);
  });

  test(route.id + ': tech, KO, forged scenes and extra state are rejected; resets retain the selected rule', () => {
    assert.equal(project(corner(route, 1), true).state.stageJourney.sector, 'sas');
    const ko = corner(route, 1, 'match'); ko.fighters[1].health = 1;
    assert.equal(project(ko).state.stageJourney.sector, 'sas');
    const done = project(corner(route, 1)).state;
    for (const reset of [p.rematchPitCombat, p.resetPitTrainingPositions]) {
      const state = reset(done);
      assert.deepEqual(state.stageJourney, { id: route.id, sector: 'sas', transferFrame: null, exitSide: null });
      assert.equal(state.rules.stageJourney, route.id); assert.equal(state.frame, 0);
    }
    let round = project(corner(route, 1, 'match')).state;
    round.roundFramesRemaining = 1; round = p.stepPitCombat(round, [{}, {}]);
    for (let tick = 0; tick < p.PIT_ROUND_TRANSITION_FRAMES; tick++) round = p.stepPitCombat(round, [{}, {}]);
    assert.equal(round.round, 2); assert.equal(round.stageJourney.sector, 'sas'); assert.equal(round.rules.stageJourney, route.id);
    for (const arenaId of [route.destination, 'the-pit', routes.find(candidate => candidate.id !== route.id).entry]) {
      assert.throws(() => p.createPitCombatState('jungle-hunter', 'city-hunter', { arenaId, stageJourney: route.id }));
    }
    for (const patch of [
      { arenaId: route.destination },
      { stageJourney: { ...done.stageJourney, id: 'reserve-passage-v1' } },
      { stageJourney: { ...done.stageJourney, transferFrame: done.frame + 1 } },
      { stageJourney: { ...done.stageJourney, exitSide: 0 } },
      { stageJourney: { ...done.stageJourney, propDestroyed: true } },
    ]) assert.throws(() => p.deserializePitCombat(JSON.stringify({ ...done, ...patch })));
    const replay = p.recordPitReplay(inputs, { fighters: legacy.fighters, arenaId: route.entry, rules: { mode: 'training', stageJourney: route.id } });
    assert.equal(p.normalizePitReplay({ ...replay, arenaId: route.destination }), null);
    assert.equal(p.normalizePitReplay({ ...replay, engineVersion: 5 }), null);
  });
}

test('all five published V6 journey checksums and untouched V4/V5 fixtures remain stable', async () => {
  // Recorded from clean V52 runtime before adding the V53 registry entries.
  const checksums = {
    'reserve-passage-v1': '47ceba24',
    'convoy-quay-passage-v1': 'a1e0d27f',
    'shipyard-hold-passage-v1': 'a8a86f8d',
    'archive-echoes-passage-v1': '780b6ee3',
    'marsh-mangrove-passage-v1': 'da3fdfa5',
  };
  for (const [id, checksum] of Object.entries(checksums)) {
    const route = p.getPitStageJourneyDefinition(id);
    const replay = p.recordPitReplay(inputs, { fighters: legacy.fighters, arenaId: route.entry, rules: { mode: 'training', stageJourney: id } });
    assert.equal(replay.metadata.checksum, checksum); assert.equal(replay.metadata.ticks, 260);
  }
  for (const name of ['pit-replay-v4-throw.json', 'pit-replay-v5-reserve-throw.json']) {
    const fixture = JSON.parse(await fs.readFile('tests/fixtures/' + name, 'utf8'));
    const original = fixture.replay ?? fixture, replay = p.normalizePitReplay(original);
    assert(replay); assert.equal(replay.metadata.checksum, original.metadata.checksum);
    assert.equal(p.playPitReplay(replay).stageJourney, undefined);
  }
});
