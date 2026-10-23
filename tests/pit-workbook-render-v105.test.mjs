import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import sharp from 'sharp';

const built = await build({stdin: {contents: [
  "export * from './app/game/systems/pitCombat.ts';",
  "export * from './app/game/pitWorkbookRegistryV105.ts';",
  "export * from './app/game/pitWorkbookAnimationV100.ts';",
  "export * from './app/game/pitSpriteSheetAnimation.ts';",
  "export * from './app/game/hunterSpriteAtlas.ts';",
  "export * from './app/game/hunterSpriteMotion.ts';",
].join('\n'), resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent'});
const p = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const definitions = [...p.PIT_WORKBOOK_MOVE_REGISTRY_V105, ...p.PIT_WORKBOOK_PRESENTATION_REGISTRY_V105];
const source = (fighterId, actionId) => p.getPitWorkbookNativeV100(fighterId, actionId).definition;
const phases = ['startup', 'active', 'recovery'];

test('V105 binds seven safe BODY actions and ten presentations while partner composites stay studies', () => {
  assert.equal(p.PIT_WORKBOOK_BODY_MOVES_V105.length, 7);
  assert.equal(p.PIT_WORKBOOK_BODY_PRESENTATIONS_V105.length, 10);
  assert.equal(definitions.length, 17);
  assert.equal(definitions.reduce((sum, definition) => sum + definition.atlas.clips.length, 0), 58);
  for (const definition of definitions) {
    assert.equal(definition.variantId, undefined);
    assert.equal(p.validateHunterSpriteAtlas(definition.atlas).valid, true, definition.atlas.id);
    assert.ok(definition.atlas.clips.every(clip => !/TH_F|TH_B|FATALITE|CLEMENCE/.test(clip.id)));
  }
  for (const fighter of ['feral-hunter', 'scar']) for (const key of ['TH_F', 'TH_B', 'FATALITE_1', 'FATALITE_2', 'CLEMENCE']) {
    const prefix = key.startsWith('TH') ? 'M_' : 'CIN_';
    assert.equal(p.getPitWorkbookRuntimeBindingV105(fighter, prefix + (fighter === 'scar' ? 'F003_' : 'F006_') + key), null);
  }
});

test('all phase bindings preserve native rectangles, pivots, orientation, scale metadata and source deadlines', () => {
  for (const [index, definition] of p.PIT_WORKBOOK_MOVE_REGISTRY_V105.entries()) {
    const move = p.PIT_WORKBOOK_BODY_MOVES_V105[index], original = source(move.fighterId, move.actionId);
    for (const clip of definition.atlas.clips) {
      const phase = clip.id.split('.').at(-1);
      assert.ok(phases.includes(phase));
      assert.equal(clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0), move[phase]);
      assert.ok(move[phase] > 0); // EQUIP never invents an active drawing or attack phase.
      const native = original.atlas.clips.find(item => item.facing === clip.facing);
      for (const frame of clip.frames) {
        assert.ok(native.frames.some(item => item.pageId === frame.pageId &&
          JSON.stringify(item.rect) === JSON.stringify(frame.rect) && JSON.stringify(item.pivot) === JSON.stringify(frame.pivot)));
        assert.equal(definition.pageBodyHeightPx?.[frame.pageId], original.pageBodyHeightPx?.[frame.pageId]);
      }
    }
  }
  for (const [index, definition] of p.PIT_WORKBOOK_PRESENTATION_REGISTRY_V105.entries()) {
    const scene = p.PIT_WORKBOOK_BODY_PRESENTATIONS_V105[index], original = source(scene.fighterId, scene.actionId);
    for (const clip of definition.atlas.clips) assert.deepEqual(clip.frames, original.atlas.clips.find(item => item.facing === clip.facing).frames);
  }
});

function start(move, facing) {
  let state = p.createPitCombatState(move.fighterId, move.fighterId === 'scar' ? 'feral-hunter' : 'scar', {mode: 'training', normalMoves: 'workbook-v105'});
  state.fighters[0].x = facing === 1 ? 150 : 800;
  state.fighters[1].x = facing === 1 ? 800 : 150;
  state.fighters[0].facing = facing;
  state.fighters[0].traque = p.PIT_MAX_TRAQUE;
  const input = move.key === '6M' ? {attack: 'medium', [facing === 1 ? 'right' : 'left']: true}
    : {workbookAction: move.key === 'EQUIP' ? 'equipment' : move.key === 'S4' ? 'counter' : 'contact'};
  return p.stepPitCombat(state, [input, {}]);
}

test('render binding rejects forged source action identities and keeps the authored standing posture', () => {
  const move = p.PIT_WORKBOOK_BODY_MOVES_V105.find(move => move.key === '6M');
  const state = start(move, 1), fighter = state.fighters[0];
  fighter.crouching = true;
  assert.equal(p.describePitHunterSpriteMotion(fighter, state.frame).posture, 'stand');
  for (const change of [
    action => {action.kind = 'equipment';},
    action => {action.attack = 'light';},
    action => {action.normalMove = '5M';},
    action => {action.workbookMove = 'S1';},
  ]) {
    const forged = structuredClone(fighter); change(forged.action);
    assert.equal(p.describePitHunterSpriteMotion(forged, state.frame), null);
  }
  const historical = {...fighter, normalMovesRecipe: 'workbook-v104'};
  assert.equal(p.describePitHunterSpriteMotion(historical, state.frame), null);
});

/** Actual PNG decoding and the production alpha/crop/contact validator are used,
 * including the stricter metadata checks absent from atlas-schema validation. */
test('production decoder admits all58 clips and real simulation ticks select every native action/presentation frame', async () => {
  const pages = [...new Map(definitions.flatMap(definition => definition.atlas.pages).map(page => [page.src, page])).values()];
  const decoded = new Map();
  for (const page of pages) {
    const {data, info} = await sharp('public' + page.src).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    decoded.set(page.src, {pixels: new Uint8ClampedArray(data), width: info.width, height: info.height});
  }
  const previous = {Image: globalThis.Image, document: globalThis.document};
  globalThis.Image = class {set src(value) {
    if (!value) return;
    const native = decoded.get(value);
    if (!native) {queueMicrotask(() => this.onerror?.()); return;}
    Object.assign(this, native); this.complete = true; this.naturalWidth = native.width; this.naturalHeight = native.height;
    queueMicrotask(() => this.onload?.());
  }};
  globalThis.document = {createElement() {
    const canvas = {width: 0, height: 0, pixels: null};
    canvas.getContext = () => ({
      clearRect() {canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);},
      drawImage(image, ...args) {
        const [x, y, width, height] = args.length === 8 ? args.slice(0, 4) : [0, 0, image.width, image.height];
        assert.equal(width, canvas.width); assert.equal(height, canvas.height);
        canvas.pixels = new Uint8ClampedArray(width * height * 4);
        for (let row = 0; row < height; row++) canvas.pixels.set(image.pixels.subarray(((y + row) * image.width + x) * 4, ((y + row) * image.width + x + width) * 4), row * width * 4);
      },
      getImageData() {return {data: canvas.pixels.slice()};},
      putImageData(image) {canvas.pixels = image.data.slice();},
    });
    return canvas;
  }};
  try {
    const bank = await p.loadPitSpriteSheetAnimations(['feral-hunter', 'scar'], definitions);
    assert.deepEqual(bank.failedAtlasIds, []); assert.equal(bank.readyClipCount, 58);
    for (const move of p.PIT_WORKBOOK_BODY_MOVES_V105) for (const facing of [-1, 1]) {
      let state = start(move, facing);
      const original = source(move.fighterId, move.actionId);
      const total = move.startup + move.active + move.recovery;
      for (let tick = 0; tick < total; tick++) {
        const fighter = state.fighters[0];
        assert.equal(fighter.action?.workbookMove, move.key, move.actionId + '/' + tick);
        assert.equal(fighter.action.frame, tick);
        const frame = p.resolvePitSpriteSheetAnimation(bank, fighter, {simulationFrame: state.frame, combat: state});
        assert.ok(frame, move.actionId + '/' + facing + '/' + tick);
        assert.equal(frame.resolved.frame.clip.id, `pit.stand.workbook-v105.${move.key}.${fighter.phase}`);
        const native = p.resolveHunterSpriteAtlasFrame(original.atlas, 'workbook.' + move.actionId, facing === 1 ? 'right' : 'left', tick);
        assert.deepEqual(frame.resolved.frame.frame.rect, native.frame.rect);
        assert.deepEqual(frame.resolved.frame.frame.pivot, native.frame.pivot);
        assert.equal(frame.resolved.frame.page.src, native.page.src);
        state = p.stepPitCombat(state, [{}, {}]);
      }
      assert.equal(state.fighters[0].action, null);
    }
    for (const scene of p.PIT_WORKBOOK_BODY_PRESENTATIONS_V105) for (const facing of [-1, 1]) {
      const state = p.createPitCombatState(scene.fighterId, 'jungle-hunter', {normalMoves: 'workbook-v105'});
      const fighter = state.fighters[0]; fighter.facing = facing;
      const native = source(scene.fighterId, scene.actionId);
      const clip = native.atlas.clips.find(item => item.facing === (facing === 1 ? 'right' : 'left'));
      const totalTicks = clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
      const kind = scene.key === 'INTRO' ? 'intro' : scene.key === 'VICTOIRE' ? 'victory' : scene.key === 'DEFAITE' ? 'defeat' : 'taunt';
      const variant = scene.key === 'TAUNT_2' ? 2 : 1;
      assert.equal(p.pitNativePresentationDurationV105(bank, fighter, kind, variant), totalTicks * 1000 / clip.ticksPerSecond);
      let boundary = 0;
      for (const drawing of clip.frames) {
        for (const elapsedTicks of [boundary, boundary + drawing.durationTicks - 1]) {
          const presentation = {phase: kind === 'intro' ? 'intro-left' : kind === 'taunt' ? 'fight' : 'match-result',
            round: 1, durationMs: totalTicks * 1000 / clip.ticksPerSecond, elapsedMs: elapsedTicks * 1000 / clip.ticksPerSecond,
            blocksSimulation: true, resultVisible: false, winnerSlot: kind === 'defeat' ? 1 : 0,
            fighterTaunts: [true, false], fighterTauntVariants: [variant, 1]};
          const frame = p.resolvePitSpriteSheetPresentation(bank, fighter, {presentation});
          assert.ok(frame, scene.actionId + '/' + elapsedTicks);
          assert.equal(frame.status, 'dedicated-animation'); assert.match(frame.frame.clip.id, /presentation\.workbook-v105\./);
          assert.deepEqual(frame.frame.frame.rect, drawing.rect);
          assert.deepEqual(frame.frame.frame.pivot, drawing.pivot);
          const reduced = p.resolvePitSpriteSheetPresentation(bank, fighter, {presentation, reducedMotion: true});
          assert.deepEqual(reduced.frame.frame.rect, clip.frames.at(-1).rect);
        }
        boundary += drawing.durationTicks;
      }
      const historical = {...fighter, normalMovesRecipe: 'workbook-v104'};
      assert.equal(p.pitNativePresentationDurationV105(bank, historical, kind, variant), null);
      assert.equal(p.resolvePitSpriteSheetPresentation(bank, historical, {presentation: {phase: 'intro-left', round: 1, durationMs: 1200, elapsedMs: 0, blocksSimulation: true, resultVisible: false}}), null);
    }
    const broken = {...definitions[0], visibleFrameBounds: [{pageId: 'absent-page', rect: [0, 0, 1, 1], visibleRect: [0, 0, 1, 1]}]};
    const rejected = await p.loadPitSpriteSheetAnimations(['feral-hunter'], [broken]);
    assert.deepEqual(rejected.failedAtlasIds, [broken.atlas.id]); assert.equal(rejected.readyClipCount, 0);
    const collapsed = {...definitions[0], visibleFrameBounds: undefined, atlas: {...definitions[0].atlas, id: 'collapsed-v105',
      clips: definitions[0].atlas.clips.map(clip => ({...clip, frames: [{
        ...definitions[0].atlas.clips.find(first => first.facing === clip.facing).frames[0],
        durationTicks: clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0),
      }]}))}};
    const held = await p.loadPitSpriteSheetAnimations(['feral-hunter'], [collapsed]);
    assert.deepEqual(held.failedAtlasIds, ['collapsed-v105']); assert.equal(held.readyClipCount, 0);
  } finally {Object.assign(globalThis, previous);}
});
