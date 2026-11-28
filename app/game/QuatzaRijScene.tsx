"use client";

/* eslint-disable @next/next/no-img-element -- world-space native sprites */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { SaveGame } from './types';
import HunterRigPreview from './HunterRigPreview';
import HomeworldNpcSpriteV84 from './HomeworldNpcSpriteV84';
import { controlActionShortcut } from './controlBindingLabels';
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction } from './systems/controlBindings';
import {
  QUATZA_COMPANION_NAMES, QUATZA_FLOOR, QUATZA_INPUT, QUATZA_PLATFORMS, QUATZA_POSTS, QUATZA_RETURN_AID_TICKS, QUATZA_RETURN_SUBJECTS,
  QUATZA_RETURN_WITNESS, QUATZA_WIDTH,
  canEnterQuatza, canRetryQuatza, quatzaMissingCompanion, quatzaRescueFinished, quatzaReturnAidPatient, quatzaReturnProof,
  replayQuatzaAttempt, replayQuatzaRescue,
  stepQuatza, stepQuatzaRescue, type QuatzaAttempt, type QuatzaCommand, type QuatzaFrame, type QuatzaMode,
  type QuatzaRescue, type QuatzaRescueFrame, type QuatzaReturnSubject,
} from './systems/quatzaRij';
import styles from './QuatzaRijScene.module.css';

const BEAST = '/game/quatza-rij/poses.png';
const HIDE = '/game/quatza-rij/hide.png';
const SKULL = '/game/quatza-rij/skull.png';
const title: Record<QuatzaMode, string> = { triad: 'Le Quatza-Rij à trois', solo: 'Le Quatza-Rij solitaire' };
const companionName = QUATZA_COMPANION_NAMES;
const companionNames = (frame: QuatzaFrame) => frame.companions.map(ally => companionName[ally.id]).join(' et ');
const controls = [
  ['left', 'hunt.moveLeft', '←'], ['right', 'hunt.moveRight', '→'], ['jump', 'hunt.jump', 'Sauter'],
  ['strike', 'hunt.melee', 'Frapper'], ['interact', 'hunt.interact', 'Interagir'], ['signal', 'hunt.scan', 'Signal'],
] as const;
type Control = typeof controls[number][0];
interface Props { save: SaveGame; onCommand(command: QuatzaCommand): boolean; suspended?: boolean }

function markers(frame: QuatzaFrame, mode: QuatzaMode) {
  const { rack, map, care, mobility, departure, refuge, trail, witness } = QUATZA_POSTS;
  if (frame.phase === 'preparation') return [
    { x: rack, label: frame.checked ? 'Lames vérifiées' : 'Vérifier les lames', current: !frame.checked },
    { x: map, label: frame.route ? 'Itinéraire reconnu' : 'Lire l’itinéraire et les règles', current: frame.checked && !frame.route },
    ...(mode === 'solo' ? [
      { x: care, label: frame.kit === 'care' ? 'Marge de soin choisie' : 'Marge de soin', current: frame.route && !frame.kit },
      { x: mobility, label: frame.kit === 'mobility' ? 'Mobilité choisie' : 'Outil de mobilité', current: frame.route && !frame.kit },
    ] : []),
    { x: departure, label: 'Départ vers le territoire', current: frame.route && (mode === 'triad' || !!frame.kit) },
  ];
  if (frame.phase === 'field') return [
    { x: refuge, label: frame.skull ? 'Extraction' : frame.kit === 'care' && frame.player.health <= 3 && !frame.player.careSpent ? 'Soin au refuge' : 'Repli', current: frame.skull },
    ...(!frame.trail ? [{ x: trail, label: 'Lire la piste', current: true }] : []),
  ];
  if (frame.phase === 'return') return [{ x: witness, label: mode === 'triad' ? 'Rejoindre les témoins avec la triade' : 'Présenter la peau et le crâne', current: true }];
  return [];
}

