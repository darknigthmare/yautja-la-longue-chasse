import fs from 'node:fs/promises';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldGeometryV64.ts','homeworldOutskirtsV71.ts','homeworldOutskirtsArtV71.ts','homeworldRegionConnectionsV72.ts']);
const polygons=[...api.HOMEWORLD_DISTRICTS,...api.HOMEWORLD_STREETS].map(item=>item.polygon);
const reserved=[...api.HOMEWORLD_OUTSKIRTS_MODULES_V71.map(api.homeworldOutskirtsFootprintV71),
  ...api.homeworldConnectionFurnitureFootprintsV72(),...api.HOMEWORLD_REGION_CONNECTIONS_V72.flatMap(api.homeworldGatewayFootprintsV72),
  ...api.HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72.map(s=>({left:s.x-s.footprintWorld.width/2,right:s.x+s.footprintWorld.width/2,top:s.y-s.footprintWorld.depth,bottom:s.y}))];
const clearance=42,reservedMargin=30,modules=[],boxes=[];
const contains=(r,p)=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;
const crosses=(r,a,b)=>{
  if(contains(r,a)||contains(r,b))return true;const dx=b.x-a.x,dy=b.y-a.y;
  if(dx)for(const x of[r.left,r.right]){const t=(x-a.x)/dx,y=a.y+t*dy;if(t>=0&&t<=1&&y>=r.top&&y<=r.bottom)return true;}
  if(dy)for(const y of[r.top,r.bottom]){const t=(y-a.y)/dy,x=a.x+t*dx;if(t>=0&&t<=1&&x>=r.left&&x<=r.right)return true;}
  return false;
};
const overlap=(a,b,margin)=>a.left<b.right+margin&&a.right>b.left-margin&&a.top<b.bottom+margin&&a.bottom>b.top-margin;
const distanceSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
const terrainClear=rect=>{
  const r={left:rect.left-clearance,right:rect.right+clearance,top:rect.top-clearance,bottom:rect.bottom+clearance};
  if([[r.left,r.top],[r.left,r.bottom],[r.right,r.top],[r.right,r.bottom]].some(([x,y])=>api.isHomeworldTerrainWalkable({x,y},{halfWidth:0,halfDepth:0})))return false;
  return !polygons.some(poly=>poly.some((a,i)=>crosses(r,a,poly[(i+1)%poly.length])));
};
const localStyles={
  'ash-marches':{material:'dry-ash',arts:['basalt','basalt','thicket'],formation:'ridge',note:'Éboulis secs de la corniche. Les Marches de Cendre restent au-delà du voyage régional.'},
  'glass-desert':{material:'sandy-grit',arts:['basalt','basalt','thicket'],formation:'ridge',note:'Gravillons abrités et alluvions sur la route des citernes ; pas de désert complet placé à la porte des logements.'},
  'pillar-jungle':{material:'moss-soil',arts:['resinwood','thicket','basalt','thicket'],formation:'understory',note:'Sous-bois dans les abris minéraux du plateau, avant le départ vers les hautes branches.'},
  'luminous-marshes':{material:'damp-gravel',arts:['thicket','basalt','resinwood'],formation:'drainage',note:'Drain superficiel hors chaussée ; aucune eau fictive sous un passage praticable, marais lointains inchangés.'},
  'storm-chain':{material:'fractured-bedrock',arts:['basalt','basalt','thicket'],formation:'ridge',note:'Éperons exposés et fissures du plateau. Les ponts lointains et les crêtes restent dans la région.'},
  'leviathan-coast':{material:'damp-gravel',arts:['basalt','thicket','basalt'],formation:'drainage',note:'Plateau drainé à la corniche des marées ; aucune mer collée à la cité ou navette dans la rue.'},
  'thermal-caves':{material:'mineral-crust',arts:['vent','basalt','vent'],formation:'geothermal',note:'Dépôts refroidis sur les épaules naturelles ; évents hors chaussée, logements non placés sur de la lave.'},
  'cold-crown':{material:'fractured-bedrock',arts:['basalt','basalt','thicket'],formation:'ridge',note:'Roche nue au départ des routes hautes ; la neige de la Couronne demeure distante, pas de climat arctique dans le quartier.'},
  'first-city-ruins':{material:'sandy-grit',arts:['basalt','thicket','basalt'],formation:'ridge',note:'Sédiment d’érosion autour des anciennes stèles existantes ; aucun monument inventé ou tombe recouverte.'},
  'forbidden-reserve':{material:'moss-soil',arts:['resinwood','thicket','basalt','thicket'],formation:'understory',note:'Lisière abritée hors enceinte et hors chaussée ; pas de créature importée dans la faune ordinaire.'},
};
const accept=(x,y,artId,scale,groupId,regionId,formation)=>{
  const point={x:Math.round(x),y:Math.round(y)};
  const district=api.HOMEWORLD_DISTRICTS.reduce((a,b)=>Math.hypot(point.x-a.x-a.width/2,point.y-a.y-a.height/2)<Math.hypot(point.x-b.x-b.width/2,point.y-b.y-b.height/2)?a:b);
  const candidate={id:'landscape-v75-'+String(modules.length+1).padStart(3,'0'),artId,...point,scale,districtId:district.id,groupId,regionId,formation};
  const box=api.homeworldOutskirtsFootprintV71(candidate);
  if(!terrainClear(box)||reserved.some(r=>overlap(box,r,reservedMargin))||boxes.some(r=>overlap(box,r,18)))return false;
  modules.push(candidate);boxes.push(box);return true;
};
const patches=[];
for(const [index,route] of api.HOMEWORLD_REGION_CONNECTIONS_V72.entries()){
  const style=localStyles[route.regionId],origin=route.threshold;
  patches.push({id:'landscape-floor-v75:'+route.regionId,regionId:route.regionId,materialId:style.material,x:origin.x,y:origin.y,radiusX:900,radiusY:850,opacity:.85,note:style.note});
  // Irregular geological shoulders around each true route, not parallel rows of identical props.
  for(let ring=0;ring<5;ring++)for(let n=0;n<21;n++){
    const angle=n*Math.PI*2/21+ring*.41+(index%3)*.19,radius=440+ring*230+(n*53%101),x=origin.x+Math.cos(angle)*radius,y=origin.y+Math.sin(angle)*radius*.78;
    const artId=style.arts[(n+ring*2)%style.arts.length],scale=artId==='basalt'?[1.22,1.5,1.78,2][(n+ring)%4]:artId==='resinwood'?[.9,1.15,1.35][n%3]:artId==='vent'?[.85,1.2,1.5][n%3]:[.8,1.05,1.3][n%3];
    accept(x,y,artId,scale,'threshold:'+route.regionId,route.regionId,style.formation);
  }
}
// Outer relief at varied elevations supports large silhouettes rather than a
// single painted panorama. Long gaps beyond the earlier 470u belt get clusters.
let index=0;
for(let y=-520;y<=6240;y+=310)for(let x=-680+(Math.floor(y/310)%2)*160;x<=7640;x+=330){
  const point={x:x+((index*71)%139)-69,y:y+((index*47)%113)-56};index++;
  const distance=Math.min(...polygons.flatMap(poly=>poly.map((a,n)=>distanceSegment(point,a,poly[(n+1)%poly.length]))));
  if(distance<460||distance>1160)continue;
  const wet=point.x<1600&&point.y>850&&point.y<2100,woods=point.y<1200&&point.x>2200&&point.x<3700;
  const artId=woods?['resinwood','thicket','basalt'][index%3]:wet?['basalt','thicket','thicket'][index%3]:['basalt','thicket','basalt'][index%3];
  accept(point.x,point.y,artId,artId==='basalt'?[1.4,1.8,2.2][index%3]:[.8,1.1,1.4][index%3],'outer:'+Math.floor(point.x/1100)+':'+Math.floor(point.y/1000),null,woods?'understory':wet?'drainage':'ridge');
}
patches.push(
  {id:'landscape-floor-v75:western-drain',regionId:null,materialId:'damp-gravel',x:0,y:1400,radiusX:720,radiusY:1000,opacity:.7,note:'Humidité retenue sous la corniche occidentale, hors terrains publics.'},
  {id:'landscape-floor-v75:northern-shelter',regionId:null,materialId:'moss-soil',x:2800,y:-100,radiusX:1250,radiusY:750,opacity:.65,note:'Sous-bois du versant nord dans les abris de basalte.'},
  {id:'landscape-floor-v75:south-alluvium',regionId:null,materialId:'sandy-grit',x:3300,y:5900,radiusX:1600,radiusY:680,opacity:.7,note:'Alluvions sèches sous les routes du plateau méridional.'},
  {id:'landscape-floor-v75:east-ridge',regionId:null,materialId:'fractured-bedrock',x:7280,y:3100,radiusX:1250,radiusY:2300,opacity:.65,note:'Roche affleurante sur le versant oriental exposé.'},
);
assertCoverage();
function assertCoverage(){for(const route of api.HOMEWORLD_REGION_CONNECTIONS_V72){const count=modules.filter(m=>m.regionId===route.regionId).length;if(count<5)throw Error(route.regionId+' has insufficient safe scenery: '+count);}}
const target='app/game/data/homeworldLandscapeV75.json';
await fs.writeFile(target,JSON.stringify({version:75,lore:'original-adaptation',clearanceWorld:clearance,reservedMarginWorld:reservedMargin,placement:'baked-natural-shoulders-existing-public-floor-excluded',modules,patches},null,2)+'\n');
console.log(JSON.stringify({target,modules:modules.length,patches:patches.length,perRegion:Object.fromEntries(api.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>[r.regionId,modules.filter(m=>m.regionId===r.regionId).length])),artIds:[...new Set(modules.map(m=>m.artId))]}));
