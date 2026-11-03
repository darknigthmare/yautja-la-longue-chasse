import {build} from 'esbuild';
export async function menuFixturesV63() {
  const compiled=await build({stdin:{contents:`export * from './app/game/systems/campaignSlots'; export {defaultSave,SAVE_STORAGE_KEY,SAVE_VERSION} from './app/game/save';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
  const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,_options,callback)=>callback({})}}});
  try {
    const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
    for(let id=1;id<=5;id++) {const result=await api.createCampaignSlot(id,`Chasseur QA ${id}`,storage);if(!result.ok)throw Error(result.message);}
    const first=JSON.parse(data.get(api.campaignSlotStorageKey(1)));
    const firstSave=first.checkpoints[0].archive.campaign;
    data.set(api.SAVE_STORAGE_KEY,JSON.stringify(firstSave));data.set(api.SAVE_STORAGE_KEY+'.backup',JSON.stringify(firstSave));
    const filled=[...data],corrupt=filled.map(([key,value])=>[key,key===api.SAVE_STORAGE_KEY||key===api.SAVE_STORAGE_KEY+'.backup'?'{damaged QA archive':value]);
    const future=filled.map(([key,value])=>[key,key===api.SAVE_STORAGE_KEY?JSON.stringify({...firstSave,version:api.SAVE_VERSION+1}):value]);
    const thirdKey=api.campaignSlotStorageKey(3),third=JSON.parse(data.get(thirdKey));
    const corruptSlot=[...filled.map(([key,value])=>[key,key===thirdKey?'{damaged QA slot':value]),[thirdKey+'.backup',JSON.stringify(third)]];
    const futureSlot=[...filled.map(([key,value])=>[key,key===thirdKey?JSON.stringify({...third,version:2}):value]),[thirdKey+'.backup',JSON.stringify(third)]];
    const legacy=[[api.SAVE_STORAGE_KEY,JSON.stringify(api.defaultSave('2026-09-20T00:00:00.000Z'))]];
    return {empty:[],normal:legacy,filled,corrupt,future,corruptNoSlots:[[api.SAVE_STORAGE_KEY,'{damaged QA archive'],[api.SAVE_STORAGE_KEY+'.backup','{damaged QA backup']],corruptSlot,futureSlot,readDenied:filled,writeDenied:[],heldLock:legacy,hungLock:legacy};
  } finally {if(prior)Object.defineProperty(globalThis,'navigator',prior);else delete globalThis.navigator;}
}
