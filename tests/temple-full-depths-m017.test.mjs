import assert from 'node:assert/strict';
import { test } from 'node:test';
import { thresholdsCampaignRoute } from './helpers/solo-v69-played-route.mjs';
import { templeCampaignRoute, templeEnvironment, templeInput, thresholdsTemple as p, stamp } from './helpers/solo-v70-played-route.mjs';
import { formationCampaignRoute } from './helpers/solo-v90-played-route.mjs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const prior = thresholdsCampaignRoute().save;
const ordered = { ...prior, prologue: { ...prior.prologue, templeTriadFirstM017: true } };
const waiting = formationCampaignRoute({ origin: ordered, stop: 'observe' }).save;
const runtime = homeworldSceneSsrV78();
const saves = runtime.load('app/game/save.ts');
const quatza = runtime.load('app/game/systems/quatzaRij.ts');
let completed, carrying;

test('the fifteen-room route reaches four new physical doors and records each observation in order', () => {
  let opened, warned;
  completed = templeCampaignRoute({ origin: waiting, restoreEvery: 61, input(state) {
    const extension = state.depthsM017?.extension;
    const gallery = extension?.gallery;
    if (gallery?.openedAt != null && !gallery.screened) opened ??= structuredClone(state);
    if (state.room === p.SOLO_V70_ROYAL_M017.room && extension?.royal?.startedAt != null && !extension.royal.evade)
      warned ??= structuredClone(state);
    if (state.room === p.SOLO_V70_RESCUE_M017.room && extension?.rescue?.pickedUp && !extension.rescue.delivered &&
        state.player.x > p.SOLO_V70_RESCUE_M017.pickup.x + 100) carrying ??= structuredClone(state);
    return templeInput(state);
  } });
  assert(opened);
  const restored = p.normalizeSoloV70State(JSON.parse(JSON.stringify(opened)));
  assert.deepEqual(restored.depthsM017.extension.gallery, opened.depthsM017.extension.gallery);
  assert(p.soloV70GalleryThreatM017(restored));
  assert.equal(p.soloV70CanTravel(restored, 11), false);

  function passHatch(jump) {
    let replay = structuredClone(restored);
    replay.tick = replay.depthsM017.extension.gallery.openedAt + 30;
    replay.player = { x: 832, y: 430, vx: 0, vy: 0, facing: -1 };
    replay.hurtTimer = 0;
    assert(p.normalizeSoloV70State(replay));
    replay = p.stepSoloV70(replay, {}, templeEnvironment).state;
    for (let tick = 0; tick < 9; tick++) {
      replay = p.stepSoloV70(replay, { move: -1, jump: jump && tick === 0 }, templeEnvironment).state;
    }
    return replay;
  }
  assert.equal(passHatch(false).health, restored.health - 1);
  assert.equal(passHatch(true).health, restored.health);
  const { state, save, transitions } = completed;
  const depth = state.depthsM017;
  assert(state.visited.every(Boolean));
  assert.equal(state.visited.length, 15);
  assert.deepEqual(Object.keys(depth.extension.observations), p.SOLO_V70_DEPTH_POSTS_M017.map(post => post.id));
  for (const candidate of p.SOLO_V70_DEPTH_POSTS_M017) {
    const post = p.soloV70DepthPostM017(candidate.room, true);
    const observation = depth.extension.observations[post.id];
    assert.equal(observation.configuration, 3);
    assert(Math.abs(observation.positions[0] - post.x) < 38);
    if (post.plates) assert(p.soloV70DepthAppuisM017(observation.positions.slice(1), post.plates));
    const crossing = transitions.find(t => t.before.room === post.room && t.after.room === post.room + 1);
    if (post.room < 14) {
      assert(crossing);
      assert.deepEqual(crossing.before.depthsM017.extension.observations[post.id], observation);
      const missing = structuredClone(crossing.before);
      delete missing.depthsM017.extension.observations[post.id];
      assert.equal(p.soloV70CanTravel(missing, post.room + 1), false);
    }
  }
  const { room, x, holdTicks } = p.soloV70HuntTargetM017(state);
  assert.equal(room, 14);
  assert(Math.abs(depth.huntThreshold.positions[0] - x) < 38);
  assert(depth.huntThreshold.tick >= depth.extension.observations['vent-purge'].tick + holdTicks);
  assert(depth.huntThreshold.tick < state.milestones.returned);
  assert.deepEqual(save.soloV90, waiting.soloV90);
  assert.equal(save.soloV70.receipts.length, 15);
  const { openedAt, screened } = depth.extension.gallery;
  assert(openedAt >= depth.extension.observations['eggs-observed'].tick + p.SOLO_V70_GALLERY_M017.hatchDelay);
  assert(screened.tick >= openedAt + p.SOLO_V70_GALLERY_M017.holdTicks);
  assert(p.soloV70CanTravel(transitions.find(t => t.before.room === 10 && t.after.room === 11).before, 11));
  const forged = structuredClone(save);
  forged.soloV70.checkpoint.depthsM017.extension.gallery.screened = null;
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  assert(warned);
  let grounded = p.normalizeSoloV70State(JSON.parse(JSON.stringify(warned)));
  const loge = p.SOLO_V70_ROYAL_M017;
  const start = grounded.depthsM017.extension.royal.startedAt, startHealth = grounded.health;
  assert.equal(p.soloV70RoyalStatusM017(grounded.depthsM017.extension, grounded.tick).stage, 'warning');
  assert.equal(p.soloV70CanTravel(grounded, loge.room + 1), false);
  for (let tick = 0; tick <= loge.warningTicks + loge.strikeTicks; tick++)
    grounded = p.stepSoloV70(grounded, {}, templeEnvironment).state;
  assert.equal(grounded.health, startHealth - 1);
  assert.equal(grounded.depthsM017.extension.royal.evade, null);
  const { evade } = depth.extension.royal;
  assert.equal(p.soloV70RoyalSweepM017(start, evade.tick).stage, 'strike');
  assert(evade.y <= loge.coverY && p.soloV70RoyalInSweepM017(evade.x));
  assert(depth.extension.observations['royal-lock'].tick > evade.tick);
  const erasedEvade = structuredClone(save);
  erasedEvade.soloV70.checkpoint.depthsM017.extension.royal.evade = null;
  assert.equal(saves.parseSaveImport(JSON.stringify(erasedEvade)).failure, 'invalid-save');
});

