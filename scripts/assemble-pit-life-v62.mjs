import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyPitNativeV61 } from './lib/pit-stage-native-v61.mjs';
const layout=JSON.parse(await fs.readFile('docs/v62-stage-layout.json','utf8'));
const manifest={schemaVersion:1,release:'V62',stages:[]},proof=[];
for(const [stageId,spec] of Object.entries(layout.stages)){
  const events=[];
  for(const [id,entry] of Object.entries(spec.events)){
    const receiptFile=`docs/v62-generation/${stageId}-${id}.json`,receipt=JSON.parse(await fs.readFile(receiptFile,'utf8'));
    if(!['accepted','visually-accepted'].includes(receipt.status)||receipt.frames.length!==6)throw Error('Unaccepted native sheet '+receiptFile);
    const bytes=await fs.readFile(receipt.workspacePath),sha=createHash('sha256').update(bytes).digest('hex');
    if(sha!==receipt.sha256)throw Error('Native pixels changed '+receiptFile);
    const src=`/game/sprites/v62/pit-life/${stageId}/${id}.png`,dest=path.join('work-local/v62/public-sprites','pit-life',stageId,id+'.png');
    await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(receipt.workspacePath,dest);
    const event={id,...entry,src,sha256:sha,width:receipt.width,height:receipt.height,restFrame:0,reducedMotionFrame:0,
      frames:receipt.frames.map(({rect,pivot,alphaBounds})=>({rect,pivot,alphaBounds}))};
    proof.push({stageId,id,receiptFile,...await verifyPitNativeV61(event,receipt)});events.push(event);
  }
  if(events.length!==3)throw Error('Exactly three independent events required');
  manifest.stages.push({stageId,continuity:{mode:'exhibition-adaptation',sourceCells:spec.sourceCells,chapterReconstructionComplete:false,note:spec.continuityNote},events});
}
manifest.stages.sort((a,b)=>a.stageId.localeCompare(b.stageId));
await fs.writeFile('app/game/data/pitStageLifeV62.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile('docs/v62-stage-native-assets-qa.json',JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),stageCount:manifest.stages.length,nativePngs:proof.length,nativeDrawings:proof.reduce((n,p)=>n+p.nativeDrawings,0),bytes:proof.reduce((n,p)=>n+p.bytes,0),sourcePngsUntouched:true,compositorVerified:false,applicationVerified:false,proof},null,2)+'\n');
console.log(JSON.stringify({stages:manifest.stages.length,pngs:proof.length,drawings:proof.reduce((n,p)=>n+p.nativeDrawings,0)}));
