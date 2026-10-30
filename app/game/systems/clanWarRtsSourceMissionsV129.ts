import type {WarRulesV6} from "./clanWarBibleV6";
import {
 createWarMapPracticeV128, commandWarMapPracticeV128, warMapFindPathV128,
 warMapLineOfSightV128, warMapWalkableV128, type WarMapActorV128, type WarMapPointV128, type WarMapPracticeV128,
 type WarMissionMapActionV128, type WarMapReportV128,
} from "./clanWarSourceMapsV128";

/**
 * 24 RTS W3 source-brief adapted to the V128 interactive traversal prototype.
 * 24 different physical mission scripts are playable as a single-hunter
 * exercise. This is NOT the full unit-command RTS engine, nor canonical film
 * event data, and never writes to permanent campaign saves.
 *
 * All source names, objective and victory texts are read from the W3 workbook.
 * Every additional task is a GAME-AUTHORED implementation of those source
 * instructions; its tile positions are studies, not film/planet GIS geometry.
 */
export type WarRtsMissionIdV129 =
 "W3-RTS01"|"W3-RTS02"|"W3-RTS03"|"W3-RTS04"|"W3-RTS05"|"W3-RTS06"|
 "W3-RTS07"|"W3-RTS08"|"W3-RTS09"|"W3-RTS10"|"W3-RTS11"|"W3-RTS12"|
 "W3-RTS13"|"W3-RTS14"|"W3-RTS15"|"W3-RTS16"|"W3-RTS17"|"W3-RTS18"|
 "W3-RTS19"|"W3-RTS20"|"W3-RTS21"|"W3-RTS22"|"W3-RTS23"|"W3-RTS24";
export type WarRtsStepKindV129 =
 "scout"|"hold"|"repair"|"disable"|"recover"|"secure"|"protect"|"track"|
 "rescue"|"route"|"signal"|"seal"|"identify"|"stabilize"|"transfer"|"install";
export type WarRtsEscortKindV129 = "wounded-ally"|"survivor-team"|"witness"|"heavy-cargo"|"beacon"|"equipment";
export interface WarRtsTaskSpecV129 {
 title:string;kind:WarRtsStepKindV129;
 holdTurns?:number;requiresPower?:boolean;requiresPressure?:boolean;
 requiresWindow?:"low-tide"|"clear-wind"|"stable-ice"|"cool-jets";
}
interface MissionRecipeV129{
 steps:readonly [WarRtsTaskSpecV129,WarRtsTaskSpecV129,WarRtsTaskSpecV129];
 escortKind?:WarRtsEscortKindV129;
 /**
  * Source-appropriate game design role suggestions, not proof that players
  * recruited/own such squads, and no implication that a film has these NPCs.
  */
 suggestedV6Units:readonly string[];
}
/** The three stages reference, respectively, the entrance/route, cover/secondary
 * node and the map's recorded objective landmark. Third step occurs at goal.
 */
