import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const hash=b=>createHash('sha256').update(b).digest('hex');
const file=process.argv[2]||'work-local/v60/root-generation-seed.json';
const seeds=JSON.parse(await fs.readFile(file,'utf8'));
const plan=JSON.parse(await fs.readFile('docs/v60-stage-plan.json','utf8'));
for (const seed of seeds) {
 const [stageId,id]=seed.key.split('/');
 if(!/^arena-\d{3}-[a-z0-9-]+$/.test(stageId)||! /^(p0-depth|life-0[123])$/.test(id)) throw Error('Invalid identity');
 const spec=plan.stages.find(s=>s.id===stageId); if(!spec)throw Error('Missing plan');
 const buffer=await fs.readFile(seed.nativePath);
 const meta=await sharp(buffer).metadata();
 const workspacePath='work-local/v60/generated/'+stageId+'/'+id+'.png';
 await fs.mkdir(path.dirname(workspacePath),{recursive:true});
 try{const old=await fs.readFile(workspacePath); if(hash(old)!==hash(buffer)){if(seed.replacesSha256!==hash(old))throw Error('Refusing changed native output '+workspacePath);await fs.copyFile(seed.nativePath,workspacePath);}}
 catch(e){if(e.code!=='ENOENT')throw e;await fs.copyFile(seed.nativePath,workspacePath);}
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<=2)transparent++;
 const asset={id,prompt:seed.prompt,referencedImagePaths:seed.ref?[seed.ref]:[],transparentRequested:seed.transparentRequested,nativePath:seed.nativePath,workspacePath,mode:'built-in-imagegen',status:seed.visualAccepted?'visually-accepted':'awaiting-visual-review',visualNotes:seed.visualNotes||'',sha256:hash(buffer),bytes:buffer.length,width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha,transparentFraction:transparent/(info.width*info.height),copyByteIdentical:true};
 if(id.startsWith('life')) {
  if(!meta.hasAlpha||asset.transparentFraction<.15)throw Error('No usable alpha '+seed.key);
  const cw=info.width/3,ch=info.height/2;if(!Number.isInteger(cw)||!Number.isInteger(ch))throw Error('Not3x2grid');
  const rects=seed.rects||Array.from({length:6},(_,i)=>[(i%3)*cw,Math.floor(i/3)*ch,cw,ch]);
  asset.columns=3;asset.rows=2;asset.frames=[];
  for(const [sx,sy,w,h] of rects){
   let minX=w,minY=h,maxX=-1,maxY=-1,count=0;const cell=Buffer.alloc(w*h*4);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((sy+y)*info.width+sx+x)*4;data.copy(cell,(y*w+x)*4,i,i+4);if(data[i+3]>2){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}}
   if(count<20)throw Error('Empty frame');
   let footMin=w,footMax=-1;for(let y=Math.max(minY,maxY-15);y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(cell[(y*w+x)*4+3]>2){footMin=Math.min(footMin,x);footMax=Math.max(footMax,x);}
   asset.frames.push({rect:[sx,sy,w,h],alphaBounds:[minX,minY,maxX-minX+1,maxY-minY+1],pivot:seed.pivotMode==='center'?[(minX+maxX+1)/2,(minY+maxY+1)/2]:[(footMin+footMax+1)/2,maxY+1],margins:[minX,minY,w-maxX-1,h-maxY-1],opaquePixelCount:count,contentSha256:hash(cell)});
  }
  if(new Set(asset.frames.map(f=>f.contentSha256)).size!==6)throw Error('Duplicate drawings');
 }
 const dest='docs/v60-generation/'+stageId+'.json';await fs.mkdir(path.dirname(dest),{recursive:true});
 let receipt;try{receipt=JSON.parse(await fs.readFile(dest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;receipt={schemaVersion:1,stageId,proposalId:spec.proposalId,workbookStage:spec.sourceRange,sourceUrls:spec.sourceUrls,loreLimits:[spec.sourceLimits],assets:[]};}
 const before=receipt.assets.find(a=>a.id===id);if(before&&before.sha256!==asset.sha256){if(seed.replacesSha256!==before.sha256)throw Error('Receipt changed');receipt.rejectedAssets=[...(receipt.rejectedAssets||[]),{...before,status:'rejected',rejection:'Replaced by native OpenAI edit to prevent cell-boundary clipping.'}];}
 receipt.assets=receipt.assets.filter(a=>a.id!==id).concat(asset).sort((a,b)=>a.id.localeCompare(b.id));
 await fs.writeFile(dest,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({key:seed.key,width:asset.width,height:asset.height,alpha:asset.transparentFraction,frames:asset.frames?.map(f=>({bounds:f.alphaBounds,pivot:f.pivot,margins:f.margins}))}));
}
