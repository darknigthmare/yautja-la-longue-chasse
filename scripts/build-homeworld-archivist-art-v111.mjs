#!/usr/bin/env node
/** Read-only native pixels; write registration metadata only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import sharp from 'sharp';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const IDS=['listen','explain','indicate','return'];
const OUTPUT='app/game/data/homeworldArchivistMotionV111.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function inspectArchivistDrawingV111(file) {
  const bytes=await fs.readFile(file),{data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,1024);assert.equal(info.height,1536);assert.equal(info.channels,4,'A native alpha channel is required');
  let x0=info.width,y0=info.height,x1=-1,y1=-1,zero=0,edge=0,min=255,max=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const a=data[(y*info.width+x)*4+3];min=Math.min(min,a);max=Math.max(max,a);if(a===0)zero++;
    if(a>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;}
  }
  assert.equal(min,0);assert(max>=250);assert.equal(edge,0);assert(zero/(info.width*info.height)>.35);
  assert(x0>=16&&y0>=32&&info.width-x1>16&&info.height-y1>32,'The entire native figure must remain contained');
  // Both feet are already painted. Their lower100px envelope locates a
  // common physical centre; these are coordinates, never edited PNG pixels.
  const bands=[{min:info.width,max:-1},{min:info.width,max:-1}];
  for(let y=Math.max(y0,y1-100);y<=y1;y++)for(let x=x0;x<=x1;x++)if(data[(y*info.width+x)*4+3]>16){const b=bands[x<info.width/2?0:1];b.min=Math.min(b.min,x);b.max=Math.max(b.max,x);}
  assert(bands.every(b=>b.max>b.min));
  return{sourceWidth:info.width,sourceHeight:info.height,bytes:bytes.length,sha256:sha(bytes),pixelSha256:sha(data),alphaBounds:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},pivot:{x:bands.reduce((n,b)=>n+(b.min+b.max)/2,0)/2,y:y1},alpha:{minimum:min,maximum:max,zeroPixels:zero,transparentRatio:zero/(info.width*info.height),visibleBorderPixels:edge},footBands:bands};
}
export async function buildArchivistArtV111(root=ROOT) {
  const frames=[];
  for(const id of IDS){
    const publicFile='public/game/homeworld/v111/archivist-conversation/'+id+'.png',raw='art-source/v111/archivist-conversation/raw/'+id+'.png';
    assert.deepEqual(await fs.readFile(path.join(root,publicFile)),await fs.readFile(path.join(root,raw)),'Native public bytes must equal the original raw copy');
    frames.push({id,src:'/'+publicFile.slice('public/'.length),raw,...await inspectArchivistDrawingV111(path.join(root,publicFile))});
  }
  assert.equal(new Set(frames.map(f=>f.pixelSha256)).size,4,'Four independently painted key drawings are required');
  const nativeHeight=frames[0].alphaBounds.height;
  assert(frames.every(f=>Math.abs(f.alphaBounds.height-nativeHeight)/nativeHeight<.08),'No per-frame stretching or height rescaling is admitted');
  return{schemaVersion:1,release:'V111',status:'admitted-native-conversation',actorId:'archive-plaque-steward-v109',nativeFacing:1,heightWorld:100,nativeHeight,
    camera:'fixed-south35-original-world-camera',scalePolicy:'One common uniform positive scale for all four whole PNG canvases; per-source native foot registration only.',
    frames,durationMs:1200,frameEndMs:[220,520,820,1100],sourceCompletion:false,closedCatalogue354Ids:[],
    source:{brief:'docs/specifications/homeworld-v81/mission-homeworld-original.txt',section:15,lines:[757,770],bibleScene:'D6-W-PNJ-ROLE-03',bibleLines:[3183,3190]},
    generationReceipt:'art-source/v111/archivist-conversation/generation-receipts.json',visualReview:'art-source/v111/archivist-conversation/visual-review.json',
    limits:['Four conversation key drawings for this local K-17 actor and one native facing only.','No walking, object grasping, remote manipulation, new identity, quest receipt or campaign reward.','Related V74 walking art and V84 static portraits remain distinct; all354 target families remain unclosed.','Active conversation uses a bounded elapsed clock that freezes on pause, hidden page and lost focus; reduced motion remains listening.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2);assert(args.length===1&&['--write','--check'].includes(args[0]));
  const bytes=Buffer.from(JSON.stringify(await buildArchivistArtV111(),null,2)+'\n');
  if(args[0]==='--write')await fs.writeFile(path.join(ROOT,OUTPUT),bytes);else assert.deepEqual(await fs.readFile(path.join(ROOT,OUTPUT)),bytes);
  console.log(JSON.stringify({result:'PASS_NATIVE_BODY_REGISTRATION',file:OUTPUT,sha256:sha(bytes),nativeDrawings:4}));
}
