import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=resolve(here,'..');const src=resolve(root,'src/dlc/avpr-wolf');
let html=await readFile(resolve(src,'index.html'),'utf8');
const css=await readFile(resolve(src,'style.css'),'utf8'),data=await readFile(resolve(src,'data.js'),'utf8'),game=await readFile(resolve(src,'game.js'),'utf8');
const assetNames={wolf:'wolf-sprite-sheet.svg',wolfUnmasked:'wolf-unmasked-sprite-sheet.svg',xeno:'xeno-sprite-sheet.svg',predalien:'predalien-sprite-sheet.svg',facehugger:'facehugger-sprite-sheet.svg',human:'human-looter-sprite-sheet.svg'};
const uris={};for(const [key,name] of Object.entries(assetNames)){const raw=await readFile(resolve(src,'assets',name));uris[key]=`data:image/svg+xml;base64,${raw.toString('base64')}`;}
const assetScript=`globalThis.AVPR_WOLF_ASSET_URIS=${JSON.stringify(uris)};`;
html=html.replace('<link rel="stylesheet" href="./style.css">',`<style>${css}</style>`).replace('<script src="./data.js"></script><script src="./game.js"></script>',`<script>${assetScript}</script><script>${data}</script><script>${game}</script>`);
await writeFile(resolve(root,'JOUER_AVPR_WOLF_V07.html'),html);
console.log('Standalone construit:',resolve(root,'JOUER_AVPR_WOLF_V07.html'));