const RECIPES:Record<WarRtsMissionIdV129,MissionRecipeV129>={
 "W3-RTS01":{steps:[
  {title:"Reconnaître le guet principal",kind:"scout"},
  {title:"Faire progresser les porteurs avec leur charge identifiée",kind:"transfer"},
  {title:"Sécuriser la tête de pont pour une sortie réelle",kind:"secure"},
 ],escortKind:"heavy-cargo",suggestedV6Units:["W3-U01","W3-U19","W3-U07"]},
 "W3-RTS02":{steps:[
  {title:"Reconnaître les approches du sommet",kind:"scout"},
  {title:"Installer le marqueur de relève derrière le couvert",kind:"signal"},
  {title:"Conserver le poste jusqu'à la relève",kind:"hold",holdTurns:3},
 ],suggestedV6Units:["W3-U07","W3-U02","W3-U28"]},
 "W3-RTS03":{steps:[
  {title:"Reconnaître la digue et la galerie",kind:"scout"},
  {title:"Acheminer un régulateur aux artisans",kind:"transfer"},
  {title:"Remettre le filtre en service et le vérifier",kind:"repair",requiresPower:true},
 ],escortKind:"equipment",suggestedV6Units:["W3-U19","W3-U20","W3-U10"]},
 "W3-RTS04":{steps:[
  {title:"Examiner les variations de vapeur",kind:"scout"},
  {title:"Protéger le levier du circuit",kind:"protect"},
  {title:"Tenir le filtre en activité sous attaque",kind:"hold",holdTurns:3,requiresPower:true},
 ],suggestedV6Units:["W3-U07","W3-U20","W3-U16"]},
 "W3-RTS05":{steps:[
  {title:"Repérer les traces du porteur dans les cratères",kind:"track"},
  {title:"Identifier et récupérer la vraie balise",kind:"recover"},
  {title:"Sécuriser le couloir de retour de la balise",kind:"route"},
 ],escortKind:"beacon",suggestedV6Units:["W3-U01","W3-U04","W3-U21"]},
 "W3-RTS06":{steps:[
  {title:"Reconnaître la crête malgré le vent",kind:"scout"},
  {title:"Rejoindre les membres isolés",kind:"rescue"},
  {title:"Ouvrir la ligne de repli de l'équipe",kind:"route"},
 ],escortKind:"survivor-team",suggestedV6Units:["W3-U02","W3-U17","W3-U07"]},
 "W3-RTS07":{steps:[
  {title:"Relever les connexions de l'émetteur hostile",kind:"scout"},
  {title:"Isoler l'opérateur sans détruire l'indice",kind:"disable"},
  {title:"Désactiver l'émission et préserver le boîtier",kind:"recover"},
 ],suggestedV6Units:["W3-U05","W3-U20","W3-U13"]},
 "W3-RTS08":{steps:[
  {title:"Marquer les issues avant l'effondrement",kind:"scout"},
  {title:"Ramener une équipe et les pièces identifiées",kind:"rescue"},
  {title:"Sécuriser le dernier passage de la cour",kind:"secure"},
 ],escortKind:"survivor-team",suggestedV6Units:["W3-U17","W3-U19","W3-U06"]},
 "W3-RTS09":{steps:[
  {title:"Vérifier un ancrage de canopée",kind:"scout"},
  {title:"Rejoindre l'équipe séparée parmi les racines",kind:"rescue"},
  {title:"Ouvrir le retour par la clairière",kind:"route"},
 ],escortKind:"survivor-team",suggestedV6Units:["W3-U12","W3-U17","W3-U05"]},
 "W3-RTS10":{steps:[
  {title:"Observer la proie sans lancer de guerre générale",kind:"scout"},
  {title:"Retirer le piège bloquant le corridor de retraite",kind:"disable"},
  {title:"Maintenir la ligne de retrait ou l'issue du duel",kind:"hold",holdTurns:2},
 ],suggestedV6Units:["W3-U01","W3-U07","W3-U08"]},
 "W3-RTS11":{steps:[
  {title:"Identifier les traces humaines et la piste adverse",kind:"identify"},
  {title:"Éloigner le piège de la voie des voyageurs",kind:"disable"},
  {title:"Tenir l'embuscade hors du couloir des neutres",kind:"hold",holdTurns:2},
 ],suggestedV6Units:["W3-U01","W3-U05","W3-U16"]},
 "W3-RTS12":{steps:[
  {title:"Reconnaître le gué et la limite du pont",kind:"scout"},
  {title:"Guider le second groupe par son accès compatible",kind:"transfer"},
  {title:"Réunir les deux détachements au passage",kind:"secure"},
 ],escortKind:"survivor-team",suggestedV6Units:["W3-U06","W3-U19","W3-U25"]},
 "W3-RTS13":{steps:[
  {title:"Reconnaître le quai avant le flot",kind:"scout"},
  {title:"Prendre le mécanisme ouvrant la fenêtre d'accès",kind:"secure",requiresWindow:"low-tide"},
  {title:"Tenir le levier pendant le débarquement",kind:"hold",holdTurns:2},
 ],suggestedV6Units:["W3-U25","W3-U07","W3-U26"]},
 "W3-RTS14":{steps:[
  {title:"Repérer le treuil et les appuis de quai",kind:"scout"},
  {title:"Charger la caisse lourde sans duplication",kind:"transfer",requiresWindow:"low-tide"},
  {title:"Assurer la voie de remontée du lot transporté",kind:"secure"},
 ],escortKind:"heavy-cargo",suggestedV6Units:["W3-U19","W3-U20","W3-U07"]},
 "W3-RTS15":{steps:[
  {title:"Observer le phare sous les rafales",kind:"scout"},
  {title:"Neutraliser l'optique du faux signal",kind:"disable"},
  {title:"Confirmer le silence du signal trompeur",kind:"secure"},
 ],suggestedV6Units:["W3-U02","W3-U05","W3-U13"]},
 "W3-RTS16":{steps:[
  {title:"Examiner les deux pitons et les transports en route",kind:"scout"},
  {title:"Allumer le premier feu de retour",kind:"signal",requiresWindow:"clear-wind"},
  {title:"Garder le second repère jusqu'à l'arrivée",kind:"hold",holdTurns:3},
 ],suggestedV6Units:["W3-U06","W3-U20","W3-U07"]},
 "W3-RTS17":{steps:[
  {title:"Tester la tenue des plaques de glace",kind:"scout"},
  {title:"Dégager les porteurs du convoi immobilisé",kind:"rescue",requiresWindow:"stable-ice"},
  {title:"Stabiliser la retraite sur les appuis sûrs",kind:"route"},
 ],escortKind:"wounded-ally",suggestedV6Units:["W3-U24","W3-U17","W3-U19"]},
 "W3-RTS18":{steps:[
  {title:"Vérifier les accès du refuge et les lignes ennemies",kind:"scout"},
  {title:"Récupérer les blessés avant le nouveau souffle",kind:"rescue"},
  {title:"Tenir l'issue jusqu'à la fenêtre de départ",kind:"hold",holdTurns:2},
 ],escortKind:"wounded-ally",suggestedV6Units:["W3-U07","W3-U17","W3-U28"]},
 "W3-RTS19":{steps:[
  {title:"Lire la pression des conduites chaudes",kind:"scout"},
  {title:"Fermer la vanne et dégager la pièce de passage",kind:"seal",requiresWindow:"cool-jets"},
  {title:"Ouvrir le circuit de chaleur jusqu'à la sortie",kind:"repair",requiresPower:true},
 ],suggestedV6Units:["W3-U20","W3-U19","W3-U07"]},
 "W3-RTS20":{steps:[
  {title:"Identifier le cordon de confinement à conserver",kind:"scout"},
  {title:"Évacuer l'équipe retenue dans le secteur chaud",kind:"rescue"},
  {title:"Sceller la dernière porte de confinement",kind:"seal",requiresPower:true,requiresWindow:"cool-jets"},
 ],escortKind:"survivor-team",suggestedV6Units:["W3-U27","W3-U17","W3-U20"]},
 "W3-RTS21":{steps:[
  {title:"Contrôler la capacité du palier et de l'ascenseur",kind:"scout"},
  {title:"Acheminer le relais par une rotation autorisée",kind:"transfer"},
  {title:"Installer le relais et tester sa liaison",kind:"install",requiresPower:true},
 ],escortKind:"heavy-cargo",suggestedV6Units:["W3-U19","W3-U20","W3-U12"]},
 "W3-RTS22":{steps:[
  {title:"Marquer les limites du mandat de coalition",kind:"scout"},
  {title:"Faire traverser le dernier groupe allié",kind:"rescue"},
  {title:"Garder le palier sans poursuivre hors du mandat",kind:"hold",holdTurns:3},
 ],escortKind:"survivor-team",suggestedV6Units:["W3-U07","W3-U28","W3-U29"]},
 "W3-RTS23":{steps:[
  {title:"Examiner la cloison du sas sans dépressuriser",kind:"scout"},
  {title:"Rejoindre le groupe d'abordage identifié",kind:"rescue"},
  {title:"Sécuriser l'accès à la coursive et au sas",kind:"secure",requiresPressure:true},
 ],escortKind:"survivor-team",suggestedV6Units:["W3-U26","W3-U27","W3-U17"]},
 "W3-RTS24":{steps:[
  {title:"Identifier les personnes et contenants récupérables",kind:"identify"},
  {title:"Libérer les témoins sans les enrôler comme troupes",kind:"rescue"},
  {title:"Inventorier les caisses physiquement transportables",kind:"recover",requiresPressure:true},
 ],escortKind:"witness",suggestedV6Units:["W3-U29","W3-U19","W3-U26"]},
};
/**
 * Source-informed ORIGINAL rival formations for the 24 W3 RTS exercises:
 * two scouts/guards on early missions, additional specialist squads later.
 * These are not canonical identified characters or a hidden V85 garrison.
 */
