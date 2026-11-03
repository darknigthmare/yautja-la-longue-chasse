'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PIT_FIGHTERS } from './systems/pitCombat';
import { loadPitSpriteSheetAnimations, resolvePitSpriteSheetInspectionV100, type PitSpriteSheetAnimationBank } from './pitSpriteSheetAnimation';
import { drawPitWorkbookFrameV100, getPitWorkbookCameraV100, getPitWorkbookFighterV100, getPitWorkbookNativeV100, getPitWorkbookTimelineV100,
  type PitWorkbookFighterV100 } from './pitWorkbookAnimationV100';
import styles from './PitWorkbookAnimationViewerV100.module.css';
import { getPitWorkbookRuntimeBindingV105 } from './pitWorkbookRegistryV105';
import { getPitWorkbookRuntimeBindingV106 } from './pitWorkbookRegistryV106';
import {getPitWorkbookVariantCapabilitiesV107, PIT_WORKBOOK_STATIC_VARIANT_REFERENCES_V107} from './pitWorkbookVariantCapabilitiesV107';
import {getPitWorkbookConclusionSupportV107, getPitWorkbookRuntimeBindingV107} from './pitWorkbookRegistryV107';

/** Public viewer of admitted body artwork. The clock belongs to this viewer,
 * never to a match, training recording, inventory or replay. */
