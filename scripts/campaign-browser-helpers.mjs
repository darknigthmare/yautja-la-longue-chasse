import {build} from 'esbuild';
let fixturePromise;
export async function campaignFixture() {
  fixturePromise??=(async()=>{
    const bundle=await build({stdin:{contents:"export {defaultSave,SAVE_STORAGE_KEY} from './app/game/save.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
    const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
    return {key:api.SAVE_STORAGE_KEY,save:api.defaultSave('2026-09-20T00:00:00.000Z')};
  })();
  return fixturePromise;
}
// Only for an isolated QA browser context. Existing campaign fixtures are kept.
// A legacy fixture intentionally exercises migration; new players use identity/briefing.
export async function enterCampaignDeck(page,{url='http://127.0.0.1:4174'}={}) {
  const fixture=await campaignFixture();
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},fixture);
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor({timeout:60000});
}
