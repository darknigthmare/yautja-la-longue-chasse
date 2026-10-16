import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as melee from '../app/game/systems/huntMeleeCombat.ts';
import {huntStructuralBarrierV94 as barrier} from '../app/game/systems/huntStructuralBarrierV94.ts';
import {calculateLineOfSightOcclusion, sweptProjectileImpactTime, resolveHunterSplashDamage, stepSmartDiscFlight} from '../app/game/systems/huntSystems.ts';

const source=readFileSync(new URL('../app/game/HuntCanvas.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('HuntCanvas.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function actual(name, dependencies={}) {
  const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
  assert.ok(fn,`Missing actual runtime function ${name}`);
  return runInNewContext(ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText+`\n${name}`,{
    ...melee,huntStructuralBarrierV94:barrier,calculateLineOfSightOcclusion,sweptProjectileImpactTime,resolveHunterSplashDamage,stepSmartDiscFlight,
    clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),...dependencies,
  });
}
const wall=(overrides={})=>({id:'structure',x:60,y:-100,width:8,height:300,collision:'solid',...overrides});
const actor=(id,x=0,y=0,overrides={})=>({id,x,y,width:40,height:80,health:100,maxHealth:100,active:true,alive:true,facing:1,
  hitStunSeconds:0,knockbackVelocityX:0,knockbackVelocityY:0,hitFlash:0,telegraph:0,attackCooldown:0,...overrides});

for (const [name,a,b,obstacles,blocked] of [
  ['crossing a wall',{x:0,y:0},{x:100,y:0},[wall()],true],
  ['reverse crossing',{x:100,y:0},{x:0,y:0},[wall()],true],
  ['clear path',{x:0,y:0},{x:40,y:0},[wall()],false],
  ['one-way ledge',{x:0,y:0},{x:100,y:0},[wall({collision:'one-way'})],false],
  ['legacy decorative platform',{x:0,y:0},{x:100,y:0},[wall({collision:undefined})],false],
  ['tangent edge',{x:0,y:-100},{x:100,y:-100},[wall()],false],
  ['endpoint at wall',{x:0,y:0},{x:60,y:0},[wall()],false],
  ['leaving a touched boundary',{x:60,y:0},{x:0,y:0},[wall()],false],
  ['entering at boundary',{x:60,y:0},{x:65,y:0},[wall()],true],
  ['stationary inside solid',{x:65,y:0},{x:65,y:0},[wall()],true],
  ['negative world heights',{x:0,y:-400},{x:100,y:-400},[wall({y:-500})],true],
  ['thin wall',{x:0,y:0},{x:100,y:0},[wall({width:.001})],true],
]) test(`barrier geometry: ${name}`,()=>assert.equal(barrier(a,b,obstacles),blocked));
test('geometry does not mutate inputs and is symmetric under endpoint reversal',()=>{
  const solids=[wall(),wall({x:100,y:400,collision:'one-way'})],before=JSON.stringify(solids);
  for(let i=0;i<100;i++){const a={x:i-20,y:i*2-80},b={x:150-i/2,y:90-i};assert.equal(barrier(a,b,solids),barrier(b,a,solids));}
  assert.equal(JSON.stringify(solids),before);assert.equal(barrier({x:NaN,y:0},{x:1,y:0},solids),true);
});

function bossFixture(behavior='melee',{x=90,y=0,platforms=[]}={}) {
  const damage=[],shots=[],parries=[];
  const state={player:actor('player',x,y),boss:actor('boss'),world:{covers:[],platforms},brokenPillarIds:new Set(),screenShakeEnabled:false};
  const mission={boss:{attacks:[{id:'attack',behavior,damage:20,rangePx:350}],color:'boss'},palette:{danger:'danger'}};
  const run=actual('executeBossAttack',{DIFFICULTY_BY_ID:{test:{enemyDamageMultiplier:1}},emitNoise(){},
    resolvePlayerMeleeParry:()=>{parries.push(1);return false;},hurtPlayer:(_s,n)=>damage.push(n),forceDecloak(){},fireHostileProjectile:(...args)=>shots.push(args)});
  return {state,damage,shots,parries,step:()=>run(state,mission,'test','attack',1)};
}
for(const coords of [{x:400,y:0},{x:0,y:250},{x:165,y:0},{x:0,y:135}]){
  test(`a missed boss melee attack cannot become a projectile at ${coords.x},${coords.y}`,()=>{
    const f=bossFixture('melee',coords);f.step();assert.equal(f.damage.length,0);assert.equal(f.shots.length,0);assert.equal(f.parries.length,0);
  });
}
for(const behavior of ['melee','charge','area']) for(const blocked of [true,false]){
  test(`boss ${behavior}: ${blocked?'solid structure stops damage':'one-way ledge preserves damage'}`,()=>{
    const f=bossFixture(behavior,{platforms:[wall({collision:blocked?'solid':'one-way'})]});f.step();
    assert.equal(f.damage.length,blocked?0:1);assert.equal(f.shots.length,0);
    if(blocked)assert.equal(f.parries.length,0,'a blocked hit must not consume a parry');
    if(behavior==='charge')assert.equal(f.state.boss.velocityX,760,'blocked damage does not cancel the authored charge animation/motion');
  });
}
for(const behavior of ['burst','plasma','disc'])test(`authored ranged boss behavior ${behavior} remains ranged`,()=>{
  const f=bossFixture(behavior,{x:400,platforms:[wall()]});f.step();assert.equal(f.shots.length,behavior==='burst'?3:1);assert.equal(f.damage.length,0);
});
test('solid floor prevents a boss impact on a different level',()=>{
  const f=bossFixture('melee',{x:0,y:100,platforms:[wall({x:-100,y:85,width:400,height:5})]});f.step();
  assert.equal(f.damage.length,0);assert.equal(f.shots.length,0);
});

const profile={weaponId:'wristblades',damage:30,cooldownSeconds:.26,reachPx:112,maxTargetHits:2,noiseLoudness:.5,noiseRadius:280};
function playerFixture(platforms=[],kind='light') {
  const player=actor('player'), enemy=actor('prey',90,0,{boss:false});
  const request=kind==='light'?melee.requestHuntMeleeAttack(melee.createHuntMeleeState(),profile,1)
    :melee.requestHuntMeleeTechniqueAttack(melee.createHuntMeleeState(),profile,1,kind,{grounded:true,targetId:enemy.id,targetHealthRatio:.1,targetInRange:true,targetTelegraphing:true});
  player.melee=melee.stepHuntMeleeCombat(request.state,request.state.phaseRemainingSeconds).state;player.attackFlash=0;player.invulnerability=0;
  const state={player,enemies:[enemy],boss:actor('apex',900,0,{active:false}),world:{platforms},screenShakeEnabled:false},hits=[];
  const step=actual('updatePlayerMeleeCombat',{queueSound(){},emitNoise(){},announce(){},damageEnemy:(_s,_m,e,n)=>hits.push([e.id,n])});
  return {state,hits,step:()=>step(state,{},0,false)};
}
for(const kind of ['light','heavy','guard-break','throw','execution'])test(`${kind} never damages or staggers prey through a solid wall`,()=>{
  const f=playerFixture([wall()],kind);f.step();assert.deepEqual(f.hits,[]);assert.equal(f.state.enemies[0].hitStunSeconds,0);
  assert.equal(f.state.player.melee.hitTargetIds.length,0,'an obstructed target does not consume the strike hit cap');
});
test('unobstructed and one-way targets retain one hit per action',()=>{
  const f=playerFixture([wall({collision:'one-way'})]);f.step();f.step();assert.deepEqual(f.hits,[['prey',30]]);
});
test('contextual melee target selection rejects a target on the other side of a wall',()=>{
  const f=playerFixture([wall()]);assert.equal(actual('nearestHuntMeleeTarget')(f.state,120),null);
  f.state.world.platforms=[];assert.equal(actual('nearestHuntMeleeTarget')(f.state,120)?.id,'prey');
});

function regularFixture(platforms=[]) {
  const enemy=actor('enemy',0,0,{kind:'beast',archetype:'beast',damage:17,moveSpeed:90,patrolLeft:0,patrolRight:800}), hits=[];
  const state={player:actor('player',90),boss:actor('boss',900,0,{active:false}),enemies:[enemy],elapsed:1,arsenal:{difficultyId:'test'},
    world:{platforms,covers:[],width:1000},brokenPillarIds:new Set(),mud:{thermalVisibility:1},noiseEvents:[],scentNodes:[],tracks:[],projectiles:[],aiBrains:{}};
  const step=actual('updateRegularEnemy',{ecologyV8EnemyForId:()=>null,DIFFICULTY_BY_ID:{test:{detectionMultiplier:1}},sampleWind:()=>({}),
    sampleScentAt:()=>({strength:0,direction:0}),sampleTracksAt:()=>({strength:0,newest:null}),createAiBrain:()=>({mode:'engage'}),
    stepAiBrain:b=>({brain:b,intent:{action:'attack',moveX:0,speedMultiplier:1},raisedAlert:false}),
    REGULAR_MELEE_ATTACK_ID:'melee',REGULAR_RANGED_ATTACK_ID:'ranged',regularEnemyAttackRequest:()=>({}),
    stepRegularAttackTelegraph:()=>({state:{cooldownSeconds:1,telegraphSeconds:0,pendingAttackId:null},executedAttackId:'melee',immobilized:false}),
    resolvePlayerMeleeParry:()=>false,hurtPlayer:(_s,n)=>hits.push(n),emitNoise(){},emitEnemyFootprint(){},resolveAiMovementLeash:()=>({left:0,right:960}),
  });
  return {state,hits,step:()=>step(state,enemy,{},1/60)};
}
test('an already telegraphed regular melee attack cannot hit through a newly intervening structure',()=>{
  const f=regularFixture([wall()]);f.step();assert.deepEqual(f.hits,[]);
  f.state.world.platforms=[];f.step();assert.deepEqual(f.hits,[17]);
});

function splashFixture(platforms=[]) {
  const primary=actor('direct',40,0,{width:8}),secondary=actor('splash',80,0,{width:8});
  const projectile={x:0,y:40,velocityX:6000,velocityY:0,radius:2,life:1,damage:25,hostile:false,coverGraceSeconds:0,weaponId:'plasma-caster',recovery:'none',maxTargetHits:1,splashRadius:140};
  const state={player:actor('player',500),boss:actor('boss',900,0,{active:false}),enemies:[primary,secondary],projectiles:[projectile],world:{platforms,covers:[],width:1000,floorY:200},brokenPillarIds:new Set(),screenShakeEnabled:false},hits=[];
  const run=actual('updateProjectiles',{VIEW_HEIGHT:720,OSERIS_VERTICAL_BOUNDS:{},PILOT_MISSION_ID:'jungle-vey',
    recordPlasmaRestraintViolation(){},damageEnemy:(_s,_m,e,n)=>hits.push([e.id,n]),hurtPlayer(){},restoreProjectileAmmo(){},settleRecoverableProjectile(){}});
  return {state,hits,step:()=>run(state,{},1/60)};
}
test('plasma impact still damages its direct victim but cannot splash through a solid wall',()=>{
  const f=splashFixture([wall()]);f.step();assert.deepEqual(f.hits,[['direct',25]]);
});
test('one-way platforms do not suppress plasma splash',()=>{
  const f=splashFixture([wall({collision:'one-way'})]);f.step();assert.deepEqual(f.hits,[['direct',25],['splash',11.25]]);
});
