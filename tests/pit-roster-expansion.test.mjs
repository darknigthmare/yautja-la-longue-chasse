import assert from 'node:assert/strict';import test from 'node:test';import{build}from'esbuild';
const bundle=await build({stdin:{contents:['pitRosterExpansion','pitFirstEdition','pitCombat','pitReplay','pitArcade','pitCircuit'].map(n=>`export * from './app/game/systems/${n}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});const p=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const first=['jungle-hunter','city-hunter','scar','celtic','wolf','feral-hunter','berserker','falconer','scarface','valkyrie','witch','enforcer'];
test('duel expansion never mutates twelve first-edition progression identities',()=>{assert.deepEqual(p.PIT_FIRST_EDITION_FIGHTER_IDS,first);assert.deepEqual(p.PIT_PLAYABLE_FIGHTER_IDS,first);assert.deepEqual(Object.keys(p.PIT_ARCADE_LADDERS),first);assert.deepEqual(Object.keys(p.PIT_CLAN_CIRCUITS),first);assert.deepEqual(p.PIT_EXPANSION_FIGHTER_IDS,['tracker','greyback']);assert.deepEqual(p.PIT_VERSUS_FIGHTER_IDS,[...first,'tracker','greyback']);for(const id of ['tracker','greyback']){for(const mode of ['cpu','local','training'])assert(p.canPitFighterEnterMode(id,mode));for(const mode of ['arcade','circuit','descent'])assert.equal(p.canPitFighterEnterMode(id,mode),false);assert.equal(p.PIT_ARCADE_LADDERS[id],undefined);assert.equal(p.PIT_CLAN_CIRCUITS[id],undefined);assert.equal(p.PIT_ARCADE_COSMETICS[id],undefined);assert.equal(p.PIT_EXPANSION_FIGHTERS[id].rivalId,null);assert.equal(p.PIT_EXPANSION_FIGHTERS[id].progressionAvailable,false);}assert.equal(p.isPitVersusFighterId('golden-angel'),false);assert.equal(p.isPitVersusFighterId('kok-warlord'),false);assert.equal(p.canPitFighterEnterMode('constructor','cpu'),false);});
test('own combat profiles preserve old unmasked Greyback identity and no invented projectiles',()=>{assert.equal(p.PIT_EXPANSION_FIGHTERS.greyback.variantId,'predator2-1990-elder-unmasked-flintlock');assert.equal(p.PIT_EXPANSION_FIGHTERS.tracker.variantId,'predators-2010-v5-presentation');for(const id of ['tracker','greyback']){assert.equal(p.PIT_FIGHTERS[id].id,id);assert.equal(p.PIT_FIGHTERS[id].technique.trigger,'counter');assert.equal(p.PIT_FIGHTERS[id].technique.motion,'attached');assert(p.PIT_FIGHTERS[id].attacks.heavy.knockdown);assert.equal(p.PIT_FIGHTERS[id].attacks.heavy.antiAir,false);}assert.notDeepEqual(p.PIT_FIGHTERS.tracker.attacks,p.PIT_FIGHTERS.greyback.attacks);});
for(const fighters of [['tracker','greyback'],['greyback','tracker']])test('complete real deterministic duel and replay '+fighters.join(' / '),()=>{const recorder=p.createPitReplayRecorder({fighters,seed:419});let state=p.createPitCombatState(...fighters);for(let tick=0;tick<12000&&state.phase!=='match-over';tick++){let inputs=[{},{}];if(state.phase==='round'){const[a,b]=state.fighters;const distance=b.x-a.x;if(distance>60)inputs=[{right:true},{}];else if(b.phase!=='knockdown'&&b.wakeInvulnerabilityFrames===0&&a.phase==='idle')inputs=[{attack:'heavy'},{}];}recorder.append(inputs);state=p.stepPitCombat(state,inputs);}assert.equal(state.phase,'match-over');assert.equal(state.matchWinnerId,fighters[0]);const replay=recorder.finish();assert.deepEqual(replay.fighters,fighters);const decoded=p.deserializePitReplay(p.serializePitReplay(replay));assert.equal(p.serializePitCombat(p.playPitReplay(decoded)),p.serializePitCombat(state));const tampered=structuredClone(replay);tampered.fighters[0]='unknown-hunter';assert.equal(p.normalizePitReplay(tampered),null);});

test('controller navigation skips unavailable chronicles and wraps without trapping expansion hunters',()=>{
 for(const id of ['tracker','greyback']){
  assert.equal(p.cyclePitMode('training',1,id),'cpu');
  assert.equal(p.cyclePitMode('cpu',-1,id),'training');
  assert.equal(p.cyclePitMode('local',1,id),'training');
  assert.equal(p.cyclePitMode('local',-1,id),'cpu');
  assert.equal(p.cyclePitMode('arcade',1,id),'cpu');
 }

 const historicalModes=['cpu','local','training','arcade','circuit','descent'];
 for(const id of first)for(let index=0;index<historicalModes.length;index++){
  assert.equal(p.cyclePitMode(historicalModes[index],1,id),historicalModes[(index+1)%6]);
  assert.equal(p.cyclePitMode(historicalModes[index],-1,id),historicalModes[(index+5)%6]);
 }
 assert.equal(p.cyclePitMode('training',1,'jungle-hunter'),'arcade');
 assert.equal(p.cyclePitMode('cpu',-1,'jungle-hunter'),'descent');
 assert.equal(p.cyclePitMode('cpu',1,'unknown-hunter'),'cpu');
});
