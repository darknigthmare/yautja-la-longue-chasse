/** Replace byte-identical generated static copies with public hardlinks.
 * Original public files and runtime outputs stay intact. Only the verified,
 * disposable Vercel build may reclaim its compilation cache and Git clone.
 * CLI mutation is limited to the verified Linux Vercel build at /vercel/path0.
 */
import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const runFile=promisify(execFile);
const buildRoot='/vercel/path0';
const mode=stat=>stat.mode&0o7777n;
const sameFile=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
const sameSnapshot=(a,b)=>sameFile(a,b)&&a.size===b.size&&a.mode===b.mode&&a.mtimeNs===b.mtimeNs;

function inside(root,target){
 const relative=path.relative(root,target);
 return relative===''||(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));
}

/** lstat every component: a symlink/junction never establishes containment. */
async function checkedPath(root,target,{missing=false}={}){
 if(!inside(root,target))throw new Error('Static compaction refused an external path');
 const relative=path.relative(root,target);
 const parts=relative?relative.split(path.sep):[];
 let current=root,last;
 for(let index=-1;index<parts.length;index++){
  if(index>=0)current=path.join(current,parts[index]);
  try{last=await fs.lstat(current,{bigint:true});}
  catch(error){if(error.code==='ENOENT'&&missing)return null;throw error;}
  if(last.isSymbolicLink())throw new Error('Static compaction refuses symlinks or junctions');
  if(index<parts.length-1&&!last.isDirectory())throw new Error('Static compaction path ancestor is not a directory');
 }
 if(await fs.realpath(target)!==target)throw new Error('Static compaction path does not resolve literally');
 return last;
}

async function hashRegularFile(file,expected){
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const before=await handle.stat({bigint:true});
  if(!before.isFile()||!sameSnapshot(before,expected))throw new Error('Static file changed before hashing');
  const hash=createHash('sha256');
  for await(const chunk of handle.createReadStream({autoClose:false}))hash.update(chunk);
  if(!sameSnapshot(before,await handle.stat({bigint:true})))throw new Error('Static file changed while hashing');
  return hash.digest('hex');
 }finally{await handle.close();}
}

async function outputFiles(root,directory){
 const stat=await checkedPath(root,directory);
 if(!stat.isDirectory())throw new Error('Static output is not a real directory');
 const result=[];
 for(const entry of await fs.readdir(directory)){
  const file=path.join(directory,entry),child=await checkedPath(root,file);
  if(child.isDirectory())result.push(...await outputFiles(root,file));
  else if(child.isFile())result.push(file);
  else throw new Error('Static compaction refuses special filesystem entries');
 }
 return result;
}

async function availableBytes(root){
 const info=await fs.statfs(root,{bigint:true});
 return Number(info.bavail*info.bsize);
}

/** Remove only a preflighted disposable tree inside this one build root.
 * Individual unlink/rmdir operations do not follow a junction or symlink.
 * This never targets source/public/node_modules or generated runtime output. */
