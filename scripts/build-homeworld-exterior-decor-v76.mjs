import fs from 'node:fs/promises';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldGeometryV64.ts','homeworldLifeV69.ts',
  'homeworldRegionConnectionsV72.ts','homeworldArchitectureV75.ts','homeworldFurnitureV72.ts','homeworldExteriorDecorV76.ts','homeworldSpatialCodex.ts']);
const angled=new Set(['convoy-workshop','dock-control','rite-sanctum','trophy-mausoleum','rampart-watch','convoy-store']);
const modules=[],boxes=[],rejections={};
const furnitureLabels={'artisan-bench':'Établi d’entretien','clothing-rack':'Portant de tissus','sealed-jars':'Jarres scellées',
  'resin-lantern':'Lanterne de résine','meal-table':'Table commune','convoy-crates':'Caisses de desserte',
  'stone-bench':'Banc de pierre','training-gong':'Gong d’exercice'};
const reject=reason=>{rejections[reason]=(rejections[reason]??0)+1;return false;};
const expand=(b,m)=>({left:b.left-m,right:b.right+m,top:b.top-m,bottom:b.bottom+m});
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const intersects=(rect,a,b)=>{
  let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
  for(const [p,q] of [[-dx,a.x-rect.left],[dx,rect.right-a.x],[-dy,a.y-rect.top],[dy,rect.bottom-a.y]]){
    if(p===0){if(q<0)return false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;
  }return true;
};
const protectedBoxes=[...api.HOMEWORLD_BUILDINGS.map(b=>expand(angled.has(b.id)
  ?{left:b.x-440,right:b.x+440,top:b.y-470,bottom:b.y+170}:api.homeworldBuildingFootprintV64(b),26)),
  ...api.HOMEWORLD_FRONTAGE_ITEMS_V75.map(item=>expand(api.homeworldFurnitureFootprintV72(item),18)),
  ...api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.map(item=>expand(api.homeworldFurnitureFootprintV72(item),18)),
  ...api.HOMEWORLD_PROPS.filter(p=>p.plane==='ground').map(p=>{
    const w=p.footprint?.halfWidth??Math.max(18,p.width*.22),d=p.footprint?.halfDepth??Math.max(10,Math.min(24,p.height*.14));
    return expand({left:p.x-w,right:p.x+w,top:p.y-d*(p.artId?2:1),bottom:p.y+(p.artId?0:d)},26);}),
  ...api.homeworldConnectionFurnitureFootprintsV72().map(b=>expand(b,28)),
  ...api.HOMEWORLD_REGION_CONNECTIONS_V72.flatMap(api.homeworldGatewayFootprintsV72).map(b=>expand(b,28)),
  ...api.HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72.map(s=>expand({left:s.x-s.footprintWorld.width/2,
    right:s.x+s.footprintWorld.width/2,top:s.y-s.footprintWorld.depth,bottom:s.y},28)),
  ...api.HOMEWORLD_NPC_COLLIDERS.map(n=>({left:n.x-n.radiusX-42,right:n.x+n.radiusX+42,top:n.y-n.radiusY-32,bottom:n.y+n.radiusY+32})),
  ...api.HOMEWORLD_POINT_PROP_COLLIDERS.map(n=>({left:n.x-n.radiusX-36,right:n.x+n.radiusX+36,top:n.y-n.radiusY-28,bottom:n.y+n.radiusY+28})),
  ...api.HOMEWORLD_WAYMARKS.map(p=>({left:p.x-36,right:p.x+36,top:p.y-26,bottom:p.y+26})),
  ...api.HOMEWORLD_SPATIAL_SITES.map(site=>({left:site.approach.x-36,right:site.approach.x+36,top:site.approach.y-26,bottom:site.approach.y+26})),
  ...api.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>({left:r.legacySign.x-36,right:r.legacySign.x+36,
    top:r.legacySign.y+70-26,bottom:r.legacySign.y+70+26})),
  expand({left:160,right:1160,top:3800,bottom:4560},40),expand(api.HOMEWORLD_SPACEPORT_V64.pedestrian,30),
  {left:1090,right:1310,top:4190,bottom:4470}];
