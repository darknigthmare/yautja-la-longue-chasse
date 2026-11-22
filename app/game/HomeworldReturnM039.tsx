import {
  HOMEWORLD_RETURN_CONTACTS_M039,
  HOMEWORLD_RETURN_LINKS_M039,
  type HomeworldReturnActionM039,
  type HomeworldReturnM039 as ReturnReceipt,
} from "./systems/homeworldReturnM039";
import type { MissionDefinition } from "./types";
import styles from "./HomeworldCity.module.css";

const goals = {
  assigned: "Rejoins la maîtresse des parures à l’Atelier des parures.",
  "part-ready": "Rapporte la pièce à l’Officier des quais au Contrôle d’amarrage.",
  mounted: "Mets le relais sous charge depuis le Contrôle d’amarrage.",
  commissioned: "Remets le rapport et choisis le lien que tu veux renouer.",
  reported: "Le relais est en service. Le rapport a été remis.",
} as const;

export function HomeworldReturnJournalM039({ receipt, disabled, onGuide }: {
  receipt: ReturnReceipt;
  disabled: boolean;
  onGuide: (landmarkId: string) => void;
}) {
  const destination = receipt.phase === "assigned" ? HOMEWORLD_RETURN_CONTACTS_M039.artisan : HOMEWORLD_RETURN_CONTACTS_M039.officer;
  return (
    <section className={styles.help} aria-label="Retour au Homeworld" data-homeworld-return-journal-m039={receipt.phase}>
      <strong>Revenir chez les siens</strong> · {goals[receipt.phase]}
      {receipt.phase !== "reported" && (
        <button type="button" className="ghost-button small" disabled={disabled} onClick={() => onGuide("point:" + destination.pointId)}>
          Indiquer le chemin
        </button>
      )}
    </section>
  );
}

export default function HomeworldReturnM039({ contact, receipt, hunts, disabled, onAction }: {
  contact: "officer" | "artisan";
  receipt?: ReturnReceipt;
  hunts: readonly MissionDefinition[];
  disabled: boolean;
  onAction: (action: HomeworldReturnActionM039) => void;
}) {
  if (!hunts.length || (contact === "artisan" && !receipt)) return null;
  const phase = receipt?.phase ?? "offer";
  const mentioned = receipt ? hunts.filter(hunt => receipt.huntIds.includes(hunt.id)) : hunts;
  const completedLink = receipt?.phase === "reported" && HOMEWORLD_RETURN_LINKS_M039.find(link => link.id === receipt.link);

  return (
    <section className={styles.notice} aria-label="Revenir chez les siens" data-homeworld-return-m039={phase}>
      <h4>Revenir chez les siens</h4>
      {contact === "officer" && (
        <p>« Les rapports du quai attestent ton retour de chasse. Mondes visités : {mentioned.map(hunt => hunt.planetName).join(", ")}. Le relais a besoin de tes mains. »</p>
      )}
      {contact === "artisan" && (
        <p>« J’ai croisé le rapport de ton retour de {mentioned[0]?.planetName}. Pose le relevé de la platine ici. »</p>
      )}
      {phase === "offer" && <button type="button" disabled={disabled} onClick={() => onAction({ kind: "accept" })}>Prendre en charge le relais du quai</button>}
      {phase === "assigned" && contact === "artisan" && (
        <button type="button" disabled={disabled} onClick={() => onAction({ kind: "receive-part" })}>Ajuster et prendre le disjoncteur</button>
      )}
      {phase === "part-ready" && contact === "officer" && <button type="button" disabled={disabled} onClick={() => onAction({ kind: "mount" })}>Monter le disjoncteur</button>}
      {phase === "mounted" && contact === "officer" && <button type="button" disabled={disabled} onClick={() => onAction({ kind: "test" })}>Tester le relais sous charge</button>}
      {phase === "commissioned" && contact === "officer" && (
        <div>
          <p>À qui transmets-tu le rapport de remise en service ?</p>
          {HOMEWORLD_RETURN_LINKS_M039.map(link => (
            <button key={link.id} type="button" disabled={disabled} onClick={() => onAction({ kind: "report", link: link.id })}>{link.label}</button>
          ))}
        </div>
      )}
      {phase !== "offer" && <p>{goals[phase]}</p>}
      {completedLink && <p data-homeworld-return-link-m039={completedLink.id}>{completedLink.reply}</p>}
    </section>
  );
}
