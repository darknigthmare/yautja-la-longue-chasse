import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const registry=JSON.parse(fs.readFileSync('app/game/data/driveGarrisonsV86.json','utf8'));
const original=JSON.parse(fs.readFileSync('app/game/data/recentSpriteLibraryV85.json','utf8'));
const library=homeworldSceneSsrV78().load('app/game/systems/recentSpriteLibraryV85.ts');
// Independent transfer receipts for the identified complete archive lots.
const receipts=new Map([
 ['garrisons-v68-a',[20,'9e7258e9e98a6750fa57fa286a3be582b53307aefc27d2cd2a529352ba70e5ad','1N2z97VAncfJ_-Lok2H8YkabgWhfW1b9D']],
 ['garrisons-v68-b',[20,'7b42547076a1cf28be3271d21f31496be91c923aaee98fc80f05103ea86ee163','1eFSW0JgomsQzT60QpXOBelHMYx9h9tlO']],
 ['garrisons-v68-c',[16,'d5f1d866adaa8ffa5c2d05e635c443d3313e69f46c840e983ce7d83b89286672','1Ejk3DHBLrTskAIO2q5J3GoLwdJDva3R9']],
 ['garrisons-v68-d',[16,'c22fd804ad5b6168a2bb707d29ccaab8d2a4d232ccc4622f1f971967ece55a59','1Py56Vvc9D375hdwpB-0lf6JPZ9C6U4Il']],
]);

test('V6.8 contains all four complete lots and four independent adult roles in each of eighteen groups',()=>{
 assert.equal(registry.assets.length,72);assert.equal(registry.packs.length,4);
 assert.equal(new Set(registry.assets.map(a=>a.identityId)).size,72);
 assert.equal(new Set(registry.assets.map(a=>a.sha256)).size,72);
 const groups=new Set(registry.assets.map(a=>a.groupId));assert.equal(groups.size,18);
 for(const group of groups){const assets=registry.assets.filter(a=>a.groupId===group);
  assert.equal(assets.length,4);assert.deepEqual(new Set(assets.map(a=>a.role)),new Set(['gardes','enforcers-comics','hydras','blazers']));
 }
 for(const pack of registry.packs){const [count,sha,driveId]=receipts.get(pack.id);
  assert.equal(pack.pngEntriesImported,count);assert.equal(pack.sha256,sha);assert.equal(pack.driveId,driveId);
  assert.equal(registry.assets.filter(a=>a.packId===pack.id).length,count);
 }
 for(const asset of registry.assets){
  assert.equal(asset.kind,'npc');assert.equal(asset.lifeStage,'adult');assert.equal(asset.animationAvailable,false);
  assert.equal(asset.motionStatus,'single-pose-static');assert.equal(asset.canonicalFidelity,'not-certified-1-to-1');
  assert.equal(asset.producerCanonicalOneToOneCertified,false);assert(asset.roleLabel);assert(asset.groupLabel);
  assert.equal(asset.sourcePath,`sprites/${asset.groupId}/${asset.identityId.split('--')[1]}.png`);
 }
});

test('all seventy-two publicly mounted PNGs preserve native hashes, dimensions and byte counts',()=>{
 let bytes=0;
 for(const asset of registry.assets){
  const file=fs.readFileSync(path.join('public',asset.src.slice(1)));
  assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(createHash('sha256').update(file).digest('hex'),asset.sha256,asset.identityId);
  assert.equal(file.length,asset.bytes);assert.deepEqual([file.readUInt32BE(16),file.readUInt32BE(20)],[asset.width,asset.height]);
  assert.deepEqual([asset.width,asset.height],[1024,1536]);assert.equal(file[25],6,'native RGBA PNG');
  assert.equal(asset.alphaFacts.extrema[0],0);assert(asset.alphaFacts.extrema[1]>0);
  assert(asset.alphaFacts.fullyTransparentPixelFraction>0.1);
  const [left,top,right,bottom]=asset.alphaFacts.bbox;
  assert(left>=0&&top>=0&&right<=asset.width&&bottom<=asset.height&&left<right&&top<bottom);
  assert.deepEqual(asset.alphaFacts.marginsLTRB,[left,top,asset.width-right,asset.height-bottom]);
  bytes+=file.length;
 }
 assert.equal(bytes,170595836);assert.equal(registry.summary.nativePngBytes,bytes);
});

test('runtime catalogue exposes new records without replacing old identities, bytes, age or roles',()=>{
 // These eight V85 Badlands references had already been superseded before
 // importing V6.8; preserve their existing correction rather than undo it.
 const earlierCorrections=new Map([['badlands-6','badlands-147'],['badlands-65','badlands-147'],['badlands-9','badlands-141'],['badlands-11','badlands-126'],['badlands-13','badlands-148'],['badlands-26','badlands-152'],['badlands-27','badlands-153'],['badlands-28','badlands-138']]);
 for(const asset of original.assets){
  const actual=library.recentSpriteByIdV85(asset.id);assert(actual,asset.id);
  assert.equal(actual.identityId,asset.identityId);assert.equal(actual.src,asset.src);assert.equal(actual.sha256,asset.sha256);
  assert.equal(actual.preferredVersion,earlierCorrections.has(asset.identityId)?false:asset.preferredVersion);assert.equal(actual.role,asset.role);
  if(earlierCorrections.has(asset.identityId))assert.equal(actual.supersededByIdentityId,earlierCorrections.get(asset.identityId));
 }
 for(const asset of registry.assets){
  const actual=library.recentSpriteByIdV85(asset.id);assert.equal(actual.lifeStage,'adult');assert.equal(actual.roleLabel,asset.roleLabel);
  const found=library.findImportedYautjaArtV85({assetId:asset.id});
  if(asset.groupId==='human-accepted'){
   assert.equal(found,null,'documented human body stays available in archive, not Yautja consumer');
   assert.equal(library.findImportedYautjaArtV85({identityId:asset.identityId,includeHistorical:true}),null);
   assert.deepEqual(library.importedYautjaArtVariantsV85({assetId:asset.id}),[]);
   continue;
  }
  assert.equal(found.assetId,asset.id);
  assert.equal(found.motionStatus,'single-pose-static');assert.equal(found.spriteUrl,asset.src);
  assert.equal(library.findImportedYautjaArtV85({assetId:asset.id,clanName:'Unrelated clan'}),null);
 }
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeGarrisonFilesV86,72);
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.packs.filter(p=>p.id.startsWith('garrisons-v68-')).length,4);
});
