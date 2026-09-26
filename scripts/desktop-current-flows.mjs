import assert from 'node:assert/strict';

/** The controlled clock only advances real game code. It never changes a phase. */
export async function advanceDesktopUntil(page, predicate, label, { step = 50, maxMs = 20000 } = {}) {
  for (let elapsed = 0; elapsed <= maxMs; elapsed += step) {
    if (await predicate()) return;
    await page.clock.runFor(step);
  }
  throw new Error(`Desktop game did not reach ${label} within ${maxMs} simulated ms.`);
}

export async function verifyDesktopNewCampaign(page, capture, checks) {
  const menu = page.locator('[data-campaign-menu="main"]');
  await menu.waitFor();
  assert(await page.getByRole('button', { name: /^Continuer/ }).isDisabled());
  assert(await page.getByRole('button', { name: /^Charger une partie/ }).isDisabled());
  await page.locator('[data-campaign-scenery]').evaluate(image => image.decode());
  const bounds = await menu.evaluate(node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight, scrollWidth: document.documentElement.scrollWidth };
  });
  assert.equal(bounds.x, 0); assert.equal(bounds.y, 0);
  assert.equal(bounds.width, bounds.vw); assert.equal(bounds.height, bounds.vh);
  assert(bounds.scrollWidth <= bounds.vw);
  await capture('campaign-main-pc.png');
  await page.getByRole('button', { name: /^Nouvelle partie/ }).click();
  assert.equal(await page.locator('[data-campaign-slot]').count(), 5);
  await page.locator('[data-campaign-slot="5"]').click();
  await page.getByLabel('Nom du chasseur', { exact: true }).fill('QA PC V52');
  await capture('campaign-create-pc.png');
  await page.getByLabel('Nom du chasseur', { exact: true }).press('Enter');
  await page.locator('[data-nursery-prologue]').waitFor();
  assert.equal(await page.locator('[data-campaign-session]').getAttribute('data-campaign-session'), '5');
  const owner = await page.locator('[data-campaign-owner]').getAttribute('data-campaign-owner');
  assert(owner); assert.equal(await page.locator('.physical-deck-screen').count(), 0);
  await page.getByRole('button', { name: 'Pause et commandes', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer et revenir au menu', exact: true }).click();
  await menu.waitFor();
  await page.getByRole('button', { name: /^Charger une partie/ }).click();
  await page.locator('[data-campaign-slot="5"]').click();
  assert.equal(await page.locator('[data-checkpoint-id]').count(), 12);
  assert.equal(await page.locator('[data-checkpoint-id^="manual-"]').count(), 10);
  assert.equal(await page.locator('[data-checkpoint-id^="auto-"]').count(), 2);
  await capture('campaign-checkpoints-pc.png');
  const checkpoint = page.locator('[data-checkpoint-id]:not(:disabled)').first();
  await checkpoint.click();
  await page.getByRole('dialog', { name: 'Charger ce checkpoint ?' }).waitFor();
  await page.getByRole('button', { name: 'Confirmer le chargement', exact: true }).click();
  await page.locator('[data-nursery-prologue]').waitFor();
  assert.equal(await page.locator('[data-campaign-owner]').getAttribute('data-campaign-owner'), owner);
  checks.push('Fresh PC profile: immersive V50 menu, five slots, real nursery start, 10 manual + 2 automatic checkpoints and exact-owner restore.');
}

export async function verifyDesktopPitIntro(page, capture, checks) {
  const read = () => page.locator('[data-pit-immersive]').evaluate(node => ({
    phase: node.dataset.pitPresentationPhase,
    blocked: node.dataset.pitPresentationBlocked,
    simulationBlocked: node.dataset.pitPresentationSimulationBlocked,
    countdown: node.dataset.pitPresentationCountdown,
    frame: Number(node.querySelector('[data-pit-frame]')?.dataset.pitFrame),
    positions: node.querySelector('canvas[data-pit-fighter-positions]')?.dataset.pitFighterPositions,
    effects: node.querySelector('canvas')?.dataset.pitCombatEffects,
  }));
  await page.locator('[data-pit-immersive]').waitFor();
  const phases = new Set(), counts = new Set();
  await advanceDesktopUntil(page, async () => await page.locator('[data-pit-match-loading]').count() === 0 && await page.locator('canvas[data-pit-arena-art-status="bitmap"]').count() === 1, 'offline combat bitmaps');
  const before = await read();
  assert.notEqual(before.phase, 'fight', 'A new duel must not start directly in gameplay.');
  await page.getByRole('region', { name: 'Combat THE PIT', exact: true }).focus();
  await page.keyboard.down('ArrowRight');
  try {
    await advanceDesktopUntil(page, async () => {
      const state = await read(); phases.add(state.phase);
      if (state.countdown) counts.add(state.countdown);
      if (state.phase === 'fight') return true;
      assert.equal(state.blocked, 'true'); assert.equal(state.simulationBlocked, 'true');
      assert.equal(state.positions, before.positions, 'Held movement cannot move actors during introductions.');
      assert.equal(state.frame, before.frame, 'Presentation must not advance simulation.');
      assert.equal(state.effects, 'false', 'Combat effects must stay absent during ceremony.');
      return false;
    }, 'both intros, 3/2/1 and fight', { step: 80 });
  } finally { await page.keyboard.up('ArrowRight'); }
  for (const phase of ['intro-left', 'intro-right', 'countdown', 'fight']) assert(phases.has(phase), phase);
  for (const count of ['3', '2', '1']) assert(counts.has(count), count);
  // An input held through the gate must be released and pressed again.
  await page.clock.runFor(100);
  const armed = await read(); assert.equal(armed.blocked, 'false');
  await capture('pit-intro-completed-pc.png');
  checks.push('Offline PIT: both animated introductions and 3/2/1 observed; held movement, combat simulation and effects blocked until the real fight phase.');
}
