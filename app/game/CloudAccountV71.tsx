"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import styles from './CloudAccountV71.module.css';
import {createCloudRestV71,parseCloudSessionV71,CLOUD_SESSION_KEY_V71,type CloudSessionV71} from './systems/cloudAccountRestV71';
import {captureCloudArchiveV71,CLOUD_WORKSPACE_OWNER_KEY_V71,cloudArchiveHasTraceV71,cloudArchiveIdentityV71,type CloudArchiveV71} from './systems/cloudArchiveV71';
import {backupRemoteCloudV71,cloudArchiveDigestV71,cloudSyncBaseStorageKeyV71,cloudOutboxStorageKeyV71,readCloudSyncBaseV71,reconcileCloudArchiveV71,queueCloudArchiveV71,flushCloudOutboxV71,readCloudOutboxV71,validateCloudRowV71,type CloudAccountArchiveRowV71,type CloudSyncTransportV71} from './systems/cloudSyncV71';
import {readCloudWorkspaceOwnerV71,prepareCloudArchiveRestoreV71,applyCloudArchiveRestoreV71} from './systems/cloudArchiveRestoreV71';
import {withArchiveTransferLock} from './systems/archiveTransaction';
import {archiveTransferPending} from './systems/archiveTransferGuard';
import {useMenuGamepad} from './useMenuGamepad';

