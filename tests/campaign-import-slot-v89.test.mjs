import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const bundle=await build({stdin:{contents:`export * from './app/game/systems/campaignSlots'; export * from './app/game/systems/archiveTransferGuard';
export {defaultSave,parseSaveImport,exportSave,SAVE_STORAGE_KEY,SAVE_VERSION} from './app/game/save';
export {createDefaultShipProgression,SHIP_PROGRESSION_STORAGE_KEY} from './app/game/systems/progression';
export {createPitSave,pitSaveStorageKey,PIT_SAVE_STORAGE_KEY} from './app/game/systems/pitSave';
export {pitReplayStorageKey,PIT_REPLAY_STORAGE_KEY} from './app/game/systems/pitReplayStorage';
export {ACTIVE_HUNT_STORAGE_KEY} from './app/game/systems/activeHuntSave';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const sourceOwner='2026-09-01T12:00:00.000Z',workingOwner='2026-09-02T12:00:00.000Z';
let held=false;
const lockManager={async request(_name,_options,callback){if(held)return callback(null);held=true;try{return await callback({name:'archive-lock'});}finally{held=false;}}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:lockManager}});
function store(entries=[]){const values=new Map(entries),writes=[];return{values,writes,getItem:key=>values.get(key)??null,setItem(key,value){writes.push(key);values.set(key,value);},removeItem(key){writes.push(key);values.delete(key);}};}
function source(){const save=api.defaultSave(sourceOwner);save.profile.hunterName='Kaail importé';save.profile.playTimeSeconds=812;save.inventory.weaponUpgrades.combistick=1;return save;}
const text=()=>api.exportSave(source());
const document=(s,id)=>JSON.parse(s.getItem(api.campaignSlotStorageKey(id)));
const prepared=(s,id=1,raw=text())=>{const result=api.prepareCampaignSlotImport(id,raw,s);assert(result.ok,result.message);assert(result.preview);return result.preview;};
const unchanged=(before,s)=>assert.deepEqual([...s.values],before);
async function working(){const save=api.defaultSave(workingOwner),ship=api.createDefaultShipProgression(save,save.updatedAt),pit=api.createPitSave(workingOwner,save.updatedAt);
 const s=store([[api.SAVE_STORAGE_KEY,JSON.stringify(save)],[api.SAVE_STORAGE_KEY+'.backup',JSON.stringify(save)],[api.SHIP_PROGRESSION_STORAGE_KEY,JSON.stringify(ship)],[api.pitSaveStorageKey(workingOwner),JSON.stringify(pit)]]);
 const migrated=await api.migrateLegacyCampaignSlot(s);assert(migrated.ok,migrated.message);s.writes.length=0;return s;}

test('light export and legacy JSON commit one full slot only, preserve source identity/progress and never activate',async()=>{
 for(const raw of [text(),JSON.stringify(source()),'\uFEFF'+JSON.stringify(source())]){
  const s=await working(),before=[...s.values],preview=prepared(s,2,raw);assert.equal(s.writes.length,0);
  assert.equal(preview.ownerCreatedAt,sourceOwner);assert.equal(preview.playTimeSeconds,812);
  const result=await api.importCampaignSlot(preview,s);assert(result.ok,result.message);assert.equal(result.save,null);
  assert.equal(result.catalog.activeSlotId,1);assert.equal(result.checkpoint.id,'auto-1');assert.equal(result.checkpoint.resumeLocation,'deck');
  assert.deepEqual(s.writes,[api.campaignSlotStorageKey(2)]);
  for(const [key,value]of before)assert.equal(s.getItem(key),value,key);
  const saved=document(s,2).checkpoints[0].archive;
  assert.deepEqual(saved.campaign,api.parseSaveImport(raw).save);
  assert.equal(saved.campaign.prologue,api.parseSaveImport(raw).save.prologue);
  assert.equal(saved.campaign.createdAt,sourceOwner);assert.equal(document(s,2).revision,1);
  assert.equal(s.getItem(api.ARCHIVE_TRANSFER_JOURNAL_KEY),null);
 }
});
test('activation is a separate existing checkpoint operation, not an import side effect',async()=>{
 const s=store(),preview=prepared(s);assert((await api.importCampaignSlot(preview,s)).ok);assert.equal(s.getItem(api.SAVE_STORAGE_KEY),null);
 const result=await api.activateCampaignCheckpoint(1,'auto-1',{expectedRevision:1},s);assert(result.ok,result.message);
 assert.equal(JSON.parse(s.getItem(api.SAVE_STORAGE_KEY)).createdAt,sourceOwner);assert.equal(result.catalog.activeSlotId,1);
});
test('matching orphan annexes are captured read-only, including existing ship training and PIT progress',async()=>{
 const save=source(),ship=api.createDefaultShipProgression(save,save.updatedAt),pit=api.createPitSave(sourceOwner,save.updatedAt);
 const discipline=Object.keys(ship.training)[0];ship.training[discipline].attempts=3;
 const s=store([[api.SHIP_PROGRESSION_STORAGE_KEY,JSON.stringify(ship)],[api.pitSaveStorageKey(sourceOwner),JSON.stringify(pit)]]),before=[...s.values];
 const result=await api.importCampaignSlot(prepared(s),s);assert(result.ok,result.message);
 const archive=document(s,1).checkpoints[0].archive;assert.deepEqual(archive.attachments.shipProgression,ship);assert.deepEqual(archive.attachments.pit,pit);
 for(const [key,value]of before)assert.equal(s.getItem(key),value,key);
});
test('unowned legacy ship progress stays local and cannot be claimed by an older foreign campaign',async()=>{
 for(const version of [1,2]){
  const s=await working(),ship=api.createDefaultShipProgression(api.defaultSave(workingOwner),workingOwner),discipline=Object.keys(ship.training)[0];
  ship.version=version;delete ship.ownerSaveCreatedAt;ship.training[discipline].attempts=9;
  const raw=JSON.stringify(ship);s.values.set(api.SHIP_PROGRESSION_STORAGE_KEY,raw);const preview=prepared(s,2);
  assert(preview.warnings.some(warning=>warning.includes('propriétaire explicite')));
  assert((await api.importCampaignSlot(preview,s)).ok);
  assert.equal(document(s,2).checkpoints[0].archive.attachments.shipProgression.training[discipline].attempts,0);
  assert.equal(s.getItem(api.SHIP_PROGRESSION_STORAGE_KEY),raw);assert.deepEqual(s.writes,[api.campaignSlotStorageKey(2)]);
 }
});
test('empty means no primary AND no backup; occupied, corrupt and future slots are never replaced',async()=>{
 for(const mode of ['occupied','backup','corrupt','future']){
  const s=store();if(mode==='occupied')assert((await api.createCampaignSlot(1,'Autre',s)).ok);
  else if(mode==='backup'){const first=store();assert((await api.createCampaignSlot(1,'Autre',first)).ok);s.values.set(api.campaignSlotStorageKey(1)+'.backup',first.getItem(api.campaignSlotStorageKey(1)));}
  else s.values.set(api.campaignSlotStorageKey(1),mode==='corrupt'?'broken':JSON.stringify({version:999}));
  const before=[...s.values];assert.equal(api.prepareCampaignSlotImport(1,text(),s).failure,'slot-occupied');unchanged(before,s);
 }
});
test('owner cloning is refused in every slot primary/backup and working primary/backup',async()=>{
 const original=store();assert((await api.importCampaignSlot(prepared(original),original)).ok);const rawSlot=original.getItem(api.campaignSlotStorageKey(1));
 for(const key of [api.campaignSlotStorageKey(1),api.campaignSlotStorageKey(1)+'.backup',api.SAVE_STORAGE_KEY,api.SAVE_STORAGE_KEY+'.backup']){
  const s=store([[key,key.startsWith(api.SAVE_STORAGE_KEY)?JSON.stringify(source()):rawSlot]]),before=[...s.values];
  const result=api.prepareCampaignSlotImport(2,text(),s);assert.equal(result.failure,'owner-conflict',key+' '+result.message);unchanged(before,s);
 }
 const s=await working();s.values.set(api.SAVE_STORAGE_KEY+'.backup',JSON.stringify(source()));assert.equal(api.prepareCampaignSlotImport(2,text(),s).failure,'owner-conflict');
 s.values.set(api.SAVE_STORAGE_KEY+'.backup',s.getItem(api.SAVE_STORAGE_KEY));s.values.set(api.campaignSlotStorageKey(1)+'.backup',rawSlot);
 assert.equal(api.prepareCampaignSlotImport(2,text(),s).failure,'owner-conflict');
});
test('future or corrupt hidden backups, working saves and pending journal fail closed with zero writes',async()=>{
 for(const mode of ['slot-backup-corrupt','slot-backup-future','working-backup-corrupt','working-backup-future','journal']){
  const s=await working();
  const key=mode.startsWith('slot')?api.campaignSlotStorageKey(1)+'.backup':mode==='journal'?api.ARCHIVE_TRANSFER_JOURNAL_KEY:api.SAVE_STORAGE_KEY+'.backup';
  s.values.set(key,mode.endsWith('future')?JSON.stringify({version:999}):'broken');
  const before=[...s.values],result=api.prepareCampaignSlotImport(2,text(),s);assert(!result.ok,result.message);assert.equal(s.writes.length,0);unchanged(before,s);
 }
});
test('future export/save, missing owner, malformed JSON and excessive UTF8 bytes never create owners',()=>{
 const noOwner=source();delete noOwner.createdAt;
 const badOwner=source();badOwner.createdAt='invalid';
 const future=source();future.version=999;
 const cases=[[JSON.stringify(future),'future-version'],[JSON.stringify({format:'yautja-long-hunt.save-export',exportVersion:2,save:source()}),'future-version'],
  [JSON.stringify(noOwner),'owner-conflict'],[JSON.stringify(badOwner),'owner-conflict'],['()=>evil()','invalid-archive'],['é'.repeat(api.CAMPAIGN_SLOT_IMPORT_MAX_BYTES),'too-large']];
 for(const [raw,failure]of cases){const s=store(),result=api.prepareCampaignSlotImport(1,raw,s);assert.equal(result.failure,failure,result.message);assert.equal(s.writes.length,0);}
});
test('a changed target, workspace, source annex or sibling slot invalidates the pinned preview before any write',async()=>{
 for(const key of [api.campaignSlotStorageKey(1),api.campaignSlotStorageKey(2),api.SAVE_STORAGE_KEY,api.SHIP_PROGRESSION_STORAGE_KEY,api.pitSaveStorageKey(sourceOwner)]){
  const s=store(),preview=prepared(s);s.values.set(key,'newer session');const before=[...s.values];
  const result=await api.importCampaignSlot(preview,s);assert.equal(result.failure,'save-conflict');assert.equal(s.writes.length,0);unchanged(before,s);
 }
 const s=store(),preview=prepared(s),copy={...preview};assert.equal((await api.importCampaignSlot(copy,s)).failure,'save-conflict');
 assert.equal((await api.importCampaignSlot(preview,store())).failure,'save-conflict');
 for(const key of [api.pitSaveStorageKey(workingOwner),api.pitReplayStorageKey(workingOwner)]){
  const s=await working(),preview=prepared(s,2);s.values.set(key,'changed active session');const before=[...s.values];
  assert.equal((await api.importCampaignSlot(preview,s)).failure,'save-conflict');assert.equal(s.writes.length,0);unchanged(before,s);
 }
});
test('matching future or malformed sidecars are protected and preview reads cannot hide a new transfer journal',()=>{
 for(const key of [api.SHIP_PROGRESSION_STORAGE_KEY,api.pitSaveStorageKey(sourceOwner),api.pitReplayStorageKey(sourceOwner)]){
  for(const raw of ['broken',JSON.stringify({version:999,ownerSaveCreatedAt:sourceOwner})]){
   const s=store([[key,raw]]),before=[...s.values];assert(!api.prepareCampaignSlotImport(1,text(),s).ok);assert.equal(s.writes.length,0);unchanged(before,s);
  }
 }
 const s=store(),get=s.getItem;let reads=0;
 s.getItem=key=>{if(key===api.ARCHIVE_TRANSFER_JOURNAL_KEY&&++reads===3)s.values.set(key,'started during preview');return get(key);};
 assert(!api.prepareCampaignSlotImport(1,text(),s).ok);assert.equal(s.writes.length,0);assert.equal(s.getItem(api.campaignSlotStorageKey(1)),null);
});
test('lock missing/occupied and expired session journal refuse confirmed import without an unsafe fallback',async()=>{
 const s=store(),preview=prepared(s);held=true;try{assert.equal((await api.importCampaignSlot(preview,s)).failure,'lock-unavailable');}finally{held=false;}
 const previous=navigator.locks;navigator.locks=undefined;try{assert.equal((await api.importCampaignSlot(preview,s)).failure,'lock-unavailable');}finally{navigator.locks=previous;}
 s.values.set(api.ARCHIVE_TRANSFER_JOURNAL_KEY,'pending');assert.equal((await api.importCampaignSlot(preview,s)).failure,'protected-save');assert.equal(s.writes.length,0);
});
test('quota and unconfirmed writes never report success; persisted-before-throw is verified instead of duplicated',async()=>{
 for(const kind of ['quota','persisted-throw','readback-failure']){
  const s=store(),preview=prepared(s),normalSet=s.setItem,normalRead=s.getItem;
  s.setItem=(key,value)=>{if(kind!=='quota')normalSet(key,value);if(kind==='readback-failure')s.getItem=readKey=>{if(readKey===key)throw Error('readback denied');return normalRead(readKey);};
   if(kind!=='readback-failure'){const error=new Error('quota');error.name='QuotaExceededError';throw error;}};
  const result=await api.importCampaignSlot(preview,s);
  if(kind==='persisted-throw'){assert(result.ok,result.message);assert.equal(s.writes.length,1);}
  else{assert.equal(result.failure,kind==='quota'?'quota-exceeded':'unconfirmed-write');assert(!result.ok);}
  assert.equal(normalRead(api.SAVE_STORAGE_KEY),null);
 }
});

const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
const label=node=>Array.isArray(node)?node.map(label).join(''):node&&typeof node==='object'?label(node.props?.children):node==null||typeof node==='boolean'?'':String(node);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function menu(s){
 const values=[],refs=[],effects=[],calls=[];let cursor=0,refCursor=0;
 const exports={},jsx=(type,props)=>({type,props});
 const compiled=ts.transpileModule(fs.readFileSync('app/game/CampaignMainMenu.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(compiled,{exports,require(name){if(name==='react')return{useState(initial){const index=cursor++;if(!(index in values))values[index]=initial;return[values[index],next=>{values[index]=typeof next==='function'?next(values[index]):next;}];},useRef(initial){const index=refCursor++;return refs[index]??={current:initial};},useCallback:callback=>callback,useLayoutEffect(callback,deps){if(deps?.length===0&&effects.length===0)effects.push(callback());}};
  if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name.includes('useMenuGamepad'))return{useMenuGamepad(){}};if(name.includes('campaignSlots'))return api;return{default:{}};}});
 const props={catalog:api.loadCampaignSlots(s),busy:false,message:null,onRefresh(){},onCreate(){},onContinue:id=>calls.push(['continue',id]),onLoad(){},onRecover(){},
  onPrepareImport:(id,raw)=>api.prepareCampaignSlotImport(id,raw,s),onImport:preview=>calls.push(['import',preview])};
 const render=()=>{cursor=0;refCursor=0;return exports.default(props);};
 const find=(tree,key)=>walk(tree).find(node=>node.props?.[key]);
 const click=key=>{const button=find(render(),key);assert(button);assert(!button.props.disabled);button.props.onClick({currentTarget:{isConnected:false}});};
 const button=starts=>walk(render()).find(node=>node.type==='button'&&label(node).startsWith(starts));
 const read=async(file)=>{const input=walk(render()).find(node=>node.props?.id==='campaign-import-file');assert(input&&!input.props.disabled);input.props.onChange({currentTarget:{files:[file],value:'path'}});await tick();};
 return{props,calls,render,find,click,button,read,unmount:()=>effects.forEach(cleanup=>cleanup?.())};
}
const file=raw=>({name:'campagne.json',size:Buffer.byteLength(raw),text:async()=>raw});
test('actual menu previews the selected empty slot, confirms separately, and submits the exact opaque plan without continuing',async()=>{
 const s=await working(),ui=menu(s);ui.click('data-campaign-import-open');
 assert.equal(ui.find(ui.render(),'data-campaign-slot').props.disabled,true);
 await ui.read(file(text()));assert(ui.find(ui.render(),'data-campaign-import-preview'));assert.equal(ui.calls.length,0);assert.equal(s.writes.length,0);
 ui.click('data-campaign-import-prepare');assert(ui.find(ui.render(),'data-campaign-import-confirmation'));assert.equal(ui.calls.length,0);
 ui.click('data-campaign-import-confirm');assert.equal(ui.calls.length,1);assert.equal(ui.calls[0][0],'import');assert.equal(ui.calls[0][1].slotId,2);
 const result=await api.importCampaignSlot(ui.calls[0][1],s);assert(result.ok,result.message);assert.equal(result.catalog.activeSlotId,1);assert.equal(ui.calls.some(call=>call[0]==='continue'),false);
});
test('actual menu refuses oversized files before reading and invalidates previews on slot selection or changed catalog',async()=>{
 const s=store(),ui=menu(s);ui.click('data-campaign-import-open');let read=false;
 await ui.read({name:'large.json',size:api.CAMPAIGN_SLOT_IMPORT_MAX_BYTES+1,text:async()=>{read=true;return text();}});assert(!read);assert(!ui.find(ui.render(),'data-campaign-import-preview'));
 await ui.read(file(text()));assert(ui.find(ui.render(),'data-campaign-import-preview'));
 walk(ui.render()).find(node=>node.props?.['data-campaign-slot']===2).props.onClick();assert(!ui.find(ui.render(),'data-campaign-import-preview'));
 await ui.read(file(text()));ui.click('data-campaign-import-prepare');ui.props.catalog={...ui.props.catalog,status:'blocked',failure:'future-version'};
 assert(ui.find(ui.render(),'data-campaign-import-confirm').props.disabled);ui.find(ui.render(),'data-campaign-import-confirm').props.onClick();assert.equal(ui.calls.length,0);
});
test('actual menu ignores late file resolution after cancellation or unmount, with no storage write',async()=>{
 for(const mode of ['cancel','unmount']){const s=store(),ui=menu(s);ui.click('data-campaign-import-open');let resolve;
  await ui.read({name:'pending.json',size:40,text:()=>new Promise(done=>{resolve=done;})});
  if(mode==='cancel')ui.button('Retour au menu').props.onClick();else ui.unmount();resolve(text());await tick();
  assert(!ui.find(ui.render(),'data-campaign-import-preview'));assert.equal(ui.calls.length,0);assert.equal(s.writes.length,0);
 }
});

function frontCallbacks(environment){
 const source=fs.readFileSync('app/game/CampaignFrontEnd.tsx','utf8'),ast=ts.createSourceFile('front.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const evaluate=expression=>vm.runInNewContext(ts.transpileModule(`(${expression})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,environment);
 let run;const handlers={};
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='run')run=node.initializer.arguments[0].getText(ast);
  if(ts.isJsxAttribute(node)&&['onPrepareImport','onImport'].includes(node.name.getText(ast)))handlers[node.name.getText(ast)]=node.initializer.expression.getText(ast);
  ts.forEachChild(node,visit);};visit(ast);assert(run&&handlers.onPrepareImport&&handlers.onImport);
 environment.run=evaluate(run);return{prepare:evaluate(handlers.onPrepareImport),confirm:evaluate(handlers.onImport)};
}
test('actual FrontEnd imports without activation, serializes repeated confirmations and rejects callbacks from an older menu generation',async()=>{
 const s=await working(),mounts=[],catalogs=[],modeOwners=[];let requests=0;
 const environment={operation:{current:false},generation:{current:0},menuGeneration:0,alive:{current:true},validId:id=>api.CAMPAIGN_SLOT_IDS.includes(id),
  prepareCampaignSlotImport:(id,raw)=>api.prepareCampaignSlotImport(id,raw,s),importCampaignSlot:preview=>{requests++;return api.importCampaignSlot(preview,s);},
  setBusy(){},setMessage(){},setCatalog:catalog=>catalogs.push(catalog),setEntry:entry=>mounts.push(entry),flushSync:action=>action(),
  currentModeCampaign:()=>JSON.parse(s.getItem(api.SAVE_STORAGE_KEY)),setModeCampaign:save=>modeOwners.push(save.createdAt),mainMenuBrowserShipContextV81:()=>({personalShipAvailable:false}),setModeContext(){}};
 const callbacks=frontCallbacks(environment),preview=callbacks.prepare(2,text()).preview;assert(preview);
 callbacks.confirm(preview);callbacks.confirm(preview);assert.equal(requests,1);await tick();
 assert.equal(catalogs.length,1);assert.equal(catalogs[0].activeSlotId,1);assert.deepEqual(modeOwners,[workingOwner]);assert.deepEqual(mounts,[null]);
 assert.equal(JSON.parse(s.getItem(api.SAVE_STORAGE_KEY)).createdAt,workingOwner);assert.deepEqual(s.writes,[api.campaignSlotStorageKey(2)]);
 assert.equal(callbacks.prepare(3,text()).failure,'save-conflict');callbacks.confirm(preview);assert.equal(requests,1);
});
test('actual FrontEnd discards an import result after session generation changes or the frontend unmounts',async()=>{
 for(const ended of ['generation','unmount']){
  const s=store(),mounts=[],catalogs=[];let finish;
  const environment={operation:{current:false},generation:{current:0},menuGeneration:0,alive:{current:true},validId:id=>api.CAMPAIGN_SLOT_IDS.includes(id),
   prepareCampaignSlotImport:(id,raw)=>api.prepareCampaignSlotImport(id,raw,s),importCampaignSlot:()=>new Promise(resolve=>{finish=resolve;}),
   setBusy(){},setMessage(){},setCatalog:value=>catalogs.push(value),setEntry:entry=>mounts.push(entry),flushSync:action=>action()};
  const callbacks=frontCallbacks(environment);callbacks.confirm(callbacks.prepare(1,text()).preview);
  if(ended==='generation')environment.generation.current++;else environment.alive.current=false;
  finish({ok:true,catalog:{},save:source(),slotId:1,checkpoint:{resumeLocation:'deck'},message:'confirmed'});await tick();
  assert.deepEqual(catalogs,[]);assert.deepEqual(mounts,[null]);assert.equal(s.writes.length,0);assert.equal(environment.operation.current,false);
 }
});
