import type {WarRulesV6,WarUnitDefinitionV6} from "./clanWarBibleV6";
import {
 createWarRtsMissionStateV129,type WarRtsMissionV129,type WarRtsTaskV129,
 type WarRtsEscortKindV129,
} from "./clanWarRtsSourceMissionsV129";
import {
 warMapFindPathV128,warMapLineOfSightV128,warMapTileV128,warMapWalkableV128,
 type WarMapActorV128,type WarMapPointV128,type WarSourceMapV128,
} from "./clanWarSourceMapsV128";

/**
 * V133 is the FIRST multi-squad W3 field prototype. This module does not call
 * applyWarResultV6, WarSimulationV85 or write to any campaign storage.
 * The V6 team roles, PC, RAV and W3 mission sources are data contracts.
 * Damage, RAV per shot, movement and turn duration are original game rules,
 * NOT canon Predator weapon specifications or a finished RTS balance pass.
 */
export type WarRtsSquadsPhaseV133="planning"|"active"|"victory"|"defeat"|"retreat";
export interface WarRtsSquadV133 extends WarMapPointV128 {
 id:string;unitId:string;unitName:string;memberCount:number;
 hp:number;maxHp:number;attack:number;defense:number;range:number;mobility:number;
 commandPoints:number;upkeepRav:number;
 status:"ready"|"active"|"down";
}
export interface WarRtsEscortV133 extends WarMapPointV128 {
 id:string;kind:WarRtsEscortKindV129;hp:number;secured:boolean;extracted:boolean;
 isNeutral:boolean;carrierSquadId:string|null;
}
export interface WarRtsIntelV133 extends WarMapPointV128 {id:string;unitId:string;lastSeenTurn:number;}
export interface WarRtsHoldV133 {taskId:string;squadId:string;progress:number;required:number;}
export interface WarRtsSquadsReceiptV133 {
 id:string;missionId:string;mapId:string;planetId:string;
 sourceCells:string[];outcome:"victory"|"defeat"|"retreat";
 completedTaskIds:string[];squadIds:string[];downSquadIds:string[];
 leftBehindSquadIds:string[];escortExtracted:boolean;
 turn:number;remainingRav:number;campaignMutation:false;source:"V6-W3-original-field-study";
}
export interface WarRtsSquadsStateV133 {
 version:133;mode:"free-exercise";sourceSha:string;phase:WarRtsSquadsPhaseV133;
 mission:WarRtsMissionV129;map:WarSourceMapV128;
 squads:WarRtsSquadV133[];enemies:WarMapActorV128[];intel:WarRtsIntelV133[];
 nextSquadNumber:number;pcMaximum:number;pcCommitted:number;
 initialRav:number;ravRemaining:number;turn:number;observed:boolean;
 completedTaskIds:string[];hold:WarRtsHoldV133|null;
 tracked:WarRtsEscortV133|null;power:boolean;airlockStable:boolean;
 report:WarRtsSquadsReceiptV133|null;log:string[];lastMessage:string;
}
export type WarRtsSquadOrderV133 =
 |{kind:"move";squadId:string;direction:"up"|"down"|"left"|"right"}
 |{kind:"attack";squadId:string;targetId:string}
 |{kind:"observe"|"interact"|"wait"|"power"|"stabilize"|"pickup"|"extract"|"retreat";squadId:string};
export interface WarRtsSquadsUpdateV133{state:WarRtsSquadsStateV133;accepted:boolean;message:string;}

const pos=(x:number,y:number):WarMapPointV128=>({x,y});
const at=(v:WarMapPointV128)=>v.x+","+v.y;
const distance=(a:WarMapPointV128,b:WarMapPointV128)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const fail=(s:WarRtsSquadsStateV133,message:string):WarRtsSquadsUpdateV133=>({state:s,accepted:false,message});
const accept=(s:WarRtsSquadsStateV133,message:string):WarRtsSquadsUpdateV133=>({state:s,accepted:true,message});
const currentTask=(s:WarRtsSquadsStateV133):WarRtsTaskV129|null=>s.mission.tasks[s.completedTaskIds.length]??null;
const poweredMap=(s:WarRtsSquadsStateV133)=>s.map.poweredDoors.length>0||["W3-MAP02","W3-MAP10","W3-MAP11","W3-MAP12"].includes(s.map.id);
const activeSquads=(s:WarRtsSquadsStateV133)=>s.squads.filter(u=>u.status==="active"&&u.hp>0);
const hazardsNow=(turn:number)=>turn%8>=3&&turn%8<=4;
const unitById=(rules:WarRulesV6,id:string)=>rules.units.find(u=>u.id===id);

