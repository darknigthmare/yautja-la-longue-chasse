import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { access, readFile } from 'node:fs/promises';

const bundle=await build({entryPoints:['app/game/systems/homeworldPassageV67.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const adult={homeworld:{evidenceIds:['suspect-trophy'],expeditions:{'ash-marches':null,'glass-desert':null}}};
function traverse(initial){
 let state=initial, count=0, priorSave=initial;
 const nodes=p.HOMEWORLD_PASSAGES_V67[state.regionId].nodes;
 while(state.status==='travelling'&&count++<20000){
  const index=state.visited.at(-1)+(state.direction==='outbound'?1:-1),target=nodes[index]??nodes[state.visited.at(-1)];
  const dx=target.x-state.actor.x,dy=target.y-state.actor.y;
  const vector=Math.hypot(dx/330,dy/260), input=vector>.01?{x:dx/330/vector,y:dy/260/vector}:{};
  const next=p.stepHomeworldPassageV67(state,{...input,interact:p.homeworldPassageInteractionV67(state)===(state.direction==='outbound'?'biome':'city')});
  assert.ok(Math.hypot(next.actor.x-state.actor.x,next.actor.y-state.actor.y)<=5.501,'Every movement is physical and bounded');
  assert.ok(p.isHomeworldPassageWalkableV67(state.regionId,next.actor),'The whole body stays on real floor');
  state=next;
  if(count%90===0){assert.ok(p.canAdvanceHomeworldPassageV67(priorSave,state));state=p.normalizeHomeworldPassageV67(JSON.parse(JSON.stringify(state)));assert.ok(state,'Periodic readback preserves a valid journey');priorSave=state;}
 }
 assert.ok(count<20000,'Route did not stall at a corner or bridge');
 return state;
}
test('adult permissions preserve youth, evidence and durable Ash gates',()=>{
 assert.equal(p.canEnterHomeworldPassageV67(adult,'ash-marches').allowed,true);
 assert.equal(p.canEnterHomeworldPassageV67(adult,'glass-desert').allowed,false);
 assert.equal(p.canEnterHomeworldPassageV67({...adult,homeworld:{...adult.homeworld,evidenceIds:[]}},'ash-marches').allowed,false);
 assert.equal(p.canEnterHomeworldPassageV67({...adult,prologue:{chronicle:null}},'ash-marches').allowed,false);
 assert.equal(p.canEnterHomeworldPassageV67(adult,'not-delivered').allowed,false);
 assert.equal(p.canEnterHomeworldPassageV67({...adult,homeworld:{...adult.homeworld,expeditions:{'ash-marches':{}}}},'glass-desert').allowed,true);
});
for(const id of ['ash-marches','glass-desert'])test(id+' is genuinely traversable both ways, without a jump or teleport',()=>{
 const start=p.createHomeworldPassageV67(id,'outbound','journey-67');
 assert.ok(p.homeworldPassageLengthV67(id)>21000);
 assert.deepEqual(p.stepHomeworldPassageV67(start,{x:1},true),start);
 const reached=traverse(start);assert.equal(reached.status,'at-biome');assert.equal(reached.visited.length,10);
 assert.ok(reached.tick>3600,'More than one minute of uninterrupted actual walking');
 const back=p.beginReturnHomeworldPassageV67(reached);assert.ok(back);assert.equal(back.actor.x,p.HOMEWORLD_PASSAGES_V67[id].nodes.at(-1).x);
 assert.equal(p.canAdvanceHomeworldPassageV67(reached,back),true);
 const returned=traverse(back);assert.equal(returned.status,'at-city');assert.equal(returned.visited.length,10);
 assert.equal(p.beginReturnHomeworldPassageV67(returned),null);assert.equal(p.stepHomeworldPassageV67(returned,{x:1}),returned);
 assert.ok(p.normalizeHomeworldPassageV67(returned));
});
test('native bridge deck bounds actually replace the wider road and keep footprints inside the parapet',()=>{
 const depth=p.homeworldPassageBridgeDepthV67();assert.ok(depth>180&&depth<210);
 for(const id of ['ash-marches','glass-desert'])for(const bridge of p.HOMEWORLD_PASSAGES_V67[id].bridges){
  assert.ok(p.isHomeworldPassageWalkableV67(id,{x:bridge.x+600,y:bridge.y}));
  assert.equal(p.isHomeworldPassageWalkableV67(id,{x:bridge.x+600,y:bridge.y+depth/2-5}),false);
  assert.equal(p.homeworldPassageFloorContainsV67(id,{x:bridge.x+600,y:bridge.y+120}),false);
 }
 for(const id of ['ash-marches','glass-desert'])for(const prop of p.homeworldPassagePropsV67(id)){
  for(const x of [-prop.halfWidth,prop.halfWidth])for(const y of [-prop.halfDepth,prop.halfDepth])assert.ok(p.homeworldPassageFloorContainsV67(id,{x:prop.x+x,y:prop.y+y}),'Every native beacon base is physically supported');
  assert.equal(p.isHomeworldPassageWalkableV67(id,prop),false,'Beacons have solid footprints');
 }
});
test('malformed, future, off-floor, premature-return and regressing checkpoints never reset to a fresh trip',()=>{
 const start=p.createHomeworldPassageV67('ash-marches'),copy=structuredClone(start);
 assert.deepEqual(p.normalizeHomeworldPassageV67(start),start);assert.deepEqual(start,copy);
 for(const bad of [null,{}, {...start,version:2},{...start,status:['travelling']},{...start,direction:['outbound']},{...start,tick:NaN},{...start,actor:{...start.actor,x:12000}},{...start,visited:[0,1,2]},{...start,status:'at-biome'}])assert.equal(p.normalizeHomeworldPassageV67(bad),null);
 const moved=p.stepHomeworldPassageV67(start,{x:1});assert.equal(p.canAdvanceHomeworldPassageV67(moved,start),false);
 assert.equal(p.canAdvanceHomeworldPassageV67(start,{...moved,journeyId:'other'}),false);
 assert.equal(p.beginReturnHomeworldPassageV67(start),null);
 const back=p.createHomeworldPassageV67('ash-marches','return');
 assert.equal(p.normalizeHomeworldPassageV67({...back,actor:{...back.actor,x:320,y:1800},walked:25000,tick:10000,status:'at-city'}),null);
});
test('all new native imagery exists and source callers do not contain a city shortcut',async()=>{
 for(const path of [p.HOMEWORLD_PASSAGE_BRIDGE_V67.src,...Object.values(p.HOMEWORLD_PASSAGES_V67).map(d=>d.panorama)])await access('public'+path);
 const source=await readFile('app/game/HomeworldPassageV67.tsx','utf8');
 assert.ok(source.includes('persist(current)'));assert.ok(source.includes('onReachBiome(current.regionId)'));
 assert.ok(!source.includes('background:linear-gradient'));assert.ok(source.includes('HomeworldModularHunter'));
});
