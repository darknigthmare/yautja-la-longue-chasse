"use client";

import { CNTLIP_CODEX_V77, CNTLIP_SITES_V77, cntlipAffinitiesV77, cntlipAvailableMemoriesV77, cntlipSafeSiteV77,
  type CntlipStateV77, type CntlipContextV77 } from './systems/cntlipV77';
import type {CntlipLedgerActionV77} from './systems/cntlipLedgerV77';

export interface HomeworldCntlipV77Props {
  state: CntlipStateV77;
  context: CntlipContextV77;
  /** Parent performs validated durable transaction and fresh-context checks. */
  onAction(action: CntlipLedgerActionV77): void;
  onSit(): void;
  onLeave(): void;
  message: string;
  invited?:boolean;
  writePaused?:boolean;
  canResumeScene?:boolean;
  onResumeScene?():void;
}

/** Draft view: semantic controls and data, no pretend drinking sprite.
 * Reuse the established in-game dialog shell/focus trap during integration.
 * Native sit/mask-off/pour/sip assets remain an explicit art requirement. */
export default function HomeworldCntlipV77({ state, context, onAction, onSit, onLeave, message, invited=false,writePaused=false,canResumeScene=false,onResumeScene }: HomeworldCntlipV77Props) {
  const site = CNTLIP_SITES_V77.find(entry => entry.id === context.siteId);
  const availableMemories = cntlipAvailableMemoriesV77(context);
  const affinity = cntlipAffinitiesV77(state);
  const observing = context.rank === 'youngling' || context.rank === 'unblooded';
  const safe = !!cntlipSafeSiteV77(context);
  return <section aria-label="C’ntlip · halte du clan" data-cntlip-site-v77={site?.id ?? 'unavailable'}>
    <h3>{site?.label ?? 'Rejoins un lieu de rencontre'}</h3>
    <p>Écouter, partager ou repartir reste ton choix. Cette réception et son hôte sont des créations originales du jeu ; elles n’attribuent aucun rang, trophée ou gain de combat.</p>
    {message && <p role="status" aria-live="polite">{message}</p>}
    <details>
      <summary>C’ntlip · données connues et usages du clan</summary>
      <ul>{CNTLIP_CODEX_V77.known.map(text => <li key={text}>{text}</li>)}</ul>
      <p>Inconnus : {CNTLIP_CODEX_V77.unknown.join(' ')}</p>
      <p>{CNTLIP_CODEX_V77.adaptation}</p>
    </details>
    <button type="button" disabled={!safe || !!state.pending} onClick={() => onAction({ type: 'learn' })}>Écouter les usages, sans boire</button>
    {!context.sceneActive&&canResumeScene&&onResumeScene&&<button type="button" onClick={onResumeScene}>Reprendre cette halte après la pause</button>}
    {!invited&&!observing&&<button type="button" disabled={!safe||!!state.pending} onClick={()=>onAction({type:'accept-hospitality'})}>Recevoir l’invitation de l’hôte · quatre portions une seule fois</button>}
    <p data-cntlip-stock-v77>Réserve de cette table : {context.servingStock} portion(s). Aucune réserve infinie ; les portions interrompues restent utilisées.</p>
    {!context.seated && <button type="button" disabled={!safe || !!state.pending} onClick={onSit}>Prendre place auprès de la table</button>}
    {context.seated && !observing && <>
      <button type="button" disabled={!safe || !!state.pending || context.servingStock < 1} onClick={() => onAction({ type: 'start-serving' })}>Prendre une coupe</button>
      {availableMemories.map(memory => <button key={memory.id} type="button" disabled={!safe || !!state.pending || context.servingStock < 1}
        onClick={() => onAction({ type: 'start-serving', memoryId: memory.id })}>
        Partager un récit · {memory.title}{affinity[memory.participantId] ? ' · déjà écouté' : ''}
      </button>)}
      <button type="button" disabled={!safe || !!state.pending || state.activeDoses === 0} onClick={() => onAction({ type: 'rest' })}>Choisir une halte de deux heures</button>
    </>}
    {observing && <p>Tu peux observer la table et découvrir les récits du clan. La consommation n’est pas ouverte dans ce parcours de jeunesse.</p>}
    {state.pending && <>
      <p aria-live="off">Le geste est en cours · {Math.ceil((3_000 - state.pending.elapsedMs) / 1_000)} s.</p>
      <button type="button" onClick={() => onAction({ type: 'cancel-serving' })}>Interrompre la préparation</button>
      {writePaused&&<button type="button" disabled={!safe} onClick={()=>onAction({type:'advance-serving',elapsedMs:1})}>Réessayer l’enregistrement et reprendre le geste</button>}
    </>}
    <p>Les sprites natifs pour s’asseoir, servir et boire ne sont pas encore produits. Le geste est temporisé ; aucune fausse animation du corps ne remplace ces images.</p>
    <button type="button" onClick={onLeave}>Repartir sans autre coupe · préparation conservée en pause</button>
  </section>;
}
