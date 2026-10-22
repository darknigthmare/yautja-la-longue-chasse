import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const unzip=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const base='docs/suivi-production/v613';
const manifest=read(`${base}/data/production-manifest.json`);
const plan=read(`${base}/references/production-plan-v613.json`);
const registry=read('app/game/data/enforcerProductionV613.json');
const master=unzip(`${base}/data/current-master.json.gz`);
const baseline=unzip('docs/suivi-production/v612/data/current-master.json.gz');
const previous=['v611','v612'].flatMap(v=>read(`docs/suivi-production/${v}/data/production-manifest.json`).assets.map(a=>({...a,lot:v})));
const reconciliation=read(`${base}/data/main-reconciliation.json`);
const checkpoint=read(`${base}/recovery/native-checkpoint.json`);
const recovery=read(`${base}/recovery/verified-native-files.json`);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const groups=['super-predators','feral','augmentes-assassin','spiked-tail','hornhead','saar-keth','ul-khar','sha-rhess','kaal-or','vaal-tir','city-hunter','pilot-kok','oni-kok','grendel-kok','alpha','bionic','four-armed','human-accepted'];
const ids=groups.flatMap(g=>[8,9].map(n=>`${g}--enforcers-comics-0${n}`));
const main='017f3bd8d37457ee56d0cfeb78da9835c6388b8f';
const previousCommit='842bc7e69ab5aed086d0fbbfcafd1d86a14e9f38';
const recoveryCommit='fe58028cb1afe0a9bbbd555f476b05e4afd85773';

test('V6.13 delivers exactly the 36 previously unmade Enforcer 08/09 identities',()=>{
 assert.equal(manifest.sourceMainCommit,main);assert.equal(manifest.currentMainCommit,main);assert.equal(manifest.sourceBranchCommit,previousCommit);
 assert.deepEqual(manifest.assets.map(a=>a.id).sort(),[...ids].sort());
 assert.deepEqual(registry.assets.map(a=>a.identityId).sort(),[...ids].sort());
 assert.equal(new Set(manifest.assets.map(a=>a.sha256)).size,36);
 const before=new Map(baseline.rows.map(r=>[r.values.A,r]));
 for(const a of manifest.assets){
  assert.equal(before.get(a.id).values.E,'Pas faite');assert.equal(a.priorStatusFR,'Pas faite');
  assert.equal(a.statusFR,'Conservée hors main');assert.equal(a.visualInspection.accepted,true);
  assert.equal(a.galleryInBranch,true);assert.equal(a.codexInBranch,true);
  assert.equal(a.animated,false);assert.equal(a.newMapPlacement,false);assert.equal(a.canonicalFidelityCertified,false);
 }
 assert.equal(manifest.summary.priorV610PngsRecovered,0);
});

test('all 108 PNG hashes remain intact and the 36 recovered files are native RGBA with complete visible bounds',async()=>{
 const proofById=new Map(recovery.assets.map(a=>[a.id,a]));
 assert.equal(recovery.recoveryCommit,recoveryCommit);assert.equal(recovery.regeneratedDuringRecovery,false);
 for(const a of [...previous,...manifest.assets]){
  const bytes=fs.readFileSync(a.repoPngPath);assert.equal(bytes.length,a.bytes,a.id);assert.equal(sha(bytes),a.sha256,a.id);
 }
 for(const a of manifest.assets){
  const bytes=fs.readFileSync(a.repoPngPath),meta=await sharp(bytes).metadata(),proof=proofById.get(a.id);
  assert.equal(meta.format,'png');assert.equal(meta.width,1024);assert.equal(meta.height,1536);
  assert.equal(meta.channels,4);assert.equal(meta.hasAlpha,true);
  assert.equal(blob(bytes),a.nativeGitBlobSha);assert.equal(blob(bytes),proof.gitBlobSha);
  assert.equal(proof.sha256,a.sha256);assert.equal(a.nativeRecoveryCommit,recoveryCommit);assert.equal(a.recoveredByteIdenticalToGitBlob,true);
  const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
  let zero=0,solid=0;const bounds=[1024,1536,0,0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)zero++;if(alpha>=250)solid++;
   if(alpha>20){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
  }
  assert.equal(zero,a.alphaZeroPixels);assert.equal(solid,a.alphaSolidPixels);assert.deepEqual(bounds,a.contentBoundsAlpha20);
  assert(zero>info.width*info.height*.1&&solid>0);assert(bounds[0]>0&&bounds[1]>0&&bounds[2]<1024&&bounds[3]<1536,a.id);
 }
 assert.equal(manifest.assets.find(a=>a.id==='pilot-kok--enforcers-comics-09').sha256,'9e6f04b2688886189f236d0d233e12638d914193d0745eface2877155e63d9cc');
});