test('Saar is physically carried to the refuge and the position survives a cold import', () => {
  const temple = completed ?? templeCampaignRoute({ origin: waiting });
  const { room, pickup, relief, carrySpeed } = p.SOLO_V70_RESCUE_M017;
  const arrival = temple.transitions.find(({ before, after }) => before.room === room - 1 && after.room === room);
  assert(arrival);
  const wounded = arrival.after;
  assert.equal(wounded.companions[0].x, pickup.x);
  assert.equal(p.soloV70CanTravel(wounded, room - 1), false);
  const route = temple.state.depthsM017.extension;
  const { pickedUp, delivered } = route.rescue;
  assert(pickedUp.tick > route.observations['royal-lock'].tick);
  assert(delivered.tick > pickedUp.tick + relief.holdTicks);
  assert(delivered.tick < route.purgeStartedAt);
  assert(p.soloV70RescuePartyM017(pickedUp.positions));
  assert(p.soloV70RescuePartyM017(delivered.positions));

  assert(carrying);
  const archive = structuredClone(temple.save);
  archive.soloV70 = { ...archive.soloV70, status: 'active', completedAt: null,
    checkpoint: carrying, receipts: p.soloV70Receipts(carrying) };
  const imported = saves.parseSaveImport(saves.exportSave(archive));
  assert.equal(imported.failure, null);
  const restored = imported.save.soloV70.checkpoint;
  assert.deepEqual(restored, carrying);
  assert.equal(restored.companions[0].x, p.soloV70SaarCarryX(restored.player.x));

  const stepped = p.stepSoloV70(restored, { move: 1, jump: true }, templeEnvironment).state;
  assert.equal(stepped.player.y, relief.y);
  assert(Math.abs(stepped.player.x - restored.player.x - carrySpeed) < .01);
  assert(p.withSoloV70Checkpoint(imported.save, stepped, stamp));
  stepped.player.x += .5;
  stepped.companions[0].x = p.soloV70SaarCarryX(stepped.player.x);
  assert.equal(p.withSoloV70Checkpoint(imported.save, stepped, stamp), null);

  const erased = structuredClone(temple.save);
  erased.soloV70.checkpoint.depthsM017.extension.rescue.delivered = null;
  assert.equal(saves.parseSaveImport(JSON.stringify(erased)).failure, 'invalid-save');
});

