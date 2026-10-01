import assert from 'node:assert/strict';
import { cageRoute, p } from './youth-cage-played-route.mjs';
import { solo, playSolo } from './solo-v66-played-route.mjs';
import { hunt, playHunt, stamp } from './solo-v67-played-route.mjs';
export { p, hunt, stamp };
export function firstTracksCompleted(at = stamp) {
  let save = solo.startSoloV66Campaign(cageRoute().save, at); assert(save);
  playSolo({ onStep(out) {
    save = out.receipts.length ? solo.withSoloV66Progress(save, out.receipts, out.state, at) : solo.withSoloV66Checkpoint(save, out.state, at);
    assert(save);
  } });
  return save;
}
export function huntCampaignRoute(origin = firstTracksCompleted(), options = {}) {
  let save = hunt.startSoloV67Campaign(origin, stamp); assert(save); const commits = [];
  const run = playHunt({ ...options, onStep(out) {
    const before = save;
    save = out.receipts.length ? hunt.withSoloV67Progress(save, out.receipts, out.state, stamp) : hunt.withSoloV67Checkpoint(save, out.state, stamp);
    assert(save, `save refused ${out.state.phase}:${out.state.tick}`);
    assert(hunt.soloV67MatchesSave(save));
    if (out.receipts.length) commits.push({ before, after: save, state: out.state, receipts: out.receipts });
  } });
  return { ...run, save, commits };
}
