import assert from "node:assert/strict";

export async function completeElderPassage(page, disk) {
  const button = name => page.locator("[data-elder-passage-v168]").getByRole("button", { name, exact: true });
  const waitStatus = words => page.waitForFunction(text => document.querySelector("[data-passage-status]")?.textContent.includes(text), words);
  await page.locator("[data-passage-board]").focus();
  await page.keyboard.press("ArrowUp");
  for (const name of ["Ouest","Ouest","Relever la trace ouest","Est","Est","Est","Est","Relever la trace est","Rejouer le trajet contesté"]) await button(name).click();
  await waitStatus("au même moment");
  await button("Essayer les horaires").click();
  await waitStatus("Le trajet reste impraticable");
  assert.equal((await disk()).elderPassageJudgmentV168.resolved,false);
  await page.locator("[data-elder-passage-v168] select").selectOption("3");
  await button("Essayer les horaires").click();
  await waitStatus("Les deux trajets passent");
  for (const name of ["Ouest","Ouest","Sud","Sud","Présenter l’arrangement au témoin"]) await button(name).click();
  await page.locator("[data-passage-resolved]").waitFor();
}
