import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const write=async(f,d)=>fs.writeFile(f,JSON.stringify(d,null,2)+'\n');
const life=await read('app/game/data/pitStageLifeV63.json'),overlay=await read('app/game/data/pitStageCompositionV63.json'),production=await read('art-source/v33/pit-arenas/production-manifest.json');
const renderer=await read('work-local/v63/qa/stages/renderer/report.json');
const application=await read('work-local/v63/qa/stages/application-final/report.json').catch(()=>null);
const native=[];
for(const file of (await fs.readdir('docs/v63-generation')).filter(f=>f.startsWith('arena-'))){
 const r=await read('docs/v63-generation/'+file),runtimePath=r.frames?life.stages.flatMap(s=>s.events).find(e=>e.sha256===r.sha256)?.src:overlay.corrections.find(c=>c.frame?.generation.sha256===r.sha256)?.frame.path;
 if(!runtimePath||sha(await fs.readFile('public'+runtimePath))!==r.sha256)throw Error('Native runtime copy differs: '+file);
 native.push({receipt:'docs/v63-generation/'+file,path:runtimePath,sha256:r.sha256,drawings:r.frames?.length??1,transparent:r.hasAlpha,copyByteIdentical:true});
}
const floorCorrections=[];
for(const c of overlay.corrections.filter(c=>c.sourceCrop)){
 const a=production.stages.find(s=>s.catalogueId===c.stageId).planes.flatMap(p=>p.assets).find(a=>a.id===c.assetId),source=a.frames[0].path;
 const {data,info}=await sharp('public'+source).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minAlpha=255;
 const b=c.sourceCrop;for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++)minAlpha=Math.min(minAlpha,data[(y*info.width+x)*4+3]);
 if(minAlpha<250)throw Error('Fascia crop has transparent holes');
 floorCorrections.push({stageId:c.stageId,source,sourceSha256:c.sourceSha256,crop:b,minAlpha,originalPlacements:a.placements,runtimePlacements:c.placements,sourcePngEdited:false});
}
const views={
 'arena-126-avpr-2007-hospital-roof':['center','wide','ambient-ambient-06-frame-3'],
 'arena-130-avp-classic-2000-space-station':['center','wide','ambient-ambient-04-frame-3','ambient-ambient-05-frame-3','ambient-ambient-06-frame-3'],
 'arena-051-golgotha-etude-jaguar':['wide','left-corner'],
 'arena-081-cercle-obsidienne':['wide','right-corner'],
 'arena-085-cercle-sang':['wide','actual-game-camera'],
 'arena-087-cercle-ambre':['wide','reduced-motion'],
};
const reviewed=[];for(const [id,names] of Object.entries(views))for(const name of names){const p=`work-local/v63/qa/stages/renderer/${id}/${name}.png`;reviewed.push({path:p,sha256:sha(await fs.readFile(p))});}
await write('docs/v63-stage-native-assets-qa.json',{status:'PASS',checkedAt:new Date().toISOString(),nativeCount:native.length,native,floorCorrections,scope:'Byte/alpha/crop measurements, no pixel editing or synthetic frames.'});
await write('docs/v63-stage-composition-visual-review.json',{status:'ACCEPTED_TARGETED_REVIEW',checkedAt:new Date().toISOString(),reviewed,
 observations:['Roof: civil evacuation excluded; third native P0 edit removes the tiny human silhouettes from the right distant opening. HVAC coupling attaches to a pipe; town lights remain distant; smoke uses rooftop exhaust support.',
 'Station: piston is on the left service balcony behind its own safety rail; steam pipe sits on the rear ledge, well above the fighter head lane; hatch mounts against the structural wall/beam and retains a steady amber lamp.',
 'Four originals: verified blank lower fascia at zoom.8 and reduced.9 before correction. Native opaque panel crop and160px authored height remove the blank band; source art and old stage identities remain unchanged.',
 'Inspection covers the listed perspectives and props, not an exhaustive187-stage art audit. The original arenas are exhibition creations, not canonical Amengi/Yautja home locations.'],
 rejectedP0Attempts:2,pixelEditingOutsideImagegen:false,
 limitations:['No exact film/game geometry or machinery1:1 certification.','No newly authored narrative chapter or canonical character presence.','Original stage floors reuse existing assets and crop them at runtime; no four new floor PNGs claimed.']});
