import fs from 'node:fs/promises';
import path from 'node:path';
const old = JSON.parse(await fs.readFile('app/game/data/pitStageLifeV60.json', 'utf8'));
const registryPath = 'app/game/data/pitStageStoryV61.json';
const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
for(const spec of [
  {stageId:'arena-165-kenner-throne',id:'victory-salute',replace:'life-01',name:'Garde anonyme — salut de victoire',trigger:'round-victory'},
  {stageId:'arena-185-training',id:'round-judgment',replace:'life-03',name:'Arbitre anonyme — jugement de fin de manche',trigger:'round-end'},
  {stageId:'arena-173-phg-japan',id:'round-bell',name:'Cloche de départ — frappe unique du battant',trigger:'round-start'},
]){
  const receipt=JSON.parse(await fs.readFile(`docs/v61-generation/${spec.stageId}-${spec.id}.json`,'utf8'));
  if(receipt.status!=='visually-accepted'||receipt.frames.some(f=>f.borderSolidPixels>0))throw Error('Unreviewed or clipped image');
  const original=old.stages.find(s=>s.stageId===spec.stageId)?.events.find(e=>e.id===spec.replace);
  const placement=original?{...original.placement,height:Number((original.placement.height/original.frames[0].rect[3]*original.frames[0].alphaBounds[3]/receipt.frames[0].alphaBounds[3]*receipt.frames[0].rect[3]).toFixed(4))}:{x:305,bottom:171,height:120,parallax:.05,renderPass:'P1',anchor:'world'};
  const src=`/game/sprites/v61/pit-story/${spec.stageId}/${spec.id}.png`;
  const destination=path.join('work-local/v61/public-sprites','pit-story',spec.stageId,`${spec.id}.png`);
  await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(receipt.workspacePath,destination);
  const event={id:spec.id,name:spec.name,src,sha256:receipt.sha256,width:receipt.width,height:receipt.height,fps:3,restFrame:0,reducedMotionFrame:0,placement,frames:receipt.frames.map(({rect,pivot,alphaBounds})=>({rect,pivot,alphaBounds})),trigger:spec.trigger,idleVisibility:original?'hidden':'rest',...(spec.replace?{replacesAmbientEventId:spec.replace}:{})};
  let stage=registry.stages.find(s=>s.stageId===spec.stageId);if(!stage){stage={stageId:spec.stageId,events:[]};registry.stages.push(stage);}stage.events=stage.events.filter(e=>e.id!==spec.id).concat(event);
}
registry.stages.sort((a,b)=>a.stageId.localeCompare(b.stageId));
await fs.writeFile(registryPath,JSON.stringify(registry,null,2)+'\n');
console.log(JSON.stringify({stages:registry.stages.length,events:registry.stages.reduce((n,s)=>n+s.events.length,0)}));
