import {HOMEWORLD_INTERIOR_ART_V64} from './systems/homeworldArtV64';
import {HOMEWORLD_GEOMETRY_V64} from './systems/homeworldGeometryV64';
import type {HomeworldInteriorV64} from './systems/homeworldInteriorsV64';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
/** Native low cutaway walls reveal occupants while retaining physical partitions.
 * Crop only the visible portion; partial modules are never stretched. */
export default function HomeworldInteriorPartitionsV72({room}:{room:HomeworldInteriorV64}){
  return <>{(room.partitions??[]).map(wall=>{
    const horizontal=wall.orientation==='horizontal',art=HOMEWORLD_INTERIOR_ART_V64[horizontal?'north':'west'];
    const length=horizontal?wall.width:wall.depth,count=Math.ceil(length/art.moduleLengthWorld),height=wall.cutawayHeight+12;
    return <span key={wall.id} data-interior-partition-v72={wall.id} data-collision-width={wall.width} data-collision-depth={wall.depth}
      style={{position:'absolute',left:horizontal?wall.x:wall.x-15,top:wall.y*HOMEWORLD_GEOMETRY_V64.depthScale-height,
        width:horizontal?wall.width:42,height:horizontal?height+12:wall.depth*HOMEWORLD_GEOMETRY_V64.depthScale+height,
        overflow:'hidden',zIndex:Math.round(wall.y+wall.depth),pointerEvents:'none'}}>
      {Array.from({length:count},(_,i)=><HomeworldNativePropV64 key={i} id={wall.id+'-native-'+i} artId={'wall-'+(horizontal?'north':'west')} art={art}
        x={horizontal?(i+.5)*art.moduleLengthWorld:21} y={horizontal?height:(i+1)*art.moduleLengthWorld*HOMEWORLD_GEOMETRY_V64.depthScale+height} depth={0}/>)}
    </span>;
  })}</>;
}
