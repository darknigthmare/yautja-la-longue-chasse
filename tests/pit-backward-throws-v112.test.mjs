import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const bundled = await build({stdin: {contents: [
  "export * from './app/game/systems/pitCombat';", "export * from './app/game/systems/pitReplay';",
  "export * from './app/game/systems/pitWorkbookCombatV112';", "export * from './app/game/systems/pitThrowControlsV112';",
  "export * from './app/game/systems/controlBindings';", "export * from './app/game/hunterSpriteMotion';",
  "export * from './app/game/systems/pitTraining';",
].join('\n'), resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'node'});
const p = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const neutral = [{}, {}];
const tick = (state, inputs = neutral, count = 1) => {for (let n = 0; n < count; n++) state = p.stepPitCombat(state, inputs); return state;};
const valid = state => assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)), state);
function close({hero = 'feral-hunter', slot = 0, direction = 1, mode = 'training'} = {}) {
  const ids = slot === 0 ? [hero, hero === 'scar' ? 'feral-hunter' : 'scar'] : [hero === 'scar' ? 'feral-hunter' : 'scar', hero];
  const state = p.createPitCombatState(...ids, {normalMoves: 'workbook-v112', mode});
  state.fighters[slot].x = direction === 1 ? 400 : 460; state.fighters[slot].facing = direction;
  state.fighters[1 - slot].x = state.fighters[slot].x + direction * 60; state.fighters[1 - slot].facing = -direction;
  return state;
}
const backward = direction => ({throw: true, [direction === 1 ? 'left' : 'right']: true});
function caught(options = {}, defenderInput = {}) {
  const slot = options.slot ?? 0, direction = options.direction ?? 1;
  let state = close(options);
  state = tick(state, slot === 0 ? [backward(direction), defenderInput] : [defenderInput, backward(direction)]);
  for (let n = 0; n < 14 && !state.sourceThrowV112; n++) state = tick(state, slot === 0 ? [{}, defenderInput] : [defenderInput, {}]);
  assert(state.sourceThrowV112); assert.equal(state.sourceThrowV112.age, 0); valid(state); return state;
}
test('V17 is opt-in and source10/3/32 110/0 belongs only to the unvaried native duo', () => {
  assert.equal(close().version, 17); assert.equal(p.createPitCombatState('feral-hunter', 'scar', {normalMoves: 'workbook-v109'}).version, 16);
  for (const id of ['feral-hunter', 'scar']) {const m = p.getPitWorkbookCombatMoveV112(id, 'TH_B'); assert.deepEqual([m.startup,m.active,m.recovery,m.damage,m.costPercent], [10,3,32,110,0]);}
  assert.throws(() => p.createPitCombatState('feral-hunter', 'wolf', {normalMoves: 'workbook-v112'}), /independently drawn/);
  assert.throws(() => p.createPitCombatState('feral-hunter', 'scar', {normalMoves: 'workbook-v112', variants: ['feral-unmasked', null]}), /independently drawn/);
});
test('assigned keyboard and actual pad L+M preserve4; fresh real fighter facing decides backward or forward', () => {
  for (const player of [1,2]) {
    const bindings = structuredClone(p.DEFAULT_CONTROL_BINDINGS); bindings[`pit.p${player}AttackLight`] = ['KeyV']; bindings[`pit.p${player}AttackMedium`] = ['KeyB'];
    const options = {recipe: 'workbook-v112', player, codes: new Set(['KeyV','KeyB']), bindings};
    const resolved = p.pitThrowInputV112({left:true,attack:'light'},options);
    assert.equal(resolved.left,true); assert.equal(resolved.throw,true); assert.equal(resolved.attack,undefined);
    assert.equal(p.pitThrowInputV112({}, {...options,codes:new Set(),pad:{buttons:Array.from({length:16},(_,i)=>({pressed:i===2||i===3}))}}).throw,true);
    const historical = {left:true,attack:'light'}; assert.strictEqual(p.pitThrowInputV112(historical,{...options,recipe:'workbook-v107'}),historical);
  }
  for (const direction of [-1,1]) {
    let state=close({direction});state=tick(state,[backward(direction),{}]); assert.equal(state.fighters[0].action.workbookMove,'TH_B');
    state=close({direction});state=tick(state,[{throw:true,[direction===1?'right':'left']:true},{}]);assert.equal(state.fighters[0].action.workbookMove,'TH_F');
  }
});
test('both fighters, slots and native orientations move one real target continuously over the thrower and damage only at a clear landing', () => {
  for (const hero of ['feral-hunter','scar']) for (const slot of [0,1]) for (const direction of [-1,1]) {
    let state=caught({hero,slot,direction}), initial=structuredClone(state), target=1-slot, hits=0,maxY=0,previous={x:state.fighters[target].x,y:0};
    for(let age=1;age<=25;age++) {
      state=tick(state);valid(state);const d=state.fighters[target];maxY=Math.max(maxY,d.y);
      assert(Math.hypot(d.x-previous.x,d.y-previous.y)<25,'no target teleport');assert.equal(state.fighters[slot].x,initial.fighters[slot].x);
      assert.equal(state.fighters[slot].definitionId,hero);assert.equal(d.definitionId,initial.fighters[target].definitionId);
      hits+=state.events.filter(e=>e.type==='hit'&&e.attack==='throw').length;
      assert.equal(d.health,initial.fighters[target].health-(age===25?110:0));previous={x:d.x,y:d.y};
    }
    assert.equal(hits,1);assert.equal(maxY,96);assert.equal((initial.fighters[slot].x-state.fighters[target].x)*direction,140);
    assert.equal(state.fighters[target].phase,'knockdown');assert.equal(state.fighters[target].y,0);
    assert.deepEqual(state.fighters.map(f=>f.workbookDeviceV107),initial.fighters.map(f=>f.workbookDeviceV107));
    state=tick(state,neutral,43);valid(state);assert.equal(state.sourceThrowV112,null);
  }
});
test('first and last fresh tech edges cancel the backward capture with no hit, meter or teleport', () => {
  for(const slot of [0,1])for(const delay of [0,7]) {
    let s=caught({slot});const positions=s.fighters.map(f=>f.x),life=s.fighters.map(f=>f.health);
    s=tick(s,neutral,delay);s=tick(s,slot===0?[{},{throw:true}]:[{throw:true},{}]);valid(s);
    assert.equal(s.sourceThrowV112,null);assert.deepEqual(s.fighters.map(f=>f.x),positions);assert.deepEqual(s.fighters.map(f=>f.health),life);
    assert.deepEqual(s.fighters.map(f=>f.traque),[0,0]);assert.equal(s.events.find(e=>e.type==='throw-tech').sourceAction,'TH_B');
    for(const side of [0,1])assert.equal(p.describePitCombatHunterSpriteMotion(s,side).clipId,'pit.stand.workbook-v112.TH_B.recovery.teched');
  }
});
test('held Projection and an input after tick8 cannot undo the real flight or landing', () => {
  for(const slot of [0,1]) {
    let s=caught({slot},{guardHigh:true,throw:true}),life=s.fighters[1-slot].health;
    s=tick(s,slot===0?[{},{throw:true}]:[{throw:true},{}],30);valid(s);assert.equal(s.fighters[1-slot].health,life-110);
    s=caught({slot});s=tick(s,neutral,8);s=tick(s,slot===0?[{},{throw:true}]:[{throw:true},{}]);assert(!s.events.some(e=>e.type==='throw-tech'));
    s=tick(s,neutral,30);valid(s);assert.equal(s.fighters[1-slot].health,life-110);
  }
});
test('continuous pair reconstruction owns native clocks, including a mid-flight snapshot without prior observation', () => {
  for(const hero of ['feral-hunter','scar'])for(const direction of [-1,1]) {
    let s=caught({hero,direction});for(let age=0;age<67;age++) {
      const m=p.describePitCombatHunterSpriteMotion(s,1);
      assert.equal(m.clipId,'pit.stand.workbook-v112.TH_B.victim');assert.equal(m.elapsedTicks,age);assert.equal(m.durationTicks,67);
      assert.equal(m.facing,direction===1?'left':'right');assert.deepEqual(p.describePitCombatHunterSpriteMotion(p.deserializePitCombat(p.serializePitCombat(s)),1),m);
      s=tick(s);
    }
    assert.equal(s.sourceThrowV112,null);
  }
});
test('laboratory shows45source ticks and backward target phases, and reset preservesV17 while clearing both captures', () => {
  let s=close();s=tick(s,[backward(1),{}]);assert.equal(p.getPitTrainingFrameReadout(s,0).actionTotalFrames,45);
  assert.equal(p.getPitTrainingFrameReadout(s,0).phaseTotalFrames,10);s=caught();s=tick(s,neutral,25);
  assert.equal(p.getPitTrainingFrameReadout(s,1).actionLabel,'Chute de projection arrière');assert.equal(p.getPitTrainingFrameReadout(s,1).framesRemaining,42);
  s=p.resetPitTrainingPositions(s);valid(s);assert.equal(s.version,17);assert.equal(s.sourceThrowV109,null);assert.equal(s.sourceThrowV112,null);
});
test('real startup/active/recovery whiff is10/3/32 with no held-button cancel', () => {
  let s=close();s.fighters[1].x=900;s=tick(s,[backward(1),{}]);const phases={};
  for(let n=0;n<45;n++){phases[s.fighters[0].phase]=(phases[s.fighters[0].phase]??0)+1;s=tick(s,[{...backward(1),jump:true,attack:'heavy',resource:true},{}]);valid(s);}
  assert.deepEqual(phases,{startup:10,active:3,recovery:32});assert.equal(s.fighters[0].action,null);assert.equal(s.sourceThrowV112,null);
  assert.equal(s.fighters[1].health,p.PIT_FIGHTERS.scar.maxHealth);s=tick(s,[backward(1),{}]);assert.equal(s.fighters[0].action,null);
});
test('a wall truncates a safe rear landing and an insufficient rear clearance refuses capture', () => {
  for(const direction of [-1,1])for(const room of [25,100]) {
    let s=close({direction});const a=s.fighters[0],d=s.fighters[1];
    a.x=direction===1?p.PIT_ARENA.leftWall+p.getPitCombatFighterDefinition(a).bodyWidth/2+room:p.PIT_ARENA.rightWall-p.getPitCombatFighterDefinition(a).bodyWidth/2-room;
    d.x=a.x+direction*60;const life=d.health;s=tick(s,[backward(direction),{}]);
    for(let n=0;n<65;n++){s=tick(s);valid(s);}
    assert.equal(s.fighters[1].health,life-(room===100?110:0));
    if(room===100)assert((s.fighters[0].x-s.fighters[1].x)*direction>0);
  }
});
test('capture eligibility refuses airborne, wake, knockdown and existing hitstun instead of resetting a combo', () => {
  for(const condition of ['air','wake','knockdown','hitstun']) {
    let s=close(),d=s.fighters[1];if(condition==='air'){d.grounded=false;d.y=160;}else if(condition==='wake')d.wakeInvulnerabilityFrames=40;
    else if(condition==='knockdown'){d.phase='knockdown';d.knockdownFrames=60;}else{d.phase='hitstun';d.stunFrames=60;}
    s=tick(s,[backward(1),{}]);s=tick(s,neutral,16);assert.equal(s.sourceThrowV112,null);assert.equal(s.fighters[1].health,d.health);
  }
});
test('source capture consumes resource, attack and jump edges and preserves a deployed finite device', () => {
  let s=close();s.fighters[0].traque=1000;s.fighters[1].x=600;s=tick(s,[{workbookAction:'mine'},{}]);s=tick(s,neutral,24);
  for(let n=0;n<100&&s.fighters[1].x-s.fighters[0].x>60;n++)s=tick(s,[{},{left:true}]);
  s=tick(s);s=tick(s,[{},backward(-1)]);for(let n=0;n<14&&!s.sourceThrowV112;n++)s=tick(s);
  assert(s.sourceThrowV112);const devices=structuredClone(s.workbookDevicesV107),inventory=structuredClone(s.fighters[0].workbookDeviceV107),health=s.fighters.map(f=>f.health);
  for(let age=1;age<=25;age++){s=tick(s,[{jump:true,resource:true,attack:'heavy'},{}]);valid(s);assert.deepEqual(s.workbookDevicesV107,devices);assert.deepEqual(s.fighters[0].workbookDeviceV107,inventory);}
  assert.equal(s.fighters[0].health,health[0]-110);assert.equal(s.fighters[0].action,null);s=tick(s);assert.equal(s.workbookDevicesV107[0].age,devices[0].age+1);
});
test('the CPU reacts after five visible ticks and a training knockout holds native landing for sixty ticks', () => {
  let s=caught(),frame=s.sourceThrowV112.capturedFrame;
  for(let age=0;age<6;age++){const input=p.pitBackwardThrowCpuInputV112(s);assert.equal(Boolean(input.throw),age===5&&frame%3!==0);s=tick(s,[{},input]);}
  s=close();s.fighters[1].health=9;s=tick(s,[backward(1),{}]);let koTicks=0;
  for(let n=0;n<110;n++){s=tick(s);valid(s);if(s.sourceThrowV112&&s.fighters[1].health===0){const m=p.describePitCombatHunterSpriteMotion(s,1);assert.equal(m.clipId,'pit.stand.workbook-v112.TH_B.victim.ko');assert.equal(m.durationTicks,60);koTicks++;}}
  assert.equal(koTicks,60);assert.equal(s.sourceThrowV112,null);
});
test('tampering cannot create a capture, alter a landing, importTH_B intoV16 or combine both throws', () => {
  const initial=caught();for(const change of [s=>s.sourceThrowV112.destinationX++,s=>s.sourceThrowV112.attackerX++,s=>s.sourceThrowV112.age++,s=>s.fighters[1].x++,s=>s.fighters[0].action.workbookMove='TH_F',s=>s.sourceThrowV109=structuredClone(s.sourceThrowV112),s=>delete s.sourceThrowV112]) {
    const s=structuredClone(initial);change(s);assert.throws(()=>p.deserializePitCombat(JSON.stringify(s)));
  }
  const s=structuredClone(initial);s.version=16;s.rules.normalMoves='workbook-v109';s.fighters.forEach(f=>f.normalMovesRecipe='workbook-v109');assert.throws(()=>p.deserializePitCombat(JSON.stringify(s)));
});
test('timeout clears the real pair and round transition retains17 without carrying an old capture', () => {
  for(const delay of [0,8,20]){let s=caught({mode:'match'});s=tick(s,neutral,delay);const life=s.fighters.map(f=>f.health);s.roundFramesRemaining=1;s=tick(s);valid(s);assert.equal(s.phase,'round-over');assert.equal(s.sourceThrowV112,null);assert.deepEqual(s.fighters.map(f=>f.health),life);s=tick(s,neutral,p.PIT_ROUND_TRANSITION_FRAMES);valid(s);assert.equal(s.version,17);assert.equal(s.sourceThrowV112,null);}
});
test('real walking4+Projection is recorded and replayed onV17; relabelling16orrecipe cannot forge it', () => {
  const options={fighters:['feral-hunter','scar'],rules:{mode:'training',normalMoves:'workbook-v112'}};
  let s=p.createPitCombatState(...options.fighters,options.rules),thrown=false;const frames=[],events=[];
  for(let n=0;n<290;n++){let input={};if(!thrown){if(Math.abs(s.fighters[1].x-s.fighters[0].x)>60)input={right:true};else{input=backward(1);thrown=true;}}const pair=[input,{guardHigh:true}];frames.push(pair);s=tick(s,pair);events.push(...s.events);}
  assert(events.some(e=>e.type==='hit'&&e.attack==='throw'&&e.damage===110));const replay=p.recordPitReplay(frames,options);
  assert.equal(replay.engineVersion,17);const restored=p.deserializePitReplay(p.serializePitReplay(replay));assert.deepEqual(p.playPitReplay(restored),s);
  assert.equal(p.normalizePitReplay({...replay,engineVersion:16}),null);assert.equal(p.normalizePitReplay({...replay,rules:{...replay.rules,normalMoves:'workbook-v109'}}),null);
  assert.throws(()=>p.stepPitReplayFrame(p.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v109'}),neutral,17));
});

test('a complete two-roundV17 match uses actual walking and back throws, then replays its genuine victory', () => {
  const options={fighters:['feral-hunter','scar'],rules:{normalMoves:'workbook-v112',mode:'match'}};
  let s=p.createPitCombatState(...options.fighters,options.rules);const inputs=[],events=[];
  for(let n=0;n<6500&&s.phase!=='match-over';n++){
    let input={};const a=s.fighters[0],d=s.fighters[1];
    if(s.phase==='round'&&!s.sourceThrowV112&&!s.sourceThrowV109&&!a.action&&a.phase==='idle'){
      const distance=d.x-a.x;
      if(Math.abs(distance)>60)input=distance>0?{right:true}:{left:true};
      else input=backward(a.facing);
    }
    const pair=[input,{guardHigh:true}];inputs.push(pair);s=tick(s,pair);events.push(...s.events);valid(s);
  }
  assert.equal(s.phase,'match-over');assert.equal(s.matchWinnerId,'feral-hunter');assert.equal(s.fighters[0].roundsWon,2);
  assert(events.filter(e=>e.type==='hit'&&e.attack==='throw').length>=20);
  const replay=p.recordPitReplay(inputs,options);assert.equal(replay.engineVersion,17);
  assert.deepEqual(p.playPitReplay(p.deserializePitReplay(p.serializePitReplay(replay))),s);
});
