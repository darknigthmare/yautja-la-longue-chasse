import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import sharp from 'sharp';

const built = await build({stdin: {contents: [
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/systems/pitFinishersV80';",
  "export * from './app/game/systems/pitWorkbookConclusionsV107';",
  "export * from './app/game/pitWorkbookRegistryV107';",
  "export * from './app/game/pitWorkbookRegistryV106';",
  "export * from './app/game/pitWorkbookRegistryV105';",
  "export * from './app/game/pitWorkbookConclusionRenderingV107';",
  "export * from './app/game/pitWorkbookObjectiveRenderingV107';",
  "export * from './app/game/pitWorkbookObjectiveSessionV107';",
  "export * from './app/game/pitSpriteSheetAnimation';",
  "export * from './app/game/pitSpriteSheetRegistry';",
  "export * from './app/game/pitCombatBitmapArt';",
].join('\n'), resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent'});
const p = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const sourceDefinitions = p.PIT_WORKBOOK_CONCLUSION_SCENE_REGISTRY_V107;
const originalFeral = p.PIT_SPRITE_SHEET_REGISTRY.find(d => d.atlas.id === 'feral-hunter-pit-v34');
const keptClips = originalFeral.atlas.clips.filter(c => ['idle', 'high-guard', 'pit.stand.hitstun'].includes(c.id));
const keptPages = new Set(keptClips.flatMap(c => c.frames.map(f => f.pageId)));
const guardDefinition = {...originalFeral,
  visibleFrameBounds: originalFeral.visibleFrameBounds?.filter(b => keptClips.some(c => c.frames.some(f => f.pageId === b.pageId && JSON.stringify(f.rect) === JSON.stringify(b.rect)))),
  pageBodyHeightPx: originalFeral.pageBodyHeightPx && Object.fromEntries(Object.entries(originalFeral.pageBodyHeightPx).filter(([id]) => keptPages.has(id))),
  heldPoseClips: originalFeral.heldPoseClips?.filter(pose => keptClips.some(c => c.id === pose.id && c.facing === pose.facing)),
  atlas: {...originalFeral.atlas, pages: originalFeral.atlas.pages.filter(page => keptPages.has(page.id)), clips: keptClips}};
const defeatDefinition = p.PIT_WORKBOOK_PRESENTATION_REGISTRY_V105.find(d => d.fighterId === 'feral-hunter' && d.atlas.clips.some(c => c.id.endsWith('.defeat')));
const victimDefinitions = [guardDefinition, defeatDefinition];
const pages = [...new Map([...sourceDefinitions, ...victimDefinitions].flatMap(d => d.atlas.pages).map(page => [page.src, page])).values()];
const decoded = new Map();
for (const page of pages) {
  const {data, info} = await sharp('public' + page.src).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  decoded.set(page.src, {pixels: new Uint8ClampedArray(data), width: info.width, height: info.height, sourceUrl: page.src});
}
const previousGlobals = {Image: globalThis.Image, document: globalThis.document};
globalThis.Image = class {set src(value) {
  if (!value) return;
  const native = decoded.get(value);
  if (!native) {queueMicrotask(() => this.onerror?.()); return;}
  Object.assign(this, native); this.complete = true; this.naturalWidth = native.width; this.naturalHeight = native.height;
  queueMicrotask(() => this.onload?.());
}};
globalThis.document = {createElement() {
  const canvas = {width: 0, height: 0, pixels: null, sourceUrl: null};
  canvas.getContext = () => ({
    clearRect() {canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);},
    drawImage(image) {canvas.pixels = image.pixels.slice(); canvas.sourceUrl = image.sourceUrl;},
    getImageData(x = 0, y = 0, width = canvas.width, height = canvas.height) {
      const result = new Uint8ClampedArray(width * height * 4);
      for (let row = 0; row < height; row++) result.set(canvas.pixels.subarray(((y + row) * canvas.width + x) * 4, ((y + row) * canvas.width + x + width) * 4), row * width * 4);
      return {data: result};
    },
    putImageData(image) {canvas.pixels = image.data.slice();},
  });
  return canvas;
}};
after(() => Object.assign(globalThis, previousGlobals));
const bodyBank = await p.loadPitSpriteSheetAnimations(['scar', 'feral-hunter'], sourceDefinitions);
const victimBank = await p.loadPitSpriteSheetAnimations(['feral-hunter'], victimDefinitions);
const fighterBank = {spriteSheets: victimBank, images: new Map(), requestedIds: new Set(['feral-hunter']), readyIds: new Set(), failedIds: new Set(), cancelled: false};
function context() {
  const calls = [];
  return new Proxy({calls, globalAlpha: 1}, {get(target, key) {
    if (key in target) return target[key];
    return (...args) => {calls.push({method: key, args});};
  }});
}
const legacyOptions = {mode: 'stylized', reducedGore: false, reducedMotion: false, narrative: false, replay: false, cpuWinner: false};
const wins = new Map();
function earnedWindow(slot) {
  if (!wins.has(slot)) {
    let combat = p.createPitCombatState(...(slot === 0 ? ['scar', 'feral-hunter'] : ['feral-hunter', 'scar']), {normalMoves: 'workbook-v106'});
    const session = p.createPitWorkbookObjectiveSessionV107(combat, 'render-real-objective-' + slot);
    for (let tick = 0; tick < 12000 && combat.phase !== 'match-over'; tick++) {
      const hero = combat.fighters[slot], enemy = combat.fighters[1 - slot], inputs = [{}, {}];
      if (combat.phase === 'round' && hero.phase === 'idle') {
        const distance = enemy.x - hero.x;
        inputs[slot] = Math.abs(distance) > 80 ? {right: distance > 0, left: distance < 0} : {attack: 'heavy'};
      }
      combat = p.stepPitCombat(combat, inputs);
    }
    assert.equal(combat.matchWinnerId, 'scar');
    const legacy = p.advancePitFinisherV80(p.observePitFinisherV80(p.createPitFinisherViewV80(), combat, 'render-earned-' + slot, legacyOptions), 16, true);
    const state = p.observePitWorkbookConclusionV107(p.createPitWorkbookConclusionV107(), combat, legacy,
      {enabled: true, relation: 'hostile-adult', reducedGore: false, reducedMotion: false, narrative: false, replay: false, session});
    wins.set(slot, {combat, state});
  }
  return structuredClone(wins.get(slot));
}

test('actual decoder admits the two independent source conclusions and preserves all source ticks, faces, crops and ownership', () => {
  assert.equal(bodyBank.readyClipCount, 6); assert.deepEqual(bodyBank.failedAtlasIds, []);
  assert.deepEqual(victimBank.failedAtlasIds, []);
  for (const key of ['FATALITE_2', 'CLEMENCE']) for (const facing of [-1, 1]) {
    const actor = p.createPitCombatState('scar', 'feral-hunter').fighters[0]; actor.facing = facing;
    const reached = new Set();
    for (let tick = 0; tick < 300; tick++) {
      const resolved = p.resolvePitWorkbookConclusionBodyV107(bodyBank, actor, key, tick);
      assert.ok(resolved); reached.add(resolved.frame.frameIndex);
      assert.equal(resolved.frame.clip.facing, facing === 1 ? 'right' : 'left');
      assert.equal(resolved.frame.frameIndex, tick < 30 ? 0 : tick < 60 ? 1 : tick < 120 ? 2 : tick < 180 ? 3 : tick < 240 ? 4 : 5);
    }
    assert.equal(reached.size, 6);
    for (const invalid of [-1, 300, 1.5, NaN]) assert.equal(p.resolvePitWorkbookConclusionBodyV107(bodyBank, actor, key, invalid), null);
    assert.equal(p.resolvePitWorkbookConclusionBodyV107(bodyBank, {...actor, variantId: 'foreign-costume'}, key, 0), null);
    assert.equal(p.resolvePitWorkbookConclusionBodyV107(bodyBank, {...actor, definitionId: 'feral-hunter'}, key, 0), null);
    assert.equal(p.getPitWorkbookRuntimeBindingV106('scar', 'CIN_F003_' + key), null, 'the historical binding remains unchanged');
  }
});

test('the isolated native device crop contains one detached object, clear alpha gutters and no body pixels', async () => {
  const source = p.PIT_WORKBOOK_OBJECTIVE_ART_V107.device;
  assert.equal(createHash('sha256').update(await fs.readFile('public' + source.path)).digest('hex'), source.sha256);
  const native = decoded.get(source.path), [sx, sy, width, height] = source.sourceRect;
  let visible = 0, borders = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (native.pixels[((sy + y) * native.width + sx + x) * 4 + 3] > 2) {
    visible++; if (x === 0 || y === 0 || x === width - 1 || y === height - 1) borders++;
  }
  assert.equal(visible, source.alphaPixels); assert.equal(borders, 0);
  assert.ok(p.pitWorkbookObjectiveArtReadyV107(bodyBank));
  assert.equal(p.pitWorkbookObjectiveArtReadyV107(null), false);
  assert.equal(p.ownsPitWorkbookObjectiveV107('scar', 'feral-hunter'), true);
  assert.equal(p.ownsPitWorkbookObjectiveV107('scar', 'feral-hunter', 'other'), false);
});

test('real source scenes draw exactly two independent native actors, retain physical props and never mutate the earned result', () => {
  for (const slot of [0, 1]) for (const key of ['FATALITE_2', 'CLEMENCE']) {
    const {combat, state: window} = earnedWindow(slot), resultBefore = p.serializePitCombat(combat);
    let state = p.triggerPitWorkbookConclusionV107(window, key), samples = 0;
    const camera = p.getPitWorkbookConclusionCameraV107(combat), arena = p.PIT_ARENAS[combat.arenaId];
    const viewport = {left: camera.centerX - arena.width / camera.zoom / 2, right: camera.centerX + arena.width / camera.zoom / 2,
      top: camera.centerY - arena.height / camera.zoom / 2, bottom: camera.centerY + arena.height / camera.zoom / 2};
    for (let step = 0; step < 1200 && state.phase !== 'complete'; step++) {
      const scene = p.samplePitWorkbookConclusionV107(state);
      if (scene?.phase === 'sequence') {
        const before = p.serializePitWorkbookConclusionV107(state), ctx = context();
        assert.equal(p.drawPitWorkbookConclusionActorsV107(ctx, combat, state, bodyBank, fighterBank), true);
        const painted = ctx.calls.filter(call => call.method === 'drawImage');
        assert.equal(painted.length, 2, key + '/' + slot + '/' + scene.clipTick);
        assert.match(painted[0].args[0].sourceUrl, /feral/);
        assert.match(painted[1].args[0].sourceUrl, new RegExp('scar-special-' + (key === 'CLEMENCE' ? 'clemence' : 'fatalite-2')));
        const bounds = p.getPitWorkbookConclusionBodyBoundsV107(bodyBank, scene.actors[slot], key, scene.clipTick, arena.groundY);
        assert.ok(bounds.x >= viewport.left && bounds.x + bounds.width <= viewport.right);
        assert.ok(bounds.y >= viewport.top && bounds.y + bounds.height <= viewport.bottom);
        assert.equal(p.drawPitWorkbookObjectivePropsV107(context(), bodyBank, state.session, scene.actors, arena.groundY),
          state.session.missionObject.state === 'ground' ? 2 : 1);
        assert.equal(p.serializePitWorkbookConclusionV107(state), before);
        assert.equal(p.serializePitCombat(combat), resultBefore);
        samples++;
      }
      state = p.advancePitWorkbookConclusionV107(state, 1000 / 60);
    }
    assert.equal(samples, 300); assert.equal(state.clipTick, 300);
    assert.equal(state.outcome, key === 'CLEMENCE' ? 'partial-source' : 'finished');
    const final = p.samplePitWorkbookConclusionV107(state);
    assert.equal(final.clipTick, 299); assert.equal(p.pitWorkbookConclusionBlocksResultV107(state), false);
    assert.equal(p.drawPitWorkbookConclusionActorsV107(context(), combat, state, bodyBank, fighterBank), true);
    assert.equal(p.serializePitCombat(combat), resultBefore);
  }
});

test('the ground beacon is rendered at frame zero and its native final hand is never selected before an actual pickup', () => {
  const combat = p.createPitCombatState('scar', 'feral-hunter', {normalMoves: 'workbook-v106'});
  const session = p.createPitWorkbookObjectiveSessionV107(combat, 'prematch-physical-objective');
  assert.equal(combat.frame, 0); assert.equal(session.missionObject.state, 'ground');
  const before = JSON.stringify(session), ctx = context();
  assert.equal(p.drawPitWorkbookObjectivePropsV107(ctx, bodyBank, session, combat.fighters, p.PIT_ARENAS[combat.arenaId].groundY), 2);
  assert.equal(JSON.stringify(session), before);
  const {state} = earnedWindow(0); let running = p.triggerPitWorkbookConclusionV107(state, 'CLEMENCE');
  while (running.phase !== 'sequence' || running.clipTick < 240) running = p.advancePitWorkbookConclusionV107(running, 1000 / 60);
  const pending = p.samplePitWorkbookConclusionV107(running);
  assert.equal(pending.clipTick, 239); assert.equal(pending.frameIndex, 4); assert.equal(running.session.missionObject.state, 'ground');
  running = p.advancePitWorkbookConclusionV107(running, 1000 / 60);
  assert.equal(running.session.missionObject.state, 'recovered'); assert.equal(p.samplePitWorkbookConclusionV107(running).frameIndex, 5);
});
