import manifest from '../data/homeworldNativeDecorV80.json';
import {HOMEWORLD_EXTERIOR_ART_V76} from './homeworldExteriorDecorV76';
import {HOMEWORLD_CITY_NATIVE_ART_V78} from './homeworldCityNativeArtV78';
import {HOMEWORLD_BUILDINGS_V77,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_RESERVES_V78,HOMEWORLD_URBAN_PROPS_V78,HOMEWORLD_CITY_GENERATED_PROPS_V78,homeworldUrbanTerrainV78,homeworldUrbanCollisionV78} from './homeworldStreetModulesV78';
import {HOMEWORLD_URBAN_EXTRAS_V78} from './homeworldUrbanPopulationV78';
import {HOMEWORLD_URBAN_FACADES_V78} from './homeworldUrbanFacadesV78';
import {homeworldUrbanCorridorV78,homeworldUrbanOverlapV78,homeworldUrbanRectV78,type HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_ACTOR,pointInHomeworldPolygon,homeworldBuildingRenderDepthV76,type HomeworldFootprint} from './homeworldCity';
import {HOMEWORLD_GEOMETRY_V64,homeworldBuildingGroundFrameV76,homeworldBuildingSpritePlacementV64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_FRONTAGE_PLANS_V81} from './homeworldAuthoredLotsV81';
import {homeworldUsageEnvelopesV81,homeworldEnvelopesOverlapV81} from './homeworldUsageEnvelopesV81';
import {homeworldCourtPolygonV80} from './homeworldCourtArtV80';
import {homeworldCityNativePolygonV78} from './homeworldCityNativePlacementV78';

export interface HomeworldCivicArtV80 extends HomeworldNativeSpriteCellV64 {
 readonly nativeGroundSupport:readonly HomeworldUrbanPointV78[];
 readonly sha256:string;readonly label:string;readonly function:string;readonly lore:string;
}
export interface HomeworldCivicPropV80 extends HomeworldUrbanPointV78 {
 readonly id:string;readonly artId:string;readonly scale:number;readonly levelId:HomeworldLevelV77;
 readonly districtId:string;readonly clusterId:string;readonly buildingId:string|null;
 readonly label:string;readonly solid:true;readonly interactive:false;
}
/** All entries have real painted contact points. No fabricated orientation or
 * invisible approximation is substituted for an unmeasured generated asset. */
export const HOMEWORLD_CIVIC_ART_V80:Readonly<Record<string,HomeworldCivicArtV80>>={
 ...Object.fromEntries(Object.entries(HOMEWORLD_EXTERIOR_ART_V76).filter(([,a])=>a.nativeGroundSupport).map(([id,a])=>[id,{...a,
  nativeGroundSupport:a.nativeGroundSupport!,label:id,function:id,lore:a.lore}])),
 ...Object.fromEntries(Object.entries(HOMEWORLD_CITY_NATIVE_ART_V78).map(([id,a])=>[id,{...a,label:id,function:id,lore:'Module civique original V78, appuis visuels mesurés; aucun modèle canonique affirmé.'}])),
 ...Object.fromEntries(Object.entries(manifest.assets).map(([id,a])=>[id,a as HomeworldCivicArtV80])),
};
const polygonCache=new WeakMap<HomeworldCivicPropV80,readonly HomeworldUrbanPointV78[]>();
/** Native landmarks may describe several feet, not a perimeter traversal.
 * SAT requires a convex boundary. The monotone hull retains every measured
 * contact inside/on the complete volume instead of a self-crossing shortcut. */