export default function PitWorkbookAnimationViewerV100({ fighterId }: { fighterId: PitWorkbookFighterV100 }) {
  const fighter = getPitWorkbookFighterV100(fighterId)!;
  const [capabilityVariantV107, setCapabilityVariantV107] = useState<string>('');
  const capabilitiesV107 = getPitWorkbookVariantCapabilitiesV107(fighterId, capabilityVariantV107 || undefined);
  const [actionId, setActionId] = useState(fighter.actions[0].id);
  const [facing, setFacing] = useState<'right' | 'left'>('right');
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(.5);
  const [attempt, setAttempt] = useState(0), [loaded, setLoaded] = useState<{ key: string; bank: PitSpriteSheetAnimationBank } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const action = fighter.actions.find(item => item.id === actionId) ?? fighter.actions[0];
  const native = useMemo(() => getPitWorkbookNativeV100(fighterId, actionId), [fighterId, actionId]);
  const timeline = useMemo(() => native ? getPitWorkbookTimelineV100(native, facing) : [], [native, facing]);
  const current = Math.min(index, Math.max(0, timeline.length - 1));
  const key = JSON.stringify([fighterId, actionId, attempt]);
  const bank = loaded?.key === key ? loaded.bank : null;
  const selected = timeline[current];
  const inspected = native && selected && bank ? resolvePitSpriteSheetInspectionV100(bank, { fighterId,
    atlasId: native.definition.atlas.id, clipId: selected.clipId, facing, elapsedTicks: selected.nativeTick }) : null;
  const status = !native ? 'unavailable' : !timeline.length ? 'missing-facing' : !bank ? 'loading' : inspected ? 'ready' : 'failed';
  const activeInCombat = !!native && (native.admission.combatClipIds?.length || native.admission.atlasId === 'feral-actions-v59');
  const sourceBinding = getPitWorkbookRuntimeBindingV106(fighterId, action.id);
  const conclusionSupportV107 = getPitWorkbookConclusionSupportV107(fighterId, action.id);
  const partnerStudy = ['TH_F', 'TH_B', 'FATALITE_1', 'FATALITE_2', 'CLEMENCE'].includes(action.key) && !conclusionSupportV107;
  const deviceSupportV107 = fighterId === 'scar' && action.id === 'M_F003_S2' || fighterId === 'feral-hunter' && action.id === 'M_F006_S4';
  const availability = deviceSupportV107 ? 'Cette action utilise un dispositif indépendant dans le duel avec la recette dédiée. Un seul exemplaire par round ; l’étoile isolée est une adaptation originale de la référence native.' : conclusionSupportV107 === 'conditional-scene'
    ? 'Cette conclusion anime Scar face au véritable adversaire après sa victoire finale, dans le duel alternatif avec balise. Le contexte hostile adulte, l’équipement et les réglages de violence doivent l’autoriser.'
    : conclusionSupportV107 === 'partial-scene'
      ? 'Le duel alternatif synchronise le véritable adversaire, le retrait du dispositif et la récupération de sa balise. Le désarmement d’une arme offensive prévu par le classeur reste à réaliser.'
      : sourceBinding === 'presentation'
    ? 'Cette présentation accompagne les entrées, résultats ou provocations du duel avec les règles du classeur.'
    : sourceBinding === 'normal' || sourceBinding === 'move'
      ? 'Ce mouvement accompagne une action disponible en duel avec les règles du classeur.'
      : partnerStudy
        ? 'Étude avec partenaire dessiné, consultable ici. Elle ne remplace pas l’adversaire du duel.'
        : activeInCombat ? 'Ce mouvement accompagne une action disponible dans le duel classique.'
          : 'Étude de mouvement consultable ici. Son action complète n’est pas encore disponible en duel.';

  useEffect(() => {
    if (!native) return;
    const abort = new AbortController();
    void loadPitSpriteSheetAnimations([fighterId], [native.definition], { signal: abort.signal }).then(value => {
      if (!abort.signal.aborted) setLoaded({ key, bank: value });
    });
    return () => abort.abort();
  }, [fighterId, native, key]);
  useEffect(() => {
    const pause = () => { if (document.visibilityState !== 'visible') setPlaying(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!playing || status !== 'ready' || !selected) return;
    const timer = window.setTimeout(() => {
      if (current >= timeline.length - 1) setPlaying(false);
      else setIndex(current + 1);
    }, Math.max(16, selected.durationTicks60 / 60 * 1000 / speed));
    return () => window.clearTimeout(timer);
  }, [playing, status, selected, current, timeline.length, speed]);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, 720, 400); context.fillStyle = '#0c1417'; context.fillRect(0, 0, 720, 400);
    const camera = native && bank ? getPitWorkbookCameraV100(native, bank, 720, 400, 2.5, 350) : null;
    context.strokeStyle = '#607452'; context.beginPath(); context.moveTo(24, camera?.groundY ?? 350); context.lineTo(696, camera?.groundY ?? 350); context.stroke();
    if (status === 'ready' && native && bank) {
      if (!camera) return;
      context.save(); context.translate(camera.x, camera.groundY); context.scale(camera.zoom, camera.zoom);
      drawPitWorkbookFrameV100(context, bank, native, facing, current, 0, 0); context.restore();
    }
  }, [status, native, bank, facing, current]);
  const reset = () => { setPlaying(false); setIndex(0); };
  return <section className={styles.root} aria-label={`Animations de ${PIT_FIGHTERS[fighterId].name}`} data-pit-animation-viewer-v100
    data-fighter={fighterId} data-action={action.id} data-facing={facing} data-status={status} data-drawing-index={current}
    data-runtime-binding-v105={getPitWorkbookRuntimeBindingV105(fighterId, action.id) ?? 'study'} data-runtime-binding-v106={sourceBinding ?? 'study'}
    data-runtime-binding-v107={getPitWorkbookRuntimeBindingV107(fighterId,action.id) ?? 'study'}>
    <h4>Animations de {PIT_FIGHTERS[fighterId].name}</h4>
    <aside data-pit-variant-capabilities-v107 data-source-recipe-allowed={capabilitiesV107.sourceRecipeOwnershipAllowed} data-native-actions={capabilitiesV107.nativeActions.length} data-native-clips={capabilitiesV107.nativeClips.length} data-static-reference={Boolean(capabilitiesV107.staticReference)}>
      <label>Capacités de l’apparence<select data-pit-variant-capability-picker-v107 value={capabilityVariantV107} onChange={event => setCapabilityVariantV107(event.target.value)}><option value="">Apparence d’origine</option>{PIT_WORKBOOK_STATIC_VARIANT_REFERENCES_V107.filter(item => item.fighterId === fighterId).map(item => <option key={item.variantId} value={item.variantId}>{item.variantId}</option>)}</select></label>
      <p>{capabilitiesV107.sourceRecipeOwnershipAllowed ? `${capabilitiesV107.nativeActions.length} actions avec dessins natifs dans les deux orientations.` : capabilitiesV107.nativeClips.length ? `${capabilitiesV107.nativeClips.length} séquences natives partielles, sans admission des attaques de l’apparence d’origine.` : 'Référence fixe ; cycles natifs de cette apparence encore manquants.'} L’aperçu des mouvements ci-dessous garde son apparence d’origine.</p>
      <small>États d’armes perdues, armure endommagée et transitions de masque non admis. Aucune certification de kit complet.</small>
    </aside>
    <p>Observez ses mouvements et ses présentations dans son apparence d’origine.</p>
    {native?.admission.contextLabel ? <p className={styles.note}>{native.admission.contextLabel}</p> : null}
    <div className={styles.controls}>
      <label>Mouvement<select value={action.id} onChange={event => { reset(); setActionId(event.target.value); }}>{fighter.actions.map(item => {
        const available = !!getPitWorkbookNativeV100(fighterId, item.id);
        return <option key={item.id} value={item.id}>{item.label}{available ? '' : ' · en préparation'}</option>;
      })}</select></label>
      <label>Direction<select value={facing} onChange={event => { reset(); setFacing(event.target.value as 'left' | 'right'); }}><option value="right">Vers la droite</option><option value="left">Vers la gauche</option></select></label>
      <label>Lecture<select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={.25}>Très lent</option><option value={.5}>Lent</option><option value={1}>Normal</option></select></label>
    </div>
    <div className={styles.stage}><canvas ref={canvas} width={720} height={400} aria-label={`${action.label}, vers la ${facing === 'right' ? 'droite' : 'gauche'}`} />
      {status !== 'ready' ? <p className={styles.overlay} role="status">{status === 'loading' ? 'Chargement des images…' : status === 'failed' ? 'Images indisponibles.' : status === 'missing-facing' ? 'Cette direction est encore en préparation.' : 'Ce mouvement est encore en préparation.'}</p> : null}</div>
    <div className={styles.actions}><button type="button" disabled={status !== 'ready'} onClick={reset}>Recommencer</button>
      <button type="button" disabled={status !== 'ready'} aria-pressed={playing} onClick={() => { if (!playing && current >= timeline.length - 1) setIndex(0); setPlaying(value => !value); }}>{playing ? 'Pause' : 'Lire le mouvement'}</button>
      <button type="button" disabled={status !== 'ready' || current >= timeline.length - 1} onClick={() => { setPlaying(false); setIndex(current + 1); }}>Image suivante</button>
      {status === 'failed' ? <button type="button" onClick={() => { reset(); setAttempt(value => value + 1); }}>Réessayer</button> : null}</div>
    <p className={styles.note} role="status">{status === 'ready' ? availability : 'Chaque direction apparaît après validation de ses images.'}</p>
  </section>;
}
