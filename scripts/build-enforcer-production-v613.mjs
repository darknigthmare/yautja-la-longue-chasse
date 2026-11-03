import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';

// Rebuild tracking from the recovered, already committed native PNGs.
// No image generation, pixel processing or replacement is performed here.
const out='docs/suivi-production/v613';
const recoveryCommit='fe58028cb1afe0a9bbbd555f476b05e4afd85773';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const prose=v=>Array.isArray(v)?v.join(' '):String(v??'');
const override=v=>typeof v==='string'?v:[v.reasonFR,`${v.field} : ${v.historical??'non renseigné'} → ${v.effective??'non renseigné'}.`].filter(Boolean).join(' ');
const plan=read(`${out}/references/production-plan-v613.json`);
const checkpointPath=`${out}/recovery/native-checkpoint.json`;
const checkpointBytes=fs.readFileSync(checkpointPath),checkpoint=JSON.parse(checkpointBytes);
const reconciliation=read(`${out}/data/main-reconciliation.json`);
const main=reconciliation.currentMainCommit;
if(main!==plan.sourceMainCommit||!reconciliation.previousProductionCommitIsAncestorOfMain||reconciliation.mainNativeAssetCount!==72)throw Error('Main reconciliation required');
const gitTree=execFileSync('git',['ls-tree','-r',recoveryCommit,'public/game/production/enforcers-v613'],{encoding:'utf8',maxBuffer:1024*1024});
const recoveryBlobs=new Map(gitTree.trim().split('\n').map(line=>{const [meta,p]=line.split('\t');return[p,meta.split(' ')[2]];}));
const priorReceipts=new Map(checkpoint.assets.map(a=>[a.id,a]));
const verifiedAtUtc=new Date().toISOString();
const assets=[];
for(const item of plan.records){
 const repoPngPath=item.suggestedRepoPngPath;
 if(!repoPngPath.startsWith('public/game/production/enforcers-v613/')||item.priorStatusFR!=='Pas faite')throw Error('Unexpected planned record '+item.id);
 const bytes=fs.readFileSync(repoPngPath),sha256=sha(bytes),gitBlobSha=blob(bytes);
 if(recoveryBlobs.get(repoPngPath)!==gitBlobSha)throw Error('Recovered native Git blob changed: '+item.id);
 const metadata=await sharp(bytes).metadata();
 if(metadata.format!=='png'||metadata.width!==1024||metadata.height!==1536||metadata.channels!==4||!metadata.hasAlpha)throw Error('Native PNG format: '+item.id);
 const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
 let zero=0,solid=0,edgeMax=0;const bounds=[1024,1536,0,0],visible=[1024,1536,0,0];
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];if(a===0)zero++;if(a>=250)solid++;
  if(a){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1);}
  if(a>20){visible[0]=Math.min(visible[0],x);visible[1]=Math.min(visible[1],y);visible[2]=Math.max(visible[2],x+1);visible[3]=Math.max(visible[3],y+1);}
  if(x===0||y===0||x===1023||y===1535)edgeMax=Math.max(edgeMax,a);
 }
 if(zero<info.width*info.height*.1||solid===0)throw Error('Missing real transparency: '+item.id);
 if(visible[0]<=0||visible[1]<=0||visible[2]>=1024||visible[3]>=1536)throw Error('Visible content touches frame: '+item.id);
 const margins=[visible[0]/1024,visible[1]/1536,(1024-visible[2])/1024,(1536-visible[3])/1536];
 const old=priorReceipts.get(item.id),matches=old?.sha256===sha256&&old?.bytes===bytes.length;
 const accepted=matches?(old.attempts??[]).find(a=>a.accepted&&a.sha256===sha256):null;
 if(matches&&!accepted)throw Error('Matching checkpoint lacks exact accepted attempt: '+item.id);
 const attempts=(old?.attempts??[]).map((a,i)=>({...a,attempt:a.attemptIndex??i+1,
  acceptedAtHistoricalCheckpoint:a.accepted??false,acceptedForCurrentOutput:!!(matches&&a.accepted&&a.sha256===sha256)}));
 const limitations=[...(matches?(old.visualInspection?.limitationsFR??[]):[]),
  'Pose fixe ; aucune nouvelle animation ni nouveau placement en scène ; fidélité canonique 1:1 non certifiée.',
  ...(!margins.every(n=>n>=.08)?['La marge vide cible de 8 % n’est pas atteinte sur tous les côtés ; contenu visible alpha > 20 entièrement dans le cadre.']:[]),
  ...(!matches?['Reçu du PNG final, prompt exact soumis et horodatage exact non récupérés ; le brief planifié ne constitue pas une preuve de soumission.']:[])];
 const roleNote=item.variant===8?'Filet dense, armure argentée et accents bordeaux ; rôle Arbitre.':'Armure argentée usée et accents gris ; rôle Vétéran.';
 const groupNote=item.groupId==='four-armed'?'Quatre bras organiques visibles.':item.groupId==='human-accepted'?'Visage et proportions humains, chevelure en dreadlocks et demi-masque.':item.groupId==='pilot-kok'?'Dôme crânien chauve ; morphologie non humaine.':'';
 const note=matches?prose(old.visualInspection?.notesFR):`${roleNote} ${groupNote} Silhouette entière revue sur planche de contrôle après récupération.`.trim();
 if(item.groupId==='augmentes-assassin')limitations.push('Cinq orteils frontaux contrôlés avant récupération ; ergots latéraux supplémentaires documentés. Aucun total de cinq doigts anatomiques n’est certifié.');
 if(item.groupId==='pilot-kok'&&item.variant===9)limitations.push('Marge supérieure très étroite. Optique anatomique gauche et correction du côté droit validées pendant la session de production ; reçu exact final non récupéré.');
 const references=item.references.map(r=>({...r,bytesVerified:r.bytesVerifiedLocally===true,
  verificationScope:'historical-planning-record',plannedReference:true,
  namedInAcceptedAttempt:!!accepted?.inputReferenceNames?.includes(r.id+'.png')}));
 assets.push({id:item.id,groupId:item.groupId,groupFR:item.groupFR,familyId:item.familyId,variant:item.variant,nameFR:item.nameFR,
  priorStatusFR:item.priorStatusFR,statusFR:'Conservée hors main',sourceWorkbookRow:item.sourceWorkbookRow,
  plannedAppearance:item.historicalBrief,userOverrides:item.userOverrides.map(override),repoPngPath,sha256,bytes:bytes.length,
  width:1024,height:1536,mode:'RGBA',transparentBackground:true,alphaBounds:bounds,contentBoundsAlpha20:visible,
  alphaZeroPixels:zero,alphaSolidPixels:solid,edgeAlphaMax:edgeMax,marginsFraction:margins,targetEightPercentMarginMet:margins.every(n=>n>=.08),
  nativeOutputName:matches?(accepted.nativeSourceName??old.nativeSourceName):null,
  generationMethod:'builtin-imagegen',copiedByteIdentical:matches?old.nativeCopyVerified===true:null,
  recoveredByteIdenticalToGitBlob:true,nativeGitBlobSha:gitBlobSha,nativeRecoveryCommit:recoveryCommit,
  generatedAtUtc:accepted?.generatedAtUtc??null,initialReceiptGeneratedAtUtc:old?.generatedAtUtc??null,
  receiptCreatedAtUtc:matches?(old.receiptCreatedAtUtc??null):null,verifiedAtUtc,
  timestampEvidenceFR:matches?`${old.timestampEvidenceFR??'Horodatage du reçu historique.'} Date retenue : essai accepté dont le SHA256 correspond au PNG final.`:'Date de génération et reçu final non récupérés. verifiedAtUtc désigne seulement la vérification des fichiers récupérés.',
  promptExact:matches?(old.promptExact??null):null,acceptedOutputPromptExact:accepted?.promptExact??null,
  plannedPromptExact:item.generationPromptFR,plannedPromptIsSubmissionEvidence:false,
  references,attempts,
  provenanceRecovery:{status:matches?'matching-historical-final-receipt':'final-receipt-not-recovered',checkpointPath,
   checkpointSha256:sha(checkpointBytes),historicalCheckpointSha256:old?.sha256??null,historicalCheckpointMatchesFinal:!!matches,
   noteFR:matches?'Le reçu sauvegardé correspond exactement au SHA256 final.':'Les octets finaux ont été récupérés depuis Git. Aucun prompt ni horodatage manquant n’a été reconstitué.',
   historicalAttemptsAreCompleteForFinalOutput:!!matches},
  visualInspection:{accepted:true,notesFR:note,limitationsFR:[...new Set(limitations)],
   recoveryReviewAtUtc:'2026-10-22T14:31Z',recoveryReviewTimePrecision:'minute',
   recoveryReviewMethodFR:'Relecture visuelle des 36 fichiers récupérés sur trois planches de contrôle ; silhouettes, rôles et cas humains, Pilot et quatre bras revus. La mesure alpha est enregistrée séparément.',
   priorDetailedReviewRecovered:!!matches},
  availabilityNow:'verified-in-working-branch',galleryInBranch:true,codexInBranch:true,animated:false,newMapPlacement:false,canonicalFidelityCertified:false});
}
if(assets.length!==36||new Set(assets.map(a=>a.id)).size!==36||new Set(assets.map(a=>a.sha256)).size!==36)throw Error('Exactly 36 distinct native records required');
const matching=assets.filter(a=>a.provenanceRecovery.historicalCheckpointMatchesFinal).length;
const manifest={schemaVersion:'yautja-enforcer-production-v613-1',version:'V6.13',generatedAtUtc:verifiedAtUtc,
 generatedAtMeaning:'manifest-build-time-not-image-generation-time',verifiedAtUtc,sourceMainCommit:plan.sourceMainCommit,currentMainCommit:main,
 sourceBranchCommit:plan.sourceBranchCommit,mainReconciliationPath:`${out}/data/main-reconciliation.json`,pullRequestUrl:reconciliation.successorPullRequestUrl,
 sourceWorkbook:{repoPath:plan.sourceWorkbook.path,sha256:plan.sourceWorkbook.sha256},nativeRecoveryCommit:recoveryCommit,
 summary:{nativePngFiles:36,groups:18,variants:[8,9],priorV610PngsRecovered:0,matchingFinalReceiptsRecovered:matching,
  finalReceiptsNotRecovered:36-matching,historicalCheckpointRecords:checkpoint.assets.length,plannedPromptsAreNotSubmissionEvidence:true},assets};
