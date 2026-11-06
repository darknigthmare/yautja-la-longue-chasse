import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(process.argv[2]||'.');
const action=process.argv[3]||'install';
const game=join(root,'app','game'),target=join(game,'CampaignMainMenu.tsx');
const backup=join(game,'.CampaignMainMenu.prey-v06.backup');
const receipt=join(game,'.CampaignMainMenu.prey-v06.json');
const card=join(game,'PreyPrivateDlcCard.tsx'),adapter=join(game,'preyPrivateDlcAdapterV06.ts');
const sha=text=>createHash('sha256').update(text).digest('hex');
if(action==='uninstall'){
 if(!existsSync(backup)||!existsSync(receipt)){console.log('Carte PREY V0.6 non installée.');process.exit(0)}
 const meta=JSON.parse(readFileSync(receipt,'utf8'));const current=readFileSync(target,'utf8');
 if(sha(current)!==meta.patchedSha){console.error('CampaignMainMenu.tsx a changé depuis l’installation. Désinstallation automatique refusée pour ne pas écraser ces modifications.');process.exit(6)}
 writeFileSync(target,readFileSync(backup));rmSync(backup,{force:true});rmSync(receipt,{force:true});rmSync(card,{force:true});rmSync(adapter,{force:true});console.log('Carte locale PREY V0.6 retirée et CampaignMainMenu restauré.');process.exit(0)
}
if(action!=='install'){console.error('usage: node APPLIQUER_CARTE_PREY_LOCALE_V0_6.mjs <repo> install|uninstall');process.exit(2)}
if(!existsSync(target)){console.error('app/game/CampaignMainMenu.tsx absent');process.exit(3)}
if(existsSync(backup)||existsSync(receipt)){console.error('Une installation PREY V0.6 semble déjà présente.');process.exit(4)}
let source=readFileSync(target,'utf8');
if(source.includes('PREY_PRIVATE_DLC_V06')){console.error('Marqueur PREY V0.6 déjà présent.');process.exit(4)}
const importNeedle="import styles from './CampaignMainMenu.module.css';";
const insertNeedle="{catalog?.slots.every(s=>s.status!=='empty')&&<p className={styles.notice}>";
if(!source.includes(importNeedle)||!source.includes(insertNeedle)){console.error('CampaignMainMenu.tsx ne correspond pas au contrat testé. Aucun fichier modifié.');process.exit(5)}
const original=source;
source=source.replace(importNeedle,`${importNeedle}\nimport PreyPrivateDlcCard from './PreyPrivateDlcCard'; // PREY_PRIVATE_DLC_V06`);
source=source.replace(insertNeedle,`{process.env.NODE_ENV==='development'&&<PreyPrivateDlcCard/>}/* PREY_PRIVATE_DLC_V06 */\n     ${insertNeedle}`);
writeFileSync(backup,original,'utf8');writeFileSync(target,source,'utf8');
copyFileSync(join(here,'PreyPrivateDlcCard.tsx'),card);copyFileSync(join(here,'preyPrivateDlcAdapterV06.ts'),adapter);
writeFileSync(receipt,JSON.stringify({version:'0.6.0',originalSha:sha(original),patchedSha:sha(source),target:'app/game/CampaignMainMenu.tsx'},null,2)+'\n');
console.log('Carte PREY V0.6 ajoutée au menu principal en mode développement uniquement.');
console.log('Cette opération est locale et réversible ; aucun push ni déploiement n’est effectué.');
