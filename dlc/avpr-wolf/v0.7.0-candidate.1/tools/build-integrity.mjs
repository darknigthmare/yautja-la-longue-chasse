import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['integrity.json','docs/qa/integrity-build.json','docs/qa/integrity-verify.json','docs/qa/integrity-build-v06.json','docs/qa/integrity-verify-v06.json','docs/qa/integrity-build-v07.json','docs/qa/integrity-verify-v07.json']);
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p)}return out}
const files={};for(const p of (await walk(root)).sort()){const rel=relative(root,p).replaceAll('\\','/');if(ignored.has(rel))continue;const b=await readFile(p);files[rel]={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}}
const result={version:'0.7.0-candidate.1',algorithm:'sha256',generatedAt:new Date().toISOString(),fileCount:Object.keys(files).length,files};
await writeFile(resolve(root,'integrity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({ok:true,fileCount:result.fileCount},null,2));
