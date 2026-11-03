import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
const compiled = await build({ entryPoints: ['app/game/systems/homeworldCity.ts'], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const city = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));

test('transparent native atlas padding does not fade a facade over an unobstructed hunter', () => {
  const building = city.HOMEWORLD_BUILDINGS.find(b => b.id === 'market-armory');
  assert(building?.art?.sourceRect);
  const full = city.homeworldBuildingSpritePlacementV64(building);
  const painted = city.homeworldBuildingVisibleBoundsV72(building);
  assert(painted.top > full.top, 'native top padding is excluded');
  assert(painted.width < full.width, 'native side padding is excluded');
  const blankTop = { x: building.x, y: (full.top + painted.top) / 2 / city.HOMEWORLD_GEOMETRY_V64.depthScale };
  assert(blankTop.y < building.y);
  assert.equal(city.shouldFadeHomeworldBuilding(building, blankTop), false);
  const behindFacade = { x: building.x, y: (painted.top + painted.height * .65) / city.HOMEWORLD_GEOMETRY_V64.depthScale };
  assert(behindFacade.y < building.y);
  assert.equal(city.shouldFadeHomeworldBuilding(building, behindFacade), true);
  assert.equal(city.shouldFadeHomeworldBuilding(building, { x: building.x, y: building.y + 60 }), false);
});
