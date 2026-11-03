import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const data=JSON.parse(fs.readFileSync('app/game/data/driveArchiveAuditSpritesV87.json','utf8'));
const proof=JSON.parse(fs.readFileSync('docs/drive-archive-audit-v87-sources.json','utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const hash=/^[a-f0-9]{64}$/;

test('authenticated archive audit imports only its 121 deduplicated native images',()=>{
 assert.equal(data.assets.length,121);assert.equal(new Set(data.assets.map(a=>a.sha256)).size,121);
 assert.equal(new Set(data.assets.map(a=>a.id)).size,121);
 assert.deepEqual(data.packs.map(p=>p.pngEntriesImported),[76,45]);
 assert.equal(data.summary.newDistinctPngBytes,495001123);
 assert.equal(data.summary.sourceArchiveFilesTransferred,58);
 assert.equal(data.summary.individualPngFilesVerified,42);
 assert.equal(data.summary.pngSourceEntriesCompared,1913);
 assert.equal(data.summary.uniquePngSourceHashesCompared,461);
 assert.equal(proof.sourceReceipts.length,100);
 assert.equal(proof.sourceReceipts.reduce((sum,r)=>sum+r.bytes,0),3813067244);
 assert(proof.sourceReaders.every(r=>r.ok));assert(proof.sourceMetadataReaders.every(r=>r.ok));
 assert.equal(proof.pixelsModified,false);assert.equal(proof.archiveCodeExecuted,false);
});

test('every public native PNG keeps its exact source length, SHA and header dimensions',()=>{
 let bytes=0;
 for(const asset of data.assets){
  assert.equal(asset.src,'/game/imports/v87/archive-audit/'+asset.sha256+'.png');
  const content=fs.readFileSync(path.join('public',asset.src.slice(1)));
  assert.equal(content.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(content.length,asset.bytes);assert.equal(sha(content),asset.sha256,asset.sourcePath);
  assert.deepEqual([content.readUInt32BE(16),content.readUInt32BE(20)],[asset.width,asset.height]);
  const native=proof.nativeProof.find(row=>row.id===asset.id);assert(native);
  assert.deepEqual([native.sha256,native.bytes,native.width,native.height,native.publicSrc],[asset.sha256,asset.bytes,asset.width,asset.height,asset.src]);
  bytes+=content.length;
 }
 assert.equal(bytes,495001123);
});

test('materials and references cannot become NPC bodies, animation sheets or certified canon',()=>{
 assert.equal(data.assets.filter(a=>a.kind==='texture').length,76);
 assert.equal(data.assets.filter(a=>a.kind==='reference').length,45);
 assert.deepEqual(proof.claims,{newNpcBodies:false,newAnimationSheets:false,canon1to1:false,originalGameUvTextures:false,completeOfficialShaderCatalogue:false});
 for(const asset of data.assets){
  assert(['texture','reference'].includes(asset.kind));assert.equal(asset.bodyComposition,'reference-image');
  assert.equal(asset.fullBody,false);assert.equal(asset.animationAvailable,false);
  assert.equal(asset.motionStatus,'single-pose-static');assert.equal(asset.canonicalFidelity,'not-certified-1-to-1');
  assert.equal(asset.strict1to1Verified,false);assert.equal(asset.lifeStage,'');assert.equal(asset.morphotypeId,'');
  assert(asset.sourceLimits.length<=24);assert.equal(new Set(asset.sourceLimits).size,asset.sourceLimits.length);
  if(asset.kind==='texture'){
   assert.equal(asset.nativeNature,'texture-source-reconstruction');
   assert.equal(asset.declaredSemantics.strict_1to1_verified,false);
   assert.equal(asset.identityId,asset.declaredSemantics.id);assert.equal(asset.label,asset.declaredSemantics.name);
   assert.equal(asset.producerStatus,asset.declaredSemantics.status);
   if(asset.declaredSemantics.description)assert.equal(asset.sourceNote,asset.declaredSemantics.description);
   else{assert.equal(asset.declaredSemantics.description,'');assert(asset.sourceNote.includes(asset.declaredSemantics.reference_name));assert(asset.sourceNote.includes('Matière 2D reconstruite'));}
   assert(asset.declaredSemantics.reference_name);assert(asset.sourceLimits.length>0);
  }else assert(asset.nativeNature.startsWith('reference-'));
 }
 assert.equal(data.summary.newNpcBodies,0);assert.equal(data.summary.newAnimationSheets,0);assert.equal(data.summary.certifiedCanon1to1,0);
});

test('the PHG Gator/Viking menu screenshot is a reference, never a material or fighter',()=>{
 const screenshot=data.assets.find(a=>a.sha256==='5c3ef4ab395cbad8960fdf8a9b92f0700ebe5ea0ce36df31bf5a60a27c91b080');
 assert(screenshot);assert.equal(screenshot.kind,'reference');assert.equal(screenshot.nativeNature,'reference-game-menu');
 assert.equal(screenshot.bodyComposition,'reference-image');assert.equal(screenshot.fullBody,false);
 assert.deepEqual([screenshot.width,screenshot.height],[683,721]);
 assert(screenshot.sourcePath.endsWith('/references/5c3ef4ab395c_skin_gator_viking_menu.png'));
 assert(!data.assets.some(a=>a.kind==='texture'&&a.sha256===screenshot.sha256));
 assert(screenshot.sourceLimits.some(text=>/corps de Viking.*anomalie.*exclu/.test(text)));
 assert(screenshot.sourceLimits.some(text=>/Waves.*peinture.*uniquement la peau Gator/.test(text)));
 assert(screenshot.sourceLimits.some(text=>/anglaise.*menu espagnol/.test(text)));
 assert(screenshot.sourceReferenceClaims.some(claim=>claim.primary_texture===false));
 assert(screenshot.sourceNote.includes('Corps buggé à ignorer'));
});

test('every archive/member and companion manifest retains exact immutable provenance',()=>{
 const sources=new Map(proof.sourceReceipts.map(r=>[r.id,r]));
 const records=new Map(proof.manifestRecords.map(r=>[r.id,r]));
 assert.equal(records.size,proof.manifestRecords.length);
 for(const asset of data.assets){
  const native=proof.nativeProof.find(r=>r.id===asset.id);assert(native.provenance.length>0);
  for(const origin of native.provenance){
   assert.equal(origin.sourceArchiveSha256,sources.get(origin.fileId).sha256);
   assert.equal(origin.sourceDriveUrl,'https://drive.google.com/file/d/'+origin.fileId+'/view');
   assert(!origin.sourceMember.split('/').includes('..'));assert(!path.posix.isAbsolute(origin.sourceMember));
   for(const id of origin.sourceVolumeIds)assert(sources.has(id));
   for(const id of origin.manifestRecordRefs){
    const record=records.get(id);assert(record);assert(hash.test(record.manifestSha256));assert(hash.test(record.sourceRecordSha256));
    assert.equal(record.manifestArchiveSha256,sources.get(record.manifestFileId).sha256);
    assert.equal(record.trust,'source-author-assertion-not-independent-canon-certification');
    assert(record.declaredFile.toLowerCase().endsWith('.png'));assert(record.recordPath.startsWith('$'));
   }
  }
  for(const id of asset.sourceMetadataRefs)assert(records.has(id));
 }
 for(const source of proof.sourceReceipts){assert(hash.test(source.sha256));assert.equal(source.transport,'authenticated-file-uri');}
});

test('42 individually fetched sprites match existing native files without duplicate imports or private URL leaks',()=>{
 assert.equal(proof.individualPngProof.length,42);
 for(const row of proof.individualPngProof){assert.equal(row.matchesPreviouslyVerifiedNativeSha256,true);assert.equal(row.sha256,row.expectedLocalSha256);assert(!data.assets.some(a=>a.sha256===row.sha256));}
 const serialized=JSON.stringify([data,proof]);
 assert(!/download_url|downloadUrl|file_uri|authfile:|[?&](?:token|signature|sig|x-goog-signature)=|C:\\\\|work-local\/v87\/downloads/i.test(serialized));
 assert.equal(data.summary.individualPngAlreadyPresentExactSha,42);
});
