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
import {gunzipSync} from 'node:zlib';
import {verifyOpenWorkstreamsAuditV107} from './check-open-workstreams-audit-v107.mjs';
import {collectRuntimeInputsV107} from './collect-v107-runtime-inputs.mjs';
import {reconcileStaticProductionsV107} from './reconcile-static-productions-v107.mjs';
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
  assert.ok(['EN_COURS','OUVERT','A_VALIDER','LIVRE_PARTIEL','VALIDE_CIBLE','PRODUIT_STATIQUE_RECONCILIE'].includes(row.status));
  assert.ok(row.source&&row.runtime&&row.remaining&&row.validationScope&&row.implementation?.length&&row.implementation.every(local)&&Array.isArray(row.proof));
  if(row.status==='PRODUIT_STATIQUE_RECONCILIE'){
   assert.equal(row.id,'enforcer-pngs','Static reconciliation applies only to the18PNG targets');assert.ok(row.tests?.startsWith('PASS_HISTORIQUE_PR15'));assert.ok(row.proof.some(proof=>proof.path==='docs/v107-static-production-reconciliation.json'));row.proof.forEach(proofShape);
  }
  if(row.status==='VALIDE_CIBLE'){
   assert.equal(registry.baselineFreeze,'FROZEN','Freeze runtime before promotion');
   assert.ok(row.tests?.startsWith('PASS')&&row.browser?.startsWith('PASS_CIBLE_PRODUCTION'),'Executed tests and production proof required');
   assert.ok(row.proof.length>=2&&row.proof.some(proof=>proof.path==='docs/v107-validation-summary.json'),'Master and domain proof required');row.proof.forEach(proofShape);
  }
 }
 assert.ok(Array.isArray(registry.closedOpenItemIds));assert.equal(new Set(registry.closedOpenItemIds).size,registry.closedOpenItemIds.length);
 assert.deepEqual(registry.sourceActionClaims.map(row=>row.actionId).sort(),['CIN_F003_CLEMENCE','CIN_F003_FATALITE_2','M_F003_S2','M_F006_S4']);
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

const PRODUCTION_RECIPES_V107={Pit:'scripts/qa-pit-workbook-v107.mjs',Homeworld:'scripts/qa-homeworld-archive-comparison-v107.mjs',Clans:'scripts/qa-clan-specialized-v107.mjs',Preserve:'scripts/qa-preserve-expedition-v107.mjs'};
const evidencePath=entry=>entry.path??entry.file;
const captureName=capture=>typeof capture==='string'?capture:capture.file??capture.path;
const passed=status=>['PASS','PASS_CIBLE'].includes(status);
export function parsePortableJsonV107(entry,bytes){
 const file=evidencePath(entry);assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);
 if(file.endsWith('.json.gz')){
  assert.match(entry.decodedSha256??'',/^[a-f0-9]{64}$/,'Decoded JSON hash required');assert.ok(Number.isSafeInteger(entry.decodedBytes)&&entry.decodedBytes>0&&entry.decodedBytes<=256*1024*1024,'Bounded decoded JSON size required');
  const decoded=gunzipSync(bytes,{maxOutputLength:entry.decodedBytes});assert.equal(decoded.length,entry.decodedBytes,'Decoded JSON size differs');assert.equal(sha(decoded),entry.decodedSha256,'Decoded JSON hash differs');return JSON.parse(decoded);
 }
 assert.ok(file.endsWith('.json'));return JSON.parse(bytes);
}

