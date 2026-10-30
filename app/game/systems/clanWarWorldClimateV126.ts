import {
 CLAN_WAR_VARIANT_ATLAS_V120,type ClanWarVariantV120,
 type ClanWarVariantModeV120,
} from "./clanWarVariantAtlasV120";
import {EARTH_FILM_SITES_V126,filmSiteByIdV126,type EarthFilmSiteV126} from "./clanWarEarthV126";

/** Correct WORLD FIRST, then climate, then encounter. Never use a film's
 * shooting town as the fictional planet where the characters acted. */
export type WorldKindV126="earth"|"original-alien"|"known-alien"|"unresolved-fiction";
export type ClimateV126=
 "hot-desert"|"cold-desert"|"polar"|"alpine"|"tropical-wet"|"temperate"|
 "wetland"|"marine"|"volcanic"|"underground"|"urban"|"alien-variable";
export type LocationAccuracyV126="city"|"island"|"region"|"unverified"|"not-applicable";
export interface WarWorldLocationV126 {
 worldId:string;worldKind:WorldKindV126;siteName:string;regionName:string;
 latitude:number|null;longitude:number|null;accuracy:LocationAccuracyV126;
 earthSiteId:string|null;earthReferenceName:string|null;
 mapAvailability:"pinned"|"name-only"|"unknown"|"alien-grid";
 worldExplanation:string;biomeSource:"film-location"|"lexical-inference"|"fictional-world";
}
export interface WarClimateV126 {
 climate:ClimateV126;temperatureRule:string;
 biome:string;terrain:string;liquid:string;weather:string;light:string;
 hazards:string[];isFrozen:boolean;allowsNaturalSnow:boolean;seasonRule:string;
 weatherAdjusted:boolean;originalWeather:string;
 siteKind:"interior"|"outdoor"|"mixed"|"multi-region";
 effectiveHazard:string;originalHazard:string;effectiveTwist:string;
 climateConfidence:"grounded-region"|"biome-derived"|"requires-geographic-verification";
}
export interface WarCoherentVariantV126 {
 sourceId:string;mode:ClanWarVariantModeV120;
 geography:WarWorldLocationV126;
 environment:WarClimateV126;
 original:ClanWarVariantV120;
 auditWarnings:string[];
}
const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const N=(s:string)=>norm(s).replace(/\s+/g," ");
const includesAny=(s:string,parts:readonly string[])=>parts.some(p=>s.includes(p));
const ALIEN_TERRITORIES=25;
const EARTH_REFERENCE_POINTS:Readonly<Record<string,{lat:number;lon:number;precision:"landmark-approx"|"regional-approx"}>>={
 "cite de carcassonne":{lat:43.2061,lon:2.3632,precision:"landmark-approx"},
 "viaduc de millau":{lat:44.078,lon:3.022,precision:"landmark-approx"},
 "musee du louvre":{lat:48.8606,lon:2.3376,precision:"landmark-approx"},
 "calanques de marseille":{lat:43.218,lon:5.454,precision:"regional-approx"},
 "marais de camargue":{lat:43.47,lon:4.48,precision:"regional-approx"},
 "fort boyard":{lat:45.9994,lon:-1.213,precision:"landmark-approx"},
 "mont saint-michel":{lat:48.636,lon:-1.5115,precision:"landmark-approx"},
 "grand canyon":{lat:36.10,lon:-112.11,precision:"regional-approx"},
 "mont fuji":{lat:35.3606,lon:138.7274,precision:"landmark-approx"},
 "death valley":{lat:36.50,lon:-116.93,precision:"regional-approx"},
 "vallee de la mort":{lat:36.50,lon:-116.93,precision:"regional-approx"},
 "yellowstone":{lat:44.42,lon:-110.58,precision:"regional-approx"},
 "salar d'uyuni":{lat:-20.13,lon:-67.49,precision:"regional-approx"},
 "erg chebbi":{lat:31.15,lon:-3.98,precision:"regional-approx"},
 "sossusvlei":{lat:-24.73,lon:15.31,precision:"regional-approx"},
 "mont everest":{lat:27.988,lon:86.925,precision:"landmark-approx"},
 "chutes victoria":{lat:-17.924,lon:25.857,precision:"landmark-approx"},
 "fort saint-jean de marseille":{lat:43.294,lon:5.363,precision:"landmark-approx"},
};
function filmByLoreFrameV126(variant:ClanWarVariantV120):EarthFilmSiteV126|undefined{
 const n=N(variant.referenceName??"");
 if(n.includes("los angeles nocturne"))return filmSiteByIdV126("earth-predator2-la");
 if(n.includes("gunnison"))return filmSiteByIdV126("earth-avpr-gunnison");
 if(n.includes("pyramide sous la banquise"))return filmSiteByIdV126("earth-avp-bouvet");
 if(n.includes("grandes plaines de naru"))return filmSiteByIdV126("earth-prey-plains");
 if(n.includes("jungle de chasse centro"))return filmSiteByIdV126("earth-predator-1987");
 if(n.includes("forets nord-americaines"))return filmSiteByIdV126("earth-predator2018-region");
 if(n.includes("rivage des raids vikings"))return filmSiteByIdV126("earth-kok-viking");
 if(n.includes("japon de l'ere feodale"))return filmSiteByIdV126("earth-kok-japan");
 if(n.includes("front aerien"))return filmSiteByIdV126("earth-kok-wwii");
 if(n.includes("reserve extraterrestre"))return filmSiteByIdV126("offearth-predators");
 if(n.includes("planete de l'exile"))return filmSiteByIdV126("offearth-badlands");
 return undefined;
}
function placeReference(variant:ClanWarVariantV120):WarWorldLocationV126{
 const index=Number(variant.id.slice(-3))-1;
 if(variant.family==="original")
  return {worldId:"original-world-"+String(Math.floor(index/4)+1).padStart(2,"0"),
   worldKind:"original-alien",siteName:variant.settingName,regionName:variant.zoneName,
   latitude:null,longitude:null,accuracy:"not-applicable",earthSiteId:null,earthReferenceName:null,
   mapAvailability:"alien-grid",worldExplanation:"Site imaginaire, position à générer sur son propre globe extraterrestre",
   biomeSource:"fictional-world"};
 if(variant.family==="homage"){
  const label=variant.referenceName??"Site réel non identifié";
  const point=EARTH_REFERENCE_POINTS[N(label)];
  return {worldId:"earth",worldKind:"earth",siteName:label,regionName:"Terre — lieu historique/géographique réel",
   latitude:point?.lat??null,longitude:point?.lon??null,accuracy:point?"region":"unverified",
   earthSiteId:null,earthReferenceName:label,
   mapAvailability:point?"pinned":"name-only",
   worldExplanation:point?
    "Évocation fictive d'une mission Yautja SUR TERRE ; coordonnées cartographiques approximatives, pas un événement réel/canonique.":
    "Lieu réel correctement attribué à la Terre, mais coordonnées non vérifiées : ne pas inventer de position ni de ville extraterrestre.",
   biomeSource:"lexical-inference"};
 }
 const film=filmByLoreFrameV126(variant);
 if(film){
  if(film.world==="earth")
   return {worldId:"earth",worldKind:"earth",siteName:film.name,
    regionName:film.countryOrRegion,
    latitude:film.lat,longitude:film.lon,accuracy:film.precision==="city-centre"?"city":
       film.precision==="island-centre"?"island":"region",
    earthSiteId:film.id,earthReferenceName:film.name,
    mapAvailability:film.lat!==null?"pinned":"unknown",
    worldExplanation:"Contexte du récit sur Terre, film et période séparés du lieu de tournage. "+
       (film.lat!==null?"Point cartographique de ville/île, non localisation de scène exacte.":"Aucun point unique attesté."),
    biomeSource:"film-location"};
  return {worldId:film.id,worldKind:"known-alien",siteName:film.name,
    regionName:film.countryOrRegion,latitude:null,longitude:null,accuracy:"not-applicable",
    earthSiteId:film.id,earthReferenceName:null,mapAvailability:"alien-grid",
    worldExplanation:"Planète extraterrestre du récit ; aucun placement terrestre. "+
      "La géographie locale reste une interprétation artistique de la continuité.",
    biomeSource:"fictional-world"};
 }
 return {worldId:"continuity-undetermined-"+Math.floor(index/4),
  worldKind:"unresolved-fiction",siteName:variant.settingName,
  regionName:variant.zoneName,latitude:null,longitude:null,accuracy:"unverified",
  earthSiteId:null,earthReferenceName:null,mapAvailability:"unknown",
  worldExplanation:"Œuvre de référence sans monde ni secteur canonique déterminés par cette source : localisation bloquée.",
  biomeSource:"fictional-world"};
}
const coldWords=["antarct","arct","glacier","glaci","vatnajok","ilulissat","longyearbyen","baltoro",
 "everest","annapurna","lofot","aletsch","neige","glace","toundra","blizzard","permafrost","sous-glaciaire","fjords a"];