test('gallery and codex expose all new identities, with the 973 automatic choices and human body boundary unchanged',()=>{
 const qa=homeworldSceneSsrV78(),library=qa.load('app/game/systems/recentSpriteLibraryV85.ts'),codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeEnforcerFilesV613,36);
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.uniqueReferencedHashes,1985);
 const defaults=read(`${base}/data/default-selections-before.json`);
 assert.equal(defaults.commit,main);assert.equal(defaults.queries.length,973);
 for(const r of defaults.queries)assert.equal(library.findImportedYautjaArtV85(r.query)?.assetId??null,r.assetId,JSON.stringify(r.query));
 for(const a of registry.assets){
  assert.equal(a.priority,48);assert.deepEqual(library.recentSpriteByIdV85(a.id),a);
  assert(codex.RECENT_SPRITE_CODEX_V85.some(r=>r.source.id===a.id));
  const picked=library.findImportedYautjaArtV85({assetId:a.id});
  if(a.groupId==='human-accepted')assert.equal(picked,null);else assert.equal(picked?.assetId,a.id);
 }
 const markup=qa.render('app/game/RecentSpriteLibraryV85.tsx',{onClose:()=>{}});
 assert.match(markup,/<option value="enforcers-v613">Enforcers V6\.13/);assert.match(markup,/36 Enforcers V6\.13/);
});

test('the master preserves all 5120 identities and limits its 720 changes to 108 production rows',()=>{
 const before=new Map(baseline.rows.map(r=>[r.values.A,r]));
 const previousById=new Map(previous.map(a=>[a.id,a])),newById=new Map(manifest.assets.map(a=>[a.id,a]));
 assert.equal(master.rows.length,5120);assert.equal(new Set(master.rows.map(r=>r.values.A)).size,5120);
 const counts={};let changedCells=0,changedRows=0,newStatuses=0,mergedStatuses=0;
 const v611Allowed=['F','W','AF'],v612Allowed=['E','F','G','W','AA','AB','AC','AF','AH'],newAllowed=['E','G','AA','AB','AC','AE','AH','AI'];
 for(const row of master.rows){
  const old=before.get(row.values.A);assert(old);assert.equal(row.rowNumber,old.rowNumber);assert.deepEqual(row.cellTypes,old.cellTypes);
  counts[row.values.E]=(counts[row.values.E]??0)+1;
  for(const key of Object.keys(old.values))assert(Object.hasOwn(row.values,key),'Historical field removed: '+row.values.A+' '+key);
  const changed=[...new Set([...Object.keys(old.values),...Object.keys(row.values)])].filter(k=>old.values[k]!==row.values[k]);
  if(changed.length){changedRows++;changedCells+=changed.length;}
  const prior=previousById.get(row.values.A),fresh=newById.get(row.values.A);
  if(prior){
   assert.deepEqual(changed.sort(),(prior.lot==='v611'?v611Allowed:v612Allowed).slice().sort(),row.values.A);
   assert.equal(row.values.F,'Galerie et codex');assert.equal(row.values.W,'Oui');assert.equal(row.values.AF,prior.sha256);
   assert.equal(row.values.E,'Présente dans main');
   if(prior.lot==='v612'){assert.equal(old.values.E,'Conservée hors main');mergedStatuses++;assert(row.values.AB.includes('/'+main+'/'));assert(row.values.AC.includes('/'+main+'/'));}
  }else if(fresh){
   assert.deepEqual(changed.sort(),newAllowed.slice().sort());assert.equal(old.values.E,'Pas faite');assert.equal(row.values.E,'Conservée hors main');newStatuses++;
   assert.equal(row.values.W,old.values.W);assert.equal(row.values.F,old.values.F);assert.equal(row.values.AF,old.values.AF);
   for(const key of ['AA','AB','AC','AE','AH','AI'])assert(row.values[key],'Production evidence missing: '+row.values.A+' '+key);
  }else assert.deepEqual(row,old,row.values.A);
  for(const key of ['X','Y','Z','AG','AJ'])assert.equal(row.values[key],old.values[key],row.values.A+' '+key);
 }
 assert.equal(changedCells,720);assert.equal(changedRows,108);assert.equal(newStatuses,36);assert.equal(mergedStatuses,36);
 assert.deepEqual(counts,{'Présente dans main':2161,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2718});
 assert.deepEqual(master.statusCounts,counts);assert.equal(master.sourceMainCommit,main);assert.equal(master.sourceBranchCommit,previousCommit);
 assert.equal(master.rows.filter(r=>groups.includes(r.values.J)&&r.values.K==='enforcers-comics'&&r.values.D===10&&r.values.E==='Pas faite').length,18);
});

