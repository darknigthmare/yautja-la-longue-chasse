"use client";

import { useState } from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import { BIBLE_CULTURAL_BINDING_V86, BIBLE_CULTURAL_CHOICES_V86, BIBLE_CULTURAL_LINES_V86, BIBLE_CULTURAL_SCENE_V86,
  bibleCulturalReceiptV86, type BibleCulturalContextV86, type BibleSceneActionV86, type BibleSceneLedgerV86, type BibleSceneResultV86 } from './systems/bibleSceneCulturalV86';
import styles from './BibleSceneCulturalV86.module.css';

const progression = [
  { type: 'choose-b', label: 'Rester sans boire', detail: 'Choix B : intention de rester. La sélection ne termine pas la halte.' },
  { type: 'reply', label: 'Écouter la réponse', detail: 'La réponse source vient de l’hôte présent ; aucune voix enregistrée.' },
  { type: 'sit', label: 'Prendre place', detail: 'Geste narré auprès de la table. Le personnage doit rester arrêté au point de halte.' },
  { type: 'listen', label: 'Écouter volontairement', detail: 'Vous choisissez d’écouter sans transmettre une histoire personnelle non établie.' },
  { type: 'tidy', label: 'Aider au rangement et terminer', detail: 'Le rangement est narré ; aucun transfert de coupe ou résultat matériel n’est simulé.' },
] as const;

/** Mounted inside the existing world dialog, never as a second modal. The
 * parent commits each action before updating the controlled ledger. */
export default function BibleSceneCulturalV86({ ledger, context, onAction, onClose, message = '', reducedMotion = false }: {
  ledger: BibleSceneLedgerV86 | null | undefined; context: BibleCulturalContextV86;
  onAction: (action: BibleSceneActionV86) => BibleSceneResultV86; onClose: () => void; message?: string; reducedMotion?: boolean;
}) {
  const [feedback, setFeedback] = useState<{ owner: string; operationId: string | null; text: string } | null>(null);
  const [showSource, setShowSource] = useState(false), [paused, setPaused] = useState(false);
  const receipt = bibleCulturalReceiptV86(ledger, context), choice = BIBLE_CULTURAL_CHOICES_V86.find(option => option.option === 'B')!;
  const currentLine = BIBLE_CULTURAL_LINES_V86.find(line => line.id === receipt?.presentedLineIds.at(-1));
  const next = progression[receipt?.step ?? 0], busy = !context.eligible;
  const status = feedback?.owner === context.ownerSaveCreatedAt && feedback.operationId === context.operationId ? feedback.text : message;
  function submit(action: BibleSceneActionV86) {
    const result = onAction(action);
    setFeedback({ owner: context.ownerSaveCreatedAt, operationId: context.operationId, text: result.message });
    return result.ok;
  }
  function leave() {
    if (receipt?.status === 'active' && !submit({ type: 'interrupt' })) return;
    onClose();
  }
  return <section className={styles.scene} aria-label="Halte de retour · dialogue Bible V6" data-bible-scene-v86={BIBLE_CULTURAL_BINDING_V86.sceneId}
    data-bible-scene-step={receipt?.step ?? 'not-started'} data-bible-scene-status={receipt?.status ?? 'not-started'}>
    <header className={styles.header}><p>Veilleurs des Crêtes · halte de retour</p><h3>{BIBLE_CULTURAL_BINDING_V86.npcName}</h3>
      <small>Texte original V6 · traduction visuelle · aucun doublage enregistré</small></header>
    {!context.eligible && <p className={styles.denial} role="status">{context.denial}</p>}
    {currentLine ? <article className={styles.line} data-bible-source-line={currentLine.id}>
      <p className={styles.speaker}>{currentLine.speaker}</p>
      <div className={styles.text}><YautjaTranslationV67 text={currentLine.text} paused={paused || busy} reducedMotion={reducedMotion} /></div>
      <p className={styles.gesture}>{currentLine.gesture}</p>
      <small>{currentLine.address}</small>
    </article> : <div className={styles.line}><p className={styles.speaker}>Votre prochaine action</p><p>{choice.action}</p>
      <small>L’ouverture évoquant une boisson déjà servie reste silencieuse : aucun service réel n’est installé ici.</small></div>}
    <div className={styles.progress} aria-label="Étapes de la halte"><span>Étape {receipt?.step ?? 0} / 5</span><span>Option B · sans boisson</span>
      <span>{receipt?.status === 'resolved' ? 'Halte narrative consignée' : receipt?.status === 'interrupted' ? 'Interrompue' : 'Actions choisies et narrées'}</span></div>
    {!receipt ? <button type="button" className={styles.primary} disabled={busy} onClick={() => submit({ type: 'open' })}>Commencer la halte à cette table</button>
      : receipt.status === 'interrupted' ? <button type="button" className={styles.primary} disabled={busy} onClick={() => submit({ type: 'resume' })}>Reprendre la halte conservée</button>
      : receipt.status === 'active' && next && <div className={styles.action}><p>{next.detail}</p><button type="button" className={styles.primary} disabled={busy} onClick={() => submit({ type: next.type })}>{next.label}</button></div>}
    <p className={styles.limit}>Les gestes assis, de service et de rangement ne disposent pas de clips natifs. Cette halte joue ses deux répliques de choix/réponse et consigne des actions narrées. Elle n’accorde ni XP, objet, soin, trophée, stock ni réussite matérielle.</p>
    {receipt?.status === 'resolved' && <p className={styles.complete}>Votre retour et votre choix sans boisson sont consignés. La réplique de réussite matérielle reste silencieuse.</p>}
    {status && <p className={styles.feedback} role="status">{status}</p>}
    <div className={styles.controls}><button type="button" disabled={!currentLine} onClick={() => setPaused(value => !value)}>{paused ? 'Reprendre la traduction' : 'Pause de la traduction'}</button>
      <button type="button" aria-expanded={showSource} onClick={() => setShowSource(value => !value)}>Conditions et source</button>
      <button type="button" onClick={leave}>{receipt?.status === 'resolved' ? 'Quitter la halte' : 'Interrompre et quitter'}</button></div>
    {showSource && <aside className={styles.source} aria-label="Conditions originales de la scène">
      <h4>{BIBLE_CULTURAL_SCENE_V86.title}</h4><p><b>Lieu source :</b> {BIBLE_CULTURAL_SCENE_V86.location}</p>
      <p><b>Liaison locale :</b> hôte dédié, table native du Refuge des Trois Vents. Son emplacement et son apparence sont des adaptations du jeu, sans certification 1:1.</p>
      <p><b>Entrée :</b> {BIBLE_CULTURAL_SCENE_V86.conditions}</p><p><b>Connaissances :</b> {BIBLE_CULTURAL_SCENE_V86.knowledge}</p>
      <p><b>Reprise :</b> {BIBLE_CULTURAL_SCENE_V86.repetition}</p><p><b>Option B :</b> {choice.conditions}</p><p>{choice.consequence}</p>
      {currentLine && <p><b>Condition de la réplique :</b> {currentLine.condition}</p>}
      <p><b>Option A inactive :</b> le site ne dispose d’aucun stock acquis ou geste matériel de service. Le texte de la corde cédée reste silencieux faute d’événement établi.</p>
      <small>{BIBLE_CULTURAL_SCENE_V86.address} · {choice.address} · une seule scène partiellement raccordée, pas les 730 scènes implantées.</small>
    </aside>}
  </section>;
}
