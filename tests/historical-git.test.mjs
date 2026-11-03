import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {attachHistoricalGitObjects,fetchHistoricalGitBlobs,historicalGitFailure,assertNoExternalGitPathOverrides,historicalGitEnvironment} from '../scripts/lib/historical-git.mjs';

const env=historicalGitEnvironment();
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

async function snapshot(directory){
 const entries=[];
 async function walk(relative=''){
  for(const name of (await fs.readdir(path.join(directory,relative))).sort()){
   const file=path.join(relative,name),absolute=path.join(directory,file),stat=await fs.lstat(absolute);
   if(stat.isDirectory()){entries.push([file,'directory',stat.mode]);await walk(file);}
   else if(stat.isSymbolicLink())entries.push([file,'symlink',await fs.readlink(absolute)]);
   else entries.push([file,'file',stat.mode,createHash('sha256').update(await fs.readFile(absolute)).digest('hex')]);
  }
 }
 await walk();return entries;
}

test('R7, V112, V113 and their child entry points reject external Git overrides before any private or external write',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'historical-git-isolation-'));
 try{
  const external=path.join(directory,'external'),capsules=path.join(directory,'capsules');
  await fs.mkdir(external);await fs.mkdir(capsules);git(external,['init','--quiet']);
  git(external,['config','user.name','Historical isolation fixture']);git(external,['config','user.email','history@example.test']);
  git(external,['config','remote.origin.url','file:///unchanged-external-origin']);
  await fs.writeFile(path.join(external,'input'),'outside capsule');git(external,['add','input']);git(external,['commit','--quiet','-m','outside capsule']);
  const before=await snapshot(external),gitDir=path.join(external,'.git');
  const overrides=[
   {GIT_DIR:gitDir,GIT_WORK_TREE:external},{GIT_DIR:''},{GIT_WORK_TREE:external},{GIT_COMMON_DIR:gitDir},
   {GIT_INDEX_FILE:path.join(gitDir,'index')},{GIT_OBJECT_DIRECTORY:path.join(gitDir,'objects')},
   {GIT_ALTERNATE_OBJECT_DIRECTORIES:path.join(gitDir,'objects')},{GIT_SHALLOW_FILE:path.join(gitDir,'shallow')},
   {GIT_GRAFT_FILE:path.join(gitDir,'info/grafts')},{GIT_QUARANTINE_PATH:path.join(gitDir,'objects')},
   {GIT_CONFIG:path.join(gitDir,'config')},{GIT_CONFIG_GLOBAL:path.join(gitDir,'config')},
   {GIT_CONFIG_SYSTEM:path.join(gitDir,'config')},{GIT_TEMPLATE_DIR:gitDir},
   {GIT_CONFIG_PARAMETERS:"'core.worktree="+external+"'"},
   {GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'core.worktree',GIT_CONFIG_VALUE_0:external},
   {GIT_CONFIG_KEY_0:'include.path'},{GIT_CONFIG_VALUE_0:'fixture-private-config-value'},
  ];
  const child=`
   import assert from 'node:assert/strict';
   import {prepareR7PublicationV113,runR7PublicationV113} from ${JSON.stringify(new URL('../scripts/check-homeworld-publication-history-v112-r7.mjs',import.meta.url).href)};
   import {prepareHuntSourceHistoryV112,runHuntSourceHistoryV112} from ${JSON.stringify(new URL('../scripts/check-hunt-integration-source-history-v112.mjs',import.meta.url).href)};
   import {prepareProductionHistoryV113,runProductionHistoryV113} from ${JSON.stringify(new URL('../scripts/check-production-history-v113.mjs',import.meta.url).href)};
   import {attachHistoricalGitObjects,fetchHistoricalGitBlobs} from ${JSON.stringify(new URL('../scripts/lib/historical-git.mjs',import.meta.url).href)};
   const repository=process.argv[1],root=process.argv[2],options={repository,objectRepository:repository};
   for(const run of [
    ()=>prepareR7PublicationV113(options),()=>prepareHuntSourceHistoryV112(options),()=>prepareProductionHistoryV113(options),
    ()=>runR7PublicationV113({}),()=>runHuntSourceHistoryV112({}),()=>runProductionHistoryV113({}),
    ()=>attachHistoricalGitObjects({root,objectRepository:repository}),
    async()=>fetchHistoricalGitBlobs({root,origin:'file:///unchanged-origin',blobShas:['a'.repeat(40)]}),
   ])await assert.rejects(run,error=>{
    assert.equal(error.code,'ERR_HISTORICAL_GIT_PATH_OVERRIDE');
    for(const value of [repository,process.env.GH_TOKEN,process.env.GITHUB_TOKEN,'fixture-private-config-value'])
     assert.equal(error.message.includes(value),false,'Only variable names may appear in the refusal');
    return true;
   });
  `;
  for(const override of overrides){
   const result=spawnSync(process.execPath,['--input-type=module','--eval',child,external,capsules],{
    env:{...env,TMPDIR:capsules,GH_TOKEN:'fixture-private-token',GITHUB_TOKEN:'fixture-private-token',...override},
    encoding:'utf8',timeout:10000,maxBuffer:128*1024,
   });
   assert.equal(result.status,0,'Refusal failed for '+Object.keys(override).join(', ')+': '+result.stderr);
   assert.deepEqual(await snapshot(external),before,'External Git config, index, refs, objects and worktree must stay byte-exact');
   assert.deepEqual(await fs.readdir(capsules),[],'Refuse before creating a private capsule');
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('explicit fetch authentication remains process-local after inherited Git configuration is refused',async()=>{
 const token='fixture-explicit-fetch-token',basic=Buffer.from('x-access-token:'+token).toString('base64');
 assert.doesNotThrow(()=>assertNoExternalGitPathOverrides({GH_TOKEN:token,GITHUB_TOKEN:token}));
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'historical-git-auth-'));
 try{
  git(directory,['init','--quiet']);const before=await snapshot(directory);
  // R7/V113 add these only to the checked fetch env, never to process.env.
  const fetchEnv={...historicalGitEnvironment(),GH_TOKEN:token,GIT_CONFIG_COUNT:'1',
   GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:'AUTHORIZATION: basic '+basic};
  const header=execFileSync('git',['-C',directory,'config','--get','http.https://github.com/.extraheader'],{
   env:fetchEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:10000,
  }).trim();
  assert.equal(header,'AUTHORIZATION: basic '+basic);
  assert.deepEqual(fetchHistoricalGitBlobs({root:directory,origin:'file:///unused',blobShas:[],env:fetchEnv}),
   {requestedBlobs:0,fetchedBlobs:0});
  for(const override of [{GIT_DIR:path.join(directory,'.git')},{GIT_CONFIG_KEY_0:'core.worktree'},
   {GIT_CONFIG_KEY_1:'include.path',GIT_CONFIG_VALUE_1:directory}]){
   assert.throws(()=>fetchHistoricalGitBlobs({root:directory,origin:'file:///unused',blobShas:['a'.repeat(40)],env:{...fetchEnv,...override}}),
    error=>error.code==='ERR_HISTORICAL_GIT_PATH_OVERRIDE'&&!error.message.includes(token)&&!error.message.includes(directory));
  }
  assert.deepEqual(await snapshot(directory),before,'Authentication must not be written to Git config or the checkout');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('promised blobs in a shallow alternate are fetched once without assuming its commits contain every blob',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'historical-git-promised-blobs-'));
 try{
  const origin=path.join(directory,'origin');await fs.mkdir(origin);git(origin,['init','--quiet']);
  git(origin,['config','user.name','Historical Git fixture']);git(origin,['config','user.email','history@example.test']);
  git(origin,['config','uploadpack.allowFilter','true']);
  const contents=['already present\n','first absent historical blob\n','second absent historical blob\n'];
  for(const [index,content]of contents.entries())await fs.writeFile(path.join(origin,'input-'+index),content);
  git(origin,['add','.']);git(origin,['commit','--quiet','-m','pinned inputs']);
  const commit=git(origin,['rev-parse','HEAD']),blobs=contents.map((_,index)=>git(origin,['rev-parse','HEAD:input-'+index]));
  const source=path.join(directory,'source');
  git(directory,['clone','--quiet','--bare','--depth=1','--filter=blob:none','file://'+origin,source]);
  const sourceBefore=await snapshot(source);
  const privateRoot=path.join(directory,'private');await fs.mkdir(privateRoot);git(privateRoot,['init','--quiet']);
  git(privateRoot,['config','remote.origin.url','file://'+origin]);
  await attachHistoricalGitObjects({root:privateRoot,objectRepository:source});
  await fs.writeFile(path.join(privateRoot,'.git/HEAD'),commit+'\n');
  const head=await fs.readFile(path.join(privateRoot,'.git/HEAD')),refs=git(privateRoot,['for-each-ref']);
  const stored=execFileSync('git',['-C',privateRoot,'hash-object','-w','--stdin'],{env,input:contents[0],encoding:'utf8'}).trim();
  assert.equal(stored,blobs[0]);
  for(const object of blobs.slice(1))assert.equal(spawnSync('git',['-C',privateRoot,'cat-file','-e',object],{env,stdio:'ignore'}).status,1);

  const trace=path.join(directory,'fetch-trace.jsonl'),fetchEnv={...env,GIT_TRACE2_EVENT:trace};
  assert.deepEqual(fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:[...blobs,blobs[1]],env:fetchEnv}),
   {requestedBlobs:3,fetchedBlobs:2});
  for(const [index,object]of blobs.entries())assert.equal(git(privateRoot,['cat-file','blob',object]),contents[index].trim());
  assert.deepEqual(fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:blobs,env:fetchEnv}),
   {requestedBlobs:3,fetchedBlobs:0});
  const fetches=(await fs.readFile(trace,'utf8')).trim().split('\n').map(line=>JSON.parse(line))
   .filter(event=>event.event==='start'&&event.argv?.includes('fetch'));
  assert.equal(fetches.length,1,'Multiple promised blobs need exactly one fetch; rechecking them needs none');
  assert.throws(()=>fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:[commit]}),/does not name a blob/);
  assert.throws(()=>fetchHistoricalGitBlobs({root:privateRoot,origin:'file://'+origin,blobShas:['untrusted-ref']}),/Invalid historical blob identity/);
  assert.deepEqual(await fs.readFile(path.join(privateRoot,'.git/HEAD')),head);
  assert.equal(git(privateRoot,['for-each-ref']),refs);
  await assert.rejects(fs.stat(path.join(privateRoot,'.git/FETCH_HEAD')),{code:'ENOENT'});
  assert.deepEqual(await snapshot(source),sourceBefore,'The alternate repository must remain byte-exact');
  for(const object of blobs)assert.equal(spawnSync('git',['-C',source,'cat-file','-e',object],{env,stdio:'ignore'}).status,1);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
