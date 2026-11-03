import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { REFERENCE_BIOMASKS_V62, PRESERVED_BIOMASKS_V62 } from '../app/game/biomaskCatalogueV62.ts';
import { hunterMaskThumbnailPath, hunterMaskRigPath, hunterMaskRigPlacement } from '../app/game/hunterVisuals.ts';

const receipt = JSON.parse(await readFile(new URL('../docs/art/v62/biomask-generation-receipts.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url);
const sha = data => createHash('sha256').update(data).digest('hex');

test('all fourteen reference masks are distinct native alpha images shared by menu and rig', async () => {
  assert.equal(REFERENCE_BIOMASKS_V62.length, 14);
  assert.equal(receipt.entries.length, 14);
  assert.equal(new Set(receipt.entries.map(e=>e.measurement.sha256)).size, 14);
  for (const entry of REFERENCE_BIOMASKS_V62) {
    const record = receipt.entries.find(e=>e.id === entry.id);
    assert.ok(record && record.references.length && record.references.every(r=>r.url.startsWith('https://')));
    assert.equal(record.nativeBytesPreserved, true);
    assert.equal(hunterMaskRigPath(entry.id), hunterMaskThumbnailPath(entry.id));
    assert.equal(hunterMaskRigPath(entry.id), `/game/sprites/v62/masks/${entry.id}.png`);
    const data = await readFile(new URL('public'+hunterMaskRigPath(entry.id),root));
    assert.equal(sha(data), record.measurement.sha256, entry.id);
    const image = sharp(data), meta = await image.metadata();
    assert.equal(meta.hasAlpha, true); assert.equal(meta.width, 1254); assert.equal(meta.height, 1254);
    const { data: alpha, info } = await image.extractChannel('alpha').raw().toBuffer({resolveWithObject:true});
    assert.equal(alpha[0],0);assert.equal(alpha[info.width-1],0);assert.equal(alpha[alpha.length-1],0);
    assert.ok(alpha.some(value=>value===255));
    const placement = hunterMaskRigPlacement(entry.id);
    assert.ok(Object.values(placement).every(Number.isFinite));
    assert.equal(placement.width,placement.height,'native square may not stretch');
    assert.ok(placement.x>75 && placement.x<135 && placement.y>=0 && placement.y<35);
    assert.ok(placement.width>50 && placement.width<115);
  }
});

test('all 28 previous V3/V14 files survive byte-identical and all old V3 designs remain equipable', async()=>{
  assert.equal(receipt.originals.length,28);
  for(const original of receipt.originals) assert.equal(sha(await readFile(new URL(original.path,root))),original.sha256,original.path);
  assert.equal(PRESERVED_BIOMASKS_V62.length,11);
  for(const original of PRESERVED_BIOMASKS_V62){
    assert.match(original.detail,/Création originale/);
    assert.equal(hunterMaskThumbnailPath(original.id),`/game/assets/v3/actors/yautja/hunter/masks/${original.legacyMaskId}.webp`);
    assert.equal(hunterMaskRigPath(original.id),`/game/assets/v3/actors/yautja/hunter/masks/registered/${original.legacyMaskId}.webp`);
    assert.deepEqual(hunterMaskRigPlacement(original.id),{x:0,y:0,width:256,height:384});
  }
  assert.equal(hunterMaskRigPath('elder'),'/game/assets/v3/actors/yautja/hunter/masks/registered/elder.webp');
});
