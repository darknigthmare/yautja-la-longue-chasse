import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {attachHistoricalGitObjects,fetchHistoricalGitBlobs,historicalGitFailure} from '../scripts/lib/historical-git.mjs';

const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1'};
const git=(root,args)=>execFileSync('git',['-C',root,...args],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

test('a private filtered fetch preserves a shallow alternate boundary and never writes to its source',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'historical-git-shallow-'));
 try{
  const origin=path.join(directory,'origin');await fs.mkdir(origin);git(origin,['init','--quiet']);
  git(origin,['config','user.name','Historical Git fixture']);git(origin,['config','user.email','history@example.test']);
  git(origin,['config','uploadpack.allowFilter','true']);
  const commits=[];
  for(let index=0;index<8;index++){
   await fs.writeFile(path.join(origin,'input'),'revision '+index);git(origin,['add','input']);git(origin,['commit','--quiet','-m','revision '+index]);
   commits.push(git(origin,['rev-parse','HEAD']));
  }
  const source=path.join(directory,'source');
  git(directory,['clone','--quiet','--bare','--depth=3','--filter=blob:none','file://'+origin,source]);
  const sourceHead=await fs.readFile(path.join(source,'HEAD')),sourceShallow=await fs.readFile(path.join(source,'shallow'));
  const sourceRefs=git(source,['show-ref']),sourcePacks=await fs.readdir(path.join(source,'objects/pack'));
  assert.equal(git(source,['rev-parse','--is-shallow-repository']),'true');

  const privateRoot=path.join(directory,'private');await fs.mkdir(privateRoot);git(privateRoot,['init','--quiet']);
  git(privateRoot,['config','remote.origin.url','file://'+origin]);
  const inherited=await attachHistoricalGitObjects({root:privateRoot,objectRepository:source});
  assert.deepEqual(inherited.inheritedShallowCommits,[commits[5]]);
  assert.equal(await fs.readFile(inherited.alternate.path,'utf8'),path.join(source,'objects')+'\n');
  assert.deepEqual(await fs.readFile(path.join(privateRoot,'.git/shallow')),sourceShallow);
  assert.equal((await fs.lstat(path.join(privateRoot,'.git/shallow'))).isSymbolicLink(),false);

  // This is the real transport and filter used by R7, with a local immutable
  // origin so the graph regression does not depend on network availability.
  git(privateRoot,['fetch','--no-tags','--no-write-fetch-head','--filter=blob:none','--depth=1','file://'+origin,commits[1]]);
  assert.equal(git(privateRoot,['cat-file','-t',commits[1]]),'commit');
  assert.equal(spawnSync('git',['-C',source,'cat-file','-e',commits[1]],{env,stdio:'ignore'}).status,1);
  assert.deepEqual(await fs.readFile(path.join(source,'HEAD')),sourceHead);
  assert.deepEqual(await fs.readFile(path.join(source,'shallow')),sourceShallow);
  assert.equal(git(source,['show-ref']),sourceRefs);
  assert.deepEqual(await fs.readdir(path.join(source,'objects/pack')),sourcePacks);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('historical Git diagnostics retain the transport cause and redact authentication',()=>{
 const token='fixture-private-token',basic=Buffer.from('x-access-token:'+token).toString('base64');
 const failure=historicalGitFailure({status:1,stderr:'fatal: bad object abc\n'+
  'https://user:other-secret@example.test/repo\nAuthorization: basic '+basic+'\nGH_TOKEN='+token},
 {operation:'fetch',label:'R7',env:{GH_TOKEN:token}});
 assert.match(failure.message,/R7 Git operation failed: fetch \(exit 1\)/);
 assert.match(failure.message,/fatal: bad object abc/);
 for(const secret of [token,basic,'other-secret'])assert.equal(failure.message.includes(secret),false);
 assert.match(failure.message,/\[REDACTED\]/);
});

test('missing pinned blobs use one private fetch without changing refs or refetching existing objects',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'historical-git-blobs-'));
 try{
  const origin=path.join(directory,'origin');await fs.mkdir(origin);git(origin,['init','--quiet']);
  git(origin,['config','user.name','Historical Git fixture']);git(origin,['config','user.email','history@example.test']);
  git(origin,['config','uploadpack.allowFilter','true']);
  const contents=['already present\n','first absent historical blob\n','second absent historical blob\n'];
  for(const [index,content] of contents.entries())await fs.writeFile(path.join(origin,'input-'+index),content);
  git(origin,['add','.']);git(origin,['commit','--quiet','-m','pinned inputs']);
  const commit=git(origin,['rev-parse','HEAD']),blobs=contents.map((_,index)=>git(origin,['rev-parse','HEAD:input-'+index]));
  const source=path.join(directory,'source');
  git(directory,['clone','--quiet','--bare','--depth=1','--filter=blob:none','file://'+origin,source]);
  const sourceHead=await fs.readFile(path.join(source,'HEAD')),sourceShallow=await fs.readFile(path.join(source,'shallow'));
  const sourceRefs=git(source,['show-ref']),sourcePacks=await fs.readdir(path.join(source,'objects/pack'));
  const privateRoot=path.join(directory,'private');await fs.mkdir(privateRoot);git(privateRoot,['init','--quiet']);
  git(privateRoot,['config','remote.origin.url','file://'+origin]);
  await attachHistoricalGitObjects({root:privateRoot,objectRepository:source});
  await fs.writeFile(path.join(privateRoot,'.git/HEAD'),commit+'\n');
  const head=await fs.readFile(path.join(privateRoot,'.git/HEAD')),refs=git(privateRoot,['for-each-ref']);
  const stored=execFileSync('git',['-C',privateRoot,'hash-object','-w','--stdin'],{env,input:contents[0],encoding:'utf8'}).trim();
  assert.equal(stored,blobs[0]);
  for(const object of blobs.slice(1))assert.equal(spawnSync('git',['-C',privateRoot,'cat-file','-e',object],{env,stdio:'ignore'}).status,1);

  const trace=path.join(directory,'fetch-trace.jsonl'),fetchEnv={...env,GIT_TRACE2_EVENT:trace};
  const result=fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:[...blobs,blobs[1]],env:fetchEnv});
  assert.deepEqual(result,{requestedBlobs:3,fetchedBlobs:2});
  for(const [index,object] of blobs.entries())assert.equal(git(privateRoot,['cat-file','blob',object]),contents[index].trim());
  assert.deepEqual(fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:blobs,env:fetchEnv}),
   {requestedBlobs:3,fetchedBlobs:0});
  const fetches=(await fs.readFile(trace,'utf8')).trim().split('\n').map(line=>JSON.parse(line))
   .filter(event=>event.event==='start'&&event.argv?.includes('fetch'));
  assert.equal(fetches.length,1,'Probing and restoring multiple missing blobs must perform one fetch');
  assert.equal(fetches[0].argv.includes('--stdin'),true);
  assert.throws(()=>fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:[commit]}),/does not name a blob/);
  assert.throws(()=>fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:['untrusted-ref']}),/Invalid historical blob identity/);
  assert.deepEqual(await fs.readFile(path.join(privateRoot,'.git/HEAD')),head);
  assert.equal(git(privateRoot,['for-each-ref']),refs);
  await assert.rejects(fs.stat(path.join(privateRoot,'.git/FETCH_HEAD')),{code:'ENOENT'});
  assert.deepEqual(await fs.readFile(path.join(source,'HEAD')),sourceHead);
  assert.deepEqual(await fs.readFile(path.join(source,'shallow')),sourceShallow);
  assert.equal(git(source,['show-ref']),sourceRefs);
  assert.deepEqual(await fs.readdir(path.join(source,'objects/pack')),sourcePacks);
  for(const object of blobs)assert.equal(spawnSync('git',['-C',source,'cat-file','-e',object],{env,stdio:'ignore'}).status,1);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
