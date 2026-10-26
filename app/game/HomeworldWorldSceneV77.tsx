import HomeworldArchiveComparisonWorldV107 from './HomeworldArchiveComparisonWorldV107';
import HomeworldCargoWorldV108 from './HomeworldCargoWorldV108';
import HomeworldArchivePlaqueWorldV111 from './HomeworldArchivePlaqueWorldV111';
import type {HomeworldArchivePlaqueV109} from './systems/homeworldArchivePlaqueLedgerV109';
import type {HomeworldCargoLedgerV108} from './systems/homeworldCargoLedgerV108';
import type {HomeworldArchiveComparisonV107} from './systems/homeworldArchiveComparisonLedgerV107';
import HomeworldArchiveWorldV106 from './HomeworldArchiveWorldV106';
import type {HomeworldArchiveLedgerV106} from './systems/homeworldArchiveLedgerV106';
/* eslint-disable @next/next/no-img-element -- existing native game bitmap sources */
import {memo,useId} from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldCivilianV72 from './HomeworldCivilianV72';
import HomeworldPointVisualV64 from './HomeworldPointVisualV64';
import HomeworldLavaSceneV77 from './HomeworldLavaSceneV77';
import HomeworldBackdropV81 from './HomeworldBackdropV81';
import HomeworldRetainingSupportV82 from './HomeworldRetainingSupportV82';
import HomeworldEcotonesV90 from './HomeworldEcotonesV90';
import HomeworldCartographerV104 from './HomeworldCartographerV104';
import {HOMEWORLD_CARTOGRAPHY_V105} from './systems/homeworldCartographyDefinitionV105';
import {HOMEWORLD_RETAINING_SUPPORTS_V82} from './systems/homeworldRetainingAssembliesV82';
import {HOMEWORLD_NATIVE_CATALOGUE_V81} from './systems/homeworldNativeArchitectureV81';
import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_GROUND_V77,HOMEWORLD_CONNECTOR_PADS_V82,HOMEWORLD_PROPS_V77,HOMEWORLD_FRONTAGE_V77,HOMEWORLD_EXTERIOR_V77,
 HOMEWORLD_RESIDENTS_V77,homeworldResidentPoseV77,HOMEWORLD_LEVELS_V77,HOMEWORLD_SPACEPORT_V77,HOMEWORLD_CONNECTORS_V77,
 HOMEWORLD_CONNECTIONS_V77,HOMEWORLD_CONNECTION_FURNITURE_V77,HOMEWORLD_POINTS_V77,homeworldLevelV77,type HomeworldLevelV77} from './systems/homeworldWorldV77';
