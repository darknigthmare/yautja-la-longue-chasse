import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';

export function parseArenaNumbers(value) {
  const numbers = value === 'all' ? Array.from({length:80},(_,i)=>i+21) : String(value ?? '').split(',').map(Number);
  assert(numbers.length && numbers.every(n=>Number.isInteger(n)&&n>=21&&n<=100), 'Use arena numbers 21..100, comma separated, or all');
  assert.equal(new Set(numbers).size,numbers.length,'Duplicate arena number');
  return numbers;
}
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
/** Status/proof updates do not change the pixels or layout approved by a renderer run. */
export function arenaCompositionDigest(stage) {
  return createHash('sha256').update(JSON.stringify(canonical({number:stage.number,id:stage.catalogueId,
    planes:stage.planes.map(p=>({id:p.id,assets:p.assets.map(a=>({id:a.id,libraryRef:a.libraryRef??null,
      alphaRequired:a.alphaRequired,mode:a.mode,sourceCrop:a.sourceCrop??null,anchorToGround:a.anchorToGround??null,
      verticalAlign:a.verticalAlign??null,...(a.drawOrder===undefined?{}:{drawOrder:a.drawOrder}),...(a.ambientMotion?{ambientMotion:a.ambientMotion}:{}),parallax:a.parallax,opacity:a.opacity,placements:a.placements,animation:a.animation,
      frames:a.frames.map(f=>({path:f.path,sha256:f.generation?.sha256,width:f.generation?.width,height:f.generation?.height,
        hasAlpha:f.generation?.hasAlpha,contentBounds:f.generation?.contentBounds}))}))}))}))).digest('hex');
}
export function libraryEntryFromOriginal(stage,asset) {
  assert(!asset.libraryRef,'Recursive source not allowed');
  return {id:stage.catalogueId+'/'+asset.id,sourceCatalogueId:stage.catalogueId,sourceAssetId:asset.id,
    frames:asset.frames.map(f=>({path:f.path,sha256:f.generation.sha256,width:f.generation.width,
      height:f.generation.height,hasAlpha:f.generation.hasAlpha,contentBounds:f.generation.contentBounds}))};
}

export function assertV42P0Path(catalogueId,publicPath) {
  assert(/^arena-[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(catalogueId),'Invalid V42 arena identifier');
  assert.equal(publicPath,'/game/sprites/v42/pit-arenas/'+catalogueId+'/p0-depth.png','P0 public path must name the exact owned arena file');
}
export async function resolveV42P0File(catalogueId,publicPath,realpath=fs.realpath) {
  assertV42P0Path(catalogueId,publicPath);
  const root=await realpath('public/game/sprites/v42');
  const file=await realpath('public'+publicPath);
  const relative=path.relative(root,file);
  assert(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative),'P0 file escapes the dedicated physical V42 output root');
  return file;
}
