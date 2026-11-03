import { memo } from 'react';
import HomeworldCivilianV72 from './HomeworldCivilianV72';
import { homeworldResidentRoleV72 } from './systems/homeworldIdentityV72';
import { HOMEWORLD_RESIDENTS_V69 as HOMEWORLD_RESIDENTS_V68, homeworldResidentPoseV69 as homeworldResidentPoseV68, homeworldResidentActivityV69 } from './systems/homeworldLifeV69';
import { homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_BUILDINGS, shouldFadeHomeworldBuilding, homeworldBuildingVisibleBoundsV72, type HomeworldVec2 } from './systems/homeworldCity';
import styles from './HomeworldCity.module.css';
/** Cull before rendering native civilian bitmaps. This keeps a city-wide population
 * inexpensive while preserving proper ground-y occlusion and foot anchors. */
export default memo(function HomeworldPopulationV68({ seconds, cameraX, cameraY, width, height, activeId, actorPosition }: {
  seconds: number; cameraX: number; cameraY: number; width: number; height: number; activeId?: string; actorPosition?: HomeworldVec2;
}) {
  // Facade fading exposes only the controlled hero. Other residents behind it
  // keep the normal opaque roof occlusion, instead of appearing on the roof.
  const masks = actorPosition ? HOMEWORLD_BUILDINGS.filter(b => shouldFadeHomeworldBuilding(b, actorPosition)).map(b => ({ y: b.y, rect: homeworldBuildingVisibleBoundsV72(b) })) : [];
  return <>{HOMEWORLD_RESIDENTS_V68.map(resident => {
    const pose = homeworldResidentPoseV68(resident, seconds), p = homeworldProjectGroundV64(pose);
    if (p.x < cameraX - 130 || p.x > cameraX + width + 130 || p.y < cameraY - 30 || p.y > cameraY + height + 150) return null;
    if (masks.some(m => pose.y < m.y && p.x > m.rect.left && p.x < m.rect.left + m.rect.width && p.y > m.rect.top && p.y < m.rect.top + m.rect.height)) return null;
    return <span key={resident.id} className={styles.residentV68} data-homeworld-resident={resident.id} data-activity={resident.activity ?? 'visitor'} data-x={pose.x.toFixed(1)} data-y={pose.y.toFixed(1)} data-moving={pose.moving}
      style={{ left: p.x, top: p.y, zIndex: Math.round(pose.y) }}>
      <i className={styles.residentShadowV68} />
      <HomeworldCivilianV72 npcId={resident.id} role={homeworldResidentRoleV72(resident)} facing={pose.facing} height={resident.morphId==='young'?82:100}
        moving={pose.moving} seconds={seconds+resident.phaseSeconds} speed={resident.speed}/>
      {resident.id === activeId && <b className={styles.residentLabelV68}>{homeworldResidentActivityV69(resident, seconds)}</b>}
    </span>;
  })}</>;
});
