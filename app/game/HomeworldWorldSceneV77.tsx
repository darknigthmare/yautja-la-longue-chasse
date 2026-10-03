/* eslint-disable @next/next/no-img-element -- existing native game bitmap sources */
import {memo,useId} from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldCivilianV72 from './HomeworldCivilianV72';
import HomeworldPointVisualV64 from './HomeworldPointVisualV64';
import HomeworldLavaSceneV77 from './HomeworldLavaSceneV77';
import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_GROUND_V77,HOMEWORLD_PROPS_V77,HOMEWORLD_FRONTAGE_V77,HOMEWORLD_EXTERIOR_V77,
 HOMEWORLD_RESIDENTS_V77,homeworldResidentPoseV77,HOMEWORLD_LEVELS_V77,HOMEWORLD_SPACEPORT_V77,HOMEWORLD_CONNECTORS_V77,
 HOMEWORLD_CONNECTIONS_V77,HOMEWORLD_CONNECTION_FURNITURE_V77,HOMEWORLD_POINTS_V77,homeworldLevelV77,type HomeworldLevelV77} from './systems/homeworldWorldV77';
import {HOMEWORLD_INTERIOR_POINT_IDS_V64} from './systems/homeworldInteriorsV64';
import {HOMEWORLD_OUTSKIRTS_ART_V71,HOMEWORLD_OUTSKIRTS_GROUND_V71} from './systems/homeworldOutskirtsArtV71';
import {HOMEWORLD_OUTSKIRTS_MODULES_V71} from './systems/homeworldOutskirtsV71';
import {HOMEWORLD_LANDSCAPE_MODULES_V75} from './systems/homeworldLandscapeV75';
import {HOMEWORLD_GROUND_ART_V64,HOMEWORLD_PROP_ART_V64,HOMEWORLD_TRANSPORT_ART_V64} from './systems/homeworldArtV64';
import {HOMEWORLD_FURNITURE_ART_V72} from './systems/homeworldFurnitureV72';
import {HOMEWORLD_EXTERIOR_ART_V76} from './systems/homeworldExteriorDecorV76';
import {HOMEWORLD_GATEWAY_ART_V72,homeworldGatewayScaleV72} from './systems/homeworldRegionConnectionsV72';
import {HOMEWORLD_COUNCIL_STAIR_ART_V77,homeworldCouncilStairPlacementV77} from './systems/homeworldConnectorArtV77';
import {homeworldBuildingSpritePlacementV64,homeworldProjectGroundV64,homeworldBuildingCoversPaintV76,homeworldBuildingDoorwayV64,HOMEWORLD_GEOMETRY_V64} from './systems/homeworldGeometryV64';
import {homeworldBuildingRenderDepthV76,shouldFadeHomeworldBuilding,homeworldBuildingVisibleBoundsV72,shouldFadeHomeworldForeground} from './systems/homeworldCity';
import styles from './HomeworldCity.module.css';
import {HOMEWORLD_URBAN_GROUND_V78} from './systems/homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_PROPS_V78,HOMEWORLD_CITY_GENERATED_PROPS_V78} from './systems/homeworldStreetModulesV78';
import {HOMEWORLD_CITY_NATIVE_ART_V78} from './systems/homeworldCityNativeArtV78';
import {HOMEWORLD_URBAN_EXTRAS_V78,homeworldUrbanExtraRoleV78} from './systems/homeworldUrbanPopulationV78';
import {homeworldPaintedLevelsV78,homeworldSceneDepthV78,homeworldGroundDepthV78,HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78} from './systems/homeworldVisualLayersV78';
import {HOMEWORLD_URBAN_FACADES_V78} from './systems/homeworldUrbanFacadesV78';
import type {HomeworldTransitV77} from './systems/homeworldWorldV77';
type Camera={x:number;y:number;viewWidth:number;viewHeight:number};
const paintedBuildings=[...HOMEWORLD_BUILDINGS_V77,...HOMEWORLD_URBAN_FACADES_V78];
const visible=(box:{left:number;top:number;width:number;height:number},camera:Camera)=>box.left+box.width>=camera.x-160&&box.left<=camera.x+camera.viewWidth+160&&box.top+box.height>=camera.y-160&&box.top<=camera.y+camera.viewHeight+160;
/** Replacement for the exterior draw pass only. Character/input/dialogue/rooms
 * remain in HomeworldHub. Every bitmap is an existing source without raster or
 * CSS camera alteration; all six ground planes use the same physical records. */
