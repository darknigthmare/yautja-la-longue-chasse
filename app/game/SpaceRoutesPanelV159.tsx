"use client";

import { useContext, useId, useState } from "react";
import { GalaxyRouteDestinationContext } from "./GalaxyRouteDestinationContext";
import styles from "./SpaceRoutesPanelV159.module.css";
import { shipForId } from "./shipCatalogue";
import {
  SPACE_ROUTE_DESTINATIONS_V159,
  SPACE_ROUTE_TYPES_V159,
  pendingSpaceIncidentV159,
  planSpaceRouteV159,
  spaceBaseV159,
  spaceIncidentV159,
  spaceRouteV159,
  spaceRoutesFromV159,
  spaceSystemNameV159,
  spaceLegacyTripV159,
  createSpaceRoutesV159,
  type SpacePersonalShipV159,
  type SpaceRoutesActionV159,
  type SpaceRoutesResultV159,
  type SpaceRoutesStateV159,
} from "./systems/spaceRoutesV159";

export interface SpaceRoutesPanelV159Props {
  ownerCreatedAt: string;
  /** Saved state; null/absent means no route has been engaged yet. */
  state: SpaceRoutesStateV159 | null;
  ship: SpacePersonalShipV159;
  disabled?: boolean;
  /** Persists the action first; the panel only shows what the save confirmed. */
  onAction: (action: SpaceRoutesActionV159) => SpaceRoutesResultV159;
}

