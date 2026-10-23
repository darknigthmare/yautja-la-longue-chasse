#!/usr/bin/env node
/** V107 follows every V106 open row without rewriting historical evidence. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyOpenWorkstreamsAuditV107} from './check-open-workstreams-audit-v107.mjs';
import {collectRuntimeInputsV107} from './collect-v107-runtime-inputs.mjs';
export {collectVariantInputsV107} from './collect-pit-variant-inputs-v107.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const REGISTRY='docs/v107-workstreams-source.json';
export const OUTPUTS=['v107-workstreams.json','YAUTJA_V107_SUIVI.xlsx','v107-excel-followup-qa.json'];
const WRITER='scripts/build-excel-followup-v107.py';
const BASELINE={path:'docs/YAUTJA_V106_SUIVI.xlsx',sha256:'1994f345308b91555021b216146652108f25df93067f7398606af774472af04e'};
const HISTORICAL={path:'docs/v106-workstreams.json',sha256:'5b53f62f7e5b643c1cbd679f0c7177f35ca8e91f5d27e828963329d53463bfe2'};
const FAMILY_IDS=['pit-roster-kits','war-structures','enforcer-pngs','preserve-expansion','enforcer-provenance','pit-actions','pit-campaigns','pit-variants'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>fs.readFile(path.join(ROOT,file));
const json=async file=>JSON.parse(await read(file));
const local=file=>typeof file==='string'&&!path.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
const fingerprint=files=>Promise.all([...new Set(files)].sort().map(async file=>{assert.ok(local(file),'Bounded local input required');const bytes=await read(file);return {path:file,sha256:sha(bytes),bytes:bytes.length};}));
const proofShape=proof=>{assert.ok(local(proof.path)&&proof.path.startsWith('docs/'),'Portable proof required');assert.match(proof.sha256??'',/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(proof.bytes)&&proof.bytes>0);};

export function verifyRegistryV107(registry){
 assert.equal(registry.schemaVersion,1);assert.equal(registry.release,'V107');assert.match(registry.asOf,/^\d{4}-\d{2}-\d{2}$/);assert.deepEqual(registry.baseline,BASELINE);
 assert.ok(['PENDING_RUNTIME_FREEZE','FROZEN'].includes(registry.baselineFreeze));
 assert.deepEqual(registry.workstreams.map(row=>row.id).sort(),[...FAMILY_IDS,'homeworld-comparison'].sort());
 for(const row of registry.workstreams){
  assert.ok(['EN_COURS','OUVERT','A_VALIDER','LIVRE_PARTIEL','VALIDE_CIBLE'].includes(row.status));
  assert.ok(row.source&&row.runtime&&row.remaining&&row.validationScope&&row.implementation?.length&&row.implementation.every(local)&&Array.isArray(row.proof));
  if(row.status==='VALIDE_CIBLE'){
   assert.equal(registry.baselineFreeze,'FROZEN','Freeze runtime before promotion');
   assert.ok(row.tests?.startsWith('PASS')&&row.browser?.startsWith('PASS_CIBLE_PRODUCTION'),'Executed tests and production proof required');
   assert.ok(row.proof.length>=2&&row.proof.some(proof=>proof.path==='docs/v107-validation-summary.json'),'Master and domain proof required');row.proof.forEach(proofShape);
  }
 }
 assert.ok(Array.isArray(registry.closedOpenItemIds));assert.equal(new Set(registry.closedOpenItemIds).size,registry.closedOpenItemIds.length);
 assert.deepEqual(registry.sourceActionClaims.map(row=>row.actionId).sort(),['CIN_F003_CLEMENCE','CIN_F003_FATALITE_2']);
 for(const claim of registry.sourceActionClaims){
  assert.ok(['EN_COURS','A_VALIDER','VALIDE_CIBLE','LIVRE_PARTIEL'].includes(claim.status));
  if(claim.actionId==='CIN_F003_CLEMENCE'){assert.equal(claim.qualification,'PARTIAL_SOURCE_ONLY');assert.notEqual(claim.status,'VALIDE_CIBLE','A detached inert device is not an offensive disarm');}
  if(claim.status==='VALIDE_CIBLE'){assert.equal(registry.workstreams.find(row=>row.id==='pit-actions').status,'VALIDE_CIBLE');assert.ok(registry.closedOpenItemIds.includes(claim.actionId));}
 }
 if(registry.baselineFreeze==='FROZEN'){assert.equal(registry.runtimeFreeze?.path,'docs/v107-runtime-freeze.json');proofShape(registry.runtimeFreeze);}
 assert.equal(new Set(registry.runtimeModules.map(row=>row.id)).size,registry.runtimeModules.length);
 for(const row of registry.runtimeModules){assert.match(row.id,/^[A-Za-z][A-Za-z0-9]*$/);assert.ok(local(row.path)&&/^app\/.+\.(ts|tsx)$/.test(row.path));}
 assert.ok(Array.isArray(registry.validations)&&Array.isArray(registry.limits));
 for(const row of registry.validations){assert.ok(row.id&&row.command&&row.scope&&row.limit&&Array.isArray(row.evidence));if(row.status.startsWith('PASS')){assert.ok(row.evidence.length);row.evidence.forEach(proofShape);}}
}
const compile=registry=>build({stdin:{contents:registry.runtimeModules.map(row=>`import * as ${row.id} from ${JSON.stringify('./'+row.path)}; export {${row.id}};`).join('\n'),resolveDir:ROOT},absWorkingDir:ROOT,bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
async function python(payload,mode=''){
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-excel-v107-'));
 try{if(payload.workbook){await fs.writeFile(path.join(temporary,'verify.xlsx'),payload.workbook);payload={...payload,workbook:undefined,workbookPath:path.join(temporary,'verify.xlsx')};}const request=path.join(temporary,'request.json');await fs.writeFile(request,JSON.stringify(payload));return execFileSync('python3',[path.join(ROOT,WRITER),...(mode?[mode]:[]),'--request',request],{timeout:30000,maxBuffer:50*1024*1024});}
 finally{await fs.rm(temporary,{recursive:true,force:true});}
}
export const writeWorkbookV107=(baseline,sheets)=>python({root:ROOT,baseline,sheets});
export const verifyWorkbookV107=async(workbook,baseline=BASELINE)=>JSON.parse(await python({root:ROOT,baseline,workbook},'--verify'));

/** Final production identity and evidence checks; never inferred from tests. */
export async function verifyProductionSummaryV107(master,freeze){
 assert.equal(master.release,'V107');assert.equal(master.status,'PASS_CIBLE');assert.match(master.runtimeCommit,/^[a-f0-9]{40}$/);assert.ok(master.productionBuildId);
 assert.deepEqual(master.production.map(row=>row.domain).sort(),['Clans','Homeworld','Pit','Preserve']);
 const allEvidence=[];const frozenPublic=new Set(freeze.entries.filter(row=>row.path.startsWith('public/')).map(row=>row.path));
 const verify=async entry=>{const file=entry.path??entry.file;assert.ok(local(file)&&file.startsWith('docs/'));const bytes=await read(file);assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);allEvidence.push(file);return bytes;};
 for(const row of master.production){
  assert.equal(row.status,'PASS_CIBLE');assert.equal(row.buildId,master.productionBuildId);assert.equal(row.runtimeCommit,master.runtimeCommit);assert.ok(row.command&&row.command.includes('node scripts/qa-'),'Executed recipe command required');
  const report=JSON.parse(await verify(row.report));assert.match(report.status,/^PASS/);const production=report.production;assert.ok(production&&['production','compiled-app'].includes(production.mode??report.mode));assert.equal(production.browserErrors,0);assert.equal(production.checksFailed,0);assert.ok(production.checksPassed>0);assert.equal(production.runtimeCommit,master.runtimeCommit);assert.equal(production.buildId??report.buildId??report.productionBuildId,master.productionBuildId);
  const served=production.servedBuilds??report.servedBuilds;assert.ok(served?.length);for(const response of served){assert.equal(response.status,200);assert.equal(response.expectedBuildId,master.productionBuildId);assert.equal(response.foundInHtml,true);}
  const before=report.sourceBefore??production.sourceBefore,after=report.sourceAfter??production.sourceAfter;assert.ok(before?.length);assert.deepEqual(before,after);
  for(const source of after){const file=source.path??source.file;assert.ok(local(file));if(file.startsWith('public/'))assert.ok(frozenPublic.has(file),'Observed public input absent from freeze: '+file);assert.equal(sha(await read(file)),source.sha256,'QA source changed: '+file);allEvidence.push(file);}
  assert.ok(row.portableFiles?.length);assert.ok(row.capturesInspected>0);for(const evidence of row.portableFiles)await verify(evidence);
  for(const evidence of report.evidence??[]){const portable=row.portableFiles.find(file=>(file.path??file.file)===(evidence.path??evidence.file));assert.ok(portable);assert.equal(portable.sha256,evidence.sha256);assert.equal(portable.bytes,evidence.bytes);}
 }
 return [...new Set(allEvidence)];
}

