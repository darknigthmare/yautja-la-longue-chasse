import {HOMEWORLD_ACTOR,HOMEWORLD_BUILDINGS,HOMEWORLD_DISTRICTS,HOMEWORLD_STREETS,HOMEWORLD_PROPS,
 HOMEWORLD_NPC_COLLIDERS,HOMEWORLD_POINT_PROP_COLLIDERS,HOMEWORLD_SPACEPORT_V64,createHomeworldActor,
 stepHomeworldActorOnFloor,pointInHomeworldPolygon,type HomeworldActor,type HomeworldInput,type HomeworldVec2,
 type HomeworldFootprint} from './homeworldCity';
import {homeworldBuildingTouchesV76,homeworldBuildingDoorwayV64,homeworldBuildingGroundFrameV76,homeworldBuildingFootprintV64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import {HOMEWORLD_POINTS,type HomeworldPoint} from './homeworld';
import {HOMEWORLD_RESIDENTS_V69} from './homeworldLifeV69';
import {homeworldCivilianPoseV84} from './homeworldCivilianRoutinesV84';
import {HOMEWORLD_FRONTAGE_ITEMS_V75} from './homeworldArchitectureV75';
import {homeworldFurnitureFootprintV72} from './homeworldFurnitureV72';
import {HOMEWORLD_EXTERIOR_MODULES_V76,homeworldExteriorTouchesV76,homeworldExteriorFootprintV76} from './homeworldExteriorDecorV76';
import {HOMEWORLD_INTERIOR_POINT_IDS_V64} from './homeworldInteriorsV64';
import {HOMEWORLD_REGION_CONNECTIONS_V72,HOMEWORLD_CONNECTION_STREETS_V72,HOMEWORLD_CONNECTION_FURNITURE_V72,
 homeworldGatewayFootprintsV72} from './homeworldRegionConnectionsV72';
import {homeworldCouncilStairRailsV77} from './homeworldConnectorArtV77';
import {homeworldConnectorSupportsV82} from './homeworldConnectorSupportsV82';
import {HOMEWORLD_LAVA_BASES_V77,homeworldSkiffFootOnDeckV77} from './homeworldLavaPlacementV77';
import {HOMEWORLD_RESIDENT_PATH_REVISIONS_V81} from './homeworldResidentPlacementsV81';
import {HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81,HOMEWORLD_LEGACY_EXTERIOR_PLACEMENTS_V82,HOMEWORLD_LEGACY_FRONTAGE_PLACEMENTS_V82} from './homeworldLegacyPlacementsV81';
import {HOMEWORLD_RETAINING_SUPPORTS_V82,homeworldRetainingTouchesV82} from './homeworldRetainingAssembliesV82';
import {homeworldTransitFractionsV82} from './homeworldTransitJourneyV82';
import {configureHomeworldStreetDecorV83,homeworldStreetDecorCollisionV83} from './homeworldStreetDecorV83';
import {homeworldStreetDecorCollisionV84,type HomeworldStreetDecorReserveV84,type HomeworldStreetDecorPlacementInputV84} from './homeworldStreetDecorV84';
import {HOMEWORLD_URBAN_LOTS_V78,HOMEWORLD_URBAN_GROUND_V78,HOMEWORLD_URBAN_STREETS_V78,homeworldUrbanCorridorV78,homeworldUrbanRectV78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_AUTHORED_COURTS_V81} from './homeworldAuthoredLotsV81';

/** Overlay of the existing real City model. No new save rewards or parallel game.
 * Vertical coordinates are physical world units, not a CSS transform of actors. */
export type HomeworldLevelV77='0'|'+1'|'+2'|'-1A'|'-1B'|'-1C';
export const HOMEWORLD_LEVELS_V77=[
 {id:'0',name:'Cité haute',elevation:0,zoom:.9},
 {id:'+1',name:'Terrasse du Conseil',elevation:520,zoom:.82},
 {id:'+2',name:'Acropole · audience du clan',elevation:1080,zoom:.76},
 {id:'-1A',name:'Rue descendante · bas-quartiers',elevation:-360,zoom:.94},
 {id:'-1B',name:'Galeries basses',elevation:-720,zoom:.94},
 {id:'-1C',name:'Ateliers sous la cité',elevation:-1080,zoom:.88},
] as const;
export const HOMEWORLD_WORLD_V77={width:10400,height:6400,revision:1} as const;
export const HOMEWORLD_PORT_TRANSLATION_V77={x:6500,y:0} as const;
export const homeworldLevelV77=(id:HomeworldLevelV77)=>HOMEWORLD_LEVELS_V77.find(level=>level.id===id)!;
export const homeworldDistrictLevelV77=(id:string):HomeworldLevelV77=>id==='citadel'?'+2'
 :id==='temple'||id==='enforcers'?'+1':id==='undercity'?'-1B':id==='convoy-works'?'-1C':'0';
const move=(point:HomeworldVec2,districtId:string)=>districtId==='port'
 ?{x:point.x+HOMEWORLD_PORT_TRANSLATION_V77.x,y:point.y}:{x:point.x,y:point.y};
export const HOMEWORLD_BUILDINGS_V77=HOMEWORLD_BUILDINGS.map(building=>({...building,...move(building,building.districtId),levelId:homeworldDistrictLevelV77(building.districtId)}));
export const HOMEWORLD_DISTRICTS_V77=HOMEWORLD_DISTRICTS.map(district=>({...district,...move(district,district.id),
 levelId:homeworldDistrictLevelV77(district.id),polygon:district.polygon.map(point=>move(point,district.id))}));
export const HOMEWORLD_PROPS_V77=HOMEWORLD_PROPS.map(prop=>({...prop,...move(prop,prop.districtId),...HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81[prop.id],levelId:homeworldDistrictLevelV77(prop.districtId)}));
export const HOMEWORLD_FRONTAGE_V77=HOMEWORLD_FRONTAGE_ITEMS_V75
 .map(item=>{const building=HOMEWORLD_BUILDINGS.find(building=>building.id===item.buildingId)!;
  return{...item,...move(item,building.districtId),...HOMEWORLD_LEGACY_FRONTAGE_PLACEMENTS_V82[item.id],levelId:homeworldDistrictLevelV77(building.districtId)};});
export const HOMEWORLD_EXTERIOR_V77=HOMEWORLD_EXTERIOR_MODULES_V76.map(item=>({...item,...move(item,item.districtId),...HOMEWORLD_LEGACY_EXTERIOR_PLACEMENTS_V82[item.id],levelId:homeworldDistrictLevelV77(item.districtId)}));
export const HOMEWORLD_RESIDENTS_V77=HOMEWORLD_RESIDENTS_V69.map(resident=>({...resident,
 levelId:homeworldDistrictLevelV77(resident.districtId),path:(HOMEWORLD_RESIDENT_PATH_REVISIONS_V81[resident.id]??resident.path).map(point=>move(point,resident.districtId))}));
export const homeworldResidentPoseV77=homeworldCivilianPoseV84;
export function nearestHomeworldResidentV77(levelId:HomeworldLevelV77,actor:HomeworldVec2,seconds:number){
 return HOMEWORLD_RESIDENTS_V77.filter(r=>r.levelId===levelId).map(resident=>({resident,p:homeworldResidentPoseV77(resident,seconds)})).filter(item=>Math.hypot(item.p.x-actor.x,item.p.y-actor.y)<100).sort((a,b)=>Math.hypot(a.p.x-actor.x,a.p.y-actor.y)-Math.hypot(b.p.x-actor.x,b.p.y-actor.y))[0]?.resident??null;
}
export const districtAtHomeworldActorV77=(levelId:HomeworldLevelV77,actor:HomeworldVec2)=>HOMEWORLD_DISTRICTS_V77.find(d=>d.levelId===levelId&&pointInHomeworldPolygon(actor,d.polygon))??null;
export const HOMEWORLD_SPACEPORT_V77={...HOMEWORLD_SPACEPORT_V64,
 pad:{...HOMEWORLD_SPACEPORT_V64.pad,...move(HOMEWORLD_SPACEPORT_V64.pad,'port')},
 shuttle:{...HOMEWORLD_SPACEPORT_V64.shuttle,...move(HOMEWORLD_SPACEPORT_V64.shuttle,'port')},
 terminal:move(HOMEWORLD_SPACEPORT_V64.terminal,'port'),spawn:move(HOMEWORLD_SPACEPORT_V64.spawn,'port')};

const rect=(left:number,top:number,right:number,bottom:number)=>[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}];
export function homeworldBandV77(a:HomeworldVec2,b:HomeworldVec2,width=260){
 const length=Math.hypot(b.x-a.x,b.y-a.y);if(!length)throw Error('Zero-length ground band');
 const x=-(b.y-a.y)/length*width/2,y=(b.x-a.x)/length*width/2;
 // Overlapping end caps retain full-body support at corners and landings.
 return[{x:a.x+x-(b.x-a.x)/length*width/2,y:a.y+y-(b.y-a.y)/length*width/2},
  {x:b.x+x+(b.x-a.x)/length*width/2,y:b.y+y+(b.y-a.y)/length*width/2},
  {x:b.x-x+(b.x-a.x)/length*width/2,y:b.y-y+(b.y-a.y)/length*width/2},
  {x:a.x-x-(b.x-a.x)/length*width/2,y:a.y-y-(b.y-a.y)/length*width/2}];
}
const oldRoadLevel=(id:string):HomeworldLevelV77=>id==='gallery-descent'?'-1B'
 :id==='south-quay-link'||id==='south-forge-link'?'-1C':'0';
