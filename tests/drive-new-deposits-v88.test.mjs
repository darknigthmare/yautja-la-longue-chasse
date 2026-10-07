import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const data=JSON.parse(fs.readFileSync('app/game/data/driveNewDepositsSpritesV88.json','utf8'));
const proof=JSON.parse(fs.readFileSync('docs/drive-new-deposits-v88-sources.json','utf8'));
const sha=content=>createHash('sha256').update(content).digest('hex');
const validHash=/^[a-f0-9]{64}$/;
const sources=new Map(proof.sourceReceipts.map(source=>[source.id,source]));
const metadata=new Map(proof.sourceMetadataDocuments.map(record=>[record.sha256,record]));
const expected=new Map([
 ['715f09cf27635020853a3fb566db317694c00e62266a6181b338814d9afd3203',{width:2200,height:4011,bytes:2498642,version:'V2'}],
 ['3da241e79a7fade6b9d04f2fc4ab0da6a6682b0a33025eb763ce765df4b9e690',{width:2400,height:7026,bytes:4901394,version:'V4'}],
]);

test('two historical contact sheets are imported without counting cumulative sprites as new bodies',()=>{
 assert.equal(data.version,'V88');assert.equal(data.assets.length,2);
 assert.equal(new Set(data.assets.map(asset=>asset.id)).size,2);
 assert.equal(new Set(data.assets.map(asset=>asset.identityId)).size,2);
 assert.deepEqual(new Set(data.assets.map(asset=>asset.sha256)),new Set(expected.keys()));
 assert.deepEqual(data.packs.map(pack=>pack.pngEntriesImported),[1,1]);
 assert.equal(data.summary.newDistinctPngBytes,7400036);assert.equal(data.summary.newDistinctPngFiles,2);
 assert.equal(data.summary.newNpcBodies,0);assert.equal(data.summary.newAnimationSheets,0);assert.equal(data.summary.certifiedCanon1to1,0);
 assert.equal(data.summary.historicalReferencePngFiles,2);
 assert.deepEqual(proof.summary,data.summary);
 assert.equal(proof.pixelsModified,false);assert.equal(proof.archiveCodeExecuted,false);
 assert.deepEqual(proof.claims,{newNpcBodies:false,newAnimationSheets:false,canon1to1:false,allDriveArchiveBytesReverified:false,v84PixelsRecovered:false});
});

