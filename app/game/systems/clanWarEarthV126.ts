import earthLand from "../data/earthLandNaturalEarth110mV126.json";

/**
 * Official world: Earth, WGS84/OGC:CRS84 geometry, longitude then latitude.
 * It is NOT a randomized Yautja planet; shape maps are Natural Earth 1:110m,
 * useful at globe level but not a street/terrain/film-set 1:1 reconstruction.
 * Film events and shooting locations are deliberately not confused.
 */
export const EARTH_WORLD_ID_V126 = "earth";
export const EARTH_WGS84_V126 = Object.freeze({
  semiMajorMetres:6378137,
  semiMinorMetres:6356752.314245,
  inverseFlattening:298.257223563,
  projection:"EPSG:4326 / OGC:CRS84",
  coastlineSource:"Natural Earth 1:110m land polygons; public domain",
  coastlineUrl:"https://www.naturalearthdata.com/about/terms-of-use/",
  coastlineResolution:"small-scale overview; NOT 1:1 local geometry",
});
export type EarthPlacePrecisionV126 =
 "city-centre" | "island-centre" | "region-only" | "ambiguous" | "not-on-earth";
export type EarthPlaceWorldV126 = "earth" | "off-earth";
export interface EarthFilmSiteV126 {
 id:string;work:string;referencePeriod:string;name:string;world:EarthPlaceWorldV126;
 lat:number|null;lon:number|null;precision:EarthPlacePrecisionV126;
 countryOrRegion:string;biome:string;climate:"temperate-urban"|"temperate-mountain"|"polar-maritime"|"grassland"|
 "tropical-forest"|"temperate-forest"|"cold-coast"|"temperate-rain"|"unknown"|"off-world";
 status:"filming-not-coordinate"|"film-location"|"broad-region"|"non-earth";
 sourceUrl:string;notes:string;
}
/** No invented point where a fictional work gives only a broad region. */
export const EARTH_FILM_SITES_V126:readonly EarthFilmSiteV126[] = [
 {id:"earth-predator-1987",work:"Predator (1987)",referencePeriod:"1987",name:"Jungle non localisée à l'écran",
  world:"earth",lat:null,lon:null,precision:"ambiguous",countryOrRegion:"Amérique centrale / nord de l'Amérique du Sud (continuités divergentes)",
  biome:"tropical-forest",climate:"tropical-forest",status:"broad-region",
  sourceUrl:"https://www.avpcentral.com/predator-timeline-order-of-movies-and-comics",
  notes:"Val Verde est fictif ; Guatemala et Colombie relèvent d'autres continuités. Les lieux de tournage mexicains ne sont pas la géographie fictive."},
 {id:"earth-predator2-la",work:"Predator 2 (1990)",referencePeriod:"1997 dans le récit",
  name:"Los Angeles",world:"earth",lat:34.0522,lon:-118.2437,precision:"city-centre",
  countryOrRegion:"Californie, États-Unis",biome:"metropolitan",climate:"temperate-urban",status:"film-location",
  sourceUrl:"https://www.20thcenturystudios.com/movies/predator-2",
  notes:"Coordonnées du centre de ville, pas de la scène précise du film."},
 {id:"earth-prey-plains",work:"Prey (2022)",referencePeriod:"Début du XVIIIe siècle",
  name:"Grandes Plaines — territoire comanche",world:"earth",lat:null,lon:null,precision:"region-only",
  countryOrRegion:"Grandes Plaines d'Amérique du Nord",biome:"prairie",climate:"grassland",status:"broad-region",
  sourceUrl:"https://press.hulu.com/shows/prey/",
  notes:"Le distributeur confirme les Grandes Plaines et la nation comanche, sans publier de point GPS unique."},
 {id:"earth-avp-bouvet",work:"Alien vs. Predator (2004)",referencePeriod:"2004",
  name:"Île Bouvet (Bouvetøya)",world:"earth",lat:-54.4167,lon:3.3333,precision:"island-centre",
  countryOrRegion:"Atlantique Sud subantarctique, dépendance norvégienne",
  biome:"glaciated-volcanic-island",climate:"polar-maritime",status:"film-location",
  sourceUrl:"https://npolar.no/en/themes/bouvetoya/",
  notes:"Île située au NORD de 60° S, distincte de l'Antarctique continental. Le temple et la station baleinière du film sont fictionnels."},
 {id:"earth-avpr-gunnison",work:"Aliens vs. Predator: Requiem (2007)",referencePeriod:"2004 dans le récit",
  name:"Gunnison",world:"earth",lat:38.5458,lon:-106.9253,precision:"city-centre",
  countryOrRegion:"Colorado, États-Unis",biome:"highland-town",climate:"temperate-mountain",status:"film-location",
  sourceUrl:"https://www.allocine.fr/film/fichefilm-120576/secrets-tournage/",
  notes:"Ville réelle du Colorado, distincte de Vancouver (lieu de tournage). Ni extraterrestre ni station orbitale."},
 {id:"earth-predator2018-region",work:"The Predator (2018)",referencePeriod:"Époque contemporaine",
  name:"Forêts et installations nord-américaines",world:"earth",lat:null,lon:null,
  precision:"region-only",countryOrRegion:"Amérique du Nord; scène exacte non localisée dans ce référentiel",
  biome:"temperate-forest",climate:"temperate-forest",status:"broad-region",
  sourceUrl:"https://www.20thcenturystudios.com/movies/the-predator",
  notes:"Ne pas attribuer une ville GPS à partir de la seule adresse du tournage."},
 {id:"earth-kok-viking",work:"Predator: Killer of Killers (2025)",referencePeriod:"Époque viking",
  name:"Rivages scandinaves",world:"earth",lat:null,lon:null,precision:"region-only",
  countryOrRegion:"Scandinavie, région non précisée",biome:"northern-coast",climate:"cold-coast",
  status:"broad-region",sourceUrl:"https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
  notes:"Région narrative, pas une île précisément cartographiée."},
 {id:"earth-kok-japan",work:"Predator: Killer of Killers (2025)",referencePeriod:"Japon féodal",
  name:"Japon féodal",world:"earth",lat:null,lon:null,precision:"region-only",
  countryOrRegion:"Japon, province non précisée",biome:"temperate-woodlands",climate:"temperate-rain",
  status:"broad-region",sourceUrl:"https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
  notes:"Les toitures, patios et jardins ne prouvent pas une ville particulière."},
 {id:"earth-kok-wwii",work:"Predator: Killer of Killers (2025)",referencePeriod:"Seconde Guerre mondiale",
  name:"Front aérien allié",world:"earth",lat:null,lon:null,precision:"region-only",
  countryOrRegion:"Théâtre de guerre non précisé par la fiche officielle",biome:"aerial-front",climate:"unknown",
  status:"broad-region",sourceUrl:"https://www.20thcenturystudios.com/movies/predator-killer-of-killers",
  notes:"Ne pas projeter automatiquement l'aérodrome du récit en Afrique ou dans le Pacifique sans source scène par scène."},
 {id:"offearth-predators",work:"Predators (2010)",referencePeriod:"2010",
  name:"Planète réserve de chasse",world:"off-earth",lat:null,lon:null,precision:"not-on-earth",
  countryOrRegion:"Monde extraterrestre sans coordonnées géographiques terrestres",
  biome:"mixed-alien-hunting-reserve",climate:"off-world",status:"non-earth",
  sourceUrl:"https://www.20thcenturystudios.com/movies/predators",
  notes:"Ni forêt terrestre ni coordonnée GPS sur la Terre."},
 {id:"offearth-badlands",work:"Predator: Badlands (2025)",referencePeriod:"Futur non géolocalisé",
  name:"Monde extraterrestre du récit",world:"off-earth",lat:null,lon:null,precision:"not-on-earth",
  countryOrRegion:"Planète extraterrestre",biome:"hostile-extraterrestrial",climate:"off-world",
  status:"non-earth",sourceUrl:"https://thewaltdisneycompany.com/news/predator-badlands/",
  notes:"Les paysages filmés à Rotorua et Auckland ne sont pas les lieux du récit."},
];
export interface EarthGeoFeatureV126 {type:"Feature";geometry:{type:"Polygon"|"MultiPolygon";coordinates:number[][][]|number[][][][]};}
export interface EarthGeoCollectionV126 {type:"FeatureCollection";name:string;features:EarthGeoFeatureV126[];}
export const EARTH_LAND_GEOMETRY_V126=earthLand as unknown as EarthGeoCollectionV126;
export interface EarthCoordV126 {lat:number;lon:number;}
export function validEarthCoordV126(c:EarthCoordV126):boolean{
 return Number.isFinite(c.lat)&&Number.isFinite(c.lon)&&c.lat>=-90&&c.lat<=90&&c.lon>=-180&&c.lon<=180;
}
export function projectEarthCoordV126(c:EarthCoordV126,width=1000,height=500):{x:number;y:number}|null{
 if(!validEarthCoordV126(c)||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 return {x:(c.lon+180)/360*width,y:(90-c.lat)/180*height};
}
/** Equirectangular globe overview, not a street map. GeoJSON stores longitude
 * before latitude; preserve it to avoid placing Gunnison in the Indian Ocean. */
export function earthLandSvgPathsV126(width=1000,height=500):string[]{
 const paths:string[]=[];
 const ringPath=(ring:number[][])=>{
  const coords=ring.map(p=>projectEarthCoordV126({lon:p[0],lat:p[1]},width,height));
  if(coords.some(x=>!x))return "";
  return coords.map((p,index)=>(index===0?"M":"L")+p!.x.toFixed(2)+" "+p!.y.toFixed(2)).join(" ")+" Z";
 };
 for(const feature of EARTH_LAND_GEOMETRY_V126.features){
  const polygons=feature.geometry.type==="Polygon"?
    [feature.geometry.coordinates as number[][][]]:
    feature.geometry.coordinates as number[][][][];
  for(const polygon of polygons){
   const path=polygon.map(ringPath).filter(Boolean).join(" ");
   if(path)paths.push(path);
  }
 }
 return paths;
}
export function filmSiteForWorkV126(work:string):EarthFilmSiteV126|undefined{
 const key=work.toLowerCase();
 return EARTH_FILM_SITES_V126.find(x=>x.work.toLowerCase()===key);
}
export function filmSiteByIdV126(id:string):EarthFilmSiteV126|undefined{
 return EARTH_FILM_SITES_V126.find(x=>x.id===id);
}
export function auditEarthFilmSitesV126(){
 const issues:string[]=[];
 const ids=new Set<string>();
 for(const site of EARTH_FILM_SITES_V126){
  if(ids.has(site.id))issues.push("Duplicate "+site.id);ids.add(site.id);
  if(site.world==="off-earth"&&(site.lat!==null||site.lon!==null))issues.push("Off-Earth coordinates "+site.id);
  if((site.lat===null)!==(site.lon===null))issues.push("Partial geocoordinates "+site.id);
  if(site.lat!==null&&site.lon!==null&&!validEarthCoordV126({lat:site.lat,lon:site.lon}))issues.push("Bad Earth coordinates "+site.id);
  if(["city-centre","island-centre"].includes(site.precision)&&site.lat===null)issues.push("Unplaced precision "+site.id);
 }
 const g=EARTH_LAND_GEOMETRY_V126;
 if(g.features.length<100)issues.push("World map missing land shapes");
 return {sites:EARTH_FILM_SITES_V126.length,pinned:EARTH_FILM_SITES_V126.filter(s=>s.lat!==null).length,
  source:EARTH_WGS84_V126.coastlineSource,issues};
}
