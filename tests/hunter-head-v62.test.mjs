import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import test from 'node:test';
import {HUNTER_HEAD_ART_V62,HUNTER_HEAD_FAMILY_V62,hunterHeadArtV62,hunterBodyPartClipV62} from '../app/game/hunterHeadArtV62.ts';
import {hunterBodyPartPath,hunterBodyPartHasNet,hunterBodyPartPlacement,HUNTER_ASSET_ROOT_V3} from '../app/game/hunterVisuals.ts';

test('native heads preserve their original pixels and alpha, with transparent margins and proportional registration', async()=>{
 const measurements=JSON.parse(fs.readFileSync('docs/v62-head-native-measurements.json'));
 assert.equal(measurements.length,4);
 for(const row of measurements){
  const file='public'+row.path,bytes=fs.readFileSync(file),metadata=await sharp(bytes).metadata();
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
  assert.equal(metadata.hasAlpha,true);assert(row.transparentFraction>.3);assert(row.borderAlphaMax<=1);
  const placement=HUNTER_HEAD_ART_V62[row.id].placement;
  assert(Math.abs(placement.width/placement.height-metadata.width/metadata.height)<.00001);
  const bottom=placement.y+(row.bounds.bottom+1)*placement.height/metadata.height;
  assert(Math.abs(bottom-103)<.001,'neck remains attached at the measured socket');
 }
});
test('all six morphs use a new head; only four distinct families are claimed and legacy files remain intact',()=>{
 assert.equal(Object.keys(HUNTER_HEAD_FAMILY_V62).length,6);
 assert.equal(new Set(Object.values(HUNTER_HEAD_FAMILY_V62)).size,4);
 for(const morph of Object.keys(HUNTER_HEAD_FAMILY_V62)){
  assert.equal(hunterBodyPartPath(morph,'head'),hunterHeadArtV62(morph).path);
  assert(hunterBodyPartPlacement(morph,'head'));
  assert.equal(hunterBodyPartHasNet(morph,'head'),false,'old facial pixels must not cover the new head');
  assert.equal(hunterBodyPartPlacement(morph,'torso'),undefined);
  assert(fs.existsSync('public'+HUNTER_ASSET_ROOT_V3+'/body/'+morph+'/parts/head.webp'));
 }
});
test('Super arm clipping removes exactly the detached old jaw island and preserves all1934 arm pixels',async()=>{
 const clips=hunterBodyPartClipV62('super','upper-arm-front');
 const {data,info}=await sharp('public'+HUNTER_ASSET_ROOT_V3+'/body/super/parts/upper-arm-front.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let kept=0,rejected=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  if(data[(y*info.width+x)*4+3]<=32)continue;
  if(clips.some(([cx,cy,w,h])=>x>=cx&&x<cx+w&&y>=cy&&y<cy+h))kept++;else rejected++;
 }
 assert.equal(kept,1934);assert.equal(rejected,50);
});
