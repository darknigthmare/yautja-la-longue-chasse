import {HOMEWORLD_LANDSCAPE_PATCHES_V75,type HomeworldLandscapeGroundPatchV75} from './homeworldLandscapeV75';
import {HOMEWORLD_CONNECTIONS_V77,HOMEWORLD_REGIONAL_DOCKS_V77,homeworldLevelV77,homeworldWalkableV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_NATURAL_PUBLIC_GROUND_V85,HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85} from './homeworldNaturalSupportsV85';
import {HOMEWORLD_STREETS,pointInHomeworldPolygon} from './homeworldCity';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_NATURAL_PAD_PAINT_V80,HOMEWORLD_NATURAL_SHIP_PAINT_V80} from './homeworldNaturalPlacementsV80';

type Point={x:number;y:number};
export type HomeworldEcotoneRefusalV90='NO_CURRENT_ANCHOR'|'NO_NATURAL_SHOULDER_ON_LEVEL'|'UNSUPPORTED_ARRIVAL'|'INSUFFICIENT_EXPOSED_NATURAL_SURFACE';
export interface HomeworldEcotoneV90 extends HomeworldLandscapeGroundPatchV75 {
 readonly origin:HomeworldLandscapeGroundPatchV75;
 readonly levelId:HomeworldLevelV77;
 readonly anchorElementId:string;
 readonly arrival:Point;
 readonly formationIds:readonly string[];
 readonly exposedSampleCount:number;
 readonly status:'MOUNTED'|'REFUSED';
 readonly refusal:HomeworldEcotoneRefusalV90|null;
 readonly interactive:false;
 readonly solid:false;
}
const formationForPlateau:Readonly<Record<string,string>>={
 'landscape-floor-v75:western-drain':'v71:esplanade',
 'landscape-floor-v75:northern-shelter':'v75:threshold:pillar-jungle',
 'landscape-floor-v75:south-alluvium':'v80:causeway-south-0',
 'landscape-floor-v75:east-ridge':'v80:north-port-bedrock',
};
const bounds=(polygon:readonly Point[])=>({left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y))});
const formations=HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85.map(formation=>({...formation,bounds:bounds(formation.polygon)}));
const publicGround=HOMEWORLD_NATURAL_PUBLIC_GROUND_V85.map(ground=>({...ground,bounds:bounds(ground.polygon)}));
const contains=(point:Point,item:{polygon:readonly Point[];bounds:ReturnType<typeof bounds>})=>point.x>=item.bounds.left&&point.x<=item.bounds.right&&point.y>=item.bounds.top&&point.y<=item.bounds.bottom&&pointInHomeworldPolygon(point,item.polygon);
const overlap=(patch:HomeworldLandscapeGroundPatchV75,b:ReturnType<typeof bounds>)=>patch.x+patch.radiusX>b.left&&patch.x-patch.radiusX<b.right&&patch.y+patch.radiusY>b.top&&patch.y-patch.radiusY<b.bottom;
const outsidePortPaint=(point:Point)=>{
 const projectedY=point.y*HOMEWORLD_GEOMETRY_V64.depthScale;
 return ![HOMEWORLD_NATURAL_PAD_PAINT_V80,HOMEWORLD_NATURAL_SHIP_PAINT_V80].some(box=>point.x>=box.left&&point.x<=box.right&&projectedY>=box.top&&projectedY<=box.bottom);
};

/** This is a drawing admission check, never a new movement predicate. The
 * six materials can only tint a retained V85 natural shoulder outside ALL
 * public floor polygons. Routes, bodies and permissions remain unchanged. */