function makeSquad(unit:WarUnitDefinitionV6,id:string):WarRtsSquadV133{
 const hp=clamp(5+Math.ceil(unit.defense/3)+unit.fullMembers,7,28);
 return {id,unitId:unit.id,unitName:unit.name,memberCount:unit.fullMembers,
  x:-1,y:-1,hp,maxHp:hp,attack:unit.attack,defense:unit.defense,
  range:clamp(unit.range,1,4),mobility:unit.mobility,
  commandPoints:unit.commandPoints,upkeepRav:unit.upkeepRav,status:"ready"};
}
function receipt(s:WarRtsSquadsStateV133,outcome:"victory"|"defeat"|"retreat"):WarRtsSquadsReceiptV133{
 const living=activeSquads(s);
 return {id:"W133-"+s.mission.id+"-"+outcome+"-"+s.turn,
  missionId:s.mission.id,mapId:s.map.id,planetId:s.map.planetId,
  sourceCells:[...s.mission.sourceCells,...s.map.sourceCells],outcome,
  completedTaskIds:[...s.completedTaskIds],squadIds:s.squads.map(u=>u.id),
  downSquadIds:s.squads.filter(u=>u.status==="down").map(u=>u.id),
  leftBehindSquadIds:outcome==="retreat"?living.filter(u=>distance(u,s.map.extraction)>2).map(u=>u.id):[],
  escortExtracted:Boolean(s.tracked?.extracted),turn:s.turn,remainingRav:s.ravRemaining,
  campaignMutation:false,source:"V6-W3-original-field-study"};
}
function close(s:WarRtsSquadsStateV133,outcome:"victory"|"defeat"|"retreat",message:string):WarRtsSquadsStateV133{
 const copy={...s,phase:outcome,log:[...s.log,message].slice(-60),lastMessage:message};
 return {...copy,report:receipt(copy,outcome)};
}
/** Planning uses the V6 PC cap exactly. RAV are carried into the exercise,
 * not silently spent on fictional recruits or campaign purchases. */