export function homeworldCivicContactHullV80(points:readonly HomeworldUrbanPointV78[]):readonly HomeworldUrbanPointV78[]{
 const ordered=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y).filter((p,i,all)=>i===0||p.x!==all[i-1].x||p.y!==all[i-1].y);
 if(ordered.length<3)return ordered;
 const cross=(a:HomeworldUrbanPointV78,b:HomeworldUrbanPointV78,c:HomeworldUrbanPointV78)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=(list:readonly HomeworldUrbanPointV78[])=>{const hull:HomeworldUrbanPointV78[]=[];for(const p of list){while(hull.length>=2&&cross(hull[hull.length-2],hull[hull.length-1],p)<=0)hull.pop();hull.push(p);}return hull;};
 const lower=half(ordered),upper=half(ordered.slice().reverse());return[...lower.slice(0,-1),...upper.slice(0,-1)];
}
export function homeworldCivicPolygonV80(item:HomeworldCivicPropV80):readonly HomeworldUrbanPointV78[]{
 const cached=polygonCache.get(item);if(cached)return cached;
 const art=HOMEWORLD_CIVIC_ART_V80[item.artId],s=art.heightWorld*item.scale/art.alphaBounds.height;
 const polygon=homeworldCivicContactHullV80(art.nativeGroundSupport).map(p=>({x:item.x+(p.x-art.pivot.x)*s,y:item.y+(p.y-art.pivot.y)*s/HOMEWORLD_GEOMETRY_V64.depthScale}));
 polygonCache.set(item,polygon);return polygon;
}
export function homeworldCivicPaintV80(item:HomeworldCivicPropV80){
 const art=HOMEWORLD_CIVIC_ART_V80[item.artId],s=art.heightWorld*item.scale/art.alphaBounds.height,z=homeworldLevelV77(item.levelId).elevation,p=homeworldProjectGroundV64(item,z);
 return{src:art.src,sha256:art.sha256,left:p.x-art.pivot.x*s,top:p.y-art.pivot.y*s,
  width:art.sourceRect.width*s,height:art.sourceRect.height*s,scale:s,elevation:z,polygon:homeworldCivicPolygonV80(item)};
}
const extras=HOMEWORLD_URBAN_EXTRAS_V78.flatMap(r=>r.path.slice(1).map((p,i)=>({id:'extra:'+r.id+':'+i,levelId:r.levelId,polygon:homeworldUrbanCorridorV78(r.path[i],p,60,40)})));
const facades=[...HOMEWORLD_BUILDINGS_V77,...HOMEWORLD_URBAN_FACADES_V78];
/** Small furniture must be legible from its public observation side. A prop
 * placed behind an unrelated facade is not rescued by fading that facade. */
