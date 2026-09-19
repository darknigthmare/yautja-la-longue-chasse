import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import sharp from 'sharp';
const bundled=await build({stdin:{contents:[
  'export * from "./app/game/systems/pitCombat";',
  'export * from "./app/game/systems/pitReplay";',
  'export * from "./app/game/systems/pitStageJourney";',
  'export {resetPitTrainingPositions} from "./app/game/systems/pitTraining";',
  'export * from "./app/game/pitArenaRendering";',
  'export {resolvePitArenaProductionKit} from "./app/game/pitArenaProduction";',
].join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const options={mode:'training',arenaId:p.PIT_RESERVE_GATE,stageJourney:p.PIT_RESERVE_JOURNEY};
const create=(extra={})=>p.createPitCombatState('jungle-hunter','city-hunter',{...options,...extra});
function corner(side=1,extra={}){
  const state=create(extra);
  state.fighters[0].x=side===1?800:160;state.fighters[1].x=side===1?862:98;
  state.fighters[0].facing=side;state.fighters[1].facing=-side;return state;
}
function project(initial,defenderInput){
  let state=p.stepPitCombat(initial,[{throw:true},{}]), events=[...state.events], captured=false;const states=[structuredClone(state)];
  for(let i=0;i<55;i++){
    const input=state.pendingThrow&&defenderInput&&!captured?defenderInput:{};
    if(state.pendingThrow)captured=true;
    state=p.stepPitCombat(state,[{},input]);events.push(...state.events);states.push(structuredClone(state));
  }
  return {state,events,states};
}
test('neutral default has no journey and the opt-in rule is restricted to the reserve gate',()=>{
  const state=p.createPitCombatState('jungle-hunter','city-hunter',{arenaId:p.PIT_RESERVE_GATE});
  assert.equal(state.stageJourney,undefined);assert.deepEqual(state.rules,{mode:'match'});
  assert.throws(()=>create({arenaId:'the-pit'}));
  assert.throws(()=>create({stageJourney:'invented'}));
  assert.deepEqual(p.pitStageJourneyArtIds(p.PIT_RESERVE_GATE,p.PIT_RESERVE_JOURNEY),[p.PIT_RESERVE_GATE,p.PIT_RESERVE_COURT]);
});
test('a confirmed projection at either limit moves both slots atomically without additional damage or resource gain',()=>{
  for(const side of [-1,1]){
    const original=corner(side),neutral=structuredClone(original);delete neutral.stageJourney;delete neutral.rules.stageJourney;
    const before=p.serializePitCombat(original),result=project(original),control=project(neutral);
    assert.equal(p.serializePitCombat(original),before,'input state is immutable');
    assert.equal(result.state.stageJourney.sector,'court');assert.equal(result.state.stageJourney.exitSide,side);
    assert.deepEqual(result.state.fighters.map(f=>f.x),side===1?[300,660]:[660,300]);
    assert.equal(result.events.filter(e=>e.type==='stage-transfer').length,1);
    const committed=result.states.find(s=>s.events.some(e=>e.type==='stage-transfer')),neutralSameTick=control.states.find(s=>s.frame===committed.frame);
    for(const slot of [0,1])for(const key of ['health','traque','roundsWon','stunFrames','knockdownFrames'])assert.equal(committed.fighters[slot][key],neutralSameTick.fighters[slot][key],key);
    assert(result.state.fighters.every(f=>f.grounded&&f.y===0));
    assert.equal(p.pitStageSceneArena(result.state),p.PIT_RESERVE_COURT);
    assert.equal(result.state.arenaId,p.PIT_RESERVE_GATE,'match identity never becomes the art kit identity');
    assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(result.state)),result.state);
  }
});
test('capture, throw-tech, whiff, block, mid-stage throw and Traque combo-break never trigger a transfer',()=>{
  const capture=corner();let s=p.stepPitCombat(capture,[{throw:true},{}]);
  for(let i=0;i<30&&!s.pendingThrow;i++)s=p.stepPitCombat(s,[{},{}]);
  assert(s.pendingThrow);assert.equal(s.stageJourney.sector,'sas');
  const tech=project(corner(),{throw:true});assert(tech.events.some(e=>e.type==='throw-tech'));assert.equal(tech.state.stageJourney.sector,'sas');
  const whiff=corner();whiff.fighters[0].x=200;assert.equal(project(whiff).state.stageJourney.sector,'sas');
  const middle=corner();middle.fighters[0].x=420;middle.fighters[1].x=482;assert.equal(project(middle).state.stageJourney.sector,'sas');
  s=corner();s=p.stepPitCombat(s,[{attack:'heavy'},{guardHigh:true}]);let blocks=0;
  for(let i=0;i<60;i++){s=p.stepPitCombat(s,[{},{guardHigh:true}]);blocks+=s.events.filter(e=>e.type==='block').length;}
  assert(blocks>0);assert.equal(s.stageJourney.sector,'sas');
  s=corner();Object.assign(s.fighters[0],{phase:'hitstun',stunFrames:30,comboHitsReceived:2,comboLastHitFrame:0,traque:p.PIT_RUPTURE_COST});
  s=p.stepPitCombat(s,[{resource:true},{}]);assert(s.events.some(e=>e.type==='rupture'));assert.equal(s.stageJourney.sector,'sas');
});
test('KO and timeout win over a pending passage, and each new round resets to the sas',()=>{
  const ko=corner(1,{mode:'match'});ko.fighters[1].health=1;assert.equal(project(ko).state.stageJourney.sector,'sas');
  let timeout=corner(1,{mode:'match'});timeout=p.stepPitCombat(timeout,[{throw:true},{}]);
  for(let i=0;i<30&&!timeout.pendingThrow;i++)timeout=p.stepPitCombat(timeout,[{},{}]);
  assert(timeout.pendingThrow);timeout.roundFramesRemaining=1;timeout=p.stepPitCombat(timeout,[{},{}]);
  assert.notEqual(timeout.phase,'round');assert.equal(timeout.stageJourney.sector,'sas');
  let completed=project(corner(1,{mode:'match'})).state;assert.equal(completed.stageJourney.sector,'court');
  completed.roundFramesRemaining=1;completed=p.stepPitCombat(completed,[{},{}]);
  for(let i=0;i<p.PIT_ROUND_TRANSITION_FRAMES;i++)completed=p.stepPitCombat(completed,[{},{}]);
  assert.equal(completed.round,2);assert.equal(completed.stageJourney.sector,'sas');assert.equal(completed.stageJourney.transferFrame,null);
});
test('rematch and free-training reset clear the route state and retain the explicit rule',()=>{
  const state=project(corner()).state;
  for(const reset of [p.rematchPitCombat,p.resetPitTrainingPositions]){
    const next=reset(state);assert.equal(next.stageJourney.sector,'sas');assert.equal(next.rules.stageJourney,p.PIT_RESERVE_JOURNEY);
    assert.deepEqual(next.fighters.map(f=>f.x),[300,660]);assert.equal(next.frame,0);
  }
});
test('the same public inputs reproduce the route, checksum and scene; old V5 stays neutral',async()=>{
  const legacy=JSON.parse(await fs.readFile(new URL('./fixtures/pit-replay-v5-reserve-throw.json',import.meta.url),'utf8'));
  assert.equal(legacy.engineVersion,5);assert.equal(legacy.metadata.checksum,'fe79febd');
  const restored=p.normalizePitReplay(legacy);assert(restored);assert.equal(restored.metadata.checksum,legacy.metadata.checksum);
  assert.equal(p.playPitReplay(restored).stageJourney,undefined);
  const reader=p.createPitReplayReader(restored),inputs=[];while(!reader.done)inputs.push(reader.next().value.inputs);
  const replay=p.recordPitReplay(inputs,{fighters:legacy.fighters,arenaId:p.PIT_RESERVE_GATE,rules:{mode:'training',stageJourney:p.PIT_RESERVE_JOURNEY}});
  assert.equal(replay.engineVersion,6);assert.equal(replay.version,3,'input encoding has not changed');
  const final=p.playPitReplay(replay);assert.equal(final.stageJourney.sector,'court');
  let direct=p.createPitCombatState(...replay.fighters,{...replay.rules,arenaId:replay.arenaId});
  for(const input of inputs)direct=p.stepPitCombat(direct,input);
  assert.equal(p.serializePitCombat(final),p.serializePitCombat(direct));
  assert.deepEqual(p.deserializePitReplay(p.serializePitReplay(replay)),replay);
  assert.equal(p.normalizePitReplay({...replay,engineVersion:5}),null);
});
test('malformed scene state and mismatched journey rules cannot be restored',()=>{
  const state=create();
  for(const patch of [{stageJourney:{...state.stageJourney,sector:'invented'}},{stageJourney:{...state.stageJourney,sector:'court',transferFrame:99,exitSide:1}},
    {stageJourney:undefined},{rules:{mode:'training'}},{arenaId:'the-pit'}]){
    assert.throws(()=>p.deserializePitCombat(JSON.stringify({...state,...patch})));
  }
});
test('rendering another real kit leaves match identity, camera and simulation unchanged',async()=>{
  const state=project(corner()).state,camera={arenaId:state.arenaId,centerX:480,centerY:270,zoom:1,targetZoom:1,mode:'follow',frame:state.frame};
  const before=p.serializePitCombat(state),cameraBefore=structuredClone(camera),images=new Map();
  for(const src of p.getPitArenaArtPaths(p.PIT_RESERVE_COURT)){const m=await sharp('public'+src).metadata();images.set(src,{src,naturalWidth:m.width,naturalHeight:m.height});}
  const bank={arenaId:p.PIT_RESERVE_COURT,images,requestedPaths:new Set(images.keys()),failedPaths:new Set(),cancelled:false,productionKit:p.resolvePitArenaProductionKit(p.PIT_RESERVE_COURT)};
  const context=new Proxy({globalAlpha:1},{get:(object,key)=>key in object?object[key]:()=>{}});
  const options={sceneArenaId:p.PIT_RESERVE_COURT};
  const back=p.drawPitArenaBackdrop(context,state,camera,bank,options),front=p.drawPitArenaForeground(context,state,camera,bank,options);
  assert.deepEqual([...back.drawnPlanes,...front.drawnPlanes],['P0','P1','P2','P3','P4','P5']);assert.deepEqual(back.missingPaths,[]);
  assert.equal(p.serializePitCombat(state),before);assert.deepEqual(camera,cameraBefore);
});


test('the real result callback never reports a preserved replay when recording fails or is absent',async()=>{
 const [{default:ts},{runInNewContext}]=await Promise.all([import('typescript'),import('node:vm')]);
 const source=await fs.readFile(new URL('../app/game/PitCanvas.tsx',import.meta.url),'utf8');
 const tree=ts.createSourceFile('PitCanvas.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='useEffect'&&node.arguments[0]?.getText(tree).includes('recorderRef.current.finish()'))effect=node.arguments[0];ts.forEachChild(node,visit);}visit(tree);assert(effect);
 const code=ts.transpileModule(`const callback=${effect.getText(tree)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 for(const scenario of ['success','throws','absent']){
  const notices=[],recorded=[];let forbiddenCalls=0;
  const callback=runInNewContext(`(()=>{${code};return callback;})()`,{
   combat:{phase:'match-over',frame:300,fighters:[{definitionId:'jungle-hunter'}],rules:{stageJourney:p.PIT_RESERVE_JOURNEY}},playbackReplay:null,reportedMatchFrameRef:{current:null},
   recorderRef:{current:scenario==='absent'?null:{finish:()=>{if(scenario==='throws')throw Error('recording failed');return {id:'actual-replay'};}}},
   setRecordedReplay:value=>recorded.push(value),setReplayNotice:message=>notices.push(message),setAriaAnnouncement:()=>{},isPitFirstEditionFighterId:()=>{forbiddenCalls++;throw Error('progression path must not run');},
  });callback();assert.equal(forbiddenCalls,0);assert.equal(recorded.length,scenario==='success'?1:0);
  assert.match(notices.at(-1),scenario==='success'?/Replay disponible dans cette session/:/Replay indisponible/);
 }
});
