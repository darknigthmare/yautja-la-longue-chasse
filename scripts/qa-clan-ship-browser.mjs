import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Real GameClient, campaign slots, storage and input loops in an isolated browser.
// No service, scene or save callback is replaced by a test double.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.CLAN_SHIP_QA_OUTPUT || 'outputs/qa-clan-ship');
await fs.mkdir(out, { recursive: true });
const bundle = await build({
  stdin: { contents: "export {defaultSave,SAVE_STORAGE_KEY} from './app/game/save.ts'; export {isClanShipInteriorWalkable} from './app/game/systems/clanShipInterior.ts';", resolveDir: root },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const { defaultSave, SAVE_STORAGE_KEY, isClanShipInteriorWalkable } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const seed = defaultSave('2026-11-04T10:00:00.000Z');
seed.profile.hunterName = 'QA Clan Ship';
seed.settings.masterVolume = 0;
const checkoutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const workingTreeDirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
const report = { startedAt: new Date().toISOString(), sourceCommit: process.env.CLAN_SHIP_SOURCE_COMMIT || checkoutCommit, checkoutCommit, workingTreeDirty, runtime: 'actual desktop GameClient via Vite', checks: [], errors: [], missingAssets: [], screenshots: [], walking: { samples: 0, rooms: [], transitions: [] } };
const roomRing = ['hangar', 'armurerie', 'entrainement', 'conseil', 'archives', 'trophees', 'soins'];
const missing = new Set();
const loadedRoomArt = new Set();
let server, browser, page;
try {
  if (process.env.CLAN_SHIP_SOURCE_COMMIT) assert.equal(checkoutCommit, process.env.CLAN_SHIP_SOURCE_COMMIT, 'Browser evidence must run the requested source commit, not an unrecorded merge checkout');
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4186, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
  await context.addInitScript(({ key, save }) => {
    if (!localStorage.getItem('__clanShipQaSeeded')) {
      localStorage.setItem(key, JSON.stringify(save));
      localStorage.setItem('__clanShipQaSeeded', '1');
    }
    window.__clanShipQaPad = { index: 0, id: 'isolated-clan-ship-qa', connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__clanShipQaPad] });
    // Read-only observations of the real rendered actor. This does not set any
    // game state, click a callback, replace storage, or advance the scene clock.
    window.__clanShipQaWalk = [];
    let previous = '';
    const observe = () => {
      const scene = document.querySelector('[data-clan-interior]');
      if (scene) {
        const sample = {
          room: scene.getAttribute('data-interior-room'),
          x: Number(scene.getAttribute('data-interior-actor-x')),
          y: Number(scene.getAttribute('data-interior-actor-y')),
        };
        const signature = JSON.stringify(sample);
        if (signature !== previous) { window.__clanShipQaWalk.push(sample); previous = signature; }
      } else previous = '';
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  }, { key: SAVE_STORAGE_KEY, save: seed });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/game/') && (response.status() >= 400 || (response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html')))) missing.add(new URL(response.url()).pathname);
    if (response.status() < 400 && response.headers()['content-type']?.startsWith('image/')) {
      const pathname = new URL(response.url()).pathname;
      if (/^\/game\/clan-ship\/interiors\/[a-z]+-v1\.webp$/.test(pathname)) loadedRoomArt.add(pathname);
    }
  });
  const collectWalking = async () => {
    const samples = await page.evaluate(() => window.__clanShipQaWalk.splice(0));
    for (const sample of samples) {
      assert.ok(roomRing.includes(sample.room), `Unknown rendered room: ${JSON.stringify(sample)}`);
      assert.ok(Number.isFinite(sample.x) && Number.isFinite(sample.y), `Non-finite actor position: ${JSON.stringify(sample)}`);
      // DOM diagnostics are rounded to two decimals. Allow only that rounding
      // distance at a collision boundary, never a floor/obstacle-sized tolerance.
      assert.ok([0, -0.02, 0.02].some(dx => [0, -0.02, 0.02].some(dy => isClanShipInteriorWalkable(sample.room, { x: sample.x + dx, y: sample.y + dy }))), `Actor crossed a solid footprint: ${JSON.stringify(sample)}`);
      if (!report.walking.rooms.includes(sample.room)) report.walking.rooms.push(sample.room);
    }
    report.walking.samples += samples.length;
    return samples;
  };
  const check = async (name, run) => {
    try { await run(); await collectWalking(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
    catch (error) { report.checks.push({ name, passed: false, message: error.message }); throw error; }
  };
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_STORAGE_KEY);
  const waitVisit = (status, room = 'hangar') => page.waitForFunction(({ key, status, room }) => {
    const visit = JSON.parse(localStorage.getItem(key))?.clanShipDocking;
    return visit?.status === status && visit.roomId === room;
  }, { key: SAVE_STORAGE_KEY, status, room }, { timeout: 45000 });
  const clan = () => page.locator('[data-clan-ship-status]');
  const interior = () => page.locator('[data-clan-interior]');
  const actor = () => interior().evaluate(element => ({
    room: element.getAttribute('data-interior-room'),
    x: Number(element.getAttribute('data-interior-actor-x')),
    y: Number(element.getAttribute('data-interior-actor-y')),
    moving: element.getAttribute('data-interior-moving'),
  }));
  const waitStopped = () => page.waitForFunction(() => document.querySelector('[data-clan-interior]')?.getAttribute('data-interior-moving') === 'false', null, { timeout: 45000 });
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const samePosition = (actual, expected, message) => {
    assert.equal(actual.room, expected.room, message);
    assert.ok(Math.hypot(actual.x - expected.x, actual.y - expected.y) < 0.1, `${message}: ${JSON.stringify({ expected, actual })}`);
  };
  const action = type => page.locator(`[data-clan-ship-action="${type}"]`).click();
  const move = async room => {
    await page.locator(`[data-clan-ship-room-target="${room}"]`).click();
    await waitVisit('aboard', room);
    await page.waitForFunction(() => {
      const scene = document.querySelector('[data-clan-interior]');
      return scene?.getAttribute('data-interior-moving') === 'false' && !scene.getAttribute('data-interior-target-room');
    }, null, { timeout: 45000 });
  };
  const point = async (x, y, touch = false, expectArrival = true) => {
    const world = page.locator('[data-interior-world]');
    // Scroll the viewport into the page, never the oversized translated world:
    // scrolling an overflow:hidden ancestor would bypass the game's camera.
    await world.locator('..').scrollIntoViewIfNeeded();
    const rect = await world.boundingBox();
    assert.ok(rect, 'The physical room must have a visible world surface');
    const screen = { x: rect.x + x / 1440 * rect.width, y: rect.y + y / 800 * rect.height };
    if (touch) await page.touchscreen.tap(screen.x, screen.y);
    else await page.mouse.click(screen.x, screen.y);
    await frames();
    if (expectArrival) await page.waitForFunction(({ x, y }) => {
      const scene = document.querySelector('[data-clan-interior]');
      if (!scene || scene.getAttribute('data-interior-moving') !== 'false') return false;
      const actualX = Number(scene.getAttribute('data-interior-actor-x'));
      const actualY = Number(scene.getAttribute('data-interior-actor-y'));
      return Math.hypot(actualX - x, actualY - y) < 0.1;
    }, { x, y }, { timeout: 45000 });
  };
  const interact = () => page.locator('[data-interior-interact]').click();
  const continueCampaign = async () => {
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor({ timeout: 60000 });
  };
  const openClan = async () => {
    await page.getByRole('button', { name: /^Clan Ship AVP ·/ }).click();
    await clan().waitFor();
  };
  const saveAndMenu = async () => {
    await clan().getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await page.locator('[data-campaign-menu]').waitFor();
  };
  const pad = async (button, pressed) => {
    await page.evaluate(({ button, pressed }) => { window.__clanShipQaPad.buttons[button] = { pressed, touched: pressed, value: pressed ? 1 : 0 }; }, { button, pressed });
    await page.waitForTimeout(240);
  };
  const axis = async (x = 0, y = 0) => {
    await page.evaluate(({ x, y }) => { window.__clanShipQaPad.axes = [x, y]; }, { x, y });
    await page.waitForTimeout(240);
  };
  const screenshot = async filename => {
    await page.waitForLoadState('networkidle');
    if (await interior().count()) {
      const art = await interior().evaluate(element => ({
        missing: Array.from(element.querySelectorAll('[data-art-unavailable="true"]'), node => node.getAttribute('data-interior-art')),
        room: element.getAttribute('data-interior-room'),
        background: (() => {
          const image = element.querySelector('[data-interior-background]');
          return image instanceof HTMLImageElement ? { src: image.getAttribute('src'), width: image.naturalWidth } : null;
        })(),
      }));
      assert.deepEqual(art.missing, [], 'An unavailable fixture cannot disappear silently from the visual proof');
      assert.ok(art.background?.width > 0, 'The room backdrop must decode before its screenshot');
      assert.equal(art.background.src, `/game/clan-ship/interiors/${art.room}-v1.webp`, 'The screenshot must show its authored backdrop, not a fallback');
    }
    await page.screenshot({ path: path.join(out, filename), fullPage: true });
    report.screenshots.push(filename);
  };
  await check('Legacy campaign migrates through the real main menu to the personal deck', async () => {
    await page.goto('http://127.0.0.1:4186', { waitUntil: 'networkidle', timeout: 120000 });
    await continueCampaign();
    await page.locator('[data-campaign-location="deck"]').waitFor();
  });
  await check('A held gamepad confirmation advances only one docking stage', async () => {
    await openClan();
    await waitVisit('free-flight');
    await page.locator('[data-clan-ship-action="approach"]').focus();
    await pad(0, false); await pad(0, true);
    await waitVisit('approach');
    await page.waitForTimeout(650);
    assert.equal((await stored()).clanShipDocking.status, 'approach');
    await pad(0, false);
    const vessels = await clan().locator('img').evaluateAll(elements => elements.map(image => image.getAttribute('src')));
    assert.ok(vessels.some(src => src?.includes('/avp-predator-mothership.')), 'The clan mothership must have its own art');
    assert.ok(vessels.some(src => src?.includes('/classic-predator-spaceship.')), 'The selected personal hull must remain separately identifiable');
    await screenshot('01-approach-desktop.png');
  });
  await check('Dock and board preserve the selected personal hull', async () => {
    await action('dock'); await waitVisit('docked');
    assert.equal(await page.locator('[data-clan-ship-room-target]:not(:disabled)').count(), 0);
    await action('board'); await waitVisit('aboard');
    await interior().waitFor();
    assert.equal((await stored()).clanShipDocking.personalShipId, 'classic-predator-spaceship');
    await screenshot('02-hangar-desktop.png');
  });
  await check('Keyboard movement follows the real floor and stops at the wall without crossing a door', async () => {
    const start = await actor();
    await page.locator('[data-interior-world]').focus();
    await page.keyboard.press('e');
    await frames();
    await waitVisit('aboard', 'hangar');
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowLeft');
    const wall = await actor();
    assert.ok(wall.x < start.x - 60, 'The rendered hunter must actually walk left');
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(400); await page.keyboard.up('ArrowLeft');
    const clamped = await actor();
    assert.ok(clamped.x >= 82 - 0.02 && clamped.x <= wall.x + 0.02 && wall.x - clamped.x < 9.1, 'Continuous input must stop within one controller substep of the hull wall');
    assert.equal((await stored()).clanShipDocking.roomId, 'hangar', 'Being near a door must not silently cross it');
    await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
    const right = await actor();
    assert.ok(right.x > wall.x + 30, 'D moves right');
    await page.keyboard.down('q'); await page.waitForTimeout(150); await page.keyboard.up('q');
    assert.ok((await actor()).x < right.x - 15, 'AZERTY Q moves left');
    const beforeUp = await actor();
    await page.keyboard.down('z'); await page.waitForTimeout(150); await page.keyboard.up('z');
    assert.ok((await actor()).y < beforeUp.y - 15, 'AZERTY Z moves up the walkable floor');
    await page.keyboard.down('s'); await page.waitForTimeout(150); await page.keyboard.up('s');
  });
  await check('Gamepad analog movement controls the hunter without selecting an outer menu button', async () => {
    const start = await actor();
    await axis(); await axis(1, 0); await page.waitForTimeout(400); await axis();
    const end = await actor();
    assert.ok(end.x > start.x + 80, 'Analog input must move the real actor');
    assert.equal(end.room, 'hangar');
    assert.equal((await stored()).clanShipDocking.status, 'aboard');
    await page.waitForTimeout(350);
    samePosition(await actor(), end, 'Neutral input stops physical movement');
  });
  await check('Pointer movement follows a collision-safe path across the hangar', async () => {
    const start = await actor();
    await point(520, 680); await waitStopped();
    const end = await actor();
    assert.ok(Math.hypot(end.x - start.x, end.y - start.y) > 80, 'A floor click must move the hunter');
    assert.equal(end.room, 'hangar');
    assert.ok(isClanShipInteriorWalkable(end.room, end));
  });
  await check('Choosing a room hands focus to walking and a fresh key interrupts the guided route', async () => {
    await page.locator('[data-clan-ship-room-target="hangar"]').click();
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
    await page.waitForFunction(() => document.querySelector('[data-clan-interior]')?.getAttribute('data-interior-moving') === 'true');
    const beforeKey = await actor();
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(220); await page.keyboard.up('ArrowLeft');
    await waitStopped();
    const interrupted = await actor();
    assert.ok(interrupted.x < beforeKey.x - 30, 'A direction must take control from the room route without another floor click');
    assert.equal(interrupted.room, 'hangar');
    assert.equal(await interior().getAttribute('data-interior-target-room'), '');
    await page.waitForTimeout(240);
    samePosition(await actor(), interrupted, 'A cancelled guided route cannot restart after the key is released');
  });
  await check('Retargeting a guided route takes effect immediately and Stop cancels it before a doorway', async () => {
    const before = await actor();
    await page.locator('[data-clan-ship-room-target="armurerie"]').click();
    await page.waitForFunction(x => {
      const scene = document.querySelector('[data-clan-interior]');
      return scene?.getAttribute('data-interior-room') === 'hangar' &&
        scene.getAttribute('data-interior-target-room') === 'armurerie' &&
        Number(scene.getAttribute('data-interior-actor-x')) > x + 30;
    }, before.x);
    const retargetedAt = await actor();
    await page.locator('[data-clan-ship-room-target="soins"]').click();
    await page.waitForFunction(x => {
      const scene = document.querySelector('[data-clan-interior]');
      return scene?.getAttribute('data-interior-room') === 'hangar' &&
        scene.getAttribute('data-interior-target-room') === 'soins' &&
        Number(scene.getAttribute('data-interior-actor-x')) < x - 30;
    }, retargetedAt.x);
    await page.locator('[data-interior-cancel]').click();
    await waitStopped();
    const stopped = await actor();
    assert.equal(await interior().getAttribute('data-interior-target-room'), '');
    assert.equal((await stored()).clanShipDocking.roomId, 'hangar');
    await page.waitForTimeout(350);
    samePosition(await actor(), stopped, 'Stopping a retargeted route must cancel both the old and new destination');
  });
  await check('A physical doorway is reached before saving and held confirmation cannot fall through the passage', async () => {
    const door = page.locator('[data-interior-door-target="soins"]');
    await door.click();
    await page.waitForTimeout(100);
    assert.equal((await stored()).clanShipDocking.roomId, 'hangar', 'Door clicks may not teleport the hunter');
    await pad(0, true);
    await waitVisit('aboard', 'soins'); await frames(); await waitStopped();
    const arrived = await actor();
    await page.waitForTimeout(350);
    samePosition(await actor(), arrived, 'Held confirmation cannot move or re-enter a doorway in the new room');
    assert.equal(arrived.room, 'soins');
    assert.equal((await stored()).clanShipDocking.roomId, 'soins');
    assert.equal(await page.locator('[data-station-screen]').count(), 0);
    await pad(0, false);
  });
  await check('A distant room target walks through adjacent doors instead of teleporting', async () => {
    await collectWalking();
    await page.locator('[data-clan-ship-room-target="conseil"]').click();
    await page.waitForTimeout(100);
    assert.notEqual((await stored()).clanShipDocking.roomId, 'conseil', 'The room target must be a walking destination');
    await waitVisit('aboard', 'conseil');
    await page.waitForFunction(() => {
      const scene = document.querySelector('[data-clan-interior]');
      return scene?.getAttribute('data-interior-moving') === 'false' && !scene.getAttribute('data-interior-target-room');
    }, null, { timeout: 45000 });
    const samples = await collectWalking();
    const rooms = ['soins'];
    for (const sample of samples) if (sample.room !== rooms.at(-1)) rooms.push(sample.room);
    assert.ok(rooms.length >= 4, `The cross-ship trip must include its intermediate rooms: ${rooms.join(' → ')}`);
    for (let index = 1; index < rooms.length; index++) {
      const distance = Math.abs(roomRing.indexOf(rooms[index]) - roomRing.indexOf(rooms[index - 1]));
      assert.ok(distance === 1 || distance === roomRing.length - 1, `Non-adjacent transition: ${rooms[index - 1]} → ${rooms[index]}`);
    }
    report.walking.transitions.push({ purpose: 'soins-to-conseil', rooms, samples: samples.length });
  });
  await check('The rendered hunter stops at a real fixture and pointer navigation goes around it', async () => {
    await point(560, 560);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
    await waitStopped();
    const againstTable = await actor();
    assert.ok(againstTable.x >= 560 && againstTable.x < 572, 'The council table footprint must stop direct input');
    await point(620, 540, false, false);
    await page.waitForTimeout(200);
    samePosition(await actor(), againstTable, 'An occupied destination must be refused instead of moving or snapping');
    await point(910, 560);
    assert.ok((await actor()).x > 900, 'The pointer route must reach the far side of the table');
  });
  await check('The archive service requires walking into reach and a separate interaction', async () => {
    await move('archives');
    await point(240, 645); await waitStopped();
    await page.locator('[data-interior-world]').focus();
    await page.keyboard.press('e'); await frames();
    assert.equal(await page.locator('[data-station-screen="codex"]').count(), 0, 'A distant interaction must not open the codex');
    await page.locator('[data-interior-service]').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-station-screen="codex"]').count(), 0, 'Approaching a service must not activate it');
    await waitStopped();
    assert.equal(await page.locator('[data-interior-interact]').getAttribute('data-interior-ready'), 'true');
    assert.equal(await page.locator('[data-station-screen="codex"]').count(), 0, 'Arrival still requires confirmation');
    await page.locator('[data-interior-world]').focus();
    await page.keyboard.press('e');
    const dialog = page.locator('[data-station-screen="codex"]');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: '← Retour au Clan Ship · Échap', exact: true }).click();
    await waitVisit('aboard', 'archives');
  });
  await check('Seven physical rooms and six existing services preserve their room and return position', async () => {
    const services = { conseil: 'clan-war', armurerie: 'armory', trophees: 'trophies', soins: 'medbay', archives: 'codex', entrainement: 'training' };
    for (const [room, service] of Object.entries(services)) {
      await move(room);
      const before = await actor();
      assert.equal(await page.locator('[data-interior-interact]').getAttribute('data-interior-ready'), 'true');
      await screenshot(`interior-${room}-desktop.png`);
      await interact();
      if (service === 'clan-war') {
        await page.locator('[data-clan-war-v85]').waitFor();
        await page.keyboard.press('Escape');
      } else {
        const dialog = page.locator(`[data-station-screen="${service}"]`);
        await dialog.waitFor();
        if (service === 'medbay' || service === 'training') {
          assert.equal(await dialog.getByRole('navigation', { name: 'Salles du vaisseau' }).isVisible(), false);
        }
        if (service === 'codex') {
          await axis(1, 0); await axis();
          samePosition(await actor(), before, 'The service overlay owns input while the actor is suspended');
        }
        await dialog.getByRole('button', { name: '← Retour au Clan Ship · Échap', exact: true }).click();
      }
      await clan().waitFor();
      await waitVisit('aboard', room);
      samePosition(await actor(), before, `The ${service} service must return to its physical approach point`);
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
      if (service === 'clan-war') {
        await page.keyboard.down('d'); await page.waitForTimeout(180); await page.keyboard.up('d');
        await waitStopped();
        assert.ok((await actor()).x > before.x + 25, 'Walking must work immediately after closing the council');
      }
    }
    await move('hangar');
  });
  await check('Settings suspend the clan controller and a manual checkpoint preserves its room', async () => {
    await move('archives');
    await page.locator('[data-interior-world]').focus();
    await page.keyboard.down('d'); await page.waitForTimeout(120);
    await clan().getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Réglages du biomask' });
    await settings.waitFor();
    await frames(); // Let the 30 Hz presentation publish its last pre-pause foot position.
    const stopped = await actor();
    await page.waitForTimeout(300);
    samePosition(await actor(), stopped, 'The settings dialog stops a held walking key');
    await page.locator('[data-manual-save="1"]').click();
    await page.getByText('Sauvegarde manuelle 1 confirmée.', { exact: true }).waitFor();
    assert.equal((await stored()).clanShipDocking.roomId, 'archives');
    await pad(1, false); await pad(1, true);
    await settings.waitFor({ state: 'hidden' });
    await page.waitForTimeout(400);
    assert.equal((await stored()).clanShipDocking.roomId, 'archives');
    assert.equal((await stored()).clanShipDocking.status, 'aboard');
    samePosition(await actor(), stopped, 'Held Back and held movement cannot fall through the settings dialog');
    await page.keyboard.up('d');
    await pad(1, false);
  });
  await check('Switching browser tabs clears movement and requires a fresh input on return', async () => {
    await page.locator('[data-interior-world]').focus();
    await page.keyboard.down('d'); await page.waitForTimeout(120);
    const focusPage = await context.newPage();
    await focusPage.bringToFront();
    await page.waitForTimeout(250);
    const stopped = await actor();
    await page.waitForTimeout(250);
    samePosition(await actor(), stopped, 'A background tab must not keep walking');
    await focusPage.close(); await page.bringToFront();
    await page.waitForTimeout(300);
    samePosition(await actor(), stopped, 'Returning focus must not resurrect held movement');
    await page.keyboard.up('d');
  });
  await check('Save, main menu, reload and Continue restore the exact clan room', async () => {
    await saveAndMenu();
    await page.reload({ waitUntil: 'networkidle' });
    await continueCampaign();
    await page.locator('[data-campaign-location="clan-ship"]').waitFor();
    await waitVisit('aboard', 'archives');
    assert.equal(await clan().getAttribute('data-clan-ship-room'), 'archives');
    assert.equal((await actor()).moving, 'false', 'Loading a room must not restore an old walking command');
    await screenshot('03-archives-resumed.png');
  });
  await check('Loading the real manual checkpoint restores Archives after a later room visit', async () => {
    await move('trophees');
    await saveAndMenu();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="load"]').click();
    await page.locator('[data-campaign-slot="1"]').click();
    await page.locator('[data-checkpoint-id="manual-1"]').click();
    await page.getByRole('dialog', { name: 'Charger ce checkpoint ?' }).getByRole('button', { name: 'Confirmer le chargement', exact: true }).click();
    await page.locator('[data-campaign-session]').waitFor({ timeout: 60000 });
    await waitVisit('aboard', 'archives');
    const resumed = await actor();
    assert.ok(isClanShipInteriorWalkable('archives', resumed));
    await page.waitForTimeout(350);
    samePosition(await actor(), resumed, 'The restored checkpoint starts safely without an old route');
  });
  await check('Returning to the personal ship keeps the berth and blocks travel until undocking', async () => {
    await move('hangar'); await interact();
    await page.locator('[data-campaign-location="deck"]').waitFor();
    await waitVisit('docked');
    await page.getByRole('button', { name: 'Yautja Prime · monde natal', exact: true }).click();
    await page.locator('[data-campaign-location="deck"]').waitFor();
    assert.equal((await stored()).clanShipDocking.status, 'docked');
    await page.getByRole('button', { name: 'Pause / réglages', exact: true }).click();
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await continueCampaign();
    await page.locator('[data-campaign-location="deck"]').waitFor();
    await waitVisit('docked');
    await openClan(); await action('undock'); await waitVisit('free-flight');
    await page.locator('[data-campaign-location="deck"]').waitFor();
  });
  await check('Approach cancellation is durable and never boards the clan ship', async () => {
    await openClan(); await action('approach'); await waitVisit('approach');
    await action('cancel-approach'); await waitVisit('free-flight');
    await page.locator('[data-campaign-location="deck"]').waitFor();
  });
  await check('Touch walking and room navigation work at 390px and 320px without horizontal overflow', async () => {
    await openClan(); await action('approach'); await action('dock'); await action('board');
    await waitVisit('aboard');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const before = await actor();
      await point(before.x + 85, Math.min(680, before.y + 25), true); await waitStopped();
      const after = await actor();
      assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 25, `A touch must move the hunter at ${width}px`);
      await move('armurerie'); await move('hangar');
      const dimensions = await clan().evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.client + 2, `Clan Ship overflow at ${width}px: ${JSON.stringify(dimensions)}`);
      const documentWidth = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(documentWidth.scroll <= documentWidth.viewport + 2, `Page overflow at ${width}px: ${JSON.stringify(documentWidth)}`);
      if (width === 320) {
        const world = page.locator('[data-interior-world]');
        await world.focus();
        for (const control of await world.locator('button').all()) await control.focus();
        const nativeScroll = await page.locator('[data-interior-viewport]').evaluate(element => ({ left: element.scrollLeft, top: element.scrollTop }));
        assert.deepEqual(nativeScroll, { left: 0, top: 0 }, 'Focusing a scene control must not move the native viewport behind the authored camera');
        await world.focus();
        const viewport = page.locator('[data-interior-viewport]');
        await viewport.scrollIntoViewIfNeeded();
        const viewportBox = await viewport.boundingBox();
        assert.ok(viewportBox, 'The mobile room needs a visible viewport');
        const gesture = await context.newCDPSession(page);
        const swipeStart = { x: viewportBox.x + viewportBox.width * 0.25, y: viewportBox.y + viewportBox.height * 0.83 };
        const beforeSwipe = await actor();
        await gesture.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [swipeStart] });
        await gesture.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...swipeStart, y: swipeStart.y - 110 }] });
        await page.waitForTimeout(100);
        await gesture.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await gesture.detach();
        await page.waitForTimeout(240);
        samePosition(await actor(), beforeSwipe, 'A vertical floor swipe must scroll without issuing a walking command');
        const left = page.locator('[data-interior-move="left"]');
        await left.scrollIntoViewIfNeeded();
        const box = await left.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, 'Touch controls need a usable 44px hit target');
        const touch = await context.newCDPSession(page);
        const finger = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const beforeHold = await actor();
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
        await page.waitForTimeout(240);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...finger, x: finger.x + 75 }] });
        await page.waitForTimeout(80);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
        await waitStopped();
        const released = await actor();
        assert.ok(released.x < beforeHold.x - 30, 'Holding the touch pad must move the hunter');
        await page.waitForTimeout(260);
        samePosition(await actor(), released, 'Releasing outside the touch button must stop movement');
      }
    }
    await screenshot('04-hangar-mobile-320.png');
  });
  await check('Normal and reduced motion keep walking functional without looping motion in reduced mode', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const start = await actor();
    await point(start.x - 75, Math.min(680, start.y + 15)); await waitStopped();
    assert.ok(Math.hypot((await actor()).x - start.x, (await actor()).y - start.y) > 25);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await frames();
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    const looping = await interior().evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity).length);
    assert.equal(looping, 0, 'Decorative looping animations must stop for reduced motion');
  });
  await check('Clan ship and shared service artwork load without browser errors', async () => {
    await page.waitForLoadState('networkidle');
    const images = await clan().locator('img').evaluateAll(elements => elements.map(image => ({ src: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth })));
    assert.ok(images.length >= 2, 'The physical room must display its art and the hunter');
    assert.ok(images.every(image => image.complete && image.width > 0), JSON.stringify(images));
    assert.deepEqual(report.errors, []);
    assert.deepEqual([...missing], [], 'The QA checkout must include all assets requested by this route');
    assert.equal(loadedRoomArt.size, 7, 'Each of the seven rooms must have loaded its own individual artwork');
    assert.equal(report.walking.rooms.length, 7, 'The actual hunter must visit all seven rooms');
    assert.ok(report.walking.samples > 100, 'Collision checks must cover physical movement, not only room labels');
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack || String(error);
  if (page) {
    report.lastScene = await page.evaluate(key => {
      const scene = document.querySelector('[data-clan-interior]');
      return {
        visit: JSON.parse(localStorage.getItem(key) || 'null')?.clanShipDocking ?? null,
        scene: scene ? Object.fromEntries(Array.from(scene.attributes).filter(attribute => attribute.name.startsWith('data-')).map(attribute => [attribute.name, attribute.value])) : null,
        recentWalking: window.__clanShipQaWalk?.slice(-12) ?? [],
      };
    }, SAVE_STORAGE_KEY).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure-page.txt'), await page.locator('body').innerText().catch(() => 'Unavailable'));
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.missingAssets = [...missing].sort();
  report.loadedRoomArt = [...loadedRoomArt].sort();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) await server.close();
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, output: out, missingAssets: missing.size }));
}
