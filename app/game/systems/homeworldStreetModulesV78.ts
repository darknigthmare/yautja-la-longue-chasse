import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_RESIDENTS_V77,HOMEWORLD_POINTS_V77,HOMEWORLD_CONNECTORS_V77,HOMEWORLD_SPACEPORT_V77,homeworldTerrainV77,homeworldCollisionV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_ACTOR,pointInHomeworldPolygon,stepHomeworldActorOnFloor,type HomeworldFootprint,type HomeworldActor,type HomeworldInput} from './homeworldCity';
import {HOMEWORLD_INTERIOR_POINT_IDS_V64} from './homeworldInteriorsV64';
import {homeworldBuildingDoorwayV64,homeworldBuildingFootprintV64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import type {HomeworldExteriorModuleV76} from './homeworldExteriorDecorV76';
import {homeworldLevelV77} from './homeworldWorldV77';
import {homeworldUrbanFacadeCollisionV78} from './homeworldUrbanFacadesV78';
import {compileHomeworldCityNativeV78,homeworldCityNativeTouchesV78,homeworldCityNativePolygonV78} from './homeworldCityNativePlacementV78';
import {HOMEWORLD_COURT_ART_V80,homeworldCourtPolygonV80,homeworldCourtTouchesV80,homeworldCourtAlternativeV80} from './homeworldCourtArtV80';
import {HOMEWORLD_URBAN_GROUND_V78,HOMEWORLD_URBAN_LOTS_V78,HOMEWORLD_URBAN_STREETS_V78,homeworldUrbanCorridorV78,homeworldUrbanRectV78,homeworldUrbanOverlapV78,type HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';

export interface HomeworldUrbanNativePropV78 extends HomeworldExteriorModuleV76 {
 readonly levelId:HomeworldLevelV77;readonly interactive:false;readonly nativeStatus:'EXISTING_MEASURED_NATIVE';
}
interface Reserve {readonly id:string;readonly levelId:HomeworldLevelV77;readonly polygon:readonly HomeworldUrbanPointV78[]}
const rectAround=(p:HomeworldUrbanPointV78,x:number,y:number)=>homeworldUrbanRectV78(p.x-x,p.y-y,p.x+x,p.y+y);
const boxPolygon=(box:{left:number;top:number;right:number;bottom:number})=>homeworldUrbanRectV78(box.left,box.top,box.right,box.bottom);
/** Exact segment corridors preserve the entire 98 old routes, not only endpoints.
 * Facade lots reserve their ground volume for measured visible architecture,
 * not invisible walls. A rejected prop never gets a reduced footprint. */
export const HOMEWORLD_URBAN_RESERVES_V78:readonly Reserve[]=[
 ...HOMEWORLD_RESIDENTS_V77.flatMap(r=>r.path.length>1?r.path.slice(1).map((b,i)=>({id:'resident:'+r.id+':'+i,levelId:r.levelId,polygon:homeworldUrbanCorridorV78(r.path[i],b)})):[{id:'resident:'+r.id,levelId:r.levelId,polygon:rectAround(r.path[0],48,38)}]),
 ...HOMEWORLD_BUILDINGS_V77.map(b=>{const door=homeworldBuildingDoorwayV64(b);return{id:'door:'+b.id,levelId:b.levelId,polygon:homeworldUrbanCorridorV78(door.threshold,door.approach,Math.max(48,door.clearWidth/2+12),38)};}),
 ...HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to].map((socket,i)=>({id:'connector:'+c.id+':'+i,levelId:socket.levelId,polygon:rectAround(socket.point,c.id==='council-stair'?338:96,108)}))),
 ...HOMEWORLD_POINTS_V77.filter(p=>!HOMEWORLD_INTERIOR_POINT_IDS_V64.has(p.id)).map(p=>({id:'point:'+p.id,levelId:p.levelId,polygon:rectAround(p,p.regionId?190:115,p.regionId?165:90)})),
 ...HOMEWORLD_URBAN_STREETS_V78.flatMap(s=>s.nodes.slice(1).map((b,i)=>({id:s.id+':clear:'+i,levelId:s.levelId,polygon:homeworldUrbanCorridorV78(s.nodes[i],b,s.clearWidth/2,s.clearWidth/2)}))),
 ...HOMEWORLD_URBAN_LOTS_V78.map(lot=>({id:lot.id+':pending-facade',levelId:lot.levelId,polygon:boxPolygon(lot.bounds)})),
 {id:'port-main-throughfare',levelId:'0',polygon:homeworldUrbanCorridorV78({x:3100,y:5400},{x:7800,y:5400},72,72)},
];
export function homeworldUrbanTerrainV78(level:HomeworldLevelV77,point:HomeworldUrbanPointV78,body:HomeworldFootprint=HOMEWORLD_ACTOR):boolean{
 if(![point.x,point.y,body.halfWidth,body.halfDepth].every(Number.isFinite)||body.halfWidth<0||body.halfDepth<0)return false;
 if(homeworldTerrainV77(level,point,body))return true;
 const added=HOMEWORLD_URBAN_GROUND_V78.filter(g=>g.levelId===level);
 return[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].every(([x,y])=>{
  const p={x:point.x+x*body.halfWidth,y:point.y+y*body.halfDepth};
  return homeworldTerrainV77(level,p,{halfWidth:0,halfDepth:0})||added.some(g=>pointInHomeworldPolygon(p,g.polygon));
 });
}
const clusters=[
 ...[3500,4140,4780,5420,6060,6700,7340].map((x,i)=>({id:'port-court-'+i,levelId:'0' as const,districtId:'port',x,y:5220,use:'logistics'})),
 {id:'lower-halt-west',levelId:'-1A' as const,districtId:'undercity',x:3070,y:4150,use:'rest'},
 {id:'lower-exchange-north',levelId:'-1A' as const,districtId:'undercity',x:3150,y:3130,use:'exchange'},
 {id:'lower-work-north',levelId:'-1A' as const,districtId:'undercity',x:4150,y:3020,use:'work'},
 {id:'lower-eastern-halt',levelId:'-1A' as const,districtId:'undercity',x:4840,y:4540,use:'rest'},
 {id:'lower-middle-halt',levelId:'-1A' as const,districtId:'undercity',x:3730,y:4050,use:'rest'},
 {id:'lower-work-south',levelId:'-1A' as const,districtId:'undercity',x:3600,y:4800,use:'work'},
 {id:'lower-rest-south',levelId:'-1A' as const,districtId:'undercity',x:4210,y:4840,use:'rest'},
];
const recipes=[
 {suffix:'storage',artId:'logistics-container-rack',dx:-140,dy:-80,scale:.75},
 {suffix:'covered-work',artId:'merchant-canopy-diagonal',dx:140,dy:-80,scale:.7},
 {suffix:'bench',artId:'terrace-bench-right',dx:-140,dy:60,scale:.75},
 {suffix:'mineral-bed',artId:'mineral-planter-left',dx:140,dy:80,scale:.6},
] as const;
export const HOMEWORLD_URBAN_PROP_CANDIDATES_V78:readonly HomeworldUrbanNativePropV78[]=clusters.flatMap(c=>recipes.map(r=>({
 id:'urban-v78:'+c.id+':'+r.suffix,artId:r.artId,x:c.x+r.dx,y:c.y+r.dy,scale:r.scale,levelId:c.levelId,districtId:c.districtId,
 groupId:'urban-v78:'+c.id,function:c.use,label:'Cour civique · '+r.suffix,associatedBuildingId:null,solid:true,
 interactive:false,nativeStatus:'EXISTING_MEASURED_NATIVE',
})));
/** Conservative coverage checks the measured native polygon and every12u cell
 * in its bounding box.10u baseline collision margins cover between samples.
 * Terrain and collision are never shrunk to make a decorative placement pass. */
