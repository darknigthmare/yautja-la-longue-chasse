import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/homeworldRegionsV68'; export * from './app/game/systems/homeworldGeometryV64'; export * from './app/game/systems/homeworldArtV64';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const codex = {
  version: 1, release: 'V68', units: 'unprojected physical ground coordinates', artPolicy: 'Existing native source pixels retained. Original fan-game architecture and ecology; no canonical 1:1 geography is asserted.',
  projection: api.HOMEWORLD_GEOMETRY_V64, villageWorld: api.HOMEWORLD_VILLAGE_WORLD_V68, villagePerimeter: api.HOMEWORLD_VILLAGE_PERIMETER_V68, fieldPerimeter: api.HOMEWORLD_REGION_FIELD_PERIMETER_V68,
  traceSites: api.HOMEWORLD_REGION_TRACES_V68, fieldPath: api.HOMEWORLD_REGION_TRAIL_V68, environmentalHazard: api.HOMEWORLD_REGION_HAZARD_V68, wardPosts: api.REGION_WARD_POSTS_V68,
  interior: api.HOMEWORLD_REGION_INTERIOR_V68,
  communities: api.HOMEWORLD_REGION_IDS_V68.map(id => {
    const d = api.HOMEWORLD_REGIONS_V68[id];
    return {
      id, name: d.name, village: d.village, clan: d.clan, panorama: d.panorama, accent: d.accent, groundMaterial: d.groundColor,
      route: d.route, lengthMetres: api.homeworldRegionRouteMetresV68(id), bridges: api.regionBridgesV68(id),
      buildings: d.buildings.map(b => ({ id: b.id, label: b.label, role: b.role, position: { x: b.x, y: b.y }, artId: b.artId, nativeArt: b.art, projectedImage: api.homeworldBuildingSpritePlacementV64(b), footprint: api.homeworldBuildingFootprintV64(b), doorway: api.homeworldBuildingDoorwayV64(b), depthOrder: Math.round(b.y), interiorFurniture: api.homeworldRegionInteriorPropsV68(b.id).map(p => ({ ...p, nativeArt: api.HOMEWORLD_PROP_ART_V64[p.artId], footCollision: { left: p.x - api.HOMEWORLD_PROP_ART_V64[p.artId].footprintWorld.width / 2, right: p.x + api.HOMEWORLD_PROP_ART_V64[p.artId].footprintWorld.width / 2, top: p.y - api.HOMEWORLD_PROP_ART_V64[p.artId].footprintWorld.depth, bottom: p.y } })) })),
      props: d.props.map(p => ({ id: p.id, artId: p.artId, position: { x: p.x, y: p.y }, projectedAnchor: api.homeworldProjectGroundV64(p), nativeArt: api.HOMEWORLD_PROP_ART_V64[p.artId], depthOrder: Math.round(p.y) })),
      residents: d.residents.map(n => ({ ...n, projectedAnchor: api.homeworldProjectGroundV64(n), depthOrder: Math.round(n.y), motionPolicy: n.route.length > 1 ? 'Physical local patrol with native modular body and restrained dread movement; no new full walking atlas claimed.' : 'Fixed service position with a physical feet collider.' })),
      fauna: api.REGION_FAUNA_ART_V68[id] ?? null,
      fieldActivities: { primary: api.REGION_TRACK_IDS_V68.includes(id) ? 'track' : 'survey', secondary: api.REGION_CHALLENGE_IDS_V68.includes(id) ? 'challenge' : api.REGION_WARD_IDS_V68.includes(id) ? 'ward' : 'recover' },
    };
  }),
  limitations: ['Five recovered core-community outlines adapted to the ten existing Homeworld region IDs.', 'Twenty-five ordinary subzones and fifteen Elite territories from the recovered outline remain distinct undelivered work.', 'Native architecture, fauna sheets and landscape assets are reused; no new OpenAI bitmap was generated for V68 villages.', 'Gameplay evidence and production-browser verification are separate release gates.'],
};
await writeFile('docs/v68-homeworld-region-placement-codex.json', JSON.stringify(codex, null, 2) + '\n');
console.log(JSON.stringify({ villages: codex.communities.length, buildings: codex.communities.reduce((n, c) => n + c.buildings.length, 0), residents: codex.communities.reduce((n, c) => n + c.residents.length, 0), output: 'docs/v68-homeworld-region-placement-codex.json' }));
