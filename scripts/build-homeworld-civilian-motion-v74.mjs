/** Metadata only: never resize, crop, paint or rewrite the native OpenAI PNGs. */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const definitions = [
  ['chief-base','01-chief-artisan-walk-corrected.png'],['chief-opposite-artisan','01-chief-artisan-walk-final.png'],
  ['healer-archivist','02-healer-archivist-walk-spaced.png'],['guard-courier','03-guard-courier-walk-spaced-left-fixed.png'],
  ['instructor-apprentice','04-instructor-apprentice-walk.png'],['dock-forge','05-dock-forge-walk-spaced.png'],
  ['witness-herald','06-witness-herald-walk.png'],['arena-rite','07-arena-rite-walk.png'],
];
const roleSources = [
  ['chief','chief-base',0],['artisan','chief-opposite-artisan',2],['healer','healer-archivist',0],['archivist','healer-archivist',2],
  ['guard','guard-courier',0],['courier','guard-courier',2],['instructor','instructor-apprentice',0],['apprentice','instructor-apprentice',2],
  ['dock-officer','dock-forge',0],['forge-master','dock-forge',2],['witness','witness-herald',0],['herald','witness-herald',2],
  ['arena-steward','arena-rite',0],['rite-keeper','arena-rite',2],
];
function bands(count, occupied) {
  const out=[];let start=null;
  for(let n=0;n<=count;n++){const active=n<count&&occupied(n);if(active&&start===null)start=n;if(!active&&start!==null){out.push([start,n-1]);start=null;}}
  return out;
}
function fourBands(list){
  // Isolated 1px alpha flecks belong to the nearest figure, not an extra row.
  while(list.length>4){let index=0,min=Infinity;for(let i=0;i<list.length-1;i++){const gap=list[i+1][0]-list[i][1]-1;if(gap<min){min=gap;index=i;}}list.splice(index,2,[list[index][0],list[index+1][1]]);}
  if(list.length!==4)throw Error('Expected four independent transparent bands: '+JSON.stringify(list));return list;
}
const manifest={version:74,generator:'OpenAI builtin image_gen',alphaThreshold:12,sources:{},roles:{}};
for(const [id,file]of definitions){
  const src='/game/homeworld/v74/'+file,bytes=await fs.readFile('public'+src),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=(x,y)=>data[(y*info.width+x)*4+3];
  const xb=fourBands(bands(info.width,x=>{for(let y=0;y<info.height;y++)if(alpha(x,y)>12)return true;return false;}));
  const xcuts=[0,...xb.slice(0,3).map((b,i)=>Math.floor((b[1]+xb[i+1][0])/2)),info.width];
  const cells=[];
  for(let col=0;col<4;col++){
    const left=xcuts[col],right=xcuts[col+1];
    const yb=fourBands(bands(info.height,y=>{for(let x=left;x<right;x++)if(alpha(x,y)>12)return true;return false;}));
    const ycuts=[0,...yb.slice(0,3).map((b,i)=>Math.floor((b[1]+yb[i+1][0])/2)),info.height];
    for(let row=0;row<4;row++){
      // Adjacent windows may share the same empty gutter pixel; native bytes stay unchanged.
      const sourceRect={x:left,y:ycuts[row],width:right-left,height:Math.min(info.height,ycuts[row+1]+1)-ycuts[row]};
      let minX=sourceRect.width,minY=sourceRect.height,maxX=-1,maxY=-1,solidPixels=0,edgePixels=0;
      const hash=crypto.createHash('sha256');
      for(let y=0;y<sourceRect.height;y++){
        const offset=((sourceRect.y+y)*info.width+sourceRect.x)*4;hash.update(data.subarray(offset,offset+sourceRect.width*4));
        for(let x=0;x<sourceRect.width;x++)if(alpha(sourceRect.x+x,sourceRect.y+y)>12){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);solidPixels++;if(!x||!y||x===sourceRect.width-1||y===sourceRect.height-1)edgePixels++;}
      }
      if(edgePixels)throw Error(`${id} row${row} col${col}: opaque pixels at extraction edge ${edgePixels}`);
      cells.push({row,col,sourceRect,alphaBounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},
        pivot:{x:(col+.5)*info.width/4-sourceRect.x,y:maxY},solidPixels,edgePixels,rgbaWindowSha256:hash.digest('hex')});
    }
  }
  let transparentPixels=0;for(let a=3;a<data.length;a+=4)if(data[a]===0)transparentPixels++;
  manifest.sources[id]={src,sourceWidth:info.width,sourceHeight:info.height,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),transparentPixels,cells};
}
for(const [role,sourceId,row]of roleSources){
  const frames=(r)=>Array.from({length:4},(_,col)=>{
    const useSource=role==='chief'&&col===2?'chief-opposite-artisan':sourceId,source=manifest.sources[useSource],cell=source.cells.find(c=>c.row===r&&c.col===col);
    return {sourceId:useSource,...cell};
  });
  const right=frames(row),left=frames(row+1),nativeHeight=Math.max(...right.concat(left).map(f=>f.alphaBounds.height));
  manifest.roles[role]={role,heightWorld:role==='chief'?112:role==='apprentice'?82:100,nativeHeight,fps:6,clips:{right,left}};
}
const output='app/game/data/homeworldCivilianMotionV74.json';
await fs.writeFile(output,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({sources:Object.keys(manifest.sources).length,roles:Object.keys(manifest.roles).length,frames:Object.values(manifest.roles).reduce((n,r)=>n+r.clips.right.length+r.clips.left.length,0),output}));