const hotWords=["desert","erg","sossusvlei","atacama","sahara","gobi","namib","kalahari","wadi",
 "rub al","erg chebbi","oasis","sonora","mort","dunes","danakil","dubai","qatar","abou dabi",
 "mer morte","jaisalmer","aride","sables"];
const forestWords=["jungle","tropical","canop","amazon","rainforest","mangrove","serengeti",
 "okavango","congo","marais","fong","foret","delta","spores","tourbe"];
const mountainWords=["gunnison","himal","alp","toubkal","and","canyon","everest","annapurna",
 "cordill","picos","galibier","mont","sommet","highlands","sisteron","pyr","verdon"];
const marineWords=["littoral","atoll","lagon","lagune","récif","recif","baie","port","ocean",
 "mer ","ile ","île ","fjord","shore","archipel","bouvet"];
const undergroundWords=["catacombe","cavern","grotte","souterrain","tunnel","moria","conduit"];
const volcanicWords=["volcan","lave","basalt","geys","geyser","fagradalsfjall","bromo","kilauea"];
function determineClimate(variant:ClanWarVariantV120,world:WarWorldLocationV126):WarClimateV126{
 const earthLabel=N(world.earthReferenceName??world.siteName);
 const b=N(variant.environment.biome);
 const film=world.earthSiteId?EARTH_FILM_SITES_V126.find(item=>item.id===world.earthSiteId):undefined;
 const context=world.worldKind==="earth"?earthLabel:b;
 const isDryPolar=includesAny(context,["vallees seches de l'antarctique","valles secos antarticos"]);
 let climate:ClimateV126;
 if(isDryPolar)climate="cold-desert";
 else if(film?.climate==="polar-maritime")climate="polar";
 else if(film?.climate==="temperate-mountain")climate="alpine";
 else if(film?.climate==="tropical-forest")climate="tropical-wet";
 else if(film?.climate==="grassland")climate="temperate";
 else if(film?.climate==="temperate-urban")climate="urban";
 else if(includesAny(context,coldWords))climate=includesAny(context,mountainWords)?"alpine":"polar";
 else if(includesAny(context,hotWords))climate="hot-desert";
 else if(includesAny(context,volcanicWords))climate="volcanic";
 else if(includesAny(context,undergroundWords))climate="underground";
 else if(includesAny(context,forestWords))climate="tropical-wet";
 else if(includesAny(context,marineWords))climate="marine";
 else if(includesAny(context,mountainWords))climate="alpine";
 else if(world.worldKind==="earth")climate="temperate";
 else if(includesAny(b,["silice","marais","fongique"]))climate="wetland";
 else climate="alien-variable";
 const seed=variant.id.split("").reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
 const options:Record<ClimateV126,readonly string[]>={
  "hot-desert":["vent chaud et sec","ciel dégagé, air poussiéreux","brume sèche","rafales de sable","tempête de poussière"],
  "cold-desert":["vent polaire sec","givre de surface","ciel froid dégagé","brume glacée"],
  polar:["neige éparse","brouillard givrant","vents polaires","gelée blanche","ciel froid clair"],
  alpine:["vent de montagne","ciel dégagé de haute altitude","nuages sur les crêtes","gel nocturne saisonnier"],
  "tropical-wet":["averse tropicale","brume humide","pluie chaude","vent de mousson","ciel couvert"],
  temperate:["ciel variable","bruine","éclaircies","nuage bas","vent modéré"],
  wetland:["brouillard humide","brume de marais","pluie intermittente","chaleur humide"],
  marine:["embruns","vent côtier","brouillard maritime","bruine salée","ciel dégagé au large"],
  volcanic:["panache de cendre","vapeur de source chaude","ciel couvert de poussière","vent thermique"],
  underground:["courant de galerie","condensation intérieure","poussière de roche","système de ventilation intermittent"],
  urban:["ciel nuageux","averses urbaines","vent entre bâtiments","brume matinale"],
  "alien-variable":["ciel calme sous atmosphère fictive","vent local non extrême","brume de surface","nuages à définition artistique"],
 };
 const weather=options[climate][seed%options[climate].length];
 const terrain=world.worldKind==="earth"?
   climate==="polar"||climate==="cold-desert"?"sol minéral gelé / glace locale":
   climate==="hot-desert"?"sable et roche sèche":
   climate==="alpine"?"roche montagneuse et sol saisonnier":
   climate==="urban"?"asphalte, pierre et bâti local":
   climate==="marine"?"roche côtière et sable humide":
   climate==="tropical-wet"||climate==="wetland"?"humus humide, végétation et alluvions":
   "sol local naturel ou aménagé":variant.environment.terrain;
 const liquid=world.worldKind==="earth"?
   climate==="hot-desert"?"aucune eau permanente hors oasis ou saline attestée":
   climate==="polar"?"eau froide et glace saisonnière":
   climate==="cold-desert"?"humidité rare, glace localisée":
   climate==="marine"?"eau de mer salée":
   climate==="alpine"?"cours d'eau et fonte de neige saisonnière":
   climate==="urban"?"eau urbaine selon réseau réel":
   climate==="underground"?"écoulement souterrain conditionnel":
   "eau douce/saumâtre selon hydrologie locale":variant.environment.liquid;
 const blocked:Record<ClimateV126,string[]>={
  "hot-desert":["neige","blizzard","glace permanente","glacier"],
  "cold-desert":["canicule humide","mousson tropicale"],
  polar:["tempête de sable chaud","mousson tropicale"],
  alpine:["mousson équatoriale"],
  "tropical-wet":["blizzard","banquise naturelle"],
  temperate:[],wetland:["blizzard désertique"],marine:[],volcanic:[],underground:[],
  urban:[],"alien-variable":[]
 };
 const warnings:string[]=[];
 const original=N(variant.environment.weather);
 const earthPlace=N(world.earthReferenceName??world.siteName);
 const indoorWords=["musee","bibliothe","galerie","palais","theatre","opera","hotel",
    "museum","airport","gare","observatoire","basilique","mosquee","abbaye",
    "interieur","hall","salle","chapelle"];
 const routes=["route ","canal ","transsiberien","orient-express","express",
   "detroit ","col de ","passage ","tunnel ","pont ","voie maritime"];
 const multiRegion=world.worldKind==="earth"&&variant.family==="homage"&&variant.mode==="outer"&&includesAny(earthPlace,routes);
 const indoor=world.worldKind==="earth"&&variant.family==="homage"&&variant.mode==="stealth"&&includesAny(earthPlace,indoorWords);
 const siteKind:WarClimateV126["siteKind"]=multiRegion?"multi-region":indoor?"interior":
   variant.mode==="stealth"||variant.mode==="assault"?"mixed":"outdoor";
 const hazardOptions:Record<ClimateV126,readonly string[]>={
   "hot-desert":["rafale de sable","surchauffe des plaques","ensablement des accès"],
   "cold-desert":["givre sec","brise polaire","fissure de gel"],
   polar:["gel de conduit","brouillard de glace","rafale polaire"],
   alpine:["chute de pierres","vent de crête","éboulement d'altitude"],
   "tropical-wet":["crue de rivière","mousson locale","glissement humide"],
   temperate:["pluie variable","vent de travers","sol boueux"],
   wetland:["montée de marée","vase instable","brume humide"],
   marine:["embruns salés","houle locale","pont de quai glissant"],
   volcanic:["gaz volcanique","cendre volante","variation de chaleur"],
   underground:["panne de ventilation","effondrement de galerie","condensation"],
   urban:["coupure de courant","encombrement de ruelle","fumée de ventilation"],
   "alien-variable":["brouillage atmosphérique local","variation de pression","visibilité variable"],
 };
 const chosenHazard=hazardOptions[climate][seed%hazardOptions[climate].length];
 const effectiveHazard=indoor?"coupure de lumière intérieure et ronde de surveillance":
   multiRegion?"incident de tronçon en itinéraire multirégional":chosenHazard;
 const effectiveTwist=variant.operation.twist.replace(variant.environment.environmentalHazard,effectiveHazard);
 if(multiRegion)warnings.push("Corridor multirégional : la météo change selon le tronçon");
 if(indoor)warnings.push("Intérieur couvert : la pluie et la neige extérieures ne sont pas appliquées aux salles");

 if(blocked[climate].some(token=>original.includes(token)))warnings.push("Météo V120 incompatible remplacée");
 return {
  climate,temperatureRule:climate==="hot-desert"?"zone chaude et sèche ; pas de neige naturelle":
   climate==="polar"?"zone durablement froide ; pas de canicule tropicale":
   climate==="cold-desert"?"désert polaire ; froid et faible humidité":
   climate==="alpine"?"altitude : températures dépendant de la saison et de l'exposition":
   "conditions du biome et de la saison, sans chiffre météo inventé",
  biome:world.worldKind==="earth"?
   climate==="urban"?"ville terrestre":climate==="hot-desert"?"désert terrestre":
   climate==="polar"?"milieu polaire terrestre":climate==="alpine"?"montagne terrestre":
   climate==="marine"?"littoral terrestre":climate==="tropical-wet"?"forêt/zone humide terrestre":
   climate==="temperate"?"zone tempérée terrestre":climate==="cold-desert"?"désert froid terrestre":
   climate==="volcanic"?"milieu volcanique terrestre":climate==="underground"?"cavité terrestre":
   "milieu terrestre non vérifié":variant.environment.biome,
  terrain:indoor?"sol bâti intérieur, matière locale à vérifier":terrain,
  liquid:indoor?"eau uniquement si réseau intérieur attesté":liquid,
  weather:indoor?"pas de météo extérieure à l'intérieur":
    multiRegion?"météo variable selon secteurs parcourus":weather,
  light:indoor?"éclairage artificiel dépendant du courant":variant.environment.timeOfDay,
  hazards:climate==="hot-desert"?["déshydratation","vent abrasif","visibilité réduite par sable"]:
    climate==="polar"||climate==="cold-desert"?["gel des mécanismes","fissures de glace","vent froid"]:
    climate==="alpine"?["chutes de pierres","vents de crête","hypothermie selon saison"]:
    climate==="marine"?["houle","marée locale","embruns"]:
    ["visibilité locale","accès instable","aléas du terrain"],
  isFrozen:climate==="polar"||climate==="cold-desert",
  allowsNaturalSnow:climate==="polar"||climate==="cold-desert"||climate==="alpine",
  seasonRule:climate==="alpine"?"neige seulement si saison/altitude le permettent":
    climate==="hot-desert"?"pas d'événement glacial naturel":"météo déterministe cohérente avec le climat",
  weatherAdjusted:indoor||multiRegion||N(weather)!==original,
  originalWeather:variant.environment.weather,
  siteKind,effectiveHazard,originalHazard:variant.environment.environmentalHazard,
  effectiveTwist,
  climateConfidence:film||world.worldKind==="known-alien"?"grounded-region":
    world.worldKind==="earth"?"requires-geographic-verification":"biome-derived",
 };
}
export function coherentClanWarVariantV126(v:ClanWarVariantV120):WarCoherentVariantV126{
 const geography=placeReference(v),environment=determineClimate(v,geography);
 const warnings:string[]=[];
 if(geography.worldKind==="earth"&&geography.accuracy==="unverified")warnings.push("Coordonnées du lieu en attente : aucune épingle GPS inventée");
 if(geography.worldKind==="unresolved-fiction")warnings.push("Monde de continuité inconnu : implantation bloquée");
 if(environment.weatherAdjusted)warnings.push("Météo originale remplacée pour cohérence climatique");
 if(v.family==="lore"&&v.referenceContinuity?.includes("comics")&&geography.worldKind==="unresolved-fiction")
  warnings.push("Continuité comics non assimilée à une planète de film");
 return {sourceId:v.id,mode:v.mode,geography,environment,original:v,auditWarnings:warnings};
}
export const CLAN_WAR_COHERENT_VARIANTS_V126:readonly WarCoherentVariantV126[]=
 CLAN_WAR_VARIANT_ATLAS_V120.map(coherentClanWarVariantV126);
