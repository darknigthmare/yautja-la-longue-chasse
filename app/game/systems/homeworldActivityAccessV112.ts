import {HOMEWORLD_CARTOGRAPHY_V104 as local} from './homeworldCartographyDefinitionV104';
import {HOMEWORLD_CARTOGRAPHY_V105 as high} from './homeworldCartographyDefinitionV105';
import {HOMEWORLD_ARCHIVE_V106 as archive} from './homeworldArchiveDefinitionV106';
import {HOMEWORLD_ARCHIVE_COMPARISON_V107 as comparison} from './homeworldArchiveComparisonDefinitionV107';
import {HOMEWORLD_CARGO_V108 as cargo} from './homeworldCargoDefinitionV108';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as plaque} from './homeworldArchivePlaqueDefinitionV109';
import {HOMEWORLD_ARCHIVE_CONTINUATION_V111 as continuation} from './homeworldArchiveContinuationDefinitionV111';
import {HOMEWORLD_URBAN_PROPS_V78} from './homeworldStreetModulesV78';
import type {HomeworldLevelV77} from './homeworldWorldV77';

type Point={x:number;y:number};
type Access={id:string;activity:string;source:string;path:string;levelId:HomeworldLevelV77;point:Point;role:string};
const definitions=[
  ['V104','homeworldCartographyDefinitionV104',local],['V105','homeworldCartographyDefinitionV105',high],
  ['V106','homeworldArchiveDefinitionV106',archive],['V107','homeworldArchiveComparisonDefinitionV107',comparison],
  ['V108','homeworldCargoDefinitionV108',cargo],['V109','homeworldArchivePlaqueDefinitionV109',plaque],
  ['V111','homeworldArchiveContinuationDefinitionV111',continuation],
] as const;
const records:Access[]=[];
const add=(activity:string,source:string,path:string,point:Point,levelId:HomeworldLevelV77='0',role='fixed-definition-contact')=>{
  records.push({id:`activity-access-v112:${activity}:${path}`,activity,source:'app/game/systems/'+source+'.ts',path,levelId,point:{x:point.x,y:point.y},role});
};
function collect(value:unknown,path:string[],activity:string,source:string){
  if(!value||typeof value!=='object')return;
  const object=value as Record<string,unknown>;
  if(typeof object.x==='number'&&typeof object.y==='number'&&Number.isFinite(object.x)&&Number.isFinite(object.y)){
    const level=activity==='V105'&&['upper','highPoint'].includes(path[0])?'+1':typeof object.levelId==='string'?object.levelId:'0';
    add(activity,source,path.join('.'),{x:object.x,y:object.y},level as HomeworldLevelV77);
  }
  for(const [key,item]of Object.entries(object))if(item&&typeof item==='object')collect(item,[...path,key],activity,source);
}
for(const [activity,source,definition]of definitions)collect(definition,[],activity,source);
const lectern=HOMEWORLD_URBAN_PROPS_V78.find(item=>item.id===local.lecternId);
if(!lectern)throw new Error('Missing retained cartography lectern '+local.lecternId);
add('V104','homeworldStreetModulesV78','retained-lectern:'+local.lecternId,lectern,lectern.levelId,'retained-service-anchor');

// Fixed source pickup endpoints and legacy Atlas approaches are distinct from
// sprite anchors. V110 markers subtract55, then the exterior planner adds55;
// V106 ground source cases instead acquire their actual +55 pickup endpoint.
for(const item of archive.cases)add('V106','homeworldObjectivesV110','cases.'+item.id+'.objective-pickup',{x:item.origin.x,y:item.origin.y+55},'0','fixed-objective-approach');
add('V106','homeworldAtlasLandmarksV83','archive-atlas-approach',{x:archive.post.x,y:archive.post.y+55},'0','legacy-atlas-approach');
add('V107','homeworldAtlasLandmarksV83','comparison-source-atlas-approach',{x:comparison.evidence.origin.x,y:comparison.evidence.origin.y+55},'0','legacy-atlas-approach');
add('V107','homeworldAtlasLandmarksV83','comparison-table-atlas-approach',{x:comparison.table.x,y:comparison.table.y+55},'0','legacy-atlas-approach');
for(const item of comparison.references)add('V107','homeworldAtlasLandmarksV83','reference-'+item.caseId+'-atlas-approach',{x:item.x,y:item.y+55},'0','legacy-atlas-approach');
for(const [id,host]of [['cargo',cargo.host],['guardian',cargo.guardian.host]] as const)add('V108','homeworldAtlasLandmarksV83',id+'-atlas-approach',{x:host.x,y:host.y+55},'0','legacy-atlas-approach');

