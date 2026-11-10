#!/usr/bin/env node
'use strict';
// Adopt an inspected, SHA-bound graphical hand proxy as draft metadata only.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {assert}=require('./playback_core.js');
let sharp;
try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules','sharp'));}
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const range=values=>Math.max(...values)-Math.min(...values);
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message);
const IDS=['canopy_attach','canopy_hold','canopy_swing','canopy_release'];

function measureCell(raw,width,height,{threshold=128,band=12}={}) {
  let top=height,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(raw[(y*width+x)*4+3]>=threshold){top=Math.min(top,y);bottom=Math.max(bottom,y);}
  assert(bottom>=0,'Empty cell cannot supply a grip proxy.');
  const visited=new Uint8Array(width*height),components=[];
  for(let y=top;y<Math.min(height,top+band);y++)for(let x=0;x<width;x++) {
    const initial=y*width+x;
    if(visited[initial] || raw[initial*4+3]<threshold)continue;
    const queue=[initial];visited[initial]=1;
    let cursor=0,count=0,sumX=0,sumY=0,minX=width,maxX=-1,minY=height,maxY=-1;
    while(cursor<queue.length) {
      const index=queue[cursor++],px=index%width,py=Math.floor(index/width);
      count++;sumX+=px+.5;sumY+=py+.5;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        if(!dx&&!dy)continue;
        const nx=px+dx,ny=py+dy;
        if(nx<0 || nx>=width || ny<top || ny>=Math.min(height,top+band))continue;
        const next=ny*width+nx;
        if(!visited[next] && raw[next*4+3]>=threshold){visited[next]=1;queue.push(next);}
      }
    }
    if(count>=8)components.push({pixels:count,center:[sumX/count,sumY/count],box:[minX,minY,maxX+1,maxY+1]});
  }
  components.sort((a,b)=>a.center[0]-b.center[0]);
  assert(components.length===2,`Expected exactly two separated top-of-fist components, found ${components.length}.`);
  const proxy=[(components[0].center[0]+components[1].center[0])/2,(components[0].center[1]+components[1].center[1])/2];
  let footCount=0,footX=0;
  for(let y=Math.max(0,bottom-24);y<height;y++)for(let x=0;x<width;x++)if(raw[(y*width+x)*4+3]>=threshold){footCount++;footX+=x+.5;}
  const lowerBodyFootProxyX=footX/footCount;
  return {topOpaqueY:top,components,proxy,fistCenterSpanX:components[1].center[0]-components[0].center[0],lowerBodyFootProxyX,lowerBodyFootProxyXRelativeToGrip:lowerBodyFootProxyX-proxy[0]};
}

async function measurePage(bytes,id) {
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const x=Array.from({length:5},(_,i)=>Math.round(i*info.width/4));
  const y=Array.from({length:5},(_,i)=>Math.round(i*info.height/4));
  const selected=id==='canopy_attach' ? [16] : id==='canopy_release' ? [1] : Array.from({length:16},(_,i)=>i+1);
  const measurements=[];
  for(const number of selected) {
    const index=number-1,col=index%4,row=Math.floor(index/4),width=x[col+1]-x[col],height=y[row+1]-y[row],raw=Buffer.alloc(width*height*4);
    for(let dy=0;dy<height;dy++)data.copy(raw,dy*width*4,((y[row]+dy)*info.width+x[col])*4,((y[row]+dy)*info.width+x[col]+width)*4);
    measurements.push({frame:number,sourceRect:[x[col],y[row],width,height],...measureCell(raw,width,height)});
  }
  return {width:info.width,height:info.height,frameWidth:Math.ceil(info.width/4),frameHeight:Math.ceil(info.height/4),measurements};
}

