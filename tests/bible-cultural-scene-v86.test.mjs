import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/bibleSceneCulturalV86.ts');
const regionApi=qa.load('app/game/systems/homeworldRegionsV68.ts');
const b=api.BIBLE_CULTURAL_BINDING_V86,owner='2026-10-07T12:00:00.000Z';
function runtime(){
 const region=regionApi.createHomeworldRegionV68('storm-chain','v86-local-return',true);
 Object.assign(region,{tick:3600,walked:8000,greeted:['guide'],traces:['trail-1','trail-2','trail-3'],observedTicks:90,
  reported:true,eventReceipts:['track','report'],actor:{...b.approach,vx:0,vy:0,grounded:true,facing:1}});
 return{save:{createdAt:owner,prologue:null,profile:{rankId:'blooded'},homeworld:{greetedNpcIds:[]}},ownerSaveCreatedAt:owner,
  region,sceneActive:true,focused:true,suspended:false,host:{id:b.npcId,present:true,alive:true,conscious:true},table:{id:b.tableId,...b.table}};
}
const context=()=>api.bibleCulturalContextV86(runtime());
function advance(ledger,type,ctx=context()){
 const result=api.applyBibleSceneActionV86(ledger,{type},ctx);assert.equal(result.ok,true,result.message);return result.ledger;
}

test('scene, choices and all eight source lines are exact rows from the complete authorized V6 corpus',()=>{
 const corpusBytes=fs.readFileSync('public/game/dialogues/v85/bible-dialogues.json'),corpus=JSON.parse(corpusBytes);
 const extracted=api.BIBLE_CULTURAL_SOURCE_V86;
 assert.equal(extracted.sourceCorpusSha256,createHash('sha256').update(corpusBytes).digest('hex'));
 assert.deepEqual(extracted.source,corpus.source);assert.equal(extracted.sceneId,'D6-W-CULT-25');
 for(const sheet of extracted.sheets){
  const expected=corpus.sheets.find(s=>s.name===sheet.name).rows.filter(row=>row.number>5&&row.cells.some(cell=>String(cell.value)===extracted.sceneId||String(cell.value).startsWith(extracted.sceneId+'-')));
  assert.deepEqual(sheet.rows,expected,sheet.name);
 }
 assert.deepEqual(extracted.sheets.map(s=>[s.name,s.rows.length]),[['Scènes de dialogue V6',1],['Répliques V6',8],['Choix et actions V6',2]]);
 assert.equal(api.BIBLE_CULTURAL_LINES_V86.find(line=>line.phase==='REPONSE'&&line.option==='B').speaker,b.npcName);
 assert.equal(api.BIBLE_CULTURAL_LIMITS_V86.recordedAudio,false);
});

test('dedicated source host and approach use the real native table, walkable feet and a connected village path',()=>{
 const definition=regionApi.HOMEWORLD_REGIONS_V68[b.regionId];assert.equal(definition.clan,b.clanName);
 assert.deepEqual(definition.props.find(p=>p.id===b.tableId),{id:b.tableId,...b.table});
 assert(!definition.residents.some(n=>n.id===b.npcId));
 for(const tick of[0,90,720,3600])for(const point of[b.host,b.approach])assert(regionApi.isHomeworldRegionWalkableV68(b.regionId,'village',point,tick));
 const origin={x:520,y:2800},queue=[origin],seen=new Set(['520,2800']);let reached=false;
 for(let i=0;i<queue.length&&i<30000&&!reached;i++){
  const p=queue[i];if(Math.hypot(p.x-b.approach.x,p.y-b.approach.y)<20){reached=true;break;}
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const target={x:p.x+dx*16,y:p.y+dy*16},key=target.x+','+target.y;
   if(seen.has(key)||target.x<400||target.x>2200||target.y<2050||target.y>3000)continue;
   if(![8,16].every(step=>regionApi.isHomeworldRegionWalkableV68(b.regionId,'village',{x:p.x+dx*step,y:p.y+dy*step},0)))continue;
   seen.add(key);queue.push(target);
  }
 }
 assert(reached,'table approach must remain connected to the actual village arrival');
 const html=qa.render('app/game/HomeworldBibleCultureHostV86.tsx',{regionId:b.regionId,tick:3600});
 assert(html.includes('data-bible-host-v86="'+b.npcId+'"'));assert(html.includes('data-bible-host-y="2110"'));
 assert.equal(qa.render('app/game/HomeworldBibleCultureHostV86.tsx',{regionId:'glass-desert',tick:0}), '');
});

