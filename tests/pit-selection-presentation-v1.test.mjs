import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

async function load(path) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(path, import.meta.url))], bundle: true,
    platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const presentation = await load('../app/game/systems/pitSelectionPresentationV1.ts');
const selection = await load('../app/game/systems/pitSelectionFlow.ts');
const player = Object.freeze({ fighterId: 'jungle-hunter', variantId: null, personal: false });
const opponent = Object.freeze({ fighterId: 'city-hunter', variantId: null, personal: false });
const present = (state, slot, phase, identity = slot === 'player' ? player : opponent) =>
  presentation.reducePitSelectionPresentationV1(state, { type: 'present', slot, phase, identity });
const settle = (state, slot, generation = state[slot].generation) =>
  presentation.reducePitSelectionPresentationV1(state, { type: 'settle', slot, generation });

test('presentation of both confirmations leaves stage admission in the existing selection reducer', () => {
  let ui = presentation.createPitSelectionPresentationV1(player, opponent);
  const initial = selection.createPitSelectionState();
  let choice = initial;
  ui = present(ui, 'player', 'confirm');
  choice = selection.reducePitSelection(choice, { type: 'confirm', player: player.fighterId, opponent: opponent.fighterId });
  assert.equal(choice.step, 'fighters');
  assert.equal(choice.slot, 'opponent');
  assert.equal(ui.player.phase, 'confirm');
  ui = settle(ui, 'player');
  assert.equal(ui.player.phase, 'waiting');
  ui = presentation.reducePitSelectionPresentationV1(ui, { type: 'team', player, opponent });
  assert.equal(choice.step, 'fighters', 'presentation alone cannot launch or admit a stage');
  choice = selection.reducePitSelection(choice, { type: 'confirm', player: player.fighterId, opponent: opponent.fighterId });
  assert.equal(choice.step, 'stage');
  const beforeDeparture = structuredClone(choice);
  ui = presentation.reducePitSelectionPresentationV1(ui, { type: 'depart', player, opponent });
  assert.equal(ui.player.phase, 'depart');
  assert.equal(ui.opponent.phase, 'depart');
  assert.deepEqual(choice, beforeDeparture);
  assert.deepEqual(initial, selection.createPitSelectionState());
});

test('a late completion cannot replace a newer costume or selected identity', () => {
  const initial = presentation.createPitSelectionPresentationV1(player, opponent);
  const confirmed = present(initial, 'player', 'confirm');
  const costume = { ...player, variantId: 'jungle-hunter-avec-casque-53f4eb349a' };
  const changed = present(confirmed, 'player', 'costume', costume);
  assert.equal(settle(changed, 'player', confirmed.player.generation), changed);
  assert.equal(changed.player.phase, 'costume');
  const next = present(changed, 'player', 'preview', { ...player, fighterId: 'scar' });
  assert.equal(settle(next, 'player', changed.player.generation), next);
  assert.equal(next.player.identity.fighterId, 'scar');
  assert.equal(initial.player.identity.variantId, null);
});

test('player and opponent gestures settle independently during rapid navigation', () => {
  let ui = present(presentation.createPitSelectionPresentationV1(player, opponent), 'player', 'confirm');
  const playerGeneration = ui.player.generation;
  ui = present(ui, 'opponent', 'costume', { ...opponent, variantId: 'other-appearance' });
  const opponentCue = ui.opponent;
  ui = settle(ui, 'player', playerGeneration);
  assert.equal(ui.player.phase, 'waiting');
  assert.equal(ui.opponent, opponentCue);
  ui = settle(ui, 'opponent');
  assert.equal(ui.opponent.phase, 'preview');
  assert.equal(ui.opponent.identity.variantId, 'other-appearance');
});

test('pointer hover cannot reopen a choice or interrupt a costume/deselection cue', () => {
  let ui = present(presentation.createPitSelectionPresentationV1(player, opponent), 'player', 'confirm');
  assert.equal(present(ui, 'player', 'hover'), ui);
  ui = settle(ui, 'player');
  assert.equal(present(ui, 'player', 'hover'), ui);
  const unconfirmed = present(ui, 'player', 'deselect');
  assert.equal(present(unconfirmed, 'player', 'hover'), unconfirmed);
  assert.equal(unconfirmed.player.phase, 'deselect');
  assert.equal(settle(unconfirmed, 'player').player.phase, 'preview');
  const changed = present(ui, 'player', 'costume');
  assert.equal(present(changed, 'player', 'hover'), changed);
});

test('a mode-driven change and the campaign Yautja cannot borrow another appearance cue', () => {
  const ui = present(presentation.createPitSelectionPresentationV1(player, opponent), 'player', 'confirm');
  for (const different of [{ ...player, personal: true }, { ...player, variantId: 'unmasked' }, { ...player, fighterId: 'wolf' }]) {
    const cue = presentation.currentPitSelectionCueV1(ui.player, different);
    assert.equal(cue.phase, 'preview');
    assert.deepEqual(cue.identity, different);
  }
  assert.equal(presentation.currentPitSelectionCueV1(ui.player, player), ui.player);
});

test('reopening J1 still invalidates J2 in the authoritative selection flow', () => {
  let choice = selection.createPitSelectionState();
  for (let i = 0; i < 2; i++) choice = selection.reducePitSelection(choice, { type: 'confirm', player: player.fighterId, opponent: opponent.fighterId });
  choice = selection.reducePitSelection(choice, { type: 'edit', slot: 'player' });
  let ui = presentation.reducePitSelectionPresentationV1(presentation.createPitSelectionPresentationV1(player, opponent), { type: 'team', player, opponent });
  const oldGeneration = ui.player.generation;
  ui = present(ui, 'player', 'deselect');
  ui = present(ui, 'opponent', 'preview');
  assert.equal(settle(ui, 'player', oldGeneration), ui);
  assert.equal(choice.confirmedPlayer, null);
  assert.equal(choice.confirmedOpponent, null);
  assert.equal(choice.step, 'fighters');
  assert.equal(presentation.pitSelectionCueDurationV1(ui.player.phase), 240);
  assert.equal(presentation.pitSelectionCueLabelV1(ui.player.phase, false), 'CHOIX ROUVERT');
});
