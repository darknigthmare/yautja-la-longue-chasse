/** Tests of QA keyboard guidance against the unchanged real driving simulation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mobilitySourceLoader} from './mobility/load-source.mjs';
import {MOBILITY_QA_ROUTE, mobilityQaGuidance} from '../scripts/mobility-qa-driver.mjs';
const load = mobilitySourceLoader();
const {createMobilityCourse, stepMobilityCourse, mobilityCoursePassed} = load('app/game/systems/mobility/course.ts');
const levels = {drive:0, armor:0, cargo:0, cooling:0};
function drive(sampleSteps, initial = createMobilityCourse(), initialStage = 0) {
  let state = initial, stage = initialStage;
  for(let observation=0;observation<1800;observation++) {
    const g = mobilityQaGuidance(state, stage);
    if(g.advance) {
      if(stage === 1) { if(state.cargoKg === 25) stage++; }
      else if(stage === 5) { if(state.cargoDelivered) return state; }
      else stage++;
    }
    const {throttle, steer, brake, boost, interact} = g;
    for(let i=0;i<sampleSteps;i++) state = stepMobilityCourse(state, {throttle,steer,brake,boost,interact}, 'scout_grav_sled', levels);
  }
  throw Error('Route failed: '+JSON.stringify({stage,state}));
}
for(const interval of [3,4,5,6]) test(`QA course completes using real input steps, observation every ${interval} ticks`,()=>{
  const s=drive(interval);assert.ok(mobilityCoursePassed(s));assert.equal(s.impacts,0);
  assert.ok(s.tick<9000);assert.ok(s.energy<100);assert.ok(s.distance>2000);
});
test('QA steering corrects the exact failed run observation rather than holding the wall',()=>{
  const state={...createMobilityCourse(), x:739.0575,y:18.0001,heading:-3.11906,speed:0,tick:1307,checkpoint:2,cargoKg:25};
  const g=mobilityQaGuidance(state,3);assert.equal(g.steer,-1);
  const completed=drive(4,state,3);assert.ok(mobilityCoursePassed(completed));
});
test('QA guidance is read-only and preserves real physical clearance',()=>{
  const s=createMobilityCourse(),before=JSON.stringify(s);mobilityQaGuidance(s,0);assert.equal(JSON.stringify(s),before);
  assert.ok(MOBILITY_QA_ROUTE.every(([,y])=>y>=30&&y<=580));
  assert.throws(()=>mobilityQaGuidance({...s,x:NaN},0));
});
