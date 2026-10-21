import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import sharp from 'sharp';

// Read the accepted native-image receipts. This script never generates or edits pixels.
const root=process.cwd();
const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/build-enforcer-production-v612.mjs <v612 audit directory>');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,d)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const prose=v=>Array.isArray(v)?v.join(' '):String(v??'');
const overrideProse=v=>typeof v==='string'?v:[v.reasonFR,`${v.field} : ${v.historical??'non renseigné'} → ${v.effective??'non renseigné'}.`].filter(Boolean).join(' ');
const plan=read(path.join(input,'plan/production-plan-v612.json'));
const out='docs/suivi-production/v612';
const sourceCommit=plan.sourceMainCommit;
const reconciliation=read(`${out}/data/main-reconciliation.json`);
const currentMain=reconciliation.currentMainCommit;
if(!reconciliation.previousProductionCommitIsAncestorOfMain||reconciliation.mainV611AssetCount!==36||!reconciliation.successorPullRequestNumber)throw Error('Verified main reconciliation and successor PR are required');
const mergedById=new Map(reconciliation.assets.map(a=>[a.id,a]));
const expectedIds=new Set(plan.records.map(r=>r.id));
if(expectedIds.size!==36)throw Error('Expected exactly 36 planned identities');
const receipts=[];
const repoAssetPrefix='public/game/production/enforcers-v612/';
for(const item of plan.records){
 const batch=item.assignedBatch.toLowerCase();
 const receiptPath=path.join(input,batch,`${item.id}.json`);
 if(!fs.existsSync(receiptPath))throw Error(`Missing accepted receipt: ${item.id}`);
 const r=read(receiptPath);
 if(!r.visualInspection?.accepted)throw Error(`Visual inspection not accepted: ${item.id}`);
 if(r.id!==item.id||r.groupId!==item.groupId||r.variant!==item.variant)throw Error(`Identity mismatch: ${item.id}`);
 if(r.repoPngPath!==item.suggestedRepoPngPath||!r.repoPngPath.startsWith(repoAssetPrefix))throw Error(`Path mismatch: ${item.id}`);
 const bytes=fs.readFileSync(path.join(root,r.repoPngPath));
 const native=fs.readFileSync(r.nativeSourcePath);
 if(!bytes.equals(native)||sha(bytes)!==r.sha256||bytes.length!==r.bytes)throw Error(`Native byte proof failed: ${item.id}`);
 const metadata=await sharp(bytes).metadata();
 if(metadata.format!=='png'||metadata.width!==1024||metadata.height!==1536||metadata.channels!==4||!metadata.hasAlpha)throw Error(`Native PNG format failed: ${item.id}`);
 const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
 let zero=0,solid=0;const bounds=[1024,1536,0,0],visible=[1024,1536,0,0];let edgeMax=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];if(a===0)zero++;if(a>=250)solid++;
  if(a){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
  if(a>20){visible[0]=Math.min(visible[0],x);visible[1]=Math.min(visible[1],y);visible[2]=Math.max(visible[2],x+1);visible[3]=Math.max(visible[3],y+1);}
  if(x===0||y===0||x===1023||y===1535)edgeMax=Math.max(edgeMax,a);
 }
 if(zero<1024*1536*.1||solid===0)throw Error(`Missing real transparency: ${item.id}`);
 if(visible[0]<=0||visible[1]<=0||visible[2]>=1024||visible[3]>=1536)throw Error(`Visible content touches frame: ${item.id}`);
 const references=item.references.map(ref=>{
  const local=ref.localPath,b=fs.readFileSync(local);
  if(sha(b)!==ref.sha256||b.length!==ref.bytes)throw Error(`Reference bytes changed: ${ref.id}`);
  return{id:ref.id,role:ref.role,repoPath:ref.repoPath,sha256:ref.sha256,bytes:b.length,sourceCommit,sourceUrl:ref.rawUrl,bytesVerified:true};
 });
 const attempts=(r.attempts??[]).map((attempt,index)=>{
  const local=attempt.nativeSourcePath??attempt.nativePath??attempt.path;
  const b=local&&fs.existsSync(local)?fs.readFileSync(local):null;
  const input=attempt.inputNativeSourcePath;
  const inputBytes=input&&fs.existsSync(input)?fs.readFileSync(input):null;
  return{attempt:attempt.attemptIndex??attempt.attempt??index+1,accepted:attempt.accepted??false,
   status:attempt.status??(b?'native-output-produced':'no-output-documented'),generatedAtUtc:attempt.generatedAtUtc??null,attemptedAtUtc:attempt.attemptedAtUtc??null,
   reasonFR:prose(attempt.reasonFR??attempt.failureReasonFR??attempt.rejectionReasonsFR??attempt.error),
   errorCode:attempt.errorCode??null,moderationStage:attempt.moderationStage??null,moderationCategory:attempt.category??null,
   promptExact:attempt.promptExact??null,nativeOutputName:local?path.basename(local):null,
   inputNativeOutputName:input?path.basename(input):null,inputSha256:inputBytes?sha(inputBytes):null,inputBytes:inputBytes?.length??null,
   sha256:b?sha(b):attempt.sha256??null,bytes:b?b.length:attempt.bytes??null,
   timestampEvidence:attempt.timestampEvidence??null,
   inputReferences:(attempt.inputReferencedImagePaths??[]).map((p,i)=>({name:path.basename(p),sha256:attempt.inputReferenceSha256?.[i]??null}))};
 }).sort((a,b)=>a.attempt-b.attempt);
 receipts.push({id:item.id,groupId:item.groupId,groupFR:item.groupFR,familyId:item.familyId,variant:item.variant,nameFR:item.nameFR,
  priorStatusFR:item.priorStatusFR,statusFR:'Conservée hors main',sourceWorkbookRow:item.sourceWorkbookRow,
  plannedAppearance:item.historicalBrief,userOverrides:item.userOverrides.map(overrideProse),
  repoPngPath:r.repoPngPath,sha256:r.sha256,bytes:r.bytes,width:1024,height:1536,mode:'RGBA',transparentBackground:true,
  alphaBounds:bounds,contentBoundsAlpha20:visible,alphaZeroPixels:zero,edgeAlphaMax:edgeMax,
  nativeOutputName:path.basename(r.nativeSourcePath),copiedByteIdentical:true,generationMethod:'builtin-imagegen',
  generatedAtUtc:r.generatedAtUtc,receiptCreatedAtUtc:r.receiptCreatedAtUtc??r.generatedAtUtc,
  timestampEvidenceFR:r.timestampEvidenceFR??'Horodatage relevé lors de la sauvegarde du reçu ; heure exacte du service de génération non fournie.',
  promptExact:r.promptExact,
  acceptedOutputPromptExact:attempts.find(a=>a.accepted&&a.sha256===r.sha256)?.promptExact??r.promptExact,
  selectionEvent:r.selectionEvent?{selectedAttemptIndex:r.selectionEvent.selectedAttemptIndex,
   selectedNativeOutputName:path.basename(r.selectionEvent.selectedNativeSourcePath),confirmedAtUtc:r.selectionEvent.confirmedAtUtc??null,
   reasonFR:r.selectionEvent.reasonFR??null}:null,
  references,attempts,visualInspection:{...r.visualInspection,notesFR:prose(r.visualInspection.notesFR)},
  availabilityNow:'verified-in-working-branch',galleryInBranch:true,codexInBranch:true,animated:false,newMapPlacement:false,canonicalFidelityCertified:false});
}
if(new Set(receipts.map(r=>r.sha256)).size!==36)throw Error('Duplicate generated pixels');
const generatedAtUtc=new Date().toISOString();
const manifest={schemaVersion:'yautja-enforcer-production-v612-1',version:'V6.12',generatedAtUtc,sourceMainCommit:sourceCommit,
 currentMainCommit:currentMain,mainReconciliationPath:`${out}/data/main-reconciliation.json`,pullRequestUrl:reconciliation.successorPullRequestUrl,
 sourceBranchCommit:plan.sourceBranchCommit,sourceWorkbook:{repoPath:plan.sourceWorkbook.path,sha256:plan.sourceWorkbook.sha256},
 summary:{nativePngFiles:receipts.length,groups:new Set(receipts.map(r=>r.groupId)).size,variants:[6,7],priorV610PngsRecovered:0},assets:receipts};