test('the reconciliation proves both merged native lots without inventing placements or performing a merge',()=>{
 assert.equal(reconciliation.currentMainCommit,main);assert.equal(reconciliation.currentMainTree,'f2b810b3d994ea5f2935f5477e154e695f0c220c');
 assert.equal(reconciliation.previousProductionCommit,previousCommit);assert.equal(reconciliation.previousProductionCommitIsAncestorOfMain,true);
 assert.equal(reconciliation.mergedPullRequest,9);assert.equal(reconciliation.mergedAtUtc,'2026-10-22T06:31:48Z');assert.equal(reconciliation.mergePerformedByThisDelivery,false);
 assert.equal(reconciliation.mainV611AssetCount,36);assert.equal(reconciliation.mainV612AssetCount,36);assert.equal(reconciliation.assets.length,72);
 assert.deepEqual(reconciliation.statusCountsAfterReconciliationAndV613,master.statusCounts);
 const previousById=new Map(previous.map(a=>[a.id,a]));
 for(const proof of reconciliation.assets){
  const a=previousById.get(proof.id);assert(a);const bytes=fs.readFileSync(a.repoPngPath);
  assert.equal(proof.existsInMain,true);assert.equal(proof.repoPath,a.repoPngPath);assert.equal(proof.sha256,sha(bytes));assert.equal(proof.bytes,bytes.length);assert.equal(proof.gitBlobSha,blob(bytes));
 }
 assert.equal(reconciliation.runtimeRegistriesInMain.length,2);
 for(const proof of reconciliation.runtimeRegistriesInMain){const bytes=fs.readFileSync(proof.repoPath);assert.equal(proof.existsInMain,true);assert.equal(proof.sha256,sha(bytes));assert.equal(proof.gitBlobSha,blob(bytes));}
});

test('missing final receipts remain explicit and only matching accepted attempts supply exact prompts or dates',()=>{
 const oldById=new Map(checkpoint.assets.map(a=>[a.id,a])),plannedById=new Map(plan.records.map(a=>[a.id,a]));
 const checkpointSha=sha(fs.readFileSync(`${base}/recovery/native-checkpoint.json`));
 let matched=0,missing=0;
 assert.equal(checkpoint.acceptedCount,21);assert.equal(recovery.historicalCheckpointSha256,checkpointSha);
 for(const a of manifest.assets){
  const old=oldById.get(a.id),match=old?.sha256===a.sha256&&old?.bytes===a.bytes;
  assert.equal(a.provenanceRecovery.historicalCheckpointMatchesFinal,!!match);assert.equal(a.provenanceRecovery.checkpointSha256,checkpointSha);
  assert.equal(a.plannedPromptIsSubmissionEvidence,false);assert.equal(a.plannedPromptExact,plannedById.get(a.id).generationPromptFR);
  assert.equal(a.initialReceiptGeneratedAtUtc,old?.generatedAtUtc??null);assert(!Number.isNaN(Date.parse(a.verifiedAtUtc)));
  assert(a.visualInspection.notesFR);assert(a.timestampEvidenceFR);assert.equal(a.references.length,2);
  if(match){
   matched++;const accepted=old.attempts.find(t=>t.accepted&&t.sha256===a.sha256);assert(accepted);
   assert.equal(a.acceptedOutputPromptExact,accepted.promptExact);assert.equal(a.generatedAtUtc,accepted.generatedAtUtc);
   assert.equal(a.copiedByteIdentical,true);assert(a.attempts.some(t=>t.acceptedForCurrentOutput&&t.sha256===a.sha256));
  }else{
   missing++;assert.equal(a.acceptedOutputPromptExact,null);assert.equal(a.promptExact,null);assert.equal(a.generatedAtUtc,null);assert.equal(a.receiptCreatedAtUtc,null);
   assert.equal(a.copiedByteIdentical,null);assert(a.attempts.every(t=>!t.acceptedForCurrentOutput));
   assert.match(a.visualInspection.limitationsFR.join(' '),/non récupérés/);
  }
 }
 assert.equal(matched,15);assert.equal(missing,21);assert.equal(manifest.summary.matchingFinalReceiptsRecovered,matched);assert.equal(manifest.summary.finalReceiptsNotRecovered,missing);
 const publicText=JSON.stringify([manifest,registry,recovery,reconciliation]);
 assert(!/\/workspace\/|\/tmp\/|authfile:|download_url|file_uri|[?&](?:token|signature|x-goog-signature)=/i.test(publicText));
});
