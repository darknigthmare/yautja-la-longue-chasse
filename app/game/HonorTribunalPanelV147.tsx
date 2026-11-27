"use client";
import { useEffect, useRef, useState } from "react";
import type { SaveGame } from "./types";
import { applyTribunalActionToSaveV147 } from "./save";
import { CHRONICLE_RANK_LABELS } from "./systems/clanChronicle";
import {
  GRAVITY_LABELS_V147, INFRACTIONS_V147, JUDGE_LABELS_V147, REPARATION_TRIAL_PLACEHOLDER_V147, TRACE_KIND_LABELS_V147,
  accusationCaseV147, baseGravityV147, callableWitnesses, defenseTraces, tribunalStatusV147,
  type TribunalActionV147, type TribunalOutcomeV147,
} from "./systems/honorTribunalV147";
import justiceStyles from "./JusticePanel.module.css";
import styles from "./HonorTribunalPanelV147.module.css";

export type TribunalUpdateV147 = Pick<SaveGame, "profile" | "justice" | "tribunalV147">;
export interface HonorTribunalPanelV147Props {
  save: SaveGame;
  /** Must persist the three fields in one transaction and return true only once stored. */
  onCommit: (update: TribunalUpdateV147) => boolean;
  onNotify?: (message: string) => void;
}

const OUTCOME_LABELS: Record<TribunalOutcomeV147, string> = {
  acquitted: "Acte non établi", blame: "Blâme", judgment: "Jugement : réparation et gel du rang", exile: "Exil (voie Bad Blood)",
};
const STEP_LABELS = { accusation: "1 · L'accusation", defense: "2 · Tes preuves", witnesses: "3 · Tes témoins", deliberation: "4 · Le verdict" } as const;
const SHOWS_LABELS = { act: "établit l'acte", constraint: "montre une contrainte", contrary: "contredit l'accusation" } as const;
const kindLabel = (kind: string) => INFRACTIONS_V147.find(d => d.id === kind)?.label ?? kind;

