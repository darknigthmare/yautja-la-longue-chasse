import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compactStaticFixtureV87,reclaimBuildFixtureV87} from '../scripts/compact-vercel-static-v87.mjs';

const runFile=promisify(execFile);
const project=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const privateBase=path.join(project,'work-local','v87');
const script=path.join(project,'scripts','compact-vercel-static-v87.mjs');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const isInside=(base,target)=>{const rel=path.relative(base,target);return rel!==''&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep);};

async function removeFixture(root){
 // Only our resolved, newly created workspace fixtures can be deleted. Remove
 // any deliberate escape-test junction itself before recursive cleanup.
 const absolute=path.resolve(root),base=await fs.realpath(privateBase);
 assert(isInside(base,absolute));assert(path.basename(absolute).startsWith('static-compaction-fixture-'));
 assert.equal(await fs.realpath(absolute),absolute);assert(!(await fs.lstat(absolute)).isSymbolicLink());
 async function unlinkTestLinks(dir){
  for(const name of await fs.readdir(dir)){
   const item=path.join(dir,name);assert(isInside(absolute,item));
   const stat=await fs.lstat(item);
   if(stat.isSymbolicLink()){
    try{await fs.unlink(item);}catch(error){if(error.code==='EPERM'||error.code==='EISDIR')await fs.rmdir(item);else throw error;}
   }else if(stat.isDirectory())await unlinkTestLinks(item);
  }
 }
 await unlinkTestLinks(absolute);
 assert.equal(await fs.realpath(absolute),absolute);
 await fs.rm(absolute,{recursive:true,force:true});
}

async function fixture(t){
 await fs.mkdir(privateBase,{recursive:true});
 const root=await fs.mkdtemp(path.join(privateBase,'static-compaction-fixture-'));
 assert(isInside(await fs.realpath(privateBase),root));assert.equal(await fs.realpath(root),root);
 t.after(()=>removeFixture(root));
 await fs.mkdir(path.join(root,'public'),{recursive:true});
 await fs.mkdir(path.join(root,'.next','output','static'),{recursive:true});
 await fs.mkdir(path.join(root,'.next','cache'),{recursive:true});
 await fs.writeFile(path.join(root,'.next','cache','keep.bin'),Buffer.from('cache-not-touched'));
 await fs.writeFile(path.join(root,'.next','output','config.json'),'unmodified-output-manifest');
 return root;
}

async function pair(root,name,sourceBytes,targetBytes=sourceBytes){
 const source=path.join(root,'public',name),target=path.join(root,'.next','output','static',name);
 await fs.mkdir(path.dirname(source),{recursive:true});await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(source,sourceBytes);await fs.writeFile(target,targetBytes);
 return{source,target};
}

test('the real CLI is a no-op outside the exact Linux Vercel build root, even with a forged flag',async t=>{
 const root=await fixture(t),files=await pair(root,'sprite.png',Buffer.from('original-native-pixels'));
 const before=await fs.stat(files.target,{bigint:true});
 const {stdout}=await runFile(process.execPath,[script],{cwd:root,env:{...process.env,VERCEL:'1',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)}});
 assert.equal(JSON.parse(stdout).status,'skipped');
 const after=await fs.stat(files.target,{bigint:true});
 assert.equal(after.ino,before.ino);assert.equal(after.nlink,before.nlink);
 assert.deepEqual(await fs.readFile(files.target),Buffer.from('original-native-pixels'));
 assert.notEqual((await fs.stat(files.source,{bigint:true})).ino,after.ino);
});

test('exact copies share the original inode and bytes while unrelated outputs/cache stay intact',async t=>{
 const root=await fixture(t),bytes=Buffer.from('native-content\0'.repeat(8192));
 const a=await pair(root,'game/imports/v87/exact.png',bytes);
 const b=await pair(root,'audio/cue.ogg',Buffer.from('sound-source'));
 const generated=path.join(root,'.next','output','static','_next','app.js');
 await fs.mkdir(path.dirname(generated),{recursive:true});await fs.writeFile(generated,'generated-route-bundle');
 const stamp=new Date('2020-01-02T03:04:05Z');await fs.utimes(a.source,stamp,stamp);
 const sourceBefore=await fs.stat(a.source,{bigint:true}),outputBefore=await fs.stat(a.target,{bigint:true});
 assert.notEqual(sourceBefore.ino,outputBefore.ino);
 const report=await compactStaticFixtureV87({fixtureRoot:root});
 assert.equal(report.linkedFiles,2);assert.equal(report.bytesSaved,bytes.length+Buffer.byteLength('sound-source'));
 for(const item of[a,b]){
  const original=await fs.stat(item.source,{bigint:true}),copy=await fs.stat(item.target,{bigint:true});
  assert.equal(copy.ino,original.ino);assert.equal(copy.dev,original.dev);assert(copy.nlink>=2n);
  assert.equal(copy.mode,original.mode);assert.deepEqual(await fs.readFile(item.source),await fs.readFile(item.target));
 }
 assert.equal((await fs.stat(a.source,{bigint:true})).mtimeNs,sourceBefore.mtimeNs);
 assert.equal(hash(await fs.readFile(a.source)),hash(bytes));
 assert.equal(await fs.readFile(generated,'utf8'),'generated-route-bundle');
 assert.equal(await fs.readFile(path.join(root,'.next','output','config.json'),'utf8'),'unmodified-output-manifest');
 assert.equal(await fs.readFile(path.join(root,'.next','cache','keep.bin'),'utf8'),'cache-not-touched');
 assert.equal((await compactStaticFixtureV87({fixtureRoot:root})).alreadyLinked,2);
});

