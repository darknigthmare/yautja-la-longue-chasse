import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const m=JSON.parse(await readFile(resolve(root,'integrity.json'),'utf8'));const failures=[];let checked=0;
for(const [rel,expected] of Object.entries(m.files)){try{const b=await readFile(resolve(root,rel));const sha=createHash('sha256').update(b).digest('hex');if(b.length!==expected.bytes||sha!==expected.sha256)failures.push({rel,expected,actual:{bytes:b.length,sha256:sha}});checked++}catch(e){failures.push({rel,error:e.code||e.message})}}
if(failures.length){console.error(JSON.stringify({ok:false,checked,failures},null,2));process.exit(1)}console.log(JSON.stringify({ok:true,checked,algorithm:m.algorithm,version:m.version},null,2));
