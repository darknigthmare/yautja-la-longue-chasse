"use client";

import {useCallback,useRef,useState} from 'react';
import FirstHuntSoloV90 from '../game/FirstHuntSoloV90';
import {DEFAULT_CONTROL_BINDINGS} from '../game/systems/controlBindings';
import type {SoloV90Receipt,SoloV90State} from '../game/systems/firstHuntSoloV90';
import {SOLO_QA_FIXTURES_V92,soloQaAcceptV92,soloQaCheckpointV92} from './fixtures';
import styles from './solo-qa.module.css';

/** The real component owns RAF, keyboard, touch, pause and drawing. This owner
 * keeps accepted state in memory only; no campaign/save service is imported. */
export default function SoloQaV92(){
 const [session,setSession]=useState({fixtureId:SOLO_QA_FIXTURES_V92[0].id,epoch:0,running:true});
 const [soundEnabled,setSoundEnabled]=useState(false),[reducedMotion,setReducedMotion]=useState(false);
 const [status,setStatus]=useState('Fixture synthétique rejouée. Aucune sauvegarde réelle ouverte.'),[acceptedCount,setAcceptedCount]=useState(0);
 const lastAccepted=useRef<SoloV90State|null>(null);
 const fixture=SOLO_QA_FIXTURES_V92.find(item=>item.id===session.fixtureId)??SOLO_QA_FIXTURES_V92[0];
 const checkpoint=fixture.checkpoint;
 const reset=useCallback((id:string)=>{
  if(!soloQaCheckpointV92(id))return;
  lastAccepted.current=null;setAcceptedCount(0);setStatus('Fixture synthétique réinitialisée ; ancien essai local abandonné.');
  setSession(previous=>({fixtureId:id,epoch:previous.epoch+1,running:true}));
 },[]);
 const onCheckpoint=useCallback((state:SoloV90State)=>{
  const accepted=soloQaAcceptV92(state);if(!accepted)return false;
  lastAccepted.current=accepted;setStatus(`État accepté en mémoire · ${accepted.phase} · frame ${accepted.tick}. Aucun fichier écrit.`);return true;
 },[]);
 const onProgress=useCallback(async(receipts:readonly SoloV90Receipt[],state:SoloV90State)=>{
  const accepted=soloQaAcceptV92(state,receipts);if(!accepted)return false;
  lastAccepted.current=accepted;setAcceptedCount(count=>count+receipts.length);
  setStatus(`Étape de scène acceptée en mémoire · ${accepted.phase}. Aucun rang ou progrès global attribué.`);return true;
 },[]);
 const onExit=useCallback(()=>{
  setSession(previous=>({...previous,running:false}));setStatus('Scène QA quittée. Le dernier état reste uniquement en mémoire jusqu’au rechargement ou à la réinitialisation.');
 },[]);
 const onReturnToCity=useCallback(async()=>{
  setSession(previous=>({...previous,running:false}));setStatus('Retour demandé depuis la scène QA. Aucun voyage dans la cité ou écriture de campagne exécuté.');return true;
 },[]);
 return <main className={styles.root} data-local-solo-qa-v92="synthetic-replayed-memory-only">
  <header className={styles.toolbar} aria-label="Scènes synthétiques jouables de revue locale">
   <div className={styles.title}><strong>QA solo V92 · vrai composant jouable</strong><span>Fixtures synthétiques rejouées · mémoire seule · ne prouve pas une campagne achevée</span></div>
   <div className={styles.controls}>
    <label>Point rejoué<select data-solo-qa-fixture value={session.fixtureId} onChange={event=>reset(event.target.value)}>
     {SOLO_QA_FIXTURES_V92.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <button type="button" data-solo-qa-reset onClick={()=>reset(session.fixtureId)}>Réinitialiser / rouvrir</button>
    <label><input type="checkbox" checked={soundEnabled} onChange={event=>setSoundEnabled(event.target.checked)}/>Son</label>
    <label><input type="checkbox" checked={reducedMotion} onChange={event=>setReducedMotion(event.target.checked)}/>Mouvements réduits</label>
   </div>
   <p className={styles.status} role="status" data-solo-qa-status>{status} Reçus de cet essai QA : {acceptedCount}.</p>
  </header>
  <div className={styles.scene} data-solo-qa-renderer="FirstHuntSoloV90" data-solo-qa-source={fixture.sourceFile}>
   {session.running?<FirstHuntSoloV90 key={`${session.fixtureId}:${session.epoch}`} checkpoint={checkpoint} bindings={DEFAULT_CONTROL_BINDINGS}
    soundEnabled={soundEnabled} reducedMotion={reducedMotion} onCheckpoint={onCheckpoint} onProgress={onProgress} onExit={onExit} onReturnToCity={onReturnToCity}/>
    :<section className={styles.closed}><h1>Revue locale interrompue</h1><p>{status}</p><button type="button" onClick={()=>reset(session.fixtureId)}>Rouvrir la fixture source</button></section>}
  </div>
 </main>;
}
