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
 status:"ready"|"active"|"down"|"evacuated";
}
export interface WarRtsEscortV133 extends WarMapPointV128 {
 id:string;kind:WarRtsEscortKindV129;hp:number;secured:boolean;extracted:boolean;
 isNeutral:boolean;carrierSquadId:string|null;
}
export interface WarRtsIntelV133 extends WarMapPointV128 {id:string;unitId:string;lastSeenTurn:number;}
export interface WarRtsHoldV133 {taskId:string;squadId:string;progress:number;required:number;}
export interface WarRtsOverwatchV136 {squadId:string;expiresAt:number;}
export interface WarRtsBraceV137 {squadId:string;expiresAt:number;}
export interface WarRtsTriageV138 {
 medicSquadId:string;rescuedSquadId:string;atTurn:number;memberCount:number;
}
export interface WarRtsSquadsReceiptV133 {
 id:string;missionId:string;mapId:string;planetId:string;
 sourceCells:string[];outcome:"victory"|"defeat"|"retreat";
 completedTaskIds:string[];squadIds:string[];downSquadIds:string[];
 leftBehindSquadIds:string[];evacuatedSquadIds?:string[];escortExtracted:boolean;
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
 /** Single-tick tactical suppression, never permanent intelligence or casualty. */
 suppressedEnemyIds?:string[];
 /** V136 physical overwatch: optional expiring reaction orders per real squad. */
 overwatch?:WarRtsOverwatchV136[];
 /** One physical cover stance per squad per mission, never a permanent buff. */
 brace?:WarRtsBraceV137[];braceIssuedIds?:string[];
 /** Real W3-U18 field medics; cannot create new people from a casualty. */
 triageReceipts?:WarRtsTriageV138[];
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
  evacuatedSquadIds:s.squads.filter(u=>u.status==="evacuated").map(u=>u.id),
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
  if(enemy.hp<=0||(s.suppressedEnemyIds??[]).includes(enemy.id))continue;
  const visible=allTargets().filter(u=>distance(enemy,u)<=7&&warMapLineOfSightV128(s.map,enemy,u))
   .sort((a,b)=>distance(enemy,a)-distance(enemy,b)||a.id.localeCompare(b.id));
  const target=visible[0];if(!target)continue;
  const def=s.map.tiles.find(t=>t.x===target.x&&t.y===target.y);
  const unit=s.mission.opponentUnitIds.includes(enemy.unitId)?enemy.unitId:null;
  const range=unit?2:1;
  if(distance(enemy,target)<=range){
   const braced=(s.brace??[]).some(item=>item.squadId===target.id&&item.expiresAt>=s.turn);
   const damage=Math.max(0,2-(def?.cover?1:0)-(braced?1:0));
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
/**
 * After enemy movement, a physically positioned watcher can take one
 * reaction shot only at a REAL target inside its own V6 tactical range/LOS.
 * No shot means no RAV spent. Orders expire after two ticks even if no enemy
 * appears; firing never reveals invisible or off-planet enemies.
 */
function resolveOverwatchV136(s:WarRtsSquadsStateV133):{state:WarRtsSquadsStateV133;summary:string}{
 const orders=s.overwatch??[];
 if(!orders.length)return {state:s,summary:""};
 let rav=s.ravRemaining;
 const rivals=s.enemies.map(e=>({...e}));
 const pending:WarRtsOverwatchV136[]=[];
 const shots:string[]=[];
 for(const watcher of orders){
  const actor=activeSquads(s).find(unit=>unit.id===watcher.squadId);
  if(!actor||rav<=0)continue;
  const target=rivals.filter(e=>e.hp>0&&distance(actor,e)<=actor.range&&
   warMapLineOfSightV128(s.map,actor,e))
   .sort((a,b)=>distance(actor,a)-distance(actor,b)||a.id.localeCompare(b.id))[0];
  if(!target){
   if(s.turn<watcher.expiresAt)pending.push(watcher);
   continue;
  }
  const cover=warMapTileV128(s.map,target.x,target.y)?.cover;
  const damage=clamp(Math.ceil(actor.attack/4)-(cover?1:0),1,6);
  target.hp=Math.max(0,target.hp-damage);
  if(!target.hp)target.status="down";
  rav-=1;
  shots.push(actor.unitId+" → "+target.unitId+" ("+damage+" PV, 1 RAV)");
 }
 return {state:{...s,enemies:rivals,overwatch:pending,ravRemaining:rav},
  summary:shots.length?" Veille déclenchée : "+shots.join(" ; ")+".":""};
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
 next={...next,suppressedEnemyIds:[],brace:(next.brace??[]).filter(b=>b.expiresAt>turn)};
 const watch=resolveOverwatchV136(next);
 next=watch.state;
 narration+=watch.summary;
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
  return issue(s,actor.unitName+" avance vers "+at(dest)+".",{
    squads,overwatch:(s.overwatch??[]).filter(w=>w.squadId!==actor.id),
     brace:(s.brace??[]).filter(b=>b.squadId!==actor.id)});
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
   {enemies,ravRemaining:s.ravRemaining-1,
      overwatch:(s.overwatch??[]).filter(w=>w.squadId!==actor.id)});
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
  if(!tracked||!tracked.secured||tracked.hp<=0||tracked.extracted)
   return fail(s,"Aucune charge ou personne escortée apte à être reprise.");
  if(tracked.carrierSquadId===actor.id)return fail(s,"Cette escouade accompagne déjà cette charge ou personne.");
  if(distance(actor,tracked)>1)return fail(s,"La charge ou la personne se trouve physiquement hors de portée.");
  // A casualty leader can be replaced by a REAL nearby squad; a witness
  // keeps their neutral status. Heavy objects also require a real handoff.
  return issue(s,"Responsabilité de l'escorte transférée à "+at(tracked)+" vers "+actor.unitId+".",
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

/**
 * V139: physically evacuate ONE already deployed detachment at the authored
 * extraction tile before the remaining teams finish the mission. No free
 * teleport or replacement; the same squad ID stays on the battle receipt.
 * One active group must remain on the map and escort carriers cannot abandon
 * rescued people or cargo on the threshold.
 */
export function evacuateWarRtsSquadV139(
 s:WarRtsSquadsStateV133,squadId:string,
):WarRtsSquadsUpdateV133 {
 if(s.phase!=="active"||s.report)return fail(s,"Aucune opération RTS ouverte.");
 const unit=activeSquads(s).find(u=>u.id===squadId);
 if(!unit)return fail(s,"Formation inexistante, hors combat ou déjà évacuée.");
 if(activeSquads(s).length<2)return fail(s,"Un dernier détachement doit garder le front et achever les objectifs.");
 if(distance(unit,s.map.extraction)>1)
  return fail(s,"L'évacuation exige l'accès physique au point de sortie W3.");
 if(s.hold?.squadId===squadId)
  return fail(s,"Relève du poste en cours : transmettre la mission avant de quitter.");
 if(s.tracked?.secured&&!s.tracked.extracted&&s.tracked.carrierSquadId===squadId)
  return fail(s,"Le porteur d'une charge ou d'un témoin doit d'abord transférer son escorte.");
 const squads=s.squads.map(u=>u.id===squadId?
   {...u,status:"evacuated" as const}:u);
 const next=advance({...s,squads,
  overwatch:(s.overwatch??[]).filter(w=>w.squadId!==squadId),
  brace:(s.brace??[]).filter(w=>w.squadId!==squadId)},
  "Détachement "+unit.unitId+" évacué à pied par la sortie réelle ; "+unit.memberCount+
  " membres identifiés conservés hors du combat.");
 return accept(next,next.lastMessage);
}

/**
 * V138 — physical field triage using an EXISTING W3-U18 medic detachment.
 * One orthogonal step away from a fallen allied group, 3 exercise-RAV,
 * one use by each medic and one rescue per target. Members keep identities;
 * reviving the exercise pawn grants no territory, loot or XP.
 */
export function commandWarRtsMedicV138(
 s:WarRtsSquadsStateV133,medicId:string,targetId:string,rules:WarRulesV6,
):WarRtsSquadsUpdateV133 {
 if(s.phase!=="active"||s.report||s.sourceSha!==rules.metadata.sha256)
  return fail(s,"La séance médicale exige un théâtre actif et les vraies règles V6.");
 const medic=activeSquads(s).find(u=>u.id===medicId);
 const source=rules.units.find(u=>u.id==="W3-U18"&&u.fullMembers>0);
 if(!medic||medic.unitId!=="W3-U18"||!source)
  return fail(s,"Aucune équipe de soigneur de terrain W3-U18 déployée et valide.");
 if(s.ravRemaining<3)return fail(s,"Les soins d'exercice demandent 3 RAV disponibles.");
 const target=s.squads.find(u=>u.id===targetId&&u.id!==medicId&&
  u.status==="down"&&u.hp===0&&u.memberCount>0);
 if(!target)return fail(s,"Choisissez un véritable allié neutralisé, sans inventer de soldat.");
 if(distance(medic,target)!==1)
  return fail(s,"Secours impossible à distance : rejoindre physiquement une case adjacente.");
 const receipts=s.triageReceipts??[];
 if(receipts.some(r=>r.medicSquadId===medicId||r.rescuedSquadId===targetId))
  return fail(s,"Soigneur ou patient déjà mobilisé : une intervention par mission.");
 const hp=Math.min(target.maxHp,Math.max(2,Math.min(4,Math.ceil(target.maxHp/5))));
 const squads=s.squads.map(u=>u.id===target.id?{...u,hp,status:"active" as const}:u);
 const triageReceipts=[...receipts,{
  medicSquadId:medic.id,rescuedSquadId:target.id,atTurn:s.turn+1,
  memberCount:target.memberCount,
 }];
 const next=advance({...s,squads,triageReceipts,ravRemaining:s.ravRemaining-3},
  "Intervention W3-U18 auprès de "+target.unitId+" : "+hp+
  " PV d'exercice rétablis pour 3 RAV, aucun membre inventé.");
 return accept(next,next.lastMessage);
}

/**
 * V137: prepare the selected real detachment behind an existing cover tile.
 * Grants at most one damage reduction for two enemy-response ticks; command
 * itself consumes a full turn. Can only be issued once per squad, is lost
 * by moving/rallying, and does not create health, RAV or campaign XP.
 */
export function commandWarRtsBraceV137(
 state:WarRtsSquadsStateV133,squadId:string,
):WarRtsSquadsUpdateV133 {
 if(state.phase!=="active"||state.report)return fail(state,"Aucune bataille RTS active.");
 const unit=activeSquads(state).find(u=>u.id===squadId);
 if(!unit)return fail(state,"Détachement indisponible pour la défense.");
 if(!warMapTileV128(state.map,unit.x,unit.y)?.cover)
  return fail(state,"Le groupe doit se placer sur une vraie case de couvert W3.");
 if((state.braceIssuedIds??[]).includes(squadId))
  return fail(state,"Chaque formation ne peut se retrancher qu'une fois durant ce mandat.");
 if((state.overwatch??[]).some(order=>order.squadId===squadId))
  return fail(state,"La formation doit arrêter sa veille de tir avant de se retrancher.");
 const duration={squadId,expiresAt:state.turn+2};
 const next=advance({...state,brace:[...(state.brace??[]),duration],
   braceIssuedIds:[...(state.braceIssuedIds??[]),squadId]},
   "Formation "+unit.unitId+" en couvert réel pour deux réactions adverses, sans bonus de vie ni RAV.");
 return accept(next,next.lastMessage);
}

/**
 * Arm a real squad to watch its local W3 lanes for two simulation ticks.
 * The next hostile to appear in the unit's actual LOS/range takes a normal
 * V6-derived response shot (1 RAV), at most once. No remote attack and no
 * RAV pre-charge when no enemy appears.
 */
export function commandWarRtsOverwatchV136(
 state:WarRtsSquadsStateV133,squadId:string,
):WarRtsSquadsUpdateV133{
 if(state.phase!=="active"||state.report)return fail(state,"Aucune bataille RTS active.");
 const ally=activeSquads(state).find(unit=>unit.id===squadId);
 if(!ally)return fail(state,"Escouade de veille absente ou neutralisée.");
 if(state.ravRemaining<1)return fail(state,"Aucun RAV disponible pour un tir de veille éventuel.");
 if((state.overwatch??[]).some(w=>w.squadId===squadId))
  return fail(state,"Cette escouade surveille déjà physiquement son secteur.");
 const pending=[...(state.overwatch??[]),{squadId,expiresAt:state.turn+2}];
 return issue(state,"Veille tactique engagée par "+ally.unitId+
  " pour deux tours maximum, sans tir invisible ni munition prélevée à vide.",
  {overwatch:pending});
}

/**
 * V135 squad fire suppression: spend 2 exercise-RAV from a known, live,
 * adjacent-range line of sight. The targeted rival misses exactly ONE
 * response turn; no free hit, invisible targeting, stun lore or campaign XP.
 */
export function commandWarRtsSuppressV135(
 state:WarRtsSquadsStateV133,squadId:string,enemyId:string,
):WarRtsSquadsUpdateV133{
 if(state.phase!=="active"||state.report)return fail(state,"Aucune bataille RTS active.");
 const unit=activeSquads(state).find(u=>u.id===squadId);
 if(!unit)return fail(state,"Cette escouade ne peut pas effectuer le tir de couverture.");
 if(state.ravRemaining<2)return fail(state,"Le tir de suppression nécessite 2 RAV d'exercice.");
 const target=visibleWarRtsEnemiesV133(state).find(e=>e.id===enemyId);
 if(!target||distance(unit,target)>unit.range||
    !warMapLineOfSightV128(state.map,unit,target))
  return fail(state,"Un adversaire confirmé doit être visible et à portée réelle.");
 // Real damage belongs to a normal shot; suppression is a trade-off with
 // the same physical ammo budget, not a scripted instant neutralization.
 const next=advance({...state,ravRemaining:state.ravRemaining-2,
  suppressedEnemyIds:[target.id]},
  "Tir de couverture de "+unit.unitId+" sur "+target.unitId+
  " (2 RAV) : réponse adverse interrompue pour un seul tour.");
 return accept(next,next.lastMessage);
}

/**
 * V134: synchronized 2D rally movement, authored as an ORIGINAL clan-war
 * tactical convenience. One group command = at most one physical tile per
 * squad and exactly ONE enemy/environment turn; no simulated teleport,
 * extra RAV, campaign award, server authority or automatic objective.
 * All planned routes honor the original W3 tactical map and door state.
 */
export interface WarRtsRallyStepV134 {
 squadId:string;unitId:string;from:WarMapPointV128;to:WarMapPointV128;remainingCells:number;
}
export interface WarRtsRallyPlanV134 {
 valid:boolean;reason:string;target:WarMapPointV128;
 squadIds:string[];steps:WarRtsRallyStepV134[];
 holdingIds:string[];blockedIds:string[];
}
export function planWarRtsRallyV134(
 s:WarRtsSquadsStateV133,squadIds:readonly string[],target:WarMapPointV128,
):WarRtsRallyPlanV134 {
 const result:WarRtsRallyPlanV134={
  valid:false,reason:"",target:target?{x:target.x,y:target.y}:{x:-1,y:-1},
  squadIds:Array.isArray(squadIds)?[...squadIds]:[],steps:[],holdingIds:[],blockedIds:[],
 };
 if(s.phase!=="active"||s.report){result.reason="Seul un combat actif peut recevoir un ordre collectif.";return result;}
 if(!Array.isArray(squadIds)||squadIds.length<1||squadIds.length>4||
    new Set(squadIds).size!==squadIds.length){
  result.reason="Sélectionnez de une à quatre escouades distinctes.";return result;
 }
 if(!target||!Number.isInteger(target.x)||!Number.isInteger(target.y)||
    !warMapWalkableV128(s.map,target)){
  result.reason="Le point de rassemblement doit être une case traversable de la carte W3.";return result;
 }
 if(!s.power&&s.map.poweredDoors.some(p=>at(p)===at(target))){
  result.reason="La cible est derrière une porte motorisée sans courant.";return result;
 }
 const units=squadIds.map(id=>s.squads.find(u=>u.id===id&&u.status==="active"&&u.hp>0));
 if(units.some(u=>!u)){result.reason="Une escouade sélectionnée est absente ou hors de combat.";return result;}
 // The commander may route only around adversaries currently in line of sight.
 // Hidden patrol positions must not leak through path selections or warnings.
 const occupiedByEnemy=visibleWarRtsEnemiesV133(s);
 const inaccessible=s.power?[]:s.map.poweredDoors;
 const unsafe=hazardsNow(s.turn+1)?s.map.hazards:[];
 const candidates:WarMapPointV128[]=[];
 for(let y=Math.max(0,target.y-2);y<=Math.min(s.map.height-1,target.y+2);y++)
  for(let x=Math.max(0,target.x-2);x<=Math.min(s.map.width-1,target.x+2);x++){
   const p=pos(x,y);
   if(distance(p,target)<=2&&warMapWalkableV128(s.map,p)&&
      !inaccessible.some(t=>at(t)===at(p))&&
      !unsafe.some(t=>at(t)===at(p))&&
      !occupiedByEnemy.some(e=>at(e)===at(p)))candidates.push(p);
  }
 if(!candidates.length){result.reason="Aucune place de rassemblement sûre autour du point.";return result;}
 const reserved=new Set<string>();
 for(const unit of units){
  if(!unit)continue;
  const from=pos(unit.x,unit.y);
  if(distance(from,target)<=2){result.holdingIds.push(unit.id);reserved.add(at(from));continue;}
  const occupied=[
   ...activeSquads(s).filter(other=>other.id!==unit.id),
   ...occupiedByEnemy,...inaccessible,...unsafe,
   ...[...reserved].map(cell=>{const [x,y]=cell.split(",").map(Number);return pos(x,y);}),
  ];
  const forbidden=new Set(occupied.map(at));
  let best:{route:WarMapPointV128[];goal:WarMapPointV128}|null=null;
  for(const goal of candidates){
   if(forbidden.has(at(goal)))continue;
   const route=warMapFindPathV128(s.map,from,goal,occupied);
   if(!route||route.length<2)continue;
   const next=route[1];
   if(forbidden.has(at(next)))continue;
   if(!best||route.length<best.route.length||
      route.length===best.route.length&&distance(goal,target)<distance(best.goal,target)||
      route.length===best.route.length&&distance(goal,target)===distance(best.goal,target)&&
        (goal.y<best.goal.y||goal.y===best.goal.y&&goal.x<best.goal.x))
    best={route,goal};
  }
  if(!best){result.blockedIds.push(unit.id);continue;}
  const next=best.route[1];
  if(distance(from,next)!==1||reserved.has(at(next))){result.blockedIds.push(unit.id);continue;}
  result.steps.push({squadId:unit.id,unitId:unit.unitId,from,to:pos(next.x,next.y),
   remainingCells:best.route.length-2});
  reserved.add(at(next));
 }
 result.valid=true;
 result.reason=result.steps.length?
  result.steps.length+" déplacement(s) synchronisé(s) possibles ; 1 seul tour de réaction adverse.":
  result.blockedIds.length?
   "Tous les itinéraires sont actuellement obstrués ; changez le point ou la formation.":
   "Les escouades sélectionnées se trouvent déjà dans le périmètre de regroupement.";
 return result;
}
export function commandWarRtsRallyV134(
 s:WarRtsSquadsStateV133,squadIds:readonly string[],target:WarMapPointV128,
):WarRtsSquadsUpdateV133 {
 const plan=planWarRtsRallyV134(s,squadIds,target);
 if(!plan.valid||!plan.steps.length)return fail(s,plan.reason);
 // Simulate *actual* physical occupancy only at execution. The player did
 // not know hidden enemy positions during planning; a surprise stop consumes
 // its tactical turn but never reveals an unseen enemy identity or overlaps it.
 const actualRivals=new Set(s.enemies.filter(e=>e.hp>0).map(at));
 const safeSteps=plan.steps.filter(step=>!actualRivals.has(at(step.to)));
 const unexpected=plan.steps.length-safeSteps.length;
 const moves=new Map(safeSteps.map(step=>[step.squadId,step.to]));
 const nextSquads=s.squads.map(u=>{
  const location=moves.get(u.id);return location?{...u,x:location.x,y:location.y}:u;
 });
 // One advance, even with four simultaneous orders: no hidden extra AI turns.
 const next=advance({...s,squads:nextSquads,
  overwatch:(s.overwatch??[]).filter(w=>!moves.has(w.squadId)),
  brace:(s.brace??[]).filter(b=>!moves.has(b.squadId))},
  "Rassemblement tactique W3 "+at(target)+" : "+safeSteps.length+
  " escouade(s) déplacée(s) d'une case, "+
  (plan.blockedIds.length+unexpected)+" progression(s) bloquée(s) ou incertaines.");
 return accept(next,next.lastMessage);
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
