import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base='docs/suivi-production/v611';
const manifest=read(`${base}/data/production-manifest.json`);
const registry=read('app/game/data/enforcerProductionV611.json');
const master=JSON.parse(zlib.gunzipSync(fs.readFileSync(`${base}/data/current-master.json.gz`)));
const source=JSON.parse(zlib.gunzipSync(fs.readFileSync(`${base}/references/source-workbook.json.gz`)));
const prior=read(`${base}/data/prior-production-v610.json`);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const groups=['super-predators','feral','augmentes-assassin','spiked-tail','hornhead','saar-keth','ul-khar','sha-rhess','kaal-or','vaal-tir','city-hunter','pilot-kok','oni-kok','grendel-kok','alpha','bionic','four-armed','human-accepted'];
const ids=groups.flatMap(g=>[4,5].map(n=>`${g}--enforcers-comics-0${n}`));

test('36 previously unmade catalogue identities cover both variants of every requested group',()=>{
 assert.deepEqual(manifest.assets.map(a=>a.id).sort(),[...ids].sort());
 assert.equal(new Set(manifest.assets.map(a=>a.sha256)).size,36);
 const old=new Map(source.sheets.Variantes.rows.map(r=>[r.values.A,r]));
 for(const a of manifest.assets){
  assert.equal(old.get(a.id).values.E,'Pas faite');
  assert.equal(a.priorStatusFR,'Pas faite');assert.equal(a.visualInspection.accepted,true);
  assert.equal(a.galleryInBranch,true);assert.equal(a.codexInBranch,true);
  assert.equal(a.animated,false);assert.equal(a.newMapPlacement,false);assert.equal(a.canonicalFidelityCertified,false);
 }
});

test('every installed PNG has the accepted native bytes, a real alpha channel and complete frame bounds',async()=>{
 for(const a of manifest.assets){
  const bytes=fs.readFileSync(a.repoPngPath);
  assert.equal(bytes.length,a.bytes,a.id);assert.equal(sha(bytes),a.sha256,a.id);
  const meta=await sharp(bytes).metadata();
  assert.equal(meta.format,'png');assert.equal(meta.width,1024);assert.equal(meta.height,1536);assert.equal(meta.channels,4);assert.equal(meta.hasAlpha,true);
  const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});let zero=0;const bounds=[1024,1536,0,0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)zero++;
   if(alpha>20){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
  }
  assert.equal(zero,a.alphaZeroPixels);assert.deepEqual(bounds,a.contentBoundsAlpha20);
  assert(zero>info.width*info.height*.1);assert(bounds[0]>0&&bounds[1]>0&&bounds[2]<1024&&bounds[3]<1536,a.id);
  assert.equal(a.copiedByteIdentical,true);
 }
});

test('gallery and codex include the new identities while existing default selections and human body separation are preserved',()=>{
 const qa=homeworldSceneSsrV78(),library=qa.load('app/game/systems/recentSpriteLibraryV85.ts'),codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeEnforcerFilesV611,36);
 assert.equal(new Set(library.RECENT_SPRITE_ASSETS_V85.filter(asset=>!['enforcers-v612','enforcers-v613'].includes(asset.packId)).map(asset=>asset.sha256)).size,1913);
 const defaults=read(`${base}/data/default-selections-before.json`);
 for(const r of defaults.queries)assert.equal(library.findImportedYautjaArtV85(r.query)?.assetId??null,r.assetId,JSON.stringify(r.query));
 for(const a of registry.assets){
  assert.deepEqual(library.recentSpriteByIdV85(a.id),a);
  assert(codex.RECENT_SPRITE_CODEX_V85.some(r=>r.source.id===a.id));
  const picked=library.findImportedYautjaArtV85({assetId:a.id});
  if(a.groupId==='human-accepted')assert.equal(picked,null);
  else assert.equal(picked?.assetId,a.id);
 }
 const markup=qa.render('app/game/RecentSpriteLibraryV85.tsx',{onClose:()=>{}});
 assert.match(markup,/<option value="enforcers-v611">Enforcers V6\.11/);
 assert.match(markup,/36 Enforcers V6\.11/);
});

test('the 5120-ID master changes only the 36 new and 36 unrecovered production rows',()=>{
 const before=new Map(source.sheets.Variantes.rows.filter(r=>r.rowNumber>=7&&r.values.A).map(r=>[r.values.A,r]));
 assert.equal(master.rows.length,5120);assert.equal(new Set(master.rows.map(r=>r.values.A)).size,5120);
 const oldIds=new Set(prior.records.map(r=>r.id)),newIds=new Set(ids);let changed=0;
 const counts={};
 for(const row of master.rows){
  const old=before.get(row.values.A);assert(old);counts[row.values.E]=(counts[row.values.E]??0)+1;
  if(oldIds.has(row.values.A)){assert.equal(row.values.E,'Produite — à vérifier');changed++;}
  else if(newIds.has(row.values.A)){assert.equal(row.values.E,'Conservée hors main');changed++;}
  else assert.deepEqual(row,old,row.values.A);
 }
 assert.equal(changed,72);
 assert.deepEqual(counts,{'Présente dans main':2089,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2790});
 assert.deepEqual(counts,master.statusCounts);
 assert.equal(prior.records.length,36);assert.equal(prior.recoveredPngCount,0);
 for(const p of prior.records){assert.equal(p.availabilityNow,'not_recovered');assert.match(p.sha256,/^[a-f0-9]{64}$/);assert(p.visualReviewFR);}
});

test('generation receipts preserve exact prompts, verified references and lineage-specific requirements',()=>{
 for(const a of manifest.assets){
  assert(a.promptExact.length>500);assert.equal(a.references.length,2);
  assert(a.references.every(r=>r.bytesVerified&&r.sourceCommit===manifest.sourceMainCommit&&r.id.startsWith(a.groupId+'--')));
  assert.match(a.references[0].id,/enforcers-comics-01$/);assert.match(a.references[1].id,/blooded-01$/);
  assert.equal(a.visualInspection.accepted,true);assert(a.visualInspection.notesFR);
  for(let i=1;i<a.attempts.length;i++)assert(a.attempts[i].attempt>a.attempts[i-1].attempt);
  for(const attempt of a.attempts.filter(t=>t.inputNativeOutputName)){
   assert.match(attempt.inputSha256,/^[a-f0-9]{64}$/);assert(attempt.inputBytes>0);
   assert(a.attempts.some(t=>t.sha256===attempt.inputSha256&&t.bytes===attempt.inputBytes));
  }
  if(a.groupId==='human-accepted'){assert(a.userOverrides.length);assert.match(a.promptExact,/dreadlocks/i);assert.match(a.promptExact,/humain/i);}
  if(a.groupId==='four-armed')assert.match(a.promptExact,/quatre bras|four arms/i);
 }
 const text=JSON.stringify([manifest,registry,prior]);
 assert(!/\/workspace\/|\/tmp\/|authfile:|download_url|file_uri|[?&](?:token|signature|x-goog-signature)=/i.test(text));
 const city=manifest.assets.find(a=>a.id==='city-hunter--enforcers-comics-05');
 assert.equal(city.selectionEvent.selectedAttemptIndex,1);assert.equal(city.attempts[0].sha256,city.sha256);
 assert.equal(city.attempts[1].sha256,null);assert.equal(city.attempts[1].inputSha256,city.sha256);
});
