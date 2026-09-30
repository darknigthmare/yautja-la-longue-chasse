import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const pitNativeShaV61 = value => createHash('sha256').update(value).digest('hex');
/** Reads the untouched source PNG. Nothing is cropped, repacked or written by this audit. */
export async function verifyPitNativeV61(event, receipt, publicRoot = 'public') {
  assert(receipt && ['visually-accepted','accepted'].includes(receipt.status),`${event.id}: missing accepted generation receipt`);
  assert.equal(receipt.mode,'built-in-imagegen',`${event.id}: native OpenAI provenance required`);
  assert(typeof receipt.visualNotes === 'string' && receipt.visualNotes.trim(),`${event.id}: actual visual review notes required`);
  assert.equal(receipt.sha256,event.sha256);assert(receipt.copyByteIdentical,`${event.id}: exact-copy provenance missing`);
  const file=publicRoot+event.src,bytes=await fs.readFile(file),meta=await sharp(bytes).metadata();
  assert.equal(pitNativeShaV61(bytes),event.sha256,`${event.id}: runtime bytes differ from native generation`);
  assert.equal(meta.format,'png');assert(meta.hasAlpha,`${event.id}: native alpha channel missing`);
  assert.equal(meta.width,event.width);assert.equal(meta.height,event.height);assert.equal(event.frames.length,6);
  const original=await fs.readFile(receipt.workspacePath);assert.equal(pitNativeShaV61(original),event.sha256,`${event.id}: producer copy is not identical`);
  const declared=receipt.frames??receipt.cells;assert.equal(declared?.length,event.frames.length);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const rectangles=[],drawings=new Set(),cells=[];let visibleTotal=0;
  for(const [index,frame] of event.frames.entries()) {
    assert.deepEqual(frame.rect,declared[index].rect,`${event.id}/${index}: source rect changed`);
    assert.deepEqual(frame.alphaBounds,declared[index].alphaBounds,`${event.id}/${index}: alpha bounds changed`);
    const [sx,sy,w,h]=frame.rect;
    assert(rectangles.every(([x,y,width,height])=>sx>=x+width||sx+w<=x||sy>=y+height||sy+h<=y),`${event.id}/${index}: native cells overlap`);
    rectangles.push(frame.rect);
    const cell=Buffer.alloc(w*h*4);let minX=w,minY=h,maxX=-1,maxY=-1,visible=0,border=0,borderMaxAlpha=0,borderSolid=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const offset=((sy+y)*info.width+sx+x)*4,alpha=data[offset+3];data.copy(cell,(y*w+x)*4,offset,offset+4);
      if(alpha>2){visible++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
      if(x===0||y===0||x===w-1||y===h-1){if(alpha>2)border++;if(alpha>32)borderSolid++;borderMaxAlpha=Math.max(borderMaxAlpha,alpha);}
    }
    assert(visible>20&&visible<w*h*.95,`${event.id}/${index}: requires an isolated drawing with native transparency`);
    assert.deepEqual(frame.alphaBounds,[minX,minY,maxX-minX+1,maxY-minY+1],`${event.id}/${index}: actual alpha>2 mismatch`);
    if(border)assert(receipt.edgeHaloReview?.accepted===true&&typeof receipt.edgeHaloReview.notes==='string'&&receipt.edgeHaloReview.notes.trim()
      &&borderMaxAlpha<=16&&borderSolid===0,`${event.id}/${index}: visible pixels touch a native cell edge; revise source rect or regenerate, never erase pixels`);
    const digest=pitNativeShaV61(cell);assert(!drawings.has(digest),`${event.id}: repeated drawing masquerades as animation`);drawings.add(digest);
    visibleTotal+=visible;cells.push({index,rect:frame.rect,alphaBounds:frame.alphaBounds,contentSha256:digest,borderPixels: border,borderMaxAlpha,borderSolidPixels:borderSolid});
  }
  return {src:event.src,sha256:event.sha256,bytes:bytes.length,width:meta.width,height:meta.height,alphaThreshold:2,
    transparentFraction:1-visibleTotal/(meta.width*meta.height),nativeDrawings:drawings.size,cells};
}
