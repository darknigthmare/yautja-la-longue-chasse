import {build} from 'esbuild';
import fs from 'node:fs/promises';
const result=await build({entryPoints:['app/game/systems/homeworldContextCodexV71.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const model=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const records=model.HOMEWORLD_CONTEXT_CODEX_V71;
await fs.writeFile('docs/homeworld-context-codex-v71.json',JSON.stringify({version:71,lore:'original-adaptation',projection:'orthographic-south-35',
  scope:'139 measured independent outskirts modules, 43 connected real building contexts and 43 ground frontages. No added biome access or canonical city map.',records},null,2)+'\n');
console.log(JSON.stringify({path:'docs/homeworld-context-codex-v71.json',records:records.length}));
