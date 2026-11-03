#!/usr/bin/env node
/**
 * Honest campaign-controller attempts against the actual private hunt runtime.
 * State observation is read-only. Only the native input hub and stepGame change
 * the hunt: no actor admission, geometry edits, health edits or result forcing.
 * A native-simulation success never certifies a browser campaign or real device.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {decideHuntCampaignInputV112} from './lib/qa-hunt-campaign-input-v112.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
const option=(name,fallback)=>{const index=args.indexOf(name);return index<0?fallback:args[index+1];};
const output=path.resolve(root,option('--report','outputs/qa-hunt-campaign-canonical-v112/report.json'));
const seconds=Number(option('--limit-seconds','240'));
const strategy=option('--strategy','mixed');
assert.ok(Number.isFinite(seconds)&&seconds>0&&seconds<=3600,'simulation budget: 1..3600 seconds');
assert.ok(['mixed','rush','melee'].includes(strategy),'known controller strategy');
const source=await readFile(path.join(root,'app/game/HuntCanvas.tsx'),'utf8');
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const compiled=await build({stdin:{contents:source+'\nexport {makeGameState,stepGame,snapshot,captureCheckpoint,serializeActiveHuntCheckpoint,deserializeActiveHuntCheckpoint,restoreCheckpoint};\nexport {defaultSave,applyMissionResult} from "./save";export {MISSIONS,MISSION_BY_ID} from "./data";\n',
  resolveDir:path.join(root,'app/game'),sourcefile:path.join(root,'app/game/HuntCanvas.tsx'),loader:'tsx'},
  bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',loader:{'.module.css':'empty'},
  external:['react','react/jsx-runtime','react-dom'],logLevel:'silent'});
let randomState=0x1120626;
const math=Object.create(Math);math.random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return(randomState>>>0)/4294967296;};
const mod={exports:{}};
runInNewContext(compiled.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url),
  Math:math,TextEncoder,TextDecoder,document:{hidden:false,hasFocus:()=>true},navigator:{getGamepads:()=>[]}});
const api=mod.exports;
const head=(await readFile(path.join(root,'.git/HEAD'),'utf8')).trim();
let revision=head;
if(head.startsWith('ref: ')){
  const ref=head.slice(5);
  try{revision=(await readFile(path.join(root,'.git',ref),'utf8')).trim();}
  catch{revision=(await readFile(path.join(root,'.git/packed-refs'),'utf8')).split('\n').find(line=>line.endsWith(' '+ref))?.split(' ')[0];}
}
assert.match(revision,/^[a-f0-9]{40}$/,'a real local source revision is required');
const inputHub=()=>({keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),
  previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null});
function observe(game){return{elapsed:game.elapsed,phase:game.phase,paused:game.paused,
  player:{x:game.player.x,y:game.player.y,health:game.player.health,maxHealth:game.player.maxHealth,
    stamina:game.player.stamina,energy:game.player.energy,medicomps:game.player.medicomps,
    grounded:game.player.grounded,climbing:game.player.climbing,velocityX:game.player.velocityX,velocityY:game.player.velocityY},
  kills:game.kills,scans:game.scans,damageTaken:game.damageTaken,completedObjectives:[...game.completedObjectives],
  scanNodes:game.scanNodes.map(item=>({...item})),recoveryNodes:game.recoveryNodes.map(item=>({...item})),
  boss:{x:game.boss.x,y:game.boss.y,health:game.boss.health,maxHealth:game.boss.maxHealth,active:game.boss.active,alive:game.boss.alive},
  bossMechanics:{...game.bossMechanics},purgeConsoleNodes:game.purgeConsoleNodes.map(node=>({...node})),energyWeaponsLocked:game.energyWeaponsLocked,
  livingEnemies:game.enemies.filter(enemy=>enemy.alive).map(enemy=>({id:enemy.id,archetype:enemy.archetype,x:enemy.x,y:enemy.y,health:enemy.health,active:enemy.active})),
  corpseCount:game.huntRites.corpses.length,specimenCount:game.huntRites.specimensV112.length,
  trophyCarried:game.trophyCarried,ship:game.dropShip?{...game.dropShip}:null,message:game.message};}


const campaignSource=option('--campaign-source',null);
const save=campaignSource?JSON.parse(await readFile(path.resolve(root,campaignSource),'utf8')):api.defaultSave('2026-11-02T00:00:00.000Z');
const report={schema:1,scope:'native simulation controller attempts; no browser, mounted GameClient or real device',
  sourceCommit:revision,sourceSha256:hash(source),
  policySha256:hash(await readFile(new URL('./lib/qa-hunt-campaign-input-v112.mjs',import.meta.url),'utf8')),
  lockSha256:hash(await readFile(path.join(root,'package-lock.json'),'utf8')),
  generatedAt:new Date().toISOString(),node:process.version,simulation:{stepSeconds:1/60,budgetSeconds:seconds,strategy,rngSeed:0x1120626},
  admission:{kind:campaignSource?'continuation of a genuinely earned campaign save':'unmodified defaultSave',continuationSource:campaignSource,
    saveSha256:hash(save),loadout:save.loadout,unlockedArmorIds:save.inventory.unlockedArmorIds,
    fieldToolIds:save.inventory.fieldToolIds,clanMarks:save.profile.clanMarks,difficulty:save.settings.difficultyId},
  rules:{huntMutation:'native inputs and stepGame only',enemyAdmission:false,teleport:false,healthOverride:false,
    invulnerabilityOverride:false,objectiveInjection:false,forcedResult:false},attempts:[],notAdmitted:[],qualification:'ATTEMPT_ONLY'};
await mkdir(path.dirname(output),{recursive:true});
for(const mission of api.MISSIONS){
  if(campaignSource&&save.missionProgress[mission.id].status==='completed')continue;
  if(save.missionProgress[mission.id].status==='locked'){
    report.notAdmitted.push({missionId:mission.id,reason:'locked in actual campaign; prerequisite not completed'});continue;
  }
  const game=api.makeGameState(mission,save.loadout,save.inventory,save.settings.difficultyId,save.appearance,
    save.settings.reducedGore,save.settings.screenShake,save.missionProgress[mission.id].attempts,save.exploration);
  const input=inputHub(),results=[],trace=[],samples=[],damageEvents=[],memory={previousX:game.player.x,stuckTicks:0,jumpUntil:-1};
  const initial=observe(game),initialWorld=hash(game.world),originalEnemyIds=game.enemies.map(enemy=>enemy.id);
  let previousInput='',previousPhase=game.phase,maxX=game.player.x,unchangedSeconds=0,previousProgress='';
  for(let tick=0;tick<seconds*60&&game.phase!=='dead'&&game.phase!=='finished';tick++){
    const decision=decideHuntCampaignInputV112(game,tick,memory,strategy);
    input.keyboardHeld.clear();input.pressed.clear();
    for(const action of decision.held)input.keyboardHeld.add(action);
    for(const action of decision.pressed)input.pressed.add(action);
    input.pointerScreen=decision.pointer??null;
    const serialized=JSON.stringify(decision);
    if(serialized!==previousInput){trace.push({tick,...decision});previousInput=serialized;}
    const healthBefore=game.player.health,damageBefore=game.damageTaken;
    api.stepGame(game,mission,save.loadout,save.inventory,save.appearance,save.settings.difficultyId,input,1/60,result=>results.push(result));
    if(game.damageTaken>damageBefore)damageEvents.push({tick,elapsed:game.elapsed,healthBefore,healthAfter:game.player.health,
      damageTakenDelta:game.damageTaken-damageBefore,x:game.player.x,y:game.player.y,phase:game.phase,
      bossMechanics:{...game.bossMechanics},message:game.message,
      intersectingHazards:game.world.hazards.filter(hazard=>game.player.x<hazard.x+hazard.width&&game.player.x+game.player.width>hazard.x&&
        game.player.y<hazard.y+hazard.height&&game.player.y+game.player.height>hazard.y).map(hazard=>({...hazard}))});
    maxX=Math.max(maxX,game.player.x);
    if(tick%60===0||game.phase!==previousPhase){samples.push({tick,...observe(game)});previousPhase=game.phase;}
    const progress=JSON.stringify([Math.round(game.player.x/20),Math.round(game.player.y/20),game.phase,game.kills,game.scans,
      game.recoveryNodes.filter(item=>item.recovered).length,Math.round(game.boss.health)]);
    unchangedSeconds=progress===previousProgress?unchangedSeconds+1/60:0;previousProgress=progress;
    if(unchangedSeconds>=40)break;
    for(const value of [game.player.x,game.player.y,game.player.health,game.elapsed])assert.ok(Number.isFinite(value),'finite native runtime');
  }
  const final=observe(game),status=game.phase==='finished'&&results.some(result=>result.outcome==='success')?'NATIVE_SIMULATION_SUCCESS':
    game.phase==='dead'?'CONTROLLER_DIED':unchangedSeconds>=40?'CONTROLLER_STALLED':'BUDGET_EXHAUSTED';
  const stem=path.basename(output,'.json')+'-'+mission.id+'-'+strategy;
  await writeFile(path.join(path.dirname(output),stem+'-inputs.json'),JSON.stringify(trace,null,2)+'\n');
  await writeFile(path.join(path.dirname(output),stem+'-samples.json'),JSON.stringify(samples,null,2)+'\n');
  const attempt={missionId:mission.id,status,initial,final,maxX,worldSha256AtAdmission:initialWorld,originalEnemyIds,damageEvents,
    nativeResults:results,inputs:{file:stem+'-inputs.json',count:trace.length,sha256:hash(trace)},
    samples:{file:stem+'-samples.json',count:samples.length,sha256:hash(samples)},
    completedSegments:{combat:game.kills>0,allObjectives:mission.objectives.every(item=>game.completedObjectives.has(item.id)),
      apexDefeated:!game.boss.alive,trophy:game.trophyCarried,extraction:game.phase==='finished',
      activeSidecarReload:false,workshop:false,browser:false}};
  report.attempts.push(attempt);
  console.log(JSON.stringify({missionId:mission.id,status,elapsed:game.elapsed,maxX,health:game.player.health,kills:game.kills,scans:game.scans,phase:game.phase,message:game.message}));
  // Only a real native finish may advance campaign unlocks. This is a state
  // reducer call, not a browser settlement or storage-durability claim.
  if(status==='NATIVE_SIMULATION_SUCCESS'){
    Object.assign(save,api.applyMissionResult(save,results.at(-1)));
    await writeFile(path.join(path.dirname(output),stem+'-campaign-save.json'),JSON.stringify(save,null,2)+'\n');
  }
}
report.remaining='REM112-06 remains open until all eight hunts, active sidecar reload and workshop are exercised through mounted product entry points.';
report.nativeSuccesses=report.attempts.filter(attempt=>attempt.status==='NATIVE_SIMULATION_SUCCESS').length;
if(!campaignSource&&report.nativeSuccesses===8)report.qualification='EIGHT_NATIVE_SIMULATION_SUCCESSES_ONLY';
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log('Campaign attempt report: '+output);
if(args.includes('--require-complete'))assert.equal(report.qualification,'EIGHT_NATIVE_SIMULATION_SUCCESSES_ONLY','all eight missions must complete in this fresh native-simulation chain');
