import {DEFAULT_WAR_RULES_V6, type WarRulesV6} from './clanWarBibleV6';
import type {LogisticsLockV108, LogisticsStorageV108} from './clanLogisticsSessionV108';
import {CLAN_SUPPLY_KEY_V109, CLAN_SUPPLY_MAX_BYTES_V109, applySupplyV109, createSupplyV109,
  exportSupplyV109, importSupplyV109, migrateSupplyArchiveV109, supplyCommandV109,
  type SupplyActionV109, type SupplyStateV109} from './clanSupplyRouteV109';

/** One key, one cooperating V108 lock, FIFO, exact-byte CAS and readback. The
 * original V108 text and its new checkpoint are confirmed in a single write. */
export function createSupplySessionV109(storage:LogisticsStorageV108|null,lock:LogisticsLockV108|null,rules:WarRulesV6=DEFAULT_WAR_RULES_V6){
  let state:SupplyStateV109|null=createSupplyV109(null,rules),observed:string|null=null;
  let loaded=false,blocked=false,pending=0,migrationPending=false,message='Carnet non chargé.';
  let serial:Promise<unknown>=Promise.resolve();const listeners=new Set<()=>void>();
  const snapshot=()=>({state,loaded,blocked,pending,migrationPending,message});let current=snapshot();
  const emit=()=>{current=snapshot();for(const listener of listeners)listener();};
  function queue(operation:()=>Promise<void>){
    pending++;emit();const task=serial.then(operation).catch(error=>{message=error instanceof Error?error.message:'Écriture refusée.';}).finally(()=>{pending--;emit();});serial=task;return task;
  }
  async function commit(next:SupplyStateV109){
    if(!storage||!lock||blocked)throw Error('Carnet verrouillé ; aucun octet inconnu ne sera remplacé.');
    const text=exportSupplyV109(next);if(!text||new TextEncoder().encode(text).length>CLAN_SUPPLY_MAX_BYTES_V109)throw Error('Le carnet complet et sa copie V108 dépassent 4 Mo ; l’archive existante reste conservée.');
    await lock(async()=>{
      if(storage.getItem(CLAN_SUPPLY_KEY_V109)!==observed){blocked=true;throw Error('Autre session détectée ; rechargez son carnet sans écrasement.');}
      storage.setItem(CLAN_SUPPLY_KEY_V109,text);const actual=storage.getItem(CLAN_SUPPLY_KEY_V109);
      if(actual!==text){if(actual!==observed)blocked=true;throw Error('Écriture non confirmée ; aucun mouvement ni progrès validé.');}
      observed=text;state=next;migrationPending=false;
    });
  }
  function retryMigration(){return queue(async()=>{
    if(!loaded||blocked||!state)throw Error('Ancien carnet indisponible ; aucune reprise écrite.');
    if(!migrationPending){message='Le carnet de tournée est déjà confirmé.';return;}
    await commit(state);message='Carnet V108 repris ; son texte original exact et le checkpoint sont conservés ensemble.';
  });}
  function hydrate(){
    if(loaded)return;loaded=true;
    try{
      if(!storage||!lock)throw Error('Stockage ou Web Lock indisponible ; aucune écriture permise.');
      observed=storage.getItem(CLAN_SUPPLY_KEY_V109);
      if(observed!==null){
        const parsed=importSupplyV109(observed,rules);
        if(parsed.state)state=parsed.state;
        else{state=createSupplyV109(observed,rules);if(!state)throw Error(parsed.error??'Carnet incompatible.');migrationPending=true;}
      }
      message=migrationPending?'Reprise du carnet V108 : attendre la confirmation de sa copie avant de déplacer le convoi.':'Carnet chargé ; stocks et tournée repris ensemble.';
    }catch(error){blocked=true;state=null;message=error instanceof Error?error.message:'Chargement refusé.';}
    emit();if(migrationPending&&!blocked)void retryMigration();
  }
  function act(action:SupplyActionV109){return queue(async()=>{
    if(!loaded||blocked||migrationPending||!state)throw Error('Attendez la confirmation du carnet avant de reprendre le convoi.');
    const result=applySupplyV109(state,supplyCommandV109(state,action),rules);
    if(!result.accepted){message=result.message;return;}
    await commit(result.state);message=result.message;
  });}
  function importText(text:string){return queue(async()=>{
    if(!loaded||blocked||migrationPending||!state)throw Error('Confirmez d’abord la reprise du carnet courant ; ses octets restent préservés.');
    const parsed=migrateSupplyArchiveV109(text,rules);if(!parsed.state)throw Error(parsed.error??'Import refusé.');
    if(state.originalV108Archive!==null&&parsed.state.originalV108Archive!==state.originalV108Archive)throw Error('Ce carnet ne conserve pas la même archive V108 originale ; import refusé sans mutation.');
    await commit(parsed.state);message='Carnet de tournée repris exactement ; déplacements et médias arrêtés.';
  });}
  function externalChange(){
    if(!loaded||!storage)return;
    try{if(storage.getItem(CLAN_SUPPLY_KEY_V109)!==observed){blocked=true;message='Archive modifiée ailleurs : rechargez avant tout nouveau geste.';emit();}}
    catch{blocked=true;message='Archive illisible ; checkpoint confirmé conservé.';emit();}
  }
  return {hydrate,act,importText,retryMigration,externalChange,whenSettled:()=>serial,getObservedText:()=>observed,
    getSnapshot:()=>current,getServerSnapshot:()=>current,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
