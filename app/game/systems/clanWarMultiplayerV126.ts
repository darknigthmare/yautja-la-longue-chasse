import {CLAN_WAR_COHERENT_VARIANTS_V126} from "./clanWarWorldClimateV126";
export type WarMultiplayerModeV126="co-op"|"clan-pvp"|"async-clan";
export type WarLobbyStageV126="open"|"ready"|"started"|"completed";
export type WarLobbySideV126="hunter"|"rival"|"observer";
export type WarLobbyRoleV126="leader"|"member"|"spectator";
export type WarMultiplayerCommandKindV126="move"|"attack"|"deploy"|"hold"|"interact"|"retreat";
export interface WarMultiplayerMemberV126 {
 id:string;displayName:string;role:WarLobbyRoleV126;side:WarLobbySideV126;
 ready:boolean;connected:boolean;unitInstanceIds:string[];lastSequence:number;
}
export interface WarLobbyV126 {
 schema:126;id:string;scenarioId:string;worldId:string;mode:WarMultiplayerModeV126;
 revision:number;stage:WarLobbyStageV126;hostId:string;hostTokenHash:string;
 seed:number;tick:number;maxMembers:number;members:WarMultiplayerMemberV126[];
 commands:WarAcceptedCommandV126[];receipts:string[];
 authority:"server-required";campaignWrite:"forbidden";
}
export interface WarClientCommandV126 {
 clientCommandId:string;actorId:string;sequence:number;expectedRevision:number;
 tick:number;kind:WarMultiplayerCommandKindV126;unitInstanceId:string;
 targetX:number|null;targetY:number|null;
}
export interface WarAcceptedCommandV126 extends WarClientCommandV126 {
 acceptedRevision:number;serverTick:number;
}
export interface WarLobbyChangeV126 {accepted:boolean;room:WarLobbyV126;reason:string;}
const ID=/^[A-Za-z0-9:_-]{2,100}$/;
const allowed=(name:string)=>typeof name==="string"&&name.length>=2&&name.length<=40;
const reject=(room:WarLobbyV126,reason:string):WarLobbyChangeV126=>({accepted:false,room,reason});
const accept=(room:WarLobbyV126,reason:string):WarLobbyChangeV126=>({accepted:true,room,reason});
const validInstance=(id:string)=>ID.test(id);
const sourceFor=(id:string)=>CLAN_WAR_COHERENT_VARIANTS_V126.find(x=>x.sourceId===id);
const maxFor=(mode:WarMultiplayerModeV126)=>mode==="co-op"?4:mode==="clan-pvp"?8:12;
function clonedMember(member:WarMultiplayerMemberV126):WarMultiplayerMemberV126{
 return {...member,unitInstanceIds:[...member.unitInstanceIds]};
}
function uniqueOwners(room:WarLobbyV126,ownerId:string,unitIds:readonly string[]){
 const occupied=new Set(room.members.filter(m=>m.id!==ownerId).flatMap(m=>m.unitInstanceIds));
 return unitIds.every(id=>!occupied.has(id));
}
export function createWarMultiplayerLobbyV126(
 roomId:string,scenarioId:string,mode:WarMultiplayerModeV126,
 hostId:string,hostName:string,hostTokenHash:string,seed:number,
):WarLobbyV126 {
 if(!ID.test(roomId)||!ID.test(hostId)||!allowed(hostName)||!ID.test(hostTokenHash)||
   !Number.isSafeInteger(seed)||seed<0||!["co-op","clan-pvp","async-clan"].includes(mode))
   throw Error("Paramètres de salon de clan invalides");
 const scenario=sourceFor(scenarioId);
 if(!scenario||scenario.geography.worldKind==="unresolved-fiction")
   throw Error("La zone du scénario doit être physiquement référencée avant la partie réseau");
 return {
  schema:126,id:roomId,scenarioId,worldId:scenario.geography.worldId,mode,
  revision:0,stage:"open",hostId,hostTokenHash,seed,tick:0,maxMembers:maxFor(mode),
  members:[{id:hostId,displayName:hostName,role:"leader",side:"hunter",ready:false,
   connected:true,unitInstanceIds:[],lastSequence:0}],
  commands:[],receipts:[],authority:"server-required",campaignWrite:"forbidden",
 };
}
export function joinWarMultiplayerLobbyV126(
 room:WarLobbyV126,id:string,displayName:string,side:WarLobbySideV126,
):WarLobbyChangeV126 {
 if(room.stage!=="open")return reject(room,"Le salon est verrouillé ou le scénario a commencé.");
 if(!ID.test(id)||!allowed(displayName)||!["hunter","rival","observer"].includes(side))
  return reject(room,"Identité ou faction invalide.");
 if(room.members.some(m=>m.id===id))return reject(room,"Identifiant déjà présent, reprise de connexion requise.");
 const spectators=room.members.filter(m=>m.side==="observer").length;
 if(side==="observer"&&spectators>=4)return reject(room,"Spectateurs limités à quatre.");
 if(side!=="observer"&&room.members.filter(m=>m.side!=="observer").length>=room.maxMembers)
  return reject(room,"Le salon a atteint sa capacité combattante.");
 if(room.mode==="co-op"&&side==="rival")return reject(room,"Le mode coopération n'accepte pas de faction humaine adverse.");
 const member:WarMultiplayerMemberV126={
  id,displayName,side,role:side==="observer"?"spectator":"member",
  ready:side==="observer",connected:true,unitInstanceIds:[],lastSequence:0,
 };
 return accept({...room,revision:room.revision+1,members:[...room.members,member]},"Place réservée sans unité créée.");
}
export function setWarMultiplayerLoadoutV126(
 room:WarLobbyV126,id:string,unitInstanceIds:readonly string[],
):WarLobbyChangeV126 {
 if(room.stage!=="open"||!Array.isArray(unitInstanceIds)||unitInstanceIds.length>4||
  new Set(unitInstanceIds).size!==unitInstanceIds.length||unitInstanceIds.some(a=>!validInstance(a)))
  return reject(room,"Identifiants de détachements ou phase invalides.");
 const member=room.members.find(m=>m.id===id);
 if(!member||member.side==="observer")return reject(room,"Un spectateur ne peut pas recevoir des combattants.");
 if(!uniqueOwners(room,id,unitInstanceIds))return reject(room,"La même équipe ne peut appartenir à deux joueurs.");
 return accept({...room,revision:room.revision+1,members:room.members.map(m=>
   m.id===id?{...m,unitInstanceIds:[...unitInstanceIds],ready:false}:clonedMember(m))},
   "Affectation locale enregistrée ; disponibilité réelle à vérifier par l'autorité.");
}
export function setWarMultiplayerReadyV126(room:WarLobbyV126,id:string,ready:boolean):WarLobbyChangeV126 {
 if(room.stage!=="open"||typeof ready!=="boolean")return reject(room,"Phase de préparation terminée.");
 const member=room.members.find(x=>x.id===id);
 if(!member||member.side==="observer"||(!member.unitInstanceIds.length&&ready))
  return reject(room,"Le joueur doit posséder au moins une équipe déclarée.");
 return accept({...room,revision:room.revision+1,members:room.members.map(m=>
  m.id===id?{...clonedMember(m),ready}:clonedMember(m))},"Statut de préparation mis à jour.");
}
export function startWarMultiplayerLobbyV126(room:WarLobbyV126,requesterId:string):WarLobbyChangeV126 {
 if(room.stage!=="open"||room.hostId!==requesterId)return reject(room,"Seul le chef de clan lance une manche.");
 const combatants=room.members.filter(m=>m.side!=="observer");
 if(combatants.length<2||combatants.some(m=>!m.ready||!m.connected||!m.unitInstanceIds.length))
  return reject(room,"Deux joueurs présents au minimum, tous prêts et affectés.");
 if(room.mode!=="co-op"&&(!combatants.some(m=>m.side==="hunter")||!combatants.some(m=>m.side==="rival")))
  return reject(room,"La guerre entre clans exige des combattants des deux côtés.");
 if(room.mode==="clan-pvp"&&Math.abs(combatants.filter(m=>m.side==="hunter").length-
  combatants.filter(m=>m.side==="rival").length)>1)
  return reject(room,"Équipes déséquilibrées ; écart maximal d'un joueur.");
 const newRoom={...room,revision:room.revision+1,stage:"started" as const};
 return accept(newRoom,"Simulation initialisée à seed identique pour tous ; moteur réseau autoritaire encore à raccorder.");
}
/**
 * This routine is for the FUTURE authoritative server. Never call it from
 * untrusted client UI as proof of a real remote multiplayer move.
 * Ownership, revision, tick, replays and map bounds checked before acceptance.
 */
