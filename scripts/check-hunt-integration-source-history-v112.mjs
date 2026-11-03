/** Reexecute the dated V112 source inventory in its exact published Git context. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {constants,createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {attachHistoricalGitObjects,historicalGitFailure} from './lib/historical-git.mjs';

export const HUNT_SOURCE_PUBLICATION_V112='ebcb970df10c07a5d2f309411e2f968b13c9aef8';
export const HUNT_SOURCE_TREE_V112='37f21a3f155fbbfaa1e41327c05eafe2ecb348fe';
export const HUNT_SOURCE_REF_V112='f67b3996e7f11b86f48fc6e77ef16a39121c504a';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const MANIFEST='docs/qa/v112-hunt-integration/source-inputs.json';
const ORIGINAL='scripts/check-hunt-integration-source-v112.mjs';
const ORIGIN='https://github.com/darknigthmare/yautja-la-longue-chasse.git';
const MANIFEST_BYTES=436904;
const MANIFEST_SHA256='bcea1165180bfd1b3d84589ef8c51b6638e0051451ae3e8f085b895ff4b32bbc';
const MANIFEST_BLOB='57a54937f4ccf66cd09d2fcfcc680fee51e90fc2';
const contexts=new WeakMap();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const objectSha=(type,bytes)=>createHash('sha1').update(type+' '+bytes.length+'\0').update(bytes).digest('hex');
const environment=()=>({...process.env,GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'});
const local=file=>typeof file==='string'&&file.length>0&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.includes('\0')&&
 file.split('/').every(part=>part&&part!=='.'&&part!=='..')&&!file.startsWith('.git/');
function git(root,args,{env=environment(),timeout=45000}={}){
 try{return execFileSync('git',['-C',root,...args],{env,timeout,maxBuffer:192*1024*1024,stdio:['ignore','pipe','pipe']});}
 catch(error){throw historicalGitFailure(error,{operation:args[0],label:'V112 source history',env});}
}
async function regularPath(root,file){
 let target=root;
 for(const [index,part]of file.split('/').entries()){
  target=path.join(target,part);const stat=await fs.lstat(target).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));
  if(!stat||stat.isSymbolicLink()||(index===file.split('/').length-1?!stat.isFile():!stat.isDirectory()))return false;
 }
 return true;
}
async function fingerprint(root,file){
 assert.ok(await regularPath(root,file),'V112 historical source must be a private regular file: '+file);
 const stat=await fs.stat(path.join(root,file)),hash=createHash('sha256'),blob=createHash('sha1').update('blob '+stat.size+'\0');
 let bytes=0;for await(const chunk of createReadStream(path.join(root,file))){bytes+=chunk.length;hash.update(chunk);blob.update(chunk);}
 assert.equal(bytes,stat.size,'V112 source changed while being read: '+file);
 return{path:file,bytes,sha256:hash.digest('hex'),gitBlobSha:blob.digest('hex')};
}
const matches=(actual,expected)=>Boolean(actual&&actual.bytes===expected.bytes&&actual.sha256===expected.sha256&&actual.gitBlobSha===expected.gitBlobSha);
function treeEntries(root){
 return new Map(git(root,['ls-tree','-r','-z','--full-tree',HUNT_SOURCE_PUBLICATION_V112]).toString().split('\0').filter(Boolean).map(line=>{
  const at=line.indexOf('\t'),[mode,type,blob]=line.slice(0,at).split(' ');return[line.slice(at+1),{mode,type,blob}];
 }));
}
async function initialize(state,objectRepository){
 const root=state.root;git(root,['-c','init.defaultBranch=v112-source-history','init','--quiet']);
 git(root,['config','remote.origin.url',ORIGIN]);
 Object.assign(state,await attachHistoricalGitObjects({root,objectRepository}));
 for(const commit of [HUNT_SOURCE_PUBLICATION_V112,HUNT_SOURCE_REF_V112]){
  try{assert.equal(objectSha('commit',git(root,['cat-file','commit',commit])),commit);}
  catch{
   git(root,['fetch','--no-tags','--no-write-fetch-head','--filter=blob:none','--depth=2',ORIGIN,commit]);
   assert.equal(objectSha('commit',git(root,['cat-file','commit',commit])),commit,'V112 historical commit differs');
   state.fetchedCommits.push(commit);
  }
 }
 assert.equal(git(root,['rev-parse',HUNT_SOURCE_PUBLICATION_V112+'^{tree}']).toString().trim(),HUNT_SOURCE_TREE_V112);
 assert.equal(objectSha('tree',git(root,['cat-file','tree',HUNT_SOURCE_TREE_V112])),HUNT_SOURCE_TREE_V112);
 assert.equal(git(root,['rev-parse',HUNT_SOURCE_PUBLICATION_V112+'^']).toString().trim(),HUNT_SOURCE_REF_V112);
 await fs.writeFile(path.join(root,'.git/HEAD'),HUNT_SOURCE_PUBLICATION_V112+'\n',{mode:0o444});
 await fs.chmod(path.join(root,'.git/HEAD'),0o444);
 // The original check enumerates the Git index, then reads only its declared
 // source scope. Populate the exact index without checking out unrelated art.
 git(root,['read-tree',HUNT_SOURCE_PUBLICATION_V112]);
 state.indexSha=sha(await fs.readFile(path.join(root,'.git/index')));
}
export async function prepareHuntSourceHistoryV112({repository=ROOT,objectRepository=repository}={}){
 repository=await fs.realpath(repository);objectRepository=await fs.realpath(objectRepository);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-hunt-source-v112-'));
 const state={root,repository,observedCurrent:[],copiedCurrent:0,restoredGit:0,fetchedCommits:[]};
 try{
  const raw=await fs.readFile(path.join(repository,MANIFEST));
  assert.equal(raw.length,MANIFEST_BYTES,'V112 historical source inventory size changed');
  assert.equal(sha(raw),MANIFEST_SHA256,'V112 historical source inventory changed');
  const manifest=JSON.parse(raw);assert.equal(manifest.sourceRef,HUNT_SOURCE_REF_V112);
  assert.equal(manifest.files,2500);assert.equal(manifest.entries.length,2500);assert.equal(manifest.bytes,128194222);
  assert.equal(new Set(manifest.entries.map(row=>row.path)).size,2500);
  for(const row of manifest.entries){assert.ok(local(row.path),'Unsafe V112 historical source path');assert.match(row.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0);}
  await initialize(state,objectRepository);
  const tree=treeEntries(root);
  assert.deepEqual(tree.get(MANIFEST),{mode:'100644',type:'blob',blob:MANIFEST_BLOB});
  assert.equal(tree.get(ORIGINAL).blob,'39b1967a479878adf92c457dec45c573b890374d','Original V112 source check changed');
  state.entries=[...manifest.entries,{path:MANIFEST,bytes:MANIFEST_BYTES,sha256:MANIFEST_SHA256}].map(row=>{
   const source=tree.get(row.path);assert.ok(source,'V112 source missing from its publication: '+row.path);
   assert.equal(source.mode,'100644');assert.equal(source.type,'blob');return{...row,gitBlobSha:source.blob};
  });
  for(const row of state.entries){
   const target=path.join(root,row.path);await fs.mkdir(path.dirname(target),{recursive:true});
   const current=await regularPath(repository,row.path)?await fingerprint(repository,row.path):null;
   state.observedCurrent.push({path:row.path,current});
   if(matches(current,row)){
    await fs.copyFile(path.join(repository,row.path),target,constants.COPYFILE_FICLONE);state.copiedCurrent++;
   }else{
    const env=environment();delete env.GIT_NO_LAZY_FETCH;
    const bytes=git(root,['-c','remote.origin.promisor=true','-c','remote.origin.partialclonefilter=blob:none','cat-file','blob',row.gitBlobSha],{env});
    assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(objectSha('blob',bytes),row.gitBlobSha);
    await fs.writeFile(target,bytes);state.restoredGit++;
   }
   await fs.chmod(target,0o444);
  }
  const context={root,repository,publicationCommit:HUNT_SOURCE_PUBLICATION_V112,sourceRef:HUNT_SOURCE_REF_V112,
   dispose:()=>fs.rm(root,{recursive:true,force:true})};
  contexts.set(context,state);await verifyHuntSourceHistoryV112(context);return context;
 }catch(error){await fs.rm(root,{recursive:true,force:true});throw error;}
}
function contextState(context){
 const state=contexts.get(context);assert.ok(state,'Unrecognized V112 source historical context');
 assert.equal(context.root,state.root,'V112 source context root changed');assert.equal(context.repository,state.repository,'V112 source context repository changed');
 assert.equal(context.publicationCommit,HUNT_SOURCE_PUBLICATION_V112,'V112 source publication label changed');
 assert.equal(context.sourceRef,HUNT_SOURCE_REF_V112,'V112 historical source label changed');return state;
}
export async function verifyHuntSourceHistoryV112(context){
 const state=contextState(context),root=state.root;
 assert.equal(await fs.readFile(path.join(root,'.git/HEAD'),'utf8'),HUNT_SOURCE_PUBLICATION_V112+'\n','V112 historical HEAD changed');
 assert.equal(sha(await fs.readFile(path.join(root,'.git/index'))),state.indexSha,'V112 historical index changed');
 if(state.alternate)assert.equal(await fs.readFile(state.alternate.path,'utf8'),state.alternate.bytes,'V112 historical alternate changed');
 for(const commit of [HUNT_SOURCE_PUBLICATION_V112,HUNT_SOURCE_REF_V112])assert.equal(objectSha('commit',git(root,['cat-file','commit',commit])),commit);
 assert.equal(git(root,['rev-parse','HEAD^{tree}']).toString().trim(),HUNT_SOURCE_TREE_V112);
 for(const row of state.entries)assert.ok(matches(await fingerprint(root,row.path),row),'V112 historical source changed: '+row.path);
 return{publicationCommit:HUNT_SOURCE_PUBLICATION_V112,sourceTree:HUNT_SOURCE_TREE_V112,sourceRef:HUNT_SOURCE_REF_V112,
  files:2500,bytes:128194222,copiedMatchingCurrentFiles:state.copiedCurrent,restoredPinnedGitFiles:state.restoredGit,
  fetchedCanonicalCommits:[...state.fetchedCommits],currentRuntimeCovered:false};
}
export async function runHuntSourceHistoryV112(context){
 const state=contextState(context);await verifyHuntSourceHistoryV112(context);
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 let stdout;
 try{stdout=execFileSync(process.execPath,[ORIGINAL,'--check'],{cwd:state.root,env,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});}
 catch(error){const failure=Error('Original V112 source inventory check failed');failure.stdout=error.stdout;failure.stderr=error.stderr;throw failure;}
 const original=JSON.parse(stdout.trim());
 assert.deepEqual(original,{result:'PASS_CURRENT_SOURCE_INPUTS',sourceRef:HUNT_SOURCE_REF_V112,files:2500,bytes:128194222});
 const integrity=await verifyHuntSourceHistoryV112(context);
 for(const row of state.observedCurrent){
  const current=await regularPath(state.repository,row.path)?await fingerprint(state.repository,row.path):null;
  assert.deepEqual(current,row.current,'Current source changed while preserving V112: '+row.path);
 }
 return{result:'PASS_HISTORICAL_HUNT_SOURCE_INPUTS_V112',...integrity,originalCommandExecuted:true,
  originalCommand:[ORIGINAL,'--check'],originalResult:original,currentInputsUnchanged:state.observedCurrent.length};
}
export async function checkHuntSourceHistoryV112(options){
 const context=await prepareHuntSourceHistoryV112(options);
 try{return await runHuntSourceHistoryV112(context);}finally{await context.dispose();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 assert.deepEqual(process.argv.slice(2),['--check'],'Usage: node scripts/check-hunt-integration-source-history-v112.mjs --check');
 try{console.log(JSON.stringify(await checkHuntSourceHistoryV112()));}
 catch(error){if(error.stdout)process.stdout.write(error.stdout);if(error.stderr)process.stderr.write(error.stderr);throw error;}
}
