import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(root, "art-source/v26/known-yautja");
const reviews = JSON.parse(fs.readFileSync(path.join(base, "review-input.json"), "utf8"));
const write = process.argv.includes("--write");
const manifest = { schemaVersion: 1, generatedAt: "2026-09-05", provider: "OpenAI built-in imagegen",
  scope: "partial-character-animation-production", fullRosterManifest: "roster.json",
  completeCharacterIds: [], validatedClipCount: 0, integratedIntoGameplay: false,
  sourcePolicy: "Original opaque PNG preserved; explicit color-key only during preview rendering.",
  selectedSheets: [], archivedSources: [] };
for (const item of reviews) {
  if (!/^[a-z0-9-]+$/.test(item.id)) throw Error("Invalid source id");
  const file = path.join(base, "sources", item.id + ".png");
  const bytes = fs.readFileSync(file);
  const meta = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (meta.width !== info.width || meta.height !== info.height || info.channels !== 3) throw Error("Decode mismatch");
  if (item.frames.length !== item.cols * item.rows) throw Error("Missing per-frame review");
  const frames = [];
  for (let i = 0; i < item.frames.length; i++) {
    const col = i % item.cols, row = Math.floor(i / item.cols);
    const x = Math.floor(col * info.width / item.cols), y = Math.floor(row * info.height / item.rows);
    const width = Math.floor((col + 1) * info.width / item.cols) - x;
    const height = Math.floor((row + 1) * info.height / item.rows) - y;
    let minX = width, minY = height, maxX = -1, maxY = -1, edgePixels = 0, visiblePixels = 0;
    const hash = crypto.createHash("sha256");
    for (let cy = 0; cy < height; cy++) {
      hash.update(data.subarray(((y + cy) * info.width + x) * 3, ((y + cy) * info.width + x + width) * 3));
      for (let cx = 0; cx < width; cx++) {
        const p = ((y + cy) * info.width + x + cx) * 3;
        const keyed = Math.abs(data[p] - 255) <= 48 && data[p + 1] <= 48 && Math.abs(data[p + 2] - 255) <= 48;
        if (keyed) continue;
        visiblePixels++;
        if (cx === 0 || cy === 0 || cx === width - 1 || cy === height - 1) edgePixels++;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      }
    }
    if (visiblePixels === 0) throw Error("Empty source cell " + item.id + ":" + i);
    frames.push({ index: i, rect: [x, y, width, height], pivot: [width / 2, height * .86],
      durationTicks: 6, visiblePixels, edgePixels, bbox: [minX, minY, maxX - minX + 1, maxY - minY + 1],
      pixelsSha256: hash.digest("hex"), review: item.frames[i] });
  }
  const promptPath = "prompts/" + item.id + ".txt";
  if (!fs.existsSync(path.join(base, promptPath))) throw Error("Missing exact prompt");
  manifest.selectedSheets.push({ ...item, frames, file: "sources/" + item.id + ".png", promptPath,
    width: meta.width, height: meta.height, bytes: bytes.length, hasAlpha: meta.hasAlpha,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    transparency: { mode: "color-key", rgb: [255, 0, 255], tolerance: 48 },
    orientation: "right", complete: false, filmOneToOneCertified: false,
    gridDivisible: info.width % item.cols === 0 && info.height % item.rows === 0,
    cellsTouchingBorder: frames.filter(f => f.edgePixels > 0).map(f => f.index),
    sourceReference: ["wolf", "city-hunter", "jungle-hunter", "berserker"].includes(item.characterId)
      ? "public/game/assets/v23/pit/fighters/" + item.characterId + "-key-art.webp"
      : "public/game/sprites/v5/film-plates/" + item.characterId + ".png" });
}
const archive = path.join(base, "sources/berserker-wrist-strike.png");
manifest.archivedSources.push({ file: "sources/berserker-wrist-strike.png", status: "rejected",
  reason: "Frame2 shows an incorrectly held/attached blade; superseded by the separately saved repair.",
  sha256: crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex") });
const result = JSON.stringify(manifest, null, 2) + "\n";
const target = path.join(base, "manifest.json");
if (write) fs.writeFileSync(target, result);
else if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== result) throw Error("Sprite batch manifest differs; inspect sources before --write");
console.log(JSON.stringify({ sourceSheets: manifest.selectedSheets.length,
  reviewedCells: manifest.selectedSheets.reduce((n, s) => n + s.frames.length, 0),
  completeCharacters: 0, validatedClips: 0, sourceBytes: manifest.selectedSheets.reduce((n, s) => n + s.bytes, 0),
  rejectedSheets: manifest.selectedSheets.filter(s => s.status === "rejected").map(s => s.id),
  geometryWarnings: manifest.selectedSheets.filter(s => !s.gridDivisible || s.cellsTouchingBorder.length)
    .map(s => ({ id: s.id, gridDivisible: s.gridDivisible, cellsTouchingBorder: s.cellsTouchingBorder })),
  integrity: "passed", readiness: "not-ready-for-gameplay" }, null, 2));