test('native contact sheets retain source byte hashes, opaque RGB dimensions and exactly one frame',()=>{
 let bytes=0;
 for(const asset of data.assets){
  const facts=expected.get(asset.sha256);assert(facts);
  assert.equal(asset.src,'/game/imports/v88/'+asset.sha256+'.png');
  const content=fs.readFileSync(path.join('public',asset.src.slice(1)));
  assert.equal(sha(content),asset.sha256);assert.equal(content.length,facts.bytes);
  assert.equal(content.length,asset.bytes);assert.equal(asset.version,facts.version);
  assert.equal(content.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.deepEqual([content.readUInt32BE(16),content.readUInt32BE(20)],[facts.width,facts.height]);
  assert.deepEqual([asset.width,asset.height],[facts.width,facts.height]);
  assert.equal(content[25],2); // PNG truecolour RGB, no alpha channel.
  let offset=8,last='';
  while(offset+12<=content.length){
   const length=content.readUInt32BE(offset);
   assert(offset+12+length<=content.length);
   const kind=content.subarray(offset+4,offset+8).toString('ascii');
   assert(!['acTL','fcTL','fdAT','tRNS'].includes(kind));last=kind;offset+=length+12;
  }
  assert.equal(last,'IEND');assert.equal(offset,content.length);
  assert.equal(asset.hasAlpha,false);assert.equal(asset.actualPngFrameCount,1);
  bytes+=content.length;
 }
 assert.equal(bytes,7400036);
});

test('all 94 individual sprite entries remain available as exact existing natives rather than duplicate V88 imports',()=>{
 assert.equal(proof.alreadyPresentExactNativeProof.length,94);
 assert.equal(new Set(proof.alreadyPresentExactNativeProof.map(row=>row.sha256)).size,61);
 const checked=new Map();
 for(const row of proof.alreadyPresentExactNativeProof){
  assert.equal(row.nativeMissingFromCurrentRegistries,false);assert.equal(row.spriteMember,true);
  assert.equal(row.sourceArchiveSha256,sources.get(row.fileId)?.sha256);
  assert(row.existingNativeRuntimeSrc.startsWith('/game/'));
  assert(!row.existingNativeRuntimeSrc.startsWith('/game/imports/v88/'));
  assert(!row.existingNativeRuntimeSrc.split('/').includes('..'));
  let content=checked.get(row.existingNativeRuntimeSrc);
  if(!content){content=fs.readFileSync(path.join('public',row.existingNativeRuntimeSrc.slice(1)));checked.set(row.existingNativeRuntimeSrc,content);}
  assert.equal(sha(content),row.sha256,row.sourceMember);assert.equal(content.length,row.bytes);
  assert.deepEqual([content.readUInt32BE(16),content.readUInt32BE(20)],[row.width,row.height]);
  assert(!expected.has(row.sha256));
 }
 assert.equal(data.summary.sourcePngEntriesCompared,96);assert.equal(data.summary.sourceUniquePngHashesCompared,63);
 assert.equal(data.summary.existingSpritePngSourceEntries,94);assert.equal(data.summary.existingSpriteUniquePngHashes,61);
});

test('reference roles, full-sheet limits and historical correction labels never become body or animation claims',()=>{
 for(const asset of data.assets){
  assert.equal(asset.kind,'reference');assert.equal(asset.nativeNature,'reference-contactsheet');
  assert.equal(asset.bodyComposition,'reference-image');assert.equal(asset.fullBody,false);assert.equal(asset.animationAvailable,false);
  assert.equal(asset.role,'historical-contactsheet');assert.equal(asset.groupId,'badlands-documentation');
  assert.equal(asset.motionStatus,'single-pose-static');assert.equal(asset.canonicalFidelity,'not-certified-1-to-1');assert.equal(asset.strict1to1Verified,false);
  assert.equal(asset.lifeStage,'');assert.equal(asset.morphotypeId,'');assert.equal(asset.masked,'');assert.equal(asset.regionId,'');
  assert.equal(asset.supersedesIdentityId,'');assert.equal(asset.supersededByIdentityId,'');
  assert(asset.sourceLimits.some(limit=>limit.includes('fond opaque')));
  assert(asset.sourceLimits.some(limit=>limit.includes('1:1')&&limit.includes('certifiée')));
  assert(asset.sourceLimits.some(limit=>limit.includes('aucun nouveau personnage')));
  assert.equal(new Set(asset.sourceLimits).size,asset.sourceLimits.length);
  assert(asset.visualInspection.includes('grille'));assert(asset.sourceNote.includes('sans découpe'));
 }
 assert.deepEqual(data.sourceCorrectionNotes,[]);
 assert(data.assets.find(asset=>asset.version==='V4').sourceLimits.some(limit=>limit.includes('61 → 46')&&limit.includes('aucune identité')));
});

test('authenticated archive and manifest evidence remain linked without exposing signed transport URLs',()=>{
 assert.equal(sources.size,2);assert.equal(metadata.size,15);
 assert.equal(proof.sourceReceipts.reduce((sum,source)=>sum+source.bytes,0),173581412);
 assert.equal(sources.get('1jm0X8VNx1e_gKwMQbc14Sf6BO3XP-Js1').sha256,'e00a0194aa1803806119f53cf34615fe9892c4daa523f16505b25fdd2d89e6a9');
 assert.equal(sources.get('1gUgzXhkKTsdmjpT3MgKBEfgttkIu5GAo').sha256,'c4782b7902b035b5283b98223cf073be4ca2444d70069283f41e1c86acb7ec9b');
 for(const source of sources.values()){
  assert.equal(source.transport,'authenticated-file-uri');assert.equal(source.mimeType,'application/x-rar');
  assert.equal(source.url,'https://drive.google.com/file/d/'+source.id+'/view');assert(validHash.test(source.sha256));
 }
 for(const record of metadata.values()){
  assert.equal(record.sourceArchiveSha256,sources.get(record.fileId)?.sha256);
  assert(validHash.test(record.sha256));assert(record.bytes>0);assert(!record.member.split('/').includes('..'));
 }
 for(const asset of data.assets){
  const native=proof.nativeProof.find(record=>record.id===asset.id);assert(native);
  assert.equal(native.sha256,asset.sha256);assert.equal(native.publicSrc,asset.src);
  assert.equal(native.sourceArchiveSha256,sources.get(asset.sourceDriveId)?.sha256);
  assert.equal(native.sourceMember,asset.sourcePath);
  assert.equal(asset.sourceArchiveSha256,native.sourceArchiveSha256);
  assert(asset.sourceMetadataRefs.length>0);
  for(const hash of asset.sourceMetadataRefs){
   const record=metadata.get(hash);assert(record);assert.equal(record.fileId,asset.sourceDriveId);
   assert.equal(record.sourceArchiveSha256,asset.sourceArchiveSha256);
  }
 }
 const serialized=JSON.stringify([data,proof]);
 assert(!/download_url|downloadUrl|file_uri|authfile:|[?&](?:token|signature|sig|x-goog-signature)=|C:\\\\|work-local\/v88\/downloads|\/workspace\//i.test(serialized));
});

test('fresh Drive metadata and explicit unrecovered V84 pixels preserve the boundaries of the audit',()=>{
 const inventory=proof.freshDriveInventory;
 assert.equal(inventory.folderCount,15);assert.equal(inventory.uniqueIds,239);
 assert.equal(inventory.baselineCompletedAt,'2026-10-07T16:25:01.717Z');
 assert.equal(inventory.observedCompletedAt,'2026-10-07T21:31:19.563Z');
 assert.deepEqual(inventory.newItems,[]);assert.deepEqual(inventory.modifiedItems,[]);assert.deepEqual(inventory.excelChanges,[]);
 assert.deepEqual(inventory.folderSearchTerms,['Yautja','Predator','Longue Chasse']);assert.equal(inventory.newFoldersDiscovered,0);
 assert.equal(proof.allRegistryNativeReconciliation.nativeErrors,0);
 assert.equal(proof.allRegistryNativeReconciliation.nativePublicPathsVerified,2575);
 assert.equal(proof.allRegistryNativeReconciliation.knownMetadataOnlyMissingPaths,640);
 assert.equal(data.summary.otherOlderArchiveDriveByteIdentityNotRenewedCount,28);
 assert.equal(data.summary.v84DeclaredMissingPngs,640);
 assert(proof.limits.some(limit=>limit.includes('640 V84')&&limit.includes('metadata-only')));
 assert(proof.limits.some(limit=>limit.includes('28')&&limit.includes('not retransferred')));
});

test('the connected runtime library and codex expose complete references and all source limitations',async()=>{
 const {homeworldSceneSsrV78}=await import('./helpers/homeworld-scene-ssr-v78.mjs');
 const qa=homeworldSceneSsrV78(),library=qa.load('app/game/systems/recentSpriteLibraryV85.ts');
 const codex=qa.load('app/game/systems/recentSpriteCodexV85.ts');
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.nativeRecoveredFilesV88,2);
 assert.equal(library.RECENT_SPRITE_LIBRARY_V85.uniqueReferencedHashes,1871);
 for(const pack of data.packs)assert.equal(library.RECENT_SPRITE_LIBRARY_V85.packs.find(item=>item.id===pack.id)?.pngEntriesImported,1);
 for(const original of data.assets){
  const mounted=library.recentSpriteByIdV85(original.id);assert(mounted);
  for(const key of ['identityId','kind','role','src','sha256','bodyComposition','fullBody','animationAvailable','nativeNature'])assert.equal(mounted[key],original[key]);
  const record=codex.RECENT_SPRITE_CODEX_V85.find(item=>item.source.id===original.id);assert(record);
  assert(original.sourceLimits.every(limit=>record.constraints.includes(limit)));
  assert(record.constraints.some(limit=>limit.includes('aucun corps de PNJ')));
 }
});

test('reference sheets cannot be selected by Yautja body consumers, including explicit and historical requests',async()=>{
 const {homeworldSceneSsrV78}=await import('./helpers/homeworld-scene-ssr-v78.mjs');
 const library=homeworldSceneSsrV78().load('app/game/systems/recentSpriteLibraryV85.ts');
 for(const asset of data.assets){
  for(const query of [{assetId:asset.id},{identityId:asset.identityId},{assetId:asset.id,includeHistorical:true},{identityId:asset.identityId,includeHistorical:true}]){
   assert.equal(library.findImportedYautjaArtV85(query),null);
   assert.deepEqual(library.importedYautjaArtVariantsV85(query),[]);
  }
 }
});
