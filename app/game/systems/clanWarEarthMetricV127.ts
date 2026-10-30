import {
 EARTH_WGS84_V126,EARTH_FILM_SITES_V126,validEarthCoordV126,
 type EarthCoordV126,type EarthFilmSiteV126,
} from "./clanWarEarthV126";

/**
 * Real metric coordinate contract for the fixed planet Earth.
 * EPSG:4978 Earth-Centered/Earth-Fixed + local East-North-Up tangent plane.
 *
 * A mathematically real 1-metre displacement is NOT a 1:1 street/film scene.
 * Street elevations, roads, structures, interiors, exact film camera locations
 * require verified high-resolution content licensed for use and QA at source.
 */
export interface EarthGeodeticV127 extends EarthCoordV126 {
  altitudeMetres:number;
}
export interface EarthCartesianV127 {x:number;y:number;z:number;}
export interface EarthEnuV127 {east:number;north:number;up:number;}
export interface EarthSceneAnchorV127 {
 id:string;reference:string;origin:EarthGeodeticV127;
 precision:"surveyed-point"|"city-reference"|"island-reference";
 accuracyMetres:number|null;sceneTerrain:"unavailable"|"independently-authored";
 roadGeometry:"unavailable"|"licensed-source";
 interiorGeometry:"unavailable"|"independently-authored";
 source:string;lastVerified:string|null;
}
const a=EARTH_WGS84_V126.semiMajorMetres;
const b=EARTH_WGS84_V126.semiMinorMetres;
const e2=1-b*b/(a*a);
const toRad=(deg:number)=>deg*Math.PI/180;
const fromRad=(rad:number)=>rad*180/Math.PI;
const finite=(value:number)=>Number.isFinite(value);

export function earthToEcefV127(value:EarthGeodeticV127):EarthCartesianV127|null{
 if(!validEarthCoordV126(value)||!finite(value.altitudeMetres)||Math.abs(value.altitudeMetres)>1e7)return null;
 const lat=toRad(value.lat),lon=toRad(value.lon);
 const sinLat=Math.sin(lat),cosLat=Math.cos(lat),sinLon=Math.sin(lon),cosLon=Math.cos(lon);
 const n=a/Math.sqrt(1-e2*sinLat*sinLat);
 return {x:(n+value.altitudeMetres)*cosLat*cosLon,
  y:(n+value.altitudeMetres)*cosLat*sinLon,
  z:(n*(1-e2)+value.altitudeMetres)*sinLat};
}
export function earthToLocalEnuV127(
 origin:EarthGeodeticV127,target:EarthGeodeticV127,
):EarthEnuV127|null{
 const o=earthToEcefV127(origin),t=earthToEcefV127(target);
 if(!o||!t)return null;
 const dx=t.x-o.x,dy=t.y-o.y,dz=t.z-o.z;
 const lat=toRad(origin.lat),lon=toRad(origin.lon);
 const sinLat=Math.sin(lat),cosLat=Math.cos(lat),sinLon=Math.sin(lon),cosLon=Math.cos(lon);
 return {
  east:-sinLon*dx+cosLon*dy,
  north:-sinLat*cosLon*dx-sinLat*sinLon*dy+cosLat*dz,
  up:cosLat*cosLon*dx+cosLat*sinLon*dy+sinLat*dz,
 };
}
export function localEnuToEarthV127(
 origin:EarthGeodeticV127,enu:EarthEnuV127,
):EarthGeodeticV127|null{
 const o=earthToEcefV127(origin);
 if(!o||![enu.east,enu.north,enu.up].every(finite))return null;
 const lat=toRad(origin.lat),lon=toRad(origin.lon);
 const sinLat=Math.sin(lat),cosLat=Math.cos(lat),sinLon=Math.sin(lon),cosLon=Math.cos(lon);
 const dx=-sinLon*enu.east-sinLat*cosLon*enu.north+cosLat*cosLon*enu.up;
 const dy=cosLon*enu.east-sinLat*sinLon*enu.north+cosLat*sinLon*enu.up;
 const dz=cosLat*enu.north+sinLat*enu.up;
 const x=o.x+dx,y=o.y+dy,z=o.z+dz;
 const p=Math.hypot(x,y);
 if(p<1e-8) {
  const latitude=z>=0?90:-90;
  return {lat:latitude,lon:origin.lon,altitudeMetres:Math.abs(z)-b};
 }
 const lon2=Math.atan2(y,x);
 const ep2=(a*a-b*b)/(b*b);
 const theta=Math.atan2(z*a,p*b);
 const latitude=Math.atan2(z+ep2*b*Math.sin(theta)**3,p-e2*a*Math.cos(theta)**3);
 const n=a/Math.sqrt(1-e2*Math.sin(latitude)**2);
 const h=p/Math.cos(latitude)-n;
 const result={lat:fromRad(latitude),lon:((fromRad(lon2)+540)%360)-180,altitudeMetres:h};
 return validEarthCoordV126(result)?result:null;
}

/** Distance on the actual WGS84 ellipsoid (Vincenty inverse); fallback for
 * exact near-antipodal nonconvergence, never a fictional random route metric.
 */
