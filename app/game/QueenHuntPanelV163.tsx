import {
  QUEEN_HUNT_CONTRACTS_V163, QUEEN_HUNT_DESCENT_V163, QUEEN_HUNT_RANK_NOTE_V163, queenHuntContractV163,
  type QueenHuntAccessV163, type QueenHuntStateV163,
} from "./systems/queenHuntV163";

export interface QueenHuntPanelV163Props {
  access: QueenHuntAccessV163;
  state: QueenHuntStateV163 | null;
  /** Annonce honnête : les Xénomorphes V7 n'apparaissent qu'à certaines rencontres. */
  nextEncounterShowsXeno: boolean;
  busy: boolean;
  onTake(contractId: string): void;
  onAbandon(): void;
  onLaunch(): void;
  onClose(): void;
}

const OUTCOME_LABELS = { reussi: "réussi", echoue: "échoué", replie: "repli" } as const;
const FIRST_QUEEN_LABELS = { non_resolu: "non résolu", reussi: "réussi", echoue: "échoué", replie: "repli" } as const;

export default function QueenHuntPanelV163({ access, state, nextEncounterShowsXeno, busy, onTake, onAbandon, onLaunch, onClose }: QueenHuntPanelV163Props) {
  const active = state?.activeContract ? queenHuntContractV163(state.activeContract.contractId) : null;
  const results = state?.results ?? [];
  return (
    <section className="screen panel-screen" aria-labelledby="queen-hunt-title" data-queen-hunt-v163>
      <div className="screen-safe">
        <p className="eyebrow">Mode Queen Hunt · contrats de ruche</p>
        <h1 id="queen-hunt-title">Queen Hunt</h1>
        <p>{QUEEN_HUNT_RANK_NOTE_V163}</p>
        {!access.allowed && (
          <div role="status" data-queen-hunt-locked>
            <h2>Accès fermé</h2>
            <ul>{access.missing.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        <h2>Contrats de ruche (valeurs proposées par la bible)</h2>
        <ul data-queen-hunt-contracts>
          {QUEEN_HUNT_CONTRACTS_V163.map(contract => (
            <li key={contract.id} data-queen-hunt-size={contract.size}>
              <h3>{contract.label}</h3>
              <p>Contenu : {contract.content} · Temps indicatif : {contract.durationMinutes} min</p>
              <p>Récompense prévue par la bible : {contract.rewardText} — non versée dans cette version.</p>
              <p>Exigence (proposée) : réussir la mission support avec un score d’au moins {contract.minimumScore}.</p>
              <button type="button" className="ghost-button" disabled={busy || !access.allowed || !!state?.activeContract}
                onClick={() => onTake(contract.id)}>Prendre ce contrat</button>
            </li>
          ))}
        </ul>
        <div className="source-badge" data-queen-hunt-support>
          Mission support (proposée) : « Chaleur sous la glace » (Nivalis-K). Drones et prétorien xénomorphes figurent dans son
          bestiaire, mais la cible finale reste le Cryostalker Alpha : aucune reine n’apparaît. Le sprite de reine reste à produire.
          {" "}{nextEncounterShowsXeno ? "La prochaine rencontre déploie le bestiaire xénomorphe." : "La prochaine rencontre ne déploie pas le bestiaire xénomorphe (une rencontre sur trois)."}
        </div>
        {active && state?.activeContract && (
          <div data-queen-hunt-active>
            <h2>Contrat en cours : {active.label}</h2>
            <p>Lié à la sortie n° {state.activeContract.encounterRun + 1} de la mission support.</p>
            <button type="button" className="primary-button" disabled={busy} onClick={onLaunch}>Préparer la chasse</button>
            {" "}
            <button type="button" className="ghost-button" disabled={busy} onClick={onAbandon}>Rendre le contrat</button>
          </div>
        )}
        <h2>{QUEEN_HUNT_DESCENT_V163.label}</h2>
        <p data-queen-hunt-descent>{QUEEN_HUNT_DESCENT_V163.rule} {QUEEN_HUNT_DESCENT_V163.leaderboard}</p>
        <p><strong>{QUEEN_HUNT_DESCENT_V163.status}</strong></p>
        <h2>Première reine (jalon commun)</h2>
        <p data-first-queen-resolved={state?.firstQueenResolved.value ?? "non_resolu"}>
          firstQueenResolved : {FIRST_QUEEN_LABELS[state?.firstQueenResolved.value ?? "non_resolu"]}. Seule la reine active de XP-Z12
          (Xeno Prime · Le Berceau enfoui) écrit ce jalon ; le vestige XP-Z09 et les contrats de ruche ne l’écrivent jamais.
        </p>
        <h2>Registre des contrats</h2>
        {results.length === 0 ? <p>Aucun contrat réglé.</p> : (
          <ol data-queen-hunt-results>
            {results.slice(-10).reverse().map(r => (
              <li key={r.eventId}>{queenHuntContractV163(r.contractId)?.label} · {OUTCOME_LABELS[r.outcome]} · score {r.score}
                {r.xenoEncountered ? " · Xénomorphes rencontrés" : " · sans Xénomorphe rencontré"}</li>
            ))}
          </ol>
        )}
        <button type="button" className="ghost-button" onClick={onClose}>Retour au pont</button>
      </div>
    </section>
  );
}
