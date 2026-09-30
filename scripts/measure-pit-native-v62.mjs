import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Measurement only: copied PNG bytes are never resized, composited or repainted.
const hash = value => createHash('sha256').update(value).digest('hex');
const seeds = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
for (const seed of seeds) {
  const [stageId, id] = seed.key.split('/');
  if (!/^arena-\d{3}-[a-z0-9-]+$/.test(stageId) || !/^[a-z0-9-]+$/.test(id)) throw Error('Unsafe identity');
  const bytes = await fs.readFile(seed.nativePath), meta = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cw = info.width / 3, split = seed.rowSplit ?? info.height / 2;
  if (!Number.isInteger(cw) || !Number.isInteger(split) || !meta.hasAlpha) throw Error('Invalid atlas');
  const rectangles = Array.from({ length: 6 }, (_, i) => [(i % 3) * cw, i < 3 ? 0 : split, cw, i < 3 ? split : info.height - split]);
  const frames = rectangles.map(([sx, sy, w, h], index) => {
    let minX=w,minY=h,maxX=-1,maxY=-1,count=0,border=0,borderSolid=0;
    const pixels = Buffer.alloc(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const offset=((sy+y)*info.width+sx+x)*4, alpha=data[offset+3];
      data.copy(pixels,(y*w+x)*4,offset,offset+4);
      if(alpha>2){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
      if(x===0||y===0||x===w-1||y===h-1){if(alpha>2)border++;if(alpha>32)borderSolid++;}
    }
    if(count<20)throw Error('Empty frame');
    let footMin=w,footMax=-1;
    for(let y=Math.max(minY,maxY-15);y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(pixels[(y*w+x)*4+3]>2){footMin=Math.min(footMin,x);footMax=Math.max(footMax,x);}
    return {rect:[sx,sy,w,h],alphaBounds:[minX,minY,maxX-minX+1,maxY-minY+1],pivot:seed.pivots?.[index]??(seed.pivotMode==='top'?[(minX+maxX+1)/2,minY]:seed.pivotMode==='center'?[(minX+maxX+1)/2,(minY+maxY+1)/2]:[(footMin+footMax+1)/2,maxY+1]),margins:[minX,minY,w-maxX-1,h-maxY-1],opaquePixelCount:count,borderPixels:border,borderSolidPixels:borderSolid,contentSha256:hash(pixels)};
  });
  const clear = frames.reduce((n,f)=>n+f.rect[2]*f.rect[3]-f.opaquePixelCount,0)/(info.width*info.height);
  if(clear<.15||new Set(frames.map(f=>f.contentSha256)).size!==6)throw Error('Not six transparent native drawings');
  const dest=`work-local/v62/generated/${stageId}/${id}.png`;
  await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.copyFile(seed.nativePath,dest);
  const receipt={schemaVersion:1,stageId,id,mode:'built-in-imagegen',nativePath:seed.nativePath,workspacePath:dest,sha256:hash(bytes),bytes:bytes.length,width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha,transparentFraction:clear,copyByteIdentical:true,prompt:seed.prompt,referencedImagePaths:seed.referencedImagePaths??[],sourceCells:seed.sourceCells??[],loreLimits:seed.loreLimits??[],rejectedAttempts:seed.rejectedAttempts??[],visualNotes:seed.visualNotes??'',status:seed.visualAccepted?'visually-accepted':'awaiting-visual-review',frames};
  await fs.mkdir('docs/v62-generation',{recursive:true});
  await fs.writeFile(`docs/v62-generation/${stageId}-${id}.json`,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({key:seed.key,alpha:clear,frames:frames.map(f=>({bounds:f.alphaBounds,pivot:f.pivot,border:f.borderPixels,solid:f.borderSolidPixels}))}));
}
