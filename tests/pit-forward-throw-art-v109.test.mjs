import assert from 'node:assert/strict';
import {after, test} from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: [
  "export * from './app/game/pitWorkbookRegistryV109';",
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/pitSpriteSheetAnimation';",
  "export * from './app/game/spriteContact';",
].join('\n'), resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'esm'});
const p = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const admissions = p.PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109;
const definitions = p.PIT_WORKBOOK_FORWARD_THROW_REGISTRY_V109;
const decoded = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const admission of admissions) for (const page of admission.definition.atlas.pages) {
  if (decoded.has(page.src)) continue;
  const bytes = await fs.readFile('public' + page.src);
  const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  decoded.set(page.src, {bytes, pixels: new Uint8ClampedArray(data), width: info.width, height: info.height, sourceUrl: page.src});
}
const originals = {Image: globalThis.Image, document: globalThis.document};
globalThis.Image = class {set src(src) {
  if (!src) return;
  const native = decoded.get(src); if (!native) {queueMicrotask(() => this.onerror?.()); return;}
  Object.assign(this, native); this.naturalWidth = native.width; this.naturalHeight = native.height; this.complete = true;
  queueMicrotask(() => this.onload?.());
}};
globalThis.document = {createElement() {
  const canvas = {width: 0, height: 0, pixels: null, sourceUrl: null};
  canvas.getContext = () => ({
    clearRect() {canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);},
    drawImage(image) {canvas.pixels = image.pixels.slice(); canvas.sourceUrl = image.sourceUrl;},
    getImageData(x = 0, y = 0, width = canvas.width, height = canvas.height) {
      const pixels = new Uint8ClampedArray(width * height * 4);
      for (let row = 0; row < height; row++) pixels.set(canvas.pixels.subarray(((y + row) * canvas.width + x) * 4, ((y + row) * canvas.width + x + width) * 4), row * width * 4);
      return {data: pixels};
    },
    putImageData(image) {canvas.pixels = image.data.slice();},
  }); return canvas;
}};
after(() => Object.assign(globalThis, originals));
const bank = await p.loadPitSpriteSheetAnimations(['feral-hunter', 'scar'], definitions);
const key = (src, rect) => JSON.stringify([src, rect]);
const seen = new Set();
function record(state, slot) {
  const native = p.resolvePitSpriteSheetAnimation(bank, state.fighters[slot], {simulationFrame: state.frame, combat: state});
  if (native) {seen.add(key(native.resolved.frame.page.src, native.resolved.frame.frame.rect));
    assert.equal(native.resolved.frame.clip.facing, state.fighters[slot].facing === 1 ? 'right' : 'left');}
  return native;
}
function close(hero, facing = 1, health = 1000) {
  const state = p.createPitCombatState(hero, hero === 'scar' ? 'feral-hunter' : 'scar', {normalMoves: 'workbook-v109', mode: 'training'});
  state.fighters[0].x = facing === 1 ? 400 : 460; state.fighters[1].x = facing === 1 ? 460 : 400;
  state.fighters[0].facing = facing; state.fighters[1].facing = -facing; state.fighters[1].health = health;
  return state;
}

test('the complete native duo admits exactly48 actual pixel-distinct drawings and both bounded runtime source IDs', async () => {
  assert.equal(p.PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109, true);
  assert.deepEqual(p.PIT_FORWARD_THROW_REJECTED_ADMISSIONS_V109, []); assert.equal(admissions.length, 8);
  const facts = p.getPitForwardThrowWorkbookFactsV109();
  assert.deepEqual(facts.boundActionIds, ['M_F006_TH_F', 'M_F003_TH_F']); assert.equal(facts.nativeBodyDrawings, 48);
  assert.equal(facts.sourceCompletion, false); assert.equal(facts.partnerScope, 'unvaried-feral-scar-duo');
  assert.deepEqual(bank.failedAtlasIds, []); assert.equal(bank.readyClipCount, 32, 'held miss/tech/KO clips must pass the complete six-drawing role gate');
  assert.equal(p.getPitForwardThrowArtReadinessV109(bank), 'ready');
  assert.equal(p.getPitForwardThrowArtReadinessV109(null), 'loading');
  const hashes = new Set();
  for (const admission of admissions) {
    assert.equal(p.getPitWorkbookForwardThrowSupportV109(admission.fighterId).supported, true);
    assert.equal(p.getPitWorkbookForwardThrowSupportV109(admission.fighterId, 'wolf').supported, false);
    assert.equal(p.getPitWorkbookForwardThrowSupportV109(admission.fighterId, undefined, ['a-costume']).supported, false);
    for (const source of admission.sources) {
      const page = admission.definition.atlas.pages.find(page => page.id === source.pageId), image = decoded.get(page.src);
      assert.equal(source.path, 'public' + page.src); assert.equal(sha(image.bytes), source.sha256); assert.equal(image.bytes.length, source.bytes);
      assert.equal(image.width, page.width); assert.equal(image.height, page.height); assert.equal(page.transparency.mode, 'alpha');
      const receipt = JSON.parse(await fs.readFile(source.receiptPath, 'utf8')); assert(receipt && typeof receipt === 'object');
    }
    for (const [index, frame] of admission.definition.atlas.clips[0].frames.entries()) {
      const page = admission.definition.atlas.pages.find(page => page.id === frame.pageId), image = decoded.get(page.src);
      const [x, y, width, height] = frame.rect, visible = Buffer.alloc(width * height * 4); let count = 0;
      for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
        const offset = ((y + row) * image.width + x + column) * 4, alpha = image.pixels[offset + 3];
        if (row === 0 || column === 0 || row === height - 1 || column === width - 1) assert.equal(alpha, 0, 'transparent native gutter, without neighbour pixels at the crop border');
        if (alpha > 0) {count++; visible.set(image.pixels.subarray(offset, offset + 4), (row * width + column) * 4);}
      }
      assert(count > 200); const digest = sha(visible); assert(!hashes.has(digest), 'a repeated drawing cannot masquerade as a new independently drawn role or orientation'); hashes.add(digest);
      if (admission.role === 'attacker' || [0, 1, 4, 5].includes(index)) {
        const contact = p.measureSpriteContact(visible, width, height, frame.pivot[1]);
        assert.equal(contact.supportY, frame.pivot[1], 'grounded poses use their actual unchanged illustrated support, without floating above the floor');
        assert.equal(contact.offsetY, 0);
      }
    }
  }
  assert.equal(hashes.size, 48);
});