test('an expired purge can be opened again at the upstream valve without losing observations', () => {
  let first, second, before;
  const run = templeCampaignRoute({ origin: waiting, input(state) {
    const extension = state.depthsM017?.extension;
    const started = extension?.purgeStartedAt;
    if (state.room === 14 && started != null) {
      if (first === undefined) {
        first = started;
        before = structuredClone(extension.observations);
      }
      if (started === first && p.soloV70PurgeRemainingM017(state)) return {};
      if (started !== first) second = started;
    }
    return templeInput(state);
  } });
  assert(second >= first + p.SOLO_V70_PURGE_M017.duration);
  const extension = run.state.depthsM017.extension;
  assert.equal(extension.purgeStartedAt, second);
  for (const [id, observation] of Object.entries(before)) assert.deepEqual(extension.observations[id], observation);
  assert(extension.observations['vent-purge'].tick - second < p.SOLO_V70_PURGE_M017.duration);
});

test('durable observations guard the actual Quatza admission and cannot mint rite or rank', () => {
  const temple = completed ?? templeCampaignRoute({ origin: waiting });
  const resumed = formationCampaignRoute({ origin: temple.save, restoreEvery: 4 }).save;
  const imported = saves.parseSaveImport(saves.exportSave(resumed));
  assert.equal(imported.failure, null);
  const begin = { type: 'begin', mode: 'triad', expectedAttempts: 0 };
  const accepted = quatza.commitQuatzaRij(imported.save, begin);
  assert(accepted.ok);
  assert.equal(accepted.state.expeditions.triad.attempts[0].phase, 'preparation');
  assert.deepEqual(imported.save.prologue.chronicle, waiting.prologue.chronicle);
  assert.deepEqual(imported.save.inventory, waiting.inventory);

  const forged = structuredClone(resumed);
  forged.soloV70.checkpoint.depthsM017.extension.observations['royal-lock'].positions[1] = 65;
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  assert.equal(quatza.commitQuatzaRij(forged, begin).ok, false);

  const early = structuredClone(resumed);
  early.soloV70.checkpoint.depthsM017.extension.observations['vent-purge'].tick =
    early.soloV70.checkpoint.depthsM017.extension.purgeStartedAt;
  assert.equal(saves.parseSaveImport(JSON.stringify(early)).failure, 'invalid-save');

  const removed = structuredClone(temple.state);
  delete removed.depthsM017.extension;
  assert.equal(p.withSoloV70Checkpoint(temple.save, removed, stamp), null);
});

test('an active eleven-room checkpoint still reaches the Gallery threshold without touching the new annex', () => {
  const archive = templeCampaignRoute({ origin: waiting, archiveRoomCount: 11, stop: 'return' });
  const imported = saves.parseSaveImport(saves.exportSave(archive.save));
  assert.equal(imported.failure, null);
  const resumed = p.startSoloV70Campaign(imported.save, stamp).soloV70.checkpoint;
  assert.equal(resumed.visited.length, 11);
  assert.equal(resumed.depthsM017.extension, undefined);
  assert.equal(p.soloV70HuntTargetM017(resumed).room, 10);
  assert.equal(p.soloV70CanTravel(resumed, 11), false);
});

test('an active fifteen-room archive without the Gallery encounter preserves its original gates', () => {
  const archive = templeCampaignRoute({ origin: waiting, archiveRoomCount: 15, restoreEvery: 317 });
  const crossing = archive.transitions.find(t => t.before.room === 10 && t.after.room === 11);
  assert(crossing.before.depthsM017.extension.observations['eggs-observed']);
  assert.equal(crossing.before.depthsM017.extension.gallery, undefined);
  assert.equal(p.soloV70CanTravel(crossing.before, 11), true);
  assert.equal(saves.parseSaveImport(saves.exportSave(archive.save)).failure, null);
});

test('the preceding Gallery archive keeps its open egg and original royal console', () => {
  const archive = templeCampaignRoute({ origin: waiting, legacyGallery: true, restoreEvery: 317 });
  const before = archive.transitions.find(t => t.before.room === 13 && t.after.room === 14).before;
  const extension = before.depthsM017.extension;
  assert(extension.gallery.screened);
  assert(extension.observations['royal-lock']);
  assert.equal(extension.royal, undefined);
  assert.equal(p.soloV70DepthPostM017(before.room).plates, undefined);
  assert.equal(saves.parseSaveImport(saves.exportSave(archive.save)).failure, null);
});

test('a fifteen-room royal archive can finish its original route without acquiring the wounded transport', () => {
  const archive = templeCampaignRoute({ origin: waiting, legacyRoyal: true, restoreEvery: 117 });
  const extension = archive.state.depthsM017.extension;
  assert(extension.royal.evade);
  assert(extension.observations['vent-purge']);
  assert.equal(extension.rescue, undefined);
  assert.equal(saves.parseSaveImport(saves.exportSave(archive.save)).failure, null);
});