export function createWarRtsSquadsV133(id:string,rules:WarRulesV6):WarRtsSquadsStateV133{
 const source=createWarRtsMissionStateV129(id,rules);
 const mission=source.mission;
 const prioritized=[...new Set([...mission.suggestedV6Units,
  ...rules.units.filter(u=>u.fullMembers>0&&u.commandPoints>0)
   .sort((a,b)=>a.commandPoints-b.commandPoints||a.id.localeCompare(b.id)).map(u=>u.id)])];
 const squads:WarRtsSquadV133[]=[];
 let spent=0;
 for(const unitId of prioritized){
  if(squads.length>=3)break;
  const unit=unitById(rules,unitId);
  if(!unit||unit.fullMembers<1||unit.commandPoints<1||spent+unit.commandPoints>mission.pcMaximum)continue;
  squads.push(makeSquad(unit,"W133-"+id+"-ALLY-"+(squads.length+1)));
  spent+=unit.commandPoints;
 }
 if(squads.length<2)throw new Error("Ce contrat W3 ne permet pas deux détachements dans son plafond PC source.");
 const tracked=source.tracked?{
  id:source.tracked.id,kind:source.tracked.kind,x:source.tracked.x,y:source.tracked.y,
  hp:source.tracked.hp,secured:false,extracted:false,isNeutral:source.tracked.isNeutral,
  carrierSquadId:null,
 }:null;
 return {version:133,mode:"free-exercise",sourceSha:rules.metadata.sha256,
  phase:"planning",mission,map:source.base.map,squads,
  enemies:source.base.enemies.map(e=>({...e})),intel:[],nextSquadNumber:squads.length+1,
  pcMaximum:mission.pcMaximum,pcCommitted:spent,
  initialRav:mission.initialRav,ravRemaining:mission.initialRav,turn:0,observed:false,
  completedTaskIds:[],hold:null,tracked,power:source.base.power,
  airlockStable:source.base.airlockStable,report:null,log:[],
  lastMessage:"Préparation de détachements W3. Aucun membre ni RAV de campagne n'est engagé."};
}
export function draftWarRtsSquadV133(s:WarRtsSquadsStateV133,unitId:string,rules:WarRulesV6):WarRtsSquadsUpdateV133{
 if(s.phase!=="planning"||s.sourceSha!==rules.metadata.sha256)return fail(s,"Préparation ou source V6 incompatible.");
 if(s.squads.length>=4)return fail(s,"Maximum de quatre escouades pour cette carte d'exercice.");
 const unit=unitById(rules,unitId);
 if(!unit||unit.fullMembers<1||unit.commandPoints<1)return fail(s,"Formation W3 absente ou inapte.");
 if(s.pcCommitted+unit.commandPoints>s.pcMaximum)return fail(s,"Plafond PC W3 dépassé : pas de formation gratuite.");
 const team=makeSquad(unit,"W133-"+s.mission.id+"-ALLY-"+s.nextSquadNumber);
 return accept({...s,squads:[...s.squads,team],nextSquadNumber:s.nextSquadNumber+1,
  pcCommitted:s.pcCommitted+unit.commandPoints},"Formation d'essai ajoutée : "+unit.name+".");
}
export function removeWarRtsSquadV133(s:WarRtsSquadsStateV133,squadId:string):WarRtsSquadsUpdateV133{
 if(s.phase!=="planning")return fail(s,"Les effectifs sont verrouillés après le départ.");
 const unit=s.squads.find(u=>u.id===squadId);
 if(!unit)return fail(s,"Aucune formation à retirer.");
 return accept({...s,squads:s.squads.filter(u=>u.id!==squadId),pcCommitted:s.pcCommitted-unit.commandPoints},
  "Formation retirée du plan d'exercice.");
}
export function launchWarRtsSquadsV133(s:WarRtsSquadsStateV133):WarRtsSquadsUpdateV133{
 if(s.phase!=="planning")return fail(s,"Cet exercice a déjà été lancé.");
 if(s.squads.length<2||s.squads.length>4||s.pcCommitted>s.pcMaximum)
  return fail(s,"Déployez deux à quatre formations sans dépasser le plafond PC.");
 const rivals=new Set(s.enemies.filter(e=>e.hp>0).map(at));
 const choices=s.map.tiles.filter(t=>!t.solid&&distance(t,s.map.start)<=5&&
  !rivals.has(at(t))&&!s.map.hazards.some(h=>at(h)===at(t)))
  .sort((a,b)=>distance(a,s.map.start)-distance(b,s.map.start)||a.y-b.y||a.x-b.x);
 if(choices.length<s.squads.length)return fail(s,"La carte ne possède pas de départs physiques pour toutes les escouades.");
 const squads=s.squads.map((u,i)=>({...u,x:choices[i].x,y:choices[i].y,status:"active" as const}));
 const next:WarRtsSquadsStateV133={...s,squads,phase:"active",
  log:["Déploiement physique : "+squads.map(x=>x.unitId+"@"+at(x)).join(" · ")],
  lastMessage:"Détachements déployés. Reconnaissez avant de toucher aux objectifs."};
 return accept(refreshIntel(next),next.lastMessage);
}
export function visibleWarRtsEnemiesV133(s:WarRtsSquadsStateV133):WarMapActorV128[]{
 return s.enemies.filter(e=>e.hp>0&&activeSquads(s).some(u=>
  distance(u,e)<=7&&warMapLineOfSightV128(s.map,u,e))).map(e=>({...e}));
}
function refreshIntel(s:WarRtsSquadsStateV133):WarRtsSquadsStateV133{
 const found=visibleWarRtsEnemiesV133(s),seen=new Map(s.intel.map(i=>[i.id,{...i}]));
 for(const enemy of found)seen.set(enemy.id,{id:enemy.id,unitId:enemy.unitId,x:enemy.x,y:enemy.y,lastSeenTurn:s.turn});
 return {...s,intel:[...seen.values()].sort((a,b)=>a.id.localeCompare(b.id))};
}
function taskRestriction(s:WarRtsSquadsStateV133,task:WarRtsTaskV129):string|null{
 if(task.requiresPower&&!s.power)return "Réseau hors tension : tâche alimentée impossible.";
 if(task.requiresPressure&&!s.airlockStable)return "Pression du sas non stabilisée.";
 if(task.requiresWindow&&hazardsNow(s.turn)){
  return ({"low-tide":"Marée haute : accès bloqué.","clear-wind":"Rafales : signal impossible.",
   "stable-ice":"Glace instable : traversée suspendue.","cool-jets":"Jets thermiques actifs."})[task.requiresWindow];
 }
 return null;
}
function securedCargo(kind:WarRtsEscortKindV129){return ["heavy-cargo","equipment","beacon"].includes(kind);}
function updateEscort(s:WarRtsSquadsStateV133):WarRtsSquadsStateV133{
 let tracked=s.tracked;if(!tracked||!tracked.secured||tracked.hp<=0)return s;
 if(securedCargo(tracked.kind)){
  const carrier=s.squads.find(u=>u.id===tracked?.carrierSquadId&&u.status==="active");
  if(carrier)tracked={...tracked,x:carrier.x,y:carrier.y};
  else tracked={...tracked,carrierSquadId:null}; // Dropped in place; no auto-transfer.
 }else{
  const leader=s.squads.find(u=>u.id===tracked?.carrierSquadId&&u.status==="active");
  if(leader&&distance(leader,tracked)>1){
   const occupied=[...s.enemies.filter(e=>e.hp>0),...activeSquads(s).filter(u=>u.id!==leader.id),
    ...(!s.power?s.map.poweredDoors:[])];
   const path=warMapFindPathV128(s.map,tracked,leader,occupied);
   const step=path?.[1];
   if(step&&!occupied.some(u=>at(u)===at(step)))tracked={...tracked,x:step.x,y:step.y};
  }
  // Human/witness actors are never enlisted as Yautja rival combatants.
  // Active hostiles may hit escorted combatants, not intentionally target neutrals.
  const exposed=tracked;
  if(!exposed.isNeutral&&s.enemies.some(e=>e.hp>0&&distance(e,exposed)<=2&&warMapLineOfSightV128(s.map,e,exposed)))
   tracked={...exposed,hp:Math.max(0,exposed.hp-1)};
 }
 const atRisk=tracked;
 if(hazardsNow(s.turn)&&s.map.hazards.some(h=>at(h)===at(atRisk)))
  tracked={...atRisk,hp:Math.max(0,atRisk.hp-2)};
 return {...s,tracked};
}
function updateEnemyAI(s:WarRtsSquadsStateV133):WarRtsSquadsStateV133{
 const enemies=s.enemies.map(e=>({...e})),squads=s.squads.map(u=>({...u}));
 const allTargets=()=>squads.filter(u=>u.status==="active"&&u.hp>0);
 for(const enemy of enemies){
  if(enemy.hp<=0)continue;
  const visible=allTargets().filter(u=>distance(enemy,u)<=7&&warMapLineOfSightV128(s.map,enemy,u))
   .sort((a,b)=>distance(enemy,a)-distance(enemy,b)||a.id.localeCompare(b.id));
  const target=visible[0];if(!target)continue;
  const def=s.map.tiles.find(t=>t.x===target.x&&t.y===target.y);
  const unit=s.mission.opponentUnitIds.includes(enemy.unitId)?enemy.unitId:null;
  const range=unit?2:1;
  if(distance(enemy,target)<=range){
   const damage=Math.max(1,2-(def?.cover?1:0));
   target.hp=Math.max(0,target.hp-damage);
   if(target.hp===0)target.status="down";
  }else{
   const occupied=[...allTargets(),...enemies.filter(e=>e.id!==enemy.id&&e.hp>0),
    ...(!s.power?s.map.poweredDoors:[])];
   const path=warMapFindPathV128(s.map,enemy,target,occupied);
   const step=path?.[1];
   if(step&&!occupied.some(other=>at(other)===at(step))){enemy.x=step.x;enemy.y=step.y;}
  }
 }
 return {...s,enemies,squads};
}
function advance(s:WarRtsSquadsStateV133,narration:string):WarRtsSquadsStateV133{
 const turn=s.turn+1;
 let next:WarRtsSquadsStateV133={...s,turn};
 if(hazardsNow(turn)){
  next={...next,squads:next.squads.map(u=>{
   if(u.status!=="active"||!next.map.hazards.some(h=>at(h)===at(u)))return u;
   const hp=Math.max(0,u.hp-2);
   return {...u,hp,status:hp>0?"active":"down"};
  })};
 }
 next=updateEnemyAI(next);
 next=updateEscort(next);
 if(next.tracked?.secured&&next.tracked.hp<=0)
  return close(next,"defeat","L'acteur/chargement escorté a été perdu avant l'extraction.");
 if(activeSquads(next).length===0)return close(next,"defeat","Toutes les escouades sont hors de combat. Aucune perte humaine définitive inventée.");
 if(next.hold){
  const holding=next.hold,unit=next.squads.find(u=>u.id===holding.squadId);
  const task=currentTask(next);
  if(!task||task.id!==holding.taskId||!unit||unit.status!=="active"||
     distance(unit,task.location)>1||taskRestriction(next,task)){
   next={...next,hold:null};narration+=" Tenue interrompue : poste abandonné, danger ou relève impossible.";
  }else{
   const progress=holding.progress+1;
   if(progress>=holding.required){
    const completed=[...next.completedTaskIds,task.id];
    let tracked=next.tracked;
    if(tracked&&next.completedTaskIds.length===1)
     tracked={...tracked,secured:true,carrierSquadId:unit.id};
    next={...next,completedTaskIds:completed,hold:null,tracked};
    narration+=" Étape confirmée : "+task.title+".";
   }else next={...next,hold:{...holding,progress}};
  }
 }
 next=refreshIntel(next);
 const log=[...next.log,"T"+turn+" · "+narration].slice(-60);
 return {...next,lastMessage:narration,log};
}
function issue(s:WarRtsSquadsStateV133,message:string,patch:Partial<WarRtsSquadsStateV133>):WarRtsSquadsUpdateV133{
 const next=advance({...s,...patch},message);
 return accept(next,next.lastMessage);
}
/** Every accepted tactical order costs one simulation tick (except extraction/repli);
 * invalid orders NEVER advance AI, clone a squad, or alter RAV. */
