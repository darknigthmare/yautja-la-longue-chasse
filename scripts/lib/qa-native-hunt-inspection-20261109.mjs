import assert from 'node:assert/strict';

/** Read-only CDP inspection of production HuntCanvas's retained closure.
 * No function/ref belonging to the game is invoked or written. V8's exposed
 * [[Scopes]] are read from a native React hook ref; only JSON copies leave CDP.
 * This changes neither the bundle, simulation time nor gameplay callbacks. */
export async function inspectNativeHunt20261109(page) {
  const session = await page.context().newCDPSession(page);
  const evaluated = await session.send('Runtime.evaluate', { expression: `(() => {
    const canvas = document.querySelector('.hunt-screen canvas');
    if (!canvas) return [];
    const key = Object.keys(canvas).find(key => key.startsWith('__reactFiber$'));
    let fiber = canvas[key];
    for (let depth = 0; fiber && depth < 30; depth++, fiber = fiber.return) {
      for (const current of [fiber, fiber.alternate]) {
        if (!current) continue;
        const refs = []; let canvasRef = false, hook = current.memoizedState;
        for (let count = 0; hook && count < 150; count++, hook = hook.next) {
          const value = hook.memoizedState;
          if (value && typeof value === 'object' && Object.hasOwn(value, 'current')) {
            if (value.current === canvas) canvasRef = true;
            if (typeof value.current === 'function') refs.push(value.current);
          }
        }
        if (canvasRef) return refs.filter(fn => Function.prototype.toString.call(fn).includes('.paused'));
      }
    }
    return [];
  })()`, objectGroup: 'native-hunt-readonly-20261109', generatePreview: true });
  assert.ok(!evaluated.exceptionDetails, 'React hook references must be readable without executing callbacks');
  assert.ok(evaluated.result.objectId, 'Native HuntCanvas must expose retained hook functions');
  const array = await session.send('Runtime.getProperties', { objectId: evaluated.result.objectId, ownProperties: true });
  const functions = array.result.filter(item => /^\d+$/.test(item.name) && item.value?.type === 'function');
  assert.ok(functions.length, 'Native pause/function hook must retain a real closure');
  const checked = new Set();
  for (const candidate of functions) {
    const details = await session.send('Runtime.getProperties', { objectId: candidate.value.objectId, ownProperties: false });
    const scopes = details.internalProperties?.find(item => item.name === '[[Scopes]]')?.value?.objectId;
    if (!scopes) continue;
    const scopeList = await session.send('Runtime.getProperties', { objectId: scopes, ownProperties: true });
    for (const scope of scopeList.result.filter(item => /^\d+$/.test(item.name) && item.value?.objectId && !/Global|Module|Script/.test(item.value.description ?? ''))) {
      const variables = await session.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
      for (const variable of variables.result) {
        const value = variable.value;
        if (!value?.objectId || value.type !== 'object' || value.subtype || checked.has(value.objectId)) continue;
        checked.add(value.objectId);
        const properties = await session.send('Runtime.getProperties', { objectId: value.objectId, ownProperties: true });
        const names = new Set(properties.result.map(item => item.name));
        if (!['player', 'world', 'enemies', 'scanNodes', 'phase', 'boss'].every(name => names.has(name))) continue;
        const evidence = { method: 'CDP Runtime.getProperties on native React hook function [[Scopes]]; JSON-only snapshots',
          callbackInvoked: false, gameRefWritten: false, bundleModified: false, clockPatched: false,
          scope: scope.value.description, variableName: variable.name, gameKeys: [...names].sort() };
        async function copy(functionDeclaration) {
          const result = await session.send('Runtime.callFunctionOn', { objectId: value.objectId, functionDeclaration, returnByValue: true });
          assert.ok(!result.exceptionDetails, 'Only a read-only snapshot is allowed');
          return result.result.value;
        }
        return { session, evidence, gameObjectId: value.objectId, scopeObjectId: scope.value.objectId,
          read: () => copy(`function () {
            const value = { elapsed: this.elapsed, phase: this.phase, paused: this.paused, player: this.player,
              world: { width: this.world.width, floorY: this.world.floorY, platforms: this.world.platforms,
                bossArena: this.world.bossArena, extraction: this.world.extraction },
              enemies: this.enemies, boss: this.boss, scanNodes: this.scanNodes, recoveryNodes: this.recoveryNodes,
              purgeConsoleNodes: this.purgeConsoleNodes, bossMechanics: this.bossMechanics,
              energyWeaponsLocked: this.energyWeaponsLocked, trophyExtracting: this.trophyExtracting,
              trophyRitual: this.trophyRitual, cameraX: this.cameraX, cameraY: this.cameraY,
              scans: this.scans, kills: this.kills, message: this.message, damageTaken: this.damageTaken,
              completedObjectives: this.completedObjectives, trophyCarried: this.trophyCarried };
            return JSON.parse(JSON.stringify(value, (_key, item) => item instanceof Set ? [...item] : item));
          }`),
          world: () => copy('function () { return JSON.parse(JSON.stringify(this.world)); }'),
          close: () => session.detach(),
        };
      }
    }
  }
  await session.detach();
  throw new Error('Native V8 scopes did not expose a game-shaped object; no observer was installed or fabricated.');
}
