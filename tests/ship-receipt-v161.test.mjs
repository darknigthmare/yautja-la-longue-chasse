import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {playShipAcquisitionV161} from './helpers/ship-receipt-v161.mjs';

const qa=homeworldSceneSsrV78();
const routes=qa.load('app/game/systems/spaceRoutesV159.ts');
const receipt=qa.load('app/game/systems/shipReceiptV161.ts');
const ship=qa.load('app/game/systems/shipAcquisitionV89.ts');
const saves=qa.load('app/game/save.ts');
const catalogue=qa.load('app/game/shipCatalogue.ts');
const owner='2026-11-20T12:00:00.000Z', key=saves.SAVE_STORAGE_KEY;
const ENGAGE={kind:'engage',routeId:'route-oseris-nivalis'};

function store(){
 const data=new Map();
 return {data,get length(){return data.size;},key(i){return [...data.keys()][i]??null;},
  getItem(n){return data.get(n)??null;},setItem(n,v){data.set(n,v);},removeItem(n){data.delete(n);}};
}
function rankBlooded(rankId='blooded'){const s=saves.defaultSave(owner);s.profile.honor=250;s.profile.rankId=rankId;return s;}
const ctx=save=>({ownerCreatedAt:owner,ship:routes.spacePersonalShipV159(save)});
const run=(state,action,save)=>routes.actSpaceRoutesV159(state,action,ctx(save));
function ok(state,action,save){const r=run(state,action,save);assert(r.accepted,r.message);return r;}
function travel(state,save){
 let s=ok(state,ENGAGE,save).state;
 for(let guard=0;guard<10&&s.trip;guard++){
  const p=routes.pendingSpaceIncidentV159(s);
  s=ok(s,p?{kind:'choose',option:0}:{kind:'advance'},save).state;
 }
 assert.equal(s.trip,null);return s;
}

test('pas de voyage sans reçu : rang absent, Blooded seul, travaux en cours, droits remis sans entrée',()=>{
 const young=saves.defaultSave(owner);
 const cases=[
  [young,'not-blooded',/Blooded/],
  [rankBlooded(),'not-started',/Une coque vraiment acquise/],
  [playShipAcquisitionV161(qa,rankBlooded(),'report'),'in-progress',/Une coque vraiment acquise/],
  [playShipAcquisitionV161(qa,rankBlooded(),'rights'),'rights-issued',/franchis le sas/],
 ];
 for(const [save,status,reason] of cases){
  const r=receipt.shipReceiptV161(save);
  assert.equal(r.status,status);assert.equal(r.receipt,null);assert.match(r.reason,reason);
  const shipView=routes.spacePersonalShipV159(save);
  assert.equal(shipView.owned,false);assert.equal(shipView.shipId,null);
  const denied=run(null,ENGAGE,save);
  assert.equal(denied.accepted,false);assert.equal(denied.changed,false);assert.equal(denied.state,null);
  assert.match(denied.message,reason);
 }
 // un checkpoint de chantier illisible est conservé et ne produit pas de reçu
 const bad={...rankBlooded(),shipAcquisitionV89:{version:9}};
 assert.equal(receipt.shipReceiptV161(bad).status,'unreadable');
 assert.equal(run(null,ENGAGE,bad).accepted,false);
});

test('coque débloquée seule refusée : la flotte ne remplace plus le reçu (STATE5-17)',()=>{
 for(const rank of ['blooded','elite']){
  const save=rankBlooded(rank);
  // l’ancienne règle V159 acceptait rang + coque sélectionnée ; le second argument est désormais ignoré
  const fleet={selectedShipId:catalogue.DEFAULT_SHIP_ID,unlockedShipIds:[catalogue.DEFAULT_SHIP_ID]};
  const view=routes.spacePersonalShipV159(save,fleet);
  assert.equal(view.owned,false);assert.equal(view.source,null);
  assert.equal(run(null,ENGAGE,save).accepted,false);
 }
 const src=fs.readFileSync('app/game/systems/spaceRoutesV159.ts','utf8');
 assert.doesNotMatch(src,/flotte-existante|unlockedShipIds/);
});

