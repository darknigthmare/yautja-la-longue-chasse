import fs from 'node:fs/promises';
import { build } from 'esbuild';
const compiled = await build({ stdin: { contents: `
export * from './app/game/systems/homeworldAtlasRoutesV70';
export * from './app/game/systems/homeworldVillageRoutesV70';
export * from './app/game/systems/homeworldVillageActivitiesV70';
export * from './app/game/systems/firstHuntSoloV70';
export * from './app/game/templeModularArtV70';
`, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const p = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const villages = p.HOMEWORLD_ATLAS_ROUTES_V70.map(route => ({
  regionId: route.regionId, village: route.village, cityThreshold: route.approach,
  corridorMetres: route.corridorMetres,
  destinations: p.villageDestinationsV70(route.regionId),
  activities: p.HOMEWORLD_VILLAGE_ACTIVITIES_V70[route.regionId],
}));
const temple = p.SOLO_V70_ROOMS.map((room, roomIndex) => ({
  id: roomIndex, name: room.name, level: room.level,
  localFloor: p.SOLO_V70_GROUND, localWidth: p.SOLO_V70_WIDTH,
  configurations: [1, 2, 3].map(configuration => {
    const state = { ...p.createSoloV70State(), room: roomIndex, configuration };
    return { configuration, leftDoor: p.soloV70Portal(roomIndex, 'left', configuration),
      rightDoor: p.soloV70Portal(roomIndex, 'right', configuration),
      supportSurfaces: p.soloV70Platforms(state),
      ...(roomIndex === 5 ? { raisedSupportSurfaces: p.soloV70Platforms({ ...state, liftTicks: 100 }) } : {}),
    };
  }),
}));
const codex = {
  schemaVersion: 1, contentVersion: 'V70', generatedFromRuntime: true,
  loreStatus: 'original-clan-adaptation-not-canonical-1-to-1',
  coordinates: { cityAndVillage: 'Existing orthographic-south-35 ground coordinates; renderer projects depth, actor footprint stays unchanged.', temple: 'Local 2D room coordinates; physical support surfaces and actual portal endpoints.' },
  safety: 'Atlas routes guide manual walking, no teleports or unlocks. Village workshop outcomes exist only in session and do not mint inventory, contract receipts or rewards. Temple opening is not the completed Blooded rite.',
  routes: p.HOMEWORLD_ATLAS_ROUTES_V70, villages, temple,
  nativeTempleArt: { atlas: p.TEMPLE_MODULAR_ATLAS_V70, modules: p.TEMPLE_MODULAR_ART_V70 },
};
await fs.writeFile('docs/homeworld-navigation-codex-v70.json', JSON.stringify(codex, null, 2));
console.log(JSON.stringify({ routes: villages.length, destinations: villages.reduce((sum, v) => sum + v.destinations.length, 0), activities: villages.reduce((sum, v) => sum + v.activities.length, 0), templeRooms: temple.length, templeArtModules: Object.keys(p.TEMPLE_MODULAR_ART_V70).length }));
