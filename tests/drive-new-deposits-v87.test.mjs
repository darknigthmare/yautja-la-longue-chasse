import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const data=JSON.parse(fs.readFileSync('app/game/data/driveNewDepositsSpritesV87.json','utf8'));
const proof=JSON.parse(fs.readFileSync('docs/drive-new-deposits-v87-sources.json','utf8'));
const sha=content=>createHash('sha256').update(content).digest('hex');
const validHash=/^[a-f0-9]{64}$/;
const sources=new Map(proof.sourceReceipts.map(source=>[source.id,source]));
const metadata=new Map(proof.metadataRecords.map(record=>[record.id,record]));

test('the five authenticated new revisions contain exactly 72 final PNG identities, not planning counts',()=>{
 assert.equal(data.assets.length,72);assert.equal(new Set(data.assets.map(asset=>asset.identityId)).size,72);
 assert.equal(new Set(data.assets.map(asset=>asset.sha256)).size,72);
 assert.deepEqual(data.packs.map(pack=>pack.pngEntriesImported),[24,24,24]);
 assert.equal(data.summary.newDistinctPngFiles,72);assert.equal(data.summary.newDistinctPngBytes,169484708);
 assert.equal(data.summary.alreadyPresentExactNativePngFiles,0);
 assert.equal(proof.sourceReceipts.length,5);assert.equal(proof.sourceReceipts.reduce((sum,source)=>sum+source.bytes,0),177413692);
 assert(proof.sourceReaders.every(reader=>reader.ok));
 const followup=proof.sourceReaders.find(reader=>reader.id==='1u6BGTya6-P_coCfXr5-xmjxK7B8jqMxA');
 assert.equal(followup.pngEntries,0);assert.equal(followup.jsonEntries,195);assert.equal(followup.scriptsIgnored,8);
 assert.equal(proof.archiveCodeExecuted,false);assert.equal(proof.pixelsModified,false);
 assert.deepEqual(proof.claims,{animationSheets:false,canon1to1:false,namedCanonFighters:false,allPlannedV69ContentComplete:false});
});

