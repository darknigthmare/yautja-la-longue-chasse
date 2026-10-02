import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldLifeV69.ts']);
test('V69 adds safe distinct residents in every district without replacing old residents', () => {
  assert.equal(api.HOMEWORLD_RESIDENTS_V69.length,98);
  assert.equal(api.HOMEWORLD_NEW_RESIDENTS_V69.length,42);
  assert.equal(new Set(api.HOMEWORLD_RESIDENTS_V69.map(r=>r.id)).size,98);
  for(const d of api.HOMEWORLD_DISTRICTS) assert.equal(api.HOMEWORLD_NEW_RESIDENTS_V69.filter(r=>r.districtId===d.id).length,3);
  for(const r of api.HOMEWORLD_RESIDENTS_V69) {
    // A time sample can jump over a narrow prop corner. Check the entire authored
    // segment as well, independent of the resident's speed and starting phase.
    for(let segment=1;segment<r.path.length;segment++) {
      const from=r.path[segment-1],to=r.path[segment],steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/.5));
      for(let i=0;i<=steps;i++) {
        const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};
        assert(api.isHomeworldWalkable(p),r.id+' crosses a solid between routine time samples');
      }
    }
    let moved = false;
    for(let s=0;s<240;s+=.25) {
      const p=api.homeworldResidentPoseV69(r,s);
      assert(api.isHomeworldWalkable(p),r.id+' crosses a wall or prop at '+s);
      moved ||= p.moving;
    }
    if(r.path.length>1) assert(moved,r.id+' has a real route');
    if(r.id.startsWith('resident-v69-')) assert.equal(r.path.length,2,'new residents have a two-point routine');
  }
});
test('V69 daily activity and dialogues change with the scene clock and all citizens can be met', () => {
  for(const r of api.HOMEWORLD_NEW_RESIDENTS_V69) {
    const messages=new Set([0,35,70].map(s=>api.homeworldResidentDialogueV69(r,s)));
    assert.equal(messages.size,3,r.id+' activity is not three identical messages');
    for(const s of [0,20,60]) {
      const p=api.homeworldResidentPoseV69(r,s),near=api.nearestHomeworldResidentV69(p,s);
      assert(near);assert(Math.hypot(api.homeworldResidentPoseV69(near,s).x-p.x,api.homeworldResidentPoseV69(near,s).y-p.y)<82);
      assert.deepEqual(api.homeworldResidentPoseV69(r,s),p,'frozen scene clock leaves pose unchanged');
    }
  }
  assert.equal(api.nearestHomeworldResidentV69({x:-10000,y:-10000},2),null);
});
