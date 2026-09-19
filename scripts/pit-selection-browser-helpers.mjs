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
  if (await page.locator('[data-pit-selection-step]').count()) {
    const select = page.locator('[data-pit-selection-step]');
    await select.locator(`[role="option"][data-choice-id="${player}"]`).click();
    await select.locator('[data-pit-selection-confirm]').click();
    if (opponent) await select.locator(`[role="option"][data-choice-id="${opponent}"]`).click();
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
