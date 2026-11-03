import { auditPitFidelityV91, getPitFidelityV91 } from './systems/pitFidelityV91';
import { pitTechniqueUnavailableReason } from './systems/pitEquipmentV57';

// Static registry coverage, computed once. It is not save data or asset readiness.
const coverage = auditPitFidelityV91().counts;
const moveNames = { light: 'Frappe légère', medium: 'Frappe moyenne', heavy: 'Frappe lourde', technique: 'Technique' } as const;

/** Source scopes describe this identity/profile, never certify every costume or drawing. */
export default function PitFidelityNoticeV91({ fighterId, variantId, className, showCoverage = false }: {
  fighterId: string;
  variantId?: string | null;
  className?: string;
  showCoverage?: boolean;
}) {
  const entry = getPitFidelityV91(fighterId);
  if (!entry) return null;
  const unavailableTechnique = pitTechniqueUnavailableReason(fighterId, variantId);
  return <section className={className} aria-label={`Fidélité et sources de ${entry.name}`}
    data-pit-fidelity-notice={entry.fighterId} data-pit-fidelity-identity={entry.identity}
    data-pit-fidelity-species={entry.species} data-pit-fidelity-moveset={entry.moveset}
    data-pit-fidelity-certified={entry.certifiedOneToOne} data-pit-fidelity-variant={variantId ?? 'default'}>
    {showCoverage ? <p data-pit-fidelity-roster-coverage>
      Référence d’audit V91 : {coverage.versus}/{coverage.runtime} combattants répertoriés · {coverage.sharedProfiles} profils de duel partagés à cette date.
      {' '}Ce total ne signifie ni autant de Yautja officiels, ni autant de kits personnalisés. Aucune fidélité 1:1 certifiée.
    </p> : null}
    <p><strong>{entry.summary}</strong></p>
    <p>{entry.note}</p>
    <details data-pit-fidelity-sources>
      <summary>Références, limites et coups du duel ({entry.sources.length} sources)</summary>
      <p>Cette fiche distingue les sources du personnage et les règles adaptées du duel. Elle ne certifie pas les sprites ou toutes les variantes de costume.</p>
      {entry.sources.length ? <ul>{entry.sources.map(source => <li key={source.url}>
        <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
        <p><strong>Portée :</strong> {source.supports}</p>
        <p><strong>Limite :</strong> {source.doesNotEstablish}</p>
      </li>)}</ul> : <p>Aucune référence spécifique n’est attachée à cette fiche ; le nom et le visuel fournis ne valident pas un équipement ou une capacité.</p>}
      <ul data-pit-fidelity-move-labels>{(['light', 'medium', 'heavy', 'technique'] as const).map(kind =>
        <li key={kind}><strong>{moveNames[kind]} :</strong> {kind === 'technique' && unavailableTechnique
          ? unavailableTechnique : entry.moveLabels[kind]}</li>)}</ul>
      <p>{entry.cloak === 'disabled' ? 'Camouflage indisponible dans ce profil de duel.'
        : 'Camouflage autorisé par les règles du duel ; cette fiche ne certifie pas sa disponibilité dans chaque incarnation ou costume.'}</p>
    </details>
  </section>;
}
