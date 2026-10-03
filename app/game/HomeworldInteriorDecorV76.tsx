import HomeworldNativePropV64 from './HomeworldNativePropV64';
import {homeworldProjectGroundV64,HOMEWORLD_GEOMETRY_V64} from './systems/homeworldGeometryV64';
import {HOMEWORLD_INTERIOR_DECOR_ART_V76,homeworldInteriorDecorBoundsV76,type HomeworldInteriorDecorInstanceV76} from './systems/homeworldInteriorDecorV76';

/** Native orientation lives in the PNG. Project the ground anchor exactly once;
 * uniformly scale the original pixels, never rotate, mirror or skew furniture. */
export default function HomeworldInteriorDecorV76({item,actor}:{item:HomeworldInteriorDecorInstanceV76;actor:{x:number;y:number}}){
  const art=HOMEWORLD_INTERIOR_DECOR_ART_V76[item.artId],p=homeworldProjectGroundV64(item),b=homeworldInteriorDecorBoundsV76(item);
  const faded=actor.y<item.y&&actor.x>b.left-24&&actor.x<b.right+24
    &&(item.y-actor.y)*HOMEWORLD_GEOMETRY_V64.depthScale<art.heightWorld*item.scale+16;
  return <span data-homeworld-interior-decor-v76={item.id} data-decor-native-orientation={art.orientation}
    data-decor-solid={item.solid?'true':'false'} data-decor-ground-bounds={`${b.left},${b.top},${b.right},${b.bottom}`}>
    <HomeworldNativePropV64 id={item.id} artId={`interior-v76:${item.artId}`} art={art} x={p.x} y={p.y}
      depth={item.y} heightWorld={art.heightWorld*item.scale} style={{opacity:faded?.28:1}}/>
  </span>;
}
