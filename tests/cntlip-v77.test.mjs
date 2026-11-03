import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/game/save';export * from './app/game/systems/cntlipV77';export * from './app/game/systems/cntlipLedgerV77';export * from './app/game/systems/homeworldCntlipPhysicalV77';export * from './app/game/systems/homeworldInteriorsV64';export * from './app/game/systems/homeworldFurnitureV72';export * from './app/game/systems/homeworldInteriorDecorV76';export * from './app/game/systems/homeworld';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const owner='2026-10-03T10:00:00.000Z',body={halfWidth:28,halfDepth:18};
const fresh=()=>api.defaultSave(owner);
function scene(save,host=api.HOMEWORLD_CNTLIP_HOSTS_V77[0],seated=true){return api.homeworldCntlipContextV77({save,room:api.homeworldInteriorForBuildingV64(host.buildingId),actor:{...host.approach,vx:0,vy:0,grounded:true},sceneActive:true,seatedSiteId:seated?host.siteId:null,servingStock:api.cntlipSiteStockV77(save.homeworld.cntlipV77,host.siteId)});}
function storage(){const data=new Map();return {data,full:false,getItem:k=>data.get(k)??null,setItem(k,v){if(this.full)throw new DOMException('disk full','QuotaExceededError');data.set(k,v);},removeItem:k=>data.delete(k)};}
function invite(save,host=api.HOMEWORLD_CNTLIP_HOSTS_V77[0]){const result=api.applyCntlipLedgerV77(save.homeworld.cntlipV77,{type:'accept-hospitality'},scene(save,host));assert(result.ok);return {...save,homeworld:{...save.homeworld,cntlipV77:result.ledger}};}
function flood(room){const key=p=>p.x+','+p.y,queue=[room.spawn],seen=new Set([key(room.spawn)]);for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[8,0],[-8,0],[0,8],[0,-8]]){const p={x:queue[i].x+dx,y:queue[i].y+dy};if(!seen.has(key(p))&&api.isHomeworldInteriorWalkableV64(room,p,body)){seen.add(key(p));queue.push(p);}}return queue;}
for(const host of api.HOMEWORLD_CNTLIP_HOSTS_V77)test(host.siteId+': real table, host, body clearance and reachable services',()=>{
 const room=api.homeworldInteriorForBuildingV64(host.buildingId),points=flood(room),table=room.furniture.find(t=>t.id===host.tableId);
 assert(table);assert.equal(table.artId,'meal-table');assert(api.isHomeworldInteriorWalkableV64(room,host.approach,body));assert(points.some(p=>Math.hypot(p.x-host.approach.x,p.y-host.approach.y)<9));
 assert(points.some(p=>api.homeworldCntlipReachedV77(room,p)?.id===host.id));assert(!api.isHomeworldInteriorWalkableV64(room,host));
 for(const point of room.points)assert(points.some(p=>api.nearestHomeworldInteriorTargetV64(room,p)?.pointId===point.pointId),'service '+point.pointId);
 assert(points.some(p=>api.nearestHomeworldInteriorTargetV64(room,p)?.kind==='exit'));
 const box=api.homeworldFurnitureFootprintV72(table);assert(box.left>=10&&box.right<=room.width-10&&box.top>=10&&box.bottom<=room.depth-10);
 assert(Math.hypot(host.x-table.x,host.y-table.y)<140);assert(scene(fresh(),host).participants.some(p=>p.id===host.id));
});
test('legacy save import migrates empty culture and preserves profile/history; future/corrupt data refuses import',()=>{
 const save=fresh();delete save.homeworld.cntlipV77;
 const legacy=api.parseSaveImport(JSON.stringify(save));assert(legacy.save);assert.deepEqual(legacy.save.homeworld.cntlipV77,api.defaultCntlipLedgerV77());assert.deepEqual(legacy.save.profile,save.profile);
 const future={...legacy.save,homeworld:{...legacy.save.homeworld,cntlipV77:{...api.defaultCntlipLedgerV77(),version:2}}};assert.equal(api.parseSaveImport(JSON.stringify(future)).failure,'future-version');
 const corrupt={...legacy.save,homeworld:{...legacy.save.homeworld,cntlipV77:{...api.defaultCntlipLedgerV77(),stock:{'clan-common':4,'market-halt':0,'pit-rest':0,'council-gathering':0}}}};assert.equal(api.parseSaveImport(JSON.stringify(corrupt)).failure,'invalid-save');
});
test('finite hospitality does not refill and each reservation deduces one; memory grants no game progression',()=>{
 let save=invite(fresh()),ledger=save.homeworld.cntlipV77;const untouched=JSON.stringify({profile:save.profile,journal:save.missionProgress,contracts:save.homeworld.contractsV68,relations:save.homeworld.relations});
 const again=api.applyCntlipLedgerV77(ledger,{type:'accept-hospitality'},scene(save));assert.equal(again.changed,false);
 const start=api.applyCntlipLedgerV77(ledger,{type:'start-serving',memoryId:'healer-empty-place'},scene(save));assert(start.ok);assert.equal(start.ledger.stock['clan-common'],3);assert.equal(start.ledger.state.memories.length,0);
 save={...save,homeworld:{...save.homeworld,cntlipV77:start.ledger}};
 for(let n=0;n<3;n++){const step=api.applyCntlipLedgerV77(save.homeworld.cntlipV77,{type:'advance-serving',elapsedMs:1000},scene(save));assert(step.ok);save={...save,homeworld:{...save.homeworld,cntlipV77:step.ledger}};}
 assert.equal(save.homeworld.cntlipV77.state.memories.length,1);assert.equal(api.cntlipAffinitiesV77(save.homeworld.cntlipV77.state)['clan-table-healer'],1);
 assert.equal(JSON.stringify({profile:save.profile,journal:save.missionProgress,contracts:save.homeworld.contractsV68,relations:save.homeworld.relations}),untouched);
 assert(api.parseSaveImport(JSON.stringify(save)).save);
});
test('synchronous double click and reentrant commit cannot reserve or invite twice',()=>{
 let save=invite(fresh()),commits=0,nested;const tx=api.createCntlipTransactionV77(()=>save.homeworld.cntlipV77,next=>{commits++;nested=tx({type:'start-serving'},scene(save));save={...save,homeworld:{...save.homeworld,cntlipV77:next}};return true;});
 assert(tx({type:'start-serving'},scene(save)).ok);assert.equal(nested.ok,false);assert.equal(commits,1);
 assert.equal(tx({type:'start-serving'},scene(save)).ok,false);assert.equal(commits,1);assert.equal(save.homeworld.cntlipV77.state.totalServings,1);assert.equal(save.homeworld.cntlipV77.stock['clan-common'],3);
});
test('real save quota failure rolls back claim/start and retry reserves only once',()=>{
 const store=storage(),key='cntlip-v77';let save=api.writeSaveWithStatus(invite(fresh()),store,key).save;
 const before=JSON.stringify(save.homeworld.cntlipV77),tx=api.createCntlipTransactionV77(()=>save.homeworld.cntlipV77,next=>{const write=api.writeSaveWithStatus({...save,homeworld:{...save.homeworld,cntlipV77:next}},store,key);if(!write.persisted)return false;save=write.save;return true;});
 store.full=true;assert.equal(tx({type:'start-serving'},scene(save)).ok,false);assert.equal(JSON.stringify(save.homeworld.cntlipV77),before);assert.equal(api.loadSaveWithStatus(store,key).save.homeworld.cntlipV77.state.totalServings,0);
 store.full=false;assert(tx({type:'start-serving'},scene(save)).ok);assert.equal(save.homeworld.cntlipV77.state.totalServings,1);assert.equal(save.homeworld.cntlipV77.stock['clan-common'],3);
});
test('checkpoint/reload preserves reserved portion; cancellation never refunds; hidden scene advances no time',()=>{
 let save=invite(fresh());const start=api.applyCntlipLedgerV77(save.homeworld.cntlipV77,{type:'start-serving'},scene(save));save={...save,homeworld:{...save.homeworld,cntlipV77:start.ledger}};
 const reloaded=api.parseSaveImport(JSON.stringify(save)).save;assert(reloaded);assert.deepEqual(reloaded.homeworld.cntlipV77,start.ledger);
 const hidden=api.applyCntlipLedgerV77(start.ledger,{type:'advance-serving',elapsedMs:1000},{...scene(reloaded),sceneActive:false});assert(!hidden.changed);assert.equal(hidden.ledger.state.pending.elapsedMs,0);
 const stopped=api.applyCntlipLedgerV77(start.ledger,{type:'cancel-serving'},scene(reloaded));assert(stopped.ok);assert.equal(stopped.ledger.stock['clan-common'],3);assert.equal(stopped.ledger.state.activeDoses,0);assert.equal(stopped.ledger.state.memories.length,0);
});
test('two-hour rest is local narrative time, not fees, gameplay duration or quest/rank; effect neutral in combat',()=>{
 let save=invite(fresh());let ledger=save.homeworld.cntlipV77;
 for(let dose=0;dose<3;dose++){ledger=api.applyCntlipLedgerV77(ledger,{type:'start-serving'},scene({...save,homeworld:{...save.homeworld,cntlipV77:ledger}})).ledger;for(let tick=0;tick<3;tick++)ledger=api.applyCntlipLedgerV77(ledger,{type:'advance-serving',elapsedMs:1000},scene(save)).ledger;}
 assert.equal(ledger.state.activeDoses,3);const before=JSON.stringify({...save,homeworld:{...save.homeworld,cntlipV77:undefined}}),rest=api.applyCntlipLedgerV77(ledger,{type:'rest'},scene(save));assert(rest.ok);assert.equal(rest.ledger.state.worldElapsedMs,7_200_000);assert.equal(rest.result.wakeSiteId,'clan-common');assert.equal(rest.ledger.stock['clan-common'],1);
 assert.equal(JSON.stringify({...save,homeworld:{...save.homeworld,cntlipV77:undefined}}),before);
 assert.deepEqual(api.cntlipEffectsV77(ledger.state,{safe:false,inCombat:true,reducedMotion:false,bioMaskWorn:true}),{peripheralOpacity:0,breathGain:1,bioMaskNoise:0,movementMultiplier:1});
});
test('remote or missing hosts, another room and Youngling cannot claim/start a cup',()=>{
 const save=invite(fresh()),ctx=scene(save);for(const blocked of [{...ctx,participants:[]},{...ctx,participants:ctx.participants.map(p=>({...p,distanceToSite:1000}))},{...ctx,buildingId:'market-armory'},{...ctx,rank:'youngling'}]){assert.equal(api.applyCntlipLedgerV77(save.homeworld.cntlipV77,{type:'start-serving'},blocked).ok,false);}
 assert.equal(api.homeworldCntlipReachedV77(api.homeworldInteriorForBuildingV64('market-armory'),{x:269,y:168}),null);
 assert.equal(api.homeworldCntlipEligibleV77({...save,prologue:{status:'active',chronicle:{version:1}}}),false);
});
test('stage assets preload preserved native civilian role sheets and runtime mounts actual table widget',async()=>{
 assert(api.HOMEWORLD_CNTLIP_HOST_ASSETS_V77.length>=2);for(const art of api.HOMEWORLD_CNTLIP_HOST_ASSETS_V77)assert((await fs.stat('public'+art.src)).size>0);
 const hub=await fs.readFile('app/game/HomeworldHub.tsx','utf8');assert(hub.includes('useHomeworldCntlipV77'));assert(hub.includes('<HomeworldCntlipV77'));assert(hub.includes('HOMEWORLD_CNTLIP_HOST_ASSETS_V77'));
});
