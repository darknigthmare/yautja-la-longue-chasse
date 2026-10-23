/** Real selection regression: an explicitly failed device image must not lock a legacy duel. */
import {choosePitFighter,choosePitStage,openPitSelectionOptions,closePitSelectionOptions} from './pit-selection-browser-helpers.mjs';

export async function runPitSelectionAssetJourneyV107(h) {
 const {newPage,enterPit,read,check,shot,closePage,pauseClock,driveUntil}=h;
 await newPage('device-art-failure-legacy-selection');
 const page=h.getPage();
 await page.route('**/scar-shuriken-flight-v107.png*',route=>route.abort('failed'));
 await enterPit();await page.getByRole('radio',{name:/^Versus local/}).click();
 for(const id of ['feral-hunter','scar']){await choosePitFighter(page,id);await page.locator('[data-pit-variant-select]').selectOption('');await page.locator('[data-pit-selection-confirm]').click();}
 await openPitSelectionOptions(page);await page.locator('[data-pit-workbook-combat-v107]').check();
 await page.getByText('Une image de dispositif manque.',{exact:false}).waitFor();
 await closePitSelectionOptions(page);
 check('A deliberately failed device image blocks the source recipe that actually needs it',await page.locator('[data-pit-selection-confirm]').isDisabled());
 await page.getByRole('button',{name:/^Retour aux combattants/}).click();
 await page.locator('[data-pit-variant-select]').selectOption('scar-avec-casque-6a0a69930d');
 await page.getByRole('button',{name:/^J1\s/}).click();
 await page.locator('[data-pit-variant-select]').selectOption('feral-avec-casque-b99fbf82fe');
 check('Changing both appearances to legacy-only ownership releases the irrelevant failed device gate',await page.locator('[data-pit-selection-confirm]').isEnabled());
 await page.locator('[data-pit-selection-confirm]').click();await page.locator('[data-pit-selection-confirm]').click();
 await openPitSelectionOptions(page);
 check('Device controls disappear when neither appearance owns the source recipe',await page.locator('[data-pit-workbook-combat-v107]').count()===0);
 await closePitSelectionOptions(page);await choosePitStage(page,'the-pit');
 await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
 await pauseClock();await page.locator('[data-pit-selection-confirm]').click();
 await driveUntil(s=>s.phase==='fight'&&s.blocked==='false','legacy duel after irrelevant device failure',120000,100);
 const state=await read();
 check('The public start callback actually launches a legacy duel despite the failed V107 image',state.recipe==='historical'&&state.devices.length===0);
 await shot('00-device-art-failure-legacy-duel.png');
 h.observations.push({kind:'irrelevant-device-art-failure',description:'Declared network abort for the independent star PNG; both selected masked appearances lack workbook ownership. No combat state or image pixels injected.',state});
 await closePage();
}
