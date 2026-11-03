import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: [
  'export * from "./app/game/systems/pitRoundPresentation";',
  'export {createPitCombatState,stepPitCombat,PIT_FIGHTERS,PIT_ROUND_FRAMES,PIT_ROUND_TRANSITION_FRAMES,serializePitCombat} from "./app/game/systems/pitCombat";',
  'export {createPitReplayRecorder,createPitReplayReader,playPitReplay,PIT_REPLAY_MAX_TICKS} from "./app/game/systems/pitReplay";',
].join('\n'), loader: 'ts', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const pair = ['jungle-hunter', 'city-hunter'];
const blank = [{}, {}];
const combat = () => api.createPitCombatState(...pair);
function ended(reason, winner = 0, decisive = false) {
  const state = combat();
  if (decisive) state.fighters[winner].roundsWon = 1;
  if (reason === 'ko') state.fighters[1 - winner].health = 0;
  else if (reason === 'double-ko') state.fighters.forEach(fighter => { fighter.health = 0; });
  else {
    state.roundFramesRemaining = 1;
    if (reason === 'timeout') state.fighters[1 - winner].health = Math.floor(state.fighters[1 - winner].health / 2);
  }
  return api.stepPitCombat(state, blank);
}
function finishPresentation(view, state) {
  for (let guard = 0; guard < 100 && view.blocksSimulation && !view.resultVisible; guard++) view = api.advancePitRoundPresentation(view, state, 100);
  return view;
}

test('real KO, timeout, double KO and drawn rounds map to the correct presentation without changing the engine', () => {
  for (const [reason, winner] of [['ko', 0], ['ko', 1], ['timeout', 0], ['timeout', 1], ['double-ko', null], ['draw', null]]) {
    const state = ended(reason, winner ?? 0);
    assert.equal(state.phase, 'round-over');
    assert.equal(state.lastRoundResult.reason, reason);
    const before = api.serializePitCombat(state);
    const shown = api.observePitRoundPresentation(api.createPitRoundPresentation(combat()), state);
    assert.equal(shown.phase, 'round-result');
    assert.equal(shown.winnerSlot, winner);
    assert.equal(shown.blocksSimulation, false, 'Historic inter-round ticks remain part of the replay');
    assert.equal(shown.resultVisible, false);
    api.advancePitRoundPresentation(shown, state, 100);
    assert.equal(api.serializePitCombat(state), before, 'Presentation cannot alter health, round ownership or combat timing');
  }
});

test('a completed historic transition immediately starts a frozen countdown, including a drawn round', () => {
  for (const reason of ['ko', 'double-ko', 'draw']) {
    let state = ended(reason), presentation = api.createPitRoundPresentation(state);
    const endFrame = state.frame;
    for (let tick = 1; tick <= api.PIT_ROUND_TRANSITION_FRAMES; tick++) {
      state = api.stepPitCombat(state, blank);
      presentation = api.observePitRoundPresentation(presentation, state);
      assert.equal(state.frame, endFrame + tick);
      if (tick < api.PIT_ROUND_TRANSITION_FRAMES) {
        assert.equal(state.phase, 'round-over');
        assert.equal(presentation.phase, 'round-result');
      }
    }
    assert.equal(state.round, 2);
    assert.equal(state.roundFramesRemaining, api.PIT_ROUND_FRAMES);
    assert.equal(presentation.phase, 'countdown');
    assert.equal(presentation.countdown, 3);
    assert.equal(presentation.blocksSimulation, true);
    assert.equal(state.events.filter(event => event.type === 'round-start').length, 1);
    assert.deepEqual(state.fighters.map(fighter => fighter.health), pair.map(id => api.PIT_FIGHTERS[id].maxHealth));
    const untouched = api.serializePitCombat(state);
    presentation = finishPresentation(presentation, state);
    assert.equal(presentation.phase, 'fight');
    assert.equal(api.serializePitCombat(state), untouched);
  }
});

