import assert from 'node:assert/strict';
import { test } from 'node:test';
import { thresholdsCampaignRoute } from './helpers/solo-v69-played-route.mjs';
import { templeCampaignRoute, thresholdsTemple as p, stamp } from './helpers/solo-v70-played-route.mjs';
import { formationCampaignRoute } from './helpers/solo-v90-played-route.mjs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const { descent, hunt } = p.SOLO_V70_DEPTHS_M017;
const modules = homeworldSceneSsrV78();
const saves = modules.load('app/game/save.ts');
const quatza = modules.load('app/game/systems/quatzaRij.ts');
const prior = thresholdsCampaignRoute().save;
const waiting = formationCampaignRoute({
  origin: { ...prior, prologue: { ...prior.prologue, templeTriadFirstM017: true } },
  stop: 'observe',
}).save;
let opened;
const completed = () => opened ??= templeCampaignRoute({ origin: waiting, archiveRoomCount: 11, restoreEvery: 53 });

test('after the actual Vanne receipt, the Depths require a stationed relay and a physical triad hunt threshold', () => {
  const temple = completed();
  const atValve = temple.commits.find(c => c.receipts[0].id === 'quarantine-valves');
  assert(atValve.after.soloV70.checkpoint.riteAdmission.threshold);
  assert.equal(p.soloV70CanTravel(atValve.before.soloV70.checkpoint, descent.room), false);
  assert.equal(p.soloV70CanTravel(atValve.state, descent.room), true);
  assert.equal(p.soloV70CanTravel(atValve.state, atValve.state.room - 1), false);
  assert.equal(p.soloV70AllowsTriadHuntM017(atValve.after), false);
  const descentDoors = temple.transitions.filter(t => t.after.room === descent.room);
  const gallery = temple.transitions.find(t => t.after.room === hunt.room);
  assert.equal(descentDoors[0].before.room, atValve.state.room);
  assert(p.soloV70DepthPlatesReadyM017(gallery.before.depthsM017.relay.positions.slice(1)));
  assert.equal(p.soloV70CanTravel({ ...gallery.before, tick: gallery.before.depthsM017.relay.tick + descent.openingTicks - 1 }, hunt.room), false);
  assert(p.soloV70CanTravel(gallery.before, hunt.room));
  assert.deepEqual(temple.state.depthsM017.relay, gallery.before.depthsM017.relay);
  assert.equal(temple.state.depthsM017.huntThreshold.configuration, 3);
  const [player, saar, vek] = temple.state.depthsM017.huntThreshold.positions;
  assert(Math.abs(player - hunt.x) < 38 && Math.abs(saar - player) < 185 && Math.abs(vek - player) < 185);
  assert(temple.state.depthsM017.huntThreshold.tick < temple.state.milestones.returned);
  assert.deepEqual(temple.save.soloV90, waiting.soloV90);
  assert.equal(temple.save.soloV70.receipts.length, 15);
  assert(temple.state.visited.every(Boolean));
});

test('the completed native V90 handoff admits Quatza-Rij after the threshold without granting an outcome or equipment', () => {
  const temple = completed();
  assert.equal(quatza.canEnterQuatza(temple.save, 'triad'), false);
  const finished = formationCampaignRoute({ origin: temple.save, restoreEvery: 4 }).save;
  const parsed = saves.parseSaveImport(saves.exportSave(finished));
  assert.equal(parsed.failure, null);
  assert.deepEqual(parsed.save.soloV70.checkpoint.depthsM017, temple.state.depthsM017);
  assert.equal(quatza.canEnterQuatza(parsed.save, 'triad'), true);
  assert.deepEqual(parsed.save.prologue.chronicle, waiting.prologue.chronicle);
  assert.deepEqual(parsed.save.inventory, waiting.inventory);
  assert.equal(parsed.save.quatzaRij, waiting.quatzaRij);

  const forged = structuredClone(finished);
  forged.soloV70.checkpoint.depthsM017.huntThreshold.positions[2] = 65;
  assert.equal(quatza.canEnterQuatza(forged, 'triad'), false);
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  const missing = structuredClone(finished);
  missing.soloV70.checkpoint.depthsM017.huntThreshold = null;
  assert.equal(saves.parseSaveImport(JSON.stringify(missing)).failure, 'invalid-save');
  const wrong = structuredClone(finished);
  wrong.soloV70.checkpoint.depthsM017.relay.tick = wrong.soloV70.checkpoint.depthsM017.huntThreshold.tick;
  assert.equal(saves.parseSaveImport(JSON.stringify(wrong)).failure, 'invalid-save');
  const mutated = structuredClone(temple.state);
  mutated.depthsM017.huntThreshold.tick++;
  assert.equal(p.withSoloV70Checkpoint(temple.save, mutated, stamp), null);
});

test('existing nine-room campaigns, including prior triad-first saves, keep their exact route', () => {
  const archive = templeCampaignRoute({ stop: 'return' });
  const historical = archive.state;
  const valve = p.SOLO_V70_QUARANTINE_THRESHOLD.room;
  assert.equal(historical.room, valve);
  assert.equal(historical.visited.length, 9);
  assert.equal(historical.depthsM017, undefined);
  assert.equal(p.soloV70CanTravel(historical, valve - 1), true);
  assert.equal(p.soloV70CanTravel(historical, descent.room), false);
  const beforeExpansion = { ...waiting, soloV70: archive.save.soloV70 };
  assert.equal(saves.parseSaveImport(saves.exportSave(beforeExpansion)).failure, null);
  assert.deepEqual(p.startSoloV70Campaign(beforeExpansion, stamp).soloV70, archive.save.soloV70);
  assert.equal(quatza.canEnterQuatza(formationCampaignRoute().save, 'triad'), true);
});
