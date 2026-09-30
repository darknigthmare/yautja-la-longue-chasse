import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {serializePitArenaRuntimeData,verifyPitArenaSourceReferences} from './build-pit-arena-runtime-v33.mjs';
import {V55_PLAN_PATH,V55_RECEIPTS_PATH,V55_RUNTIME_PATH,validateV55Plan,v55RuntimeProjection,verifiedV55P0,composeV55Stage,writeV55Artifacts} from './lib/pit-stage-plan-v55.mjs';
const manifestPath='art-source/v33/pit-arenas/production-manifest.json';
const manifest=JSON.parse(await fs.readFile(manifestPath)),baseline=JSON.stringify(manifest.stages.filter(s=>s.number<=138));
const bundle=await build({stdin:{contents:'export {PIT_VERSUS_FIGHTER_IDS} from "./app/game/systems/pitRosterExpansion"; export {PIT_ORIGINAL_FIGHTER_IDS_V56} from "./app/game/systems/pitOriginalFightersV56";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {PIT_VERSUS_FIGHTER_IDS,PIT_ORIGINAL_FIGHTER_IDS_V56}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
// This source batch predates the three explicitly separate V56 original profiles.
const v55RosterIds=PIT_VERSUS_FIGHTER_IDS.filter(id=>!PIT_ORIGINAL_FIGHTER_IDS_V56.includes(id));
const plan=validateV55Plan(JSON.parse(await fs.readFile(V55_PLAN_PATH)),{existingStages:manifest.stages.filter(s=>s.number<=138),rosterIds:v55RosterIds});
const records=JSON.parse(await fs.readFile(V55_RECEIPTS_PATH)),measurementCache=new Map();
for(const spec of [...plan.stages].sort((a,b)=>a.number-b.number)){
 const existing=manifest.stages.find(s=>s.catalogueId===spec.id);assert(!existing?.runtimeEnabled,'Cannot replace an approved composition without review invalidation');
 const p0=await verifiedV55P0(spec,records),stage=await composeV55Stage(spec,manifest,p0,{measurementCache,records});
 if(existing)manifest.stages[manifest.stages.indexOf(existing)]=stage;else manifest.stages.push(stage);
}
assert.equal(JSON.stringify(manifest.stages.filter(s=>s.number<=138)),baseline,'All historical138 records stay byte-equivalent');
await verifyPitArenaSourceReferences(manifest);
await writeV55Artifacts([[manifestPath,JSON.stringify(manifest,null,2)+'\n'],['app/game/pitArenaProductionData.generated.json',serializePitArenaRuntimeData(manifest)],[V55_RUNTIME_PATH,JSON.stringify(v55RuntimeProjection(plan),null,2)+'\n']]);
console.log(JSON.stringify({prepared:plan.stages.length,associations:plan.associations.length,runtimeEnabled:false,historical138Unchanged:true}));
