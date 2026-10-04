import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_CONNECTORS_V77,HOMEWORLD_RESIDENTS_V77,HOMEWORLD_POINTS_V77,HOMEWORLD_CONNECTIONS_V77,HOMEWORLD_GROUND_V77,HOMEWORLD_PROPS_V77,HOMEWORLD_FRONTAGE_V77,HOMEWORLD_EXTERIOR_V77,homeworldCollisionV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_CIVIC_PROPS_V80,HOMEWORLD_CIVIC_ART_V80,homeworldCivicPolygonV80,HOMEWORLD_CIVIC_REFUSALS_V80} from './homeworldCivicDecorV80';
import {HOMEWORLD_URBAN_PROPS_V78,HOMEWORLD_CITY_GENERATED_PROPS_V78,HOMEWORLD_URBAN_PROP_REJECTIONS_V78,homeworldUrbanTerrainV78} from './homeworldStreetModulesV78';
import {HOMEWORLD_URBAN_FACADES_V78} from './homeworldUrbanFacadesV78';
import {HOMEWORLD_URBAN_STREETS_V78,homeworldUrbanOverlapV78,homeworldUrbanCorridorV78,homeworldUrbanRectV78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_EXTRAS_V78} from './homeworldUrbanPopulationV78';
import {HOMEWORLD_COURT_ART_V80,homeworldCourtPolygonV80} from './homeworldCourtArtV80';
import {HOMEWORLD_CITY_NATIVE_ART_V78} from './homeworldCityNativeArtV78';
import {homeworldCityNativePolygonV78} from './homeworldCityNativePlacementV78';
import {homeworldBuildingGroundFrameV76,homeworldBuildingDoorwayV64,homeworldBuildingFootprintsOverlapV76} from './homeworldGeometryV64';
import {HOMEWORLD_INTERIOR_BINDINGS_V64,homeworldInteriorForBuildingV64} from './homeworldInteriorsV64';
import {HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76} from './homeworldBuildingPlacementsV76';
import {homeworldFurnitureFootprintV72} from './homeworldFurnitureV72';
import {homeworldExteriorFootprintV76} from './homeworldExteriorDecorV76';
import {HOMEWORLD_AUTHORED_COURTS_V81,HOMEWORLD_FRONTAGE_PLANS_V81,HOMEWORLD_DISTRICT_GRAMMAR_V81} from './homeworldAuthoredLotsV81';
import {homeworldUsageEnvelopesV81,homeworldEnvelopesOverlapV81,homeworldEnvelopeBoundsV81,homeworldEnvelopeDistanceV81} from './homeworldUsageEnvelopesV81';

type Point={readonly x:number;readonly y:number};
export type HomeworldRuleSeverityV81='fatal'|'error'|'warning'|'info';
export interface HomeworldPlacementRuleV81 {readonly id:string;readonly family:string;readonly severity:HomeworldRuleSeverityV81;readonly targetType:string;readonly description:string}
export interface HomeworldSpatialAssertionV81 {readonly id:string;readonly ruleId:string;readonly objectId:string;readonly conflictId:string|null;readonly levelId:HomeworldLevelV77;readonly passed:boolean;readonly severity:HomeworldRuleSeverityV81;readonly district:string;readonly position:Point;readonly reason:string;readonly actualDistance:number|null;readonly requiredDistance:number|null;readonly suggestedFix:string|null}
const moved=new Set(['rite-sanctum','residence-terraces-4','residence-enforcers-1','residence-citadel-1','residence-undercity-1','residence-memory-1','residence-arenas-1','residence-market-1','residence-convoy-works-2','residence-forges-1','residence-undercity-2','residence-convoy-works-1','residence-market-2','residence-esplanade-2','residence-clans-1']);
const blockFamilies:Readonly<Record<string,string>>={port:'îlot des équipages et contrôle',market:'îlot des échanges et alcôves marchandes',forges:'îlot des ateliers et logements artisans',undercity:'îlot du refuge et galeries',esplanade:'îlot du mémorial et promenade',terraces:'îlot des maîtres et logement du cercle',clans:'îlot des délégations',enforcers:'îlot du bastion et de la relève',memory:'îlot du registre et des scribes',arenas:'îlot du cercle de chasse',temple:'îlot du Conseil et annexes',citadel:'îlot royal et annexe d’audience','convoy-works':'îlot des convoyeurs et ateliers','rampart-walk':'îlot des relais du rempart'};
/** All 43 real stable-ID entrances have an explicit parcel/road/service role.
 * The smaller noninteractive facades have separate lots and cannot become
 * fabricated visitable houses or campaign discoveries. */
