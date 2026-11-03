import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import { gameBuildIdentity } from '../scripts/game-build-identity.ts';
import { productionBuildStepsV94 } from '../scripts/build-production-v94.mjs';
import { nativeOriginFixtureV89, nativeOriginDestinationV89, runNativeOriginV89, assertNativeOutputMountsV89, sourceLightOriginFixtureV89 } from '../scripts/vercel-native-origin-v89.mjs';
import { NATIVE_ASSET_MANIFEST_V1, createNativeAssetManifestV1, nativeAssetDestinationV1, readNativeAssetOriginV1, validateNativeAssetManifestV1 } from '../scripts/native-asset-origin-v1.mjs';
const run=promisify(execFile);
const project=process.cwd(),prefix='public/game/imports/v85';
test('every script actually invoked by the Vercel build is retained by its deployment allowlist',async()=>{
 const config=JSON.parse(await fs.readFile(path.join(project,'vercel.json'),'utf8'));
 const ignore=(await fs.readFile(path.join(project,'.vercelignore'),'utf8')).split(/\r?\n/).map(line=>line.trim());
 assert(ignore.includes('/scripts/*'));
 assert(ignore.includes('/public/game/imports/v85'),'Only the rewritten historical group is omitted at packaging time');
 assert(!ignore.some(line=>/^\/?public(?:\/game(?:\/imports(?:\/v(?:86|87|88|89))?)?)?$/.test(line)),'Other native groups stay included');
 assert.equal(config.buildCommand,'node scripts/build-production-v94.mjs');
 const paths=[
  'scripts/build-production-v94.mjs',
  ...productionBuildStepsV94(project,path.join(project,'node_modules/next/dist/bin/next'))
   .filter(step=>step.id!=='next').map(step=>path.relative(project,step.args[0]).split(path.sep).join('/')),
 ];
 assert(paths.includes('scripts/vercel-native-origin-v89.mjs'));
 for(const script of paths){
  assert(ignore.includes('!/'+script),'Deployment would omit '+script);
  assert((await fs.stat(path.join(project,script))).isFile());
 }
});
async function fixture(t){
 const root=path.join(project,'work-local','v89','native-origin-fixture-'+randomUUID());
 await fs.mkdir(path.join(root,prefix),{recursive:true});
 await fs.mkdir(path.join(root,'.next','output','static','game','imports','v85'),{recursive:true});
 await run('git',['init','-q'],{cwd:root});
 t.after(async()=>{
  // Cleanup is confined to this fresh fixture; unlink possible escape links first.
  const dir=path.join(root,'.next','output','static','game','imports','v85');
  if(await fs.lstat(dir).then(()=>true,()=>false)){
   for(const entry of await fs.readdir(dir)){
    const p=path.join(dir,entry);
    if((await fs.lstat(p)).isSymbolicLink())await fs.unlink(p);
   }
  }
  const resolved=path.resolve(root),base=path.join(project,'work-local','v89');
  assert.ok(path.relative(base,resolved).startsWith('native-origin-fixture-'));
  assert.equal(await fs.realpath(root),root);
  await fs.rm(root,{recursive:true,force:true});
 });
 return root;
}
async function sprite(root,name,content){
 const source=path.join(root,prefix,name),target=path.join(root,'.next','output','static','game','imports','v85',name);
 await fs.mkdir(path.dirname(source),{recursive:true});await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(source,content);await fs.copyFile(source,target);
 return {source,target};
}
async function commit(root){
 await run('git',['add','--',prefix],{cwd:root});
 await run('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=disabled-fixture-hooks','commit','-q','-m','native sprites'],{cwd:root});
 return (await run('git',['rev-parse','HEAD'],{cwd:root})).stdout.trim();
}
async function routes(root,sha,patch={}){
 await fs.writeFile(path.join(root,'.next','routes-manifest.json'),JSON.stringify({rewrites:{beforeFiles:[{source:'/game/imports/v85/:path*',destination:nativeOriginDestinationV89(sha),...patch}],afterFiles:[],fallback:[]}}));
}
test('only verified generated sprites are omitted; originals and other output remain',async t=>{
 const root=await fixture(t),a=await sprite(root,'a.png',Buffer.from('native-a')),b=await sprite(root,'nested/b.png',Buffer.from('native-b'));
 const sha=await commit(root);await routes(root,sha);
 const retained=path.join(root,'.next','output','config.json');await fs.writeFile(retained,'runtime');
 const r=await nativeOriginFixtureV89({fixtureRoot:root,sha});
 assert.equal(r.files,2);assert.equal(r.bytes,16);assert.equal(r.originalSourcesPreserved,true);
 assert.equal(await fs.readFile(a.source,'utf8'),'native-a');assert.equal(await fs.readFile(b.source,'utf8'),'native-b');
 await assert.rejects(fs.stat(a.target),e=>e.code==='ENOENT');
 assert.equal(await fs.readFile(retained,'utf8'),'runtime');
});

