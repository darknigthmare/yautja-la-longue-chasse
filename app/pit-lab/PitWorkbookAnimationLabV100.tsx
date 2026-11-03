'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PIT_FIGHTERS } from '../game/systems/pitCombat';
import { loadPitSpriteSheetAnimations, resolvePitSpriteSheetInspectionV100, type PitSpriteSheetAnimationBank } from '../game/pitSpriteSheetAnimation';
import { PIT_WORKBOOK_PLAN_V100, drawPitWorkbookFrameV100, getPitWorkbookCameraV100, getPitWorkbookCombatLinkV100, getPitWorkbookFighterV100, getPitWorkbookNativeV100,
  getPitWorkbookTimelineV100, type PitWorkbookFighterV100 } from '../game/pitWorkbookAnimationV100';
import styles from './PitWorkbookAnimationLabV100.module.css';

export default function PitWorkbookAnimationLabV100() {
  const [fighterId, setFighterId] = useState<PitWorkbookFighterV100>('feral-hunter');
  const [actionId, setActionId] = useState('M_F006_5L'), [facing, setFacing] = useState<'right' | 'left'>('right');
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(.5), [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; bank: PitSpriteSheetAnimationBank } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fighter = getPitWorkbookFighterV100(fighterId)!;
  const action = fighter.actions.find(item => item.id === actionId) ?? fighter.actions[0];
  const native = useMemo(() => getPitWorkbookNativeV100(fighterId, actionId), [fighterId, actionId]);
  const timeline = useMemo(() => native ? getPitWorkbookTimelineV100(native, facing) : [], [native, facing]);
  const currentIndex = Math.min(index, Math.max(0, timeline.length - 1));
  const key = JSON.stringify([fighterId, action.id, native?.admission.atlasId ?? null, attempt]);
  const bank = loaded?.key === key ? loaded.bank : null;
  const inspected = native && bank && timeline[currentIndex] ? resolvePitSpriteSheetInspectionV100(bank, {
    fighterId, atlasId: native.definition.atlas.id, clipId: timeline[currentIndex].clipId,
    facing, elapsedTicks: timeline[currentIndex].nativeTick,
  }) : null;
  const status = !native ? 'unproduced' : !timeline.length ? 'missing-facing' : !bank ? 'loading' : inspected ? 'ready' : 'failed';
  const link = getPitWorkbookCombatLinkV100(fighterId, action);
  const reset = () => { setPlaying(false); setIndex(0); };
  const chooseAction = (id: string) => { reset(); setActionId(id); };

  useEffect(() => {
    if (!native) return;
    const abort = new AbortController();
    void loadPitSpriteSheetAnimations([fighterId], [native.definition], { signal: abort.signal }).then(bank => {
      if (!abort.signal.aborted) setLoaded({ key, bank });
    });
    return () => abort.abort();
  }, [fighterId, native, key]);
  useEffect(() => {
    const pause = () => { if (document.visibilityState !== 'visible') setPlaying(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!playing || status !== 'ready' || !timeline[currentIndex]) return;
    const timer = window.setTimeout(() => {
      if (currentIndex >= timeline.length - 1) { setPlaying(false); return; }
      setIndex(currentIndex + 1);
    }, Math.max(16, timeline[currentIndex].durationTicks60 / 60 * 1000 / speed));
    return () => window.clearTimeout(timer);
  }, [playing, status, timeline, currentIndex, speed]);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, 960, 540); context.fillStyle = '#0b1518'; context.fillRect(0, 0, 960, 540);
    const camera = native && bank ? getPitWorkbookCameraV100(native, bank, 960, 540, 2.8, 460) : null;
    context.strokeStyle = '#6a805f'; context.beginPath(); context.moveTo(40, camera?.groundY ?? 460); context.lineTo(920, camera?.groundY ?? 460); context.stroke();
    if (status === 'ready' && native && bank) {
      if (!camera) return;
      context.save(); context.translate(camera.x, camera.groundY); context.scale(camera.zoom, camera.zoom);
      drawPitWorkbookFrameV100(context, bank, native, facing, currentIndex, 0, 0); context.restore();
    } else {
      context.textAlign = 'center'; context.font = '21px system-ui'; context.fillStyle = '#d7e6c5';
      context.fillText(status === 'loading' ? 'Chargement des vrais dessins…' : status === 'unproduced' ? 'Dessins de ce geste encore à produire' : status === 'missing-facing' ? 'Aucun dessin dans cette orientation' : 'Image indisponible ou pixels refusés', 480, 270);
    }
  }, [status, native, bank, facing, currentIndex]);

  return <section className={styles.root} aria-label="Animations du classeur V54 · Feral et Scar" data-pit-workbook-v100
    data-fighter={fighterId} data-action={action.id} data-cell={action.cell} data-facing={facing}
    data-native-status={status} data-drawing-index={currentIndex} data-combat-link={link.status}>
    <h2>Feral et Scar · gestes prévus dans le classeur</h2>
    <p className={styles.intro}>Dix-huit actions et huit présentations par personnage, dans les deux sens. Chaque cellule conserve son identité : une pose de coup ne devient pas un super ou une fatalité. Les gestes encore absents restent indiqués.</p>
    {native?.admission.contextLabel ? <p className={styles.intro}>{native.admission.contextLabel}</p> : null}
    <div className={styles.layout}><div className={styles.viewer}>
      <canvas ref={canvas} width={960} height={540} className={styles.canvas} aria-label={`${PIT_FIGHTERS[fighterId].name} · ${action.label} · ${facing === 'right' ? 'droite' : 'gauche'}`} />
      <div className={styles.readout}><strong>{action.key} · {action.label}</strong><span>{action.sheet}!{action.cell}</span><span>Dessin {timeline.length ? currentIndex + 1 : 0}/{timeline.length}</span></div>
      <p role="status" className={styles.status}>{status === 'ready' ? `Dessins natifs chargés · ${native!.admission.review.scope}.` : status === 'unproduced' ? 'Aucune séquence admise pour ce geste.' : status === 'loading' ? 'Vérification des pixels et des orientations…' : status === 'missing-facing' ? 'Orientation absente. Aucun miroir ou autre costume ne la remplace.' : 'Chargement ou pixels incomplets. Réessayez avant de lire.'}</p>
      <label htmlFor="workbook-v100-frame">Dessin courant</label><input className={styles.range} id="workbook-v100-frame" type="range" min={0} max={Math.max(0, timeline.length - 1)} value={currentIndex} disabled={status !== 'ready'} onChange={event => { setPlaying(false); setIndex(Number(event.target.value)); }} />
      <div className={styles.buttons}><button type="button" disabled={status !== 'ready'} onClick={() => { setPlaying(false); setIndex(0); }}>Début</button>
        <button type="button" disabled={status !== 'ready'} aria-pressed={playing} onClick={() => { if (!playing && currentIndex >= timeline.length - 1) setIndex(0); setPlaying(value => !value); }}>{playing ? 'Pause' : 'Lire le geste'}</button>
        <button type="button" disabled={status !== 'ready' || currentIndex >= timeline.length - 1} onClick={() => { setPlaying(false); setIndex(currentIndex + 1); }}>Dessin suivant</button>
        {status === 'failed' ? <button type="button" onClick={() => { reset(); setAttempt(value => value + 1); }}>Réessayer les images</button> : null}</div>
    </div><div className={styles.controls}>
      <label htmlFor="workbook-v100-fighter">Personnage · corps historique</label><select id="workbook-v100-fighter" value={fighterId} onChange={event => { reset(); const id = event.target.value as PitWorkbookFighterV100; setFighterId(id); setActionId(getPitWorkbookFighterV100(id)!.actions[0].id); }}>{PIT_WORKBOOK_PLAN_V100.fighters.map(item => <option key={item.fighterId} value={item.fighterId}>{PIT_FIGHTERS[item.fighterId].name}</option>)}</select>
      <label htmlFor="workbook-v100-action">Geste / cellule</label><select id="workbook-v100-action" value={action.id} onChange={event => chooseAction(event.target.value)}>{fighter.actions.map(item => <option key={item.id} value={item.id}>{item.key} · {item.label} · {item.cell}</option>)}</select>
      <label htmlFor="workbook-v100-facing">Orientation native</label><select id="workbook-v100-facing" value={facing} onChange={event => { reset(); setFacing(event.target.value as 'right' | 'left'); }}><option value="right">Droite</option><option value="left">Gauche</option></select>
      <label htmlFor="workbook-v100-speed">Vitesse de lecture</label><select id="workbook-v100-speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={.25}>×0,25</option><option value={.5}>×0,5</option><option value={1}>×1</option></select>
      <p><strong>{link.label}</strong></p><p>{link.limitation}</p>
      {native ? <p>{native.admission.review.notes}</p> : null}
      {action.phaseTicks ? <p>Cible Excel : {action.phaseTicks.startup}/{action.phaseTicks.active}/{action.phaseTicks.recovery} ticks. Ces valeurs proposées ne modifient pas le combat.</p> : null}
    </div></div>
    <details className={styles.source}><summary>Texte source exact et périmètre de l’inspection</summary><pre>{action.sourceText}</pre><p>Extraction versionnée V56 du classeur {PIT_WORKBOOK_PLAN_V100.source.workbookName}. Cette lecture affiche les corps et accessoires admis ; elle ne crée ni dégâts, ni arme d’inventaire, ni résultat de combat, ni récompense. Un geste de fatalité du corps seul ne certifie pas une victime synchronisée.</p></details>
    <table className={styles.table}><caption>Suivi des {fighter.actions.length} gestes · {PIT_FIGHTERS[fighterId].name}</caption><thead><tr><th>Cellule</th><th>Geste exact</th><th>Droite / gauche</th><th>Raccordement</th></tr></thead><tbody>{fighter.actions.map(item => {
      const entry = getPitWorkbookNativeV100(fighterId, item.id), right = entry ? getPitWorkbookTimelineV100(entry, 'right').length : 0, left = entry ? getPitWorkbookTimelineV100(entry, 'left').length : 0;
      return <tr key={item.id} data-workbook-action={item.id}><td>{item.cell}</td><td><button type="button" onClick={() => chooseAction(item.id)}>{item.key} · {item.label}</button></td><td>{right} / {left} dessins référencés</td><td>{getPitWorkbookCombatLinkV100(fighterId, item).label}</td></tr>;
    })}</tbody></table>
  </section>;
}
