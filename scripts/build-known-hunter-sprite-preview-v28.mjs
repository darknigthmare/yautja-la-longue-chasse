import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import sharp from "sharp";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" && value.trim().length > 0;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const readJson = filename => JSON.parse(fs.readFileSync(filename, "utf8"));
const defaultColorKey = () => ({
  mode: "color-key", rgb: [255, 0, 255], tolerance: 64,
  fringe: { mode: "connected-magenta", radius: 2, minExcess: 24, strength: 1 },
});

function validateTransparency(value, hasAlpha, id) {
  const config = value ?? (hasAlpha ? { mode: "alpha" } : defaultColorKey());
  requireThat(object(config) && ["alpha", "color-key"].includes(config.mode), "Invalid transparency: " + id);
  if (hasAlpha) requireThat(config.mode === "alpha", "Native alpha must be preserved: " + id);
  if (config.mode === "alpha") {
    requireThat(hasAlpha, "Source has no alpha; declare its color key: " + id);
    return { mode: "alpha" };
  }
  requireThat(Array.isArray(config.rgb) && config.rgb.length === 3 &&
    config.rgb.every(value => Number.isInteger(value) && value >= 0 && value <= 255), "Invalid key RGB: " + id);
  requireThat(integer(config.tolerance) && config.tolerance <= 64, "Invalid key tolerance: " + id);
  if (config.fringe !== undefined) {
    const f = config.fringe;
    requireThat(object(f) && f.mode === "connected-magenta" &&
      config.rgb.join(",") === "255,0,255" && [1, 2, 3].includes(f.radius) &&
      integer(f.minExcess) && f.minExcess >= 16 && f.minExcess <= 96 &&
      Number.isFinite(f.strength) && f.strength > 0 && f.strength <= 1, "Invalid fringe: " + id);
  }
  return { mode: "color-key", rgb: [...config.rgb], tolerance: config.tolerance,
    ...(config.fringe === undefined ? {} : { fringe: { ...config.fringe } }) };
}

function normalizeFrames(frames, source, id) {
  requireThat(Array.isArray(frames) && frames.length > 0, "Missing frames: " + id);
  const indexes = new Set();
  const normalized = frames.map(frame => {
    requireThat(object(frame) && integer(frame.index) && !indexes.has(frame.index), "Invalid frame index: " + id);
    indexes.add(frame.index);
    requireThat(text(frame.stage), "Missing frame stage: " + id);
    const rect = frame.rectPx;
    requireThat(Array.isArray(rect) && rect.length === 4 && rect.every(integer) &&
      rect[2] >= 3 && rect[3] >= 3 && rect[0] + rect[2] <= source.width &&
      rect[1] + rect[3] <= source.height, "Invalid source rectangle: " + id);
    const pivot = frame.pivotPx;
    requireThat(object(pivot) && Number.isFinite(pivot.x) && Number.isFinite(pivot.y), "Invalid support pivot: " + id);
    const durationTicks = frame.durationTicks ?? 6;
    requireThat(integer(durationTicks) && durationTicks > 0, "Invalid frame duration: " + id);
    return {
      index: frame.index, stage: frame.stage, rect: [...rect], pivot: [pivot.x, pivot.y], durationTicks,
      ...(frame.supportPoints === undefined ? {} : { supportPoints: frame.supportPoints }),
      ...(frame.nominalCellPx === undefined ? {} : { nominalCellPx: frame.nominalCellPx }),
    };
  });
  for (let a = 0; a < normalized.length; a++) for (let b = a + 1; b < normalized.length; b++) {
    const [x, y, w, h] = normalized[a].rect, [xx, yy, ww, hh] = normalized[b].rect;
    requireThat(!(x < xx + ww && x + w > xx && y < yy + hh && y + h > yy),
      "Overlapping source rectangles: " + id);
  }
  return normalized;
}

