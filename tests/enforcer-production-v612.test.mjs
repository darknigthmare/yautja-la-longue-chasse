import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const unzip=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const base='docs/suivi-production/v612';
const manifest=read(`${base}/data/production-manifest.json`);
const registry=read('app/game/data/enforcerProductionV612.json');
const master=unzip(`${base}/data/current-master.json.gz`);
const baseline=unzip('docs/suivi-production/v611/data/current-master.json.gz');
const previous=read('docs/suivi-production/v611/data/production-manifest.json');
const mainReconciliation=read(`${base}/data/main-reconciliation.json`);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlobSha=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const groups=['super-predators','feral','augmentes-assassin','spiked-tail','hornhead','saar-keth','ul-khar','sha-rhess','kaal-or','vaal-tir','city-hunter','pilot-kok','oni-kok','grendel-kok','alpha','bionic','four-armed','human-accepted'];
const ids=groups.flatMap(g=>[6,7].map(n=>`${g}--enforcers-comics-0${n}`));
const sourceBranch='ac2bc04d0bb65f6f8b725aefa982a503f01a74e1';
const referenceMain='536ac53335e440747f6eccedd2cd757d1f817a99';
const currentMain='dbd7625ade2c83d133875138516fb21fae2aa7bf';

test('V6.12 covers exactly variants 06 and 07 of all 18 requested groups',()=>{
 assert.equal(manifest.sourceMainCommit,referenceMain);
 assert.equal(manifest.currentMainCommit,currentMain);
 assert.equal(manifest.sourceBranchCommit,sourceBranch);
 assert.equal(manifest.assets.length,36);
 assert.deepEqual(manifest.assets.map(a=>a.id).sort(),[...ids].sort());
 assert.deepEqual(registry.assets.map(a=>a.identityId).sort(),[...ids].sort());
 assert.equal(new Set(manifest.assets.map(a=>a.sha256)).size,36);
 const before=new Map(baseline.rows.map(r=>[r.values.A,r]));
 for(const a of manifest.assets){
  assert.equal(before.get(a.id).values.E,'Pas faite',a.id);
  assert.equal(a.priorStatusFR,'Pas faite');assert.equal(a.statusFR,'Conservée hors main');
  assert.equal(a.visualInspection.accepted,true);
  assert.equal(a.galleryInBranch,true);assert.equal(a.codexInBranch,true);
  assert.equal(a.animated,false);assert.equal(a.newMapPlacement,false);assert.equal(a.canonicalFidelityCertified,false);
 }
});

test('the 72 native PNGs retain their recorded bytes, and every new silhouette has real alpha and complete bounds',async()=>{
 for(const a of [...previous.assets,...manifest.assets]){
  const bytes=fs.readFileSync(a.repoPngPath);
  assert.equal(bytes.length,a.bytes,a.id);assert.equal(sha(bytes),a.sha256,a.id);
 }
 for(const a of manifest.assets){
  const bytes=fs.readFileSync(a.repoPngPath),meta=await sharp(bytes).metadata();
  assert.equal(meta.format,'png');assert.equal(meta.width,1024);assert.equal(meta.height,1536);
  assert.equal(meta.channels,4);assert.equal(meta.hasAlpha,true);
  const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
  let zero=0;const bounds=[1024,1536,0,0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)zero++;
   if(alpha>20){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
  }
  assert.equal(zero,a.alphaZeroPixels);assert.deepEqual(bounds,a.contentBoundsAlpha20);
  assert(zero>info.width*info.height*.1);assert(bounds[0]>0&&bounds[1]>0&&bounds[2]<1024&&bounds[3]<1536,a.id);
  assert.equal(a.copiedByteIdentical,true);
 }
});

