import assert from 'node:assert/strict';
import { admitEliteCampaign, qa } from './elite-recognition-played-v175.mjs';
import { HOUSE, regions, saves, withResidenceO6, yard } from './origin-training-yard-o6.mjs';

export { HOUSE, regions, saves };
export const continuation = qa.load('app/game/systems/originContinuationO6.ts');
export const practice = qa.load('app/game/systems/originPracticeO6.ts');
const endings = qa.load('app/game/systems/originEndingsV170.ts');
const clan = qa.load('app/game/systems/clanChronicle.ts');
const ceremony = qa.load('app/game/systems/eliteRecognitionV174.ts');
const trialRules = qa.load('app/game/systems/eliteClanRitesV175.ts');
const drill = qa.load('app/game/systems/trainingDrill.ts');
const nursery = qa.load('app/game/systems/nurseryPrologue.ts');
const continuity = qa.load('app/game/systems/nurseryContinuityV72.ts');
const cohort = qa.load('app/game/systems/nurseryCohortV172.ts');

const nurseryEnvironment = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: true };

function playedCourtyard(choice) {
  let state = nursery.enableNurseryCohort(continuity.enableNurseryContinuityV72(nursery.createNurseryPrologue({ readyMode: 'press' })));
  const step = input => { state = nursery.stepNurseryPrologue(state, input, nurseryEnvironment).state; };
  const cards = () => continuity.nurseryStoryCardV72(state);
  for (let tick = 0; tick < 7000 && state.phase !== 'cohort'; tick++) {
    const distance = Math.abs(state.player.x - state.rival.x);
    const input = !state.inputArmed ? {} : cards() ? { confirm: tick % 32 === 0 } :
      state.phase === 'ready' ? { ready: tick % 32 === 0 } : state.phase === 'duel' ? {
        move: distance > 44 ? Math.sign(state.rival.x - state.player.x) : 0, light: tick % 30 === 0,
      } : {};
    step(input);
  }
  assert.equal(state.phase, 'cohort');
  const walkAndPress = (target, input) => {
    step({});
    for (let i = 0; i < 300 && Math.abs(state.cohortV172.x - target) > 8; i++) {
      step({ move: Math.sign(target - state.cohortV172.x) });
    }
    assert.ok(Math.abs(state.cohortV172.x - target) <= 8);
    step({});
    step(input);
  };
  for (const [index, station] of cohort.NURSERY_COHORT_STOPS.slice(0, 6).entries()) {
    walkAndPress(station.x, index === 0 ? { pickup: true } : { confirm: true });
    assert.equal(state.cohortV172.steps, index + 1);
  }
  walkAndPress(cohort.NURSERY_COHORT_CHOICES[choice].x, { confirm: true });
  assert.equal(state.cohortV172.choice, choice);
  walkAndPress(cohort.NURSERY_COHORT_STOPS[6].x, { confirm: true });
  for (let tick = 0; tick < 7000 && state.phase !== 'complete'; tick++) step({ confirm: tick % 32 === 0 });
  assert.equal(state.phase, 'complete');
  assert.ok(nursery.normalizeNurseryCheckpoint(state));
  return state;
}

let earnedElite;
function playedElite() {
  if (earnedElite) return structuredClone(earnedElite);
  let save = admitEliteCampaign();
  const posts = ceremony.ELITE_RECOGNITION_POSTS;
  const commit = (operation, position) => {
    const result = ceremony.commitEliteRecognition(save, { operation, position, expectedRevision: save.eliteRecognitionV174?.revision ?? 0 });
    assert.ok(result.ok, result.message);
    save = { ...save, eliteRecognitionV174: result.state, ...(result.prologue ? { prologue: result.prologue } : {}) };
  };
  commit({ type: 'audience', audience: 'restricted' }, posts.entry);
  for (const proof of ['mastery', 'crown', 'hunt']) commit({ type: 'present', proof }, posts[proof]);
  commit({ type: 'hear' }, posts.restricted);
  commit({ type: 'mark' }, posts.mark);
  for (const trial of trialRules.ELITE_CLAN_TRIALS) {
    let state = drill.startTrainingDrill(drill.createTrainingDrill(trial.disciplineId, trial.seed, trial.clanPlasma));
    const trace = [];
    for (const action of state.sequence) {
      state = drill.stepTrainingDrill(state, 0.12);
      trace.push({ action, elapsedSeconds: state.cueElapsedSeconds });
      state = drill.submitTrainingDrillAction(state, action).state;
    }
    assert.equal(state.status, 'complete');
    commit({ type: 'trial', id: trial.id, trace }, posts.entry);
  }
  commit({ type: 'recognize' }, posts.mark);
  assert.equal(clan.getChronicleRank(save.prologue.chronicle), 'elite');
  earnedElite = save;
  return structuredClone(save);
}

export function regionContextO6(save) {
  return { rankId: save.profile.rankId, regionAllowed: id => regions.canEnterHomeworldRegionV68(save, id).allowed };
}

export function walkO6(save, target) {
  let next = save.homeworldRegionV68;
  for (let tick = 0; tick < 900 && Math.hypot(next.actor.x - target.x, next.actor.y - target.y) > 15; tick++) {
    const dx = target.x - next.actor.x, dy = target.y - next.actor.y;
    next = regions.stepHomeworldRegionV68(next, {
      x: Math.abs(dx) > 5 ? Math.sign(dx) : 0, y: Math.abs(dy) > 5 ? Math.sign(dy) : 0,
    });
  }
  assert.ok(Math.hypot(next.actor.x - target.x, next.actor.y - target.y) <= 15, 'Reach the actual post by walking');
  assert.ok(regions.canAdvanceHomeworldRegionV68(save.homeworldRegionV68, next));
  return { ...save, homeworldRegionV68: next };
}

export function continuationAdmissionO6(choice = 'help', endingId = 'O6-E1') {
  let save = playedElite();
  // Compose an actually played nursery result with the already completed rank itinerary.
  save.prologue = { ...save.prologue, checkpoint: playedCourtyard(choice) };
  save = withResidenceO6(save);
  for (const order of yard.TRAINING_YARD_ORDERS_O6) {
    save = walkO6(save, yard.TRAINING_YARD_POSTS_O6[order]);
    const changed = yard.applyTrainingYardO6(save.originV151, save.residenceV149, save.homeworldRegionV68, regionContextO6(save), order);
    assert.ok(changed);
    save.originV151 = changed;
  }
  if (endingId) {
    const selection = { rankId: clan.getChronicleRank(save.prologue.chronicle), atWorkshop: true };
    const inspected = endings.examineEndingV170(save.originV151, endingId, selection);
    assert.ok(inspected.ok, inspected.reason);
    const confirmed = endings.confirmEndingV170(inspected.state, endingId, endingId, selection);
    assert.ok(confirmed.ok, confirmed.reason);
    save.originV151 = confirmed.state;
  }
  const loaded = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(loaded.save, loaded.failure);
  return loaded.save;
}
