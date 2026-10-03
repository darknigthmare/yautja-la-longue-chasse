import { PIT_FINISHER_CHOICES_V80, type PitFinisherChoiceV80, type PitFinisherViewV80 } from './systems/pitFinishersV80';
import styles from './PitFinishersV80.module.css';

export function PitFinisherHudV80({ view, onChoose, onSkip }: { view: PitFinisherViewV80;
  onChoose: (choice: PitFinisherChoiceV80) => void; onSkip: () => void }) {
  if (view.phase === 'idle' || view.phase === 'ready' || view.phase === 'complete') return null;
  const choosing = view.phase === 'window';
  return <aside className={styles.hud} data-pit-finisher-hud data-phase={view.phase} data-nonlethal={view.nonlethal}
    aria-label="Conclusion du duel">
    <div className={styles.caption} role="status" aria-live="polite">
      <strong>{choosing ? 'CONCLUEZ LE DUEL' : view.profile?.label}</strong>
      <span>{view.nonlethal ? 'NEUTRALISATION · ÉPREUVE NON LÉTALE' : 'FINITIONS STYLISÉES · SIMULATION HORS CANON'}</span>
    </div>
    {choosing ? <>
      <small>J{view.winnerSlot === 0 ? 1 : 2} · attaque légère/lourde + neutre / bas / avant / arrière · A/X + direction · Pause : Start/Échap</small>
      <div className={styles.choices}>{PIT_FINISHER_CHOICES_V80.map((label, index) => <button key={label} type="button"
        data-pit-finisher-choice={index} disabled={view.options.cpuWinner}
        onClick={() => onChoose(index as PitFinisherChoiceV80)}>{index + 1} · {label}</button>)}</div>
      <small aria-hidden="true">{Math.max(0, Math.ceil((view.durationMs - view.elapsedMs) / 1000))} s</small>
    </> : <small>Conclusion du duel en cours.</small>}
    <button className={styles.skip} type="button" data-pit-finisher-skip onClick={onSkip}>Passer la conclusion</button>
  </aside>;
}
