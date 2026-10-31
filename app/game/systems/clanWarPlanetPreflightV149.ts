import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import { analyzePlanetPhysicalSurfaceV136 } from "./clanWarPlanetSurfaceBudgetV136";
import { analyzePlanetEnvironmentV146 } from "./clanWarPlanetEnvironmentV146";
import { validPlanetRegionalMaterialKitV128, type PlanetRegionalMaterialKitV128 } from "./clanWarRegionalMaterialKitV128";

export type PlanetPreflightSeverityV149 = "error" | "warning";
export interface PlanetPreflightIssueV149 {
  severity: PlanetPreflightSeverityV149;
  code: string;
  target: string | null;
  explanation: string;
}
export interface PlanetPreflightReportV149 {
  format: "yautja-planet-preflight";
  version: 149;
  worldCode: string;
  recipeVersion: number | null;
  checked: { regions:number; territories:number; landmasses:number; routes:number; inlandFeatures:number };
  status: "structural-errors" | "review-advised" | "no-structural-errors";
  errors: number;
  warnings: number;
  issues: readonly PlanetPreflightIssueV149[];
  limitations: readonly string[];
}

/** Checks the ACTUAL already generated strategic topology. A static catalogue,
 * screenshot or procedural seed alone cannot pass these checks. All checks
 * are read-only; a failure is not a hidden auto-fix to a war campaign. */
