import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const base='docs/suivi-production/v107-enforcer-poses';
const manifest=read(base+'/data/production-manifest.json');
const registry=read('app/game/data/enforcerAlternativesV107.json');

test('eighteen alternative poses reuse existing identities without replacing any automatic selection',()=>{
 const qa=homeworldSceneSsrV78(),library=qa.load('app/game/systems/recentSpriteLibraryV85.ts');
 const defaults=read('docs/suivi-production/v613/data/default-selections-before.json');
 assert.equal(defaults.queries.length,973);
 for(const row of defaults.queries)assert.equal(library.findImportedYautjaArtV85(row.query)?.assetId??null,row.assetId,JSON.stringify(row.query));
 assert.equal(manifest.assets.length,18);assert.equal(new Set(manifest.assets.map(row=>row.id)).size,18);
 assert.equal(manifest.summary.newStableIdentities,0);assert.equal(manifest.summary.reusedStableIdentities,18);
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeEnforcerAlternativeFilesV107,18);
 const codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 for(const row of registry.assets){
  assert.equal(row.packId,'enforcer-alternatives-v107');assert.equal(row.priority,46);
  assert.equal(row.motionStatus,'single-pose-static');assert.equal(row.canonicalFidelity,'not-certified-1-to-1');
  assert.equal(row.identityId,manifest.assets.find(a=>a.sha256===row.sha256)?.id);
  assert.deepEqual(library.recentSpriteByIdV85(row.id),row);
  assert.ok(codex.RECENT_SPRITE_CODEX_V85.some(a=>a.source.id===row.id));
  if(row.groupId==='human-accepted')assert.equal(library.findImportedYautjaArtV85({assetId:row.id}),null);
 }
 const markup=qa.render('app/game/RecentSpriteLibraryV85.tsx',{onClose:()=>{}});
 assert.match(markup,/<option value="enforcer-alternatives-v107">Enforcers · poses alternatives V107/);
});

test('native accepted files have matching actual receipts, real alpha and complete visible silhouettes',async()=>{
 const hashes=new Set();
 for(const row of manifest.assets){
  const bytes=fs.readFileSync(row.repoPngPath),receipt=read(row.receiptPath),metadata=await sharp(bytes).metadata();
  assert.equal(bytes.length,row.bytes);assert.equal(digest(bytes),row.sha256);hashes.add(row.sha256);
  assert.equal(receipt.sha256,row.sha256);assert.equal(receipt.bytes,row.bytes);
  assert.equal(receipt.method,'builtin-imagegen');assert.ok(receipt.promptExact);assert.equal(receipt.visualInspection.accepted,true);
  assert.equal(receipt.generatedAtUtc,null);assert.ok(!Number.isNaN(Date.parse(receipt.receiptCreatedAtUtc)));
  assert.equal(metadata.format,'png');assert.equal(metadata.width,1024);assert.equal(metadata.height,1536);assert.equal(metadata.hasAlpha,true);
  assert.equal(row.animated,false);assert.equal(row.newMapPlacement,false);assert.equal(row.canonicalFidelityCertified,false);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let zero=0;const bounds=[1024,1536,0,0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)zero++;
   if(alpha>20){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
  }
  assert.equal(zero,row.alphaZeroPixels);assert.ok(zero>info.width*info.height*.1);
  assert.deepEqual(bounds,row.contentBoundsAlpha20);assert.ok(bounds[0]>0&&bounds[1]>0&&bounds[2]<1024&&bounds[3]<1536,row.id);
 }
 assert.equal(hashes.size,18);
 const checkpoint=read(base+'/recovery/native-checkpoint.json');assert.equal(checkpoint.nativeOutputsCopied,18);
 for(const id of ['augmentes-assassin','four-armed']){
  const receipt=read(base+'/receipts/'+id+'--enforcers-comics-10.json');
  assert.equal(receipt.attempts.length,1);assert.equal(receipt.attempts[0].accepted,false);
  const reference=receipt.submittedReferences[0],bytes=fs.readFileSync(reference.path);
  assert.equal(digest(bytes),reference.sha256);assert.equal(reference.sha256,receipt.attempts[0].sha256);
  assert.ok(!registry.assets.some(row=>row.sha256===reference.sha256));
 }
 assert.ok(!/\/workspace\/|\/tmp\/|authfile:|[?&](?:token|signature)=/i.test(JSON.stringify([manifest,registry,checkpoint])));
});
