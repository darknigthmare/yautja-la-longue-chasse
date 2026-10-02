"use client";
/* eslint-disable @next/next/no-img-element -- preserved native architecture and atlas bitmaps */
import { memo, type CSSProperties } from 'react';
import type { ShipId } from './shipCatalogue';
import type { TrophyRecord } from './types';
import { HOMEWORLD_BUILDINGS, HOMEWORLD_DISTRICTS, HOMEWORLD_POINTS, HOMEWORLD_PROPS, HOMEWORLD_STREETS, HOMEWORLD_WORLD, polygonCss } from './systems/homeworld';
import { shouldFadeHomeworldBuilding, HOMEWORLD_WAYMARKS, HOMEWORLD_SPACEPORT_V64, type HomeworldVec2 } from './systems/homeworldCity';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, homeworldBuildingSpritePlacementV64, homeworldBuildingDoorwayV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_INTERIOR_POINT_IDS_V64 } from './systems/homeworldInteriorsV64';
import { HOMEWORLD_GROUND_ART_V64, HOMEWORLD_PROP_ART_V64, HOMEWORLD_TRANSPORT_ART_V64 } from './systems/homeworldArtV64';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldPointVisualV64 from './HomeworldPointVisualV64';
import HomeworldArchitectureV75 from './HomeworldArchitectureV75';
import styles from './HomeworldCity.module.css';

interface HomeworldCitySceneProps {
  actorPosition?: HomeworldVec2; selectedShipId: ShipId; youthWelcome?: boolean;
  activeDoorId: string | null; activePointId?: string | null;
  fadedFrontPropIds: string; trophies: readonly TrophyRecord[];
}
function bounds(points: readonly HomeworldVec2[]) {
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y };
}

/** Ground gets the camera projection once; upright native art remains undistorted.
 * All solid modules use the same ground-y depth as actors, regardless of plane tags. */
const HomeworldCityScene = memo(function HomeworldCityScene({ activeDoorId, activePointId, fadedFrontPropIds, youthWelcome = false, actorPosition }: HomeworldCitySceneProps) {
  const faded = new Set(fadedFrontPropIds.split('|').filter(Boolean));
  const pad = HOMEWORLD_TRANSPORT_ART_V64['landing-pad'];
  const shuttle = homeworldProjectGroundV64(HOMEWORLD_SPACEPORT_V64.shuttle);
  return <>
    <div className={styles.groundPlaneV64} style={{ transform: `scaleY(${HOMEWORLD_GEOMETRY_V64.depthScale})`, '--homeworld-pavement': `url('${HOMEWORLD_GROUND_ART_V64.src}')` } as CSSProperties}>
      <div className={styles.groundBaseV64} style={{ width: HOMEWORLD_WORLD.width, height: HOMEWORLD_WORLD.height }} />
      {HOMEWORLD_STREETS.map(street => {
        const b = bounds(street.polygon);
        return <div key={street.id} className={styles.streetV64} data-kind={street.kind}
          style={{ left: b.x, top: b.y, width: b.width, height: b.height, clipPath: polygonCss(street.polygon, b) }} />;
      })}
      {HOMEWORLD_DISTRICTS.map(district => <div key={district.id} className={styles.districtV64} data-texture={district.texture}
        style={{ left: district.x, top: district.y, width: district.width, height: district.height, clipPath: polygonCss(district.polygon, district) }} />)}
      {HOMEWORLD_WAYMARKS.map(mark => <div key={mark.id} className={styles.waymarkV64} data-homeworld-waymark={mark.id} style={{ left: mark.x, top: mark.y }}>
        <i style={{ transform: `rotate(${mark.angle}deg)` }}>››</i><span>{mark.label}</span>
      </div>)}
      <div className={styles.landingPadV64} data-homeworld-spaceport="pad" style={{
        left: HOMEWORLD_SPACEPORT_V64.pad.x - pad.pivot.x * pad.scaleWorldPerPixel,
        top: HOMEWORLD_SPACEPORT_V64.pad.y - HOMEWORLD_SPACEPORT_V64.pad.depth / 2 - pad.pivot.y * pad.scaleWorldPerPixel,
        width: pad.renderWidthWorld, height: pad.renderDepthWorld,
        backgroundImage: `url('${pad.src}')`,
      }} />
    </div>
    <HomeworldNativePropV64 id="clan-local-shuttle" artId="clan-shuttle" art={HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle']}
      x={shuttle.x} y={shuttle.y} depth={HOMEWORLD_SPACEPORT_V64.shuttle.y} />
    {HOMEWORLD_BUILDINGS.map(building => {
      const position = homeworldBuildingSpritePlacementV64(building), active = activeDoorId === building.id;
      const socket = homeworldProjectGroundV64(homeworldBuildingDoorwayV64(building).threshold);
      return <div key={building.id} className={styles.buildingV64} data-building-id={building.id}
        data-building-art={building.artId} data-entrance-kind={building.entranceKind}
        data-building-native-source={building.art.src}
        data-occluded={!!actorPosition && shouldFadeHomeworldBuilding(building, actorPosition)}
        style={{ ...position, zIndex: Math.round(building.y) }}>
        {building.art.sourceRect ? <span data-native-building-atlas-v72={building.id} style={{display:'block',width:'100%',height:'100%',
          backgroundImage:`url('${building.art.src}')`,backgroundRepeat:'no-repeat',
          backgroundSize:`${building.art.sourceWidth*position.width/building.art.sourceRect.width}px ${building.art.sourceHeight*position.height/building.art.sourceRect.height}px`,
          backgroundPosition:`${-building.art.sourceRect.x*position.width/building.art.sourceRect.width}px ${-building.art.sourceRect.y*position.height/building.art.sourceRect.height}px`}}/>
          : <img src={building.art.src} alt="" draggable={false} />}
        {active && <span className={styles.doorMarkerV64} data-painted-door-id={building.id}
          style={{ left: socket.x - position.left, top: socket.y - position.top }}><i /><b>{building.label}</b></span>}
      </div>;
    })}
    <HomeworldArchitectureV75 actor={actorPosition}/>
    {HOMEWORLD_PROPS.map(prop => {
      if (!prop.artId) return null; // Legacy sources are preserved outside this new projection.
      const p = homeworldProjectGroundV64(prop);
      return <HomeworldNativePropV64 key={prop.id} id={prop.id} artId={prop.artId} art={HOMEWORLD_PROP_ART_V64[prop.artId]}
        x={p.x} y={p.y} depth={prop.y} heightWorld={prop.height} style={{ opacity: faded.has(prop.id) ? .2 : 1 }} />;
    })}
    {HOMEWORLD_POINTS.filter(point => !HOMEWORLD_INTERIOR_POINT_IDS_V64.has(point.id)).map(point =>
      <HomeworldPointVisualV64 key={point.id} point={point} active={point.id === activePointId} youthWelcome={youthWelcome} />)}
  </>;
});
export default HomeworldCityScene;
