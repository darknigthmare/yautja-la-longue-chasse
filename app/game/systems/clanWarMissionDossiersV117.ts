import type { ClanWarEntryV85 } from "./clanWarV85Data";
import type { WarRulesV6 } from "./clanWarBibleV6";

/**
 * Read-only source dossiers. Each sentence below comes directly from a W3/W5
 * cell in the currently selected rules; these are NOT newly playable quests.
 * The current four-mode sandbox can be launched separately.
 */
export type WarMissionSourceKindV117 = "narrative" | "rts" | "three-mode";
export type WarMissionPlayabilityV117 = "dossier-only";
export interface WarSourceMissionV117 {
  id: string;
  title: string;
  kind: WarMissionSourceKindV117;
  sheet: string;
  row: number;
  parentId: string | null;
  mapId: string | null;
  chapter: number | null;
  recommendedMode: "hero" | "rts" | "strategic";
  originalMode: string;
  situation: string;
  approach: string;
  choice: string;
  completion: string;
  retreat: string;
  continuity: string;
  rewardText: string;
  sourceCells: string[];
  provenance: string;
  playability: WarMissionPlayabilityV117;
}
export interface WarSourceCampaignV117 {
  id: string; title: string; sheet: string; row: number;
  mapId: string; recommendedUnits: string[]; missionIds: string[];
  premise: string; finale: string; sourceCells: string[]; provenance: string;
}
export interface WarSourceMapV117 {
  id: string; title: string; width: number; height: number;
  biome: string; geometry: string; cover: string; events: string;
  objectives: string; sourceCells: string[]; provenance: string;
}
export interface WarSourceDoctrineV117 {
  id: string; title: string; code: string; specialty: string;
  tactic: string; boundaries: string; weaknesses: string; provenance: string;
}
export interface WarSourceDiplomacyV117 {
  id: string; title: string; parties: string[]; terms: string; restrictions: string; consequences: string;
  provenance: string;
}
export interface WarMissionDossierCatalogueV117 {
  version: 1; workbook: string; sourceSha: string;
  missions: WarSourceMissionV117[];
  campaigns: WarSourceCampaignV117[];
  maps: WarSourceMapV117[];
  doctrines: WarSourceDoctrineV117[];
  diplomacy: WarSourceDiplomacyV117[];
  missingReferences: string[];
}
const cell = (entry: ClanWarEntryV85, column: string) => entry.fields.find(f=>f.column===column);
const value = (entry: ClanWarEntryV85, column: string) => String(cell(entry,column)?.value??"").trim();
const fieldCells = (entry: ClanWarEntryV85, keys: string[]) => keys.filter(k=>cell(entry,k)).map(k=>cell(entry,k)!.cell);
const validatedId = (value:string,pattern:RegExp) => pattern.test(value)?value:null;
const modes = {
  "Héros 2D":"hero","Carte et scène 2D":"strategic","RTS":"rts",
} as const;
function modeForSource(text:string):"hero"|"rts"|"strategic" {
  if(text==="RTS") return "rts";
  if(text==="Carte et scène 2D") return "strategic";
  return "hero";
}
const narrativeMission = (entry:ClanWarEntryV85): WarSourceMissionV117 => ({
  id:entry.id,title:String(entry.title),kind:"narrative",sheet:entry.sheet,row:entry.row,
  parentId:validatedId(value(entry,"C"),/^W3-A\d+$/),mapId:null,
  chapter:Number(value(entry,"D"))||null,recommendedMode:"hero",originalMode:"Héros 2D",
  situation:value(entry,"G"),approach:[value(entry,"H"),value(entry,"I")].filter(Boolean).join("\n"),
  choice:value(entry,"J"),completion:value(entry,"K"),retreat:value(entry,"L"),
  continuity:value(entry,"N"),rewardText:value(entry,"M"),
  sourceCells:fieldCells(entry,["C","D","E","F","G","H","I","J","K","L","M","N"]),
  provenance:"Bible V6 · cellule source W3-N · proposition de conception",playability:"dossier-only",
});
const rtsMission = (entry:ClanWarEntryV85): WarSourceMissionV117 => ({
  id:entry.id,title:String(entry.title),kind:"rts",sheet:entry.sheet,row:entry.row,
  parentId:null,mapId:validatedId(value(entry,"C"),/^W3-MAP\d+$/),
  chapter:null,recommendedMode:"rts",originalMode:"RTS",
  situation:value(entry,"E"),approach:value(entry,"I"),
  choice:value(entry,"K"),completion:value(entry,"L"),retreat:value(entry,"M"),
  continuity:value(entry,"N"),rewardText:value(entry,"O"),
  sourceCells:fieldCells(entry,["C","D","E","F","G","H","I","J","K","L","M","N","O","P"]),
  provenance:"Bible V6 · scénario RTS W3 · proposition de conception",playability:"dossier-only",
});
const threeModeMission = (entry:ClanWarEntryV85): WarSourceMissionV117 => ({
  id:entry.id,title:String(entry.title),kind:"three-mode",sheet:entry.sheet,row:entry.row,
  parentId:validatedId(value(entry,"C"),/^W5-C\d+$/),
  mapId:validatedId(value(entry,"F"),/^W3-MAP\d+$/),
  chapter:Number(value(entry,"D"))||null,recommendedMode:modeForSource(value(entry,"E")),
  originalMode:value(entry,"E"),situation:value(entry,"G"),approach:value(entry,"H"),
  choice:value(entry,"I"),completion:value(entry,"J"),retreat:value(entry,"M"),
  continuity:value(entry,"N"),rewardText:value(entry,"L"),
  sourceCells:fieldCells(entry,["C","D","E","F","G","H","I","J","K","L","M","N","O"]),
  provenance:"Bible V6 · campagne trois modes W5 · extension scénarisée",playability:"dossier-only",
});
const campaign = (entry:ClanWarEntryV85): WarSourceCampaignV117 => ({
  id:entry.id,title:String(entry.title),sheet:entry.sheet,row:entry.row,mapId:value(entry,"C"),
  recommendedUnits:value(entry,"E").match(/W3-U\d+/g)??[],
  missionIds:["G","H","I"].map(k=>value(entry,k)).filter(Boolean),
  premise:value(entry,"F"),finale:value(entry,"J"),
  sourceCells:fieldCells(entry,["C","D","E","F","G","H","I","J","K","L","M"]),
  provenance:"Bible V6 · W5-C · annexe volontaire, non encore jouable",
});
const map = (entry:ClanWarEntryV85): WarSourceMapV117 => ({
  id:entry.id,title:String(entry.title),width:Number(value(entry,"D")),
  height:Number(value(entry,"E")),biome:value(entry,"C"),geometry:value(entry,"G"),
  cover:value(entry,"H"),events:value(entry,"I"),objectives:value(entry,"J"),
  sourceCells:fieldCells(entry,["C","D","E","F","G","H","I","J","K","L","M"]),
  provenance:"Bible V6 · W3-MAP · description, pas une scène 3D livrée",
});
const doctrine = (entry:ClanWarEntryV85):WarSourceDoctrineV117 => ({
  id:entry.id,title:String(entry.title),code:value(entry,"C"),
  specialty:value(entry,"D"),tactic:value(entry,"E"),boundaries:value(entry,"F"),
  weaknesses:value(entry,"G"),provenance:"Bible V6 · doctrine de clan reconstituée",
});
const diplomatic = (entry:ClanWarEntryV85):WarSourceDiplomacyV117 => ({
  id:entry.id,title:String(entry.title),parties:[value(entry,"C"),value(entry,"D")],
  terms:value(entry,"E"),restrictions:value(entry,"F"),
  consequences:value(entry,"G"),provenance:"Bible V6 · accord local proposé, non signé en campagne",
});
export function warMissionDossiersV117(rules:WarRulesV6):WarMissionDossierCatalogueV117 {
  const sections = new Map<string,ClanWarEntryV85[]>();
  for(const entry of rules.entries){
    const existing=sections.get(entry.sheet)??[];
    existing.push(entry);sections.set(entry.sheet,existing);
  }
  const pick=(sheet:string)=>sections.get(sheet)??[];
  const missions=[
    ...pick("Missions de guerre narrative").map(narrativeMission),
    ...pick("Scénarios RTS").map(rtsMission),
    ...pick("V5 Missions des trois modes").map(threeModeMission),
  ];
  const campaigns=pick("V5 Campagnes des trois modes").map(campaign);
  const maps=pick("Cartes des escarmouches").map(map);
  const doctrines=pick("Doctrines des clans").map(doctrine);
  const diplomacy=pick("Diplomatie des clans").map(diplomatic);
  const missionIds=new Set(missions.map(item=>item.id));
  const mapIds=new Set(maps.map(item=>item.id));
  const campaignIds=new Set(campaigns.map(item=>item.id));
  const narrativeArcs=new Set(pick("Arcs de guerre narrative").map(item=>item.id));
  const missingReferences=[
    ...missions.flatMap(item=>[
      ...(item.mapId&&!mapIds.has(item.mapId)?[item.id+" → carte "+item.mapId]:[]),
      ...(item.parentId&&!((item.kind==="narrative"?narrativeArcs:campaignIds).has(item.parentId))?[item.id+" → campagne "+item.parentId]:[]),
    ]),
    ...campaigns.flatMap(item=>[
      ...(!mapIds.has(item.mapId)?[item.id+" → carte "+item.mapId]:[]),
      ...item.missionIds.filter(id=>!missionIds.has(id)).map(id=>item.id+" → mission "+id),
    ]),
  ];
  return {
    version:1,workbook:rules.metadata.workbook,sourceSha:rules.metadata.sha256,
    missions,campaigns,maps,doctrines,diplomacy,missingReferences,
  };
}
export type WarSourceMissionFilterV117 = "all" | WarMissionSourceKindV117;
export function searchWarMissionDossiersV117(
  catalogue:WarMissionDossierCatalogueV117,term:string,kind:WarSourceMissionFilterV117="all",
):WarSourceMissionV117[] {
  const search=term.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  return catalogue.missions.filter(mission=>(kind==="all"||mission.kind===kind) &&
    (!search||[mission.id,mission.title,mission.originalMode,mission.situation,mission.approach,mission.choice,
      mission.completion,mission.mapId??"",mission.parentId??""].join(" ").normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(search)));
}
export function warSourceModeLabelV117(mode:WarSourceMissionV117["recommendedMode"]):string {
  return mode==="hero"?"Héros/infiltration":mode==="rts"?"RTS":"Carte stratégique";
}
export function warSourceMissionForIdV117(catalogue:WarMissionDossierCatalogueV117,id:string):WarSourceMissionV117|undefined {
  return catalogue.missions.find(item=>item.id===id);
}
export const WAR_SOURCE_SUPPORTED_MODES_V117 = Object.freeze(Object.keys(modes));
