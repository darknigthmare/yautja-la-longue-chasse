#!/usr/bin/env node
/** Current application inputs, separate from the immutable R1/R7 publications. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const file=path.join(root,'docs/qa/v112-hunt-integration/source-inputs.json');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const [mode]=process.argv.slice(2);assert.equal(process.argv.length,3);assert.ok(['--write','--check'].includes(mode));
const before=mode==='--check'?JSON.parse(await readFile(file,'utf8')):null;
const sourceRef=before?.sourceRef??git(['rev-parse','HEAD']);
assert.match(sourceRef,/^[a-f0-9]{40}$/);
execFileSync('git',['merge-base','--is-ancestor',sourceRef,'HEAD'],{cwd:root,stdio:'pipe'});
const paths=git(['ls-files','-z']).split('\0').filter(name=>/^(app|scripts|tests|build|worker)\//.test(name)||
  /^(package(?:-lock)?\.json|(?:next|vite|eslint|postcss)\.config\.[a-z]+|tsconfig\.json|\.openai\/hosting\.json|\.github\/workflows\/(audit-v94|hunt-closure-v112)\.yml)$/.test(name)).sort();
assert.equal(new Set(paths).size,paths.length);
const entries=[];
for(const name of paths){
 assert.ok(!path.isAbsolute(name)&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'));
 const raw=await readFile(path.join(root,name));entries.push({path:name,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')});
}
const result={schemaVersion:1,sourceRef,scope:'Tracked application, runtime/build configuration, scripts, tests and their fixtures, and the two affected CI workflows. This source fingerprint does not execute archived browser journeys, certify all artwork, qualify physical hardware or replace the separate workbook checks. Historical Homeworld publications keep their own documents and identities.',files:entries.length,bytes:entries.reduce((sum,row)=>sum+row.bytes,0),entries};
if(mode==='--check')assert.deepEqual(result,before,'Current integration source differs from its declared inputs');
else{await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({result:mode==='--check'?'PASS_CURRENT_SOURCE_INPUTS':'CURRENT_SOURCE_INPUTS_WRITTEN',sourceRef,files:result.files,bytes:result.bytes}));
