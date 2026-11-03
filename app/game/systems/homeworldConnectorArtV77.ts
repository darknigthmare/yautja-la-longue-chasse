import art from '../data/homeworldConnectorArtV77.json';
import {homeworldProjectGroundV64} from './homeworldGeometryV64';
type Landing={levelId:string;point:{x:number;y:number};elevation:number};
/** A uniform scale maps the two measured flat sockets. This preserves native
 * pixels and their35° authored perspective; it is visual metrology, not3D CAD. */
export const HOMEWORLD_COUNCIL_STAIR_ART_V77=art;
export const HOMEWORLD_CONNECTOR_SCENE_SOURCES_V77=[{src:art.src,sourceWidth:art.sourceWidth,sourceHeight:art.sourceHeight,kind:'scene' as const}];
export function homeworldCouncilStairPlacementV77(from:Landing,to:Landing){
 const lower=homeworldProjectGroundV64(from.point,from.elevation),upper=homeworldProjectGroundV64(to.point,to.elevation);
 const scale=(lower.y-upper.y)/(art.lowerSocket.y-art.upperSocket.y);
 if(scale<=0||Math.abs((art.upperSocket.x-art.lowerSocket.x)*scale-(upper.x-lower.x))>1e-7)throw Error('Native stair cannot align without forbidden rotation or stretch');
 return{left:lower.x-art.lowerSocket.x*scale,top:lower.y-art.lowerSocket.y*scale,width:art.sourceWidth*scale,height:art.sourceHeight*scale,scale,
  lower,upper,painted:{left:lower.x+(art.alphaBounds.x-art.lowerSocket.x)*scale,top:lower.y+(art.alphaBounds.y-art.lowerSocket.y)*scale,width:art.alphaBounds.width*scale,height:art.alphaBounds.height*scale}};
}
export function homeworldCouncilStairRailsV77(from:Landing,to:Landing){
 const layout=homeworldCouncilStairPlacementV77(from,to),left=(art.walkBounds.left-art.lowerSocket.x)*layout.scale,right=(art.walkBounds.right-art.lowerSocket.x)*layout.scale;
 return[from,to].flatMap((landing,index)=>[
  {id:'council-stair-rail:'+index+':left',levelId:landing.levelId,left:landing.point.x+left-26,right:landing.point.x+left,top:landing.point.y-42,bottom:landing.point.y+42},
  {id:'council-stair-rail:'+index+':right',levelId:landing.levelId,left:landing.point.x+right,right:landing.point.x+right+26,top:landing.point.y-42,bottom:landing.point.y+42},
 ]);
}
