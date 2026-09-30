// Copy native OpenAI PNGs verbatim and measure atlas metadata; no pixel edits.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const sourceRoot='C:/Users/chuck/.codex/generated_images/01a056ec-9dd5-7433-8bd5-5ace123409c6';
const destination='public/game/sprites/v56/pit/companions';
const specs=[
 {variantId:'tracker-hound',facing:1,file:'exec-5aa69ddd-92cc-449c-8bb7-c0e39a775b49.png',name:'tracker-hound-right.png',rects:[[0,0,591,450],[591,0,601,450],[1192,0,582,450],[0,450,580,437],[580,450,670,437],[1250,450,524,437]]},
 {variantId:'tracker-hound',facing:-1,file:'exec-1ee7a932-d22e-4c15-9e86-c579fa86ef47.png',name:'tracker-hound-left.png',rects:[[0,0,512,512],[512,0,512,512],[1024,0,512,512],[0,512,510,512],[510,512,535,512],[1045,512,491,512]]},
 {variantId:'hellhound-longhorn',facing:1,file:'exec-1c199a99-9a7a-4104-8026-b086858ce76d.png',name:'hellhound-longhorn-right.png'},
 {variantId:'hellhound-longhorn',facing:-1,file:'exec-70974c6e-e471-4fc7-aa8b-35b007e8c3cf.png',name:'hellhound-longhorn-left.png'},
];
const poses=['idle','telegraph','charge-a','charge-b','bite','recoil'];
await fs.mkdir(destination,{recursive:true});
const records=[];
for(const spec of specs){
 const bytes=await fs.readFile(path.join(sourceRoot,spec.file));
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rectangles=spec.rects??[[0,0,info.width,info.height]];
 const frames=rectangles.map(([sx,sy,width,height],index)=>{
  let minX=sx+width,minY=sy+height,maxX=-1,maxY=-1;
  for(let y=sy;y<sy+height;y++)for(let x=sx;x<sx+width;x++)if(data[(y*info.width+x)*4+3]>16){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  const margins=[minX-sx,minY-sy,sx+width-1-maxX,sy+height-1-maxY];
  if(margins.some(m=>m<3))throw Error(spec.name+' frame '+index+' clipped: '+margins);
  let contactY=maxY,footMin=sx+width,footMax=-1;
  for(;contactY>=minY;contactY--){let count=0;for(let x=minX;x<=maxX;x++)if(data[(contactY*info.width+x)*4+3]>=128)count++;if(count>=4)break;}
  for(let y=Math.max(minY,contactY-Math.ceil((maxY-minY)*.12));y<=contactY;y++)for(let x=minX;x<=maxX;x++)if(data[(y*info.width+x)*4+3]>=128){footMin=Math.min(footMin,x);footMax=Math.max(footMax,x);}
  return {pose:rectangles.length===1?'idle':poses[index],rect:[sx,sy,width,height],pivot:[Math.round((footMin+footMax)/2)-sx,contactY+1-sy],topY:minY-sy,alphaBounds:[minX-sx,minY-sy,maxX-minX+1,maxY-minY+1],margins};
 });
 await fs.writeFile(path.join(destination,spec.name),bytes);
 records.push({variantId:spec.variantId,facing:spec.facing,src:'/game/sprites/v56/pit/companions/'+spec.name,width:info.width,height:info.height,pivot:frames[0].pivot,topY:frames[0].topY,frames,sha256:createHash('sha256').update(bytes).digest('hex'),nativeFile:spec.file,bytes:bytes.length});
}
await fs.writeFile('app/game/data/pitCompanionArtV56.json',JSON.stringify({schemaVersion:1,records},null,2)+'\n');
await fs.mkdir('art-source/v56/hellhounds',{recursive:true});
await fs.writeFile('art-source/v56/hellhounds/source-records.json',JSON.stringify({schemaVersion:1,tool:'OpenAI built-in image_gen',copiedWithoutPixelEdits:true,review:'All four sources inspected on dark green and light sand backgrounds in Chrome. Complete silhouettes, no visible matte halo. Custom per-pose atlas rectangles preserve tongues and horn tips. Longhorn is two independent single poses, not a complete animation set. Native sides retain minor generated design variation; no pixel-exact identity claim.',records},null,2)+'\n');
console.log(JSON.stringify(records,null,2));
