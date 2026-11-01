#!/usr/bin/env node
/**
 * Reproduce the immutable Homeworld V112 publication under its original Git
 * sources. Current Homeworld/Pit/hunting tests continue to run on the current
 * tree; this wrapper does not turn the archived browser reports into new runs.
 * No historical source payload, workbook or report is generated into the repo.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {constants as fsConstants} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gitBlobHashV112,restorePinnedSourceV112,restoreChangedFrozenSourceV112} from './check-excel-history-v112.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const HOMEWORLD_PUBLICATION_COMMIT_V112='a5ed39dfbed118669b2e76402c490b200136a74d';
export const HOMEWORLD_PUBLICATION_TREE_V112='ae465567b38672a781909795f84dbcd1db7ad832';
export const HOMEWORLD_RUNTIME_COMMIT_V112='aa891dfff9bc022d1b7363d4b7085aca19b4d1e3';
export const HOMEWORLD_PUBLICATION_TEST_V112=Object.freeze({
 path:'tests/homeworld-excel-followup-v112.test.mjs',gitBlobSha:'8716293c200408c46fbec3d5f8251ded05ef5f19',
 sha256:'cc1b2370e7eb9a61c39ba42044a073662056be1c4ce44848e64d521f858eafaf',bytes:9389,assertions:9,
});
const METADATA=Object.freeze([
 {path:'docs/v112-homeworld-followup.json',gitBlobSha:'e340461c6294133658585d2b88b864363529baae'},
 {path:'docs/v112-homeworld-source.json',gitBlobSha:'e054847e5f5c7269136f8e808fff9cc199228d03'},
 {path:'docs/v112-runtime-freeze.json',gitBlobSha:'e77d41874c4d2162b8189b6e031d38ab9fc7b69d'},
 {path:'docs/v112-homeworld-followup-qa.json',gitBlobSha:'3b2f0f2f82a23c27fec624b43176174de35ace47'},
]);
const WORKBOOK=Object.freeze({path:'docs/YAUTJA_V112_SUIVI.xlsx',bytes:9383908,
 sha256:'b29aa412000717cdfd81be1a60e2c2f9d8489c0b8b2ed5d29404668d04dd1d02'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,args,timeout=30000)=>execFileSync('git',args,{cwd:root,timeout,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});
const local=file=>typeof file==='string'&&file.length>0&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.includes('\0')&&
 file.split('/').every(part=>part&&part!=='.'&&part!=='..');

async function ensureCommit(repository){
 for(const commit of [HOMEWORLD_PUBLICATION_COMMIT_V112,HOMEWORLD_RUNTIME_COMMIT_V112]){
  try{git(repository,['cat-file','-e',commit+'^{commit}']);}
  catch{
   const origin=git(repository,['remote','get-url','origin']).toString('utf8').trim();
   assert.match(origin,/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)darknigthmare\/yautja-la-longue-chasse(?:\.git)?$/,
    'Historical fetch requires the original repository');
   git(repository,['-c','protocol.file.allow=never','fetch','--filter=blob:none','--no-tags','--depth=1','origin',commit],45000);
  }
 }
 assert.equal(git(repository,['rev-parse',HOMEWORLD_PUBLICATION_COMMIT_V112+'^{tree}']).toString().trim(),HOMEWORLD_PUBLICATION_TREE_V112);
 const parents=[...git(repository,['cat-file','-p',HOMEWORLD_PUBLICATION_COMMIT_V112]).toString('utf8').matchAll(/^parent ([a-f0-9]{40})$/gm)].map(match=>match[1]);
 assert.deepEqual(parents,[HOMEWORLD_RUNTIME_COMMIT_V112],'Publication must retain its original compiled-runtime parent');
}
async function publishedMetadata(repository){
 const result={};
 for(const row of METADATA){
  const bytes=await fs.readFile(path.join(repository,row.path));
  assert.equal(gitBlobHashV112(bytes),row.gitBlobSha,'Published V112 metadata changed: '+row.path);
  result[row.path]=JSON.parse(bytes);
 }
 return result;
}
function inputUnion(snapshot,freeze){
 assert.equal(snapshot.release,'V112');assert.equal(snapshot.inputs.length,1791);
 assert.equal(freeze.files,1563);assert.equal(freeze.entries.length,freeze.files);
 assert.equal(freeze.bytes,freeze.entries.reduce((sum,row)=>sum+row.bytes,0));
 const map=new Map();
 for(const rows of [snapshot.inputs,freeze.entries]){
  assert.equal(new Set(rows.map(row=>row.path)).size,rows.length,'Duplicate historical input');
  for(const row of rows){
   assert.ok(local(row.path),'Unsafe historical input path');
   assert.match(row.sha256??'',/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0);
   if(map.has(row.path))assert.deepEqual(map.get(row.path),row,'Conflicting historical input: '+row.path);
   else map.set(row.path,row);
  }
 }
 assert.equal(map.size,1791,'Published freeze must be completely covered by publication inputs');
 return [...map.values()].sort((a,b)=>a.path.localeCompare(b.path));
}
async function verifyRows(root,rows){
 for(const row of rows){
  const file=path.join(root,row.path),stat=await fs.lstat(file);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Historical input must remain a regular file: '+row.path);
  const bytes=await fs.readFile(file);
  assert.equal(bytes.length,row.bytes,'Historical V112 publication size changed: '+row.path);
  assert.equal(sha(bytes),row.sha256,'Historical V112 publication SHA256 changed: '+row.path);
 }
}
async function privateGit(repository,root){
 // A private HEAD identifies the publication, while an object alternate permits
 // read-only access to the already fetched object database. No shared ref moves.
 git(root,['-c','init.defaultBranch=historical-v112','init','--quiet']);
 const objects=await fs.realpath(path.resolve(repository,git(repository,['rev-parse','--git-path','objects']).toString().trim()));
 assert.ok((await fs.stat(objects)).isDirectory());
 const alternate=path.join(root,'.git','objects','info','alternates');
 await fs.writeFile(alternate,objects+'\n',{mode:0o444});await fs.chmod(alternate,0o444);
 const head=path.join(root,'.git','HEAD');
 await fs.writeFile(head,HOMEWORLD_PUBLICATION_COMMIT_V112+'\n');await fs.chmod(head,0o444);
 assert.equal(git(root,['rev-parse','HEAD']).toString().trim(),HOMEWORLD_PUBLICATION_COMMIT_V112);
 assert.equal(git(root,['rev-parse','HEAD^{tree}']).toString().trim(),HOMEWORLD_PUBLICATION_TREE_V112);
 return {alternate,objects};
}
export async function prepareHistoricalHomeworldPublicationV112(repository=ROOT){
 await ensureCommit(repository);
 const metadata=await publishedMetadata(repository);
 const snapshot=metadata['docs/v112-homeworld-followup.json'],freeze=metadata['docs/v112-runtime-freeze.json'];
 const rows=inputUnion(snapshot,freeze);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-homeworld-publication-v112-'));
 try{
  for(const directory of ['app','scripts','tests','desktop','db','drizzle','build','worker']){
   const source=path.join(repository,directory);
   if(await fs.stat(source).catch(()=>null))await fs.cp(source,path.join(root,directory),{recursive:true});
  }
  for(const entry of await fs.readdir(repository,{withFileTypes:true})){
   if(entry.isFile())await fs.copyFile(path.join(repository,entry.name),path.join(root,entry.name));
  }
  // Publication assets and documentary evidence are shared only as read inputs.
  // The original generator writes its test products into private temporary dirs.
  for(const directory of ['art-source','docs','.openai','node_modules']){
   await fs.symlink(path.join(repository,directory),path.join(root,directory),'dir');
  }
  // Only the historical public inventory is visible to the old native-bank
  // walker: newer V112 hunting signals must not enter its former art manifest.
  // Reflink/copy regular files rather than symlink/hardlink them, so private
  // writes could never alter the application's current binary assets.
  for(const row of rows.filter(row=>row.path.startsWith('public/'))){
   const target=path.join(root,row.path);await fs.mkdir(path.dirname(target),{recursive:true});
   await fs.copyFile(path.join(repository,row.path),target,fsConstants.COPYFILE_FICLONE);
  }
  const allowed=new Set(rows.map(row=>row.path));
  const prune=async relative=>{
   for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
    const file=relative+'/'+entry.name;
    if(entry.isDirectory())await prune(file);
    else if(!allowed.has(file))await fs.rm(path.join(root,file));
   }
  };
  // These are private copies. Pruning also excludes new test/recipe helpers
  // from any recursive inventory used by the exact original command.
  for(const directory of ['app','scripts','tests'])await prune(directory);
  const restoredSources=await restoreChangedFrozenSourceV112(root,{entries:rows},file=>
   Promise.resolve(git(repository,['show',HOMEWORLD_PUBLICATION_COMMIT_V112+':'+file])));
  // Restore and prove the complete original test file, not an edited copy or
  // selected assertions. The current glob's adapter is never run recursively.
  await restorePinnedSourceV112(root,HOMEWORLD_PUBLICATION_TEST_V112,file=>
   Promise.resolve(git(repository,['show',HOMEWORLD_PUBLICATION_COMMIT_V112+':'+file])));
  const originalTest=await fs.readFile(path.join(root,HOMEWORLD_PUBLICATION_TEST_V112.path));
  assert.equal(originalTest.length,HOMEWORLD_PUBLICATION_TEST_V112.bytes);
  assert.equal(sha(originalTest),HOMEWORLD_PUBLICATION_TEST_V112.sha256);
  const gitContext=await privateGit(repository,root);
  const context={root,repository,rows,freeze,restoredSources,gitContext,
   dispose:()=>fs.rm(root,{recursive:true,force:true})};
  await verifyHistoricalHomeworldPublicationV112(context);
  return context;
 }catch(error){await fs.rm(root,{recursive:true,force:true});throw error;}
}
export async function verifyHistoricalHomeworldPublicationV112(context){
 assert.equal((await fs.lstat(path.join(context.root,'.git'))).isSymbolicLink(),false,'Historical Git identity must be private');
 const head=path.join(context.root,'.git','HEAD'),headStat=await fs.lstat(head);
 assert.ok(headStat.isFile()&&!headStat.isSymbolicLink());
 assert.equal(headStat.mode&0o222,0,'Historical HEAD must be read only');
 assert.equal(await fs.readFile(head,'utf8'),HOMEWORLD_PUBLICATION_COMMIT_V112+'\n','Historical V112 Git HEAD changed');
 assert.equal(await fs.readFile(context.gitContext.alternate,'utf8'),context.gitContext.objects+'\n','Historical object alternate changed');
 assert.equal(git(context.root,['rev-parse','HEAD^{tree}']).toString().trim(),HOMEWORLD_PUBLICATION_TREE_V112);
 await publishedMetadata(context.root);
 await verifyRows(context.root,context.rows);
 const workbook=await fs.readFile(path.join(context.root,WORKBOOK.path));
 assert.equal(workbook.length,WORKBOOK.bytes,'Published V112 workbook size changed');
 assert.equal(sha(workbook),WORKBOOK.sha256,'Published V112 workbook SHA256 changed');
 const testBytes=await fs.readFile(path.join(context.root,HOMEWORLD_PUBLICATION_TEST_V112.path));
 assert.equal(gitBlobHashV112(testBytes),HOMEWORLD_PUBLICATION_TEST_V112.gitBlobSha,'Original V112 publication assertions changed');
 return {sourceCommit:HOMEWORLD_PUBLICATION_COMMIT_V112,gitTree:HOMEWORLD_PUBLICATION_TREE_V112,
  frozenInputs:context.freeze.files,publicationInputs:context.rows.length,currentRuntimeCovered:false};
}
export async function checkHistoricalHomeworldPublicationV112({tests=false,repository=ROOT}={}){
 const context=await prepareHistoricalHomeworldPublicationV112(repository);
 try{
  if(tests){
   const environment={...process.env};delete environment.NODE_TEST_CONTEXT;
   let output;
   try{
    output=execFileSync(process.execPath,['--experimental-strip-types','--test','--test-reporter=tap','--test-concurrency=1',
     HOMEWORLD_PUBLICATION_TEST_V112.path],{cwd:context.root,env:environment,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
   }catch(error){
    if(error.stdout)process.stdout.write(error.stdout);if(error.stderr)process.stderr.write(error.stderr);throw error;
   }
   assert.match(output,/# tests 9(?:\r?\n|$)/);assert.match(output,/# fail 0(?:\r?\n|$)/);assert.match(output,/# skipped 0(?:\r?\n|$)/);
   process.stdout.write(output);
  }
  const environment={...process.env};delete environment.NODE_TEST_CONTEXT;
  const historicalCommands=[
   ['scripts/snapshot-runtime-v112.mjs','--check','docs/v112-runtime-freeze.json'],
   ['scripts/build-homeworld-followup-v112.mjs','--check'],
  ];
  console.log(JSON.stringify({scope:'Immutable Homeworld V112 publication only; current runtime is tested separately',
   sourceCommit:HOMEWORLD_PUBLICATION_COMMIT_V112,historicalCommands}));
  const commandOutput=[];
  for(const args of historicalCommands){
   let output;
   try{
    output=execFileSync(process.execPath,args,{cwd:context.root,env:environment,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
   }catch(error){
    if(error.stdout)process.stdout.write(error.stdout);if(error.stderr)process.stderr.write(error.stderr);throw error;
   }
   process.stdout.write(output);
   commandOutput.push(JSON.parse(output.trim().split(/\r?\n/).at(-1)));
  }
  assert.equal(commandOutput[0].status,'PASS');
  assert.equal(commandOutput[0].path,'docs/v112-runtime-freeze.json');
  assert.equal(commandOutput[1].result,'PASS_STRUCTURE');
  const result={workbookSha256:commandOutput[1].sha256,bytes:commandOutput[1].bytes};
  const integrity=await verifyHistoricalHomeworldPublicationV112(context);
  assert.equal(result.workbookSha256,WORKBOOK.sha256);assert.equal(result.bytes,WORKBOOK.bytes);
  return {result:'PASS_HISTORICAL_HOMEWORLD_PUBLICATION_V112',...integrity,
   originalTestFiles:1,originalAssertions:HOMEWORLD_PUBLICATION_TEST_V112.assertions,originalTestsExecuted:tests,
   restoredSources:context.restoredSources,sha256:result.workbookSha256,bytes:result.bytes,
   originalRuntimeFreezeCheckExecuted:true,originalWorkbookCheckExecuted:true,
   runtimeBrowserEvidenceReexecuted:false,nativeExcelExecuted:false};
 }finally{await context.dispose();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 assert.ok(args.includes('--check')&&args.every(arg=>['--check','--tests'].includes(arg))&&new Set(args).size===args.length,
  'Usage: node scripts/check-homeworld-publication-history-v112.mjs --check [--tests]');
 console.log(JSON.stringify(await checkHistoricalHomeworldPublicationV112({tests:args.includes('--tests')})));
}