const portRoads=new Set(['quay-court','landing-apron','dock-pedestrian-lane','quay-connection','shuttle-access']);
const redesignedRegionalIds=new Set(['leviathan-coast','thermal-caves']);
const regionDistrict=(id:string)=>HOMEWORLD_POINTS.find(point=>point.regionId===id)!.districtId;
export const HOMEWORLD_CONNECTIONS_V77=HOMEWORLD_REGION_CONNECTIONS_V72.filter(connection=>!redesignedRegionalIds.has(connection.regionId))
 .map(connection=>{const district=regionDistrict(connection.regionId);return{...connection,levelId:homeworldDistrictLevelV77(district),
  nodes:connection.nodes.map(point=>move(point,district)),threshold:move(connection.threshold,district),arrival:move(connection.arrival,district),legacySign:move(connection.legacySign,district)};});
export const HOMEWORLD_CONNECTION_FURNITURE_V77=HOMEWORLD_CONNECTION_FURNITURE_V72.filter(item=>!redesignedRegionalIds.has(item.regionId))
 .map(item=>({...item,...move(item,regionDistrict(item.regionId)),levelId:homeworldDistrictLevelV77(regionDistrict(item.regionId))}));
const oldRoads=HOMEWORLD_STREETS.filter(street=>!street.id.startsWith('connection-v72:')).map(street=>{
 const host=street.id.match(/^forecourt(?:-link)?-v76:(.+)$/)?.[1],building=HOMEWORLD_BUILDINGS.find(building=>building.id===host);
 const district=building?.districtId??(portRoads.has(street.id)?'port':'');
 return{...street,levelId:building?homeworldDistrictLevelV77(building.districtId):oldRoadLevel(street.id),polygon:street.polygon.map(point=>move(point,district))};
});
const road=(id:string,levelId:HomeworldLevelV77,nodes:HomeworldVec2[],width=260)=>nodes.slice(1).map((point,index)=>({
 id:id+':'+index,label:id,kind:'passage' as const,accent:'#ab8f63',levelId,polygon:homeworldBandV77(nodes[index],point,width)}));
