"use client";
/**
 * V154 — conversation d'une scène de maison quand un invité est assis dans
 * la maison. Les répliques viennent du corpus V6 (scène D6-H correspondante),
 * avec leur locuteur tel qu'écrit ; sans répliques, seule la présence est
 * affichée. Rien n'est rédigé ici.
 */
import { dialogueLinesForV154, type DialogueMomentV154, type HouseDialogueV154 } from "./systems/houseDialogueV154";
import styles from "./ResidencePanelV149.module.css";

export default function HouseSceneConversationV154({ guests, dialogue, moment }: {
  guests: string[];
  dialogue: HouseDialogueV154 | null;
  moment: DialogueMomentV154;
}) {
  const lines = dialogue ? dialogueLinesForV154(dialogue, moment) : [];
  return (
    <div className={styles.block} data-house-scene-conversation={dialogue?.id ?? "presence"}>
      <p className={styles.note} data-house-scene-guests>Présent{guests.length > 1 ? "s" : ""} dans la maison : {guests.join(", ")}.</p>
      {lines.length > 0 && <ul className={styles.slots}>
        {lines.map(line => <li key={line.id} data-dialogue-line={line.id}><b>{line.speaker}</b> : « {line.text} »</li>)}
      </ul>}
      {dialogue && lines.length > 0 && <p className={styles.note}>Répliques du corpus V6 ({dialogue.id}), locuteur tel qu’écrit dans le corpus.</p>}
    </div>
  );
}
