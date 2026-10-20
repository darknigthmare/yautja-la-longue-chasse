import type { homeworldRouteGuidanceV98 } from './systems/homeworldWayfindingV98';
import { homeworldWayfindingMetresV75 } from './systems/homeworldWayfindingV75';
import styles from './HomeworldRouteGuideV98.module.css';

export default function HomeworldRouteGuideV98({ label, targetId, guidance, interactionShortcut, suspended, calculating = false, onRecalculate, onChange, onClear }: {
  label: string; targetId: string; guidance: NonNullable<ReturnType<typeof homeworldRouteGuidanceV98>>;
  interactionShortcut: string; suspended: boolean; calculating?: boolean;
  onRecalculate(): void; onChange(): void; onClear(): void;
}) {
  return <aside className={styles.guide} aria-label="Itinéraire à pied dans la cité" data-homeworld-route-guide-v98={guidance.state} data-homeworld-route-target-v98={targetId} data-homeworld-route-paused-v98={suspended}>
    <small>{suspended ? 'Repère suspendu' : calculating ? 'Calcul du passage en cours…' : guidance.stage?.interiorId ? 'DANS LA SALLE' : `À PIED · ÉTAGE ${guidance.stage?.levelId ?? '?'}`}</small>
    <strong>{label}</strong>
    <p className={styles.direction}>{guidance.direction}{guidance.state !== 'off-route' && <span> · {homeworldWayfindingMetresV75(guidance.remaining)} m</span>}</p>
    <p className={styles.instruction}>{guidance.instruction}{guidance.state === 'arrived' && <kbd>{interactionShortcut}</kbd>}</p>
    <div><button type="button" disabled={suspended || calculating} onClick={onRecalculate}>Recalculer</button><button type="button" disabled={suspended} onClick={onChange}>Carte</button><button type="button" disabled={suspended} aria-label="Effacer l’itinéraire à pied" onClick={onClear}>×</button></div>
  </aside>;
}
