/* eslint-disable @next/next/no-img-element -- immutable native masonry textures */
import {memo,useId} from 'react';
import {HOMEWORLD_NATIVE_CATALOGUE_V81} from './systems/homeworldNativeArchitectureV81';
import {homeworldRetainingRenderV82,type HomeworldRetainingSupportV82} from './systems/homeworldRetainingAssembliesV82';
import {HOMEWORLD_GEOMETRY_V64} from './systems/homeworldGeometryV64';
import {homeworldLevelV77} from './systems/homeworldWorldV77';
import {homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';

/** These masonry masses render the exact solid polygons registered by the
 * collision model. They are authored volumes, not additional generated PNGs.
 * Native material sources remain unchanged and do not grant extra ground. */
export default memo(function HomeworldRetainingSupportV82({support,camera}:{
 support:HomeworldRetainingSupportV82;camera:{x:number;y:number;viewWidth:number;viewHeight:number};
}){
 const uid=useId().replace(/:/g,'-'),elevation=homeworldLevelV77(support.levelId).elevation;
 const shape=homeworldRetainingRenderV82(support,HOMEWORLD_GEOMETRY_V64.depthScale,elevation);
 const points=shape.faces.flatMap(face=>face.polygon),left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
 const width=Math.max(...points.map(p=>p.x))-left,height=Math.max(...points.map(p=>p.y))-top;
 if(left+width<camera.x-160||left>camera.x+camera.viewWidth+160||top+height<camera.y-160||top>camera.y+camera.viewHeight+160)return null;
 const wall=HOMEWORLD_NATIVE_CATALOGUE_V81.assets['basalt-city-foundation'].art;
 const cap=HOMEWORLD_NATIVE_CATALOGUE_V81.assets['paving-undercity'].art;
 const vertices=(ps:readonly {x:number;y:number}[])=>ps.map(p=>`${p.x},${p.y}`).join(' ');
 const faces=[...shape.faces].sort((a,b)=>a.polygon.reduce((sum,p)=>sum+p.y,0)-b.polygon.reduce((sum,p)=>sum+p.y,0));
 return <svg aria-hidden="true" data-homeworld-retaining-support-v82={support.id} data-structural-owner-v82={support.ownerId}
  data-volume-source-v82={support.nativeStatus} data-world-level-v77={support.levelId}
  width={width+4} height={height+4} viewBox={`${left-2} ${top-2} ${width+4} ${height+4}`}
  style={{position:'absolute',left:left-2,top:top-2,zIndex:homeworldSceneDepthV78(shape.depth,elevation),pointerEvents:'none'}}>
  <defs>
   <pattern id={uid+'-wall'} width="420" height={420*wall.sourceHeight/wall.sourceWidth} patternUnits="userSpaceOnUse"><image href={wall.src} width="420" height={420*wall.sourceHeight/wall.sourceWidth} preserveAspectRatio="xMidYMin meet"/></pattern>
   <pattern id={uid+'-cap'} width="180" height={180*HOMEWORLD_GEOMETRY_V64.depthScale} patternUnits="userSpaceOnUse"><image href={cap.src} width="180" height={180*HOMEWORLD_GEOMETRY_V64.depthScale} preserveAspectRatio="none"/></pattern>
  </defs>
  {faces.map(face=><g key={face.id}>
   <polygon points={vertices(face.polygon)} fill="#231b15"/>
   <polygon points={vertices(face.polygon)} fill={`url(#${uid}-wall)`} stroke="#71593b" strokeWidth="1.5"/>
  </g>)}
  <polygon points={vertices(shape.top)} fill="#40362a"/>
  <polygon points={vertices(shape.top)} fill={`url(#${uid}-cap)`} stroke="#a78a5c" strokeWidth="2"/>
 </svg>;
});
