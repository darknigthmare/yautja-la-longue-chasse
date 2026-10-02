import HomeworldFurnitureV72 from './HomeworldFurnitureV72';
import {HOMEWORLD_FRONTAGE_ITEMS_V75} from './systems/homeworldArchitectureV75';

/** Each fixture is an independent native atlas sprite. Ground is projected by
 * FurnitureV72 once; upright art and the historic façade keep uniform scale. */
export default function HomeworldArchitectureV75({actor}:{actor?:{x:number;y:number}}){
 return <>{HOMEWORLD_FRONTAGE_ITEMS_V75.map(item=><HomeworldFurnitureV72 key={item.id}
  id={item.id} artId={item.artId} x={item.x} y={item.y} scale={item.scale} actor={actor}/>)}</>;
}
