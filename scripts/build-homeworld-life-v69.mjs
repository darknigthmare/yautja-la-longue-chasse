import fs from 'node:fs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldLifeV68.ts', 'homeworldArtV64.ts']);
for(let i=api.HOMEWORLD_PROPS.length-1;i>=0;i--) if(api.HOMEWORLD_PROPS[i].id.startsWith('life-v69-')) api.HOMEWORLD_PROPS.splice(i,1);
const roles = {
  port: ['Inspectrice des amarres', 'Porteur du retour', 'Apprentie navigatrice'],
  market: ['Tisseuse de liens', 'Peseur de matériaux', 'Messagère des villages'],
  forges: ['Ajusteur de supports', 'Gardienne des outils', 'Apprentie graveuse'],
  clans: ['Hôte des délégations', 'Aspirante du foyer', 'Porteuse des provisions'],
  memory: ['Copiste des trajets', 'Ancienne des retours', 'Apprenti archiviste'],
  terraces: ['Instructrice des appuis', 'Aspirant de la cohorte', 'Observatrice du parcours'],
  temple: ['Gardien des seuils', 'Porteuse des braises', 'Témoin des rites'],
  arenas: ['Arbitre des démonstrations', 'Visiteuse des clans', 'Élève du duel'],
  undercity: ['Réparatrice des conduits', 'Voisin des galeries', 'Porteur de lampes'],
  enforcers: ['Lectrice des rapports', 'Garde du retour', 'Courrier des postes'],
  citadel: ['Émissaire des hauts villages', 'Porteuse des réponses', 'Témoin du conseil'],
  'convoy-works': ['Vérificateur des scellés', 'Porteuse des relais', 'Apprenti convoyeur'],
  'rampart-walk': ['Guetteuse des ponts', 'Réparateur des balises', 'Courrier des corniches'],
  esplanade: ['Hôte des retrouvailles', 'Aspirante à l’écoute', 'Ancien des récits'],
};
const names = ['Kesh', 'Tha’ra', 'Vorak', 'Ish’ren', 'Sek’ta', 'Nar’esh', 'Kor’na'];
const population = [];
const occupied = api.HOMEWORLD_RESIDENTS_V68.map(r => r.path[0]);
// Reserve grounded furniture before new routines. Keep every old citizen and public doorway route clear.
const protectedPoints=[];
for(const target of [...api.HOMEWORLD_BUILDINGS.map(b=>api.homeworldBuildingDoorwayV64(b).approach),
  ...Object.entries(api.HOMEWORLD_POINT_POSITIONS).filter(([id])=>id.startsWith('region-')).map(([,p])=>[40,60,80,110].map(d=>({x:p.x,y:p.y+d})).find(q=>api.isHomeworldWalkable(q)))]) {
  if(!target) throw Error('Missing region approach');
  const route=api.homeworldSpatialRoute(api.createHomeworldActor(),target);
  if(route.status!=='reachable') throw Error('Unreachable public route');
  for(let i=1;i<route.points.length;i++) {
    const a=route.points[i-1],b=route.points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/12));
    for(let j=0;j<=n;j++) protectedPoints.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});
  }
}
for(const r of api.HOMEWORLD_RESIDENTS_V68) {
  const a=r.path[0],b=r.path.at(-1),n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/12));
  for(let j=0;j<=n;j++) protectedPoints.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});
}
const decorations=[],art=api.HOMEWORLD_PROP_ART_V64['brazier-v69'];
for(const id of ['temple','memory','citadel']) {
  const d=api.HOMEWORLD_DISTRICTS.find(d=>d.id===id);
  let found=null;
  for(let y=d.y+100;y<d.y+d.height-80 && !found;y+=55) for(let x=d.x+100;x<d.x+d.width-80;x+=55) {
    const p={x,y};
    if(!api.pointInHomeworldPolygon(p,d.polygon) || !api.isHomeworldWalkable(p,{halfWidth:78,halfDepth:45})
      || api.HOMEWORLD_BUILDINGS.some(b=>{const r=api.homeworldBuildingSpritePlacementV64(b),q=api.homeworldProjectGroundV64(p);return q.x>r.left-65&&q.x<r.left+r.width+65&&q.y>r.top-15&&q.y<r.top+r.height+90;})
      || protectedPoints.some(q=>Math.abs(q.x-x)<82 && q.y>y-105 && q.y<y+55)
      || Object.values(api.HOMEWORLD_POINT_POSITIONS).some(q=>Math.hypot(q.x-x,q.y-y)<160)) continue;
    found=p;break;
  }
  if(!found) throw Error('No safe brazier placement '+id);
  decorations.push({id:'life-v69-brazier-'+id,districtId:id,artId:'brazier-v69',...found,width:96,height:85,asset:art.src,plane:'ground',footprint:{halfWidth:48,halfDepth:25}});
}
// New routines use the final furniture collision plan.
api.HOMEWORLD_PROPS.push(...decorations);
for (const [index, district] of api.HOMEWORLD_DISTRICTS.entries()) {
  const candidates = [];
  for (let y = district.y + 85; y < district.y + district.height - 55; y += 65)
    for (let x = district.x + 85; x < district.x + district.width - 55; x += 65) {
      const p = {x, y};
      if (api.pointInHomeworldPolygon(p, district.polygon) && api.isHomeworldWalkable(p, {halfWidth: 45, halfDepth: 26})
        && !api.HOMEWORLD_BUILDINGS.some(b=>{const r=api.homeworldBuildingSpritePlacementV64(b),q=api.homeworldProjectGroundV64(p);return p.y<b.y&&q.x>r.left-35&&q.x<r.left+r.width+35&&q.y>r.top-35&&q.y<r.top+r.height+30;})
        && !Object.values(api.HOMEWORLD_POINT_POSITIONS).some(q => Math.hypot(q.x-x,q.y-y)<115)
        && !api.HOMEWORLD_BUILDINGS.some(b => Math.hypot(b.x-x,b.y+70-y)<115)) candidates.push(p);
    }
  for (let slot = 0; slot < 3; slot++) {
    const start = candidates.find((p,i) => i >= Math.floor(candidates.length*slot/3)
      && !occupied.some(q => Math.hypot(q.x-p.x,q.y-p.y)<75)
      && candidates.some(q=>Math.hypot(q.x-p.x,q.y-p.y)>=55&&Math.hypot(q.x-p.x,q.y-p.y)<=260&&api.isHomeworldRouteSegmentWalkable(p,q)));
    if (!start) throw Error('No safe citizen placement: '+district.id+' '+slot);
    const end = candidates.find(p => Math.hypot(p.x-start.x,p.y-start.y)>=55 && Math.hypot(p.x-start.x,p.y-start.y)<=260
      && api.isHomeworldRouteSegmentWalkable(start,p));
    if (!end) throw Error('No safe citizen routine: '+district.id+' '+slot);
    occupied.push(start);
    population.push({id:`resident-v69-${district.id}-${slot+1}`,districtId:district.id,
      role:roles[district.id][slot],name:names[(index*3+slot)%names.length],
      morphId:['classic','huntress','young','elder'][(index+slot)%4],path:[start,end],
      speed:28+slot*7,dwellSeconds:13+slot*5,phaseSeconds:index*4.1+slot*8.7,
      activity:slot===0?'inspection':slot===1?'transmission':'preparation'});
  }
}
fs.writeFileSync('app/game/data/homeworldLifeV69.json',JSON.stringify({version:1,decorations,population},null,2)+'\n');
console.log(JSON.stringify({newResidents:population.length,totalResidents:98,decorations:decorations.length,districts:14}));