const OPPONENT_UNITS:Record<WarRtsMissionIdV129,readonly string[]>={
 "W3-RTS01":["W3-U13","W3-U07","W3-U05"],
 "W3-RTS02":["W3-U12","W3-U07","W3-U02"],
 "W3-RTS03":["W3-U07","W3-U13","W3-U16"],
 "W3-RTS04":["W3-U15","W3-U07","W3-U09"],
 "W3-RTS05":["W3-U04","W3-U01","W3-U13"],
 "W3-RTS06":["W3-U13","W3-U02","W3-U07"],
 "W3-RTS07":["W3-U05","W3-U07","W3-U13"],
 "W3-RTS08":["W3-U07","W3-U13","W3-U16"],
 "W3-RTS09":["W3-U12","W3-U05","W3-U13"],
 "W3-RTS10":["W3-U08","W3-U11","W3-U05"],
 "W3-RTS11":["W3-U01","W3-U09","W3-U07"],
 "W3-RTS12":["W3-U25","W3-U13","W3-U07"],
 "W3-RTS13":["W3-U25","W3-U07","W3-U09"],
 "W3-RTS14":["W3-U26","W3-U13","W3-U07"],
 "W3-RTS15":["W3-U13","W3-U05","W3-U09"],
 "W3-RTS16":["W3-U07","W3-U12","W3-U05"],
 "W3-RTS17":["W3-U24","W3-U07","W3-U13"],
 "W3-RTS18":["W3-U24","W3-U16","W3-U07"],
 "W3-RTS19":["W3-U20","W3-U09","W3-U07"],
 "W3-RTS20":["W3-U27","W3-U07","W3-U13"],
 "W3-RTS21":["W3-U12","W3-U14","W3-U07","W3-U20"],
 "W3-RTS22":["W3-U07","W3-U30","W3-U12","W3-U09"],
 "W3-RTS23":["W3-U26","W3-U27","W3-U13","W3-U07"],
 "W3-RTS24":["W3-U29","W3-U26","W3-U07","W3-U05"],
};
export const WAR_SOURCE_RTS_IDS_V129=Object.freeze(
 Array.from({length:24},(_,i)=>"W3-RTS"+String(i+1).padStart(2,"0")) as WarRtsMissionIdV129[]
);
const isId=(id:string):id is WarRtsMissionIdV129=>
 Object.prototype.hasOwnProperty.call(RECIPES,id);
