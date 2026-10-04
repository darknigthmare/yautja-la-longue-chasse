import {HOMEWORLD_CITY_NATIVE_ART_V78,type HomeworldCityNativeArtIdV78} from './homeworldCityNativeArtV78';
import {HOMEWORLD_GEOMETRY_V64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import {homeworldCollisionV77,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_ACTOR,pointInHomeworldPolygon,type HomeworldFootprint} from './homeworldCity';
import type {HomeworldExteriorModuleV76} from './homeworldExteriorDecorV76';
import {homeworldCourtPolygonV80 as homeworldExteriorPolygonV76} from './homeworldCourtArtV80';
import {homeworldUrbanFacadeCollisionV78} from './homeworldUrbanFacadesV78';
import {homeworldUrbanOverlapV78,homeworldUrbanRectV78,type HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_AUTHORED_COURTS_V81} from './homeworldAuthoredLotsV81';
import {homeworldUsageEnvelopesV81,homeworldEnvelopesOverlapV81} from './homeworldUsageEnvelopesV81';
import {homeworldRetainingJointV82} from './homeworldRetainingAssembliesV82';
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
 const usage=homeworldUsageEnvelopesV81(item.artId,polygon);
 for(const old of legacy){if('levelId' in old&&old.levelId!==item.levelId)continue;const other=homeworldUsageEnvelopesV81(old.artId,homeworldExteriorPolygonV76(old));
  if(usage.usage&&homeworldEnvelopesOverlapV81(usage.usage,other.physical))return'usage-legacy:'+old.id;
  if(other.usage&&homeworldEnvelopesOverlapV81(other.usage,usage.physical))return'blocks-legacy-usage:'+old.id;
 }
 for(const old of accepted){if(old.levelId!==item.levelId)continue;const other=homeworldUsageEnvelopesV81(old.artId,homeworldCityNativePolygonV78(old));
  if(usage.usage&&homeworldEnvelopesOverlapV81(usage.usage,other.physical))return'usage-generated:'+old.id;
  if(other.usage&&homeworldEnvelopesOverlapV81(other.usage,usage.physical))return'blocks-generated-usage:'+old.id;
 }
 if(usage.usage){const u=usage.usage;
  for(const x of [u.left+24,(u.left+u.right)/2,u.right-24])for(const y of [u.top+14,(u.top+u.bottom)/2,u.bottom-14]){
   if(!terrain(item.levelId,{x,y}))return'usage-unsupported';
   const conflict=homeworldCollisionV77(item.levelId,{x,y})??homeworldUrbanFacadeCollisionV78(item.levelId,{x,y});if(conflict)return'usage-old-volume:'+conflict.id;
  }
 }
 const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 const nx=Math.max(1,Math.ceil((right-left)/12)),ny=Math.max(1,Math.ceil((bottom-top)/12));
 for(let ix=0;ix<=nx;ix++)for(let iy=0;iy<=ny;iy++){
  const p={x:left+(right-left)*ix/nx,y:top+(bottom-top)*iy/ny};
  if(!terrain(item.levelId,p,{halfWidth:0,halfDepth:0}))return 'unsupported-base';
  const old=homeworldCollisionV77(item.levelId,p,{halfWidth:12,halfDepth:12})??homeworldUrbanFacadeCollisionV78(item.levelId,p,{halfWidth:12,halfDepth:12});if(old&&!homeworldRetainingJointV82(item.id,old.id))return 'old-volume:'+old.id;
 }
 return null;
}
/** Assembly is called AFTER old52props compile, avoiding a registry cycle. It
 * preserves every rejected candidate and never shrinks art/collision to pass. */
export function compileHomeworldCityNativeV78(reserves:readonly Reserve[],legacy:readonly HomeworldExteriorModuleV76[],terrain:Terrain){
 const accepted:HomeworldCityNativePlacementV78[]=[],rejected:{id:string;reason:string;x:number;y:number;levelId:HomeworldLevelV77}[]=[];
 // Named functional anchors, no scanned dx/dy grid, no automatic relocation
 // until a collision disappears. A rejected activity remains explicitly absent.
 const anchors:Record<HomeworldCityNativeArtIdV78,{x:number;y:number;levelId:HomeworldLevelV77;districtId:string}[]>={
  'market-stall-right':[{x:3050,y:3340,levelId:'-1A',districtId:'undercity'}],
  'forge-workstation-left':[{x:3600,y:4630,levelId:'-1A',districtId:'undercity'}],
  'archive-shelf-right':[{x:800,y:1260,levelId:'0',districtId:'memory'}],
  'terrace-retaining-front':[{x:2990,y:4025,levelId:'-1A',districtId:'undercity'}],
  'port-cargo-sorting-cart':[{x:3500,y:5050,levelId:'0',districtId:'port'}],
  'clan-common-table-left':[{x:4210,y:4715,levelId:'-1A',districtId:'undercity'}],
  'civic-water-cistern-right':[{x:4840,y:4370,levelId:'-1A',districtId:'undercity'}],
 };
 for(const artId of Object.keys(HOMEWORLD_CITY_NATIVE_ART_V78) as HomeworldCityNativeArtIdV78[]){
  for(const anchor of anchors[artId]){
    const item:HomeworldCityNativePlacementV78={id:'city-native-v78:'+artId,artId,...anchor,interactive:false,solid:true};
    const extra=HOMEWORLD_AUTHORED_COURTS_V81.find(c=>c.levelId===item.levelId&&c.pedestrian.some(p=>homeworldUrbanOverlapV78(homeworldCityNativePolygonV78(item),homeworldUrbanRectV78(p.x-60,p.y-38,p.x+60,p.y+38))));
    const reason=extra?'extra-circuit:'+extra.id:homeworldCityNativeRefusalV78(item,reserves,legacy,accepted,terrain);
    if(reason)rejected.push({id:item.id,reason,x:item.x,y:item.y,levelId:item.levelId});else{accepted.push(item);break;}
  }
 }
 return{accepted,rejected,unplaced:(Object.keys(HOMEWORLD_CITY_NATIVE_ART_V78) as HomeworldCityNativeArtIdV78[]).filter(id=>!accepted.some(p=>p.artId===id))};
}