/** Final production identity and evidence checks; never inferred from tests. */
export async function verifyProductionSummaryV107(master,freeze){
 assert.equal(master.release,'V107');assert.equal(master.status,'PASS_CIBLE');assert.match(master.runtimeCommit,/^[a-f0-9]{40}$/);assert.ok(master.productionBuildId);
 assert.deepEqual(master.production.map(row=>row.domain).sort(),['Clans','Homeworld','Pit','Preserve']);
 assert.equal(new Set(master.production.map(row=>evidencePath(row.report))).size,4,'Each domain requires its own executed report');
 for(const row of master.production)assert.ok(row.command?.includes('node '+PRODUCTION_RECIPES_V107[row.domain]),row.domain+': recipe does not match domain');
 const allEvidence=[];const frozenPublic=new Set(freeze.entries.filter(row=>row.path.startsWith('public/')).map(row=>row.path));
 const verify=async entry=>{const file=entry.path??entry.file;assert.ok(local(file)&&file.startsWith('docs/'));const bytes=await read(file);assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);allEvidence.push(file);return bytes;};
 for(const row of master.production){
  assert.equal(row.status,'PASS_CIBLE');assert.equal(row.buildId,master.productionBuildId);assert.equal(row.runtimeCommit,master.runtimeCommit);assert.ok(row.command&&row.command.includes('node scripts/qa-'),'Executed recipe command required');
  const report=JSON.parse(await verify(row.report));assert.ok(passed(report.status),'Final PASS report required');const production=report.production;assert.ok(production&&['production','compiled-app'].includes(production.mode??report.mode));assert.equal(production.browserErrors,0);assert.equal(production.checksFailed,0);assert.ok(production.checksPassed>0);assert.equal(row.browserChecksPassed,production.checksPassed);assert.equal(production.runtimeCommit,master.runtimeCommit);assert.equal(production.buildId??report.buildId??report.productionBuildId,master.productionBuildId);
  const served=production.servedBuilds??report.servedBuilds;assert.ok(served?.length);for(const response of served){assert.equal(response.status,200);assert.equal(response.expectedBuildId,master.productionBuildId);assert.equal(response.foundInHtml,true);}
  const before=report.sourceBefore??production.sourceBefore,after=report.sourceAfter??production.sourceAfter;assert.ok(before?.length);assert.deepEqual(before,after);
  assert.ok(after.some(source=>evidencePath(source)===PRODUCTION_RECIPES_V107[row.domain]),row.domain+': executed driver hash required');
  for(const source of after){const file=source.path??source.file;assert.ok(local(file));if(file.startsWith('public/'))assert.ok(frozenPublic.has(file),'Observed public input absent from freeze: '+file);assert.equal(sha(await read(file)),source.sha256,'QA source changed: '+file);allEvidence.push(file);}
  assert.ok(row.portableFiles?.length);const portableJson=[];for(const evidence of row.portableFiles){const bytes=await verify(evidence);if(/\.json(?:\.gz)?$/.test(evidencePath(evidence)))portableJson.push({file:evidencePath(evidence),value:parsePortableJsonV107(evidence,bytes)});}
  assert.ok(report.capturesOpened?.length,'Actual screenshot inspection list required');assert.equal(new Set(report.capturesOpened).size,report.capturesOpened.length);assert.equal(row.capturesInspected,report.capturesOpened.length,'Screenshot inspection count differs');assert.ok(report.capturesOpened.every(name=>typeof name==='string'&&name.length));
  const capturedRecipes=[report,...portableJson.map(entry=>entry.value)].filter(value=>passed(value.status)&&Array.isArray(value.captures)&&value.captures.length);
  const captureRecipe=capturedRecipes.find(value=>report.capturesOpened.every(name=>value.captures.some(capture=>captureName(capture)===name)));
  assert.ok(captureRecipe,row.domain+': opened captures absent from executed capture inventory');assert.deepEqual([...report.capturesOpened].sort(),captureRecipe.captures.map(captureName).sort(),'Every recorded capture must have its inspection attestation');
  for(const image of row.portableFiles.filter(evidence=>evidencePath(evidence).endsWith('.png'))){const capture=captureRecipe.captures.find(item=>captureName(item)===evidencePath(image)||captureName(item)===path.basename(evidencePath(image)));assert.ok(capture,'Portable PNG absent from inspected capture inventory');if(typeof capture==='object'&&capture.sha256)assert.equal(capture.sha256,image.sha256);}
  if(row.domain==='Pit'){
   const rawResults=portableJson.filter(entry=>['docs/qa/v107-pit-workbook/browser-result.json','docs/qa/v107-pit-workbook/browser-result.json.gz'].includes(entry.file));assert.equal(rawResults.length,1,'One complete portable Pit recipe result required');const raw=rawResults[0].value;assert.equal(raw.status,'PASS');assert.ok(['production','compiled-app'].includes(raw.mode),'Pit raw result must identify the compiled production app');assert.equal(raw.runtimeCommit,master.runtimeCommit);assert.equal(raw.buildId,master.productionBuildId);assert.deepEqual([...raw.domains].sort(),['campaign','capabilities','conclusions','devices']);assert.equal(raw.errors.length,0);assert.equal(raw.sourceUnchanged,true);assert.deepEqual(raw.sourceBefore,before);assert.deepEqual(raw.sourceAfter,after);assert.equal(raw.checks.length,production.checksPassed);assert.ok(raw.checks.every(check=>check.status==='PASS'));assert.equal(raw.invocation.command,'node '+PRODUCTION_RECIPES_V107.Pit);assert.ok(after.some(source=>evidencePath(source)==='scripts/qa-pit-devices-v107.mjs'),'Device helper hash required');
   for(const facing of ['right','left']){
    const fatality=raw.observations.find(observation=>observation.kind==='native-conclusion'&&observation.key==='FATALITE_2'&&observation.facing===facing);assert.ok(fatality?.done.qualification?.sourceActionComplete,'Contextual conclusion must be physically qualified in each facing');
    const mercy=raw.observations.find(observation=>observation.kind==='native-conclusion'&&observation.key==='CLEMENCE'&&observation.facing===facing);assert.equal(mercy?.done.qualification?.sourceActionComplete,false,'Mercy remains partial in both facings');
   }
   assert.equal(raw.observations.filter(observation=>observation.kind==='physical-devices-v15').length,2,'Both physical device orientations required');assert.ok(raw.observations.some(observation=>observation.kind==='physical-mine-destruction'));assert.deepEqual(raw.observations.filter(observation=>observation.kind==='targeted-campaign-field').map(observation=>observation.fighterId).sort(),['feral-hunter','scar']);
  }
  for(const evidence of report.evidence??[]){const portable=row.portableFiles.find(file=>(file.path??file.file)===(evidence.path??evidence.file));assert.ok(portable);assert.equal(portable.sha256,evidence.sha256);assert.equal(portable.bytes,evidence.bytes);if(evidencePath(evidence).endsWith('.json.gz')){assert.equal(portable.decodedSha256,evidence.decodedSha256);assert.equal(portable.decodedBytes,evidence.decodedBytes);}}
 }
 return [...new Set(allEvidence)];
}

