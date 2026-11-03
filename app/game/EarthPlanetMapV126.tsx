"use client";
import {useMemo,useState} from "react";
import {
 EARTH_FILM_SITES_V126,EARTH_WGS84_V126,earthLandSvgPathsV126,
 projectEarthCoordV126,type EarthFilmSiteV126,
} from "./systems/clanWarEarthV126";
import {earthRiverPathsV127,earthLakePathsV127,EARTH_HYDRO_SOURCE_V127} from "./systems/clanWarEarthHydrologyV127";
import styles from "./EarthPlanetMapV126.module.css";
const available=EARTH_FILM_SITES_V126.filter(place=>place.lat!==null&&place.lon!==null);
const coordLabel=(site:EarthFilmSiteV126)=>
  site.lat===null||site.lon===null?"Coordonnées exactes non attestées":
  Math.abs(site.lat).toFixed(4)+"° "+(site.lat>=0?"N":"S")+" · "+Math.abs(site.lon).toFixed(4)+"° "+(site.lon>=0?"E":"O");
export default function EarthPlanetMapV126({onClose}:{onClose?:()=>void}){
 const [selectedId,setSelectedId]=useState("earth-avpr-gunnison");
 const [filter,setFilter]=useState<"all"|"earth"|"off-earth">("all");
 const selected=EARTH_FILM_SITES_V126.find(x=>x.id===selectedId)??EARTH_FILM_SITES_V126[0];
 const paths=useMemo(()=>earthLandSvgPathsV126(),[]);
 const riverPaths=useMemo(()=>earthRiverPathsV127(),[]);
 const lakePaths=useMemo(()=>earthLakePathsV127(),[]);
 const listed=EARTH_FILM_SITES_V126.filter(x=>filter==="all"||x.world===filter);
 return <section className={styles.root} aria-label="Planète Terre WGS84 et vrais emplacements des récits Predator" data-testid="earth-v126-map">
  <header className={styles.heading}>
    <div><p className={styles.eyebrow}>ATLAS PHYSIQUE · MONDE FIXE · WGS84</p>
      <h3>Terre réelle — emplacements de la franchise</h3>
      <p>Continents géographiques issus de Natural Earth, coordonnées Terre en degrés et régions du récit correctement attribuées. Aucune planète alien ne reçoit une ville terrestre.</p>
    </div>
    {onClose&&<button type="button" onClick={onClose}>Retour au générateur de mondes</button>}
  </header>
  <p className={styles.warning}><strong>Précision :</strong> la forme des continents est une carte publique généralisée au 1:110 millions, pas un terrain à l&apos;échelle 1:1 des rues. Les points désignent le centre d&apos;une ville ou d&apos;une île, jamais la position exacte des scènes. Les régions non localisées restent sans épingle.</p>
  <div className={styles.stat}>
    <span>Planète <strong>Terre · WGS84</strong></span>
    <span>Rayon équatorial <strong>{(EARTH_WGS84_V126.semiMajorMetres/1000).toLocaleString("fr-FR")} km</strong></span>
    <span>Sites référencés <strong>{EARTH_FILM_SITES_V126.length}</strong></span>
    <span>Points vérifiables <strong>{available.length}</strong></span>
  </div>
  <svg className={styles.map} viewBox="0 0 1000 500" role="img" aria-label="Carte des continents réels, Los Angeles, Gunnison et île Bouvet">
    <title>Terre géographique : côtes et pays ne sont pas réinventés sur les planètes aliens.</title>
    <rect x="0" y="0" width="1000" height="500" fill="#122d40"/>
    {Array.from({length:11},(_,i)=><path key={"lon-"+i} d={"M"+(i*100)+" 0 V500"} stroke="#577585" strokeOpacity=".38" strokeWidth=".8"/>)}
    {Array.from({length:7},(_,i)=><path key={"lat-"+i} d={"M0 "+(i*500/6)+" H1000"} stroke="#577585" strokeOpacity=".38" strokeWidth=".8"/>)}
    {paths.map((path,index)=><path d={path} key={index} fill="#567b60" stroke="#a5b995" strokeWidth=".5" fillRule="evenodd"/>)}
    {lakePaths.map((path,index)=><path d={path} key={"lake-"+index} fill="#18445b" stroke="#97bcb8" strokeWidth=".45" fillRule="evenodd"/>)}
    {riverPaths.map((path,index)=><path d={path} key={"river-"+index} fill="none" stroke="#9bc9d0" strokeWidth=".85" strokeLinecap="round"/>)}
    <path d="M0 250 H1000" stroke="#8eb5b7" strokeWidth="1" strokeDasharray="8 6" opacity=".6"/>
    {available.map(place=>{
      const pos=projectEarthCoordV126({lat:place.lat!,lon:place.lon!});
      if(!pos)return null;
      const chosen=selected.id===place.id;
      return <g key={place.id}>
        <circle cx={pos.x} cy={pos.y} r={chosen?7:5} fill={chosen?"#f9d78b":"#e8baa0"}
          stroke="#142e37" strokeWidth="2"/>
        <text x={pos.x+10} y={pos.y-8} fill="#fff1d9" stroke="#1d2a2a" strokeWidth=".8" paintOrder="stroke"
          fontSize="12">{place.name}</text>
      </g>;
    })}
    <text x="20" y="480" fontSize="12" fill="#d4e5eb">Natural Earth · côtes, lacs et grands fleuves · 1:110m · WGS84</text>
  </svg>
  <p className={styles.hint}>Choisissez un dossier ci-dessous. Les épisodes marqués « région seulement » ne sont pas placés arbitrairement au centre d&apos;un pays.</p>
  <div className={styles.filters} aria-label="Filtrer les mondes narratifs">
    {([["all","Toutes les références"],["earth","Sur Terre"],["off-earth","Hors Terre"]] as const).map(([id,text])=>
      <button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{text}</button>)}
  </div>
  <div className={styles.columns}>
    <div className={styles.list}>
      {listed.map(site=><button type="button" key={site.id} aria-pressed={site.id===selected.id} onClick={()=>setSelectedId(site.id)}>
        <small>{site.work} · {site.referencePeriod}</small>
        <strong>{site.name}</strong>
        <span>{site.world==="earth"?"Terre":"Monde extraterrestre"} · {site.lat===null?"sans épingle":"repère cartographique"}</span>
      </button>)}
    </div>
    <article className={styles.detail}>
      <small>{selected.work} · {selected.referencePeriod}</small>
      <h4>{selected.name}</h4>
      <p><strong>Monde :</strong> {selected.world==="earth"?"Terre":"Planète extraterrestre distincte"}</p>
      <p><strong>Position :</strong> {coordLabel(selected)}</p>
      <p><strong>Région :</strong> {selected.countryOrRegion}</p>
      <p><strong>Biome :</strong> {selected.biome}</p>
      <p>{selected.notes}</p>
      <p><a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Vérifier la provenance du lieu</a></p>
      <p className={styles.hint}>La météo dépendra du biome, de la saison et de l&apos;altitude, et non d&apos;un tirage indépendant des coordonnées.</p>
    </article>
  </div>
  <footer className={styles.footer}>Fleuves et lacs : {EARTH_HYDRO_SOURCE_V127.precision}. Géométrie naturelle : <a href={EARTH_WGS84_V126.coastlineUrl} target="_blank" rel="noopener noreferrer">Natural Earth, domaine public</a>. Le niveau de détail cartographique ne valide ni bâtiments, ni routes locales, ni intérieurs des films. Aucun front de campagne V85 n&apos;est modifié par cet atlas.</footer>
 </section>;
}
