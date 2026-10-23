import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const unzip=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const base='docs/suivi-production/v614';
const manifest=read(`${base}/data/production-manifest.json`);
const plan=read(`${base}/references/production-plan-v614.json`);
const registry=read('app/game/data/enforcerProductionV614.json');
const master=unzip(`${base}/data/current-master.json.gz`);
const baseline=unzip('docs/suivi-production/v613/data/current-master.json.gz');
const previous=['v611','v612','v613'].flatMap(v=>read(`docs/suivi-production/${v}/data/production-manifest.json`).assets.map(a=>({...a,lot:v})));
const reconciliation=read(`${base}/data/main-reconciliation.json`);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const groups=['super-predators','feral','augmentes-assassin','spiked-tail','hornhead','saar-keth','ul-khar','sha-rhess','kaal-or','vaal-tir','city-hunter','pilot-kok','oni-kok','grendel-kok','alpha','bionic','four-armed','human-accepted'];
const ids=groups.map(g=>`${g}--enforcers-comics-10`);
const main='92e7c824fd80d6b8152855b3d66560448f8c48c0';

test('V6.14 delivers the 18 Enforcer 10 identities still unmade on the V106 base',()=>{
 assert.equal(plan.sourceMainCommit,main);assert.equal(manifest.sourceMainCommit,main);
 assert.deepEqual(plan.records.map(a=>a.id).sort(),[...ids].sort());
 assert.deepEqual(manifest.assets.map(a=>a.id).sort(),[...ids].sort());
 assert.deepEqual(registry.assets.map(a=>a.identityId).sort(),[...ids].sort());
 const before=new Map(baseline.rows.map(r=>[r.values.A,r]));
 for(const a of manifest.assets){
  assert.equal(before.get(a.id).values.E,'Pas faite');assert.equal(a.priorStatusFR,'Pas faite');
  assert.equal(a.variant,10);assert.equal(a.nameFR,'Chef de poursuite');
  assert.equal(a.statusFR,'Conservée hors main');assert.equal(a.visualInspection.accepted,true);
  assert.equal(a.galleryInBranch,true);assert.equal(a.codexInBranch,true);
  assert.equal(a.animated,false);assert.equal(a.newMapPlacement,false);assert.equal(a.canonicalFidelityCertified,false);
 }
 assert.equal(manifest.summary.priorV610PngsRecovered,0);
});

test('the cumulative 126 PNGs retain their native hashes and every new file has real alpha and complete visible bounds',async()=>{
 const assets=[...previous,...manifest.assets];
 assert.equal(assets.length,126);assert.equal(new Set(assets.map(a=>a.sha256)).size,126);
 for(const a of assets){
  const bytes=fs.readFileSync(a.repoPngPath);assert.equal(bytes.length,a.bytes,a.id);assert.equal(sha(bytes),a.sha256,a.id);
 }
 for(const a of manifest.assets){
  const bytes=fs.readFileSync(a.repoPngPath),meta=await sharp(bytes).metadata();
  assert.equal(meta.format,'png');assert.equal(meta.width,1024);assert.equal(meta.height,1536);
  assert.equal(meta.channels,4);assert.equal(meta.hasAlpha,true);assert.equal(a.copiedByteIdentical,true);
  if(a.nativeGitBlobSha)assert.equal(blob(bytes),a.nativeGitBlobSha);
  const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
  let zero=0,solid=0;const bounds=[1024,1536,0,0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)zero++;if(alpha>=250)solid++;
   if(alpha>20){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
  }
  assert.equal(zero,a.alphaZeroPixels);assert.equal(solid,a.alphaSolidPixels);assert.deepEqual(bounds,a.contentBoundsAlpha20);
  assert(zero>info.width*info.height*.1&&solid>0);assert(bounds[0]>0&&bounds[1]>0&&bounds[2]<1024&&bounds[3]<1536,a.id);
 }
});

