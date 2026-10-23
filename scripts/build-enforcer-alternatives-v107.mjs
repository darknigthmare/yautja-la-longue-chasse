import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';

const root=process.cwd(),out='docs/suivi-production/v107-enforcer-poses';
const masterPath='docs/suivi-production/v613/data/current-master.json.gz';
const registryPath='app/game/data/enforcerProductionV613.json';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
async function write(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');}
const masterBytes=await fs.readFile(masterPath),master=JSON.parse(gunzipSync(masterBytes));
const registry=await read(registryPath);
const rows=master.rows.filter(row=>row.values.A.endsWith('--enforcers-comics-10'));
if(rows.length!==18||rows.some(row=>row.values.E!=='Pas faite'))throw Error('Expected the eighteen historical V613 variant10 source rows');
const common='Create one NEW independent mature adult full-body painted game character asset, Enforcers variant10 Chef de poursuite. Portrait PNG1024x1536, genuine transparent RGBA background. One individual only, head to soles fully visible, no scene, floor, glow outside the body, text, labels or border. Leave at least160px empty above the highest point and below the feet, and100px at the sides; the whole figure occupies at most78 percent of image height. Detailed polished illustrated game sprite, crisp readable silhouette, textured skin, worn silver partial comic-Enforcer armor, deep-blue rank accents and visible net textile. No complete military chestplate. Confident stance with slight torso rotation, distinct commanding posture and small tracking equipment held below chest level, both hands and feet readable. This is an original project variant, not a certified film reconstruction. Follow the group anatomy below over generic Predator anatomy. Never substitute a different lineage. A costume guide does not define the anatomy. Covered feet use continuous closed toe-box footwear; do not invent a biological toe count under boots.';
const records=rows.map(row=>{
 const s=row.values,reference=registry.assets.find(a=>a.groupId===s.J&&a.identityId.endsWith('-09'));
 if(!reference)throw Error('Missing historical costume guide for '+s.A);
 const human=s.J==='human-accepted'?'This individual is a HUMAN ADULT accepted by Yautja: ordinary human face, eyes, hands, plantigrade human legs and human proportions; only the clothing is Yautja. Use a half-mask that leaves the human eyes and forehead plainly visible. No alien mandibles, no alien skin.':'';
 const prompt=[common,'Stable project identity: '+s.A+'. Group: '+s.B+'. Role/name: '+s.I+'. Life stage: '+s.M+'.','Exact morphology direction: '+s.O,'Skin: '+s.P+'. Armor: '+s.Q+'. Accent: '+s.R+'. Face: '+s.S+'. Pose: '+s.T+'.',human].filter(Boolean).join('\n\n');
 return{id:s.A,groupId:s.J,groupFR:s.B,familyId:s.K,variant:10,nameFR:s.I,sourceWorkbookRow:row.rowNumber,priorStatusFR:s.E,sourceValues:s,
  repoPngPath:'public/game/production/enforcer-alternatives-v107/'+s.J+'/enforcers-comics-10.png',plannedPromptExact:prompt,plannedPromptIsSubmissionEvidence:false,
  historicalCostumeGuide:{path:reference.sourcePath,sha256:reference.sha256,scope:'Planning only unless an accepted generation receipt explicitly records this input.'}};
});
const plan={schemaVersion:'yautja-enforcer-plan-v107-1',version:'V107',asOf:'2026-10-23',sourceMainCommit:'92e7c824fd80d6b8152855b3d66560448f8c48c0',sourceMaster:{path:masterPath,sha256:digest(masterBytes)},targetCount:18,records};
if(process.argv.includes('--plan')){await write(out+'/references/production-plan-v107.json',plan);console.log(JSON.stringify({planned:18,path:out+'/references/production-plan-v107.json'}));}
else{
 const assets=[];
 for(const item of records){
  const receipt=await read(out+'/receipts/'+item.id+'.json');
  if(receipt.id!==item.id||receipt.method!=='builtin-imagegen'||!receipt.promptExact||receipt.visualInspection?.accepted!==true)throw Error('A reviewed real generation receipt is required: '+item.id);
  const bytes=await fs.readFile(item.repoPngPath),sha256=digest(bytes);
  if(receipt.sha256!==sha256||receipt.bytes!==bytes.length)throw Error('Receipt and original PNG differ: '+item.id);
  const metadata=await sharp(bytes).metadata();
  if(metadata.format!=='png'||metadata.width!==1024||metadata.height!==1536||!metadata.hasAlpha)throw Error('Native transparent1024x1536 PNG required: '+item.id);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let zero=0,solid=0,edge=0;const bounds=[1024,1536,0,0];
  for(let y=0;y<1536;y++)for(let x=0;x<1024;x++){
   const a=data[(y*1024+x)*4+3];if(a===0)zero++;if(a>=250)solid++;
   if(a>20){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
   if(x===0||y===0||x===1023||y===1535)edge=Math.max(edge,a);
  }
  if(info.channels!==4||zero<1024*1536*.1||solid===0||bounds[0]<=0||bounds[1]<=0||bounds[2]>=1024||bounds[3]>=1536)throw Error('Real alpha and complete visible margins required: '+item.id);
  const margins=[bounds[0]/1024,bounds[1]/1536,(1024-bounds[2])/1024,(1536-bounds[3])/1536];
  assets.push({...item,sha256,bytes:bytes.length,width:1024,height:1536,mode:'RGBA',transparentBackground:true,contentBoundsAlpha20:bounds,alphaZeroPixels:zero,alphaSolidPixels:solid,edgeAlphaMax:edge,marginsFraction:margins,targetEightPercentMarginMet:margins.every(v=>v>=.08),
   receiptPath:out+'/receipts/'+item.id+'.json',promptExact:receipt.promptExact,generatedAtUtc:receipt.generatedAtUtc??null,generationTimeMeaning:receipt.generationTimeMeaning,
   visualInspection:receipt.visualInspection,animated:false,newMapPlacement:false,canonicalFidelityCertified:false,
   sourceLimits:['Original project variation and one fixed pose; not a new animation or a certified1:1 film anatomy.',...(!margins.every(v=>v>=.08)?['The8percent empty-margin target is not met on every side; visible alpha remains inside the frame.']:[]),...(receipt.visualInspection.limitations??[])]});
 }
 if(new Set(assets.map(a=>a.sha256)).size!==18)throw Error('All eighteen original images must be distinct');
 await write(out+'/data/production-manifest.json',{schemaVersion:'yautja-enforcer-production-v107-1',version:'V107',sourceMainCommit:plan.sourceMainCommit,sourceMaster:plan.sourceMaster,summary:{nativePngFiles:18,newPoses:18,newStableIdentities:0,reusedStableIdentities:18,parallelBaselinePullRequest:15,groups:18,variants:[10],historicalReceiptsRecovered:0,historicalV610PngsRecovered:0},assets});
 const registryAssets=assets.map(a=>({id:'production-v107-alternative:'+a.id+':'+a.sha256.slice(0,12),identityId:a.id,label:a.nameFR+' ·10 · pose alternative',packId:'enforcer-alternatives-v107',packLabel:'Enforcers · poses alternatives V107',version:'V107',priority:46,preferredVersion:true,kind:'npc',groupId:a.groupId,groupLabel:a.groupFR,role:'enforcers-comics',roleLabel:'Enforcers du comic',lifeStage:a.sourceValues.M,regionId:'',morphotypeId:a.groupId,masked:a.groupId==='human-accepted'?'half-mask':'masked',src:a.repoPngPath.slice(6),width:a.width,height:a.height,bytes:a.bytes,sha256:a.sha256,sourceArchive:'Production native · poses alternatives V107 · 23 octobre 2026',insideArchive:null,sourcePath:a.repoPngPath,sourceStatus:'native-produced-visual-reviewed',producerStatus:'verified-in-working-branch',pose:a.sourceValues.T,motionStatus:'single-pose-static',canonicalFidelity:'not-certified-1-to-1',sourceNote:a.visualInspection.notes,sourceLimits:a.sourceLimits,supersedesIdentityId:'',supersededByIdentityId:'',fullBody:true,bodyComposition:'single-individual',nativeNature:'native-generated-project-sprite'}));
 await write('app/game/data/enforcerAlternativesV107.json',{version:'V107',summary:{nativePngFiles:18,newPoses:18,newStableIdentities:0,reusedStableIdentities:18},packs:[{id:'enforcer-alternatives-v107',label:'Enforcers · poses alternatives V107',version:'V107',priority:46,archive:'Production native · 23 octobre 2026',insideArchive:null,sha256:'',pngEntriesImported:18,recordEntries:18,status:'native-produced-visual-reviewed'}],assets:registryAssets});
 console.log(JSON.stringify({produced:18,distinct:18,originalBytesPreserved:true,registry:'app/game/data/enforcerAlternativesV107.json'}));
}
