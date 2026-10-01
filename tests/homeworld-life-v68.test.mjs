import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldLifeV68.ts']);
test('V68 city population occupies every district and stays on real walkable ground for a full routine', () => {
  assert.equal(api.HOMEWORLD_RESIDENTS_V68.length, 56);
  assert.deepEqual(new Set(api.HOMEWORLD_RESIDENTS_V68.map(r => r.districtId)), new Set(api.HOMEWORLD_DISTRICTS.map(d => d.id)));
  for (const resident of api.HOMEWORLD_RESIDENTS_V68) {
    let moved = false;
    for (let time = 0; time <= 140; time += .25) {
      const pose = api.homeworldResidentPoseV68(resident, time);
      assert(api.isHomeworldWalkable(pose), resident.id + ' crosses a wall or furniture');
      assert(pose.progress >= 0 && pose.progress <= 1);
      moved ||= pose.moving;
    }
    if (resident.path.length > 1) assert(moved);
  }
});
test('V68 furniture leaves every public door and all ten region thresholds reachable from the city spawn', () => {
  const spawn = api.createHomeworldActor();
  assert.equal(api.HOMEWORLD_PROPS.filter(p => p.id.startsWith('life-v68-')).length, 15);
  const targets = api.HOMEWORLD_BUILDINGS.map(b => [b.id, api.homeworldBuildingDoorwayV64(b).approach]);
  for (const [id, p] of Object.entries(api.HOMEWORLD_POINT_POSITIONS)) {
    if (id.startsWith('region-')) {
      const approach = [40,60,80,110].map(distance => ({x:p.x,y:p.y+distance})).find(q => api.isHomeworldWalkable(q));
      assert(approach, id + ' approach'); targets.push([id, approach]);
    }
  }
  for (const [id, p] of targets) assert.equal(api.homeworldSpatialRoute(spawn, p).status, 'reachable', id + ' remains reachable');
});
test('V68 citizen proximity and routine are deterministic and cannot replace civic services', () => {
  for (const r of api.HOMEWORLD_RESIDENTS_V68) {
    const p = api.homeworldResidentPoseV68(r, 32);
    assert.deepEqual(p, api.homeworldResidentPoseV68(r, 32));
    assert(api.nearestHomeworldResidentV68(p, 32));
    assert(api.homeworldResidentDialogueV68(r).length > 70);
  }
  assert.equal(api.nearestHomeworldResidentV68({x:-10000,y:-10000}, 0), null);
});
