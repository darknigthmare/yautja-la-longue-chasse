import {HOMEWORLD_NATURAL_MODULES_V80} from './homeworldNaturalPlacementsV80';
import {homeworldOutskirtsFootprintV71,type HomeworldOutskirtsModuleV71} from './homeworldOutskirtsV71';
import {HOMEWORLD_GROUND_V77,HOMEWORLD_CONNECTOR_PADS_V82} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_GROUND_V78,homeworldUrbanRectV78,homeworldUrbanOverlapV78,homeworldUrbanHullV78} from './homeworldUrbanLayoutV78';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

type Point={x:number;y:number};
export const HOMEWORLD_NATURAL_PUBLIC_GROUND_V112=[...HOMEWORLD_GROUND_V77,...HOMEWORLD_CONNECTOR_PADS_V82,...HOMEWORLD_URBAN_GROUND_V78].filter(ground=>ground.levelId==='0');

/** The V71/V75 sources declare exterior natural roots, not planted civic
 * furniture. Later routes/paved courts crossed some of those old supports.
 * Native V80/V83 planters are a separate provider and are never filtered here.
 * Retain every source/coordinate; a refusal creates no invisible collision,
 * raster edit, automatic relocation or smaller support rectangle. */
export function homeworldNaturalPlacementDecisionV112(item:HomeworldOutskirtsModuleV71) {
  const box=homeworldOutskirtsFootprintV71(item),polygon=homeworldUrbanRectV78(box.left,box.top,box.right,box.bottom);
  const conflicts=HOMEWORLD_NATURAL_PUBLIC_GROUND_V112.filter(ground=>homeworldUrbanOverlapV78(polygon,ground.polygon));
  return {id:item.id,source:item,status:conflicts.length?'REFUSED' as const:'MOUNTED' as const,
    reason:conflicts.length?'NATIVE_SUPPORT_ON_PUBLIC_PAVING' as const:null,
    groundIds:conflicts.map(ground=>ground.id),physicalSupport:box};
}
export const HOMEWORLD_NATURAL_PLACEMENT_DECISIONS_V112=HOMEWORLD_NATURAL_MODULES_V80.map(homeworldNaturalPlacementDecisionV112);
export const HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112=HOMEWORLD_NATURAL_PLACEMENT_DECISIONS_V112.filter(item=>item.status==='REFUSED');
export const HOMEWORLD_NATURAL_MODULES_V112:readonly HomeworldOutskirtsModuleV71[]=HOMEWORLD_NATURAL_PLACEMENT_DECISIONS_V112.filter(item=>item.status==='MOUNTED').map(item=>item.source);

/** Derive the natural drawing envelope only from admitted roots. No refused
 * root can leave its old rock terrace or material mask hovering in the scene.
 * These source-grouped shoulders are drawing surfaces, never walkable ground. */
function supports() {
  const groups=new Map<string,HomeworldOutskirtsModuleV71[]>();
  for (const item of HOMEWORLD_NATURAL_MODULES_V112) {
    const source=item as HomeworldOutskirtsModuleV71&{groupId?:string;formation?:string};
    const id=item.id.startsWith('landscape-v75-')?'v75:'+source.groupId:item.id.startsWith('port-shoulder-v80:')?'v80:'+source.formation:'v71:'+item.districtId;
    const members=groups.get(id)??[];members.push(item);groups.set(id,members);
  }
  return [...groups].map(([id,items])=>{
    const points=items.flatMap(item=>{
      const box=homeworldOutskirtsFootprintV71(item);
      return [{x:box.left-22,y:box.top-22},{x:box.right+22,y:box.top-22},{x:box.right+22,y:box.bottom+22},{x:box.left-22,y:box.bottom+22}];
    });
    let nearest:{distance:number;point:Point;a:Point;b:Point;groundId:string}|null=null;
    for (const point of points) for (const ground of HOMEWORLD_NATURAL_PUBLIC_GROUND_V112) for (let i=0;i<ground.polygon.length;i++) {
      const a=ground.polygon[i],b=ground.polygon[(i+1)%ground.polygon.length],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
      if (length<1) continue;
      const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length));
      const anchor={x:a.x+t*dx,y:a.y+t*dy},distance=Math.hypot(anchor.x-point.x,anchor.y-point.y);
      if (!nearest||distance<nearest.distance) {
        const half=Math.min(.5,80/Math.sqrt(length)),low=Math.max(0,t-half),high=Math.min(1,t+half);
        nearest={distance,point:anchor,a:{x:a.x+low*dx,y:a.y+low*dy},b:{x:a.x+high*dx,y:a.y+high*dy},groundId:ground.id};
      }
    }
    if (!nearest) throw new Error('Natural formation without a real floor anchor: '+id);
    return {id,ids:items.map(item=>item.id),anchor:nearest.point,anchorEdge:[nearest.a,nearest.b],groundId:nearest.groundId,
      polygon:homeworldUrbanHullV78([...points,nearest.a,nearest.b])};
  });
}
export const HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112=supports();

/** Last mapper in the live codex: old claims remain historical, but refused
 * instances cannot keep a world footprint or masquerade as visible objects. */
export function homeworldNaturalRecordPlacementV112<T extends HomeworldElementRecordV64>(record:T):T {
  const id=record.id.startsWith('prop:')?record.id.slice(5):record.id;
  const decision=HOMEWORLD_NATURAL_PLACEMENT_DECISIONS_V112.find(item=>item.id===id);
  if (!decision) return record;
  if (decision.status==='REFUSED') return {...record,spaceId:'authoring:natural-refusals-v112',footprint:null,
    constraints:[...record.constraints,
      'V112 — non monté : l’appui naturel historique recoupe le pavement public actuel ('+decision.groundIds.join(', ')+').',
      'Source, orientation, échelle et coordonnées historiques conservées pour recomposition ; aucun dessin, collision ou ancienne terrasse fantôme au même endroit.']};
  return {...record,position:{x:decision.source.x,y:decision.source.y,z:0},footprint:decision.physicalSupport,
    constraints:[...record.constraints,'V112 — instance naturelle admise hors du pavement actuel ; le rendu, sa formation et le masque utilisent ce même ensemble.']};
}
