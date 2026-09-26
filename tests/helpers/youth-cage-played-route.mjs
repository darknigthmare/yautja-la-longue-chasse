import assert from "node:assert/strict";
import { p, env, now, patrolRoute } from "./youth-patrol-played-route.mjs";
export { p, env, now };
export const patrol = patrolRoute();
export function cageInput(s) {
  if (!s.inputArmed) return {};
  if (s.phase === "patrol-complete") return { confirm: true };
  if (s.phase === "cage-defeat") return { retry: true };
  const a = s.player, r = s.rival, target = p.getYouthObjective(s).targetX;
  if (["cage-briefing", "cage-reward", "cage-return"].includes(s.phase)) {
    const delta = target - a.x, move = Math.abs(delta) > 18 ? delta < 0 ? -1 : 1 : 0;
    return { move, interact: !move && !s.previousButtons.interact };
  }
  if (s.phase === "cage-duel") {
    const d = r.x - a.x, facing = d < 0 ? -1 : 1;
    return a.action === "idle" && Math.abs(d) < 61 && a.facing === facing ? { light: !s.previousButtons.light } : { move: Math.abs(d) > 59 || a.facing !== facing ? facing : 0 };
  }
  return {};
}
/** Every proof comes from sampled controls; no actor coordinate, phase or health mutation. */
export function cageRoute({ initial = patrol, stop = "cage-complete", input = cageInput, restoreEvery = 0 } = {}) {
  let save = structuredClone(initial.save), state = structuredClone(initial.state);
  const receipts = [], phases = new Set([state.phase]), snapshots = {};
  for (let n = 0; n < 14000 && state.phase !== stop; n++) {
    if (restoreEvery && n % restoreEvery === 0) { state = p.normalizeYouthTraining(JSON.parse(JSON.stringify(state))); assert(state); }
    const out = p.stepYouthTraining(state, input(state), env); state = out.state; phases.add(state.phase);
    assert(p.normalizeYouthTraining(state), `cage normalizer ${state.phase}:${state.tick} ${JSON.stringify({ cage: state.cage, player: state.player, rival: state.rival })}`);
    save = out.receipts.length ? p.withYouthProgress(save, out.receipts, state, now) : p.withYouthCheckpoint(save, state);
    assert(save, `cage durable ${state.phase}:${state.tick}`); receipts.push(...out.receipts);
    snapshots[state.phase] ??= { state: structuredClone(state), save: structuredClone(save) };
  }
  assert.equal(state.phase, stop, JSON.stringify({ phase: state.phase, player: state.player, rival: state.rival }));
  return { state, save, receipts, phases, snapshots };
}