async function removeDisposableTree(root,target){
 if(![path.join(root,'.next','cache'),path.join(root,'.git','objects')].includes(target))throw new Error('Disposable target is not allowlisted');
 const first=await checkedPath(root,target,{missing:true});
 if(!first)return{files:0,bytes:0};
 if(!first.isDirectory())throw new Error('Disposable target must be a real directory');
 const rootDevice=(await checkedPath(root,root)).dev;
 if(first.dev!==rootDevice)throw new Error('Disposable target refuses mounted filesystems');
 const files=[],directories=[];
 async function visit(directory){
  const stat=await checkedPath(root,directory);
  if(!stat.isDirectory())throw new Error('Disposable ancestor is not a real directory');
  if(stat.dev!==rootDevice)throw new Error('Disposable tree refuses mounted filesystems');
  directories.push({path:directory,stat});
  for(const name of await fs.readdir(directory)){
   const file=path.join(directory,name),child=await checkedPath(root,file);
   if(child.dev!==rootDevice)throw new Error('Disposable tree refuses mounted filesystems');
   if(child.isDirectory())await visit(file);
   else if(child.isFile())files.push({path:file,stat:child});
   else throw new Error('Disposable tree refuses special entries');
  }
 }
 await visit(target);
 // Complete containment/symlink preflight before deleting any file.
 for(const item of files)if(!sameSnapshot(item.stat,await checkedPath(root,item.path)))throw new Error('Disposable file changed after preflight');
 for(const item of directories)if(!sameFile(item.stat,await checkedPath(root,item.path)))throw new Error('Disposable directory changed after preflight');
 for(const item of files){
  if(!sameSnapshot(item.stat,await checkedPath(root,item.path)))throw new Error('Disposable file changed before unlink');
  await fs.unlink(item.path);
 }
 for(const item of directories.reverse()){
  if(!sameFile(item.stat,await checkedPath(root,item.path)))throw new Error('Disposable directory changed before removal');
  await fs.rmdir(item.path);
 }
 return{files:files.length,bytes:files.reduce((sum,item)=>sum+Number(item.stat.size),0)};
}

async function reclaimVerifiedBuild(root,{allowCloneRemoval=false,sameVolume=true,measure=availableBytes,reserveBytes=512*1024*1024}={}){
 const staticFiles=await outputFiles(root,path.join(root,'.next','output','static'));
 let requiredCopyBytes=0;
 for(const file of staticFiles)requiredCopyBytes+=Number((await checkedPath(root,file)).size);
 const before=await measure(root);
 // Leave source caches alone when capacity suffices, or when cleanup cannot
 // reclaim space on the separate destination volume. Mount guards remain.
 const cache=before>=requiredCopyBytes+reserveBytes||!sameVolume?{files:0,bytes:0}:await removeDisposableTree(root,path.join(root,'.next','cache'));
 const afterCache=await measure(root);
 let clone={files:0,bytes:0};
 // A Git clone is a recoverable build input copy, not the user's repository.
 // It is removed only after the caller verified its SHA and standalone root,
 // and only if the generated output still cannot fit beside the inputs.
 // A separate output mount is legitimate, but deleting source clone objects
 // cannot be credited toward that mount's capacity. Never reclaim them there.
 if(afterCache<requiredCopyBytes+reserveBytes&&allowCloneRemoval&&sameVolume)clone=await removeDisposableTree(root,path.join(root,'.git','objects'));
 const after=await measure(root);
 if(after<requiredCopyBytes+reserveBytes)throw new Error(`Final static copy requires ${requiredCopyBytes+reserveBytes} free bytes; available ${after} after disposable build cleanup`);
 return{sameVolume,freeBytesBefore:before,freeBytesAfterCache:afterCache,freeBytesAfter:after,requiredCopyBytes,reserveBytes,cache,ephemeralClone:clone};
}

