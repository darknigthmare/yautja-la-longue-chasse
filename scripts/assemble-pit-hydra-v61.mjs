import fs from 'node:fs/promises';
import path from 'node:path';
const stageId='arena-169-extinction-front';
const old=JSON.parse(await fs.readFile('app/game/data/pitStageLifeV60.json','utf8')).stages.find(s=>s.stageId===stageId);
const receipt=JSON.parse(await fs.readFile(`docs/v61-generation/${stageId}.json`,'utf8'));
const hydra=receipt.assets.find(a=>a.id==='life-02');if(hydra.status!=='accepted')throw Error('Hydra not accepted');
const stage={stageId,replacesV60Stage:true,events:[]};
for(const original of old.events){
 const id=original.id,src=`/game/sprites/v61/pit-life/${stageId}/${id}.png`,dest=path.join('work-local/v61/public-sprites','pit-life',stageId,id+'.png');
 await fs.mkdir(path.dirname(dest),{recursive:true});
 if(id==='life-02'){
  await fs.copyFile(hydra.workspacePath,dest);
  stage.events.push({...original,name:'Hydra — contrôle de la batterie dorsale',src,sha256:hydra.sha256,width:hydra.width,height:hydra.height,placement:hydra.placement,frames:hydra.frames.map(({rect,pivot,alphaBounds})=>({rect,pivot,alphaBounds})),excludedFighterIds:['user-extinction-hydra']});
 }else{
  await fs.copyFile(path.join('public',original.src),dest);
  stage.events.push({...original,src,reusedV60EventId:id});
 }
}
const file='app/game/data/pitStageLifeV61.json',manifest=JSON.parse(await fs.readFile(file,'utf8'));
manifest.stages=manifest.stages.filter(s=>s.stageId!==stageId).concat(stage).sort((a,b)=>a.stageId.localeCompare(b.stageId));
await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({stageId,newAtlases:1,reusedV60Atlases:2,unchangedV60Manifest:true}));
