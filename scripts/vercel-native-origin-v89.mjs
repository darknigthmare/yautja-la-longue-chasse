/** Keep native sprites in Git/public; omit only verified generated Vercel copies.
 * A release-pinned beforeFiles rewrite must exist before any output is removed.
 * Mutation is restricted to /vercel/path0 or self-created private test fixtures.
 */
import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const run = promisify(execFile);
const rootAllowed = '/vercel/path0';
export const NATIVE_ORIGIN_PREFIX_V89 = '/game/imports/v85';
export const nativeOriginDestinationV89 = sha => {
 if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Valid release SHA required');
 return 'https://raw.githubusercontent.com/darknigthmare/yautja-la-longue-chasse/' + sha + '/public' + NATIVE_ORIGIN_PREFIX_V89 + '/:path*';
};
const inside = (root, target) => {
 const rel = path.relative(root, target);
 return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep));
};
const same = (a,b) => a.dev===b.dev && a.ino===b.ino && a.size===b.size && a.mode===b.mode && a.mtimeNs===b.mtimeNs;
async function checked(root, target, missing=false) {
 if (!inside(root,target)) throw new Error('External native sprite path refused');
 const parts=path.relative(root,target).split(path.sep).filter(Boolean); let current=root, stat;
 for (let i=-1;i<parts.length;i++) {
  if(i>=0)current=path.join(current,parts[i]);
  try{stat=await fs.lstat(current,{bigint:true});}catch(e){if(missing&&e.code==='ENOENT')return null;throw e;}
  if(stat.isSymbolicLink())throw new Error('Native origin refuses symlinks or junctions');
  if(i<parts.length-1&&!stat.isDirectory())throw new Error('Non-directory ancestor');
 }
 if(await fs.realpath(target)!==target)throw new Error('Non-literal native origin path');
 return stat;
}
async function digest(file, expected) {
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try {
  const before=await handle.stat({bigint:true});
  if(!before.isFile()||!same(before,expected))throw new Error('Sprite changed before hashing');
  const sha256=createHash('sha256'), blob=createHash('sha1').update('blob '+before.size+'\0');
  for await(const chunk of handle.createReadStream({autoClose:false})){sha256.update(chunk);blob.update(chunk);}
  if(!same(before,await handle.stat({bigint:true})))throw new Error('Sprite changed during hashing');
  return {sha256:sha256.digest('hex'),blob:blob.digest('hex')};
 } finally{await handle.close();}
}
async function prune(root,sha) {
 const manifestPath=path.join(root,'.next','routes-manifest.json');
 if(!(await checked(root,manifestPath)).isFile())throw new Error('Compiled route manifest required');
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const source=NATIVE_ORIGIN_PREFIX_V89+'/:path*', destination=nativeOriginDestinationV89(sha);
 const routes=manifest.rewrites?.beforeFiles;
 if(!Array.isArray(routes)||routes.filter(r=>r.source===source).length!==1 ||
  !routes.some(r=>r.source===source&&r.destination===destination&&!(r.has?.length)&&!(r.missing?.length)))
  throw new Error('Exact release-pinned beforeFiles rewrite required');
 const {stdout:head}=await run('git',['rev-parse','--verify','HEAD^{commit}'],{cwd:root});
 if(head.trim()!==sha)throw new Error('Release SHA differs from HEAD');
 const prefix='public'+NATIVE_ORIGIN_PREFIX_V89+'/';
 const {stdout:tree}=await run('git',['ls-tree','-r','-z',sha,'--',prefix],{cwd:root,maxBuffer:4*1024*1024});
 const tracked=new Map();
 for(const entry of tree.split('\0').filter(Boolean)){
  const match=/^100644 blob ([a-f0-9]{40})\t(.+)$/.exec(entry);
  if(!match||!match[2].startsWith(prefix)||!match[2].endsWith('.png'))throw new Error('Historical sprite tree must contain regular PNG blobs only');
  tracked.set(match[2],match[1]);
 }
 if(!tracked.size)throw new Error('No tracked historical native sprites');
 const staticRoot=path.join(root,'.next','output','static');
 const targetRoot=path.join(staticRoot,...NATIVE_ORIGIN_PREFIX_V89.split('/').filter(Boolean));
 const rootStat=await checked(root,root), targetStat=await checked(root,targetRoot,true);
 if(!targetStat)return {status:'not-copied',files:0,bytes:0,sha};
 // The official Vercel adapter mounts its generated static output separately
 // from the Git clone. Use that exact, literal output directory as the device
 // boundary; mounts below it, links and unverified copies remain refused.
 const staticStat=await checked(root,staticRoot);
 if(!staticStat.isDirectory())throw new Error('Exact generated static directory required');
 if(!targetStat.isDirectory())throw new Error('Generated sprite root must be a directory');
 const files=[], directories=[];
 async function visit(dir){
  const stat=await checked(root,dir);
  if(!stat.isDirectory()||stat.dev!==staticStat.dev)throw new Error('Generated tree refuses nested mounted filesystems');
  directories.push({path:dir,stat});
  for(const name of await fs.readdir(dir)){
   const file=path.join(dir,name), stat=await checked(root,file);
   if(stat.dev!==staticStat.dev)throw new Error('Generated tree refuses nested mounted filesystems');
   if(stat.isDirectory())await visit(file);
   else if(stat.isFile())files.push({path:file,stat});
   else throw new Error('Special output refused');
  }
 }
 await visit(targetRoot);
 const plan=[];
 // All files pass byte, Git blob and path proof before the first deletion.
 for(const item of files) {
  const relative=path.relative(targetRoot,item.path).split(path.sep).join('/');
  const sourceRel=prefix+relative, original=path.join(root,...sourceRel.split('/'));
  const blob=tracked.get(sourceRel), stat=await checked(root,original);
  if(!blob||!stat.isFile()||stat.dev!==rootStat.dev||stat.size!==item.stat.size||(stat.mode&0o777n)!==(item.stat.mode&0o777n))throw new Error('Output lacks identical tracked PNG counterpart');
  const originalHash=await digest(original,stat), outputHash=await digest(item.path,item.stat);
  if(originalHash.sha256!==outputHash.sha256||originalHash.blob!==blob)throw new Error('Native bytes differ from output or committed origin');
  plan.push({...item,original,originalStat:stat});
 }
 for(const item of plan)if(!same(item.stat,await checked(root,item.path))||!same(item.originalStat,await checked(root,item.original)))throw new Error('Sprite changed after complete preflight');
 for(const item of plan){
  if(!same(item.stat,await checked(root,item.path))||!same(item.originalStat,await checked(root,item.original)))throw new Error('Sprite changed before removing generated copy');
  await fs.unlink(item.path);
 }
 for(const dir of directories.reverse()){
  const now=await checked(root,dir.path);
  if(now.dev!==dir.stat.dev||now.ino!==dir.stat.ino)throw new Error('Generated directory changed');
  await fs.rmdir(dir.path);
 }
 for(const item of plan)if(!same(item.originalStat,await checked(root,item.original)))throw new Error('Original source changed');
 return {status:'external-native-origin',files:plan.length,bytes:plan.reduce((n,f)=>n+Number(f.stat.size),0),sha,prefix:NATIVE_ORIGIN_PREFIX_V89,originalSourcesPreserved:true};
}
export async function nativeOriginFixtureV89({fixtureRoot,sha}){
 const project=await fs.realpath(process.cwd()),base=path.join(project,'work-local','v89'),root=path.resolve(fixtureRoot);
 if(root===base||!inside(base,root)||!path.basename(root).startsWith('native-origin-fixture-'))throw new Error('Only private native origin fixtures allowed');
 await checked(project,root);
 return prune(root,sha);
}
export async function runNativeOriginV89(){
 if(process.env.VERCEL!=='1'||process.platform!=='linux'||process.cwd()!==rootAllowed||await fs.realpath(process.cwd())!==rootAllowed)
  return {status:'skipped',reason:'not-exact-linux-vercel-build-root'};
 const root=rootAllowed;
 if(process.env.VERCEL_GIT_PROVIDER!=='github'||process.env.VERCEL_GIT_REPO_OWNER!=='darknigthmare'||process.env.VERCEL_GIT_REPO_SLUG!=='yautja-la-longue-chasse')throw new Error('Unexpected published Git repository');
 if(['GIT_DIR','GIT_WORK_TREE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].some(k=>process.env[k]))throw new Error('External Git environment refused');
 const gitPath=path.join(root,'.git');
 if(!(await checked(root,gitPath)).isDirectory())throw new Error('Standalone clone required');
 const {stdout:gitDir}=await run('git',['rev-parse','--absolute-git-dir'],{cwd:root});
 const {stdout:commonDir}=await run('git',['rev-parse','--git-common-dir'],{cwd:root});
 if(path.resolve(gitDir.trim())!==gitPath||path.resolve(root,commonDir.trim())!==gitPath)throw new Error('Shared Git metadata refused');
 for(const name of ['worktrees','commondir','modules','objects/info/alternates'])if(await checked(root,path.join(gitPath,name),true))throw new Error('External Git object stores refused');
 return prune(root,process.env.VERCEL_GIT_COMMIT_SHA);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runNativeOriginV89()));}catch(e){console.error('Native origin refused: '+e.message);process.exitCode=1;}
}