/** Read-only source validation, shared by production build and isolated tests. */
export async function collectKnownHunterReview(projectRoot) {
  const base = path.join(projectRoot, "art-source/v28/known-hunters");
  const review = readJson(path.join(base, "review.json"));
  const registration = readJson(path.join(base, "frame-registration.json"));
  requireThat(review.schemaVersion === 1 && Array.isArray(review.entries), "Invalid V28 review schema");
  requireThat(registration.schemaVersion === 1 && Array.isArray(registration.entries), "Invalid V28 registration schema");
  requireThat(review.includeV27 === undefined || typeof review.includeV27 === "boolean", "includeV27 must be explicit boolean");
  const batches = [{ version: "V28", review, registration }];
  if (review.includeV27 === true) {
    const previous = path.join(projectRoot, "art-source/v27/known-yautja");
    const oldReview = readJson(path.join(previous, "review.json"));
    const oldRegistration = readJson(path.join(previous, "frame-registration.json"));
    requireThat(oldReview.schemaVersion === 1 && Array.isArray(oldReview.entries) &&
      oldRegistration.schemaVersion === 1 && Array.isArray(oldRegistration.entries), "Invalid optional V27 schema");
    batches.push({ version: "V27", review: oldReview, registration: oldRegistration });
  }
  const ids = new Set(), entries = [], sources = new Map();
  const artRoot = fs.realpathSync(path.join(projectRoot, "art-source"));
  for (const batch of batches) {
    const registrations = new Map();
    for (const item of batch.registration.entries) {
      requireThat(object(item) && text(item.id) && !registrations.has(item.id), "Duplicate/invalid registration id");
      registrations.set(item.id, item);
    }
    for (const item of batch.review.entries) {
      requireThat(object(item) && text(item.id) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) &&
        !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(item.id) && !ids.has(item.id), "Duplicate/unsafe entry id");
      ids.add(item.id);
      const registered = registrations.get(item.id);
      requireThat(registered && object(registered.source), "Missing registration: " + item.id);
      const characterId = item.characterId ?? registered.characterId;
      requireThat(text(characterId), "Missing character identity: " + item.id);
      if (item.characterId && registered.characterId) requireThat(item.characterId === registered.characterId,
        "Mismatched character identity: " + item.id);
      const species = item.species ?? registered.species ?? (batch.version === "V27" ? "yautja" : undefined);
      requireThat(species === "human" || species === "yautja", "Explicit species required: " + item.id);
      if (item.species && registered.species) requireThat(item.species === registered.species,
        "Mismatched species: " + item.id);
      requireThat(text(item.name) && text(item.variantId) && text(item.action), "Missing visible identity/variant/action: " + item.id);
      requireThat(["draft", "rejected", "validated"].includes(item.status), "Invalid review status: " + item.id);
      requireThat(typeof item.loop === "boolean" && Array.isArray(item.notes) && item.notes.every(text), "Invalid loop/notes: " + item.id);
      const family = item.family ?? (species === "human" ? "humans-in-yautja-armor" : "known-yautja");
      requireThat(text(family), "Invalid subject family: " + item.id);
      const reviewScale = item.reviewScale ?? (species === "human" ? 0.8 : 0.95);
      requireThat(Number.isFinite(reviewScale) && reviewScale >= 0.1 && reviewScale <= 2, "Invalid constant review scale: " + item.id);
      const ticksPerSecond = item.ticksPerSecond ?? 60;
      requireThat(integer(ticksPerSecond) && ticksPerSecond > 0, "Invalid clip timebase: " + item.id);
      requireThat(text(registered.source.path) && /^[a-f0-9]{64}$/.test(registered.source.sha256), "Missing source/hash: " + item.id);
      const absoluteSource = fs.realpathSync(path.resolve(projectRoot, registered.source.path));
      const relative = path.relative(artRoot, absoluteSource);
      requireThat(relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative),
        "Source outside art-source: " + item.id);
      const bytes = fs.readFileSync(absoluteSource);
      const sourceHash = sha256(bytes);
      requireThat(sourceHash === registered.source.sha256, "Source changed: " + item.id);
      const metadata = await sharp(bytes).metadata();
      requireThat(metadata.format === "png", "PNG source required: " + item.id);
      requireThat(metadata.width === registered.source.width && metadata.height === registered.source.height,
        "Source dimensions changed: " + item.id);
      const source = { path: registered.source.path, sha256: sourceHash, bytes: bytes.length,
        width: metadata.width, height: metadata.height, hasAlpha: Boolean(metadata.hasAlpha) };
      const transparency = validateTransparency(item.transparency ?? registered.transparency, source.hasAlpha, item.id);
      entries.push({
        id: item.id, characterId, name: item.name, species, family,
        familyLabel: text(item.familyLabel) ? item.familyLabel : family,
        variantId: item.variantId, variantLabel: text(item.variantLabel) ? item.variantLabel : item.variantId,
        action: item.action, status: item.status, loop: item.loop, notes: [...item.notes],
        reviewScale, ticksPerSecond, sourceBatch: batch.version, transparency, source,
        registrationStatus: registered.status ?? "unspecified",
        frames: normalizeFrames(registered.frames, source, item.id),
      });
      sources.set(item.id, bytes);
    }
  }
  const counts = {
    sheets: entries.length, cells: entries.reduce((total, entry) => total + entry.frames.length, 0),
    subjects: new Set(entries.map(entry => entry.species + ":" + entry.characterId)).size,
    variants: new Set(entries.map(entry => entry.species + ":" + entry.characterId + ":" + entry.variantId)).size,
    humanSheets: entries.filter(entry => entry.species === "human").length,
    yautjaSheets: entries.filter(entry => entry.species === "yautja").length,
    statuses: Object.fromEntries(["draft", "rejected", "validated"].map(status =>
      [status, entries.filter(entry => entry.status === status).length])),
  };
  return { entries, sources, counts, scope: text(review.scope) ? review.scope : "Known hunter authored-sprite review only",
    includeV27: review.includeV27 === true };
}

