import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),saveApi=qa.load('app/game/save.ts');
const sceneApi=qa.load('app/game/systems/bibleSceneCulturalV86.ts');
const worldApi=qa.load('app/game/systems/homeworld.ts');
const regionApi=qa.load('app/game/systems/homeworldRegionsV68.ts');
const nurseryApi=qa.load('app/game/systems/nurseryCampaign.ts');
const b=sceneApi.BIBLE_CULTURAL_BINDING_V86,owner='2026-10-07T12:00:00.000Z',key='bible-v86-main-save';
function fresh(){const save=saveApi.defaultSave(owner);save.profile.clanMarks=474;save.profile.honor=812;save.profile.hunterName='Retour des Crêtes';return save;}
function region(){
 const state=regionApi.createHomeworldRegionV68(b.regionId,'v86-save-return',true);
 Object.assign(state,{tick:3600,walked:8000,greeted:['guide'],traces:['trail-1','trail-2','trail-3'],observedTicks:90,
  reported:true,eventReceipts:['track','report'],actor:{...b.approach,vx:0,vy:0,grounded:true,facing:1}});
 return state;
}
function context(save=fresh(),options={}){
 return sceneApi.bibleCulturalContextV86({save,ownerSaveCreatedAt:owner,region:region(),sceneActive:true,focused:true,suspended:false,
  host:{id:b.npcId,present:true,alive:true,conscious:true},table:{id:b.tableId,...b.table},...options});
}
function ledger(actions=['open']){
 let value;for(const type of actions){const result=sceneApi.applyBibleSceneActionV86(value,{type},context());assert(result.ok,result.message);value=result.ledger;}return value;
}
function withLedger(actions){const save=fresh();save.homeworld.bibleScenesV86=ledger(actions);return save;}
function store(initial=[]){
 const values=new Map(initial);return{values,full:false,failReadback:false,readbackPending:false,
  getItem(name){if(this.readbackPending&&name===key){this.readbackPending=false;throw Error('readback unavailable');}return values.get(name)??null;},
  setItem(name,value){if(this.full)throw new DOMException('Quota','QuotaExceededError');values.set(name,value);if(this.failReadback&&name===key){this.failReadback=false;this.readbackPending=true;}},
  removeItem:name=>values.delete(name)};
}
function unchangedGameplay(save){
 return{profile:save.profile,inventory:save.inventory,loadout:save.loadout,appearance:save.appearance,missionProgress:save.missionProgress,
  trophies:save.trophies,contracts:save.homeworld.contractsV68,relations:save.homeworld.relations,cntlip:save.homeworld.cntlipV77,justice:save.justice};
}

test('legacy defaults/import/export leave the optional scene ledger absent and preserve history and 474 marks',()=>{
 const original=fresh(),normalized=saveApi.normalizeSave(original);
 assert.equal(Object.hasOwn(original.homeworld,'bibleScenesV86'),false);
 assert.equal(Object.hasOwn(worldApi.defaultHomeworldProgress(),'bibleScenesV86'),false);
 for(const parsed of[saveApi.parseSaveImport(JSON.stringify(original)),saveApi.parseSaveImport(saveApi.exportSave(original))]){
  assert(parsed.save);assert.equal(Object.hasOwn(parsed.save.homeworld,'bibleScenesV86'),false);
  assert.deepEqual(unchangedGameplay(parsed.save),unchangedGameplay(normalized));assert.equal(parsed.save.profile.clanMarks,474);
 }
});

test('active, interrupted and resolved receipts survive main-save normalization, export, import, durable write and reload',()=>{
 for(const actions of[['open','choose-b'],['open','choose-b','reply','interrupt'],['open','choose-b','reply','sit','listen','tidy']]){
  const original=withLedger(actions),expected=structuredClone(original.homeworld.bibleScenesV86);
  // Historical scene receipts remain in the main save after the region is left.
  assert.equal(original.homeworldRegionV68??null,null);
  const parsed=saveApi.parseSaveImport(saveApi.exportSave(original));assert(parsed.save,parsed.failure);
  assert.deepEqual(parsed.save.homeworld.bibleScenesV86,expected);
  assert.deepEqual(worldApi.normalizeHomeworldProgress(original.homeworld).bibleScenesV86,expected);
  const storage=store(),written=saveApi.writeSaveWithStatus(parsed.save,storage,key);assert(written.persisted,written.failure);
  const before=[...storage.values],loaded=saveApi.loadSaveWithStatus(storage,key);assert(loaded.loaded);
  assert.deepEqual(loaded.save.homeworld.bibleScenesV86,expected);assert.deepEqual([...storage.values],before,'hydration must not write');
  assert.deepEqual(unchangedGameplay(loaded.save),unchangedGameplay(saveApi.normalizeSave(original)));
 }
});

