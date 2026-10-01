import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const bundle=buildSync({stdin:{contents:`export * from './app/game/systems/homeworldContractsV68';export * from './app/game/systems/homeworldContractNarrativeV70';
 export * from './app/game/systems/homeworldRegionsV68';export {defaultSave} from './app/game/save';export {homeworldInteriorForBuildingV64} from './app/game/systems/homeworldInteriorsV64';
 export {default as Panel} from './app/game/HomeworldContractsV68';`,resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node',external:['react','react/jsx-runtime'],loader:{'.css':'empty'},outfile:'contract-narrative-v70.cjs',logLevel:'silent'});
const evaluated={exports:{}};new Function('require','module','exports',bundle.outputFiles.find(f=>f.path.endsWith('.cjs')).text)(createRequire(import.meta.url),evaluated,evaluated.exports);const api=evaluated.exports;
const defs=api.HOMEWORLD_CHAIN_CONTRACTS_V69,d=id=>defs.find(x=>x.id===id),n=(s,id='v69-return-1')=>api.contractChapterNarrativeV70(s,id);
const where=id=>{const def=d(id),room=api.homeworldInteriorForBuildingV64(def.buildingId),point=room.points.find(p=>p.pointId===def.pointId);return {eligible:true,interiorId:def.buildingId,pointId:def.pointId,npcId:def.giverNpcId,actor:{x:point.x,y:point.y+45}};};
const act=(s,id,kind='accept')=>api.applyHomeworldContractV68(s,{kind,contractId:id},where(id));
// Declared model fixtures, never claimed as browser play. The existing real
// ground/target/counter validators must accept each event before presentation.
const event=(regionId,action,runId,tick=1500)=>({version:1,regionId,action,runId,tick,walked:2300,trailCount:3,evaded:2,armed:false,observedTicks:90,touches:3,interventions:2,
 actor:action==='survey'?api.HOMEWORLD_REGION_TRACES_V68[2]:action==='recover'?{x:7720,y:2220}:action==='report'?{x:api.HOMEWORLD_REGIONS_V68[regionId].residents[0].x,y:api.HOMEWORLD_REGIONS_V68[regionId].residents[0].y+45}:{x:7450,y:2050},
 siteId:`${regionId}-${action==='survey'?'trail-3':action==='recover'?'cache':action==='report'?'guide':action}`,targetId:`${regionId}-${action==='survey'?'trail':action==='report'?'guide':action==='track'||action==='challenge'?'fauna':'relay'}`});
const record=(s,e)=>api.recordContractsFieldEventV68(s,e,{regionId:e.regionId,runId:e.runId}).state;
function ready(s,id){for(const [i,o] of d(id).objectives.entries()){const run=`${id}-physical-${i}`;s=api.bindContractsVillageRunV68(s,o.regionId,run).state;s=record(s,event(o.regionId,o.action,run));s=record(s,event(o.regionId,'report',run,1800));}return s;}

test('all published V69 definitions, IDs, rewards and checkpoint bytes remain unchanged',async()=>{
 const old=JSON.parse(await readFile(new URL('./fixtures/homeworld-chains-v69-published.json',import.meta.url),'utf8'));assert.deepEqual(defs,old.definitions);
 let state=act(undefined,'v69-return-1').state;state=api.bindContractsVillageRunV68(state,'ash-marches','existing-run').state;
 const bytes=JSON.stringify(state);n(state);api.contractRegionNarrativesV70(state,{regionId:'ash-marches',runId:'existing-run'});
 assert.equal(JSON.stringify(state),bytes);assert.equal(JSON.stringify(api.normalizeHomeworldContractsV68(JSON.parse(bytes))),bytes);
});
test('eight distinct voices provide motive, briefing, report and persistent thanks without new save fields',()=>{
 assert.equal(Object.keys(api.HOMEWORLD_CONTRACT_VOICES_V70).length,8);
 for(const field of ['motive','briefing','delivery','thanks'])assert.equal(new Set(Object.values(api.HOMEWORLD_CONTRACT_VOICES_V70).map(v=>v[field])).size,8);
 for(const def of defs){const v=api.HOMEWORLD_CONTRACT_VOICES_V70[def.id];for(const field of ['motive','briefing','delivery','thanks'])assert(v[field].length>50);}
 assert.equal(n(undefined).phase,'briefing');assert.equal(n(undefined,'v69-return-2').phase,'locked');assert.equal(n(undefined,'ash-marches-track'),null);
});
test('presentation follows departure, performed proof, guide confirmation and actual giver delivery in order',()=>{
 let state=act(undefined,'v69-return-1').state;assert.equal(n(state).phase,'departure');
 state=api.bindContractsVillageRunV68(state,'ash-marches','live').state;assert.equal(n(state).phase,'field');assert.equal(n(state).confirmedReports.length,0);
 state=record(state,event('ash-marches','track','live'));assert.equal(n(state).phase,'guide');assert.equal(n(state).confirmedReports.length,0);
 const before=structuredClone(state);assert(!act(state,'v69-return-1','deliver').changed);assert.deepEqual(state,before);
 state=record(state,event('ash-marches','report','live',1800));assert.equal(n(state).phase,'departure');assert.equal(n(state).confirmedReports.length,1);
 state=ready(state,'v69-return-1');assert.equal(n(state).phase,'delivery');assert.equal(n(state).confirmedReports.length,2);assert(n(state).requiredEvidence.some(s=>s.includes('Grottes')));
 state=act(state,'v69-return-1','deliver').state;assert.equal(n(state).phase,'thanks');assert.equal(api.contractMarksV68(state),44);
 assert.equal(n(JSON.parse(JSON.stringify(state))).reply,n(state).reply);
});
test('future data, forged completion and unsaved pending events cannot produce a thank-you or acknowledgement',()=>{
 const active=act(undefined,'v69-return-1').state,forged=structuredClone(active);forged.entries[0].status='completed';
 for(const raw of [{...active,version:3},forged,{version:2,serial:1,entries:[]}]){
  if(api.isHomeworldContractsV68(raw))continue;assert.equal(n(raw),null);assert.deepEqual(api.contractRegionNarrativesV70(raw,{regionId:'ash-marches',runId:'live'}),[]);
 }
 const binding=api.bindContractsVillageRunV68(active,'ash-marches','live').state;
 assert.equal(n({...binding,pendingFieldEvent:event('ash-marches','track','live')}).phase,'field');
 assert.equal(api.contractRegionNarrativesV70(binding,{regionId:'ash-marches',runId:'live'})[0].confirmedReport,null);
});
test('regional narration requires the accepted live run; service visits, other runs and suspension stay uncredited',()=>{
 let state=act(undefined,'v69-return-1').state;assert.deepEqual(api.contractRegionNarrativesV70(state,{regionId:'ash-marches',runId:'service-visit'}),[]);
 state=api.bindContractsVillageRunV68(state,'ash-marches','live').state;
 for(const context of [{regionId:'ash-marches',runId:'other'},{regionId:'thermal-caves',runId:'live'},{regionId:'ash-marches',runId:'live',suspended:true}])assert.deepEqual(api.contractRegionNarrativesV70(state,context),[]);
 assert.equal(api.contractRegionNarrativesV70(state,{regionId:'ash-marches',runId:'live'})[0].status,'field');
 state=record(state,event('ash-marches','track','live'));assert.equal(api.contractRegionNarrativesV70(state,{regionId:'ash-marches',runId:'live'})[0].status,'guide');
 state=record(state,event('ash-marches','report','live',1800));const narrated=api.contractRegionNarrativesV70(state,{regionId:'ash-marches',runId:'live'})[0];
 assert.equal(narrated.status,'reported');assert.match(narrated.instruction,/Grottes/);assert.match(narrated.confirmedReport,/Observation calme/);
});
test('all eight completed chapters preserve their own reports and recognition, with exactly the old 474 marks',()=>{
 let state;for(const def of defs){state=act(state,def.id).state;state=ready(state,def.id);assert.equal(n(state,def.id).phase,'delivery');state=act(state,def.id,'deliver').state;
  const presentation=n(state,def.id);assert.equal(presentation.phase,'thanks');assert.equal(presentation.confirmedReports.length,def.objectives.length);
  assert.equal(presentation.reply,api.HOMEWORLD_CONTRACT_VOICES_V70[def.id].thanks);assert.deepEqual(Object.keys(state).sort(),['entries','serial','version']);}
 assert.equal(api.contractMarksV68(state),474);
});
test('abandoning shows a new-sortie request while retaining already delivered chapters',()=>{
 let state=act(undefined,'v69-return-1').state;state=act(ready(state,'v69-return-1'),'v69-return-1','deliver').state;state=act(state,'v69-return-2').state;
 state=act(state,'v69-return-2','abandon').state;assert.equal(n(state,'v69-return-2').phase,'paused');assert.equal(n(state).phase,'thanks');
 state=act(state,'v69-return-2','resume').state;assert.equal(n(state,'v69-return-2').confirmedReports.length,0);assert.equal(api.contractMarksV68(state),44);
});
test('an abandoned partial attempt never presents its old reports as requirements already fulfilled for the restart',()=>{
 let state=act(undefined,'v69-return-1').state;
 state=api.bindContractsVillageRunV68(state,'ash-marches','old-attempt').state;
 state=record(state,event('ash-marches','track','old-attempt'));
 state=record(state,event('ash-marches','report','old-attempt',1800));
 assert.equal(n(state).confirmedReports.length,1);
 state=act(state,'v69-return-1','abandon').state;
 const bytes=JSON.stringify(state),paused=n(state);
 assert.equal(paused.phase,'paused');assert.equal(paused.stageIndex,0);
 assert.deepEqual(paused.confirmedReports,[]);
 assert.equal(JSON.stringify(state),bytes,'Historical checkpoints are not deleted by presentation');
 assert.deepEqual(api.contractRegionNarrativesV70(state,{regionId:'ash-marches',runId:'old-attempt'}),[]);
});
test('the sensitive Reserve keeps the separate convoy investigation gate despite completed village contracts',()=>{
 let state=act(undefined,'v69-measure-1').state;state=act(ready(state,'v69-measure-1'),'v69-measure-1','deliver').state;
 state=act(state,'v69-measure-2').state;state=act(ready(state,'v69-measure-2'),'v69-measure-2','deliver').state;
 const save=api.defaultSave();save.homeworld.contractsV68=state;
 assert.equal(save.homeworld.expeditions['glass-desert'],null);
 assert.equal(api.canEnterHomeworldRegionV68(save,'forbidden-reserve').allowed,false,'The separate expedition is still required');
 state=act(state,'v69-measure-3').state;state=api.bindContractsVillageRunV68(state,'first-city-ruins','ruins').state;
 state=record(state,event('first-city-ruins','survey','ruins'));state=record(state,event('first-city-ruins','report','ruins',1800));
 const narrative=n(state,'v69-measure-3');assert.equal(narrative.phase,'departure');
 for(const term of ['journal','diversion','passage','Contrôle d’amarrage','autorisation adulte'])assert(narrative.accessNotice.includes(term));
 assert(narrative.reply.includes(narrative.accessNotice));assert.equal(n(state).accessNotice,null);
 const html=renderToStaticMarkup(React.createElement(api.Panel,{value:state,npcId:d('v69-measure-3').giverNpcId,eligible:true,disabled:false,reducedMotion:true,onAction(){}}));
 assert.match(html,/data-contract-access-notice-v70/);assert.match(html,/Les seuls rapports des villages ne la remplacent pas/);
});
test('the inherited ward copy is corrected in presentation to match the real reducer timing',()=>{
 const original=api.HOMEWORLD_BOARD_CONTRACTS_V68.find(d=>d.id==='pillar-jungle-ward');assert.match(original.brief,/accalmies/);
 const displayed=api.contractBriefDisplayV70(original.id,original.brief);assert.match(displayed,/avertissements/);assert.doesNotMatch(displayed,/accalmies/);
 assert(api.contractEvidenceInstructionsV70('ward').some(s=>s.includes('avertissements')));assert.equal(api.contractBriefDisplayV70('ash-marches-track','unchanged'),'unchanged');
 let s=api.createHomeworldRegionV68('pillar-jungle','timing-model',true);s={...s,tick:516,walked:1000,greeted:['guide'],traces:['trail-1','trail-2','trail-3'],actor:{...s.actor,x:6990,y:1870}};
 s=api.stepHomeworldRegionV68(s,{interact:true});assert.deepEqual(s.protectedPosts,[],'Calm does not fix a beacon');
 s={...s,tick:720};s=api.stepHomeworldRegionV68(s,{interact:true});assert.deepEqual(s.protectedPosts,['ward-1'],'Warning actually fixes a beacon');assert(api.normalizeHomeworldRegionV68(s));
});
test('rendered cards show chapter voice and inspectable evidence; gratitude appears only after delivery',()=>{
 const render=value=>renderToStaticMarkup(React.createElement(api.Panel,{value,npcId:'market-artisan',eligible:true,disabled:false,reducedMotion:true,onAction(){}}));
 const initial=render(undefined);assert.match(initial,/data-contract-narrative-v70="briefing"/);assert.match(initial,/Motif et preuves du dossier/);assert.doesNotMatch(initial,/data-contract-narrative-v70="thanks"/);
 const done=act(ready(act(undefined,'v69-return-1').state,'v69-return-1'),'v69-return-1','deliver').state;
 const completed=render(done);assert.match(completed,/data-contract-narrative-v70="thanks"/);assert.match(completed,/Rapports confirmés/);assert.match(completed,/La Soigneuse|la Soigneuse/);
});
