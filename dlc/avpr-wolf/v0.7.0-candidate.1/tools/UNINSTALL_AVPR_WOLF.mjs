import { readFile, rm, writeFile } from 'node:fs/promises';import { join, resolve } from 'node:path';
const target=resolve(process.argv[2]||process.cwd()),index=join(target,'index.html'),dest=join(target,'src','dlc','avpr-wolf');const START='<!-- AVPR_WOLF_DLC_START -->',END='<!-- AVPR_WOLF_DLC_END -->';
let html=await readFile(index,'utf8');const a=html.indexOf(START),b=html.indexOf(END);if(a>=0&&b>=a){html=html.slice(0,a)+html.slice(b+END.length);await writeFile(index,html)}await rm(dest,{recursive:true,force:true});console.log('AVP:R Wolf retiré.');