export async function collectFollowupV107(registry=undefined){
 registry??=await json(REGISTRY);verifyRegistryV107(registry);await verifyOpenWorkstreamsAuditV107();
 assert.equal(sha(await read(BASELINE.path)),BASELINE.sha256);assert.equal(sha(await read(HISTORICAL.path)),HISTORICAL.sha256);
 const historical=await json(HISTORICAL.path),audit=await json('docs/v107-open-workstreams-audit.json');
 const bundled=await compile(registry),imports=Object.keys(bundled.metafile.inputs).filter(file=>file!=='<stdin>');
 const fixed=[REGISTRY,WRITER,'scripts/build-excel-followup-v107.mjs','scripts/check-open-workstreams-audit-v107.mjs','scripts/collect-v107-runtime-inputs.mjs','scripts/collect-pit-variant-inputs-v107.mjs','scripts/lib/excel_followup_append.py','scripts/build-excel-followup-v100.py',BASELINE.path,HISTORICAL.path,'docs/v107-open-workstreams-audit.json','docs/v107-open-workstreams-audit.md',...audit.inputs.map(row=>row.path),...registry.workstreams.flatMap(row=>row.implementation)];
 const guarded=[...fixed,...imports],before=await fingerprint(guarded);
 const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const runtimeInputs=await collectRuntimeInputsV107();
 const variantInputs={...runtimeInputs,capabilities:runtimeInputs.variantCapabilities,imports:runtimeInputs.inputs.map(row=>row.path)};
 const variantRows=[];
 for(const c of variantInputs.capabilities)for(const constraint of c.constraints)if(c.variantId===null)variantRows.push({...constraint,appearanceId:'runtime-default',status:'OPEN_SOURCE_CONSTRAINT',nativeActionDrawings:c.nativeActions.length,maskedPartialNativeSequences:c.fighterId==='scar'?7:0,functionalEquipmentStatesAdmitted:false,damagedArmorStatesAdmitted:false,maskTransitionsAdmitted:false,fullKitComplete:false});
 assert.equal(variantRows.length,14);
 const campaignAudit=api.campaign.getPitWorkbookCampaignSourceAuditV107();assert.equal(campaignAudit.length,16);assert.ok(campaignAudit.every(row=>row.sourceComplete===false));
 for(const row of historical.campaignStages){const current=campaignAudit.find(item=>item.id===row.id);assert.ok(current);assert.equal(current.source,row.sheet+'!'+row.cell);assert.equal(current.sourceText,row.sourceText);}
 const reserve=api.reserve.createGameReserveV107(107);assert.equal(reserve.version,3);
 const reserveFacts={version:reserve.version,sectors:api.reserve.gameReserveV66Sectors(reserve).length,fighters:api.reserve.gameReserveV66People(reserve).length,ships:api.reserve.gameReserveV66Ships(reserve).length,supplies:api.reserve.gameReserveV66Supplies(reserve).length,sourceH001H100Bindings:0,newNativeDrawings:0};
 assert.deepEqual([reserveFacts.sectors,reserveFacts.fighters,reserveFacts.ships,reserveFacts.supplies],[8,16,4,16]);
 const specialized=api.specialized.specializedDefinitionsV107();assert.equal(specialized.length,6);
 const clans=specialized.map(row=>{const state=api.specialized.createSpecializedV107(row.id);assert.ok(state&&state.context==='free-specialized-works-v107');return {...row,status:registry.workstreams.find(row=>row.id==='war-structures').status,scope:'SEPARATE_EXERCISE_ONLY',sourceWorkbookSha256:api.specialized.SPECIALIZED_CONTRACT_V107.sourceSha,sourceSheet:api.specialized.SPECIALIZED_CONTRACT_V107.sheet,hypotheses:api.specialized.SPECIALIZED_CONTRACT_V107.hypotheses,campaignAcquisitionAdmitted:false};});
 assert.equal(api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107.address,'Choix et actions V6!A788:I788');
 const hw={id:'homeworld-comparison',status:registry.workstreams.find(row=>row.id==='homeworld-comparison').status,definition:api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_V107,option:api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107,lines:api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_LINES_V107,sourceWorkbook:audit.supplementalHomeworld.sourceWorkbook,sourceWorkbookSha256:audit.supplementalHomeworld.sourceWorkbookSha256,scope:'LOCAL_STUDY_NO_NAMED_PLAQUE_OR_LINEAGE',remaining:registry.workstreams.find(row=>row.id==='homeworld-comparison').remaining};
 const proofRefs=[...registry.workstreams.flatMap(row=>row.status==='VALIDE_CIBLE'?row.proof:[]),...registry.validations.flatMap(row=>row.status.startsWith('PASS')?row.evidence:[])];
 for(const proof of proofRefs){proofShape(proof);const bytes=await read(proof.path);assert.equal(sha(bytes),proof.sha256);assert.equal(bytes.length,proof.bytes);}
 let runtimeFrozenInputsVerified=0;let productionEvidence=[];
 if(registry.baselineFreeze==='FROZEN'){
  const freezeBytes=await read(registry.runtimeFreeze.path);assert.equal(sha(freezeBytes),registry.runtimeFreeze.sha256);const freeze=JSON.parse(freezeBytes);assert.equal(freeze.files,freeze.entries.length);
  for(const entry of freeze.entries){assert.ok(local(entry.path));const bytes=await read(entry.path);assert.equal(sha(bytes),entry.sha256,'Frozen runtime changed: '+entry.path);assert.equal(bytes.length,entry.bytes);}
  for(const input of [...before,...variantInputs.assets].filter(row=>row.path.startsWith('app/')||row.path.startsWith('public/'))){const entry=freeze.entries.find(row=>row.path===input.path);assert.ok(entry,'Current runtime/public input absent from freeze: '+input.path);assert.equal(entry.sha256,input.sha256);runtimeFrozenInputsVerified++;}
  const master=await json('docs/v107-validation-summary.json');assert.equal(master.sourceFreeze.sha256,registry.runtimeFreeze.sha256);productionEvidence=await verifyProductionSummaryV107(master,freeze);
 }
 const closed=new Set(registry.closedOpenItemIds);
 for(const id of closed){const row=audit.items.find(row=>row.id===id);assert.ok(row,'Unknown original open ID');assert.equal(registry.workstreams.find(stream=>stream.id===row.familyId).status,'VALIDE_CIBLE');assert.ok(!['pit-campaigns','pit-variants','pit-roster-kits','preserve-expansion','enforcer-provenance','war-structures'].includes(row.familyId),'A bounded improvement does not complete this family');if(row.familyId==='pit-actions')assert.ok(registry.sourceActionClaims.some(claim=>claim.actionId===id&&claim.status==='VALIDE_CIBLE'));}
 const openItems=audit.items.filter(row=>!closed.has(row.id)).map(row=>({...row,sourceStatus:row.status,status:registry.workstreams.find(stream=>stream.id===row.familyId).status==='VALIDE_CIBLE'?'PARTIEL_RESTE_OUVERT':'OUVERT',progressV107:registry.workstreams.find(stream=>stream.id===row.familyId).runtime}));
 const actions=structuredClone(historical.actions);
 for(const action of actions){const claim=registry.sourceActionClaims.find(row=>row.actionId===action.actionId);if(claim)Object.assign(action,{bindingOrigin:'V107_CANDIDATE',qualificationV107:claim.qualification,statusV107:claim.status,remainingV107:claim.remaining,sourceBindingV107:claim.status==='VALIDE_CIBLE'});}
 const bindings=40+registry.sourceActionClaims.filter(row=>row.status==='VALIDE_CIBLE').length;
 const preservePromoted=registry.workstreams.find(row=>row.id==='preserve-expansion').status==='VALIDE_CIBLE';
 const facts={...historical.facts,newRuntimeMoves:0,newRuntimeMoveClips:0,newRuntimePresentations:0,newRuntimePresentationClips:0,historicalSourceRuntimeBindings:40,sourceBindingsDeclared:41,sourceBindingCandidates:1,sourceRuntimeBindings:bindings,sourceActionsRemaining:52-bindings,sourceActions:52,sourceActionCandidates:2,completeCharacters:0,campaignStages:16,campaignStagesComplete:0,variantConstraints:14,variantConstraintsComplete:0,scarMaskedNativePartialSequences:7,scarMaskedNativePartialClips:14,existingV79ReferencedIdentities:2,unresolvedRosterIdentities:4,trackedOriginalOpenItems:77,openItems:openItems.length,sourceWarStructures:6,warCampaignAcquisitions:0,preserveSectors:preservePromoted?reserveFacts.sectors:4,preserveFighters:preservePromoted?reserveFacts.fighters:8,preserveDeclaredSectors:reserveFacts.sectors,preserveDeclaredFighters:reserveFacts.fighters,preserveSectorsRemaining:80-(preservePromoted?reserveFacts.sectors:4),preserveFightersRemaining:100-(preservePromoted?reserveFacts.fighters:8),newNativeDrawings:0,publicAssetsVerified:variantInputs.assets.length};
 const inputs=await fingerprint([...guarded,...variantInputs.imports,...variantInputs.assets.map(row=>row.path),...proofRefs.map(row=>row.path),...productionEvidence,...(registry.baselineFreeze==='FROZEN'?[registry.runtimeFreeze.path]:[])]);
 assert.deepEqual(await fingerprint(guarded),before,'Sources changed during collection; rerun after stabilization');
 return {schemaVersion:1,release:'V107',asOf:registry.asOf,baseline:registry.baseline,baselineFreeze:registry.baselineFreeze,runtimeFreeze:registry.runtimeFreeze,runtimeFrozenInputsVerified,method:'Every V106 open row is followed; source text and historical workbook are immutable. Current source probes and actual production proofs are separate. No browser or native Excel is executed by this generator.',facts,delivery:{completeKits:'OUVERT',campaigns:'OUVERT',variantAnimations:'OUVERT',canonicalFidelity:'NON_CERTIFIE'},families:audit.families,workstreams:registry.workstreams,actions,campaignStages:historical.campaignStages.map(row=>({...row,...campaignAudit.find(item=>item.id===row.id),fighterId:row.id.startsWith('CAM-feral-hunter.')?'feral-hunter':'scar',status:'OUVERT_SOURCE_NOT_DELIVERED',remaining:row.visualNeeds?.join(' ; ')??'Scène source, acteurs et transitions à livrer.'})),variantConstraints:variantRows,variantCapabilities:variantInputs.capabilities,homeworld:[hw],clans,preserve:[{id:'preserve-expansion',status:registry.workstreams.find(row=>row.id==='preserve-expansion').status,...reserveFacts,remaining:'72 secteurs et84 combattants visés après validation du parcours ; créations projet, aucune fiche H001–H100 admise.'}],originalOpenItems:audit.items,closedOpenItemIds:registry.closedOpenItemIds,openItems,assets:variantInputs.assets,inputs,validations:registry.validations,limits:registry.limits};
}

