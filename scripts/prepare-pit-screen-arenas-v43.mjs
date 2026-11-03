import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {manifestPath,createPlannedScreenStage,assertHistoricalArenasUnchanged} from './lib/pit-screen-arena-v43.mjs';
import {buildPitArenaRuntimeData} from './build-pit-arena-runtime-v33.mjs';
const definitions=JSON.parse(await fs.readFile('app/game/systems/pitScreenArenasV43.generated.json','utf8'));
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
await assertHistoricalArenasUnchanged(manifest);
for(const definition of definitions.arenas){
 const existing=manifest.stages.find(s=>s.number===definition.catalogueNumber||s.catalogueId===definition.id);
 if(existing){assert.equal(existing.number,definition.catalogueNumber);assert.equal(existing.catalogueId,definition.id);continue;}
 manifest.stages.push(createPlannedScreenStage(definition));
}
await assertHistoricalArenasUnchanged(manifest);
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await buildPitArenaRuntimeData();
console.log(JSON.stringify({stages:manifest.stages.length,plannedScreenDefinitions:definitions.arenas.length,historical100Unchanged:true}));
