import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';

const model=homeworldQaModelV64(process.cwd(),['homeworldFaunaV77.ts','homeworldRegionsV68.ts']);

test('native habitat has solid painted cliff mass, exact RGBA bytes and a separate top surface anchor',async()=>{
  const habitat=homeworldQaModelV64(process.cwd(),['homeworldFaunaHabitatV77.ts']).HOMEWORLD_FAUNA_HABITAT_ART_V77;
  const bytes=await fs.readFile('public'+habitat.src);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),habitat.sha256);
  const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,habitat.sourceWidth);assert.equal(metadata.height,habitat.sourceHeight);assert(metadata.hasAlpha);
  assert.equal(habitat.borderPixels,0);assert.equal(habitat.heightWorld/habitat.alphaBounds.height,350/habitat.alphaBounds.width);
  assert(habitat.pivot.y<habitat.alphaBounds.y+habitat.alphaBounds.height/2,'Anchor is the top plateau, not the cliff bottom');
  for(const display of model.HOMEWORLD_FAUNA_DISPLAY_V77){assert(model.homeworldFaunaSourceUrlsV77(display.regionId).includes(habitat.src));}
  assert(model.homeworldFaunaDimensionsV77(habitat.src,habitat.sourceWidth,habitat.sourceHeight));
  assert(!model.homeworldFaunaDimensionsV77(habitat.src,habitat.sourceWidth-1,habitat.sourceHeight));
});

test('supplied PNG bytes, dimensions, alpha bounds and pivots remain exact in the runtime registry',async()=>{
  assert.equal(model.HOMEWORLD_FAUNA_ART_V77.length,12);
  for(const art of model.HOMEWORLD_FAUNA_ART_V77){
    assert.match(art.sourceShare,/^https:\/\/chatgpt\.com\/share\/6ac06513-/);
    const bytes=await fs.readFile('public'+art.src);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256,art.id);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,art.sourceWidth);assert.equal(info.height,art.sourceHeight);
    let left=info.width,top=info.height,right=-1,bottom=-1,border=0;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      if(data[(y*info.width+x)*4+3]<24)continue;
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
      if(x===0||y===0||x===info.width-1||y===info.height-1)border++;
    }
    assert.deepEqual(art.alphaBounds,{x:left,y:top,width:right-left+1,height:bottom-top+1});
    assert.deepEqual(art.sourceRect,{x:0,y:0,width:info.width,height:info.height});
    assert.equal(art.pivot.y,bottom+1);assert.equal(art.borderPixels,border);
  }
});

test('latest static references, former tusks and whole boards remain separate from animated or playable species',()=>{
  assert.equal(model.HOMEWORLD_FAUNA_LATEST_V77.length,5);
  assert.equal(model.HOMEWORLD_FAUNA_REFERENCE_BOARDS_V77.length,5);
  const tusks=model.homeworldFaunaVariantsV77('double-tusk-reference');assert.equal(tusks.length,3);
  assert(model.HOMEWORLD_FAUNA_LATEST_V77.some(a=>a.id==='crustacean-restored-tusks-final'));
  for(const art of model.HOMEWORLD_FAUNA_HELD_V77){assert.equal(art.nativePoses,1);assert.equal(art.nativeAnimationClips,0);}
  const horse=model.homeworldFaunaArtV77('yautja-horse-corrected');assert(horse.referenceOnly);
  assert.equal(horse.borderPixels,8);assert(!model.HOMEWORLD_FAUNA_DISPLAY_V77.some(d=>d.artId===horse.id));
});

test('four wildlife islands stay outside every sampled existing walkable route support',()=>{
  assert.equal(model.HOMEWORLD_FAUNA_DISPLAY_V77.length,4);
  for(const display of model.HOMEWORLD_FAUNA_DISPLAY_V77){
    const route=model.HOMEWORLD_REGIONS_V68[display.regionId].route;
    assert.equal(route[0].y-display.y,300);
    assert(display.x>route[0].x+300&&display.x<route[1].x-300);
    for(let x=display.x-display.ground.width/2;x<=display.x+display.ground.width/2;x+=10)
      for(let y=display.y-display.ground.depth/2;y<=display.y+display.ground.depth/2;y+=10)
        assert.equal(model.regionPassageFloorV68(display.regionId,{x,y}),false,display.id);
    const art=model.homeworldFaunaArtV77(display.artId);assert(art.alphaBounds.width*art.heightWorld/art.alphaBounds.height<display.ground.width);
  }
});

test('held anatomy stays fixed and reduced motion cancels bounded scenic hover',()=>{
  for(const display of model.HOMEWORLD_FAUNA_DISPLAY_V77)for(let tick=0;tick<6000;tick+=31){
    const pose=model.homeworldFaunaPlacementV77(display,tick);
    assert.equal(pose.x,display.x);assert.equal(pose.y,display.y);assert.equal(pose.nativeFrame,0);
    assert(Math.abs(pose.elevation-display.altitude)<=2);
    assert.equal(model.homeworldFaunaPlacementV77(display,tick,true).elevation,display.altitude);
    assert.deepEqual(pose,model.homeworldFaunaPlacementV77(display,tick));
  }
});

test('wrong native dimensions fail closed while legacy regional sources keep their original contract',()=>{
  for(const art of model.HOMEWORLD_FAUNA_ART_V77){
    assert(model.homeworldFaunaDimensionsV77(art.src,art.sourceWidth,art.sourceHeight));
    assert(model.homeworldFaunaDimensionsV77('https://game.example'+art.src,art.sourceWidth,art.sourceHeight));
    assert(!model.homeworldFaunaDimensionsV77(art.src,art.sourceWidth-1,art.sourceHeight));
    assert(!model.homeworldFaunaDimensionsV77(art.src,art.sourceWidth,art.sourceHeight+1));
  }
  assert(model.homeworldFaunaDimensionsV77('/game/legacy.png',1536,192));
  assert(!model.homeworldFaunaDimensionsV77('/game/legacy.png',0,0));
});

test('fauna codex links real reference records without granting collision, trophy or discovery state',()=>{
  const records=model.HOMEWORLD_FAUNA_CODEX_V77,ids=new Set(records.map(r=>r.id));
  assert.equal(records.length,17);assert.equal(ids.size,17);
  for(const record of records){
    assert.equal(record.lore,'original-adaptation');assert.equal(record.footprint,null);assert.equal(record.door,null);
    for(const value of Object.values(record.position))assert(Number.isFinite(value));
    for(const value of Object.values(record.dimensions))assert(Number.isFinite(value)&&value>=0);
    for(const id of record.associatedElementIds??[])assert(ids.has(id));
  }
});

test('both supplied city layouts retain their PNG bytes and stay outside the playable geometry',async()=>{
  const concepts=homeworldQaModelV64(process.cwd(),['homeworldConceptRefsV77.ts']);
  assert.equal(concepts.HOMEWORLD_CONCEPT_REFS_V77.length,2);
  for(const reference of concepts.HOMEWORLD_CONCEPT_REFS_V77){
    const bytes=await fs.readFile('public'+reference.src);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),reference.sha256);
    const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,reference.width);assert.equal(metadata.height,reference.height);
  }
  for(const record of concepts.HOMEWORLD_CONCEPT_CODEX_V77){
    assert.equal(record.footprint,null);assert.equal(record.door,null);assert(record.spaceId.startsWith('reference:'));
    assert(record.constraints.some(text=>text.includes('jamais utilisée comme fond')));
  }
});