export function acceptWarMultiplayerCommandV126(
 room:WarLobbyV126,command:WarClientCommandV126,authenticatedActorId:string,
):WarLobbyChangeV126 {
 if(!ID.test(authenticatedActorId)||authenticatedActorId!==command.actorId)
  return reject(room,"Identité de commande non authentifiée par l'hôte autoritaire.");
 if(room.stage!=="started")return reject(room,"Partie non démarrée.");
 if(!ID.test(command.clientCommandId)||!ID.test(command.actorId)||!ID.test(command.unitInstanceId)||
  !Number.isSafeInteger(command.sequence)||command.sequence<1||
  !Number.isSafeInteger(command.expectedRevision)||!Number.isSafeInteger(command.tick)||
  !["move","attack","deploy","hold","interact","retreat"].includes(command.kind))
  return reject(room,"Commande invalide.");
 if(room.receipts.includes(command.clientCommandId))return reject(room,"Commande déjà traitée (anti-replay).");
 if(command.expectedRevision!==room.revision||command.tick!==room.tick)
  return reject(room,"Révision ou tick désynchronisés.");
 const sender=room.members.find(x=>x.id===command.actorId);
 if(!sender||sender.side==="observer"||!sender.connected||!sender.unitInstanceIds.includes(command.unitInstanceId))
  return reject(room,"Autorité sur le détachement non accordée.");
 if(command.sequence<=sender.lastSequence)return reject(room,"Séquence périmée ou rejouée.");
 if(command.targetX!==null&&(!Number.isInteger(command.targetX)||command.targetX<0||command.targetX>100))
  return reject(room,"Coordonnée X hors carte tactique.");
 if(command.targetY!==null&&(!Number.isInteger(command.targetY)||command.targetY<0||command.targetY>100))
  return reject(room,"Coordonnée Y hors carte tactique.");
 if(room.receipts.length>=2000)return reject(room,"Journal complet, archivage serveur requis.");
 const nextRevision=room.revision+1;
 return accept({...room,revision:nextRevision,
   members:room.members.map(m=>m.id===sender.id?{...clonedMember(m),lastSequence:command.sequence}:clonedMember(m)),
   receipts:[...room.receipts,command.clientCommandId],
   commands:[...room.commands,{...command,acceptedRevision:nextRevision,serverTick:room.tick}]},
 "Commande acceptée dans le protocole autoritaire ; animation et dégâts encore à implémenter.");
}
export function advanceWarMultiplayerServerTickV126(room:WarLobbyV126):WarLobbyChangeV126 {
 if(room.stage!=="started"||room.tick>=20000)return reject(room,"Tick interdit ou partie arrêtée.");
 return accept({...room,revision:room.revision+1,tick:room.tick+1,
   commands:room.commands.slice(-300)},"Tick déterministe avancé par l'hôte autoritaire.");
}
export function visibleWarMultiplayerStateV126(room:WarLobbyV126,viewerId:string){
 const viewer=room.members.find(m=>m.id===viewerId);
 if(!viewer)return null;
 const ownSide=viewer.side;
 return {
  id:room.id,scenarioId:room.scenarioId,worldId:room.worldId,
  mode:room.mode,stage:room.stage,tick:room.tick,revision:room.revision,
  players:room.members.map(member=>({
   id:member.id,displayName:member.displayName,side:member.side,ready:member.ready,
   connected:member.connected,
   // Never disclose rival's unit identities prior to real spotting.
   unitInstanceIds:member.side===ownSide?member.unitInstanceIds:[],
  })),
  commands:room.commands.filter(cmd=>cmd.actorId===viewerId),
 };
}
export const WAR_MULTIPLAYER_DEPLOYMENT_GATES_V126=Object.freeze([
 "Dedicated authoritative session service / WebSocket transport",
 "Backend authentication, signed membership and reconnection tokens",
 "Simulation tick reconciliation and source-validated unit inventory",
 "Persistent campaign transactions with unique server receipts",
 "Latency compensation, matchmaking, NAT and network quality tests",
 "Visibility/fog-of-war and spectating permission integration",
 "Multiplayer QA: sync, rollbacks, hot join, dropped connections, griefing",
]);
