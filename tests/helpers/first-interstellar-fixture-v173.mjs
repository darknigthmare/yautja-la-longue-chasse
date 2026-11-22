import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from './ship-receipt-v161.mjs';

export const qa = homeworldSceneSsrV78();
export const saves = qa.load('app/game/save.ts');
const nursery = qa.load('app/game/systems/nurseryPrologue.ts');
const nurseryCampaign = qa.load('app/game/systems/nurseryCampaign.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const progression = qa.load('app/game/systems/progression.ts');
const preparation = qa.load('app/game/systems/shipPreparationV88.ts');
const layout = qa.load('app/game/systems/shipLevelLayout.ts');
export const OWNER = '2026-11-22T12:00:00.000Z';
export const SHIP = 'classic-predator-spaceship';

function nurseryEnding() {
  const environment = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };
  let state = nursery.createNurseryPrologue({ readyMode: 'press' });
  let receipt = null;
  for (let frame = 0; frame < 2400 && state.phase !== 'complete'; frame += 1) {
    const distance = Math.abs(state.rival.x - state.player.x);
    let input = {};
    if (state.inputArmed && state.phase === 'prompt') input = { confirm: frame % 2 === 0 };
    if (state.inputArmed && state.phase === 'ready') input = { ready: frame % 2 === 0 };
    if (state.inputArmed && state.phase === 'duel') {
      const move = distance > 44 ? Math.sign(state.rival.x - state.player.x) : 0;
      input = { move, light: frame % 30 === 0 };
    }
    const result = nursery.stepNurseryPrologue(state, input, environment);
    state = result.state;
    receipt = result.completion ?? receipt;
  }
  assert.equal(state.phase, 'complete');
  assert.ok(receipt);
  return { state, receipt };
}

export function firstVoyageAdmissionV173({ prepared = false } = {}) {
  const start = { ...saves.defaultSave(OWNER), prologue: nurseryCampaign.createNurseryCampaign() };
  const ending = nurseryEnding();
  let save = nurseryCampaign.withNurseryCompletion(start, ending.receipt, ending.state, OWNER);
  assert.ok(save);
  // The chapters after the nursery are a test fixture. Browser proof starts at the cockpit.
  let history = save.prologue.chronicle;
  for (const rite of chronicle.CHRONICLE_RITES.slice(1, 3)) {
    for (const id of rite.requiredEvidenceIds) {
      const proof = chronicle.CHRONICLE_EVIDENCE.find(candidate => candidate.id === id);
      history = chronicle.recordChronicleEvidence(history, { id, sourceId: proof.sourceId }).state;
    }
    history = chronicle.performChronicleRite(history, { id: rite.id, sourceId: rite.sourceId }).state;
  }
  assert.equal(chronicle.getChronicleRank(history), 'blooded');
  save = playShipAcquisitionV161(qa, { ...save, prologue: { ...save.prologue, chronicle: history } });
  const fleet = progression.createDefaultShipProgression(save, OWNER);
  assert.equal(fleet.selectedShipId, SHIP);
  if (prepared) {
    const context = { save, shipId: SHIP, selectedMissionId: 'R2-M023', fleet, active: true, focused: true, suspended: false };
    const stations = [...layout.SHIP_LEVEL_STATIONS.filter(station => station.id !== 'launch-airlock'),
      layout.SHIP_LEVEL_STATIONS.find(station => station.id === 'launch-airlock')];
    let preflight;
    for (const { id, x, y } of stations) {
      const result = preparation.inspectShipPreparationV88(preflight, { stationId: id, x, y }, context);
      assert.equal(result.accepted, true, result.message);
      preflight = result.state;
    }
    assert.equal(preparation.evaluateShipPreparationV88(preflight, context).ready, true);
    save = { ...save, shipPreparationV88: preflight };
  }
  const normalized = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(normalized.save, normalized.failure);
  return { save: normalized.save, fleet, fleetKey: progression.SHIP_PROGRESSION_STORAGE_KEY };
}
