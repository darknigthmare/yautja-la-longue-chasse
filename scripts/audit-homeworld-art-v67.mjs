import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const files=['ash-causeway-vista','glass-processional-vista','processional-bridge'];
const assets=[];
for(const id of files){
 const file='public/game/homeworld/v67/'+id+'.png',provenance=JSON.parse(await fs.readFile('docs/v67-generation/'+id+'.json','utf8'));
 const bytes=await fs.readFile(file),source=await fs.readFile(provenance.source),hash=data=>createHash('sha256').update(data).digest('hex');
 assert.equal(hash(bytes),hash(source),'Runtime must preserve native generated pixels');
 const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,1536);assert.equal(metadata.height,1024);
 let alpha=null;
 if(id==='processional-bridge'){
  assert(metadata.hasAlpha);const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let visible=0,empty=0;for(let i=3;i<data.length;i+=info.channels){if(data[i]===0)empty++;if(data[i]>240)visible++;}
  assert(empty>info.width*info.height*.4,'Independent bridge needs real transparent margins');assert(visible>info.width*info.height*.2);
  alpha={transparentPixels:empty,nearlyOpaquePixels:visible};
 }
 assets.push({id,path:file,sha256:hash(bytes),bytes:bytes.length,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,alpha,nativeUnmodified:true});
}
const report={release:'V67',status:'PASS',checkedAt:new Date().toISOString(),assets,pixelEditingPerformed:false,canonicalFidelityCertified:false,scope:'Three native OpenAI originals only. Application placement requires separate browser inspection.'};
await fs.writeFile('docs/v67-homeworld-art-native-qa.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,assets:assets.length,bytes:assets.reduce((n,a)=>n+a.bytes,0)}));