test('an already omitted historical output needs no pruning but still requires the pinned rewrite',async t=>{
 const root=await fixture(t),a=await sprite(root,'a.png','native');const sha=await commit(root);
 await routes(root,sha);await fs.unlink(a.target);await fs.rmdir(path.dirname(a.target));
 const result=await nativeOriginFixtureV89({fixtureRoot:root,sha});
 assert.equal(result.status,'not-copied');assert.equal(result.files,0);
 assert.equal(await fs.readFile(a.source,'utf8'),'native');
 await routes(root,sha,{destination:nativeOriginDestinationV89('a'.repeat(40))});
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/beforeFiles rewrite/);
});
test('a late mismatch rejects the whole plan before removing any generated file',async t=>{
 const root=await fixture(t),a=await sprite(root,'a.png','stable'),b=await sprite(root,'z.png','native');
 const sha=await commit(root);await routes(root,sha);await fs.writeFile(b.target,'change');
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/bytes differ/);
 assert.equal(await fs.readFile(a.target,'utf8'),'stable');assert.equal(await fs.readFile(b.source,'utf8'),'native');
});

test('an output alias to a native original rejects all copies before any unlink',async t=>{
 const root=await fixture(t),a=await sprite(root,'a.png','stable'),z=await sprite(root,'z.png','native');
 const sha=await commit(root);await routes(root,sha);
 await fs.unlink(z.target);await fs.link(z.source,z.target);
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/aliases its original/);
 assert.equal(await fs.readFile(a.target,'utf8'),'stable');
 assert.equal(await fs.readFile(z.source,'utf8'),'native');assert.equal(await fs.readFile(z.target,'utf8'),'native');
});