function objective(frame: QuatzaFrame, mode: QuatzaMode): string {
  if (frame.phase === 'delivered') return mode === 'triad' ? 'La triade a atteint les témoins avec les deux pièces.' : 'La peau et le crâne ont été remis aux témoins.';
  if (frame.phase === 'retreated') return 'Repli consigné. Aucun trophée rapporté.';
  if (frame.phase === 'return') return mode === 'triad' ?
    `Rejoins le témoin avec ${companionNames(frame)} et les deux pièces.` : 'Rejoins les témoins et présente les deux pièces rapportées.';
  if (frame.phase === 'preparation') {
    if (!frame.checked) return 'Au râtelier, vérifie les lames disponibles.';
    if (!frame.route) return 'Lis le plan du territoire et confirme les règles au poste suivant.';
    if (mode === 'solo' && !frame.kit) return 'Choisis une marge de soin au refuge ou un appui de mobilité pour atteindre les corniches plus hautes.';
    return 'Rejoins la sortie du camp.';
  }
  if (!frame.trail) return 'Suis les empreintes jusqu’au relevé.';
  if (frame.beast.stage === 'dead') {
    if (!frame.hide) return 'Approche le Quatza-Rij pour prélever la peau.';
    if (!frame.skull) return 'Prélève le crâne au même emplacement.';
    return 'Ramène les deux pièces au point d’extraction.';
  }
  if (mode === 'triad' && !frame.companions[0].contribution)
    return `Appelle ${companionName[frame.companions[0].id]} à portée de la bête et attends le signal de mise en place.`;
  if (mode === 'triad' && !frame.companions[1].contribution)
    return `Appelle ${companionName[frame.companions[1].id]} pour fermer le passage. Attends son ouverture.`;
  if (frame.beast.stage === 'recover') return 'La bête reprend son souffle. Entre à portée des lames.';
  if (frame.beast.stage === 'warning') return 'Charge annoncée. Quitte la ligne au sol.';
  return 'Observe la course du Quatza-Rij et attends son ouverture.';
}

function poseOf(frame: QuatzaFrame): number {
  if (frame.beast.stage === 'dead') return 6;
  if (frame.beast.stage === 'warning') return 2;
  if (frame.beast.stage === 'charge') return frame.beast.remaining < 8 ? 4 : 3;
  if (frame.beast.stage === 'recover') return frame.player.cooldown > 11 ? 5 : 7;
  if (frame.beast.stage === 'stalk') return Math.floor(frame.tick / 12) % 2;
  return 0;
}

function ReturnWitness({ save }: { save: SaveGame }) {
  const witness = QUATZA_RETURN_WITNESS;
  return <div className={styles.actor} data-quatza-witness-actor={witness.id}
    style={{ left: QUATZA_POSTS.witness + 38, top: QUATZA_FLOOR }}>
    <span className={styles.witnessName}>{witness.name}</span>
    <HomeworldNpcSpriteV84 npcId={witness.id} regionId="quatza-rij" role="rite-keeper" height={98} facing={-1}>
      <div><HunterRigPreview appearance={save.appearance} armorId="scout" weaponIds={[]} gearIds={[]}
        size={98} facing={-1} label={witness.name} /></div>
    </HomeworldNpcSpriteV84>
  </div>;
}