test('all 18 final outputs retain the submitted prompt and a matching accepted receipt',()=>{
 const planned=new Map(plan.records.map(a=>[a.id,a]));
 for(const a of manifest.assets){
  assert.equal(a.generationMethod,'builtin-imagegen');
  assert.equal(typeof a.acceptedOutputPromptExact,'string');assert(a.acceptedOutputPromptExact.trim().length>100);
  const accepted=a.attempts.find(t=>(t.accepted||t.acceptedForCurrentOutput)&&t.sha256===a.sha256);
  assert(accepted,'Missing accepted native receipt: '+a.id);assert.equal(accepted.promptExact,a.acceptedOutputPromptExact);
  assert(!Number.isNaN(Date.parse(a.generatedAtUtc)));assert(!Number.isNaN(Date.parse(a.verifiedAtUtc)));
  assert(a.timestampEvidenceFR);assert(a.visualInspection.notesFR);assert(a.visualInspection.limitationsFR.length);
  assert.equal(a.plannedPromptIsSubmissionEvidence,false);assert.equal(a.plannedPromptExact,planned.get(a.id).generationPromptFR);
 }
 const old=read('docs/suivi-production/v613/data/production-manifest.json');
 assert.equal(old.assets.filter(a=>!a.acceptedOutputPromptExact).length,21,'Historical missing receipts must not be invented');
 assert(!/\/workspace\/|\/tmp\/|authfile:|download_url|file_uri|[?&](?:token|signature|x-goog-signature)=/i.test(JSON.stringify([manifest,registry,reconciliation])));
});

test('gallery and codex expose V6.14 while the 973 default choices and human body boundary stay unchanged',()=>{
 const qa=homeworldSceneSsrV78(),library=qa.load('app/game/systems/recentSpriteLibraryV85.ts'),codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeEnforcerFilesV614,18);
 assert.equal(new Set(library.RECENT_SPRITE_ASSETS_V85.filter(a=>a.packId!=='npc-v615').map(a=>a.sha256)).size,2003);
 assert.equal(new Set(library.RECENT_SPRITE_ASSETS_V85.filter(a=>!['enforcers-v614','npc-v615'].includes(a.packId)).map(a=>a.sha256)).size,1985);
 const defaults=read(`${base}/data/default-selections-before.json`);
 assert.equal(defaults.commit,main);assert.equal(defaults.queries.length,973);
 for(const r of defaults.queries)assert.equal(library.findImportedYautjaArtV85(r.query)?.assetId??null,r.assetId,JSON.stringify(r.query));
 for(const a of registry.assets){
  assert.equal(typeof a.sourceNote,'string',a.id);
  assert.equal(a.priority,47);assert.deepEqual(library.recentSpriteByIdV85(a.id),a);
  assert(codex.RECENT_SPRITE_CODEX_V85.some(r=>r.source.id===a.id));
  const picked=library.findImportedYautjaArtV85({assetId:a.id});
  if(a.groupId==='human-accepted')assert.equal(picked,null);else assert.equal(picked?.assetId,a.id);
 }
 const markup=qa.render('app/game/RecentSpriteLibraryV85.tsx',{onClose:()=>{}});
 assert.match(markup,/<option value="enforcers-v614">Enforcers V6\.14/);assert.match(markup,/18 Enforcers V6\.14/);
});

