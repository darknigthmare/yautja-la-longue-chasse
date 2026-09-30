import sharp from 'sharp';
import fs from 'node:fs';
import crypto from 'node:crypto';
const out=[];
for(const name of fs.readdirSync('public/game/sprites/v62/masks').filter(n=>n.endsWith('.png'))){
 const id=name.slice(0,-4), path=`public/game/sprites/v62/masks/${name}`;
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=-1,y1=-1,clear=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*info.channels+info.channels-1];if(a===0)clear++;
  if(a>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 }
 const h=id==='feral'?58:id==='enforcer'?96:75,s=h/(y1-y0+1),cy=id==='feral'?48:id==='enforcer'?51:61;
 out.push({id,width:info.width,height:info.height,bounds:[x0,y0,x1,y1],transparentFraction:clear/(info.width*info.height),sha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),placement:{x:+(150-(x0+x1+1)*s/2).toFixed(5),y:+(cy-(y0+y1+1)*s/2).toFixed(5),width:+(info.width*s).toFixed(5),height:+(info.height*s).toFixed(5)}});
}
fs.mkdirSync('work-local/v62/qa/masks',{recursive:true});
fs.writeFileSync('work-local/v62/qa/masks/measurements.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
