import {build} from 'esbuild';
import fs from 'node:fs/promises';
const result=await build({stdin:{contents:"export * from './app/game/systems/homeworldContextCodexV71'; export {GAME_CONTENT_VERSION} from './app/game/buildInfo';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const model=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const records=model.HOMEWORLD_CONTEXT_CODEX_V71;
const outsideCount=records.filter(record=>record.id.startsWith('prop:outskirts-v71-')).length;
const version=Number(model.GAME_CONTENT_VERSION.slice(1));
if(!Number.isSafeInteger(version)||version<1)throw new Error('Invalid visible content version');
await fs.writeFile('docs/homeworld-context-codex-v71.json',JSON.stringify({version,lore:'original-adaptation',projection:'orthographic-south-35',
  scope:`${outsideCount} measured independent outskirts modules, 43 connected real building contexts and 43 ground frontages, functional interior layouts and the real resident routes. No added biome permissions or canonical city map.`,records},null,2)+'\n');
console.log(JSON.stringify({path:'docs/homeworld-context-codex-v71.json',records:records.length}));
