#!/usr/bin/env node
/** Authorised C derivatives only; never writes or renames any source A/B/R. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createNeutralMask,METHOD} from './neutral-mask-pixels.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const PACK='production/biomasks-neutral-20261113';
const PUBLIC='public/game/biomasks-neutral-20261113';
const args=process.argv.slice(2);
let inventoryPath=PACK+'/inputs/neutral-inventory.json';
if(args.length){if(args.length!==2||args[0]!=='--inventory')throw Error('Use --inventory <repo-relative JSON>');inventoryPath=args[1];}
function repo(value){if(typeof value!=='string'||!value||path.isAbsolute(value)||value.includes('\\')||value.split('/').includes('..'))throw Error('Normalized repository-relative path required');return path.join(ROOT,value);}
function sha(bytes){return createHash('sha256').update(bytes).digest('hex');}
const inventoryRaw=await fs.readFile(repo(inventoryPath)),inventory=JSON.parse(inventoryRaw);
const receiptPath=PACK+'/generation/neutral-derivations.json';
let receipt={schemaVersion:1,method:METHOD,scope:'User-authorized deterministic RGB-only C derivation; no new ImageGen,canonical,human or runtime validation',entries:[]};
try{receipt=JSON.parse(await fs.readFile(repo(receiptPath),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const known=new Map(receipt.entries.map(e=>[e.id,e]));
for(const entry of inventory.entries){
 if(!/^[a-z0-9][a-z0-9_-]+$/.test(entry.id))throw Error('Unsafe ID');
 const assetPath=PUBLIC+'/neutral/'+entry.id+'.png',source=entry.sourceB;
 if(known.has(entry.id)){
  const old=known.get(entry.id);
  if(old.sourceBPath!==source.path||old.sourceBSha256!==source.sha256||old.assetPath!==assetPath||sha(await fs.readFile(repo(assetPath)))!==old.sha256)throw Error('Existing C receipt/source bytes differ; refusing a rewrite');
  continue;
 }
 const result=await createNeutralMask({sourcePath:repo(source.path),outputPath:repo(assetPath),expectedSourceSha256:source.sha256});
 const {sourcePath:absoluteSource,outputPath:absoluteOutput,processor,...facts}=result;
 const row={...facts,id:entry.id,version:'C',assetPath,sourceBPath:source.path,sourceBSha256:source.sha256,
  sourceStatus:entry.sourceStatus,toolVersions:{node:processor.node,sharp:processor.sharp,vips:processor.vips},
  generationReceipt:receiptPath,canonCertified:false,humanArtValidated:false,runtimeIntegrated:false};
 known.set(entry.id,row);receipt.entries=[...known.values()].sort((a,b)=>a.id.localeCompare(b.id));
 receipt.sourceInventory={path:inventoryPath,sha256:sha(inventoryRaw)};
 await fs.mkdir(path.dirname(repo(receiptPath)),{recursive:true});
 const temp=repo(receiptPath)+'.pending';await fs.writeFile(temp,JSON.stringify(receipt,null,2)+'\n');await fs.rename(temp,repo(receiptPath));
 if(known.size%10===0||known.size===inventory.entries.length)console.log(JSON.stringify({completed:known.size,selected:inventory.entries.length,id:entry.id}));
}
console.log(JSON.stringify({sourceRecords:inventory.entries.length,completed:receipt.entries.length,newImageGenPngs:0,derived:receipt.entries.filter(r=>r.derivedNew).length,reused:receipt.entries.filter(r=>!r.derivedNew).length,receipt:receiptPath}));
