import type { WarPlanetLandBiomeV96, WarPlanetSurfaceKindV96, WarPlanetV96 } from "./clanWarPlanetsV96";

export const PLANET_ENVIRONMENT_VERSION_V146 = 146;
export const PLANET_SEASONS_V146 = [
  "northern-solstice", "first-equinox", "southern-solstice", "second-equinox",
] as const;
export type PlanetSeasonV146 = typeof PLANET_SEASONS_V146[number];
export type PlanetLatitudeBandV146 = "equatorial" | "subtropical" | "temperate" | "polar";
export type PlanetEnvironmentalFlagV146 =
  "equatorial-cold" | "polar-tropical" | "frozen-hot-biome" | "lava-cold-biome" |
  "extreme-inferred-density";
export interface PlanetEnvironmentalRegionV146 {
  regionId: string;
  name: string;
  latitude: number;
  longitude: number;
  biome: WarPlanetLandBiomeV96;
  climateDescription: string;
  latitudeBand: PlanetLatitudeBandV146;
  daylightFraction: number;
  daylightPlanetaryHours: number | null;
  solarNoonAltitudeDeg: number;
  flags: readonly PlanetEnvironmentalFlagV146[];
}
export interface PlanetEnvironmentalDossierV146 {
  format: "yautja-planet-environmental-study";
  version: 146;
  worldCode: string;
  assumedAxialTiltDeg: number;
  season: PlanetSeasonV146;
  solarDeclinationDeg: number;
  surfaceKind: WarPlanetSurfaceKindV96;
  mediumClass: "liquid" | "solid" | "particulate" | "aerosol" | "radiative";
  dayLengthPlanetaryHours: number | null;
  gravityEarthG: number | null;
  physical: null | {
    radiusKm: number;
    circumferenceKm: number;
    equatorialRotationKmPerHour: number | null;
    escapeVelocityKmPerSecond: number | null;
    inferredMeanDensityKgPerM3: number | null;
  };
  regions: readonly PlanetEnvironmentalRegionV146[];
  flags: readonly { regionId: string | null; type: PlanetEnvironmentalFlagV146; note: string }[];
  limitations: readonly string[];
}

const G_EARTH = 9.80665;
const GRAVITATION = 6.67430e-11;
const DEG = Math.PI / 180;
const surfaceClasses: Readonly<Record<WarPlanetSurfaceKindV96,PlanetEnvironmentalDossierV146["mediumClass"]>> = {
  water:"liquid", acid:"liquid", ice:"solid", sand:"particulate", lava:"liquid",
  brine:"liquid", radioactive:"radiative", crystal:"solid", spores:"particulate", mist:"aerosol",
};
const coldBiomes = new Set<WarPlanetLandBiomeV96>(["snow","tundra"]);
const tropicalBiomes = new Set<WarPlanetLandBiomeV96>(["jungle","swamp"]);
const hotBiomes = new Set<WarPlanetLandBiomeV96>(["volcanic","desert"]);
const readableFlags: Readonly<Record<PlanetEnvironmentalFlagV146,string>> = {
  "equatorial-cold":"Biome très froid près de l'équateur : préciser l'altitude, l'énergie solaire ou le climat extraterrestre.",
  "polar-tropical":"Biome chaud et humide à haute latitude : préciser l'effet de serre, le rayonnement ou le chauffage géothermique.",
  "frozen-hot-biome":"Milieu glacé et biome chaud : justifier la variation thermique, l'altitude ou la source de chaleur.",
  "lava-cold-biome":"Milieu de lave et biome froid : justifier la séparation physique des zones chaudes et froides.",
  "extreme-inferred-density":"Masse/densité inférée hors de la plage de référence des corps rocheux : vérifier la cohérence du rayon et de la gravité.",
};
function ensureLatitudeV146(value:number):number {
  if(!Number.isFinite(value)||value < -90||value > 90)
    throw new RangeError("Latitude planétaire invalide.");
  return value;
}
const round=(v:number,digits=1)=>Number(v.toFixed(digits));

export function planetLatitudeBandV146(latitude:number):PlanetLatitudeBandV146 {
  const abs=Math.abs(ensureLatitudeV146(latitude));
  return abs<23.5?"equatorial":abs<40?"subtropical":abs<66.5?"temperate":"polar";
}
export function planetSolarDeclinationV146(tiltDeg:number,season:PlanetSeasonV146):number {
  if(!Number.isFinite(tiltDeg)||tiltDeg<0||tiltDeg>85||!PLANET_SEASONS_V146.includes(season))
    throw new RangeError("Inclinaison axiale ou saison invalide.");
  const index=PLANET_SEASONS_V146.indexOf(season);
  return round(tiltDeg*Math.cos(index*Math.PI/2),6);
}
/** Idealized day/night fraction. No orbital parameters, insolation or 
 * atmospheric scattering are inferred from the game's fictional world. */
