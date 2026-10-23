import type {PitWorkbookConclusionStateV107, PitWorkbookConclusionKeyV107} from './systems/pitWorkbookConclusionsV107';
import type {PitFinisherViewV80} from './systems/pitFinishersV80';
import styles from './PitFinishersV80.module.css';

export function PitWorkbookConclusionHudV107({state, legacy, ready, onChoose, onSkip}: {
  state: PitWorkbookConclusionStateV107; legacy: PitFinisherViewV80; ready: boolean;
  onChoose: (key: PitWorkbookConclusionKeyV107) => void; onSkip: () => void;
}) {
  if (state.phase === 'idle' || state.phase === 'complete' || state.phase === 'window' && legacy.phase !== 'window' ||
      !state.available.FATALITE_2 && !state.available.CLEMENCE) return null;
  const choosing = state.phase === 'window';
  return <aside className={styles.hud} data-pit-workbook-conclusion-hud-v107 data-phase={state.phase} aria-label="Conclusion de Scar">
    <div className={styles.caption} role="status" aria-live="polite">
      <strong>{choosing ? 'CONCLUEZ LE DUEL' : state.actionKey === 'CLEMENCE' ? 'LE DUEL SUFFIT' : 'LA POINTE ET LE SILENCE'}</strong>
      <span>DUEL ALTERNATIF · OBJECTIF DE SESSION</span>
    </div>
    {choosing ? <>
      <small>J{state.winnerSlot === 0 ? 1 : 2} · légère/lourde : conclusion autorisée · bas + attaque : le duel suffit</small>
      <div className={styles.choices}>
        <button type="button" data-pit-workbook-conclusion-v107="FATALITE_2" disabled={!ready || !state.available.FATALITE_2 || legacy.options.cpuWinner} onClick={() => onChoose('FATALITE_2')}>La pointe et le silence</button>
        <button type="button" data-pit-workbook-conclusion-v107="CLEMENCE" disabled={!ready || !state.available.CLEMENCE || legacy.options.cpuWinner} onClick={() => onChoose('CLEMENCE')}>Le duel suffit · récupérer la balise</button>
      </div>
      {!state.available.FATALITE_2 && <small>Issue létale indisponible dans ce contexte.</small>}
      <small>Le retrait du dispositif d’épreuve reste distinct d’un désarmement d’arme offensive.</small>
      <small aria-hidden="true">{Math.max(0, Math.ceil((legacy.durationMs - legacy.elapsedMs) / 1000))} s</small>
    </> : <small>Deux acteurs indépendants · le résultat du combat est conservé.</small>}
    <button type="button" className={styles.skip} data-pit-workbook-conclusion-skip-v107 onClick={onSkip}>Passer la conclusion</button>
  </aside>;
}
