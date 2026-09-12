import fs from "node:fs/promises";
import crypto from "node:crypto";
import sharp from "sharp";

/** Read-only measurements: PNG bytes remain untouched. Low-alpha glow does not shrink the visible prop. */
export async function inspectPitArenaImage(file) {
  const bytes = await fs.readFile(file);
  const metadata = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0, visible = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
    if (alpha === 0) transparent++;
    if (alpha > 0) visible++;
    if (alpha >= 16) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  }
  if (right < left || bottom < top) throw new Error("No meaningful visible art in " + file);
  return {
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    width: metadata.width, height: metadata.height, hasAlpha: Boolean(metadata.hasAlpha),
    contentBounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
    transparentPixels: transparent, visiblePixels: visible,
  };
}
