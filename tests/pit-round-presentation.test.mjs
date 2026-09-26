import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
const compiled = await build({stdin:{contents:"export * from './app/game/systems/pitRoundPresentation'; export {createPitCombatState} from './app/game/systems/pitCombat';",loader:"ts",resolveDir:process.cwd()},bundle:true,write:false,platform:"node",format:"cjs",logLevel:"silent"});
const evaluated={exports:{}};
new Function("require","module","exports",compiled.outputFiles[0].text)(createRequire(import.meta.url),evaluated,evaluated.exports);
const {createPitCombatState,createPitRoundPresentation,observePitRoundPresentation,advancePitRoundPresentation,canPitPresentationAcceptInput,PIT_PRESENTATION_INTRO_MS,PIT_PRESENTATION_RESULT_MS}=evaluated.exports;
const tick=(view,combat,ms)=>{for(let remaining=ms;remaining>0;remaining-=100)view=advancePitRoundPresentation(view,combat,Math.min(remaining,100));return view;};
const fight=()=>createPitCombatState('jungle-hunter','city-hunter');

test('both introductions and all countdown digits finish before combat without changing engine state',()=>{
 const combat=fight(),before=structuredClone(combat);let view=createPitRoundPresentation(combat);
 assert.equal(view.phase,'intro-left');assert.equal(view.fighterSlot,0);assert.equal(view.blocksSimulation,true);assert.equal(canPitPresentationAcceptInput(view),false);
 view=tick(view,combat,PIT_PRESENTATION_INTRO_MS);assert.equal(view.phase,'intro-right');assert.equal(view.fighterSlot,1);
 view=tick(view,combat,PIT_PRESENTATION_INTRO_MS);assert.equal(view.phase,'countdown');assert.equal(view.countdown,3);
 view=tick(view,combat,1000);assert.equal(view.countdown,2);view=tick(view,combat,1000);assert.equal(view.countdown,1);
 view=tick(view,combat,900);assert.equal(view.blocksSimulation,true);view=tick(view,combat,100);assert.equal(view.phase,'fight');assert.equal(view.blocksSimulation,false);assert.equal(canPitPresentationAcceptInput(view),true);
 assert.deepEqual(combat,before,'presentation cannot advance frame, health, CPU or timer');
});
test('frozen, hidden or loading clock consumes no elapsed time and a resumed large delta is bounded',()=>{
 const combat=fight();let view=createPitRoundPresentation(combat);view=tick(view,combat,300);
 assert.strictEqual(advancePitRoundPresentation(view,combat,60000,true),view);
 for(const delta of [NaN,Infinity,-100,0])assert.strictEqual(advancePitRoundPresentation(view,combat,delta),view);
 assert.equal(advancePitRoundPresentation(view,combat,60000).elapsedMs,400);
});
test('round result keeps the historical transition available, blocks live input and prepares only the next round',()=>{
 const combat=fight();combat.phase='round-over';combat.fighters[0].health=0;combat.lastRoundResult={round:1,winnerId:'city-hunter',reason:'ko',frame:200};combat.transitionFramesRemaining=120;
 let view=observePitRoundPresentation({ ...createPitRoundPresentation(fight()),phase:'fight',blocksSimulation:false },combat);
 assert.equal(view.phase,'round-result');assert.equal(view.winnerSlot,1);assert.equal(view.durationMs,2000);assert.equal(view.blocksSimulation,false);assert.equal(canPitPresentationAcceptInput(view),false);
 view=tick(view,combat,2000);assert.equal(view.phase,'round-result','wall time cannot invent an engine round');assert.equal(combat.transitionFramesRemaining,120);
 combat.phase='round';combat.round=2;view=observePitRoundPresentation(view,combat);assert.equal(view.phase,'countdown');assert.equal(view.countdown,3);assert.equal(view.blocksSimulation,true);
});
test('final result is withheld for its ceremony while the terminal engine snapshot stays exact',()=>{
 const combat=fight();combat.phase='match-over';combat.matchWinnerId='jungle-hunter';combat.fighters[0].roundsWon=2;
 const before=structuredClone(combat);let view=createPitRoundPresentation(combat);
 assert.equal(view.phase,'match-result');assert.equal(view.winnerSlot,0);assert.equal(view.resultVisible,false);assert.equal(view.blocksSimulation,true);
 view=tick(view,combat,PIT_PRESENTATION_RESULT_MS-100);assert.equal(view.resultVisible,false);
 assert.strictEqual(advancePitRoundPresentation(view,combat,100,true),view);
 view=tick(view,combat,100);assert.equal(view.resultVisible,true);assert.equal(canPitPresentationAcceptInput(view),false);assert.deepEqual(combat,before);
});
test('a draw shows neither fighter as the winner',()=>{
 const combat=fight();combat.phase='round-over';combat.fighters.forEach(f=>f.health=0);combat.lastRoundResult={round:1,winnerId:null,reason:'double-ko',frame:200};
 assert.equal(createPitRoundPresentation(combat).winnerSlot,null);
});
test('legacy mirror snapshots are disambiguated without arbitrarily awarding slot one',()=>{
 const combat=fight();combat.fighters[1].definitionId=combat.fighters[0].definitionId;combat.phase='round-over';combat.fighters[0].health=0;
 combat.lastRoundResult={round:1,winnerId:combat.fighters[0].definitionId,reason:'ko',frame:200};assert.equal(createPitRoundPresentation(combat).winnerSlot,1);
 combat.phase='match-over';combat.matchWinnerId=combat.fighters[0].definitionId;combat.fighters[0].roundsWon=1;combat.fighters[1].roundsWon=2;assert.equal(createPitRoundPresentation(combat).winnerSlot,1);
 combat.fighters[0].roundsWon=2;combat.fighters[0].health=combat.fighters[1].health;assert.equal(createPitRoundPresentation(combat).winnerSlot,null);
});
test('the exact-tick training lab and selection have no cinematic transport',()=>{
 const combat=createPitCombatState('jungle-hunter','city-hunter',{mode:'training'});const view=createPitRoundPresentation(combat);
 assert.equal(view.phase,'fight');assert.equal(view.elapsedMs,view.durationMs);assert.equal(view.blocksSimulation,false);
 const idle=observePitRoundPresentation(view,null);assert.equal(idle.phase,'idle');assert.equal(idle.blocksSimulation,true);assert.strictEqual(observePitRoundPresentation(idle,null),idle);
});
