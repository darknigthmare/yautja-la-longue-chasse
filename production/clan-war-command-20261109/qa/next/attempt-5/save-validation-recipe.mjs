import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const root=process.cwd(),out=fileURLToPath(new URL('.',import.meta.url));
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const names=['app/game/save.ts','app/game/types.ts','app/game/systems/trophyTutorialV6.ts','package-lock.json'];
const source=async files=>Object.fromEntries(await Promise.all(files.map(async name=>[name,sha(await fs.readFile(path.join(root,name)))])));
const sourceBefore=await source(names);
const bundle=await build({absWorkingDir:root,stdin:{contents:"export {parseSaveImport} from './app/game/save';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,metafile:true,logLevel:'warning'});
const inputs=Object.keys(bundle.metafile.inputs).filter(name=>name!=='<stdin>');
const closureBefore=await source(inputs);
const {parseSaveImport}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const before=await fs.readFile(path.join(out,'campaign-before.json')),after=await fs.readFile(path.join(out,'campaign-after.json'));
assert.deepEqual(after,before,'Complete stored campaign bytes must be identical');
const checks=[];
for(const [name,raw] of [['before',before],['after',after]]){
  const original=JSON.parse(raw),result=parseSaveImport(raw.toString('utf8'));
  assert.equal(result.failure,null);assert.ok(result.save);
  assert.equal(result.save.createdAt,original.createdAt);
  checks.push({name,passed:true,bytes:raw.length,sha256:sha(raw),failure:result.failure,ownerCreatedAt:original.createdAt,sameOwnerAfterParse:result.save.createdAt===original.createdAt,rank:result.save.rank});
}
const sourceAfter=await source(names),closureAfter=await source(inputs);
assert.deepEqual(sourceAfter,sourceBefore);assert.deepEqual(closureAfter,closureBefore);
await fs.writeFile(path.join(out,'save-validation.json'),JSON.stringify({passed:true,bytesIdentical:true,method:'Actual current parseSaveImport read-only on both complete campaign captures, including the final legacy-tutorial compatibility helper. No sentinel substitute. No game result or callback patched.',sourceBefore,sourceAfter,closureBefore,closureAfter,bundleSha256:sha(bundle.outputFiles[0].contents),recipeSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),checks},null,2)+'\n');
console.log(JSON.stringify({passed:true,bytes:before.length,checks:checks.length,sourceFiles:inputs.length,sha256:sha(before)}));
