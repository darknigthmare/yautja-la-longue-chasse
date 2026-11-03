#!/usr/bin/env node
/** Read-only extraction from genuine whole-GameClient browser samples.
 * No simulation, actor placement, state replay or fabricated screenshot.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {discoverySignalLabelV112} from '../app/game/discoverySignalsV112.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
const argv=process.argv.slice(2),option=(key,fallback)=>argv.includes(key)?argv[argv.indexOf(key)+1]:fallback;
const out=path.resolve(root,option('--output','docs/qa/v112-discovery-observation'));
const paths=option('--samples','outputs/qa-hunt-campaign-browser-v112/second-run/hunt-samples.json,outputs/qa-hunt-campaign-browser-v112/remaining-run-r2/ice-cryostalker-hunt-samples.json,outputs/qa-hunt-campaign-browser-v112/remaining-run-r3/ice-cryostalker-hunt-samples.json').split(',');
await mkdir(out,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const runs=[];
for(const [runIndex,sourcePath] of paths.entries()){
  const bytes=await readFile(path.resolve(root,sourcePath)),samples=JSON.parse(bytes);assert.ok(Array.isArray(samples)&&samples.length);
  const sourceReportPath=path.join(path.dirname(sourcePath),'report.json'),sourceReportBytes=await readFile(path.resolve(root,sourceReportPath)),sourceReport=JSON.parse(sourceReportBytes);
  assert.match(sourceReport.sourceCommit,/^[a-f0-9]{40}$/);
  const receipts=new Map(),pending=new Map(),badgeCandidates=[],investigationOrders=[],modeTransitions=[];
  for(let index=0;index<samples.length;index++){
    const current=samples[index],g=current.state,previous=samples[index-1]?.state;
    assert.ok(g&&g.ecosystem&&g.enemies&&Number.isFinite(g.elapsed));
    for(const receipt of g.ecosystem.receipts)if(!receipts.has(receipt.id))receipts.set(receipt.id,{firstObservedSample:index,firstObservedElapsed:g.elapsed,...receipt});
    for(const radio of g.ecosystem.pendingRadios){const key=JSON.stringify([radio.corpseId,radio.sourceActorId,radio.dueAt]);
      if(!pending.has(key))pending.set(key,{sample:index,elapsed:g.elapsed,...radio});}
    for(const reaction of g.ecosystem.reactions){
      const actor=g.enemies.find(e=>e.id===reaction.actorId);
      if(!actor?.alive||!actor.active||reaction.until<=g.elapsed)continue;
      const x=actor.x+actor.width/2-g.cameraX,y=actor.y-23-(g.cameraY??0);
      if(x-66>=0&&x+66<=1280&&y-13>=0&&y+13<=720)badgeCandidates.push({sample:index,elapsed:g.elapsed,actorId:actor.id,
        actorKind:actor.kind,label:discoverySignalLabelV112(reaction),reaction,badgeCenter:{x,y},
        geometryOnly:'Native badge rectangle fits the Canvas bitmap; no claim about a matching captured frame, occlusion or human readability.'});
    }
    for(const actor of g.enemies){
      const brain=g.aiBrains?.[actor.id],prior=previous?.aiBrains?.[actor.id];
      if(actor.alive&&actor.active&&actor.riteInvestigate&&actor.riteInvestigate.until>g.elapsed)
        investigationOrders.push({sample:index,elapsed:g.elapsed,actorId:actor.id,actorKind:actor.kind,position:{x:actor.x,y:actor.y},order:actor.riteInvestigate,mode:brain?.mode,
          limitation:'Order is observed; local sensory contacts deciding whether it overrides pursuit are not serialized.'});
      if(brain&&prior&&brain.mode!==prior.mode)modeTransitions.push({actorId:actor.id,fromSample:index-1,toSample:index,
        fromElapsed:previous.elapsed,toElapsed:g.elapsed,from:prior.mode,to:brain.mode,lostContactSeconds:brain.lostContactSeconds,
        timeInMode:brain.timeInMode,lastKnownTarget:brain.lastKnownTarget});
    }
  }
  const archived='browser-samples-'+runIndex+'.json.gz';const archive=gzipSync(bytes,{level:6});await writeFile(path.join(out,archived),archive);
  const reportArchive='browser-report-'+runIndex+'.json.gz',reportArchiveBytes=gzipSync(sourceReportBytes,{level:6});await writeFile(path.join(out,reportArchive),reportArchiveBytes);
  const captureObservations=[];
  for(const observed of sourceReport.discoveryObservations??[]){
    if(observed.missionId!==samples[0].missionId)continue;
    const originalPath=path.join(path.dirname(sourcePath),observed.capture),image=await readFile(path.resolve(root,originalPath));
    const declared=sourceReport.captures?.find(c=>c.file===observed.capture);assert.ok(declared);assert.equal(hash(image),declared.sha256);assert.equal(image.length,declared.bytes);
    const file='run-'+runIndex+'-'+path.basename(observed.capture);await writeFile(path.join(out,file),image);
    const snapshot=samples.find(s=>Math.abs(s.state.elapsed-observed.elapsed)<1e-5)?.state;
    const actor=snapshot?.enemies.find(e=>e.id===observed.reaction.actorId),radioReceipt=observed.receipts.find(r=>r.channel==='radio');
    const visualSource=radioReceipt?snapshot?.ecosystem.receipts.find(r=>r.channel==='visual'&&r.actorId===radioReceipt.sourceActorId&&r.corpseId===radioReceipt.corpseId):null;
    const sourceActor=radioReceipt?snapshot?.enemies.find(e=>e.id===radioReceipt.sourceActorId):null;
    captureObservations.push({...observed,file,originalPath,bytes:image.length,sha256:hash(image),width:image.readUInt32BE(16),height:image.readUInt32BE(20),
      matchingSampleFound:!!snapshot,actor:actor?{id:actor.id,kind:actor.kind,alive:actor.alive,active:actor.active,x:actor.x,y:actor.y,factionId:actor.factionId,riteInvestigate:actor.riteInvestigate}:null,
      radioChain:radioReceipt?{receipt:radioReceipt,sourceVisualReceipt:visualSource,observedReceiptDelaySeconds:visualSource?radioReceipt.at-visualSource.at:null,
        sourceActor:sourceActor?{id:sourceActor.id,alive:sourceActor.alive,active:sourceActor.active,x:sourceActor.x,y:sourceActor.y,factionId:sourceActor.factionId}:null,
        sameFaction:actor&&sourceActor?actor.factionId===sourceActor.factionId:null,
        actorOriginDistanceAtObservation:actor&&sourceActor?Math.hypot(actor.x-sourceActor.x,actor.y-sourceActor.y):null}:null,
      interpretation:'Genuine native Canvas capture supplied by the owning campaign run; pixel wording and bounds require separate visual inspection.'});
  }
  const receiptList=[...receipts.values()];
  runs.push({sourcePath,sourceSha256:hash(bytes),sourceBytes:bytes.length,archive:archived,archiveSha256:hash(archive),archiveBytes:archive.length,
    provenanceReport:{path:sourceReportPath,sha256:hash(sourceReportBytes),sourceCommit:sourceReport.sourceCommit,huntSourceSha256:sourceReport.huntSourceSha256,
      archive:reportArchive,archiveSha256:hash(reportArchiveBytes),archiveBytes:reportArchiveBytes.length},captureObservations,
    missionId:samples[0].missionId,sampleCount:samples.length,elapsedRange:[samples[0].state.elapsed,samples.at(-1).state.elapsed],
    uniqueReceiptCounts:{visual:receiptList.filter(r=>r.channel==='visual').length,radio:receiptList.filter(r=>r.channel==='radio').length,scent:receiptList.filter(r=>r.channel==='scent').length},
    receipts:receiptList,pendingRadios:[...pending.values()],badgeCandidates,investigationOrders,modeTransitions,
    adjacentEngageToSearch:modeTransitions.filter(t=>t.from==='engage'&&t.to==='search'),
    strongLostContactSequence:modeTransitions.filter(t=>t.from==='engage'&&t.to==='search'&&t.lostContactSeconds>=1.4)});
}
const sourceFiles=['app/game/discoverySignalsV112.ts','app/game/systems/corpseDiscoveryV112.ts','app/game/HuntCanvas.tsx'];
const sources=[];for(const p of sourceFiles){const bytes=await readFile(path.join(root,p));sources.push({path:p,bytes:bytes.length,sha256:hash(bytes)});}
const result={schemaVersion:1,generatedAt:new Date().toISOString(),qualification:'OBSERVATION_PARTIAL',requirement:'ECO112-11',
  scope:'Source contract plus genuine browser-state observations; no forged actor, corpse, channel, replay or capture. Initial jungle success/ice failure and the later successful ice context are preserved separately; this extraction does not change workbook statuses.',
  sources,runs,summary:{runs:runs.length,samples:runs.reduce((s,r)=>s+r.sampleCount,0),visualReceipts:runs.reduce((s,r)=>s+r.uniqueReceiptCounts.visual,0),
    radioReceipts:runs.reduce((s,r)=>s+r.uniqueReceiptCounts.radio,0),radioReceiptObserved:runs.some(r=>r.uniqueReceiptCounts.radio>0),
    nativeVisualCauseCaptureProvided:runs.some(r=>r.captureObservations.some(c=>c.reaction.channel==='visual')),
    nativeRadioCauseCaptureProvided:runs.some(r=>r.captureObservations.some(c=>c.reaction.channel==='radio')),humanUnderstandingQualified:false,
    strongLostContactSequences:runs.reduce((s,r)=>s+r.strongLostContactSequence.length,0)},
  limits:['A pending radio is not a received radio or a visible radio badge','A geometry candidate is not a screenshot','An investigation order is not proof it overrode hunter pursuit','No human comprehension study','An AI search mode alone does not identify its trigger']};
const capturePath=option('--capture','outputs/qa-hunt-campaign-browser-v112/remaining-run-r2/ice-cryostalker-phase-target.png');
const captureBytes=await readFile(path.resolve(root,capturePath)),captureName='native-ice-animal-avoidance.png';
await writeFile(path.join(out,captureName),captureBytes);
result.nativeCaptures=[{file:captureName,originalPath:capturePath,sha256:hash(captureBytes),bytes:captureBytes.length,
  interpretation:'Visible ÉVITEMENT animal-response badge. This is neither a radio badge nor proof of a human investigation cause.'}];
await writeFile(path.join(out,'observations.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary));
