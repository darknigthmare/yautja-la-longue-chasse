import fs from 'node:fs';
import sharp from 'sharp';
import {createHash} from 'node:crypto';

// Read pixels only: original OpenAI alpha and pixels remain untouched.
const rows=[];
for(const id of ['classic','elder','super','feral']) {
  const file=`public/game/sprites/v62/heads/${id}-head.png`;
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1,clear=0,border=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++) {
    const alpha=data[(y*info.width+x)*info.channels+info.channels-1];
    if(!alpha)clear++;
    if(x===0||y===0||x===info.width-1||y===info.height-1)border=Math.max(border,alpha);
    if(alpha>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  }
  const height=85,scale=height/(bottom-top+1),centerX=140,bottomY=103;
  rows.push({id,path:file.slice(6),width:info.width,height:info.height,bounds:{left,top,right,bottom},transparentFraction:clear/(info.width*info.height),borderAlphaMax:border,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),placement:{x:centerX-(left+right+1)*scale/2,y:bottomY-(bottom+1)*scale,width:info.width*scale,height:info.height*scale}});
}
fs.writeFileSync('docs/v62-head-native-measurements.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
