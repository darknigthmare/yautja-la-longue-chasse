import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const data=JSON.parse(fs.readFileSync('app/game/data/driveNewDepositsSpritesV89.json','utf8'));
const proof=JSON.parse(fs.readFileSync('docs/drive-new-deposits-v89-sources.json','utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const sources=new Map(proof.sourceReceipts.map(row=>[row.id,row]));
const hash=/^[a-f0-9]{64}$/;

test('the ledger reports fully read authenticated archives, not partial transfers or all Drive coverage',()=>{
 assert.equal(data.version,'V89');assert.equal(proof.version,'V89');
 assert.equal(sources.size,proof.sourceReceipts.length);
 assert(proof.sourceReaders.every(row=>row.ok));
 assert.equal(data.summary.authenticatedSourceArchives,sources.size);
 assert.equal(data.summary.sourceBytesTransferred,proof.sourceReceipts.reduce((sum,row)=>sum+row.bytes,0));
 assert.equal(proof.archiveCodeExecuted,false);assert.equal(proof.pixelsModified,false);
 assert.equal(proof.claims.allDriveNativeSourcesComplete,false);
 for(const source of sources.values()){
  assert(hash.test(source.sha256));assert(source.bytes>0);
  assert.equal(source.transport,'authenticated-file-uri');
  assert.equal(source.url,'https://drive.google.com/file/d/'+source.id+'/view');
 }
});

test('new native PNG counts and bytes are deduplicated independently from logical source entries',()=>{
 const unique=new Map(data.assets.map(row=>[row.sha256,row]));
 assert.equal(data.summary.nativeSourceRecords,data.assets.length);
 assert.equal(data.summary.newDistinctPngFiles,unique.size);
 assert.equal(data.summary.newDistinctPngBytes,[...unique.values()].reduce((sum,row)=>sum+row.bytes,0));
 assert.equal(new Set(data.assets.map(row=>row.id)).size,data.assets.length);
 for(const row of unique.values()){
  assert.equal(row.src,'/game/imports/v89/'+row.sha256+'.png');
  const native=fs.readFileSync(path.join('public',row.src.slice(1)));
  assert.equal(sha(native),row.sha256);assert.equal(native.length,row.bytes);
  assert.equal(native.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.deepEqual([native.readUInt32BE(16),native.readUInt32BE(20)],[row.width,row.height]);
  assert.equal(native[25],2); // All six reviewed previews are opaque RGB, not transparent bodies.
  let offset=8,last='';
  while(offset+12<=native.length){
   const length=native.readUInt32BE(offset);assert(offset+length+12<=native.length);
   const kind=native.subarray(offset+4,offset+8).toString('ascii');
   assert(!['acTL','fcTL','fdAT','tRNS'].includes(kind));last=kind;offset+=length+12;
  }
  assert.equal(last,'IEND');assert.equal(offset,native.length);
  assert.equal(row.actualPngFrameCount,1);assert.equal(row.actualAnimatedSource,false);
  assert.equal(row.animationAvailable,false);assert.equal(row.motionStatus,'single-pose-static');
 }
});

test('the actual V89 omissions are exactly six static Badlands contact sheets, not population or equipment bodies',()=>{
 assert.equal(data.assets.length,6);assert.equal(data.summary.newDistinctPngBytes,6168549);
 assert.deepEqual(data.assets.map(row=>row.version),['Lot 8','Lot 9','Lot 10','Lot 11','Lot 12','Lot 13']);
 assert.equal(data.summary.newGameplayPngFiles,0);assert.equal(data.summary.newReferencePngFiles,6);assert.equal(data.summary.newMaterialPngFiles,0);
 assert.equal(data.summary.authenticatedSourceArchives,26);assert.equal(data.summary.sourceBytesTransferred,1438819571);
 assert.equal(data.summary.pngSourceEntriesCompared,599);assert.equal(data.summary.pngUniqueShaCompared,589);
 assert.equal(data.summary.existingNativeUniqueShaVerified,583);assert.equal(proof.alreadyPresentExactNativeProof.length,593);
 assert.equal(data.summary.knownMetadataOnlyMissingPaths,640);
 for(const row of data.assets){
  assert.equal(row.kind,'reference');assert.equal(row.role,'historical-contactsheet');assert.equal(row.nativeNature,'reference-contactsheet');
  assert.equal(row.fullBody,false);assert.equal(row.bodyComposition,'reference-image');assert.equal(row.hasAlpha,false);
  assert.equal(row.supersedesIdentityId,'');assert.equal(row.supersededByIdentityId,'');
  assert.equal(row.lifeStage,'');assert.equal(row.regionId,'');assert.equal(row.morphotypeId,'');assert.equal(row.masked,'');
  assert(row.sourceLimits.some(limit=>limit.includes('aucune correspondance exacte 1:1 certifiée')));
  assert(row.sourceLimits.some(limit=>limit.includes('fond opaque')));
  assert(row.sourceLimits.some(limit=>limit.includes('sans échelle physique commune')));
  assert(row.sourceNote.includes('sans découpe'));assert(row.visualInspection.startsWith('Vue entière'));
 }
 assert.deepEqual(data.sourceCorrectionNotes,[]);
});

test('existing cumulative archive PNGs remain original runtime files rather than inflated new imports',()=>{
 const newHashes=new Set(data.assets.map(row=>row.sha256));const checked=new Map();
 for(const row of proof.alreadyPresentExactNativeProof){
  assert.equal(row.nativeMissingFromCurrentRegistries,false);
  assert.equal(row.sourceArchiveSha256,sources.get(row.fileId)?.sha256);
  assert(!newHashes.has(row.sha256));
  assert(row.existingNativeRuntimeSrc.startsWith('/game/'));
  assert(!row.existingNativeRuntimeSrc.split('/').includes('..'));
  if(!checked.has(row.sha256)){
   const native=fs.readFileSync(path.join('public',row.existingNativeRuntimeSrc.slice(1)));
   assert.equal(sha(native),row.sha256);assert.equal(native.length,row.bytes);
   assert.deepEqual([native.readUInt32BE(16),native.readUInt32BE(20)],[row.width,row.height]);
   checked.set(row.sha256,true);
  }
 }
 assert.equal(data.summary.existingNativeUniqueShaVerified,checked.size);
});

test('all reviewed source provenance remains linked while reference sheets cannot become bodies',()=>{
 const metadata=new Map(proof.sourceMetadataDocuments.map(row=>[row.sha256,row]));
 for(const row of data.assets){
  const native=proof.nativeProof.find(item=>item.id===row.id);assert(native);
  assert.equal(native.sha256,row.sha256);assert.equal(native.publicSrc,row.src);
  assert.equal(row.sourceArchiveSha256,sources.get(row.sourceDriveId)?.sha256);
  assert.equal(row.canonicalFidelity,'not-certified-1-to-1');assert.equal(row.strict1to1Verified,false);
  assert(row.sourceLimits.length>0);assert(row.sourceLimits.length<=24);
  assert(row.visualInspection.length>0);assert(row.sourceProvenance.length>0);
  if(row.kind==='reference'){assert.equal(row.bodyComposition,'reference-image');assert.equal(row.fullBody,false);}
  if(row.kind==='texture')assert.equal(row.fullBody,false);
  if(row.kind==='npc'){assert(row.declaredSemantics);assert(row.sourceMetadataRefs.length>0);}
  for(const ref of row.sourceMetadataRefs){
   const record=metadata.get(ref);assert(record);
   assert.equal(record.fileId,row.sourceDriveId);assert.equal(record.sourceArchiveSha256,row.sourceArchiveSha256);
  }
  for(const occurrence of row.sourceProvenance){
   assert.equal(occurrence.sha256,row.sha256);assert.equal(occurrence.bytes,row.bytes);
   assert.equal(occurrence.sourceArchiveSha256,sources.get(occurrence.fileId)?.sha256);
  }
 }
 assert.equal(data.summary.newAnimationSheets,0);assert.equal(data.summary.certifiedCanon1to1,0);
});

test('provider oversized sources remain explicitly blocked without counterfeit byte proof',()=>{
 assert.equal(proof.providerBlocked.length,2);
 for(const row of proof.providerBlocked){
  assert.equal(row.status,'provider-size-limit');assert.equal(row.providerLimitBytes,268435456);
  assert(row.bytes>row.providerLimitBytes);assert(!sources.has(row.id));
 }
 assert.equal(data.summary.providerBlockedSources,2);
 assert(proof.limits.some(limit=>limit.includes('640 V84')&&limit.includes('metadata-only')));
});

test('versioned ledgers contain no signed references, private source-root paths or credentials',()=>{
 const serialized=JSON.stringify([data,proof]);
 assert(!/authfile:|download_url|downloadUrl|file_uri|[?&](?:token|signature|sig|x-goog-signature)=|[A-Z]:\\\\|work-local\/v89\/(?:downloads|private-handles)|\/workspace\//i.test(serialized));
 for(const source of proof.sourceReceipts)assert(!Object.hasOwn(source,'path'));
});

test('all six full references are connected to the runtime viewer and codex without becoming gameplay bodies',async()=>{
 const {homeworldSceneSsrV78}=await import('./helpers/homeworld-scene-ssr-v78.mjs');
 const qa=homeworldSceneSsrV78(),library=qa.load('app/game/systems/recentSpriteLibraryV85.ts');
 const codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeReferenceFilesV89,6);
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.uniqueReferencedHashes,1877);
 for(const source of data.assets){
  assert.deepEqual(library.recentSpriteByIdV85(source.id),source);
  const record=codex.RECENT_SPRITE_CODEX_V85.find(row=>row.source.id===source.id);assert(record);
  assert(source.sourceLimits.every(limit=>record.constraints.includes(limit)));
  assert(library.RECENT_SPRITE_LIBRARY_V85.packs.some(pack=>pack.id===source.packId&&pack.pngEntriesImported===1));
  for(const query of [{assetId:source.id},{identityId:source.identityId,includeHistorical:true}]){
   assert.equal(library.findImportedYautjaArtV85(query),null);
   assert.deepEqual(library.importedYautjaArtVariantsV85(query),[]);
  }
 }
});
