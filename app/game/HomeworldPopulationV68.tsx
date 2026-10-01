import { memo } from 'react';
import HomeworldModularHunter from './HomeworldModularHunter';
import { HOMEWORLD_RESIDENTS_V68, homeworldResidentPoseV68 } from './systems/homeworldLifeV68';
import { homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import styles from './HomeworldCity.module.css';
/** Cull before rendering modular bitmaps. This keeps a city-wide population
 * inexpensive while preserving proper ground-y occlusion and foot anchors. */
export default memo(function HomeworldPopulationV68({ seconds, cameraX, cameraY, width, height, activeId }: {
  seconds: number; cameraX: number; cameraY: number; width: number; height: number; activeId?: string;
}) {
  return <>{HOMEWORLD_RESIDENTS_V68.map(resident => {
    const pose = homeworldResidentPoseV68(resident, seconds), p = homeworldProjectGroundV64(pose);
    if (p.x < cameraX - 130 || p.x > cameraX + width + 130 || p.y < cameraY - 30 || p.y > cameraY + height + 150) return null;
    const placement = homeworldModularPlacementV64(resident.morphId, 'reference', resident.morphId === 'young' ? 82 : 100);
    return <span key={resident.id} className={styles.residentV68} data-homeworld-resident={resident.id} data-x={pose.x.toFixed(1)} data-y={pose.y.toFixed(1)} data-moving={pose.moving}
      style={{ left: p.x, top: p.y, zIndex: Math.round(pose.y) }}>
      <i className={styles.residentShadowV68} />
      <span style={{ position: 'absolute', transform: `scaleX(${pose.facing})` }}>
        <HomeworldModularHunter morphId={resident.morphId} dreadStyleId={resident.morphId === 'elder' ? 'elder' : resident.morphId === 'huntress' ? 'huntress' : 'classic'}
          motionPhase={seconds} speed={pose.moving ? resident.speed : 0} style={{ position: 'absolute', ...placement }} />
      </span>
      {resident.id === activeId && <b className={styles.residentLabelV68}>{resident.role}</b>}
    </span>;
  })}</>;
});
