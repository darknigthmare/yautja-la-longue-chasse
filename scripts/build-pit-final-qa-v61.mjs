import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files={native:'docs/v61-native-assets-qa.json',composition:'work-local/v61/qa/renderer/report.json',visual:'docs/v61-stage-composition-visual-review.json',ambientA:'work-local/v61/qa/application-a/report.json',ambientB:'work-local/v61/qa/application-b/report.json',story:'work-local/v61/qa/story-application-final/report.json',hydra:'work-local/v61/qa/hydra-exclusion-final/report.json',replay:'work-local/v61/qa/replay-v9-final/report.json',assets:'work-local/v61/qa/local-served-assets.json'};
const reports={},proofs={};
for(const [id,file] of Object.entries(files)){
 const bytes=await fs.readFile(file),data=JSON.parse(bytes);reports[id]=data;
 assert(['PASS','visually-accepted'].includes(data.result??data.status),`${id}: no successful final proof`);
 for(const [source,hash] of Object.entries({...data.sourceHashes,...data.coreHashes,...data.inputFileHashes}))assert.equal(sha(await fs.readFile(source)),hash,`${id}: stale source ${source}`);
 proofs[id]={file,sha256:sha(bytes),result:data.result??data.status,checkedAt:data.checkedAt??null};
}
const life=JSON.parse(await fs.readFile('app/game/data/pitStageLifeV61.json','utf8')),story=JSON.parse(await fs.readFile('app/game/data/pitStageStoryV61.json','utf8'));
const expected=life.stages.map(s=>s.stageId).sort(),observed=[...new Set([...reports.ambientA.targets,...reports.ambientB.targets])].sort();
assert.deepEqual(observed,expected);assert(reports.ambientA.cases.includes('desktop')&&reports.ambientB.cases.includes('desktop'));
for(const c of ['reduced','mobile','retry'])assert(reports.ambientA.cases.includes(c));
assert.deepEqual([...reports.story.targets].sort(),story.stages.map(s=>s.stageId).sort());
for(const c of ['desktop','reduced','mobile','retry'])assert(reports.story.cases.includes(c));
assert.equal(reports.assets.expectedPaths,reports.native.nativePngs);assert.equal(reports.assets.checks.length,reports.native.nativePngs);
const logs={};for(const [id,file] of Object.entries({tests:'work-local/v61/full-tests.log',targeted:'work-local/v61/targeted-final.log',lint:'work-local/v61/lint-final.log',vinext:'work-local/v61/vinext-build-final.log',next:'work-local/v61/next-build-final.log'})){
 const bytes=await fs.readFile(file);logs[id]={file,sha256:sha(bytes)};
 const text=bytes.toString();if(id==='tests'){assert.match(text,/tests 1913/);assert.match(text,/pass 1913/);assert.match(text,/fail 0/);}
 if(id==='targeted')assert.match(text,/fail 0/);
 if(id==='lint')assert.match(text,/0 errors, 3 warnings/);
 if(id==='vinext')assert.match(text,/Build complete/);
 if(id==='next'){assert.match(text,/Compiled successfully/);assert.match(text,/Finished TypeScript/);assert.match(text,/Route \(app\)/);}
}
const report={result:'PASS',release:'V61',checkedAt:new Date().toISOString(),scope:{existingStagesGivenThreeNativeAmbients:7,correctedHydraStage:1,conditionalStages:5,distinctAffectedStages:11,nativePngs:reports.native.nativePngs,nativeDrawings:reports.native.nativeDrawings,newlyIntegratedSheets:reports.native.newlyIntegratedSheets,reusedV60Sheets:reports.native.reusedV60Sheets,previouslyGeneratedUnusedGongNowIntegrated:1,registeredSheetsNewlyGeneratedForThisPass:26,preparedEngineerNotRegistered:true,bytes:reports.native.bytes},checks:{fullTests:1913,targetedFinal:true,lintErrors:0,preExistingLintWarnings:3,vinextBuild:true,nextBuild:true,ambientApplicationStages:observed.length,conditionalApplicationStages:reports.story.targets.length,rendererStages:reports.composition.stages,rendererCameraChecks:reports.composition.cameraChecks,rendererCellObservations:reports.composition.nativeFrameChecks,visuallyReviewedRendererCaptures:reports.visual.reviewedCaptures,all29LocalHttpHashes:true,replayV9Checksum:reports.replay.checksum},proofs,logs,applicationFlowVerified:true,publicationPerformed:false,limits:['Local completion only; publication and public HTTP/browser gates remain separate.','174 workbook dossiers and 522 event requests are not all completed.','Original environmental alternatives do not close exact fauna/visitor/Artifact requirements.','Four narrative variants and explicit scenario callers remain open; prepared Engineer art is inactive.','Mobile is Chromium emulation, not physical-device testing.','Only the listed representative screenshots received visual inspection.'],remaining:'docs/v61-stage-open-work.md'};
await fs.writeFile('docs/v61-final-qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,scope:report.scope,checks:report.checks}));
