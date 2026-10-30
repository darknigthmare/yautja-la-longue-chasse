import {
 acceptWarMultiplayerCommandV126,advanceWarMultiplayerServerTickV126,
 type WarLobbyV126,type WarClientCommandV126,type WarLobbySideV126,
} from "./clanWarMultiplayerV126";

/**
 * V127 LOCAL deterministic multiplayer rules harness, NOT an online server.
 * The 9×6 arena is an exercise with independent practice-unit identities.
 * Any production game must load actual committed W3-U fighters from server-side
 * inventories, use account authentication, secure replay-resistant storage,
 * and reconcile transactions across real campaigns.
 */
export interface WarMatchFighterV127{
 id:string;ownerId:string;side:"hunter"|"rival";
 x:number;y:number;hp:number;actedTick:number;status:"fit"|"down";
}
export interface WarMultiplayerPracticeV127 {
 version:127;room:WarLobbyV126;fighters:WarMatchFighterV127[];
 map:{width:9;height:6;capture:{x:4;y:2};blocked:readonly string[];cover:readonly string[]};
 hold:{hunter:number;rival:number};winner:"hunter"|"rival"|null;eventLog:string[];
 campaignWrite:"forbidden";saveScope:"practice-memory-only";
}
export interface WarMatchActionResultV127{
 accepted:boolean;state:WarMultiplayerPracticeV127;reason:string;
}
const blocked=Object.freeze(["4,0","4,5"]);
const cover=Object.freeze(["3,1","4,3","5,4"]);
const pos=(x:number,y:number)=>x+","+y;
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const reject=(state:WarMultiplayerPracticeV127,reason:string):WarMatchActionResultV127=>
 ({accepted:false,state,reason});
const accept=(state:WarMultiplayerPracticeV127,reason:string):WarMatchActionResultV127=>
 ({accepted:true,state,reason});
