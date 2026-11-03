import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Read-only alpha measurement. A missing cut rejects its two neighbours;
// it never edits, mirrors, pads, recolours or synthesises a source PNG.
const folder = 'art-source/v94/pit/berserker';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = { method: 'native-alpha>2, genuinely blank seams, independent partial cells', noiseFloor: 2, pixelTransformation: 'none', pages: [] };
for (const file of fs.readdirSync(folder).filter(file=>file.endsWith('.png')).sort()) {
 const bytes=fs.readFileSync(folder+'/'+file), {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rows=file.startsWith('001-')?4:3, cols=4, alpha=(x,y)=>data[(y*info.width+x)*4+3];
 const density=(axis,lo,hi)=>{
  const out=new Uint32Array(axis==='x'?info.width:info.height);
  if(axis==='x') { for(let x=0;x<info.width;x++)for(let y=lo;y<hi;y++)if(alpha(x,y)>2)out[x]++; }
  else { for(let y=0;y<info.height;y++)for(let x=lo;x<hi;x++)if(alpha(x,y)>2)out[y]++; }
  return out;
 };
 const cuts=(length,count,d)=>Array.from({length:count+1},(_,i)=>{
  if(!i)return 0; if(i===count)return length;
  const ideal=i*length/count,lo=Math.max(1,Math.ceil(ideal-length/count*.32)),hi=Math.min(length-2,Math.floor(ideal+length/count*.32));
  let best=null;for(let k=lo;k<=hi;k++)if(d[k]===0&&d[k-1]===0&&d[k+1]===0&&(best===null||Math.abs(k-ideal)<Math.abs(best-ideal)))best=k;
  return best;
 });
 const measured=new Map(), attempts=[];
 function cell(row,col,x0,x1,y0,y1,order){
  if([x0,x1,y0,y1].some(v=>v===null))return;
  let minX=x1,minY=y1,maxX=-1,maxY=-1,count=0,border=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const a=alpha(x,y);if(x===x0||x===x1-1||y===y0||y===y1-1)border=Math.max(border,a);
   if(a>2){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  }
  if(!count||border>2)return;
  let soleMin=x1,soleMax=-1;
  // A 60px bottom band covers both soles in the fixed three-quarter view.
  // It is a contact/pivot measurement, not a pose-height fit or new pixel.
  for(let y=Math.max(minY,maxY-60);y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(alpha(x,y)>=64){soleMin=Math.min(soleMin,x);soleMax=Math.max(soleMax,x);}
  if(soleMax<soleMin)return;
  const visibleRect=[minX,minY,maxX-minX+1,maxY-minY+1], pixels=Buffer.alloc(visibleRect[2]*visibleRect[3]*4);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const at=(y*info.width+x)*4,to=((y-minY)*visibleRect[2]+x-minX)*4;if(data[at+3]>2)pixels.set(data.subarray(at,at+4),to);}
  const value={row,col,facing:col<2?'right':'left',order,rect:[x0,y0,x1-x0,y1-y0],visibleRect,pivot:[(soleMin+soleMax)/2-x0,maxY-y0],foregroundPixels:count,borderAlpha:border,drawingSha256:sha(pixels)};
  const key=row+':'+col;if(!measured.has(key))measured.set(key,value);
 }
 const yc=cuts(info.height,rows,density('y',0,info.width));attempts.push({order:'rows-first',primaryCuts:yc});
 for(let row=0;row<rows;row++)if(yc[row]!==null&&yc[row+1]!==null){const xc=cuts(info.width,cols,density('x',yc[row],yc[row+1]));for(let col=0;col<cols;col++)cell(row,col,xc[col],xc[col+1],yc[row],yc[row+1],'rows-first');}
 const xc=cuts(info.width,cols,density('x',0,info.height));attempts.push({order:'columns-first',primaryCuts:xc});
 for(let col=0;col<cols;col++)if(xc[col]!==null&&xc[col+1]!==null){const ys=cuts(info.height,rows,density('y',xc[col],xc[col+1]));for(let row=0;row<rows;row++)cell(row,col,xc[col],xc[col+1],ys[row],ys[row+1],'columns-first');}
 const cells=[...measured.values()].sort((a,b)=>a.row-b.row||a.col-b.col);
 report.pages.push({file,sourceSha256:sha(bytes),width:info.width,height:info.height,rows,cols,cells,attempts,expectedCells:rows*cols,isolatedCells:cells.length,rejectedGeometryCells:Array.from({length:rows},(_,row)=>Array.from({length:cols},(_,col)=>({row,col}))).flat().filter(c=>!measured.has(c.row+':'+c.col))});
}
fs.writeFileSync(folder+'/partial-native-geometry.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.pages.map(p=>({file:p.file,isolated:p.isolatedCells,right:p.cells.filter(c=>c.facing==='right').map(c=>[c.row,c.col]),left:p.cells.filter(c=>c.facing==='left').length})),null,2));
