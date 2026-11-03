import assert from 'node:assert/strict';
import { homeworldRegionNavigatorV68 as groundNavigator } from './homeworld-region-navigation-v68.mjs';

/** High-level QA journeys built entirely from the shared physical keyboard
 * navigator. Reads rendered actor/fauna positions; writes no game state. */
export function homeworldRegionNavigatorV68(page, api, options = {}) {
  const ground = groundNavigator(page, api, options);
  const scene = () => page.locator('section[data-homeworld-region-v68]');
  const regionId = async () => scene().getAttribute('data-homeworld-region-v68');
  const continueDialogue = async () => {
    const resume = scene().locator('[data-region-resume]');
    if (await resume.isVisible()) await ground.resume();
  };
  const resume = async () => { await scene().locator('[data-region-resume]').waitFor({ state: 'visible' }); await ground.resume(); };
  const guideTarget = async () => { const guide = api.HOMEWORLD_REGIONS_V68[await regionId()].residents[0]; return { x: guide.x, y: guide.y + 95 }; };
  const walkOutbound = async () => { await ground.traversePassage(); assert.equal(await scene().getAttribute('data-zone'), 'village'); };
  const readTrails = async () => {
    await ground.walkTo(await guideTarget()); await ground.interact(); await continueDialogue();
    // Follow the authored trail centre at the village threshold. This also
    // avoids a planner selecting a newly widened decorative floor corner.
    await ground.walkTo(api.HOMEWORLD_REGION_TRAIL_V68[0]);
    for (const trace of api.HOMEWORLD_REGION_TRACES_V68) { await ground.walkTo(trace); await ground.interact(); await continueDialogue(); }
  };
  const observeFauna = async () => {
    await ground.walkTo({ x: 7100, y: 2050 }); await ground.tick(1800); await ground.interact();
  };
  const phase = async () => scene().locator('[data-region-fauna]').getAttribute('data-region-fauna');
  async function waitForPhase(expected) {
    for (let index = 0; index < 100; index++) { if (await phase() === expected) return; await ground.tick(64); }
    throw new Error(`The telegraphed fauna never reached ${expected}; current ${await phase()}`);
  }
  const faunaPosition = () => scene().locator('[data-region-fauna]').evaluate(element => ({
    x: element.dataset.x ? Number(element.dataset.x) : Number.parseFloat(element.style.left) + 128,
    y: element.dataset.y ? Number(element.dataset.y) : (Number.parseFloat(element.style.top) + 185) / Math.sin(35 * Math.PI / 180),
  }));
  const challengeFauna = async () => {
    assert.equal(await phase(), 'quiet'); await ground.interact();
    for (let cycle = 0; cycle < 3; cycle++) {
      // During the warning the player leaves the charge axis. There is no
      // injected dodge count: the scene must register the avoided charge.
      await ground.walkTo({ x: 7100, y: 2450 }); await waitForPhase('recovery');
      const fauna = await faunaPosition();
      await ground.walkTo({ x: fauna.x, y: fauna.y + 110 }); await ground.interact();
      if (cycle < 2) await waitForPhase('warning');
    }
    assert.equal(await scene().locator('[data-region-fauna]').count(), 0, 'The living fauna withdraws after three timed touches');
  };
  const reportToGuide = async () => {
    for (const node of api.HOMEWORLD_REGION_TRAIL_V68.slice(0, 4).reverse()) await ground.walkTo(node);
    await ground.walkTo(await guideTarget()); await ground.interact(); await continueDialogue();
  };
  const walkReturn = async () => {
    await ground.walkTo({ x: 520, y: 2800 }); await ground.interact();
    assert.equal(await scene().getAttribute('data-zone'), 'passage');
    await ground.traversePassage();
  };
  return { ...ground, resume, walkOutbound, readTrails, observeFauna, challengeFauna, reportToGuide, walkReturn };
}
