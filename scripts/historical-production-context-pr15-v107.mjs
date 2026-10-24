import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {getHistoricalExcelContextV107,verifyHistoricalExcelContextV107,EXCEL_HISTORY_COMMIT_V107} from './historical-excel-context-v107.mjs';
const REPOSITORY=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const PRODUCTION_HISTORY_COMMIT_PR15_V107='d99604e18d4b185b57cc59cfbde0420b95acd0fd';
const MANIFEST='tests/fixtures/production-history-pr15-v107.json';
const MANIFEST_SHA='e8b408beceeb801baf0dc1b63e9d3597561f1fff218cc19a861c38c1862e6d7b';
const ARCHIVE_SHA='4524f083f69335aadeab9c647980f4113afc565da29476ef7f2301009ce7e614';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const local=file=>typeof file==='string'&&file.length&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.includes('\0')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
let pending;
async function verify(root,rows){for(const row of rows){assert.ok(local(row.path));const bytes=await fsp.readFile(path.join(root,row.path));assert.equal(bytes.length,row.bytes,'Historical size changed: '+row.path);assert.equal(sha(bytes),row.sha256,'Historical bytes changed: '+row.path);}}
async function prepare(){
 const base=await getHistoricalExcelContextV107();
 const manifestBytes=await fsp.readFile(path.join(REPOSITORY,MANIFEST));assert.equal(sha(manifestBytes),MANIFEST_SHA);const manifest=JSON.parse(manifestBytes);
 assert.equal(manifest.schemaVersion,1);assert.equal(manifest.sourceCommit,PRODUCTION_HISTORY_COMMIT_PR15_V107);assert.equal(manifest.baseCommit,EXCEL_HISTORY_COMMIT_V107);
 const baseManifest=await fsp.readFile(path.join(REPOSITORY,manifest.base.path));assert.equal(sha(baseManifest),manifest.base.sha256);
 const compressed=await fsp.readFile(path.join(REPOSITORY,manifest.archive.path));assert.equal(sha(compressed),ARCHIVE_SHA);assert.equal(compressed.length,manifest.archive.bytes);
 assert.equal(manifest.archive.sha256,ARCHIVE_SHA);assert.ok(manifest.archive.uncompressedBytes>0&&manifest.archive.uncompressedBytes<=12*1024*1024);
 const payload=gunzipSync(compressed,{maxOutputLength:12*1024*1024});assert.equal(payload.length,manifest.archive.uncompressedBytes);
 const archive=JSON.parse(payload);assert.equal(archive.schemaVersion,1);assert.equal(archive.sourceCommit,PRODUCTION_HISTORY_COMMIT_PR15_V107);
 assert.deepEqual(archive.files.map(({path,sha256,bytes})=>({path,sha256,bytes})),manifest.sources);
 assert.equal(new Set([...manifest.sources,...manifest.shared].map(row=>row.path)).size,manifest.sources.length+manifest.shared.length);
 await verify(REPOSITORY,manifest.shared);
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'yautja-pr15-history-v107-'));
 try{
  const overrides=new Map(archive.files.map(row=>[row.path,row]));
  const originals=new Map(base.manifest.sources.map(row=>[row.path,row]));
  const rows=new Map([...originals,...overrides]);
  for(const row of rows.values()){
   assert.ok(local(row.path));const bytes=overrides.has(row.path)?Buffer.from(row.base64,'base64'):await fsp.readFile(path.join(base.root,row.path));assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);
   const target=path.join(root,row.path);await fsp.mkdir(path.dirname(target),{recursive:true});await fsp.writeFile(target,bytes,{mode:0o444,flag:'wx'});
  }
  const shared=[...base.manifest.shared,...manifest.shared];assert.equal(new Set(shared.map(row=>row.path)).size,shared.length);
  for(const row of shared){const target=path.join(root,row.path);await fsp.mkdir(path.dirname(target),{recursive:true});await fsp.symlink(path.join(REPOSITORY,row.path),target);}
  await fsp.symlink(path.join(REPOSITORY,'node_modules'),path.join(root,'node_modules'),'dir');
  process.once('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
  return {root,manifest,sources:[...rows.values()].map(({path,bytes,sha256})=>({path,bytes,sha256})),shared};
 }catch(error){await fsp.rm(root,{recursive:true,force:true});throw error;}
}
/** Opt-in historical tests only. All ordinary game imports stay on V107. */
export function getHistoricalProductionPr15V107(){return pending??=prepare();}
export async function verifyHistoricalProductionPr15V107(){const context=await getHistoricalProductionPr15V107();await verifyHistoricalExcelContextV107();await verify(context.root,context.sources);for(const row of context.sources){const stat=await fsp.lstat(path.join(context.root,row.path));assert.equal(stat.isSymbolicLink(),false);assert.equal(stat.mode&0o222,0,'Historical source must stay read-only');}await verify(REPOSITORY,context.shared);for(const row of context.shared)assert.equal(await fsp.readlink(path.join(context.root,row.path)),path.join(REPOSITORY,row.path));return {sourceCommit:context.manifest.sourceCommit,sourcesVerified:context.sources.length,sharedVerified:context.shared.length,originalWorkbooksPreserved:context.manifest.originalWorkbooksPreserved.length,currentRuntimeCovered:false};}

/** Execute original assertions byte-exact, with their historical cwd. This
 * avoids any global chdir or allowing a historical total to constrain V107. */
export async function runHistoricalProductionPr15V107(files){
 const context=await getHistoricalProductionPr15V107();assert.ok(Array.isArray(files)&&files.length>0&&new Set(files).size===files.length);
 for(const file of files)assert.ok(context.manifest.historicalTests.includes(file),'Unreviewed historical test requested');
 // Node propagates its internal child-runner marker; a separate --test run
 // must start a fresh runner instead of silently skipping the original files.
 const childEnvironment={...process.env};delete childEnvironment.NODE_TEST_CONTEXT;
 let output;
 try{output=execFileSync(process.execPath,['--test',...files],{cwd:context.root,env:childEnvironment,encoding:'utf8',timeout:90000,maxBuffer:2*1024*1024});}
 catch(error){throw new Error('Original PR15 assertions failed:\n'+String(error.stdout??'')+String(error.stderr??''),{cause:error});}
 assert.match(output,/# fail 0(?:\r?\n|$)/);await verifyHistoricalProductionPr15V107();
 return {sourceCommit:context.manifest.sourceCommit,files,output,currentRuntimeCovered:false};
}
