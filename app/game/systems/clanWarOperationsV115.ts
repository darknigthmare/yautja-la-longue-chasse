import {
  applyWarResultV6, createWarTeamV6, planWarRouteV6, DEFAULT_WAR_RULES_V6,
  type WarRulesV6, type WarTeamStateV6,
} from "./clanWarBibleV6";
import { warRtsScriptedEligibilityV119, createWarRtsScriptedObjectiveV119, resolveWarRtsScriptedTickV119,
  validWarRtsScriptedObjectiveV119, warRtsRivalTargetV120, warRtsSourceSightV120, warRtsBeaconEscapeStepV121,
  type WarSourceRtsScenarioIdV119, type WarRtsScriptedObjectiveV119,
} from "./clanWarRtsScenariosV119";
import { warMissionTerrainV116, warTerrainCellBlockedV116, warTerrainLineOfSightV116,
  warTerrainPathLengthV116, type WarMissionTerrainV116 } from "./clanWarMissionTerrainV116";
import { warRtsNextPathStepV118 } from "./clanWarTacticalNavigationV118";
import {warStealthPatrolSpawnV140} from "./clanWarStealthPatrolV140";
import {warStealthDecoyPatrolV141} from "./clanWarStealthDecoyV141";
import {chooseStealthSupportGuard} from "./clanWarStealthGuardPlacement";
import {warOuterRouteChoicesV142} from "./clanWarOuterChoicesV142";
import {warAssaultContactV141} from "./clanWarAssaultContactV141";

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
  apLevel?: 1 | 2 | 3; usedSpecials?: string[]; fortifiedIds?: string[];
  holdIssuedIds?: string[]; heldUntil?: Record<string,number>;
  /** V137 live retreat: a withdrawn participant cannot redeploy in this match. */
  extractedIds?: string[];
  surgeIssuedIds?: string[];
  fallbackCounts?: Record<string,number>;
  /** Source-pinned finite rival wave study; no newly invented V6 unit types. */
  rivalRosterIds?: string[];wavesIssued?:number;
  /** V142: one physical priority target per deployed group. */
  focusOrders?:Record<string,{targetId:string;expiresAtTick:number}>;
  focusUsedIds?:string[];
  braceUsedIds?:string[];bracedUntil?:Record<string,number>;
  regroupUsedIds?:string[];
  /** V145 finite physical damage transfer; never additional hit points. */
  interposeUsedIds?:string[];
  interposeOrders?:Record<string,{guardianTeamId:string;expiresAtTick:number}>;
}
export interface WarStealthV115 { x: number; y: number; guardX: number;guardY?:number; guardDirection: -1 | 1; alarm: number; cloaked: boolean; energy: number; sabotaged: boolean;
  /** V135 sound diversion at the hunter's physical position; no canonical device assumed. */
  decoyX?: number; decoyY?:number; decoyTurns?: number; decoyUsed?: boolean;
  usedCoverIds?: string[];
  /** V137: real one-cell steps into authored cover; two per mission. */
  silentStepsUsed?: number;
  /** One-turn proximity acoustic bearing, not a visible enemy location. */
  acousticUsed?: number;heardBearing?: "est"|"ouest"|"proche";
  heardAtTick?: number;
  silentSabotageUsed?: boolean;
  dashUsed?:boolean;
  /** PR #55: only the primary guard's last observed player position. */
  guardInvestigation?:{x:number;y:number;turns:number};
  supportGuard?:{x:number;y:number;direction:-1|1};
  reinforcementIssued?:boolean;
  reinforcementMode?:"manual"|"decoy";
}
export interface WarRtsOrderV115 { x: number; y: number; kind: "advance" | "hold" | "attack" }
export interface WarRtsV115 {
  actors: WarRtsActorV115[]; hold: number; fallen: string[];
  realtime?: boolean; orders?: Record<string, WarRtsOrderV115>;
  scripted?: WarRtsScriptedObjectiveV119;
  history?: string[];
}
export interface WarPlayableMissionV115 {
  id: string; mode: "assault" | "stealth" | "rts"; targetId: string; teamIds: string[];
  tick: number; assault?: WarAssaultV115; stealth?: WarStealthV115; rts?: WarRtsV115;
}
export interface WarOuterMissionV115 {
  id: string; targetId: string; teamIds: string[]; focus: OuterFocusV115;
  startedAt: number; dueAt: number; routeIds: string[];
  /** When recalled, the original deadline remains visible for audit. The
   * squad stays assigned until its physically delayed return is reconciled. */
  recall?: { orderedAt: number; originalDueAt: number };
  retask?: {oldFocus: OuterFocusV115;changedAt:number};
  fieldSupport?: {allocatedAt:number;paidRav:2};
  /** A physical scouting halt extends the return deadline, never gives instant intel. */
  reconHalt?: {orderedAt:number;originalDueAt:number;extraMs:15000};
  fieldSignal?: {transmittedAt:number;assessment:"voie-stable"|"terrain-expose"|"transit-complexe";
    passages:number;fitMembers:number};
  departureContext?: {intel:boolean;weakened:boolean;escorted:boolean;pressure:number};
  /** V142 authorized alternative passage selection; optional for old archives. */
  routeChoiceId?:string;
  /** V144 public source-passage inspection retained in #55 archives. */
  passageCheck?:{passageId:string;sourceCondition:string;checkedAt:number;paidRav:1};
  /** Optional #57 pace order, retained across historical V115 saves. */
  forcedPace?:{orderedAt:number;originalDueAt:number;paidRav:3;savedMs:8000};
  routeDiversion?:{fromPassageIds:string[];originalDueAt:number;changedAt:number;paidRav:1};
  routeIncident?:{
    passageId:string;sourceIncident:string;kind:"secure"|"detour";
    orderedAt:number;originalDueAt:number;paidRav:0|2;
  };
}
export interface WarMissionReportV115 {
  id: string; mode: WarMissionModeV115; focus: OuterFocusV115 | null;
  targetId: string; outcome: WarMissionOutcomeV115; clock: number;
  teamIds: string[]; woundedIds: string[]; sourceIds: string[]; summary: string;
  engagementLog?: string[];
}
export interface WarRecruitmentV115 {
  id: string; teamId: string; unitId: string;
  startedAt: number; dueAt: number; paidRav: number;
}
/** The current exercise only produces light "wounded" cases, never major trauma.
 * A V6 field medic must be recruited, free and supplied before a person can
 * return fit. No medical bay, healing rate or hardware is claimed canonical. */
export interface WarTreatmentV116 {
  id:string; teamId:string; memberId:string; medicTeamId:string;
  startedAt:number; dueAt:number; paidRav:number;
}
export interface WarOperationsStateV115 {
  version: 1; context: "free"; sourceSha: string; baseId: string;
  serial: number; clock: number; rav: number;
  teams: WarTeamStateV6[]; assignments: Record<string, string>;
  active: WarPlayableMissionV115 | null; outer: WarOuterMissionV115[];
  intelIds: string[]; weakenedIds: string[]; escortedIds: string[];
  pressure: Record<string, number>; reports: WarMissionReportV115[];
  pendingRecruits?: WarRecruitmentV115[]; recruitedTeamIds?: string[];
  pendingTreatments?: WarTreatmentV116[]; treatmentReceipts?: string[];
}
export interface WarOperationsUpdateV115 { state: WarOperationsStateV115; accepted: boolean; message: string }
const MAX_REPORTS = 120;

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
    pendingRecruits: [], recruitedTeamIds: [], pendingTreatments: [], treatmentReceipts: [],
  };
}

/** Recruit all thirty V6 formation types. Recruitment spends the exact W3-U
 * cost at reservation; members only appear after their source delay.
 * Fifteen seconds per V6 turn is an advertised exercise-only time mapping. */
export function queueWarRecruitmentV115(
  state:WarOperationsStateV115,unitId:string,now:number,rules:WarRulesV6,
):WarOperationsUpdateV115 {
  if(state.sourceSha!==rules.metadata.sha256) return reject(state,"Source V6 de ce recrutement incompatible.");
  const unit=unitFor(rules,unitId);
  if(!unit||unit.fullMembers<1||!Number.isSafeInteger(now)||now<0) return reject(state,"Équipe V6 ou horodatage invalide.");
  const pending=state.pendingRecruits??[];
  if(state.teams.length+pending.length>=16||pending.length>=4) return reject(state,"Plafond de 16 équipes et quatre recrutements simultanés.");
  if(!Number.isFinite(unit.recruitmentRav)||unit.recruitmentRav<0||state.rav<unit.recruitmentRav)
    return reject(state,"Réserve RAV insuffisante pour recruter cette équipe.");
  if(!Number.isInteger(unit.delayTurns)||unit.delayTurns<0||unit.delayTurns>100)
    return reject(state,"Délai de recrutement non admissible dans la source.");
  if(state.serial>=100000) return reject(state,"Archive d'exercice à capacité maximale.");
  const nextSerial=state.serial+1,teamId="W115-TEAM-REC-"+nextSerial;
  const arrival:WarRecruitmentV115={
    id:"W115-REC-"+nextSerial,teamId,unitId,startedAt:now,
    dueAt:now+Math.max(1,unit.delayTurns)*15000,paidRav:unit.recruitmentRav,
  };
  return accept({...state,serial:nextSerial,rav:state.rav-unit.recruitmentRav,
    pendingRecruits:[...pending,arrival]},
    "Recrutement préparé : "+unit.name+" ("+unit.recruitmentRav+" RAV). Les membres rejoignent le départ à échéance.");
}
export function settleWarRecruitmentsV115(state:WarOperationsStateV115,now:number,rules:WarRulesV6):WarOperationsUpdateV115 {
  if(!Number.isSafeInteger(now)||now<0||state.sourceSha!==rules.metadata.sha256) return reject(state,"Date de recrutement invalide.");
  const due=(state.pendingRecruits??[]).filter(item=>now>=item.dueAt).sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id));
  if(!due.length) return reject(state,"Aucun recrutement achevé.");
  const arrivals=due.map(item=>createWarTeamV6(item.unitId,item.teamId,rules));
  const confirmed=arrivals.filter((team):team is WarTeamStateV6=>team!==null);
  if(confirmed.length!==due.length||state.teams.length+confirmed.length>16) return reject(state,"Rostre incompatible ; arrivées suspendues.");
  const processed=new Set(due.map(item=>item.id));
  return accept({...state,clock:state.clock+due.length,
    teams:[...state.teams,...confirmed],
    pendingRecruits:(state.pendingRecruits??[]).filter(item=>!processed.has(item.id)),
    recruitedTeamIds:unique([...(state.recruitedTeamIds??[]),...due.map(item=>item.teamId)])},
    due.length+" renfort(s) V6 arrivés au départ, avec nouvelles identités et XP à zéro.");
}
/** Enlist a paid V6 W3-U18 field medic and isolate the light casualty at the
 * exercise's common assembly point. Two complete teams are unavailable until
 * recovery or an explicit evacuation/cancel. One source upkeep RAV is charged
 * for the medic and a 45-second prototype window is clearly displayed. */
export function queueWarTreatmentV116(
  state:WarOperationsStateV115,teamId:string,memberId:string,medicTeamId:string,now:number,rules:WarRulesV6,
):WarOperationsUpdateV115 {
  if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
    return reject(state,"Date ou Bible V6 incompatible avec le traitement.");
  const patient=ownTeam(state,teamId),medic=ownTeam(state,medicTeamId);
  if(!patient||!medic||teamId===medicTeamId)
    return reject(state,"Choisissez un blessé et une équipe de soigneur distincte, déjà présente.");
  if(medic.unitId!=="W3-U18"||!unitFor(rules,medic.unitId))
    return reject(state,"La prise en charge exige l'unité source W3-U18, soigneur de terrain.");
  if(patient.members.find(person=>person.id===memberId)?.status!=="wounded")
    return reject(state,"Le membre choisi n'est pas un blessé léger connu de l'exercice.");
  if(!medic.members.some(person=>person.status==="fit"))
    return reject(state,"L'équipe de soins n'a plus de membre apte.");
  if(state.assignments[teamId]||state.assignments[medicTeamId])
    return reject(state,"L'équipe blessée ou le soigneur possède déjà une affectation.");
  if((state.pendingTreatments??[]).length>=2||state.serial>=100000)
    return reject(state,"Deux soins simultanés au maximum ou archive à capacité maximale.");
  const fee=unitFor(rules,"W3-U18")!.upkeepRav;
  if(!Number.isSafeInteger(fee)||fee<0||state.rav<fee) return reject(state,"RAV insuffisants pour l'entretien du soigneur.");
  const id="W115-CARE-"+(state.serial+1);
  const order:WarTreatmentV116={id,teamId,memberId,medicTeamId,startedAt:now,dueAt:now+45000,paidRav:fee};
  return accept({...state,serial:state.serial+1,rav:state.rav-fee,
    assignments:{...state.assignments,[teamId]:id,[medicTeamId]:id},
    pendingTreatments:[...(state.pendingTreatments??[]),order]},
    "Soins légers engagés pour "+memberId+". Soigneur W3-U18 et équipe blessée indisponibles durant 45 secondes.");
}
/** A treatment is settled once, only after the paid, attended recovery period.
 * Wounded members keep their identities and XP; there is no resurrection,
 * free member replacement, or honorary reward. */
