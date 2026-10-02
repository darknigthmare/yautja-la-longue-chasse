import { memo, useId } from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldFurnitureV72 from './HomeworldFurnitureV72';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_GROUND_ART_V64, HOMEWORLD_PROP_ART_V64 } from './systems/homeworldArtV64';
import { HOMEWORLD_REGION_CONNECTIONS_V72, HOMEWORLD_GATEWAY_ART_V72, HOMEWORLD_CONNECTION_WORLD_V72,
  HOMEWORLD_CONNECTION_STREETS_V72, HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72, HOMEWORLD_CONNECTION_FURNITURE_V72,
  homeworldConnectionVisibleV72, homeworldGatewayScaleV72, homeworldConnectionCompassV72 } from './systems/homeworldRegionConnectionsV72';
import { homeworldFurnitureVisibleV72 } from './systems/homeworldFurnitureV72';
import { canEnterHomeworldRegionV68 } from './systems/homeworldRegionsV68';
import { canEnterHomeworldPassageV67 } from './systems/homeworldPassageV67';
import type { SaveGame } from './types';
import styles from './HomeworldRegionConnectionsV72.module.css';

/** Native entrances, their traversable ground bands and role-specific shoulder
 * furniture are distinct layers. Physics imports these same ground polygons.
 * Upright atlas cells are never CSS-rotated into another camera perspective. */
export default memo(function HomeworldRegionConnectionsV72({actor,cameraX,cameraY,width,height,save}:{
  actor:{x:number;y:number};cameraX:number;cameraY:number;width:number;height:number;save:SaveGame;
}) {
  const id=useId().replace(/:/g,'-'),depth=HOMEWORLD_GEOMETRY_V64.depthScale;
  const camera={x:cameraX,y:cameraY,width,height};
  const left=Math.max(0,Math.floor((cameraX-160)/240)*240),top=Math.max(0,Math.floor((cameraY/depth-180)/240)*240);
  const right=Math.min(HOMEWORLD_CONNECTION_WORLD_V72.width,Math.ceil((cameraX+width+160)/240)*240);
  const bottom=Math.min(HOMEWORLD_CONNECTION_WORLD_V72.height,Math.ceil(((cameraY+height)/depth+180)/240)*240);
  const floorWidth=Math.max(1,right-left),floorDepth=Math.max(1,bottom-top);
  return <>
    <svg data-homeworld-connection-floor="v72" className={styles.floor} width={floorWidth} height={floorDepth}
      viewBox={`${left} ${top} ${floorWidth} ${floorDepth}`} style={{left,top:top*depth,transform:`scaleY(${depth})`}}>
      <defs><pattern id={`${id}-paving`} width="110" height="110" patternUnits="userSpaceOnUse">
        <image href={HOMEWORLD_GROUND_ART_V64.src} width="110" height="110" preserveAspectRatio="none" />
      </pattern></defs>
      {HOMEWORLD_CONNECTION_STREETS_V72.map(street=>{
        if(street.polygon.every(p=>p.x<left)||street.polygon.every(p=>p.x>right)||street.polygon.every(p=>p.y<top)||street.polygon.every(p=>p.y>bottom))return null;
        return <polygon key={street.id} data-homeworld-connection-band-v72={street.id} points={street.polygon.map(p=>`${p.x},${p.y}`).join(' ')}
          fill={`url(#${id}-paving)`} stroke="#a2957b" strokeOpacity=".65" strokeWidth="4" />;
      })}
      {HOMEWORLD_REGION_CONNECTIONS_V72.map(item=>{
        if(item.nodes.every(p=>p.x<left)||item.nodes.every(p=>p.x>right)||item.nodes.every(p=>p.y<top)||item.nodes.every(p=>p.y>bottom))return null;
        const d=item.nodes.map((p,n)=>`${n?'L':'M'}${p.x},${p.y}`).join(' ');
        return <path key={item.regionId} d={d} fill="none" stroke={item.material==='resinwood'?'#79907c':item.material==='ribbed'?'#ae865f':'#c0ab7d'}
          strokeWidth="3" strokeOpacity=".65" strokeDasharray={item.material==='ribbed'?'8 28':'20 50'} />;
      })}
    </svg>
    {HOMEWORLD_REGION_CONNECTIONS_V72.map(item=>{
      if(!homeworldConnectionVisibleV72(item,camera,depth))return null;
      const art=HOMEWORLD_GATEWAY_ART_V72[item.artId],scale=homeworldGatewayScaleV72(item),p=homeworldProjectGroundV64(item.threshold);
      const village=canEnterHomeworldRegionV68(save,item.regionId),inquiry=(item.regionId==='ash-marches'||item.regionId==='glass-desert')
        ?canEnterHomeworldPassageV67(save,item.regionId):null;
      const allowed=village.allowed||inquiry?.allowed,near=Math.hypot(actor.x-item.threshold.x,actor.y-item.threshold.y)<650;
      const obscures=actor.y<item.threshold.y&&Math.abs(actor.x-item.threshold.x)<art.alphaBounds.width*scale/2
        &&(item.threshold.y-actor.y)*depth<art.alphaBounds.height*scale+100;
      return <div key={item.regionId} data-homeworld-region-connection-v72={item.regionId} data-connection-authorized={!!allowed}>
        <HomeworldNativePropV64 id={`gateway-v72:${item.regionId}`} artId={`gateway-v72:${item.artId}`} art={art}
          x={p.x} y={p.y} depth={item.threshold.y} heightWorld={art.heightWorld*scale} style={{opacity:obscures?.25:1}} />
        <span className={styles.label} style={{left:p.x,top:p.y+54,zIndex:Math.round(item.arrival.y)+1,opacity:near?1:.7}}>
          <strong>{item.name}</strong><small>{allowed?'Approcher le seuil · interagir':'Accès accompagné / autorisation requise'}</small>
          {near&&!allowed&&<em>{village.reason}</em>}
        </span>
      </div>;
    })}
    {HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72.map(sign=>{
      const p=homeworldProjectGroundV64(sign),art=HOMEWORLD_PROP_ART_V64.beacon;
      if(p.x+150<cameraX||p.x-150>cameraX+width||p.y+100<cameraY||p.y-art.heightWorld>cameraY+height)return null;
      return <div key={sign.id} data-homeworld-direction-sign-v72={sign.regionId}>
        <HomeworldNativePropV64 id={sign.id} artId="direction-beacon-v72" art={art} x={p.x} y={p.y} depth={sign.y} />
        <span className={styles.direction} style={{left:p.x,top:p.y+10,zIndex:Math.round(sign.y)+1}}>{homeworldConnectionCompassV72(sign.regionId,depth)} {sign.label}<small>Repère · rejoindre le seuil extérieur</small></span>
      </div>;
    })}
    {HOMEWORLD_CONNECTION_FURNITURE_V72.map(item=>homeworldFurnitureVisibleV72(item,camera,depth)
      ?<HomeworldFurnitureV72 key={item.id} {...item} actor={actor} />:null)}
  </>;
});
