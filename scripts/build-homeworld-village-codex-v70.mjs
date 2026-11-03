import fs from 'node:fs/promises';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
const api = homeworldQaModelV64(process.cwd(), ['homeworldVillageActivitiesV70.ts', 'homeworldVillageRoutesV70.ts', 'homeworldRegionsV68.ts', 'homeworldGeometryV64.ts']);
const villages = api.HOMEWORLD_REGION_IDS_V68.map(regionId => ({
  regionId, name: api.HOMEWORLD_REGIONS_V68[regionId].village,
  provenance: 'Original civilian settlement for this game; not a canonical map or a documented canonical ritual.',
  destinations: api.villageDestinationsV70(regionId),
  activities: api.HOMEWORLD_VILLAGE_ACTIVITIES_V70[regionId].map(a => ({
    ...a, actionPolicy: 'Physical front approach, session-only guided gestures, no field event or reward.',
    nativeLoadsBefore: api.villageActivityLoadsV70(a, 0), nativeLoadsAfter: api.villageActivityLoadsV70(a, 3),
    signalSamples: [0, 150, 300].map(tick => ({ tick, ...api.villageActivitySceneV70(a, tick, 0) })),
  })),
}));
await fs.writeFile('docs/homeworld-village-codex-v70.json', JSON.stringify({ version: 1, release: 'V70',
  units: 'V68 ground-world coordinates; art altitude is physical world height; screen ground y uses sin(35 degrees).',
  projection: api.HOMEWORLD_GEOMETRY_V64,
  savePolicy: 'No new checkpoint fields, moved colliders or targets. Actor remains manually controlled. Session practice is discarded on cold reload.',
  clockPolicy: 'Existing V68 tick only. Pause, atlas, local service, dialogue, suspension and storage refusal stop derived life signals.',
  counts: { villages: villages.length, civilianStations: villages.length * 4, atlasApproaches: villages.length * 18, nativeCoffrets: villages.length * 3 }, villages,
}, null, 2) + '\n');
console.log(JSON.stringify({ villages: villages.length, stations: villages.length * 4, destinations: villages.length * 18, output: 'docs/homeworld-village-codex-v70.json' }));