export default function SpaceRoutesPanelV159({ ownerCreatedAt, state, ship, disabled = false, onAction }: SpaceRoutesPanelV159Props) {
  const [message, setMessage] = useState<string | null>(null);
  const mapDestination = useContext(GalaxyRouteDestinationContext);
  const [manualDestination, setManualDestination] = useState<{ mapDestination: string | null; id: string } | null>(null);
  const itineraryTitleId = useId();
  const mapDestinationId = mapDestination && SPACE_ROUTE_DESTINATIONS_V159.includes(mapDestination) ? mapDestination : "";
  const destination = manualDestination && manualDestination.mapDestination === mapDestination
    ? manualDestination.id
    : mapDestinationId;
  const view = state ?? createSpaceRoutesV159(ownerCreatedAt);
  const trip = view.trip;
  const itineraryOrigin = trip?.toSystemId ?? view.currentSystemId;
  const itinerary = destination ? planSpaceRouteV159(itineraryOrigin, destination) : null;
  const firstSegment = itinerary?.segments[0];
  const pending = pendingSpaceIncidentV159(view);
  const run = (action: SpaceRoutesActionV159) => {
    if (disabled) return;
    setMessage(onAction(action).message);
  };
  const tripRoute = trip ? spaceRouteV159(trip.routeId) : null;
  const resolved = trip?.incident && trip.incident.option !== null ? spaceIncidentV159(trip.incident.incidentId) : null;
  const lastArrival = view.arrivals.at(-1) ?? null;

  return (
    <section className={styles.panel} aria-labelledby="space-routes-v159-title" data-space-routes-v159
      data-location={view.location.kind} data-current-system={view.currentSystemId}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Poste de route · routes typées</p>
        <h2 id="space-routes-v159-title">
          {trip ? `En route vers ${spaceSystemNameV159(trip.toSystemId)}` : `Vaisseau à ${spaceSystemNameV159(view.currentSystemId)}`}
        </h2>
        <p className={styles.ship} data-ship-owned={ship.owned}>
          {ship.owned && ship.shipId ? `Vaisseau personnel : ${shipForId(ship.shipId).name}` : ship.reason}
        </p>
      </header>

      <section className={styles.itinerary} aria-labelledby={itineraryTitleId} data-space-itinerary
        data-itinerary-from={itineraryOrigin} data-itinerary-destination={destination}>
        <h3 id={itineraryTitleId}>Préparer un itinéraire</h3>
        <label className={styles.destination}>
          <span>Destination de l’itinéraire</span>
          <select value={destination} onChange={(event) => setManualDestination({ mapDestination, id: event.target.value })}>
            <option value="">Choisir un système</option>
            {SPACE_ROUTE_DESTINATIONS_V159.map((id) => <option key={id} value={id}>{spaceSystemNameV159(id)}</option>)}
          </select>
        </label>
        {destination && (
          <p role="status" className={styles.note}>
            {itinerary && firstSegment
              ? `${trip ? "Après l’arrivée à" : "Depuis"} ${spaceSystemNameV159(itineraryOrigin)} · ${itinerary.legs} étapes de base, hors incidents.`
              : itinerary
                ? trip ? "Ce système est la destination du voyage en cours." : "Le vaisseau est déjà dans ce système."
                : "Aucune liaison connue vers ce système."}
          </p>
        )}
        {itinerary && firstSegment && (
          <>
            <ol className={styles.routes} aria-label="Liaisons de l’itinéraire">
              {itinerary.segments.map(({ route, fromSystemId, toSystemId }) => {
                const type = SPACE_ROUTE_TYPES_V159[route.type];
                return (
                  <li key={route.id} className={styles.route} data-itinerary-route={route.id} data-route-type={route.type}>
                    <div>
                      <strong>{spaceSystemNameV159(fromSystemId)} → {spaceSystemNameV159(toSystemId)}</strong>
                      <span>{type.label} · risque {type.risk} · {route.legs} étapes</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            {!trip && (
              <button type="button" className="ghost-button" disabled={disabled || !ship.owned}
                onClick={() => run({ kind: "engage", routeId: firstSegment.route.id })}>
                Engager la première liaison
              </button>
            )}
          </>
        )}
      </section>

      {!trip && (
        <ul className={styles.routes} aria-label="Routes depuis ce système">
          {spaceRoutesFromV159(view.currentSystemId).map((entry) => {
            const type = SPACE_ROUTE_TYPES_V159[entry.type];
            const destination = entry.systems[0] === view.currentSystemId ? entry.systems[1] : entry.systems[0];
            return (
              <li key={entry.id} className={styles.route} data-route-id={entry.id} data-route-type={entry.type}>
                <div>
                  <strong>{spaceSystemNameV159(destination)}</strong>
                  <span>{type.label} · risque {type.risk} · {entry.legs} étapes</span>
                  <small>{type.typical}</small>
                </div>
                <button type="button" className="ghost-button" disabled={disabled || !ship.owned}
                  onClick={() => run({ kind: "engage", routeId: entry.id })}>
                  Engager la route
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {trip && tripRoute && (
        <div className={styles.trip} data-trip-id={trip.tripId} data-legs-done={trip.legsDone} data-legs-total={trip.legsTotal}>
          <p>
            {SPACE_ROUTE_TYPES_V159[tripRoute.type].label} · {spaceSystemNameV159(trip.fromSystemId)} → {spaceSystemNameV159(trip.toSystemId)}
            {" "}· étape {trip.legsDone}/{trip.legsTotal}
          </p>
          <p className={styles.note} data-trip-ship-id={trip.manifest.shipId}>
            Appareil au manifeste · {shipForId(trip.manifest.shipId).name}
          </p>
          <progress max={trip.legsTotal} value={trip.legsDone} aria-label="Progression du trajet" />
          {spaceLegacyTripV159(view, ship) && (
            <p className={styles.note} data-legacy-trip>
              Voyage engagé avant l’exigence du reçu de vaisseau : il peut aller jusqu’à son arrivée. Un nouveau départ exigera la mission « Une coque vraiment acquise » conclue au chantier naval.
            </p>
          )}
          {!pending && (
            <button type="button" className="alien-button" disabled={disabled}
              onClick={() => run({ kind: "advance" })}>
              {trip.legsDone + 1 >= trip.legsTotal ? "Achever le trajet" : "Parcourir l’étape suivante"}
            </button>
          )}
          {resolved && trip.incident && trip.incident.option !== null && (
            <p className={styles.resolved} data-incident-resolved={resolved.id}>
              {resolved.id} · {resolved.title} : « {resolved.choices[trip.incident.option]} » enregistré.
            </p>
          )}
        </div>
      )}

      {pending && (
        <article className={styles.incident} aria-labelledby="space-incident-v159-title" data-incident-id={pending.id}>
          <p className={styles.eyebrow}>{pending.id} · {pending.trigger}</p>
          <h3 id="space-incident-v159-title">{pending.title}</h3>
          <p>Lieu : {pending.baseId} — {spaceBaseV159(pending.baseId)?.title ?? "base inconnue"}</p>
          <p>Action : {pending.action}.</p>
          <p className={styles.note}>{pending.entry}</p>
          <div className={styles.choices}>
            {pending.choices.map((choice, index) => (
              <button key={choice} type="button" className="alien-button" disabled={disabled}
                data-choice={index} onClick={() => run({ kind: "choose", option: index as 0 | 1 })}>
                {choice}
              </button>
            ))}
          </div>
          <p className={styles.note}>{pending.consequence}</p>
        </article>
      )}

      {!trip && lastArrival && (
        <p className={styles.resolved} data-last-arrival={lastArrival.tripId}>
          Dernière arrivée : {spaceSystemNameV159(lastArrival.toSystemId)} ({lastArrival.legs} étapes).
        </p>
      )}
      {message && <p className={styles.message} aria-live="polite">{message}</p>}
    </section>
  );
}
