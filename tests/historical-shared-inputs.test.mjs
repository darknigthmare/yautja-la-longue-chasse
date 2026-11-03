import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {restoreHistoricalSharedPreimages,verifyHistoricalSharedPreimages} from '../scripts/lib/historical-shared-inputs.mjs';
import {createHistoricalExcelContext} from '../scripts/lib/historical-excel-context.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function fixture(t){
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-shared-preimages-test-'));
 t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const repository=path.join(base,'current'),root=path.join(base,'capsule');
 await fs.mkdir(repository);await fs.mkdir(root);
 git(repository,['init','-q']);
 git(repository,['remote','add','origin','https://github.com/darknigthmare/yautja-la-longue-chasse.git']);
 const originals={'docs/workbook.xlsx':'original published workbook','docs/qa/frame.png':'original published frame'};
 for(const [relative,bytes] of Object.entries(originals)){
  const target=path.join(repository,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
 }
 git(repository,['add','--','docs']);
 git(repository,['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=disabled-fixture-hooks','commit','-q','-m','original publication']);
 const sourceCommit=git(repository,['rev-parse','HEAD']);
 const shared=Object.entries(originals).map(([relative,bytes])=>({path:relative,bytes:Buffer.byteLength(bytes),sha256:sha(bytes)}));
 const preimages=shared.map(row=>({path:row.path,gitBlobSha:git(repository,['rev-parse',sourceCommit+':'+row.path])}));
 await fs.writeFile(path.join(repository,'docs/workbook.xlsx'),'later publication remains current');
 git(root,['init','-q']);
 await fs.cp(path.join(repository,'.git/objects'),path.join(root,'.git/objects'),{recursive:true});
 await fs.writeFile(path.join(root,'.git/HEAD'),sourceCommit+'\n');
 for(const relative of ['.git/HEAD','.git/config'])await fs.chmod(path.join(root,relative),0o444);
 const frozenGit=await Promise.all(['.git/HEAD','.git/config'].map(async relative=>({path:relative,bytes:await fs.readFile(path.join(root,relative))})));
 return{root,repository,sourceCommit,preimages,shared,originals,frozenGit};
}

test('reviewed shared inputs restore original private bytes while preserving current evidence and frozen Git',async t=>{
 const f=await fixture(t),result=await restoreHistoricalSharedPreimages(f);
 assert.equal(result.rows.length,2);assert.equal(result.requestedBlobs,2);assert.equal(result.fetchedBlobs,0);
 for(const [relative,bytes] of Object.entries(f.originals)){
  assert.equal(await fs.readFile(path.join(f.root,relative),'utf8'),bytes);
  const historical=await fs.lstat(path.join(f.root,relative)),current=await fs.stat(path.join(f.repository,relative));
  assert.equal(historical.mode&0o222,0);assert.equal(historical.isSymbolicLink(),false);
  assert.ok(historical.ino!==current.ino||historical.dev!==current.dev);
 }
 assert.equal(await fs.readFile(path.join(f.repository,'docs/workbook.xlsx'),'utf8'),'later publication remains current');
 for(const row of f.frozenGit)assert.deepEqual(await fs.readFile(path.join(f.root,row.path)),row.bytes);
 await verifyHistoricalSharedPreimages({...f,...result});
});

test('unreviewed paths, duplicate entries and blobs outside the frozen source tree cannot restore files',async t=>{
 const f=await fixture(t);
 for(const preimages of [
  [{path:'../outside',gitBlobSha:f.preimages[0].gitBlobSha}],
  [...f.preimages,f.preimages[0]],
  [{...f.preimages[0],gitBlobSha:f.preimages[1].gitBlobSha}],
 ])await assert.rejects(restoreHistoricalSharedPreimages({...f,preimages}),/historical shared|pinned tree/i);
 await assert.rejects(fs.stat(path.join(f.root,'docs/workbook.xlsx')),error=>error.code==='ENOENT');
 await assert.rejects(restoreHistoricalSharedPreimages({...f,shared:f.shared.map((row,index)=>index===0?{...row,sha256:'0'.repeat(64)}:row)}),/preimage SHA256 changed/);
});

