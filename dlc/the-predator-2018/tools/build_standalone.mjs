import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const index=readFileSync(resolve(root,'web/index.html'),'utf8');
const css=readFileSync(resolve(root,'web/style.css'),'utf8');
const data=readFileSync(resolve(root,'web/data.js'),'utf8');
const game=readFileSync(resolve(root,'web/game.js'),'utf8');
const token="window.__TP_QA_QUERY=window.__TP_QA_QUERY||'';";
let html=index
 .replace('<link rel="stylesheet" href="style.css">',()=>`<style>\n${css}\n</style>`)
 .replace('<script src="data.js"></script><script src="game.js"></script>',()=>`<script>${token}</script><script>\n${data}\n</script><script>\n${game}\n</script>`);
if(html===index) throw new Error('Standalone build markers not found');
writeFileSync(resolve(root,'JOUER_THE_PREDATOR_2018_V0_5.html'),html);
console.log(`Standalone v0.5 écrit (${Buffer.byteLength(html)} octets)`);