/** Measured native stair now stands beyond the complete painted silhouettes of
 * the lodge and the neighbouring ground/upper buildings. The socket delta and
 * uniform native scale stay unchanged; real lower/upper terraces support it. */
export const HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77={from:{levelId:'0' as const,point:{x:4500,y:2900},elevation:0},to:{levelId:'+1' as const,point:{x:4500,y:2720},elevation:520}};
export const HOMEWORLD_GROUND_V77=[...HOMEWORLD_DISTRICTS_V77,...oldRoads,
 // Actual native hulls receive their authored masonry plinths, not borrowed
 // invisible terrain. The V81 renderer extrudes/paves these same polygons.
 {id:'plinth-v81:port-house-east',label:'Socle des équipages · rive est',levelId:'0' as const,polygon:[{x:7285,y:3050},{x:7795,y:3030},{x:7860,y:3095},{x:7850,y:3440},{x:7710,y:3500},{x:7310,y:3460}]},
 {id:'plinth-v81:clan-court-east',label:'Socle de la délégation · revers de falaise',levelId:'0' as const,polygon:[{x:3670,y:2120},{x:4120,y:2060},{x:4220,y:2120},{x:4245,y:2320},{x:3920,y:2500},{x:3690,y:2440}]},
 ...HOMEWORLD_LAVA_BASES_V77.map(base=>base.terrain),
 // Some preserved civilian routes originally used the overlap of two
 // neighbourhoods. Their native pedestrian terraces now belong explicitly to
 // that citizen's floor, instead of implicitly borrowing the floor above.
 ...HOMEWORLD_RESIDENTS_V77.flatMap(resident=>resident.path.slice(1).flatMap((point,index)=>road('resident-terrace:'+resident.id+':'+index,resident.levelId,[resident.path[index],point],160))),
 ...HOMEWORLD_CONNECTION_STREETS_V72.filter(street=>!redesignedRegionalIds.has(street.id.split(':')[1]))
  .map(street=>{const district=regionDistrict(street.id.split(':')[1]);return{...street,levelId:homeworldDistrictLevelV77(district),polygon:street.polygon.map(point=>move(point,district))};}),
 ...road('port-east-causeway','0',[{x:3100,y:3430},{x:3100,y:5400},{x:7800,y:5400},{x:7800,y:4480}],320),
 ...road('coast-west','0',[{x:820,y:1780},{x:260,y:1780},{x:260,y:2230}],300),
 ...road('lava-descent','0',[{x:820,y:2480},{x:460,y:2750},{x:460,y:3600}],300),
 ...road('council-stair-landing','0',[{x:3980,y:2800},{x:4500,y:2900}],300),
 ...road('council-stair-upper-terrace','+1',[{x:4500,y:2300},{x:4500,y:2720}],676),
 ...road('low-quarter-entry','0',[{x:3980,y:2800},{x:3980,y:3500}],260),
 // The former single-floor plan borrowed neighbouring district surfaces.
 // Real bridges/walking roads replace that overlap after the districts move
 // to separate floors; the collision volumes are never removed or shrunk.
 ...road('western-promenade','0',[{x:1250,y:2500},{x:900,y:2250},{x:260,y:2300}],300),
 ...road('mausoleum-public-approach','0',[{x:900,y:2250},{x:653,y:2100}],300),
 ...road('forge-residential-access','0',[{x:2800,y:2700},{x:2870,y:2530}],300),
 ...road('rampart-low-causeway','0',[{x:3980,y:3500},{x:5200,y:4200},{x:6300,y:4200},{x:6300,y:1900},{x:5900,y:1900}],320),
 ...road('marsh-road-rejoin','0',[{x:6300,y:2080},{x:6540,y:2150}],280),
 ...road('port-marches-road','0',[{x:7600,y:3300},{x:6500,y:3200},{x:6500,y:2400},{x:7000,y:2360}],300),
 ...road('jungle-road-rejoin','0',[{x:2450,y:1200},{x:2900,y:1100},{x:2900,y:250}],280),
 ...road('reserve-high-viaduct','+1',[{x:4880,y:2110},{x:5200,y:2700},{x:6000,y:3000},{x:6580,y:3440}],320),
 {id:'council-gallery-ground',label:'Galerie du Conseil',levelId:'+1' as const,polygon:rect(2800,320,5300,2500)},
 {id:'council-stair-lower-landing',label:'Palier de l’escalier du Conseil',levelId:'0' as const,polygon:rect(4162,2792,4838,3008)},
 {id:'acropolis-ground',label:'Cour de l’audience',levelId:'+2' as const,polygon:rect(3760,200,5300,1850)},
 {id:'low-quarter-a-ground',label:'Rue de desserte inférieure',levelId:'-1A' as const,polygon:rect(1400,2800,5100,5250)},
 {id:'low-quarter-b-ground',label:'Galeries basses',levelId:'-1B' as const,polygon:rect(3450,2580,5250,4330)},
 {id:'low-quarter-c-ground',label:'Cour industrielle sous la cité',levelId:'-1C' as const,polygon:rect(1050,3500,3540,5260)},
];

