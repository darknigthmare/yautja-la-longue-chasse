import {type ClanWarVariantV120} from "./clanWarVariantAtlasV120";
import {CLAN_WAR_COHERENT_VARIANTS_V126,type WarCoherentVariantV126} from "./clanWarWorldClimateV126";

export type WarAiDoctrineV126="cautious"|"balanced"|"aggressive"|"defensive"|"reinforcement";
export type WarAiRoleV126="recon"|"guard"|"assault"|"heavy"|"support"|"specialist";
export interface WarAiDetachmentV126 {
 id:string;unitId:string;role:WarAiRoleV126;quantity:number;
 activation:"start"|"phase2"|"phase3"|"alarm"|"reserve";
 expectedCombatants:number;commandPoints:number;
}
export interface WarAiEncounterV126 {
 scenarioId:string;subVariant:1|2|3|4|5;
 doctrine:WarAiDoctrineV126;
 aiEnabled:boolean;seed:number;threatLevel:number;
 playerCount:number;maxSimultaneous:number;totalTeams:number;totalCombatants:number;
 commander?:string;roleGroups:WarAiDetachmentV126[];
 terrainTactics:string;powerPolicy:string;visibility:"partial-intel"|"hidden-until-report";
 environmentConstraint:string;objectiveCounterplay:string;phaseCount:number;
 factionIdentity:"rival-yautja-exercise";canonStatus:"game-invented";
 difficultyBudgetPc:number;sourceWorldId:string;
 warnings:string[];
}
const PROFILES:readonly WarAiDoctrineV126[]=["cautious","balanced","aggressive","defensive","reinforcement"];
interface Archetype {unitId:string;role:WarAiRoleV126;members:number;pc:number;terrain:(climate:string)=>boolean;}
const always=(_climate:string)=>true;
const polar=(c:string)=>c==="polar"||c==="cold-desert"||c==="alpine";
const marine=(c:string)=>c==="marine"||c==="wetland";
const vertical=(c:string)=>c==="alpine"||c==="urban"||c==="volcanic";
const UNIT_TYPES:readonly Archetype[]=[
 {unitId:"W3-U01",role:"recon",members:2,pc:2,terrain:always},
 {unitId:"W3-U02",role:"recon",members:1,pc:2,terrain:always},
 {unitId:"W3-U05",role:"recon",members:1,pc:2,terrain:always},
 {unitId:"W3-U07",role:"guard",members:3,pc:3,terrain:always},
 {unitId:"W3-U09",role:"guard",members:2,pc:3,terrain:always},
 {unitId:"W3-U10",role:"guard",members:2,pc:3,terrain:always},
 {unitId:"W3-U11",role:"assault",members:2,pc:3,terrain:always},
 {unitId:"W3-U12",role:"assault",members:2,pc:3,terrain:vertical},
 {unitId:"W3-U13",role:"assault",members:2,pc:3,terrain:always},
 {unitId:"W3-U14",role:"heavy",members:1,pc:4,terrain:always},
 {unitId:"W3-U15",role:"specialist",members:2,pc:3,terrain:always},
 {unitId:"W3-U16",role:"specialist",members:2,pc:3,terrain:always},
 {unitId:"W3-U20",role:"support",members:2,pc:3,terrain:always},
 {unitId:"W3-U24",role:"specialist",members:2,pc:3,terrain:polar},
 {unitId:"W3-U25",role:"specialist",members:2,pc:3,terrain:marine},
 {unitId:"W3-U27",role:"guard",members:2,pc:4,terrain:always},
];
const ROLE_PRIORITY:Record<WarAiDoctrineV126,readonly WarAiRoleV126[]>={
 cautious:["recon","guard","guard","specialist","support"],
 balanced:["guard","recon","assault","guard","support"],
 aggressive:["assault","assault","recon","heavy","guard"],
 defensive:["guard","guard","heavy","support","recon"],
 reinforcement:["recon","assault","guard","support","heavy"],
};
function hash(text:string):number{
 let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
 return h>>>0;
}
const clamp=(value:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,value));
const MODE_MAX={
 assault:{min:4,max:20,simultaneous:8,pc:44},
 outer:{min:0,max:9,simultaneous:0,pc:24},
 stealth:{min:2,max:9,simultaneous:7,pc:24},
 rts:{min:4,max:16,simultaneous:12,pc:40},
} as const;
const stage=(index:number,mode:ClanWarVariantV120["mode"]):WarAiDetachmentV126["activation"]=>{
 if(mode==="stealth"&&index>=3)return "alarm";
 if(index===0||index===1)return "start";
 if(index===2)return "phase2";
 if(index===3)return "phase3";
 return "reserve";
};
/**
 * Each of 1200 blueprints has five deterministic authoring profiles.
 * These are encounter PLANS, not spawn calls; "outer" reports hide opposition.
 * Real V6 unit types; no foe instantly spawned from fog, no cross-franchise caste.
 */
