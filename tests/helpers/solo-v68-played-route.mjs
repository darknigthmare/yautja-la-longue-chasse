import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../../scripts/homeworld-qa-model-v64.mjs';
import { huntInput } from './solo-v67-played-route.mjs';
import { huntCampaignRoute, stamp } from './solo-v67-campaign-route.mjs';
export const cohort = homeworldQaModelV64(process.cwd(), ['firstHuntSoloV68.ts', 'campaignSoloV68.ts']);
export { stamp };
export const environment = { assetsReady: true, pageVisible: true, paused: false };
export function cohortInput(s, route = 'ridge') {
  if (!s.inputArmed || s.phase === 'complete') return {};
  if (s.phase === 'encounter') return huntInput(s, route);
  let target = cohort.soloV68Objective(s).targetX;
  if (s.phase === 'route') target = cohort.SOLO_V68_PREPARATION.find(r => r.route === route).x;
  const a = s.player, move = Math.abs(target - a.x) > 6 ? target < a.x ? -1 : 1 : 0;
  const rock = cohort.soloV68Rocks(s.route).find(r => move > 0 ? r.x - 17 >= a.x && r.x - 17 - a.x < 64 : r.x + r.width + 17 <= a.x && a.x - r.x - r.width - 17 < 64);
  return { move, jump: !!rock && a.vy === 0 && !s.previousJump, interact: !move && a.y === 430 && (['tracks', 'relay', 'medicine', 'rescue', 'recognition'].includes(s.phase) || !s.previousInteract) };
}
/** Walks every actor through actual input/AI simulation; no altered positions or fabricated receipts. */
export function playCohort({ initial = cohort.createSoloV68State(), stop = 'complete', route = 'ridge', input = s => cohortInput(s, route), restoreEvery = 0, onStep = () => {} } = {}) {
  let state = structuredClone(initial), walked = 0; const receipts = [], snapshots = {}, transitions = [];
  for (let i = 0; i < 35000 && state.phase !== stop; i++) {
    if (restoreEvery && i % restoreEvery === 0) { state = cohort.normalizeSoloV68State(JSON.parse(JSON.stringify(state))); assert(state); }
    const before = state, out = cohort.stepSoloV68(state, input(state), environment); state = out.state; walked += Math.abs(state.player.x - before.player.x);
    assert(cohort.normalizeSoloV68State(state), `invalid ${JSON.stringify(state)}`);
    if (out.receipts.length || before.phase !== state.phase) transitions.push({ before: structuredClone(before), after: structuredClone(state), receipts: out.receipts });
    onStep(out, before); receipts.push(...out.receipts); snapshots[state.phase] ??= structuredClone(state);
  }
  assert.equal(state.phase, stop, JSON.stringify(state)); return { state, receipts, snapshots, transitions, walked };
}
export function cohortCampaignRoute({ origin = huntCampaignRoute().save, ...options } = {}) {
  let save = cohort.startSoloV68Campaign(origin, stamp); assert(save); const commits = [];
  const run = playCohort({ ...options, onStep(out) {
    const before = save;
    save = out.receipts.length ? cohort.withSoloV68Progress(save, out.receipts, out.state, stamp) : cohort.withSoloV68Checkpoint(save, out.state, stamp);
    assert(save, `save refused ${out.state.phase}:${out.state.tick}`); assert(cohort.soloV68MatchesSave(save));
    if (out.receipts.length) commits.push({ before, after: save, state: out.state, receipts: out.receipts });
  } });
  return { ...run, save, commits, origin };
}
