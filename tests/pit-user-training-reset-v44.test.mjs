import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({stdin:{contents:`
export {createPitCombatState,PIT_FIGHTERS} from './app/game/systems/pitCombat';
export {resetPitTrainingPositions} from './app/game/systems/pitTraining';
export {PIT_USER_FIGHTER_IDS,getPitFighterVariants} from './app/game/systems/pitUserRoster';
`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {createPitCombatState,PIT_FIGHTERS,resetPitTrainingPositions,PIT_USER_FIGHTER_IDS,getPitFighterVariants} = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('training reset restores positions and resources without changing either supplied appearance', () => {
  const userId = PIT_USER_FIGHTER_IDS.find(id => getPitFighterVariants(id).length > 1);
  assert.ok(userId);
  const variants = [getPitFighterVariants('city-hunter').at(-1).id, getPitFighterVariants(userId).at(-1).id];
  const state = createPitCombatState('city-hunter', userId, {mode:'training',variants});
  state.fighters[0].health = 1;
  state.fighters[1].health = 2;
  state.fighters[0].x = 800;
  state.fighters[1].x = 810;
  const reset = resetPitTrainingPositions(state);
  assert.deepEqual(reset.fighters.map(fighter => fighter.variantId), variants);
  assert.equal(reset.fighters[0].health, PIT_FIGHTERS['city-hunter'].maxHealth);
  assert.equal(reset.fighters[1].health, PIT_FIGHTERS[userId].maxHealth);
  assert.notEqual(reset.fighters[0].x, state.fighters[0].x);
  assert.notEqual(reset.fighters[1].x, state.fighters[1].x);
  assert.deepEqual(state.fighters.map(fighter => fighter.variantId), variants);
  assert.equal(state.fighters[0].health, 1, 'the prior combat snapshot is not mutated');
});