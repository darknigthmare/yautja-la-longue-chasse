import assert from 'node:assert/strict';
import { admitEliteCampaign } from './elite-recognition-played-v175.mjs';
import { qa, saves } from './clan-ship-trophy-hearing-fixture.mjs';
import { completeLongMemoryAdmission } from './long-memory-r2-m055.mjs';

const elite = qa.load('app/game/systems/eliteRecognitionV174.ts');
const clan = qa.load('app/game/systems/eliteClanRitesV175.ts');
const drill = qa.load('app/game/systems/trainingDrill.ts');
const passage = qa.load('app/game/systems/elderPassageJudgmentV168.ts');
const mentoring = qa.load('app/game/systems/elderMentoringV168.ts');
const assembly = qa.load('app/game/systems/elderAssemblyV168.ts');
const chronicle = qa.load('app/game/systems/clanChronicle.ts');

function playEliteTrial(trial) {
  let state = drill.startTrainingDrill(drill.createTrainingDrill(trial.disciplineId, trial.seed, trial.clanPlasma));
  return state.sequence.map(action => {
    state = drill.stepTrainingDrill(state, 0.12);
    const input = { action, elapsedSeconds: state.cueElapsedSeconds };
    state = drill.submitTrainingDrillAction(state, action).state;
    return input;
  });
}

export function elderAssemblyBeforeRelief() {
  let save = admitEliteCampaign();
  const posts = elite.ELITE_RECOGNITION_POSTS;
  function recognize(operation, position) {
    const result = elite.commitEliteRecognition(save, { operation, position, expectedRevision: save.eliteRecognitionV174?.revision ?? 0 });
    assert.ok(result.ok, result.message);
    save = { ...save, eliteRecognitionV174: result.state, ...(result.prologue ? { prologue: result.prologue } : {}) };
  }
  recognize({ type: 'audience', audience: 'restricted' }, posts.entry);
  for (const proof of ['mastery', 'crown', 'hunt']) recognize({ type: 'present', proof }, posts[proof]);
  recognize({ type: 'hear' }, posts.restricted);
  recognize({ type: 'mark' }, posts.mark);
  for (const trial of clan.ELITE_CLAN_TRIALS) recognize({ type: 'trial', id: trial.id, trace: playEliteTrial(trial) }, posts.entry);
  recognize({ type: 'recognize' }, posts.mark);
  assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), 'elite');
  // The fixture supplies the career threshold instead of replaying hunts for points.
  save = { ...save, profile: { ...save.profile, honor: 9000 } };

  function judge(operation, position) {
    const result = passage.commitElderPassageJudgment(save, { operation, position, expectedRevision: save.elderPassageJudgmentV168?.revision ?? 0 });
    assert.ok(result.ok, result.message);
    save = { ...save, elderPassageJudgmentV168: result.state };
  }
  for (const side of ['west', 'east']) judge({ type: 'read-trace', side }, passage.PASSAGE_TRACES[side]);
  judge({ type: 'replay' }, passage.PASSAGE_START);
  judge({ type: 'test', trial: { method: 'schedule', delay: 3 } }, passage.PASSAGE_START);
  judge({ type: 'settle' }, passage.PASSAGE_WITNESS);

  function guide(operation, position) {
    const result = mentoring.commitElderMentoring(save, { operation, position, expectedRevision: save.elderMentoringV168?.revision ?? 0 });
    assert.ok(result.ok, result.message);
    save = { ...save, elderMentoringV168: result.state };
  }
  for (const side of ['west', 'east']) guide({ type: 'prepare', side }, mentoring.MENTORING_SUPPORTS[side]);
  guide({ type: 'begin', choice: 'alone' }, mentoring.MENTORING_POST);
  guide({ type: 'watch' }, mentoring.MENTORING_POST);
  guide({ type: 'watch' }, mentoring.mentoringLookout(save.elderMentoringV168));
  guide({ type: 'report' }, mentoring.MENTORING_MENTOR);
  for (const operation of [{ type: 'hear', act: 'mentoring' }, { type: 'hear', act: 'judgment' },
    { type: 'accept', responsibility: 'council' }]) {
    const result = assembly.commitElderAssembly(save, { operation, expectedRevision: save.elderAssemblyV168?.revision ?? 0 });
    assert.ok(result.ok, result.message);
    save = { ...save, elderAssemblyV168: result.state };
  }
  const parsed = saves.parseSaveImport(saves.exportSave(save));
  assert.ok(parsed.save, parsed.failure);
  return parsed.save;
}

export function narrativeLongMemoryAdmission() {
  const save = elderAssemblyBeforeRelief();
  const relief = assembly.commitElderAssembly(save, {
    operation: { type: 'confirm-relief' }, expectedRevision: save.elderAssemblyV168.revision,
  });
  assert.ok(relief.ok, relief.message);
  const elder = { ...save, elderAssemblyV168: relief.state, prologue: relief.prologue };
  assert.equal(chronicle.getChronicleRank(elder.prologue.chronicle), 'elder');
  return completeLongMemoryAdmission(elder);
}
