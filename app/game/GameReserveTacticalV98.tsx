import { gameReserveV66Summary, type GameReserveV66State } from "./systems/gameReserveV66";
import { gameReserveTacticalV98 } from "./systems/gameReserveTacticalV98";
import styles from "./GameReserveV66.module.css";

export default function GameReserveTacticalV98({ state }: { state: GameReserveV66State }) {
  const tactical = gameReserveTacticalV98(state), summary = gameReserveV66Summary(state);
  return <section className={styles.notebook} aria-label="Carnet de traque" data-reserve-notebook>
    <div className={styles.notebookTitle}><h2>Carnet de traque</h2><span>{state.visited.length}/3 secteurs · {summary.observed}/8 rôles identifiés</span></div>
    <svg viewBox="0 0 600 46" role="img" aria-label={`Position du chasseur : ${tactical.sectors.find(sector => sector.current)?.name}. Extraction à l’ouest.`}>
      {tactical.sectors.map((sector, index) => <rect key={sector.id} x={index * 200 + 2} y="12" width="196" height="22" fill={sector.visited ? "#294b3b" : "#12271e"} stroke={sector.current ? "#e9d299" : "#648673"} strokeWidth={sector.current ? 2 : 1} />)}
      <path d="M14 17L20 23L14 29L8 23Z" fill="#b7e9cb" />
      {tactical.ships.filter(ship => ship.phase !== "unknown").map(ship => <path key={ship.id} d={`M${ship.x / 8 - 5} 8h10v8h-10Z`} fill={ship.phase === "boarding" ? "#ffba7e" : ship.phase === "departed" ? "#8f9893" : "#8dd0d0"} />)}
      <circle cx={state.player.x / 8} cy="23" r="5" fill="#fff3bf" stroke="#08120c" strokeWidth="2" />
    </svg>
    <ol className={styles.sectorList}>{tactical.sectors.map(sector => <li key={sector.id} aria-current={sector.current ? "location" : undefined}><strong>{sector.name}</strong><span>{sector.current ? "Position actuelle" : sector.visited ? "Traversé" : "À explorer"}</span></li>)}</ol>
    <div className={styles.escapeGrid}>{tactical.ships.map(ship => <article key={ship.id} data-reserve-escape={ship.id} data-escape-phase={ship.phase}>
      <h3>{ship.name}</h3><p>{ship.sector}</p>
      <strong>{ship.phase === "departed" ? "Appareil parti" : ship.phase === "boarding" ? `Décollage dans ${ship.countdown} s` : ship.phase === "unknown" ? "Circuit non inspecté" : `${ship.parts}/3 pièces · circuit ${ship.repair} %`}</strong>
      {ship.aboard !== null && ship.phase === "boarding" && <p>{ship.aboard} à bord · sabotage encore possible à la rampe.</p>}
      {ship.phase === "unknown" && <p>Approche de la rampe au sol pour vérifier sa préparation.</p>}
      {ship.phase === "boarding" && ship.aboard === null && <p>Moteurs entendus. L’équipage reste inconnu à cette distance.</p>}
      {ship.intercepted && <p className={styles.interception}>{ship.phase === "departed" ? "Interception antérieure consignée." : "Interception consignée · le circuit peut être réparé."}</p>}
    </article>)}</div>
    <div className={styles.nextAction} data-reserve-next-action={tactical.action.kind}><strong>{tactical.action.title}</strong><p>{tactical.action.detail}{tactical.action.kind !== "none" ? " Un mouvement ou une blessure interrompt l’action." : ""}</p></div>
    <details><summary>Dépôts de composants · {tactical.denied} lots neutralisés</summary><p>Les réserves restantes se vérifient au sol, près du dépôt. Les survivants peuvent récupérer les composants des porteurs abattus s’ils les découvrent à proximité.</p><ul>{tactical.caches.map(cache => <li key={cache.index} data-reserve-cache={cache.index} data-cache-inspected={cache.remaining !== null}><strong>Dépôt {cache.index + 1}</strong> · {cache.sector} — {cache.remaining === null ? "réserve non inspectée" : `${cache.remaining} lot${cache.remaining === 1 ? "" : "s"} restant${cache.remaining === 1 ? "" : "s"}`}{cache.denied ? ` · ${cache.denied} neutralisé${cache.denied === 1 ? "" : "s"} par le chasseur` : ""}.</li>)}</ul></details>
    <details><summary>Contacts actuellement visibles ({tactical.contacts.length})</summary><ul>{tactical.contacts.map(contact => <li key={contact.id} data-reserve-contact={contact.id} data-contact-recovering={contact.recovering}><strong>{contact.name}</strong> — {contact.description}{contact.carrying ? " Transporte un composant." : ""}{contact.recovering ? " Rejoint un porteur abattu ou récupère son composant ; une menace ou une blessure interrompt ce travail." : ""}</li>)}{!tactical.contacts.length && <li>Aucun contact visible. Le carnet ne suit pas les adversaires à travers le terrain.</li>}</ul></details>
  </section>;
}
