import {DEFAULT_WAR_RULES_V6,type WarRulesV6} from './clanWarBibleV6';
import {applyLogisticsV108,CLAN_LOGISTICS_KEY_V108,createLogisticsV108,exportLogisticsV108,importLogisticsV108,logisticsCommandV108,type LogisticsActionV108,type LogisticsStateV108} from './clanLogisticsV108';
export interface LogisticsStorageV108 {getItem(key:string):string|null;setItem(key:string,value:string):void}
export type LogisticsLockV108 = <T>(operation:()=>T|Promise<T>)=>Promise<T>;
/** A single, bounded archive under one cooperating Web Lock. Unknown bytes are
 * preserved; a failed write never advances the confirmed UI state. */
export function createLogisticsSessionV108(storage:LogisticsStorageV108|null,lock:LogisticsLockV108|null,rules:WarRulesV6=DEFAULT_WAR_RULES_V6){
 let state=createLogisticsV108(rules),observed:string|null=null,blocked=false,loaded=false,pending=0,message='Carnet non chargé.';
 const listeners=new Set<()=>void>();let serial:Promise<unknown>=Promise.resolve();
 const snapshot=()=>({state,loaded,blocked,pending,message});let current=snapshot();
 const emit=()=>{current=snapshot();for(const listener of listeners)listener();};
 function hydrate(){if(loaded)return;loaded=true;try{if(!storage||!lock)throw Error('Stockage ou verrou du navigateur indisponible ; aucun écrasement permis.');observed=storage.getItem(CLAN_LOGISTICS_KEY_V108);if(observed!==null){const parsed=importLogisticsV108(observed,rules);if(!parsed.state)throw Error(parsed.error??'Carnet incompatible.');state=parsed.state;}message='Carnet chargé. Chaque geste est confirmé dans une archive locale séparée.';}catch(e){blocked=true;message=e instanceof Error?e.message:'Chargement impossible.';}emit();}
 async function commit(next:LogisticsStateV108,text:string){if(!storage||!lock||blocked)throw Error('Carnet verrouillé ; rechargez après avoir conservé vos données.');
  return lock(async()=>{if(storage.getItem(CLAN_LOGISTICS_KEY_V108)!==observed){blocked=true;throw Error('Autre session détectée ; rechargez pour reprendre son carnet, sans écrasement.');}storage.setItem(CLAN_LOGISTICS_KEY_V108,text);if(storage.getItem(CLAN_LOGISTICS_KEY_V108)!==text){blocked=true;throw Error('Relecture différente après écriture ; aucune avancée confirmée.');}observed=text;state=next;});}
 function queue(operation:()=>Promise<void>){pending++;emit();const task=serial.then(operation).catch(e=>{message=e instanceof Error?e.message:'Écriture refusée.';}).finally(()=>{pending--;emit();});serial=task;return task;}
 function act(action:LogisticsActionV108){return queue(async()=>{if(!loaded||!state||blocked)throw Error('Carnet non disponible ; aucune action appliquée.');const result=applyLogisticsV108(state,logisticsCommandV108(state,action),rules);if(!result.accepted){message=result.message;return;}const text=exportLogisticsV108(result.state)!;await commit(result.state,text);message=result.message;});}
 function importText(text:string){return queue(async()=>{const parsed=importLogisticsV108(text,rules);if(!parsed.state)throw Error(parsed.error??'Import refusé.');await commit(parsed.state,exportLogisticsV108(parsed.state)!);message='Carnet V108 repris exactement ; déplacements et sons arrêtés.';});}
 function externalChange(){if(!loaded||!storage)return;try{if(storage.getItem(CLAN_LOGISTICS_KEY_V108)!==observed){blocked=true;message='Archive modifiée ailleurs : rechargez, aucune écriture depuis cette vue.';emit();}}catch{blocked=true;message='Archive devenue illisible ; état confirmé conservé.';emit();}}
 return {hydrate,act,importText,externalChange,getSnapshot:()=>current,getServerSnapshot:()=>current,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