const column=(key,label,width=32)=>({key,label,width});
const printable=value=>value===null||value===undefined?'':typeof value==='object'&&!(Object.keys(value).length===2&&'formula'in value&&'cached'in value)?JSON.stringify(value):value;
const sheet=(name,title,columns,rows)=>({name,title,subtitle:'V107 · sources, couverture et preuves distinctes',columns,rows:rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,printable(value)])))});
export function buildSheetsV107(s){
 const metric=(label,value,scope,formula)=>({label,value:formula?{formula,cached:value}:value,scope});
 const countEnd=4+s.workstreams.length;
 const summary=[metric('Actions source',52,'26 par personnage, sans déduire leur mécanisation.',"COUNTA('ActionsV107'!A5:A56)"),metric('Liaisons source validées',s.facts.sourceRuntimeBindings,'40 héritées ; nouvelle qualification seulement après preuve production.'),metric('Actions source restantes',s.facts.sourceActionsRemaining,'CLEMENCE partielle sans désarmement offensif.'),metric('Lignes ouvertes V106 auditées',77,'Huit familles ; kits recouvrant actions/campagnes/variantes.'),metric('Lignes encore ouvertes',s.openItems.length,'Une amélioration partielle ne clôt pas une ligne.'),metric('Campagnes source encore ouvertes',16,'Exercice et substituts ne certifient aucune scène source.'),metric('Contraintes de variantes ouvertes',14,'7 par personnage, aucune fermeture par dessin statique.'),metric('Séquences natives partielles Scar masqué',7,'14 clips natifs, aucun geste de combat V54 ajouté.'),metric('Références V79 déjà présentes',2,'Une pose native droite chacune ; animations et kits ouverts.'),metric('Ouvrages source / acquisitions de campagne','6 / 0','Exercices distincts, sans gain de campagne.'),metric('Preserve secteurs validés / déclarés',`${s.facts.preserveSectors} / ${s.facts.preserveDeclaredSectors}`,'Cible80 ; définition en code séparée de la preuve production.'),metric('Preserve combattants validés / déclarés',`${s.facts.preserveFighters} / ${s.facts.preserveDeclaredFighters}`,'Cible100 ; aucune fiche H001–H100 admise.'),metric('Feuilles historiques conservées',60,s.baseline.path),...['EN_COURS','OUVERT','A_VALIDER','LIVRE_PARTIEL','VALIDE_CIBLE'].map(status=>metric('Chantiers '+status,s.workstreams.filter(row=>row.status===status).length,'Périmètres limités, sans fermeture implicite.',`COUNTIF('ChantiersV107'!E5:E${countEnd},"${status}")`)),metric('Excel natif exécuté','NON','Vérification ZIP/XML, caches et SHA seulement.')];
 const basic=[column('id','ID',55),column('source','Source / cellule',100),column('status','Statut',34),column('remaining','Reste ouvert / limite',145)];
 return [
 sheet('SyntheseV107','YAUTJA · suivi actif V107',[column('label','Indicateur',53),column('value','Valeur',28),column('scope','Portée',130)],summary),
 sheet('ChantiersV107','Périmètres et preuves',[column('id','ID',42),column('domain','Domaine'),column('title','Chantier',65),column('source','Source',110),column('status','Statut'),column('validationScope','Périmètre limité',58),column('runtime','Amélioration',130),column('tests','Tests exécutés',110),column('browser','Production réelle',110),column('proof','Preuves SHA',120),column('remaining','Reste',130)],s.workstreams),
 sheet('FamillesV107','Les huit familles des77 lignes',[column('id','Famille'),column('label','Libellé',75),column('count','Lignes',18),column('target','Travail source',130),column('next','Prochain travail',130),column('proofs','Preuves requises',145),column('itemIds','IDs suivis',130)],s.families),
 sheet('ActionsV107','52 actions · sources et progression',[column('actionId','Action source',45),column('fighterId','Personnage'),column('key','Clé',25),column('sheet','Feuille'),column('cell','Cellule',18),column('sourceText','Texte source exact',145),column('bindingOrigin','Origine'),column('qualificationV107','QualificationV107',50),column('statusV107','ÉtatV107'),column('sourceBindingV107','Nouvelle liaison',25),column('remainingV107','ResteV107',130),column('remaining','Limite héritée',130)],s.actions),
 sheet('CampagnesV107','Seize étapes source encore ouvertes',[column('id','ID',55),column('fighterId','Personnage'),column('sheet','Feuille'),column('cell','Cellule'),column('sourceText','Texte exact',145),column('status','Statut'),column('stagePlayable','Arène source présente',25),column('opponentPlayable','Acteur source présent',25),column('bodyAdmitted','BODY source admis',25),column('exerciseSubstitute','Substitut explicite',35),column('sourceComplete','Scène source complète',26),column('remaining','Reste',145)],s.campaignStages),
 sheet('VariantesV107','Quatorze contraintes et mesures natives',[column('id','Contrainte',60),column('fighterId','Personnage'),column('sheet','Feuille'),column('cell','Cellule'),column('sourceText','Source exacte',145),column('status','État',45),column('nativeActionDrawings','Études par défaut',25),column('maskedPartialNativeSequences','Séquences partielles masque',28),column('functionalEquipmentStatesAdmitted','États équipement admis',28),column('damagedArmorStatesAdmitted','Armure cassée admise',28),column('maskTransitionsAdmitted','Transition masque admise',28),column('fullKitComplete','Kit complet',22)],s.variantConstraints),
 sheet('HomeworldV107','Étude située après dépôt B',[column('id','ID'),column('status','État'),column('sourceWorkbook','V6 original',100),column('sourceWorkbookSha256','SHA V6',72),column('option','Option source',145),column('lines','Répliques exactes',145),column('definition','Objets réels',145),column('scope','Limite',80),column('remaining','Reste',130)],s.homeworld),
 sheet('ClansV107','Six ouvrages en exercices indépendants',[column('id','Ouvrage'),column('name','Nom',55),column('sourceSheet','Feuille'),column('cells','Cellules'),column('cost','Coût',18),column('upkeep','Entretien',18),column('turns','Tours',18),column('operator','Équipe'),column('effect','Effet source',130),column('limit','Limite source',130),column('scope','Portée',55),column('hypotheses','Hypothèses exercice',145),column('campaignAcquisitionAdmitted','Acquisition campagne',28)],s.clans),
 sheet('PreserveV107','Extension opt-in et objectifs physiques',[column('id','ID'),column('status','État'),column('version','Version',18),column('sectors','Secteurs déclarés',25),column('fighters','Adultes déclarés',25),column('ships','Navires',18),column('supplies','Fournitures',22),column('sourceH001H100Bindings','FichesH001–100 admises',28),column('newNativeDrawings','Nouveaux dessins',25),column('remaining','Reste',145)],s.preserve),
 sheet('ManquantsV107','Toutes les lignes restant ouvertes',[...basic,column('familyId','Famille',35),column('assessmentV107','Référence partielle retrouvée',145),column('progressV107','Progrès partielV107',145),column('evidenceRequired','Preuves requises',145)],s.openItems),
 sheet('SourcesV107','Entrées réellement lues',[column('path','Chemin',115),column('sha256','SHA256',72),column('bytes','Octets',22),column('scope','Portée',135)],s.inputs.map(row=>({...row,scope:s.assets.find(asset=>asset.path===row.path)?.scope??'Entrée lue ; aucune validation de jeu impliquée.'}))),
 sheet('ValidationsV107','Recettes effectivement exécutées',[column('id','ID',45),column('status','État'),column('scope','Portée',130),column('command','Commande',145),column('evidence','Preuves SHA',135),column('limit','Limites',130)],s.validations.length?s.validations:[{id:'V107-PRODUCTION-PENDING',status:'A_VALIDER',scope:'Quatre recettes production réelles et gel global attendus.',command:'À consigner après exécution réelle',evidence:'Aucune preuve finale déclarée',limit:'Le générateur n’exécute pas le navigateur.'}]),
 sheet('JournalV107','Méthode et limites',[column('subject','Sujet',45),column('detail','Décision / limite',145)],[{subject:'Méthode',detail:s.method},{subject:'Gel runtime',detail:s.baselineFreeze},{subject:'Registre',detail:REGISTRY},{subject:'V106 historique',detail:'node scripts/check-excel-history-v107.mjs --check'},{subject:'V107 courant',detail:'node scripts/build-excel-followup-v107.mjs --check'},...s.limits.map((detail,index)=>({subject:'Limite '+(index+1),detail}))]),
 ];
}
export async function generateFollowupV107({outputDir=path.join(ROOT,'docs'),check=false}={}){
 const snapshot=await collectFollowupV107(),workbook=await writeWorkbookV107(snapshot.baseline,buildSheetsV107(snapshot)),structural=await verifyWorkbookV107(workbook,snapshot.baseline);
 const qa={schemaVersion:1,release:'V107',result:'PASS_STRUCTURE',scope:'77 lignes auditées, sources/SHA, mesures natives, sondes de définition et ZIP/XML/caches. Aucun navigateur ni Excel natif exécuté par ce générateur.',workbook:'docs/YAUTJA_V107_SUIVI.xlsx',sha256:sha(workbook),bytes:workbook.length,inputFingerprintsVerified:snapshot.inputs.length,assetsVerified:snapshot.assets.length,facts:snapshot.facts,delivery:snapshot.delivery,...structural,nativeExcelApplicationVerified:false,nativeExcelCalculationEngineExecuted:false};
 const products=[Buffer.from(JSON.stringify(snapshot,null,2)+'\n'),workbook,Buffer.from(JSON.stringify(qa,null,2)+'\n')];if(!check)await fs.mkdir(outputDir,{recursive:true});
 for(const[index,name]of OUTPUTS.entries()){const target=path.join(outputDir,name);if(check)assert.ok((await fs.readFile(target)).equals(products[index]),'Suivi V107 périmé : '+name);else await fs.writeFile(target,products[index]);}
 return {snapshot,qa,workbookSha256:sha(workbook),bytes:workbook.length,outputDir};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),at=args.indexOf('--output-dir');assert.ok(args.every((arg,index)=>['--check','--output-dir'].includes(arg)||at>=0&&index===at+1)&&(at<0||args[at+1]));const result=await generateFollowupV107({check:args.includes('--check'),...(at>=0?{outputDir:path.resolve(args[at+1])}:{})});console.log(JSON.stringify({result:'PASS_STRUCTURE',mode:args.includes('--check')?'check':'generate',sha256:result.workbookSha256,bytes:result.bytes,inputs:result.snapshot.inputs.length,facts:result.snapshot.facts}));}
