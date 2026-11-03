import {HOMEWORLD_OUTSKIRTS_ART_V71,type HomeworldOutskirtsArtIdV71} from './homeworldOutskirtsArtV71';
import {HOMEWORLD_OUTSKIRTS_MODULES_V71,homeworldOutskirtsFootprintV71,type HomeworldOutskirtsModuleV71} from './homeworldOutskirtsV71';
import {HOMEWORLD_LANDSCAPE_MODULES_V75} from './homeworldLandscapeV75';
import {HOMEWORLD_SPACEPORT_V77,homeworldTerrainV77} from './homeworldWorldV77';
import {homeworldUrbanTerrainV78,HOMEWORLD_URBAN_RESERVES_V78} from './homeworldStreetModulesV78';
import {homeworldUrbanOverlapV78,homeworldUrbanRectV78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
export interface HomeworldPortShoulderV80 extends HomeworldOutskirtsModuleV71{readonly formation:string;readonly interactive:false;readonly solid:false;readonly levelId:'0';}
const candidates:HomeworldPortShoulderV80[]=[];
function add(id:string,x:number,y:number,items:readonly (readonly [HomeworldOutskirtsArtIdV71,number,number,number])[]){
 for(const [i,[artId,dx,dy,scale]]of items.entries())candidates.push({id:'port-shoulder-v80:'+id+':'+i,artId,x:x+dx,y:y+dy,scale,districtId:'outskirts',formation:id,interactive:false,solid:false,levelId:'0'});
}
// Sparse formations on the natural shoulders, never fake newly walkable plots.
// In particular the transferred port is now at +6500x, beyond the old V71 belt.
add('east-arrival-ridge',8210,4470,[['basalt',0,0,1],['basalt',170,-80,.72],['thicket',-170,80,.9],['resinwood',100,160,.85],['basalt',240,250,.55],['thicket',-120,290,.72]]);
add('east-quay-understory',8230,5010,[['resinwood',0,0,.95],['thicket',140,100,1.1],['basalt',280,120,.7],['thicket',-120,210,.8],['resinwood',260,340,.75]]);
add('north-port-bedrock',8060,3280,[['basalt',0,0,1.15],['thicket',220,90,.8],['resinwood',420,20,1],['basalt',610,140,.85],['thicket',710,280,.75]]);
for(const [i,x]of[3520,4180,4820,5460,6100,6740,7380].entries()){
 const formation=i%3===0?[['basalt',0,0,.7],['thicket',180,-50,.8]]as const:i%3===1?[['resinwood',0,0,.8],['thicket',150,100,.65]]as const:[['basalt',0,0,.9],['basalt',190,80,.55]]as const;
 add('causeway-north-'+i,x,4790,formation);
 add('causeway-south-'+i,x+130,5860,i%2?[['basalt',0,0,.75],['thicket',150,60,.8]]:[['resinwood',0,0,.8],['thicket',-130,100,.7]]);
}
const boxPoly=(b:{left:number;right:number;top:number;bottom:number})=>homeworldUrbanRectV78(b.left,b.top,b.right,b.bottom);
const overlaps=(a:{left:number;right:number;top:number;bottom:number},b:{left:number;right:number;top:number;bottom:number},margin=0)=>a.right+margin>b.left&&a.left-margin<b.right&&a.bottom+margin>b.top&&a.top-margin<b.bottom;
export function homeworldPortShoulderRefusalV80(item:HomeworldPortShoulderV80,accepted:readonly HomeworldPortShoulderV80[]):string|null{
 const b=homeworldOutskirtsFootprintV71(item),buffer={left:b.left-80,right:b.right+80,top:b.top-80,bottom:b.bottom+80};
 for(const r of HOMEWORLD_URBAN_RESERVES_V78)if(r.levelId==='0'&&homeworldUrbanOverlapV78(boxPoly(buffer),r.polygon))return'reserved:'+r.id;
 const ship=HOMEWORLD_SPACEPORT_V77.shuttle,pad=HOMEWORLD_SPACEPORT_V77.pad;
 if(overlaps(buffer,{left:ship.x-ship.width/2,right:ship.x+ship.width/2,top:ship.y-ship.depth,bottom:ship.y}))return'ship';
 if(overlaps(buffer,{left:pad.x-pad.width/2,right:pad.x+pad.width/2,top:pad.y-pad.depth/2,bottom:pad.y+pad.depth/2}))return'pad';
 const nx=Math.ceil((buffer.right-buffer.left)/20),ny=Math.ceil((buffer.bottom-buffer.top)/20);
 for(let ix=0;ix<=nx;ix++)for(let iy=0;iy<=ny;iy++){
  const p={x:buffer.left+(buffer.right-buffer.left)*ix/nx,y:buffer.top+(buffer.bottom-buffer.top)*iy/ny};
  if(homeworldTerrainV77('0',p,{halfWidth:0,halfDepth:0})||homeworldUrbanTerrainV78('0',p,{halfWidth:0,halfDepth:0}))return'public-ground';
 }
 for(const p of [...HOMEWORLD_OUTSKIRTS_MODULES_V71,...HOMEWORLD_LANDSCAPE_MODULES_V75,...accepted])if(overlaps(b,homeworldOutskirtsFootprintV71(p),25))return'natural-support:'+p.id;
 return null;
}
const accepted:HomeworldPortShoulderV80[]=[],refused:{id:string;reason:string}[]=[];
for(const p of candidates){const reason=homeworldPortShoulderRefusalV80(p,accepted);if(reason)refused.push({id:p.id,reason});else accepted.push(p);}
export const HOMEWORLD_PORT_SHOULDER_CANDIDATES_V80:readonly HomeworldPortShoulderV80[]=candidates;
export const HOMEWORLD_PORT_SHOULDERS_V80:readonly HomeworldPortShoulderV80[]=accepted;
export const HOMEWORLD_PORT_SHOULDER_REFUSALS_V80=refused;
export const HOMEWORLD_PORT_SHOULDER_CODEX_V80:readonly HomeworldElementRecordV64[]=accepted.map(p=>{
 const a=HOMEWORLD_OUTSKIRTS_ART_V71[p.artId],b=homeworldOutskirtsFootprintV71(p);
 return{id:p.id,label:a.label+' · épaule du port',category:'prop',districtId:'outskirts',spaceId:'world',position:{x:p.x,y:p.y,z:0},
  dimensions:{width:b.right-b.left,depth:b.bottom-b.top,height:Math.max(0,(a.heightWorld-a.footprintWorld.depth*HOMEWORLD_GEOMETRY_V64.depthScale)*p.scale)},footprint:null,door:null,lore:'original-adaptation',asset:a.src,
  source:[{label:'Atlas naturel V71 conservé',url:a.src,note:'SHA256 '+a.sha256+' ; cellule native indépendante, pas panorama de ville.'}],
  constraints:['Formation '+p.formation+' ; source native '+p.artId+' ; échelle uniforme '+p.scale+'.',
   'Appui naturel à80unités minimum du support public ; hors pad, vaisseau, seuils et volumes existants.',
   'Décor naturel non interactif, sans nouveau terrain praticable ni collision invisible.',
   'Relief et végétation originaux du plateau, aucune espèce canonique affirmée.']};
});
