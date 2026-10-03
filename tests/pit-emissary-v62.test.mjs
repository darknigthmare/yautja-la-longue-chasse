import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { build } from 'esbuild';
const manifest = JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV62.json', 'utf8'));
const receipt = JSON.parse(await fs.readFile('docs/v62-generation/emissary-phg-art.json', 'utf8'));
const entries = JSON.parse(await fs.readFile('app/game/data/pitUserAnimationsV62.json', 'utf8'));
const fighter = manifest.fighters[0], variant = fighter.variants[0];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const built = await build({ stdin: { contents: [
  "export * from './app/game/pitSpriteSheetAnimation';", "export * from './app/game/hunterSpriteAtlas';",
  "export * from './app/game/pitCombatBitmapArt';", "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/systems/pitRosterExpansion';", "export * from './app/game/systems/pitUserRoster';",
  "export * from './app/game/systems/pitCharacterStages';",
  "export * from './app/game/systems/pitFirstEdition';",
].join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const p = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const decoded = new Map();
for (const source of receipt.accepted) {
  const bytes = await fs.readFile('public' + source.src);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  decoded.set(source.src, { bytes, pixels: new Uint8ClampedArray(data), ...info });
}
function browser(failed = []) {
  const previous = { Image: globalThis.Image, document: globalThis.document }, requests = [];
  globalThis.Image = class {
    set src(value) { this.source = value; if (!value) return; requests.push(value); const d = decoded.get(value);
      if (!d || failed.includes(value)) { queueMicrotask(() => this.onerror?.()); return; }
      this.complete = true; this.naturalWidth = d.width; this.naturalHeight = d.height; this.pixels = d.pixels;
      queueMicrotask(() => this.onload?.()); }
    get src() { return this.source; }
  };
  globalThis.document = { createElement() { let pixels; return { width: 0, height: 0, getContext() { return {
    clearRect() {}, drawImage(image) { pixels = new Uint8ClampedArray(image.pixels); },
    getImageData() { return { data: pixels }; }, putImageData(data) { pixels = data.data; },
  }; } }; } };
  return { requests, restore() { Object.assign(globalThis, previous); } };
}
test('Emissary PHG is a distinct199th identity and restores its own appearance without gaining campaign unlocks', () => {
  assert.equal(p.PIT_VERSUS_FIGHTER_IDS[198], fighter.id, 'the historical 199th identity keeps its position when later lots append hunters');
  assert.ok(p.PIT_VERSUS_FIGHTER_IDS.length >= 199);
  assert.equal(p.PIT_VERSUS_FIGHTER_IDS.filter(id => id === fighter.id).length, 1);
  assert.equal(new Set(['user-emissary-1','user-emissary-2',fighter.id].map(id => p.getPitFighterProfile(id).name)).size, 3);
  assert.match(p.getPitFighterProfile(fighter.id).sourceWork, /Hunting Grounds/);
  assert.equal(p.PIT_FIRST_EDITION_FIGHTER_IDS.includes(fighter.id), false);
  assert.equal(p.getPitUserVariant('user-emissary-1', variant.id), null);
  const state = p.createPitCombatState(fighter.id, 'user-samurai', { variants: [variant.id, null] });
  const restored = p.deserializePitCombat(p.serializePitCombat(state));
  assert.equal(restored.fighters[0].definitionId, fighter.id);
  assert.equal(restored.fighters[0].variantId, variant.id);
  assert.equal(p.getPitCombatBitmapArtDefinition(fighter.id, variant.id).src, variant.src);
  assert.equal(p.getPitCharacterStageAssociation(fighter.id).coverage, 'cosmetic-no-exclusive-location');
});
test('all thirteen native drawings retain source hashes and full transparent silhouettes inside their cells', async () => {
  assert.equal(receipt.deliveredNativeDrawings, 13); assert.equal(receipt.nativeAnimationClips, 2);
  assert.equal(receipt.complete18ActionKit, false); assert.equal(variant.canonicalFidelityCertified, false);
  for (const source of receipt.accepted) {
    const d = decoded.get(source.src); assert.equal(hash(d.bytes), source.sha256); assert.equal(source.sourcePixelsModified, false);
    for (const frame of source.frames) {
      const [x0,y0,w,h] = frame.rect; const pixels = Buffer.alloc(w*h*4); let maxEdge = 0;
      for (let y=0;y<h;y++) for(let x=0;x<w;x++) {
        const off=((y+y0)*d.width+x+x0)*4;
        pixels.set(d.pixels.subarray(off,off+4),(y*w+x)*4);
        if(x===0||y===0||x===w-1||y===h-1) maxEdge=Math.max(maxEdge,d.pixels[off+3]);
      }
      assert.equal(hash(pixels),frame.frameSha256); assert(maxEdge<=1);
      assert(frame.transparentFraction>.15); assert(frame.pivot[1]<h);
    }
  }
  const idle = receipt.accepted.filter(s=>s.kind==='idle');
  assert.equal(new Set(idle.flatMap(s=>s.frames.map(f=>f.frameSha256))).size,12);
  assert.notEqual(idle[0].sha256,idle[1].sha256);
  for(const entry of entries) assert.equal(p.validateHunterSpriteAtlas(entry.atlas).valid,true);
  const icon=await fs.readFile('public'+fighter.icon.src); assert.equal(hash(icon),fighter.icon.sha256); assert(icon.length<40*1024);
});
test('real PNG readback cycles all twelve idle cells and holds native sides for uncovered movement without mirroring', async () => {
  const env=browser();
  try {
    const bank=await p.loadPitSpriteSheetAnimations([fighter.id],entries,{variants:[variant.id]});
    assert.deepEqual(bank.failedAtlasIds,[]); assert.equal(bank.readyClipCount,4);
    const combat=p.createPitCombatState(fighter.id,'user-samurai',{variants:[variant.id,null]});
    for(const facing of [1,-1]) {
      const body={...combat.fighters[0],facing}; const before=JSON.stringify(body); const seen=new Set();
      for(let tick=0;tick<72;tick+=12) {
        combat.frame=tick;
        const result=p.resolvePitSpriteSheetAnimation(bank,body,{simulationFrame:tick,combat}); assert(result,`${facing}:${tick}, ${JSON.stringify(body)}`);
        assert.equal(result.resolved.frame.clip.facing,facing===1?'right':'left');
        seen.add(result.resolved.frame.frameIndex);
        const draws=[]; const ctx={save(){},restore(){},globalAlpha:1,drawImage(...args){draws.push(args);},scale(){assert.fail('Native side must never mirror.');}};
        assert(p.drawPitSpriteSheetAnimation(ctx,bank,body,440,{simulationFrame:tick,combat}));
        const args=draws[0]; assert.equal(args[7]/args[3],args[8]/args[4]);
      }
      assert.equal(seen.size,6); assert.equal(JSON.stringify(body),before);
      const walking={...body,velocityX:4*facing};
      combat.frame=80;
      assert.equal(p.resolvePitSpriteSheetAnimation(bank,walking,{simulationFrame:80,combat}),null);
      const held=p.resolvePitSpriteSheetHold(bank,walking,{simulationFrame:80,combat}); assert(held);
      assert.equal(held.frame.frameIndex,0); assert.equal(held.frame.clip.facing,facing===1?'right':'left');
    }
  } finally {env.restore();}
});
test('failed native pages cannot borrow movie Emissary artwork or claim animation', async () => {
  const env=browser(entries[0].atlas.pages.map(page=>page.src));
  try {
    const bank=await p.loadPitCombatBitmapArt([fighter.id],{variants:[variant.id],spriteSheetRegistry:entries});
    const body=p.createPitCombatState(fighter.id,'user-samurai',{variants:[variant.id,null]}).fighters[0];
    assert.equal(p.resolvePitSpriteSheetAnimation(bank.spriteSheets,body),null);
    assert.equal(p.getPitCombatBitmapFighterArtStatus(bank,body),'static-bitmap');
    assert(env.requests.every(src=>src.startsWith('/game/sprites/v62/fighters/emissary-phg/')));
  } finally {env.restore();}
});
