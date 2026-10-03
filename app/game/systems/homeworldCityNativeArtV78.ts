import corpus from '../data/homeworldCityGeneratedProvenanceV78.json';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import {homeworldUrbanHullV78,type HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';

/** Visible support centres reread on the ORIGINAL PNGs, with a conservative
 * convex envelope. These are local source pixels, not guessed world sockets.
 * The fused stock/food/tools remain part of each source, never independent art.
 * Approximate metrology is explicit; no camera yaw or canon1:1 is asserted. */
const measurements={
 'market-stall-right':{heightWorld:180,points:[[108,935],[410,944],[887,827],[1460,700]]},
 'forge-workstation-left':{heightWorld:155,points:[[110,660],[260,737],[740,790],[1240,933],[1420,780]]},
 'archive-shelf-right':{heightWorld:180,points:[[55,1375],[310,1480],[975,1310],[875,1240]]},
 'terrace-retaining-front':{heightWorld:190,points:[[65,758],[480,790],[1305,790],[1710,756]]},
 'port-cargo-sorting-cart':{heightWorld:115,points:[[265,768],[520,978],[1380,700]]},
 'clan-common-table-left':{heightWorld:85,points:[[93,816],[410,971],[1430,563]]},
 'civic-water-cistern-right':{heightWorld:145,points:[[80,865],[420,1040],[865,1112],[1250,900],[1260,825],[850,790]]},
} as const;
export type HomeworldCityNativeArtIdV78=keyof typeof measurements;
export interface HomeworldCityNativeArtV78 extends HomeworldNativeSpriteCellV64 {
 readonly id:HomeworldCityNativeArtIdV78;readonly sha256:string;
 readonly nativeGroundSupport:readonly HomeworldUrbanPointV78[];
 readonly supportTolerancePixels:12;readonly metrology:'VISUAL_SUPPORT_CENTRES_CONSERVATIVE_HULL';
}
export const HOMEWORLD_CITY_NATIVE_ART_V78=Object.fromEntries(Object.entries(measurements).map(([id,m])=>{
 const source=corpus.modules.find(s=>s.id===id)!;
 const box=source.boxes.find(b=>b.threshold===128)!;
 const support=homeworldUrbanHullV78(m.points.map(([x,y])=>({x,y})));
 const pivot={x:support.reduce((sum,p)=>sum+p.x,0)/support.length,y:support.reduce((sum,p)=>sum+p.y,0)/support.length};
 const art:HomeworldCityNativeArtV78={id:id as HomeworldCityNativeArtIdV78,src:'/game/homeworld/v78/'+id+'.png',
  sourceWidth:source.width,sourceHeight:source.height,sourceRect:{x:0,y:0,width:source.width,height:source.height},
  alphaBounds:{x:box.left,y:box.top,width:box.right-box.left+1,height:box.bottom-box.top+1},pivot,
  heightWorld:m.heightWorld,sha256:source.sha256,nativeGroundSupport:support,supportTolerancePixels:12,
  metrology:'VISUAL_SUPPORT_CENTRES_CONSERVATIVE_HULL'};
 return[id,art];
})) as Readonly<Record<HomeworldCityNativeArtIdV78,HomeworldCityNativeArtV78>>;
export const HOMEWORLD_CITY_NATIVE_SCENE_SOURCES_V78=Object.values(HOMEWORLD_CITY_NATIVE_ART_V78).map(art=>({
 src:art.src,sourceWidth:art.sourceWidth,sourceHeight:art.sourceHeight,kind:'scene' as const,
}));
export const HOMEWORLD_CITY_NATIVE_WITHHELD_V78=[
 {id:'merchant-home-right-safe',reason:'A real adult doorway and foundation must fit a new measured lot; existing8facades are not silently replaced.'},
 {id:'palace-frontage-safe',reason:'Main entrance/footprint and audience interior correspondence still require integration.'},
 {id:'acropolis-stair-front',reason:'Upper/lower native sockets and full transit support still require metrology.'},
 {id:'lower-quarter-ramp-front',reason:'Painted landings must match the real slum-slope path before mounting.'},
 {id:'civilian-forge-artisan',reason:'Anatomy review remains required; one pose supplies no walking clip.'},
 {id:'civilian-archive-keeper',reason:'Anatomy review remains required; one pose supplies no walking clip.'},
] as const;
