import sources from '../data/homeworldLavaArtV77.json';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';

export interface HomeworldLavaArtV77 extends HomeworldNativeSpriteCellV64 {
  id:string;sha256:string;format:string;bytes:number;alphaThreshold:number;borderPixels:number;
  deckSource?:readonly {x:number;y:number}[];ferrymanSource?:{x:number;y:number};measurement:string;
}
export const HOMEWORLD_LAVA_ART_V77=sources as readonly HomeworldLavaArtV77[];
export const homeworldLavaArtV77=(id:string)=>HOMEWORLD_LAVA_ART_V77.find(art=>art.id===id)!;
export const HOMEWORLD_LAVA_NATIVE_SOURCES_V77=HOMEWORLD_LAVA_ART_V77.map(art=>({src:art.src,width:art.sourceWidth,height:art.sourceHeight}));
const rectangle=(left:number,top:number,right:number,bottom:number)=>[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}];
/** The base is a conservative physical support, not the painted statue's
 * enormous empty source margins or the whole standing silhouette. */
export const HOMEWORLD_LAVA_BASES_V77=[
  {id:'lava-statue-left-v77',artId:'lava-warrior-left',levelId:'0' as const,x:100,y:3620,width:322,depth:190},
  {id:'lava-statue-right-v77',artId:'lava-warrior-right',levelId:'0' as const,x:660,y:3620,width:300,depth:190},
].map(base=>({...base,footprint:{left:base.x-base.width/2,right:base.x+base.width/2,top:base.y-base.depth,bottom:base.y},
  terrain:{id:'ground:'+base.id,label:'Socle basaltique du mémorial',levelId:'0' as const,
    polygon:rectangle(base.x-base.width/2-8,base.y-base.depth-8,base.x+base.width/2+8,base.y+8)}}));
export const HOMEWORLD_LAVA_ROCKS_V77=Array.from({length:22},(_,index)=>({
  id:'lava-canyon-rock-v77:'+index,artId:'basalt' as const,
  x:index%2===0?-130+(index/2)*30:920-(index-1)/2*28,
  y:3620+Math.floor(index/2)*38,heightWorld:95+(index%3)*25,
}));
export const HOMEWORLD_LAVA_DOCK_V77={x:460,y:3600};
/** Measured convex clear deck in the untouched source, excluding hull/rails. */
export function homeworldSkiffSourceOnDeckV77(point:{x:number;y:number}){
  const polygon=homeworldLavaArtV77('lava-transit-skiff').deckSource!;let sign=0;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],cross=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);
    if(Math.abs(cross)<1e-7)continue;
    if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);
  }
  return true;
}
export function homeworldSkiffFootOnDeckV77(point:{x:number;y:number},anchor=HOMEWORLD_LAVA_DOCK_V77,
  body:{halfWidth:number;halfDepth:number}={halfWidth:24,halfDepth:14}){
  const art=homeworldLavaArtV77('lava-transit-skiff'),scale=art.heightWorld/art.alphaBounds.height;
  return [-1,1].every(x=>[-1,1].every(y=>homeworldSkiffSourceOnDeckV77({
    x:art.pivot.x+(point.x+x*body.halfWidth-anchor.x)/scale,
    y:art.pivot.y+(point.y+y*body.halfDepth-anchor.y)*HOMEWORLD_GEOMETRY_V64.depthScale/scale,
  })));
}
export function homeworldSkiffDeckPositionV77(point:{x:number;y:number},offset:{x:number;y:number}={x:0,y:0}){
  const art=homeworldLavaArtV77('lava-transit-skiff'),scale=art.heightWorld/art.alphaBounds.height;
  return{x:point.x+offset.x*scale,y:point.y+offset.y*scale};
}
export const HOMEWORLD_LAVA_CODEX_V77:readonly HomeworldElementRecordV64[]=[
  ...HOMEWORLD_LAVA_BASES_V77.map(base=>({id:base.id,label:base.artId==='lava-warrior-left'?'Mémorial occidental du canyon':'Mémorial oriental du canyon',
    category:'prop' as const,districtId:'lava-canyon-v77',spaceId:'world',position:{x:base.x,y:base.y,z:0},
    dimensions:{width:base.width,depth:base.depth,height:620},footprint:base.footprint,door:null,
    asset:homeworldLavaArtV77(base.artId).src,lore:'original-adaptation' as const,source:[],constraints:[
      'Statue de guerrier Yautja originale dessinée dans sa direction native ; aucune copie retournée.',
      'Socle solide conservateur et terrain de soutien séparé ; ne transforme pas la silhouette haute en mur géant.',
      '620 unités de hauteur peinte ; échelle uniforme et pivot du socle mesuré visuellement.',
      'Aucun personnage canonique ni dieu universel attribué à ce mémorial.',
      'Source OpenAI conservée avec alpha natif ; pas de calibration 3D ou de fidélité canonique 1:1 revendiquée.',
    ]})),
  {id:'lava-skiff-v77',label:'Skiff de desserte du canyon',category:'ship',districtId:'lava-canyon-v77',spaceId:'world',
    position:{...HOMEWORLD_LAVA_DOCK_V77,z:0},dimensions:{width:288,depth:160,height:180},footprint:null,door:null,
    asset:homeworldLavaArtV77('lava-transit-skiff').src,lore:'original-adaptation',source:[],constraints:[
      'Appareil utilitaire original ; un dessin fixe déplacé sur le trajet réel, pas une planche animée native.',
      'Le pivot passager source 1000 ; 320 et le passeur 730 ; 405 sont mesurés dans le pont peint, pas sous la coque. Leurs appuis complets adultes restent séparés.',
      'Le passeur se place à la console ; le héros reste sur le pont pendant la traversée autorisée.',
      'Embarquement seulement si les quatre coins de l’appui du chasseur sont dans le pont peint, pas depuis la berge voisine.',
      'La lave animée est un effet procédural sous des modules rocheux natifs séparés ; elle ne rend pas les berges praticables.',
    ]},
];
