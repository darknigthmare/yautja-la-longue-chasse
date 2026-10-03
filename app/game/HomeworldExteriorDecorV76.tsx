import {memo} from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {HOMEWORLD_EXTERIOR_MODULES_V76,HOMEWORLD_EXTERIOR_ART_V76,
  homeworldExteriorVisibleV76,homeworldExteriorFadeV76} from './systems/homeworldExteriorDecorV76';
import styles from './HomeworldExteriorDecorV76.module.css';
const ordered=HOMEWORLD_EXTERIOR_MODULES_V76.toSorted((a,b)=>a.y-b.y||a.id.localeCompare(b.id));

/** The parent city owns movement/time. This passive render layer shares its
 * measured ground volumes with City; decoration never becomes a loot service. */
export default memo(function HomeworldExteriorDecorV76({actor,cameraX,cameraY,width,height}:{
  actor:{x:number;y:number};cameraX:number;cameraY:number;width:number;height:number;
}){
  const camera={x:cameraX,y:cameraY,width,height};
  return <>{ordered.map(item=>{
    if(!homeworldExteriorVisibleV76(item,camera))return null;
    const art=HOMEWORLD_EXTERIOR_ART_V76[item.artId],p=homeworldProjectGroundV64(item,item.elevation??0);
    return <HomeworldNativePropV64 key={item.id} id={item.id} artId={`exterior-v76:${item.artId}`} art={art}
      className={styles.prop} x={p.x} y={p.y} depth={Math.max(1,item.y)} heightWorld={art.heightWorld*item.scale}
      style={{opacity:homeworldExteriorFadeV76(item,actor) ? .24 : 1}}/>;
  })}</>;
});
