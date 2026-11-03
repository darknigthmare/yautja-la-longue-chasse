import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Read-only pixel measurement: accepted native PNG bytes are never transformed.
const base = process.env.V65_STATIC_ART_ROOT ?? 'I:/CodexTemp/yautja-v65-20261001';
const index = JSON.parse(await fs.readFile(path.join(base, 'stages/native-sources.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const output = {schemaVersion: 1, release: 'V65', status: 'NATIVE_REVIEWED_INTEGRATION_PENDING', stages: [], nativeChecks: []};
const threshold = 8;
const bounds = (data, width, rect) => {
  let left = Infinity, top = Infinity, right = -1, bottom = -1, visiblePixels = 0;
  for (let y=rect.y;y<rect.y+rect.height;y++) for(let x=rect.x;x<rect.x+rect.width;x++) if(data[(y*width+x)*4+3]>threshold){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);visiblePixels++;
  }
  assert(visiblePixels, 'Empty native cell');
  return {x:left,y:top,width:right-left+1,height:bottom-top+1,visiblePixels};
};
function separator(length, occupied, label){
  let best=null, start=null;
  for(let n=Math.floor(length*.35);n<=Math.ceil(length*.68);n++){
    if(!occupied(n)){if(start===null)start=n;}else if(start!==null){if(!best||n-start>best.end-best.start)best={start,end:n};start=null;}
  }
  if(start!==null){const end=Math.ceil(length*.68)+1;if(!best||end-start>best.end-best.start)best={start,end};}
  assert(best&&best.end-best.start>=4, `${label}: no safe alpha gap, manual source rectangles required`);
  return Math.floor((best.start+best.end)/2);
}
await fs.mkdir('docs/v65-generation', {recursive:true});
for(const entry of index.stages){
  const assets={};
  let cells=[];
  for(const kind of ['backdrop','atlas']){
    const filename=kind==='backdrop'?'p0-depth.png':'static-modules.png';
    const disk=path.join(base,'public-sprites/pit-arenas',entry.stageId,filename);
    const [bytes,sourceBytes]=await Promise.all([fs.readFile(disk),fs.readFile(entry[kind].source)]);
    assert.equal(sha(bytes),sha(sourceBytes), `${entry.stageId}/${kind}: changed native bytes`);
    output.nativeChecks.push({stageId:entry.stageId,kind,check:'native-copy-sha256',passed:true});
    const meta=await sharp(bytes).metadata();
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const full={x:0,y:0,width:info.width,height:info.height};
    const content=bounds(data,info.width,full);
    const {visiblePixels,...contentBounds}=content;
    const receipt=`docs/v65-generation/${entry.stageId}-${kind}.json`;
    assets[kind]={src:`/game/sprites/v65/pit-arenas/${entry.stageId}/${filename}`,sha256:sha(bytes),width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha,contentBounds,receipt};
    if(kind==='atlas'){
      assert(meta.hasAlpha,'Atlas must retain native alpha');
      output.nativeChecks.push({stageId:entry.stageId,kind,check:'native-alpha',passed:true});
      const rowOccupied=y=>{for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>threshold)return true;return false;};
      const sy=separator(info.height,rowOccupied,'row');
      const columnOccupied=(x,y0,y1)=>{for(let y=y0;y<y1;y++)if(data[(y*info.width+x)*4+3]>threshold)return true;return false;};
      const sxTop=separator(info.width,x=>columnOccupied(x,0,sy),'top column');
      const sxBottom=separator(info.width,x=>columnOccupied(x,sy,info.height),'bottom column');
      const regions=[{x:0,y:0,width:sxTop,height:sy},{x:sxTop,y:0,width:info.width-sxTop,height:sy},{x:0,y:sy,width:sxBottom,height:info.height-sy},{x:sxBottom,y:sy,width:info.width-sxBottom,height:info.height-sy}];
      cells=regions.map((region,n)=>{
        const b=bounds(data,info.width,region);const x=Math.max(region.x,b.x-3),y=Math.max(region.y,b.y-3);
        const right=Math.min(region.x+region.width,b.x+b.width+3),bottom=Math.min(region.y+region.height,b.y+b.height+3);
        return {plane:['P1','P2','P3','P5'][n],sourceCrop:{x,y,width:right-x,height:bottom-y},alphaBounds:{x:b.x,y:b.y,width:b.width,height:b.height},alphaBoundsCoordinateSpace:'whole-source-pixels',visiblePixels:b.visiblePixels,role:entry.roles[n]};
      });
      assert.equal(cells.reduce((sum,cell)=>sum+cell.visiblePixels,0),visiblePixels,'All native drawings must be accounted for exactly once');
      output.nativeChecks.push({stageId:entry.stageId,kind,check:'all-visible-pixels-assigned-exactly-once',passed:true});
      assert(cells.every(c=>c.alphaBounds.x>0&&c.alphaBounds.y>0&&c.alphaBounds.x+c.alphaBounds.width<info.width&&c.alphaBounds.y+c.alphaBounds.height<info.height),'Native object touches canvas edge');
      output.nativeChecks.push({stageId:entry.stageId,kind,check:'all-four-objects-clear-of-canvas-edges',passed:true});
      assets[kind].coverage={threshold,visiblePixels,assignedPixels:cells.reduce((s,c)=>s+c.visiblePixels,0),nativeDrawings:4,animationFrames:0};
    }
    const prompts=await Promise.all((entry[kind].prompts??[entry[kind].prompt]).map(async file=>({file,prompt:await fs.readFile(path.join(base,'stages/prompts',file),'utf8')})));
    await fs.writeFile(receipt,JSON.stringify({schemaVersion:1,status:'visually-accepted',release:'V65',stageId:entry.stageId,kind,tool:'OpenAI builtin image_gen',...assets[kind],sourceNativePath:entry[kind].source,nativeBytesUnchanged:true,prompt:prompts.at(-1).prompt,prompts,preservedSupersededSources:entry[kind].preservedSupersededSources??[],drawings:kind==='atlas'?4:1,animationFrames:0,sourceUrls:index.sourceUrls,loreStatus:'original-project-adaptation-not-canonical-1-to-1',visualReview:entry.visualReview},null,2)+'\n');
  }
  output.stages.push({stageId:entry.stageId,workbook:entry.workbook,...assets,cells,sourceUrls:index.sourceUrls,loreStatus:'original-project-adaptation-not-canonical-1-to-1',visualReview:entry.visualReview});
}
output.counts={stages:output.stages.length,nativePngs:output.stages.length*2,staticDrawings:output.stages.length*5,newAnimationFrames:0,nativeChecks:output.nativeChecks.length};
await fs.writeFile(path.join(base,'stages/native-pairs.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({counts:output.counts,stages:output.stages.map(s=>({id:s.stageId,cells:s.cells.map(c=>({plane:c.plane,sourceCrop:c.sourceCrop}))}))}));