/** Execute only bounded source-command probes, never a production journey. */
export function runtimeFactsV107(api){
 assert.equal(api.pitDevices.PIT_WORKBOOK_COMBAT_RECIPE_V107,'workbook-v107');assert.equal(api.pitDevices.PIT_WORKBOOK_COMBAT_STATE_VERSION_V107,15);
 const moves=api.pitDeviceBindings.PIT_WORKBOOK_DEVICE_MOVES_V107;assert.deepEqual(moves.map(row=>row.actionId).sort(),['M_F003_S2','M_F006_S4']);
 const definitions=api.pitDeviceBindings.PIT_WORKBOOK_DEVICE_REGISTRY_V107;assert.equal(definitions.length,2);
 const devices=moves.map(move=>{
  const kind=move.fighterId==='feral-hunter'?'mine':'shuriken',rules=api.pitDevices.PIT_WORKBOOK_DEVICES_V107[kind];assert.equal(rules.fighterId,move.fighterId);assert.equal(rules.key,move.key);assert.equal(rules.damage,move.damage);assert.equal(rules.cost,move.costPercent*10);assert.deepEqual(api.pitDevices.getPitWorkbookCombatMoveV107(move.fighterId,move.key),move);
  const native=api.nativeStudy.getPitWorkbookNativeV100(move.fighterId,move.actionId);assert.ok(native);const definition=definitions.find(row=>row.fighterId===move.fighterId);assert.equal(definition.atlas.id,native.definition.atlas.id+'-action-v107');assert.equal(definition.atlas.clips.length,6);
  for(const facing of ['right','left'])for(const phase of ['startup','active','recovery']){const clip=definition.atlas.clips.find(row=>row.facing===facing&&row.id===`pit.stand.workbook-v107.${move.key}.${phase}`);assert.ok(clip);assert.equal(clip.frames.reduce((sum,frame)=>sum+frame.durationTicks*60/clip.ticksPerSecond,0),move[phase]);for(const frame of clip.frames)assert.ok(native.definition.atlas.clips.some(original=>original.facing===facing&&original.frames.some(source=>JSON.stringify([source.pageId,source.rect,source.pivot])===JSON.stringify([frame.pageId,frame.rect,frame.pivot]))));}
  const input={workbookAction:kind},state=api.pitEngine.createPitCombatState(move.fighterId,move.fighterId==='scar'?'feral-hunter':'scar',{normalMoves:'workbook-v107'});state.fighters[0].traque=api.pitEngine.PIT_MAX_TRAQUE;const stepped=api.pitEngine.stepPitCombat(state,[input,{}]);assert.equal(stepped.version,15);assert.equal(stepped.fighters[0].action?.workbookMove,move.key,'New device command is not executable');
  return {...move,kind,rules,runtimeInput:input,runtimeDefinition:definition,sourceAnchors:api.pitDeviceSource.PIT_WORKBOOK_DEVICE_SOURCES_V107[kind]};
 });
 assert.equal(api.pitDeviceBindings.getPitWorkbookConclusionSupportV107('scar','CIN_F003_FATALITE_2'),'conditional-scene');assert.equal(api.pitDeviceBindings.getPitWorkbookConclusionSupportV107('scar','CIN_F003_CLEMENCE'),'partial-scene');
 const bindingAudit=api.nativeStudy.PIT_WORKBOOK_PLAN_V100.fighters.flatMap(fighter=>fighter.actions.map(action=>({fighterId:fighter.fighterId,actionId:action.id,binding:api.pitDeviceBindings.getPitWorkbookRuntimeBindingV107(fighter.fighterId,action.id)})));
 assert.equal(bindingAudit.length,52);const completed=bindingAudit.filter(row=>row.binding!==null&&row.binding!=='partial-scene');assert.equal(completed.length,43,'Only43complete/conditional source bindings are declared');
 for(const[actionId,binding]of [['M_F006_S4','move'],['M_F003_S2','move'],['CIN_F003_FATALITE_2','conditional-scene'],['CIN_F003_CLEMENCE','partial-scene']])assert.equal(bindingAudit.find(row=>row.actionId===actionId).binding,binding);
 return {devices,bindingAudit,declared:{bindings:completed.length,moves:devices.length,moveClips:devices.reduce((sum,row)=>sum+row.runtimeDefinition.atlas.clips.length,0),presentations:bindingAudit.filter(row=>row.binding==='conditional-scene').length,presentationClips:api.pitDeviceBindings.getPitWorkbookConclusionDefinitionV107('FATALITE_2').atlas.clips.length}};
}