export interface HomeworldConnectorV77 {id:string;name:string;kind:'stairs'|'ramp'|'lift';
 from:{levelId:HomeworldLevelV77;point:HomeworldVec2};to:{levelId:HomeworldLevelV77;point:HomeworldVec2};duration:number;artStatus:'NATIVE_REQUIRED';}
export const HOMEWORLD_CONNECTORS_V77:readonly HomeworldConnectorV77[]=[
 {id:'council-stair',name:'Escalier du Conseil',kind:'stairs',...HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77,duration:8,artStatus:'NATIVE_REQUIRED'},
 {id:'acropolis-stair',name:'Degré monumental de l’acropole',kind:'stairs',from:{levelId:'+1',point:{x:4880,y:2110}},to:{levelId:'+2',point:{x:4880,y:1610}},duration:12,artStatus:'NATIVE_REQUIRED'},
 {id:'clan-lift',name:'Ascenseur des délégations',kind:'lift',from:{levelId:'0',point:{x:3250,y:2350}},to:{levelId:'+1',point:{x:3250,y:2350}},duration:5,artStatus:'NATIVE_REQUIRED'},
 {id:'slum-slope',name:'Longue descente des bas-quartiers',kind:'ramp',from:{levelId:'0',point:{x:3980,y:3500}},to:{levelId:'-1A',point:{x:3980,y:3940}},duration:11,artStatus:'NATIVE_REQUIRED'},
 {id:'lower-gallery-stair',name:'Degré des galeries basses',kind:'stairs',from:{levelId:'-1A',point:{x:4860,y:3810}},to:{levelId:'-1B',point:{x:4860,y:3990}},duration:7,artStatus:'NATIVE_REQUIRED'},
 {id:'industrial-ramp',name:'Rampe des ateliers',kind:'ramp',from:{levelId:'-1A',point:{x:2960,y:4840}},to:{levelId:'-1C',point:{x:2960,y:5040}},duration:10,artStatus:'NATIVE_REQUIRED'},
 {id:'service-ramp',name:'Rampe de maintenance',kind:'ramp',from:{levelId:'-1C',point:{x:3230,y:3930}},to:{levelId:'-1B',point:{x:3680,y:3930}},duration:6,artStatus:'NATIVE_REQUIRED'},
];
/** Same native flat landing polygons are actual floor support and painted by
 * the world renderer. The pure helper has no V77 import or invisible rails. */
