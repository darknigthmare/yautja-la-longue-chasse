import {
  applyWarResultV6, createWarTeamV6, planWarRouteV6,
  type WarRulesV6, type WarTeamStateV6,
} from "./clanWarBibleV6";

/**
 * V115: self-contained V6 training theatre. This is NOT a CON-T/RTS-U campaign
 * adapter, a canonical clan war, a source of loot, or a hidden-enemy predictor.
 * It deliberately never changes a WarSimulationV85 or the campaign SaveGame.
 */
export const WAR_OPERATIONS_STORAGE_V115 = "yautja.clan-war.v115.operations.free.v1";
export type WarMissionModeV115 = "assault" | "outer" | "stealth" | "rts";
export type WarMissionOutcomeV115 = "victory" | "defeat" | "retreat";
export type OuterFocusV115 = "recon" | "intercept" | "escort";
type Side = "ally" | "rival";
export interface WarMissionActorV115 { id: string; teamId: string | null; unitId: string; side: Side; x: number; hp: number }
export interface WarRtsActorV115 extends WarMissionActorV115 { y: number }
export interface WarAssaultV115 {
  ap: number; ownBase: number; rivalBase: number;
  actors: WarMissionActorV115[]; launched: string[]; fallen: string[];
}
export interface WarStealthV115 { x: number; y: number; guardX: number; guardDirection: -1 | 1; alarm: number; cloaked: boolean; energy: number; sabotaged: boolean }
export interface WarRtsV115 { actors: WarRtsActorV115[]; hold: number; fallen: string[] }
export interface WarPlayableMissionV115 {
  id: string; mode: "assault" | "stealth" | "rts"; targetId: string; teamIds: string[];
  tick: number; assault?: WarAssaultV115; stealth?: WarStealthV115; rts?: WarRtsV115;
}
export interface WarOuterMissionV115 {
  id: string; targetId: string; teamIds: string[]; focus: OuterFocusV115;
  startedAt: number; dueAt: number; routeIds: string[];
}
export interface WarMissionReportV115 {
  id: string; mode: WarMissionModeV115; focus: OuterFocusV115 | null;
  targetId: string; outcome: WarMissionOutcomeV115; clock: number;
  teamIds: string[]; woundedIds: string[]; sourceIds: string[]; summary: string;
}
export interface WarOperationsStateV115 {
  version: 1; context: "free"; sourceSha: string; baseId: string;
  serial: number; clock: number; rav: number;
  teams: WarTeamStateV6[]; assignments: Record<string, string>;
  active: WarPlayableMissionV115 | null; outer: WarOuterMissionV115[];
  intelIds: string[]; weakenedIds: string[]; escortedIds: string[];
  pressure: Record<string, number>; reports: WarMissionReportV115[];
}
export interface WarOperationsUpdateV115 { state: WarOperationsStateV115; accepted: boolean; message: string }
const MAX_REPORTS = 120;
const STEALTH_WALLS = new Set(["3,2", "3,3", "5,3", "6,4"]);
const reject = (state: WarOperationsStateV115, message: string): WarOperationsUpdateV115 => ({ state, accepted: false, message });
const accept = (state: WarOperationsStateV115, message: string): WarOperationsUpdateV115 => ({ state, accepted: true, message });
const clamp = (number: number, min: number, max: number) => Math.max(min, Math.min(max, number));
const isTextId = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9:_-]{1,150}$/.test(value);
const coord = (x: number, y: number) => String(x) + "," + String(y);
const distance = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
const unique = (items: string[]) => [...new Set(items)];
const ownTeam = (state: WarOperationsStateV115, id: string) => state.teams.find(item => item.id === id);
const unitFor = (rules: WarRulesV6, unitId: string) => rules.units.find(unit => unit.id === unitId);
const lifeFor = (unitId: string, rules: WarRulesV6) => {
  const unit = unitFor(rules, unitId);
  return clamp(Math.round((unit?.defense ?? 4) / 2) + (unit?.fullMembers ?? 1) * 2, 6, 45);
};
const damageFor = (unitId: string, rules: WarRulesV6) => clamp(Math.ceil((unitFor(rules, unitId)?.attack ?? 3) / 3), 2, 15);
function missionId(state: WarOperationsStateV115): string {
  return "W115-OPS-" + String(state.serial + 1).padStart(4,"0");
}
function available(state: WarOperationsStateV115, id: string) {
  const team = ownTeam(state,id);
  return !!team && !state.assignments[id] && team.members.some(member => member.status === "fit");
}
export function createWarOperationsV115(rules: WarRulesV6): WarOperationsStateV115 {
  const eligible = rules.units.filter(unit => unit.fullMembers > 0 && unit.commandPoints > 0 && unit.attack >= 0 && unit.defense >= 0);
  const teams = eligible.slice(0, 8).map((unit, index) => createWarTeamV6(unit.id, "W115-TEAM-" + String(index+1).padStart(2,"0"), rules)!).filter(Boolean);
  return {
    version: 1, context: "free", sourceSha: rules.metadata.sha256, baseId: rules.territories[0]?.id ?? "",
    serial: 0, clock: 0, rav: rules.parameters.rav_cap, teams, assignments: {},
    active: null, outer: [], intelIds: [], weakenedIds: [], escortedIds: [], pressure: {}, reports: [],
  };
}
export function warMissionEligibleV115(state: WarOperationsStateV115, rules: WarRulesV6, targetId: string, teamIds: string[]): string | null {
  if (state.sourceSha !== rules.metadata.sha256) return "La source des règles a changé : ce front ne peut pas être réinterprété.";
  if (!rules.territories.some(item => item.id === targetId) || targetId === state.baseId) return "Choisissez un territoire extérieur au départ.";
  if (!Array.isArray(teamIds) || teamIds.length < 1 || teamIds.length > 4 || unique(teamIds).length !== teamIds.length) return "Choisissez de une à quatre équipes différentes.";
  if (!teamIds.every(id => available(state,id))) return "Un détachement est déjà engagé, absent ou entièrement indisponible.";
  const units = teamIds.map(id => unitFor(rules, ownTeam(state,id)!.unitId)!);
  const pc = units.reduce((total,unit) => total + unit.commandPoints,0);
  if (pc > rules.parameters.pc_cap_1) return "Le groupe dépasse le plafond de commandement V6.";
  const route = planWarRouteV6(state.baseId,targetId,pc,[],rules);
  if (!route) return "Aucun passage V6 réellement praticable avec ce détachement.";
  const expense = units.reduce((total,unit) => total + unit.upkeepRav,0);
  if (state.rav < expense) return "RAV insuffisant pour l'entretien réel des équipes engagées.";
  return null;
}
function reserve(state: WarOperationsStateV115, targetId:string, teamIds:string[], rules:WarRulesV6) {
  const id = missionId(state);
  const expense = teamIds.reduce((total,teamId) => total + (unitFor(rules,ownTeam(state,teamId)!.unitId)?.upkeepRav ?? 0),0);
  const assignments = { ...state.assignments };
  teamIds.forEach(teamId => { assignments[teamId] = id; });
  return { id, state: {...state, serial: state.serial+1, rav: state.rav-expense, assignments } };
}
export function beginWarOperationV115(
  state: WarOperationsStateV115, mode: WarMissionModeV115, targetId:string,
  teamIds:string[], rules:WarRulesV6, now:number, focus:OuterFocusV115 = "recon",
): WarOperationsUpdateV115 {
  if (!["assault","outer","stealth","rts"].includes(mode) || !Number.isSafeInteger(now) || now < 0) return reject(state,"Ordre ou horodatage invalide.");
  const issue = warMissionEligibleV115(state,rules,targetId,teamIds);
  if (issue) return reject(state,issue);
  if (mode !== "outer" && state.active) return reject(state,"Une mission jouable est déjà en cours.");
  if (mode === "outer" && (state.outer.length >= 3 || !["recon","intercept","escort"].includes(focus))) return reject(state,"Trois opérations déléguées au maximum, avec un mandat valide.");
  if (mode === "stealth" && teamIds.length > 2) return reject(state,"Une infiltration mobilise au plus deux équipes.");
  const { id, state: reserved } = reserve(state,targetId,teamIds,rules);
  if (mode === "outer") {
    const pc = teamIds.reduce((count,teamId) => count + unitFor(rules,ownTeam(state,teamId)!.unitId)!.commandPoints,0);
    const route = planWarRouteV6(state.baseId,targetId,pc,[],rules)!;
    const duration = 30000 + route.passageIds.length * 10000; // transparent prototype timer; not a workbook value
    const order:WarOuterMissionV115 = { id,targetId,teamIds:[...teamIds],focus,startedAt:now,dueAt:now+duration,routeIds:route.passageIds };
    return accept({...reserved,outer:[...state.outer,order]},"Mandat confié : retour des équipes et rapport après l'échéance. L'opération continue sans écran ouvert.");
  }
  const active:WarPlayableMissionV115 = { id,mode,targetId,teamIds:[...teamIds],tick:0 };
  if (mode === "assault") active.assault = { ap:24,ownBase:80,rivalBase:80,actors:[],launched:[],fallen:[] };
  if (mode === "stealth") active.stealth = { x:1,y:4,guardX:6,guardDirection:-1,alarm:0,cloaked:false,energy:5,sabotaged:false };
  if (mode === "rts") {
    const allied = teamIds.map((teamId,index) => ({id:"ally-"+index,teamId,unitId:ownTeam(state,teamId)!.unitId,side:"ally" as const,x:1,y:1+index,hp:lifeFor(ownTeam(state,teamId)!.unitId,rules)}));
    const enemyUnits = rules.units.filter(unit => unit.fullMembers>0).slice(0,3);
    const rival = enemyUnits.map((unit,index) => ({id:"rival-"+index,teamId:null,unitId:unit.id,side:"rival" as const,x:7,y:1+index,hp:lifeFor(unit.id,rules)}));
    active.rts={actors:[...allied,...rival],hold:0,fallen:[]};
  }
  return accept({...reserved,active},"Mission jouable ouverte. Les équipes et leur entretien sont réservés une seule fois.");
}
function recordOutcome(
  state:WarOperationsStateV115, id:string, mode:WarMissionModeV115, focus:OuterFocusV115|null,
  targetId:string, teamIds:string[], outcome:WarMissionOutcomeV115, fallenIds:string[],
  rules:WarRulesV6, summary:string,
): WarOperationsStateV115 {
  if (state.reports.some(item => item.id===id)) return state;
  const appliedIds = mode === "assault" ? state.active?.assault?.launched ?? [] : mode === "stealth" ? teamIds.slice(0,1) : teamIds;
  const casualties:string[]=[];
  const teams = state.teams.map(team => {
    if (!teamIds.includes(team.id)) return team;
    let changed = team;
    const participants = team.members.filter(member => member.status==="fit").map(member => member.id);
    if (participants.length && appliedIds.includes(team.id)) {
      const receipt = {
        operationId:id, resultId:id+"-final", mode: mode==="outer" ? "strategic" as const : mode==="stealth" ? "hero" as const : "rts" as const,
        objective: outcome==="victory" ? (mode==="stealth" || focus==="recon" ? "recon" as const : "battle" as const) : "retreat" as const,
        participantIds:participants,final:true as const,
      };
      changed = applyWarResultV6(changed,receipt,rules).state;
    }
    if (fallenIds.includes(team.id) || (outcome!=="victory" && appliedIds.includes(team.id))) {
      const first = changed.members.find(member => member.status==="fit");
      if (first) {
        casualties.push(first.id);
        changed={...changed,members:changed.members.map(member => member.id===first.id ? {...member,status:"wounded" as const}:member)};
      }
    }
    return changed;
  });
  const assignments={...state.assignments};
  teamIds.forEach(teamId=>{if(assignments[teamId]===id) delete assignments[teamId];});
  const intelIds = outcome==="victory" && (mode==="stealth" || focus==="recon") ? unique([...state.intelIds,targetId]) : state.intelIds;
  const weakenedIds = outcome==="victory" && (mode==="stealth") ? unique([...state.weakenedIds,targetId]) : state.weakenedIds;
  const escortedIds = outcome==="victory" && focus==="escort" ? unique([...state.escortedIds,targetId]) : state.escortedIds;
  const pressure={...state.pressure};
  if(outcome==="victory" && (mode==="rts" || mode==="assault" || focus==="intercept")) pressure[targetId]=clamp((pressure[targetId]??0)+(mode==="rts"?2:1),0,20);
  const report:WarMissionReportV115 = {
    id,mode,focus,targetId,outcome,clock:state.clock,
    teamIds:[...teamIds],woundedIds:casualties,
    sourceIds:["W3-V6", "V115-EXERCISE"], summary,
  };
  return {...state,teams,assignments,intelIds,weakenedIds,escortedIds,pressure,
    active:state.active?.id===id?null:state.active,
    outer:state.outer.filter(item=>item.id!==id),
    reports:[...state.reports,report].slice(-MAX_REPORTS)};
}
export function leaveWarOperationV115(state:WarOperationsStateV115, rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active;
  if(!mission) return reject(state,"Aucune mission jouable à interrompre.");
  const next=recordOutcome(state,mission.id,mission.mode,null,mission.targetId,mission.teamIds,"retreat",[],rules,"Repli ordonné : aucun territoire annexé.");
  return accept(next,"Repli enregistré une seule fois.");
}
export function deployAssaultUnitV115(state:WarOperationsStateV115,teamId:string,rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active, arena=mission?.assault;
  if(mission?.mode!=="assault" || !arena || !mission.teamIds.includes(teamId) || arena.launched.includes(teamId)) return reject(state,"Détachement indisponible pour cette sortie.");
  const team=ownTeam(state,teamId)!;
  const cost=clamp((unitFor(rules,team.unitId)?.commandPoints??1)*8,8,72);
  if(arena.ap<cost) return reject(state,"Points de déploiement insuffisants.");
  const actor:WarMissionActorV115={id:teamId,teamId,unitId:team.unitId,side:"ally",x:5,hp:lifeFor(team.unitId,rules)};
  const active={...mission,assault:{...arena,ap:arena.ap-cost,launched:[...arena.launched,teamId],actors:[...arena.actors,actor]}};
  return accept({...state,active},"Renfort déployé : coût "+cost+" AP (valeur d'exercice, pas PC/RAV).");
}
export function stepAssaultV115(state:WarOperationsStateV115,rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active, arena=mission?.assault;
  if(mission?.mode!=="assault" || !arena) return reject(state,"Aucune bataille latérale en cours.");
  const tick=mission.tick+1;
  const actors=arena.actors.map(actor=>({...actor}));
  if(tick%8===0 && actors.filter(actor=>actor.side==="rival").length<7) {
    const units=rules.units.filter(unit=>unit.fullMembers>0);
    const unit=units[Math.floor(tick/8)%units.length];
    if(unit) actors.push({id:"rival-"+tick,teamId:null,unitId:unit.id,side:"rival",x:95,hp:lifeFor(unit.id,rules)});
  }
  let ownBase=arena.ownBase,rivalBase=arena.rivalBase;
  const wounds:string[]=[...arena.fallen];
  for(const actor of actors) {
    if(actor.hp<=0) continue;
    const hostile=actors.filter(other=>other.side!==actor.side && other.hp>0)
      .sort((a,b)=>Math.abs(a.x-actor.x)-Math.abs(b.x-actor.x))[0];
    const unit=unitFor(rules,actor.unitId);
    const range=clamp((unit?.range??1)*2+3,5,22);
    if(hostile && Math.abs(hostile.x-actor.x)<=range) hostile.hp-=damageFor(actor.unitId,rules);
    else actor.x+= (actor.side==="ally"?1:-1)*clamp(2+(unit?.mobility??1)*0.25,2,5);
    if(actor.side==="ally" && actor.x>=94){rivalBase-=damageFor(actor.unitId,rules)*3;actor.x=94;}
    if(actor.side==="rival" && actor.x<=6){ownBase-=damageFor(actor.unitId,rules)*3;actor.x=6;}
  }
  for(const actor of actors) if(actor.hp<=0 && actor.teamId) wounds.push(actor.teamId);
  const nextArena={...arena,ap:clamp(arena.ap+9,0,100),ownBase:Math.max(0,ownBase),rivalBase:Math.max(0,rivalBase),
    actors:actors.filter(actor=>actor.hp>0),fallen:unique(wounds)};
  const advanced={...state,clock:state.clock+1,active:{...mission,tick,assault:nextArena}};
  if(rivalBase<=0 || ownBase<=0 || tick>=95) {
    const outcome = rivalBase<=0 && ownBase>0 ? "victory" : "defeat";
    return accept(recordOutcome(advanced,mission.id,"assault",null,mission.targetId,mission.teamIds,outcome,nextArena.fallen,rules,
      outcome==="victory"?"Bastion adverse neutralisé dans la simulation latérale.":"Sortie repoussée dans l'exercice."),"Bataille terminée : rapport consigné.");
  }
  return accept(advanced,"La bataille latérale progresse.");
}
export type StealthCommandV115 = "up"|"down"|"left"|"right"|"cloak"|"interact";
export function commandStealthV115(state:WarOperationsStateV115,command:StealthCommandV115,rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active, stealth=mission?.stealth;
  if(mission?.mode!=="stealth" || !stealth) return reject(state,"Aucune infiltration active.");
  if(!["up","down","left","right","cloak","interact"].includes(command)) return reject(state,"Action inconnue.");
  let {x,y,cloaked,energy,alarm,sabotaged,guardX,guardDirection}=stealth;
  if(command==="cloak" && energy<=0 && !cloaked) return reject(state,"Le camouflage est épuisé.");
  if(command==="cloak") cloaked=!cloaked;
  else if(command==="interact") {
    if(distance({x,y},{x:7,y:1})>1 || sabotaged) return reject(state,"Atteignez le relais non désactivé avant de le saboter.");
    sabotaged=true;cloaked=false;
  } else {
    const dx=command==="right"?1:command==="left"?-1:0, dy=command==="down"?1:command==="up"?-1:0;
    const nx=x+dx,ny=y+dy;
    if(nx<0||nx>8||ny<0||ny>5||STEALTH_WALLS.has(coord(nx,ny))) return reject(state,"Paroi ou limite du passage : déplacement impossible.");
    x=nx;y=ny;
  }
  if(cloaked){energy=Math.max(0,energy-1);if(!energy) cloaked=false;}
  guardX+=guardDirection;
  if(guardX<=4 || guardX>=7) guardDirection=guardDirection===1?-1:1;
  const seen= !cloaked && ((y===2 && Math.abs(x-guardX)<=2) || (x===guardX && Math.abs(y-2)<=1))
    && !STEALTH_WALLS.has(coord(x,y));
  if(seen || command==="interact") alarm++;
  const nextStealth={x,y,guardX,guardDirection,alarm,cloaked,energy,sabotaged};
  const advanced={...state,clock:state.clock+1,active:{...mission,tick:mission.tick+1,stealth:nextStealth}};
  if(alarm>=3) return accept(recordOutcome(advanced,mission.id,"stealth",null,mission.targetId,mission.teamIds,"defeat",mission.teamIds.slice(0,1),rules,
    "Patrouille alertée : extraction abandonnée."),"Infiltration compromise.");
  if(sabotaged && x===1 && y===4) return accept(recordOutcome(advanced,mission.id,"stealth",null,mission.targetId,mission.teamIds,"victory",[],rules,
    "Relais désactivé et pisteur extrait ; renseignement et sabotage consignés."),"Extraction confirmée.");
  if(mission.tick>=65) return accept(recordOutcome(advanced,mission.id,"stealth",null,mission.targetId,mission.teamIds,"defeat",[],rules,
    "Fenêtre d'infiltration expirée."),"Mission interrompue par la durée de l'exercice.");
  return accept(advanced,sabotaged?"Relais neutralisé : retournez au point d'extraction (1,4).":"Restez hors du champ de la patrouille et atteignez le relais (7,1).");
}
function rtsEnemyTurn(actors:WarRtsActorV115[],rules:WarRulesV6) {
  for(const rival of actors.filter(actor=>actor.side==="rival" && actor.hp>0)){
    const target=actors.filter(actor=>actor.side==="ally" && actor.hp>0).sort((a,b)=>distance(a,rival)-distance(b,rival))[0];
    if(!target) break;
    if(distance(target,rival)<=2) target.hp-=damageFor(rival.unitId,rules);
    else {
      const dx=Math.sign(target.x-rival.x),dy=Math.sign(target.y-rival.y);
      const nx=rival.x+dx,ny=rival.y+(dx===0?dy:0);
      if(!actors.some(actor=>actor!==rival&&actor.hp>0&&actor.x===nx&&actor.y===ny)&&nx>=0&&nx<=8&&ny>=0&&ny<=5) {rival.x=nx;rival.y=ny;}
    }
  }
}
export function commandRtsV115(state:WarOperationsStateV115,teamId:string,x:number,y:number,rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active, field=mission?.rts;
  if(mission?.mode!=="rts" || !field || !Number.isInteger(x)||!Number.isInteger(y)||x<0||x>8||y<0||y>5) return reject(state,"Ordre RTS ou case invalide.");
  const actors=field.actors.map(actor=>({...actor}));
  const actor=actors.find(item=>item.teamId===teamId && item.hp>0);
  if(!actor) return reject(state,"Sélectionnez une équipe combattante encore active.");
  const occupant=actors.find(item=>item.hp>0 && item.x===x && item.y===y && item!==actor);
  const dist=distance(actor,{x,y});
  const unit=unitFor(rules,actor.unitId);
  if(occupant?.side==="rival") {
    if(dist>clamp(Math.round((unit?.range??1)/2),1,3)) return reject(state,"Ennemi hors de portée.");
    occupant.hp-=damageFor(actor.unitId,rules)*2;
  } else {
    if(occupant || dist===0 || dist>clamp(Math.ceil((unit?.mobility??1)/2),1,3)) return reject(state,"Case occupée ou hors de portée du déplacement.");
    actor.x=x;actor.y=y;
  }
  rtsEnemyTurn(actors,rules);
  const fallen=unique([...field.fallen,...actors.filter(item=>item.side==="ally" && item.hp<=0 && item.teamId).map(item=>item.teamId!)]);
  const alive=actors.filter(item=>item.hp>0);
  const holding=alive.some(item=>item.side==="ally"&&item.x===7&&item.y===3) && !alive.some(item=>item.side==="rival"&&distance(item,{x:7,y:3})<=1);
  const hold=holding?field.hold+1:0;
  const advanced={...state,clock:state.clock+1,active:{...mission,tick:mission.tick+1,rts:{actors:alive,hold,fallen}}};
  if(alive.some(item=>item.side==="ally") && (hold>=2 || !alive.some(item=>item.side==="rival"))) return accept(recordOutcome(advanced,mission.id,"rts",null,mission.targetId,mission.teamIds,"victory",fallen,rules,
    "Objectif tenu deux ordres ou défense neutralisée. Le siège ne vaut pas annexion automatique."),"Objectif RTS sécurisé.");
  if(!alive.some(item=>item.side==="ally") || mission.tick>=49) return accept(recordOutcome(advanced,mission.id,"rts",null,mission.targetId,mission.teamIds,"defeat",fallen,rules,
    "Détachement replié après échec de l'objectif."),"RTS terminé : échec consigné.");
  return accept(advanced,"Ordre exécuté. L'adversaire a effectué sa réponse tactique.");
}
function hashSeed(id:string):number {let h=2166136261;for(let i=0;i<id.length;i++) h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;}
export function settleWarOuterOpsV115(state:WarOperationsStateV115, now:number,rules:WarRulesV6):WarOperationsUpdateV115 {
  if(!Number.isSafeInteger(now)||now<0 || state.sourceSha!==rules.metadata.sha256) return reject(state,"Date ou règles incompatibles.");
  const due=state.outer.filter(order=>now>=order.dueAt).sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id));
  if(!due.length) return reject(state,"Aucun rapport délégué arrivé à échéance.");
  let next=state;
  for(const order of due) {
    const territory=rules.territories.find(item=>item.id===order.targetId);
    const attack=order.teamIds.reduce((total,id)=>total+(unitFor(rules,ownTeam(next,id)?.unitId??"")?.attack??0),0);
    const difficulty=Math.max(1,(territory?.terrainDefense??0))+(hashSeed(order.id+order.targetId)%9);
    const won=attack>=difficulty;
    next=recordOutcome({...next,clock:next.clock+1},order.id,"outer",order.focus,order.targetId,order.teamIds,won?"victory":"defeat",
      won?[]:order.teamIds.slice(0,1),rules,
      (won?"Mandat abouti. ":"Mandat repoussé. ")+
      (order.focus==="recon"?"Rapport de piste.":order.focus==="escort"?"Itinéraire d'escorte.":"Interception des relais.")+
      " Terrain, fatigue, participants et blessures sont tracés ; aucun butin ou vaisseau inventé.");
  }
  return accept(next,due.length+" opération(s) déléguée(s) résolue(s), chacune avec un reçu unique.");
}
export function warOuterSecondsRemainingV115(order:WarOuterMissionV115,now:number):number {
  return Math.max(0,Math.ceil((order.dueAt-now)/1000));
}
export function readWarOperationsV115(raw:string,rules:WarRulesV6):WarOperationsStateV115|null {
  try {
    if(raw.length>450000) return null;
    const v=JSON.parse(raw) as WarOperationsStateV115;
    if(!v || v.version!==1 || v.context!=="free" || v.sourceSha!==rules.metadata.sha256 || v.baseId!==rules.territories[0]?.id) return null;
    if(!Number.isSafeInteger(v.serial)||v.serial<0||v.serial>100000 ||
      !Number.isSafeInteger(v.clock)||v.clock<0||v.clock>1000000 ||
      !Number.isFinite(v.rav)||v.rav<0||v.rav>rules.parameters.rav_cap) return null;
    if(!Array.isArray(v.teams)||v.teams.length>16||!v.teams.length||!v.teams.every(team=>
      isTextId(team.id) && team.context==="free" && team.version===1 &&
      !!unitFor(rules,team.unitId) && Number.isFinite(team.fatigue) && team.fatigue>=0&&team.fatigue<=rules.parameters.fatigue_max &&
      Array.isArray(team.members) && team.members.length<=32 && team.members.every(member=>isTextId(member.id)&&member.assignmentId===team.id &&
      ["fit","wounded","dead"].includes(member.status)&&Number.isFinite(member.xp)&&member.xp>=0&&member.xp<=rules.parameters.xp_max) &&
      Array.isArray(team.resultReceipts) && team.resultReceipts.length<=100000 && Array.isArray(team.resolvedResultIds))) return null;
    if(unique(v.teams.map(team=>team.id)).length!==v.teams.length) return null;
    if(!v.assignments||typeof v.assignments!=="object"||Array.isArray(v.assignments)||Object.keys(v.assignments).length>16) return null;
    if(!Array.isArray(v.outer)||v.outer.length>3 || !Array.isArray(v.reports)||v.reports.length>MAX_REPORTS ||
      !Array.isArray(v.intelIds)||!Array.isArray(v.weakenedIds)||!Array.isArray(v.escortedIds) ||
      !v.pressure||typeof v.pressure!=="object") return null;
    const sites=new Set(rules.territories.map(site=>site.id));
    if([...v.intelIds,...v.weakenedIds,...v.escortedIds,...Object.keys(v.pressure)].some(id=>!sites.has(id))) return null;
    if(Object.entries(v.pressure).some(([,p])=>!Number.isInteger(p)||p<0||p>20)) return null;
    if(v.outer.some(order=>!isTextId(order.id)||!sites.has(order.targetId)||!Array.isArray(order.teamIds)||
      !order.teamIds.length||order.teamIds.some(id=>!ownTeam(v,id))||!Number.isSafeInteger(order.dueAt)||
      !Number.isSafeInteger(order.startedAt)||order.dueAt<=order.startedAt||
      !["recon","intercept","escort"].includes(order.focus))) return null;
    const active=v.active;
    if(active && (!isTextId(active.id)||!sites.has(active.targetId)||!["assault","stealth","rts"].includes(active.mode)||
      !Number.isInteger(active.tick)||active.tick<0||active.tick>100||!Array.isArray(active.teamIds)||
      !active.teamIds.length||active.teamIds.some(id=>!ownTeam(v,id))||
      (active.mode==="assault" && (!active.assault||!Array.isArray(active.assault.actors)))||
      (active.mode==="stealth" && (!active.stealth||!Number.isInteger(active.stealth.x)))||
      (active.mode==="rts" && (!active.rts||!Array.isArray(active.rts.actors))))) return null;
    const live=[...(active?[active]:[]),...v.outer];
    const expected:Record<string,string>={};
    for(const op of live) for(const id of op.teamIds) {if(expected[id]) return null;expected[id]=op.id;}
    if(JSON.stringify(Object.keys(expected).sort().map(id=>[id,expected[id]])) !==
      JSON.stringify(Object.keys(v.assignments).sort().map(id=>[id,v.assignments[id]]))) return null;
    if(v.reports.some(item=>!isTextId(item.id)||!sites.has(item.targetId)||!["victory","defeat","retreat"].includes(item.outcome))) return null;
    if(unique(v.reports.map(item=>item.id)).length!==v.reports.length ||
      v.reports.some(item=>live.some(op=>op.id===item.id))) return null;
    return v;
  } catch {return null;}
}
