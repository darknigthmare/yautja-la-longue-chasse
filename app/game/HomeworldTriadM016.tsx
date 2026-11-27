import HomeworldCivilianV72 from "./HomeworldCivilianV72";
import {
  triadCityInvitationReadyM016, triadCityRemainingM016,
  type TriadCityM016, type TriadCityStationM016,
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
        facing={-1} reducedMotion={reducedMotion} />
      <span className={styles.actorName}>{station.name}</span>
    </div>
  );
}

export function HomeworldTriadJournalM016({ ledger, disabled, onGuide }: {
  ledger?: TriadCityM016;
  disabled: boolean;
  onGuide: (point: string) => void;
}) {
  const remaining = triadCityRemainingM016(ledger);
  return (
    <section className={town.help} aria-label="Préparer les rencontres de triade" data-homeworld-m016-journal>
      <strong>Former la triade</strong>
      {remaining.length ? (
        <ul className={styles.routes}>
          {remaining.map(station => (
            <li key={station.partner}>
              <button type="button" className="ghost-button small" disabled={disabled}
                onClick={() => onGuide("point:" + station.pointId)}>{station.name} · {station.district}</button>
            </li>
          ))}
        </ul>
      ) : <p>Saar et Vek se donnent rendez-vous dans la galerie. Parle au maître des terrasses.</p>}
    </section>
  );
}

export default function HomeworldTriadM016({ station, step, disabled, onAdvance }: {
  station: TriadCityStationM016;
  step: number;
  disabled: boolean;
  onAdvance: (step: number) => void;
}) {
  const invited = triadCityInvitationReadyM016(station, step);
  const seen = Math.min(step, station.demonstration.length);
  return (
    <section className={town.notice} aria-label={station.name + " · " + station.lesson}
      data-homeworld-m016-station={station.partner} data-phase={step}>
      <h4>{station.name} · {station.lesson}</h4>
      {station.partner === "saar" ? (
        <div className={styles.latch} data-state={seen} aria-hidden="true">
          <i className={styles.bar} /><i className={styles.slot} />
        </div>
      ) : (
        <div className={styles.trail} aria-hidden="true">
          {station.demonstration.map((gesture, index) => <i key={gesture} data-observed={index < seen} />)}
        </div>
      )}
      <p role="status">{station.cues[seen]} · {station.speech[step]}</p>
      {invited ? <strong>Rendez-vous confirmé</strong> : (
        <button type="button" data-homeworld-m016-advance={station.partner} disabled={disabled} onClick={() => onAdvance(step)}>
          {station.demonstration[step] ?? "Proposer de former la triade"}
        </button>
      )}
    </section>
  );
}
