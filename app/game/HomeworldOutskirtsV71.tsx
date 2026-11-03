import { memo, useId } from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import { HOMEWORLD_DISTRICTS, HOMEWORLD_STREETS } from './systems/homeworldCity';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_OUTSKIRTS_ART_V71, HOMEWORLD_OUTSKIRTS_GROUND_V71 } from './systems/homeworldOutskirtsArtV71';
import { HOMEWORLD_OUTSKIRTS_MODULES_V71,
  HOMEWORLD_BUILDING_APPROACHES_V71, homeworldOutskirtsVisibleV71, shouldFadeHomeworldOutskirtsV71 } from './systems/homeworldOutskirtsV71';
import {HOMEWORLD_LANDSCAPE_MODULES_V75,HOMEWORLD_LANDSCAPE_PATCHES_V75,HOMEWORLD_LANDSCAPE_MATERIALS_V75,
  homeworldLandscapeGroundWindowV75,homeworldLandscapePatchVisibleV75} from './systems/homeworldLandscapeV75';
import { HOMEWORLD_GROUND_ART_V64 } from './systems/homeworldArtV64';
import styles from './HomeworldOutskirtsV71.module.css';
const polygons=[...HOMEWORLD_DISTRICTS,...HOMEWORLD_STREETS].map(item=>item.polygon.map(p=>`${p.x},${p.y}`).join(' '));
// Negative northern supports share the first visible stacking plane. Sorting
// the combined legacy/new set still puts their nearer silhouettes in front.
const landscapeModules=[...HOMEWORLD_OUTSKIRTS_MODULES_V71.map(module=>({...module,version:71 as const})),
  ...HOMEWORLD_LANDSCAPE_MODULES_V75.map(module=>({...module,version:75 as const}))].sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));
/** One repeating ground material plus independent depth-sorted native sprites.
 * Existing districts/streets cut holes out of the natural floor, including the
 * shuttle apron. No painted panorama substitutes for city geometry. */
export default memo(function HomeworldOutskirtsV71({actor,cameraX,cameraY,width,height}:{
  actor:{x:number;y:number};cameraX:number;cameraY:number;width:number;height:number;
}) {
  const camera={x:cameraX,y:cameraY,width,height};
  const id=useId().replace(/:/g,'-'),floor=homeworldLandscapeGroundWindowV75(camera);
  const ground=HOMEWORLD_OUTSKIRTS_GROUND_V71,tile=ground.tileWorldSize;
  const patches=HOMEWORLD_LANDSCAPE_PATCHES_V75.filter(patch=>homeworldLandscapePatchVisibleV75(patch,camera));
  return <>
    <svg className={styles.ground} data-homeworld-outskirts-floor="v71" data-homeworld-landscape-floor="v75"
      width={floor.width} height={floor.depth} viewBox={`${floor.left} ${floor.top} ${floor.width} ${floor.depth}`}
      style={{left:floor.left,top:floor.top*HOMEWORLD_GEOMETRY_V64.depthScale,transform:`scaleY(${HOMEWORLD_GEOMETRY_V64.depthScale})`}}>
      <defs>
        <pattern id={`${id}-soil`} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <image href={ground.src} width={tile} height={tile} preserveAspectRatio="none" />
        </pattern>
        <pattern id={`${id}-paving`} width="110" height="110" patternUnits="userSpaceOnUse">
          <image href={HOMEWORLD_GROUND_ART_V64.src} width="110" height="110" preserveAspectRatio="none" />
        </pattern>
        {Object.values(HOMEWORLD_LANDSCAPE_MATERIALS_V75).map(material=><pattern key={material.id} id={`${id}-${material.id}`}
          width={material.tileWorldWidth} height={material.tileWorldDepth} patternUnits="userSpaceOnUse">
          <svg width={material.tileWorldWidth} height={material.tileWorldDepth}
            viewBox={`${material.sourceRect.x} ${material.sourceRect.y} ${material.sourceRect.width} ${material.sourceRect.height}`} overflow="hidden">
            <image data-homeworld-landscape-native-material={material.id} href={material.src} width={material.sourceWidth} height={material.sourceHeight}/>
          </svg>
        </pattern>)}
        {patches.map((patch,index)=><radialGradient key={patch.id} id={`${id}-patch-gradient-${index}`}>
          <stop offset="0" stopColor="white"/><stop offset=".55" stopColor="white" stopOpacity=".96"/>
          <stop offset=".8" stopColor="white" stopOpacity=".65"/><stop offset="1" stopColor="white" stopOpacity="0"/>
        </radialGradient>)}
        {patches.map((patch,index)=><mask key={patch.id} id={`${id}-patch-${index}`} maskUnits="userSpaceOnUse"
          x={patch.x-patch.radiusX} y={patch.y-patch.radiusY} width={patch.radiusX*2} height={patch.radiusY*2}>
          <ellipse cx={patch.x} cy={patch.y} rx={patch.radiusX} ry={patch.radiusY} fill={`url(#${id}-patch-gradient-${index})`}/>
        </mask>)}
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
      <g mask={`url(#${id}-outside)`}>{patches.map((patch,index)=><rect key={patch.id} data-homeworld-landscape-patch-v75={patch.id}
        data-landscape-material={patch.materialId} data-landscape-region={patch.regionId??'plateau'}
        x={patch.x-patch.radiusX} y={patch.y-patch.radiusY} width={patch.radiusX*2} height={patch.radiusY*2}
        fill={`url(#${id}-${patch.materialId})`} opacity={patch.opacity} mask={`url(#${id}-patch-${index})`}/>)}</g>
      <g mask={`url(#${id}-public)`}>{HOMEWORLD_BUILDING_APPROACHES_V71.map(path=>path.polygon
        ? <polygon key={path.id} data-homeworld-approach-v71={path.buildingId} data-homeworld-approach-oriented-v76="true"
          points={path.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill={`url(#${id}-paving)`} stroke="#bfa97a" strokeOpacity=".38" strokeWidth="3" />
        : <rect key={path.id} data-homeworld-approach-v71={path.buildingId}
          x={path.x} y={path.y} width={path.width} height={path.depth} fill={`url(#${id}-paving)`} stroke="#bfa97a" strokeOpacity=".38" strokeWidth="3" />)}</g>
    </svg>
    {landscapeModules.map(module=>{
      if(!homeworldOutskirtsVisibleV71(module,{x:cameraX,y:cameraY,width,height}))return null;
      const p=homeworldProjectGroundV64(module),art=HOMEWORLD_OUTSKIRTS_ART_V71[module.artId];
      return <HomeworldNativePropV64 key={module.id} id={module.id} artId={`${module.version===75?'landscape-v75':'outskirts'}-${module.artId}`} art={art}
        className={styles.module} x={p.x} y={p.y} depth={Math.max(1,module.y)} heightWorld={art.heightWorld*module.scale}
        style={{opacity:shouldFadeHomeworldOutskirtsV71(module,actor) ? .22 : 1}} />;
    })}
  </>;
});
