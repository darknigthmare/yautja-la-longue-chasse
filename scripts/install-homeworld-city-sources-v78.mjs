import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

/** Source-only asset staging. Never deletes, edits, recompresses or overwrites
 * different bytes. --check is read-only. --install needs normal filesystem
 * authorization for this checkout's public junction. Copying is not placement
 * or browser validation, and does not promote the production deployment. */
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length>1||args.some(arg=>!['--check','--install'].includes(arg)))throw Error('Usage: node scripts/install-homeworld-city-sources-v78.mjs [--check|--install]');
const install=args[0]==='--install';
const manifest=JSON.parse(await fs.readFile(path.join(root,'app/game/data/homeworldCityGeneratedProvenanceV78.json'),'utf8'));
if(manifest.selectedCount!==13||manifest.modules.length!==13||manifest.preservedSupersededCount!==2||typeof manifest.runtimeIntegration!=='boolean')throw Error('Unexpected V78 source corpus; review the manifest before staging');
const sourceRoot=await fs.realpath(manifest.sourceCollection.directory);
const publicRoot=await fs.realpath(path.join(root,'public'));
const targetRoot=path.join(publicRoot,'game','homeworld','v78');
const within=(candidate,base)=>{const relative=path.relative(base,candidate);return relative.length>0&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
if(!within(targetRoot,publicRoot))throw Error('Target directory escaped the project public root');
const staged=[];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const item of manifest.modules){
 if(!/^[a-z0-9-]+$/.test(item.id)||!/^exec-[a-f0-9-]+\.png$/.test(item.file)||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('Invalid source identity: '+item.id);
 const source=await fs.realpath(path.join(sourceRoot,item.file)),target=path.join(targetRoot,item.id+'.png');
 if(!within(source,sourceRoot)||!within(target,targetRoot))throw Error('Source or target escaped the reviewed corpus');
 const bytes=await fs.readFile(source);
 if(bytes.length!==item.bytes||hash(bytes)!==item.sha256)throw Error('Reviewed original changed: '+item.id);
 let targetStatus='NOT_COPIED';
 try{const existing=await fs.readFile(target);if(hash(existing)!==item.sha256||existing.length!==item.bytes)throw Error('Refusing to overwrite different bytes: '+target);targetStatus='ALREADY_BYTE_IDENTICAL';}
 catch(error){if(error.code!=='ENOENT')throw error;}
 staged.push({id:item.id,source,target,sha256:item.sha256,bytes:bytes.length,targetStatus});
}
// All originals and any existing destinations are checked before mutation.
if(install){
 await fs.mkdir(targetRoot,{recursive:true});
 for(const item of staged){
  if(item.targetStatus!=='ALREADY_BYTE_IDENTICAL'){
   await fs.copyFile(item.source,item.target,fs.constants.COPYFILE_EXCL);
   item.targetStatus='COPIED_BYTE_IDENTICAL';
  }
  if(hash(await fs.readFile(item.target))!==item.sha256)throw Error('Staged source failed byte verification: '+item.id);
 }
}
process.stdout.write(JSON.stringify({status:install?'COPIED_PENDING_NATIVE_PLACEMENT_AND_BROWSER_QA':'PASS_SOURCE_PROVENANCE_ONLY',mode:install?'install':'read-only',count:staged.length,
 targetDirectory:targetRoot,generatedOriginalsPreserved:true,runtimeConsumerIntegrated:manifest.runtimeIntegration,runtimeConsumerDeclarationOnly:true,productionPromoted:false,
 modules:staged.map(({id,sha256,bytes,targetStatus})=>({id,sha256,bytes,targetStatus})),
},null,2)+'\n');