export const HOMEWORLD_CONNECTOR_PADS_V82=homeworldConnectorSupportsV82(HOMEWORLD_CONNECTORS_V77,HOMEWORLD_LEVELS_V77);
export const HOMEWORLD_REGIONAL_DOCKS_V77=[
 {regionId:'leviathan-coast',levelId:'0' as const,point:{x:260,y:2230},kind:'walk' as const,name:'Sentier du rivage · côte occidentale'},
 {regionId:'thermal-caves',levelId:'0' as const,point:{x:460,y:3600},kind:'skiff' as const,name:'Passeur du canyon volcanique · Grottes Thermiques',duration:12,
  route:[{x:460,y:3600},{x:390,y:3720},{x:260,y:3850}],statueSockets:[{x:100,y:3620},{x:660,y:3620}],artStatus:'SKIFF_AND_STATUES_REQUIRED'},
];
export const HOMEWORLD_POINTS_V77=HOMEWORLD_POINTS.map(point=>{
 const dock=HOMEWORLD_REGIONAL_DOCKS_V77.find(dock=>dock.regionId===point.regionId);
 return{...point,...(dock?dock.point:move(point,point.districtId)),levelId:dock?.levelId??homeworldDistrictLevelV77(point.districtId)};
});
const touches=(point:HomeworldVec2,half:HomeworldFootprint,box:{left:number;right:number;top:number;bottom:number})=>point.x+half.halfWidth>box.left&&point.x-half.halfWidth<box.right&&point.y+half.halfDepth>box.top&&point.y-half.halfDepth<box.bottom;
const groundIndexV77=[...HOMEWORLD_GROUND_V77,...HOMEWORLD_CONNECTOR_PADS_V82].map(g=>({levelId:g.levelId,polygon:g.polygon,left:Math.min(...g.polygon.map(p=>p.x)),right:Math.max(...g.polygon.map(p=>p.x)),top:Math.min(...g.polygon.map(p=>p.y)),bottom:Math.max(...g.polygon.map(p=>p.y))}));
const buildingBoundsV77=new Map(HOMEWORLD_BUILDINGS_V77.map(b=>[b.id,homeworldBuildingFootprintV64(b)]));
const frontageBoundsV77=HOMEWORLD_FRONTAGE_V77.map(item=>({item,box:homeworldFurnitureFootprintV72(item)}));
const connectionBoundsV77=HOMEWORLD_CONNECTION_FURNITURE_V77.map(item=>({item,box:homeworldFurnitureFootprintV72(item)}));
const exteriorBoundsV77=HOMEWORLD_EXTERIOR_V77.filter(item=>item.solid).map(item=>({item,box:homeworldExteriorFootprintV76(item)}));
const gatewayBoundsV77=HOMEWORLD_CONNECTIONS_V77.flatMap(connection=>homeworldGatewayFootprintsV72(connection).map(box=>({levelId:connection.levelId,box})));
const councilRailsV77=homeworldCouncilStairRailsV77(HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77.from,HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77.to);
export function homeworldTerrainV77(levelId:HomeworldLevelV77,point:HomeworldVec2,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 if(!homeworldLevelV77(levelId)||![point.x,point.y,body.halfWidth,body.halfDepth].every(Number.isFinite))return false;
 const regions=groundIndexV77.filter(ground=>ground.levelId===levelId&&ground.right>=point.x-body.halfWidth&&ground.left<=point.x+body.halfWidth&&ground.bottom>=point.y-body.halfDepth&&ground.top<=point.y+body.halfDepth);
 return[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].every(([x,y])=>{const p={x:point.x+x*Math.max(0,body.halfWidth),y:point.y+y*Math.max(0,body.halfDepth)};return regions.some(g=>p.x>=g.left&&p.x<=g.right&&p.y>=g.top&&p.y<=g.bottom&&pointInHomeworldPolygon(p,g.polygon));});
}
export function homeworldCollisionV77(levelId:HomeworldLevelV77,point:HomeworldVec2,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 const streetDecorV84=homeworldStreetDecorCollisionV84(levelId,point,body);if(streetDecorV84)return{kind:'prop',id:streetDecorV84};
 const streetDecor=homeworldStreetDecorCollisionV83(levelId,point,body);if(streetDecor)return{kind:'prop',id:streetDecor};
 for(const support of HOMEWORLD_RETAINING_SUPPORTS_V82)if(support.levelId===levelId&&homeworldRetainingTouchesV82(support,point,body))return{kind:'prop',id:support.id};
 if(levelId==='0')for(const base of HOMEWORLD_LAVA_BASES_V77)if(touches(point,body,base.footprint))return{kind:'prop',id:base.id};
 for(const rail of councilRailsV77)if(rail.levelId===levelId&&touches(point,body,rail))return{kind:'prop',id:rail.id};
 for(const building of HOMEWORLD_BUILDINGS_V77){if(building.levelId!==levelId||!touches(point,body,buildingBoundsV77.get(building.id)!)||!homeworldBuildingTouchesV76(building,point,body))continue;
  const door=homeworldBuildingDoorwayV64(building);
  if(!building.art.groundFrame&&point.x-body.halfWidth>=door.threshold.x-door.clearWidth/2&&point.x+body.halfWidth<=door.threshold.x+door.clearWidth/2&&point.y-body.halfDepth>=building.y)continue;
  if(building.art.groundFrame){
   const frame=homeworldBuildingGroundFrameV76(building),local=frame.local(point),
    along=Math.abs(frame.tangent.x)*body.halfWidth+Math.abs(frame.tangent.y)*body.halfDepth,
    across=Math.abs(frame.normal.x)*body.halfWidth+Math.abs(frame.normal.y)*body.halfDepth;
   if(Math.abs(local.u)+along<=door.clearWidth/2&&local.v-across>=0)continue;
  }
  return{kind:'building',id:building.id};
 }
 for(const {item,box} of frontageBoundsV77)if(item.levelId===levelId&&touches(point,body,box))return{kind:'prop',id:item.id};
 for(const prop of HOMEWORLD_PROPS_V77){if(prop.levelId!==levelId||prop.plane!=='ground')continue;
  const w=prop.footprint?.halfWidth??Math.max(18,prop.width*.22),d=prop.footprint?.halfDepth??Math.max(10,Math.min(24,prop.height*.14));
  if(touches(point,body,{left:prop.x-w,right:prop.x+w,top:prop.y-(prop.artId?2:1)*d,bottom:prop.y+(prop.artId?0:d)}))return{kind:'prop',id:prop.id};
 }
 for(const {item,box} of exteriorBoundsV77)if(item.levelId===levelId&&touches(point,body,box)&&homeworldExteriorTouchesV76(item,point,body))return{kind:'prop',id:item.id};
 for(const {item,box} of connectionBoundsV77)if(item.levelId===levelId&&touches(point,body,box))return{kind:'prop',id:item.id};
 for(const {levelId:floor,box} of gatewayBoundsV77)if(floor===levelId&&touches(point,body,box))return{kind:'prop',id:box.id};
 if(levelId==='0'){const ship=HOMEWORLD_SPACEPORT_V77.shuttle;
  if(touches(point,body,{left:ship.x-ship.width/2,right:ship.x+ship.width/2,top:ship.y-ship.depth,bottom:ship.y}))return{kind:'prop',id:ship.id};}
 for(const npc of [...HOMEWORLD_NPC_COLLIDERS,...HOMEWORLD_POINT_PROP_COLLIDERS]){
  const source=HOMEWORLD_POINTS.find(point=>point.id===npc.id||point.npcId===npc.id.replace(/-point$/,''));
  const district=source?.districtId??'';
  const mapped=move(npc,district??'');if(homeworldDistrictLevelV77(district??'')!==levelId)continue;
  // Interior point objects stay in their current room instead of blocking outdoor streets.
  if(source&&HOMEWORLD_INTERIOR_POINT_IDS_V64.has(source.id))continue;
  if(HOMEWORLD_NPC_COLLIDERS.includes(npc)){
   const dx=(point.x-mapped.x)/(npc.radiusX+body.halfWidth),dy=(point.y-mapped.y)/(npc.radiusY+body.halfDepth);
   if(dx*dx+dy*dy<1)return{kind:'npc',id:npc.id};
  }else if(touches(point,body,{left:mapped.x-npc.radiusX,right:mapped.x+npc.radiusX,top:mapped.y-npc.radiusY,bottom:mapped.y+npc.radiusY}))return{kind:'prop',id:npc.id};
 }
 return null;
}
export const homeworldWalkableV77=(levelId:HomeworldLevelV77,point:HomeworldVec2,body:HomeworldFootprint=HOMEWORLD_ACTOR)=>homeworldTerrainV77(levelId,point,body)&&!homeworldCollisionV77(levelId,point,body);
export function createHomeworldWorldActorV77():HomeworldActor{return{...createHomeworldActor(),...HOMEWORLD_SPACEPORT_V77.spawn};}
export function stepHomeworldWorldActorV77(actor:HomeworldActor,input:HomeworldInput,seconds:number,levelId:HomeworldLevelV77){
 const landing=levelId==='0'?HOMEWORLD_SPACEPORT_V77.spawn:HOMEWORLD_CONNECTORS_V77.flatMap(connector=>[connector.from,connector.to]).find(socket=>socket.levelId===levelId&&homeworldWalkableV77(levelId,socket.point))?.point;
 if(!landing)throw Error('No supported landing for level '+levelId);
 return stepHomeworldActorOnFloor(actor,input,seconds,point=>homeworldWalkableV77(levelId,point),()=>({...actor,...landing,vx:0,vy:0}));
}
export function nearestHomeworldDoorV77(levelId:HomeworldLevelV77,point:HomeworldVec2){
 return HOMEWORLD_BUILDINGS_V77.filter(building=>building.levelId===levelId).map(building=>({building,distance:Math.hypot(point.x-homeworldBuildingDoorwayV64(building).approach.x,point.y-homeworldBuildingDoorwayV64(building).approach.y)}))
 .filter(candidate=>candidate.distance<32&&homeworldWalkableV77(levelId,point)).sort((a,b)=>a.distance-b.distance)[0]?.building??null;
}
export function nearestHomeworldPointV77(levelId:HomeworldLevelV77,point:HomeworldVec2):(HomeworldPoint&{levelId:HomeworldLevelV77})|null{
 return HOMEWORLD_POINTS_V77.filter(candidate=>candidate.levelId===levelId&&!HOMEWORLD_INTERIOR_POINT_IDS_V64.has(candidate.id))
 .map(candidate=>({candidate,d:Math.hypot(point.x-candidate.x,point.y-candidate.y)})).filter(item=>item.d<145).sort((a,b)=>a.d-b.d)[0]?.candidate??null;
}
export function projectHomeworldWorldV77(point:HomeworldVec2,levelId:HomeworldLevelV77,elevation:number=homeworldLevelV77(levelId).elevation){return homeworldProjectGroundV64(point,elevation);}
export function homeworldCameraWorldV77(point:HomeworldVec2,levelId:HomeworldLevelV77,viewport:{width:number;height:number},elevation:number=homeworldLevelV77(levelId).elevation,transit:HomeworldTransitV77|null=null){
 const c=transit&&HOMEWORLD_CONNECTORS_V77.find(c=>c.id===transit.connectorId),from=c&&(transit!.reverse?c.to:c.from),to=c&&(transit!.reverse?c.from:c.to),t=c?homeworldTransitFractionsV82(c.kind,transit!.elapsed,c.duration).travel:0;
 const zoom=from&&to?homeworldLevelV77(from.levelId).zoom+(homeworldLevelV77(to.levelId).zoom-homeworldLevelV77(from.levelId).zoom)*t:homeworldLevelV77(levelId).zoom,p=projectHomeworldWorldV77(point,levelId,elevation),viewWidth=Math.max(1,viewport.width)/zoom,viewHeight=Math.max(1,viewport.height)/zoom;
 return{x:Math.max(-480,Math.min(HOMEWORLD_WORLD_V77.width+480-viewWidth,p.x-viewWidth*.5)),y:p.y-viewHeight*.62,zoom,viewWidth,viewHeight,mode:'follow' as const};
}
export interface HomeworldTransitV77 {connectorId:string;reverse:boolean;elapsed:number;sourceLevel:HomeworldLevelV77;source:HomeworldVec2;}
export function nearestHomeworldConnectorV77(levelId:HomeworldLevelV77,point:HomeworldVec2){
 for(const connector of HOMEWORLD_CONNECTORS_V77){const reverse=connector.to.levelId===levelId,socket=reverse?connector.to:connector.from;
  if(socket.levelId===levelId&&Math.hypot(point.x-socket.point.x,point.y-socket.point.y)<=38&&homeworldWalkableV77(levelId,point))return{connector,reverse};
 }return null;
}
/** Hub supplies actual cabin availability. Calling an absent cabin is a
 * separate empty journey and cannot silently start a passenger transit. */
