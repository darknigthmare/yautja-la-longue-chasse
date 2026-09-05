import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(path.resolve("package.json"));
const sharp = require("sharp");
const folder = "art-source/v28/known-hunters/characters/machiko";
const entries = [];
const specs = [
  { id: "machiko-ryushi-high-guard", variantId: "machiko-ryushi", clip: "high-guard", stages: ["low-ready", "raise-rifle", "raised-defensive-aim", "braced-recoil", "lower-rifle", "low-ready"], gear: "Human hands; long gun held with two hands; handgun holstered on anatomical right thigh; black katana sheath at anatomical left hip." },
  { id: "machiko-clan-hit-reaction", variantId: "machiko-clan", clip: "hit-reaction", stages: ["ready", "initial-impact", "peak-standing-recoil", "catch-balance", "rising-recovery", "ready"], gear: "Human face/hands/closed boots; one anatomical-left shoulder caster; one blue-green rifle gripped with both hands; wrist blades fully retracted in the corrected source." },
];
const hash = b => crypto.createHash("sha256").update(b).digest("hex");
const thresholds = [160, 180, 200];
const rectUnion = bounds => {
  const x = Math.min(...bounds.map(b => b[0]));
  const y = Math.min(...bounds.map(b => b[1]));
  return [x, y, Math.max(...bounds.map(b => b[0] + b[2])) - x, Math.max(...bounds.map(b => b[1] + b[3])) - y];
};
for (const spec of specs) {
  const sourcePath = "art-source/v28/known-hunters/sources/" + spec.id + ".png";
  const bytes = fs.readFileSync(sourcePath);
  const metadata = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 1536 || info.height !== 1024 || info.channels !== 3) throw Error("Unexpected source geometry: " + spec.id);
  const isForeground = (x, y, t) => {
    const i = (y * info.width + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
    return !(r >= t && b >= t && g <= 120 && r - g >= 70 && b - g >= 70);
  };
  const boundsFor = (x0, x1, y0, y1, t) => {
    let left = info.width, top = info.height, right = -1, bottom = -1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!isForeground(x, y, t)) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left) throw Error("Empty foreground");
    return [left, top, right - left + 1, bottom - top + 1];
  };
  const frames = [];
  for (let row = 0; row < 2; row++) {
    const y0 = row * 512, y1 = y0 + 511;
    const occupied = Array.from({ length: info.width }, (_, x) => {
      for (let y = y0; y <= y1; y++) if (isForeground(x, y, 200)) return true;
      return false;
    });
    const intervals = [];
    let start = -1, last = -1, empty = 0;
    for (let x = 0; x < info.width; x++) {
      if (occupied[x]) { if (start < 0) start = x; last = x; empty = 0; }
      else if (start >= 0 && ++empty >= 12) { intervals.push([start, last]); start = -1; empty = 0; }
    }
    if (start >= 0) intervals.push([start, last]);
    if (intervals.length !== 3) throw Error("Expected three separated bodies in row " + row + ": " + JSON.stringify(intervals));
    for (let col = 0; col < 3; col++) {
      const [x0, x1] = intervals[col], index = row * 3 + col;
      const thresholdBounds = thresholds.map(threshold => ({ threshold, boundsPx: boundsFor(x0, x1, y0, y1, threshold) }));
      const union = rectUnion(thresholdBounds.map(b => b.boundsPx));
      const rect = [Math.max(0, union[0] - 8), Math.max(0, union[1] - 8), 0, 0];
      rect[2] = Math.min(info.width, union[0] + union[2] + 8) - rect[0];
      rect[3] = Math.min(info.height, union[1] + union[3] + 8) - rect[1];
      const bottom = union[1] + union[3] - 1;
      const footXs = [];
      for (let x = x0; x <= x1; x++) {
        for (let y = Math.max(y0, bottom - 60); y <= bottom; y++) {
          if (isForeground(x, y, 180)) { footXs.push(x); break; }
        }
      }
      let splitIndex = -1, largestGap = 0;
      for (let i = 1; i < footXs.length; i++) if (footXs[i] - footXs[i - 1] > largestGap) {
        largestGap = footXs[i] - footXs[i - 1]; splitIndex = i;
      }
      if (largestGap < 8 || splitIndex < 0) throw Error("Cannot separate the two boot contact regions: " + spec.id + " frame " + (index + 1));
      const supportPoints = [footXs.slice(0, splitIndex), footXs.slice(splitIndex)].map((xs, footIndex) => {
        const footBounds = boundsFor(xs[0], xs[xs.length - 1], Math.max(y0, bottom - 60), bottom, 180);
        const soleY = footBounds[1] + footBounds[3] - 1;
        let minX = info.width, maxX = -1;
        for (let y = soleY - 3; y <= soleY; y++) for (let x = xs[0]; x <= xs[xs.length - 1]; x++) {
          if (isForeground(x, y, 180)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
        }
        return { id: footIndex === 0 ? "screen-left-support" : "screen-right-support", sourcePx: { x: (minX + maxX) / 2, y: soleY + 1 }, contactSpanPx: [minX, maxX], lowerFootBandWidthPx: xs[xs.length - 1] - xs[0] + 1 };
      });
      const pivotSourcePx = { x: (supportPoints[0].sourcePx.x + supportPoints[1].sourcePx.x) / 2, y: Math.max(...supportPoints.map(p => p.sourcePx.y)) };
      const outside = thresholds.map(threshold => {
        let count = 0;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isForeground(x, y, threshold) && (x < rect[0] || x >= rect[0] + rect[2] || y < rect[1] || y >= rect[1] + rect[3])) count++;
        return { threshold, outsidePixels: count };
      });
      if (outside.some(r => r.outsidePixels !== 0)) throw Error("Clipped frame");
      frames.push({
        index: index + 1, stage: spec.stages[index], nominalCellPx: [col * 512, row * 512, 512, 512],
        measuredBoundsPx: boundsFor(x0, x1, y0, y1, 180), thresholdBounds, rectPx: rect,
        pivotSourcePx, pivotPx: { x: pivotSourcePx.x - rect[0], y: pivotSourcePx.y - rect[1] },
        pivotInNominalCellPx: { x: pivotSourcePx.x - col * 512, y: pivotSourcePx.y - row * 512 },
        supportPoints, uniformScaleMultiplier: 1, sourcePixelsOutsideRect: outside,
        anatomyReview: spec.gear, status: "registration-proposal-not-art-approved"
      });
    }
  }
  const sha256 = hash(bytes), sha256AfterRead = hash(fs.readFileSync(sourcePath));
  if (sha256 !== sha256AfterRead) throw Error("Source changed during read");
  const corners = [[0,0],[1535,0],[0,1023],[1535,1023]].map(([x,y]) => ({ x, y, rgb: Array.from(data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)) }));
  entries.push({
    id: spec.id, characterId: "machiko", biologicalSpecies: "human", variantId: spec.variantId, clip: spec.clip, status: "draft-registration-only",
    source: { path: sourcePath, sha256, sha256AfterRead, unchanged: true, bytes: bytes.length, width: metadata.width, height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha, background: "Opaque varying magenta; no alpha conversion performed.", cornerSamples: corners },
    measurementMethod: {
      separation: "Full-width column projection in each half-height row, split by twelve consecutive empty columns; no fixed-width clipping.",
      keyClassifier: "Background iff r>=threshold and b>=threshold and g<=120 and r-g>=70 and b-g>=70. Thresholds160/180/200. This only measures pixels; it does not modify them.",
      boundsPolicy: "Union of three threshold bounds plus eight pixels of margin.",
      pivotPolicy: "Midpoint of two measured boot sole contact spans, at the lower sole baseline; constant scale1. Sole span is the union of foreground pixels in each boot's bottom four rows, after separating the lower60px boot bands by largest empty-column gap.",
      caveat: "Mechanical suggestions only. Foot contact geometry and action timing require playback review; no fit-to-height scaling."
    },
    frames
  });
}
const doc = { schemaVersion: 1, scope: "Machiko V28: two explicitly separate human variants, twelve frame registration proposals, unchanged source pixels.", reviewDate: "2026-09-05", gameplayValidated: false, sourcePixelsModified: false, entries };
const output = folder + "/registration.json";
fs.writeFileSync(output, JSON.stringify(doc, null, 2) + "\n");
console.log(JSON.stringify({ output, entries: entries.map(e => ({ id: e.id, sha256: e.source.sha256, frames: e.frames.map(f => ({ index: f.index, rectPx: f.rectPx, pivotPx: f.pivotPx })), corners: e.source.cornerSamples })), unchanged: entries.every(e => e.source.unchanged) }, null, 2));
