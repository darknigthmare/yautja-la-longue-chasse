import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import {
  compatibleLandMaterialsV128, compatibleSurfaceMaterialsV128,
  validPlanetRegionalMaterialKitV128, type PlanetRegionalMaterialKitV128,
} from "./clanWarRegionalMaterialKitV128";
import { planetRandomV103 } from "./clanWarPlanetGeneratorV103";

/** Only the visual-source IDs are changed. The V128 saved sidecar format,
 * original region seed/biome and all actual world/campaign bytes stay intact. */
export type RegionMaterialDomainV145 = "land" | "surface";
export type RegionalMaterialRandomScopeV145 =
  "all" | "region" | "land" | "surface" | "region-land" | "region-surface";
export interface RegionalMaterialLockV145 {
  regionId: string;
  domain: RegionMaterialDomainV145;
}
export interface RegionalMaterialRandomResultV145 {
  kit: PlanetRegionalMaterialKitV128;
  changedSlots: readonly RegionalMaterialLockV145[];
}
const scopes: readonly RegionalMaterialRandomScopeV145[] =
  ["all","region","land","surface","region-land","region-surface"] as const;
const matchesScope=(scope:RegionalMaterialRandomScopeV145,regionId:string,selected:string,domain:RegionMaterialDomainV145) =>
  (scope==="all" || scope==="land" && domain==="land" || scope==="surface" && domain==="surface" ||
   scope==="region" && regionId===selected ||
   scope==="region-land" && regionId===selected && domain==="land" ||
   scope==="region-surface" && regionId===selected && domain==="surface");
const slotKey=(regionId:string,domain:RegionMaterialDomainV145)=>regionId+"|"+domain;
const optionsFor = (planet:WarPlanetV96,biome:WarPlanetV96["landBiome"],domain:RegionMaterialDomainV145):
  readonly (string | null)[] => domain === "land"
  ? compatibleLandMaterialsV128(biome)
  : compatibleSurfaceMaterialsV128(planet.surface.kind, biome).length
    ? [null, ...compatibleSurfaceMaterialsV128(planet.surface.kind,biome)] : [null];

/** All global, per-region and per-domain choices follow V128 biome legality.
 * Non-liquid worlds have no surface slot to randomize: zero invented waters. */
export function selectableRegionalMaterialSlotsV145(
  planet:WarPlanetV96,kit:PlanetRegionalMaterialKitV128,scope:RegionalMaterialRandomScopeV145,
  selectedRegionId:string,locks:readonly RegionalMaterialLockV145[]=[],
):readonly RegionalMaterialLockV145[] {
  if(!validPlanetRegionalMaterialKitV128(planet,kit))
    throw new RangeError("Kit régional incompatible avec le monde.");
  if(!scopes.includes(scope) ||
    locks.some(lock=>!lock || !planet.regions.some(region=>region.id===lock.regionId) ||
      (lock.domain!=="land" && lock.domain!=="surface")))
    throw new RangeError("Portée ou verrous de matières régionales invalides.");
  if((scope==="region" || scope==="region-land" || scope==="region-surface") &&
    !kit.entries.some(entry=>entry.regionId===selectedRegionId))
    throw new RangeError("Région cible inconnue.");
  const protectedSlots = new Set(locks.map(lock=>slotKey(lock.regionId,lock.domain)));
  return kit.entries.flatMap(entry => (["land","surface"] as const)
    .filter(domain => matchesScope(scope,entry.regionId,selectedRegionId,domain) &&
      !protectedSlots.has(slotKey(entry.regionId,domain)) &&
      optionsFor(planet,entry.biome,domain).length>1)
    .map(domain=>({regionId:entry.regionId,domain})));
}
function chooseDifferentV145(
  possibilities:readonly (string|null)[],current:string|null,entropy:number,salt:number,
):string|null {
  const index=Math.floor(planetRandomV103(entropy,salt)*possibilities.length);
  return possibilities[index]===current ? possibilities[(index+1)%possibilities.length] : possibilities[index];
}

/** Pure material lottery. All outcomes are independently validated by the
 * existing strict V128 reader, so it cannot invent a forbidden biome/source. */
export function randomizeRegionalMaterialKitV145(
  planet:WarPlanetV96,kit:PlanetRegionalMaterialKitV128,scope:RegionalMaterialRandomScopeV145,
  selectedRegionId:string,entropy:number,locks:readonly RegionalMaterialLockV145[]=[],
):RegionalMaterialRandomResultV145 {
  if(!Number.isInteger(entropy)||entropy<0||entropy>0xffffffff)
    throw new RangeError("Entropie régionale invalide.");
  const slots=selectableRegionalMaterialSlotsV145(planet,kit,scope,selectedRegionId,locks);
  if(!slots.length)return {kit,changedSlots:[]};
  const requested=new Set(slots.map(slot=>slotKey(slot.regionId,slot.domain)));
  const changedSlots:RegionalMaterialLockV145[]=[];
  const entries=kit.entries.map((entry,index)=>{
    const next={...entry};
    for(const [offset,domain] of (["land","surface"] as const).entries()){
      if(!requested.has(slotKey(entry.regionId,domain)))continue;
      const choices=optionsFor(planet,entry.biome,domain);
      const existing=domain==="land"?next.landMaterialId:next.surfaceMaterialId;
      const seed=(entropy ^ entry.seed)>>>0;
      const chosen=chooseDifferentV145(choices,existing,seed,14500+index*7+offset);
      if(chosen===existing)continue;
      if(domain==="land")next.landMaterialId=chosen as string;
      else next.surfaceMaterialId=chosen;
      changedSlots.push({regionId:entry.regionId,domain});
    }
    return next;
  });
  const candidate={...kit,entries};
  if(!validPlanetRegionalMaterialKitV128(planet,candidate))
    throw new RangeError("Le tirage régional a produit un matériau incompatible.");
  return {kit:candidate,changedSlots};
}