export const HOMEWORLD_BUILDING_LOTS_V81=HOMEWORLD_BUILDINGS_V77.map(b=>{
 const frame=homeworldBuildingGroundFrameV76(b),door=homeworldBuildingDoorwayV64(b),bounds=homeworldEnvelopeBoundsV81(frame.polygon),grammar=HOMEWORLD_DISTRICT_GRAMMAR_V81[b.districtId],room=homeworldInteriorForBuildingV64(b.id)!;
 const approachPolygon=homeworldUrbanCorridorV78(door.threshold,{x:door.threshold.x+frame.normal.x*128,y:door.threshold.y+frame.normal.y*128},Math.max(64,(door.clearWidth+48)/2),64);
 const service={x:b.x-frame.normal.x*(b.footprint.depth*.55),y:b.y-frame.normal.y*(b.footprint.depth*.55)};
 return{buildingId:b.id,levelId:b.levelId,districtId:b.districtId,label:b.label,function:b.entranceKind==='domestic'?'clan-residence':b.variant,
  blockId:'block-v81:'+b.districtId,blockLabel:blockFamilies[b.districtId],density:grammar?.density??2,
  frontage:frame.angled?'NATIVE_OBLIQUE':'NATIVE_FRONTAL',nativeYaw:b.art.groundFrame?.yawDegrees??0,
  art:b.art.src,footprint:frame.polygon,parcel:{left:bounds.left-40,right:bounds.right+40,top:bounds.top-48,bottom:bounds.bottom+176},
  door,approachPolygon,service,road:grammar?.street??'Voie civique',purpose:HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76[b.id]?.reason??'Entrée reliée à la rue de son district et aux activités déjà présentes.',
  classification:moved.has(b.id)?'MOVE' as const:frame.angled?'KEEP' as const:'NEW_ART_VARIANT' as const,
  furniturePlan:HOMEWORLD_FRONTAGE_PLANS_V81[b.id]??[],interior:{buildingId:b.id,title:room.title,width:room.width,depth:room.depth,zones:(room.zones??[]).map(z=>z.label),services:HOMEWORLD_INTERIOR_BINDINGS_V64[b.id]??[]},
  nearestNeighbors:HOMEWORLD_BUILDINGS_V77.filter(other=>other!==b&&other.levelId===b.levelId).map(other=>({id:other.id,distance:homeworldEnvelopeDistanceV81(bounds,homeworldEnvelopeBoundsV81(homeworldBuildingGroundFrameV76(other).polygon))})).sort((a,c)=>a.distance-c.distance).slice(0,3),
 };
});
export const HOMEWORLD_URBAN_BLOCKS_V81=Object.entries(blockFamilies).map(([districtId,label])=>({id:'block-v81:'+districtId,districtId,label,
 buildingIds:HOMEWORLD_BUILDING_LOTS_V81.filter(b=>b.districtId===districtId).map(b=>b.buildingId),
 density:HOMEWORLD_DISTRICT_GRAMMAR_V81[districtId]?.density??2,street:HOMEWORLD_DISTRICT_GRAMMAR_V81[districtId]?.street,
 topology:districtId==='citadel'||districtId==='temple'?'PROCESSIONAL_WITH_RESERVED_PUBLIC_FORECOURT':districtId==='port'?'LANDING_APRON_AND_TWO_SIDED_CAUSEWAY':districtId==='undercity'?'ASYMMETRIC_SERVICE_LOOP':'PUBLIC_FRONTAGE_AND_SERVICE_ALCOVES',
}));

