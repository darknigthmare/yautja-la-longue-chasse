import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const write=async(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n');
const applicationDirectory='work-local/v62/qa/stages/application-final';
const [native,renderer,application,life,oldAudit,reconciliation,production,p0]=await Promise.all([
  'docs/v62-stage-native-assets-qa.json','work-local/v62/qa/stages/renderer/report.json',`${applicationDirectory}/report.json`,
  'app/game/data/pitStageLifeV62.json','docs/v61-stage-open-work.json','docs/v62-golgotha-reconciliation.json',
  'art-source/v33/pit-arenas/production-manifest.json','docs/v62-generation/arena-187-golgotha-uscm-airlock-p0-depth.json'].map(read));
assert.equal(native.result,'PASS');assert.equal(renderer.result,'PASS');assert.equal(application.status,'PASS');
assert.equal(renderer.stages,3);assert.equal(renderer.nativeFrameChecks,54);assert.equal(native.nativePngs,9);
assert.equal(application.completeCurrentManifestGate,true);
for(const [file,digest] of Object.entries({...renderer.coreHashes,...application.sourceHashes}))assert.equal(await hash(file),digest,file+' changed after QA');
const refs=[
 {url:'https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem',scope:'Film identity only; no exact helicopter model, roof geometry or survivor identities certified.'},
 {url:'https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874',scope:'Official game manual; station ambience is a new lateral industrial adaptation, not an exact Classic 2000 hero or level.'},
 {url:reconciliation.newStage.sourceUrl,scope:'Original Atari Jaguar manual text hosted by AtariAge attests Camp Golgotha as USCM training base and describes airlocks, lifts, vents and terminals. Exact geometry and character appearance remain unverified.'}
];
const ids=life.stages.map(s=>s.stageId);
const observations={
 'arena-126-avpr-2007-hospital-roof':[
  'Anonymous adults travel across the far-right service passage, scaled deliberately small for distance and clipped away from the foreground duel. Their native six-pose run also changes world position; they are hidden between occurrences.',
  'Helicopter sits in open sky, separated from the architecture. Steam is mounted on the central rooftop HVAC housing. No named survivors or exact film aircraft claimed.',
  'A first generated steam sheet crossed cell borders and was rejected without deleting its source. The accepted replacement has clean transparent margins.',
  'Distant evacuation remains subtle in the rainy background and can be naturally occluded by foreground fighters. The public movement recipe separates fighters for visual inspection.'
 ],
 'arena-130-avp-classic-2000-space-station':[
  'Anonymous marine crosses a small distant catwalk with a bounded clipping window; visible feet follow the catwalk plane, not the foreground fighting lane.',
  'Door module is aligned to the right service balcony; the warning module is mounted beside it. These are original mechanisms, not a claimed exact recreation of a specific Classic 2000 level.'
 ],
 'arena-187-golgotha-uscm-airlock':[
  'New opaque P0 establishes a closed steel USCM installation instead of stone waterfalls. Two independent framed observation modules stand at the distant raised platform; the sensor mounts on the central wall plate.',
  'The native alpha around the modules is transparent, not black rectangles. Dark interiors are intentional opaque glass/recess artwork.',
  'Anonymous protected sentries and generic Xenomorph are original six-pose adaptations. Exact Jaguar-era models, named Predator and route remain open.',
  'P1–P5 are five explicitly declared reused modular industrial planes. They do not count as new paintings or as six new native planes.'
 ]
};
// Explicit selections were inspected using view_image. Automated capture count is kept separate.
const selectedRenderer={
 [ids[0]]:['wide','actual-game-camera'],
 [ids[1]]:['wide','actual-game-camera'],
 [ids[2]]:['wide','actual-game-camera','right-corner'],
};
const selectedApplication=[`${ids[0]}-event-0.png`,`${ids[0]}-event-2.png`,`${ids[0]}-fighters-apart.png`,`${ids[1]}-event-1.png`,`${ids[2]}-event-1.png`,'reduced-motion.png','mobile-landscape.png','mobile-portrait.png','native-png-retry-restored.png'];
const visual={schemaVersion:1,release:'V62',checkedAt:new Date().toISOString(),status:'PASS-with-declared-adaptation-limits',
 automatedCaptureCount:renderer.captures,allAutomatedCapturesManuallyReviewed:false,
 floorCorrection:{stages:[126,130],contactStripUnchanged:true,fasciaHeightBefore:150,fasciaHeightAfter:180,nativePngsEdited:0,
  observation:'The actual wide camera exposed a 13px untiled lower strip. Raising the separate authored fascia fixes the union of contact strip and front panel. Native tapered tile joints remain the intended panel geometry, not a parallax loading void.'},
 stages:[],applicationCaptures:[],limitations:['No stage is certified 1:1 to original screen geometry.','Anonymous exhibition ambience does not complete chapter routes or conditional cast continuity.','Mobile portrait keeps a wide canvas with letterboxing and separate touch controls; these black margins are outside the rendered stage.']};
for(const id of ids){
 const proof=await read(`docs/v62-${id}-renderer-qa.json`);
 assert.deepEqual(production.stages.find(s=>s.catalogueId===id),proof.sourceInput.production,'A reviewed stage source changed after renderer QA');
 assert.deepEqual(life.stages.find(s=>s.stageId===id),proof.sourceInput.life,'A reviewed animation source changed after renderer QA');
 const captures=[];
 for(const name of selectedRenderer[id]){
  const capture=proof.captures.find(c=>c.name===name);assert(capture);
  assert.equal(await hash(capture.path),capture.sha256);captures.push(capture);
 }
 visual.stages.push({stageId:id,compositionDigest:proof.compositionDigest,acceptedFor:'original-lateral-exhibition',observations:observations[id],captures});
}
for(const file of selectedApplication){const recorded=application.captures.find(c=>c.file===file);assert(recorded);assert.equal(await hash(path.join(applicationDirectory,file)),recorded.sha256);visual.applicationCaptures.push({file:path.join(applicationDirectory,file),sha256:recorded.sha256});}
await write('docs/v62-stage-composition-visual-review.json',visual);
const appProof={...application,rawReport:`${applicationDirectory}/report.json`,rawReportSha256:await hash(`${applicationDirectory}/report.json`),visualReview:'docs/v62-stage-composition-visual-review.json'};
await write('docs/v62-stage-application-qa.json',appProof);
const sourceDossiers=['ST020','ST047','ST046'];
const stages=life.stages.map((s,index)=>{
 const workbook=oldAudit.dossiers.find(d=>d.stageKey===sourceDossiers[index]);assert(workbook);
 return {stageId:s.stageId,name:production.stages.find(d=>d.catalogueId===s.stageId).name,
  change:s.stageId===reconciliation.newStage.id?'new-stage-corrected-setting':'added-native-ambient-triplet',
  stageKey:workbook.stageKey,stageCells:workbook.stageCells,sourceCells:s.continuity.sourceCells,
  nativeSheets:3,nativeDrawings:18,distinctRandomVariants:3,minimumThreeVariantsImplemented:true,
  status:'integrated-original-exhibition-adaptation',literalWorkbookDossierComplete:false,chapterReconstructionComplete:false,
  continuity:s.continuity.note,events:s.events.map((e,i)=>({id:e.id,name:e.name,src:e.src,sha256:e.sha256,sourceCell:s.continuity.sourceCells[i],sourceRequest:workbook.events[i].description,
   status:'native-six-pose-original-ambient-adaptation',literalConditionalCanonComplete:false})),
  newBackdropPngs:s.stageId===reconciliation.newStage.id?1:0,reusedBackdropPlanes:s.stageId===reconciliation.newStage.id?5:6};
});
const duplicates=oldAudit.duplicateTargets.filter(d=>ids.includes(d.targetStageId)||d.targetStageId===reconciliation.oldStage.id)
 .map(d=>({...d,targetStageId:d.targetStageId===reconciliation.oldStage.id?reconciliation.newStage.id:d.targetStageId,
  remainingDossiers:d.dossiers.filter(s=>!sourceDossiers.includes(s.key)).map(s=>({...s,nativeEventsAddedByV62:0,literalCompletionCertified:false})),
  resolution:'Two source dossiers retain six separate event requirements. This lot adds three original exhibition adaptations for the first dossier only; it does not erase or certify the second trio.'}));
const delivery={schemaVersion:1,release:'V62',scope:'stages-only',checkedAt:new Date().toISOString(),status:'INTEGRATED_AND_LOCAL_QA_PASS',
 counts:{affectedStages:3,newPlayableStages:1,currentRuntimeStages:production.stages.filter(s=>s.runtimeEnabled).length,
  addedNativePngs:10,addedAmbientSheets:9,addedNativeAnimationDrawings:54,addedBackdropPngs:1,totalDrawingsIncludingBackdrop:55,
  replacedNativePngs:0,deletedNativePngs:0,renamedPreservedStageIdentities:1,reusedNewStagePlanes:5,newStoryClips:0,
  sourceWorkbookDossiers:174,sourceWorkbookEvents:522,literalDossiersCertifiedComplete:0},
 nativeEvidence:{path:'docs/v62-stage-native-assets-qa.json',sha256:await hash('docs/v62-stage-native-assets-qa.json'),sourcePngsUntouched:true,p0Receipt:'docs/v62-generation/arena-187-golgotha-uscm-airlock-p0-depth.json',p0Sha256:p0.sha256},
 rendererEvidence:{path:'work-local/v62/qa/stages/renderer/report.json',sha256:await hash('work-local/v62/qa/stages/renderer/report.json'),stages:3,cameraChecks:renderer.cameraChecks,nativeFrameChecks:renderer.nativeFrameChecks,captures:renderer.captures,
  currentProductionManifestSha256:await hash('art-source/v33/pit-arenas/production-manifest.json'),reviewedStageInputsStillExact:true,
  scopeNote:'The final manifest only additionally corrected the previousName documentation of preserved stage051. All three reviewed stage inputs and animation entries remain byte-equivalent as JSON objects to the compositor snapshots.'},
 applicationEvidence:{path:'docs/v62-stage-application-qa.json',sha256:await hash('docs/v62-stage-application-qa.json'),status:application.status,checks:application.checks.length,
  desktopStages:application.targets,reducedMotionStage:ids[0],mobileStage:ids[2],retryStage:ids[0],mobilePhysicalDeviceVerified:false,
  savedBytesUnchanged:true,unexpectedErrors:application.errors.length,unexpectedHttpFailures:application.httpFailures.length},
 visualReview:'docs/v62-stage-composition-visual-review.json',
 targetedTests:{commands:['node --test tests/pit-stage-life-v62.test.mjs tests/pit-stage-life-v61.test.mjs tests/pit-stage-story-v61.test.mjs','node --test tests/pit-arena-catalogue.test.mjs tests/pit-stage-life-v62.test.mjs','node --test tests/pit-screen-arenas-v43.test.mjs tests/pit-stage-life-v62.test.mjs','node --test tests/pit-arena-runtime-data.test.mjs'],runsPassed:[18,10,14,6],note:'Runs overlap; do not sum them as distinct tests.'},
 stages,reclassifiedPreservedStage:reconciliation.oldStage,duplicateDossiers:duplicates,primarySources:refs,
 stillOpen:[
  'Wolf equipment, survivor status and pre-destruction chapter continuity; no exact scene route added.',
  'Classic 2000 named hero and full scenario route; not the Classic 2010 hunter.',
  'Jaguar named Predator design, exact base geometry and scenario route; former waterfall study is preserved under original identity.',
  'Second event trios ST167/E503–505, ST170/E512–514 and ST103/E311–313 remain separate and not delivered by this lot.',
  'Badlands/Dek chapter framing ST050 and prior V61 Bloodshed, Last Hunt and Sandpiper scenario callers remain open.',
  'All other literal workbook requirements retain their prior status. An animated exhibition stage is not a completed campaign chapter.'
 ],sourceWorkbook:oldAudit.source,sourceWorkbookModified:false,globalBuildVerifiedByThisAgent:false,publishedByThisAgent:false};
await write('docs/v62-stage-delivery.json',delivery);
console.log(JSON.stringify({result:'PASS',file:'docs/v62-stage-delivery.json',pngs:10,animationDrawings:54,applicationChecks:application.checks.length}));
