import type { EarthReferenceViewV147 } from "../earthGeoReferenceV147";
import { projectPlanetGeographyV138 } from "../systems/planetProjectionParityV138";

/** Story settings from primary studio synopses. Never mislabel a filming
 * location as the film's fictional location, nor project an Earth city on a
 * procedurally generated alien planet. */
export type CanonStoryWorldV148 = "earth" | "unidentified-alien";
export type CanonSettingPrecisionV148 = "city" | "region" | "unspecified";
export interface CanonStorySettingV148 {
  readonly id: string;
  readonly film: string;
  readonly releaseYear: number;
  readonly world: CanonStoryWorldV148;
  readonly precision: CanonSettingPrecisionV148;
  readonly setting: string;
  readonly earthAnchor: readonly [longitude:number,latitude:number] | null;
  readonly markerAccuracy: "approximate-city-center" | null;
  readonly sourceUrl: string;
  readonly evidence: string;
}

export const PLANET_CANON_STORY_SETTINGS_V148: readonly CanonStorySettingV148[] = Object.freeze([
  {
    id:"predator-1987", film:"Predator", releaseYear:1987,
    world:"earth",precision:"unspecified",setting:"Jungle sur Terre, pays et camp non déterminés par ce synopsis",
    earthAnchor:null,markerAccuracy:null,
    sourceUrl:"https://www.20thcenturystudios.com/movies/predator/",
    evidence:"Le synopsis officiel mentionne la jungle et un Predator venu sur Terre, pas une position GPS.",
  },
  {
    id:"predator-2-1990",film:"Predator 2",releaseYear:1990,
    world:"earth",precision:"city",setting:"Los Angeles, Californie",
    earthAnchor:[-118.2437,34.0522],markerAccuracy:"approximate-city-center",
    sourceUrl:"https://www.20thcenturystudios.com/movies/predator-2",
    evidence:"Synopsis officiel : Los Angeles. Le repère n'est que le centre approximatif de la ville, jamais une adresse de scène.",
  },
  {
    id:"predators-2010",film:"Predators",releaseYear:2010,
    world:"unidentified-alien",precision:"unspecified",setting:"Planète extraterrestre de chasse non géolocalisée sur Terre",
    earthAnchor:null,markerAccuracy:null,
    sourceUrl:"https://www.20thcenturystudios.com/movies/predators",
    evidence:"Le synopsis officiel place les personnages sur une planète extraterrestre, sans coordonnées terrestres.",
  },
  {
    id:"prey-2022",film:"Prey",releaseYear:2022,
    world:"earth",precision:"region",setting:"Grandes Plaines, peuple comanche",
    earthAnchor:null,markerAccuracy:null,
    sourceUrl:"https://www.20thcenturystudios.com/movies/prey",
    evidence:"Le synopsis officiel précise les Grandes Plaines et la nation comanche, pas une localité exacte.",
  },
  {
    id:"predator-badlands-2025",film:"Predator: Badlands",releaseYear:2025,
    world:"unidentified-alien",precision:"unspecified",setting:"Planète reculée extraterrestre",
    earthAnchor:null,markerAccuracy:null,
    sourceUrl:"https://www.20thcenturystudios.com/movies/predator-badlands",
    evidence:"Le synopsis officiel parle d'une planète reculée et n'assigne aucun point terrestre.",
  },
]);
export function validCanonStorySettingV148(record:CanonStorySettingV148):boolean {
  if(!record.id||!record.film||record.releaseYear<1980||record.releaseYear>2100||
    !["earth","unidentified-alien"].includes(record.world)||
    !["city","region","unspecified"].includes(record.precision)||
    !record.sourceUrl.startsWith("https://www.20thcenturystudios.com/movies/"))return false;
  if(record.earthAnchor===null)
    return record.markerAccuracy===null && record.precision!=="city";
  return record.world==="earth" && record.precision==="city" &&
    record.markerAccuracy==="approximate-city-center" &&
    record.earthAnchor.length===2 &&
    Number.isFinite(record.earthAnchor[0])&&Math.abs(record.earthAnchor[0])<=180 &&
    Number.isFinite(record.earthAnchor[1])&&Math.abs(record.earthAnchor[1])<=90;
}

/** An alien generator code never becomes the setting of Predators or Badlands
 * just because its biome happens to be jungle, snow, rock or volcanic. */
export function canonStoryEntriesForWorldV148(worldCode:string):readonly CanonStorySettingV148[] {
  if(worldCode!=="earth")return [];
  return PLANET_CANON_STORY_SETTINGS_V148.filter(entry=>entry.world==="earth");
}
export function earthCanonFilmPinsV148(worldCode:string):readonly CanonStorySettingV148[] {
  return canonStoryEntriesForWorldV148(worldCode).filter(entry=>entry.earthAnchor!==null);
}
export function earthFilmMarkerPositionV148(
  entry:CanonStorySettingV148,view:EarthReferenceViewV147,
):{x:number;y:number}|null {
  if(!validCanonStorySettingV148(entry)||entry.world!=="earth"||entry.earthAnchor===null)return null;
  return projectPlanetGeographyV138(entry.earthAnchor,{
    projection:view.projection,width:view.width,height:view.height,
    longitude:view.longitude,latitude:view.latitude,
    centerX:view.width/2,centerY:view.height/2,
    radius:Math.min(view.width,view.height)/2-4,
    mapTop:0,mapHeight:view.height,
  });
}