const props=[
 ...HOMEWORLD_CIVIC_PROPS_V80.map(p=>({id:p.id,artId:p.artId,asset:HOMEWORLD_CIVIC_ART_V80[p.artId].src,levelId:p.levelId,districtId:p.districtId,clusterId:p.clusterId,purpose:p.label,x:p.x,y:p.y,polygon:homeworldCivicPolygonV80(p)})),
 ...HOMEWORLD_URBAN_PROPS_V78.map(p=>({id:p.id,artId:p.artId,asset:HOMEWORLD_COURT_ART_V80[p.artId].src,levelId:p.levelId,districtId:p.districtId,clusterId:p.groupId,purpose:p.label,x:p.x,y:p.y,polygon:homeworldCourtPolygonV80(p)})),
 ...HOMEWORLD_CITY_GENERATED_PROPS_V78.map(p=>({id:p.id,artId:p.artId,asset:HOMEWORLD_CITY_NATIVE_ART_V78[p.artId].src,levelId:p.levelId,districtId:p.districtId,clusterId:'authored-native:'+p.artId,purpose:HOMEWORLD_CITY_NATIVE_ART_V78[p.artId].id,x:p.x,y:p.y,polygon:homeworldCityNativePolygonV78(p)})),
];
export const HOMEWORLD_USAGE_OBJECTS_V81=props.map(p=>({...p,...homeworldUsageEnvelopesV81(p.artId,p.polygon)}));
export const HOMEWORLD_LEGACY_USAGE_OBJECTS_V81=[
 ...HOMEWORLD_FRONTAGE_V77.map(p=>({id:p.id,artId:p.artId,levelId:p.levelId,x:p.x,y:p.y,physical:homeworldFurnitureFootprintV72(p)})),
 ...HOMEWORLD_EXTERIOR_V77.filter(p=>p.solid).map(p=>({id:p.id,artId:p.artId,levelId:p.levelId,x:p.x,y:p.y,physical:homeworldExteriorFootprintV76(p)})),
 ...HOMEWORLD_PROPS_V77.filter(p=>p.plane==='ground').map(p=>{const w=p.footprint?.halfWidth??Math.max(18,p.width*.22),d=p.footprint?.halfDepth??Math.max(10,Math.min(24,p.height*.14));return{id:p.id,artId:p.artId??p.asset,levelId:p.levelId,x:p.x,y:p.y,physical:{left:p.x-w,right:p.x+w,top:p.y-(p.artId?2:1)*d,bottom:p.y+(p.artId?0:d)}};}),
].map(p=>({...p,...homeworldUsageEnvelopesV81(p.artId,homeworldUrbanRectV78(p.physical.left,p.physical.top,p.physical.right,p.physical.bottom))}));
export const HOMEWORLD_RULES_V81:readonly HomeworldPlacementRuleV81[]=[
 {id:'BUILDING_ENTRANCE_CONNECTED',family:'access',severity:'error',targetType:'building',description:'Le corps entier peut atteindre le vrai seuil depuis son approche publique.'},
 {id:'DOOR_APPROACH_CLEAR',family:'access',severity:'error',targetType:'door',description:'Le dégagement réel de la porte reste libre de mobilier.'},
 {id:'BUILDING_SUPPORTED',family:'foundation',severity:'warning',targetType:'building',description:'Tous les contacts de la fondation reposent sur le sol de leur étage.'},
 {id:'BUILDING_SEPARATION',family:'volume',severity:'error',targetType:'building-pair',description:'Deux bâtiments sur un même étage ne partagent pas de maçonnerie.'},
 {id:'BUILDING_SERVICE_ZONE_VALID',family:'function',severity:'error',targetType:'building',description:'La parcelle contient un revers de service et une fonction intérieure existante.'},
 {id:'BENCH_USE_ZONE_CLEAR',family:'usage',severity:'error',targetType:'bench',description:'Approche frontale et espace social du banc utilisables.'},
 {id:'STALL_CUSTOMER_ZONE_CLEAR',family:'usage',severity:'error',targetType:'market',description:'Le client dispose d’une poche libre devant l’étal.'},
 {id:'FORGE_SAFETY_ZONE_CLEAR',family:'usage',severity:'error',targetType:'forge',description:'La zone de travail chaud ne partage pas un banc ou cargo.'},
 {id:'CARGO_LOADING_ZONE_CLEAR',family:'usage',severity:'error',targetType:'cargo',description:'Manutention et face de chargement accessibles.'},
 {id:'NPC_SOCIAL_ZONE_CLEAR',family:'population',severity:'error',targetType:'npc-route',description:'Les routines réelles ne sont pas traversées par le mobilier.'},
 {id:'USAGE_SUPPORTED',family:'usage',severity:'error',targetType:'prop',description:'Le corps du joueur peut reposer et approcher dans la zone d’usage.'},
 {id:'PROP_ROLE_MATCHES_DISTRICT',family:'function',severity:'warning',targetType:'prop',description:'L’objet répond à une activité prévue dans ce quartier.'},
 {id:'IDENTICAL_PROP_REPETITION_LIMIT',family:'variety',severity:'warning',targetType:'prop-pair',description:'Limite des copies reconnaissables dans une même vue.'},
 {id:'BUILDING_REPETITION_LIMIT',family:'variety',severity:'warning',targetType:'building-pair',description:'La même silhouette ne doit pas devenir le seul langage d’un îlot.'},
 {id:'GRID_ALIGNMENT_DETECTION',family:'composition',severity:'warning',targetType:'court',description:'Une cour non cérémonielle ne forme pas une grille de mobilier.'},
 {id:'COLLINEAR_CLUSTER_DETECTION',family:'composition',severity:'warning',targetType:'cluster',description:'Trois familles de props ne partagent pas une baseline injustifiée.'},
 {id:'INTERSECTION_SIGHT_CLEAR',family:'access',severity:'error',targetType:'street-node',description:'Le centre des carrefours demeure libre de gros mobilier.'},
 {id:'LANDMARK_VIEW_CORRIDOR_CLEAR',family:'composition',severity:'warning',targetType:'landmark',description:'L’axe public du palais et du Conseil reste lisible.'},
 {id:'BARRIER_CONTINUITY',family:'structure',severity:'warning',targetType:'barrier',description:'Le retour d’un garde-corps doit rencontrer un appui ; un module isolé ne constitue pas une barrière complète.'},
 {id:'BARRIER_GATE_CLEAR',family:'access',severity:'error',targetType:'connector',description:'Les deux paliers du raccord gardent le corps et son espace de virage.'},
];

