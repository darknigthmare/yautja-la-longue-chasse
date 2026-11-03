import {memo,useId} from 'react';
import {HOMEWORLD_LANDSCAPE_MATERIALS_V75} from './systems/homeworldLandscapeV75';
import {HOMEWORLD_ECOTONES_V90,homeworldEcotoneProjectedV90,homeworldEcotoneVisibleV90} from './systems/homeworldEcotonesV90';
import {HOMEWORLD_NATURAL_PUBLIC_GROUND_V85,HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85} from './systems/homeworldNaturalSupportsV85';
import {HOMEWORLD_NATURAL_PAD_PAINT_V80,HOMEWORLD_NATURAL_SHIP_PAINT_V80} from './systems/homeworldNaturalPlacementsV80';
import {HOMEWORLD_GEOMETRY_V64} from './systems/homeworldGeometryV64';

const d=HOMEWORLD_GEOMETRY_V64.depthScale;
// These models do not change during play. Keep their JSX/string projections
// stable when the follow camera moves, instead of rebuilding every polygon
// on each frame. Only viewport masks and visible patch ellipses vary.
const naturalPolygons=HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85.map(formation=><polygon key={formation.id} data-ecotone-formation-v90={formation.id}
 points={formation.polygon.map(p=>`${p.x},${p.y*d}`).join(' ')}/>);
const publicPolygons=HOMEWORLD_NATURAL_PUBLIC_GROUND_V85.map(ground=><polygon key={ground.id} data-ecotone-public-exclusion-v90={ground.id}
 points={ground.polygon.map(p=>`${p.x},${p.y*d}`).join(' ')} fill="black"/>);
const portExclusions=[{id:'pad',paint:HOMEWORLD_NATURAL_PAD_PAINT_V80},{id:'shuttle',paint:HOMEWORLD_NATURAL_SHIP_PAINT_V80}].map(({id,paint})=>
 <rect key={id} data-ecotone-port-exclusion-v90={id} x={paint.left} y={paint.top} width={paint.width} height={paint.height} fill="black"/>);

/** Separate, camera-culled native ground variations. Only the already drawn
 * V85 shoulders are tinted; the sky/lava/public pavement remain untouched.
 * The material receives one uniform pixel scale, then the shared35° ground
 * projection. This observational pass never participates in actor support. */
export default memo(function HomeworldEcotonesV90({camera}:{camera:{x:number;y:number;viewWidth:number;viewHeight:number}}){
 const id=useId().replace(/:/g,'-');
 const patches=HOMEWORLD_ECOTONES_V90.filter(patch=>homeworldEcotoneVisibleV90(patch,camera));
 if(!patches.length)return null;
 return <svg aria-hidden="true" data-homeworld-ecotones-v90="true" data-natural-support-solid-v90="false"
  width={camera.viewWidth} height={camera.viewHeight} viewBox={`${camera.x} ${camera.y} ${camera.viewWidth} ${camera.viewHeight}`}
  style={{position:'absolute',left:camera.x,top:camera.y,zIndex:-11001,pointerEvents:'none'}}>
  <defs>
   {Object.values(HOMEWORLD_LANDSCAPE_MATERIALS_V75).map(material=><pattern key={material.id} id={`${id}-material-${material.id}`}
    x="0" y="0" width={material.tileWorldWidth} height={material.tileWorldDepth*d} patternUnits="userSpaceOnUse">
    <svg width={material.tileWorldWidth} height={material.tileWorldDepth*d} preserveAspectRatio="none"
     viewBox={`${material.sourceRect.x} ${material.sourceRect.y} ${material.sourceRect.width} ${material.sourceRect.height}`} overflow="hidden">
     <image data-homeworld-ecotone-native-material-v90={material.id} data-native-sha256={material.sha256}
      data-native-source-rect={`${material.sourceRect.x},${material.sourceRect.y},${material.sourceRect.width},${material.sourceRect.height}`}
      href={material.src} width={material.sourceWidth} height={material.sourceHeight}/>
    </svg>
   </pattern>)}
   <clipPath id={`${id}-natural-shoulders`} clipPathUnits="userSpaceOnUse">
    {naturalPolygons}
   </clipPath>
   <mask id={`${id}-outside-public`} maskUnits="userSpaceOnUse" x={camera.x} y={camera.y} width={camera.viewWidth} height={camera.viewHeight}>
    <rect x={camera.x} y={camera.y} width={camera.viewWidth} height={camera.viewHeight} fill="white"/>
    {publicPolygons}
    {portExclusions}
   </mask>
   {patches.map(patch=><radialGradient key={patch.id} id={`${id}-feather-${patch.id}`}>
    <stop offset="0" stopColor="white"/><stop offset=".55" stopColor="white" stopOpacity=".96"/>
    <stop offset=".8" stopColor="white" stopOpacity=".65"/><stop offset="1" stopColor="white" stopOpacity="0"/>
   </radialGradient>)}
   {patches.map(patch=>{const p=homeworldEcotoneProjectedV90(patch);return <mask key={patch.id} id={`${id}-patch-${patch.id}`} maskUnits="userSpaceOnUse"
    x={p.cx-p.rx} y={p.cy-p.ry} width={p.rx*2} height={p.ry*2}>
    <ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={`url(#${id}-feather-${patch.id})`}/>
   </mask>;})}
  </defs>
  <g clipPath={`url(#${id}-natural-shoulders)`}><g mask={`url(#${id}-outside-public)`}>
   {patches.map(patch=>{const p=homeworldEcotoneProjectedV90(patch);return <ellipse key={patch.id}
    data-homeworld-ecotone-v90={patch.id} data-landscape-material={patch.materialId} data-landscape-region={patch.regionId??'plateau'}
    data-world-level-v90={patch.levelId} data-ecotone-anchor-v90={patch.anchorElementId} data-ecotone-exposed-samples-v90={patch.exposedSampleCount}
    cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} opacity={patch.opacity} fill={`url(#${id}-material-${patch.materialId})`} mask={`url(#${id}-patch-${patch.id})`}/>;})}
  </g></g>
 </svg>;
});