export async function collectFollowupV107(registry=undefined){
 registry??=await json(REGISTRY);verifyRegistryV107(registry);await verifyOpenWorkstreamsAuditV107();
 assert.equal(sha(await read(BASELINE.path)),BASELINE.sha256);assert.equal(sha(await read(HISTORICAL.path)),HISTORICAL.sha256);
 const historical=await json(HISTORICAL.path),audit=await json('docs/v107-open-workstreams-audit.json');
 const staticReconciled=registry.workstreams.find(row=>row.id==='enforcer-pngs').status==='PRODUIT_STATIQUE_RECONCILIE';
 let staticProduction=null;if(staticReconciled){await reconcileStaticProductionsV107({check:true});staticProduction=await json('docs/v107-static-production-reconciliation.json');}
 const bundled=await compile(registry),imports=Object.keys(bundled.metafile.inputs).filter(file=>file!=='<stdin>');
 const fixed=[REGISTRY,WRITER,'scripts/build-excel-followup-v107.mjs','scripts/check-open-workstreams-audit-v107.mjs','scripts/collect-v107-runtime-inputs.mjs','scripts/collect-pit-variant-inputs-v107.mjs','scripts/lib/excel_followup_append.py','scripts/build-excel-followup-v100.py',BASELINE.path,HISTORICAL.path,'docs/v107-open-workstreams-audit.json','docs/v107-open-workstreams-audit.md',...audit.inputs.map(row=>row.path),...registry.workstreams.flatMap(row=>row.implementation),...(staticProduction?['scripts/reconcile-static-productions-v107.mjs',...staticProduction.inputs.map(row=>row.path)]:[])];
 const guarded=[...fixed,...imports],before=await fingerprint(guarded);
 const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const runtime=runtimeFactsV107(api);
 const runtimeInputs=await collectRuntimeInputsV107();
 const variantInputs={...runtimeInputs,capabilities:runtimeInputs.variantCapabilities,imports:runtimeInputs.inputs.map(row=>row.path)};
 const variantRows=[];
 for(const c of variantInputs.capabilities)for(const constraint of c.constraints)if(c.variantId===null)variantRows.push({...constraint,appearanceId:'runtime-default',status:'OPEN_SOURCE_CONSTRAINT',nativeActionDrawings:c.nativeActions.length,maskedPartialNativeSequences:c.fighterId==='scar'?7:0,functionalEquipmentStatesAdmitted:false,damagedArmorStatesAdmitted:false,maskTransitionsAdmitted:false,fullKitComplete:false});
 assert.equal(variantRows.length,14);
 const campaignAudit=api.campaign.getPitWorkbookCampaignSourceAuditV107();assert.equal(campaignAudit.length,16);assert.ok(campaignAudit.every(row=>row.sourceComplete===false));
 for(const row of historical.campaignStages){const current=campaignAudit.find(item=>item.id===row.id);assert.ok(current);assert.equal(current.source,row.sheet+'!'+row.cell);assert.equal(current.sourceText,row.sourceText);}
 const reserve=api.reserve.createGameReserveV107(107);assert.equal(reserve.version,3);
 const reserveFacts={version:reserve.version,sectors:api.reserve.gameReserveV66Sectors(reserve).length,fighters:api.reserve.gameReserveV66People(reserve).length,ships:api.reserve.gameReserveV66Ships(reserve).length,supplies:api.reserve.gameReserveV66Supplies(reserve).length,sourceH001H100Bindings:0,newNativeBodyDrawings:0};
 assert.deepEqual([reserveFacts.sectors,reserveFacts.fighters,reserveFacts.ships,reserveFacts.supplies],[8,16,4,16]);
 const specialized=api.specialized.specializedDefinitionsV107();assert.equal(specialized.length,6);
 const clans=specialized.map(row=>{const state=api.specialized.createSpecializedV107(row.id);assert.ok(state&&state.context==='free-specialized-works-v107');return {...row,status:registry.workstreams.find(row=>row.id==='war-structures').status,scope:'SEPARATE_EXERCISE_ONLY',sourceWorkbookSha256:api.specialized.SPECIALIZED_CONTRACT_V107.sourceSha,sourceSheet:api.specialized.SPECIALIZED_CONTRACT_V107.sheet,hypotheses:api.specialized.SPECIALIZED_CONTRACT_V107.hypotheses,campaignAcquisitionAdmitted:false};});
 assert.equal(api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107.address,'Choix et actions V6!A788:I788');
 const hw={id:'homeworld-comparison',status:registry.workstreams.find(row=>row.id==='homeworld-comparison').status,definition:api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_V107,option:api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107,lines:api.archiveComparison.HOMEWORLD_ARCHIVE_COMPARISON_LINES_V107,sourceWorkbook:audit.supplementalHomeworld.sourceWorkbook,sourceWorkbookSha256:audit.supplementalHomeworld.sourceWorkbookSha256,scope:'LOCAL_STUDY_NO_NAMED_PLAQUE_OR_LINEAGE',remaining:registry.workstreams.find(row=>row.id==='homeworld-comparison').remaining};
 const proofRefs=[...registry.workstreams.flatMap(row=>['VALIDE_CIBLE','PRODUIT_STATIQUE_RECONCILIE'].includes(row.status)?row.proof:[]),...registry.validations.flatMap(row=>row.status.startsWith('PASS')?row.evidence:[])];
 for(const proof of proofRefs){proofShape(proof);const bytes=await read(proof.path);assert.equal(sha(bytes),proof.sha256);assert.equal(bytes.length,proof.bytes);}
 let runtimeFrozenInputsVerified=0;let runtimeFreezeEntriesVerified=0;let productionEvidence=[];
 if(registry.baselineFreeze==='FROZEN'){
  const freezeBytes=await read(registry.runtimeFreeze.path);assert.equal(sha(freezeBytes),registry.runtimeFreeze.sha256);assert.equal(freezeBytes.length,registry.runtimeFreeze.bytes);const freeze=JSON.parse(freezeBytes);assert.equal(freeze.files,freeze.entries.length);assert.equal(new Set(freeze.entries.map(row=>row.path)).size,freeze.files);assert.equal(freeze.bytes,freeze.entries.reduce((sum,row)=>sum+row.bytes,0));runtimeFreezeEntriesVerified=freeze.files;
  for(const entry of freeze.entries){assert.ok(local(entry.path));const bytes=await read(entry.path);assert.equal(sha(bytes),entry.sha256,'Frozen runtime changed: '+entry.path);assert.equal(bytes.length,entry.bytes);}
  for(const input of [...new Map([...before,...variantInputs.assets].map(row=>[row.path,row])).values()].filter(row=>row.path.startsWith('app/')||row.path.startsWith('public/'))){const entry=freeze.entries.find(row=>row.path===input.path);assert.ok(entry,'Current runtime/public input absent from freeze: '+input.path);assert.equal(entry.sha256,input.sha256);runtimeFrozenInputsVerified++;}
  const master=await json('docs/v107-validation-summary.json');assert.deepEqual(master.sourceFreeze,registry.runtimeFreeze);productionEvidence=await verifyProductionSummaryV107(master,freeze);
 }
 const closed=new Set(registry.closedOpenItemIds);
 for(const id of closed){const row=audit.items.find(row=>row.id===id);assert.ok(row,'Unknown original open ID');assert.ok(registry.workstreams.find(stream=>stream.id===row.familyId).status==='VALIDE_CIBLE'||row.familyId==='enforcer-pngs'&&staticReconciled);if(row.familyId==='enforcer-pngs')assert.ok(staticProduction.productions.some(item=>item.id===id&&item.trackedV106OpenItem));assert.ok(!['pit-campaigns','pit-variants','pit-roster-kits','preserve-expansion','enforcer-provenance','war-structures'].includes(row.familyId),'A bounded improvement does not complete this family');if(row.familyId==='pit-actions')assert.ok(registry.sourceActionClaims.some(claim=>claim.actionId===id&&claim.status==='VALIDE_CIBLE'));}
 const preservePromoted=registry.workstreams.find(row=>row.id==='preserve-expansion').status==='VALIDE_CIBLE';
 const preserveRemaining={
  'PRESERVE-SECTEURS':`${preservePromoted?reserveFacts.sectors:4}/80 secteurs ; ${80-(preservePromoted?reserveFacts.sectors:4)} restent à produire. Le parcours physique V107 ne certifie pas une victoire de combat.`,
  'PRESERVE-COMBATTANTS':`${preservePromoted?reserveFacts.fighters:8}/100 combattants originaux effectifs ; ${100-(preservePromoted?reserveFacts.fighters:8)} restent visés. Art H001–H100 non intégré et aucune victoire jouée déduite de la fixture de parcours.`,
 };
 const openItems=audit.items.filter(row=>!closed.has(row.id)).map(row=>({...row,sourceStatus:row.status,sourceRemaining:row.remaining,remaining:preserveRemaining[row.id]??row.assessmentV107?.remaining??registry.sourceActionClaims.find(claim=>claim.actionId===row.id)?.remaining??row.remaining,status:registry.workstreams.find(stream=>stream.id===row.familyId).status==='VALIDE_CIBLE'?'PARTIEL_RESTE_OUVERT':'OUVERT',progressV107:registry.workstreams.find(stream=>stream.id===row.familyId).runtime}));
 const actions=structuredClone(historical.actions).map(action=>({...action,declaredRuntimeBindingV107:runtime.bindingAudit.find(row=>row.actionId===action.actionId).binding}));
 for(const action of actions){
  const claim=registry.sourceActionClaims.find(row=>row.actionId===action.actionId);if(!claim)continue;
  Object.assign(action,{bindingOrigin:'V107_CANDIDATE',qualificationV107:claim.qualification,statusV107:claim.status,remainingV107:claim.remaining,sourceBindingV107:claim.status==='VALIDE_CIBLE'});
  const device=runtime.devices.find(row=>row.actionId===action.actionId);
  if(device){assert.equal(device.command,action.sourceCommand);const numbers=/Préparation \/ actif \/ récupération : (\d+) \/ (\d+) \/ (\d+) images · dégâts (\d+) · coût (\d+) %/.exec(action.sourceText);assert.ok(numbers);for(const[index,key]of ['startup','active','recovery','damage','costPercent'].entries())assert.equal(device[key],Number(numbers[index+1]));Object.assign(action,{runtimeRecipe:'workbook-v107',runtimeInput:device.runtimeInput,runtimeAtlasId:device.runtimeDefinition.atlas.id,runtimeClips:device.runtimeDefinition.atlas.clips.map(clip=>({id:clip.id,facing:clip.facing,frames:clip.frames.length,durationTicks60:clip.frames.reduce((sum,frame)=>sum+frame.durationTicks*60/clip.ticksPerSecond,0)})),command:claim.status==='VALIDE_CIBLE'?'COMMANDE_V107_OPT_IN':'COMMANDE_V107_A_VALIDER',mechanics:claim.status==='VALIDE_CIBLE'?'ENTITE_PHYSIQUE_V107_CIBLE':'MECANIQUE_V107_A_VALIDER',entityAdaptationV107:device.sourceAnchors});}
  else{const key=action.actionId.endsWith('CLEMENCE')?'CLEMENCE':'FATALITE_2',definition=api.pitDeviceBindings.getPitWorkbookConclusionDefinitionV107(key);Object.assign(action,{runtimeRecipe:'contextual-conclusion-v107',runtimeInput:{conclusion:key},runtimeAtlasId:definition.atlas.id,mechanics:key==='CLEMENCE'?'DISPOSITIF_INERTE_PARTIEL_SANS_DESARMEMENT':claim.status==='VALIDE_CIBLE'?'CONCLUSION_HOSTILE_2_CONTACTS_CIBLE':'CONCLUSION_V107_A_VALIDER',presentation:key==='CLEMENCE'?'SEQUENCE_SOURCE_PARTIELLE':'SEQUENCE_SOURCE_CONTEXTUELLE',runtimeClips:definition.atlas.clips.map(clip=>({id:clip.id,facing:clip.facing,frames:clip.frames.length,durationTicks60:clip.frames.reduce((sum,frame)=>sum+frame.durationTicks*60/clip.ticksPerSecond,0)}))});}
 }
 const bindings=40+registry.sourceActionClaims.filter(row=>row.status==='VALIDE_CIBLE').length;
 const newMoves=registry.sourceActionClaims.filter(row=>row.status==='VALIDE_CIBLE'&&row.actionId.startsWith('M_')).length;
 const newPresentations=registry.sourceActionClaims.filter(row=>row.status==='VALIDE_CIBLE'&&row.actionId.startsWith('CIN_')).length;
 const historicalFacts={...historical.facts};delete historicalFacts.newNativeDrawings;
 const facts={...historicalFacts,newRuntimeMovesDeclared:runtime.declared.moves,newRuntimeMoveClipsDeclared:runtime.declared.moveClips,newRuntimePresentationsDeclared:runtime.declared.presentations,newRuntimePresentationClipsDeclared:runtime.declared.presentationClips,newRuntimeMovesValidated:newMoves,newRuntimePresentationsValidated:newPresentations,newRuntimeMoves:newMoves,allSourceRuntimeMoves:historical.facts.allSourceRuntimeMoves+newMoves,newRuntimeMoveClips:6*newMoves,allSourceMoveClips:historical.facts.allSourceMoveClips+6*newMoves,newRuntimePresentations:newPresentations,allSourcePresentations:historical.facts.allSourcePresentations+newPresentations,newRuntimePresentationClips:2*newPresentations,historicalSourceRuntimeBindings:40,sourceBindingsDeclared:runtime.declared.bindings,sourceBindingCandidates:registry.sourceActionClaims.filter(row=>row.qualification!=='PARTIAL_SOURCE_ONLY').length,sourceRuntimeBindings:bindings,sourceActionsRemaining:52-bindings,sourceActions:52,sourceActionCandidates:registry.sourceActionClaims.length,completeCharacters:0,campaignStages:16,campaignStagesComplete:0,variantConstraints:14,variantConstraintsComplete:0,scarMaskedNativePartialSequences:7,scarMaskedNativePartialClips:14,existingV79ReferencedIdentities:2,unresolvedRosterIdentities:4,trackedOriginalOpenItems:77,reconciledStaticPngTargets:staticReconciled?18:0,openItems:openItems.length,sourceWarStructures:6,warCampaignAcquisitions:0,preserveSectors:preservePromoted?reserveFacts.sectors:4,preserveFighters:preservePromoted?reserveFacts.fighters:8,preserveDeclaredSectors:reserveFacts.sectors,preserveDeclaredFighters:reserveFacts.fighters,preserveSectorsRemaining:80-(preservePromoted?reserveFacts.sectors:4),preserveFightersRemaining:100-(preservePromoted?reserveFacts.fighters:8),newNativeBodyDrawings:0,newAlternativeStaticPoses:staticProduction?.facts.newAlternativeStaticPoses??18,newIndependentDeviceSprites:1,newStableAlternativeIdentities:0,priorPR15EnforcerPngs:staticProduction?.facts.priorPR15EnforcerPngs??18,priorPR15SucklingPngs:staticProduction?.facts.priorPR15SucklingPngs??18,publicAssetsVerified:variantInputs.assets.length};
 const inputs=await fingerprint([...guarded,...variantInputs.imports,...variantInputs.assets.map(row=>row.path),...proofRefs.map(row=>row.path),...productionEvidence,...(registry.baselineFreeze==='FROZEN'?[registry.runtimeFreeze.path]:[])]);
 assert.deepEqual(await fingerprint(guarded),before,'Sources changed during collection; rerun after stabilization');
 return {schemaVersion:1,release:'V107',asOf:registry.asOf,baseline:registry.baseline,baselineFreeze:registry.baselineFreeze,runtimeFreeze:registry.runtimeFreeze,runtimeFrozenInputsVerified,runtimeFreezeEntriesVerified,method:'Every V106 open row is followed; source text and historical workbook are immutable. Current source probes and actual production proofs are separate. No browser or native Excel is executed by this generator.',facts,staticProduction:staticProduction?{path:'docs/v107-static-production-reconciliation.json',facts:staticProduction.facts}:null,delivery:{completeKits:'OUVERT',campaigns:'OUVERT',variantAnimations:'OUVERT',canonicalFidelity:'NON_CERTIFIE'},families:audit.families.map(row=>({...row,remainingCount:row.itemIds.filter(id=>!closed.has(id)).length,progressV107:registry.workstreams.find(stream=>stream.id===row.id).runtime})),workstreams:registry.workstreams,actions,campaignStages:historical.campaignStages.map(row=>({...row,...campaignAudit.find(item=>item.id===row.id),fighterId:row.id.startsWith('CAM-feral-hunter.')?'feral-hunter':'scar',status:'OUVERT_SOURCE_NOT_DELIVERED',remaining:row.visualNeeds?.join(' ; ')??'Scène source, acteurs et transitions à livrer.'})),variantConstraints:variantRows,variantCapabilities:variantInputs.capabilities,homeworld:[hw],clans,preserve:[{id:'preserve-expansion',status:registry.workstreams.find(row=>row.id==='preserve-expansion').status,...reserveFacts,remaining:`${facts.preserveSectorsRemaining} secteurs et ${facts.preserveFightersRemaining} combattants restent visés ; créations projet, aucune fiche H001–H100 admise.`}],originalOpenItems:audit.items,closedOpenItemIds:registry.closedOpenItemIds,openItems,assets:variantInputs.assets,inputs,validations:registry.validations,limits:registry.limits};
}

