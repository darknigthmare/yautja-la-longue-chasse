import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const styles=['classic','ringed','braided','veteran','elder','temple','feral','huntress'];
const profiles={};
for(const style of styles){
 const file=`public/game/assets/v3/actors/yautja/hunter/dreads/registered/${style}.webp`;
 const bytes=await fs.readFile(file), {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const samples=[];
 for(let y=32;y<info.height;y+=6){
  let left=info.width,right=-1;
  for(let row=y;row<Math.min(info.height,y+6);row++)for(let x=0;x<info.width;x++)if(data[(row*info.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);}
  if(right>=left)samples.push({x:(left+right)/2,y:y+2.5,radius:Math.hypot((right-left)/2,3)});
 }
 profiles[style]={width:info.width,height:info.height,sha256:createHash('sha256').update(bytes).digest('hex'),samples};
}
await fs.writeFile('app/game/data/hunterDreadProfilesV63.json',JSON.stringify(profiles,null,2)+'\n');
console.log(JSON.stringify({styles:styles.length,samples:Object.values(profiles).reduce((sum,p)=>sum+p.samples.length,0),pixelsModified:false}));
