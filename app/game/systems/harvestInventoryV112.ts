import type { ArmorId, PlayerInventory, SaveGame } from "../types";

export type SpecimenStageV112 = "raw" | "cleaned" | "treated" | "dried" | "mounted";
export interface FieldSpecimenV112 {
  id: string; sourceId: string; speciesId: string; partId: string; label: string;
  quality: number; massKg: number; volumeUnits: number; stage: SpecimenStageV112;
}
export interface ConservationJobV112 {
  id: string; specimenId: string; fromStage: SpecimenStageV112; toStage: SpecimenStageV112;
  unitsDone: number; unitsRequired: number; costPaid: number; status: "active" | "completed";
}
export interface HarvestInventoryV112 {
  version: 1; specimens: FieldSpecimenV112[]; toolCondition: number;
  toolUseIds: string[]; jobs: ConservationJobV112[];
}
export const SPECIMEN_STAGE_LABELS_V112: Readonly<Record<SpecimenStageV112,string>> = Object.freeze({
  raw: "Brut", cleaned: "Nettoyé", treated: "Traité", dried: "Séché", mounted: "Monté",
});
export const CONSERVATION_STEPS_V112 = Object.freeze([
  Object.freeze({from:"raw",to:"cleaned",label:"Nettoyer",cost:2,units:3}),
  Object.freeze({from:"cleaned",to:"treated",label:"Traiter",cost:4,units:4}),
  Object.freeze({from:"treated",to:"dried",label:"Sécher",cost:3,units:5}),
  Object.freeze({from:"dried",to:"mounted",label:"Monter",cost:5,units:3}),
] as const);
export const TOOL_WEAR_PER_COMPLETION_V112 = 5;
export const HARVEST_DEPOT_LIMIT_V112 = 256;
const MAX_TOOL_RECEIPTS = 2048;
const object = (x: unknown): x is Record<string,unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const id = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length <= 192 && !/[\u0000-\u001f]/.test(x);
const bounded = (x:unknown,min:number,max:number): x is number => typeof x==="number" && Number.isFinite(x) && x>=min && x<=max;
const stages: SpecimenStageV112[] = ["raw","cleaned","treated","dried","mounted"];
export function emptyHarvestInventoryV112(): HarvestInventoryV112 {
  return {version:1,specimens:[],toolCondition:100,toolUseIds:[],jobs:[]};
}
export function normalizeFieldSpecimenV112(raw:unknown): FieldSpecimenV112 | null {
  if (!object(raw) || !id(raw.id) || !id(raw.sourceId) || !id(raw.speciesId) || !id(raw.partId) ||
      !id(raw.label) || !Number.isInteger(raw.quality) || !bounded(raw.quality,0,100) ||
      !bounded(raw.massKg,.01,200) || !bounded(raw.volumeUnits,.01,100) ||
      !stages.includes(raw.stage as SpecimenStageV112)) return null;
  return {id:raw.id,sourceId:raw.sourceId,speciesId:raw.speciesId,partId:raw.partId,label:raw.label,
    quality:raw.quality,massKg:raw.massKg,volumeUnits:raw.volumeUnits,stage:raw.stage as SpecimenStageV112};
}
/** Missing additive data migrates empty; present malformed/future data is refused. */
export function normalizeHarvestInventoryV112(raw:unknown): HarvestInventoryV112 | null {
  if (raw===undefined) return emptyHarvestInventoryV112();
  if (!object(raw) || raw.version!==1 || !Array.isArray(raw.specimens) || raw.specimens.length>HARVEST_DEPOT_LIMIT_V112 ||
      !Number.isInteger(raw.toolCondition) || !bounded(raw.toolCondition,0,100) || !Array.isArray(raw.toolUseIds) ||
      raw.toolUseIds.length>MAX_TOOL_RECEIPTS || raw.toolUseIds.some(x=>!id(x)) ||
      new Set(raw.toolUseIds).size!==raw.toolUseIds.length || !Array.isArray(raw.jobs) || raw.jobs.length>HARVEST_DEPOT_LIMIT_V112*4) return null;
  const specimens = raw.specimens.map(normalizeFieldSpecimenV112);
  if(specimens.some(x=>!x) || new Set(specimens.map(x=>x!.id)).size!==specimens.length ||
      new Set(specimens.map(x=>x!.sourceId+":"+x!.partId)).size!==specimens.length) return null;
  const typed = specimens as FieldSpecimenV112[];
  const jobs:ConservationJobV112[]=[];
  for(const j of raw.jobs) {
    if(!object(j) || !id(j.id) || !id(j.specimenId)) return null;
    const step=CONSERVATION_STEPS_V112.find(s=>s.from===j.fromStage&&s.to===j.toStage);
    const item=typed.find(s=>s.id===j.specimenId);
    if(!step||!item||j.id!==item.id+":"+step.to||j.unitsRequired!==step.units||j.costPaid!==step.cost||
      !Number.isInteger(j.unitsDone)||!bounded(j.unitsDone,0,step.units)||!["active","completed"].includes(j.status as string)||
      (j.status==="active"&&(j.unitsDone===step.units||item.stage!==step.from))||
      (j.status==="completed"&&(j.unitsDone!==step.units||stages.indexOf(item.stage)<stages.indexOf(step.to)))) return null;
    jobs.push({id:j.id,specimenId:j.specimenId,fromStage:step.from,toStage:step.to,unitsDone:j.unitsDone,
      unitsRequired:step.units,costPaid:step.cost,status:j.status as ConservationJobV112["status"]});
  }
  if(new Set(jobs.map(j=>j.id)).size!==jobs.length ||
    new Set(jobs.filter(j=>j.status==="active").map(j=>j.specimenId)).size!==jobs.filter(j=>j.status==="active").length ||
    jobs.filter(j=>j.status==="active").length>16) return null;
  for(const item of typed) {
    const completed = jobs.filter(j=>j.specimenId===item.id&&j.status==="completed");
    // Every processing stage requires its real, paid predecessor receipt.
    if(completed.length!==stages.indexOf(item.stage) ||
      completed.some(j=>!CONSERVATION_STEPS_V112.slice(0,stages.indexOf(item.stage)).some(s=>s.to===j.toStage))) return null;
  }
  return {version:1,specimens:typed,toolCondition:raw.toolCondition,toolUseIds:[...raw.toolUseIds] as string[],jobs};
}
export function harvestInventoryForV112(inventory: Pick<PlayerInventory,"harvestV112">):HarvestInventoryV112 {
  return normalizeHarvestInventoryV112(inventory.harvestV112) ?? emptyHarvestInventoryV112();
}
export function capacityForArmorV112(armorId:ArmorId):{massKg:number;volumeUnits:number} {
  return armorId==="scout"?{massKg:24,volumeUnits:18}:armorId==="berserker"?{massKg:52,volumeUnits:30}:{massKg:36,volumeUnits:24};
}
export function fieldLoadV112(items:readonly FieldSpecimenV112[],armorId:ArmorId,carcassMassKg=0) {
  const capacity=capacityForArmorV112(armorId);
  const massKg=items.reduce((sum,item)=>sum+Math.max(0,item.massKg),0)+Math.max(0,Number.isFinite(carcassMassKg)?carcassMassKg:0);
  const volumeUnits=items.reduce((sum,item)=>sum+Math.max(0,item.volumeUnits),0);
  const ratio=Math.max(massKg/capacity.massKg,volumeUnits/capacity.volumeUnits);
  const effort=Math.min(1,Math.max(0,ratio));
  return {massKg,volumeUnits,capacityMassKg:capacity.massKg,capacityVolumeUnits:capacity.volumeUnits,ratio,
    overloaded:ratio>1+1e-9,movementMultiplier:1-.32*effort,jumpMultiplier:1-.16*effort,
    climbStaminaMultiplier:1+.6*effort,noiseMultiplier:1+.8*effort};
}
export function tryCarrySpecimenV112(items:readonly FieldSpecimenV112[],item:FieldSpecimenV112,armorId:ArmorId):
  {ok:boolean;items:FieldSpecimenV112[];reason:string} {
  const valid=normalizeFieldSpecimenV112(item);
  if(!valid||valid.stage!=="raw") return {ok:false,items:[...items],reason:"Prélèvement invalide."};
  if(items.some(s=>s.id===valid.id||s.sourceId===valid.sourceId&&s.partId===valid.partId))
    return {ok:false,items:[...items],reason:"Cette partie a déjà été prélevée."};
  if(fieldLoadV112([...items,valid],armorId).overloaded)
    return {ok:false,items:[...items],reason:"Emport plein : la partie reste sur la proie. Déposez une prise avant de réessayer."};
  return {ok:true,items:[...items,valid],reason:"Prise rangée."};
}
export function flayingToolWorkMultiplierV112(condition:number):number {
  return 1+.65*(1-Math.min(100,Math.max(0,Number.isFinite(condition)?condition:100))/100);
}
export function toolConditionAfterUsesV112(condition:number,completedUses:number):number {
  return Math.max(0,Math.min(100,condition)-Math.max(0,Math.floor(completedUses))*TOOL_WEAR_PER_COMPLETION_V112);
}
/** The extraction reducer calls this within the existing terminal save write.
 * Full depot refuses the entire delivery: caller must keep the terminal write pending. */