const column=(key,label,width=32)=>({key,label,width});
const printable=value=>value===null||value===undefined?'':typeof value==='object'&&!(Object.keys(value).length===2&&'formula'in value&&'cached'in value)?JSON.stringify(value):value;
const sheet=(name,title,columns,rows)=>({name,title,subtitle:'V107 · sources, couverture et preuves distinctes',columns,rows:rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,printable(value)])))});
export function buildSheetsV107(s){
 const metric=(label,value,scope,formula)=>({label,value:formula?{formula,cached:value}:value,scope});
 const countEnd=4+s.workstreams.length;
 const summary=[metric('Actions source',52,'26 par personnage, sans déduire leur mécanisation.',"COUNTA('ActionsV107'!A5:A56)"),metric('Liaisons source validées',s.facts.sourceRuntimeBindings,'40 héritées ; nouvelle qualification seulement après preuve production.'),metric('Actions source restantes',s.facts.sourceActionsRemaining,'CLEMENCE partielle sans désarmement offensif.'),metric('Lignes ouvertes V106 auditées',77,'Huit familles ; kits recouvrant actions/campagnes/variantes.'),metric('Lignes encore ouvertes',s.openItems.length,'Une amélioration partielle ne clôt pas une ligne.'),metric('Campagnes source encore ouvertes',16,'Exercice et substituts ne certifient aucune scène source.'),metric('Contraintes de variantes ouvertes',14,'7 par personnage, aucune fermeture par dessin statique.'),metric('Séquences natives partielles Scar masqué',7,'14 clips natifs, aucun geste de combat V54 ajouté.'),metric('Références V79 déjà présentes',2,'Une pose native droite chacune ; animations et kits ouverts.'),metric('Ouvrages source / acquisitions de campagne','6 / 0','Exercices distincts, sans gain de campagne.'),metric('Preserve secteurs validés / déclarés',`${s.facts.preserveSectors} / ${s.facts.preserveDeclaredSectors}`,'Cible80 ; définition en code séparée de la preuve production.'),metric('Preserve combattants validés / déclarés',`${s.facts.preserveFighters} / ${s.facts.preserveDeclaredFighters}`,'Cible100 ; aucune fiche H001–H100 admise.'),metric('Cibles PNG V106 réconciliées',s.facts.reconciledStaticPngTargets,'18Enforcers déjà produits par PR15, aucune nouvelle identité par les poses.'),metric('Créations V107 : BODY / poses / entité',`${s.facts.newNativeBodyDrawings} / ${s.facts.newAlternativeStaticPoses} / ${s.facts.newIndependentDeviceSprites}`,'0BODY nouveau,18poses statiques alternatives et1étoile adaptée ; aucune certification1:1.'),metric('Production statique antérieure PR15','18 Enforcers +18 Sucklings','Les prises V107 ne remplacent ni ne doublent ces identités.'),metric('Feuilles historiques conservées',60,s.baseline.path),...['EN_COURS','OUVERT','A_VALIDER','LIVRE_PARTIEL','VALIDE_CIBLE','PRODUIT_STATIQUE_RECONCILIE'].map(status=>metric('Chantiers '+status,s.workstreams.filter(row=>row.status===status).length,'Périmètres limités, sans fermeture implicite.',`COUNTIF('ChantiersV107'!E5:E${countEnd},"${status}")`)),metric('Excel natif exécuté','NON','Vérification ZIP/XML, caches et SHA seulement.')];
 const basic=[column('id','ID',55),column('source','Source / cellule',100),column('status','Statut',34),column('remaining','Reste ouvert / limite',145)];
 return [
 sheet('SyntheseV107','YAUTJA · suivi actif V107',[column('label','Indicateur',53),column('value','Valeur',28),column('scope','Portée',130)],summary),
 sheet('ChantiersV107','Périmètres et preuves',[column('id','ID',42),column('domain','Domaine'),column('title','Chantier',65),column('source','Source',110),column('status','Statut'),column('validationScope','Périmètre limité',58),column('runtime','Amélioration',130),column('tests','Tests exécutés',110),column('browser','Production réelle',110),column('proof','Preuves SHA',120),column('remaining','Reste',130)],s.workstreams),
 sheet('FamillesV107','Les huit familles des77 lignes',[column('id','Famille'),column('label','Libellé',75),column('count','Lignes',18),column('target','Travail sourceV106',130),column('remainingCount','Lignes restantesV107',26),column('progressV107','ProgrèsV107',145),column('next','Prochain travail',130),column('proofs','Preuves requises',145),column('itemIds','IDs suivis',130)],s.families),
 sheet('ActionsV107','52 actions · sources et progression',[column('actionId','Action source',45),column('fighterId','Personnage'),column('key','Clé',25),column('sheet','Feuille'),column('cell','Cellule',18),column('sourceText','Texte source exact',145),column('bindingOrigin','Origine'),column('qualificationV107','QualificationV107',50),column('statusV107','ÉtatV107'),column('declaredRuntimeBindingV107','Liaison déclaréeV107',42),column('runtimeRecipe','Recette',42),column('runtimeInput','Entrée',60),column('runtimeAtlasId','Atlas raccordé',70),column('runtimeClips','Phases/clips',135),column('mechanics','Mécanique',65),column('entityAdaptationV107','Ancrages/adaptation',145),column('sourceBindingV107','Nouvelle liaison',25),column('remainingV107','ResteV107',130),column('remaining','Limite héritée',130)],s.actions),
 sheet('CampagnesV107','Seize étapes source encore ouvertes',[column('id','ID',55),column('fighterId','Personnage'),column('sheet','Feuille'),column('cell','Cellule'),column('sourceText','Texte exact',145),column('status','Statut'),column('stagePlayable','Arène source présente',25),column('opponentPlayable','Acteur source présent',25),column('bodyAdmitted','BODY source admis',25),column('exerciseSubstitute','Substitut explicite',35),column('sourceComplete','Scène source complète',26),column('remaining','Reste',145)],s.campaignStages),
 sheet('VariantesV107','Quatorze contraintes et mesures natives',[column('id','Contrainte',60),column('fighterId','Personnage'),column('sheet','Feuille'),column('cell','Cellule'),column('sourceText','Source exacte',145),column('status','État',45),column('nativeActionDrawings','Études par défaut',25),column('maskedPartialNativeSequences','Séquences partielles masque',28),column('functionalEquipmentStatesAdmitted','États équipement admis',28),column('damagedArmorStatesAdmitted','Armure cassée admise',28),column('maskTransitionsAdmitted','Transition masque admise',28),column('fullKitComplete','Kit complet',22)],s.variantConstraints),
 sheet('HomeworldV107','Étude située après dépôt B',[column('id','ID'),column('status','État'),column('sourceWorkbook','V6 original',100),column('sourceWorkbookSha256','SHA V6',72),column('option','Option source',145),column('lines','Répliques exactes',145),column('definition','Objets réels',145),column('scope','Limite',80),column('remaining','Reste',130)],s.homeworld),
 sheet('ClansV107','Six ouvrages en exercices indépendants',[column('id','Ouvrage'),column('name','Nom',55),column('sourceSheet','Feuille'),column('cells','Cellules'),column('cost','Coût',18),column('upkeep','Entretien',18),column('turns','Tours',18),column('operator','Équipe'),column('effect','Effet source',130),column('limit','Limite source',130),column('scope','Portée',55),column('hypotheses','Hypothèses exercice',145),column('campaignAcquisitionAdmitted','Acquisition campagne',28)],s.clans),
 sheet('PreserveV107','Extension opt-in et objectifs physiques',[column('id','ID'),column('status','État'),column('version','Version',18),column('sectors','Secteurs déclarés',25),column('fighters','Adultes déclarés',25),column('ships','Navires',18),column('supplies','Fournitures',22),column('sourceH001H100Bindings','FichesH001–100 admises',28),column('newNativeBodyDrawings','Nouveaux BODY',25),column('remaining','Reste',145)],s.preserve),
 sheet('ManquantsV107','Toutes les lignes restant ouvertes',[...basic,column('familyId','Famille',35),column('assessmentV107','Référence partielle retrouvée',145),column('progressV107','Progrès partielV107',145),column('evidenceRequired','Preuves requises',145)],s.openItems),
 sheet('SourcesV107','Entrées réellement lues',[column('path','Chemin',115),column('sha256','SHA256',72),column('bytes','Octets',22),column('scope','Portée',135)],s.inputs.map(row=>({...row,scope:s.assets.find(asset=>asset.path===row.path)?.scope??'Entrée lue ; aucune validation de jeu impliquée.'}))),
 sheet('ValidationsV107','Recettes effectivement exécutées',[column('id','ID',45),column('status','État'),column('scope','Portée',130),column('command','Commande',145),column('evidence','Preuves SHA',135),column('limit','Limites',130)],s.validations.length?s.validations:[{id:'V107-PRODUCTION-PENDING',status:'A_VALIDER',scope:'Quatre recettes production réelles et gel global attendus.',command:'À consigner après exécution réelle',evidence:'Aucune preuve finale déclarée',limit:'Le générateur n’exécute pas le navigateur.'}]),
 sheet('JournalV107','Méthode et limites',[column('subject','Sujet',45),column('detail','Décision / limite',145)],[{subject:'Méthode',detail:s.method},{subject:'Gel runtime',detail:s.baselineFreeze},{subject:'Registre',detail:REGISTRY},{subject:'V106 historique',detail:'node scripts/check-excel-history-v107.mjs --check'},{subject:'V107 courant',detail:'node scripts/build-excel-followup-v107.mjs --check'},...s.limits.map((detail,index)=>({subject:'Limite '+(index+1),detail}))]),
 ];
}
export async function generateFollowupV107({outputDir=path.join(ROOT,'docs'),check=false}={}){
 const snapshot=await collectFollowupV107(),workbook=await writeWorkbookV107(snapshot.baseline,buildSheetsV107(snapshot)),structural=await verifyWorkbookV107(workbook,snapshot.baseline);
 const qa={schemaVersion:1,release:'V107',result:'PASS_STRUCTURE',scope:'77 lignes auditées, sources/SHA, mesures natives, sondes de définition et ZIP/XML/caches. Aucun navigateur ni Excel natif exécuté par ce générateur.',workbook:'docs/YAUTJA_V107_SUIVI.xlsx',sha256:sha(workbook),bytes:workbook.length,inputFingerprintsVerified:snapshot.inputs.length,assetsVerified:snapshot.assets.length,runtimeFrozenInputsVerified:snapshot.runtimeFrozenInputsVerified,runtimeFreezeEntriesVerified:snapshot.runtimeFreezeEntriesVerified,facts:snapshot.facts,delivery:snapshot.delivery,...structural,nativeExcelApplicationVerified:false,nativeExcelCalculationEngineExecuted:false};
 const products=[Buffer.from(JSON.stringify(snapshot,null,2)+'\n'),workbook,Buffer.from(JSON.stringify(qa,null,2)+'\n')];if(!check)await fs.mkdir(outputDir,{recursive:true});
 for(const[index,name]of OUTPUTS.entries()){const target=path.join(outputDir,name);if(check)assert.ok((await fs.readFile(target)).equals(products[index]),'Suivi V107 périmé : '+name);else await fs.writeFile(target,products[index]);}
 return {snapshot,qa,workbookSha256:sha(workbook),bytes:workbook.length,outputDir};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),at=args.indexOf('--output-dir');assert.ok(args.every((arg,index)=>['--check','--output-dir'].includes(arg)||at>=0&&index===at+1)&&(at<0||args[at+1]));const result=await generateFollowupV107({check:args.includes('--check'),...(at>=0?{outputDir:path.resolve(args[at+1])}:{})});console.log(JSON.stringify({result:'PASS_STRUCTURE',mode:args.includes('--check')?'check':'generate',sha256:result.workbookSha256,bytes:result.bytes,inputs:result.snapshot.inputs.length,facts:result.snapshot.facts}));}
