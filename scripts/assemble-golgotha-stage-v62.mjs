import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { serializePitArenaRuntimeData } from './build-pit-arena-runtime-v33.mjs';
const source='art-source/v33/pit-arenas/production-manifest.json',runtime='app/game/pitArenaProductionData.generated.json';
const oldId='arena-051-golgotha-etude-jaguar',id='arena-187-golgotha-uscm-airlock',name='Camp Golgotha — sas USCM';
const setting='Base d’entraînement USCM : sas, vitrage et conduits industriels. Adaptation latérale originale du cadre décrit par le manuel Atari Jaguar.';
const url='https://www.atariage.com/manual_html_page.php?SoftwareLabelID=1060';
const lore={schemaVersion:1,release:'V62',stages:[{id,catalogueNumber:187,name,kind:'game',workId:'avp-jaguar-1994',workTitle:'Alien vs Predator (Atari Jaguar,1994)',setting,
  palette:{sky:'#111a18',ground:'#333c3a',accent:'#99bbb0'},referenceStatus:'work-setting',sourceUrl:url,sourceUrls:[url],
  sourceClaim:'Le manuel original décrit Camp Golgotha comme une base USCM avec sas, ascenseurs, terminaux et conduits. Cette géométrie latérale et ces figurants anonymes sont des adaptations originales, pas une reproduction1:1. L’ancien décor de cascades est conservé sous identité originale avec son ID historique.',dedicatedFighters:[]}],associations:[]};
const data=JSON.parse(await fs.readFile(source,'utf8')),before=JSON.stringify(data.stages.filter(s=>![oldId,id].includes(s.catalogueId)));
const old=data.stages.find(s=>s.catalogueId===oldId);assert(old);
const oldPaths=old.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path)));
old.name='Cataractes des Anciens · création originale';old.setting='Ruines Yautja et cascades — création originale conservée, sans attribution au Camp Golgotha.';
old.loreReclassificationV62={previousName:'Golgotha — étude Jaguar',preservedRuntimeId:true,preservedImagePaths:oldPaths,reason:'The original image depicts stone ruins and waterfalls, inconsistent with the USCM installation documented by the original Jaguar manual.',replacementLoreStageId:id,sourceUrl:url};
const compositionsPath='app/game/systems/pitArenaCompositionsV42.generated.json',compositions=JSON.parse(await fs.readFile(compositionsPath,'utf8'));
const oldDefinition=compositions.find(s=>s.id===oldId);assert(oldDefinition);oldDefinition.name=old.name;oldDefinition.setting=old.setting;
const nativePath='C:/Users/chuck/.codex/generated_images/01a0f3e9-692a-7751-b7cb-3b41ede4d39a/exec-7f686087-6b89-4178-b5d5-cdcdf3d7f71f.png';
const native=await fs.readFile(nativePath),metadata=await sharp(native).metadata(),digest=createHash('sha256').update(native).digest('hex');
const src=`/game/sprites/v62/pit-arenas/${id}/p0-depth.png`,workspace=`work-local/v62/public-sprites/pit-arenas/${id}/p0-depth.png`;
await fs.mkdir(path.dirname(workspace),{recursive:true});await fs.copyFile(nativePath,workspace);
const receiptPath=`docs/v62-generation/${id}-p0-depth.json`,requests=JSON.parse(await fs.readFile('docs/v62-golgotha-art-requests.json','utf8'));
const receipt={schemaVersion:1,stageId:id,id:'p0-depth',mode:'built-in-imagegen',nativePath,workspacePath:workspace,prompt:requests.p0.prompt,
  sha256:digest,bytes:native.length,width:metadata.width,height:metadata.height,hasAlpha:Boolean(metadata.hasAlpha),copyByteIdentical:true,status:'visually-accepted',
  visualNotes:'Closed industrial military corridor, two empty steel observation recesses, continuous distant walkway, no baked characters, no stone/waterfall. Six-plane runtime composition reviewed separately.',
  loreLimits:['Original lateral adaptation of manual-attested setting, not exact Jaguar level geometry.','P1–P5 are declared unchanged modular industrial library assets; only P0 is newly generated here.'],sourceUrls:[url],sourceCells:['09_STAGES!A50:N50','09_STAGES!A107:N107']};
