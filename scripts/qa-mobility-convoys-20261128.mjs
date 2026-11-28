import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { mobilityExtensionQaGuidance } from './mobility-qa-driver.mjs';

const url = process.env.MOBILITY_CAMPAIGN_QA_URL ?? 'http://127.0.0.1:3121';
assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
const output = process.env.MOBILITY_CAMPAIGN_QA_OUTPUT ?? 'outputs/mobility-convoys/browser';
await mkdir(output, { recursive: true });
const modules = [
  "export {defaultSave, applyMissionResult, parseSaveImport, SAVE_STORAGE_KEY} from './app/game/save.ts';",
  "export {migrateLegacyCampaignSlot, saveCampaignCheckpoint, loadCampaignSlots} from './app/game/systems/campaignSlots.ts';",
  "export {MISSION_BY_ID} from './app/game/data.ts';",
  "export {applyTrophyUsageV147} from './app/game/systems/trophyUsagesV147.ts';",
  "export {createMobilityLedger} from './app/game/systems/mobility/ledger.ts';",
  "export {atMobilityForge} from './app/game/systems/mobility/access.ts';",
  "export {HOMEWORLD_BUILDINGS_V77} from './app/game/systems/homeworldWorldV77.ts';",
  "export {homeworldBuildingDoorwayV64} from './app/game/systems/homeworldGeometryV64.ts';",
  "export {homeworldInteriorForBuildingV64, isHomeworldInteriorWalkableV64, nearestHomeworldInteriorTargetV64} from './app/game/systems/homeworldInteriorsV64.ts';",
  "export {homeworldCivicWalkableV80} from './app/game/systems/homeworldCivicWorldV80.ts';",
  "export {resolveHomeworldLocationV77} from './app/game/systems/homeworldLocationV77.ts';",
].join('\n');
const options = { stdin: { contents: modules, resolveDir: process.cwd() }, bundle: true, write: false, logLevel: 'silent' };
const nodeCode = (await build({ ...options, format: 'esm', platform: 'node' })).outputFiles[0].text;
const domain = await import('data:text/javascript;base64,' + Buffer.from(nodeCode).toString('base64'));
const initCode = (await build({ ...options, format: 'iife', globalName: '__convoyFixture', platform: 'browser' })).outputFiles[0].text;
const owner = '2026-11-28T10:00:00.000Z';
const completedAt = '2026-11-28T10:30:00.000Z';
const trophyId = 'serekh-convoys-conclusion';
const mission = domain.MISSION_BY_ID['desert-sandmaw'];

function initialCampaign() {
  const fresh = domain.defaultSave(owner);
  fresh.profile = { ...fresh.profile, rankId: 'blooded', acquiredRankIdV166: 'blooded', clanMarks: 900 };
  fresh.settings.masterVolume = 0;
  fresh.mobilityV1 = { ...domain.createMobilityLedger(owner), circulationPermit: true };
  for (let id = mission.prerequisiteMissionId; id; id = domain.MISSION_BY_ID[id].prerequisiteMissionId)
    Object.assign(fresh.missionProgress[id], { status: 'completed', completions: 1 });
  fresh.missionProgress[mission.id].status = 'available';

  const settled = domain.applyMissionResult(fresh, {
    missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 82, elapsedSeconds: 780,
    completedObjectiveIds: mission.objectives.map(objective => objective.id), honorEvents: [],
    kills: 9, scans: 3, secondWindUsed: false, completedAt, trophyQuality: 'blooded',
    trophyClaims: [{ id: trophyId, definitionId: mission.trophy.id, targetName: mission.targetName,
      targetKind: 'beast', partId: mission.trophy.partId, condition: 'intact', quality: 'blooded' }],
  });
  assert.equal(settled.missionProgress[mission.id].status, 'completed');
  const trophy = settled.trophies.find(item => item.id === trophyId);
  assert(trophy);
  trophy.workshop = { completedActions: ['prepare'], bestScore: 82, lastCompletedAt: completedAt };
  const save = domain.applyTrophyUsageV147(settled, { kind: 'display', trophyId, site: 'ship' }, completedAt, { atPersonalTrophyHall: true });
  assert(save);
  const building = domain.HOMEWORLD_BUILDINGS_V77.find(item => item.id === 'deep-forge');
  const room = domain.homeworldInteriorForBuildingV64(building.id);
  const door = domain.homeworldBuildingDoorwayV64(building);
  const point = room.points.find(item => item.pointId === 'forge-service');
  const normal = door.normal ?? { x: 0, y: 1 };
  const exterior = [64, 48, 32, 16, 0].map(distance => ({
    x: door.approach.x + normal.x * distance, y: door.approach.y + normal.y * distance,
  })).find(candidate => domain.homeworldCivicWalkableV80(building.levelId, candidate));
  const local = [40, 45, 50, 54].flatMap(distance => [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => ({
    x: point.x + dx * distance, y: point.y + dy * distance,
  }))).find(candidate => domain.isHomeworldInteriorWalkableV64(room, candidate, { halfWidth: 32, halfDepth: 22 }) &&
    domain.nearestHomeworldInteriorTargetV64(room, candidate)?.pointId === 'forge-service');
  assert(exterior && local, 'The disclosed checkpoint must fit the actual forge collision and service.');
  save.homeworld.locationV77 = { version: 1, layoutRevision: 1, ownerCreatedAt: owner, levelId: building.levelId,
    exterior, interiorId: 'deep-forge', local };
  assert(domain.resolveHomeworldLocationV77(save.homeworld.locationV77, owner).restored);
  assert(domain.atMobilityForge(save));
  assert.equal(domain.parseSaveImport(JSON.stringify(save)).failure, null);
  return save;
}