test('every imported original retains exact source bytes, hash, dimensions and a single PNG frame',()=>{
 let total=0;
 for(const asset of data.assets){
  assert.equal(asset.src,'/game/imports/v87/new-deposits/'+asset.sha256+'.png');
  const content=fs.readFileSync(path.join('public',asset.src.slice(1)));
  assert.equal(content.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(content.length,asset.bytes);assert.equal(sha(content),asset.sha256,asset.identityId);
  assert.deepEqual([content.readUInt32BE(16),content.readUInt32BE(20)],[1024,1536]);
  assert.deepEqual([asset.width,asset.height],[1024,1536]);
  // APNG animation requires acTL; inspect actual chunks rather than filenames.
  for(let offset=8;offset+12<=content.length;){
   const size=content.readUInt32BE(offset);const kind=content.subarray(offset+4,offset+8).toString('ascii');
   assert.notEqual(kind,'acTL');assert.notEqual(kind,'fcTL');assert.notEqual(kind,'fdAT');
   offset+=size+12;
  }
  assert.equal(asset.alphaFacts.mode,'RGBA');assert.equal(asset.alphaFacts.extrema[0],0);
  assert.equal(asset.actualPngFrameCount,1);assert.equal(asset.animationAvailable,false);
  assert.equal(asset.motionStatus,'single-pose-static');total+=content.length;
 }
 assert.equal(total,169484708);
});

test('original groups, adult ages, roles and human bodies are preserved without actor substitution',()=>{
 const groups=new Map();
 for(const asset of data.assets){
  const entries=groups.get(asset.groupId)??[];entries.push(asset);groups.set(asset.groupId,entries);
  assert.equal(asset.kind,'npc');assert.equal(asset.bodyComposition,'single-individual');assert.equal(asset.fullBody,true);
  assert(asset.lifeStage.startsWith('adult'));assert.equal(asset.canonicalFidelity,'not-certified-1-to-1');
  assert.equal(asset.strict1to1Verified,false);assert.equal(asset.visibleMounted,false);
  assert.equal(asset.supersedesIdentityId,'');assert.equal(asset.supersededByIdentityId,'');
  const record=metadata.get(asset.sourceMetadataRefs[0]);assert(record);
  assert.equal(asset.role,record.declaredSemantics.familyId);assert.equal(asset.label.split(' — ')[0],record.producerRoleFR.split(' — ')[0]);
 }
 assert.equal(groups.size,18);
 for(const entries of groups.values()){
  assert.equal(entries.length,4);
  assert.deepEqual(entries.map(asset=>asset.identityId.split('--')[1]),['gardes-04','enforcers-comics-14','enforcers-comics-15','enforcers-comics-16']);
 }
 assert.equal(data.assets.filter(asset=>asset.groupId!=='human-accepted').length,68);
 assert.equal(groups.get('human-accepted').length,4);
 assert.equal(data.assets.filter(asset=>asset.lifeStage==='adult-veteran').length,6);
 for(const human of groups.get('human-accepted')){
  assert.equal(human.masked,human.declaredSemantics.faceState==='masked'?'true':'false');
  assert(human.sourceNote);assert(human.sourceLimits.length>0);
 }
 const watchers=JSON.parse(fs.readFileSync('app/game/data/homeworldRegionalWatchArtV86.json','utf8'));
 assert.equal(data.assets.filter(asset=>watchers.bindings.some(binding=>binding.clanId===asset.groupId&&binding.allowedSourceRoles.includes(asset.role)&&binding.morphId===asset.morphotypeId)).length,0);
});

test('72 independent composition observations distinguish absent mount metadata from visible single bodies',()=>{
 const observations=proof.independentCompositionReview.records;
 assert.equal(observations.length,72);assert.equal(new Set(observations.map(record=>record.id)).size,72);
 assert(validHash.test(proof.independentCompositionReview.sourceEvidenceSha256));
 assert.equal(observations.filter(record=>record.sourceDeclaredMounted===null).length,24);
 assert.equal(observations.filter(record=>record.sourceDeclaredMounted===false).length,48);
 assert.equal(data.assets.filter(asset=>asset.alphaFacts.marginsLTRB.some(margin=>margin<80)).length,71);
 for(const asset of data.assets){
  const row=observations.find(record=>record.id===asset.identityId);assert(row);
  const record=metadata.get(asset.sourceMetadataRefs[0]);
  assert.equal(row.nativeSha256,asset.sha256);assert.equal(row.metadataSha256,record.manifestSha256);
  assert.equal(row.briefSha256,record.briefSha256);assert.equal(row.sourceDeclaredLifeStage,asset.lifeStage);
  assert.equal(row.sourceDeclaredMounted,asset.mountedSource);
  assert.equal(String(row.sourceDeclaredMasked),asset.masked);
  assert.equal(row.actualPngFrameCount,1);assert.equal(row.actualPngAnimated,false);
  if(asset.alphaFacts.marginsLTRB.some(margin=>margin<80))assert(asset.sourceLimits.some(limit=>limit.includes('80 px')&&limit.includes('sans découpe')));
 }
});

test('the corrected Saar-Keth final retains the old hash as unavailable evidence, never a phantom sprite',()=>{
 assert.equal(data.sourceCorrections.length,1);
 const correction=data.sourceCorrections[0];
 assert.equal(correction.identityId,'saar-keth--enforcers-comics-14');
 assert.equal(correction.previousSha256,'f74e6cc46c27c1924b632dc1fb331451a1fb26ace413d7f329cbf532e04fbdd6');
 assert.equal(correction.acceptedSha256,'3a80100b77ddce2df7aa00df8ae8b594f43536e6a7ec474851cdb5568e118ea0');
 assert.equal(correction.previousPixelsIncludedInTheseArchives,false);
 assert.equal(correction.previousSourceAvailable,false);assert.equal(correction.previousNativePublicSrc,null);
 const current=data.assets.find(asset=>asset.identityId===correction.identityId);assert.equal(current.sha256,correction.acceptedSha256);
 assert(current.sourceLimits.some(limit=>limit.includes('ne sont pas disponibles')&&limit.includes('ni importés')));
 assert(!data.assets.some(asset=>asset.sha256===correction.previousSha256));
 assert.equal(proof.previousSourceRevisionsPreserved.length,1);
 assert.equal(proof.previousSourceRevisionsPreserved[0].sha256,'b11c18900aac7ede22ff17e0972fc4eb0c3573709305b79f69ab45a4fa2a3530');
 assert.equal(proof.previousSourceRevisionsPreserved[0].bytes,6980232);
 assert.equal(proof.previousIndexPixelsOrBytesAvailable,false);
});

test('source manifests, native history and briefs remain distinct immutable evidence without private transport data',()=>{
 assert.equal(metadata.size,72);assert.equal(proof.nativeProof.length,72);
 assert.equal(proof.metadataRecords.filter(record=>record.generationHistory.length>1).length,49);
 for(const source of sources.values()){
  assert(validHash.test(source.sha256));assert.equal(source.transport,'authenticated-file-uri');
  assert.equal(source.url,'https://drive.google.com/file/d/'+source.id+'/view');
 }
 for(const asset of data.assets){
  assert(asset.sourceLimits.length>0);assert(asset.sourceLimits.length<=24);
  assert.equal(new Set(asset.sourceLimits).size,asset.sourceLimits.length);
  const native=proof.nativeProof.find(record=>record.id===asset.id);assert(native);
  assert.equal(native.sourceArchiveSha256,sources.get(native.fileId).sha256);
  assert.equal(native.sha256,asset.sha256);assert.equal(native.publicSrc,asset.src);
  assert.equal(native.alreadyPresentExactNativeBytes,false);
  const record=metadata.get(asset.sourceMetadataRefs[0]);
  assert(validHash.test(record.manifestSha256));assert(validHash.test(record.sourceRecordSha256));
  assert(validHash.test(record.briefSha256));assert(validHash.test(record.nativeManifestSha256));
  assert.equal(record.designCatalogSha256,proof.sourceReaders.find(reader=>reader.designCatalogSha256).designCatalogSha256);
  assert.equal(record.sourceArchiveSha256,sources.get(record.sourceFileId).sha256);
  assert.equal(record.nativeAcceptanceOverridesHistoricalPreparedStatus,true);
  assert.equal(record.trust,'source-author-assertion-not-independent-canon-certification');
  assert(record.generationHistory.length>0);
 }
 for(const asset of data.assets.filter(asset=>asset.groupId==='bionic'&&asset.role==='enforcers-comics')){
  assert(asset.sourceLimits.some(limit=>limit.includes('origine PHG')));
 }
 const serialized=JSON.stringify([data,proof]);
 assert(!/download_url|downloadUrl|file_uri|authfile:|[?&](?:token|signature|sig|x-goog-signature)=|C:\\\\|work-local\/v87\/downloads|\/workspace\//i.test(serialized));
});

test('the mounted runtime library and codex expose all three new native packs without flattening source identities',async()=>{
 const {homeworldSceneSsrV78}=await import('./helpers/homeworld-scene-ssr-v78.mjs');
 const qa=homeworldSceneSsrV78(),library=qa.load('app/game/systems/recentSpriteLibraryV85.ts');
 const codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeRecoveredFilesV87,299);
 for(const pack of data.packs)assert.equal(library.RECENT_SPRITE_LIBRARY_V85.packs.find(item=>item.id===pack.id)?.pngEntriesImported,24);
 for(const original of data.assets){
  const mounted=library.recentSpriteByIdV85(original.id);assert(mounted);
  for(const key of ['identityId','groupId','role','lifeStage','morphotypeId','masked','src','sha256','bodyComposition'])assert.equal(mounted[key],original[key]);
  const record=codex.RECENT_SPRITE_CODEX_V85.find(item=>item.source.id===original.id);assert(record);
  assert(original.sourceLimits.every(limit=>record.constraints.includes(limit)));
 }
});

test('individual Yautja source selection never borrows the four human bodies or changes a documented identity',async()=>{
 const {homeworldSceneSsrV78}=await import('./helpers/homeworld-scene-ssr-v78.mjs');
 const library=homeworldSceneSsrV78().load('app/game/systems/recentSpriteLibraryV85.ts');
 for(const asset of data.assets){
  const result=library.findImportedYautjaArtV85({assetId:asset.id});
  if(asset.groupId==='human-accepted')assert.equal(result,null);
  else{assert.equal(result?.assetId,asset.id);assert.equal(result?.spriteUrl,asset.src);assert.equal(result?.motionStatus,'single-pose-static');}
  assert.equal(library.findImportedYautjaArtV85({assetId:asset.id,clanName:'Unrelated clan'}),null);
 }
});
