import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {pitNativeShaV61,verifyPitNativeV61} from '../scripts/lib/pit-stage-native-v61.mjs';

async function fixture({repeat=false,border=0}={}) {
  await fs.mkdir('work-local/v61',{recursive:true});const directory=await fs.mkdtemp(path.resolve('work-local/v61/native-audit-test-'));
  const w=192,h=128,pixels=Buffer.alloc(w*h*4),frames=[];
  for(let i=0;i<6;i++){
    const sx=i%3*64,sy=Math.floor(i/3)*64,width=repeat?10:10+i;
    for(let y=10;y<24;y++)for(let x=10;x<10+width;x++){const at=((sy+y)*w+sx+x)*4;pixels[at]=100;pixels[at+1]=repeat?40:40+i*10;pixels[at+2]=70;pixels[at+3]=255;}
    if(border){const at=((sy+12)*w+sx)*4;pixels[at+3]=border;}
    frames.push({rect:[sx,sy,64,64],pivot:[15,24],alphaBounds:border>2?[0,10,10+width,14]:[10,10,width,14]});
  }
  const bytes=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
  const src='/game/sprites/v61/pit-story/arena-001-test/gesture.png',publicRoot=directory+'/public',workspacePath=directory+'/synthetic-native.png';
  await fs.mkdir(path.dirname(publicRoot+src),{recursive:true});await fs.writeFile(publicRoot+src,bytes);await fs.writeFile(workspacePath,bytes);
  const event={id:'synthetic-qa-gesture',src,width:w,height:h,sha256:pitNativeShaV61(bytes),frames};
  const receipt={mode:'built-in-imagegen',status:'visually-accepted',visualNotes:'Synthetic audit test fixture; never a generation receipt or delivered asset.',sha256:event.sha256,copyByteIdentical:true,workspacePath,frames};
  return {event,receipt,publicRoot,bytes};
}
test('native audit reads actual PNG alpha, distinct cells and exact producer/runtime hashes without editing pixels',async()=>{
  const f=await fixture(),result=await verifyPitNativeV61(f.event,f.receipt,f.publicRoot);
  assert.equal(result.nativeDrawings,6);assert(result.cells.every(c=>c.borderPixels===0));assert.deepEqual(result.cells.map(c=>c.alphaBounds),f.event.frames.map(f=>f.alphaBounds));
  assert.equal(pitNativeShaV61(await fs.readFile(f.publicRoot+f.event.src)),pitNativeShaV61(f.bytes));
});
test('native audit refuses copied poses, false bounds, overlap, changed bytes and unreviewed provenance',async()=>{
  const repeated=await fixture({repeat:true});await assert.rejects(()=>verifyPitNativeV61(repeated.event,repeated.receipt,repeated.publicRoot),/repeated drawing/);
  const f=await fixture();
  const bounds=structuredClone(f);bounds.event.frames[0].alphaBounds[0]++;bounds.receipt.frames=structuredClone(bounds.event.frames);
  await assert.rejects(()=>verifyPitNativeV61(bounds.event,bounds.receipt,f.publicRoot),/actual alpha/);
  const overlap=structuredClone(f);overlap.event.frames[1]=structuredClone(overlap.event.frames[0]);overlap.receipt.frames=structuredClone(overlap.event.frames);
  await assert.rejects(()=>verifyPitNativeV61(overlap.event,overlap.receipt,f.publicRoot),/overlap/);
  await assert.rejects(()=>verifyPitNativeV61(f.event,{...f.receipt,status:'pending'},f.publicRoot),/accepted/);
  await assert.rejects(()=>verifyPitNativeV61(f.event,{...f.receipt,visualNotes:''},f.publicRoot),/visual review/);
  await fs.writeFile(f.receipt.workspacePath,'not the native PNG');await assert.rejects(()=>verifyPitNativeV61(f.event,f.receipt,f.publicRoot),/producer copy/);
});
test('edge clipping is blocked; the only optional halo exception is explicitly reviewed and measured at alpha<=16',async()=>{
  const clipped=await fixture({border:255});await assert.rejects(()=>verifyPitNativeV61(clipped.event,clipped.receipt,clipped.publicRoot),/cell edge/);
  await assert.rejects(()=>verifyPitNativeV61(clipped.event,{...clipped.receipt,edgeHaloReview:{accepted:true,notes:'Cannot override solid clipping'}},clipped.publicRoot),/cell edge/);
  const halo=await fixture({border:8});await assert.rejects(()=>verifyPitNativeV61(halo.event,halo.receipt,halo.publicRoot),/cell edge/);
  const result=await verifyPitNativeV61(halo.event,{...halo.receipt,edgeHaloReview:{accepted:true,notes:'Measured isolated alpha8 halo; no silhouette pixel above32 at borders.'}},halo.publicRoot);
  assert(result.cells.every(c=>c.borderMaxAlpha===8&&c.borderSolidPixels===0));
});
