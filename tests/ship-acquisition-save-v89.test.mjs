import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const qa=homeworldSceneSsrV78(), saves=qa.load('app/game/save.ts');
const ship=qa.load('app/game/systems/shipAcquisitionV89.ts');
const archives=qa.load('app/game/systems/completeArchive.ts');
const cloud=qa.load('app/game/systems/cloudArchiveV71.ts');
const owner='2026-10-08T18:00:00.000Z', key=saves.SAVE_STORAGE_KEY;
function store(entries=[]){
 const data=new Map(entries);
 return {data,full:false,failReadback:false,pendingReadback:false,writes:0,
  get length(){return data.size;},key(i){return [...data.keys()][i]??null;},
  getItem(name){if(name===key&&this.pendingReadback){this.pendingReadback=false;throw Error('Uncertain readback');}return data.get(name)??null;},
  setItem(name,raw){if(this.full)throw Error('Quota');this.writes++;data.set(name,raw);if(name===key&&this.failReadback){this.failReadback=false;this.pendingReadback=true;}},
  removeItem(name){data.delete(name);}};
}
function fixture(){
 const base=saves.defaultSave(owner);base.profile.honor=250;base.profile.rankId='blooded';
 const context={save:base,active:true,focused:true,suspended:false,...ship.shipAcquisitionSceneFactsV89(),authority:null};
 let state=null;
 const act=action=>{const result=ship.actShipAcquisitionV89(state,action,context);assert(result.accepted,result.message);state=result.state;};
 const walk=(x)=>{while((state?.actor.x??ship.SHIP_ACQUISITION_BINDING_V89.spawnX)!==x)act({kind:'walk',direction:x>(state?.actor.x??144)?1:-1});};
 act({kind:'intent',option:'A'});walk(480);act({kind:'inspect-hull'});walk(792);act({kind:'inspect-load'});
 walk(1080);act({kind:'test-sas'});act({kind:'align-latch',direction:1});act({kind:'align-latch',direction:1});
 act({kind:'seat-latch'});act({kind:'lock-latch'});act({kind:'test-sas'});walk(144);act({kind:'report'});
 assert.equal(state.latch.verified,true);assert.equal(state.authorityReceipt,null);
 return {base,save:{...base,shipAcquisitionV89:state},checkpoint:state,context};
}
const gameplay=save=>({profile:save.profile,inventory:save.inventory,loadout:save.loadout,
 missionProgress:save.missionProgress,trophies:save.trophies,homeworld:save.homeworld,justice:save.justice});
