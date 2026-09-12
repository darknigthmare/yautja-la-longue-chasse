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
        const canonical = Buffer.alloc(width * height * 4);
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
          const from = ((y + row) * info.width + x + column) * 4, to = (row * width + column) * 4;
          const alpha = processed.pixels[from + 3];
          if (alpha) { visiblePixels++; for (let channel = 0; channel < 4; channel++) canonical[to + channel] = processed.pixels[from + channel]; }
          else transparentPixels++;
          if ((row === 0 || column === 0 || row === height - 1 || column === width - 1) && alpha !== 0) borderPixels++;
        }
        assert.equal(borderPixels, 0, page.id + " clipped alpha edge " + frame.rect);
        assert.ok(visiblePixels > 0 && transparentPixels > 0, page.id + " empty/opaque frame");
        const sha256 = hash(canonical); allDrawingHashes.add(sha256);
        cells.set(frame.rect.join(","), { rect: frame.rect, pivot: frame.pivot, visiblePixels, transparentPixels, borderPixels, sha256 });
      }
      pages.push({ fighterId: entry.fighterId, pageId: page.id, src: page.src, width: info.width, height: info.height,
        sourceSha256: hash(bytes), sourceHasAlpha: (await sharp(bytes).metadata()).hasAlpha,
        transparency: page.transparency, keyedPixels: processed.keyedPixels, fringePixels: processed.fringePixels,
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
    bank = await api.loadPitSpriteSheetAnimations(registry.map(entry => entry.fighterId), registry);
    assert.equal(bank.cancelled, false);
    assert.deepEqual(bank.failedAtlasIds, []);
    assert.equal(bank.readyClipCount, registry.reduce((count, entry) => count + entry.atlas.clips.length, 0));
    for (const entry of registry) for (const clip of entry.atlas.clips) {
      const combat = api.createPitCombatState(entry.fighterId, entry.fighterId === "wolf" ? "jungle-hunter" : "wolf");
      const fighter = combat.fighters[0]; fighter.facing = clip.facing === "right" ? 1 : -1;
      if (clip.id === "walk" || clip.id === "walk-backward") fighter.velocityX = fighter.facing * (clip.id === "walk" ? 3 : -3);
      else if (clip.id === "crouch") fighter.crouching = true;
      else if (clip.id === "high-guard" || clip.id === "low-guard") fighter.guard = clip.id === "high-guard" ? "high" : "low";
      else if (clip.id !== "idle") {
        const match = /^pit\.stand\.(light|medium|heavy)\.(startup|active|recovery)$/.exec(clip.id);
        assert.ok(match, "Production audit needs a real engine-state fixture for " + clip.id);
        const [, attack, phase] = match, timing = api.PIT_FIGHTERS[entry.fighterId].attacks[attack];
        const frame = phase === "startup" ? 0 : phase === "active" ? timing.startup : timing.startup + timing.active;
        Object.assign(fighter, { phase, action: { kind: "attack", attack, frame, connected: false } });
      }
      const resolved = api.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 0, combat });
      assert.ok(resolved, entry.fighterId + " " + clip.id + " " + clip.facing);
      assert.equal(resolved.resolved.frame.clip.id, clip.id);
      assert.equal(resolved.resolved.frame.clip.facing, clip.facing);
      clipReports.push({ fighterId: entry.fighterId, clipId: clip.id, facing: clip.facing, drawnCells: clip.frames.length,
        authoredTicks: clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0),
        runtimePhaseTicks: resolved.resolved.motion.durationTicks, ready: true });
    }
  } finally { Object.assign(globalThis, previous); }
  const sequences = new Set(clipReports.map(clip => JSON.stringify([clip.fighterId, clip.clipId.replace(/\.(startup|active|recovery)$/, ""), clip.facing])));
  return { schemaVersion: 1, verifiedAt: new Date().toISOString(), status: "PASS", method: "Sharp PNG readback through the real atlas preparation and animation loader",
    fighters: registry.map(entry => entry.fighterId), pageCount: pages.length, sourceRequests: requests,
    distinctDrawings: allDrawingHashes.size, readyPhaseClips: bank.readyClipCount, actionSequencesIncludingFacings: sequences.size,
    pages, clips: clipReports, limits: ["Pixel validation does not replace the separate visual anatomy review.",
      "Phase clips are not complete fighter animation libraries.", "The 264 historical production entries are not 264 animation clips or distinct canonical individuals.",
      "No complete character, synchronized throw, victim library or finisher is claimed."] };
}