test('the master changes only the 36 merged V6.13 rows and 18 new rows, preserving all other identities and placements',()=>{
 const before=new Map(baseline.rows.map(r=>[r.values.A,r]));
 const promoted=new Map(previous.filter(a=>a.lot==='v613').map(a=>[a.id,a]));
 const fresh=new Set(ids),counts={};let changedRows=0,addedStatuses=0,mergedStatuses=0;
 assert.equal(master.rows.length,5120);assert.equal(new Set(master.rows.map(r=>r.values.A)).size,5120);
 const allowed=new Set(['E','F','G','W','AA','AB','AC','AD','AE','AF','AH','AI']);
 for(const row of master.rows){
  const old=before.get(row.values.A);assert(old);assert.equal(row.rowNumber,old.rowNumber);assert.deepEqual(row.cellTypes,old.cellTypes);
  counts[row.values.E]=(counts[row.values.E]??0)+1;
  for(const key of Object.keys(old.values))assert(Object.hasOwn(row.values,key),'Historical field removed: '+row.values.A+' '+key);
  const changed=[...new Set([...Object.keys(old.values),...Object.keys(row.values)])].filter(k=>old.values[k]!==row.values[k]);
  if(changed.length)changedRows++;
  if(promoted.has(row.values.A)){
   assert.equal(old.values.E,'Conservée hors main');assert.equal(row.values.E,'Présente dans main');mergedStatuses++;
   assert.equal(row.values.F,'Galerie et codex');assert.equal(row.values.W,'Oui');assert.equal(row.values.AF,promoted.get(row.values.A).sha256);
   assert(row.values.AB.includes('/'+main+'/'));assert(row.values.AC.includes('/'+main+'/'));
  }else if(fresh.has(row.values.A)){
   assert.equal(old.values.E,'Pas faite');assert.equal(row.values.E,'Conservée hors main');addedStatuses++;
   assert.equal(row.values.F,old.values.F);assert.equal(row.values.W,old.values.W);assert.equal(row.values.AF,old.values.AF);
   for(const key of ['AA','AB','AC','AE','AH','AI'])assert(row.values[key],'Missing new production evidence: '+row.values.A+' '+key);
  }else assert.deepEqual(row,old,row.values.A);
  for(const key of changed)assert(allowed.has(key),'Unaudited field changed: '+row.values.A+' '+key);
  for(const key of ['X','Y','Z','AG','AJ'])assert.equal(row.values[key],old.values[key],row.values.A+' '+key);
 }
 assert.equal(changedRows,54);assert.equal(addedStatuses,18);assert.equal(mergedStatuses,36);
 assert.deepEqual(counts,{'Présente dans main':2197,'Produite — à vérifier':205,'Conservée hors main':18,'Pas faite':2700});
 assert.deepEqual(master.statusCounts,counts);assert.equal(master.sourceMainCommit,main);
 assert.equal(master.rows.filter(r=>groups.includes(r.values.J)&&r.values.K==='enforcers-comics'&&r.values.D===10&&r.values.E==='Pas faite').length,0);
});

test('the new reconciliation proves all 108 prior native files against main without changing historical claims',()=>{
 assert.equal(reconciliation.currentMainCommit,main);
 assert.equal(reconciliation.previousProductionCommit,'4ef1eb48e45278db4606d8ee9999647c62c80a21');
 assert.equal(reconciliation.previousProductionCommitIsAncestorOfMain,true);
 assert.equal(reconciliation.mergePerformedByThisDelivery,false);
 assert.equal(reconciliation.mainNativeAssetCount,108);assert.equal(reconciliation.assets.length,108);
 const prior=new Map(previous.map(a=>[a.id,a]));
 for(const proof of reconciliation.assets){
  const a=prior.get(proof.id);assert(a);const bytes=fs.readFileSync(a.repoPngPath);
  assert.equal(proof.existsInMain,true);assert.equal(proof.repoPath,a.repoPngPath);
  assert.equal(proof.sha256,sha(bytes));assert.equal(proof.bytes,bytes.length);assert.equal(proof.gitBlobSha,blob(bytes));
 }
 assert.equal(reconciliation.runtimeRegistriesInMain.length,3);
 for(const proof of reconciliation.runtimeRegistriesInMain){const bytes=fs.readFileSync(proof.repoPath);assert.equal(proof.existsInMain,true);assert.equal(proof.sha256,sha(bytes));assert.equal(proof.gitBlobSha,blob(bytes));}
});