write(`${out}/data/production-manifest.json`,manifest);
write(`${out}/recovery/verified-native-files.json`,{schemaVersion:'yautja-v613-recovered-native-files-1',verifiedAtUtc,
 recoveryCommit,checkpointPath,historicalCheckpointSha256:sha(checkpointBytes),nativePngFiles:36,matchingFinalReceiptsRecovered:matching,
 finalReceiptsNotRecovered:36-matching,regeneratedDuringRecovery:false,
 assets:assets.map(a=>({id:a.id,repoPngPath:a.repoPngPath,sha256:a.sha256,bytes:a.bytes,gitBlobSha:a.nativeGitBlobSha,
  recoveredByteIdenticalToGitBlob:true,receiptMatchesFinal:a.provenanceRecovery.historicalCheckpointMatchesFinal,
  width:a.width,height:a.height,alphaZeroPixels:a.alphaZeroPixels,contentBoundsAlpha20:a.contentBoundsAlpha20}))});

const baselineBytes=fs.readFileSync(plan.sourceMaster.path);
if(sha(baselineBytes)!==plan.sourceMaster.sha256)throw Error('V6.12 master changed after planning');
const baseline=JSON.parse(zlib.gunzipSync(baselineBytes));
const previous=['v611','v612'].flatMap(v=>read(`docs/suivi-production/${v}/data/production-manifest.json`).assets.map(a=>({...a,lot:v})));
const mergedById=new Map(reconciliation.assets.map(a=>[a.id,a]));
const rows=structuredClone(baseline.rows),byId=new Map(rows.map(r=>[r.values.A,r]));
const github='https://github.com/darknigthmare/yautja-la-longue-chasse/blob/';
for(const p of previous){
 const proof=mergedById.get(p.id),bytes=fs.readFileSync(p.repoPngPath);
 if(!proof?.existsInMain||proof.sha256!==sha(bytes)||proof.gitBlobSha!==blob(bytes))throw Error('Merged evidence mismatch: '+p.id);
 const row=byId.get(p.id);
 Object.assign(row.values,{F:'Galerie et codex',W:'Oui',AF:p.sha256});
 if(p.lot==='v612'){
  if(row.values.E!=='Conservée hors main')throw Error('Unexpected previous V6.12 status: '+p.id);
  Object.assign(row.values,{E:'Présente dans main',G:'Lot V6.12 fusionné dans main via la PR nº 9 ; aucun nouveau placement en scène attesté par cette réconciliation.',
   AA:'PNG V6.12 natif conservé à l’identique. Fusion de la PR nº 9 vérifiée ; blob et registre présents dans main au commit '+main+'. Galerie et codex raccordés ; pose fixe.',
   AB:github+main+'/'+p.repoPngPath,AC:github+main+'/app/game/data/enforcerProductionV612.json',
   AH:'PNG et registre V6.12 vérifiés dans main après fusion de la PR nº 9.'});
 }
}
for(const p of assets){
 const row=byId.get(p.id);if(!row||row.values.E!=='Pas faite')throw Error('Not previously unmade: '+p.id);
 Object.assign(row.values,{E:'Conservée hors main',G:'Revoir le lot V6.13 de la PR nº 10 ; fusion et placement en scène restent à décider.',
  AA:'PNG V6.13 natif récupéré à l’identique depuis le commit '+recoveryCommit+'. Silhouette et alpha revérifiés. Galerie et codex ajoutés à la branche ; pose fixe. '+(p.provenanceRecovery.historicalCheckpointMatchesFinal?'Reçu historique correspondant au SHA256 final conservé.':'Reçu final et prompt exact non récupérés ; brief planifié distinct.'),
  AB:github+reconciliation.newBranch+'/'+p.repoPngPath,AC:github+reconciliation.newBranch+'/app/game/data/enforcerProductionV613.json',
  AE:p.repoPngPath,AH:'PNG natif récupéré et vérifié dans cette livraison ; hors main.',AI:'Identifiant catalogue exact ; PNG natif récupéré vérifié'});
}
const counts={};for(const row of rows)counts[row.values.E]=(counts[row.values.E]??0)+1;
if(JSON.stringify(counts)!==JSON.stringify(reconciliation.statusCountsAfterReconciliationAndV613))throw Error('Unexpected status totals');
const current={schemaVersion:'yautja-master-v613-1',asOfUtc:verifiedAtUtc,sourceMainCommit:main,historicalSourceMainCommit:plan.sourceMainCommit,
 sourceBranchCommit:plan.sourceBranchCommit,headers:baseline.headers,rowCount:rows.length,statusCounts:counts,rows};
