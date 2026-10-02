import { memo, useId } from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import { HOMEWORLD_DISTRICTS, HOMEWORLD_STREETS } from './systems/homeworldCity';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_OUTSKIRTS_ART_V71, HOMEWORLD_OUTSKIRTS_GROUND_V71 } from './systems/homeworldOutskirtsArtV71';
import { HOMEWORLD_OUTSKIRTS_MODULES_V71,
  HOMEWORLD_BUILDING_APPROACHES_V71, homeworldOutskirtsGroundWindowV71, homeworldOutskirtsVisibleV71, shouldFadeHomeworldOutskirtsV71 } from './systems/homeworldOutskirtsV71';
import { HOMEWORLD_GROUND_ART_V64 } from './systems/homeworldArtV64';
import styles from './HomeworldOutskirtsV71.module.css';
const polygons=[...HOMEWORLD_DISTRICTS,...HOMEWORLD_STREETS].map(item=>item.polygon.map(p=>`${p.x},${p.y}`).join(' '));
/** One repeating ground material plus independent depth-sorted native sprites.
 * Existing districts/streets cut holes out of the natural floor, including the
 * shuttle apron. No painted panorama substitutes for city geometry. */
export default memo(function HomeworldOutskirtsV71({actor,cameraX,cameraY,width,height}:{
  actor:{x:number;y:number};cameraX:number;cameraY:number;width:number;height:number;
}) {
  const id=useId().replace(/:/g,'-'),floor=homeworldOutskirtsGroundWindowV71({x:cameraX,y:cameraY,width,height});
  const ground=HOMEWORLD_OUTSKIRTS_GROUND_V71,tile=ground.tileWorldSize;
  return <>
    <svg className={styles.ground} data-homeworld-outskirts-floor="v71"
      width={floor.width} height={floor.depth} viewBox={`${floor.left} ${floor.top} ${floor.width} ${floor.depth}`}
      style={{left:floor.left,top:floor.top*HOMEWORLD_GEOMETRY_V64.depthScale,transform:`scaleY(${HOMEWORLD_GEOMETRY_V64.depthScale})`}}>
      <defs>
        <pattern id={`${id}-soil`} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <image href={ground.src} width={tile} height={tile} preserveAspectRatio="none" />
        </pattern>
        <pattern id={`${id}-paving`} width="110" height="110" patternUnits="userSpaceOnUse">
          <image href={HOMEWORLD_GROUND_ART_V64.src} width="110" height="110" preserveAspectRatio="none" />
        </pattern>
        <mask id={`${id}-outside`} x={floor.left} y={floor.top} width={floor.width} height={floor.depth} maskUnits="userSpaceOnUse">
          <rect x={floor.left} y={floor.top} width={floor.width} height={floor.depth} fill="white" />
          {polygons.map((points,index)=><polygon key={index} points={points} fill="black" />)}
        </mask>
        <mask id={`${id}-public`} x={floor.left} y={floor.top} width={floor.width} height={floor.depth} maskUnits="userSpaceOnUse">
          <rect x={floor.left} y={floor.top} width={floor.width} height={floor.depth} fill="black" />
          {polygons.map((points,index)=><polygon key={index} points={points} fill="white" />)}
        </mask>
      </defs>
      <rect x={floor.left} y={floor.top} width={floor.width} height={floor.depth} fill={`url(#${id}-soil)`} mask={`url(#${id}-outside)`} />
      <g mask={`url(#${id}-public)`}>{HOMEWORLD_BUILDING_APPROACHES_V71.map(path=><rect key={path.id} data-homeworld-approach-v71={path.buildingId}
        x={path.x} y={path.y} width={path.width} height={path.depth} fill={`url(#${id}-paving)`} stroke="#bfa97a" strokeOpacity=".38" strokeWidth="3" />)}</g>
    </svg>
    {HOMEWORLD_OUTSKIRTS_MODULES_V71.map(module=>{
      if(!homeworldOutskirtsVisibleV71(module,{x:cameraX,y:cameraY,width,height}))return null;
      const p=homeworldProjectGroundV64(module),art=HOMEWORLD_OUTSKIRTS_ART_V71[module.artId];
      return <HomeworldNativePropV64 key={module.id} id={module.id} artId={`outskirts-${module.artId}`} art={art}
        className={styles.module} x={p.x} y={p.y} depth={Math.max(1,module.y)} heightWorld={art.heightWorld*module.scale}
        style={{opacity:shouldFadeHomeworldOutskirtsV71(module,actor) ? .22 : 1}} />;
    })}
  </>;
});