/** Played trial (bible : « Tribunal et sanctions »). Shown with the justice dossier. */
export default function HonorTribunalPanelV147({ save, onCommit, onNotify }: HonorTribunalPanelV147Props) {
  const current = useRef(save);
  const [message, setMessage] = useState("");
  useEffect(() => { current.current = save; }, [save]);
  const tribunal = save.tribunalV147 ?? null;
  const status = tribunalStatusV147(tribunal);
  const trial = tribunal?.trial ?? null;
  const infraction = trial ? tribunal!.infractions.find(i => i.id === trial.infractionId) ?? null : null;
  const pending = tribunal?.infractions.filter(i => !i.verdictId) ?? [];

  const perform = (action: TribunalActionV147) => {
    const { update, result } = applyTribunalActionToSaveV147(current.current, action);
    if (result.ok && result.changed) {
      let stored = false;
      try { stored = onCommit(update); } catch { /* Nothing is announced before durable acknowledgement. */ }
      if (!stored) { setMessage("Enregistrement non confirmé : le procès reste à l'étape précédente."); return; }
      current.current = { ...current.current, ...update };
    }
    setMessage(result.message); onNotify?.(result.message);
  };

  return <section className={`${justiceStyles.group} ${styles.tribunal}`} aria-labelledby="tribunal-v147-heading" data-tribunal-v147={status.label}>
    <p className={justiceStyles.eyebrow}>CODE D'HONNEUR · TRIBUNAL DU CLAN</p>
    <h3 id="tribunal-v147-heading">Tribunal et sanctions</h3>
    <dl className={justiceStyles.metrics}>
      <div><dt>Statut</dt><dd>{status.label}</dd></div>
      <div><dt>Honneur</dt><dd>{save.profile.honor}</dd></div>
      <div><dt>Rang</dt><dd>{CHRONICLE_RANK_LABELS[save.profile.rankId]}{status.frozen ? " · gelé" : ""}</dd></div>
      <div><dt>Seconde chance</dt><dd>{tribunal?.secondChanceUsed ? "Déjà donnée" : "Disponible"}</dd></div>
    </dl>
    <p role="status" aria-live="polite" className={justiceStyles.message}>{message || (tribunal?.infractions.length
      ? "Chaque affaire est jugée sur ce qui est montré au procès : pièces de l'accusation, tes preuves et tes témoins."
      : "Aucune infraction enregistrée. Le tribunal ne juge que des actes établis, avec leurs témoins et leurs traces.")}</p>

    {!trial && pending.length > 0 && <div className={justiceStyles.cards}>
      {pending.map(i => <article key={i.id}>
        <h4>{kindLabel(i.kind)}</h4>
        <p>{JUDGE_LABELS_V147[i.jurisdiction === "inter-clan" ? "adjudicator" : "clan-elder"]} juge cette affaire {i.jurisdiction === "inter-clan" ? "entre clans" : "interne"}. Barème : {GRAVITY_LABELS_V147[baseGravityV147(tribunal!, i)]}.</p>
        <p>{i.witnesses.length} témoin(s) et {i.traces.length} trace(s) enregistrés.</p>
        <button type="button" disabled={status.definitiveExile} onClick={() => perform({ type: "open-trial", infractionId: i.id })}>Comparaître</button>
      </article>)}
    </div>}

    {trial && infraction && <section className={justiceStyles.confirm} aria-labelledby="tribunal-v147-trial">
      <h4 id="tribunal-v147-trial">Procès · {kindLabel(infraction.kind)}</h4>
      <p>{JUDGE_LABELS_V147[trial.judge]} préside. Barème : {GRAVITY_LABELS_V147[baseGravityV147(tribunal!, infraction)]}.</p>
      <ol className={styles.steps}>{(Object.keys(STEP_LABELS) as (keyof typeof STEP_LABELS)[]).map(step =>
        <li key={step} aria-current={trial.step === step ? "step" : undefined}>{STEP_LABELS[step]}</li>)}</ol>

      {trial.step === "accusation" && <div className={justiceStyles.actions}>
        <button type="button" onClick={() => perform({ type: "hear-accusation" })}>Entendre l'accusation</button>
      </div>}

      {trial.step !== "accusation" && <div className={styles.columns}>
        <div><h4>Pièces de l'accusation</h4><ul>
          {accusationCaseV147(infraction).traces.map(t => <li key={t.id}>{TRACE_KIND_LABELS_V147[t.kind]} · {t.label}</li>)}
          {accusationCaseV147(infraction).witnesses.map(w => <li key={w.id}>Témoin à charge · {w.name}</li>)}
          {!accusationCaseV147(infraction).traces.length && !accusationCaseV147(infraction).witnesses.length && <li>Aucune pièce présentée.</li>}
        </ul></div>
        <div><h4>Ta défense</h4><ul>
          {defenseTraces(infraction).map(t => <li key={t.id}>{TRACE_KIND_LABELS_V147[t.kind]} · {t.label}
            {trial.presentedTraceIds.includes(t.id) ? <strong> — présentée, {SHOWS_LABELS[t.shows]}</strong>
              : trial.step === "defense" && <button type="button" onClick={() => perform({ type: "present-evidence", traceId: t.id })}>Présenter</button>}
          </li>)}
          {!defenseTraces(infraction).length && <li>Aucune pièce à ta décharge au dossier.</li>}
          {callableWitnesses(infraction).map(w => <li key={w.id}>Témoin · {w.name} ({w.role === "companion" ? "compagnon" : "pack"})
            {trial.calledWitnessIds.includes(w.id) ? <strong> — {w.account === "confirms-player" ? "confirme ta version" : "ne confirme pas"}</strong>
              : trial.step === "witnesses" && <button type="button" onClick={() => perform({ type: "call-witness", witnessId: w.id })}>Appeler</button>}
          </li>)}
        </ul></div>
      </div>}

      {trial.step === "defense" && <div className={justiceStyles.actions}><button type="button" onClick={() => perform({ type: "close-evidence" })}>Clore la présentation des preuves</button></div>}
      {trial.step === "witnesses" && <div className={justiceStyles.actions}><button type="button" onClick={() => perform({ type: "close-witnesses" })}>Clore l'audition des témoins</button></div>}
      {trial.step === "deliberation" && <div className={justiceStyles.actions}><button type="button" onClick={() => perform({ type: "hear-verdict" })}>Entendre le verdict</button></div>}
      <p>Un procès bien mené (preuve d'une contrainte et témoin qui confirme) peut faire descendre la peine d'un cran. Une preuve contraire écarte l'exil.</p>
    </section>}

    {tribunal?.reparation && <section className={justiceStyles.detention} aria-labelledby="tribunal-v147-reparation">
      <h4 id="tribunal-v147-reparation">{tribunal.reparation.kind === "imposed" ? "Épreuve imposée" : "Épreuve de réparation"}</h4>
      <p>{REPARATION_TRIAL_PLACEHOLDER_V147}</p>
      <p>Chasses terminées : {save.statistics.missionsCompleted} (au verdict : {tribunal.reparation.missionsCompletedAtSentence}).</p>
      <button type="button" onClick={() => perform({ type: "complete-reparation" })}>Présenter l'épreuve accomplie</button>
    </section>}

    {tribunal?.exile && <section className={justiceStyles.detention} aria-labelledby="tribunal-v147-exile">
      <h4 id="tribunal-v147-exile">{tribunal.exile.definitive ? "Exil définitif" : "Exil · voie Bad Blood"}</h4>
      <p>L'accès à la cité et au navire de clan est fermé. Tes rangs restent écrits, mais tu ne peux plus en gagner dans le clan.</p>
      {status.canSurrender && <button type="button" onClick={() => perform({ type: "surrender" })}>Se rendre au clan (seule seconde chance)</button>}
    </section>}

    {tribunal && tribunal.verdicts.length > 0 && <details className={styles.history}><summary>Verdicts rendus ({tribunal.verdicts.length})</summary><ul>
      {tribunal.verdicts.map(v => <li key={v.id}>{kindLabel(tribunal.infractions.find(i => i.id === v.infractionId)?.kind ?? "")} · {OUTCOME_LABELS[v.outcome]}{v.reduced ? " (peine descendue d'un cran)" : ""}{v.definitive ? " · définitif" : ""} · −{v.honorLost} honneur · {JUDGE_LABELS_V147[v.judge]}</li>)}
    </ul></details>}

    <p className={justiceStyles.limit}>Restent à produire : l'enregistrement des infractions par les chasses elles-mêmes (aucun système de jeu n'en inscrit encore), les traques d'Enforcers pendant les chasses de l'exilé, le ralliement à la Rogue Space Tribe, et le rôle de juge du joueur au Level 8.</p>
  </section>;
}
