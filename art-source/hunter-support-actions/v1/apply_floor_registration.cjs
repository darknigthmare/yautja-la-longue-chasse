#!/usr/bin/env node
'use strict';
// Y-only graphical floor registration. An explicit SHA-bound adoption is required.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {assert}=require('./playback_core.js');
let sharp;
try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules','sharp'));}
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const IDS=['idle','aim_enter','aim_hold','aim_exit','hurt','scan','cloak_on','cloak_off','heal_a','heal_b','second_wind_a','second_wind_b','death_a','death_b'];
const METHOD='bottom-support silhouette row';
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message);

async function measureFloorPage(bytes) {
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const x=Array.from({length:5},(_,i)=>Math.round(i*info.width/4));
  const y=Array.from({length:5},(_,i)=>Math.round(i*info.height/4));
  const frames=[];
  for(let index=0;index<16;index++) {
    const col=index%4,row=Math.floor(index/4),width=x[col+1]-x[col],height=y[row+1]-y[row];
    const rowCounts=new Uint16Array(height),visible={left:width,top:height,right:-1,bottom:-1};
    for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){
      const alpha=data[((y[row]+dy)*info.width+x[col]+dx)*4+3];
      if(alpha>=128)rowCounts[dy]++;
      if(alpha>=16){visible.left=Math.min(visible.left,dx);visible.top=Math.min(visible.top,dy);visible.right=Math.max(visible.right,dx);visible.bottom=Math.max(visible.bottom,dy);}
    }
    let floor=-1,lowestOpaque=-1;
    for(let dy=height-1;dy>=0;dy--){if(lowestOpaque<0 && rowCounts[dy]>0)lowestOpaque=dy;if(rowCounts[dy]>=8){floor=dy;break;}}
    assert(floor>=0,`Frame ${index+1}: no broad opaque row to support a floor proxy.`);
    frames.push({frame:index+1,sourceRect:[x[col],y[row],width,height],rowIndex:floor,floorY:floor+.5,rowPixelCount:rowCounts[floor],lowestAlpha128Row:lowestOpaque,ignoredLowerOpaqueRows:lowestOpaque-floor,visibleBounds:{x:visible.left,y:visible.top,width:visible.right-visible.left+1,height:visible.bottom-visible.top+1}});
  }
  return {width:info.width,height:info.height,frameWidth:Math.ceil(info.width/4),frameHeight:Math.ceil(info.height/4),frames};
}

