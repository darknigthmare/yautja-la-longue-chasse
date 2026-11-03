/** Reproduce the exact R7 publication in private files, independently of the current runtime. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {constants,createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {attachHistoricalGitObjects,historicalGitFailure,assertNoExternalGitPathOverrides,historicalGitEnvironment as gitEnvironment} from './lib/historical-git.mjs';

export const R7_PUBLICATION_COMMIT_V113='03cf51badd450338d748da55599a317a71debd28';
export const R7_PUBLICATION_TREE_V113='8955aa3ae57f3c1c5151fc6e2980d083bbcd0aaa';
export const R7_RUNTIME_COMMIT_V113='bda14a95aa8c9e6cf37039e2d67ea1544a8e8de1';
export const R7_BUILD_ID_V113='wVuSG_xIKNn3geLlIq7Cb';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const MANIFEST=new URL('../tests/fixtures/homeworld-publication-r7-v113.json.gz',import.meta.url);
const ORIGIN='https://github.com/darknigthmare/yautja-la-longue-chasse.git';
const ORIGINAL_TEST='tests/homeworld-excel-followup-v112.test.mjs';
const COMMANDS=[
 ['scripts/snapshot-runtime-v112.mjs','--check','docs/v112-runtime-freeze.json'],
 ['scripts/build-runtime-public-inputs-v112.mjs','--check'],
 ['scripts/build-homeworld-followup-v112.mjs','--check'],
];
const contexts=new WeakMap();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const objectSha=(type,bytes)=>createHash('sha1').update(type+' '+bytes.length+'\0').update(bytes).digest('hex');
const local=file=>typeof file==='string'&&file.length>0&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.includes('\0')&&
 file.split('/').every(part=>part&&part!=='.'&&part!=='..')&&!file.startsWith('.git/');
const identity=row=>({path:row.path,bytes:row.bytes,sha256:row.sha256});
function git(root,args,{timeout=45000,input,env=gitEnvironment()}={}){
 assertNoExternalGitPathOverrides();
 try{return execFileSync('git',['-C',root,...args],{input,env,timeout,maxBuffer:192*1024*1024,stdio:['pipe','pipe','pipe']});}
 catch(error){throw historicalGitFailure(error,{operation:args[0],label:'R7',env});}
}
export async function readR7PublicationManifestV113(){
 const bytes=await fs.readFile(MANIFEST);
 assert.equal(bytes.length,153325,'R7 manifest compressed size changed');
 assert.equal(sha(bytes),'c8a9d9d5c447c5e0a471ea0bc2e69688233e525a41976e9bf36bd332698c54e2','R7 manifest archive changed');
 const decoded=gunzipSync(bytes,{maxOutputLength:434494});
 assert.equal(decoded.length,434494);assert.equal(sha(decoded),'083062abe396ef93b5c227eda5d3d97b4619ecf0bd582c03f26b4d4701b9ab4f');
 const manifest=JSON.parse(decoded);
 assert.equal(manifest.sourceCommit,R7_PUBLICATION_COMMIT_V113);assert.equal(manifest.sourceTree,R7_PUBLICATION_TREE_V113);
 assert.equal(manifest.runtimeCommit,R7_RUNTIME_COMMIT_V113);assert.equal(manifest.buildId,R7_BUILD_ID_V113);
 assert.equal(manifest.publicationRegularFiles,1894);
 assert.deepEqual(manifest.originalTestFixtures,['docs/v111-homeworld-validation.json']);
 assert.equal(manifest.entries.length,1895);assert.equal(new Set(manifest.entries.map(row=>row.path)).size,1895);
 for(const row of manifest.entries){
  assert.ok(local(row.path),'Unsafe R7 input path');assert.equal(row.gitMode,'100644');
  assert.match(row.gitBlobSha,/^[a-f0-9]{40}$/);assert.match(row.sha256,/^[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0);
 }
 return manifest;
}
async function regularPath(root,file){
 let directory=root;
 for(const part of file.split('/').slice(0,-1)){
  directory=path.join(directory,part);
  const stat=await fs.lstat(directory).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));
  if(!stat||!stat.isDirectory()||stat.isSymbolicLink())return false;
 }
 const stat=await fs.lstat(path.join(root,file)).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));
 return Boolean(stat?.isFile()&&!stat.isSymbolicLink());
}
async function fingerprint(root,file){
 assert.ok(await regularPath(root,file),'R7 input must be a private regular file: '+file);
 const stat=await fs.stat(path.join(root,file)),hash=createHash('sha256'),blob=createHash('sha1').update('blob '+stat.size+'\0');
 let bytes=0;
 for await(const chunk of createReadStream(path.join(root,file))){bytes+=chunk.length;hash.update(chunk);blob.update(chunk);}
 assert.equal(bytes,stat.size,'R7 input changed while being read: '+file);
 return{path:file,bytes,sha256:hash.digest('hex'),gitBlobSha:blob.digest('hex')};
}
function matches(actual,row){return Boolean(actual&&actual.bytes===row.bytes&&actual.sha256===row.sha256&&actual.gitBlobSha===row.gitBlobSha);}
async function verifyRow(root,row){assert.ok(matches(await fingerprint(root,row.path),row),'R7 historical input changed: '+row.path);}
function treeEntries(root,commit){
 return new Map(git(root,['ls-tree','-r','-z','--full-tree',commit]).toString('utf8').split('\0').filter(Boolean).map(line=>{
  const at=line.indexOf('\t'),[mode,type,blob]=line.slice(0,at).split(' ');return[line.slice(at+1),{mode,type,blob}];
 }));
}
function fetchEnvironment(){
 const env=gitEnvironment(),token=env.GH_TOKEN??env.GITHUB_TOKEN;
 if(token){
  // Authentication is process-local, never a command argument, file or printed value.
  const index=Number(env.GIT_CONFIG_COUNT??0);assert.ok(Number.isSafeInteger(index)&&index>=0);
  env.GIT_CONFIG_COUNT=String(index+1);env['GIT_CONFIG_KEY_'+index]='http.https://github.com/.extraheader';
  env['GIT_CONFIG_VALUE_'+index]='AUTHORIZATION: basic '+Buffer.from('x-access-token:'+token).toString('base64');
 }
 return env;
}
function ensureCommit(state,commit){
 assert.ok([R7_PUBLICATION_COMMIT_V113,R7_RUNTIME_COMMIT_V113].includes(commit));
 try{assert.equal(objectSha('commit',git(state.root,['cat-file','commit',commit])),commit);return;}
 catch{
  // A shallow checkout may omit either immutable commit. Only the private Git is written.
  git(state.root,['fetch','--no-tags','--no-write-fetch-head','--filter=blob:none','--depth=1',ORIGIN,commit],{env:fetchEnvironment()});
  assert.equal(objectSha('commit',git(state.root,['cat-file','commit',commit])),commit,'Fetched R7 commit differs');
  state.fetchedCommits.push(commit);
 }
}
async function initializeGit(state,objectRepository){
 git(state.root,['-c','init.defaultBranch=r7-history','init','--quiet']);
 git(state.root,['config','remote.origin.url',ORIGIN]);
 Object.assign(state,await attachHistoricalGitObjects({root:state.root,objectRepository}));
 ensureCommit(state,R7_PUBLICATION_COMMIT_V113);ensureCommit(state,R7_RUNTIME_COMMIT_V113);
 assert.equal(git(state.root,['rev-parse',R7_PUBLICATION_COMMIT_V113+'^{tree}']).toString().trim(),R7_PUBLICATION_TREE_V113);
 const source=treeEntries(state.root,R7_PUBLICATION_COMMIT_V113);
 for(const row of state.manifest.entries){
  assert.deepEqual(source.get(row.path),{mode:'100644',type:'blob',blob:row.gitBlobSha},'R7 input differs from pinned publication tree: '+row.path);
 }
 const head=path.join(state.root,'.git/HEAD');await fs.writeFile(head,R7_PUBLICATION_COMMIT_V113+'\n');await fs.chmod(head,0o444);
}
function prefetchPinnedBlobs(state){
 // initializeGit already matched every manifest identity to the pinned tree.
 // Matching current files need no Git transfer. Probe the remaining identities
 // without lazy fetching, then request only absent blobs in one private fetch.
 const required=[...new Set(state.manifest.entries.filter((row,index)=>
  !matches(state.observedCurrent[index].current,row)).map(row=>row.gitBlobSha))].sort();
 if(!required.length)return;
 const input=required.join('\n')+'\n';
 const objects=git(state.root,['cat-file','--batch-check=%(objectname) %(objecttype)'],{input}).toString().trim().split('\n');
 assert.equal(objects.length,required.length,'R7 blob availability inventory differs');
 const missing=[];
 for(const [index,line]of objects.entries()){
  if(line===required[index]+' missing')missing.push(required[index]);
  else assert.equal(line,required[index]+' blob','R7 preimage is not the expected blob');
 }
 if(!missing.length)return;
 assert.ok(Date.now()<state.deadline,'R7 preparation time bound exceeded');
 git(state.root,['fetch','--no-tags','--no-write-fetch-head','--filter=blob:none','--stdin',ORIGIN],
  {input:missing.join('\n')+'\n',env:fetchEnvironment()});
 const fetched=git(state.root,['cat-file','--batch-check=%(objectname) %(objecttype)'],
  {input:missing.join('\n')+'\n'}).toString().trim().split('\n');
 assert.deepEqual(fetched,missing.map(blob=>blob+' blob'),'R7 prefetched preimages are unavailable');
 state.prefetchedPinnedGitBlobs=missing.length;state.blobFetchBatches++;
}
export async function prepareR7PublicationV113({repository=ROOT,objectRepository=repository}={}){
 assertNoExternalGitPathOverrides();
 repository=await fs.realpath(repository);objectRepository=await fs.realpath(objectRepository);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-r7-publication-v113-'));
 const state={root,repository,manifest:await readR7PublicationManifestV113(),copiedCurrent:0,restoredGit:0,fetchedCommits:[],observedCurrent:[],prefetchedPinnedGitBlobs:0,blobFetchBatches:0,deadline:Date.now()+480000};
 try{
  await initializeGit(state,objectRepository);
  for(const row of state.manifest.entries){
   assert.ok(Date.now()<state.deadline,'R7 preparation time bound exceeded');
   const current=await regularPath(repository,row.path)?await fingerprint(repository,row.path):null;
   state.observedCurrent.push({path:row.path,current});
  }
  prefetchPinnedBlobs(state);
  for(const [index,row]of state.manifest.entries.entries()){
   assert.ok(Date.now()<state.deadline,'R7 preparation time bound exceeded');
   const target=path.join(root,row.path);await fs.mkdir(path.dirname(target),{recursive:true});
   const current=state.observedCurrent[index].current;
   if(current&&matches(current,row)){
    await fs.copyFile(path.join(repository,row.path),target,constants.COPYFILE_FICLONE);state.copiedCurrent++;
   }else{
    // All required preimages are now local. Keep lazy fetch disabled so a
    // missing object fails instead of restarting one network request per row.
    const bytes=git(root,['cat-file','blob',row.gitBlobSha]);
    assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(objectSha('blob',bytes),row.gitBlobSha);
    await fs.writeFile(target,bytes);state.restoredGit++;
   }
   await fs.chmod(target,0o444);await verifyRow(root,row);
  }
  const lock=state.manifest.entries.find(row=>row.path==='package-lock.json');
  assert.ok(matches(state.observedCurrent.find(row=>row.path===lock.path).current,lock),'R7 dependencies require the exact installed package lockfile');
  state.nodeModules=await fs.realpath(path.join(repository,'node_modules'));
  await fs.symlink(state.nodeModules,path.join(root,'node_modules'),'dir');
  const context={root,repository,sourceCommit:R7_PUBLICATION_COMMIT_V113,runtimeCommit:R7_RUNTIME_COMMIT_V113,
   dispose:()=>fs.rm(root,{recursive:true,force:true})};
  contexts.set(context,state);await verifyR7PublicationV113(context);return context;
 }catch(error){await fs.rm(root,{recursive:true,force:true});throw error;}
}
function contextState(context){
 const state=contexts.get(context);assert.ok(state,'Unrecognized R7 historical context');
 assert.equal(context.root,state.root,'R7 historical context root changed');assert.equal(context.repository,state.repository,'R7 historical context repository changed');
 assert.equal(context.sourceCommit,R7_PUBLICATION_COMMIT_V113,'R7 historical context source changed');
 assert.equal(context.runtimeCommit,R7_RUNTIME_COMMIT_V113,'R7 historical context runtime changed');return state;
}
async function verifyInventory(state){
 const expected=new Set(state.manifest.entries.map(row=>row.path));
 async function walk(relative){
  const directory=path.join(state.root,relative);
  for(const item of await fs.readdir(directory,{withFileTypes:true})){
   const file=relative+'/'+item.name;assert.ok(!item.isSymbolicLink(),'R7 historical directory contains a symlink: '+file);
   if(item.isDirectory())await walk(file);else assert.ok(item.isFile()&&expected.has(file),'Unexpected R7 historical input: '+file);
  }
 }
 for(const directory of ['app','scripts','tests','docs','public','art-source']){
  const stat=await fs.lstat(path.join(state.root,directory));assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),'R7 directory must be private: '+directory);await walk(directory);
 }
}
export async function verifyR7PublicationV113(context){
 const state=contextState(context),root=state.root;
 const gitStat=await fs.lstat(path.join(root,'.git'));assert.ok(gitStat.isDirectory()&&!gitStat.isSymbolicLink(),'R7 Git must be private');
 const head=await fs.lstat(path.join(root,'.git/HEAD'));assert.ok(head.isFile()&&!head.isSymbolicLink()&&(head.mode&0o222)===0,'R7 HEAD must be a private read-only file');
 assert.equal(await fs.readFile(path.join(root,'.git/HEAD'),'utf8'),R7_PUBLICATION_COMMIT_V113+'\n','R7 historical HEAD changed');
 if(state.alternate){
  const alternate=await fs.lstat(state.alternate.path);assert.ok(alternate.isFile()&&!alternate.isSymbolicLink(),'R7 object alternate must be private');
  assert.equal(await fs.readFile(state.alternate.path,'utf8'),state.alternate.bytes,'R7 object alternate changed');
 }
 for(const commit of [R7_PUBLICATION_COMMIT_V113,R7_RUNTIME_COMMIT_V113])
  assert.equal(objectSha('commit',git(root,['cat-file','commit',commit])),commit,'R7 historical commit object changed');
 assert.equal(objectSha('tree',git(root,['cat-file','tree',R7_PUBLICATION_TREE_V113])),R7_PUBLICATION_TREE_V113,'R7 historical tree object changed');
 assert.equal(git(root,['rev-parse','HEAD^{tree}']).toString().trim(),R7_PUBLICATION_TREE_V113,'R7 publication tree changed');
 for(const pin of state.manifest.pins)await verifyRow(root,pin);
 const snapshot=JSON.parse(await fs.readFile(path.join(root,'docs/v112-homeworld-followup.json')));
 const freeze=JSON.parse(await fs.readFile(path.join(root,'docs/v112-runtime-freeze.json')));
 assert.equal(snapshot.inputs.length,1891);assert.equal(freeze.files,1649);assert.equal(freeze.entries.length,1649);
 const expected=new Map(state.manifest.entries.map(row=>[row.path,row]));
 for(const row of [...snapshot.inputs,...freeze.entries])assert.deepEqual(identity(expected.get(row.path)),row,'R7 manifest does not cover the original publication');
 const runtime=treeEntries(root,R7_RUNTIME_COMMIT_V113);
 for(const row of freeze.entries)assert.deepEqual(runtime.get(row.path),{mode:'100644',type:'blob',blob:expected.get(row.path).gitBlobSha},'R7 runtime Git input differs: '+row.path);
 await verifyInventory(state);
 for(const row of state.manifest.entries)await verifyRow(root,row);
 assert.equal(await fs.realpath(path.join(root,'node_modules')),state.nodeModules,'R7 dependencies changed');
 return{sourceCommit:R7_PUBLICATION_COMMIT_V113,sourceTree:R7_PUBLICATION_TREE_V113,runtimeCommit:R7_RUNTIME_COMMIT_V113,
  buildId:R7_BUILD_ID_V113,publicationInputs:1891,frozenInputs:1649,publicationRegularFiles:1894,
  originalTestFixtureFiles:1,privateRegularFiles:1895,
  copiedMatchingCurrentFiles:state.copiedCurrent,restoredPinnedGitFiles:state.restoredGit,
  prefetchedPinnedGitBlobs:state.prefetchedPinnedGitBlobs,blobFetchBatches:state.blobFetchBatches,
  fetchedCanonicalCommits:[...state.fetchedCommits],currentRuntimeCovered:false};
}
export async function verifyR7CurrentInputsUnchangedV113(context){
 const state=contextState(context);
 for(const row of state.observedCurrent){
  const current=await regularPath(state.repository,row.path)?await fingerprint(state.repository,row.path):null;
  assert.deepEqual(current,row.current,'Current input changed while preserving R7: '+row.path);
 }
 return{currentInputsUnchanged:state.observedCurrent.length};
}
function originalCommand(state,args){
 assertNoExternalGitPathOverrides();
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const timeout=Math.min(300000,state.deadline-Date.now());assert.ok(timeout>0,'R7 execution time bound exceeded');
 try{return execFileSync(process.execPath,args,{cwd:state.root,env,encoding:'utf8',timeout,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});}
 catch(error){const failure=Error('Original R7 command failed: '+args.join(' '));failure.stdout=error.stdout;failure.stderr=error.stderr;throw failure;}
}
export async function runR7PublicationV113(context){
 assertNoExternalGitPathOverrides();
 const state=contextState(context);await verifyR7PublicationV113(context);
 const output=originalCommand(state,['--experimental-strip-types','--test','--test-reporter=tap','--test-concurrency=1',ORIGINAL_TEST]);
 for(const [name,count]of [['tests',9],['pass',9],['fail',0],['skipped',0],['cancelled',0]])assert.match(output,new RegExp('^# '+name+' '+count+'(?:\\r?$)','m'));
 const cli=COMMANDS.map(args=>{
  const stdout=originalCommand(state,args),result=JSON.parse(stdout.trim().split(/\r?\n/).at(-1));return{args:[...args],result,stdout};
 });
 assert.equal(cli[0].result.status,'PASS');assert.equal(cli[1].result.status,'PASS');assert.equal(cli[1].result.bytes,14024);
 assert.equal(cli[2].result.result,'PASS_STRUCTURE');assert.equal(cli[2].result.bytes,9433700);
 assert.equal(cli[2].result.sha256,'723cc894b643d55dcd076cab8b615866c6879ecc481c55616adcdd0508d2eccc');
 const integrity=await verifyR7PublicationV113(context),current=await verifyR7CurrentInputsUnchangedV113(context);
 return{status:'PASS_HISTORICAL_R7_PUBLICATION',...integrity,...current,originalAssertions:9,originalTestsExecuted:true,
  originalCommandsExecuted:3,originalTestOutput:output,commands:cli,runtimeBrowserEvidenceReexecuted:false,nativeExcelExecuted:false};
}
export async function checkR7PublicationV113(options){
 const context=await prepareR7PublicationV113(options);
 try{return await runR7PublicationV113(context);}finally{await context.dispose();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);assert.ok(args.includes('--check')&&args.every(arg=>['--check','--tests'].includes(arg))&&new Set(args).size===args.length,
  'Usage: node scripts/check-homeworld-publication-history-v112-r7.mjs --check [--tests]');
 try{console.log(JSON.stringify(await checkR7PublicationV113()));}
 catch(error){if(error.stdout)process.stdout.write(error.stdout);if(error.stderr)process.stderr.write(error.stderr);throw error;}
}