/** Mounted only after the retained V92 world. Real definitions remain the
 * authority; no gameplay coordinate is copied into the placement JSON. V110
 * projects these same physical stands and V111 delegates the V109 study. */
export const HOMEWORLD_ACTIVITY_FIXED_ACCESS_V112:readonly Access[]=records;
export const HOMEWORLD_ACTIVITY_ACCESS_BODY_V112={halfWidth:36,halfDepth:26} as const;
const rectangle=(p:Point,w:number,d:number)=>[{x:p.x-w,y:p.y-d},{x:p.x+w,y:p.y-d},{x:p.x+w,y:p.y+d},{x:p.x-w,y:p.y+d}];
function hull(points:Point[]){
  const ordered=points.sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const half=(rows:Point[])=>{const result:Point[]=[];for(const p of rows){while(result.length>1&&cross(result.at(-2)!,result.at(-1)!,p)<=0)result.pop();result.push(p);}return result;};
  return[...half(ordered).slice(0,-1),...half([...ordered].reverse()).slice(0,-1)];
}
const localPath=[local.post,...local.waypoints,local.post];
const nativeBody={halfWidth:24,halfDepth:14};
const segment=(activity:string,id:string,from:Point,to:Point,body=nativeBody)=>({id:'activity-path-v112:'+activity+':'+id,activity,levelId:'0' as const,from,to,body});
const atlas=(point:Point)=>({x:point.x,y:point.y+55});
export const HOMEWORLD_ACTIVITY_FIXED_SEGMENTS_V112=[
  segment('V104','post-host',local.post,local.host),
  ...localPath.slice(1).map((to,index)=>segment('V104','required-known-leg:'+index,localPath[index],to)),
  segment('V105','post-host',high.post,local.host),
  segment('V106','post-host',archive.post,archive.host),
  ...archive.cases.map(item=>segment('V106','pickup:'+item.id,item.stand,item.origin)),
  segment('V107','post-host',comparison.post,comparison.host),
  segment('V107','evidence-stand-source',comparison.evidence.stand,comparison.evidence.origin),
  segment('V108','post-host',cargo.post,cargo.host),
  segment('V108','guardian-post-host',cargo.guardian.post,cargo.guardian.host),
  ...cargo.lots.map(item=>segment('V108','pickup:'+item.id,item.stand,item.origin)),
  segment('V108','passage-wide-body',cargo.passage.start,cargo.passage.end,{halfWidth:24,halfDepth:cargo.passage.halfDepth}),
  ...['V109','V111'].flatMap(activity=>plaque.objects.map(item=>segment(activity,'source-stand-source:'+item.id,item.stand,item.origin))),
  ...archive.cases.map(item=>segment('V106','objective-take:'+item.id+'-required-contact',atlas(item.origin),item.origin)),
  segment('V106','atlas-archivist-required-contact',atlas(archive.post),archive.host),
  segment('V107','atlas-zone-C-required-contact',atlas(comparison.evidence.origin),comparison.evidence.origin),
  segment('V107','atlas-table-required-contact',atlas(comparison.table),comparison.table.stand),
  ...comparison.references.map(item=>segment('V107','atlas-reference:'+item.caseId+'-required-contact',atlas(item),item.stand)),
  segment('V108','atlas-steward-required-contact',atlas(cargo.host),cargo.host),
  segment('V108','atlas-guardian-required-contact',atlas(cargo.guardian.host),cargo.guardian.host),
];
export const HOMEWORLD_ACTIVITY_ACCESS_RESERVES_V112=[
  ...records.filter((row,index)=>records.findIndex(other=>other.levelId===row.levelId&&other.point.x===row.point.x&&other.point.y===row.point.y)===index)
    .map(row=>({id:row.id,levelId:row.levelId,polygon:rectangle(row.point,HOMEWORLD_ACTIVITY_ACCESS_BODY_V112.halfWidth,HOMEWORLD_ACTIVITY_ACCESS_BODY_V112.halfDepth)})),
  ...HOMEWORLD_ACTIVITY_FIXED_SEGMENTS_V112.map(row=>{
    const body={halfWidth:Math.max(36,row.body.halfWidth),halfDepth:Math.max(26,row.body.halfDepth)};
    return{id:row.id,levelId:row.levelId,polygon:hull([...rectangle(row.from,body.halfWidth,body.halfDepth),...rectangle(row.to,body.halfWidth,body.halfDepth)])};
  }),
];