test('a failed independent victim PNG blocks the entire public pair instead of admitting a fallback body', async () => {
  const victim = admissions.find(row => row.fighterId === 'scar' && row.role === 'victim' && row.facing === 'left');
  const path = victim.definition.atlas.pages[0].src, actual = decoded.get(path); decoded.delete(path);
  try {
    const missing = await p.loadPitSpriteSheetAnimations(['feral-hunter', 'scar'], definitions, {timeoutMs: 100});
    assert.equal(p.getPitForwardThrowArtReadinessV109(missing), 'missing');
    assert(missing.failedAtlasIds.length > 0);
  } finally {decoded.set(path, actual);}
});

test('real capture/release/recovery and independent victim ticks select all48 decoded native drawings, including an unobserved flight seek', async () => {
  let sought = false;
  for (const hero of ['feral-hunter', 'scar']) for (const facing of [-1, 1]) {
    let state = close(hero, facing); state = p.stepPitCombat(state, [{throw: true}, {}]);
    for (let step = 0; step < 90; step++) {
      if (state.fighters[0].action?.workbookMove === 'TH_F') assert(record(state, 0), 'the active source action must draw its own BODY');
      if (state.sourceThrowV109) {
        assert(record(state, 1), 'the actual independent target must never fall through to an upright hurt/guard pose');
        if (state.sourceThrowV109.age === 13 && !sought) {
          const restored = p.deserializePitCombat(p.serializePitCombat(state));
          const admission = admissions.find(row => row.fighterId === restored.fighters[1].definitionId && row.role === 'victim' && row.facing === (facing === 1 ? 'left' : 'right'));
          const fresh = await p.loadPitSpriteSheetAnimations([restored.fighters[1].definitionId], definitions.filter(definition =>
            definition.fighterId === restored.fighters[1].definitionId && definition.atlas.clips.some(clip => clip.id.endsWith('TH_F.victim') && clip.facing === admission.facing)));
          const frame = p.resolvePitSpriteSheetAnimation(fresh, restored.fighters[1], {combat: restored, simulationFrame: restored.frame});
          assert.equal(frame.resolved.motion.elapsedTicks, 13);
          assert.deepEqual(frame.resolved.frame.frame.rect, admission.definition.atlas.clips[0].frames[3].rect);
          sought = true;
        }
      }
      state = p.stepPitCombat(state, [{}, {}]);
    }
  }
  assert.equal(seen.size, 48);
  assert.equal(sought, true);
  for (const admission of admissions) for (const frame of admission.definition.atlas.clips[0].frames) {
    const src = admission.definition.atlas.pages.find(page => page.id === frame.pageId).src;
    assert(seen.has(key(src, frame.rect)), admission.fighterId + ' ' + admission.role + ' ' + admission.facing);
  }
});

test('a real whiff, fresh tech and training knockout draw only their explicit admitted held poses', () => {
  for (const hero of ['feral-hunter', 'scar']) for (const facing of [-1, 1]) {
    let whiff = close(hero, facing); whiff.fighters[1].x = facing === 1 ? 750 : 110;
    whiff = p.stepPitCombat(whiff, [{throw: true}, {}]);
    for (let step = 0; step < 41; step++) {
      if (whiff.fighters[0].action?.workbookMove === 'TH_F') {
        const native = record(whiff, 0); assert(native);
        if (whiff.fighters[0].phase === 'active') assert.equal(native.resolved.motion.clipId, 'pit.stand.workbook-v109.TH_F.active.whiff');
      } whiff = p.stepPitCombat(whiff, [{}, {}]);
    }
    let state = close(hero, facing); state = p.stepPitCombat(state, [{throw: true}, {}]);
    while (!state.sourceThrowV109) state = p.stepPitCombat(state, [{}, {}]);
    state = p.stepPitCombat(state, [{}, {throw: true}]);
    for (const slot of [0, 1]) {
      const native = record(state, slot); assert(native);
      assert.equal(native.resolved.motion.clipId, 'pit.stand.workbook-v109.TH_F.recovery.teched');
    }
    let ko = close(hero, facing, 9); ko = p.stepPitCombat(ko, [{throw: true}, {}]); let knockoutTicks = 0;
    for (let step = 0; step < 90; step++) {
      if (ko.sourceThrowV109 && ko.fighters[1].health <= 0) {
        const native = record(ko, 1); assert(native); assert.equal(native.resolved.motion.clipId, 'pit.stand.workbook-v109.TH_F.victim.ko');
        const admitted = admissions.find(row => row.fighterId === ko.fighters[1].definitionId && row.role === 'victim' && row.facing === (facing === 1 ? 'left' : 'right'));
        assert.deepEqual(native.resolved.frame.frame.rect, admitted.definition.atlas.clips[0].frames[4].rect); knockoutTicks++;
      } ko = p.stepPitCombat(ko, [{}, {}]);
    }
    assert.equal(knockoutTicks, 60, 'a dead target never borrows the rising drawing');
  }
});
