"use client";

import styles from "./HomeworldHub.module.css";
import { SPACE_ROUTE_TYPES_V159, spaceSystemNameV159 } from "./systems/spaceRoutesV159";
import {
  homeworldRouteChoicesM034,
  homeworldRouteFactsM034,
  homeworldRouteHuntNameM034,
  homeworldRouteKitM034,
  type HomeworldRouteActionM034,
  type HomeworldRouteM034,
} from "./systems/homeworldRouteM034";

const categoryLabels = { hunt: "Chasse", survey: "Exploration", service: "Service" } as const;

type BriefingProps = {
  briefing: NonNullable<ReturnType<typeof homeworldRouteChoicesM034>>;
  route: HomeworldRouteM034 | null;
  disabled: boolean;
  onAction: (action: HomeworldRouteActionM034) => void;
};

export function HomeworldRouteOfficerM034({ briefing, route, disabled, onAction }: BriefingProps) {
  return (
    <section className={styles.notice} aria-label="Choisir la prochaine route" data-homeworld-route-m034-officer>
      <h4>Choisir la prochaine route</h4>
      {briefing.blocked && <p>{briefing.blocked}</p>}
      <p>Départ · {spaceSystemNameV159(briefing.currentSystemId)}</p>
      <ul>
        {briefing.choices.map(({ destinationId, kind, body, itinerary, unlocked, ...target }) => {
          const selected = route?.destinationId === destinationId && route.originSystemId === briefing.currentSystemId;
          return (
            <li key={destinationId}>
              <p><strong>{categoryLabels[kind]} · {body.name}</strong></p>
              {kind === "hunt" && "missionId" in target && <p>{homeworldRouteHuntNameM034(target.missionId)}</p>}
              {kind === "survey" && <p>Relevé d’approche · {body.signal}</p>}
              {kind === "service" && <p>Kit de relais · {body.signal}</p>}
              <p>{itinerary.legs ? "Étapes de route · " + itinerary.legs : "Dans le système de départ"}</p>
              {itinerary.segments.length > 0 && (
                <ol>
                  {itinerary.segments.map(({ route, toSystemId }) => (
                    <li key={route.id}>{spaceSystemNameV159(toSystemId)} · {SPACE_ROUTE_TYPES_V159[route.type].label} · risque {SPACE_ROUTE_TYPES_V159[route.type].risk}</li>
                  ))}
                </ol>
              )}
              <button type="button" data-homeworld-route-m034-choice={destinationId} aria-pressed={selected}
                disabled={disabled || !!briefing.blocked || !unlocked || selected || route?.phase === "prepared"}
                onClick={() => onAction({ kind: "plan", destinationId })}>
                {!unlocked ? "Contrat verrouillé" : "Désigner " + body.name}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HomeworldRouteBoardingM034({ route, disabled, onAction }: {
  route: HomeworldRouteM034;
  disabled: boolean;
  onAction: BriefingProps["onAction"];
}) {
  const facts = homeworldRouteFactsM034(route.originSystemId, route.destinationId);
  if (!facts) return null;
  return (
    <section className={styles.notice} aria-label="Manifeste d’expédition" data-homeworld-route-m034-manifest={route.phase}>
      <h4>Manifeste d’expédition</h4>
      <p>{categoryLabels[facts.kind]} · {facts.body.name}</p>
      <p>Point à vérifier · {facts.body.hazard}</p>
      {route.phase === "prepared"
        ? <p>Kit contrôlé · {homeworldRouteKitM034(route.fieldKit).join(" · ")}</p>
        : <button type="button" className={styles.primary} data-homeworld-route-m034-seal
            disabled={disabled} onClick={() => onAction({ kind: "seal" })}>Vérifier le kit et sceller le manifeste</button>}
    </section>
  );
}

export function HomeworldRouteJournalM034({ route, disabled, onGuide }: {
  route: HomeworldRouteM034;
  disabled: boolean;
  onGuide: (id: string) => void;
}) {
  const facts = homeworldRouteFactsM034(route.originSystemId, route.destinationId);
  if (!facts) return null;
  return (
    <section className={styles.youthHudV64} aria-label="Préparation de la prochaine route" data-homeworld-route-m034={route.phase}>
      <strong>{facts.body.name} · {categoryLabels[facts.kind]}</strong>
      {route.phase === "planned"
        ? <><p>Rejoins le sas de transfert orbital pour contrôler le kit.</p>
          <button type="button" disabled={disabled} onClick={() => onGuide("point:personal-ship")}>Indiquer le sas</button></>
        : <p>Manifeste scellé · itinéraire disponible sur la carte de bord.</p>}
    </section>
  );
}
