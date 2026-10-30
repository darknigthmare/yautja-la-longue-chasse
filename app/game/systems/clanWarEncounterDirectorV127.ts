import {
 CLAN_WAR_COHERENT_VARIANTS_V126,type WarCoherentVariantV126,
} from "./clanWarWorldClimateV126";
import {
 createWarAiEncounterV126,type WarAiEncounterV126,type WarAiDetachmentV126,
} from "./clanWarEnemyProfilesV126";

export type WarMissionPhaseV127 = "recon"|"engage"|"objective"|"extract";
export type WarAiTriggerV127 =
 "initial-garrison"|"contact-confirmed"|"alarm-threshold"|"reinforcement-route-open"|"objective-contested";
export interface WarAiWaveV127{
 id:string;phase:WarMissionPhaseV127;trigger:WarAiTriggerV127;unitId:string;
 exactTeams:number;exactCombatants:number;role:string;lane:string;
 needsConnectedRoute:boolean;requiresPower:boolean;
 revealPolicy:"visible-on-entry"|"concealed-until-contact"|"report-only";
}
export interface WarStageRegionV127 {
 id:string;part:string;environment:string;terrain:string;fluid:string;
 coverType:string;climate:string;weather:string;mapScale:string;
 dimensions:"source-scale-unverified";
 weatherAllowed:boolean;
 hazard:string;hazardPolicy:string;
 naturalSnow:boolean;requirePowerForGate:boolean;
}
export interface WarAiTacticsV127{
 doctrine:string;enemyFaction:"rival-yautja-fan-fiction";
 neutralActors:"none-declared"|"noncombatants-possible";
 defend:string;attack:string;retreat:string;
 communications:string;powerFailure:string;
 objectivePriority:string;fogOfWar:string;
}
export interface WarEncounterSubVariantV127{
 id:string;sourceId:string;status:"design-only";schema:127;
 parentVersion:126;profile:1|2|3|4|5;players:number;
 worldId:string;worldKind:string;earthReferenceId:string|null;
 climate:string;phaseCount:4;
 sections:WarStageRegionV127[];
 enemyWaves:WarAiWaveV127[];
 estimatedEnemyTeams:number;estimatedEnemyPersons:number;
 maximumVisibleEnemies:number;hiddenOuterEstimate:number|null;
 sourceUnitPc:number;roleTypes:string[];
 mechanics:string[];tactics:WarAiTacticsV127;
 victoryConditions:string[];failureConditions:string[];
 missingAssets:string[];warnings:string[];
}
const PHASES:readonly WarMissionPhaseV127[]=["recon","engage","objective","extract"];
const SCENE_PARTS=[
 "accès à reconnaissance limitée","flanc derrière un couvert","nœud de l'objectif","issue de repli contrôlée",
] as const;
const WAVE_LANES=[
 "passe réellement connectée","porte latérale non condamnée",
 "rampe depuis la garnison","couloir extérieur contrôlé",
] as const;
function classifyCover(v:WarCoherentVariantV126):string {
 const c=v.environment.climate;
 if(c==="hot-desert")return "rochers de grès, talus sec, dépression hors crue";
 if(c==="polar"||c==="cold-desert")return "blocs de glace ou affleurements minéraux réellement stables";
 if(c==="marine")return "murets, rochers côtiers et plateformes de marée";
 if(c==="tropical-wet"||c==="wetland")return "racines épaisses et roches humides";
 if(c==="urban")return "structures construites (seulement là où la carte les atteste)";
 if(c==="volcanic")return "arêtes de basalte et écrans de cendre";
 return "couverts issus du matériau du site, à vérifier en collision";
}
function terrainHazard(v:WarCoherentVariantV126,section:number):string {
 const list=v.environment.hazards;
 return list[section%list.length]??"aucun événement certifié";
}
function powerRule(v:WarCoherentVariantV126):string {
 if(v.original.mode==="outer")return "Aucun coup de feu automatisé hors échéance de rapport.";
 return "Si la grille locale tombe, les portes et tourelles dépendantes de cette grille cessent d'agir. Les armes Yautja autonomes ne deviennent pas des appareils de réseau.";
}
function objectiveTactics(v:WarCoherentVariantV126):string{
 if(v.original.mode==="outer")return "Préserver les membres réels et différer le résultat jusqu'au rapport.";
 if(v.original.mode==="stealth")return "Protéger la preuve ou le dispositif, déclencher l'alerte après observation, non par omniscience.";
 if(v.original.mode==="assault")return "Réagir aux AP du joueur depuis les bastions existants, sans renfort gratuit.";
 return "Contester les vrais nœuds d'objectif et le ravitaillement ; une élimination seule ne valide pas une mission d'escorte.";
}
function neutralPolicy(v:WarCoherentVariantV126):WarAiTacticsV127["neutralActors"]{
 if(v.geography.worldKind==="earth")return "noncombatants-possible";
 const label=(v.original.referenceWork??"").toLowerCase();
 if(label.includes("alien"))return "noncombatants-possible";
 return "none-declared";
}
function waveTrigger(phase:WarMissionPhaseV127,mode:WarCoherentVariantV126["mode"]):WarAiTriggerV127{
 if(mode==="stealth"&&phase!=="recon")return "alarm-threshold";
 if(phase==="recon")return "initial-garrison";
 if(phase==="engage")return "contact-confirmed";
 if(phase==="objective")return "objective-contested";
 return "reinforcement-route-open";
}
export function buildWarEncounterSubVariantV127(
 scenario:WarCoherentVariantV126,profile:1|2|3|4|5,players=1,
):WarEncounterSubVariantV127{
 const ai=createWarAiEncounterV126(scenario,profile,players);
 const cover=classifyCover(scenario);
 const phases:WarStageRegionV127[]=PHASES.map((phase,index)=>({
  id:scenario.sourceId+"-REG-"+(index+1),part:SCENE_PARTS[index],
  environment:scenario.environment.biome,
  terrain:scenario.environment.terrain,fluid:scenario.environment.liquid,
  coverType:cover,climate:scenario.environment.climate,
  weather:scenario.environment.weather,mapScale:scenario.original.environment.mapScaleHint,
  dimensions:"source-scale-unverified",
  weatherAllowed:!scenario.environment.climate.includes("desert")||
    !/blizzard|neige chaude|givre tropical/i.test(scenario.environment.weather),
  hazard:terrainHazard(scenario,index),
  hazardPolicy:"Le danger n'est activé que si le terrain et le déclencheur existent réellement.",
  naturalSnow:scenario.environment.allowsNaturalSnow,requirePowerForGate:false,
 }));
 const groupWaves:WarAiWaveV127[]=ai.roleGroups.map((group:WarAiDetachmentV126,index)=>{
  const phase:WarMissionPhaseV127=group.activation==="start"?"recon":
   group.activation==="phase2"?"engage":
   group.activation==="phase3"?"objective":
   group.activation==="alarm"?"engage":"extract";
  const trigger=waveTrigger(phase,scenario.mode);
  return {
   id:group.id,phase,trigger,unitId:group.unitId,
   exactTeams:group.quantity,exactCombatants:group.expectedCombatants,
   role:group.role,lane:WAVE_LANES[index%4],
   needsConnectedRoute:phase!=="recon",requiresPower:false,
   revealPolicy:scenario.mode==="outer"?"report-only":
     phase==="recon"?"concealed-until-contact":"visible-on-entry",
  };
 });
 const mode=scenario.mode;
 const victoryConditions=mode==="assault"?
  ["bastion adverse réellement neutralisé","base alliée encore opérationnelle","rapport de bataille signé"]:
  mode==="outer"?["délai atteint","personnes et matériel réconciliés","rapport unique à l'arrivée"]:
  mode==="stealth"?["interaction d'objectif faite","route de repli franchie","alarme sous le seuil autorisé"]:
  ["occupation ou réparation d'objectif réel","effectifs vivants sur la zone","route de retrait non fictive"];
 const failureConditions=mode==="outer"?
  ["rapport manquant","détachement invalide ou déjà affecté","route réellement impraticable"]:
  ["aucun combattant admissible","objectif non tenu","issue bloquée ou phase expirée"];
 const siteNeeds=scenario.geography.worldKind==="earth"?[
   "vecteurs terrain terrestre et relief à vérifier, WGS84",
   "couvrants de "+scenario.environment.biome+" réellement présents",
   "matière de sol "+scenario.environment.terrain,
   "eau/hydrologie "+scenario.environment.liquid,
   "modèles de bâtiments d'époque uniquement si autorisés par la source",
   "sprites W3-U identifiés dans la continuité du jeu",
  ]:[
   ...scenario.original.production.neededSprites,
   ...scenario.original.production.neededTiles,
   "révision des effets de météo pour "+scenario.environment.climate,
  ];
 const warnings=[...ai.warnings,...scenario.auditWarnings];
 if(scenario.geography.worldKind==="unresolved-fiction")
  warnings.push("Épisode non localisable : interdit de le traiter comme territoire de campagne");
 if(scenario.geography.worldKind==="earth"&&scenario.geography.latitude===null)
  warnings.push("Référence terrestre sans coordonnées attestées : scène exacte non plaçable");
 if(mode==="outer")warnings.push("Adversaires non révélés aux clients avant la fin du mandat");
 return {
  id:scenario.sourceId+"-P"+profile,sourceId:scenario.sourceId,
  status:"design-only",schema:127,parentVersion:126,profile,players,
  worldId:scenario.geography.worldId,worldKind:scenario.geography.worldKind,
  earthReferenceId:scenario.geography.earthSiteId,
  climate:scenario.environment.climate,phaseCount:4,sections:phases,
  enemyWaves:groupWaves,estimatedEnemyTeams:ai.totalTeams,
  estimatedEnemyPersons:ai.totalCombatants,
  maximumVisibleEnemies:ai.maxSimultaneous,
  hiddenOuterEstimate:mode==="outer"?ai.totalTeams:null,
  sourceUnitPc:ai.difficultyBudgetPc,roleTypes:[...new Set(groupWaves.map(w=>w.unitId))],
  mechanics:scenario.original.operation.dynamicPhases,
  tactics:{
   doctrine:ai.doctrine,enemyFaction:"rival-yautja-fan-fiction",
   neutralActors:neutralPolicy(scenario),
   defend:mode==="rts"?"Contester la zone avec les mêmes collisions que les joueurs":"Protéger les points réellement reconnus",
   attack:ai.objectiveCounterplay,
   retreat:"Se retirer par une liaison validée, sans téléportation de réserve",
   communications:"Une escouade cachée ne voit pas à travers les murs ni l'ensemble du globe",
   powerFailure:powerRule(scenario),
   objectivePriority:objectiveTactics(scenario),
   fogOfWar:ai.visibility,
  },victoryConditions,failureConditions,
  missingAssets:[
   ...siteNeeds,
   "placements et chemins d'accès réels de la carte",
   "règles de collision/abri du terrain",
  ],
  warnings,
 };
}
export function warEncounterSubVariantsV127(scenario:WarCoherentVariantV126){
 return ([1,2,3,4,5] as const).map(index=>buildWarEncounterSubVariantV127(scenario,index));
}
export function auditWarEncounterSubVariantsV127(){
 const seen=new Set<string>(),errors:string[]=[];let total=0,phases=0,groups=0;
 for(const scenario of CLAN_WAR_COHERENT_VARIANTS_V126){
  for(const preset of warEncounterSubVariantsV127(scenario)){
   total++;phases+=preset.sections.length;groups+=preset.enemyWaves.length;
   if(seen.has(preset.id))errors.push("Dupe "+preset.id);
   seen.add(preset.id);
   if(preset.sections.length!==4)errors.push("Not four phases: "+preset.id);
   if(preset.enemyWaves.some(g=>g.exactCombatants<1||!/^W3-U\d{2}$/.test(g.unitId)))
    errors.push("Invalid roster: "+preset.id);
   if(preset.sourceUnitPc<0||preset.estimatedEnemyTeams<0)errors.push("Negative units "+preset.id);
   if(scenario.mode==="outer"&&preset.enemyWaves.length)errors.push("Leaked Outer Ops opponents "+preset.id);
   if(preset.sections.some(s=>!s.weatherAllowed))errors.push("Illegal weather "+preset.id);
  }
 }
 if(total!==6000||phases!==24000)errors.push("Missing 5 × 4 phases over 1200 contracts");
 return {sourceMissions:1200,subVariants:total,sceneSections:phases,authoredGroupAssignments:groups,errors};
}