export function createWarAiEncounterV126(
 variant:WarCoherentVariantV126,
 subVariant:1|2|3|4|5=2,
 playerCount=1,
):WarAiEncounterV126 {
 if(!Number.isInteger(subVariant)||subVariant<1||subVariant>5)throw Error("V126 profile must be 1..5");
 if(!Number.isInteger(playerCount)||playerCount<1||playerCount>4)throw Error("Co-op size must be 1..4");
 const rule=MODE_MAX[variant.mode],profile=PROFILES[subVariant-1];
 const seed=hash(variant.sourceId+"-AI-"+subVariant);
 const level=clamp(variant.original.operation.threat,1,5);
 const coopFactor=1+Math.min(3,playerCount-1)*0.3;
 const base=variant.mode==="outer"?Math.max(0,level-2):variant.mode==="stealth"?
   1+level:variant.mode==="assault"?3+level*2:3+level*2;
 const requested=clamp(Math.round((base+(subVariant-3))*coopFactor),rule.min,rule.max);
 const enemyBudget=clamp(requested*3+4,Math.min(rule.pc,rule.min*4),rule.pc);
 const available=UNIT_TYPES.filter(t=>t.terrain(variant.environment.climate));
 const groups:WarAiDetachmentV126[]=[];
 let spent=0,added=0;const usedRoles:Record<string,number>={};
 if(variant.mode!=="outer")for(let i=0;i<requested*3&&added<requested;i++){
  const roleOrder=ROLE_PRIORITY[profile];
  const role=roleOrder[(i+Math.floor(seed/11))%roleOrder.length];
  const possible=available.filter(t=>t.role===role&&t.pc+spent<=enemyBudget);
  // Preserve W3 PC accounting: if heavy guards are too costly, only real
   // lower-PC scouting teams can fill the remaining lawful deployment slots.
   const fallbacks=available.filter(t=>t.pc+spent<=enemyBudget)
     .sort((a,b)=>a.pc-b.pc||a.unitId.localeCompare(b.unitId));
  const remainingMin=Math.max(0,rule.min-groups.length-1)*2;
   const affordable=possible.filter(t=>enemyBudget-spent-t.pc>=remainingMin);
   const candidates=groups.length<rule.min?
     (affordable.length?affordable:fallbacks):
     (possible.length?possible:fallbacks);
  if(!candidates.length)break;
  const chosen=candidates[(seed+i*7)%candidates.length];
  spent+=chosen.pc;added++;
  const index=usedRoles[chosen.unitId]??0;usedRoles[chosen.unitId]=index+1;
  groups.push({
    id:variant.sourceId+"-EN-"+subVariant+"-"+String(i+1).padStart(2,"0"),
    unitId:chosen.unitId,role:chosen.role,quantity:1,
    activation:stage(i,variant.mode),expectedCombatants:chosen.members,commandPoints:chosen.pc,
  });
 }
 // Outer Ops intentionally provide an ESTIMATE, not revealed or spawned enemies.
 const abstractOuterCount=variant.mode==="outer"?requested:0;
 const maxSimultaneous=variant.mode==="outer"?0:Math.min(rule.simultaneous,groups.length);
 const liveTeams=variant.mode==="outer"?abstractOuterCount:groups.length;
 const headcount=variant.mode==="outer"?abstractOuterCount*2:
   groups.reduce((s,g)=>s+g.expectedCombatants,0);
 const noPower="Sans alimentation : capteurs actifs seulement sur batterie déclarée ; tourelles et portes motorisées restent inertes.";
 const powerPolicy=variant.original.environment.powerFailure.includes("courant")?
   noPower:"Réseau électrique indépendant uniquement si la mission indique un générateur.";
 const movement=variant.environment.climate==="hot-desert"?
   "Éviter la surchauffe des machines et les couverts de glace impossibles.":
   variant.environment.climate==="polar"||variant.environment.climate==="cold-desert"?
    "Vitesses adaptées au gel et à la faible adhérence ; pas de tempête de sable chaude.":
    variant.environment.climate==="marine"?
     "Accès soumis aux marées et aux unités réellement aptes au rivage.":
     "Utiliser les mêmes obstacles et passages physiques que le joueur, sans téléportation.";
 const objectiveCounterplay=variant.mode==="assault"?
   "Réagir aux sorties AP et reprendre les postes de tirs encore intacts":
   variant.mode==="outer"?
   "Déterminer le risque après délai sans montrer des unités jamais observées":
   variant.mode==="stealth"?
   "Rondes, alerte graduelle, renforts uniquement après signal réel":
   "Protéger la zone, la charge ou les artisans selon le contrat, sans victoire générique par élimination.";
 const warnings=[
  "Plan tactique à implémenter : aucun PNJ n'est créé dans la sauvegarde",
  "Les unités W3-U sont des rôles de la Bible du jeu, pas des personnages canoniques identifiés",
 ];
 if(variant.geography.worldKind==="earth")warnings.push("Conflit de clan sur Terre hypothétique, non documenté dans le film");
 if(variant.geography.worldKind==="unresolved-fiction")warnings.push("Monde d'origine indéterminé, engagement de campagne interdit");
 return {
  scenarioId:variant.sourceId,subVariant,doctrine:profile,aiEnabled:true,seed,
  threatLevel:level,playerCount,maxSimultaneous,
  totalTeams:liveTeams,totalCombatants:headcount,
  roleGroups:groups,terrainTactics:movement,powerPolicy,
  visibility:variant.mode==="outer"?"hidden-until-report":"partial-intel",
  environmentConstraint:variant.environment.temperatureRule,
  objectiveCounterplay,phaseCount:4,factionIdentity:"rival-yautja-exercise",
  canonStatus:"game-invented",difficultyBudgetPc:spent,
  sourceWorldId:variant.geography.worldId,warnings,
 };
}
export function allWarAiPresetsV126(variant:WarCoherentVariantV126){
 return ([1,2,3,4,5] as const).map(n=>createWarAiEncounterV126(variant,n));
}
export function auditWarAiPresetsV126(){
 const examples=CLAN_WAR_COHERENT_VARIANTS_V126.flatMap(allWarAiPresetsV126);
 const errors:string[]=[];
 if(examples.length!==6000)errors.push("Need 5 encounter presets for 1200 missions");
 for(const e of examples){
  const m=MODE_MAX[CLAN_WAR_COHERENT_VARIANTS_V126.find(v=>v.sourceId===e.scenarioId)!.mode];
  if(e.totalTeams>m.max||e.totalTeams<m.min)errors.push(e.scenarioId+": bad team count");
  if(e.maxSimultaneous>m.simultaneous)errors.push(e.scenarioId+": over-cap");
  if(e.difficultyBudgetPc>m.pc)errors.push(e.scenarioId+": command budget exceeded");
  if(e.visibility==="hidden-until-report"&&e.roleGroups.length)errors.push(e.scenarioId+": revealed Outer Ops teams");
  if(e.roleGroups.some(g=>!UNIT_TYPES.some(u=>u.unitId===g.unitId)))errors.push(e.scenarioId+": unknown unit");
 }
 return {variants:CLAN_WAR_COHERENT_VARIANTS_V126.length,encounterPresets:examples.length,errors};
}