export default memo(function HomeworldWorldSceneV77({actor,levelId,camera,seconds,activeDoorId,activePointId,youthWelcome=false,skiffActive=false,reducedMotion=false,transit=null}:{
 actor:{x:number;y:number};levelId:HomeworldLevelV77;camera:Camera;seconds:number;activeDoorId:string|null;activePointId:string|null;youthWelcome?:boolean;skiffActive?:boolean;reducedMotion?:boolean;transit?:HomeworldTransitV77|null;
}){
 const id=useId().replace(/:/g,'-'),d=HOMEWORLD_GEOMETRY_V64.depthScale;
 const paintedLevels=homeworldPaintedLevelsV78(levelId,transit),painted=(level:HomeworldLevelV77)=>paintedLevels.includes(level);
 const depth=(level:HomeworldLevelV77,y:number,extraElevation=0)=>homeworldSceneDepthV78(y,homeworldLevelV77(level).elevation+extraElevation);
 const prop=(key:string,artId:string,art:Parameters<typeof HomeworldNativePropV64>[0]['art'],point:{x:number;y:number},level:HomeworldLevelV77,heightWorld:number,opacity=1,extraElevation=0)=>{
  const p=homeworldProjectGroundV64(point,homeworldLevelV77(level).elevation+extraElevation),scale=heightWorld/art.alphaBounds.height;
  const box={left:p.x-art.pivot.x*scale,top:p.y-art.pivot.y*scale,width:art.sourceRect.width*scale,height:art.sourceRect.height*scale};
  if(!visible(box,camera))return null;
  return <HomeworldNativePropV64 key={key} id={key} artId={artId} art={art} x={p.x} y={p.y} depth={depth(level,point.y,extraElevation)} heightWorld={heightWorld} style={{opacity}}/>;
 };
 return <>
  <HomeworldLavaSceneV77 actor={actor} skiffActive={skiffActive} skiffPoint={actor} floor={levelId} camera={camera} seconds={seconds} reducedMotion={reducedMotion}/>
  <svg aria-hidden="true" data-homeworld-natural-ground-v77="true" width={camera.viewWidth} height={camera.viewHeight} viewBox={`${camera.x} ${camera.y} ${camera.viewWidth} ${camera.viewHeight}`} style={{position:'absolute',left:camera.x,top:camera.y,zIndex:-40000,pointerEvents:'none'}}>
   <defs><pattern id={`${id}-natural`} width="300" height={300*d} patternUnits="userSpaceOnUse"><image href={HOMEWORLD_OUTSKIRTS_GROUND_V71.src} width="300" height={300*d} preserveAspectRatio="none"/></pattern></defs>
   <rect x={camera.x} y={camera.y} width={camera.viewWidth} height={camera.viewHeight} fill={`url(#${id}-natural)`}/>
  </svg>
  {HOMEWORLD_LEVELS_V77.map(level=><svg key={level.id} aria-hidden="true" data-homeworld-level-ground-v77={level.id}
   width={camera.viewWidth} height={camera.viewHeight} viewBox={`${camera.x} ${camera.y} ${camera.viewWidth} ${camera.viewHeight}`}
   style={{position:'absolute',left:camera.x,top:camera.y,zIndex:homeworldGroundDepthV78(level.id,levelId,transit),pointerEvents:'none'}}>
   <defs><pattern id={`${id}-paving-${level.id}`} width="150" height={150*d} patternUnits="userSpaceOnUse"><image href={HOMEWORLD_GROUND_ART_V64.src} width="150" height={150*d} preserveAspectRatio="none"/></pattern></defs>
   {[...HOMEWORLD_GROUND_V77,...HOMEWORLD_URBAN_GROUND_V78].filter(ground=>ground.levelId===level.id).map(ground=><polygon key={ground.id} data-world-ground-id-v77={ground.id}
    points={ground.polygon.map(p=>`${p.x},${p.y*d-level.elevation}`).join(' ')} fill={`url(#${id}-paving-${level.id})`} stroke={level.id===levelId?'#a58c67':'#514639'} strokeWidth="2" opacity={level.id===levelId?1:.72}/>)}</svg>)}
  {paintedBuildings.filter(building=>painted(building.levelId)).map(building=>{
   const image=homeworldBuildingSpritePlacementV64(building),z=homeworldLevelV77(building.levelId).elevation,box={...image,top:image.top-z};if(!visible(box,camera))return null;
   return <div key={building.id} className={styles.buildingV64} data-building-id={building.id} data-world-level-v77={building.levelId}
    data-building-native-source={building.art.src} data-building-orientation-v76={building.art.groundFrame?.yawDegrees??0}
    data-building-decoration-v78={'interactive' in building&&!building.interactive?'CLOSED_SCENERY_FACADE':undefined}
    data-occluded={building.levelId===levelId&&shouldFadeHomeworldBuilding(building,actor)}
    style={{...box,zIndex:depth(building.levelId,homeworldBuildingRenderDepthV76(building,actor))}}>
    {building.art.sourceRect?<span style={{display:'block',width:'100%',height:'100%',backgroundImage:`url('${building.art.src}')`,backgroundRepeat:'no-repeat',
     backgroundSize:`${building.art.sourceWidth*image.width/building.art.sourceRect.width}px ${building.art.sourceHeight*image.height/building.art.sourceRect.height}px`,
     backgroundPosition:`${-building.art.sourceRect.x*image.width/building.art.sourceRect.width}px ${-building.art.sourceRect.y*image.height/building.art.sourceRect.height}px`}}/>
     :<img src={building.art.src} alt="" draggable={false}/>}
    {building.id===activeDoorId&&(()=>{const socket=homeworldProjectGroundV64(homeworldBuildingDoorwayV64(building).threshold,z);return <span className={styles.doorMarkerV64} data-painted-door-id={building.id} style={{left:socket.x-box.left,top:socket.y-box.top}}><i/><b>{building.label}</b></span>;})()}
   </div>;
  })}
  {painted('0')&&<div className={styles.landingPadV64} data-homeworld-spaceport="pad" style={{left:HOMEWORLD_SPACEPORT_V77.pad.x-HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].pivot.x*HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].scaleWorldPerPixel,
   top:(HOMEWORLD_SPACEPORT_V77.pad.y-HOMEWORLD_SPACEPORT_V77.pad.depth/2-HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].pivot.y*HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].scaleWorldPerPixel)*d,
   width:HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].renderWidthWorld,height:HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].renderDepthWorld*d,backgroundImage:`url('${HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].src}')`,zIndex:-10999}}/>}
  {painted('0')&&[...HOMEWORLD_OUTSKIRTS_MODULES_V71,...HOMEWORLD_LANDSCAPE_MODULES_V75].map(item=>{const art=HOMEWORLD_OUTSKIRTS_ART_V71[item.artId];return prop(item.id,'landscape:'+item.artId,art,item,'0',art.heightWorld*item.scale,1);})}
  {HOMEWORLD_PROPS_V77.filter(item=>painted(item.levelId)).map(item=>item.artId?prop(item.id,item.artId,HOMEWORLD_PROP_ART_V64[item.artId],item,item.levelId,item.height,item.levelId===levelId&&shouldFadeHomeworldForeground(item,actor)?.2:1):null)}
  {[...HOMEWORLD_FRONTAGE_V77,...HOMEWORLD_CONNECTION_FURNITURE_V77].filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_FURNITURE_ART_V72[item.artId];return prop(item.id,item.artId,art,item,item.levelId,art.heightWorld*(item.scale??1));})}
  {[...HOMEWORLD_EXTERIOR_V77,...HOMEWORLD_URBAN_PROPS_V78].filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_EXTERIOR_ART_V76[item.artId];return prop(item.id,item.artId,art,item,item.levelId,art.heightWorld*item.scale,1,item.elevation??0);})}
  {HOMEWORLD_CITY_GENERATED_PROPS_V78.filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_CITY_NATIVE_ART_V78[item.artId];return prop(item.id,'city-native-v78:'+item.artId,art,item,item.levelId,art.heightWorld);})}
  {HOMEWORLD_CONNECTIONS_V77.filter(connection=>painted(connection.levelId)).map(connection=>{const art=HOMEWORLD_GATEWAY_ART_V72[connection.artId];return prop('gateway-v72:'+connection.regionId,connection.artId,art,connection.threshold,connection.levelId,art.heightWorld*homeworldGatewayScaleV72(connection));})}
  {painted('0')&&prop('clan-local-shuttle','clan-shuttle',HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle'],HOMEWORLD_SPACEPORT_V77.shuttle,'0',HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle'].heightWorld)}
  {HOMEWORLD_POINTS_V77.filter(p=>painted(p.levelId)&&!HOMEWORLD_INTERIOR_POINT_IDS_V64.has(p.id)).map(point=>{
   const z=homeworldLevelV77(point.levelId).elevation,p=homeworldProjectGroundV64(point,z);
   if(!visible({left:p.x-100,top:p.y-160,width:200,height:190},camera))return null;
   return <div key={point.id} data-world-point-v77={point.id} data-world-level-v77={point.levelId} style={{position:'absolute',inset:0,pointerEvents:'none',transform:`translateY(${-z}px)`,zIndex:depth(point.levelId,point.y)}}><HomeworldPointVisualV64 point={point} active={point.id===activePointId&&point.levelId===levelId} youthWelcome={youthWelcome}/></div>;
  })}
  {[...HOMEWORLD_RESIDENTS_V77,...HOMEWORLD_URBAN_EXTRAS_V78].filter(resident=>painted(resident.levelId)).map(resident=>{
   const pose=homeworldResidentPoseV77(resident,seconds),p=homeworldProjectGroundV64(pose,homeworldLevelV77(resident.levelId).elevation);
   if(!visible({left:p.x-100,top:p.y-130,width:200,height:150},camera))return null;
   if(paintedBuildings.some(b=>{if(b.levelId!==resident.levelId||pose.y>=homeworldBuildingRenderDepthV76(b,pose))return false;if(b.art.opaqueRowsV76)return homeworldBuildingCoversPaintV76(b,pose);const bounds=homeworldBuildingVisibleBoundsV72(b),foot=homeworldProjectGroundV64(pose);return foot.x>bounds.left&&foot.x<bounds.left+bounds.width&&foot.y>bounds.top&&foot.y<bounds.top+bounds.height;}))return null;
   return <span key={resident.id} className={styles.residentV68} data-homeworld-resident={resident.id} data-world-level-v77={resident.levelId}
    data-x={pose.x} data-y={pose.y} data-moving={pose.moving} style={{left:p.x,top:p.y,zIndex:depth(resident.levelId,pose.y)}}>
    <HomeworldCivilianV72 role={homeworldUrbanExtraRoleV78(resident)} facing={pose.facing} height={resident.morphId==='young'?82:100} moving={pose.moving} seconds={seconds+resident.phaseSeconds} speed={resident.speed}/>
   </span>;
  })}
  {HOMEWORLD_CONNECTORS_V77.filter(connector=>painted(connector.from.levelId)||painted(connector.to.levelId)).map(connector=>{
   const a=homeworldProjectGroundV64(connector.from.point,homeworldLevelV77(connector.from.levelId).elevation),b=homeworldProjectGroundV64(connector.to.point,homeworldLevelV77(connector.to.levelId).elevation);
   if(!visible({left:Math.min(a.x,b.x)-140,top:Math.min(a.y,b.y)-60,width:Math.abs(a.x-b.x)+280,height:Math.abs(a.y-b.y)+120},camera))return null;
   if(connector.id==='council-stair'){
    const art=HOMEWORLD_COUNCIL_STAIR_ART_V77,layout=homeworldCouncilStairPlacementV77({...connector.from,elevation:homeworldLevelV77(connector.from.levelId).elevation},{...connector.to,elevation:homeworldLevelV77(connector.to.levelId).elevation});
    if(!visible(layout,camera))return null;
    return <img key={connector.id} src={art.src} alt="" draggable={false} data-homeworld-vertical-connector-v77={connector.id} data-native-art-status="NATIVE_ALIGNED" data-native-sha256={art.sha256} style={{position:'absolute',left:layout.left,top:layout.top,width:layout.width,height:layout.height,maxWidth:'none',zIndex:HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78,pointerEvents:'none'}}/>;
   }
   return <svg key={connector.id} data-homeworld-vertical-connector-v77={connector.id} data-native-art-status={connector.artStatus}
    width={camera.viewWidth} height={camera.viewHeight} viewBox={`${camera.x} ${camera.y} ${camera.viewWidth} ${camera.viewHeight}`}
    style={{position:'absolute',left:camera.x,top:camera.y,zIndex:HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78,pointerEvents:'none'}}>
    <defs><pattern id={`${id}-connector-${connector.id}`} width="150" height={150*d} patternUnits="userSpaceOnUse"><image href={HOMEWORLD_GROUND_ART_V64.src} width="150" height={150*d} preserveAspectRatio="none"/></pattern></defs>
    {/* Native paving replaces the untextured beige strip. This is still the
        existing schematic connector, not a newly authored stair illustration. */}
    <path d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke="#302c25" strokeWidth="114"/><path d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke={`url(#${id}-connector-${connector.id})`} strokeWidth="110"/>
   </svg>;
  })}
 </>;
});