test('ordinary Homeworld progress updates keep existing scene choices and do not grant or replay campaign marks',()=>{
 const save=withLedger(['open','choose-b','reply','interrupt']),expected=structuredClone(save.homeworld.bibleScenesV86);
 const updated=worldApi.applyHomeworldAction(save.homeworld,{type:'visit',districtId:'market'},{rankId:save.profile.rankId,ownedTrophyCount:save.trophies.length});
 assert(updated.ok);assert(updated.changed);assert.deepEqual(updated.progress.bibleScenesV86,expected);
 const parsed=saveApi.parseSaveImport(JSON.stringify({...save,homeworld:updated.progress}));assert(parsed.save,parsed.failure);
 assert.deepEqual(parsed.save.homeworld.bibleScenesV86,expected);assert.equal(parsed.save.profile.clanMarks,474);
 assert.deepEqual(parsed.save.homeworld.contractsV68,save.homeworld.contractsV68);
});

test('present malformed/future/foreign-owner scene ledgers refuse import and cannot replace valid stored receipts',()=>{
 const good=withLedger(['open','choose-b']),storage=store();assert(saveApi.writeSaveWithStatus(good,storage,key).persisted);
 const before=[...storage.values];
 for(const[change,failure]of[
  [s=>{s.homeworld.bibleScenesV86=null;},'invalid-save'],
  [s=>{s.homeworld.bibleScenesV86.version=2;},'future-version'],
  [s=>{s.homeworld.bibleScenesV86.ownerSaveCreatedAt='2026-10-06T12:00:00.000Z';},'invalid-save'],
  [s=>{s.homeworld.bibleScenesV86.receipts[0].materialSuccess=true;},'invalid-save'],
  [s=>{s.homeworld.bibleScenesV86.receipts[0].presentedLineIds.push('D6-W-CULT-25-SUCCES---01');},'invalid-save'],
  [s=>{s.homeworld.bibleScenesV86.receipts[0].step=5;},'invalid-save'],
 ]){
  const bad=structuredClone(good);change(bad);const raw=JSON.stringify(bad);
  assert.equal(saveApi.parseSaveImport(raw).failure,failure);assert.equal(saveApi.importSaveWithStatus(raw,storage,key).failure,failure);
  assert.equal(saveApi.writeSaveWithStatus(bad,storage,key).persisted,false);assert.deepEqual([...storage.values],before);
 }
 const foreignEmpty=fresh();foreignEmpty.homeworld.bibleScenesV86=sceneApi.defaultBibleSceneLedgerV86('2026-10-06T12:00:00.000Z');
 assert.equal(saveApi.parseSaveImport(JSON.stringify(foreignEmpty)).failure,'invalid-save');
});

test('a future nested primary keeps its original bytes and does not fall back to an older scene backup',()=>{
 const previous=withLedger(['open']),future=structuredClone(previous);future.homeworld.bibleScenesV86.version=2;
 const raw=JSON.stringify(future),storage=store([[key,raw],[key+'.backup',JSON.stringify(previous)]]),before=[...storage.values];
 const loaded=saveApi.loadSaveWithStatus(storage,key);assert.equal(loaded.failure,'future-version');assert.equal(loaded.loaded,false);
 assert.equal(saveApi.writeSaveWithStatus(previous,storage,key).failure,'protected-save');assert.deepEqual([...storage.values],before);
});

test('a child campaign cannot import an adult scene receipt or acquire progression by loading it',()=>{
 const child=saveApi.normalizeSave({...fresh(),prologue:nurseryApi.createNurseryCampaign()});
 assert(saveApi.parseSaveImport(JSON.stringify(child)).save,'control: the child fixture is a valid campaign');
 const before=JSON.stringify(child),injected={...child,homeworld:{...child.homeworld,bibleScenesV86:ledger(['open','choose-b'])}};
 assert.equal(saveApi.parseSaveImport(JSON.stringify(injected)).failure,'invalid-save');assert.equal(JSON.stringify(child),before);
});

test('actual save quota refusal preserves phase and bytes; retry advances once without changing inventory, culture or marks',()=>{
 const storage=store();let active=saveApi.writeSaveWithStatus(fresh(),storage,key).save;
 const gameplay=unchangedGameplay(active);
 const tx=sceneApi.createBibleSceneTransactionV86(()=>active.homeworld.bibleScenesV86,()=>context(active),next=>{
  const written=saveApi.writeSaveWithStatus({...active,homeworld:{...active.homeworld,bibleScenesV86:next}},storage,key);
  if(!written.persisted)return false;active=written.save;return true;
 });
 assert(tx({type:'open'}).ok);const before=[...storage.values],receipt=structuredClone(active.homeworld.bibleScenesV86);
 storage.full=true;const refused=tx({type:'choose-b'});assert.equal(refused.ok,false);assert.deepEqual(refused.ledger,receipt);
 assert.deepEqual([...storage.values],before);assert.equal(active.homeworld.bibleScenesV86.receipts[0].step,0);
 storage.full=false;assert(tx({type:'choose-b'}).ok);const confirmed=structuredClone(active.homeworld.bibleScenesV86);
 assert.equal(tx({type:'choose-b'}).changed,false);assert.deepEqual(active.homeworld.bibleScenesV86,confirmed);
 assert.deepEqual(saveApi.loadSaveWithStatus(storage,key).save.homeworld.bibleScenesV86,confirmed);
 assert.deepEqual(unchangedGameplay(active),gameplay);
});

