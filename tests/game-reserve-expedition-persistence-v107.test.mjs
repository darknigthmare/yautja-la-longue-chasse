import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const built=await build({stdin:{contents:`export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV107';export * from './app/game/systems/campaignSlots';export * from './app/game/systems/completeArchive';export {defaultSave,parseSaveImport,SAVE_STORAGE_KEY} from './app/game/save';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function storage(save){const values=new Map([[api.SAVE_STORAGE_KEY,JSON.stringify(save)]]);let refused=false;return{get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,raw)=>{if(refused)throw new DOMException('QA storage refusal','QuotaExceededError');values.set(key,raw);},removeItem:key=>values.delete(key),refuse:value=>refused=value,bytes:()=>JSON.stringify([...values])};}
async function locked(run){const before=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,_options,callback)=>callback({})}}});try{await run();}finally{if(before)Object.defineProperty(globalThis,'navigator',before);else delete globalThis.navigator;}}
const saveWith=checkpoint=>({...api.defaultSave('2026-10-23T08:00:00.000Z'),gameReserveV66:checkpoint});

test('V3 active checkpoints retain all sixteen people, four aircraft and route records through real imports, slots and integral archives',async()=>locked(async()=>{
 const checkpoint=api.createGameReserveV107(107),save=saveWith(checkpoint);assert.deepEqual(api.parseSaveImport(JSON.stringify(save)).save?.gameReserveV66,checkpoint);
 const disk=storage(save);assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok,true);let slot=api.loadCampaignSlots(disk).slots[0];
 const stored=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,expectedRevision:slot.revision,location:'game-reserve'},disk);assert.equal(stored.ok,true,stored.message);
 slot=api.loadCampaignSlots(disk).slots[0];const loaded=await api.activateCampaignCheckpoint(1,stored.checkpoint.id,{expectedRevision:slot.revision},disk);assert.equal(loaded.ok,true,loaded.message);assert.equal(loaded.checkpoint.resumeLocation,'game-reserve');assert.deepEqual(loaded.save.gameReserveV66,checkpoint);
 const archive=api.parseCompleteArchive(api.createCompleteArchive(loaded.save,disk).serialized);assert.deepEqual(archive.archive?.campaign.gameReserveV66,checkpoint);assert.equal(api.gameReserveV66World(archive.archive.campaign.gameReserveV66).width,12800);
}));

test('a declared surveyed V3 fixture physically returns and preserves only its actual site records',async()=>locked(async()=>{
 // Persistence fixture; the companion terrain test obtains every record by
 // native movement and channels. No combat victory is inferred here.
 let checkpoint=api.createGameReserveV107(107);checkpoint.tick=1000;checkpoint.visited=[0,1,2,3,4,5,6,7];checkpoint.routeV107.siteRecords=api.GAME_RESERVE_EXPEDITION_V107_SITES.map((site,index)=>({recordedAt:120+index*130,hunterX:site.x,hunterY:site.y}));assert(api.normalizeGameReserveV66(checkpoint));
 checkpoint=api.stepGameReserveV66(checkpoint);for(let i=0;i<60;i++)checkpoint=api.stepGameReserveV66(checkpoint,{interact:true});assert.equal(checkpoint.status,'returned');
 const parsed=api.parseSaveImport(JSON.stringify(saveWith(checkpoint)));assert.deepEqual(parsed.save?.gameReserveV66,checkpoint);const disk=storage(parsed.save);assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok,true);const archive=api.parseCompleteArchive(api.createCompleteArchive(parsed.save,disk).serialized);assert.deepEqual(archive.archive?.campaign.gameReserveV66.routeV107,checkpoint.routeV107);assert.equal(archive.archive.campaign.gameReserveV66.status,'returned');
}));

test('V3 manual-checkpoint storage refusal leaves the previously durable campaign intact and retryable',async()=>locked(async()=>{
 const disk=storage(saveWith(api.createGameReserveV107(107)));assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok,true);const slot=api.loadCampaignSlots(disk).slots[0],before=disk.bytes();disk.refuse(true);
 const refused=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,expectedRevision:slot.revision,location:'game-reserve'},disk);assert.equal(refused.ok,false);assert.equal(disk.bytes(),before);disk.refuse(false);
 const retried=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,expectedRevision:slot.revision,location:'game-reserve'},disk);assert.equal(retried.ok,true,retried.message);assert.equal(retried.checkpoint.resumeLocation,'game-reserve');
}));

test('V1 and V2 remain supported; mixed identities are invalid and only version four remains future',()=>{
 const source=api.defaultSave('2026-10-23T08:01:00.000Z');for(const checkpoint of[api.createGameReserveV66(107),api.createGameReserveV104(107),api.createGameReserveV107(107)])assert.deepEqual(api.parseSaveImport(JSON.stringify({...source,gameReserveV66:checkpoint})).save?.gameReserveV66,checkpoint);
 const v3=api.createGameReserveV107(107);for(const checkpoint of[{...v3,version:2},{...v3,reserveId:'vharuun-first-expedition'},{...v3,routeV107:null},{...v3,humans:v3.humans.slice(0,8)}]){const result=api.parseSaveImport(JSON.stringify({...source,gameReserveV66:checkpoint}));assert.equal(result.save,null);assert.equal(result.failure,'invalid-save');}
 const future=api.parseSaveImport(JSON.stringify({...source,gameReserveV66:{...v3,version:4}}));assert.equal(future.save,null);assert.equal(future.failure,'future-version');
});