export function auditPlanetPreflightV149(
  planet: WarPlanetV96, regionalKit: PlanetRegionalMaterialKitV128 | null = null,
): PlanetPreflightReportV149 {
  const issues:PlanetPreflightIssueV149[]=[];
  const issue=(severity:PlanetPreflightSeverityV149,code:string,target:string|null,explanation:string)=>{
    issues.push({severity,code,target,explanation});
  };
  const regionMap=new Map(planet.regions.map(region=>[region.id,region]));
  const territoryMap=new Map(planet.territories.map(territory=>[territory.id,territory]));
  const landmassMap=new Map(planet.landmasses.map(landmass=>[landmass.id,landmass]));
  const definitions=new Map(planet.definitions.map(definition=>[definition.id,definition]));
  for(const [kind,ids,count] of [
    ["region",planet.regions.map(r=>r.id),planet.regions.length],
    ["territory",planet.territories.map(t=>t.id),planet.territories.length],
    ["landmass",planet.landmasses.map(l=>l.id),planet.landmasses.length],
    ["site",planet.definitions.map(d=>d.id),planet.definitions.length],
  ] as const) {
    if(new Set(ids).size!==count)issue("error","duplicate-"+kind+"-id",null,
      "Des identifiants "+kind+" sont en double.");
    if(count===0)issue("error","empty-"+kind+"-catalog",null,
      "Le catalogue des "+kind+" est vide.");
  }
  if(!Number.isFinite(planet.landFraction)||planet.landFraction<0||planet.landFraction>1)
    issue("error","invalid-land-fraction",null,"Fraction de terres hors de la surface sphérique.");
  const grouped=new Map<string,number>();
  for(const region of planet.regions){
    if(region.territoryIds.length<3)issue("error","region-under-minimum",region.id,
      "Une région stratégique nécessite trois territoires au minimum.");
    if(!Number.isFinite(region.latitude)||Math.abs(region.latitude)>90||
       !Number.isFinite(region.longitude)||Math.abs(region.longitude)>180)
      issue("error","region-coordinates",region.id,"Coordonnées du repère de région invalides.");
    for(const id of region.territoryIds){
      grouped.set(id,(grouped.get(id)??0)+1);
      const territory=territoryMap.get(id);
      if(!territory)issue("error","missing-region-territory",region.id,
        "La région référence un territoire inexistant : "+id);
      else if(territory.regionId!==region.id)issue("error","region-territory-mismatch",id,
        "La région déclarée dans la cellule ne correspond pas à la région qui la contient.");
    }
  }
  for(const territory of planet.territories){
    if((grouped.get(territory.id)??0)!==1)issue("error","territory-region-membership",territory.id,
      "Territoire absent d'une région ou présent dans plusieurs régions.");
    if(!regionMap.has(territory.regionId))issue("error","orphan-territory",territory.id,
      "Territoire rattaché à une région inconnue.");
    if(!territory.landmassId||!landmassMap.has(territory.landmassId))issue("error","orphan-landmass",territory.id,
      "Territoire rattaché à une masse terrestre inconnue.");
    if(!definitions.has(territory.id))issue("error","missing-territory-site",territory.id,
      "Cellule présente sur la carte mais absente des sites jouables.");
    if(!Number.isFinite(territory.latitude)||Math.abs(territory.latitude)>90||
       !Number.isFinite(territory.longitude)||Math.abs(territory.longitude)>180||
       territory.points.length<3)issue("error","invalid-territory-geometry",territory.id,
      "Polygone ou coordonnées de territoire invalides.");
  }
  for(const landmass of planet.landmasses){
    if(landmass.points.length<3)issue("error","invalid-landmass-geometry",landmass.id,
      "Une masse terrestre possède moins de trois sommets.");
    for(const id of landmass.territoryIds){
      if(territoryMap.get(id)?.landmassId!==landmass.id)
        issue("error","landmass-territory-mismatch",id,
          "La masse terrestre référence un territoire absent ou étranger.");
    }
  }
  const graph=new Map<string,Set<string>>();
  for(const definition of planet.definitions){
    if(!territoryMap.has(definition.id))
      issue("error","orphan-site",definition.id,"Site militaire sans cellule géographique correspondante.");
    const neighbors=new Set(definition.neighbors);
    graph.set(definition.id,neighbors);
    if(neighbors.size!==definition.neighbors.length)
      issue("error","duplicate-neighbor",definition.id,"Un voisin est répété dans les routes jouables.");
    for(const n of neighbors){
      if(n===definition.id)issue("error","self-route",definition.id,"Un site se déclare son propre voisin.");
      else if(!definitions.has(n))issue("error","unknown-neighbor",definition.id,
        "Une route aboutit au territoire inexistant : "+n);
      else if(!definitions.get(n)!.neighbors.includes(definition.id))
        issue("error","asymmetric-neighbor",definition.id,
          "La route vers "+n+" est unilatérale et contredit la carte jouable.");
    }
  }
  if(graph.size>0){
    const seen=new Set<string>();
    const queue=[graph.keys().next().value as string];
    for(let i=0;i<queue.length;i++){
      const id=queue[i];if(seen.has(id))continue;seen.add(id);
      for(const n of graph.get(id)??[])if(graph.has(n)&&!seen.has(n))queue.push(n);
    }
    if(seen.size!==graph.size)issue("error","disconnected-front",null,
      (graph.size-seen.size)+" territoires ne sont pas accessibles depuis le premier site.");
  }
  const procedural=planet.procedural;
  const routes=procedural?.routes??[];
  for(const route of routes){
    if(!territoryMap.has(route.fromId)||!territoryMap.has(route.toId)||
       route.fromId===route.toId)
      issue("error","invalid-route-endpoints",route.fromId,"Route reliant des sites inconnus ou identiques.");
    if(!Number.isFinite(route.distanceDegrees)||route.distanceDegrees<0||
       route.distanceDegrees>180)
      issue("error","invalid-route-distance",route.fromId,"Longueur angulaire de route impossible.");
  }
  let inlandCount=0;
  if(procedural && "hydrology" in procedural){
    inlandCount=procedural.hydrology.features.length;
    if(procedural.hydrology.coveredFraction<0||procedural.hydrology.coveredFraction>1)
      issue("error","invalid-hydrology-fraction",null,"Fraction intérieure hors de la surface globale.");
    for(const feature of procedural.hydrology.features){
      if(!landmassMap.has(feature.landmassId)||
        feature.regionIds.some(id=>!regionMap.has(id))||
        feature.points.length<3)
        issue("error","orphan-inland-feature",feature.id,
          "Bassin ou cours intérieur sans régions ou masse terrestre valides.");
    }
  }
  if(procedural && "strategy" in procedural){
    const h=procedural.strategy.headquarters;
    for(const [faction,id] of Object.entries(h))
      if(!territoryMap.has(id))issue("error","unknown-headquarters",id,
        faction+" ne dispose pas d'un quartier général valide.");
  }
  const budget=analyzePlanetPhysicalSurfaceV136(planet);
  if(budget && (budget.dryLandKm2<0||budget.inlandMediumKm2<0||
    budget.exteriorMediumKm2<0 ||
    budget.surfaceKm2!==budget.dryLandKm2+budget.inlandMediumKm2+budget.exteriorMediumKm2))
    issue("error","surface-budget-mismatch",null,
      "La surface sphérique ne correspond pas à la somme terres / milieux intérieurs / extérieurs.");
  if(regionalKit && !validPlanetRegionalMaterialKitV128(planet,regionalKit))
    issue("error","foreign-or-invalid-material-kit",null,
      "Le kit de matières appartient à un autre monde ou contient des textures incompatibles.");
  if(procedural){
    const environment=analyzePlanetEnvironmentV146(planet);
    for(const warning of environment.flags)
      issue("warning","climate-"+warning.type,warning.regionId,warning.note);
  }else issue("warning","no-procedural-recipe",null,
    "Monde historiquement fabriqué à la main : aucune recette de générateur contrôlable.");
  const errors=issues.filter(entry=>entry.severity==="error").length;
  const warnings=issues.length-errors;
  return {
    format:"yautja-planet-preflight",version:149,worldCode:planet.id,
    recipeVersion:procedural?.recipe.version??null,
    checked:{
      regions:planet.regions.length,territories:planet.territories.length,
      landmasses:planet.landmasses.length,routes:routes.length,inlandFeatures:inlandCount,
    },
    status:errors?"structural-errors":warnings?"review-advised":"no-structural-errors",
    errors,warnings,issues,
    limitations:[
      "Contrôle structurel sur la carte jouable générée : une absence d'erreur n'est pas une preuve de fidélité artistique 1:1.",
      "Les anomalies de biomes extraterrestres sont des avertissements à expliquer, jamais une réécriture automatique.",
      "Les polygones sont contrôlés structurellement, pas remplacés par une nouvelle tessellation ni par une carte SIG certifiée.",
      "La vérification ne lit ni n'écrit les sauvegardes et n'inspecte aucun stock militaire caché.",
      "La Terre Natural Earth V147 demeure une référence externe, non une planète jouable créée par V115.",
    ],
  };
}
