import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_GROUND_V77,HOMEWORLD_POINTS_V77,HOMEWORLD_CONNECTORS_V77,HOMEWORLD_LEVELS_V77,
 HOMEWORLD_REGIONAL_DOCKS_V77,homeworldDistrictLevelV77,homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_COUNCIL_STAIR_ART_V77,homeworldCouncilStairPlacementV77,homeworldCouncilStairRailsV77} from './homeworldConnectorArtV77';
import {HOMEWORLD_DISTRICTS,HOMEWORLD_STREETS} from './homeworldCity';
import {HOMEWORLD_GROUND_ART_V64} from './homeworldArtV64';
import {HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81,HOMEWORLD_LEGACY_EXTERIOR_PLACEMENTS_V82,HOMEWORLD_LEGACY_FRONTAGE_PLACEMENTS_V82} from './homeworldLegacyPlacementsV81';
import {HOMEWORLD_RETAINING_SUPPORTS_V82,HOMEWORLD_RETAINING_ASSEMBLIES_V82} from './homeworldRetainingAssembliesV82';
/** This transforms aggregate records after assembly, without importing the
 * aggregate itself. Local room coordinates and immutable source art survive. */
export function homeworldRecordPlacementV77<T extends HomeworldElementRecordV64>(record:T):T|null{
 if(record.spaceId!=='world')return record;
 const region=record.districtId.startsWith('connection:')?record.districtId.slice(11):null;
 if(region&&['leviathan-coast','thermal-caves'].includes(region))return null;
 const district=region?HOMEWORLD_POINTS_V77.find(p=>p.regionId===region)?.districtId??'':record.districtId;
 const sourceGround=HOMEWORLD_GROUND_V77.find(g=>record.id==='street:'+g.id||record.id==='floor:'+g.id);
 const point=HOMEWORLD_POINTS_V77.find(p=>record.id===p.id||record.id==='point:'+p.id||record.id==='station:'+p.id||record.id==='region:'+p.regionId);
 const propId=record.id.replace(/^prop:/,''),relocation=HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81[propId]??HOMEWORLD_LEGACY_EXTERIOR_PLACEMENTS_V82[propId]??HOMEWORLD_LEGACY_FRONTAGE_PLACEMENTS_V82[propId];
 const levelId=point?.levelId??sourceGround?.levelId??homeworldDistrictLevelV77(district),dx=relocation?relocation.x-record.position.x:point?point.x-record.position.x:sourceGround?Math.min(...sourceGround.polygon.map(p=>p.x))-record.position.x:district==='port'?6500:0,dy=relocation?relocation.y-record.position.y:point?point.y-record.position.y:sourceGround?Math.min(...sourceGround.polygon.map(p=>p.y))-record.position.y:0;
 const move=(p:{x:number;y:number})=>({...p,x:p.x+dx,y:p.y+dy}),box=record.footprint;
 const building=HOMEWORLD_BUILDINGS_V77.find(b=>record.id===b.id||record.id==='door:'+b.id);
 return{...record,position:{...move(record.position),z:record.position.z+homeworldLevelV77(building?.levelId??levelId).elevation},
  footprint:box?{...box,left:box.left+dx,right:box.right+dx,top:box.top+dy,bottom:box.bottom+dy,polygon:box.polygon?.map(move),
   ...('doorLeft'in box&&typeof box.doorLeft==='number'?{doorLeft:box.doorLeft+dx}:{}),...('doorRight'in box&&typeof box.doorRight==='number'?{doorRight:box.doorRight+dx}:{}),...('thresholdFront'in box&&typeof box.thresholdFront==='number'?{thresholdFront:box.thresholdFront+dy}:{})}:null,
  door:record.door?{...record.door,threshold:move(record.door.threshold),approach:move(record.door.approach),groundOpening:record.door.groundOpening?{left:move(record.door.groundOpening.left),right:move(record.door.groundOpening.right)}:undefined}:null,
  ...('associatedElementIds'in record&&Array.isArray(record.associatedElementIds)?{associatedElementIds:record.associatedElementIds.map((id:string)=>{const match=id.match(/^(?:gateway|connection-(?:door|floor)|direction|street:connection)-v72:(leviathan-coast|thermal-caves)(?::.*)?$/);return match?'dock-v77:'+match[1]:id;}).filter((id:string,index:number,ids:string[])=>ids.indexOf(id)===index)}:{}),
  constraints:[...record.constraints,`Implantation V77 au niveau ${building?.levelId??levelId}, Z ${homeworldLevelV77(building?.levelId??levelId).elevation}. Collision et caméra utilisent ce même niveau physique.`,
   ...(relocation?[`Implantation authored V82 : ${relocation.reason} Source, ID, dimensions et collision conservés ; ce nouveau lot n’a pas été vérifié.`]:district==='port'&&dx?['Spatioport déplacé avec son quai, sa navette, ses portes et ses habitants de +6500 en X ; aucun bitmap modifié ni miroité.']:[])]};
}
const base={spaceId:'world',districtId:'',dimensions:{width:0,depth:0,height:0},footprint:null,door:null,lore:'original-adaptation' as const,source:[],asset:null};
type WorldRecordV77=HomeworldElementRecordV64&{associatedElementIds?:readonly string[]};
const council=HOMEWORLD_CONNECTORS_V77.find(c=>c.id==='council-stair')!;
const councilFrom={...council.from,elevation:homeworldLevelV77(council.from.levelId).elevation},councilTo={...council.to,elevation:homeworldLevelV77(council.to.levelId).elevation};
const councilPaint=homeworldCouncilStairPlacementV77(councilFrom,councilTo),councilArt=HOMEWORLD_COUNCIL_STAIR_ART_V77;
const oldGroundIds=new Set([...HOMEWORLD_DISTRICTS,...HOMEWORLD_STREETS].map(g=>g.id));
const newGroundRecords:WorldRecordV77[]=HOMEWORLD_GROUND_V77.filter(g=>!oldGroundIds.has(g.id)).map(ground=>{
 const xs=ground.polygon.map(p=>p.x),ys=ground.polygon.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 return{...base,id:'ground-v77:'+ground.id,label:String('label'in ground?ground.label:ground.id),category:'floor',position:{x:left,y:top,z:homeworldLevelV77(ground.levelId).elevation},
  dimensions:{width:right-left,depth:bottom-top,height:0},footprint:{left,right,top,bottom,polygon:ground.polygon},asset:HOMEWORLD_GROUND_ART_V64.src,
  associatedElementIds:['floor-level-v77:'+ground.levelId,...(ground.id.startsWith('council-stair')?['connector-v77:council-stair']:[])],
  constraints:[`Terrain réel ${ground.id}, niveau ${ground.levelId}. Polygone directement repris du modèle joué ; la boîte ne remplace pas sa forme.`,
   'Dallage natif projeté une seule fois ; support vérifié sur tout le corps, volumes de bâtiments/props conservés.',
   'La fiche ne crée aucune collision ni accès ; les mêmes sols sont utilisés par le mouvement, la carte et les routes.',
   ...(ground.id.startsWith('resident-terrace:')?['Terrasse du parcours civil existant ; elle explicite son étage sans déplacer ni inventer sa routine.']:[]) ]};
});
export const HOMEWORLD_COUNCIL_SUPPORT_CODEX_V77:readonly WorldRecordV77[]=[
 ...[councilFrom,councilTo].map((side,index)=>({...base,id:'council-landing-v77:'+index,label:index?'Palier supérieur natif du Conseil':'Palier inférieur natif du Conseil',category:'floor' as const,
  position:{...side.point,z:side.elevation},dimensions:{width:676,depth:216,height:0},footprint:{left:side.point.x-338,right:side.point.x+338,top:side.point.y-108,bottom:side.point.y+108},asset:HOMEWORLD_GROUND_ART_V64.src,
  associatedElementIds:['connector-v77:council-stair','floor-level-v77:'+side.levelId,'ground-v77:'+(index?'council-stair-upper-terrace:0':'council-stair-lower-landing')],
  constraints:[`Socket source ${index?councilArt.upperSocket.x:councilArt.lowerSocket.x} ; ${index?councilArt.upperSocket.y:councilArt.lowerSocket.y}. Alignement natif uniforme sans rotation ni étirement.`,
   'Support utile660×200 et bordure réelle8u ; palier676×216 repris de la surface pavée existante, aucun terrain additionnel.',
   'Les rails ont leurs propres fiches solides ; toute la largeur du palier demeure un sol de soutien.',
   'Implantation corrigée hors des silhouettes complètes des bâtiments0/+1 ; les premières captures rejetées restent conservées.']})),
 ...homeworldCouncilStairRailsV77(councilFrom,councilTo).map(rail=>({...base,id:rail.id,label:'Rail natif de palier · '+rail.id.split(':').slice(1).join(' · '),category:'prop' as const,
  position:{x:(rail.left+rail.right)/2,y:rail.bottom,z:homeworldLevelV77(rail.levelId as Parameters<typeof homeworldLevelV77>[0]).elevation},
  dimensions:{width:rail.right-rail.left,depth:rail.bottom-rail.top,height:0},footprint:{left:rail.left,right:rail.right,top:rail.top,bottom:rail.bottom},asset:councilArt.src,
  associatedElementIds:['connector-v77:council-stair','council-landing-v77:'+rail.id.split(':')[1]],
  constraints:['Empreinte solide26×84 issue exactement du même modèle de collision que le moteur.',
   'Rail peint dans la source de l’escalier ; ce n’est pas un nouveau PNG ou un meuble ajouté.',
   'Les dimensions renseignent la collision au sol ; hauteur3D du garde-corps non calibrée, aucune valeur inventée.',
   'Sépare le couloir praticable du bord de palier sans réduire le corps du chasseur.']})),
];
export const HOMEWORLD_WORLD_CODEX_V77:readonly WorldRecordV77[]=[
 ...HOMEWORLD_RETAINING_ASSEMBLIES_V82.map(assembly=>{
  const supports=HOMEWORLD_RETAINING_SUPPORTS_V82.filter(s=>s.assemblyId===assembly.id),points=[...assembly.nativeContacts,...supports.flatMap(s=>s.polygon)];
  const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
  return{...base,id:assembly.id,label:assembly.label,category:'prop' as const,districtId:'undercity',
   position:{x:(left+right)/2,y:bottom,z:homeworldLevelV77(assembly.levelId).elevation},
   dimensions:{width:right-left,depth:bottom-top,height:Math.max(...supports.map(s=>s.height))},
   associatedElementIds:[assembly.ownerId,...supports.map(s=>s.id)],constraints:[assembly.function,
    'Groupe descriptif du mur natif et de ses deux piédroits déjà présents ; aucune nouvelle surface solide, aucun collider rectangulaire ou PNG ajouté.',
    'Les dimensions décrivent l’étendue des contacts et des piédroits. Chaque membre conserve son propre polygone physique, sa source et ses mesures.',
    'Architecture originale compatible avec la ville du jeu ; aucun service, accès ou gain de progression ajouté.']};
 }),
 ...HOMEWORLD_RETAINING_SUPPORTS_V82.map(s=>({...base,id:s.id,label:s.label,category:'prop' as const,districtId:'undercity',
  position:{x:(Math.min(...s.polygon.map(p=>p.x))+Math.max(...s.polygon.map(p=>p.x)))/2,y:Math.max(...s.polygon.map(p=>p.y)),z:homeworldLevelV77(s.levelId).elevation},
  dimensions:{width:Math.max(...s.polygon.map(p=>p.x))-Math.min(...s.polygon.map(p=>p.x)),depth:Math.max(...s.polygon.map(p=>p.y))-Math.min(...s.polygon.map(p=>p.y)),height:s.height},
  footprint:{left:Math.min(...s.polygon.map(p=>p.x)),right:Math.max(...s.polygon.map(p=>p.x)),top:Math.min(...s.polygon.map(p=>p.y)),bottom:Math.max(...s.polygon.map(p=>p.y)),polygon:s.polygon},
  associatedElementIds:[s.ownerId,s.assemblyId],constraints:[s.provenance+' ; '+s.nativeStatus+'. Piédroit maçonné original, pas un nouveau PNG.',
   HOMEWORLD_RETAINING_ASSEMBLIES_V82.find(a=>a.id===s.assemblyId)!.function,
   'Le même polygone plein est projeté pour le rendu et utilisé pour la collision sur cet étage.',
   'Joint uniquement avec son propre mur ; aucune réduction du collider natif ou du corps du joueur.',
   'Nouveau lot V82 non validé : aucun test, audit, lint ou contrôle visuel exécuté après modification.']})),
 ...HOMEWORLD_LEVELS_V77.map(level=>({...base,id:'floor-level-v77:'+level.id,label:level.name,category:'floor' as const,position:{x:0,y:0,z:level.elevation},constraints:[`Niveau physique ${level.id}. Les interactions et collisions des autres niveaux sont exclues.`,`Zoom de la caméra ${level.zoom}, interpolation continue pendant les raccords.`,`Les cartes ChatGPT sont des concepts d’implantation originaux, jamais des dimensions canoniques.`]})),
 ...HOMEWORLD_CONNECTORS_V77.map(c=>({...base,id:'connector-v77:'+c.id,label:c.name,category:'door' as const,position:{...c.from.point,z:homeworldLevelV77(c.from.levelId).elevation},asset:c.id==='council-stair'?HOMEWORLD_COUNCIL_STAIR_ART_V77.src:null,
  source:c.id==='council-stair'?[{label:'Escalier natif OpenAI · paliers mesurés',url:HOMEWORLD_COUNCIL_STAIR_ART_V77.src,note:'SHA256 '+HOMEWORLD_COUNCIL_STAIR_ART_V77.sha256}]:[],
  dimensions:{width:c.id==='council-stair'?councilPaint.painted.width:110,depth:Math.hypot(c.to.point.x-c.from.point.x,c.to.point.y-c.from.point.y),height:Math.abs(homeworldLevelV77(c.to.levelId).elevation-homeworldLevelV77(c.from.levelId).elevation)},
  associatedElementIds:c.id==='council-stair'?HOMEWORLD_COUNCIL_SUPPORT_CODEX_V77.map(r=>r.id):[],
  constraints:[`Palier ${c.from.levelId} (${c.from.point.x},${c.from.point.y}) ↔ ${c.to.levelId} (${c.to.point.x},${c.to.point.y}).`,`Départ uniquement à pied dans un rayon de38 ; trajet continu de ${c.duration}s ; pause et perte de focus figent le déplacement.`,
   ...(c.id==='council-stair'?[`Largeur alpha native ${councilPaint.painted.width}u, silhouette projetée ${councilPaint.painted.height}u. Différence d’étage520u, appuis676×216, couloir peint ${(councilArt.walkBounds.right-councilArt.walkBounds.left)*councilPaint.scale}u ; grande boîte de collision trans-étage interdite.`]:[]),
   c.id==='council-stair'?'PNG natif aligné aux deux centres de palier par une seule échelle uniforme. Rails de palier solides ; appuis complets et sources vérifiés. Mesure visuelle, aucune calibration3D ou copie canonique1:1.':`Géométrie intégrée et appuis contrôlés avec le corps entier. Images natives de ${c.kind} et supports verticaux encore manquants ; aucune reproduction1:1 revendiquée.`]})),
 ...newGroundRecords,...HOMEWORLD_COUNCIL_SUPPORT_CODEX_V77,
 ...HOMEWORLD_REGIONAL_DOCKS_V77.map(d=>({...base,id:'dock-v77:'+d.regionId,label:d.name,category:'door' as const,position:{...d.point,z:0},constraints:[`Région existante ${d.regionId}, aucun nouveau déblocage ni point de progression.`,`Côte à gauche ; départ du canyon volcanique en bas à gauche.`,d.kind==='skiff'?'Trajet progressif du skiff12s ; deux statues natives et appareil fixe présents, passeur civil réutilisé. Aucun clip animé dédié au bateau ou au passeur.':'Départ au terme d’un sentier réellement parcourable.']})),
];