export function homeworldUrbanPlacementRefusalV78(item:HomeworldUrbanNativePropV78,accepted:readonly HomeworldUrbanNativePropV78[]):string|null{
 const art=HOMEWORLD_COURT_ART_V80[item.artId];if(!art?.nativeGroundSupport)return 'Missing measured native ground contact';
 const polygon=homeworldCourtPolygonV80(item);
 const conflict=HOMEWORLD_URBAN_RESERVES_V78.find(r=>r.levelId===item.levelId&&homeworldUrbanOverlapV78(polygon,r.polygon));if(conflict)return conflict.id;
 for(const b of HOMEWORLD_BUILDINGS_V77){if(b.levelId!==item.levelId)continue;const box=homeworldBuildingFootprintV64(b);if(homeworldUrbanOverlapV78(polygon,boxPolygon(box)))return 'building:'+b.id;}
 for(const old of accepted)if(old.levelId===item.levelId&&homeworldUrbanOverlapV78(polygon,homeworldCourtPolygonV80(old)))return 'new-prop:'+old.id;
 const left=Math.min(...polygon.map(p=>p.x)),right=Math.max(...polygon.map(p=>p.x)),top=Math.min(...polygon.map(p=>p.y)),bottom=Math.max(...polygon.map(p=>p.y));
 const nx=Math.max(1,Math.ceil((right-left)/12)),ny=Math.max(1,Math.ceil((bottom-top)/12));
 for(let ix=0;ix<=nx;ix++)for(let iy=0;iy<=ny;iy++){
  const p={x:left+(right-left)*ix/nx,y:top+(bottom-top)*iy/ny};
  if(!homeworldUrbanTerrainV78(item.levelId,p,{halfWidth:0,halfDepth:0}))return 'Unsupported measured base';
  const old=homeworldCollisionV77(item.levelId,p,{halfWidth:10,halfDepth:10});if(old)return 'old-volume:'+old.id;
 }
 return null;
}
function compile(){
 const accepted:HomeworldUrbanNativePropV78[]=[],rejected:{id:string;reason:string}[]=[];
 for(const item of HOMEWORLD_URBAN_PROP_CANDIDATES_V78){const reason=homeworldUrbanPlacementRefusalV78(item,accepted);if(reason)rejected.push({id:item.id,reason});else accepted.push(item);}
 return{accepted,rejected};
}
const placements=compile();
export const HOMEWORLD_URBAN_LEGACY_PROPS_V78:readonly HomeworldUrbanNativePropV78[]=placements.accepted;
export const HOMEWORLD_URBAN_PROP_REJECTIONS_V78=placements.rejected;
const nativePlacements=compileHomeworldCityNativeV78(HOMEWORLD_URBAN_RESERVES_V78,HOMEWORLD_URBAN_LEGACY_PROPS_V78,homeworldUrbanTerrainV78);
export const HOMEWORLD_CITY_GENERATED_PROPS_V78=nativePlacements.accepted;
export const HOMEWORLD_CITY_GENERATED_REJECTIONS_V78=nativePlacements.rejected;
export const HOMEWORLD_CITY_GENERATED_UNPLACED_V78=nativePlacements.unplaced;
const courtProps=placements.accepted.slice(),courtRevisions:{id:string;fromArtId:string;toArtId:string}[]=[],courtRefusals:{id:string;reason:string;keptArtId:string}[]=[];
for(let i=0;i<courtProps.length;i++){
 const old=courtProps[i],alternative=homeworldCourtAlternativeV80(old);if(!alternative)continue;
 const conflict=homeworldUrbanPlacementRefusalV78(alternative,courtProps.filter((_,index)=>index!==i))
  ??(nativePlacements.accepted.some(p=>p.levelId===alternative.levelId&&homeworldUrbanOverlapV78(homeworldCourtPolygonV80(alternative),homeworldCityNativePolygonV78(p)))?'native-city-support':null);
 if(conflict){courtRefusals.push({id:old.id,reason:conflict,keptArtId:old.artId});continue;}
 courtProps[i]=alternative;courtRevisions.push({id:old.id,fromArtId:old.artId,toArtId:alternative.artId});
}
export const HOMEWORLD_COURT_REVISIONS_V80=courtRevisions;
export const HOMEWORLD_COURT_REFUSALS_V80=courtRefusals;
export const HOMEWORLD_URBAN_PROPS_V78:readonly HomeworldUrbanNativePropV78[]=courtProps;
export function homeworldUrbanCollisionV78(level:HomeworldLevelV77,point:HomeworldUrbanPointV78,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 const old=homeworldCollisionV77(level,point,body);if(old)return old;
 const facade=homeworldUrbanFacadeCollisionV78(level,point,body);if(facade)return facade;
 const generated=HOMEWORLD_CITY_GENERATED_PROPS_V78.find(item=>item.levelId===level&&homeworldCityNativeTouchesV78(item,point,body));if(generated)return{kind:'prop' as const,id:generated.id};
 const item=HOMEWORLD_URBAN_PROPS_V78.find(item=>item.levelId===level&&homeworldCourtTouchesV80(item,point,body));
 return item?{kind:'prop' as const,id:item.id}:null;
}
export const homeworldUrbanWalkableV78=(level:HomeworldLevelV77,point:HomeworldUrbanPointV78,body:HomeworldFootprint=HOMEWORLD_ACTOR)=>
 homeworldUrbanTerrainV78(level,point,body)&&!homeworldUrbanCollisionV78(level,point,body);
