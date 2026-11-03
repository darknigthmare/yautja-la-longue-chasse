import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const loader = homeworldSceneSsrV78(), art = loader.load('app/game/pitSpriteSheetAnimation.ts');
const combat = loader.load('app/game/systems/pitCombat.ts'), cues = loader.load('app/game/pitFighterPresentation.ts');
const finishers = loader.load('app/game/systems/pitFinishersV80.ts');
const { PitFinisherHudV80: Hud } = loader.load('app/game/PitFinisherHudV80.tsx');
const frame = cell => ({ pageId: 'body', rect: [cell * 8, 0, 8, 8], pivot: [4, 7], durationTicks: 60 });
const clip = (id, facing = 'right', loop = id === 'idle' || id === 'pit.presentation.dizzy', status = 'validated') =>
  ({ id, facing, loop, status, ticksPerSecond: 60, frames: [frame(0), frame(1), frame(2)] });
function definition(clips, { fighterId = 'jungle-hunter', variantId, id = 'v93-synthetic-lifecycle' } = {}) {
  return { fighterId, ...(variantId ? { variantId } : {}), bodyHeightPx: 6,
    atlas: { schemaVersion: 1, id, characterId: fighterId, variantId: variantId ?? 'synthetic-fixture', sourceKind: 'authored-frames', status: 'validated',
      pages: [{ id: 'body', src: '/game/sprites/v93/synthetic-lifecycle.png', width: 24, height: 8, status: 'validated', transparency: { mode: 'alpha' } }], clips } };
}
// These are declared synthetic pixels for actual loader/renderer tests, never
// substituted into the registry or claimed as delivered native illustrations.
function pixels(mode = 'valid') {
  const previous = { Image: globalThis.Image, document: globalThis.document };
  globalThis.Image = class {
    set src(value) { this.source = value; if (value) { this.complete = true; this.naturalWidth = 24; this.naturalHeight = 8; queueMicrotask(() => this.onload?.()); } }
    get src() { return this.source; }
  };
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, getContext() { return { clearRect() {}, drawImage() {}, putImageData() {}, getImageData() {
      if (mode === 'tainted') throw Error('Synthetic readback denied');
      const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      if (mode !== 'empty') for (let cell = 0; cell < 3; cell++) data.set([mode === 'duplicate' ? 50 : 50 + cell * 50, 80, 10, 255], (3 * canvas.width + cell * 8 + 3) * 4);
      return { data };
    } }; } }; return canvas;
  } };
  return () => Object.assign(globalThis, previous);
}
const view = patch => ({ phase: 'finisher-window', elapsedMs: 0, durationMs: 5000, round: 2,
  winnerSlot: 1, blocksSimulation: true, resultVisible: false, ...patch });
const load = (entry, options = {}) => art.loadPitSpriteSheetAnimations([entry.fighterId], [entry], { variants: [entry.variantId ?? null], ...options });
function context() {
  const calls = [], stack = [];
  return { calls, globalAlpha: .7, filter: 'sepia(.2)', shadowColor: '#123456', shadowBlur: 2, imageSmoothingEnabled: true,
    save() { stack.push([this.globalAlpha, this.filter, this.shadowColor, this.shadowBlur, this.imageSmoothingEnabled]); },
    restore() { [this.globalAlpha, this.filter, this.shadowColor, this.shadowBlur, this.imageSmoothingEnabled] = stack.pop(); },
    drawImage(...args) { calls.push(['drawImage', ...args]); }, translate(...args) { calls.push(['translate', ...args]); },
    rotate(...args) { calls.push(['rotate', ...args]); }, scale(...args) { calls.push(['scale', ...args]); } };
}

