/** Find an identity without depending on its current roster page. */
export async function choosePitFighter(page, fighter) {
  const flow = page.locator('[data-pit-selection-step="fighters"]');
  const option = flow.locator(`[role="option"][data-choice-id="${fighter}"]`);
  if (!(await option.count())) {
    const search = flow.locator('[data-pit-roster-search]');
    if (await search.count()) await search.fill(fighter);
  }
  await option.click();
}

/** Pagination keeps at most24 full-resolution stage thumbnails mounted. */
export async function choosePitStage(page, arena) {
  const flow = page.locator('[data-pit-selection-step="stage"]');
  const option = flow.locator(`[role="option"][data-choice-id="${arena}"]`);
  for (let pageIndex = 0; pageIndex < 12 && !(await option.count()); pageIndex++) {
    const previous = flow.locator('[data-pit-stage-page-prev]');
    if (!(await previous.count()) || await previous.isDisabled()) break;
    await previous.click();
  }
  for (let pageIndex = 0; pageIndex < 12 && !(await option.count()); pageIndex++) {
    const next = flow.locator('[data-pit-stage-page-next]');
    if (!(await next.count()) || await next.isDisabled()) break;
    await next.click();
  }
  await option.click();
}

/** Drive the public roster/stage UI, preserving legacy recipes on older releases. */
export async function selectPitMatch(page, { player, opponent, arena, launch = true }) {
  await closePitSelectionOptions(page);
  if (await page.locator('[data-pit-selection-step]').count()) {
    const select = page.locator('[data-pit-selection-step]');
    await choosePitFighter(page, player);
    await select.locator('[data-pit-selection-confirm]').click();
    if (opponent) await choosePitFighter(page, opponent);
    await select.locator('[data-pit-selection-confirm]').click();
    if (arena) await choosePitStage(page, arena);
    await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
    if (launch) await select.locator('[data-pit-selection-confirm]').click();
  } else {
    await page.getByRole('combobox', { name: 'Combattant joueur', exact: true }).selectOption(player);
    if (opponent) await page.getByRole('combobox', { name: 'Adversaire', exact: true }).selectOption(opponent);
    if (arena) await page.getByRole('combobox', { name: 'Arène', exact: true }).selectOption(arena);
    if (launch) await page.getByRole('button', { name: /^ENTRER DANS L’ARÈNE/ }).click();
  }
}

/** Public V49 pause flow, while keeping legacy browser recipes usable on V48. */
export async function openPitPause(page) {
  const menu = page.locator('[data-pit-pause-menu]');
  if (!(await menu.count()) || await menu.isVisible()) return;
  await page.locator('[data-pit-menu-button]').click();
  await menu.waitFor({ state: 'visible' });
}

export async function resumePitFight(page) {
  const menu = page.locator('[data-pit-pause-menu]');
  if (await menu.count() && await menu.isVisible()) await menu.locator('[data-pit-resume]').click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Combat THE PIT');
}

export async function returnPitSelection(page) {
  if (await page.locator('[data-pit-immersive]').count()) {
    await openPitPause(page);
    await page.getByRole('button', { name: 'Retour à la sélection', exact: true }).click();
  } else await page.getByRole('button', { name: /^Quitter ·/ }).click();
}

export async function openPitLaboratory(page) {
  const lab = page.getByRole('complementary', { name: 'Laboratoire d’entraînement', exact: true });
  if (await lab.isVisible()) return;
  const shortcut = page.getByRole('button', { name: 'Labo', exact: true });
  if (await shortcut.count()) await shortcut.click();
  else await page.getByRole('button', { name: 'Laboratoire', exact: true }).click();
  await lab.waitFor({ state: 'visible' });
}

/** V50 keeps secondary selection controls inside a native modal; legacy pages do not. */
export async function openPitSelectionOptions(page) {
  const trigger = page.locator("[data-pit-options-open]");
  if (!(await trigger.count())) return;
  const dialog = page.locator("[data-pit-selection-options]");
  if (await dialog.evaluate(node => node.open)) return;
  await trigger.click();
  await dialog.waitFor({ state: "visible" });
}

export async function closePitSelectionOptions(page) {
  const dialog = page.locator("[data-pit-selection-options]");
  if (!(await dialog.count()) || !(await dialog.evaluate(node => node.open))) return;
  await dialog.locator("[data-pit-options-close]").click();
  await dialog.waitFor({ state: "hidden" });
}
