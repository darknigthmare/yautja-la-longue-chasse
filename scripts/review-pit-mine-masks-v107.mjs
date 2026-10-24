/** Native-scale read-only verification of the actual production Canvas clip. No app server. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=process.cwd();
const output=process.env.YAUTJA_PIT_MINE_REVIEW_OUTPUT ?? '/tmp/v107-mine-canvas';
const masks=JSON.parse(await fs.readFile(root+'/app/game/data/pitWorkbookMineMasksV107.json','utf8'));
const bundle=await build({stdin:{contents:"export {clipPitWorkbookMineV107} from './app/game/pitWorkbookDeviceRenderingV107'",resolveDir:root},bundle:true,write:false,format:'iife',globalName:'sourceReview',platform:'browser'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage(); await page.setContent('<body></body>'); await page.addScriptTag({content:bundle.outputFiles[0].text});
const sources=Object.fromEntries(await Promise.all([...new Set(masks.masks.map(m=>m.path))].map(async p=>[p,'data:image/png;base64,'+(await fs.readFile(root+'/public'+p)).toString('base64')])));
const result=await page.evaluate(async ({masks,sources})=>{
 const images=Object.fromEntries(await Promise.all(Object.entries(sources).map(([p,url])=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve([p,im]);im.src=url;}))));
 const reports=[], sheets=[];
 for(let group=0;group<2;group++){
  const sheet=document.createElement('canvas');sheet.width=1100;sheet.height=4*220;const s=sheet.getContext('2d');s.fillStyle='#20313b';s.fillRect(0,0,sheet.width,sheet.height);
  for(let row=0;row<4;row++){
   const m=masks[group*4+row], im=images[m.path], body=document.createElement('canvas');body.width=im.width;body.height=im.height;const c=body.getContext('2d',{willReadFrequently:true}); c.drawImage(im,0,0);
   const before=c.getImageData(...m.frameRect).data; c.clearRect(0,0,body.width,body.height);c.save();window.sourceReview.clipPitWorkbookMineV107(c,m,true);c.drawImage(im,0,0);c.restore();const after=c.getImageData(...m.frameRect).data;
   let opaqueRemoved=0,opaqueAltered=0;for(let i=3;i<before.length;i+=4){if(before[i]>64){if(after[i]===0)opaqueRemoved++;else if(after[i]!==before[i])opaqueAltered++;}}
   reports.push({id:m.id,opaqueRemoved,opaqueAltered,expectedMineOpaque:m.mineOpaquePixels,bodyOpaquePixelsRemoved:opaqueRemoved+opaqueAltered-m.mineOpaquePixels});
   const object=document.createElement('canvas');object.width=im.width;object.height=im.height;const o=object.getContext('2d');window.sourceReview.clipPitWorkbookMineV107(o,m,false);o.drawImage(im,0,0);
   const crop=[m.cropRect[0]-35,m.cropRect[1]-55,140,110];s.imageSmoothingEnabled=false;s.fillStyle='#fff';s.font='16px sans-serif';s.fillText(m.id+' : source / BODY / device',10,row*220+20);
   [im,body,object].forEach((img,col)=>s.drawImage(img,...crop,col*360,row*220+35,280,176));
  }
  sheets.push(sheet.toDataURL('image/png').split(',')[1]);
 }
 return {reports,sheets};
},{masks:masks.masks,sources});
await fs.mkdir(output,{recursive:true});
for(let i=0;i<result.sheets.length;i++)await fs.writeFile(output+'/review-'+i+'.png',Buffer.from(result.sheets[i],'base64'));
await fs.writeFile(output+'/report.json',JSON.stringify({method:'Production Canvas evenodd/normal clip at native 1:1 scale. Original source alpha>64 measured; alpha2..64 fringe remains ambiguous.',reports:result.reports},null,2));
await browser.close();
for(const r of result.reports){assert.equal(r.opaqueAltered,0,r.id+' opaque antialias');assert.equal(r.opaqueRemoved,r.expectedMineOpaque,r.id+' opaque mine only');}
console.log(JSON.stringify(result.reports));
