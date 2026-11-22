import assert from 'node:assert/strict';

/** Exercise the production reducers for the two witnesses and the Elder assembly
 * before starting a separate mission's browser proof. */
export function recognizeElderThroughAssembly(qa, admission) {
  const mentoring = qa.load('app/game/systems/elderMentoringV168.ts');
  const judgment = qa.load('app/game/systems/elderPassageJudgmentV168.ts');
  const assembly = qa.load('app/game/systems/elderAssemblyV168.ts');
  let save = admission;
  function apply(field, reducer, operation, position) {
    const result = reducer(save, { operation, position, expectedRevision: save[field]?.revision ?? 0 });
    assert.ok(result.ok, result.message);
    save = { ...save, [field]: result.state };
  }
  const teach = (operation, position) => apply('elderMentoringV168', mentoring.commitElderMentoring, operation, position);
  for (const side of ['west', 'east']) teach({ type: 'prepare', side }, mentoring.MENTORING_SUPPORTS[side]);
  teach({ type: 'begin', choice: 'alone' }, mentoring.MENTORING_POST);
  teach({ type: 'watch' }, mentoring.MENTORING_POST);
  teach({ type: 'watch' }, mentoring.mentoringLookout(save.elderMentoringV168));
  teach({ type: 'report' }, mentoring.MENTORING_MENTOR);

  const judge = (operation, position) => apply('elderPassageJudgmentV168', judgment.commitElderPassageJudgment, operation, position);
  for (const side of ['west', 'east']) judge({ type: 'read-trace', side }, judgment.PASSAGE_TRACES[side]);
  judge({ type: 'replay' }, judgment.PASSAGE_START);
  judge({ type: 'test', trial: { method: 'schedule', delay: 3 } }, judgment.PASSAGE_START);
  judge({ type: 'settle' }, judgment.PASSAGE_WITNESS);

  const convene = operation => apply('elderAssemblyV168', assembly.commitElderAssembly, operation);
  convene({ type: 'hear', act: 'judgment' });
  convene({ type: 'hear', act: 'mentoring' });
  convene({ type: 'accept', responsibility: 'travel' });
  return save;
}