test('all five dedicated lifecycle families resolve actual decoded drawings, alongside the existing native idle', async () => {
  const restore = pixels();
  try {
    const families = ['intro', 'victory', 'defeat', 'dizzy', 'taunt'], entry = definition([clip('idle'), ...families.map(family => clip(`pit.presentation.${family}`))]);
    const bank = await load(entry), fighter = combat.createPitCombatState('jungle-hunter', 'city-hunter').fighters[0];
    assert.equal(bank.readyClipCount, 6);
    const presentations = { intro: { phase: 'intro-left', fighterSlot: 0 }, victory: { phase: 'round-result', winnerSlot: 0 },
      defeat: { phase: 'round-result', winnerSlot: 1 }, dizzy: {}, taunt: { phase: 'fight', fighterTaunts: [true, false] } };
    for (const family of families) {
      const options = { presentation: view({ ...presentations[family], elapsedMs: 1100 }) };
      const native = art.resolvePitSpriteSheetPresentation(bank, fighter, options);
      assert.equal(native.status, 'dedicated-animation'); assert.equal(native.frame.clip.id, `pit.presentation.${family}`);
      assert.equal(native.frame.frameIndex, 1); assert.equal(native.cue.kind, family);
    }
    assert.equal(art.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 60 }).resolved.frame.clip.id, 'idle');
    assert.equal(art.pitNativeTauntDurationV93(bank, fighter), 3000);
  } finally { restore(); }
});

test('dizzy loops only inside its cue while a taunt ends, reduced motion holds native final drawings', async () => {
  const restore = pixels();
  try {
    const entry = definition([clip('idle'), clip('pit.presentation.dizzy'), clip('pit.presentation.taunt')]);
    const bank = await load(entry), fighter = combat.createPitCombatState('jungle-hunter', 'city-hunter').fighters[0];
    const at = (elapsedMs, patch = {}, reducedMotion = false) => art.resolvePitSpriteSheetPresentation(bank, fighter, { presentation: view({ elapsedMs, ...patch }), reducedMotion });
    assert.equal(at(1100).frame.frameIndex, 1); assert.equal(at(3100).frame.frameIndex, 0);
    assert.equal(at(3100, { phase: 'fight', fighterTaunts: [true, false] }).frame.frameIndex, 2);
    for (const elapsedMs of [0, 1100, 3100]) {
      assert.equal(at(elapsedMs, {}, true).frame.frameIndex, 2);
      assert.equal(at(elapsedMs, { phase: 'fight', fighterTaunts: [true, false] }, true).frame.frameIndex, 2);
    }
    const roundDefeat = at(1000, { phase: 'round-result' });
    assert.equal(roundDefeat.cue.kind, 'defeat'); assert.equal(roundDefeat.frame.clip.id, 'idle'); assert.equal(roundDefeat.status, 'staged-held-pose');
    assert.notEqual(roundDefeat.frame.clip.id, 'pit.presentation.dizzy', 'Dizzy is never a replacement for every round defeat');
  } finally { restore(); }
});

test('native lookup preserves 31/62/65 tick boundaries at 30/60Hz, without advancing genuinely earlier times', async () => {
  const restore = pixels();
  try {
    const fighter = combat.createPitCombatState('jungle-hunter', 'city-hunter').fighters[0];
    for (const ticksPerSecond of [30, 60]) for (const boundary of [31, 62, 65]) {
      const native = { ...clip('pit.presentation.taunt'), ticksPerSecond,
        frames: [{ ...frame(0), durationTicks: boundary }, frame(1), frame(2)] };
      const bank = await load(definition([native])), ms = boundary * 1000 / ticksPerSecond;
      const at = elapsedMs => art.resolvePitSpriteSheetPresentation(bank, fighter,
        { presentation: view({ phase: 'fight', fighterTaunts: [true, false], elapsedMs }) }).frame.frameIndex;
      assert.equal(at(ms), 1, `${boundary}/${ticksPerSecond} must reach drawing two exactly`);
      assert.equal(at(ms - .000001), 0, 'A genuinely earlier sample must not be rounded forward');
      assert.equal(at(ms + .000001), 1);
    }
  } finally { restore(); }
});

