import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV108';export * from './app/game/systems/campaignSlots';export * from './app/game/systems/completeArchive';export {defaultSave,parseSaveImport,SAVE_STORAGE_KEY} from './app/game/save';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function storage(save){const values=new Map([[api.SAVE_STORAGE_KEY,JSON.stringify(save)]]);let refused=false;return{get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,raw)=>{if(refused)throw new DOMException('QA refusal','QuotaExceededError');values.set(key,raw);},removeItem:key=>values.delete(key),refuse:value=>refused=value,bytes:()=>JSON.stringify([...values])};}
async function locked(run){const before=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,_options,callback)=>callback({})}}});try{await run();}finally{if(before)Object.defineProperty(globalThis,'navigator',before);else delete globalThis.navigator;}}
const saveWith=gameReserveV66=>({...api.defaultSave('2026-10-24T08:00:00.000Z'),gameReserveV66});

test('all four exact reserve identities roundtrip through campaign import; future five and mixed worlds are refused',()=>{
 for(const factory of['createGameReserveV66','createGameReserveV104','createGameReserveV107','createGameReserveV108']){const state=api[factory](108);assert.deepEqual(api.parseSaveImport(JSON.stringify(saveWith(state))).save?.gameReserveV66,state);}
 const state=api.createGameReserveV108(108);for(const wrong of[{...state,version:3},{...state,reserveId:'vharuun-transect-expedition'},{...state,routeV107:state.routeV108},{...state,routeV108:null},{...state,humans:api.createGameReserveV107(107).humans}]){const r=api.parseSaveImport(JSON.stringify(saveWith(wrong)));assert.equal(r.save,null);assert.equal(r.failure,'invalid-save');}
 for(const version of[5,99]){const r=api.parseSaveImport(JSON.stringify(saveWith({...state,version})));assert.equal(r.save,null);assert.equal(r.failure,'future-version');}
});

test('V4 sixteen adults, ship events and four route records survive real slots and complete archives',async()=>locked(async()=>{
 const state=api.createGameReserveV108(108),disk=storage(saveWith(state));assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok,true);let slot=api.loadCampaignSlots(disk).slots[0];
 const stored=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,expectedRevision:slot.revision,location:'game-reserve'},disk);assert.equal(stored.ok,true,stored.message);slot=api.loadCampaignSlots(disk).slots[0];const loaded=await api.activateCampaignCheckpoint(1,stored.checkpoint.id,{expectedRevision:slot.revision},disk);assert.equal(loaded.ok,true,loaded.message);assert.equal(loaded.checkpoint.resumeLocation,'game-reserve');assert.deepEqual(loaded.save.gameReserveV66,state);
 const archive=api.parseCompleteArchive(api.createCompleteArchive(loaded.save,disk).serialized);assert.deepEqual(archive.archive?.campaign.gameReserveV66,state);assert.equal(archive.archive.campaign.gameReserveV66.reserveId,'kesh-watch-expedition');
}));

test('a declared four-site persistence fixture physically returns, and an intercepted launch remains an event rather than a free reward',async()=>locked(async()=>{
 // Only persistence setup. The geometry test earns records with real walking/jumps/channels.
 let state=api.createGameReserveV108(108);state.tick=1000;state.visited=[0,1,2,3,4,5,6,7];state.routeV108.siteRecords=api.GAME_RESERVE_EXPEDITION_V108_SITES.map((site,index)=>({recordedAt:120+index*130,hunterX:site.x,hunterY:site.y}));state.ships[0].interception={tick:900,launchTick:800,hunterX:2700};state.ships[0].sabotages=1;assert(api.normalizeGameReserveV66(state));state=api.stepGameReserveV66(state);for(let i=0;i<60;i++)state=api.stepGameReserveV66(state,{interact:true});assert.equal(state.status,'returned');const save=saveWith(state),before=save.profile.honor;const parsed=api.parseSaveImport(JSON.stringify(save));assert.deepEqual(parsed.save?.gameReserveV66,state);assert.equal(parsed.save.profile.honor,before);const disk=storage(parsed.save);assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok,true);const archive=api.parseCompleteArchive(api.createCompleteArchive(parsed.save,disk).serialized);assert.deepEqual(archive.archive?.campaign.gameReserveV66.routeV108,state.routeV108);assert.deepEqual(archive.archive?.campaign.gameReserveV66.ships[0].interception,state.ships[0].interception);
}));

test('refused V4 checkpoint writes preserve durable bytes and retry the original expedition',async()=>locked(async()=>{
 const disk=storage(saveWith(api.createGameReserveV108(108)));assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok,true);const slot=api.loadCampaignSlots(disk).slots[0],before=disk.bytes();disk.refuse(true);const refused=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,expectedRevision:slot.revision,location:'game-reserve'},disk);assert.equal(refused.ok,false);assert.equal(disk.bytes(),before);disk.refuse(false);const retry=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,expectedRevision:slot.revision,location:'game-reserve'},disk);assert.equal(retry.ok,true,retry.message);assert.equal(retry.checkpoint.resumeLocation,'game-reserve');
}));