/** Existing integrator, rates and timestep; only floor ownership gains measured
 * scenery and additive courts. No new progression or movement mechanics. */
export function stepHomeworldUrbanActorV78(actor:HomeworldActor,input:HomeworldInput,seconds:number,level:HomeworldLevelV77):HomeworldActor{
 const landing=level==='0'?HOMEWORLD_SPACEPORT_V77.spawn:HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to]).find(s=>s.levelId===level&&homeworldUrbanWalkableV78(level,s.point))?.point;
 if(!landing)throw Error('No supported urban landing for level '+level);
 return stepHomeworldActorOnFloor(actor,input,seconds,p=>homeworldUrbanWalkableV78(level,p),()=>({...actor,...landing,vx:0,vy:0}));
}
/** Same native dimensions and source pivot for the future root renderer.
 * No CSS rotation, mirror, free resizing or actor-space projection is allowed. */
export function homeworldUrbanNativePlacementV78(item:HomeworldUrbanNativePropV78){
 const art=HOMEWORLD_COURT_ART_V80[item.artId],elevation=homeworldLevelV77(item.levelId).elevation,p=homeworldProjectGroundV64(item,elevation),scale=art.scaleWorldPerPixel*item.scale;
 return{src:art.src,sha256:art.sha256,sourceWidth:art.sourceWidth,sourceHeight:art.sourceHeight,scale,
  left:p.x-art.pivot.x*scale,top:p.y-art.pivot.y*scale,width:art.sourceRect.width*scale,height:art.sourceRect.height*scale,
  alpha:{left:p.x+(art.alphaBounds.x-art.pivot.x)*scale,top:p.y+(art.alphaBounds.y-art.pivot.y)*scale,width:art.alphaBounds.width*scale,height:art.alphaBounds.height*scale},polygon:homeworldCourtPolygonV80(item),elevation};
}
