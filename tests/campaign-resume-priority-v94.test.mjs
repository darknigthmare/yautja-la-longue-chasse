import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {campaignResumePriorityV94 as route} from '../app/game/systems/campaignResumePriorityV94.ts';

const locations = ['new-game','prologue','youth-training','deck','homeworld','mission','game-reserve'];
for (const location of locations) for (const history of ['region','passage','both']) {
  test(`terminal ${history} arrival respects checkpoint ${location}`, () => {
    const input = {location,reserveAvailable:false,
      region:history!=='passage'?{status:'at-city'}:null,
      passage:history!=='region'?{status:'at-city',regionId:'ash-marches'}:null};
    const before=JSON.stringify(input);
    assert.equal(route(input),location==='homeworld'?'homeworld':null);
    assert.equal(JSON.stringify(input),before);
  });
}
test('a reserve checkpoint remains eligible despite terminal city history',()=>{
  assert.equal(route({location:'game-reserve',reserveAvailable:true,region:{status:'at-city'}}),'game-reserve');
});
test('reserve data alone cannot pull a ship checkpoint into the reserve',()=>{
  assert.equal(route({location:'deck',reserveAvailable:true}),null);
});
test('unfinished regional travel retains precedence over its departure checkpoint',()=>{
  assert.equal(route({location:'homeworld',region:{status:'outbound'},reserveAvailable:false}),'homeworld-region-v68');
});
test('unfinished passage remains resumable',()=>{
  assert.equal(route({location:'homeworld',passage:{status:'returning',regionId:'ash-marches'},reserveAvailable:false}),'homeworld-passage-v67');
});
test('arrival at the ash biome restores the proper expedition',()=>{
  assert.equal(route({location:'homeworld',passage:{status:'at-biome',regionId:'ash-marches'},reserveAvailable:false}),'homeworld-expedition');
});
test('arrival at the glass biome restores the other expedition',()=>{
  assert.equal(route({location:'homeworld',passage:{status:'at-biome',regionId:'glass-desert'},reserveAvailable:false}),'glass-desert-expedition');
});
test('an active region is not cancelled by a completed older passage',()=>{
  assert.equal(route({location:'homeworld',region:{status:'outbound'},passage:{status:'at-city',regionId:'ash-marches'},reserveAvailable:false}),'homeworld-region-v68');
});
test('an empty history yields to the existing caller routing',()=>{
  for(const location of locations)assert.equal(route({location,reserveAvailable:false}),null);
});
test('the production wrapper delegates only after all youth chapter guards',()=>{
  const source=readFileSync(new URL('../app/game/systems/campaignWorldResumeV70.ts',import.meta.url),'utf8');
  const delegate=source.indexOf('return campaignResumePriorityV94(');assert.ok(delegate>0);
  for(const field of ['save.prologue','save.youthTraining','save.soloV66','save.soloV67','save.soloV68','save.soloV69','save.soloV70','save.soloV90'])assert.ok(source.indexOf(field)<delegate,field);
  assert.match(source,/reserveAvailable: Boolean\(save\.gameReserveV66 && !save\.prologue\)/);
});