export function homeworldCivicFacadeObstructionV80(item:HomeworldCivicPropV80):string|null{
 const paint=homeworldCivicPaintV80(item),art=HOMEWORLD_CIVIC_ART_V80[item.artId],s=paint.scale;
 const alpha={left:paint.left+art.alphaBounds.x*s,top:paint.top+art.alphaBounds.y*s,right:paint.left+(art.alphaBounds.x+art.alphaBounds.width)*s,bottom:paint.top+(art.alphaBounds.y+art.alphaBounds.height)*s};
 for(const b of facades){if(b.levelId!==item.levelId||homeworldBuildingRenderDepthV76(b,item)<=item.y)continue;
  const box=homeworldBuildingSpritePlacementV64(b),top=box.top-homeworldLevelV77(b.levelId).elevation;
  const intersection=Math.max(0,Math.min(alpha.right,box.left+box.width)-Math.max(alpha.left,box.left))*Math.max(0,Math.min(alpha.bottom,top+box.height)-Math.max(alpha.top,top));
  if(intersection>(alpha.right-alpha.left)*(alpha.bottom-alpha.top)*.2)return b.id;
 }return null;
}
export function homeworldCivicRefusalV80(item:HomeworldCivicPropV80,accepted:readonly HomeworldCivicPropV80[]):string|null{
 const art=HOMEWORLD_CIVIC_ART_V80[item.artId];if(!art?.nativeGroundSupport?.length)return'missing-measured-art';
 const polygon=homeworldCivicPolygonV80(item);
 for(const r of [...HOMEWORLD_URBAN_RESERVES_V78,...extras])if(r.levelId===item.levelId&&homeworldUrbanOverlapV78(polygon,r.polygon))return'reserved:'+r.id;
 for(const p of accepted)if(p.levelId===item.levelId&&homeworldUrbanOverlapV78(polygon,homeworldCivicPolygonV80(p)))return'new-prop:'+p.id;
 const envelopes=homeworldUsageEnvelopesV81(item.artId,polygon);
 const others=[...accepted.map(p=>({id:p.id,levelId:p.levelId,artId:p.artId,polygon:homeworldCivicPolygonV80(p)})),
  ...HOMEWORLD_URBAN_PROPS_V78.map(p=>({id:p.id,levelId:p.levelId,artId:p.artId,polygon:homeworldCourtPolygonV80(p)})),
  ...HOMEWORLD_CITY_GENERATED_PROPS_V78.map(p=>({id:p.id,levelId:p.levelId,artId:p.artId,polygon:homeworldCityNativePolygonV78(p)}))];
 for(const p of others){if(p.levelId!==item.levelId)continue;const other=homeworldUsageEnvelopesV81(p.artId,p.polygon);
  if(envelopes.usage&&homeworldEnvelopesOverlapV81(envelopes.usage,other.physical))return'usage-blocked:'+p.id;
  if(other.usage&&homeworldEnvelopesOverlapV81(other.usage,envelopes.physical))return'blocks-usage:'+p.id;
  if(envelopes.role.family==='bench'&&other.role.family==='bench'&&homeworldEnvelopesOverlapV81(envelopes.social,other.social))return'bench-social-clearance:'+p.id;
 }
 if(envelopes.usage){const u=envelopes.usage;
  for(const x of [u.left+24,(u.left+u.right)/2,u.right-24])for(const y of [u.top+14,(u.top+u.bottom)/2,u.bottom-14]){
   if(!homeworldUrbanTerrainV78(item.levelId,{x,y}))return'usage-unsupported';
   const conflict=homeworldUrbanCollisionV78(item.levelId,{x,y});if(conflict)return'usage-old-volume:'+conflict.id;
  }
 }
 const hidden=homeworldCivicFacadeObstructionV80(item);if(hidden)return'painted-facade:'+hidden;
 const left=Math.min(...polygon.map(p=>p.x)),right=Math.max(...polygon.map(p=>p.x)),top=Math.min(...polygon.map(p=>p.y)),bottom=Math.max(...polygon.map(p=>p.y));
 const nx=Math.max(1,Math.ceil((right-left)/12)),ny=Math.max(1,Math.ceil((bottom-top)/12));
 // Bounding-box coverage is intentionally conservative. Keep the complete
 // native volume; never shrink it or move a threshold to accept a prop.
 for(let ix=0;ix<=nx;ix++)for(let iy=0;iy<=ny;iy++){
  const p={x:left+(right-left)*ix/nx,y:top+(bottom-top)*iy/ny};
  if(!homeworldUrbanTerrainV78(item.levelId,p,{halfWidth:0,halfDepth:0}))return'unsupported-contact';
  const old=homeworldUrbanCollisionV78(item.levelId,p,{halfWidth:12,halfDepth:12});if(old)return'old-volume:'+old.id;
 }return null;
}
const candidates:HomeworldCivicPropV80[]=[];
for(const b of HOMEWORLD_BUILDINGS_V77){const frame=homeworldBuildingGroundFrameV76(b),plan=HOMEWORLD_FRONTAGE_PLANS_V81[b.id]??[];
 for(const [slot,r] of plan.entries()){
  const v=frame.vFront+r.v;
  candidates.push({id:`civic-v81:${b.id}:${slot}`,artId:r.artId,scale:r.scale??1,
   x:b.x+frame.tangent.x*r.u+frame.normal.x*v,y:b.y+frame.tangent.y*r.u+frame.normal.y*v,
   levelId:b.levelId,districtId:b.districtId,clusterId:'frontage:'+b.id,buildingId:b.id,label:r.purpose,solid:true,interactive:false});
 }
}
// The common table and retaining corner are specific named social/terrace
// compositions. They are not appended to every frontage or repeated in rows.
candidates.push({id:'civic-v81:court:lower-common:table',artId:'clan-common-table-left',scale:1,x:4380,y:4960,levelId:'-1A',districtId:'undercity',clusterId:'court:lower-common',buildingId:null,label:'Table sociale dans la poche orientale ; allée extérieure libre',solid:true,interactive:false},
 {id:'civic-v81:court:lower-west-rest:wall',artId:'corner-wall-left',scale:1,x:2810,y:4545,levelId:'-1A',districtId:'undercity',clusterId:'court:lower-west-rest',buildingId:null,label:'Retour du soutènement au revers de la halte',solid:true,interactive:false});
export const HOMEWORLD_CIVIC_ORIGINAL_CANDIDATES_V80:readonly HomeworldCivicPropV80[]=candidates;
/** Browser view11 exposed this pupitre beneath the old native thicket071.
 * Retain the generated origin, ID, scale and hull; move only its world anchor
 * onto the neighbouring measured public frontage, never alter the foliage. */