export function deliverHarvestV112(save:SaveGame,rawItems:unknown,rawUseIds:unknown,success:boolean):
  {ok:boolean;inventory:PlayerInventory;reason:string} {
  const ledger=normalizeHarvestInventoryV112(save.inventory.harvestV112);
  if(!ledger)return {ok:false,inventory:save.inventory,reason:"Registre de conservation incompatible."};
  const items=Array.isArray(rawItems)?rawItems.map(normalizeFieldSpecimenV112):[];
  if(items.some(x=>!x||x.stage!=="raw")||items.length>64)
    return {ok:false,inventory:save.inventory,reason:"Prélèvements de mission invalides."};
  const uses=Array.isArray(rawUseIds)?rawUseIds:[];
  if(uses.length>256||uses.some(x=>!id(x))||new Set(uses).size!==uses.length)
    return {ok:false,inventory:save.inventory,reason:"Usages d'outil invalides."};
  const freshUses=(uses as string[]).filter(x=>!ledger.toolUseIds.includes(x));
  if(ledger.toolUseIds.length+freshUses.length>MAX_TOOL_RECEIPTS)
    return {ok:false,inventory:save.inventory,reason:"Registre d'entretien plein : conservez le résultat de chasse pour récupération."};
  const next=[...ledger.specimens];
  if(success)for(const value of items as FieldSpecimenV112[]) {
    const previous=next.find(x=>x.id===value.id||x.sourceId===value.sourceId&&x.partId===value.partId);
    if(previous) {
      if(previous.id!==value.id||previous.sourceId!==value.sourceId||previous.partId!==value.partId||
        previous.speciesId!==value.speciesId||previous.quality!==value.quality||previous.massKg!==value.massKg||previous.volumeUnits!==value.volumeUnits)
        return {ok:false,inventory:save.inventory,reason:"Identité de prélèvement incohérente."};
    } else next.push(value);
  }
  if(next.length>HARVEST_DEPOT_LIMIT_V112)return {ok:false,inventory:save.inventory,reason:"Dépôt plein : résultat conservé en attente, aucune prise détruite."};
  const changed=next.length!==ledger.specimens.length||freshUses.length>0;
  return {ok:true,reason:"",inventory:changed?{...save.inventory,harvestV112:{...ledger,specimens:next,
    toolCondition:save.inventory.fieldToolIds.includes("flaying-tool")?toolConditionAfterUsesV112(ledger.toolCondition,freshUses.length):ledger.toolCondition,
    toolUseIds:[...ledger.toolUseIds,...freshUses]}}:save.inventory};
}
export interface ConservationActionResultV112 {ok:boolean;save:SaveGame;message:string}
export function startConservationV112(save:SaveGame,specimenId:string):ConservationActionResultV112 {
  const ledger=normalizeHarvestInventoryV112(save.inventory.harvestV112);
  const item=ledger?.specimens.find(s=>s.id===specimenId),step=item&&CONSERVATION_STEPS_V112.find(s=>s.from===item.stage);
  const refuse=(message:string)=>({ok:false,save,message});
  if(!ledger||!item||!step)return refuse("Cette prise ne demande plus de travail ou n'existe pas.");
  if(ledger.jobs.some(j=>j.specimenId===item.id&&j.status==="active"))return refuse("Une opération est déjà en cours sur cette prise.");
  if(ledger.jobs.filter(j=>j.status==="active").length>=16)return refuse("Les 16 postes de travail sont occupés.");
  if(!Number.isSafeInteger(save.profile.clanMarks)||save.profile.clanMarks<step.cost)return refuse("Marques insuffisantes ; aucun travail engagé.");
  const job:ConservationJobV112={id:item.id+":"+step.to,specimenId:item.id,fromStage:step.from,toStage:step.to,
    unitsDone:0,unitsRequired:step.units,costPaid:step.cost,status:"active"};
  return {ok:true,message:step.label+" engagé : "+step.cost+" marques confirmées ; "+step.units+" gestes manuels.",
    save:{...save,profile:{...save.profile,clanMarks:save.profile.clanMarks-step.cost},
      inventory:{...save.inventory,harvestV112:{...ledger,jobs:[...ledger.jobs,job]}}}};
}
export function workConservationV112(save:SaveGame,jobId:string):ConservationActionResultV112 {
  const ledger=normalizeHarvestInventoryV112(save.inventory.harvestV112),job=ledger?.jobs.find(j=>j.id===jobId&&j.status==="active");
  if(!ledger||!job)return {ok:false,save,message:"Ce travail est terminé ou indisponible."};
  const done=job.unitsDone+1,complete=done===job.unitsRequired;
  return {ok:true,message:complete?"Étape terminée et enregistrée.":"Geste enregistré "+done+"/"+job.unitsRequired+".",
    save:{...save,inventory:{...save.inventory,harvestV112:{...ledger,
      specimens:ledger.specimens.map(s=>s.id===job.specimenId&&complete?{...s,stage:job.toStage}:s),
      jobs:ledger.jobs.map(j=>j.id===job.id?{...j,unitsDone:done,status:complete?"completed":"active"}:j)}}}};
}
export function repairFieldToolV112(save:SaveGame):ConservationActionResultV112 {
  const ledger=normalizeHarvestInventoryV112(save.inventory.harvestV112);
  if(!ledger||!save.inventory.fieldToolIds.includes("flaying-tool"))return {ok:false,save,message:"Acquérez d'abord l'outil de dépeçage."};
  if(ledger.toolCondition===100)return {ok:false,save,message:"L'outil est déjà affûté."};
  return {ok:true,message:"Outil affûté gratuitement. Les reçus d'usure restent conservés.",
    save:{...save,inventory:{...save.inventory,harvestV112:{...ledger,toolCondition:100}}}};
}
