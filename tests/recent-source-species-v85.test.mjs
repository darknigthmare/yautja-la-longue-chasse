import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const registry=JSON.parse(fs.readFileSync('app/game/data/recentApprovedHuntersV85.json','utf8'));
const provenance=JSON.parse(fs.readFileSync('docs/recent-approved-hunters-v85-sources.json','utf8'));
const library=homeworldSceneSsrV78().load('app/game/systems/recentSpriteLibraryV85.ts');
// Receipt of the original bytes: classification must never rewrite source art.
const originals=new Map([
 ['V14__neca_rhino_kenner_version2_blue_v14.png',['bd955bec16dc7c4fb8d3502268109b02fa13efcc46ea76dbf83844958d6fcd91',1536,1024,2341741]],
 ['V14__neca_rhino_kenner_orange_v14.png',['9b46647433f09dc4c0e9494396ab4773472c2e0e6933ad2096e22ae4aaf13b85',1536,1024,2280225]],
 ['V14__neca_snake_series13_v14.png',['3d2ffa2d4e41238b35f7f007f0490e195b54677b1dda1867106264acbe3fbb46',1122,1402,1239402]],
 ['V14__neca_panther_kenner_tribute_v14.png',['e9656951a04ad058bcd17ee80a829e7c201f0067aa18341a9120fdfc89c52b52',1536,1024,2344331]],
 ['V14__neca_night_cougar_kenner_tribute_v14.png',['ce5b9059e4719ed5f46c199c6126766ce6ccc8e27231f5c0a8278286d1cff272',1536,1024,2307868]],
 ['V1__wolf_2007_unmasked_profile_v2.png',['e9bf953ce1d177fd4b96138d1e5040ab1b8ffb1855878d4960b74c78bc6824e5',1024,1536,1899240]],
 ['V1__wolf_2007_masked_profile_v2.png',['1f1b41e25c0f2973ea81c40d80c2a5202e8863b2e67a911d751605788627dae0',1024,1536,1719385]],
]);

test('recent source family correction keeps five Kenner xenomorph images and two distinct Wolf profiles',()=>{
 assert.equal(registry.assets.length,7);
 const creatures=registry.assets.filter(asset=>asset.kind==='fauna');
 const wolves=registry.assets.filter(asset=>asset.kind==='npc');
 assert.equal(creatures.length,5);assert.equal(wolves.length,2);
 assert.deepEqual(new Set(creatures.map(asset=>asset.canonicalSubject)),new Set(['Rhino Alien','Snake Alien','Panther Alien','Night Cougar Alien']));
 assert.equal(new Set(wolves.map(asset=>asset.canonicalSubject)).size,1);
 assert.equal(wolves[0].canonicalSubject,'Wolf (AVP: Requiem, 2007)');
 assert.equal(new Set(wolves.map(asset=>asset.id)).size,2);
 assert.equal(new Set(wolves.map(asset=>asset.identityId)).size,2);
 assert.equal(new Set(registry.assets.map(asset=>asset.identityId)).size,7);
 for(const asset of registry.assets){
  assert.equal(asset.sourceStatus,'provided-approved-folder-native-unverified');
  assert.equal(asset.id,'approved-hunter-v85:'+asset.sourceDriveFileId);
  assert.equal(asset.identityId,'approved-hunter:'+asset.sourcePath.slice(0,-4));
  assert.equal(asset.groupLabel,asset.kind==='fauna'?'Xénomorphes Kenner · références statiques':'Wolf · références Yautja');
  assert.equal(asset.packLabel,'Portraits et créatures · sources récentes');
  assert(asset.sourceLabel);assert.equal(asset.animationReady,false);assert.equal(asset.rigReady,false);
  const record=provenance.files.find(file=>file.id===asset.id);
  for(const field of ['identityId','sourceLabel','kind','label','sha256','src','bytes','sourcePath','sourceDriveFileId','sourceStatus'])assert.equal(record[field],asset[field],field);
 }
 assert.equal(registry.sourceSummary.selectedNamedYautjaFiles,2);
 assert.equal(registry.sourceSummary.selectedNamedCreatureFiles,5);
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.packs.find(pack=>pack.id==='approved-hunters').label,'Portraits et créatures · sources récentes');
});

test('seven served original PNGs retain exact hashes, byte lengths and native dimensions',()=>{
 let total=0;
 for(const asset of registry.assets){
  const receipt=originals.get(asset.sourcePath);assert(receipt);
  const bytes=fs.readFileSync(path.join('public',asset.src.replace(/^\//,'')));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(bytes.subarray(12,16).toString('ascii'),'IHDR');
  const actual=[createHash('sha256').update(bytes).digest('hex'),bytes.readUInt32BE(16),bytes.readUInt32BE(20),bytes.length];
  assert.deepEqual(actual,receipt,asset.sourcePath);
  assert.deepEqual([asset.sha256,asset.width,asset.height,asset.bytes],receipt);
  total+=bytes.length;
 }
 assert.equal(total,14132192);assert.equal(total,registry.sourceSummary.selectedPngBytes);
});

test('Yautja provider refuses explicit creature IDs including historical queries and preserves both Wolf variants',()=>{
 for(const asset of registry.assets){
  for(const includeHistorical of [false,true])for(const key of ['assetId','identityId']){
   const query={[key]:key==='assetId'?asset.id:asset.identityId,includeHistorical};
   const found=library.findImportedYautjaArtV85(query),variants=library.importedYautjaArtVariantsV85(query);
   if(asset.kind==='fauna'){
    assert.equal(found,null,asset.sourcePath+' '+key);assert.deepEqual(variants,[]);
   }else{
    assert.equal(found.assetId,asset.id);assert.equal(found.portraitUrl,asset.src);
    assert.equal(variants.length,1);assert.equal(variants[0].identityId,asset.identityId);
    assert.equal(variants[0].canonicalFidelity,'not-certified-1-to-1');
    assert.deepEqual([variants[0].width,variants[0].height],[1024,1536]);
   }
  }
 }
});
