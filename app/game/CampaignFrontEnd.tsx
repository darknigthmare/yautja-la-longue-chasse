"use client";
import {recoverAnyArchiveV71} from "./systems/archiveRecoveryV71";
import {useCallback,useEffect,useRef,useState,lazy,Suspense,type ComponentType} from 'react';
import {flushSync} from 'react-dom';
import CampaignMainMenu from './CampaignMainMenu';
import { defaultSave, loadSaveWithStatus } from './save';
import type { SaveGame } from './types';
import { mainMenuModeAccessV81, mainMenuBrowserShipContextV81, type MainMenuGameModeV81 } from './systems/mainMenuModesV81';
import type { ChronicleAccessContext } from './systems/clanChronicle';
import {ARCHIVE_TRANSFER_JOURNAL_KEY} from './systems/archiveTransferGuard';
import {withArchiveTransferLock} from './systems/archiveTransaction';
import {activateCampaignCheckpoint,continueCampaignSlot,createCampaignSlot,replaceCampaignSlot,recoverCampaignWorkspace,recoverAsNewCampaignSlot,loadCampaignSlots,migrateLegacyCampaignSlot,recoverCampaignSlot,CAMPAIGN_SLOT_IDS,type CampaignSlotCatalog,type CampaignSlotId,type CampaignCheckpointId,type CampaignResumeLocation,type CampaignSlotResult} from './systems/campaignSlots';
const Mausoleum=lazy(()=>import("./Mausoleum"));
const BonusModes=lazy(()=>import('./MainMenuBonusModesV81'));
export interface CampaignSessionEntry {slotId:CampaignSlotId;ownerCreatedAt:string;token:string;location:CampaignResumeLocation;menuMode?:MainMenuGameModeV81}
function currentModeCampaign(catalog:CampaignSlotCatalog):SaveGame|null{
 const loaded=loadSaveWithStatus();
 const owner=catalog.slots.find(slot=>slot.id===catalog.activeSlotId&&slot.status==='ready');
 return catalog.status==='ready'&&loaded.loaded&&loaded.failure===null&&owner?.ownerCreatedAt===loaded.save.createdAt?loaded.save:null;
}
export default function CampaignFrontEnd({SessionComponent}:{SessionComponent:ComponentType<{entry:CampaignSessionEntry;onMainMenu:()=>void}>}){
 const [catalog,setCatalog]=useState<CampaignSlotCatalog|null>(null),[entry,setEntry]=useState<CampaignSessionEntry|null>(null),[busy,setBusy]=useState(true),[message,setMessage]=useState<string|null>(null);
 const [mausoleumOpen,setMausoleumOpen]=useState(false);
 const [modeCampaign,setModeCampaign]=useState<SaveGame|null>(null),[bonusMode,setBonusMode]=useState<MainMenuGameModeV81|null>(null);
 const [modeContext,setModeContext]=useState<ChronicleAccessContext>({personalShipAvailable:false});
 const alive=useRef(true),operation=useRef(false),generation=useRef(0);
 const refresh=useCallback(async()=>{
  if(operation.current)return;operation.current=true;setBusy(true);
  try{
   let recoveryMessage:string|null=null;
   if(window.localStorage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY)!==null){
    const recovery=await withArchiveTransferLock(()=>recoverAnyArchiveV71(window.localStorage));
    if(!alive.current)return;
    recoveryMessage=recovery.acquired?recovery.value.message:recovery.reason;
    if(!recovery.acquired||recovery.value.status==='blocked'){setCatalog(loadCampaignSlots());setMessage(recoveryMessage);return;}
   }
   const initial=loadCampaignSlots();let result:CampaignSlotResult|null=null;
   if(initial.legacy==='available')result=await migrateLegacyCampaignSlot();
   if(!alive.current)return;
   const next=result?.catalog??initial;setCatalog(next);const campaign=currentModeCampaign(next);setModeCampaign(campaign);setModeContext(mainMenuBrowserShipContextV81(campaign));setMessage(result?.message??recoveryMessage??(initial.status!=='ready'?`Archives protégées (${initial.failure}). Aucune donnée remplacée.`:null));
  }catch(error){if(alive.current){setCatalog(loadCampaignSlots());setMessage(error instanceof Error?error.message:'Archives locales indisponibles. Aucune donnée modifiée.');}}
  finally{operation.current=false;if(alive.current)setBusy(false);}
 },[]);
 useEffect(()=>{alive.current=true;const task=setTimeout(()=>{void refresh();},0);const changed=()=>{if(!operation.current){const next=loadCampaignSlots();setCatalog(next);const campaign=currentModeCampaign(next);setModeCampaign(campaign);setModeContext(mainMenuBrowserShipContextV81(campaign));}};window.addEventListener('storage',changed);return()=>{alive.current=false;clearTimeout(task);window.removeEventListener('storage',changed);};},[refresh]);
 const showMenu=useCallback(()=>{generation.current++;flushSync(()=>{setEntry(null);setBonusMode(null);});const next=loadCampaignSlots();setCatalog(next);const campaign=currentModeCampaign(next);setModeCampaign(campaign);setModeContext(mainMenuBrowserShipContextV81(campaign));setBusy(false);setMessage(null);},[]);
 const run=useCallback(async(action:()=>Promise<CampaignSlotResult>,enter:boolean,menuMode?:MainMenuGameModeV81)=>{if(operation.current)return;operation.current=true;setBusy(true);setMessage(null);const request=++generation.current;
  // The old session is removed before any transaction can replace its owner.
  flushSync(()=>setEntry(null));
  try{const result=await action();if(!alive.current||generation.current!==request)return;setCatalog(result.catalog);setMessage(result.message);if(result.ok&&enter&&result.save&&result.slotId&&result.checkpoint){if(menuMode&&!mainMenuModeAccessV81(result.save,mainMenuBrowserShipContextV81(result.save))[menuMode]){setModeCampaign(result.save);setMessage('Le palier de cette campagne a changé. Choisissez à nouveau le mode pour consulter l’avertissement spoilers.');return;}setEntry({slotId:result.slotId,ownerCreatedAt:result.save.createdAt,location:result.checkpoint.resumeLocation,token:`${result.slotId}:${result.save.createdAt}:${request}`,menuMode});}}
  catch(error){if(alive.current&&generation.current===request){setCatalog(loadCampaignSlots());setMessage(error instanceof Error?error.message:'Opération non confirmée. Les données existantes restent protégées.');}}
  finally{operation.current=false;if(alive.current&&generation.current===request)setBusy(false);}
 },[]);
 const openGameMode=useCallback((mode:MainMenuGameModeV81,spoilersConfirmed:boolean)=>{
  if(operation.current||!alive.current)return;
  const next=loadCampaignSlots(),campaign=currentModeCampaign(next),context=mainMenuBrowserShipContextV81(campaign);setCatalog(next);setModeCampaign(campaign);setModeContext(context);
  if(!mainMenuModeAccessV81(campaign,context)[mode]){
   if(!spoilersConfirmed){setMessage('La campagne courante n’a pas encore accès à ce mode. Choisissez à nouveau le mode pour confirmer l’accès anticipé.');return;}
   // No activation/import/owner change is permitted on this branch.
   setBonusMode(mode);setMessage(null);return;
  }
  const slot=next.slots.find(item=>item.id===next.activeSlotId);
  if(!slot?.lastCheckpointId)return;
  void run(()=>continueCampaignSlot(slot.id,{expectedRevision:slot.revision,location:slot.checkpoints.find(checkpoint=>checkpoint.id===slot.lastCheckpointId)?.resumeLocation}),true,mode);
 },[run]);
 const validId=(id:number):id is CampaignSlotId=>CAMPAIGN_SLOT_IDS.includes(id as CampaignSlotId);
 if(bonusMode)return <Suspense fallback={<p role="status">Ouverture du mode libre…</p>}><BonusModes key={bonusMode} mode={bonusMode} settings={modeCampaign?.settings??defaultSave().settings} onExit={showMenu} /></Suspense>;
 if(mausoleumOpen)return <Suspense fallback={<p role="status">Ouverture des archives…</p>}><Mausoleum save={null} source="menu" onExit={()=>setMausoleumOpen(false)} /></Suspense>;
 if(entry)return <SessionComponent key={entry.token} entry={entry} onMainMenu={showMenu} />;
 return <CampaignMainMenu catalog={catalog} busy={busy} message={message} onRefresh={refresh}
  modeAccess={mainMenuModeAccessV81(modeCampaign,modeContext)} onOpenGameMode={openGameMode}
  onMausoleum={()=>setMausoleumOpen(true)}
  onCreate={(id,name)=>{if(!validId(id))return;void run(async()=>{const created=await createCampaignSlot(id,name);if(!created.ok||!created.checkpoint)return created;const slot=created.catalog.slots.find(s=>s.id===id)!;return activateCampaignCheckpoint(id,created.checkpoint.id,{expectedRevision:slot.revision});},true);}}
  onContinue={id=>{if(!validId(id))return;const slot=catalog?.slots.find(s=>s.id===id);if(!slot?.lastCheckpointId)return;void run(()=>catalog?.activeSlotId===id?continueCampaignSlot(id,{expectedRevision:slot.revision,location:slot.checkpoints.find(checkpoint=>checkpoint.id===slot.lastCheckpointId)?.resumeLocation}):activateCampaignCheckpoint(id,slot.lastCheckpointId!,{expectedRevision:slot.revision}),true);}}
  onLoad={(id,checkpointId,expectedRevision)=>{if(!validId(id))return;void run(()=>activateCampaignCheckpoint(id,checkpointId as CampaignCheckpointId,{expectedRevision}),true);}}
  onRecover={id=>{if(validId(id))void run(()=>recoverCampaignSlot(id),false);}}
  onReplace={(id,name,expectedRevision,expectedOwnerCreatedAt)=>{if(validId(id))void run(()=>replaceCampaignSlot(id,name,{expectedRevision,expectedOwnerCreatedAt}),true);}}
  onWorkspaceRecover={(id,checkpointId,expectedRevision)=>{if(validId(id))void run(()=>recoverCampaignWorkspace(id,checkpointId as CampaignCheckpointId,{expectedRevision}),true);}}
  onRecoverNew={(id,name)=>{if(validId(id))void run(()=>recoverAsNewCampaignSlot(id,name),true);}}
 />;
}