test('same-length mismatches and differing sizes are preserved without linking or renaming',async t=>{
 const root=await fixture(t),wrongHash=await pair(root,'hash.png',Buffer.from('AAAA'),Buffer.from('BBBB'));
 const wrongSize=await pair(root,'size.png',Buffer.from('long-source'),Buffer.from('short'));
 const hashInode=(await fs.stat(wrongHash.target,{bigint:true})).ino,sizeInode=(await fs.stat(wrongSize.target,{bigint:true})).ino;
 const report=await compactStaticFixtureV87({fixtureRoot:root});
 assert.equal(report.linkedFiles,0);assert.equal(report.hashMismatches,1);assert.equal(report.sizeMismatches,1);
 assert.equal((await fs.stat(wrongHash.target,{bigint:true})).ino,hashInode);
 assert.equal((await fs.stat(wrongSize.target,{bigint:true})).ino,sizeInode);
 assert.equal(await fs.readFile(wrongHash.target,'utf8'),'BBBB');assert.equal(await fs.readFile(wrongSize.target,'utf8'),'short');
 assert.equal(await fs.readFile(wrongHash.source,'utf8'),'AAAA');
});

test('output symlink/junction escape is rejected before any valid copy is compacted',async t=>{
 const root=await fixture(t),outside=await fixture(t),valid=await pair(root,'valid.png',Buffer.from('native'));
 const outsideFile=path.join(outside,'public','keep.bin');await fs.writeFile(outsideFile,'outside-untouched');
 const escape=path.join(root,'.next','output','static','escape');
 await fs.symlink(path.join(outside,'public'),escape,process.platform==='win32'?'junction':'dir');
 const before=await fs.stat(valid.target,{bigint:true});
 await assert.rejects(compactStaticFixtureV87({fixtureRoot:root}),/symlinks|junctions/);
 assert.equal((await fs.stat(valid.target,{bigint:true})).ino,before.ino);
 assert.equal(await fs.readFile(outsideFile,'utf8'),'outside-untouched');
});

test('a public source symlink/junction also refuses external reads and replacements',async t=>{
 const root=await fixture(t),outside=await fixture(t);
 await fs.writeFile(path.join(outside,'public','sprite.png'),'outside-pixels');
 await fs.symlink(path.join(outside,'public'),path.join(root,'public','linked'),process.platform==='win32'?'junction':'dir');
 const target=path.join(root,'.next','output','static','linked','sprite.png');
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,'outside-pixels');
 const before=await fs.stat(target,{bigint:true});
 await assert.rejects(compactStaticFixtureV87({fixtureRoot:root}),/symlinks|junctions/);
 assert.equal((await fs.stat(target,{bigint:true})).ino,before.ino);
 assert.equal(await fs.readFile(path.join(outside,'public','sprite.png'),'utf8'),'outside-pixels');
});

test('failed hardlink creation keeps the original generated copy intact with no backup or residue',async t=>{
 const root=await fixture(t),bytes=Buffer.from('rollback-preserves-native');
 const files=await pair(root,'rollback.png',bytes),before=await fs.stat(files.target,{bigint:true});
 const report=await compactStaticFixtureV87({fixtureRoot:root,linkFile:async()=>{const error=new Error('simulated filesystem link failure');error.code='EXDEV';throw error;}});
 assert.equal(report.linkFailures,1);assert.equal(report.linkedFiles,0);assert.equal(report.bytesSaved,0);
 assert.equal((await fs.stat(files.target,{bigint:true})).ino,before.ino);
 assert.deepEqual(await fs.readFile(files.target),bytes);assert.deepEqual(await fs.readFile(files.source),bytes);
 assert.deepEqual(await fs.readdir(path.dirname(files.target)),['rollback.png']);
});

test('mode mismatch preserves output permissions, and arbitrary real project roots are refused',async t=>{
 const root=await fixture(t),files=await pair(root,'mode.png',Buffer.from('same-content'));
 if(process.platform!=='win32'){
  await fs.chmod(files.target,0o600);
  const report=await compactStaticFixtureV87({fixtureRoot:root});
  assert.equal(report.modeMismatches,1);assert.equal(report.linkedFiles,0);
  assert.equal((await fs.stat(files.target)).mode&0o777,0o600);
 }
 await assert.rejects(compactStaticFixtureV87({fixtureRoot:project}),/Only private/);
});

