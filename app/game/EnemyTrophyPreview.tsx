/* eslint-disable @next/next/no-img-element */

import {
  enemyTrophyVisualForEnemyId,
  type EnemyTrophyConsumer,
} from "./enemyTrophyVisualRegistry";

export interface EnemyTrophyPreviewProps {
  enemyId: string;
  consumer: EnemyTrophyConsumer;
}

export default function EnemyTrophyPreview({
  enemyId,
  consumer,
}: EnemyTrophyPreviewProps) {
  const visual = enemyTrophyVisualForEnemyId(enemyId, consumer);
  if (!visual) {
    return null;
  }

  return (
    <figure className="enemy-trophy-preview">
      <div className="enemy-trophy-preview-art">
        <img
          src={visual.runtimeUrl}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>
        <span>Prise potentielle</span>
        <strong>{visual.name}</strong>
      </figcaption>
    </figure>
  );
}