test('gallery and codex expose V6.12 while all 973 defaults and the human body boundary stay unchanged',()=>{
 const qa=homeworldSceneSsrV78();
 const library=qa.load('app/game/systems/recentSpriteLibraryV85.ts');
 const codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeEnforcerFilesV612,36);
 assert.equal(new Set(library.RECENT_SPRITE_ASSETS_V85.filter(asset=>asset.packId!=='enforcers-v613').map(asset=>asset.sha256)).size,1949);
 const defaults=read(`${base}/data/default-selections-before.json`);
 assert.equal(defaults.commit,sourceBranch);assert.equal(defaults.queries.length,973);
 for(const r of defaults.queries)assert.equal(library.findImportedYautjaArtV85(r.query)?.assetId??null,r.assetId,JSON.stringify(r.query));
 for(const a of registry.assets){
  assert.equal(a.priority,49);assert.deepEqual(library.recentSpriteByIdV85(a.id),a);
  assert(codex.RECENT_SPRITE_CODEX_V85.some(r=>r.source.id===a.id));
  const picked=library.findImportedYautjaArtV85({assetId:a.id});
  if(a.groupId==='human-accepted')assert.equal(picked,null);
  else assert.equal(picked?.assetId,a.id);
 }
 const markup=qa.render('app/game/RecentSpriteLibraryV85.tsx',{onClose:()=>{}});
 assert.match(markup,/<option value="enforcers-v612">Enforcers V6\.12/);
 assert.match(markup,/36 Enforcers V6\.12/);
});

test('the 5120-ID master adds 36 V6.12 statuses and reconciles the 36 merged V6.11 identities with main',()=>{
 const before=new Map(baseline.rows.map(r=>[r.values.A,r]));
 assert.equal(master.rows.length,5120);assert.equal(new Set(master.rows.map(r=>r.values.A)).size,5120);
 const previousIds=new Set(previous.assets.map(a=>a.id)),newIds=new Set(ids);
 const previousAllowed=new Set(['E','G','AA','AB','AC','AH']);
 const newAllowed=new Set(['E','G','AA','AB','AC','AE','AH','AI']);
 let newStatuses=0,reconciledWithMain=0;const counts={};
 for(const row of master.rows){
  const old=before.get(row.values.A);assert(old);assert.equal(row.rowNumber,old.rowNumber);
  counts[row.values.E]=(counts[row.values.E]??0)+1;
  for(const key of Object.keys(old.values))assert(Object.hasOwn(row.values,key),'Historical field removed: '+row.values.A+' '+key);
  const changed=[...new Set([...Object.keys(old.values),...Object.keys(row.values)])].filter(k=>row.values[k]!==old.values[k]);
  if(newIds.has(row.values.A)){
   assert.equal(old.values.E,'Pas faite');assert.equal(row.values.E,'Conservée hors main');newStatuses++;
   assert(changed.every(k=>newAllowed.has(k)),row.values.A+': '+changed.join(','));
   for(const key of ['AA','AB','AC','AE','AH','AI'])assert(row.values[key],'New production proof missing: '+row.values.A+' '+key);
  }else if(previousIds.has(row.values.A)){
   assert.equal(old.values.E,'Conservée hors main');assert.equal(row.values.E,'Présente dans main');reconciledWithMain++;
   assert(changed.every(k=>previousAllowed.has(k)),row.values.A+': '+changed.join(','));
   assert(row.values.AB.includes('/'+currentMain+'/'));assert(row.values.AC.includes('/'+currentMain+'/'));
  }else assert.deepEqual(row,old,row.values.A);
 }
 assert.equal(newStatuses,36);assert.equal(reconciledWithMain,36);
 assert.deepEqual(counts,{'Présente dans main':2125,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2754});
 assert.deepEqual(master.statusCounts,counts);assert.equal(master.sourceBranchCommit,sourceBranch);
 assert.equal(master.sourceMainCommit,currentMain);

 // The remote main tree was checked when this proof was captured. Reverify
 // every recorded blob against the unchanged local V6.11 files, without a
 // network dependency or an assumption that CI fetched all ancestor commits.
 assert.equal(mainReconciliation.currentMainCommit,currentMain);
 assert.equal(mainReconciliation.previousAuditedMainCommit,referenceMain);
 assert.equal(mainReconciliation.previousProductionCommit,sourceBranch);
 assert.equal(mainReconciliation.previousProductionCommitIsAncestorOfMain,true);
 assert.equal(mainReconciliation.mergedPullRequest,7);
 assert(!Number.isNaN(Date.parse(mainReconciliation.mergedAtUtc)));
 assert.equal(mainReconciliation.mainV611AssetCount,36);
 assert.deepEqual(mainReconciliation.statusCountsAfterReconciliationAndV612,counts);
 assert.deepEqual(mainReconciliation.assets.map(a=>a.id).sort(),[...previousIds].sort());
 const previousById=new Map(previous.assets.map(a=>[a.id,a]));
 for(const proof of mainReconciliation.assets){
  const old=previousById.get(proof.id);assert(old);
  assert.equal(proof.repoPath,old.repoPngPath);assert.equal(proof.sha256,old.sha256);assert.equal(proof.bytes,old.bytes);
  assert.equal(proof.existsInMain,true);
  assert.equal(gitBlobSha(fs.readFileSync(proof.repoPath)),proof.gitBlobSha,proof.id);
 }
 const registryProof=mainReconciliation.runtimeRegistryInMain;
 assert.equal(registryProof.repoPath,'app/game/data/enforcerProductionV611.json');
 assert.equal(registryProof.existsInMain,true);
 const registryBytes=fs.readFileSync(registryProof.repoPath);
 assert.equal(registryBytes.length,registryProof.bytes);assert.equal(sha(registryBytes),registryProof.sha256);
 assert.equal(gitBlobSha(registryBytes),registryProof.gitBlobSha);
 assert.equal(mainReconciliation.newBranch,'codex/enforcers-v612-20261021');
});

