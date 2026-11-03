import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const MAIN_COMMIT_V107='92e7c824fd80d6b8152855b3d66560448f8c48c0';
export const RECONCILIATION_V107='docs/suivi-production/v107-enforcer-poses/data/main-reconciliation.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const read=file=>fs.readFile(path.join(ROOT,file));
const json=async file=>JSON.parse(await read(file));

async function knownFiles(){
 const assets=[],registries=[],inputs=[];
 for(const version of ['v611','v612','v613']){
  const manifestPath=`docs/suivi-production/${version}/data/production-manifest.json`,bytes=await read(manifestPath),manifest=JSON.parse(bytes);
  assert.equal(manifest.assets.length,36,'Thirty-six real historical PNGs per lot required');
  inputs.push({path:manifestPath,sha256:sha(bytes),bytes:bytes.length});
  for(const asset of manifest.assets){
   const native=await read(asset.repoPngPath);assert.equal(native.length,asset.bytes);assert.equal(sha(native),asset.sha256,'Historical native PNG changed: '+asset.id);
   assets.push({id:asset.id,version:manifest.version,repoPath:asset.repoPngPath,sha256:asset.sha256,bytes:native.length,gitBlobSha:blob(native),existsInMain:true});
  }
  const repoPath=`app/game/data/enforcerProduction${version.toUpperCase()}.json`,native=await read(repoPath),registry=JSON.parse(native);
  assert.equal(registry.assets.length,36);
  for(const asset of registry.assets)assert.ok(assets.some(item=>item.id===asset.identityId&&item.sha256===asset.sha256&&item.repoPath===asset.sourcePath),'Registered identity/hash differs from original production');
  registries.push({repoPath,sha256:sha(native),bytes:native.length,gitBlobSha:blob(native),existsInMain:true});
 }
 assert.equal(new Set(assets.map(asset=>asset.id)).size,108);
 return {assets,registries,inputs};
}

/** Author-only: read immutable local Git objects; never modifies or contacts Git. */
export async function captureEnforcerMainV107(){
 const known=await knownFiles();
 const paths=[...known.assets,...known.registries].map(item=>item.repoPath);
 const tree=execFileSync('git',['rev-parse',MAIN_COMMIT_V107+'^{tree}'],{cwd:ROOT,encoding:'utf8'}).trim();
 const listing=execFileSync('git',['ls-tree','-r',MAIN_COMMIT_V107,'--',...paths],{cwd:ROOT,encoding:'utf8',maxBuffer:1000000});
 const entries=new Map(listing.trim().split('\n').map(line=>{const [meta,file]=line.split('\t');return [file,meta.split(' ')[2]];}));
 assert.equal(entries.size,111,'All108 PNGs and three runtime registries must exist in the fixed main tree');
 for(const item of [...known.assets,...known.registries])assert.equal(entries.get(item.repoPath),item.gitBlobSha,'Native bytes are not those in the fixed main commit: '+item.repoPath);
 return {schemaVersion:'yautja-main-reconciliation-v107-1',asOf:'2026-10-23',currentMainCommit:MAIN_COMMIT_V107,currentMainTree:tree,scope:'Read-only proof of existing V6.11/V6.12/V6.13 blobs and registry identities at the merged base. No merge, animation, portrait or physical placement is performed.',mergePerformedByThisDelivery:false,mainNativeAssetCount:108,mainV611AssetCount:36,mainV612AssetCount:36,mainV613AssetCount:36,assets:known.assets,runtimeRegistriesInMain:known.registries,inputs:known.inputs};
}

/** CI/reader: verify pinned files against the authored proof without requiring Git. */
export async function verifyEnforcerMainV107(proof=undefined){
 proof??=await json(RECONCILIATION_V107);
 assert.equal(proof.schemaVersion,'yautja-main-reconciliation-v107-1');assert.equal(proof.currentMainCommit,MAIN_COMMIT_V107);assert.match(proof.currentMainTree,/^[a-f0-9]{40}$/);
 assert.equal(proof.mergePerformedByThisDelivery,false);assert.equal(proof.mainNativeAssetCount,108);
 for(const version of ['611','612','613'])assert.equal(proof['mainV'+version+'AssetCount'],36);
 const known=await knownFiles();assert.deepEqual(proof.assets,known.assets,'Reconciliation must cover the exact108 produced identities');assert.deepEqual(proof.runtimeRegistriesInMain,known.registries);assert.deepEqual(proof.inputs,known.inputs);
 return proof;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);assert.ok(args.length===1&&['--capture','--check'].includes(args[0]),'Usage: node scripts/reconcile-enforcer-baseline-v107.mjs --capture|--check');
 if(args[0]==='--capture'){
  const proof=await captureEnforcerMainV107();await fs.mkdir(path.dirname(path.join(ROOT,RECONCILIATION_V107)),{recursive:true});await fs.writeFile(path.join(ROOT,RECONCILIATION_V107),JSON.stringify(proof,null,2)+'\n');
 }
 const proof=await verifyEnforcerMainV107();console.log(JSON.stringify({result:'PASS_EXISTING_MAIN_FILES',main:proof.currentMainCommit,assets:proof.assets.length,registries:proof.runtimeRegistriesInMain.length,gitRequiredForVerification:false}));
}