fs.writeFileSync(`${out}/data/current-master.json.gz`,zlib.gzipSync(JSON.stringify(current)));
write(`${out}/data/current-counts.json`,{asOfUtc:verifiedAtUtc,total:rows.length,statusCounts:counts,newProductionCount:36,cumulativeNativePngsAvailable:108,
 newNativePngsInPr:36,priorNativePngsInMain:72,historicalProductionV610Count:36,historicalV610PngsRecovered:0,mainCount:counts['Présente dans main'],
 priorPublishedCommit:plan.sourceBranchCommit,currentMainCommit:main,pullRequestUrl:reconciliation.successorPullRequestUrl,
 remainingEnforcerVariant10Count:18,matchingFinalReceiptsRecovered:matching,finalReceiptsNotRecovered:36-matching});
const beforeById=new Map(baseline.rows.map(r=>[r.values.A,r])),changes=[];
for(const row of rows){const before=beforeById.get(row.values.A);for(const key of new Set([...Object.keys(row.values),...Object.keys(before.values)]))if(row.values[key]!==before.values[key])changes.push({id:row.values.A,rowNumber:row.rowNumber,column:key,before:before.values[key]??null,after:row.values[key]??null});}
if(changes.length!==720||new Set(changes.map(c=>c.id)).size!==108)throw Error('Unexpected tracking delta: '+changes.length);
write(`${out}/validation/master-changes.json`,{verifiedAtUtc,changedCells:changes.length,changedRows:108,totalStableIds:rows.length,changes});

