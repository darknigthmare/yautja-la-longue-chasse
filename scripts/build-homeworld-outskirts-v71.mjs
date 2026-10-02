import { build } from 'esbuild';
import fs from 'node:fs/promises';
const load = async file => { const result = await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'}); return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64')); };
const city = await load('app/game/systems/homeworldCity.ts');
const { HOMEWORLD_OUTSKIRTS_ART_V71: arts } = await load('app/game/systems/homeworldOutskirtsArtV71.ts');
const polygons = [...city.HOMEWORLD_DISTRICTS, ...city.HOMEWORLD_STREETS].map(item=>item.polygon);
const distanceSegment = (p,a,b) => { const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))); return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy); };
const edgeDistance = point => Math.min(...polygons.flatMap(poly=>poly.map((a,i)=>distanceSegment(point,a,poly[(i+1)%poly.length]))));
const terrain = p => city.isHomeworldTerrainWalkable(p,{halfWidth:0,halfDepth:0});
const box = module => {const art=arts[module.artId], s=module.scale;return {left:module.x-art.footprintWorld.width*s/2,right:module.x+art.footprintWorld.width*s/2,top:module.y-art.footprintWorld.depth*s,bottom:module.y};};
const contains = (rect,p) => p.x>=rect.left&&p.x<=rect.right&&p.y>=rect.top&&p.y<=rect.bottom;
const crosses = (rect,a,b) => {
  if(contains(rect,a)||contains(rect,b))return true;
  const dx=b.x-a.x,dy=b.y-a.y;
  if(dx)for(const x of [rect.left,rect.right]){const t=(x-a.x)/dx,y=a.y+t*dy;if(t>=0&&t<=1&&y>=rect.top&&y<=rect.bottom)return true;}
  if(dy)for(const y of [rect.top,rect.bottom]){const t=(y-a.y)/dy,x=a.x+t*dx;if(t>=0&&t<=1&&x>=rect.left&&x<=rect.right)return true;}
  return false;
};
const clear = (rect, margin=42) => {
  const expanded={left:rect.left-margin,right:rect.right+margin,top:rect.top-margin,bottom:rect.bottom+margin};
  if([[expanded.left,expanded.top],[expanded.left,expanded.bottom],[expanded.right,expanded.top],[expanded.right,expanded.bottom]].some(([x,y])=>terrain({x,y})))return false;
  if(polygons.some(poly=>poly.some((a,i)=>crosses(expanded,a,poly[(i+1)%poly.length]))))return false;
  return true;
};
const overlaps = (a,b) => a.left<b.right+30&&a.right>b.left-30&&a.top<b.bottom+30&&a.bottom>b.top-30;
const accepted=[], boxes=[];
const choose = (x,y,index) => {
  if(y<750)return ['basalt','marker','basalt','thicket','retaining'][index%5];
  if(x>4900)return ['basalt','retaining','marker','thicket','basalt'][index%5];
  if(x>2550&&x<4050&&y>2150)return ['vent','basalt','vent','marker','thicket'][index%5];
  if(x<1250||y<1900)return ['resinwood','thicket','resinwood','basalt','thicket'][index%5];
  return ['basalt','thicket','retaining','resinwood','thicket'][index%5];
};
let index=0;
for(let y=-240;y<=city.HOMEWORLD_WORLD.height+240;y+=205)for(let x=-300+(Math.floor(y/205)%2)*105;x<=city.HOMEWORLD_WORLD.width+300;x+=225){
  const offset=(index*17%59)-29, point={x:Math.round(x+offset),y:Math.round(y+((index*31%43)-21))};
  index++; if(terrain(point)||edgeDistance(point)>470)continue;
  const artId=choose(point.x,point.y,index),scale=[.76,.9,1,1.08][index%4];
  const district=city.HOMEWORLD_DISTRICTS.reduce((a,b)=>Math.hypot(point.x-a.x-a.width/2,point.y-a.y-a.height/2)<Math.hypot(point.x-b.x-b.width/2,point.y-b.y-b.height/2)?a:b);
  const item={id:'outskirts-v71-'+String(accepted.length+1).padStart(3,'0'),artId,...point,scale,districtId:district.id};
  const rect=box(item); if(!clear(rect)||boxes.some(b=>overlaps(rect,b)))continue;
  accepted.push(item);boxes.push(rect);
}
const target='app/game/data/homeworldOutskirtsV71.json';
await fs.writeFile(target,JSON.stringify({version:71,lore:'original-adaptation',clearanceWorld:42,placement:'baked-native-supports-outside-existing-ground',modules:accepted},null,2)+'\n');
console.log(JSON.stringify({path:target,modules:accepted.length,artIds:[...new Set(accepted.map(m=>m.artId))],districts:[...new Set(accepted.map(m=>m.districtId))]}));