test('a decisive KO or timeout shows the actual winner and delays only the terminal UI, never progression state', () => {
  for (const winner of [0, 1]) for (const reason of ['ko', 'timeout']) {
    const state = ended(reason, winner, true);
    assert.equal(state.phase, 'match-over');
    assert.equal(state.matchWinnerId, pair[winner]);
    const before = api.serializePitCombat(state);
    let presentation = api.createPitRoundPresentation(state);
    assert.equal(presentation.phase, 'match-result');
    assert.equal(presentation.winnerSlot, winner);
    assert.equal(presentation.resultVisible, false);
    presentation = finishPresentation(presentation, state);
    assert.equal(presentation.resultVisible, true);
    assert.equal(presentation.blocksSimulation, true);
    assert.equal(api.serializePitCombat(state), before);
    assert.equal(state.events.filter(event => event.type === 'match-end').length, 1);
  }
});

function recordRealMatch() {
  let state = combat(), presentation = api.createPitRoundPresentation(state);
  const recorder = api.createPitReplayRecorder({ fighters: pair, seed: 0x51a7 });
  let presentationUpdates = 0, transitionTicks = 0;
  for (let safety = 0; safety < api.PIT_REPLAY_MAX_TICKS && state.phase !== 'match-over'; safety++) {
    if (presentation.blocksSimulation) {
      const before = api.serializePitCombat(state), ticksBefore = recorder.tickCount;
      presentation = api.advancePitRoundPresentation(presentation, state, 100);
      assert.equal(api.serializePitCombat(state), before);
      assert.equal(recorder.tickCount, ticksBefore);
      presentationUpdates++;
      continue;
    }
    let inputs = blank;
    if (state.phase === 'round') {
      const [attacker, defender] = state.fighters;
      if (defender.x - attacker.x > 72) inputs = [{ right: true }, {}];
      else if (defender.phase !== 'knockdown' && defender.wakeInvulnerabilityFrames === 0 && attacker.phase === 'idle') inputs = [{ attack: 'heavy' }, {}];
    } else transitionTicks++;
    recorder.append(inputs);
    state = api.stepPitCombat(state, inputs);
    presentation = api.observePitRoundPresentation(presentation, state);
  }
  assert.equal(state.phase, 'match-over', 'The fight is won by real engine inputs, not by patched health');
  return { state, replay: recorder.finish(), presentationUpdates, transitionTicks };
}

test('presentation delays are absent from a full valid replay while historic round-result ticks stay identical', () => {
  const result = recordRealMatch();
  assert(result.presentationUpdates >= 84, 'Initial intros/countdown plus round-two countdown ran outside combat ticks');
  assert.equal(result.transitionTicks, api.PIT_ROUND_TRANSITION_FRAMES);
  const replayed = api.playPitReplay(result.replay);
  assert.deepEqual(replayed, result.state);
  assert.equal(replayed.fighters[0].roundsWon, 2);
  assert.equal(replayed.fighters[1].health, 0);
  const reader = api.createPitReplayReader(result.replay);
  let state = combat(), presentation = api.createPitRoundPresentation(state), frozenUpdates = 0;
  for (let guard = 0; guard < api.PIT_REPLAY_MAX_TICKS && state.phase !== 'match-over'; guard++) {
    if (presentation.blocksSimulation) {
      const cursor = reader.tick;
      presentation = api.advancePitRoundPresentation(presentation, state, 100);
      assert.equal(reader.tick, cursor);
      frozenUpdates++;
      continue;
    }
    const tick = reader.next(); assert.equal(tick.done, false);
    state = api.stepPitCombat(state, tick.value.inputs);
    presentation = api.observePitRoundPresentation(presentation, state);
  }
  assert.equal(frozenUpdates, result.presentationUpdates);
  assert.deepEqual(state, replayed);
  assert.equal(reader.tick, state.frame);
});

test('training keeps its existing exact tick clock and never receives match presentation delays', () => {
  let state = api.createPitCombatState(...pair, { mode: 'training' });
  let presentation = api.createPitRoundPresentation(state);
  assert.equal(presentation.phase, 'fight');
  assert.equal(api.canPitPresentationAcceptInput(presentation), true);
  for (let tick = 1; tick <= 10; tick++) {
    state = api.stepPitCombat(state, [{ right: true }, {}]);
    presentation = api.observePitRoundPresentation(presentation, state);
    assert.equal(state.frame, tick);
    assert.equal(state.roundFramesRemaining, api.PIT_ROUND_FRAMES);
    assert.equal(presentation.blocksSimulation, false);
    assert.equal(presentation.resultVisible, false);
  }
});
