import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const source='C:/Users/chuck/.codex/generated_images/01a056ec-9dd5-7433-8bd5-5ace123409c6/exec-3e8a014d-3dcd-4748-b762-a0277df60a58.png';
const bytes=await fs.readFile(source),meta=await sharp(bytes).metadata();
const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let x0=info.width,y0=info.height,x1=0,y1=0,transparent=0;
for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
  if(data[(y*info.width+x)*4+3]>8) {x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  else transparent++;
}
const alphaBounds={x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};
if(!meta.hasAlpha || transparent<info.width*info.height*.15) throw Error('Native transparency is required');
const destination='public/game/homeworld/v69/clan-brazier.png';
await fs.mkdir('public/game/homeworld/v69',{recursive:true});await fs.writeFile(destination,bytes);
const entry={src:'/game/homeworld/v69/clan-brazier.png',sourceWidth:info.width,sourceHeight:info.height,
  sourceRect:{x:0,y:0,width:info.width,height:info.height},alphaBounds,pivot:{x:info.width/2,y:y1},heightWorld:85,
  footprintWorld:{width:96,depth:50},scaleWorldPerPixel:85/alphaBounds.height,
  sha256:crypto.createHash('sha256').update(bytes).digest('hex'),measurementStatus:'native-alpha-measured-front-basalt-support-visual-review'};
await fs.writeFile('app/game/data/homeworldBrazierV69.json',JSON.stringify(entry,null,2)+'\n');
await fs.mkdir('docs/v69-generation',{recursive:true});
await fs.writeFile('docs/v69-generation/clan-brazier.json',JSON.stringify({tool:'built-in image_gen',source,destination,entry,nativeBytesPreserved:true,visualReview:'PASS: single complete brazier, centered supported hexagonal pedestal, coherent orthographic oblique perspective, no anatomy, no human monument; original clan adaptation, not certified film prop'},null,2)+'\n');
console.log(JSON.stringify(entry));