const doors=api.HOMEWORLD_BUILDINGS.map(b=>api.homeworldBuildingDoorwayV64(b));
// Regeneration replaces this entire batch. The isolated QA loader keeps the
// previous JSON's solid list in memory, so remove that stale list ONLY in this
// offline generator before finding baseline routes. Final tests load the newly
// written JSON afresh and retain every actual City collision without exemptions.
api.HOMEWORLD_EXTERIOR_SOLIDS_V76.splice(0);
const unavailable=[];
const criticalTargets=[...doors.map((d,index)=>({id:api.HOMEWORLD_BUILDINGS[index].id,point:d.approach})),
  ...api.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>({id:r.regionId,point:r.threshold})),
  ...api.HOMEWORLD_WAYMARKS.map(point=>({id:'waymark:'+point.id,point})),
  ...api.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>({id:'legacy-sign:'+r.regionId,
    from:{x:r.legacySign.x,y:r.legacySign.y+70},point:r.arrival}))];
const criticalRoutes=criticalTargets.map(({id,point,from=api.HOMEWORLD_SPACEPORT_V64.spawn})=>{
  const route=api.homeworldSpatialRoute(from,point);
  if(route.status==='unavailable')unavailable.push({id,from,point,fromWalkable:api.isHomeworldWalkable(from),
    walkable:api.isHomeworldWalkable(point),collision:api.homeworldCollisionAt(point)});
  return route.points;
});
if(unavailable.length)throw Error('Existing targets not reachable before decoration: '+JSON.stringify(unavailable));
const reservedPaths=[...api.HOMEWORLD_RESIDENTS_V69.map(r=>[r.path[0],r.path.at(-1)]),
  ...criticalRoutes.flatMap(points=>points.slice(1).map((p,i)=>[points[i],p])),
  ...doors.map(d=>[d.threshold,{x:d.approach.x,y:d.approach.y+120}]),
  ...api.HOMEWORLD_REGION_CONNECTIONS_V72.flatMap(r=>r.nodes.slice(1).map((p,i)=>[r.nodes[i],p])),
  ...api.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>[{x:r.legacySign.x,y:r.legacySign.y+35},{x:r.legacySign.x,y:r.legacySign.y+135}]),
  [{x:1400,y:3670},{x:1680,y:3670}], // public southern collector remains open
  [{x:3550,y:2250},{x:4120,y:2640}]];
const connectionPolygons=api.HOMEWORLD_CONNECTION_STREETS_V72.map(s=>s.polygon);
const crossingPolygon=(b,poly)=>poly.some(p=>p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom)
  ||[[b.left,b.top],[b.left,b.bottom],[b.right,b.top],[b.right,b.bottom]].some(([x,y])=>api.pointInHomeworldPolygon({x,y},poly))
  ||poly.some((p,i)=>intersects(b,p,poly[(i+1)%poly.length]));
