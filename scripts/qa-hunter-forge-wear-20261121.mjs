/** Repair actual V146 wear with the native workbench and campaign writer. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const origin = new URL(process.env.HUNTER_FORGE_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.HUNTER_FORGE_QA_COMMIT) assert.equal(commit, process.env.HUNTER_FORGE_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert(buildId);
const output = resolve(process.env.HUNTER_FORGE_QA_OUTPUT ?? 'outputs/qa-hunter-forge-wear');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const tools = qa.load('app/game/systems/fieldToolsV111.ts');
const anatomies = qa.load('app/game/systems/anatomyHarvestV112.ts');
const harvest = qa.load('app/game/systems/harvestInventoryV112.ts');
const customization = qa.load('app/game/systems/hunterCustomizationV146.ts');
const motion = qa.load('app/game/systems/shipInterior25d.ts');
const activeHunt = qa.load('app/game/systems/activeHuntSave.ts');
const key = saves.SAVE_STORAGE_KEY;
const owner = '2026-11-21T21:00:00.000Z';
const species = 'oseris-iv--jungle-xeno-scout';
const hideSpecies = 'oseris-iv--mist-pouncer';
const forgeWeapon = process.env.HUNTER_FORGE_QA_WEAPON === '1';
const forgeTool = !forgeWeapon && process.env.HUNTER_FORGE_QA_TOOL === '1';
const forgeArmor = !forgeWeapon && !forgeTool && process.env.HUNTER_FORGE_QA_ARMOR === '1';
const selectMaterial = forgeArmor || forgeTool || forgeWeapon || process.env.HUNTER_FORGE_QA_SELECT_MATERIAL === '1';
const weaponBoneSpecies = 'nivalis-k--glacier-ram';
const weaponTissueSpecies = 'oseris-iv--vineback-grazer';
const mission = MISSION_BY_ID['jungle-vey'];

function fixture() {
  let save = saves.defaultSave(owner);
  save.profile.hunterName = 'QA forge · plastron';
  save.profile.clanMarks = forgeWeapon ? 600 : 200;
  save.settings.masterVolume = 0;
  if (forgeWeapon) save.loadout.weaponIds = ['combistick', 'wristblades'];
  const purchased = tools.purchaseFieldToolV111(save, 'flaying-tool');
  assert(purchased.ok);
  save = purchased.save;

  const encounter = save.missionProgress[mission.id].attempts;
  const runId = mission.id + ':' + encounter;
  const corpses = ['forge-fixture-01', 'forge-fixture-02', 'forge-fixture-03'];
  const plan = corpses.map(id => ({ id, species, action: 'harvest-bone' }));
  const hides = forgeArmor ? 3 : 2;
  if (selectMaterial) plan.push(...Array.from({ length: hides }, (_, i) => ({
    id: 'forge-hide-0' + (i + 1), species: hideSpecies, action: 'harvest-hide',
  })));
  if (forgeWeapon) {
    plan.push(...Array.from({ length: 5 }, (_, i) => ({
      id: 'forge-weapon-bone-' + i, species: weaponBoneSpecies, action: 'harvest-bone',
    })));
    plan.push(...Array.from({ length: 3 }, (_, i) => ({
      id: 'forge-weapon-tissue-' + i, species: weaponTissueSpecies, action: 'harvest-tissue',
    })));
  }
  const specimens = plan.map(item => anatomies.makeAnatomySpecimenV112(runId, item.id, item.species, item.action, 82, true));
  assert(specimens.every(Boolean));
  assert(specimens.slice(0, 3).every(item => item.partId === 'bone' && item.quality === 90));
  if (selectMaterial) assert(specimens.slice(3, 3 + hides).every(item => item.partId === 'hide'));
  const used = plan.map(item => runId + ':' + item.action + ':' + item.id);
  const delivery = harvest.deliverHarvestV112(save, specimens, used, true, mission.id, encounter);
  assert(delivery.ok, delivery.reason);

  const cracked = customization.heavyHitPieceV146(25, 100, 0);
  assert.equal(cracked, 'chest');
  const result = {
    missionId: mission.id, difficultyId: save.settings.difficultyId, outcome: 'success', score: 80,
    elapsedSeconds: 240, completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{
      id: mission.id + '-forge-admission', definitionId: mission.trophy.id, targetName: mission.targetName,
      targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite',
    }],
    kills: 3, scans: 3, secondWindUsed: false, completedAt: '2026-11-21T21:04:00.000Z',
    specimensV112: specimens, toolUseIdsV112: used, harvestEncounterRunV112: encounter,
    wearV146: { heavyPieces: [cracked] },
  };
  const settled = saves.applyMissionResult(save, result);
  assert.equal(settled.missionProgress[mission.id].attempts, encounter + 1);
  assert.equal(settled.missionProgress[mission.id].status, 'completed');
  assert.deepEqual(settled.customizationV146.heavyWear, { chest: 1 });
  assert.deepEqual(settled.inventory.harvestV112, delivery.inventory.harvestV112);
  save = settled;
  for (const specimen of specimens) {
    for (const step of harvest.CONSERVATION_STEPS_V112) {
      const started = harvest.startConservationV112(save, specimen.id);
      assert(started.ok, started.message);
      save = started.save;
      for (let unit = 0; unit < step.units; unit++) {
        const worked = harvest.workConservationV112(save, specimen.id + ':' + step.to);
        assert(worked.ok, worked.message);
        save = worked.save;
      }
    }
    const archived = harvest.archiveMountedSpecimenV112(save, specimen.id);
    assert(archived.ok, archived.message);
    save = archived.save;
  }
  const admitted = saves.parseSaveImport(saves.exportSave(save));
  assert(admitted.save, admitted.failure);
  const depot = admitted.save.inventory.harvestV112;
  assert.equal(depot.specimens.length, 0);
  assert.equal(depot.jobs.length, 0);
  assert.equal(depot.archive.length, forgeWeapon ? 4 : selectMaterial ? 2 : 1);
  assert.equal(depot.archive[0].count, 3);
  assert.equal(depot.archive[0].qualityTotal, 270);
  return admitted.save;
}

const report = {
  commit, buildId, passed: false, captures: [], routes: [], errors: [],
  admission: 'A declared adult Jungle run and one severe chest hit are historical fixture inputs. The actual V111 tool purchase, anatomy, terminal return, mission settlement, paid conservation work and archival reducers produce the starting save. Chromium plays navigation to the physical forge and the repair through the normal controls.',
};
let browser;
try {
  const seed = fixture();
  const start = seed.inventory.harvestV112.archive[0];
  const chosen = selectMaterial ? seed.inventory.harvestV112.archive.find(row => row.speciesId === hideSpecies) : null;
  if (selectMaterial) assert.equal(chosen?.count, forgeArmor ? 3 : 2);
  if (forgeArmor) report.admission += ' Le même navigateur forge ensuite le premier niveau avec le reste des lots archivés.';
  if (forgeTool) report.admission += ' Le même navigateur installe ensuite le renfort avec les os archivés par les réducteurs.';
  if (forgeWeapon) report.admission += ' Le même navigateur sélectionne deux lots de la réserve et forge les deux niveaux du Combistick à la station.';
  report.initial = { wear: seed.customizationV146.heavyWear, stock: start, chosen, marks: seed.profile.clanMarks };
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{ name: key, value: JSON.stringify(seed) }] }] },
  });
  page.setDefaultTimeout(45_000);
  page.on('pageerror', error => report.errors.push(error.message));
  const boardSelector = '[data-ship-interior="2.5d"][data-suspended="false"]';
  const board = page.locator(boardSelector);
  const forge = page.locator('[data-hunter-pieces-v146]');
  const rig = page.locator('.customization-rig-stage [data-hunter-rig]');
  const wear = rig.locator('[data-piece-wear="chest"]');
  const chest = rig.locator('img[data-rig-slot^="armor-chest"]').first();
  const disk = () => page.evaluate(saveKey => JSON.parse(localStorage.getItem(saveKey)), key);
  const confirm = () => forge.locator('[data-forge-repair-piece="chest"]');

  async function openForge() {
    await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-campaign-session]').waitFor({ timeout: 90_000 });
    }
    const play = page.getByRole('button', { name: 'Jouer', exact: true });
    if (await play.isVisible()) await play.click();
    await board.waitFor();
    const target = 'appearance-forge';
    const from = await board.getAttribute('data-ship-room');
    const route = motion.shipInterior25dRoomRoute(from, target);
    assert(route.length > 0);
    await board.locator('[data-ship-plan-toggle]').click();
    await board.locator('[data-ship-guide="' + target + '"]').click();
    for (let index = 1; index < route.length; index++) {
      const next = route[index];
      const door = motion.SHIP_INTERIOR_25D_ROOMS[route[index - 1]].doors.find(item => item.targetRoomId === next);
      assert(door);
      await board.locator('[data-ship-door="' + door.id + '"][data-door-ready="true"]').waitFor({ state: 'attached' });
      await board.locator('[data-ship-interact]').click();
      await page.locator(boardSelector + '[data-ship-room="' + next + '"]').waitFor();
    }
    await page.locator(boardSelector + '[data-ship-room="' + target + '"][data-ship-nearby="' + target + '"]').waitFor();
    await board.locator('[data-ship-interact]').click();
    await forge.waitFor();
    await forge.getByRole('tab', { name: 'Réparations', exact: true }).click();
    report.routes.push(route);
  }

  async function capture(name) {
    const file = name + '.png';
    const bytes = await rig.screenshot({ path: join(output, file), animations: 'disabled' });
    report.captures.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  async function plate() {
    return chest.evaluate(async image => {
      await image.decode();
      return { src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight };
    });
  }

  const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  assert(response?.ok() && (await response.text()).includes(buildId), 'The exact compiled build must be served.');
  await openForge();
  assert.equal(await rig.locator('[data-piece-wear]').count(), 1, 'Only the actually damaged part receives wear.');
  await wear.waitFor();
  const nativePlate = await plate();
  assert(nativePlate.width > 0 && nativePlate.height > 0);
  report.nativePlate = nativePlate;
  await rig.locator('canvas[data-piece-wear="chest"][data-wear-level="1"][data-wear-ready="true"]').waitFor();
  const painted = await wear.evaluate(canvas => {
    const { width, height } = canvas;
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const original = document.querySelector('.customization-rig-stage img[data-rig-slot^="armor-chest"]');
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext('2d');
    sourceContext.drawImage(original, 0, 0, width, height);
    const silhouette = sourceContext.getImageData(0, 0, width, height).data;
    let outsidePlatePixels = 0;
    let visiblePixels = 0;
    let maxAlpha = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      const alpha = pixels[index];
      if (alpha > 0) visiblePixels++;
      if (alpha > silhouette[index] + 1) outsidePlatePixels++;
      if (alpha > maxAlpha) maxAlpha = alpha;
    }
    const box = canvas.getBoundingClientRect();
    return { width, height, visiblePixels, maxAlpha, outsidePlatePixels, displayWidth: box.width, displayHeight: box.height };
  });
  assert.equal(painted.width, 256);
  assert.equal(painted.height, 384);
  assert(painted.displayWidth > 0 && painted.displayHeight > 0);
  assert(painted.visiblePixels > 0 && painted.visiblePixels < painted.width * painted.height, 'The damage must be drawn as a localized visible overlay.');
  assert(painted.maxAlpha > 0);
  assert.equal(painted.outsidePlatePixels, 0, 'The fracture stays within the exact plate silhouette.');
  report.wearLayer = painted;
  assert.match(await confirm().innerText(), /2 matériaux/);
  await capture('chest-worn');

  const quote = forge.locator('[data-forge-repair-quote="chest"]');
  const automatic = await quote.innerText();
  assert(automatic.includes(start.label));
  if (selectMaterial) {
    await forge.getByLabel('Matière à employer').selectOption(JSON.stringify([chosen.speciesId, chosen.partId]));
    assert.equal(await quote.innerText(), '2 × ' + chosen.label);
    assert.deepEqual((await disk()).inventory.harvestV112.archive, seed.inventory.harvestV112.archive);
    report.materialChoice = { automatic, explicit: await quote.innerText() };
  }
  await confirm().click();
  await page.waitForFunction(({ key: saveKey, expected }) => {
    const save = JSON.parse(localStorage.getItem(saveKey));
    return save?.inventory.harvestV112.archive[0]?.count === expected && !save.customizationV146?.heavyWear.chest;
  }, { key, expected: selectMaterial ? 3 : 1 });
  await wear.waitFor({ state: 'detached' });
  assert.equal(await rig.locator('[data-piece-wear]').count(), 0);
  assert.equal(await confirm().count(), 0);
  const repaired = await disk();
  const afterRepair = [selectMaterial ? start : { ...start, count: 1, qualityTotal: 90 }];
  if (forgeArmor) afterRepair.push({ ...chosen, count: 1, qualityTotal: Math.round(chosen.qualityTotal / 3) });
  if (forgeWeapon) afterRepair.push(...seed.inventory.harvestV112.archive.filter(row =>
    row.speciesId === weaponBoneSpecies || row.speciesId === weaponTissueSpecies));
  assert.deepEqual(repaired.inventory.harvestV112.archive, afterRepair);
  assert.equal(repaired.profile.clanMarks, seed.profile.clanMarks);
  assert.deepEqual(repaired.customizationV146.heavyWear, {});
  const canonical = saves.parseSaveImport(saves.exportSave(repaired));
  assert(canonical.save, canonical.failure);
  assert.deepEqual(canonical.save.inventory.harvestV112.archive, repaired.inventory.harvestV112.archive);
  assert.deepEqual(canonical.save.customizationV146.heavyWear, {});
  assert.deepEqual(await plate(), nativePlate);
  await capture('same-chest-repaired');
  assert.notEqual(report.captures[0].sha256, report.captures[1].sha256, 'Repair must change the rendered rig.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openForge();
  await plate();
  assert.equal(await rig.locator('[data-piece-wear]').count(), 0);
  assert.equal(await confirm().count(), 0);
  const restored = await disk();
  assert.deepEqual(restored.inventory.harvestV112.archive, repaired.inventory.harvestV112.archive);
  assert.deepEqual(restored.customizationV146.heavyWear, {});
  await capture('repair-restored');

  const color = '#a76540';
  const lockedPattern = 'bands';
  const earned = customization.earnedCosmeticsV146({ honor: restored.profile.honor, rankId: restored.profile.rankId,
    trophies: restored.trophies, justiceDeclaration: restored.justice?.declaration }, restored.customizationV146.earned);
  assert.equal(earned.includes('pattern:' + lockedPattern), false);
  const shared = customization.encodeOutfitShareCodeV146({ ...restored.appearance,
    skinPatternIdV146: lockedPattern, piecesV146: { ...restored.appearance.piecesV146, chest: { primary: color } } });
  await forge.getByRole('tab', { name: 'Tenues', exact: true }).click();
  await forge.getByPlaceholder('Coller un code YLC1...').fill(shared);
  await forge.getByRole('button', { name: 'Charger le code', exact: true }).click();
  assert.match(await forge.getByRole('status').innerText(), /pattern:bands/);
  await forge.getByRole('button', { name: 'Confirmer les couleurs', exact: true }).click();
  await page.waitForFunction(({ saveKey, color }) =>
    JSON.parse(localStorage.getItem(saveKey))?.appearance.piecesV146?.chest?.primary === color, { saveKey: key, color });
  const received = await disk();
  assert.equal(received.appearance.skinPatternIdV146 ?? null, null);
  assert.deepEqual(received.inventory.harvestV112.archive, restored.inventory.harvestV112.archive);
  report.share = { fallback: lockedPattern, color: received.appearance.piecesV146.chest.primary };

  if (forgeArmor) {
    const arsenal = qa.load('app/game/systems/arsenal.ts');
    const armorId = received.loadout.armorId;
    const baseline = received.inventory.armorUpgrades[armorId];
    assert.equal(baseline, 0);
    await forge.getByRole('tab', { name: 'Réparations', exact: true }).click();
    const upgrade = forge.locator('[data-forge-armor-apply]');
    const armorQuote = forge.locator('[data-forge-armor-quote]');
    assert.equal(await upgrade.isEnabled(), false);
    const bonePick = forge.locator('[data-forge-armor-material="bone"]');
    const hidePick = forge.locator('[data-forge-armor-material="hide"]');
    await bonePick.selectOption(JSON.stringify([start.speciesId, start.partId]));
    assert.equal(await upgrade.isEnabled(), false);
    await hidePick.selectOption(JSON.stringify([chosen.speciesId, chosen.partId]));
    assert.equal(await armorQuote.innerText(), '2 × ' + start.label + ' · 1 × ' + chosen.label);
    const previous = arsenal.effectiveArmorStats(armorId, baseline);
    const projected = arsenal.effectiveArmorStats(armorId, baseline + 1);
    const stats = await forge.locator('[data-forge-armor-stats]').innerText();
    assert(stats.includes('PV ' + Math.round(previous.maxHealth) + ' → ' + Math.round(projected.maxHealth)));
    await forge.screenshot({ path: join(output, 'devis-niveau-armure.png'), animations: 'disabled' });
    await upgrade.click();
    await forge.locator('[data-forge-armor-level="1"]').waitFor();
    const upgraded = await disk();
    assert.equal(upgraded.inventory.armorUpgrades[armorId], 1);
    assert.equal(upgraded.loadout.armorId, armorId);
    assert.equal(upgraded.profile.clanMarks, received.profile.clanMarks);
    assert.equal(upgraded.profile.honor, received.profile.honor);
    assert.deepEqual(upgraded.inventory.harvestV112.archive, [{ ...start, count: 1, qualityTotal: 90 }]);
    assert.equal(await upgrade.isEnabled(), false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openForge();
    await forge.locator('[data-forge-armor-level="1"]').waitFor();
    const resumedArmor = await disk();
    assert.deepEqual(resumedArmor.inventory, upgraded.inventory);
    assert.equal(arsenal.quoteUpgrade(resumedArmor, { domain: 'armor', id: armorId }).currentLevel, 1);
    report.armor = { armorId, level: 1, stats, remaining: resumedArmor.inventory.harvestV112.archive };
  }


  if (forgeTool) {
    await forge.getByRole('tab', { name: 'Réparations', exact: true }).click();
    const install = forge.locator('[data-forge-tool-apply]');
    assert.equal(await install.isEnabled(), false);
    await forge.locator('[data-forge-tool-material]').selectOption(JSON.stringify([start.speciesId, start.partId]));
    assert.equal(await forge.locator('[data-forge-tool-quote]').innerText(), '2 × ' + start.label);
    await forge.screenshot({ path: join(output, 'devis-renfort-outil.png'), animations: 'disabled' });
    const future = JSON.stringify({ version: activeHunt.ACTIVE_HUNT_SAVE_VERSION + 1 });
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: activeHunt.ACTIVE_HUNT_STORAGE_KEY, value: future });
    await install.click();
    await forge.getByText(/Renfort non enregistré/).waitFor();
    assert.deepEqual((await disk()).inventory.harvestV112, received.inventory.harvestV112);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), activeHunt.ACTIVE_HUNT_STORAGE_KEY), future);
    await page.evaluate(key => localStorage.removeItem(key), activeHunt.ACTIVE_HUNT_STORAGE_KEY);
    await install.click();
    const marker = forge.locator('[data-forge-tool-reinforced="true"]');
    await marker.waitFor();
    assert.match(await marker.innerText(), /4 points/);
    const mounted = await disk();
    assert.equal(mounted.inventory.harvestV112.reinforcedTool, true);
    assert.equal(mounted.inventory.harvestV112.toolCondition, received.inventory.harvestV112.toolCondition);
    assert.equal(mounted.profile.clanMarks, received.profile.clanMarks);
    assert.deepEqual(mounted.inventory.harvestV112.archive, [{ ...start, count: 1, qualityTotal: 90 }]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openForge();
    await marker.waitFor();
    assert.deepEqual((await disk()).inventory.harvestV112, mounted.inventory.harvestV112);
    report.toolReinforcement = { archive: mounted.inventory.harvestV112.archive, wearPerUse: 4 };
  }

  if (forgeWeapon) {
    const weaponId = 'combistick';
    const arsenal = qa.load('app/game/systems/arsenal.ts');
    const bone = received.inventory.harvestV112.archive.find(row => row.speciesId === weaponBoneSpecies);
    const tissue = received.inventory.harvestV112.archive.find(row => row.speciesId === weaponTissueSpecies);
    assert(bone && tissue);
    assert.equal(received.inventory.weaponUpgrades[weaponId], 0);

    const upgrade = forge.locator('[data-forge-weapon-apply]');
    const weaponPick = forge.locator('[data-forge-weapon-select]');
    const weaponQuote = forge.locator('[data-forge-weapon-quote]');
    const chooseMaterials = async () => {
      await forge.locator('[data-forge-weapon-material="bone"]').selectOption(JSON.stringify([bone.speciesId, bone.partId]));
      await forge.locator('[data-forge-weapon-material="tissue"]').selectOption(JSON.stringify([tissue.speciesId, tissue.partId]));
    };
    const rounds = [];
    const future = JSON.stringify({ version: activeHunt.ACTIVE_HUNT_SAVE_VERSION + 1 });
    await forge.getByRole('tab', { name: 'Réparations', exact: true }).click();
    await weaponPick.selectOption('wristblades');
    assert.equal(await upgrade.isEnabled(), false);
    await weaponPick.selectOption(weaponId);
    for (const level of [1, 2]) {
      assert.equal(await upgrade.isEnabled(), false);
      await chooseMaterials();
      const quote = (level === 1 ? '2 × ' : '3 × ') + bone.label + (level === 1 ? ' · 1 × ' : ' · 2 × ') + tissue.label;
      assert.equal(await weaponQuote.innerText(), quote);
      const previous = arsenal.effectiveWeaponStats(weaponId, level - 1);
      const projected = arsenal.effectiveWeaponStats(weaponId, level);
      assert.match(await forge.locator('[data-forge-weapon-stats]').innerText(), /Dégâts/);
      assert((await forge.locator('[data-forge-weapon-stats]').innerText()).includes(previous.damage + ' → ' + projected.damage));
      await forge.screenshot({ path: join(output, 'devis-combistick-niveau-' + level + '.png'), animations: 'disabled' });

      if (level === 1) {
        await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: activeHunt.ACTIVE_HUNT_STORAGE_KEY, value: future });
        await upgrade.click();
        await forge.getByText(/Amélioration d’arme non enregistrée/).waitFor();
        assert.deepEqual((await disk()).inventory, received.inventory);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), activeHunt.ACTIVE_HUNT_STORAGE_KEY), future);
        await page.evaluate(key => localStorage.removeItem(key), activeHunt.ACTIVE_HUNT_STORAGE_KEY);
      }

      await upgrade.click();
      const marker = forge.locator(`[data-forge-weapon-id="${weaponId}"][data-forge-weapon-level="${level}"]`);
      await marker.waitFor();
      const mounted = await disk();
      assert.equal(mounted.inventory.weaponUpgrades[weaponId], level);
      assert.equal(mounted.inventory.weaponUpgrades.wristblades, received.inventory.weaponUpgrades.wristblades);
      assert.deepEqual(mounted.loadout, received.loadout);
      assert.equal(mounted.profile.clanMarks, received.profile.clanMarks);
      assert.equal(mounted.profile.honor, received.profile.honor);
      const expected = level === 1
        ? [start, { ...bone, count: 3, qualityTotal: Math.round(bone.qualityTotal * 3 / 5) },
          { ...tissue, count: 2, qualityTotal: Math.round(tissue.qualityTotal * 2 / 3) }]
        : [start];
      assert.deepEqual(mounted.inventory.harvestV112.archive, expected);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await openForge();
      await marker.waitFor();
      assert.deepEqual((await disk()).inventory, mounted.inventory);
      rounds.push({ level, quote, damage: projected.damage, cooldownSeconds: projected.cooldownSeconds, remaining: expected });
    }
    assert.equal(await upgrade.count(), 0);
    report.weaponForge = { weaponId, rounds, rejectedIncompatibleSidecar: true };
  }

  assert.deepEqual(report.errors, []);
  report.result = { remaining: restored.inventory.harvestV112.archive[0], wear: restored.customizationV146.heavyWear, marks: restored.profile.clanMarks };
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await browser?.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, failure: report.failure ?? null }));
}