async function compactVerifiedRoot(root,linkFile=fs.link){
 const publicRoot=path.join(root,'public'),outputRoot=path.join(root,'.next','output','static');
 if(!(await checkedPath(root,publicRoot)).isDirectory())throw new Error('Public source is not a real directory');
 const candidates=await outputFiles(root,outputRoot);
 const plan=[];
 const result={status:'compacted',outputFiles:candidates.length,linkedFiles:0,bytesSaved:0,
  alreadyLinked:0,unmatchedFiles:0,sizeMismatches:0,hashMismatches:0,modeMismatches:0,filesystemMismatches:0,linkFailures:0};

 // Preflight all paths and byte comparisons before creating any hardlink.
 // Next-generated JS/CSS, routes and manifests without a public counterpart
 // are left exactly as they were; filenames alone never prove equality.
 for(const target of candidates){
  const source=path.join(publicRoot,path.relative(outputRoot,target));
  const sourceStat=await checkedPath(root,source,{missing:true});
  if(!sourceStat){result.unmatchedFiles++;continue;}
  if(!sourceStat.isFile())throw new Error('Public counterpart is not a regular file');
  const targetStat=await checkedPath(root,target);
  if(sourceStat.dev!==targetStat.dev){result.filesystemMismatches++;continue;}
  if(mode(sourceStat)!==mode(targetStat)){result.modeMismatches++;continue;}
  if(sourceStat.size!==targetStat.size){result.sizeMismatches++;continue;}
  if(sameFile(sourceStat,targetStat)){result.alreadyLinked++;continue;}
  const sourceHash=await hashRegularFile(source,sourceStat);
  if(sourceHash!==await hashRegularFile(target,targetStat)){result.hashMismatches++;continue;}
  plan.push({source,target,sourceStat,targetStat});
 }

 for(const item of plan){
  const sourceNow=await checkedPath(root,item.source),targetNow=await checkedPath(root,item.target);
  if(!sameSnapshot(sourceNow,item.sourceStat)||!sameSnapshot(targetNow,item.targetStat))throw new Error('Static copy changed after preflight');
  const temporary=path.join(path.dirname(item.target),'.compact-v87-'+randomUUID());
  let created=false;
  try{
   // The original generated copy remains intact if linking fails. Atomic
   // rename replaces it only after validating the temporary regular link.
   await linkFile(item.source,temporary);created=true;
   const linked=await checkedPath(root,temporary),original=await checkedPath(root,item.source);
   if(!linked.isFile()||!sameFile(linked,original)||linked.nlink<2n||mode(linked)!==mode(item.targetStat)
    ||!sameSnapshot(original,item.sourceStat))throw new Error('Temporary hardlink identity or mode differs');
   if(!sameSnapshot(await checkedPath(root,item.target),item.targetStat))throw new Error('Generated copy changed before replacement');
   await fs.rename(temporary,item.target);created=false;
   const installed=await checkedPath(root,item.target),retained=await checkedPath(root,item.source);
   if(!installed.isFile()||!sameFile(installed,retained)||installed.nlink<2n||mode(installed)!==mode(item.targetStat)
    ||!sameSnapshot(retained,item.sourceStat))throw new Error('Installed hardlink identity or mode differs');
   result.linkedFiles++;result.bytesSaved+=Number(item.sourceStat.size);
  }catch(error){
   if(created)await fs.unlink(temporary);
   // A failed link/rename cannot remove the original output. Stop before
   // another mutation if its inode or bytes might have changed.
   if(!sameSnapshot(await checkedPath(root,item.target),item.targetStat))throw error;
   result.linkFailures++;
  }
 }
 return result;
}

/** Test access is restricted to private, self-created workspace fixtures. */
export async function compactStaticFixtureV87({fixtureRoot,linkFile=fs.link}){
 const project=await fs.realpath(process.cwd());
 const fixtureBase=path.join(project,'work-local','v87');
 const root=path.resolve(fixtureRoot);
 if(!inside(fixtureBase,root)||root===fixtureBase||!path.basename(root).startsWith('static-compaction-fixture-'))
  throw new Error('Only private static compaction fixtures are allowed');
 await checkedPath(project,root);
 return compactVerifiedRoot(root,linkFile);
}

/** Reclamation is testable only within self-created private fixtures. */
export async function reclaimBuildFixtureV87({fixtureRoot,measure=availableBytes,reserveBytes=0,sameVolume=true}){
 const project=await fs.realpath(process.cwd()),base=path.join(project,'work-local','v87'),root=path.resolve(fixtureRoot);
 if(!inside(base,root)||root===base||!path.basename(root).startsWith('static-compaction-fixture-'))throw new Error('Only private static compaction fixtures are allowed');
 await checkedPath(project,root);
 return reclaimVerifiedBuild(root,{allowCloneRemoval:true,sameVolume,measure,reserveBytes});
}

