import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const host=path.resolve(process.argv[2]||'.'),here=path.resolve(new URL('..',import.meta.url).pathname),target=path.join(host,'dlc','avp-predator-2004'),indexPath=path.join(host,'index.html');
if(!fs.existsSync(indexPath)){console.error('index.html Tantalus introuvable:',indexPath);process.exit(2)}
const marker='<!-- DLC_AVP_PREDATOR_2004 -->',anchor='<button id="title-options" type="button">SYSTÈME</button>',link=`${marker}\n        <a id="title-dlc-avp-predator" class="button" href="/dlc/avp-predator-2004/AVP_PREDATOR_STANDALONE_V0_5.html">DLC AVP — RITE YAUTJA</a>`;
let index=fs.readFileSync(indexPath,'utf8');if(!index.includes(anchor)&&!index.includes(marker)){console.error('Signature title-menu non trouvée; aucune modification.');process.exit(3)}
const backup=indexPath+'.before-avp-predator';if(!fs.existsSync(backup))fs.copyFileSync(indexPath,backup);
fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
for(const file of ['AVP_PREDATOR_STANDALONE_V0_5.html','JOUER_AVP_PREDATOR_V0_5.html','README.md','CHANGELOG.md','DLC_PACKAGE.json'])fs.copyFileSync(path.join(here,file),path.join(target,file));
for(const dir of ['src','assets','docs','tests'])fs.cpSync(path.join(here,dir),path.join(target,dir),{recursive:true});
if(index.includes(marker))index=index.replace(/<!-- DLC_AVP_PREDATOR_2004 -->\n\s*<a id="title-dlc-avp-predator"[^>]*>DLC AVP — RITE YAUTJA<\/a>/,link);else index=index.replace(anchor,anchor+'\n        '+link);fs.writeFileSync(indexPath,index);
const entry=path.join(target,'AVP_PREDATOR_STANDALONE_V0_5.html'),sum=crypto.createHash('sha256').update(fs.readFileSync(entry)).digest('hex');console.log('Installé / mis à jour:',target);console.log('index backup:',backup);console.log('sha256:',sum);
