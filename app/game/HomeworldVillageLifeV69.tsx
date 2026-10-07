import { Fragment } from 'react';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_PROP_ART_V64 } from './systems/homeworldArtV64';
import { homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { HOMEWORLD_VILLAGE_LIFE_V69, homeworldVillageResidentPoseV69, homeworldVillageLifeVisibleV69 } from './systems/homeworldVillageLifeV69';
import { HOMEWORLD_VILLAGE_ACTIVITIES_V70, villageActivitySceneV70, villageActivityLoadsV70 } from './systems/homeworldVillageActivitiesV70';
import { HOMEWORLD_REGIONS_V68,regionResidentPositionV68, type HomeworldRegionIdV68 } from './systems/homeworldRegionsV68';
import {homeworldVillagePortraitReferenceV85} from './systems/homeworldVillagePortraitsV85';
import { villagePaintOccludedV70 } from './systems/homeworldVillageOcclusionV70';
import type { HomeworldVec2 } from './systems/homeworldCity';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldModularHunter from './HomeworldModularHunter';
import HomeworldVillagePortraitV85 from './HomeworldVillagePortraitV85';
import styles from './HomeworldVillageLifeV69.module.css';

/** Direct fragment children retain the common physical feet-depth sort. Static
 * native body parts and restrained dread motion are reused, not CSS figures. */
export default function HomeworldVillageLifeV69({ regionId, tick, actor, rect, actorHeight = 100, activityProgress = {} }: {
  regionId: HomeworldRegionIdV68; tick: number; actor: HomeworldVec2;
  rect: { left: number; top: number; right: number; bottom: number };
  activityProgress?: Record<string, number>;
  actorHeight?: number;
}) {
  const life = HOMEWORLD_VILLAGE_LIFE_V69[regionId], d = HOMEWORLD_GEOMETRY_V64.depthScale;
  const definition=HOMEWORLD_REGIONS_V68[regionId],buildings = definition.buildings;
  const portraitSubject=[...life.residents.map(resident=>({resident,pose:homeworldVillageResidentPoseV69(regionId,resident,tick,actor)})),
    ...definition.residents.map(resident=>({resident,pose:regionResidentPositionV68(resident,tick)}))]
    .filter(({resident,pose})=>homeworldVillagePortraitReferenceV85(definition.clan,resident)&&Math.hypot(pose.x-actor.x,pose.y-actor.y)<180
      &&homeworldVillageLifeVisibleV69(pose,rect,d)&&!villagePaintOccludedV70(buildings,pose,actor,{actorHeight}))
    .sort((a,b)=>Math.hypot(a.pose.x-actor.x,a.pose.y-actor.y)-Math.hypot(b.pose.x-actor.x,b.pose.y-actor.y))[0];
  // Prefer the side away from the player and keep the complete card in view.
  // If neither side fits, retain an unobstructed actor rather than cover feet.
  const portraitX=portraitSubject?[portraitSubject.pose.x+(actor.x>=portraitSubject.pose.x?-400:90),portraitSubject.pose.x+(actor.x>=portraitSubject.pose.x?90:-400)]
    .find(x=>x>=rect.left+12&&x+310<=rect.right-12&&(x+310<actor.x-64||x>actor.x+64)):undefined;
  return <>
    {life.props.filter(p => homeworldVillageLifeVisibleV69(p, rect, d, 350) && !villagePaintOccludedV70(buildings, p, actor, { depth: p.depth, actorHeight })).map(p => {
      const v = homeworldProjectGroundV64(p);
      return <HomeworldNativePropV64 key={p.id} id={p.id} artId={p.artId} art={HOMEWORLD_PROP_ART_V64[p.artId]} x={v.x} y={v.y} depth={p.depth} />;
    })}
    {life.residents.map(n => ({ n, pose: homeworldVillageResidentPoseV69(regionId, n, tick, actor) })).filter(({ pose }) => homeworldVillageLifeVisibleV69(pose, rect, d) && !villagePaintOccludedV70(buildings, pose, actor, { actorHeight })).map(({ n, pose }) => {
      const p = homeworldProjectGroundV64(pose), placement = homeworldModularPlacementV64(n.morphId, 'reference', n.morphId === 'young' ? 82 : 100);
      if (!placement) return null;
      return <span key={n.id} className={styles.resident} data-region-village-resident-v69={n.id} data-life-role={n.role} data-life-scene={n.sceneId ?? undefined} data-life-moving={pose.moving} data-life-yielding={pose.yielding} data-life-x={pose.x} data-life-y={pose.y} style={{ left: p.x, top: p.y, zIndex: Math.round(pose.y) }}>
        <i className={styles.shadow} />
        <HomeworldModularHunter morphId={n.morphId} dreadStyleId={n.dreadStyleId} appearance={{ skinId: n.skinId, dreadTintId: n.dreadTintId, headStyleId: 'reference' }} motionPhase={tick / 60 + n.phaseSeconds} speed={pose.moving ? n.speed : 0} style={{ ...placement, position: 'absolute', transform: `scaleX(${pose.facing})`, transformOrigin: `${-placement.left}px ${-placement.top}px` }} />
      </span>;
    })}
    {portraitSubject&&portraitX!==undefined&&<HomeworldVillagePortraitV85 clanName={definition.clan} resident={portraitSubject.resident} x={portraitX} y={portraitSubject.pose.y*d-160}/>}
    {HOMEWORLD_VILLAGE_ACTIVITIES_V70[regionId].filter(s => homeworldVillageLifeVisibleV69(s.station, rect, d, 120) && !villagePaintOccludedV70(buildings, s.station, actor, { actorHeight })).map(s => {
      const p = homeworldProjectGroundV64(s.approach), station = homeworldProjectGroundV64(s.station), progress = activityProgress[s.id] ?? 0, phase = villageActivitySceneV70(s, tick, progress), near = Math.hypot(s.approach.x - actor.x, s.approach.y - actor.y) < 650;
      return <Fragment key={s.id}>
        {villageActivityLoadsV70(s, progress).map(load => { const v = homeworldProjectGroundV64(load); return <HomeworldNativePropV64 key={load.id} id={load.id} artId={load.artId} art={HOMEWORLD_PROP_ART_V64[load.artId]} x={v.x} y={v.y - load.altitude} depth={load.depth} heightWorld={load.heightWorld} />; })}
        {s.kind === 'calibrate' && <span className={styles.controlLight} aria-hidden="true" style={{ left: station.x - 10, top: station.y - 43, zIndex: Math.round(s.station.y + 1), opacity: phase.brightness }} />}
        {s.kind === 'observe' && <svg className={styles.surfaceReading} width="150" height="85" aria-hidden="true" style={{ left: station.x - 75, top: station.y - 42, opacity: phase.brightness }}><ellipse cx="75" cy="42" rx={52 + phase.phase * 10} ry={20 + phase.phase * 6} fill="none" stroke="var(--region-accent)" strokeWidth="2" strokeDasharray="8 7" /></svg>}
        <span className={styles.approach} data-village-activity-approach-v70={s.id} data-activity-phase={phase.phase} data-activity-progress={phase.progress} style={{ left: p.x, top: p.y, opacity: near ? .85 : .35 }}><i style={{ opacity: phase.brightness }} /><b>{s.kind === 'sort' ? '◇' : s.kind === 'calibrate' ? '≋' : s.kind === 'observe' ? '◉' : '▣'}</b></span>
        {near && <span className={styles.scene} data-region-village-scene-v69={s.id} style={{ left: p.x, top: p.y + 18 }}><b>{s.name}</b><small>{progress >= 3 ? 'Préparation faite ici' : phase.signal}</small></span>}
      </Fragment>;
    })}
  </>;
}
