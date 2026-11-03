import { applyCntlipV77, defaultCntlipV77, normalizeCntlipV77, type CntlipActionV77, type CntlipContextV77, type CntlipResultV77, type CntlipSiteIdV77, type CntlipStateV77 } from './cntlipV77';

export const CNTLIP_HOSPITALITY_SITES_V77=['clan-common','market-halt','pit-rest','council-gathering'] as const;
export type CntlipHospitalitySiteV77=typeof CNTLIP_HOSPITALITY_SITES_V77[number];
/** Four portions per venue, once per campaign: explicit original hospitality,
 * not free endless inventory or a canonical rule about all Yautja clans. */
export const CNTLIP_HOSPITALITY_PORTIONS_V77=4;
export interface CntlipLedgerV77 {version:1;revision:number;state:CntlipStateV77;invitedSiteIds:CntlipHospitalitySiteV77[];stock:Record<CntlipHospitalitySiteV77,number>}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function defaultCntlipLedgerV77():CntlipLedgerV77 {return {version:1,revision:0,state:defaultCntlipV77(),invitedSiteIds:[],stock:{'clan-common':0,'market-halt':0,'pit-rest':0,'council-gathering':0}};}
export function normalizeCntlipLedgerV77(value:unknown):CntlipLedgerV77|null {
  if(value===undefined)return defaultCntlipLedgerV77();
  if(!record(value)||value.version!==1||Object.keys(value).some(key=>!['version','revision','state','invitedSiteIds','stock'].includes(key))||!integer(value.revision,0,1_000_000)||!Array.isArray(value.invitedSiteIds)||!record(value.stock))return null;
  const invited=value.invitedSiteIds;
  if(invited.some(site=>!CNTLIP_HOSPITALITY_SITES_V77.includes(site))||new Set(invited).size!==invited.length||Object.keys(value.stock).length!==4||value.state===undefined)return null;
  const state=normalizeCntlipV77(value.state);
  if(!state||state.pending?.siteId==='ship-mess'||state.memories.some(receipt=>receipt.siteId==='ship-mess'))return null;
  const clean=defaultCntlipLedgerV77();clean.state=state;clean.revision=value.revision;
  clean.invitedSiteIds=CNTLIP_HOSPITALITY_SITES_V77.filter(site=>invited.includes(site));
  for(const site of CNTLIP_HOSPITALITY_SITES_V77){const amount=value.stock[site];if(!integer(amount,0,4)||!clean.invitedSiteIds.includes(site)&&amount!==0)return null;clean.stock[site]=amount;}
  // Every reserved cup must have come from a recorded, finite invitation.
  if(state.totalServings+Object.values(clean.stock).reduce((sum,n)=>sum+n,0)!==4*clean.invitedSiteIds.length || state.pending&&!clean.invitedSiteIds.includes(state.pending.siteId as CntlipHospitalitySiteV77) || state.memories.some(receipt=>!clean.invitedSiteIds.includes(receipt.siteId as CntlipHospitalitySiteV77)))return null;
  return clean;
}
export function cntlipSiteStockV77(value:unknown,siteId:CntlipSiteIdV77|null) {
  const ledger=normalizeCntlipLedgerV77(value);return ledger&&siteId&&siteId!=='ship-mess'?ledger.stock[siteId]:0;
}
export type CntlipLedgerActionV77=CntlipActionV77|{type:'accept-hospitality'};
export interface CntlipLedgerResultV77 {ok:boolean;changed:boolean;ledger:CntlipLedgerV77;message:string;result:CntlipResultV77|null}
export function applyCntlipLedgerV77(value:unknown,action:CntlipLedgerActionV77,context:CntlipContextV77):CntlipLedgerResultV77 {
  const clean=normalizeCntlipLedgerV77(value),ledger=clean??defaultCntlipLedgerV77();
  const fail=(message:string)=>({ok:false,changed:false,ledger,message,result:null});
  if(!clean)return fail('Registre C’ntlip incompatible : aucune réserve ou progression remplacée.');
  const site=context.siteId&&context.siteId!=='ship-mess'?context.siteId:null;
  if(action.type==='accept-hospitality'){
    // Reuse the actual safe-site/rank checks and require a visible local host.
    const observe=applyCntlipV77(ledger.state,{type:'learn'},context);
    if(!observe.ok||!site||context.rank==='youngling'||context.rank==='unblooded'||!context.participants.some(host=>host.siteId===site&&host.availableForConversation&&Number.isFinite(host.distanceToSite)&&host.distanceToSite<=140))return fail('Rejoins l’hôte à sa table après ton accueil et ton parcours de jeunesse.');
    if(ledger.invitedSiteIds.includes(site))return {ok:true,changed:false,ledger,message:'L’invitation de cette table a déjà été reçue ; la réserve ne se renouvelle pas.',result:null};
    ledger.invitedSiteIds=CNTLIP_HOSPITALITY_SITES_V77.filter(id=>id===site||ledger.invitedSiteIds.includes(id));ledger.stock[site]=4;ledger.state=observe.state;ledger.revision++;
    return {ok:true,changed:true,ledger,message:'L’hôte met quatre portions de côté pour cette halte. Cette hospitalité locale est une création originale du jeu.',result:null};
  }
  // Stock and host availability come from ledger + current scene, not action.
  if(action.type==='start-serving' && (!site||!context.participants.some(host=>host.siteId===site&&host.availableForConversation&&Number.isFinite(host.distanceToSite)&&host.distanceToSite<=140)))return fail('L’hôte doit être présent près de cette table.');
  const result=applyCntlipV77(ledger.state,action,{...context,servingStock:site?ledger.stock[site]:0});
  if(result.changed){ledger.state=result.state;if(result.consumesServings&&site)ledger.stock[site]-=result.consumesServings;ledger.revision++;}
  if(!normalizeCntlipLedgerV77(ledger))return fail('Le registre de portions n’est pas cohérent ; aucune écriture.');
  return {ok:result.ok,changed:result.changed,ledger,message:result.message,result};
}
/** A synchronous guard always reads the newest confirmed ledger. A failed or
 * throwing storage commit updates neither refs, stock, memory nor success UI. */
export function createCntlipTransactionV77(read:()=>unknown,commit:(next:CntlipLedgerV77)=>boolean) {
  let busy=false;
  return (action:CntlipLedgerActionV77,context:CntlipContextV77):CntlipLedgerResultV77=>{
    const previous=normalizeCntlipLedgerV77(read())??defaultCntlipLedgerV77();
    if(busy)return {ok:false,changed:false,ledger:previous,message:'Une écriture C’ntlip est déjà en cours.',result:null};
    busy=true;
    try{const result=applyCntlipLedgerV77(read(),action,context);if(!result.changed)return result;
      try{if(commit(result.ledger))return result;}catch{/* Preserve all original state on ENOSPC/storage failures. */}
      return {ok:false,changed:false,ledger:previous,message:'Écriture C’ntlip non confirmée. Réessaie ici ; aucun geste, souvenir ou ellipse n’est annoncé.',result:null};
    }finally{busy=false;}
  };
}