if(application)await write('docs/v63-stage-application-qa.json',application);
const reconciliation=await read('docs/v63-stage-open-work.json');
const delivery={schemaVersion:1,release:'V63',scope:'stages-only',checkedAt:new Date().toISOString(),status:application?.status==='PASS'?'INTEGRATED_AND_LOCAL_QA_PASS':'INTEGRATED_RENDERER_PASS_APPLICATION_PENDING',
 counts:{affectedStages:6,newPlayableStages:0,currentRuntimeStages:187,addedNativePngs:7,addedAmbientSheets:6,addedNativeAnimationDrawings:36,addedBackdropPngs:1,totalDrawingsIncludingBackdrop:37,
  newAmbientEvents:6,retainedV62Events:5,retainedV62AnimationDrawings:30,activeEventsAcrossTwoExpandedStages:11,activeNativeFramesAcrossTwoExpandedStages:66,
  preservedSuppressedAmbientSheets:1,preservedSupersededBackdrops:1,deletedNativePngs:0,originalStagesWithNativeCropCorrections:4,newStoryClips:0,literalDossiersCertifiedComplete:0},
 stages:life.stages.map(s=>({stageId:s.stageId,workbookDossier:s.stageId.includes('126')?'ST167':'ST170',newSourceCells:s.continuity.sourceCells,activeEvents:s.events.length,newEvents:s.events.filter(e=>!e.reusedV62EventId).map(e=>({id:e.id,name:e.name,path:e.src,frames:e.frames.length})),retainedEvents:s.events.filter(e=>e.reusedV62EventId).map(e=>e.id),suppressedEvents:s.suppressedV62Events,chapterReconstructionComplete:false})),
 originalCompositionCorrections:floorCorrections,
 nativeEvidence:{path:'docs/v63-stage-native-assets-qa.json',sha256:sha(await fs.readFile('docs/v63-stage-native-assets-qa.json')),assets:native},
 rendererEvidence:{path:'work-local/v63/qa/stages/renderer/report.json',sha256:sha(await fs.readFile('work-local/v63/qa/stages/renderer/report.json')),status:renderer.result,stages:renderer.stages,cameraChecks:renderer.cameraChecks,nativeFrameChecks:renderer.nativeFrameChecks,captures:renderer.captures},
 visualEvidence:{path:'docs/v63-stage-composition-visual-review.json',reviewedCaptureCount:reviewed.length,scope:'Targeted independent visual inspection, separate from automated captures.'},
 applicationEvidence:application?{path:'docs/v63-stage-application-qa.json',status:application.status,checks:application.checks.length,captures:application.captures.length,version:application.version,url:application.url}:null,
 targetedTests:{command:'node --test tests/pit-stage-life-v62.test.mjs tests/pit-stage-life-v63.test.mjs tests/pit-arena-production.test.mjs',passed:23,failed:0},
 workbookRemaining:{path:'docs/v63-stage-open-work.json',counts:reconciliation.counts,priorityOpen:reconciliation.priorityOpen},
 primaryReferences:[{url:'https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem',supports:'Film identity and setting context only, not exact roof geometry or machinery.'},{url:'https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf?t=1415299874',supports:'Official game manual: industrial steam/electrical environment and screens. New piston/hatch are original workbook adaptations, not exact attested props.'}],
 limits:['174 workbook dossiers do not mean174 newly completed stages. Existing backgrounds map to170 targets among187 runtime arenas.','Six new event adaptations do not certify522 workbook events.','ST103 separate trio and its conditional silhouette remain open. E62 roof evacuation is now inactive until a coherent separate continuity is authored.','Bloodshed/Last Hunt/Sandpiper exact narrative callers and chapter conditions remain open.','Only six stages were visually audited in this lot.','No publication or public runtime verification performed by this local proof.']};
await write('docs/v63-stage-delivery.json',delivery);console.log(JSON.stringify({status:delivery.status,counts:delivery.counts,application:delivery.applicationEvidence}));