test('completed-build cleanup removes only compilation cache when free space suffices',async t=>{
 const root=await fixture(t),files=await pair(root,'sprite.png',Buffer.from('native'));
 await fs.mkdir(path.join(root,'.git','objects'),{recursive:true});
 await fs.writeFile(path.join(root,'.git','objects','pack-copy'),'recoverable-clone');
 await fs.writeFile(path.join(root,'.git','HEAD'),'retained-metadata');
 const result=await reclaimBuildFixtureV87({fixtureRoot:root,measure:async()=>1_000_000});
 assert.equal(result.cache.files,1);assert.equal(result.ephemeralClone.files,0);
 await assert.rejects(fs.stat(path.join(root,'.next','cache')),e=>e.code==='ENOENT');
 assert.equal(await fs.readFile(path.join(root,'.git','objects','pack-copy'),'utf8'),'recoverable-clone');
 assert.equal(await fs.readFile(files.source,'utf8'),'native');assert.equal(await fs.readFile(files.target,'utf8'),'native');
 assert.equal(await fs.readFile(path.join(root,'.next','output','config.json'),'utf8'),'unmodified-output-manifest');
});

test('space pressure may reclaim only copied clone objects; HEAD, sources and runtime outputs remain',async t=>{
 const root=await fixture(t),files=await pair(root,'sprite.png',Buffer.from('native'));
 await fs.mkdir(path.join(root,'.git','objects','pack'),{recursive:true});
 await fs.writeFile(path.join(root,'.git','objects','pack','temporary.pack'),'recoverable-clone-objects');
 await fs.writeFile(path.join(root,'.git','HEAD'),'preserved-head');await fs.writeFile(path.join(root,'.git','config'),'preserved-config');
 let call=0;const result=await reclaimBuildFixtureV87({fixtureRoot:root,measure:async()=>++call<3?0:1_000_000});
 assert.equal(result.ephemeralClone.files,1);assert.equal(result.ephemeralClone.bytes,25);
 await assert.rejects(fs.stat(path.join(root,'.git','objects')),e=>e.code==='ENOENT');
 assert.equal(await fs.readFile(path.join(root,'.git','HEAD'),'utf8'),'preserved-head');
 assert.equal(await fs.readFile(path.join(root,'.git','config'),'utf8'),'preserved-config');
 assert.equal(await fs.readFile(files.source,'utf8'),'native');assert.equal(await fs.readFile(files.target,'utf8'),'native');
});

test('cache escape is refused before any disposable file is removed, and real roots stay forbidden',async t=>{
 const root=await fixture(t),outside=await fixture(t);await pair(root,'sprite.png',Buffer.from('native'));
 const cache=path.join(root,'.next','cache'),escape=path.join(cache,'escape');
 await fs.symlink(path.join(outside,'public'),escape,process.platform==='win32'?'junction':'dir');
 await assert.rejects(reclaimBuildFixtureV87({fixtureRoot:root}),/symlinks|junctions/);
 assert.equal(await fs.readFile(path.join(cache,'keep.bin'),'utf8'),'cache-not-touched');
 await assert.rejects(reclaimBuildFixtureV87({fixtureRoot:project}),/Only private/);
});

test('clone-object symlink escape is refused and never touches external files',async t=>{
 const root=await fixture(t),outside=await fixture(t);await pair(root,'sprite.png',Buffer.from('native'));
 await fs.mkdir(path.join(root,'.git','objects'),{recursive:true});
 await fs.writeFile(path.join(outside,'public','keep.bin'),'external-original');
 await fs.symlink(path.join(outside,'public'),path.join(root,'.git','objects','escape'),process.platform==='win32'?'junction':'dir');
 await assert.rejects(reclaimBuildFixtureV87({fixtureRoot:root,measure:async()=>0}),/symlinks|junctions/);
 assert.equal(await fs.readFile(path.join(outside,'public','keep.bin'),'utf8'),'external-original');
});

test('insufficient space after disposable cleanup fails before any final static copy',async t=>{
 const root=await fixture(t),files=await pair(root,'sprite.png',Buffer.from('native'));
 await fs.mkdir(path.join(root,'.git','objects'),{recursive:true});
 await fs.writeFile(path.join(root,'.git','objects','pack-copy'),'recoverable-clone');
 await assert.rejects(reclaimBuildFixtureV87({fixtureRoot:root,measure:async()=>0}),/Final static copy requires/);
 assert.equal(await fs.readFile(files.source,'utf8'),'native');assert.equal(await fs.readFile(files.target,'utf8'),'native');
});
