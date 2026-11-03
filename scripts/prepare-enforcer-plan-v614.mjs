import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';

// Read the recovered historical catalogue extraction; publish only logical
// project paths and the exact planned briefs, never private download paths.
const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/prepare-enforcer-plan-v614.mjs <historical-briefs.json>');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=(bytes,algorithm='sha256')=>crypto.createHash(algorithm).update(bytes).digest('hex');
const gitBlob=bytes=>hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]),'sha1');
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const historical=read(input);
if(historical.source.catalogueSHA256!=='ba59462ca9cb7dd05a06d8badf0b53683055d05b434daf64fad99633d7345a3b'||!historical.source.expectedCatalogueSHA256Matched)throw Error('Historical catalogue identity not proved');
const main='92e7c824fd80d6b8152855b3d66560448f8c48c0';
const current='docs/suivi-production/v614';
const workbook='docs/suivi-production/v613/Yautja_Suivi_Variantes_V613_2026-10-22.xlsx';
const masterPath='docs/suivi-production/v613/data/current-master.json.gz';
const master=JSON.parse(zlib.gunzipSync(fs.readFileSync(masterPath)));
const priorPlan=read('docs/suivi-production/v613/references/production-plan-v613.json');
const prior=read('docs/suivi-production/v613/data/production-manifest.json');
const byId=new Map(master.rows.map(r=>[r.values.A,r]));
const tree=new Map(execFileSync('git',['ls-tree','-r',main],{encoding:'utf8',maxBuffer:32*1024*1024}).trim().split('\n').map(line=>{const [meta,p]=line.split('\t');return[p,meta.split(' ')[2]];}));
const at=new Date().toISOString();
const fields=['plannedNameFR','lifeStage','ageDirectionFR','individualDirectionFR','sexDirectionFR','skinDirectionFR','armorDirectionFR','accentDirectionFR','faceState','poseFR','morphologyFR','equipmentFR','cyberneticsFR','mount','dependencyAssetIds','sourceStyleIds','renderSpec'];
const records=historical.records.map((r,index)=>{
 const row=byId.get(r.id);
 if(!row||row.values.E!=='Pas faite'||r.variant!==10||row.values.I!==r.plannedNameFR)throw Error('Not an unmade exact identity: '+r.id);
 const morphology=priorPlan.references.find(x=>x.groupId===r.groupId&&x.role==='lineage-morphology');
 const style=prior.assets.find(x=>x.groupId===r.groupId&&x.variant===9);
 const references=[{id:style.id,groupId:r.groupId,role:'costume-and-rendering',repoPath:style.repoPngPath,sha256:style.sha256,bytes:style.bytes},
  {id:morphology.id,groupId:r.groupId,role:'lineage-morphology',repoPath:morphology.repoPath,sha256:morphology.sha256,bytes:morphology.bytes}].map(ref=>{
   const bytes=fs.readFileSync(ref.repoPath);
   if(hash(bytes)!==ref.sha256||bytes.length!==ref.bytes||tree.get(ref.repoPath)!==gitBlob(bytes))throw Error('Reference bytes disagree with current main: '+ref.id);
   return {...ref,width:1024,height:1536,gitBlobSha1:gitBlob(bytes),sourceCommit:main,bytesVerifiedLocally:true,verifiedAtUtc:at};
  });
 const userOverrides=[];
 if(r.groupId==='human-accepted')userOverrides.push({field:'faceState',historical:r.faceState,effective:'half-mask-with-visible-human-face',reasonFR:'Instruction utilisateur : visage et proportions humains visibles, véritables dreadlocks de cheveux, armure Yautja adaptée à la taille humaine.'});
 if(r.groupId==='pilot-kok')userOverrides.push({field:'faceState',historical:r.faceState,effective:'open-face-high-crest-helmet',reasonFR:'Le brief individuel impose un visage biologique dégagé sans optique prothétique ; le dôme chauve doit rester visible.'});
 const standard='Un seul personnage adulte entier, sans autre figure. Cadrage portrait natif 1024 × 1536, PNG RGBA réellement transparent. Le personnage, la lance, les pieds et tous les appendices occupent environ 80 % du cadre, avec au moins 8 % de vide sur chacun des quatre côtés. Rendu réaliste détaillé cohérent avec les références. Image 1 : référence de costume Enforcer et de rendu du même groupe, pas le nouvel individu ni sa prothèse. Image 2 : référence de morphologie du groupe. Créer un nouveau Chef de poursuite, pas une recoloration des références. Masque argenté à haute crête et pointes latérales, deux petits traits bleu profond de coordination, armures courtes partielles argent patiné, filet visible sur vêtement de combat opaque, lance entière tenue presque verticale à côté du corps et boîtier de liaison compact à la ceinture. Aucun torse cuirassé intégral, aucune cape cachant les membres. Présence assurée, légère rotation du thorax. Aucun sol, socle, ombre de contact, décor, texte, logo ou planche.';
 let specific='';
 if(r.groupId==='human-accepted')specific=' PRIORITÉ HUMAINE : homme humain de 55 ans, peau brun cuivré, visage humain mature ovale, cheveux en véritables dreadlocks poivre et sel, nez et bouche humains visibles. Demi-masque Enforcer ouvert laissant lire le visage humain et la chevelure. Taille et musculature humaines naturelles, cinq doigts humains, chaussures humaines. Aucune mandibule alien ni appendice organique Yautja.';
 if(r.groupId==='pilot-kok')specific=' PRIORITÉ PILOT : dôme chauve bien dégagé jusque derrière les tempes, aucune dreadlock, aucun implant, aucune lentille ou optique prothétique. Visage biologique à quatre mandibules visible sous un casque ouvert à haute crête argentée. Les yeux restent biologiques. Ne pas reprendre les implants des références.';
 if(r.groupId==='bionic')specific=' PRIORITÉ BIONIC : un seul coude DROIT anatomique prothétique métallique articulé (à gauche dans une vue frontale), clairement visible entre bras et avant-bras vivants. Les deux jambes, les deux mains et le bras gauche sont organiques. Aucun autre implant, aucune optique et aucune jambe mécanique. Ne pas recopier les prothèses des références.';
 if(r.groupId==='four-armed')specific=' PRIORITÉ QUATRE BRAS : exactement quatre bras organiques reliés à quatre implantations distinctes sur le thorax, quatre mains complètes bien séparées et visibles. Une main tient la lance, les trois autres sont distinctes du corps et des équipements. Un cou, une tête, un bassin et deux jambes. Pas de bras mécanique ni membre supplémentaire.';
 if(r.groupId==='augmentes-assassin')specific=' PRIORITÉ ASSASSIN : énormes épaules et thorax, jambes franchement digitigrades avec talons hauts et longs métatarses, cinq orteils antérieurs griffus distincts sur chaque pied. Les jambes ne deviennent pas humaines sous les armures.';
 return {id:r.id,groupId:r.groupId,groupFR:row.values.B,familyId:r.familyId,familyFR:row.values.C,variant:10,nameFR:r.plannedNameFR,
  sourceWorkbookRow:row.rowNumber,priorStatusFR:row.values.E,workbookStatusVerified:true,
  workbookStatusVerificationMethod:'Identifiant stable et statut Pas faite vérifiés dans le master V6.13 et absence du PNG contrôlée dans le main V106.',
  historicalBrief:Object.fromEntries(fields.map(k=>[k,r[k]??null])),historicalPromptFR:r.promptFR,
  userOverrides,generationPromptFR:r.promptFR+' '+standard+specific,
  generationPromptProvenance:'Brief Chef de poursuite exact du catalogue historique retrouvé par SHA256, puis consignes de cadrage et adaptations humaines/Pilot explicites.',
  references,assignedBatch:index<6?'ART_A':index<12?'ART_B':'ART_C',
  suggestedRepoPngPath:`public/game/production/enforcers-v614/${r.groupId}/enforcers-comics-10.png`,
  nativeImageGenerated:false,canonicalFidelityCertified:false,plannedAnimation:false,plannedMapPlacement:false};
});
if(records.length!==18||new Set(records.map(r=>r.id)).size!==18)throw Error('Expected 18 unique planned identities');
const metadata=p=>({path:p,sha256:hash(fs.readFileSync(p)),bytes:fs.statSync(p).size});
const plan={schemaVersion:'yautja-native-production-plan-v614-1',createdAtUtc:at,version:'V6.14',sourceMainCommit:main,
 sourceBranchCommit:'4ef1eb48e45278db4606d8ee9999647c62c80a21',sourceWorkbook:metadata(workbook),sourceMaster:{...metadata(masterPath),records:5120},
 sourceCatalogue:{path:'references/DESIGN_CATALOG.json',sha256:historical.source.catalogueSHA256,bytes:historical.source.catalogueBytes,records:4069,recoveredByteIdentical:true,
  sourceArchive:historical.source.archiveName,sourceArchiveSha256:historical.source.archiveSHA256,sourceArchiveBytes:historical.source.archiveBytes},
 targetCount:18,groupCount:18,variants:[10],groups:records.map(r=>r.groupId),selectionRule:'Les 18 Enforcers 10 Chef de poursuite encore Pas faite, dans l’ordre du classeur V6.13, après audit du main V106.',
 generationStarted:false,priorProductionHistoryPreserved:true,references:records.flatMap(r=>r.references),records};
write(current+'/references/production-plan-v614.json',plan);
console.log(JSON.stringify({planned:records.length,groups:plan.groups,sourceMainCommit:main,sourceCatalogue:plan.sourceCatalogue.sha256}));