export function commandWarRtsSquadsV133(s:WarRtsSquadsStateV133,order:WarRtsSquadOrderV133):WarRtsSquadsUpdateV133{
 if(s.phase!=="active"||s.report)return fail(s,"La bataille n'est pas en cours ou son reçu est clos.");
 const actor=s.squads.find(u=>u.id===order.squadId);
 if(!actor||actor.status!=="active"||actor.hp<=0)return fail(s,"Escouade inexistante ou neutralisée.");
 if(order.kind==="move"){
  const delta=order.direction==="up"?pos(0,-1):order.direction==="down"?pos(0,1):
   order.direction==="left"?pos(-1,0):pos(1,0);
  const dest=pos(actor.x+delta.x,actor.y+delta.y);
  if(!warMapWalkableV128(s.map,dest))return fail(s,"Déplacement impossible : obstacle ou liquide infranchissable.");
  if(!s.power&&s.map.poweredDoors.some(p=>at(p)===at(dest)))
   return fail(s,"Porte motorisée bloquée pendant la panne.");
  if(s.squads.some(u=>u.id!==actor.id&&u.status==="active"&&at(u)===at(dest))||
     s.enemies.some(u=>u.hp>0&&at(u)===at(dest)))return fail(s,"La case est occupée.");
  const squads=s.squads.map(u=>u.id===actor.id?{...u,...dest}:u);
  return issue(s,actor.unitName+" avance vers "+at(dest)+".",{squads});
 }
 if(order.kind==="attack"){
  const enemy=s.enemies.find(e=>e.id===order.targetId&&e.hp>0);
  if(!enemy)return fail(s,"Cible ennemie absente ou déjà neutralisée.");
  if(distance(actor,enemy)>actor.range||!warMapLineOfSightV128(s.map,actor,enemy))
   return fail(s,"Cible hors de portée ou sans ligne de vue.");
  if(s.ravRemaining<1)return fail(s,"RAV d'exercice épuisés : tir refusé.");
  const cover=warMapTileV128(s.map,enemy.x,enemy.y)?.cover;
  const damage=clamp(Math.ceil(actor.attack/4)-(cover?1:0),1,6);
  const enemies=s.enemies.map(e=>e.id===enemy.id?{
   ...e,hp:Math.max(0,e.hp-damage),status:e.hp<=damage?"down" as const:"active" as const}:e);
  return issue(s,"Tir de "+actor.unitId+" sur cible visible "+enemy.id+" ("+damage+" PV, 1 RAV).",
   {enemies,ravRemaining:s.ravRemaining-1});
 }
 if(order.kind==="observe"){
  const near=distance(actor,s.map.observation)<=2||
   (distance(actor,s.map.goal)<=6&&warMapLineOfSightV128(s.map,actor,s.map.goal));
  if(!near)return fail(s,"La zone d'observation est hors d'accès réel.");
  return issue(s,"Accès W3 reconnus par "+actor.unitId+".",{observed:true});
 }
 if(order.kind==="power"){
  if(!poweredMap(s)||distance(actor,s.map.goal)>3)
   return fail(s,"Aucun circuit commandable à cette position.");
  return issue(s,s.power?"Circuit du secteur coupé.":"Circuit du secteur alimenté.",{power:!s.power});
 }
 if(order.kind==="stabilize"){
  if(s.map.id!=="W3-MAP12"||distance(actor,s.map.goal)>3||!s.power)
   return fail(s,"La stabilisation exige le vrai sas orbital alimenté et proche.");
  return issue(s,"Pression de coque stabilisée.",{airlockStable:true});
 }
 if(order.kind==="interact"){
  const task=currentTask(s);
  if(!task)return fail(s,"Les objectifs sont remplis : évacuez toutes les escouades.");
  if(!s.observed)return fail(s,"Reconnaissance obligatoire : pas d'objectif omniscient.");
  if(distance(actor,task.location)>1)return fail(s,"Objectif physiquement hors de portée.");
  const restriction=taskRestriction(s,task);if(restriction)return fail(s,restriction);
  if(s.hold)return fail(s,"Une unité tient déjà ce poste ; attendez sa relève effective.");
  const hold:WarRtsHoldV133={taskId:task.id,squadId:actor.id,progress:0,required:Math.max(1,task.holdTurns??1)};
  return issue(s,"Opération engagée par "+actor.unitId+" : "+task.title+".",{hold});
 }
 if(order.kind==="pickup"){
  const tracked=s.tracked;
  if(!tracked||!tracked.secured||!securedCargo(tracked.kind)||tracked.carrierSquadId)
   return fail(s,"Aucune charge déjà sécurisée et posée à reprendre.");
  if(distance(actor,tracked)>1)return fail(s,"Charge physiquement hors de portée.");
  return issue(s,"Charge reprise à "+at(tracked)+" par "+actor.unitId+".",
   {tracked:{...tracked,carrierSquadId:actor.id}});
 }
 if(order.kind==="wait")return issue(s,"Tenue de positions et observation.",{});
 if(order.kind==="extract"){
  if(s.completedTaskIds.length!==s.mission.tasks.length)return fail(s,"La preuve des trois objectifs W3 manque.");
  if(activeSquads(s).some(u=>distance(u,s.map.extraction)>2))
   return fail(s,"Ramenez chaque escouade survivante au périmètre de l'extraction.");
  const carrier=s.tracked?.carrierSquadId?s.squads.find(u=>u.id===s.tracked?.carrierSquadId):null;
  if(s.tracked&&(!s.tracked.secured||s.tracked.hp<=0||
    distance(s.tracked,s.map.extraction)>1||
    securedCargo(s.tracked.kind)&&(!carrier||carrier.status!=="active")))
   return fail(s,"La personne, balise ou caisse doit réellement atteindre la sortie avec son porteur.");
  const final={...s,tracked:s.tracked?{...s.tracked,extracted:true}:null};
  const result=close(final,"victory","Trois preuves W3 et évacuation des escouades vérifiées ; aucune mutation de campagne.");
  return accept(result,result.lastMessage);
 }
 if(order.kind==="retreat"){
  if(distance(actor,s.map.extraction)>1)return fail(s,"Repli refusé : rejoindre la vraie sortie.");
  const result=close(s,"retreat","Retrait du détachement ; unités encore dehors signalées, sans mort inventée.");
  return accept(result,result.lastMessage);
 }
 return fail(s,"Ordre tactique invalide.");
}
/** QA guard: all 24 W3 scenarios must have at least two source-budgeted teams,
 * distinct deployment tiles and no automatic campaign award. */
export function auditWarRtsSquadsV133(rules:WarRulesV6){
 const issues:string[]=[];let squads=0,steps=0;
 for(let n=1;n<=24;n++){
  const id="W3-RTS"+String(n).padStart(2,"0");
  try{
   const draft=createWarRtsSquadsV133(id,rules),launch=launchWarRtsSquadsV133(draft);
   squads+=draft.squads.length;steps+=draft.mission.tasks.length;
   if(!launch.accepted||launch.state.phase!=="active")issues.push(id+" failed to deploy");
   if(draft.pcCommitted>draft.pcMaximum||draft.squads.length<2)issues.push(id+" PC budget / squads");
   if(new Set(launch.state.squads.map(at)).size!==draft.squads.length)issues.push(id+" duplicate spawns");
   if(launch.state.enemies.some(e=>launch.state.squads.some(u=>at(u)===at(e))))issues.push(id+" adversary overlap");
   if(launch.state.map.planetId!==launch.state.mission.planetId)issues.push(id+" world mismatch");
   if(launch.state.report!==null)issues.push(id+" unearned report");
  }catch(error){issues.push(id+": "+String(error));}
 }
 return {missions:24,steps,squads,issues};
}
