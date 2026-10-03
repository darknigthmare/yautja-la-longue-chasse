import {HOMEWORLD_CITY_NATIVE_ART_V78,type HomeworldCityNativeArtIdV78} from './homeworldCityNativeArtV78';
import {HOMEWORLD_GEOMETRY_V64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import {homeworldCollisionV77,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_ACTOR,pointInHomeworldPolygon,type HomeworldFootprint} from './homeworldCity';
import {homeworldExteriorPolygonV76,type HomeworldExteriorModuleV76} from './homeworldExteriorDecorV76';
import {homeworldUrbanFacadeCollisionV78} from './homeworldUrbanFacadesV78';
import {homeworldUrbanOverlapV78,homeworldUrbanRectV78,type HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';
export interface HomeworldCityNativePlacementV78{
 readonly id:string;readonly artId:HomeworldCityNativeArtIdV78;readonly x:number;readonly y:number;
 readonly levelId:HomeworldLevelV77;readonly districtId:string;readonly interactive:false;readonly solid:true;
}
type Terrain=(level:HomeworldLevelV77,p:HomeworldUrbanPointV78,body?:HomeworldFootprint)=>boolean;
type Reserve={readonly id:string;readonly levelId:HomeworldLevelV77;readonly polygon:readonly HomeworldUrbanPointV78[]};
export function homeworldCityNativePolygonV78(item:HomeworldCityNativePlacementV78){
 const art=HOMEWORLD_CITY_NATIVE_ART_V78[item.artId],scale=art.heightWorld/art.alphaBounds.height;
 return art.nativeGroundSupport.map(p=>({x:item.x+(p.x-art.pivot.x)*scale,y:item.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));
}
export function homeworldCityNativePaintV78(item:HomeworldCityNativePlacementV78){
 const art=HOMEWORLD_CITY_NATIVE_ART_V78[item.artId],z=homeworldLevelV77(item.levelId).elevation,p=homeworldProjectGroundV64(item,z),scale=art.heightWorld/art.alphaBounds.height;
 return{left:p.x-art.pivot.x*scale,top:p.y-art.pivot.y*scale,width:art.sourceWidth*scale,height:art.sourceHeight*scale,scale,elevation:z,polygon:homeworldCityNativePolygonV78(item)};
}
export function homeworldCityNativeTouchesV78(item:HomeworldCityNativePlacementV78,p:HomeworldUrbanPointV78,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 const polygon=homeworldCityNativePolygonV78(item);
 // Terrain probes use a point footprint; a degenerate SAT rectangle has no area.
 if(body.halfWidth===0&&body.halfDepth===0)return pointInHomeworldPolygon(p,polygon);
 return homeworldUrbanOverlapV78(polygon,homeworldUrbanRectV78(p.x-body.halfWidth,p.y-body.halfDepth,p.x+body.halfWidth,p.y+body.halfDepth));
}
export function homeworldCityNativeRefusalV78(item:HomeworldCityNativePlacementV78,reserves:readonly Reserve[],legacy:readonly HomeworldExteriorModuleV76[],accepted:readonly HomeworldCityNativePlacementV78[],terrain:Terrain):string|null{
 const polygon=homeworldCityNativePolygonV78(item);
 for(const reserve of reserves)if(reserve.levelId===item.levelId&&homeworldUrbanOverlapV78(polygon,reserve.polygon))return reserve.id;
 for(const old of legacy){if('levelId' in old&&old.levelId!==item.levelId)continue;if(homeworldUrbanOverlapV78(polygon,homeworldExteriorPolygonV76(old)))return 'legacy-prop:'+old.id;}
 for(const old of accepted)if(old.levelId===item.levelId&&homeworldUrbanOverlapV78(polygon,homeworldCityNativePolygonV78(old)))return 'generated-prop:'+old.id;
 const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 const nx=Math.max(1,Math.ceil((right-left)/12)),ny=Math.max(1,Math.ceil((bottom-top)/12));
 for(let ix=0;ix<=nx;ix++)for(let iy=0;iy<=ny;iy++){
  const p={x:left+(right-left)*ix/nx,y:top+(bottom-top)*iy/ny};
  if(!terrain(item.levelId,p,{halfWidth:0,halfDepth:0}))return 'unsupported-base';
  const old=homeworldCollisionV77(item.levelId,p,{halfWidth:12,halfDepth:12})??homeworldUrbanFacadeCollisionV78(item.levelId,p,{halfWidth:12,halfDepth:12});if(old)return 'old-volume:'+old.id;
 }
 return null;
}
/** Assembly is called AFTER old52props compile, avoiding a registry cycle. It
 * preserves every rejected candidate and never shrinks art/collision to pass. */
export function compileHomeworldCityNativeV78(reserves:readonly Reserve[],legacy:readonly HomeworldExteriorModuleV76[],terrain:Terrain){
 const clusters=[
  ...[{x:3070,y:4150},{x:3150,y:3130},{x:4150,y:3020},{x:4840,y:4540},{x:3730,y:4050},{x:3600,y:4800},{x:4210,y:4840}].map(p=>({...p,levelId:'-1A' as const})),
  ...[3500,4140,4780,5420,6060,6700,7340].map(x=>({x,y:5220,levelId:'0' as const})),
 ];
 const accepted:HomeworldCityNativePlacementV78[]=[],rejected:{id:string;reason:string;x:number;y:number;levelId:HomeworldLevelV77}[]=[];
 const firstCourt:Record<HomeworldCityNativeArtIdV78,number>={'market-stall-right':1,'forge-workstation-left':5,'archive-shelf-right':2,
  'terrace-retaining-front':0,'port-cargo-sorting-cart':7,'clan-common-table-left':6,'civic-water-cistern-right':3};
 for(const artId of Object.keys(HOMEWORLD_CITY_NATIVE_ART_V78) as HomeworldCityNativeArtIdV78[]){
  let placed=false;
  const primary=clusters[firstCourt[artId]],fallback=artId==='port-cargo-sorting-cart'?[...clusters.slice(7),...clusters.slice(0,7)]:clusters;
  const ordered=[primary,...fallback.filter(c=>c!==primary)];
  for(const cluster of ordered){if(placed)break;
   for(const dy of[-170,-125,-85,125,170]){if(placed)break;for(const dx of[0,-80,80,-180,180]){
    const item:HomeworldCityNativePlacementV78={id:'city-native-v78:'+artId,artId,x:cluster.x+dx,y:cluster.y+dy,levelId:cluster.levelId,
     districtId:cluster.levelId==='0'?'port':'undercity',interactive:false,solid:true};
    // Keep the14old decorative48u circuits clear as well as98original ones.
    const extra=clusters.find(c=>c.levelId===item.levelId&&homeworldUrbanOverlapV78(homeworldCityNativePolygonV78(item),homeworldUrbanRectV78(c.x-60,c.y-38,c.x+60,c.y+38)));
    const reason=extra?'extra-circuit:'+extra.x+':'+extra.y:homeworldCityNativeRefusalV78(item,reserves,legacy,accepted,terrain);
    if(reason)rejected.push({id:item.id,reason,x:item.x,y:item.y,levelId:item.levelId});else{accepted.push(item);placed=true;break;}
   }}
  }
 }
 return{accepted,rejected,unplaced:(Object.keys(HOMEWORLD_CITY_NATIVE_ART_V78) as HomeworldCityNativeArtIdV78[]).filter(id=>!accepted.some(p=>p.artId===id))};
}