const stage=structuredClone(data.stages.find(s=>s.catalogueId==='arena-130-avp-classic-2000-space-station'));assert(stage);
Object.assign(stage,{number:187,catalogueId:id,assetDirectory:`/game/sprites/v62/pit-arenas/${id}`,name,setting,wave:'v62-workbook-lore-correction',legacyRuntimeArenaId:null,legacyRuntimeStatus:'concept',sourceConfirmation:'confirmed',runtimeEnabled:true,compositionContract:'v62-original-uscm-base-with-declared-industrial-library',
  screenReference:{kind:'game',workId:'avp-jaguar-1994',fidelityClaim:'publisher-manual-setting-original-lateral-adaptation-not-certified-1to1',referenceStatus:'manual-setting-attested'},
  runtimeExtension:{arenaId:id,gameplayProfile:'neutral-duel-v1',rendererEvidence:`docs/v62-${id}-renderer-qa.json`,applicationEvidence:'docs/v62-stage-application-qa.json'},
  compositionVisualReview:{evidence:'docs/v62-stage-composition-visual-review.json',digestMethod:'sha256-json-planes'}});
delete stage.v62FloorCorrection;
const p0=stage.planes.find(p=>p.id==='P0'),asset=p0.assets[0];
asset.role='Base USCM originale — architecture distante sans acteur intégré';
asset.frames=[{path:src,status:'integrated',generation:{generator:'openai-imagegen',source:receiptPath,sha256:digest,width:metadata.width,height:metadata.height,hasAlpha:Boolean(metadata.hasAlpha),contentBounds:{x:0,y:0,width:metadata.width,height:metadata.height}},review:{evidence:receiptPath,coherence:true,layout:true,alpha:true},integration:{evidence:`docs/v62-${id}-renderer-qa.json`}}];
stage.compositionVisualReview.digest=createHash('sha256').update(JSON.stringify(stage.planes)).digest('hex');
data.stages=data.stages.filter(s=>s.catalogueId!==id).concat(stage).sort((a,b)=>a.number-b.number);
assert.equal(JSON.stringify(data.stages.filter(s=>![oldId,id].includes(s.catalogueId))),before);
assert.deepEqual(old.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path))),oldPaths);
await fs.writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
await fs.writeFile('app/game/systems/pitLoreStagesV62.generated.json',JSON.stringify(lore,null,2)+'\n');
await fs.writeFile(compositionsPath,JSON.stringify(compositions,null,2)+'\n');
await fs.writeFile(source,JSON.stringify(data,null,2)+'\n');await fs.writeFile(runtime,serializePitArenaRuntimeData(data));
await fs.writeFile('docs/v62-golgotha-reconciliation.json',JSON.stringify({release:'V62',oldStage:{id:oldId,name:old.name,preserved:true,imagePaths:oldPaths},newStage:{id,name,sourceUrl:url},workbookMappings:[{stageKey:'ST046',stageCells:'09_STAGES!A50:N50',events:['10_VIE_DES_STAGES!E140','10_VIE_DES_STAGES!E141','10_VIE_DES_STAGES!E142'],targetStageId:id},{stageKey:'ST103',stageCells:'09_STAGES!A107:N107',events:['10_VIE_DES_STAGES!E311','10_VIE_DES_STAGES!E312','10_VIE_DES_STAGES!E313'],targetStageId:id,eventsImplemented:false}],duplicateDossiersStillRetained:true,oldSavedStageIdsMigrated:false,oldSavedStageIdsStillPlayable:true,unverified:'Exact Jaguar geometry, named Predator model, chapter route and separate ST103 event trio remain open.'},null,2)+'\n');
console.log(JSON.stringify({newStage:id,preservedStage:oldId,backgroundPng:digest,sharedPlanes:5}));
