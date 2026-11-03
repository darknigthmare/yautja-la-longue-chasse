import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../../scripts/homeworld-qa-model-v64.mjs';
import { templeCampaignRoute, stamp } from './solo-v70-played-route.mjs';
export { stamp };
export const formationModel = homeworldQaModelV64(process.cwd(), ['firstHuntSoloV90.ts', 'campaignSoloV90.ts']);
export const formationEnvironment = { assetsReady: true, pageVisible: true, paused: false };
export function formationInput(s, mode = 'success') {
  if (!s.inputArmed || s.phase === 'complete') return {};
  const a = s.player;
  if (s.phase === 'combat') {
    if (mode === 'assisted') return { move: a.x < 2730 ? 1 : a.x > 2740 ? -1 : 0 };
    if (mode === 'retreated') return { move: a.x > 2220 ? -1 : 0, interact: a.x <= 2220 && !s.previousInteract };
    const d = s.drone, target = d.mode === 'recover' ? d.x - 65 : 2450;
    const move = Math.abs(target - a.x) > 5 ? Math.sign(target - a.x) : 0;
    return { move, jump: a.y === 430 && !s.previousJump && (d.mode === 'telegraph' && d.age > 23 || d.mode === 'lunge' || s.acid.ttl > 0 && Math.abs(s.acid.x - a.x) < 80), command: d.mode === 'recover' && s.attackCooldown === 0 && !s.previousCommand && Math.abs(a.x - d.x) < 100 && a.y > 335 };
  }
  const objective = formationModel.soloV90Objective(s), move = Math.abs(objective.targetX - a.x) > 4 ? Math.sign(objective.targetX - a.x) : 0;
  const command = s.phase === 'assemble' && s.roleMode !== 'posts' && !move && !s.previousCommand;
  const held = ['arsenal', 'assemble', 'observe', 'debrief'].includes(s.phase);
  return { move, command, interact: !move && (held || !s.previousInteract) };
}
let cachedOrigin;
/** New chapter uses ordinary inputs and real command replay only. Previous
 * chapter comes from its existing played-route helper, never a rank fixture. */
export function formationCampaignRoute({ origin = cachedOrigin ??= templeCampaignRoute().save, mode = 'success', stop = 'complete', restoreEvery = 0, onCommit = () => {} } = {}) {
  const p = formationModel;
  let save = p.startSoloV90Campaign(origin, stamp); assert(save);
  let state = structuredClone(save.soloV90.checkpoint);
  const commits = [], snapshots = {};
  for (let i = 0; i < 50_000 && state.phase !== stop; i++) {
    const before = state, output = p.stepSoloV90(state, formationInput(state, mode), formationEnvironment);
    state = output.state; assert(p.normalizeSoloV90State(state), 'Invalid physical state: ' + JSON.stringify(state));
    if (output.receipts.length || p.soloV90NeedsImmediateCheckpoint(before, state)) {
      const previous = save;
      save = output.receipts.length ? p.withSoloV90Progress(save, output.receipts, state, stamp) : p.withSoloV90Checkpoint(save, state, stamp);
      assert(save, 'Refused actual commands: ' + JSON.stringify(state));
      assert(p.soloV90MatchesSave(save));
      const commit = { before: previous, after: save, state: structuredClone(state), receipts: output.receipts };
      commits.push(commit); onCommit(commit);
      state = { ...state, replay: [] };
      if (restoreEvery && commits.length % restoreEvery === 0) state = p.normalizeSoloV90State(JSON.parse(JSON.stringify(save.soloV90.checkpoint)));
    }
    snapshots[state.phase] ??= structuredClone(state);
  }
  assert.equal(state.phase, stop, JSON.stringify(state));
  return { state, save, commits, snapshots, origin };
}