async function applyGripRegistration(folder,candidateFile) {
  folder=path.resolve(folder || __dirname);
  candidateFile=path.resolve(candidateFile || path.join(folder,'grip_anchor_candidates.json'));
  const candidateBytes=await fs.readFile(candidateFile),candidate=JSON.parse(candidateBytes);
  assert(candidate.candidateOnly===true && candidate.appliedToPlayback===false,'Expected the original unmodified candidate receipt.');
  assert(candidate.threshold===128 && candidate.topBandPixels===12 && candidate.connectedness===8 && candidate.minimumComponentPixels===8,'Unsupported candidate measurement method.');
  const configFile=path.join(folder,'sources.json'),config=JSON.parse(await fs.readFile(configFile,'utf8'));
  const anchorsFile=path.join(folder,'anchor_measurements.json');
  let anchors;
  try{anchors=JSON.parse(await fs.readFile(anchorsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;anchors={schemaVersion:1,artisticStatus:'draft',clips:{}};}
  const receipt={...candidate,candidateOnly:false,candidateReceiptFile:path.basename(candidateFile),candidateReceiptSha256:hash(candidateBytes),candidateAssumptions:candidate.assumptions,assumptions:candidate.assumptions.map(note=>note.replace('; not applied here.','; applied here to draft metadata only.')),appliedToAssets:false,appliedToPlayback:true,appliedToNativeDraftMetadata:true,artisticStatus:'draft',humanArtisticApproval:false,reviewStatus:'Graphical proxy adopted by the assistant after visual sample inspection; no human anatomical, support-contact or IK approval.',application:{method:'two-fist silhouette proxy',targetPolicy:'Half exported cell width, and 50/314 of exported cell height; (157,50) for 314px cells.',sourcePixelsChanged:false,scaleChanged:false,gameplayBinding:null,otherBodyPartsPinnedByThisOperation:false},pages:{}};
  for(const id of IDS) {
    const source=config.clips.find(clip=>clip.id===id),prior=candidate.pages[id];
    assert(source && prior,`Missing ${id} source or measurement.`);
    const bytes=await fs.readFile(path.resolve(folder,source.path)),sourceSha256=hash(bytes);
    assert(sourceSha256===source.sourceSha256 && sourceSha256===prior.sourceSha256,`${id}: grip receipt source SHA does not match ingested art.`);
    const measured=await measurePage(bytes,id);
    assert(measured.measurements.length===prior.measuredFrames.length,`${id}: changed measured frame set.`);
    for(const item of measured.measurements) {
      const previous=prior.measuredFrames.find(frame=>frame.frame===item.frame);
      assert(previous,`${id} ${item.frame}: original measurement missing.`);
      assert(JSON.stringify(item.sourceRect)===JSON.stringify(previous.sourceRect),`${id}: source rectangle changed.`);
      for(const axis of [0,1])near(item.proxy[axis],previous.proxy[axis],`${id} ${item.frame}: reproduced grip differs from adopted receipt.`);
      near(item.lowerBodyFootProxyX,previous.lowerBodyFootProxyX,`${id}: lower-body reference differs.`);
      assert(JSON.stringify(item.components.map(c=>c.pixels))===JSON.stringify(previous.components.map(c=>c.pixels)),`${id}: connected component sizes differ.`);
    }
    const target={x:measured.frameWidth*.5,y:measured.frameHeight*(50/314)};
    const pivots=Array.from({length:16},(_,i)=>{
      const item=measured.measurements.length===16 ? measured.measurements[i] : measured.measurements[0];
      const pivot={x:item.proxy[0],y:item.proxy[1]};
      near(pivot.x,prior.candidatePivots[i].x,`${id}: adopted X pivot changed.`);
      near(pivot.y,prior.candidatePivots[i].y,`${id}: adopted Y pivot changed.`);
      return pivot;
    });
    const constant=measured.measurements.length===1;
    anchors.clips[id]={sourceSha256,method:'two-fist silhouette proxy',target,notes:'Mean of two separately measured alpha128 top12 fist-silhouette centroids. A graphical review proxy, not anatomical validation, real support contact or inverse kinematics. Every source pixel and all relative limb motion are retained.',registration:{method:'two-fist silhouette proxy',mode:prior.candidateMode,candidateReceiptSha256:hash(candidateBytes),evidence:'grip_registration_receipt.json',review:'Assistant visual review adopted this draft-only proxy; no human approval.',applyTo:constant ? `Constant endpoint pivot from source frame ${measured.measurements[0].frame}, shared by all 16 frames.` : 'One measured pivot for each of the 16 frames.',sourcePixelsChanged:false,scaleChanged:false,authoredInternalMotionPreserved:true,presentationTranslationChanged:true,gameplayBinding:null,residualSeam:'The mean grip is aligned, but the distance between fists, body volumes, limb poses, page joins and physical pendulum phase remain different; neither individual hand is guaranteed to remain at a real support contact.'},frames:pivots.map((pivot,index)=>({number:index+1,pivot,confidence:'inspected-graphical-proxy-not-anatomical-contact'}))};
    source.anchorPolicy='measured';
    receipt.pages[id]={...prior,sourcePath:source.path,method:'two-fist silhouette proxy',reproductionMethod:prior.method,appliedTarget:target,appliedPivots:pivots,constantEndpointPivot:constant,sourcePixelsChanged:false,measuredFramesReproduced:measured.measurements.length};
    assert(hash(await fs.readFile(path.resolve(folder,source.path)))===sourceSha256,`${id}: applying metadata must not alter source PNG.`);
  }
  config.anchorMeasurementsPath='anchor_measurements.json';
  await fs.writeFile(anchorsFile,JSON.stringify(anchors,null,2)+'\n');
  await fs.writeFile(configFile,JSON.stringify(config,null,2)+'\n');
  await fs.writeFile(path.join(folder,'grip_registration_receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  return {method:'two-fist silhouette proxy',sourcePages:IDS.length,perFrameRegisteredPages:2,constantEndpointRegisteredPages:2,candidateReceiptSha256:receipt.candidateReceiptSha256,sourcePixelsChanged:false,otherBodyPartsPinnedByThisOperation:false,gameplayBinding:null,artisticStatus:'draft',humanArtisticApproval:false,targets:IDS.map(id=>({id,target:receipt.pages[id].appliedTarget}))};
}
if(require.main===module)applyGripRegistration(process.argv[2],process.argv[3]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={IDS,range,measureCell,measurePage,applyGripRegistration};