test('gates use real owner, adult progression, report, table, host, focus and grounded stopped proximity',()=>{
 const valid=runtime(),frozen=JSON.stringify(valid);assert(api.bibleCulturalContextV86(valid).eligible);assert.equal(JSON.stringify(valid),frozen);
 const cases=[
  r=>{r.ownerSaveCreatedAt='2026-10-06T12:00:00.000Z';},r=>{r.sceneActive=false;},r=>{r.focused=false;},r=>{r.suspended=true;},
  r=>{r.host=null;},r=>{r.host.alive=false;},r=>{r.host.conscious=false;},r=>{r.host.present=false;},r=>{r.host.id='guide';},
  r=>{r.table=null;},r=>{r.table.x+=1;},r=>{r.table.artId='bench';},r=>{r.region.eventReceipts=['track'];},
  r=>{r.region.observedTicks=89;},r=>{r.region.reported=false;},r=>{r.region.actor.x=520;r.region.actor.y=2800;},
  r=>{r.region.actor.vx=2;},r=>{r.region.actor.grounded=false;},
  r=>{r.save.prologue={status:'in-progress',chronicle:{}};},
 ];
 for(const change of cases){const input=runtime();change(input);const ctx=api.bibleCulturalContextV86(input);assert.equal(ctx.eligible,false);assert(ctx.denial);assert.equal(api.applyBibleSceneActionV86(undefined,{type:'open'},ctx).changed,false);}
});

test('playable B progresses only in order, persists exact lines and narrated gestures, and grants no material success',()=>{
 let ledger=advance(undefined,'open');assert.equal(ledger.receipts[0].presentedLineIds.length,0,'unsupported served-drink opening stays silent');
 const jumped=api.applyBibleSceneActionV86(ledger,{type:'tidy'},context());assert.equal(jumped.ok,false);assert.deepEqual(jumped.ledger,ledger);
 const a=api.applyBibleSceneActionV86(ledger,{type:'choose-a'},context());assert.equal(a.changed,false);
 for(const action of['choose-b','reply','sit','listen','tidy'])ledger=advance(ledger,action);
 const receipt=ledger.receipts[0];assert.equal(receipt.status,'resolved');assert.equal(receipt.step,5);assert.equal(receipt.materialSuccess,false);
 assert.deepEqual(receipt.narratedActionIds,['sit','listen','tidy']);
 assert.deepEqual(receipt.presentedLineIds,['D6-W-CULT-25-CHOIX-B-01','D6-W-CULT-25-REPONSE-B-01']);
 assert(api.normalizeBibleSceneLedgerV86(JSON.parse(JSON.stringify(ledger))));
 for(const type of['open','tidy','resume']){const result=api.applyBibleSceneActionV86(ledger,{type},context());assert.equal(result.changed,false);assert.deepEqual(result.ledger,ledger);}
 const html=qa.render('app/game/BibleSceneCulturalV86.tsx',{ledger,context:context(),onAction:()=>{throw Error('SSR must not dispatch');},onClose:()=>{},reducedMotion:true});
 assert(html.includes('Alors garde cette place.'));assert(html.includes('Halte narrative consignée'));
 assert(!html.includes('Le C’ntlip est servi.'));assert(!html.includes('Le service est rangé et ta place'));assert(!html.includes('corde a cédé'));
});

