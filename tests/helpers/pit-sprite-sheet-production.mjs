import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import sharp from "sharp";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

/** Real PNG bytes pass through the same Canvas-readback preparation used by the game. */
export async function auditPitSpriteSheetProduction() {
  const built = await build({ stdin: { contents: `export * from './app/game/pitSpriteSheetRegistry.ts';
    export * from './app/game/pitSpriteSheetAnimation.ts'; export * from './app/game/hunterSpriteAtlas.ts';
    export { createPitCombatState, PIT_FIGHTERS } from './app/game/systems/pitCombat.ts';`, resolveDir: projectRoot },
    bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
  const api = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));
  const registry = api.PIT_SPRITE_SHEET_REGISTRY;
  const decoded = new Map(), pages = [], allDrawingHashes = new Set(), clipReports = [];
  for (const entry of registry) {
    const validation = api.validateHunterSpriteAtlas(entry.atlas);
    assert.equal(validation.valid, true, entry.fighterId + ": " + JSON.stringify(validation.issues));
    for (const page of entry.atlas.pages) {
      const path = fileURLToPath(new URL("../../public" + page.src, import.meta.url));
      const bytes = await readFile(path), { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, page.width, page.id); assert.equal(info.height, page.height, page.id);
      const processed = api.processHunterSpriteTransparency(new Uint8ClampedArray(data), info.width, info.height, page.transparency);
      decoded.set(page.src, { pixels: new Uint8ClampedArray(data), width: info.width, height: info.height });
      const cells = new Map();
      for (const clip of entry.atlas.clips) for (const frame of clip.frames) {
        if (frame.pageId !== page.id || cells.has(frame.rect.join(","))) continue;
        const [x, y, width, height] = frame.rect;
        let visiblePixels = 0, transparentPixels = 0, borderPixels = 0;
        let minX = width, minY = height, maxX = -1, maxY = -1;
        const canonical = Buffer.alloc(width * height * 4);
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
          const from = ((y + row) * info.width + x + column) * 4, to = (row * width + column) * 4;
          const alpha = processed.pixels[from + 3];
          if (alpha) {
            visiblePixels++;
            minX = Math.min(minX, column); minY = Math.min(minY, row);
            maxX = Math.max(maxX, column); maxY = Math.max(maxY, row);
            for (let channel = 0; channel < 4; channel++) canonical[to + channel] = processed.pixels[from + channel];
          }
          else transparentPixels++;
          if ((row === 0 || column === 0 || row === height - 1 || column === width - 1) && alpha !== 0) borderPixels++;
        }
        assert.equal(borderPixels, 0, page.id + " clipped alpha edge " + frame.rect);
        assert.ok(visiblePixels > 0 && transparentPixels > 0, page.id + " empty/opaque frame");
        const sha256 = hash(canonical); allDrawingHashes.add(sha256);
        cells.set(frame.rect.join(","), { rect: frame.rect, pivot: frame.pivot, visiblePixels, transparentPixels, borderPixels, sha256,
          alphaBounds: [minX, minY, maxX - minX + 1, maxY - minY + 1],
          margins: [minX, minY, width - maxX - 1, height - maxY - 1] });
      }
      for (const bound of entry.visibleFrameBounds ?? []) {
        if (bound.pageId !== page.id) continue;
        const [x, y, width, height] = bound.rect;
        const [vx, vy, vw, vh] = bound.visibleRect;
        for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) {
          if (col >= vx && col < vx + vw && row >= vy && row < vy + vh) continue;
          assert.equal(processed.pixels[(row * info.width + col) * 4 + 3], 0,
            page.id + " camera bounds omitted a visible source pixel");
        }
      }
      pages.push({ fighterId: entry.fighterId, variantId: entry.variantId ?? null, pageId: page.id, src: page.src, width: info.width, height: info.height,
        sourceSha256: hash(bytes), sourceHasAlpha: (await sharp(bytes).metadata()).hasAlpha,
        transparency: page.transparency, keyedPixels: processed.keyedPixels, fringePixels: processed.fringePixels, alphaNoisePixels: processed.alphaNoisePixels,
        distinctDrawings: new Set([...cells.values()].map(cell => cell.sha256)).size, cells: [...cells.values()] });
      assert.equal(hash(await readFile(path)), hash(bytes), page.id + " source changed during readback");
    }
  }
  const previous = { Image: globalThis.Image, document: globalThis.document };
  const requests = [];
  globalThis.Image = class {
    set src(value) {
      this.source = value; if (!value) return;
      requests.push(value); const source = decoded.get(value);
      if (!source) { queueMicrotask(() => this.onerror?.()); return; }
      this.complete = true; this.naturalWidth = source.width; this.naturalHeight = source.height; this.pixels = source.pixels;
      queueMicrotask(() => this.onload?.());
    }
    get src() { return this.source; }
  };
  globalThis.document = { createElement() {
    let pixels;
    return { width: 0, height: 0, getContext() { return {
      clearRect() {}, drawImage(image) { pixels = new Uint8ClampedArray(image.pixels); },
      getImageData() { return { data: pixels }; }, putImageData(data) { pixels = data.data; },
    }; } };
  } };
  let bank;
  try {
    bank = await api.loadPitSpriteSheetAnimations(registry.map(entry => entry.fighterId), registry,
      { variants: registry.map(entry => entry.variantId ?? null) });
    assert.equal(bank.cancelled, false);
    assert.deepEqual(bank.failedAtlasIds, []);
    assert.equal(bank.readyClipCount, registry.reduce((count, entry) => count + entry.atlas.clips.length, 0));
    for (const entry of registry) for (const clip of entry.atlas.clips) {
      const combat = api.createPitCombatState(entry.fighterId, entry.fighterId === "wolf" ? "jungle-hunter" : "wolf",
        { variants: [entry.variantId ?? null, null] });
      const fighter = combat.fighters[0]; fighter.facing = clip.facing === "right" ? 1 : -1;
      if (clip.id === 'idle' && entry.heldPoseClips?.some(pose => pose.id === 'idle' && pose.facing === clip.facing)) {
        const before = JSON.stringify(combat), options = { simulationFrame: 0, combat };
        assert.equal(api.resolvePitSpriteSheetAnimation(bank, fighter, options), null, 'One native stance must never be counted as animation');
        const held = api.resolvePitSpriteSheetHold(bank, fighter, options);
        assert.ok(held); assert.equal(held.definition.atlas.id, entry.atlas.id);
        assert.equal(held.frame.clip.facing, clip.facing); assert.equal(held.frame.clip.frames.length, 1);
        const calls = [], context = { globalAlpha: 1, save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
        assert.equal(api.drawPitSpriteSheetHold(context, bank, fighter, 440, options), true);
        assert.deepEqual(calls[0].slice(1, 5), clip.frames[0].rect);
        assert.equal(JSON.stringify(combat), before);
        clipReports.push({ fighterId: entry.fighterId, variantId: entry.variantId ?? null, atlasId: entry.atlas.id,
          clipId: clip.id, facing: clip.facing, drawnCells: 1, authoredTicks: 1,
          runtimePosture: 'stand', runtimePhase: 'hold', runtimePhaseTicks: null, status: 'held-native-stance', ready: true });
        continue;
      }
      const presentationKind = /^pit\.presentation\.(intro|victory|defeat)$/.exec(clip.id)?.[1];
      if (presentationKind) {
        const before = JSON.stringify(combat);
        const authoredTicks = clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
        const presentation = { phase: presentationKind === "intro" ? "intro-left" : "match-result",
          elapsedMs: 0, durationMs: Math.max(1200, (authoredTicks + 2) * 1000 / clip.ticksPerSecond),
          round: combat.round, fighterSlot: 0,
          winnerSlot: presentationKind === "defeat" ? 1 : 0, blocksSimulation: true, resultVisible: false };
        let elapsedTicks = 0;
        const drawnFrames = [];
        for (let index = 0; index < clip.frames.length; index++) {
          const expected = clip.frames[index];
          // Sample inside each authored interval, leaving the real combat tick fixed.
          presentation.elapsedMs = (elapsedTicks + .5) * 1000 / clip.ticksPerSecond;
          const options = { simulationFrame: combat.frame, combat, presentation };
          const resolved = api.resolvePitSpriteSheetPresentation(bank, fighter, options);
          assert.ok(resolved, entry.fighterId + " " + clip.id + " " + clip.facing + " cell " + index);
          assert.equal(resolved.status, "dedicated-animation");
          assert.equal(resolved.definition.atlas.id, entry.atlas.id);
          assert.equal(resolved.definition.variantId, entry.variantId);
          assert.equal(resolved.frame.clip.id, clip.id); assert.equal(resolved.frame.clip.facing, clip.facing);
          assert.equal(resolved.frame.frameIndex, index); assert.deepEqual(resolved.frame.frame.rect, expected.rect);
          const calls = [], savedAlpha = [];
          const context = { globalAlpha: 1, save() { savedAlpha.push(this.globalAlpha); },
            restore() { this.globalAlpha = savedAlpha.pop(); }, drawImage(...args) { calls.push(args); } };
          assert.equal(api.drawPitSpriteSheetPresentation(context, bank, fighter, 440, options), true);
          assert.equal(calls.length, 1); assert.equal(calls[0][0], resolved.source);
          assert.deepEqual(calls[0].slice(1, 5), expected.rect);
          assert.equal(context.globalAlpha, 1); assert.equal(savedAlpha.length, 0);
          assert.equal(JSON.stringify(combat), before, "Presentation cannot rewrite combat state, action or replay ticks");
          drawnFrames.push(index); elapsedTicks += expected.durationTicks;
        }
        clipReports.push({ fighterId: entry.fighterId, variantId: entry.variantId ?? null, atlasId: entry.atlas.id,
          clipId: clip.id, facing: clip.facing, drawnCells: clip.frames.length, authoredTicks,
          runtimePosture: "presentation", runtimePhase: presentationKind, runtimePhaseTicks: null,
          presentationClockOnly: true, physicsUnchanged: true, status: "dedicated-animation", drawnFrameIndices: drawnFrames, ready: true });
        continue;
      }
      if (clip.id === "walk" || clip.id === "walk-backward") fighter.velocityX = fighter.facing * (clip.id === "walk" ? 3 : -3);
      else if (clip.id === "crouch") fighter.crouching = true;
      else if (clip.id === "high-guard" || clip.id === "low-guard") fighter.guard = clip.id === "high-guard" ? "high" : "low";
      else if (clip.id === "pit.stand.hitstun") { fighter.phase = "hitstun"; fighter.stunFrames = 40; }
      else if (/^pit\.air\.jump\.(rise|apex|fall)$/.test(clip.id)) {
        // PIT stores altitude above the floor and positive vertical speed while
        // rising. These real engine fields select the clip; no renderer override.
        const jumpPhase = clip.id.split(".").at(-1);
        Object.assign(fighter, { grounded: false, y: jumpPhase === "apex" ? 80 : 40,
          velocityY: jumpPhase === "rise" ? 6 : jumpPhase === "fall" ? -6 : 0 });
      }
      else if (clip.id !== "idle") {
        const match = /^pit\.stand\.(light|medium|heavy|technique\.[a-z0-9-]+)\.(startup|active|recovery)$/.exec(clip.id);
        assert.ok(match, "Production audit needs a real engine-state fixture for " + clip.id);
        const [, action, phase] = match, attack = action.startsWith('technique.') ? 'technique' : action;
        if (attack === 'technique') assert.equal(action, 'technique.' + api.PIT_FIGHTERS[entry.fighterId].technique.id);
        const timing = api.PIT_FIGHTERS[entry.fighterId].attacks[attack];
        const frame = phase === "startup" ? 0 : phase === "active" ? timing.startup : timing.startup + timing.active;
        Object.assign(fighter, { phase, action: { kind: "attack", attack, frame, connected: false } });
      }
      const resolved = api.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 0, combat });
      assert.ok(resolved, entry.fighterId + " " + clip.id + " " + clip.facing);
      assert.equal(resolved.definition.variantId, entry.variantId, "a supplied costume must own its rendered atlas");
      assert.equal(resolved.resolved.frame.clip.id, clip.id);
      assert.equal(resolved.resolved.frame.clip.facing, clip.facing);
      if (clip.id.startsWith("pit.air.jump.")) {
        assert.equal(fighter.grounded, false);
        assert.ok(fighter.y > 0, "Airborne production fixtures must be above the floor");
        assert.equal(fighter.phase, "idle");
        assert.equal(fighter.action, null, "A jump must not borrow an attack phase");
        assert.equal(resolved.resolved.motion.posture, "air");
        assert.equal(resolved.resolved.motion.phase, "locomotion");
        assert.equal(resolved.resolved.motion.durationTicks, null, "Jump art follows observed motion, not an invented attack timer");
      }
      let nativeDrawEvidence;
      if (entry.atlas.id === 'feral-actions-v59') {
        assert.equal(resolved.definition.atlas.id, entry.atlas.id, 'V59 cannot resolve the superseded V34 action');
        const timing = api.PIT_FIGHTERS[entry.fighterId].attacks[fighter.action.attack];
        const phaseStart = fighter.phase === 'startup' ? 0 : fighter.phase === 'active' ? timing.startup : timing.startup + timing.active;
        const totalTicks = clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
        assert.equal(totalTicks, timing[fighter.phase], 'native action intervals match the existing simulation phase exactly');
        let elapsedTicks = 0;
        const drawnFrameIndices = [];
        for (const [index, expected] of clip.frames.entries()) {
          fighter.action.frame = phaseStart + elapsedTicks;
          const before = JSON.stringify(combat), options = { simulationFrame: combat.frame, combat, reducedMotion: true };
          const sample = api.resolvePitSpriteSheetAnimation(bank, fighter, options);
          assert.ok(sample); assert.equal(sample.definition.atlas.id, entry.atlas.id);
          assert.equal(sample.resolved.frame.frameIndex, index);
          assert.deepEqual(sample.resolved.frame.frame.rect, expected.rect);
          assert.equal(sample.resolved.frame.clip.facing, clip.facing);
          const calls = [], savedAlpha = [];
          const forbiddenTransform = () => assert.fail('native Feral drawings must not be mirrored, rotated or transformed');
          const context = { globalAlpha: 1, save() { savedAlpha.push(this.globalAlpha); },
            restore() { this.globalAlpha = savedAlpha.pop(); }, drawImage(...args) { calls.push(args); },
            scale: forbiddenTransform, rotate: forbiddenTransform, transform: forbiddenTransform,
            setTransform: forbiddenTransform, translate: forbiddenTransform };
          assert.equal(api.drawPitSpriteSheetAnimation(context, bank, fighter, 440, options), true);
          assert.equal(calls.length, 1); assert.equal(calls[0][0], sample.source);
          assert.deepEqual(calls[0].slice(1, 5), expected.rect);
          const expectedScale = api.PIT_FIGHTERS[entry.fighterId].bodyHeight /
            (entry.pageBodyHeightPx?.[expected.pageId] ?? entry.bodyHeightPx);
          assert.equal(calls[0][7], expected.rect[2] * expectedScale);
          assert.equal(calls[0][8], expected.rect[3] * expectedScale);
          assert.ok(calls[0][7] > 0 && calls[0][8] > 0);
          assert.equal(context.filter, 'none', 'ordinary native art has no hue or recoloring filter');
          assert.equal(context.globalAlpha, 1); assert.equal(savedAlpha.length, 0);
          assert.deepEqual(api.resolvePitSpriteSheetAnimation(bank, fighter, options).resolved.frame.frame,
            sample.resolved.frame.frame, 'paused ticks retain the same drawing with reduced motion enabled');
          assert.equal(JSON.stringify(combat), before, 'native art cannot rewrite collision boxes, clocks or replay state');
          drawnFrameIndices.push(index); elapsedTicks += expected.durationTicks;
        }
        nativeDrawEvidence = { drawnFrameIndices, physicsUnchanged: true, noMirroring: true, uniformScale: true, filter: 'none' };
      }
      clipReports.push({ fighterId: entry.fighterId, variantId: entry.variantId ?? null, atlasId: entry.atlas.id,
        clipId: clip.id, facing: clip.facing, drawnCells: clip.frames.length,
        authoredTicks: clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0),
        runtimePosture: resolved.resolved.motion.posture, runtimePhase: resolved.resolved.motion.phase,
        runtimePhaseTicks: resolved.resolved.motion.durationTicks, ...nativeDrawEvidence, ready: true });
    }
  } finally { Object.assign(globalThis, previous); }
  const sequences = new Set(clipReports.map(clip => JSON.stringify([clip.fighterId, clip.variantId, clip.clipId.replace(/\.(startup|active|recovery)$/, ""), clip.facing])));
  return { schemaVersion: 1, verifiedAt: new Date().toISOString(), status: "PASS", method: "Sharp PNG readback through the real atlas preparation and animation loader",
    fighters: [...new Set(registry.map(entry => entry.fighterId))],
    historicalFighters: [...new Set(registry.filter(entry => entry.variantId === undefined).map(entry => entry.fighterId))],
    appearances: [...new Map(registry.map(entry => [JSON.stringify([entry.fighterId, entry.variantId ?? null]),
      { fighterId: entry.fighterId, variantId: entry.variantId ?? null }])).values()], pageCount: pages.length, sourceRequests: requests,
    distinctDrawings: allDrawingHashes.size, readyPhaseClips: bank.readyClipCount, actionSequencesIncludingFacings: sequences.size,
    pages, clips: clipReports, limits: ["Pixel validation does not replace the separate visual anatomy review.",
      "Phase clips are not complete fighter animation libraries.", "The 264 historical production entries are not 264 animation clips or distinct canonical individuals.",
      "No complete character, synchronized throw, victim library or finisher is claimed."] };
}
