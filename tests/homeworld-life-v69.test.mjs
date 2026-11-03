import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts','homeworldLifeV69.ts','homeworldWorldV77.ts','homeworldCivicWorldV80.ts','homeworldCivilianRoutinesV84.ts']);
// Keep checking V69's identities and additions against the real mapped routes,
// not the archived single-floor plan predating the native V81 foundations.
const residents = api.HOMEWORLD_RESIDENTS_V69.map(original => {
  const current = api.HOMEWORLD_RESIDENTS_V77.find(resident => resident.id === original.id);
  assert(current, original.id + ' remains in the mounted population');
  for (const field of ['districtId', 'role', 'morphId', 'speed', 'name', 'activity']) assert.equal(current[field], original[field]);
  return current;
});
const additions = residents.filter(resident => api.HOMEWORLD_NEW_RESIDENTS_V69.some(original => original.id === resident.id));
test('V69 adds safe distinct residents in every district without replacing old residents', () => {
  assert.equal(api.HOMEWORLD_RESIDENTS_V69.length,98);
  assert.equal(api.HOMEWORLD_NEW_RESIDENTS_V69.length,42);
  assert.equal(residents.length,98);
  assert.equal(additions.length,42);
  assert.equal(new Set(residents.map(r=>r.id)).size,98);
  for(const d of api.HOMEWORLD_DISTRICTS_V77) assert.equal(additions.filter(r=>r.districtId===d.id).length,3);
  for(const r of residents) {
    // A time sample can jump over a narrow prop corner. Check the entire authored
    // segment as well, independent of the resident's speed and starting phase.
    for(let segment=1;segment<r.path.length;segment++) {
      const from=r.path[segment-1],to=r.path[segment],steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/.5));
      for(let i=0;i<=steps;i++) {
        const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};
        assert(api.homeworldCivicWalkableV80(r.levelId,p),r.id+' crosses a solid between routine time samples on floor '+r.levelId);
      }
    }
    const routine=api.homeworldCivilianRoutineV84(r),distance=r.path.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point.x-r.path[index].x,point.y-r.path[index].y),0);
    const cycle=distance/r.speed*2+routine.endHaltSeconds+routine.startHaltSeconds;
    let moved = false;
    for(let s=0;s<Math.max(240,cycle);s+=.25) {
      const p=api.homeworldResidentPoseV77(r,s);
      assert(api.homeworldCivicWalkableV80(r.levelId,p),r.id+' crosses a wall or prop at '+s+' on floor '+r.levelId);
      moved ||= p.moving;
    }
    if(r.path.length>1) assert(moved,r.id+' has a real route');
    if(r.id.startsWith('resident-v69-')) assert.equal(r.path.length,2,'new residents retain a two-point routine');
  }
});
test('V69 daily activity and dialogues change with the scene clock and all citizens can be met', () => {
  for(const r of additions) {
    const messages=new Set([0,35,70].map(s=>api.homeworldResidentDialogueV69(r,s)));
    assert.equal(messages.size,3,r.id+' activity is not three identical messages');
    for(const s of [0,20,60]) {
      const p=api.homeworldResidentPoseV77(r,s),near=api.nearestHomeworldResidentV77(r.levelId,p,s);
      assert(near,r.id+' can be met on its actual floor');assert.equal(near.levelId,r.levelId);
      assert(Math.hypot(api.homeworldResidentPoseV77(near,s).x-p.x,api.homeworldResidentPoseV77(near,s).y-p.y)<100);
      assert.deepEqual(api.homeworldResidentPoseV77(r,s),p,'frozen scene clock leaves pose unchanged');
    }
  }
  assert.equal(api.nearestHomeworldResidentV77('0',{x:-10000,y:-10000},2),null);
});