test('old saves keep shipyard absent and explicit null compatible',()=>{
 const old=saves.defaultSave(owner);
 for(const raw of [JSON.stringify(old),saves.exportSave(old)]){
  const result=saves.parseSaveImport(raw);assert(result.save,result.failure);assert.equal(Object.hasOwn(result.save,'shipAcquisitionV89'),false);
 }
 assert.equal(saves.parseSaveImport(JSON.stringify({...old,shipAcquisitionV89:null})).save.shipAcquisitionV89,null);
});
test('physically earned inspection and report survive durable save/export without free ship or rewards',()=>{
 const {base,save,checkpoint}=fixture(),storage=store();assert(saves.writeSaveWithStatus(save,storage,key).persisted);
 const bytes=[...storage.data],writes=storage.writes,loaded=saves.loadSaveWithStatus(storage,key);assert(loaded.loaded,loaded.failure);
 assert.deepEqual(loaded.save.shipAcquisitionV89,checkpoint);assert.equal(storage.writes,writes);assert.deepEqual([...storage.data],bytes);
 const imported=saves.parseSaveImport(saves.exportSave(loaded.save));assert(imported.save,imported.failure);
 assert.deepEqual(imported.save.shipAcquisitionV89,checkpoint);assert.deepEqual(gameplay(imported.save),gameplay(saves.normalizeSave(base)));
 assert.equal(ship.shipAcquisitionOwnedHullV89(imported.save.shipAcquisitionV89,owner),null);
});
test('future, foreign, malformed and invented rights cannot replace existing bytes',()=>{
 const {save}=fixture(),storage=store();assert(saves.writeSaveWithStatus(save,storage,key).persisted);const bytes=[...storage.data];
 for(const [change,failure] of [
  [s=>{s.shipAcquisitionV89.version=2;},'future-version'],
  [s=>{s.shipAcquisitionV89.ownerSaveCreatedAt='2026-10-09T00:00:00.000Z';},'invalid-save'],
  [s=>{s.shipAcquisitionV89.sourceSha256='a'.repeat(64);},'invalid-save'],
  [s=>{s.shipAcquisitionV89.actor.x+=1;},'invalid-save'],
  [s=>{s.shipAcquisitionV89.authorityReceipt={meansConsumed:true};},'invalid-save'],
 ]){
  const bad=structuredClone(save);change(bad);
  assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure,failure);
  assert.equal(saves.importSaveWithStatus(JSON.stringify(bad),storage,key).failure,failure);
  assert.equal(saves.writeSaveWithStatus(bad,storage,key).persisted,false);assert.deepEqual([...storage.data],bytes);
 }
});
test('future primary remains protected even beside a valid older shipyard backup',()=>{
 const {save}=fixture(),future=structuredClone(save);future.shipAcquisitionV89.version=2;
 const storage=store([[key,JSON.stringify(future)],[key+'.backup',JSON.stringify(save)]]),bytes=[...storage.data];
 assert.equal(saves.loadSaveWithStatus(storage,key).failure,'future-version');
 assert.equal(saves.writeSaveWithStatus(save,storage,key).failure,'protected-save');assert.deepEqual([...storage.data],bytes);
});
test('quota and uncertain readback do not acknowledge or replay physical work',()=>{
 const {base,save,checkpoint,context}=fixture(),storage=store();assert(saves.writeSaveWithStatus(base,storage,key).persisted);
 const before=[...storage.data];storage.full=true;
 assert.equal(saves.writeSaveWithStatus(save,storage,key).persisted,false);assert.deepEqual([...storage.data],before);
 storage.full=false;storage.failReadback=true;const pending=saves.writeSaveWithStatus(save,storage,key);assert.equal(pending.persisted,false);
 const bytes=[...storage.data],writes=storage.writes;
 const recovered=saves.reconcileSaveWrite(pending,owner,storage,key);assert.equal(recovered.status,'confirmed',recovered.failure);
 assert.deepEqual([...storage.data],bytes);assert.equal(storage.writes,writes);
 const repeated=ship.actShipAcquisitionV89(recovered.save.shipAcquisitionV89,{kind:'report'},{...context,save:recovered.save});
 assert(repeated.accepted);assert.equal(repeated.changed,false);assert.deepEqual(repeated.state,checkpoint);
});
test('complete/account archives preserve shipyard and refuse nested incompatible versions',()=>{
 const {save,checkpoint}=fixture(),storage=store();assert(saves.writeSaveWithStatus(save,storage,key).persisted);
 const active=saves.loadSaveWithStatus(storage,key).save,bytes=[...storage.data];
 const complete=archives.createCompleteArchive(active,storage,owner),parsed=archives.parseCompleteArchive(complete.serialized);assert(parsed.archive,parsed.failure);
 assert.deepEqual(parsed.archive.campaign.shipAcquisitionV89,checkpoint);
 const snapshot=cloud.captureCloudArchiveV71(storage,owner),parsedCloud=cloud.parseCloudArchiveV71(JSON.stringify(snapshot));assert(parsedCloud.archive,parsedCloud.error);
 assert.deepEqual(JSON.parse(parsedCloud.archive.entries.find(e=>e.key===key).raw).shipAcquisitionV89,checkpoint);
 const future=JSON.parse(complete.serialized);future.campaign.shipAcquisitionV89.version=2;
 assert.equal(archives.parseCompleteArchive(JSON.stringify(future)).failure,'future-version');
 const badSnapshot=structuredClone(snapshot),entry=badSnapshot.entries.find(e=>e.key===key),bad=JSON.parse(entry.raw);bad.shipAcquisitionV89.version=2;entry.raw=JSON.stringify(bad);
 assert.equal(cloud.parseCloudArchiveV71(JSON.stringify(badSnapshot)).archive,null);assert.deepEqual([...storage.data],bytes);
});
test('replacing campaign cannot borrow the previous owner shipyard work',()=>{
 const {save}=fixture(),storage=store();assert(saves.writeSaveWithStatus(save,storage,key).persisted);
 const replacement=saves.defaultSave('2026-10-09T00:00:00.000Z');assert.equal(saves.writeSaveWithStatus(replacement,storage,key).failure,'save-conflict');
 assert(saves.replaceSaveWithStatus(replacement,storage,key).persisted);
 assert.equal(Object.hasOwn(saves.loadSaveWithStatus(storage,key).save,'shipAcquisitionV89'),false);
 assert.equal(saves.parseSaveImport(JSON.stringify({...replacement,shipAcquisitionV89:save.shipAcquisitionV89})).failure,'invalid-save');
});
