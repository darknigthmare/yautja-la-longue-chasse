import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../../scripts/homeworld-qa-model-v64.mjs';
import { cohortCampaignRoute, stamp } from './solo-v68-played-route.mjs';
export const thresholds = homeworldQaModelV64(process.cwd(), ['firstHuntSoloV69.ts', 'campaignSoloV69.ts']);
export { stamp };
export const environment = { assetsReady: true, pageVisible: true, paused: false };
export function thresholdsInput(s) {
  if (!s.inputArmed || s.phase === 'complete') return {};
  const a = s.player, target = thresholds.soloV69Objective(s).targetX;
  const move = Math.abs(target - a.x) > 6 ? target < a.x ? -1 : 1 : 0;
  const rock = thresholds.SOLO_V69_ROCKS.find(r => move > 0 ? r.x - 17 >= a.x && r.x - 17 - a.x < 45 : r.x + r.width + 17 <= a.x && a.x - r.x - r.width - 17 < 45);
  const jump = !!rock && a.vy === 0 && !s.previousJump;
  if (s.phase === 'escort') {
    const wantsWait = !s.waitingSignal && s.trainee.following && !move && s.trainee.x >= 4400 && s.trainee.x <= 4520;
    const wantsFollow = !s.trainee.following && (!s.waitingSignal || s.scouted) && Math.abs(s.trainee.x - a.x) < 100;
    return { move, jump, command: (wantsWait || wantsFollow) && !s.previousCommand, interact: !move && (!s.scouted && s.waitingSignal || !s.previousInteract) };
  }
  return { move, jump, command: ['signals', 'stealth'].includes(s.phase) && a.y === 430 && !jump,
    interact: !move && a.y === 430 && (['observation', 'signals', 'stealth', 'recognition'].includes(s.phase) || !s.previousInteract) };
}
/** Actual movement, sensing, timers and command inputs. No coordinates or receipts injected. */
export function playThresholds({ initial = thresholds.createSoloV69State(), stop = 'complete', input = thresholdsInput, restoreEvery = 0, onStep = () => {} } = {}) {
  let state = structuredClone(initial); const receipts = [], snapshots = {}, transitions = [];
  for (let i = 0; i < 50000 && state.phase !== stop; i++) {
    if (restoreEvery && i % restoreEvery === 0) { state = thresholds.normalizeSoloV69State(JSON.parse(JSON.stringify(state))); assert(state); }
    const before = state, out = thresholds.stepSoloV69(state, input(state), environment); state = out.state;
    assert(thresholds.normalizeSoloV69State(state), 'invalid ' + JSON.stringify(state));
    if (out.receipts.length || before.phase !== state.phase) transitions.push({ before: structuredClone(before), after: structuredClone(state), receipts: out.receipts });
    onStep(out, before); receipts.push(...out.receipts); snapshots[state.phase] ??= structuredClone(state);
  }
  assert.equal(state.phase, stop, JSON.stringify(state)); return { state, receipts, snapshots, transitions };
}
export function thresholdsCampaignRoute({ origin = cohortCampaignRoute().save, ...options } = {}) {
  let save = thresholds.startSoloV69Campaign(origin, stamp); assert(save); const commits = [];
  const run = playThresholds({ ...options, onStep(out) {
    const before = save;
    save = out.receipts.length ? thresholds.withSoloV69Progress(save, out.receipts, out.state, stamp) : thresholds.withSoloV69Checkpoint(save, out.state, stamp);
    assert(save, 'save refused ' + out.state.phase + ':' + out.state.tick); assert(thresholds.soloV69MatchesSave(save));
    if (out.receipts.length) commits.push({ before, after: save, state: out.state, receipts: out.receipts });
  } });
  return { ...run, save, commits, origin };
}