test('attestation V161 : absente avant Blooded, le chantier refuse toujours la remise sans elle',()=>{
 assert.equal(receipt.shipAcquisitionAuthorityV161(saves.defaultSave(owner)),null);
 const auth=receipt.shipAcquisitionAuthorityV161(rankBlooded());
 assert.deepEqual(ship.normalizeShipAcquisitionAuthorityV89(auth,owner),auth);
 assert.equal(auth.instanceId,`coque-personnelle-v161:${owner}`);
 assert.equal(auth.sourceId,'R2-M021');assert.equal(auth.meansConsumed,true);
 // sans attestation, les travaux restent conservés et aucune remise n’a lieu (comportement V89 inchangé)
 const halfway=playShipAcquisitionV161(qa,rankBlooded(),'report');
 const context={save:halfway,active:true,focused:true,suspended:false,...ship.shipAcquisitionSceneFactsV89(),authority:null};
 const refused=ship.actShipAcquisitionV89(halfway.shipAcquisitionV89,{kind:'request-rights'},context);
 assert.equal(refused.accepted,false);assert.match(refused.message,/Moyens et accord non attestés/);
 // le jeu branche bien l’attestation V161 dans le contexte réel du chantier
 const client=fs.readFileSync('app/game/GameClient.tsx','utf8');
 assert.match(client,/authority: shipAcquisitionAuthorityV161\(current\)/);
 assert.doesNotMatch(client,/\.\.\.scene, authority: null/);
});

test('obtention → reçu unique → voyage',()=>{
 const save=playShipAcquisitionV161(qa,rankBlooded());
 const r=receipt.shipReceiptV161(save);
 assert.equal(r.status,'owned');
 assert.deepEqual(r.receipt,{ownerSaveCreatedAt:owner,shipId:'classic-predator-spaceship',
  instanceId:`coque-personnelle-v161:${owner}`,kind:'acquisition-receipt',sourceId:'R2-M021',candidateId:'shipyard-v89:hull-01'});
 // une seule remise : une nouvelle demande ne consomme rien et ne change pas le reçu
 const context={save,active:true,focused:true,suspended:false,...ship.shipAcquisitionSceneFactsV89(),
  authority:receipt.shipAcquisitionAuthorityV161(save)};
 const again=ship.actShipAcquisitionV89(save.shipAcquisitionV89,{kind:'request-rights'},context);
 assert.equal(again.changed,false);assert.deepEqual(again.state,save.shipAcquisitionV89);
 // le reçu est lié à la campagne : il ne se lit pas dans une autre sauvegarde
 const other={...saves.defaultSave('2026-01-01T00:00:00.000Z'),shipAcquisitionV89:save.shipAcquisitionV89};
 other.profile.rankId='blooded';
 assert.equal(receipt.shipReceiptV161(other).receipt,null);
 const view=routes.spacePersonalShipV159(save);
 assert.deepEqual(view,{owned:true,shipId:'classic-predator-spaceship',source:'recu-chantier-v89',reason:null,docked:false});
 const engaged=ok(null,ENGAGE,save).state;
 assert.equal(engaged.trip.manifest.shipId,'classic-predator-spaceship');
 assert.equal(routes.spaceLegacyTripV159(engaged,view),false);
 const arrived=travel(null,save);
 assert.equal(arrived.currentSystemId,'system-nivalis');
 // amarré au Clan Ship : refusé malgré le reçu
 const docked={...save,clanShipDocking:{status:'aboard'}};
 assert.match(run(null,ENGAGE,docked).message,/amarré/);
 assert.equal(run(engaged,{kind:'advance'},docked).accepted,false);
});

test('sauvegarde aller-retour : reçu conservé par écriture, relecture, export et import',()=>{
 const save=playShipAcquisitionV161(qa,rankBlooded());
 const storage=store();
 assert(saves.writeSaveWithStatus(save,storage,key).persisted);
 const loaded=saves.loadSaveWithStatus(storage,key);assert(loaded.loaded,loaded.failure);
 assert.deepEqual(loaded.save.shipAcquisitionV89,save.shipAcquisitionV89);
 const imported=saves.parseSaveImport(saves.exportSave(loaded.save));assert(imported.save,imported.failure);
 assert.deepEqual(receipt.shipReceiptV161(imported.save),receipt.shipReceiptV161(save));
 const s=travel(null,imported.save);
 const withRoutes={...imported.save,spaceRoutesV159:s};
 assert(saves.writeSaveWithStatus(withRoutes,storage,key).persisted);
 const reread=saves.loadSaveWithStatus(storage,key);assert(reread.loaded,reread.failure);
 assert.equal(routes.spacePersonalShipV159(reread.save).owned,true);
 assert.equal(reread.save.spaceRoutesV159.currentSystemId,'system-nivalis');
 // un reçu falsifié (entrée sans remise) est refusé à la lecture, sans perte des octets enregistrés
 const forged=structuredClone(withRoutes);forged.shipAcquisitionV89.authorityReceipt=null;
 assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure,'invalid-save');
});

