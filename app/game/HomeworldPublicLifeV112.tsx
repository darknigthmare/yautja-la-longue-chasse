import {memo} from 'react';
import {HOMEWORLD_PUBLIC_LIFE_V112,homeworldPublicLifePaintV112,homeworldPublicLifeVisibleV112} from './systems/homeworldPublicLifeV112';
import {homeworldPaintedLevelsV78,homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';
import {homeworldLevelV77,type HomeworldLevelV77,type HomeworldTransitV77} from './systems/homeworldWorldV77';
import styles from './HomeworldCity.module.css';

/** Passive inhabitants on existing public links. All lifecycle/time ownership
 * stays in the city; culling only happens beyond a complete native body gutter. */
export default memo(function HomeworldPublicLifeV112({levelId,camera,seconds,reducedMotion=false,transit=null}:{
 levelId:HomeworldLevelV77;camera:{x:number;y:number;viewWidth:number;viewHeight:number};seconds:number;reducedMotion?:boolean;transit?:HomeworldTransitV77|null;
}){
 const painted=homeworldPaintedLevelsV78(levelId,transit);
 return <>{HOMEWORLD_PUBLIC_LIFE_V112.map(inhabitant=>{
  if(!painted.includes(inhabitant.levelId))return null;
  const p=homeworldPublicLifePaintV112(inhabitant,seconds,reducedMotion);
  if(!homeworldPublicLifeVisibleV112(p.bounds,camera))return null;
  return <span key={inhabitant.id} className={styles.residentV68} aria-hidden="true" data-homeworld-public-life-v112={inhabitant.id}
   data-public-life-role-v112={inhabitant.civilianRole} data-world-level-v77={inhabitant.levelId} data-x={p.pose.x} data-y={p.pose.y}
   data-moving={p.pose.moving} data-routine-phase-v112={p.pose.phase} data-native-facing={p.pose.facing} data-passive-inhabitant-v112="true"
   style={{left:p.foot.x,top:p.foot.y,zIndex:homeworldSceneDepthV78(p.pose.y,homeworldLevelV77(inhabitant.levelId).elevation)}}>
   <span className={styles.residentShadowV68} data-homeworld-ground-contact-v112={inhabitant.id}/>
   <span data-native-source={p.native.source.src} data-native-frame={p.native.index} data-native-clip={`walk-${p.native.clip}`} data-held-native-halt-v112={!p.pose.moving}
    style={{position:'absolute',left:p.sourceLeft,top:p.sourceTop,width:p.width,height:p.height,backgroundImage:`url('${p.native.source.src}')`,
     backgroundPosition:p.backgroundPosition,backgroundSize:p.backgroundSize,backgroundRepeat:'no-repeat',pointerEvents:'none'}}/>
  </span>;
 })}</>;
});