const OPEN_EVENT='yautja-open-account-v71';
export function openCloudAccountV71(){window.dispatchEvent(new Event(OPEN_EVENT));}
const api=createCloudRestV71();
function archiveSummary(snapshot:CloudArchiveV71|null){
 if(!snapshot)return 'Aucune partie enregistrée sur le compte.';
 const slots=snapshot.entries.filter(e=>/^yautja-long-hunt\.campaign-slot\.[1-5]$/.test(e.key));
 const working=snapshot.entries.find(e=>e.key==='yautja-long-hunt.save');
 let name='Chasseur';try{name=working?JSON.parse(working.raw).profile.hunterName:name;}catch{/* validated elsewhere */}
 return slots.length?`${slots.length} partie(s) · ${name} · les sauvegardes manuelles, autos et annexes sont incluses.`:`${name} · archive locale et annexes incluses.`;
}
function adapter(session:CloudSessionV71):CloudSyncTransportV71 {
 const map=(row:unknown)=>{if(!row||typeof row!=='object')throw new Error('Archive du compte illisible.');const v=row as Record<string,unknown>;return validateCloudRowV71({accountId:v.user_id,revision:v.revision,snapshot:v.snapshot,updatedAt:v.updated_at},session.user.id);};
 return {pull:async()=>{const row=await api.pull(session);return row===null?null:map(row);},push:async input=>map(await api.push(session,input.expectedRevision,input.snapshot))};
}
/** Continuous sync is separate from game saves. Never replaces a running scene. */
export default function CloudAccountV71({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false),[session,setSession]=useState<CloudSessionV71|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Parties enregistrées sur cet appareil.'),[remote,setRemote]=useState<CloudAccountArchiveRowV71|null>(null),[choice,setChoice]=useState(false),[mode,setMode]=useState<'login'|'signup'>('login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[localSummary,setLocalSummary]=useState('Lecture des archives…');
 const current=useRef<CloudSessionV71|null>(null),working=useRef(false),mounted=useRef(true),epoch=useRef(0),dialog=useRef<HTMLElement>(null),trigger=useRef<HTMLElement|null>(null),observedRemote=useRef<CloudAccountArchiveRowV71|null>(null),observedLocal=useRef<string|null>(null);
 const commitSession=useCallback((value:CloudSessionV71|null)=>{if(value)window.localStorage.setItem(CLOUD_SESSION_KEY_V71,JSON.stringify(value));else window.localStorage.removeItem(CLOUD_SESSION_KEY_V71);current.current=value;setSession(value);},[]);
 const invalidateSession=useCallback(()=>{epoch.current++;},[]);
 const ownerCurrent=useCallback((id:string)=>mounted.current&&current.current?.user.id===id&&parseCloudSessionV71(window.localStorage.getItem(CLOUD_SESSION_KEY_V71))?.user.id===id,[]);
 const capture=useCallback(async()=>{const result=await withArchiveTransferLock(()=>captureCloudArchiveV71(window.localStorage));if(!result.acquired)throw new Error(result.reason);return result.value;},[]);
 const remember=useCallback(async(row:CloudAccountArchiveRowV71)=>{const expectedEpoch=epoch.current;const digest=await cloudArchiveDigestV71(row.snapshot);if(epoch.current!==expectedEpoch||!ownerCurrent(row.accountId))throw new Error('Compte remplacé pendant la confirmation.');const raw=JSON.stringify({revision:row.revision,digest});window.localStorage.setItem(cloudSyncBaseStorageKeyV71(row.accountId),raw);if(window.localStorage.getItem(cloudSyncBaseStorageKeyV71(row.accountId))!==raw)throw new Error('Confirmation locale de synchronisation refusée.');},[ownerCurrent]);
 const restore=useCallback(async(row:CloudAccountArchiveRowV71)=>{
  const expectedEpoch=epoch.current;const oldOutbox=readCloudOutboxV71(window.localStorage,row.accountId).raw;
  if(!ownerCurrent(row.accountId))throw new Error('Le compte a changé. Aucun remplacement exécuté.');
  const result=await withArchiveTransferLock(()=>{
   if(!ownerCurrent(row.accountId)||epoch.current!==expectedEpoch)throw new Error('Compte remplacé.');
   const before=captureCloudArchiveV71(window.localStorage);
   if(observedLocal.current!==null&&cloudArchiveIdentityV71(before)!==observedLocal.current)throw new Error('Les parties locales ont changé depuis la prévisualisation. Actualisez avant de confirmer.');
   const plan=prepareCloudArchiveRestoreV71(window.localStorage,row.accountId,row.snapshot);
   return applyCloudArchiveRestoreV71(window.localStorage,plan);
  });
  if(!result.acquired)throw new Error(result.reason);
  if(!result.value.persisted)throw new Error(result.value.recovery.message);
  // The old React session must never resume after an archive has changed owners.
  try{await remember(row);const key=cloudOutboxStorageKeyV71(row.accountId);if(window.localStorage.getItem(key)===oldOutbox)window.localStorage.removeItem(key);}finally{window.location.reload();}
 },[ownerCurrent,remember]);
 const sync=useCallback(async(manual=false)=>{
  if(working.current||!current.current||archiveTransferPending(window.localStorage))return;
  working.current=true;if(manual)setBusy(true);
  const requestEpoch=epoch.current;let active=current.current;
  try{
   if(active.expiresAt<Date.now()/1000+90){active=await api.refresh(active);if(!mounted.current||epoch.current!==requestEpoch)return;commitSession(active);}
   if(!ownerCurrent(active.user.id))return;
   const transport=adapter(active);
   // Keep a refused outbox intact; no new snapshot replaces an unresolved conflict.
   const pending=readCloudOutboxV71(window.localStorage,active.user.id);
   let pendingConflict=false;
   if(pending.outbox&&readCloudWorkspaceOwnerV71(window.localStorage)===active.user.id){
    try{const flushed=await flushCloudOutboxV71(window.localStorage,active.user.id,transport,{isCurrentAccount:()=>ownerCurrent(active.user.id)&&epoch.current===requestEpoch&&readCloudWorkspaceOwnerV71(window.localStorage)===active.user.id});
     if(flushed.status==='changed-locally'){setMessage('Archive transmise ; nouvelles modifications en attente.');return;}
    }catch{pendingConflict=true;} // Retain outbox but still refresh both previews.
   }
   const cloud=await transport.pull({accountId:active.user.id});if(!ownerCurrent(active.user.id)||epoch.current!==requestEpoch)return;
   observedRemote.current=cloud;setRemote(cloud);
   const local=await capture();if(!ownerCurrent(active.user.id)||epoch.current!==requestEpoch)return;observedLocal.current=cloudArchiveIdentityV71(local);setLocalSummary(archiveSummary(local));
   const localDigest=await cloudArchiveDigestV71(local),cloudDigest=cloud?await cloudArchiveDigestV71(cloud.snapshot):null;
   if(!ownerCurrent(active.user.id)||epoch.current!==requestEpoch)return;
   const decision=reconcileCloudArchiveV71({accountId:active.user.id,workspaceAccountId:readCloudWorkspaceOwnerV71(window.localStorage),local,cloud,localDigest,cloudDigest,base:readCloudSyncBaseV71(window.localStorage,active.user.id)});
   if(pendingConflict){setChoice(true);setMessage('Un transfert en attente rencontre une autre progression du compte. Les deux copies sont conservées : choisissez celle à reprendre.');return;}
   if(decision.action==='none'){
    // Signing in before starting a first game also enables its future saves.
    // Bind only a genuinely empty, unowned workspace, never an existing branch.
    if(!cloud&&!cloudArchiveHasTraceV71(local)&&readCloudWorkspaceOwnerV71(window.localStorage)===null&&pending.raw===null){
     const bound=await withArchiveTransferLock(()=>{
      if(!ownerCurrent(active.user.id)||epoch.current!==requestEpoch)throw new Error('Compte remplacé pendant l’association.');
      if(readCloudWorkspaceOwnerV71(window.localStorage)!==null||cloudArchiveHasTraceV71(captureCloudArchiveV71(window.localStorage))||readCloudOutboxV71(window.localStorage,active.user.id).raw!==null)throw new Error('Les archives ont changé. Actualisez avant de les associer.');
      window.localStorage.setItem(CLOUD_WORKSPACE_OWNER_KEY_V71,active.user.id);
      if(readCloudWorkspaceOwnerV71(window.localStorage)!==active.user.id)throw new Error('Association du compte non confirmée.');
     });
     if(!bound.acquired)throw new Error(bound.reason);
    }
    if(cloud)await remember(cloud);setChoice(false);setMessage(cloud?'Sauvegardes synchronisées avec le compte.':'Compte connecté. Votre première partie sera synchronisée après son enregistrement.');return;
   }
   if(decision.action==='download-cloud'&&!cloudArchiveHasTraceV71(local)&&cloud){setMessage('Récupération des parties du compte…');await restore(cloud);return;}
   if(decision.action==='upload-local'&&readCloudWorkspaceOwnerV71(window.localStorage)===active.user.id){
    queueCloudArchiveV71(window.localStorage,active.user.id,local,{revision:cloud?.revision??null,digest:cloudDigest});
    const result=await flushCloudOutboxV71(window.localStorage,active.user.id,transport,{isCurrentAccount:()=>ownerCurrent(active.user.id)&&epoch.current===requestEpoch&&readCloudWorkspaceOwnerV71(window.localStorage)===active.user.id});
    if(!ownerCurrent(active.user.id)||epoch.current!==requestEpoch)return;
    if(result.row){observedRemote.current=result.row;setRemote(result.row);}
    setChoice(false);setMessage(result.status==='changed-locally'?'Archive transmise ; nouvelles modifications en attente.':'Dernière progression enregistrée transmise au compte.');return;
   }
   setChoice(true);setMessage(decision.reason==='account-change'?'Les parties de cet appareil sont liées à un autre compte. Choisissez explicitement la copie à utiliser.':decision.reason==='cloud-change'?'Une progression plus récente existe sur le compte. Reprenez-la depuis ce panneau.':'Choisissez les parties à associer au compte. Aucune copie n’a été écrasée.');
  }catch(error){if(mounted.current&&epoch.current===requestEpoch){setMessage(error instanceof Error?error.message:'Synchronisation non confirmée. Les parties locales restent intactes.');setChoice(true);}}finally{working.current=false;if(mounted.current)setBusy(false);}
 },[capture,commitSession,restore,ownerCurrent,remember]);
 useEffect(()=>{
  mounted.current=true;const show=()=>{trigger.current=document.activeElement as HTMLElement;setOpen(true);void capture().then(v=>{observedLocal.current=cloudArchiveIdentityV71(v);setLocalSummary(archiveSummary(v));}).catch(e=>setMessage(e.message));};
  window.addEventListener(OPEN_EVENT,show);
  const initialize=async()=>{const requestEpoch=epoch.current;try{const stored=parseCloudSessionV71(window.localStorage.getItem(CLOUD_SESSION_KEY_V71));if(!stored)return;const active=stored.expiresAt<Date.now()/1000+90?await api.refresh(stored):await api.verify(stored);if(!mounted.current||epoch.current!==requestEpoch)return;commitSession(active);await sync();}catch(error){if(mounted.current&&epoch.current===requestEpoch)setMessage(error instanceof Error?error.message:'Connexion non confirmée.');}};
  const initial=setTimeout(()=>void initialize(),0);const timer=setInterval(()=>void sync(),10000);const online=()=>void sync();window.addEventListener('online',online);
  const changed=(e:StorageEvent)=>{if(e.key===CLOUD_SESSION_KEY_V71){epoch.current++;current.current=parseCloudSessionV71(e.newValue);setSession(current.current);observedRemote.current=null;observedLocal.current=null;setRemote(null);setChoice(false);setMessage('Compte modifié dans une autre fenêtre.');}};
  window.addEventListener('storage',changed);
  return()=>{mounted.current=false;invalidateSession();clearTimeout(initial);clearInterval(timer);window.removeEventListener(OPEN_EVENT,show);window.removeEventListener('online',online);window.removeEventListener('storage',changed);};
 },[capture,commitSession,sync,invalidateSession]);
 useEffect(()=>{if(!open)return;dialog.current?.querySelector<HTMLElement>('button,input')?.focus();},[open,session]);
 const close=()=>{if(busy)return;setOpen(false);setPassword('');setTimeout(()=>trigger.current?.focus(),0);};
 useMenuGamepad(dialog,open,`account:${Boolean(session)}:${choice}:${busy}`,close);
 const authenticate=async()=>{
  if(working.current)return;working.current=true;setBusy(true);const requestEpoch=++epoch.current;
  try{const active=mode==='signup'?await api.signUp(email,password):await api.signIn(email,password);if(!mounted.current||epoch.current!==requestEpoch)return;setPassword('');
   if(!active){setMessage('Compte créé si cette adresse est disponible. Confirmez votre adresse dans le courriel, puis revenez ici pour vous connecter.');return;}
   await api.verify(active);if(!mounted.current||epoch.current!==requestEpoch)return;commitSession(active);setMessage('Compte connecté. Lecture des parties…');
  }catch(error){setPassword('');setMessage(error instanceof Error?error.message:'Connexion refusée.');}finally{working.current=false;setBusy(false);}
  await sync(true);
 };
 const keepLocal=async()=>{
  const active=current.current;if(!active||working.current)return;working.current=true;setBusy(true);const expectedEpoch=epoch.current;
  const guard=()=>{if(!ownerCurrent(active.user.id)||epoch.current!==expectedEpoch)throw new Error('Le compte a changé. Aucune association exécutée.');};
  try{
   const transport=adapter(active),cloud=await transport.pull({accountId:active.user.id});
   guard();if((cloud?.revision??null)!==(observedRemote.current?.revision??null))throw new Error('La copie du compte a changé. Actualisez avant de confirmer à nouveau.');
   const cloudDigest=cloud?await cloudArchiveDigestV71(cloud.snapshot):null;guard();
   const queued=await withArchiveTransferLock(()=>{guard();const local=captureCloudArchiveV71(window.localStorage);if(observedLocal.current!==null&&cloudArchiveIdentityV71(local)!==observedLocal.current)throw new Error('Les parties locales ont changé depuis la prévisualisation. Actualisez avant de confirmer.');if(!cloudArchiveHasTraceV71(local))throw new Error('Aucune partie locale à envoyer.');
    if(cloud)backupRemoteCloudV71(window.localStorage,cloud);
    window.localStorage.setItem(CLOUD_WORKSPACE_OWNER_KEY_V71,active.user.id);if(readCloudWorkspaceOwnerV71(window.localStorage)!==active.user.id)throw new Error('Association du compte non confirmée.');
    queueCloudArchiveV71(window.localStorage,active.user.id,local,{revision:cloud?.revision??null,digest:cloudDigest});
   });if(!queued.acquired)throw new Error(queued.reason);guard();
   const result=await flushCloudOutboxV71(window.localStorage,active.user.id,transport,{isCurrentAccount:()=>ownerCurrent(active.user.id)&&epoch.current===expectedEpoch&&readCloudWorkspaceOwnerV71(window.localStorage)===active.user.id});guard();
   if(result.row){observedRemote.current=result.row;setRemote(result.row);}setChoice(false);setMessage(result.status==='changed-locally'?'Archive transmise ; nouvelles modifications en attente.':'Toutes les parties de cet appareil sont synchronisées avec le compte.');
  }catch(error){setMessage(error instanceof Error?error.message:'Envoi non confirmé.');}finally{working.current=false;setBusy(false);}
 };
 const keepRemote=async()=>{const active=current.current,row=observedRemote.current;if(!active||!row||working.current)return;working.current=true;setBusy(true);const expectedEpoch=epoch.current;try{const fresh=await adapter(active).pull({accountId:active.user.id});if(!ownerCurrent(active.user.id)||epoch.current!==expectedEpoch)throw new Error('Le compte a changé.');if(!fresh||fresh.revision!==row.revision)throw new Error('La copie du compte a changé. Actualisez avant de confirmer.');await restore(fresh);}catch(error){setMessage(error instanceof Error?error.message:'Reprise refusée.');}finally{working.current=false;setBusy(false);}};
 const signOut=async()=>{const active=current.current;if(!active||working.current)return;await sync(true);if(!ownerCurrent(active.user.id))return;working.current=true;setBusy(true);epoch.current++;try{const queued=readCloudOutboxV71(window.localStorage,active.user.id).outbox!==null;commitSession(null);setChoice(false);observedRemote.current=null;setRemote(null);setMessage(queued?'Compte déconnecté. Un transfert attend votre prochaine connexion sur cet appareil ; les parties locales sont conservées.':'Compte déconnecté. Les parties locales et copies de secours sont conservées.');try{await api.signOut(active);}catch{/* offline local logout still stands */}}finally{working.current=false;setBusy(false);}};
 return <><div inert={open}>{children}</div>{open&&<div className={styles.backdrop} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'&&dialog.current){const nodes=[...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')];if(!nodes.length)return;const index=nodes.indexOf(document.activeElement as HTMLElement);if(e.shiftKey&&index<=0){e.preventDefault();nodes.at(-1)?.focus();}else if(!e.shiftKey&&index===nodes.length-1){e.preventDefault();nodes[0]?.focus();}}}}>
  <section ref={dialog} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="cloud-account-title" data-cloud-account-v71>
   <div className={styles.heading}><div><p>ARCHIVES DU CLAN</p><h2 id="cloud-account-title">Compte & sauvegardes</h2></div><button type="button" disabled={busy} onClick={close} aria-label="Fermer le compte">✕</button></div>
   <p>Le même compte permet de reprendre sur mobile et sur ordinateur. Les cinq parties, leurs dix sauvegardes manuelles, deux autos et les annexes THE PIT sont transférées ensemble.</p>
   {!session?<form onSubmit={e=>{e.preventDefault();void authenticate();}}>
    <div className={styles.tabs}><button type="button" disabled={busy} aria-pressed={mode==='login'} onClick={()=>setMode('login')}>Connexion</button><button type="button" disabled={busy} aria-pressed={mode==='signup'} onClick={()=>setMode('signup')}>Créer un compte</button></div>
    <label>Adresse courriel<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/></label>
    <label>Mot de passe<input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={mode==='signup'?8:1} value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/></label>
    <button type="submit" disabled={busy}>{busy?'Connexion…':mode==='signup'?'Créer mon compte':'Se connecter'}</button>
    <small>Vous pouvez utiliser le compte de vos autres jeux connectés à ce service. Votre mot de passe n’est jamais enregistré dans une sauvegarde.</small>
   </form>:<>
    <p className={styles.identity}>{session.user.email}</p>
    <div className={styles.copies}><article><h3>Cet appareil</h3><p>{localSummary}</p></article><article><h3>Le compte</h3><p>{archiveSummary(remote?.snapshot??null)}</p>{remote&&<small>Révision {remote.revision} · {new Date(remote.updatedAt).toLocaleString('fr-FR')}</small>}</article></div>
    {choice&&<div className={styles.confirmation}><p>Ces actions remplacent l’ensemble des parties de la destination. Une copie de secours est conservée sur cet appareil. Fermez les autres fenêtres du jeu.</p><button type="button" disabled={busy} onClick={()=>void keepLocal()}>Confirmer : garder les parties de cet appareil sur le compte</button>{remote&&<button type="button" disabled={busy} onClick={()=>void keepRemote()}>Confirmer : reprendre les parties du compte sur cet appareil</button>}</div>}
    <div className={styles.tabs}><button type="button" disabled={busy} onClick={()=>void sync(true)}>Actualiser la synchronisation</button><button type="button" disabled={busy} onClick={()=>void signOut()}>Se déconnecter</button></div>
   </>}
   <p role="status" className={styles.status}>{message}</p><small>Hors ligne, les parties continuent à se sauvegarder sur l’appareil. Une synchronisation refusée ne supprime jamais la progression locale. Pour transférer une ancienne partie mobile, connectez d’abord ce mobile au compte.</small>
  </section>
 </div>}</>;
}