const seed = initialCampaign();
const storageKey = domain.SAVE_STORAGE_KEY;
const report = {
  passed: false,
  fixture: 'Licensed Blooded, living trophy prepared/displayed and successful Serekh result recorded by the real reducers. The save starts at the reachable native Forge counter, with no vehicle or mobility reward. All pilot controls are real keyboard input.',
  build: process.env.YAUTJA_QA_RUNTIME_COMMIT ?? null,
  runs: [],
  errors: [],
};
let browser, page;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.addScriptTag({ content: initCode });
  await page.evaluate(async ({ seed, storageKey }) => {
    const api = window.__convoyFixture;
    localStorage.setItem(storageKey, JSON.stringify(seed));
    const migrated = await api.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw Error(migrated.message);
    const checkpoint = await api.saveCampaignCheckpoint(1, {
      kind: 'manual', index: 1, location: 'homeworld', expectedRevision: api.loadCampaignSlots().slots[0].revision,
    });
    if (!checkpoint.ok) throw Error(checkpoint.message);
  }, { seed, storageKey });
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  const click = name => page.getByRole('button', { name, exact: true }).click();
  async function openFromMenu() {
    await page.locator('[data-campaign-menu]').waitFor();
    const section = page.locator('[data-menu-section="campaign"]');
    if (await section.isVisible()) await section.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.bringToFront();
    await page.locator('[data-homeworld-hub][data-homeworld-interior-id="deep-forge"][data-homeworld-motion-ready="true"]').waitFor({ timeout: 90000 });
    await page.locator('[data-homeworld-interior-target="point"]').click();
    await page.locator('[data-mobility-forge-entry]').waitFor();
    await click('Ouvrir le comptoir et le garage');
    await page.locator('[data-mobility-garage]').waitFor();
    assert(domain.atMobilityForge(await read()));
  }
  const models = [
    { id: 'sand_skimmer', route: 'dunes-crossing', action: 'Rejoindre la piste des dunes', mass: 25 },
    { id: 'trophy_carrier', route: 'trophy-convoy', action: 'Emprunter le porteur du clan', mass: 75 },
  ];
  const [advance, left, right, brake, interact] =
    ['hunt.moveUp', 'hunt.moveLeft', 'hunt.moveRight', 'hunt.jump', 'hunt.interact'].map(id => seed.settings.controlBindings[id][0]);
  await page.reload({ waitUntil: 'networkidle' });
  await openFromMenu();
  const before = await read();
  assert.equal(before.mobilityV1.owned.length, 0);

  for (const model of models) {
    await page.locator('[data-mobility-model="' + model.id + '"]').click();
    const preview = await page.locator('[aria-label][class] img[src*="mobility/v1"]').first().getAttribute('src');
    if (model.id === 'sand_skimmer') {
      assert(preview?.includes(model.id));
      assert((await page.request.get(new URL(preview, url).href)).ok(), 'The exact Skimmer PNG is served.');
      await click('Recevoir le Skimmer des dunes');
      await page.locator('[data-mobility-owned-count="1"]').waitFor();
      assert.deepEqual((await read()).mobilityV1.sandSkimmer, { trophyId, claimedAt: completedAt });
    }
    await click(model.action);
    const yard = page.locator('[data-mobility-yard][data-route="' + model.route + '"]');
    await yard.waitFor();
    assert.equal(await yard.getAttribute('data-paused'), 'true');
    await click('Reprendre la conduite');
    let stage = 0, reloaded = false, held = new Set();
    const begin = Date.now(), samples = [];
    try {
      while (Date.now() - begin < 180000) {
        const at = await yard.evaluate(element => Object.fromEntries(['x', 'y', 'heading', 'speed', 'checkpoint', 'cargo', 'tick']
          .map(attribute => [attribute, Number(element.getAttribute('data-' + attribute))])));
        if (at.cargo === model.mass && !reloaded) {
          for (const key of held) await page.keyboard.up(key);
          held.clear();
          await click('Pause et enregistrer');
          const active = (await read()).mobilityV1.active;
          assert.equal(active.course.cargoKg, model.mass);
          await page.screenshot({ path: join(output, model.route + '-charge.png') });
          await page.reload({ waitUntil: 'networkidle' });
          await openFromMenu();
          await yard.waitFor();
          assert.equal(await yard.getAttribute('data-paused'), 'true');
          assert.deepEqual((await read()).mobilityV1.active, active);
          await click('Reprendre la conduite');
          reloaded = true;
          continue;
        }
        const guide = mobilityExtensionQaGuidance(at, model.route, stage);
        if (guide.advance) {
          if (stage === 5) {
            if ((await read()).mobilityV1.active.course.cargoDelivered) break;
          } else if (stage !== 1 || at.cargo === model.mass) stage++;
        }
        const next = new Set();
        if (guide.throttle) next.add(advance);
        if (guide.steer) next.add(guide.steer > 0 ? right : left);
        if (guide.brake) next.add(brake);
        if (guide.interact) next.add(interact);
        for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
        for (const key of next) if (!held.has(key)) await page.keyboard.down(key);
        held = next;
        if (!samples.length || samples.at(-1).tick + 60 <= at.tick) samples.push({ stage, ...at });
        await page.waitForTimeout(50);
      }
    } finally {
      for (const key of held) await page.keyboard.up(key);
    }
    await click('Pause et enregistrer');
    const active = (await read()).mobilityV1.active;
    report.runs.push({ id: model.id, route: model.route, mass: model.mass, reloaded, active, samples });
    assert(reloaded, 'The native route never reached its loading point: ' + JSON.stringify(active.course));
    assert.equal(active.course.checkpoint, 3);
    assert(active.course.cargoDelivered, JSON.stringify(active.course));
    await click('Remiser au garage');
    await yard.waitFor({ state: 'hidden' });
    const after = await read();
    assert.equal(after.mobilityV1.lastReport.result, 'passed');
    assert.equal(after.mobilityV1.lastReport.modelId, model.id);
    assert.deepEqual(after.mobilityV1.owned.map(item => item.id), ['sand_skimmer']);
    assert.equal(after.mobilityV1.trainingReward, null);
    assert.equal(after.mobilityV1.forgeDelivery, undefined);
    assert.deepEqual(after.profile, before.profile);
    assert.deepEqual(after.trophyUsagesV147, before.trophyUsagesV147);
    assert.deepEqual(after.trophies, before.trophies);
    assert.equal(domain.parseSaveImport(JSON.stringify(after)).failure, null);
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error instanceof Error ? error.stack : String(error);
  await page?.screenshot({ path: join(output, 'echec.png') }).catch(() => null);
  throw error;
} finally {
  await writeFile(join(output, 'recette.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
}
