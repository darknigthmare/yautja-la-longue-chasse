import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const layout=JSON.parse(await fs.readFile('docs/v61-stage-layout.json','utf8'));
const lifePath='app/game/data/pitStageLifeV61.json',storyPath='app/game/data/pitStageStoryV61.json';
const life=JSON.parse(await fs.readFile(lifePath,'utf8')),story=JSON.parse(await fs.readFile(storyPath,'utf8'));
const requested=process.argv[2]?.split(',')??Object.keys(layout.stages);
for(const stageId of requested){
 const spec=layout.stages[stageId];if(!spec)throw Error('Missing placement '+stageId);
 const receipt=JSON.parse(await fs.readFile(`docs/v61-generation/${stageId}.json`,'utf8'));
 const entries=Object.entries(spec.events),ambient=[],conditional=[];
 for(const [id,entry] of entries){
  const asset=receipt.assets.find(a=>a.id===id);if(!asset||asset.status!=='accepted'||asset.frames.length!==6)throw Error('Native asset not accepted '+stageId+'/'+id);
  const bytes=await fs.readFile(asset.workspacePath),sha=createHash('sha256').update(bytes).digest('hex');if(sha!==asset.sha256)throw Error('Asset changed');
  const kind=entry.trigger?'pit-story':'pit-life',src=`/game/sprites/v61/${kind}/${stageId}/${id}.png`;
  const dest=path.join('work-local/v61/public-sprites',kind,stageId,id+'.png');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(asset.workspacePath,dest);
  const event={id,...entry,src,sha256:sha,width:asset.width,height:asset.height,fps:entry.fps??3,restFrame:entry.restFrame??0,reducedMotionFrame:entry.reducedMotionFrame??entry.restFrame??0,frames:asset.frames.map(({rect,pivot,alphaBounds})=>({rect,pivot,alphaBounds}))};
  (entry.trigger?conditional:ambient).push(event);
 }
 if(ambient.length!==3)throw Error('Exactly three independent ambient assets required');
 life.stages=life.stages.filter(s=>s.stageId!==stageId).concat({stageId,events:ambient});
 if(conditional.length)story.stages=story.stages.filter(s=>s.stageId!==stageId).concat({stageId,events:conditional});
}
for(const [file,manifest] of [[lifePath,life],[storyPath,story]]){manifest.stages.sort((a,b)=>a.stageId.localeCompare(b.stageId));await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');}
console.log(JSON.stringify({ambientStages:life.stages.length,conditionalStages:story.stages.length}));