export function homeworldEcotoneExposedV90(patch:HomeworldEcotoneV90,point:Point):boolean{
 return patch.status==='MOUNTED'&&Math.hypot((point.x-patch.x)/patch.radiusX,(point.y-patch.y)/patch.radiusY)<1
  &&formations.some(f=>patch.formationIds.includes(f.id)&&contains(point,f))&&!publicGround.some(g=>contains(point,g))&&outsidePortPaint(point);
}
function compileEcotone(origin:HomeworldLandscapeGroundPatchV75):HomeworldEcotoneV90{
 const gateway=HOMEWORLD_CONNECTIONS_V77.find(g=>g.regionId===origin.regionId),dock=HOMEWORLD_REGIONAL_DOCKS_V77.find(d=>d.regionId===origin.regionId);
 const localFormation=formations.find(f=>f.id===formationForPlateau[origin.id]);
 const anchor=gateway?.threshold??dock?.point??localFormation?.anchor;
 const levelId=gateway?.levelId??dock?.levelId??'0';
 const arrival=gateway?.arrival??dock?.point??localFormation?.anchor??{x:origin.x,y:origin.y};
 const anchorElementId=gateway?'gateway-v72:'+gateway.regionId:dock?'dock-v77:'+dock.regionId:localFormation?
  (HOMEWORLD_STREETS.some(street=>street.id===localFormation.groundId)?'street:':'ground-v77:')+localFormation.groundId:'';
 const candidate={...origin,x:anchor?.x??origin.x,y:anchor?.y??origin.y,origin,levelId,anchorElementId,arrival,interactive:false as const,solid:false as const};
 const selected=formations.filter(f=>overlap(candidate,f.bounds));
 let refusal:HomeworldEcotoneRefusalV90|null=!anchor?'NO_CURRENT_ANCHOR':levelId!=='0'?'NO_NATURAL_SHOULDER_ON_LEVEL'
  :origin.regionId&&!homeworldWalkableV77(levelId,arrival)?'UNSUPPORTED_ARRIVAL':null;
 let exposedSampleCount=0;
 // Fixed 32x32 cell-centre sampling is inexpensive and deterministic. It
 // rejects empty/degenerate masks; it is NOT a continuous or visual proof.
 if(!refusal)for(let ix=0;ix<32;ix++)for(let iy=0;iy<32;iy++){
  const point={x:candidate.x-candidate.radiusX+(ix+.5)*candidate.radiusX/16,y:candidate.y-candidate.radiusY+(iy+.5)*candidate.radiusY/16};
  if(Math.hypot((point.x-candidate.x)/candidate.radiusX,(point.y-candidate.y)/candidate.radiusY)<.8&&selected.some(f=>contains(point,f))&&!publicGround.some(g=>contains(point,g))&&outsidePortPaint(point))exposedSampleCount++;
 }
 if(!refusal&&exposedSampleCount<16)refusal='INSUFFICIENT_EXPOSED_NATURAL_SURFACE';
 return{...candidate,formationIds:refusal?[]:selected.map(f=>f.id),exposedSampleCount,status:refusal?'REFUSED':'MOUNTED',refusal};
}
export const HOMEWORLD_ECOTONE_CANDIDATES_V90:readonly HomeworldEcotoneV90[]=HOMEWORLD_LANDSCAPE_PATCHES_V75.map(compileEcotone);
export const HOMEWORLD_ECOTONES_V90=HOMEWORLD_ECOTONE_CANDIDATES_V90.filter(patch=>patch.status==='MOUNTED');
export const HOMEWORLD_ECOTONE_REFUSALS_V90=HOMEWORLD_ECOTONE_CANDIDATES_V90.filter(patch=>patch.status==='REFUSED');
export function homeworldEcotoneProjectedV90(patch:HomeworldEcotoneV90){
 const d=HOMEWORLD_GEOMETRY_V64.depthScale,z=homeworldLevelV77(patch.levelId).elevation;
 return{cx:patch.x,cy:patch.y*d-z,rx:patch.radiusX,ry:patch.radiusY*d};
}
export function homeworldEcotoneVisibleV90(patch:HomeworldEcotoneV90,camera:{x:number;y:number;viewWidth:number;viewHeight:number}){
 if(patch.status!=='MOUNTED')return false;
 const p=homeworldEcotoneProjectedV90(patch);
 return p.cx+p.rx>camera.x&&p.cx-p.rx<camera.x+camera.viewWidth&&p.cy+p.ry>camera.y&&p.cy-p.ry<camera.y+camera.viewHeight;
}
/** Apply only after the old V77 mapper: these anchors already own their world
 * coordinates. Source V75 records/PNG remain untouched. Refused candidates
 * retain a documentary authoring panel, never a fictitious painted floor. */
export function homeworldEcotoneRecordV90<T extends HomeworldElementRecordV64>(record:T):T{
 if(record.id==='floor:landscape-v75'||record.id==='floor:outskirts-v71')return{...record,spaceId:'authoring:natural-envelope-v75',
  constraints:[...record.constraints,
   'Les règles V71/V75 ci-dessus décrivent le renderer historique HomeworldOutskirtsV71, absent du Hub actuel. Cette enveloppe est documentaire, pas une surface peinte ou praticable.',
   'Le renderer V77/V90 conserve uniquement les 42 formations naturelles V85 ancrées au véritable sol public. Onze variations V90 les teintent sans remplir la lave, le ciel ou toute cette ancienne enveloppe.',
   'Aucune nouvelle permission, collision ou superficie jouable. Le catalogue historique reste conservé sans modification.']};
 const patch=HOMEWORLD_ECOTONE_CANDIDATES_V90.find(p=>p.id===record.id);
 if(!patch)return record;
 return{...record,spaceId:patch.status==='MOUNTED'?'world':'authoring:ecotones-v90',position:{x:patch.x,y:patch.y,z:homeworldLevelV77(patch.levelId).elevation},
  associatedElementIds:[patch.anchorElementId].filter(Boolean),
  constraints:[...record.constraints,`Révision V90 : ${patch.status}, niveau ${patch.levelId}, ancre ${patch.anchorElementId||'absente'} ; source (${patch.origin.x},${patch.origin.y}) conservée.`,
   patch.refusal?`REFUS ${patch.refusal} : aucune copie de terrasse à cet étage, aucun sol ou droit de passage ajouté.`
    :`Masque limité aux formations V85 existantes, hors union des sols publics ; ${patch.exposedSampleCount} échantillons admis dans la zone centrale. Ce contrôle discret ne certifie pas les raccords visuels.`,
   'Les rayons, alpha, cellule native et note V75 sont conservés. Les textures décrivent un plateau volcanique original, pas une carte canonique 1:1.']};
}