const themes={
  port:{function:'logistique-quai',label:'Desserte du quai',arts:['logistics-container-rack','convoy-crates','sealed-jars','resin-lantern','stone-bench']},
  market:{function:'echanges-civils',label:'Cour des échanges',arts:['merchant-canopy-diagonal','clothing-rack','sealed-jars','logistics-container-rack','mineral-planter-left']},
  forges:{function:'outillage-civil',label:'Cour des artisans',arts:['artisan-bench','logistics-container-rack','sealed-jars','convoy-crates','resin-lantern']},
  undercity:{function:'halte-galeries',label:'Halte de la galerie',arts:['terrace-bench-right','sealed-jars','resin-lantern','meal-table','mineral-planter-left']},
  esplanade:{function:'repos-public',label:'Repos de l’esplanade',arts:['terrace-bench-right','mineral-planter-left','resin-lantern','stone-bench','sealed-jars']},
  terraces:{function:'terrasse-exercice',label:'Abords des terrasses',arts:['terrace-bench-right','mineral-planter-left','training-gong','sealed-jars','resin-lantern']},
  clans:{function:'halte-delegations',label:'Halte des délégations',arts:['meal-table','terrace-bench-right','mineral-planter-left','sealed-jars','clothing-rack']},
  enforcers:{function:'service-bastion',label:'Desserte du bastion',arts:['logistics-container-rack','stone-bench','sealed-jars','resin-lantern','convoy-crates']},
  memory:{function:'jardin-memoire',label:'Jardin des marques',arts:['mineral-planter-left','terrace-bench-right','stone-bench','resin-lantern','sealed-jars']},
  arenas:{function:'halte-cercle',label:'Halte du cercle',arts:['terrace-bench-right','sealed-jars','resin-lantern','training-gong','mineral-planter-left']},
  temple:{function:'jardin-rites',label:'Jardin des rites',arts:['mineral-planter-left','resin-lantern','terrace-bench-right','stone-bench','sealed-jars']},
  citadel:{function:'halte-audience',label:'Halte de l’audience',arts:['terrace-bench-right','mineral-planter-left','resin-lantern','stone-bench','meal-table']},
  'convoy-works':{function:'logistique-convoi',label:'Cour logistique',arts:['logistics-container-rack','convoy-crates','artisan-bench','sealed-jars','merchant-canopy-diagonal']},
  'rampart-walk':{function:'repos-remparts',label:'Repos des remparts',arts:['terrace-bench-right','mineral-planter-left','resin-lantern','stone-bench','sealed-jars']},
};
// These authored neighbourhood pockets are tested in this order. Their local
// fixture composition differs by function; no random seed or runtime scatter.
const pockets={port:[[.18,.8],[.16,.16],[.75,.15],[.68,.75]],market:[[.22,.4],[.8,.76],[.84,.3],[.37,.84]],
  forges:[[.3,.75],[.78,.5],[.15,.65],[.62,.27]],undercity:[[.26,.3],[.58,.77],[.81,.55],[.11,.65]],
  esplanade:[[.84,.65],[.5,.88],[.16,.16],[.77,.36]],terraces:[[.8,.6],[.36,.75],[.4,.2],[.67,.29]],
  clans:[[.73,.25],[.25,.67],[.78,.83],[.5,.47]],enforcers:[[.84,.4],[.19,.18],[.76,.8],[.33,.7]],
  memory:[[.26,.2],[.79,.33],[.83,.76],[.3,.64]],arenas:[[.81,.22],[.23,.62],[.83,.63],[.5,.79]],
  temple:[[.28,.2],[.74,.29],[.78,.7],[.49,.9]],citadel:[[.25,.2],[.81,.23],[.85,.58],[.54,.82]],
  'convoy-works':[[.22,.81],[.78,.52],[.65,.9],[.26,.18]],'rampart-walk':[[.29,.82],[.77,.36],[.24,.21],[.64,.61]]};
const offsets=[[0,0],[-130,70],[145,50],[-80,-140],[105,-140],[-240,35],[255,15],[-200,-130],[220,-100],
  [-75,180],[105,200],[-300,160],[310,160],[-180,290],[205,290],[0,-270],[-330,-210],[340,-200]];
