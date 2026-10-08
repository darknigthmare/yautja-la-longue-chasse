import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';
import { nativeOriginFixtureV89, nativeOriginDestinationV89, runNativeOriginV89, assertNativeOutputMountsV89 } from '../scripts/vercel-native-origin-v89.mjs';
const run=promisify(execFile);
const project=process.cwd(),prefix='public/game/imports/v85';
test('every script actually invoked by the Vercel build is retained by its deployment allowlist',async()=>{
 const config=JSON.parse(await fs.readFile(path.join(project,'vercel.json'),'utf8'));
 const ignore=(await fs.readFile(path.join(project,'.vercelignore'),'utf8')).split(/\r?\n/).map(line=>line.trim());
 assert(ignore.includes('/scripts/*'));
 assert(ignore.includes('/public/game/imports/v85'),'Only the rewritten historical group is omitted at packaging time');
 assert(!ignore.some(line=>/^\/?public(?:\/game(?:\/imports(?:\/v(?:86|87|88|89))?)?)?$/.test(line)),'Other native groups stay included');
 const paths=[...config.buildCommand.matchAll(/\bnode\s+(scripts\/[\w.-]+\.mjs)/g)].map(match=>match[1]);
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
async function configuredRoutes(env){
 const source=await fs.readFile(path.join(project,'next.config.ts'),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal(compiled.diagnostics?.length??0,0);
 const sandbox={exports:{},process:{env}};
 vm.runInNewContext(compiled.outputText,sandbox,{timeout:1000});
 return sandbox.exports.default.rewrites();
}
test('the actual Next config leaves local native files local',async()=>{
 const routes=await configuredRoutes({});
 assert.equal(JSON.stringify(routes),JSON.stringify({beforeFiles:[],afterFiles:[],fallback:[]}));
});
test('the actual Next config pins the public repo and commit before filesystem routing',async()=>{
 const sha='a'.repeat(40),env={VERCEL:'1',VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'darknigthmare',VERCEL_GIT_REPO_SLUG:'yautja-la-longue-chasse',VERCEL_GIT_COMMIT_SHA:sha};
 const routes=await configuredRoutes(env);
 assert.equal(routes.beforeFiles.length,1);
 assert.equal(routes.beforeFiles[0].source,'/game/imports/v85/:path*');
 assert.equal(routes.beforeFiles[0].destination,nativeOriginDestinationV89(sha));
 await assert.rejects(configuredRoutes({...env,VERCEL_GIT_COMMIT_SHA:'main'}),/valid release SHA/);
 await assert.rejects(configuredRoutes({...env,VERCEL_GIT_REPO_OWNER:'someone-else'}),/Unexpected published Git repository/);
});