test('the exact adapter mount is allowed, same-device and escaped descendant mounts are refused',()=>{
 const root='/vercel/path0/.next/output/static';
 const mounts='1 1 8:1 / / rw - ext4 /dev/root rw\n2 1 8:2 / '+root+' rw shared:3 - ext4 /dev/output rw\n';
 assert.doesNotThrow(()=>assertNativeOutputMountsV89(root,mounts));
 assert.doesNotThrow(()=>assertNativeOutputMountsV89(root,mounts+'3 2 8:2 /other '+root+'-other rw - ext4 /dev/output rw\n'));
 assert.throws(()=>assertNativeOutputMountsV89(root,mounts+'3 2 8:2 /public '+root+'/game/imports/v85 rw - ext4 /dev/output rw\n'),/descendant mounts/);
 assert.throws(()=>assertNativeOutputMountsV89(root,mounts+'3 2 8:2 /public '+root+'/game/escaped\\040name rw - ext4 /dev/output rw\n'),/descendant mounts/);
 assert.throws(()=>assertNativeOutputMountsV89(root,'broken'),/Malformed/);
 assert.throws(()=>assertNativeOutputMountsV89(root,''),/boundary/);
});
test('equal local and generated bytes not matching the committed origin are rejected',async t=>{
 const root=await fixture(t),f=await sprite(root,'a.png','native');const sha=await commit(root);await routes(root,sha);
 await fs.writeFile(f.source,'change');await fs.writeFile(f.target,'change');
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/committed origin/);
 assert.equal(await fs.readFile(f.target,'utf8'),'change');
});
test('missing or differently pinned beforeFiles rewrite cannot prune',async t=>{
 const root=await fixture(t),f=await sprite(root,'a.png','native');const sha=await commit(root);
 await routes(root,sha,{destination:nativeOriginDestinationV89('a'.repeat(40))});
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/beforeFiles rewrite/);
 assert.equal(await fs.readFile(f.target,'utf8'),'native');
 await routes(root,sha,{has:[{type:'query',key:'optional'}]});
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/beforeFiles rewrite/);
});
test('untracked original/output pairs fail closed',async t=>{
 const root=await fixture(t);await sprite(root,'a.png','native');const sha=await commit(root);await routes(root,sha);
 const f=await sprite(root,'untracked.png','other');
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/tracked PNG/);
 assert.equal(await fs.readFile(f.target,'utf8'),'other');
});
test('linked output escape is rejected before deleting any regular copy',async t=>{
 const root=await fixture(t),other=await fixture(t),f=await sprite(root,'a.png','native');
 const external=await sprite(other,'outside.png','keep');const sha=await commit(root);await routes(root,sha);
 const escape=path.join(root,'.next','output','static','game','imports','v85','escape');
 await fs.symlink(path.dirname(external.target),escape,process.platform==='win32'?'junction':'dir');
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:root,sha}),/symlinks|junctions/);
 assert.equal(await fs.readFile(f.target,'utf8'),'native');assert.equal(await fs.readFile(external.target,'utf8'),'keep');
});
test('invalid release SHA and arbitrary real project roots are refused',async()=>{
 assert.throws(()=>nativeOriginDestinationV89('../main'),/release SHA/);
 await assert.rejects(nativeOriginFixtureV89({fixtureRoot:project,sha:'a'.repeat(40)}),/Only private/);
});
test('local CLI refuses mutation even with VERCEL environment spoofed',async()=>{
 const before=process.env.VERCEL;process.env.VERCEL='1';
 try{assert.equal((await runNativeOriginV89()).status,'skipped');}
 finally{if(before===undefined)delete process.env.VERCEL;else process.env.VERCEL=before;}
});
async function configuredNext(env,manifestRoot=project){
 const source=await fs.readFile(path.join(project,'next.config.ts'),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal(compiled.diagnostics?.length??0,0);
 const sandbox={exports:{},process:{env},require(specifier){
  if(specifier==='./scripts/native-asset-origin-v1.mjs')return {
   nativeAssetDestinationV1,readNativeAssetOriginV1:()=>readNativeAssetOriginV1(manifestRoot),
  };
  assert.equal(specifier,'./scripts/game-build-identity','Unexpected Next configuration dependency');
  return {gameBuildIdentity:()=>gameBuildIdentity({env,gitRevision:()=>''})};
 }};
 vm.runInNewContext(compiled.outputText,sandbox,{timeout:1000});
 return sandbox.exports.default;
}
async function configuredRoutes(env,manifestRoot=project){return (await configuredNext(env,manifestRoot)).rewrites();}
test('the actual Next config leaves local native files local',async()=>{
 const routes=await configuredRoutes({});
 assert.equal(JSON.stringify(routes),JSON.stringify({beforeFiles:[],afterFiles:[],fallback:[]}));
});
test('the actual Next config pins the public repo and commit before filesystem routing in legacy mode',async t=>{
 const legacyRoot=await fixture(t);
 const sha='a'.repeat(40),env={VERCEL:'1',VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'darknigthmare',VERCEL_GIT_REPO_SLUG:'yautja-la-longue-chasse',VERCEL_GIT_COMMIT_SHA:sha};
 const routes=await configuredRoutes(env,legacyRoot);
 assert.equal(routes.beforeFiles.length,1);
 assert.equal(routes.beforeFiles[0].source,'/game/imports/v85/:path*');
 assert.equal(routes.beforeFiles[0].destination,nativeOriginDestinationV89(sha));
 await assert.rejects(configuredRoutes({...env,VERCEL_GIT_COMMIT_SHA:'main'},legacyRoot),/valid release SHA/);
 await assert.rejects(configuredRoutes({...env,VERCEL_GIT_REPO_OWNER:'someone-else'},legacyRoot),/Unexpected published Git repository/);
});

async function commitDelivery(root){
 await run('git',['add','-A','--','public/game'],{cwd:root});
 if(await fs.stat(path.join(root,NATIVE_ASSET_MANIFEST_V1)).then(()=>true,()=>false))
  await run('git',['add','--',NATIVE_ASSET_MANIFEST_V1],{cwd:root});
 await run('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=disabled-fixture-hooks','commit','-q','-m','native delivery fixture'],{cwd:root});
 return (await run('git',['rev-parse','HEAD'],{cwd:root})).stdout.trim();
}
async function sourceLightFixture(t){
 const root=await fixture(t),bitmap=await sprite(root,'native space.png','preserved-native-bitmap');
 const content={
  'data/manifest.json':'{"native":true}\n',
  'ui/marker.svg':'<svg xmlns="http://www.w3.org/2000/svg"/>',
  'review/index.html':'<!doctype html><title>Native review</title>',
  'review/review.js':'window.nativeReview=true;',
  'data/map.geojson':'{"type":"FeatureCollection","features":[]}',
 };
 for(const [relative,bytes] of Object.entries(content)){
  for(const base of ['public/game','.next/output/static/game']){
   const file=path.join(root,base,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);
  }
 }
 const sourceCommit=await commitDelivery(root),manifest=createNativeAssetManifestV1({repositoryRoot:root,sourceCommit});
 await fs.unlink(bitmap.source);await fs.unlink(bitmap.target);
 const manifestPath=path.join(root,NATIVE_ASSET_MANIFEST_V1);
 await fs.mkdir(path.dirname(manifestPath),{recursive:true});await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 const sha=await commitDelivery(root);
 const env={VERCEL:'1',VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'darknigthmare',VERCEL_GIT_REPO_SLUG:'yautja-la-longue-chasse',VERCEL_GIT_COMMIT_SHA:sha};
 const config=await configuredNext(env,root),rewrites=await config.rewrites();
 await fs.writeFile(path.join(root,'.next','routes-manifest.json'),JSON.stringify({rewrites}));
 return {root,bitmap,content,manifest,manifestPath,sourceCommit,sha,env,config,rewrites};
}
test('source-light delivery binds complete source proof, retained files, actual build ID and afterFiles routing',async t=>{
 const f=await sourceLightFixture(t);
 assert.notEqual(f.sha,f.sourceCommit);
 assert.equal(f.config.env.NEXT_PUBLIC_YAUTJA_BUILD_ID,f.sha.slice(0,8));
 assert.equal(f.rewrites.beforeFiles.length,0);
 assert.equal(f.rewrites.afterFiles.length,1);
 assert.equal(f.rewrites.afterFiles[0].destination,nativeAssetDestinationV1(f.sourceCommit));
 const result=await sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha});
 assert.equal(result.sha,f.sha);assert.equal(result.sourceCommit,f.sourceCommit);
 assert.equal(result.retainedFiles,5);assert.equal(result.externalBitmapFiles,1);
 assert.equal(result.verifiedOutputFiles,5);assert.equal(result.generatedFilesRemoved,0);
 for(const [relative,bytes] of Object.entries(f.content)){
  assert.equal(await fs.readFile(path.join(f.root,'public/game',relative),'utf8'),bytes);
  assert.equal(await fs.readFile(path.join(f.root,'.next/output/static/game',relative),'utf8'),bytes);
 }
 assert.equal((await run('git',['show',f.sourceCommit+':public/game/imports/v85/native space.png'],{cwd:f.root})).stdout,'preserved-native-bitmap');
});
test('source-light proof rejects partial inventories, altered trees, owners, paths and encodings',async t=>{
 const {manifest}=await sourceLightFixture(t);
 const mutations=[
  value=>{value.repository='someone-else/repository';},
  value=>{value.sourceCommit='a'.repeat(40);},
  value=>{value.sourceGameTree='a'.repeat(40);},
  value=>{value.retainedGameTree='a'.repeat(40);},
  value=>{value.entries.pop();},
  value=>{value.entries[0].blob='a'.repeat(40);},
  value=>{value.entries[0].path='../outside.json';},
  value=>{value.entries[0].mode='120000';},
  value=>{value.entries.push(value.entries[0]);},
  value=>{value.gitObjects.commit+='!';},
  value=>{value.gitObjects.publicTree=Buffer.from('other').toString('base64');},
  value=>{value.unreviewedMode=true;},
 ];
 for(const mutate of mutations){const altered=structuredClone(manifest);mutate(altered);assert.throws(()=>validateNativeAssetManifestV1(altered),/Native asset provenance/);}
});
test('source-light requires the actual delivery HEAD and a manifest committed in it',async t=>{
 const f=await sourceLightFixture(t);
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sourceCommit}),/Delivery SHA differs from HEAD/);
 const bytes=await fs.readFile(f.manifestPath);await fs.appendFile(f.manifestPath,' ');
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/manifest differs from delivery HEAD/);
 await fs.writeFile(f.manifestPath,bytes);
 await run('git',['rm','--cached','--',NATIVE_ASSET_MANIFEST_V1],{cwd:f.root});
 await run('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=disabled-fixture-hooks','commit','-q','-m','untracked proof'],{cwd:f.root});
 const untrackedSha=(await run('git',['rev-parse','HEAD'],{cwd:f.root})).stdout.trim();
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:untrackedSha}),/manifest differs from delivery HEAD/);
});
test('source-light rejects missing or changed local inputs and unproven generated bitmaps without deleting them',async t=>{
 const f=await sourceLightFixture(t),local=path.join(f.root,'public/game/data/manifest.json'),output=path.join(f.root,'.next/output/static/game/data/manifest.json');
 await fs.writeFile(local,'changed');
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/retained bytes differ/);
 await fs.unlink(local);
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/input is missing/);
 await fs.writeFile(local,f.content['data/manifest.json']);
 await fs.writeFile(output,'changed output');
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/retained bytes differ/);
 await fs.writeFile(output,f.content['data/manifest.json']);
 await fs.writeFile(f.bitmap.target,'unexpected generated bitmap');
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/Unproven local native entry/);
 assert.equal(await fs.readFile(f.bitmap.target,'utf8'),'unexpected generated bitmap');
 assert.equal(await fs.readFile(local,'utf8'),f.content['data/manifest.json']);
});
test('source-light refuses bitmap additions and retained-file deletions in the committed delivery tree',async t=>{
 const f=await sourceLightFixture(t);
 await fs.writeFile(f.bitmap.source,'unexpected committed bitmap');
 const withBitmap=await commitDelivery(f.root);
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:withBitmap}),/exactly the proven retained/);
 await fs.unlink(f.bitmap.source);await fs.unlink(path.join(f.root,'public/game/data/manifest.json'));
 const missingLocal=await commitDelivery(f.root);
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:missingLocal}),/exactly the proven retained/);
});
test('source-light refuses beforeFiles, the delivery SHA as asset source and conditional rewrites',async t=>{
 const f=await sourceLightFixture(t),routePath=path.join(f.root,'.next','routes-manifest.json');
 const changes=[
  {beforeFiles:f.rewrites.afterFiles,afterFiles:[],fallback:[]},
  {beforeFiles:[],afterFiles:[{...f.rewrites.afterFiles[0],destination:nativeAssetDestinationV1(f.sha)}],fallback:[]},
  {beforeFiles:[],afterFiles:[{...f.rewrites.afterFiles[0],has:[{type:'query',key:'optional'}]}],fallback:[]},
 ];
 for(const rewrites of changes){
  await fs.writeFile(routePath,JSON.stringify({rewrites}));
  await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/Exact source-pinned afterFiles/);
 }
});
test('source-light refuses linked manifests and local output escapes',async t=>{
 const f=await sourceLightFixture(t),copy=path.join(f.root,'manifest-copy.json');
 await fs.rename(f.manifestPath,copy);await fs.symlink(copy,f.manifestPath);
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/regular manifest/);
 await fs.unlink(f.manifestPath);await fs.rename(copy,f.manifestPath);
 const output=path.join(f.root,'.next/output/static/game/data/manifest.json');
 await fs.unlink(output);await fs.symlink(path.join(f.root,'public/game/data/manifest.json'),output);
 await assert.rejects(sourceLightOriginFixtureV89({fixtureRoot:f.root,sha:f.sha}),/symlinks or junctions/);
});