function Expedition({ save, mode, attempt, attempts, onCommand, suspended = false }: Props & {
  mode: QuatzaMode; attempt: QuatzaAttempt; attempts: number;
}) {
  const [frame, setFrame] = useState(() => replayQuatzaAttempt(mode, attempt.input, attempt.returnRules, attempt.roster));
  const [running, setRunning] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [witnessError, setWitnessError] = useState(false);
  const [assets, setAssets] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [assetRetry, setAssetRetry] = useState(0);
  const [width, setWidth] = useState(900);
  const groundRef = useRef<HTMLDivElement>(null);
  const expeditionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  const controlsRef = useRef(0);
  const buffer = useRef<number[]>([]);
  const savedTick = useRef(attempt.input.length);
  const commitRef = useRef(onCommand);
  useEffect(() => { commitRef.current = onCommand; }, [onCommand]);
  const bindings = save.settings.controlBindings ?? DEFAULT_CONTROL_BINDINGS;
  const terminal = frame.phase === 'retreated' || frame.phase === 'delivered';
  const visibleControls = controls.filter(([id]) => mode === 'triad' || id !== 'signal');

  useEffect(() => {
    let alive = true;
    void Promise.all([BEAST, HIDE, SKULL].map(async source => {
      const image = new Image();
      image.src = source;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || source === BEAST && (image.naturalWidth !== 1104 || image.naturalHeight !== 336))
        throw new Error('Image du Quatza-Rij incompatible');
    })).then(() => { if (alive) setAssets('ready'); }, () => { if (alive) setAssets('failed'); });
    return () => { alive = false; };
  }, [assetRetry]);

  useEffect(() => {
    const ground = groundRef.current;
    if (!ground) return;
    const observe = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observe.observe(ground);
    return () => observe.disconnect();
  }, []);

  const flush = useCallback(() => {
    if (!buffer.current.length) return true;
    const input = [...buffer.current];
    if (!commitRef.current({ type: 'advance', mode, expectedAttempts: attempts, expectedTick: savedTick.current, input })) {
      setBlocked(true);
      setRunning(false);
      controlsRef.current = 0;
      return false;
    }
    savedTick.current += input.length;
    buffer.current.length = 0;
    return true;
  }, [attempts, mode]);

  const stop = useCallback(() => {
    controlsRef.current = 0;
    setRunning(false);
    flush();
  }, [flush]);

  useEffect(() => {
    if (!running) return;
    const onActivity = () => { if (document.hidden || !document.hasFocus()) stop(); };
    window.addEventListener('blur', onActivity);
    document.addEventListener('visibilitychange', onActivity);
    return () => {
      window.removeEventListener('blur', onActivity);
      document.removeEventListener('visibilitychange', onActivity);
    };
  }, [running, stop]);

  useEffect(() => {
    if (!running || suspended || blocked || assets !== 'ready') return;
    let raf = 0, previous = 0, accumulated = 0;
    const tick = (time: number) => {
      const elapsed = previous ? Math.min(45, time - previous) : 0;
      accumulated += elapsed;
      previous = time;
      let current = frameRef.current;
      while (accumulated >= 1000 / 60) {
        accumulated -= 1000 / 60;
        const code = controlsRef.current;
        const safeCode = (code & 3) === 3 ? code & ~3 : code;
        const next = stepQuatza(mode, current, safeCode, attempt.returnRules);
        if (next === current) break;
        buffer.current.push(safeCode);
        frameRef.current = next;
        const significant = next.phase !== current.phase || next.checked !== current.checked || next.route !== current.route ||
          next.kit !== current.kit || next.player.health !== current.player.health || next.beast.health !== current.beast.health ||
          next.hide !== current.hide || next.skull !== current.skull ||
          next.companions.some((ally, index) => ally.health !== current.companions[index]?.health) || buffer.current.length >= 64;
        current = next;
        if (significant && !flush()) { setFrame(current); return; }
        if (next.phase === 'retreated' || next.phase === 'delivered') { setFrame(next); setRunning(false); return; }
      }
      setFrame(current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); controlsRef.current = 0; };
  }, [assets, attempt.returnRules, blocked, flush, mode, running, suspended]);

  useEffect(() => {
    if (!running || suspended || blocked) return;
    const keyboard = (event: KeyboardEvent) => {
      if (!groundRef.current?.contains(document.activeElement)) return;
      const control = controls.find(([, action]) => matchesControlAction(action, event, bindings));
      if (!control) return;
      event.preventDefault();
      const bit = QUATZA_INPUT[control[0]];
      controlsRef.current = event.type === 'keydown' ? controlsRef.current | bit : controlsRef.current & ~bit;
    };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('keyup', keyboard);
    return () => {
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('keyup', keyboard);
    };
  }, [bindings, blocked, running, suspended]);

  const touch = (event: PointerEvent<HTMLButtonElement>, id: Control) => {
    event.preventDefault();
    if (event.type === 'pointerdown') {
      event.currentTarget.setPointerCapture(event.pointerId);
      controlsRef.current |= QUATZA_INPUT[id];
    } else controlsRef.current &= ~QUATZA_INPUT[id];
  };
  const camera = Math.max(0, Math.min(QUATZA_WIDTH - width, frame.player.x - width * .42));
  const pose = poseOf(frame);
  const beastWidth = mode === 'solo' ? 325 : 282, beastHeight = beastWidth * 168 / 276;
  const reachedWitnesses = mode === 'triad' && frame.phase === 'delivered' && attempt.phase === 'delivered';
  const presentations = reachedWitnesses ? save.quatzaRij?.expeditions.triad?.presentations ?? [] : [];
  const subjectLabel: Record<QuatzaReturnSubject, string> = {
    companions: companionNames(frame), trophy: 'La peau et le crâne',
  };
  const remainingSubjects = QUATZA_RETURN_SUBJECTS.filter(subject => !presentations.includes(subject));
  const returning = mode === 'triad' && frame.phase === 'return';
  const proof = mode === 'triad' ? quatzaReturnProof(save.createdAt, attempts, frame) : null;
  const patient = returning && attempt.returnRules && Math.abs(frame.player.x - QUATZA_POSTS.witness) > 52
    ? quatzaReturnAidPatient(frame) : undefined;
  const heldProof = frame.hide && (frame.phase === 'field' || frame.phase === 'return' ||
    reachedWitnesses && remainingSubjects.includes('trophy'));
  return <div ref={expeditionRef} data-quatza-expedition={mode}
    onBlur={event => {
      if (running && (!(event.relatedTarget instanceof Node) || !expeditionRef.current?.contains(event.relatedTarget))) stop();
    }} data-phase={frame.phase} data-tick={frame.tick} data-x={frame.player.x}
    data-y={Math.round(frame.player.y)} data-health={frame.player.health} data-beast-health={frame.beast.health}
    data-beast-state={frame.beast.stage} data-beast-x={frame.beast.x} data-kit={frame.kit ?? 'none'} data-route={frame.route}
    data-trail={frame.trail} data-hide={frame.hide} data-skull={frame.skull}
    data-saar-ready={frame.companions.some(ally => ally.id === 'saar' && ally.contribution)}
    data-vek-ready={frame.companions.some(ally => ally.id === 'vek' && ally.contribution)}>
    <div className={styles.heading}>
      <strong>{frame.phase === 'preparation' ? 'Préparation au camp' : frame.phase === 'field' ? 'Territoire du Quatza-Rij' :
        frame.phase === 'return' ? 'Retour aux témoins' : frame.phase === 'delivered' ? 'Retour enregistré' : 'Expédition interrompue'}</strong>
      {!terminal && (running ? <button type="button" onClick={stop}>Pause</button> :
        <button type="button" disabled={assets !== 'ready' || suspended || blocked}
          onClick={() => { setRunning(true); groundRef.current?.focus(); }}>Reprendre la chasse</button>)}
    </div>
    {blocked && <p role="alert">Sauvegarde à confirmer. <button type="button" onClick={() => { if (flush()) setBlocked(false); }}>Réessayer</button></p>}
    {assets === 'failed' && <p role="alert">Une image du Quatza-Rij est indisponible. <button type="button"
      onClick={() => { setAssets('loading'); setAssetRetry(value => value + 1); }}>Recharger les images</button></p>}
    <div className={styles.vital}><label>Vitalité <meter min={0} max={5} value={frame.player.health} /></label>
      {mode === 'triad' && frame.companions.map(member => <label key={member.id}>{companionName[member.id]} <meter min={0} max={3} value={member.health} /></label>)}
      {frame.phase === 'field' && frame.trail && <label>Quatza-Rij <meter min={0} max={mode === 'solo' ? 8 : 6} value={frame.beast.health} /></label>}
    </div>
    <div className={styles.viewport} ref={groundRef} tabIndex={0} aria-label={title[mode]}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) controlsRef.current = 0; }}>
      <div className={styles.world} style={{ transform: `translateX(${-camera}px)` }}>
        <div className={styles.land} />
        {frame.phase === 'field' && QUATZA_PLATFORMS.map(place => <span key={place.left} className={styles.platform}
          style={{ left: place.left, top: place.y, width: place.right - place.left }} />)}
        {markers(frame, mode).map(marker => <span key={marker.x} className={styles.marker} data-ready={marker.current}
          style={{ left: marker.x, top: QUATZA_FLOOR - 28 }}>{marker.label}</span>)}
        {frame.phase === 'field' && frame.trail && <>
          {(frame.beast.stage === 'warning' || frame.beast.stage === 'charge') && <span className={styles.groundWarning}
            style={{ left: frame.beast.x - (frame.beast.direction < 0 ? 236 : 20), width: 250 }} />}
          <div aria-label="Quatza-Rij" role="img" className={styles.beast} data-quatza-sprite={pose}
            style={{ left: frame.beast.x, top: QUATZA_FLOOR, width: beastWidth, height: beastHeight,
              backgroundImage: `url(${BEAST})`, backgroundSize: `${beastWidth * 4}px ${beastHeight * 2}px`,
              backgroundPosition: `${-(pose % 4) * beastWidth}px ${-Math.floor(pose / 4) * beastHeight}px`,
              transform: frame.beast.direction > 0 ? 'translate(-48%, -100%) scaleX(-1)' : undefined }} />
          {frame.beast.stage === 'dead' && !frame.skull && <img className={styles.proof} src={frame.hide ? SKULL : HIDE}
            style={{ left: frame.beast.x + 12, top: QUATZA_FLOOR }} alt={frame.hide ? 'Crâne à prélever' : 'Peau à prélever'} />}
        </>}
        {(returning || reachedWitnesses) && <ReturnWitness save={save} />}
        {frame.companions.map(ally => <div className={styles.actor} key={ally.id} data-quatza-companion={ally.id}
          data-health={ally.health} data-contributed={ally.contribution} style={{ left: ally.x, top: QUATZA_FLOOR, opacity: ally.health > 0 ? 1 : .48 }}>
          <span className={styles.actorName}>{companionName[ally.id]}</span>
          <div><HunterRigPreview appearance={save.appearance} armorId={ally === frame.companions[0] ? 'scout' : save.loadout.armorId}
            weaponIds={['wristblades']} gearIds={[]} size={98} label={companionName[ally.id]} /></div>
        </div>)}
        <div className={styles.actor} data-quatza-actor style={{ left: frame.player.x, top: frame.player.y }}><div>
          <HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={['wristblades']} gearIds={[]}
            facing={frame.player.facing} size={108} label="Ton chasseur" pose={frame.player.vy ? 'jump' : frame.previous & 3 ? 'run' : 'idle'}
            phase={frame.tick / 8} bladesExtended={frame.player.cooldown > 12} />
        </div></div>
        {heldProof && <img className={styles.proof} data-quatza-carried data-quatza-return-proof={proof ?? undefined}
          src={frame.skull ? SKULL : HIDE}
          style={{ left: frame.player.x - 21, top: frame.player.y - 35 }} alt={frame.skull ? 'Peau et crâne portés' : 'Peau portée'} />}
        {frame.phase === 'delivered' && (mode === 'solo' || presentations.includes('trophy')) &&
          <img className={styles.proof} src={SKULL} data-quatza-return-proof={proof ?? undefined} data-quatza-handover="skull"
            style={{ left: QUATZA_POSTS.witness + 77, top: QUATZA_FLOOR - 28 }} alt="Crâne remis" />}
        {reachedWitnesses && presentations.includes('trophy') &&
          <img className={styles.proof} src={HIDE} data-quatza-return-proof={proof ?? undefined} data-quatza-handover="hide"
            style={{ left: QUATZA_POSTS.witness + 124, top: QUATZA_FLOOR - 28 }} alt="Peau remise" />}
      </div>
    </div>
    <p className={styles.status} role="status">{objective(frame, mode)}</p>
    {patient && <p className={styles.status}>Arrête-toi près de {companionName[patient.id]} et maintiens Interagir pour le soigner.</p>}
    {frame.returnAid && <progress aria-label={'Soins de ' + companionName[frame.returnAid.patient]}
      value={frame.returnAid.ticks} max={QUATZA_RETURN_AID_TICKS} />}
    {reachedWitnesses && <section className={styles.testimony} aria-label="Présentation au témoin du clan"
      data-quatza-witness={QUATZA_RETURN_WITNESS.id}>
      {presentations.length > 0 && <ol aria-label="Ordre des présentations">{presentations.map(subject => <li key={subject}
        data-quatza-presented={subject}>{subjectLabel[subject]}</li>)}</ol>}
      {presentations.includes('companions') && <ul aria-label="État des partenaires au retour">{frame.companions.map(member =>
        <li key={member.id}>{companionName[member.id]} · vitalité {member.health}/3 au retour</li>)}</ul>}
      {remainingSubjects.length ? <>
        <p>{presentations.length ? 'Présente aussi le second sujet aux témoins.' : 'Qui ou quoi présentes-tu en premier ?'}</p>
        <div className={styles.controls}>{remainingSubjects.map(subject => <button key={subject} type="button"
          data-quatza-present={subject} disabled={suspended || blocked}
          onClick={() => setWitnessError(!onCommand({ type: 'present-return', mode: 'triad', expectedAttempts: attempts,
            expectedPresentations: presentations.length, subject }))}>Présenter {subjectLabel[subject]}</button>)}</div>
        {witnessError && <p role="alert">Présentation non confirmée. Relis le registre, puis réessaie.</p>}
      </> : <p role="status">Les témoins ont consigné le retour de la triade et les deux pièces.</p>}
    </section>}
    {!terminal && <div className={styles.controls} aria-label="Commandes du Quatza-Rij">
      {visibleControls.map(([id, action, label]) => <button key={id} type="button" data-quatza-control={id}
        disabled={!running || blocked || suspended} aria-label={label} onPointerDown={event => touch(event, id)}
        onPointerUp={event => touch(event, id)} onPointerCancel={event => touch(event, id)}
        onLostPointerCapture={event => touch(event, id)}>{label} · {controlActionShortcut(action, bindings)}</button>)}
    </div>}
  </div>;
}

