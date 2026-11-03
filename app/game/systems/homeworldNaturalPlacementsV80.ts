import {HOMEWORLD_OUTSKIRTS_MODULES_V71,homeworldOutskirtsFootprintV71,homeworldOutskirtsPaintV71,type HomeworldOutskirtsModuleV71} from './homeworldOutskirtsV71';
import {HOMEWORLD_LANDSCAPE_MODULES_V75} from './homeworldLandscapeV75';
import {HOMEWORLD_PORT_SHOULDERS_V80,homeworldPortShoulderRefusalV80} from './homeworldPortShouldersV80';
import {HOMEWORLD_SPACEPORT_V77} from './homeworldWorldV77';
import {HOMEWORLD_TRANSPORT_ART_V64} from './homeworldArtV64';
import {HOMEWORLD_GEOMETRY_V64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

/** Retain the original V71/V75 coordinates and bytes. The transferred port
 * exposed old vegetation over its pad; these eleven same-ID instances now
 * have a separate world-placement revision, not a modified source catalogue. */
export const HOMEWORLD_NATURAL_ORIGINS_V80:readonly HomeworldOutskirtsModuleV71[]=[...HOMEWORLD_OUTSKIRTS_MODULES_V71,...HOMEWORLD_LANDSCAPE_MODULES_V75];
const corrected:Readonly<Record<string,{x:number;y:number}>>={
 'landscape-v75-179':{x:6399,y:4576},'landscape-v75-162':{x:8197,y:4068},
 'landscape-v75-189':{x:8121,y:4350},'landscape-v75-161':{x:8116,y:3739},
 'landscape-v75-178':{x:8127,y:4569},'landscape-v75-160':{x:8114,y:3883},
 'landscape-v75-171':{x:8091,y:4236},'landscape-v75-168':{x:6179,y:4552},
 'outskirts-v71-103':{x:8051,y:3090},'landscape-v75-158':{x:8289,y:3737},
 'landscape-v75-167':{x:8062,y:3359},
};
export const HOMEWORLD_NATURAL_REVISIONS_V80=HOMEWORLD_NATURAL_ORIGINS_V80.filter(p=>corrected[p.id]).map(origin=>({
 id:origin.id,origin,active:{...origin,...corrected[origin.id]},reason:'Old silhouette/support intersected the transferred pad or shuttle; original source and scale retained.'
}));
export const HOMEWORLD_NATURAL_MODULES_V80:readonly HomeworldOutskirtsModuleV71[]=[
 ...HOMEWORLD_NATURAL_ORIGINS_V80.map(origin=>HOMEWORLD_NATURAL_REVISIONS_V80.find(r=>r.id===origin.id)?.active??origin),
 ...HOMEWORLD_PORT_SHOULDERS_V80,
];
const box=(r:{left:number;top:number;width:number;height:number})=>({...r,right:r.left+r.width,bottom:r.top+r.height});
const pad=HOMEWORLD_SPACEPORT_V77.pad,pa=HOMEWORLD_TRANSPORT_ART_V64['landing-pad'],d=HOMEWORLD_GEOMETRY_V64.depthScale;
/** Match the special native ground-pad placement and uniform shuttle draw in
 * HomeworldWorldSceneV77 exactly; these boxes never become new colliders. */
export const HOMEWORLD_NATURAL_PAD_PAINT_V80=box({left:pad.x-pa.pivot.x*pa.scaleWorldPerPixel,
 top:(pad.y-pad.depth/2-pa.pivot.y*pa.scaleWorldPerPixel)*d,width:pa.renderWidthWorld,height:pa.renderDepthWorld*d});
const ship=HOMEWORLD_SPACEPORT_V77.shuttle,sa=HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle'],s=sa.heightWorld/sa.alphaBounds.height,sp=homeworldProjectGroundV64(ship);
export const HOMEWORLD_NATURAL_SHIP_PAINT_V80=box({left:sp.x+(sa.alphaBounds.x-sa.pivot.x)*s,top:sp.y+(sa.alphaBounds.y-sa.pivot.y)*s,width:sa.alphaBounds.width*s,height:sa.alphaBounds.height*s});
export function homeworldNaturalRevisionRefusalV80(item:HomeworldOutskirtsModuleV71):string|null{
 const remaining=HOMEWORLD_NATURAL_REVISIONS_V80.filter(r=>r.id!==item.id).map(r=>({...r.active,formation:'retained-source-relocation',levelId:'0' as const,interactive:false as const,solid:false as const}));
 const refusal=homeworldPortShoulderRefusalV80({...item,formation:'retained-source-relocation',levelId:'0',interactive:false,solid:false},[...HOMEWORLD_PORT_SHOULDERS_V80,...remaining]);
 if(refusal)return refusal;
 const p=box(homeworldOutskirtsPaintV71(item));
 const touches=(b:{left:number;right:number;top:number;bottom:number})=>p.left<b.right&&p.right>b.left&&p.top<b.bottom&&p.bottom>b.top;
 return touches(HOMEWORLD_NATURAL_PAD_PAINT_V80)||touches(HOMEWORLD_NATURAL_SHIP_PAINT_V80)?'painted-pad-or-shuttle':null;
}
/** Aggregate records are corrected AFTER the legacy V77 transform. The atlas
 * and archived V71/V75 records remain unchanged, with original anchors named. */
export function homeworldNaturalRecordPlacementV80<T extends HomeworldElementRecordV64>(record:T):T{
 const id=record.id.startsWith('prop:')?record.id.slice(5):record.id,revision=HOMEWORLD_NATURAL_REVISIONS_V80.find(r=>r.id===id);
 if(!revision)return record;
 return{...record,position:{x:revision.active.x,y:revision.active.y,z:0},footprint:homeworldOutskirtsFootprintV71(revision.active),
  constraints:[...record.constraints,`Placement V80 (${revision.active.x},${revision.active.y}); origine V71/V75 (${revision.origin.x},${revision.origin.y}) conservée.`,
   'Même ID, cellule PNG, pivot et échelle ; appui hors sol public et silhouette hors pad/navette. Décor non solide, aucun collider ou accès nouveau.']};
}
