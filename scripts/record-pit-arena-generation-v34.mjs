import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import { inspectPitArenaImage } from "./pit-arena-image-metadata.mjs";

const receiptPath = process.argv[2];
const archiveOnly = process.argv.includes("--archive-only");
assert(receiptPath?.startsWith("work/v34/"));
const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
assert(/^[a-z0-9-]+$/.test(receipt.arenaId) && /^[a-z0-9-]+$/.test(receipt.id));
const measured = await inspectPitArenaImage(receipt.sourcePath);
const root = `art-source/v34/pit-arenas/${receipt.arenaId}`;
const original = `${root}/sources/${receipt.id}-${measured.sha256.slice(0,12)}.png`;
const publicPath = `/game/sprites/v34/pit-arenas/${receipt.arenaId}/${receipt.id}.png`;
await fs.mkdir(`${root}/sources`, { recursive: true });
if (!archiveOnly) await fs.mkdir(path.dirname("public" + publicPath), { recursive: true });
await fs.copyFile(receipt.sourcePath, original);
const accepted = !receipt.alphaRequired || (measured.hasAlpha && measured.transparentPixels > 0 && measured.visiblePixels > 0);
let contactCrop = null;
if (receipt.floor && accepted) {
  const { data, info } = await sharp(receipt.sourcePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const b = measured.contentBounds;
  outer: for (let y=b.y; y<b.y+Math.ceil(b.height*.5); y++) {
    let start = -1;
    for (let x=b.x; x<=b.x+b.width; x++) {
      const opaque = x<b.x+b.width && data[(y*info.width+x)*info.channels+info.channels-1]>=250;
      if (opaque && start<0) start=x;
      if (!opaque && start>=0) {
        if (x-start>=b.width*.78) {contactCrop={x:start,y,width:x-start,height:b.y+b.height-y};break outer;}
        start=-1;
      }
    }
  }
}
const passed = !archiveOnly && accepted && (!receipt.floor || Boolean(contactCrop));
if (passed) {
  try { const old = await inspectPitArenaImage("public"+publicPath); assert.equal(old.sha256, measured.sha256, "Refusing to overwrite a different accepted PNG"); }
  catch(error) { if (error.code!=="ENOENT") throw error; }
  await fs.copyFile(receipt.sourcePath, "public"+publicPath);
}
const result = {...receipt, generator:"openai-imagegen", sourceFile:path.basename(receipt.sourcePath), archivedSource:original, publicPath:passed?publicPath:null, accepted:passed, ...(archiveOnly ? {excludedFromCoverage:true} : {}), contactCrop,...measured};
delete result.sourcePath;
const evidence = `${root}/receipt-${receipt.id}-${measured.sha256.slice(0,12)}.json`;
await fs.writeFile(evidence, JSON.stringify(result,null,2)+"\n", {flag:"wx"});
await fs.writeFile(`work/v34/checked-${receipt.arenaId}-${receipt.id}.json`,JSON.stringify({...result,evidence},null,2)+"\n");
console.log(JSON.stringify({id:receipt.id,arenaId:receipt.arenaId,accepted:passed,evidence,publicPath:result.publicPath,width:measured.width,height:measured.height,hasAlpha:measured.hasAlpha,contentBounds:measured.contentBounds,contactCrop}));