import {HOMEWORLD_INTERIOR_POINT_IDS_V64} from './systems/homeworldInteriorsV64';
import {HOMEWORLD_OUTSKIRTS_ART_V71,HOMEWORLD_OUTSKIRTS_GROUND_V71} from './systems/homeworldOutskirtsArtV71';
import {HOMEWORLD_GROUND_ART_V64,HOMEWORLD_PROP_ART_V64,HOMEWORLD_TRANSPORT_ART_V64} from './systems/homeworldArtV64';
import {HOMEWORLD_FURNITURE_ART_V72} from './systems/homeworldFurnitureV72';
import {HOMEWORLD_GATEWAY_ART_V72,homeworldGatewayScaleV72} from './systems/homeworldRegionConnectionsV72';
import {homeworldConnectorArtV82,homeworldConnectorPlacementV82,homeworldConnectorSourceStateV82} from './systems/homeworldConnectorArtV82';
import {HOMEWORLD_LIFT_CABIN_ART_V82,homeworldLiftCabinPlacementV82,type HomeworldLiftStationV83} from './systems/homeworldLiftCabinV82';
import {homeworldBuildingSpritePlacementV64,homeworldProjectGroundV64,homeworldBuildingDoorwayV64,HOMEWORLD_GEOMETRY_V64} from './systems/homeworldGeometryV64';
import {homeworldBuildingRenderDepthV76,shouldFadeHomeworldBuilding,shouldFadeHomeworldForeground} from './systems/homeworldCity';
import styles from './HomeworldCity.module.css';
import streetContactStylesV100 from './HomeworldStreetConversationV100.module.css';
import {homeworldResidentOccludedV100} from './systems/homeworldResidentVisibilityV100';
import {HOMEWORLD_URBAN_GROUND_V78} from './systems/homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_PROPS_V78,HOMEWORLD_CITY_GENERATED_PROPS_V78} from './systems/homeworldStreetModulesV78';
import {HOMEWORLD_CITY_NATIVE_ART_V78} from './systems/homeworldCityNativeArtV78';
import {HOMEWORLD_URBAN_EXTRAS_V78,homeworldUrbanExtraRoleV78} from './systems/homeworldUrbanPopulationV78';
import {homeworldPaintedLevelsV78,homeworldSceneDepthV78,homeworldGroundDepthV78,HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78} from './systems/homeworldVisualLayersV78';
import {HOMEWORLD_URBAN_FACADES_V78} from './systems/homeworldUrbanFacadesV78';
import {HOMEWORLD_CIVIC_ART_V80,HOMEWORLD_CIVIC_PROPS_V80} from './systems/homeworldCivicDecorV80';
import {HOMEWORLD_COURT_ART_V80} from './systems/homeworldCourtArtV80';
import {HOMEWORLD_NATURAL_MODULES_V80} from './systems/homeworldNaturalPlacementsV80';
import {HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85,HOMEWORLD_NATURAL_PUBLIC_GROUND_V85} from './systems/homeworldNaturalSupportsV85';
import type {HomeworldTransitV77} from './systems/homeworldWorldV77';
import {HOMEWORLD_STREET_DECOR_ART_V83,HOMEWORLD_STREET_DECOR_PROPS_V83} from './systems/homeworldStreetDecorV83';
import {HOMEWORLD_STREET_DECOR_ART_V84} from './systems/homeworldStreetDecorV84';
import {HOMEWORLD_STREET_DECOR_PROPS_V84} from './systems/homeworldStreetDecorMountV84';
import {HOMEWORLD_STREET_COMPOSITION_ART_V92,homeworldStreetCompositionOpacityV92,homeworldCityFurnitureOpacityV92} from './systems/homeworldStreetCompositionV92';
import {HOMEWORLD_STREET_COMPOSITION_PROPS_V92} from './systems/homeworldStreetCompositionMountV92';
type Camera={x:number;y:number;viewWidth:number;viewHeight:number};
const paintedBuildings=[...HOMEWORLD_BUILDINGS_V77,...HOMEWORLD_URBAN_FACADES_V78];
const publicNaturalGround=HOMEWORLD_NATURAL_PUBLIC_GROUND_V85;
export {HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85};
const visible=(box:{left:number;top:number;width:number;height:number},camera:Camera)=>box.left+box.width>=camera.x-160&&box.left<=camera.x+camera.viewWidth+160&&box.top+box.height>=camera.y-160&&box.top<=camera.y+camera.viewHeight+160;
/** Replacement for the exterior draw pass only. Character/input/dialogue/rooms
 * remain in HomeworldHub. Every bitmap is an existing source without raster or
 * CSS camera alteration; all six ground planes use the same physical records. */