/** Reproducible outputs; --check compares HTML, bundle, manifests AND copied PNGs. */
export async function buildKnownHunterSpritePreview({ projectRoot = repositoryRoot, check = false } = {}) {
  const collected = await collectKnownHunterReview(projectRoot);
  const scriptRoot = path.join(projectRoot, "scripts");
  const builderPath = path.join(scriptRoot, "build-known-hunter-sprite-preview-v28.mjs");
  const clientPath = path.join(scriptRoot, "known-hunter-preview-v28.client.ts");
  const templatePath = path.join(scriptRoot, "known-hunter-preview-v28.html");
  const atlasPath = path.join(projectRoot, "app/game/hunterSpriteAtlas.ts");
  const template = fs.readFileSync(templatePath, "utf8");
  requireThat(template.split("/*__SPRITE_DATA__*/").length === 2 &&
    template.split("<script>/*__SPRITE_CLIENT__*/</script>").length === 2, "Missing/duplicate V28 template markers");
  const bundled = await build({ entryPoints: [clientPath], bundle: true, format: "iife",
    platform: "browser", target: "es2022", minify: true, write: false, sourcemap: false });
  const client = bundled.outputFiles[0].text;
  const manifest = {
    schemaVersion: 1, scope: collected.scope, sourceMutation: false, includeV27: collected.includeV27,
    completion: { surface: "review-only", completeSubjectIds: [], gameplayValidatedClips: 0 },
    counts: collected.counts,
    generator: {
      builderSha256: sha256(fs.readFileSync(builderPath)),
      clientSha256: sha256(fs.readFileSync(clientPath)),
      templateSha256: sha256(fs.readFileSync(templatePath)),
      transparencyProcessorSha256: sha256(fs.readFileSync(atlasPath)),
    },
    entries: collected.entries,
  };
  const serialized = JSON.stringify(manifest, null, 2) + "\n";
  const inject = entries => template.replace("/*__SPRITE_DATA__*/", () =>
    "window.__hunterReviewV28=" + JSON.stringify({ ...manifest, entries }).replaceAll("<", "\\u003c") + ";");
  const standaloneEntries = collected.entries.map(entry => ({
    ...entry, image: "data:image/png;base64," + collected.sources.get(entry.id).toString("base64"),
  }));
  const publicEntries = collected.entries.map(entry => ({ ...entry, image: entry.id + ".png" }));
  const standalone = inject(standaloneEntries).replace("/*__SPRITE_CLIENT__*/", () => client.replace(/<\/script/gi, "<\\/script"));
  const publicHtml = inject(publicEntries).replace("<script>/*__SPRITE_CLIENT__*/</script>", '<script src="review.js"></script>');
  const artifacts = new Map([
    ["art-source/v28/known-hunters/manifest.json", serialized],
    ["outputs/known-hunters-v28/preview.html", standalone],
    ["public/game/assets/v28/sprite-review/index.html", publicHtml],
    ["public/game/assets/v28/sprite-review/review.js", client],
    ["public/game/assets/v28/sprite-review/manifest.json", serialized],
  ]);
  for (const entry of collected.entries) artifacts.set("public/game/assets/v28/sprite-review/" + entry.id + ".png",
    collected.sources.get(entry.id));
  for (const [relative, content] of artifacts) {
    const filename = path.join(projectRoot, relative), expected = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (check) {
      requireThat(fs.existsSync(filename) && fs.readFileSync(filename).equals(expected), "V28 output stale/missing: " + relative);
    } else {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, expected);
    }
  }
  return { manifest, paths: [...artifacts.keys()] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildKnownHunterSpritePreview({ check: process.argv.includes("--check") });
  const counts = result.manifest.counts;
  console.log("V28: " + counts.sheets + " sheets / " + counts.cells + " cells / " + counts.subjects +
    " subjects; " + counts.humanSheets + " human sheets, " + counts.yautjaSheets +
    " Yautja sheets. Review only; no complete character or gameplay clip declared.");
  console.log(process.argv.includes("--check") ? "All source hashes and generated outputs match." :
    "Public: /game/assets/v28/sprite-review/index.html | outputs/known-hunters-v28/preview.html");
}