export async function runVercelStaticCompactionV87(){
 // Do not inspect, hash or mutate local build/caches even with VERCEL spoofed.
 if(process.env.VERCEL!=='1'||process.platform!=='linux'||process.cwd()!==buildRoot
  ||await fs.realpath(process.cwd())!==buildRoot)return{status:'skipped',reason:'not-exact-linux-vercel-build-root'};
 await checkedPath(buildRoot,buildRoot);
 if(['GIT_DIR','GIT_WORK_TREE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].some(key=>process.env[key]))throw new Error('External Git environment overrides refused');
 const expected=process.env.VERCEL_GIT_COMMIT_SHA;
 if(!/^[a-f0-9]{40}$/i.test(expected??''))throw new Error('Vercel Git commit SHA is required before static compaction');
 const {stdout}=await runFile('git',['rev-parse','--verify','HEAD^{commit}'],{cwd:buildRoot});
 if(stdout.trim().toLowerCase()!==expected.toLowerCase())throw new Error('Vercel Git commit SHA differs from checked-out HEAD');
 // Refuse linked worktrees/common Git directories. The only eligible clone
 // is this runner's literal standalone .git directory, never a local repo.
 const gitPath=path.join(buildRoot,'.git');
 if(!(await checkedPath(buildRoot,gitPath)).isDirectory())throw new Error('Standalone Vercel clone directory required');
 const {stdout:gitDir}=await runFile('git',['rev-parse','--absolute-git-dir'],{cwd:buildRoot});
 const {stdout:commonDir}=await runFile('git',['rev-parse','--git-common-dir'],{cwd:buildRoot});
 if(path.resolve(gitDir.trim())!==gitPath||path.resolve(buildRoot,commonDir.trim())!==gitPath)throw new Error('Shared or external Git clone metadata refused');
 for(const entry of ['worktrees','commondir','modules','objects/info/alternates'])if(await checkedPath(buildRoot,path.join(gitPath,entry),{missing:true}))throw new Error('Registered worktrees, submodules or alternate clone object stores refused');
 // The builder's final destination is outside the checkout. Inspect it only
 // for disk accounting: no deletion or modification is permitted there.
 let finalVolumeRoot='/vercel/output';
 try{await fs.lstat(finalVolumeRoot);}catch(error){if(error.code!=='ENOENT')throw error;finalVolumeRoot='/vercel';}
 const destination=await fs.lstat(finalVolumeRoot,{bigint:true});
 if(destination.isSymbolicLink()||!destination.isDirectory()||await fs.realpath(finalVolumeRoot)!==finalVolumeRoot)throw new Error('Final output volume must be a literal directory');
 const sourceDevice=(await fs.lstat(buildRoot,{bigint:true})).dev;
 const sameVolume=destination.dev===sourceDevice;
 const finalVolumeFreeBytesBefore=await availableBytes(finalVolumeRoot);
 const freeBytesBefore=await availableBytes(buildRoot);
 console.log(JSON.stringify({status:'static-volume-preflight',sameVolume,sourceDevice:String(sourceDevice),destinationDevice:String(destination.dev),finalVolumeRoot,sourceFreeBytes:freeBytesBefore,destinationFreeBytes:finalVolumeFreeBytesBefore}));
 const compacted=await compactVerifiedRoot(buildRoot);
 const freeBytesAfterLinks=await availableBytes(buildRoot);
 const reclamation=await reclaimVerifiedBuild(buildRoot,{allowCloneRemoval:sameVolume,sameVolume,measure:async()=>sameVolume?Math.min(await availableBytes(buildRoot),await availableBytes(finalVolumeRoot)):availableBytes(finalVolumeRoot)});
 return{...compacted,sameVolume,freeBytesBefore,freeBytesAfterLinks,sourceFreeBytesAfter:await availableBytes(buildRoot),finalVolumeRoot,finalVolumeFreeBytesBefore,finalVolumeFreeBytesAfter:await availableBytes(finalVolumeRoot),reclamation};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runVercelStaticCompactionV87()));}
 catch(error){console.error('Static compaction refused: '+error.message);process.exitCode=1;}
}