export default memo(function HomeworldWorldSceneV77({actor,levelId,camera,seconds,archivePlaqueV109,archivistActiveV111=false,archivistPausedV111=true,archivistSequenceV111='',cargoV108,comparisonV107,archiveV106,archiveActiveV106=false,activeDoorId,activePointId,activeStreetContactV100=null,activeCartographyV104=false,cartographyHighPointV105=false,youthWelcome=false,skiffActive=false,reducedMotion=false,transit=null,liftStateV83=null}:{
 archivePlaqueV109?:HomeworldArchivePlaqueV109;archivistActiveV111?:boolean;archivistPausedV111?:boolean;archivistSequenceV111?:string;
 cargoV108?:HomeworldCargoLedgerV108;comparisonV107?:HomeworldArchiveComparisonV107;archiveV106?:HomeworldArchiveLedgerV106;archiveActiveV106?:boolean;actor:{x:number;y:number};levelId:HomeworldLevelV77;camera:Camera;seconds:number;activeDoorId:string|null;activePointId:string|null;activeStreetContactV100?:string|null;activeCartographyV104?:boolean;cartographyHighPointV105?:boolean;youthWelcome?:boolean;skiffActive?:boolean;reducedMotion?:boolean;transit?:HomeworldTransitV77|null;liftStateV83?:HomeworldLiftStationV83|null;
}){
 const id=useId().replace(/:/g,'-'),d=HOMEWORLD_GEOMETRY_V64.depthScale;
 const paintedLevels=homeworldPaintedLevelsV78(levelId,transit),painted=(level:HomeworldLevelV77)=>paintedLevels.includes(level);
 const residentPoses=[...HOMEWORLD_RESIDENTS_V77,...HOMEWORLD_URBAN_EXTRAS_V78].filter(resident=>painted(resident.levelId)).map(resident=>({resident,pose:homeworldResidentPoseV77(resident,seconds)}));
 const furnitureOccupants=[{...actor,levelId},...residentPoses.map(({resident,pose})=>({...pose,levelId:resident.levelId}))];
 const depth=(level:HomeworldLevelV77,y:number,extraElevation=0)=>homeworldSceneDepthV78(y,homeworldLevelV77(level).elevation+extraElevation);
 const prop=(key:string,artId:string,art:Parameters<typeof HomeworldNativePropV64>[0]['art'],point:{x:number;y:number},level:HomeworldLevelV77,heightWorld:number,opacity=1,extraElevation=0)=>{
  const p=homeworldProjectGroundV64(point,homeworldLevelV77(level).elevation+extraElevation),scale=heightWorld/art.alphaBounds.height;
  const box={left:p.x-art.pivot.x*scale,top:p.y-art.pivot.y*scale,width:art.sourceRect.width*scale,height:art.sourceRect.height*scale};
  if(!visible(box,camera))return null;
  return <HomeworldNativePropV64 key={key} id={key} artId={artId} art={art} x={p.x} y={p.y} depth={depth(level,point.y,extraElevation)} heightWorld={heightWorld} style={{opacity}}/>;
 };
 return <>
  {archivePlaqueV109&&<HomeworldArchivePlaqueWorldV111 levelId={levelId} ledger={archivePlaqueV109} seconds={seconds} archivistActiveV111={archivistActiveV111} archivistPausedV111={archivistPausedV111} archivistSequenceV111={archivistSequenceV111} reducedMotionV111={reducedMotion}/>}
  {cargoV108&&<HomeworldCargoWorldV108 levelId={levelId} ledger={cargoV108} seconds={seconds}/>}
  {comparisonV107&&<HomeworldArchiveComparisonWorldV107 levelId={levelId} ledger={comparisonV107}/>}
  {archiveV106&&<HomeworldArchiveWorldV106 levelId={levelId} seconds={seconds} ledger={archiveV106} active={archiveActiveV106}/>}
  <HomeworldCartographerV104 levelId={levelId} seconds={seconds} active={activeCartographyV104}/>
  {cartographyHighPointV105&&levelId==='+1'&&(()=>{const p=homeworldProjectGroundV64(HOMEWORLD_CARTOGRAPHY_V105.highPoint,homeworldLevelV77('+1').elevation);return <span data-homeworld-high-point-v105 style={{position:'absolute',left:p.x-64,top:p.y-30,width:128,height:60,border:'2px dashed #dcc68d',borderRadius:'50%',background:'#dcc68d18',pointerEvents:'none',zIndex:depth('+1',HOMEWORLD_CARTOGRAPHY_V105.highPoint.y)}}><span style={{position:'absolute',left:-48,top:-48,width:220,textAlign:'center',color:'#f4e1b3',background:'#12211fe8',padding:8,borderRadius:5,fontSize:13}}>Point d’observation du viaduc</span></span>;})()}
  <HomeworldBackdropV81 camera={camera} levelId={levelId} paintedLevels={paintedLevels} seconds={seconds} reducedMotion={reducedMotion}/>
  <HomeworldLavaSceneV77 actor={actor} skiffActive={skiffActive} skiffPoint={actor} floor={levelId} camera={camera} seconds={seconds} reducedMotion={reducedMotion}/>
  {painted('0')&&<svg aria-hidden="true" data-homeworld-natural-ground-v77="true" data-natural-support-solid-v85="false" width={camera.viewWidth} height={camera.viewHeight} viewBox={`${camera.x} ${camera.y} ${camera.viewWidth} ${camera.viewHeight}`} style={{position:'absolute',left:camera.x,top:camera.y,zIndex:-11001,pointerEvents:'none'}}>
   <defs>
    <pattern id={`${id}-natural`} width="300" height={300*d} patternUnits="userSpaceOnUse"><image href={HOMEWORLD_OUTSKIRTS_GROUND_V71.src} width="300" height={300*d} preserveAspectRatio="none"/></pattern>
    <pattern id={`${id}-natural-rock`} width="1050" height={HOMEWORLD_NATIVE_CATALOGUE_V81.assets['basalt-city-foundation'].art.sourceHeight*1050/HOMEWORLD_NATIVE_CATALOGUE_V81.assets['basalt-city-foundation'].art.sourceWidth} patternUnits="userSpaceOnUse"><image href={HOMEWORLD_NATIVE_CATALOGUE_V81.assets['basalt-city-foundation'].art.src} width="1050" height={HOMEWORLD_NATIVE_CATALOGUE_V81.assets['basalt-city-foundation'].art.sourceHeight*1050/HOMEWORLD_NATIVE_CATALOGUE_V81.assets['basalt-city-foundation'].art.sourceWidth} preserveAspectRatio="xMidYMin meet"/></pattern>
    <mask id={`${id}-natural-outside`} maskUnits="userSpaceOnUse" x={camera.x} y={camera.y} width={camera.viewWidth} height={camera.viewHeight}>
     <rect x={camera.x} y={camera.y} width={camera.viewWidth} height={camera.viewHeight} fill="white"/>
     {publicNaturalGround.map(ground=><polygon key={ground.id} points={ground.polygon.map(p=>`${p.x},${p.y*d}`).join(' ')} fill="black"/>)}
    </mask>
   </defs>
   {/* Source formations share anchored rock promontories. Existing public
       pavement remains opaque above them; no physical support is widened. */}
   <g mask={`url(#${id}-natural-outside)`}>
    {HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85.map(terrace=><g key={terrace.id} data-homeworld-natural-formation-v85={terrace.id} data-natural-ground-anchor-v85={terrace.groundId}>
     {terrace.polygon.map((a,index)=>{const b=terrace.polygon[(index+1)%terrace.polygon.length];if(b.x>=a.x)return null;return <polygon key={index} data-natural-rock-face-v85="true" points={`${a.x},${a.y*d} ${b.x},${b.y*d} ${b.x},${b.y*d+300} ${a.x},${a.y*d+300}`} fill={`url(#${id}-natural-rock)`}/>;})}
     <polygon data-natural-support-top-v85="true" points={terrace.polygon.map(p=>`${p.x},${p.y*d}`).join(' ')} fill={`url(#${id}-natural)`}/>
    </g>)}
   </g>
  </svg>}
  {painted('0')&&<HomeworldEcotonesV90 camera={camera}/>}
  {HOMEWORLD_LEVELS_V77.filter(level=>painted(level.id)).map(level=><svg key={level.id} aria-hidden="true" data-homeworld-level-ground-v77={level.id}
   width={camera.viewWidth} height={camera.viewHeight} viewBox={`${camera.x} ${camera.y} ${camera.viewWidth} ${camera.viewHeight}`}
   style={{position:'absolute',left:camera.x,top:camera.y,zIndex:homeworldGroundDepthV78(level.id,levelId,transit),pointerEvents:'none'}}>
   <defs><pattern id={`${id}-paving-${level.id}`} width="360" height={360*d} patternUnits="userSpaceOnUse"><image
    href={HOMEWORLD_NATIVE_CATALOGUE_V81.assets[level.id.startsWith('-')?'paving-undercity':level.id.startsWith('+')?'paving-council':'paving-civic'].art.src}
    width="360" height={360*d} preserveAspectRatio="none"/></pattern></defs>
   {/* One source-aligned opaque union: internal legacy route overlaps must not
       paint rectangular border grids or expose unrelated background floors. */}
   <g className={styles.civicGroundUnionV80} data-homeworld-ground-union-v80={level.id}>
    {[...HOMEWORLD_GROUND_V77,...HOMEWORLD_CONNECTOR_PADS_V82,...HOMEWORLD_URBAN_GROUND_V78].filter(ground=>ground.levelId===level.id).map(ground=><polygon key={ground.id} data-world-ground-id-v77={ground.id}
     points={ground.polygon.map(p=>`${p.x},${p.y*d-level.elevation}`).join(' ')} fill={`url(#${id}-paving-${level.id})`} stroke="none" opacity="1"/>)}</g></svg>)}
  {paintedBuildings.filter(building=>painted(building.levelId)).map(building=>{
   const image=homeworldBuildingSpritePlacementV64(building),z=homeworldLevelV77(building.levelId).elevation,box={...image,top:image.top-z};if(!visible(box,camera))return null;
   return <div key={building.id} className={styles.buildingV64} data-building-id={building.id} data-world-level-v77={building.levelId}
    data-building-native-source={building.art.src} data-building-orientation-v76={building.art.groundFrame?.yawDegrees??0}
    data-native-facade-state-v83={'nativeStatus' in building?building.nativeStatus:undefined}
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
  {painted('0')&&HOMEWORLD_NATURAL_MODULES_V80.map(item=>{const art=HOMEWORLD_OUTSKIRTS_ART_V71[item.artId];return prop(item.id,'landscape:'+item.artId,art,item,'0',art.heightWorld*item.scale,1);})}
  {HOMEWORLD_PROPS_V77.filter(item=>painted(item.levelId)).map(item=>item.artId?prop(item.id,item.artId,HOMEWORLD_PROP_ART_V64[item.artId],item,item.levelId,item.height,item.levelId===levelId&&shouldFadeHomeworldForeground(item,actor)?.2:1):null)}
  {[...HOMEWORLD_FRONTAGE_V77,...HOMEWORLD_CONNECTION_FURNITURE_V77].filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_FURNITURE_ART_V72[item.artId];return prop(item.id,item.artId,art,item,item.levelId,art.heightWorld*(item.scale??1));})}
  {[...HOMEWORLD_EXTERIOR_V77,...HOMEWORLD_URBAN_PROPS_V78].filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_COURT_ART_V80[item.artId];return prop(item.id,item.artId,art,item,item.levelId,art.heightWorld*item.scale,1,item.elevation??0);})}
  {HOMEWORLD_CITY_GENERATED_PROPS_V78.filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_CITY_NATIVE_ART_V78[item.artId];return prop(item.id,'city-native-v78:'+item.artId,art,item,item.levelId,art.heightWorld,homeworldCityFurnitureOpacityV92(item,art,furnitureOccupants));})}
  {HOMEWORLD_RETAINING_SUPPORTS_V82.filter(support=>painted(support.levelId)).map(support=><HomeworldRetainingSupportV82 key={support.id} support={support} camera={camera}/>)}
  {HOMEWORLD_CIVIC_PROPS_V80.filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_CIVIC_ART_V80[item.artId];return prop(item.id,'civic-native-v80:'+item.artId,art,item,item.levelId,art.heightWorld*item.scale);})}
  {HOMEWORLD_STREET_DECOR_PROPS_V83.filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_STREET_DECOR_ART_V83[item.artId];return prop(item.id,'street-native-v83:'+item.artId,art,item,item.levelId,art.heightWorld*item.scale);})}
  {HOMEWORLD_STREET_DECOR_PROPS_V84.filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_STREET_DECOR_ART_V84[item.artId];return prop(item.id,'street-native-v84:'+item.artId,art,item,item.levelId,art.heightWorld*item.scale);})}
  {HOMEWORLD_STREET_COMPOSITION_PROPS_V92.filter(item=>painted(item.levelId)).map(item=>{const art=HOMEWORLD_STREET_COMPOSITION_ART_V92[item.artId];return prop(item.id,'street-composition-v92:'+item.artId,art,item,item.levelId,art.heightWorld*item.scale,homeworldStreetCompositionOpacityV92(item,actor,levelId));})}
  {HOMEWORLD_CONNECTIONS_V77.filter(connection=>painted(connection.levelId)).map(connection=>{const art=HOMEWORLD_GATEWAY_ART_V72[connection.artId];return prop('gateway-v72:'+connection.regionId,connection.artId,art,connection.threshold,connection.levelId,art.heightWorld*homeworldGatewayScaleV72(connection));})}
  {painted('0')&&prop('clan-local-shuttle','clan-shuttle',HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle'],HOMEWORLD_SPACEPORT_V77.shuttle,'0',HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle'].heightWorld)}
  {HOMEWORLD_POINTS_V77.filter(p=>painted(p.levelId)&&!HOMEWORLD_INTERIOR_POINT_IDS_V64.has(p.id)).map(point=>{
   const z=homeworldLevelV77(point.levelId).elevation,p=homeworldProjectGroundV64(point,z);
   if(!visible({left:p.x-100,top:p.y-160,width:200,height:190},camera))return null;
   return <div key={point.id} data-world-point-v77={point.id} data-world-level-v77={point.levelId} style={{position:'absolute',inset:0,pointerEvents:'none',transform:`translateY(${-z}px)`,zIndex:depth(point.levelId,point.y)}}><HomeworldPointVisualV64 point={point} active={point.id===activePointId&&point.levelId===levelId} youthWelcome={youthWelcome}/></div>;
  })}
  {residentPoses.map(({resident,pose})=>{
   const p=homeworldProjectGroundV64(pose,homeworldLevelV77(resident.levelId).elevation);
   if(!visible({left:p.x-100,top:p.y-130,width:200,height:150},camera))return null;
   if(homeworldResidentOccludedV100(resident.levelId,pose))return null;
   return <span key={resident.id} className={styles.residentV68} data-homeworld-resident={resident.id} data-world-level-v77={resident.levelId}
    data-routine-phase-v84={pose.phase} data-routine-family-v84={pose.routineFamily} data-routine-group-v84={pose.groupId??undefined} data-routine-dwell-v84={pose.dwellRemainingSeconds}
    data-x={pose.x} data-y={pose.y} data-moving={pose.moving} style={{left:p.x,top:p.y,zIndex:depth(resident.levelId,pose.y)}}>
    <span className={styles.residentShadowV68} aria-hidden="true" data-homeworld-ground-contact-v92={resident.id}/>
    {resident.id===activeStreetContactV100&&<><span className={streetContactStylesV100.ring} aria-hidden="true"/><span className={streetContactStylesV100.label} aria-hidden="true" data-homeworld-street-label-v100={resident.id}>{resident.role}</span></>}
    <HomeworldCivilianV72 npcId={resident.id} role={homeworldUrbanExtraRoleV78(resident)} facing={pose.facing} height={resident.morphId==='young'?82:100} moving={pose.moving} seconds={pose.motionSeconds} reducedMotion={reducedMotion} speed={resident.speed}/>
   </span>;
  })}
  {HOMEWORLD_CONNECTORS_V77.filter(connector=>painted(connector.from.levelId)||painted(connector.to.levelId)).map(connector=>{
   const nativeArt=homeworldConnectorArtV82(connector.id),nativeLayout=homeworldConnectorPlacementV82(connector);
   if(nativeArt&&nativeLayout){
    if(!visible(nativeLayout,camera))return null;
    return <span key={connector.id}>
     <img src={nativeArt.src} alt="" draggable={false}
     data-homeworld-vertical-connector-v77={connector.id} data-native-art-status={homeworldConnectorSourceStateV82(connector.id)}
     data-native-sha256={nativeArt.sha256} data-native-scale-v82={nativeLayout.scale} data-gameplay-qa-v82="NOT_PERFORMED"
     style={{position:'absolute',left:nativeLayout.left,top:nativeLayout.top,width:nativeLayout.width,height:nativeLayout.height,maxWidth:'none',zIndex:HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78,pointerEvents:'none'}}/>
     {(()=>{const cabin=homeworldLiftCabinPlacementV82(connector,levelId,transit,liftStateV83);return cabin&&visible(cabin,camera)?<img src={HOMEWORLD_LIFT_CABIN_ART_V82.src} alt="" draggable={false}
      data-homeworld-lift-cabin-v82={connector.id} data-native-sha256={HOMEWORLD_LIFT_CABIN_ART_V82.sha256}
      data-travel-fraction-v82={cabin.travelFraction} data-native-scale-v82={cabin.scale} data-authored-motion-clips="0"
      data-lift-journey-v83={liftStateV83?.journey?.kind??'stationary'} data-lift-station-position-v83={liftStateV83?.position}
      style={{position:'absolute',left:cabin.left,top:cabin.top,width:cabin.width,height:cabin.height,maxWidth:'none',zIndex:cabin.depth,pointerEvents:'none'}}/>:null;})()}
    </span>;
   }
   const a=homeworldProjectGroundV64(connector.from.point,homeworldLevelV77(connector.from.levelId).elevation),b=homeworldProjectGroundV64(connector.to.point,homeworldLevelV77(connector.to.levelId).elevation);
   if(!visible({left:Math.min(a.x,b.x)-140,top:Math.min(a.y,b.y)-60,width:Math.abs(a.x-b.x)+280,height:Math.abs(a.y-b.y)+120},camera))return null;
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
