import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

/** Install one visually inspected original PNG without rewriting its pixels.
 * Source support points are explicit metrology, not automatic alpha collision. */
const specPath = process.argv[2];
assert(specPath, 'Pass an inspected asset specification JSON');
const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
assert.match(spec.id, /^[a-z0-9-]+$/);
const bytes = await fs.readFile(spec.input);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const metadata = await sharp(bytes).metadata();
assert(metadata.hasAlpha, 'Native output must preserve real transparency');
const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const alpha = data[(y * info.width + x) * 4 + 3];
  if (alpha === 0) transparent++;
  if (alpha >= 128) {left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
}
assert(right >= left && bottom >= top && transparent / (info.width * info.height) > 0.2);
assert(left > 0 && top > 0 && right < info.width-1 && bottom < info.height-1, 'Solid volume touches a canvas edge');
assert(spec.nativeGroundSupport.length >= 3 && spec.heightWorld > 0);
for (const point of spec.nativeGroundSupport) {
  assert(point.x >= left && point.x <= right && point.y >= top && point.y <= bottom, 'Support point outside measured native silhouette bounds');
}
const pivot = {
  x: spec.nativeGroundSupport.reduce((sum,p)=>sum+p.x,0)/spec.nativeGroundSupport.length,
  y: spec.nativeGroundSupport.reduce((sum,p)=>sum+p.y,0)/spec.nativeGroundSupport.length
};
const manifestPath = 'app/game/data/homeworldNativeDecorV80.json';
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
assert.equal(manifest.schema, 1);
assert(!manifest.assets[spec.id], 'Asset ID already installed: never replace native sources');
const destination = path.resolve('public/game/homeworld/v80', `${spec.id}.png`);
const allowedRoot = path.resolve('public/game/homeworld/v80');
assert(destination.startsWith(allowedRoot + path.sep));
await fs.mkdir(allowedRoot, {recursive:true});
await fs.copyFile(spec.input, destination, fs.constants.COPYFILE_EXCL);
assert.equal(crypto.createHash('sha256').update(await fs.readFile(destination)).digest('hex'),sha256);
manifest.assets[spec.id] = {
  src: `/game/homeworld/v80/${spec.id}.png`, sourceWidth: info.width, sourceHeight: info.height,
  sourceRect: {x:0,y:0,width:info.width,height:info.height},
  alphaBounds: {x:left,y:top,width:right-left+1,height:bottom-top+1}, pivot,
  heightWorld: spec.heightWorld, nativeGroundSupport: spec.nativeGroundSupport, sha256,
  label: spec.label, function: spec.function, lore: spec.lore,
  measurementStatus: 'VISUAL_NATIVE_SUPPORT_CONSERVATIVE_HULL_NOT_CANON_METROLOGY', status: 'MEASURED_NATIVE'
};
await fs.writeFile(manifestPath, JSON.stringify(manifest,null,2)+'\n');
const record = {...spec, sha256, sourceWidth:info.width, sourceHeight:info.height,
  alphaBounds:manifest.assets[spec.id].alphaBounds, transparentPixels:transparent,
  totalPixels:info.width*info.height, destination, sourceByteIdentical:true,
  installedAt:new Date().toISOString(), status:'SOURCE_MEASURED_AND_INSTALLED_RUNTIME_PLACEMENT_SEPARATE'};
const recordPath = path.resolve('docs/art/v80/native-decor', `${spec.id}.json`);
await fs.mkdir(path.dirname(recordPath),{recursive:true});
await fs.writeFile(recordPath,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({id:spec.id,sha256,width:info.width,height:info.height,alphaBounds:record.alphaBounds,pivot,recordPath}));