export function beginHomeworldTransitV77(levelId:HomeworldLevelV77,actor:HomeworldActor,liftReady=true){
 const near=nearestHomeworldConnectorV77(levelId,actor);
 if(!near||(near.connector.kind==='lift'&&!liftReady))return null;
 return{connectorId:near.connector.id,reverse:near.reverse,elapsed:0,sourceLevel:levelId,source:{x:actor.x,y:actor.y}};
}
export function stepHomeworldTransitV77(transit:HomeworldTransitV77,actor:HomeworldActor,seconds:number,suspended=false){
 const connector=HOMEWORLD_CONNECTORS_V77.find(connector=>connector.id===transit.connectorId);if(!connector)throw Error('Unknown connector');
 const from=transit.reverse?connector.to:connector.from,to=transit.reverse?connector.from:connector.to;
 const beforeFraction=homeworldTransitFractionsV82(connector.kind,transit.elapsed,connector.duration).travel;
 const zBefore=homeworldLevelV77(from.levelId).elevation+(homeworldLevelV77(to.levelId).elevation-homeworldLevelV77(from.levelId).elevation)*beforeFraction;
 if(suspended||!Number.isFinite(seconds)||seconds<=0)return{transit,actor,levelId:transit.sourceLevel,elevation:zBefore,done:false};
 const elapsed=Math.min(connector.duration,transit.elapsed+Math.min(seconds,.1));
 const fractions=homeworldTransitFractionsV82(connector.kind,elapsed,connector.duration),t=fractions.travel;
 const boarding=connector.kind==='lift'&&fractions.boarding<1;
 const start=connector.kind==='lift'?from.point:transit.source;
 const point=boarding?{x:transit.source.x+(from.point.x-transit.source.x)*fractions.boarding,y:transit.source.y+(from.point.y-transit.source.y)*fractions.boarding}
  :{x:start.x+(to.point.x-start.x)*t,y:start.y+(to.point.y-start.y)*t};
 const next={...actor,...point,vx:0,vy:0};
 const z=homeworldLevelV77(from.levelId).elevation+(homeworldLevelV77(to.levelId).elevation-homeworldLevelV77(from.levelId).elevation)*t;
 if(t===1&&!homeworldWalkableV77(to.levelId,next))return{transit:null,actor:{...actor,...transit.source,vx:0,vy:0},levelId:from.levelId,elevation:homeworldLevelV77(from.levelId).elevation,done:false,error:'Le palier est obstrué; retour au départ, aucune progression accordée.'};
 return{transit:t===1?null:{...transit,elapsed},actor:next,levelId:t===1?to.levelId:from.levelId,elevation:z,done:t===1};
}
export function homeworldWorldArrivalV77(regionId:string){const point=HOMEWORLD_POINTS_V77.find(point=>point.regionId===regionId);if(!point)return null;
 for(const distance of[70,100,140]){const arrival={x:point.x,y:point.y+distance};if(homeworldWalkableV77(point.levelId,arrival))return{actor:{...createHomeworldWorldActorV77(),...arrival},levelId:point.levelId};}return null;
}
export interface HomeworldSkiffV77 {regionId:'thermal-caves';elapsed:number;source:HomeworldVec2;}
/** Permission is checked by the caller before boarding and again before the
 * region callback. This vehicle ride never grants access or stores a sea spawn. */
