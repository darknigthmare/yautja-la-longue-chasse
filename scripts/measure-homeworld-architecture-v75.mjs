import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';

/** Read-only bitmap inspection. It never modifies, crops, removes backgrounds,
 * stretches or replaces source pixels. Pivots must be measured on native art. */
export async function inspectHomeworldArchitecturePngV75(path){
  const bytes=await fs.readFile(path),{data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
  if(info.channels!==4)throw new Error('Architecture PNG must have a native RGBA alpha channel: '+path);
  let left=info.width,top=info.height,right=-1,bottom=-1,solid=0,transparent=0;
  const rows=Array.from({length:info.height},()=>({left:info.width,right:-1,count:0}));
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const alpha=data[(y*info.width+x)*4+3];if(alpha===0)transparent++;
    if(alpha>200){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);solid++;rows[y].left=Math.min(rows[y].left,x);rows[y].right=Math.max(rows[y].right,x);rows[y].count++;}
  }
  if(!solid)throw new Error('Empty architecture: '+path);
  return {sourceWidth:info.width,sourceHeight:info.height,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
    alphaBounds:{x:left,y:top,width:right-left+1,height:bottom-top+1},solidPixels:solid,transparentPixelRatio:transparent/(info.width*info.height),
    bottomRows:rows.map((row,y)=>({...row,y})).filter(row=>row.count>0&&row.y>bottom-45),
    corners:[0,info.width-1,(info.height-1)*info.width,info.height*info.width-1].map(pixel=>data[pixel*4+3])};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/measure-homeworld-architecture-v75.mjs')){
  for(const path of process.argv.slice(2))console.log(JSON.stringify({path,...await inspectHomeworldArchitecturePngV75(path)},null,2));
}
