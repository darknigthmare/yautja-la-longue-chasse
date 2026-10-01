import assert from 'node:assert/strict';
import { writeHomeworldContractStorageCheckpointFromEnvV70 } from './homeworld-contract-storage-checkpoint-v70.mjs';

/** QA navigation only. No storage write, seeded report, callback or runtime replacement.
 * Prerequisites and proof are obtained through the public city/expedition UI.
 * api must include homeworldPassageV67, homeworldExpedition and glassDesert exports.
 */
export function homeworldSensitiveExpeditionsV70(page, api, {
  city, saveKey = 'yautja-long-hunt.save', controlledClock = true, capture, checkpoint,
  beaconDisposition = 'preserve',
} = {}) {
  assert(city, 'The actual city keyboard navigator is required');
  assert(['preserve', 'disable'].includes(beaconDisposition));
  const held = new Set(), routes = [], checks = [];
  const tick = ms => controlledClock ? page.clock.runFor(ms) : page.waitForTimeout(ms);
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
  const keys = async next => {
    for (const key of held) if (!next.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of next) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  };
  const release = async () => { await keys(new Set()); await tick(32); };
  const photograph = async name => { if (capture) await capture('sensitive-' + name); };
  const preserve = async name => {
    if (checkpoint) await checkpoint('sensitive-' + name);
    else await writeHomeworldContractStorageCheckpointFromEnvV70(page, { saveKey, checkpoint: 'sensitive-' + name });
  };
  const passage = () => page.locator('[data-homeworld-passage-v67]');
  const passagePosition = () => passage().evaluate(e => ({ x: Number(e.dataset.passageX), y: Number(e.dataset.passageY), tick: Number(e.dataset.passageTick) }));
  async function awaitSurface(wait) {
    // Dynamic imports/React transitions and native image decoding must finish
    // with the QA clock running. Inputs are released; this is not a move or a
    // completion callback. Pause again before any controlled keyboard route.
    await release(); if (controlledClock) await page.clock.resume();
    await wait();
    if (controlledClock) await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  }
  async function resumePassage() {
    await awaitSurface(async () => {
      await passage().waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('[data-homeworld-passage-v67]')?.getAttribute('data-passage-assets') === 'true');
    });
    const button = passage().getByRole('button', { name: /^(Commencer la marche|Reprendre la marche|Réessayer la sauvegarde et reprendre)$/ });
    if (await button.count()) { await button.click(); await tick(64); }
    await page.bringToFront(); await passage().getByRole('group').focus(); await tick(48);
    assert(await passage().getByRole('group').evaluate(e => document.activeElement === e && document.hasFocus()));
  }
  async function drivePassage(regionId, a, b) {
    let stagnant = 0, last = await passagePosition();
    for (let attempt = 0; attempt < 2000; attempt++) {
      const p = await passagePosition(), dx = b.x - p.x, dy = b.y - p.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { await release(); return; }
      const direction = Math.sign(b.x - a.x), lookX = Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), p.x + direction * 40));
      const desiredY = a.y + (b.y - a.y) * (lookX - a.x) / (b.x - a.x), errorY = desiredY - p.y;
      const next = new Set();
      if (Math.abs(dx) >= 10 && Math.abs(errorY) < 48) next.add(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      const vertical = Math.abs(dx) < 25 ? dy : errorY;
      if (Math.abs(vertical) > 7) next.add(vertical > 0 ? 'ArrowDown' : 'ArrowUp');
      await keys(next);
      await tick(Math.hypot(dx, dy) < 100 ? Math.max(16, Math.min(80, Math.hypot(dx, dy) / 660 * 1000)) : 80);
      const after = await passagePosition();
      if (Math.hypot(after.x - last.x, after.y - last.y) < 1) stagnant++; else stagnant = 0;
      assert(stagnant < 30, 'Actual passage route stalled ' + JSON.stringify({ regionId, a, b, p }));
      assert(api.isHomeworldPassageWalkableV67(regionId, after), 'Actual passage body remains on its deck');
      last = after;
    }
    throw Error('Passage route budget exceeded ' + JSON.stringify({ regionId, b, last }));
  }
  async function walkPassage(regionId, direction) {
    await resumePassage();
    const definition = api.HOMEWORLD_PASSAGES_V67[regionId], nodes = definition.nodes;
    const indices = direction === 'outbound' ? nodes.slice(1).map((_, i) => i + 1) : nodes.slice(0, -1).map((_, i) => i).reverse();
    for (const index of indices) {
      await drivePassage(regionId, nodes[index + (direction === 'outbound' ? -1 : 1)], nodes[index]);
      routes.push({ regionId, kind: 'legacy-passage', direction, node: index, actual: await passagePosition() });
    }
    await photograph(regionId + '-' + direction + '-threshold');
    await release(); await passage().getByRole('group').focus(); await page.keyboard.press('KeyE'); await tick(160);
    if (direction === 'return') {
      await awaitSurface(() => page.locator('[data-homeworld-hub]').waitFor({ state: 'visible' }));
      assert.equal((await saved()).homeworldPassageV67, null, 'Public threshold durably clears the completed return');
      await city.focus();
    }
    await preserve(regionId + '-' + direction + '-threshold');
  }
  async function inspectTrophy() {
    if ((await saved()).homeworld.evidenceIds.includes('suspect-trophy')) return;
    await city.openPoint('suspect-trophy-point'); await tick(96);
    assert((await saved()).homeworld.evidenceIds.includes('suspect-trophy'), 'Physical trophy inspection is acknowledged');
    await photograph('convoy-trophy'); await city.exitRoom();
    checks.push({ action: 'suspect-trophy', physicalCityVisit: true });
  }
  async function depart(regionId) {
    await city.exitRoom(); await city.focus();
    const source = await saved(); assert(api.canEnterHomeworldPassageV67(source, regionId).allowed, 'Sensitive entrance gate must be truly satisfied');
    const point = api.HOMEWORLD_POINTS.find(p => p.id === 'region-' + regionId);
    const route = api.homeworldSpatialRoute(await city.position(), { x: point.x, y: point.y + 42 });
    assert.equal(route.status, 'reachable'); await city.follow(route.points);
    assert.equal(api.nearestHomeworldPoint(await city.position())?.id, point.id);
    await page.keyboard.press('KeyE'); await tick(96);
    await page.locator('[data-homeworld-hub]').getByRole('dialog').getByRole('button', {
      name: regionId === 'ash-marches' ? 'Partir vers les Marches de Cendre' : 'Partir vers le Désert de Verre', exact: true,
    }).click();
    await walkPassage(regionId, 'outbound');
  }
  function terrain(regionId) {
    const scene = page.locator('[data-homeworld-expedition="' + regionId + '"]');
    const position = () => scene.evaluate(e => ({ x: Number(e.dataset.actorX), y: Number(e.dataset.actorY), grounded: e.dataset.grounded === 'true', tick: Number(e.dataset.expeditionTick) }));
    const focus = async () => { await release(); await page.bringToFront(); await scene.focus(); await tick(32); };
    async function walk(x, { careful = false } = {}) {
      await focus(); let previous = await position(), stagnant = 0;
      for (let attempt = 0; attempt < 2500; attempt++) {
        const p = await position(), dx = x - p.x;
        if (Math.abs(dx) < 6 && p.grounded) { await release(); routes.push({ regionId, kind: 'legacy-terrain-walk', target: x, actual: await position(), careful }); return; }
        const next = new Set(careful ? ['ShiftLeft'] : []);
        if (Math.abs(dx) >= 4) next.add(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        await keys(next); await tick(Math.abs(dx) < 70 ? 17 : 80);
        const current = await position();
        if (Math.hypot(current.x - previous.x, current.y - previous.y) < .1) stagnant++; else stagnant = 0;
        assert(stagnant < 90, 'Actual expedition walk blocked ' + JSON.stringify({ regionId, x, current })); previous = current;
      }
      throw Error('Expedition walk budget exceeded ' + JSON.stringify({ regionId, x, actual: await position() }));
    }
    async function jump(x, expectedY) {
      await focus(); assert((await position()).grounded, 'Jump must begin on physical ground');
      await keys(new Set([x > (await position()).x ? 'ArrowRight' : 'ArrowLeft']));
      await page.keyboard.press('Space'); await tick(34);
      for (let attempt = 0; attempt < 150; attempt++) {
        const p = await position(), dx = x - p.x;
        if (p.grounded) { await release(); if (expectedY !== undefined) assert.equal(p.y, expectedY, 'Jump lands on the intended native platform'); routes.push({ regionId, kind: 'legacy-terrain-jump', target: x, actual: p }); return; }
        await keys(new Set(Math.abs(dx) >= 4 ? [dx > 0 ? 'ArrowRight' : 'ArrowLeft'] : [])); await tick(17);
      }
      throw Error('Actual expedition jump never landed');
    }
    async function inspect({ scan = false } = {}) {
      await focus(); if (scan) { await page.keyboard.press('KeyV'); await tick(34); }
      await page.keyboard.press('KeyE'); await tick(64);
    }
    return { scene, position, focus, walk, jump, inspect };
  }
  async function readyTerrain(t) {
    await awaitSurface(async () => {
      await t.scene.waitFor({ state: 'visible' });
      await t.scene.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    });
    await t.focus();
  }
  async function completeAsh() {
    if ((await saved()).homeworld.expeditions['ash-marches']) return { alreadyRecorded: true };
    await inspectTrophy(); await depart('ash-marches'); const t = terrain('ash-marches');
    await readyTerrain(t);
    await t.walk(450); await t.inspect({ scan: true });
    await t.jump(470, 800); await t.walk(555); await t.jump(690, 680); await t.walk(780); await t.jump(980, 600); await t.inspect();
    await t.walk(1120); await tick(1400); await t.walk(1080); await t.inspect({ scan: true });
    await t.walk(1390); await t.inspect(); await t.walk(1450); await t.jump(1640); await t.jump(1740, 800);
    // The first charge passes left. Waiting above its line lets the following
    // rightward charge physically move the block; no state flag is supplied.
    await release(); await tick(8500); await photograph('ash-covered-charge');
    assert.equal(await t.scene.locator('img[src*="cov-obsidian-pylon-02-broad"]').count(), 0, 'Grazer charge actually displaced the obstacle');
    await t.walk(2360); await t.jump(2530); await t.inspect(); await t.walk(2770); await t.inspect();
    await photograph('ash-convoy'); await t.walk(3040); await t.inspect();
    await awaitSurface(() => passage().waitFor({ state: 'visible' })); const report = (await saved()).homeworld.expeditions['ash-marches'];
    assert(api.normalizeHomeworldExpeditionProof(report), 'Public extraction durably acknowledges the full Ash report');
    checks.push({ action: 'legacy-ash', proof: report, actualGrazerCharge: true, noSeed: true });
    await preserve('ash-report-extraction');
    await walkPassage('ash-marches', 'return'); await photograph('ash-city-return'); return report;
  }
  async function completeGlass() {
    if ((await saved()).homeworld.expeditions['glass-desert']) return { alreadyRecorded: true };
    await completeAsh(); await depart('glass-desert'); const t = terrain('glass-desert');
    await readyTerrain(t); await t.walk(320, { careful: true }); await t.inspect({ scan: true });
    await t.walk(1200, { careful: true }); await t.inspect();
    await t.scene.getByRole('button', { name: 'Corridor de leurre · détourner une émergence', exact: true }).click(); await tick(64); await t.focus();
    await page.keyboard.press('Digit3'); await tick(1800); await photograph('glass-real-diversion');
    await t.walk(2310, { careful: true }); await t.inspect({ scan: true });
    await t.walk(2780, { careful: true }); await t.inspect({ scan: true });
    await t.scene.getByRole('button', { name: beaconDisposition === 'preserve' ? 'Conserver le canal · les impulsions continuent' : 'Couper la balise · perdre le signal vivant', exact: true }).click(); await tick(64);
    await photograph('glass-beacon-choice'); await t.walk(2890, { careful: true }); await t.inspect();
    await t.walk(3450, { careful: true }); await t.inspect(); await awaitSurface(() => passage().waitFor({ state: 'visible' }));
    const report = (await saved()).homeworld.expeditions['glass-desert'];
    assert(api.normalizeGlassDesertProof(report), 'Public extraction durably acknowledges the full Glass report');
    assert.equal(report.crossingRoute, 'decoy-corridor'); assert.equal(report.beaconDisposition, beaconDisposition);
    checks.push({ action: 'legacy-glass', proof: report, actualDecoyDiversion: true, noSeed: true });
    await preserve('glass-report-extraction');
    await walkPassage('glass-desert', 'return'); await photograph('glass-city-return'); return report;
  }
  async function ensureReserveAccess() {
    await preserve('reserve-prerequisites-start');
    const before = await saved(); await completeGlass(); const after = await saved();
    for (const key of ['profile', 'inventory', 'trophies', 'justice', 'loadout', 'missionProgress']) assert.deepEqual(after[key], before[key], 'Investigations cannot grant unrelated ' + key);
    assert(api.canEnterHomeworldRegionV68(after, 'forbidden-reserve').allowed, 'The separately investigated Reserve prerequisite is now real');
    await preserve('reserve-prerequisites-complete');
    return { checks, routes, proof: after.homeworld.expeditions['glass-desert'], noUnrelatedGrant: true };
  }
  return { ensureReserveAccess, completeAsh, completeGlass, inspectTrophy, routes, checks };
}
