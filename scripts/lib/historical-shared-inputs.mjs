/** Restore explicitly reviewed shared preimages without rewriting current evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {attachHistoricalGitObjects,fetchHistoricalGitBlobs,historicalGitEnvironment,historicalGitFailure} from './historical-git.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const local=file=>typeof file==='string'&&file.length&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.includes('\0')&&
 file.split('/').every(part=>part&&part!=='.'&&part!=='..');
const environment=historicalGitEnvironment;
function git(root,args,env){
 try{return execFileSync('git',['-C',root,...args],{env,timeout:45000,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}
 catch(error){throw historicalGitFailure(error,{operation:args[0],label:'Historical shared preimage',env});}
}

export function reviewedSharedPreimages(preimages,shared){
 assert.ok(Array.isArray(preimages),'Reviewed historical shared preimages required');
 const inventory=new Map(shared.map(row=>[row.path,row])),seen=new Set();
 return preimages.map(row=>{
  assert.ok(local(row.path)&&inventory.has(row.path),'Unreviewed historical shared path');
  assert.ok(!seen.has(row.path),'Duplicate historical shared preimage');seen.add(row.path);
  assert.match(row.gitBlobSha??'',/^[a-f0-9]{40}$/,'Pinned historical shared blob required');
  return {...inventory.get(row.path),gitBlobSha:row.gitBlobSha};
 });
}

export function verifyHistoricalSharedTree({root,sourceCommit,rows}){
 if(!rows.length)return;
 assert.match(sourceCommit,/^[a-f0-9]{40}$/,'Pinned historical source commit required');
 const tree=git(root,['ls-tree','-r','-z',sourceCommit,'--',...rows.map(row=>row.path)],environment()).toString('utf8');
 const entries=new Map(tree.split('\0').filter(Boolean).map(line=>{
  const match=/^100644 blob ([a-f0-9]{40})\t(.+)$/.exec(line);
  assert.ok(match,'Historical shared preimage must be a regular Git blob');
  return[match[2],match[1]];
 }));
 assert.equal(entries.size,rows.length,'Historical shared tree inventory differs');
 for(const row of rows)assert.equal(entries.get(row.path),row.gitBlobSha,'Historical shared blob differs from pinned tree: '+row.path);
}

/** The frozen capsule supplies the original commit/tree objects. Only the
 * reviewed missing blobs are fetched, in one batch, into a separate private Git
 * store. Neither the capsule's frozen Git files nor the current clone are edited.
 */
export async function restoreHistoricalSharedPreimages({root,repository,sourceCommit,preimages,shared}){
 const rows=reviewedSharedPreimages(preimages,shared);
 if(!rows.length)return{rows:[],current:[],requestedBlobs:0,fetchedBlobs:0};
 verifyHistoricalSharedTree({root,sourceCommit,rows});
 const env=environment();
 const current=[];
 for(const row of rows){
  const file=path.join(repository,row.path),stat=await fs.lstat(file);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Current evidence must remain a regular file: '+row.path);
  const bytes=await fs.readFile(file);current.push({path:row.path,bytes:bytes.length,sha256:sha(bytes)});
 }
 const store=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-shared-preimages-'));
 try{
  git(store,['init','--quiet'],env);
  await attachHistoricalGitObjects({root:store,objectRepository:repository});
  const origin=git(repository,['remote','get-url','origin'],env).toString('utf8').trim();
  assert.match(origin,/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)darknigthmare\/yautja-la-longue-chasse(?:\.git)?$/,
   'Historical shared retrieval requires the original repository');
  // This new batch contains 98.6 MB of reviewed publication evidence. Its
  // network bound does not change any original test or CLI execution timeout.
  const fetchStarted=performance.now();
  const fetched=fetchHistoricalGitBlobs({root:store,origin,blobShas:rows.map(row=>row.gitBlobSha),env,timeout:120000,label:'Historical shared preimages'});
  const retrievalMilliseconds=Math.round(performance.now()-fetchStarted);
  for(const row of rows){
   const bytes=git(store,['cat-file','blob',row.gitBlobSha],env);
   assert.equal(bytes.length,row.bytes,'Historical shared preimage size changed: '+row.path);
   assert.equal(sha(bytes),row.sha256,'Historical shared preimage SHA256 changed: '+row.path);
   const target=path.join(root,row.path);await fs.mkdir(path.dirname(target),{recursive:true});
   await fs.writeFile(target,bytes,{mode:0o444,flag:'wx'});
  }
  const result={rows,current,...fetched,retrievalMilliseconds};
  await verifyHistoricalSharedPreimages({root,repository,...result});
  return result;
 }finally{await fs.rm(store,{recursive:true,force:true});}
}

export async function verifyHistoricalSharedPreimages({root,repository,rows,current}){
 for(const row of rows){
  const target=path.join(root,row.path),stat=await fs.lstat(target);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Historical shared preimage must be private: '+row.path);
  assert.equal(stat.mode&0o222,0,'Historical shared preimage is writable: '+row.path);
  const bytes=await fs.readFile(target);
  assert.equal(bytes.length,row.bytes,'Historical shared preimage size changed: '+row.path);
  assert.equal(sha(bytes),row.sha256,'Historical shared preimage SHA256 changed: '+row.path);
  const source=await fs.stat(path.join(repository,row.path));
  assert.ok(stat.ino!==source.ino||stat.dev!==source.dev,'Historical shared preimage aliases current evidence: '+row.path);
 }
 for(const row of current){
  const file=path.join(repository,row.path),stat=await fs.lstat(file);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Current evidence is no longer regular: '+row.path);
  const bytes=await fs.readFile(file);
  assert.equal(bytes.length,row.bytes,'Current evidence size changed during historical verification: '+row.path);
  assert.equal(sha(bytes),row.sha256,'Current evidence SHA256 changed during historical verification: '+row.path);
 }
}