function accept(d,artId,x,y,index){
  const theme=themes[d.id],art=api.HOMEWORLD_EXTERIOR_ART_V76[artId],isNew=!!art.nativeGroundSupport;
  const scale=isNew?(.9+[0,.1,-.05][index%3]):[.8,.9,1][index%3];
  const building=api.HOMEWORLD_BUILDINGS.filter(b=>b.districtId===d.id).toSorted((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
  const item={id:'exterior-v76-'+String(modules.length+1).padStart(3,'0'),artId,x:Math.round(x),y:Math.round(y),scale,
    districtId:d.id,groupId:'exterior:'+d.id,function:theme.function,label:theme.label+' · '+(art.label??furnitureLabels[artId]??artId),
    associatedBuildingId:building?.id??null,solid:true};
  const b=api.homeworldExteriorFootprintV76(item);
  if(!api.pointInHomeworldPolygon({x:item.x,y:item.y-10},d.polygon))return reject('outside-district');
  const samples=[...b.polygon,{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2}];
  if(samples.some(p=>!api.isHomeworldTerrainWalkable(p,{halfWidth:10,halfDepth:8})))return reject('terrain');
  if(protectedBoxes.some(r=>overlap(b,r)))return reject('reserved-volume');
  if(boxes.some(r=>overlap(expand(b,28),r)))return reject('fixture-spacing');
  if(reservedPaths.some(([a,z])=>intersects(expand(b,45),a,z)))return reject('critical-route');
  if(connectionPolygons.some(poly=>crossingPolygon(expand(b,30),poly)))return reject('regional-corridor');
  if(samples.some(p=>{const hit=api.homeworldCollisionAt(p,{halfWidth:12,halfDepth:8});return hit&&!hit.id.startsWith('exterior-v76-');}))return reject('existing-collision');
  modules.push(item);boxes.push(b);return true;
}
// Five meaningful fixtures in each of fourteen districts, with a fallback to
// finer authored offsets instead of squeezing objects into excluded reserves.
const slots=new Map();
for(const d of api.HOMEWORLD_DISTRICTS){
  const candidates=[];
  for(const [px,py]of pockets[d.id])for(const [ox,oy]of offsets)candidates.push({x:d.x+d.width*px+ox,y:d.y+d.height*py+oy,distance:-1});
  const fine=[];
  for(let y=d.y+65;y<d.y+d.height-25;y+=35)for(let x=d.x+50;x<d.x+d.width-25;x+=35){
    const distance=Math.min(...pockets[d.id].map(([px,py])=>Math.hypot(x-d.x-d.width*px,y-d.y-d.height*py)));
    fine.push({x,y,distance});
  }
  fine.sort((a,b)=>a.distance-b.distance||a.y-b.y||a.x-b.x);slots.set(d.id,[...candidates,...fine]);
  for(const [index,artId]of themes[d.id].arts.entries()){
    for(const c of slots.get(d.id))if(accept(d,artId,c.x,c.y,index))break;
  }
}
// Where a large planter or bench cannot fit, use an appropriate small fixture
// rather than silently reducing clearance or changing a resident's route.
for(let round=0;round<4&&modules.length<70;round++)for(const d of api.HOMEWORLD_DISTRICTS){
  if(modules.length===70)break;
  const counts=modules.filter(m=>m.districtId===d.id).length;if(counts>=8)continue;
  const fallback=round%2===0?'resin-lantern':'sealed-jars';
  for(const c of slots.get(d.id))if(accept(d,fallback,c.x,c.y,counts))break;
}
if(modules.length!==70)throw Error('Only '+modules.length+' safe fixtures. '+JSON.stringify(rejections));
const ornaments=[['memory-vault',-185],['training-hall',180],['clan-lodge',-180],['throne-audience',195]];
for(const[buildingId,offset]of ornaments){const b=api.HOMEWORLD_BUILDINGS.find(b=>b.id===buildingId);
  modules.push({id:'exterior-v76-ornament:'+buildingId,artId:'clan-banner',x:b.x+offset,y:b.y+12,scale:.65,
    districtId:b.districtId,groupId:'facade:'+buildingId,function:'tissu-clan-mural',label:'Tissu de clan · '+b.label,
    associatedBuildingId:buildingId,solid:false,elevation:92});
}
await fs.writeFile('app/game/data/homeworldExteriorDecorV76.json',JSON.stringify({version:76,
  placement:'authored-functional-city-pockets-with-clearance',clearanceWorld:45,
  sixArchitectureReserve:{halfWidth:440,behind:470,inFront:170,extraMargin:26},modules},null,2)+'\n');
console.log(JSON.stringify({modules:modules.length,solid:modules.filter(x=>x.solid).length,
  nativeNew:modules.filter(x=>api.HOMEWORLD_EXTERIOR_ART_V76[x.artId].nativeGroundSupport).length,
  perDistrict:Object.fromEntries(api.HOMEWORLD_DISTRICTS.map(d=>[d.id,modules.filter(m=>m.districtId===d.id).length])),rejections}));

