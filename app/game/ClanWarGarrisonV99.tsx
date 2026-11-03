"use client";

import { useId, useRef, useState } from "react";
import { warGarrisonIssueV99, warGarrisonV85, type WarGarrisonDraftV99, type WarSimulationV85 } from "./systems/clanWarV85";
import styles from "./ClanWarGarrisonV99.module.css";

export default function ClanWarGarrisonV99({ simulation, territoryId, disabled = false, onChange }: {
  simulation: WarSimulationV85; territoryId: string; disabled?: boolean;
  onChange(draft: WarGarrisonDraftV99): boolean;
}) {
  const root = useRef<HTMLDetailsElement>(null);
  const issueId = useId();
  const [pending, setPending] = useState<{ id: string; revision: number } | null>(null);
  if (simulation.territories[territoryId]?.controller !== "CON-F01") return null;
  const people = simulation.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === territoryId);
  const guards = warGarrisonV85(simulation, territoryId);
  const pendingPerson = pending?.revision === simulation.revision ? people.find(actor => actor.id === pending.id) : undefined;
  const pendingDraft = pendingPerson ? { territoryId, combatantId: pendingPerson.id, garrison: false, confirmLastGuard: true } : null;
  const canConfirm = !!pendingDraft && guards.length === 1 && !warGarrisonIssueV99(simulation, pendingDraft);
  function focusPerson(id: string) {
    window.requestAnimationFrame(() => {
      // Imported archives may contain punctuation in otherwise valid identities.
      // Compare the value directly instead of inserting it into a CSS selector.
      const row = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-war-garrison-person]") ?? []).find(item => item.getAttribute("data-war-garrison-person") === id);
      row?.focus({ preventScroll: true });
    });
  }
  function requestLastGuard(id: string) {
    setPending({ id, revision: simulation.revision });
    window.requestAnimationFrame(() => {
      const confirmation = root.current?.querySelector<HTMLElement>("[data-war-last-guard-confirm-v99]");
      confirmation?.scrollIntoView({ block: "nearest", behavior: "auto" });
      confirmation?.querySelector<HTMLElement>("[data-war-keep-guard-v99]")?.focus({ preventScroll: true });
    });
  }
  function submit(draft: WarGarrisonDraftV99) {
    if (disabled) return;
    if (onChange(draft)) { setPending(null); focusPerson(draft.combatantId); }
  }
  return <details ref={root} className={styles.garrison} data-testid="war-garrison-v99" data-war-garrison-site={territoryId}>
    <summary>Garnison sur place · {guards.length} garde{guards.length > 1 ? "s" : ""}</summary>
    <p>Affectez les personnes présentes, ou rendez-les aux mobiles. La relève est locale et immédiate ; les revenus restent calculés au prochain tour.</p>
    <ul>{people.map((actor, index) => {
      const draft = { territoryId, combatantId: actor.id, garrison: !actor.garrison };
      const issue = warGarrisonIssueV99(simulation, { ...draft, confirmLastGuard: true });
      const lastGuard = actor.garrison && guards.length === 1;
      const descriptionId = `${issueId}-${index}`;
      return <li key={actor.id} data-war-garrison-person={actor.id} tabIndex={-1}>
        <div><strong>{actor.id}</strong><span>{actor.status === "dead" ? "Décédé · registre conservé" : actor.status === "wounded" ? "Blessé" : actor.trainingUntilTurn !== null ? "Soins ou formation en cours" : actor.garrison ? "Garde apte" : "Mobile apte"}</span></div>
        <button type="button" disabled={disabled || !!issue} aria-describedby={issue ? descriptionId : undefined} onClick={() => {
          if (lastGuard) requestLastGuard(actor.id); else submit(draft);
        }}>{actor.garrison ? `Libérer ${actor.id} de la garde` : `Affecter ${actor.id} à la garde`}</button>
        {issue && <small id={descriptionId}>{issue}</small>}
      </li>;
    })}</ul>
    {people.length === 0 && <p>Aucune personne de votre détachement n’est présente ici. Rapprochez une colonne par les routes existantes.</p>}
    {canConfirm && <div className={styles.confirm} role="group" aria-label="Retrait du dernier garde" data-war-last-guard-confirm-v99>
      <p><strong>Retirer le dernier garde de {territoryId.replace("CON-", "")} ?</strong> Le site reste sous votre contrôle, mais ne produira plus sans nouvelle garnison. Les objectifs peuvent aussi rester incomplets.</p>
      <button type="button" disabled={disabled} onClick={() => submit(pendingDraft!)}>Confirmer le retrait de {pendingPerson!.id}</button>
      <button type="button" disabled={disabled} data-war-keep-guard-v99 onClick={() => { const id = pendingPerson!.id; setPending(null); focusPerson(id); }}>Conserver ce garde</button>
    </div>}
  </details>;
}
