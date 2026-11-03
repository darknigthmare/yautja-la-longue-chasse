import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import sharp from 'sharp';

const built = await build({stdin: {contents: [
  "export * from './app/game/systems/pitCombat.ts';",
  "export * from './app/game/pitWorkbookRegistryV106.ts';",
  "export * from './app/game/pitWorkbookRegistryV105.ts';",
  "export * from './app/game/pitWorkbookAnimationV100.ts';",
  "export * from './app/game/pitSpriteSheetAnimation.ts';",
  "export * from './app/game/pitSpriteSheetRegistry.ts';",
  "export * from './app/game/hunterSpriteAtlas.ts';",
  "export * from './app/game/hunterSpriteMotion.ts';",
  "export * from './app/game/pitWorkbookEffectsV106.ts';",
  "export * from './app/game/pitWorkbookCameraV106.ts';",
  "export * from './app/game/systems/pitCamera.ts';",
  "export * from './app/game/systems/pitWorkbookProjectileSourceV106.ts';",
  "export * from './app/game/systems/pitWorkbookSuperSourceV106.ts';",
].join('\n'), resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent'});
const p = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const definitions = p.PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106;
const allMoves = p.PIT_WORKBOOK_ADDITIONAL_MOVES_V106;
const moves = allMoves.filter(move => move.key !== 'SUPER');
const phaseNames = ['startup', 'active', 'recovery'];
const source = move => move.fighterId === 'feral-hunter' && move.key === 'S1'
  ? p.PIT_SPRITE_SHEET_REGISTRY.find(definition => definition.atlas.id === 'feral-actions-v59')
  : p.getPitWorkbookNativeV100(move.fighterId, move.actionId).definition;

test('fixed framing recomputes native bounds when the same appearances switch from historical rules to V106', () => {
  for (const recipe of [undefined, 'workbook-v106']) {
    const state = p.createPitCombatState('feral-hunter', 'scar', {normalMoves: recipe});
    const arena = p.PIT_ARENAS[state.arenaId];
    state.fighters[0].x = arena.leftWall; state.fighters[1].x = arena.rightWall;
    const camera = p.targetPitPresentationCamera(state, {reducedMotion: true}), bounds = p.getPitPresentationBounds(state);
    assert.ok(bounds.left >= camera.centerX - arena.width / camera.zoom / 2);
    assert.ok(bounds.right <= camera.centerX + arena.width / camera.zoom / 2);
    assert.ok(bounds.top >= camera.centerY - arena.height / camera.zoom / 2);
    assert.ok(bounds.bottom <= camera.centerY + arena.height / camera.zoom / 2);
  }
});

function start(move, facing) {
  const state = p.createPitCombatState(move.fighterId, move.fighterId === 'scar' ? 'feral-hunter' : 'scar', {mode: 'training', normalMoves: 'workbook-v106'});
  state.fighters[0].x = facing === 1 ? 150 : 800; state.fighters[1].x = facing === 1 ? 800 : 150;
  state.fighters[0].facing = facing; state.fighters[0].traque = p.PIT_MAX_TRAQUE;
  return p.stepPitCombat(state, [{workbookAction: move.key === 'S2' ? 'shield' : 'projectile'}, {}]);
}

test('V106 adds exactly five BODY actions, keeps inherited bindings and leaves partner composites as studies', () => {
  assert.equal(moves.length, 3); assert.equal(definitions.length, 5);
  assert.equal(definitions.reduce((total, definition) => total + definition.atlas.clips.length, 0), 34);
  assert.equal(p.PIT_WORKBOOK_BODY_MOVES_V106.length, 12); assert.equal(p.PIT_WORKBOOK_BODY_PRESENTATIONS_V106.length, 10);
  assert.equal(p.PIT_WORKBOOK_MOVE_REGISTRY_V106.length, 12);
  for (const definition of definitions) {
    assert.equal(definition.variantId, undefined);
    assert.equal(p.validateHunterSpriteAtlas(definition.atlas).valid, true, definition.atlas.id);
  }
  for (const move of moves) assert.equal(p.getPitWorkbookRuntimeBindingV106(move.fighterId, move.actionId), 'move');
  for (const fighter of ['feral-hunter', 'scar']) for (const key of ['TH_F', 'TH_B', 'FATALITE_1', 'FATALITE_2', 'CLEMENCE']) {
    const actionId = (key.startsWith('TH') ? 'M_' : 'CIN_') + (fighter === 'scar' ? 'F003_' : 'F006_') + key;
    assert.equal(p.getPitWorkbookRuntimeBindingV106(fighter, actionId), null);
  }
  const feral = definitions.find(definition => definition.atlas.id.startsWith('feral-actions-v59'));
  for (const facing of ['right', 'left']) for (const [index, durations] of [[10, 13], [6], [10, 20]].entries()) {
    const phase = phaseNames[index];
    assert.deepEqual(feral.atlas.clips.find(clip => clip.facing === facing && clip.id.endsWith('.' + phase)).frames.map(frame => frame.durationTicks), durations);
    const historical = source(moves.find(move => move.actionId === 'M_F006_S1')).atlas.clips.find(clip => clip.facing === facing && clip.id === 'pit.stand.technique.feral-guided-bolts-v58.' + phase);
    assert.equal(historical.frames.reduce((sum, frame) => sum + frame.durationTicks, 0), [9, 5, 18][index]);
  }
});

/** Decode the actual source PNGs, then use the production alpha/contact/crop
 * admission path rather than accepting metadata alone. */
test('production decoder admits 34 new clips and every simulated tick keeps the exact native drawing, pivot and facing', async () => {
  const pages = [...new Map(definitions.flatMap(definition => definition.atlas.pages).map(page => [page.src, page])).values()];
  const decoded = new Map();
  for (const page of pages) {
    const {data, info} = await sharp('public' + page.src).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    decoded.set(page.src, {pixels: new Uint8ClampedArray(data), width: info.width, height: info.height});
  }
  const previous = {Image: globalThis.Image, document: globalThis.document};
  globalThis.Image = class {set src(value) {
    if (!value) return; const native = decoded.get(value);
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
      getImageData() {return {data: canvas.pixels.slice()};}, putImageData(image) {canvas.pixels = image.data.slice();},
    }); return canvas;
  }};
  try {
    const bank = await p.loadPitSpriteSheetAnimations(['feral-hunter', 'scar'], definitions);
    assert.deepEqual(bank.failedAtlasIds, []); assert.equal(bank.readyClipCount, 34);
    for (const [index, move] of moves.entries()) for (const facing of [-1, 1]) {
      const original = source(move), definition = definitions[index];
      let state = start(move, facing);
      const total = move.startup + move.active + move.recovery;
      for (let tick = 0; tick < total; tick++) {
        const fighter = state.fighters[0];
        assert.equal(fighter.action?.workbookMove, move.key, move.actionId + '/' + tick); assert.equal(fighter.action.frame, tick);
        const frame = p.resolvePitSpriteSheetAnimation(bank, fighter, {simulationFrame: state.frame, combat: state});
        assert.ok(frame, move.actionId + '/' + facing + '/' + tick);
        assert.equal(frame.resolved.frame.clip.id, `pit.stand.workbook-v106.${move.key}.${fighter.phase}`);
        const direction = facing === 1 ? 'right' : 'left';
        let expected;
        if (move.actionId === 'M_F006_S1') {
          const sourceClip = original.atlas.clips.find(clip => clip.facing === direction && clip.id === 'pit.stand.technique.feral-guided-bolts-v58.' + fighter.phase);
          const phaseTick = tick - (fighter.phase === 'active' ? 23 : fighter.phase === 'recovery' ? 29 : 0);
          expected = sourceClip.frames[fighter.phase === 'active' ? 0 : phaseTick < (fighter.phase === 'startup' ? 10 : 10) ? 0 : 1];
        } else expected = p.resolveHunterSpriteAtlasFrame(original.atlas, 'workbook.' + move.actionId, direction, tick).frame;
        assert.deepEqual(frame.resolved.frame.frame.rect, expected.rect); assert.deepEqual(frame.resolved.frame.frame.pivot, expected.pivot);
        assert.equal(frame.resolved.frame.page.src, original.atlas.pages.find(page => page.id === expected.pageId).src);
        assert.equal(definition.pageBodyHeightPx?.[expected.pageId], original.pageBodyHeightPx?.[expected.pageId]);
        if (move.key === 'S2') {
          assert.equal(!!p.getPitWorkbookShieldBoxV106(fighter), tick >= 9 && tick < 18, 'guard follows guard drawing, tick ' + tick);
          assert.equal(!!p.getPitFighterBoxes(fighter).hitbox, tick >= 18 && tick < 27, 'edge follows edge drawing, tick ' + tick);
        }
        state = p.stepPitCombat(state, [{}, {}]);
      }
      assert.equal(state.fighters[0].action, null);
    }
    for (const move of allMoves.filter(move => move.key === 'SUPER')) for (const facing of [-1, 1]) for (const shouldConnect of [false, true]) {
      let state = p.createPitCombatState(move.fighterId, move.fighterId === 'scar' ? 'feral-hunter' : 'scar', {mode: 'training', normalMoves: 'workbook-v106'});
      const fighter = state.fighters[0]; fighter.x = facing === 1 ? 300 : 650; fighter.facing = facing; fighter.traque = p.PIT_MAX_TRAQUE;
      state.fighters[1].x = fighter.x + facing * (shouldConnect ? 55 : 500);
      state = p.stepPitCombat(state, [{workbookAction: 'super'}, {}]);
      const native = source(move), plan = p.getPitWorkbookSuperFramePlanV106(move.fighterId), reached = new Set();
      for (let step = 0; step < 150 && state.fighters[0].action; step++) {
        const actor = state.fighters[0], action = actor.action;
        assert.equal(action.workbookMove, 'SUPER');
        const result = p.resolvePitSpriteSheetAnimation(bank, actor, {simulationFrame: state.frame, combat: state});
        assert.ok(result, move.actionId + '/' + facing + '/' + shouldConnect + '/' + action.frame);
        const confirmed = !!action.workbookSuperV106;
        const branch = actor.phase === 'recovery' ? confirmed ? 'recoveryConfirmed' : 'recoveryMiss' : actor.phase;
        const elapsed = action.frame - (actor.phase === 'recovery' ? 32 : actor.phase === 'active' ? 24 : 0);
        let boundary = 0; const item = plan[branch].find(item => (boundary += item.durationTicks) > elapsed);
        const original = native.atlas.clips.find(clip => clip.facing === (facing === 1 ? 'right' : 'left')).frames[item.index];
        assert.deepEqual(result.resolved.frame.frame.rect, original.rect); assert.deepEqual(result.resolved.frame.frame.pivot, original.pivot);
        assert.equal(result.resolved.frame.clip.id, `pit.stand.workbook-v106.SUPER.${actor.phase}${actor.phase === 'recovery' && confirmed ? '.confirmed' : ''}`);
        assert.equal(result.resolved.frame.page.src, native.atlas.pages.find(page => page.id === original.pageId).src);
        reached.add(item.index);
        if (!shouldConnect) {assert.equal(confirmed, false); assert.equal(state.techniqueEffects.length, 0);}
        if (actor.phase === 'recovery') assert.equal(confirmed, shouldConnect, 'only an actual opening hit selects confirmed BODY');
        const camera = p.advancePitWorkbookCameraV106(null, state, false), focus = p.getPitSuperCameraV106(state);
        assert.equal(p.isPitWorkbookSuperCameraV106(camera), !!focus);
        assert.equal(p.isPitWorkbookSuperCameraV106(p.advancePitWorkbookCameraV106(camera, state, true)), false);
        if (focus) {
          const bounds = p.getPitPresentationBounds(state), arena = p.PIT_ARENAS[state.arenaId];
          assert.ok(camera.zoom <= 1.08);
          assert.ok(bounds.left >= camera.centerX - arena.width / camera.zoom / 2 - .001);
          assert.ok(bounds.right <= camera.centerX + arena.width / camera.zoom / 2 + .001);
          assert.ok(bounds.top >= camera.centerY - arena.height / camera.zoom / 2 - .001);
          assert.ok(bounds.bottom <= camera.centerY + arena.height / camera.zoom / 2 + .001);
          const interrupted = structuredClone(state); interrupted.fighters[0].action = null; interrupted.fighters[0].phase = 'idle';
          assert.deepEqual(p.advancePitWorkbookCameraV106(camera, interrupted, false), p.advancePitPresentationCamera(null, interrupted));
        }
        state = p.stepPitCombat(state, [{}, {}]);
      }
      assert.equal(state.fighters[0].action, null);
      assert.equal(reached.size, shouldConnect ? 6 : move.fighterId === 'scar' ? 3 : 1);
    }
  } finally {Object.assign(globalThis, previous);}
});

test('new BODY bindings reject forged identities and supplied costumes', () => {
  for (const move of moves) {
    const state = start(move, 1), fighter = state.fighters[0];
    fighter.crouching = true;
    assert.equal(p.describePitHunterSpriteMotion(fighter, state.frame).posture, 'stand');
    for (const change of [action => {action.kind = 'equipment';}, action => {action.attack = 'light';}, action => {action.normalMove = '5M';}]) {
      const forged = structuredClone(fighter); change(forged.action);
      assert.equal(p.describePitHunterSpriteMotion(forged, state.frame), null);
    }
    const historical = {...fighter, normalMovesRecipe: 'workbook-v105'};
    assert.equal(p.describePitHunterSpriteMotion(historical, state.frame), null);
  }
});

test('Scar charge uses the measured forward startup aperture for exactly six cosmetic ticks and never changes combat state', () => {
  const move = moves.find(move => move.fighterId === 'scar');
  for (const facing of [-1, 1]) {
    let state = start(move, facing); const arcs = [];
    const context = {globalAlpha: 1, save() {}, restore() {}, createRadialGradient() {return {addColorStop() {}};}, beginPath() {}, arc(...args) {arcs.push(args);}, fill() {}};
    for (let tick = 0; tick < move.startup + move.active; tick++) {
      const before = structuredClone(state), expected = tick >= 14 && tick < 20;
      assert.equal(p.drawPitWorkbookChargeV106(context, state, 450, false), Number(expected), 'tick ' + tick);
      assert.deepEqual(state, before);
      if (expected) {
        const anchor = p.getPitWorkbookChargeAnchorV106(facing);
        const point = p.projectPitWorkbookAnchorV106(anchor, state.fighters[0].x, 0, p.PIT_FIGHTERS.scar.bodyHeight);
        assert.equal(arcs.at(-1)[0], point.x); assert.equal(arcs.at(-1)[1], 450 - point.y);
        assert.ok(arcs.at(-1)[2] > 1 && arcs.at(-1)[2] <= 5);
        assert.equal(state.techniqueEffects.length, 0, 'aiming light cannot create an early shot');
      }
      state = p.stepPitCombat(state, [{}, {}]);
    }
    assert.equal(arcs.length, 6);
  }
});
