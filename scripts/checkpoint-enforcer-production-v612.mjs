import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Preserve accepted native files before the complete lot is ready. This does
// not update the runtime registry or claim completion in the master workbook.
const audit=process.argv[2];
if(!audit)throw Error('Usage: node scripts/checkpoint-enforcer-production-v612.mjs <audit directory>');
const out='docs/suivi-production/v612';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(p,x)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');};
const plan=read(path.join(audit,'plan/production-plan-v612.json'));
const sanitize=value=>{
 if(Array.isArray(value))return value.map(sanitize);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>k!=='localPath').map(([k,v])=>{
  if(['nativeSourcePath','nativePath','inputNativeSourcePath','selectedNativeSourcePath'].includes(k))return[k.replace(/Path$/,'Name'),typeof v==='string'?path.basename(v):v];
  if(k==='inputReferencedImagePaths')return['inputReferenceNames',v.map(p=>path.basename(p))];
  return[k,sanitize(v)];
 }));
 if(typeof value==='string'&&/^\/(?:workspace|root|tmp)\//.test(value))return path.basename(value);
 return value;
};
const assets=[];
for(const item of plan.records){
 const file=path.join(audit,item.assignedBatch.toLowerCase(),item.id+'.json');
 if(!fs.existsSync(file))continue;
 const r=read(file);
 if(!r.visualInspection?.accepted)continue;
 if(r.id!==item.id||r.repoPngPath!==item.suggestedRepoPngPath)throw Error('Receipt identity mismatch: '+item.id);
 const bytes=fs.readFileSync(r.repoPngPath),native=fs.readFileSync(r.nativeSourcePath);
 if(!bytes.equals(native)||sha(bytes)!==r.sha256||bytes.length!==r.bytes)throw Error('Native file proof failed: '+item.id);
 const meta=await sharp(bytes).metadata();
 if(meta.format!=='png'||meta.width!==1024||meta.height!==1536||meta.channels!==4||!meta.hasAlpha)throw Error('Invalid native format: '+item.id);
 const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
 let transparent=0;const bounds=[1024,1536,0,0];
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;
  if(a>20){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
 }
 if(transparent<info.width*info.height*.1||bounds[0]<=0||bounds[1]<=0||bounds[2]>=1024||bounds[3]>=1536)throw Error('Transparency or framing failed: '+item.id);
 assets.push({...sanitize(r),nativeCopyVerified:true,alphaZeroPixels:transparent,contentBoundsAlpha20:bounds});
}
if(new Set(assets.map(a=>a.sha256)).size!==assets.length)throw Error('Duplicate image bytes');
const record={schemaVersion:'yautja-v612-native-checkpoint-1',verifiedAtUtc:new Date().toISOString(),
 sourceBranchCommit:plan.sourceBranchCommit,sourceMainCommit:plan.sourceMainCommit,expectedCount:36,acceptedCount:assets.length,
 completionState:assets.length===36?'native-images-complete':'native-images-in-progress',
 noteFR:'Sauvegarde des PNG acceptés et de leurs reçus. Les compteurs Excel et le raccordement du lot complet sont vérifiés séparément à la finalisation.',assets};
write(out+'/recovery/native-checkpoint.json',record);
write(out+'/references/production-plan-v612.json',sanitize(plan));
console.log(JSON.stringify({accepted:assets.length,expected:36,bytes:assets.reduce((n,a)=>n+a.bytes,0),files:assets.map(a=>a.repoPngPath)}));
