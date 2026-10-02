/* eslint-disable @next/next/no-img-element -- owned trophy art is individually preserved */
import type { CSSProperties } from 'react';
import type { TrophyRecord } from './types';
import { HOMEWORLD_POINTS, homeworldTrophyDisplays } from './systems/homeworld';
import { HOMEWORLD_PROP_ART_V64 } from './systems/homeworldArtV64';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, type HomeworldGroundPointV64 } from './systems/homeworldGeometryV64';
import { homeworldInteriorPropArtIdV64, homeworldInteriorTrophySlotsV64, type HomeworldInteriorV64 } from './systems/homeworldInteriorsV64';
import { homeworldInteriorShellV64 } from './systems/homeworldInteriorShellV64';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldPointVisualV64 from './HomeworldPointVisualV64';
import HomeworldInteriorPartitionsV72 from './HomeworldInteriorPartitionsV72';
import HomeworldFurnitureV72 from './HomeworldFurnitureV72';
import styles from './HomeworldCity.module.css';

/** Room coordinates are local unprojected ground coordinates, never district coordinates. */
export default function HomeworldInteriorSurface({ room, activePointId, trophies = [], actorPosition }: {
  room: HomeworldInteriorV64; actorPosition: HomeworldGroundPointV64;
  activePointId: string | null; trophies?: readonly TrophyRecord[];
}) {
  const displayed = room.buildingId === 'trophy-mausoleum' ? homeworldTrophyDisplays(trophies).slice(-8) : [];
  const exit = homeworldProjectGroundV64(room.exit);
  const trophySlots = homeworldInteriorTrophySlotsV64(room);
  const shell = homeworldInteriorShellV64(room);
  return <>
    <div className={styles.interiorFloorV64} data-interior-floor={room.buildingId} style={{
      width: shell.floor.width, height: shell.floor.depth, transform: `scaleY(${HOMEWORLD_GEOMETRY_V64.depthScale})`,
      backgroundSize: `${shell.floor.art.tileWorldSize}px ${shell.floor.art.tileWorldSize}px`,
      '--homeworld-pavement': `url('${shell.floor.art.src}')`,
    } as CSSProperties} />
    {shell.groups.map(group => <div key={group.side}
      className={group.side === 'north' ? styles.interiorNorthV64 : styles.interiorSideV64}
      data-interior-panel-group={group.side} style={group.clip}>
      {group.panels.map(panel => <HomeworldNativePropV64 key={panel.id} id={panel.id} artId={panel.artId} art={panel.art}
        x={panel.localPaintPivot.x} y={panel.localPaintPivot.y} depth={0} />)}
    </div>)}
    <HomeworldInteriorPartitionsV72 room={room}/>
    {(room.furniture??[]).map(item=><HomeworldFurnitureV72 key={item.id} {...item} actor={actorPosition}/>)}
    {(room.zones??[]).map(zone=><span key={zone.id} data-homeworld-interior-zone-v72={zone.id} style={{position:'absolute',left:zone.x+zone.width/2,top:(zone.y+zone.depth-36)*HOMEWORLD_GEOMETRY_V64.depthScale,
      transform:'translateX(-50%)',font:'9px ui-monospace,monospace',letterSpacing:'.06em',color:'#a89979',pointerEvents:'none',zIndex:0}}>{zone.label}</span>)}
    {room.buildingId === 'market-armory' && <img src="/game/homeworld/v68/hunt-board.png" alt="" draggable={false} data-homeworld-hunt-board-v68
      style={{ position:'absolute', maxWidth:'none', left:room.width * .22 - 1182 * .094 / 2, top:-1300 * .094,
        width:1182 * .094, height:1330 * .094, zIndex:1, pointerEvents:'none' }} />}
    {displayed.map((trophy, i) => <img key={trophy.claimId} className={styles.interiorTrophyV64}
      data-trophy-claim-id={trophy.claimId} alt="" title={trophy.label} src={trophy.asset} draggable={false}
      style={{ left: trophySlots[i].x - trophySlots[i].width / 2, top: -trophySlots[i].elevation,
        width: trophySlots[i].width, height: trophySlots[i].height, zIndex: 1 }} />)}
    {displayed.length > 0 && <span className={styles.interiorCollectionV64}>{displayed.length} prises exposées · collection complète auprès du Héraut</span>}
    {room.props.map(prop => {
      const artId = homeworldInteriorPropArtIdV64(prop.kind), p = homeworldProjectGroundV64(prop);
      return <HomeworldNativePropV64 key={prop.id} id={prop.id} artId={artId} art={HOMEWORLD_PROP_ART_V64[artId]}
        x={p.x} y={p.y} depth={prop.y} heightWorld={prop.height} />;
    })}
    {room.points.map(placement => {
      const point = HOMEWORLD_POINTS.find(point => point.id === placement.pointId);
      return point ? <HomeworldPointVisualV64 key={point.id} point={{ ...point, x: placement.x, y: placement.y }} active={point.id === activePointId} /> : null;
    })}
    <div className={styles.interiorExitV64} data-homeworld-physical-exit={room.buildingId}
      style={{ left: exit.x, top: exit.y }}><i /><span>VERS LA CITÉ</span></div>
  </>;
}
