import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

/** Read-only inspection. Source PNGs are copied byte-for-byte, never cropped,
 * recoloured or background-removed. Ground sockets are authored after seeing
 * the original; alpha runs document opacity, not fictional physical walls. */
export async function measureNativeV81(file, opaque = false) {
  const bytes = await fs.readFile(file);
  const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width, top=info.height, right=-1, bottom=-1, transparent=0;
  const rows=[];
  for(let y=0;y<info.height;y++) {
    const runs=[]; let start=-1;
    for(let x=0;x<info.width;x++) {
      const a=data[(y*info.width+x)*4+3];
      if(!a) transparent++;
      if(a>=128) {left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      if(a>=24&&start<0) start=x;
      if(a<24&&start>=0) {runs.push(start,x);start=-1;}
    }
    if(start>=0) runs.push(start,info.width);
    rows.push(runs);
  }
  if(right<0) throw Error('Empty native asset: '+file);
  const corners=[0,info.width-1,(info.height-1)*info.width,info.width*info.height-1].map(i=>data[i*4+3]);
  // A1/255 edge dust is reported, not silently erased. Visible corner coverage
  // still rejects the cutout. Native bytes and their actual alphas stay intact.
  if(!opaque&&corners.some(a=>a>3)) throw Error('Native cutout has visible nontransparent corners: '+file);
  return {sourceWidth:info.width,sourceHeight:info.height,
    sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
    alphaBounds:{x:left,y:top,width:right-left+1,height:bottom-top+1},
    transparentPixelRatio:transparent/(info.width*info.height),cornerAlphas:corners,opaqueRowsV76:rows};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  for(const file of process.argv.slice(2)) {
    const value=await measureNativeV81(file,file.includes('prime-sky'));
    delete value.opaqueRowsV76;
    console.log(JSON.stringify({file,...value}));
  }
}
