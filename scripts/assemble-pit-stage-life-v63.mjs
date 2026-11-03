import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const write=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');};
const seeds=await read('work-local/v63/stage-seeds.json');
const roof='arena-126-avpr-2007-hospital-roof',station='arena-130-avp-classic-2000-space-station';
const names={
 [roof]:['Gaine vibrante — raccord fixé au bloc HVAC','Lumières urbaines — variation lente distante','Panache avant destruction — cheminée de fond'],
 [station]:['Piston de maintenance — derrière barrière','Purge intermittente — conduite du fond','Trappe de contrôle — voyant ambre stable'],
};
const placements={
 [roof]:[[555,273,56,.05,'P2'],[210,213,170,.05,'P1'],[749,200,77,.05,'P1']],
 [station]:[[180,252,70,.05,'P2'],[316,198,73,.05,'P1'],[679,171,67,.05,'P2']],
};
const base=await read('app/game/data/pitStageLifeV62.json');
const stages=[];
for(const stageId of [roof,station]){
 const old=base.stages.find(s=>s.stageId===stageId);
 const events=old.events.filter(e=>stageId!==roof||e.id!=='ambient-01').map(e=>({...e,reusedV62EventId:e.id}));
 for(let index=0;index<3;index++){
  const id=`ambient-0${index+4}`,r=await read(`docs/v63-generation/${stageId}-${id}.json`);
  const src=`/game/sprites/v63/pit-life/${stageId}/${id}.png`;
  await fs.mkdir(path.dirname('public'+src),{recursive:true});await fs.copyFile(r.workspacePath,'public'+src);
  const [x,bottom,height,parallax,renderPass]=placements[stageId][index];
  events.push({id,name:names[stageId][index],fps:stageId===roof&&index===1?1:2,restFrame:0,reducedMotionFrame:0,
   placement:{x,bottom,height,parallax,renderPass,anchor:'world'},src,sha256:r.sha256,width:r.width,height:r.height,
   frames:r.frames.map(({rect,pivot,alphaBounds})=>({rect,pivot,alphaBounds}))});
 }
 stages.push({stageId,replacesV62Stage:true,suppressedV62Events:stageId===roof?[{id:'ambient-01',sourceCell:'10_VIE_DES_STAGES!E62',reason:'ST167/E505 interdit les spectateurs civils sur ce toit ; PNG V62 conservé, ancien événement E62 non livré dans cette continuité.'}]:[],
  continuity:{mode:'exhibition-adaptation',sourceCells:(stageId===roof?[503,504,505]:[512,513,514]).map(n=>`10_VIE_DES_STAGES!E${n}`),chapterReconstructionComplete:false,
   note:'Ambiances originales adaptées aux demandes du classeur ; aucune reconstruction canonique exacte de machinerie ou de chapitre revendiquée.'},events});
}
await write('app/game/data/pitStageLifeV63.json',{schemaVersion:1,release:'V63',stages});
await write('docs/v63-stage-requests.json',{schemaVersion:1,generator:'built-in-imagegen',requests:seeds});
const nativePath='C:/Users/chuck/.codex/generated_images/01a0f3e9-692a-7751-b7cb-3b41ede4d39a/exec-29c5fe6a-b993-4973-87a9-db2df0ccdf8a.png';
const bytes=await fs.readFile(nativePath),meta=await sharp(bytes).metadata(),sha256=createHash('sha256').update(bytes).digest('hex');
const src=`/game/sprites/v63/pit-arenas/${roof}/p0-depth.png`;
await fs.mkdir(path.dirname('public'+src),{recursive:true});await fs.copyFile(nativePath,'public'+src);
await write(`docs/v63-generation/${roof}-p0-depth.json`,{schemaVersion:1,mode:'built-in-imagegen',nativePath,workspacePath:'public'+src,sha256,width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha??false,copyByteIdentical:true,status:'visually-accepted',
 prompt:'Precise object edit: erase every small human-shaped mark in the gap between the rightmost HVAC unit and stairwell, above the railing. Reconstruct empty blue distant mountain, preserving framing, roof, machinery, railings, weather and lighting. No people anywhere.',
 originalPath:`/game/sprites/v43/pit-arenas/${roof}/p0-depth.png`,originalSha256:'239b9f095a7f4576f7ac7338c1abbdd7f99744221a8b6d4e663184b303e9ae4f',
 rejectedAttempts:['exec-29fd7b92-a9af-4729-8b8f-37b13d11d3c9.png','exec-1fbdd2df-0cf9-4b94-8c05-855c6efa55cb.png'],visualNotes:'Third native edit removes person-shaped marks from the distant right opening. Original geometry retained; scene remains an original adaptation, not certified film-exact art.'});
const previous=await read('app/game/data/pitStageCompositionV63.json').catch(()=>({corrections:[]}));
await write('app/game/data/pitStageCompositionV63.json',{schemaVersion:1,release:'V63',corrections:[...previous.corrections.filter(c=>c.stageId!==roof||c.assetId!=='p0-depth'),{stageId:roof,assetId:'p0-depth',sourceSha256:'239b9f095a7f4576f7ac7338c1abbdd7f99744221a8b6d4e663184b303e9ae4f',
 frame:{path:src,status:'reviewed',generation:{generator:'openai-imagegen',source:`docs/v63-generation/${roof}-p0-depth.json`,sha256,width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha??false,contentBounds:{x:0,y:0,width:meta.width,height:meta.height}},
 review:{evidence:'docs/v63-stage-composition-visual-review.json',coherence:true,layout:true,alpha:true}}}]});
console.log(JSON.stringify({stages:stages.map(s=>({id:s.stageId,events:s.events.length})),newPngs:7,newAnimationDrawings:36}));