const registryAssets=assets.map(a=>({id:'production-v613:'+a.id+':'+a.sha256.slice(0,12),identityId:a.id,label:a.nameFR+' · '+String(a.variant).padStart(2,'0'),
 packId:'enforcers-v613',packLabel:'Enforcers V6.13 · variantes 08 et 09',version:'V6.13',priority:48,preferredVersion:true,kind:'npc',
 groupId:a.groupId,groupLabel:a.groupFR,role:'enforcers-comics',roleLabel:'Enforcers du comic',lifeStage:a.plannedAppearance.lifeStage,
 regionId:'',morphotypeId:a.groupId,masked:a.groupId==='human-accepted'?'half-mask':'masked',src:a.repoPngPath.replace(/^public/,''),
 width:a.width,height:a.height,bytes:a.bytes,sha256:a.sha256,sourceArchive:'Production native Enforcers V6.13 · 22 octobre 2026',insideArchive:null,
 sourcePath:a.repoPngPath,sourceStatus:'native-produced-visual-reviewed',producerStatus:'verified-in-working-branch',pose:a.plannedAppearance.poseFR,
 motionStatus:'single-pose-static',canonicalFidelity:'not-certified-1-to-1',sourceNote:a.visualInspection.notesFR,
 sourceLimits:a.visualInspection.limitationsFR,supersedesIdentityId:'',supersededByIdentityId:'',fullBody:true,bodyComposition:'single-individual',nativeNature:'native-generated-project-sprite'}));
write('app/game/data/enforcerProductionV613.json',{version:'V6.13',summary:{nativePngFiles:36},packs:[{id:'enforcers-v613',label:'Enforcers V6.13 · variantes 08 et 09',
 version:'V6.13',priority:48,archive:'Production native · 22 octobre 2026',insideArchive:null,sha256:'',pngEntriesImported:36,recordEntries:36,status:'native-produced-visual-reviewed'}],assets:registryAssets});
console.log(JSON.stringify({produced:36,matchingFinalReceipts:matching,missingFinalReceipts:36-matching,changedCells:changes.length,counts}));
