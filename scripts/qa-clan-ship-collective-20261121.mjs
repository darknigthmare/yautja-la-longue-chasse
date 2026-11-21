/** R2-M046, real walking, two different operation posts and durable escort receipts. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from '../tests/helpers/ship-receipt-v161.mjs';

const origin = new URL(process.env.CLAN_COLLECTIVE_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.CLAN_COLLECTIVE_QA_COMMIT) assert.equal(commit, process.env.CLAN_COLLECTIVE_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert(buildId);
const output = resolve(process.env.CLAN_COLLECTIVE_QA_OUTPUT ?? 'outputs/qa-clan-ship-collective');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const acquisition = qa.load('app/game/systems/shipAcquisitionV89.ts');
const hull = qa.load('app/game/systems/clanHullProjectV171.ts');
const clan = qa.load('app/game/systems/clanShipOperations.ts');
const residence = qa.load('app/game/systems/companionResidence.ts');
const space = qa.load('app/game/systems/clanShipSpaceEncounter.ts');
const contractId = 'space-collective-escort';
const clanPosts = clan.CLAN_SHIP_RECRUITS;
const orderSequence = ['scan', 'manoeuvre', 'brace', 'brace', 'extract'];
const key = saves.SAVE_STORAGE_KEY;

function campaignSeed(role, owner) {
  let save = saves.defaultSave(owner);
  save.profile.hunterName = 'QA escorte ' + role;
  save.profile.honor = 5000;
  save.profile.rankId = 'elite';
  save.profile.acquiredRankIdV166 = 'elite';
  save.settings.masterVolume = 0;
  save = playShipAcquisitionV161(qa, save);
  const issued = acquisition.shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, owner);
  assert(issued);
  const visit = { ownerCreatedAt: owner, personalShipId: issued.shipId };
  let berth = docking.createClanShipDockingState(owner, issued.shipId);
  for (const type of ['approach', 'dock', 'board']) {
    const result = docking.actClanShipDocking(berth, { type }, visit);
    assert(result.accepted, result.message);
    berth = result.state;
  }
  save = { ...save, clanShipDocking: berth };
  const prepareRoom = roomId => {
    if (save.clanShipDocking.roomId === roomId) return;
    const moved = docking.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId }, visit);
    assert(moved.accepted, moved.message);
    save = { ...save, clanShipDocking: moved.state };
  };
  const project = (command, contact) => {
    const result = hull.commitClanHullProject(save, {
      expectedRevision: save.clanHullProjectV171?.revision ?? 0,
      ...command,
    }, contact);
    assert(result.ok, result.message);
    save = { ...save, clanHullProjectV171: result.state };
  };
  project({ type: 'inspect' }, null);
  for (const contact of hull.CLAN_HULL_CONTACTS) {
    prepareRoom(contact.roomId);
    project({ type: 'consult' }, contact.id);
  }
  prepareRoom('conseil');
  project({ type: 'pledge', pledge: 'shared-watch' }, null);

  const action = (type, value = {}, roomId = 'conseil') => {
    prepareRoom(roomId);
    const before = save.clanShipOperations ?? clan.createClanShipOperations(owner);
    const result = clan.actClanShipOperations(before, { type, expectedRevision: before.revision, ...value },
      { ownerCreatedAt: owner, docking: save.clanShipDocking, campaign: save });
    assert(result.accepted && result.changed, result.message);
    save = { ...save, clanShipOperations: result.state, profile: {
      ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward,
    } };
  };
  for (const step of clan.CLAN_SHIP_ONBOARDING_STEPS) action('onboard-step', { stepId: step.id }, step.roomId);
  action('accept-mandate');
  for (const id of ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route', 'ship-training-circuit']) {
    action('accept-contract', { contractId: id });
    for (const step of clan.clanShipContract(id).steps) action('interior-step', { stepId: step.id }, step.roomId);
  }

  // The legacy six-crew fixture follows qa-clan-ship-operations.mjs. These two
  // prior field results establish eligibility for two appointments. Chromium
  // begins with zero collective preparation, orders, victories or receipts.
  for (const id of ['field-jungle-survey', 'field-ice-route']) {
    const mission = MISSION_BY_ID[clan.clanShipContract(id).missionId];
    action('accept-contract', { contractId: id });
    const attempt = save.missionProgress[mission.id].attempts;
    const binding = clan.bindClanShipMission(save.clanShipOperations, {
      ownerCreatedAt: owner, missionId: mission.id, encounterRun: attempt,
      expectedRevision: save.clanShipOperations.revision,
    });
    assert(binding.accepted, binding.message);
    save = { ...save, clanShipOperations: binding.state };
    const result = {
      missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
      completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
      honorEvents: [], trophyQuality: 'elite', trophyClaims: [{
        id: mission.id + '-disclosed-clan-fixture', definitionId: mission.trophy.id,
        targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId,
        condition: 'pristine', quality: 'elite',
      }], kills: 3, secondWindUsed: false, completedAt: owner,
    };
    const progressed = saves.applyMissionResult(save, result);
    const settlement = clan.settleClanShipMission(save.clanShipOperations, save, progressed, result,
      { ownerSaveCreatedAt: owner, missionId: mission.id, encounterRun: attempt });
    assert(settlement.accepted && settlement.changed, settlement.message);
    save = { ...progressed, clanShipOperations: settlement.state, profile: {
      ...progressed.profile, clanMarks: progressed.profile.clanMarks + settlement.clanMarksReward,
    } };
  }
  for (const npc of clanPosts) action('recruit', { npcId: npc.id }, npc.roomId);
  prepareRoom('conseil');

  const parsed = saves.parseSaveImport(saves.exportSave(save));
  assert(parsed.save, parsed.failure);
  assert.equal(parsed.save.profile.rankId, 'elite');
  assert.equal(parsed.save.clanHullProjectV171.pledge, 'shared-watch');
  assert.equal(parsed.save.clanHullProjectV171.hullInstanceId, issued.instanceId);
  assert.deepEqual(residence.availableClanResidenceCrew(parsed.save).sort(), clanPosts.map(npc => npc.id).sort());
  assert.equal(parsed.save.clanShipOperations.spaceEncounter, null);
  assert.equal(parsed.save.clanShipOperations.activeContract, null);
  assert(parsed.save.clanShipOperations.completedContracts.every(item => item.contractId !== contractId));
  return parsed.save;
}

const report = {
  commit, buildId, passed: false, runs: [], errors: [],
  admission: 'Two isolated adult Elite saves. Actual V89/V161 hull issuance, V171 shared-watch pledge and six historical appointments are prior fixtures. The jungle and ice recruitment results are synthetic and declared. Every collective choice, crew check, launch and tactical order is performed in the compiled browser campaign.',
};
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  for (const [role, owner] of [['field', '2026-11-21T15:00:00.000Z'], ['coordination', '2026-11-21T15:30:00.000Z']]) {
    const seed = campaignSeed(role, owner);
    const run = { role, owner, visits: [], actions: [], captures: [] };
    report.runs.push(run);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: {
      cookies: [], origins: [{ origin: origin.origin, localStorage: [{ name: key, value: JSON.stringify(seed) }] }],
    } });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(45_000);
      page.on('pageerror', error => report.errors.push(error.message));
      const panel = page.locator('[data-clan-operations]');
      const jumpTo = room => page.locator('[data-clan-ship-room-target="' + room + '"]');
      const disk = () => page.evaluate(saveKey => JSON.parse(localStorage.getItem(saveKey)), key);
      const room = () => page.locator('[data-clan-interior]').getAttribute('data-interior-room');
      const receipt = save => save.clanShipOperations.completedContracts.filter(row => row.contractId === contractId);
      const expectRoom = expected => page.waitForFunction(({ saveKey, expected }) => {
        const berth = JSON.parse(localStorage.getItem(saveKey))?.clanShipDocking;
        const scene = document.querySelector('[data-clan-interior]');
        return berth?.status === 'aboard' && berth.roomId === expected &&
          scene?.getAttribute('data-interior-room') === expected &&
          scene.getAttribute('data-interior-moving') === 'false' && !scene.getAttribute('data-interior-target-room');
      }, { saveKey: key, expected }, { timeout: 60_000 });
      const continueCampaign = async () => {
        await page.locator('[data-campaign-menu]').waitFor();
        const campaign = page.locator('[data-menu-section="campaign"]');
        if (await campaign.isVisible()) await campaign.click();
        await page.locator('[data-menu-action="continue"]').click();
        await page.locator('[data-campaign-session]').waitFor({ timeout: 90_000 });
        await page.locator('[data-campaign-location="clan-ship"]').waitFor();
        await page.locator('[data-clan-interior]').waitFor();
      };
      const openPost = async (tab = 'post') => {
        if (!(await panel.count())) {
          const control = page.locator('[data-interior-operations]');
          if (await control.getAttribute('data-interior-operations-ready') !== 'true') {
            await control.click();
            await page.locator('[data-interior-moving="false"] [data-interior-operations-ready="true"]').waitFor();
          }
          await control.click();
          await panel.waitFor();
        }
        const button = panel.locator('[data-clan-operations-tab="' + tab + '"]');
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
      };
      const visit = async target => {
        if (await panel.count()) {
          await panel.locator('[data-clan-operations-close]').click();
          await panel.waitFor({ state: 'hidden' });
        }
        const from = await room();
        if (from !== target) await jumpTo(target).click();
        await expectRoom(target);
        run.visits.push({ from, to: target });
        await openPost();
        assert.equal(await panel.getAttribute('data-clan-operations-room'), target);
      };
      const confirmed = async selector => {
        const before = await disk();
        const revision = before.clanShipOperations.revision + 1;
        const button = panel.locator(selector);
        assert.equal(await button.isEnabled(), true, selector);
        await button.click();
        await page.waitForFunction(({ saveKey, revision }) =>
          JSON.parse(localStorage.getItem(saveKey))?.clanShipOperations?.revision === revision, { saveKey: key, revision });
        const after = await disk();
        assert.equal(after.profile.clanMarks, seed.profile.clanMarks);
        assert.deepEqual(after.clanHullProjectV171, seed.clanHullProjectV171);
        run.actions.push({ selector, room: await room(), revision });
        return after;
      };
      const reload = async expected => {
        const before = await disk();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await continueCampaign();
        await expectRoom(expected);
        const after = await disk();
        assert.deepEqual(after.clanShipOperations, before.clanShipOperations);
        assert.deepEqual(after.clanHullProjectV171, before.clanHullProjectV171);
        assert.equal(after.profile.clanMarks, before.profile.clanMarks);
        await openPost();
        return after;
      };
      const capture = async stage => {
        const path = join(output, role + '-' + stage + '.png');
        const images = await page.locator('[data-clan-ship-status] img').evaluateAll(images =>
          Promise.all(images.map(async image => {
            await image.decode();
            return { src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight };
          })));
        assert(images.length > 0 && images.every(image => image.width > 0 && image.height > 0), 'Native scene art must decode.');
        assert.equal(await page.locator('[data-art-unavailable="true"]').count(), 0);
        const bytes = await page.screenshot({ path, fullPage: true });
        run.captures.push({ stage, file: path, sha256: createHash('sha256').update(bytes).digest('hex'), images });
      };

      const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
      assert(response?.ok() && (await response.text()).includes(buildId), 'The exact compiled build must be served.');
      await continueCampaign();
      await expectRoom('conseil');
      assert.equal(receipt(await disk()).length, 0);
      await openPost('contracts');
      await panel.locator('[data-clan-contract-card="' + contractId + '"]').click();
      const accepted = await confirmed('[data-clan-accept-contract="' + contractId + '"]');
      assert.equal(accepted.clanShipOperations.activeContract.contractId, contractId);
      assert.equal(accepted.clanShipOperations.spaceEncounter, null);
      assert.equal(accepted.clanShipOperations.activeContract.collective.role, null);
      await openPost();
      const assigned = await confirmed('[data-collective-role="' + role + '"]');
      assert.equal(assigned.clanShipOperations.activeContract.collective.role, role);
      assert.equal(assigned.clanShipOperations.spaceEncounter, null);

      await visit('hangar');
      assert.equal(await panel.locator('[data-collective-launch]:not(:disabled)').count(), 0,
        'The hangar cannot launch before the crew checks.');
      const checked = [];
      for (const npc of clanPosts) {
        await visit(npc.roomId);
        const after = await confirmed('[data-collective-check="' + npc.id + '"]');
        checked.push(npc.id);
        assert.deepEqual(after.clanShipOperations.activeContract.collective.checkedNpcIds, checked);
        assert.equal(after.clanShipOperations.spaceEncounter, null);
        assert.equal(receipt(after).length, 0);
      }
      await visit('hangar');
      const restored = await reload('hangar');
      assert.deepEqual(restored.clanShipOperations.activeContract.collective, {
        role, capacity: 7, checkedNpcIds: checked,
      });
      await capture('checks-restored');
      const launched = await confirmed('[data-collective-launch]');
      assert.equal(launched.clanShipOperations.spaceEncounter.kind, 'escort');
      assert.equal(launched.clanShipOperations.spaceEncounter.turn, 0);
      assert.equal(launched.clanShipOperations.spaceEncounter.status, 'active');
      assert.equal(receipt(launched).length, 0);
      const station = role === 'field' ? 'hangar' : 'conseil';
      if (role === 'coordination') {
        assert.equal(await panel.locator('[data-clan-space-order="scan"]:not(:disabled)').count(), 0,
          'Coordination must leave the hangar to use the council table.');
        await visit(station);
      }
      assert.equal(await panel.locator('[data-clan-space-order="extract"]').isDisabled(), true,
        'Launching cannot extract an uncovered transport.');
      for (const [index, order] of orderSequence.entries()) {
        assert.equal(await room(), station);
        const after = await confirmed('[data-clan-space-order="' + order + '"]');
        assert.equal(after.clanShipOperations.spaceEncounter.turn, index + 1);
        assert.deepEqual(after.clanShipOperations.spaceEncounter.history, orderSequence.slice(0, index + 1));
        if (order !== 'extract') assert.equal(receipt(after).length, 0);
        if (order === 'scan') {
          await reload(station);
          await capture('one-order-restored');
        }
      }
      const won = await disk();
      assert.equal(won.clanShipOperations.spaceEncounter.status, 'victory');
      assert.equal(won.clanShipOperations.spaceEncounter.objectiveProgress, 3);
      assert.equal(won.clanShipOperations.activeContract, null);
      const records = receipt(won);
      assert.equal(records.length, 1);
      const { proof } = records[0];
      assert.equal(proof.kind, 'space');
      assert.deepEqual(proof.collective, { role, capacity: 7, checkedNpcIds: checked });
      assert.deepEqual(proof.encounter, won.clanShipOperations.spaceEncounter);
      assert.equal(space.inspectClanShipSpaceEncounter(proof.encounter).status, 'valid');
      assert.deepEqual(proof.encounter.crewRoles.slice().sort(), clanPosts.map(npc => npc.spaceCrewRole).sort());
      assert.equal(won.profile.clanMarks, seed.profile.clanMarks);
      assert.equal(saves.parseSaveImport(saves.exportSave(won)).failure, null);
      await capture('extraction');
      const final = await reload(station);
      assert.deepEqual(receipt(final), records);
      run.receipt = records[0];
      run.marks = final.profile.clanMarks;
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await browser?.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, roles: report.runs.map(run => run.role), failure: report.failure ?? null }));
}