export function auditClanWarWorldsV126(){
 const list=CLAN_WAR_COHERENT_VARIANTS_V126,issues:string[]=[];
 if(list.length!==1200)issues.push("Catalogue V126 incomplet");
 for(const v of list){
  if(v.geography.worldKind==="earth"&&v.geography.worldId!=="earth")issues.push("Fausse Terre : "+v.sourceId);
  if(v.geography.worldKind!=="earth"&&(v.geography.latitude!==null||v.geography.longitude!==null))issues.push("Faux GPS : "+v.sourceId);
  if(v.environment.climate==="hot-desert"&&v.environment.allowsNaturalSnow)issues.push("Neige dans désert chaud : "+v.sourceId);
  if(v.geography.worldKind==="earth"&&v.environment.biome.includes("extraterrestre"))issues.push("Décor alien sur Terre : "+v.sourceId);
  if(v.original.family==="homage"&&v.geography.worldKind!=="earth")issues.push("Lieu terrestre envoyé sur monde alien : "+v.sourceId);
 }
 return {
  count:list.length,earth:list.filter(v=>v.geography.worldKind==="earth").length,
  alien:list.filter(v=>v.geography.worldKind==="known-alien"||v.geography.worldKind==="original-alien").length,
  unresolved:list.filter(v=>v.geography.worldKind==="unresolved-fiction").length,
  geoPinned:list.filter(v=>v.geography.latitude!==null).length,
  hotDesert:list.filter(v=>v.environment.climate==="hot-desert").length,
  snowOnHotDesert:list.filter(v=>v.environment.climate==="hot-desert"&&v.environment.allowsNaturalSnow).length,
  problems:issues,
 };
}
