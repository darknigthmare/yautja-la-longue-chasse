import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(process.argv[2]||'.'),action=process.argv[3]||'install',dest=join(root,'private-dlc','campaigns','prey-2022');
if(action==='uninstall'){rmSync(dest,{recursive:true,force:true});console.log(`PREY V0.6 retiré : ${dest}`);process.exit(0)}
if(action!=='install'){console.error('usage: node INSTALLER_PREY_V0_6.mjs <repo> install|uninstall');process.exit(2)}
for(const req of ['package.json','.gitignore','.vercelignore'])if(!existsSync(join(root,req))){console.error(`Dépôt hôte invalide : ${req} absent`);process.exit(3)}
let pkg={};try{pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'))}catch{console.error('package.json illisible');process.exit(3)}
if(pkg.name!=='yautja-la-longue-chasse'){console.error(`Projet hôte inattendu : ${pkg.name||'sans nom'}`);process.exit(3)}
const gi=readFileSync(join(root,'.gitignore'),'utf8'),vi=readFileSync(join(root,'.vercelignore'),'utf8');if(!gi.split(/\r?\n/).includes('/private-dlc/')||!vi.split(/\r?\n/).includes('/private-dlc/')){console.error('Politique /private-dlc/ absente de .gitignore ou .vercelignore. Installation refusée.');process.exit(4)}
rmSync(dest,{recursive:true,force:true});mkdirSync(dest,{recursive:true});for(const name of ['INSTALLER_PREY_V0_6.mjs','VERIFIER_PREY_V0_6.mjs','JOUER_PREY_DLC_V0_6.html','JOUER_PREY_DLC_V0_6_PORTABLE.html','OUVRIR_PREY_DLC_V0_6.html','manifest.json','README.md','SHA256SUMS.txt','src','assets','docs','integration'])if(existsSync(join(here,name)))cpSync(join(here,name),join(dest,name),{recursive:true});writeFileSync(join(dest,'.installed-by'),'PREY_DLC_V0_6\n','utf8');console.log(`PREY V0.6 installé en privé : ${dest}`);console.log(`Bridge local : node ${join(dest,'integration','prey-private-dev-server-v06.mjs')}`);
