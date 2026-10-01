import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_PROP_ART_V64 } from './systems/homeworldArtV64';
import { homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { HOMEWORLD_VILLAGE_LIFE_V69, homeworldVillageResidentPoseV69, homeworldVillageLifeVisibleV69 } from './systems/homeworldVillageLifeV69';
import type { HomeworldRegionIdV68 } from './systems/homeworldRegionsV68';
import type { HomeworldVec2 } from './systems/homeworldCity';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldModularHunter from './HomeworldModularHunter';
import styles from './HomeworldVillageLifeV69.module.css';

/** Direct fragment children retain the common physical feet-depth sort. Static
 * native body parts and restrained dread motion are reused, not CSS figures. */
export default function HomeworldVillageLifeV69({ regionId, tick, actor, rect }: {
  regionId: HomeworldRegionIdV68; tick: number; actor: HomeworldVec2;
  rect: { left: number; top: number; right: number; bottom: number };
}) {
  const life = HOMEWORLD_VILLAGE_LIFE_V69[regionId], d = HOMEWORLD_GEOMETRY_V64.depthScale;
  return <>
    {life.props.filter(p => homeworldVillageLifeVisibleV69(p, rect, d, 350)).map(p => {
      const v = homeworldProjectGroundV64(p);
      return <HomeworldNativePropV64 key={p.id} id={p.id} artId={p.artId} art={HOMEWORLD_PROP_ART_V64[p.artId]} x={v.x} y={v.y} depth={p.depth} />;
    })}
    {life.residents.map(n => ({ n, pose: homeworldVillageResidentPoseV69(regionId, n, tick, actor) })).filter(({ pose }) => homeworldVillageLifeVisibleV69(pose, rect, d)).map(({ n, pose }) => {
      const p = homeworldProjectGroundV64(pose), placement = homeworldModularPlacementV64(n.morphId, 'reference', n.morphId === 'young' ? 82 : 100);
      if (!placement) return null;
      return <span key={n.id} className={styles.resident} data-region-village-resident-v69={n.id} data-life-role={n.role} data-life-scene={n.sceneId ?? undefined} data-life-moving={pose.moving} data-life-yielding={pose.yielding} data-life-x={pose.x} data-life-y={pose.y} style={{ left: p.x, top: p.y, zIndex: Math.round(pose.y) }}>
        <i className={styles.shadow} />
        <HomeworldModularHunter morphId={n.morphId} dreadStyleId={n.dreadStyleId} appearance={{ skinId: n.skinId, dreadTintId: n.dreadTintId, headStyleId: 'reference' }} motionPhase={tick / 60 + n.phaseSeconds} speed={pose.moving ? n.speed : 0} style={{ ...placement, position: 'absolute', transform: `scaleX(${pose.facing})`, transformOrigin: `${-placement.left}px ${-placement.top}px` }} />
      </span>;
    })}
    {life.scenes.filter(s => homeworldVillageLifeVisibleV69(s, rect, d, 120) && Math.hypot(s.x - actor.x, s.y - actor.y) < 650).map(s => {
      const p = homeworldProjectGroundV64(s);
      return <span key={s.id} className={styles.scene} data-region-village-scene-v69={s.id} style={{ left: p.x, top: p.y + 12 }}><b>{s.name}</b></span>;
    })}
  </>;
}
