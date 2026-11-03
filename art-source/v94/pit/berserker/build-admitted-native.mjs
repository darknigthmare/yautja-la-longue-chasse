import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import assert from 'node:assert/strict';

const folder='art-source/v94/pit/berserker', publicFolder='public/game/sprites/v94/pit/berserker';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8')), sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const geometry=read(folder+'/partial-native-geometry.json'), prompts=read(folder+'/prompts.json');
const variantId='berserker-avec-casque-ba1f7a7b1e';
const reference={path:'public/game/sprites/v44/user-hunters/ba1f7a7b1e6b20360c7506f17a73dd9ca35caa38599b91dac8eb09fa8f494dfc.png',sha256:'ba1f7a7b1e6b20360c7506f17a73dd9ca35caa38599b91dac8eb09fa8f494dfc'};
assert.equal(sha(fs.readFileSync(reference.path)),reference.sha256);
// Only original safely isolated right-side drawings pass this bounded review.
// Left-side asymmetrical equipment is unverified; no reflected substitute.
const use={2:'all-right',3:'first-row-right',4:'all-right',5:'all-right',6:'all-right',7:'last-two-rows-right',9:'all-right',10:'last-two-rows-right'};
// The generator changed source stature across pages. Each page has one upright
// witness, fixed across every pose on that page, including low defeat poses.
const stature={2:{row:0,col:1,height:370},3:{row:0,col:0,height:384},4:{row:1,col:0,height:414},5:{row:0,col:0,height:404},6:{row:0,col:0,height:437},7:{row:0,col:0,height:443},9:{row:0,col:0,height:396},10:{row:2,col:1,height:385}};
const families=[{id:'intro',sequences:[2,3],ticks:72},{id:'victory',sequences:[4,5],ticks:120},{id:'defeat',sequences:[6,7],ticks:120},{id:'taunt',sequences:[9,10],ticks:90}];
const selected=new Map(),archives=[];
for(const prompt of prompts.pages){
 const sourcePath=folder+'/'+prompt.file;
 if(!fs.existsSync(sourcePath)){assert.equal(prompt.sequence,8);archives.push({sequence:8,file:prompt.file,decision:'generation-failed-no-png',sourcePath:null,sha256:null,runtimeAcceptedDrawings:0,reason:'Built-in output moderation_blocked; no replacement or bypass',errorPath:folder+'/008-generation-error.txt'});continue;}
 const page=geometry.pages.find(p=>p.file===prompt.file), bytes=fs.readFileSync(sourcePath), metadata=await sharp(bytes).metadata();
 assert.equal(sha(bytes),page.sourceSha256);assert.equal(metadata.hasAlpha,true);
 const mode=use[prompt.sequence];
 const accepted=page.cells.filter(c=>c.facing==='right'&&mode&&(mode!=='first-row-right'||c.row===0)&&(mode!=='last-two-rows-right'||c.row>=1));
 for(const cell of accepted)assert(cell.borderAlpha<=2&&cell.foregroundPixels>10000);
 selected.set(prompt.sequence,{prompt,page,accepted});
 const raw=await sharp(bytes).ensureAlpha().raw().toBuffer();let transparentPixels=0;for(let at=3;at<raw.length;at+=4)if(raw[at]===0)transparentPixels++;
 archives.push({sequence:prompt.sequence,file:prompt.file,sourcePath,sha256:sha(bytes),bytes:bytes.length,width:metadata.width,height:metadata.height,hasAlpha:true,transparentPixels,generatorOriginalBasename:prompt.generatorOriginalBasename,pixelTransformation:'none-byte-identical-copy',decision:accepted.length?'accepted-partial-right-only':'refused',runtimeAcceptedDrawings:accepted.length,
  acceptedCells:accepted,excludedCells:Array.from({length:page.rows},(_,row)=>Array.from({length:4},(_,col)=>({row,col,facing:col<2?'right':'left'}))).flat().filter(c=>!accepted.some(a=>a.row===c.row&&a.col===c.col)).map(c=>({...c,reason:c.facing==='left'?'asymmetric-equipment-side-not-verified':prompt.sequence===7&&c.row===0?'too-upright-after-pageA-kneeling-terminal':'no-safe-native-rectangle-or-unusable-phase'})),
  canonicalFidelityCertified:false,detailedFamilyComplete:false});
}
const entries=[];
for(const family of families){
 const records=family.sequences.map(sequence=>selected.get(sequence));
 const frames=records.flatMap(record=>record.accepted.map(cell=>({pageId:'berserker-'+record.prompt.file.replace('.png',''),rect:cell.rect,pivot:cell.pivot,durationTicks:0})));
 assert(frames.length>=2);const base=Math.floor(family.ticks/frames.length),remaining=family.ticks-base*frames.length;
 frames.forEach((frame,index)=>frame.durationTicks=base+(index<remaining?1:0));
 const pages=records.filter(record=>record.accepted.length).map(record=>({id:'berserker-'+record.prompt.file.replace('.png',''),src:'/game/sprites/v94/pit/berserker/'+record.prompt.file,width:record.page.width,height:record.page.height,status:'validated',transparency:{mode:'alpha',noiseFloor:2}}));
 const visibleFrameBounds=records.flatMap(record=>record.accepted.map(cell=>({pageId:'berserker-'+record.prompt.file.replace('.png',''),rect:cell.rect,visibleRect:cell.visibleRect})));
 const pageBodyHeightPx=Object.fromEntries(records.filter(record=>record.accepted.length).map(record=>{
  const witness=stature[record.prompt.sequence],cell=record.page.cells.find(c=>c.row===witness.row&&c.col===witness.col);
  assert.equal(cell.visibleRect[3],witness.height);
  return ['berserker-'+record.prompt.file.replace('.png',''),witness.height];
 }));
 entries.push({fighterId:'berserker',variantId,bodyHeightPx:440,pageBodyHeightPx,visibleFrameBounds,
  atlas:{schemaVersion:1,id:'berserker-masked-'+family.id+'-right-partial-v94',characterId:'berserker',variantId,sourceKind:'authored-frames',status:'validated',pages,
   clips:[{id:'pit.presentation.'+family.id,facing:'right',status:'validated',loop:false,ticksPerSecond:60,frames}]}});
}
for(const entry of entries)for(const page of entry.atlas.pages){
 const record=archives.find(a=>a.file===page.src.split('/').at(-1)),from=fs.readFileSync(record.sourcePath);
 fs.copyFileSync(record.sourcePath,publicFolder+'/'+record.file);assert.equal(sha(fs.readFileSync(publicFolder+'/'+record.file)),record.sha256);assert.equal(from.length,record.bytes);
}
const bodyReference={bodyHeightPx:440,sourceFamily:'square1254-4columns3rows',pageStandingReferences:Object.entries(stature).map(([sequence,witness])=>({sequence:Number(sequence),...witness,usedAsRuntimeFrame:selected.get(Number(sequence)).accepted.some(c=>c.row===witness.row&&c.col===witness.col)})),method:'One measured upright source witness per page, used through pageBodyHeightPx for every pose of that page. The excluded upright first cell of defeat pageB remains its stature witness; low poses never determine their own scale.',limits:'Generated source proportions and pose continuity remain approximate; per-page stature reduces page-to-page size popping but does not certify anatomy, equipment or movement fidelity1:1. No four-row idle source is admitted.'};
const intake={schemaVersion:1,version:94,fighterId:'berserker',variantId,reference,generationBudget:{attempts:10,pngProduced:9,replacements:0},archives,bodyReference,
 actual:{runtimeDefinitions:entries.length,runtimeClips:entries.length,runtimePngs:new Set(entries.flatMap(e=>e.atlas.pages.map(p=>p.src))).size,runtimeDrawings:entries.reduce((n,e)=>n+e.atlas.clips[0].frames.length,0),completeFamilyCycles:0,missingIdle:true,missingDizzy:true,allLeftFacingsMissing:true},
 canonicalFidelityCertified:false,detailedDeliveryComplete:false,admission:'Partial individual-cell review only; original pixel bytes unchanged. Rejected cells never declared as runtime frames.',
 limits:['Four-row idle has no safely separated complete cells.','Dizzy generation failed and has no PNG.','All left facings excluded because asymmetrical equipment continuity is not verified.','First two pageB defeat drawings excluded because they stand too high after pageA kneeling terminal.','All four surviving family clips remain below12distinctdrawings. No complete roster or1:1 certification.']};
fs.writeFileSync('app/game/data/pitLifecycleBerserkerV94.json',JSON.stringify(entries,null,2)+'\n');
fs.writeFileSync(folder+'/intake.json',JSON.stringify(intake,null,2)+'\n');
const manifest=read(folder+'/manifest.json');manifest.status='completed-ten-attempts-partial-admission';manifest.generationBudget=intake.generationBudget;manifest.admissionPath=folder+'/intake.json';manifest.actual=intake.actual;manifest.pages=prompts.pages.map(p=>({...p,decision:archives.find(a=>a.sequence===p.sequence).decision,runtimeAcceptedDrawings:archives.find(a=>a.sequence===p.sequence).runtimeAcceptedDrawings}));
fs.writeFileSync(folder+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({actual:intake.actual,clips:entries.map(e=>({id:e.atlas.clips[0].id,frames:e.atlas.clips[0].frames.length,ticks:e.atlas.clips[0].frames.reduce((n,f)=>n+f.durationTicks,0)}))},null,2));
