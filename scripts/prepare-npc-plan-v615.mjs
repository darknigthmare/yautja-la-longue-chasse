import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';

// The input is the selected, path-sanitized extraction from the byte-verified
// historical catalogue. Only logical project paths are published below.
const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/prepare-npc-plan-v615.mjs <historical-briefs.json>');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=(bytes,algorithm='sha256')=>crypto.createHash(algorithm).update(bytes).digest('hex');
const gitBlob=bytes=>hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]),'sha1');
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const main='92e7c824fd80d6b8152855b3d66560448f8c48c0';
const previous='4a1b437eb60fa9d511722bf4930fd49ff7fb8f86';
const historical=read(input);
if(historical.source.catalogueSHA256!=='ba59462ca9cb7dd05a06d8badf0b53683055d05b434daf64fad99633d7345a3b'
 ||!historical.source.expectedCatalogueSHA256Matched||historical.source.catalogueRecords!==4069)throw Error('Historical catalogue identity not proved');
const current='docs/suivi-production/v615';
const workbook='docs/suivi-production/v614/Yautja_Suivi_Variantes_V614_2026-10-23.xlsx';
const masterPath='docs/suivi-production/v614/data/current-master.json.gz';
const master=JSON.parse(zlib.gunzipSync(fs.readFileSync(masterPath)));
const byId=new Map(master.rows.map(r=>[r.values.A,r]));
const priorPlan=read('docs/suivi-production/v614/references/production-plan-v614.json');
const tree=new Map(execFileSync('git',['ls-tree','-r',main],{encoding:'utf8',maxBuffer:32*1024*1024}).trim().split('\n').map(line=>{const [meta,p]=line.split('\t');return[p,meta.split(' ')[2]];}));
const at=new Date().toISOString();
const selected=master.rows.filter(row=>row.values.E==='Pas faite'&&row.values.K==='sucklings'&&row.values.D===2);
if(selected.length!==18||selected[0].values.A!=='super-predators--sucklings-02')throw Error('Unexpected next missing cohort');
const fields=['plannedNameFR','lifeStage','ageDirectionFR','individualDirectionFR','sexDirectionFR','skinDirectionFR','armorDirectionFR','accentDirectionFR','faceState','poseFR','morphologyFR','equipmentFR','cyberneticsFR','mount','dependencyAssetIds','sourceStyleIds','renderSpec'];
const records=selected.map((row,index)=>{
 const r=historical.records.find(record=>record.id===row.values.A);
 if(!r||r.variant!==2||r.familyId!=='sucklings'||r.lifeStage!=='infant'||row.values.I!==r.plannedNameFR)throw Error('Not an exact unmade suckling identity: '+row.values.A);
 const infant=byId.get(r.groupId+'--sucklings-01');
 if(!infant||infant.values.E!=='Présente dans main'||!tree.has(infant.values.AE))throw Error('Missing historical infant01 reference: '+r.groupId);
 const morphology=priorPlan.references.find(ref=>ref.groupId===r.groupId&&ref.role==='lineage-morphology');
 const references=[{id:infant.values.A,groupId:r.groupId,role:'infant-stage-and-rendering',repoPath:infant.values.AE,sha256:infant.values.AF,
  useFR:'Référence historique étiquetée sucklings-01 du même groupe. Inspecter son stade apparent ; conserver le rendu et les traits compatibles avec la fiche02, sans copier le personnage ni importer une arme ou une anatomie mature.'},
 {id:morphology.id,groupId:r.groupId,role:'lineage-morphology',repoPath:morphology.repoPath,sha256:morphology.sha256,
  useFR:'Référence adulte du même groupe pour la topologie et les caractères crâniens uniquement. Ne pas reprendre ses proportions adultes, son âge, sa musculature, ses équipements ou ses prothèses.'}].map(ref=>{
   const bytes=fs.readFileSync(ref.repoPath);
   if(hash(bytes)!==ref.sha256||tree.get(ref.repoPath)!==gitBlob(bytes))throw Error('Reference bytes disagree with current main: '+ref.id);
   if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Reference is not a PNG: '+ref.id);
   return {...ref,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),gitBlobSha1:gitBlob(bytes),sourceCommit:main,
    bytesVerifiedLocally:true,visualReviewRequiredBeforeGeneration:true,verifiedAtUtc:at};
  });
 const standard=' Usage : sprite 2D réaliste détaillé indépendant pour la galerie et le codex du jeu. Input image 1 : ancien sucklings-01 du même groupe, référence de stade et de rendu à inspecter, pas le nouvel individu. Input image 2 : adulte du même groupe, référence de topologie et de crâne uniquement. Ces références ne remplacent jamais les proportions immatures de la fiche. Créer un nouveau tout-petit calme assis, entièrement habillé d’une tunique ample opaque à manches longues et d’un pantalon opaque, tenant une grande bande de tissu bleu terne dans les mains. Les vêtements couvrent entièrement torse, abdomen et bassin ; les mains et pieds restent lisibles. Visage biologique découvert, anatomie précoce spécifique du groupe, aucune musculature adulte ni forme adulte réduite. Aucun implant, prothèse, armement, armure, trophée, casque ou masque. Les versions de jeune âge sont des créations fictives du projet ; ne pas les présenter comme un modèle canonique du film. Le personnage et son tissu occupent au plus 80 % du cadre, entièrement visibles avec au moins 8 % de marge transparente sur chaque côté. Cadrage portrait natif 1024 × 1536 en RGBA réellement transparent. Un seul individu ; aucun autre personnage, décor, sol, ombre portée, socle, texte, logo ni planche. Ne pas changer les pixels après génération.';
 let specific='';
 if(r.groupId==='human-accepted')specific=' PRIORITÉ HUMAINE : petite fille humaine de 2 ans, peau brun moyen et cheveux naturels châtain clair adaptés à cet âge. Visage, nez, lèvres, oreilles, mains et proportions entièrement humains. Tunique et pantalon civils opaques, chaussures humaines fermées. L’affiliation Yautja est culturelle : aucun organe alien, aucune mandibule, aucune dreadlock adulte artificielle, aucune armure ni arme.';
 if(r.groupId==='pilot-kok')specific=' PRIORITÉ PILOT : bébé à dôme chauve, sans aucune dreadlock. Quatre mandibules biologiques en développement, petits reliefs organiques aux épaules, deux bras et deux jambes. Aucun implant oculaire, aucune optique ou prothèse.';
 if(r.groupId==='bionic')specific=' PRIORITÉ BIONIC : bébé Yautja entièrement organique, deux bras, deux mains, deux jambes et quatre mandibules en développement. Aucune amputation, aucun implant, aucune pièce mécanique : les prothèses adultes ne sont pas héréditaires.';
 if(r.groupId==='four-armed')specific=' PRIORITÉ QUATRE BRAS : exactement quatre bras organiques immatures issus de quatre insertions distinctes au thorax et quatre mains bien séparées et lisibles, un bassin et deux jambes. Deux mains tiennent le textile ; les deux autres restent visibles. Vêtement civil à quatre manches opaques, crâne juvénile à deux lobes et quatre mandibules en croissance.';
 if(r.groupId==='oni-kok')specific=' PRIORITÉ ONI : exactement deux mandibules inférieures recourbées en développement et aucune paire supérieure. Crâne étroit avec reliefs fins naissants. Adapter les proportions à un tout-petit sans transformer le visage en Yautja classique à quatre mandibules.';
 if(r.groupId==='spiked-tail')specific=' PRIORITÉ SPIKED TAIL : petite couronne crânienne naissante et courte tresse issue du crâne. Aucune queue au bassin. Visage organique découvert, aucun respirateur et aucune pièce mécanique héritée de l’adulte.';
 if(r.groupId==='hornhead')specific=' PRIORITÉ HORNHEAD : exactement deux petites cornes frontales biologiques naissantes. Aucun casque, aucune grande corne de bélier ou de taureau.';
 if(r.groupId==='augmentes-assassin')specific=' PRIORITÉ ASSASSIN : proportions vraiment infantiles avec la topologie digitigrade de la fiche, talon relevé et métatarse allongé visibles dans la pose assise. Pas de torse de bodybuilder. L’enfance de cette cohorte est une extrapolation fictive du projet.';
 if(r.groupId==='saar-keth')specific=' PRIORITÉ SAAR-KETH : quatre petites mandibules latérales, arcades en auvent, peau vivante ocre minéral pâle et pieds larges à quatre doigts antérieurs plus un latéral. Aucun cristal ni organisme minéral.';
 return {id:r.id,groupId:r.groupId,groupFR:row.values.B,familyId:r.familyId,familyFR:row.values.C,variant:2,nameFR:r.plannedNameFR,
  sourceWorkbookRow:row.rowNumber,priorStatusFR:row.values.E,workbookStatusVerified:true,
  workbookStatusVerificationMethod:'Identifiant, famille, variante et statut Pas faite vérifiés dans le maître V6.14 publié par la PR15 ; le main V106 et le lot V6.14 restent distincts.',
  historicalBrief:Object.fromEntries(fields.map(k=>[k,r[k]??null])),historicalPromptFR:r.promptFR,
  userOverrides:[],generationPromptFR:r.promptFR+standard+specific,
  generationPromptProvenance:'Fiche exacte du catalogue historique retrouvé par SHA256, puis consignes de rendu, de cadrage et de stade infantile explicites.',
  references,assignedBatch:index<6?'ART_A':index<12?'ART_B':'ART_C',
  suggestedRepoPngPath:`public/game/production/sucklings-v615/${r.groupId}/sucklings-02.png`,
  nativeImageGenerated:false,designOrigin:'original-project-production-brief',canonicalFidelityCertified:false,plannedAnimation:false,plannedMapPlacement:false};
});
if(records.length!==18||new Set(records.map(r=>r.id)).size!==18)throw Error('Expected 18 unique planned identities');
const metadata=p=>({path:p,sha256:hash(fs.readFileSync(p)),bytes:fs.statSync(p).size});
const priorConserved=master.rows.filter(row=>row.values.E==='Conservée hors main');
if(priorConserved.length!==18||priorConserved.some(row=>row.values.K!=='enforcers-comics'||row.values.D!==10))throw Error('Unexpected V6.14 preservation cohort');
const plan={schemaVersion:'yautja-native-production-plan-v615-1',createdAtUtc:at,version:'V6.15',sourceMainCommit:main,sourceBranchCommit:previous,
 pullRequestUrl:'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/15',previousLotMerged:false,
 sourceWorkbook:metadata(workbook),sourceMaster:{...metadata(masterPath),records:5120},
 sourceCatalogue:{path:'references/DESIGN_CATALOG.json',sha256:historical.source.catalogueSHA256,bytes:historical.source.catalogueBytes,records:4069,recoveredByteIdentical:true,
  sourceArchive:historical.source.archiveName,sourceArchiveSha256:historical.source.archiveSHA256,sourceArchiveBytes:historical.source.archiveBytes},
 targetCount:18,groupCount:18,familyId:'sucklings',variants:[2],groups:records.map(r=>r.groupId),
 selectionRule:'Après les Enforcers terminés, première variante manquante de la famille suivante dans l’ordre du maître V6.14 : les 18 sucklings-02 Veilleur du tissu.',
 stageAndCanonScopeFR:'Dix-sept tout-petits de lignées fictives et un enfant humain de 2 ans, tous civils protégés. Les âges et adaptations sont des créations du projet, sans certification canonique 1:1.',
 expectedStatusCountsAfterProduction:{'Présente dans main':2197,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2682},
 preservedPriorUnmergedIds:priorConserved.map(row=>row.values.A),generationStarted:false,priorProductionHistoryPreserved:true,
 references:records.flatMap(r=>r.references),records};
write(current+'/references/production-plan-v615.json',plan);
console.log(JSON.stringify({planned:records.length,familyId:plan.familyId,groups:plan.groups,sourceMainCommit:main,sourceBranchCommit:previous,sourceCatalogue:plan.sourceCatalogue.sha256}));
