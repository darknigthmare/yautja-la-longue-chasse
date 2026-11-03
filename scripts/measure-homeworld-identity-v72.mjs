import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const root = 'public/game/homeworld/v72/';
const assets = {};
for (const [name,columns,rows] of [['civic-identity-atlas',3,2],['civilian-roles-atlas',4,2],['civic-specialists-atlas',3,2]]) {
  const filename=name==='civic-specialists-atlas'?'civic-specialists-spaced-atlas':name;
  const file = await fs.readFile(root+filename+'.png');
  const {data,info}=await sharp(file).raw().toBuffer({resolveWithObject:true});
  if(info.channels!==4)throw new Error('Transparent native PNG required');
  const cw=info.width/columns,ch=info.height/rows;
  const cells=[];
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    // The first foundation extends one pixel beyond a nominal 512px cell.
    // Cut at the measured transparent gutter; never delete native source pixels.
    const x0=name==='civic-identity-atlas'?[0,520,1024][col]:col*cw;
    const x1=name==='civic-identity-atlas'?[520,1024,1536][col]:(col+1)*cw;
    const w=x1-x0;
    let left=w,top=ch,right=0,bottom=0,count=0;
    for(let y=0;y<ch;y++)for(let x=0;x<w;x++)if(data[((row*ch+y)*info.width+x0+x)*4+3]>200){
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;
    }
    if(!count)throw new Error('Empty cell');
    cells.push({sourceRect:{x:x0,y:row*ch,width:w,height:ch},alphaBounds:{x:left,y:top,width:right-left+1,height:bottom-top+1},pivot:{x:(left+right)/2,y:bottom},solidPixels:count});
  }
  assets[name]={src:'/game/homeworld/v72/'+filename+'.png',sourceWidth:info.width,sourceHeight:info.height,sha256:crypto.createHash('sha256').update(file).digest('hex'),cells};
}
await fs.writeFile('app/game/data/homeworldIdentityArtV72.json',JSON.stringify(assets,null,2)+'\n');
console.log(JSON.stringify(assets,null,2));
