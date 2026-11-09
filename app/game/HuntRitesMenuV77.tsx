'use client';
import {useId,useState,useSyncExternalStore} from 'react';
import type {HuntRiteMenuSnapshotV77} from './systems/huntRitesRuntimeV77';
import type {HuntRiteActionV77} from './systems/ritesOfHuntV77';
import styles from './HuntRitesMenuV77.module.css';
import {DEFAULT_HUNT_GAMEPAD_V112,HUNT_GAMEPAD_LABELS_V112,type HuntGamepadButtonsV112} from './systems/huntAccessibilityV112';
const quantity=(value:number)=>value.toLocaleString('fr-FR',{maximumFractionDigits:2});
const mobileQuery='(max-width: 600px)';
const mobileSnapshot=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia(mobileQuery).matches;
const serverMobileSnapshot=()=>false;
const subscribeMobile=(listener:()=>void)=>{
  if(typeof window==='undefined'||typeof window.matchMedia!=='function')return ()=>{};
  const media=window.matchMedia(mobileQuery);media.addEventListener('change',listener);
  return ()=>media.removeEventListener('change',listener);
};
function CompactRiteWorkV77({menu,operation,onClose,descriptionId}:{menu:HuntRiteMenuSnapshotV77;
  operation:NonNullable<HuntRiteMenuSnapshotV77['operation']>;onClose():void;descriptionId:string}){
  const [detailsOpen,setDetailsOpen]=useState(false);
  return <section className={styles.root+' '+styles.workingCompact} data-hunt-rites-v77 data-corpse-id={menu.corpseId}
    data-rite-open-v112="true" data-rite-working-v112="true" data-rite-compact-v112="true" aria-label="Rites sur la proie vaincue">
    <div role="group" aria-label="Geste en cours" data-rite-progress-v112>
      <strong role="status">{operation.label??'Geste en cours'}</strong>
      <span aria-live="off">{Math.round(operation.progress*100)} %
        {operation.secondsRemaining!==undefined&&<> · {quantity(operation.secondsRemaining)} s restantes</>}</span>
      <progress aria-live="off" aria-label={operation.label??'Progression du geste'} max={1} value={operation.progress}/>
    </div>
    <button type="button" className={styles.workInfo} aria-expanded={detailsOpen} aria-controls={descriptionId+'-work-details'}
      onClick={()=>setDetailsOpen(open=>!open)}>Infos</button>
    <button type="button" className={styles.workInterrupt} aria-label="Interrompre le geste" data-rite-action-v112="interrupt" onClick={onClose}>Interrompre</button>
    <div className={styles.workDetails} id={descriptionId+'-work-details'} hidden={!detailsOpen} data-rite-work-details-v112>
      <strong>{menu.label} · intégrité {menu.integrity}/100</strong>
      <p>La chasse continue. Dégâts, action ou éloignement interrompent le geste. Interrompre laisse la partie sur le corps, sans usure de l’outil.</p>
      {operation.secondsTotal!==undefined&&<p>Durée totale : {quantity(operation.secondsTotal)} s.
        {' '}{operation.toolWear?`Usure de ${operation.toolWear} points seulement à la fin.`:'Ce geste n’use pas le Flaying Tool.'}</p>}
      {menu.tool&&<p data-rite-tool-preview-v112>Flaying Tool : {menu.tool.owned?'acquis':'à acquérir'}.
        {menu.tool.condition!==null&&<> État : {quantity(menu.tool.condition)}/100 ; après confirmation : {quantity(operation.toolWear?menu.tool.conditionAfterCompletion??0:menu.tool.condition)}/100.</>}</p>}
      {menu.stock&&<p data-rite-stock-v112>Parties encore sur cette proie : {menu.stock.remaining} / {menu.stock.total}. Chaque partie est unique.</p>}
      {menu.fieldLoad&&<p data-harvest-capacity-v112>Sac : {quantity(menu.fieldLoad.massKg)} / {quantity(menu.fieldLoad.capacityMassKg)} kg
        {' · '}{quantity(menu.fieldLoad.volumeUnits)} / {quantity(menu.fieldLoad.capacityVolumeUnits)} volumes.</p>}
      <p>{menu.witnessCount} témoin{menu.witnessCount===1?'':'s'}. Le dépeçage prépare la peau ; le prélèvement et le trophée principal restent distincts.</p>
    </div>
  </section>;
}
export default function HuntRitesMenuV77({menu,onOpen,onClose,onAction,gamepadButtons=DEFAULT_HUNT_GAMEPAD_V112}:{menu:HuntRiteMenuSnapshotV77|null;gamepadButtons?:HuntGamepadButtonsV112;
  onOpen():void;onClose():void;onAction(action:HuntRiteActionV77):void}){
  const descriptionId=useId();
  const mobile=useSyncExternalStore(subscribeMobile,mobileSnapshot,serverMobileSnapshot);
  if(!menu)return null;
  const analysisReason=!menu.analyzed?menu.analysisLockedReason:null;
  const carryReason=!menu.carrying?menu.carryLockedReason:null;
  const operation=menu.operation;
  if(mobile&&menu.open&&operation)return <CompactRiteWorkV77 key={menu.corpseId+':'+operation.action} menu={menu}
    operation={operation} onClose={onClose} descriptionId={descriptionId}/>;
  return <section className={styles.root} data-hunt-rites-v77 data-corpse-id={menu.corpseId} data-rite-open-v112={menu.open?"true":"false"} data-rite-working-v112={operation?'true':'false'} aria-label="Rites sur la proie vaincue">
    <small>Manette : Bas + {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact]} pour examiner. Haut/Bas pour choisir, {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.jump]} pour activer, {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact]} pour fermer. La chasse continue.</small>
    {!menu.open?<button type="button" onClick={onOpen}>Examiner la proie vaincue</button>:<>
      <header><strong>{menu.label}</strong><button type="button" onClick={onClose} aria-label="Fermer le menu rituel">×</button></header>
      <p className={styles.warning}>La chasse continue. Dégâts, action ou éloignement interrompent le geste. Intégrité : {menu.integrity}/100. Analyse avant le premier prélèvement pour éviter une perte de qualité de 12 points. Chaque partie est unique.</p>
      {menu.worksiteLockedReason&&<p className={styles.warning} data-rite-worksite-v112>{menu.worksiteLockedReason}</p>}
      {menu.tool&&<p className={styles.facts} id={descriptionId+'-tool'} data-rite-tool-preview-v112>
        Flaying Tool : {menu.tool.owned?'acquis':'à acquérir à l’armurerie'}.
        {menu.tool.owned&&menu.tool.condition!==null&&<> État : {quantity(menu.tool.condition)}/100.
          {' '}Après un dépeçage ou prélèvement confirmé : {quantity(menu.tool.conditionAfterCompletion??0)}/100.</>}
        {' '}Usure par geste terminé : {menu.tool.wearPerCompletion} points. Une interruption n’use pas l’outil.
        {menu.tool.owned&&menu.tool.condition===0&&<> Outil émoussé : il reste utilisable, avec un travail plus lent. Affûtage gratuit au poste.</>}
      </p>}
      {menu.stock&&<p className={styles.facts} data-rite-stock-v112>{menu.stock.total>0
        ?`Parties encore sur cette proie : ${menu.stock.remaining} / ${menu.stock.total}. Les prises retirées ne repoussent pas.`
        :'Aucune partie anatomique répertoriée pour cette proie. Le trophée principal suit son propre rite.'}</p>}
      {menu.fieldLoad&&<p data-harvest-capacity-v112>
        Sac : {quantity(menu.fieldLoad.massKg)} / {quantity(menu.fieldLoad.capacityMassKg)} kg
        {' · '}{quantity(menu.fieldLoad.volumeUnits)} / {quantity(menu.fieldLoad.capacityVolumeUnits)} volumes.
        {' '}Disponibles : {quantity(Math.max(0,menu.fieldLoad.capacityMassKg-menu.fieldLoad.massKg))} kg
        {' · '}{quantity(Math.max(0,menu.fieldLoad.capacityVolumeUnits-menu.fieldLoad.volumeUnits))} volumes.
      </p>}
      {analysisReason&&<p id={descriptionId+'-analysis'} data-rite-analysis-reason-v112>Analyse indisponible : {analysisReason}</p>}
      {operation?<div role="group" aria-label="Geste en cours" data-rite-progress-v112>
        <strong role="status">{operation.label??'Geste en cours'}</strong>
        <span aria-live="off">{Math.round(operation.progress*100)} %
          {operation.secondsRemaining!==undefined&&operation.secondsTotal!==undefined&&<> · {quantity(operation.secondsRemaining)} s restantes / {quantity(operation.secondsTotal)} s</>}</span>
        <progress aria-live="off" aria-label={operation.label??'Progression du geste'} max={1} value={operation.progress}/>
        {operation.toolWear!==undefined&&<small>{operation.toolWear>0?`Usure de ${operation.toolWear} points seulement à la fin du geste.`:'Ce geste n’use pas le Flaying Tool.'} Interrompre laisse la partie sur le corps.</small>}
        <button type="button" data-rite-action-v112="interrupt" onClick={onClose}>Interrompre le geste</button>
      </div>:<div className={styles.actions}>
        <button type="button" disabled={!menu.canAnalyze} aria-describedby={analysisReason?descriptionId+'-analysis':undefined} data-rite-action-v112="analyze" onClick={()=>onAction('analyze')}>Analyser · 1,4 s{menu.analyzed?' · fait':''}</button>
        <button type="button" disabled={menu.marked} data-rite-action-v112="mark" onClick={()=>onAction('mark')}>Marquer · 1 s{menu.marked?' · fait':''}</button>
        <button type="button" data-rite-action-v112="leave" onClick={()=>onAction('leave')}>Laisser sur place</button>
        <button type="button" data-rite-action-v112="erase" onClick={()=>onAction('erase')}>Effacer la trace · 1,8 s</button>
        <div className={styles.action}>
          <button type="button" disabled={!menu.canFlay} aria-describedby={descriptionId+'-flay'+(menu.tool?' '+descriptionId+'-tool':'')} title={menu.flayLockedReason??"La chasse continue pendant le dépeçage."} data-rite-action-v112="flay" onClick={()=>onAction('flay')}>Dépecer · {(menu.flaySeconds??3.2).toFixed(1).replace(".",",")} s{menu.flayed?' · fait':''}</button>
          <small id={descriptionId+'-flay'} data-rite-flay-reason-v112>{menu.flayLockedReason??'Prépare la peau ; prélever la partie reste un geste distinct.'}</small>
        </div>
        <div className={styles.action}>
          <button type="button" disabled={!menu.canCarry&&!menu.carrying} aria-describedby={descriptionId+'-carry'} title={menu.carrying?'Dépose le corps sans perte.':carryReason??'Corps de 170 kg maximum ; transport au sol.'} data-rite-action-v112={menu.carrying?'drop':'carry'} onClick={()=>onAction(menu.carrying?'drop':'carry')}>{menu.carrying?'Déposer la carcasse':'Porter la carcasse'} · {menu.massKg} kg</button>
          <small id={descriptionId+'-carry'}>{menu.carrying?'Déposer conserve le corps original et les parties encore présentes.':carryReason??'Transport au sol ; dépose avant saut, escalade ou combat.'}</small>
        </div>
        <div className={styles.action}>
          <button type="button" disabled={!menu.canHang} aria-describedby={descriptionId+'-hang'} title={menu.hangReason||'Attacher au crochet réel libre à portée.'} data-rite-action-v112="hang" onClick={()=>onAction('hang')}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href="/game/ui/v112/field-harvest-symbols.svg#hook"/></svg>Suspendre · 2,5 s</button>
          <small id={descriptionId+'-hang'}>{menu.hangReason||'Crochet libre à portée, assez solide pour le corps porté.'}</small>
        </div>
        {menu.parts.map(part=><div key={part.action}>
          <button type="button" style={{width:'100%'}} disabled={!part.available} aria-describedby={descriptionId+'-'+part.action} title={part.reason||'Prélèvement définitif. La partie ne repousse pas.'} data-rite-action-v112={part.action} onClick={()=>onAction(part.action)}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href={'/game/ui/v112/field-harvest-symbols.svg#'+part.action.slice(8)}/></svg>{part.label} · {part.seconds.toFixed(1).replace('.',',')} s · qualité {part.quality}/100
          </button>
          <small id={descriptionId+'-'+part.action} data-harvest-preview-v112>
            {quantity(part.massKg)} kg · {quantity(part.volumeUnits)} volumes.
            {part.projectedLoad&&<> Après la prise : {quantity(part.projectedLoad.massKg)} / {quantity(part.projectedLoad.capacityMassKg)} kg
              {' · '}{quantity(part.projectedLoad.volumeUnits)} / {quantity(part.projectedLoad.capacityVolumeUnits)} volumes.</>}
            {part.reason&&<> {part.reason}</>}
          </small>
        </div>)}
      </div>}
      <small>{menu.flayLockedReason&&!menu.flayed?`${menu.flayLockedReason} `:'' }{menu.witnessCount} témoin{menu.witnessCount===1?'':'s'} de la mise en scène. Le dépeçage prépare la peau ; le trophée principal et les prélèvements secondaires sont distincts. Saut, escalade ou combat déposent le corps ; le sac conserve ses prises.</small>
    </>}
  </section>;
}
