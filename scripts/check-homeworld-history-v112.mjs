#!/usr/bin/env node
/** Preserve the published V111 Homeworld workbook under its exact pinned source.
 * Current V111 runtime regressions must still run separately on the current tree.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gitBlobHashV112,restorePinnedSourceV112,restoreChangedFrozenSourceV112,verifyFrozenInputsV112} from './check-excel-history-v112.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const HOMEWORLD_SOURCE_COMMIT_V112='a5a951e3f6dbb3fa399bd38f774a1f0b6ec58f5e';
export const HOMEWORLD_FREEZE_BLOB_V112='9d60b34636ec1aa8d343baccbdd1ba63fa68a5c4';
const git=(root,args,timeout=30000)=>execFileSync('git',args,{cwd:root,timeout,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});
export async function prepareHistoricalHomeworldV111V112(repository=ROOT){
 try{git(repository,['cat-file','-e',HOMEWORLD_SOURCE_COMMIT_V112+'^{commit}']);}
 catch{
  const remote=git(repository,['remote','get-url','origin']).toString().trim();
  assert.match(remote,/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)darknigthmare\/yautja-la-longue-chasse(?:\.git)?$/);
  git(repository,['-c','protocol.file.allow=never','fetch','--filter=blob:none','--no-tags','--depth=1','origin',HOMEWORLD_SOURCE_COMMIT_V112],45000);
 }
 const freezeBytes=await fs.readFile(path.join(repository,'docs/v111-runtime-freeze.json'));
 assert.equal(gitBlobHashV112(freezeBytes),HOMEWORLD_FREEZE_BLOB_V112,'Published V111 Homeworld freeze changed');
 const freeze=JSON.parse(freezeBytes),root=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-homeworld-v111-history-v112-'));
 try{
  for(const directory of ['app','scripts','tests','desktop','db','drizzle','build','worker']){
   const source=path.join(repository,directory);
   if(await fs.stat(source).catch(()=>null))await fs.cp(source,path.join(root,directory),{recursive:true});
  }
  for(const entry of await fs.readdir(repository,{withFileTypes:true}))if(entry.isFile())await fs.copyFile(path.join(repository,entry.name),path.join(root,entry.name));
  for(const directory of ['public','art-source','docs','.openai','node_modules','.git'])await fs.symlink(path.join(repository,directory),path.join(root,directory));
  const allowed=new Set(freeze.entries.filter(row=>row.path.startsWith('app/')).map(row=>row.path));
  const prune=async relative=>{for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
   const file=relative+'/'+entry.name;if(entry.isDirectory())await prune(file);else if(!allowed.has(file))await fs.rm(path.join(root,file));
  }};await prune('app');
  const restored=await restoreChangedFrozenSourceV112(root,freeze,file=>Promise.resolve(git(repository,['show',HOMEWORLD_SOURCE_COMMIT_V112+':'+file])));
  const originalTests=git(repository,['ls-tree','-r','-z',HOMEWORLD_SOURCE_COMMIT_V112,'--','tests']).toString().split('\0').filter(Boolean).map(line=>{
   const at=line.indexOf('\t'),[mode,type,gitBlobSha]=line.slice(0,at).split(' ');return{path:line.slice(at+1),mode,type,gitBlobSha};
  }).filter(row=>/^tests\/homeworld-.*-v111\.test\.mjs$/.test(row.path));
  assert.ok(originalTests.length>=5,'Original V111 Homeworld assertions missing');
  for(const row of originalTests){
   assert.equal(row.type,'blob');assert.equal(row.mode,'100644');
   await restorePinnedSourceV112(root,row,file=>Promise.resolve(git(repository,['show',HOMEWORLD_SOURCE_COMMIT_V112+':'+file])));
  }
  await verifyFrozenInputsV112(root,freeze);
  return{root,freeze,originalTests,restored,dispose:()=>fs.rm(root,{recursive:true,force:true})};
 }catch(error){await fs.rm(root,{recursive:true,force:true});throw error;}
}
export async function checkHistoricalHomeworldV111V112({tests=false,repository=ROOT}={}){
 const context=await prepareHistoricalHomeworldV111V112(repository);
 try{
  if(tests){
   const env={...process.env};delete env.NODE_TEST_CONTEXT;
   const output=execFileSync(process.execPath,['--experimental-strip-types','--test','--test-reporter=tap','--test-concurrency=1',...context.originalTests.map(row=>row.path)],
    {cwd:context.root,env,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
   assert.match(output,/# fail 0(?:\r?\n|$)/);assert.match(output,/# skipped 0(?:\r?\n|$)/);process.stdout.write(output);
  }
  const original=await import(pathToFileURL(path.join(context.root,'scripts/build-homeworld-followup-v111.mjs')).href);
  assert.equal(original.ROOT,context.root);
  const result=await original.generateFollowupV111({check:true});
  await verifyFrozenInputsV112(context.root,context.freeze);
  return{result:'PASS_HISTORICAL_HOMEWORLD_V111',sourceCommit:HOMEWORLD_SOURCE_COMMIT_V112,sha256:result.workbookSha256,bytes:result.bytes,
   frozenInputsVerified:context.freeze.files,restoredSources:context.restored,originalTestFiles:context.originalTests.length,originalTestsExecuted:tests,currentRuntimeCovered:false};
 }finally{await context.dispose();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 assert.ok(args.includes('--check')&&args.every(arg=>['--check','--tests'].includes(arg))&&new Set(args).size===args.length,'Usage: node scripts/check-homeworld-history-v112.mjs --check [--tests]');
 console.log(JSON.stringify(await checkHistoricalHomeworldV111V112({tests:args.includes('--tests')})));
}
