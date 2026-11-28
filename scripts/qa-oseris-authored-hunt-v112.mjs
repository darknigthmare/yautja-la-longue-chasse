import assert from 'node:assert/strict';

const hideBearing = new Set([
  'oseris-iv--vineback-grazer', 'oseris-iv--mist-pouncer',
  'oseris-iv--mirror-chameleon', 'oseris-iv--thunder-macaque',
]);
const xOf = actor => actor.x + actor.width / 2;
const yOf = actor => actor.y + actor.height / 2;
const gap = (player, enemy) => Math.abs(xOf(player) - xOf(enemy)) - (player.width + enemy.width) / 2;
const range = (actor, point) => Math.hypot(xOf(actor) - point.x, yOf(actor) - point.y);

export async function playNativeOseris({
  page, data, check, observe, campaign, disk, capture, pause, resume, reloadHunt, performTrophyRite,
}) {
  const canvas = page.locator('canvas').last();
  const held = new Map();
  const keys = {left:'ArrowLeft', right:'ArrowRight', jump:'Space', aim:'ShiftLeft', down:'ArrowDown'};
  data.controls = [];
  data.progress = [];
  const switchHeld = async (actions, state) => {
    for (const [action, key] of held) if (!actions.includes(action)) {
      await page.keyboard.up(key);
      held.delete(action);
      data.controls.push({at:state.elapsed, key, action:'up'});
    }
    for (const action of actions) if (!held.has(action)) {
      const key = keys[action];
      await page.keyboard.down(key);
      held.set(action, key);
      data.controls.push({at:state.elapsed, key, action:'down'});
    }
  };
  const press = async (key, state) => {
    await page.keyboard.press(key);
    data.controls.push({at:state.elapsed, key, action:'press'});
  };
  let priorX = 0, previousMotion = 0, hopUntil = 0;
  const travel = async (state, target, stopDistance=30) => {
    const player = state.player;
    if (Math.abs(player.x - priorX) > 1) previousMotion = state.elapsed;
    priorX = player.x;
    const dx = target - xOf(player);
    if (Math.abs(dx) < stopDistance) {
      await switchHeld([], state);
      previousMotion = state.elapsed;
      return;
    }
    if (player.grounded && state.elapsed >= hopUntil && state.elapsed - previousMotion > .7) {
      hopUntil = state.elapsed + .33;
      previousMotion = state.elapsed;
    }
    const direction = dx < 0 ? 'left' : 'right';
    await switchHeld(state.elapsed < hopUntil ? [direction,'jump'] : [direction], state);
  };
  const play = async (stage, seconds, step) => {
    let state = await observe();
    const begin = state.elapsed;
    const deadline = Date.now() + seconds * 8000;
    let nextSample = begin;
    while (state.elapsed - begin <= seconds && Date.now() < deadline) {
      if (state.elapsed >= nextSample) {
        data.progress.push({stage,time:state.elapsed,phase:state.phase,x:xOf(state.player),y:yOf(state.player),
          health:state.player.health,stamina:state.player.stamina,energy:state.player.energy,medicomps:state.player.medicomps,
          bossHealth:state.boss.health,objectives:state.objectives,enemies:state.enemies.filter(enemy=>enemy.active&&enemy.alive).map(enemy=>[enemy.id,enemy.archetype,Math.round(enemy.x),enemy.health])});
        nextSample = state.elapsed + .75;
      }
      assert.equal(state.paused,false,stage);
      assert.notEqual(state.phase,'dead',stage);
      if (await step(state)) {
        await switchHeld([],state);
        return state;
      }
      if (state.player.grounded && state.player.health < state.player.maxHealth * .58 &&
          state.player.medicomps > 0 && state.player.healCooldown <= 0) {
        await press('KeyH',state);
      }
      await page.waitForTimeout(24);
      state = await observe();
    }
    await switchHeld([],state);
    throw Error(stage+' timed out after '+(state.elapsed-begin).toFixed(2)+' simulated seconds');
  };
  const threat = state => state.enemies.filter(enemy=>enemy.active&&enemy.alive&&
    Math.abs(yOf(state.player)-yOf(enemy))<116)
    .sort((a,b)=>Math.abs(xOf(a)-xOf(state.player))-Math.abs(xOf(b)-xOf(state.player)))[0];
  const melee = async (state, enemy) => {
    const player = state.player;
    const direction = xOf(enemy) < xOf(player) ? 'left' : 'right';
    const facingEnemy = player.facing === (direction==='left'?-1:1);
    if (gap(player,enemy)>40 || !facingEnemy) {
      await switchHeld([direction],state);
    } else {
      await switchHeld([],state);
      if (!enemy.scanned && player.scanCooldown<=0 && player.energy>=8) await press('KeyV',state);
      if (player.stamina>=15 && player.melee.phase==='idle' && player.melee.defensePhase==='neutral') {
        await press('KeyJ',state);
      }
    }
  };

  const initial = await observe();
  assert.equal(initial.phase,'tracking');
  assert.ok(Math.abs(initial.player.x-initial.world.spawn.x)<3);
  assert.deepEqual(initial.rites.corpses,[]);
  assert.deepEqual(initial.rites.specimensV112,[]);
  assert.equal(initial.boss.active,false);
  assert.equal(initial.boss.health,initial.boss.maxHealth);
  assert.ok(initial.enemies.length>0 && initial.enemies.every(enemy=>enemy.alive&&enemy.health===enemy.maxHealth));
  assert.equal((await page.evaluate(()=>window.__skinningCanopyQaV112.setups)).length,0);
  await canvas.focus();
  let prey, cargo, secondary;
  await check('Admit Oseris and defeat an authored, live, harvestable enemy with native melee',async()=>{
    const seen = new Map(initial.enemies.map(enemy=>[enemy.id,enemy]));
    const defeated = await play('live field prey and tracking',48,async state=>{
      for (const enemy of state.enemies) if (enemy.alive && enemy.active && !seen.has(enemy.id)) seen.set(enemy.id,enemy);
      const candidate = state.rites.corpses.find(corpse=>hideBearing.has(corpse.sourceEnemyId)&&
        state.secondaryDrops.some(drop=>drop.enemyRuntimeId===corpse.id)&&seen.has(corpse.id));
      if (candidate) {
        prey = candidate;
        return true;
      }
      const near = threat(state);
      if (near && gap(state.player,near)<155) {
        await melee(state,near);
        return false;
      }
      const trace = state.scanNodes.find(node=>!node.scanned);
      if (trace && range(state.player,trace)<410 && state.player.scanCooldown<=0) await press('KeyV',state);
      const fieldEnemy = state.enemies.filter(enemy=>enemy.active&&enemy.alive&&hideBearing.has(enemy.archetype))
        .sort((a,b)=>Math.abs(xOf(a)-xOf(state.player))-Math.abs(xOf(b)-xOf(state.player)))[0];
      const target = fieldEnemy && (!trace || Math.abs(xOf(fieldEnemy)-xOf(state.player))<440)
        ? xOf(fieldEnemy) : trace?.x ?? (near ? xOf(near) : state.world.width*.49);
      await travel(state,target,15);
      return false;
    });
    const defeat = defeated.enemies.find(enemy=>enemy.id===prey.id);
    assert.equal(defeat.alive,false);
    assert.equal(defeat.health,0);
    await capture('01-native-authored-prey-felled');
    return {preset:initial.encounterRun,source:seen.get(prey.id),defeat,corpse:prey};
  });
  await check('Claim and skin the same defeated enemy using the field controls',async()=>{
    const reachCorpse = state => state.rites.corpses.find(corpse=>corpse.id===prey.id);
    await play('secure field work position',18,async state=>{
      const corpse=reachCorpse(state);
      const closeThreat=threat(state);
      if (closeThreat && gap(state.player,closeThreat)<150) {
        await melee(state,closeThreat);
        return false;
      }
      if (state.player.grounded && Math.abs(xOf(state.player)-corpse.x)<28 &&
          Math.abs(state.player.y+state.player.height-corpse.y)<26) return true;
      await travel(state,corpse.x,16);
      return false;
    });
    const campaignBefore = await campaign();
    await press('KeyE',await observe());
    await page.waitForFunction(id=>window.__skinningCanopyQaV112.runtime.game.regularTrophyDropId==='regular-trophy-'+id,prey.id,{timeout:5000});
    const gestures = await performTrophyRite();
    const claimed = await observe();
    const drop = claimed.secondaryDrops.find(item=>item.enemyRuntimeId===prey.id);
    assert.equal(drop.collected,true);
    secondary=drop.claim;
    const menu = page.locator('[data-hunt-rites-v77][data-corpse-id="'+prey.id+'"]');
    await menu.getByRole('button',{name:'Examiner la proie vaincue',exact:true}).click();
    await menu.locator('[data-rite-action-v112="analyze"]').click();
    await page.waitForFunction(id=>window.__skinningCanopyQaV112.state().rites.corpses.find(item=>item.id===id)?.analyzed,prey.id);
    await menu.locator('[data-rite-action-v112="flay"]').click();
    await page.waitForFunction(id=>window.__skinningCanopyQaV112.state().rites.corpses.find(item=>item.id===id)?.flayed,prey.id,{timeout:15000});
    const reopen = menu.getByRole('button',{name:'Examiner la proie vaincue',exact:true});
    if (await reopen.count()) await reopen.click();
    await menu.locator('[data-rite-action-v112="harvest-hide"]').click();
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.state().rites.specimensV112.length===1,null,{timeout:15000});
    const loaded=await observe();
    [cargo]=loaded.rites.specimensV112;
    assert.equal(cargo.stage,'raw');
    assert.equal(cargo.speciesId,prey.sourceEnemyId);
    assert.ok(loaded.fieldLoad.movementMultiplier<1 && loaded.fieldLoad.climbStaminaMultiplier>1);
    assert.deepEqual((await campaign()).inventory.harvestV112,campaignBefore.inventory.harvestV112);
    await capture('02-native-same-prey-trophy-and-hide');
    return {secondary,cargo,loaded:loaded.fieldLoad,gestures};
  });
  const assertCargo = state => {
    assert.deepEqual(state.rites.specimensV112,[cargo]);
    assert.deepEqual(state.secondaryDrops.filter(item=>item.collected).map(item=>item.claim),[secondary]);
    assert.ok(state.fieldLoad.movementMultiplier<1);
  };
  await check('Restore the loaded hunter and the same native enemy death in a fresh browser document',async()=>{
    await pause();
    const {before,after} = await reloadHunt('03-native-loaded-field');
    assertCargo(after.state);
    assert.equal(after.state.enemies.find(enemy=>enemy.id===prey.id)?.alive,false);
    assert.equal(after.state.player.x,before.sidecar.snapshot.checkpoint.player.x);
    await capture('03-native-field-load-restored');
    await resume();
    return {priorWriter:before.sidecar.runId,newWriter:after.sidecar.runId,player:after.state.player,load:after.state.fieldLoad};
  });
  await check('Scan the traces and recover the actual transponder to activate Vey',async()=>{
    const activated = await play('Oseris native objectives',75,async state=>{
      if (state.boss.active) return true;
      const hostile=threat(state);
      if (hostile && gap(state.player,hostile)<150) {
        await melee(state,hostile);
        return false;
      }
      const trace=state.scanNodes.find(node=>!node.scanned);
      if (trace && range(state.player,trace)<413) {
        await switchHeld([],state);
        if (state.player.scanCooldown<=0) await press('KeyV',state);
        return false;
      }
      const target=trace ?? state.recoveryNodes.find(node=>!node.recovered);
      if (target) {
        if (!trace && range(state.player,target)<85) {
          await switchHeld([],state);
          await press('KeyE',state);
        } else await travel(state,target.x,15);
      } else await switchHeld([],state);
      return false;
    });
    assert.ok(activated.scanNodes.every(node=>node.scanned));
    assert.ok(activated.recoveryNodes.every(node=>node.recovered));
    assert.equal(activated.boss.health,activated.boss.maxHealth);
    assertCargo(activated);
    return {traces:activated.scanNodes,transponder:activated.recoveryNodes,boss:activated.boss};
  });
  await check('Study, fight and defeat Vey under the native boss AI before claiming her insignia',async()=>{
    const opening = await observe();
    await press('Digit2',opening);
    let rangedHitsOpportunity=0, meleeOpportunities=0;
    const beaten=await play('Vey combat',95,async state=>{
      const {player,boss}=state;
      if (!boss.alive) return true;
      const hostile=threat(state);
      if (hostile && gap(player,hostile)<110) {
        await melee(state,hostile);
        meleeOpportunities++;
        return false;
      }
      const dx=xOf(boss)-xOf(player);
      if (!boss.scanned && range(player,{x:xOf(boss),y:yOf(boss)})<442 && player.scanCooldown<=0) await press('KeyV',state);
      if (boss.scanned && Math.abs(dx)<610 && Math.abs(dx)>115 && player.energy>=23) {
        await switchHeld(['aim'],state);
        const rect=await canvas.boundingBox();
        if (rect) {
          // The input dispatcher projects this pointer back into the running camera.
          const aimX=(xOf(boss)-state.camera.x)/1280;
          const aimY=(boss.y+boss.height*.47-state.camera.y)/720;
          if (aimX>.02&&aimX<.98&&aimY>.02&&aimY<.98) await page.mouse.move(rect.x+rect.width*aimX,rect.y+rect.height*aimY);
        }
        if (player.aiming && player.weaponChargeSeconds>=.65 && player.weaponCooldown<=0 &&
            player.melee.phase==='idle' && player.melee.defensePhase==='neutral') {
          await press('KeyK',state);
          rangedHitsOpportunity++;
        }
      } else if (gap(player,boss)<150) {
        await melee(state,boss);
        meleeOpportunities++;
      } else await travel(state,xOf(boss),18);
      return false;
    });
    assert.ok(rangedHitsOpportunity+meleeOpportunities>0);
    assert.equal(beaten.phase,'trophy');
    assert.equal(beaten.boss.health,0);
    assert.equal(beaten.boss.scanned,true);
    assert.equal(beaten.primaryClaim,null);
    await capture('04-native-vey-defeated');
    await play('approach the real Vey insignia',15,async state=>{
      if (state.apexInReach){await switchHeld([],state);return true;}
      await travel(state,state.apexPoint.x,14);
      return false;
    });
    await press('KeyE',await observe());
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.runtime.game.trophyExtracting,null,{timeout:5000});
    const apexGestures=await performTrophyRite();
    await page.waitForFunction(()=>window.__skinningCanopyQaV112.state().phase==='extraction');
    const secured=await observe();
    assert.equal(secured.primaryClaim?.definitionId,'trophy-vey');
    assert.equal(secured.trophyCarried,true);
    assertCargo(secured);
    return {opening:opening.boss,defeat:beaten.boss,apex:secured.primaryClaim,apexGestures,
      rangedInputs:rangedHitsOpportunity,meleeOpportunities,health:secured.player.health,damageTaken:secured.damageTaken,secondWindUsed:secured.secondWindUsed};
  });
  await check('Reach the actual beacon under load and settle the hide and both trophies once',async()=>{
    const arrival=await play('loaded beacon approach',42,async state=>{
      assertCargo(state);
      const point=state.world.extraction;
      if (Math.abs(xOf(state.player)-point.x)<34 && state.player.grounded &&
          Math.abs(state.player.y+state.player.height-point.y)<2 && state.ship?.phase==='hover') return true;
      const hostile=threat(state);
      if (hostile && gap(state.player,hostile)<78) await melee(state,hostile);
      else await travel(state,point.x,25);
      return false;
    });
    await capture('05-native-loaded-beacon');
    const prior=await campaign();
    const delivery=page.locator('.debrief-actions').getByRole('button',{name:'Retour au vaisseau',exact:true});
    await press('KeyE',arrival);
    await delivery.waitFor();
    const settled=await campaign();
    const results=await page.evaluate(()=>window.__skinningCanopyQaV112.results);
    assert.equal(results.length,1);
    assert.equal(results[0].outcome,'success');
    assert.deepEqual(results[0].specimensV112,[cargo]);
    assert.equal(results[0].trophyClaims.length,2);
    assert.deepEqual(settled.inventory.harvestV112.specimens,[cargo]);
    assert.equal(settled.inventory.harvestV112.toolUseIds.length,2);
    assert.equal(settled.inventory.harvestV112.toolCondition,prior.inventory.harvestV112.toolCondition-10);
    assert.equal(settled.missionProgress['jungle-vey'].completions,prior.missionProgress['jungle-vey'].completions+1);
    assert.equal(await disk(),null);
    await delivery.click();
    return {position:arrival.player,load:arrival.fieldLoad,delivery:results[0]};
  });
  await check('Open the native armory conservation bench and clean the same hide',async()=>{
    await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
    const shortcuts=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
    if(await shortcuts.getAttribute('aria-expanded')!=='true') await shortcuts.click();
    const direct=page.getByText(/^Accès direct aux interfaces(?: · sans déplacement du chasseur)?$/);
    if(await direct.locator('..').getAttribute('open')===null) await direct.click();
    await page.getByRole('button',{name:/^ARMURERIE.*Ouvrir l’interface/i}).first().click();
    const item=page.locator('[data-specimen-id-v112="'+cargo.id+'"]');
    await item.waitFor();
    assert.ok((await item.innerText()).includes(cargo.label));
    const before=await campaign();
    await item.getByRole('button',{name:/^Nettoyer · 2 marques/}).click();
    const action=item.getByRole('button',{name:/^Effectuer un geste/});
    for (let step=0;step<3;step++) {
      if (await item.innerText().then(value=>value.includes('Nettoyée'))) break;
      await action.click();
    }
    const after=await campaign();
    assert.equal(after.inventory.harvestV112.specimens.find(entry=>entry.id===cargo.id)?.stage,'cleaned');
    assert.equal(after.profile.clanMarks,before.profile.clanMarks-2);
    assert.equal(after.trophies.length,before.trophies.length);
    await capture('06-native-same-hide-cleaned');
    data.finalCampaign=after;
    data.finalSidecar=await disk();
    return {specimen:after.inventory.harvestV112.specimens.find(entry=>entry.id===cargo.id),tool:after.inventory.harvestV112.toolCondition};
  });
}