export function earthGeodesicMetresV127(x:EarthCoordV126,y:EarthCoordV126):number|null{
 if(!validEarthCoordV126(x)||!validEarthCoordV126(y))return null;
 if(x.lat===y.lat&&x.lon===y.lon)return 0;
 const f=(a-b)/a;
 const u1=Math.atan((1-f)*Math.tan(toRad(x.lat)));
 const u2=Math.atan((1-f)*Math.tan(toRad(y.lat)));
 const l=toRad(y.lon-x.lon);
 const su1=Math.sin(u1),cu1=Math.cos(u1),su2=Math.sin(u2),cu2=Math.cos(u2);
 let lambda=l,sinSigma=0,cosSigma=0,sigma=0,sinAlpha=0,cos2Alpha=0,cos2SigmaM=0;
 let converged=false;
 for(let i=0;i<130;i++){
  const sl=Math.sin(lambda),cl=Math.cos(lambda);
  sinSigma=Math.hypot(cu2*sl,cu1*su2-su1*cu2*cl);
  if(sinSigma<1e-15)return 0;
  cosSigma=su1*su2+cu1*cu2*cl;
  sigma=Math.atan2(sinSigma,cosSigma);
  sinAlpha=cu1*cu2*sl/sinSigma;
  cos2Alpha=1-sinAlpha*sinAlpha;
  cos2SigmaM=cos2Alpha>1e-15?cosSigma-2*su1*su2/cos2Alpha:0;
  const c=f/16*cos2Alpha*(4+f*(4-3*cos2Alpha));
  const next=l+(1-c)*f*sinAlpha*(sigma+c*sinSigma*(cos2SigmaM+
   c*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
  if(Math.abs(next-lambda)<1e-12){lambda=next;converged=true;break;}
  lambda=next;
 }
 if(!converged){
  const dlat=toRad(y.lat-x.lat),dlon=toRad(y.lon-x.lon);
  const hav=Math.sin(dlat/2)**2+Math.cos(toRad(x.lat))*Math.cos(toRad(y.lat))*Math.sin(dlon/2)**2;
  return 6371008.8*2*Math.asin(Math.min(1,Math.sqrt(hav)));
 }
 const u2Param=cos2Alpha*(a*a-b*b)/(b*b);
 const A=1+u2Param/16384*(4096+u2Param*(-768+u2Param*(320-175*u2Param)));
 const B=u2Param/1024*(256+u2Param*(-128+u2Param*(74-47*u2Param)));
 const deltaSigma=B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM**2)-
  B/6*cos2SigmaM*(-3+4*sinSigma**2)*(-3+4*cos2SigmaM**2)));
 return b*A*(sigma-deltaSigma);
}
export function earthSceneAnchorV127(
 filmSite:EarthFilmSiteV126,
):EarthSceneAnchorV127|null {
 if(filmSite.world!=="earth"||filmSite.lat===null||filmSite.lon===null)return null;
 const city=filmSite.precision==="city-centre",island=filmSite.precision==="island-centre";
 if(!city&&!island)return null;
 return {
  id:"earth-anchor-"+filmSite.id,reference:filmSite.name,
  origin:{lat:filmSite.lat,lon:filmSite.lon,altitudeMetres:0},
  precision:city?"city-reference":"island-reference",
  accuracyMetres:null,sceneTerrain:"unavailable",roadGeometry:"unavailable",
  interiorGeometry:"unavailable",source:filmSite.sourceUrl,lastVerified:null,
 };
}
export const EARTH_FILM_SCENE_ANCHORS_V127:readonly EarthSceneAnchorV127[]=
 EARTH_FILM_SITES_V126.map(earthSceneAnchorV127).filter((v):v is EarthSceneAnchorV127=>!!v);
export const EARTH_LOCAL_ASSET_GATES_V127=Object.freeze([
 "Evidence of the film's actual narrative site rather than shooting location",
 "Verified WGS84 pin or explicitly bounded region; no invented city coordinates",
 "Licensed high-resolution street vectors / terrain elevation imported separately",
 "Building/interior floorplans independently authored or licensed at documented scale",
 "Collision, occlusion, water, temperature, seasons and path lengths validated",
 "Earth chronology and changes over time checked per specific film/story",
 "Asset provenance, copyright and map-data obligations checked before release",
]);
export function auditEarthMetricV127(){
 const issues:string[]=[];
 if(EARTH_FILM_SCENE_ANCHORS_V127.some(x=>x.accuracyMetres!==null||
    x.sceneTerrain!=="unavailable"||x.roadGeometry!=="unavailable"))
  issues.push("Unverified local geography falsely declared 1:1");
 if(earthGeodesicMetresV127({lat:0,lon:0},{lat:0,lon:1})===null)
  issues.push("WGS84 geodesic not available");
 const equator=earthToEcefV127({lat:0,lon:0,altitudeMetres:0});
 if(!equator||Math.abs(equator.x-a)>.1)issues.push("Wrong WGS84 equatorial radius");
 return {anchors:EARTH_FILM_SCENE_ANCHORS_V127.length,globalGeodesy:true,
  localStreetScenesCompleted:0,issues};
}