export const HOMEWORLD_CIVIC_POSITION_REVISIONS_V80=[{id:'civic-v80:trophy-mausoleum:left:0',x:180,y:2000,reason:'Native thicket071 obscured the only consultation lectern.'}] as const;
export const HOMEWORLD_CIVIC_CANDIDATES_V80:readonly HomeworldCivicPropV80[]=candidates.map(p=>{
 const revision=HOMEWORLD_CIVIC_POSITION_REVISIONS_V80.find(r=>r.id===p.id);return revision?{...p,x:revision.x,y:revision.y}:p;
});
const accepted:HomeworldCivicPropV80[]=[],refusals:{id:string;reason:string}[]=[];
for(const candidate of HOMEWORLD_CIVIC_CANDIDATES_V80){const reason=homeworldCivicRefusalV80(candidate,accepted);if(reason)refusals.push({id:candidate.id,reason});else accepted.push(candidate);}
export const HOMEWORLD_CIVIC_PROPS_V80:readonly HomeworldCivicPropV80[]=accepted;
export const HOMEWORLD_CIVIC_REFUSALS_V80:readonly {id:string;reason:string}[]=refusals;
export function homeworldCivicTouchesV80(item:HomeworldCivicPropV80,p:HomeworldUrbanPointV78,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 const polygon=homeworldCivicPolygonV80(item);
 const left=Math.min(...polygon.map(v=>v.x)),right=Math.max(...polygon.map(v=>v.x)),top=Math.min(...polygon.map(v=>v.y)),bottom=Math.max(...polygon.map(v=>v.y));
 if(p.x+body.halfWidth<left||p.x-body.halfWidth>right||p.y+body.halfDepth<top||p.y-body.halfDepth>bottom)return false;
 return body.halfWidth===0&&body.halfDepth===0?pointInHomeworldPolygon(p,polygon):homeworldUrbanOverlapV78(polygon,homeworldUrbanRectV78(p.x-body.halfWidth,p.y-body.halfDepth,p.x+body.halfWidth,p.y+body.halfDepth));
}
export const HOMEWORLD_CIVIC_SCENE_SOURCES_V80=Object.values(HOMEWORLD_CIVIC_ART_V80).filter(a=>accepted.some(p=>HOMEWORLD_CIVIC_ART_V80[p.artId]===a)).map(a=>({src:a.src,sourceWidth:a.sourceWidth,sourceHeight:a.sourceHeight,kind:'scene' as const}));
export const HOMEWORLD_CIVIC_CODEX_V80:readonly HomeworldElementRecordV64[]=accepted.map(item=>{
 const art=HOMEWORLD_CIVIC_ART_V80[item.artId],paint=homeworldCivicPaintV80(item),poly=paint.polygon,left=Math.min(...poly.map(p=>p.x)),right=Math.max(...poly.map(p=>p.x)),top=Math.min(...poly.map(p=>p.y)),bottom=Math.max(...poly.map(p=>p.y));
 return{id:item.id,label:item.label,category:'prop',districtId:item.districtId,spaceId:'world',position:{x:item.x,y:item.y,z:paint.elevation},
  dimensions:{width:right-left,depth:bottom-top,height:Math.max(0,art.heightWorld*item.scale-(bottom-top)*HOMEWORLD_GEOMETRY_V64.depthScale)},
  footprint:{left,right,top,bottom,polygon:poly},door:null,lore:'original-adaptation',asset:art.src,
  source:[{label:'PNG natif individuel mesuré',url:art.src,note:'SHA256 '+art.sha256+'. '+art.lore}],
  constraints:[`Ensemble ${item.clusterId}; fonction ${art.function}; source ${item.artId}.`,
   `Niveau ${item.levelId}; caméra yaw0/pitch35; pivot (${art.pivot.x},${art.pivot.y}); échelle uniforme ${paint.scale}.`,
   'Appuis natifs complets partagés par collision, rendu et codex; seuils, rues, raccords et trajets civils réservés.',
   'Mobilier original du clan: aucun service supplémentaire, butin, nouvelle porte visitable ou espèce canonique affirmée.',
   item.buildingId?'Devanture liée au bâtiment existant '+item.buildingId+'.':'Mobilier de cour publique, sans intérieur supplémentaire.']};
});
