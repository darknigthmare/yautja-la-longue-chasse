import HomeworldNativePropV64 from './HomeworldNativePropV64';
import { homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_FURNITURE_ART_V72, type HomeworldFurnitureArtIdV72 } from './systems/homeworldFurnitureV72';

/** Receives UNPROJECTED ground coordinates. The native object remains upright;
 * only its front ground support is projected, exactly once. */
export default function HomeworldFurnitureV72({id, artId, x, y, depth = y, scale = 1, actor, className}: {
  id: string; artId: HomeworldFurnitureArtIdV72; x: number; y: number;
  depth?: number; scale?: number; actor?: {x: number; y: number}; className?: string;
}) {
  const art = HOMEWORLD_FURNITURE_ART_V72[artId], p = homeworldProjectGroundV64({x, y});
  const faded = actor && actor.y < y && Math.abs(actor.x-x) < art.footprintWorld.width*scale/2+30
    && (y-actor.y)*.574 < art.heightWorld*scale+20;
  return <HomeworldNativePropV64 id={id} artId={`furniture-v72:${artId}`} art={art}
    x={p.x} y={p.y} depth={depth} heightWorld={art.heightWorld*scale} className={className}
    style={{opacity: faded ? .28 : 1}} />;
}