export function beginHomeworldSkiffV77(levelId:HomeworldLevelV77,actor:HomeworldActor,allowed:boolean):HomeworldSkiffV77|null{
 const dock=HOMEWORLD_REGIONAL_DOCKS_V77.find(d=>d.kind==='skiff')!;
 return allowed&&levelId===dock.levelId&&homeworldWalkableV77(levelId,actor)&&Math.hypot(actor.x-dock.point.x,actor.y-dock.point.y)<145&&homeworldSkiffFootOnDeckV77(actor,dock.point,HOMEWORLD_ACTOR)?{regionId:'thermal-caves',elapsed:0,source:{x:actor.x,y:actor.y}}:null;
}
export function stepHomeworldSkiffV77(ride:HomeworldSkiffV77,actor:HomeworldActor,seconds:number,suspended=false){
 const dock=HOMEWORLD_REGIONAL_DOCKS_V77.find(d=>d.kind==='skiff')!;
 if(suspended||!Number.isFinite(seconds)||seconds<=0)return{ride,actor,done:false};
 const elapsed=Math.min(dock.duration!,ride.elapsed+Math.min(seconds,.1)),t=elapsed/dock.duration!;
 const nodes=[ride.source,...dock.route!.slice(1)],lengths=nodes.slice(1).map((p,i)=>Math.hypot(p.x-nodes[i].x,p.y-nodes[i].y)),total=lengths.reduce((a,b)=>a+b,0);let travelled=total*t,index=0;
 while(index<lengths.length-1&&travelled>lengths[index])travelled-=lengths[index++];
 const fraction=lengths[index]?travelled/lengths[index]:1,a=nodes[index],b=nodes[index+1];
 return{ride:t===1?null:{...ride,elapsed},actor:{...actor,x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction,vx:0,vy:0},done:t===1};
}
export const HOMEWORLD_ART_GAPS_V77={council:'V81 native Council hall and public multi-space gallery present; dedicated elder action sheets and ceremonies still required',palace:'V81 native 1100×700 royal pyramid and public multi-space audience wing present; complete private suites and royal cinematics still required',
 connectors:'Native structures for all seven existing connectors; V83 separate cabin with local per-party station state, visible empty calls and unchanged five-second passenger transit; no authored multi-frame machinery sheets, cloud-synchronized lift simulation or V83 gameplay QA',lava:'Two native giant statues and fixed skiff present; ferryman uses existing civilian role, no dedicated action sheet or native skiff movement clips',
 coast:'Dedicated coast-side foreground/background modules required',parallax:'V81 layered skyline/cliffs/traffic and physical foundations present; not eight newly generated unique raster families',mounts:'Mounted motion sheet not yet integrated',fauna:'Cage fauna actions not yet integrated'} as const;