test('every later verification rejects changed historical bytes, changed current evidence, links and aliases',async t=>{
 const f=await fixture(t),result=await restoreHistoricalSharedPreimages(f),verify=()=>verifyHistoricalSharedPreimages({...f,...result});
 const historical=path.join(f.root,'docs/workbook.xlsx'),current=path.join(f.repository,'docs/workbook.xlsx');
 await fs.chmod(historical,0o644);await fs.appendFile(historical,'!');await fs.chmod(historical,0o444);
 await assert.rejects(verify(),/preimage size changed/);
 await fs.chmod(historical,0o644);await fs.writeFile(historical,f.originals['docs/workbook.xlsx']);await fs.chmod(historical,0o444);
 await fs.appendFile(current,'!');await assert.rejects(verify(),/Current evidence size changed/);
 await fs.writeFile(current,'later publication remains current');
 await fs.unlink(historical);await fs.symlink(current,historical);await assert.rejects(verify(),/must be private/);
 await fs.unlink(historical);await fs.writeFile(historical,f.originals['docs/workbook.xlsx'],{mode:0o444});
 const frame=path.join(f.root,'docs/qa/frame.png'),currentFrame=path.join(f.repository,'docs/qa/frame.png');
 await fs.unlink(frame);await fs.chmod(currentFrame,0o444);await fs.link(currentFrame,frame);
 await assert.rejects(verify(),/aliases current evidence/);
});

test('only reviewed private fixture inputs retain Git0644 and permit disposable copy corruption',async t=>{
 const f=await fixture(t),files=[];
 await fs.writeFile(path.join(f.root,'.git/refs/heads/historical'),f.sourceCommit+'\n');
 async function capture(relative){
  const absolute=path.join(f.root,relative),stat=await fs.stat(absolute);
  if(stat.isDirectory())for(const name of await fs.readdir(absolute))await capture(relative+'/'+name);
  else {const bytes=await fs.readFile(absolute);files.push({path:relative,sha256:sha(bytes),bytes:bytes.length,base64:bytes.toString('base64')});}
 }
 for(const relative of ['.git/HEAD','.git/config','.git/objects','.git/refs'])await capture(relative);
 const frame=f.shared.find(row=>row.path==='docs/qa/frame.png'),pin=f.preimages.find(row=>row.path===frame.path);
 const archive=gzipSync(JSON.stringify({schemaVersion:1,sourceCommit:f.sourceCommit,files}));
 const manifest={schemaVersion:1,sourceCommit:f.sourceCommit,release:'Fixture',
  archive:{path:'capsule.json.gz',bytes:archive.length,sha256:sha(archive),uncompressedBytes:Buffer.byteLength(JSON.stringify({schemaVersion:1,sourceCommit:f.sourceCommit,files}))},
  sources:files.map(({path,sha256,bytes})=>({path,sha256,bytes})),shared:[frame],materializedShared:[frame.path],historicalTests:[]};
 const manifestBytes=Buffer.from(JSON.stringify(manifest));
 await fs.writeFile(path.join(f.repository,'capsule.json'),manifestBytes);await fs.writeFile(path.join(f.repository,'capsule.json.gz'),archive);
 await fs.mkdir(path.join(f.repository,'node_modules'));
 const config={repository:f.repository,manifestPath:'capsule.json',manifestSha256:sha(manifestBytes),archiveSha256:sha(archive),sourceCommit:f.sourceCommit,release:'Fixture'};
 await assert.rejects(createHistoricalExcelContext({...config,writableSharedCopies:[pin,pin]}).get(),/Duplicate/);
 await assert.rejects(createHistoricalExcelContext({...config,writableSharedCopies:[{...pin,gitBlobSha:f.preimages[0].gitBlobSha}]}).get(),/pinned tree/);
 const capsule=createHistoricalExcelContext({...config,writableSharedCopies:[pin]}),context=await capsule.get();
 t.after(()=>fs.rm(context.root,{recursive:true,force:true}));
 const input=path.join(context.root,frame.path),current=path.join(f.repository,frame.path),copy=path.join(f.repository,'disposable.png');
 assert.equal((await fs.stat(input)).mode&0o777,0o644);
 await fs.copyFile(input,copy);await fs.appendFile(copy,'corrupted only in disposable fixture');
 assert.equal(await fs.readFile(input,'utf8'),f.originals[frame.path]);
 assert.equal(await fs.readFile(current,'utf8'),f.originals[frame.path]);
 await capsule.verify();
 await fs.unlink(input);await fs.link(current,input);
 await assert.rejects(capsule.verify(),/aliases current evidence/);
});