write(`${out}/data/production-manifest.json`,manifest);

const baselinePath='docs/suivi-production/v611/data/current-master.json.gz';
const baselineBytes=fs.readFileSync(baselinePath);
if(sha(baselineBytes)!==plan.sourceMaster.sha256)throw Error('V6.11 master changed after planning');
const baseline=JSON.parse(zlib.gunzipSync(baselineBytes));
const previous=read('docs/suivi-production/v611/data/production-manifest.json');
const variants=structuredClone(baseline.rows),byId=new Map(variants.map(r=>[r.values.A,r]));
const previousCommit=plan.sourceBranchCommit;
const github='https://github.com/darknigthmare/yautja-la-longue-chasse/blob/';
const branch=reconciliation.newBranch;
for(const p of previous.assets){
 const bytes=fs.readFileSync(p.repoPngPath);
 if(sha(bytes)!==p.sha256||bytes.length!==p.bytes)throw Error('Published V6.11 asset changed: '+p.id);
 const merged=mergedById.get(p.id);
 if(!merged?.existsInMain||merged.repoPath!==p.repoPngPath||merged.sha256!==p.sha256||merged.bytes!==p.bytes)throw Error('Main evidence mismatch: '+p.id);
 const row=byId.get(p.id);if(row.values.E!=='Conservée hors main')throw Error('Unexpected V6.11 status');
 Object.assign(row.values,{E:'Présente dans main',G:'Lot V6.11 fusionné dans main via la PR nº 7 ; aucun nouveau placement en scène attesté par cette réconciliation.',
  AA:'PNG V6.11 natif conservé à l’identique. Fusion de la PR nº 7 vérifiée ; blob et registre présents dans main au commit '+currentMain+'. Galerie et codex raccordés ; pose fixe.',
  AB:github+currentMain+'/'+p.repoPngPath,AC:github+currentMain+'/app/game/data/enforcerProductionV611.json',
  AH:'PNG et registre V6.11 vérifiés dans main après fusion de la PR nº 7.'});
}
for(const p of receipts){
 const row=byId.get(p.id);if(!row||row.values.E!=='Pas faite')throw Error('Not previously unmade: '+p.id);
 Object.assign(row.values,{E:'Conservée hors main',G:`Revoir le lot V6.12 de la PR nº ${reconciliation.successorPullRequestNumber} ; fusion et placement en scène restent à décider.`,
  AA:'PNG V6.12 natif fourni dans cette livraison, inspecté et vérifié octet par octet. Références de galerie et codex ajoutées à la branche. Pose fixe ; aucun nouveau placement en scène.',
  AB:github+branch+'/'+p.repoPngPath,AC:github+branch+'/app/game/data/enforcerProductionV612.json',
  AE:p.repoPngPath,AH:'PNG natif vérifié dans cette livraison ; hors main.',AI:'Identifiant catalogue exact ; nouveau PNG natif vérifié'});
}
const counts={};for(const row of variants)counts[row.values.E]=(counts[row.values.E]??0)+1;
const current={schemaVersion:'yautja-master-v612-1',asOfUtc:generatedAtUtc,sourceMainCommit:currentMain,historicalSourceMainCommit:sourceCommit,sourceBranchCommit:previousCommit,
 headers:baseline.headers,rowCount:variants.length,statusCounts:counts,rows:variants};
