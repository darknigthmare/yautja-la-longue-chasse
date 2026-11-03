import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';

export const HOMEWORLD_OPAQUE_ALPHA_THRESHOLD_V76=24;

/** Native alpha only: no resize, repaint, crop output or PNG write. Rows are
 * local to sourceRect when present; each pair is [startInclusive,endExclusive].
 * Empty transparent rows and holes between separate painted runs are retained. */
export async function measureHomeworldOpaqueRowsV76(file,art,{alphaThreshold=HOMEWORLD_OPAQUE_ALPHA_THRESHOLD_V76}={}){
 assert(Number.isInteger(alphaThreshold)&&alphaThreshold>=1&&alphaThreshold<=255,'Invalid opaque alpha threshold');
 const bytes=await fs.readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha256,art.sha256,'Native PNG changed: '+file);
 const metadata=await sharp(bytes).metadata();
 assert.equal(metadata.format,'png');assert(metadata.hasAlpha,'Native source must retain alpha');
 assert.equal(metadata.width,art.sourceWidth);assert.equal(metadata.height,art.sourceHeight);
 const rect=art.sourceRect??{x:0,y:0,width:art.sourceWidth,height:art.sourceHeight};
 for(const field of ['x','y','width','height'])assert(Number.isInteger(rect[field]),'sourceRect must use integer native pixels');
 assert(rect.x>=0&&rect.y>=0&&rect.width>0&&rect.height>0&&rect.x+rect.width<=metadata.width&&rect.y+rect.height<=metadata.height,'sourceRect outside native source');
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.channels,4);
 let opaquePixels=0,runCount=0;
 const opaqueRowsV76=Array.from({length:rect.height},(_,y)=>{
  const row=[];let start=-1;
  for(let x=0;x<rect.width;x++){
   const painted=data[((rect.y+y)*info.width+rect.x+x)*4+3]>=alphaThreshold;
   if(painted){opaquePixels++;if(start<0)start=x;}
   else if(start>=0){row.push(start,x);runCount++;start=-1;}
  }
  if(start>=0){row.push(start,rect.width);runCount++;}
  return row;
 });
 return {opaqueRowsV76,alphaThreshold,sha256,sourceRect:rect,opaquePixels,runCount};
}

/** Only two metadata fields may change. SHA, original alpha200 measurements,
 * supports, doorway, source paths, and every PNG remain untouched. */
export async function measureHomeworldOpacityManifestV76({root=process.cwd(),write=false}={}){
 const manifestFile=path.resolve(root,'app/game/data/homeworldArchitectureArtV76.json');
 const records=JSON.parse(await fs.readFile(manifestFile,'utf8')),results=[];
 const publicRoot=path.resolve(root,'public');
 for(const [id,record]of Object.entries(records)){
  const file=path.resolve(publicRoot,'.'+record.art.src);
  assert(file.startsWith(publicRoot+path.sep),'Native PNG must remain inside public');
  const result=await measureHomeworldOpaqueRowsV76(file,record.art);
  if(write){record.art.opaqueRowsV76=result.opaqueRowsV76;record.measurement.opaqueAlphaThresholdV76=result.alphaThreshold;}
  else{assert.deepEqual(record.art.opaqueRowsV76,result.opaqueRowsV76,id+' opaque runs differ from native alpha');assert.equal(record.measurement.opaqueAlphaThresholdV76,result.alphaThreshold);}
  results.push({id,src:record.art.src,sha256:result.sha256,alphaThreshold:result.alphaThreshold,rows:result.opaqueRowsV76.length,runCount:result.runCount,opaquePixels:result.opaquePixels});
 }
 if(write)await fs.writeFile(manifestFile,JSON.stringify(records,null,2)+'\n');
 return results;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);assert(args.every(arg=>arg==='--write'||arg==='--check'),'Usage: node scripts/measure-homeworld-opacity-v76.mjs [--write|--check]');
 console.log(JSON.stringify({mode:args.includes('--write')?'metadata-write':'read-only-check',assets:await measureHomeworldOpacityManifestV76({write:args.includes('--write')})}));
}