export function planetDaylightFractionV146(latitude:number,solarDeclinationDeg:number):number {
  ensureLatitudeV146(latitude);
  if(!Number.isFinite(solarDeclinationDeg)||Math.abs(solarDeclinationDeg)>90)
    throw new RangeError("Déclinaison solaire invalide.");
  if(Math.abs(solarDeclinationDeg)<1e-8)return .5;
  if(Math.abs(latitude)===90)
    return latitude*solarDeclinationDeg>0?1:0;
  const x=-Math.tan(latitude*DEG)*Math.tan(solarDeclinationDeg*DEG);
  if(x<=-1)return 1;
  if(x>=1)return 0;
  return Math.acos(x)/Math.PI;
}

export function analyzePlanetEnvironmentV146(
  planet:WarPlanetV96,options:{ axialTiltDeg?:number; season?:PlanetSeasonV146 }={},
):PlanetEnvironmentalDossierV146 {
  const tilt=options.axialTiltDeg??23.5;
  const season=options.season??"first-equinox";
  const declination=planetSolarDeclinationV146(tilt,season);
  const environment=planet.procedural?.environment;
  const day=environment?.dayLengthHours??null;
  const gravity=environment?.gravity??null;
  const p=planet.procedural;
  const radiusKm = p && p.recipe.version===115 && "physical" in p ? p.physical.radiusKm : null;
  const circumferenceKm = p && p.recipe.version===115 && "physical" in p ? p.physical.circumferenceKm : null;
  const inferredDensity = radiusKm!==null&&gravity!==null
    ? 3*gravity*G_EARTH/(4*Math.PI*GRAVITATION*(radiusKm*1000)):null;
  const escape = radiusKm!==null&&gravity!==null
    ? Math.sqrt(2*gravity*G_EARTH*radiusKm*1000)/1000:null;
  const flags: PlanetEnvironmentalDossierV146["flags"][number][]=[];
  if(inferredDensity!==null&&(inferredDensity<900||inferredDensity>9000)){
    flags.push({regionId:null,type:"extreme-inferred-density",note:readableFlags["extreme-inferred-density"]});
  }
  const regions=planet.regions.map(region=>{
    const biome=planet.procedural?.regions.find(record=>record.regionId===region.id)?.biome??planet.landBiome;
    const climateDescription=planet.procedural?.regions.find(record=>record.regionId===region.id)?.climate??"Climat régional non documenté";
    const latitude=ensureLatitudeV146(region.latitude), longitude=region.longitude;
    const fraction=planetDaylightFractionV146(latitude,declination);
    const issues:PlanetEnvironmentalFlagV146[]=[];
    const band=planetLatitudeBandV146(latitude);
    if(coldBiomes.has(biome)&&Math.abs(latitude)<18)issues.push("equatorial-cold");
    if(tropicalBiomes.has(biome)&&Math.abs(latitude)>66.5)issues.push("polar-tropical");
    if(planet.surface.kind==="ice"&&hotBiomes.has(biome))issues.push("frozen-hot-biome");
    if(planet.surface.kind==="lava"&&coldBiomes.has(biome))issues.push("lava-cold-biome");
    for(const type of issues)flags.push({regionId:region.id,type,note:readableFlags[type]});
    return {
      regionId:region.id,name:region.name,latitude,longitude,biome,climateDescription,
      latitudeBand:band,daylightFraction:round(fraction,6),
      daylightPlanetaryHours:day===null?null:round(day*fraction,2),
      solarNoonAltitudeDeg:round(90-Math.abs(latitude-declination),2),flags:issues,
    };
  });
  return {
    format:"yautja-planet-environmental-study",version:PLANET_ENVIRONMENT_VERSION_V146,
    worldCode:planet.id,assumedAxialTiltDeg:tilt,season,solarDeclinationDeg:declination,
    surfaceKind:planet.surface.kind,mediumClass:surfaceClasses[planet.surface.kind],
    dayLengthPlanetaryHours:day,gravityEarthG:gravity,
    physical: radiusKm===null||circumferenceKm===null?null:{
      radiusKm,circumferenceKm,
      equatorialRotationKmPerHour:day===null?null:round(circumferenceKm/day,2),
      escapeVelocityKmPerSecond:escape===null?null:round(escape,3),
      inferredMeanDensityKgPerM3:inferredDensity===null?null:Math.round(inferredDensity),
    },
    regions,flags,
    limitations:[
      "L'inclinaison est une hypothèse de l'étude, absente des codes V102/V103/V115 ; aucune orbite ni saison réelle n'est simulée.",
      "L'ensoleillement idéal ignore les nuages, le relief, l'atmosphère et l'éventuelle multiplicité des étoiles.",
      "La gravité des recettes est descriptive : densité et vitesse d'évasion sont inférées, jamais des propriétés canoniques imposées.",
      "Les alertes climatiques ne modifient ni les biomes, ni les missions, ni les territoires. Une planète extraterrestre peut justifier ses exceptions.",
      "Les océans de sable/spores et les champs cristallins ne sont pas assimilés à de l'eau liquide.",
    ],
  };
}