fs.writeFileSync(out+'/data/current-master.json.gz',zlib.gzipSync(JSON.stringify(current)));
write(out+'/data/current-counts.json',{asOfUtc:generatedAtUtc,total:variants.length,statusCounts:counts,newProductionCount:36,
 cumulativeNativePngsAvailable:previous.assets.length+receipts.length,newNativePngsInPr:receipts.length,priorNativePngsInMain:previous.assets.length,
 historicalProductionV610Count:36,historicalV610PngsRecovered:0,mainCount:counts['Présente dans main'],priorPublishedCommit:previousCommit,
 currentMainCommit:currentMain,pullRequestUrl:reconciliation.successorPullRequestUrl});
const assets=receipts.map(r=>({id:'production-v612:'+r.id+':'+r.sha256.slice(0,12),identityId:r.id,label:r.nameFR+' · '+String(r.variant).padStart(2,'0'),
 packId:'enforcers-v612',packLabel:'Enforcers V6.12 · variantes 06 et 07',version:'V6.12',priority:49,preferredVersion:true,kind:'npc',
 groupId:r.groupId,groupLabel:r.groupFR,role:'enforcers-comics',roleLabel:'Enforcers du comic',lifeStage:r.plannedAppearance.lifeStage,
 regionId:'',morphotypeId:r.groupId,masked:r.groupId==='human-accepted'?'half-mask':'masked',src:r.repoPngPath.replace(/^public/,''),
 width:r.width,height:r.height,bytes:r.bytes,sha256:r.sha256,sourceArchive:'Production native Enforcers V6.12 · 21 octobre 2026',insideArchive:null,
 sourcePath:r.repoPngPath,sourceStatus:'native-produced-visual-reviewed',producerStatus:'verified-in-working-branch',pose:r.plannedAppearance.poseFR,
 motionStatus:'single-pose-static',canonicalFidelity:'not-certified-1-to-1',sourceNote:r.visualInspection.notesFR,
 sourceLimits:[...(Array.isArray(r.visualInspection.limitationsFR)?r.visualInspection.limitationsFR:[r.visualInspection.limitationsFR]).filter(Boolean),
  'Pose fixe unique ; aucun cycle de marche ou de combat produit.'],supersedesIdentityId:'',supersededByIdentityId:'',fullBody:true,
 bodyComposition:'single-individual',nativeNature:'native-generated-project-sprite'}));
write('app/game/data/enforcerProductionV612.json',{version:'V6.12',summary:{nativePngFiles:assets.length},
 packs:[{id:'enforcers-v612',label:'Enforcers V6.12 · variantes 06 et 07',version:'V6.12',priority:49,archive:'Production native · 21 octobre 2026',
 insideArchive:null,sha256:'',pngEntriesImported:assets.length,recordEntries:assets.length,status:'native-produced-visual-reviewed'}],assets});
const sanitized=structuredClone(plan);
for(const ref of [...sanitized.references,...sanitized.records.flatMap(r=>r.references)])delete ref.localPath;
write(out+'/references/production-plan-v612.json',sanitized);
console.log(JSON.stringify({produced:receipts.length,groups:18,counts,manifest:out+'/data/production-manifest.json'}));
