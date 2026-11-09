/** The bible is authoritative. Runtime JSON is a byte-identical build input,
 * not a second hand-maintained roster. No dependency on docs/ in the client. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length!==1||!['--check','--write'].includes(args[0])){
  console.error('Usage: node scripts/sync-mobility-catalogue.mjs --check | --write');process.exit(2);
}
const names=['01-10.json','11-20.json','21-30.json','31-40.json','41-50.json'];
const source=path.join(root,'docs/campagne/mobilite/catalogue');
const target=path.join(root,'app/game/systems/mobility/catalogue-source');
const files=names.map(name=>({name,bytes:fs.readFileSync(path.join(source,name))}));
const entries=files.flatMap(f=>{
 const values=JSON.parse(f.bytes.toString('utf8'));
 if(!Array.isArray(values)||values.length!==10)throw Error('Ten canonical rows required: '+f.name);
 return values;
});
if(entries.length!==50||new Set(entries.map(e=>e.id)).size!==50||entries.some(e=>!e.id||!e.name))throw Error('Invalid canonical catalogue');
for(const f of files){
 const file=path.join(target,f.name);
 if(args[0]==='--write'){fs.mkdirSync(target,{recursive:true});fs.writeFileSync(file,f.bytes);}
 if(!fs.existsSync(file)||!fs.readFileSync(file).equals(f.bytes))throw Error('Runtime projection differs: '+f.name+'; run --write after reviewing bible edits');
}
console.log(JSON.stringify({passed:true,canonical_models:50,byte_identical_files:5,files:files.map(f=>({name:f.name,sha256:createHash('sha256').update(f.bytes).digest('hex')}))}));
