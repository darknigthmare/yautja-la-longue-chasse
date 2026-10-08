"use client";

/* eslint-disable @next/next/no-img-element -- existing native ship catalogue artwork */
import {useEffect, useRef, useState} from 'react';
import type {HunterAppearance, Loadout} from './types';
import HunterRigPreview from './HunterRigPreview';
import YautjaTranslationV67 from './YautjaTranslationV67';
import {shipProfileAssetPath} from './shipCatalogue';
import {
  SHIP_ACQUISITION_BINDING_V89 as binding, SHIP_ACQUISITION_LINES_V89,
  evaluateShipAcquisitionV89, canShipAcquisitionActionV89, dispatchShipAcquisitionUIActionV89,
  shipAcquisitionKeyboardActionV89, type ShipAcquisitionActionV89, type ShipAcquisitionContextV89,
  type ShipAcquisitionResultV89, type ShipAcquisitionStateV89,
} from './systems/shipAcquisitionV89';
import styles from './ShipAcquisitionV89.module.css';

export interface ShipAcquisitionControlledV89 {
  state: ShipAcquisitionStateV89 | null;
  context: ShipAcquisitionContextV89;
  /** The root reads latest owner/context and confirms durable storage BEFORE
   * returning accepted/changed. Failed writes keep state and stage unchanged. */
  onAction: (action: ShipAcquisitionActionV89) => ShipAcquisitionResultV89;
}
export default function ShipAcquisitionV89({controlled, appearance, loadout, onExit, onOpenSettings}: {
  controlled: ShipAcquisitionControlledV89; appearance: HunterAppearance; loadout: Loadout; onExit?: () => void; onOpenSettings?: () => void;
}) {
  const e = evaluateShipAcquisitionV89(controlled.state, controlled.context), state = e.state;
  const viewport = useRef<HTMLDivElement | null>(null);
  const [feedback, setFeedback] = useState<{owner: string; text: string} | null>(null);
  const owner = controlled.context.save.createdAt;
  const actorX = state?.actor.x;
  useEffect(() => {
    const element = viewport.current;
    if (!element || actorX === undefined) return;
    const target = Math.max(0, Math.min(binding.worldWidth - element.clientWidth, actorX - element.clientWidth * .4));
    element.scrollLeft = target;
  }, [actorX]);
  const run = (action: ShipAcquisitionActionV89) => {
    const result = dispatchShipAcquisitionUIActionV89(e, action, controlled.onAction);
    setFeedback({owner, text: result.message});
  };
  const command = (action: ShipAcquisitionActionV89, label: string) =>
    <button type="button" disabled={!canShipAcquisitionActionV89(e, action)} onClick={() => run(action)}>{label}</button>;
  const hostAppearance: HunterAppearance = {...appearance, presetId: 'custom', biomaskId: null,
    skinId: 'ashen-mottle', armorTintId: 'bronze'};
  const lastLineId = state?.presentedLineIds.at(-1);
  const lastLine = SHIP_ACQUISITION_LINES_V89.find(item => item.id === lastLineId);
  const status = feedback?.owner === owner ? feedback.text : e.message;
  const phaseLabels = {inspection: 'Inspection du candidat', deferred: 'Démarche différée',
    'awaiting-rights': 'Rapport et droits à vérifier', 'rights-issued': 'Droits remis · entrée attendue', entered: 'Acquisition constatée'};
  const candidateVisible = controlled.context.candidate?.present &&
    controlled.context.candidate.siteId === binding.siteId && controlled.context.candidate.id === binding.candidateId && controlled.context.candidate.shipId === binding.shipId;
  return <section className={styles.screen} data-ship-acquisition="v89" aria-label="Chantier de campagne · Une coque vraiment acquise">
    <header className={styles.hud}>
      <div><p>CHANTIER · R2-M021</p><h2>Une coque vraiment acquise</h2><span>{phaseLabels[e.phase]}</span></div>
      <dl><div><dt>Coque</dt><dd>{state?.checks.hull ? 'Inspectée' : 'À inspecter'}</dd></div>
        <div><dt>Sas</dt><dd>{state?.latch.verified ? 'Test vérifié' : state?.latch.faultObserved ? 'Réglage nécessaire' : 'À éprouver'}</dd></div>
        <div><dt>Droits</dt><dd>{state?.authorityReceipt ? 'Remis' : 'Non remis'}</dd></div></dl>
      {onOpenSettings && <button type="button" disabled={e.paused} onClick={onOpenSettings}>Réglages</button>}
      {onExit && <button type="button" disabled={e.paused} onClick={onExit}>Quitter le chantier</button>}
    </header>
    {e.paused && <p className={styles.pause} role="status">Chantier suspendu. Aucune commande, démarche ou remise ne progresse.</p>}
    <div className={styles.layout}>
      <div className={styles.play}>
        <div ref={viewport} className={styles.viewport} tabIndex={0} role="group"
          aria-label="Déplacement physique dans le hangar" aria-describedby="ship-acquisition-help-v89"
          onKeyDown={event => {
            const target = event.target as HTMLElement;
            const action = shipAcquisitionKeyboardActionV89(event.key, {
              active: e.writable && !state?.deferred, focusedInside: event.currentTarget.contains(document.activeElement),
              suspended: e.paused, controlTarget: !!target.closest('button,input,select,textarea,a,[contenteditable="true"]'),
              defaultPrevented: event.defaultPrevented,
            });
            if (!action) return;
            event.preventDefault(); event.stopPropagation(); run(action);
          }}>
          <div className={styles.world} style={{width: binding.worldWidth}}>
            <div className={styles.bay} aria-hidden="true" />
            {candidateVisible && <img className={styles.hull} src={shipProfileAssetPath(binding.shipId)}
              alt="Coque candidate sur ses supports de chantier, encore distincte d’une acquisition" draggable={false} />}
            <div className={styles.supports} aria-hidden="true"><i /><i /><i /></div>
            <div className={styles.floor} aria-hidden="true" />
            {Object.entries(binding.posts).map(([id, x]) => <div key={id} className={styles.marker}
              style={{left: x}} data-near={e.near === id}><span>{id === 'responsible' ? 'RESPONSABLE' :
                id === 'hull' ? 'COQUE' : id === 'load' ? 'SUPPORTS DE CHARGE' : 'SAS ET ATTACHE'}</span><i /></div>)}
            <div className={styles.sas} style={{left: binding.gateX}} data-open={!!state?.authorityReceipt} aria-label={state?.authorityReceipt ? 'Sas disponible après remise des droits' : 'Sas fermé avant remise des droits'}><i /><i /></div>
            <div className={styles.interior} style={{left: binding.entryX}}><span>SEUIL INTÉRIEUR</span></div>
            {e.hostAvailable && <div className={styles.host} style={{left: binding.posts.responsible}}>
              <HunterRigPreview appearance={hostAppearance} armorId="scout" weaponIds={[]} gearIds={[]} size={134}
                label="Responsable du chantier · interprétation visuelle originale, sans arme" facing={1} />
            </div>}
            {state && <div className={styles.actor} style={{left: state.actor.x}} data-actor-x={state.actor.x}>
              <HunterRigPreview appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds}
                gearIds={loadout.gearIds} size={146} label="Chasseur présent dans le hangar"
                facing={state.actor.facing} phase={state.actor.steps * .5} />
            </div>}
          </div>
        </div>
        <div className={styles.movement} role="group" aria-label="Marcher dans le chantier">
          {command({kind: 'walk', direction: -1}, 'Marcher à gauche')}
          {command({kind: 'walk', direction: 1}, 'Marcher à droite')}
        </div>
        <p id="ship-acquisition-help-v89" className={styles.help}>Cliquez ou focalisez le hangar puis utilisez les flèches gauche/droite. Les boutons marchent aussi au clavier et au toucher. Les gestes exigent le poste proche ; aucune interface ne téléporte le chasseur.</p>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
      </div>
      <aside className={styles.work} aria-label="Gestes au poste physiquement proche">
        <h3>{e.near === 'responsible' ? 'Démarche et rapport' : e.near === 'hull' ? 'Observer la coque' :
          e.near === 'load' ? 'Observer les supports' : e.near === 'sas' ? 'Éprouver puis régler l’attache' : 'Suivre la coursive'}</h3>
        {e.near === 'responsible' && <>
          <p>Présentez votre intention. Le choix prépare un compromis ; il n’offre pas une coque.</p>
          <div className={styles.commands}>
            {command({kind: 'intent', option: 'A'}, 'A · privilégier la mobilité')}
            {command({kind: 'intent', option: 'B'}, 'B · privilégier l’autonomie')}
            {command({kind: 'report'}, 'Rapporter les faits constatés')}
            {command({kind: 'request-rights'}, 'Demander la remise des droits')}
          </div>
        </>}
        {e.near === 'hull' && <><p>Repérez la coque et son accès au sas avant de poursuivre dans le hangar.</p>
          {command({kind: 'inspect-hull'}, state?.checks.hull ? 'Coque déjà inspectée' : 'Inspecter la coque')}</>}
        {e.near === 'load' && <><p>Les supports sont visibles. Cette observation ne donne aucune quantité de réserve ni capacité universelle.</p>
          {command({kind: 'inspect-load'}, state?.checks.load ? 'Supports déjà inspectés' : 'Inspecter les supports de charge')}</>}
        {e.near === 'sas' && <>
          <p>Le premier test constate l’état du verrou. S’il ne tient pas, réglez les repères, asseyez la pièce existante puis verrouillez avant de tester à nouveau.</p>
          <div className={styles.latch} aria-label={'Alignement actuel du verrou : ' + (state?.latch.alignment ?? -2)}>
            {[-3,-2,-1,0,1,2,3].map(value => <span key={value} data-current={state?.latch.alignment === value} data-target={value === 0}>{value}</span>)}
          </div>
          <dl className={styles.checks}><div><dt>Appui</dt><dd>{state?.latch.seated ? 'Pièce assise' : 'À asseoir'}</dd></div>
            <div><dt>Attache</dt><dd>{state?.latch.locked ? 'Verrouillée' : 'Non verrouillée'}</dd></div></dl>
          <div className={styles.commands}>
            {command({kind: 'test-sas'}, state?.latch.verified ? 'Test déjà vérifié' : 'Tester le verrou')}
            {command({kind: 'align-latch', direction: -1}, 'Régler d’un cran à gauche')}
            {command({kind: 'align-latch', direction: 1}, 'Régler d’un cran à droite')}
            {command({kind: 'seat-latch'}, 'Asseoir la pièce sur son appui')}
            {command({kind: 'lock-latch'}, 'Verrouiller l’attache')}
          </div>
        </>}
        {!e.near && <p>Coque au repère central, charge puis sas vers la droite. Revenez auprès du responsable pour rapporter les travaux.</p>}
        <div className={styles.wait}>{state?.deferred ? command({kind: 'resume'}, 'Reprendre au repère conservé') :
          command({kind: 'defer'}, 'Différer en conservant les travaux')}</div>
        {e.missing.length > 0 && <ul className={styles.missing}>{e.missing.map(text => <li key={text}>{text}</li>)}</ul>}
      </aside>
    </div>
    <section className={styles.exchange} aria-label="Dernier échange réellement consigné">
      <h3>Auprès du responsable</h3>
      {lastLine ? <><p className={styles.speaker}>{lastLine.speaker} · échange consigné</p>
        <blockquote><YautjaTranslationV67 key={lastLine.id} text={lastLine.text} paused={e.paused || !e.hostNear} showSkip /></blockquote>
        <p>{lastLine.gesture}</p><small>{lastLine.address}</small></> :
        <p>Les paroles d’acquisition attendent leurs conditions réelles. L’inspection préliminaire et le rapport restent jouables ; aucun accord ni enregistrement audio n’est inventé.</p>}
    </section>
    <details className={styles.source}><summary>Provenance et portée de ce chantier</summary>
      <p>R2-M021, scène D6-C-R2-M021 et rôle D6-V-C-CHANTIER. Le hangar, ses dimensions et le réglage manuel de la pièce existante sont une adaptation locale. Le visuel de coque est celui déjà intégré au jeu.</p>
      <p>Une inspection, un sas réglé ou un choix A/B ne conclut pas une acquisition. Il faut les reçus réels de moyens et d’accord, leur remise par le responsable et une entrée physique. Ce lot ne fabrique ni prix, ni carburant, ni équipage, ni capacité, ni rang ou récompense. Le prévol R2-M022 et le voyage R2-M023 restent distincts.</p>
      {state && state.presentedLineIds.length > 0 && <ol>{state.presentedLineIds.map(id => {
        const item = SHIP_ACQUISITION_LINES_V89.find(value => value.id === id);
        return item ? <li key={id}><strong>{item.speaker}</strong> : {item.text} <small>{item.address}</small></li> : null;
      })}</ol>}
    </details>
  </section>;
}
