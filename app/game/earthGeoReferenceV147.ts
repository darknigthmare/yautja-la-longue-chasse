import { planetPointFromPixelV101, wrapPlanetLongitudeV101 } from "./systems/planetMaterialV101";

export const EARTH_REFERENCE_SOURCE_V147 = Object.freeze({
  dataset:"Natural Earth — land polygons",scale:"1:110,000,000",
  publisher:"Natural Earth / NACIS",license:"public domain",
  source:"https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson",
  sourceBlobSha:"04811d72fff2701ec67587e30ad8942675b511e3",
  url:"/game/planets/earth/ne_110m_land.geojson",
  limitations:"Generalized small-scale overview, not an exact 1:1 coast, topographic dataset, settlement/film-location registry or playable war planet.",
});
export type EarthLonLatV147 = readonly [number,number];
export interface EarthLandFeatureV147 {
  type:"Feature";
  properties: Record<string,unknown>;
  geometry:{ type:"Polygon"; coordinates: EarthLonLatV147[][] };
}
export interface EarthLandGeoJsonV147 {
  type:"FeatureCollection";
  features:EarthLandFeatureV147[];
}
export interface EarthReferenceViewV147 {
  projection:"map"|"globe";
  width:number;height:number;
  longitude:number;latitude:number;
}

function pointV147(value:unknown):value is EarthLonLatV147 {
  return Array.isArray(value)&&value.length>=2&&value.length<=3&&
    typeof value[0]==="number"&&Number.isFinite(value[0])&&Math.abs(value[0])<=180 &&
    typeof value[1]==="number"&&Number.isFinite(value[1])&&Math.abs(value[1])<=90;
}

/** Untrusted GeoJSON must pass a structural and complexity bound before any
 * canvas work. This is an EARTH-only reference, not a procedural world code. */
export function validEarthLandGeoJsonV147(value:unknown):value is EarthLandGeoJsonV147 {
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const root=value as Record<string,unknown>;
  if(root.type!=="FeatureCollection"||!Array.isArray(root.features)||
    root.features.length<100||root.features.length>300)return false;
  let points=0;
  for(const feature of root.features){
    if(!feature||typeof feature!=="object"||feature.type!=="Feature"||
      !feature.geometry||feature.geometry.type!=="Polygon"||
      !Array.isArray(feature.geometry.coordinates)||
      feature.geometry.coordinates.length<1||feature.geometry.coordinates.length>20)return false;
    for(const ring of feature.geometry.coordinates){
      if(!Array.isArray(ring)||ring.length<4||ring.length>4000)return false;
      points+=ring.length;if(points>20000)return false;
      if(!ring.every(pointV147))return false;
    }
  }
  return true;
}

function inRingV147(ring:readonly EarthLonLatV147[],lon:number,lat:number):boolean {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>lat)!==(b[1]>lat) &&
      lon < (b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}

/** Canonical longitude/latitude checks: never put an Earth location onto an
 * invented Yautja/Genna-like planet by coincidence of regional names. */
export function earthLandContainsV147(
  earth:EarthLandGeoJsonV147,longitude:number,latitude:number,
):boolean {
  if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||Math.abs(latitude)>90)
    throw new RangeError("Coordonnées terrestres invalides.");
  const lon=wrapPlanetLongitudeV101(longitude);
  return earth.features.some(feature=>{
    const rings=feature.geometry.coordinates;
    return inRingV147(rings[0],lon,latitude) &&
      !rings.slice(1).some(hole=>inRingV147(hole,lon,latitude));
  });
}

export function earthReferenceStatsV147(earth:EarthLandGeoJsonV147) {
  if(!validEarthLandGeoJsonV147(earth))throw new RangeError("Référence Terre invalide.");
  return {
    featureCount:earth.features.length,
    ringCount:earth.features.reduce((sum,feature)=>sum+feature.geometry.coordinates.length,0),
    vertexCount:earth.features.reduce((sum,feature)=>sum+
      feature.geometry.coordinates.reduce((inner,ring)=>inner+ring.length,0),0),
  };
}