export function settleWarTreatmentsV116(
  state:WarOperationsStateV115,now:number,rules:WarRulesV6,
):WarOperationsUpdateV115 {
  if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
    return reject(state,"Échéance de traitement invalide.");
  const due=(state.pendingTreatments??[]).filter(order=>now>=order.dueAt)
    .sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id));
  if(!due.length)return reject(state,"Aucun traitement arrivé à échéance.");
  let next=state;
  for(const order of due){
    const patient=ownTeam(next,order.teamId),medic=ownTeam(next,order.medicTeamId);
    if(!patient||!medic||medic.unitId!=="W3-U18"||
       !medic.members.some(person=>person.status==="fit")||
       patient.members.find(person=>person.id===order.memberId)?.status!=="wounded")
      return reject(state,"Une équipe médicale n'est plus disponible : aucune guérison automatique.");
    const assignments={...next.assignments};
    if(assignments[order.teamId]!==order.id||assignments[order.medicTeamId]!==order.id)
      return reject(state,"Un autre mandat détient les équipes : traitement suspendu.");
    delete assignments[order.teamId];delete assignments[order.medicTeamId];
    next={...next,clock:next.clock+1,assignments,
      teams:next.teams.map(team=>team.id!==order.teamId?team:
        {...team,members:team.members.map(person=>person.id!==order.memberId?person:{...person,status:"fit" as const})}),
      pendingTreatments:(next.pendingTreatments??[]).filter(item=>item.id!==order.id),
      treatmentReceipts:[...(next.treatmentReceipts??[]),order.id].slice(-120),
    };
  }
  return accept(next,due.length+" prise(s) en charge V6 terminée(s) ; les membres légers reprennent leur service.");
}
/** Abort a treatment without inventing a refund of supplies already issued. */
export function cancelWarTreatmentV116(state:WarOperationsStateV115,id:string):WarOperationsUpdateV115 {
  const order=(state.pendingTreatments??[]).find(item=>item.id===id);
  if(!order)return reject(state,"Prise en charge inconnue ou déjà clôturée.");
  const assignments={...state.assignments};
  if(assignments[order.teamId]!==id||assignments[order.medicTeamId]!==id)
    return reject(state,"Impossible de libérer un détachement affecté à un autre ordre.");
  delete assignments[order.teamId];delete assignments[order.medicTeamId];
  return accept({...state,assignments,
    pendingTreatments:(state.pendingTreatments??[]).filter(item=>item.id!==id)},
    "Traitement interrompu ; le membre reste blessé et les RAV déjà engagés ne sont pas remboursés.");
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
  rtsScenarioId: WarSourceRtsScenarioIdV119 | null = null,
  selectedOuterPassageIds?:readonly string[],
): WarOperationsUpdateV115 {
  if (!["assault","outer","stealth","rts"].includes(mode) || !Number.isSafeInteger(now) || now < 0) return reject(state,"Ordre ou horodatage invalide.");
  const issue = warMissionEligibleV115(state,rules,targetId,teamIds);
  if (issue) return reject(state,issue);
  if (mode !== "outer" && selectedOuterPassageIds!==undefined)
    return reject(state,"Un itinéraire délégué ne peut pas modifier une mission jouable.");
  if (mode !== "outer" && state.active) return reject(state,"Une mission jouable est déjà en cours.");
  if (mode === "outer" && (state.outer.length >= 3 || !["recon","intercept","escort"].includes(focus))) return reject(state,"Trois opérations déléguées au maximum, avec un mandat valide.");
  if (mode === "stealth" && teamIds.length > 2) return reject(state,"Une infiltration mobilise au plus deux équipes.");
  if(rtsScenarioId!==null){
    if(mode!=="rts")return reject(state,"Les scénarios W3-RTS demandent le mode de guerre RTS.");
    const issue=warRtsScriptedEligibilityV119(rtsScenarioId,rules,targetId,
      teamIds.map(teamId=>unitFor(rules,ownTeam(state,teamId)!.unitId)!.id));
    if(issue)return reject(state,issue);
  }
  const { id, state: reserved } = reserve(state,targetId,teamIds,rules);
  if (mode === "outer") {
    const pc = teamIds.reduce((count,teamId) => count + unitFor(rules,ownTeam(state,teamId)!.unitId)!.commandPoints,0);
    const routes=warOuterRouteChoicesV142(state.baseId,targetId,pc,rules);
    const choice=selectedOuterPassageIds===undefined?
      routes.find(v=>v.isPrimary):routes.find(v=>
        v.passageIds.join("|")===selectedOuterPassageIds.join("|"));
    if(!choice)return reject(state,"Route V6 impossible, hors capacité PC, interrompue ou non proposée au détachement.");
    const primary=routes.find(v=>v.isPrimary)!;
    const duration = Math.max(20000,30000 + choice.passageIds.length*10000 +
      Math.max(0,choice.cost-primary.cost)*2000-
      (state.escortedIds.includes(targetId)?10000:0)); // bounded source-weighted exercise estimate
    const order:WarOuterMissionV115 = {id,targetId,teamIds:[...teamIds],focus,
      startedAt:now,dueAt:now+duration,routeIds:[...choice.passageIds],
      routeChoiceId:choice.id,
      departureContext:{intel:state.intelIds.includes(targetId),
        weakened:state.weakenedIds.includes(targetId),
        escorted:state.escortedIds.includes(targetId),
        pressure:state.pressure[targetId]??0}};
    return accept({...reserved,outer:[...state.outer,order]},"Mandat confié : retour des équipes et rapport après l'échéance. L'opération continue sans écran ouvert.");
  }
  const active:WarPlayableMissionV115 = { id,mode,targetId,teamIds:[...teamIds],tick:0 };
  if (mode === "assault") active.assault = { ap:state.intelIds.includes(targetId)?36:24,ownBase:80,
    rivalBase:Math.max(45,80-(state.weakenedIds.includes(targetId)?12:0)-Math.min(20,(state.pressure[targetId]??0)*3)),
    actors:[],launched:[],fallen:[],apLevel:1,usedSpecials:[],
    rivalRosterIds:warAssaultWaveProfileV140(targetId,rules).unitIds,wavesIssued:0 };
  if (mode === "stealth") active.stealth = {x:1,y:4,
    ...warStealthPatrolSpawnV140(warMissionTerrainV116(targetId,rules)),
    alarm:0,cloaked:false,energy:5,sabotaged:false,decoyTurns:0,decoyUsed:false,reinforcementMode:"manual"};
  if (mode === "rts") {
    const allied = teamIds.map((teamId,index) => ({id:"ally-"+index,teamId,unitId:ownTeam(state,teamId)!.unitId,side:"ally" as const,x:1,y:1+index,hp:lifeFor(ownTeam(state,teamId)!.unitId,rules)}));
    const enemyUnits = rules.units.filter(unit => unit.fullMembers>0).slice(0,3);
    const rival = enemyUnits.map((unit,index) => ({id:"rival-"+index,teamId:null,unitId:unit.id,side:"rival" as const,x:7,y:1+index,hp:Math.max(2,lifeFor(unit.id,rules)-(state.weakenedIds.includes(targetId)?3:0))}));
    const scripted=rtsScenarioId?
      createWarRtsScriptedObjectiveV119(rtsScenarioId,id,[...allied,...rival]):null;
    if(rtsScenarioId&&!scripted)return reject(state,"Le scénario réclame un porteur réel, non créé.");
    active.rts={actors:[...allied,...rival],hold:0,fallen:[],realtime:false,orders:{},history:[],
      ...(scripted?{scripted}:{})};
  }
  return accept({...reserved,active},"Mission jouable ouverte. Les équipes et leur entretien sont réservés une seule fois.");
}
function recordOutcome(
  state:WarOperationsStateV115, id:string, mode:WarMissionModeV115, focus:OuterFocusV115|null,
  targetId:string, teamIds:string[], outcome:WarMissionOutcomeV115, fallenIds:string[],
  rules:WarRulesV6, summary:string, engagementLog:string[] = [],
): WarOperationsStateV115 {
  if (state.reports.some(item => item.id===id)) return state;
  const appliedIds = mode === "assault" ? state.active?.assault?.launched ?? [] : mode === "stealth" ? teamIds.slice(0,1) : teamIds;
  // No free XP by queuing and immediately recalling an Outer Ops mission or
  // withdrawing from a playable operation before its first simulated action.
  const experiencedIds = outcome==="retreat" && (mode==="outer" || (state.active?.tick??0)===0) ? [] : appliedIds;
  const casualties:string[]=[];
  const teams = state.teams.map(team => {
    if (!teamIds.includes(team.id)) return team;
    let changed = team;
    const participants = team.members.filter(member => member.status==="fit").map(member => member.id);
    if (participants.length && experiencedIds.includes(team.id)) {
      const receipt = {
        operationId:id, resultId:id+"-final", mode: mode==="outer" ? "strategic" as const : mode==="stealth" ? "hero" as const : "rts" as const,
        objective: outcome==="victory" ? (mode==="stealth" || focus==="recon" ? "recon" as const : "battle" as const) : "retreat" as const,
        participantIds:participants,final:true as const,
      };
      changed = applyWarResultV6(changed,receipt,rules).state;
    }
    // A lost objective is not a wound on every surviving soldier.
    // Only identified fallen teams receive a light casualty in this exercise.
    if (fallenIds.includes(team.id)) {
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
    sourceIds:["W3-V6", "V115-EXERCISE",
      ...(mode==="rts"&&state.active?.rts?.scripted?[state.active.rts.scripted.scenarioId]:[])], summary, engagementLog,
  };
  return {...state,teams,assignments,intelIds,weakenedIds,escortedIds,pressure,
    active:state.active?.id===id?null:state.active,
    outer:state.outer.filter(item=>item.id!==id),
    reports:[...state.reports,report].slice(-MAX_REPORTS)};
}
export function leaveWarOperationV115(state:WarOperationsStateV115, rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active;
  if(!mission) return reject(state,"Aucune mission jouable à interrompre.");
  const next=recordOutcome(state,mission.id,mission.mode,null,mission.targetId,mission.teamIds,"retreat",[],rules,"Repli ordonné : aucun territoire annexé.",mission.rts?.history??[]);
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
/** Inspired by the AP management loop in Metal Slug Attack, not by a Yautja
 * research tech. Source-defined command points and RAV remain unchanged. */
export function upgradeWarAssaultApV117(state:WarOperationsStateV115):WarOperationsUpdateV115 {
  const mission=state.active,arena=mission?.assault;
  if(mission?.mode!=="assault"||!arena) return reject(state,"Aucune bataille latérale à renforcer.");
  const level=arena.apLevel??1;
  if(level>=3) return reject(state,"Cadence AP déjà à son plafond de cet exercice.");
  const cost=level===1?35:55;
  if(arena.ap<cost) return reject(state,"Points AP insuffisants pour coordonner plus de déploiements.");
  const next={...arena,apLevel:(level+1) as 2|3,ap:arena.ap-cost};
  return accept({...state,active:{...mission,assault:next}},
    "Coordination de déploiement niveau "+(level+1)+" : cadence et réserve AP augmentées, sans recrutement ni ressources fictives.");
}
/** A V6 team may execute ONE concentrated fire maneuver if the named actor
 * remains alive, is deployed, and actually has a target within its V6 range.
 * This does not create a weapon, ammo, soldier or shot from outside the map. */
export function issueWarAssaultSpecialV117(
  state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115 {
  const mission=state.active,arena=mission?.assault;
  if(mission?.mode!=="assault"||!arena||!mission.teamIds.includes(teamId)||
    !(arena.launched.includes(teamId))||(arena.usedSpecials??[]).includes(teamId)) 
    return reject(state,"Une seule manœuvre par équipe déjà déployée et encore présente.");
  if(arena.ap<20) return reject(state,"Cette coordination exige 20 AP.");
  const actor=arena.actors.find(item=>item.side==="ally"&&item.teamId===teamId&&item.hp>0);
  if(!actor) return reject(state,"Cette équipe n'est plus en position pour concentrer son attaque.");
  const unit=unitFor(rules,actor.unitId);
  if(!unit) return reject(state,"La fiche de cette équipe est manquante.");
  const range=clamp(unit.range*2+3,5,22);
  const hostile=arena.actors
    .filter(other=>other.side==="rival"&&other.hp>0&&Math.abs(other.x-actor.x)<=range)
    .sort((a,b)=>Math.abs(a.x-actor.x)-Math.abs(b.x-actor.x)||a.id.localeCompare(b.id))[0];
  if(!hostile) return reject(state,"Aucune cible visible dans la portée réellement définie pour cette équipe.");
  const actors=arena.actors.map(item=>item.id===hostile.id?
    {...item,hp:Math.max(0,item.hp-damageFor(actor.unitId,rules)*2)}:{...item});
  return accept({...state,active:{...mission,assault:{...arena,ap:arena.ap-20,
    usedSpecials:[...(arena.usedSpecials??[]),teamId],actors}}},
    "Concentration de tir V6 : "+actor.unitId+" engage une cible en portée. Manœuvre déjà consommée pour ce mandat.");
}

/**
 * V140 finite source-bound opposition plan. Profiles are GAME-AUTHORED:
 * all units already exist in the V6 Bible; regional salt is not a film
 * franchise canonical spawn table. Four distinct unit roles when possible.
 */
export interface WarAssaultWaveProfileV140{
 territoryId:string;regionId:string;unitIds:string[];maximumWaves:number;
}
export function warAssaultWaveProfileV140(targetId:string,rules:WarRulesV6):WarAssaultWaveProfileV140 {
 const territory=rules.territories.find(t=>t.id===targetId);
 if(!territory)throw new RangeError("Territoire W3 inconnu de la Bible V6.");
 const source=rules.units.filter(u=>u.fullMembers>0&&u.commandPoints>0)
  .sort((a,b)=>a.id.localeCompare(b.id));
 if(!source.length)throw new Error("Aucune unité opposée existante dans la Bible V6.");
 let hash=2166136261;
 for(const char of territory.region+":"+territory.id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 const rotated=source.slice(hash%source.length).concat(source.slice(0,hash%source.length));
 const taken=new Set<string>(),roles=new Set<string>();
 const picked:string[]=[];
 for(const u of rotated){
  if(picked.length>=4)break;
  if(roles.has(u.role))continue;
  picked.push(u.id);taken.add(u.id);roles.add(u.role);
 }
 for(const u of rotated){if(picked.length>=4)break;if(!taken.has(u.id)){picked.push(u.id);taken.add(u.id);}}
 return {territoryId:territory.id,regionId:territory.region,unitIds:picked,
  maximumWaves:Math.min(9,6+Math.floor(Math.max(0,territory.terrainDefense)/12))};
}

export function stepAssaultV115(state:WarOperationsStateV115,rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active, arena=mission?.assault;
  if(mission?.mode!=="assault" || !arena) return reject(state,"Aucune bataille latérale en cours.");
  const tick=mission.tick+1;
  const actors=arena.actors.map(actor=>({...actor}));
  const profile=warAssaultWaveProfileV140(mission.targetId,rules);
  const roster=arena.rivalRosterIds?.length?arena.rivalRosterIds:profile.unitIds;
  let wavesIssued=arena.wavesIssued??0;
  if(tick%8===0&&wavesIssued<profile.maximumWaves&&
      actors.filter(a=>a.side==="rival"&&a.hp>0).length<7&&
      !actors.some(a=>a.hp>0&&a.x>=95)) {
    const sourceId=roster[wavesIssued%roster.length];
    const source=rules.units.find(u=>u.id===sourceId&&u.fullMembers>0&&u.commandPoints>0);
    if(source){actors.push({id:"rival-"+tick,teamId:null,unitId:source.id,
       side:"rival",x:95,hp:lifeFor(source.id,rules)});wavesIssued++;}
  }
  // Damage is a simultaneous exchange: array processing order no longer
  // changes who was able to strike during this same tactical second.
  const exchange=warAssaultContactV141(actors,rules,arena.heldUntil??{},tick,
    arena.focusOrders??{},arena.bracedUntil??{},arena.interposeOrders??{});
  const ownBase=arena.ownBase-exchange.ownBaseDamage;
  const rivalBase=arena.rivalBase-exchange.rivalBaseDamage;
  const wounds=unique([...arena.fallen,...exchange.actors
    .filter(actor=>actor.hp<=0&&actor.teamId).map(actor=>actor.teamId!)]);
  const level=arena.apLevel??1;
  const nextArena={...arena,ap:clamp(arena.ap+9+(level-1)*4,0,100+(level-1)*35),ownBase:Math.max(0,ownBase),rivalBase:Math.max(0,rivalBase),
    actors:exchange.actors.filter(actor=>actor.hp>0),fallen:wounds,
    rivalRosterIds:[...roster],wavesIssued,
    bracedUntil:Object.fromEntries(Object.entries(arena.bracedUntil??{})
      .filter(([,until])=>until>tick)),
    interposeOrders:Object.fromEntries(Object.entries(arena.interposeOrders??{})
      .filter(([,order])=>order.expiresAtTick>tick&&
        exchange.actors.some(a=>a.teamId===order.guardianTeamId&&a.hp>0))),
    focusOrders:Object.fromEntries(Object.entries(arena.focusOrders??{})
      .filter(([teamId,order])=>!exchange.focusedTeamIds.includes(teamId)&&
        order.expiresAtTick>tick)),
    heldUntil:Object.fromEntries(Object.entries(arena.heldUntil??{}).filter(([,until])=>until>tick))};
  const advanced={...state,clock:state.clock+1,active:{...mission,tick,assault:nextArena}};
  if(rivalBase<=0 || ownBase<=0 || tick>=95) {
    const outcome = rivalBase<=0 && ownBase>0 ? "victory" : "defeat";
    return accept(recordOutcome(advanced,mission.id,"assault",null,mission.targetId,mission.teamIds,outcome,nextArena.fallen,rules,
      outcome==="victory"?"Bastion adverse neutralisé dans la simulation latérale.":"Sortie repoussée dans l'exercice."),"Bataille terminée : rapport consigné.");
  }
  return accept(advanced,"La bataille latérale progresse.");
}
export type StealthCommandV115 = "up"|"down"|"left"|"right"|"cloak"|"interact"|"wait"|"decoy"|"hide"|"listen"|"quiet-sabotage"|"cover-up"|"cover-down"|"cover-left"|"cover-right";
export function commandStealthV115(state:WarOperationsStateV115,command:StealthCommandV115,rules:WarRulesV6):WarOperationsUpdateV115 {
 const mission=state.active, stealth=mission?.stealth;
 if(mission?.mode!=="stealth" || !stealth)return reject(state,"Aucune infiltration active.");
 if(stealth.reinforcementMode===undefined&&!stealth.supportGuard&&!stealth.reinforcementIssued)
  return reject(state,"Choisissez la règle de renfort pour reprendre cette archive.");
 if(state.sourceSha!==rules.metadata.sha256)return reject(state,"Bible de l'infiltration incompatible.");
 if(!["up","down","left","right","cloak","interact","wait","decoy","hide","listen","quiet-sabotage","cover-up","cover-down","cover-left","cover-right"].includes(command))
  return reject(state,"Action inconnue.");
 const terrain=warMissionTerrainV116(mission.targetId,rules);
 let {x,y,cloaked,energy,alarm,sabotaged,guardX,guardDirection}=stealth;
 let guardY=stealth.guardY??2;
 let supportGuard=stealth.supportGuard?{...stealth.supportGuard}:undefined;
 let decoyX=stealth.decoyX,decoyY=stealth.decoyY,decoyTurns=stealth.decoyTurns??0,decoyUsed=stealth.decoyUsed??false;
 let usedCoverIds=[...(stealth.usedCoverIds??[])];
 let silentStepsUsed=stealth.silentStepsUsed??0;
 let acousticUsed=stealth.acousticUsed??0;
 let heardBearing=stealth.heardBearing,heardAtTick=stealth.heardAtTick;
 let investigation=stealth.guardInvestigation;
 const quietMovement=command.startsWith("cover-");
 if(command==="listen"){
  if(!terrain.cover.includes(coord(x,y))||cloaked||energy<1||acousticUsed>=2||
    Math.min(distance({x,y},{x:guardX,y:guardY}),
      supportGuard?distance({x,y},supportGuard):Infinity)>5)
   return reject(state,"Écoute refusée : couvert réel, patrouille à portée acoustique, batterie et limite de deux usages.");
  acousticUsed++;energy--;
 }
 if(command==="hide"){
  const cover=coord(x,y);
  if(!terrain.cover.includes(cover))
   return reject(state,"Dissimulation impossible : rejoignez physiquement un couvert W3.");
  if(usedCoverIds.includes(cover))
   return reject(state,"Ce couvert a déjà servi à reprendre l'initiative.");
  if(alarm===0&&energy===5)
   return reject(state,"Aucune vigilance à récupérer : économie du couvert préservée.");
  usedCoverIds=[...usedCoverIds,cover];
 }
 if(command==="quiet-sabotage"){
  if(sabotaged||stealth.silentSabotageUsed||cloaked||energy<2||
    distance({x,y},terrain.relay)>1||
    (distance({x,y},{x:guardX,y:guardY})<=2||
      (supportGuard&&distance({x,y},supportGuard)<=2)))
   return reject(state,"Sabotage discret refusé : relais adjacent, 2 énergie et patrouille réellement distante requis.");
  energy-=2;sabotaged=true;
 }
 if(command==="cloak"&&energy<=0&&!cloaked)return reject(state,"Le camouflage est épuisé.");
 if(command==="decoy"&&(decoyUsed||cloaked||energy<2))
  return reject(state,"La diversion sonore exige 2 points d'énergie, un pisteur visible et un seul usage.");
 if(command==="cloak")cloaked=!cloaked;
 else if(command==="decoy"){
  // Physical emission from the hunter's current tile; guard hears the signal
  // only during the next three decisions and never teleports to it.
  energy-=2;decoyUsed=true;decoyX=x;decoyY=y;decoyTurns=3;
 }else if(command==="interact"){
  if(distance({x,y},terrain.relay)>1||sabotaged)
   return reject(state,"Atteignez le relais non désactivé avant de le saboter.");
  sabotaged=true;cloaked=false;
 }else if(command!=="wait"&&command!=="hide"&&command!=="listen"&&command!=="quiet-sabotage"){
  const direction=quietMovement?command.slice(6):command;
  const dx=direction==="right"?1:direction==="left"?-1:0,
    dy=direction==="down"?1:direction==="up"?-1:0;
  const nx=x+dx,ny=y+dy;
  if(warTerrainCellBlockedV116(terrain,nx,ny))
   return reject(state,"Paroi ou limite du passage : déplacement impossible.");
  if(quietMovement){
   if(cloaked||energy<1||silentStepsUsed>=2||!terrain.cover.includes(coord(nx,ny)))
    return reject(state,"Déplacement couvert refusé : case de protection adjacente, batterie et deux usages maximum requis.");
   energy-=1;silentStepsUsed++;
  }
  x=nx;y=ny;
 }
 if(cloaked){energy=Math.max(0,energy-1);if(!energy)cloaked=false;}
 const previousGuard={guardX,guardY,guardDirection};
 // The first guard follows a memory only after losing the player. The sound
 // decoy has priority; the support guard never receives this private memory.
 const lostSight=cloaked||distance({x,y},{x:guardX,y:guardY})>3||
  !warTerrainLineOfSightV116(terrain,{x:guardX,y:guardY},{x,y});
 const memoryTarget=investigation&&investigation.turns>0&&lostSight?
  {x:investigation.x,y:investigation.y}:null;
 const decoyTarget=decoyTurns>0&&decoyX!==undefined?{x:decoyX,y:decoyY??2}:null;
 const patrol=warStealthDecoyPatrolV141(terrain,
  {guardX,guardY,guardDirection},decoyTarget??memoryTarget);
 // Reserve the second guard's old tile before moving either actor. Otherwise
 // a trapped second guard can be left sharing the primary guard's new tile.
 const first=supportGuard&&patrol.guardX===supportGuard.x&&patrol.guardY===supportGuard.y?
  previousGuard:patrol;
 guardX=first.guardX;guardY=first.guardY;guardDirection=first.guardDirection;
 if(supportGuard){
  const second=warStealthDecoyPatrolV141(terrain,
    {guardX:supportGuard.x,guardY:supportGuard.y,guardDirection:supportGuard.direction},
    decoyTurns>0&&decoyX!==undefined?{x:decoyX,y:decoyY??2}:null);
  // A patrol marker may not stack on the other living guard.
  // The secondary patrol may pause or step to a still-passable neighbor,
  // but never travels more than one orthogonal tile per action.
  const candidates=[
   {x:second.guardX,y:second.guardY},
   {x:supportGuard.x,y:supportGuard.y},
   {x:supportGuard.x+1,y:supportGuard.y},
   {x:supportGuard.x-1,y:supportGuard.y},
   {x:supportGuard.x,y:supportGuard.y+1},
   {x:supportGuard.x,y:supportGuard.y-1},
  ].filter(p=>p.x>=4&&p.x<=7&&p.y>=1&&p.y<=3&&
    !(p.x===guardX&&p.y===guardY)&&
    !warTerrainCellBlockedV116(terrain,p.x,p.y)&&
    distance(p,supportGuard!)<=1);
  const occupiedFree=candidates[0];
  if(occupiedFree)
   supportGuard={x:occupiedFree.x,y:occupiedFree.y,
    direction:occupiedFree.x>supportGuard.x?1:
      occupiedFree.x<supportGuard.x?-1:second.guardDirection};
 }
 if(decoyTurns>0)decoyTurns--;
 if(investigation)investigation=investigation.turns>1?
  {...investigation,turns:investigation.turns-1}:undefined;
 // An authored cover breaks distant LOS only during a hide action.
 // A guard physically adjacent still sees the hunter.
 const hiding=(command==="hide"||quietMovement)&&terrain.cover.includes(coord(x,y))&&
   distance({x,y},{x:guardX,y:guardY})>1&&
   (!supportGuard||distance({x,y},supportGuard)>1);
 const primarySeen=!cloaked&&!hiding&&((y===guardY&&Math.abs(x-guardX)<=2)||
   (x===guardX&&Math.abs(y-guardY)<=1))&&
  warTerrainLineOfSightV116(terrain,{x:guardX,y:guardY},{x,y});
 const supportSeen=Boolean(supportGuard&&!cloaked&&!hiding&&
   ((y===supportGuard.y&&Math.abs(x-supportGuard.x)<=2)||
    (x===supportGuard.x&&Math.abs(y-supportGuard.y)<=1))&&
   warTerrainLineOfSightV116(terrain,supportGuard,{x,y}));
 const seen=primarySeen||supportSeen;
 if(seen||command==="interact")alarm++;
 if(primarySeen)investigation={x,y,turns:2};
 // The automatic PR #57 behavior is opt-in for new exercises. The default
 // remains the existing manual rule; never create a second guard twice.
 let reinforcementIssued=stealth.reinforcementIssued;
 if(stealth.reinforcementMode==="decoy"&&decoyUsed&&alarm>=1&&!supportGuard&&!reinforcementIssued){
  supportGuard=chooseStealthSupportGuard(terrain,{x:guardX,y:guardY},{x,y});
  if(supportGuard)reinforcementIssued=true;
 }
 if(command==="listen"){
  // Direction is coarse relative bearing only. No guard x-coordinate,
  // opponent ID, camera reveal or cross-planet information enters the record.
  const acoustic=(supportGuard&&distance({x,y},supportGuard)<
      distance({x,y},{x:guardX,y:guardY}))?supportGuard.x:guardX;
  heardBearing=acoustic>x+1?"est":acoustic<x-1?"ouest":"proche";
  heardAtTick=mission.tick+1;
 }
 // Quiet waiting replenishes the existing cloak battery only while actually
 // concealed: no free energy from an alarmed/visible hunter.
 if(command==="wait"&&!cloaked&&!seen)energy=Math.min(5,energy+1);
 if(command==="hide"&&!seen){
  alarm=Math.max(0,alarm-1);
  energy=Math.min(5,energy+1);
 }
 const nextStealth={x,y,guardX,guardY,guardDirection,alarm,cloaked,energy,sabotaged,
  decoyX,decoyY,decoyTurns,decoyUsed,usedCoverIds,silentStepsUsed,acousticUsed,heardBearing,heardAtTick,
  silentSabotageUsed:stealth.silentSabotageUsed||command==="quiet-sabotage",
  dashUsed:stealth.dashUsed,guardInvestigation:investigation,
  supportGuard,reinforcementIssued,reinforcementMode:stealth.reinforcementMode};
 const advanced={...state,clock:state.clock+1,active:{...mission,tick:mission.tick+1,stealth:nextStealth}};
 if(alarm>=3)return accept(recordOutcome(advanced,mission.id,"stealth",null,mission.targetId,mission.teamIds,"defeat",mission.teamIds.slice(0,1),rules,
  "Patrouille alertée : extraction abandonnée."),"Infiltration compromise.");
 if(sabotaged&&x===terrain.extraction.x&&y===terrain.extraction.y)
  return accept(recordOutcome(advanced,mission.id,"stealth",null,mission.targetId,mission.teamIds,"victory",[],rules,
   "Relais désactivé et pisteur extrait ; renseignement et sabotage consignés."),"Extraction confirmée.");
 if(mission.tick>=65)return accept(recordOutcome(advanced,mission.id,"stealth",null,mission.targetId,mission.teamIds,"defeat",[],rules,
  "Fenêtre d'infiltration expirée."),"Mission interrompue par la durée de l'exercice.");
 return accept(advanced,command==="quiet-sabotage"?"Sabotage discret : 2 énergie engagées, sans alarme automatique.":
  command==="listen"?"Écoute locale : présence de la patrouille "+heardBearing+" ; aucune position exacte révélée.":
  quietMovement?"Déplacement protégé d’une case vers un couvert existant, contre 1 énergie.":
  command==="hide"?"Position prise derrière un vrai couvert ; alerte et batterie ajustées hors regard adverse.":
  command==="decoy"?"Diversion sonore déposée physiquement : la patrouille réagit pendant trois décisions.":
  command==="wait"?"Observation et attente : camouflage rechargé uniquement hors du regard adverse.":
  sabotaged?"Relais neutralisé : retournez au point d'extraction (1,4).":
  "Restez hors du champ de la patrouille et atteignez le relais (7,1).");
}
function rtsEnemyTurn(actors:WarRtsActorV115[],rules:WarRulesV6,terrain:WarMissionTerrainV116,
  scripted?:WarRtsScriptedObjectiveV119) {
  for(const rival of actors.filter(actor=>actor.side==="rival" && actor.hp>0)){
    const escape=warRtsBeaconEscapeStepV121(scripted,rival,actors,terrain);
    if(escape){rival.x=escape.x;rival.y=escape.y;continue;}
    const target=warRtsRivalTargetV120(scripted,rival,actors,terrain);
    if(!target) break;
    if(distance(target,rival)<=2&&warRtsSourceSightV120(scripted,rival,target,terrain)) target.hp-=damageFor(rival.unitId,rules);
    else {
      const occupied=actors.filter(actor=>actor!==rival&&actor.hp>0).map(actor=>coord(actor.x,actor.y));
      const next=warRtsNextPathStepV118(terrain,rival,target,occupied);
      if(next){rival.x=next.x;rival.y=next.y;}
    }
  }
}
function settleWarRtsAlternatingTurnV119(
  state:WarOperationsStateV115,mission:WarPlayableMissionV115,field:WarRtsV115,
  actors:WarRtsActorV115[],terrain:WarMissionTerrainV116,rules:WarRulesV6,
):WarOperationsUpdateV115 {
  const fallen=unique([...field.fallen,...actors.filter(item=>item.side==="ally" && item.hp<=0 && item.teamId).map(item=>item.teamId!)]);
  const staged=field.scripted?resolveWarRtsScriptedTickV119(field.scripted,actors,terrain):null;
  const removed=new Set(staged?.extractedThisTick??[]);
  const alive=actors.filter(item=>item.hp>0&&(!item.teamId||!removed.has(item.teamId)));
  const holding=alive.some(item=>item.side==="ally"&&item.x===7&&item.y===3) && !alive.some(item=>item.side==="rival"&&distance(item,{x:7,y:3})<=1);
  const hold=holding?field.hold+1:0;
  const history=[...(field.history??[]),
    "Ordre "+(mission.tick+1)+" : "+(staged?.message??"Manœuvre tactique résolue.")].slice(-10);
  const advanced={...state,clock:state.clock+1,active:{...mission,tick:mission.tick+1,
    rts:{...field,actors:alive,hold,fallen,history,...(staged?{scripted:staged.objective}:{})}}};
  if(staged?.outcome==="victory")return accept(recordOutcome(advanced,mission.id,"rts",null,mission.targetId,mission.teamIds,"victory",fallen,rules,
    mission.rts?.scripted?.scenarioId+" : "+staged.message,history),"Objectif W3 confirmé par les acteurs présents.");
  if(staged?.outcome==="defeat")return accept(recordOutcome(advanced,mission.id,"rts",null,mission.targetId,mission.teamIds,"defeat",fallen,rules,
    mission.rts?.scripted?.scenarioId+" : "+staged.message,history),"Mission W3 compromise : rapport sauvegardé.");
  if(!staged && alive.some(item=>item.side==="ally") && (hold>=2 || !alive.some(item=>item.side==="rival"))) return accept(recordOutcome(advanced,mission.id,"rts",null,mission.targetId,mission.teamIds,"victory",fallen,rules,
    "Objectif tenu deux ordres ou défense neutralisée. Le siège ne vaut pas annexion automatique.",history),"Objectif RTS sécurisé.");
  if(!alive.some(item=>item.side==="ally") || mission.tick>=49) return accept(recordOutcome(advanced,mission.id,"rts",null,mission.targetId,mission.teamIds,"defeat",fallen,rules,
    "Détachement replié après échec de l'objectif.",history),"RTS terminé : échec consigné.");
  return accept(advanced,staged?staged.message:"Ordre exécuté. L'adversaire a effectué sa réponse tactique.");
}
export function commandRtsV115(state:WarOperationsStateV115,teamId:string,x:number,y:number,rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active, field=mission?.rts;
  if(mission?.mode!=="rts" || !field || !Number.isInteger(x)||!Number.isInteger(y)||x<0||x>8||y<0||y>5) return reject(state,"Ordre RTS ou case invalide.");
  if(field.realtime) return reject(state,"La simulation RTS évolue en temps réel : donnez un ordre de destination au lieu de jouer un tour.");
  const terrain=warMissionTerrainV116(mission.targetId,rules);
  if(warTerrainCellBlockedV116(terrain,x,y)) return reject(state,"Position bloquée par le terrain réel de ce théâtre.");
  const actors=field.actors.map(actor=>({...actor}));
  const actor=actors.find(item=>item.teamId===teamId && item.hp>0);
  if(!actor) return reject(state,"Sélectionnez une équipe combattante encore active.");
  const occupant=actors.find(item=>item.hp>0 && item.x===x && item.y===y && item!==actor);
  const dist=distance(actor,{x,y});
  const unit=unitFor(rules,actor.unitId);
  if(occupant?.side==="rival") {
    if(dist>clamp(Math.round((unit?.range??1)/2),1,3)||!warRtsSourceSightV120(field.scripted,actor,occupant,terrain)) return reject(state,"Cible hors de portée ou masquée par une paroi.");
    occupant.hp-=damageFor(actor.unitId,rules)*2;
  } else {
    const occupied=actors.filter(item=>item!==actor&&item.hp>0).map(item=>coord(item.x,item.y));
    const length=warTerrainPathLengthV116(terrain,actor,{x,y},occupied);
    const carrying=(field.scripted?.kind==="cargo-escort"||field.scripted?.kind==="filter-repair")&&
      field.scripted.cargo.carrierTeamId===teamId;
    if(occupant || length===null || length===0 || length>(carrying?1:clamp(Math.ceil((unit?.mobility??1)/2),1,3)))
      return reject(state,"Case occupée ou itinéraire obstrué : le détachement ne traverse pas les murs.");
    actor.x=x;actor.y=y;
  }
  rtsEnemyTurn(actors,rules,terrain,field.scripted);
  return settleWarRtsAlternatingTurnV119(state,mission,field,actors,terrain,rules);
}

/** Holding an existing position is a true tactical turn. It is required by
 * W3-RTS02: a lone W3-U07 cannot defend a post for three turns by leaving it. */
export function holdWarRtsAlternatingV119(
  state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115 {
  const mission=state.active,field=mission?.rts;
  if(mission?.mode!=="rts"||!field||field.realtime)return reject(state,"Aucun ordre alterné de défense disponible.");
  if(!field.actors.some(actor=>actor.side==="ally"&&actor.teamId===teamId&&actor.hp>0))
    return reject(state,"Le poste exige un détachement réel encore apte.");
  const terrain=warMissionTerrainV116(mission.targetId,rules);
  const actors=field.actors.map(actor=>({...actor}));
  rtsEnemyTurn(actors,rules,terrain,field.scripted);
  return settleWarRtsAlternatingTurnV119(state,mission,field,actors,terrain,rules);
}

/** Cover on this small exercise grid is a prototype abstraction, not a map
 * from any film. Only units actually standing on cover gain mitigation. */
export const WAR_RTS_COVER_V115 = Object.freeze(["3,1","4,3","5,4","6,2"] as const);
const coverAt = (actor:WarRtsActorV115,terrain:WarMissionTerrainV116) => terrain.cover.includes(coord(actor.x,actor.y));
export function toggleWarRtsRealtimeV115(state:WarOperationsStateV115,on:boolean):WarOperationsUpdateV115 {
  const mission=state.active,field=mission?.rts;
  if(mission?.mode!=="rts"||!field||typeof on!=="boolean") return reject(state,"Bataille RTS ou commande absente.");
  if(Boolean(field.realtime)===on) return reject(state,"La vitesse de simulation est déjà dans cet état.");
  const nextField={...field,realtime:on,orders:on?field.orders??{}:{}};
  return accept({...state,active:{...mission,rts:nextField}},on?"Temps réel activé. Donnez vos ordres, le front avance chaque seconde.":"Commandement tactique par ordre rétabli.");
}
export function issueWarRtsRealtimeOrderV115(
  state:WarOperationsStateV115,teamId:string,x:number,y:number,kind:"advance"|"hold"|"attack"="advance",
  rules:WarRulesV6=DEFAULT_WAR_RULES_V6,
):WarOperationsUpdateV115 {
  const mission=state.active,field=mission?.rts;
  if(mission?.mode!=="rts"||!field?.realtime||!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>8||y<0||y>5||
    !["advance","hold","attack"].includes(kind)) return reject(state,"Ordre en temps réel invalide.");
  const terrain=warMissionTerrainV116(mission.targetId,rules);
  if(warTerrainCellBlockedV116(terrain,x,y)) return reject(state,"Le point d’ordre est occupé par un obstacle du territoire.");
  const actor=field.actors.find(item=>item.teamId===teamId&&item.side==="ally"&&item.hp>0);
  if(!actor) return reject(state,"Équipe absente ou hors de combat.");
  const enemy=field.actors.find(item=>item.side==="rival"&&item.hp>0&&item.x===x&&item.y===y);
  if(kind==="attack" && !enemy) return reject(state,"Cette case ne contient pas une cible ennemie.");
  if(kind==="advance" && field.actors.some(item=>item.hp>0&&item.x===x&&item.y===y&&item!==actor))
    return reject(state,"La case de destination est actuellement occupée.");
  const order={x,y,kind};
  return accept({...state,active:{...mission,rts:{...field,orders:{...(field.orders??{}),[teamId]:order}}}},
    kind==="hold"?"Défense locale ordonnée.":kind==="attack"?"Cible désignée.":"Progression vers le point de rassemblement.");
}
export function stepWarRtsRealtimeV115(state:WarOperationsStateV115,rules:WarRulesV6):WarOperationsUpdateV115 {
  const mission=state.active,field=mission?.rts;
  if(mission?.mode!=="rts"||!field?.realtime) return reject(state,"La bataille RTS temps réel n'est pas active.");
  const terrain=warMissionTerrainV116(mission.targetId,rules);
  const actors=field.actors.map(a=>({...a}));
  const commands=field.orders??{};
  const allies=actors.filter(actor=>actor.side==="ally"&&actor.hp>0);
  for(const ally of allies){
    const order=ally.teamId?commands[ally.teamId]:undefined;
    const unit=unitFor(rules,ally.unitId),range=clamp(Math.round((unit?.range??2)/2),1,4);
    const targets=actors.filter(actor=>actor.side==="rival"&&actor.hp>0);
    const assigned=order?.kind==="attack"?targets.find(t=>t.x===order.x&&t.y===order.y):undefined;
    const nearest=targets.sort((a,b)=>distance(ally,a)-distance(ally,b)||a.id.localeCompare(b.id))[0];
    const target=assigned??nearest;
    if(target&&distance(ally,target)<=range&&warRtsSourceSightV120(field.scripted,ally,target,terrain))
      target.hp-=damageFor(ally.unitId,rules)*(order?.kind==="hold"?1:2);
    else if(order && order.kind!=="hold") {
      const destination=assigned??order;
      const candidates=[
        {x:ally.x+Math.sign(destination.x-ally.x),y:ally.y},
        {x:ally.x,y:ally.y+Math.sign(destination.y-ally.y)},
        {x:ally.x,y:ally.y-1},{x:ally.x,y:ally.y+1},
        {x:ally.x-1,y:ally.y},{x:ally.x+1,y:ally.y},
      ].filter(pos=>!warTerrainCellBlockedV116(terrain,pos.x,pos.y)&&
        !actors.some(other=>other!==ally&&other.hp>0&&other.x===pos.x&&other.y===pos.y));
      const occupied=actors.filter(other=>other!==ally&&other.hp>0).map(other=>coord(other.x,other.y));
      const length=(a:{x:number;y:number})=>warTerrainPathLengthV116(terrain,a,destination,occupied)??1000;
      candidates.sort((a,b)=>length(a)-length(b)||distance(a,destination)-distance(b,destination));
      if(candidates[0]&&length(candidates[0])<length(ally)){ally.x=candidates[0].x;ally.y=candidates[0].y;}
    }
  }
  for(const rival of actors.filter(a=>a.side==="rival"&&a.hp>0)){
    const escape=warRtsBeaconEscapeStepV121(field.scripted,rival,actors,terrain);
    if(escape){rival.x=escape.x;rival.y=escape.y;continue;}
    const target=warRtsRivalTargetV120(field.scripted,rival,actors,terrain);
    if(!target) break;
    const range=clamp(Math.round((unitFor(rules,rival.unitId)?.range??2)/2),1,3);
    if(distance(rival,target)<=range&&warRtsSourceSightV120(field.scripted,rival,target,terrain)){
      const attack=damageFor(rival.unitId,rules);
      const protectedByCover=coverAt(target,terrain)||Boolean(target.teamId&&commands[target.teamId]?.kind==="hold");
      target.hp-=protectedByCover?Math.max(1,Math.ceil(attack*.65)):attack;
    } else {
      const occupied=actors.filter(actor=>actor!==rival&&actor.hp>0).map(actor=>coord(actor.x,actor.y));
      const next=warRtsNextPathStepV118(terrain,rival,target,occupied);
      if(next){rival.x=next.x;rival.y=next.y;}
    }
  }
  const fallen=unique([...field.fallen,...actors.filter(a=>a.side==="ally"&&a.hp<=0&&a.teamId).map(a=>a.teamId!)]);
  const staged=field.scripted?resolveWarRtsScriptedTickV119(field.scripted,actors,terrain):null;
  const removed=new Set(staged?.extractedThisTick??[]);
  const live=actors.filter(a=>a.hp>0&&(!a.teamId||!removed.has(a.teamId)));
  const isHolding=live.some(a=>a.side==="ally"&&a.x===7&&a.y===3)&&!live.some(a=>a.side==="rival"&&distance(a,{x:7,y:3})<=1);
  const hold=isHolding?field.hold+1:0;
  const history=[...(field.history??[]),
    "Temps réel "+(mission.tick+1)+" : "+(staged?.message??"Tirs et mouvement résolus.")].slice(-10);
  const next={...state,clock:state.clock+1,active:{...mission,tick:mission.tick+1,
    rts:{...field,actors:live,fallen,hold,history,...(staged?{scripted:staged.objective}:{})}}};
  if(staged?.outcome==="victory")return accept(recordOutcome(next,mission.id,"rts",null,mission.targetId,mission.teamIds,"victory",fallen,rules,
    mission.rts?.scripted?.scenarioId+" : "+staged.message,history),"Objectif W3 atteint en temps réel.");
  if(staged?.outcome==="defeat")return accept(recordOutcome(next,mission.id,"rts",null,mission.targetId,mission.teamIds,"defeat",fallen,rules,
    mission.rts?.scripted?.scenarioId+" : "+staged.message,history),"Mission W3 échouée : évacuation du reste de l'équipe.");
  if(!staged&&live.some(a=>a.side==="ally")&&(hold>=3||!live.some(a=>a.side==="rival")))
    return accept(recordOutcome(next,mission.id,"rts",null,mission.targetId,mission.teamIds,"victory",fallen,rules,
      "Bataille temps réel : zone sécurisée par les équipes réellement déployées. Aucune souveraineté automatique.",history),"Victoire de l'exercice RTS en temps réel.");
  if(!live.some(a=>a.side==="ally")||mission.tick>=89)
    return accept(recordOutcome(next,mission.id,"rts",null,mission.targetId,mission.teamIds,"defeat",fallen,rules,
      "Bataille temps réel : l'opération a été stoppée ou le temps imparti est expiré.",history),"Défaite RTS : retour et pertes consignés.");
  return accept(next,staged?staged.message:"Bataille RTS : déplacements et échanges résolus pour cette seconde.");
}
function hashSeed(id:string):number {let h=2166136261;for(let i=0;i<id.length;i++) h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;}
/**
 * Phase-by-phase, reproducible Outer Ops exercise, based on known V6 units,
 * elapsed route and surveyed terrain. This never reads a hidden V85 garrison.
 * Its pseudo-random variation uses only an operation id, not Math.random().
 */
export interface WarOuterResolutionV115 {
  outcome: "victory" | "defeat"; woundedTeamIds: string[];
  threat: number; strength: number; engagementLog: string[];
}
export function simulateWarOuterMissionV115(
  state: WarOperationsStateV115, order: WarOuterMissionV115, rules: WarRulesV6,
): WarOuterResolutionV115 {
  const territory=rules.territories.find(item=>item.id===order.targetId);
  if(!territory || !["recon","escort","intercept"].includes(order.focus)) throw new Error("Mandat délégué non valable.");
  const deployed=order.teamIds.map(id=>{
    const team=ownTeam(state,id),unit=team&&unitFor(rules,team.unitId);
    if(!team || !unit) throw new Error("Équipe engagée inconnue.");
    const fit=team.members.filter(member=>member.status==="fit").length;
    const readiness=fit/Math.max(1,unit.fullMembers) * Math.max(.5,1-team.fatigue/200);
    return {team,unit,fit,readiness};
  });
  const scout=deployed.reduce((sum,a)=>sum+(a.unit.mobility*2+a.unit.range)*a.readiness,0);
  const assault=deployed.reduce((sum,a)=>sum+(a.unit.attack+a.unit.defense*.3)*a.readiness,0);
  const shield=deployed.reduce((sum,a)=>sum+(a.unit.defense+a.unit.mobility*.5)*a.readiness,0);
  // V139: later developments on this front do not retroactively alter an
  // already-dispatched Outer Ops. Legacy orders without a snapshot keep
  // the earlier behavior so old local archives remain readable.
  const briefing=order.departureContext;
  const support=(briefing?briefing.intel:state.intelIds.includes(order.targetId))?4:0;
  const sabotage=(briefing?briefing.weakened:state.weakenedIds.includes(order.targetId))?5:0;
  const escorted=(briefing?briefing.escorted:state.escortedIds.includes(order.targetId))?3:0;
  const pressure=Math.min(8,(briefing?.pressure??state.pressure[order.targetId]??0)*2);
  const fieldBonus=order.fieldSupport?.paidRav===2?4:0;
  const reconHaltBonus=order.reconHalt&&["recon","escort"].includes(order.focus)?3:0;
  const incidentBonus=order.routeIncident?.kind==="secure"?3:
    order.routeIncident?.kind==="detour"?2:0;
  const passageBonus=order.passageCheck?.paidRav===1?2:0;
  const strength=Math.round((order.focus==="recon"?scout*1.4:order.focus==="escort"?shield*.9:assault*.9)+support+sabotage+escorted+pressure+fieldBonus+reconHaltBonus+incidentBonus+passageBonus);
  const roll=(round:number)=>hashSeed(order.id+"-"+order.targetId+"-"+order.focus+"-"+round)%11-5;
  const baseThreat=Math.max(8,territory.terrainDefense+order.routeIds.length*2);
  const threshold=(order.focus==="recon"?Math.round(baseThreat*.7):order.focus==="escort"?Math.round(baseThreat*.9):baseThreat)+(order.forcedPace?2:0);
  const engagementLog=[
    ...(order.departureContext?["Briefing V139 figé au départ : aucun bonus stratégique rétroactif."]:[]),
    ...(order.fieldSignal?["Bulletin V138 : "+order.fieldSignal.assessment+
      " · "+order.fieldSignal.passages+" passages connus · "+order.fieldSignal.fitMembers+
      " aptes ; aucune prédiction de victoire."]:[]),
    ...(order.retask?["Réorientation V135 : "+order.retask.oldFocus+" → "+order.focus+" à "+order.retask.changedAt+" ; aucun coût ou résultat anticipé."]:[]),
    ...(order.fieldSupport?["Soutien V136 : 2 RAV réels engagés à "+order.fieldSupport.allocatedAt+
      " ; +4 capacité de terrain sur ce mandat uniquement."]:[]),
    ...(order.passageCheck?["Contrôle V144 de passage "+order.passageCheck.passageId+
      " · condition : "+order.passageCheck.sourceCondition+" · 1 RAV payé, +2 préparation au résultat."]:[]),
    ...(order.forcedPace?["Marche forcée V144 : 3 RAV engagés, échéance avancée de 8 secondes, résistance +2."]:[]),
    ...(order.routeIncident?["Incident de passage V143 "+order.routeIncident.passageId+
      " : "+order.routeIncident.sourceIncident+" · décision "+order.routeIncident.kind+
      " · "+order.routeIncident.paidRav+" RAV engagés, aucun résultat anticipé."]:[]),
    ...(order.reconHalt?["Halte de reconnaissance V137 : 15 secondes de route supplémentaires, "+
      "+3 capacité de reconnaissance défensive ; aucun renseignement avant le rapport."]:[]),
    "Mandat "+order.id+" : "+order.teamIds.length+" équipe(s), "+order.routeIds.length+" passage(s) validés.",
    "Préparation : observation "+(support?"confirmée":"non confirmée")+
      ", relais "+(sabotage?"affaibli":"intact")+", escorte "+(escorted?"connue":"non reconnue")+".",
  ];
  let points=0;
  for(let round=1;round<=3;round++){
    const variation=roll(round);
    const effective=strength+variation+(round===1&&order.focus==="recon"?3:0);
    const resistance=threshold+(round===3?2:0);
    const margin=effective-resistance;
    if(margin>=0) points++;
    engagementLog.push("Échange "+round+"/3 : capacité relative "+effective+
      ", résistance d'exercice "+resistance+" ; "+(margin>=0?"position tenue":"ligne perdue")+".");
  }
  const won=points>=2;
  const woundedTeamIds=won?[]:deployed.length?[deployed.reduce((worst,item)=>item.readiness<worst.readiness?item:worst).team.id]:[];
  engagementLog.push(won?
    "Résultat : mandat accompli ; les détachements reçoivent un compte rendu signé.":
    "Résultat : mission interrompue ; blessure légère d'exercice et équipe rapatriée.");
  return {outcome:won?"victory":"defeat",woundedTeamIds,threat:threshold,strength,engagementLog};
}
/** Recall an Outer Ops squad without instant teleportation or another cost.
 * The original upkeep stays spent; route time and previous departure remain.
 * Every authorized recall returns a unique final "retreat" report only upon
 * actual arrival. Retired orders cannot be recalled or settled twice.
 */
export function recallWarOuterMissionV116(
  state:WarOperationsStateV115, id:string, now:number, rules:WarRulesV6,
):WarOperationsUpdateV115 {
  if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
    return reject(state,"Date ou source de l'ordre de rappel invalide.");
  const order=state.outer.find(item=>item.id===id);
  if(!order)return reject(state,"Ce mandat n'est plus en cours ou n'existe pas.");
  if(order.recall)return reject(state,"Le rappel de cette équipe est déjà en cours.");
  if(now<order.startedAt||now>=order.dueAt)return reject(state,"Le départ n'a pas commencé ou le mandat arrive déjà à échéance.");
  // Exercise timing: 10s minimum, plus time to retrace the route. This is
  // NOT a speed, ship or teleporter supplied by the official canon.
  const returnMs=Math.max(10000,Math.ceil((now-order.startedAt)/2),order.routeIds.length*3000);
  if(!Number.isSafeInteger(now+returnMs))return reject(state,"Horloge trop élevée pour conserver ce trajet.");
  const returning:WarOuterMissionV115={
    ...order,dueAt:now+returnMs,
    recall:{orderedAt:now,originalDueAt:order.dueAt},
  };
  return accept({...state,outer:state.outer.map(item=>item.id===id?returning:item)},
    "Rappel transmis : le détachement reste indisponible pendant son trajet de retour. Aucun remboursement ni résultat anticipé.");
}
export function settleWarOuterOpsV115(state:WarOperationsStateV115, now:number,rules:WarRulesV6):WarOperationsUpdateV115 {
  if(!Number.isSafeInteger(now)||now<0 || state.sourceSha!==rules.metadata.sha256) return reject(state,"Date ou règles incompatibles.");
  const due=state.outer.filter(order=>now>=order.dueAt).sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id));
  if(!due.length) return reject(state,"Aucun rapport délégué arrivé à échéance.");
  let next=state;
  for(const order of due) {
    if(order.recall){
      next=recordOutcome({...next,clock:next.clock+1},order.id,"outer",order.focus,
        order.targetId,order.teamIds,"retreat",[],rules,
        "Rappel terminé : équipe revenue par son itinéraire connu. Aucun nouveau renseignement, aucun gain d'XP, aucune blessure ou annexion automatique.",
        ["Ordre de retour reçu à "+order.recall.orderedAt+".",
          "Mandat initial attendu à "+order.recall.originalDueAt+" ; délai de retour "+(order.dueAt-order.recall.orderedAt)+" ms.",
          "Débarquement confirmé : effectif original libéré et entretien de départ non remboursé."]);
      continue;
    }
    const battle=simulateWarOuterMissionV115(next,order,rules);
    next=recordOutcome({...next,clock:next.clock+1},order.id,"outer",order.focus,order.targetId,order.teamIds,battle.outcome,
      battle.woundedTeamIds,rules,
      (battle.outcome==="victory"?"Mandat abouti. ":"Mandat repoussé. ")+
      (order.focus==="recon"?"Rapport de piste.":order.focus==="escort"?"Itinéraire d'escorte.":"Interception des relais.")+
      " Capacité "+battle.strength+", résistance "+battle.threat+" ; aucun butin ou vaisseau inventé.",
      battle.engagementLog);
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
    const waiting=v.pendingRecruits??[];
    if(!Array.isArray(waiting)||waiting.length>4||v.teams.length+waiting.length>16||
      waiting.some(item=>!isTextId(item.id)||!isTextId(item.teamId)||!unitFor(rules,item.unitId)||
        !Number.isSafeInteger(item.startedAt)||item.startedAt<0||
        !Number.isSafeInteger(item.dueAt)||item.dueAt<=item.startedAt||item.dueAt-item.startedAt>1500000||
        !Number.isSafeInteger(item.paidRav)||item.paidRav<0||item.paidRav>rules.parameters.rav_cap||
        v.teams.some(team=>team.id===item.teamId))) return null;
    if(unique(waiting.map(item=>item.id)).length!==waiting.length||
      unique(waiting.map(item=>item.teamId)).length!==waiting.length||
      (v.recruitedTeamIds!==undefined&&(!Array.isArray(v.recruitedTeamIds)||v.recruitedTeamIds.length>16||
        v.recruitedTeamIds.some(id=>!v.teams.some(team=>team.id===id))))) return null;
    const care=v.pendingTreatments??[];
    if(!Array.isArray(care)||care.length>2||
      care.some(item=>!isTextId(item.id)||!isTextId(item.teamId)||!isTextId(item.medicTeamId)||
        !isTextId(item.memberId)||item.teamId===item.medicTeamId||
        !Number.isSafeInteger(item.startedAt)||item.startedAt<0||
        !Number.isSafeInteger(item.dueAt)||item.dueAt-item.startedAt!==45000||
        !Number.isSafeInteger(item.paidRav)||item.paidRav!==unitFor(rules,"W3-U18")?.upkeepRav||
        ownTeam(v,item.teamId)?.members.find(person=>person.id===item.memberId)?.status!=="wounded"||
        ownTeam(v,item.medicTeamId)?.unitId!=="W3-U18"||
        !ownTeam(v,item.medicTeamId)?.members.some(person=>person.status==="fit"))) return null;
    const careReceipts=v.treatmentReceipts??[];
    if(!Array.isArray(careReceipts)||careReceipts.length>120||
      careReceipts.some(item=>!isTextId(item))||unique(careReceipts).length!==careReceipts.length||
      care.some(item=>careReceipts.includes(item.id))||
      unique(care.map(item=>item.id)).length!==care.length) return null;
    const allMemberIds=v.teams.flatMap(team=>team.members.map(member=>member.id));
    if(unique(allMemberIds).length!==allMemberIds.length) return null;
    if(!v.assignments||typeof v.assignments!=="object"||Array.isArray(v.assignments)||Object.keys(v.assignments).length>16) return null;
    if(!Array.isArray(v.outer)||v.outer.length>3 || !Array.isArray(v.reports)||v.reports.length>MAX_REPORTS ||
      !Array.isArray(v.intelIds)||!Array.isArray(v.weakenedIds)||!Array.isArray(v.escortedIds) ||
      !v.pressure||typeof v.pressure!=="object") return null;
    const sites=new Set(rules.territories.map(site=>site.id));
    if([...v.intelIds,...v.weakenedIds,...v.escortedIds,...Object.keys(v.pressure)].some(id=>!sites.has(id))) return null;
    if(Object.entries(v.pressure).some(([,p])=>!Number.isInteger(p)||p<0||p>20)) return null;
    const passages=new Set(rules.passages.map(item=>item.id));
    if(v.outer.some(order=>!isTextId(order.id)||!sites.has(order.targetId)||!Array.isArray(order.teamIds)||
      !order.teamIds.length||order.teamIds.some(id=>!ownTeam(v,id))||!Number.isSafeInteger(order.dueAt)||
      !Number.isSafeInteger(order.startedAt)||order.startedAt<0||order.dueAt<=order.startedAt||order.dueAt-order.startedAt>86400000||
      (order.forcedPace!==undefined&&(!order.forcedPace||
        typeof order.forcedPace!=="object"||Array.isArray(order.forcedPace)||
        !Number.isSafeInteger(order.forcedPace.orderedAt)||
        !Number.isSafeInteger(order.forcedPace.originalDueAt)||
        order.forcedPace.orderedAt<order.startedAt||
        4*(order.forcedPace.orderedAt-order.startedAt)>
          order.forcedPace.originalDueAt-order.startedAt||
        order.forcedPace.paidRav!==3||order.forcedPace.savedMs!==8000||
        order.forcedPace.originalDueAt-8000!==(order.recall?.originalDueAt??order.dueAt)||
        order.forcedPace.orderedAt+2000>=order.forcedPace.originalDueAt-8000||
        order.routeDiversion!==undefined||order.reconHalt!==undefined||order.routeIncident!==undefined||
        (order.recall!==undefined&&order.forcedPace.orderedAt>order.recall.orderedAt)))||
      (order.routeDiversion!==undefined&&(!order.routeDiversion||
        typeof order.routeDiversion!=="object"||
        !Array.isArray(order.routeDiversion.fromPassageIds)||
        order.routeDiversion.fromPassageIds.length<1||
        order.routeDiversion.paidRav!==1||
        !Number.isSafeInteger(order.routeDiversion.changedAt)||
        !Number.isSafeInteger(order.routeDiversion.originalDueAt)||
        order.routeDiversion.originalDueAt<=order.startedAt||
        order.routeDiversion.changedAt<order.startedAt||
        order.routeDiversion.changedAt-order.startedAt>
          Math.min(5000,(order.routeDiversion.originalDueAt-order.startedAt)*.15)||
        order.routeDiversion.originalDueAt+5000>
          (order.recall?.originalDueAt??order.dueAt)||
        !warOuterRouteChoicesV142(v.baseId,order.targetId,
          order.teamIds.reduce((total,id)=>total+
            (unitFor(rules,ownTeam(v,id)?.unitId??"")?.commandPoints??0),0),rules)
          .some(route=>route.passageIds.join("|")===
            order.routeDiversion!.fromPassageIds.join("|"))))||
      (order.passageCheck!==undefined&&(!order.passageCheck||
        typeof order.passageCheck!=="object"||Array.isArray(order.passageCheck)||
        order.passageCheck.paidRav!==1||
        !Number.isSafeInteger(order.passageCheck.checkedAt)||
        order.passageCheck.checkedAt<=order.startedAt||
        order.passageCheck.checkedAt>=(order.recall?.originalDueAt??order.dueAt)||
        (order.recall!==undefined&&order.passageCheck.checkedAt>order.recall.orderedAt)||
        !order.routeIds.includes(order.passageCheck.passageId)||
        !rules.passages.some(p=>p.id===order.passageCheck!.passageId&&
          String(p.condition??"").slice(0,240)===order.passageCheck!.sourceCondition)))||
      (order.routeChoiceId!==undefined&&(
        typeof order.routeChoiceId!=="string"||
        !warOuterRouteChoicesV142(v.baseId,order.targetId,
          order.teamIds.reduce((total,id)=>total+(unitFor(rules,ownTeam(v,id)?.unitId??"")?.commandPoints??0),0),rules)
          .some(choice=>choice.id===order.routeChoiceId&&
            choice.passageIds.join("|")===order.routeIds.join("|"))))||
      (order.routeIncident!==undefined&&(!order.routeIncident||
        typeof order.routeIncident!=="object"||Array.isArray(order.routeIncident)||
        !["secure","detour"].includes(order.routeIncident.kind)||
        !Number.isSafeInteger(order.routeIncident.orderedAt)||
        !Number.isSafeInteger(order.routeIncident.originalDueAt)||
        order.routeIncident.orderedAt<=order.startedAt||
        order.routeIncident.orderedAt>=order.routeIncident.originalDueAt||
        order.routeIncident.originalDueAt<=order.startedAt||
        order.routeIncident.paidRav!==(order.routeIncident.kind==="secure"?2:0)||
        order.routeIncident.originalDueAt+
          (order.routeIncident.kind==="detour"?10000:0)!==
          (order.recall?.originalDueAt??order.dueAt)||
        !order.routeIds.includes(order.routeIncident.passageId)||
        !rules.passages.some(p=>p.id===order.routeIncident!.passageId&&
          (p.incident?.trim()||p.condition?.trim()||"").slice(0,240)===
            order.routeIncident!.sourceIncident)))||
      (order.departureContext!==undefined&&(!order.departureContext||
        typeof order.departureContext!=="object"||
        Array.isArray(order.departureContext)||
        typeof order.departureContext.intel!=="boolean"||
        typeof order.departureContext.weakened!=="boolean"||
        typeof order.departureContext.escorted!=="boolean"||
        !Number.isInteger(order.departureContext.pressure)||
        order.departureContext.pressure<0||
        order.departureContext.pressure>20))||
      (order.fieldSignal!==undefined&&(!order.fieldSignal||
        typeof order.fieldSignal!=="object"||
        !Number.isSafeInteger(order.fieldSignal.transmittedAt)||
        order.fieldSignal.transmittedAt<order.startedAt+
          Math.ceil(((order.reconHalt?.originalDueAt??order.routeIncident?.originalDueAt??order.recall?.originalDueAt??order.dueAt)-order.startedAt)/2)||
        order.fieldSignal.transmittedAt>=(order.recall?.originalDueAt??order.dueAt)||
        (order.recall!==undefined&&order.fieldSignal.transmittedAt>order.recall.orderedAt)||
        !["voie-stable","terrain-expose","transit-complexe"].includes(order.fieldSignal.assessment)||
        !Number.isInteger(order.fieldSignal.passages)||
        order.fieldSignal.passages!==order.routeIds.length||
        !Number.isInteger(order.fieldSignal.fitMembers)||
        order.fieldSignal.fitMembers<=0||order.fieldSignal.fitMembers>128))||
      (order.reconHalt!==undefined&&(!order.reconHalt||typeof order.reconHalt!=="object"||
        order.reconHalt.extraMs!==15000||
        !Number.isSafeInteger(order.reconHalt.orderedAt)||
        !Number.isSafeInteger(order.reconHalt.originalDueAt)||
        order.reconHalt.orderedAt<order.startedAt||
        order.reconHalt.originalDueAt<=order.startedAt||
        2*(order.reconHalt.orderedAt-order.startedAt)>=
          order.reconHalt.originalDueAt-order.startedAt||
        order.reconHalt.originalDueAt+order.reconHalt.extraMs!==
          (order.routeIncident?.originalDueAt??order.recall?.originalDueAt??order.dueAt)||
        order.reconHalt.originalDueAt+order.reconHalt.extraMs-order.startedAt>86400000))||
      (order.fieldSupport!==undefined&&(!order.fieldSupport||typeof order.fieldSupport!=="object"||
         order.fieldSupport.paidRav!==2||
         !Number.isSafeInteger(order.fieldSupport.allocatedAt)||
         order.fieldSupport.allocatedAt<order.startedAt||
         2*(order.fieldSupport.allocatedAt-order.startedAt)>=(order.reconHalt?.originalDueAt??order.routeIncident?.originalDueAt??order.recall?.originalDueAt??order.dueAt)-order.startedAt||
         (order.recall!==undefined&&order.fieldSupport.allocatedAt>=order.recall.orderedAt)))||
      (order.retask!==undefined&&(!order.retask||typeof order.retask!=="object"||
        !["recon","escort","intercept"].includes(order.retask.oldFocus)||
        order.retask.oldFocus===order.focus||
        !Number.isSafeInteger(order.retask.changedAt)||
        order.retask.changedAt<order.startedAt||
        2*(order.retask.changedAt-order.startedAt)>=(order.reconHalt?.originalDueAt??order.routeIncident?.originalDueAt??order.recall?.originalDueAt??order.dueAt)-order.startedAt))||
      (order.recall!==undefined&&(!order.recall||typeof order.recall!=="object"||
        !Number.isSafeInteger(order.recall.orderedAt)||!Number.isSafeInteger(order.recall.originalDueAt)||
        order.recall.orderedAt<order.startedAt||order.recall.orderedAt>=order.recall.originalDueAt||
        order.recall.originalDueAt<=order.startedAt||order.recall.originalDueAt-order.startedAt>86400000||
        order.dueAt<=order.recall.orderedAt||
        order.dueAt-order.recall.orderedAt!==Math.max(10000,Math.ceil((order.recall.orderedAt-order.startedAt)/2),order.routeIds.length*3000)))||
      !Array.isArray(order.routeIds)||order.routeIds.length>100||order.routeIds.some(id=>!passages.has(id))||
      !["recon","intercept","escort"].includes(order.focus))) return null;
    if(unique(v.outer.map(order=>order.id)).length!==v.outer.length) return null;
    const validActor=(actor:WarMissionActorV115|WarRtsActorV115,mode:"assault"|"rts")=>
      isTextId(actor.id)&&!!unitFor(rules,actor.unitId)&&
      (actor.side==="ally" ? typeof actor.teamId==="string"&&!!ownTeam(v,actor.teamId) : actor.side==="rival"&&actor.teamId===null)&&
      Number.isFinite(actor.x)&&actor.x>=0&&actor.x<=(mode==="assault"?100:8)&&
      Number.isFinite(actor.hp)&&actor.hp>=0&&actor.hp<=100&&
      (mode==="assault"||Number.isInteger((actor as WarRtsActorV115).y)&&
       (actor as WarRtsActorV115).y>=0&&(actor as WarRtsActorV115).y<=5);
    const active=v.active;
    if(active && (!isTextId(active.id)||!sites.has(active.targetId)||!["assault","stealth","rts"].includes(active.mode)||
      !Number.isInteger(active.tick)||active.tick<0||active.tick>100||!Array.isArray(active.teamIds)||
      !active.teamIds.length||active.teamIds.some(id=>!ownTeam(v,id))||
      (active.mode==="assault" && (!active.assault||!Array.isArray(active.assault.actors)))||
      (active.mode==="stealth" && (!active.stealth||!Number.isInteger(active.stealth.x)))||
      (active.mode==="rts" && (!active.rts||!Array.isArray(active.rts.actors))))) return null;
    if(active?.mode==="assault"){
      const a=active.assault!;
      const apLevel=a.apLevel??1;
      if(!Number.isInteger(apLevel)||apLevel<1||apLevel>3||
        !Array.isArray(a.usedSpecials??[])||
        !Array.isArray(a.fortifiedIds??[])||
        !Array.isArray(a.braceUsedIds??[])||
        (a.interposeUsedIds!==undefined&&(!Array.isArray(a.interposeUsedIds)||
          a.interposeUsedIds.length>4||
          a.interposeUsedIds.some(id=>!a.launched.includes(id))||
          unique(a.interposeUsedIds).length!==a.interposeUsedIds.length))||
        (a.interposeOrders!==undefined&&(!a.interposeOrders||
          typeof a.interposeOrders!=="object"||Array.isArray(a.interposeOrders)||
          Object.keys(a.interposeOrders).length>4||
          Object.entries(a.interposeOrders).some(([targetId,order])=>
            !a.launched.includes(targetId)||!order||
            !a.launched.includes(order.guardianTeamId)||
            targetId===order.guardianTeamId||
            !(a.interposeUsedIds??[]).includes(order.guardianTeamId)||
            !Number.isSafeInteger(order.expiresAtTick)||
            order.expiresAtTick<=active.tick||
            order.expiresAtTick>active.tick+3)))||
        (a.regroupUsedIds!==undefined&&(!Array.isArray(a.regroupUsedIds)||
          a.regroupUsedIds.length>4||
          a.regroupUsedIds.some(id=>!a.launched.includes(id))||
          unique(a.regroupUsedIds).length!==a.regroupUsedIds.length))||
        (a.braceUsedIds??[]).some(id=>!a.launched.includes(id))||
        unique(a.braceUsedIds??[]).length!==(a.braceUsedIds??[]).length||
        (a.bracedUntil!==undefined&&(!a.bracedUntil||
          typeof a.bracedUntil!=="object"||Array.isArray(a.bracedUntil)||
          Object.keys(a.bracedUntil).length>4||
          Object.entries(a.bracedUntil).some(([id,until])=>
            !a.launched.includes(id)||!(a.braceUsedIds??[]).includes(id)||
            !Number.isInteger(until)||until<=active.tick||until>active.tick+3)))||
        !Array.isArray(a.holdIssuedIds??[])||
        !Array.isArray(a.extractedIds??[])||
        (a.focusUsedIds!==undefined&&(!Array.isArray(a.focusUsedIds)||
          a.focusUsedIds.length>4||
          a.focusUsedIds.some(id=>!a.launched.includes(id))||
          unique(a.focusUsedIds).length!==a.focusUsedIds.length))||
        (a.focusOrders!==undefined&&(!a.focusOrders||
          typeof a.focusOrders!=="object"||Array.isArray(a.focusOrders)||
          Object.keys(a.focusOrders).length>4||
          Object.entries(a.focusOrders).some(([id,order])=>
            !(a.focusUsedIds??[]).includes(id)||
            !order||typeof order!=="object"||
            !a.launched.includes(id)||
            !isTextId(order.targetId)||
            !Number.isSafeInteger(order.expiresAtTick)||
            order.expiresAtTick<=active.tick||
            order.expiresAtTick>active.tick+2)))||
        (a.rivalRosterIds!==undefined&&(!Array.isArray(a.rivalRosterIds)||
          a.rivalRosterIds.length<1||a.rivalRosterIds.length>4||
          unique(a.rivalRosterIds).length!==a.rivalRosterIds.length||
          a.rivalRosterIds.some(id=>!rules.units.some(u=>u.id===id&&u.fullMembers>0&&u.commandPoints>0))))||
        (a.wavesIssued!==undefined&&(!Number.isInteger(a.wavesIssued)||
          a.wavesIssued<0||a.wavesIssued>warAssaultWaveProfileV140(active.targetId,rules).maximumWaves))||
        !Array.isArray(a.surgeIssuedIds??[])||
        (a.fallbackCounts!==undefined&&(!a.fallbackCounts||
          typeof a.fallbackCounts!=="object"||Array.isArray(a.fallbackCounts)||
          Object.keys(a.fallbackCounts).length>4||
          Object.entries(a.fallbackCounts).some(([id,count])=>
            !a.launched.includes(id)||!Number.isInteger(count)||count<1||count>20)))||
        (a.surgeIssuedIds??[]).some(id=>!a.launched.includes(id))||
        unique(a.surgeIssuedIds??[]).length!==(a.surgeIssuedIds??[]).length||
        (a.extractedIds??[]).some(id=>!a.launched.includes(id)||a.fallen.includes(id)||
          a.actors.some(actor=>actor.teamId===id&&actor.side==="ally"))||
        unique(a.extractedIds??[]).length!==(a.extractedIds??[]).length||
        (a.holdIssuedIds??[]).some(id=>!a.launched.includes(id))||
        unique(a.holdIssuedIds??[]).length!==(a.holdIssuedIds??[]).length||
        (a.heldUntil!==undefined&&(!a.heldUntil||typeof a.heldUntil!=="object"||Array.isArray(a.heldUntil)||
          Object.keys(a.heldUntil).length>4||
          Object.entries(a.heldUntil).some(([id,until])=>
            !a.launched.includes(id)||!(a.holdIssuedIds??[]).includes(id)||
            !Number.isInteger(until)||until<=active.tick||until>active.tick+4)))||
        (a.fortifiedIds??[]).some(id=>!a.launched.includes(id))||
        unique(a.fortifiedIds??[]).length!==(a.fortifiedIds??[]).length||
        (a.usedSpecials??[]).some(id=>!a.launched.includes(id))||
        unique(a.usedSpecials??[]).length!==(a.usedSpecials??[]).length||
        !Number.isFinite(a.ap)||a.ap<0||a.ap>100+(apLevel-1)*35||
        !Number.isFinite(a.ownBase)||a.ownBase<0||a.ownBase>80||
        !Number.isFinite(a.rivalBase)||a.rivalBase<0||a.rivalBase>80||
        !Array.isArray(a.launched)||!Array.isArray(a.fallen)||a.launched.length>4||
        unique(a.launched).length!==a.launched.length||a.launched.some(id=>!active.teamIds.includes(id))||
        a.fallen.some(id=>!active.teamIds.includes(id))||a.actors.length>20||
        a.actors.some(actor=>!validActor(actor,"assault"))) return null;
    }
    if(active?.mode==="stealth"){
      const v1=active.stealth!;
      // PR #57 used a different field for the same live second guard. Migrate
      // only validated coordinates; reject conflicting dual representations.
      const legacy=v1 as WarStealthV115&{secondGuard?:unknown};
      if(Object.prototype.hasOwnProperty.call(legacy,"secondGuard")){
        const second=legacy.secondGuard as {guardX?:unknown;guardY?:unknown;guardDirection?:unknown}|null;
        if(!second||typeof second!=="object"||Array.isArray(second)||
          !Number.isInteger(second.guardX)||!Number.isInteger(second.guardY)||
          (second.guardDirection!==-1&&second.guardDirection!==1)) return null;
        const converted:NonNullable<WarStealthV115["supportGuard"]>={x:second.guardX as number,y:second.guardY as number,
          direction:second.guardDirection};
        if(v1.reinforcementIssued===false||
          (Object.prototype.hasOwnProperty.call(v1,"supportGuard")&&!v1.supportGuard)||
          (v1.supportGuard&&(v1.supportGuard.x!==converted.x||
            v1.supportGuard.y!==converted.y||v1.supportGuard.direction!==converted.direction))) return null;
        v1.supportGuard=converted;
        v1.reinforcementIssued=true;
        delete legacy.secondGuard;
      }
      if(!Number.isInteger(v1.x)||v1.x<0||v1.x>8||
        !Number.isInteger(v1.y)||v1.y<0||v1.y>5||
        !Number.isInteger(v1.guardX)||v1.guardX<0||v1.guardX>8||
        (v1.guardY!==undefined&&(!Number.isInteger(v1.guardY)||v1.guardY<1||v1.guardY>3))||
        ![-1,1].includes(v1.guardDirection)||
        !Number.isInteger(v1.alarm)||v1.alarm<0||v1.alarm>3||
        !Number.isInteger(v1.energy)||v1.energy<0||v1.energy>5||
        typeof v1.cloaked!=="boolean"||typeof v1.sabotaged!=="boolean"||
        (v1.decoyUsed!==undefined&&typeof v1.decoyUsed!=="boolean")||
        (v1.dashUsed!==undefined&&typeof v1.dashUsed!=="boolean")||
        (v1.guardInvestigation!==undefined&&(!v1.guardInvestigation||
          typeof v1.guardInvestigation!=="object"||Array.isArray(v1.guardInvestigation)||
          !Number.isInteger(v1.guardInvestigation.x)||!Number.isInteger(v1.guardInvestigation.y)||
          !Number.isInteger(v1.guardInvestigation.turns)||
          v1.guardInvestigation.turns<1||v1.guardInvestigation.turns>2||
          warTerrainCellBlockedV116(warMissionTerrainV116(active.targetId,rules),
            v1.guardInvestigation.x,v1.guardInvestigation.y)))||
        (v1.reinforcementIssued!==undefined&&typeof v1.reinforcementIssued!=="boolean")||
        (v1.reinforcementMode!==undefined&&!['manual','decoy'].includes(v1.reinforcementMode))||
        (v1.reinforcementIssued===true&&v1.supportGuard===undefined)||
        (v1.supportGuard!==undefined&&(!v1.reinforcementIssued||
          !v1.supportGuard||typeof v1.supportGuard!=="object"||
          !Number.isInteger(v1.supportGuard.x)||!Number.isInteger(v1.supportGuard.y)||
          v1.supportGuard.x<4||v1.supportGuard.x>7||
          v1.supportGuard.y<1||v1.supportGuard.y>3||
          ![-1,1].includes(v1.supportGuard.direction)||
          warTerrainCellBlockedV116(warMissionTerrainV116(active.targetId,rules),
             v1.supportGuard.x,v1.supportGuard.y)))||
        (v1.silentSabotageUsed!==undefined&&
          (typeof v1.silentSabotageUsed!=="boolean"||v1.silentSabotageUsed&&!v1.sabotaged))||
        (v1.decoyX!==undefined&&(!Number.isInteger(v1.decoyX)||v1.decoyX<0||v1.decoyX>8))||
        (v1.decoyY!==undefined&&(!Number.isInteger(v1.decoyY)||
          v1.decoyY<0||v1.decoyY>5||v1.decoyX===undefined))||
        (v1.decoyTurns!==undefined&&(!Number.isInteger(v1.decoyTurns)||v1.decoyTurns<0||v1.decoyTurns>3))||
        (v1.acousticUsed!==undefined&&(!Number.isInteger(v1.acousticUsed)||
           v1.acousticUsed<0||v1.acousticUsed>2))||
        (v1.heardBearing!==undefined&&(!["est","ouest","proche"].includes(v1.heardBearing)||
           v1.acousticUsed===0||
           !Number.isInteger(v1.heardAtTick)||(v1.heardAtTick??-1)<1||
           (v1.heardAtTick??-1)>active.tick))||
        (v1.heardAtTick!==undefined&&(!Number.isInteger(v1.heardAtTick)||
           v1.heardAtTick<1||v1.heardAtTick>active.tick||
           v1.heardBearing===undefined))||
        (v1.silentStepsUsed!==undefined&&(!Number.isInteger(v1.silentStepsUsed)||
           v1.silentStepsUsed<0||v1.silentStepsUsed>2))||
        (v1.usedCoverIds!==undefined&&(!Array.isArray(v1.usedCoverIds)||
          v1.usedCoverIds.length>4||
          unique(v1.usedCoverIds).length!==v1.usedCoverIds.length||
          v1.usedCoverIds.some(id=>typeof id!=="string"||
            !warMissionTerrainV116(active.targetId,rules).cover.includes(id))))) return null;
    }
    if(active?.mode==="rts"){
      const field=active.rts!;
      if(!Number.isInteger(field.hold)||field.hold<0||field.hold>3||
        field.actors.length>16||field.actors.some(actor=>!validActor(actor,"rts"))||
        !Array.isArray(field.fallen)||field.fallen.some(id=>!active.teamIds.includes(id))||
        field.realtime!==undefined&&typeof field.realtime!=="boolean") return null;
      if(field.history!==undefined&&(!Array.isArray(field.history)||field.history.length>10||
        field.history.some(line=>typeof line!=="string"||line.length>650)))return null;
      const orders=field.orders??{};
      if(!orders||typeof orders!=="object"||Array.isArray(orders)||Object.keys(orders).length>4) return null;
      for(const [id,order] of Object.entries(orders))
        if(!active.teamIds.includes(id)||!order||
          !Number.isInteger(order.x)||order.x<0||order.x>8||
          !Number.isInteger(order.y)||order.y<0||order.y>5||
          !["advance","hold","attack"].includes(order.kind)) return null;
      if(field.scripted!==undefined&&!validWarRtsScriptedObjectiveV119(
        field.scripted,active.id,active.teamIds,field.actors,active.targetId,rules,
        active.teamIds.map(id=>ownTeam(v,id)?.unitId??""),
      ))return null;
    }
    const live=[...(active?[active]:[]),...v.outer,...care.map(item=>({id:item.id,teamIds:[item.teamId,item.medicTeamId]}))];
    const expected:Record<string,string>={};
    for(const op of live) for(const id of op.teamIds) {if(expected[id]) return null;expected[id]=op.id;}
    if(JSON.stringify(Object.keys(expected).sort().map(id=>[id,expected[id]])) !==
      JSON.stringify(Object.keys(v.assignments).sort().map(id=>[id,v.assignments[id]]))) return null;
    if(v.reports.some(item=>!isTextId(item.id)||!sites.has(item.targetId)||
      !["victory","defeat","retreat"].includes(item.outcome)||
      !["assault","outer","stealth","rts"].includes(item.mode)||
      typeof item.summary!=="string"||item.summary.length>2500||
      !Number.isInteger(item.clock)||item.clock<0||item.clock>v.clock||
      !Array.isArray(item.teamIds)||item.teamIds.length<1||item.teamIds.length>4||
      item.teamIds.some(id=>!ownTeam(v,id))||
      !Array.isArray(item.woundedIds)||item.woundedIds.length>8||
      !Array.isArray(item.sourceIds)||item.sourceIds.length>16||
      item.sourceIds.some(id=>!isTextId(id))||
      item.engagementLog!==undefined&&(!Array.isArray(item.engagementLog)||
       item.engagementLog.length>12||item.engagementLog.some(line=>typeof line!=="string"||line.length>650)))) return null;
    if(unique(v.reports.map(item=>item.id)).length!==v.reports.length ||
      v.reports.some(item=>live.some(op=>op.id===item.id))) return null;
    return v;
  } catch {return null;}
}
