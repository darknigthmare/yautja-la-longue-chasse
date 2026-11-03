import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/game/systems/pitCombat';export * from './app/game/systems/pitReplay';export * from './app/game/systems/pitSave';export * from './app/game/systems/pitRosterExpansion';export * from './app/game/pitCombatBitmapArt';export * from './app/game/pitSpriteSheetAnimation';export * from './app/game/pitSpriteSheetRegistry';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text + String.fromCharCode(10) + '//# sourceURL=pit-human-duelists-v39.bundle.js').toString('base64'));
const humans=['theta','machiko-noguchi'];
for(const id of humans){
 test(id+' has a distinct duel identity without a Yautja plate or invented campaign progress',()=>{
  assert(p.isPitExpansionFighterId(id));assert(p.PIT_VERSUS_FIGHTER_IDS.includes(id));
  assert.equal(p.getPitCombatBitmapArtDefinition(id),null);
  assert.equal(p.getPitCombatBitmapArtStatus(null,id),"loading");
  assert.equal(p.getPitCombatBitmapArtStatus({requestedIds:new Set([id]),failedIds:new Set([id]),readyIds:new Set(),images:new Map(),cancelled:false},id),"missing");
  assert.equal(p.getPitFighterProfile(id).progressionAvailable,false);
  for(const mode of ['cpu','local','training'])assert(p.canPitFighterEnterMode(id,mode));
  for(const mode of ['arcade','circuit','descent'])assert.equal(p.canPitFighterEnterMode(id,mode),false);
  assert.equal(p.PIT_FIGHTERS[id].technique.motion,'attached');
  assert.equal(p.PIT_FIGHTERS[id].technique.trigger,'counter');
  assert(!p.PIT_PLAYABLE_FIGHTER_IDS.includes(id));
 });
 test(id+' has a camera envelope for all native drawings even without a static plate',()=>{
  const fighter=p.createPitCombatState(id,'jungle-hunter').fighters[0];fighter.x=350;
  for(const facing of [-1,1]){fighter.facing=facing;
   const bounds=p.getPitCombatBitmapVisualBounds(fighter,410);
   assert(bounds&&bounds.width>p.PIT_FIGHTERS[id].bodyWidth&&bounds.height>p.PIT_FIGHTERS[id].bodyHeight);
   assert.deepEqual(bounds,p.getPitSpriteSheetAnimationVisualBounds(fighter,410,p.PIT_SPRITE_SHEET_REGISTRY));
   assert(bounds.x<fighter.x&&bounds.x+bounds.width>fighter.x);
  }
  fighter.x=NaN;assert.equal(p.getPitCombatBitmapVisualBounds(fighter,410),null);
 });
}
for(const fighters of [['theta','machiko-noguchi'],['machiko-noguchi','theta']])test('human duel survives replay encode/decode with real victory: '+fighters.join('/'),()=>{
 const recorder=p.createPitReplayRecorder({fighters,seed:3901});let state=p.createPitCombatState(...fighters);
 for(let tick=0;tick<16000&&state.phase!=='match-over';tick++){
  const [a,b]=state.fighters;let input={};
  if(state.phase==='round'){
   if(Math.abs(b.x-a.x)>56)input={...(b.x>a.x?{right:true}:{left:true})};
   else if(a.phase==='idle'&&b.phase!=='knockdown'&&b.wakeInvulnerabilityFrames===0)input={attack:'heavy'};
  }
  recorder.append([input,{}]);state=p.stepPitCombat(state,[input,{}]);
 }
 assert.equal(state.phase,'match-over');assert.equal(state.matchWinnerId,fighters[0]);
 const replay=p.deserializePitReplay(p.serializePitReplay(recorder.finish()));
 assert.deepEqual(replay.fighters,fighters);
 assert.equal(p.serializePitCombat(p.playPitReplay(replay)),p.serializePitCombat(state));
});
