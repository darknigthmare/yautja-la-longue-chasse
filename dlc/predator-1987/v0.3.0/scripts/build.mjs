import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(readFileSync(resolve(root,'src/game-data.json'),'utf8'));
let html=readFileSync(resolve(root,'src/template.html'),'utf8');
html=html.replaceAll('__TITLE__',data.title).replaceAll('__VERSION__',data.version).replace('__CSS__',readFileSync(resolve(root,'src/styles.css'),'utf8')).replace('__DATA__',JSON.stringify(data).replace(/<\//g,'<\\/')).replace('__ENGINE__',readFileSync(resolve(root,'src/browser-engine.js'),'utf8').replace(/<\//g,'<\\/'));
writeFileSync(resolve(root,'JOUER_PREDATOR_1987.html'),html,'utf8');
console.log(`Built standalone HTML (${html.length} chars)`);