const key=(point:WarMapPointV128)=>point.x+","+point.y;
const dist=(a:WarMapPointV128,b:WarMapPointV128)=>
 Math.abs(a.x-b.x)+Math.abs(a.y-b.y);

export interface WarRtsTaskV129 extends WarRtsTaskSpecV129 {
 id:string;location:WarMapPointV128;
 sourcedFrom:"I"|"K"|"L";
}
export interface WarRtsMissionV129 {
 id:WarRtsMissionIdV129;name:string;mapId:string;planetId:string;
 rank:string;sourceObjective:string;sourceDeployment:string;sourceConditions:string;
 sourceEnemyPlan:string;sourceAlternatives:string;sourceVictory:string;
 sourceReentry:string;sourceCampaignLink:string;sourceProvenance:string;
 sourceRewardXpDesign:number;sourceCells:string[];
 sourceRow:number;pcMaximum:number;initialRav:number;
 tasks:WarRtsTaskV129[];
 escortKind:WarRtsEscortKindV129|null;
 suggestedV6Units:string[];opponentUnitIds:string[];
 opponentTeams:number;opponentCombatants:number;opponentBudgetPc:number;
 status:"source-faithful-objective-study";
 playableEngine:"single-hunter-physical-simulation-not-full-rts";
}
export interface WarRtsTrackedEntityV129 extends WarMapPointV128 {
 id:string;kind:WarRtsEscortKindV129;hp:number;
 extracted:boolean;secured:boolean;heldByPlayer:boolean;
 isNeutral:boolean;
}
export interface WarRtsMissionStateV129 {
 version:129;mission:WarRtsMissionV129;base:WarMapPracticeV128;
 completedTaskIds:string[];holdProgress:number;
 tracked:WarRtsTrackedEntityV129|null;
 lastMessage:string;status:"active"|"victory"|"defeat"|"retreat";
}
export interface WarRtsMissionUpdateV129 {
 accepted:boolean;state:WarRtsMissionStateV129;message:string;
}
const failed=(state:WarRtsMissionStateV129,message:string):WarRtsMissionUpdateV129=>
 ({accepted:false,state,message});
const succeeded=(state:WarRtsMissionStateV129,message:string):WarRtsMissionUpdateV129=>
 ({accepted:true,state,message});
