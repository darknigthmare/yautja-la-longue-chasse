"use client";

/* eslint-disable @next/next/no-img-element -- native trophy plate shares the campaign's asset registry */
import type { TrophyRecord } from "./types";
import type { TrophyUsageV147 } from "./systems/trophyUsagesV147";
import { MISSION_BY_ID } from "./data";
import { trophyWallVisualForDefinitionId } from "./trophyVisualRegistry";
import { enemyTrophyGameplayForDefinitionId, enemyTrophyGameplayForEnemyId } from "./enemyTrophyGameplayV18";
import { resolveV6TrophyVisualId } from "./v6Visuals";
import V6AtlasSprite from "./V6AtlasSprite";
import styles from "./OriginTrophyBenchO6.module.css";

const parts = { skull: "Crâne", "skull-and-spine": "Crâne et colonne", mask: "Biomask", insignia: "Insigne" } as const;
const conditions = { damaged: "Endommagé", intact: "Intact", pristine: "Sans défaut" } as const;
const workshop = { clean: "nettoyage", prepare: "préparation", display: "mise en valeur", rite: "rite" } as const;

export default function OriginTrophyBenchO6({ trophy, usage, gestures, choice }: {
  trophy: TrophyRecord;
  usage?: TrophyUsageV147 | null;
  gestures: number;
  choice?: 0 | 1 | null;
}) {
  const art = trophyWallVisualForDefinitionId(trophy.definitionId) ??
    enemyTrophyGameplayForDefinitionId(trophy.definitionId) ?? enemyTrophyGameplayForEnemyId(trophy.sourceEnemyId);
  const provenance = <>
    <dt>Provenance</dt>
    <dd>{MISSION_BY_ID[trophy.missionId].planetName} · <time dateTime={trophy.claimedAt}>
      {new Date(trophy.claimedAt).toLocaleDateString("fr-FR")}</time></dd>
  </>;
  const method = <>
    <dt>Gestes d’atelier</dt>
    <dd>{trophy.workshop?.completedActions.map(action => workshop[action]).join(", ") || "Aucun geste consigné"}</dd>
  </>;

  return <figure className={styles.bench} data-o6-trophy-bench={trophy.id} data-o6-trophy-turned={gestures > 0}
    data-o6-trophy-view={usage === "displayed" || usage === "worn" ? "record" : "reserve"}>
    <div className={styles.mount} aria-hidden="true">
      <div className={styles.plate}>
        {art ? <img src={art.runtimeUrl} alt="" loading="lazy" decoding="async" /> :
          <V6AtlasSprite id={resolveV6TrophyVisualId(trophy)} decorative />}
      </div>
    </div>
    <figcaption>
      <strong>{parts[trophy.partId]} · {trophy.targetName}</strong>
      {usage === "displayed" && <p>Relevé de la pièce exposée.</p>}
      {usage === "worn" && <p>Relevé de la pièce portée.</p>}
      {gestures >= 2 && <p data-o6-trophy-condition>{conditions[trophy.condition]}</p>}
      {gestures >= 3 && <dl className={styles.cartel} data-o6-trophy-cartel>
        {choice === 1 ? <>{method}{provenance}</> : <>{provenance}{method}</>}
      </dl>}
    </figcaption>
  </figure>;
}
