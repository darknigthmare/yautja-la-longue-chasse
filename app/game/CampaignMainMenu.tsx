"use client";
/* Existing project bitmap is served unchanged in web and packaged desktop builds. */
/* eslint-disable @next/next/no-img-element */
import {useCallback,useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import {useMenuGamepad} from './useMenuGamepad';
import {menuFocusIndex,type MenuDirection} from './systems/menuNavigation';
import styles from './CampaignMainMenu.module.css';

export interface CampaignCheckpointView {id:string;kind:'manual'|'auto';index:number;label:string;savedAt:string;hasActiveHunt:boolean;playTimeSeconds:number;resumeLocation?:string}
export interface CampaignSlotView {id:number;status:'empty'|'ready'|'blocked';revision:number;ownerCreatedAt:string|null;hunterName:string|null;checkpoints:readonly CampaignCheckpointView[];lastCheckpointId:string|null;recoveryAvailable?:boolean}
export interface CampaignCatalogView {slots:readonly CampaignSlotView[];activeSlotId:number|null;status?:'ready'|'blocked'|'unavailable';failure?:string|null;workspaceRecoveryAvailable?:boolean}
const time=(seconds:number)=>`${Math.floor(seconds/3600)} h ${Math.floor(seconds%3600/60).toString().padStart(2,'0')}`;
const date=(value:string)=>new Date(value).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
const place=(checkpoint:CampaignCheckpointView)=>checkpoint.hasActiveHunt?'Chasse suspendue':checkpoint.resumeLocation==='homeworld'?'Yautja Prime':checkpoint.resumeLocation==='prologue'?'Nurserie · prologue':checkpoint.resumeLocation==='youth-training'?'Formation Unblooded':checkpoint.resumeLocation==='new-game'?'Début de campagne':'Vaisseau';
const controls=(root:HTMLElement)=>Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')).filter(node=>node.getClientRects().length>0&&!node.closest('[inert]'));
function navigateKeys(event:KeyboardEvent<HTMLElement>,root:HTMLElement|null,onBack:()=>void){
 if(event.defaultPrevented||event.repeat||!root)return;
 if(event.key==='Escape'){event.preventDefault();onBack();return;}
 const direction=({ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'} as const)[event.key as 'ArrowLeft'];
 if(!direction||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;
 event.preventDefault();const nodes=controls(root),active=document.activeElement as HTMLElement;
 const next=menuFocusIndex(nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};}),nodes.indexOf(active),direction as MenuDirection);
 nodes[next]?.focus();
}
export default function CampaignMainMenu({catalog,busy,message,onRefresh,onCreate,onContinue,onLoad,onRecover,onMausoleum,onReplace,onWorkspaceRecover,onRecoverNew}:{
 onMausoleum?:()=>void;
 catalog:CampaignCatalogView|null;busy:boolean;message:string|null;onRefresh:()=>void;
 onRecover:(slotId:number)=>void;onCreate:(slotId:number,name:string)=>void;onContinue:(slotId:number)=>void;onLoad:(slotId:number,checkpointId:string,expectedRevision:number)=>void;
 onReplace?:(slotId:number,name:string,expectedRevision:number,expectedOwnerCreatedAt:string)=>void;
 onWorkspaceRecover?:(slotId:number,checkpointId:string,expectedRevision:number)=>void;
 onRecoverNew?:(slotId:number,name:string)=>void;
}){
 const [view,setView]=useState<'main'|'new'|'load'>('main'),[selected,setSelected]=useState(1),[name,setName]=useState(''),[confirmation,setConfirmation]=useState<{slot:CampaignSlotView;checkpoint:CampaignCheckpointView}|null>(null);
 const [replacement,setReplacement]=useState<{slot:CampaignSlotView;name:string;recovery?:boolean}|null>(null);
 const rootRef=useRef<HTMLElement>(null),dialogRef=useRef<HTMLElement>(null),confirmationTriggerRef=useRef<HTMLButtonElement>(null);
 const back=useCallback(()=>{if(busy)return;if(replacement)setReplacement(null);else if(confirmation)setConfirmation(null);else setView('main');},[busy,confirmation,replacement]);
 useMenuGamepad(rootRef,true,`${view}:${selected}:${Boolean(confirmation||replacement)}:${busy}`,back);
 useLayoutEffect(()=>{
  if(busy)return;
  // Closing a checkpoint dialog returns to its exact originating save, not the menu header.
  const trigger=confirmationTriggerRef.current;
  if(!confirmation&&!replacement&&trigger?.isConnected){confirmationTriggerRef.current=null;trigger.focus();return;}
  const scope=dialogRef.current??rootRef.current;if(scope)controls(scope)[0]?.focus();
 },[view,confirmation,replacement,busy]);
 const archivesBlocked=Boolean((catalog?.status&&catalog.status!=='ready')||catalog?.workspaceRecoveryAvailable);
 const canRecoverWorkspace=Boolean(catalog?.workspaceRecoveryAvailable&&onWorkspaceRecover);
 const ready=catalog?.slots.filter(slot=>slot.status==='ready')??[];
 const current=ready.find(slot=>slot.id===catalog?.activeSlotId)??[...ready].sort((a,b)=>Math.max(0,...b.checkpoints.map(c=>Date.parse(c.savedAt)))-Math.max(0,...a.checkpoints.map(c=>Date.parse(c.savedAt))))[0];
 const slot=catalog?.slots.find(slot=>slot.id===selected);
 const canRecoverNew=Boolean(catalog?.workspaceRecoveryAvailable&&ready.length===0&&slot?.status==='empty'&&onRecoverNew);
 const currentCheckpoint=current?.checkpoints.find(checkpoint=>checkpoint.id===current.lastCheckpointId)??current?.checkpoints.toSorted((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt))[0];
 const open=(target:'new'|'load')=>{setConfirmation(null);setView(target);setSelected((target==='new'?catalog?.slots.find(s=>s.status==='empty'):current)?.id??1);};
 return <main ref={rootRef} className={styles.root} data-campaign-menu={view} aria-busy={busy} onKeyDown={event=>navigateKeys(event,dialogRef.current??rootRef.current,back)}>
  <img className={styles.scenery} src="/game/prologue/v47/village.png" alt="" fetchPriority="high" decoding="async" data-campaign-scenery />
  <div className={styles.shell} inert={confirmation!==null||replacement!==null}>
   <header className={styles.header}>
    <div className={styles.archiveBar}><p>CHRONIQUES DU CLAN</p><span>5 parties · 10 manuelles + 2 autos par partie</span></div>
    <h1>Yautja<span>La Longue Chasse</span></h1>
   </header>
   {view==='main'?<div className={styles.landing}>
    <section className={styles.primary} aria-label="Menu principal">
     <p className={styles.eyebrow}>Choisissez votre histoire</p>
     <button className={current?styles.featured:undefined} type="button" disabled={busy||!current} onClick={()=>current&&(archivesBlocked?open('load'):onContinue(current.id))}><span className={styles.actionTitle}>Continuer</span><small>{current?`Partie ${current.id} · ${current.hunterName??'Chasseur sans nom'}`:'Aucune campagne à reprendre'}</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
     <button className={!current?styles.featured:undefined} type="button" disabled={busy||!catalog} onClick={()=>open('new')}><span className={styles.actionTitle}>Nouvelle partie</span><small>Commencer le prologue dans la nurserie</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
     {onMausoleum&&<button type="button" disabled={busy} onClick={onMausoleum}><span className={styles.actionTitle}>DLC / Chroniques de chasse</span><small>Visiter le Mausolée des Grandes Chasses</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>}
     <button type="button" disabled={busy||!catalog||!catalog.slots.some(s=>s.status!=='empty')} onClick={()=>open('load')}><span className={styles.actionTitle}>Charger une partie</span><small>Retrouver une campagne et ses sauvegardes</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
     {catalog?.slots.every(s=>s.status!=='empty')&&<p className={styles.notice}>Les cinq emplacements sont occupés ou protégés. Nouvelle partie permet de choisir une campagne à remplacer, uniquement après confirmation.</p>}
    </section>
    <aside className={styles.sceneCaption} aria-label={current?'Campagne à reprendre':'Début de la chronique'}>
     <p className={styles.eyebrow}>{current?'Votre chronique':'Prologue · Yautja Prime'}</p>
     <h2>{current?current.hunterName??'Chasseur sans nom':'Avant la première chasse'}</h2>
     {current?<><p>{currentCheckpoint?place(currentCheckpoint):'Campagne enregistrée'}</p>{currentCheckpoint&&<p className={styles.checkpointSummary}>Partie {current.id} · {time(currentCheckpoint.playTimeSeconds)}<br/>Dernière sauvegarde : {date(currentCheckpoint.savedAt)}</p>}</>:<p>La nurserie, les premiers liens du clan.<br/>C’est ici que commence votre histoire.</p>}
    </aside>
   </div>:<section className={styles.manager} aria-labelledby="campaign-manager-title">
    <div className={styles.managerHeader}><div><p className={styles.eyebrow}>Archives du clan</p><h2 id="campaign-manager-title">{view==='new'?'Nouvelle partie':'Charger une partie'}</h2></div><button className={styles.backButton} type="button" disabled={busy} onClick={back}>Retour au menu · B</button></div>
    <div className={styles.parties} aria-label="Les cinq parties">{catalog?.slots.map(item=><button type="button" key={item.id} data-campaign-slot={item.id} data-slot-state={item.status} aria-pressed={selected===item.id} disabled={busy} onClick={()=>setSelected(item.id)}><span>PARTIE {String(item.id).padStart(2,'0')}</span><strong>{item.status==='empty'?'Emplacement libre':item.hunterName??'Archive protégée'}</strong><small>{item.status==='blocked'?'Archive protégée':item.status==='empty'?'Nouvelle histoire':`${item.checkpoints.length} / 12 sauvegardes`}</small></button>)}</div>
    {view==='new'?<div className={styles.newGame}>
     <figure className={styles.prologuePreview}><img src="/game/prologue/v47/arena.png" alt="" decoding="async" /><figcaption><span>PROLOGUE</span><h3>La nurserie du clan</h3><p>Grandissez sur Yautja Prime : accueil Unblooded, dojo, camp, reconnaissance et patrouille du désert. La petite Fosse propose ensuite un duel de novices facultatif.</p></figcaption></figure>
     <form className={styles.creationPanel} onSubmit={event=>{event.preventDefault();if(busy||archivesBlocked)return;if(slot?.status==='empty')onCreate(slot.id,name.trim());else if(slot?.status==='ready'&&onReplace){confirmationTriggerRef.current=event.currentTarget.querySelector('button[type=submit]');setReplacement({slot,name:name.trim()});}}}>
      <p className={styles.eyebrow}>Partie {slot?.id} · {slot?.status==='empty'?'Emplacement libre':'Emplacement protégé'}</p>
      <h3>Une nouvelle chronique</h3>
      <label htmlFor="campaign-hunter-name">Nom du chasseur</label><input id="campaign-hunter-name" aria-describedby="campaign-name-help" maxLength={48} value={name} onChange={event=>setName(event.target.value)} disabled={busy} autoComplete="off" placeholder="Chasseur sans nom" />
      <p id="campaign-name-help" className={styles.inputHelp}>Facultatif · vous commencez dans la nurserie, sans vaisseau personnel.</p>
      <button className={styles.featured} type="submit" disabled={busy||archivesBlocked||!slot||slot.status==='blocked'||(slot.status==='ready'&&!onReplace)}>{slot?.status==='ready'?`Remplacer la partie ${slot.id}…`:`Créer la partie ${slot?.id} et commencer le prologue`}</button>
      {canRecoverNew&&<button type="button" disabled={busy} onClick={event=>{confirmationTriggerRef.current=event.currentTarget;setReplacement({slot:slot!,name:name.trim(),recovery:true});}}>Conserver les données endommagées et repartir…</button>}
      {slot?.status==='ready'&&<p className={styles.notice}>Cette campagne contient déjà {slot.checkpoints.length} sauvegarde(s). Le remplacement demande une confirmation explicite et conserve une archive de secours complète.</p>}
      {(archivesBlocked||slot?.status==='blocked')&&<p className={styles.notice} role="status">Archives protégées : aucune création ni suppression. Consultez les sauvegardes lisibles dans « Charger une partie ». Une version future reste intacte ; une archive corrompue nécessite une récupération explicite.</p>}
     </form>
    </div>:slot?.status==='ready'?<div className={styles.saveArchive}><div className={styles.archiveHeading}><h3>{slot.hunterName} · partie {slot.id}</h3><p>10 sauvegardes manuelles · 2 automatiques</p></div><div className={styles.checkpoints}>{(['manual','auto'] as const).flatMap(kind=>Array.from({length:kind==='manual'?10:2},(_,i)=>{const checkpoint=slot.checkpoints.find(c=>c.kind===kind&&c.index===i+1);return <button type="button" key={`${kind}-${i+1}`} disabled={busy||!checkpoint} data-checkpoint-id={`${kind}-${i+1}`} onClick={event=>{if(checkpoint){confirmationTriggerRef.current=event.currentTarget;setConfirmation({slot,checkpoint});}}}><strong>{kind==='manual'?'Manuelle':'Automatique'} {i+1}</strong>{checkpoint?<><span>{date(checkpoint.savedAt)}</span><small>{place(checkpoint)} · {time(checkpoint.playTimeSeconds)}</small></>:<span>Vide</span>}</button>;}))}</div></div>:<div className={styles.emptyArchive} role="status"><h3>{slot?.status==='blocked'?'Archive protégée':'Aucune sauvegarde'}</h3><p>{slot?.status==='blocked'?'Cette archive est illisible ou provient d’une version plus récente. Aucune tentative ne l’efface.':'Cette partie ne contient aucun checkpoint.'}</p>{slot?.recoveryAvailable&&<button type="button" disabled={busy} onClick={()=>onRecover(slot.id)}>Récupérer la copie de secours de la partie {slot.id}</button>}</div>}
   </section>}
   <footer className={styles.footer}>
    <p className={styles.status} role="status" aria-live="polite">{busy?'Vérification et enregistrement des archives…':message}</p>
    <div className={styles.footerRail}><p>Clavier : flèches, Entrée, Échap · Manette : directions, A, B · Tactile : toucher</p><button type="button" disabled={busy} onClick={onRefresh}>Actualiser les archives</button></div>
    <p className={styles.localNotice}>Sauvegardes locales à cet appareil · aucun envoi automatique.</p>
   </footer>
  </div>
  {replacement&&<div className={styles.backdrop}><section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="campaign-replace-title" onKeyDown={event=>{if(event.key==='Tab'){const nodes=controls(dialogRef.current!);if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}}}>
   <p className={styles.eyebrow}>{replacement.recovery?'Récupération des archives':'Remplacement d’une campagne'}</p><h2 id="campaign-replace-title">{replacement.recovery?`Repartir dans la partie ${replacement.slot.id} ?`:`Remplacer la partie ${replacement.slot.id} ?`}</h2>
   <p>{replacement.recovery?'Aucune campagne lisible. Emplacement libre':<strong>{replacement.slot.hunterName||'Chasseur sans nom'}</strong>} · partie {replacement.slot.id} · {replacement.slot.checkpoints.length} sauvegarde(s).</p>
   <p>{replacement.recovery?'Les données de travail endommagées seront conservées exactement dans une archive brute de secours. Elles ne seront pas utilisées pour cette nouvelle partie et leurs progrès ne peuvent pas être reconstruits automatiquement. Aucun slot occupé ni aucune version future ne sera écrasé.':'Cette campagne et ses dix emplacements manuels / deux autos ne seront plus accessibles dans cet emplacement.'} Une nouvelle chronique « {replacement.name||'Chasseur sans nom'} » commencera dans la nurserie. Une archive de secours complète restera conservée sur cet appareil ; elle ne sera pas effacée par les futures autosauvegardes.</p>
   <p>Si l’écriture ou le contrôle de version échoue, le remplacement est annulé. Aucun autre emplacement de campagne ne sera remplacé.</p>
   {message&&<p role="status">{message}</p>}
   <div className={styles.dialogActions}><button type="button" disabled={busy} onClick={()=>setReplacement(null)}>Annuler</button><button type="button" disabled={busy||(archivesBlocked&&!replacement.recovery)} onClick={()=>replacement.recovery?onRecoverNew?.(replacement.slot.id,replacement.name):onReplace?.(replacement.slot.id,replacement.name,replacement.slot.revision,replacement.slot.ownerCreatedAt!)}>{replacement.recovery?'Confirmer la nouvelle chronique protégée':`Confirmer le remplacement de la partie ${replacement.slot.id}`}</button></div>
  </section></div>}
  {confirmation&&<div className={styles.backdrop}><section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="checkpoint-confirm-title" onKeyDown={event=>{if(event.key==='Tab'){const nodes=controls(dialogRef.current!);if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}}}><p className={styles.eyebrow}>Archives du clan</p><h2 id="checkpoint-confirm-title">{canRecoverWorkspace?'Récupérer depuis ce checkpoint ?':'Charger ce checkpoint ?'}</h2><p>Partie {confirmation.slot.id} · {confirmation.slot.hunterName}<br/>{confirmation.checkpoint.label} · {date(confirmation.checkpoint.savedAt)}</p>
   <p>{canRecoverWorkspace?'La campagne courante est endommagée. Ses données brutes seront conservées dans une archive de secours séparée avant la restauration de ce checkpoint. Les progrès postérieurs au checkpoint ne seront pas repris.':archivesBlocked?'Le stockage courant est protégé. Les sauvegardes restent consultables mais ne peuvent pas remplacer une version future ou un stockage inaccessible.':'L’état actuel sera conservé automatiquement avant le chargement. Le chargement sera refusé si cette sauvegarde ne peut pas être confirmée.'}</p>
   {message&&<p role="status">{message}</p>}<div className={styles.dialogActions}><button type="button" disabled={busy} onClick={()=>setConfirmation(null)}>Annuler</button><button type="button" disabled={busy||(archivesBlocked&&!canRecoverWorkspace)} onClick={()=>canRecoverWorkspace?onWorkspaceRecover?.(confirmation.slot.id,confirmation.checkpoint.id,confirmation.slot.revision):onLoad(confirmation.slot.id,confirmation.checkpoint.id,confirmation.slot.revision)}>{canRecoverWorkspace?'Confirmer la récupération':'Confirmer le chargement'}</button></div></section></div>}
 </main>;
}

export function CampaignSavePanel({slot,busy,message,onSave,onMainMenu,disabledReason}:{slot:CampaignSlotView|null;busy:boolean;message:string|null;onSave:(index:number,expectedRevision:number)=>void;onMainMenu:()=>void;disabledReason?:string|null}){
 const [replace,setReplace]=useState<{index:number;expectedRevision:number}|null>(null);
 const replacementTriggerRef=useRef<HTMLButtonElement>(null),cancelReplacementRef=useRef<HTMLButtonElement>(null);
 useLayoutEffect(()=>{
  if(replace!==null){cancelReplacementRef.current?.focus();return;}
  const trigger=replacementTriggerRef.current;replacementTriggerRef.current=null;
  if(trigger?.isConnected)trigger.focus();
 },[replace]);
 return <section className={styles.savePanel} aria-labelledby="campaign-save-title" data-campaign-save-panel>
  <h3 id="campaign-save-title">Partie {slot?.id} · Sauvegardes</h3><p>Dix checkpoints manuels et deux automatiques alternées. Les données incluent la campagne et ses annexes ; une chasse reprend au dernier checkpoint confirmé.</p>
  {disabledReason&&<p role="status">{disabledReason}</p>}
  <div className={styles.manuals}>{Array.from({length:10},(_,i)=>{const index=i+1,checkpoint=slot?.checkpoints.find(c=>c.kind==='manual'&&c.index===index);return <button type="button" key={index} disabled={busy||!slot||Boolean(disabledReason)} data-manual-save={index} onClick={event=>{if(checkpoint){replacementTriggerRef.current=event.currentTarget;setReplace({index,expectedRevision:slot!.revision});}else onSave(index,slot!.revision);}}><strong>Manuelle {index}</strong><small>{checkpoint?date(checkpoint.savedAt):'Vide · sauvegarder ici'}</small></button>;})}</div>
  {replace!==null&&<div className={styles.confirmInline} role="group" aria-label="Confirmation du remplacement manuel" onKeyDown={event=>{if(event.key==='Escape'&&!busy){event.preventDefault();event.stopPropagation();setReplace(null);}}}><p>Remplacer la sauvegarde manuelle {replace.index} de cette partie ? Les onze autres emplacements restent inchangés.</p><button ref={cancelReplacementRef} type="button" disabled={busy} onClick={()=>setReplace(null)}>Annuler le remplacement</button><button type="button" disabled={busy||Boolean(disabledReason)} onClick={()=>{onSave(replace.index,replace.expectedRevision);setReplace(null);}}>Confirmer le remplacement manuel {replace.index}</button></div>}
  <p>Autos : {[1,2].map(index=>{const checkpoint=slot?.checkpoints.find(c=>c.kind==='auto'&&c.index===index);return `${index} · ${checkpoint?date(checkpoint.savedAt):'vide'}`;}).join(' / ')}</p>
  {message&&<p role="status">{message}</p>}<button type="button" disabled={busy||Boolean(disabledReason)} onClick={onMainMenu}>Sauvegarder et revenir au menu principal</button>
 </section>;
}
