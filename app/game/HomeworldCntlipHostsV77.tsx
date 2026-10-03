import HomeworldCivilianV72 from './HomeworldCivilianV72';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {homeworldCntlipHostV77} from './systems/homeworldCntlipPhysicalV77';
import type {HomeworldInteriorV64} from './systems/homeworldInteriorsV64';

/** Preserved whole native civilian plates; no assembled CSS body or duplicate
 * named service NPC. Sit/pour/sip atlases remain explicitly unproduced. */
export default function HomeworldCntlipHostsV77({room}:{room:HomeworldInteriorV64}) {
  const host=homeworldCntlipHostV77(room);if(!host)return null;
  const point=homeworldProjectGroundV64(host);
  return <div data-homeworld-cntlip-host-v77={host.id} data-cntlip-native-table={host.tableId} title={`${host.name} · réception originale du clan`}
    style={{position:'absolute',left:point.x,top:point.y,zIndex:Math.round(host.y)+2,pointerEvents:'none'}}>
    <HomeworldCivilianV72 role={host.role} facing={-1} height={100}/>
  </div>;
}