async function applyFloorRegistration(folder) {
  folder=path.resolve(folder || __dirname);
  const configFile=path.join(folder,'sources.json'),config=JSON.parse(await fs.readFile(configFile,'utf8'));
  const adoption=config.floorRegistration;
  assert(adoption?.status==='adopted-for-draft-review' && typeof adoption.adoptedCandidateSha256==='string','Floor proxy is not adopted in sources.json.');
  const file=path.resolve(folder,adoption.candidateFile),bytes=await fs.readFile(file),candidateReceiptSha256=hash(bytes),candidate=JSON.parse(bytes);
  assert(candidateReceiptSha256===adoption.adoptedCandidateSha256,'The adopted floor receipt SHA changed.');
  assert(candidate.candidateOnly===true && candidate.appliedToPlayback===false && candidate.preserveX===true,'Expected an original Y-only candidate receipt.');
  assert(candidate.threshold===128 && candidate.minimumRowPixels===8 && candidate.method==='bottommost-source-cell-row-alpha-ge128-count-ge8','Unsupported floor proxy method.');
  assert(JSON.stringify(Object.keys(candidate.pages).sort())===JSON.stringify([...IDS].sort()),'Floor registration must cover only the fourteen adopted grounded pages.');
  const targetY=adoption.targetY;
  assert(Number.isFinite(targetY) && targetY===candidate.recommendedTargetY,'The adopted target must match the inspected floor receipt.');
  const anchorsFile=path.join(folder,'anchor_measurements.json');
  const anchors=JSON.parse(await fs.readFile(anchorsFile,'utf8'));
  const receipt={...candidate,candidateOnly:false,candidateReceiptFile:path.basename(file),candidateReceiptSha256, candidateAssumptions:candidate.assumptions,assumptions:candidate.assumptions.map(note=>note==='This candidate is not applied here; root must explicitly authorize metadata-only use.' ? 'This candidate was explicitly adopted for draft metadata-only use after assistant visual review.' : note),appliedToAssets:false,appliedToPlayback:true,appliedToNativeDraftMetadata:true,method:METHOD,measurementMethod:candidate.method,artisticStatus:'draft',humanArtisticApproval:false,application:{targetY,axis:'Y only',preserveX:true,sourcePixelsChanged:false,scaleChanged:false,gameplayBinding:null,scope:'Fourteen grounded pages; canopy grips and aerial boost are excluded.'},pages:{}};
  for(const id of IDS) {
    const source=config.clips.find(clip=>clip.id===id),prior=candidate.pages[id];
    assert(source,`Missing adopted floor source ${id}.`);
    const sourceBytes=await fs.readFile(path.resolve(folder,source.path)),sourceSha256=hash(sourceBytes);
    assert(sourceSha256===source.sourceSha256 && sourceSha256===prior.sourceSha256,`${id}: floor receipt source SHA does not match ingested art.`);
    const measured=await measureFloorPage(sourceBytes),targetX=measured.frameWidth*(source.anchorNormalized || [.5,.9])[0];
    const pivots=[];
    for(const frame of measured.frames) {
      const previous=prior.frames.find(item=>item.frame===frame.frame);
      assert(previous && JSON.stringify(frame.sourceRect)===JSON.stringify(previous.sourceRect),`${id}: source rectangle does not match adopted receipt.`);
      assert(frame.rowIndex===previous.rowIndex && frame.rowPixelCount===previous.rowPixelCount && frame.lowestAlpha128Row===previous.lowestAlpha128Row,`${id} ${frame.frame}: reproduced supporting row changed.`);
      near(frame.floorY,previous.floorY,`${id}: reproduced floor coordinate changed.`);
      near(targetX,previous.originalPivot.x,`${id}: horizontal root must remain unchanged.`);
      near(targetX,previous.candidatePivot.x,`${id}: candidate changed horizontal root.`);
      near(targetY,previous.candidateAnchorTarget.y,`${id}: candidate target changed.`);
      assert(Number.isInteger(targetY-frame.floorY),`${id}: floor alignment must not require raster interpolation.`);
      pivots.push({x:targetX,y:frame.floorY});
    }
    anchors.clips[id]={sourceSha256,method:METHOD,target:{x:targetX,y:targetY},notes:'Last native source-cell row with at least eight alpha128 pixels, measured at row center. A graphical support proxy that may come from toes, a palm, knee or prone body; not certified anatomy or collision.',registration:{method:METHOD,measurementMethod:candidate.method,mode:'per-frame-y-only',candidateReceiptSha256,evidence:'floor_registration_receipt.json',review:'Explicitly adopted after assistant visual review; no human artistic or anatomical approval.',sourcePixelsChanged:false,scaleChanged:false,authoredInternalMotionPreserved:true,presentationTranslationChanged:true,horizontalOffsetChanged:false,gameplayBinding:null,residualSeam:'Vertical silhouette-floor drift is removed. Different anatomy, body scale, hand/foot spacing, horizontal position and action phase between pages remain artistic differences.'},frames:pivots.map((pivot,index)=>({number:index+1,pivot,confidence:'inspected-graphical-floor-proxy-not-world-collision'}))};
    source.anchorPolicy='measured';
    receipt.pages[id]={...prior,sourcePath:source.path,method:METHOD,reproductionMethod:prior.method,appliedTarget:{x:targetX,y:targetY},appliedPivots:pivots,sourcePixelsChanged:false,horizontalOffsetChanged:false,measuredFramesReproduced:16};
    assert(hash(await fs.readFile(path.resolve(folder,source.path)))===sourceSha256,`${id}: floor registration altered source PNG.`);
  }
  config.anchorMeasurementsPath='anchor_measurements.json';
  await fs.writeFile(anchorsFile,JSON.stringify(anchors,null,2)+'\n');
  await fs.writeFile(configFile,JSON.stringify(config,null,2)+'\n');
  await fs.writeFile(path.join(folder,'floor_registration_receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  return {method:METHOD,pages:IDS.length,frames:IDS.length*16,targetY,axis:'Y only',horizontalOffsetChanged:false,sourcePixelsChanged:false,scaleChanged:false,artisticStatus:'draft',humanArtisticApproval:false,gameplayBinding:null,candidateReceiptSha256};
}
if(require.main===module)applyFloorRegistration(process.argv[2]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={IDS,METHOD,measureFloorPage,applyFloorRegistration};
