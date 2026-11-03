import fs from 'node:fs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldArtV64.ts']);
const { HOMEWORLD_BUILDINGS: buildings, HOMEWORLD_DISTRICTS: districts, HOMEWORLD_PROPS: props, HOMEWORLD_POINT_POSITIONS: points } = api;
for (let i = props.length - 1; i >= 0; i--) if (props[i].id.startsWith('life-v68-')) props.splice(i, 1);
const protectedRoutes = [];
for (const target of [...buildings.map(b => api.homeworldBuildingDoorwayV64(b).approach),
  ...Object.entries(points).filter(([id]) => id.startsWith('region-')).map(([,p]) =>
    [40,60,80,110].map(d => ({x:p.x,y:p.y+d})).find(q => api.isHomeworldWalkable(q)))]) {
  if (!target) continue;
  const route = api.homeworldSpatialRoute(api.createHomeworldActor(), target);
  if (route.status !== 'reachable') throw Error('Existing unreachable city target: '+JSON.stringify(target));
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i-1], b = route.points[i], n = Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12));
    for (let j = 0; j <= n; j++) protectedRoutes.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});
  }
}
// This generator is not a runtime pathfinder. Its candidates must obey the
// same body footprint, painted foundations and doors as the playable city.
const dress = [];
for (const [index, building] of buildings.entries()) {
  const arts = building.districtId === 'port' || building.districtId === 'convoy-works' ? ['chest', 'locker']
    : building.districtId === 'forges' ? ['workshop', 'chest'] : ['rock-plant', 'bench'];
  for (const [side, artId] of arts.entries()) {
    const art = api.HOMEWORLD_PROP_ART_V64[artId];
    for (const offset of [70, 110, 160, 210]) {
      const candidate = { x: building.x + (side ? 1 : -1) * (building.width / 2 + offset), y: building.y + 75 };
      const footprint = { halfWidth: art.footprintWorld.width / 2, halfDepth: art.footprintWorld.depth / 2 };
      if (!api.isHomeworldWalkable(candidate, { halfWidth: footprint.halfWidth + 35, halfDepth: footprint.halfDepth + 25 })
        || Object.values(points).some(p => Math.hypot(p.x - candidate.x, p.y - candidate.y) < 150)
        || buildings.some(b => Math.hypot(b.x - candidate.x, b.y + 70 - candidate.y) < 155)
        || protectedRoutes.some(p => Math.abs(p.x-candidate.x)<footprint.halfWidth+60 && p.y>candidate.y-footprint.halfDepth*2-50 && p.y<candidate.y+50)
        || [...props, ...dress].some(p => Math.hypot(p.x - candidate.x, p.y - candidate.y) < 145)) continue;
      dress.push({ id: `life-v68-${index}-${side}`, districtId: building.districtId, artId, ...candidate,
        width: art.alphaBounds.width * art.scaleWorldPerPixel, height: art.heightWorld,
        asset: art.src, plane: 'ground', footprint }); break;
    }
  }
}
// Include proposed furniture before checking residents. Never generate a route
// through a new planter or cargo module.
props.push(...dress);
const population = [];
const roles = {
  port: ['Porteur de cargaisons', 'Navigatrice', 'Convoyeur', 'Éclaireuse des quais'],
  market: ['Artisane', 'Courrier de clan', 'Acheteur de matériaux', 'Tailleur de parures'],
  forges: ['Apprenti de forge', 'Polisseuse', 'Porteur de minerai', 'Armurière'],
  clans: ['Émissaire', 'Gardienne du foyer', 'Aspirant', 'Ancien du clan'],
  memory: ['Lecteur des marques', 'Archiviste', 'Conservatrice', 'Messager des archives'],
};
for (const [di, district] of districts.entries()) {
  const candidates = [];
  for (let y = district.y + 70; y < district.y + district.height - 50; y += 90)
    for (let x = district.x + 65; x < district.x + district.width - 50; x += 90) {
      const p = { x, y };
      if (api.pointInHomeworldPolygon(p, district.polygon) && api.isHomeworldWalkable(p, { halfWidth: 45, halfDepth: 26 })
        && !Object.values(points).some(q => Math.hypot(q.x - x, q.y - y) < 110)
        && !buildings.some(b => Math.hypot(b.x - x, b.y + 70 - y) < 105)) candidates.push(p);
    }
  for (let j = 0; j < 4; j++) {
    const start = candidates.find((p, i) => i >= Math.floor(candidates.length * j / 4)
      && !population.some(c => Math.hypot(c.path[0].x - p.x, c.path[0].y - p.y) < 90));
    if (!start) continue;
    const end = candidates.find(p => Math.hypot(start.x - p.x, start.y - p.y) >= 110
      && Math.hypot(start.x - p.x, start.y - p.y) <= 280 && api.isHomeworldRouteSegmentWalkable(start, p));
    population.push({ id: `resident-${district.id}-${j + 1}`, districtId: district.id,
      role: (roles[district.id] ?? ['Chasseur de passage', 'Garde de patrouille', 'Émissaire de clan', 'Aspirant'])[j],
      morphId: ['classic', 'huntress', 'young', 'elder'][(di + j) % 4],
      path: end ? [start, end] : [start], speed: 34 + j * 6, dwellSeconds: 7 + (di + j) % 8,
      phaseSeconds: di * 3.1 + j * 5.3 });
  }
}
fs.writeFileSync('app/game/data/homeworldLifeV68.json', JSON.stringify({ version: 1, decorations: dress, population }, null, 2) + '\n');
console.log(JSON.stringify({ decorations: dress.length, residents: population.length, districts: [...new Set(population.map(p => p.districtId))].length }));
