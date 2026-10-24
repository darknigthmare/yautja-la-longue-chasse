/** Publish an executed recipe losslessly, after its real captures were opened. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {snapshotRuntimeV108} from './snapshot-runtime-v108.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const local=file=>typeof file==='string'&&file&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
const pin=async file=>{const bytes=await fs.readFile(path.join(ROOT,file));return{path:file,sha256:sha(bytes),bytes:bytes.length};};

export async function publishValidationDomainV108({domain,input,driver,opened,runtimeCommit,buildId}){
 assert.ok(['Pit','Homeworld','Clans','Preserve'].includes(domain));
 assert.ok(local(driver)&&/^scripts\/qa-.+-v108\.mjs$/.test(driver));
 assert.match(runtimeCommit??'',/^[a-f0-9]{40}$/);assert.ok(buildId);
 assert.equal((await fs.readFile(path.join(ROOT,'.next/BUILD_ID'),'utf8')).trim(),buildId);
 const freeze=JSON.parse(await fs.readFile(path.join(ROOT,'docs/v108-runtime-freeze.json'),'utf8'));
 assert.deepEqual(await snapshotRuntimeV108(),freeze,'Runtime changed since the production freeze');
 const bytes=await fs.readFile(input);assert.ok(bytes.length>0&&bytes.length<=256*1024*1024);
 const raw=JSON.parse(bytes);assert.equal(raw.status,'PASS');assert.equal(raw.runtimeCommit,runtimeCommit);assert.equal(raw.buildId,buildId);
 assert.ok(['compiled-app','production'].includes(raw.mode));
 assert.ok(raw.checks.length>0&&raw.checks.every(row=>row.status==='PASS'));
 assert.deepEqual(raw.errors??raw.browserErrors,[]);assert.ok(raw.servedBuilds.length);
 for(const response of raw.servedBuilds){assert.equal(response.status,200);assert.equal(response.expectedBuildId,buildId);assert.equal(response.foundInHtml,true);}
 assert.ok(raw.sourceBefore.length>0);assert.deepEqual(raw.sourceBefore,raw.sourceAfter);
 assert.ok(raw.sourceAfter.some(row=>(row.path??row.file)===driver),'Executed driver absent from its own evidence');
 const frozen=new Map(freeze.entries.map(row=>[row.path,row]));
 for(const row of raw.sourceAfter){const file=row.path??row.file;assert.ok(local(file));const actual=await pin(file);assert.equal(actual.sha256,row.sha256,'Executed source changed: '+file);if(row.bytes!==undefined)assert.equal(actual.bytes,row.bytes);
  if(file.startsWith('app/')||file.startsWith('public/'))assert.equal(frozen.get(file)?.sha256,row.sha256,'Executed input absent from freeze: '+file);
 }
 assert.ok(Array.isArray(opened)&&opened.length>0&&new Set(opened).size===opened.length);
 assert.ok(Array.isArray(raw.captures)&&raw.captures.length>0);
 const captureNames=raw.captures.map(row=>row.file);assert.equal(new Set(captureNames).size,captureNames.length);
 assert.deepEqual([...opened].sort(),[...captureNames].sort(),'Open every recipe capture before publication');
 const slug=domain.toLowerCase(),base='docs/qa/v108-'+slug;
 await fs.mkdir(path.join(ROOT,base),{recursive:true});
 const portableFiles=[],captures=[];
 const rawFile=base+'/browser-result.json.gz';await fs.writeFile(path.join(ROOT,rawFile),gzipSync(bytes,{level:9,mtime:0}));
 portableFiles.push({...await pin(rawFile),decodedSha256:sha(bytes),decodedBytes:bytes.length});
 for(const capture of raw.captures){
  assert.ok(local(capture.file)&&capture.file.endsWith('.png'));const source=await fs.readFile(path.resolve(path.dirname(input),capture.file));
  assert.equal(sha(source),capture.sha256);assert.equal(source.length,capture.bytes);
  const file=base+'/'+capture.file;await fs.mkdir(path.dirname(path.join(ROOT,file)),{recursive:true});await fs.writeFile(path.join(ROOT,file),source);
  const fingerprint=await pin(file);portableFiles.push(fingerprint);captures.push({file,sha256:fingerprint.sha256,bytes:fingerprint.bytes});
 }
 const command=raw.invocation?.command??'node '+driver;assert.ok(command.includes('node '+driver));
 const report={schemaVersion:1,release:'V108',status:'PASS_CIBLE',scope:raw.scope,
  production:{mode:'production',runtimeCommit,buildId,browserErrors:0,checksFailed:0,checksPassed:raw.checks.length,servedBuilds:raw.servedBuilds},
  invocation:raw.invocation??{command},sourceBefore:raw.sourceBefore,sourceAfter:raw.sourceAfter,
  checks:raw.checks,captures,capturesOpened:captures.map(row=>row.file),rawEvidence:portableFiles[0]};
 const reportFile='docs/v108-'+slug+'-validation.json';await fs.writeFile(path.join(ROOT,reportFile),JSON.stringify(report,null,2)+'\n');
 const entry={domain,status:'PASS_CIBLE',buildId,runtimeCommit,driver,command,report:await pin(reportFile),
  browserChecksPassed:raw.checks.length,capturesInspected:opened.length,portableFiles};
 await fs.writeFile(path.join(ROOT,base,'entry.json'),JSON.stringify(entry,null,2)+'\n');
 return entry;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const options={};for(let i=2;i<process.argv.length;i+=2){assert.ok(process.argv[i].startsWith('--')&&process.argv[i+1]);const key=process.argv[i].slice(2);assert.ok(['domain','input','driver','opened','runtimeCommit','buildId'].includes(key));assert.ok(!Object.hasOwn(options,key));options[key]=process.argv[i+1];}
 options.opened=JSON.parse(await fs.readFile(options.opened,'utf8'));const result=await publishValidationDomainV108(options);console.log(JSON.stringify({domain:result.domain,checks:result.browserChecksPassed,captures:result.capturesInspected,report:result.report}));
}
