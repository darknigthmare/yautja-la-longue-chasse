import { useState } from "react";
import ClanHullExteriorV172 from "./ClanHullExteriorV172";
import type { SaveGame } from "./types";
import type { ClanShipRoomId } from "./systems/clanShipDocking";
import type { ClanShipNpcId } from "./systems/clanShipOperations";
import {
  CLAN_HULL_CONTACTS, CLAN_HULL_PLEDGE_LABELS, inspectClanHullProject,
  type ClanHullPledgeV171, type ClanHullProjectCommandV171, type ClanHullProjectResponseV171,
} from "./systems/clanHullProjectV171";
import styles from "./ClanShipOperationsPanel.module.css";

export default function ClanHullProjectPanel({ save, roomId, crewFocus, onAction, onNavigate, onContracts, onClose }: {
  save: SaveGame;
  roomId: ClanShipRoomId;
  crewFocus?: ClanShipNpcId | null;
  onAction: (command: ClanHullProjectCommandV171) => ClanHullProjectResponseV171;
  onNavigate: (room: ClanShipRoomId) => void;
  onContracts: () => void;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [exteriorOpen, setExteriorOpen] = useState(false);
  const state = inspectClanHullProject(save.clanHullProjectV171, save.createdAt).state;
  const current = CLAN_HULL_CONTACTS.find(entry => entry.roomId === roomId && entry.id === crewFocus);
  const select = (pledge: ClanHullPledgeV171) => setMessage(onAction({
    type: "pledge", pledge, expectedRevision: state?.revision ?? 0,
  }).message);

  return <section className={styles.lore} aria-labelledby="clan-hull-project-title" data-clan-hull-project>
    <h3 id="clan-hull-project-title">La coque d’un groupe</h3>
    {state && roomId === "hangar" && exteriorOpen && !state.exteriorSurvey ? <ClanHullExteriorV172
      key={state.ownerCreatedAt + ":" + state.hullInstanceId} onClose={() => setExteriorOpen(false)}
      onReturn={survey => {
        const result = onAction({ type: "exterior-survey", survey, expectedRevision: state.revision });
        if (result.ok) { setMessage(result.message); setExteriorOpen(false); }
        return result;
      }} /> : <>
    {state && <section className={styles.step}>
      <h4>Visite extérieure de la coque</h4>
      {state.exteriorSurvey ?
        <p data-clan-hull-exterior-receipt>Relevé consigné. Le pont de relève et la passerelle de veille restent sous scellés.</p> :
        roomId === "hangar" ? <button type="button" data-open-clan-hull-exterior onClick={() => setExteriorOpen(true)}>
          Ouvrir le sas de la cale sèche
        </button> : <button type="button" onClick={() => onNavigate("hangar")}>Rejoindre le sas du hangar</button>}
    </section>}
    {state?.pledge ? <>
      <p className={styles.notice} data-clan-hull-project-pledged>{CLAN_HULL_PLEDGE_LABELS[state.pledge]} · Intention consignée</p>
      <button type="button" onClick={onContracts}>Consulter les opérations du clan</button>
    </> : <>
      <section className={styles.step}>
        <h4>Relevé des scellés</h4>
        {state ? <ul>
          <li>Le pont de relève attend sa réception.</li>
          <li>La passerelle de veille reste sous scellés.</li>
        </ul> : roomId === "hangar" ?
          <button type="button" onClick={() => setMessage(onAction({ type: "inspect", expectedRevision: 0 }).message)}>
            Inspecter les plans des ponts scellés
          </button> : <button type="button" onClick={() => onNavigate("hangar")}>Aller au poste du hangar</button>}
      </section>
      {state && <>
        <section className={styles.step}>
          <h4>Détenteurs des droits</h4>
          <ul>{CLAN_HULL_CONTACTS.map(holder => <li key={holder.id}>
            <strong>{holder.name}</strong>{" · "}
            {(state.consultations & holder.mask) !== 0 ? holder.reply : holder.roomId === "hangar" ? "Au hangar" : "Au conseil"}
          </li>)}</ul>
          {current && (state.consultations & current.mask) === 0 ?
            <button type="button" onClick={() => setMessage(onAction({ type: "consult", expectedRevision: state.revision }).message)}>
              Écouter {current.name} sur les droits
            </button> : state.consultations !== 3 ?
              <button type="button" onClick={onClose}>Retourner sur le pont pour rencontrer le prochain détenteur</button> : null}
        </section>
        {state.consultations === 3 && (roomId === "conseil" ? <fieldset className={styles.step}>
          <legend>Intention à consigner au conseil</legend>
          <button type="button" onClick={() => select("shared-watch")}>{CLAN_HULL_PLEDGE_LABELS["shared-watch"]}</button>
          <button type="button" onClick={() => select("personal")}>{CLAN_HULL_PLEDGE_LABELS.personal}</button>
        </fieldset> : <button type="button" onClick={() => onNavigate("conseil")}>Aller à la table du conseil</button>)}
      </>}
    </>}
    </>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
