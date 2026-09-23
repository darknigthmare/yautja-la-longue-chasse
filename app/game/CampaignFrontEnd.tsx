"use client";
import {useCallback,useEffect,useRef,useState,type ComponentType} from 'react';
import {flushSync} from 'react-dom';
import CampaignMainMenu from './CampaignMainMenu';
import {ARCHIVE_TRANSFER_JOURNAL_KEY} from './systems/archiveTransferGuard';
import {recoverArchiveTransaction,withArchiveTransferLock} from './systems/archiveTransaction';
import {activateCampaignCheckpoint,continueCampaignSlot,createCampaignSlot,loadCampaignSlots,migrateLegacyCampaignSlot,recoverCampaignSlot,CAMPAIGN_SLOT_IDS,type CampaignSlotCatalog,type CampaignSlotId,type CampaignCheckpointId,type CampaignResumeLocation,type CampaignSlotResult} from './systems/campaignSlots';
export interface CampaignSessionEntry {slotId:CampaignSlotId;ownerCreatedAt:string;token:string;location:CampaignResumeLocation}
export default function CampaignFrontEnd({SessionComponent}:{SessionComponent:ComponentType<{entry:CampaignSessionEntry;onMainMenu:()=>void}>}){
 const [catalog,setCatalog]=useState<CampaignSlotCatalog|null>(null),[entry,setEntry]=useState<CampaignSessionEntry|null>(null),[busy,setBusy]=useState(true),[message,setMessage]=useState<string|null>(null);
 const alive=useRef(true),operation=useRef(false),generation=useRef(0);
 const refresh=useCallback(async()=>{
  if(operation.current)return;operation.current=true;setBusy(true);
  try{
   let recoveryMessage:string|null=null;
   if(window.localStorage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY)!==null){
    const recovery=await withArchiveTransferLock(()=>recoverArchiveTransaction(window.localStorage));
    if(!alive.current)return;
    recoveryMessage=recovery.acquired?recovery.value.message:recovery.reason;
    if(!recovery.acquired||recovery.value.status==='blocked'){setCatalog(loadCampaignSlots());setMessage(recoveryMessage);return;}
   }
   const initial=loadCampaignSlots();let result:CampaignSlotResult|null=null;
   if(initial.legacy==='available')result=await migrateLegacyCampaignSlot();
   if(!alive.current)return;
   setCatalog(result?.catalog??initial);setMessage(result?.message??recoveryMessage??(initial.status!=='ready'?`Archives protégées (${initial.failure}). Aucune donnée remplacée.`:null));
  }catch(error){if(alive.current){setCatalog(loadCampaignSlots());setMessage(error instanceof Error?error.message:'Archives locales indisponibles. Aucune donnée modifiée.');}}
  finally{operation.current=false;if(alive.current)setBusy(false);}
 },[]);
 useEffect(()=>{alive.current=true;const task=setTimeout(()=>{void refresh();},0);const changed=()=>{if(!operation.current)setCatalog(loadCampaignSlots());};window.addEventListener('storage',changed);return()=>{alive.current=false;clearTimeout(task);window.removeEventListener('storage',changed);};},[refresh]);
 const showMenu=useCallback(()=>{generation.current++;flushSync(()=>setEntry(null));setCatalog(loadCampaignSlots());setBusy(false);setMessage(null);},[]);
 const run=useCallback(async(action:()=>Promise<CampaignSlotResult>,enter:boolean)=>{if(operation.current)return;operation.current=true;setBusy(true);setMessage(null);const request=++generation.current;
  // The old session is removed before any transaction can replace its owner.
  flushSync(()=>setEntry(null));
  try{const result=await action();if(!alive.current||generation.current!==request)return;setCatalog(result.catalog);setMessage(result.message);if(result.ok&&enter&&result.save&&result.slotId&&result.checkpoint)setEntry({slotId:result.slotId,ownerCreatedAt:result.save.createdAt,location:result.checkpoint.resumeLocation,token:`${result.slotId}:${result.save.createdAt}:${request}`});}
  catch(error){if(alive.current&&generation.current===request){setCatalog(loadCampaignSlots());setMessage(error instanceof Error?error.message:'Opération non confirmée. Les données existantes restent protégées.');}}
  finally{operation.current=false;if(alive.current&&generation.current===request)setBusy(false);}
 },[]);
 const validId=(id:number):id is CampaignSlotId=>CAMPAIGN_SLOT_IDS.includes(id as CampaignSlotId);
 if(entry)return <SessionComponent key={entry.token} entry={entry} onMainMenu={showMenu} />;
 return <CampaignMainMenu catalog={catalog?.status==='ready'?catalog:null} busy={busy} message={message} onRefresh={refresh}
  onCreate={(id,name)=>{if(!validId(id))return;void run(async()=>{const created=await createCampaignSlot(id,name);if(!created.ok||!created.checkpoint)return created;const slot=created.catalog.slots.find(s=>s.id===id)!;return activateCampaignCheckpoint(id,created.checkpoint.id,{expectedRevision:slot.revision});},true);}}
  onContinue={id=>{if(!validId(id))return;const slot=catalog?.slots.find(s=>s.id===id);if(!slot?.lastCheckpointId)return;void run(()=>catalog?.activeSlotId===id?continueCampaignSlot(id,{expectedRevision:slot.revision,location:slot.checkpoints.find(checkpoint=>checkpoint.id===slot.lastCheckpointId)?.resumeLocation}):activateCampaignCheckpoint(id,slot.lastCheckpointId!,{expectedRevision:slot.revision}),true);}}
  onLoad={(id,checkpointId,expectedRevision)=>{if(!validId(id))return;void run(()=>activateCampaignCheckpoint(id,checkpointId as CampaignCheckpointId,{expectedRevision}),true);}}
  onRecover={id=>{if(validId(id))void run(()=>recoverCampaignSlot(id),false);}}
 />;
}
