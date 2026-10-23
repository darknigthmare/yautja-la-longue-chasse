'use client';
import { useState } from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import { HOMEWORLD_CARTOGRAPHY_V104 as b, HOMEWORLD_CARTOGRAPHY_LINES_V104 as lines, HOMEWORLD_CARTOGRAPHY_OPTION_V104 as option, HOMEWORLD_CARTOGRAPHY_SCENE_V104 as scene } from './systems/homeworldCartographyDefinitionV104';
import type { HomeworldCartographyLedgerV104 } from './systems/homeworldCartographyLedgerV104';
import type { CartographyActionV104 } from './systems/homeworldCartographyV104';
import styles from './HomeworldCartographyV104.module.css';

function KnownMap({ ledger }: { ledger: HomeworldCartographyLedgerV104 | undefined }) {
  const r = ledger?.receipt;
  const parts=r?r.trail.reduce<NonNullable<typeof r>['trail'][]>((all,p,index)=>{if(index===0||r.trailBreaks.includes(index))all.push([]);all.at(-1)!.push(p);return all;},[]):[];
  return <><svg className={styles.map} viewBox="5740 4910 720 470" role="img" aria-label={`Relevé de la cour déjà connue du port : ${r?.nextWaypoint ?? 0} repères parcourus sur deux. Les autres quartiers ne sont pas affichés.`}>
    <title>Cour du registre · repères visibles et trajet réellement marché</title>
    {parts.map((part,index)=><polyline key={index} points={part.map(p => `${p.x},${p.y}`).join(' ')} />)}
    <circle cx={b.post.x} cy={b.post.y} r="11"/><text x={b.post.x - 135} y={b.post.y + 65}>Pupitre</text>
    {b.waypoints.map((p, index) => <g key={p.id}><circle cx={p.x} cy={p.y} r="11" data-reached={(r?.nextWaypoint ?? 0) > index}/><text x={p.x - 60} y={p.y - 35}>{index + 1} · {index === 0 ? 'Bac' : 'Lampe'}</text></g>)}
  </svg><p className={styles.note}>Les zones non observées restent hors du relevé.</p>{!!r?.trimmedCount&&<p className={styles.note}>Les segments les plus anciens ont été retirés du dessin. Tes repères atteints restent consignés.</p>}</>;
}

export default function HomeworldCartographyV104({ ledger, disabled, message, onAction, onClose, reducedMotion = false, highPointCompleted = false }: {
  ledger: HomeworldCartographyLedgerV104 | undefined; disabled: boolean; message: string;
  onAction(action: CartographyActionV104, expectedRevision: number): boolean; onClose(): void; reducedMotion?: boolean; highPointCompleted?: boolean;
}) {
  const [showSource, setShowSource] = useState(false), r = ledger?.receipt;
  const line = r ? lines.find(l => l.kind === (r.phase === 'choice' ? 'CHOIX' : r.phase === 'completed' ? 'SUCCES' : 'REPONSE') && (l.option === 'B' || l.kind === 'SUCCES')) : null;
  const submit = (action: CartographyActionV104) => onAction(action, ledger?.revision ?? 0);
  return <section className={styles.scene} data-cartography-scene-v104={b.sceneId} data-cartography-phase={r?.phase ?? 'offer'}>
    <p className={styles.eyebrow}>Cour du registre · Port des Chasses</p>
    <p>Le cartographe reçoit au pupitre une liaison entre deux repères visibles de cette cour. Rejoins le bac de basalte, puis la lampe, et reviens lui montrer le trajet.</p>
    <KnownMap ledger={ledger}/>
    {line && <article className={styles.line} data-cartography-source-line={line.id}><strong>{line.speaker}</strong><YautjaTranslationV67 text={line.text} paused={disabled} reducedMotion={reducedMotion}/></article>}
    <div className={styles.actions}>
      {!r && <button type="button" disabled={disabled} onClick={() => submit('choose-b')}>Tracer une route entre les points connus</button>}
      {r?.phase === 'choice' && <button type="button" disabled={disabled} onClick={() => submit('reply')}>Écouter le cartographe</button>}
      {r?.phase === 'ready' && <button type="button" disabled={disabled} onClick={() => { if (submit('start')) onClose(); }}>Partir à pied vers le bac</button>}
      {r?.phase === 'return' && <button type="button" disabled={disabled} onClick={() => submit('report')}>Présenter la liaison parcourue</button>}
      {r?.phase === 'interrupted' && <p>Le relevé conserve {r.nextWaypoint}/2 repères. Reprends au dernier point enregistré depuis le carnet de marche.</p>}
      {r?.phase === 'walking' && <p>Le relevé conserve {r.nextWaypoint}/2 repères. La prochaine approche se vérifie pendant ta marche.</p>}
      <button type="button" onClick={onClose}>Revenir à la cour</button>
    </div>
    {message && <p className={styles.feedback} role="status">{message}</p>}
    {r?.phase === 'completed' && <p>Les deux repères et le retour au pupitre sont consignés. Le relevé reste consultable ici.</p>}
    <p className={styles.note}>{highPointCompleted ? 'Ton observation datée depuis le point haut reste conservée dans son relevé.' : 'Le point haut reste à explorer dans un autre parcours.'} Cette liaison ne révèle aucun quartier et ne remet aucun équipement.</p>
    <button type="button" aria-expanded={showSource} onClick={() => setShowSource(v => !v)}>Origine de cette demande</button>
    {showSource && <aside className={styles.source}><strong>{scene.title}</strong><p>{option.action}</p><p>Texte original du projet V6, présenté en traduction française. Poste, pupitre de lecture et apparence neutre adaptés localement ; aucun doublage enregistré ni nouvel accessoire peint.</p><p>La branche du point haut et son ouverture évoquant une crête ne sont pas jouées dans cette cour.</p><small>{scene.address} · {option.address}</small></aside>}
  </section>;
}

export function HomeworldCartographyJournalV104({ ledger, blocked, message, writePaused, onResume, onRetry }: {
  ledger: HomeworldCartographyLedgerV104 | undefined; blocked: boolean; message: string; writePaused: boolean; onResume(): void; onRetry(): void;
}) {
  const r = ledger?.receipt;
  const walkingReceipt = r && ['walking', 'return', 'interrupted'].includes(r.phase) ? r : null;
  if (!walkingReceipt && !writePaused) return null;
  return <aside className={styles.journal} aria-label="Carnet de la liaison du port" data-cartography-journal-v104 data-cartography-waypoints={r?.nextWaypoint ?? 0} data-cartography-status={r?.phase ?? 'offer'}>
    {walkingReceipt ? <><strong>{walkingReceipt.phase === 'interrupted' ? 'Marche interrompue' : walkingReceipt.phase === 'return' ? 'Retour au cartographe' : 'Liaison du port'} · {walkingReceipt.nextWaypoint}/2 repères</strong>
      <span>{walkingReceipt.nextWaypoint===2 ? 'Reviens au pupitre du registre pour présenter ta liaison.' : `Prochaine approche : ${b.waypoints[walkingReceipt.nextWaypoint].label}.`}</span></>
      : <strong>Enregistrement du relevé suspendu</strong>}
    {walkingReceipt?.phase === 'interrupted' && <button type="button" disabled={blocked} onClick={onResume}>Reprendre au dernier point sûr</button>}
    {writePaused && <button type="button" onClick={onRetry}>Réessayer l’enregistrement du relevé</button>}
    {message && <span role="status">{message}</span>}
  </aside>;
}
