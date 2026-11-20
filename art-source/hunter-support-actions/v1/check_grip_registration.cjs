#!/usr/bin/env node
'use strict';
// Check source-derived registration, preserved relative body motion and one translation.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {assert}=require('./playback_core.js');
const {IDS,range,measurePage}=require('./apply_grip_registration.cjs');
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message);
async function checkGripRegistration(folder) {
  folder=path.resolve(folder || __dirname);
  const read=async file=>JSON.parse(await fs.readFile(path.join(folder,file),'utf8'));
  const [manifest,imports,anchors,receipt]=await Promise.all(['animations.json','import_atlases.json','anchor_measurements.json','grip_registration_receipt.json'].map(read));
  assert(receipt.appliedToAssets===false && receipt.appliedToPlayback===true && receipt.humanArtisticApproval===false,'Incorrect registration approval/pixel status.');
  const selected=manifest.clips.filter(clip=>clip.anchorMethod==='two-fist silhouette proxy');
  assert(JSON.stringify(selected.map(clip=>clip.id).sort())===JSON.stringify([...IDS].sort()),'Grip registration must affect only the four accepted canopy pages.');
  const pages=[];
  let checkedPivots=0,guardPivotChecks=0,translationChecks=0;
  for(const id of IDS) {
    const clip=manifest.clips.find(item=>item.id===id),imported=imports.atlases.find(item=>item.id===id),anchor=anchors.clips[id];
    const bytes=await fs.readFile(path.join(folder,clip.atlas)),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
    assert(sha256===clip.sourceSha256 && sha256===anchor.sourceSha256 && sha256===receipt.pages[id].sourceSha256,`${id}: source SHA lock failed.`);
    const measured=await measurePage(bytes,id),constant=measured.measurements.length===1;
    const target={x:clip.frameWidth*.5,y:clip.frameHeight*(50/314)};
    near(anchor.target.x,target.x,`${id}: wrong target X.`);near(anchor.target.y,target.y,`${id}: wrong target Y.`);
    const expectedByNumber=new Map(measured.measurements.map(item=>[item.frame,item]));
    for(const frame of clip.frames) {
      const item=constant ? measured.measurements[0] : expectedByNumber.get(frame.number),guarded=imported.frames[frame.number-1];
      near(frame.pivot.x,item.proxy[0],`${id} ${frame.number}: source-derived X pivot changed.`);
      near(frame.pivot.y,item.proxy[1],`${id} ${frame.number}: source-derived Y pivot changed.`);
      near(frame.drawOffset.x,target.x-frame.pivot.x,`${id}: X offset applied incorrectly.`);
      near(frame.drawOffset.y,target.y-frame.pivot.y,`${id}: Y offset applied incorrectly.`);
      near(guarded.pivot.x,frame.pivot.x+2,`${id}: import X pivot must add guard 2.`);
      near(guarded.pivot.y,frame.pivot.y+2,`${id}: import Y pivot must add guard 2.`);
      // The original pixel lies two pixels inside the guarded frame rectangle.
      // The guarded frame's placement plus 2 must equal the unguarded placement.
      near(guarded.drawOffset.x+2,frame.drawOffset.x,`${id}: import X doubles or omits registration.`);
      near(guarded.drawOffset.y+2,frame.drawOffset.y,`${id}: import Y doubles or omits registration.`);
      const left=manifest.preview.padding+frame.drawOffset.x,top=manifest.preview.padding+frame.drawOffset.y;
      assert(left>=0 && top>=0 && left+clip.frameWidth<=manifest.preview.stageWidth && top+clip.frameHeight<=manifest.preview.stageHeight,`${id}: registered frame exceeds preview.`);
      checkedPivots++;guardPivotChecks++;translationChecks++;
    }
    const records=measured.measurements.map(item=>{
      const frame=clip.frames[item.frame-1],offset=frame.drawOffset;
      const gripAfter=[item.proxy[0]+offset.x,item.proxy[1]+offset.y];
      const gripAfterPixelRounding=[item.proxy[0]+Math.round(offset.x),item.proxy[1]+Math.round(offset.y)];
      const footAfter=item.lowerBodyFootProxyX+offset.x;
      const relativeBefore=item.lowerBodyFootProxyX-item.proxy[0],relativeAfter=footAfter-gripAfter[0];
      near(relativeBefore,relativeAfter,`${id}: relative lower-body motion changed.`);
      near(item.lowerBodyFootProxyX+Math.round(offset.x)-gripAfterPixelRounding[0],relativeBefore,`${id}: video rounding changed relative motion.`);
      near(gripAfter[0],target.x,`${id}: displayed grip X is not the target.`);
      near(gripAfter[1],target.y,`${id}: displayed grip Y is not the target.`);
      return {number:item.frame,sourceGrip:item.proxy,sourceFootProxyX:item.lowerBodyFootProxyX,drawOffset:offset,displayedGrip:gripAfter,displayedGripAfterPixelRounding:gripAfterPixelRounding,relativeFootProxyXBefore:relativeBefore,relativeFootProxyXAfter:relativeAfter,absoluteRelativeMotionError:Math.abs(relativeAfter-relativeBefore)};
    });
    const before={x:range(records.map(item=>item.sourceGrip[0])),y:range(records.map(item=>item.sourceGrip[1]))};
    const after={x:range(records.map(item=>item.displayedGrip[0])),y:range(records.map(item=>item.displayedGrip[1]))};
    const rounded={x:range(records.map(item=>item.displayedGripAfterPixelRounding[0])),y:range(records.map(item=>item.displayedGripAfterPixelRounding[1]))};
    const footBefore=range(records.map(item=>item.relativeFootProxyXBefore)),footAfter=range(records.map(item=>item.relativeFootProxyXAfter));
    near(footBefore,footAfter,`${id}: range of relative lower-body movement changed.`);
    if(!constant) {
      assert(after.x<1e-8 && after.y<1e-8,`${id}: source grip is not stable after translation.`);
      assert(rounded.x<=1+1e-8 && rounded.y<=1+1e-8 && rounded.x<before.x && rounded.y<before.y,`${id}: pixel-rounded grip variation did not improve.`);
      assert(footBefore>1 && footAfter>1,`${id}: authored lower-body sway was flattened.`);
    }
    pages.push({id,sourceSha256:sha256,mode:constant ? `constant-endpoint-frame-${records[0].number}` : 'per-frame',target,measuredFrames:records.length,checkedFramePivots:16,gripRangeBefore:before,gripRangeAfter:after,gripRangeAfterPixelRounding:rounded,relativeLowerBodyXRangeBefore:footBefore,relativeLowerBodyXRangeAfter:footAfter,maxRelativeMotionError:Math.max(...records.map(item=>item.absoluteRelativeMotionError)),individualHandSpacingCorrection:false,records});
  }
  const result={schemaVersion:1,status:'passed',method:'two-fist silhouette proxy',checkedPages:pages.length,checkedPivots,guardPivotChecks,translationChecks,pages,sourcePixelsChanged:false,relativeLowerBodyMotionPreserved:true,otherBodyPartsPinnedByGripRegistration:false,artisticApproval:false,humanAnatomicalApproval:false,gameplayBinding:null,limits:'The graphical midpoint is stabilized; separate hand contact, fist spacing, body size/pose joins, actual support and physical pendulum phase remain unvalidated.'};
  await fs.writeFile(path.join(folder,'grip_registration_checks.json'),JSON.stringify(result,null,2)+'\n');
  return result;
}
if(require.main===module)checkGripRegistration(process.argv[2]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={checkGripRegistration};