test('uncertain readback reconciles the same owner receipt without duplicate phase or another write',()=>{
 const storage=store();let active=saveApi.writeSaveWithStatus(withLedger(['open']),storage,key).save,pending;
 const tx=sceneApi.createBibleSceneTransactionV86(()=>active.homeworld.bibleScenesV86,()=>context(active),next=>{
  const written=saveApi.writeSaveWithStatus({...active,homeworld:{...active.homeworld,bibleScenesV86:next}},storage,key);
  if(!written.persisted){pending=written;return false;}active=written.save;return true;
 });
 storage.failReadback=true;const result=tx({type:'choose-b'});assert.equal(result.changed,false);assert.equal(active.homeworld.bibleScenesV86.receipts[0].step,0);
 assert.equal(JSON.parse(storage.values.get(key)).homeworld.bibleScenesV86.receipts[0].step,1);
 const before=[...storage.values],reconciled=saveApi.reconcileSaveWrite(pending,owner,storage,key);assert.equal(reconciled.status,'confirmed',reconciled.failure);
 active=reconciled.save;assert.deepEqual([...storage.values],before);assert.equal(active.homeworld.bibleScenesV86.receipts[0].step,1);
 assert.equal(tx({type:'choose-b'}).changed,false);assert.equal(active.homeworld.bibleScenesV86.revision,2);
 assert(tx({type:'reply'}).ok);assert.equal(active.homeworld.bibleScenesV86.receipts[0].step,2);
});

test('explicit campaign reset does not adopt or resurrect the previous owner dialogue ledger',()=>{
 const storage=store();assert(saveApi.writeSaveWithStatus(withLedger(['open','choose-b','reply','interrupt']),storage,key).persisted);
 const replacement=saveApi.defaultSave('2026-10-08T12:00:00.000Z');assert.equal(saveApi.writeSaveWithStatus(replacement,storage,key).failure,'save-conflict');
 assert(saveApi.replaceSaveWithStatus(replacement,storage,key).persisted);assert.equal(saveApi.loadSaveWithStatus(storage,key).save.homeworld.bibleScenesV86,undefined);
 storage.values.set(key,'{corrupt');const recovered=saveApi.loadSaveWithStatus(storage,key);assert.equal(recovered.source,'backup');
 assert.equal(recovered.save.createdAt,replacement.createdAt);assert.equal(recovered.save.homeworld.bibleScenesV86,undefined);
});

test('the real component close handler keeps its dialog open if saving interruption fails and closes only after confirmation',()=>{
 const source=fs.readFileSync('app/game/BibleSceneCulturalV86.tsx','utf8');
 const tree=ts.createSourceFile('BibleSceneCulturalV86.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),functions=new Map();
 function visit(node){if(ts.isFunctionDeclaration(node)&&['submit','leave'].includes(node.name?.text))functions.set(node.name.text,node.getText(tree));ts.forEachChild(node,visit);}visit(tree);
 assert.equal(functions.size,2);
 const code=ts.transpileModule([...functions.values()].join('\n')+'\nmodule.exports={leave};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const storage=store();let active=saveApi.writeSaveWithStatus(withLedger(['open','choose-b']),storage,key).save,closed=0,feedback;
 const tx=sceneApi.createBibleSceneTransactionV86(()=>active.homeworld.bibleScenesV86,()=>context(active),next=>{
  const written=saveApi.writeSaveWithStatus({...active,homeworld:{...active.homeworld,bibleScenesV86:next}},storage,key);
  if(!written.persisted)return false;active=written.save;return true;
 });
 const env={module:{exports:{}},receipt:active.homeworld.bibleScenesV86.receipts[0],context:context(active),onAction:tx,onClose:()=>{closed++;},setFeedback:value=>{feedback=value;}};
 runInNewContext(code,env);storage.full=true;env.module.exports.leave();assert.equal(closed,0);assert(feedback.text.includes('Sauvegarde non confirmée'));
 assert.equal(active.homeworld.bibleScenesV86.receipts[0].status,'active');
 storage.full=false;env.module.exports.leave();assert.equal(closed,1);assert.equal(active.homeworld.bibleScenesV86.receipts[0].status,'interrupted');
});
