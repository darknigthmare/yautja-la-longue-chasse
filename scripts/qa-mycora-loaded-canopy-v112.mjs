import assert from 'node:assert/strict';

const key = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', jump: 'Space' };
const center = rect => rect.x + rect.width / 2;
const feet = actor => actor.y + actor.height;
const standsOn = (player, rest) => player.grounded && Math.abs(feet(player) - rest.y) < 2 &&
  player.x < rest.x + rest.width && player.x + player.width > rest.x;

/** Revisit Mycora in the real GameClient. Only the initial corpse is staged. */
export async function playMycoraLoadedCanopy({ page, data, check, observe, campaign, disk, capture, pause, resume, reloadHunt }) {
  const initial = await observe();
  const originalCampaign = await campaign();
  const rests = initial.world.platforms.filter(p => p.id.startsWith('v112-canopy-fungal-hivemind-0-')).sort((a, b) => a.x - b.x);
  assert.equal(initial.missionId, 'fungal-hivemind');
  assert.equal(rests.length, 6);
  assert(rests.every(p => p.material === 'mycelium' && p.collision === 'one-way'));
  const grips = rests.map(p => initial.world.climbables.find(g => g.id === p.id.replace('-rest', '-grip')));
  const entry = grips[0], vine = grips[1], exit = grips.at(-1);
  assert.deepEqual([entry?.kind, vine?.kind, exit?.kind], ['tree', 'vine', 'tree']);
  const held = new Set();
  data.route = { rests, grips, spawn: initial.world.spawn };
  data.inputs = [];
  data.checkpoints = [];
  async function hold(actions, reason) {
    for (const before of held) {
      if (!actions.includes(before)) {
        await page.keyboard.up(key[before]);
        held.delete(before);
      }
    }
    for (const action of actions) {
      if (held.has(action)) continue;
      await page.keyboard.down(key[action]);
      held.add(action);
    }
    data.inputs.push({ elapsed: (await observe()).elapsed, actions, reason });
  }
  async function until(name, limit, predicate) {
    const from = (await observe()).elapsed, started = Date.now();
    let state;
    while (Date.now() - started < Math.max(limit * 6000, 30000)) {
      state = await observe();
      assert.equal(state.phase, 'tracking', name);
      assert.equal(state.paused, false, name);
      if (await predicate(state)) return state;
      if (state.elapsed - from > limit) break;
      if (state.player.grounded && state.player.health < state.player.maxHealth * 0.45 &&
          state.player.medicomps > 0 && state.player.healCooldown <= 0) await page.keyboard.press('KeyH');
      await page.waitForTimeout(25);
    }
    assert.fail(name + ' timed out at ' + JSON.stringify({ player: state?.player, elapsed: state?.elapsed, held: [...held] }));
  }
  await page.locator('canvas').last().focus();
  let cargo;
  await check('Mycora native tissue harvest from one disclosed local body at normal insertion', async () => {
    assert(Math.abs(initial.player.x - initial.world.spawn.x) < 2);
    assert.equal(initial.fieldLoad.massKg, 0);
    const setups = await page.evaluate(() => window.__skinningCanopyQaV112.setups);
    assert.equal(setups.length, 1);
    assert.equal(setups[0].sourceEnemyId, 'mycora-v--spore-hound');
    assert(setups[0].originalEnemyIds.length > 0);
    assert(setups[0].originalEnemyIds.every(id => initial.enemies.some(enemy => enemy.id === id)));
    assert(initial.world.hazards.some(h => h.damagePerSecond > 0));
    await page.getByRole('button', { name: 'Examiner la proie vaincue', exact: true }).click();
    await page.locator('[data-rite-action-v112="analyze"]').click();
    await page.waitForFunction(() => window.__skinningCanopyQaV112.state().rites.corpses[0]?.analyzed);
    const menu = page.getByRole('button', { name: 'Examiner la proie vaincue', exact: true });
    const harvest = page.locator('[data-rite-action-v112="harvest-tissue"]');
    if (!await harvest.isVisible()) await menu.click();
    await harvest.click();
    await page.waitForFunction(() => window.__skinningCanopyQaV112.state().rites.specimensV112.length === 1);
    const loaded = await observe();
    [cargo] = loaded.rites.specimensV112;
    assert.equal(cargo.label, 'Culture mycélienne canine');
    assert.equal(cargo.massKg, 0.4);
    assert.equal(cargo.volumeUnits, 1);
    assert(loaded.fieldLoad.movementMultiplier < 1 && loaded.fieldLoad.climbStaminaMultiplier > 1);
    await capture('mycora-01-tissu');
    return { cargo, load: loaded.fieldLoad };
  });
  function sameCargo(state) {
    assert.deepEqual(state.rites.specimensV112, [cargo]);
    assert.deepEqual(state.rites.stashedSpecimensV112, []);
    assert.equal(state.fieldLoad.massKg, cargo.massKg);
    assert.equal(state.fieldLoad.volumeUnits, cargo.volumeUnits);
    assert.equal(state.player.aerialBoostUsed, false);
    assert.equal(state.rites.carryingCorpseId, null);
  }
  await page.locator('canvas').last().focus();
  await page.keyboard.press('KeyC');
  await check('the loaded hunter walks to the entry tree and climbs to its original rest', async () => {
    let x = initial.player.x, latestMovement = initial.elapsed, hopUntil = 0;
    await until('walk to entry tree', 28, async state => {
      const dx = center(entry) - center(state.player);
      if (Math.abs(dx) < 12) return true;
      if (Math.abs(state.player.x - x) > 0.8) latestMovement = state.elapsed;
      x = state.player.x;
      if (state.player.grounded && Math.abs(dx) > 60 && state.elapsed >= hopUntil &&
          state.elapsed - latestMovement > 0.6) hopUntil = state.elapsed + 0.24;
      const direction = dx > 0 ? 'right' : 'left';
      const wantsJump = state.elapsed < hopUntil;
      if (!held.has(direction) || held.has('jump') !== wantsJump) {
        await hold(wantsJump ? [direction, 'jump'] : [direction], 'approach the original tree from insertion');
      }
      return false;
    });
    await hold(['up'], 'ascend the actual entry tree');
    const climbed = await until('above original entry rest', 18, state =>
      state.player.climbing && state.player.climbZoneId === entry.id && feet(state.player) <= rests[0].y - 18);
    sameCargo(climbed);
    await hold(['right'], 'release the tree to its branch');
    await until('leave entry tree', 3, state => !state.player.climbing);
    await hold([], 'settle on original crown rest');
    return { support: entry.id, player: (await until('first rest contact', 4, state => standsOn(state.player, rests[0]))).player };
  });
  async function jumpTo(rest) {
    await hold(['right', 'jump'], 'jump toward ' + rest.id);
    const landed = await until(rest.id, 5, async state => {
      if (center(state.player) >= center(rest) - 22 && held.has('right')) await hold(['jump'], 'coast above the target rest');
      return standsOn(state.player, rest);
    });
    await hold([], 'release jump on the real rest');
    sameCargo(landed);
    data.checkpoints.push({ rest: rest.id, elapsed: landed.elapsed, x: landed.player.x, y: landed.player.y });
  }
  await jumpTo(rests[1]);
  await check('the held Mycora liana preserves pendulum and harvested identity on cold restart', async () => {
    await hold(['up'], 'reach above the liana rest');
    await until('held liana', 14, state =>
      state.player.climbZoneId === vine.id && state.player.y + state.player.height * 0.28 - vine.y <= 120);
    await hold(['right'], 'activate a real pendulum');
    await until('native liana swings', 3, state => state.player.canopySwing?.supportId === vine.id);
    await hold([], 'neutralize steering before recording');
    await pause();
    const saved = await reloadHunt('mycora-02-pendule');
    assert.equal(saved.after.state.player.climbZoneId, vine.id);
    assert.deepEqual(saved.after.state.player.canopySwing, saved.before.sidecar.snapshot.checkpoint.player.canopySwing);
    assert(saved.after.state.player.canopySwing);
    sameCargo(saved.after.state);
    await capture('mycora-02-pendule');
    await resume();
    return { support: vine.id, swing: saved.after.state.player.canopySwing, cargo };
  });
  await check('directed release reaches the rest and the loaded branches lead to the terminal tree', async () => {
    await hold(['up'], 'shorten the held liana before dismounting');
    await until('release near the liana anchor', 5, state =>
      state.player.canopySwing?.supportId === vine.id && state.player.canopySwing.length <= 85 &&
      Math.abs(state.player.canopySwing.angle) < 0.45 && Math.abs(state.player.canopySwing.angularVelocity) < 1);
    await hold(['jump'], 'dismount the liana with a shallow tangent');
    await until('release liana', 3, state => !state.player.climbing);
    await hold([], 'land on the original liana rest');
    const landed = await until('loaded liana rest', 5, state => standsOn(state.player, rests[1]));
    sameCargo(landed);
    for (const rest of rests.slice(2)) await jumpTo(rest);
    await until('center on the native terminal trunk', 4, async state => {
      const dx = center(exit) - center(state.player);
      if (Math.abs(dx) < 14) return true;
      const direction = dx > 0 ? 'right' : 'left';
      if (!held.has(direction)) await hold([direction], 'align with the terminal tree');
      return false;
    });
    await hold(['down'], 'grasp the original terminal tree and descend');
    const descender = await until('descend the loaded terminal tree', 9, state => state.player.climbing &&
      state.player.climbZoneId === exit.id && feet(state.player) >= state.world.floorY - 45);
    sameCargo(descender);
    await hold(['right'], 'dismount near the corridor floor');
    await until('release the terminal trunk', 3, state => !state.player.climbing);
    await hold([], 'land clear of the tree');
    const ground = await until('native safe ground contact', 4, state => state.player.grounded &&
      Math.abs(feet(state.player) - state.world.floorY) < 2);
    sameCargo(ground);
    await pause();
    const saved = await reloadHunt('mycora-03-sol');
    sameCargo(saved.after.state);
    assert(saved.after.state.player.grounded);
    assert.equal(saved.after.state.player.climbing, false);
    assert.equal(saved.after.state.player.x, saved.before.sidecar.snapshot.checkpoint.player.x);
    assert.deepEqual(await campaign(), originalCampaign);
    assert.equal((await disk()).snapshot.checkpoint.huntRites.specimensV112.filter(item => item.id === cargo.id).length, 1);
    await capture('mycora-03-sol');
    return { support: exit.id, floor: ground.world.floorY, branchContacts: data.checkpoints, cargo, resumed: true };
  });
}
