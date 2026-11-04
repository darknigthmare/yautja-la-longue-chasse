import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Actual GameClient, campaign archives, castle movement, arrival and HuntCanvas.
// Browser storage is isolated. Only input and a deliberate storage fault are injected.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.WOLF_ARRIVAL_QA_OUTPUT || 'outputs/qa-wolf-arrival');
const port = Number(process.env.WOLF_ARRIVAL_QA_PORT || 4187);
const assetsRequired = process.env.WOLF_ARRIVAL_REQUIRE_ASSETS !== '0';
const headed = process.env.WOLF_ARRIVAL_HEADED === '1';
await fs.mkdir(out, { recursive: true });
const bundle = await build({
  stdin: { contents: "export {defaultSave,SAVE_STORAGE_KEY} from './app/game/save.ts'; export {ACTIVE_HUNT_STORAGE_KEY} from './app/game/systems/activeHuntSave.ts'; export {GALAXY_NAVIGATION} from './app/game/galaxyNavigation.ts';", resolveDir: root },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const { defaultSave, SAVE_STORAGE_KEY, ACTIVE_HUNT_STORAGE_KEY, GALAXY_NAVIGATION } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const missionRoute = GALAXY_NAVIGATION.sectors.flatMap(sector => sector.systems.flatMap(system =>
  system.bodies.flatMap(body => body.missions.map(mission => ({ sector, system, body, mission }))))).find(route => route.mission.id === 'jungle-vey');
assert.ok(missionRoute, 'The real navigation registry must expose the initial jungle contract');
const seed = defaultSave('2026-11-04T10:00:00.000Z');
seed.profile.hunterName = 'QA Château et arrivée';
seed.settings.masterVolume = 0;
const checkoutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const report = { startedAt: new Date().toISOString(), checkoutCommit, sourceCommit: process.env.WOLF_ARRIVAL_SOURCE_COMMIT || checkoutCommit,
  runtime: 'actual desktop GameClient via Vite', headed, assetGateRequired: assetsRequired, checks: [], errors: [], missingAssets: [], requestedAssets: [], screenshots: [], focusTransitions: [] };
const missing = new Set(), requested = new Set();
let server, browser, page;

try {
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: !headed,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  const check = async (name, run) => {
    try { await run(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
    catch (error) { report.checks.push({ name, passed: false, message: error.message }); throw error; }
  };
  const startContext = async (label, reducedMotion = 'reduce') => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion });
    await context.addInitScript(({ key, save, huntKey, label }) => {
      if (!localStorage.getItem('__wolfArrivalSeeded')) {
        localStorage.setItem(key, JSON.stringify(save));
        localStorage.setItem('__wolfArrivalSeeded', label);
      }
      const pad = { index: 0, id: 'wolf-arrival-qa', connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
      const api = { pad, mounts: 0, canvasIdentities: new WeakSet(), activeRunIds: [], handoffWrites: [], failArrivalHandoff: false };
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (this === localStorage && name === key) {
          let parsed; try { parsed = JSON.parse(value); } catch { /* The runtime validates its own payload. */ }
          if (parsed?.planetArrival?.status === 'complete') {
            if (api.failArrivalHandoff) throw new DOMException('QA: arrival handoff quota', 'QuotaExceededError');
            api.handoffWrites.push(parsed.planetArrival.runId);
          }
        }
        if (this === localStorage && name === huntKey) {
          try { const run = JSON.parse(value)?.runId; if (run) api.activeRunIds.push(run); } catch { /* Observe only. */ }
        }
        return originalSet.call(this, name, value);
      };
      const observe = () => {
        for (const canvas of document.querySelectorAll('.hunt-screen canvas.hunt-canvas')) {
          if (!api.canvasIdentities.has(canvas)) { api.canvasIdentities.add(canvas); api.mounts += 1; }
        }
      };
      new MutationObserver(observe).observe(document, { childList: true, subtree: true });
      Object.assign(window, { __wolfArrivalQa: api });
    }, { key: SAVE_STORAGE_KEY, save: seed, huntKey: ACTIVE_HUNT_STORAGE_KEY, label });
    const current = await context.newPage();
    current.setDefaultTimeout(20_000);
    current.on('pageerror', error => report.errors.push({ context: label, message: error.message }));
    current.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/game/')) requested.add('public' + url.pathname); });
    current.on('response', response => {
      const url = new URL(response.url());
      if (url.pathname.startsWith('/game/') && (response.status() >= 400 ||
          (response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html')))) missing.add(url.pathname);
    });
    return { context, page: current };
  };
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_STORAGE_KEY);
  const huntStored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), ACTIVE_HUNT_STORAGE_KEY);
  const continueCampaign = async () => {
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor({ timeout: 90_000 });
  };
  const openApp = async () => { await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle', timeout: 120_000 }); await continueCampaign(); };
  const screenshot = async filename => { await page.screenshot({ path: path.join(out, filename), fullPage: true }); report.screenshots.push(filename); };
  const padButton = async (index, pressed) => {
    await page.evaluate(({ index, pressed }) => { window.__wolfArrivalQa.pad.buttons[index] = { pressed, touched: pressed, value: pressed ? 1 : 0 }; }, { index, pressed });
    await page.waitForTimeout(180);
  };
  const waitCastle = async (roomId, status = 'aboard') => {
    await page.waitForFunction(({ key, roomId, status }) => {
      const visit = JSON.parse(localStorage.getItem(key))?.wolfCastle;
      return visit?.roomId === roomId && visit.status === status;
    }, { key: SAVE_STORAGE_KEY, roomId, status });
    await page.locator(`[data-wolf-castle-room="${roomId}"][data-wolf-castle-status="${status}"]`).waitFor();
  };
  const targetStation = async id => {
    // A click near an installation already interacts. Otherwise it sets a real
    // walking route; wait for proximity and use the contextual interaction.
    const currentRoom = await page.locator('[data-wolf-castle-room]').getAttribute('data-wolf-castle-room');
    const immediate = page.locator(`[data-wolf-castle-interact="${id}"]`);
    if (await immediate.isVisible() && await immediate.isEnabled()) {
      await immediate.click();
      return;
    }
    await page.locator(`[data-wolf-castle-target="${id}"]`).click();
    await page.waitForFunction(({ id, room }) => {
      if (document.querySelector('[data-wolf-castle-dialog]')) return true;
      if (document.querySelector('[data-wolf-castle-room]')?.getAttribute('data-wolf-castle-room') !== room) return true;
      const button = document.querySelector(`[data-wolf-castle-interact="${id}"]`);
      return button && !button.disabled;
    }, { id, room: currentRoom });
    const stillSameRoom = await page.locator('[data-wolf-castle-room]').getAttribute('data-wolf-castle-room') === currentRoom;
    if (stillSameRoom && !await page.locator('[data-wolf-castle-dialog]').count()) {
      await page.locator(`[data-wolf-castle-interact="${id}"]`).click();
    }
  };
  const moveRoom = async id => { await targetStation(`door:${id}`); await waitCastle(id); };
  const castleAction = async type => { await page.locator(`[data-wolf-castle-action="${type}"]`).click(); };
  const resumeCombat = async () => {
    const resume = page.locator('[data-wolf-combat-resume]');
    if (await resume.isVisible()) await resume.click();
  };
  const backgroundTab = async inspectPaused => {
    const context = page.context();
    const focusSession = await context.newCDPSession(page);
    await focusSession.send('Emulation.setFocusEmulationEnabled', { enabled: false });
    await page.bringToFront();
    await page.waitForFunction(() => !document.hidden && document.hasFocus());
    report.focusTransitions.push(await page.evaluate(() => ({ phase: 'before', hidden: document.hidden, focused: document.hasFocus() })));
    const other = await context.newPage();
    try {
      await other.bringToFront();
      await page.waitForFunction(() => document.hidden || !document.hasFocus(), null, { polling: 50 });
      report.focusTransitions.push(await page.evaluate(() => ({ phase: 'background', hidden: document.hidden, focused: document.hasFocus() })));
      await inspectPaused();
    } finally {
      await other.close(); await page.bringToFront();
      await page.waitForFunction(() => !document.hidden && document.hasFocus(), null, { polling: 50 });
      report.focusTransitions.push(await page.evaluate(() => ({ phase: 'restored', hidden: document.hidden, focused: document.hasFocus() })));
      await focusSession.detach();
    }
  };
  const combatSnapshot = () => page.locator('[data-wolf-combat-status]').evaluate(element => ({
    status: element.getAttribute('data-wolf-combat-status'),
    encounter: Number(element.getAttribute('data-wolf-combat-encounter')),
    elapsed: Number(element.getAttribute('data-wolf-combat-elapsed')),
    playerX: Number(element.getAttribute('data-wolf-combat-player-x')),
    playerY: Number(element.getAttribute('data-wolf-combat-player-y')),
    enemyX: Number(element.getAttribute('data-wolf-combat-enemy-x')),
    enemyY: Number(element.getAttribute('data-wolf-combat-enemy-y')),
    enemyPhase: element.getAttribute('data-wolf-combat-enemy-phase'),
    enemyPhaseMs: Number(element.getAttribute('data-wolf-combat-enemy-ms')),
    strike: element.getAttribute('data-wolf-combat-enemy-strike'),
    attackMs: Number(element.getAttribute('data-wolf-combat-player-attack-ms')),
    attackCooldownMs: Number(element.getAttribute('data-wolf-combat-attack-cooldown-ms')),
    defenseCooldownMs: Number(element.getAttribute('data-wolf-combat-defense-cooldown-ms')),
  }));
  const heldKeys = new Set();
  const combatDirections = async (x = 0, y = 0) => {
    const wanted = new Set([...(x > 0 ? ['ArrowRight'] : x < 0 ? ['ArrowLeft'] : []), ...(y > 0 ? ['ArrowDown'] : y < 0 ? ['ArrowUp'] : [])]);
    for (const key of heldKeys) if (!wanted.has(key)) { await page.keyboard.up(key); heldKeys.delete(key); }
    for (const key of wanted) if (!heldKeys.has(key)) { await page.keyboard.down(key); heldKeys.add(key); }
  };
  const playRoyalEncounter = async () => {
    const deadline = Date.now() + 90_000;
    let lastCommandAt = -1000;
    while (Date.now() < deadline) {
      const state = await combatSnapshot();
      if (state.status !== 'active') {
        await combatDirections();
        assert.ok(['intermission', 'victory'].includes(state.status), JSON.stringify(state));
        return;
      }
      const dx = state.enemyX - state.playerX, dy = state.enemyY - state.playerY;
      await combatDirections(Math.abs(dx) > 130 ? Math.sign(dx) : 0, Math.abs(dy) > 10 ? Math.sign(dy) : 0);
      // Read the actual scene; issue ordinary remapped keyboard input. No
      // simulation state, health, clock or save payload is changed by this player.
      if (state.elapsed > lastCommandAt + 100 && state.enemyPhase === 'windup' && state.enemyPhaseMs < 200 &&
          state.enemyPhaseMs > 30 && state.defenseCooldownMs === 0 && state.attackMs === 0) {
        await page.keyboard.press(state.strike === 'thrust' ? 'k' : 'Space');
        lastCommandAt = state.elapsed;
      } else if (state.elapsed > lastCommandAt + 100 && state.enemyPhase === 'recovery' && state.attackCooldownMs === 0 &&
          Math.abs(dx) < 145 && Math.abs(dy) < 35) {
        await page.keyboard.press('j');
        lastCommandAt = state.elapsed;
      }
      await page.waitForTimeout(35);
    }
    await combatDirections();
    throw new Error('The real-input royal encounter did not finish within 90 seconds');
  };
  const openDeparture = async () => {
    await page.locator('[data-campaign-location="deck"]').waitFor();
    const quick = page.getByRole('button', { name: 'Accès rapide aux installations', exact: true });
    if (await quick.getAttribute('aria-expanded') !== 'true') await quick.click();
    const shortcutDetails = page.locator('details.ship-level-accessibility');
    if (await shortcutDetails.getAttribute('open') === null) await shortcutDetails.locator('summary').click();
    await page.getByRole('navigation', { name: 'Accès alternatif aux interfaces, la position du chasseur est conservée', exact: true }).getByRole('button', { name: /^DÉPART/ }).click();
  };
  const launchMission = async () => {
    await openDeparture();
    // A new campaign has no selected mission. Follow the actual map and its
    // autopilot legs, then validate the briefing before returning to the airlock.
    await page.locator('[data-galaxy-v10-level="galaxy"]').waitFor();
    for (const [label, nextLevel] of [[missionRoute.sector.name, 'sector'], [missionRoute.system.name, 'system'], [missionRoute.body.name, 'planet']]) {
      await page.locator('.galaxy-v10-spatial-map button').filter({ hasText: label }).first().click();
      await page.getByRole('button', { name: 'Entrer', exact: true }).click({ timeout: 45_000 });
      await page.locator(`[data-galaxy-v10-level="${nextLevel}"]`).waitFor();
    }
    await page.locator('.galaxy-v10-dossier-nav').getByRole('button', { name: missionRoute.mission.title, exact: false }).click();
    await page.getByRole('button', { name: 'Préparer la chasse', exact: true }).click();
    await page.getByRole('button', { name: 'Valider la destination', exact: true }).click();
    await page.locator('[data-galaxy-v10-level]').waitFor({ state: 'detached' });
    await openDeparture();
    await page.getByRole('button', { name: 'Déployer le chasseur', exact: true }).click();
    await page.locator('[data-arrival-run]').waitFor({ timeout: 90_000 });
    await page.waitForFunction(() => document.querySelector('[data-arrival-run]')?.getAttribute('data-arrival-status') !== 'prepared', null, { timeout: 30_000 });
    if (await page.locator('[data-arrival-status="paused"]').count()) await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
    await page.locator('[data-arrival-status="playing"]').waitFor();
  };
  const assertSingleHunt = async runId => {
    await page.locator('.hunt-screen canvas.hunt-canvas').waitFor({ timeout: 90_000 });
    await page.waitForFunction(({ key, runId }) => JSON.parse(localStorage.getItem(key))?.runId === runId, { key: ACTIVE_HUNT_STORAGE_KEY, runId }, { timeout: 90_000 });
    assert.equal(await page.locator('[data-arrival-run]').count(), 0, 'Arrival must be unmounted before gameplay');
    assert.equal(await page.locator('.hunt-screen canvas.hunt-canvas').count(), 1);
    const probe = await page.evaluate(() => ({ mounts: window.__wolfArrivalQa.mounts, runIds: [...new Set(window.__wolfArrivalQa.activeRunIds)] }));
    assert.equal(probe.mounts, 1, JSON.stringify(probe));
    assert.deepEqual(probe.runIds, [runId]);
    assert.equal((await huntStored()).configuration.appearance.presetId, seed.appearance.presetId);
  };

  let first = await startContext('castle-and-skip');
  page = first.page;
  await check('Main menu resumes the existing campaign on the personal deck', async () => {
    await openApp(); await page.locator('[data-campaign-location="deck"]').waitFor();
  });
  const beforeCastle = await stored();
  await check('The orbital castle remains separate from the personal hull and Clan Ship', async () => {
    await page.locator('[data-wolf-castle-entry]').click();
    await waitCastle('royal-berth', 'approach');
    await screenshot('01-castle-orbit-desktop.png');
    await castleAction('board'); await waitCastle('royal-berth');
    const save = await stored();
    assert.equal(save.wolfCastle.personalShipId, 'classic-predator-spaceship');
    assert.equal(save.wolfCastle.locationId, 'wolf-orbital-castle');
    assert.deepEqual(save.clanShipDocking, beforeCastle.clanShipDocking);
  });
  await check('Walking reaches the airlock, vestibule, gallery and real archive terminal', async () => {
    const beforeTravel = (await stored()).wolfCastle.revision;
    await moveRoom('royal-airlock');
    assert.ok((await stored()).wolfCastle.revision >= beforeTravel + 2, 'The first long walk must survive its real position checkpoint before the doorway transition');
    await moveRoom('royal-vestibule'); await moveRoom('royal-gallery'); await moveRoom('royal-archives');
    await targetStation('archive'); await castleAction('read-archive');
    assert.equal((await stored()).wolfCastle.archiveRead, true);
    await screenshot('02-castle-archives-desktop.png');
  });
  await check('Castle room and personal hull survive menu, reload and Continue', async () => {
    await page.locator('[data-wolf-castle-menu]').click();
    const pausedVisit = (await stored()).wolfCastle;
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await page.locator('[data-campaign-menu]').waitFor();
    await page.reload({ waitUntil: 'networkidle' }); await continueCampaign(); await waitCastle('royal-archives');
    assert.equal((await stored()).wolfCastle.personalShipId, 'classic-predator-spaceship');
    assert.deepEqual((await stored()).wolfCastle.position, pausedVisit.position);
  });
  await check('The audience and council preserve one campaign decision', async () => {
    await moveRoom('royal-gallery'); await moveRoom('royal-audience');
    await targetStation('audience'); await castleAction('hear-audience');
    assert.equal((await stored()).wolfCastle.audience, 'pending');
    await screenshot('03-castle-audience-desktop.png');
    await moveRoom('royal-council'); await targetStation('council'); await castleAction('accept-audience');
    assert.equal((await stored()).wolfCastle.audience, 'accepted');
  });
  await check('The three-seal court trial is traversed and completed without campaign rewards', async () => {
    await moveRoom('royal-service-pass'); await moveRoom('royal-court');
    await targetStation('trial'); await castleAction('start-trial');
    for (const [index, seal] of ['threshold', 'zenith', 'return'].entries()) {
      await targetStation(`seal:${seal}`);
      await page.waitForFunction(({ key, expected }) => JSON.parse(localStorage.getItem(key))?.wolfCastle?.trial?.progress === expected, { key: SAVE_STORAGE_KEY, expected: index + 1 });
    }
    await targetStation('trial'); await castleAction('finish-trial');
    const save = await stored();
    assert.equal(save.wolfCastle.trial.status, 'complete');
    assert.equal(save.wolfCastle.trial.attempts, 1);
    assert.equal(save.wolfCastle.visitedRooms.length, 9);
    assert.deepEqual(save.inventory, beforeCastle.inventory);
    assert.deepEqual(save.missionProgress, beforeCastle.missionProgress);
    await screenshot('04-castle-court-desktop.png');
  });
  await check('The royal court starts a real three-guard fight with damage and a saved exact position', async () => {
    await targetStation('combat'); await castleAction('start-combat');
    await page.locator('[data-wolf-combat-status="active"]').waitFor();
    await resumeCombat();
    await page.waitForFunction(() => Number(document.querySelector('[data-wolf-combat-status]')?.getAttribute('data-wolf-combat-player-health')) < 100, null, { timeout: 20_000 });
    await page.locator('[data-wolf-combat-pause]').click();
    const before = (await stored()).wolfCastle;
    assert.equal(before.combat.status, 'active');
    assert.ok(before.combat.player.health < 100);
    assert.equal(before.position.x, before.combat.player.x);
    assert.equal(before.position.y, before.combat.player.y);
    await page.waitForTimeout(500);
    assert.deepEqual((await stored()).wolfCastle.combat, before.combat);
    await screenshot('16-castle-combat-paused-desktop.png');
  });
  await check('A paused fight survives menu and reload without recovering health or resetting the guard', async () => {
    const before = (await stored()).wolfCastle;
    await page.locator('[data-wolf-castle-menu]').click();
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await page.locator('[data-campaign-menu]').waitFor();
    await page.reload({ waitUntil: 'networkidle' }); await continueCampaign(); await waitCastle('royal-court');
    await page.locator('[data-wolf-combat-resume]').waitFor();
    assert.deepEqual((await stored()).wolfCastle.combat, before.combat);
    assert.deepEqual((await stored()).wolfCastle.position, before.position);
    await page.waitForTimeout(400);
    assert.deepEqual((await stored()).wolfCastle.combat, before.combat);
    await resumeCombat();
  });
  await check('A real browser tab change pauses the fight and returning never resumes it implicitly', async () => {
    let paused;
    await backgroundTab(async () => {
      await page.waitForFunction(() => document.querySelector('[data-wolf-combat-status]')?.getAttribute('data-wolf-combat-paused') === 'true', null, { polling: 50 });
      paused = (await stored()).wolfCastle;
      await page.waitForTimeout(400);
      assert.deepEqual((await stored()).wolfCastle.combat, paused.combat);
    });
    await page.waitForTimeout(300);
    assert.deepEqual((await stored()).wolfCastle.combat, paused.combat);
    await resumeCombat();
  });
  await check('Taking the announced hits ends in defeat, then restart creates one fresh attempt', async () => {
    await page.locator('[data-wolf-combat-status="defeat"]').waitFor({ timeout: 60_000 });
    const failed = (await stored()).wolfCastle.combat;
    assert.equal(failed.status, 'defeat'); assert.equal(failed.player.health, 0);
    assert.equal(failed.attempt, 1); assert.equal(failed.dossier.victories, 0);
    await screenshot('17-castle-combat-defeat.png');
    await castleAction('start-combat'); await resumeCombat();
    await page.locator('[data-wolf-combat-status="active"]').waitFor();
    assert.equal((await stored()).wolfCastle.combat.attempt, 2);
    assert.equal((await stored()).wolfCastle.combat.player.health, 100);
  });
  await check('Combat controls fit 320 pixels and abandoning unlocks the same court safely', async () => {
    await page.setViewportSize({ width: 320, height: 844 });
    const box = await page.locator('[data-wolf-castle-status]').evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    assert.ok(box.scroll <= box.client + 2, JSON.stringify(box));
    await page.locator('[data-wolf-combat-command="attack"]').click();
    await page.waitForTimeout(420);
    await page.locator('[data-wolf-combat-command="evade"]').click();
    await page.locator('[data-wolf-combat-pause]').click();
    await screenshot('18-castle-combat-mobile-320.png');
    await castleAction('abandon-combat');
    assert.equal((await stored()).wolfCastle.combat.status, 'abandoned');
    assert.equal((await stored()).wolfCastle.roomId, 'royal-court');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('Ordinary keyboard movement, timed parries, dodges and attacks defeat the three guards', async () => {
    await targetStation('combat'); await castleAction('start-combat'); await resumeCombat();
    for (let encounter = 0; encounter < 3; encounter++) {
      await playRoyalEncounter();
      const completed = (await stored()).wolfCastle.combat;
      assert.equal(completed.encounterIndex, encounter);
      if (encounter < 2) { await castleAction('next-combat'); await resumeCombat(); }
    }
    const visit = (await stored()).wolfCastle;
    assert.equal(visit.combat.status, 'victory'); assert.equal(visit.combat.dossier.victories, 1);
    assert.equal(visit.combat.attempt, 3);
    assert.ok(visit.combat.stats.hits > 0 && visit.combat.stats.parries > 0 && visit.combat.stats.evades > 0);
    assert.deepEqual((await stored()).inventory, beforeCastle.inventory);
    assert.deepEqual((await stored()).missionProgress, beforeCastle.missionProgress);
    await screenshot('19-castle-combat-victory.png');
    await page.getByRole('button', { name: 'Revenir à la cour', exact: true }).click();
  });
  await check('Castle navigation and return remain usable at 390 and 320 pixels', async () => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const dimensions = await page.locator('[data-wolf-castle-status]').evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.client + 2, `${width}px overflow: ${JSON.stringify(dimensions)}`);
      await page.locator('[data-wolf-castle-map]').click();
      await page.getByRole('button', { name: 'Fermer la consultation', exact: true }).click();
    }
    await screenshot('05-castle-court-mobile-320.png');
    await moveRoom('royal-service-pass'); await moveRoom('royal-vestibule'); await moveRoom('royal-airlock'); await moveRoom('royal-berth');
    await targetStation('personal-ship'); await castleAction('depart');
    await page.locator('[data-campaign-location="deck"]').waitFor();
    assert.equal((await stored()).wolfCastle.status, 'departed');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  let skipRun;
  await check('A campaign launch freezes a single run, destination, ship and hunter before any hunt mounts', async () => {
    await launchMission();
    const save = await stored();
    skipRun = save.planetArrival.runId;
    assert.equal(save.planetArrival.personalShipId, 'classic-predator-spaceship');
    assert.equal(save.planetArrival.destinationId, 'planet-oseris-iv');
    assert.equal(save.planetArrival.hunterPresetId, seed.appearance.presetId);
    assert.equal(save.planetArrivalRun.runId, skipRun);
    assert.equal(await page.locator('.hunt-screen').count(), 0);
    assert.equal(await huntStored(), null);
  });
  await check('A real browser tab change suspends arrival and preserves the same mission on return', async () => {
    let elapsed;
    await backgroundTab(async () => {
      await page.waitForFunction(() => document.querySelector('[data-arrival-run]')?.getAttribute('data-arrival-status') === 'paused', null, { polling: 50 });
      elapsed = await page.locator('[data-arrival-run]').getAttribute('data-arrival-elapsed');
      await page.waitForTimeout(400);
      assert.equal(await page.locator('[data-arrival-run]').getAttribute('data-arrival-elapsed'), elapsed);
    });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-arrival-run]').getAttribute('data-arrival-elapsed'), elapsed);
    assert.equal((await stored()).planetArrival.runId, skipRun);
    await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
    await page.locator('[data-arrival-status="playing"]').waitFor();
  });
  await check('Arrival pause freezes active time and reduced-motion keeps the same mission', async () => {
    await page.keyboard.press('Escape');
    await page.locator('[data-arrival-status="paused"]').waitFor();
    const pausedTime = await page.locator('[data-arrival-run]').getAttribute('data-arrival-elapsed');
    await page.waitForTimeout(650);
    assert.equal(await page.locator('[data-arrival-run]').getAttribute('data-arrival-elapsed'), pausedTime);
    assert.equal(await page.locator('[data-arrival-run]').getAttribute('data-arrival-reduced-motion'), 'true');
    assert.equal((await stored()).planetArrival.runId, skipRun);
    await page.setViewportSize({ width: 320, height: 844 });
    const box = await page.locator('[data-arrival-run]').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    assert.ok(box.scroll <= box.width + 2, JSON.stringify(box));
    await screenshot('06-arrival-pause-mobile-320.png');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('Arrival menu, reload and Continue retain the same run without a gameplay sidecar', async () => {
    await page.getByRole('button', { name: 'Enregistrer et revenir au menu', exact: true }).click();
    await page.locator('[data-campaign-menu]').waitFor();
    await page.reload({ waitUntil: 'networkidle' }); await continueCampaign();
    await page.locator('[data-arrival-status="paused"]').waitFor({ timeout: 90_000 });
    assert.equal((await stored()).planetArrival.runId, skipRun);
    assert.equal((await stored()).planetArrivalRun.runId, skipRun);
    assert.equal(await huntStored(), null);
  });
  await check('A refused handoff leaves the hunt unmounted and can retry the same run once', async () => {
    await page.evaluate(() => { window.__wolfArrivalQa.failArrivalHandoff = true; });
    await page.getByRole('button', { name: /^Passer l’arrivée/ }).click();
    await page.locator('[data-arrival-status="recoverable-error"]').waitFor();
    assert.equal(await page.locator('.hunt-screen').count(), 0);
    assert.equal(await huntStored(), null);
    assert.notEqual((await stored()).planetArrival.status, 'complete');
    await screenshot('07-arrival-handoff-recovery.png');
    await page.evaluate(() => { window.__wolfArrivalQa.failArrivalHandoff = false; });
    await page.getByRole('button', { name: 'Réessayer le départ', exact: true }).focus();
    await padButton(0, false); await padButton(0, true);
    await assertSingleHunt(skipRun);
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => window.__wolfArrivalQa.mounts), 1);
    await padButton(0, false);
    await screenshot('08-hunt-after-skip.png');
  });
  await check('Reload after handoff resumes the real hunt and never replays arrival', async () => {
    await page.reload({ waitUntil: 'networkidle' }); await continueCampaign();
    await page.locator('.hunt-screen canvas.hunt-canvas').waitFor({ timeout: 90_000 });
    assert.equal(await page.locator('[data-arrival-run]').count(), 0);
    assert.equal((await huntStored()).missionId, 'jungle-vey');
    assert.equal(await page.evaluate(() => window.__wolfArrivalQa.mounts), 1);
  });
  await first.context.close();

  first = await startContext('natural-arrival', 'no-preference');
  page = first.page;
  let naturalRun;
  await check('A second isolated campaign launches the full moving arrival', async () => {
    await openApp(); await launchMission(); naturalRun = (await stored()).planetArrival.runId;
    assert.notEqual(naturalRun, skipRun);
    assert.equal(await page.locator('[data-arrival-run]').getAttribute('data-arrival-reduced-motion'), 'false');
  });
  await check('The title, actual carrier and separate capsule are presented before the descent', async () => {
    await page.locator('[data-arrival-shot="title"]').waitFor({ timeout: 25_000 });
    await page.waitForTimeout(900); await screenshot('09-arrival-destination-title.png');
    await page.locator('[data-arrival-shot="carrier"]').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1_000); await screenshot('10-arrival-carrier.png');
    await page.locator('[data-arrival-shot="release"]').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1_000); await screenshot('11-arrival-pod-release.png');
    assert.equal(await page.locator('.hunt-screen').count(), 0);
  });
  await check('Descent reload retains mission and run, then explicitly resumes the same shot', async () => {
    await page.locator('[data-arrival-shot="descent"]').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.locator('[data-arrival-status="paused"]').waitFor();
    assert.equal((await stored()).planetArrival.runId, naturalRun);
    await page.reload({ waitUntil: 'networkidle' }); await continueCampaign();
    await page.locator('[data-arrival-shot="descent"][data-arrival-status="paused"]').waitFor({ timeout: 90_000 });
    assert.equal((await stored()).planetArrival.runId, naturalRun);
    assert.equal(await page.locator('[data-arrival-run]').getAttribute('data-arrival-elapsed'), '31000');
    await page.getByRole('button', { name: 'Reprendre l’arrivée', exact: true }).click();
    await page.locator('[data-arrival-status="playing"]').waitFor();
  });
  await check('Atmosphere, ground impact and the selected hunter lead to exactly one natural handoff', async () => {
    await page.locator('[data-arrival-shot="atmosphere"]').waitFor({ timeout: 16_000 });
    await page.waitForTimeout(600); await screenshot('12-arrival-atmosphere.png');
    await page.locator('[data-arrival-shot="landing"]').waitFor({ timeout: 16_000 });
    await page.locator('[data-arrival-scene][data-arrival-contact="true"]').waitFor({ timeout: 16_000 });
    await screenshot('13-arrival-ground-impact.png');
    assert.equal(await page.locator('[data-arrival-scene]').getAttribute('data-arrival-contact'), 'true');
    await page.locator('[data-arrival-ground-pod="true"]').waitFor();
    await page.locator('[data-arrival-shot="egress"]').waitFor({ timeout: 10_000 });
    await page.waitForTimeout(2_800); await screenshot('14-arrival-hunter-egress.png');
    assert.equal((await stored()).planetArrival.runId, naturalRun);
    await assertSingleHunt(naturalRun);
    assert.equal((await stored()).planetArrival.completedBy, 'natural');
    assert.equal((await stored()).planetArrival.elapsedMs, 62_000);
    await screenshot('15-hunt-after-natural-arrival.png');
  });
  await check('The complete route has no browser exception and every requested visual is available', async () => {
    await page.waitForLoadState('networkidle');
    assert.deepEqual(report.errors, []);
    if (assetsRequired) assert.deepEqual([...missing], [], 'Materialize the observed sparse-checkout assets before final qualification');
  });
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack || String(error);
  if (page) {
    report.failureState = await page.evaluate(key => ({ focused: document.hasFocus(), hidden: document.hidden,
      activeElement: document.activeElement?.outerHTML.slice(0,500),
      interior: document.querySelector('[data-wolf-castle-interior]')?.dataset,
      castle: JSON.parse(localStorage.getItem(key) || 'null')?.wolfCastle,
    }), SAVE_STORAGE_KEY).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure-page.txt'), await page.locator('body').innerText().catch(() => 'Unavailable'));
  }
  console.error(error); process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString(); report.missingAssets = [...missing].sort(); report.requestedAssets = [...requested].sort();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await fs.writeFile(path.join(out, 'observed-assets.json'), JSON.stringify({ source: 'Observed requests from real GameClient wolf-castle and planet-arrival browser route', paths: report.requestedAssets }, null, 2) + '\n');
  if (browser) await browser.close(); if (server) await server.close();
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, output: out, missingAssets: missing.size, assetGateRequired: assetsRequired }));
}
