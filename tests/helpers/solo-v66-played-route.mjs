import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../../scripts/homeworld-qa-model-v64.mjs';
export const solo = homeworldQaModelV64(process.cwd(), ['firstTracksSoloV66.ts', 'campaignSoloV66.ts']);
export const environment = { assetsReady: true, pageVisible: true, paused: false };
export const stamp = '2026-10-01T06:00:00.000Z';

/** Reads physical state to press controls; never teleports or writes milestone/health fields. */
export function soloInput(state, { falseTrail = true } = {}) {
  if (!state.inputArmed || state.phase === 'complete') return {};
  let target = solo.soloV66Objective(state).targetX;
  if (state.phase === 'trail' && state.clues === 2 && !state.falseTrailRead && falseTrail) target = solo.SOLO_V66_FALSE_TRAIL.x;
  if (state.phase === 'stalk' && state.player.x < 2090) {
    const animal = solo.soloV66Grazer(state);
    if (animal.facing === -1 || animal.turnIn < 230) target = 2025;
  }
  const a = state.player, delta = target - a.x, move = Math.abs(delta) > 6 ? delta < 0 ? -1 : 1 : 0;
  const ahead = solo.SOLO_V66_ROCKS.find(r => move > 0 ? r.x - 17 > a.x && r.x - 17 - a.x < 70 : r.x + r.width + 17 < a.x && a.x - r.x - r.width - 17 < 70);
  return { move, jump: !!ahead && a.vy === 0 && !state.previousJump,
    interact: !move && a.y === 430 && (['trail', 'stalk'].includes(state.phase) || !state.previousInteract) };
}
export function playSolo({ initial = solo.createSoloV66State(), stop = 'complete', input = soloInput, restoreEvery = 0, onStep = () => {} } = {}) {
  let state = structuredClone(initial); const receipts = [], snapshots = {}, transitions = [];
  for (let i = 0; i < 18000 && state.phase !== stop; i++) {
    if (restoreEvery && i % restoreEvery === 0) { state = solo.normalizeSoloV66State(JSON.parse(JSON.stringify(state))); assert(state); }
    const before = state, out = solo.stepSoloV66(state, input(state), environment); state = out.state;
    assert(solo.normalizeSoloV66State(state), `invalid ${JSON.stringify(state)}`);
    if (out.receipts.length || before.phase !== state.phase) transitions.push({ before: structuredClone(before), after: structuredClone(state), receipts: out.receipts });
    onStep(out, before); receipts.push(...out.receipts); snapshots[state.phase] ??= structuredClone(state);
  }
  assert.equal(state.phase, stop, JSON.stringify(state)); return { state, receipts, snapshots, transitions };
}
