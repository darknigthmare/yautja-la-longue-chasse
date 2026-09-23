import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const batch=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const root=await fs.realpath('public/game/sprites/v43');
for(const item of batch){
 assert(/^arena-\d{3}-[a-z0-9-]+$/.test(item.arenaId));assert(/^p[1-5]-[a-z0-9-]+$/.test(item.id));
 assert(item.source&&item.prompt&&item.review);
 const bytes=await fs.readFile(item.source),sha256=createHash('sha256').update(bytes).digest('hex'),meta=await sharp(bytes).metadata();
 assert.equal(meta.hasAlpha,true);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1,transparentPixels=0,strongPixels=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*info.channels+3];if(alpha===0)transparentPixels++;if(alpha>=240)strongPixels++;if(alpha>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
 assert(transparentPixels>info.width*info.height*.1&&strongPixels>100,'A real transparent silhouette is required');
 const contentBounds={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
 const publicPath='/game/sprites/v43/pit-arenas/'+item.arenaId+'/'+item.id+'.png';
 const destination=path.resolve(root,'pit-arenas',item.arenaId,item.id+'.png');assert(destination.startsWith(root+path.sep));
 await fs.mkdir(path.dirname(destination),{recursive:true});
 try{const old=await fs.readFile(destination);assert.equal(createHash('sha256').update(old).digest('hex'),sha256,'Refusing to replace imported module');}catch(error){if(error.code!=='ENOENT')throw error;await fs.copyFile(item.source,destination);}
 const archive='art-source/v43/pit-arenas/'+item.arenaId;await fs.mkdir(archive,{recursive:true});
 const reviewEvidence=archive+'/review-'+item.id+'.md';
 await fs.writeFile(reviewEvidence,'# Revue visuelle du module '+item.id+'\n\n'+item.review+'\n\nModule original OpenAI indépendant ; il ne reproduit pas un accessoire identifié du film à l’identique. Alpha natif conservé, pixels non retouchés.\n');
 const receipt={schemaVersion:1,accepted:true,generator:'openai-imagegen',mode:'built-in',arenaId:item.arenaId,assetId:item.id,publicPath,archivedSource:'public'+publicPath,originalSource:item.source,prompt:item.prompt,sha256,width:meta.width,height:meta.height,hasAlpha:true,contentBounds,transparentPixels,strongPixels,reviewEvidence};
 await fs.writeFile(archive+'/receipt-'+item.id+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({id:item.id,publicPath,contentBounds,transparentPixels}));
}
