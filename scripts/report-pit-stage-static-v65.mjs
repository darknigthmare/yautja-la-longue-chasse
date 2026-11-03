import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=process.env.V65_STATIC_EVIDENCE_ROOT??'I:/CodexTemp/yautja-v65-20261001/stages';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const evidence=async file=>({path:file,sha256:sha(await fs.readFile(file))});
const manifest=await read('app/game/data/pitStageCompositionV65.json');
const rendererFile=path.join(root,'qa/renderer-frozen/report.json'),renderer=await read(rendererFile);
const workbook=await read('docs/v65-stage-static-workbook-audit.json');
const testFile=path.join(root,'qa/tests-final.log'),testText=await fs.readFile(testFile,'utf8');
const journeyTestFile=path.join(root,'qa/tests-journeys-v53.log'),journeyTestText=await fs.readFile(journeyTestFile,'utf8').catch(()=>null);
if(journeyTestText){assert.match(journeyTestText,/pass 34/);assert.match(journeyTestText,/fail 0/);}
assert.equal(renderer.status,'PASS');assert.equal(renderer.stages,6);assert.equal(renderer.cameraChecks,60);assert.match(testText,/pass 39/);assert.match(testText,/fail 0/);
for(const [file,hash] of Object.entries(renderer.sourceHashes))assert.equal(sha(await fs.readFile(file)),hash,`Source changed since renderer QA: ${file}`);
const visualFile='docs/v65-stage-static-visual-review.json';
const visual=await read(visualFile).catch(()=>null);
const applicationFile=path.join(root,'qa/application-final/report.json');
const application=await read(applicationFile).catch(()=>null);
const applicationVisualFile='docs/v65-stage-static-application-visual-review.json';
const applicationVisual=await read(applicationVisualFile).catch(()=>null);
if(application)for(const [file,hash] of Object.entries(application.sourceHashes))assert.equal(sha(await fs.readFile(file)),hash,`Source changed since application QA: ${file}`);
const rendererProof={...renderer,reportEvidence:await evidence(rendererFile),manualVisualReview:visual?'See independent visual review':'Pending independent visual review',visualReview:visual?await evidence(visualFile):null};
await fs.writeFile('docs/v65-stage-static-renderer-qa.json',JSON.stringify(rendererProof,null,2)+'\n');
if(application){
 if(applicationVisual)assert.equal(applicationVisual.rawReport.sha256,sha(await fs.readFile(applicationFile)),'Visual review must reference this exact application report.');
 await fs.writeFile('docs/v65-stage-static-application-qa.json',JSON.stringify({...application,reportEvidence:await evidence(applicationFile),manualVisualReview:applicationVisual?{status:applicationVisual.status,reviewer:applicationVisual.reviewer,capturesViewed:applicationVisual.capturesViewed,captures:applicationVisual.captures,observations:applicationVisual.observations,limits:applicationVisual.limits,evidence:await evidence(applicationVisualFile)}:'PENDING_AGENT_IMAGE_INSPECTION'},null,2)+'\n');
}
const floor=await read('docs/v65-stage-floor-proof.json');
const nativeByPath=new Map();
for(const stage of manifest.stages)for(const plane of stage.planes)for(const asset of plane.assets)for(const frame of asset.frames){
 nativeByPath.set(frame.path,{path:frame.path,sha256:frame.generation.sha256,width:frame.generation.width,height:frame.generation.height});
}
const nativeFiles=[...nativeByPath.values()];
const delivery={schemaVersion:1,release:'V65',updatedAt:new Date().toISOString(),scope:'Six existing original stages receive static art revisions; no new animation work in this lot.',
 status:application?.status==='PASS'?'LOCAL_APPLICATION_QA_PASS_NOT_PUBLICATION':'STATIC_RENDERER_PASS_AWAIT_APPLICATION_QA',
 counts:{existingStagesRevised:6,newArenaIds:0,newNativePngs:12,newStaticDrawings:30,newBackdrops:6,newModuleDrawings:24,staticModulePlacementsNotCountedAsDrawings:true,newAnimationFrames:0,newStageEvents:0,nativeGenerationCalls:14,preservedIntermediateGenerations:2,reusedFloorPngs:new Set(floor.rows.map(r=>r.source)).size,deletedHistoricalFiles:0,canonicalDossiersCertifiedComplete:0},
 stages:workbook.priority.map(row=>({stageId:row.stageId,name:row.name,workbookKey:row.workbookKey,cells:row.cells,before:row.visualFinding,canonicalLocation:false,eventsNotDeliveredByThisStaticLot:row.eventCellsStillNotDeliveredByThisStaticLot})),
 nativeFiles,
 sourceWorkbook:workbook.source,
 reconciliation:workbook.counts,
 floorReuse:{proof:'docs/v65-stage-floor-proof.json',sourcePngsEdited:false,contactY:430,fasciaY:454,fasciaHeight:240,arena036:'Uses unchanged contact and fascia PNGs from arena020, selected through original manifest ID plus SHA. Superseded ruins-tribunal images remain intact.'},
 correctedDuringVisualReview:['Throne020 lowered10worldunits so its painted lower steps meet the solid floor.','036 backdrop framing preserves both original moons; this is not a canonical astronomical claim.','036 figurative reused floor removed from runtime selection; technical floor020 reused without resizing its source PNG.'],
 preservation:{oldArenaIds:true,combatSimulationUnchanged:true,oldNativeFilesByteIdentical:true,sourceWorkbookImmutable:true,mechanism:'Versioned static overlay binds all historical source IDs and SHA; mismatched historical sources keep the prior kit. Reused floor sources also require exact SHA.'},
 qa:{targetedTests:{status:'PASS',count:39,log:await evidence(testFile)},renderer:{status:'PASS',cameraChecks:60,captures:66,proof:'docs/v65-stage-static-renderer-qa.json'},independentVisualReview:visual?await evidence(visualFile):{status:'PENDING'},application:application?{status:application.status,checks:application.checks.length,captures:application.captures.length,proof:'docs/v65-stage-static-application-qa.json'}:{status:'PENDING_FINAL_COMPILED_V65_SERVER'}},
 limits:['These six original project environments are adaptations guided by Yautja visual vocabulary, not certified1:1canonical locations.','All174workbookdossiers resolve to170runtime targets; this does not certify their art, animation or narrative completion.','The18animation requirements associated with these six dossiers remain outside this static lot.','The other181runtime arena kits were not visually certified by this lot.','V63 missing native ambient-register coverage does not mean absent backdrops.','No new character, new route, campaign chapter or new background animation is claimed.','Local tests, compiled builds, commit, deployment and public browser verification remain separate gates.']};
assert.equal(delivery.nativeFiles.length,12);assert.equal(delivery.counts.reusedFloorPngs,4);
if(journeyTestText)delivery.qa.journeyCompatibility={status:'PASS',count:34,log:await evidence(journeyTestFile),note:'Historical six-PNG assumption replaced by six complete rendering passes, distinct valid source regions and world-locked floor checks. Transfer consequences, replay checksums and both fighters remain tested; no runtime change.'};
await fs.writeFile('docs/v65-stage-static-delivery.json',JSON.stringify(delivery,null,2)+'\n');
console.log(JSON.stringify({status:delivery.status,nativeFiles:delivery.nativeFiles.length,renderer:renderer.status,application:application?.status??'PENDING'}));
