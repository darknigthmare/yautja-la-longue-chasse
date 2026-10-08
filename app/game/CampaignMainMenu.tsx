"use client";
/* Existing project bitmap is served unchanged in web and packaged desktop builds. */
/* eslint-disable @next/next/no-img-element */
import {useCallback,useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import {useMenuGamepad} from './useMenuGamepad';
import {menuFocusIndex,type MenuDirection} from './systems/menuNavigation';
import styles from './CampaignMainMenu.module.css';
import {openCloudAccountV71} from './CloudAccountV71';
import { MAIN_MENU_MODE_LABELS_V81, type MainMenuGameModeV81 } from './systems/mainMenuModesV81';
import { GAME_CONTENT_VERSION } from './buildInfo';
import { CAMPAIGN_SLOT_IMPORT_MAX_BYTES, type CampaignSlotImportPreview, type CampaignSlotImportPreparation } from './systems/campaignSlots';

export interface CampaignCheckpointView {id:string;kind:'manual'|'auto';index:number;label:string;savedAt:string;hasActiveHunt:boolean;playTimeSeconds:number;resumeLocation?:string}
export interface CampaignSlotView {id:number;status:'empty'|'ready'|'blocked';revision:number;ownerCreatedAt:string|null;hunterName:string|null;checkpoints:readonly CampaignCheckpointView[];lastCheckpointId:string|null;recoveryAvailable?:boolean}
export interface CampaignCatalogView {slots:readonly CampaignSlotView[];activeSlotId:number|null;status?:'ready'|'blocked'|'unavailable';failure?:string|null;workspaceRecoveryAvailable?:boolean}
const time=(seconds:number)=>`${Math.floor(seconds/3600)} h ${Math.floor(seconds%3600/60).toString().padStart(2,'0')}`;
const date=(value:string)=>new Date(value).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
const place=(checkpoint:Pick<CampaignCheckpointView,'hasActiveHunt'|'resumeLocation'>)=>checkpoint.hasActiveHunt?'Chasse suspendue':checkpoint.resumeLocation==='homeworld'?'Yautja Prime':checkpoint.resumeLocation==='prologue'?'Nurserie · prologue':checkpoint.resumeLocation==='youth-training'?'Formation Unblooded':checkpoint.resumeLocation==='game-reserve'?'Réserve de chasse':checkpoint.resumeLocation==='new-game'?'Début de campagne':'Vaisseau';
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
export default function CampaignMainMenu({catalog,busy,message,onRefresh,onCreate,onContinue,onLoad,onRecover,onMausoleum,onReplace,onWorkspaceRecover,onRecoverNew,modeAccess,onOpenGameMode,onOpenClanWar,onOpenSprites,onPrepareImport,onImport}:{
 onMausoleum?:()=>void;
 onOpenClanWar?:()=>void;
 onOpenSprites?:()=>void;
 onPrepareImport?:(slotId:number,serialized:string)=>CampaignSlotImportPreparation;
 onImport?:(preview:CampaignSlotImportPreview)=>void;
 catalog:CampaignCatalogView|null;busy:boolean;message:string|null;onRefresh:()=>void;
 onRecover:(slotId:number)=>void;onCreate:(slotId:number,name:string)=>void;onContinue:(slotId:number)=>void;onLoad:(slotId:number,checkpointId:string,expectedRevision:number)=>void;
 onReplace?:(slotId:number,name:string,expectedRevision:number,expectedOwnerCreatedAt:string)=>void;
 onWorkspaceRecover?:(slotId:number,checkpointId:string,expectedRevision:number)=>void;
 onRecoverNew?:(slotId:number,name:string)=>void;
 modeAccess?:Readonly<Record<MainMenuGameModeV81,boolean>>;
 onOpenGameMode?:(mode:MainMenuGameModeV81,spoilersConfirmed:boolean)=>void;
}){
 const [view,setView]=useState<'main'|'new'|'load'|'import'>('main'),[selected,setSelected]=useState(1),[name,setName]=useState(''),[confirmation,setConfirmation]=useState<{slot:CampaignSlotView;checkpoint:CampaignCheckpointView}|null>(null);
 const [importPreview,setImportPreview]=useState<CampaignSlotImportPreview|null>(null),[importConfirmation,setImportConfirmation]=useState<CampaignSlotImportPreview|null>(null);
 const [importFileName,setImportFileName]=useState(''),[importMessage,setImportMessage]=useState<string|null>(null),[importReading,setImportReading]=useState(false);
 const importReadGeneration=useRef(0),importAlive=useRef(true);
 // Remounting also invalidates a pending read from React's development replay.
 useLayoutEffect(()=>{importReadGeneration.current++;importAlive.current=true;return()=>{importAlive.current=false;};},[]);
 const [replacement,setReplacement]=useState<{slot:CampaignSlotView;name:string;recovery?:boolean}|null>(null);
 const [spoilerMode,setSpoilerMode]=useState<MainMenuGameModeV81|'clan-war'|null>(null);
 const rootRef=useRef<HTMLElement>(null),dialogRef=useRef<HTMLElement>(null),confirmationTriggerRef=useRef<HTMLButtonElement>(null);
 const back=useCallback(()=>{if(busy)return;if(importConfirmation)setImportConfirmation(null);else if(spoilerMode)setSpoilerMode(null);else if(replacement)setReplacement(null);else if(confirmation)setConfirmation(null);else{importReadGeneration.current++;setImportReading(false);setImportPreview(null);setView('main');}},[busy,confirmation,replacement,spoilerMode,importConfirmation]);
 useMenuGamepad(rootRef,true,`${view}:${selected}:${Boolean(confirmation||replacement||spoilerMode||importConfirmation)}:${busy}`,back);
 useLayoutEffect(()=>{
  if(busy)return;
  // Closing a checkpoint dialog returns to its exact originating save, not the menu header.
  const trigger=confirmationTriggerRef.current;
  if(!confirmation&&!replacement&&!spoilerMode&&!importConfirmation&&trigger?.isConnected){confirmationTriggerRef.current=null;trigger.focus();return;}
  const scope=dialogRef.current??rootRef.current;if(scope)controls(scope)[0]?.focus();
 },[view,confirmation,replacement,spoilerMode,importConfirmation,busy]);
 const archivesBlocked=Boolean((catalog?.status&&catalog.status!=='ready')||catalog?.workspaceRecoveryAvailable);
 const canRecoverWorkspace=Boolean(catalog?.workspaceRecoveryAvailable&&onWorkspaceRecover);
 const ready=catalog?.slots.filter(slot=>slot.status==='ready')??[];
 const current=ready.find(slot=>slot.id===catalog?.activeSlotId)??[...ready].sort((a,b)=>Math.max(0,...b.checkpoints.map(c=>Date.parse(c.savedAt)))-Math.max(0,...a.checkpoints.map(c=>Date.parse(c.savedAt))))[0];
 const slot=catalog?.slots.find(slot=>slot.id===selected);
 const canRecoverNew=Boolean(catalog?.workspaceRecoveryAvailable&&ready.length===0&&slot?.status==='empty'&&onRecoverNew);
 const currentCheckpoint=current?.checkpoints.find(checkpoint=>checkpoint.id===current.lastCheckpointId)??current?.checkpoints.toSorted((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt))[0];
 const open=(target:'new'|'load'|'import')=>{importReadGeneration.current++;setImportPreview(null);setImportConfirmation(null);setImportFileName('');setImportMessage(null);setImportReading(false);setConfirmation(null);setView(target);setSelected((target==='new'||target==='import'?catalog?.slots.find(s=>s.status==='empty'):current)?.id??1);};
 const canImport=Boolean(onPrepareImport&&onImport&&!archivesBlocked&&slot?.status==='empty'&&slot.revision===0);
 const readImport=async(input:HTMLInputElement)=>{
  const file=input.files?.[0];input.value='';const request=++importReadGeneration.current;
  setImportPreview(null);setImportConfirmation(null);setImportMessage(null);setImportFileName(file?.name??'');
  if(!file||busy||!canImport||!onPrepareImport)return;
  if(file.size>CAMPAIGN_SLOT_IMPORT_MAX_BYTES){setImportMessage('Fichier trop volumineux : maximum 1 Mio. Aucun stockage modifié.');return;}
  const slotId=selected;setImportReading(true);
  try{const serialized=await file.text();if(!importAlive.current||request!==importReadGeneration.current)return;
   const result=onPrepareImport(slotId,serialized);setImportPreview(result.ok?result.preview:null);setImportMessage(result.message);
  }catch{if(importAlive.current&&request===importReadGeneration.current)setImportMessage('Le fichier ne peut pas être lu. Aucun stockage modifié.');}
  finally{if(importAlive.current&&request===importReadGeneration.current)setImportReading(false);}
 };
 const requestGameMode=useCallback((mode:MainMenuGameModeV81,trigger:HTMLButtonElement)=>{
  if(busy)return;
  if(modeAccess?.[mode])onOpenGameMode?.(mode,false);
  else{confirmationTriggerRef.current=trigger;setSpoilerMode(mode);}
 },[busy,modeAccess,onOpenGameMode]);
 return <main ref={rootRef} className={styles.root} data-campaign-menu={view} data-game-content-version={GAME_CONTENT_VERSION} aria-busy={busy} onKeyDown={event=>navigateKeys(event,dialogRef.current??rootRef.current,back)}>
  <img className={styles.scenery} src="/game/prologue/v47/village.png" alt="" fetchPriority="high" decoding="async" data-campaign-scenery />
  <div className={styles.shell} inert={confirmation!==null||replacement!==null||spoilerMode!==null||importConfirmation!==null}>
   <header className={styles.header}>
    <div className={styles.archiveBar}><p>CHRONIQUES DU CLAN</p><span>5 parties · 10 manuelles + 2 autos par partie</span></div>
    <h1>Yautja<span>La Longue Chasse</span></h1>
   </header>
   {view==='main'?<div className={styles.landing}>
    <section className={styles.primary} aria-label="Menu principal">
     <p className={styles.eyebrow}>Choisissez votre histoire</p>
     <button className={current?styles.featured:undefined} type="button" disabled={busy||!current} onClick={()=>current&&(archivesBlocked?open('load'):onContinue(current.id))}><span className={styles.actionTitle}>Continuer</span><small>{current?`Partie ${current.id} · ${current.hunterName??'Chasseur sans nom'}`:'Aucune campagne à reprendre'}</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
     <button className={!current?styles.featured:undefined} type="button" disabled={busy||!catalog} onClick={()=>open('new')}><span className={styles.actionTitle}>Nouvelle partie</span><small>Commencer le prologue dans la nurserie</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
     {onPrepareImport&&onImport&&<button type="button" disabled={busy||!catalog||archivesBlocked||!catalog.slots.some(item=>item.status==='empty')} data-campaign-import-open onClick={()=>open('import')}><span className={styles.actionTitle}>Importer une campagne JSON</span><small>Archiver dans un emplacement vide, sans changer la campagne active</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>}
     {onOpenGameMode&&<>
      <button className={styles.gameMode} type="button" disabled={busy} data-main-menu-mode="the-pit" data-story-unlocked={modeAccess?.['the-pit']===true} onClick={event=>requestGameMode('the-pit',event.currentTarget)}><span className={styles.actionTitle}>The Pit</span><small>Duels, roster, arènes et chroniques des chasseurs{!modeAccess?.['the-pit']?' · avertissement spoilers':''}</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
      <button className={styles.gameMode} type="button" disabled={busy} data-main-menu-mode="game-reserve" data-story-unlocked={modeAccess?.['game-reserve']===true} onClick={event=>requestGameMode('game-reserve',event.currentTarget)}><span className={styles.actionTitle}>Game Reserve Planet</span><small>Expédition de chasse sur la réserve de Vharuun{!modeAccess?.['game-reserve']?' · avertissement spoilers':''}</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
     </>}
     {onOpenClanWar&&<button className={styles.gameMode} type="button" disabled={busy} onClick={event=>{confirmationTriggerRef.current=event.currentTarget;setSpoilerMode('clan-war');}}><span className={styles.actionTitle}>Guerres des clans</span><small>Exercices libres · formations, canyon et stratégie de Korthas · contient des spoilers</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>}
     {onOpenSprites&&<button type="button" disabled={busy} onClick={onOpenSprites}><span className={styles.actionTitle}>Archives visuelles</span><small>Clans, personnages, faune, vaisseaux et matériaux importés</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>}
     <button type="button" disabled={busy} onClick={openCloudAccountV71}><span className={styles.actionTitle}>Compte & sauvegardes</span><small>Synchroniser mobile et ordinateur</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
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
    <div className={styles.managerHeader}><div><p className={styles.eyebrow}>Archives du clan</p><h2 id="campaign-manager-title">{view==='new'?'Nouvelle partie':view==='import'?'Importer une campagne':'Charger une partie'}</h2></div><button className={styles.backButton} type="button" disabled={busy} onClick={back}>Retour au menu · B</button></div>
    <div className={styles.parties} aria-label="Les cinq parties">{catalog?.slots.map(item=><button type="button" key={item.id} data-campaign-slot={item.id} data-slot-state={item.status} aria-pressed={selected===item.id} disabled={busy||(view==='import'&&(importReading||item.status!=='empty'||archivesBlocked))} onClick={()=>{setSelected(item.id);setImportPreview(null);setImportConfirmation(null);setImportMessage(null);}}><span>PARTIE {String(item.id).padStart(2,'0')}</span><strong>{item.status==='empty'?'Emplacement libre':item.hunterName??'Archive protégée'}</strong><small>{item.status==='blocked'?'Archive protégée':item.status==='empty'?'Nouvelle histoire':`${item.checkpoints.length} / 12 sauvegardes`}</small></button>)}</div>
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
    </div>:view==='import'?<section className={styles.importPanel} aria-labelledby="campaign-import-title" data-campaign-import-panel>
     <p className={styles.eyebrow}>Partie {selected} · emplacement vide seulement</p><h3 id="campaign-import-title">Transférer une campagne existante</h3>
     <p>Fichier JSON exporté par le jeu ou ancienne sauvegarde de campagne, maximum 1 Mio. Le propriétaire et l’histoire du fichier sont conservés. Aucune nouvelle nurserie, acquisition de vaisseau ou campagne active n’est créée.</p>
     <label htmlFor="campaign-import-file">Fichier JSON de campagne</label><input id="campaign-import-file" type="file" accept=".json,application/json" disabled={busy||importReading||!canImport} onChange={event=>{void readImport(event.currentTarget);}} />
     {importFileName&&<p className={styles.inputHelp}>Fichier sélectionné : {importFileName}</p>}
     {(archivesBlocked||!canImport)&&<p className={styles.notice} role="status">Import indisponible : choisissez un emplacement vide et récupérez d’abord les archives protégées. Aucun slot occupé ou futur n’est remplacé.</p>}
     <p role="status" aria-live="polite">{importReading?'Lecture du fichier, sans écriture…':importMessage}</p>
     {importPreview&&<div className={styles.importSummary} data-campaign-import-preview>
      <h4>{importPreview.hunterName||'Chasseur sans nom'} · partie {importPreview.slotId}</h4>
      <dl><dt>Propriétaire d’origine</dt><dd>{importPreview.ownerCreatedAt}</dd><dt>Derniers progrès</dt><dd>{date(importPreview.updatedAt)} · {time(importPreview.playTimeSeconds)}</dd><dt>Lieu de reprise</dt><dd>{place(importPreview)}</dd><dt>Format</dt><dd>{importPreview.sourceFormat==='export-save'?'Export léger du jeu':'Ancienne sauvegarde de campagne'}</dd></dl>
      <p>Un seul checkpoint complet sera ajouté à cet emplacement vide. La campagne courante et toutes ses annexes restent inchangées. Les annexes compatibles déjà présentes sont capturées en lecture seule ; un export léger ne contient pas les annexes d’un autre appareil.</p>
      {importPreview.warnings.map((warning,index)=><p className={styles.notice} key={index}>{warning}</p>)}
      <button type="button" disabled={busy||importReading||!canImport||selected!==importPreview.slotId} data-campaign-import-prepare onClick={event=>{confirmationTriggerRef.current=event.currentTarget;setImportConfirmation(importPreview);}}>Préparer l’import dans la partie {importPreview.slotId}</button>
     </div>}
    </section>:slot?.status==='ready'?<div className={styles.saveArchive}><div className={styles.archiveHeading}><h3>{slot.hunterName} · partie {slot.id}</h3><p>10 sauvegardes manuelles · 2 automatiques</p></div><div className={styles.checkpoints}>{(['manual','auto'] as const).flatMap(kind=>Array.from({length:kind==='manual'?10:2},(_,i)=>{const checkpoint=slot.checkpoints.find(c=>c.kind===kind&&c.index===i+1);return <button type="button" key={`${kind}-${i+1}`} disabled={busy||!checkpoint} data-checkpoint-id={`${kind}-${i+1}`} onClick={event=>{if(checkpoint){confirmationTriggerRef.current=event.currentTarget;setConfirmation({slot,checkpoint});}}}><strong>{kind==='manual'?'Manuelle':'Automatique'} {i+1}</strong>{checkpoint?<><span>{date(checkpoint.savedAt)}</span><small>{place(checkpoint)} · {time(checkpoint.playTimeSeconds)}</small></>:<span>Vide</span>}</button>;}))}</div></div>:<div className={styles.emptyArchive} role="status"><h3>{slot?.status==='blocked'?'Archive protégée':'Aucune sauvegarde'}</h3><p>{slot?.status==='blocked'?'Cette archive est illisible ou provient d’une version plus récente. Aucune tentative ne l’efface.':'Cette partie ne contient aucun checkpoint.'}</p>{slot?.recoveryAvailable&&<button type="button" disabled={busy} onClick={()=>onRecover(slot.id)}>Récupérer la copie de secours de la partie {slot.id}</button>}</div>}
   </section>}
   <footer className={styles.footer}>
    <p className={styles.status} role="status" aria-live="polite">{busy?'Vérification et enregistrement des archives…':message}</p>
    <div className={styles.footerRail}><p>Clavier : flèches, Entrée, Échap · Manette : directions, A, B · Tactile : toucher</p><button type="button" disabled={busy} onClick={onRefresh}>Actualiser les archives</button></div>
    <p className={styles.localNotice}>Sauvegardes locales · synchronisation avec un compte connecté.</p>
   </footer>
  </div>
  {importConfirmation&&<div className={styles.backdrop}><section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="campaign-import-confirm-title" data-campaign-import-confirmation onKeyDown={event=>{if(event.key==='Tab'){const nodes=controls(dialogRef.current!);if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}}}>
   <p className={styles.eyebrow}>Import protégé · emplacement vide</p><h2 id="campaign-import-confirm-title">Archiver dans la partie {importConfirmation.slotId} ?</h2>
   <p><strong>{importConfirmation.hunterName||'Chasseur sans nom'}</strong><br/>Identité conservée : {importConfirmation.ownerCreatedAt}.</p>
   <p>La campagne ne sera pas activée. Aucun emplacement occupé, propriétaire courant, annexe, vaisseau acquis ou étape de prologue ne sera remplacé. Le fichier et l’état du stockage seront vérifiés à nouveau sous verrou navigateur.</p>
   <div className={styles.dialogActions}><button type="button" disabled={busy} onClick={()=>setImportConfirmation(null)}>Annuler l’import</button><button type="button" disabled={busy||!canImport||selected!==importConfirmation.slotId} data-campaign-import-confirm onClick={()=>{if(busy||!canImport||selected!==importConfirmation.slotId)return;const pinned=importConfirmation;setImportConfirmation(null);setImportPreview(null);setImportMessage(null);onImport?.(pinned);}}>Confirmer l’import dans la partie {importConfirmation.slotId}</button></div>
  </section></div>}
  {spoilerMode&&<div className={styles.backdrop}><section ref={dialogRef} className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="game-mode-spoiler-title" aria-describedby="game-mode-spoiler-description" data-main-menu-spoiler={spoilerMode} onKeyDown={event=>{if(event.key==='Tab'){const nodes=controls(dialogRef.current!);if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}}}>
   <p className={styles.eyebrow}>Accès anticipé · spoilers</p><h2 id="game-mode-spoiler-title">Entrer dans {spoilerMode==='clan-war'?'Guerres des clans':MAIN_MENU_MODE_LABELS_V81[spoilerMode]} ?</h2>
   <p id="game-mode-spoiler-description">{spoilerMode==='clan-war'?'Ces exercices sont indépendants des mandats débloqués dans votre histoire.':'Vous n’avez pas encore atteint le palier nécessaire dans votre histoire actuelle.'} Ce mode peut révéler des chasseurs, des lieux, des armes ou des événements que vous n’avez pas encore découverts.</p>
   <p>Voulez-vous continuer malgré les spoilers ? Vous jouerez dans un profil libre local séparé. Votre campagne et ses cinq emplacements restent inchangés ; aucun palier de l’histoire ne sera débloqué.</p>
   <div className={styles.dialogActions}><button type="button" disabled={busy} data-spoiler-cancel onClick={()=>setSpoilerMode(null)}>Revenir au menu</button><button type="button" disabled={busy} data-spoiler-confirm onClick={()=>{const mode=spoilerMode;setSpoilerMode(null);if(mode==='clan-war')onOpenClanWar?.();else onOpenGameMode?.(mode,true);}}>Accéder malgré les spoilers</button></div>
  </section></div>}
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