test('V6.12 preserves accepted prompts, verified same-group references and lineage-specific requirements',()=>{
 for(const a of manifest.assets){
  assert(a.promptExact.length>500);assert.equal(a.references.length,2);
  assert(a.references.every(r=>r.bytesVerified&&r.sourceCommit===manifest.sourceMainCommit&&r.id.startsWith(a.groupId+'--')));
  assert.match(a.references[0].id,/enforcers-comics-01$/);assert.match(a.references[1].id,/blooded-01$/);
  assert(a.visualInspection.notesFR);
  assert(!Number.isNaN(Date.parse(a.generatedAtUtc)));assert(a.timestampEvidenceFR);
  const accepted=a.attempts.find(t=>t.accepted&&t.sha256===a.sha256);
  assert(accepted,'Accepted native attempt missing: '+a.id);
  assert.equal(a.acceptedOutputPromptExact,accepted.promptExact);
  for(let i=1;i<a.attempts.length;i++)assert(a.attempts[i].attempt>a.attempts[i-1].attempt);
  for(const attempt of a.attempts){
   assert(typeof attempt.promptExact==='string'&&attempt.promptExact.length>0);
   if(attempt.sha256)assert.match(attempt.sha256,/^[a-f0-9]{64}$/);
   if(attempt.inputSha256)assert.match(attempt.inputSha256,/^[a-f0-9]{64}$/);
  }
  if(a.groupId==='human-accepted'){
   assert(a.userOverrides.length);assert.match(a.promptExact,/dreadlocks/i);assert.match(a.promptExact,/humain|human/i);
  }
  if(a.groupId==='four-armed')assert.match(a.promptExact,/quatre bras|four(?: organic)? arms/i);
  if(a.groupId==='pilot-kok')assert.match(a.promptExact,/chauve|bald/i);
 }
 const text=JSON.stringify([manifest,registry]);
 assert(!/\/workspace\/|\/tmp\/|authfile:|download_url|file_uri|[?&](?:token|signature|x-goog-signature)=/i.test(text));
});
