'use client';
import type {HuntRiteMenuSnapshotV77} from './systems/huntRitesRuntimeV77';
import type {HuntRiteActionV77} from './systems/ritesOfHuntV77';
import styles from './HuntRitesMenuV77.module.css';
import {DEFAULT_HUNT_GAMEPAD_V112,HUNT_GAMEPAD_LABELS_V112,type HuntGamepadButtonsV112} from './systems/huntAccessibilityV112';
export default function HuntRitesMenuV77({menu,onOpen,onClose,onAction,gamepadButtons=DEFAULT_HUNT_GAMEPAD_V112}:{menu:HuntRiteMenuSnapshotV77|null;gamepadButtons?:HuntGamepadButtonsV112;
  onOpen():void;onClose():void;onAction(action:HuntRiteActionV77):void}){
  if(!menu)return null;
  return <section className={styles.root} data-hunt-rites-v77 data-corpse-id={menu.corpseId} data-rite-open-v112={menu.open?"true":"false"} aria-label="Rites sur la proie vaincue">
    <small>Manette : Bas + {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact]} pour examiner. Haut/Bas pour choisir, {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.jump]} pour activer, {HUNT_GAMEPAD_LABELS_V112[gamepadButtons.interact]} pour fermer. La chasse continue.</small>
    {!menu.open?<button type="button" onClick={onOpen}>Examiner la proie vaincue</button>:<>
      <header><strong>{menu.label}</strong><button type="button" onClick={onClose} aria-label="Fermer le menu rituel">×</button></header>
      <p className={styles.warning}>La chasse continue. Dégâts, action ou éloignement interrompent le geste. Intégrité : {menu.integrity}/100. Analyse avant le premier prélèvement pour éviter une perte de qualité de 12 points. Chaque partie est unique.</p>
      {menu.operation?<div role="status"><span>Geste en cours · {Math.round(menu.operation.progress*100)} %</span><progress max={1} value={menu.operation.progress}/><button type="button" data-rite-action-v112="interrupt" onClick={onClose}>Interrompre le geste</button></div>:<div className={styles.actions}>
        <button type="button" disabled={menu.analyzed} data-rite-action-v112="analyze" onClick={()=>onAction('analyze')}>Analyser · 1,4 s{menu.analyzed?' · fait':''}</button>
        <button type="button" disabled={menu.marked} data-rite-action-v112="mark" onClick={()=>onAction('mark')}>Marquer · 1 s{menu.marked?' · fait':''}</button>
        <button type="button" data-rite-action-v112="leave" onClick={()=>onAction('leave')}>Laisser sur place</button>
        <button type="button" data-rite-action-v112="erase" onClick={()=>onAction('erase')}>Effacer la trace · 1,8 s</button>
        <button type="button" disabled={!menu.canFlay} title={menu.flayLockedReason??"La chasse continue pendant le dépeçage."} data-rite-action-v112="flay" onClick={()=>onAction('flay')}>Dépecer · {(menu.flaySeconds??3.2).toFixed(1).replace(".",",")} s{menu.flayed?' · fait':''}</button>
        <button type="button" disabled={!menu.canCarry&&!menu.carrying} title={menu.carrying?'Dépose le corps sans perte.':'Dépecer d’abord. Corps de 170 kg maximum ; transport au sol.'} data-rite-action-v112={menu.carrying?'drop':'carry'} onClick={()=>onAction(menu.carrying?'drop':'carry')}>{menu.carrying?'Déposer la carcasse':'Porter la carcasse'} · {menu.massKg} kg</button>
        <button type="button" disabled={!menu.canHang} title={menu.hangReason||'Attacher au crochet réel libre à portée.'} data-rite-action-v112="hang" onClick={()=>onAction('hang')}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href="/game/ui/v112/field-harvest-symbols.svg#hook"/></svg>Suspendre · 2,5 s</button>
        {menu.parts.map(part=><button type="button" key={part.action} disabled={!part.available} title={part.reason||'Prélèvement définitif. La partie ne repousse pas.'} data-rite-action-v112={part.action} onClick={()=>onAction(part.action)}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href={'/game/ui/v112/field-harvest-symbols.svg#'+part.action.slice(8)}/></svg>{part.label} · {part.seconds.toFixed(1)} s · qualité {part.quality}/100{part.reason?' · '+part.reason:''}
        </button>)}
      </div>}
      <small>{menu.flayLockedReason&&!menu.flayed?`${menu.flayLockedReason} `:'' }{menu.witnessCount} témoin{menu.witnessCount===1?'':'s'} de la mise en scène. Le dépeçage prépare la peau ; le trophée principal et les prélèvements secondaires sont distincts. Saut, escalade ou combat déposent le corps ; le sac conserve ses prises.</small>
    </>}
  </section>;
}
