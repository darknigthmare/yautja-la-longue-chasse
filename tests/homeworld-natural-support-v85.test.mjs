import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const natural=load('homeworldNaturalPlacementsV80'),outskirts=load('homeworldOutskirtsV71'),world=load('homeworldWorldV77'),civic=load('homeworldCivicWorldV80'),urban=load('homeworldUrbanLayoutV78');
const before=JSON.stringify(natural.HOMEWORLD_NATURAL_MODULES_V80),scene=qa.load('app/game/HomeworldWorldSceneV77.tsx'),supports=scene.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85;
const grounds=[...world.HOMEWORLD_GROUND_V77,...world.HOMEWORLD_CONNECTOR_PADS_V82,...urban.HOMEWORLD_URBAN_GROUND_V78].filter(g=>g.levelId==='0');
function inside(p,poly){return poly.every((a,i)=>{const b=poly[(i+1)%poly.length];return(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)>=-1e-6;});}
function onEdge(p,poly){return poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y;return Math.abs(dx*(p.y-a.y)-dy*(p.x-a.x))<1e-5&&p.x>=Math.min(a.x,b.x)-1e-6&&p.x<=Math.max(a.x,b.x)+1e-6&&p.y>=Math.min(a.y,b.y)-1e-6&&p.y<=Math.max(a.y,b.y)+1e-6;});}

test('all retained natural roots have source-grouped rock supports attached to actual public edges, without changing placements or physics',()=>{
 assert(supports.length>1&&supports.length<natural.HOMEWORLD_NATURAL_MODULES_V80.length/2,'source formations, not a panorama or an island per plant');
 const ids=supports.flatMap(s=>s.ids);assert.equal(new Set(ids).size,natural.HOMEWORLD_NATURAL_MODULES_V80.length);
 for(const item of natural.HOMEWORLD_NATURAL_MODULES_V80){const support=supports.find(s=>s.ids.includes(item.id)),b=outskirts.homeworldOutskirtsFootprintV71(item);assert(support,item.id);for(const p of[{x:b.left,y:b.top},{x:b.right,y:b.top},{x:b.right,y:b.bottom},{x:b.left,y:b.bottom}])assert(inside(p,support.polygon),'unsupported natural root '+item.id);}
 for(const s of supports){const ground=grounds.find(g=>g.id===s.groundId);assert(ground);assert(onEdge(s.anchor,ground.polygon));for(const p of s.anchorEdge){assert(onEdge(p,ground.polygon));assert(inside(p,s.polygon));}assert(Math.hypot(s.anchorEdge[1].x-s.anchorEdge[0].x,s.anchorEdge[1].y-s.anchorEdge[0].y)>0,'detached point-only island');}
 const skyIds=['outskirts-v71-105','outskirts-v71-119','outskirts-v71-120','outskirts-v71-126'];
 for(const id of skyIds){const item=natural.HOMEWORLD_NATURAL_MODULES_V80.find(p=>p.id===id);assert.equal(civic.homeworldCivicWalkableV80('0',item,{halfWidth:0,halfDepth:0}),false,id+' must not grant a newly walkable shoulder');}
 assert.equal(JSON.stringify(natural.HOMEWORLD_NATURAL_MODULES_V80),before);
 assert.equal(natural.HOMEWORLD_NATURAL_ORIGINS_V80.length,374);
});

test('real scene renders tiled natural tops and native rock faces on level0 only, preserving native sprites and projected roots',()=>{
 const camera=world.homeworldCameraWorldV77({x:3960,y:5290},'0',{width:1063,height:1200});
 const props={actor:{x:3960,y:5290},levelId:'0',camera,seconds:0,activeDoorId:null,activePointId:null},html=qa.render('app/game/HomeworldWorldSceneV77.tsx',props);
 assert(html.includes('data-natural-support-solid-v85="false"'));assert(html.includes('/game/homeworld/v71/cinder-ground.png'));assert(html.includes('data-natural-rock-face-v85="true"'));assert(html.includes('data-natural-support-top-v85="true"'));assert(html.includes('data-natural-ground-anchor-v85='));
 for(const id of['outskirts-v71-119','outskirts-v71-120','outskirts-v71-126'])assert(html.includes('data-homeworld-prop-id="'+id+'"'),'existing source sprite not retained '+id);
 for(const levelId of['+1','+2','-1A','-1B','-1C'])assert(!qa.render('app/game/HomeworldWorldSceneV77.tsx',{...props,levelId}).includes('data-natural-support-top-v85'),'natural plane leaked onto '+levelId);
 assert.equal(JSON.stringify(natural.HOMEWORLD_NATURAL_MODULES_V80),before,'render changed source placements');
});
