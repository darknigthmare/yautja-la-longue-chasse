#!/usr/bin/env node
'use strict';
// Verify the adopted graphical floor without changing X, source pixels or air/grip roots.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {assert}=require('./playback_core.js');
const {IDS,METHOD,measureFloorPage}=require('./apply_floor_registration.cjs');
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message);
const range=values=>Math.max(...values)-Math.min(...values);
async function checkFloorRegistration(folder) {
  folder=path.resolve(folder || __dirname);
  const read=async file=>JSON.parse(await fs.readFile(path.join(folder,file),'utf8'));
  const [manifest,imports,anchors,receipt,candidate]=await Promise.all(['animations.json','import_atlases.json','anchor_measurements.json','floor_registration_receipt.json','floor_anchor_candidates.json'].map(read));
  assert(receipt.appliedToAssets===false && receipt.appliedToPlayback===true && receipt.application.preserveX===true && receipt.humanArtisticApproval===false,'Incorrect floor registration status.');
  assert(JSON.stringify(manifest.clips.filter(clip=>clip.anchorMethod===METHOD).map(clip=>clip.id).sort())===JSON.stringify([...IDS].sort()),'Floor registration affected the wrong pages.');
  const pages=[];let pivotChecks=0,guardPivotChecks=0,translationChecks=0;
  for(const id of IDS) {
    const clip=manifest.clips.find(item=>item.id===id),imported=imports.atlases.find(item=>item.id===id),anchor=anchors.clips[id];
    const bytes=await fs.readFile(path.join(folder,clip.atlas)),sha=crypto.createHash('sha256').update(bytes).digest('hex');
    assert(sha===clip.sourceSha256 && sha===anchor.sourceSha256 && sha===receipt.pages[id].sourceSha256,`${id}: floor SHA lock failed.`);
    const measured=await measureFloorPage(bytes),records=[];
    for(const item of measured.frames) {
      const frame=clip.frames[item.frame-1],guarded=imported.frames[item.frame-1],original=candidate.pages[id].frames[item.frame-1];
      near(frame.pivot.x,original.originalPivot.x,`${id}: horizontal pivot changed.`);
      near(frame.pivot.y,item.floorY,`${id}: floor pivot does not match actual source row.`);
      near(frame.anchorTarget.y,302.5,`${id}: wrong adopted floor target.`);
      near(frame.drawOffset.x,0,`${id}: floor registration must not translate X.`);
      near(frame.drawOffset.y,302.5-item.floorY,`${id}: floor offset is incorrect.`);
      assert(Number.isInteger(frame.drawOffset.y),`${id}: translation must be integral.`);
      near(guarded.pivot.x,frame.pivot.x+2,`${id}: import X guard missing.`);
      near(guarded.pivot.y,frame.pivot.y+2,`${id}: import Y guard missing.`);
      near(guarded.drawOffset.x+2,frame.drawOffset.x,`${id}: X translation applied twice.`);
      near(guarded.drawOffset.y+2,frame.drawOffset.y,`${id}: Y translation applied twice.`);
      const left=manifest.preview.padding+frame.drawOffset.x,top=manifest.preview.padding+frame.drawOffset.y;
      assert(left>=0 && top>=0 && left+clip.frameWidth<=manifest.preview.stageWidth && top+clip.frameHeight<=manifest.preview.stageHeight,`${id}: frame exceeds preview after floor registration.`);
      const displayedFloor=item.floorY+frame.drawOffset.y;
      const bodyTopRelativeBefore=item.visibleBounds.y-item.floorY;
      const bodyTopRelativeAfter=item.visibleBounds.y+frame.drawOffset.y-displayedFloor;
      near(bodyTopRelativeBefore,bodyTopRelativeAfter,`${id}: body position relative to contact changed.`);
      near(displayedFloor,302.5,`${id}: displayed floor is unstable.`);
      records.push({number:item.frame,sourceFloorY:item.floorY,sourceRowIndex:item.rowIndex,rowPixelCount:item.rowPixelCount,pivot:frame.pivot,drawOffset:frame.drawOffset,displayedFloorY:displayedFloor,bodyTopRelativeToFloorBefore:bodyTopRelativeBefore,bodyTopRelativeToFloorAfter:bodyTopRelativeAfter,relativeShapePositionError:Math.abs(bodyTopRelativeAfter-bodyTopRelativeBefore)});
      pivotChecks++;guardPivotChecks++;translationChecks++;
    }
    const sourceRange=range(records.map(item=>item.sourceFloorY)),afterRange=range(records.map(item=>item.displayedFloorY));
    assert(afterRange===0 && afterRange<=sourceRange,`${id}: floor spread was not removed.`);
    pages.push({id,sourceSha256:sha,frames:16,sourceFloorRange:sourceRange,displayedFloorRange:afterRange,drawOffsetYRange:[Math.min(...records.map(item=>item.drawOffset.y)),Math.max(...records.map(item=>item.drawOffset.y))],maxRelativeShapePositionError:Math.max(...records.map(item=>item.relativeShapePositionError)),horizontalOffsetChanged:false,records});
  }
  const excludedChecks=[];
  for(const id of candidate.excludedPages) {
    const clip=manifest.clips.find(item=>item.id===id);
    assert(clip,`Excluded source ${id} missing.`);
    if(id==='aerial_boost') {
      assert(clip.anchorPolicy==='fixed-root' && clip.frames.every(frame=>frame.drawOffset.x===0 && frame.drawOffset.y===0),'Aerial boost motion must retain its fixed root and zero review offset.');
    } else assert(clip.anchorMethod==='two-fist silhouette proxy',`${id}: floor pass replaced accepted grip registration.`);
    excludedChecks.push({id,anchorMethod:clip.anchorMethod,preserved:true});
  }
  const result={schemaVersion:1,status:'passed',method:METHOD,pages:IDS.length,frames:IDS.length*16,pivotChecks,guardPivotChecks,translationChecks,targetY:302.5,horizontalOffsetChanged:false,sourcePixelsChanged:false,integerTranslationsOnly:true,relativeShapeMotionPreserved:true,bodyScaleOrAnatomyCorrection:false,artisticApproval:false,humanAnatomicalApproval:false,gameplayBinding:null,excludedChecks,results:pages,limits:'A stable graphical floor does not validate anatomy, separate foot contacts, body scale, horizontal pose seams, gameplay collision or action-phase compatibility.'};
  await fs.writeFile(path.join(folder,'floor_registration_checks.json'),JSON.stringify(result,null,2)+'\n');
  return result;
}
if(require.main===module)checkFloorRegistration(process.argv[2]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={checkFloorRegistration};
