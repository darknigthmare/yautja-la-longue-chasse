import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { serializePitArenaRuntimeData } from './build-pit-arena-runtime-v33.mjs';
const file='art-source/v33/pit-arenas/production-manifest.json',data=JSON.parse(await fs.readFile(file,'utf8'));
const targets=['arena-126-avpr-2007-hospital-roof','arena-130-avp-classic-2000-space-station'];
const untouched=JSON.stringify(data.stages.filter(s=>!targets.includes(s.catalogueId)));
for(const id of targets){
  const stage=data.stages.find(s=>s.catalogueId===id),fascia=stage.planes.find(p=>p.id==='P4').assets.find(a=>a.id==='p4-metal-fascia');
  assert(fascia&&fascia.mode==='strip-x'&&fascia.placements.length===1);
  assert([150,180].includes(fascia.placements[0].height));
  fascia.placements[0].height=180;
  stage.v62FloorCorrection={reason:'The separate fascia ended above the lower canvas edge at zoom0.8. Contact strip stays unchanged; only the authored fascia height grows from150 to180.',evidence:`docs/v62-${id}-renderer-qa.json`,pngsUnchanged:true};
}
assert.equal(JSON.stringify(data.stages.filter(s=>!targets.includes(s.catalogueId))),untouched);
await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
await fs.writeFile('app/game/pitArenaProductionData.generated.json',serializePitArenaRuntimeData(data));
console.log(JSON.stringify({corrected:targets,nativePngsChanged:0}));