/** Native V83 decorations enter the same physical world after its original
 * supports/volumes are available. Runtime placement policy protects preserved
 * doors, routes, sockets and closed scenery parcels; rejected candidates are
 * retained by the provider. This initialization is not a QA execution. */
const homeworldStreetDecorBaseInputV83:Parameters<typeof configureHomeworldStreetDecorV83>[0]={
 terrain:(level,point,body)=>[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].every(([x,y])=>{
  const p={x:point.x+x*body.halfWidth,y:point.y+y*body.halfDepth};
  return homeworldTerrainV77(level,p,{halfWidth:0,halfDepth:0})||HOMEWORLD_URBAN_GROUND_V78.some(g=>g.levelId===level&&pointInHomeworldPolygon(p,g.polygon));
 }),
 collision:homeworldCollisionV77,
 reserves:[
  ...HOMEWORLD_BUILDINGS_V77.map(b=>({id:'building:'+b.id,levelId:b.levelId,polygon:homeworldBuildingGroundFrameV76(b).polygon})),
  ...HOMEWORLD_BUILDINGS_V77.map(b=>{const door=homeworldBuildingDoorwayV64(b),normal=door.normal??{x:0,y:1};return{id:'door:'+b.id,levelId:b.levelId,polygon:homeworldUrbanCorridorV78(door.threshold,{x:door.threshold.x+normal.x*128,y:door.threshold.y+normal.y*128},Math.max(64,(door.clearWidth+48)/2),64)};}),
  ...HOMEWORLD_RESIDENTS_V77.flatMap(r=>r.path.slice(1).map((p,index)=>({id:'resident:'+r.id+':'+index,levelId:r.levelId,polygon:homeworldUrbanCorridorV78(r.path[index],p,48,38)}))),
  ...HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to].map(s=>({id:'connector:'+c.id+':'+s.levelId,levelId:s.levelId,polygon:homeworldUrbanRectV78(s.point.x-96,s.point.y-108,s.point.x+96,s.point.y+108)}))),
  ...HOMEWORLD_POINTS_V77.filter(p=>!HOMEWORLD_INTERIOR_POINT_IDS_V64.has(p.id)).map(p=>({id:'point:'+p.id,levelId:p.levelId,polygon:homeworldUrbanRectV78(p.x-96,p.y-96,p.x+96,p.y+96)})),
  ...HOMEWORLD_URBAN_STREETS_V78.flatMap(s=>s.nodes.slice(1).map((p,index)=>({id:s.id+':'+index,levelId:s.levelId,polygon:homeworldUrbanCorridorV78(s.nodes[index],p,s.clearWidth/2,s.clearWidth/2)}))),
  ...HOMEWORLD_URBAN_LOTS_V78.map(l=>({id:l.id,levelId:l.levelId,polygon:homeworldUrbanRectV78(l.bounds.left,l.bounds.top,l.bounds.right,l.bounds.bottom)})),
  ...HOMEWORLD_AUTHORED_COURTS_V81.map(c=>({id:'court-pedestrian:'+c.id,levelId:c.levelId,polygon:homeworldUrbanCorridorV78(c.pedestrian[0],c.pedestrian[c.pedestrian.length-1],48,38)})),
  ...frontageBoundsV77.map(({item,box})=>({id:item.id,levelId:item.levelId,polygon:homeworldUrbanRectV78(box.left,box.top,box.right,box.bottom)})),
  ...exteriorBoundsV77.map(({item,box})=>({id:item.id,levelId:item.levelId,polygon:homeworldUrbanRectV78(box.left,box.top,box.right,box.bottom)})),
 ],
};
configureHomeworldStreetDecorV83(homeworldStreetDecorBaseInputV83);
/** V84 calls this context only after old V78/V80 furniture has compiled.
 * The old V83 initializer stays unchanged. No transit/door/motor is rewritten. */
export function homeworldStreetDecorWorldInputV84(extra:readonly HomeworldStreetDecorReserveV84[]):HomeworldStreetDecorPlacementInputV84{
 return{...homeworldStreetDecorBaseInputV83,reserves:[...homeworldStreetDecorBaseInputV83.reserves,
  ...oldRoads.filter(s=>s.kind!=='court'&&!s.id.startsWith('forecourt-v76:')).map(s=>({id:'preserved-road:'+s.id,levelId:s.levelId,polygon:s.polygon})),
  {id:'port-main-throughfare-v84',levelId:'0',polygon:homeworldUrbanCorridorV78({x:3100,y:5400},{x:7800,y:5400},96,96)},
  ...HOMEWORLD_CONNECTOR_PADS_V82.map(p=>({id:'preserved-landing:'+p.id,levelId:p.levelId,polygon:p.polygon})),
  ...HOMEWORLD_GROUND_V77.filter(g=>g.id==='council-stair-lower-landing'||g.id.startsWith('council-stair-upper-terrace')).map(g=>({id:'preserved-council-landing:'+g.id,levelId:g.levelId,polygon:g.polygon})),
  ...extra,
 ]};
}