test('ancienne sauvegarde : position gardée, voyage antérieur achevé, nouveau départ après obtention',()=>{
 // (a) voyage engagé sous l’ancienne règle V159 (Blooded + coque débloquée), sans reçu
 const owned=playShipAcquisitionV161(qa,rankBlooded());
 const legacyTrip=ok(null,ENGAGE,owned).state; // même forme d’état que l’ancienne règle produisait
 const old=rankBlooded();
 const storage=store();
 assert(saves.writeSaveWithStatus({...old,spaceRoutesV159:legacyTrip},storage,key).persisted);
 const loaded=saves.loadSaveWithStatus(storage,key);assert(loaded.loaded,loaded.failure);
 const oldSave=loaded.save;
 assert.deepEqual(oldSave.spaceRoutesV159,legacyTrip);
 const view=routes.spacePersonalShipV159(oldSave);
 assert.equal(view.owned,false);assert.equal(routes.spaceLegacyTripV159(oldSave.spaceRoutesV159,view),true);
 const panel=qa.render('app/game/SpaceRoutesPanelV159.tsx',{ownerCreatedAt:owner,state:oldSave.spaceRoutesV159,ship:view,
  onAction:()=>({accepted:false,changed:false,state:null,message:''})});
 assert.match(panel,/data-legacy-trip/);assert.match(panel,/Une coque vraiment acquise/);
 let s=oldSave.spaceRoutesV159,last=null;
 for(let guard=0;guard<10&&s.trip;guard++){
  const p=routes.pendingSpaceIncidentV159(s);
  last=ok(s,p?{kind:'choose',option:0}:{kind:'advance'},oldSave);s=last.state;
 }
 assert.equal(last.arrivedAt,'system-nivalis');assert.match(last.message,/avant l’exigence du reçu/);
 assert.deepEqual(s.location,{kind:'system',systemId:'system-nivalis'});
 // (b) aucun nouveau départ sans reçu ; la position n’est pas réinitialisée
 const refused=run(s,{kind:'engage',routeId:'route-nivalis-cinder'},oldSave);
 assert.equal(refused.accepted,false);assert.deepEqual(refused.state,s);
 assert.match(refused.message,/Une coque vraiment acquise/);
 // (c) un chantier commencé avant V161 (aucune attestation alors) reprend et conclut
 const halfway=playShipAcquisitionV161(qa,oldSave,'report',null);
 assert.equal(halfway.shipAcquisitionV89.dialogueAuthority,null);assert.equal(halfway.shipAcquisitionV89.latch.verified,true);
 const b=ship.SHIP_ACQUISITION_BINDING_V89;
 const context={save:halfway,active:true,focused:true,suspended:false,...ship.shipAcquisitionSceneFactsV89(),
  authority:receipt.shipAcquisitionAuthorityV161(halfway)};
 let acq=halfway.shipAcquisitionV89;
 const step=action=>{const r=ship.actShipAcquisitionV89(acq,action,context);assert(r.accepted,r.message);acq=r.state;};
 step({kind:'request-rights'});
 while(acq.actor.x<b.entryX)step({kind:'walk',direction:1});
 const migrated={...halfway,shipAcquisitionV89:acq,spaceRoutesV159:s};
 assert.equal(receipt.shipReceiptV161(migrated).status,'owned');
 const next=ok(s,{kind:'engage',routeId:'route-nivalis-cinder'},migrated);
 assert.equal(next.state.trip.fromSystemId,'system-nivalis');
 assert.equal(next.state.arrivals.length,1);
 // (d) amarré : même un voyage antérieur ne progresse pas
 const dockedOld={...oldSave,clanShipDocking:{status:'aboard'}};
 assert.equal(run(legacyTrip,{kind:'advance'},dockedOld).accepted,false);
 // (e) sauvegarde sans aucun état de route ni de chantier : chargée intacte
 const bare=saves.parseSaveImport(saves.exportSave(saves.defaultSave(owner)));
 assert(bare.save,bare.failure);
 assert.equal(Object.hasOwn(bare.save,'spaceRoutesV159'),false);assert.equal(Object.hasOwn(bare.save,'shipAcquisitionV89'),false);
});
