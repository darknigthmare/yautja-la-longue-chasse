import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),pack=resolve(here,'..'),target=resolve(process.argv[2]||process.cwd());
const source=join(pack,'src','dlc','avpr-wolf'),dest=join(target,'src','dlc','avpr-wolf'),index=join(target,'index.html');
const START='<!-- AVPR_WOLF_DLC_START -->',END='<!-- AVPR_WOLF_DLC_END -->';
const BLOCK=`${START}\n<button id="title-avpr-wolf" type="button" data-dlc="avpr-wolf" onclick="location.href='/src/dlc/avpr-wolf/index.html'">DLC AVP:R — WOLF</button>\n${END}`;
await mkdir(dirname(dest),{recursive:true});await cp(source,dest,{recursive:true,force:true});let html=await readFile(index,'utf8');
if(!html.includes(START)){const anchor=/<button id="title-forge"[^>]*>[\s\S]*?<\/button>/;if(!anchor.test(html))throw new Error('Ancre title-forge introuvable : aucun patch appliqué.');html=html.replace(anchor,m=>`${m}\n${BLOCK}`);await writeFile(index,html)}
console.log(`AVP:R Wolf v0.7 installé dans ${dest}`);
