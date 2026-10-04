/* eslint-disable @next/next/no-img-element -- immutable owned game bitmap layers */
import {memo,useId} from 'react';
import {HOMEWORLD_NATIVE_CATALOGUE_V81} from './systems/homeworldNativeArchitectureV81';
import {HOMEWORLD_DEPTH_LAYERS_V81,HOMEWORLD_DISTANT_BLOCKS_V81,HOMEWORLD_EXPOSED_EDGES_V81,
 homeworldBackdropPositionV81,homeworldFoundationDepthV81,homeworldProjectEdgeV81} from './systems/homeworldBackdropV81';
import {homeworldLevelV77,type HomeworldLevelV77} from './systems/homeworldWorldV77';
import {HOMEWORLD_OUTSKIRTS_ART_V71} from './systems/homeworldOutskirtsArtV71';
import {HOMEWORLD_TRANSPORT_ART_V64} from './systems/homeworldArtV64';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import {homeworldBackdropArtV82} from './systems/homeworldBackdropArtV82';
import styles from './HomeworldBackdropV81.module.css';

type Camera={x:number;y:number;viewWidth:number;viewHeight:number};
const native=(id:keyof typeof HOMEWORLD_NATIVE_CATALOGUE_V81.assets)=>HOMEWORLD_NATIVE_CATALOGUE_V81.assets[id].art;
const visible=(left:number,top:number,width:number,height:number,c:Camera)=>left+width>=c.x-100&&left<=c.x+c.viewWidth+100&&top+height>=c.y-100&&top<=c.y+c.viewHeight+100;
/** Scenery is assembled behind the unchanged physical streets. No distant
 * district grants a door, discovery, reward or collision. Only background
 * planes parallax; actual foundations and interactive facades do not drift. */
export default memo(function HomeworldBackdropV81({camera,levelId,paintedLevels,seconds,reducedMotion=false}:{
 camera:Camera;levelId:HomeworldLevelV77;paintedLevels:readonly HomeworldLevelV77[];seconds:number;reducedMotion?:boolean;
}) {
 const uid=useId().replace(/:/g,'-'),sky=native('prime-sky'),city=native('distant-city-terraces'),foundation=native('basalt-city-foundation');
 const below=levelId.startsWith('-'),haze=below?.25:1;
 return <>
  <div aria-hidden="true" data-homeworld-depth-layer-v81="7" data-native-source-v81={sky.src} className={styles.sky}
   style={{left:camera.x,top:camera.y,width:camera.viewWidth,height:camera.viewHeight,backgroundImage:`url('${sky.src}')`,opacity:haze}}/>
  {[0,1,2,3,4].map(i=><HomeworldNativePropV64 key={'ridge-'+i} id={'distant-basalt-ridge-v81:'+i} artId="distant-basalt-scenery"
   art={HOMEWORLD_OUTSKIRTS_ART_V71.basalt} heightWorld={150+i%3*34} depth={-47000}
   x={camera.x-120+i*430-(camera.x*.12%430)} y={camera.y+camera.viewHeight*.55}
   style={{opacity:below?.12:.24}}/>)}
  <div aria-hidden="true" data-homeworld-depth-layer-v81="5" className={styles.farCliffs}
   style={{left:camera.x-80,top:camera.y+camera.viewHeight*.39,width:camera.viewWidth+160,height:camera.viewHeight*.72,
    backgroundImage:`url('${foundation.src}')`,backgroundSize:'1000px auto',backgroundPosition:`${-camera.x*.2}px top`,opacity:below?.38:.45}}/>
  {HOMEWORLD_DISTANT_BLOCKS_V81.map(item=>{
    const art=homeworldBackdropArtV82(item.id,below)||city;
    const p=homeworldBackdropPositionV81(item,camera,levelId),height=item.width*art.sourceHeight/art.sourceWidth;
    if(!visible(p.left,p.top,item.width,height,camera))return null;
    return <img key={item.id} aria-hidden="true" alt="" draggable={false} src={art.src} className={styles.distantBlock}
      data-homeworld-depth-layer-v81={item.layer} data-homeworld-background-block-v81={item.id} data-parallax={HOMEWORLD_DEPTH_LAYERS_V81[item.layer].parallax}
      style={{left:p.left,top:p.top,width:item.width,height,opacity:(item.layer===4?.58:.83)*(below?.35:1),zIndex:item.layer===4?-41000:-33000}}/>;
  })}
  {(()=>{
   const art=native('spaceport-gantry'),p=homeworldBackdropPositionV81({x:5780,y:640,layer:3},camera,levelId),width=640,height=width*art.sourceHeight/art.sourceWidth;
   if(!visible(p.left,p.top,width,height,camera))return null;
   return <img aria-hidden="true" alt="" draggable={false} src={art.src} className={styles.distantBlock}
    data-homeworld-depth-layer-v81="3" data-homeworld-distant-dock-v81="closed-maintenance-gantry"
    data-interactive="false" style={{left:p.left,top:p.top,width,height,opacity:below?.28:.72,zIndex:-32900}}/>;
  })()}
  {paintedLevels.map(level=>{
    const drop=homeworldFoundationDepthV81(level),edges=HOMEWORLD_EXPOSED_EDGES_V81[level].filter(edge=>{const[a,b]=homeworldProjectEdgeV81(edge);return visible(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x)+1,Math.abs(b.y-a.y)+drop,camera);});
    if(!edges.length)return null;
    return <svg key={level} aria-hidden="true" data-homeworld-depth-layer-v81="2" data-homeworld-real-foundations-v81={level}
      width={camera.viewWidth} height={camera.viewHeight} viewBox={`${camera.x} ${camera.y} ${camera.viewWidth} ${camera.viewHeight}`}
      style={{position:'absolute',left:camera.x,top:camera.y,zIndex:-11500+homeworldLevelV77(level).elevation,pointerEvents:'none'}}>
      <defs><pattern id={uid+'-foundation-'+level} width="1050" height={foundation.sourceHeight*1050/foundation.sourceWidth} patternUnits="userSpaceOnUse">
       <image href={foundation.src} width="1050" height={foundation.sourceHeight*1050/foundation.sourceWidth} preserveAspectRatio="xMidYMin meet"/>
      </pattern></defs>
      {edges.map(edge=>{const[a,b]=homeworldProjectEdgeV81(edge);return <g key={edge.id} data-homeworld-exposed-ground-edge-v81={edge.id}>
        <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y+drop} ${a.x},${a.y+drop}`} fill="#1c1510"/>
        <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y+drop} ${a.x},${a.y+drop}`} fill={`url(#${uid}-foundation-${level})`}/>
        <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#9b7950" strokeWidth="3" opacity=".65"/>
       </g>;})}
    </svg>;
  })}
  {[0,1,2].map(i=>{
    const art=HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle'],width=70+i*22,period=70+i*31;
    const t=reducedMotion?.3:(Math.max(0,seconds)+i*period*.29)%period/period;
    const x=camera.x-120+t*(camera.viewWidth+240),y=camera.y+camera.viewHeight*(.12+i*.085)+Math.sin(t*Math.PI)*16;
    return <img key={i} src={art.src} alt="" aria-hidden="true" draggable={false} className={styles.skyTraffic}
      data-homeworld-air-traffic-v81={i} data-native-animation-clips="0" style={{left:x,top:y,width,height:width*art.sourceHeight/art.sourceWidth,opacity:below?.12:.65,zIndex:-32000}}/>;
  })}
 </>;
});
