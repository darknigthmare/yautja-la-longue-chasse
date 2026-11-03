/** A source-light delivery may reference native bitmaps only through a complete
 * Git commit/tree proof. The optional manifest belongs to that delivery, never
 * to the full source checkout. No network access or source mutation occurs here.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const NATIVE_ASSET_MANIFEST_V1='scripts/native-asset-origin-v1.json';
export const NATIVE_ASSET_REPOSITORY_V1='darknigthmare/yautja-la-longue-chasse';
export const NATIVE_ASSET_SCOPE_V1='public/game';
const MAX_MANIFEST_BYTES=4*1024*1024;
const SHA=/^[a-f0-9]{40}$/;
const fail=message=>{throw new Error('Native asset provenance: '+message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function keys(value,expected,label){
 if(!object(value)||Object.keys(value).length!==expected.length||expected.some(key=>!Object.hasOwn(value,key)))fail('unexpected '+label+' fields');
}
function sha(value,label){if(typeof value!=='string'||!SHA.test(value))fail('invalid '+label);return value;}
export function gitObjectIdV1(type,bytes){
 return createHash('sha1').update(type+' '+bytes.length+'\0').update(bytes).digest('hex');
}
function proofBytes(value,label,limit){
 if(typeof value!=='string'||!value.length||value.length>limit*2)fail('invalid '+label+' bytes');
 const bytes=Buffer.from(value,'base64');
 if(bytes.length>limit||bytes.toString('base64')!==value)fail('non-canonical '+label+' encoding');
 return bytes;
}
function treeEntries(bytes){
 const entries=new Map();let cursor=0;
 while(cursor<bytes.length){
  const space=bytes.indexOf(32,cursor),zero=bytes.indexOf(0,space+1);
  if(space<cursor||zero<=space+1||zero+21>bytes.length)fail('malformed Git tree');
  const mode=bytes.subarray(cursor,space).toString('ascii'),nameBytes=bytes.subarray(space+1,zero),name=nameBytes.toString('utf8');
  if(!['40000','100644','100755','120000','160000'].includes(mode)||!Buffer.from(name,'utf8').equals(nameBytes)||
     /[/\\\0\r\n]/.test(name)||name==='.'||name==='..'||entries.has(name))fail('non-literal Git tree entry');
  entries.set(name,{mode,oid:bytes.subarray(zero+1,zero+21).toString('hex')});cursor=zero+21;
 }
 return entries;
}
function directoryEntry(bytes,name,expected){
 const entry=treeEntries(bytes).get(name);
 if(entry?.mode!=='40000'||entry.oid!==expected)fail('Git tree does not bind '+name);
}
export function externalNativeBitmapV1(relativePath){return /\.(?:png|webp|jpg)$/i.test(relativePath);}
function literalPath(value){
 if(typeof value!=='string'||!value.length||value.length>1024||value.startsWith('/')||
    /[\\\0\r\n]/.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('non-literal native path');
 return value;
}
/** Recreate Git's byte-sorted tree objects; no blob bytes or Git writes needed. */
export function nativeAssetTreeV1(entries){
 const root=new Map();
 for(const entry of entries){
  const parts=literalPath(entry.path).split('/');let directory=root;
  for(const part of parts.slice(0,-1)){
   const found=directory.get(part);
   if(found&&!(found instanceof Map))fail('file/directory collision');
   if(!found)directory.set(part,new Map());
   directory=directory.get(part);
  }
  const name=parts.at(-1);
  if(directory.has(name))fail('duplicate native path');
  directory.set(name,entry);
 }
 function digest(directory){
  const children=[...directory].map(([name,value])=>value instanceof Map?
   {name,mode:'40000',oid:digest(value),directory:true}:{name,mode:value.mode,oid:value.blob,directory:false});
  children.sort((a,b)=>Buffer.compare(Buffer.from(a.name+(a.directory?'/':'')),Buffer.from(b.name+(b.directory?'/':''))));
  const bytes=Buffer.concat(children.map(entry=>Buffer.concat([
   Buffer.from(entry.mode+' '+entry.name+'\0'),Buffer.from(entry.oid,'hex'),
  ])));
  return gitObjectIdV1('tree',bytes);
 }
 return digest(root);
}
export function validateNativeAssetManifestV1(value){
 keys(value,['schema','mode','repository','scope','sourceCommit','sourceTree','sourcePublicTree','sourceGameTree','retainedGameTree','gitObjects','entries'],'manifest');
 if(value.schema!=='yautja.native-asset-origin.v1'||value.mode!=='source-light'||
    value.repository!==NATIVE_ASSET_REPOSITORY_V1||value.scope!==NATIVE_ASSET_SCOPE_V1)fail('unsupported source-light contract');
 for(const field of ['sourceCommit','sourceTree','sourcePublicTree','sourceGameTree','retainedGameTree'])sha(value[field],field);
 keys(value.gitObjects,['commit','rootTree','publicTree'],'Git proof');
 const commit=proofBytes(value.gitObjects.commit,'commit',128*1024);
 const rootTree=proofBytes(value.gitObjects.rootTree,'root tree',1024*1024);
 const publicTree=proofBytes(value.gitObjects.publicTree,'public tree',1024*1024);
 if(gitObjectIdV1('commit',commit)!==value.sourceCommit)fail('source commit proof differs');
 if(gitObjectIdV1('tree',rootTree)!==value.sourceTree||gitObjectIdV1('tree',publicTree)!==value.sourcePublicTree)fail('source tree proof differs');
 const commitText=commit.toString('utf8');
 if(!Buffer.from(commitText,'utf8').equals(commit)||commitText.includes('\0')||
    !commitText.startsWith('tree '+value.sourceTree+'\n'))fail('commit does not bind the source tree');
 directoryEntry(rootTree,'public',value.sourcePublicTree);
 directoryEntry(publicTree,'game',value.sourceGameTree);
 if(!Array.isArray(value.entries)||!value.entries.length||value.entries.length>20000)fail('bounded complete native inventory required');
 let previous=null;
 const entries=value.entries.map(entry=>{
  keys(entry,['path','mode','blob'],'inventory');
  const relative=literalPath(entry.path);
  if(entry.mode!=='100644')fail('native inventory must contain regular non-executable files');
  sha(entry.blob,'native blob');
  if(previous!==null&&Buffer.compare(Buffer.from(previous),Buffer.from(relative))>=0)fail('inventory must be byte-sorted and unique');
  previous=relative;
  return Object.freeze({path:relative,mode:entry.mode,blob:entry.blob});
 });
 if(nativeAssetTreeV1(entries)!==value.sourceGameTree)fail('complete inventory differs from the pinned game tree');
 const retained=entries.filter(entry=>!externalNativeBitmapV1(entry.path));
 if(!retained.length||retained.length===entries.length)fail('both retained files and external bitmaps required');
 if(nativeAssetTreeV1(retained)!==value.retainedGameTree)fail('retained inventory tree differs');
 return Object.freeze({...value,gitObjects:Object.freeze({...value.gitObjects}),entries:Object.freeze(entries)});
}
export function nativeAssetDestinationV1(sourceCommit){
 return 'https://raw.githubusercontent.com/'+NATIVE_ASSET_REPOSITORY_V1+'/'+sha(sourceCommit,'source commit')+'/public/game/:path*';
}
/** Missing is the explicit legacy mode. Invalid or linked manifests fail closed. */
export function readNativeAssetOriginV1(root=process.cwd()){
 const absolute=path.resolve(root),file=path.join(absolute,NATIVE_ASSET_MANIFEST_V1);
 let stat;try{stat=fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}
 for(const directory of [absolute,path.join(absolute,'scripts')]){
  const info=fs.lstatSync(directory);
  if(!info.isDirectory()||info.isSymbolicLink()||fs.realpathSync(directory)!==directory)fail('literal manifest directory required');
 }
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_MANIFEST_BYTES||fs.realpathSync(file)!==file)fail('bounded regular manifest required');
 const bytes=fs.readFileSync(file);
 if(bytes.length!==stat.size)fail('manifest changed while reading');
 return validateNativeAssetManifestV1(JSON.parse(bytes.toString('utf8')));
}
/** Reproducible release preparation. Reads commit and tree metadata, never PNGs. */
export function createNativeAssetManifestV1({repositoryRoot=process.cwd(),sourceCommit}){
 sha(sourceCommit,'source commit');
 const git=args=>execFileSync('git',args,{cwd:repositoryRoot,maxBuffer:16*1024*1024});
 const revision=suffix=>git(['rev-parse','--verify',sourceCommit+suffix]).toString('utf8').trim();
 const sourceTree=revision('^{tree}'),sourcePublicTree=revision(':public'),sourceGameTree=revision(':public/game');
 const entries=git(['ls-tree','-r','-z',sourceCommit,'--',NATIVE_ASSET_SCOPE_V1]).toString('utf8').split('\0').filter(Boolean).map(line=>{
  const match=/^([0-9]+) blob ([a-f0-9]{40})\t(public\/game\/.+)$/.exec(line);
  if(!match)fail('source inventory contains unsupported objects');
  return {path:match[3].slice('public/game/'.length),mode:match[1],blob:match[2]};
 }).sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));
 const retained=entries.filter(entry=>!externalNativeBitmapV1(entry.path));
 return validateNativeAssetManifestV1({
  schema:'yautja.native-asset-origin.v1',mode:'source-light',repository:NATIVE_ASSET_REPOSITORY_V1,scope:NATIVE_ASSET_SCOPE_V1,
  sourceCommit,sourceTree,sourcePublicTree,sourceGameTree,retainedGameTree:nativeAssetTreeV1(retained),
  gitObjects:{
   commit:git(['cat-file','commit',sourceCommit]).toString('base64'),
   rootTree:git(['cat-file','tree',sourceTree]).toString('base64'),
   publicTree:git(['cat-file','tree',sourcePublicTree]).toString('base64'),
  },entries,
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==4||args[0]!=='--source'||args[2]!=='--output')throw new Error('Usage: node scripts/native-asset-origin-v1.mjs --source FULL_SHA --output NEW_MANIFEST_PATH');
 const manifest=createNativeAssetManifestV1({sourceCommit:args[1]});
 fs.writeFileSync(path.resolve(args[3]),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({sourceCommit:manifest.sourceCommit,sourceGameTree:manifest.sourceGameTree,retainedGameTree:manifest.retainedGameTree,
  files:manifest.entries.length,retained:manifest.entries.filter(entry=>!externalNativeBitmapV1(entry.path)).length,manifestPath:path.resolve(args[3])}));
}