const field=(entry:WarRulesV6["entries"][number],column:string)=>
 String(entry.fields.find(f=>f.column===column)?.value??"").trim();
const sourceRow=(rules:WarRulesV6,id:string)=>
 rules.entries.find(e=>e.id===id&&/^W3-RTS\d{2}$/.test(e.id));

export function buildWarRtsMissionV129(id:string,rules:WarRulesV6):WarRtsMissionV129{
 if(!isId(id))throw new RangeError("Mission W3-RTS source inconnue.");
 const entry=sourceRow(rules,id);
 if(!entry)throw new Error("Mission absente de la Bible V6.");
 const mapId=field(entry,"C");
 // The original V6 workbook pairs consecutive mission IDs per map.
 // A modified row cannot silently redirect a film/planet mission to another planet.
 const sourceNumber=Number(id.slice(-2));
 const expectedMap="W3-MAP"+String(Math.ceil(sourceNumber/2)).padStart(2,"0");
 if(mapId!==expectedMap)
  throw new Error("Carte W3 erronée : "+id+" doit référencer "+expectedMap+", pas "+mapId+".");
 const map=createWarMapPracticeV128(mapId,rules).map;
 const spec=RECIPES[id];
 const opponents=OPPONENT_UNITS[id];
 if(opponents.some(unit=>!rules.units.some(u=>u.id===unit)))
  throw new Error("Un profil d'opposition référence une unité absente de la Bible V6.");
 const opponentBudgetPc=opponents.reduce((pc,unit)=>pc+rules.units.find(u=>u.id===unit)!.commandPoints,0);
 const opponentCombatants=opponents.reduce((n,unit)=>n+rules.units.find(u=>u.id===unit)!.fullMembers,0);
 const locations=[map.landmarks[0].at,map.landmarks[1].at,map.goal];
 const tasks:WarRtsTaskV129[]=spec.steps.map((step,i)=>({
  ...step,id:id+"-OBJ-"+String(i+1),
  location:locations[i],sourcedFrom:i===0?"I":i===1?"K":"L",
 }));
 if(map.id!==mapId)throw new Error("La mission demande une carte W3 différente de celle chargée.");
 return {
  id,name:String(entry.title),mapId,planetId:map.planetId,
  rank:field(entry,"D"),sourceObjective:field(entry,"E"),sourceDeployment:field(entry,"F"),
  sourceConditions:field(entry,"I"),sourceEnemyPlan:field(entry,"J"),
  sourceAlternatives:field(entry,"K"),sourceVictory:field(entry,"L"),
  sourceReentry:field(entry,"M"),
  sourceCampaignLink:field(entry,"N"),sourceProvenance:field(entry,"P"),
  sourceRewardXpDesign:Number(field(entry,"O")),
  pcMaximum:Number(field(entry,"G")),initialRav:Number(field(entry,"H")),
  sourceCells:entry.fields.filter(f=>["C","D","E","F","G","H","I","J","K","L","M","N","O","P"].includes(f.column))
   .map(f=>f.cell),
  sourceRow:entry.row,tasks,escortKind:spec.escortKind??null,
  suggestedV6Units:[...spec.suggestedV6Units],
  opponentUnitIds:[...opponents],opponentTeams:opponents.length,
  opponentCombatants,opponentBudgetPc,
  status:"source-faithful-objective-study",
  playableEngine:"single-hunter-physical-simulation-not-full-rts",
 };
}
function authoredEnemyPositions(
 mission:WarRtsMissionV129,base:WarMapPracticeV128,
 rules:WarRulesV6,
):WarMapActorV128[]{
 const taken=new Set<string>([
  key(base.map.start),key(base.map.goal),
  ...mission.tasks.map(task=>key(task.location)),
  key(base.map.observation),
 ]);
 return mission.opponentUnitIds.map((unitId,i)=>{
  const route=base.map.mandatoryPaths[i%3];
  let at:WarMapPointV128|null=null;
  for(let j=0;j<route.length-2;j++){
   const next=route[Math.max(1,route.length-7-i*3-j)];
   if(!taken.has(key(next))&&warMapWalkableV128(base.map,next)){
    at=next;break;
   }
  }
  if(!at)throw new Error("Impossible d'implanter le groupe rival "+unitId+" sans casser la carte.");
  taken.add(key(at));
  const unit=rules.units.find(u=>u.id===unitId)!;
  return {
   id:mission.id+"-RIVAL-"+String(i+1),
   unitId,...at,hp:Math.max(5,Math.min(10,Math.round(unit.defense/2)+5)),
   status:"active" as const,acknowledged:false,lastSeenTurn:-1,
  };
 });
}
export function createWarRtsMissionStateV129(id:string,rules:WarRulesV6):WarRtsMissionStateV129{
 const mission=buildWarRtsMissionV129(id,rules);
 const base=createWarMapPracticeV128(mission.mapId,rules);
 const enemies=authoredEnemyPositions(mission,base,rules);
 const tracked=mission.escortKind?{
  id:mission.id+"-TRACKED-01",kind:mission.escortKind,
  ...mission.tasks[1].location,hp:8,extracted:false,secured:false,
  heldByPlayer:["heavy-cargo","equipment","beacon"].includes(mission.escortKind),
  isNeutral:mission.escortKind==="witness",
 }:null;
 return {
  version:129,mission,
  base:{...base,enemies,scenarioId:"W129-EXERCISE-"+mission.id},
  completedTaskIds:[],holdProgress:0,tracked,
  lastMessage:"Contrat de source : "+mission.sourceObjective,
  status:"active",
 };
}
function currentTask(state:WarRtsMissionStateV129):WarRtsTaskV129|null{
 return state.mission.tasks[state.completedTaskIds.length]??null;
}
function receipt(state:WarRtsMissionStateV129,base:WarMapPracticeV128):WarMapReportV128{
 return {
  id:"RECEIPT-W129-"+state.mission.id+"-"+base.turn,
  mapId:state.mission.mapId,scenarioId:base.scenarioId,
  sourceCells:[...state.mission.sourceCells,...base.map.sourceCells],
  outcome:"victory",turn:base.turn,playerHp:base.player.hp,
  opposingUnitIds:base.enemies.map(e=>e.unitId),
  notes:"Source W3 : "+state.mission.sourceVictory+
    ". Preuves des trois interactions et extraction physique vérifiées. Aucun gain de campagne.",
  campaignMutation:false,
 };
}
function followTracked(
 tracked:WarRtsTrackedEntityV129|null,
 base:WarMapPracticeV128,
):WarRtsTrackedEntityV129|null{
 if(!tracked||!tracked.secured||tracked.extracted||tracked.hp<=0)return tracked;
 if(tracked.heldByPlayer){
  // A carrier was explicitly picked up at its real W3 location; as physical
  // equipment, it travels IN the player's hands, not by teleporting across the map.
  return {...tracked,x:base.player.x,y:base.player.y};
 }
 const blocker=base.enemies.filter(e=>e.hp>0).map(e=>({x:e.x,y:e.y}));
 const powerObstacles=base.power?[]:base.map.poweredDoors;
 const route=warMapFindPathV128(base.map,tracked,base.player,[...blocker,...powerObstacles]);
 let next={...tracked};
 if(route&&route.length>1&&dist(tracked,base.player)>1){
  const move=route[1];
  if(!blocker.some(b=>key(b)===key(move))&&!powerObstacles.some(b=>key(b)===key(move)))
   next={...next,x:move.x,y:move.y};
 }
 // Enemies can attack a real, visible escorted actor; the player must choose
 // the route and cannot transform a rescue into a collectible inventory slot.
 if(["wounded-ally","survivor-team","witness"].includes(next.kind)){
  const exposed=base.enemies.some(e=>e.hp>0&&dist(e,next)<=2&&
    warMapLineOfSightV128(base.map,e,next));
  if(exposed)next={...next,hp:Math.max(0,next.hp-1)};
 }
 return next;
}
function stageNeedsPressure(state:WarRtsMissionStateV129,task:WarRtsTaskV129):string|null{
 if(task.requiresPower&&!state.base.power)
  return "L'installation dépend de l'alimentation : rétablissez le courant au mécanisme réel.";
 if(task.requiresPressure&&!state.base.airlockStable)
  return "La pression du sas est instable : stabilisez-la avant d'entrer.";
 const phase=state.base.turn%8;
 if(task.requiresWindow&&phase>=3&&phase<=4){
  const reasons={
   "low-tide":"Marée haute : le quai ou la cavité n'est pas utilisable pendant cette fenêtre.",
   "clear-wind":"Rafales en cours : le repère doit être réglé pendant l'accalmie.",
   "stable-ice":"Plaques fissurées : les porteurs attendent une séquence stable.",
   "cool-jets":"Jets thermiques actifs : fermeture possible après refroidissement.",
  } as const;
  return reasons[task.requiresWindow];
 }
 return null;
}
function setStatus(state:WarRtsMissionStateV129,base:WarMapPracticeV128):WarRtsMissionStateV129["status"]{
 if(base.report?.outcome==="defeat")return "defeat";
 if(base.report?.outcome==="retreat")return "retreat";
 if(base.report?.outcome==="victory")return "victory";
 return state.status;
}
function processAfterCommand(
 state:WarRtsMissionStateV129,
 base:WarMapPracticeV128,
 tracked:WarRtsTrackedEntityV129|null,
 completedTaskIds:string[],holdProgress:number,message:string,
):WarRtsMissionUpdateV129{
 let nextBase={...base,objectiveDone:false};
 let nextTracked=followTracked(tracked,nextBase);
 if(nextTracked&&nextTracked.secured&&nextTracked.hp<=0&&!nextBase.report){
  nextBase={...nextBase,report:{
   id:"RECEIPT-W129-"+state.mission.id+"-LOSS-"+nextBase.turn,
   mapId:nextBase.map.id,scenarioId:nextBase.scenarioId,
   sourceCells:[...state.mission.sourceCells],outcome:"defeat",
   turn:nextBase.turn,playerHp:nextBase.player.hp,
   opposingUnitIds:nextBase.enemies.map(e=>e.unitId),
   notes:"Personne escortée perdue : évacuation non validée.",campaignMutation:false,
  }};
 }
 let outcome=setStatus(state,nextBase);
 if(!nextBase.report&&completedTaskIds.length===state.mission.tasks.length&&
   key(nextBase.player)===key(nextBase.map.extraction)&&
   (!nextTracked||nextTracked.secured&&nextTracked.hp>0&&
     dist(nextTracked,nextBase.map.extraction)<=1)){
  nextTracked=nextTracked?{...nextTracked,extracted:true}:null;
  nextBase={...nextBase,objectiveDone:true,
   report:receipt({...state,completedTaskIds},nextBase)};
  outcome="victory";
 }
 const next:WarRtsMissionStateV129={
  ...state,base:nextBase,tracked:nextTracked,completedTaskIds,holdProgress,
  lastMessage:message,status:outcome,
 };
 return succeeded(next,message);
}
export function commandWarRtsSourceMissionV129(
 state:WarRtsMissionStateV129,action:WarMissionMapActionV128,
):WarRtsMissionUpdateV129{
 if(state.status!=="active"||state.base.report)
  return failed(state,"Un résultat de mission a déjà été enregistré.");
 const task=currentTask(state);
 if(action==="interact"){
  if(!task)return failed(state,"Tous les objectifs sont accomplis : retournez à la sortie physique.");
  if(!state.base.player.observed)
   return failed(state,"Reconnaissez d'abord les accès ; aucun objectif révélé par omniscience.");
  if(dist(state.base.player,task.location)>1)
   return failed(state,"Objectif hors de portée : rejoignez "+task.title+" aux coordonnées "+key(task.location)+".");
  const blocked=stageNeedsPressure(state,task);
  if(blocked)return failed(state,blocked);
  const last=state.completedTaskIds.length===state.mission.tasks.length-1;
  // Only the LAST physical objective interacts with V128's original device.
  const baseAction=last&&task.kind!=="hold"?"interact":"wait";
  const advanced=commandWarMapPracticeV128(state.base,baseAction);
  if(!advanced.accepted)return failed(state,advanced.message);
  if(advanced.state.report?.outcome==="defeat")
   return processAfterCommand(state,advanced.state,state.tracked,state.completedTaskIds,0,
    "Contact hostile : l'objectif n'a pas pu être confirmé.");
  const hold=(task.holdTurns??1)>1?state.holdProgress+1:1;
  const done=hold>=Math.max(1,task.holdTurns??1);
  const completed=done?[...state.completedTaskIds,task.id]:[...state.completedTaskIds];
  let tracked=state.tracked;
  if(done&&tracked&&state.completedTaskIds.length===1){
   // Pre-existing marked actor/charge is now physically reached and secured.
   tracked={...tracked,secured:true};
  }
  return processAfterCommand(state,advanced.state,tracked,completed,done?0:hold,
   done?"Objectif confirmé : "+task.title: "Poste à tenir : "+hold+"/"+task.holdTurns+" ticks.");
 }
 if(action==="wait"&&task?.holdTurns&&state.holdProgress>0){
  if(dist(state.base.player,task.location)>1)return failed(state,"Vous avez quitté le poste à tenir.");
  const missing=stageNeedsPressure(state,task);if(missing)return failed(state,missing);
  const advanced=commandWarMapPracticeV128(state.base,"wait");
  if(!advanced.accepted)return failed(state,advanced.message);
  if(advanced.state.report?.outcome==="defeat")
   return processAfterCommand(state,advanced.state,state.tracked,state.completedTaskIds,0,
    "Poste perdu avant la relève.");
  const next=state.holdProgress+1;
  const done=next>=task.holdTurns;
  return processAfterCommand(state,advanced.state,state.tracked,
   done?[...state.completedTaskIds,task.id]:[...state.completedTaskIds],
   done?0:next,done?"Position tenue : "+task.title:"Maintien du poste : "+next+"/"+task.holdTurns);
 }
 const advanced=commandWarMapPracticeV128(state.base,action);
 if(!advanced.accepted)return failed(state,advanced.message);
 const changed=action==="up"||action==="down"||action==="left"||action==="right";
 const hold=changed?0:state.holdProgress;
 return processAfterCommand(state,advanced.state,state.tracked,[...state.completedTaskIds],hold,
  advanced.message);
}
export function auditWarRtsSourceMissionsV129(rules:WarRulesV6){
 const issues:string[]=[];
 const plans:WarRtsMissionV129[]=[];
 for(const id of WAR_SOURCE_RTS_IDS_V129){
  try{
   const plan=buildWarRtsMissionV129(id,rules);
   plans.push(plan);
   const base=createWarMapPracticeV128(plan.mapId,rules);
   if(base.map.planetId!==plan.planetId)issues.push(id+": planet mismatch");
   if(plan.tasks.length!==3)issues.push(id+": incomplete source task chain");
   const windowEnvironments={
    "low-tide":"maree-haute","clear-wind":"rafales-sur-le-phare",
    "stable-ice":"fissure-de-glace","cool-jets":"jets-thermiques",
   } as const;
   if(plan.tasks.some(task=>task.requiresWindow&&
      base.map.eventClass!==windowEnvironments[task.requiresWindow]))
    issues.push(id+": unsafe climate/event task gating");
   if(plan.sourceCells.length!==14)issues.push(id+": incomplete 14-column workbook provenance");
   if(!plan.sourceCampaignLink||!plan.sourceProvenance)issues.push(id+": missing campaign/provenance");
   if(!Number.isFinite(plan.pcMaximum)||!Number.isFinite(plan.initialRav))
    issues.push(id+": missing source budget");
   if(!Number.isFinite(plan.sourceRewardXpDesign))
    issues.push(id+": missing authored XP value");
   if(!plan.sourceVictory||!plan.sourceObjective||!plan.sourceDeployment)
    issues.push(id+": missing objective, deployment or victory text");
   if(plan.tasks.some(t=>!warMapFindPathV128(base.map,base.map.start,t.location)))
    issues.push(id+": inaccessible physical task");
   if(plan.suggestedV6Units.some(u=>!rules.units.some(v=>v.id===u)))
    issues.push(id+": invalid W3 troop suggestion");
   const sample=createWarRtsMissionStateV129(id,rules);
   if(sample.base.enemies.length!==plan.opponentTeams||
      sample.base.enemies.some(e=>!warMapWalkableV128(sample.base.map,e)))
    issues.push(id+": invalid physical rival placement");
   if(new Set(sample.base.enemies.map(e=>key(e))).size!==plan.opponentTeams)
    issues.push(id+": overlapping rival groups");
   if(plan.opponentBudgetPc>plan.pcMaximum)
    issues.push(id+": opponent study budget exceeds source PC envelope");
  }catch(e){issues.push(id+": "+String(e));}
 }
 if(plans.length!==24||new Set(plans.map(v=>v.mapId)).size!==12)
  issues.push("Expected 24 source scripts paired across 12 maps");
 return {scripts:plans.length,sourceMaps:new Set(plans.map(v=>v.mapId)).size,
  steps:plans.reduce((n,p)=>n+p.tasks.length,0),
  escortedScripts:plans.filter(p=>p.escortKind!==null).length,issues};
}