const rescueControls = controls.filter(([id]) => id === 'left' || id === 'right' || id === 'interact' || id === 'signal');

function rescueObjective(frame: QuatzaRescueFrame) {
  const name = companionName[frame.patient];
  switch (frame.phase) {
    case 'report': return `Rejoins le témoin à pied et signale l’absence de ${name}.`;
    case 'departure': return 'Rejoins la sortie du camp pour engager le secours.';
    case 'track': return 'À portée de la trace, utilise le signal pour retrouver le chasseur.';
    case 'treat': return `Approche de ${name}, immobilise-toi et maintiens Interagir pour stabiliser la blessure.`;
    case 'carry': return `Ramène ${name} jusqu’au refuge et interagis pour quitter le terrain.`;
    case 'return': return `Présente ${name} au témoin du camp pour confirmer l’évacuation.`;
    case 'reunited': return `Le témoin a confirmé le retour de ${name} après le secours.`;
    case 'interrupted': return `Secours interrompu. L’absence de ${name} reste consignée dans cette tentative.`;
  }
}

function Recovery({ save, hunt, rescue, attempts, onCommand, suspended = false }: Props & {
  hunt: QuatzaFrame; rescue: QuatzaRescue; attempts: number;
}) {
  const [frame, setFrame] = useState(() => replayQuatzaRescue(hunt, rescue.input)!);
  const [running, setRunning] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [width, setWidth] = useState(900);
  const node = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const current = useRef(frame);
  const input = useRef(0);
  const buffer = useRef<number[]>([]);
  const savedTick = useRef(rescue.input.length);
  const commit = useRef(onCommand);
  const bindings = save.settings.controlBindings ?? DEFAULT_CONTROL_BINDINGS;
  const terminal = quatzaRescueFinished(frame.phase);
  useEffect(() => { commit.current = onCommand; }, [onCommand]);
  useEffect(() => {
    if (!surface.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(surface.current);
    return () => observer.disconnect();
  }, []);
  const flush = useCallback(() => {
    if (!buffer.current.length) return true;
    const pending = [...buffer.current];
    if (!commit.current({ type: 'advance-rescue', mode: 'triad', expectedAttempts: attempts,
      id: rescue.id, expectedTick: savedTick.current, input: pending })) {
      input.current = 0;
      setBlocked(true);
      setRunning(false);
      return false;
    }
    savedTick.current += pending.length;
    buffer.current.length = 0;
    return true;
  }, [attempts, rescue.id]);
  const stop = useCallback(() => {
    input.current = 0;
    setRunning(false);
    flush();
  }, [flush]);
  useEffect(() => {
    if (!running || suspended || blocked) return;
    let animation = 0, previous = 0, accumulated = 0;
    const tick = (time: number) => {
      accumulated += previous ? Math.min(45, time - previous) : 0;
      previous = time;
      while (accumulated >= 1000 / 60) {
        accumulated -= 1000 / 60;
        const code = (input.current & 3) === 3 ? input.current & ~3 : input.current;
        const before = current.current;
        const next = stepQuatzaRescue(before, code);
        current.current = next;
        buffer.current.push(code);
        if ((before.phase !== next.phase || buffer.current.length >= 60) && !flush()) break;
        if (quatzaRescueFinished(next.phase)) { setRunning(false); break; }
      }
      setFrame(current.current);
      if (!quatzaRescueFinished(current.current.phase)) animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [blocked, flush, running, suspended]);
  useEffect(() => {
    if (!running) return;
    if (suspended) {
      const animation = requestAnimationFrame(stop);
      return () => cancelAnimationFrame(animation);
    }
    const keyboard = (event: KeyboardEvent) => {
      if (!node.current?.contains(document.activeElement) || event.altKey || event.ctrlKey || event.metaKey) return;
      const match = rescueControls.find(([, action]) => matchesControlAction(action, event, bindings));
      if (!match) return;
      event.preventDefault();
      const bit = QUATZA_INPUT[match[0]];
      input.current = event.type === 'keydown' ? input.current | bit : input.current & ~bit;
    };
    const loseFocus = () => { if (document.hidden || !document.hasFocus()) stop(); };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('keyup', keyboard);
    window.addEventListener('blur', loseFocus);
    document.addEventListener('visibilitychange', loseFocus);
    return () => {
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('keyup', keyboard);
      window.removeEventListener('blur', loseFocus);
      document.removeEventListener('visibilitychange', loseFocus);
    };
  }, [bindings, running, stop, suspended]);
  const field = frame.phase === 'track' || frame.phase === 'treat' || frame.phase === 'carry';
  const carriesPatient = frame.phase === 'carry' || frame.phase === 'return';
  const patientVisible = frame.phase === 'treat' || carriesPatient || frame.phase === 'reunited';
  const readsWitness = frame.phase === 'report' || frame.phase === 'return' || frame.phase === 'reunited';
  const marker = readsWitness ? QUATZA_POSTS.witness : frame.phase === 'departure' ? QUATZA_POSTS.departure :
    frame.phase === 'track' ? frame.traceX : frame.phase === 'treat' ? frame.lastSeenX : QUATZA_POSTS.refuge;
  const markerLabel = readsWitness ? QUATZA_RETURN_WITNESS.name : frame.phase === 'departure' ? 'Départ du camp' :
    frame.phase === 'track' ? 'Dernière trace' : frame.phase === 'treat' ? companionName[frame.patient] : 'Refuge';
  const camera = Math.max(0, Math.min(QUATZA_WIDTH - width, frame.x - width * .42));
  return <section ref={node} data-quatza-rescue={rescue.id} data-phase={frame.phase} data-tick={frame.tick}
    data-x={frame.x} data-patient={frame.patient} data-care={frame.careTicks}
    aria-label="Secours de la triade"
    onBlur={event => {
      if (running && (!(event.relatedTarget instanceof Node) || !node.current?.contains(event.relatedTarget))) stop();
    }}>
    <div className={styles.heading}>
      <strong>{terminal ? 'Compte rendu du secours' : 'Secours de la triade'}</strong>
      {!terminal && (running ? <button type="button" onClick={stop}>Pause</button> :
        <button type="button" disabled={suspended || blocked}
          onClick={() => { setRunning(true); surface.current?.focus(); }}>Reprendre le secours</button>)}
    </div>
    {blocked && <p role="alert">Sauvegarde du secours à confirmer. <button type="button"
      disabled={suspended} onClick={() => { if (flush()) setBlocked(false); }}>Réessayer</button></p>}
    <div className={styles.viewport} ref={surface} tabIndex={0} aria-label="Terrain de secours">
      <div className={styles.world} style={{ transform: `translateX(${-camera}px)` }}>
        <div className={styles.land} />
        {field && QUATZA_PLATFORMS.map(place => <span key={place.left} className={styles.platform}
          style={{ left: place.left, top: place.y, width: place.right - place.left }} />)}
        {frame.phase !== 'interrupted' && <span className={styles.marker} data-ready
          style={{ left: marker, top: QUATZA_FLOOR - 28 }}>{markerLabel}</span>}
        {readsWitness && <ReturnWitness save={save} />}
        <div className={styles.actor} style={{ left: frame.x, top: QUATZA_FLOOR }}>
          <div><HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={['wristblades']}
            gearIds={[]} facing={frame.facing} size={108} label="Ton chasseur" pose={frame.previous & 3 ? 'run' : 'idle'}
            phase={frame.tick / 8} /></div>
        </div>
        {patientVisible && <div className={styles.actor} data-quatza-recovery-patient={frame.patient}
          data-carried={carriesPatient} style={{ left: carriesPatient ? frame.x - 30 * frame.facing :
            frame.phase === 'reunited' ? frame.x - 46 : frame.lastSeenX, top: carriesPatient ? QUATZA_FLOOR - 45 : QUATZA_FLOOR }}>
          <span className={styles.actorName}>{companionName[frame.patient]}</span>
          <div className={frame.phase === 'reunited' ? undefined : styles.wounded}>
            <HunterRigPreview appearance={save.appearance} armorId={frame.patient === hunt.companions[0]?.id ? 'scout' : save.loadout.armorId}
              weaponIds={['wristblades']} gearIds={[]} size={98} label={companionName[frame.patient]} />
          </div>
        </div>}
      </div>
    </div>
    <p className={styles.status} role="status">{rescueObjective(frame)}</p>
    {frame.phase === 'treat' && <progress aria-label="Stabilisation de la blessure" value={frame.careTicks} max={24} />}
    {!terminal && <div className={styles.controls} aria-label="Commandes du secours">
      {rescueControls.map(([id, action, label]) => <button key={id} type="button" data-quatza-rescue-control={id}
        disabled={!running || suspended || blocked} aria-label={label} onPointerDown={event => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          input.current |= QUATZA_INPUT[id];
        }} onPointerUp={() => { input.current &= ~QUATZA_INPUT[id]; }}
        onPointerCancel={() => { input.current &= ~QUATZA_INPUT[id]; }}
        onLostPointerCapture={() => { input.current &= ~QUATZA_INPUT[id]; }}>{label} · {controlActionShortcut(action, bindings)}</button>)}
    </div>}
  </section>;
}

export default function QuatzaRijScene(props: Props & { mode: QuatzaMode }) {
  const { save, mode, onCommand, suspended } = props;
  const expedition = save.quatzaRij?.expeditions[mode];
  const mayStart = canEnterQuatza(save, mode);
  if (!expedition && !mayStart) return null;
  const attempts = expedition?.attempts.length ?? 0;
  const attempt = expedition?.attempts.at(-1);
  const hunt = mode === 'triad' && attempt?.phase === 'retreated' ? replayQuatzaAttempt(mode, attempt.input, attempt.returnRules, attempt.roster) : null;
  const absent = hunt && quatzaMissingCompanion(hunt);
  return <section id={'quatza-expedition-' + mode} className={styles.quest} data-quatza-campaign aria-label={title[mode]}>
    <h3>{title[mode]}</h3>
    {attempt && !attempt.rescue && <Expedition key={attempts} {...props} attempt={attempt} attempts={attempts} />}
    {hunt && attempt?.rescue && <Recovery key={attempt.rescue.id} {...props} hunt={hunt}
      rescue={attempt.rescue} attempts={attempts} />}
    {absent && !attempt?.rescue && <div className={styles.testimony}>
      <p role="status" data-quatza-absence={absent.id}>{companionName[absent.id]} manque au retour du terrain.</p>
      <button type="button" data-quatza-open-rescue disabled={!!suspended || !mayStart}
        onClick={() => onCommand({ type: 'begin-rescue', mode: 'triad', expectedAttempts: attempts })}>Ouvrir le secours</button>
    </div>}
    {canRetryQuatza(mode, attempt) && <button type="button" data-quatza-begin={mode}
      disabled={!!suspended || !mayStart}
      onClick={() => onCommand({ type: 'begin', mode, expectedAttempts: attempts })}>{attempt ? 'Préparer une nouvelle tentative' : 'Préparer l’expédition'}</button>}
  </section>;
}
