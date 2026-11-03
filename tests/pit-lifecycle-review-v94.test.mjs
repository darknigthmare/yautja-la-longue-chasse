import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {build} from 'esbuild';
import sharp from 'sharp';
import crypto from 'node:crypto';
const proof=JSON.parse(fs.readFileSync('app/game/data/pitLifecycleReviewV94.json'));
const built=await build({stdin:{contents:"export * from './app/game/systems/pitLifecycleReviewV94';export {PIT_SPRITE_SHEET_REGISTRY} from './app/game/pitSpriteSheetRegistry';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('every V94 measured clip belongs to an actual exact costume and native facing in the production registry',()=>{
 assert.equal(proof.completeRosterAnimations,false);assert.equal(proof.oneToOneCertified,false);assert(proof.entries.length>=17);
 for(const entry of proof.entries){const result=p.getPitLifecycleReviewV94(entry.fighterId,entry.variantId,entry.clipId,entry.facing);
  assert(result);assert.equal(result.atlasId,entry.atlasId);assert.equal(result.distinctDrawings,entry.distinctDrawings);
  assert.equal(result.nativeCountTargetReached,entry.distinctDrawings>=entry.minimumDistinctDrawings);assert.equal(result.oneToOneCertified,false);
  assert.equal(result.fluidityCertified,false);
 }
 assert.equal(p.getPitLifecycleReviewV94('greyback','elder-greyback-avec-casque-eda4af4a7d','pit.presentation.victory','left'),null);
 assert.equal(p.getPitLifecycleReviewV94('wolf',null,'pit.presentation.intro','right'),null);
});
test('changed page, source rectangle, duration, pivot or body scale invalidates its reviewed proof',()=>{
 const original=p.PIT_SPRITE_SHEET_REGISTRY.find(e=>e.fighterId==='wolf'&&e.atlas.id.includes('intro-partial-v94'));
 for(const mutate of [d=>d.atlas.pages[0].src='/other.png',d=>d.atlas.clips[0].frames[0].rect[0]++,d=>d.atlas.clips[0].frames[0].pivot[1]++,d=>d.atlas.clips[0].frames[0].durationTicks++,d=>d.bodyHeightPx++]){
  const changed=structuredClone(original);mutate(changed);
  assert.equal(p.getPitLifecycleReviewV94('wolf',original.variantId,'pit.presentation.intro','right',[changed]),null);
 }
});
test('V94 proof hashes actual RGBA pages and validates original transparent windows without changing images',async()=>{
 const decoded=new Map(),allDrawings=new Set();
 for(const clip of proof.entries)for(const page of clip.sourcePages)if(!decoded.has(page.src)){
  const bytes=fs.readFileSync('public'+page.src);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),page.sourceSha256);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual([info.width,info.height],[page.width,page.height]);decoded.set(page.src,{data,info});
 }
 for(const clip of proof.entries){const hashes=new Set();
  for(const frame of clip.frames){const {data,info}=decoded.get(frame.src),[x,y,w,h]=frame.rect,[vx,vy,vw,vh]=frame.visibleRect;
   assert(x>=0&&y>=0&&x+w<=info.width&&y+h<=info.height);let edge=0;
   for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(xx===x||xx===x+w-1||yy===y||yy===y+h-1)edge=Math.max(edge,data[(yy*info.width+xx)*4+3]);assert(edge<=2);
   const canonical=Buffer.alloc(vw*vh*4);for(let yy=vy;yy<vy+vh;yy++)for(let xx=vx;xx<vx+vw;xx++){const a=(yy*info.width+xx)*4,b=((yy-vy)*vw+xx-vx)*4;if(data[a+3]>2)canonical.set(data.subarray(a,a+4),b);}
   const hash=crypto.createHash('sha256').update(canonical).digest('hex');assert.equal(hash,frame.drawingSha256);hashes.add(hash);allDrawings.add(hash);
  }
  assert.equal(hashes.size,clip.distinctDrawings);assert.equal(clip.totalTicks,clip.frames.reduce((n,f)=>n+f.durationTicks,0));
 }
 assert.equal(allDrawings.size,proof.counts.drawings);assert.equal(decoded.size,proof.counts.pages);
});