function lineClear(a:WarMatchFighterV127,b:WarMatchFighterV127):boolean{
 if(a.x===b.x){
  const min=Math.min(a.y,b.y),max=Math.max(a.y,b.y);
  for(let y=min+1;y<max;y++)if(blocked.includes(pos(a.x,y)))return false;
  return true;
 }
 if(a.y===b.y){
  const min=Math.min(a.x,b.x),max=Math.max(a.x,b.x);
  for(let x=min+1;x<max;x++)if(blocked.includes(pos(x,a.y)))return false;
  return true;
 }
 return false;
}
function finishState(state:WarMultiplayerPracticeV127):WarMultiplayerPracticeV127{
 if(state.winner)return state;
 const living=state.fighters.filter(f=>f.hp>0);
 const hunter=state.fighters.filter(f=>f.side==="hunter");
 const rival=state.fighters.filter(f=>f.side==="rival");
 const elimination=hunter.length>0&&rival.length>0?
   !living.some(f=>f.side==="hunter")?"rival":
     !living.some(f=>f.side==="rival")?"hunter":null:null;
 const objective=state.hold.hunter>=3?"hunter":state.hold.rival>=3?"rival":null;
 const winner=elimination??objective;
 return winner?{...state,winner,room:{...state.room,stage:"completed"}}:state;
}
export function createWarMultiplayerPracticeV127(room:WarLobbyV126):WarMultiplayerPracticeV127{
 if(room.schema!==126||room.stage!=="started"||room.authority!=="server-required"||
  room.campaignWrite!=="forbidden")
  throw Error("Un salon de règles validé et démarré est nécessaire.");
 const members=room.members.filter(m=>m.side!=="observer");
 const counts={hunter:0,rival:0},fighters:WarMatchFighterV127[]=[];
 for(const member of members){
  for(const unitId of member.unitInstanceIds){
   if(fighters.some(f=>f.id===unitId))throw Error("Un combattant appartient à deux joueurs.");
   const i=counts[member.side]++;
   // Local training board: maximum eight source-instance actors per side.
   // A production 4v4/large-army battle requires its own wider tactical map.
   if(i>=8)throw Error("Le tableau d'exercice 9×6 limite chaque camp à huit pions.");
   const x=member.side==="hunter"?(i<4?1:2):(i<4?7:6);
   const y=i%4+1;
   fighters.push({id:unitId,ownerId:member.id,side:member.side,x,y,hp:12,
    actedTick:-1,status:"fit"});
  }
 }
 if(!fighters.length)throw Error("Aucun combattant déclaré.");
 return {version:127,room,stage:undefined as never, fighters,
  map:{width:9,height:6,capture:{x:4,y:2},blocked,cover},
  hold:{hunter:0,rival:0},winner:null,
  eventLog:[],campaignWrite:"forbidden",saveScope:"practice-memory-only"};
}
export function applyWarMultiplayerPracticeCommandV127(
 state:WarMultiplayerPracticeV127,command:WarClientCommandV126,
 authenticatedActorId:string,
):WarMatchActionResultV127 {
 if(state.winner)return reject(state,"La manche est terminée.");
 const actor=state.fighters.find(f=>f.id===command.unitInstanceId&&f.ownerId===authenticatedActorId);
 if(!actor||actor.hp<=0)return reject(state,"Ce pion n'appartient pas au joueur actif.");
 if(actor.actedTick===state.room.tick)return reject(state,"Une action par pion et par tick.");
 const kind=command.kind;
 if(!["move","attack","hold","retreat"].includes(kind))
  return reject(state,"Action d'exercice non implémentée ; aucun résultat simulé.");
 const target=(command.targetX!==null&&command.targetY!==null)?
  {x:command.targetX,y:command.targetY}:null;
 const targetWithin=!!target&&Number.isInteger(target.x)&&Number.isInteger(target.y)&&
  target.x>=0&&target.x<9&&target.y>=0&&target.y<6;
 const nextUnits=state.fighters.map(x=>({...x})),moving=nextUnits.find(x=>x.id===actor.id)!;
 if(kind==="move"){
  if(!targetWithin||dist(actor,target!)!==1||blocked.includes(pos(target!.x,target!.y))||
    nextUnits.some(f=>f.id!==actor.id&&f.hp>0&&f.x===target!.x&&f.y===target!.y))
    return reject(state,"Déplacement illégal, obstacle, éloignement ou case occupée.");
  moving.x=target!.x;moving.y=target!.y;
 }else if(kind==="attack"){
  if(!targetWithin||dist(actor,target!)>2)return reject(state,"Portée d'exercice dépassée.");
  const rival=nextUnits.find(f=>f.hp>0&&f.side!==actor.side&&f.x===target!.x&&f.y===target!.y);
  if(!rival||!lineClear(actor,rival))return reject(state,"Aucune cible visible ou attaque à travers un mur.");
  const protection=cover.includes(pos(rival.x,rival.y));
  rival.hp=Math.max(0,rival.hp-(protection?2:4));
  if(!rival.hp)rival.status="down";
 }else if(kind==="retreat"){
  // Retreat never destroys a wounded person or claims an enemy territory.
  if(actor.side==="hunter"&&actor.x>2||actor.side==="rival"&&actor.x<6)
   return reject(state,"Le pion doit regagner sa vraie bordure avant extraction.");
  moving.hp=0;moving.status="down";
 }else if(kind==="hold"&&target!==null){
  return reject(state,"Tenir la position ne téléporte pas vers une cible.");
 }
 const authorized=acceptWarMultiplayerCommandV126(state.room,command,authenticatedActorId);
 if(!authorized.accepted)return reject(state,authorized.reason);
 moving.actedTick=state.room.tick;
 const next=finishState({...state,room:authorized.room,fighters:nextUnits,
  eventLog:[...state.eventLog,(kind==="attack"?"Engagement":kind==="retreat"?"Repli":
    kind==="hold"?"Couvert":"Déplacement")+" "+actor.id+" au tick "+state.room.tick].slice(-80)});
 return accept(next,"Ordre accepté uniquement par le simulateur local ; aucune synchronisation distante.");
}
export function stepWarMultiplayerPracticeV127(state:WarMultiplayerPracticeV127):WarMatchActionResultV127{
 if(state.winner||state.room.stage!=="started")return reject(state,"Manche non active.");
 const tick=advanceWarMultiplayerServerTickV126(state.room);
 if(!tick.accepted)return reject(state,tick.reason);
 const alive=state.fighters.filter(f=>f.hp>0);
 const controlled=state.map.capture;
 const onObjective=(side:"hunter"|"rival")=>alive.some(f=>f.side===side&&f.x===controlled.x&&f.y===controlled.y);
 const h=onObjective("hunter"),r=onObjective("rival");
 const hold={hunter:h&&!r?state.hold.hunter+1:0,rival:r&&!h?state.hold.rival+1:0};
 const next=finishState({...state,room:tick.room,hold,eventLog:[...state.eventLog,
  "Tick "+tick.room.tick+" : point "+(h&&r?"contesté":h?"tenu par chasseurs":r?"tenu par rivaux":"neutre")].slice(-80)});
 return accept(next,"Tick calculé localement, objectif tenu "+Math.max(hold.hunter,hold.rival)+"/3.");
}
export function viewWarMultiplayerPracticeV127(state:WarMultiplayerPracticeV127,viewerId:string){
 const viewer=state.room.members.find(m=>m.id===viewerId);
 if(!viewer)return null;
 const friends=state.fighters.filter(f=>f.side===viewer.side&&f.hp>0);
 const ownIds=new Set(friends.map(f=>f.id));
 const visible=state.fighters.filter(f=>f.hp>0&&(ownIds.has(f.id)||
   friends.some(ally=>dist(ally,f)<=3)));
 return {
  stage:state.room.stage,seed:state.room.seed,tick:state.room.tick,
  capture:state.map.capture,winner:state.winner,
  // spectators cannot reveal other factions merely by claiming membership.
  fighters:viewer.side==="observer"?[]:visible.map(f=>({...f})),
  blocked:[...state.map.blocked],cover:[...state.map.cover],
  events:state.eventLog.filter(text=>viewer.side!=="observer"||text.startsWith("Tick")),
 };
}
