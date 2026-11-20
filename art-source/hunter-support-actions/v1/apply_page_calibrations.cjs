#!/usr/bin/env node
'use strict';
// Apply an explicitly adopted QA receipt as constant metadata. Pixels stay untouched.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {assert}=require('./playback_core.js');
let sharp;
try {sharp=require('sharp');} catch {sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules','sharp'));}
async function apply(receiptsFile,folder) {
  assert(receiptsFile,'Pass the adopted page-calibration receipt JSON.');
  folder=path.resolve(folder || __dirname);
  const configFile=path.join(folder,'sources.json');
  const config=JSON.parse(await fs.readFile(configFile,'utf8'));
  const receipts=JSON.parse(await fs.readFile(receiptsFile,'utf8'));
  const anchorsFile=path.join(folder,'anchor_measurements.json');
  let anchors;
  try {anchors=JSON.parse(await fs.readFile(anchorsFile,'utf8'));} catch(error) {if(error.code!=='ENOENT')throw error;anchors={schemaVersion:1,artisticStatus:'draft',clips:{}};}
  const applied=[];
  for(const receipt of receipts.calibrations) {
    if(receipt.status!=='parent-adopted-for-draft-preview')continue;
    const clip=config.clips.find(item=>item.id===receipt.sheetId);
    assert(clip?.generationStatus==='generated-awaiting-art-review',`${receipt.sheetId}: source must be ingested first.`);
    const buffer=await fs.readFile(path.resolve(folder,clip.path));
    const sourceSha256=crypto.createHash('sha256').update(buffer).digest('hex');
    assert(sourceSha256===receipt.sourceSha256 && sourceSha256===clip.sourceSha256,`${clip.id}: calibration source SHA mismatch.`);
    const candidates=config.actions.flatMap(action=>Object.values(action.phases)).filter(phase=>phase.clips.indexOf(clip.id)>0);
    assert(candidates.length>0 && candidates.every(phase=>(phase.order || 'forward')==='forward'),`${clip.id}: calibration requires an explicit previous page in forward order.`);
    const referenceIds=[...new Set(candidates.map(phase=>phase.clips[phase.clips.indexOf(clip.id)-1]))];
    assert(referenceIds.length===1,`${clip.id}: ambiguous reference page.`);
    const reference=config.clips.find(item=>item.id===referenceIds[0]);
    assert(reference?.sourceSha256,`${clip.id}: ingested reference SHA required.`);
    const metadata=await sharp(buffer).metadata();
    const normalized=clip.anchorNormalized || [0.5,0.9];
    const target={x:Math.ceil(metadata.width/4)*normalized[0],y:Math.ceil(metadata.height/4)*normalized[1]};
    assert(Number.isFinite(receipt.drawOffset.x) && Number.isFinite(receipt.drawOffset.y),`${clip.id}: invalid translation.`);
    const pivot={x:target.x-receipt.drawOffset.x,y:target.y-receipt.drawOffset.y};
    anchors.clips[clip.id]={sourceSha256,method:'constant-page-calibration',target,notes:'A single page-origin translation derived from an inspected A16/B01 boundary. This is a constant page calibration, not an anatomical or per-frame foot measurement. All authored internal movement, source pixels and scale are preserved.',registration:{method:'constant-page-calibration',drawOffset:receipt.drawOffset,applyTo:'All 16 frames once',referenceSource:{clip:reference.id,number:16,sourceSha256:reference.sourceSha256},sourceFrame:1,basis:receipt.basis,observations:receipt.anchors || null,evidence:receipt.evidence,review:receipt.review,residualSeam:receipt.residualArtisticLimitation || receipt.residualSeam || receipt.limitations || null,sourcePixelsChanged:false,individualFrameMovementChanged:false,scaleChanged:false,artisticStatus:'draft'},frames:Array.from({length:16},(_,i)=>({number:i+1,pivot:{...pivot},confidence:'page-origin-calibration-only-not-anatomical-registration'}))};
    clip.anchorPolicy='measured';
    applied.push({clip:clip.id,sourceSha256,target,pivot,drawOffset:receipt.drawOffset});
  }
  config.anchorMeasurementsPath='anchor_measurements.json';
  await fs.writeFile(anchorsFile,JSON.stringify(anchors,null,2)+'\n');
  await fs.writeFile(configFile,JSON.stringify(config,null,2)+'\n');
  return {artisticStatus:'draft',pixelsChanged:false,applied};
}
if(require.main===module)apply(process.argv[2],process.argv[3]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={apply};