const masks=new WeakMap<EarthLandGeoJsonV147,HTMLCanvasElement>();
function createEarthLandMaskV147(earth:EarthLandGeoJsonV147):HTMLCanvasElement {
  const cached=masks.get(earth);if(cached)return cached;
  if(!validEarthLandGeoJsonV147(earth))throw new RangeError("Géographie Terre non vérifiée.");
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Canvas géographique Terre indisponible.");
  ctx.fillStyle="#729c6b";
  // Natural Earth 110m polygons already split across the date line, except
  // for Antarctica's legitimate -180 -> +180 closing edge along the pole.
  // Do not wrap or shorten that edge: it represents the entire south border.
  for(const feature of earth.features){
    ctx.beginPath();
    for(const ring of feature.geometry.coordinates){
      ring.forEach(([lon,lat],index)=>{
        const x=(lon+180)/360*canvas.width,y=(90-lat)/180*canvas.height;
        if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      });
      ctx.closePath();
    }
    ctx.fill("evenodd");
  }
  masks.set(earth,canvas);
  return canvas;
}

/** Draws actual Natural Earth land for either projection. Globe pixels use
 * the exact inverse geodesic mapping already employed by the game shader. */
export function drawEarthReferenceV147(
  target:HTMLCanvasElement, earth:EarthLandGeoJsonV147, view:EarthReferenceViewV147,
):void {
  if(!Number.isInteger(view.width)||view.width<128||view.width>1600||
    !Number.isInteger(view.height)||view.height<128||view.height>1600||
    (view.projection!=="map"&&view.projection!=="globe")||
    !Number.isFinite(view.longitude)||!Number.isFinite(view.latitude)||
    Math.abs(view.latitude)>90)
    throw new RangeError("Vue Terre invalide.");
  const source=createEarthLandMaskV147(earth);
  target.width=view.width;target.height=view.height;
  const ctx=target.getContext("2d");if(!ctx)throw new Error("Canvas Terre indisponible.");
  const width=view.width,height=view.height;
  if(view.projection==="map"){
    ctx.fillStyle="#184a66";ctx.fillRect(0,0,width,height);
    ctx.drawImage(source,0,0,width,height);
    ctx.strokeStyle="rgba(220,240,232,0.16)";ctx.lineWidth=.5;
    for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*height;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    for(let lon=-150;lon<180;lon+=30){const x=(lon+180)/360*width;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    return;
  }
  const texture=source.getContext("2d",{willReadFrequently:true})?.getImageData(0,0,1024,512).data;
  if(!texture)throw new Error("Texture continentale de la Terre illisible.");
  const output=ctx.createImageData(width,height),pixels=output.data;
  const radius=Math.min(width,height)/2-4,centerX=width/2,centerY=height/2;
  const inverseView={
    projection:"globe" as const,width,height,
    longitude:view.longitude,latitude:view.latitude,
    centerX,centerY,radius,mapTop:0,mapHeight:height,
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const geo=planetPointFromPixelV101(x+.5,y+.5,inverseView);
    if(!geo)continue;
    const tx=Math.min(1023,Math.max(0,Math.floor((geo[0]+180)/360*1024)));
    const ty=Math.min(511,Math.max(0,Math.floor((90-geo[1])/180*512)));
    const land=texture[(ty*1024+tx)*4+3]>127;
    const nx=(x+.5-centerX)/radius,ny=(y+.5-centerY)/radius;
    const shade=.52+.48*Math.sqrt(Math.max(0,1-nx*nx-ny*ny));
    const rgb=land?[114,156,107]:[25,78,110],index=(y*width+x)*4;
    pixels[index]=Math.round(rgb[0]*shade);
    pixels[index+1]=Math.round(rgb[1]*shade);
    pixels[index+2]=Math.round(rgb[2]*shade);
    pixels[index+3]=255;
  }
  ctx.putImageData(output,0,0);
}