test('interrupt/resume retains the same return receipt and ordered phase, without replaying choices or duplicating source lines',()=>{
 let ledger=advance(advance(advance(undefined,'open'),'choose-b'),'reply');ledger=advance(ledger,'interrupt');
 assert.equal(ledger.receipts[0].status,'interrupted');assert.equal(ledger.receipts[0].step,2);
 assert.equal(api.applyBibleSceneActionV86(ledger,{type:'sit'},context()).ok,false);
 ledger=advance(ledger,'resume');assert.equal(ledger.receipts[0].step,2);
 ledger=advance(ledger,'interrupt');ledger=advance(ledger,'resume');
 assert.equal(ledger.receipts.length,1);assert.equal(ledger.receipts[0].interruptedCount,2);
 assert.deepEqual(ledger.receipts[0].presentedLineIds,['D6-W-CULT-25-CHOIX-B-01','D6-W-CULT-25-REPONSE-B-01','D6-W-CULT-25-REPRISE---01']);
 ledger=advance(advance(advance(ledger,'sit'),'listen'),'tidy');assert.equal(ledger.receipts[0].materialSuccess,false);
});

test('storage failure, exception, stale-owner callback and reentrant command preserve confirmed receipts',()=>{
 let stored=advance(undefined,'open'),commits=0;
 const initial=structuredClone(stored);
 const refuse=api.createBibleSceneTransactionV86(()=>stored,context,()=>{commits++;return false;});
 const failed=refuse({type:'choose-b'});assert.equal(failed.ok,false);assert.deepEqual(failed.ledger,initial);assert.deepEqual(stored,initial);assert.equal(commits,1);
 const throwing=api.createBibleSceneTransactionV86(()=>stored,context,()=>{throw Error('quota');});assert.equal(throwing({type:'choose-b'}).changed,false);
 let calls=0;
 const stale=api.createBibleSceneTransactionV86(()=>stored,()=>{const ctx=context();if(++calls===2)ctx.ownerMatches=false;return ctx;},()=>{throw Error('must not commit stale owner');});
 assert.equal(stale({type:'choose-b'}).changed,false);
 let nested;const durable=api.createBibleSceneTransactionV86(()=>stored,context,next=>{nested=durable({type:'choose-b'});stored=next;return true;});
 assert(durable({type:'choose-b'}).ok);assert.equal(nested.changed,false);assert.equal(stored.receipts[0].step,1);
 const other=runtime();other.save.createdAt='2026-10-08T12:00:00.000Z';
 assert.equal(api.applyBibleSceneActionV86(stored,{type:'interrupt'},api.bibleCulturalContextV86(other)).changed,false);
});

test('strict receipt parser rejects future schemas, forged material lines, wrong IDs, invalid order and out-of-floor snapshots',()=>{
 const valid=advance(advance(undefined,'open'),'choose-b');
 for(const corrupt of[
  s=>{s.version=2;},s=>{s.ownerSaveCreatedAt='invalid';},s=>{s.receipts[0].materialSuccess=true;},
  s=>{s.receipts[0].presentedLineIds.push('D6-W-CULT-25-SUCCES---01');},s=>{s.receipts[0].npcId='clan-healer';},
  s=>{s.receipts[0].siteId='clan-common';},s=>{s.receipts[0].step=5;},s=>{s.receipts[0].option='A';},
  s=>{s.receipts.push(structuredClone(s.receipts[0]));},s=>{s.receipts[0].sourceSha256='f'.repeat(64);},
  s=>{s.receipts[0].returnProof.observedTicks=89;},s=>{s.receipts[0].lastSafePosition={x:-10,y:-10};},
  s=>{s.receipts[0].xp=100;},s=>{s.receipts[0].returnProof.runId='another';},
 ]){const broken=structuredClone(valid);corrupt(broken);assert.equal(api.normalizeBibleSceneLedgerV86(broken),null);assert.equal(api.applyBibleSceneActionV86(broken,{type:'reply'},context()).changed,false);}
 const limit=structuredClone(valid);limit.revision=1_000_000;const result=api.applyBibleSceneActionV86(limit,{type:'reply'},context());assert.equal(result.changed,false);assert.deepEqual(result.ledger,limit);
});