const ruleFor=(id:string)=>HOMEWORLD_RULES_V81.find(r=>r.id===id)!;
/** Materialized checks name the actual object pair, door, polygon corner,
 * social route or working face. Counts are evidence, not invented rule001..N.
 * Runs on demand for QA/reporting; the live compiler already applies hard
 * envelopes before mounting props, without burdening every render frame. */
export function auditHomeworldPlacementV81(){
 const assertions:HomeworldSpatialAssertionV81[]=[];
 const check=(ruleId:string,objectId:string,levelId:HomeworldLevelV77,district:string,position:Point,passed:boolean,reason:string,conflictId:string|null=null,distance:number|null=null,required:number|null=null,severity?:HomeworldRuleSeverityV81)=>{
  const rule=ruleFor(ruleId);assertions.push({id:ruleId+':'+objectId+(conflictId?':'+conflictId:'')+':'+assertions.length,ruleId,objectId,conflictId,levelId,district,position:{x:position.x,y:position.y},passed,severity:severity??rule.severity,reason,actualDistance:distance,requiredDistance:required,suggestedFix:passed?null:rule.family==='variety'?'Produire une variante native adaptée à cet îlot.':rule.family==='foundation'?'Dessiner et matérialiser le soutènement de la parcelle.':'Recomposer la parcelle ou refuser cet objet ; ne pas réduire son contact.'});
 };
 for(const lot of HOMEWORLD_BUILDING_LOTS_V81){
  check('BUILDING_ENTRANCE_CONNECTED',lot.buildingId,lot.levelId,lot.districtId,lot.door.approach,homeworldUrbanTerrainV78(lot.levelId,lot.door.approach)&&!homeworldCollisionV77(lot.levelId,lot.door.approach),'Approche réelle à70u du seuil peint, corps48×28.');
  check('BUILDING_SERVICE_ZONE_VALID',lot.buildingId,lot.levelId,lot.districtId,lot.service,!!lot.interior&&lot.parcel.top<lot.service.y&&lot.parcel.bottom>lot.service.y,'Le revers appartient à la même parcelle et la pièce existante conserve son ID.');
  for(const [i,point] of lot.footprint.entries())check('BUILDING_SUPPORTED',lot.buildingId+':contact-'+i,lot.levelId,lot.districtId,point,homeworldUrbanTerrainV78(lot.levelId,point,{halfWidth:0,halfDepth:0}),'Contact de la fondation native conservée.');
  for(const prop of HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.levelId===lot.levelId))check('DOOR_APPROACH_CLEAR',lot.buildingId,lot.levelId,lot.districtId,lot.door.threshold,!homeworldUrbanOverlapV78(lot.approachPolygon,prop.polygon),'Porte et128u de profondeur protégés.',prop.id,homeworldEnvelopeDistanceV81(homeworldEnvelopeBoundsV81(lot.approachPolygon),prop.physical),0);
 }
 for(let i=0;i<HOMEWORLD_BUILDINGS_V77.length;i++)for(let j=i+1;j<HOMEWORLD_BUILDINGS_V77.length;j++){
  const a=HOMEWORLD_BUILDINGS_V77[i],b=HOMEWORLD_BUILDINGS_V77[j];if(a.levelId!==b.levelId)continue;
  check('BUILDING_SEPARATION',a.id,a.levelId,a.districtId,a,!homeworldBuildingFootprintsOverlapV76(a,b),'Footprints natifs complets sur le même étage.',b.id,homeworldEnvelopeDistanceV81(homeworldEnvelopeBoundsV81(homeworldBuildingGroundFrameV76(a).polygon),homeworldEnvelopeBoundsV81(homeworldBuildingGroundFrameV76(b).polygon)),0);
  if(a.districtId===b.districtId&&Math.hypot(a.x-b.x,a.y-b.y)<900)check('BUILDING_REPETITION_LIMIT',a.id,a.levelId,a.districtId,a,a.art.src!==b.art.src||Math.abs(a.width-b.width)>40,'Silhouette et dimensions des voisins.',b.id);
 }
 for(const prop of HOMEWORLD_USAGE_OBJECTS_V81){
  const allowed=HOMEWORLD_DISTRICT_GRAMMAR_V81[prop.districtId]?.functions??[];
  check('PROP_ROLE_MATCHES_DISTRICT',prop.id,prop.levelId,prop.districtId,prop,prop.role.structural||allowed.includes(prop.role.function),'Fonction '+prop.role.function+' ; motif '+prop.purpose+'.');
  if(prop.usage){
   const usage=prop.usage,rule=prop.role.family==='bench'?'BENCH_USE_ZONE_CLEAR':prop.role.family==='market'?'STALL_CUSTOMER_ZONE_CLEAR':prop.role.family==='forge'?'FORGE_SAFETY_ZONE_CLEAR':prop.role.family==='cargo'?'CARGO_LOADING_ZONE_CLEAR':'USAGE_SUPPORTED';
   for(const other of HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p!==prop&&p.levelId===prop.levelId))check(rule,prop.id,prop.levelId,prop.districtId,prop,!homeworldEnvelopesOverlapV81(usage,other.physical),'Espace d’usage distinct du contact voisin.',other.id,homeworldEnvelopeDistanceV81(usage,other.physical),0);
   for(const [i,point] of [{x:usage.left+24,y:usage.top+14},{x:usage.right-24,y:usage.top+14},{x:usage.left+24,y:usage.bottom-14},{x:usage.right-24,y:usage.bottom-14},{x:(usage.left+usage.right)/2,y:(usage.top+usage.bottom)/2}].entries())check('USAGE_SUPPORTED',prop.id+':use-'+i,prop.levelId,prop.districtId,point,homeworldUrbanTerrainV78(prop.levelId,point)&&!homeworldCollisionV77(prop.levelId,point),'Corps48×28 posé dans l’espace nécessaire à l’activité.');
  }
  if(prop.role.family==='barrier')check('BARRIER_CONTINUITY',prop.id,prop.levelId,prop.districtId,prop,HOMEWORLD_BUILDING_LOTS_V81.some(b=>b.levelId===prop.levelId&&homeworldEnvelopeDistanceV81(prop.physical,homeworldEnvelopeBoundsV81(b.footprint))<96),'Module de soutènement proche de son appui ; barrière énergétique complète non affirmée.');
 }
 for(const r of [...HOMEWORLD_RESIDENTS_V77,...HOMEWORLD_URBAN_EXTRAS_V78])for(let s=1;s<r.path.length;s++){
  const polygon=homeworldUrbanCorridorV78(r.path[s-1],r.path[s],36,26);
  for(const prop of HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.levelId===r.levelId))check('NPC_SOCIAL_ZONE_CLEAR',r.id+':segment-'+s,r.levelId,r.districtId,r.path[s-1],!homeworldUrbanOverlapV78(polygon,prop.polygon),'Région balayée par le corps PNJ complet sur le segment.',prop.id);
 }
 for(const c of HOMEWORLD_CONNECTORS_V77)for(const [i,s] of [c.from,c.to].entries())for(const prop of HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.levelId===s.levelId))check('BARRIER_GATE_CLEAR',c.id+':socket-'+i,s.levelId,'connector',s.point,!homeworldUrbanOverlapV78(homeworldUrbanRectV78(s.point.x-96,s.point.y-108,s.point.x+96,s.point.y+108),prop.polygon),'Palier du raccord et dégagement de virage.',prop.id);
 for(const street of HOMEWORLD_URBAN_STREETS_V78)for(const point of street.nodes.slice(1,-1))for(const prop of HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.levelId===street.levelId))check('INTERSECTION_SIGHT_CLEAR',street.id+':'+point.x+':'+point.y,street.levelId,'undercity',point,!homeworldEnvelopesOverlapV81({left:point.x-60,right:point.x+60,top:point.y-60,bottom:point.y+60},prop.physical),'Centre du virage protégé ; périphérie de l’intersection gardée lisible.',prop.id,Math.hypot(point.x-prop.x,point.y-prop.y),60);
 for(const court of HOMEWORLD_AUTHORED_COURTS_V81){
  const placed=HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.clusterId==='urban-v81:'+court.id);
  const triples=placed.flatMap((a,i)=>placed.slice(i+1).flatMap((b,j)=>placed.slice(i+j+2).map(c=>[a,b,c])));
  check('GRID_ALIGNMENT_DETECTION',court.id,court.levelId,court.districtId,court,court.props.length!==4||new Set(court.props.map(p=>p.y)).size>2,'Recette spécifique '+court.composition+' ; '+placed.length+' objets réellement retenus.');
  for(const three of triples)check('COLLINEAR_CLUSTER_DETECTION',court.id,court.levelId,court.districtId,court,Math.max(...three.map(p=>p.x))-Math.min(...three.map(p=>p.x))>16&&Math.max(...three.map(p=>p.y))-Math.min(...three.map(p=>p.y))>16,'Pas de baseline pour trois familles différentes.',three.map(p=>p.id).join('|'));
 }
 for(const districtId of Object.keys(HOMEWORLD_DISTRICT_GRAMMAR_V81)){
  const visible=HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.districtId===districtId);
  for(const p of visible){const similar=visible.filter(q=>q!==p&&q.asset===p.asset&&q.levelId===p.levelId&&Math.abs(p.x-q.x)<1000&&Math.abs(p.y-q.y)<700);
   check('IDENTICAL_PROP_REPETITION_LIMIT',p.id,p.levelId,districtId,p,p.role.structural||similar.length<2,'Copies reconnaissables dans une fenêtre1000×700.',similar.map(q=>q.id).join('|')||null,similar.length,1);
  }
 }
 for(const id of ['throne-audience','rite-sanctum']){const lot=HOMEWORLD_BUILDING_LOTS_V81.find(b=>b.buildingId===id)!;
  const corridor=homeworldUrbanCorridorV78(lot.door.threshold,{x:lot.door.threshold.x,y:lot.door.threshold.y+400},72,24);
  for(const p of HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.levelId===lot.levelId))check('LANDMARK_VIEW_CORRIDOR_CLEAR',id,lot.levelId,lot.districtId,lot.door.threshold,!homeworldUrbanOverlapV78(corridor,p.polygon),'Respiration axiale du landmark ; ne prouve pas à elle seule les pixels du panorama.',p.id);
 }
 // Every preserved original solid is inventoried too. Its former conservative
 // collider is not passed off as new native-facing metrology. The remaining
 // migrated-use issues are explicit warnings requiring replacement/placement,
 // rather than hidden by a global PASS for the recompilable subset.
 for(const prop of HOMEWORLD_LEGACY_USAGE_OBJECTS_V81){
  for(const lot of HOMEWORLD_BUILDING_LOTS_V81.filter(l=>l.levelId===prop.levelId))check('DOOR_APPROACH_CLEAR',prop.id,prop.levelId,lot.districtId,prop,!homeworldUrbanOverlapV78(lot.approachPolygon,homeworldUrbanRectV78(prop.physical.left,prop.physical.top,prop.physical.right,prop.physical.bottom)),'Volume historique face au nouveau dégagement128u ; migration restante signalée.',lot.buildingId,null,128,'warning');
  if(prop.usage){for(const other of [...HOMEWORLD_LEGACY_USAGE_OBJECTS_V81,...HOMEWORLD_USAGE_OBJECTS_V81].filter(p=>p.id!==prop.id&&p.levelId===prop.levelId))check(prop.role.family==='bench'?'BENCH_USE_ZONE_CLEAR':'USAGE_SUPPORTED',prop.id,prop.levelId,'legacy',prop,!homeworldEnvelopesOverlapV81(prop.usage,other.physical),'Enveloppe fonctionnelle historique : orientation native à confirmer avant remplacement.',other.id,homeworldEnvelopeDistanceV81(prop.usage,other.physical),0,'warning');}
 }
 const violations=assertions.filter(a=>!a.passed),errors=violations.filter(a=>a.severity==='error'||a.severity==='fatal');
 return{revision:81,assertionCount:assertions.length,assertions,violations,errors,
  counts:{buildings:HOMEWORLD_BUILDING_LOTS_V81.length,buildingsMoved:HOMEWORLD_BUILDING_LOTS_V81.filter(b=>b.classification==='MOVE').length,buildingsNeedingArt:HOMEWORLD_BUILDING_LOTS_V81.filter(b=>b.frontage==='NATIVE_FRONTAL').length,
   props:HOMEWORLD_USAGE_OBJECTS_V81.length+HOMEWORLD_LEGACY_USAGE_OBJECTS_V81.length,recomposedProps:HOMEWORLD_USAGE_OBJECTS_V81.length,legacySolids:HOMEWORLD_LEGACY_USAGE_OBJECTS_V81.length,civicCandidates:HOMEWORLD_CIVIC_PROPS_V80.length+HOMEWORLD_CIVIC_REFUSALS_V80.length,urbanCandidates:HOMEWORLD_URBAN_PROPS_V78.length+HOMEWORLD_URBAN_PROP_REJECTIONS_V78.length,refusedCivic:HOMEWORLD_CIVIC_REFUSALS_V80.length,refusedUrban:HOMEWORLD_URBAN_PROP_REJECTIONS_V78.length,uniqueAssets:new Set(HOMEWORLD_USAGE_OBJECTS_V81.map(p=>p.asset)).size,authoredCourts:HOMEWORLD_AUTHORED_COURTS_V81.length,groundPolygons:HOMEWORLD_GROUND_V77.length,
   regions:HOMEWORLD_CONNECTIONS_V77.length,regionPoints:HOMEWORLD_POINTS_V77.filter(p=>p.regionId).length,sceneryFacades:HOMEWORLD_URBAN_FACADES_V78.length},
  limitations:['Contraintes évaluées et captures réelles sont des preuves distinctes.','Les anciens meubles V64/V72/V76 restent conservés : le présent audit dur couvre les placements recompilés, les accès et routines ; leur remplacement progressif demeure nécessaire.','Les silhouettes frontales encore présentes sont explicitement classées NEW_ART_VARIANT.','Ce plan local est une adaptation originale compatible avec le lore, pas une carte canonique1:1.']};
}
export function homeworldPlacementObjectV81(id:string){return HOMEWORLD_USAGE_OBJECTS_V81.find(p=>p.id===id)??HOMEWORLD_BUILDING_LOTS_V81.find(p=>p.buildingId===id)??null;}
