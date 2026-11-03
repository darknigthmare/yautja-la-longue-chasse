import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../../scripts/homeworld-qa-model-v64.mjs';
export const hunt = homeworldQaModelV64(process.cwd(), ['firstHuntSoloV67.ts', 'campaignSoloV67.ts']);
export const environment = { assetsReady: true, pageVisible: true, paused: false };
export const stamp = '2026-10-01T12:00:00.000Z';

/** Input-only driver: physical positions are read, never teleported or fabricated. */
export function huntInput(s, route = 'ridge') {
  if (!s.inputArmed || s.phase === 'complete') return {};
  const a = s.player, b = s.prey;
  let target = hunt.soloV67Objective(s).targetX;
  if (s.phase === 'preparation') target = hunt.SOLO_V67_PREPARATION.find(p => p.route === route).x;
  if (s.phase === 'encounter') {
    // Approach the animal, then cross its charge in the air. Close the distance only during recovery.
    if (b.phase === 'watch') target = b.x + (a.x < b.x ? -130 : 130);
    else if (b.phase === 'charge' && (b.x - a.x) * b.facing > 95) target = b.x - b.facing * 80;
    else if (b.phase === 'telegraph' || b.phase === 'charge') target = a.x;
    else target = b.x + (a.x < b.x ? -75 : 75);
    const move = Math.abs(target - a.x) > 5 ? target < a.x ? -1 : 1 : 0;
    const toward = b.x < a.x ? -1 : 1;
    const distance = Math.abs(b.x - a.x);
    return { move: b.phase === 'recover' && distance < 95 ? a.facing !== toward ? toward : 0 : move,
      jump: b.phase === 'charge' && distance < 150 && a.vy === 0 && !s.previousJump,
      attack: b.phase === 'recover' && distance < 95 && a.facing === toward && a.y === 430 && !a.cooldown && !s.previousAttack };
  }
  const move = Math.abs(target - a.x) > 6 ? target < a.x ? -1 : 1 : 0;
  const rock = hunt.soloV67Rocks(s.route).find(r => move > 0 ? r.x - 17 >= a.x && r.x - 17 - a.x < 64 : r.x + r.width + 17 <= a.x && a.x - r.x - r.width - 17 < 64);
  return { move, jump: !!rock && a.vy === 0 && !s.previousJump,
    interact: !move && a.y === 430 && (['tracks', 'approach', 'proof'].includes(s.phase) || !s.previousInteract) };
}
export function playHunt({ initial = hunt.createSoloV67State(), stop = 'complete', route = 'ridge', input = s => huntInput(s, route), restoreEvery = 0, onStep = () => {} } = {}) {
  let state = structuredClone(initial); const receipts = [], snapshots = {}, transitions = [];
  for (let i = 0; i < 24000 && state.phase !== stop; i++) {
    if (restoreEvery && i % restoreEvery === 0) { state = hunt.normalizeSoloV67State(JSON.parse(JSON.stringify(state))); assert(state); }
    const before = state, out = hunt.stepSoloV67(state, input(state), environment); state = out.state;
    assert(hunt.normalizeSoloV67State(state), `invalid ${JSON.stringify(state)}`);
    if (out.receipts.length || before.phase !== state.phase) transitions.push({ before: structuredClone(before), after: structuredClone(state), receipts: out.receipts });
    onStep(out, before); receipts.push(...out.receipts); snapshots[state.phase] ??= structuredClone(state);
  }
  assert.equal(state.phase, stop, JSON.stringify(state)); return { state, receipts, snapshots, transitions };
}
