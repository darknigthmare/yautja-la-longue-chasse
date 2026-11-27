import HomeworldCivilianV72 from "./HomeworldCivilianV72";
import {
  triadCityAtlasTargetM016, triadCityInvitationReadyM016, triadCityRoutesM016,
  type TriadCityM016, type TriadCityRosterChoiceM016, type TriadCityRouteM016, type TriadCityStationM016,
} from "./systems/homeworldTriadM016";
import town from "./HomeworldCity.module.css";
import styles from "./HomeworldTriadM016.module.css";

export function HomeworldTriadPartnerM016({ station, position, depth, reducedMotion }: {
  station: TriadCityStationM016;
  position: { x: number; y: number };
  depth: number;
  reducedMotion: boolean;
}) {
  return (
    <div className={styles.actor} data-homeworld-m016-partner={station.partner}
      style={{ left: position.x, top: position.y, zIndex: depth }}>
      <HomeworldCivilianV72 npcId={station.partner} role={station.partner === "saar" ? "instructor" : "apprentice"}
        facing={station.partner === "yena" || station.partner === "tov" ? 1 : -1}
        height={station.partner === "tov" ? 98 : undefined} reducedMotion={reducedMotion} />
      <span className={styles.actorName}>{station.name}</span>
    </div>
  );
}

function routeLabel(route: TriadCityRouteM016) {
  return route.purpose === "gallery" ? "Rejoindre la galerie par les Terrasses"
    : `Itinéraire vers ${route.station.name} · ${route.station.district}`;
}

export function HomeworldTriadJournalM016({ ledger, roomId, disabled, onGuide }: {
  ledger?: TriadCityM016;
  roomId: string | null;
  disabled: boolean;
  onGuide: (point: string) => void;
}) {
  const routes = triadCityRoutesM016(ledger, roomId);
  return (
    <section className={town.help} aria-label="Préparer les rencontres de triade" data-homeworld-m016-journal>
      <strong>Former la triade</strong>
      {routes.length ? (
        <ul className={styles.routes}>
          {routes.map(route => (
            <li key={route.station.partner}>
              <button type="button" className="ghost-button small" disabled={disabled}
                data-homeworld-m016-route={route.station.partner}
                onClick={() => onGuide(triadCityAtlasTargetM016(route))}>{routeLabel(route)}</button>
            </li>
          ))}
        </ul>
      ) : <p>Saar et Vek t’attendent dans la galerie. Parle au maître des terrasses.</p>}
    </section>
  );
}

export default function HomeworldTriadM016({ station, step, disabled, onward, onAdvance, onGuide }: {
  station: TriadCityStationM016;
  step: number;
  disabled: boolean;
  onward?: TriadCityRouteM016;
  onAdvance: (step: number) => void;
  onGuide: (point: string) => void;
}) {
  const invited = triadCityInvitationReadyM016(station, step);
  const seen = Math.min(step, station.demonstration.length);
  return (
    <section className={town.notice} aria-label={station.name + " · " + station.lesson}
      data-homeworld-m016-station={station.partner} data-phase={step}>
      <h4>{station.name} · {station.lesson}</h4>
      {station.partner === "saar" || station.partner === "tov" ? (
        <div className={styles.latch} data-state={seen} aria-hidden="true">
          <i className={styles.bar} /><i className={styles.slot} />
        </div>
      ) : (
        <div className={styles.trail} aria-hidden="true">
          {station.demonstration.map((gesture, index) => <i key={gesture} data-observed={index < seen} />)}
        </div>
      )}
      <p role="status">{station.cues[seen]} · {station.speech[step]}</p>
      {invited ? (
        <>
          <strong>Rendez-vous confirmé</strong>
          {onward && <button type="button" data-homeworld-m016-onward={onward.station.partner} disabled={disabled}
            onClick={() => onGuide(triadCityAtlasTargetM016(onward))}>{routeLabel(onward)}</button>}
        </>
      ) : (
        <button type="button" data-homeworld-m016-advance={station.partner} disabled={disabled} onClick={() => onAdvance(step)}>
          {station.demonstration[step] ?? "Proposer de former la triade"}
        </button>
      )}
    </section>
  );
}

export function HomeworldTriadRosterM016({ roster, disabled, onChoose }: {
  roster?: "yena-tov";
  disabled: boolean;
  onChoose: (choice: TriadCityRosterChoiceM016) => void;
}) {
  return (
    <section className={town.notice} aria-label="Choisir les deux partenaires de la galerie" data-homeworld-m016-roster={roster ?? "historic"}>
      <h4>Composition de la triade</h4>
      <p>Yena propose l’approche et Tov tient l’ouverture. Vous attribuerez les postes définitifs dans la galerie.</p>
      <button type="button" disabled={disabled} aria-pressed={roster === "yena-tov"} data-homeworld-m016-roster-choice="yena-tov"
        onClick={() => onChoose("yena-tov")}>Retenir Yena et Tov</button>
      <button type="button" disabled={disabled} aria-pressed={roster !== "yena-tov"} data-homeworld-m016-roster-choice="historic"
        onClick={() => onChoose("historic")}>Garder Saar et Vek</button>
    </section>
  );
}