test('looped taunts, wrong native side, draft, duplicate, empty, tainted or revoked banks never enable the command', async () => {
  const fighter = combat.createPitCombatState('jungle-hunter', 'city-hunter').fighters[0];
  for (const native of [clip('pit.presentation.taunt', 'right', true), clip('pit.presentation.taunt', 'left'), clip('pit.presentation.taunt', 'right', false, 'draft')]) {
    const restore = pixels(); try {
      assert.equal(art.pitNativeTauntDurationV93(await load(definition([clip('idle'), native])), fighter), null);
    } finally { restore(); }
  }
  for (const mode of ['duplicate', 'empty', 'tainted']) {
    const restore = pixels(mode); try {
      assert.equal(art.pitNativeTauntDurationV93(await load(definition([clip('pit.presentation.taunt')])), fighter), null);
    } finally { restore(); }
  }
  const restore = pixels(); try {
    const entry = definition([clip('pit.presentation.taunt')]), abort = new AbortController(), bank = await load(entry, { signal: abort.signal });
    assert.equal(art.pitNativeTauntDurationV93(bank, fighter), 3000);
    assert.equal(art.pitNativeTauntDurationV93({ ...bank }, fighter), null, 'Public bank shape is not private decoded evidence');
    abort.abort(); assert.equal(art.pitNativeTauntDurationV93(bank, fighter), null);
  } finally { restore(); }
});

test('native costume/facing are exact, drawing restores context and never mirrors, moves, revives or mutates combat', async () => {
  const restore = pixels();
  try {
    const variantId = 'ahab-avec-casque-0c8ceb1c95', otherVariant = 'ahab-sans-casque-91544a7fb2';
    const entry = definition([clip('pit.presentation.dizzy'), clip('pit.presentation.taunt')], { fighterId: 'user-ahab', variantId });
    const bank = await load(entry), state = combat.createPitCombatState('user-ahab', 'city-hunter', { variants: [variantId, null] });
    const fighter = state.fighters[0], before = combat.serializePitCombat(state);
    assert.equal(art.pitNativeTauntDurationV93(bank, fighter), 3000);
    assert.equal(art.pitNativeTauntDurationV93(bank, { ...fighter, facing: -1 }), null);
    assert.equal(art.pitNativeTauntDurationV93(bank, { ...fighter, variantId: otherVariant }), null);
    const ctx = context();
    assert(art.drawPitSpriteSheetPresentation(ctx, bank, fighter, 400, { presentation: view({ elapsedMs: 1100 }) }));
    assert.equal(ctx.calls.length, 1); assert.equal(ctx.calls[0][0], 'drawImage');
    assert.deepEqual([ctx.globalAlpha, ctx.filter, ctx.shadowColor, ctx.shadowBlur, ctx.imageSmoothingEnabled], [.7, 'sepia(.2)', '#123456', 2, true]);
    assert.equal(combat.serializePitCombat(state), before); assert.equal(fighter.health, combat.PIT_FIGHTERS[fighter.definitionId].maxHealth);
    assert.equal(cues.getPitFighterPresentationTreatment(cues.getPitFighterPresentationCue(0, view()), true).filter, 'none');
  } finally { restore(); }
});

test('finisher HUD preserves four actual choices and offers only an optional accessible gesture in its existing window', () => {
  const options = { mode: 'stylized', reducedGore: false, reducedMotion: false, narrative: false, replay: false, cpuWinner: false };
  const window = { ...finishers.createPitFinisherViewV80(), phase: 'window', key: 'synthetic-hud', profile: finishers.getPitFinisherProfileV80('jungle-hunter'),
    winnerSlot: 0, durationMs: 5000, elapsedMs: 200, options };
  const html = (patch = {}, taunt) => renderToStaticMarkup(React.createElement(Hud, { view: { ...window, ...patch }, onChoose() {}, onSkip() {}, taunt }));
  const optional = { available: true, active: false, keyLabel: 'T', onRequest() {} };
  assert.equal((html().match(/data-pit-finisher-choice=/g) || []).length, 4); assert.doesNotMatch(html(), /data-pit-taunt/);
  assert.match(html({}, optional), /data-pit-taunt="finisher-window"/); assert.match(html({}, optional), /Provocation · T/);
  for (const disabled of [{ ...optional, available: false }, { ...optional, active: true }]) assert.match(html({}, disabled), /data-pit-taunt="finisher-window" disabled=""/);
  assert.match(html({ options: { ...options, cpuWinner: true } }, optional), /data-pit-taunt="finisher-window" disabled=""/);
  assert.doesNotMatch(html({ phase: 'approach' }, optional), /data-pit-taunt/);
  assert.equal(html({ phase: 'complete' }, optional), '');
});
