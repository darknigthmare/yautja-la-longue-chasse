import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Technical alpha extraction, continuing the user's approved V21 preparation workflow.
// Preserve every source RGB byte and dimensions; only mask the flat neutral background.
const root = "art-source/v22/ship-interior";
const pack = JSON.parse(await readFile(`${root}/generation-prompts.json`, "utf8"));
const threshold = { minimumChannel: 170, maximumChannelSpread: 30, whiteSeedMinimum: 235, whiteSeedSpread: 12, internalMinimumPixels: 96, internalWhiteFraction: .8 };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const assets = [];
for (const job of pack.assets) {
  const source = await readFile(job.source);
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  const { width, height } = info, pixels = width * height;
  const candidates = new Uint8Array(pixels), visited = new Uint8Array(pixels), removed = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const o = i * 3, min = Math.min(data[o], data[o+1], data[o+2]), spread = Math.max(data[o], data[o+1], data[o+2]) - min;
    if (min >= threshold.minimumChannel && spread <= threshold.maximumChannelSpread) candidates[i] = min >= threshold.whiteSeedMinimum && spread <= threshold.whiteSeedSpread ? 2 : 1;
  }
  const components = [];
  for (let first = 0; first < pixels; first++) {
    if (!candidates[first] || visited[first]) continue;
    let head = 0, tail = 1, white = 0, edge = false;
    let left = width, top = height, right = -1, bottom = -1;
    queue[0] = first; visited[first] = 1;
    const add = i => { if (candidates[i] && !visited[i]) { visited[i] = 1; queue[tail++] = i; } };
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      if (candidates[i] === 2) white++;
      if (x === 0 || y === 0 || x === width-1 || y === height-1) edge = true;
      left = Math.min(left,x); top = Math.min(top,y); right = Math.max(right,x); bottom = Math.max(bottom,y);
      if (x > 0) add(i-1); if (x+1 < width) add(i+1);
      if (y > 0) add(i-width); if (y+1 < height) add(i+width);
    }
    // Large, mostly white enclosed components are holes between rails/struts/arms.
    // Small metallic highlights and colored emissive panes are not keyed out.
    if (edge || (tail >= threshold.internalMinimumPixels && white / tail >= threshold.internalWhiteFraction)) {
      for (let q = 0; q < tail; q++) removed[queue[q]] = 1;
      components.push({ pixels: tail, whitePixels: white, touchesBorder: edge, bounds: { x:left, y:top, width:right-left+1, height:bottom-top+1 } });
    }
  }
  const rgba = Buffer.alloc(pixels*4);
  let transparent = 0, left = width, top = height, right = -1, bottom = -1;
  for (let i = 0; i < pixels; i++) {
    rgba[i*4] = data[i*3]; rgba[i*4+1] = data[i*3+1]; rgba[i*4+2] = data[i*3+2]; rgba[i*4+3] = removed[i] ? 0 : 255;
    if (removed[i]) transparent++;
    else { const x=i%width, y=Math.floor(i/width); left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y); }
  }
  assert.ok(transparent > pixels*.05 && transparent < pixels*.95, job.id + ": unexpected extraction area");
  const master = `${root}/${job.id}.png`;
  await sharp(rgba, { raw:{width,height,channels:4} }).png().toFile(master);
  assert.equal(sha(await readFile(job.source)), sha(source), "Generated source was modified");
  assets.push({ id:job.id, source:job.source, sourceSha256:sha(source), master, width, height, transparentPixels:transparent, opaquePixels:pixels-transparent, alphaBounds:{x:left,y:top,width:right-left+1,height:bottom-top+1}, rgbUnchanged:true, sourceUnchanged:true, removedComponents:components });
}
await writeFile(`${root}/alpha-preparation.json`, JSON.stringify({ schemaVersion:1, date:"2026-08-31", status:"prepared", authorization:"User approved local technical alpha preparation for V21, then requested continuation of missing lots with the same workflow", tool:"scripts/prepare-ship-interior-alpha-v22.mjs + sharp", method:"Four-connected bright-neutral components: remove those touching an image edge and enclosed large components dominated by near-white pixels. Only alpha is changed; no repaint, crop, resize, erode or silhouette substitution. Inspect the result separately on a dark background.", threshold, sourcesPreserved:true, runtimeExportsCreated:false, assets },null,2)+"\n");
console.log(JSON.stringify(assets.map(({id,width,height,alphaBounds,removedComponents})=>({id,width,height,alphaBounds,enclosedHoles:removedComponents.filter(c=>!c.touchesBorder).length})),null,2));
